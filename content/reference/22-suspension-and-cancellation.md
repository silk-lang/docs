# Suspension and cancellation

A running Effect can suspend at a `run` and be resumed later, or be cancelled while it is suspended. This page covers suspension points, what a suspended frame keeps alive, local-shared access across suspension, cancellation and the cleanup it performs, the `NonParking` and `Detached` properties, and the `Execution` park and wake protocol from `silk/execution`.

## Syntax

```
PropertyBound     = Bound '+' Property ( '+' Property )*
Property          = 'Intrinsic' '.' ( 'NonParking' | 'Detached' )
NonParkingMarker  = 'with' 'Intrinsic' '.' 'nonParking' '(' ')'
```

- A `PropertyBound` appears in a generic parameter list after a callable or Effect bound: `F: once fn() -> i32 + Intrinsic.NonParking`.
- `NonParkingMarker` ends a service operation signature: `effect fn close() -> () ! E ? &mut S with Intrinsic.nonParking()`.

## Suspension points

- A suspension point is a `run` whose Effect can suspend. Nothing else suspends.
- `Effect.suspend(e)` defers `e` through the stack-safe executor. It keeps the success, failure and requirement channels exactly. The transfer can complete within the same activation.
- `Execution.park(register)` relinquishes the current `Execution` until a `Wake` makes it eligible again. Parking is the only external suspension.
- `Fiber.yieldNow()` parks and wakes itself at once, so tasks that are already ready run first.
- An ordinary `fn` may `run` an Effect with empty failure and requirement rows. If that Effect parks, the whole call chain parks with it.
- Program startup supplies no scheduler and checks the entry with `Intrinsic.NonParking`. A `main` that can reach `Execution.park` is SEM0225 at `main`, reported by `silk build`. Create an owner with `Execution.make` or `LocalScheduler.execute` instead.

## What a suspended frame keeps

- Every owner live at the suspension point stays in the suspended frame: locals, parameters, partly moved aggregates and held outcomes.
- Borrows of the frame's own locals may cross a suspension point. A `&mut` taken before a `run` is usable after it.
- `Execution.make` takes a body of type `once Effect<'static; A>` that is also `Intrinsic.Detached`. A body that borrows a caller's local is rejected at the call with SEM0139 ("A concrete executable that fails one sealed static-property obligation"), not a lifetime error. `silk check` reports it.
- A `Shared<T>` handle is an ordinary owner. It may be held across suspension, and clones may live in several suspended frames.

## Local-shared access and suspension

- `Shared.with` and `Shared.withMut` lend the stored value to an ordinary `once fn` callback. The borrow ends when the callback returns.
- Nothing the callback reaches may `run` an Effect. This includes an Effect that never suspends. The violation is OWN0016.
- Nothing the callback reaches may notify an execution, such as `Execution.wake`. That is also OWN0016, reported at the notification site, which may be inside `silk/execution`.
- The check follows calls from the callback transitively.
- Fix: take what you need out of the value inside the callback, return it, then `run` or wake after the access call returns.
- Nesting access to the same allocation through any alias traps at runtime before the inner callback starts.

## Cancellation

- Dropping a parked `Execution` cancels it. The body does not resume.
- Cancellation drops every owner live at the suspension point. `Drop` hooks run.
- Cancellation runs the finalizer of each enclosing `Effect.ensuringNonParking` and the release of each enclosing `Effect.useReleaseNonParking`. Nested scopes finish in reverse order, after the frame's live owners are dropped.
- The finalizer of `Effect.ensuring` does not run on cancellation. The parked composition drops its held outcome and captures once.
- A trap is not cancellation. Traps bypass finalizers, releases and `Drop` hooks.
- A `Wake` for a cancelled `Execution` publishes nothing when consumed. A retained `Wake` keeps the package memory alive until it is consumed or dropped.

## Cancelling fibers

- Under `LocalScheduler`, when a task finishes, its unfinished children and all their descendants are cancelled. Their parked executions are dropped, with the cleanup above.
- `LocalScheduler.execute` cancels every unfinished descendant before it returns or fails.
- A cancelled task's `Fiber` completes as `Cancelled`. `Fiber.await` returns `Outcome { value: Cancelled {} }`. `Fiber.join` raises `Cancelled`.
- Dropping a `Fiber` stops observation only. It does not cancel the task.
- A scheduler publishes cancellation through `Fiber.cancel(canceller)`, which consumes the `CompletionCanceller` endpoint.

## NonParking and Detached

