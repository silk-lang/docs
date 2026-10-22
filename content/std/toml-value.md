Parse a TOML document into an owned tree of values, and read fields from it.

## When to use
Use [`Toml.parse`](#Toml.impl.parse) to read a configuration file or any other complete TOML document. Read
members with [`Toml.field`](#Toml.impl.field) and [`Toml.fieldAt`](#Toml.impl.fieldAt), array elements with [`Toml.item`](#Toml.impl.item), and text
with [`Toml.asString`](#Toml.impl.asString). Use `silk.toml_codec` to convert a value to a number, a boolean, or an
owned string, and `silk.toml_output` to write a tree back as TOML.

## Details
The parser follows TOML 1.1.0. Tables keep the order of the source. Integers, floats, dates, and
times keep their validated source text, so no precision is lost. Strings are decoded to UTF-8
text when the document is parsed. The root of a parsed document is always a [`Value.Table`](#Value.Table). If
parsing fails, everything that was built is released.

## Errors
- `TomlError` if the input is not valid TOML, defines a key two times, defines a table that
  conflicts with an earlier value, or nests more than `MAX_DEPTH` (64) arrays or inline tables.
  `offset` gives the byte position of the problem.
- `OutOfMemoryError` if the `Allocator` cannot supply the tree.

## Gotchas
A borrowed field or string cannot live longer than the [`Value`](#Value) that owns it. The read
functions return `None` for a missing key and for a value of a different kind. They do not tell
you which case occurred.

## Examples
### Read a nested string and an array element
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.option { Option }
import silk.toml_scanner { TomlError }
import silk.toml_value { Toml, Value }

pub effect fn main() -> i32
  ! TomlError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let source = b"tags = [\"fast\", \"small\"]\n\n[owner]\nname = \"Ada\"\n"
  let document = run Toml.parse(source) |> Effect.provideMut<Allocator>(&mut allocator)
  let name = Toml.field(&document, "owner") |> Toml.fieldAt("name") |> Toml.asString
    |> Option<string>.unwrapOr("")
  let tags = Toml.field(&document, "tags")
  let second = match move tags {
    Option<&Value>.Some { value } => Toml.item(value, 1) |> Toml.asString
      |> Option<string>.unwrapOr("")
    Option<&Value>.None => ""
  }
  if name != "Ada" || second != "small" {
    return 1
  }
  return 0
}
```

### Report the position of a syntax error
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.toml_scanner { TomlError, TomlReason }
import silk.toml_value { Toml }

effect fn load() -> usize
  ! TomlError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let document = run Toml.parse(b"name = \"Ada\"\nname = \"Grace\"\n")
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}

effect fn offsetOf(error: TomlError | OutOfMemoryError) -> usize {
  return match move error {
    TomlError { reason: TomlReason.DuplicateKey, offset } => offset
    _ => 0
  }
}

pub fn main() -> i32 {
  // The second `name` starts at byte 13.
  let offset = run Effect.catchAll(load(), offsetOf)
  if offset != 13 {
    return 1
  }
  return 0
}
```

Import as `Toml` with `import silk.toml_value { Toml }`.

Public declarations: 5.

::Anchor{id="TableKind"}

## `TableKind`

```silk
pub enum TableKind
```

How a table got its first definition. The parser uses it to reject a later definition that TOML
does not allow.

::Anchor{id="TableKind.Implicit"}

### `Implicit`

```silk
Implicit
```

A table that exists only because a header named a table inside it, such as `a` for `[a.b]`. A
later `[a]` header can still define it.

::Anchor{id="TableKind.Dotted"}

### `Dotted`

```silk
Dotted
```

A table that a dotted key made, such as `a` for `a.b = 1`.

::Anchor{id="TableKind.Explicit"}

### `Explicit`

```silk
Explicit
```

A table that a `[header]` defined. The root table also has this kind.

::Anchor{id="TableKind.Inline"}

### `Inline`

```silk
Inline
```

A table written inside braces, such as `{ x = 1 }`. It is closed: no later line can add
members to it.

::Anchor{id="TomlEntry"}

## `TomlEntry`

```silk
pub struct TomlEntry
```

One member of a table: a key and its value.

::Anchor{id="TomlEntry.key"}

### Field `key`

```silk
pub key: String
```

The decoded key. Quotes and escapes are removed.

::Anchor{id="TomlEntry.value"}

### Field `value`

```silk
pub value: Value
```

The value of the member.

::Anchor{id="TomlChild"}

## `TomlChild`

```silk
pub union TomlChild
```

One element of the child list of an array or a table. Arrays hold [`TomlChild.Item`](#TomlChild.Item) and tables
hold [`TomlChild.Member`](#TomlChild.Member).

::Anchor{id="TomlChild.Item"}

### `Item`

```silk
Item
```

An array element. It has no key.

::Anchor{id="TomlChild.Item.value"}

#### Field `value`

```silk
pub value: Value
```

The element.

::Anchor{id="TomlChild.Member"}

### `Member`

```silk
Member
```

A table member.

::Anchor{id="TomlChild.Member.entry"}

#### Field `entry`

```silk
pub entry: TomlEntry
```

The key and value of the member.

::Anchor{id="Value"}

## `Value`

```silk
pub union Value
```

An owned TOML value.

Integers, floats, dates, and times hold their source text, which the parser validated. Convert
them with `silk.toml_codec`, or copy the text to keep the full precision.

::Anchor{id="Value.Integer"}

### `Integer`

```silk
Integer
```

An integer, such as `42`, `-17`, `1_000`, or `0xff`.

::Anchor{id="Value.Integer.text"}

#### Field `text`

```silk
pub text: String
```

The source text of the integer, with signs, prefixes, and underscores.

::Anchor{id="Value.Float"}

### `Float`

```silk
Float
```

A float, such as `3.14`, `6e-3`, `inf`, or `nan`.

::Anchor{id="Value.Float.text"}

#### Field `text`

```silk
pub text: String
```

The source text of the float.

::Anchor{id="Value.Boolean"}

### `Boolean`

```silk
Boolean
```

`true` or `false`.

::Anchor{id="Value.Boolean.value"}

#### Field `value`

```silk
pub value: bool
```

The boolean.

::Anchor{id="Value.OffsetDateTime"}

### `OffsetDateTime`

```silk
OffsetDateTime
```

A date and time with a UTC offset, such as `1979-05-27T07:32:00Z`.

::Anchor{id="Value.OffsetDateTime.text"}

#### Field `text`

```silk
pub text: String
```

The source text, with all fractional seconds.

::Anchor{id="Value.LocalDateTime"}

### `LocalDateTime`

```silk
LocalDateTime
```

A date and time without an offset, such as `1979-05-27T07:32:00`.

::Anchor{id="Value.LocalDateTime.text"}

#### Field `text`

```silk
pub text: String
```

The source text, with all fractional seconds.

::Anchor{id="Value.LocalDate"}

### `LocalDate`

```silk
LocalDate
```

A calendar date, such as `1979-05-27`.

::Anchor{id="Value.LocalDate.text"}

#### Field `text`

```silk
pub text: String
```

The source text.

::Anchor{id="Value.LocalTime"}

### `LocalTime`

```silk
LocalTime
```

A time of day without a date, such as `07:32:00`.

::Anchor{id="Value.LocalTime.text"}

#### Field `text`

```silk
pub text: String
```

The source text, with all fractional seconds.

::Anchor{id="Value.String"}

### `String`

```silk
String
```

A string. Escapes are decoded and the delimiters are removed.

::Anchor{id="Value.String.text"}

#### Field `text`

```silk
pub text: String
```

The decoded UTF-8 text.

::Anchor{id="Value.Array"}

### `Array`

```silk
Array
```

An array of values, or an array of tables that `[[header]]` lines made.

::Anchor{id="Value.Array.values"}

#### Field `values`

```silk
pub values: Box<List<TomlChild>>
```

The elements in source order. Each one is a [`TomlChild.Item`](#TomlChild.Item).

::Anchor{id="Value.Array.tables"}

#### Field `tables`

```silk
pub tables: bool
```

`true` if `[[header]]` lines made the array. Such an array holds only tables, and a later
`key = [...]` cannot replace it.

::Anchor{id="Value.Table"}

### `Table`

```silk
Table
```

A table of key and value members.

::Anchor{id="Value.Table.entries"}

#### Field `entries`

```silk
pub entries: Box<List<TomlChild>>
```

The members in source order. Each one is a [`TomlChild.Member`](#TomlChild.Member).

::Anchor{id="Value.Table.kind"}

#### Field `kind`

```silk
pub kind: TableKind
```

How the table got its first definition.

::Anchor{id="Toml"}

## `Toml`

```silk
pub struct Toml
```

Functions that parse and read TOML documents.

::Anchor{id="Toml.impl"}

## Implementation `Toml`

```silk
impl Toml
```

::Anchor{id="Toml.impl.parse"}

### Associated function `parse`

```silk
pub effect fn parse(bytes: &[u8]) -> Value ! TomlError | OutOfMemoryError ? &mut Allocator
```

Parses a complete UTF-8 TOML document and returns its root table.

The parser first validates the full input with `TomlScanner.validate`, and then builds the
tree.

#### Errors
- `TomlError` if the input is not valid TOML 1.1.0, or if a key or table is defined in a way
  that TOML does not allow. `offset` is the byte position of the problem.
- `OutOfMemoryError` if the `Allocator` cannot supply the tree. Everything that was built is
  released.

::Anchor{id="Toml.impl.field"}

### Method `field`

```silk
pub fn field<'a>(self: &'a Value, name: string) -> Option<&'a Value>
```

Returns the member `name` of the table `self`.

Returns `None` if the table has no member with that key, or if `self` is not a table. `name`
is the decoded key, without quotes.

::Anchor{id="Toml.impl.fieldAt"}

### Method `fieldAt`

```silk
pub fn fieldAt<'a>(self: Option<&'a Value>, name: string) -> Option<&'a Value>
```

Returns the member `name` of an optional table. Use it to chain lookups with `|>`.

Returns `None` if `self` is `None`, or for the same cases as [`Toml.field`](#Toml.impl.field).

::Anchor{id="Toml.impl.item"}

### Method `item`

```silk
pub fn item<'a>(self: &'a Value, index: usize) -> Option<&'a Value>
```

Returns the element at `index` of the array `self`. The first element has index 0.

Returns `None` if `index` is out of range, or if `self` is not an array. In an array of
tables, each element is a [`Value.Table`](#Value.Table).

::Anchor{id="Toml.impl.asString"}

### Method `asString`

```silk
pub fn asString<'a>(self: Option<&'a Value>) -> Option<string<'a>>
```

Returns the decoded text of an optional string value.

Returns `None` if `self` is `None` or is not a [`Value.String`](#Value.String). The text borrows from the
value.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
