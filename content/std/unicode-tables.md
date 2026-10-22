Generated Unicode data tables for canonical normalization. `silk.unicode` uses these tables.

## When to use
Use `silk.unicode` in application code. Use this module only to read the raw normalization data,
for example in a custom text algorithm.

## Details
The data comes from Unicode 17.0.0. The tables are generated and stored as packed byte strings.
The compiler gives no special treatment to this module. A later generation can change the table
layout.

## Gotchas
A lookup result of 0 means "no value". It is not the scalar U+0000. Hangul syllables decompose
and compose by a formula, so they are not in these tables.

## Examples
### Read the canonical decomposition of é
```silk
import silk.unicode_tables { UnicodeTables }

pub fn main() -> i32 {
  // U+00E9 decomposes to U+0065 and U+0301.
  let decomposition = UnicodeTables.canonicalDecomposition(233)
  if decomposition.first != 101 || decomposition.second != 769 {
    return 1
  }
  return 0
}
```

Import as `UnicodeTables` with `import silk.unicode_tables { UnicodeTables }`.

Public declarations: 3.

::Anchor{id="UnicodeTables"}

## `UnicodeTables`

```silk
pub struct UnicodeTables
```

The owner type of the table lookups. It has no fields and is never constructed.

::Anchor{id="UnicodeTables.impl"}

## Implementation `UnicodeTables`

```silk
impl UnicodeTables
```

::Anchor{id="UnicodeTables.impl.dataVersion"}

### Associated function `dataVersion`

```silk
pub fn dataVersion() -> string<'static>
```

Returns the Unicode version of the table data, such as `"17.0.0"`.

::Anchor{id="UnicodeTables.impl.maximumDecompositionLength"}

### Associated function `maximumDecompositionLength`

```silk
pub fn maximumDecompositionLength() -> usize
```

Returns the maximum number of scalars in the full canonical decomposition of one scalar.

::Anchor{id="UnicodeTables.impl.combiningClass"}

### Associated function `combiningClass`

```silk
pub fn combiningClass(scalar: u32) -> u32
```

Returns the canonical combining class of `scalar`. Returns 0 for a starter or an unassigned
code point.

::Anchor{id="UnicodeTables.impl.canonicalDecomposition"}

### Associated function `canonicalDecomposition`

```silk
pub fn canonicalDecomposition(scalar: u32) -> Decomposition
```

Returns the canonical decomposition of `scalar`, as one or two scalars.

#### Gotchas

If `scalar` has no decomposition in the table, both fields of the result are 0. Hangul
syllables are not in the table.

::Anchor{id="UnicodeTables.impl.canonicalComposition"}

### Associated function `canonicalComposition`

```silk
pub fn canonicalComposition(first: u32, second: u32) -> u32
```

Returns the primary composite of the pair `first`, `second`. Returns 0 if the pair does not
compose.

#### Details

Pairs that Unicode excludes from composition are not in the table.

#### Gotchas

Hangul syllables are not in the table.

::Anchor{id="Decomposition"}

## `Decomposition`

```silk
pub struct Decomposition
```

The canonical decomposition of one scalar. A field of 0 means "no scalar".

::Anchor{id="Decomposition.first"}

### Field `first`

```silk
pub first: u32
```

The first scalar of the decomposition, or 0 if the scalar has no decomposition.

::Anchor{id="Decomposition.second"}

### Field `second`

```silk
pub second: u32
```

The second scalar of the decomposition, or 0 if the decomposition has one scalar.

::Anchor{id="PairRecord"}

## `PairRecord`

```silk
pub struct PairRecord
```

One table record: a scalar and its two-scalar canonical decomposition.

::Anchor{id="PairRecord.composed"}

### Field `composed`

```silk
pub composed: u32
```

The scalar that decomposes to `first` and `second`.

::Anchor{id="PairRecord.first"}

### Field `first`

```silk
pub first: u32
```

The first scalar of the decomposition.

::Anchor{id="PairRecord.second"}

### Field `second`

```silk
pub second: u32
```

The second scalar of the decomposition.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
