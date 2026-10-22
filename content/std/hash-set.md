Owned unique elements with deterministic seeded hashing and open-addressed membership lookup.

## When to use
Use [`HashSet`](#HashSet) when equivalence and fast membership are central and an element has a [`HashKey`](/docs/std/hash#HashKey)
witness. Use `silk.list.List` when order or duplicate values are part of the data.

## Details
The set starts allocation-free, first allocates eight buckets, and grows before used buckets
exceed three quarters of the table. Linear probing crosses removal markers; growth doubles the
table, moves every live element, and discards those markers. Allocation completes before commit,
so failed growth leaves prior membership, length, and bucket count unchanged.

One [`HashSeed`](/docs/std/hash#HashSeed) plus the same operation sequence fixes bucket presentation order on every
engine. Iterate deterministically by scanning `0..bucketCount`, testing [`occupiedAt`](#HashSet.impl.occupiedAt), and then
calling [`elementAt`](#HashSet.impl.elementAt). This is bucket order, not insertion order.

## Gotchas
Probes are consumed. Inserting an equivalent element keeps the element already stored and drops
the arrival; [`remove`](#HashSet.impl.remove) instead transfers the stored element to the caller. [`elementAt`](#HashSet.impl.elementAt) copies
and therefore requires a `Copy` element; [`contains`](#HashSet.impl.contains) and [`indexOf`](#HashSet.impl.indexOf) can inspect membership for
move-only elements without taking them out.

## Examples
### Insert one unique element and remove it
```silk
import silk.allocator { Allocator, OutOfMemoryError }

import silk.effect { Effect }

import silk.hash { Hash, Word }

import silk.hash_set { HashSet }

import silk.option { Option }

import silk.u64

effect fn build() -> i32
! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut set = HashSet<Word>.make(Hash.seed(17))
  let mut inserting = HashSet<Word>.insert(&mut set, Hash.word(42))
    |> Effect.provideMut<Allocator>(&mut allocator)
  let existed = run inserting
  if existed || !HashSet<Word>.contains(&set, Hash.word(42)) {
    return 0
  }
  let removed = HashSet<Word>.remove(&mut set, Hash.word(42))
    |> Option<Word>.unwrapOr(Hash.word(0))
  return u64.toI32(removed.value)
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}
```

Import as `HashSet` with `import silk.hash_set { HashSet }`.

Public declarations: 4.

::Anchor{id="Member"}

## `Member`

```silk
pub struct Member<T>
```

Internal hashed element record exposed by the current table representation.

::Anchor{id="Member.impl.Copy"}

## Implementation `Copy for Member<T>`

```silk
impl<T: Copy> Copy for Member<T>
```

::Anchor{id="Unseeded"}

## `Unseeded`

```silk
pub struct Unseeded<T>
```

Allocation-free storage state used before the set creates its first table.

::Anchor{id="Slots"}

## `Slots`

```silk
pub struct Slots<T>
```

Allocated element and occupancy buffers used by [`HashSet`](#HashSet).

::Anchor{id="HashSet"}

## `HashSet`

```silk
pub struct HashSet<T>
```

Owns one representative of each equivalence class under one hash witness and seed.

### Details

An equivalent insertion keeps the representative already stored. The seed and operation
sequence determine bucket presentation order, which is not insertion order.

::Anchor{id="HashSet.impl"}

## Implementation `HashSet<T>`

```silk
impl<T> HashSet<T>
```

::Anchor{id="HashSet.impl.make"}

### Associated function `make`

```silk
pub fn make(seed: HashSeed) -> HashSet<T>
```

Creates an empty set whose every hash is computed under one seed.

#### Details

An empty set allocates no storage. The seed fixes bucket order for the same operation sequence.

::Anchor{id="HashSet.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of elements the set holds.

::Anchor{id="HashSet.impl.bucketCount"}

### Method `bucketCount`

```silk
pub fn bucketCount(self: &Self) -> usize
```

Returns the number of buckets the set presents, which is the range `occupiedAt` accepts.

::Anchor{id="HashSet.impl.occupiedAt"}

### Method `occupiedAt`

```silk
pub fn occupiedAt(self: &Self, index: usize) -> bool
```

Reports whether one bucket holds an element. Out-of-range buckets hold nothing.

::Anchor{id="HashSet.impl.insert"}

### Method `insert`

```silk
pub effect<'env> fn insert<T: HashKey + 'env, 'env>(
    self: &mut Self,
    value: T
  ) -> bool ! OutOfMemoryError ? &mut Allocator
```

Inserts one owned element, reporting whether an equivalent element was already held.

#### Details

A set never holds two equivalent elements. When one is already held the set is unchanged and the
arriving element is released, so the element that survives is the one the set already had.

Fails only with `OutOfMemoryError`, and only from the growth this insert needed. A failed insert
leaves every prior element present, and leaves the length and the bucket count unchanged.

::Anchor{id="HashSet.impl.contains"}

### Method `contains`

```silk
pub fn contains<T: HashKey>(self: &Self, value: T) -> bool
```

Reports whether the set holds an element equivalent to one probe element.

#### Details

This function consumes the probe element. It does not change the set or move a stored element.

::Anchor{id="HashSet.impl.indexOf"}

### Method `indexOf`

```silk
pub fn indexOf<T: HashKey>(self: &Self, value: T) -> Option<usize>
```

Returns the bucket holding an element equivalent to one probe element, or an absent value.

#### Details

This is the membership question a set of move-only elements answers without moving anything.
This function consumes the probe element.

::Anchor{id="HashSet.impl.remove"}

### Method `remove`

```silk
pub fn remove<T: HashKey>(self: &mut Self, value: T) -> Option<T>
```

Removes the element equivalent to one probe element and answers with it.

#### Details

Ownership passes to the caller; the set does not also release it. The probe element is released.

::Anchor{id="HashSet.impl.elementAt"}

### Method `elementAt`

```silk
pub fn elementAt<T: Copy>(self: &Self, index: usize) -> T
```

Returns the element held in one bucket. Traps on a bucket that holds no element.

#### Details

Reads a copy out of the set, so it answers for a set whose element type is `Copy`.

#### Gotchas

If `index` is out of range or [`occupiedAt`](#HashSet.impl.occupiedAt) returns `false`, the program traps.

::Anchor{id="HashSet.impl.Drop"}

## Implementation `Drop for HashSet<T>`

```silk
impl<T> Drop for HashSet<T>
```

::Anchor{id="HashSet.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut HashSet<T>) -> ()
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
