Static contracts for converting common Silk values to and from TOML values.

## When to use
Use [`TomlCodec.writeOne`](#TomlCodec.impl.writeOne) to write a typed value after a key and separator. Use
[`TomlCodec.decodeOne`](#TomlCodec.impl.decodeOne) on a parsed value for allocation-free types, or
[`TomlCodec.deserializeOne`](#TomlCodec.impl.deserializeOne) for an owned string.

Import as `TomlCodec` with `import silk.toml_codec { TomlCodec }`.

Public declarations: 4.

::Anchor{id="Serialize"}

## `Serialize`

```silk
pub interface Serialize
```

A type that writes one TOML value through the ambient Writer.

::Anchor{id="Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self) -> () ! TomlError | WriterError ? &mut Writer
```

Writes one value in TOML syntax through the ambient Writer.

::Anchor{id="Decode"}

## `Decode`

```silk
pub interface Decode
```

A type decoded from an owned TOML value without allocation.

::Anchor{id="Decode.decode"}

### Operation `decode`

```silk
fn decode(value: &Value) -> Result<Self, TomlError>
```

Converts one owned TOML value without allocation or returns a typed failure.

::Anchor{id="Deserialize"}

## `Deserialize`

```silk
pub interface Deserialize
```

A type decoded from an owned TOML value with allocation.

::Anchor{id="Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(value: &Value) -> Self ! TomlError | OutOfMemoryError ? &mut Allocator
```

Converts one owned TOML value with the ambient allocator.

::Anchor{id="TomlCodec"}

## `TomlCodec`

```silk
pub struct TomlCodec
```

Selects static TOML conversion witnesses.

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

Writes a typed value in value position through the ambient Writer.

#### Gotchas
Write the key and ` = ` before this call when writing a document.

::Anchor{id="TomlCodec.impl.decodeOne"}

### Associated function `decodeOne`

```silk
pub fn decodeOne<T: Decode>(value: &Value) -> Result<T, TomlError>
```

Decodes an allocation-free type from one owned value, or returns a typed failure.

::Anchor{id="TomlCodec.impl.deserializeOne"}

### Associated function `deserializeOne`

```silk
pub effect fn deserializeOne<T: Deserialize>(value: &Value)
    -> T ! TomlError | OutOfMemoryError ? &mut Allocator
```

Deserializes an allocating type from one owned value with the ambient allocator.

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

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
