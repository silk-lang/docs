# Allocation and shared ownership

Silk has no implicit global heap. Code that acquires storage states it with an `Allocator` requirement, and a caller supplies the allocator. This page covers that requirement, typed out-of-memory failure, the standard owning containers `Box`, `List` and `Shared`, and the `Arena` provider.

## The Allocator service

```
AllocatingFunction = 'effect' 'fn' Name Signature ( '!' 'OutOfMemoryError' )? '?' '&mut' 'Allocator' Block
```

- `Allocator` is an ordinary service declared in `silk/mem/allocator`. It has one operation, `allocate(layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError ? &mut Allocator`.
- Every standard library operation that acquires storage is an `effect fn` with the requirement `? &mut Allocator`. Examples: `Box.make`, `Shared.make`, `List.append`, `List.insert`, `List.reserve`, `List.sort`.
- Operations that only read or shrink storage are ordinary functions with no requirement. Examples: `List.make`, `List.length`, `List.asSlice`, `List.pop`, `Box.get`.
- A requirement stays in the Effect until a caller provides it. Running an Effect with an unprovided requirement is an error (SEM0071).
- A function that runs an allocating Effect without providing the allocator must declare `? &mut Allocator` itself. The requirement then passes to its caller.
- Effects, requirements and providers are covered in Services and providers. This page only uses them.
- The program entry does not supply an allocator. `main` creates and provides one itself (see Program entry and termination).

## Out-of-memory failure

- Allocation failure is the typed failure `OutOfMemoryError`, an empty struct in `silk/mem/allocator`.
- An allocating operation either succeeds or fails with `OutOfMemoryError`. It never returns partial storage.
- `OutOfMemoryError` must be handled or declared like any failure. An unhandled failure row is an error (SEM0066).
- `Effect.catchAll` recovers from it. `Allocator.outOfMemory()` fails with it directly.
- `List.append` and `List.reserve` leave the list unchanged when they fail.

## Providing an allocator

- `Allocator.systemAllocatorProvider()` returns a `SystemAllocator`, the process-backed provider. Creating it allocates nothing.
- Supply it with `Effect.provideMut<Allocator>(&mut allocator)`, usually in a `|>` pipeline before `run`.
- `run` binds looser than `|>`: `run Box<i32>.make(1) |> Effect.provideMut<Allocator>(&mut a)` provides first, then runs.
- `pub fn main() -> i32` cannot fail, so it wraps an allocating `effect fn` in `Effect.catchAll`. A `pub effect fn main() -> i32 ! OutOfMemoryError` may create and provide the allocator itself.
- Any type that implements `Allocator` is a provider. A test can provide an allocator that always fails (see Examples).

## Box

`Box<T>` in `silk/mem/box` owns one heap-allocated `T`.

- `Box<T>.make(value)` moves `value` into a new allocation. It is allocating.
- `Box<T>.get(&box)` returns `&[T]` and `Box<T>.getMut(&mut box)` returns `&mut [T]`. Each is a one-element slice; index it with `[0]`.
- `Box<T>.into(move box)` consumes the box, returns the value and releases the allocation.
- Dropping a box drops its element and then releases the allocation.
- A struct may contain a `Box` of its own type. This breaks an inline layout cycle for recursive data.

## List

`List<T>` in `silk/collections/list` is a growable owned sequence.

- `List<T>.make()` does not allocate. The first growth reserves four elements; later growth doubles capacity.
- Allocating operations: `makeWithCapacity`, `append`, `insert`, `appendSlice`, `insertSlice`, `appendRepeated`, `insertRepeated`, `reserve`, `reserveExact`, `shrinkToFit`, `sort`, and for `List<u8>` `appendBytes`.
- Non-allocating operations: `length`, `capacity`, `asSlice`, `asMutSlice`, `get`, `set`, `pop`, `remove`, `clear`, `clearAndFree`, `truncate`, `binarySearch`.
- `get` requires `T: Copy` and returns a copy. On a non-Copy element it is SEM0121. Borrow move-only elements through `asSlice`.
- `get`, `set` and `remove` trap on an out-of-range index.
- Removing, clearing and truncating drop the discarded elements and keep capacity. `clearAndFree` drops the elements and returns the buffer to the allocator. `shrinkToFit` moves the elements into a buffer of exactly their length, so it allocates.
- `List<T>.makeWithCapacity(n)` allocates room for `n` elements up front. `reserve(additional)` makes room for at least that many more and may round up; `reserveExact` asks for exactly that many.
- `String`, `Bytes`, `HashMap` and `HashSet` have the same capacity operations: `makeWithCapacity` (the hash containers also take a seed), `reserve`, `clear` and `clearAndFree`, and for `String` and `Bytes` also `capacity`, `reserveExact` and `shrinkToFit`.

