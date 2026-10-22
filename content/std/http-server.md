Scoped bounded streaming HTTP/1.0 and HTTP/1.1 server connections.

## Details

`withConnection` binds one concrete byte provider and one buffered session for a serial
connection lifetime. `withRequest` lends one request at a time; its parsed head, body decoder,
response writer, and upgraded channel cannot escape their nested callbacks. Scope release closes
abortively and never hides a protected exit behind flush or drain work.

Import as `Connection` with `import silk.http_server { Connection }`.

Public declarations: 22.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The externally visible connection lifecycle.

::Anchor{id="ConnectionPhase.Ready"}

### `Ready`

```silk
Ready
```

Permits admission of the next request within the request budget.

::Anchor{id="ConnectionPhase.RequestActive"}

### `RequestActive`

```silk
RequestActive
```

Permits request inspection, body reads, and response selection.

::Anchor{id="ConnectionPhase.Responding"}

### `Responding`

```silk
Responding
```

Permits writes through the active response writer.

::Anchor{id="ConnectionPhase.Closing"}

### `Closing`

```silk
Closing
```

Requires closure and forbids another request.

::Anchor{id="ConnectionPhase.Upgraded"}

### `Upgraded`

```silk
Upgraded
```

Lends the channel to another protocol and forbids HTTP operations.

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

Marks a completed connection with no further I/O permitted.

::Anchor{id="ConnectionPhase.Failed"}

### `Failed`

```silk
Failed
```

Marks a terminal protocol or transport failure.

::Anchor{id="BodyMode"}

## `BodyMode`

```silk
pub union BodyMode
```

The caller-selected response body delimiter.

::Anchor{id="BodyMode.NoBody"}

### `NoBody`

```silk
NoBody
```

Sends no response payload, including special responses such as HEAD and 204.

::Anchor{id="BodyMode.ContentLength"}

### `ContentLength`

```silk
ContentLength
```

Sends exactly the declared number of payload bytes.

::Anchor{id="BodyMode.ContentLength.length"}

#### Field `length`

```silk
pub length: u64
```

The exact payload length required before finish.

::Anchor{id="BodyMode.Chunked"}

### `Chunked`

```silk
Chunked
```

Uses HTTP/1.1 chunk framing and permits bounded trailers.

::Anchor{id="BodyMode.CloseDelimited"}

### `CloseDelimited`

```silk
CloseDelimited
```

Uses connection closure as the payload delimiter and forbids reuse.

::Anchor{id="BodyMode.impl.Copy"}

## Implementation `Copy for BodyMode`

```silk
impl Copy for BodyMode
```

::Anchor{id="ReusePolicy"}

## `ReusePolicy`

```silk
pub enum ReusePolicy
```

Persistence policy. A policy never overrides missing completion evidence.

::Anchor{id="ReusePolicy.Automatic"}

### `Automatic`

```silk
Automatic
```

Uses HTTP/1.1 persistence when both message boundaries and peer policy permit it.

::Anchor{id="ReusePolicy.CloseAfterResponse"}

### `CloseAfterResponse`

```silk
CloseAfterResponse
```

Closes after this response regardless of peer persistence policy.

::Anchor{id="ReusePolicy.Http10KeepAlive"}

### `Http10KeepAlive`

```silk
Http10KeepAlive
```

Also permits HTTP/1.0 reuse when the peer explicitly requests keep-alive.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Finite server budgets and the exact lower-level limits they compose.

::Anchor{id="Limits.head"}

### Field `head`

```silk
pub head: HeadLimits
```

The finite limits for request and response head parsing.

::Anchor{id="Limits.body"}

### Field `body`

```silk
pub body: BodyLimits
```

The finite limits for body framing, payload, trailers, and owned decoder storage.

::Anchor{id="Limits.values"}

### Field `values`

```silk
pub values: HeaderLimits
```

The limits for response values, including generated Connection fields.

::Anchor{id="Limits.readCapacity"}

### Field `readCapacity`

```silk
pub readCapacity: usize
```

The positive fixed capacity of the input buffer.

::Anchor{id="Limits.writeCapacity"}

### Field `writeCapacity`

```silk
pub writeCapacity: usize
```

The positive fixed capacity of the output buffer.

::Anchor{id="Limits.maxRequestsPerConnection"}

### Field `maxRequestsPerConnection`

```silk
pub maxRequestsPerConnection: usize
```

The maximum admitted requests; zero prevents any request-head read.

::Anchor{id="Limits.maxInformationalResponses"}

### Field `maxInformationalResponses`

```silk
pub maxInformationalResponses: usize
```

The maximum explicit and automatic informational responses per request.

::Anchor{id="Limits.maxDiscardWireBytes"}

### Field `maxDiscardWireBytes`

