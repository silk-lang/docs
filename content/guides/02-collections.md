# Collections

This guide builds `wordfreq`, which counts the words in a sentence and prints the most frequent first. It uses the four collections of the std lib: `Bytes` for a buffer you change in place, `List` for a sequence that grows, `HashSet` for "have I seen this?", and `HashMap` for counts. To sort a type of your own you implement `Order`, and to use one as a key in a hashed collection you implement `HashKey`. Both are here.

```sh
silk init wordfreq
cd wordfreq
```

## Which collection

| Type | Module | Use it for | Grows with |
| --- | --- | --- | --- |
| `[T; n]` | built in | A fixed number of values known at compile time | Never grows |
| `&[T]`, `&mut [T]` | built in | Borrowing a run of values from any of the others | Never grows |
| `Bytes` | `silk/collections/bytes` | Raw octets: file contents, buffers | `append` |
| `List<T>` | `silk/collections/list` | An ordered sequence of any element type | `append`, `insert` |
| `HashSet<T>` | `silk/collections/hash_set` | Unique values and fast membership | `insert` |
| `HashMap<K, V>` | `silk/collections/hash_map` | Looking a value up by key | `insert` |

Every operation that may grow a collection is an `effect fn` that needs `? &mut Allocator` and can fail with `OutOfMemoryError`. `make()` never allocates, so an empty collection costs nothing. A failed growth leaves the collection as it was. You can see from a signature alone which code may allocate.

When you know the size ahead of time, `makeWithCapacity` allocates once up front, and `reserve` makes room in a collection you already have. `List` and `Bytes` also have `reserveExact`, `shrinkToFit` and `capacity`. `clear` empties a collection and keeps its storage for reuse; `clearAndFree` releases the storage too.

## The text and the words

The program counts the words in one constant:

```silk
const TEXT: string = "The cat sat on the mat. The dog sat on the log, and the cat ran."
```

"The" and "the" should be the same word, so the first step makes a lower-case copy. A `string` is immutable, so copy its bytes into `Bytes` and change them in place through `asMutSlice`:

```silk
// An owned, lower-case copy of ASCII text. Bytes can be changed in place.
effect fn lowerCase(text: string) -> Bytes ! OutOfMemoryError ? &mut Allocator {
  let mut bytes = run Bytes.copy(String.utf8Bytes(text))
  let view = bytes.asMutSlice()
  let mut index: usize = 0
  while index < view.length {
    if view[index] >= 'A' && view[index] <= 'Z' {
      view[index] = view[index] + 32
    }
    index = index + 1
  }
  return move bytes
}
```

`Bytes.copy` allocates a buffer and copies into it. `asMutSlice` lends the bytes as `&mut [u8]`, and `asSlice` as `&[u8]`. Don't keep a slice across an `append`: growing may move the buffer.

Next, split the text into words. Each word is a `string` view into the lower-case buffer, so no word is copied. The list owns only the views:

```silk
// Splits text into words. Each word is a view into `text`: nothing is copied.
effect fn words<'text>(text: string<'text>) -> List<string<'text>> ! OutOfMemoryError ? &mut Allocator {
  let mut found = List<string<'text>>.make()
  let bytes = String.utf8Bytes(text)
  let mut index: usize = 0
  while index < bytes.length {
    while index < bytes.length && !isLetter(bytes[index]) {
      index = index + 1
    }
    let start = index
    while index < bytes.length && isLetter(bytes[index]) {
      index = index + 1
    }
    if index > start {
      let piece = Slice.view(bytes, start, index - start)
      match String.fromUtf8(piece) {
        Result.Success { value } => {
          run found.append(value)
        }
        Result.Failure { .. } => {}
      }
    }
  }
  return move found
}
```

`List<string<'text>>.make()` names the element type in full. `List.make()` alone has no argument to infer it from and is SEM0052. `Slice.view(values, offset, length)` borrows part of a slice; Silk has no `a[i..j]` syntax. `isLetter` is a three-line helper that checks for ASCII letters.

## Reading a List

A `List` hands out its elements three ways:

- `asSlice()` and `asMutSlice()` borrow them all as a slice. This works for every element type. Index the slice with `[i]`.
- `get(i)` returns a copy, so it only works when the element type is `Copy`.
- `pop()` and `remove(i)` take an element out and give you ownership.

An index out of range traps with `index out of bounds`. `length()` is a method on the list; `.length` is a field on a slice. Other methods worth knowing: `insert`, `insertSlice` (copy a slice in at an index), `insertRepeated` (insert `count` copies of one value), `set`, `truncate`, `clear`, and `binarySearch` on a sorted list.

## Keys

`HashMap` and `HashSet` need a key type that implements `HashKey` from `silk/collections/hash`. `string` and every integer type implement it, so the words can be keys as they are. `HashMap.get` returns copies of the stored key and value, so it also needs both to be `Copy`. A `string` is a view, and copying it does not copy the text.

