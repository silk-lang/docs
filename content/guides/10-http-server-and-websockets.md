# HTTP server and WebSockets

A Silk HTTP server is a loop you write yourself: listen on a socket, accept one connection, read one request, write one response. The standard library supplies each step with explicit limits and no background threads. This guide builds `greeter`, a server on `127.0.0.1:8080` with two plain routes and one WebSocket route. Chapter 13 of the book builds a larger service the same way; here the focus is on the server API itself.

| Request | Answer |
| --- | --- |
| `GET /hello` | `hello from silk` |
| `POST /echo` | the request body, unchanged |
| `GET /chat` with a WebSocket handshake | a WebSocket that echoes every text message |
| anything else | 404 `no such route` |

## The pieces

| Step | Module | Names |
| --- | --- | --- |
| Open a listening socket | `silk/native_socket` | `listen`, `ListenOptions`, `withListener` |
| Accept one connection | `silk/http_server_native` | `serveNext` |
| Handle the connection | `silk/http_server` | `ConnectionHandler`, `withRequest` |
| Read the request | `silk/http_server` | `Request.head`, `readSome`, `Request.bodyComplete` |
| Write the response | `silk/http_server`, `silk/http` | `respond`, `ResponseHead`, `BodyMode`, `ResponseWriter` |
| Upgrade to a WebSocket | `silk/websocket_upgrade` | `withUpgrade`, `DecisionHandler`, `Decision` |
| Exchange messages | `silk/websocket_server` | `withServer`, `readEvent`, `writeText` |

Everything is lent through callbacks. A request, a response writer and a WebSocket exist only inside the callback that receives them, so none of them can outlive its connection. That is why the code below carries several lifetime parameters: they say that the writer borrows the request, which borrows the connection, which borrows the socket. See **Lifetimes** and **Closures and callable types** in the reference.

The program is one file, `src/main.silk`, shown here in order. Create a package with `silk init greeter` and paste each part.

## Imports

Several modules export a type called `Limits`, so the imports rename them with `as`:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.buffered_duplex { BufferedDuplex }
import silk.byte_duplex { ByteDuplex }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.http { Header, ResponseHead, Status, Version }
import silk.http_body { Limits as BodyLimits, TrailerPolicy }
import silk.http_head { Limits as HeadLimits }
import silk.http_headers { Headers, Limits as ValueLimits }
import silk.http_server { BodyMode, Connection as HttpConnection, ConnectionHandler, Limits as HttpLimits, Request, ResponseWriter, ReusePolicy, ServerError, readSome, respond, withRequest }
import silk.http_server_native { serveNext }
import silk.http_target { RequestTarget }
import silk.logger { LogError, Logger }
import silk.monotonic_clock { MonotonicClock }
import silk.native_socket { Connection, ListenOptions, Listener, listen, withListener }
import silk.network_address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.option { Option }
import silk.os_logger { StdoutLogger }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.result { Result }
import silk.slice { Slice }
import silk.string { String }
import silk.system_clock { Instant }
import silk.u64
import silk.usize
import silk.websocket_server as WebSocket { Event, Limits as SocketLimits, ServerWebSocket, WebSocketError }
import silk.websocket_upgrade { Decision, DecisionHandler, Limits as UpgradeLimits, Offer, Outcome, UpgradeError, withUpgrade }
```

## Limits

A server reads bytes from strangers, so you decide up front how much it may read and keep: the longest request line, the most headers, the largest body. There are no defaults to fall back on. `limits()` fills in one `silk/http_server` `Limits` value:

```silk
// ---------------------------------------------------------------------------
// Limits: how much the server reads and keeps from each client.

fn valueLimits() -> ValueLimits {
  return ValueLimits {
    maxMethodBytes: 16,
    maxTargetBytes: 512,
    maxNameBytes: 64,
    maxValueBytes: 1024,
    maxFields: 32,
    maxFieldBytes: 2048,
    maxOwnedBytes: 65536,
  }
}

