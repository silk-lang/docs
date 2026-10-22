Strict bounded HTTP/1 message-body framing without transport or content-decoding policy.

## Details

Select framing from a validated head, then drive Decoder or Encoder with caller buffers.
Construction owns every working allocation. Streaming calls retain no caller borrow and do not
allocate. Completion evidence proves only a framing boundary, never transport health.

Import as `Decoder` with `import silk.http_body { Decoder }`.

Public declarations: 22.

::Anchor{id="Framing"}

## `Framing`

```silk
pub union Framing
```

The selected body delimiter.

::Anchor{id="Framing.Empty"}

### `Empty`

```silk
Empty
```

The message has no payload bytes.

::Anchor{id="Framing.Fixed"}

### `Fixed`

```silk
Fixed
```

The payload has one exact declared length.

::Anchor{id="Framing.Fixed.length"}

#### Field `length`

```silk
pub length: u64
```

The exact payload byte count selected by Content-Length.

::Anchor{id="Framing.Chunked"}

### `Chunked`

```silk
Chunked
```

Chunk sizes and delimiters frame the payload.

::Anchor{id="Framing.CloseDelimited"}

### `CloseDelimited`

```silk
CloseDelimited
```

Transport end delimits the payload.

::Anchor{id="Framing.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes belong to a tunnel rather than an HTTP body.

::Anchor{id="Framing.impl.Copy"}

## Implementation `Copy for Framing`

```silk
impl Copy for Framing
```

::Anchor{id="Anomaly"}

## `Anomaly`

```silk
pub enum Anomaly
```

Receiving metadata that makes an otherwise empty response non-reusable.

::Anchor{id="Anomaly.None"}

### `None`

```silk
None
```

No framing anomaly was observed.

::Anchor{id="Anomaly.ProhibitedFraming"}

### `ProhibitedFraming`

```silk
ProhibitedFraming
```

An otherwise empty response contains prohibited framing metadata.

::Anchor{id="Anomaly.Http10TransferEncoding"}

### `Http10TransferEncoding`

```silk
Http10TransferEncoding
```

An HTTP/1.0 message contains transfer-encoding metadata.

::Anchor{id="Selection"}

## `Selection`

```silk
pub struct Selection<'head>
```

A borrowed framing selection.

::Anchor{id="Selection.impl"}

## Implementation `Selection<'head>`

```silk
impl<'head> Selection<'head>
```

::Anchor{id="Selection.impl.framing"}

### Method `framing`

```silk
pub fn framing(self: &Self) -> Framing
```

Returns the selected payload delimiter.

::Anchor{id="Selection.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns metadata that prevents reuse of an otherwise empty response.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Every finite framing and owned-storage budget.

::Anchor{id="Limits.maxWireBytes"}

### Field `maxWireBytes`

```silk
pub maxWireBytes: u64
```

Maximum cumulative wire bytes, including framing syntax.

::Anchor{id="Limits.maxPayloadBytes"}

### Field `maxPayloadBytes`

```silk
pub maxPayloadBytes: u64
```

Maximum cumulative payload bytes.

::Anchor{id="Limits.maxChunkBytes"}

### Field `maxChunkBytes`

```silk
pub maxChunkBytes: usize
```

Maximum payload bytes in one chunk.

::Anchor{id="Limits.maxChunks"}

### Field `maxChunks`

```silk
pub maxChunks: usize
```

Maximum nonempty chunks in one body.

::Anchor{id="Limits.maxChunkLineBytes"}

### Field `maxChunkLineBytes`

```silk
pub maxChunkLineBytes: usize
```

Maximum bytes in one chunk size line.

::Anchor{id="Limits.maxExtensionBytes"}

### Field `maxExtensionBytes`

```silk
pub maxExtensionBytes: u64
```

Maximum cumulative chunk extension bytes.

::Anchor{id="Limits.maxTrailerBytes"}

### Field `maxTrailerBytes`

```silk
pub maxTrailerBytes: usize
```

Maximum trailer section bytes.

::Anchor{id="Limits.maxTrailerFields"}

### Field `maxTrailerFields`

```silk
pub maxTrailerFields: usize
```

Maximum trailer field count.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

Maximum bytes retained in owned framing storage.

::Anchor{id="Limits.trailerValues"}

### Field `trailerValues`

```silk
pub trailerValues: ValueLimits
```

Admission limits for each retained trailer name and value.

::Anchor{id="Limits.impl.Copy"}

## Implementation `Copy for Limits`

```silk
impl Copy for Limits
```

::Anchor{id="ProgressState"}

## `ProgressState`

```silk
pub enum ProgressState
```

The next action required by one incremental body operation.

::Anchor{id="ProgressState.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

More input is required before progress can continue.

::Anchor{id="ProgressState.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

More output capacity is required before progress can continue.

::Anchor{id="ProgressState.Complete"}

### `Complete`

```silk
Complete
```

The complete framed body has been processed.

::Anchor{id="ProgressState.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes belong to a tunnel rather than an HTTP body.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

Exact local and cumulative committed progress.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Input bytes committed by the current operation.

::Anchor{id="Progress.written"}

### Field `written`

```silk
pub written: usize
```

Output bytes committed by the current operation.

::Anchor{id="Progress.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

Cumulative committed wire bytes.

::Anchor{id="Progress.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

Cumulative committed payload bytes.

::Anchor{id="Progress.state"}

### Field `state`

```silk
pub state: ProgressState
```

The next required action or completed disposition.

::Anchor{id="CompletionKind"}

## `CompletionKind`

```silk
pub enum CompletionKind
```

The established body-boundary disposition.

::Anchor{id="CompletionKind.Delimited"}

### `Delimited`

```silk
Delimited
```

The framing establishes an explicit body boundary.

::Anchor{id="CompletionKind.CloseDelimited"}

### `CloseDelimited`

```silk
CloseDelimited
```

Transport end delimits the payload.

::Anchor{id="CompletionKind.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes belong to a tunnel rather than an HTTP body.

::Anchor{id="Completion"}

## `Completion`

```silk
pub struct Completion<'owner>
```

Opaque positive evidence borrowed from a completed owner.

::Anchor{id="Completion.impl"}

## Implementation `Completion<'owner>`

```silk
impl<'owner> Completion<'owner>
```

::Anchor{id="Completion.impl.kind"}

### Method `kind`

```silk
pub fn kind(self: &Self) -> CompletionKind
```

Returns the established body completion disposition.

::Anchor{id="BodyComponent"}

## `BodyComponent`

```silk
pub enum BodyComponent
```

The framing component responsible for a body failure.

::Anchor{id="BodyComponent.Selection"}

### `Selection`

```silk
Selection
```

Body framing selection.

::Anchor{id="BodyComponent.ContentLength"}

### `ContentLength`

```silk
ContentLength
```

Content-Length field admission.

::Anchor{id="BodyComponent.TransferEncoding"}

### `TransferEncoding`

```silk
TransferEncoding
```

Transfer-Encoding field admission.

::Anchor{id="BodyComponent.ChunkLine"}

### `ChunkLine`

```silk
ChunkLine
```

Chunk size and extension syntax.

::Anchor{id="BodyComponent.ChunkPayload"}

### `ChunkPayload`

```silk
ChunkPayload
```

Chunk payload bytes.

::Anchor{id="BodyComponent.ChunkDelimiter"}

### `ChunkDelimiter`

```silk
ChunkDelimiter
```

The delimiter following a chunk payload.

::Anchor{id="BodyComponent.TrailerName"}

### `TrailerName`

```silk
TrailerName
```

Trailer field name admission.

::Anchor{id="BodyComponent.TrailerValue"}

### `TrailerValue`

```silk
TrailerValue
```

Trailer field value admission.

::Anchor{id="BodyComponent.TrailerPolicy"}

### `TrailerPolicy`

```silk
TrailerPolicy
```

Trailer name policy admission.

::Anchor{id="BodyComponent.Decoder"}

### `Decoder`

```silk
Decoder
```

Body decoder state.

::Anchor{id="BodyComponent.Encoder"}

### `Encoder`

```silk
Encoder
```

Body encoder state.

::Anchor{id="BodyComponent.Discard"}

### `Discard`

```silk
Discard
```

Bounded body discard.

::Anchor{id="BodyLimitKind"}

## `BodyLimitKind`

```silk
pub enum BodyLimitKind
```

The finite budget exceeded by a body operation.

::Anchor{id="BodyLimitKind.WireBytes"}

### `WireBytes`

```silk
WireBytes
```

The cumulative wire-byte budget.

::Anchor{id="BodyLimitKind.PayloadBytes"}

### `PayloadBytes`

```silk
PayloadBytes
```

The cumulative payload-byte budget.

::Anchor{id="BodyLimitKind.ChunkBytes"}

### `ChunkBytes`

```silk
ChunkBytes
```

The per-chunk payload-byte budget.

::Anchor{id="BodyLimitKind.Chunks"}

### `Chunks`

```silk
Chunks
```

The nonempty chunk-count budget.

::Anchor{id="BodyLimitKind.ChunkLineBytes"}

### `ChunkLineBytes`

```silk
ChunkLineBytes
```

The chunk-line byte budget.

::Anchor{id="BodyLimitKind.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

The cumulative extension-byte budget.

::Anchor{id="BodyLimitKind.TrailerBytes"}

### `TrailerBytes`

```silk
TrailerBytes
```

The trailer-section byte budget.

::Anchor{id="BodyLimitKind.TrailerFields"}

### `TrailerFields`

```silk
TrailerFields
```

The trailer field-count budget.

::Anchor{id="BodyLimitKind.TrailerNameBytes"}

### `TrailerNameBytes`

```silk
TrailerNameBytes
```

The per-field trailer name-byte budget.

::Anchor{id="BodyLimitKind.TrailerValueBytes"}

### `TrailerValueBytes`

```silk
TrailerValueBytes
```

The per-field trailer value-byte budget.

::Anchor{id="BodyLimitKind.TrailerFieldBytes"}

### `TrailerFieldBytes`

```silk
TrailerFieldBytes
```

The combined trailer field-byte budget.

::Anchor{id="BodyLimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

The owned-storage byte budget.

::Anchor{id="BodyReason"}

## `BodyReason`

```silk
pub union BodyReason
```

The reason a body operation cannot continue.

::Anchor{id="BodyReason.InvalidFraming"}

### `InvalidFraming`

```silk
InvalidFraming
```

The supplied metadata does not admit the requested framing.

::Anchor{id="BodyReason.ConflictingFraming"}

### `ConflictingFraming`

```silk
ConflictingFraming
```

The supplied framing fields disagree.

::Anchor{id="BodyReason.UnsupportedTransferCoding"}

### `UnsupportedTransferCoding`

```silk
UnsupportedTransferCoding
```

A transfer coding is outside the supported profile.

::Anchor{id="BodyReason.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

The declared payload length is invalid.

::Anchor{id="BodyReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Size arithmetic exceeds the representable range.

::Anchor{id="BodyReason.ChunkSyntax"}

### `ChunkSyntax`

```silk
ChunkSyntax
```

Chunk framing syntax is invalid.

::Anchor{id="BodyReason.TrailerSyntax"}

### `TrailerSyntax`

```silk
TrailerSyntax
```

Trailer syntax is invalid.

::Anchor{id="BodyReason.TrailerPolicy"}

### `TrailerPolicy`

```silk
TrailerPolicy
```

Trailer name policy admission.

::Anchor{id="BodyReason.Truncated"}

### `Truncated`

```silk
Truncated
```

Input ends before the framed body is complete.

::Anchor{id="BodyReason.FixedLengthUnderrun"}

### `FixedLengthUnderrun`

```silk
FixedLengthUnderrun
```

Finalization occurs before the declared payload length is supplied.

::Anchor{id="BodyReason.FixedLengthOverrun"}

### `FixedLengthOverrun`

```silk
FixedLengthOverrun
```

Payload input exceeds the declared length.

::Anchor{id="BodyReason.UnexpectedPayload"}

### `UnexpectedPayload`

```silk
UnexpectedPayload
```

Payload was supplied for empty framing.

::Anchor{id="BodyReason.UnsupportedTunnelEncoding"}

### `UnsupportedTunnelEncoding`

```silk
UnsupportedTunnelEncoding
```

The encoder cannot encode tunnel bytes as an HTTP body.

::Anchor{id="BodyReason.DiscardLimit"}

### `DiscardLimit`

```silk
DiscardLimit
```

Discard would exceed its caller-supplied limit.

::Anchor{id="BodyReason.DiscardLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The admitted maximum for the rejected operation.

::Anchor{id="BodyReason.DiscardLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The count that would exceed the admitted maximum.

::Anchor{id="BodyReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The operation would exceed a configured budget.

::Anchor{id="BodyReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: BodyLimitKind
```

The budget exceeded by this operation.

::Anchor{id="BodyReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The admitted maximum for the rejected operation.

::Anchor{id="BodyReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The count that would exceed the admitted maximum.

::Anchor{id="BodyReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The operation is not permitted in the current state.

::Anchor{id="BodyReason.impl.Copy"}

## Implementation `Copy for BodyReason`

```silk
impl Copy for BodyReason
```

::Anchor{id="BodyError"}

## `BodyError`

```silk
pub struct BodyError
```

A terminal failure with exact committed coordinates.

::Anchor{id="BodyError.reason"}

### Field `reason`

```silk
pub reason: BodyReason
```

The rule that made the body terminal.

::Anchor{id="BodyError.component"}

### Field `component`

```silk
pub component: BodyComponent
```

The framing component that rejected the operation.

::Anchor{id="BodyError.wireOffset"}

### Field `wireOffset`

```silk
pub wireOffset: u64
```

The zero-based wire byte offset of the failure.

::Anchor{id="BodyError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Input bytes committed by the current operation.

::Anchor{id="BodyError.written"}

### Field `written`

```silk
pub written: usize
```

Output bytes committed by the current operation.

::Anchor{id="BodyError.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

Cumulative committed wire bytes.

::Anchor{id="BodyError.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

Cumulative committed payload bytes.

::Anchor{id="BodyError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

The zero-based trailer field index, when the failure identifies one.

::Anchor{id="TrailerPolicy"}

## `TrailerPolicy`

```silk
pub union TrailerPolicy<'names>
```

An explicit trailer-name allowlist.

::Anchor{id="TrailerPolicy.Default"}

### `Default`

```silk
Default
```

Applies the default forbidden-trailer policy.

::Anchor{id="TrailerPolicy.Explicit"}

### `Explicit`

```silk
Explicit
```

Restricts trailers to the supplied admitted field names.

::Anchor{id="TrailerPolicy.impl.Copy"}

## Implementation `Copy for TrailerPolicy<'names>`

```silk
impl<'names> Copy for TrailerPolicy<'names>
```

::Anchor{id="TrailerPolicy.impl"}

## Implementation `TrailerPolicy<'names>`

```silk
impl<'names> TrailerPolicy<'names>
```

::Anchor{id="TrailerPolicy.impl.defaultPolicy"}

### Associated function `defaultPolicy`

```silk
pub fn defaultPolicy() -> TrailerPolicy<'names>
```

Returns the default forbidden-trailer policy.

::Anchor{id="TrailerPolicy.impl.fromNames"}

### Associated function `fromNames`

```silk
pub fn fromNames(
    names: &'names [string<'names>],
  ) -> Result<TrailerPolicy<'names>, BodyError>
```

Validates an explicit trailer-name allowlist and borrows it without allocation.

::Anchor{id="selectRequest"}

## `selectRequest`

```silk
pub fn selectRequest<'value>(
  head: RequestHead<'value>,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Selects receiving request framing.

::Anchor{id="selectResponse"}

## `selectResponse`

```silk
pub fn selectResponse<'value>(
  head: ResponseHead<'value>,
  requestMethod: &Method,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Selects receiving response framing.

::Anchor{id="validateOutgoingRequest"}

## `validateOutgoingRequest`

```silk
pub fn validateOutgoingRequest<'value>(
  head: RequestHead<'value>,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Validates request framing and trailer policy before payload encoding.

::Anchor{id="validateOutgoingResponse"}

## `validateOutgoingResponse`

```silk
pub fn validateOutgoingResponse<'value>(
  head: ResponseHead<'value>,
  requestMethod: &Method,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Validates response framing, including status and request-method restrictions, before payload encoding.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

Affine allocation-free incremental body decoder.

::Anchor{id="Decoder.impl"}

## Implementation `Decoder`

```silk
impl Decoder
```

::Anchor{id="Decoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make<'head>(
    selection: Selection<'head>,
    limits: Limits,
    policy: TrailerPolicy,
  ) -> Result<Decoder, BodyError> ! OutOfMemoryError ? &mut Allocator
```

Acquires every decoder buffer and copies trailer policy and Connection exclusions.

::Anchor{id="Decoder.impl.step"}

### Method `step`

```silk
pub fn step(
    self: &mut Self,
    input: &[u8],
    output: &mut [u8],
    finalInput: bool,
  ) -> Result<Progress, BodyError>
```

Decodes into caller output without consuming unwritten payload.

::Anchor{id="Decoder.impl.discard"}

### Method `discard`

```silk
pub fn discard(
    self: &mut Self,
    input: &[u8],
    finalInput: bool,
    maxDiscardWireBytes: u64,
  ) -> Result<Progress, BodyError>
```

Discards wire bytes under an explicit cumulative framing-byte budget.

::Anchor{id="Decoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Option<Completion<'owner>>
```

Returns positive evidence only after a successful terminal boundary.

::Anchor{id="Decoder.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(self: &'owner Self) -> Option<Trailers<'owner>>
```

Returns completed chunk trailers without merging them into initial fields.

::Anchor{id="Decoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Makes the decoder terminal without performing transport work.

::Anchor{id="Trailers"}

## `Trailers`

```silk
pub struct Trailers<'owner>
```

A decoder-borrowed trailer section.

::Anchor{id="Trailers.impl"}

## Implementation `Trailers<'owner>`

```silk
impl<'owner> Trailers<'owner>
```

::Anchor{id="Trailers.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of retained trailer fields.

::Anchor{id="Trailers.impl.requiredOwnedBytes"}

### Method `requiredOwnedBytes`

```silk
pub fn requiredOwnedBytes(self: &Self) -> Result<usize, BodyError>
```

Returns the exact payload-plus-index bytes required by an independent owned copy.

::Anchor{id="Trailers.impl.fields"}

### Method `fields`

```silk
pub fn fields(self: &'owner Self) -> TrailerIterator<'owner>
```

Borrows an iterator over trailer fields in their retained order.

::Anchor{id="Trailers.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &'owner Self,
    limits: ValueLimits,
  ) -> Result<OwnedTrailers, BodyError> ! OutOfMemoryError ? &mut Allocator
```

Copies the trailer section into an independent owner under the supplied admission limits.

::Anchor{id="OwnedTrailers"}

## `OwnedTrailers`

```silk
pub struct OwnedTrailers
```

An independently owned trailer section.

::Anchor{id="OwnedTrailers.impl"}

## Implementation `OwnedTrailers`

```silk
impl OwnedTrailers
```

::Anchor{id="OwnedTrailers.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the exact retained trailer payload-plus-index byte count.

::Anchor{id="OwnedTrailers.impl.view"}

### Method `view`

```silk
pub fn view<'owner>(self: &'owner Self) -> Trailers<'owner>
```

Borrows a trailer view tied to this owner.

::Anchor{id="TrailerIterator"}

## `TrailerIterator`

```silk
pub struct TrailerIterator<'owner>
```

An ordered iterator borrowing one retained trailer section.

::Anchor{id="TrailerIterator.impl"}

## Implementation `TrailerIterator<'owner>`

```silk
impl<'owner> TrailerIterator<'owner>
```

::Anchor{id="TrailerIterator.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut Self) -> Option<Header<'owner>>
```

Returns the next borrowed trailer field, or None after the final field.

::Anchor{id="Encoder"}

## `Encoder`

```silk
pub struct Encoder
```

Affine allocation-free incremental body encoder.

::Anchor{id="Encoder.impl"}

## Implementation `Encoder`

```silk
impl Encoder
```

::Anchor{id="Encoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make<'head>(
    selection: Selection<'head>,
    limits: Limits,
    policy: TrailerPolicy,
  ) -> Result<Encoder, BodyError> ! OutOfMemoryError ? &mut Allocator
```

Acquires bounded chunk and finish-snapshot storage.

::Anchor{id="Encoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<Progress, BodyError>
```

Accepts payload and emits as much framed output as fits.

::Anchor{id="Encoder.impl.beginFinish"}

### Method `beginFinish`

```silk
pub fn beginFinish<'value>(
    self: &mut Self,
    trailers: &Headers<'value>,
  ) -> Result<(), BodyError>
```

Validates and snapshots all finish trailers before any finish byte is emitted.

::Anchor{id="Encoder.impl.continueFinish"}

### Method `continueFinish`

```silk
pub fn continueFinish(self: &mut Self, output: &mut [u8]) -> Result<Progress, BodyError>
```

Drains the immutable finish snapshot.

::Anchor{id="Encoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Option<Completion<'owner>>
```

Borrows positive completion evidence only after successful encoder finalization.

::Anchor{id="Encoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Makes an unfinished encoder unusable without emitting additional bytes.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
