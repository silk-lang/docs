Bounded incremental HTTP/1.0 and HTTP/1.1 head parsing and atomic serialization.

## When to use

Use [`RequestParser`](#RequestParser) or [`ResponseParser`](#ResponseParser) at a buffered transport boundary. Each parser owns
all byte and field-index storage up front, reports exactly how much of the current input it
consumed, and stops after the terminating empty line so body or next-message bytes stay with
the caller.

## Details

The accepted profile requires CRLF, exact single-SP start-line separators, and field names
immediately followed by `:`. It rejects leading blank lines, bare LF, obs-fold, HTTP/0.9, ICY,
and historical whitespace recovery. Completed heads and their field iterators borrow the parser;
use [`RequestHead.copy`](#RequestHead.impl.copy) or [`ResponseHead.copy`](#ResponseHead.impl.copy) for independent ownership.

Construction accounts for the configured head-byte backing plus 32 bytes of portable offset
metadata per field against `maxOwnedBytes`. Parser scalar and allocator bookkeeping are not part
of that caller-visible capacity. Feed, head access, reset, and serialization allocate nothing.

Import as `RequestParser` with `import silk.http_head { RequestParser }`.

Public declarations: 22.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Explicit finite parser, line, field, value, and owned-storage limits.

::Anchor{id="Limits.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

Maximum complete head bytes, including every CRLF and the terminating empty line.

::Anchor{id="Limits.maxStartLineBytes"}

### Field `maxStartLineBytes`

```silk
pub maxStartLineBytes: usize
```

Maximum request/status line bytes, including its CRLF.

::Anchor{id="Limits.maxFieldLineBytes"}

### Field `maxFieldLineBytes`

```silk
pub maxFieldLineBytes: usize
```

Maximum field-line bytes, including its CRLF.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

Maximum parser byte backing plus field-offset metadata bytes.

::Anchor{id="Limits.values"}

### Field `values`

```silk
pub values: ValueLimits
```

Shared method, target, name, value, field-count, and aggregate field limits.

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

The outcome of one successful incremental feed.

::Anchor{id="ProgressState.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

More bytes are required to complete the head.

::Anchor{id="ProgressState.Complete"}

### `Complete`

```silk
Complete
```

The terminating empty line was consumed and the parser now publishes a head.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

Exact progress through the current caller input.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Bytes consumed from this call only.

::Anchor{id="Progress.state"}

### Field `state`

```silk
pub state: ProgressState
```

Whether one complete head is now available.

::Anchor{id="Progress.impl.Copy"}

## Implementation `Copy for Progress`

```silk
impl Copy for Progress
```

::Anchor{id="ParserState"}

## `ParserState`

```silk
pub enum ParserState
```

The externally visible parser lifecycle.

::Anchor{id="ParserState.Active"}

### `Active`

```silk
Active
```

The parser can accept more input.

::Anchor{id="ParserState.Complete"}

### `Complete`

```silk
Complete
```

One complete head is available and the parser cannot be fed again before reset.

::Anchor{id="ParserState.Failed"}

### `Failed`

```silk
Failed
```

A syntax, limit, or truncation failure poisoned the parser until reset.

::Anchor{id="ParseComponent"}

## `ParseComponent`

```silk
pub enum ParseComponent
```

The syntactic or semantic component associated with a parser failure.

::Anchor{id="ParseComponent.Parser"}

### `Parser`

```silk
Parser
```

Parser construction, lifecycle, or complete-head state.

::Anchor{id="ParseComponent.StartLine"}

### `StartLine`

```silk
StartLine
```

Request or response start line as a whole.

::Anchor{id="ParseComponent.Version"}

### `Version`

```silk
Version
```

HTTP version token.

::Anchor{id="ParseComponent.Method"}

### `Method`

```silk
Method
```

Request method token.

::Anchor{id="ParseComponent.Target"}

### `Target`

```silk
Target
```

Request target.

::Anchor{id="ParseComponent.Status"}

### `Status`

```silk
Status
```

Response status digits or range.

::Anchor{id="ParseComponent.ReasonPhrase"}

### `ReasonPhrase`

```silk
ReasonPhrase
```

Response reason phrase.

::Anchor{id="ParseComponent.HeaderName"}

### `HeaderName`

```silk
HeaderName
```

Field name.

::Anchor{id="ParseComponent.HeaderValue"}

### `HeaderValue`

```silk
HeaderValue
```

Field value after surrounding OWS removal.

::Anchor{id="ParseComponent.Host"}

### `Host`

```silk
Host
```

HTTP Host field requirement or authority.

::Anchor{id="ParseComponent.LineEnding"}

### `LineEnding`

```silk
LineEnding
```

Line delimiter syntax.

::Anchor{id="ParseLimitKind"}

## `ParseLimitKind`

```silk
pub enum ParseLimitKind
```

The finite parser budget that was exceeded.

::Anchor{id="ParseLimitKind.HeadBytes"}

### `HeadBytes`

```silk
HeadBytes
```

Complete stored head bytes.

::Anchor{id="ParseLimitKind.StartLineBytes"}

### `StartLineBytes`

```silk
StartLineBytes
```

Request or response start-line bytes, including CRLF.

::Anchor{id="ParseLimitKind.FieldLineBytes"}

### `FieldLineBytes`

```silk
FieldLineBytes
```

One field-line bytes, including CRLF.

::Anchor{id="ParseLimitKind.Fields"}

### `Fields`

```silk
Fields
```

Number of fields, including duplicates and unknown names.

::Anchor{id="ParseLimitKind.MethodBytes"}

### `MethodBytes`

```silk
MethodBytes
```

Method bytes from the shared HTTP value contract.

::Anchor{id="ParseLimitKind.TargetBytes"}

### `TargetBytes`

```silk
TargetBytes
```

Request-target bytes from the shared HTTP value contract.

::Anchor{id="ParseLimitKind.NameBytes"}

### `NameBytes`

```silk
NameBytes
```

Field-name bytes from the shared HTTP value contract.

::Anchor{id="ParseLimitKind.ValueBytes"}

### `ValueBytes`

```silk
ValueBytes
```

Field-value or reason bytes from the shared HTTP value contract.

::Anchor{id="ParseLimitKind.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

Aggregate field-name plus field-value bytes.

::Anchor{id="ParseLimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

Parser-owned byte backing and field-offset storage.

::Anchor{id="ParseReason"}

## `ParseReason`

```silk
pub union ParseReason
```

Closed parser and serializer failure reasons.

::Anchor{id="ParseReason.InvalidStartLine"}

### `InvalidStartLine`

```silk
InvalidStartLine
```

A start line does not match the selected strict grammar.

::Anchor{id="ParseReason.UnsupportedVersion"}

### `UnsupportedVersion`

```silk
UnsupportedVersion
```

A version is not exactly HTTP/1.0 or HTTP/1.1.

::Anchor{id="ParseReason.InvalidMethod"}

### `InvalidMethod`

```silk
InvalidMethod
```

A request method is not a nonempty HTTP token.

::Anchor{id="ParseReason.InvalidTarget"}

### `InvalidTarget`

```silk
InvalidTarget
```

A request target is invalid for its method or target form.

::Anchor{id="ParseReason.InvalidStatus"}

### `InvalidStatus`

```silk
InvalidStatus
```

A response status is not exactly three digits in the range 100 through 599.

::Anchor{id="ParseReason.InvalidReasonPhrase"}

### `InvalidReasonPhrase`

```silk
InvalidReasonPhrase
```

A reason phrase contains a forbidden control octet or DEL.

::Anchor{id="ParseReason.InvalidFieldName"}

### `InvalidFieldName`

```silk
InvalidFieldName
```

A field name is empty or contains a byte outside `tchar`.

::Anchor{id="ParseReason.InvalidFieldValue"}

### `InvalidFieldValue`

```silk
InvalidFieldValue
```

A trimmed field value contains a forbidden octet.

::Anchor{id="ParseReason.BareLf"}

### `BareLf`

```silk
BareLf
```

LF appeared without a preceding CR.

::Anchor{id="ParseReason.InvalidLineEnding"}

### `InvalidLineEnding`

```silk
InvalidLineEnding
```

A CR was not followed by LF.

::Anchor{id="ParseReason.WhitespaceBeforeColon"}

### `WhitespaceBeforeColon`

```silk
WhitespaceBeforeColon
```

SP or HTAB appeared between a field name and its colon.

::Anchor{id="ParseReason.ObsFold"}

### `ObsFold`

```silk
ObsFold
```

A field line began with SP or HTAB, which this profile never unfolds.

::Anchor{id="ParseReason.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

HTTP/1.1 had no Host field.

::Anchor{id="ParseReason.DuplicateHost"}

### `DuplicateHost`

```silk
DuplicateHost
```

More than one Host field was present.

::Anchor{id="ParseReason.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

A supplied Host field was not a valid authority.

::Anchor{id="ParseReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

One explicit finite limit was exceeded.

::Anchor{id="ParseReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: ParseLimitKind
```

The rejected budget.

::Anchor{id="ParseReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

Configured maximum.

::Anchor{id="ParseReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

Attempted count.

::Anchor{id="ParseReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked capacity or serialized-size arithmetic overflowed `usize`.

::Anchor{id="ParseReason.Truncated"}

### `Truncated`

```silk
Truncated
```

Final input ended before the terminating empty line.

::Anchor{id="ParseReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The operation is not valid for the parser's current lifecycle.

::Anchor{id="ParseReason.impl.Copy"}

## Implementation `Copy for ParseReason`

```silk
impl Copy for ParseReason
```

::Anchor{id="ParseError"}

## `ParseError`

```silk
pub struct ParseError
```

A precise parser failure with per-call progress and absolute head location.

::Anchor{id="ParseError.reason"}

### Field `reason`

```silk
pub reason: ParseReason
```

Recovery-oriented failure category.

::Anchor{id="ParseError.component"}

### Field `component`

```silk
pub component: ParseComponent
```

Component that failed.

::Anchor{id="ParseError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Valid prefix consumed from the call that produced this error.

::Anchor{id="ParseError.offset"}

### Field `offset`

```silk
pub offset: usize
```

Zero-based absolute byte offset in the head.

::Anchor{id="ParseError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

Field ordinal when the failure belongs to one field.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits(limits: &Limits) -> Result<(), ParseError>
```

Validates parser storage arithmetic and the owned-storage limit without allocation or input.

### Details

The required storage contains `maxHeadBytes` plus fixed field metadata for `maxFields`.
Arithmetic overflow returns `SizeOverflow`. Excess storage returns the exact `OwnedBytes` limit.

::Anchor{id="RequestParser"}

## `RequestParser`

```silk
pub struct RequestParser
```

An affine owner of one bounded incremental request-head parse.

::Anchor{id="ResponseParser"}

## `ResponseParser`

```silk
pub struct ResponseParser
```

An affine owner of one bounded incremental response-head parse.

::Anchor{id="RequestHead"}

## `RequestHead`

```silk
pub struct RequestHead<'owner>
```

A completed request head whose values and fields borrow its parser.

::Anchor{id="RequestHead.impl.Copy"}

## Implementation `Copy for RequestHead<'owner>`

```silk
impl<'owner> Copy for RequestHead<'owner>
```

::Anchor{id="ResponseHead"}

## `ResponseHead`

```silk
pub struct ResponseHead<'owner>
```

A completed response head whose values and fields borrow its parser.

::Anchor{id="ResponseHead.impl.Copy"}

## Implementation `Copy for ResponseHead<'owner>`

```silk
impl<'owner> Copy for ResponseHead<'owner>
```

::Anchor{id="HeaderIterator"}

## `HeaderIterator`

```silk
pub struct HeaderIterator<'owner>
```

An insertion-order iterator over validated fields borrowed from a completed parser.

::Anchor{id="ParsedRequest"}

## `ParsedRequest`

```silk
pub struct ParsedRequest
```

Whole-slice request parsing result, retaining both the parser and exact suffix boundary.

::Anchor{id="ParsedRequest.parser"}

### Field `parser`

```silk
pub parser: RequestParser
```

Completed parser. Borrow it with [`RequestParser.head`](#RequestParser.impl.head).

::Anchor{id="ParsedRequest.progress"}

### Field `progress`

```silk
pub progress: Progress
```

Exact progress through the supplied whole slice.

::Anchor{id="ParsedResponse"}

## `ParsedResponse`

```silk
pub struct ParsedResponse
```

Whole-slice response parsing result, retaining both the parser and exact suffix boundary.

::Anchor{id="ParsedResponse.parser"}

### Field `parser`

```silk
pub parser: ResponseParser
```

Completed parser. Borrow it with [`ResponseParser.head`](#ResponseParser.impl.head).

::Anchor{id="ParsedResponse.progress"}

### Field `progress`

```silk
pub progress: Progress
```

Exact progress through the supplied whole slice.

::Anchor{id="RequestParser.impl"}

## Implementation `RequestParser`

```silk
impl RequestParser
```

::Anchor{id="RequestParser.impl.make"}

### Associated function `make`

```silk
pub effect fn make(limits: Limits) -> Result<RequestParser, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Validates capacity arithmetic and acquires all parser storage before publishing the parser.

::Anchor{id="RequestParser.impl.feed"}

### Method `feed`

```silk
pub fn feed(self: &mut Self, input: &[u8], final: bool) -> Result<Progress, ParseError>
```

Consumes an exact prefix, never crossing the terminating empty line.

::Anchor{id="RequestParser.impl.state"}

### Method `state`

```silk
pub fn state(self: &Self) -> ParserState
```

Returns the current parser lifecycle.

::Anchor{id="RequestParser.impl.failure"}

### Method `failure`

```silk
pub fn failure(self: &Self) -> Option<ParseError>
```

Returns the original poisoning failure, if one exists.

::Anchor{id="RequestParser.impl.head"}

### Method `head`

```silk
pub fn head<'owner>(self: &'owner Self) -> Result<RequestHead<'owner>, ParseError>
```

Borrows the completed request head and its ordered fields.

::Anchor{id="RequestParser.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> Result<(), ParseError>
```

Restores fresh active state while retaining the original allocations.
A live head borrow statically prevents this exclusive operation.

::Anchor{id="ResponseParser.impl"}

## Implementation `ResponseParser`

```silk
impl ResponseParser
```

::Anchor{id="ResponseParser.impl.make"}

### Associated function `make`

```silk
pub effect fn make(limits: Limits) -> Result<ResponseParser, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Validates capacity arithmetic and acquires all parser storage before publishing the parser.

::Anchor{id="ResponseParser.impl.feed"}

### Method `feed`

```silk
pub fn feed(self: &mut Self, input: &[u8], final: bool) -> Result<Progress, ParseError>
```

Consumes an exact prefix, never crossing the terminating empty line.

::Anchor{id="ResponseParser.impl.state"}

### Method `state`

```silk
pub fn state(self: &Self) -> ParserState
```

Returns the current parser lifecycle.

::Anchor{id="ResponseParser.impl.failure"}

### Method `failure`

```silk
pub fn failure(self: &Self) -> Option<ParseError>
```

Returns the original poisoning failure, if one exists.

::Anchor{id="ResponseParser.impl.head"}

### Method `head`

```silk
pub fn head<'owner>(self: &'owner Self) -> Result<ResponseHead<'owner>, ParseError>
```

Borrows the completed response head and its ordered fields.

::Anchor{id="ResponseParser.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> Result<(), ParseError>
```

Restores fresh active state while retaining the original allocations.
A live head borrow statically prevents this exclusive operation.

::Anchor{id="RequestHead.impl"}

## Implementation `RequestHead<'owner>`

```silk
impl<'owner> RequestHead<'owner>
```

::Anchor{id="RequestHead.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the parsed protocol version.

::Anchor{id="RequestHead.impl.method"}

### Method `method`

```silk
pub fn method(self: &Self) -> Method<'owner>
```

Returns the validated case-sensitive method token.

::Anchor{id="RequestHead.impl.target"}

### Method `target`

```silk
pub fn target(self: &Self) -> RequestTarget<'owner>
```

Returns the validated request target.

::Anchor{id="RequestHead.impl.fieldCount"}

### Method `fieldCount`

```silk
pub fn fieldCount(self: &Self) -> usize
```

Returns the number of fields, including duplicates.

::Anchor{id="RequestHead.impl.fields"}

### Method `fields`

```silk
pub fn fields(self: &Self) -> HeaderIterator<'owner>
```

Iterates fields in original order without combining duplicate names.

::Anchor{id="RequestHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: ValueLimits,
  ) -> Result<OwnedRequestHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies this head into the shared independently owned HTTP head representation.

::Anchor{id="ResponseHead.impl"}

## Implementation `ResponseHead<'owner>`

```silk
impl<'owner> ResponseHead<'owner>
```

::Anchor{id="ResponseHead.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the parsed protocol version.

::Anchor{id="ResponseHead.impl.status"}

### Method `status`

```silk
pub fn status(self: &Self) -> Status
```

Returns the parsed response status.

::Anchor{id="ResponseHead.impl.reason"}

### Method `reason`

```silk
pub fn reason(self: &Self) -> &'owner [u8]
```

Borrows the exact reason octets, which may be empty and need not be UTF-8.

::Anchor{id="ResponseHead.impl.fieldCount"}

### Method `fieldCount`

```silk
pub fn fieldCount(self: &Self) -> usize
```

Returns the number of fields, including duplicates.

::Anchor{id="ResponseHead.impl.fields"}

### Method `fields`

```silk
pub fn fields(self: &Self) -> HeaderIterator<'owner>
```

Iterates fields in original order without combining duplicate names.

::Anchor{id="ResponseHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: ValueLimits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies this head into the shared independently owned HTTP head representation.

::Anchor{id="ResponseHead.impl.copyMatchingHeaders"}

### Method `copyMatchingHeaders`

```silk
pub effect fn copyMatchingHeaders<'name>(
    self: &Self,
    name: string<'name>,
    limits: ValueLimits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the status, reason, and only matching fields into independent storage.

#### Details

Matching is ASCII case-insensitive. Duplicate matches remain distinct and preserve wire order.
The supplied limits apply to the selected fields and complete owned result, not unrelated
fields retained by the parser.

::Anchor{id="HeaderIterator.impl"}

## Implementation `HeaderIterator<'owner>`

```silk
impl<'owner> HeaderIterator<'owner>
```

::Anchor{id="HeaderIterator.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut Self) -> Option<Header<'owner>>
```

Returns the next validated field, or `None` after the final field.

::Anchor{id="HeaderIterator.impl.fieldIndex"}

### Method `fieldIndex`

```silk
pub fn fieldIndex(self: &Self) -> usize
```

Returns the source field ordinal yielded by the most recent successful call.

::Anchor{id="parseRequest"}

## `parseRequest`

```silk
pub effect fn parseRequest(
  input: &[u8],
  limits: Limits,
) -> Result<ParsedRequest, ParseError> ! OutOfMemoryError ? &mut Allocator
```

Parses one request head from a whole slice through the same incremental core.
The returned progress retains the exact suffix boundary when additional bytes follow the head.

::Anchor{id="parseResponse"}

## `parseResponse`

```silk
pub effect fn parseResponse(
  input: &[u8],
  limits: Limits,
) -> Result<ParsedResponse, ParseError> ! OutOfMemoryError ? &mut Allocator
```

Parses one response head from a whole slice through the same incremental core.
The returned progress retains the exact suffix boundary when additional bytes follow the head.

::Anchor{id="requestSerializedSize"}

## `requestSerializedSize`

```silk
pub fn requestSerializedSize<'value>(
  head: &ValueRequestHead<'value>,
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Computes the exact canonical request-head size without mutating output.

::Anchor{id="responseSerializedSize"}

## `responseSerializedSize`

```silk
pub fn responseSerializedSize<'value>(
  head: &ValueResponseHead<'value>,
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Computes the exact canonical response-head size without mutating output.

::Anchor{id="writeRequestInto"}

## `writeRequestInto`

```silk
pub fn writeRequestInto<'value>(
  head: &ValueRequestHead<'value>,
  output: &mut [u8],
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Writes one validated request head atomically with canonical SP and CRLF separators.

::Anchor{id="writeResponseInto"}

## `writeResponseInto`

```silk
pub fn writeResponseInto<'value>(
  head: &ValueResponseHead<'value>,
  output: &mut [u8],
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Writes one validated response head atomically with canonical SP and CRLF separators.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
