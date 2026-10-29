# HTTP client

For most programs, sending a request and reading the whole response takes three names: the `Http` service, the `Request` builder and the `Response` it returns. You build a `Request`, call `Http.send`, and get back a `Response` with the status, headers and body in memory. `main` supplies one provider, `NativeHttp`, and tests can supply a fake. This guide builds `statuscheck`, a small client for a JSON status endpoint. It then covers HTTPS, testing, the limits of this client, and when to use the lower-level modules instead.

## A server to talk to

Any HTTP server will do. Python's built-in one is enough. Make a folder with one JSON file and serve it on 127.0.0.1:

```sh
mkdir www && cd www
printf '{"service":"tasks","open":2,"version":"0.13"}\n' > status.json
python3 -m http.server 8000 --bind 127.0.0.1
```

Leave it running and open a second terminal. `/status.json` answers 200, any other file answers 404, and every POST answers 501, because this server only serves files. All three are useful here.

## The program

Create a package with `silk init statuscheck` and replace `src/main.silk` with this:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.http.client { Http, HttpError, HttpErrorKind, Request, Response }
import silk.http.client_native { NativeHttp }
import silk.json.value { Json }
import silk.core.option { Option }
import silk.io.writer_native { StdoutWriter }
import silk.core.result { Result }
import silk.io.writer { Writer, WriterError }

// Asks the service how many tasks are open. A non-2xx status is a failure here.
effect fn openTasks(path: string) -> i32
  ! HttpError | OutOfMemoryError
  ? &mut Http | &mut Allocator {
  let response = run Http.send(Request.get(path).timeoutSeconds(2))
  let checked = run response.expectOk()
  let document = run checked.json()
  return match Json.asI32(Json.field(&document, "open")) {
    Option.Some { value } => value
    Option.None => -1
  }
}

// Adds a task. Whatever status comes back is a response, not a failure.
effect fn addTask(title: string) -> u16
  ! HttpError | OutOfMemoryError
  ? &mut Http | &mut Allocator {
  let response = run Http.postJson("/tasks", &.{ title: title, priority: "high" })
  return response.status()
}

effect fn explain(error: HttpError) -> ()
  ! WriterError
  ? &mut Writer {
  run Format.format(
    "  failed: {kind}: {message}",
    &.{ kind: kindName(error.kind), message: error.message }
  )
  if let Option.Some { value } = &error.status {
    run Format.format(" (HTTP {status})", &.{ status: value })
  }
  run Writer.writeAll(b"\n")
}

effect fn check(path: string) -> ()
  ! WriterError | OutOfMemoryError
  ? &mut Http | &mut Writer | &mut Allocator {
  run Format.format("GET {path}\n", &.{ path: path })
  match move run Effect.result(openTasks(path)) {
    Result.Success { value } => run Format.format("  open tasks: {open}\n", &.{ open: value })
    Result.Failure { error } => match move error {
      HttpError failure => run explain(move failure)
      OutOfMemoryError exhausted => {
        fail move exhausted
      }
    }
  }
}

effect fn add(title: string) -> ()
  ! WriterError | OutOfMemoryError
  ? &mut Http | &mut Writer | &mut Allocator {
  run Format.format("POST /tasks\n", &())
  match move run Effect.result(addTask(title)) {
    Result.Success { value } => run Format.format("  answered HTTP {status}\n", &.{ status: value })
    Result.Failure { error } => match move error {
      HttpError failure => run explain(move failure)
      OutOfMemoryError exhausted => {
        fail move exhausted
      }
    }
  }
}

fn kindName(kind: HttpErrorKind) -> string<'static> {
  return match kind {
    HttpErrorKind.InvalidUrl => "InvalidUrl"
    HttpErrorKind.InvalidRequest => "InvalidRequest"
    HttpErrorKind.Encode => "Encode"
    HttpErrorKind.Connect => "Connect"
    HttpErrorKind.Tls => "Tls"
    HttpErrorKind.Timeout => "Timeout"
    HttpErrorKind.Protocol => "Protocol"
    HttpErrorKind.TooLarge => "TooLarge"
    HttpErrorKind.Redirect => "Redirect"
    HttpErrorKind.Status => "Status"
    HttpErrorKind.Decode => "Decode"
  }
}

