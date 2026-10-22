TOML 1.1.0 lexical scanning and document syntax validation.

## When to use
Validate a complete UTF-8 document with [`TomlScanner.validate`](#TomlScanner.impl.validate), then use
[`TomlScanner.next`](#TomlScanner.impl.next) to inspect its source tokens and byte spans.

## Details
Tokens retain their source spelling. Validation checks keys, scalar forms, strings,
arrays, inline tables, and headers. Defining and reconciling document keys belongs
to the document reader.

Import as `TomlScanner` with `import silk.toml_scanner { TomlScanner }`.

Public declarations: 7.

::Anchor{id="MAX_DEPTH"}

## `MAX_DEPTH`

```silk
pub const MAX_DEPTH: usize
```

Maximum nested arrays and inline tables.

::Anchor{id="TomlSpan"}

## `TomlSpan`

```silk
pub struct TomlSpan
```

A half-open source byte range.

::Anchor{id="TomlSpan.offset"}

### Field `offset`

```silk
pub offset: usize
```

First byte in the complete input.

::Anchor{id="TomlSpan.length"}

### Field `length`

```silk
pub length: usize
```

Number of source bytes.

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

Stable scanner failure categories.

::Anchor{id="TomlReason.UnexpectedByte"}

### `UnexpectedByte`

```silk
UnexpectedByte
```

A byte is not permitted in the current construct.

::Anchor{id="TomlReason.UnexpectedEnd"}

### `UnexpectedEnd`

```silk
UnexpectedEnd
```

The document ended before the construct was complete.

::Anchor{id="TomlReason.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

The input is not well-formed UTF-8.

::Anchor{id="TomlReason.InvalidString"}

### `InvalidString`

```silk
InvalidString
```

A string delimiter or unescaped control character is invalid.

::Anchor{id="TomlReason.InvalidEscape"}

### `InvalidEscape`

```silk
InvalidEscape
```

A basic string escape is invalid.

::Anchor{id="TomlReason.InvalidNumber"}

### `InvalidNumber`

```silk
InvalidNumber
```

An unquoted numeric or boolean spelling is invalid.

::Anchor{id="TomlReason.InvalidDateTime"}

### `InvalidDateTime`

```silk
InvalidDateTime
```

A date or time spelling has an invalid field or structure.

::Anchor{id="TomlReason.TypeMismatch"}

### `TypeMismatch`

```silk
TypeMismatch
```

A typed conversion expected another TOML value kind.

::Anchor{id="TomlReason.NumberOutOfRange"}

### `NumberOutOfRange`

```silk
NumberOutOfRange
```

A valid TOML number does not fit the requested numeric type.

::Anchor{id="TomlReason.DuplicateKey"}

### `DuplicateKey`

```silk
DuplicateKey
```

A key is defined more than once in one table.

::Anchor{id="TomlReason.TableConflict"}

### `TableConflict`

```silk
TableConflict
```

A table definition conflicts with an earlier value or table.

::Anchor{id="TomlReason.DepthExceeded"}

### `DepthExceeded`

```silk
DepthExceeded
```

More than [`MAX_DEPTH`](#MAX_DEPTH) arrays or inline tables are nested.

::Anchor{id="TomlError"}

## `TomlError`

```silk
pub struct TomlError
```

A scanner failure at a source byte offset.

::Anchor{id="TomlError.reason"}

### Field `reason`

```silk
pub reason: TomlReason
```

Stable category of the first syntax failure.

::Anchor{id="TomlError.offset"}

### Field `offset`

```silk
pub offset: usize
```

Absolute byte position of the failure.

::Anchor{id="TomlScalarKind"}

## `TomlScalarKind`

```silk
pub enum TomlScalarKind
```

The validated type of an unquoted TOML scalar.

::Anchor{id="TomlScalarKind.Integer"}

### `Integer`

```silk
Integer
```

A decimal or base-prefixed whole number.

::Anchor{id="TomlScalarKind.Float"}

### `Float`

```silk
Float
```

A decimal, exponent, infinity, or NaN spelling.

::Anchor{id="TomlScalarKind.Boolean"}

### `Boolean`

```silk
Boolean
```

The literal `true` or `false`.

::Anchor{id="TomlScalarKind.OffsetDateTime"}

### `OffsetDateTime`

```silk
OffsetDateTime
```

A date and time with an explicit UTC offset.

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

A calendar date without a time.

::Anchor{id="TomlScalarKind.LocalTime"}

### `LocalTime`

```silk
LocalTime
```

A clock time without a date.

::Anchor{id="TomlToken"}

## `TomlToken`

```silk
pub union TomlToken
```

Source-level token. `Text` is classified by [`TomlScanner.scalarKind`](#TomlScanner.impl.scalarKind) in value position.

::Anchor{id="TomlToken.Text"}

### `Text`

```silk
Text
```

A bare key or unquoted value spelling, including any interior decimal points.

::Anchor{id="TomlToken.Text.span"}

#### Field `span`

```silk
pub span: TomlSpan
```

The raw source range.

::Anchor{id="TomlToken.String"}

### `String`

```silk
String
```

A quoted string or key, including its source delimiters.

::Anchor{id="TomlToken.String.span"}

#### Field `span`

```silk
pub span: TomlSpan
```

The raw quoted source range.

::Anchor{id="TomlToken.String.literal"}

#### Field `literal`

```silk
pub literal: bool
```

Whether the quote character is an apostrophe.

::Anchor{id="TomlToken.String.multiline"}

#### Field `multiline`

```silk
pub multiline: bool
```

Whether the source uses triple quotes.

::Anchor{id="TomlToken.Equals"}

### `Equals`

```silk
Equals
```

A key/value separator.

::Anchor{id="TomlToken.Dot"}

### `Dot`

```silk
Dot
```

A dot between quoted or bare key parts.

::Anchor{id="TomlToken.Comma"}

### `Comma`

```silk
Comma
```

A separator between array elements or inline table entries.

::Anchor{id="TomlToken.ArrayBegin"}

### `ArrayBegin`

```silk
ArrayBegin
```

An opening square bracket.

::Anchor{id="TomlToken.ArrayEnd"}

### `ArrayEnd`

```silk
ArrayEnd
```

A closing square bracket.

::Anchor{id="TomlToken.InlineBegin"}

### `InlineBegin`

```silk
InlineBegin
```

An opening inline table brace.

::Anchor{id="TomlToken.InlineEnd"}

### `InlineEnd`

```silk
InlineEnd
```

A closing inline table brace.

::Anchor{id="TomlToken.Newline"}

### `Newline`

```silk
Newline
```

An LF or CRLF source newline.

::Anchor{id="TomlToken.EndOfInput"}

### `EndOfInput`

```silk
EndOfInput
```

The end of the complete input.

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

A complete-input scanner. `validate` starts from the beginning and does not consume tokens.

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

Creates a scanner borrowing a complete TOML source.

::Anchor{id="TomlScanner.impl.validate"}

### Method `validate`

```silk
pub fn validate(self: &mut TomlScanner) -> Result<bool, TomlError>
```

Validates the complete document; key equality is handled by the document reader.

::Anchor{id="TomlScanner.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut TomlScanner) -> Result<TomlToken, TomlError>
```

Returns the next lexical source token.

::Anchor{id="TomlScanner.impl.scalarKind"}

### Method `scalarKind`

```silk
pub fn scalarKind(self: &TomlScanner, span: TomlSpan) -> Option<TomlScalarKind>
```

Classifies an unquoted scalar spelling.

::Anchor{id="TomlScanner.impl.slice"}

### Method `slice`

```silk
pub fn slice(self: &TomlScanner<'input>, span: TomlSpan) -> &'input [u8]
```

Borrows the raw source bytes of a token span.

::Anchor{id="TomlScanner.impl.offset"}

### Method `offset`

```silk
pub fn offset(self: &TomlScanner) -> usize
```

Returns the byte offset of the next lexical token.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
