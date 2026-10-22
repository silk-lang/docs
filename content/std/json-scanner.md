Strict, allocation-free JSON tokens from complete slices or successive byte chunks.

## When to use
Use [`JsonScanner`](#JsonScanner) to inspect one complete JSON document without building a value tree.
Use [`JsonScanState`](#JsonScanState) when bytes arrive in chunks and retain token fragments yourself.

## Details
`JsonScanState.step` consumes at most one token per call. Spans and errors use absolute byte
offsets; a step also reports the part of the current lexeme in its supplied chunk. Strings
retain their source spelling and report whether they contain escapes. No operation allocates.

## Gotchas
A number at a nonfinal chunk boundary needs another step to establish its delimiter. The
delimiter remains unconsumed. After any error the state is terminal; create a new state.
Nesting is limited to [`MAX_DEPTH`](#MAX_DEPTH). The scanner validates syntax, not duplicate key equality.

## Examples
### Scan a complete number

```silk
import silk.json_scanner {JsonScanner, JsonToken, JsonError}
import silk.result {Result}

pub fn main() -> i32 {
  let mut scanner = JsonScanner.make(b"42")
  let token = JsonScanner.next(&mut scanner)
  return match move token {
    Result<JsonToken, JsonError>.Failure {error} => 1
    Result<JsonToken, JsonError>.Success {value} => match move value {
      JsonToken.Number {span: _} => 0
      _ => 1
    }
  }
}
```

Import as `JsonScanner` with `import silk.json_scanner { JsonScanner }`.

Public declarations: 9.

::Anchor{id="MAX_DEPTH"}

## `MAX_DEPTH`

```silk
pub const MAX_DEPTH: usize
```

The maximum number of simultaneously open JSON arrays and objects.

::Anchor{id="JsonSpan"}

## `JsonSpan`

```silk
pub struct JsonSpan
```

A half-open byte range in the complete JSON source.

::Anchor{id="JsonSpan.offset"}

### Field `offset`

```silk
pub offset: usize
```

The absolute offset of the first byte.

::Anchor{id="JsonSpan.length"}

### Field `length`

```silk
pub length: usize
```

The number of bytes in the range.

::Anchor{id="JsonSpan.impl.Copy"}

## Implementation `Copy for JsonSpan`

```silk
impl Copy for JsonSpan
```

::Anchor{id="JsonReason"}

## `JsonReason`

```silk
pub enum JsonReason
```

A stable category for a JSON scanner failure.

::Anchor{id="JsonReason.UnexpectedByte"}

### `UnexpectedByte`

```silk
UnexpectedByte
```

A byte cannot begin or continue the expected JSON construct.

::Anchor{id="JsonReason.UnterminatedString"}

### `UnterminatedString`

```silk
UnterminatedString
```

A quoted string ended without a closing quote.

::Anchor{id="JsonReason.InvalidEscape"}

### `InvalidEscape`

```silk
InvalidEscape
```

A backslash escape or surrogate pair is invalid.

::Anchor{id="JsonReason.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

A string contains malformed UTF-8.

::Anchor{id="JsonReason.InvalidNumber"}

### `InvalidNumber`

```silk
InvalidNumber
```

A number does not satisfy the JSON number grammar.

::Anchor{id="JsonReason.DuplicateKey"}

### `DuplicateKey`

```silk
DuplicateKey
```

An object repeats a decoded member name.

::Anchor{id="JsonReason.InvalidValue"}

### `InvalidValue`

```silk
InvalidValue
```

A constructed value contains a child of the wrong container kind.

::Anchor{id="JsonReason.TypeMismatch"}

### `TypeMismatch`

```silk
TypeMismatch
```

A valid JSON value does not have the requested type.

::Anchor{id="JsonReason.NumberOutOfRange"}

### `NumberOutOfRange`

```silk
NumberOutOfRange
```

A JSON number cannot fit the requested numeric type.

::Anchor{id="JsonReason.MissingField"}

### `MissingField`

```silk
MissingField
```

A required object member is absent.

::Anchor{id="JsonReason.UnknownField"}

### `UnknownField`

```silk
UnknownField
```

An object member is not part of the requested type.

::Anchor{id="JsonReason.UnexpectedEnd"}

### `UnexpectedEnd`

```silk
UnexpectedEnd
```

The final input ended before the single root value was complete.

::Anchor{id="JsonReason.DepthExceeded"}

### `DepthExceeded`

```silk
DepthExceeded
```

The fixed nesting stack is full.

::Anchor{id="JsonReason.TrailingContent"}

### `TrailingContent`

```silk
TrailingContent
```

A second root value follows the first.

::Anchor{id="JsonReason.OffsetOverflow"}

### `OffsetOverflow`

```silk
OffsetOverflow
```

An absolute byte offset cannot be represented as `usize`.

::Anchor{id="JsonReason.TokenTooLarge"}

### `TokenTooLarge`

```silk
TokenTooLarge
```

A streaming consumer's caller-owned token buffer is too small.

::Anchor{id="JsonError"}

## `JsonError`

```silk
pub struct JsonError
```

A deterministic JSON failure with absolute input position and optional capacity details.

::Anchor{id="JsonError.reason"}

### Field `reason`

```silk
pub reason: JsonReason
```

The stable failure category.

::Anchor{id="JsonError.offset"}

### Field `offset`

```silk
pub offset: Option<usize>
```

The offending byte or end position, when available.

::Anchor{id="JsonError.required"}

### Field `required`

```silk
pub required: Option<usize>
```

Capacity required by a future consumer, if applicable.

::Anchor{id="JsonError.available"}

### Field `available`

```silk
pub available: Option<usize>
```

Capacity available to a future consumer, if applicable.

::Anchor{id="JsonError.impl"}

## Implementation `JsonError`

```silk
impl JsonError
```

::Anchor{id="JsonError.impl.at"}

### Associated function `at`

```silk
pub fn at(reason: JsonReason, offset: usize) -> JsonError
```

Creates an input failure at an absolute byte offset.

::Anchor{id="JsonToken"}

## `JsonToken`

```silk
pub union JsonToken
```

One validated JSON token. String and number spans retain the raw source spelling.

::Anchor{id="JsonToken.ObjectBegin"}

### `ObjectBegin`

```silk
ObjectBegin
```

An opening object brace.

::Anchor{id="JsonToken.ObjectEnd"}

### `ObjectEnd`

```silk
ObjectEnd
```

A closing object brace.

::Anchor{id="JsonToken.ArrayBegin"}

### `ArrayBegin`

```silk
ArrayBegin
```

An opening array bracket.

::Anchor{id="JsonToken.ArrayEnd"}

### `ArrayEnd`

```silk
ArrayEnd
```

A closing array bracket.

::Anchor{id="JsonToken.KeySeparator"}

### `KeySeparator`

```silk
KeySeparator
```

A colon between an object key and value.

::Anchor{id="JsonToken.ValueSeparator"}

### `ValueSeparator`

```silk
ValueSeparator
```

A comma between array elements or object members.

::Anchor{id="JsonToken.String"}

### `String`

```silk
String
```

A quoted, UTF-8-valid string, including its source quotes in `span`.

::Anchor{id="JsonToken.String.span"}

#### Field `span`

```silk
pub span: JsonSpan
```

The raw quoted source range.

::Anchor{id="JsonToken.String.escaped"}

#### Field `escaped`

```silk
pub escaped: bool
```

Whether a backslash escape occurred.

::Anchor{id="JsonToken.Number"}

### `Number`

```silk
Number
```

A valid number lexeme, without numeric conversion.

::Anchor{id="JsonToken.Number.span"}

#### Field `span`

```silk
pub span: JsonSpan
```

The raw source range.

::Anchor{id="JsonToken.True"}

### `True`

```silk
True
```

The literal `true`.

::Anchor{id="JsonToken.False"}

### `False`

```silk
False
```

The literal `false`.

::Anchor{id="JsonToken.Null"}

### `Null`

```silk
Null
```

The literal `null`.

::Anchor{id="JsonToken.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The complete root value and trailing whitespace have ended.

::Anchor{id="JsonToken.impl.Copy"}

## Implementation `Copy for JsonToken`

```silk
impl Copy for JsonToken
```

::Anchor{id="JsonScanEvent"}

## `JsonScanEvent`

```silk
pub union JsonScanEvent
```

The outcome of one resumable scan step.

::Anchor{id="JsonScanEvent.Token"}

### `Token`

```silk
Token
```

A complete token was emitted.

::Anchor{id="JsonScanEvent.Token.token"}

#### Field `token`

```silk
pub token: JsonToken
```

The token, whose source offsets are absolute.

::Anchor{id="JsonScanEvent.NeedMore"}

### `NeedMore`

```silk
NeedMore
```

All supplied bytes were consumed; another chunk is needed.

::Anchor{id="JsonScanEvent.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The complete document has ended.

::Anchor{id="JsonScanStep"}

## `JsonScanStep`

```silk
pub struct JsonScanStep
```

One step's byte accounting and event.

::Anchor{id="JsonScanStep.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Number of bytes consumed from this call's chunk.

::Anchor{id="JsonScanStep.fragment"}

### Field `fragment`

```silk
pub fragment: JsonSpan
```

Range of this lexeme's bytes within this call's chunk, possibly empty.

::Anchor{id="JsonScanStep.event"}

### Field `event`

```silk
pub event: JsonScanEvent
```

The token, need-more request, or final end event.

::Anchor{id="JsonScanState"}

## `JsonScanState`

```silk
pub struct JsonScanState
```

Owned lexical and container state shared by slice and streaming scanners.

### Details
It retains no chunk view. Feed each unconsumed suffix back into `step` until it reports
`NeedMore` or `EndOfInput`; after `NeedMore`, supply the next chunk.

::Anchor{id="JsonScanner"}

## `JsonScanner`

```silk
pub struct JsonScanner<'input>
```

A slice-backed convenience adapter over the resumable scanner.

::Anchor{id="JsonScanState.impl"}

## Implementation `JsonScanState`

```silk
impl JsonScanState
```

::Anchor{id="JsonScanState.impl.make"}

### Associated function `make`

```silk
pub fn make() -> JsonScanState
```

Creates an empty, allocation-free state for exactly one root JSON value.

::Anchor{id="JsonScanState.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut JsonScanState, chunk: &[u8], final: bool) -> Result<JsonScanStep, JsonError>
```

Consumes a chunk up to one token, need-more boundary, or document end.

#### Details
Reuse the unconsumed suffix after `Token`. `final` remains true for every suffix of the
final chunk, including an empty one. No input slice survives this call.

#### Gotchas
`NeedMore` consumes the entire chunk. A number at a nonfinal boundary remains pending;
its lookahead delimiter is left for the following call. Errors make this state terminal.

::Anchor{id="JsonScanner.impl"}

## Implementation `JsonScanner<'input>`

```silk
impl<'input> JsonScanner<'input>
```

::Anchor{id="JsonScanner.impl.make"}

### Associated function `make`

```silk
pub fn make(input: &'input [u8]) -> JsonScanner<'input>
```

Borrows a complete input slice and starts a single-document scan.

::Anchor{id="JsonScanner.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut JsonScanner<'input>) -> Result<JsonToken, JsonError>
```

Returns the next token or sticky `EndOfInput` after trailing whitespace.

::Anchor{id="JsonScanner.impl.peek"}

### Method `peek`

```silk
pub fn peek(self: &mut JsonScanner<'input>) -> Result<JsonToken, JsonError>
```

Returns the next token without consuming it.

::Anchor{id="JsonScanner.impl.offset"}

### Method `offset`

```silk
pub fn offset(self: &JsonScanner<'input>) -> usize
```

Returns the absolute byte offset of the last token returned by `next` or `peek`.

::Anchor{id="JsonScanner.impl.length"}

### Method `length`

```silk
pub fn length(self: &JsonScanner<'input>) -> usize
```

Returns the length of the complete input slice.

::Anchor{id="JsonScanner.impl.slice"}

### Method `slice`

```silk
pub fn slice(self: &JsonScanner<'input>, span: JsonSpan) -> &'input [u8]
```

Borrows the raw bytes denoted by a token span from this scanner's complete input.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
