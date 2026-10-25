# Typed failures

A typed failure is a value that an effect raises with `fail` instead of succeeding. The failure row `! E` of an effect function or Effect type lists the failure types it can raise; callers must declare or handle each of them.

## Syntax

```
FailureRow     = '!' FailureType ( '|' FailureType )*
FailureType    = Type | 'Without' '<' Row ',' Row '>'
Row            = Type ( '|' Type )*
FailStatement  = 'fail' Expression
```

- A failure row follows the result type of an `effect fn`, an anonymous `effect fn`, or the success type inside `Effect<...>`. See Effects and run.

## Failure rows

- `! E` declares that the effect may fail with a value of type `E`. `! A | B` declares several failure types.
- Without a failure row, an effect cannot fail. `! never` says the same explicitly.
- Any value type can be a failure type: structs, unions, enums, primitives such as `i32`, `string<'static>`, and references.
- `Without<A | B, A>` is the row `A | B` with `A` removed. It appears in the result of `Effect.catch`.
- Only effect functions may declare a failure row. On an ordinary `fn` it is SEM0062.
- A failure type in the signature of a `pub` function must itself be public (SEM0019).
- A generic parameter can stand for a whole failure row: `effect fn f<E>(e: Effect<'static; i32 ! E>) -> i32 ! E`.

## fail

- `fail e` ends the current effect with failure `e`. It is a statement and never completes normally.
- `fail` is valid only in an `effect fn`, an anonymous `effect fn` or an `effect { ... }` block. Elsewhere it is SEM0063.
- The type of `e` must be a member of the declared failure row, or a union of members. Otherwise it is SEM0064.
- In an effect without a failure row, or with `! never`, every `fail` is SEM0064.
- `fail` moves its operand. Failing with a non-Copy local needs `fail move x` (OWN0003).
- An effect block has no declared row: its row is the union of what it can fail with.

## Propagation through run

- `run e` inside an `effect fn` propagates every failure of `e` to the caller unchanged.
- Each failure type of `e` must appear in the enclosing function's row. A missing one is SEM0066.
- A wider row is accepted: an effect failing with `A` may run inside a function declared `! A | B`.
- In an ordinary `fn`, `run` is valid only when every failure has been handled (SEM0066).
- A failure that escapes `pub effect fn main` ends the program with status 1 and a report on standard error. See Program entry and termination.
- `Effect.flatMap`, `Effect.zip` and the other sequencing combinators stop at the first failure and skip the later steps.

## Recovering

- The recovery combinators belong to the struct `Effect` in `silk/effect`. Each returns a new lazy Effect.

| Member | Result | Behavior |
| --- | --- | --- |
| `Effect.catchAll(e, h)` | `A \| B ! F` | Runs `h(error)` on any failure of `e`; only `h`'s own failures `F` remain |
| `Effect.catch<S>(e, h)` | `A \| B ! Without<E, S> \| F` | Handles only member `S`; other members propagate unchanged |
| `Effect.mapError(e, f)` | `A ! F` | Replaces the failure with plain `f(error)` |
| `Effect.mapBoth(e, onSuccess, onFailure)` | `B ! F` | Maps the success or the failure with plain callbacks |
| `Effect.result(e)` | `Result<A, E>` | Never fails; the outcome becomes data |
| `Effect.retry(e, n)` | `A ! E` | Runs `e` again after a failure, at most `n` more times |

