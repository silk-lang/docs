Convert TOML values to Silk values, and write Silk values as TOML.

## When to use
After `silk.toml_value` parses a document, use [`TomlCodec.decodeOne`](#TomlCodec.impl.decodeOne) to read a `bool`, `i32`,
or `i64`, and [`TomlCodec.deserializeOne`](#TomlCodec.impl.deserializeOne) to read an `f64` or an owned `String`. Use
[`TomlCodec.writeOne`](#TomlCodec.impl.writeOne) to write a value after a key when you write TOML by hand.

## Details
| Type | Write | Read |
|------|-------|------|
| `bool` | [`Serialize`](#Serialize) | [`Decode`](#Decode) from `Boolean` |
| `i32`, `i64` | [`Serialize`](#Serialize) | [`Decode`](#Decode) from `Integer`, with `0x`, `0o`, `0b` and `_` |
| `f64` | [`Serialize`](#Serialize) | [`Deserialize`](#Deserialize) from `Float`, with `inf` and `nan` |
| `string`, `String` | [`Serialize`](#Serialize) | [`Deserialize`](#Deserialize) from `String` (only `String`) |

To support your own type, implement the interfaces for it.

## Errors
- `TomlError` with `TypeMismatch` if the value has a different kind, or with `NumberOutOfRange`
  if the number does not fit the type. An `Integer` is not converted to `f64`. All codec errors
  have `offset` 0, because the value is not tied to a position in the source.
- `WriterError` if the `Writer` fails.
- `OutOfMemoryError` if the `Allocator` cannot supply the output of `deserializeOne`.

## Examples
### Read typed settings
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.option { Option }
import silk.result { Result }
import silk.toml_codec { TomlCodec }
import silk.toml_scanner { TomlError }
import silk.toml_value { Toml, Value }

fn port(document: &Value) -> i32 {
  return match Toml.field(document, "port") {
    Option<&Value>.Some { value } => match TomlCodec.decodeOne<i32>(value) {
      Result<i32, TomlError>.Success { value: number } => number
      Result<i32, TomlError>.Failure { error: _ } => 0
    }
    Option<&Value>.None => 0
  }
}

pub effect fn main() -> i32
  ! TomlError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let document = run Toml.parse(b"port = 8_080\nratio = 0.5\n")
    |> Effect.provideMut<Allocator>(&mut allocator)
  let ratio = match Toml.field(&document, "ratio") {
    Option<&Value>.Some { value } => run TomlCodec.deserializeOne<f64>(value)
      |> Effect.provideMut<Allocator>(&mut allocator)
    Option<&Value>.None => 0.0
  }
  if port(&document) != 8080 || ratio != 0.5 {
    return 1
  }
  return 0
}
```

Import as `TomlCodec` with `import silk.toml_codec { TomlCodec }`.

Public declarations: 4.

::Anchor{id="Serialize"}

## `Serialize`

```silk
pub interface Serialize
```

A type that can write itself as one TOML value.

The standard library implements it for `bool`, `i32`, `i64`, `f64`, `string`, and `String`.
Implement it for your own type to write the type with [`TomlCodec.writeOne`](#TomlCodec.impl.writeOne).

::Anchor{id="Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

Writes `self` as a TOML value through the ambient `Writer`. It does not write a key or a
newline.

#### Errors
- `WriterError` if the `Writer` fails.
- `TomlError` if the value has no TOML form.

::Anchor{id="Decode"}

## `Decode`

```silk
pub interface Decode
```

A type that can read itself from a TOML value without allocation.

The standard library implements it for `bool` (from `Boolean`), and `i32` and `i64` (from
`Integer`, with `0x`, `0o`, `0b` and `_`). Read it with [`TomlCodec.decodeOne`](#TomlCodec.impl.decodeOne).

::Anchor{id="Decode.decode"}

### Operation `decode`

```silk
fn decode(value: &Value) -> Result<Self, TomlError>
```

Returns the value that `value` holds, or a `TomlError` if it is of a different kind or out of
range.

::Anchor{id="Deserialize"}

## `Deserialize`

```silk
pub interface Deserialize
```

A type that can read itself from a TOML value and allocate.

The standard library implements it for `f64` (from `Float`, with `inf` and `nan`; an `Integer`
is not converted) and `String` (from `String`). Read it with [`TomlCodec.deserializeOne`](#TomlCodec.impl.deserializeOne).

::Anchor{id="Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(value: &Value) -> Self ! TomlError | OutOfMemoryError ? &mut Allocator
```

Returns the value that `value` holds.

#### Errors
- `TomlError` if `value` is of a different kind or out of range.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="TomlCodec"}

## `TomlCodec`

```silk
pub struct TomlCodec
```

Functions that select the conversion for a type.

::Anchor{id="TomlCodec.impl"}

## Implementation `TomlCodec`

```silk
impl TomlCodec
```

::Anchor{id="TomlCodec.impl.writeOne"}

### Associated function `writeOne`

```silk
pub effect fn writeOne<T: Serialize>(value: &T) -> () ! TomlError | WriterError ? &mut Writer
```

Writes `value` as a TOML value through the ambient `Writer`.

An `f64` without a fraction gets `.0`, so it reads back as a float. NaN is written as `nan`
and infinity as `inf` or `-inf`. Strings are written as basic strings with escapes.

#### Errors
- `WriterError` if the `Writer` fails.
- `TomlError` if the type rejects the value.

#### Gotchas
It writes only the value. Write the key and ` = ` before it, and a newline after it.

::Anchor{id="TomlCodec.impl.decodeOne"}

### Associated function `decodeOne`

```silk
pub fn decodeOne<T: Decode>(value: &Value) -> Result<T, TomlError>
```

Returns `value` converted to `T` without allocation.

Returns a `Failure` with `TypeMismatch` if `value` has a different kind, or with
`NumberOutOfRange` if the number does not fit `T`.

::Anchor{id="TomlCodec.impl.deserializeOne"}

### Associated function `deserializeOne`

```silk
pub effect fn deserializeOne<T: Deserialize>(value: &Value)
    -> T ! TomlError | OutOfMemoryError ? &mut Allocator
```

Returns `value` converted to `T`, with memory from the ambient `Allocator`.

#### Errors
- `TomlError` with `TypeMismatch` if `value` has a different kind, or with `NumberOutOfRange`
  if the number does not fit `T`.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="bool.impl.Serialize"}

## Implementation `Serialize for bool`

```silk
impl Serialize for bool
```

::Anchor{id="bool.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="bool.impl.Decode"}

## Implementation `Decode for bool`

```silk
impl Decode for bool
```

::Anchor{id="bool.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(value: &Value) -> Result<Self, TomlError>
```

::Anchor{id="i64.impl.Serialize"}

## Implementation `Serialize for i64`

```silk
impl Serialize for i64
```

::Anchor{id="i64.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="i64.impl.Decode"}

## Implementation `Decode for i64`

```silk
impl Decode for i64
```

::Anchor{id="i64.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(value: &Value) -> Result<Self, TomlError>
```

::Anchor{id="i32.impl.Serialize"}

## Implementation `Serialize for i32`

```silk
impl Serialize for i32
```

::Anchor{id="i32.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="i32.impl.Decode"}

## Implementation `Decode for i32`

```silk
impl Decode for i32
```

::Anchor{id="i32.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(value: &Value) -> Result<Self, TomlError>
```

::Anchor{id="f64.impl.Serialize"}

## Implementation `Serialize for f64`

```silk
impl Serialize for f64
```

::Anchor{id="f64.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="f64.impl.Deserialize"}

## Implementation `Deserialize for f64`

```silk
impl Deserialize for f64
```

::Anchor{id="f64.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(value: &Value) -> Self ! TomlError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="string.impl.Serialize"}

## Implementation `Serialize for string<'a>`

```silk
impl<'a> Serialize for string<'a>
```

::Anchor{id="string.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="String.impl.Serialize"}

## Implementation `Serialize for String`

```silk
impl Serialize for String
```

::Anchor{id="String.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

::Anchor{id="String.impl.Deserialize"}

## Implementation `Deserialize for String`

```silk
impl Deserialize for String
```

::Anchor{id="String.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(value: &Value) -> Self ! TomlError | OutOfMemoryError ? &mut Allocator
```

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
