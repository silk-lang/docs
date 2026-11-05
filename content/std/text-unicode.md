Unicode canonical normalization (NFC and NFD), canonical composition, and the Boolean and mapping
character properties, with data from Unicode 18.0.0.

## When to use
Use normalization where text with different encodings of the same characters must compare equal,
such as user names or file names from different systems. Use [`Unicode.normalizeNfc`](#Unicode.impl.normalizeNfc) for
storage and comparison. Use [`Unicode.normalizeNfd`](#Unicode.impl.normalizeNfd) when a consumer needs the decomposed form.
Use the property functions, such as [`Unicode.isEmoji`](#Unicode.impl.isEmoji) or [`Unicode.mirror`](#Unicode.impl.mirror), to classify one
code point.

## Details
Normalization is explicit. `string` equality compares the exact UTF-8 bytes and does not
normalize. Each normalization function returns a new [`String`](/docs/std/text-string#String) and needs an `Allocator`. The
results are the same on each target. [`Unicode.dataVersion`](#Unicode.impl.dataVersion) gives the Unicode version of the
data. The property functions take a code point as a `u32`, do not allocate, and give the Unicode
default for a value past U+10FFFF.

The typed properties, such as the general category, are in `silk.text.unicode_properties`.
Scripts are in `silk.text.unicode_script`.

## Gotchas
This module implements canonical normalization only. It does not implement compatibility
normalization (NFKC or NFKD), locale-sensitive comparison, or case folding. Grapheme
segmentation is in `silk.text.segmentation`.

## Examples
### Make two encodings of the same text compare equal
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.text.string { String }
import silk.text.unicode { Unicode }

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()

  // "e" followed by a combining acute accent, and the precomposed "é".
  let composed = run Unicode.normalizeNfc("e\u{301}")
    |> Effect.provideMut<Allocator>(&mut allocator)
  let decomposed = run Unicode.normalizeNfd("é") |> Effect.provideMut<Allocator>(&mut allocator)
  if String.view(&composed) != "é" || String.view(&decomposed) != "e\u{301}" {
    return 1
  }
  return 0
}
```

Import as `Unicode` with `import silk.text.unicode { Unicode }`.

Public declarations: 2.

::Anchor{id="Decomposed"}

## `Decomposed`

```silk
pub union Decomposed
```

One step of a canonical decomposition, as [`Unicode.decompose`](#Unicode.impl.decompose) gives it.

::Anchor{id="Decomposed.Singleton"}

### `Singleton`

```silk
Singleton
```

The code point decomposes to one other scalar, such as U+212B ANGSTROM SIGN to U+00C5.

::Anchor{id="Decomposed.Singleton.scalar"}

#### Field `scalar`

```silk
pub scalar: u32
```

The scalar of the decomposition.

::Anchor{id="Decomposed.Pair"}

### `Pair`

```silk
Pair
```

The code point decomposes to two scalars, such as U+00E9 to U+0065 and U+0301.

::Anchor{id="Decomposed.Pair.first"}

#### Field `first`

```silk
pub first: u32
```

The first scalar, a starter or a scalar that decomposes further.

::Anchor{id="Decomposed.Pair.second"}

#### Field `second`

```silk
pub second: u32
```

The second scalar, which does not decompose further.

::Anchor{id="Decomposed.impl.Copy"}

## Implementation `Copy for Decomposed`

```silk
impl Copy for Decomposed
```

::Anchor{id="Unicode"}

## `Unicode`

```silk
pub struct Unicode
```

The owner type of the Unicode normalization, composition and character property operations. It
has no fields and is never constructed.

### When to use
Use normalization where text with different encodings of the same characters must compare
equal, such as user names or file names from different systems. Use [`Unicode.normalizeNfc`](#Unicode.impl.normalizeNfc)
for storage and comparison. Use [`Unicode.normalizeNfd`](#Unicode.impl.normalizeNfd) when a consumer needs the decomposed
form. Use the property functions to classify one code point.

### Details
Normalization is explicit. `string` equality compares the exact UTF-8 bytes and does not
normalize. The results are the same on each target. The property functions take a code point as
a `u32`, do not allocate, and give the Unicode default for a value past U+10FFFF. The data is
from Unicode 18.0.0.

### Gotchas
Only canonical normalization is implemented. There is no compatibility normalization (NFKC or
NFKD), locale-sensitive comparison, or case folding.

::Anchor{id="Unicode.impl"}

## Implementation `Unicode`

```silk
impl Unicode
```

::Anchor{id="Unicode.impl.dataVersion"}

### Associated function `dataVersion`

```silk
pub fn dataVersion() -> string<'static>
```

Returns the Unicode version of the character data, `"18.0.0"`.

#### Details

A later version of the data can change normalization results and properties for new
characters.

::Anchor{id="Unicode.impl.longestDecomposition"}

### Associated function `longestDecomposition`

```silk
pub fn longestDecomposition() -> usize
```

Returns the maximum number of scalars in the full canonical decomposition of one scalar.

::Anchor{id="Unicode.impl.decompose"}

### Associated function `decompose`

```silk
pub fn decompose(cp: u32) -> Option<Decomposed>
```

Returns the one-step canonical decomposition of the code point `cp`, or `None` if `cp` has no
canonical decomposition.

#### Details

The result is one step, not the full decomposition: decompose each result scalar again for
NFD. Hangul syllables decompose by the UAX #15 formula into a leading and vowel pair, or an LV
syllable and trailing jamo. A value past U+10FFFF gives `None`.

::Anchor{id="Unicode.impl.compose"}

### Associated function `compose`

```silk
pub fn compose(first: u32, second: u32) -> Option<u32>
```

Returns the primary composite of the code points `first` and `second`, or `None` if they do
not compose.

#### Details

The result is the canonical composition that NFC applies to a starter and a following
unblocked scalar. Composition exclusions never compose. Hangul jamo compose by the UAX #15
formula.

::Anchor{id="Unicode.impl.composesAsSecond"}

### Associated function `composesAsSecond`

```silk
pub fn composesAsSecond(cp: u32) -> bool
```

Returns true if `cp` is the second scalar of a table composition, so [`Unicode.compose`](#Unicode.impl.compose) can
give a result for it. Hangul jamo, which compose by formula, give false.

#### When to use

Use `composesAsSecond` as a fast filter in a hot loop before a call to [`Unicode.compose`](#Unicode.impl.compose).

::Anchor{id="Unicode.impl.isMark"}

### Associated function `isMark`

```silk
pub fn isMark(cp: u32) -> bool
```

Returns true if the general category of `cp` is a mark: `Mn`, `Mc` or `Me`.

::Anchor{id="Unicode.impl.isEmoji"}

### Associated function `isEmoji`

```silk
pub fn isEmoji(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Emoji` property.

#### Gotchas

Digits, `#` and `*` have the property, because they start keycap sequences. Use
[`Unicode.isEmojiPresentation`](#Unicode.impl.isEmojiPresentation) to find characters that show as emoji by default.

::Anchor{id="Unicode.impl.isEmojiPresentation"}

### Associated function `isEmojiPresentation`

```silk
pub fn isEmojiPresentation(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Emoji_Presentation` property: it shows as an emoji by
default, without a variation selector.

::Anchor{id="Unicode.impl.isEmojiModifier"}

### Associated function `isEmojiModifier`

```silk
pub fn isEmojiModifier(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Emoji_Modifier` property, as the skin tone modifiers
U+1F3FB to U+1F3FF do.

::Anchor{id="Unicode.impl.isEmojiModifierBase"}

### Associated function `isEmojiModifierBase`

```silk
pub fn isEmojiModifierBase(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Emoji_Modifier_Base` property: an emoji modifier can
follow it.

::Anchor{id="Unicode.impl.isEmojiComponent"}

### Associated function `isEmojiComponent`

```silk
pub fn isEmojiComponent(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Emoji_Component` property: it can be part of an emoji
sequence, such as a keycap or a tag.

::Anchor{id="Unicode.impl.isExtendedPictographic"}

### Associated function `isExtendedPictographic`

```silk
pub fn isExtendedPictographic(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Extended_Pictographic` property, which grapheme and
line segmentation read for emoji sequences.

::Anchor{id="Unicode.impl.isRegionalIndicator"}

### Associated function `isRegionalIndicator`

```silk
pub fn isRegionalIndicator(cp: u32) -> bool
```

Returns true if `cp` is a regional indicator, U+1F1E6 to U+1F1FF. Two regional indicators make
a flag.

::Anchor{id="Unicode.impl.isVariationSelector"}

### Associated function `isVariationSelector`

```silk
pub fn isVariationSelector(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Variation_Selector` property, such as U+FE0F.

::Anchor{id="Unicode.impl.isDefaultIgnorable"}

### Associated function `isDefaultIgnorable`

```silk
pub fn isDefaultIgnorable(cp: u32) -> bool
```

Returns true if `cp` has the Unicode `Default_Ignorable_Code_Point` property: a renderer
without special support shows nothing for it.

::Anchor{id="Unicode.impl.mirror"}

### Associated function `mirror`

```silk
pub fn mirror(cp: u32) -> u32
```

Returns the Unicode `Bidi_Mirroring_Glyph` of `cp`, such as `)` for `(`, or `cp` itself if it
has none.

::Anchor{id="Unicode.impl.bidiPairedBracket"}

### Associated function `bidiPairedBracket`

```silk
pub fn bidiPairedBracket(cp: u32) -> u32
```

Returns the Unicode `Bidi_Paired_Bracket` of `cp`, or `cp` itself if it is not a paired
bracket.

#### Details

`BidiPairedBracketType.of` in `silk.text.unicode_properties` says if `cp` opens or closes.

::Anchor{id="Unicode.impl.verticalForm"}

### Associated function `verticalForm`

```silk
pub fn verticalForm(cp: u32) -> u32
```

Returns the vertical presentation form of `cp`, such as U+FE10 for U+FF0C FULLWIDTH COMMA, or
`cp` itself if it has none.

#### Details

The map joins the single-character `<vertical>` decompositions with their `<wide>` sources,
so ASCII punctuation maps through its fullwidth form. U+FE4F WAVY LOW LINE maps to U+FE34.

#### Gotchas

This is a presentation map, not the UAX #50 orientation. Use `VerticalOrientation.of` in
`silk.text.unicode_properties` for the orientation.

::Anchor{id="Unicode.impl.normalizeNfd"}

### Associated function `normalizeNfd`

```silk
pub effect fn normalizeNfd(value: string) -> String
    ! OutOfMemoryError
    ? &mut Allocator
```

Returns the Normalization Form D (NFD) of `value`: each character fully decomposed, with marks
in canonical order.

#### When to use

Use `normalizeNfd` when a consumer needs base characters and marks as separate scalars. Use
[`Unicode.normalizeNfc`](#Unicode.impl.normalizeNfc) for storage and comparison.

#### Details

The function does not change `value`. Two canonically equivalent inputs give equal output.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage for the result.

::Anchor{id="Unicode.impl.normalizeNfc"}

### Associated function `normalizeNfc`

```silk
pub effect fn normalizeNfc(value: string) -> String
    ! OutOfMemoryError
    ? &mut Allocator
```

Returns the Normalization Form C (NFC) of `value`: decomposed, put in canonical order, and
then composed again.

#### When to use

Use `normalizeNfc` before you store or compare text that can come in different encodings. Most
text from keyboards and the web is already NFC.

#### Details

The function does not change `value`. Two canonically equivalent inputs give equal output.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage for the result.

Category: Text.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