## Shared

`Shared<T>` in `silk/mem/shared` is local, single-threaded shared ownership with callback-scoped access.

- `Shared<T>.make(value)` allocates one control block. It is the only allocating operation.
- `Shared<T>.clone(&handle)` adds a strong handle. It does not allocate or touch the value.
- Dropping a handle that is not the last keeps the value. Dropping the last handle drops the value and frees the block.
- There are no weak handles. Strong-reference cycles leak.
- `Shared<T>.with<A>(&handle, f)` runs `f: once fn(&T) -> A`. `Shared<T>.withMut<A>(&handle, f)` runs `f: once fn(&mut T) -> A`. Each returns `f`'s result.
- Access is exclusive at run time, even through `with`. Nesting any access to the same value inside another, through any handle, traps before the inner callback starts.
- The reference given to the callback cannot leave it. A callback that tries to return its reference fails to type-check (SEM0076).
- The callback, and every function it calls directly, must not `run` an Effect. A `run` could suspend while the access is held. This is OWN0016, reported at the `run`.
- `Shared` handles are not thread-transferable.

## Arena

`Arena<A>` in `silk/mem/arena` is a bump allocator. It implements `Allocator`, so it is provided like any other allocator, and `Box`, `List`, `Bytes` and `Shared` work in it unchanged.

- `Arena.make(child)` creates an arena over another allocator provider, `child`, which it owns. `Arena.withOptions(child, options)` takes chunk sizes as an `ArenaOptions { firstChunkBytes, maximumChunkBytes }`. `ArenaOptions.default()` is a 4 KiB first chunk that doubles up to 1 MiB. Creating an arena allocates nothing.
- The arena asks its child for chunks and hands out allocations by moving a cursor through the current chunk. It fails with `OutOfMemoryError` only when the child refuses a chunk.
- A request larger than half a chunk gets a chunk of its own.
- An allocation does not borrow its arena. It stays valid after the arena is reset or dropped, and may move to another thread.
- Dropping an allocation does not make its memory reusable. A chunk goes back to the child when the arena has been dropped or reset and the chunk's last allocation has dropped, on whichever thread drops it. A `List` that grows in an arena leaves its earlier buffers behind until then, and one long-lived allocation keeps its whole chunk.
- `arena.reset(ArenaReset.Release)` stops allocating from the current chunk. `arena.reset(ArenaReset.RetainCapacity)` keeps the current chunk for the next allocations when nothing in it is still alive, and otherwise acts like `Release`.
- `arena.available()` returns the bytes left in the current chunk.
- The child can be any provider, including another arena.

## Building collections

Application code should use `Box`, `List`, `Bytes` and `Shared`. Collection authors can build on lower layers:

- `silk/mem/layout`: `Layout.of<T>()`, `Layout.make(size, alignment)` and `Layout.repeat(layout, count)` describe storage to request.
- `silk/mem/raw_buffer`: `RawBuffer` operations view an `Intrinsic.Allocation` as typed storage for a counted number of elements.
- `silk/mem/slot`: `Slot` operations move one element in or out of a raw buffer.
- Most `RawBuffer` and `Slot` operations are `unsafe`. See Unsafe code and C interop and Intrinsics.

## Examples

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.mem.box { Box }
import silk.core.effect { Effect }
import silk.collections.list { List }

