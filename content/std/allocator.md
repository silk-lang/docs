Foundational allocation service used by higher standard-library actors.

## When to use
Provide [`Allocator`](#Allocator) to operations that may create owned storage, normally with
[`SystemAllocator`](#SystemAllocator).

## Details
[`Allocator`](#Allocator) is an ordinary source-declared service. Its requirement remains in an Effect
until a caller supplies a provider, so tests and applications can replace the process-backed
implementation lexically. Allocation failure is typed as [`OutOfMemoryError`](#OutOfMemoryError).

## Examples
### Provide the process allocator
```silk
import silk.allocator { Allocator, OutOfMemoryError }

import silk.bytes { Bytes }

import silk.effect { Effect }

import silk.usize

effect fn copyMessage() -> i32
! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let source = b"Silk"
  let mut copying = Bytes.copy(&source)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let bytes = run copying
  return Bytes.length(&bytes)
    |> usize.toI32
}

effect fn recoverAllocation(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(copyMessage(), recoverAllocation)
}
```

Import as `Allocator` with `import silk.allocator { Allocator }`.

Public declarations: 3.

::Anchor{id="OutOfMemoryError"}

## `OutOfMemoryError`

```silk
pub struct OutOfMemoryError
```

A failure that reports that an allocator cannot satisfy a storage request.

::Anchor{id="Allocator"}

## `Allocator`

```silk
pub service Allocator
```

A mutable service that acquires owned storage described by a layout.

::Anchor{id="Allocator.allocate"}

### Operation `allocate`

```silk
effect fn allocate(layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError ? &mut Allocator
```

Acquires one allocation for `layout`, or fails without returning partial storage.

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

Fails immediately with `OutOfMemoryError`.

#### When to use

Use this function to translate a checked size failure into the standard allocation failure.

::Anchor{id="Allocator.impl.systemAllocatorProvider"}

### Associated function `systemAllocatorProvider`

```silk
pub fn systemAllocatorProvider() -> SystemAllocator
```

Creates a process-backed allocator provider without allocating storage.

::Anchor{id="SystemAllocator"}

## `SystemAllocator`

```silk
pub struct SystemAllocator
```

A process-backed provider for [`Allocator`](#Allocator).

::Anchor{id="SystemAllocator.impl"}

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

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
