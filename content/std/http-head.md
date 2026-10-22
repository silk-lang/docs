Parse and write the head of an HTTP/1.0 or HTTP/1.1 message: the start line and the header
fields.

## When to use
Use [`RequestParser`](#RequestParser) or [`ResponseParser`](#ResponseParser) to parse a head as its bytes arrive from a
transport. Use [`parseRequest`](#parseRequest) or [`parseResponse`](#parseResponse) when you have all the bytes. Use
[`writeRequestInto`](#writeRequestInto) and [`writeResponseInto`](#writeResponseInto) to write a head from `silk.http`.

## Details
A parser allocates all its memory in `make`. After that, `feed`, `head`, `reset`, and the write
functions do not allocate. `feed` returns how many bytes of the input it used, and stops after
the empty line that ends the head. The bytes after the head, such as the body, stay with you.
The head and its fields borrow the parser. Call `copy` to keep them after a `reset`.

`maxOwnedBytes` must hold `maxHeadBytes` plus 32 bytes for each field in `maxFields`. Check a
[`Limits`](#Limits) value with [`validateLimits`](#validateLimits).

## Errors
- [`ParseError`](#ParseError) tells which rule failed, the part, the byte offset in the head, and how many
  bytes of the current call were used.
- After an error, the parser stays failed until [`RequestParser.reset`](#RequestParser.impl.reset).
- `OutOfMemoryError` from `make` if the `Allocator` fails.

## Gotchas
The parser is strict. Lines must end with CRLF, and the start line uses one space between its
parts. These fail: a bare LF, a space before `:` in a field, a folded line, empty lines before
the start line, and HTTP/0.9.

## Examples
### Parse a response head
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http { Status }
import silk.http_head {
  Limits,
  ParseError,
  ParsedResponse,
  ProgressState,
  ResponseHead,
  ResponseParser,
  parseResponse
}
import silk.http_headers { Limits as ValueLimits }
import silk.result { Result }

fn limits() -> Limits {
  return Limits {
    maxHeadBytes: 4096,
    maxStartLineBytes: 1024,
    maxFieldLineBytes: 1024,
    maxOwnedBytes: 8192,
    values: ValueLimits {
      maxMethodBytes: 16,
      maxTargetBytes: 1024,
      maxNameBytes: 64,
      maxValueBytes: 1024,
      maxFields: 32,
      maxFieldBytes: 4096,
      maxOwnedBytes: 8192,
    },
  }
}

effect fn program() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let wire = b"HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhello"
  let parsed = run parseResponse(&wire, limits()) |> Effect.provideMut<Allocator>(&mut allocator)
  let result = match move parsed {
    Result<ParsedResponse, ParseError>.Success { value } => move value
    Result<ParsedResponse, ParseError>.Failure { error: _ } => {
      return 1
    }
  }

  // The parser stops after the head. The body "hello" starts at byte 38.
  if result.progress.consumed != 38 || result.progress.state != ProgressState.Complete {
    return 1
  }
  let head = match ResponseParser.head(&result.parser) {
    Result<ResponseHead, ParseError>.Success { value } => value
    Result<ResponseHead, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  if Status.code(&ResponseHead.status(&head)) != 200 || ResponseHead.fieldCount(&head) != 1 {
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

Import as `RequestParser` with `import silk.http_head { RequestParser }`.

Public declarations: 22.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The maximum sizes for a parser. The `values` limits also apply to each part of the head.

::Anchor{id="Limits.maxHeadBytes"}

### Field `maxHeadBytes`

```silk
pub maxHeadBytes: usize
```

The maximum size of the head, including every CRLF and the empty line at the end.

::Anchor{id="Limits.maxStartLineBytes"}

### Field `maxStartLineBytes`

```silk
pub maxStartLineBytes: usize
```

The maximum size of the request line or status line, including its CRLF.

::Anchor{id="Limits.maxFieldLineBytes"}

### Field `maxFieldLineBytes`

```silk
pub maxFieldLineBytes: usize
```

The maximum size of one field line, including its CRLF.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

The maximum memory of the parser: `maxHeadBytes` plus 32 bytes for each field in
`values.maxFields`.

::Anchor{id="Limits.values"}

### Field `values`

```silk
pub values: ValueLimits
```

The limits for the method, target, names, values, and field count.

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

Whether a head is complete after a `feed`.

::Anchor{id="ProgressState.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

The head is not complete. Feed more bytes.

::Anchor{id="ProgressState.Complete"}

### `Complete`

```silk
Complete
```

The empty line at the end was read. Get the head with `head`.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

The result of a successful `feed`.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of bytes from the start of this input that the parser used. Give the rest again in
the next call, or keep it if the head is complete.

::Anchor{id="Progress.state"}

### Field `state`

```silk
pub state: ProgressState
```

Whether the head is complete.

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

The state of a parser.

::Anchor{id="ParserState.Active"}

### `Active`

```silk
Active
```

The parser takes more input.

::Anchor{id="ParserState.Complete"}

### `Complete`

```silk
Complete
```

A head is complete. Call `reset` before you parse the next head.

::Anchor{id="ParserState.Failed"}

### `Failed`

```silk
Failed
```

A parse failed. Get the error with `failure`, and call `reset` to use the parser again.

::Anchor{id="ParseComponent"}

## `ParseComponent`

```silk
pub enum ParseComponent
```

The part of a head where a parse failed.

::Anchor{id="ParseComponent.Parser"}

### `Parser`

```silk
Parser
```

The parser itself, for example its limits or its state.

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

A field value, without the spaces around it.

::Anchor{id="ParseComponent.Host"}

### `Host`

```silk
Host
```

The `Host` field.

::Anchor{id="ParseComponent.LineEnding"}

### `LineEnding`

```silk
LineEnding
```

A line ending.

::Anchor{id="ParseLimitKind"}

## `ParseLimitKind`

```silk
pub enum ParseLimitKind
```

The limit that a head exceeded. See [`ParseReason.LimitExceeded`](#ParseReason.LimitExceeded).

::Anchor{id="ParseLimitKind.HeadBytes"}

### `HeadBytes`

```silk
HeadBytes
```

`maxHeadBytes`.

::Anchor{id="ParseLimitKind.StartLineBytes"}

### `StartLineBytes`

```silk
StartLineBytes
```

`maxStartLineBytes`.

::Anchor{id="ParseLimitKind.FieldLineBytes"}

### `FieldLineBytes`

```silk
FieldLineBytes
```

`maxFieldLineBytes`.

::Anchor{id="ParseLimitKind.Fields"}

### `Fields`

```silk
Fields
```

`maxFields`: the number of fields, including repeated fields.

::Anchor{id="ParseLimitKind.MethodBytes"}

### `MethodBytes`

```silk
MethodBytes
```

`maxMethodBytes`.

::Anchor{id="ParseLimitKind.TargetBytes"}

### `TargetBytes`

```silk
TargetBytes
```

`maxTargetBytes`.

::Anchor{id="ParseLimitKind.NameBytes"}

### `NameBytes`

```silk
NameBytes
```

`maxNameBytes`.

::Anchor{id="ParseLimitKind.ValueBytes"}

### `ValueBytes`

```silk
ValueBytes
```

`maxValueBytes`, for a field value or the reason phrase.

::Anchor{id="ParseLimitKind.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

`maxFieldBytes`: the total length of all names and values.

::Anchor{id="ParseLimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

`maxOwnedBytes`: the memory of the parser.

::Anchor{id="ParseReason"}

## `ParseReason`

```silk
pub union ParseReason
```

The rule that a parse or a write failed.

::Anchor{id="ParseReason.InvalidStartLine"}

### `InvalidStartLine`

```silk
InvalidStartLine
```

The start line does not have the form `METHOD SP target SP version` or `version SP status SP
reason`.

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

The request target is not valid, or its form does not fit the method.

::Anchor{id="ParseReason.InvalidStatus"}

### `InvalidStatus`

```silk
InvalidStatus
```

The status is not three digits from 100 to 599.

::Anchor{id="ParseReason.InvalidReasonPhrase"}

### `InvalidReasonPhrase`

```silk
InvalidReasonPhrase
```

The reason phrase has a control byte or DEL.

::Anchor{id="ParseReason.InvalidFieldName"}

### `InvalidFieldName`

```silk
InvalidFieldName
```

A field name is empty, or has a byte that is not allowed in a token.

::Anchor{id="ParseReason.InvalidFieldValue"}

### `InvalidFieldValue`

```silk
InvalidFieldValue
```

A field value has a byte that is not allowed.

::Anchor{id="ParseReason.BareLf"}

### `BareLf`

```silk
BareLf
```

A line ends with LF without CR.

::Anchor{id="ParseReason.InvalidLineEnding"}

### `InvalidLineEnding`

```silk
InvalidLineEnding
```

A CR is not followed by LF.

::Anchor{id="ParseReason.WhitespaceBeforeColon"}

### `WhitespaceBeforeColon`

```silk
WhitespaceBeforeColon
```

A field has a space or a tab between its name and the `:`.

::Anchor{id="ParseReason.ObsFold"}

### `ObsFold`

```silk
ObsFold
```

A field line starts with a space or a tab. Folded lines are not accepted.

::Anchor{id="ParseReason.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

An HTTP/1.1 request has no `Host` field.

::Anchor{id="ParseReason.DuplicateHost"}

### `DuplicateHost`

```silk
DuplicateHost
```

A request has more than one `Host` field.

::Anchor{id="ParseReason.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

The `Host` field is not a valid authority.

::Anchor{id="ParseReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The head exceeded a limit.

::Anchor{id="ParseReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: ParseLimitKind
```

The limit that was exceeded.

::Anchor{id="ParseReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of the limit.

::Anchor{id="ParseReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The size that was found.

::Anchor{id="ParseReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size calculation overflowed `usize`.

::Anchor{id="ParseReason.Truncated"}

### `Truncated`

```silk
Truncated
```

The input ended, with `final` set to `true`, before the head was complete.

::Anchor{id="ParseReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The call is not valid in the current [`ParserState`](#ParserState), for example `feed` after a complete
head.

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

The error from a parse. It tells which rule failed, and where.

::Anchor{id="ParseError.reason"}

### Field `reason`

```silk
pub reason: ParseReason
```

The rule that failed.

::Anchor{id="ParseError.component"}

### Field `component`

```silk
pub component: ParseComponent
```

The part of the head that failed.

::Anchor{id="ParseError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of bytes of this call that were valid before the error.

::Anchor{id="ParseError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset in the head where the error is, from the start of the head.

::Anchor{id="ParseError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

The position of the field, from 0, when the error is in a field.

::Anchor{id="validateLimits"}

## `validateLimits`

```silk
pub fn validateLimits(limits: &Limits) -> Result<(), ParseError>
```

Checks that `limits` are consistent, without allocation.

### Errors
- `LimitExceeded` with `OwnedBytes` if `maxOwnedBytes` is less than `maxHeadBytes` plus 32 bytes
  for each field.
- `SizeOverflow` if that sum does not fit in `usize`.

::Anchor{id="RequestParser"}

## `RequestParser`

```silk
pub struct RequestParser
```

A parser for request heads that you feed in parts. Make it with [`RequestParser.make`](#RequestParser.impl.make).

::Anchor{id="ResponseParser"}

## `ResponseParser`

```silk
pub struct ResponseParser
```

A parser for response heads that you feed in parts. Make it with [`ResponseParser.make`](#ResponseParser.impl.make).

::Anchor{id="RequestHead"}

## `RequestHead`

```silk
pub struct RequestHead<'owner>
```

A parsed request head. It borrows its parser.

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

A parsed response head. It borrows its parser.

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

An iterator over the fields of a parsed head, in order.

::Anchor{id="ParsedRequest"}

## `ParsedRequest`

```silk
pub struct ParsedRequest
```

The result of [`parseRequest`](#parseRequest).

::Anchor{id="ParsedRequest.parser"}

### Field `parser`

```silk
pub parser: RequestParser
```

The parser that holds the head. Get the head with [`RequestParser.head`](#RequestParser.impl.head).

::Anchor{id="ParsedRequest.progress"}

### Field `progress`

```silk
pub progress: Progress
```

How many bytes the head used. The bytes after it, such as the body, start at
`progress.consumed`.

::Anchor{id="ParsedResponse"}

## `ParsedResponse`

```silk
pub struct ParsedResponse
```

The result of [`parseResponse`](#parseResponse).

::Anchor{id="ParsedResponse.parser"}

### Field `parser`

```silk
pub parser: ResponseParser
```

The parser that holds the head. Get the head with [`ResponseParser.head`](#ResponseParser.impl.head).

::Anchor{id="ParsedResponse.progress"}

### Field `progress`

```silk
pub progress: Progress
```

How many bytes the head used. The bytes after it, such as the body, start at
`progress.consumed`.

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

Returns a parser, and allocates all its memory.

#### Errors
- `ParseError` if [`validateLimits`](#validateLimits) fails.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="RequestParser.impl.feed"}

### Method `feed`

```silk
pub fn feed(self: &mut Self, input: &[u8], final: bool) -> Result<Progress, ParseError>
```

Parses the start of `input`, and returns how many bytes it used.

#### Details
The parser keeps the bytes that it used. It stops after the empty line that ends the head. Set
`final` to `true` when no more input comes, so that an incomplete head fails with `Truncated`.

::Anchor{id="RequestParser.impl.state"}

### Method `state`

```silk
pub fn state(self: &Self) -> ParserState
```

Returns the state of the parser.

::Anchor{id="RequestParser.impl.failure"}

### Method `failure`

```silk
pub fn failure(self: &Self) -> Option<ParseError>
```

Returns the error that made the parser fail, or `None`.

::Anchor{id="RequestParser.impl.head"}

### Method `head`

```silk
pub fn head<'owner>(self: &'owner Self) -> Result<RequestHead<'owner>, ParseError>
```

Returns the parsed head. Returns `InvalidState` if the head is not complete.

::Anchor{id="RequestParser.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> Result<(), ParseError>
```

Makes the parser ready for a new head, and keeps its memory. You cannot call it while you
borrow a head from the parser.

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

Returns a parser, and allocates all its memory.

#### Errors
- `ParseError` if [`validateLimits`](#validateLimits) fails.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="ResponseParser.impl.feed"}

### Method `feed`

```silk
pub fn feed(self: &mut Self, input: &[u8], final: bool) -> Result<Progress, ParseError>
```

Parses the start of `input`, and returns how many bytes it used.

#### Details
The parser keeps the bytes that it used. It stops after the empty line that ends the head. Set
`final` to `true` when no more input comes, so that an incomplete head fails with `Truncated`.

::Anchor{id="ResponseParser.impl.state"}

### Method `state`

```silk
pub fn state(self: &Self) -> ParserState
```

Returns the state of the parser.

::Anchor{id="ResponseParser.impl.failure"}

### Method `failure`

```silk
pub fn failure(self: &Self) -> Option<ParseError>
```

Returns the error that made the parser fail, or `None`.

::Anchor{id="ResponseParser.impl.head"}

### Method `head`

```silk
pub fn head<'owner>(self: &'owner Self) -> Result<ResponseHead<'owner>, ParseError>
```

Returns the parsed head. Returns `InvalidState` if the head is not complete.

::Anchor{id="ResponseParser.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> Result<(), ParseError>
```

Makes the parser ready for a new head, and keeps its memory. You cannot call it while you
borrow a head from the parser.

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

Returns the method, spelled as received.

::Anchor{id="RequestHead.impl.target"}

### Method `target`

```silk
pub fn target(self: &Self) -> RequestTarget<'owner>
```

Returns the request target.

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

Returns an iterator over the fields, in order. Repeated fields stay separate.

::Anchor{id="RequestHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: ValueLimits,
  ) -> Result<OwnedRequestHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the head into new memory, as an owned head from `silk.http`.

#### Errors
- `ValueError` if the head exceeds `limits`.
- `OutOfMemoryError` if the `Allocator` fails.

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

Returns the status.

::Anchor{id="ResponseHead.impl.reason"}

### Method `reason`

```silk
pub fn reason(self: &Self) -> &'owner [u8]
```

Returns the reason phrase bytes. They can be empty, and are not always UTF-8.

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

Returns an iterator over the fields, in order. Repeated fields stay separate.

::Anchor{id="ResponseHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: ValueLimits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the head into new memory, as an owned head from `silk.http`.

#### Errors
- `ValueError` if the head exceeds `limits`.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="ResponseHead.impl.copyMatchingHeaders"}

### Method `copyMatchingHeaders`

```silk
pub effect fn copyMatchingHeaders<'name>(
    self: &Self,
    name: string<'name>,
    limits: ValueLimits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the status, the reason, and only the fields named `name`, into new memory.

#### Details
Names are compared without case. Repeated fields stay separate, in their order. `limits`
applies to the copied parts only.

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

Returns the position of the last field from [`HeaderIterator.next`](#HeaderIterator.impl.next), from 0.

::Anchor{id="parseRequest"}

## `parseRequest`

```silk
pub effect fn parseRequest(
  input: &[u8],
  limits: Limits,
) -> Result<ParsedRequest, ParseError> ! OutOfMemoryError ? &mut Allocator
```

Parses a request head from the start of `input`. The bytes after the head start at
`progress.consumed` in the result.

::Anchor{id="parseResponse"}

## `parseResponse`

```silk
pub effect fn parseResponse(
  input: &[u8],
  limits: Limits,
) -> Result<ParsedResponse, ParseError> ! OutOfMemoryError ? &mut Allocator
```

Parses a response head from the start of `input`. The bytes after the head start at
`progress.consumed` in the result.

::Anchor{id="requestSerializedSize"}

## `requestSerializedSize`

```silk
pub fn requestSerializedSize<'value>(
  head: &ValueRequestHead<'value>,
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Returns the number of bytes that [`writeRequestInto`](#writeRequestInto) writes for `head`.

::Anchor{id="responseSerializedSize"}

## `responseSerializedSize`

```silk
pub fn responseSerializedSize<'value>(
  head: &ValueResponseHead<'value>,
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Returns the number of bytes that [`writeResponseInto`](#writeResponseInto) writes for `head`.

::Anchor{id="writeRequestInto"}

## `writeRequestInto`

```silk
pub fn writeRequestInto<'value>(
  head: &ValueRequestHead<'value>,
  output: &mut [u8],
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Writes `head` with single spaces and CRLF line endings, and the empty line at the end, to the
start of `output`. Returns the length. If `output` is too small, it writes nothing.

::Anchor{id="writeResponseInto"}

## `writeResponseInto`

```silk
pub fn writeResponseInto<'value>(
  head: &ValueResponseHead<'value>,
  output: &mut [u8],
  limits: ValueLimits,
) -> Result<usize, ValueError>
```

Writes `head` with single spaces and CRLF line endings, and the empty line at the end, to the
start of `output`. Returns the length. If `output` is too small, it writes nothing.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
