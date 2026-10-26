Follow HTTP redirects with a [`Policy`](#Policy): which statuses to follow, how the method and the body
change, which origins are allowed, and which headers are kept.

## When to use
Most programs set a [`Policy`](#Policy) in `FetchOptions` of `silk.http_fetch`. Use the `with*Response`
functions to follow redirects with your own [`AttemptClient`](#AttemptClient). Use [`statusDecision`](#statusDecision),
[`transition`](#transition), [`resolveLocation`](#resolveLocation), [`admitOrigin`](#admitOrigin), [`History`](#History), and [`sanitizeHeaders`](#sanitizeHeaders) to
build your own redirect loop.

## Details
For each response, [`statusDecision`](#statusDecision) decides if it is a redirect. [`transition`](#transition) selects the
next method and whether the body is sent again:
- 303 changes the method to GET, or keeps HEAD, and drops the body.
- 301 and 302 change POST to GET and drop the body when `post301302` is `ToGet`.
- All other cases keep the method and the body.

[`resolveLocation`](#resolveLocation) reads the `Location` field. [`admitOrigin`](#admitOrigin) applies the cross-origin and
downgrade rules. [`History`](#History) finds loops. [`sanitizeHeaders`](#sanitizeHeaders) removes headers that must not go
to the next request.

The suffix of a `with*Response` function tells what the request body is, as in
`silk.http_fetch`: `Empty`, `Bytes`, `OneShot`, or `Replay`. The `Hybrid` forms take a client
that can connect through a proxy route or directly.

## Errors
- [`RedirectError`](#RedirectError) tells the part, the reason, and the URIs and status, when they are known. It
  holds no credentials or body.

## Gotchas
The default [`Policy`](#Policy) does not follow redirects. It denies a change of origin and a change from
HTTPS to HTTP. A `OneShot` body cannot be sent again, so a redirect that keeps the body fails
with `ReplayUnavailable`.

## Examples
### Apply redirect rules
```silk
import silk.http { Method, Status, ValueError }
import silk.http_origin { Origin, OriginError }
import silk.http_redirect {
  BodyDecision,
  CrossOriginPolicy,
  DowngradePolicy,
  Mode,
  NameList,
  Policy,
  Post301302Policy,
  PreviousResponsePolicy,
  RedirectError,
  RedirectReason,
  StatusDecision,
  Transition,
  admitOrigin,
  statusDecision,
  transition
}
import silk.result { Result }
import silk.uri { Uri }
import silk.uri_reference { ParseError }

fn status(code: u16) -> Status {
  return match Status.fromCode(code) {
    Result<Status, ValueError>.Success { value } => value
    Result<Status, ValueError>.Failure { error: _ } => {
      Intrinsic.trap("unexpected failure")
      return status(code)
    }
  }
}

fn origin(text: string<'static>) -> Origin {
  let uri = match Uri.parse(text) {
    Result<Uri, ParseError>.Success { value } => value
    Result<Uri, ParseError>.Failure { error: _ } => {
      Intrinsic.trap("unexpected failure")
      return origin(text)
    }
  }
  return match Origin.fromUri(&uri) {
    Result<Origin, OriginError>.Success { value } => value
    Result<Origin, OriginError>.Failure { error: _ } => {
      Intrinsic.trap("unexpected failure")
      return origin(text)
    }
  }
}

pub fn main() -> i32 {
  let defaults = Policy.defaults()
  let policy = match Policy.make(
    Mode.Follow,
    Policy.historyLimits(&defaults),
    CrossOriginPolicy.Allow,
    DowngradePolicy.Deny,
    Post301302Policy.ToGet,
    PreviousResponsePolicy.Close,
    NameList.empty(),
    NameList.empty(),
  ) {
    Result<Policy, RedirectError>.Success { value } => move value
    Result<Policy, RedirectError>.Failure { error: _ } => {
      return 1
    }
  }

  // 303 is a redirect. It changes POST to GET and drops the body.
  let decision = match statusDecision(&policy, status(303), 0) {
    Result<StatusDecision, RedirectError>.Success { value } => value
    Result<StatusDecision, RedirectError>.Failure { error: _ } => {
      return 1
    }
  }
  let seeOther = transition(&policy, status(303), Method.post())
  if decision != StatusDecision.Redirect || Method.format(&seeOther.method) != "GET"
    || seeOther.body != BodyDecision.Drop {
    return 1
  }

  // 307 keeps the method and the body.
  let temporary = transition(&policy, status(307), Method.post())
  if Method.format(&temporary.method) != "POST" || temporary.body != BodyDecision.Retain {
    return 1
  }

  // A redirect from HTTPS to HTTP fails.
  let downgrade = match admitOrigin(
    &policy,
    &origin("https://example.com/"),
    &origin("http://example.com/"),
    0,
    status(302),
  ) {
    Result<bool, RedirectError>.Success { value: _ } => false
    Result<bool, RedirectError>.Failure { error } => match error.reason {
      RedirectReason.DowngradeDenied => true
      _ => false
    }
  }
  if !downgrade {
    return 1
  }
  return 0
}
```

Import as `Redirect` with `import silk.http_redirect as Redirect`.

Public declarations: 48.

::Anchor{id="Mode"}

## `Mode`

```silk
pub enum Mode
```

Whether to follow redirects.

::Anchor{id="Mode.Manual"}

### `Manual`

```silk
Manual
```

Return the first response. `Location` is not read.

::Anchor{id="Mode.Follow"}

### `Follow`

```silk
Follow
```

Follow redirects by the policy.

::Anchor{id="CrossOriginPolicy"}

## `CrossOriginPolicy`

```silk
pub enum CrossOriginPolicy
```

Whether a redirect can go to another origin.

::Anchor{id="CrossOriginPolicy.Deny"}

### `Deny`

```silk
Deny
```

A redirect to another origin fails with `RedirectOriginDenied`.

::Anchor{id="CrossOriginPolicy.Allow"}

### `Allow`

```silk
Allow
```

A redirect to another origin is followed. Sensitive headers are removed first.

::Anchor{id="DowngradePolicy"}

## `DowngradePolicy`

```silk
pub enum DowngradePolicy
```

Whether a redirect can go from HTTPS to HTTP.

::Anchor{id="DowngradePolicy.Deny"}

### `Deny`

```silk
Deny
```

A redirect from HTTPS to HTTP fails with `DowngradeDenied`.

::Anchor{id="DowngradePolicy.Allow"}

### `Allow`

```silk
Allow
```

A redirect from HTTPS to HTTP is followed, if the cross-origin policy allows it.

::Anchor{id="Post301302Policy"}

## `Post301302Policy`

```silk
pub enum Post301302Policy
```

What a 301 or 302 redirect does with a POST request.

::Anchor{id="Post301302Policy.Preserve"}

### `Preserve`

```silk
Preserve
```

Send POST again, with the body.

::Anchor{id="Post301302Policy.ToGet"}

### `ToGet`

```silk
ToGet
```

Send GET without the body, as browsers do.

::Anchor{id="PreviousResponsePolicy"}

## `PreviousResponsePolicy`

```silk
pub union PreviousResponsePolicy
```

What to do with the body of a redirect response before the next request.

::Anchor{id="PreviousResponsePolicy.Close"}

### `Close`

```silk
Close
```

Do not read it. The connection closes if the body is not complete.

::Anchor{id="PreviousResponsePolicy.Drain"}

### `Drain`

```silk
Drain
```

Read and drop the body, up to a limit, so that the connection can be used again.

::Anchor{id="PreviousResponsePolicy.Drain.maxDiscardWireBytes"}

#### Field `maxDiscardWireBytes`

```silk
pub maxDiscardWireBytes: u64
```

The maximum bytes to read.

::Anchor{id="PreviousResponsePolicy.Drain.deadline"}

#### Field `deadline`

```silk
pub deadline: Instant
```

The deadline of the drain on the `MonotonicClock`. The deadline of the operation also
applies.

::Anchor{id="NameListLimits"}

## `NameListLimits`

```silk
pub struct NameListLimits
```

The limits of a [`NameList`](#NameList).

::Anchor{id="NameListLimits.maxNames"}

### Field `maxNames`

```silk
pub maxNames: usize
```

The maximum number of names.

::Anchor{id="NameListLimits.maxNameBytes"}

### Field `maxNameBytes`

```silk
pub maxNameBytes: usize
```

The maximum length of one name.

::Anchor{id="NameListLimits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

The maximum memory of the list, in bytes.

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

A list of header names, compared without case.

::Anchor{id="HistoryLimits"}

## `HistoryLimits`

```silk
pub struct HistoryLimits
```

The limits of a redirect operation.

::Anchor{id="HistoryLimits.maxHops"}

### Field `maxHops`

```silk
pub maxHops: usize
```

The maximum number of redirects to follow.

::Anchor{id="HistoryLimits.maxUriBytes"}

### Field `maxUriBytes`

```silk
pub maxUriBytes: usize
```

The maximum length of a `Location` value and of a resolved URI.

::Anchor{id="HistoryLimits.maxHistoryBytes"}

### Field `maxHistoryBytes`

```silk
pub maxHistoryBytes: usize
```

The maximum memory of the [`History`](#History), in bytes.

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

The redirect rules: which statuses to follow, how the method and the body change, which origins
are allowed, and which headers are kept. Start from [`Policy.defaults`](#Policy.impl.defaults), or make one with
[`Policy.make`](#Policy.impl.make).

### Details

A 303 changes the method to GET, or keeps HEAD, and drops the body. A 301 or 302 changes POST to
GET and drops the body when `post301302` is `ToGet`. All other cases keep the method and the
body.

### Gotchas

The default policy does not follow redirects. It denies a change of origin and a change from
HTTPS to HTTP.

::Anchor{id="RedirectComponent"}

## `RedirectComponent`

```silk
pub enum RedirectComponent
```

The part of a redirect where an error occurred.

::Anchor{id="RedirectComponent.Policy"}

### `Policy`

```silk
Policy
```

The policy.

::Anchor{id="RedirectComponent.Location"}

### `Location`

```silk
Location
```

The `Location` field.

::Anchor{id="RedirectComponent.Uri"}

### `Uri`

```silk
Uri
```

The next URI.

::Anchor{id="RedirectComponent.Origin"}

### `Origin`

```silk
Origin
```

The next origin.

::Anchor{id="RedirectComponent.History"}

### `History`

```silk
History
```

The redirect history.

::Anchor{id="RedirectComponent.Body"}

### `Body`

```silk
Body
```

The request body.

::Anchor{id="RedirectComponent.impl.Debug"}

## Implementation `Debug for RedirectComponent`

```silk
impl Debug for RedirectComponent
```

::Anchor{id="RedirectComponent.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Policy`.

::Anchor{id="RedirectLimit"}

## `RedirectLimit`

```silk
pub enum RedirectLimit
```

The limit that was exceeded.

::Anchor{id="RedirectLimit.PolicyNames"}

### `PolicyNames`

```silk
PolicyNames
```

`maxNames` of a name list.

::Anchor{id="RedirectLimit.PolicyNameBytes"}

### `PolicyNameBytes`

```silk
PolicyNameBytes
```

`maxNameBytes` of a name list.

::Anchor{id="RedirectLimit.PolicyOwnedBytes"}

### `PolicyOwnedBytes`

```silk
PolicyOwnedBytes
```

`maxOwnedBytes` of a name list.

::Anchor{id="RedirectLimit.UriBytes"}

### `UriBytes`

```silk
UriBytes
```

`maxUriBytes`.

::Anchor{id="RedirectLimit.HistoryEntries"}

### `HistoryEntries`

```silk
HistoryEntries
```

The number of history entries, `maxHops` plus 1.

::Anchor{id="RedirectLimit.HistoryBytes"}

### `HistoryBytes`

```silk
HistoryBytes
```

`maxHistoryBytes`.

::Anchor{id="RedirectLimit.impl.Debug"}

## Implementation `Debug for RedirectLimit`

```silk
impl Debug for RedirectLimit
```

::Anchor{id="RedirectLimit.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `PolicyNames`.

::Anchor{id="RedirectReason"}

## `RedirectReason`

```silk
pub union RedirectReason
```

The reason of a [`RedirectError`](#RedirectError).

::Anchor{id="RedirectReason.InvalidPolicy"}

### `InvalidPolicy`

```silk
InvalidPolicy
```

The policy is not valid, for example `maxHops` plus 1 overflows.

::Anchor{id="RedirectReason.NameListOverlap"}

### `NameListOverlap`

```silk
NameListOverlap
```

A name is in both the safe list and the sensitive list.

::Anchor{id="RedirectReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size does not fit in `usize`.

::Anchor{id="RedirectReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A limit was exceeded.

::Anchor{id="RedirectReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: RedirectLimit
```

The limit.

::Anchor{id="RedirectReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of the limit.

::Anchor{id="RedirectReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The value that was found.

::Anchor{id="RedirectReason.LocationMissing"}

### `LocationMissing`

```silk
LocationMissing
```

The redirect has no `Location` field.

::Anchor{id="RedirectReason.LocationAmbiguous"}

### `LocationAmbiguous`

```silk
LocationAmbiguous
```

The redirect has more than one `Location` field.

::Anchor{id="RedirectReason.LocationInvalid"}

### `LocationInvalid`

```silk
LocationInvalid
```

The `Location` value is not UTF-8, or is not a valid URI reference.

::Anchor{id="RedirectReason.RedirectSchemeDenied"}

### `RedirectSchemeDenied`

```silk
RedirectSchemeDenied
```

The next URI is not `http` or `https`, or has no host or has user information.

::Anchor{id="RedirectReason.RedirectOriginDenied"}

### `RedirectOriginDenied`

```silk
RedirectOriginDenied
```

The policy does not allow a change of origin.

::Anchor{id="RedirectReason.DowngradeDenied"}

### `DowngradeDenied`

```silk
DowngradeDenied
```

The policy does not allow a change from HTTPS to HTTP.

::Anchor{id="RedirectReason.HopLimit"}

### `HopLimit`

```silk
HopLimit
```

There are more redirects than `maxHops`.

::Anchor{id="RedirectReason.RedirectLoop"}

### `RedirectLoop`

```silk
RedirectLoop
```

The next request has the same method and URI as an earlier request.

::Anchor{id="RedirectReason.ReplayUnavailable"}

### `ReplayUnavailable`

```silk
ReplayUnavailable
```

The redirect keeps the body, but the body cannot be sent again.

::Anchor{id="RedirectReason.ReplayContractMismatch"}

### `ReplayContractMismatch`

```silk
ReplayContractMismatch
```

A body producer sent another length or framing than its `mode` said.

::Anchor{id="RedirectReason.impl.Copy"}

## Implementation `Copy for RedirectReason`

```silk
impl Copy for RedirectReason
```

::Anchor{id="RedirectReason.impl.Debug"}

## Implementation `Debug for RedirectReason`

```silk
impl Debug for RedirectReason
```

::Anchor{id="RedirectReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `InvalidPolicy`.

::Anchor{id="RedirectContext"}

## `RedirectContext`

```silk
pub struct RedirectContext
```

The context of a [`RedirectError`](#RedirectError). It owns its data.

::Anchor{id="RedirectContext.hop"}

### Field `hop`

```silk
pub hop: usize
```

The number of the attempt, from 0.

::Anchor{id="RedirectContext.status"}

### Field `status`

```silk
pub status: Option<Status>
```

The status of the response, when it is known.

::Anchor{id="RedirectContext.currentUri"}

### Field `currentUri`

```silk
pub currentUri: Option<OwnedUri>
```

A copy of the current URI, when it is known.

::Anchor{id="RedirectContext.nextUri"}

### Field `nextUri`

```silk
pub nextUri: Option<OwnedUri>
```

A copy of the next URI, when it is known.

::Anchor{id="RedirectContext.impl.Debug"}

## Implementation `Debug for RedirectContext`

```silk
impl Debug for RedirectContext
```

::Anchor{id="RedirectContext.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `RedirectContext { hop: ..., status: ..., ... }`.

::Anchor{id="RedirectError"}

## `RedirectError`

```silk
pub struct RedirectError
```

The error from a redirect. It holds no response, credentials, or body.

### Details

It tells the part, the reason, and the URIs and status, when they are known.

::Anchor{id="RedirectError.component"}

### Field `component`

```silk
pub component: RedirectComponent
```

The part where the error occurred.

::Anchor{id="RedirectError.reason"}

### Field `reason`

```silk
pub reason: RedirectReason
```

The reason.

::Anchor{id="RedirectError.context"}

### Field `context`

```silk
pub context: RedirectContext
```

The URIs and the status.

::Anchor{id="RedirectError.impl.Debug"}

## Implementation `Debug for RedirectError`

```silk
impl Debug for RedirectError
```

::Anchor{id="RedirectError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `RedirectError { component: ..., reason: ..., ... }`.

::Anchor{id="Request"}

## `Request`

```silk
pub struct Request<'uri, 'method, 'headers, 'policy>
```

A request that can be built again for each redirect. It does not hold the body.

::Anchor{id="Request.uri-2"}

### Field `uri`

```silk
pub uri: Uri<'uri>
```

The first URI. Its fragment is kept for later URIs that have none.

::Anchor{id="Request.method-2"}

### Field `method`

```silk
pub method: Method<'method>
```

The first method.

::Anchor{id="Request.headers-2"}

### Field `headers`

```silk
pub headers: Headers<'headers>
```

Your headers, without the fields that the policy and the body make.

::Anchor{id="Request.headerPolicy"}

### Field `headerPolicy`

```silk
pub headerPolicy: HeaderPolicy<'policy>
```

The policy for the fields that the request adds, and the credentials.

::Anchor{id="Request.version"}

### Field `version`

```silk
pub version: Version
```

The HTTP version of all attempts.

::Anchor{id="Request.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

Whether all attempts wait for 100 Continue.

::Anchor{id="Request.limits"}

### Field `limits`

```silk
pub limits: HeaderLimits
```

The limits of the values and fields.

::Anchor{id="Request.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

The maximum size of each request head.

::Anchor{id="Request.maxCredentialBytes"}

### Field `maxCredentialBytes`

```silk
pub maxCredentialBytes: usize
```

The maximum size of the credentials in each request head.

::Anchor{id="AttemptRequest"}

## `AttemptRequest`

```silk
pub struct AttemptRequest<'policy>
```

The request for one attempt, which an [`AttemptClient`](#AttemptClient) prepares and sends.

### Details
The client borrows from this value only in its handler call. It must prepare a new request after
it selects the route, and never send the bytes of an earlier request to another origin.

::Anchor{id="AttemptRequest.uri"}

### Field `uri`

```silk
pub uri: OwnedUri
```

The URI of this attempt. The fragment is not sent.

::Anchor{id="AttemptRequest.method"}

### Field `method`

```silk
pub method: String
```

The method of this attempt.

::Anchor{id="AttemptRequest.headers"}

### Field `headers`

```silk
pub headers: OwnedHeaders
```

The headers, after [`sanitizeHeaders`](#sanitizeHeaders).

::Anchor{id="AttemptRequest.headerPolicy"}

### Field `headerPolicy`

```silk
pub headerPolicy: HeaderPolicy<'policy>
```

The policy for the fields that the request adds, and the credentials. See
[`crossOriginHeaderPolicy`](#crossOriginHeaderPolicy).

::Anchor{id="AttemptRequest.version"}

### Field `version`

```silk
pub version: Version
```

The HTTP version.

::Anchor{id="AttemptRequest.continuePolicy"}

### Field `continuePolicy`

```silk
pub continuePolicy: ContinuePolicy
```

Whether to wait for 100 Continue.

::Anchor{id="AttemptRequest.requestLimits"}

### Field `requestLimits`

```silk
pub requestLimits: HeaderLimits
```

The limits of the values and fields.

::Anchor{id="AttemptRequest.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

The maximum size of the request head.

::Anchor{id="AttemptRequest.maxCredentialBytes"}

### Field `maxCredentialBytes`

```silk
pub maxCredentialBytes: usize
```

The maximum size of the credentials in the request head.

::Anchor{id="AttemptRequest.bodyMode"}

### Field `bodyMode`

```silk
pub bodyMode: BodyMode
```

The framing of the body of this attempt.

::Anchor{id="crossOriginHeaderPolicy"}

## `crossOriginHeaderPolicy`

```silk
pub fn crossOriginHeaderPolicy<'value>(policy: HeaderPolicy<'value>) -> HeaderPolicy<'value>
```

Returns the header policy for a request to another origin, without credentials.

### When to use
Use it when [`admitOrigin`](#admitOrigin) returns `true`, before you prepare the request.

### Details
`Host` is made for the new origin, and `Authorization` is removed. `User-Agent`, `Accept`, the
Basic security, and the HTTP/1.0 keep-alive setting stay.

::Anchor{id="BodyChunk"}

## `BodyChunk`

```silk
pub struct BodyChunk
```

The result of [`BodyProducer.pull`](#BodyProducer.pull).

::Anchor{id="BodyChunk.length"}

### Field `length`

```silk
pub length: usize
```

The number of bytes written at the start of the output.

::Anchor{id="BodyChunk.end"}

### Field `end`

```silk
pub end: bool
```

`true` when there are no more bytes.

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

A source of request body bytes.

::Anchor{id="BodyProducer.mode"}

### Operation `mode`

```silk
fn mode(producer: &Self) -> BodyMode
```

Returns the framing of the body, before the head is sent.

::Anchor{id="BodyProducer.pull"}

### Operation `pull`

```silk
effect fn pull(producer: &mut Self, output: &mut [u8]) -> BodyChunk ! E ? R
```

Writes the next bytes of the body to the start of `output`. It does not keep `output`.

::Anchor{id="ReplayFactory"}

## `ReplayFactory`

```silk
pub interface ReplayFactory<P, FactoryError, ?FactoryRequirements>
```

Makes a new [`BodyProducer`](#BodyProducer) for each attempt that sends the body.

### Details
Each producer is released after its attempt, also after an error or a cancel. `release` cannot
fail or wait.

::Anchor{id="ReplayFactory.acquire"}

### Operation `acquire`

```silk
effect fn acquire(factory: &mut Self) -> P ! FactoryError ? FactoryRequirements
```

Returns a new producer for the next attempt.

::Anchor{id="ReplayFactory.release"}

### Operation `release`

```silk
fn release(factory: &mut Self, producer: &mut P) -> ()
```

Releases a producer after its attempt.

::Anchor{id="AttemptBody"}

## `AttemptBody`

```silk
pub union AttemptBody<'bytes, 'oneShot, 'replay, OneShot, ReplayProducer>
```

The body of one attempt, as given to [`writeBody`](#writeBody).

::Anchor{id="AttemptBody.Empty"}

### `Empty`

```silk
Empty
```

No body.

::Anchor{id="AttemptBody.RepeatableBytes"}

### `RepeatableBytes`

```silk
RepeatableBytes
```

Bytes that can be sent again from the start.

::Anchor{id="AttemptBody.OneShot-2"}

### `OneShot`

```silk
OneShot
```

A producer that can run only one time.

::Anchor{id="AttemptBody.ReplayFactory"}

### `ReplayFactory`

```silk
ReplayFactory
```

A new producer from a [`ReplayFactory`](#AttemptBody.ReplayFactory).

::Anchor{id="BodyWriteOutcome"}

## `BodyWriteOutcome`

```silk
pub union BodyWriteOutcome
```

The result of [`writeBody`](#writeBody).

::Anchor{id="BodyWriteOutcome.Completed"}

### `Completed`

```silk
Completed
```

The body was sent, and a final response arrived.

::Anchor{id="BodyWriteOutcome.Completed.status"}

#### Field `status`

```silk
pub status: u16
```

The status of the final response.

::Anchor{id="BodyWriteOutcome.EarlyFinal"}

### `EarlyFinal`

```silk
EarlyFinal
```

With `Require100`, a final response arrived before the body was sent.

::Anchor{id="BodyWriteOutcome.EarlyFinal.status"}

#### Field `status`

```silk
pub status: u16
```

The status of the final response.

::Anchor{id="Attempt"}

## `Attempt`

```silk
pub service Attempt<'policy, P, A, E, ?R>
```

The service that an [`AttemptClient`](#AttemptClient) calls with the exchange of one attempt.

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

Connects and runs one attempt of a redirect operation.

### When to use
Implement it to give your own connections to the `with*Response` functions. It hides the
sockets, TLS, proxy credentials, and pools from the redirect code.

### Details
`withAttempt` selects the route for the URI of `request`, prepares a new request, connects
before the deadline, and runs one `withExchange` of `silk.http_exchange`. It gives the exchange
to the redirect code through [`Attempt`](#Attempt). Errors from the connection come back as
`AcquisitionError`.

### Gotchas
The implementation must close or release its transport after the handler returns, fails, or is
cancelled. It must not keep the request, the transport, or the exchange.

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

The service that a [`HybridAttemptClient`](#HybridAttemptClient) calls with the exchange of one attempt.

### Details
A routed client calls `handleRouted`, and a direct client calls `handleDirect`. The exchange
cannot be kept after the call.

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

Handles the exchange of one attempt over a route.

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

Handles the exchange of one attempt over a direct connection.

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

Connects and runs one attempt of a redirect operation, over a proxy route or a direct
connection. Implement it to give your own connections to the `with*HybridResponse` functions.

### Details
The client selects the form before it connects, and calls one handler. A direct connection
cannot open a `CONNECT` tunnel.

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

Handles the final response of a redirect operation.

### When to use
Give it to a `with*Response` function. It reads the final response while the exchange is open.

### Details
`uri` is the final URI, and `hop` the number of redirects. The URI and the exchange cannot be
kept after the call.

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

Handles the final response.

::Anchor{id="HybridResponseHandler"}

## `HybridResponseHandler`

```silk
pub interface HybridResponseHandler<RoutedP, DirectP, A, E, ?R>
```

Handles the final response of a redirect operation, over a proxy route or a direct connection.
It reads the final response while the exchange is open. The URI and the exchange cannot be kept
after the call.

### When to use
Give it to a `with*HybridResponse` function.

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

Handles the final response over a route.

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

Handles the final response over a direct connection.

::Anchor{id="SelectedBody"}

## `SelectedBody`

```silk
pub service SelectedBody<E, ?R>
```

The body of the current attempt. It exists only during the attempt.

::Anchor{id="SelectedBody.pull"}

### Operation `pull`

```silk
effect fn pull(output: &mut [u8]) -> BodyChunk ! E ? R | &mut SelectedBody<E, R>
```

Writes the next bytes of the body to the start of `output`.

::Anchor{id="AttemptStep"}

## `AttemptStep`

```silk
pub union AttemptStep<'policy, A>
```

The result of one attempt. Only the redirect code makes and reads it.

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

Follows redirects for a request without a body, and gives the final response to `handler`.

### Details
Each attempt is a new request with the same deadline. The body of each redirect response is
closed or drained as `policy` says. `handler` runs one time, and only if a final response
arrives.

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

Follows redirects for a request without a body, and gives the final response to `handler`, with
a client that can use a proxy route or a direct connection.

### Details
Each attempt is a new request with the same deadline. The body of each redirect response is
closed or drained as `policy` says. `handler` runs one time, and only if a final response
arrives.

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

Follows redirects for a request with the body `bytes`, and gives the final response to
`handler`.

### Details
Each attempt that keeps the body sends `bytes` from the start. After a redirect that drops the
body, all later attempts have no body. A body that is not empty needs a scratch buffer that is
not empty.

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

Follows redirects for a request with the body `bytes`, and gives the final response to
`handler`, with a client that can use a proxy route or a direct connection.

### Details
Each attempt that keeps the body sends `bytes` from the start. After a redirect that drops the
body, all later attempts have no body. A body that is not empty needs a scratch buffer that is
not empty.

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

Follows redirects for a request whose body comes from a producer that runs one time.

### When to use
Use it when the body cannot be made again, for example a stream.

### Details
The first attempt uses the producer, also when `Require100` gets an early final response. A
later redirect that keeps the body fails with `ReplayUnavailable`. A redirect that drops the
body continues without it.

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

Follows redirects for a request whose body comes from a producer that runs one time, with a
client that can use a proxy route or a direct connection.

### When to use
Use it when the body cannot be made again, for example a stream.

### Details
The first attempt uses the producer, also when `Require100` gets an early final response. A
later redirect that keeps the body fails with `ReplayUnavailable`. A redirect that drops the
body continues without it.

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

Follows redirects for a request whose body comes from a new producer for each attempt.

### When to use
Use it for a body that you can read again, such as a file, with a [`ReplayFactory`](#ReplayFactory).

### Details
Each producer lives for one attempt. After a redirect that drops the body, the factory is not
used again.

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

Follows redirects for a request whose body comes from a new producer for each attempt, with a
client that can use a proxy route or a direct connection.

### When to use
Use it for a body that you can read again, such as a file, with a [`ReplayFactory`](#ReplayFactory).

### Details
Each producer lives for one attempt. After a redirect that drops the body, the factory is not
used again.

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

Sends the head and the body of one attempt, and reads until the first final response.

### When to use
Use it in the exchange callback of an attempt client, with the [`AttemptBody`](#AttemptBody) of the attempt.

### Details
The framing of the body is checked before the head is sent. With `Require100`, 1xx responses are
read until 100 Continue, or until a final response, which returns `EarlyFinal`. Redirected
requests cannot have trailers, so `trailers` must be empty. Each chunk must fit in `scratch`.

### Gotchas
`scratch` must not be empty for a body with a length or chunks. A pull that returns 0 bytes and
not `end` fails. An early final response uses up a `OneShot` producer, also when it was never
pulled.

::Anchor{id="StatusDecision"}

## `StatusDecision`

```silk
pub enum StatusDecision
```

The result of [`statusDecision`](#statusDecision).

::Anchor{id="StatusDecision.Final"}

### `Final`

```silk
Final
```

Return this response. `Location` is not read.

::Anchor{id="StatusDecision.Redirect"}

### `Redirect`

```silk
Redirect
```

Follow the redirect.

::Anchor{id="BodyDecision"}

## `BodyDecision`

```silk
pub enum BodyDecision
```

Whether the next request sends the body again.

::Anchor{id="BodyDecision.Retain"}

### `Retain`

```silk
Retain
```

Send the body again. The body must be repeatable.

::Anchor{id="BodyDecision.Drop"}

### `Drop`

```silk
Drop
```

Do not send the body, and remove the content headers.

::Anchor{id="Transition"}

## `Transition`

```silk
pub struct Transition<'method>
```

The method and the body of the next request, from [`transition`](#transition).

::Anchor{id="Transition.method-2"}

### Field `method`

```silk
pub method: Method<'method>
```

The next method: the same method, or GET.

::Anchor{id="Transition.body"}

### Field `body`

```silk
pub body: BodyDecision
```

Whether the body is sent again.

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

Returns an empty list. It does not allocate.

::Anchor{id="NameList.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(names: &[string], limits: NameListLimits) -> Result<NameList, RedirectError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Checks and copies `names` into a new list. Each name must be a valid field name.

::Anchor{id="NameList.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, name: string) -> bool
```

Returns `true` if the list has `name`, compared without case.

::Anchor{id="NameList.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of names.

::Anchor{id="NameList.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the memory of the list, in bytes.

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

Returns a policy that does not follow redirects.

#### Details
It allows 10 redirects, URIs of 8192 bytes, and a history of 90112 bytes, if you change the
mode to `Follow`. It denies a change of origin and a change from HTTPS to HTTP, keeps POST for
301 and 302, and closes redirect responses. The name lists are empty.

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

Returns a policy.

`safeCustom` names extra headers that can go to another origin. `sensitive` names headers that
never go to another origin.

#### Errors
- `NameListOverlap` if a name is in both lists.
- `InvalidPolicy` if `maxHops` plus 1 overflows.

::Anchor{id="Policy.impl.mode"}

### Method `mode`

```silk
pub fn mode(self: &Self) -> Mode
```

Returns whether redirects are followed.

::Anchor{id="Policy.impl.historyLimits"}

### Method `historyLimits`

```silk
pub fn historyLimits(self: &Self) -> HistoryLimits
```

Returns the limits.

::Anchor{id="Policy.impl.crossOrigin"}

### Method `crossOrigin`

```silk
pub fn crossOrigin(self: &Self) -> CrossOriginPolicy
```

Returns whether a redirect can go to another origin.

::Anchor{id="Policy.impl.downgrade"}

### Method `downgrade`

```silk
pub fn downgrade(self: &Self) -> DowngradePolicy
```

Returns whether a redirect can go from HTTPS to HTTP.

::Anchor{id="Policy.impl.post301302"}

### Method `post301302`

```silk
pub fn post301302(self: &Self) -> Post301302Policy
```

Returns what 301 and 302 do with POST.

::Anchor{id="Policy.impl.previousResponse"}

### Method `previousResponse`

```silk
pub fn previousResponse(self: &Self) -> &PreviousResponsePolicy
```

Returns what to do with the body of a redirect response.

::Anchor{id="Policy.impl.safeCustom"}

### Method `safeCustom`

```silk
pub fn safeCustom(self: &Self) -> &NameList
```

Returns the extra headers that can go to another origin.

::Anchor{id="Policy.impl.sensitive"}

### Method `sensitive`

```silk
pub fn sensitive(self: &Self) -> &NameList
```

Returns the headers that never go to another origin.

::Anchor{id="statusDecision"}

## `statusDecision`

```silk
pub fn statusDecision(policy: &Policy, status: Status, followedHops: usize) -> Result<
  StatusDecision,
  RedirectError,
>
```

Returns whether a response with `status` is a redirect to follow. It does not read `Location`.

The statuses 301, 302, 303, 307, and 308 are followed in `Follow` mode. Fails with `HopLimit` if
`followedHops` is already `maxHops`.

::Anchor{id="transition"}

## `transition`

```silk
pub fn transition<'method>(policy: &Policy, status: Status, method: Method<'method>) -> Transition<
  'method,
>
```

Returns the method and the body of the next request, by the rules of RFC 9110 and the policy.

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

Returns the next URI, from the `Location` field of the response.

### When to use
Use it while the response head is still available, before you connect to the next origin.

### Details
There must be exactly one `Location` field. Its value is resolved against `current` by RFC 3986,
and must be an `http` or `https` URI with a host and without user information. If it has no
fragment, it gets the fragment of `current`.

### Gotchas
An empty fragment, as in `/a#`, replaces the fragment of `current`.

::Anchor{id="admitOrigin"}

## `admitOrigin`

```silk
pub fn admitOrigin(policy: &Policy, current: &Origin, next: &Origin, hop: usize, status: Status) -> Result<
  bool,
  RedirectError,
>
```

Checks the cross-origin and downgrade rules for a redirect from `current` to `next`. Returns
`true` if the origin changes, so that the next request must use [`crossOriginHeaderPolicy`](#crossOriginHeaderPolicy) and
[`sanitizeHeaders`](#sanitizeHeaders).

::Anchor{id="History"}

## `History`

```silk
pub struct History
```

The requests of a redirect operation, to find loops. It allocates its memory one time.

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

Returns an empty history, and allocates all its memory before any network I/O.

::Anchor{id="History.impl.insert"}

### Method `insert`

```silk
pub effect fn insert<'method>(self: &mut Self, method: Method<'method>, origin: Origin, uri: &Uri) -> Result<
    (),
    RedirectError,
  > ! OutOfMemoryError ? &mut Allocator
```

Adds a request, by its method, origin, path, and query. Fails with `RedirectLoop` if the same
request is already in the history.

::Anchor{id="History.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of requests in the history.

::Anchor{id="History.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the bytes of the history that are used.

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

Returns a copy of `headers` without the headers that must not go to the next request.

### When to use
Use it before you prepare the request of each redirect.

### Details
It removes `Host`, `Connection`, `Keep-Alive`, `TE`, `Trailer`, `Transfer-Encoding`, `Upgrade`,
`Proxy-Connection`, `Proxy-Authorization`, `Content-Length`, `Expect`, and the fields that
`Connection` names. When the body is dropped, it also removes the content headers. For another
origin, it keeps only `Accept`, `Accept-Encoding`, `Accept-Language`, `User-Agent`, the safe
names of the policy, and the content headers of a kept body. Then `Authorization`, `Cookie`,
`Origin`, `Referer`, and the sensitive names of the policy are always removed.

### Gotchas
The request preparation makes `Host`, the framing fields, `Expect`, and `Proxy-Authorization`
again for the next request. A bad `Connection` value fails with its `ValueError`.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
