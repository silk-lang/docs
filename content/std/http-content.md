Bounded scoped HTTP response content decoding over strict body framing.

## When to use
Build a [`ResponseContext`](#ResponseContext) from one validated response head, request method, and trailer
policy, consume it into a [`CodingPlan`](#CodingPlan), then use [`withReader`](#withReader) to stream either the raw
representation or a validated reverse content-decoding stack.

## Details
Planning parses at most four content codings and performs every configuration and owned-memory
check before codec acquisition or body I/O. Readers exclusively borrow an existing
[`BufferedDuplex`](/docs/std/buffered-duplex#BufferedDuplex) for one callback. Bytes returned before [`ContentCompletion`](#ContentCompletion) are
provisional because a later wrapper checksum, trailer, or framed boundary can still fail.

## Gotchas
This low-level actor treats the body supplied to each `withReader` invocation as the encoded
representation described by the plan. It does not prove that those bytes came from the retained
head and cannot prevent a copied head from being planned over already-decoded bytes. The affine
response/body envelope in `silk.http_exchange` owns that stronger provenance and decode-once contract.
Cleanup is guaranteed for structured Effect exits, including interruption, but not for fatal
traps that bypass Effect finalizers and Drop.

Import as `ContentReader` with `import silk.http_content { ContentReader }`.

Public declarations: 25.

::Anchor{id="Mode"}

## `Mode`

```silk
pub enum Mode
```

Whether the representation is preserved or decoded.

::Anchor{id="Mode.Raw"}

### `Raw`

```silk
Raw
```

Preserves encoded representation bytes without interpreting Content-Encoding.

::Anchor{id="Mode.Decode"}

### `Decode`

```silk
Decode
```

Validates Content-Encoding and applies the supported reverse decoding stack.

::Anchor{id="Coding"}

## `Coding`

```silk
pub enum Coding
```

One recognized response content coding.

::Anchor{id="Coding.Identity"}

### `Identity`

```silk
Identity
```

Leaves representation bytes unchanged and counts toward the coding depth.

::Anchor{id="Coding.Gzip"}

### `Gzip`

```silk
Gzip
```

Decodes gzip members, including permitted concatenated members.

::Anchor{id="Coding.XGzip"}

### `XGzip`

```silk
XGzip
```

Accepts the legacy response spelling of gzip with the same decoding rules.

::Anchor{id="Coding.Deflate"}

### `Deflate`

```silk
Deflate
```

Decodes one zlib-wrapped stream; raw DEFLATE and trailing bytes fail.

::Anchor{id="Coding.Zstd"}

### `Zstd`

```silk
Zstd
```

Decodes Zstandard frames under the configured window and workspace limits.

::Anchor{id="CodingPosition"}

## `CodingPosition`

```silk
pub struct CodingPosition
```

The exact source coordinates of one coding token.

::Anchor{id="CodingPosition.wireIndex"}

### Field `wireIndex`

```silk
pub wireIndex: usize
```

The zero-based coding position across all Content-Encoding fields.

::Anchor{id="CodingPosition.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: usize
```

The zero-based header field position in the original response.

::Anchor{id="CodingPosition.elementIndex"}

### Field `elementIndex`

```silk
pub elementIndex: usize
```

The zero-based comma element within its Content-Encoding field.

::Anchor{id="CodingPosition.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset of the coding token or invalid byte within the field value.

::Anchor{id="CodingPosition.impl.Copy"}

## Implementation `Copy for CodingPosition`

```silk
impl Copy for CodingPosition
```

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The finite content, composition, and codec allowances copied into a plan.

::Anchor{id="Limits.maxEncoded"}

### Field `maxEncoded`

```silk
pub maxEncoded: u64
```

The maximum representation bytes accepted after HTTP deframing.

::Anchor{id="Limits.maxIntermediate"}

### Field `maxIntermediate`

```silk
pub maxIntermediate: u64
```

The maximum combined bytes produced by all nonfinal codec stages.

::Anchor{id="Limits.maxDecoded"}

### Field `maxDecoded`

```silk
pub maxDecoded: u64
```

The maximum final representation bytes returned to the caller.

::Anchor{id="Limits.maxOwned"}

### Field `maxOwned`

```silk
pub maxOwned: usize
```

The maximum admitted composition and codec storage reservation, excluding body-decoder storage.

::Anchor{id="Limits.maxDepth"}

### Field `maxDepth`

```silk
pub maxDepth: usize
```

The maximum coding entries, including identity; must be between one and four.

::Anchor{id="Limits.intermediateCapacity"}

### Field `intermediateCapacity`

```silk
pub intermediateCapacity: usize
```

The capacity of each active stage edge; must be between one and 65,536 bytes.

::Anchor{id="Limits.inflate"}

### Field `inflate`

```silk
pub inflate: InflateLimits
```

The limits applied independently to each gzip or zlib decoder.

::Anchor{id="Limits.zstd"}

### Field `zstd`

```silk
pub zstd: ZstdLimits
```

The limits applied independently to each Zstandard decoder.

::Anchor{id="ContentLimitKind"}

## `ContentLimitKind`

```silk
pub enum ContentLimitKind
```

The configuration or byte class rejected by the content layer.

::Anchor{id="ContentLimitKind.CodingDepth"}

### `CodingDepth`

```silk
CodingDepth
```

The permitted number of content-coding entries.

::Anchor{id="ContentLimitKind.IntermediateCapacity"}

### `IntermediateCapacity`

```silk
IntermediateCapacity
```

The finite capacity of one stage edge.

::Anchor{id="ContentLimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

The admitted composition and codec storage reservation.

::Anchor{id="ContentLimitKind.EncodedBytes"}

### `EncodedBytes`

```silk
EncodedBytes
```

The deframed representation input byte allowance.

::Anchor{id="ContentLimitKind.IntermediateBytes"}

### `IntermediateBytes`

```silk
IntermediateBytes
```

The combined output allowance for nonfinal decoding stages.

::Anchor{id="ContentLimitKind.DecodedBytes"}

### `DecodedBytes`

```silk
DecodedBytes
```

The final representation output byte allowance.

::Anchor{id="ContentReason"}

## `ContentReason`

```silk
pub union ContentReason<'head>
```

A stage-aware content, framing, transport, or codec failure.

::Anchor{id="ContentReason.InvalidLimit"}

### `InvalidLimit`

```silk
InvalidLimit
```

A configuration or byte count exceeds its permitted range.

::Anchor{id="ContentReason.InvalidLimit.limit"}

#### Field `limit`

```silk
pub limit: ContentLimitKind
```

The rejected configuration or byte class.

::Anchor{id="ContentReason.InvalidLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The applicable maximum.

::Anchor{id="ContentReason.InvalidLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The rejected value or count.

::Anchor{id="ContentReason.CodingSyntax"}

### `CodingSyntax`

```silk
CodingSyntax
```

A Content-Encoding element is empty or contains invalid syntax.

::Anchor{id="ContentReason.CodingSyntax.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The exact location of the invalid token or byte.

::Anchor{id="ContentReason.UnsupportedCoding"}

### `UnsupportedCoding`

```silk
UnsupportedCoding
```

A valid coding token names an unsupported decoder.

::Anchor{id="ContentReason.UnsupportedCoding.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The token position in the original response.

::Anchor{id="ContentReason.UnsupportedCoding.token"}

#### Field `token`

```silk
pub token: &'head [u8]
```

The untouched unsupported token borrowed from the response.

::Anchor{id="ContentReason.PartialResponse"}

### `PartialResponse`

```silk
PartialResponse
```

A 206 response selects a nonidentity coding in Decode mode.

::Anchor{id="ContentReason.PartialResponse.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The first nonidentity coding in wire order.

::Anchor{id="ContentReason.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The selected body is a protocol tunnel rather than an HTTP representation.

::Anchor{id="ContentReason.Body"}

### `Body`

```silk
Body
```

HTTP body framing failed before content completion.

::Anchor{id="ContentReason.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The original body error, including committed wire progress.

::Anchor{id="ContentReason.Buffer"}

### `Buffer`

```silk
Buffer
```

The buffered transport failed.

::Anchor{id="ContentReason.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The original buffer error and its transport cause.

::Anchor{id="ContentReason.Inflate"}

### `Inflate`

```silk
Inflate
```

A gzip or zlib decoder rejected configuration or input.

::Anchor{id="ContentReason.Inflate.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="ContentReason.Inflate.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="ContentReason.Inflate.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The exact inflate failure and decoder-call progress.

::Anchor{id="ContentReason.Zstandard"}

### `Zstandard`

```silk
Zstandard
```

A Zstandard decoder rejected configuration or input.

::Anchor{id="ContentReason.Zstandard.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="ContentReason.Zstandard.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="ContentReason.Zstandard.error"}

#### Field `error`

```silk
pub error: ZstdError
```

The exact Zstandard failure and decoder-call progress.

::Anchor{id="ContentReason.TrailingEncodedData"}

### `TrailingEncodedData`

```silk
TrailingEncodedData
```

A finished coding stream has additional encoded bytes.

::Anchor{id="ContentReason.TrailingEncodedData.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The zero-based reverse application stage.

::Anchor{id="ContentReason.TrailingEncodedData.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The original coding position in wire order.

::Anchor{id="ContentReason.ArithmeticOverflow"}

### `ArithmeticOverflow`

```silk
ArithmeticOverflow
```

A checked byte or reservation calculation cannot represent its result.

::Anchor{id="ContentReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The reader previously failed or was abandoned.

::Anchor{id="ContentError"}

## `ContentError`

```silk
pub struct ContentError<'head>
```

Exact per-call and cumulative coordinates for a content failure.

::Anchor{id="ContentError.reason"}

### Field `reason`

```silk
pub reason: ContentReason<'head>
```

The exact failure category and its lower-level cause when available.

::Anchor{id="ContentError.written"}

### Field `written`

```silk
pub written: usize
```

The representation bytes written to the caller destination during this read.

::Anchor{id="ContentError.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

The cumulative representation bytes accepted after HTTP deframing.

::Anchor{id="ContentError.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

The cumulative output bytes accepted from all nonfinal codec stages.

::Anchor{id="ContentError.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

The cumulative representation bytes written to caller destinations.

::Anchor{id="ContentProgressState"}

## `ContentProgressState`

```silk
pub enum ContentProgressState
```

Whether one successful read returned data or established terminal completion.

::Anchor{id="ContentProgressState.Data"}

### `Data`

```silk
Data
```

Reports provisional output or internal progress before complete validation.

::Anchor{id="ContentProgressState.End"}

### `End`

```silk
End
```

Reports successful completion of the framed body and all content stages.

::Anchor{id="ContentProgress"}

## `ContentProgress`

```silk
pub struct ContentProgress
```

Exact per-call and cumulative committed content progress.

::Anchor{id="ContentProgress.written"}

### Field `written`

```silk
pub written: usize
```

The representation bytes written to the caller destination during this read.

::Anchor{id="ContentProgress.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

The cumulative representation bytes accepted after HTTP deframing.

::Anchor{id="ContentProgress.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

The cumulative output bytes accepted from all nonfinal codec stages.

::Anchor{id="ContentProgress.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

The cumulative representation bytes written to caller destinations.

::Anchor{id="ContentProgress.state"}

### Field `state`

```silk
pub state: ContentProgressState
```

Whether content remains provisional or has completed validation.

::Anchor{id="ReuseDisposition"}

## `ReuseDisposition`

```silk
pub enum ReuseDisposition
```

Connection reuse policy before and after positive completion evidence.

::Anchor{id="ReuseDisposition.EligibleAfterCompletion"}

### `EligibleAfterCompletion`

```silk
EligibleAfterCompletion
```

Allows reuse only after successful content completion supplies positive evidence.

::Anchor{id="ReuseDisposition.Reusable"}

### `Reusable`

```silk
Reusable
```

Confirms delimited framing, no framing anomaly, and successful content completion.

::Anchor{id="ReuseDisposition.NonReusable"}

### `NonReusable`

```silk
NonReusable
```

Forbids reuse because framing closes the connection or carries an anomaly.

::Anchor{id="AppliedPlan"}

## `AppliedPlan`

```silk
pub struct AppliedPlan
```

Public applied-plan metadata without exposing the affine plan itself.

::Anchor{id="AppliedPlan.mode"}

### Field `mode`

```silk
pub mode: Mode
```

Whether the plan preserves or decodes the representation.

::Anchor{id="AppliedPlan.codingCount"}

### Field `codingCount`

```silk
pub codingCount: usize
```

The number of parsed coding entries, including identity.

::Anchor{id="AppliedPlan.decoderCount"}

### Field `decoderCount`

```silk
pub decoderCount: usize
```

The number of active nonidentity codec stages.

::Anchor{id="AppliedPlan.reuse"}

### Field `reuse`

```silk
pub reuse: ReuseDisposition
```

The reuse disposition established by the plan or completion.

::Anchor{id="AppliedPlan.impl.Copy"}

## Implementation `Copy for AppliedPlan`

```silk
impl Copy for AppliedPlan
```

::Anchor{id="RepresentationView"}

## `RepresentationView`

```silk
pub struct RepresentationView<'owner, 'head>
```

Borrowed effective representation metadata that never rewrites wire headers.

::Anchor{id="RepresentationView.impl"}

## Implementation `RepresentationView<'owner, 'head>`

```silk
impl<'owner, 'head> RepresentationView<'owner, 'head>
```

::Anchor{id="RepresentationView.impl.originalHead"}

### Method `originalHead`

```silk
pub fn originalHead(self: &Self) -> ResponseHead<'head>
```

Returns the untouched response head with its original coding and length headers.

::Anchor{id="RepresentationView.impl.appliedPlan"}

### Method `appliedPlan`

```silk
pub fn appliedPlan(self: &Self) -> AppliedPlan
```

Returns the effective coding counts, mode, and reuse disposition.

::Anchor{id="RepresentationView.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns the exact framing anomaly selected from the original response.

::Anchor{id="RepresentationView.impl.decodingApplied"}

### Method `decodingApplied`

```silk
pub fn decodingApplied(self: &Self) -> bool
```

Returns whether at least one nonidentity content decoder was selected.

::Anchor{id="RepresentationView.impl.decodedLength"}

### Method `decodedLength`

```silk
pub fn decodedLength(self: &Self) -> Option<u64>
```

Returns the final decoded length only after completion, or zero for semantic no-body responses.

::Anchor{id="ContentCompletion"}

## `ContentCompletion`

```silk
pub struct ContentCompletion<'owner>
```

Opaque positive evidence that framing and every selected codec completed.

::Anchor{id="ContentCompletion.impl"}

## Implementation `ContentCompletion<'owner>`

```silk
impl<'owner> ContentCompletion<'owner>
```

::Anchor{id="ContentCompletion.impl.bodyKind"}

### Method `bodyKind`

```silk
pub fn bodyKind(self: &Self) -> BodyCompletionKind
```

Returns whether the completed body was delimited or ended at transport closure.

::Anchor{id="ContentCompletion.impl.decodedBytes"}

### Method `decodedBytes`

```silk
pub fn decodedBytes(self: &Self) -> u64
```

Returns the final validated representation byte count.

::Anchor{id="ContentCompletion.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns the exact framing anomaly selected from the original response.

::Anchor{id="ContentCompletion.impl.reuse"}

### Method `reuse`

```silk
pub fn reuse(self: &Self) -> ReuseDisposition
```

Returns the reuse disposition supported by this completed representation.

::Anchor{id="ResponseContext"}

## `ResponseContext`

```silk
pub struct ResponseContext<'head, 'method, 'names>
```

Atomic response-selection provenance. Its fields are intentionally private.

::Anchor{id="ResponseContext.impl"}

## Implementation `ResponseContext<'head, 'method, 'names>`

```silk
impl<'head, 'method, 'names> ResponseContext<'head, 'method, 'names>
```

::Anchor{id="ResponseContext.impl.make"}

### Associated function `make`

```silk
pub fn make(
    head: ResponseHead<'head>,
    requestMethod: Method<'method>,
    trailerPolicy: TrailerPolicy<'names>,
  ) -> Result<ResponseContext<'head, 'method, 'names>, BodyError>
```

Selects response framing and constructs no context when selection fails.

::Anchor{id="CodingPlan"}

## `CodingPlan`

```silk
pub struct CodingPlan<'head, 'method, 'names>
```

A validated single-use response plan. Construction consumes its complete context.

::Anchor{id="CodingPlan.impl"}

## Implementation `CodingPlan<'head, 'method, 'names>`

```silk
impl<'head, 'method, 'names> CodingPlan<'head, 'method, 'names>
```

::Anchor{id="CodingPlan.impl.make"}

### Associated function `make`

```silk
pub fn make(
    context: ResponseContext<'head, 'method, 'names>,
    mode: Mode,
    bodyLimits: BodyLimits,
    limits: Limits,
  ) -> Result<CodingPlan<'head, 'method, 'names>, ContentError<'head>>
```

Validates all policy and storage requirements without allocation or body I/O.

::Anchor{id="CodingPlan.impl.originalHead"}

### Method `originalHead`

```silk
pub fn originalHead(self: &Self) -> ResponseHead<'head>
```

Returns the untouched response head with its original coding and length headers.

::Anchor{id="CodingPlan.impl.selectionAnomaly"}

### Method `selectionAnomaly`

```silk
pub fn selectionAnomaly(self: &Self) -> Anomaly
```

Returns the selected framing anomaly exactly.

::Anchor{id="CodingPlan.impl.selectedFraming"}

### Method `selectedFraming`

```silk
pub fn selectedFraming(self: &Self) -> Framing
```

Returns the framing retained by atomic selection.

::Anchor{id="CodingPlan.impl.applied"}

### Method `applied`

```silk
pub fn applied(self: &Self) -> AppliedPlan
```

Returns the effective plan metadata.

::Anchor{id="CodingPlan.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the deterministic owned reservation admitted by the plan.

::Anchor{id="EnabledCodings"}

## `EnabledCodings`

```silk
pub struct EnabledCodings
```

Enabled automatic request codings. `x-gzip` is deliberately absent.

::Anchor{id="EnabledCodings.gzip"}

### Field `gzip`

```silk
pub gzip: bool
```

Enables gzip in automatic Accept-Encoding output.

::Anchor{id="EnabledCodings.deflate"}

### Field `deflate`

```silk
pub deflate: bool
```

Enables zlib-wrapped deflate in automatic Accept-Encoding output.

::Anchor{id="EnabledCodings.zstd"}

### Field `zstd`

```silk
pub zstd: bool
```

Enables zstd in automatic Accept-Encoding output.

::Anchor{id="EnabledCodings.impl.Copy"}

## Implementation `Copy for EnabledCodings`

```silk
impl Copy for EnabledCodings
```

::Anchor{id="EmptyEncodingPolicy"}

## `EmptyEncodingPolicy`

```silk
pub enum EmptyEncodingPolicy
```

The explicit automatic behavior when no decoder is enabled.

::Anchor{id="EmptyEncodingPolicy.Identity"}

### `Identity`

```silk
Identity
```

Advertises identity when automatic negotiation enables no codec.

::Anchor{id="EmptyEncodingPolicy.Omit"}

### `Omit`

```silk
Omit
```

Omits Accept-Encoding when automatic negotiation enables no codec.

::Anchor{id="AcceptEncoding"}

## `AcceptEncoding`

```silk
pub union AcceptEncoding<'value>
```

Automatic, exact borrowed override, or omitted `Accept-Encoding` policy.

::Anchor{id="AcceptEncoding.Automatic"}

### `Automatic`

```silk
Automatic
```

Advertises enabled codecs in stable gzip, deflate, zstd order for Decode mode.

::Anchor{id="AcceptEncoding.Automatic.enabled"}

#### Field `enabled`

```silk
pub enabled: EnabledCodings
```

The supported codecs to advertise.

::Anchor{id="AcceptEncoding.Automatic.empty"}

#### Field `empty`

```silk
pub empty: EmptyEncodingPolicy
```

The policy when no codec is enabled.

::Anchor{id="AcceptEncoding.Override"}

### `Override`

```silk
Override
```

Uses the caller value exactly after shared HTTP header validation.

::Anchor{id="AcceptEncoding.Override.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The borrowed field value; this value does not weaken response decoding validation.

::Anchor{id="AcceptEncoding.Omit"}

### `Omit`

```silk
Omit
```

Omits Accept-Encoding without constructing a header.

::Anchor{id="acceptEncoding"}

## `acceptEncoding`

```silk
pub fn acceptEncoding<'value>(
  mode: Mode,
  policy: AcceptEncoding<'value>,
  limits: HeaderLimits,
) -> Result<Option<Header<'value>>, ValueError>
```

Builds at most one validated `Accept-Encoding` field without mutating a request.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits<'head>(limits: &Limits) -> Result<(), ContentError<'head>>
```

Validates source-independent content limits without allocation or body I/O.

### Details

`maxDepth` must be from one through four. `intermediateCapacity` must be from one through
65,536 bytes. Other byte limits can be zero and are enforced by planning or content I/O.
Codec-specific storage validation occurs when a plan selects that codec.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

Owned framing and content state for a caller-owned wire transport.

### Details
Planning consumes borrowed metadata, but the resulting decoder owns all runtime state. The
caller retains input bytes not consumed by `step`, including the next HTTP message suffix.
A higher-level response owner must bind the plan and those wire bytes to the same response.

::Anchor{id="DecodeProgress"}

## `DecodeProgress`

```silk
pub struct DecodeProgress
```

One incremental wire-to-representation transition.

::Anchor{id="DecodeProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The exact wire prefix consumed from the supplied input.

::Anchor{id="DecodeProgress.progress"}

### Field `progress`

```silk
pub progress: ContentProgress
```

Provisional output and cumulative representation coordinates.

::Anchor{id="DecodeProgress.needsInput"}

### Field `needsInput`

```silk
pub needsInput: bool
```

Whether another wire prefix is needed before the decoder can advance.

::Anchor{id="DecodeFailure"}

## `DecodeFailure`

```silk
pub struct DecodeFailure
```

A content failure with its committed input prefix and owned runtime cause.

::Anchor{id="DecodeFailure.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The exact wire prefix consumed before the failure.

::Anchor{id="DecodeFailure.error"}

### Field `error`

```silk
pub error: ContentError<'static>
```

The original content, framing, or codec failure and output coordinates.

::Anchor{id="Decoder.impl"}

## Implementation `Decoder`

```silk
impl Decoder
```

::Anchor{id="Decoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make<'head, 'method, 'names>(plan: CodingPlan<'head, 'method, 'names>) -> Decoder
  ! ContentError<'head> | OutOfMemoryError
  ? &mut Allocator
```

Acquires the existing bounded framing and codec stack from one validated plan.

::Anchor{id="Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], endOfInput: bool) -> Result<
    DecodeProgress,
    DecodeFailure,
  >
```

Advances without I/O, retaining exact consumed and written prefixes on failure.

#### Details
`endOfInput` promises no bytes follow the supplied input. Returned representation bytes
remain provisional until `completion` confirms framing, checksums and pending output.
Empty output completes locally without consuming input or changing a live decoder.

::Anchor{id="Decoder.impl.progress"}

### Method `progress`

```silk
pub fn progress(self: &Self) -> ContentProgress
```

Reports the current cumulative representation coordinates without advancing input.

::Anchor{id="Decoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Result<
    Option<ContentCompletion<'owner>>,
    ContentError<'static>,
  >
```

Borrows successful framing and content completion from this owner.

::Anchor{id="Decoder.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(self: &'owner Self) -> Result<
    Option<Trailers<'owner>>,
    ContentError<'static>,
  >
```

Borrows trailers only after successful content and body completion.

::Anchor{id="Decoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Permanently abandons unfinished decoding without reading or draining the transport.

::Anchor{id="ContentReader"}

## `ContentReader`

```silk
pub struct ContentReader<'reader, 'transport, 'head, P>
```

One callback-scoped exclusive content reader.

::Anchor{id="ContentReader.impl"}

## Implementation `ContentReader<'reader, 'transport, 'head, P>`

```silk
impl<'reader, 'transport, 'head, P> ContentReader<'reader, 'transport, 'head, P>
```

::Anchor{id="ContentReader.impl.representation"}

### Method `representation`

```silk
pub fn representation<'owner>(
    self: &'owner Self,
  ) -> Result<RepresentationView<'owner, 'head>, ContentError<'head>>
```

Borrows untouched wire metadata and the effective applied plan.

::Anchor{id="ContentReader.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(
    self: &'owner Self,
  ) -> Result<Option<ContentCompletion<'owner>>, ContentError<'head>>
```

Returns positive completion only after framing, codecs, and pending output finish.

::Anchor{id="ContentReader.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(
    self: &'owner Self,
  ) -> Result<Option<Trailers<'owner>>, ContentError<'head>>
```

Borrows trailers only through successful content and body completion.

::Anchor{id="ContentReader.impl.readSome"}

### Method `readSome`

```silk
pub effect fn readSome(
    self: &mut Self,
    output: &mut [u8],
    deadline: Option<Instant>,
  ) -> ContentProgress
  ! ContentError<'head>
  ? &mut MonotonicClock
  where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Streams one provisional prefix with one unchanged absolute deadline.

::Anchor{id="withReader"}

## `withReader`

```silk
pub effect fn withReader<
  'reader,
  'transport: 'reader,
  'head: 'reader,
  'method: 'reader,
  'names: 'reader,
  'callback,
  A,
  E,
  ?CallbackRequirements,
  P,
>(
  plan: CodingPlan<'head, 'method, 'names>,
  body: &'reader mut BufferedDuplex<'transport, P>,
  callback: for<
    'call,
    'readerView: 'call,
    'transportView: 'readerView,
    'headView: 'readerView,
  > once fn<'callback>(
    &'call mut ContentReader<'readerView, 'transportView, 'headView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A
! E | ContentError<'head> | OutOfMemoryError
? CallbackRequirements | &mut Allocator
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Runs one higher-ranked callback while exclusively borrowing the encoded body.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
