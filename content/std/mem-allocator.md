The `Allocator` service: the source of owned heap storage in the standard library.

## When to use
Each operation that makes owned storage (such as `Bytes.copy`, `List.push` or `Arc.make`)
requires `&mut Allocator`. Provide it one time, near the top of the program, with
[`Allocator.systemAllocatorProvider`](#Allocator.impl.systemAllocatorProvider).

## Details
[`Allocator`](#Allocator) is a normal service. The requirement stays in the `Effect` until a caller provides
it. Thus a test or an application can use a different allocator for one part of the code.

## Errors
[`OutOfMemoryError`](#OutOfMemoryError) when the allocator cannot supply the storage. A failed request never
returns part of an allocation.

## Examples
### Provide the system allocator
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }

// The requirement `? &mut Allocator` stays open until a caller provides it.
effect fn greeting() -> Bytes
  ! OutOfMemoryError
  ? &mut Allocator {
  return run Bytes.copy(b"Silk")
}

effect fn program() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let bytes = run greeting() |> Effect.provideMut<Allocator>(&mut allocator)
  if Bytes.length(&bytes) != 4 {
    return 1
  }
  return 0
}

effect fn outOfMemory(error: OutOfMemoryError) -> i32 {
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), outOfMemory)
}
```

Import as `Allocator` with `import silk.mem.allocator { Allocator }`.

Public declarations: 3.

::Anchor{id="OutOfMemoryError"}

## `OutOfMemoryError`

```silk
pub struct OutOfMemoryError
```

The failure when an allocator cannot supply the requested storage.

### Details

A failed request never returns part of an allocation. Each operation that makes owned storage,
such as `List.push` or `Box.make`, can fail with this error.

::Anchor{id="OutOfMemoryError.impl.Debug"}

## Implementation `Debug for OutOfMemoryError`

```silk
impl Debug for OutOfMemoryError
```

::Anchor{id="OutOfMemoryError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes `OutOfMemoryError`.

::Anchor{id="Allocator"}

## `Allocator`

```silk
pub service Allocator
```

A mutable service that supplies owned storage for a `Layout`.

### When to use

Each operation that makes owned storage (such as `Bytes.copy`, `List.push` or `Arc.make`)
requires `&mut Allocator`. Provide it one time, near the top of the program, with
[`Allocator.systemAllocatorProvider`](#Allocator.impl.systemAllocatorProvider).

### Details

`Allocator` is a normal service. The requirement stays in the `Effect` until a caller provides
it. Thus a test or an application can use a different allocator, such as an arena, for one
part of the code.

### Errors

- [`OutOfMemoryError`](#OutOfMemoryError) when the allocator cannot supply the storage. A failed request never
  returns part of an allocation.

::Anchor{id="Allocator.allocate"}

### Operation `allocate`

```silk
effect fn allocate(layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError ? &mut Allocator
```

Returns one allocation for `layout`, or fails with no partial storage.

::Anchor{id="Allocator.allocateZeroed"}

### Operation `allocateZeroed`

```silk
effect fn allocateZeroed(layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError ? &mut Allocator
```

Returns one allocation for `layout` whose bytes all start as zero, or fails with no partial
storage.

#### When to use

Use it for large tables that must start as zero, such as caches whose empty entries are zero
bytes, in place of `allocate` followed by a fill.

#### Details

Every provider answers it. The system provider asks the process heap for zeroed storage
(`calloc`, or `HeapAlloc` with `HEAP_ZERO_MEMORY` on Windows), which returns fresh pages from
the operating system without writing them, so pages that are never touched cost nothing. A
provider that hands out reused storage writes the zeros itself. A provider that wraps another
one forwards the request so the zeros stay free.

#### Errors

- [`OutOfMemoryError`](#OutOfMemoryError) when the allocator cannot supply the storage.

#### Examples
##### A zeroed table of counters
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.mem.layout { Layout }
import silk.mem.raw_buffer { RawBuffer }
import silk.core.effect { Effect }

effect fn first() -> u64 ! OutOfMemoryError ? &mut Allocator {
  let allocation = run Allocator.allocateZeroed(Layout { bytes: 4096 * 8, alignment: 8 })
  let counters = unsafe RawBuffer.from<u64>(move allocation, 4096)
  return unsafe RawBuffer.read<u64>(&counters, 4095)
}

effect fn program() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let value = run first() |> Effect.provideMut<Allocator>(&mut allocator)
  if value != 0 { return 1 }
  return 0
}

effect fn outOfMemory(error: OutOfMemoryError) -> i32 {
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), outOfMemory)
}
```

::Anchor{id="Allocator.growsInPlace"}

### Operation `growsInPlace`

```silk
effect fn growsInPlace() -> bool ? &mut Allocator
```

Returns whether storage this provider allocated from the process heap may grow in place,
without a new `allocate` request.

#### Details

The default is false, so a provider that wraps [`Allocator.systemAllocatorProvider`](#Allocator.impl.systemAllocatorProvider) to
count, limit or audit requests sees every growth as a new request. The Windows system
provider returns false. Other system providers return true and let `List` grow with `realloc`.

::Anchor{id="Allocator.takeBlock"}

### Operation `takeBlock`

```silk
unsafe effect fn takeBlock(layout: Layout) -> ?*mut u8 ? &mut Allocator
```

Returns a block of at least `layout.bytes` bytes, aligned to `layout.alignment`, that the
provider keeps ready, or null when it has none.

#### When to use

Use it on a hot path that makes many small cells and knows how its provider frees them,
before falling back to [`Allocator.allocate`](#Allocator.allocate) on null.

#### Details

Every provider answers it. A pooling provider can hand out a free block here without the
owner record of an `Intrinsic.Allocation`; a provider that keeps no blocks ready, such as
the system provider or one that counts or refuses requests, returns null.

#### Gotchas

The block is uninitialized and has no owner. The caller must return it the way its
provider documents; dropping the pointer leaks the block.

#### Examples
##### The system provider keeps no blocks ready
```silk
import silk.mem.allocator { Allocator }
import silk.mem.layout { Layout }
import silk.mem.pointer { Pointer }
import silk.core.effect { Effect }

effect fn ready() -> bool ? &mut Allocator {
  let block = run unsafe Allocator.takeBlock(Layout { bytes: 32, alignment: 16 })
  return !Pointer.isNull<u8>(block)
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  if run ready() |> Effect.provideMut<Allocator>(&mut allocator) {
    return 1
  }
  return 0
}
```

::Anchor{id="Allocator.impl"}

## Implementation `Allocator`

```silk
impl Allocator
```

::Anchor{id="Allocator.impl.outOfMemory"}

### Associated function `outOfMemory`

```silk
pub effect fn outOfMemory() -> never ! OutOfMemoryError
```

Fails at once with `OutOfMemoryError`.

#### When to use
Use it when a size calculation overflows, so that the caller sees the normal allocation
failure.

::Anchor{id="Allocator.impl.systemAllocatorProvider"}

### Associated function `systemAllocatorProvider`

```silk
pub fn systemAllocatorProvider() -> SystemAllocator
```

Returns a provider that uses the process heap. It does not allocate.

#### When to use

Provide it one time, near the top of the program, to satisfy the `&mut Allocator`
requirement of each operation that makes owned storage.

::Anchor{id="SystemAllocator"}

## `SystemAllocator`

```silk
pub struct SystemAllocator
```

The process-heap provider for [`Allocator`](#Allocator). It has no state.

::Anchor{id="SystemAllocator.impl"}

## Implementation `SystemAllocator`

```silk
impl SystemAllocator
```

::Anchor{id="SystemAllocator.impl-2"}

## Implementation `SystemAllocator`

```silk
impl SystemAllocator
```

::Anchor{id="SystemAllocator.impl.Allocator"}

## Implementation `Allocator for SystemAllocator`

```silk
impl Allocator for SystemAllocator
```

::Anchor{id="SystemAllocator.impl.Allocator.allocate"}

### Operation `allocate`

```silk
allocate: SystemAllocator.systemAllocate
```

::Anchor{id="SystemAllocator.impl.Allocator.allocateZeroed"}

### Operation `allocateZeroed`

```silk
allocateZeroed: SystemAllocator.systemAllocateZeroed
```

::Anchor{id="SystemAllocator.impl.Allocator.growsInPlace"}

### Operation `growsInPlace`

```silk
effect fn growsInPlace(self: &mut Self) -> bool ? &mut Allocator
```

::Anchor{id="SystemAllocator.impl.Allocator.takeBlock"}

### Operation `takeBlock`

```silk
unsafe effect fn takeBlock(self: &mut Self, layout: Layout) -> ?*mut u8 ? &mut Allocator
```

Category: Memory.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
