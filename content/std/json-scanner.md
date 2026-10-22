Read JSON as a sequence of tokens, without building a tree and without allocating.

## When to use
Use [`JsonScanner`](#JsonScanner) to read a complete document that is in one slice, token by token. It is the
input of `Deserialize` implementations. Use [`JsonScanState`](#JsonScanState) when the bytes arrive in pieces
and you keep the parts of each token yourself. To read from a `BufferedInput`, use
`silk.json_reader.JsonReader`. To get a tree, use `silk.json_value.Json.parse`.

## Details
The scanner checks the full JSON grammar (RFC 8259) as it reads, including UTF-8 in strings and
the nesting of arrays and objects. A string or number token gives a [`JsonSpan`](#JsonSpan) in the source.
Strings keep their source spelling. The token says if the string has escapes, so you can decode
it with `silk.json_text.JsonText.decode` only when needed. All offsets are byte offsets from the
start of the document.

## Errors
- [`JsonError`](#JsonError) with a [`JsonReason`](#JsonReason) and the offset of the problem. After an error, the state
  cannot continue. Make a new one.

## Gotchas
Nesting is limited to [`MAX_DEPTH`](#MAX_DEPTH) (64) levels. The scanner does not check for duplicate keys.
`silk.json_value.Json.parse` does.

## Examples
### Read the tokens of an array
```silk
import silk.json_scanner { JsonError, JsonScanner, JsonToken }
import silk.result { Result }

fn countNumbers(input: &[u8]) -> i32 {
  let mut scanner = JsonScanner.make(input)
  let mut count = 0
  while true {
    match move JsonScanner.next(&mut scanner) {
      Result<JsonToken, JsonError>.Failure { error } => {
        return -1
      }
      Result<JsonToken, JsonError>.Success { value } => match move value {
        JsonToken.Number { span } => {
          count = count + 1
        }
        JsonToken.EndOfInput => {
          return count
        }
        _ => {}
      }
    }
  }
  return count
}

pub fn main() -> i32 {
  if countNumbers(b"[1, 2.5, -3e2]") != 3 || countNumbers(b"[1,]") != -1 {
    return 1
  }
  return 0
}
```

Import as `JsonScanner` with `import silk.json_scanner { JsonScanner }`.

Public declarations: 9.

::Anchor{id="MAX_DEPTH"}

## `MAX_DEPTH`

```silk
pub const MAX_DEPTH: usize
```

The largest number of arrays and objects that can be open at one time: 64.

::Anchor{id="JsonSpan"}

## `JsonSpan`

```silk
pub struct JsonSpan
```

A range of bytes in the document.

::Anchor{id="JsonSpan.offset"}

### Field `offset`

```silk
pub offset: usize
```

The offset of the first byte from the start of the document.

::Anchor{id="JsonSpan.length"}

### Field `length`

```silk
pub length: usize
```

The number of bytes.

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

Why JSON reading or writing failed.

::Anchor{id="JsonReason.UnexpectedByte"}

### `UnexpectedByte`

```silk
UnexpectedByte
```

A byte that is not allowed at this position.

::Anchor{id="JsonReason.UnterminatedString"}

### `UnterminatedString`

```silk
UnterminatedString
```

A string has no closing quote.

::Anchor{id="JsonReason.InvalidEscape"}

### `InvalidEscape`

```silk
InvalidEscape
```

A backslash escape is not valid, or a `\u` surrogate pair is incomplete.

::Anchor{id="JsonReason.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

A string contains bytes that are not valid UTF-8.

::Anchor{id="JsonReason.InvalidNumber"}

### `InvalidNumber`

```silk
InvalidNumber
```

A number does not follow the JSON number grammar, such as `01` or `1.`.

::Anchor{id="JsonReason.DuplicateKey"}

### `DuplicateKey`

```silk
DuplicateKey
```

An object has the same key two times.

::Anchor{id="JsonReason.InvalidValue"}

### `InvalidValue`

```silk
InvalidValue
```

A value in a tree has a child of the wrong kind.

::Anchor{id="JsonReason.TypeMismatch"}

### `TypeMismatch`

```silk
TypeMismatch
```

The JSON is valid, but the value does not have the type that the reader asked for.

::Anchor{id="JsonReason.NumberOutOfRange"}

### `NumberOutOfRange`

```silk
NumberOutOfRange
```

A number does not fit in the requested numeric type.

::Anchor{id="JsonReason.MissingField"}

### `MissingField`

```silk
MissingField
```

An object does not have a member that the reader needs.

::Anchor{id="JsonReason.UnknownField"}

### `UnknownField`

```silk
UnknownField
```

An object has a member that the requested type does not have.

::Anchor{id="JsonReason.UnexpectedEnd"}

### `UnexpectedEnd`

```silk
UnexpectedEnd
```

The input ended before the value was complete.

::Anchor{id="JsonReason.DepthExceeded"}

### `DepthExceeded`

```silk
DepthExceeded
```

The nesting is deeper than the limit.

::Anchor{id="JsonReason.TrailingContent"}

### `TrailingContent`

```silk
TrailingContent
```

More content follows the value.

::Anchor{id="JsonReason.OffsetOverflow"}

### `OffsetOverflow`

```silk
OffsetOverflow
```

A byte offset does not fit in `usize`.

::Anchor{id="JsonReason.TokenTooLarge"}

### `TokenTooLarge`

```silk
TokenTooLarge
```

A token does not fit in the buffer that the caller gave for it.

::Anchor{id="JsonError"}

## `JsonError`

```silk
pub struct JsonError
```

The error from a JSON operation: the reason and, when known, the position and buffer sizes.

::Anchor{id="JsonError.reason"}

### Field `reason`

```silk
pub reason: JsonReason
```

Why the operation failed.

::Anchor{id="JsonError.offset"}

### Field `offset`

```silk
pub offset: Option<usize>
```

The byte offset of the problem, or of the end of the input. Absent for some output errors.

::Anchor{id="JsonError.required"}

### Field `required`

```silk
pub required: Option<usize>
```

For `TokenTooLarge`, the buffer size that the token needs, if known.

::Anchor{id="JsonError.available"}

### Field `available`

```silk
pub available: Option<usize>
```

For `TokenTooLarge`, the buffer size that was available.

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

Returns an error with `reason` at byte `offset`. `Deserialize` implementations use it.

::Anchor{id="JsonToken"}

## `JsonToken`

```silk
pub union JsonToken
```

One JSON token. String and number tokens give the range of their source text.

::Anchor{id="JsonToken.ObjectBegin"}

### `ObjectBegin`

```silk
ObjectBegin
```

`{`

::Anchor{id="JsonToken.ObjectEnd"}

### `ObjectEnd`

```silk
ObjectEnd
```

`}`

::Anchor{id="JsonToken.ArrayBegin"}

### `ArrayBegin`

```silk
ArrayBegin
```

`[`

::Anchor{id="JsonToken.ArrayEnd"}

### `ArrayEnd`

```silk
ArrayEnd
```

`]`

::Anchor{id="JsonToken.KeySeparator"}

### `KeySeparator`

```silk
KeySeparator
```

`:` between a key and its value.

::Anchor{id="JsonToken.ValueSeparator"}

### `ValueSeparator`

```silk
ValueSeparator
```

`,` between elements or members.

::Anchor{id="JsonToken.String"}

### `String`

```silk
String
```

A string. Its UTF-8 and escapes are checked.

::Anchor{id="JsonToken.String.span"}

#### Field `span`

```silk
pub span: JsonSpan
```

The source range, including the quotes.

::Anchor{id="JsonToken.String.escaped"}

#### Field `escaped`

```silk
pub escaped: bool
```

`true` if the string has at least one backslash escape.

::Anchor{id="JsonToken.Number"}

### `Number`

```silk
Number
```

A number. It is not converted. Use `silk.format.Format` to read its text.

::Anchor{id="JsonToken.Number.span"}

#### Field `span`

```silk
pub span: JsonSpan
```

The source range.

::Anchor{id="JsonToken.True"}

### `True`

```silk
True
```

`true`

::Anchor{id="JsonToken.False"}

### `False`

```silk
False
```

`false`

::Anchor{id="JsonToken.Null"}

### `Null`

```silk
Null
```

`null`

::Anchor{id="JsonToken.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The value and any whitespace after it are complete. Later reads also return it.

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

What one step of [`JsonScanState.step`](#JsonScanState.impl.step) found.

::Anchor{id="JsonScanEvent.Token"}

### `Token`

```silk
Token
```

A complete token.

::Anchor{id="JsonScanEvent.Token.token"}

#### Field `token`

```silk
pub token: JsonToken
```

The token. Its offsets are from the start of the document.

::Anchor{id="JsonScanEvent.NeedMore"}

### `NeedMore`

```silk
NeedMore
```

The step used all bytes of the piece. Give it the next piece.

::Anchor{id="JsonScanEvent.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The document is complete.

::Anchor{id="JsonScanStep"}

## `JsonScanStep`

```silk
pub struct JsonScanStep
```

The result of one step of [`JsonScanState.step`](#JsonScanState.impl.step).

::Anchor{id="JsonScanStep.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of bytes of this piece that the step used.

::Anchor{id="JsonScanStep.fragment"}

### Field `fragment`

```silk
pub fragment: JsonSpan
```

The bytes of the current token inside this piece. It can be empty. Keep them if the token
continues in the next piece.

::Anchor{id="JsonScanStep.event"}

### Field `event`

```silk
pub event: JsonScanEvent
```

A token, a request for more input, or the end of the document.

::Anchor{id="JsonScanState"}

## `JsonScanState`

```silk
pub struct JsonScanState
```

The state of a JSON scan that reads its input in pieces.

### Details

It does not keep a reference to the input. Call [`JsonScanState.step`](#JsonScanState.impl.step) with the rest of the
current piece until it returns `NeedMore` or `EndOfInput`. After `NeedMore`, give it the next
piece.

::Anchor{id="JsonScanner"}

## `JsonScanner`

```silk
pub struct JsonScanner<'input>
```

A JSON scanner over a complete document in one slice. Make one with [`JsonScanner.make`](#JsonScanner.impl.make).

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

Returns the state for the start of one JSON document. It does not allocate.

::Anchor{id="JsonScanState.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut JsonScanState, chunk: &[u8], final: bool) -> Result<JsonScanStep, JsonError>
```

Reads from `chunk` up to the end of one token, the end of the chunk, or the end of the
document.

#### Details

After a `Token` event, call `step` again with the bytes after `consumed`. Set `final` to
`true` for the last piece and for all of its rest, also when the rest is empty.

#### Errors

- [`JsonError`](#JsonError) if the input is not valid JSON. After an error, the state cannot continue.

#### Gotchas

`NeedMore` uses all of the piece. A number at the end of a piece that is not final is not
complete yet, because the next byte could be a digit. The byte after the number stays for the
next call.

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

Returns a scanner at the start of `input`. `input` must be one complete document.

::Anchor{id="JsonScanner.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut JsonScanner<'input>) -> Result<JsonToken, JsonError>
```

Returns the next token, or `EndOfInput` when the document and the whitespace after it are
complete.

#### Errors

- [`JsonError`](#JsonError) if the input is not valid JSON, or `UnexpectedEnd` if it ends early.

::Anchor{id="JsonScanner.impl.peek"}

### Method `peek`

```silk
pub fn peek(self: &mut JsonScanner<'input>) -> Result<JsonToken, JsonError>
```

Returns the next token without consuming it. The next call to `next` returns the same token.

::Anchor{id="JsonScanner.impl.offset"}

### Method `offset`

```silk
pub fn offset(self: &JsonScanner<'input>) -> usize
```

Returns the byte offset of the last token that `next` or `peek` returned. Use it for errors.

::Anchor{id="JsonScanner.impl.length"}

### Method `length`

```silk
pub fn length(self: &JsonScanner<'input>) -> usize
```

Returns the length of the input in bytes.

::Anchor{id="JsonScanner.impl.slice"}

### Method `slice`

```silk
pub fn slice(self: &JsonScanner<'input>, span: JsonSpan) -> &'input [u8]
```

Returns the source bytes of `span`, such as the text of a string or number token.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