`HashKey` has two members. `equals` says when two keys are the same entry. `hash` turns a key into a number under the collection's seed: start with `Hash.mix(seed, first)` and fold in every further value with `Hash.combine`. The rule the collection cannot check for you: keys that are equal must hash the same.

To use a type of your own as a key, implement both. This word type ignores ASCII case, so `"The"` and `"the"` are one entry:

```silk
// A word that compares and hashes without regard to ASCII case.
struct Folded<'text> { text: string<'text> }

impl<'text> Copy for Folded<'text> {}

fn lower(byte: u8) -> u8 {
  if byte >= 'A' && byte <= 'Z' {
    return byte + 32
  }
  return byte
}

fn sameFolded(left: &Folded, right: &Folded) -> bool {
  let a = String.utf8Bytes(left.text)
  let b = String.utf8Bytes(right.text)
  if a.length != b.length {
    return false
  }
  let mut index: usize = 0
  while index < a.length {
    if lower(a[index]) != lower(b[index]) {
      return false
    }
    index = index + 1
  }
  return true
}

fn hashFolded(value: &Folded, seed: &HashSeed) -> u64 {
  let bytes = String.utf8Bytes(value.text)
  let mut hashed = Hash.mix(seed, usize.toU64(bytes.length))
  let mut index: usize = 0
  while index < bytes.length {
    hashed = Hash.combine(hashed, u8.toU64(lower(bytes[index])))
    index = index + 1
  }
  return hashed
}

impl<'text> HashKey for Folded<'text> { equals: sameFolded hash: hashFolded }
```

It needs `import silk.collections.hash { Hash, HashKey, HashSeed }`, `silk.core.ownership { Copy }`, `silk.num.u8` and `silk.num.usize`. Both members fold the case of each byte the same way, so the rule holds. With this impl, a `HashSet<Folded>` that holds `Folded { text: "The" }` contains `Folded { text: "the" }`. `Copy` comes from `silk/core/ownership`. `Folded` is `Copy` because copying it copies a view, not the text. `wordfreq` lower-cases its text first, so it can use plain `string` keys.

## Counting with a HashSet and a HashMap

A set holds the stop words to skip, and a map holds the counts:

```silk
// Counts each word that is not a stop word.
effect fn countWords<'text>(all: &[string<'text>], stop: &HashSet<string<'text>>) -> HashMap<string<'text>, u32>
! OutOfMemoryError ? &mut Allocator {
  let mut counts = run HashMap<string<'text>, u32>.makeWithCapacity(Hash.seed(2026), all.length)
  let mut index: usize = 0
  while index < all.length {
    let word = all[index]
    if !stop.contains(word) {
      let seen = match counts.get(word) {
        Option.Some { value } => value
        Option.None => 0
      }
      drop run counts.insert(word, seen + 1)
    }
    index = index + 1
  }
  return move counts
}
```

Each collection is made with a seed, `Hash.seed(2026)`. `makeWithCapacity` takes the seed and a number of entries, and allocates room for them up front, so the loop never grows the map; a plain `make(seed)` would start empty and grow as it goes. The seed belongs to the collection, and every key is hashed with it. The same seed and the same operations give the same layout on every target, so output that depends on bucket order is reproducible.

A lookup consumes the key you pass, which costs nothing for a `string`. `insert` returns the value the key held before, as an `Option`. Here the old count is not needed, so `drop` discards it. For values that are not `Copy`, `get` is not available. Use `withMut(key, callback)` to change a stored value in place, or `remove` to take it out.

The function takes the words as `&[string<'text>]`, a borrowed slice, not the `List` itself. A function that only reads a sequence should take a slice: it then works with a list, an array or a part of either.

## Sorting with Order

The map keeps its entries in bucket order, which is neither insertion order nor sorted. To print the most frequent words first, copy the entries into a `List` and sort it. `List.sort` needs an element type that implements `Order` from `silk/core/order`:

```silk
// One row of the result: a word and how often it appeared.
struct Count<'text> { word: string<'text>, count: u32 }

impl<'text> Copy for Count<'text> {}

// Most frequent first; ties in alphabetical order.
fn compareCounts<'text>(left: &Count<'text>, right: &Count<'text>) -> Ordering {
  if left.count > right.count {
    return Ordering.Less
  }
  if left.count < right.count {
    return Ordering.Greater
  }
  return Order.compare(&left.word, &right.word)
}

impl<'text> Order for Count<'text> { compare: compareCounts }
```

`compare` returns `Ordering.Less`, `Equal` or `Greater`, and must describe a total order. A larger count sorts as "less" so that it comes first. With the impl in place, `&a < &b` works on `Count` values too.

