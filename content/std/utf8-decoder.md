Decoding of UTF-8 one byte at a time, for input that arrives in chunks. No allocation.

## When to use
Use [`Utf8Decoder`](#Utf8Decoder) when bytes arrive in chunks, such as from a socket, and one character can be
split between two chunks. Use `String.fromUtf8` when all bytes are in one slice.

## Details
Give each byte to [`Utf8Decoder.step`](#Utf8Decoder.impl.step) in order. The result is a complete scalar, a request for
more bytes, or an invalid byte. After a complete scalar, the decoder is ready for the next
character. The caller gives the position of each byte, so an invalid result can report it.

## Gotchas
If the input ends while [`Utf8Decoder.pending`](#Utf8Decoder.impl.pending) is `true`, the last character is incomplete, and
the caller must report an error. After an invalid result, make a new decoder before the next
byte.

## Examples
### Decode a character split between two chunks
```silk
import silk.utf8_decoder { Utf8Decoder, Utf8Step }

pub fn main() -> i32 {
  // "é" is the two bytes 0xC3 0xA9. They arrive in different chunks.
  let mut decoder = Utf8Decoder.make()
  let first = Utf8Decoder.step(&mut decoder, 0xC3, 0)
  let waiting = Utf8Decoder.pending(&decoder)
  let second = Utf8Decoder.step(&mut decoder, 0xA9, 1)
  let scalar = match move second {
    Utf8Step.Scalar { value } => value
    Utf8Step.NeedMore => 0
    Utf8Step.Invalid { offset } => 0
  }
  if !waiting || scalar != 233 {
    return 1
  }
  return 0
}
```

Import as `Utf8Decoder` with `import silk.utf8_decoder { Utf8Decoder }`.

Public declarations: 2.

::Anchor{id="Utf8Step"}

## `Utf8Step`

```silk
pub union Utf8Step
```

The result of one [`Utf8Decoder.step`](#Utf8Decoder.impl.step): a complete scalar, a request for more bytes, or an
invalid byte.

::Anchor{id="Utf8Step.Scalar"}

### `Scalar`

```silk
Scalar
```

The byte completed a character.

::Anchor{id="Utf8Step.Scalar.value"}

#### Field `value`

```silk
pub value: u32
```

The code point of the character. It is a valid Unicode scalar value.

::Anchor{id="Utf8Step.NeedMore"}

### `NeedMore`

```silk
NeedMore
```

The character needs more bytes. Give the next byte to [`Utf8Decoder.step`](#Utf8Decoder.impl.step).

::Anchor{id="Utf8Step.Invalid"}

### `Invalid`

```silk
Invalid
```

The byte cannot be part of valid UTF-8 at this position.

::Anchor{id="Utf8Step.Invalid.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The position of the invalid byte, as the caller gave it to [`Utf8Decoder.step`](#Utf8Decoder.impl.step).

::Anchor{id="Utf8Decoder"}

## `Utf8Decoder`

```silk
pub struct Utf8Decoder
```

The state of a UTF-8 decoder between bytes.

### Details

The state holds at most one incomplete character. It does not keep a borrow of the input. Use it
when bytes arrive in chunks, such as from a socket, and one character can be split between two
chunks. Use `String.fromUtf8` when all bytes are in one slice.

### Gotchas

If the input ends while [`Utf8Decoder.pending`](#Utf8Decoder.impl.pending) is `true`, the last character is incomplete, and
the caller must report an error. After an invalid result, make a new decoder before the next
byte.

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

Returns a decoder that is ready for the first byte of a character.

::Anchor{id="Utf8Decoder.impl.pending"}

### Method `pending`

```silk
pub fn pending(self: &Utf8Decoder) -> bool
```

Returns `true` if the decoder holds an incomplete character that needs more bytes.

::Anchor{id="Utf8Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Utf8Decoder, byte: u8, offset: usize) -> Utf8Step
```

Gives one byte to the decoder and returns the result.

#### Details

Give the bytes in order, also across chunks. `offset` is the position of `byte` in the input
of the caller. The decoder uses it only for the [`Utf8Step.Invalid`](#Utf8Step.Invalid) result. After a complete
character, the decoder is ready for the next character.

#### Gotchas

The decoder rejects overlong encodings, surrogates, and values more than `0x10FFFF`. After an
invalid result, make a new decoder.

Category: Text.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
