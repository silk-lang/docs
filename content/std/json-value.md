Owned dynamic JSON values parsed from a byte slice and written through the ambient Writer.

## When to use
Use [`Json.parse`](#Json.impl.parse) when a document needs borrowed field access after parsing. Use
[`Json.write`](#Json.impl.write) or [`Json.writeWith`](#Json.impl.writeWith) to serialize an owned tree. Token-only consumers can use
`silk.json_scanner` without an allocator.

## Details
Arrays and objects retain source order. Numbers retain valid source spelling and decode into
integers or floats only when accessed. String escapes are decoded into owned UTF-8 storage. A failed
parse releases every partially built value.

## Gotchas
A borrowed field or string cannot outlive its owning [`Value`](#Value). JSON output can leave an
accepted prefix if `Writer` fails; it does not flush the writer.

## Examples
### Read an integer member
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.json_scanner { JsonError }
import silk.json_value { Json }
import silk.option { Option }

effect fn read() -> i32 ! JsonError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let document = run Json.parse(b"{\"id\":42}")
    |> Effect.provideMut<Allocator>(&mut allocator)
  return Json.field(&document, "id") |> Json.asI32 |> Option<i32>.unwrapOr(0)
}

effect fn recover(error: JsonError | OutOfMemoryError) -> i32 { return 0 }
pub fn main() -> i32 { return run Effect.catchAll(read(), recover) }
```

Import as `Json` with `import silk.json_value { Json }`.

Public declarations: 4.

::Anchor{id="JsonEntry"}

## `JsonEntry`

```silk
pub struct JsonEntry
```

One owned key/value pair in an insertion-ordered JSON object.

::Anchor{id="JsonEntry.key"}

### Field `key`

```silk
pub key: String
```

The decoded key.

::Anchor{id="JsonEntry.value"}

### Field `value`

```silk
pub value: Value
```

The owned member value.

::Anchor{id="JsonChild"}

## `JsonChild`

```silk
pub union JsonChild
```

One owned child: an array item or an object member with its decoded key.

### Details
Both container kinds use this one recursive storage shape, so cleanup follows one finite
`Box<List<JsonChild>>` specialization even when arrays and objects nest in each other.

::Anchor{id="JsonChild.Item"}

### `Item`

```silk
Item
```

An array element without a key.

::Anchor{id="JsonChild.Item.value"}

#### Field `value`

```silk
pub value: Value
```

The owned element value.

::Anchor{id="JsonChild.Member"}

### `Member`

```silk
Member
```

An object member with a decoded key.

::Anchor{id="JsonChild.Member.entry"}

#### Field `entry`

```silk
pub entry: JsonEntry
```

The owned key and value.

::Anchor{id="Value"}

## `Value`

```silk
pub union Value
```

An owned JSON null, boolean, raw number, decoded string, array, or object.

::Anchor{id="Value.Null"}

### `Null`

```silk
Null
```

JSON `null`.

::Anchor{id="Value.Bool"}

### `Bool`

```silk
Bool
```

A JSON boolean.

::Anchor{id="Value.Bool.value"}

#### Field `value`

```silk
pub value: bool
```

The boolean value.

::Anchor{id="Value.Number"}

### `Number`

```silk
Number
```

A valid number lexeme retained exactly as read.

::Anchor{id="Value.Number.text"}

#### Field `text`

```silk
pub text: String
```

The valid number text in its source spelling.

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

The decoded UTF-8 text.

::Anchor{id="Value.Array"}

### `Array`

```silk
Array
```

Values in source order.

::Anchor{id="Value.Array.values"}

#### Field `values`

```silk
pub values: Box<List<JsonChild>>
```

The array elements in source order.

::Anchor{id="Value.Object"}

### `Object`

```silk
Object
```

Members in source order.

::Anchor{id="Value.Object.entries"}

#### Field `entries`

```silk
pub entries: Box<List<JsonChild>>
```

The object members in source order.

::Anchor{id="Json"}

## `Json`

```silk
pub struct Json
```

Operations on owned JSON values.

::Anchor{id="Json.impl"}

## Implementation `Json`

```silk
impl Json
```

::Anchor{id="Json.impl.parse"}

### Associated function `parse`

```silk
pub effect fn parse(bytes: &[u8]) -> Value ! JsonError | OutOfMemoryError ? &mut Allocator
```

Parses one complete strict JSON document into an owned value tree.

#### Details
Every allocation is charged to the ambient allocator. On syntax, duplicate-key, or
allocation failure, the partially built tree is dropped.

::Anchor{id="Json.impl.decode"}

### Associated function `decode`

```silk
pub fn decode<T: Decode>(bytes: &[u8]) -> Result<T, JsonError>
```

Decodes one complete JSON document without an allocator requirement.

::Anchor{id="Json.impl.deserialize"}

### Associated function `deserialize`

```silk
pub effect fn deserialize<T: Deserialize>(bytes: &[u8])
    -> T ! JsonError | OutOfMemoryError ? &mut Allocator
```

Deserializes one complete JSON document, with allocation charged to the ambient allocator.

::Anchor{id="Json.impl.serialize"}

### Associated function `serialize`

```silk
pub effect fn serialize<T: Serialize>(value: &T, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Serializes one value through its static witness and the ambient Writer.

::Anchor{id="Json.impl.write"}

### Associated function `write`

```silk
pub effect fn write(document: &Value) -> () ! JsonError | WriterError ? &mut Writer
```

Writes a tree compactly through the ambient Writer.

::Anchor{id="Json.impl.writeWith"}

### Associated function `writeWith`

```silk
pub effect fn writeWith(document: &Value, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

Writes a tree with explicit indentation and depth policy.

::Anchor{id="Json.impl.field"}

### Method `field`

```silk
pub fn field<'a>(self: &'a Value, key: string) -> Option<&'a Value>
```

Borrows a member of an object, or returns `None` for an absent key or other value kind.

::Anchor{id="Json.impl.fieldAt"}

### Method `fieldAt`

```silk
pub fn fieldAt<'a>(self: Option<&'a Value>, key: string) -> Option<&'a Value>
```

Chains an object lookup while preserving an absent value.

::Anchor{id="Json.impl.asI32"}

### Method `asI32`

```silk
pub fn asI32(self: Option<&Value>) -> Option<i32>
```

Decodes an integer number into `i32`, returning `None` for absence or overflow.

::Anchor{id="Json.impl.asI64"}

### Method `asI64`

```silk
pub fn asI64(self: Option<&Value>) -> Option<i64>
```

Decodes an integer number into `i64`, returning `None` for absence or overflow.

::Anchor{id="Json.impl.asU64"}

### Method `asU64`

```silk
pub fn asU64(self: Option<&Value>) -> Option<u64>
```

Decodes an integer number into `u64`, returning `None` for absence or overflow.

::Anchor{id="Json.impl.asF64"}

### Method `asF64`

```silk
pub fn asF64(self: Option<&Value>) -> Option<f64>
```

Decodes a finite `f64`, or returns `None` for absence, wrong type, invalid text, or overflow.

::Anchor{id="Json.impl.asF32"}

### Method `asF32`

```silk
pub fn asF32(self: Option<&Value>) -> Option<f32>
```

Decodes a finite `f32`, or returns `None` for absence, wrong type, invalid text, or overflow.

::Anchor{id="Json.impl.asString"}

### Method `asString`

```silk
pub fn asString<'a>(self: Option<&'a Value>) -> Option<string<'a>>
```

Borrows decoded string text while its owning tree remains alive.

::Anchor{id="Value.impl.Serialize"}

## Implementation `Serialize for Value`

```silk
impl Serialize for Value
```

::Anchor{id="Value.impl.Serialize.serialize"}

### Operation `serialize`

```silk
effect fn serialize(self: &Self, options: &JsonOptions)
    -> () ! JsonError | WriterError ? &mut Writer
```

::Anchor{id="Value.impl.Deserialize"}

## Implementation `Deserialize for Value`

```silk
impl Deserialize for Value
```

::Anchor{id="Value.impl.Deserialize.deserialize"}

### Operation `deserialize`

```silk
effect fn deserialize(scanner: &mut JsonScanner)
    -> Self ! JsonError | OutOfMemoryError ? &mut Allocator
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