For a tie, `Order.compare` uses the std lib's `Order` for `string`, which compares the UTF-8 bytes: case-sensitive, and a shorter string sorts before a longer one that starts the same way. The integer types, `char`, `f32` and `f64` implement `Order` too, so a `List<string>` or `List<f64>` sorts with no extra code. Two things trip this up in this release. The `<` operator does not accept two strings, not even as `&a < &b` (SEM0135), so call `Order.compare`. And both strings must have the same lifetime, which is why `compareCounts` names `'text` for both parameters. With the elided `&Count` of each, the call is SEM0012, "Expected &string but received &string", with the note "the two types differ only in their lifetimes".

Leave out the `impl Order` and `rows.sort()` stops the build:

```
Checking wordfreq (x86_64-unknown-linux-gnu)
  load     147 modules, 1 in package         0.03s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
src/main.silk:129:7: error[SEM0121] `main.Count<'_>: silk.core.order.Order` cannot be proved: no implementation of `silk.core.order.Order` exists for `main.Count<'_>`
Failed wordfreq in 0.17s
```

The requirement it cannot prove is `Count: Order`, which `sort` declares as `sort<T: Order>`. The location is the `run rows.sort()` line.

`Equal` from `silk/core/equal` works the same way for `==` and `!=`. Strings and numbers already have both operators.

## Putting it together

`report` runs the steps in order. The loop over `bucketCount()` is how you visit every entry of a map: test each bucket with `occupiedAt`, then read it with `keyAt` and `valueAt`:

```silk
effect fn report() -> () ! WriterError | OutOfMemoryError ? &mut Writer | &mut Allocator {
  let lower = run lowerCase(TEXT)
  let text = match String.fromUtf8(lower.asSlice()) {
    Result.Success { value } => value
    Result.Failure { .. } => ""
  }
  let all = run words(text)
  run Format.format("{count} words\n", &.{ count: all.length() })

  let mut stop = HashSet<string>.make(Hash.seed(7))
  drop run stop.insert("the")
  drop run stop.insert("and")
  drop run stop.insert("on")

  let counts = run countWords(all.asSlice(), &stop)
  run Format.format("{count} distinct words after dropping {stop} stop words\n", &.{
    count: counts.length(),
    stop: stop.length(),
  })

  // Copy the map into a list so it can be sorted.
  let mut rows = List<Count>.make()
  let mut bucket: usize = 0
  while bucket < counts.bucketCount() {
    if counts.occupiedAt(bucket) {
      run rows.append(Count { word: counts.keyAt(bucket), count: counts.valueAt(bucket) })
    }
    bucket = bucket + 1
  }
  run rows.sort()

  let sorted = rows.asSlice()
  let mut index: usize = 0
  while index < sorted.length {
    run Format.format("{count} {word}\n", &.{ count: sorted[index].count, word: sorted[index].word })
    index = index + 1
  }
}

pub effect fn main() -> i32 ! WriterError | OutOfMemoryError {
  let mut out = StdoutWriter.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  run report()
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}
```

The stop set is written `HashSet<string>`, with no lifetime. The compiler picks one that fits the words it will be compared with. Writing `HashSet<string<'static>>` is SEM0012 when you pass it to `countWords`, because a set of `'static` strings is a different type from a set of `'text` strings:

```
src/main.silk:115:20: error[SEM0012] Expected &silk.collections.hash_set.HashSet<string> but received &silk.collections.hash_set.HashSet<string<'static>>
```

`insert` on a set returns `true` when an equal element was already there. Sorting may allocate scratch space, so `sort` needs the allocator too. It is stable: equal elements keep their order.

The imports:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.collections.hash { Hash }
import silk.collections.hash_map { HashMap }
import silk.collections.hash_set { HashSet }
import silk.collections.list { List }
import silk.core.option { Option }
import silk.core.order { Order, Ordering }
import silk.io.writer_native { StdoutWriter }
import silk.core.ownership { Copy }
import silk.core.result { Result }
import silk.collections.slice { Slice }
import silk.text.string { String }
import silk.io.writer { Writer, WriterError }
```

## Run it

```sh
silk run
```

```
16 words
6 distinct words after dropping 3 stop words
2 cat
2 sat
1 dog
1 log
1 mat
1 ran
```

In `report`, the words are views into `lower`, and those views are stored in a list and a map. The compiler checks borrows that flow through containers like these. The program passes because `lower` lives until the end of `report`, longer than every view of it.

There are 16 words. After "the", "and" and "on" are dropped, 6 remain. "cat" and "sat" appear twice, and the ties are in alphabetical order.

## API reference

- `silk/collections/list`: `List`
- `silk/collections/bytes`: `Bytes`
- `silk/collections/slice`: `Slice`
- `silk/collections/hash_map`: `HashMap`
- `silk/collections/hash_set`: `HashSet`
- `silk/collections/hash`: `Hash`, `HashKey`, `HashSeed`
- `silk/core/order`: `Order`, `Ordering`
- `silk/core/equal`: `Equal`
- `silk/core/ownership`: `Copy`
- `silk/mem/allocator`: `Allocator`, `OutOfMemoryError`
