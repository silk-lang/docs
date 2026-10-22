Static JSON conversion contracts for typed values.

## When to use
Use `Serialize` to write a value through the ambient Writer. Use `Decode` for owned
values that need no allocation. Use `Deserialize` when a value can allocate.

## Details
Each decode consumes one JSON value from a slice scanner. The caller checks for end of input.
Integer, Boolean, and finite floating-point values support all three contracts. Nonfinite
floating-point values fail with `JsonError` before any bytes are written.
A hand-written aggregate witness can delegate to field witnesses through `JsonCodec` and the
JSON object builders. Use the bounded `JsonCodec.deserializeOne<T>` helper when decoding a field.

Import as `JsonCodec` with `import silk.json_codec { JsonCodec }`.

Public declarations: 4.

::Anchor{id="Serialize"}

## `Serialize`

```silk
pub interface Serialize
```

A type that writes one JSON value without allocating JSON-owned storage.

::Anchor{id="Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Writes one value through the ambient Writer with the supplied format policy.

::Anchor{id="Decode"}

## `Decode`

```silk
pub interface Decode
```

A type that decodes one owned JSON value without an Allocator requirement.

::Anchor{id="Decode.decode"}

### Operation `decode`

```silk
fn decode(scanner: &mut JsonScanner) -> Result<Self, JsonError>
```

Decodes one value and leaves enclosing array or object delimiters unread.

::Anchor{id="Deserialize"}

## `Deserialize`

```silk
pub interface Deserialize
```

A type that decodes one owned JSON value and can allocate.

::Anchor{id="Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

Decodes one value and leaves enclosing array or object delimiters unread.

::Anchor{id="JsonCodec"}

## `JsonCodec`

```silk
pub struct JsonCodec
```

Operations that select static JSON witnesses for one value.

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

Decodes one value without requiring an allocator.

::Anchor{id="JsonCodec.impl.deserializeOne"}

### Associated function `deserializeOne`

```silk
pub effect fn deserializeOne<T: Deserialize>(scanner: &mut JsonScanner)
    -> T ! JsonError | OutOfMemoryError ? &mut Allocator
```

Deserializes one value with its declared allocator upper bound.

::Anchor{id="JsonCodec.impl.writeOne"}

### Associated function `writeOne`

```silk
pub effect fn writeOne<T: Serialize>(value: &T, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Writes one value through its Serialize witness.

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
