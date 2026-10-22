Native Unix-epoch clock provider for `SystemClock`.

## When to use
Construct [`OsSystemClock`](#OsSystemClock) at a native application edge and provide it to portable code that
requires `&mut SystemClock`. Use an ordinary fixed or scripted provider in deterministic tests.

## Details
Construction is stateless and performs no host call. Each operation calls the matching libc
clock function through an ordinary `extern "C"` declaration. A failed read, noncanonical host result, zero resolution, or
unrepresentable resolution is a fatal trap because the public service has no failure channel.

## Gotchas
The clock may move backwards when the operating system adjusts its external reference. Reachable
operations support the current Unix-family native targets. Linux requires `glibc` 2.17 or later
and needs no `librt` link. WebAssembly and no-libc selection leave this module empty.

Import as `OsSystemClock` with `import silk.os_system_clock { OsSystemClock }`.

Public declarations: 1.

::Anchor{id="OsSystemClock"}

## `OsSystemClock`

```silk
pub struct OsSystemClock
```

A stateless native provider; construction makes no call and failed operations trap.

::Anchor{id="OsSystemClock.impl"}

## Implementation `OsSystemClock`

```silk
impl OsSystemClock
```

::Anchor{id="OsSystemClock.impl.make"}

### Associated function `make`

```silk
pub fn make() -> OsSystemClock
```

Creates a native clock provider without reading the clock or installing a default.

::Anchor{id="OsSystemClock.impl.SystemClock"}

## Implementation `SystemClock for OsSystemClock`

```silk
impl SystemClock for OsSystemClock
```

::Anchor{id="OsSystemClock.impl.SystemClock.now"}

### Operation `now`

```silk
effect fn now(self: &mut Self) -> Instant
```

::Anchor{id="OsSystemClock.impl.SystemClock.getResolution"}

### Operation `getResolution`

```silk
effect fn getResolution(self: &mut Self) -> u64
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
