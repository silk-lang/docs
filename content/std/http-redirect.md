Bounded, replay-aware HTTP redirect policy and scoped attempt orchestration.

## When to use

Use [`Policy`](#Policy) to admit finite redirect authority before an HTTP attempt. Select
[`withEmptyResponse`](#withEmptyResponse), [`withBytesResponse`](#withBytesResponse), [`withOneShotResponse`](#withOneShotResponse), or
[`withReplayResponse`](#withReplayResponse) according to the request body's replay authority.

## Details

This actor owns policy names, bounded redirect history, independently owned next-attempt state,
replay-aware body writing, intermediate-response cleanup, and final callback dispatch. Routed
acquisition remains behind [`AttemptClient`](#AttemptClient); final responses are lent only to a higher-ranked
[`ResponseHandler`](#ResponseHandler).

Import as `Redirect` with `import silk.http_redirect as Redirect`.

Public declarations: 48.

::Anchor{id="Mode"}

## `Mode`

```silk
pub enum Mode
```

Whether a response is returned unchanged or eligible redirect statuses are followed.

::Anchor{id="Mode.Manual"}

### `Manual`

```silk
Manual
```

Returns the first response without inspecting `Location`.

::Anchor{id="Mode.Follow"}

### `Follow`

```silk
Follow
```

Applies the admitted redirect policy.

::Anchor{id="CrossOriginPolicy"}

## `CrossOriginPolicy`

```silk
pub enum CrossOriginPolicy
```

Whether a cross-origin redirect is admitted.

::Anchor{id="CrossOriginPolicy.Deny"}

### `Deny`

```silk
Deny
```

Rejects every normalized-origin change.

::Anchor{id="CrossOriginPolicy.Allow"}

### `Allow`

```silk
Allow
```

Admits an origin change after deny-last header sanitization.

::Anchor{id="DowngradePolicy"}

## `DowngradePolicy`

```silk
pub enum DowngradePolicy
```

Whether an HTTPS-to-HTTP redirect is admitted after cross-origin admission.

::Anchor{id="DowngradePolicy.Deny"}

### `Deny`

```silk
Deny
```

Rejects a secure-to-plaintext transition.

::Anchor{id="DowngradePolicy.Allow"}

### `Allow`

```silk
Allow
```

Admits a secure-to-plaintext transition after cross-origin sanitization.

::Anchor{id="Post301302Policy"}

## `Post301302Policy`

```silk
pub enum Post301302Policy
```

The special method rule for exact uppercase POST on status 301 or 302.

::Anchor{id="Post301302Policy.Preserve"}

### `Preserve`

```silk
Preserve
```

Preserves POST and its body.

::Anchor{id="Post301302Policy.ToGet"}

### `ToGet`

```silk
ToGet
```

Changes exact uppercase POST to GET and drops its body.

::Anchor{id="PreviousResponsePolicy"}

## `PreviousResponsePolicy`

```silk
pub union PreviousResponsePolicy
```

How an intermediate response is handled before its attempt scope is released.

::Anchor{id="PreviousResponsePolicy.Close"}

### `Close`

```silk
Close
```

Performs no drain and lets the attempt owner close an incomplete response.

::Anchor{id="PreviousResponsePolicy.Drain"}

### `Drain`

```silk
Drain
```

Attempts a bounded discard under a finite absolute deadline.

::Anchor{id="PreviousResponsePolicy.Drain.maxDiscardWireBytes"}

#### Field `maxDiscardWireBytes`

```silk
pub maxDiscardWireBytes: u64
```

Maximum response wire bytes that may be discarded.

::Anchor{id="PreviousResponsePolicy.Drain.deadline"}

#### Field `deadline`

```silk
pub deadline: Instant
```

Absolute discard deadline, later clamped to the operation deadline.

::Anchor{id="NameListLimits"}

## `NameListLimits`

```silk
pub struct NameListLimits
```

Finite admission limits for one owned case-insensitive field-name list.

::Anchor{id="NameListLimits.maxNames"}

### Field `maxNames`

```silk
pub maxNames: usize
```

Maximum number of names, including duplicates.

::Anchor{id="NameListLimits.maxNameBytes"}

### Field `maxNameBytes`

```silk
pub maxNameBytes: usize
```

Maximum bytes in any one name.

::Anchor{id="NameListLimits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

Maximum aggregate name payload plus owned index storage.

::Anchor{id="NameListLimits.impl.Copy"}

## Implementation `Copy for NameListLimits`

```silk
impl Copy for NameListLimits
```

::Anchor{id="NameList"}

## `NameList`

```silk
pub struct NameList
```

A bounded owned list of validated HTTP field names.

::Anchor{id="HistoryLimits"}

## `HistoryLimits`

```silk
pub struct HistoryLimits
```

Finite URI, hop, and history capacities for one redirect operation.

::Anchor{id="HistoryLimits.maxHops"}

### Field `maxHops`

```silk
pub maxHops: usize
```

Maximum followed redirects.

::Anchor{id="HistoryLimits.maxUriBytes"}

### Field `maxUriBytes`

```silk
pub maxUriBytes: usize
```

Maximum bytes in each raw or resolved URI serialization.

::Anchor{id="HistoryLimits.maxHistoryBytes"}

### Field `maxHistoryBytes`

```silk
pub maxHistoryBytes: usize
```

Maximum serialized key bytes in the preallocated history arena.

::Anchor{id="HistoryLimits.impl.Copy"}

## Implementation `Copy for HistoryLimits`

```silk
impl Copy for HistoryLimits
```

::Anchor{id="Policy"}

## `Policy`

```silk
pub struct Policy
```

An immutable admitted redirect policy with owned field-name lists.

::Anchor{id="RedirectComponent"}

## `RedirectComponent`

```silk
pub enum RedirectComponent
```

The bounded value whose admission or transition failed.

::Anchor{id="RedirectComponent.Policy"}

### `Policy`

```silk
Policy
```

The admitted policy and its owned lists.

::Anchor{id="RedirectComponent.Location"}

### `Location`

```silk
Location
```

A response `Location` field.

::Anchor{id="RedirectComponent.Uri"}

### `Uri`

```silk
Uri
```

The resolved next URI.

::Anchor{id="RedirectComponent.Origin"}

### `Origin`

```silk
Origin
```

The normalized destination origin.

::Anchor{id="RedirectComponent.History"}

### `History`

```silk
History
```

The method-aware redirect history.

::Anchor{id="RedirectComponent.Body"}

### `Body`

```silk
Body
```

The current body replay authority.

::Anchor{id="RedirectLimit"}

## `RedirectLimit`

```silk
pub enum RedirectLimit
```

The finite redirect resource that exceeded its bound.

::Anchor{id="RedirectLimit.PolicyNames"}

### `PolicyNames`

```silk
PolicyNames
```

Owned policy-name count.

::Anchor{id="RedirectLimit.PolicyNameBytes"}

### `PolicyNameBytes`

```silk
PolicyNameBytes
```

One policy-name byte count.

::Anchor{id="RedirectLimit.PolicyOwnedBytes"}

### `PolicyOwnedBytes`

```silk
PolicyOwnedBytes
```

Aggregate policy-name payload and index storage.

::Anchor{id="RedirectLimit.UriBytes"}

### `UriBytes`

```silk
UriBytes
```

Raw or resolved URI bytes.

::Anchor{id="RedirectLimit.HistoryEntries"}

### `HistoryEntries`

```silk
HistoryEntries
```

Method-aware history entries.

::Anchor{id="RedirectLimit.HistoryBytes"}

### `HistoryBytes`

```silk
HistoryBytes
```

Aggregate serialized history-key bytes.

::Anchor{id="RedirectReason"}

## `RedirectReason`

```silk
pub union RedirectReason
```

A redirect-specific failure reason without response or credential borrows.

::Anchor{id="RedirectReason.InvalidPolicy"}

### `InvalidPolicy`

```silk
InvalidPolicy
```

Policy arithmetic or values cannot be admitted.

::Anchor{id="RedirectReason.NameListOverlap"}

### `NameListOverlap`

```silk
NameListOverlap
```

A name appears in both the safe-custom and sensitive lists.

::Anchor{id="RedirectReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Required finite storage does not fit in `usize`.

::Anchor{id="RedirectReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A finite resource exceeds its inclusive bound.

::Anchor{id="RedirectReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: RedirectLimit
```

The resource whose limit was exceeded.

::Anchor{id="RedirectReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The inclusive admitted maximum.

::Anchor{id="RedirectReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The rejected resource value.

::Anchor{id="RedirectReason.LocationMissing"}

### `LocationMissing`

```silk
LocationMissing
```

A selected redirect has no `Location` field.

::Anchor{id="RedirectReason.LocationAmbiguous"}

### `LocationAmbiguous`

```silk
LocationAmbiguous
```

A selected redirect has more than one `Location` field.

::Anchor{id="RedirectReason.LocationInvalid"}

### `LocationInvalid`

```silk
LocationInvalid
```

A `Location` field is not UTF-8 or is not a valid URI reference.

::Anchor{id="RedirectReason.RedirectSchemeDenied"}

### `RedirectSchemeDenied`

```silk
RedirectSchemeDenied
```

The resolved URI is not an admitted HTTP or HTTPS origin.

::Anchor{id="RedirectReason.RedirectOriginDenied"}

### `RedirectOriginDenied`

```silk
RedirectOriginDenied
```

Policy rejects a normalized-origin change.

::Anchor{id="RedirectReason.DowngradeDenied"}

### `DowngradeDenied`

```silk
DowngradeDenied
```

Policy rejects an HTTPS-to-HTTP transition.

::Anchor{id="RedirectReason.HopLimit"}

### `HopLimit`

```silk
HopLimit
```

A selected redirect has no remaining hop capacity.

::Anchor{id="RedirectReason.RedirectLoop"}

### `RedirectLoop`

```silk
RedirectLoop
```

A transformed method and request target repeat an earlier history key.

::Anchor{id="RedirectReason.ReplayUnavailable"}

### `ReplayUnavailable`

```silk
ReplayUnavailable
```

A retained body has no replay authority.

::Anchor{id="RedirectReason.ReplayContractMismatch"}

### `ReplayContractMismatch`

```silk
ReplayContractMismatch
```

A producer's framing or observed length violates its declared contract.

::Anchor{id="RedirectReason.impl.Copy"}

## Implementation `Copy for RedirectReason`

```silk
impl Copy for RedirectReason
```

::Anchor{id="RedirectContext"}

## `RedirectContext`

```silk
pub struct RedirectContext
```

Independently owned, bounded context attached at the redirect boundary.

::Anchor{id="RedirectContext.hop"}

### Field `hop`

```silk
pub hop: usize
```

Zero-based current attempt number.

::Anchor{id="RedirectContext.status"}

### Field `status`

```silk
pub status: Option<Status>
```

Response status when one is relevant.

::Anchor{id="RedirectContext.currentUri"}

### Field `currentUri`

```silk
pub currentUri: Option<OwnedUri>
```

Independently owned current URI when retained by the failure boundary.

::Anchor{id="RedirectContext.nextUri"}

### Field `nextUri`

```silk
pub nextUri: Option<OwnedUri>
```

Independently owned next URI when retained by the failure boundary.

::Anchor{id="RedirectError"}

## `RedirectError`

```silk
pub struct RedirectError
```

A redirect-specific failure with no response, credential, body, or proxy-token borrow.

::Anchor{id="RedirectError.component"}

### Field `component`

```silk
pub component: RedirectComponent
```

The bounded value associated with the failure.

::Anchor{id="RedirectError.reason"}

### Field `reason`

```silk
pub reason: RedirectReason
```

The stable machine-readable failure reason.

::Anchor{id="RedirectError.context"}

### Field `context`

```silk
pub context: RedirectContext
```

Independently owned bounded transition context.

::Anchor{id="Request"}

## `Request`

```silk
pub struct Request<'uri, 'method, 'headers, 'policy>
```

A rebuildable semantic request, distinct from an owned serialized prepared request.

::Anchor{id="Request.uri-2"}

### Field `uri`

```silk
pub uri: Uri<'uri>
```

Caller-owned initial URI, including fragment metadata.

::Anchor{id="Request.method-2"}

### Field `method`

```silk
pub method: Method<'method>
```

Caller-owned initial method with exact spelling.

::Anchor{id="Request.headers-2"}

### Field `headers`

```silk
pub headers: Headers<'headers>
```

Caller-owned semantic fields, excluding generated framing and authority fields.

::Anchor{id="Request.headerPolicy"}

### Field `headerPolicy`

```silk
pub headerPolicy: HeaderPolicy<'policy>
```

Caller-owned generated-field and credential policy.

::Anchor{id="Request.version"}

### Field `version`

```silk
pub version: Version
```

HTTP version used for every rebuilt attempt.

::Anchor{id="Request.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

Upload expectation policy used for every rebuilt attempt.

::Anchor{id="Request.limits"}

### Field `limits`

```silk
pub limits: HeaderLimits
```

Shared request and owned-header value limits.

::Anchor{id="Request.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

Maximum bytes in each owned serialized request head.

::Anchor{id="Request.maxCredentialBytes"}

### Field `maxCredentialBytes`

```silk
pub maxCredentialBytes: usize
```

Maximum generated credential bytes in each request head.

::Anchor{id="AttemptRequest"}

## `AttemptRequest`

```silk
pub struct AttemptRequest<'policy>
```

Owned semantic state for rebuilding exactly one redirect attempt.

### Details

The attempt client borrows views from these owners only inside its higher-ranked handler call.
It must rebuild a fresh prepared request after route selection rather than retaining serialized
bytes from an earlier origin.

::Anchor{id="AttemptRequest.uri"}

### Field `uri`

```silk
pub uri: OwnedUri
```

Independently owned current URI, including fragment metadata outside the wire target.

::Anchor{id="AttemptRequest.method"}

### Field `method`

```silk
pub method: String
```

Independently owned exact method spelling.

::Anchor{id="AttemptRequest.headers"}

### Field `headers`

```silk
pub headers: OwnedHeaders
```

Independently owned ordered semantic fields before generated-field preparation.

::Anchor{id="AttemptRequest.headerPolicy"}

### Field `headerPolicy`

```silk
pub headerPolicy: HeaderPolicy<'policy>
```

Generated-field and origin-credential policy borrowing caller-owned bytes.

::Anchor{id="AttemptRequest.version"}

### Field `version`

```silk
pub version: Version
```

HTTP version selected for this attempt.

::Anchor{id="AttemptRequest.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

Upload expectation policy paired with the prepared request.

::Anchor{id="AttemptRequest.requestLimits"}

### Field `requestLimits`

```silk
pub requestLimits: HeaderLimits
```

Shared method, target, field, and owned-header bounds used during preparation.

::Anchor{id="AttemptRequest.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

Maximum bytes in the newly owned serialized request head.

::Anchor{id="AttemptRequest.maxCredentialBytes"}

### Field `maxCredentialBytes`

```silk
pub maxCredentialBytes: usize
```

Maximum generated origin or proxy credential bytes in the request head.

::Anchor{id="AttemptRequest.bodyMode"}

### Field `bodyMode`

```silk
pub bodyMode: BodyMode
```

Exact body delimiter that orchestration validates against its source before acquisition.

::Anchor{id="crossOriginHeaderPolicy"}

## `crossOriginHeaderPolicy`

```silk
pub fn crossOriginHeaderPolicy<'value>(policy: HeaderPolicy<'value>) -> HeaderPolicy<'value>
```

Returns generated-field policy for a cross-origin attempt without origin credentials.

### When to use

Use before request preparation after [`admitOrigin`](#admitOrigin) reports an origin change.

### Details

The result selects the next normalized origin for Host and removes generated Authorization.
It preserves User-Agent, Accept, Basic security, and HTTP/1.0 persistence controls.

::Anchor{id="BodyChunk"}

## `BodyChunk`

```silk
pub struct BodyChunk
```

The result of pulling one bounded producer chunk into caller storage.

::Anchor{id="BodyChunk.length"}

### Field `length`

```silk
pub length: usize
```

Number of initialized bytes written at the start of caller storage.

::Anchor{id="BodyChunk.end"}

### Field `end`

```silk
pub end: bool
```

Whether no later pull may produce bytes.

::Anchor{id="BodyChunk.impl.Copy"}

## Implementation `Copy for BodyChunk`

```silk
impl Copy for BodyChunk
```

::Anchor{id="BodyProducer"}

## `BodyProducer`

```silk
pub interface BodyProducer<E, ?R>
```

A scoped body source with explicit framing metadata and bounded pulls.

::Anchor{id="BodyProducer.mode"}

### Operation `mode`

```silk
fn mode(producer: &Self) -> BodyMode
```

Returns framing metadata before an attempt writes its request head.

::Anchor{id="BodyProducer.pull"}

### Operation `pull`

```silk
effect fn pull(producer: &mut Self, output: &mut [u8]) -> BodyChunk ! E ? R
```

Initializes at most `output.length` bytes and reports progress without retaining `output`.

::Anchor{id="ReplayFactory"}

## `ReplayFactory`

```silk
pub interface ReplayFactory<P, FactoryError, ?FactoryRequirements>
```

A reusable factory that lends one fresh scoped producer for each attempted request.

### Details

Redirect orchestration owns each acquired producer and brackets it through one complete
attempt. `release` is infallible and non-suspending, so cleanup cannot replace the attempt's
success or failure. Factory result and callback types remain outside this public contract.

::Anchor{id="ReplayFactory.acquire"}

### Operation `acquire`

```silk
effect fn acquire(factory: &mut Self) -> P ! FactoryError ? FactoryRequirements
```

Acquires one fresh owned producer for the next retained-body attempt.

::Anchor{id="ReplayFactory.release"}

### Operation `release`

```silk
fn release(factory: &mut Self, producer: &mut P) -> ()
```

Releases one acquired producer after success, failure, or structured cancellation.

::Anchor{id="AttemptBody"}

## `AttemptBody`

```silk
pub union AttemptBody<'bytes, 'oneShot, 'replay, OneShot, ReplayProducer>
```

One attempt's uniform producer authority after replay selection.

### Details

Empty and repeatable-byte attempts are implemented inside this actor. Producer variants lend
the already-selected OneShot or factory producer without erasing either channel family.

::Anchor{id="AttemptBody.Empty"}

### `Empty`

```silk
Empty
```

Completes one body-free attempt without consulting a producer.

::Anchor{id="AttemptBody.RepeatableBytes"}

### `RepeatableBytes`

```silk
RepeatableBytes
```

Reads one attempt from immutable caller bytes through a private cursor.

::Anchor{id="AttemptBody.OneShot-2"}

### `OneShot`

```silk
OneShot
```

Lends the affine producer consumed for this attempt.

::Anchor{id="AttemptBody.ReplayFactory"}

### `ReplayFactory`

```silk
ReplayFactory
```

Lends the fresh producer owned by the current replay-factory scope.

::Anchor{id="BodyWriteOutcome"}

## `BodyWriteOutcome`

```silk
pub union BodyWriteOutcome
```

Whether the shared writer completed upload or received a final response before pulling bytes.

::Anchor{id="BodyWriteOutcome.Completed"}

### `Completed`

```silk
Completed
```

Upload framing finished and one final response is ready for body handling.

::Anchor{id="BodyWriteOutcome.Completed.status"}

#### Field `status`

```silk
pub status: u16
```

Final response status.

::Anchor{id="BodyWriteOutcome.EarlyFinal"}

### `EarlyFinal`

```silk
EarlyFinal
```

Require100 received a final response before the first producer pull.

::Anchor{id="BodyWriteOutcome.EarlyFinal.status"}

#### Field `status`

```silk
pub status: u16
```

Final response status.

::Anchor{id="Attempt"}

## `Attempt`

```silk
pub service Attempt<'policy, P, A, E, ?R>
```

A higher-ranked routed-attempt callback provided lexically by redirect orchestration.

### Details

Acquisition clients invoke this service once after request preparation and scoped connection
acquisition. Naming the service in a requirement row preserves exact handler channels without
exposing redirect's concrete callback adapter.

::Anchor{id="Attempt.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<
    'call,
    'exchangeView: 'call,
    'transport: 'exchangeView,
    'provider: 'transport,
    'tunnel: 'provider,
  >(
    request: &'call AttemptRequest<'policy>,
    method: Method<'call>,
    exchange: &'call mut Exchange<'exchangeView, RouteTransport<'transport, 'provider, 'tunnel, P>>,
  ) -> A ! E ? R | &mut Attempt<'policy, P, A, E, R> where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &ByteDuplex from &mut ByteDuplex
```

Handles one live routed exchange inside its acquisition bracket.

::Anchor{id="AttemptClient"}

## `AttemptClient`

```silk
pub interface AttemptClient<
  'policy,
  P,
  A,
  HandlerError,
  AcquisitionError,
  ?AcquisitionRequirements,
  ?HandlerRequirements,
>
```

A routed HTTP acquisition boundary for one rebuilt redirect attempt.

### When to use

Implement this interface beside routed connection acquisition, then pass it to redirect
orchestration without exposing sockets, TLS state, proxy credentials, or pooled leases.

### Details

`withAttempt` consumes and retains `request` through its complete bracket. It derives one
validated method and the URI/header views from that owner, selects the current route, prepares a
new origin- or absolute-form request, acquires its physical peer under the unchanged absolute
deadline, and invokes exactly one `http_exchange.withExchange`. The same method view, a fresh
request borrow, and the resulting exchange are lent only through [`Attempt`](#Attempt), so redirect
transition and sanitization do not copy semantic state or reparse the method. Handler and source
errors remain direct. `AcquisitionError` directly carries preparation, route, acquisition, and
exchange-admission failures without wrapping either channel family.

### Gotchas

The implementation must release its transport after handler success, typed failure, defect, or
cancellation. It must not return the fresh request borrow, method view, transport loan, or
exchange loan.

::Anchor{id="AttemptClient.withAttempt"}

### Operation `withAttempt`

```silk
effect fn withAttempt(
    client: &mut Self,
    request: AttemptRequest<'policy>,
    deadline: Option<Instant>,
  ) -> A ! HandlerError | AcquisitionError ? HandlerRequirements | AcquisitionRequirements | &mut Attempt<'policy, P, A, HandlerError ? HandlerRequirements> where
    HandlerRequirements in Without<HandlerRequirements, ByteDuplex>,
    HandlerRequirements in Without<HandlerRequirements, HttpTransport>
```

Rebuilds, acquires, and drives one scoped request while preserving both channel families.

::Anchor{id="HybridAttempt"}

## `HybridAttempt`

```silk
pub service HybridAttempt<'policy, RoutedP, DirectP, A, E, ?R>
```

A higher-ranked callback for one routed or direct redirect attempt.

### Details

A routed client calls `handleRouted` with its final routed transport. A direct client calls
`handleDirect` with its direct HTTP transport. Each operation lends the same owned request and
validated method only for its exchange scope. Neither exchange form can escape in `A`.

::Anchor{id="HybridAttempt.handleRouted"}

### Operation `handleRouted`

```silk
effect<'call> fn handleRouted<
    'call,
    'exchangeView: 'call,
    'transport: 'exchangeView,
    'provider: 'transport,
    'tunnel: 'provider,
  >(
    request: &'call AttemptRequest<'policy>,
    method: Method<'call>,
    exchange: &'call mut Exchange<
      'exchangeView,
      RouteTransport<'transport, 'provider, 'tunnel, RoutedP>,
    >,
  ) -> A ! E ? R | &mut HybridAttempt<'policy, RoutedP, DirectP, A, E, R> where
    &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut RoutedP provides &HttpTransport from &mut HttpTransport,
    &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut RoutedP provides &ByteDuplex from &mut ByteDuplex
```

Handles one routed exchange after route preparation and acquisition finish.

::Anchor{id="HybridAttempt.handleDirect"}

### Operation `handleDirect`

```silk
effect<'call> fn handleDirect<'call, 'exchangeView: 'call>(
    request: &'call AttemptRequest<'policy>,
    method: Method<'call>,
    exchange: &'call mut Exchange<'exchangeView, DirectP>,
  ) -> A ! E ? R | &mut HybridAttempt<'policy, RoutedP, DirectP, A, E, R> where
    &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut DirectP provides &HttpTransport from &mut HttpTransport
```

Handles one direct exchange after direct request preparation and acquisition finish.

::Anchor{id="HybridAttemptClient"}

## `HybridAttemptClient`

```silk
pub interface HybridAttemptClient<
  'policy,
  RoutedP,
  DirectP,
  A,
  HandlerError,
  AcquisitionError,
  ?AcquisitionRequirements,
  ?HandlerRequirements,
>
```

A routed-or-direct acquisition boundary for one rebuilt redirect attempt.

### Details

The client selects one acquisition form before contact and calls exactly one handler operation.
It preserves the unchanged deadline and both caller-defined channel families. The direct form
does not require duplex authority because it cannot establish a CONNECT tunnel.

::Anchor{id="HybridAttemptClient.withAttempt"}

### Operation `withAttempt`

```silk
effect fn withAttempt(
    client: &mut Self,
    request: AttemptRequest<'policy>,
    deadline: Option<Instant>,
  ) -> A ! HandlerError | AcquisitionError ? HandlerRequirements | AcquisitionRequirements | &mut HybridAttempt<'policy, RoutedP, DirectP, A, HandlerError ? HandlerRequirements> where
    HandlerRequirements in Without<HandlerRequirements, ByteDuplex>,
    HandlerRequirements in Without<HandlerRequirements, HttpTransport>
```

Rebuilds, acquires, and drives one routed or direct scoped request.

::Anchor{id="ResponseHandler"}

## `ResponseHandler`

```silk
pub interface ResponseHandler<P, A, E, ?R>
```

A higher-ranked callback for the one final response selected by redirect orchestration.

### When to use

Pass an implementation to one of the four `with*Response` operations to consume the final
response while its routed exchange is live.

### Details

`uri` borrows the independently owned final URI only for `handle`. `hop` is the number of
redirects followed. Neither the URI nor exchange loan can escape in `A`.

::Anchor{id="ResponseHandler.handle"}

### Operation `handle`

```silk
effect<'call> fn handle<
    'call,
    'exchangeView: 'call,
    'transport: 'exchangeView,
    'provider: 'transport,
    'tunnel: 'provider,
  >(
    handler: &mut Self,
    uri: Uri<'call>,
    hop: usize,
    exchange: &'call mut Exchange<'exchangeView, RouteTransport<'transport, 'provider, 'tunnel, P>>,
  ) -> A ! E ? R where
    &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &HttpTransport from &mut HttpTransport,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut P provides &ByteDuplex from &mut ByteDuplex
```

Handles exactly one selected final response.

::Anchor{id="HybridResponseHandler"}

## `HybridResponseHandler`

```silk
pub interface HybridResponseHandler<RoutedP, DirectP, A, E, ?R>
```

A final-response callback that accepts either a routed or a direct exchange.

### When to use

Use with the four `with*HybridResponse` operations when one acquisition context can select a
proxy-aware route or a direct pooled connection.

### Details

The acquisition client calls exactly one operation. Each operation lends the independently
owned final URI and live exchange only for that call.

::Anchor{id="HybridResponseHandler.handleRouted"}

### Operation `handleRouted`

```silk
effect<'call> fn handleRouted<
    'call,
    'exchangeView: 'call,
    'transport: 'exchangeView,
    'provider: 'transport,
    'tunnel: 'provider,
  >(
    handler: &mut Self,
    uri: Uri<'call>,
    hop: usize,
    exchange: &'call mut Exchange<
      'exchangeView,
      RouteTransport<'transport, 'provider, 'tunnel, RoutedP>,
    >,
  ) -> A ! E ? R where
    &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut RoutedP provides &HttpTransport from &mut HttpTransport,
    &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut RoutedP provides &ByteDuplex from &mut ByteDuplex
```

Handles exactly one final response on a routed transport.

::Anchor{id="HybridResponseHandler.handleDirect"}

### Operation `handleDirect`

```silk
effect<'call> fn handleDirect<'call, 'exchangeView: 'call>(
    handler: &mut Self,
    uri: Uri<'call>,
    hop: usize,
    exchange: &'call mut Exchange<'exchangeView, DirectP>,
  ) -> A ! E ? R where
    &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
    &mut DirectP provides &HttpTransport from &mut HttpTransport
```

Handles exactly one final response on a direct HTTP transport.

::Anchor{id="SelectedBody"}

## `SelectedBody`

```silk
pub service SelectedBody<E, ?R>
```

Opaque selected request-body authority used while a redirect attempt is live.

### Details

Redirect orchestration provides this service only inside the scoped attempt callback. Clients
may name it to preserve exact requirement rows, but cannot retain its producer or body loan.

::Anchor{id="SelectedBody.pull"}

### Operation `pull`

```silk
effect fn pull(output: &mut [u8]) -> BodyChunk ! E ? R | &mut SelectedBody<E, R>
```

Writes the next selected request-body chunk into `output` without retaining the buffer.

::Anchor{id="AttemptStep"}

## `AttemptStep`

```silk
pub union AttemptStep<'policy, A>
```

Opaque outcome of one redirect attempt.

### Details

Acquisition clients may name this result in exact conformance bounds. Redirect orchestration
alone constructs and consumes its state, history, and transition authority.

::Anchor{id="AttemptStep.Final"}

### `Final`

```silk
Final
```

::Anchor{id="AttemptStep.Redirect"}

### `Redirect`

```silk
Redirect
```

::Anchor{id="withEmptyResponse"}

## `withEmptyResponse`

```silk
pub effect<'env> fn withEmptyResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  P,
  A,
  CallbackError,
  AcquisitionError,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  H: ResponseHandler<P, A, CallbackError ? CallbackRequirements> + 'env,
  C: AttemptClient<'policy, P, AttemptStep<'policy, A>, RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? CallbackRequirements | &mut SelectedBody<
    never,
    never,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows a body-free request and lends exactly one final response.

### When to use

Use when every retained redirect can repeat an empty request without source authority.

### Details

Each attempt is rebuilt under the unchanged caller deadline. Intermediate responses are closed
or boundedly drained according to `policy`. If orchestration reaches a final response,
`handler` runs exactly once; an earlier failure does not invoke it.

::Anchor{id="withEmptyHybridResponse"}

## `withEmptyHybridResponse`

```silk
pub effect<'env> fn withEmptyHybridResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  RoutedP,
  DirectP,
  A,
  CallbackError,
  AcquisitionError,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  H: HybridResponseHandler<RoutedP, DirectP, A, CallbackError ? CallbackRequirements> + 'env,
  C: HybridAttemptClient<'policy, RoutedP, DirectP, AttemptStep<'policy, A>, RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? CallbackRequirements | &mut SelectedBody<
    never,
    never,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows a body-free request through a client that can select routed or direct acquisition.

### Details

Each attempt uses one acquisition form. The operation reuses the same iterative redirect state
machine as [`withEmptyResponse`](#withEmptyResponse) and invokes `handler` exactly once for the final response.

::Anchor{id="withBytesResponse"}

## `withBytesResponse`

```silk
pub effect<'env> fn withBytesResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  'scratch,
  P,
  A,
  CallbackError,
  AcquisitionError,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  H: ResponseHandler<P, A, CallbackError ? CallbackRequirements> + 'env,
  C: AttemptClient<'policy, P, AttemptStep<'policy, A>, RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? CallbackRequirements | &mut SelectedBody<
    never,
    never,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  bytes: &'bytes [u8],
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows a request using immutable bytes that can be replayed without resource acquisition.

### When to use

Use for a complete in-memory body whose borrow remains live for the redirect operation.

### Details

Every retained-body attempt starts a fresh cursor at byte zero. A transition that drops content
changes all later attempts to empty framing. Nonempty bytes require nonempty body scratch before
the first routed attempt can be acquired.

::Anchor{id="withBytesHybridResponse"}

## `withBytesHybridResponse`

```silk
pub effect<'env> fn withBytesHybridResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  'scratch,
  RoutedP,
  DirectP,
  A,
  CallbackError,
  AcquisitionError,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  H: HybridResponseHandler<RoutedP, DirectP, A, CallbackError ? CallbackRequirements> + 'env,
  C: HybridAttemptClient<'policy, RoutedP, DirectP, AttemptStep<'policy, A>, RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? CallbackRequirements | &mut SelectedBody<
    never,
    never,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  bytes: &'bytes [u8],
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows replayable bytes through a client that can select routed or direct acquisition.

### Details

Every retained-body attempt starts at byte zero. A dropped-body transition changes all later
attempts to empty framing. A nonempty body requires positive scratch before contact.

::Anchor{id="withOneShotResponse"}

## `withOneShotResponse`

```silk
pub effect<'env> fn withOneShotResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  P,
  A,
  ProducerError,
  CallbackError,
  AcquisitionError,
  ?ProducerRequirements,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  H: ResponseHandler<P, A, CallbackError ? CallbackRequirements> + 'env,
  C: AttemptClient<'policy, P, AttemptStep<'policy, A>, RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? ProducerRequirements | CallbackRequirements | &mut SelectedBody<
    ProducerError,
    ProducerRequirements,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  producer: Producer,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows redirects while consuming one affine body producer at most once.

### When to use

Use when the first attempted body cannot be recreated for a retained redirect.

### Details

Producer framing and scratch are checked before routed acquisition. The first attempt spends
producer authority even when Require100 returns an early final response. A retained-body
redirect fails with `ReplayUnavailable`; a dropped-body redirect continues empty.

::Anchor{id="withOneShotHybridResponse"}

## `withOneShotHybridResponse`

```silk
pub effect<'env> fn withOneShotHybridResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  RoutedP,
  DirectP,
  A,
  ProducerError,
  CallbackError,
  AcquisitionError,
  ?ProducerRequirements,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  H: HybridResponseHandler<RoutedP, DirectP, A, CallbackError ? CallbackRequirements> + 'env,
  C: HybridAttemptClient<'policy, RoutedP, DirectP, AttemptStep<'policy, A>, RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? ProducerRequirements | CallbackRequirements | &mut SelectedBody<
    ProducerError,
    ProducerRequirements,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  producer: Producer,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows an affine body producer through routed or direct acquisition.

### Details

The producer is consumed for the first attempted body only. A redirect that retains the body
fails with `ReplayUnavailable`; a transition that drops the body continues with empty framing.

::Anchor{id="withReplayResponse"}

## `withReplayResponse`

```silk
pub effect<'env> fn withReplayResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  P,
  A,
  FactoryError,
  ProducerError,
  CallbackError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  H: ResponseHandler<P, A, CallbackError ? CallbackRequirements> + 'env,
  C: AttemptClient<'policy, P, AttemptStep<'policy, A>, RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? ProducerRequirements | CallbackRequirements | &mut SelectedBody<
    ProducerError,
    ProducerRequirements,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  factory: Factory,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | FactoryError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  FactoryRequirements in Without<FactoryRequirements, ByteDuplex>,
  FactoryRequirements in Without<FactoryRequirements, HttpTransport>,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows redirects by acquiring one fresh scoped producer for each retained-body attempt.

### When to use

Use for replayable streams whose files, handles, or other resources require caller-owned
factory bracketing.

### Details

Each factory loan encloses selected-body provision and the complete attempt-client bracket. A
dropped-body transition stops consulting the factory. Factory, producer, acquisition, and final
callback channels remain direct members of this operation's unions.

::Anchor{id="withReplayHybridResponse"}

## `withReplayHybridResponse`

```silk
pub effect<'env> fn withReplayHybridResponse<
  'client,
  'uri,
  'method,
  'headers,
  'policy,
  'scratch,
  RoutedP,
  DirectP,
  A,
  FactoryError,
  ProducerError,
  CallbackError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?CallbackRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  H: HybridResponseHandler<RoutedP, DirectP, A, CallbackError ? CallbackRequirements> + 'env,
  C: HybridAttemptClient<'policy, RoutedP, DirectP, AttemptStep<'policy, A>, RedirectError | ValueError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError, AcquisitionError, AcquisitionRequirements ? ProducerRequirements | CallbackRequirements | &mut SelectedBody<
    ProducerError,
    ProducerRequirements,
  > | &mut MonotonicClock | &mut Allocator | &mut Random>,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  'env,
>(
  client: &'client mut C,
  request: Request<'uri, 'method, 'headers, 'policy>,
  policy: &'policy Policy,
  factory: Factory,
  deadline: Option<Instant>,
  scratch: &'scratch mut [u8],
  handler: H,
) -> A
! RedirectError | ValueError | FactoryError | ProducerError | CallbackError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | CallbackRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  FactoryRequirements in Without<FactoryRequirements, ByteDuplex>,
  FactoryRequirements in Without<FactoryRequirements, HttpTransport>,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  CallbackRequirements in Without<CallbackRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Follows replayable producer scopes through routed or direct acquisition.

### Details

Each retained-body attempt receives one fresh producer inside the factory scope. A dropped-body
transition stops factory acquisition. All source and acquisition channels remain direct.

::Anchor{id="writeBody"}

## `writeBody`

```silk
pub effect<'env> fn writeBody<
  'bytes,
  'oneShot,
  'replay,
  'exchange,
  P,
  OneShotError,
  ReplayError,
  ?OneShotRequirements,
  ?ReplayRequirements,
  OneShot: BodyProducer<OneShotError ? OneShotRequirements> + 'env,
  ReplayProducer: BodyProducer<ReplayError ? ReplayRequirements> + 'env,
  'env,
>(
  exchange: &mut Exchange<'exchange, P>,
  current: &Uri,
  expected: BodyMode,
  body: AttemptBody<'bytes, 'oneShot, 'replay, OneShot, ReplayProducer>,
  scratch: &mut [u8],
  trailers: &Headers,
  hop: usize,
) -> BodyWriteOutcome
! RedirectError | OneShotError | ReplayError | ExchangeError | OutOfMemoryError
? OneShotRequirements | ReplayRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Drives one admitted attempt from prepared head through the first final response.

### When to use

Use inside an attempt client's exchange callback after selecting one [`AttemptBody`](#AttemptBody).

### Details

The operation validates the selected and produced framing before sending the head. Require100
informational responses are consumed until 100 permits upload or a final response returns
`EarlyFinal`. Redirect bodies do not admit trailers, so non-empty `trailers` are rejected before
the head is sent. Produced chunks must fit `scratch`; known-length excess is rejected before it
can be written, and every completed upload finishes exactly once before receiving its final
head. Empty attempts never inspect or pull a producer. Locally created body-contract failures
copy the already bounded `current` URI into their owned redirect context.

### Gotchas

`scratch` must be non-empty for KnownLength and Chunked bodies. A zero-length nonterminal pull
is a producer contract failure. An early final consumes the enclosing attempt's OneShot
authority even though this operation has not called `pull`.

::Anchor{id="StatusDecision"}

## `StatusDecision`

```silk
pub enum StatusDecision
```

Whether the current response is final or selects redirect transition processing.

::Anchor{id="StatusDecision.Final"}

### `Final`

```silk
Final
```

Returns the current response without inspecting `Location`.

::Anchor{id="StatusDecision.Redirect"}

### `Redirect`

```silk
Redirect
```

Applies redirect transition processing.

::Anchor{id="BodyDecision"}

## `BodyDecision`

```silk
pub enum BodyDecision
```

Whether the next attempt retains or drops the current body.

::Anchor{id="BodyDecision.Retain"}

### `Retain`

```silk
Retain
```

Retains framing and requires repeatability for a later attempt.

::Anchor{id="BodyDecision.Drop"}

### `Drop`

```silk
Drop
```

Drops the source and every content-associated field.

::Anchor{id="Transition"}

## `Transition`

```silk
pub struct Transition<'method>
```

A selected next method and body disposition.

::Anchor{id="Transition.method-2"}

### Field `method`

```silk
pub method: Method<'method>
```

Exact next method, either preserved or the canonical GET/HEAD value.

::Anchor{id="Transition.body"}

### Field `body`

```silk
pub body: BodyDecision
```

Whether content remains part of the next attempt.

::Anchor{id="Transition.impl.Copy"}

## Implementation `Copy for Transition<'method>`

```silk
impl<'method> Copy for Transition<'method>
```

::Anchor{id="NameList.impl"}

## Implementation `NameList`

```silk
impl NameList
```

::Anchor{id="NameList.impl.empty"}

### Associated function `empty`

```silk
pub fn empty() -> NameList
```

Creates an empty admitted list without allocating.

::Anchor{id="NameList.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(names: &[string], limits: NameListLimits) -> Result<NameList, RedirectError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Validates and copies field names under exact count, per-name, and owned-byte boundaries.

::Anchor{id="NameList.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, name: string) -> bool
```

Reports ASCII case-insensitive membership without allocating.

::Anchor{id="NameList.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of owned names.

::Anchor{id="NameList.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns accounted payload plus index storage bytes.

::Anchor{id="Policy.impl"}

## Implementation `Policy`

```silk
impl Policy
```

::Anchor{id="Policy.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> Policy
```

Returns Manual policy with the standard finite redirect limits and no admitted custom names.

#### Details

The result permits 10 hops, 8192 URI bytes, and 90112 history bytes. It denies origin changes
and downgrades, preserves POST for 301 and 302, and closes intermediate responses. Both owned
name lists are empty.

::Anchor{id="Policy.impl.make"}

### Associated function `make`

```silk
pub fn make(
    mode: Mode,
    history: HistoryLimits,
    crossOrigin: CrossOriginPolicy,
    downgrade: DowngradePolicy,
    post301302: Post301302Policy,
    previousResponse: PreviousResponsePolicy,
    safeCustom: NameList,
    sensitive: NameList,
  ) -> Result<Policy, RedirectError>
```

Admits an immutable policy, rejecting list overlap and hop-count overflow before I/O.

::Anchor{id="Policy.impl.mode"}

### Method `mode`

```silk
pub fn mode(self: &Self) -> Mode
```

Returns whether responses are returned manually or followed.

::Anchor{id="Policy.impl.historyLimits"}

### Method `historyLimits`

```silk
pub fn historyLimits(self: &Self) -> HistoryLimits
```

Returns admitted URI, history, and hop capacities.

::Anchor{id="Policy.impl.crossOrigin"}

### Method `crossOrigin`

```silk
pub fn crossOrigin(self: &Self) -> CrossOriginPolicy
```

Returns cross-origin admission policy.

::Anchor{id="Policy.impl.downgrade"}

### Method `downgrade`

```silk
pub fn downgrade(self: &Self) -> DowngradePolicy
```

Returns HTTPS-to-HTTP downgrade policy.

::Anchor{id="Policy.impl.post301302"}

### Method `post301302`

```silk
pub fn post301302(self: &Self) -> Post301302Policy
```

Returns exact POST behavior for 301 and 302.

::Anchor{id="Policy.impl.previousResponse"}

### Method `previousResponse`

```silk
pub fn previousResponse(self: &Self) -> &PreviousResponsePolicy
```

Borrows intermediate-response cleanup policy.

::Anchor{id="Policy.impl.safeCustom"}

### Method `safeCustom`

```silk
pub fn safeCustom(self: &Self) -> &NameList
```

Borrows the admitted cross-origin safe-custom field names.

::Anchor{id="Policy.impl.sensitive"}

### Method `sensitive`

```silk
pub fn sensitive(self: &Self) -> &NameList
```

Borrows the admitted always-sensitive field names.

::Anchor{id="statusDecision"}

## `statusDecision`

```silk
pub fn statusDecision(policy: &Policy, status: Status, followedHops: usize) -> Result<
  StatusDecision,
  RedirectError,
>
```

Classifies a response status without inspecting `Location` and enforces selected-hop capacity.

::Anchor{id="transition"}

## `transition`

```silk
pub fn transition<'method>(policy: &Policy, status: Status, method: Method<'method>) -> Transition<
  'method,
>
```

Computes the exact RFC redirect method and body transition for a selected status.

::Anchor{id="resolveLocation"}

## `resolveLocation`

```silk
pub effect fn resolveLocation<'head>(
  current: &Uri,
  headers: &Headers<'head>,
  limits: HistoryLimits,
  hop: usize,
  status: Status,
) -> Result<OwnedUri, RedirectError> ! OutOfMemoryError ? &mut Allocator
```

Returns one independently owned HTTP or HTTPS URI from the selected response `Location`.

### When to use

Use while the selected response head is live and before the next route is acquired.

### Details

The operation requires exactly one field and copies it under `maxUriBytes`. It applies RFC 3986
resolution, rejects a resolved serialization above the same bound, and admits only HTTP or
HTTPS origins with a host, effective port, and no user information. It inherits the current
fragment only when the reference has no fragment.

### Gotchas

A present empty fragment replaces the current fragment. The operation does not change `current`.

::Anchor{id="admitOrigin"}

## `admitOrigin`

```silk
pub fn admitOrigin(policy: &Policy, current: &Origin, next: &Origin, hop: usize, status: Status) -> Result<
  bool,
  RedirectError,
>
```

Validates cross-origin and downgrade policy and reports whether sanitization is cross-origin.

::Anchor{id="History"}

## `History`

```silk
pub struct History
```

Bounded method-aware redirect-loop history in one preallocated byte arena.

::Anchor{id="History.impl"}

## Implementation `History`

```silk
impl History
```

::Anchor{id="History.impl.make"}

### Associated function `make`

```silk
pub effect fn make(limits: HistoryLimits) -> Result<History, RedirectError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Checks `maxHops + 1` and reserves the complete history-byte budget before network I/O.

#### Details

All later inserts use one arena. An insert can fail its exact byte limit without another
history allocation.

::Anchor{id="History.impl.insert"}

### Method `insert`

```silk
pub effect fn insert<'method>(self: &mut Self, method: Method<'method>, origin: Origin, uri: &Uri) -> Result<
    (),
    RedirectError,
  > ! OutOfMemoryError ? &mut Allocator
```

Checks and inserts one transformed method, normalized origin, and exact path/query key.

::Anchor{id="History.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of stored method-aware keys.

::Anchor{id="History.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the initialized bytes used by stored keys in the preallocated history arena.

::Anchor{id="sanitizeHeaders"}

## `sanitizeHeaders`

```silk
pub effect fn sanitizeHeaders<'value>(
  headers: &Headers<'value>,
  policy: &Policy,
  crossOrigin: bool,
  body: BodyDecision,
  limits: HeaderLimits,
) -> Result<OwnedHeaders, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Returns independently owned fields after redirect-specific removal and cross-origin filtering.

### When to use

Use before request preparation for each selected redirect attempt.

### Details

The operation removes Host, Connection, Keep-Alive, TE, Trailer, Transfer-Encoding, Upgrade,
Proxy-Connection, Proxy-Authorization, framing fields, Expect, and Connection-nominated fields.
A dropped body also removes content metadata and digests. Cross-origin filtering retains only
Accept, Accept-Encoding, Accept-Language, User-Agent, configured safe names, and retained-body
content type, encoding, and language. Authorization, Cookie, Proxy-Authorization, Origin,
Referer, and configured sensitive names are then denied with final precedence.

### Gotchas

The result never contains Host, framing fields, Expect, or Proxy-Authorization. Request
preparation must generate those fields from the next origin, body mode, and selected route. An
invalid Connection token returns its original `ValueError` before output construction.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
