Provider-owned allocation counters that can be published as ordinary copyable data.

## When to use
Embed [`AllocationMetrics`](#AllocationMetrics) in a custom [`Allocator`](/docs/std/allocator#Allocator) provider when tests or diagnostics need
acquisition, release, current-live, or peak-live counts. Code that never imports this module
pays no instrumentation cost.

## Details
The compiler does not collect these metrics. A provider calls [`recordAcquire`](#Metrics.impl.recordAcquire) and
[`recordRelease`](#Metrics.impl.recordRelease) at its own allocation boundary, then exposes an independent snapshot with
[`copy`](#Metrics.impl.copy). Counts belong to that provider instance rather than to the process globally.

## Gotchas
Recording is intentionally minimal and assumes every release corresponds to an earlier acquire.
The module does not identify allocations or repair an unbalanced provider.

## Examples
### Publish a snapshot of one allocation ledger
```silk
import silk.metrics { Metrics }

import silk.usize

pub fn main() -> i32 {
  let mut metrics = Metrics.make()
  Metrics.recordAcquire(&mut metrics)
  Metrics.recordAcquire(&mut metrics)
  Metrics.recordRelease(&mut metrics)

  let snapshot = Metrics.copy(&metrics)
  if snapshot.acquired != usize.add(0, 2) {
    return 1
  }
  if snapshot.released != usize.ONE {
    return 2
  }
  if Metrics.live(&snapshot) != usize.ONE {
    return 3
  }
  if snapshot.peakLive != usize.add(0, 2) {
    return 4
  }
  return 42
}
```

Import as `AllocationMetrics` with `import silk.metrics { AllocationMetrics }`.

Public declarations: 2.

::Anchor{id="Metrics"}

## `Metrics`

```silk
pub struct Metrics
```

The owner of the allocation-ledger operations.

### Details

This struct carries no data and is never constructed by the library. Ledger construction,
updates, and snapshots are inherent members declared in `impl Metrics`, reached through
`import silk.metrics { Metrics }`.

::Anchor{id="Metrics.impl"}

## Implementation `Metrics`

```silk
impl Metrics
```

::Anchor{id="Metrics.impl.make"}

### Associated function `make`

```silk
pub fn make() -> AllocationMetrics
```

Creates a ledger with zero acquisitions, zero releases, and a zero peak.

::Anchor{id="Metrics.impl.copy"}

### Method `copy`

```silk
pub fn copy(self: &AllocationMetrics) -> AllocationMetrics
```

Copies the current counters without moving or changing the provider's ledger.

#### When to use

Use this function when a provider must publish metrics while it keeps the mutable ledger.

::Anchor{id="Metrics.impl.live"}

### Method `live`

```silk
pub fn live(self: &AllocationMetrics) -> usize
```

Returns `acquired - released`, which is the number of recorded live allocations.

#### Gotchas

If `released` is greater than `acquired`, the unsigned subtraction traps. Record each release
only after its matching successful acquisition.

::Anchor{id="Metrics.impl.recordAcquire"}

### Method `recordAcquire`

```silk
pub fn recordAcquire(self: &mut AllocationMetrics) -> ()
```

Adds one successful acquisition and updates the peak live count.

#### Details

Call this function only after the provider acquires the allocation. A failed acquisition must
not change the counters.

#### Gotchas

The operation traps if `acquired` overflows `usize`. An unbalanced prior release can also make
the live-count subtraction trap.

::Anchor{id="Metrics.impl.recordRelease"}

### Method `recordRelease`

```silk
pub fn recordRelease(self: &mut AllocationMetrics) -> ()
```

Adds one release without changing the historical peak live count.

#### Details

Call this function after the provider releases one allocation that it previously recorded.

#### Gotchas

This function does not check that a matching acquisition exists. If releases become greater
than acquisitions, [`live`](#Metrics.impl.live) traps.

::Anchor{id="AllocationMetrics"}

## `AllocationMetrics`

```silk
pub struct AllocationMetrics
```

Copyable counters for one provider's successful allocation acquisitions and releases.

### Details

`acquired` and `released` are cumulative. `peakLive` is the greatest value of
`acquired - released` observed by [`recordAcquire`](#Metrics.impl.recordAcquire). Use [`live`](#Metrics.impl.live) for the current difference.

::Anchor{id="AllocationMetrics.acquired"}

### Field `acquired`

```silk
pub acquired: usize
```

The cumulative number of successful acquisitions recorded by the provider.

::Anchor{id="AllocationMetrics.released"}

### Field `released`

```silk
pub released: usize
```

The cumulative number of releases recorded by the provider.

::Anchor{id="AllocationMetrics.peakLive"}

### Field `peakLive`

```silk
pub peakLive: usize
```

The greatest live-allocation count observed after an acquisition.

::Anchor{id="AllocationMetrics.impl.Copy"}

## Implementation `Copy for AllocationMetrics`

```silk
impl Copy for AllocationMetrics
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
