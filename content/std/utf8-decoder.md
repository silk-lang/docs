Incremental UTF-8 decoding across byte-chunk boundaries without allocation.

## When to use
Use [`Utf8Decoder`](#Utf8Decoder) when bytes arrive in chunks and a sequence can cross a chunk boundary.
Use `String.fromUtf8` when all bytes are available in one complete slice.

## Details
Feed bytes in order with [`step`](#Utf8Decoder.impl.step). A complete scalar resets the decoder for the next byte.
The caller supplies each byte's offset so an invalid result identifies that byte.

## Gotchas
If input ends while [`pending`](#Utf8Decoder.impl.pending) returns true, the caller must report incomplete input.
After an invalid result, create a new decoder before processing more bytes.

Import as `Utf8Decoder` with `import silk.utf8_decoder { Utf8Decoder }`.

Public declarations: 2.

::Anchor{id="Utf8Step"}

## `Utf8Step`

```silk
pub union Utf8Step
```

The result of validating one UTF-8 byte.

::Anchor{id="Utf8Step.Scalar"}

### `Scalar`

```silk
Scalar
```

A complete Unicode scalar value.

::Anchor{id="Utf8Step.Scalar.value"}

#### Field `value`

```silk
pub value: u32
```

The decoded scalar value.

::Anchor{id="Utf8Step.NeedMore"}

### `NeedMore`

```silk
NeedMore
```

More continuation bytes are required to complete the scalar.

::Anchor{id="Utf8Step.Invalid"}

### `Invalid`

```silk
Invalid
```

The byte cannot complete a valid UTF-8 sequence.

::Anchor{id="Utf8Step.Invalid.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The caller-supplied offset of the invalid byte.

::Anchor{id="Utf8Decoder"}

## `Utf8Decoder`

```silk
pub struct Utf8Decoder
```

Allocation-free state for one UTF-8 scalar at a time across byte chunks.

### Details
A completed scalar leaves this state ready for the next sequence. An incomplete sequence
remains available for the next chunk. This state does not retain a byte slice.

::Anchor{id="Utf8Decoder.impl"}

## Implementation `Utf8Decoder`

```silk
impl Utf8Decoder
```

::Anchor{id="Utf8Decoder.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Utf8Decoder
```

Creates a decoder ready for the first byte of a UTF-8 sequence.

::Anchor{id="Utf8Decoder.impl.pending"}

### Method `pending`

```silk
pub fn pending(self: &Utf8Decoder) -> bool
```

Returns true if the current scalar still needs continuation bytes.

::Anchor{id="Utf8Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Utf8Decoder, byte: u8, offset: usize) -> Utf8Step
```

Validates one byte and returns a scalar, a need-more result, or the invalid byte offset.

#### Details
Supply consecutive bytes in order, including across chunk boundaries. `offset` is the
absolute position of `byte` in the caller's input. A complete scalar resets the decoder.

#### Gotchas
Overlong sequences, surrogate values, and values above `0x10FFFF` are invalid. If input
ends while [`pending`](#Utf8Decoder.impl.pending) is true, the caller must report incomplete input.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
