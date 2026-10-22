Generated canonical-normalization data for the `silk.unicode` public façade.

## When to use
Application code should normally call `silk.unicode` rather than this backing module. These
declarations are public so the ordinary Silk normalization implementation can read the pinned
data without compiler privilege.

## Details
The tables come from Unicode 17.0.0, are packed as big-endian byte strings, and are searched
with ordinary Silk functions. Regeneration may change their representation and record layout;
the compiler gives neither this module nor its declaration names special treatment.

## Gotchas
A zero lookup result is a sentinel, not Unicode scalar U+0000. Hangul decomposition and
composition are algorithmic and are not present in these tables.

## Examples
### Read the canonical decomposition of é
```silk
import silk.unicode_tables { UnicodeTables }

pub fn main() -> i32 {
  let decomposition = UnicodeTables.canonicalDecomposition(233)
  if decomposition.first != 101 || decomposition.second != 769 {
    return 0
  }
  return 42
}
```

Import as `UnicodeTables` with `import silk.unicode_tables { UnicodeTables }`.

Public declarations: 3.

::Anchor{id="UnicodeTables"}

## `UnicodeTables`

```silk
pub struct UnicodeTables
```

The owner of the generated Unicode lookup operations.

### Details

This struct carries no data and is never constructed by the library. Every generated lookup is
an inherent member declared in `impl UnicodeTables`, reached through
`import silk.unicode_tables { UnicodeTables }`.

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

Returns the Unicode data version that defines all lookup results in this module.

::Anchor{id="UnicodeTables.impl.maximumDecompositionLength"}

### Associated function `maximumDecompositionLength`

```silk
pub fn maximumDecompositionLength() -> usize
```

Returns the longest full canonical decomposition of one scalar in these tables.

::Anchor{id="UnicodeTables.impl.combiningClass"}

### Associated function `combiningClass`

```silk
pub fn combiningClass(scalar: u32) -> u32
```

Returns a scalar's canonical combining class, or zero for a starter or unknown value.

::Anchor{id="UnicodeTables.impl.canonicalDecomposition"}

### Associated function `canonicalDecomposition`

```silk
pub fn canonicalDecomposition(scalar: u32) -> Decomposition
```

Returns the canonical decomposition of a scalar, or both components zero when it has none.
Hangul syllables decompose algorithmically and are absent from this table by design.

::Anchor{id="UnicodeTables.impl.canonicalComposition"}

### Associated function `canonicalComposition`

```silk
pub fn canonicalComposition(first: u32, second: u32) -> u32
```

Composes a starter and a following scalar, or returns zero when the pair does not compose.

#### Details

Excluded composition pairs are absent. A nonzero result is always a primary composite.

#### Gotchas

Hangul composition is algorithmic and is not included in this lookup.

::Anchor{id="Decomposition"}

## `Decomposition`

```silk
pub struct Decomposition
```

One canonical decomposition with zero sentinels for an absent mapping or second scalar.

::Anchor{id="Decomposition.first"}

### Field `first`

```silk
pub first: u32
```

The first mapped scalar, or zero when the input has no table mapping.

::Anchor{id="Decomposition.second"}

### Field `second`

```silk
pub second: u32
```

The second mapped scalar, or zero when the mapping contains one scalar.

::Anchor{id="PairRecord"}

## `PairRecord`

```silk
pub struct PairRecord
```

One two-scalar canonical decomposition and its composed scalar.

::Anchor{id="PairRecord.composed"}

### Field `composed`

```silk
pub composed: u32
```

The scalar whose canonical mapping is this pair.

::Anchor{id="PairRecord.first"}

### Field `first`

```silk
pub first: u32
```

First scalar of the canonical mapping.

::Anchor{id="PairRecord.second"}

### Field `second`

```silk
pub second: u32
```

Second scalar of the canonical mapping.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