```silk
pub maxDiscardWireBytes: u64
```

The maximum wire bytes discarded by one request-body discard call.

::Anchor{id="Limits.shutdownDrainBytes"}

### Field `shutdownDrainBytes`

```silk
pub shutdownDrainBytes: usize
```

The maximum input bytes discarded by explicit connection finish.

::Anchor{id="Limits.impl.Copy"}

## Implementation `Copy for Limits`

```silk
impl Copy for Limits
```

::Anchor{id="ServerLimitKind"}

## `ServerLimitKind`

```silk
pub enum ServerLimitKind
```

Server-owned limits distinct from lower-level parser, value, and framing limits.

::Anchor{id="ServerLimitKind.InformationalResponses"}

### `InformationalResponses`

```silk
InformationalResponses
```

The combined count of explicit and automatic informational responses.

::Anchor{id="ServerError"}

## `ServerError`

```silk
pub union ServerError
```

A precise server lifecycle failure preserving its lower-level cause.

::Anchor{id="ServerError.Head"}

### `Head`

```silk
Head
```

A request or response head failed validation.

::Anchor{id="ServerError.Head.error"}

#### Field `error`

```silk
pub error: ParseError
```

The exact head parser failure.

::Anchor{id="ServerError.Body"}

### `Body`

```silk
Body
```

A request or response body violated its framing contract.

