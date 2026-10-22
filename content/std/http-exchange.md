Scoped incremental HTTP/1 client exchanges over an explicit transport loan.

## Details

A connection admits one exchange at a time. Complete request and response framing are required
before reuse. Cleanup closes terminally without a hidden flush, body drain, retry, or replay.

Import as `Exchange` with `import silk.http_exchange { Exchange }`.

Public declarations: 44.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The exclusive connection state.

::Anchor{id="ConnectionPhase.Ready"}

### `Ready`

```silk
Ready
```

Admits one new exchange.

::Anchor{id="ConnectionPhase.Active"}

### `Active`

```silk
Active
```

Has an active exchange.

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

Cannot perform another HTTP exchange.

::Anchor{id="ExchangePhase"}

## `ExchangePhase`

```silk
pub enum ExchangePhase
```

The next permitted exchange operation.

::Anchor{id="ExchangePhase.Prepared"}

### `Prepared`

```silk
Prepared
```

Permits sending the validated request head.

::Anchor{id="ExchangePhase.AwaitContinue"}

### `AwaitContinue`

```silk
AwaitContinue
```

Requires response heads until 100 or an early final response.

::Anchor{id="ExchangePhase.Upload"}

### `Upload`

```silk
Upload
```

Permits request body writes and request finish.

::Anchor{id="ExchangePhase.AwaitResponse"}

### `AwaitResponse`

```silk
AwaitResponse
```

Permits receiving response heads.

::Anchor{id="ExchangePhase.Response"}

### `Response`

```silk
Response
```

Permits response body reads.

