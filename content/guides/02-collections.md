# Collections

This guide builds `wordfreq`, which counts the words in a sentence and prints the most frequent first. It uses the four collections of the std lib: `Bytes` for a buffer you change in place, `List` for a sequence that grows, `HashSet` for "have I seen this?", and `HashMap` for counts. To store a type of your own in a hashed collection you implement `HashKey`, and to sort it you implement `Order`. Both are here.

```sh
silk init wordfreq
cd wordfreq
```

## Which collection

| Type | Module | Use it for | Grows with |
| --- | --- | --- | --- |
| `[T; n]` | built in | A fixed number of values known at compile time | Never grows |
| `&[T]`, `&mut [T]` | built in | Borrowing a run of values from any of the others | Never grows |
| `Bytes` | `silk/bytes` | Raw octets: file contents, buffers | `append` |
| `List<T>` | `silk/list` | An ordered sequence of any element type | `append`, `insert` |
| `HashSet<T>` | `silk/hash_set` | Unique values and fast membership | `insert` |
| `HashMap<K, V>` | `silk/hash_map` | Looking a value up by key | `insert` |

Every operation that may grow a collection is an `effect fn` that needs `? &mut Allocator` and can fail with `OutOfMemoryError`. `make()` never allocates, so an empty collection costs nothing. A failed growth leaves the collection as it was. You can see from a signature alone which code may allocate.

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

An index out of range traps with `index out of bounds`. `length()` is a method on the list; `.length` is a field on a slice. Other methods worth knowing: `insert`, `set`, `truncate`, `clear`, `reserve` (allocate ahead of time), and `binarySearch` on a sorted list.

## A key type of your own

`HashMap` and `HashSet` need a key type that implements `HashKey` from `silk/hash`. No std lib type but `Word` (one `u64`) has one, not even `string`. So wrap the word in a small struct:

```silk
// A word used as a key. It borrows its text, so it is cheap to copy.
struct Term<'text> { text: string<'text> }

impl<'text> Copy for Term<'text> {}

fn sameTerm(left: &Term, right: &Term) -> bool {
  return left.text == right.text
}

fn hashTerm(value: &Term, seed: &HashSeed) -> u64 {
  let bytes = String.utf8Bytes(value.text)
  let mut hashed = Hash.mix(seed, usize.toU64(bytes.length))
  let mut index: usize = 0
  while index < bytes.length {
    hashed = Hash.combine(hashed, u8.toU64(bytes[index]))
    index = index + 1
  }
  return hashed
}

impl<'text> HashKey for Term<'text> { equals: sameTerm hash: hashTerm }
```

`HashKey` has two members. `equals` says when two keys are the same entry. `hash` turns a key into a number under the collection's seed: start with `Hash.mix(seed, first)` and fold in every further value with `Hash.combine`. The rule the collection cannot check for you: keys that are equal must hash the same. Here both depend on exactly the same bytes, so the rule holds.

`Copy` comes from `silk/ownership`. `Term` is `Copy` because copying it copies a view, not the text. That matters because lookups consume the key you pass, and `HashMap.get` returns copies of stored keys and values, so it needs both to be `Copy`.

## Counting with a HashSet and a HashMap

A set holds the stop words to skip, and a map holds the counts:

```silk
// Counts each word that is not a stop word.
effect fn countWords<'text>(all: &[string<'text>], stop: &HashSet<Term<'text>>) -> HashMap<Term<'text>, u32>
! OutOfMemoryError ? &mut Allocator {
  let mut counts = HashMap<Term<'text>, u32>.make(Hash.seed(2026))
  let mut index: usize = 0
  while index < all.length {
    let term = Term { text: all[index] }
    if !stop.contains(term) {
      let seen = match counts.get(term) {
        Option.Some { value } => value
        Option.None => 0
      }
      drop run counts.insert(term, seen + 1)
    }
    index = index + 1
  }
  return move counts
}
```

Each collection is made with a seed, `Hash.seed(2026)`. The seed belongs to the collection, and every key is hashed with it. The same seed and the same operations give the same layout on every target, so output that depends on bucket order is reproducible.

