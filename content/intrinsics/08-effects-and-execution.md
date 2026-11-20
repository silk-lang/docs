# Effects and execution

These members are the compiler's half of effects and fibers. The composition members build an Effect from other Effects: they catch a failure, run a finalizer, lend a provider, add a stack-safety boundary or an interruptible boundary, or observe diagnostics. The execution members package one Effect so that ordinary Silk code can start it, get it back when it relinquishes control, and drive it again; `silk/concurrency/execution`, the schedulers and the thread pool are built on them. The rest stop the program (`trap`, `unreachable`), report failures (`observeUnhandled`, `observeHandled`) or emit machine code (`assembly`).

Most code uses the wrappers: [`Effect`](/docs/std/core-effect#Effect) in `silk/core/effect`, [`Execution`](/docs/std/concurrency-execution#Execution) in `silk/concurrency/execution`, and [`NativeDiagnostics`](/docs/std/platform-native-diagnostics#NativeDiagnostics) in `silk/platform/native/diagnostics`.

## Composition

A composition member does not run anything. It returns a `once Effect` that a `run` site expands, so the result is used with `run` or passed on like any other Effect. In the signatures, `'env` is the lifetime of the Effects and callbacks, and `A ! E ? R` is the success, failure and requirement rows of an Effect. The type arguments are either all written or all inferred, except where an entry says otherwise. An empty failure or requirement row is written `never`.

### `Intrinsic.catchFailure`

```silk signature
fn catchFailure<S>(
  protected: once Effect<'env; A ! E ? R>,
  onFailure: once effect fn<'env>(S) -> B ! F ? Q,
) -> once Effect<'env; A | B ! Without<E, S> | F ? R | Q>
```

Runs `protected`. When it fails with a failure of type `S`, runs `onFailure` with that failure and yields what it yields. Other failures pass through.

- `S` is written; everything else is inferred. `S` is the whole failure row `E` or one member of it.
- The handler is an `effect fn` value or an `effect` lambda that takes one `S`. A handler of another shape is SEM0177.
- A failure the handler raises while it handles one records the handled failure as its cause, which an observer reports as "while handling".
- Wrappers: [`Effect.catchAll`](/docs/std/core-effect#Effect.impl.catchAll), [`Effect.catch`](/docs/std/core-effect#Effect.impl.catch), [`Effect.mapError`](/docs/std/core-effect#Effect.impl.mapError) and [`Effect.result`](/docs/std/core-effect#Effect.impl.result).

```silk
struct Empty {}

effect fn first(values: &[i32]) -> i32 ! Empty {
  if values.length == 0 { fail Empty {} }
  return values[0]
}

effect fn fallback(_missing: Empty) -> i32 {
  return -1
}

pub effect fn main() -> i32 {
  let values: [i32; 0] = []
  let found = run Intrinsic.catchFailure<Empty>(first(&values), fallback)
  if found != -1 { return 1 }
  return 0
}
```

### `Intrinsic.finalizeEffect`

```silk signature
fn finalizeEffect<A, E, R, S>(
  protected: once Effect<'env; A ! E ? R>,
  finalizer: once Effect<'env; () ! never ? S>,
) -> once Effect<'env; A ! E ? R | S>
```

Runs `protected`, then `finalizer`, whether `protected` succeeded, failed or was cancelled while parked. The result is `protected`'s success or failure.

- The finalizer cannot fail: its failure row is `never`.
- A cancelled fiber runs pending finalizers before the regions around them are cleaned, innermost first.
- Wrapper: [`Effect.ensuring`](/docs/std/core-effect#Effect.impl.ensuring).

```silk
struct Empty {}

effect fn failing(count: &mut i32) -> i32 ! Empty {
  count.* = count.* + 1
  fail Empty {}
}

effect fn record(count: &mut i32) -> () {
  count.* = count.* + 10
}

effect fn recover(_missing: Empty) -> i32 { return 0 }

pub effect fn main() -> i32 {
  let mut count: i32 = 0
  let mut closed: i32 = 0
  let guarded = Intrinsic.finalizeEffect(failing(&mut count), record(&mut closed))
  drop run Intrinsic.catchFailure<Empty>(move guarded, recover)
  if count != 1 || closed != 10 { return 1 }
  return 0
}
```

### `Intrinsic.finalizeEffectNonParking`

```silk signature
fn finalizeEffectNonParking<A, E, R, S, F: once Effect<'env; () ! never ? S> + Intrinsic.NonParking>(
  protected: once Effect<'env; A ! E ? R>,
  finalizer: F,
) -> once Effect<'env; A ! E ? R | S>
```

`finalizeEffect` with a finalizer that cannot park. A cleanup that must finish without waiting, such as closing a descriptor, uses this form, so a cancelled fiber never parks again while it is being cleaned.

- Write `A`, `E`, `R` and `S`; `F` is inferred from the finalizer.
- A finalizer that can park is SEM0139, with the path that parks.
- Wrapper: [`Effect.ensuringNonParking`](/docs/std/core-effect#Effect.impl.ensuringNonParking).

```silk
effect fn work(count: &mut i32) -> i32 {
  count.* = count.* + 1
  return count.*
}

effect fn close(closed: &mut i32) -> () {
  closed.* = 1
}

pub effect fn main() -> i32 {
  let mut count: i32 = 41
  let mut closed: i32 = 0
  let value = run Intrinsic.finalizeEffectNonParking<i32, never, never, never>(work(&mut count), close(&mut closed))
  if value != 42 || closed != 1 { return 1 }
  return 0
}
```

### `Intrinsic.useReleaseNonParking`

```silk signature
fn useReleaseNonParking<Resource, A, E, R, S>(
  resource: Resource,
  use: for<'scope> once fn<'env>(&'scope mut Resource) -> once Effect<'scope & 'env; A ! E ? R>,
  release: for<'scope> once fn<'env>(&'scope mut Resource) -> once Effect<'scope & 'env; () ! never ? S> + Intrinsic.NonParking,
) -> once Effect<'env; A ! E ? R | S>
```

Takes ownership of `resource`, lends it to `use`, then lends it to `release`, whether `use` succeeded, failed or was cancelled. The resource is dropped after `release`.

- Both callbacks return an Effect, so they are usually `effect` lambdas.
- `release` cannot fail or park.
- Wrapper: [`Effect.useReleaseNonParking`](/docs/std/core-effect#Effect.impl.useReleaseNonParking). Sockets, listeners and HTTP exchanges in the standard library close through it.

```silk
struct Connection {
  open: bool,
  sent: i32,
}

effect fn send(connection: &mut Connection) -> i32 {
  connection.sent = connection.sent + 3
  return connection.sent
}

effect fn close(connection: &mut Connection) -> () {
  connection.open = false
}

pub effect fn main() -> i32 {
  let connection = Connection { open: true, sent: 0 }
  let use = effect |held: &mut Connection| -> i32 { return run send(move held) }
  let release = effect |held: &mut Connection| -> () { run close(move held) }
  let sent = run Intrinsic.useReleaseNonParking<Connection, i32, never, never, never>(move connection, move use, move release)
  if sent != 3 { return 1 }
  return 0
}
```

### `Intrinsic.bindRequirement`

```silk signature
fn bindRequirement<S>(effect: once Effect<'env; A ! E ? R>, provider: &'env P) -> once Effect<'env; A ! E ? Without<R, S>>
```

Provides the service `S` to `effect` through a shared borrow of `provider`, and removes `S` from the requirement row.

- `S` is written; `P` must implement it: `&'env P provides S from R`. A provider that does not is SEM0083.
- Wrapper: [`Effect.bindRequirement`](/docs/std/core-effect#Effect.impl.bindRequirement) and [`Effect.provide`](/docs/std/core-effect#Effect.impl.provide).
- The example under `bindRequirementMut` shows the pattern.

### `Intrinsic.bindRequirementMut`

```silk signature
fn bindRequirementMut<S>(effect: once Effect<'env; A ! E ? R>, provider: &'env mut P) -> once Effect<'env; A ! E ? Without<R, S>>
```

`bindRequirement` through an exclusive borrow of the provider, for a service whose operations take `&mut Self`. This is the common form.

- Wrapper: [`Effect.provideMut`](/docs/std/core-effect#Effect.impl.provideMut) and [`Effect.bindRequirementMut`](/docs/std/core-effect#Effect.impl.bindRequirementMut).

```silk
service Counter {
  effect fn bump(self: &mut Self) -> i32
}

struct Local {
  count: i32,
}

impl Counter for Local {
  effect fn bump(self: &mut Self) -> i32 {
    self.count = self.count + 1
    return self.count
  }
}

effect fn twice() -> i32 ? &mut Counter {
  let _first = run Counter.bump()
  return run Counter.bump()
}

pub effect fn main() -> i32 {
  let mut local = Local { count: 40 }
  let bound = Intrinsic.bindRequirementMut<Counter>(twice(), &mut local)
  let total = run move bound
  if total != 42 { return 1 }
  return 0
}
```

### `Intrinsic.bindRequirementOwned`

```silk signature
fn bindRequirementOwned<S>(effect: once Effect<'env; A ! E ? R>, provider: P) -> once Effect<'env; A ! E ? Without<R, S>>
```

`bindRequirement` that moves the provider into the Effect. The provider lives as long as the Effect and is dropped with it, so the Effect borrows nothing from the caller for it.

- Wrapper: [`Effect.bindRequirementOwned`](/docs/std/core-effect#Effect.impl.bindRequirementOwned).
- The example under `bindRequirementMut` works with `move local` in place of `&mut local`.

### `Intrinsic.suspendEffect`

```silk signature
fn suspendEffect(deferred: once Effect<'env; A ! E ? R>) -> once Effect<'env; A ! E ? R>
```

Runs `deferred` across a stack-safety boundary: the running frames are stored, `deferred` starts on a bounded machine stack, and its success or failure is returned to the caller. A recursive Effect whose every cycle crosses such a boundary uses bounded machine stack at any depth.

- The compiler never adds a boundary itself. Recursion that does not cross one is valid and uses machine stack for every level; running out of it is the fatal trap "stack overflow".
- The rows are exactly those of `deferred`. Suspension is not a fiber, a yield or a scheduler point.
- Wrapper: [`Effect.suspend`](/docs/std/core-effect#Effect.impl.suspend).

```silk
effect fn count(value: i32) -> i32 {
  if value == 0 {
    return 0
  }
  let inner = run Intrinsic.suspendEffect(count(value - 1))
  return inner + 1
}

pub effect fn main() -> i32 {
  let reached = run count(1000000)
  if reached != 1000000 { return 1 }
  return 0
}
```

Without the boundary, the same program stops with `fatal trap: stack overflow`.

### `Intrinsic.interruptibleEffect`

```silk signature
fn interruptibleEffect(token: usize, body: once Effect<'env; () ! E ? R>) -> once Effect<'env; bool ! E ? R>
```

Runs `body` as an interruptible boundary named by `token`. It yields `true` when `body` completes. An interrupt request for `token` that arrives while `body` is parked abandons the frames above the boundary, dropping their owners as cancellation does, and the boundary yields `false`.

- `body` succeeds with `()`; another success type is SEM0012. A body that needs a value stores it in a place it borrows.
- Interrupts are requested by the owner of the fiber: [`Execution.interrupt`](/docs/std/concurrency-execution#Execution.impl.interrupt) records the token in control word 2, and the next drive resumes the boundary. A deadline fires one in `Scheduler` and in the thread pool.
- Wrappers: [`Effect.timeout`](/docs/std/core-effect#Effect.impl.timeout) and [`Effect.timeoutAt`](/docs/std/core-effect#Effect.impl.timeoutAt), and `Pool.timeout`.

```silk
effect fn work(done: &mut bool) -> () {
  done.* = true
}

pub effect fn main() -> i32 {
  let mut done = false
  // No interrupt names token 7, so the body completes and the boundary yields true.
  let token: usize = 7
  let completed = run Intrinsic.interruptibleEffect(token, work(&mut done))
  if !completed || !done { return 1 }
  return 0
}
```

### `Intrinsic.observeDiagnostics`

```silk signature
fn observeDiagnostics<S, A, R, F: fn<'static>(&mut S, u8, usize, usize, string<'static>, string<'static>) -> usize + Intrinsic.NonParking>(
  state: S,
  callback: F,
  body: once Effect<'env; A ? R>,
) -> once Effect<'env; A ? R>
```

Runs `body` under a diagnostic observer. Where a failure is created, crosses a `run` site, is handled, or stops the program with a trap, the code calls `callback(&mut state, event, first, second, identity, origin)`. The observer is released when the Effect completes, is cancelled, or is dropped before it runs.

- `body` handles its own failures: its failure row is empty, so no failure leaves the observer.
- The callback cannot park, and it runs with no observer of its own.
- A callback of another shape is SEM0012.
- Write all four type arguments, or call it from a generic function as below. The usual observer is [`NativeDiagnostics.observe`](/docs/std/platform-native-diagnostics#NativeDiagnostics.impl.observe), which keeps a pool of context nodes and writes the error reports that `silk run` prints.

| Event | When | Arguments | Return |
| --- | --- | --- | --- |
| 0 | A failure is created | `identity` is the error's name, `origin` its site | A handle for the new context node, or 0 |
| 1 | A failure leaves a function through a `run` site | `first` is the node, `identity` the frame | The new node |
| 2 | A failure is raised while another is handled | `first` the new node, `second` its cause | The chained node |
| 3 | A node gains a reference | `first` | The node |
| 4 | A node loses a reference | `first` | 0 |
| 5 | `observeUnhandled` | `first` the selected failure's node | The policy that `observeUnhandled` returns |
| 6 | A trap | `identity` the reason, `origin` the site, `first` the cause or 0 | 0 |
| 7 | `observeHandled` | `first` the node | The value `observeHandled` returns |
| 8 | A caller frame of a trap, in an unoptimized build | `identity` the frame | 0 |
| 9 | The end of a trap's frames | `first` the cause or 0 | 0 |

```silk
struct Empty {}

struct Tally {
  originated: usize,
  reported: usize,
}

fn onEvent(tally: &mut &mut Tally, event: u8, _first: usize, _second: usize, _identity: string<'static>, _origin: string<'static>) -> usize {
  if event == 0 {
    tally.originated = tally.originated + 1
    return tally.originated
  }
  if event == 5 {
    tally.reported = tally.reported + 1
    return 3
  }
  return 0
}

fn observe<'env, S: 'env, A, ?R, F: fn<'static>(&mut S, u8, usize, usize, string<'static>, string<'static>) -> usize + Intrinsic.NonParking>(
  state: S, callback: F, body: once Effect<'env; A ? R>) -> once Effect<'env; A ? R> {
  return Intrinsic.observeDiagnostics<S, A, R, F>(move state, move callback, move body)
}

effect fn failing() -> i32 ! Empty {
  fail Empty {}
}

effect fn report(error: Empty) -> i32 {
  drop error
  return Intrinsic.usizeToI32(Intrinsic.observeUnhandled())
}

pub effect fn main() -> i32 {
  let mut tally = Tally { originated: 0, reported: 0 }
  let body = Intrinsic.catchFailure<Empty>(failing(), report)
  let status = run observe(&mut tally, onEvent, move body)
  if status != 3 || tally.originated != 1 || tally.reported != 1 { return 1 }
  return 0
}
```

## Ambient providers

The standard library uses these members to install providers and carry them with an execution. Applications install a provider with `Effect.provideAmbient`.

### `Intrinsic.ambientEntry`

```silk signature
fn ambientEntry<S>(provider: &P) -> [u64; 2]
```

The compiler checks that the concrete provider type `P` implements ambient service `S`. The result contains the service's table index and the implementation tag for that provider. The library uses the pair to install a provider in the current scope.

### `Intrinsic.ambientSlot`

```silk signature
fn ambientSlot<T>() -> *mut ?*const T
```

Returns the address of the slot that points to the current ambient provider table. A null table selects the ambient service defaults. The runtime saves and restores the slot when an execution suspends or resumes.

### `Intrinsic.ambientCount`

```silk signature
static fn ambientCount() -> usize
```

Returns the number of ambient service slots required by the build. The library uses it to size the table at compile time. If no ambient provider is reachable, the count is zero.

## Failure reports

### `Intrinsic.observeUnhandled`

```silk signature
fn observeUnhandled() -> usize
```

Reports the failure the enclosing handler is handling to the lexical observer, as an unhandled failure (event 5), and returns the policy the observer's callback returns. Without an observer, or outside a handler, it returns 0.

- The platform start code calls it when `main` fails, and exits with the policy as the status. `NativeDiagnostics` writes the report and returns 1.
- Drop the error value before the call, so its context is released after the report.
- The example under `observeDiagnostics` calls it from a handler.

### `Intrinsic.observeHandled`

```silk signature
fn observeHandled() -> usize
```

Reports the failure the enclosing handler is handling to the lexical observer as one the handler reports in its own words (event 7), so the observer adds only where the failure came from. Returns what the callback returns, or 0 without an observer or outside a handler.

- The test runner calls it after printing a failed expectation.
- The example under `observeDiagnostics` works with `observeHandled` in the handler and `event == 7` in the callback.

## Stopping the program

### `Intrinsic.trap`

```silk signature
fn trap(reason: string<'static>) -> never
```

Stops the program. It does not unwind and runs no cleanup. Under an observer, it first reports `reason` at the call site (event 6), so `silk run` prints `fatal trap: <reason>` and the calling frames. A native program then stops with an illegal instruction, exit status 132.

- Safe: stopping is always allowed. Use it for a broken invariant the program cannot continue past, not for an expected error; those are failures.
- The result type is `never`, so `return Intrinsic.trap(...)` fits any function.
- The checks the compiler inserts, such as "index out of bounds", "arithmetic overflow" and "division by zero", stop the program the same way.

```silk
fn digit(value: u8) -> u8 {
  if value < 48 || value > 57 {
    return Intrinsic.trap("digit: not an ASCII digit")
  }
  return value - 48
}

pub fn main() -> i32 {
  if digit(55) != 7 { return 1 }
  return 0
}
```

`digit(65)` stops with `fatal trap: digit: not an ASCII digit` and `at main.digit (main:3:12)`.

### `Intrinsic.unreachable`

```silk signature
unsafe fn unreachable() -> never
```

Marks a point that execution never reaches. The optimizer may assume every path to it is dead and remove the branch that leads there, so a branch around it states a fact the caller proves.

- Unsafe. Reaching it is undefined behavior: there is no check and no report. Use `trap` when the point can be reached in a buggy program.
- The result type is `never`.
- Wrapper: [`unreachable`](/docs/std/core-hint#unreachable) in `silk/core/hint`.

```silk
// The caller proves `value` is 0, 1 or 2.
unsafe fn name(value: u8) -> string<'static> {
  if value == 0 { return "red" }
  if value == 1 { return "green" }
  if value == 2 { return "blue" }
  return unsafe Intrinsic.unreachable()
}

pub fn main() -> i32 {
  let picked = unsafe name(1)
  if Intrinsic.stringByteLength(picked) != 5 { return 1 }
  return 0
}
```

## Assembly

### `Intrinsic.assembly`

```silk signature
unsafe fn assembly<Result>(
  static template: string,
  static constraints: string,
  static clobbers: string,
  static memory: string,
  static sideEffects: bool,
  static noReturn: bool,
  inputs: (...),
) -> Result
```

Emits one function-local machine fragment. The first four arguments are literal strings, the next two literal booleans, and `inputs` is a tuple of zero to seven runtime operands. The compiler consumes the metadata; only the operands exist at runtime.

- Targets: Linux x86-64, Linux AArch64 and Darwin AArch64. Static evaluation, WebAssembly and LTO builds are refused.
- `Result` is `()` or one `i64`, `u64`, `isize`, `usize` or data pointer, and so is each operand. Floats, vectors, aggregates, references and other integer widths are refused.
- `template` is AT&T syntax on x86-64 and the default syntax on AArch64. Operands are `$0`, `$1` and so on; a literal `$` is `$$`. No module directives.
- `constraints`: a non-unit result has one output, `={reg}`, `=&{reg}` (early clobber), `=r` or `=&r`. Each input is `{reg}`, `r`, `m` (the memory a pointer input addresses, which needs a `memory` other than `"none"`) or `0` (tied to the output). On x86-64 the registers are rax, rdi, rsi, rdx, rcx and r8 to r11; on AArch64, x0 to x17.
- `clobbers` is a comma-separated list of those registers and `flags`.
- `memory` is `"none"`, `"read"`, `"write"` or `"readwrite"`. `sideEffects` declares effects beyond the result. `noReturn` requires a unit result and side effects.
- Unsafe. The caller proves bounds, aliasing, lifetime and every machine effect. Assembly that returns must preserve the stack, the callee-saved registers and anything it does not declare, and it never unwinds. Assembly that lies about its memory, clobbers or return is undefined behavior.
- Wrappers: the syscalls in `silk/platform/linux/syscall`.

```silk check target=x86_64-unknown-linux-gnu
unsafe fn add(left: u64, right: u64) -> u64 {
  return unsafe Intrinsic.assembly<u64>(
    "addq $2, $0", "={rax},0,{rdi}", "flags", "none", false, false, (left, right))
}

pub fn main() -> i32 {
  if unsafe add(40, 2) != 42 { return 1 }
  return 0
}
```

## Execution packages

An **Execution** is one package that holds a lazy Effect body, its stored frames while it is not running, a readiness endpoint, and three control words. Its owner drives it: one drive runs the body until it completes or relinquishes, and a relinquished Execution comes back to the owner, who drives it again later. The compiler provides the package and its operations; parking, wakes, the readiness phases and every scheduler are ordinary Silk in `silk/concurrency/execution`.

The **control words** are three `usize` values the compiler sets to 0 and otherwise leaves alone, except that the step after a drive reads and clears word 2 for `interruptibleEffect`. `silk/concurrency/execution` uses word 0 for the park generation and readiness phase, word 1 for how the package was made, and word 2 for a pending interrupt token. A word index above 2 is the fatal trap "invalid execution control word".

Both examples below are complete programs. The first starts a package, lets it relinquish, inspects it, and drives it again; the second notifies a package and drops it.

```silk
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.mem.allocator { Allocator, OutOfMemoryError }

fn readied(state: &u8) -> () {
  drop state
}

struct Outcome {
  result: i32,
  parked: Option<Intrinsic.Execution<i32>>,
}

fn completed(outcome: *mut Outcome, value: i32) -> () {
  unsafe {
    let mut anchor: u8 = 0
    let place = Intrinsic.pointerBorrowMut<u8, Outcome>(&mut anchor, outcome)
    place.result = value
  }
}

fn suspended(outcome: *mut Outcome, execution: Intrinsic.Execution<i32>) -> () {
  unsafe {
    let mut anchor: u8 = 0
    let place = Intrinsic.pointerBorrowMut<u8, Outcome>(&mut anchor, outcome)
    place.parked = Option<Intrinsic.Execution<i32>>.some(move execution)
  }
}

effect<'static> fn package<
  A,
  F: once Effect<'static; A> + Intrinsic.Detached,
  O: Intrinsic.Detached,
  R: fn<'static>(&O) -> () + Intrinsic.Detached + Intrinsic.NonParking
>(body: F, readyState: O, onReady: R) -> Intrinsic.Execution<A> ! OutOfMemoryError ? &mut Allocator {
  let allocation = run Allocator.allocate(Intrinsic.executionLayout<A, F, O, R>())
  return unsafe Intrinsic.executionFromAllocation<A, F, O, R>(move allocation, move body, move readyState, move onReady)
}

effect<'env> fn drive<
  'env,
  A: 'env,
  D: 'env,
  C: once fn<'env>(D, A) -> () + Intrinsic.NonParking,
  S: once fn<'env>(D, Intrinsic.Execution<A>) -> () + Intrinsic.NonParking
>(execution: Intrinsic.Execution<A>, branchState: D, onComplete: C, onSuspend: S) -> () {
  run Intrinsic.executionDrive<A, D, C, S>(move execution, move branchState, move onComplete, move onSuspend)
}

effect fn body() -> i32 {
  let reference = run Intrinsic.executionCurrent()
  // Control word 1 starts at 0. The first exchange stores 5; the second sees 5 and stores nothing.
  if Intrinsic.executionCompareExchange(&reference, 1, 0, 5) != 0 { return -1 }
  if Intrinsic.executionCompareExchange(&reference, 1, 0, 9) != 5 { return -1 }
  Intrinsic.executionStore(&reference, 0, 7)
  run Intrinsic.relinquish()
  // The next drive continues here.
  return Intrinsic.usizeToI32(Intrinsic.executionLoad(&reference, 0)) * 6
}

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let ready: u8 = 0
  let execution = run package(body(), ready, readied) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut outcome = Outcome { result: 0, parked: Option<Intrinsic.Execution<i32>>.none() }
  let at = Intrinsic.pointerFromMutRef<Outcome>(&mut outcome)
  run drive(move execution, at, completed, suspended)
  let parked = Intrinsic.replace(outcome.parked, Option<Intrinsic.Execution<i32>>.none())
  if let Option<Intrinsic.Execution<i32>>.Some { value } = move parked {
    let reference = Intrinsic.executionRefOf<i32>(&value)
    if !Intrinsic.executionLive(&reference) || Intrinsic.executionLoad(&reference, 0) != 7 {
      return 1
    }
    run drive(move value, at, completed, suspended)
  } else {
    return 2
  }
  if outcome.result != 42 {
    return 3
  }
  return 0
}
```

```silk
import silk.core.effect { Effect }
import silk.mem.allocator { Allocator, OutOfMemoryError }

fn readied(counter: &*mut u32) -> () {
  unsafe Intrinsic.pointerWrite<u32>(counter.*, unsafe Intrinsic.pointerRead<u32>(counter.*) + 1)
}

effect<'static> fn package<
  A,
  F: once Effect<'static; A> + Intrinsic.Detached,
  O: Intrinsic.Detached,
  R: fn<'static>(&O) -> () + Intrinsic.Detached + Intrinsic.NonParking
>(body: F, readyState: O, onReady: R) -> Intrinsic.Execution<A> ! OutOfMemoryError ? &mut Allocator {
  let allocation = run Allocator.allocate(Intrinsic.executionLayout<A, F, O, R>())
  return unsafe Intrinsic.executionFromAllocation<A, F, O, R>(move allocation, move body, move readyState, move onReady)
}

effect fn body() -> i32 {
  return 42
}

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut notified: u32 = 0
  let execution = run package(body(), Intrinsic.pointerFromMutRef<u32>(&mut notified), readied)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let reference = Intrinsic.executionRefOf<i32>(&execution)
  Intrinsic.executionNotify(&reference)
  if notified != 1 || !Intrinsic.executionLive(&reference) {
    return 1
  }
  // Dropping the handle cancels the unstarted body; the reference still names the package.
  drop execution
  Intrinsic.executionNotify(&reference)
  if notified != 1 || Intrinsic.executionLive(&reference) {
    return 2
  }
  return 0
}
```

### `Intrinsic.executionLayout`

```silk signature
fn executionLayout<A, F, O, R>() -> Layout
```

Returns the size and alignment of one package for body `F` with result `A`, readiness state `O` and readiness endpoint `R`. Allocate that much storage and pass it to `executionFromAllocation` with the same type arguments.

- Wrapper: [`Execution.make`](/docs/std/concurrency-execution#Execution.impl.make) allocates through the `Allocator` service.

### `Intrinsic.executionFromAllocation`

```silk signature
unsafe fn executionFromAllocation<
  A,
  F: once Effect<'static; A> + Intrinsic.Detached,
  O: Intrinsic.Detached,
  R: fn<'static>(&O) -> () + Intrinsic.Detached + Intrinsic.NonParking,
>(allocation: Allocation, body: F, readyState: O, onReady: R) -> Intrinsic.Execution<A>
```

Builds a package in `allocation` and returns its handle in the `Initial` state. The body has not started.

- Unsafe: `allocation` must have the layout `executionLayout<A, F, O, R>()` returns. A mismatch the compiler can see is SEM0142.
- The body and the readiness state are detached: they own what they capture and borrow nothing from the caller. The endpoint is detached and cannot park. A body or endpoint that is not is SEM0139, with the capture, provider or parking path.
- The body has no failure or requirement row; it handles its failures and provides its services.
- Wrapper: [`Execution.make`](/docs/std/concurrency-execution#Execution.impl.make) and [`Execution.makeTransferable`](/docs/std/concurrency-execution#Execution.impl.makeTransferable).

### `Intrinsic.executionDrive`

```silk signature
fn executionDrive<
  A,
  D,
  C: once fn<'env>(D, A) -> () + Intrinsic.NonParking,
  S: once fn<'env>(D, Intrinsic.Execution<A>) -> () + Intrinsic.NonParking,
>(execution: Intrinsic.Execution<A>, branchState: D, onComplete: C, onSuspend: S) -> Effect<()>
```

Runs one activation of `execution`, in place, with `run`. If the body completes, calls `onComplete(branchState, result)`. If it relinquishes, calls `onSuspend(branchState, execution)`, which gets ownership of the Execution back. Exactly one of the two runs.

- The first drive starts the body; each later drive continues after the `relinquish` that stopped it.
- The intrinsic drives any package. [`Execution.drive`](/docs/std/concurrency-execution#Execution.impl.drive) also checks the readiness phase in control word 0 and traps for a package that is running, parked and not yet eligible, or finished.
- The callbacks cannot park.

### `Intrinsic.relinquish`

```silk signature
fn relinquish() -> Effect<()>
```

Called with `run` inside a running body: stores the body's frames in the package and returns from the current drive through its `onSuspend`. The next drive continues after the call.

- Outside a package body there is nothing to relinquish to; the compiler requires the call to sit in an Effect that a drive runs.
- Parking a body that holds an incompatible local loan is OWN0016.
- Wrapper: [`Execution.park`](/docs/std/concurrency-execution#Execution.impl.park), which first hands a `Wake` to a registration callback.

### `Intrinsic.executionCurrent`

```silk signature
fn executionCurrent() -> Effect<Intrinsic.ExecutionRef>
```

Called with `run` inside a running body: returns a reference to the package the body runs in.

- An `ExecutionRef` keeps the package allocation alive, not the body. See [`Intrinsic.ExecutionRef`](/docs/intrinsics/types#intrinsicexecutionref).

### `Intrinsic.executionRefOf`

```silk signature
fn executionRefOf<A>(execution: &Intrinsic.Execution<A>) -> Intrinsic.ExecutionRef
```

Returns a reference to the package that `execution` owns. The reference outlives the handle: after the handle is dropped, `executionLive` is `false` and `executionNotify` does nothing.

### `Intrinsic.executionLoad`

```silk signature
fn executionLoad(reference: &Intrinsic.ExecutionRef, word: usize) -> usize
```

Reads control word `word` (0, 1 or 2) with acquire ordering.

### `Intrinsic.executionStore`

```silk signature
fn executionStore(reference: &Intrinsic.ExecutionRef, word: usize, value: usize) -> ()
```

Writes `value` to control word `word` with release ordering.

### `Intrinsic.executionCompareExchange`

```silk signature
fn executionCompareExchange(reference: &Intrinsic.ExecutionRef, word: usize, expected: usize, desired: usize) -> usize
```

Compares control word `word` with `expected` and, when they are equal, stores `desired`, in one acquire-release step. Returns the value it found, so the store happened exactly when the result equals `expected`.

- `silk/concurrency/execution` moves between readiness phases only through this, so of several threads that signal one parked generation, exactly one wins.

### `Intrinsic.executionNotify`

```silk signature
fn executionNotify(reference: &Intrinsic.ExecutionRef) -> ()
```

Runs the package's readiness endpoint, `onReady(&readyState)`, once and synchronously, unless the Execution handle is already dropped or being dropped. It does not drive the Execution.

- Safe from any thread: a notification that races a drop runs nothing.
- Wrappers: [`Execution.wake`](/docs/std/concurrency-execution#Execution.impl.wake) and [`Execution.notifyInitial`](/docs/std/concurrency-execution#Execution.impl.notifyInitial), which move the readiness phase first.

### `Intrinsic.executionLive`

```silk signature
fn executionLive(reference: &Intrinsic.ExecutionRef) -> bool
```

Returns whether the Execution handle still owns the body: `false` once the body completed or the handle was dropped. Loaded with acquire ordering.