::Anchor{id="ExchangePhase.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

Permits an exclusive tunnel handoff.

::Anchor{id="ExchangePhase.Finished"}

### `Finished`

```silk
Finished
```

Records complete message boundaries.

::Anchor{id="ExchangePhase.Aborted"}

### `Aborted`

```silk
Aborted
```

Forbids further exchange operations.

::Anchor{id="ContinuePolicy"}

## `ContinuePolicy`

```silk
pub union ContinuePolicy
```

The explicit upload admission policy.

::Anchor{id="ContinuePolicy.Disabled"}

### `Disabled`

```silk
Disabled
```

Completes upload before receiving response heads.

::Anchor{id="ContinuePolicy.Require100"}

### `Require100`

```silk
Require100
```

Waits for 100 under a finite absolute deadline, without fallback.

::Anchor{id="ContinuePolicy.Require100.deadline"}

#### Field `deadline`

```silk
pub deadline: Instant
```

The absolute monotonic continue deadline, clamped to the overall deadline.

::Anchor{id="RequestOptions"}

## `RequestOptions`

```silk
pub struct RequestOptions
```

Deadlines for one exchange. They are never restarted between operations.

::Anchor{id="RequestOptions.deadline"}

### Field `deadline`

```silk
pub deadline: Option<Instant>
```

The overall absolute monotonic deadline; None is unbounded.

::Anchor{id="RequestOptions.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

The selected expectation policy, matching the prepared request.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Finite connection and message storage and wire budgets.

::Anchor{id="Limits.head"}

### Field `head`

```silk
pub head: HeadLimits
```

Parser limits for request and response heads.

::Anchor{id="Limits.requestBody"}

### Field `requestBody`

```silk
pub requestBody: BodyLimits
```

Independent request body limits.

::Anchor{id="Limits.responseBody"}

### Field `responseBody`

```silk
pub responseBody: BodyLimits
```

Independent response body limits.

::Anchor{id="Limits.readCapacity"}

### Field `readCapacity`

```silk
pub readCapacity: usize
```

Positive input buffer capacity.

::Anchor{id="Limits.writeCapacity"}

### Field `writeCapacity`

```silk
pub writeCapacity: usize
```

Positive framing output scratch capacity.

::Anchor{id="Limits.maxRequests"}

### Field `maxRequests`

```silk
pub maxRequests: usize
```

Maximum requests admitted on this connection.

::Anchor{id="Limits.maxInformationalResponses"}

### Field `maxInformationalResponses`

```silk
pub maxInformationalResponses: usize
```

Maximum informational heads per exchange; use 16 for the standard default.

::Anchor{id="Limits.maxInformationalWireBytes"}

### Field `maxInformationalWireBytes`

```silk
pub maxInformationalWireBytes: u64
```

Maximum aggregate informational head wire bytes; use 65536 for the standard default.

::Anchor{id="Limits.maxDiscardWireBytes"}

### Field `maxDiscardWireBytes`

```silk
pub maxDiscardWireBytes: u64
```

Maximum wire bytes consumed by one explicit discard or drain operation; at most 1048576.

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

Returns finite standard limits, including 16 informational heads and 65536 informational wire bytes.

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

Returns an unbounded overall request deadline with upload-before-response behavior.

::Anchor{id="ExchangeError"}

## `ExchangeError`

```silk
pub union ExchangeError
```

A typed protocol, stage, budget, or transport failure.

::Anchor{id="ExchangeError.Content"}

### `Content`

```silk
Content
```

Preserves a content decoding failure and its exact output coordinates.

::Anchor{id="ExchangeError.Content.error"}

#### Field `error`

```silk
pub error: ContentError<'static>
```

The owned runtime content, checksum, or framing failure.

::Anchor{id="ExchangeError.Head"}

### `Head`

```silk
Head
```

Preserves a head parser failure.

::Anchor{id="ExchangeError.Head.error"}

#### Field `error`

```silk
pub error: ParseError
```

The underlying head failure.

::Anchor{id="ExchangeError.Body"}

### `Body`

```silk
Body
```

Preserves framing failure and exact committed coordinates.

::Anchor{id="ExchangeError.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The underlying body failure.

::Anchor{id="ExchangeError.Transport"}

### `Transport`

```silk
Transport
```

Preserves plain or secured transport failure.

::Anchor{id="ExchangeError.Transport.error"}

#### Field `error`

```silk
pub error: TransportError
```

The underlying transport failure.

::Anchor{id="ExchangeError.Output"}

### `Output`

```silk
Output
```

Records framed output accepted before the transport failed.

::Anchor{id="ExchangeError.Output.error"}

#### Field `error`

```silk
pub error: TransportError
```

The underlying transport failure.

::Anchor{id="ExchangeError.Output.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

Payload and wire progress for the failed call.

::Anchor{id="ExchangeError.OutputTimeout"}

### `OutputTimeout`

```silk
OutputTimeout
```

Records a client deadline expiring after payload or wire progress.

::Anchor{id="ExchangeError.OutputTimeout.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The exact accepted payload and committed wire coordinates.

::Anchor{id="ExchangeError.OutputAllocation"}

### `OutputAllocation`

```silk
OutputAllocation
```

Records payload accepted by framing before a transport allocation failed.

::Anchor{id="ExchangeError.OutputAllocation.error"}

#### Field `error`

```silk
pub error: OutOfMemoryError
```

The allocator failure from the transport.

::Anchor{id="ExchangeError.OutputAllocation.progress"}

#### Field `progress`

```silk
pub progress: WriteProgress
```

The exact payload and committed wire coordinates.

::Anchor{id="ExchangeError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

Rejects an operation before I/O when its stage is invalid.

::Anchor{id="ExchangeError.InvalidRequest"}

### `InvalidRequest`

```silk
InvalidRequest
```

Rejects incompatible body framing or expectation policy before I/O.

::Anchor{id="ExchangeError.InvalidLimits"}

### `InvalidLimits`

```silk
InvalidLimits
```

Rejects zero buffer capacities before allocation.

::Anchor{id="ExchangeError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

Reports a finite informational or connection budget exhaustion.

::Anchor{id="ExchangeError.TruncatedHead"}

### `TruncatedHead`

```silk
TruncatedHead
```

Reports response input ending before a complete head.

::Anchor{id="ExchangeError.UnsupportedUpgrade"}

### `UnsupportedUpgrade`

```silk
UnsupportedUpgrade
```

Rejects status 101 without protocol handoff.

::Anchor{id="ExchangeError.ContinueTimeout"}

### `ContinueTimeout`

```silk
ContinueTimeout
```

Reports expiry while waiting for permission to upload.

::Anchor{id="ExchangeError.Timeout"}

### `Timeout`

```silk
Timeout
```

Reports the overall absolute deadline expiring.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits(limits: &Limits) -> Result<(), ExchangeError>
```

Validates connection limits without allocation, transport contact, or parser construction.

### Details

Read and write capacities must be positive. The discard limit must not exceed 1,048,576 wire
bytes. Head parser storage must have representable metadata and fit its owned-storage limit.
Head storage failures retain the exact parser error in `ExchangeError.Head`.

::Anchor{id="DiscardOutcome"}

## `DiscardOutcome`

```silk
pub enum DiscardOutcome
```

The result of a bounded response-framing discard.

::Anchor{id="DiscardOutcome.Completed"}

### `Completed`

```silk
Completed
```

The complete response boundary was reached within the limit.

::Anchor{id="DiscardOutcome.CapReached"}

### `CapReached`

```silk
CapReached
```

The next response-framing byte would exceed the limit.

::Anchor{id="ReuseEligibility"}

## `ReuseEligibility`

```silk
pub union ReuseEligibility
```

Whether one owned connection can return to an idle pool.

::Anchor{id="ReuseEligibility.Eligible"}

### `Eligible`

```silk
Eligible
```

The connection has complete persistent boundaries and can return to an idle pool.

::Anchor{id="ReuseEligibility.NotReady"}

### `NotReady`

```silk
NotReady
```

The connection is not ready after one complete reusable exchange.

::Anchor{id="ReuseEligibility.NotOwned"}

### `NotOwned`

```silk
NotOwned
```

The connection no longer owns armed physical close authority.

::Anchor{id="ReuseEligibility.RequestLimit"}

### `RequestLimit`

```silk
RequestLimit
```

The connection has reached its finite request-count limit.

::Anchor{id="ReuseEligibility.RetainedInput"}

### `RetainedInput`

```silk
RetainedInput
```

The connection retains bytes after the complete response boundary.

::Anchor{id="ReuseEligibility.RetainedInput.bytes"}

#### Field `bytes`

```silk
pub bytes: usize
```

The exact retained byte count.

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

Exact accepted payload and transport wire prefixes for one write call.

::Anchor{id="WriteProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Payload prefix accepted by the framing encoder.

::Anchor{id="WriteProgress.written"}

### Field `written`

```silk
pub written: usize
```

Framed prefix committed to the transport in this call.

::Anchor{id="WriteProgress.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

Cumulative encoded payload bytes.

::Anchor{id="WriteProgress.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

Cumulative encoded wire bytes.

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

An affine owned connection retaining the transport, bounded storage, and next input suffix.

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

Returns the current logical connection phase.

::Anchor{id="Connection.impl.unread"}

### Method `unread`

```silk
pub fn unread(self: &Self) -> usize
```

Returns the exact retained input suffix length.

::Anchor{id="reuseEligibility"}

## `reuseEligibility`

```silk
pub fn reuseEligibility<P>(connection: &Connection<P>) -> ReuseEligibility
```

Returns whether an owned connection can return to an idle pool without resetting client state.

### Details

`Eligible` requires Ready phase, armed physical ownership, request-budget headroom, and no
retained input. Other results identify the first failed condition without exposing counters.

::Anchor{id="TransportContext"}

## `TransportContext`

```silk
pub struct TransportContext<'view, P>
```

Shared inspection of retained route context without mutable transport authority.

::Anchor{id="TransportContext.transport"}

### Field `transport`

```silk
pub transport: &'view P
```

The immutable exact provider retained by the owned connection.

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

Borrows the provider for immutable route and connection-context inspection.

::Anchor{id="Exchange"}

## `Exchange`

```silk
pub struct Exchange<'exchange, P>
```

One exclusive callback-scoped request and response lifecycle.

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

Returns the next permitted stage.

::Anchor{id="Exchange.impl.head"}

### Method `head`

```silk
pub effect fn head<'head>(self: &'head Self) -> ResponseHead<'head> ! ExchangeError
```

Borrows the most recently received head until the exchange is mutably used again.
Use `ResponseHead.copy` with explicit value limits to retain an owned copy.

::Anchor{id="ConnectionHandler"}

## `ConnectionHandler`

```silk
pub interface ConnectionHandler<P, A, E, ?R>
```

A higher-ranked callback that cannot return its connection loan.

::Anchor{id="ConnectionHandler.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<'call>(handler: Self, connection: &'call mut Connection<P>) -> A ! E ? R where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport
```

Runs inside an exclusive connection scope and preserves caller channels.

::Anchor{id="RouteProtocol"}

## `RouteProtocol`

```silk
pub enum RouteProtocol
```

The HTTP version and TLS application-protocol policy for one routed scope.

::Anchor{id="RouteProtocol.Http10"}

### `Http10`

```silk
Http10
```

Uses HTTP/1.0 and sends no TLS application-protocol extension.

::Anchor{id="RouteProtocol.OptionalHttp11"}

### `OptionalHttp11`

```silk
OptionalHttp11
```

Uses HTTP/1.1 and permits the TLS peer to omit application-protocol selection.

::Anchor{id="RouteProtocol.RequiredHttp11"}

### `RequiredHttp11`

```silk
RequiredHttp11
```

Uses HTTP/1.1 and requires the TLS peer to select `http/1.1`.

::Anchor{id="RouteSettings"}

## `RouteSettings`

```silk
pub struct RouteSettings
```

Complete finite settings for one target-neutral routed HTTP scope.

::Anchor{id="RouteSettings.http"}

### Field `http`

```silk
pub http: Limits
```

Connection, parser, buffering, and message limits.

::Anchor{id="RouteSettings.request"}

### Field `request`

```silk
pub request: HeaderLimits
```

Request-head value limits used for the generated CONNECT request.

::Anchor{id="RouteSettings.maxRequestHeadBytes"}

### Field `maxRequestHeadBytes`

```silk
pub maxRequestHeadBytes: usize
```

Maximum owned bytes in the generated CONNECT head.

::Anchor{id="RouteSettings.maxProxyCredentialBytes"}

### Field `maxProxyCredentialBytes`

```silk
pub maxProxyCredentialBytes: usize
```

Maximum owned proxy-credential bytes in the generated CONNECT head.

::Anchor{id="RouteSettings.protocol"}

### Field `protocol`

```silk
pub protocol: RouteProtocol
```

HTTP version and TLS application-protocol policy.

::Anchor{id="RouteSettings.tls"}

### Field `tls`

```silk
pub tls: ClientLimits
```

TLS client protocol limits.

::Anchor{id="RouteSettings.handshakeDurationNanoseconds"}

### Field `handshakeDurationNanoseconds`

```silk
pub handshakeDurationNanoseconds: u64
```

Finite TLS handshake duration in nanoseconds.

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

Lexical consumer of one plain provider supplied to a target-neutral route acquisition scope.

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

Consumes the exact provider selected for the requested physical peer.

::Anchor{id="RouteClient"}

## `RouteClient`

```silk
pub interface RouteClient<P, A, E, AcquisitionError, ?AcquisitionRequirements, ?R>
```

A target-neutral owner that acquires one exact physical peer for a routed scope.

::Anchor{id="RouteClient.settings"}

### Operation `settings`

```silk
fn settings(client: &Self) -> RouteSettings
```

Returns all HTTP and TLS settings without applying hidden defaults.

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

Acquires one owned plain provider for `peer` under the unchanged absolute `deadline`.

::Anchor{id="RouteTransport"}

## `RouteTransport`

```silk
pub struct RouteTransport<'transport, 'provider: 'transport, 'tunnel: 'provider, P>
```

The uniform final HTTP transport lent to a routed callback.

::Anchor{id="RouteHandler"}

## `RouteHandler`

```silk
pub interface RouteHandler<'configuration, P, A, E, ?R>
```

A higher-ranked callback for one selected route and its final HTTP connection.

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

Runs after route acquisition and required origin authentication complete.

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

Acquires and lends one route-selected HTTP connection under one unchanged absolute deadline.

### Details

Trust presence is validated before acquisition. Forward uses the plain proxy connection. A
Tunnel sends CONNECT before it authenticates the original origin and lends the secured channel.

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

Owns the transport and bounded parser state so a completed connection can be retained for later exchanges.
Allocation failure terminally closes the supplied transport without a hidden flush.

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

Lends an owned connection for a callback, then closes it on every exit.

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

Lends an explicit transport through one terminal connection scope while its physical owner stays outside.

::Anchor{id="close"}

## `close`

```silk
pub effect fn close<P>(connection: &mut Connection<P>) -> ()
! ExchangeError
where &mut P provides &HttpTransport from &mut HttpTransport
```

Closes an owned connection terminally without flushing or draining; repeated closure is local.

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

Lends one prepared exchange. Incomplete or failed callbacks permanently remove reuse authority.

::Anchor{id="send"}

## `send`

```silk
pub effect fn send<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends the prepared head once; Require100 also flushes before waiting for response heads.

::Anchor{id="writeSome"}

## `writeSome`

```silk
pub effect fn writeSome<'exchange, P>(exchange: &mut Exchange<'exchange, P>, input: &[u8]) -> WriteProgress
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Accepts one payload prefix and preserves exact payload and transport progress on failure.

::Anchor{id="finishRequest"}

## `finishRequest`

```silk
pub effect fn finishRequest<'exchange, P>(exchange: &mut Exchange<'exchange, P>, trailers: &Headers) -> ()
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Completes bounded request trailers and flushes before response reads are permitted.

::Anchor{id="receive"}

## `receive`

```silk
pub effect fn receive<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> u16
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Receives one bounded head; informational and final error statuses remain ordinary response values.

::Anchor{id="receiveFinal"}

## `receiveFinal`

```silk
pub effect fn receiveFinal<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> u16
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Receives bounded informational heads until the shared parser reaches one final response.

### Details

Parser, head, informational-budget, 101-upgrade, transport, and deadline failures remain the
original `ExchangeError`. This operation does not copy response metadata or consume a body.

::Anchor{id="readSome"}

## `readSome`

```silk
pub effect fn readSome<'exchange, P>(exchange: &mut Exchange<'exchange, P>, output: &mut [u8]) -> usize
! ExchangeError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads one framed payload prefix without consuming the next message suffix.

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

Discards response framing up to one aggregate wire-byte limit and reports whether it completed.

### When to use

Use this operation when a caller can continue after the discard reaches its cap.

### Details

The operation uses the smaller caller limit and `Limits.maxDiscardWireBytes`. The limit
includes payload and framing bytes. Its explicit cleanup deadline is clamped to the exchange's
unchanged operation deadline. `Completed` permits a later [`finishResponse`](#finishResponse) call. `CapReached`
leaves the exchange incomplete and removes reuse authority.

### Gotchas

Malformed framing and read, deadline, allocation, or transport failures remain typed failures.

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

Drains and finishes the selected response under one finite aggregate wire-byte limit.

### When to use

Use this operation inside the live exchange when a response must complete before connection
reuse. The standard client limit is 65536 bytes, and the maximum admitted limit is 1048576.

### Details

The operation uses the smaller caller limit and `Limits.maxDiscardWireBytes`. The limit counts
payload, framing, and trailers. The finite deadline is clamped to the request deadline. If a
content decoder was selected, the operation validates it before it calls [`finishResponse`](#finishResponse).

### Gotchas

`CapReached` leaves the exchange incomplete. Timeout, malformed framing, read, allocation,
transport, and content-decoder failures remain their original typed failures.

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

Discards response framing under the smaller caller and client wire budget, without consuming a subsequent message.
A deadline, limit, framing, or transport failure permanently removes reuse authority.

::Anchor{id="trailers"}

## `trailers`

```silk
pub effect fn trailers<'head, 'exchange, P>(exchange: &'head Exchange<'exchange, P>) -> Option<
  Trailers<'head>,
> ! ExchangeError
```

Returns completed chunk trailers borrowed exclusively from the active exchange.

::Anchor{id="finishResponse"}

## `finishResponse`

```silk
pub effect fn finishResponse<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
! ExchangeError
```

Completes the response only after framing proves its boundary; never drains unread bytes.

::Anchor{id="abort"}

## `abort`

```silk
pub fn abort<'exchange, P>(exchange: &mut Exchange<'exchange, P>) -> ()
```

Removes reuse authority immediately without transport output or a hidden drain.

::Anchor{id="Tunnel"}

## `Tunnel`

```silk
pub struct Tunnel<'tunnel, P>
```

An exclusive non-HTTP channel that reads the buffered response suffix first.

::Anchor{id="TransferredTunnel"}

## `TransferredTunnel`

```silk
pub struct TransferredTunnel<'tunnel, P>
```

One transferred tunnel that owns the connection's byte transport and retained input suffix.

### Details

Reads use the retained suffix before the provider. All deadlines are clamped to the exchange
deadline. Complete close is terminal and attempts the concrete provider close at most one time.

::Anchor{id="withTunnel"}

## `withTunnel`

```silk
pub effect fn withTunnel<'tunnel, 'exchange: 'tunnel, 'callback, P, A, E, ?R>(
  exchange: &'tunnel mut Exchange<'exchange, P>,
  callback: for<'call, 'tunnelView: 'call> once fn<'callback>(&'call mut Tunnel<'tunnelView, P>) -> once Effect<'call & 'callback; A ! E ? R>,
) -> A ! E | ExchangeError ? R
```

Hands successful CONNECT to one scoped tunnel callback and permanently consumes HTTP reuse authority.

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

Transfers the exact tunnel provider and retained input suffix to one scoped byte duplex.

#### Details

This operation allocates no memory. It constructs the complete duplex before the HTTP owner
transfers its physical close authority. The callback owns that authority until cleanup.
Cleanup closes the duplex after success, typed failure, or structured cancellation.

#### Gotchas

After scoped finalization, a repeated transfer returns `InvalidState` and leaves the existing
Closed authority unchanged.

::Anchor{id="Tunnel.impl.readSome"}

### Method `readSome`

```silk
pub effect fn readSome(self: &mut Self, output: &mut [u8], requestedDeadline: Option<Instant>) -> ReadTransfer
  ! ExchangeError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads the retained tunnel suffix before asking the underlying transport for more input.

::Anchor{id="Tunnel.impl.writeSome"}

### Method `writeSome`

```silk
pub effect fn writeSome(self: &mut Self, input: &[u8], requestedDeadline: Option<Instant>) -> usize
  ! ExchangeError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Writes one tunnel prefix under the caller's absolute deadline.

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

Selects one content pipeline from this exchange's current head before a nonempty raw read or a discard.

### Details

Planning errors borrow the head and must be handled before the exchange is used again.
The returned copy records the applied representation policy without exposing the affine decoder.

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

Reads content-decoded bytes through the same rich transport and absolute deadline as the exchange.
Returned bytes remain provisional until successful content and framing completion.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
