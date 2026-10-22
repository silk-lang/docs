Explicit per-instance storage for compiler-private execution frames.

## Details

Each state owns its limit, accounting and reservations. There is no shared counter or
environment lookup. Allocation and release use the selected target's declared allocator.

## Gotchas

Raw frame access is unsafe. A frame is valid only until release or destruction of its state.
One state requires exclusive use; independent states can use a concurrent host allocator.

Import as `ExecutionStorage` with `import silk.execution_storage { ExecutionStorage }`.

Public declarations: 1.

::Anchor{id="ExecutionStorage"}

## `ExecutionStorage`

```silk
pub struct ExecutionStorage
```

An affine state that owns its private-frame reservations and capacity limit.

::Anchor{id="ExecutionStorage.impl.Drop"}

## Implementation `Drop for ExecutionStorage`

```silk
impl Drop for ExecutionStorage
```

::Anchor{id="ExecutionStorage.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut ExecutionStorage) -> ()
```

::Anchor{id="ExecutionStorage.impl"}

## Implementation `ExecutionStorage`

```silk
impl ExecutionStorage
```

::Anchor{id="ExecutionStorage.impl.make"}

### Associated function `make`

```silk
pub effect fn make(limit: usize) -> ExecutionStorage ! OutOfMemoryError
```

Creates an independent state whose frame reservations can charge at most `limit` bytes.

#### Details

Charges include each reservation header and alignment padding. The fixed state allocation
is excluded. Refusal acquires no state and reports OutOfMemoryError.

::Anchor{id="ExecutionStorage.impl.used"}

### Method `used`

```silk
pub fn used(self: &ExecutionStorage) -> usize
```

Returns the bytes charged to this state's current frame reservations.

::Anchor{id="ExecutionStorage.impl.acquire"}

### Method `acquire`

```silk
pub unsafe fn acquire(self: &mut ExecutionStorage, size: usize, alignment: usize) -> ?*mut u8
```

Acquires a fixed-address frame or returns null without retaining a partial reservation.

#### Gotchas

The caller must initialize bytes before reading, obey the requested extent, and stop using
the pointer before release or state destruction. A zero size or invalid alignment returns null.

::Anchor{id="ExecutionStorage.impl.release"}

### Method `release`

```silk
pub unsafe fn release(self: &mut ExecutionStorage, frame: ?*mut u8) -> ()
```

Releases one frame acquired from this state and removes its charge.

#### Gotchas

The caller must finish semantic cleanup and stop every access before releasing the frame.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`, `wasm32-unknown-unknown`.
