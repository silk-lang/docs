# Memory and storage

These members describe the size of a type, acquire and adopt allocations, and turn an allocation into typed storage: raw buffers of slots, a shared control block, and views of slices and strings. They sit under [`silk/mem/allocator`](/docs/std/mem-allocator), [`silk/mem/raw_buffer`](/docs/std/mem-raw-buffer), [`silk/mem/slot`](/docs/std/mem-slot), [`silk/mem/shared`](/docs/std/mem-shared) and [`silk/collections/slice`](/docs/std/collections-slice). Containers such as `List`, `Bytes` and `Box` are built from them.

## How the storage types fit together

- An `Intrinsic.Allocation` owns one block of memory and its `Layout`. Dropping it releases the block. It holds no values.
- `rawBufferFrom` turns an allocation into an `Intrinsic.RawBuffer<T>` of `count` slots. The buffer does not record which slots hold a value; the container that owns it keeps that record. Dropping the buffer releases the block but drops no value in it.
- `rawBufferSlot` selects one slot as an `Intrinsic.Slot<'storage, T>`, which borrows the buffer exclusively until one slot operation consumes it. Each slot operation changes the slot's state: `slotWrite` makes it initialized, `slotTake` and `slotDrop` make it uninitialized, and `slotCopy` and `slotAddress` leave it as it was.
- `sharedFromAllocation` turns an allocation into an `Intrinsic.SharedCore<T>`: one value and a handle count, behind every `Shared<T>` handle.

The types themselves are described under [Types](/docs/intrinsics/types).

### `Intrinsic.layoutOf`

```silk signature
fn layoutOf<T>() -> Layout
```

Returns the size in bytes and the alignment of one `T` on the target being built.

