Affine Fiber handles, typed outcomes, and one-observer completion.

## When to use
Use [`forkChild`](#Fiber.impl.forkChild) to create structured child work. Use [`await`](#Fiber.impl.await) to inspect success, failure, or
cancellation as data. Use [`join`](#Fiber.impl.join) to propagate a Fiber failure through the current Effect. Use
[`yieldNow`](#Fiber.impl.yieldNow) to let tasks that are already ready run first under a FIFO provider.

## Details
A [`Fiber`](#Fiber) owns one completion observer. Observation consumes the Fiber, so one Fiber has at
most one waiter. A successful fork publishes the complete child before it returns the Fiber.
Completion, cancellation, and cooperative yielding notify an Execution without allocation.

## Gotchas
Dropping a Fiber stops observation. It does not cancel the task that produces the result.

Import as `Fiber` with `import silk.fiber { Fiber }`.

Public declarations: 8.

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

### Details

[`await`](#Fiber.impl.await) and [`join`](#Fiber.impl.join) consume the handle. Dropping the handle does not cancel its task.

::Anchor{id="Fiber.impl"}

## Implementation `Fiber<A, E>`

```silk
impl<A, E> Fiber<A, E>
```

::Anchor{id="Fiber.impl.prepare"}

### Associated function `prepare`

```silk
pub effect fn prepare() -> PreparedFiber<A, E>
  ! OutOfMemoryError
  ? &mut Allocator
```

Allocates the producer, canceller, and affine Fiber endpoints for one task.

#### When to use

Use this provider operation before a Scheduler constructs and publishes a task.

#### Details

No endpoint becomes visible until both Shared completion cells exist. Observation and
notification allocate no further storage.

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
returns the Fiber only after the provider accepts the complete child. The provider records that
acceptance and wakes the parent before it notifies the child's initial readiness. The child body
starts only when the Scheduler later drives it.

#### Gotchas

Allocation refusal or task-identity exhaustion raises the exact preparation failure. Publication
refusal raises `OutOfMemoryError`, returns no Fiber, and does not activate the child.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