fn limits() -> HttpLimits {
  return HttpLimits {
    head: HeadLimits {
      maxHeadBytes: 8192,
      maxStartLineBytes: 1024,
      maxFieldLineBytes: 2048,
      maxOwnedBytes: 65536,
      values: valueLimits(),
    },
    body: BodyLimits {
      maxWireBytes: 8192,
      maxPayloadBytes: 4096,
      maxChunkBytes: 4096,
      maxChunks: 16,
      maxChunkLineBytes: 64,
      maxExtensionBytes: 128,
      maxTrailerBytes: 256,
      maxTrailerFields: 4,
      maxOwnedBytes: 8192,
      trailerValues: valueLimits(),
    },
    values: valueLimits(),
    readCapacity: 4096,
    writeCapacity: 4096,
    maxRequestsPerConnection: 1,
    maxInformationalResponses: 0,
    maxDiscardWireBytes: u64.toU64(8192),
    shutdownDrainBytes: 1024,
  }
}
```

`maxRequestsPerConnection: 1` means one request per connection; together with `ReusePolicy.CloseAfterResponse` below, each connection is closed after its response. `maxPayloadBytes: 4096` caps a request body at 4 KiB. The limits are checked when a connection arrives, not when you build. A combination the server cannot honour makes every connection fail, so if well-formed requests start failing after you change the limits, suspect the limits first.

## Byte helpers

The request method and target arrive as bytes. Three small helpers compare them, show them as text, and write a number in decimal for `Content-Length`:

```silk
// ---------------------------------------------------------------------------
// Small byte helpers.

fn equal(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length {
    return false
  }
  let mut index: usize = 0
  while index < left.length {
    if left[index] != right[index] {
      return false
    }
    index = index + 1
  }
  return true
}

fn asText(bytes: &[u8]) -> string {
  return match move String.fromUtf8(bytes) {
    Result.Success { value } => value
    Result.Failure { .. } => "?"
  }
}

// The decimal digits of `value`, for Content-Length.
effect fn decimal(value: usize) -> Bytes ! OutOfMemoryError ? &mut Allocator {
  let mut digits: [u8; 20] = [0; 20]
  let mut start: usize = 20
  let mut rest = value
  while start == 20 || rest > 0 {
    start = start - 1
    digits[start] = 48 + usize.toU8(rest % 10)
    rest = rest / 10
  }
  return run Bytes.copy(Slice.view(&digits, start, 20 - start))
}
```

## Plain HTTP

`readBody` calls `readSome` until `Request.bodyComplete` says the body is done. `route` picks the reply. `send` builds the response head and calls `respond`:

```silk
// ---------------------------------------------------------------------------
// Plain HTTP: read the body, pick a reply, write it.

struct Reply {
  status: u16
  body: Bytes
}

effect fn readBody<'call, 'request: 'call, 'connection: 'request, 'transport: 'connection>(
  request: &'call mut Request<'request, 'connection, 'transport, Connection>,
) -> Bytes ! ServerError | OutOfMemoryError ? &mut Allocator | &mut MonotonicClock {
  let mut body = Bytes.make()
  let mut chunk: [u8; 512] = [0; 512]
  while !(run Request.bodyComplete(&request.*)) {
    let count = run readSome(&mut request.*, &mut chunk, Option<Instant>.none())
    if count == 0 {
      return move body
    }
    run body.append(Slice.view(&chunk, 0, count))
  }
  return move body
}

effect fn route(method: &[u8], target: &[u8], body: Bytes) -> Reply ! OutOfMemoryError ? &mut Allocator {
  if equal(method, b"GET") && equal(target, b"/hello") {
    return Reply { status: 200, body: run Bytes.copy(b"hello from silk\n") }
  }
  if equal(method, b"POST") && equal(target, b"/echo") {
    return Reply { status: 200, body: move body }
  }
  return Reply { status: 404, body: run Bytes.copy(b"no such route\n") }
}

fn reason(status: u16) -> &'static [u8] {
  if status == 200 {
    return b"OK"
  }
  return b"Not Found"
}

effect fn header<'value>(name: string<'static>, value: &'value [u8]) -> Header<'value> ! ServerError {
  return match move Header.make(name, value, valueLimits()) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value: made } => made
  }
}