- `Intrinsic.NonParking` holds for an executable whose specialized transitive call graph cannot reach external parking.
- `Intrinsic.Detached` holds for an executable that retains no external lexical or provider loan.
- Both are sealed compiler properties. No `impl` supplies them.
- `NonParking` is checked when building, not by `silk check`. A violation is SEM0139, or SEM0225 for the program entry.
- A `NonParking` value is checked even when the program never runs it.
- `NonParking` is required by: the finalizer of `Effect.ensuringNonParking`, the release of `Effect.useReleaseNonParking`, the `register` callback of `Execution.park`, the `onReady`, `onComplete` and `onSuspend` callbacks of `Execution`, and the program entry.
- A service operation marked `with Intrinsic.nonParking()` requires each provider's implementation to be `NonParking`. A parking provider is SEM0139 at the call.
- `Intrinsic.nonParking()` takes no fields, and there is no `Intrinsic.detached()` clause. `with Intrinsic.nonParking(strict: true)` or `with Intrinsic.detached()` is SEM0235 at the clause, in both `silk check` and `silk build`. `Detached` is only a bound.
- `Intrinsic.foreign(...)` and `Intrinsic.machine(...)` are not allowed on a service operation. Either is SEM0236 at the clause.

## Execution, park and wake

`silk/execution` exposes one owner per independently resumable computation.

- `Execution.make(body, readyState, onReady)` allocates one package and moves the body in. The body does not start. It needs `? &mut Allocator` and can fail with `OutOfMemoryError`. The result `Intrinsic.Execution<A>` is affine.
- `onReady: fn<'static>(&O) -> ()` is the fixed readiness endpoint. It must be `Detached` and `NonParking`. It runs with `readyState`.
- `Execution.drive(execution, state, onComplete, onSuspend)` runs one activation. Exactly one callback receives `state`: `onComplete(state, value)` on completion, or `onSuspend(state, execution)` when the body parks.
- `drive` accepts an execution that is initial, initial-ready or eligible. Driving a parked, notifying, completed or destroyed execution is a fatal trap.
- `Execution.park(register)` calls `register` with the generation's only `Wake`. The guard that `register` returns is kept while parked and dropped just before code after the `park` continues.
- `Execution.wake(wake)` consumes the `Wake`. A parked execution becomes eligible and `onReady` runs synchronously. Waking never drives.
- A `Wake` used during its own registration is latched. `onReady` runs after `drive` hands the execution back through `onSuspend`.
- A `Wake` for an earlier generation, or for a dropped or completed execution, publishes nothing.
- `Execution.notifyInitial(&mut execution)` reports readiness once for an execution that has never run. A second call, or a call after driving, traps.
- After `onReady`, the owner calls `drive` again to resume the body.

## Examples

Park, wake and resume one execution:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.execution { Execution, Wake }
import silk.shared { Shared }

struct Empty {}
struct Waiting { wake: Wake }
struct Mailbox { slot: Empty | Waiting readyCount: i32 }

fn install(mailbox: &mut Mailbox, wake: Wake) -> () {
  let previous = Intrinsic.replace(mailbox.slot, Waiting { wake: move wake })
  drop previous
  return ()
}
fn extract(mailbox: &mut Mailbox) -> Empty | Waiting {
  return Intrinsic.replace(mailbox.slot, Empty {})
}
fn markReady(mailbox: &mut Mailbox) -> () {
  mailbox.readyCount = mailbox.readyCount + 1
  return ()
}
fn readyCount(mailbox: &Mailbox) -> i32 { return mailbox.readyCount }

struct Registration {}
fn register(wake: Wake, mailbox: Shared<Mailbox>) -> Registration {
  Shared.withMut(&mailbox, install(move wake))
  return Registration {}
}

effect fn body(mailbox: Shared<Mailbox>) -> i32 {
  run Execution.park(register(move mailbox))
  return 40
}

fn onReady(mailbox: &Shared<Mailbox>) -> () {
  Shared.withMut(mailbox, markReady)
  return ()
}

struct Idle {}
struct Parked { execution: Intrinsic.Execution<i32> }
struct Owner { slot: Idle | Parked result: i32 }
fn complete(owner: &mut Owner, value: i32) -> () {
  owner.result = value
  return ()
}
fn suspended(owner: &mut Owner, execution: Intrinsic.Execution<i32>) -> () {
  let previous = Intrinsic.replace(owner.slot, Parked { execution: move execution })
  drop previous
  return ()
}

fn signal(selected: Empty | Waiting) -> () {
  return match move selected {
    Empty {} => ()
    Waiting { wake } => Execution.wake(move wake)
  }
}

effect fn resume(selected: Idle | Parked, owner: &mut Owner) -> () {
  return match move selected {
    Idle {} => ()
    Parked { execution } => run Execution.drive(move execution, move owner, complete, suspended)
  }
}

