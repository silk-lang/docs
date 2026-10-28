# Fibers and scheduling

Silk runs concurrent work as cooperative fibers on one thread. This page covers forking and observing fibers, yielding, the `Scheduler` service, the `LocalScheduler` provider, timers, and the setup a program needs before any fiber can run. Fibers add no syntax: they are library operations from `silk/concurrency/fiber`, `silk/concurrency/scheduler` and `silk/concurrency/local_scheduler`, used with `run` and requirement rows.

## Execution model

- All fibers of one scheduler run on one host thread. There is no parallelism and no preemption.
- Native threads are separate from fibers. `NativeThread.spawn` in `silk/concurrency/thread_native` runs a `Transferable` closure on its own operating-system thread, and `JoinHandle.join` waits for its result. `silk/concurrency/atomic`, `silk/concurrency/sync` and `silk/concurrency/thread` hold the matching atomics, locks and thread properties. `silk/concurrency/work_queue` has queues that move owned values between threads, and `silk/concurrency/thread_pool` runs `Transferable` lazy tasks on a work-stealing pool of native threads. This page does not cover them.
- A task runs until it parks. It parks when it waits on an unfinished fiber, yields, waits on a timer, or forks a child.
- When a task parks, the scheduler resumes another ready task. `LocalScheduler` keeps ready tasks in FIFO order.
- A task that never parks keeps the thread until it finishes.
- Parking and resumption rules, cancellation and `Effect.suspend` are covered in Suspension and cancellation.

## Fiber handles

- `Fiber<A, E>` from `silk/concurrency/fiber` is an affine handle to one task's result. `A` is the success type, `E` the failure type.
- Observing a fiber consumes it. Using a handle after `join` or `await` is OWN0001.
- A fiber has at most one observer.
- Dropping a fiber stops observation. It does not cancel the task.

## Forking

- `Fiber<A, E>.forkChild(child)` starts a child task and returns its `Fiber<A, E>`.
- The type arguments must be written. Without them it is SEM0052.
- `child` is a `once Effect<'static; A ! E ? &mut Scheduler | &mut MonotonicClock>`. A child may require less, but nothing else.
- A child that requires another service does not fit the parameter (SEM0076).
- A child that borrows from the parent is not `'static` (SEM0212). The error points at the parent's borrow, such as `&n` for a captured `view = &n`, or at the `run` of the fork when the child Effect borrows a parameter. Pass owned values such as `Shared` handles instead.
- `forkChild` requires `? &mut Scheduler`. Forking without it in the row is SEM0071.
- `forkChild` can fail with `OutOfMemoryError` (allocation or publication refused) or `TaskIdExhaustedError` (no task identity left).
- The child does not start at the fork. The scheduler resumes the parent first. The child body starts on a later activation, for example when the parent parks.
- Each task receives its own `Scheduler` and `MonotonicClock` providers. A child may fork its own children.

## Observing a fiber

- `Fiber<A, E>.await(fiber)` returns `Outcome<A, E>`. Its field `value` is `Success<A> | Failure<E> | Cancelled`.
- `Fiber<A, E>.join(fiber)` returns the success value. It raises the task's failure `E` unchanged, or `Cancelled` if the task was cancelled. Its failure row is `! E | Cancelled`.
- On a finished task, both return at once. On an unfinished task, the caller parks until the task completes.
- Neither needs a requirement row. Type arguments are inferred from the fiber.

## Structured lifetime

- When a task finishes, `LocalScheduler` cancels its unfinished children. A child that was only dropped, never joined, does not outlive its parent.
- When the root finishes or fails, every unfinished task is cancelled before `execute` returns.
- Awaiting a cancelled task gives `Cancelled`. Joining one fails with `Cancelled`.

## Yielding

- `Fiber.yieldNow()` parks the current task and marks it ready again at once.
- Under FIFO order, every task that was already ready runs before the yielding task continues.
- It needs no requirement row and allocates nothing.
- With no other ready task, it returns immediately.

## The Scheduler service

