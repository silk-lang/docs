Line break opportunities: the Unicode Line Breaking Algorithm (UAX #14) with CSS tailoring, with
data from Unicode 18.0.0.

## When to use
Use [`breaks`](#breaks) to find where text can wrap onto a new line. Use [`breaksWithDictionary`](#breaksWithDictionary) when the
text can contain Thai, Lao, Khmer or Myanmar, which need a word dictionary.

## Details
[`LineOptions.make`](#LineOptions.impl.make) selects untailored UAX #14 with manual soft hyphens. The options follow the
CSS Text Module Level 3 properties `line-break` (`auto`, `loose`, `normal`, `strict`,
`anywhere`), `word-break` (`normal`, `break-all`, `keep-all`) and `hyphens` (`manual`, `none`),
with the CSS CJK punctuation rules for Japanese and Chinese. Mandatory breaks always win.
`anywhere` breaks between grapheme clusters and ignores `word-break`.

The functions take a `string` and report byte offsets. The result is appended to a caller-owned
list: sorted, unique, and ending with a mandatory break at the end of the text. The scan decodes
each scalar once and uses constant extra storage.

## Gotchas
There is no automatic hyphenation. Only soft hyphens (U+00AD) give hyphenated breaks.

## Examples
### Find where a sentence can wrap
```silk
import silk.collections.list { List }
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.text.line_break
import silk.text.line_break { BreakKind, BreakOpportunity, LineOptions }

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut opportunities = List<BreakOpportunity>.make()
  run line_break.breaks("Hello, world!\nBye", LineOptions.make(), &mut opportunities)
    |> Effect.provideMut<Allocator>(&mut allocator)
  // Lines can end after "Hello, " and must end after the newline and at the end.
  let offsets = opportunities.asSlice()
  if offsets.length != 3 || offsets[0].offset != 7 || offsets[1].kind != BreakKind.Mandatory {
    return 1
  }
  return 0
}
```

Import as `line_break` with `import silk.text.line_break as line_break`.

Public declarations: 10.

::Anchor{id="BreakKind"}

## `BreakKind`

```silk
pub enum BreakKind
```

How a line may break at a [`BreakOpportunity`](#BreakOpportunity).

::Anchor{id="BreakKind.Allowed"}

### `Allowed`

```silk
Allowed
```

An optional break: a line may end here.

::Anchor{id="BreakKind.Mandatory"}

### `Mandatory`

```silk
Mandatory
```

A mandatory break: a line must end here, after a hard line break character such as LF, and at
the end of the text.

::Anchor{id="BreakKind.Hyphenated"}

### `Hyphenated`

```silk
Hyphenated
```

An optional break after a soft hyphen (U+00AD). A renderer that breaks here shows a hyphen.

::Anchor{id="BreakOpportunity"}

## `BreakOpportunity`

```silk
pub struct BreakOpportunity
```

A place where a line may or must end, as [`breaks`](#breaks) gives it.

::Anchor{id="BreakOpportunity.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset where the line ends. The next line starts at this offset.

::Anchor{id="BreakOpportunity.kind"}

### Field `kind`

```silk
pub kind: BreakKind
```

Whether the break is optional, mandatory, or hyphenated.

::Anchor{id="BreakOpportunity.impl.Copy"}

## Implementation `Copy for BreakOpportunity`

```silk
impl Copy for BreakOpportunity
```

::Anchor{id="LineBreakMode"}

## `LineBreakMode`

```silk
pub enum LineBreakMode
```

The strictness of line breaking around CJK punctuation, as the CSS `line-break` property sets
it.

::Anchor{id="LineBreakMode.Auto"}

### `Auto`

```silk
Auto
```

The default. Untailored UAX #14, or [`LineBreakMode.Normal`](#LineBreakMode.Normal) when the language is Japanese or
Chinese.

::Anchor{id="LineBreakMode.Loose"}

### `Loose`

```silk
Loose
```

The least strict rules, for narrow columns: breaks are allowed before small kana, iteration
marks, and some punctuation.

::Anchor{id="LineBreakMode.Normal"}

### `Normal`

```silk
Normal
```

The common CJK rules: breaks are allowed before small kana and the prolonged sound mark.

::Anchor{id="LineBreakMode.Strict"}

### `Strict`

```silk
Strict
```

The most strict rules: no break before small kana, iteration marks, or the prolonged sound
mark.

::Anchor{id="LineBreakMode.Anywhere"}

### `Anywhere`

```silk
Anywhere
```

A break is allowed between any two grapheme clusters, except before a mandatory break.

::Anchor{id="WordBreakMode"}

## `WordBreakMode`

```silk
pub enum WordBreakMode
```

The word breaking rules, as the CSS `word-break` property sets them.

::Anchor{id="WordBreakMode.Normal"}

### `Normal`

```silk
Normal
```

The default rules: breaks between words, and between CJK characters.

::Anchor{id="WordBreakMode.BreakAll"}

### `BreakAll`

```silk
BreakAll
```

A break is also allowed inside words, between grapheme clusters of letters and digits.

::Anchor{id="WordBreakMode.KeepAll"}

### `KeepAll`

```silk
KeepAll
```

No break between letters and digits, also in CJK text. Breaks stay at spaces and punctuation.

::Anchor{id="Hyphens"}

## `Hyphens`

```silk
pub enum Hyphens
```

The treatment of soft hyphens (U+00AD), as the CSS `hyphens` property sets it.

::Anchor{id="Hyphens.Manual"}

### `Manual`

```silk
Manual
```

A soft hyphen gives a [`BreakKind.Hyphenated`](#BreakKind.Hyphenated) break opportunity.

::Anchor{id="Hyphens.None"}

### `None`

```silk
None
```

A soft hyphen gives no break opportunity.

::Anchor{id="LineLanguage"}

## `LineLanguage`

```silk
pub enum LineLanguage
```

The content language that selects language-specific line breaking rules.

::Anchor{id="LineLanguage.Default"}

### `Default`

```silk
Default
```

No language-specific rules.

::Anchor{id="LineLanguage.Japanese"}

### `Japanese`

```silk
Japanese
```

Japanese: the CSS CJK punctuation rules apply.

::Anchor{id="LineLanguage.Chinese"}

### `Chinese`

```silk
Chinese
```

Chinese: the CSS CJK punctuation rules apply.

::Anchor{id="LineOptions"}

## `LineOptions`

```silk
pub struct LineOptions
```

The settings for [`breaks`](#breaks), which follow the CSS Text Module Level 3 properties.

### Details

[`LineOptions.make`](#LineOptions.impl.make) gives the untailored UAX #14 rules with manual soft hyphens. Set the
fields to tailor the rules: for example, set `language` to [`LineLanguage.Japanese`](#LineLanguage.Japanese) for the
CSS CJK punctuation rules.

::Anchor{id="LineOptions.lineBreak"}

### Field `lineBreak`

```silk
pub lineBreak: LineBreakMode
```

The strictness of breaking around CJK punctuation, as CSS `line-break` sets it.

::Anchor{id="LineOptions.wordBreak"}

### Field `wordBreak`

```silk
pub wordBreak: WordBreakMode
```

The word breaking rules, as CSS `word-break` sets them.

::Anchor{id="LineOptions.hyphens"}

### Field `hyphens`

```silk
pub hyphens: Hyphens
```

The treatment of soft hyphens, as CSS `hyphens` sets it.

::Anchor{id="LineOptions.language"}

### Field `language`

```silk
pub language: LineLanguage
```

The content language.

::Anchor{id="LineOptions.impl.Copy"}

## Implementation `Copy for LineOptions`

```silk
impl Copy for LineOptions
```

::Anchor{id="LineOptions.impl"}

## Implementation `LineOptions`

```silk
impl LineOptions
```

::Anchor{id="LineOptions.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Self
```

Returns the untailored UAX #14 settings: [`LineBreakMode.Auto`](#LineBreakMode.Auto), [`WordBreakMode.Normal`](#WordBreakMode.Normal),
[`Hyphens.Manual`](#Hyphens.Manual) and [`LineLanguage.Default`](#LineLanguage.Default).

::Anchor{id="DictionarySegmenter"}

## `DictionarySegmenter`

```silk
pub interface DictionarySegmenter
```

A provider of word boundaries for scripts that do not separate words with spaces, such as Thai.

### When to use

Implement `DictionarySegmenter` to give [`breaksWithDictionary`](#breaksWithDictionary) the word boundaries of Thai,
Lao, Khmer or Myanmar text. `IcuDictionary` in `silk.text.word_dictionary` implements it with
the ICU dictionaries.

### Details

The line breaker asks the provider once per text, and uses its boundaries only between two
characters of the Line_Break class `SA` (South East Asian).

::Anchor{id="DictionarySegmenter.breaks"}

### Operation `breaks`

```silk
effect fn breaks(self: &Self, text: string, output: &mut List<usize>) -> ()
    ! OutOfMemoryError
    ? &mut Allocator
```

Appends the word boundaries of `text` to `output`, as sorted byte offsets that include 0 and
`text`'s byte length once each.

#### Details

The caller clears `output` first. A provider must not allocate, except to grow `output`.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot grow `output`.

::Anchor{id="breaks"}

## `breaks`

```silk
pub effect fn breaks(text: string, options: LineOptions, output: &mut List<BreakOpportunity>) -> ()
  ! OutOfMemoryError
  ? &mut Allocator
```

Appends the line break opportunities of `text` to `output`.

### When to use

Use `breaks` to wrap text into lines: a line can end at each [`BreakOpportunity`](#BreakOpportunity), and must end
at each [`BreakKind.Mandatory`](#BreakKind.Mandatory) one. Measure the text between opportunities to choose where to
wrap.

### Details

The rules are the Unicode Line Breaking Algorithm (UAX #14) for Unicode 18.0.0, with the CSS
Text Module Level 3 tailoring that `options` selects. The opportunities are sorted by offset,
each offset appears once, and the last one is a mandatory break at `text`'s byte length (offset
0 for empty text). A break opportunity before a space is moved after the spaces, so lines end
with their trailing spaces. The function does not clear `output`, so clear it first to reuse
its storage.

### Errors

- `OutOfMemoryError` if the `Allocator` cannot grow `output`.

### Gotchas

Thai, Lao, Khmer and Myanmar text has no spaces between words, so without a dictionary each run
of those characters is one unbreakable word. Use [`breaksWithDictionary`](#breaksWithDictionary) for that text. There
is no automatic hyphenation: only soft hyphens give hyphenated breaks.

::Anchor{id="breaksWithDictionary"}

## `breaksWithDictionary`

```silk
pub effect fn breaksWithDictionary<D: DictionarySegmenter>(
  text: string,
  options: LineOptions,
  dictionary: &D,
  output: &mut List<BreakOpportunity>,
) -> ()
  ! OutOfMemoryError
  ? &mut Allocator
```

Appends the line break opportunities of `text` to `output`, with the word boundaries of
`dictionary` for Thai, Lao, Khmer and Myanmar text.

### Details

The result is the result of [`breaks`](#breaks), plus a break opportunity at each dictionary word
boundary between two characters of the Line_Break class `SA` (South East Asian). The other
rules keep precedence: no dictionary boundary is used next to a mark, a joiner, punctuation, or
a mandatory break. With [`LineBreakMode.Anywhere`](#LineBreakMode.Anywhere) or [`WordBreakMode.BreakAll`](#WordBreakMode.BreakAll), the dictionary
is not asked. The function does not clear `output`, so clear it first to reuse its storage.

### Errors

- `OutOfMemoryError` if the `Allocator` cannot grow `output` or the boundary list.

Category: Text.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
