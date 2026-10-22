Byte percent coding with explicit ownership and caller-controlled storage.

## When to use
Use `encodeInto` and `decodeInto` to reuse a byte buffer, or `encodeToWriter` to stream output.
Use `encodeOwned` and `decodeOwned` when the result needs independent storage.

## Details
Encoding creates uppercase escapes and treats every input percent sign as data.
Decoding preserves plus signs and arbitrary bytes. Validate UTF-8 separately with `String.fromUtf8`.
Query coding follows generic URI syntax, not HTML form rules.

Import as `UriPercent` with `import silk.uri_percent { UriPercent }`.

Public declarations: 4.

::Anchor{id="PercentComponent"}

## `PercentComponent`

```silk
pub enum PercentComponent
```

The grammar context of raw bytes supplied to percent encoding.

::Anchor{id="PercentComponent.Userinfo"}

### `Userinfo`

```silk
Userinfo
```

User information; an at sign is escaped and a colon is retained.

::Anchor{id="PercentComponent.RegName"}

### `RegName`

```silk
RegName
```

A registered host name; authority delimiters are escaped.

::Anchor{id="PercentComponent.PathSegment"}

### `PathSegment`

```silk
PathSegment
```

One path segment; slash is escaped and colon is retained.

::Anchor{id="PercentComponent.FirstPathSegment"}

### `FirstPathSegment`

```silk
FirstPathSegment
```

The first relative path segment; slash and colon are escaped.

::Anchor{id="PercentComponent.Path"}

### `Path`

```silk
Path
```

A whole path; slash is retained, but question mark and number sign are escaped.

::Anchor{id="PercentComponent.Unreserved"}

### `Unreserved`

```silk
Unreserved
```

Only ASCII letters, digits, hyphen, period, underscore, and tilde are retained.

::Anchor{id="PercentComponent.Query"}

### `Query`

```silk
Query
```

A complete generic query; slash and question mark are retained.

::Anchor{id="PercentComponent.Fragment"}

### `Fragment`

```silk
Fragment
```

A complete fragment; slash and question mark are retained.

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

The position of a malformed percent escape in the supplied text or bytes.