// The whole session, run against whichever Http provider main supplies.
effect fn session() -> ()
  ! WriterError | OutOfMemoryError
  ? &mut Http | &mut Writer | &mut Allocator {
  run check("/status.json")
  run check("/missing.json")
  run add("Buy milk")
}

pub effect fn main() -> ()
  ! WriterError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut writer = StdoutWriter.make()
  let mut http = NativeHttp.make().baseUrl("http://127.0.0.1:8000").header(
    "User-Agent",
    "statuscheck/0.1"
  )
  run session() |> Effect.provideMut<Http>(&mut http) |> Effect.provideMut<Writer>(&mut writer)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Run it:

```sh
silk run
```

```
GET /status.json
  open tasks: 2
GET /missing.json
  failed: Status: The server answered with a non-2xx status. (HTTP 404)
POST /tasks
  answered HTTP 501
```

Three requests, three outcomes. The rest of this guide explains the choices behind each one.

## The service and its provider

Look at the `?` rows. `openTasks`, `addTask` and `session` require `&mut Http` and know nothing about sockets. Only `main` picks the provider, `NativeHttp` from `silk/http/client_native`, and lends it with `Effect.provideMut<Http>`. This is the same pattern as Logger and FileSystem in the book. See **Services and providers** in the reference.

`NativeHttp.make()` reads nothing and cannot fail. Its builder methods set defaults for every request it sends:

| Method | Default | What it sets |
| --- | --- | --- |
| `baseUrl(url)` | none | Prefix for request URLs that have no scheme, such as `"/status.json"` |
| `header(name, value)` | none | A header on every request (at most 16); a request header with the same name wins |
| `timeoutSeconds(s)` | 30 | The deadline for each request |
| `maxBodyBytes(n)` | 16 MiB | The largest response body accepted |
| `maxRedirects(n)` | 10 | Redirects followed; 0 returns the redirect itself |
| `failOnStatus()` | off | Every non-2xx final response fails with `HttpErrorKind.Status` |
| `trustBundle(path)` | platform bundle | The PEM file of trusted roots for HTTPS |

`NativeHttp.fromEnvironment()` is `make()` plus two things: when `SSL_CERT_FILE` is set, it uses that file as the trust bundle, and it routes requests through the proxies named in the environment (see **Proxies** below). It needs `HostInput`, so call it from `main`.

The provider exists on the hosted targets only: Linux with glibc on x86\_64 and aarch64, and macOS on aarch64. A WebAssembly component built for `wasm32-wasip2` uses `WasiHttp.make()` from `silk/http/client_wasi` instead. The host then does the transport, TLS and network policy through `wasi:http`, with the same defaults of 30 seconds, 16 MiB and ten redirects. On no-libc Linux, `wasm32-unknown-unknown` and `wasm32-wasip1`, code written against `Http` still compiles; you supply another provider.

## Building a request

A `Request` is a plain value. Building one allocates nothing and never fails. Each method takes the request by value and returns the changed one, so calls chain:

```silk
Request.get("/search").query("q", "a b").header("Accept", "application/json").timeoutSeconds(5)
```

| Group | Methods |
| --- | --- |
| Start | `Request.get`, `post`, `put`, `patch`, `delete`, `head`, `options`, or `Request.make(method, url)` |
| URL | `path(segment)` appends text as given; `query(name, value)` adds a parameter, percent-encoded at send time |
| Headers | `header(name, value)`; `bearer(token)` sets `Authorization: Bearer <token>` |
| Body | `text(s)` (text/plain; charset=utf-8), `bytes(data, contentType)`, `json(&value)` (application/json) |
| Per request | `timeoutSeconds`, `maxBodyBytes`, `maxRedirects` override the provider's defaults |

Problems are reported when you send, not while you build. A bad URL, an invalid header name, or a request with more than 8 path segments, 16 query parameters or 32 headers fails at `Http.send` with `InvalidUrl` or `InvalidRequest`. A relative URL with no `baseUrl` is an `InvalidUrl` too, and so is any scheme other than http and https.

`json` is the one builder step that can fail, because it encodes and allocates. That is why `addTask` uses the shortcut `Http.postJson(url, &value)`, which builds and sends in one call. The value is a named or anonymous struct, written in field order. Fields that are private to another module are left out.

You never set `Content-Length` or `Transfer-Encoding`; the client generates them from the body, and rejects them if you try. Setting `User-Agent`, `Accept`, `Authorization` or `Host` replaces the generated value. Here is what the three requests looked like on the wire, captured with a small socket server in place of Python's:

