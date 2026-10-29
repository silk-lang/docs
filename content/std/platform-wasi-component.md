Memory and polling operations shared by WASI Preview 2 providers.

## Details
These types use the wasm32 canonical ABI. Imported lists use the same allocator as Silk and
their owners release the allocation. Pollable owners release their resource exactly once.

Import as `wasi_component` with `import silk.platform.wasi.component as wasi_component`.

Public declarations: 6.

::Anchor{id="ResultArea"}

## `ResultArea`

```silk
pub extern "C" struct ResultArea
```

An aligned, initialized result area for canonical results up to 128 bytes.

::Anchor{id="address"}

## `address`

```silk
pub fn address<T>(value: &mut T) -> u32
```

Returns the wasm32 address of a live value. The caller keeps the value alive through the call.

::Anchor{id="byte"}

## `byte`

```silk
pub unsafe fn byte<T>(value: &T, offset: usize) -> u8
```

Reads a byte of an initialized foreign record. `offset` must be inside its storage.

::Anchor{id="ResultArea.impl"}

## Implementation `ResultArea`

```silk
impl ResultArea
```

::Anchor{id="ResultArea.impl.make"}

### Associated function `make`

```silk
pub fn make() -> ResultArea
```

Makes a zeroed canonical result area, aligned to eight bytes.

::Anchor{id="ResultArea.impl.byte"}

### Method `byte`

```silk
pub fn byte(self: &Self, offset: usize) -> u8
```

Reads one initialized byte. `offset` must be below 128.

::Anchor{id="ResultArea.impl.word16"}

### Method `word16`

```silk
pub fn word16(self: &Self, offset: usize) -> u16
```

Reads one little-endian 16-bit integer. `offset` must be at most 126.

::Anchor{id="ResultArea.impl.word32"}

### Method `word32`

```silk
pub fn word32(self: &Self, offset: usize) -> u32
```

Reads one little-endian 32-bit integer. `offset` must be at most 124.

::Anchor{id="ResultArea.impl.word64"}

### Method `word64`

```silk
pub fn word64(self: &Self, offset: usize) -> u64
```

Reads one little-endian 64-bit integer. `offset` must be at most 120.

::Anchor{id="Pollable"}

## `Pollable`

```silk
pub struct Pollable
```

An owned WASI pollable. Drop releases the resource; it must precede its parent resource.

::Anchor{id="expired"}

## `expired`

```silk
pub effect fn expired(deadline: &Option<Instant>) -> bool ? &mut MonotonicClock
```

Whether an optional absolute deadline has expired on the supplied monotonic clock.

::Anchor{id="Pollable.impl"}

## Implementation `Pollable`

```silk
impl Pollable
```

::Anchor{id="Pollable.impl.take"}

### Associated function `take`

```silk
pub unsafe fn take(handle: u32) -> Pollable
```

Takes ownership of a live pollable handle. The caller must surrender its previous owner.

::Anchor{id="Pollable.impl.wait"}

### Method `wait`

```silk
pub effect fn wait(self: &Self, deadline: &Option<Instant>) -> bool ? &mut MonotonicClock
```

Waits for readiness, returning false when the deadline on the supplied clock expires.
With no deadline the host blocks directly. With a deadline readiness is checked at most
one millisecond apart, using the supplied clock for both time and waiting.

::Anchor{id="Pollable.impl.Drop"}

## Implementation `Drop for Pollable`

```silk
impl Drop for Pollable
```

::Anchor{id="Pollable.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="StreamResult"}

## `StreamResult`

```silk
pub extern "C" struct StreamResult
```

An owned canonical `result<list<u8>, stream-error>`, initialized before a stream read.
Drop releases the returned buffer or error resource. Read fields only through its methods.

::Anchor{id="StreamResult.impl"}

## Implementation `StreamResult`

```silk
impl StreamResult
```

::Anchor{id="StreamResult.impl.make"}

### Associated function `make`

```silk
pub fn make() -> StreamResult
```

Initializes storage for a host read. Pass its address as the indirect return argument.

::Anchor{id="StreamResult.impl.succeeded"}

### Method `succeeded`

```silk
pub fn succeeded(self: &Self) -> bool
```

Whether the host returned bytes rather than a stream error.

::Anchor{id="StreamResult.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

The byte count of a successful result. Call only after `succeeded` returns true.

::Anchor{id="StreamResult.impl.ended"}

### Method `ended`

```silk
pub fn ended(self: &Self) -> bool
```

Whether the host reported that the stream ended.

::Anchor{id="StreamResult.impl.copyTo"}

### Method `copyTo`

```silk
pub fn copyTo(self: &Self, output: &mut [u8]) -> usize
```

Copies the returned bytes into `output`. The host result must be a successful read of at
most `output.length` bytes; an invalid host count traps before memory is accessed.

::Anchor{id="StreamResult.impl.Drop"}

## Implementation `Drop for StreamResult`

```silk
impl Drop for StreamResult
```

::Anchor{id="StreamResult.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

Category: Native platform.

Profiles: `wasm32-wasip2`.