`insert` returns the value the key held before, as an `Option`. Here the old count is not needed, so `drop` discards it. For values that are not `Copy`, `get` is not available. Use `withMut(key, callback)` to change a stored value in place, or `remove` to take it out.

The function takes the words as `&[string<'text>]`, a borrowed slice, not the `List` itself. A function that only reads a sequence should take a slice: it then works with a list, an array or a part of either.

## Sorting with Order

The map keeps its entries in bucket order, which is neither insertion order nor sorted. To print the most frequent words first, copy the entries into a `List` and sort it. `List.sort` needs an element type that implements `Order` from `silk/order`:

```silk
// One row of the result: a word and how often it appeared.
struct Count<'text> { term: Term<'text> count: u32 }

impl<'text> Copy for Count<'text> {}

// Most frequent first; ties in alphabetical order.
fn compareCounts(left: &Count, right: &Count) -> Ordering {
  if left.count > right.count {
    return Ordering.Less
  }
  if left.count < right.count {
    return Ordering.Greater
  }
  return compareText(left.term.text, right.term.text)
}

impl<'text> Order for Count<'text> { compare: compareCounts }
```

`compare` returns `Ordering.Less`, `Equal` or `Greater`, and must describe a total order. A larger count sorts as "less" so that it comes first. With the impl in place, `&a < &b` works on `Count` values too.

`<` does not accept two strings (SEM0135), so `compareText` compares them byte by byte. It returns `Less` at the first smaller byte, and a shorter string sorts before a longer one that starts the same way.

Leave out the `impl Order` and `rows.sort()` stops the build:

```
Checking wordfreq (x86_64-unknown-linux-gnu)
  load     55 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.15s
[x86_64-unknown-linux-gnu]
src/main.silk:177:7: error[SEM0121] A concrete specialization whose conditional requirements cannot be proved
Failed wordfreq in 0.21s
```

The "conditional requirement" is `Count: Order`, which `sort` declares as `sort<T: Order>`. The location is the `run rows.sort()` line.

`Equal` from `silk/equal` works the same way for `==` and `!=`. Strings and numbers already have both operators.

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

  let mut stop = HashSet<Term>.make(Hash.seed(7))
  drop run stop.insert(Term { text: "the" })
  drop run stop.insert(Term { text: "and" })
  drop run stop.insert(Term { text: "on" })

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
      run rows.append(Count { term: counts.keyAt(bucket), count: counts.valueAt(bucket) })
    }
    bucket = bucket + 1
  }
  run rows.sort()

  let sorted = rows.asSlice()
  let mut index: usize = 0
  while index < sorted.length {
    run Format.format("{count} {word}\n", &.{ count: sorted[index].count, word: sorted[index].term.text })
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

The stop set is written `HashSet<Term>`, with no lifetime. The compiler picks one that fits the words it will be compared with. Writing `HashSet<Term<'static>>` is SEM0012 when you pass it to `countWords`, because a set of `'static` terms is a different type from a set of `'text` terms.

`insert` on a set returns `true` when an equal element was already there. Sorting may allocate scratch space, so `sort` needs the allocator too. It is stable: equal elements keep their order.

The imports:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.format { Format }
import silk.hash { Hash, HashKey, HashSeed }
import silk.hash_map { HashMap }
import silk.hash_set { HashSet }
import silk.list { List }
import silk.option { Option }
import silk.order { Order, Ordering }
import silk.os_writer { StdoutWriter }
import silk.ownership { Copy }
import silk.result { Result }
import silk.slice { Slice }
import silk.string { String }
import silk.u8
import silk.usize
import silk.writer { Writer, WriterError }
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

- `silk/list`: `List`
- `silk/bytes`: `Bytes`
- `silk/slice`: `Slice`
- `silk/hash_map`: `HashMap`
- `silk/hash_set`: `HashSet`
- `silk/hash`: `Hash`, `HashKey`, `HashSeed`, `Word`
- `silk/order`: `Order`, `Ordering`
- `silk/equal`: `Equal`
- `silk/ownership`: `Copy`
- `silk/allocator`: `Allocator`, `OutOfMemoryError`