```
GET /status.json HTTP/1.1
Accept-Encoding: identity
Host: 127.0.0.1:18197
User-Agent: statuscheck/0.1
Accept: */*

GET /missing.json HTTP/1.1
Accept-Encoding: identity
Host: 127.0.0.1:18197
User-Agent: statuscheck/0.1
Accept: */*

POST /tasks HTTP/1.1
Accept-Encoding: identity
Content-Type: application/json
Host: 127.0.0.1:18197
User-Agent: statuscheck/0.1
Accept: */*
Content-Length: 38

{"title":"Buy milk","priority":"high"}
```

Without the `header` call in `main`, the User-Agent is `silk-http/1`.

## Every status is a response

`Http.send` succeeds whenever a complete response arrives, whatever its status. A 404 or a 500 is a `Response` you can read. That is why the POST printed "answered HTTP 501" instead of failing.

When only success makes sense, opt in to failing. `openTasks` calls `response.expectOk()`, which returns the response for a 2xx status and otherwise fails with an `HttpError` of kind `Status`, carrying the code in `error.status`. That produced the "(HTTP 404)" line. To make every request through one provider behave like that, build it with `NativeHttp.make().failOnStatus()`.

## Reading the response

The whole body is in memory by the time `send` returns. `Response` offers:

| Method | Returns |
| --- | --- |
| `status()`, `ok()` | The code, and whether it is in 200..=299 |
| `header(name)` | The first header with that name, case-insensitive, as `Option<&[u8]>` |
| `head()` | The full response head, every header included |
| `body()`, `intoBody()` | The body as `&[u8]`, or moved out as `Bytes` |
| `text()` | The body as UTF-8 text; fails with `Decode` otherwise |
| `json()` | The body parsed into a `silk/json/value` `Value` tree |
| `decode<T>()` | The body decoded as a `T` that implements `Deserialize` |
| `url()` | The URL that produced the response, after redirects |

`openTasks` uses `json()` and then `Json.field` and `Json.asI32` to pull out one number. The JSON and TOML guide covers the other ways to read JSON.

## When it fails: `HttpError`

Every failure is one `HttpError`: a `kind`, a short `message` for people, the `status` when a response arrived, and a `cause` holding the lower-level error when there is one (`HttpCause`, for example `HttpCause.Tls` with the TLS `ConnectionError`). Match on `kind` to decide what to do:

| Kind | Meaning |
| --- | --- |
| `InvalidUrl` | The URL did not parse, is relative with no base, uses another scheme, or has credentials |
| `InvalidRequest` | A bad header or method, or a builder limit was exceeded |
| `Encode` | The JSON body could not be encoded |
| `Connect` | Name resolution or the TCP connection failed |
| `Tls` | TLS, certificate validation or the trust bundle failed |
| `Timeout` | The deadline passed |
| `Protocol` | The server broke HTTP framing or a protocol limit |
| `TooLarge` | The body exceeded `maxBodyBytes` |
| `Redirect` | A redirect was invalid, unsafe, or over the hop limit |
| `Status` | `expectOk` or `failOnStatus` rejected a non-2xx status |
| `Decode` | `text`, `json` or `decode` could not read the body |

Stop the Python server and run the program again. Nothing listens on port 8000:

```
GET /status.json
  failed: Connect: Could not connect to the server.
GET /missing.json
  failed: Connect: Could not connect to the server.
POST /tasks
  failed: Connect: Could not connect to the server.
```

## Deadlines

Each request has one deadline, 30 seconds unless the provider or the request says otherwise. `openTasks` sets 2 seconds. To see it work, replace the Python server with one that accepts connections on port 8000 and never answers:

```
GET /status.json
  failed: Timeout: The request deadline passed.
GET /missing.json
  failed: Timeout: The request deadline passed.
POST /tasks
  failed: Timeout: The request deadline passed.
```

The run took 34 seconds: 2 for each GET and the default 30 for the POST. Set `timeoutSeconds` on the provider when one value should apply everywhere.

The deadline covers the TLS handshake and the HTTP exchange. It does not bound name resolution or the TCP connect, which can take as long as the operating system allows. Nothing else bounds them either: `NativeHttp` blocks the thread while it waits, so a fiber-based timeout, like the one in the Concurrent I/O patterns guide, cannot interrupt it.