// Writes the body once the head is out; `writeBody(move body)` is a function of the writer alone.
effect<'call> fn writeBody<'call, 'writerView: 'call, 'requestView: 'writerView, 'connectionView: 'requestView, 'transportView: 'connectionView>(
  writer: &'call mut ResponseWriter<'writerView, 'requestView, 'connectionView, 'transportView, Connection>,
  body: Bytes,
) -> u16 ! ServerError ? &mut MonotonicClock {
  drop run ResponseWriter.writeAll(&mut writer.*, Bytes.asSlice(&body), Option<Instant>.none())
  let none: [Header<'static>; 0] = []
  let trailers = match move Headers.make(&none, valueLimits()) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value } => value
  }
  run ResponseWriter.finish(&mut writer.*, &trailers, Option<Instant>.none())
  return 0
}

effect fn send<'call, 'request: 'call, 'connection: 'request, 'transport: 'connection>(
  request: &'call mut Request<'request, 'connection, 'transport, Connection>,
  reply: Reply,
) -> () ! ServerError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  let length = run decimal(reply.body.length())
  let contentLength = run header("Content-Length", Bytes.asSlice(&length))
  let contentType = run header("Content-Type", b"text/plain; charset=utf-8")
  let entries = [contentLength, contentType]
  let headers = match move Headers.make(&entries, valueLimits()) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value } => value
  }
  let code = match move Status.fromCode(reply.status) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value } => value
  }
  let response = match move ResponseHead.make(Version.Http11, code, Option<&'static [u8]>.some(reason(reply.status)), headers, valueLimits()) {
    Result.Failure { error } => { fail ServerError.Value { error: move error } }
    Result.Success { value } => move value
  }
  drop run respond(
    move request,
    &response,
    BodyMode.ContentLength { length: usize.toU64(reply.body.length()) },
    ReusePolicy.CloseAfterResponse,
    TrailerPolicy.defaultPolicy(),
    Option<Instant>.none(),
    writeBody(move reply.body),
  )
}
```

A few things to notice:

- `respond` takes the head, a `BodyMode` and a `ReusePolicy`, then calls you back with a `ResponseWriter` to write the body. `BodyMode.ContentLength` promises a `Content-Length` header and exactly that many bytes. The other modes are `NoBody`, `Chunked` and `CloseDelimited`.
- The callback is higher-ranked: it must work for whatever lifetime `respond` picks. A closure that captures `reply.body` is not supported by the native compiler yet. A named function with the body as its last parameter is: `writeBody(move reply.body)` binds `body` and leaves a function of the writer alone.
- `ResponseWriter.finish` sends the end of the body, with trailers when the mode allows them; here there are none.
- The reason phrase is optional. Without it the status line is ` HTTP/1.1 200  ` with nothing after the code.

## The WebSocket route

A WebSocket starts as an ordinary GET with `Upgrade: websocket` headers. `withUpgrade` from `silk/websocket_upgrade` checks the handshake, asks your `DecisionHandler` whether to accept, sends `101 Switching Protocols`, and lends you the connection's buffered channel. `withServer` from `silk/websocket_server` turns that channel into a `ServerWebSocket`:

```silk
// ---------------------------------------------------------------------------
// WebSocket: accept every upgrade on /chat, then answer each text message.

struct AcceptAll {}

