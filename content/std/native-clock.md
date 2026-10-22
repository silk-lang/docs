Selected libc clocks and source-owned canonical result and wait policy.

## When to use
Use [`NativeClock`](#NativeClock) to implement the native SystemClock and MonotonicClock providers.
Portable applications should require those replaceable services instead.

## Details
Selected declarations match the pinned Darwin/GNU clock ABI. Reads validate initialized
Timespec records. Waits retain one deadline across interruptions; GNU uses direct status
and Darwin captures errno only after a failed relative sleep.

## Gotchas
Operations trap on failed or invalid results and block the calling host thread during waits.
Reached operations on unsupported or no-libc profiles produce a compile-time error.

Import as `NativeClock` with `import silk.native_clock { NativeClock }`.

Public declarations: 1.

::Anchor{id="NativeClock"}

## `NativeClock`

```silk
pub struct NativeClock
```

Source-owned validation and blocking wait operations for selected native clocks.

::Anchor{id="NativeClock.impl"}

## Implementation `NativeClock`

```silk
impl NativeClock
```

::Anchor{id="NativeClock.impl.now"}

### Associated function `now`

```silk
pub effect fn now(monotonic: bool) -> Instant
```

Reads canonical civil time, or a nonnegative mark on the native monotonic timeline.

#### Gotchas
A failed call or malformed result traps. `monotonic` selects the clock domain.
Calls on unsupported or no-libc profiles produce a compile-time error.

::Anchor{id="NativeClock.impl.resolution"}

### Associated function `resolution`

```silk
pub effect fn resolution(monotonic: bool) -> u64
```

Returns the positive nominal resolution of the selected clock in whole nanoseconds.

#### Gotchas
Failed calls, noncanonical fields, zero resolution and checked overflow trap.
Calls on unsupported or no-libc profiles produce a compile-time error.

::Anchor{id="NativeClock.impl.waitUntil"}

### Associated function `waitUntil`

```silk
pub effect fn waitUntil(when: Instant) -> ()
```

Blocks the host thread until a nonnegative deadline on this native monotonic timeline.

#### Details
Retries retain the original deadline. GNU errors come from direct status; Darwin relative
sleeps recompute the remaining interval after success or interruption.

#### Gotchas
A negative deadline, failed call or unrepresentable result traps. This does not park a Fiber.
Calls on unsupported or no-libc profiles produce a compile-time error.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
