Decode the content of an HTTP response: gzip, deflate, and Zstandard, as named in
`Content-Encoding`.

## When to use
Make a [`ResponseContext`](#ResponseContext) from a response head, and a [`CodingPlan`](#CodingPlan) from it. Then decode the
body with a [`Decoder`](#Decoder) when you have the wire bytes, or with [`withReader`](#withReader) over a
`BufferedDuplex`. Use [`acceptEncoding`](#acceptEncoding) to make the `Accept-Encoding` field of a request.
`silk.http_exchange` and `silk.http_fetch` use this module for you.

## Details
With `Mode.Raw`, the body is returned as it was sent. With `Mode.Decode`, the codings in
`Content-Encoding` are decoded in reverse order. A response can have at most four codings.
[`CodingPlan.make`](#CodingPlan.impl.make) checks all limits and memory before it reads the body. The decoder also
removes the body framing, so give it the bytes after the head.

## Errors
- [`ContentError`](#ContentError) tells the reason and the byte counts so far. A coding error tells where the
  coding is in `Content-Encoding`.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
Decoded bytes are not final until the state is `End`. A later checksum, trailer, or framing
error can still fail. A step can return no bytes, so call it again until the state is `End`.
This module does not check that the body belongs to the head. `silk.http_exchange` does.

## Examples
### Decode a gzip body
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http { Method }
import silk.http_body { TrailerPolicy }
import silk.http_content {
  CodingPlan,
  ContentError,
  ContentProgressState,
  DecodeFailure,
  DecodeProgress,
  Decoder,
  Mode,
  ResponseContext
}
import silk.http_exchange { Limits as ClientLimits }
import silk.http_fetch { FetchOptions }
import silk.http_head { ParseError, ParsedResponse, ResponseHead, ResponseParser, parseResponse }
import silk.http_body { BodyError }
import silk.result { Result }
import silk.slice { Slice }
import silk.usize

effect fn program() -> i32
  ! OutOfMemoryError
  ? &mut Allocator {
  let limits = ClientLimits.defaults()
  let wire = b"HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Length: 28\r\n\r\n"
  let parsed = match run parseResponse(&wire, limits.head) {
    Result<ParsedResponse, ParseError>.Success { value } => move value
    Result<ParsedResponse, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let head = match ResponseParser.head(&parsed.parser) {
    Result<ResponseHead, ParseError>.Success { value } => value
    Result<ResponseHead, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let context = match ResponseContext.make(head, Method.get(), TrailerPolicy.defaultPolicy()) {
    Result<ResponseContext, BodyError>.Success { value } => move value
    Result<ResponseContext, BodyError>.Failure { error: _ } => {
      return 1
    }
  }
  let options = FetchOptions.defaults()
  let plan = match CodingPlan.make(
    move context,
    Mode.Decode,
    limits.responseBody,
    move options.contentLimits
  ) {
    Result<CodingPlan, ContentError>.Success { value } => move value
    Result<CodingPlan, ContentError>.Failure { error: _ } => {
      return 1
    }
  }
  let made = run Effect.result(Decoder.make(move plan))
  let mut decoder = match move made {
    Result.Success { value } => move value
    Result.Failure { error } => {
      drop error
      return 1
    }
  }

  // gzip of "hello hello hello"
  let body: [u8; 28] = [
    31,
    139,
    8,
    0,
    0,
    0,
    0,
    0,
    2,
    255,
    203,
    72,
    205,
    201,
    201,
    87,
    200,
    64,
    144,
    0,
    128,
    136,
    249,
    229,
    17,
    0,
    0,
    0,
  ]

  // A step can return no bytes. Call it again until the state is End.
  let mut chunk: [u8; 64] = [0; 64]
  let mut offset = usize.ZERO
  let mut total = usize.ZERO
  let mut first: u8 = 0
  let mut done = false
  let mut steps = 0
  while !done && steps < 1000 {
    let rest = Slice.view<u8>(&body, offset, body.length - offset)
    let step = match Decoder.step(&mut decoder, rest, &mut chunk, true) {
      Result<DecodeProgress, DecodeFailure>.Success { value } => move value
      Result<DecodeProgress, DecodeFailure>.Failure { error: _ } => {
        return 1
      }
    }
    offset = offset + step.consumed
    if step.progress.written > usize.ZERO && total == usize.ZERO {
      first = chunk[0]
    }
    total = total + step.progress.written
    done = step.progress.state == ContentProgressState.End
    steps = steps + 1
  }
  if !done || total != 17 || first != 104 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `ContentReader` with `import silk.http_content { ContentReader }`.

Public declarations: 25.

::Anchor{id="Mode"}

## `Mode`

```silk
pub enum Mode
```

Whether to decode the content.

::Anchor{id="Mode.Raw"}

### `Raw`

```silk
Raw
```

Return the body as it was sent. `Content-Encoding` is not read.

::Anchor{id="Mode.Decode"}

### `Decode`

```silk
Decode
```

Decode the codings in `Content-Encoding`.

::Anchor{id="Coding"}

## `Coding`

```silk
pub enum Coding
```

A content coding that this module knows.

::Anchor{id="Coding.Identity"}

### `Identity`

```silk
Identity
```

`identity`: no change. It still counts in `maxDepth`.

::Anchor{id="Coding.Gzip"}

### `Gzip`

```silk
Gzip
```

`gzip`. More gzip members after the first are decoded too.

::Anchor{id="Coding.XGzip"}

### `XGzip`

```silk
XGzip
```

`x-gzip`, the old name of `gzip`.

::Anchor{id="Coding.Deflate"}

### `Deflate`

```silk
Deflate
```

`deflate`, as a zlib stream. Raw DEFLATE without the zlib wrapper fails.

::Anchor{id="Coding.Zstd"}

### `Zstd`

```silk
Zstd
```

`zstd`, within the window and memory limits.

::Anchor{id="CodingPosition"}

## `CodingPosition`

```silk
pub struct CodingPosition
```

Where a coding is in the `Content-Encoding` fields.

::Anchor{id="CodingPosition.wireIndex"}

### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding over all `Content-Encoding` fields, from 0.

::Anchor{id="CodingPosition.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: usize
```

The position of the field in the response head, from 0.

::Anchor{id="CodingPosition.elementIndex"}

### Field `elementIndex`

```silk
pub elementIndex: usize
```

The position of the coding in its field, from 0.

::Anchor{id="CodingPosition.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset of the coding, or the bad byte, in the field value.

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

The limits for content decoding.

::Anchor{id="Limits.maxEncoded"}

### Field `maxEncoded`

```silk
pub maxEncoded: u64
```

The maximum body bytes before decoding, after the framing is removed.

::Anchor{id="Limits.maxIntermediate"}

### Field `maxIntermediate`

```silk
pub maxIntermediate: u64
```

The maximum total bytes from all decoding stages except the last.

::Anchor{id="Limits.maxDecoded"}

### Field `maxDecoded`

```silk
pub maxDecoded: u64
```

The maximum decoded bytes.

::Anchor{id="Limits.maxOwned"}

### Field `maxOwned`

```silk
pub maxOwned: usize
```

The maximum memory for the decoders, without the memory of the body decoder.

::Anchor{id="Limits.maxDepth"}

### Field `maxDepth`

```silk
pub maxDepth: usize
```

The maximum number of codings, including `identity`. It is from 1 to 4.

::Anchor{id="Limits.intermediateCapacity"}

### Field `intermediateCapacity`

```silk
pub intermediateCapacity: usize
```

The size of the buffer between two stages. It is from 1 to 65536.

::Anchor{id="Limits.inflate"}

### Field `inflate`

```silk
pub inflate: InflateLimits
```

The limits for each gzip or deflate decoder.

::Anchor{id="Limits.zstd"}

### Field `zstd`

```silk
pub zstd: ZstdLimits
```

The limits for each Zstandard decoder.

::Anchor{id="ContentLimitKind"}

## `ContentLimitKind`

```silk
pub enum ContentLimitKind
```

The limit that failed. See [`ContentReason.InvalidLimit`](#ContentReason.InvalidLimit).

::Anchor{id="ContentLimitKind.CodingDepth"}

### `CodingDepth`

```silk
CodingDepth
```

`maxDepth`.

::Anchor{id="ContentLimitKind.IntermediateCapacity"}

### `IntermediateCapacity`

```silk
IntermediateCapacity
```

`intermediateCapacity`.

::Anchor{id="ContentLimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

`maxOwned`.

::Anchor{id="ContentLimitKind.EncodedBytes"}

### `EncodedBytes`

```silk
EncodedBytes
```

`maxEncoded`.

::Anchor{id="ContentLimitKind.IntermediateBytes"}

### `IntermediateBytes`

```silk
IntermediateBytes
```

`maxIntermediate`.

::Anchor{id="ContentLimitKind.DecodedBytes"}

### `DecodedBytes`

```silk
DecodedBytes
```

`maxDecoded`.

::Anchor{id="ContentReason"}

## `ContentReason`

```silk
pub union ContentReason<'head>
```

The reason that content decoding failed.

::Anchor{id="ContentReason.InvalidLimit"}

### `InvalidLimit`

```silk
InvalidLimit
```

A limit is not valid, or a byte count exceeded it.

::Anchor{id="ContentReason.InvalidLimit.limit"}

#### Field `limit`

```silk
pub limit: ContentLimitKind
```

The limit.

::Anchor{id="ContentReason.InvalidLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The value of the limit.

::Anchor{id="ContentReason.InvalidLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The value that was found.

::Anchor{id="ContentReason.CodingSyntax"}

### `CodingSyntax`

```silk
CodingSyntax
```

An item in `Content-Encoding` is empty or not valid.

::Anchor{id="ContentReason.CodingSyntax.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

Where the item is.

::Anchor{id="ContentReason.UnsupportedCoding"}

### `UnsupportedCoding`

```silk
UnsupportedCoding
```

A coding has no decoder, for example `br`.

::Anchor{id="ContentReason.UnsupportedCoding.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

Where the coding is.

::Anchor{id="ContentReason.UnsupportedCoding.token"}

#### Field `token`

```silk
pub token: &'head [u8]
```

The name of the coding, from the response head.

::Anchor{id="ContentReason.PartialResponse"}

### `PartialResponse`

```silk
PartialResponse
```

A 206 partial response has a coding other than `identity`, and `Mode.Decode` cannot decode a
part.

::Anchor{id="ContentReason.PartialResponse.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The first coding that is not `identity`.

::Anchor{id="ContentReason.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The body is a tunnel, not content.

::Anchor{id="ContentReason.Body"}

### `Body`

```silk
Body
```

The body framing failed.

::Anchor{id="ContentReason.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The error from `silk.http_body`.

::Anchor{id="ContentReason.Buffer"}

### `Buffer`

```silk
Buffer
```

Reading from the transport failed.

::Anchor{id="ContentReason.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The error, with its transport cause.

::Anchor{id="ContentReason.Inflate"}

### `Inflate`

```silk
Inflate
```

Gzip or deflate decoding failed.

::Anchor{id="ContentReason.Inflate.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0. Stage 0 decodes the last coding.

::Anchor{id="ContentReason.Inflate.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="ContentReason.Inflate.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The error from `silk.inflate`.

::Anchor{id="ContentReason.Zstandard"}

### `Zstandard`

```silk
Zstandard
```

Zstandard decoding failed.

::Anchor{id="ContentReason.Zstandard.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0. Stage 0 decodes the last coding.

::Anchor{id="ContentReason.Zstandard.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="ContentReason.Zstandard.error"}

#### Field `error`

```silk
pub error: ZstdError
```

The error from `silk.zstd`.

::Anchor{id="ContentReason.TrailingEncodedData"}

### `TrailingEncodedData`

```silk
TrailingEncodedData
```

There were more bytes after the end of a compressed stream.

::Anchor{id="ContentReason.TrailingEncodedData.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0. Stage 0 decodes the last coding.

::Anchor{id="ContentReason.TrailingEncodedData.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="ContentReason.ArithmeticOverflow"}

### `ArithmeticOverflow`

```silk
ArithmeticOverflow
```

A byte count overflowed.

::Anchor{id="ContentReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The reader had already failed or stopped.

::Anchor{id="ContentError"}

## `ContentError`

```silk
pub struct ContentError<'head>
```

The error from content decoding, with the byte counts so far.

::Anchor{id="ContentError.reason"}

### Field `reason`

```silk
pub reason: ContentReason<'head>
```

The reason.

::Anchor{id="ContentError.written"}

### Field `written`

```silk
pub written: usize
```

The decoded bytes written by the call before the error.

::Anchor{id="ContentError.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

The total body bytes read, after the framing is removed.

::Anchor{id="ContentError.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

The total bytes from all stages except the last.

::Anchor{id="ContentError.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

The total decoded bytes written.

::Anchor{id="ContentProgressState"}

## `ContentProgressState`

```silk
pub enum ContentProgressState
```

Whether the content is complete.

::Anchor{id="ContentProgressState.Data"}

### `Data`

```silk
Data
```

There is more content. The bytes so far are not final.

::Anchor{id="ContentProgressState.End"}

### `End`

```silk
End
```

The body and all decoding completed, and all checks passed.

::Anchor{id="ContentProgress"}

## `ContentProgress`

```silk
pub struct ContentProgress
```

The progress of a read.

::Anchor{id="ContentProgress.written"}

### Field `written`

```silk
pub written: usize
```

The decoded bytes written by this call.

::Anchor{id="ContentProgress.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

The total body bytes read, after the framing is removed.

::Anchor{id="ContentProgress.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

The total bytes from all stages except the last.

::Anchor{id="ContentProgress.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

The total decoded bytes written.

::Anchor{id="ContentProgress.state"}

### Field `state`

```silk
pub state: ContentProgressState
```

Whether the content is complete.

::Anchor{id="ReuseDisposition"}

## `ReuseDisposition`

```silk
pub enum ReuseDisposition
```

Whether the connection can be used again after this response.

::Anchor{id="ReuseDisposition.EligibleAfterCompletion"}

### `EligibleAfterCompletion`

```silk
EligibleAfterCompletion
```

Yes, but only after the content completes.

::Anchor{id="ReuseDisposition.Reusable"}

### `Reusable`

```silk
Reusable
```

Yes. The body had a clear end, there was no problem, and the content completed.

::Anchor{id="ReuseDisposition.NonReusable"}

### `NonReusable`

```silk
NonReusable
```

No. The body ends when the connection closes, or the framing had a problem.

::Anchor{id="AppliedPlan"}

## `AppliedPlan`

```silk
pub struct AppliedPlan
```

A summary of a [`CodingPlan`](#CodingPlan).

::Anchor{id="AppliedPlan.mode"}

### Field `mode`

```silk
pub mode: Mode
```

Whether the content is decoded.

::Anchor{id="AppliedPlan.codingCount"}

### Field `codingCount`

```silk
pub codingCount: usize
```

The number of codings in `Content-Encoding`, including `identity`.

::Anchor{id="AppliedPlan.decoderCount"}

### Field `decoderCount`

```silk
pub decoderCount: usize
```

The number of decoders that run, without `identity`.

::Anchor{id="AppliedPlan.reuse"}

### Field `reuse`

```silk
pub reuse: ReuseDisposition
```

Whether the connection can be used again.

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

Information about the decoded content. The headers of the response are not changed.

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

Returns the response head as received, with its `Content-Encoding` and `Content-Length`.

::Anchor{id="RepresentationView.impl.appliedPlan"}

### Method `appliedPlan`

```silk
pub fn appliedPlan(self: &Self) -> AppliedPlan
```

Returns the summary of the plan.

::Anchor{id="RepresentationView.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns a framing problem of the response, if any.

::Anchor{id="RepresentationView.impl.decodingApplied"}

### Method `decodingApplied`

```silk
pub fn decodingApplied(self: &Self) -> bool
```

Returns `true` if at least one decoder runs.

::Anchor{id="RepresentationView.impl.decodedLength"}

### Method `decodedLength`

```silk
pub fn decodedLength(self: &Self) -> Option<u64>
```

Returns the decoded length after completion, 0 for a response without a body, or `None` before
completion.

::Anchor{id="ContentCompletion"}

## `ContentCompletion`

```silk
pub struct ContentCompletion<'owner>
```

Proof that the body and all decoding completed.

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

Returns how the body ended: at a clear end, or when the connection closed.

::Anchor{id="ContentCompletion.impl.decodedBytes"}

### Method `decodedBytes`

```silk
pub fn decodedBytes(self: &Self) -> u64
```

Returns the number of decoded bytes.

::Anchor{id="ContentCompletion.impl.anomaly"}

### Method `anomaly`

```silk
pub fn anomaly(self: &Self) -> Anomaly
```

Returns a framing problem of the response, if any.

::Anchor{id="ContentCompletion.impl.reuse"}

### Method `reuse`

```silk
pub fn reuse(self: &Self) -> ReuseDisposition
```

Returns whether the connection can be used again.

::Anchor{id="ResponseContext"}

## `ResponseContext`

```silk
pub struct ResponseContext<'head, 'method, 'names>
```

A response head with its request method and trailer policy, ready for a [`CodingPlan`](#CodingPlan).

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

Selects the body framing of `head`, and returns a context. Fails if the framing is not valid.

::Anchor{id="CodingPlan"}

## `CodingPlan`

```silk
pub struct CodingPlan<'head, 'method, 'names>
```

A checked plan to decode one response body. Use it one time.

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

Reads `Content-Encoding` in `Mode.Decode`, and checks all limits and memory.

It does not allocate or read the body.

::Anchor{id="CodingPlan.impl.originalHead"}

### Method `originalHead`

```silk
pub fn originalHead(self: &Self) -> ResponseHead<'head>
```

Returns the response head as received.

::Anchor{id="CodingPlan.impl.selectionAnomaly"}

### Method `selectionAnomaly`

```silk
pub fn selectionAnomaly(self: &Self) -> Anomaly
```

Returns a framing problem of the response, if any.

::Anchor{id="CodingPlan.impl.selectedFraming"}

### Method `selectedFraming`

```silk
pub fn selectedFraming(self: &Self) -> Framing
```

Returns the body framing.

::Anchor{id="CodingPlan.impl.applied"}

### Method `applied`

```silk
pub fn applied(self: &Self) -> AppliedPlan
```

Returns the summary of the plan.

::Anchor{id="CodingPlan.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the memory that the plan needs, as counted against `maxOwned`.

::Anchor{id="EnabledCodings"}

## `EnabledCodings`

```silk
pub struct EnabledCodings
```

The codings to name in an automatic `Accept-Encoding` field. `x-gzip` is never named.

::Anchor{id="EnabledCodings.gzip"}

### Field `gzip`

```silk
pub gzip: bool
```

Name `gzip`.

::Anchor{id="EnabledCodings.deflate"}

### Field `deflate`

```silk
pub deflate: bool
```

Name `deflate`.

::Anchor{id="EnabledCodings.zstd"}

### Field `zstd`

```silk
pub zstd: bool
```

Name `zstd`.

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

What to send when no coding is enabled.

::Anchor{id="EmptyEncodingPolicy.Identity"}

### `Identity`

```silk
Identity
```

Send `Accept-Encoding: identity`.

::Anchor{id="EmptyEncodingPolicy.Omit"}

### `Omit`

```silk
Omit
```

Send no `Accept-Encoding` field.

::Anchor{id="AcceptEncoding"}

## `AcceptEncoding`

```silk
pub union AcceptEncoding<'value>
```

How to make the `Accept-Encoding` field.

::Anchor{id="AcceptEncoding.Automatic"}

### `Automatic`

```silk
Automatic
```

Name the enabled codings, in the order gzip, deflate, zstd. Only in `Mode.Decode`.

::Anchor{id="AcceptEncoding.Automatic.enabled"}

#### Field `enabled`

```silk
pub enabled: EnabledCodings
```

The codings to name.

::Anchor{id="AcceptEncoding.Automatic.empty"}

#### Field `empty`

```silk
pub empty: EmptyEncodingPolicy
```

What to send when no coding is enabled.

::Anchor{id="AcceptEncoding.Override"}

### `Override`

```silk
Override
```

Send this value. The response is still checked as in the other cases.

::Anchor{id="AcceptEncoding.Override.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The field value.

::Anchor{id="AcceptEncoding.Omit"}

### `Omit`

```silk
Omit
```

Send no `Accept-Encoding` field.

::Anchor{id="acceptEncoding"}

## `acceptEncoding`

```silk
pub fn acceptEncoding<'value>(
  mode: Mode,
  policy: AcceptEncoding<'value>,
  limits: HeaderLimits,
) -> Result<Option<Header<'value>>, ValueError>
```

Returns the `Accept-Encoding` field for `mode` and `policy`, or `None` when no field is sent.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits<'head>(limits: &Limits) -> Result<(), ContentError<'head>>
```

Checks `limits` without allocation or I/O.

### Details
`maxDepth` must be from 1 to 4, and `intermediateCapacity` from 1 to 65536. The other limits can
be 0, and are checked during planning or decoding. The limits of a decoder are checked when a
plan selects it.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

Decodes a body from wire bytes that you give, without I/O.

### Details
The decoder owns its state. Bytes that `step` does not use, such as the next HTTP message, stay
with you.

::Anchor{id="DecodeProgress"}

## `DecodeProgress`

```silk
pub struct DecodeProgress
```

The result of a [`Decoder.step`](#Decoder.impl.step).

::Anchor{id="DecodeProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The input bytes that the step used.

::Anchor{id="DecodeProgress.progress"}

### Field `progress`

```silk
pub progress: ContentProgress
```

The decoded bytes and the totals.

::Anchor{id="DecodeProgress.needsInput"}

### Field `needsInput`

```silk
pub needsInput: bool
```

`true` when the decoder needs more input before it can continue.

::Anchor{id="DecodeFailure"}

## `DecodeFailure`

```silk
pub struct DecodeFailure
```

The error from a [`Decoder.step`](#Decoder.impl.step).

::Anchor{id="DecodeFailure.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The input bytes that the step used before the error.

::Anchor{id="DecodeFailure.error"}

### Field `error`

```silk
pub error: ContentError<'static>
```

The error.

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

Returns a decoder for `plan`, and allocates its memory.

::Anchor{id="Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], endOfInput: bool) -> Result<
    DecodeProgress,
    DecodeFailure,
  >
```

Decodes from `input` into `output`, and returns how much it used and wrote.

#### Details
Set `endOfInput` to `true` when no bytes come after `input`. The decoded bytes are final only
after the state is `End`. A step can write no bytes, so call it again. An empty `output` does
nothing.

::Anchor{id="Decoder.impl.progress"}

### Method `progress`

```silk
pub fn progress(self: &Self) -> ContentProgress
```

Returns the totals so far.

::Anchor{id="Decoder.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(self: &'owner Self) -> Result<
    Option<ContentCompletion<'owner>>,
    ContentError<'static>,
  >
```

Returns proof of completion, or `None` if the content is not complete.

::Anchor{id="Decoder.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(self: &'owner Self) -> Result<
    Option<Trailers<'owner>>,
    ContentError<'static>,
  >
```

Returns the trailers, after the content completes.

::Anchor{id="Decoder.impl.abandon"}

### Method `abandon`

```silk
pub fn abandon(self: &mut Self) -> ()
```

Stops the decoder. Later calls fail.

::Anchor{id="ContentReader"}

## `ContentReader`

```silk
pub struct ContentReader<'reader, 'transport, 'head, P>
```

Reads the content of a body in the callback of [`withReader`](#withReader).

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

Returns information about the response head and the plan.

::Anchor{id="ContentReader.impl.completion"}

### Method `completion`

```silk
pub fn completion<'owner>(
    self: &'owner Self,
  ) -> Result<Option<ContentCompletion<'owner>>, ContentError<'head>>
```

Returns proof of completion, after the body and all decoders finish.

::Anchor{id="ContentReader.impl.trailers"}

### Method `trailers`

```silk
pub fn trailers<'owner>(
    self: &'owner Self,
  ) -> Result<Option<Trailers<'owner>>, ContentError<'head>>
```

Returns the trailers, after the content completes.

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

Reads decoded bytes into `output`. The bytes are final only after the state is `End`.
`deadline` is on the `MonotonicClock`.

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

Gives a [`ContentReader`](#ContentReader) for the body in `body` to `callback`, with the decoders of `plan`.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