## Redirects

`NativeHttp` follows up to 10 redirects. Python's server redirects `/docs` to `/docs/` when `docs` is a folder. With `Http.get("http://127.0.0.1:8000/docs")` the final response has status 200 and `response.url()` is `http://127.0.0.1:8000/docs/`. With `.maxRedirects(0)` on the request you get the 301 itself, and `response.header("location")` is `/docs/`.

The rules follow the browser fetch standard. A 303, and a 301 or 302 after a POST, continue as GET without the body; 307 and 308 repeat the method and body. A redirect from HTTPS to HTTP fails with `Redirect`. A redirect to another origin drops the `Authorization` and `Cookie` headers.

## HTTPS

An `https://` URL needs no extra code. `NativeHttp` checks the server's certificate against a PEM bundle of trusted roots: `/etc/ssl/certs/ca-certificates.crt` on Linux and `/etc/ssl/cert.pem` on macOS. The bundle is read on the first HTTPS request, not at `make()`. A GET to `https://example.com/` with `NativeHttp.make()` returns 200.

To trust something else, such as a private CA in tests, either call `.trustBundle("/absolute/path/ca.pem")` or start with `NativeHttp.fromEnvironment()` and set `SSL_CERT_FILE`. A path that does not exist fails the request with `Tls: Could not load the PEM trust bundle.` An empty `SSL_CERT_FILE` makes `fromEnvironment` itself fail. The macOS keychain is not consulted.

The client speaks TLS 1.3 only. The TLS, certificates and trust guide explains the trust model and the lower-level TLS API.

## Proxies

`NativeHttp.make()` always connects directly. `NativeHttp.fromEnvironment()` reads the usual proxy variables:

| Variable | Used for |
| --- | --- |
| `HTTP_PROXY`, then `http_proxy`, `ALL_PROXY`, `all_proxy` | Plain `http://` requests. The first one that is set and not empty wins |
| `HTTPS_PROXY`, then `https_proxy`, `ALL_PROXY`, `all_proxy` | `https://` requests, through a `CONNECT` tunnel, so TLS still checks the server's certificate |
| `NO_PROXY` or `no_proxy` | Hosts to reach directly, separated by commas. `example.com` and `.example.com` both match `api.example.com`, and `*` matches every host |

Only `http://` proxy URLs work; an `https://` or `socks5://` one makes `fromEnvironment` fail with `InvalidUrl`. A proxy URL with `user:pass@` sends Basic credentials to the proxy. In `NO_PROXY`, a port is ignored and an address range such as `10.0.0.0/8` matches nothing.

To see it, change `main` to require `? &mut HostInput`, make the client with `run NativeHttp.fromEnvironment()`, and add `HttpError | HostInputError` to its failure row. Then, with a small server on port 8100 that logs what it receives, `HTTP_PROXY=http://127.0.0.1:8100` sends `GET http://tasks.internal/status.json` to that server with the full URL in the request line:

```
GET http://tasks.internal/status.json HTTP/1.1
Accept-Encoding: identity
Host: tasks.internal
User-Agent: silk-http/1
Accept: */*
```

The name `tasks.internal` is never resolved locally; the proxy does that.

## Testing with a fake provider

Code that requires `? &mut Http` runs unchanged on any provider. A fake is a struct that implements `send`. Add this to `src/main.silk`, with `import silk.text.string { String }` and `import silk.testing.testing { AssertionError, Testing }`:

```silk
// A fake Http for tests: answers from a script and counts the calls.
struct ScriptedHttp {
  calls: i32,
}

impl Http for ScriptedHttp {
  effect fn send(self: &mut Self, request: Request) -> Response ! HttpError | OutOfMemoryError ? &mut Allocator {
    self.calls = self.calls + 1
    let url = run request.resolveUrl("http://tasks.test")
    if String.view(&url) == "http://tasks.test/status.json" {
      return run Response.make(200, b"{\"open\":7}")
    }
    return run Response.make(404, b"")
  }
}

test effect fn readsTheOpenCount() ! AssertionError<'static> | HttpError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut http = ScriptedHttp { calls: 0 }
  let open = run openTasks("/status.json")
    |> Effect.provideMut<Http>(&mut http)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(open == 7, "the count comes from the JSON body")
  run Testing.expect(http.calls == 1, "one request was sent")
}

test effect fn missingIsAStatusError() ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut http = ScriptedHttp { calls: 0 }
  let outcome = run Effect.result(openTasks("/gone.json"))
    |> Effect.provideMut<Http>(&mut http)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let rejected = match move outcome {
    Result.Success { .. } => false
    Result.Failure { error } => match move error {
      HttpError failure => failure.kind == HttpErrorKind.Status
      _ => false
    }
  }
  run Testing.expect(rejected, "a 404 fails with HttpErrorKind.Status")
}
```

