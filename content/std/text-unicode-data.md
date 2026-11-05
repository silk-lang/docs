Import as `unicode_data` with `import silk.text.unicode_data as unicode_data`.

Public declarations: 40.

::Anchor{id="dataVersion"}

## `dataVersion`

```silk
pub fn dataVersion() -> string<'static>
```

Returns the version of the Unicode Character Database that the tables come from, `"18.0.0"`.

::Anchor{id="longestDecomposition"}

## `longestDecomposition`

```silk
pub fn longestDecomposition() -> usize
```

Returns the largest number of scalars in the full canonical decomposition of one scalar.

::Anchor{id="generalCategory"}

## `generalCategory`

```silk
pub fn generalCategory(cp: u32) -> u32
```

Returns the General_Category of `cp` as a packed number. `GeneralCategory.of` gives the typed
value.

### Details
A value past U+10FFFF gets the Unicode default, 2.

::Anchor{id="combiningClass"}

## `combiningClass`

```silk
pub fn combiningClass(cp: u32) -> u32
```

Returns the Canonical_Combining_Class of `cp`, from 0 to 254.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="script"}

## `script`

```silk
pub fn script(cp: u32) -> u32
```

Returns the Script of `cp` as a big-endian ISO 15924 tag, such as `0x4c61746e` for `Latn`.

### Details
A value past U+10FFFF gets the Unicode default, 1517976186.

::Anchor{id="bidiClass"}

## `bidiClass`

```silk
pub fn bidiClass(cp: u32) -> u32
```

Returns the Bidi_Class of `cp` as a packed number. `BidiClass.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 3.

::Anchor{id="joiningType"}

## `joiningType`

```silk
pub fn joiningType(cp: u32) -> u32
```

Returns the Joining_Type of `cp` as a packed number. `JoiningType.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 5.

::Anchor{id="joiningGroup"}

## `joiningGroup`

```silk
pub fn joiningGroup(cp: u32) -> u32
```

Returns the Joining_Group of `cp` as a packed number. `JoiningGroup.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 82.

::Anchor{id="lineBreak"}

## `lineBreak`

```silk
pub fn lineBreak(cp: u32) -> u32
```

Returns the Line_Break class of `cp` as a packed number. `LineBreak.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 46.

::Anchor{id="eastAsianWidth"}

## `eastAsianWidth`

```silk
pub fn eastAsianWidth(cp: u32) -> u32
```

Returns the East_Asian_Width of `cp` as a packed number. `EastAsianWidth.of` gives the typed
value.

### Details
A value past U+10FFFF gets the Unicode default, 3.

::Anchor{id="graphemeBreak"}

## `graphemeBreak`

```silk
pub fn graphemeBreak(cp: u32) -> u32
```

Returns the Grapheme_Cluster_Break of `cp` as a packed number. `GraphemeBreak.of` gives the
typed value.

### Details
A value past U+10FFFF gets the Unicode default, 16.

::Anchor{id="wordBreak"}

## `wordBreak`

```silk
pub fn wordBreak(cp: u32) -> u32
```

