HTTP/2 field compression as defined by RFC 7541.

Keep one [`Decoder`](#Decoder) for received fields and one [`Encoder`](#Encoder) for sent fields. Each field block uses
the table left by the previous block. Field names and values are wire bytes, without UTF-8 conversion.
Decoding accepts every representation, including Huffman strings. Encoding uses indexed fields
and literal strings, with dynamic indexing only when the field is not sensitive.

Import as `Decoder` with `import silk.http.hpack { Decoder }`.

Public declarations: 5.

::Anchor{id="Field"}

## `Field`

```silk
pub struct Field<'a>
```

One borrowed field for compression. Names and values contain the exact wire bytes.

::Anchor{id="Field.name"}

### Field `name`

```silk
pub name: &'a [u8]
```

The field name, including a leading colon for a pseudo-header.

::Anchor{id="Field.value"}

### Field `value`

```silk
pub value: &'a [u8]
```

The field value.

::Anchor{id="Field.sensitive"}

### Field `sensitive`

```silk
pub sensitive: bool
```

If true, encoders use the never-indexed representation.

::Anchor{id="Field.impl.Copy"}

## Implementation `Copy for Field<'a>`

```silk
impl<'a> Copy for Field<'a>
```

::Anchor{id="Header"}

## `Header`

```silk
pub struct Header
```

One decoded field. Dropping it releases its name and value storage.

::Anchor{id="Header.name"}

### Field `name`

```silk
pub name: Bytes
```

The field name bytes.

::Anchor{id="Header.value"}

### Field `value`

```silk
pub value: Bytes
```

The field value bytes.

::Anchor{id="Header.sensitive"}

### Field `sensitive`

```silk
pub sensitive: bool
```

True if the sender used the never-indexed representation.

::Anchor{id="Header.impl"}

## Implementation `Header`

```silk
impl Header
```

::Anchor{id="Header.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> Field
```

Borrows the field bytes. The view cannot outlive the owned field.

::Anchor{id="HpackError"}

## `HpackError`

```silk
pub struct HpackError
```

A malformed field block or a configured resource limit.

::Anchor{id="HpackError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset at which decoding failed.

::Anchor{id="HpackError.limit"}

### Field `limit`

```silk
pub limit: bool
```

True for a resource limit, false for invalid compression syntax.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

A connection's HPACK decoder with a bounded dynamic table and decoded field list.

::Anchor{id="Decoder.impl"}

## Implementation `Decoder`

```silk
impl Decoder
```

::Anchor{id="Decoder.impl.make"}

### Associated function `make`

```silk
pub fn make(tableBytes: usize, maxFields: usize, maxBytes: usize) -> Decoder
```

Creates a decoder with the negotiated table limit and per-block field count and byte limits.
The byte limit counts name bytes, value bytes, and 32 bytes for each field.

::Anchor{id="Decoder.impl.setMaximum"}

### Method `setMaximum`

```silk
pub fn setMaximum(self: &mut Self, maximum: usize) -> ()
```

Applies an acknowledged SETTINGS_HEADER_TABLE_SIZE. A reduction requires the next block to update its table.

::Anchor{id="Decoder.impl.decode"}

### Method `decode`

```silk
pub effect fn decode(self: &mut Self, input: &[u8]) -> List<Header>
    ! HpackError | OutOfMemoryError
    ? &mut Allocator
```

Decodes one complete field block and updates the dynamic table.
A failure invalidates the compression context; close its HTTP/2 connection.

::Anchor{id="Encoder"}

## `Encoder`

```silk
pub struct Encoder
```

A connection's HPACK encoder. Sensitive fields are never indexed.

::Anchor{id="Encoder.impl"}

## Implementation `Encoder`

```silk
impl Encoder
```

::Anchor{id="Encoder.impl.make"}

### Associated function `make`

```silk
pub fn make(tableBytes: usize) -> Encoder
```

Creates an encoder with the peer's current table limit.

::Anchor{id="Encoder.impl.setMaximum"}

### Method `setMaximum`

```silk
pub fn setMaximum(self: &mut Self, maximum: usize) -> ()
```

Applies the peer's table limit and emits the required updates at the next field block.

::Anchor{id="Encoder.impl.encode"}

### Method `encode`

```silk
pub effect fn encode(self: &mut Self, fields: &[Field]) -> Bytes
    ! OutOfMemoryError
    ? &mut Allocator
```

Encodes a complete field block. The next block must use this same encoder.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
