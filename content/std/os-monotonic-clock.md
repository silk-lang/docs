Native monotonic clock provider with source-derived relative waiting.

## When to use
Construct [`OsMonotonicClock`](#OsMonotonicClock) at a native application edge for elapsed-time measurement and
blocking deadlines. Use a scripted provider when tests need virtual advancement.

## Details
Construction performs no host call. Reads, resolution queries, and absolute waits use selected
ordinary libc declarations and source-owned policy. `waitFor` performs exactly one starting read and uses checked
split-field deadline arithmetic. It then uses the same absolute-wait operation as `waitUntil`.

## Gotchas
Marks and deadlines are meaningful only on this provider's monotonic timeline. Native waits
block the calling host thread; they do not park one Fiber. Failure, malformed host output, or
deadline overflow is a fatal trap. Linux requires `glibc` 2.17 or later and excludes system
suspend time from this clock. macOS includes system suspend time. Construction and use on unsupported or no-libc profiles produce a compile-time error.

Import as `OsMonotonicClock` with `import silk.os_monotonic_clock { OsMonotonicClock }`.

Public declarations: 1.

::Anchor{id="OsMonotonicClock"}

## `OsMonotonicClock`

```silk
pub struct OsMonotonicClock
```

A stateless native provider; construction makes no call and failed operations trap.

::Anchor{id="OsMonotonicClock.impl"}

## Implementation `OsMonotonicClock`

```silk
impl OsMonotonicClock
```

::Anchor{id="OsMonotonicClock.impl.make"}

### Associated function `make`

```silk
pub fn make() -> OsMonotonicClock
```

Creates a native clock provider without reading the clock or installing a default.

#### Gotchas

Construction on unsupported or no-libc profiles produces a compile-time error.

::Anchor{id="OsMonotonicClock.impl.MonotonicClock"}

## Implementation `MonotonicClock for OsMonotonicClock`

```silk
impl MonotonicClock for OsMonotonicClock
```

::Anchor{id="OsMonotonicClock.impl.MonotonicClock.now"}

### Operation `now`

```silk
effect fn now(self: &mut Self) -> Instant
```

::Anchor{id="OsMonotonicClock.impl.MonotonicClock.getResolution"}

### Operation `getResolution`

```silk
effect fn getResolution(self: &mut Self) -> u64
```

::Anchor{id="OsMonotonicClock.impl.MonotonicClock.waitUntil"}

### Operation `waitUntil`

```silk
effect fn waitUntil(self: &mut Self, when: Instant) -> ()
```

::Anchor{id="OsMonotonicClock.impl.MonotonicClock.waitFor"}

### Operation `waitFor`

```silk
effect fn waitFor(self: &mut Self, howLong: u64) -> ()
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
