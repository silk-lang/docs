Deterministic single-threaded execution for structured Fibers.

## When to use
Use [`execute`](#LocalScheduler.impl.execute) at an application entry point to run one lazy program that uses the
`silk.scheduler.Scheduler` and `silk.monotonic_clock.MonotonicClock` services.

## Details
Each call creates fresh task storage, a FIFO ready queue, and a private timer source. The root is
task zero and uses the same `Execution<()>` storage as every child. Task clock waits park only
their task; the driver uses the parent clock when its event sources need to wait. [`execute`](#LocalScheduler.impl.execute)
returns only after the root terminates.

Import as `LocalScheduler` with `import silk.local_scheduler { LocalScheduler }`.

Public declarations: 2.

::Anchor{id="LocalScheduler"}

## `LocalScheduler`

```silk
pub struct LocalScheduler
```

A reusable deterministic single-threaded Scheduler provider.

### Details

Each call to [`execute`](#LocalScheduler.impl.execute) creates fresh task storage and readiness state.

::Anchor{id="LocalScheduler.impl"}

## Implementation `LocalScheduler`

```silk
impl LocalScheduler
```

::Anchor{id="LocalScheduler.impl.make"}

### Associated function `make`

```silk
pub fn make() -> LocalScheduler
```

Constructs a reusable local Scheduler value.

::Anchor{id="LocalScheduler.impl.execute"}

### Method `execute`

```silk
pub effect fn execute<A: 'static, E: 'static>(
    self: &mut Self,
    program: once Effect<'static;
      A
      ! E
      ? &mut Scheduler | &mut MonotonicClock
    >,
  ) -> A
  ! E | OutOfMemoryError | StalledError
  ? &mut MonotonicClock
```

Runs one lazy root program under this Scheduler and returns its typed outcome.

#### Details

The root becomes task zero. This operation owns all per-run task and timer storage, provides
distinct Scheduler and MonotonicClock clients to each task, and dispatches ready tasks in FIFO
order. Task clock reads use one cached mark per driver turn. Future waits suspend their task and
are resumed in deadline and registration order. When the ready queue is empty, the driver waits
through its required parent MonotonicClock for the earliest timer; it raises [`StalledError`](#StalledError)
only when no task is ready and no timer registration remains. Before any typed return or failure,
it cancels every unfinished descendant and releases the complete run state.

::Anchor{id="StalledError"}

## `StalledError`

```silk
pub struct StalledError
```

Reports that no task is ready and no event registration remains while the root is incomplete.

### Details

[`execute`](#LocalScheduler.impl.execute) cancels and releases the incomplete task tree before it raises this error.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