- A handler `h` is a callable that returns an Effect, usually an `effect fn` taking the failure value. It receives the failure by value.
- A handler runs only on failure. On success the handler is never called and is dropped.
- The handler's success type joins the protected success type: a handler returning `bool` for an `i32` effect gives `i32 | bool`.
- A handler declared `-> never ! F` re-raises a different failure. The success type stays `A`.
- For `catchAll`, the handler's parameter type is the whole failure row, for example `A | B`. Match on it to tell members apart. See Patterns and match.
- A handler may be a partially applied effect function. The given arguments fill the trailing parameters and the failure fills the first: with `effect fn recover(error: Missing, base: i32) -> i32`, `Effect.catchAll(recover(5))` runs `recover(error, 5)`.
- For `catch`, `S` may be written explicitly or inferred from the handler's parameter. `S` must be a member of the row (`where S in E`). Otherwise it is SEM0067: "Invalid Effect.catch handler: `main.Other` is not a failure of the handled Effect, which fails with `main.Problem`".
- A handler is an effect function. A plain `fn` handler is SEM0067, and the message says to declare it `effect fn` with the same parameter and result.
- For `catchAll`, a handler whose parameter does not accept every failure of the row is SEM0067 at the handler. With `explain(failure: Oops)` for a row `Oops | LogError`: "Invalid Effect.catch handler: its parameter type `main.Oops` does not accept `silk.logger.LogError`, a failure of the handled Effect; add it to the parameter's union". The message is the same for a union parameter that lacks a member, for an Effect with a single failure, and in the pipeline form `e |> Effect.catchAll(h)`. With several missing failures it lists them all and says "add them to the parameter's union".
- Requirements of the protected Effect and of the handler both remain. See Services and providers.
- `retry` takes a reusable `mut Effect`. `retry(e, 0)` runs once. Earlier failure values are dropped before the next attempt; the last failure propagates.

## Result

- `Result<A, F>` from `silk/result` is a union with members `Success { value: A }` and `Failure { error: F }`.
- It is completed data: it does not run, needs no providers and does not propagate.
- Members: `Result<A, F>.succeed(v)`, `Result<A, F>.failResult(e)`, `map`, `mapError`, `flatMap` and `unwrapOr`.
- `Effect.result(e)` runs `e` and returns `Result<A, E>`. For a row `A | B`, the error type is the union `A | B`.

## Finalizers

- `Effect.ensuring(e, finalizer)` runs `finalizer` after `e`, whether `e` succeeds or fails, then passes on `e`'s original outcome.
- The finalizer has type `once Effect<'env; () ! never ? S>`: it cannot fail. Passing a fallible finalizer is rejected (SEM0052). Recover its failures first, for example with `Effect.catchAll`.
- The finalizer's requirements `S` join the result's requirements.
- Order on failure: the failing frame drops its locals, then the finalizer runs, then the failure reaches the handler.
- Nested `ensuring` finalizers run innermost first.
- `Effect.ensuringNonParking` and `Effect.useReleaseNonParking` also run when a parked execution is cancelled. Their finalizers must not suspend. See Suspension and cancellation.

## Drops on failure

- When an effect exits through `fail`, or through a failing `run`, its live locals are dropped before the failure leaves the frame. Drop hooks run. See Ownership and moves.
- Each frame the failure passes through drops its own locals in the same way.
- Values already evaluated for a call whose `run` then fails are dropped too.
- A recovered failure value belongs to the handler, or to the `Result`. It is dropped there like any other value.

## never

- `never` is the type of a computation that does not complete. It has no values.
- `-> never ! E` declares an effect that can only fail. `run` of it has type `never`, so `return run stop(code)` fits any result type.
- `! never` is an empty failure row. Finalizers require it.
- A `run` whose success type is `never` may stand alone as a statement.

## Failures and traps

- A trap is a fatal runtime error such as arithmetic overflow, division by zero or an out-of-bounds index. See Program entry and termination.
- Traps are not typed failures. They bypass `catch`, `catchAll`, `result`, `retry`, `ensuring` finalizers and Drop hooks. The process stops at once.
- Use the checked arithmetic functions of the integer modules, such as `i32.checkedAdd`, to turn a would-be trap into a value the program can fail with.

## Examples

Selective and complete recovery of a two-member row:

```silk
import silk.effect { Effect }

struct Missing {
  code: i32,
}

struct Denied {
  code: i32,
}

effect fn open(mode: i32) -> i32
  ! Missing | Denied {
  if mode == 1 {
    fail Missing { code: 10 }
  }
  if mode == 2 {
    fail Denied { code: 20 }
  }
  return 0
}

effect fn useDefault(missing: Missing) -> i32 {
  return missing.code
}

effect fn partial(mode: i32) -> i32
  ! Denied {
  return run open(mode) |> Effect.catch(useDefault)
}

effect fn either(error: Missing | Denied) -> i32 {
  return match move error {
    Missing { code } => code
    Denied { code } => code + 1
  }
}

effect fn last(denied: Denied) -> i32 {
  return denied.code
}

pub fn main() -> i32 {
  let a = run partial(1) |> Effect.catchAll(last)
  let b = run partial(2) |> Effect.catchAll(last)
  let c = run open(2) |> Effect.catchAll(either)
  return a + b + c - 51
}
```