effect fn program() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mailbox = run Shared<Mailbox>.make(Mailbox { slot: Empty {}, readyCount: 0 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let execution = run Execution.make(body(Shared.clone(&mailbox)), Shared.clone(&mailbox), onReady)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut owner = Owner { slot: Idle {}, result: 0 }
  run Execution.drive(move execution, &mut owner, complete, suspended)
  signal(Shared.withMut(&mailbox, extract))
  let parked = Intrinsic.replace(owner.slot, Idle {})
  run resume(move parked, &mut owner)
  return owner.result + Shared.with(&mailbox, readyCount) - 41
}

effect fn recover(error: OutOfMemoryError) -> i32 { return 1 }
pub fn main() -> i32 { return run Effect.catchAll(program(), recover) }
```

Cancel a parked execution. The local `Token` drops first (digit 1), then the nonparking finalizer runs (digit 2). With `Effect.ensuring` in place of `Effect.ensuringNonParking`, the log is `1`.

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.execution { Execution, Wake }
import silk.ownership { Drop }
import silk.shared { Shared }

struct Log { value: i32 }
fn push(log: &mut Log, digit: i32) -> () {
  log.value = log.value * 10 + digit
  return ()
}
fn read(log: &Log) -> i32 { return log.value }

struct Token { log: Shared<Log> digit: i32 }
impl Drop for Token {
  fn drop(self: &mut Token) -> () {
    Shared.withMut(&self.log, push(self.digit))
    return ()
  }
}

struct Guard { wake: Wake }
fn register(wake: Wake) -> Guard { return Guard { wake: move wake } }

effect fn body(log: Shared<Log>) -> i32 {
  let token = Token { log: move log, digit: 1 }
  run Execution.park(register)
  drop token
  return 0
}

effect fn note(log: Shared<Log>) -> () {
  Shared.withMut(&log, push(2))
  return ()
}

effect fn guarded(log: Shared<Log>) -> i32 {
  let other = Shared.clone(&log)
  return run Effect.ensuringNonParking(body(move log), note(move other))
}

struct Endpoint {}
fn ready(endpoint: &Endpoint) -> () { return () }
fn complete(state: &mut (), value: i32) -> () { return () }
fn suspended(state: &mut (), execution: Intrinsic.Execution<i32>) -> () {
  drop execution
  return ()
}

effect fn program() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let log = run Shared<Log>.make(Log { value: 0 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let execution = run Execution.make(guarded(Shared.clone(&log)), Endpoint {}, ready)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut state = ()
  run Execution.drive(move execution, &mut state, complete, suspended)
  return Shared.with(&log, read) - 12
}

effect fn recover(error: OutOfMemoryError) -> i32 { return -1 }
pub fn main() -> i32 { return run Effect.catchAll(program(), recover) }
```

A child is cancelled when its parent task finishes. The grandchild `leaf` sleeps for an hour; `middle` returns first, so `leaf` is cancelled, its `Token` drops, and awaiting its `Fiber` reports `Cancelled`:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.fiber { Fiber, Cancelled, Failure, Outcome, Success }
import silk.local_scheduler { LocalScheduler, StalledError }
import silk.monotonic_clock { MonotonicClock }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.ownership { Drop }
import silk.scheduler { Scheduler, TaskIdExhaustedError }
import silk.shared { Shared }

struct Log { drops: i32 }
fn countDrop(log: &mut Log) -> () {
  log.drops = log.drops + 1
  return ()
}
fn drops(log: &Log) -> i32 { return log.drops }

struct Token { log: Shared<Log> }
impl Drop for Token {
  fn drop(self: &mut Token) -> () {
    Shared.withMut(&self.log, countDrop)
    return ()
  }
}

struct Empty {}
struct Held { fiber: Fiber<i32, never> }
struct Slot { phase: Empty | Held }
fn store(slot: &mut Slot, fiber: Fiber<i32, never>) -> () {
  let previous = Intrinsic.replace(slot.phase, Held { fiber: move fiber })
  drop previous
  return ()
}
fn take(slot: &mut Slot) -> Empty | Held {
  return Intrinsic.replace(slot.phase, Empty {})
}

effect fn leaf(log: Shared<Log>) -> i32
? &mut Scheduler | &mut MonotonicClock {
  let token = Token { log: move log }
  run MonotonicClock.waitFor(1h)
  drop token
  return 1
}

effect fn middle(slot: Shared<Slot>, log: Shared<Log>) -> i32
! OutOfMemoryError | TaskIdExhaustedError
? &mut Scheduler | &mut MonotonicClock {
  let child = run Fiber<i32, never>.forkChild(leaf(move log))
  Shared.withMut(&slot, store(move child))
  run Fiber.yieldNow()
  return 2
}

fn wasCancelled(outcome: Outcome<i32, never>) -> bool {
  let Outcome<i32, never> { value } = move outcome
  return match move value {
    Success<i32> { value: success } => false
    Failure<never> { error } => false
    Cancelled {} => true
  }
}

effect fn root(log: Shared<Log>) -> i32
! OutOfMemoryError | TaskIdExhaustedError | Cancelled
? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let slot = run Shared<Slot>.make(Slot { phase: Empty {} })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mid = run Fiber<i32, OutOfMemoryError | TaskIdExhaustedError>.forkChild(
    middle(Shared.clone(&slot), Shared.clone(&log)),
  )
  let value = run Fiber.join(move mid)
  let selected = Shared.withMut(&slot, take)
  return match move selected {
    Empty {} => 10
    Held { fiber } => checkLeaf(value, run Fiber.await(move fiber), Shared.with(&log, drops))
  }
}