::Anchor{id="DecodeError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the percent sign that starts the malformed escape.

::Anchor{id="Decoded"}

## `Decoded`

```silk
pub union Decoded<'input>
```

Decoded bytes that borrow unchanged input or own the result of expanding escapes.

### Details
The borrowed variant cannot outlive its input. Neither variant guarantees valid UTF-8.

::Anchor{id="Decoded.Borrowed"}

### `Borrowed`

```silk
Borrowed
```

Unchanged input without percent signs, requiring no allocation or copy.

::Anchor{id="Decoded.Borrowed.values"}

#### Field `values`

```silk
pub values: &'input [u8]
```

The original byte view, including any literal plus signs.

::Anchor{id="Decoded.Owned"}

### `Owned`

```silk
Owned
```

Independently owned bytes after percent escapes have been decoded.

::Anchor{id="Decoded.Owned.value"}

#### Field `value`

```silk
pub value: Bytes
```

The decoded bytes, which may contain invalid UTF-8.

::Anchor{id="UriPercent"}

## `UriPercent`

```silk
pub struct UriPercent
```

The owner of byte percent encoding and decoding operations for URI components.

::Anchor{id="UriPercent.impl"}

## Implementation `UriPercent`

```silk
impl UriPercent
```

::Anchor{id="UriPercent.impl.encodeOwned"}

### Associated function `encodeOwned`

```silk
pub effect fn encodeOwned(values: &[u8], component: PercentComponent) -> String
  ! OutOfMemoryError
  ? &mut Allocator
```

Encodes raw bytes into independently owned ASCII text with one exact backing allocation.

#### Details
Empty output does not allocate. Percent signs are always escaped using uppercase hexadecimal.
Allocation or size overflow fails with `OutOfMemoryError`.

#### Gotchas
Supply raw data, not already escaped text. Whole-path encoding retains slash and colon;
use `FirstPathSegment` for data that must not become a relative reference's scheme.

::Anchor{id="UriPercent.impl.encodeInto"}

### Associated function `encodeInto`

```silk
pub effect fn encodeInto(output: &mut Bytes, values: &[u8], component: PercentComponent) -> ()
  ! OutOfMemoryError
  ? &mut Allocator
```

Replaces a reusable byte buffer with percent-encoded ASCII component data.

#### Details
Computes the size and reserves exact required capacity before changing the contents.
Existing sufficient capacity requires no allocation. Failure leaves the original contents intact.

::Anchor{id="UriPercent.impl.encodedLength"}

### Associated function `encodedLength`

```silk
pub fn encodedLength(values: &[u8], component: PercentComponent) -> Option<usize>
```

Returns the encoded byte count without allocating, or `None` when the size exceeds `usize`.

#### Details
Counts raw data under the selected grammar context, including three bytes for each escape.
Use this to reserve a combined serialization before appending its individual components.

::Anchor{id="UriPercent.impl.appendEncoded"}

### Associated function `appendEncoded`

```silk
pub effect fn appendEncoded(output: &mut Bytes, values: &[u8], component: PercentComponent) -> ()
  ! OutOfMemoryError
  ? &mut Allocator
```

Appends encoded component data while retaining all existing destination bytes.

#### Details
Computes the additional byte count and reserves exact capacity before mutation. Sufficient
capacity requires no allocation. Size overflow or allocation failure leaves the output intact.

::Anchor{id="UriPercent.impl.encodeToWriter"}

### Associated function `encodeToWriter`

```silk
pub effect fn encodeToWriter(values: &[u8], component: PercentComponent) -> ()
  ! WriterError
  ? &mut Writer
```

Streams percent encoding to a Writer without allocating intermediate output storage.

#### Details
Writes unchanged ASCII runs directly from input and each escape from a three-byte stack array.
The Writer provider may allocate independently.

#### Gotchas
Writer failure may leave partial output. This operation does not flush the provider.

::Anchor{id="UriPercent.impl.decodeOwned"}

### Associated function `decodeOwned`

```silk
pub effect fn decodeOwned(text: string) -> Result<Bytes, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Decodes percent escapes into owned arbitrary bytes with one exact backing allocation.

#### Details
Malformed escapes fail before allocation. Empty output does not allocate. No bytes are
zero-filled before being overwritten, and plus signs remain literal bytes.

::Anchor{id="UriPercent.impl.decodeInto"}

### Associated function `decodeInto`

```silk
pub effect fn decodeInto(output: &mut Bytes, text: string) -> Result<(), DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Replaces reusable byte storage with strictly decoded bytes, preserving literal plus signs.

#### Details
Validates all escapes and reserves exact capacity before mutation. Malformed input and allocation
failure leave existing contents intact. Sufficient capacity requires no allocation.

::Anchor{id="UriPercent.impl.decodeInPlace"}

### Associated function `decodeInPlace`

```silk
pub fn decodeInPlace(values: &mut [u8]) -> Result<usize, DecodeError>
```

Strictly decodes a mutable byte slice in place and returns its initialized output-prefix length.

#### Details
Validates every escape before mutation, so malformed input leaves the slice unchanged.
The operation allocates nothing. Output may contain arbitrary bytes, including invalid UTF-8.

#### Gotchas
Bytes after the returned prefix are unspecified; the slice's physical length does not change.

::Anchor{id="UriPercent.impl.decodeOrBorrow"}

### Associated function `decodeOrBorrow`

```silk
pub effect fn decodeOrBorrow<'input>(text: string<'input>) -> Result<Decoded<'input>, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Borrows unchanged input bytes when no percent escapes occur, otherwise returns owned decoded bytes.

#### Details
The borrowed fast path performs no allocation or copy. Escaped input follows `decodeOwned`,
including strict validation before allocation and preservation of literal plus signs.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
