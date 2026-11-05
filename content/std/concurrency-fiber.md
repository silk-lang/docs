Fibers: handles to child tasks, with typed outcomes and one observer each.

## When to use
| Operation | Use it to |
|---|---|
| [`forkChild`](#Fiber.impl.forkChild) | Start structured child work under the current `Scheduler` |
| [`join`](#Fiber.impl.join) | Wait for a child, and raise its failure in the current effect |
| [`await`](#Fiber.impl.await) | Wait for a child, and get success, failure or cancellation as data |
| [`isFinished`](#Fiber.impl.isFinished) | Check whether a child finished, without waiting |
| [`interrupt`](#Fiber.impl.interrupt) | Cancel a child that is still running, and get its final outcome |
| [`awaitEither`](#Fiber.impl.awaitEither) | Wait for the first of two children, and keep the other running |
| [`race`](#Fiber.impl.race) | Take the result of whichever of two children finishes first, and cancel the other |
| [`yieldNow`](#Fiber.impl.yieldNow) | Let other ready tasks run before the current task continues |

Run the root program with `silk.concurrency.local_scheduler`, which provides the `Scheduler` service.
For fibers that run in parallel on native threads, use `silk.concurrency.thread_pool`.

## Details
A [`Fiber`](#Fiber) has one completion observer. [`await`](#Fiber.impl.await) and [`join`](#Fiber.impl.join) consume the Fiber, so a Fiber
has at most one waiter. A successful fork publishes the complete child before it returns the
Fiber. The child body starts only when the scheduler drives it, not during the fork.

Completion, cancellation and yields notify an `Execution` with no allocation.

The other items ([`CompletionProducer`](#CompletionProducer), [`CompletionCanceller`](#CompletionCanceller), [`PreparedFiber`](#PreparedFiber) and the
completion functions) are for scheduler providers, not for application code.

## Errors
- [`forkChild`](#Fiber.impl.forkChild) fails with `OutOfMemoryError` or `TaskIdExhaustedError`.
- [`join`](#Fiber.impl.join) raises the typed failure of the child unchanged, or [`Cancelled`](#Cancelled).

## Gotchas
Dropping a Fiber stops the observation. It does not cancel the task; [`interrupt`](#Fiber.impl.interrupt) does. The
scheduler cancels unfinished children when their parent finishes.

Cancellation takes effect only at a park, such as a wait for a timer or for another Fiber. It
runs `Drop` hooks and non-parking finalizers (`Effect.ensuringNonParking`,
`Effect.useReleaseNonParking`), but not `Effect.ensuring` finalizers.

## Examples
### Fork two children and join them
```silk
import silk.mem.allocator { OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.fiber { Cancelled, Fiber }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }

effect fn square(value: i32) -> i32 {
  // Lets the other ready task run first.
  run Fiber.yieldNow()
  return value * value
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  let three = run Fiber<i32, never>.forkChild(square(3))
  let four = run Fiber<i32, never>.forkChild(square(4))

  // join parks the root until the child finishes.
  let first = run three.join()
  let second = run four.join()
  if first + second != 25 {
    return 1
  }
  return 0
}

effect fn program() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut clock = OsMonotonicClock.make()
  let mut scheduler = LocalScheduler.make()
  return run scheduler.execute<i32, OutOfMemoryError | TaskIdExhaustedError | Cancelled>(root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

### Get a child failure as data
```silk
import silk.mem.allocator { OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.fiber { Failure, Fiber, Outcome }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }

struct Invalid {
  code: i32,
}

effect fn check(value: i32) -> i32
  ! Invalid {
  if value < 0 {
    fail Invalid { code: value }
  }
  return value
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError
  ? &mut Scheduler | &mut MonotonicClock {
  let child = run Fiber<i32, Invalid>.forkChild(check(-7))

  // await gives the outcome as data. It does not raise the failure.
  let outcome = run child.await()
  let Outcome<i32, Invalid> { value } = move outcome
  return match move value {
    Failure<Invalid> { error } => {
      if error.code != -7 {
        return 1
      }
      return 0
    }
    _ => 1
  }
}

effect fn program() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | StalledError {
  let mut clock = OsMonotonicClock.make()
  let mut scheduler = LocalScheduler.make()
  return run scheduler.execute<i32, OutOfMemoryError | TaskIdExhaustedError>(root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `Fiber` with `import silk.concurrency.fiber { Fiber }`.

Public declarations: 10.

::Anchor{id="CompletionProducer"}

## `CompletionProducer`

```silk
pub struct CompletionProducer<A, E>
```

The producer endpoint for one Fiber result.

### Details

A Scheduler provider owns this endpoint until it calls [`completeSuccess`](#Fiber.impl.completeSuccess) or
[`completeFailure`](#Fiber.impl.completeFailure). Both operations consume the endpoint and notify one parked observer.

::Anchor{id="CompletionCanceller"}

## `CompletionCanceller`

```silk
pub struct CompletionCanceller
```

The type-erased cancellation endpoint for one Fiber result.

### Details

A task store can retain this endpoint without storing the Fiber success or failure types.
[`cancel`](#Fiber.impl.cancel) consumes the endpoint and notifies one parked observer.

::Anchor{id="Fiber"}

## `Fiber`

```silk
pub struct Fiber<A, E>
```

An affine handle that observes one task result or cancellation.

### When to use

Get one from [`forkChild`](#Fiber.impl.forkChild), which starts structured child work under the current `Scheduler`.
Use [`join`](#Fiber.impl.join) to wait for the child and raise its failure in the current effect, or [`await`](#Fiber.impl.await) to
get success, failure or cancellation as data. Run the root program with
`silk.concurrency.local_scheduler`, which provides the `Scheduler` service.

### Details

A Fiber has one completion observer. [`await`](#Fiber.impl.await) and [`join`](#Fiber.impl.join) consume the handle, so a Fiber has
at most one waiter. The child body starts only when the scheduler drives it, not during the
fork.

### Gotchas

Dropping the handle stops the observation. It does not cancel its task; [`interrupt`](#Fiber.impl.interrupt) does. The
scheduler cancels unfinished children when their parent finishes.

::Anchor{id="Fiber.impl"}

## Implementation `Fiber<A, E>`

```silk
impl<A, E> Fiber<A, E>
```

::Anchor{id="Fiber.impl.prepare"}

### Associated function `prepare`

```silk
pub effect fn prepare(identity: TaskId) -> PreparedFiber<A, E>
  ! OutOfMemoryError
  ? &mut Allocator
```

Allocates the producer, canceller, and affine Fiber endpoints for one task.

#### When to use

Use this provider operation before a Scheduler constructs and publishes a task.

#### Details

No endpoint becomes visible until both Shared completion cells exist. Observation and
notification allocate no further storage. `identity` is the task the Fiber observes, which
[`interrupt`](#Fiber.impl.interrupt) asks the Scheduler to cancel.

::Anchor{id="Fiber.impl.completeSuccess"}

### Associated function `completeSuccess`

```silk
pub fn completeSuccess(producer: CompletionProducer<A, E>, value: A) -> ()
```

Completes one Fiber with `value` and notifies its observer.

#### Details

This operation stores `value` before it publishes readiness. It consumes the producer endpoint
and allocates no storage.

::Anchor{id="Fiber.impl.completeFailure"}

### Associated function `completeFailure`

```silk
pub fn completeFailure(producer: CompletionProducer<A, E>, error: E) -> ()
```

Completes one Fiber with `error` and notifies its observer.

#### Details

This operation stores `error` before it publishes readiness. It consumes the producer endpoint
and allocates no storage.

::Anchor{id="Fiber.impl.cancel"}

### Associated function `cancel`

```silk
pub fn cancel(canceller: CompletionCanceller) -> ()
```

Publishes cancellation and notifies one parked Fiber observer.

#### Details

This operation is independent of the Fiber success and failure types. It consumes the
cancellation endpoint and allocates no storage.

::Anchor{id="Fiber.impl.await"}

### Method `await`

```silk
pub effect<'env> fn await<'env>(self: Self) -> Outcome<A, E>
```

Consumes a Fiber and returns its success, typed failure, or cancellation as data.

#### Details

A terminal Fiber returns immediately. A pending Fiber parks the current Execution and installs
exactly one Wake. Observation and resumption allocate no storage.

::Anchor{id="Fiber.impl.isFinished"}

### Method `isFinished`

```silk
pub fn isFinished(self: &Self) -> bool
```

Whether the task has finished, by success, typed failure, or cancellation.

#### When to use

Use `isFinished` in a loop that must not park on one child, such as an event loop that starts
work on Fibers and checks once per frame which of them finished. [`await`](#Fiber.impl.await) or [`join`](#Fiber.impl.join) on a
finished Fiber returns at once, without parking.

#### Details

`isFinished` never parks, allocates no storage, and does not observe the outcome: the Fiber
can still be awaited, joined, interrupted, or dropped.

#### Gotchas

A child runs only when the scheduler drives it, so a loop that checks must also park now and
then, for example with [`yieldNow`](#Fiber.impl.yieldNow) or a wait for a timer, or its children never finish.

::Anchor{id="Fiber.impl.interrupt"}

### Method `interrupt`

```silk
pub effect<'env> fn interrupt<'env>(self: Self) -> Outcome<A, E> ? &mut Scheduler
```

Cancels the task unless it already finished, and returns its final outcome.

#### When to use

Use `interrupt` to stop a child whose result is no longer needed, such as the loser of a race.

#### Details

The current task parks until the Scheduler has processed the request. Cancelling drops the
child's parked Execution and its unfinished descendants, which runs their `Drop` hooks and
their non-parking finalizers (`Effect.ensuringNonParking`, `Effect.useReleaseNonParking`).
Thus that cleanup has finished when `interrupt` returns. A child that finished before the
request gives its real outcome, so the result is `Success` or `Failure` as well as
`Cancelled`.

#### Gotchas

A child is cancelled only at a park, such as a wait for a timer or for another Fiber. Code
between two parks always runs to its end. `Effect.ensuring` finalizers do not run on
cancellation. Interrupting the current task or one of its ancestors does nothing, and the
await that follows then waits for that task to finish.

Interrupt a Fiber only under the Scheduler that forked it. The request names the task by its
identity within that Scheduler, so under another Scheduler it reaches an unrelated task.

::Anchor{id="Fiber.impl.awaitEither"}

### Method `awaitEither`

```silk
pub effect<'env> fn awaitEither<'env, B: 'env, F: 'env>(
    self: Self,
    other: Fiber<B, F>,
  ) -> FirstLeft<A, E, B, F> | FirstRight<A, E, B, F>
```

Waits for the first of two tasks to finish, and returns its outcome with the other Fiber.

#### When to use

Use `awaitEither` to act on whichever child finishes first. Use [`race`](#Fiber.impl.race) when the other child
should then be cancelled.

#### Details

If both tasks had already finished before the call, `self` wins. The other Fiber is returned unobserved and still
running, so the caller can await, interrupt, or drop it. Like [`await`](#Fiber.impl.await), a failure or a
cancellation of the winner is data in its `Outcome`.

::Anchor{id="Fiber.impl.race"}

### Method `race`

```silk
pub effect<'env> fn race<'env>(self: Self, other: Fiber<A, E>) -> A
  ! E | Cancelled
  ? &mut Scheduler
```

Waits for the first of two tasks to finish, cancels the other, and returns the first result.

#### When to use

Use `race` to take whichever of two equivalent computations finishes first, such as two
replicas of one request.

#### Details

The first task to finish wins, whatever its outcome: a typed failure of the winner is raised
unchanged, and a cancelled winner raises [`Cancelled`](#Cancelled). The other task is cancelled with
[`interrupt`](#Fiber.impl.interrupt) before `race` returns, so its cleanup has finished. If both had already
finished before the call, `self` wins.

::Anchor{id="Fiber.impl.join"}

### Method `join`

```silk
pub effect<'env> fn join<'env>(self: Self) -> A
  ! E | Cancelled
```

Consumes a Fiber, returns its success value, and propagates failure or cancellation.

#### Details

A typed task failure is raised unchanged. Cancellation raises [`Cancelled`](#Cancelled). A pending Fiber
parks with the same allocation-free one-observer protocol as [`await`](#Fiber.impl.await).

::Anchor{id="Fiber.impl.yieldNow"}

### Associated function `yieldNow`

```silk
pub effect fn yieldNow() -> ()
```

Relinquishes the current Execution once and immediately reports that it is ready.

#### When to use

Use this operation to let tasks that are already ready run before the current task continues
under a FIFO provider.

#### Details

This operation consumes its Wake during registration. It needs no Scheduler service and
allocates no storage. The provider selects the next activation order.

::Anchor{id="Outcome"}

## `Outcome`

```silk
pub struct Outcome<A, E>
```

The three possible terminal observations of a Fiber.

::Anchor{id="Outcome.value"}

### Field `value`

```silk
pub value: Success<A> | Failure<E> | Cancelled
```

The completed success, typed failure, or cancellation value.

::Anchor{id="Success"}

## `Success`

```silk
pub struct Success<A>
```

A successful Fiber outcome.

::Anchor{id="Success.value"}

### Field `value`

```silk
pub value: A
```

The value returned by the task.

::Anchor{id="Failure"}

## `Failure`

```silk
pub struct Failure<E>
```

A typed failed Fiber outcome.

::Anchor{id="Failure.error"}

### Field `error`

```silk
pub error: E
```

The error raised by the task.

::Anchor{id="Cancelled"}

## `Cancelled`

```silk
pub struct Cancelled
```

A Fiber outcome that reports structured task cancellation.

::Anchor{id="FirstLeft"}

## `FirstLeft`

```silk
pub struct FirstLeft<A, E, B, F>
```

The first task of an [`awaitEither`](#Fiber.impl.awaitEither) finished first.

::Anchor{id="FirstLeft.outcome"}

### Field `outcome`

```silk
pub outcome: Outcome<A, E>
```

The outcome of the first task.

::Anchor{id="FirstLeft.other"}

### Field `other`

```silk
pub other: Fiber<B, F>
```

The second task, unobserved and possibly still running.

::Anchor{id="FirstRight"}

## `FirstRight`

```silk
pub struct FirstRight<A, E, B, F>
```

The second task of an [`awaitEither`](#Fiber.impl.awaitEither) finished first.

::Anchor{id="FirstRight.other"}

### Field `other`

```silk
pub other: Fiber<A, E>
```

The first task, unobserved and possibly still running.

::Anchor{id="FirstRight.outcome"}

### Field `outcome`

```silk
pub outcome: Outcome<B, F>
```

The outcome of the second task.

::Anchor{id="Cancelled.impl.Debug"}

## Implementation `Debug for Cancelled`

```silk
impl Debug for Cancelled
```

::Anchor{id="Cancelled.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes `Cancelled`.

::Anchor{id="PreparedFiber"}

## `PreparedFiber`

```silk
pub struct PreparedFiber<A, E>
```

The three endpoints created for one future Fiber result.

### Details

A Scheduler provider gives `fiber` to the caller, captures `producer` in the task, and stores
`canceller` in its type-erased task entry.

::Anchor{id="PreparedFiber.producer"}

### Field `producer`

```silk
pub producer: CompletionProducer<A, E>
```

The endpoint that publishes a success or typed failure.

::Anchor{id="PreparedFiber.canceller"}

### Field `canceller`

```silk
pub canceller: CompletionCanceller
```

The type-erased endpoint that publishes cancellation.

::Anchor{id="PreparedFiber.fiber"}

### Field `fiber`

```silk
pub fiber: Fiber<A, E>
```

The affine result handle returned after task publication succeeds.

::Anchor{id="Fiber.impl-2"}

## Implementation `Fiber<A, E>`

```silk
impl<A: 'static, E: 'static> Fiber<A, E>
```

::Anchor{id="Fiber.impl.forkChild"}

### Associated function `forkChild`

```silk
pub effect fn forkChild(
    child: once Effect<'static;
      A
      ! E
      ? &mut Scheduler | &mut MonotonicClock
    >
  ) -> Fiber<A, E>
  ! OutOfMemoryError | TaskIdExhaustedError
  ? &mut Scheduler
```

Prepares and atomically publishes one child task, then returns its affine Fiber.

#### When to use

Use this operation to run closed work or work that uses the child Scheduler and MonotonicClock
providers.

#### Details

Preparation finishes its exclusive Scheduler dispatch before publication starts. Publication
returns the Fiber only after the provider accepts the complete child. The provider records
that acceptance and wakes the parent before it notifies the child's initial readiness. The
child body starts only when the Scheduler later drives it.

#### Gotchas

Allocation refusal or task-identity exhaustion raises the exact preparation failure:
`OutOfMemoryError` or `TaskIdExhaustedError`. Publication refusal raises `OutOfMemoryError`,
returns no Fiber, and does not activate the child. Dropping the Fiber does not cancel the
child. The scheduler cancels unfinished children when the root finishes.

Category: Concurrency.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