impl DecisionHandler<UpgradeError ? &mut MonotonicClock> for AcceptAll {
  effect<'call> fn decide<'call, 'head: 'call>(handler: &'call Self, offer: &'call Offer<'head>) -> Decision<'call> ! UpgradeError ? &mut MonotonicClock {
    return Decision.Accept { protocol: Option<string<'call>>.none(), headers: Option<Headers<'call>>.none(), extensions: false }
  }
}

// Echoes text messages until the client closes; returns how many it answered.
effect<'call> fn echo<'call, 'channel: 'call, 'transport: 'channel>(
  socket: &'call mut ServerWebSocket<'channel, 'transport, Connection>,
) -> u16 ! WebSocketError ? &mut MonotonicClock {
  let mut buffer: [u8; 1024] = [0; 1024]
  let mut answered: u16 = 0
  while true {
    let event = run WebSocket.readEvent(&mut socket.*, &mut buffer, Option<Instant>.none())
    match move event {
      Event.Text { count } => {
        let text = asText(Slice.view(&buffer, 0, count))
        run WebSocket.writeText(&mut socket.*, text, Option<Instant>.none())
        answered = answered + 1
      }
      Event.PeerClose { .. } => { return answered }
      _ => {}
    }
  }
  return answered
}

// Runs the echo session; a WebSocket failure counts as zero messages answered.
effect<'call> fn useChannel<'call, 'transport: 'call>(
  channel: &'call mut BufferedDuplex<'transport, Connection>,
) -> u16 ? &mut MonotonicClock {
  let served = run Effect.result(WebSocket.withServer(move channel, SocketLimits.defaults(), echo))
  return match move served {
    Result.Success { value } => value
    Result.Failure { error } => {
      drop error
      return 0
    }
  }
}

// Upgrades the request to a WebSocket and runs the echo session on it.
effect<'call> fn chat<'call, 'request: 'call, 'connection: 'request, 'transport: 'connection>(
  request: &'call mut Request<'request, 'connection, 'transport, Connection>,
) -> u16 ! UpgradeError | ServerError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  let outcome = run withUpgrade<u16, UpgradeError, never>(move request, UpgradeLimits.default(), Option<Instant>.none(), AcceptAll {}, useChannel)
  return match move outcome {
    Outcome.Upgraded { value } => value
    Outcome.Rejected { .. } => 0
  }
}
```

`AcceptAll` accepts every handshake. A real server looks at the `Offer` first: `offer.origin()` for the browser origin, `offer.protocolAt(i)` for the subprotocols the client asked for. It then returns `Decision.Accept`, optionally naming one protocol, or `Decision.Reject` with an HTTP status. Origin is policy input, not authentication.

`DecisionHandler<D, ?R>` takes a failure row and a requirement row. Spell both in the `impl`, as here; leaving the requirement row out is SEM0088. `? never` is the empty row.

`readEvent` reads one complete message into your buffer and returns an `Event`:

| Event | Meaning |
| --- | --- |
| `Text { count }` | A text message of `count` bytes, already checked to be UTF-8 |
| `Binary { count }` | A binary message of `count` bytes |
| `Ping { payload }` | The client pinged; the matching pong has already been sent |
| `Pong { payload }` | The client answered a ping you sent with `writePing` |
| `PeerClose { data }` | The client closed; the close reply has been sent and the socket is closed |

To send, use `writeText`, `writeBinary` and `writePing`. To close from the server side, use `sendClose` and then `finishClose`. When the `withServer` callback returns, the channel closes.

A message larger than your buffer, or than `maxMessageBytes` in the `silk/websocket_server` `Limits` (64 KiB by default), ends the session with an error. Fragmented messages and compression extensions are not supported. A fragmented message ends the session, with close code 1003 sent when a finite deadline allows it.

## One request, one connection

`serveRequest` receives each request. It copies the method and target out of the head, because the head borrows the request and reading the body needs the request back. Then it either upgrades or answers plain HTTP:

```silk
// ---------------------------------------------------------------------------
// One request, one connection.

// Copies what it needs from the head, then upgrades /chat or answers plain HTTP.
effect fn serveRequest<'call, 'request: 'call, 'connection: 'request, 'transport: 'connection>(
  request: &'call mut Request<'request, 'connection, 'transport, Connection>,
) -> u16
! ServerError | UpgradeError | OutOfMemoryError
? &mut Logger | &mut MonotonicClock | &mut Allocator {
  let head = run Request.head(&request.*)
  let method = run Bytes.copy(String.utf8Bytes(head.method().format()))
  let target = run Bytes.copy(String.utf8Bytes(RequestTarget.format(head.target())))
  drop head
  if equal(Bytes.asSlice(&target), b"/chat") {
    let answered = run chat(move request)
    run logChat(answered)
    return 101
  } else {
    let body = run readBody(&mut request.*)
    let reply = run route(Bytes.asSlice(&method), Bytes.asSlice(&target), move body)
    let status = reply.status
    run logRequest(Bytes.asSlice(&method), Bytes.asSlice(&target), status)
    run send(move request, move reply)
    return status
  }
}

