Bounded one-shot HTTP delivery over redirects, content decoding, routing, and pooling.

## When to use

Use the `toSink*` operations for sequential external delivery, `collect*` for bounded atomic
in-memory results, and `discard*` for explicit bounded validation without retaining a body.
Select the suffix matching the request body's replay authority.

## Details

Fetch owns no transport policy. A [`FetchClient`](#FetchClient) supplies routed or pooled attempts under one
unchanged deadline, `silk.http_redirect` owns redirect and source authority, and
`silk.http_exchange` owns response framing and content provenance. Every public destination is
finite, and every completed result owns the metadata that outlives the live response.

Import as `Fetch` with `import silk.http_fetch { Fetch }`.

Public declarations: 30.

::Anchor{id="PoolMode"}

## `PoolMode`

```silk
pub enum PoolMode
```

Whether connection acquisition may use the compatible pool retained by the client context.

::Anchor{id="PoolMode.UseContextPool"}

### `UseContextPool`

```silk
UseContextPool
```

Uses a compatible context pool when present and otherwise opens a fresh connection.

::Anchor{id="PoolMode.Fresh"}

### `Fresh`

```silk
Fresh
```

Always opens a fresh connection and never checks out or publishes through a pool.

::Anchor{id="ProxyMode"}

## `ProxyMode`

```silk
pub enum ProxyMode
```

Whether acquisition uses configured routing or bypasses it for this operation.

::Anchor{id="ProxyMode.InheritContext"}

### `InheritContext`

```silk
InheritContext
```

Recomputes only the explicit client-context proxy policy for every redirect origin.

::Anchor{id="ProxyMode.Direct"}

### `Direct`

```silk
Direct
```

Uses direct routing without environment lookup.

::Anchor{id="FetchPhase"}

## `FetchPhase`

```silk
pub enum FetchPhase
```

The one-shot operation phase associated with bounded fetch-owned context.

::Anchor{id="FetchPhase.Uri"}

### `Uri`

```silk
Uri
```

Semantic URI admission or copying.

::Anchor{id="FetchPhase.Route"}

### `Route`

```silk
Route
```

Per-origin route selection.

::Anchor{id="FetchPhase.Connect"}

### `Connect`

```silk
Connect
```

Pool checkout, resolution, connection, or TLS acquisition.

::Anchor{id="FetchPhase.Request"}

### `Request`

```silk
Request
```

Request preparation or upload.

::Anchor{id="FetchPhase.Redirect"}

### `Redirect`

```silk
Redirect
```

Redirect policy and intermediate-response handling.

::Anchor{id="FetchPhase.Head"}

### `Head`

```silk
Head
```

Final response-head selection or copying.

::Anchor{id="FetchPhase.Decode"}

### `Decode`

```silk
Decode
```

Content selection, decoding, framing, or trailer validation.

::Anchor{id="FetchPhase.Destination"}

### `Destination`

```silk
Destination
```

Sink, collection, or discard delivery.

::Anchor{id="FetchPhase.Finish"}

### `Finish`

```silk
Finish
```

Explicit response completion and reuse decision.

::Anchor{id="FetchLimit"}

## `FetchLimit`

```silk
pub enum FetchLimit
```

The independent finite fetch resource that rejected a value.

::Anchor{id="FetchLimit.EncodedBodyBytes"}

### `EncodedBodyBytes`

```silk
EncodedBodyBytes
```

Deframed representation input accepted by the content layer.

::Anchor{id="FetchLimit.DeliveredBodyBytes"}

### `DeliveredBodyBytes`

```silk
DeliveredBodyBytes
```

Representation bytes successfully accepted by the destination.

::Anchor{id="FetchLimit.OwnedMetadataBytes"}

### `OwnedMetadataBytes`

```silk
OwnedMetadataBytes
```

URI, head, and trailer payload plus owned index storage.

::Anchor{id="FetchLimit.BufferedBytes"}

### `BufferedBytes`

```silk
BufferedBytes
```

The positive scratch buffer used for response delivery.

::Anchor{id="FetchLimit.CollectionBytes"}

### `CollectionBytes`

```silk
CollectionBytes
```

Bytes retained by a collection destination.

::Anchor{id="FetchLimit.DiscardBytes"}

### `DiscardBytes`

```silk
DiscardBytes
```

Bytes validated by a discard destination.

::Anchor{id="FetchContentReason"}

## `FetchContentReason`

```silk
pub union FetchContentReason
```

An owned isomorphic form of a content failure whose unsupported token cannot borrow the head.

::Anchor{id="FetchContentReason.InvalidLimit"}

### `InvalidLimit`

```silk
InvalidLimit
```

A content configuration or byte count exceeds its admitted range.

::Anchor{id="FetchContentReason.InvalidLimit.limit"}

#### Field `limit`

```silk
pub limit: ContentLimitKind
```

The rejected configuration or byte class.

::Anchor{id="FetchContentReason.InvalidLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The applicable maximum.

::Anchor{id="FetchContentReason.InvalidLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The rejected value or count.

::Anchor{id="FetchContentReason.CodingSyntax"}

### `CodingSyntax`

```silk
CodingSyntax
```

A Content-Encoding element is empty or malformed.

::Anchor{id="FetchContentReason.CodingSyntax.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The exact location of the invalid token or byte.

::Anchor{id="FetchContentReason.UnsupportedCoding"}

### `UnsupportedCoding`

```silk
UnsupportedCoding
```

A valid coding name has no selected decoder; the exact token is independently owned.

::Anchor{id="FetchContentReason.UnsupportedCoding.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The token position in the original response.

::Anchor{id="FetchContentReason.UnsupportedCoding.token"}

#### Field `token`

```silk
pub token: Bytes
```

An owned copy of the exact unsupported token.

::Anchor{id="FetchContentReason.PartialResponse"}

### `PartialResponse`

```silk
PartialResponse
```

A partial response selected a nonidentity decoder.

::Anchor{id="FetchContentReason.PartialResponse.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The first nonidentity coding in wire order.

::Anchor{id="FetchContentReason.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The response body is a protocol tunnel rather than a representation.

::Anchor{id="FetchContentReason.Body"}

### `Body`

```silk
Body
```

HTTP framing rejected the response body.

::Anchor{id="FetchContentReason.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The original body error, including committed wire progress.

::Anchor{id="FetchContentReason.Buffer"}

### `Buffer`

```silk
Buffer
```

Buffered input or its transport failed.

::Anchor{id="FetchContentReason.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The original buffer error and its transport cause.

::Anchor{id="FetchContentReason.Inflate"}

### `Inflate`

```silk
Inflate
```

Gzip or zlib decoding failed.

::Anchor{id="FetchContentReason.Inflate.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="FetchContentReason.Inflate.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="FetchContentReason.Inflate.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The exact inflate failure and decoder-call progress.

::Anchor{id="FetchContentReason.Zstandard"}

### `Zstandard`

```silk
Zstandard
```

Zstandard decoding failed.

::Anchor{id="FetchContentReason.Zstandard.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="FetchContentReason.Zstandard.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="FetchContentReason.Zstandard.error"}

#### Field `error`

```silk
pub error: ZstdError
```

The exact Zstandard failure and decoder-call progress.

::Anchor{id="FetchContentReason.TrailingEncodedData"}

### `TrailingEncodedData`

```silk
TrailingEncodedData
```

A finished coding stream had additional encoded bytes.

::Anchor{id="FetchContentReason.TrailingEncodedData.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="FetchContentReason.TrailingEncodedData.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="FetchContentReason.ArithmeticOverflow"}

### `ArithmeticOverflow`

```silk
ArithmeticOverflow
```

Checked content accounting overflowed.

::Anchor{id="FetchContentReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The content reader was already failed or abandoned.

::Anchor{id="FetchContentError"}

## `FetchContentError`

```silk
pub struct FetchContentError
```

Exact owned content-failure coordinates safe to return after the response head is released.

::Anchor{id="FetchContentError.reason"}

### Field `reason`

```silk
pub reason: FetchContentReason
```

The owned failure category and original lower-level cause.

::Anchor{id="FetchContentError.written"}

### Field `written`

```silk
pub written: usize
```

Bytes written into the current provisional output chunk.

::Anchor{id="FetchContentError.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

Cumulative deframed encoded bytes accepted.

::Anchor{id="FetchContentError.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

Cumulative nonfinal decoder-stage output.

::Anchor{id="FetchContentError.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

Cumulative selected-representation output.

::Anchor{id="FetchReason"}

## `FetchReason`

```silk
pub union FetchReason
```

A fetch-owned admission, limit, or unsupported-response reason.

::Anchor{id="FetchReason.InvalidOptions"}

### `InvalidOptions`

```silk
InvalidOptions
```

One or more finite options are inconsistent or outside their admitted domain.

::Anchor{id="FetchReason.InvalidHttpOptions"}

### `InvalidHttpOptions`

```silk
InvalidHttpOptions
```

The supplied HTTP connection limits failed their owning client's pre-contact admission.

::Anchor{id="FetchReason.InvalidHttpOptions.error"}

#### Field `error`

```silk
pub error: ExchangeError
```

The client's original pre-contact admission failure.

::Anchor{id="FetchReason.HttpValue"}

### `HttpValue`

```silk
HttpValue
```

HTTP value copying failed while Fetch owned the final-head boundary.

::Anchor{id="FetchReason.HttpValue.error"}

#### Field `error`

```silk
pub error: ValueError
```

The original HTTP value validation or copying failure.

::Anchor{id="FetchReason.HttpBody"}

### `HttpBody`

```silk
HttpBody
```

HTTP body or trailer validation failed after final-response selection.

::Anchor{id="FetchReason.HttpBody.error"}

#### Field `error`

```silk
pub error: BodyError
```

The original body or trailer validation failure.

::Anchor{id="FetchReason.HttpClient"}

### `HttpClient`

```silk
HttpClient
```

The streaming client failed inside Fetch's final-response delivery boundary.

::Anchor{id="FetchReason.HttpClient.error"}

#### Field `error`

```silk
pub error: ExchangeError
```

The original final-response client failure.

::Anchor{id="FetchReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked accounting cannot represent the required total.

::Anchor{id="FetchReason.DestinationRejected"}

### `DestinationRejected`

```silk
DestinationRejected
```

A caller-defined sink rejected the current offered chunk.

::Anchor{id="FetchReason.Content"}

### `Content`

```silk
Content
```

Content selection failed; borrowed coding tokens are copied into bounded owned storage.

::Anchor{id="FetchReason.Content.error"}

#### Field `error`

```silk
pub error: FetchContentError
```

The owned content failure, including coding coordinates and byte totals.

::Anchor{id="FetchReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

One independent finite resource would exceed its inclusive limit.

::Anchor{id="FetchReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: FetchLimit
```

The resource whose bound was reached.

::Anchor{id="FetchReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The inclusive admitted maximum.

::Anchor{id="FetchReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The rejected cumulative value.

::Anchor{id="FetchReason.UnsupportedSwitchingResponse"}

### `UnsupportedSwitchingResponse`

```silk
UnsupportedSwitchingResponse
```

The final response would require transferring duplex protocol authority.

::Anchor{id="FetchReason.UnsupportedSwitchingResponse.status"}

#### Field `status`

```silk
pub status: Status
```

The final protocol-switching or successful CONNECT status.

::Anchor{id="FetchError"}

## `FetchError`

```silk
pub struct FetchError
```

Safe independently owned failure context added by the one-shot boundary.

::Anchor{id="FetchError.phase"}

### Field `phase`

```silk
pub phase: FetchPhase
```

The operation phase that rejected the value or observed the failure.

::Anchor{id="FetchError.reason"}

### Field `reason`

```silk
pub reason: FetchReason
```

The stable fetch-owned failure category.

::Anchor{id="FetchError.status"}

### Field `status`

```silk
pub status: Option<Status>
```

Final status when it is known without retaining the response owner.

::Anchor{id="FetchError.uri"}

### Field `uri`

```silk
pub uri: Option<OwnedUri>
```

Independently copied current URI when bounded context is available.

::Anchor{id="FetchError.deliveredBodyBytes"}

### Field `deliveredBodyBytes`

```silk
pub deliveredBodyBytes: u64
```

Bytes accepted by the destination before the failing operation.

::Anchor{id="FetchError.offeredBodyBytes"}

### Field `offeredBodyBytes`

```silk
pub offeredBodyBytes: usize
```

Current chunk length offered to a failing destination, otherwise zero.

::Anchor{id="DestinationFailure"}

## `DestinationFailure`

```silk
pub struct DestinationFailure<E>
```

A typed sink failure paired with only fetch-known delivery progress.

::Anchor{id="DestinationFailure.error"}

### Field `error`

```silk
pub error: E
```

The original caller-defined sink failure.

::Anchor{id="DestinationFailure.context"}

### Field `context`

```silk
pub context: FetchError
```

Bounded destination context excluding claims about partial external effects.

::Anchor{id="RepresentationMetadata"}

## `RepresentationMetadata`

```silk
pub struct RepresentationMetadata
```

Representation policy selected from the final wire response.

::Anchor{id="RepresentationMetadata.applied"}

### Field `applied`

```silk
pub applied: AppliedPlan
```

The exact applied Raw or Decode plan and coding counts.

::Anchor{id="RepresentationMetadata.completed"}

### Field `completed`

```silk
pub completed: bool
```

Whether framing and every selected content stage completed successfully.

::Anchor{id="RepresentationMetadata.deliveredBytes"}

### Field `deliveredBytes`

```silk
pub deliveredBytes: Option<u64>
```

Final delivered representation bytes, available only after completion.

::Anchor{id="ResponseMetadata"}

## `ResponseMetadata`

```silk
pub struct ResponseMetadata
```

Immutable owned header-only metadata lent before each body chunk.

::Anchor{id="ResponseMetadata.finalUri"}

### Field `finalUri`

```silk
pub finalUri: OwnedUri
```

The independently owned final URI.

::Anchor{id="ResponseMetadata.head"}

### Field `head`

```silk
pub head: OwnedResponseHead
```

The independently owned final status, reason, and ordered wire headers.

::Anchor{id="ResponseMetadata.representation"}

### Field `representation`

```silk
pub representation: RepresentationMetadata
```

Content-plan provenance separate from unchanged wire headers.

::Anchor{id="ResponseMetadata.ownedBytes"}

### Field `ownedBytes`

```silk
pub ownedBytes: usize
```

Counted URI and head payload plus owned index storage.

::Anchor{id="FetchResult"}

## `FetchResult`

```silk
pub struct FetchResult
```

One verified completed response without retained body bytes.

::Anchor{id="FetchResult.metadata"}

### Field `metadata`

```silk
pub metadata: ResponseMetadata
```

Final owned header metadata.

::Anchor{id="FetchResult.trailers"}

### Field `trailers`

```silk
pub trailers: Option<OwnedTrailers>
```

Final ordered trailers copied only after content completion.

::Anchor{id="FetchResult.redirectCount"}

### Field `redirectCount`

```silk
pub redirectCount: usize
```

Number of redirects followed before this response.

::Anchor{id="FetchResult.encodedBodyBytes"}

### Field `encodedBodyBytes`

```silk
pub encodedBodyBytes: u64
```

Deframed encoded representation bytes accepted by the content layer.

::Anchor{id="FetchResult.deliveredBodyBytes"}

### Field `deliveredBodyBytes`

```silk
pub deliveredBodyBytes: u64
```

Representation bytes successfully accepted by the destination.

::Anchor{id="FetchResult.ownedMetadataBytes"}

### Field `ownedMetadataBytes`

```silk
pub ownedMetadataBytes: usize
```

URI, head, and trailer payload plus owned index storage.

::Anchor{id="CollectedResponse"}

## `CollectedResponse`

```silk
pub struct CollectedResponse
```

One atomically published bounded in-memory response.

::Anchor{id="CollectedResponse.result"}

### Field `result`

```silk
pub result: FetchResult
```

The verified completed response metadata and counters.

::Anchor{id="CollectedResponse.body"}

### Field `body`

```silk
pub body: Bytes
```

The complete selected representation body.

::Anchor{id="FetchRequest"}

## `FetchRequest`

```silk
pub struct FetchRequest<'uri, 'method, 'headers, 'policy>
```

A semantic request whose body authority is supplied by one source-specific operation.

::Anchor{id="FetchRequest.impl"}

## Implementation `FetchRequest<'uri, 'method, 'headers, 'policy>`

```silk
impl<'uri, 'method, 'headers, 'policy> FetchRequest<'uri, 'method, 'headers, 'policy>
```

::Anchor{id="FetchRequest.impl.make"}

### Associated function `make`

```silk
pub fn make(
    uri: Uri<'uri>,
    method: Method<'method>,
    headers: Headers<'headers>,
    headerPolicy: HeaderPolicy<'policy>,
    version: Version,
    continuePolicy: ContinuePolicy,
    limits: HeaderLimits,
    maxHeadBytes: usize,
    maxCredentialBytes: usize,
  ) -> Self
```

Constructs a semantic request while preserving its explicit method and ordered headers.

::Anchor{id="FetchRequest.impl.get"}

### Associated function `get`

```silk
pub fn get(uri: Uri<'uri>) -> Self
```

Constructs GET with empty caller headers and the standard request policy and limits.

::Anchor{id="FetchOptions"}

## `FetchOptions`

```silk
pub struct FetchOptions
```

Finite one-shot policies admitted before route selection or transport contact.

::Anchor{id="FetchOptions.redirect"}

### Field `redirect`

```silk
pub redirect: RedirectPolicy
```

Redirect policy, including Manual or Follow behavior and intermediate-response bounds.

::Anchor{id="FetchOptions.content"}

### Field `content`

```silk
pub content: ContentMode
```

Raw or decoded representation selection.

::Anchor{id="FetchOptions.pool"}

### Field `pool`

```silk
pub pool: PoolMode
```

Compatible context-pool or forced-fresh acquisition.

::Anchor{id="FetchOptions.proxy"}

### Field `proxy`

```silk
pub proxy: ProxyMode
```

Explicit client-context routing or forced direct routing.

::Anchor{id="FetchOptions.deadline"}

### Field `deadline`

```silk
pub deadline: Option<Instant>
```

One optional absolute operation deadline, never renewed between phases or hops.

::Anchor{id="FetchOptions.http"}

### Field `http`

```silk
pub http: ClientLimits
```

Existing finite HTTP parser, framing, trailer, and transport-buffer limits.

::Anchor{id="FetchOptions.contentLimits"}

### Field `contentLimits`

```silk
pub contentLimits: ContentLimits
```

Existing finite content planning and codec limits.

::Anchor{id="FetchOptions.maxEncodedBodyBytes"}

### Field `maxEncodedBodyBytes`

```silk
pub maxEncodedBodyBytes: u64
```

Additional inclusive encoded representation allowance.

::Anchor{id="FetchOptions.maxDeliveredBodyBytes"}

### Field `maxDeliveredBodyBytes`

```silk
pub maxDeliveredBodyBytes: u64
```

Inclusive representation bytes accepted by any destination.

::Anchor{id="FetchOptions.maxOwnedMetadataBytes"}

### Field `maxOwnedMetadataBytes`

```silk
pub maxOwnedMetadataBytes: usize
```

Inclusive owned URI, head, and trailer payload-plus-index allowance.

::Anchor{id="FetchOptions.maxBufferedBytes"}

### Field `maxBufferedBytes`

```silk
pub maxBufferedBytes: usize
```

Positive per-read response delivery scratch capacity.

::Anchor{id="FetchOptions.impl"}

## Implementation `FetchOptions`

```silk
impl FetchOptions
```

::Anchor{id="FetchOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> FetchOptions
```

Returns Manual, Raw, context-pool, inherited-route policy with finite standard limits.

::Anchor{id="FetchOptions.impl.validate"}

### Method `validate`

```silk
pub fn validate(self: &Self) -> Result<(), FetchError>
```

Checks local capacities and content configuration without allocation or provider access.

::Anchor{id="Fetch"}

## `Fetch`

```silk
pub struct Fetch<C>
```

An owned target-neutral facade around one explicit acquisition context.

::Anchor{id="Fetch.impl"}

## Implementation `Fetch<C>`

```silk
impl<C> Fetch<C>
```

::Anchor{id="Fetch.impl.make"}

### Associated function `make`

```silk
pub fn make(client: C) -> Fetch<C>
```

Seals one caller-supplied client context into a fetch facade.

::Anchor{id="Sink"}

## `Sink`

```silk
pub interface Sink<E, ?R>
```

A sequential effectful destination whose metadata and current chunk loans cannot escape.

::Anchor{id="Sink.write"}

### Operation `write`

```silk
effect<'call> fn write<'call>(
    sink: &mut Self,
    metadata: &'call ResponseMetadata,
    chunk: &'call [u8],
    deadline: &'call Option<Instant>,
  ) -> () ! E ? R
```

Accepts the complete offered chunk under the unchanged operation deadline.

#### Details

`deadline` is the original absolute fetch deadline. `None` permits an unbounded wait. The
callback must return before Fetch reads or offers another chunk.

::Anchor{id="FetchClient"}

## `FetchClient`

```silk
pub interface FetchClient<
  'policy,
  RoutedP,
  DirectP,
  A,
  HandlerError,
  AcquisitionError,
  ?HandlerRequirements,
  ?AcquisitionRequirements,
>
```

Target-neutral routed or pooled acquisition for one current redirect attempt.

### Details

Implementations admit options before contact, recompute routes for the current request URI, and
lend exactly one scoped exchange. `deadline` is the unchanged operation deadline. `Fresh` never
consults a pool, and `Direct` never consults configured or ambient proxy policy.

::Anchor{id="FetchClient.withAttempt"}

### Operation `withAttempt`

```silk
effect fn withAttempt(
    client: &mut Self,
    request: AttemptRequest<'policy>,
    httpLimits: ClientLimits,
    poolMode: PoolMode,
    proxyMode: ProxyMode,
    deadline: Option<Instant>,
  ) -> A ! HandlerError | AcquisitionError ? HandlerRequirements | AcquisitionRequirements | &mut HybridAttempt<'policy, RoutedP, DirectP, A, HandlerError ? HandlerRequirements> where
    HandlerRequirements in Without<HandlerRequirements, ByteDuplex>,
    HandlerRequirements in Without<HandlerRequirements, HttpTransport>
```

Rebuilds and drives one scoped request under the selected acquisition modes.

::Anchor{id="toSinkEmpty"}

## `toSinkEmpty`

```silk
pub effect<'env> fn toSinkEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    SinkRequirements | &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError | AcquisitionError
? SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a body-free request and sequentially offers the selected representation to `sink`.

::Anchor{id="collectEmpty"}

## `collectEmpty`

```silk
pub effect fn collectEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a body-free request and atomically publishes a bounded in-memory body.

::Anchor{id="discardEmpty"}

## `discardEmpty`

```silk
pub effect fn discardEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a body-free request and validates an explicitly bounded discarded representation.

::Anchor{id="toSinkBytes"}

## `toSinkBytes`

```silk
pub effect<'env> fn toSinkBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    SinkRequirements | &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError | AcquisitionError
? SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a repeatable byte-body request and sequentially offers the selected representation.

::Anchor{id="collectBytes"}

## `collectBytes`

```silk
pub effect fn collectBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a repeatable byte-body request and atomically publishes a bounded body.

::Anchor{id="discardBytes"}

## `discardBytes`

```silk
pub effect fn discardBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a repeatable byte-body request and validates bounded discarded content.

::Anchor{id="toSinkOneShot"}

## `toSinkOneShot`

```silk
pub effect<'env> fn toSinkOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?ProducerRequirements,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
      SinkError,
    > | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | SinkRequirements | &mut Redirect.SelectedBody<
      ProducerError,
      ProducerRequirements,
    > | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
  SinkError,
> | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes an affine producer request and sequentially offers the selected representation.

::Anchor{id="collectOneShot"}

## `collectOneShot`

```silk
pub effect<'env> fn collectOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  AcquisitionError,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes an affine producer request and atomically publishes a bounded body.

::Anchor{id="discardOneShot"}

## `discardOneShot`

```silk
pub effect<'env> fn discardOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  AcquisitionError,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes an affine producer request and validates bounded discarded content.

::Anchor{id="toSinkReplay"}

## `toSinkReplay`

```silk
pub effect<'env> fn toSinkReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
      SinkError,
    > | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | SinkRequirements | &mut Redirect.SelectedBody<
      ProducerError,
      ProducerRequirements,
    > | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | DestinationFailure<
  SinkError,
> | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
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
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a replay-factory request and sequentially offers the selected representation.

::Anchor{id="collectReplay"}

## `collectReplay`

```silk
pub effect<'env> fn collectReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
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
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a replay-factory request and atomically publishes a bounded body.

::Anchor{id="discardReplay"}

## `discardReplay`

```silk
pub effect<'env> fn discardReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
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
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Executes a replay-factory request and validates bounded discarded content.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