::Anchor{id="ServerError.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The framing failure and its committed progress.

::Anchor{id="ServerError.Buffer"}

### `Buffer`

```silk
Buffer
```

A buffered transport operation failed.

::Anchor{id="ServerError.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The buffer failure and any recorded transport progress.

::Anchor{id="ServerError.Output"}

### `Output`

```silk
Output
```

Response framing advanced before buffered output failed.

::Anchor{id="ServerError.Output.error"}

#### Field `error`

```silk
pub error: BufferError
```

The failure from the buffered transport.

::Anchor{id="ServerError.Output.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The accepted payload, buffered prefix, and cumulative framing coordinates.

::Anchor{id="ServerError.Value"}

### `Value`

```silk
Value
```

A response value or normalized header failed validation.

::Anchor{id="ServerError.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The exact shared HTTP value failure.

::Anchor{id="ServerError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

An operation would exceed a finite server limit.

::Anchor{id="ServerError.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: ServerLimitKind
```

The exhausted resource.

::Anchor{id="ServerError.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The configured maximum for this resource.

::Anchor{id="ServerError.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The count that the operation attempted to reach.

::Anchor{id="ServerError.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked count or byte arithmetic cannot represent the requested result.

::Anchor{id="ServerError.UnsupportedExpectation"}

### `UnsupportedExpectation`

```silk
UnsupportedExpectation
```

A body operation encountered an unsupported request expectation.

::Anchor{id="ServerError.InvalidBodyMode"}

### `InvalidBodyMode`

```silk
InvalidBodyMode
```

The chosen body mode conflicts with the response framing or status.

::Anchor{id="ServerError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The requested operation is unavailable in the current phase.

::Anchor{id="ServerError.InvalidState.phase"}

#### Field `phase`

```silk
pub phase: ConnectionPhase
```

The phase that rejected the operation.

::Anchor{id="ServerError.UpgradeRejected"}

### `UpgradeRejected`

```silk
UpgradeRejected
```

The request, selected protocol, or response cannot perform a generic Upgrade.

::Anchor{id="ServerError.TunnelRejected"}

### `TunnelRejected`

```silk
TunnelRejected
```

The request or response cannot perform a CONNECT tunnel handoff.

::Anchor{id="ServerError.TruncatedHead"}

### `TruncatedHead`

```silk
TruncatedHead
```

Input ended before a complete HTTP head became available.

::Anchor{id="WriteProgress"}

## `WriteProgress`

```silk
pub struct WriteProgress
```

Exact payload accepted by one response-writer call and framed bytes accepted by buffering.

::Anchor{id="WriteProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The caller payload prefix accepted during this writer call.

::Anchor{id="WriteProgress.buffered"}

### Field `buffered`

```silk
pub buffered: usize
```

The framed prefix accepted by the output buffer during this writer call.

::Anchor{id="WriteProgress.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

The cumulative payload bytes accepted by the response encoder.

::Anchor{id="WriteProgress.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

The cumulative framed bytes produced by the response encoder.

::Anchor{id="WriteProgress.impl.Copy"}

## Implementation `Copy for WriteProgress`

```silk
impl Copy for WriteProgress
```

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection<'connection, 'transport, P>
```

One affine serial server connection borrowing its concrete buffered channel.

::Anchor{id="Connection.impl"}

## Implementation `Connection<'connection, 'transport, P>`

```silk
impl<'connection, 'transport, P> Connection<'connection, 'transport, P>
```

::Anchor{id="Connection.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ConnectionPhase
```

Returns the current connection phase.

::Anchor{id="Connection.impl.requests"}

### Method `requests`

```silk
pub fn requests(self: &Self) -> usize
```

Returns the number of request heads admitted by this connection.

::Anchor{id="Connection.impl.unread"}

### Method `unread`

```silk
pub fn unread(self: &Self) -> usize
```

Returns the exact byte count retained in the input buffer.

::Anchor{id="Request"}

## `Request`

```silk
pub struct Request<'request, 'connection, 'transport, P>
```

One callback-scoped active request and its single-message framing decoder.

::Anchor{id="Request.impl"}

## Implementation `Request<'request, 'connection, 'transport, P>`

```silk
impl<'request, 'connection, 'transport, P> Request<'request, 'connection, 'transport, P>
```

::Anchor{id="Request.impl.head"}

### Method `head`

```silk
pub effect fn head<'head>(self: &'head Self) -> RequestHead<'head> ! ServerError
```

Borrows the completed parsed head from active request storage.

::Anchor{id="Request.impl.bodyComplete"}

### Method `bodyComplete`

```silk
pub effect fn bodyComplete(self: &Self) -> bool ! ServerError
```

Returns whether request framing completed; fails unless the request remains active.

::Anchor{id="Request.impl.expectationRejected"}

### Method `expectationRejected`

```silk
pub effect fn expectationRejected(self: &Self) -> bool ! ServerError
```

Returns whether Expect requires rejection; fails unless the request remains active.

::Anchor{id="ResponseWriter"}

## `ResponseWriter`

```silk
pub struct ResponseWriter<'writer, 'request, 'connection, 'transport, P>
```

One nested final-response writer. Its fields are private so completion cannot be forged.

::Anchor{id="ConnectionHandler"}

## `ConnectionHandler`

```silk
pub interface ConnectionHandler<P, A, E, ?R>
```

Compile-time handler selected for one scoped server connection.

::Anchor{id="ConnectionHandler.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<'call, 'connection: 'call, 'transport: 'connection>(
    handler: Self,
    connection: &'call mut Connection<'connection, 'transport, P>,
  ) -> A ! E ? R
  where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Runs within the connection loan and preserves the handler failure and requirement channels.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits(limits: &Limits) -> Result<(), ServerError>
```

Validates server-only construction invariants without allocation or I/O.

::Anchor{id="withConnection"}

## `withConnection`

```silk
pub effect<'env> fn withConnection<
  'env,
  A,
  E,
  ?CallbackRequirements,
  P,
  H: ConnectionHandler<P, A, E ? CallbackRequirements> + 'env,
>(
  transport: &'env mut P,
  limits: Limits,
  handler: H,
) -> A
! E | ServerError | BufferError | OutOfMemoryError
? CallbackRequirements | &mut Allocator
where &'env mut P provides &ByteDuplex from &mut ByteDuplex,
  &'env mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Runs one higher-ranked server callback over a single bound concrete provider.

::Anchor{id="withRequest"}

## `withRequest`

```silk
pub effect fn withRequest<
  'request,
  'connection: 'request,
  'transport: 'connection,
  'callback,
  A,
  E,
  ?CallbackRequirements,
  P,
>(
  connection: &'request mut Connection<'connection, 'transport, P>,
  deadline: Option<Instant>,
  callback: for<'call, 'requestView: 'call, 'connectionView: 'requestView, 'transportView: 'connectionView> once fn<'callback>(
    &'call mut Request<'requestView, 'connectionView, 'transportView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> Option<A>
! E | ServerError | OutOfMemoryError
? CallbackRequirements | &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Admits at most one request and lends it exclusively. `None` is clean end between requests.

::Anchor{id="readSome"}

## `readSome`

```silk
pub effect fn readSome<'request, 'connection, 'transport, P>(
  request: &mut Request<'request, 'connection, 'transport, P>,
  output: &mut [u8],
  deadline: Option<Instant>,
) -> usize
! ServerError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Reads one provisional decoded payload prefix.

::Anchor{id="discardRemaining"}

## `discardRemaining`

```silk
pub effect fn discardRemaining<'request, 'connection, 'transport, P>(
  request: &mut Request<'request, 'connection, 'transport, P>,
  maxWireBytes: u64,
  deadline: Option<Instant>,
) -> ()
! ServerError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Explicitly discards the remaining framed request under the smaller configured/caller wire bound.

::Anchor{id="finishConnection"}

## `finishConnection`

```silk
pub effect fn finishConnection<'connection, 'transport, P>(
  connection: &mut Connection<'connection, 'transport, P>,
  maxDrainBytes: usize,
  deadline: Instant,
) -> ()
! ServerError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Gracefully flushes, shuts down writes, and performs one finite best-effort input drain.

::Anchor{id="sendInformational"}

## `sendInformational`

```silk
pub effect fn sendInformational<'request, 'connection, 'transport, 'value, P>(
  request: &mut Request<'request, 'connection, 'transport, P>,
  head: &ValueResponseHead<'value>,
  deadline: Option<Instant>,
) -> ()
! ServerError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Sends one bounded informational response and flushes it before returning.

::Anchor{id="respond"}

## `respond`

```silk
pub effect fn respond<
  'writer,
  'request: 'writer,
  'connection: 'request,
  'transport: 'connection,
  'value: 'writer,
  'names: 'request,
  'callback,
  A,
  E,
  ?CallbackRequirements,
  P,
>(
  request: &'writer mut Request<'request, 'connection, 'transport, P>,
  head: &ValueResponseHead<'value>,
  mode: BodyMode,
  reuse: ReusePolicy,
  trailerPolicy: TrailerPolicy<'names>,
  deadline: Option<Instant>,
  callback: for<'call, 'writerView: 'call, 'requestView: 'writerView, 'connectionView: 'requestView, 'transportView: 'connectionView> once fn<'callback>(
    &'call mut ResponseWriter<'writerView, 'requestView, 'connectionView, 'transportView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A
! E | ServerError | OutOfMemoryError
? CallbackRequirements | &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Begins exactly one final response and lends its streaming writer.

::Anchor{id="reject"}

## `reject`

```silk
pub effect fn reject<
  'loan,
  'request: 'loan,
  'connection: 'request,
  'transport: 'connection,
  'value,
  P,
>(
  request: &'loan mut Request<'request, 'connection, 'transport, P>,
  head: &ValueResponseHead<'value>,
  deadline: Option<Instant>,
) -> ()
! ServerError | OutOfMemoryError
? &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Sends a final body-free response without waiting for unread request content.

::Anchor{id="withUpgrade"}

## `withUpgrade`

```silk
pub effect fn withUpgrade<
  'loan,
  'request: 'loan,
  'connection: 'request,
  'transport: 'connection,
  'value: 'loan,
  'callback,
  A,
  E,
  ?CallbackRequirements,
  P,
>(
  request: &'loan mut Request<'request, 'connection, 'transport, P>,
  selectedProtocol: string,
  response: &ValueResponseHead<'value>,
  deadline: Option<Instant>,
  callback: for<'call, 'transportView: 'call> once fn<'callback>(
    &'call mut BufferedDuplex<'transportView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A
! E | ServerError | OutOfMemoryError
? CallbackRequirements | &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Completes a validated HTTP Upgrade response and lends the exact buffered suffix.

::Anchor{id="withTunnel"}

## `withTunnel`

```silk
pub effect fn withTunnel<
  'loan,
  'request: 'loan,
  'connection: 'request,
  'transport: 'connection,
  'value: 'loan,
  'callback,
  A,
  E,
  ?CallbackRequirements,
  P,
>(
  request: &'loan mut Request<'request, 'connection, 'transport, P>,
  response: &ValueResponseHead<'value>,
  deadline: Option<Instant>,
  callback: for<'call, 'transportView: 'call> once fn<'callback>(
    &'call mut BufferedDuplex<'transportView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A
! E | ServerError | OutOfMemoryError
? CallbackRequirements | &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Completes a successful CONNECT response and lends the exact buffered tunnel suffix.

::Anchor{id="ResponseWriter.impl"}

## Implementation `ResponseWriter<'writer, 'request, 'connection, 'transport, P>`

```silk
impl<'writer, 'request, 'connection, 'transport, P>
  ResponseWriter<'writer, 'request, 'connection, 'transport, P>
```

::Anchor{id="ResponseWriter.impl.writeSome"}

### Method `writeSome`

```silk
pub effect fn writeSome(
    self: &mut Self,
    input: &[u8],
    deadline: Option<Instant>,
  ) -> WriteProgress
  ! ServerError
  ? &mut MonotonicClock
  where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Accepts one payload prefix into the shared framing and bounded output owners.

::Anchor{id="ResponseWriter.impl.writeAll"}

### Method `writeAll`

```silk
pub effect fn writeAll(
    self: &mut Self,
    input: &[u8],
    deadline: Option<Instant>,
  ) -> WriteProgress
  ! ServerError
  ? &mut MonotonicClock
  where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Accepts the complete caller payload in order.

::Anchor{id="ResponseWriter.impl.finish"}

### Method `finish`

```silk
pub effect fn finish<'value>(
    self: &mut Self,
    trailers: &Headers<'value>,
    deadline: Option<Instant>,
  ) -> ()
  ! ServerError
  ? &mut MonotonicClock
  where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Snapshots trailers, completes response framing, and flushes the response exactly once.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
