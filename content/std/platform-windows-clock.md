Windows wall and monotonic clocks without a C runtime.

## When to use
Native clock providers use [`WindowsClock`](#WindowsClock) for reads, resolution, and blocking waits.
Application code supplies `OsSystemClock` or `OsMonotonicClock` through the portable services.

Import as `WindowsClock` with `import silk.platform.windows.clock { WindowsClock }`.

Public declarations: 1.

::Anchor{id="WindowsClock"}

## `WindowsClock`

```silk
pub struct WindowsClock
```

Windows clock operations. Failed or invalid counter reads trap; waits block the host thread.
Wall time uses the Unix epoch and can move backwards. Monotonic time includes system suspend.

::Anchor{id="WindowsClock.impl"}

## Implementation `WindowsClock`

```silk
impl WindowsClock
```

::Anchor{id="WindowsClock.impl.now"}

### Associated function `now`

```silk
pub effect fn now(monotonic: bool) -> Instant
```

Returns QPC monotonic time if `monotonic` is true, otherwise precise Unix wall time.
Failed or negative counter reads and nonpositive frequencies trap.

::Anchor{id="WindowsClock.impl.resolution"}

### Associated function `resolution`

```silk
pub effect fn resolution(monotonic: bool) -> u64
```

Returns nominal resolution in nanoseconds: a QPC tick rounded up, or FILETIME's 100 ns unit.
This describes representation granularity, not accuracy. A failed frequency query traps.

::Anchor{id="WindowsClock.impl.waitUntil"}

### Associated function `waitUntil`

```silk
pub effect fn waitUntil(when: Instant) -> ()
```

Blocks the host thread until the nonnegative monotonic deadline is reached.

#### Details

Each finite `Sleep` rounds the remaining duration up to milliseconds. After waking, the
clock is reread against the original deadline, including after an early wake or a capped
timeout. No fiber cancellation or scheduling is provided. Negative deadlines trap.

Category: Windows platform.

Profiles: `x86_64-pc-windows-msvc`.
