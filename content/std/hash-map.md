Owned key-value storage with deterministic seeded hashing and open-addressed lookup.

## When to use
Use [`HashMap`](#HashMap) for key-based lookup when a key has a [`HashKey`](/docs/std/hash#HashKey) witness. Use
`silk.list.List` when presentation order should follow insertion, or when indexing rather
than equivalence is the primary operation.

## Details
The map starts allocation-free, first allocates eight buckets, and grows before used buckets
exceed three quarters of the table. Linear probing crosses removal markers; growth doubles the
table, moves every live entry, and discards those markers. Allocation completes before the map
commits, so failed growth leaves existing entries, length, and bucket count unchanged.

One [`HashSeed`](/docs/std/hash#HashSeed) plus the same operation sequence fixes bucket presentation order across the
native code and WebAssembly. Iterate deterministically by scanning
`0..bucketCount`, testing [`occupiedAt`](#HashMap.impl.occupiedAt), then reading [`keyAt`](#HashMap.impl.keyAt) and [`valueAt`](#HashMap.impl.valueAt). This is bucket
order, not insertion order.

## Gotchas
Lookup and removal consume the probe key. [`get`](#HashMap.impl.get), [`keyAt`](#HashMap.impl.keyAt), and [`valueAt`](#HashMap.impl.valueAt) copy a complete
stored entry and therefore require both stored key and value to be `Copy`; use [`withMut`](#HashMap.impl.withMut) to
update a move-only value in place or [`remove`](#HashMap.impl.remove) to transfer it out. Equivalent keys must also
obey the [`HashKey`](/docs/std/hash#HashKey) hash contract.

## Examples
### Insert, read, and remove one value
```silk
import silk.allocator { Allocator, OutOfMemoryError }

import silk.effect { Effect }

import silk.hash { Hash, Word }

import silk.hash_map { HashMap }

import silk.option { Option }

effect fn build() -> i32
! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut map = HashMap<Word, i32>.make(Hash.seed(17))
  let mut inserting = HashMap<Word, i32>.insert(&mut map, Hash.word(7), 42)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let previous = run inserting
  drop previous
  let found = HashMap<Word, i32>.get(&map, Hash.word(7))
    |> Option<i32>.unwrapOr(0)
  let removed = HashMap<Word, i32>.remove(&mut map, Hash.word(7))
  drop removed
  if HashMap<Word, i32>.contains(&map, Hash.word(7)) {
    return 0
  }
  return found
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}
```

Import as `HashMap` with `import silk.hash_map { HashMap }`.

Public declarations: 4.

::Anchor{id="Entry"}

## `Entry`

```silk
pub struct Entry<K, V>
```

Internal key-value record exposed by the current table representation.

::Anchor{id="Entry.impl.Copy"}

## Implementation `Copy for Entry<K, V>`

```silk
impl<K: Copy, V: Copy> Copy for Entry<K, V>
```

::Anchor{id="Unallocated"}

## `Unallocated`

```silk
pub struct Unallocated<K, V>
```

Allocation-free storage state used before the map creates its first table.

::Anchor{id="Table"}

## `Table`

```silk
pub struct Table<K, V>
```

Allocated entry and occupancy buffers used by [`HashMap`](#HashMap).

::Anchor{id="HashMap"}

## `HashMap`

```silk
pub struct HashMap<K, V>
```

Owns unique keys and their values under one equivalence, hash witness, and seed.

### Details

An equivalent insertion replaces the stored value instead of adding another entry. The seed
and operation sequence determine bucket presentation order, which is not insertion order.

::Anchor{id="HashMap.impl"}

## Implementation `HashMap<K, V>`

```silk
impl<K, V> HashMap<K, V>
```

::Anchor{id="HashMap.impl.make"}

### Associated function `make`

```silk
pub fn make(seed: HashSeed) -> HashMap<K, V>
```

Constructs an empty map whose every hash is computed under one seed.

#### Details

An empty map allocates nothing. The seed fixes the order the map will present its entries in,
and is the only thing besides the sequence of operations that decides it.

::Anchor{id="HashMap.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of entries the map holds.

::Anchor{id="HashMap.impl.bucketCount"}

### Method `bucketCount`

```silk
pub fn bucketCount(self: &Self) -> usize
```

Returns the number of buckets the map presents, which is the range `occupiedAt` accepts.

::Anchor{id="HashMap.impl.occupiedAt"}

### Method `occupiedAt`

```silk
pub fn occupiedAt(self: &Self, index: usize) -> bool
```

Reports whether one bucket holds an entry. Out-of-range buckets hold nothing.

::Anchor{id="HashMap.impl.insert"}

### Method `insert`

```silk
pub effect<'env> fn insert<K: HashKey + 'env, 'env>(
    self: &mut Self,
    key: K,
    value: V
  ) -> Option<V> ! OutOfMemoryError ? &mut Allocator
```

Inserts one owned key and value, answering with the value an equivalent key already held.

#### Details

The map takes ownership of both. When an equivalent key is already present the map's length does
not change, the replaced value travels to the caller, and the key the map held is released.

Fails only with `OutOfMemoryError`, and only from the growth this insert needed. A failed insert
leaves every prior entry at its own key, and leaves the length and the bucket count unchanged.

::Anchor{id="HashMap.impl.contains"}

### Method `contains`

```silk
pub fn contains<K: HashKey>(self: &Self, key: K) -> bool
```

Reports whether the map holds an entry under a key equivalent to one probe key.

#### Details

This function consumes the probe key. It does not change the map or move a stored entry.

::Anchor{id="HashMap.impl.indexOf"}

### Method `indexOf`

```silk
pub fn indexOf<K: HashKey>(self: &Self, key: K) -> Option<usize>
```

Returns the bucket holding an entry under a key equivalent to one probe key, or an absent value.

#### Details

This is the lookup a map with move-only values answers: the bucket names the entry without
moving anything out of the map. A move-only value can then be transferred with [`remove`](#HashMap.impl.remove).
This function consumes the probe key.

::Anchor{id="HashMap.impl.get"}

### Method `get`

```silk
pub fn get<K: HashKey + Copy, V: Copy>(self: &Self, key: K) -> Option<V>
```

Returns the value held under a key equivalent to one probe key, or an absent value.

#### Details

Reads a complete entry copy, so it answers only when both stored key and value types are `Copy`.
Use [`indexOf`](#HashMap.impl.indexOf) for a non-moving presence check and [`remove`](#HashMap.impl.remove) to transfer a move-only value.
This function consumes the probe key and does not change the map.

::Anchor{id="HashMap.impl.withMut"}

### Method `withMut`

```silk
pub fn withMut<K: HashKey, F: once fn(&mut V) -> () + Intrinsic.NonParking
  >(self: &mut Self, key: K, use: F) -> bool
```

Runs one take-once callback with exclusive access to an existing value.

#### Details

Lookup and mutation allocate nothing and never grow the map. Returns `true` after running the
callback exactly once for an equivalent key, or `false` without running it when the key is
absent. The unit callback cannot return its value borrow, and a callback that may park is
rejected.

This function consumes the probe key but leaves the stored key, length, used count, and bucket
count unchanged.

::Anchor{id="HashMap.impl.remove"}

### Method `remove`

```silk
pub fn remove<K: HashKey>(self: &mut Self, key: K) -> Option<V>
```

Removes the entry under a key equivalent to one probe key and answers with its value.

#### Details

Ownership of the value passes to the caller; the map does not also release it. The key the map
held is released, and the probe key is released as well.

::Anchor{id="HashMap.impl.keyAt"}

### Method `keyAt`

```silk
pub fn keyAt<K: Copy, V: Copy>(self: &Self, index: usize) -> K
```

Returns the key held in one bucket. Traps on a bucket that holds no entry.

#### Details

Reads a complete entry copy, so both stored key and value types must be `Copy`.

#### Gotchas

If `index` is out of range or [`occupiedAt`](#HashMap.impl.occupiedAt) returns `false`, the program traps.

::Anchor{id="HashMap.impl.valueAt"}

### Method `valueAt`

```silk
pub fn valueAt<K: Copy, V: Copy>(self: &Self, index: usize) -> V
```

Returns the value held in one bucket. Traps on a bucket that holds no entry.

#### Details

Reads a complete entry copy, so both stored key and value types must be `Copy`.

#### Gotchas

If `index` is out of range or [`occupiedAt`](#HashMap.impl.occupiedAt) returns `false`, the program traps.

::Anchor{id="HashMap.impl.Drop"}

## Implementation `Drop for HashMap<K, V>`

```silk
impl<K, V> Drop for HashMap<K, V>
```

::Anchor{id="HashMap.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut HashMap<K, V>) -> ()
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