fn checkLeaf(value: i32, outcome: Outcome<i32, never>, dropCount: i32) -> i32 {
  if value != 2 { return 11 }
  if !wasCancelled(move outcome) { return 12 }
  return dropCount - 1
}

effect fn scenario() -> i32
! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let log = run Shared<Log>.make(Log { drops: 0 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  return run LocalScheduler.execute(&mut scheduler, root(move log))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

effect fn recover(error: OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError) -> i32 {
  drop error
  return 99
}
pub fn main() -> i32 { return run Effect.catchAll(scenario(), recover) }
```

## Errors and fixes

OWN0016, running an Effect inside a `Shared.withMut` callback:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.shared { Shared }

struct Counter { value: i32 }
effect fn five() -> i32 { return 5 }
fn bump(counter: &mut Counter) -> i32 {
  counter.value = counter.value + run five()
  return counter.value
}

effect fn program() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let cell = run Shared<Counter>.make(Counter { value: 1 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  return Shared.withMut(&cell, bump)
}
effect fn recover(error: OutOfMemoryError) -> i32 { return -1 }
pub fn main() -> i32 { return run Effect.catchAll(program(), recover) }
```

Run the Effect first and pass its result into the callback:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.shared { Shared }

struct Counter { value: i32 }
effect fn five() -> i32 { return 5 }
fn add(counter: &mut Counter, amount: i32) -> i32 {
  counter.value = counter.value + amount
  return counter.value
}

effect fn program() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let cell = run Shared<Counter>.make(Counter { value: 1 })
    |> Effect.provideMut<Allocator>(&mut allocator)
  let amount = run five()
  return Shared.withMut(&cell, add(amount)) - 6
}
effect fn recover(error: OutOfMemoryError) -> i32 { return -1 }
pub fn main() -> i32 { return run Effect.catchAll(program(), recover) }
```

SEM0139, a parking finalizer passed to `Effect.ensuringNonParking`. In the cancellation example, adding `run Execution.park(register)` to the body of `note` makes the build fail with SEM0139 at the `Effect.ensuringNonParking` call. Use `Effect.ensuring` for a finalizer that must park, and accept that it does not run on cancellation.

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0016 | Code reached from a `Shared.with` or `Shared.withMut` callback runs an Effect or notifies an execution while the access is held |
| SEM0139 | An executable fails a sealed property obligation, such as `Intrinsic.NonParking`, or an `Execution.make` body that borrows a caller's local and so is not `Intrinsic.Detached` |
| SEM0225 | `main` may park, but the runtime starts it without a scheduler |
| SEM0235 | Unknown property clause or field, such as `with Intrinsic.detached()` |
| SEM0236 | Known property clause on an operation that does not take it, such as `with Intrinsic.machine(noReturn: true)` |

## See also

Effects and run · Fibers and scheduling · Typed failures · Allocation and shared ownership · Ownership and moves · Borrowing · Lifetimes · Closures and callable types · Program entry and termination · `silk/execution` · `silk/fiber` · `silk/shared` · `silk/effect` · `silk/local_scheduler`

## Open questions

- SEM0139, and SEM0225 for a parking `main`, are reported only by a build. `silk check` accepts a program that violates `Intrinsic.NonParking`.
- SEM0139 for a parking provider of a `with Intrinsic.nonParking()` operation can point into `silk/effect`, for example when `main` runs the operation directly. The user site is not named.
- OWN0016 for a wake inside a callback is reported at `silk/execution.silk`, not at the user's call.
- SEM0201, an `export "C"` function that may park, is also reported only by `silk build`.