// One line per request on the server's Logger.
effect fn logRequest(method: &[u8], target: &[u8], status: u16) -> () ? &mut Logger {
  run Effect.catchAll(Effect.log("{method} {target} -> {status}\n", &.{ method: asText(method), target: asText(target), status: status }), ignore)
}

effect fn logChat(answered: u16) -> () ? &mut Logger {
  run Effect.catchAll(Effect.log("GET /chat -> 101, {answered} messages answered\n", &.{ answered: answered }), ignore)
}

effect fn ignore(error: LogError) -> () {
  drop error
}
```

The log lines live in their own small functions. With the same `Effect.log` call written inline in `serveRequest`, the native compiler currently reports `unsupported` at the `chat` call.

## Accepting connections

`Greeter` implements `ConnectionHandler`; its `handle` asks the connection for one request with `withRequest`. `acceptLoop` calls `serveNext`, which accepts one connection and runs the handler on it. A failed connection is logged and the loop goes on, so one bad client cannot stop the server. `serve` opens the socket:

```silk
struct Greeter {}

impl ConnectionHandler<Connection, u16, ServerError | UpgradeError | OutOfMemoryError
  ? &mut Logger | &mut MonotonicClock | &mut Allocator> for Greeter {
  effect<'call> fn handle<'call, 'connection: 'call, 'transport: 'connection>(
    handler: Self,
    connection: &'call mut HttpConnection<'connection, 'transport, Connection>,
  ) -> u16
  ! ServerError | UpgradeError | OutOfMemoryError
  ? &mut Logger | &mut MonotonicClock | &mut Allocator
  where &'transport mut Connection provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
    drop handler
    let handled = run withRequest(&mut connection.*, Option<Instant>.none(), serveRequest)
    return match move handled {
      Option.None => 0
      Option.Some { value } => value
    }
  }
}

// Serves `count` connections, one at a time. A failed connection is logged and skipped.
effect fn acceptLoop(listener: &mut Listener, count: u32) -> () ! LogError | OutOfMemoryError ? &mut Logger | &mut MonotonicClock | &mut Allocator {
  let mut served: u32 = 0
  while served < count {
    let outcome = run Effect.result(serveNext<u16, ServerError | UpgradeError | OutOfMemoryError>(
      &mut listener.*, limits(), Option<Instant>.none(), Greeter {},
    ))
    if let Result.Failure { error } = move outcome {
      drop error
      run Effect.log("a connection failed\n", &())
    }
    served = served + 1
  }
}

effect fn serve(port: u16, count: u32) -> () ! LogError | OutOfMemoryError ? &mut Logger | &mut MonotonicClock | &mut Allocator {
  let endpoint = Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
  let options = match move ListenOptions.make(128, true, 1000000) {
    Result.Success { value } => value
    Result.Failure { .. } => ListenOptions.defaults()
  }
  let listener = match move run Effect.result(listen(endpoint, options)) {
    Result.Success { value } => move value
    Result.Failure { error } => {
      drop error
      run Effect.log("cannot listen on 127.0.0.1:{port}\n", &.{ port: port })
      return ()
    }
  }
  run Effect.log("listening on http://127.0.0.1:{port}\n", &.{ port: port })
  run withListener(move listener, acceptLoop(count))
}

pub effect fn main() -> () ! LogError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut logger = StdoutLogger.make()
  let mut clock = OsMonotonicClock.make()
  // Five connections, then exit. Raise the count, or loop forever, for a real service.
  run serve(8080, 5)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

`ListenOptions.make(128, true, 1000000)` sets a backlog of 128, turns on address reuse, and polls every millisecond. With the defaults, address reuse is off, and restarting the server right after stopping it fails until the old socket lets go of the port. The Networking guide covers sockets in more detail.

## Try it

