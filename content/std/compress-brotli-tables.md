The static dictionary, word transforms, and literal context lookup table of Brotli (RFC 7932).

## When to use
Use `silk.compress.brotli` to decode Brotli. Use this module only to read the raw tables, for
example in a custom Brotli encoder.

## Details
The tables are static byte strings and arrays. The lookups do not allocate.

Public declarations: 10.

::Anchor{id="transformCount"}

## `transformCount`

```silk
pub fn transformCount() -> usize
```

The number of word transforms, 121.

::Anchor{id="words"}

## `words`

```silk
pub fn words() -> &'static [u8]
```

Returns the 122,784 bytes of the static dictionary: for each word length from 4 to 24, all
words of that length, one after another.

::Anchor{id="wordSizeBits"}

## `wordSizeBits`

```silk
pub fn wordSizeBits(length: usize) -> u32
```

Returns the base-2 logarithm of the number of dictionary words of `length` bytes, or 0 when
there are none (lengths below 4 or above 24).

::Anchor{id="wordOffset"}

## `wordOffset`

```silk
pub fn wordOffset(length: usize) -> usize
```

Returns where the words of `length` bytes start in [`words`](#words), for lengths from 4 to 24.

::Anchor{id="affixes"}

## `affixes`

```silk
pub fn affixes() -> &'static [u8]
```

Returns the prefixes and suffixes of the word transforms. Each one is a length byte followed by
its bytes.

::Anchor{id="affixOffset"}

## `affixOffset`

```silk
pub fn affixOffset(index: usize) -> usize
```

Returns where affix `index` (0 to 49) starts in [`affixes`](#affixes).

::Anchor{id="transformPrefix"}

## `transformPrefix`

```silk
pub fn transformPrefix(index: usize) -> usize
```

Returns the prefix affix index of transform `index` (0 to 120).

::Anchor{id="transformKind"}

## `transformKind`

```silk
pub fn transformKind(index: usize) -> u32
```

Returns the kind of transform `index`: 0 for identity, 1 to 9 to drop that many last bytes, 10
to uppercase the first character, 11 to uppercase all, and 12 to 20 to drop 1 to 9 first bytes.

::Anchor{id="transformSuffix"}

## `transformSuffix`

```silk
pub fn transformSuffix(index: usize) -> usize
```

Returns the suffix affix index of transform `index` (0 to 120).

::Anchor{id="contextLookup"}

## `contextLookup`

```silk
pub fn contextLookup() -> &'static [u8]
```

Returns the context lookup table: for context mode `m`, the context of a literal after bytes
`p1` (last) and `p2` is `table[m * 512 + p1] | table[m * 512 + 256 + p2]`.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
