A bump allocator over chunks it acquires from another allocator.

## When to use
Provide an [`Arena`](#Arena) for `Allocator` when a phase of a program makes many allocations with
similar lifetimes, such as building a tree that is dropped all at once. Every container that
allocates through `Allocator`, such as `List`, `Bytes`, `Box` and `Shared`, works in it
unchanged.

## Details
[`Arena`](#Arena) owns a child provider, passed to [`make`](#Arena.impl.make), and asks it for chunks. An allocation bumps
a cursor through the current chunk and calls nothing else. Each chunk counts its live
allocations, so dropping an allocation is one atomic decrement and returns no memory by itself.

An allocation never borrows its arena. Dropping or resetting the arena returns every chunk that
no live allocation points into to the child at once; a chunk that still holds a live allocation
is returned when its last allocation drops, on whichever thread drops it.

## Gotchas
Memory freed inside a chunk is not reused: a `List` that grows in an arena leaves each earlier
buffer behind until the whole chunk is free. One long-lived allocation keeps its whole chunk
alive. Requests larger than half a chunk get a chunk of their own.

## Examples
### Build a list in an arena
```silk
import silk.allocator { Allocator, OutOfMemoryError }

import silk.arena { Arena }

import silk.effect { Effect }

import silk.list { List }

effect fn build() -> i32
! OutOfMemoryError {
  let mut arena = Arena.make(Allocator.systemAllocatorProvider())
  let mut values = List<i32>.make()
  run List<i32>.append(&mut values, 40)
    |> Effect.provideMut<Allocator>(&mut arena)
  run List<i32>.append(&mut values, 2)
    |> Effect.provideMut<Allocator>(&mut arena)
  return List<i32>.get(&values, 0) + List<i32>.get(&values, 1)
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}
```

Import as `Arena` with `import silk.arena { Arena }`.

Public declarations: 3.

::Anchor{id="ArenaOptions"}

## `ArenaOptions`

```silk
pub struct ArenaOptions
```

The chunk sizes an [`Arena`](#Arena) uses.

::Anchor{id="ArenaOptions.firstChunkBytes"}

### Field `firstChunkBytes`

```silk
pub firstChunkBytes: usize
```

The size in bytes of the first chunk.

::Anchor{id="ArenaOptions.maximumChunkBytes"}

### Field `maximumChunkBytes`

```silk
pub maximumChunkBytes: usize
```

The largest size in bytes a regular chunk grows to. Each new chunk doubles the previous one
up to this size.

::Anchor{id="ArenaOptions.impl"}

## Implementation `ArenaOptions`

```silk
impl ArenaOptions
```

::Anchor{id="ArenaOptions.impl.default"}

### Associated function `default`

```silk
pub fn default() -> ArenaOptions
```

Returns the default sizes: a 4 KiB first chunk that doubles up to 1 MiB.

::Anchor{id="ArenaReset"}

## `ArenaReset`

```silk
pub enum ArenaReset
```

What [`Arena.reset`](#Arena.impl.reset) does with the current chunk.

::Anchor{id="ArenaReset.Release"}

### `Release`

```silk
Release
```

Retires the current chunk; it is returned to the child once no allocation points into it.

::Anchor{id="ArenaReset.RetainCapacity"}

### `RetainCapacity`

```silk
RetainCapacity
```

Keeps the current chunk for the next allocations when no allocation points into it, and
otherwise retires it like `Release`.

::Anchor{id="Arena"}

## `Arena`

```silk
pub struct Arena<A>
```

A bump allocator that provides `Allocator` from chunks of a child provider `A`.

### When to use

Provide an arena for `Allocator` when a phase of a program makes many allocations with similar
lifetimes, such as building a tree that is dropped all at once. Every container that allocates
through `Allocator`, such as `List`, `Bytes`, `Box` and `Shared`, works in it unchanged.

### Details

The arena owns its child and asks it for chunks. An allocation bumps a cursor through the
current chunk and calls nothing else. Each chunk counts its live allocations, so dropping an
allocation is one atomic decrement and returns no memory by itself.

An allocation never borrows its arena. Dropping or resetting the arena returns to the child at
once each chunk that no live allocation points into. A chunk that still holds a live allocation
is returned when its last allocation drops, on whichever thread drops it.

Allocation failure is the child's: the arena fails with `OutOfMemoryError` only when the child
refuses a chunk.

### Gotchas

Memory freed inside a chunk is not reused: a `List` that grows in an arena leaves each earlier
buffer behind until the whole chunk is free. One long-lived allocation keeps its whole chunk
alive. Requests larger than half a chunk get a chunk of their own.

::Anchor{id="Arena.impl.Transferable"}

## Implementation `Transferable for Arena<A>`

```silk
impl<A: Transferable> Transferable for Arena<A>
```

::Anchor{id="Arena.impl"}

## Implementation `Arena<A>`

```silk
impl<A> Arena<A>
```

::Anchor{id="Arena.impl.make"}

### Associated function `make`

```silk
pub fn make(child: A) -> Arena<A>
```

Creates an arena over `child` with the default chunk sizes. It allocates nothing until the
first request.

::Anchor{id="Arena.impl.withOptions"}

### Associated function `withOptions`

```silk
pub fn withOptions(child: A, options: ArenaOptions) -> Arena<A>
```

Creates an arena over `child` with explicit chunk sizes. It allocates nothing until the first
request.

::Anchor{id="Arena.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self, mode: ArenaReset) -> ()
```

Stops allocating from the current chunk.

#### Details

Allocations made before the reset stay valid. Their chunk is returned to the child when the
last of them drops, or now when none is alive. With `ArenaReset.RetainCapacity`, a current
chunk that no allocation points into stays for the next allocations.

#### Gotchas

One long-lived allocation keeps its whole chunk alive after the reset.

::Anchor{id="Arena.impl.available"}

### Method `available`

```silk
pub fn available(self: &Self) -> usize
```

Returns the bytes left in the current chunk before the arena asks its child for another.

::Anchor{id="Arena.impl.Allocator"}

## Implementation `Allocator for Arena<A>`

```silk
impl<A> Allocator for Arena<A>
where &mut A provides &Allocator from &mut Allocator
```

::Anchor{id="Arena.impl.Allocator.allocate"}

### Operation `allocate`

```silk
effect fn allocate(self: &mut Self, layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError
```

::Anchor{id="Arena.impl.Drop"}

## Implementation `Drop for Arena<A>`

```silk
impl<A> Drop for Arena<A>
```

::Anchor{id="Arena.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Arena<A>) -> ()
```

Category: Memory.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
