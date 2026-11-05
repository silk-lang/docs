Unicode scripts as ISO 15924 values, and the Script and Script_Extensions properties, with data
from Unicode 18.0.0.

## When to use
Use [`Script.of`](#Script.impl.of) to find the script of a character, such as Latin or Arabic. Use
[`Script.extensions`](#Script.impl.extensions) when a character is shared by several scripts, such as the Arabic comma.
Use [`Script.parse`](#Script.impl.parse) to read a four-letter script code from text.

## Details
A [`Script`](#Script) holds a big-endian ISO 15924 tag: `Latn` is `0x4c61746e`. The lookups take a code
point as a `u32` and do not allocate. A code point with no script, or a value past U+10FFFF,
gets `Zzzz` (Unknown). Common characters get `Zyyy` and inherited marks get `Zinh`.

## Examples
### Read the script of a character
```silk
import silk.core.option { Option }
import silk.text.unicode_script { Script }

pub fn main() -> i32 {
  let latin = Script.parse("Latn") |> Option<Script>.unwrapOr(Script.unknown())
  let letter = Script.of(0x41)
  if &letter != &latin {
    return 1
  }
  // U+060C ARABIC COMMA is shared by Arabic, Syriac, Thaana and other scripts.
  let arabic = Script.parse("Arab") |> Option<Script>.unwrapOr(Script.unknown())
  if !Script.extensions(0x60c).contains(arabic) {
    return 1
  }
  return 0
}
```

Import as `Script` with `import silk.text.unicode_script { Script }`.

Public declarations: 2.

::Anchor{id="Script"}

## `Script`

```silk
pub struct Script
```

A Unicode script, held as its big-endian ISO 15924 tag.

### Details

`value` holds the four ASCII letters of the tag, first letter in the highest byte: `Latn` is
`0x4c61746e`. [`Script.of`](#Script.impl.of) gives the script of a code point. Two scripts are equal when their
tags are equal.

::Anchor{id="Script.value"}

### Field `value`

```silk
pub value: u32
```

The big-endian ISO 15924 tag, such as `0x4c61746e` for `Latn`.

::Anchor{id="Script.impl.Copy"}

## Implementation `Copy for Script`

```silk
impl Copy for Script
```

::Anchor{id="Script.impl.Equal"}

## Implementation `Equal for Script`

```silk
impl Equal for Script
```

::Anchor{id="Script.impl.Equal.equals"}

### Operation `equals`

```silk
equals: Script.same
```

::Anchor{id="Script.impl"}

## Implementation `Script`

```silk
impl Script
```

::Anchor{id="Script.impl.unknown"}

### Associated function `unknown`

```silk
pub fn unknown() -> Script
```

Returns `Zzzz` (Unknown), the script of characters that Unicode does not assign to a script.

::Anchor{id="Script.impl.common"}

### Associated function `common`

```silk
pub fn common() -> Script
```

Returns `Zyyy` (Common), the script of characters that several scripts use, such as digits and
punctuation.

::Anchor{id="Script.impl.inherited"}

### Associated function `inherited`

```silk
pub fn inherited() -> Script
```

Returns `Zinh` (Inherited), the script of combining marks that take the script of their base
character.

::Anchor{id="Script.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> Script
```

Returns the Unicode `Script` property of the code point `cp`. A code point with no script, or
a value past U+10FFFF, gives [`Script.unknown`](#Script.impl.unknown).

::Anchor{id="Script.impl.extensions"}

### Associated function `extensions`

```silk
pub fn extensions(cp: u32) -> ScriptSet
```

Returns the Unicode `Script_Extensions` property of the code point `cp`: each script that
uses the character.

#### Details

A character without an explicit `Script_Extensions` value gets the set with only its
[`Script.of`](#Script.impl.of) value. The set is sorted by tag and borrows static data, so the call does not
allocate.

::Anchor{id="Script.impl.fromIso15924Tag"}

### Associated function `fromIso15924Tag`

```silk
pub fn fromIso15924Tag(value: u32) -> Option<Script>
```

Returns the script for the ISO 15924 tag `value`, or `None` if `value` is 0.

#### Details

The letter case is normalized, so `0x4c41544e` (`LATN`) gives `Latn`. A value that is not
four ASCII letters gives [`Script.unknown`](#Script.impl.unknown). Historical and variant tags map to the script
that Unicode uses for their characters: `Hans` and `Hant` give `Hani`, `Jamo` gives `Hang`,
`Latf` and `Latg` give `Latn`, `Cyrs` gives `Cyrl`, `Geok` gives `Geor`, `Aran` gives `Arab`,
and `Syre`, `Syrj` and `Syrn` give `Syrc`.

::Anchor{id="Script.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Option<Script>
```

Returns the script for the ISO 15924 code `text`, such as `"Latn"`, or `None` for empty text.

#### Details

The function reads the first four bytes of `text`, pads a shorter code with spaces, and
normalizes it as [`Script.fromIso15924Tag`](#Script.impl.fromIso15924Tag) does: `"latn"` gives `Latn`, and a code that is
not four ASCII letters gives [`Script.unknown`](#Script.impl.unknown).

::Anchor{id="ScriptSet"}

## `ScriptSet`

```silk
pub struct ScriptSet
```

A set of scripts that borrows static data, as [`Script.extensions`](#Script.impl.extensions) gives it.

### Details

The scripts are sorted by ISO 15924 tag. The set is never empty. It is `Copy` and does not own
storage.

::Anchor{id="ScriptSet.impl.Copy"}

## Implementation `Copy for ScriptSet`

```silk
impl Copy for ScriptSet
```

::Anchor{id="ScriptSet.impl"}

## Implementation `ScriptSet`

```silk
impl ScriptSet
```

::Anchor{id="ScriptSet.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of scripts in the set. It is at least 1.

::Anchor{id="ScriptSet.impl.get"}

### Method `get`

```silk
pub fn get(self: &Self, index: usize) -> Option<Script>
```

Returns the script at position `index`, or `None` if `index` is not less than
[`ScriptSet.length`](#ScriptSet.impl.length). The scripts are sorted by tag.

::Anchor{id="ScriptSet.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, script: Script) -> bool
```

Returns true if `script` is in the set.

Category: Text.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
