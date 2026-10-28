Deterministic seeded hashing for hash maps, hash sets, and key types that users define.

## When to use
`string` and every integer type implement [`HashKey`](#HashKey), so `HashMap<string, i32>` and
`HashSet<u64>` work without more code. Implement [`HashKey`](#HashKey) for your own type that is a key of a
`HashMap` or an element of a `HashSet`. In the `hash` member, use [`Hash.mix`](#Hash.impl.mix) for the first
integer field and [`Hash.combine`](#Hash.impl.combine) for each other field that `equals` compares.

## Details
A [`HashSeed`](#HashSeed) belongs to a collection, not to a key. The same seed, keys, and operations give
the same results and the same bucket order on each supported target. The results do not depend
on addresses, clocks, or other state. The compiler selects `HashKey` conformances during
specialization, so there is no runtime dispatch.

## Gotchas
If `HashKey.equals` returns `true` for two values, `HashKey.hash` must return the same value for
both, for each seed. A collection cannot find a conformance that breaks this rule. If the rule
is broken, a key in the collection can become impossible to find.

The hash is deterministic. It does not protect against inputs that an attacker selects to make
collisions.

## Examples
### Implement a key for a struct with two fields
```silk
import silk.collections.hash { Hash, HashKey, HashSeed }

struct Point {
  x: u64,
  y: u64,
}

fn pointEquals(left: &Point, right: &Point) -> bool {
  return left.x == right.x && left.y == right.y
}

fn pointHash(value: &Point, seed: &HashSeed) -> u64 {
  return Hash.mix(seed, value.x) |> Hash.combine(value.y)
}

impl HashKey for Point {
  equals: Point.pointEquals

  hash: Point.pointHash
}

pub fn main() -> i32 {
  let seed = Hash.seed(17)
  let first = Point { x: 4, y: 9 }
  let second = Point { x: 4, y: 9 }
  if HashKey.hash(&first, &seed) != HashKey.hash(&second, &seed) {
    return 1
  }
  return 0
}
```

Import as `HashKey` with `import silk.collections.hash { HashKey }`.

Public declarations: 4.

::Anchor{id="Hash"}

## `Hash`

```silk
pub struct Hash
```

The owner type of the seed and mix operations. It has no fields and is never constructed.

::Anchor{id="Hash.impl"}

## Implementation `Hash`

```silk
impl Hash
```

::Anchor{id="Hash.impl.seed"}

### Associated function `seed`

```silk
pub fn seed(value: u64) -> HashSeed
```

Returns a [`HashSeed`](#HashSeed) made from `value`.

#### Details

The same `value` always gives the same seed. To get a different bucket order for each run of a
program, make the seed from a random value.

::Anchor{id="Hash.impl.mix"}

### Associated function `mix`

```silk
pub fn mix(seed: &HashSeed, value: u64) -> u64
```

Returns the hash of the integer `value` under `seed`.

#### When to use

Use `mix` for an integer key, or for the first integer field of a key with more fields.

#### Details

The same seed and value give the same result on each supported target. Use [`Hash.combine`](#Hash.impl.combine) to
add each other field that `equals` compares.

::Anchor{id="Hash.impl.combine"}

### Associated function `combine`

```silk
pub fn combine(hashed: u64, value: u64) -> u64
```

Returns a new hash that adds `value` to the hash `hashed`.

#### When to use

Use `combine` after [`Hash.mix`](#Hash.impl.mix), one time for each other field that `equals` compares. The
order of the fields changes the result.

::Anchor{id="Hash.impl.word"}

### Associated function `word`

```silk
pub fn word(value: u64) -> Word
```

Returns a [`Word`](#Word) key that holds `value`.

::Anchor{id="HashSeed"}

## `HashSeed`

```silk
pub struct HashSeed
```

The seed of a hash collection. Different seeds give different hashes and bucket orders.

### Details

The same seed, keys, and operations give the same bucket order on each supported target. A seed
does not use addresses, clocks, or random state. Make one with [`Hash.seed`](#Hash.impl.seed).

### Gotchas

The hash is deterministic. A seed does not protect against inputs that an attacker selects to
make collisions.

::Anchor{id="HashSeed.value"}

### Field `value`

```silk
pub value: u64
```

The seed value that each hash of the collection uses.

::Anchor{id="HashSeed.impl.Copy"}

## Implementation `Copy for HashSeed`

```silk
impl Copy for HashSeed
```

::Anchor{id="HashKey"}

## `HashKey`

```silk
pub interface HashKey
```

The interface of a key type for `HashMap` and `HashSet`: an equality test and a seeded hash.

### When to use

`string` and every integer type already implement it. Implement it for your own type that is a
key of a `HashMap` or an element of a `HashSet`. In the `hash` member, use [`Hash.mix`](#Hash.impl.mix) for the
first integer field and [`Hash.combine`](#Hash.impl.combine) for each other field that `equals` compares.

### Details

A `string` key compares its UTF-8 bytes exactly, with no case folding or Unicode
normalization. An integer key compares its value. A conformance gives two members: `equals(left: &Self, right: &Self) -> bool` and `hash(value:
&Self, seed: &HashSeed) -> u64`. A collection calls `equals` to compare keys and `hash` with its
own seed.

### Gotchas

If `equals` returns `true` for two keys, `hash` must return the same value for both, for each
seed. A collection cannot check this rule. If the rule is broken, a key in the collection can
become impossible to find.

The hash is deterministic. It does not protect against inputs that an attacker selects to make
collisions.

::Anchor{id="HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Returns `true` if `left` and `right` are the same key.

::Anchor{id="HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

Returns the hash of `value` under `seed`.

#### Gotchas

Two keys that `equals` reports as the same must give the same hash for the same seed.

::Anchor{id="Word"}

## `Word`

```silk
pub struct Word
```

A ready-made [`HashKey`](#HashKey) that holds one `u64`.

::Anchor{id="Word.value"}

### Field `value`

```silk
pub value: u64
```

The integer value of the key.

::Anchor{id="Word.impl.Copy"}

## Implementation `Copy for Word`

```silk
impl Copy for Word
```

::Anchor{id="Word.impl.HashKey"}

## Implementation `HashKey for Word`

```silk
impl HashKey for Word
```

::Anchor{id="Word.impl.HashKey.equals"}

### Operation `equals`

```silk
equals: Word.wordEquals
```

::Anchor{id="Word.impl.HashKey.hash"}

### Operation `hash`

```silk
hash: Word.wordHash
```

::Anchor{id="string.impl.HashKey"}

## Implementation `HashKey for string<'text>`

```silk
impl<'text> HashKey for string<'text>
```

::Anchor{id="string.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="string.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="u64.impl.HashKey"}

## Implementation `HashKey for u64`

```silk
impl HashKey for u64
```

::Anchor{id="u64.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="u64.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="u8.impl.HashKey"}

## Implementation `HashKey for u8`

```silk
impl HashKey for u8
```

::Anchor{id="u8.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="u8.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="u16.impl.HashKey"}

## Implementation `HashKey for u16`

```silk
impl HashKey for u16
```

::Anchor{id="u16.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="u16.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="u32.impl.HashKey"}

## Implementation `HashKey for u32`

```silk
impl HashKey for u32
```

::Anchor{id="u32.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="u32.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="usize.impl.HashKey"}

## Implementation `HashKey for usize`

```silk
impl HashKey for usize
```

::Anchor{id="usize.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="usize.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="i64.impl.HashKey"}

## Implementation `HashKey for i64`

```silk
impl HashKey for i64
```

::Anchor{id="i64.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="i64.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="i8.impl.HashKey"}

## Implementation `HashKey for i8`

```silk
impl HashKey for i8
```

::Anchor{id="i8.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="i8.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="i16.impl.HashKey"}

## Implementation `HashKey for i16`

```silk
impl HashKey for i16
```

::Anchor{id="i16.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="i16.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="i32.impl.HashKey"}

## Implementation `HashKey for i32`

```silk
impl HashKey for i32
```

::Anchor{id="i32.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="i32.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

::Anchor{id="isize.impl.HashKey"}

## Implementation `HashKey for isize`

```silk
impl HashKey for isize
```

::Anchor{id="isize.impl.HashKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="isize.impl.HashKey.hash"}

### Operation `hash`

```silk
fn hash(value: &Self, seed: &HashSeed) -> u64
```

Category: Collections.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