- `Scheduler` in `silk/concurrency/scheduler` is a service with one operation, `prepare`. It prepares a child task without publishing it.
- `Fiber.forkChild` calls `Scheduler.prepare` and then publishes the child. Application code uses `forkChild`, not `prepare`.
- A custom scheduler implements `Scheduler` and drives the published tasks itself.
- `TaskId` values are unique within one scheduler run and are not reused.

## LocalScheduler

- `LocalScheduler` in `silk/concurrency/local_scheduler` is the standard deterministic single-thread provider. `LocalScheduler.make()` creates one.
- `LocalScheduler.execute(&mut scheduler, program)` runs `program` as the root task (task zero) and returns its result.
- `program` has the same type as a forked child: `once Effect<'static; A ! E ? &mut Scheduler | &mut MonotonicClock>`.
- `execute` returns `A ! E | OutOfMemoryError | StalledError ? &mut MonotonicClock`. The `MonotonicClock` requirement is the parent clock, used for timer waits.
- Each call creates fresh task storage, a FIFO ready queue and a timer source. The call returns only after the root terminates.
- A task may call `execute` again with a new `LocalScheduler`. The inner run uses that task's clock as its parent clock.

## StalledError

- `StalledError` from `silk/concurrency/local_scheduler` is raised when the root is unfinished, no task is ready, and no timer is pending.
- This happens when a task parks and the `Wake` that would resume it is lost.
- `execute` cancels and releases the whole task tree before it raises `StalledError`.

## Sleeping and timers

- `Effect.sleep(duration)` in `silk/core/effect` waits `duration` nanoseconds. It requires `? &mut MonotonicClock`. Duration literals such as `2ms` fit.
- `MonotonicClock.waitFor(duration)` and `MonotonicClock.waitUntil(deadline)` are the underlying operations. `MonotonicClock.now()` reads the clock.
- Inside a `LocalScheduler` task, a wait parks only that task. Other tasks keep running.
- Waiting tasks resume in deadline order, then in registration order.
- When no task is ready, the driver waits on the parent clock until the earliest deadline.
- Clock reads inside a task return one cached mark per driver turn.
- The parent clock decides what a wait means. `OsMonotonicClock.make()` from `silk/system/monotonic_clock_native` blocks the host thread. A provider whose `waitUntil` only records the deadline gives virtual time.
- Outside any scheduler, `Effect.sleep` with `OsMonotonicClock` blocks the whole program.

## Runtime setup in main

- Process startup supplies no scheduler and no clock. See Services and providers for what `main` receives.
- Code that may park cannot run directly under `main`. A `main` that reaches `Fiber.yieldNow` or another parking operation outside a scheduler passes `silk check` but fails to build with SEM0225 at `main`: "Entry point `main` may park, but the selected runtime starts it without a scheduler, so it must not park".
- To use fibers, `main` creates a `LocalScheduler` and a parent `MonotonicClock` provider, then runs the root through `LocalScheduler.execute`.
- `main` must also handle or declare the failures of `execute`: the root's `E`, `OutOfMemoryError` and `StalledError`.

## Examples

Fork two children, yield inside them, and join both from an effect `main`:

```silk
import silk.mem.allocator { OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.fiber { Fiber, Cancelled }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }

effect fn square(n: i32) -> i32 {
  run Fiber.yieldNow()
  return n * n
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  let a = run Fiber<i32, never>.forkChild(square(3))
  let b = run Fiber<i32, never>.forkChild(square(4))
  let x = run Fiber.join(move a)
  let y = run Fiber.join(move b)
  return x + y
}

pub effect fn main() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  let total = run LocalScheduler.execute(&mut scheduler, root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  return total - 25
}
```

Timers, a typed child failure, and `await` with `Outcome`:

