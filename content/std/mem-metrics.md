Allocation counters that an `Allocator` provider can keep and publish.

## When to use
Put an [`AllocationMetrics`](#AllocationMetrics) value in your own `Allocator` provider when a test or a diagnostic
needs to know how many allocations happened, how many are live, and the largest number that were
live at one time. Code that does not use this module has no cost.

## Details
The compiler does not collect these counts. The provider calls [`Metrics.recordAcquire`](#Metrics.impl.recordAcquire) after
each successful allocation and [`Metrics.recordRelease`](#Metrics.impl.recordRelease) after each release. [`Metrics.copy`](#Metrics.impl.copy)
returns a snapshot. The counts belong to one provider, not to the process.

## Gotchas
The counters do not identify allocations and do not check that each release matches an
allocation. If there are more releases than allocations, [`Metrics.live`](#Metrics.impl.live) traps.

## Examples
### Count allocations and releases
```silk
import silk.mem.metrics { Metrics }

pub fn main() -> i32 {
  let mut metrics = Metrics.make()
  Metrics.recordAcquire(&mut metrics)
  Metrics.recordAcquire(&mut metrics)
  Metrics.recordRelease(&mut metrics)
  let snapshot = Metrics.copy(&metrics)
  if snapshot.acquired != 2 || snapshot.released != 1 || Metrics.live(&snapshot) != 1
    || snapshot.peakLive != 2 {
    return 1
  }
  return 0
}
```

Import as `AllocationMetrics` with `import silk.mem.metrics { AllocationMetrics }`.

Public declarations: 2.

::Anchor{id="Metrics"}

## `Metrics`

```silk
pub struct Metrics
```

The owner type of the counter operations. It has no fields and is never constructed.

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

Returns counters that are all zero.

::Anchor{id="Metrics.impl.copy"}

### Method `copy`

```silk
pub fn copy(self: &AllocationMetrics) -> AllocationMetrics
```

Returns a copy of the counters. The provider keeps its own counters.

#### When to use

Use it to publish the counts while the provider continues to update its counters.

::Anchor{id="Metrics.impl.live"}

### Method `live`

```silk
pub fn live(self: &AllocationMetrics) -> usize
```

Returns the number of live allocations: `acquired - released`.

#### Gotchas

If `released` is more than `acquired`, it traps.

::Anchor{id="Metrics.impl.recordAcquire"}

### Method `recordAcquire`

```silk
pub fn recordAcquire(self: &mut AllocationMetrics) -> ()
```

Counts one successful allocation and updates the peak.

#### Details

Call it only after an allocation succeeded. A failed allocation must not change the counters.

#### Gotchas

It traps if `acquired` overflows `usize`, or if there were more releases than allocations.

::Anchor{id="Metrics.impl.recordRelease"}

### Method `recordRelease`

```silk
pub fn recordRelease(self: &mut AllocationMetrics) -> ()
```

Counts one release. The peak does not change.

#### Gotchas

It does not check that a matching allocation was counted. If there are more releases than
allocations, [`Metrics.live`](#Metrics.impl.live) traps.

::Anchor{id="AllocationMetrics"}

## `AllocationMetrics`

```silk
pub struct AllocationMetrics
```

Allocation counters for one `Allocator` provider.

### When to use

Put one in your own `Allocator` provider when a test or a diagnostic needs to know how many
allocations happened, how many are live, and the largest number that were live at one time. The
provider calls [`Metrics.recordAcquire`](#Metrics.impl.recordAcquire) after each successful allocation and
[`Metrics.recordRelease`](#Metrics.impl.recordRelease) after each release.

### Details

The compiler does not collect these counts. They belong to one provider, not to the process.

### Details

`acquired` and `released` only increase. `peakLive` is the largest value of `acquired -
released` after an allocation. [`Metrics.live`](#Metrics.impl.live) returns the current value.

### Gotchas

The counters do not identify allocations and do not check that each release matches an
allocation. If there are more releases than allocations, [`Metrics.live`](#Metrics.impl.live) traps.

::Anchor{id="AllocationMetrics.acquired"}

### Field `acquired`

```silk
pub acquired: usize
```

The number of successful allocations.

::Anchor{id="AllocationMetrics.released"}

### Field `released`

```silk
pub released: usize
```

The number of releases.

::Anchor{id="AllocationMetrics.peakLive"}

### Field `peakLive`

```silk
pub peakLive: usize
```

The largest number of live allocations at one time.

::Anchor{id="AllocationMetrics.impl.Copy"}

## Implementation `Copy for AllocationMetrics`

```silk
impl Copy for AllocationMetrics
```

Category: Memory.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
