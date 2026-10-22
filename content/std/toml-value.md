Owned TOML documents with ordered tables and distinct scalar kinds.

## When to use
Use [`Toml.parse`](#Toml.impl.parse) to validate and own a complete TOML document, then borrow fields from
its root table. Every allocation uses the ambient Allocator and partial trees drop on failure.

## Details
Tables keep key order. Numeric and date/time values keep their validated source text.
String values contain decoded UTF-8 text.

## Gotchas
A borrowed field cannot outlive its document. Use `silk.toml_output` to write the owned tree.

## Examples
### Read a nested string
```silk
import silk.allocator as Allocators {Allocator, OutOfMemoryError}
import silk.effect as Effects {Effect}
import silk.option as Options {Option}
import silk.toml_scanner as Scanners {TomlError}
import silk.toml_value as Values {Toml}

effect fn read() -> i32 ! TomlError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let document = run Toml.parse(b"[owner]\nname = \"Ada\"\n")
    |> Effect.provideMut<Allocator>(&mut allocator)
  let owner = Toml.field(&document, "owner")
  let name = Toml.fieldAt(move owner, "name")
    |> Toml.asString
  return match move name {
    Option<string>.Some {value} => {
      if value == "Ada" {
        return 0
      }
      return 1
    }
    Option<string>.None => {
      return 2
    }
  }
}

effect fn recover(error: TomlError | OutOfMemoryError) -> i32 {
  return 3
}

pub fn main() -> i32 {
  return run Effect.catchAll(read(), recover)
}
```

Import as `Toml` with `import silk.toml_value { Toml }`.

Public declarations: 5.

::Anchor{id="TableKind"}

## `TableKind`

```silk
pub enum TableKind
```

How a table was first defined. An inline table is closed to later document definitions.

::Anchor{id="TableKind.Implicit"}

### `Implicit`

```silk
Implicit
```

A table created by a later header path.

::Anchor{id="TableKind.Dotted"}

### `Dotted`

```silk
Dotted
```

A table created by a dotted key.

::Anchor{id="TableKind.Explicit"}

### `Explicit`

```silk
Explicit
```

A table defined by a header.

::Anchor{id="TableKind.Inline"}

### `Inline`

```silk
Inline
```

A table defined inside braces and closed to later definitions.

::Anchor{id="TomlEntry"}

## `TomlEntry`

```silk
pub struct TomlEntry
```

One ordered table member.

::Anchor{id="TomlEntry.key"}

### Field `key`

```silk
pub key: String
```

The decoded member key.

::Anchor{id="TomlEntry.value"}

### Field `value`

```silk
pub value: Value
```

The owned member value.

::Anchor{id="TomlChild"}

## `TomlChild`

```silk
pub union TomlChild
```

Recursive storage shared by tables and arrays.

::Anchor{id="TomlChild.Item"}

### `Item`

```silk
Item
```

An array element without a key.

::Anchor{id="TomlChild.Item.value"}

#### Field `value`

```silk
pub value: Value
```

The owned element value.

::Anchor{id="TomlChild.Member"}

### `Member`

```silk
Member
```

A table member with its key.

::Anchor{id="TomlChild.Member.entry"}

#### Field `entry`

```silk
pub entry: TomlEntry
```

The owned key and value.

::Anchor{id="Value"}

## `Value`

```silk
pub union Value
```

An owned TOML value. Numeric and temporal spellings retain their validated source precision.

::Anchor{id="Value.Integer"}

### `Integer`

```silk
Integer
```

A validated integer in its source spelling.

::Anchor{id="Value.Integer.text"}

#### Field `text`

```silk
pub text: String
```

The validated integer text.

::Anchor{id="Value.Float"}

### `Float`

```silk
Float
```

A validated float in its source spelling.

::Anchor{id="Value.Float.text"}

#### Field `text`

```silk
pub text: String
```

The validated float text.

::Anchor{id="Value.Boolean"}

### `Boolean`

```silk
Boolean
```

A TOML boolean.

::Anchor{id="Value.Boolean.value"}

#### Field `value`

```silk
pub value: bool
```

The boolean value.

::Anchor{id="Value.OffsetDateTime"}

### `OffsetDateTime`

```silk
OffsetDateTime
```

A date and time with an explicit offset and retained precision.

::Anchor{id="Value.OffsetDateTime.text"}

#### Field `text`

```silk
pub text: String
```

The validated source text.

::Anchor{id="Value.LocalDateTime"}

### `LocalDateTime`

```silk
LocalDateTime
```

A date and time without an offset and with retained precision.

::Anchor{id="Value.LocalDateTime.text"}

#### Field `text`

```silk
pub text: String
```

The validated source text.

::Anchor{id="Value.LocalDate"}

### `LocalDate`

```silk
LocalDate
```

A calendar date without a time.

::Anchor{id="Value.LocalDate.text"}

#### Field `text`

```silk
pub text: String
```

The validated source text.

::Anchor{id="Value.LocalTime"}

### `LocalTime`

```silk
LocalTime
```

A clock time without a date and with retained precision.

::Anchor{id="Value.LocalTime.text"}

#### Field `text`

```silk
pub text: String
```

The validated source text.

::Anchor{id="Value.String"}

### `String`

```silk
String
```

Decoded UTF-8 text.

::Anchor{id="Value.String.text"}

#### Field `text`

```silk
pub text: String
```

The decoded text.

::Anchor{id="Value.Array"}

### `Array`

```silk
Array
```

Ordered values or an array of tables.

::Anchor{id="Value.Array.values"}

#### Field `values`

```silk
pub values: Box<List<TomlChild>>
```

The owned elements in source order.

::Anchor{id="Value.Array.tables"}

#### Field `tables`

```silk
pub tables: bool
```

Whether the array came from `[[table]]` headers.

::Anchor{id="Value.Table"}

### `Table`

```silk
Table
```

Ordered key/value members.

::Anchor{id="Value.Table.entries"}

#### Field `entries`

```silk
pub entries: Box<List<TomlChild>>
```

The owned members in source order.

::Anchor{id="Value.Table.kind"}

#### Field `kind`

```silk
pub kind: TableKind
```

How the table was defined.

::Anchor{id="Toml"}

## `Toml`

```silk
pub struct Toml
```

Operations on complete owned TOML documents.

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

Parses one complete UTF-8 document into an owned root table.

#### Details
All allocations use the ambient allocator. Syntax errors include a reason and byte offset.
If parsing fails, the partial tree is released.

::Anchor{id="Toml.impl.field"}

### Method `field`

```silk
pub fn field<'a>(self: &'a Value, name: string) -> Option<&'a Value>
```

Borrows a table member by decoded key, or returns `None` for absence or another value kind.

::Anchor{id="Toml.impl.fieldAt"}

### Method `fieldAt`

```silk
pub fn fieldAt<'a>(self: Option<&'a Value>, name: string) -> Option<&'a Value>
```

Borrows a nested table member through an optional value, or returns `None`.

::Anchor{id="Toml.impl.item"}

### Method `item`

```silk
pub fn item<'a>(self: &'a Value, index: usize) -> Option<&'a Value>
```

Borrows an array element, or returns None for an absent index or another value kind.

::Anchor{id="Toml.impl.asString"}

### Method `asString`

```silk
pub fn asString<'a>(self: Option<&'a Value>) -> Option<string<'a>>
```

Borrows decoded UTF-8 string text, or returns `None` for another value kind.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
