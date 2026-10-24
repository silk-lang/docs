Run HTTP/1 requests over a connection step by step: send the head, stream the body, and read the
response.

## When to use
Use this module to stream a request or a response body, or to reuse a connection. Make a
[`Connection`](#Connection) around a transport with [`makeOwned`](#makeOwned), [`withOwned`](#withOwned), or [`withConnected`](#withConnected), or
let [`withRoute`](#withRoute) connect through a proxy route. Then call [`withExchange`](#withExchange) for each request.
Most programs use `silk.http_client` or `silk.http_fetch`, which call this module.

## Details
A connection runs one exchange at a time. In the callback of [`withExchange`](#withExchange), call the steps in
order:
1. [`send`](#send) sends the head of a `PreparedRequest` from `silk.http_request`.
2. [`writeSome`](#writeSome) sends the body, and [`finishRequest`](#finishRequest) ends it. Call [`finishRequest`](#finishRequest) also when
   there is no body.
3. [`receive`](#receive) or [`receiveFinal`](#receiveFinal) reads a response head. Then [`readSome`](#readSome) reads the body, or
   [`beginContent`](#beginContent) and [`readContentSome`](#readContentSome) decode it.
4. [`finishResponse`](#finishResponse) ends the response. The connection can then run the next exchange.

[`Exchange.phase`](#Exchange.impl.phase) tells which step is next. A deadline in [`RequestOptions`](#RequestOptions) covers the whole
exchange, and is never restarted.

## Errors
- [`ExchangeError`](#ExchangeError) keeps the error from the lower module: the head parser, the body framing,
  content decoding, or the transport. A step out of order fails with `InvalidState`.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
If the callback fails or returns before the response is complete, the connection closes and is
not used again. Nothing is flushed, drained, or sent again for you. A 4xx or 5xx status is not
an error.

## Examples
### Send a GET request and read the body
This example uses a transport with a fixed response in place of a network connection.

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ByteDuplex, ReadTransfer }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.http { Header, Method, ValueError, Version }
import silk.http_exchange { Connection, Exchange, ExchangeError, Limits, RequestOptions }
import silk.http_exchange as Client
import silk.http_headers { Headers, Limits as ValueLimits }
import silk.http_origin { Origin, OriginError }
import silk.http_request { BodyMode, HeaderPolicy, PreparedRequest, RequestError, fromUri }
import silk.http_transport { HttpTransport, TransportError }
import silk.list { List }
import silk.memory_byte_duplex {
  MemoryByteDuplex,
  MemoryReadEvent,
  MemoryWriteAction,
  MemoryWriteEvent
}
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.random { Random }
import silk.result { Result }
import silk.system_clock { Instant, SystemClock }
import silk.u64
import silk.uri { Uri }
import silk.uri_reference { ParseError }

// A transport that answers with fixed bytes and accepts all writes.
struct ScriptedTransport {
  memory: MemoryByteDuplex,
}

impl HttpTransport for ScriptedTransport {
  effect fn readSomeRaw(
    self: &mut Self,
    output: &mut [u8],
    deadline: Option<Instant>
  ) -> ReadTransfer
    ! TransportError | OutOfMemoryError
    ? &mut MonotonicClock | &mut Allocator | &mut Random {
    let attempted = run Effect.result(ByteDuplex.readSome(&mut output, move deadline))
      |> Effect.provideMut<ByteDuplex>(&mut self.memory)
    return match move attempted {
      Result.Success { value } => move value
      Result.Failure { error } => {
        fail TransportError.Plain { error: move error }
      }
    }
  }

  effect fn writeSomeRaw(self: &mut Self, input: &[u8], deadline: Option<Instant>) -> usize
    ! TransportError | OutOfMemoryError
    ? &mut MonotonicClock | &mut Allocator | &mut Random {
    let attempted = run Effect.result(ByteDuplex.writeSome(input, move deadline))
      |> Effect.provideMut<ByteDuplex>(&mut self.memory)
    return match move attempted {
      Result.Success { value } => value
      Result.Failure { error } => {
        fail TransportError.Plain { error: move error }
      }
    }
  }

  effect fn flush(self: &mut Self, deadline: Option<Instant>) -> ()
    ! TransportError | OutOfMemoryError
    ? &mut MonotonicClock | &mut Allocator | &mut Random {
    drop deadline
    return ()
  }

  effect fn close(self: &mut Self) -> ()
    ! TransportError {
    return ()
  }
}

struct FixedClock {}

impl MonotonicClock for FixedClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }

  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    drop when
    return ()
  }

  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    drop howLong
    return ()
  }
}

struct ZeroRandom {}

impl Random for ZeroRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    drop output
    return ()
  }
}

fn valueLimits() -> ValueLimits {
  return Limits.defaults().head.values
}

// Sends the request and reads the body of the response.
effect<'call> fn readBody<'call, 'exchange: 'call>(
  exchange: &'call mut Exchange<'exchange, ScriptedTransport>,
) -> i32
  ! ExchangeError | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock | &mut Random {
  run Client.send(&mut exchange.*)

  // The request has no body, so it ends with no trailers.
  let entries: [Header<'static>; 0] = []
  let trailers = match Headers.make(&entries, valueLimits()) {
    Result<Headers, ValueError>.Success { value } => value
    Result<Headers, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  run Client.finishRequest(&mut exchange.*, &trailers)
  let status = run Client.receiveFinal(&mut exchange.*)
  if status != 200 {
    return 1
  }
  let mut body: [u8; 16] = [0; 16]
  let count = run Client.readSome(&mut exchange.*, &mut body)
  if count != 5 || body[0] != 104 {
    return 1
  }
  run Client.finishResponse(&mut exchange.*)
  return 0
}

effect fn program() -> i32
  ! ExchangeError | RequestError | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock | &mut Random {
  let uri = match Uri.parse("http://example.com/") {
    Result<Uri, ParseError>.Success { value } => value
    Result<Uri, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let origin = match Origin.fromUri(&uri) {
    Result<Origin, OriginError>.Success { value } => value
    Result<Origin, OriginError>.Failure { error: _ } => {
      return 1
    }
  }
  let entries: [Header<'static>; 0] = []
  let headers = match Headers.make(&entries, valueLimits()) {
    Result<Headers, ValueError>.Success { value } => value
    Result<Headers, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  let policy = HeaderPolicy.defaults()
  let request = run fromUri(
    &uri,
    Version.Http11,
    Method.get(),
    &headers,
    &policy,
    BodyMode.Empty,
    false,
    valueLimits(),
    4096,
    128,
  )
  let response = run Bytes.copy(b"HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhello")
  let mut reads = List<MemoryReadEvent>.make()
  run List.append(
    &mut reads,
    MemoryReadEvent.Data { readyAt: SystemClock.make(0, 0), bytes: move response }
  )
  let mut writes = List<MemoryWriteEvent>.make()
  run List.append(
    &mut writes,
    MemoryWriteEvent {
      readyAt: SystemClock.make(0, 0),
      action: MemoryWriteAction.Accept { count: 4096 }
    },
  )
  let memory = run MemoryByteDuplex.make(move reads, move writes, 4096, 4, Option<i32>.none())
  let mut connection = run Client.makeOwned(
    ScriptedTransport { memory: move memory },
    origin,
    Version.Http11,
    Limits.defaults(),
    Option<Instant>.none(),
  )
  let result = run Client.withExchange(
    &mut connection,
    &request,
    RequestOptions.defaults(),
    readBody
  )
  run Client.close(&mut connection)
  return result
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = FixedClock {}
  let mut random = ZeroRandom {}
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `Exchange` with `import silk.http_exchange { Exchange }`.

Public declarations: 44.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The state of a [`Connection`](#Connection).

::Anchor{id="ConnectionPhase.Ready"}

### `Ready`

```silk
Ready
```

The connection can start a new exchange.

::Anchor{id="ConnectionPhase.Active"}

### `Active`

```silk
Active
```

An exchange is running.

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

The connection cannot run more exchanges.

::Anchor{id="ExchangePhase"}

## `ExchangePhase`

```silk
pub enum ExchangePhase
```

The next step of an [`Exchange`](#Exchange).

::Anchor{id="ExchangePhase.Prepared"}

### `Prepared`

```silk
Prepared
```

Call [`send`](#send).

::Anchor{id="ExchangePhase.AwaitContinue"}

### `AwaitContinue`

```silk
AwaitContinue
```

The request has `Expect: 100-continue`. Call [`receive`](#receive) to wait for 100 Continue or an early
final response.

::Anchor{id="ExchangePhase.Upload"}

### `Upload`

```silk
Upload
```

Call [`writeSome`](#writeSome) for the body, then [`finishRequest`](#finishRequest).

::Anchor{id="ExchangePhase.AwaitResponse"}

### `AwaitResponse`

```silk
AwaitResponse
```

Call [`receive`](#receive) or [`receiveFinal`](#receiveFinal).

::Anchor{id="ExchangePhase.Response"}

### `Response`

```silk
Response
```

Read the body with [`readSome`](#readSome) or [`readContentSome`](#readContentSome), then call [`finishResponse`](#finishResponse).

::Anchor{id="ExchangePhase.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

A `CONNECT` succeeded. Call [`withTunnel`](#withTunnel).

::Anchor{id="ExchangePhase.Finished"}

### `Finished`

```silk
Finished
```

The request and the response are complete.

::Anchor{id="ExchangePhase.Aborted"}

### `Aborted`

```silk
Aborted
```

The exchange stopped. No more steps are possible.

::Anchor{id="ContinuePolicy"}

## `ContinuePolicy`

```silk
pub union ContinuePolicy
```

Whether the client waits for 100 Continue before it sends the body.

::Anchor{id="ContinuePolicy.Disabled"}

### `Disabled`

```silk
Disabled
```

Send the whole body before the response is read.

::Anchor{id="ContinuePolicy.Require100"}

### `Require100`

```silk
Require100
```

Wait for 100 Continue until a deadline. If it does not come, fail with `ContinueTimeout`. The
request needs `Expect: 100-continue`.

::Anchor{id="ContinuePolicy.Require100.deadline"}

#### Field `deadline`

```silk
pub deadline: Instant
```

The deadline on the `MonotonicClock`. The deadline of the exchange also applies.

::Anchor{id="RequestOptions"}

## `RequestOptions`

```silk
pub struct RequestOptions
```

The deadlines of one exchange. They are never restarted between steps.

::Anchor{id="RequestOptions.deadline"}

### Field `deadline`

```silk
pub deadline: Option<Instant>
```

The deadline of the whole exchange on the `MonotonicClock`, or `None` for no deadline.

::Anchor{id="RequestOptions.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

Whether to wait for 100 Continue. It must match the `PreparedRequest`.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The limits of a connection: buffers, heads, bodies, and request counts. Start from
[`Limits.defaults`](#Limits.impl.defaults).

::Anchor{id="Limits.head"}

### Field `head`

```silk
pub head: HeadLimits
```

The limits for response heads.

::Anchor{id="Limits.requestBody"}

### Field `requestBody`

```silk
pub requestBody: BodyLimits
```

The limits for request bodies.

::Anchor{id="Limits.responseBody"}

### Field `responseBody`

```silk
pub responseBody: BodyLimits
```

The limits for response bodies.

::Anchor{id="Limits.readCapacity"}

### Field `readCapacity`

```silk
pub readCapacity: usize
```

The size of the read buffer. It must not be 0.

::Anchor{id="Limits.writeCapacity"}

### Field `writeCapacity`

```silk
pub writeCapacity: usize
```

The size of the write buffer for framing. It must not be 0.

::Anchor{id="Limits.maxRequests"}

### Field `maxRequests`

```silk
pub maxRequests: usize
```

The maximum number of requests on one connection.

::Anchor{id="Limits.maxInformationalResponses"}

### Field `maxInformationalResponses`

```silk
pub maxInformationalResponses: usize
```

The maximum number of 1xx responses in one exchange. The default is 16.

::Anchor{id="Limits.maxInformationalWireBytes"}

### Field `maxInformationalWireBytes`

```silk
pub maxInformationalWireBytes: u64
```

The maximum total size of the 1xx responses in one exchange. The default is 65536.

::Anchor{id="Limits.maxDiscardWireBytes"}

### Field `maxDiscardWireBytes`

```silk
pub maxDiscardWireBytes: u64
```

The maximum bytes that one discard or drain call reads. It is at most 1048576.

::Anchor{id="Limits.impl.Copy"}

## Implementation `Copy for Limits`

```silk
impl Copy for Limits
```

::Anchor{id="Limits.impl"}

## Implementation `Limits`

```silk
impl Limits
```

::Anchor{id="Limits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> Limits
```

Returns the default limits: 16 MiB bodies, 64 KiB heads, and 128 requests for each connection.

::Anchor{id="RequestOptions.impl"}

## Implementation `RequestOptions`

```silk
impl RequestOptions
```

::Anchor{id="RequestOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> RequestOptions
```

Returns options with no deadline that do not wait for 100 Continue.

::Anchor{id="ExchangeError"}

## `ExchangeError`

```silk
pub union ExchangeError
```

The error from a connection or an exchange.

### Details

It keeps the error from the lower module: the head parser, the body framing, content decoding,
or the transport. A step out of order fails with `InvalidState`.

::Anchor{id="ExchangeError.Content"}

### `Content`

```silk
Content
```

Content decoding failed.

::Anchor{id="ExchangeError.Content.error"}

#### Field `error`

```silk
pub error: ContentError<'static>
```

The error from `silk.http_content`.

::Anchor{id="ExchangeError.Head"}

### `Head`

```silk
Head
```

A response head is not valid, or the head limits are not valid.

::Anchor{id="ExchangeError.Head.error"}

#### Field `error`

```silk
pub error: ParseError
```

The error from `silk.http_head`.

::Anchor{id="ExchangeError.Body"}

### `Body`

```silk
Body
```

The body framing failed.

::Anchor{id="ExchangeError.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The error from `silk.http_body`.

::Anchor{id="ExchangeError.Transport"}

### `Transport`

```silk
Transport
```

The transport failed.

::Anchor{id="ExchangeError.Transport.error"}

#### Field `error`

```silk
pub error: TransportError
```

The error from `silk.http_transport`.

::Anchor{id="ExchangeError.Output"}

### `Output`

```silk
Output
```

The transport failed during a write. `progress` tells what was already accepted and sent.

::Anchor{id="ExchangeError.Output.error"}

#### Field `error`

```silk
pub error: TransportError
```

The error from `silk.http_transport`.

::Anchor{id="ExchangeError.Output.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The bytes accepted and sent by the call before the error.

::Anchor{id="ExchangeError.OutputTimeout"}

### `OutputTimeout`

```silk
OutputTimeout
```

The deadline passed during a write.

::Anchor{id="ExchangeError.OutputTimeout.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The bytes accepted and sent by the call before the deadline.

::Anchor{id="ExchangeError.OutputAllocation"}

### `OutputAllocation`

```silk
OutputAllocation
```

The transport could not allocate during a write.

::Anchor{id="ExchangeError.OutputAllocation.error"}

#### Field `error`

```silk
pub error: OutOfMemoryError
```

The allocation error.

::Anchor{id="ExchangeError.OutputAllocation.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The bytes accepted and sent by the call before the error.

::Anchor{id="ExchangeError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The step is not valid in the current phase. Nothing was sent or read.

::Anchor{id="ExchangeError.InvalidRequest"}

### `InvalidRequest`

```silk
InvalidRequest
```

The request does not fit the connection, for example another version or another server, or its
body framing does not fit the options.

::Anchor{id="ExchangeError.InvalidLimits"}

### `InvalidLimits`

```silk
InvalidLimits
```

A buffer size in the limits is 0.

::Anchor{id="ExchangeError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

Too many 1xx responses, or too many requests on the connection.

::Anchor{id="ExchangeError.TruncatedHead"}

### `TruncatedHead`

```silk
TruncatedHead
```

The connection ended before a complete response head.

::Anchor{id="ExchangeError.UnsupportedUpgrade"}

### `UnsupportedUpgrade`

```silk
UnsupportedUpgrade
```

The server sent 101 Switching Protocols, which this module does not support.

::Anchor{id="ExchangeError.ContinueTimeout"}

### `ContinueTimeout`

```silk
ContinueTimeout
```

The deadline of `Require100` passed without 100 Continue.

::Anchor{id="ExchangeError.Timeout"}

### `Timeout`

```silk
Timeout
```

The deadline of the exchange passed.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits(limits: &Limits) -> Result<(), ExchangeError>
```

Checks `limits` without allocation or I/O.

### Details
The buffer sizes must not be 0, and `maxDiscardWireBytes` must be at most 1048576. The head
limits must pass `validateLimits` of `silk.http_head`. That error is returned in `Head`.

::Anchor{id="DiscardOutcome"}

## `DiscardOutcome`

```silk
pub enum DiscardOutcome
```

The result of a discard or a drain.

::Anchor{id="DiscardOutcome.Completed"}

### `Completed`

```silk
Completed
```

The whole response was read within the limit.

::Anchor{id="DiscardOutcome.CapReached"}

### `CapReached`

```silk
CapReached
```

The limit was reached before the end of the response. The connection cannot be used again.

::Anchor{id="ReuseEligibility"}

## `ReuseEligibility`

```silk
pub union ReuseEligibility
```

Whether a connection can go back to a pool. See [`reuseEligibility`](#reuseEligibility).

::Anchor{id="ReuseEligibility.Eligible"}

### `Eligible`

```silk
Eligible
```

The connection can go back to a pool.

::Anchor{id="ReuseEligibility.NotReady"}

### `NotReady`

```silk
NotReady
```

The last exchange did not complete.

::Anchor{id="ReuseEligibility.NotOwned"}

### `NotOwned`

```silk
NotOwned
```

The connection does not own its transport, so it cannot close it later.

::Anchor{id="ReuseEligibility.RequestLimit"}

### `RequestLimit`

```silk
RequestLimit
```

The connection has reached `maxRequests`.

::Anchor{id="ReuseEligibility.RetainedInput"}

### `RetainedInput`

```silk
RetainedInput
```

The server sent bytes after the end of the response.

::Anchor{id="ReuseEligibility.RetainedInput.bytes"}

#### Field `bytes`

```silk
pub bytes: usize
```

The number of extra bytes.

::Anchor{id="ReuseEligibility.impl.Copy"}

## Implementation `Copy for ReuseEligibility`

```silk
impl Copy for ReuseEligibility
```

::Anchor{id="WriteProgress"}

## `WriteProgress`

```silk
pub struct WriteProgress
```

The progress of one write call.

::Anchor{id="WriteProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The bytes of your input that the call accepted.

::Anchor{id="WriteProgress.written"}

### Field `written`

```silk
pub written: usize
```

The framed bytes that the call sent to the transport.

::Anchor{id="WriteProgress.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

The total body bytes accepted so far.

::Anchor{id="WriteProgress.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

The total framed bytes sent so far.

::Anchor{id="WriteProgress.impl.Copy"}

## Implementation `Copy for WriteProgress`

```silk
impl Copy for WriteProgress
```

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection<P>
```

An HTTP/1 connection over the transport `P`. It keeps its buffers and the bytes that it read
after the last response.

### When to use

Use it to stream a request or a response body, or to reuse a connection. Make one with
[`makeOwned`](#makeOwned), [`withOwned`](#withOwned), or [`withConnected`](#withConnected), or let [`withRoute`](#withRoute) connect through a proxy
route. Then call [`withExchange`](#withExchange) for each request. Most programs use `silk.http_client` or
`silk.http_fetch` instead.

### Details

A connection runs one exchange at a time. In the callback of [`withExchange`](#withExchange), call the steps in
order: [`send`](#send), then [`writeSome`](#writeSome) and [`finishRequest`](#finishRequest), then [`receive`](#receive) or [`receiveFinal`](#receiveFinal)
and [`readSome`](#readSome) or [`readContentSome`](#readContentSome), then [`finishResponse`](#finishResponse).

### Gotchas

If an exchange callback fails or returns before the response is complete, the connection closes
and is not used again. Nothing is flushed, drained, or sent again for you.

::Anchor{id="Connection.impl"}

## Implementation `Connection<P>`

```silk
impl<P> Connection<P>
```

::Anchor{id="Connection.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ConnectionPhase
```

Returns the state of the connection.

::Anchor{id="Connection.impl.unread"}

### Method `unread`

```silk
pub fn unread(self: &Self) -> usize
```

Returns the number of bytes that were read after the last response.

::Anchor{id="reuseEligibility"}

## `reuseEligibility`

```silk
pub fn reuseEligibility<P>(connection: &Connection<P>) -> ReuseEligibility
```

Returns whether the connection can go back to a pool.

`Eligible` needs a `Ready` connection that owns its transport, has requests left, and has no
extra bytes. Other values tell the first check that failed.

::Anchor{id="TransportContext"}

## `TransportContext`

```silk
pub struct TransportContext<'view, P>
```

A shared view of the transport of a connection, to inspect its route.

::Anchor{id="TransportContext.transport"}

### Field `transport`

```silk
pub transport: &'view P
```

The transport.

::Anchor{id="Connection.impl-2"}

## Implementation `Connection<P>`

```silk
impl<P> Connection<P>
```

::Anchor{id="Connection.impl.transportContext"}

### Method `transportContext`

```silk
pub fn transportContext<'view>(self: &'view Self) -> TransportContext<'view, P>
```

Returns a shared view of the transport.

::Anchor{id="Exchange"}

## `Exchange`

```silk
pub struct Exchange<'exchange, P>
```

One request and its response on a connection. You get it in the callback of [`withExchange`](#withExchange).

::Anchor{id="Exchange.impl"}

## Implementation `Exchange<'exchange, P>`

```silk
impl<'exchange, P> Exchange<'exchange, P>
```

::Anchor{id="Exchange.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ExchangePhase
```

Returns the next step.

::Anchor{id="Exchange.impl.head"}

### Method `head`

```silk
pub effect fn head<'head>(self: &'head Self) -> ResponseHead<'head> ! ExchangeError
```

Returns the last response head that was received. Copy it with `ResponseHead.copy` to keep it.

::Anchor{id="ConnectionHandler"}

## `ConnectionHandler`

```silk
pub interface ConnectionHandler<P, A, E, ?R>
```

The code that uses a connection in [`withOwned`](#withOwned) or [`withConnected`](#withConnected). It cannot keep the
connection.

::Anchor{id="ConnectionHandler.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<'call>(handler: Self, connection: &'call mut Connection<P>) -> A ! E ? R where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport
```

Uses the connection. The connection is closed or kept after this call returns.

::Anchor{id="RouteProtocol"}

## `RouteProtocol`

```silk
pub enum RouteProtocol
```

The HTTP version, and the ALPN that TLS sends, for a route.

::Anchor{id="RouteProtocol.Http10"}

### `Http10`

```silk
Http10
```

Use HTTP/1.0, and send no ALPN.

::Anchor{id="RouteProtocol.OptionalHttp11"}

### `OptionalHttp11`

```silk
OptionalHttp11
```

Use HTTP/1.1. The TLS server can choose no ALPN protocol.

::Anchor{id="RouteProtocol.RequiredHttp11"}

### `RequiredHttp11`

```silk
RequiredHttp11
```

Use HTTP/1.1. The TLS server must choose `http/1.1`.

::Anchor{id="RouteSettings"}

## `RouteSettings`

```silk
pub struct RouteSettings
```

The settings for [`withRoute`](#withRoute).

::Anchor{id="RouteSettings.http"}

### Field `http`

```silk
pub http: Limits
```

The limits of the connection.

::Anchor{id="RouteSettings.request"}

### Field `request`

```silk
pub request: HeaderLimits
```

The value limits for the `CONNECT` request to a proxy.

::Anchor{id="RouteSettings.maxRequestHeadBytes"}

### Field `maxRequestHeadBytes`

```silk
pub maxRequestHeadBytes: usize
```

The maximum size of the `CONNECT` head.

::Anchor{id="RouteSettings.maxProxyCredentialBytes"}

### Field `maxProxyCredentialBytes`

```silk
pub maxProxyCredentialBytes: usize
```

The maximum size of the proxy credentials in the `CONNECT` head.

::Anchor{id="RouteSettings.protocol"}

### Field `protocol`

```silk
pub protocol: RouteProtocol
```

The HTTP version and ALPN.

::Anchor{id="RouteSettings.tls"}

### Field `tls`

```silk
pub tls: ClientLimits
```

The limits of the TLS client.

::Anchor{id="RouteSettings.handshakeDurationNanoseconds"}

### Field `handshakeDurationNanoseconds`

```silk
pub handshakeDurationNanoseconds: u64
```

The maximum duration of the TLS handshake, in nanoseconds.

::Anchor{id="RouteSettings.impl.Copy"}

## Implementation `Copy for RouteSettings`

```silk
impl Copy for RouteSettings
```

::Anchor{id="AcquiredRouteContext"}

## `AcquiredRouteContext`

```silk
pub service AcquiredRouteContext<P, A, E, ?R>
```

The service that a [`RouteClient`](#RouteClient) calls with the transport that it opened.

::Anchor{id="AcquiredRouteContext.use"}

### Operation `use`

```silk
effect<'env> fn use<'env>(provider: P) -> A ! E ? R | &mut AcquiredRouteContext<P, A, E, R> where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    R in Without<R, ByteDuplex>,
    R in Without<R, HttpTransport>
```

Uses `provider`, the transport to the server that the route selected.

::Anchor{id="RouteClient"}

## `RouteClient`

```silk
pub interface RouteClient<P, A, E, AcquisitionError, ?AcquisitionRequirements, ?R>
```

Opens transports for [`withRoute`](#withRoute): a direct connection or a connection to a proxy.

::Anchor{id="RouteClient.settings"}

### Operation `settings`

```silk
fn settings(client: &Self) -> RouteSettings
```

Returns the HTTP and TLS settings. No default is added.

::Anchor{id="RouteClient.acquire"}

### Operation `acquire`

```silk
effect<'env> fn acquire<'env>(client: Self, peer: Origin, deadline: Option<Instant>) -> A ! E | AcquisitionError ? AcquisitionRequirements | R | &mut AcquiredRouteContext<
    P,
    A,
    E,
    R,
  > where R in Without<R, ByteDuplex>, R in Without<R, HttpTransport>
```

Opens a transport to `peer` before `deadline`, and gives it to [`AcquiredRouteContext.use`](#AcquiredRouteContext.use).

::Anchor{id="RouteTransport"}

## `RouteTransport`

```silk
pub struct RouteTransport<'transport, 'provider: 'transport, 'tunnel: 'provider, P>
```

The transport that [`withRoute`](#withRoute) gives to your handler.

::Anchor{id="RouteHandler"}

## `RouteHandler`

```silk
pub interface RouteHandler<'configuration, P, A, E, ?R>
```

The code that uses the connection of [`withRoute`](#withRoute).

::Anchor{id="RouteHandler.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<'call, 'transport: 'call, 'provider: 'transport, 'tunnel: 'provider>(
    handler: Self,
    route: Route<'configuration>,
    connection: &'call mut Connection<RouteTransport<'transport, 'provider, 'tunnel, P>>,
  ) -> A ! E ? R where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &ByteDuplex from &mut ByteDuplex
```

Uses the connection after it is open, and after TLS checked the origin.

::Anchor{id="RouteTransport.impl"}

## Implementation `RouteTransport<'transport, 'provider, 'tunnel, P>`

```silk
impl<'transport, 'provider: 'transport, 'tunnel: 'provider, P> RouteTransport<
  'transport,
  'provider,
  'tunnel,
  P,
>
```

::Anchor{id="RouteTransport.impl.HttpTransport"}

## Implementation `HttpTransport for RouteTransport<'transport, 'provider, 'tunnel, P>`

```silk
impl<'transport, 'provider: 'transport, 'tunnel: 'provider, P> HttpTransport for RouteTransport<
  'transport,
  'provider,
  'tunnel,
  P,
>
where
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

::Anchor{id="RouteTransport.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: RouteTransport.read
```

::Anchor{id="RouteTransport.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: RouteTransport.write
```

::Anchor{id="RouteTransport.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: RouteTransport.flushOutput
```

::Anchor{id="RouteTransport.impl.HttpTransport.close"}

### Operation `close`

```silk
close: RouteTransport.closeTransport
```

::Anchor{id="withRoute"}

## `withRoute`

```silk
pub effect<'env> fn withRoute<
  'configuration,
  P,
  A,
  E,
  AcquisitionError,
  ?R,
  ?AcquisitionRequirements,
  H: RouteHandler<'configuration, P, A, E ? R> + 'env,
  C: RouteClient<P, A, E | ProxyError | ExchangeError | Tls.ConnectionError | IdentityError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random> + 'env,
  'env,
>(
  client: C,
  route: Route<'configuration>,
  preparedTrust: Option<TrustSnapshot>,
  deadline: Option<Instant>,
  handler: H,
) -> A
! E | AcquisitionError | ProxyError | ExchangeError | Tls.ConnectionError | IdentityError | OutOfMemoryError
? R | AcquisitionRequirements | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  R in Without<R, ByteDuplex>,
  R in Without<R, HttpTransport>
```

Opens a connection for `route`, gives it to `handler`, and closes it.

### Details
The trust for TLS is checked before the connection opens. A `Forward` route uses the plain
connection to the proxy. A `Tunnel` route sends `CONNECT`, then does TLS with the origin through
the tunnel. One deadline covers all steps.

::Anchor{id="makeOwned"}

## `makeOwned`

```silk
pub effect<'env> fn makeOwned<P: 'env, 'env>(
  transport: P,
  origin: Origin,
  version: Version,
  limits: Limits,
  overallDeadline: Option<Instant>,
) -> Connection<P>
! ExchangeError | OutOfMemoryError
? &mut Allocator
where &mut P provides &HttpTransport from &mut HttpTransport
```

Returns a connection that owns `transport`, so that you can keep it for more exchanges. If
allocation fails, `transport` is closed.

::Anchor{id="withOwned"}

## `withOwned`

```silk
pub effect<'env> fn withOwned<P: 'env, A, E, ?R, H: ConnectionHandler<P, A, E ? R> + 'env, 'env>(
  transport: P,
  origin: Origin,
  version: Version,
  limits: Limits,
  overallDeadline: Option<Instant>,
  handler: H,
) -> A
! E | ExchangeError | OutOfMemoryError
? R | &mut Allocator
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport
```

Makes a connection that owns `transport`, gives it to `handler`, and closes it when `handler`
returns or fails.

::Anchor{id="withConnected"}

## `withConnected`

```silk
pub effect<'env> fn withConnected<'env, P, A, E, ?R, H: ConnectionHandler<Loan<'env, P>, A, E ? R>>(
  transport: &'env mut P,
  origin: Origin,
  version: Version,
  limits: Limits,
  overallDeadline: Option<Instant>,
  handler: H,
) -> A
! E | ExchangeError | OutOfMemoryError
? R | &mut Allocator
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport
```

Gives a connection over a borrowed `transport` to `handler`. The connection closes when
`handler` returns, but you still own `transport`.

::Anchor{id="close"}

## `close`

```silk
pub effect fn close<P>(connection: &mut Connection<P>) -> ()
! ExchangeError
where &mut P provides &HttpTransport from &mut HttpTransport
```

Closes the connection and its transport, without a flush or a drain. A second call does nothing.

::Anchor{id="withExchange"}

## `withExchange`

```silk
pub effect fn withExchange<'exchange, 'callback, P, A, E, ?R>(
  connection: &'exchange mut Connection<P>,
  request: &PreparedRequest,
  requestedOptions: RequestOptions,
  callback: for<'call, 'exchangeView: 'call> once fn<'callback>(
    &'call mut Exchange<'exchangeView, P>,
  ) -> once Effect<'call & 'callback; A ! E ? R>,
) -> A ! E | ExchangeError | OutOfMemoryError ? R | &mut Allocator
```

Runs one exchange of `request` on the connection, in `callback`.

In `callback`, call the steps in order:
1. [`send`](#send) sends the head of a `PreparedRequest` from `silk.http_request`.
2. [`writeSome`](#writeSome) sends the body, and [`finishRequest`](#finishRequest) ends it. Call [`finishRequest`](#finishRequest) also when
   there is no body.
3. [`receive`](#receive) or [`receiveFinal`](#receiveFinal) reads a response head. Then [`readSome`](#readSome) reads the body, or
   [`beginContent`](#beginContent) and [`readContentSome`](#readContentSome) decode it.
4. [`finishResponse`](#finishResponse) ends the response. The connection can then run the next exchange.

[`Exchange.phase`](#Exchange.impl.phase) tells which step is next. A step out of order fails with `InvalidState`. A
deadline in [`RequestOptions`](#RequestOptions) covers the whole exchange, and is never restarted.

### Gotchas

If the callback fails, or returns before the response is complete, the connection closes and
cannot run another exchange. Nothing is flushed, drained, or sent again for you. A 4xx or 5xx
status is not an error.

::Anchor{id="send"}

## `send`

```silk
pub effect fn send<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends the request head. With `Require100`, it also flushes, so that the server can answer before
the body.

::Anchor{id="writeSome"}

## `writeSome`

```silk
pub effect fn writeSome<'exchange, P>(exchange: &mut Exchange<'exchange, P>, input: &[u8]) -> WriteProgress
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends a prefix of `input` as body, and returns the progress. On an error, the error keeps the
progress.

::Anchor{id="finishRequest"}

## `finishRequest`

```silk
pub effect fn finishRequest<'exchange, P>(exchange: &mut Exchange<'exchange, P>, trailers: &Headers) -> ()
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Ends the request body with `trailers`, and flushes. Call it also when there is no body. Then
read the response.

::Anchor{id="receive"}

## `receive`

```silk
pub effect fn receive<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> u16
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads one response head, and returns its status. A 1xx status is also returned. A 4xx or 5xx
status is not an error.

::Anchor{id="receiveFinal"}

## `receiveFinal`

```silk
pub effect fn receiveFinal<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> u16
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads response heads until one is not 1xx, and returns its status.

### Details
It does not copy the head and does not read the body. Get the head with [`Exchange.head`](#Exchange.impl.head).

::Anchor{id="readSome"}

## `readSome`

```silk
pub effect fn readSome<'exchange, P>(exchange: &mut Exchange<'exchange, P>, output: &mut [u8]) -> usize
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads body bytes into `output`, and returns how many. It returns 0 at the end of the body. It
never reads past the end of the response.

::Anchor{id="discardRemainingAtMost"}

## `discardRemainingAtMost`

```silk
pub effect fn discardRemainingAtMost<'exchange, P>(
  exchange: &mut Exchange<'exchange, P>,
  maxWireBytes: u64,
  deadline: Option<Instant>,
) -> DiscardOutcome
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads and drops the rest of the response body, up to `maxWireBytes` bytes on the wire.

### When to use
Use it when you can continue if the limit is reached.

### Details
The limit is the smaller of `maxWireBytes` and `Limits.maxDiscardWireBytes`, and counts the body
and its framing. `deadline` cannot be later than the deadline of the exchange. After
`Completed`, call [`finishResponse`](#finishResponse). After `CapReached`, the connection cannot be used again.

### Gotchas
Bad framing, a read error, the deadline, and the allocator still fail with their errors.

::Anchor{id="drainAndFinishAtMost"}

## `drainAndFinishAtMost`

```silk
pub effect fn drainAndFinishAtMost<'exchange, P>(
  exchange: &mut Exchange<'exchange, P>,
  maxWireBytes: u64,
  deadline: Instant,
) -> DiscardOutcome
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads and drops the rest of the response, then calls [`finishResponse`](#finishResponse).

### When to use
Use it when the response must complete so that the connection can be used again. A good limit is
65536 bytes. The maximum is 1048576.

### Details
The limit is the smaller of `maxWireBytes` and `Limits.maxDiscardWireBytes`, and counts the
body, the framing, and the trailers. `deadline` cannot be later than the deadline of the
exchange. If a content decoder was selected, it is checked too.

### Gotchas
After `CapReached`, the response is not complete. Errors keep their original types.

::Anchor{id="discardRemaining"}

## `discardRemaining`

```silk
pub effect fn discardRemaining<'exchange, P>(
  exchange: &mut Exchange<'exchange, P>,
  maxWireBytes: u64,
) -> ()
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads and drops the rest of the response body, up to the smaller of `maxWireBytes` and the limit
of the client. On an error or at the limit, the connection cannot be used again.

::Anchor{id="trailers"}

## `trailers`

```silk
pub effect fn trailers<'head, 'exchange, P>(exchange: &'head Exchange<'exchange, P>) -> Option<
  Trailers<'head>,
> ! ExchangeError
```

Returns the trailers of a complete chunked response, or `None`.

::Anchor{id="finishResponse"}

## `finishResponse`

```silk
pub effect fn finishResponse<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
! ExchangeError
```

Ends the response. The body must be complete. This function does not read the rest of the body
for you.

::Anchor{id="abort"}

## `abort`

```silk
pub fn abort<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
```

Stops the exchange. The connection cannot be used again. Nothing is sent or read.

::Anchor{id="Tunnel"}

## `Tunnel`

```silk
pub struct Tunnel<'tunnel, P>
```

The connection after a successful `CONNECT`. Reads first return the bytes that came after the
response head.

::Anchor{id="TransferredTunnel"}

## `TransferredTunnel`

```silk
pub struct TransferredTunnel<'tunnel, P>
```

A tunnel that owns the transport of the connection.

### Details
Reads first return the bytes that came after the response head. The deadline of the exchange
also applies. Closing it closes the transport one time.

::Anchor{id="withTunnel"}

## `withTunnel`

```silk
pub effect fn withTunnel<'tunnel, 'exchange: 'tunnel, 'callback, P, A, E, ?R>(
  exchange: &'tunnel mut Exchange<'exchange, P>,
  callback: for<'call, 'tunnelView: 'call> once fn<'callback>(&'call mut Tunnel<'tunnelView, P>) -> once Effect<'call & 'callback; A ! E ? R>,
) -> A ! E | ExchangeError ? R
```

Gives the tunnel of a successful `CONNECT` to `callback`. The connection cannot run HTTP again.

::Anchor{id="Tunnel.impl"}

## Implementation `Tunnel<'tunnel, P>`

```silk
impl<'tunnel, P> Tunnel<'tunnel, P>
```

::Anchor{id="Tunnel.impl.transferByteDuplex"}

### Method `transferByteDuplex`

```silk
pub effect fn transferByteDuplex<'transfer, 'callback, A, E, ?CallbackRequirements>(
    self: &'transfer mut Self,
    callback: for<'call, 'duplexView: 'call> once fn<'callback>(
      &'call mut TransferredTunnel<'duplexView, P>,
    ) -> once Effect<'call & 'callback; A ! E ? CallbackRequirements>,
  ) -> A
  ! E | ExchangeError
  ? CallbackRequirements
  where
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Gives the tunnel to `callback` as a byte duplex, for example for TLS.

#### Details
This does not allocate. The duplex closes after the callback returns, fails, or is cancelled.

#### Gotchas
A second call returns `InvalidState`.

::Anchor{id="Tunnel.impl.readSome"}

### Method `readSome`

```silk
pub effect fn readSome(self: &mut Self, output: &mut [u8], requestedDeadline: Option<Instant>) -> ReadTransfer
  ! ExchangeError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads bytes. It returns the bytes that came after the response head first.

::Anchor{id="Tunnel.impl.writeSome"}

### Method `writeSome`

```silk
pub effect fn writeSome(self: &mut Self, input: &[u8], requestedDeadline: Option<Instant>) -> usize
  ! ExchangeError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Writes a prefix of `input`, and returns its length.

::Anchor{id="TransferredTunnel.impl"}

## Implementation `TransferredTunnel<'tunnel, P>`

```silk
impl<'tunnel, P> TransferredTunnel<'tunnel, P>
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex"}

## Implementation `ByteDuplex for TransferredTunnel<'tunnel, P>`

```silk
impl<'tunnel, P> ByteDuplex for TransferredTunnel<'tunnel, P>
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: TransferredTunnel.read
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: TransferredTunnel.write
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.writeSomeVectoredRaw"}

### Operation `writeSomeVectoredRaw`

```silk
writeSomeVectoredRaw: TransferredTunnel.writeVectored
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
flushRaw: TransferredTunnel.flushOutput
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
shutdownWriteRaw: TransferredTunnel.shutdownOutput
```

::Anchor{id="TransferredTunnel.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
closeRaw: TransferredTunnel.closeTransport
```

::Anchor{id="beginContent"}

## `beginContent`

```silk
pub effect fn beginContent<'head, 'exchange: 'head, P>(
  exchange: &'head mut Exchange<'exchange, P>,
  mode: ContentMode,
  limits: ContentLimits,
) -> AppliedPlan
! ExchangeError | ContentError<'head> | OutOfMemoryError
? &mut Allocator | &mut MonotonicClock
```

Selects how to decode the response body, from its head and `mode`, before you read it.

### Details
Handle a planning error before you use the exchange again, because the error borrows the head.
The result tells which decoding was selected.

::Anchor{id="readContentSome"}

## `readContentSome`

```silk
pub effect fn readContentSome<'exchange, P>(
  exchange: &mut Exchange<'exchange, P>,
  output: &mut [u8],
) -> ContentProgress
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads decoded body bytes into `output`. The bytes are final only after the content and the
framing complete.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
