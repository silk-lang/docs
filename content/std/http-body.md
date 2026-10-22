Read and write the body of an HTTP/1 message: fixed length, chunked, or until the connection
closes.

## When to use
After you parse a head with `silk.http_head`, call [`selectRequest`](#selectRequest) or [`selectResponse`](#selectResponse) to
find how the body is framed. Then make a [`Decoder`](#Decoder) and call [`Decoder.step`](#Decoder.impl.step) with the bytes
after the head. To send a body, check the head with [`validateOutgoingRequest`](#validateOutgoingRequest) or
[`validateOutgoingResponse`](#validateOutgoingResponse), make an [`Encoder`](#Encoder), and call [`Encoder.step`](#Encoder.impl.step),
[`Encoder.beginFinish`](#Encoder.impl.beginFinish), and [`Encoder.continueFinish`](#Encoder.impl.continueFinish).

## Details
`make` allocates all the memory. After that, `step` does not allocate and does not keep your
buffers. Each call returns how many input bytes it used and how many output bytes it wrote, and
the next action in [`ProgressState`](#ProgressState). The decoder removes the chunk framing and gives only the
payload. This module does not decompress content: see `silk.http_content`.

## Errors
- [`BodyError`](#BodyError) tells which rule failed, in which part, and the byte offset on the wire. After
  an error, the decoder or encoder stays failed.
- `OutOfMemoryError` from `make` if the `Allocator` fails.

## Gotchas
A complete body does not mean that the connection is good. Check the connection separately
before you use it again. A response with `CloseDelimited` framing ends only when the connection
closes, so give `finalInput` as `true` at the end of the transport.

## Examples
### Decode a chunked response
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http { Method }
import silk.http_body {
  BodyError,
  Decoder,
  Framing,
  Limits as BodyLimits,
  Progress,
  ProgressState,
  Selection,
  TrailerPolicy,
  selectResponse
}
import silk.http_head {
  Limits,
  ParseError,
  ParsedResponse,
  ResponseHead,
  ResponseParser,
  parseResponse
}
import silk.http_headers { Limits as ValueLimits }
import silk.result { Result }
import silk.slice { Slice }

fn values() -> ValueLimits {
  return ValueLimits {
    maxMethodBytes: 16,
    maxTargetBytes: 1024,
    maxNameBytes: 64,
    maxValueBytes: 1024,
    maxFields: 32,
    maxFieldBytes: 4096,
    maxOwnedBytes: 8192,
  }
}

fn headLimits() -> Limits {
  return Limits {
    maxHeadBytes: 4096,
    maxStartLineBytes: 1024,
    maxFieldLineBytes: 1024,
    maxOwnedBytes: 8192,
    values: values(),
  }
}

fn bodyLimits() -> BodyLimits {
  return BodyLimits {
    maxWireBytes: 65536,
    maxPayloadBytes: 65536,
    maxChunkBytes: 4096,
    maxChunks: 64,
    maxChunkLineBytes: 256,
    maxExtensionBytes: 1024,
    maxTrailerBytes: 1024,
    maxTrailerFields: 8,
    maxOwnedBytes: 16384,
    trailerValues: values(),
  }
}

effect fn program() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let wire = b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n0\r\n\r\n"
  let parsed = run parseResponse(&wire, headLimits())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let result = match move parsed {
    Result<ParsedResponse, ParseError>.Success { value } => move value
    Result<ParsedResponse, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let head = match ResponseParser.head(&result.parser) {
    Result<ResponseHead, ParseError>.Success { value } => value
    Result<ResponseHead, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let get = Method.get()
  let selection = match selectResponse(head, &get, TrailerPolicy.defaultPolicy()) {
    Result<Selection, BodyError>.Success { value } => move value
    Result<Selection, BodyError>.Failure { error: _ } => {
      return 1
    }
  }
  let chunked = match Selection.framing(&selection) {
    Framing.Chunked => true
    _ => false
  }
  if !chunked {
    return 1
  }
  let made = run Decoder.make(move selection, bodyLimits(), TrailerPolicy.defaultPolicy())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut decoder = match move made {
    Result<Decoder, BodyError>.Success { value } => move value
    Result<Decoder, BodyError>.Failure { error: _ } => {
      return 1
    }
  }

  // The body starts after the head.
  let body = Slice.view<u8>(&wire, result.progress.consumed, wire.length - result.progress.consumed)
  let mut payload: [u8; 16] = [0; 16]
  let progress = match Decoder.step(&mut decoder, body, &mut payload, true) {
    Result<Progress, BodyError>.Success { value } => move value
    Result<Progress, BodyError>.Failure { error: _ } => {
      return 1
    }
  }
  if progress.state != ProgressState.Complete || progress.written != 5 || payload[0] != 104 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `Decoder` with `import silk.http_body { Decoder }`.

Public declarations: 22.

::Anchor{id="Framing"}

## `Framing`

```silk
pub union Framing
```

How the end of a body is found.

::Anchor{id="Framing.Empty"}

### `Empty`

```silk
Empty
```

There is no body, for example in a response to `HEAD`, or with status 204 or 304.

::Anchor{id="Framing.Fixed"}

### `Fixed`

```silk
Fixed
```

The body has the length in `Content-Length`.

::Anchor{id="Framing.Fixed.length"}

#### Field `length`

```silk
pub length: u64
```

The length of the body, in bytes.

::Anchor{id="Framing.Chunked"}

### `Chunked`

```silk
Chunked
```

The body is sent in chunks, with `Transfer-Encoding: chunked`.

::Anchor{id="Framing.CloseDelimited"}

### `CloseDelimited`

```silk
CloseDelimited
```

The body ends when the connection closes. The connection cannot be used again.

::Anchor{id="Framing.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes after the head are a tunnel, for example after a successful `CONNECT`. They are not
an HTTP body.

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

A problem in a response with no body. The body is still empty, but do not use the connection
again.

::Anchor{id="Anomaly.None"}

### `None`

```silk
None
```

There is no problem.

::Anchor{id="Anomaly.ProhibitedFraming"}

### `ProhibitedFraming`

```silk
ProhibitedFraming
```

A 1xx or 204 response has `Content-Length` or `Transfer-Encoding`.

::Anchor{id="Anomaly.Http10TransferEncoding"}

### `Http10TransferEncoding`

```silk
Http10TransferEncoding
```

An HTTP/1.0 response has `Transfer-Encoding`.

::Anchor{id="Selection"}

## `Selection`

```silk
pub struct Selection<'head>
```

The framing of a body, from [`selectRequest`](#selectRequest) or [`selectResponse`](#selectResponse). Give it to [`Decoder.make`](#Decoder.impl.make)
or [`Encoder.make`](#Encoder.impl.make).

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

Returns how the end of the body is found.

::Anchor{id="Selection.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns a problem that prevents use of the connection again, if any.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The maximum sizes for a body and its framing.

::Anchor{id="Limits.maxWireBytes"}

### Field `maxWireBytes`

```silk
pub maxWireBytes: u64
```

The maximum number of bytes on the wire, including the chunk framing.

::Anchor{id="Limits.maxPayloadBytes"}

### Field `maxPayloadBytes`

```silk
pub maxPayloadBytes: u64
```

The maximum number of payload bytes.

::Anchor{id="Limits.maxChunkBytes"}

### Field `maxChunkBytes`

```silk
pub maxChunkBytes: usize
```

The maximum size of one chunk.

::Anchor{id="Limits.maxChunks"}

### Field `maxChunks`

```silk
pub maxChunks: usize
```

The maximum number of chunks that are not empty.

::Anchor{id="Limits.maxChunkLineBytes"}

### Field `maxChunkLineBytes`

```silk
pub maxChunkLineBytes: usize
```

The maximum length of one chunk size line.

::Anchor{id="Limits.maxExtensionBytes"}

### Field `maxExtensionBytes`

```silk
pub maxExtensionBytes: u64
```

The maximum total length of all chunk extensions.

::Anchor{id="Limits.maxTrailerBytes"}

### Field `maxTrailerBytes`

```silk
pub maxTrailerBytes: usize
```

The maximum size of the trailer section.

::Anchor{id="Limits.maxTrailerFields"}

### Field `maxTrailerFields`

```silk
pub maxTrailerFields: usize
```

The maximum number of trailer fields.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

The maximum memory of a decoder or an encoder.

::Anchor{id="Limits.trailerValues"}

### Field `trailerValues`

```silk
pub trailerValues: ValueLimits
```

The limits for each trailer name and value.

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

What to do after a `step`.

::Anchor{id="ProgressState.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

Give more input.

::Anchor{id="ProgressState.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

Give more space in the output buffer.

::Anchor{id="ProgressState.Complete"}

### `Complete`

```silk
Complete
```

The body is complete.

::Anchor{id="ProgressState.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes are a tunnel, not an HTTP body.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

The result of a successful `step`.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call used.

::Anchor{id="Progress.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote.

::Anchor{id="Progress.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

The total number of wire bytes so far.

::Anchor{id="Progress.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

The total number of payload bytes so far.

::Anchor{id="Progress.state"}

### Field `state`

```silk
pub state: ProgressState
```

What to do next.

::Anchor{id="CompletionKind"}

## `CompletionKind`

```silk
pub enum CompletionKind
```

How a body ended. See [`Completion.kind`](#Completion.impl.kind).

::Anchor{id="CompletionKind.Delimited"}

### `Delimited`

```silk
Delimited
```

The framing marked the end: the length, the last chunk, or no body.

::Anchor{id="CompletionKind.CloseDelimited"}

### `CloseDelimited`

```silk
CloseDelimited
```

The connection closed.

::Anchor{id="CompletionKind.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The bytes were a tunnel.

::Anchor{id="Completion"}

## `Completion`

```silk
pub struct Completion<'owner>
```

Proof that a body is complete. Get it from [`Decoder.completion`](#Decoder.impl.completion) or [`Encoder.completion`](#Encoder.impl.completion).

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

Returns how the body ended.

::Anchor{id="BodyComponent"}

## `BodyComponent`

```silk
pub enum BodyComponent
```

The part of the body work where an error occurred.

::Anchor{id="BodyComponent.Selection"}

### `Selection`

```silk
Selection
```

The selection of the framing from the head.

::Anchor{id="BodyComponent.ContentLength"}

### `ContentLength`

```silk
ContentLength
```

The `Content-Length` field.

::Anchor{id="BodyComponent.TransferEncoding"}

### `TransferEncoding`

```silk
TransferEncoding
```

The `Transfer-Encoding` field.

::Anchor{id="BodyComponent.ChunkLine"}

### `ChunkLine`

```silk
ChunkLine
```

A chunk size line, with its extensions.

::Anchor{id="BodyComponent.ChunkPayload"}

### `ChunkPayload`

```silk
ChunkPayload
```

The bytes of a chunk.

::Anchor{id="BodyComponent.ChunkDelimiter"}

### `ChunkDelimiter`

```silk
ChunkDelimiter
```

The CRLF after the bytes of a chunk.

::Anchor{id="BodyComponent.TrailerName"}

### `TrailerName`

```silk
TrailerName
```

The name of a trailer field.

::Anchor{id="BodyComponent.TrailerValue"}

### `TrailerValue`

```silk
TrailerValue
```

The value of a trailer field.

::Anchor{id="BodyComponent.TrailerPolicy"}

### `TrailerPolicy`

```silk
TrailerPolicy
```

The check of a trailer name against the [`TrailerPolicy`](#BodyComponent.TrailerPolicy).

::Anchor{id="BodyComponent.Decoder"}

### `Decoder`

```silk
Decoder
```

The decoder.

::Anchor{id="BodyComponent.Encoder"}

### `Encoder`

```silk
Encoder
```

The encoder.

::Anchor{id="BodyComponent.Discard"}

### `Discard`

```silk
Discard
```

A [`Decoder.discard`](#Decoder.impl.discard) call.

::Anchor{id="BodyLimitKind"}

## `BodyLimitKind`

```silk
pub enum BodyLimitKind
```

The limit that a body exceeded. Each value names a field of [`Limits`](#Limits).

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

`trailerValues.maxNameBytes`.

::Anchor{id="BodyLimitKind.TrailerValueBytes"}

### `TrailerValueBytes`

```silk
TrailerValueBytes
```

`trailerValues.maxValueBytes`.

::Anchor{id="BodyLimitKind.TrailerFieldBytes"}

### `TrailerFieldBytes`

```silk
TrailerFieldBytes
```

`trailerValues.maxFieldBytes`.

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

The rule that failed.

::Anchor{id="BodyReason.InvalidFraming"}

### `InvalidFraming`

```silk
InvalidFraming
```

The head does not allow this framing.

::Anchor{id="BodyReason.ConflictingFraming"}

### `ConflictingFraming`

```silk
ConflictingFraming
```

The head has both `Content-Length` and `Transfer-Encoding`.

::Anchor{id="BodyReason.UnsupportedTransferCoding"}

### `UnsupportedTransferCoding`

```silk
UnsupportedTransferCoding
```

A transfer coding other than `chunked` is used.

::Anchor{id="BodyReason.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

The `Content-Length` value is not valid.

::Anchor{id="BodyReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size calculation overflowed.

::Anchor{id="BodyReason.ChunkSyntax"}

### `ChunkSyntax`

```silk
ChunkSyntax
```

A chunk size line or a chunk delimiter is not valid.

::Anchor{id="BodyReason.TrailerSyntax"}

### `TrailerSyntax`

```silk
TrailerSyntax
```

A trailer field is not valid.

::Anchor{id="BodyReason.TrailerPolicy"}

### `TrailerPolicy`

```silk
TrailerPolicy
```

A trailer name is not allowed by the [`TrailerPolicy`](#BodyReason.TrailerPolicy).

::Anchor{id="BodyReason.Truncated"}

### `Truncated`

```silk
Truncated
```

The input ended before the body was complete.

::Anchor{id="BodyReason.FixedLengthUnderrun"}

### `FixedLengthUnderrun`

```silk
FixedLengthUnderrun
```

The encoder finished before it got `Content-Length` bytes.

::Anchor{id="BodyReason.FixedLengthOverrun"}

### `FixedLengthOverrun`

```silk
FixedLengthOverrun
```

The encoder got more than `Content-Length` bytes.

::Anchor{id="BodyReason.UnexpectedPayload"}

### `UnexpectedPayload`

```silk
UnexpectedPayload
```

The encoder got bytes for a message with no body.

::Anchor{id="BodyReason.UnsupportedTunnelEncoding"}

### `UnsupportedTunnelEncoding`

```silk
UnsupportedTunnelEncoding
```

An encoder cannot send tunnel bytes as a body.

::Anchor{id="BodyReason.DiscardLimit"}

### `DiscardLimit`

```silk
DiscardLimit
```

A [`Decoder.discard`](#Decoder.impl.discard) call would read more than its `maxDiscardWireBytes`.

::Anchor{id="BodyReason.DiscardLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The value of the limit.

::Anchor{id="BodyReason.DiscardLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The size that was found.

::Anchor{id="BodyReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The body exceeded a limit in [`Limits`](#Limits).

::Anchor{id="BodyReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: BodyLimitKind
```

The limit that was exceeded.

::Anchor{id="BodyReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The value of the limit.

::Anchor{id="BodyReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The size that was found.

::Anchor{id="BodyReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The call is not valid now, for example a `step` after the body is complete or after an error.

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

The error from body work. After it, the decoder or encoder stays failed.

::Anchor{id="BodyError.reason"}

### Field `reason`

```silk
pub reason: BodyReason
```

The rule that failed.

::Anchor{id="BodyError.component"}

### Field `component`

```silk
pub component: BodyComponent
```

The part where it failed.

::Anchor{id="BodyError.wireOffset"}

### Field `wireOffset`

```silk
pub wireOffset: u64
```

The byte offset on the wire, from the start of the body.

::Anchor{id="BodyError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call used before the error.

::Anchor{id="BodyError.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote before the error.

::Anchor{id="BodyError.totalWire"}

### Field `totalWire`

```silk
pub totalWire: u64
```

The total number of wire bytes before the error.

::Anchor{id="BodyError.totalPayload"}

### Field `totalPayload`

```silk
pub totalPayload: u64
```

The total number of payload bytes before the error.

::Anchor{id="BodyError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

The position of the trailer field, from 0, when the error is in a trailer.

::Anchor{id="TrailerPolicy"}

## `TrailerPolicy`

```silk
pub union TrailerPolicy<'names>
```

The trailer fields that a chunked body can have.

::Anchor{id="TrailerPolicy.Default"}

### `Default`

```silk
Default
```

Allow trailers, but not fields that change the framing, routing, or authentication, such as
`Content-Length` or `Host`.

::Anchor{id="TrailerPolicy.Explicit"}

### `Explicit`

```silk
Explicit
```

Allow only the trailers with these names.

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

Returns the `Default` policy.

::Anchor{id="TrailerPolicy.impl.fromNames"}

### Associated function `fromNames`

```silk
pub fn fromNames(
    names: &'names [string<'names>],
  ) -> Result<TrailerPolicy<'names>, BodyError>
```

Returns a policy that allows only `names`. It fails if a name is not a token, or is a field
that is never allowed in a trailer.

::Anchor{id="selectRequest"}

## `selectRequest`

```silk
pub fn selectRequest<'value>(
  head: RequestHead<'value>,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Returns the framing of a received request body.

A request without `Content-Length` or `Transfer-Encoding` has no body.

::Anchor{id="selectResponse"}

## `selectResponse`

```silk
pub fn selectResponse<'value>(
  head: ResponseHead<'value>,
  requestMethod: &Method,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Returns the framing of a received response body. `requestMethod` is the method of the request.

### Details
A response to `HEAD`, a 1xx, 204, or 304 response has no body. A 2xx response to `CONNECT` is a
tunnel. A response without `Content-Length` or `Transfer-Encoding` ends when the connection
closes.

::Anchor{id="validateOutgoingRequest"}

## `validateOutgoingRequest`

```silk
pub fn validateOutgoingRequest<'value>(
  head: RequestHead<'value>,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Checks the framing fields of a request that you send, and returns the framing for
[`Encoder.make`](#Encoder.impl.make).

::Anchor{id="validateOutgoingResponse"}

## `validateOutgoingResponse`

```silk
pub fn validateOutgoingResponse<'value>(
  head: ResponseHead<'value>,
  requestMethod: &Method,
  policy: TrailerPolicy,
) -> Result<Selection<'value>, BodyError>
```

Checks the framing fields of a response that you send, and returns the framing for
[`Encoder.make`](#Encoder.impl.make). A 1xx, 204, or 2xx `CONNECT` response cannot have `Content-Length` or
`Transfer-Encoding`.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

Reads a body from wire bytes. Make it with [`Decoder.make`](#Decoder.impl.make).

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

Returns a decoder for the framing in `selection`, and allocates all its memory.

#### Errors
- `LimitExceeded` with `OwnedBytes` if the memory is more than `maxOwnedBytes`.
- `OutOfMemoryError` if the `Allocator` fails.

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

Reads wire bytes from `input`, and writes payload bytes to `output`.

#### Details
The decoder uses only the input bytes whose payload fits in `output`. Give the rest again in
the next call. Set `finalInput` to `true` when the transport has no more bytes. For a body
that ends with the connection, this completes the body. For other bodies, it makes an
incomplete body fail with `Truncated`.

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

Reads and drops body bytes, for example to use the connection again without the body.

`maxDiscardWireBytes` limits the total wire bytes of all discard calls. If more are needed, it
fails with `DiscardLimit`.

::Anchor{id="Decoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Option<Completion<'owner>>
```

Returns proof that the body is complete, or `None`.

::Anchor{id="Decoder.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(self: &'owner Self) -> Option<Trailers<'owner>>
```

Returns the trailer fields of a complete chunked body, or `None`. They are separate from the
fields of the head.

::Anchor{id="Decoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Stops the decoder. Later calls fail. It does no I/O.

::Anchor{id="Trailers"}

## `Trailers`

```silk
pub struct Trailers<'owner>
```

The trailer fields of a chunked body. They borrow the decoder.

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

Returns the number of trailer fields.

::Anchor{id="Trailers.impl.requiredOwnedBytes"}

### Method `requiredOwnedBytes`

```silk
pub fn requiredOwnedBytes(self: &Self) -> Result<usize, BodyError>
```

Returns the memory that [`Trailers.copy`](#Trailers.impl.copy) needs.

::Anchor{id="Trailers.impl.fields"}

### Method `fields`

```silk
pub fn fields(self: &'owner Self) -> TrailerIterator<'owner>
```

Returns an iterator over the trailer fields, in order.

::Anchor{id="Trailers.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &'owner Self,
    limits: ValueLimits,
  ) -> Result<OwnedTrailers, BodyError> ! OutOfMemoryError ? &mut Allocator
```

Copies the trailers into new memory, so that they do not borrow the decoder.

::Anchor{id="OwnedTrailers"}

## `OwnedTrailers`

```silk
pub struct OwnedTrailers
```

Trailer fields that own their memory. Get a [`Trailers`](#Trailers) from it with [`OwnedTrailers.view`](#OwnedTrailers.impl.view).

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

Returns the memory that this copy uses, in bytes.

::Anchor{id="OwnedTrailers.impl.view"}

### Method `view`

```silk
pub fn view<'owner>(self: &'owner Self) -> Trailers<'owner>
```

Returns the trailers as a [`Trailers`](#Trailers) that borrows this value.

::Anchor{id="TrailerIterator"}

## `TrailerIterator`

```silk
pub struct TrailerIterator<'owner>
```

An iterator over trailer fields, in order.

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

Returns the next trailer field, or `None` at the end.

::Anchor{id="Encoder"}

## `Encoder`

```silk
pub struct Encoder
```

Writes a body with its framing. Make it with [`Encoder.make`](#Encoder.impl.make).

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

Returns an encoder for the framing in `selection`, and allocates all its memory.

#### Errors
- `UnsupportedTunnelEncoding` for `Tunnel` framing.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Encoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<Progress, BodyError>
```

Takes payload bytes from `input`, and writes framed bytes to `output`.

For chunked framing, the encoder writes a chunk for the bytes that it takes. With
`NeedOutput`, send the output and call again.

::Anchor{id="Encoder.impl.beginFinish"}

### Method `beginFinish`

```silk
pub fn beginFinish<'value>(
    self: &mut Self,
    trailers: &Headers<'value>,
  ) -> Result<(), BodyError>
```

Starts the end of the body, with `trailers` for a chunked body. Then call
[`Encoder.continueFinish`](#Encoder.impl.continueFinish).

#### Errors
- `FixedLengthUnderrun` if a fixed-length body did not get all its bytes.
- `TrailerPolicy` or `TrailerSyntax` if a trailer is not valid. Nothing is written.

::Anchor{id="Encoder.impl.continueFinish"}

### Method `continueFinish`

```silk
pub fn continueFinish(self: &mut Self, output: &mut [u8]) -> Result<Progress, BodyError>
```

Writes the end of the body, such as the last chunk and the trailers, to `output`. Call it
again while the state is `NeedOutput`.

::Anchor{id="Encoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Option<Completion<'owner>>
```

Returns proof that the whole body was written, or `None`.

::Anchor{id="Encoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Stops the encoder without writing more bytes. Later calls fail. The body on the wire is
incomplete.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