`request.resolveUrl(base)` gives the fake the full URL the real client would use, query string included. `Response.make(status, body)` and `Response.withHeaders(status, headers, body)` build canned responses.

```sh
silk test
```

```
  main::missingIsAStatusError
    PASS  26 us
  main::readsTheOpenCount
    PASS  52 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   968 us
```

A provider can also wrap another one, adding a header, logging or retries, and forward with `Effect.provideMut<Http>`. The Testing with providers guide has more on fakes.

## What this client does not do

`silk/http/client` is new and deliberately small. Know its limits before you rely on it:

- **No content decoding.** It sends `Accept-Encoding: identity`, and if a server compresses anyway, `body()` holds the compressed bytes.
- **No connection reuse.** Every request, and every redirect hop, opens a fresh HTTP/1.1 connection.
- **No streaming.** The request body and the whole response body live in memory, up to `maxBodyBytes`.
- **Proxies only from the environment.** `fromEnvironment` reads the proxy variables, and only `http://` proxies work. There is no builder method to set a proxy in code.
- **Deadline gaps.** The deadline does not bound name resolution or the TCP connect.
- **HTTP/1.1 over TCP only.** The `Http` service does not speak HTTP/2 and has no Unix sockets. HTTP/2 exists as a lower layer, shown below.

## When to drop down a layer

The facade is built on lower-level modules that you can use directly. They take more code, with explicit limits, deadlines, trust and lifetimes, so reach for them only when you need what they add:

| You need | Use |
| --- | --- |
| Streaming a large body in either direction, custom framing, `Expect: 100-continue`, control over one connection | `silk/http/exchange` with `silk/http/exchange_native` (`withConnection`, `withExchange`, `readSome`, `writeSome`) |
| gzip, deflate or Zstandard decoding, a proxy, a body delivered to a sink, bounded one-shot delivery with redirects | `silk/http/fetch` with `silk/http/fetch_native`; `FetchOptions` selects `ContentMode.Decode`, `PoolMode` and `ProxyMode` |
| Keeping connections open across many requests to the same origins | `silk/http/connection_pool` with `silk/http/connection_pool_native` (`withDirectPool`, `withUnixPool`) |
| HTTP over a Unix socket | `withUnixConnection` in `silk/http/exchange_native` or `withUnixPool` |
| Your own redirect, proxy or content policy | `silk/http/redirect`, `silk/http/proxy`, `silk/http/content` |

Each of these pages in the std lib API reference starts with a When to use section.

### HTTP/2

`silk/http/http2` is HTTP/2 (RFC 9113) as a state machine that does no I/O. A `Connection` is made for `Role.Client` or `Role.Server`. You queue requests or responses on it, take the bytes to send from `Connection.output`, and feed it the bytes that arrive with `Connection.receive`, which returns at most one `Event` per call: `Headers`, `Data`, `Reset`, `Goaway` and so on. Header fields are compressed with HPACK (RFC 7541), which `silk/http/hpack` implements, and arrive decoded. `silk/http/http2_connection` drives a `Connection` over a plain or TLS `HttpTransport`; on TLS it requires `h2` from ALPN.

Because it does no I/O, a client and a server can talk to each other in memory. This program, `h2`, opens one request stream, answers it, and prints every event:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.collections.bytes { Bytes }
import silk.collections.list { List }
import silk.collections.slice { Slice }
import silk.text.format { Format }
import silk.text.string { String }
import silk.http.hpack { Field }
import silk.http.http2 { Connection, Event, Limits, Role }
import silk.http.http2_frame { ProtocolError }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }

