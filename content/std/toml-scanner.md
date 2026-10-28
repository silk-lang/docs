Validate TOML source and read it as a sequence of tokens.

## When to use
Most programs use `silk.toml.value`, which calls this scanner for them. Use [`TomlScanner`](#TomlScanner)
directly to check that a document is valid TOML without allocating, or to read tokens and their
source spans, for example in an editor tool.

## Details
[`TomlScanner.validate`](#TomlScanner.impl.validate) checks the full syntax of TOML 1.1.0: UTF-8, keys, strings, numbers,
dates and times, arrays, inline tables, and headers. It does not check that each key is defined
one time, because that needs a table tree. [`TomlScanner.next`](#TomlScanner.impl.next) returns one token at a time.
Tokens hold a [`TomlSpan`](#TomlSpan) into the input, not a copy, and do not decode strings. The scanner
does not allocate.

## Errors
The functions return a `Result` with a [`TomlError`](#TomlError). `offset` is the byte position of the first
problem in the input.

## Gotchas
[`TomlScanner.next`](#TomlScanner.impl.next) does not check that the tokens make a valid document. Call
[`TomlScanner.validate`](#TomlScanner.impl.validate) first. `validate` does not move the position of the scanner.

## Examples
### Validate a document and count its keys
```silk
import silk.core.result { Result }
import silk.toml.scanner { TomlError, TomlScanner, TomlToken }

pub fn main() -> i32 {
  let mut scanner = TomlScanner.make(b"name = \"Ada\"\nyear = 1815\n")
  match TomlScanner.validate(&mut scanner) {
    Result<bool, TomlError>.Success { value: _ } => {}
    Result<bool, TomlError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut keys = 0
  let mut atLineStart = true
  while true {
    match TomlScanner.next(&mut scanner) {
      Result<TomlToken, TomlError>.Success { value } => match move value {
        TomlToken.EndOfInput => {
          break
        }
        TomlToken.Newline => {
          atLineStart = true
        }
        TomlToken.Text { span: _ } => {
          if atLineStart {
            keys = keys + 1
          }
          atLineStart = false
        }
        _ => {
          atLineStart = false
        }
      }
      Result<TomlToken, TomlError>.Failure { error: _ } => {
        return 1
      }
    }
  }
  if keys != 2 {
    return 1
  }
  return 0
}
```

### Find the position of a syntax error
```silk
import silk.core.result { Result }
import silk.toml.scanner { TomlError, TomlReason, TomlScanner }

pub fn main() -> i32 {
  let mut scanner = TomlScanner.make(b"port = 80x\n")
  return match TomlScanner.validate(&mut scanner) {
    Result<bool, TomlError>.Failure {
      error: TomlError { reason: TomlReason.InvalidNumber, offset }
    } => {
      if offset != 7 {
        return 1
      }
      return 0
    }
    _ => 1
  }
}
```

Import as `TomlScanner` with `import silk.toml.scanner { TomlScanner }`.

Public declarations: 7.

::Anchor{id="MAX_DEPTH"}

## `MAX_DEPTH`

```silk
pub const MAX_DEPTH: usize
```

The maximum number of arrays and inline tables that can be nested in one value.

::Anchor{id="TomlSpan"}

## `TomlSpan`

```silk
pub struct TomlSpan
```

A range of bytes in the input: `length` bytes from `offset`.

::Anchor{id="TomlSpan.offset"}

### Field `offset`

```silk
pub offset: usize
```

The position of the first byte, from the start of the input.

::Anchor{id="TomlSpan.length"}

### Field `length`

```silk
pub length: usize
```

The number of bytes.

::Anchor{id="TomlSpan.impl.Copy"}

## Implementation `Copy for TomlSpan`

```silk
impl Copy for TomlSpan
```

::Anchor{id="TomlError.impl.Copy"}

## Implementation `Copy for TomlError`

```silk
impl Copy for TomlError
```

::Anchor{id="TomlReason"}

## `TomlReason`

```silk
pub enum TomlReason
```

The cause of a [`TomlError`](#TomlError).

::Anchor{id="TomlReason.UnexpectedByte"}

### `UnexpectedByte`

```silk
UnexpectedByte
```

A byte that TOML does not allow at this position, such as a missing `=` or an unexpected
bracket.

::Anchor{id="TomlReason.UnexpectedEnd"}

### `UnexpectedEnd`

```silk
UnexpectedEnd
```

The input ends before a string, array, inline table, or header is closed.

::Anchor{id="TomlReason.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

The input is not valid UTF-8.

::Anchor{id="TomlReason.InvalidString"}

### `InvalidString`

```silk
InvalidString
```

A string is not closed, or holds a control character that must be escaped.

::Anchor{id="TomlReason.InvalidEscape"}

### `InvalidEscape`

```silk
InvalidEscape
```

A basic string has an escape that TOML does not define, or a `\u` or `\U` escape that is not a
Unicode scalar value.

::Anchor{id="TomlReason.InvalidNumber"}

### `InvalidNumber`

```silk
InvalidNumber
```

An unquoted value is not a valid integer, float, or boolean.

::Anchor{id="TomlReason.InvalidDateTime"}

### `InvalidDateTime`

```silk
InvalidDateTime
```

A date or time has a field out of range or the wrong form.

::Anchor{id="TomlReason.TypeMismatch"}

### `TypeMismatch`

```silk
TypeMismatch
```

A `silk.toml.codec` conversion found a value of a different kind.

::Anchor{id="TomlReason.NumberOutOfRange"}

### `NumberOutOfRange`

```silk
NumberOutOfRange
```

A `silk.toml.codec` conversion found a valid number that does not fit the target type.

::Anchor{id="TomlReason.DuplicateKey"}

### `DuplicateKey`

```silk
DuplicateKey
```

A key is defined two times in one table.

::Anchor{id="TomlReason.TableConflict"}

### `TableConflict`

```silk
TableConflict
```

A table definition conflicts with an earlier value or table, for example a second `[a]` header
or a header inside an inline table. `silk.toml.output` also uses it for a tree that it cannot
write.

::Anchor{id="TomlReason.DepthExceeded"}

### `DepthExceeded`

```silk
DepthExceeded
```

More than [`MAX_DEPTH`](#MAX_DEPTH) arrays or inline tables are nested.

::Anchor{id="TomlReason.impl.Debug"}

## Implementation `Debug for TomlReason`

```silk
impl Debug for TomlReason
```

::Anchor{id="TomlReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `UnexpectedByte`.

::Anchor{id="TomlError"}

## `TomlError`

```silk
pub struct TomlError
```

A TOML error: the cause and the byte position where it occurred.

::Anchor{id="TomlError.reason"}

### Field `reason`

```silk
pub reason: TomlReason
```

The cause of the error.

::Anchor{id="TomlError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte position of the problem in the input. Errors that are not tied to a source position,
such as codec errors, use 0.

::Anchor{id="TomlError.impl.Debug"}

## Implementation `Debug for TomlError`

```silk
impl Debug for TomlError
```

::Anchor{id="TomlError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `TomlError { reason: ..., offset: ... }`.

::Anchor{id="TomlScalarKind"}

## `TomlScalarKind`

```silk
pub enum TomlScalarKind
```

The kind of an unquoted value, from [`TomlScanner.scalarKind`](#TomlScanner.impl.scalarKind).

::Anchor{id="TomlScalarKind.Integer"}

### `Integer`

```silk
Integer
```

A decimal integer, or a hexadecimal (`0x`), octal (`0o`), or binary (`0b`) integer.

::Anchor{id="TomlScalarKind.Float"}

### `Float`

```silk
Float
```

A float with a fraction or an exponent, or `inf` or `nan` with an optional sign.

::Anchor{id="TomlScalarKind.Boolean"}

### `Boolean`

```silk
Boolean
```

`true` or `false`.

::Anchor{id="TomlScalarKind.OffsetDateTime"}

### `OffsetDateTime`

```silk
OffsetDateTime
```

A date and time with a UTC offset, such as `1979-05-27T07:32:00Z`.

::Anchor{id="TomlScalarKind.LocalDateTime"}

### `LocalDateTime`

```silk
LocalDateTime
```

A date and time without an offset.

::Anchor{id="TomlScalarKind.LocalDate"}

### `LocalDate`

```silk
LocalDate
```

A calendar date.

::Anchor{id="TomlScalarKind.LocalTime"}

### `LocalTime`

```silk
LocalTime
```

A time of day.

::Anchor{id="TomlToken"}

## `TomlToken`

```silk
pub union TomlToken
```

One token of TOML source. Use [`TomlScanner.slice`](#TomlScanner.impl.slice) to get the bytes of a span.

::Anchor{id="TomlToken.Text"}

### `Text`

```silk
Text
```

A bare key or an unquoted value, such as `name`, `42`, or `1979-05-27 07:32:00`.

Dots stay in the token, so a dotted bare key such as `a.b` and a float such as `3.14` are each
one token. In a value position, use [`TomlScanner.scalarKind`](#TomlScanner.impl.scalarKind) to find the kind of value.

::Anchor{id="TomlToken.Text.span"}

#### Field `span`

```silk
pub span: TomlSpan
```

The source bytes of the token.

::Anchor{id="TomlToken.String"}

### `String`

```silk
String
```

A quoted key or string. The span includes the quotes, and escapes are not decoded. Use
`silk.toml.text` to decode it.

::Anchor{id="TomlToken.String.span"}

#### Field `span`

```silk
pub span: TomlSpan
```

The source bytes of the token, with the quotes.

::Anchor{id="TomlToken.String.literal"}

#### Field `literal`

```silk
pub literal: bool
```

`true` for a literal string, which uses `'` quotes and has no escapes.

::Anchor{id="TomlToken.String.multiline"}

#### Field `multiline`

```silk
pub multiline: bool
```

`true` for a string with three quotes at each end.

::Anchor{id="TomlToken.Equals"}

### `Equals`

```silk
Equals
```

The `=` between a key and its value.

::Anchor{id="TomlToken.Dot"}

### `Dot`

```silk
Dot
```

A `.` at the start of a token, such as the one after the quoted part of `"a".b`. A dot inside
a bare spelling stays in [`TomlToken.Text`](#TomlToken.Text).

::Anchor{id="TomlToken.Comma"}

### `Comma`

```silk
Comma
```

The `,` between array elements or inline table members.

::Anchor{id="TomlToken.ArrayBegin"}

### `ArrayBegin`

```silk
ArrayBegin
```

A `[`. It starts an array or a header.

::Anchor{id="TomlToken.ArrayEnd"}

### `ArrayEnd`

```silk
ArrayEnd
```

A `]`. It ends an array or a header.

::Anchor{id="TomlToken.InlineBegin"}

### `InlineBegin`

```silk
InlineBegin
```

A `{`. It starts an inline table.

::Anchor{id="TomlToken.InlineEnd"}

### `InlineEnd`

```silk
InlineEnd
```

A `}`. It ends an inline table.

::Anchor{id="TomlToken.Newline"}

### `Newline`

```silk
Newline
```

The end of a line: LF or CRLF. Comments are skipped.

::Anchor{id="TomlToken.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The end of the input. Each later call returns it again.

::Anchor{id="TomlToken.impl.Copy"}

## Implementation `Copy for TomlToken`

```silk
impl Copy for TomlToken
```

::Anchor{id="TomlScanner"}

## `TomlScanner`

```silk
pub struct TomlScanner<'input>
```

A scanner that borrows the complete source of one TOML document. It does not allocate.

### When to use
Most programs use `silk.toml.value`, which calls this scanner for them. Use it directly to check
that a document is valid TOML without allocating, or to read tokens and their source spans, for
example in an editor tool.

### Details
[`TomlScanner.validate`](#TomlScanner.impl.validate) checks the full syntax of TOML 1.1.0, but not that each key is defined
one time. [`TomlScanner.next`](#TomlScanner.impl.next) returns one token at a time. Tokens hold a [`TomlSpan`](#TomlSpan) into the
input, not a copy, and do not decode strings.

### Gotchas
[`TomlScanner.next`](#TomlScanner.impl.next) does not check that the tokens make a valid document. Call
[`TomlScanner.validate`](#TomlScanner.impl.validate) first.

::Anchor{id="TomlScanner.impl"}

## Implementation `TomlScanner<'input>`

```silk
impl<'input> TomlScanner<'input>
```

::Anchor{id="TomlScanner.impl.make"}

### Associated function `make`

```silk
pub fn make(input: &'input [u8]) -> TomlScanner<'input>
```

Returns a scanner at the start of `input`.

::Anchor{id="TomlScanner.impl.validate"}

### Method `validate`

```silk
pub fn validate(self: &mut TomlScanner) -> Result<bool, TomlError>
```

Checks the syntax of the full input as a TOML 1.1.0 document. It does not move the scanner.

Returns `Success(true)` for valid syntax. It does not check that each key is defined one time.
`silk.toml.value` does that when it builds the tree.

#### Errors
- [`TomlError`](#TomlError) for the first syntax problem in the input.

::Anchor{id="TomlScanner.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut TomlScanner) -> Result<TomlToken, TomlError>
```

Returns the next token and moves past it. Spaces, tabs, and comments are skipped.

After the last token, it returns [`TomlToken.EndOfInput`](#TomlToken.EndOfInput) on each call.

#### Errors
- [`TomlError`](#TomlError) for a string that is not closed, a bad comment, or a lone carriage return.
  `next` does not check the full syntax. Call [`TomlScanner.validate`](#TomlScanner.impl.validate) first.

::Anchor{id="TomlScanner.impl.scalarKind"}

### Method `scalarKind`

```silk
pub fn scalarKind(self: &TomlScanner, span: TomlSpan) -> Option<TomlScalarKind>
```

Returns the kind of the unquoted value in `span`, or `None` if the bytes are not a valid
integer, float, boolean, date, or time.

::Anchor{id="TomlScanner.impl.slice"}

### Method `slice`

```silk
pub fn slice(self: &TomlScanner<'input>, span: TomlSpan) -> &'input [u8]
```

Returns the source bytes of `span`. They borrow from the input, not from the scanner.

::Anchor{id="TomlScanner.impl.offset"}

### Method `offset`

```silk
pub fn offset(self: &TomlScanner) -> usize
```

Returns the byte position where the next call to [`TomlScanner.next`](#TomlScanner.impl.next) starts.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