- Safe. Runtime code only: a `const` or `static if` that calls it directly is SEM0176 in v0.1.0-dev.82. The wrapper [`Layout.of`](/docs/std/mem-layout#Layout.impl.of) evaluates statically, so a `const` can compare a layout with a C header.
- `bytes` is a multiple of `alignment`, so an array of `T` has no gaps: element `i` starts at `i * bytes`. A zero-sized type has `bytes` 0.
- `Layout` is `silk.mem.layout.Layout`, a struct of `bytes` and `alignment`.
- Wrapper: [`Layout.of`](/docs/std/mem-layout#Layout.impl.of).

```silk
struct Header {
  tag: u8,
  length: u32,
}

pub fn main() -> i32 {
  let layout = Intrinsic.layoutOf<Header>()
  // The u32 is aligned to 4 bytes, so 3 bytes of padding follow the tag.
  if layout.alignment != 4 || layout.bytes != 8 {
    return 1
  }
  return 0
}
```

### `Intrinsic.fieldOffset`

```silk signature
static fn fieldOffset<Owner>(name: FieldName<Owner>) -> usize
```

Returns the byte offset of one field of the struct `Owner` on the target being checked, counted from the start of the struct.

- Static evaluation only: use it in a `const`, a `static if` or a `static fn`. Runtime code calls the wrapper with a literal field name, which is evaluated statically.
- `name` is a checked field name, so a name that `Owner` does not have is a compile error at the name.
- Wrapper: [`Layout.offsetOf`](/docs/std/mem-layout#Layout.impl.offsetOf), which takes the name as text: `Layout.offsetOf<Header>("length")`.

```silk
import silk.mem.layout { Layout }

struct Header {
  tag: u8,
  length: u32,
}

const lengthOffset: usize = Layout.offsetOf<Header>("length")

pub fn main() -> i32 {
  if lengthOffset != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.systemAllocationAcquire`

```silk signature
effect fn systemAllocationAcquire(layout: Layout) -> Allocation ! StorageFailure
```

Asks the process heap for a block of `layout.bytes` bytes aligned to `layout.alignment`, and returns it as an allocation that releases the block when dropped.

- Safe. The block's bytes are uninitialized.
- It fails with `Intrinsic.StorageFailure` when the heap refuses, when the alignment is not a power of two, or when the size cannot be padded to the alignment. It never returns part of a block.
- A zero-byte layout returns a valid allocation that may own no memory.
- Wrapper: the system provider of the [`Allocator`](/docs/std/mem-allocator#Allocator) service, which turns the failure into `OutOfMemoryError`. Most code asks the `Allocator` service, so that a test or an arena can provide other storage.

The call goes in an effect function of its own, and a caller catches the failure around that function, as the system allocator does:

```silk
import silk.mem.layout { Layout }

effect fn acquire(layout: Layout) -> Intrinsic.Allocation ! Intrinsic.StorageFailure {
  return run Intrinsic.systemAllocationAcquire(move layout)
}

effect fn refused(failure: Intrinsic.StorageFailure) -> Intrinsic.Allocation ! Intrinsic.StorageFailure {
  fail move failure
}

effect fn program() -> i32 ! Intrinsic.StorageFailure {
  let allocation = run Intrinsic.catchFailure<Intrinsic.StorageFailure>(acquire(Intrinsic.layoutOf<[u64; 4]>()), refused)
  let buffer = unsafe Intrinsic.rawBufferFrom<u64>(move allocation, 4)
  if Intrinsic.rawBufferCount<u64>(&buffer) != 4 {
    return 1
  }
  return 0
}

effect fn storageFailed(failure: Intrinsic.StorageFailure) -> i32 {
  drop failure
  return 2
}

pub effect fn main() -> i32 {
  return run Intrinsic.catchFailure<Intrinsic.StorageFailure>(program(), storageFailed)
}
```

Passing the `systemAllocationAcquire(...)` call straight to `catchFailure` is a compiler crash in v0.1.0-dev.82 ("a run value is not an exact Effect").

### `Intrinsic.allocationAdopt`

```silk signature
unsafe fn allocationAdopt(
  base: *mut u8,
  layout: Layout,
  reclaim: extern "C" fn(?*mut u8) -> (),
  context: ?*mut u8,
) -> Allocation
```

Wraps storage that the caller manages as an allocation. Dropping the allocation calls `reclaim(context)` exactly once instead of releasing system memory.

- Unsafe. The caller proves that `base` is aligned to `layout.alignment`, that `layout.bytes` bytes from `base` stay live and are used by nothing else until `reclaim` runs, and that `reclaim` is safe to call with `context` once.
- `reclaim` runs on the thread that drops the allocation. It receives `context`, not `base`, so `context` can name a larger block that `base` points into, such as a block over-allocated for alignment.
- [`Arena`](/docs/std/mem-arena) uses it for each allocation it hands out, and the system provider uses it for `allocateZeroed`.

```silk
export "C" fn releaseNothing(context: ?*mut u8) -> () as "example_release_nothing" {
  drop context
}

pub fn main() -> i32 {
  let mut storage: [u8; 16] = [0; 16]
  let bytes: &mut [u8] = &mut storage
  let many = unsafe Intrinsic.pointerRequalify<?[*]mut u8, [*]mut u8>(Intrinsic.pointerFromMutSlice<u8>(move bytes))
  let base = unsafe Intrinsic.pointerAtMut<u8>(many, 0)
  let reclaim: extern "C" fn(?*mut u8) -> () = releaseNothing
  // The array outlives the allocation, and dropping the allocation calls releaseNothing.
  let allocation = unsafe Intrinsic.allocationAdopt(base, Intrinsic.layoutOf<[u8; 16]>(), reclaim, Intrinsic.pointerNull<u8>())
  let mut buffer = unsafe Intrinsic.rawBufferFrom<u8>(move allocation, 16)
  unsafe Intrinsic.rawBufferFill(&mut buffer, 0, 16, 7)
  drop buffer
  if storage[15] != 7 {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferFrom`

```silk signature
unsafe fn rawBufferFrom<T>(allocation: Allocation, count: usize) -> RawBuffer<T>
```

Turns an allocation into a raw buffer of `count` slots of `T`. Every slot starts uninitialized.

- Unsafe. The caller proves that the allocation holds at least `count * Layout.of<T>().bytes` bytes and is aligned for `T`. `Layout.repeat(Layout.of<T>(), count)` gives a layout that fits.
- The buffer owns the allocation. Dropping it releases the storage and drops no value in it, so a container takes or drops every initialized slot first, or those values leak.
- Wrapper: [`RawBuffer.from`](/docs/std/mem-raw-buffer#RawBuffer.impl.from).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[i32; 3]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let buffer = unsafe Intrinsic.rawBufferFrom<i32>(move allocation, 3)
  if Intrinsic.rawBufferCount<i32>(&buffer) != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferEmpty`

```silk signature
fn rawBufferEmpty<T>() -> RawBuffer<T>
```

Returns a buffer of zero slots that owns no storage. Its address is aligned for `T` and is never read, and dropping it releases nothing.

- Safe. A container starts with it before its first allocation, and keeps one after it gives its storage away.

```silk
pub fn main() -> i32 {
  let empty = Intrinsic.rawBufferEmpty<u64>()
  if Intrinsic.rawBufferCount<u64>(&empty) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferCount`

```silk signature
fn rawBufferCount<T>(buffer: &RawBuffer<T>) -> usize
```

Returns the number of slots in the buffer: its capacity, not the number of initialized slots.

- Safe.
- Wrapper: [`RawBuffer.count`](/docs/std/mem-raw-buffer#RawBuffer.impl.count).

```silk
pub fn main() -> i32 {
  let buffer = Intrinsic.rawBufferEmpty<u8>()
  return Intrinsic.usizeToI32(Intrinsic.rawBufferCount<u8>(&buffer))
}
```

### `Intrinsic.rawBufferSlot`

```silk signature
unsafe fn rawBufferSlot<T>(buffer: &'storage mut RawBuffer<T>, index: usize) -> Slot<'storage, T>
```

Selects the slot at `index` for one slot operation. The slot borrows the buffer exclusively until a slot operation consumes it.

- An `index` that is not below the slot count traps; it never selects storage outside the buffer.
- Unsafe to call directly, because the slot does not know whether it is initialized and the slot operations trust the caller's record. The wrapper is safe, and the slot operations that need an initialized slot are unsafe instead.
- Lifetimes inside `T` are not part of the borrow.
- Wrapper: [`RawBuffer.slot`](/docs/std/mem-raw-buffer#RawBuffer.impl.slot).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[i32; 2]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<i32>(move allocation, 2)
  unsafe {
    Intrinsic.slotWrite<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 1), 42)
    if Intrinsic.slotTake<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 1)) != 42 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.rawBufferRead`

```silk signature
unsafe fn rawBufferRead<T: Copy>(buffer: &RawBuffer<T>, index: usize) -> T
```

Returns a copy of the value in the slot at `index`. The slot stays initialized.

- Unsafe. The caller proves that `index` is below the slot count and that the slot is initialized. There is no bounds check.
- If `T` is a reference, the copy keeps its own lifetime, also after the buffer is released.
- Wrapper: [`RawBuffer.read`](/docs/std/mem-raw-buffer#RawBuffer.impl.read).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocateZeroed(Intrinsic.layoutOf<[u32; 8]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let buffer = unsafe Intrinsic.rawBufferFrom<u32>(move allocation, 8)
  // Zeroed storage holds valid u32 values, so every slot is initialized.
  if unsafe Intrinsic.rawBufferRead<u32>(&buffer, 7) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferCopy`

```silk signature
unsafe fn rawBufferCopy<T>(destination: &mut RawBuffer<T>, offset: usize, source: &[T], length: usize) -> ()
```

Moves `length` values from `source` into the buffer, starting at slot `offset`, with one `memmove`.

- Unsafe. The caller proves that `offset + length` is within the slot count, that `length` is within `source`, and that the destination slots are uninitialized (their old values are not dropped, so they leak).
- The values move: the caller must not use or drop them at the source again, unless `T` is `Copy`.
- The ranges may overlap, as when a container shifts its own elements through a view of itself. The result is the same as a copy through a temporary buffer.
- Wrapper: [`RawBuffer.copy`](/docs/std/mem-raw-buffer#RawBuffer.impl.copy).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[u16; 4]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<u16>(move allocation, 4)
  let source: [u16; 3] = [10, 20, 30]
  let values: &[u16] = &source
  unsafe {
    Intrinsic.rawBufferCopy<u16>(&mut buffer, 1, values, 3)
    if Intrinsic.rawBufferRead<u16>(&buffer, 3) != 30 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.rawBufferFill`

```silk signature
unsafe fn rawBufferFill(buffer: &mut RawBuffer<u8>, offset: usize, length: usize, value: u8) -> ()
```

Sets `length` bytes of a byte buffer, starting at slot `offset`, to `value`, with one `memset`. Those slots are initialized afterwards.

- A range past the slot count traps; it never writes outside the buffer. The wrapper is safe for that reason.
- Only `RawBuffer<u8>` takes it: a byte value is valid in any `u8` slot.
- Wrapper: [`RawBuffer.fill`](/docs/std/mem-raw-buffer#RawBuffer.impl.fill).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[u8; 4]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<u8>(move allocation, 4)
  unsafe {
    Intrinsic.rawBufferFill(&mut buffer, 0, 4, 0xab)
    if Intrinsic.rawBufferRead<u8>(&buffer, 3) != 0xab {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.rawBufferResize`

```silk signature
unsafe fn rawBufferResize<T>(buffer: &mut RawBuffer<T>, count: usize) -> bool
```

Grows the buffer to `count` slots in place with `realloc`, keeping the values in its current slots. Returns `true` when it grew.

- Returns `false` and changes nothing when the buffer's storage did not come from the process heap (an arena or an adopted allocation), when it owns no storage, when `count` is below the current count, when `T` is zero-sized, when the size overflows, or when `realloc` refuses.
- Unsafe: `realloc` may move the block, so every pointer, slice or slot taken from the buffer before the call is dangling afterwards. Slots past the old count are uninitialized.
- The resize goes straight to the heap: an `Allocator` provider never sees it.
- Wrapper: [`RawBuffer.resize`](/docs/std/mem-raw-buffer#RawBuffer.impl.resize).

```silk
pub fn main() -> i32 {
  let mut empty = Intrinsic.rawBufferEmpty<u32>()
  // An empty buffer owns no heap storage, so it cannot grow in place.
  if unsafe Intrinsic.rawBufferResize<u32>(&mut empty, 8) {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferView`

```silk signature
unsafe fn rawBufferView<T>(buffer: &'a RawBuffer<T>, offset: usize, length: usize) -> &'a [T]
```

Returns a shared slice of `length` slots starting at slot `offset`, borrowing the buffer.

- Unsafe. The caller proves that the range is within the slot count and that every slot in it is initialized. There is no bounds check.
- Wrapper: [`RawBuffer.view`](/docs/std/mem-raw-buffer#RawBuffer.impl.view).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[u8; 3]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<u8>(move allocation, 3)
  unsafe Intrinsic.rawBufferFill(&mut buffer, 0, 3, 14)
  let values = unsafe Intrinsic.rawBufferView<u8>(&buffer, 0, 3)
  if values.length != 3 || values[0] + values[1] + values[2] != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.rawBufferViewMut`

```silk signature
unsafe fn rawBufferViewMut<T>(buffer: &'a mut RawBuffer<T>, offset: usize, length: usize) -> &'a mut [T]
```

Returns an exclusive slice of `length` slots starting at slot `offset`, borrowing the buffer exclusively.

- Unsafe, under the same rules as `rawBufferView`. Assigning through the slice drops the old value of each element, so every slot in the range must be initialized.
- Wrapper: [`RawBuffer.viewMut`](/docs/std/mem-raw-buffer#RawBuffer.impl.viewMut).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocateZeroed(Intrinsic.layoutOf<[i64; 2]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<i64>(move allocation, 2)
  let values = unsafe Intrinsic.rawBufferViewMut<i64>(&mut buffer, 0, 2)
  values[1] = 42
  if unsafe Intrinsic.rawBufferRead<i64>(&buffer, 1) != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.sliceCopy`

```silk signature
unsafe fn sliceCopy<T: Copy>(destination: &mut [T], offset: usize, source: &[T]) -> ()
```

Copies every element of `source` into `destination` starting at index `offset`, with one `memmove`.

- Unsafe. The caller proves that `offset + source.length` is within `destination.length`. There is no bounds check, so a range past the end writes outside the slice.
- `T` is `Copy`, so nothing is moved or dropped: the old destination elements are overwritten.
- The source and destination may overlap.

```silk
pub fn main() -> i32 {
  let mut target: [u8; 5] = [0; 5]
  let source: [u8; 2] = [7, 9]
  let into: &mut [u8] = &mut target
  let from: &[u8] = &source
  unsafe Intrinsic.sliceCopy<u8>(move into, 3, from)
  if target[3] != 7 || target[4] != 9 {
    return 1
  }
  return 0
}
```

### `Intrinsic.slotWrite`

```silk signature
unsafe fn slotWrite<T>(slot: Slot<'storage, T>, value: T) -> ()
```

Moves `value` into the selected slot, which becomes initialized.

- Unsafe. The slot should be uninitialized: if it holds a value, `slotWrite` overwrites it without dropping it, so that value leaks. A leak is not undefined behavior, which is why the wrapper is safe.
- `value` must have the slot type `T` with the same lifetimes.
- Wrapper: [`Slot.write`](/docs/std/mem-slot#Slot.impl.write).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<i32>(move allocation, 1)
  unsafe {
    Intrinsic.slotWrite<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0), 42)
    if Intrinsic.rawBufferRead<i32>(&buffer, 0) != 42 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.slotTake`

```silk signature
unsafe fn slotTake<T>(slot: Slot<'storage, T>) -> T
```

Moves the value out of the selected slot and returns it. The slot becomes uninitialized.

- Unsafe. The caller proves that the slot is initialized.
- The value keeps every lifetime inside `T`, but not the borrow of the buffer.
- Wrapper: [`Slot.take`](/docs/std/mem-slot#Slot.impl.take).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<i32>(move allocation, 1)
  unsafe {
    Intrinsic.slotWrite<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0), 7)
    let value = Intrinsic.slotTake<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0))
    if value != 7 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.slotDrop`

```silk signature
unsafe fn slotDrop<T>(slot: Slot<'storage, T>) -> ()
```

Drops the value in the selected slot in place. The slot becomes uninitialized. It is the only storage member that runs a value's drop.

- Unsafe. The caller proves that the slot is initialized; dropping an uninitialized slot runs a destructor on garbage.
- Wrapper: [`Slot.dropValue`](/docs/std/mem-slot#Slot.impl.dropValue).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<Bytes>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<Bytes>(move allocation, 1)
  let text = run Bytes.copy(b"owned") |> Effect.provideMut<Allocator>(&mut allocator)
  unsafe {
    Intrinsic.slotWrite<Bytes>(Intrinsic.rawBufferSlot<Bytes>(&mut buffer, 0), move text)
    // Releases the bytes the slot owns before the buffer goes away.
    Intrinsic.slotDrop<Bytes>(Intrinsic.rawBufferSlot<Bytes>(&mut buffer, 0))
  }
  return 0
}
```

### `Intrinsic.slotCopy`

```silk signature
unsafe fn slotCopy<T: Copy>(slot: Slot<'storage, T>) -> T
```

Returns a copy of the `Copy` value in the selected slot. The slot stays initialized.

- Unsafe. The caller proves that the slot is initialized.
- Wrapper: [`Slot.copy`](/docs/std/mem-slot#Slot.impl.copy).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<i32>(move allocation, 1)
  unsafe {
    Intrinsic.slotWrite<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0), 21)
    let first = Intrinsic.slotCopy<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0))
    let second = Intrinsic.slotCopy<i32>(Intrinsic.rawBufferSlot<i32>(&mut buffer, 0))
    if first + second != 42 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.slotAddress`

```silk signature
fn slotAddress<T>(slot: Slot<'storage, T>) -> *mut T
```

Returns the address of the selected slot as a non-null pointer, without reading or initializing it.

- Safe. The pointer holds no borrow and does not keep the storage alive. Each later access through it proves that the storage is still live, that the slot has the state the access needs, and that nothing else uses it.
- It consumes the selection, so the buffer is free to use again when it returns.
- Wrapper: [`Slot.address`](/docs/std/mem-slot#Slot.impl.address).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.layoutOf<[u64; 2]>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut buffer = unsafe Intrinsic.rawBufferFrom<u64>(move allocation, 2)
  let first = Intrinsic.slotAddress<u64>(unsafe Intrinsic.rawBufferSlot<u64>(&mut buffer, 0))
  let second = Intrinsic.slotAddress<u64>(unsafe Intrinsic.rawBufferSlot<u64>(&mut buffer, 1))
  unsafe Intrinsic.pointerWrite<u64>(second, 42)
  if Intrinsic.pointerAddress<*mut u64>(second) - Intrinsic.pointerAddress<*mut u64>(first) != 8 {
    return 1
  }
  if unsafe Intrinsic.rawBufferRead<u64>(&buffer, 1) != 42 {
    return 2
  }
  return 0
}
```

### `Intrinsic.sharedLayout`

```silk signature
fn sharedLayout<T>() -> Layout
```

Returns the size and alignment of the control block that `sharedFromAllocation<T>` needs: the handle count and one `T`.

- Safe. Allocate exactly this layout for `sharedFromAllocation`.

```silk
pub fn main() -> i32 {
  let block = Intrinsic.sharedLayout<u64>()
  // The block holds the count beside the value, so it is larger than the value alone.
  if block.bytes <= Intrinsic.layoutOf<u64>().bytes {
    return 1
  }
  return 0
}
```

### `Intrinsic.sharedFromAllocation`

```silk signature
unsafe fn sharedFromAllocation<T>(allocation: Allocation, value: T) -> SharedCore<T>
```

Moves `value` into `allocation`, sets the handle count to one, and returns the first handle.

- Unsafe. The caller proves that the allocation has exactly the layout `sharedLayout<T>()` returns.
- The core is local to one thread: `SharedCore<T>` is neither `Transferable` nor `Concurrent`. Dropping the last handle drops the value and releases the allocation.
- Wrapper: [`Shared.make`](/docs/std/mem-shared#Shared.impl.make), which allocates the block from the `Allocator` service.

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.sharedLayout<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let core = unsafe Intrinsic.sharedFromAllocation<i32>(move allocation, 42)
  let value = Intrinsic.sharedWithMut<i32, i32>(&core, |value: &mut i32| -> i32 { return value.* }, || -> i32 { return 0 })
  if value != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.sharedClone`

```silk signature
fn sharedClone<T>(self: &SharedCore<T>) -> SharedCore<T>
```

Returns another handle to the same value by adding one to the handle count. It does not allocate and does not touch the value.

- Safe. If the count is at its maximum, it traps before changing the count.
- Wrapper: [`Shared.clone`](/docs/std/mem-shared#Shared.impl.clone).

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.sharedLayout<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let first = unsafe Intrinsic.sharedFromAllocation<i32>(move allocation, 1)
  let second = Intrinsic.sharedClone<i32>(&first)
  // A change through one handle is seen through the other.
  Intrinsic.sharedWithMut<i32, ()>(&second, |value: &mut i32| -> () { value.* = 42 }, || -> () {})
  let seen = Intrinsic.sharedWithMut<i32, i32>(&first, |value: &mut i32| -> i32 { return value.* }, || -> i32 { return 0 })
  if seen != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.sharedWithMut`

```silk signature
fn sharedWithMut<T, A>(self: &SharedCore<T>, use: once fn(&mut T) -> A, onConflict: once fn() -> A) -> A
```

Calls `use` once with an exclusive borrow of the shared value and returns its result. If the value is already being accessed, for example because `use` reached it again through another handle, it calls `onConflict` instead and `use` never starts.

- Safe. The core marks the value as busy for the duration of `use`, so two exclusive borrows never overlap.
- The borrow cannot escape `use` and cannot stay live across a suspension.
- Wrapper: [`Shared.withMut`](/docs/std/mem-shared#Shared.impl.withMut), whose conflict callback traps.

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let allocation = run Allocator.allocate(Intrinsic.sharedLayout<i32>())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let core = unsafe Intrinsic.sharedFromAllocation<i32>(move allocation, 40)
  let other = Intrinsic.sharedClone<i32>(&core)
  let nested = Intrinsic.sharedWithMut<i32, i32>(&core, |value: &mut i32| -> i32 {
    value.* = value.* + 2
    // The value is busy, so the inner access takes the conflict path.
    return Intrinsic.sharedWithMut<i32, i32>(&other, |inner: &mut i32| -> i32 { return inner.* }, || -> i32 { return -1 })
  }, || -> i32 { return -2 })
  if nested != -1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.sliceView`

```silk signature
fn sliceView<T>(values: &'a [T], offset: usize, length: usize) -> &'a [T]
fn sliceView<T>(values: &'a mut [T], offset: usize, length: usize) -> &'a mut [T]
```

Returns the subrange `offset..offset + length` of a slice, with the same loan.

- Safe. An offset or length past the end traps with "slice range out of bounds", also when `offset + length` would overflow.
- Given a shared slice it returns a shared slice. Given an exclusive slice that the caller moves in, as in `sliceView<T>(move values, 1, 3)`, it returns an exclusive slice. Passing a `&mut [T]` binding without `move` is a compile error.
- Wrappers: [`Slice.view`](/docs/std/collections-slice#Slice.impl.view) and [`Slice.viewMut`](/docs/std/collections-slice#Slice.impl.viewMut).

```silk
pub fn main() -> i32 {
  let mut array: [i32; 5] = [1, 2, 3, 4, 5]
  let values: &[i32] = &array
  let middle = Intrinsic.sliceView<i32>(values, 1, 3)
  if middle.length != 3 || middle[0] != 2 {
    return 1
  }
  let writable: &mut [i32] = &mut array
  let tail = Intrinsic.sliceView<i32>(move writable, 3, 2)
  tail[1] = 50
  if array[4] != 50 {
    return 2
  }
  return 0
}
```

### `Intrinsic.replace`

```silk signature
fn replace<T>(place: T, value: T) -> T
```

Stores `value` in a mutable place and returns the value the place held before. Nothing is dropped and nothing is copied: the old value moves out and the new one moves in.

- Safe. `place` is written as a place expression, such as a `let mut` binding, a field or `reference.*`, and is not moved by the call.
- The type argument may be left out; it is the place's type.
- It is how a struct moves a field out from behind `&mut` while leaving a valid value behind.

```silk
struct Holder {
  current: i32,
}

pub fn main() -> i32 {
  let mut holder = Holder { current: 1 }
  let old = Intrinsic.replace(holder.current, 42)
  if old != 1 || holder.current != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.stringUtf8Bytes`

```silk signature
fn stringUtf8Bytes(value: string<'a>) -> &'a [u8]
```

Returns the UTF-8 bytes of a string, borrowing the same text. It copies nothing.

- Safe.
- Wrapper: [`String.utf8Bytes`](/docs/std/text-string#String.impl.utf8Bytes).

```silk
pub fn main() -> i32 {
  let bytes = Intrinsic.stringUtf8Bytes("Hé")
  // é takes two bytes in UTF-8.
  if bytes.length != 3 || bytes[0] != 0x48 || bytes[1] != 0xc3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.stringFromUtf8Unchecked`

```silk signature
unsafe fn stringFromUtf8Unchecked(bytes: &'a [u8]) -> string<'a>
```

Returns a string over bytes without checking them, borrowing the same bytes.

- Unsafe. The caller proves that `bytes` is valid UTF-8. Every string operation assumes it, so invalid bytes are undefined behavior, not an error.
- Wrapper: [`String.fromUtf8Unchecked`](/docs/std/text-string#String.impl.fromUtf8Unchecked). To check the bytes instead, use [`String.fromUtf8`](/docs/std/text-string#String.impl.fromUtf8), which returns an error for invalid input.

```silk
pub fn main() -> i32 {
  let bytes: [u8; 2] = [0x6f, 0x6b]
  let view: &[u8] = &bytes
  let text = unsafe Intrinsic.stringFromUtf8Unchecked(view)
  if !Intrinsic.stringEqualsExact(text, "ok") {
    return 1
  }
  return 0
}
```

### `Intrinsic.stringByteLength`

```silk signature
fn stringByteLength(value: string) -> usize
```

Returns the length of a string in UTF-8 bytes, not in characters.

- Safe.
- Wrapper: [`String.byteLength`](/docs/std/text-string#String.impl.byteLength).

```silk
pub fn main() -> i32 {
  if Intrinsic.stringByteLength("añ") != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.stringEqualsExact`

```silk signature
fn stringEqualsExact(left: string, right: string) -> bool
```

Returns whether two strings have exactly the same UTF-8 bytes. There is no Unicode normalization: `é` written as one code point differs from `e` followed by a combining accent.

- Safe.

```silk
pub fn main() -> i32 {
  if !Intrinsic.stringEqualsExact("silk", "silk") || Intrinsic.stringEqualsExact("silk", "Silk") {
    return 1
  }
  return 0
}
```

### `Intrinsic.wasmMemorySize`

```silk signature
fn wasmMemorySize() -> usize
```

Returns the size of the WebAssembly linear memory in 64 KiB pages (`memory.size`).

- Safe. Only a wasm32 build lowers it; on any other target a reachable call is SEM0093, so put it under `static if Intrinsic.targetArchitecture() == "wasm32"`.
- The wasm heap in `silk/platform/wasm/heap` uses it to find the end of memory.

```silk check target=wasm32-unknown-unknown
pub fn main() -> i32 {
  let pages = Intrinsic.wasmMemorySize()
  if pages == 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.wasmMemoryGrow`

```silk signature
fn wasmMemoryGrow(pages: usize) -> usize
```

Grows the WebAssembly linear memory by `pages` 64 KiB pages (`memory.grow`) and returns its previous size in pages, or `usize.MAX` when it cannot grow.

- Safe: growing memory never invalidates existing addresses. The new pages read as zero.
- Only a wasm32 build lowers it.

```silk check target=wasm32-unknown-unknown
import silk.num.usize

pub fn main() -> i32 {
  let before = Intrinsic.wasmMemoryGrow(1)
  if before == usize.MAX {
    return 1
  }
  if Intrinsic.wasmMemorySize() != before + 1 {
    return 2
  }
  return 0
}
```