effect fn build() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut values = List<i32>.make()
  run List<i32>.append(&mut values, 10) |> Effect.provideMut<Allocator>(&mut allocator)
  run List<i32>.append(&mut values, 32) |> Effect.provideMut<Allocator>(&mut allocator)
  let slice = List<i32>.asSlice(&values)
  let sum = slice[0] + slice[1]
  let boxed = run Box<i32>.make(sum) |> Effect.provideMut<Allocator>(&mut allocator)
  if List<i32>.length(&values) != 2 {
    return 1
  }
  return Box<i32>.into(move boxed) - 42
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 100
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}
```

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.mem.shared { Shared }

struct Counter {
  value: i32,
}

effect fn useCell() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let cell = run Shared<Counter>.make(Counter { value: 40 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let alias = Shared<Counter>.clone(&cell)
  let step = 2
  let after = Shared<Counter>.withMut<i32>(
    &alias,
    fn(c: &mut Counter) -> i32 {
      c.value = c.value + step
      return c.value
    }
  )
  drop alias
  let seen = Shared<Counter>.with<i32>(
    &cell,
    fn(c: &Counter) -> i32 {
      return c.value
    }
  )
  if after != 42 {
    return 1
  }
  return seen - 42
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 100
}

pub fn main() -> i32 {
  return run Effect.catchAll(useCell(), recover)
}
```

An arena reused for three phases. Each phase's list is dropped before the reset, so `RetainCapacity` keeps the chunk. The `Box` made last outlives the arena. The program exits with 42:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.mem.arena { Arena, ArenaOptions, ArenaReset }
import silk.mem.box { Box }
import silk.core.effect { Effect }
import silk.collections.list { List }

effect fn phases() -> i32
  ! OutOfMemoryError {
  let options = ArenaOptions { firstChunkBytes: 1024, maximumChunkBytes: 4096 }
  let mut arena = Arena.withOptions(Allocator.systemAllocatorProvider(), move options)
  let mut total = 0
  let mut round = 0
  while round < 3 {
    let mut values = List<i32>.make()
    let mut at = 0
    while at < 10 {
      run List<i32>.append(&mut values, at) |> Effect.provideMut<Allocator>(&mut arena)
      at = at + 1
    }
    total = total + List<i32>.get(&values, 9)
    drop values
    arena.reset(ArenaReset.RetainCapacity)
    if arena.available() == 0 {
      return 2
    }
    round = round + 1
  }
  arena.reset(ArenaReset.Release)
  if arena.available() != 0 {
    return 3
  }
  let kept = run Box<i32>.make(15) |> Effect.provideMut<Allocator>(&mut arena)
  drop arena
  return total + kept.get()[0]
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(phases(), recover)
}
```

A provider that refuses every request, to test the failure path:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.mem.layout { Layout }
import silk.collections.list { List }

struct Refusing {}

impl Refusing {
  effect fn refuse(self: &mut Self, layout: Layout) -> Intrinsic.Allocation
    ! OutOfMemoryError {
    drop layout
    fail OutOfMemoryError {}
  }
}

impl Allocator for Refusing {
  allocate: Refusing.refuse
}

effect fn grow() -> i32
  ! OutOfMemoryError {
  let mut allocator = Refusing {}
  let mut values = List<i32>.make()
  run List<i32>.append(&mut values, 1) |> Effect.provideMut<Allocator>(&mut allocator)
  return 1
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(grow(), recover)
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0066 | An Effect's failures are not handled or declared |
| SEM0071 | An Effect's requirements (such as `&mut Allocator`) are not provided or declared |
| SEM0076 | Callable signature does not match, for example a `Shared.with` callback returning its reference |
| SEM0121 | `T: Copy` cannot be proved, for example `List.get` on a non-`Copy` element |
| OWN0016 | A `Shared` access callback reaches a `run` that could suspend while the access is held |

## See also

Ownership and moves · Borrowing · Closures and callable types · Unsafe code and C interop · Intrinsics · Effects and run · Typed failures · Services and providers · Program entry and termination · `silk/mem/allocator`, `silk/mem/arena`, `silk/mem/box`, `silk/collections/list`, `silk/mem/shared`, `silk/collections/bytes`, `silk/mem/layout`, `silk/mem/raw_buffer`, `silk/mem/slot`, `silk/core/effect`

## Open questions

- A reentrant `Shared` access traps with the message "division by zero", because the library implements its conflict trap as `1 / 0`.