```silk
import silk.core.effect { Effect }
import silk.concurrency.fiber { Fiber, Cancelled, Outcome, Success, Failure }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.mem.allocator { OutOfMemoryError }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }

struct Refused {
  code: i32,
}

effect fn slow() -> i32
  ? &mut Scheduler | &mut MonotonicClock {
  run Effect.sleep(2ms)
  return 30
}

effect fn quick() -> i32 {
  run Fiber<i32, never>.yieldNow()
  return 10
}

effect fn refuse() -> i32
  ! Refused {
  fail Refused { code: 2 }
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  let a = run Fiber<i32, never>.forkChild(slow())
  let b = run Fiber<i32, never>.forkChild(quick())
  let c = run Fiber<i32, Refused>.forkChild(refuse())
  let first = run Fiber<i32, never>.join(move a)
  let second = run Fiber<i32, never>.join(move b)
  let total = first + second
  let observed = run Fiber<i32, Refused>.await(move c)
  let Outcome<i32, Refused> { value } = move observed
  let extra = match move value {
    Success<i32> { value: v } => v
    Failure<Refused> { error } => error.code
    Cancelled {} => 100
  }
  return total + extra
}

effect fn program() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  return run LocalScheduler.execute(&mut scheduler, root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

effect fn recover(
  error: OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError
) -> i32 {
  drop error
  return 99
}

pub fn main() -> i32 {
  let result = run Effect.catchAll(program(), recover)
  return result - 42
}
```

Fork order, dropped fibers, and cancellation when the root finishes. The child runs only after the parent yields. The sleeping child is cancelled when the root returns, so it never writes:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.fiber { Fiber, Cancelled }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }
import silk.mem.shared { Shared }

struct Log {
  value: i32,
}

fn bump(log: &mut Log) -> () {
  log.value = log.value * 10 + 1
  return ()
}

fn mark(log: &mut Log) -> () {
  log.value = log.value * 10 + 2
  return ()
}

fn read(log: &Log) -> i32 {
  return log.value
}

effect fn child(log: Shared<Log>) -> () {
  Shared<Log>.withMut<()>(&log, bump)
  return ()
}

effect fn late(log: Shared<Log>) -> ()
  ? &mut Scheduler | &mut MonotonicClock {
  run Effect.sleep(1ms)
  Shared<Log>.withMut<()>(&log, bump)
  return ()
}

effect fn root(log: Shared<Log>) -> i32
  ! OutOfMemoryError | TaskIdExhaustedError
  ? &mut Scheduler | &mut MonotonicClock {
  let f = run Fiber<(), never>.forkChild(child(Shared<Log>.clone(&log)))
  Shared<Log>.withMut<()>(&log, mark)
  drop f
  run Fiber<(), never>.yieldNow()
  Shared<Log>.withMut<()>(&log, mark)
  let g = run Fiber<(), never>.forkChild(late(Shared<Log>.clone(&log)))
  drop g
  return Shared<Log>.with<i32>(&log, read)
}

effect fn program() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | StalledError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let log = run Shared<Log>.make(Log { value: 0 }) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  let seen = run LocalScheduler.execute(&mut scheduler, root(Shared<Log>.clone(&log)))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  let after = Shared<Log>.with<i32>(&log, read)
  if seen != 212 {
    return 1
  }
  if after != 212 {
    return 2
  }
  return 0
}

effect fn recover(error: OutOfMemoryError | TaskIdExhaustedError | StalledError) -> i32 {
  drop error
  return 99
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), recover)
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0001 | Fiber used after `join` or `await` consumed it |
| SEM0052 | `forkChild` called without explicit type arguments |
| SEM0071 | `forkChild` run without `? &mut Scheduler` in the row |
| SEM0076 | Child Effect does not fit `forkChild`: it requires another service |
| SEM0212 | Child Effect borrows from the parent, so it is not `'static` |
| SEM0225 | Parking code reachable from `main` without a scheduler (reported at `main`, by `silk build` only) |

## See also

Suspension and cancellation · Effects and run · Services and providers · Typed failures · Allocation and shared ownership · Ownership and moves · Program entry and termination · `silk/concurrency/fiber` · `silk/concurrency/scheduler` · `silk/concurrency/local_scheduler` · `silk/system/monotonic_clock` · `silk/system/monotonic_clock_native` · `silk/concurrency/execution`

## Open questions

- Cancellation of a finished task's unfinished children is confirmed for `LocalScheduler`. Whether every `Scheduler` provider must do this is not stated in the `Scheduler` contract.
- SEM0225 for parking code under `main` is reported only by `silk build`, not `silk check`. It points at `main`, not at the parking call.