Build and start the server in the background:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/greeter &
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/greeter (llvm, x86_64-unknown-linux-gnu, 1273 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/greeter/build/llvm/x86_64-unknown-linux-gnu/debug/greeter
Build summary: 1 succeeded, 0 failed
```

The plain routes, with curl:

```sh
curl -s -i http://127.0.0.1:8080/hello
```

```
HTTP/1.1 200 OK
Content-Length: 16
Content-Type: text/plain; charset=utf-8
Connection: close

hello from silk
```

```sh
curl -s -X POST -d 'Buy milk' http://127.0.0.1:8080/echo; echo
```

```
Buy milk
```

```sh
curl -s -i http://127.0.0.1:8080/nope
```

```
HTTP/1.1 404 Not Found
Content-Length: 14
Content-Type: text/plain; charset=utf-8
Connection: close

no such route
```

The server added `Connection: close` itself, because of `ReusePolicy.CloseAfterResponse`.

For the WebSocket, Node.js 22 has a WebSocket client built in. Save this as `chat.js`:

```js
const ws = new WebSocket("ws://127.0.0.1:8080/chat");
const lines = ["hello", "how are you?"];
ws.onopen = () => { for (const line of lines) ws.send(line); };
let received = 0;
ws.onmessage = (event) => {
  console.log("received:", event.data);
  if (++received === lines.length) ws.close(1000);
};
ws.onclose = (event) => console.log("closed:", event.code);
```

```sh
node chat.js
```

```
received: hello
received: how are you?
closed: 1000
```

Last, a plain GET to `/chat`, with no handshake headers:

```sh
curl -s -i http://127.0.0.1:8080/chat; echo "[curl exit $?]"
```

```
[curl exit 52]
```

curl's exit status 52 means an empty reply. That was the fifth connection, so the server exits. Its own output was one line per connection:

```
listening on http://127.0.0.1:8080
GET /hello -> 200
POST /echo -> 200
GET /nope -> 404
GET /chat -> 101, 2 messages answered
a connection failed
```

The last request was not a valid handshake, so `withUpgrade` failed with an `UpgradeError` before writing anything, and the connection was dropped. To answer such a request properly, check it first with `inspect(&head, limits)` and, on failure, send the standard rejection with `reject(request, &error, limits, deadline)`: 426 for a wrong WebSocket version, 417 for a bad `Expect`, and 400 otherwise.

## What this server does not do

- **One connection at a time.** `serveNext` serves one connection and returns; a slow client makes the next one wait. The Concurrent I/O patterns guide shows how to serve many at once with fibers.
- **No TLS.** The standard library has TLS for clients only (`silk/tls_client`), so a Silk program cannot serve HTTPS or `wss://`. Keep the server on 127.0.0.1, or put a TLS-terminating proxy in front of it.
- **No router or middleware.** Routing is your own code over the method and target bytes. To split a target into path and query, parse it with `UriReference.parse` from `silk/uri_reference` and call `path()` and `query()`.
- **Deadlines are yours to set.** Every read and write takes an `Option<Instant>` deadline. This example passes `none()` everywhere; a public server should pass a deadline built from `MonotonicClock.now()` and `MonotonicClock.deadlineAfter`, so a silent client cannot hold a connection forever.

## API reference

- `silk/native_socket`: `listen`, `ListenOptions`, `Listener`, `withListener`
- `silk/http_server_native`: `serveNext`
- `silk/http_server`: `ConnectionHandler`, `Request`, `withRequest`, `readSome`, `respond`, `ResponseWriter`, `BodyMode`, `ReusePolicy`, `Limits`, `ServerError`
- `silk/http`: `Header`, `ResponseHead`, `Status`, `Version`
- `silk/http_head`, `silk/http_body`, `silk/http_headers`: `Limits`, `Headers`, `TrailerPolicy`
- `silk/http_target`: `RequestTarget`
- `silk/websocket_upgrade`: `withUpgrade`, `DecisionHandler`, `Decision`, `Offer`, `Outcome`, `inspect`, `reject`, `UpgradeError`
- `silk/websocket_server`: `withServer`, `ServerWebSocket`, `readEvent`, `writeText`, `Event`, `Limits`, `WebSocketError`
- `silk/network_address`: `Endpoint`, `IpAddress`, `Ipv4Address`, `Port`
