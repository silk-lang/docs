Operations on `mask<2>`: two lanes that are each set or clear.

## When to use
A lane comparison in a vector module returns a mask. Use [`any`](#any) or [`all`](#all) to branch on it,
[`firstSet`](#firstSet) to find the first matching lane, and [`toBits`](#toBits) to process every set lane.

## Details
The operators `&`, `|`, `^`, `~` and `!` apply lane by lane. `==` is true only when every lane
is equal. In [`toBits`](#toBits), lane `i` is bit `i`.

## Examples
### Count and locate set lanes
```silk
import silk.simd.mask2

pub fn main() -> i32 {
  let flags = mask2.fromArray([false, true])
  if mask2.count(flags) != 1 || mask2.firstSet(flags) != 1 || mask2.toBits(flags) != 2 {
    return 1
  }
  return 0
}
```

Import as `mask2` with `import silk.simd.mask2 as mask2`.

Public declarations: 12.

::Anchor{id="LANES"}

## `LANES`

```silk
pub const LANES: usize
```

The number of lanes in a mask.

::Anchor{id="splat"}

## `splat`

```silk
pub fn splat(set: bool) -> mask<2>
```

Returns a mask with every lane set when `set` is true, and every lane clear otherwise.

::Anchor{id="fromArray"}

## `fromArray`

```silk
pub fn fromArray(lanes: [bool; 2]) -> mask<2>
```

Returns a mask whose lane `i` is set when `lanes[i]` is true.

::Anchor{id="toArray"}

## `toArray`

```silk
pub fn toArray(mask: mask<2>) -> [bool; 2]
```

Returns the lanes of `mask` as an array, in lane order.

::Anchor{id="extract"}

## `extract`

```silk
pub fn extract(mask: mask<2>, index: usize) -> bool
```

Returns whether lane `index` of `mask` is set. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="insert"}

## `insert`

```silk
pub fn insert(mask: mask<2>, index: usize, set: bool) -> mask<2>
```

Returns `mask` with lane `index` set when `set` is true and clear otherwise. Traps when `index` is
[`LANES`](#LANES) or more.

::Anchor{id="any"}

## `any`

```silk
pub fn any(mask: mask<2>) -> bool
```

Returns whether at least one lane is set.

::Anchor{id="all"}

## `all`

```silk
pub fn all(mask: mask<2>) -> bool
```

Returns whether every lane is set.

::Anchor{id="count"}

## `count`

```silk
pub fn count(mask: mask<2>) -> usize
```

Returns the number of set lanes.

::Anchor{id="firstSet"}

## `firstSet`

```silk
pub fn firstSet(mask: mask<2>) -> usize
```

Returns the index of the lowest set lane, or [`LANES`](#LANES) when no lane is set.

::Anchor{id="toBits"}

## `toBits`

```silk
pub fn toBits(mask: mask<2>) -> u64
```

Returns the lanes as bits: bit `i` is set when lane `i` is set. Bits from [`LANES`](#LANES) up are zero.

::Anchor{id="fromBits"}

## `fromBits`

```silk
pub fn fromBits(bits: u64) -> mask<2>
```

Returns a mask whose lane `i` is set when bit `i` of `bits` is set. Bits from [`LANES`](#LANES) up are
ignored.

Category: SIMD.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
