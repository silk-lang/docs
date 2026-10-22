The interfaces that let a type be written to JSON and read from JSON.

## When to use
Implement [`Serialize`](#Serialize) for your type to write it with `silk.json_value.Json.serialize`.
Implement [`Decode`](#Decode) (no memory needed) or [`Deserialize`](#Deserialize) (memory needed) to read it with
`Json.decode` or `Json.deserialize`.

## Details
The standard library implements the interfaces for `bool`, the integer types, `f32`, `f64`,
strings, `Option<T>`, and `List<T>`. `Option<T>` is `null` when absent.

A `Serialize` implementation for a struct usually writes an object with
`silk.json_object.JsonObject`, or uses `silk.json_reflect.JsonReflect.write`. A `Deserialize`
implementation reads tokens from a `JsonScanner` and calls [`JsonCodec.deserializeOne`](#JsonCodec.impl.deserializeOne) for each
field.

## Errors
- `JsonError` when the JSON does not match the type, a number does not fit, or a float that is
  not finite is written. A float that is not finite fails before any bytes are written.

## Gotchas
Each read function reads exactly one value and leaves the next token, such as `,` or `]`, for
the caller. The caller must check that the document ends.

## Examples
### Implement `Serialize` for a struct
```silk
import silk.effect { Effect }
import silk.json_codec { Serialize }
import silk.json_object { JsonObject }
import silk.json_output { JsonOptions }
import silk.json_scanner { JsonError }
import silk.json_value { Json }
import silk.writer { Writer, WriterError }

struct CaptureWriter {
  bytes: [u8; 64]
  length: usize
}

impl Writer for CaptureWriter {
  effect fn writeAll(self: &mut Self, value: &[u8]) -> ()
    ! WriterError
    ? &mut Writer {
    let mut index: usize = 0
    while index < value.length {
      self.bytes[self.length] = value[index]
      self.length = self.length + 1
      index = index + 1
    }
    return ()
  }

  effect fn flush(self: &mut Self) -> ()
    ! WriterError
    ? &mut Writer {
    return ()
  }
}

fn holds(writer: &CaptureWriter, expected: &[u8]) -> bool {
  if writer.length != expected.length {
    return false
  }
  let mut index: usize = 0
  while index < expected.length {
    if writer.bytes[index] != expected[index] {
      return false
    }
    index = index + 1
  }
  return true
}

struct Point {
  x: i32
  y: i32
}

impl Serialize for Point {
  effect fn serialize(self: &Self, options: &JsonOptions) -> ()
    ! JsonError | WriterError
    ? &mut Writer {
    return run JsonObject.begin(options) |> JsonObject.field("x", &self.x)
      |> JsonObject.field("y", &self.y)
      |> JsonObject.end
  }
}

pub effect fn main() -> i32
  ! JsonError | WriterError {
  let mut writer = CaptureWriter { bytes: [0; 64], length: 0 }
  let point = Point { x: 3, y: -4 }
  run Json.serialize(&point, &JsonOptions.compact()) |> Effect.provideMut<Writer>(&mut writer)
  if !holds(&writer, b"{\"x\":3,\"y\":-4}") {
    return 1
  }
  return 0
}
```

Import as `JsonCodec` with `import silk.json_codec { JsonCodec }`.

Public declarations: 4.

::Anchor{id="Serialize"}

## `Serialize`

```silk
pub interface Serialize
```

A type that can write itself as one JSON value.

::Anchor{id="Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Writes `self` as one JSON value to the `Writer`, with `options`.

::Anchor{id="Decode"}

## `Decode`

```silk
pub interface Decode
```

A type that can read itself from one JSON value without memory from an `Allocator`.

::Anchor{id="Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

Reads one value from `scanner`. It leaves the next token unread.

::Anchor{id="Deserialize"}

## `Deserialize`

```silk
pub interface Deserialize
```

A type that can read itself from one JSON value and can use memory from the `Allocator`.

::Anchor{id="Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

Reads one value from `scanner`. It leaves the next token unread.

::Anchor{id="JsonCodec"}

## `JsonCodec`

```silk
pub struct JsonCodec
```

The owner type of the generic read and write operations. It has no fields and is never
constructed.

::Anchor{id="JsonCodec.impl"}

## Implementation `JsonCodec`

```silk
impl JsonCodec
```

::Anchor{id="JsonCodec.impl.decodeOne"}

### Associated function `decodeOne`

```silk
pub fn decodeOne<T: Decode>(scanner: &mut JsonScanner) -> Result<T, JsonError>
```

Reads one value of type `T` from `scanner` with its `Decode` implementation.

#### Errors

- `JsonError` if the value is not valid JSON or does not have type `T`.

::Anchor{id="JsonCodec.impl.deserializeOne"}

### Associated function `deserializeOne`

```silk
pub effect fn deserializeOne<T: Deserialize>(scanner: &mut JsonScanner)
    -> T ! JsonError | OutOfMemoryError ? &mut Allocator
```

Reads one value of type `T` from `scanner` with its `Deserialize` implementation.

#### When to use

Call it for each field in your own `Deserialize` implementation.

#### Errors

- `JsonError` if the value is not valid JSON or does not have type `T`.
- `OutOfMemoryError` if the `Allocator` cannot supply the value.

::Anchor{id="JsonCodec.impl.writeOne"}

### Associated function `writeOne`

```silk
pub effect fn writeOne<T: Serialize>(value: &T, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Writes `value` with its `Serialize` implementation.

#### Errors

- `JsonError` from the implementation, such as for a float that is not finite.
- `WriterError` if the `Writer` fails. Bytes that it accepted before the failure stay written.

::Anchor{id="bool.impl.Serialize"}

## Implementation `Serialize for bool`

```silk
impl Serialize for bool
```

::Anchor{id="bool.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="bool.impl.Decode"}

## Implementation `Decode for bool`

```silk
impl Decode for bool
```

::Anchor{id="bool.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="bool.impl.Deserialize"}

## Implementation `Deserialize for bool`

```silk
impl Deserialize for bool
```

::Anchor{id="bool.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="u8.impl.Serialize"}

## Implementation `Serialize for u8`

```silk
impl Serialize for u8
```

::Anchor{id="u8.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="u8.impl.Decode"}

## Implementation `Decode for u8`

```silk
impl Decode for u8
```

::Anchor{id="u8.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="u8.impl.Deserialize"}

## Implementation `Deserialize for u8`

```silk
impl Deserialize for u8
```

::Anchor{id="u8.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="u16.impl.Serialize"}

## Implementation `Serialize for u16`

```silk
impl Serialize for u16
```

::Anchor{id="u16.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="u16.impl.Decode"}

## Implementation `Decode for u16`

```silk
impl Decode for u16
```

::Anchor{id="u16.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="u16.impl.Deserialize"}

## Implementation `Deserialize for u16`

```silk
impl Deserialize for u16
```

::Anchor{id="u16.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="u32.impl.Serialize"}

## Implementation `Serialize for u32`

```silk
impl Serialize for u32
```

::Anchor{id="u32.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="u32.impl.Decode"}

## Implementation `Decode for u32`

```silk
impl Decode for u32
```

::Anchor{id="u32.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="u32.impl.Deserialize"}

## Implementation `Deserialize for u32`

```silk
impl Deserialize for u32
```

::Anchor{id="u32.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="u64.impl.Serialize"}

## Implementation `Serialize for u64`

```silk
impl Serialize for u64
```

::Anchor{id="u64.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="u64.impl.Decode"}

## Implementation `Decode for u64`

```silk
impl Decode for u64
```

::Anchor{id="u64.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="u64.impl.Deserialize"}

## Implementation `Deserialize for u64`

```silk
impl Deserialize for u64
```

::Anchor{id="u64.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="usize.impl.Serialize"}

## Implementation `Serialize for usize`

```silk
impl Serialize for usize
```

::Anchor{id="usize.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="usize.impl.Decode"}

## Implementation `Decode for usize`

```silk
impl Decode for usize
```

::Anchor{id="usize.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="usize.impl.Deserialize"}

## Implementation `Deserialize for usize`

```silk
impl Deserialize for usize
```

::Anchor{id="usize.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="i8.impl.Serialize"}

## Implementation `Serialize for i8`

```silk
impl Serialize for i8
```

::Anchor{id="i8.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="i8.impl.Decode"}

## Implementation `Decode for i8`

```silk
impl Decode for i8
```

::Anchor{id="i8.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="i8.impl.Deserialize"}

## Implementation `Deserialize for i8`

```silk
impl Deserialize for i8
```

::Anchor{id="i8.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="i16.impl.Serialize"}

## Implementation `Serialize for i16`

```silk
impl Serialize for i16
```

::Anchor{id="i16.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="i16.impl.Decode"}

## Implementation `Decode for i16`

```silk
impl Decode for i16
```

::Anchor{id="i16.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="i16.impl.Deserialize"}

## Implementation `Deserialize for i16`

```silk
impl Deserialize for i16
```

::Anchor{id="i16.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="i32.impl.Serialize"}

## Implementation `Serialize for i32`

```silk
impl Serialize for i32
```

::Anchor{id="i32.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="i32.impl.Decode"}

## Implementation `Decode for i32`

```silk
impl Decode for i32
```

::Anchor{id="i32.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="i32.impl.Deserialize"}

## Implementation `Deserialize for i32`

```silk
impl Deserialize for i32
```

::Anchor{id="i32.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="i64.impl.Serialize"}

## Implementation `Serialize for i64`

```silk
impl Serialize for i64
```

::Anchor{id="i64.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="i64.impl.Decode"}

## Implementation `Decode for i64`

```silk
impl Decode for i64
```

::Anchor{id="i64.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="i64.impl.Deserialize"}

## Implementation `Deserialize for i64`

```silk
impl Deserialize for i64
```

::Anchor{id="i64.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="isize.impl.Serialize"}

## Implementation `Serialize for isize`

```silk
impl Serialize for isize
```

::Anchor{id="isize.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="isize.impl.Decode"}

## Implementation `Decode for isize`

```silk
impl Decode for isize
```

::Anchor{id="isize.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="isize.impl.Deserialize"}

## Implementation `Deserialize for isize`

```silk
impl Deserialize for isize
```

::Anchor{id="isize.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="f32.impl.Decode"}

## Implementation `Decode for f32`

```silk
impl Decode for f32
```

::Anchor{id="f32.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="f32.impl.Deserialize"}

## Implementation `Deserialize for f32`

```silk
impl Deserialize for f32
```

::Anchor{id="f32.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="f32.impl.Serialize"}

## Implementation `Serialize for f32`

```silk
impl Serialize for f32
```

::Anchor{id="f32.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="f64.impl.Decode"}

## Implementation `Decode for f64`

```silk
impl Decode for f64
```

::Anchor{id="f64.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="f64.impl.Deserialize"}

## Implementation `Deserialize for f64`

```silk
impl Deserialize for f64
```

::Anchor{id="f64.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="f64.impl.Serialize"}

## Implementation `Serialize for f64`

```silk
impl Serialize for f64
```

::Anchor{id="f64.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="string.impl.Serialize"}

## Implementation `Serialize for string<'a>`

```silk
impl<'a> Serialize for string<'a>
```

::Anchor{id="string.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="String.impl.Serialize"}

## Implementation `Serialize for String`

```silk
impl Serialize for String
```

::Anchor{id="String.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="String.impl.Deserialize"}

## Implementation `Deserialize for String`

```silk
impl Deserialize for String
```

::Anchor{id="String.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="Option.impl.Serialize"}

## Implementation `Serialize for Option<T>`

```silk
impl<T: Serialize> Serialize for Option<T>
```

::Anchor{id="Option.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="Option.impl.Decode"}

## Implementation `Decode for Option<T>`

```silk
impl<T: Decode> Decode for Option<T>
```

::Anchor{id="Option.impl.Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

::Anchor{id="Option.impl.Deserialize"}

## Implementation `Deserialize for Option<T>`

```silk
impl<T: Deserialize> Deserialize for Option<T>
```

::Anchor{id="Option.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="List.impl.Serialize"}

## Implementation `Serialize for List<T>`

```silk
impl<T: Serialize> Serialize for List<T>
```

::Anchor{id="List.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="List.impl.Deserialize"}

## Implementation `Deserialize for List<T>`

```silk
impl<T: Deserialize> Deserialize for List<T>
```

::Anchor{id="List.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