Mapping a failure and inspecting the outcome as data:

```silk
import silk.effect { Effect }
import silk.result { Result }

struct Missing {
  code: i32,
}

struct Wrapped {
  inner: i32,
}

effect fn load(ok: bool) -> i32
  ! Missing {
  if !ok {
    fail Missing { code: 4 }
  }
  return 10
}

fn wrap(missing: Missing) -> Wrapped {
  return Wrapped { inner: missing.code }
}

effect fn fallback(error: Wrapped) -> bool {
  return false
}

pub fn main() -> i32 {
  let outcome = run Effect.result(Effect.mapError(load(false), wrap))
  let code = match move outcome {
    Result<i32, Wrapped>.Success { value } => value
    Result<i32, Wrapped>.Failure { error } => error.inner
  }
  if code != 4 {
    return 1
  }
  let mixed: i32 | bool = run Effect.catchAll(Effect.mapError(load(false), wrap), fallback)
  let n = match mixed {
    i32 v => v
    bool b => 7
  }
  return n - 7
}
```

A failure drops the frame's locals, runs the finalizers innermost first, then reaches the handler:

```silk
import silk.effect { Effect }
import silk.ownership { Drop }

struct Problem {
  code: i32,
}

struct Guard<'a> {
  count: &'a mut i32,
}

impl<'a> Drop for Guard<'a> {
  fn drop(self: &mut Guard<'a>) -> () {
    self.count.* = self.count.* + 1
    return ()
  }
}

service Journal {
  effect fn mark(value: i32) -> () ? &mut Journal
}

struct Memory {
  value: i32,
}

effect fn mark(self: &mut Memory, value: i32) -> () {
  self.value = self.value * 10 + value
  return ()
}

impl Journal for Memory {
  mark: Memory.mark
}

effect fn work(count: &mut i32) -> i32
  ! Problem
  ? &mut Journal {
  let guard = Guard { count: move count }
  run Journal.mark(1)
  fail Problem { code: 3 }
}

effect fn note(value: i32) -> ()
  ? &mut Journal {
  return run Journal.mark(value)
}

effect fn recover(error: Problem) -> i32
  ? &mut Journal {
  run Journal.mark(4)
  return error.code
}

pub fn main() -> i32 {
  let mut drops = 0
  let mut journal = Memory { value: 0 }
  let inner = Effect.ensuring(work(&mut drops), note(2))
  let outer = Effect.ensuring(move inner, note(3))
  let code = run Effect.catchAll(move outer, recover) |> Effect.provideMut(&mut journal)
  if code != 3 || drops != 1 {
    return 1
  }
  if journal.value != 1234 {
    return 2
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0019 | A `pub` signature names a private failure type |
| SEM0052 | `Effect.ensuring` given a finalizer that can fail (catalog: type arguments cannot be inferred) |
| SEM0062 | Failure row on an ordinary function |
| SEM0063 | `fail` outside an effect function or effect block |
| SEM0064 | `fail` with a type the effect's row does not declare |
| SEM0066 | `run` leaves failures the enclosing signature does not declare |
| SEM0067 | `Effect.catch` or `Effect.catchAll` handler does not fit the failures it handles |
| OWN0003 | `fail` with a non-Copy local needs `move` |

## See also

Effects and run · Services and providers · Program entry and termination · Ownership and moves · Patterns and match · Enums and unions · Suspension and cancellation · `silk/effect`, `silk/result`

## Open questions

- SEM0061 ("failure type must be a detached ordinary value type") has no producer in the compiler. A reference failure type such as `! &i32` is accepted, and `Effect.catchAll` can recover it.
- A plain `fn` handler passed to `Effect.catchAll` stops `silk check` with "unsupported: this construct is not supported by the native compiler yet", even when its parameter type is right.
