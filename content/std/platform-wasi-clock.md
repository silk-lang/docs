WASI wall-clock and monotonic-clock operations.

## Details
A host failure traps. Clock waits block the command until the host reports the deadline.

Import as `WasiClock` with `import silk.platform.wasi.clock { WasiClock }`.

Public declarations: 1.

::Anchor{id="WasiClock"}

## `WasiClock`

```silk
pub struct WasiClock
```

WASI clock operations. A host failure or an invalid clock result traps.

::Anchor{id="WasiClock.impl"}

## Implementation `WasiClock`

```silk
impl WasiClock
```

::Anchor{id="WasiClock.impl.now"}

### Associated function `now`

```silk
pub effect fn now(monotonic: bool) -> Instant
```

Returns monotonic time when `monotonic` is true, otherwise Unix time.
A host failure traps.

::Anchor{id="WasiClock.impl.resolution"}

### Associated function `resolution`

```silk
pub effect fn resolution(monotonic: bool) -> u64
```

Returns the selected clock's resolution in nanoseconds. Zero or a host failure traps.

::Anchor{id="WasiClock.impl.waitUntil"}

### Associated function `waitUntil`

```silk
pub effect fn waitUntil(when: Instant) -> ()
```

Blocks until the monotonic deadline. A negative or unrepresentable deadline traps.
Interrupted waits keep the same deadline. A host failure traps.

Category: Native platform.

Profiles: `wasm32-wasip1`, `wasm32-wasip2`.