Returns the Word_Break of `cp` as a packed number. `WordBreak.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 21.

::Anchor{id="sentenceBreak"}

## `sentenceBreak`

```silk
pub fn sentenceBreak(cp: u32) -> u32
```

Returns the Sentence_Break of `cp` as a packed number. `SentenceBreak.of` gives the typed value.

### Details
A value past U+10FFFF gets the Unicode default, 14.

::Anchor{id="verticalOrientation"}

## `verticalOrientation`

```silk
pub fn verticalOrientation(cp: u32) -> u32
```

Returns the Vertical_Orientation of `cp` as a packed number. `VerticalOrientation.of` gives the
typed value.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="indicConjunctBreak"}

## `indicConjunctBreak`

```silk
pub fn indicConjunctBreak(cp: u32) -> u32
```

Returns the Indic_Conjunct_Break of `cp` as a packed number. `IndicConjunctBreak.of` gives the
typed value.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="bidiPairedBracketType"}

## `bidiPairedBracketType`

```silk
pub fn bidiPairedBracketType(cp: u32) -> u32
```

Returns the Bidi_Paired_Bracket_Type of `cp`: 0 for none, 1 for an opening and 2 for a closing
bracket.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="bracketDelta"}

## `bracketDelta`

```silk
pub fn bracketDelta(cp: u32) -> u32
```

Returns the wrapping difference from `cp` to its Bidi_Paired_Bracket, or 0 when `cp` has none.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="mirrorDelta"}

## `mirrorDelta`

```silk
pub fn mirrorDelta(cp: u32) -> u32
```

Returns the wrapping difference from `cp` to its Bidi_Mirroring_Glyph, or 0 when `cp` has none.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="verticalDelta"}

## `verticalDelta`

```silk
pub fn verticalDelta(cp: u32) -> u32
```

Returns the wrapping difference from `cp` to its vertical presentation form, or 0 when `cp` has
none.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isEmoji"}

## `isEmoji`

```silk
pub fn isEmoji(cp: u32) -> u32
```

Returns 1 when `cp` has the Emoji property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isEmojiPresentation"}

## `isEmojiPresentation`

```silk
pub fn isEmojiPresentation(cp: u32) -> u32
```

Returns 1 when `cp` has the Emoji_Presentation property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isEmojiModifier"}

## `isEmojiModifier`

```silk
pub fn isEmojiModifier(cp: u32) -> u32
```

Returns 1 when `cp` has the Emoji_Modifier property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isEmojiModifierBase"}

## `isEmojiModifierBase`

```silk
pub fn isEmojiModifierBase(cp: u32) -> u32
```

Returns 1 when `cp` has the Emoji_Modifier_Base property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isEmojiComponent"}

## `isEmojiComponent`

```silk
pub fn isEmojiComponent(cp: u32) -> u32
```

Returns 1 when `cp` has the Emoji_Component property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isExtendedPictographic"}

## `isExtendedPictographic`

```silk
pub fn isExtendedPictographic(cp: u32) -> u32
```

Returns 1 when `cp` has the Extended_Pictographic property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isRegionalIndicator"}

## `isRegionalIndicator`

```silk
pub fn isRegionalIndicator(cp: u32) -> u32
```

Returns 1 when `cp` has the Regional_Indicator property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isVariationSelector"}

## `isVariationSelector`

```silk
pub fn isVariationSelector(cp: u32) -> u32
```

Returns 1 when `cp` has the Variation_Selector property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="isDefaultIgnorable"}

## `isDefaultIgnorable`

```silk
pub fn isDefaultIgnorable(cp: u32) -> u32
```

Returns 1 when `cp` has the Default_Ignorable_Code_Point property, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="scriptExtensions"}

## `scriptExtensions`

```silk
pub fn scriptExtensions(cp: u32) -> u32
```

Returns the index of the Script_Extensions set of `cp` in `scriptSetOffsets`.

### Details
A value past U+10FFFF gets the Unicode default, 177.

::Anchor{id="decomposition"}

## `decomposition`

```silk
pub fn decomposition(cp: u32) -> u32
```

Returns the index of the one-step canonical decomposition of `cp` in `decompositions`, or 0 when
`cp` has none. Hangul syllables are not in the table.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="composesAsSecond"}

## `composesAsSecond`

```silk
pub fn composesAsSecond(cp: u32) -> u32
```

Returns 1 when `cp` is the second scalar of a primary composite in `compositions`, otherwise 0.

### Details
A value past U+10FFFF gets the Unicode default, 0.

::Anchor{id="lineBreakInfo"}

## `lineBreakInfo`

```silk
pub fn lineBreakInfo(cp: u32) -> u32
```

Returns the line breaking record of `cp`: the resolved Line_Break class in bits 0 to 5 and the
flags that `silk.text.line_break` reads in bits 6 to 14.

### Details
A value past U+10FFFF gets the Unicode default, 1026.

::Anchor{id="graphemeInfo"}

## `graphemeInfo`

```silk
pub fn graphemeInfo(cp: u32) -> u32
```

Returns the grapheme record of `cp`: Grapheme_Cluster_Break in bits 0 to 4, Indic_Conjunct_Break
in bits 5 and 6, and Extended_Pictographic in bit 7.

### Details
A value past U+10FFFF gets the Unicode default, 16.

::Anchor{id="be16"}

## `be16`

```silk
pub fn be16(data: &[u8], index: usize) -> u32
```

Returns the big-endian unsigned 16-bit number at byte `index` of `data`.

::Anchor{id="be32"}

## `be32`

```silk
pub fn be32(data: &[u8], index: usize) -> u32
```

Returns the big-endian unsigned 32-bit number at byte `index` of `data`.

::Anchor{id="linePairs"}

## `linePairs`

```silk
pub fn linePairs() -> &'static [u8]
```

Returns the untailored line breaking decision for each pair of `LineBreak` classes, indexed by
`left.tableIndex() * classes + right.tableIndex()`: 0 when the rules must decide, 1 for no
break, 2 for a break.

::Anchor{id="decompositions"}

## `decompositions`

```silk
pub fn decompositions() -> &'static [u8]
```

Returns the one-step canonical decompositions as pairs of big-endian 32-bit scalars. Entry 0 is
empty, and a second scalar of 0 marks a singleton decomposition.

::Anchor{id="compositions"}

## `compositions`

```silk
pub fn compositions() -> &'static [u8]
```

Returns the primary composites as rows of three big-endian 32-bit scalars, sorted by first and
second scalar: first, second and composite. Hangul syllables are not in the table.

::Anchor{id="scriptSetOffsets"}

## `scriptSetOffsets`

```silk
pub fn scriptSetOffsets() -> &'static [u8]
```

Returns the start of each Script_Extensions set in `scriptSetMembers` as big-endian 32-bit
numbers. Set `index` covers members `offsets[index]` up to `offsets[index + 1]`.

::Anchor{id="scriptSetMembers"}

## `scriptSetMembers`

```silk
pub fn scriptSetMembers() -> &'static [u8]
```

Returns the scripts of all Script_Extensions sets as big-endian 32-bit ISO 15924 tags.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
