Process-heap storage for the Windows runtime and the system allocator.

## When to use
Use `Allocator.systemAllocatorProvider` for owned application storage. `WindowsHeap` supplies
raw runtime storage and adopted allocations without a C runtime.

Import as `WindowsHeap` with `import silk.platform.windows.heap { WindowsHeap }`.

Public declarations: 1.

::Anchor{id="WindowsHeap"}

## `WindowsHeap`

```silk
pub struct WindowsHeap
```

Storage from the process heap, with no C runtime dependency.

::Anchor{id="WindowsHeap.impl"}

## Implementation `WindowsHeap`

```silk
impl WindowsHeap
```

::Anchor{id="WindowsHeap.impl.acquire"}

### Associated function `acquire`

```silk
pub fn acquire(size: usize) -> ?*mut u8
```

Returns uninitialized storage aligned to 16 bytes, or null on failure. A zero size allocates one byte.

#### Gotchas

Release a successful result exactly once with `WindowsHeap.release`, after all access ends.

::Anchor{id="WindowsHeap.impl.release"}

### Associated function `release`

```silk
pub unsafe fn release(memory: ?*mut u8) -> ()
```

Releases storage from `WindowsHeap.acquire`. Null does nothing.

#### Gotchas

`memory` must be null or an unreleased result from `WindowsHeap.acquire`. No access can remain.

::Anchor{id="WindowsHeap.impl.allocate"}

### Associated function `allocate`

```silk
pub effect fn allocate(layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError
```

Returns owned storage for `layout`, including alignments greater than 16 bytes.

#### Errors

- `OutOfMemoryError` if alignment is invalid, size arithmetic overflows, or the heap refuses storage.

Category: Windows platform.

Profiles: `x86_64-pc-windows-msvc`.