// Moves every queued byte from one connection to the other and prints the events it causes.
effect fn pump(from: &mut Connection, to: &mut Connection, label: string) -> ()
  ! ProtocolError | WriterError | OutOfMemoryError
  ? &mut Allocator | &mut Writer {
  let wire = run Bytes.copy(Connection.output(&from.*))
  run Connection.consumeOutput(&mut from.*, Bytes.length(&wire))
  let mut at: usize = 0
  while at < Bytes.length(&wire) {
    let input = Slice.view(Bytes.asSlice(&wire), at, Bytes.length(&wire) - at)
    let progress = run Connection.receive(&mut to.*, input)
    at = at + progress.consumed
    match move progress.event {
      Event.Headers { stream, fields, endStream } => {
        let list = List.asSlice(&fields)
        let mut index: usize = 0
        while index < list.length {
          run Format.format("{label} stream {stream}: {name} = {value}\n", &.{
            label: label,
            stream: stream,
            name: unsafe String.fromUtf8Unchecked(Bytes.asSlice(&list[index].name)),
            value: unsafe String.fromUtf8Unchecked(Bytes.asSlice(&list[index].value)),
          })
          index = index + 1
        }
      }
      Event.Data { stream, bytes, endStream } => {
        run Format.format("{label} stream {stream}: body {body}\n", &.{
          label: label,
          stream: stream,
          body: unsafe String.fromUtf8Unchecked(Bytes.asSlice(&bytes)),
        })
      }
      _ => {}
    }
  }
}

effect fn exchange() -> ()
  ! ProtocolError | WriterError | OutOfMemoryError
  ? &mut Allocator | &mut Writer {
  let mut client = run Connection.make(Role.Client, Limits.defaults())
  let mut server = run Connection.make(Role.Server, Limits.defaults())
  let request = [
    Field { name: b":method", value: b"GET", sensitive: false },
    Field { name: b":scheme", value: b"https", sensitive: false },
    Field { name: b":authority", value: b"tasks.test", sensitive: false },
    Field { name: b":path", value: b"/status", sensitive: false },
  ]
  let stream = run Connection.open(&mut client, &request, true)
  run pump(&mut client, &mut server, "server got")
  let response = [
    Field { name: b":status", value: b"200", sensitive: false },
    Field { name: b"content-type", value: b"text/plain", sensitive: false },
  ]
  run Connection.sendHeaders(&mut server, stream, &response, false)
  let sent = run Connection.sendData(&mut server, stream, b"2 open", true)
  run pump(&mut server, &mut client, "client got")
  run pump(&mut client, &mut server, "server got")
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

effect fn session() -> i32
  ! ProtocolError | WriterError | OutOfMemoryError
  ? &mut Allocator | &mut Writer {
  run exchange()
  return 0
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut writer = StdoutWriter.make()
  return run Effect.catchAll(session(), failed)
    |> Effect.provideMut<Writer>(&mut writer)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

```
server got stream 1: :method = GET
server got stream 1: :scheme = https
server got stream 1: :authority = tasks.test
server got stream 1: :path = /status
client got stream 1: :status = 200
client got stream 1: content-type = text/plain
client got stream 1: body 2 open
```

The bytes that cross between the two connections are real HTTP/2 frames: the client preface, SETTINGS frames and their acknowledgments, which the connections queue on their own, and the HEADERS and DATA frames for the stream. `sendData` returns how many bytes flow control let it queue; 0 means wait for a `Writable` event. After you consume received DATA, call `Connection.release` to give the peer its window back. The last `pump` delivers the client's SETTINGS acknowledgment. `ProtocolError` does not implement `Debug`, so `main` turns every failure into exit status 1 with `Effect.catchAll` instead of returning it.

## API reference

- `silk/http/client`: `Http`, `Request`, `Response`, `HttpError`, `HttpErrorKind`, `HttpCause`
- `silk/http/client_native`: `NativeHttp`
- `silk/http/client_wasi`: `WasiHttp` (`wasm32-wasip2` only)
- `silk/json/value`: `Json`, `Value`
- `silk/http/exchange`, `silk/http/exchange_native`
- `silk/http/fetch`, `silk/http/fetch_native`
- `silk/http/connection_pool`, `silk/http/connection_pool_native`
- `silk/http/redirect`, `silk/http/proxy`, `silk/http/content`
- `silk/http/http2`: `Connection`, `Role`, `Limits`, `Event`; `silk/http/http2_frame`: `ProtocolError`; `silk/http/http2_connection`: `Driver`; `silk/http/hpack`: `Field`, `Header`, `Encoder`, `Decoder`
- `silk/testing/testing`: `Testing`, `AssertionError`
