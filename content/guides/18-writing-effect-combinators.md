# Writing effect combinators

An effect combinator is a function that takes effects and returns an effect. `Effect.map`, `Effect.catchAll` and `Effect.retry` in `silk/effect` are combinators, and there is nothing special about them: each is an `effect fn` with an Effect parameter. This guide writes three of your own. `retrying` repeats a failing effect with a growing pause and lets the caller decide which failures are worth repeating. `withBudget` measures an effect and fails when it took too long. `inVirtualTime` supplies a service to whatever effect it is given. Along the way it covers generic rows, the three Effect modes, and what you may borrow while an effect is alive.

The program, `weather`, reads a temperature from stations that fail in different ways. It prints the same output on every run, because it runs on a virtual clock. **Effects and run**, **Typed failures** and **Services and providers** in the language reference have the full rules this guide relies on.

## The operation to retry

```silk
import silk.effect { Effect }
import silk.logger { LogError, Logger }
import silk.monotonic_clock { MonotonicClock }
import silk.os_logger { StdoutLogger }
import silk.result { Result }
import silk.system_clock { Instant, SystemClock }

pub struct StationDown { pub code: i32 }
pub struct TimedOut {
  pub budgetMs: i64
  pub tookMs: i64
}

pub struct Timed<A> {
  pub value: A
  pub tookMs: i64
}

struct Station {
  failures: i32
  code: i32
  latencyMs: u64
  reads: i32
}

effect fn readStation(station: &mut Station) -> i32
! StationDown | LogError ? &mut MonotonicClock | &mut Logger {
  station.reads = station.reads + 1
  run Effect.sleep(station.latencyMs * 1000000)
  if station.failures > 0 {
    station.failures = station.failures - 1
    let args = .{ n: station.reads, code: station.code }
    run Effect.log("  read {n}: station down ({code})\n", &args)
    fail StationDown { code: station.code }
  }
  run Effect.log("  read {n}: 21 C\n", &.{ n: station.reads })
  return 21
}

fn millis(at: &Instant) -> i64 {
  return SystemClock.seconds(at) * 1000 + SystemClock.nanoseconds(at) / 1000000
}
```

`readStation` is an ordinary effect. It sleeps for the station's latency on the `MonotonicClock`, then either logs a failure and fails with `StationDown`, or logs the reading and returns 21. `Station.failures` says how many reads fail before one succeeds, and `code` is the error code those failures carry. `millis` turns an `Instant` into whole milliseconds.

Calling `readStation(&mut station)` runs nothing. It builds an Effect that holds the `&mut Station` borrow until it runs. What an Effect holds decides how often it can run:

| Type | Holds | Can run |
| --- | --- | --- |
| `Effect<...>` | Copy values and shared borrows only | Any number of times |
| `mut Effect<...>` | At least one `&mut` borrow | Any number of times, through a `mut` binding |
| `once Effect<...>` | At least one owned value that is not Copy | Once |

`readStation(&mut station)` holds a `&mut` borrow, so it is a `mut Effect`. Each run reads the station again and changes `station.reads`. That is exactly what a retry needs.

## Writing a retry

`Effect.retry(effect, retries)` from `silk/effect` repeats an effect immediately after any failure. A real client usually wants two more things: a pause that grows between attempts, and a way to give up at once on failures that will not go away, such as a refused login. Here is that combinator:

```silk
// Runs `action` again after a failure that `transient` accepts, up to `retries` more times.
// The pause between attempts starts at `pauseMs` and doubles.
effect fn retrying<'env, A, E, ?R>(
  mut action: mut Effect<'env; A ! E ? R>,
  mut transient: mut fn(&E) -> bool,
  retries: usize,
  pauseMs: u64,
) -> A ! E ? R | &mut MonotonicClock {
  let mut left = retries
  let mut pause = pauseMs
  while left > 0 {
    let outcome = run Effect.result(action)
    match move outcome {
      Result.Success { value } => { return move value }
      Result.Failure { error } => {
        if !transient(&error) { fail move error }
      }
    }
    run Effect.sleep(pause * 1000000)
    pause = pause * 2
    left = left - 1
  }
  return run action
}
```

Read the signature from left to right.

- `<'env, A, E, ?R>` makes it generic over everything about the action: `'env` is how long the action's borrows live, `A` its success type, `E` its failure row, and `?R` its requirement row. `?R` is a row variable. It stands for a whole requirement row, however many services that is.
- `mut action: mut Effect<'env; A ! E ? R>` accepts an effect that can run more than once. A plain `Effect` fits too. A `once Effect` does not, because a retry would have nothing to run the second time.
- `mut transient: mut fn(&E) -> bool` is a callback that looks at a failure and says whether to try again. It is `mut fn` so that callers may pass a closure that updates a local, as shown below.
- `-> A ! E ? R | &mut MonotonicClock` says that `retrying` succeeds and fails exactly as the action does, and needs everything the action needs plus a `MonotonicClock` for the pauses. The row variable lets `R` pass through unchanged, whatever it is.

Inside, `Effect.result(action)` runs the action once and turns its outcome into a `Result`, so the loop can look at a failure instead of stopping at it. Passing `action` there does not use it up: a `mut Effect` can run again. On success the value is returned. On a failure that `transient` rejects, `fail move error` raises the same failure again, with nothing added. Otherwise `Effect.sleep` waits, the pause doubles, and the loop goes round. When the retries run out, the last attempt runs directly, so its failure, if any, propagates as it is.

## Writing a budget

```silk
// Runs `action` and measures it. Fails with TimedOut if it took longer than `budgetMs`.
effect fn withBudget<'env, A, E, ?R>(
  budgetMs: i64,
  action: once Effect<'env; A ! E ? R>,
) -> Timed<A> ! E | TimedOut ? R | &mut MonotonicClock {
  let start = run MonotonicClock.now()
  let value = run move action
  let end = run MonotonicClock.now()
  let took = millis(&end) - millis(&start)
  if took > budgetMs { fail TimedOut { budgetMs: budgetMs, tookMs: took } }
  return Timed { value: move value, tookMs: took }
}
```

`withBudget` takes a `once Effect`, the most general kind, because it runs the action only once. `run move action` runs it. The result row adds one failure, `TimedOut`, to the action's own row: `! E | TimedOut`. The success type changes too: `Timed<A>` carries the value together with how long it took.

`withBudget` cannot stop the action early. Silk has no hidden preemption: an effect runs until it returns or fails. `withBudget` checks the time when the action is done and rejects a result that came too late. To stop work that is still waiting, give that work a deadline itself. The byte streams in `silk/byte_duplex` take an `Instant` deadline on every read and write, and fail with `ByteIoError.Timeout` when it passes. The Networking and Concurrent I/O patterns guides show deadlines and cancellation.

## A combinator that provides a service

```silk
// A MonotonicClock whose time moves only when someone sleeps.
struct VirtualClock { mark: Instant }

impl MonotonicClock for VirtualClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(SystemClock.seconds(&self.mark), SystemClock.nanoseconds(&self.mark))
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }
  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    if millis(&when) > millis(&self.mark) { self.mark = move when }
  }
  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    self.mark = MonotonicClock.deadlineAfter(&self.mark, howLong)
  }
}

// Runs `action` on a fresh virtual clock that starts at zero.
effect fn inVirtualTime<'env, A, E, ?R>(
  action: once Effect<'env; A ! E ? R>,
) -> A ! E ? Without<R, MonotonicClock>
where VirtualClock provides MonotonicClock from R {
  let clock = VirtualClock { mark: SystemClock.make(0, 0) }
  return run Effect.bindRequirementOwned<MonotonicClock>(move action, move clock)
}
```

`VirtualClock` is a `MonotonicClock` provider whose time moves only when someone waits. It makes the program's timings exact, and it makes every pause free. The Testing with providers guide uses the same idea.

`inVirtualTime` gives any effect its own clock. Its result row is `Without<R, MonotonicClock>`: the action's row with the `MonotonicClock` entry removed, because `inVirtualTime` supplies it. The `where VirtualClock provides MonotonicClock from R` clause is the promise that makes this legal: a `VirtualClock` can satisfy the `MonotonicClock` entry of `R`. Generic code that supplies a service to a row variable needs such a clause.

`Effect.bindRequirementOwned` hands the clock over by value, so the clock lives as long as the action and nobody has to borrow it. To lend a provider the caller owns instead, take `clock: &'env mut VirtualClock`, call `Effect.provideMut<MonotonicClock>(move action, move clock)`, and write the clause as `where &'env mut VirtualClock provides MonotonicClock from R`.

## Putting it together

```silk
effect fn attempt(label: string, station: &mut Station, retryOn: i32) -> () ! LogError ? &mut Logger {
  run Effect.log("{label}\n", &.{ label: label })
  let mut checked = 0
  let transient = fn(error: &(StationDown | LogError)) -> bool {
    checked = checked + 1
    return match &error.* {
      StationDown down => down.code == retryOn
      _ => false
    }
  }
  let reading = retrying(readStation(&mut station.*), move transient, 3, 100)
  let outcome = run Effect.result(inVirtualTime(withBudget(1000, move reading)))
  run Effect.log("  failures checked: {n}\n", &.{ n: checked })
  match move outcome {
    Result.Success { value } => {
      run Effect.log("  result: {c} C after {ms} ms\n", &.{ c: value.value, ms: value.tookMs })
    }
    Result.Failure { error } => match move error {
      StationDown down => run Effect.log("  result: gave up, code {code}\n", &.{ code: down.code })
      TimedOut late => {
        let args = .{ ms: late.tookMs, budget: late.budgetMs }
        run Effect.log("  result: {ms} ms, over the {budget} ms budget\n", &args)
      }
      LogError problem => { fail move problem }
    }
  }
}
```

`attempt` builds one composed effect for a station and runs it:

1. `readStation(&mut station.*)` is the action. `station` is already a `&mut Station`, so `&mut station.*` lends it again for the effect, and `attempt` keeps its own borrow for later. Passing `station` itself would move the borrow into the effect and fail with OWN0003, "Moving station requires an explicit move".
2. `retrying` wraps it, with `transient` as the predicate, 3 retries and a first pause of 100 ms.
3. `withBudget(1000, ...)` measures the whole retry loop, pauses included.
4. `inVirtualTime` supplies the clock. What is left needs only a `Logger`, which `main` provides.
5. `Effect.result` turns the outcome into a `Result`, and the `match` reports it. The failure is a union of `StationDown`, `LogError` and `TimedOut`, so the match has an arm for each. A `LogError` is passed on with `fail move problem`.

`transient` is a closure. It reads `retryOn`, an `i32`, so it captures a copy. It assigns to `checked`, so it captures `checked` mutably, and that makes it a `mut fn`. `retrying` accepts `mut fn`, and `attempt` hands the closure over with `move transient`. Without `move`, the call would lend the closure exclusively instead, which needs a `let mut` binding; as written it is SEM0057. The mutable capture is a loan: `checked` cannot be used while `reading` holds the closure. Once `run` has finished with `reading`, the loan ends, and the next line reads `checked` freely.

The type of `transient`'s parameter is `&(StationDown | LogError)`, because `E` for this action is the whole failure row of `readStation`. A predicate for a union matches on the member it cares about. `match &error.*` matches the value behind the reference; matching `error` itself is SEM0226.

```silk
pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  let mut flaky = Station { failures: 2, code: 503, latencyMs: 30, reads: 0 }
  let mut broken = Station { failures: 9, code: 503, latencyMs: 30, reads: 0 }
  let mut refusing = Station { failures: 1, code: 401, latencyMs: 30, reads: 0 }
  let mut slow = Station { failures: 1, code: 503, latencyMs: 800, reads: 0 }
  run attempt("flaky station", &mut flaky, 503) |> Effect.provideMut<Logger>(&mut logger)
  run attempt("broken station", &mut broken, 503) |> Effect.provideMut<Logger>(&mut logger)
  run attempt("refusing station", &mut refusing, 503) |> Effect.provideMut<Logger>(&mut logger)
  run attempt("slow station", &mut slow, 503) |> Effect.provideMut<Logger>(&mut logger)
}
```

```sh
silk run
```

```
flaky station
  read 1: station down (503)
  read 2: station down (503)
  read 3: 21 C
  failures checked: 2
  result: 21 C after 390 ms
broken station
  read 1: station down (503)
  read 2: station down (503)
  read 3: station down (503)
  read 4: station down (503)
  failures checked: 3
  result: gave up, code 503
refusing station
  read 1: station down (401)
  failures checked: 1
  result: gave up, code 401
slow station
  read 1: station down (503)
  read 2: 21 C
  failures checked: 1
  result: 1700 ms, over the 1000 ms budget
```

- The flaky station fails twice and then answers. The virtual time is 3 reads of 30 ms plus pauses of 100 and 200 ms: 390 ms, inside the budget.
- The broken station never answers. After the first attempt and 3 retries, `retrying` lets the fourth failure through. The predicate saw only 3 of them, because the last attempt is not checked.
- The refusing station fails with code 401. The predicate says no, and `retrying` gives up after one read.
- The slow station takes 800 ms per read. Its second read succeeds, but 800 + 100 + 800 ms is more than the 1000 ms budget, so `withBudget` rejects the result.

## The order of combinators matters

`withBudget(1000, retrying(...))` gives the whole loop one budget. To give each attempt its own budget instead, swap them, so that `retrying` repeats a budgeted read. That changes the failure row too: a late attempt is now a `TimedOut` that `retrying` sees, and the predicate can choose to retry it. Here is that version of `attempt`, with a helper:

```silk
// One read with its own 500 ms budget.
effect fn budgetedRead(station: &mut Station) -> Timed<i32>
! StationDown | LogError | TimedOut ? &mut MonotonicClock | &mut Logger {
  return run withBudget(500, readStation(&mut station.*))
}

effect fn attempt(label: string, station: &mut Station, retryOn: i32) -> () ! LogError ? &mut Logger {
  run Effect.log("{label}\n", &.{ label: label })
  let mut checked = 0
  let transient = fn(error: &(StationDown | LogError | TimedOut)) -> bool {
    checked = checked + 1
    return match &error.* {
      StationDown down => down.code == retryOn
      TimedOut late => true
      _ => false
    }
  }
  let reading = retrying(budgetedRead(&mut station.*), move transient, 3, 100)
  let outcome = run Effect.result(inVirtualTime(move reading))
```

The rest of `attempt` and the program are unchanged. The output:

```
flaky station
  read 1: station down (503)
  read 2: station down (503)
  read 3: 21 C
  failures checked: 2
  result: 21 C after 30 ms
broken station
  read 1: station down (503)
  read 2: station down (503)
  read 3: station down (503)
  read 4: station down (503)
  failures checked: 3
  result: gave up, code 503
refusing station
  read 1: station down (401)
  failures checked: 1
  result: gave up, code 401
slow station
  read 1: station down (503)
  read 2: 21 C
  read 3: 21 C
  read 4: 21 C
  failures checked: 3
  result: 800 ms, over the 500 ms budget
```

Each successful attempt now reports its own time. The slow station's reads all take 800 ms, longer than the 500 ms budget, so every attempt is rejected, retried, and finally reported as `TimedOut`.

`budgetedRead` exists because of the Effect modes. The obvious version, `retrying(withBudget(500, readStation(&mut station.*)), ...)`, does not compile:

```
Checking weather (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.08s
  check    failed: 2 modules, 1 error        0.15s
[x86_64-unknown-linux-gnu]
/home/you/weather/src/main.silk:126:26: error[SEM0076] Callable value with mode `once` cannot satisfy a parameter with mode `mut`, which may call it more than once
Failed weather in 0.23s
```

Column 26 is the `withBudget(...)` argument. `withBudget` takes its action as `once Effect` and keeps it, so the effect it returns can run only once, and `retrying` needs one that can run again. `budgetedRead(&mut station.*)` builds a fresh `withBudget` effect each time it runs, and holds only a `&mut` borrow, so it is a `mut Effect`.

An `effect { ... }` block does the same job without a named function. Pass it straight to `retrying`:

```silk
  let reading = retrying(
    effect { return run withBudget(500, readStation(&mut station.*)) },
    move transient, 3, 100,
  )
  let outcome = run Effect.result(inVirtualTime(move reading))
```

The output is the same as with `budgetedRead`. Each time `retrying` runs the block, the block builds a fresh `withBudget` effect, and it holds only a `&mut` borrow of `station`, so it is a `mut Effect` too.

A block also works inside a generic function, one with type parameters of its own. One case still needs a named `effect fn`: a function the compiler builds separately for each static value it is given. That is a function with a `static` parameter, or the body of a `static for`. Here `scaled` takes its factor as a static parameter and passes a block to a one-line combinator, `again`:

```silk
effect fn again<'env, A, E, ?R>(mut action: mut Effect<'env; A ! E ? R>) -> A ! E ? R {
  return run action
}

effect fn one() -> i32 {
  return 1
}

effect fn scaled(static factor: i32) -> i32 {
  let got = run again(effect { return run one() })
  return got * factor
}
```

```
Checking weather (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.14s
[x86_64-unknown-linux-gnu]
/home/you/weather/src/main.silk:12:23: error[SEM0245] An `effect {}` block cannot run inside `scaled` yet: the native compiler does not specialize it for each argument of a `static` parameter; move the code that builds and runs it into a named function without `static` parameters and call that from `scaled`
Failed weather in 0.21s
```

Column 23 is the `effect { ... }` block. Do what the message says: move the code that builds and runs the block into a function of its own, and call that from `scaled`:

```silk
effect fn oneAgain() -> i32 {
  return run again(effect { return run one() })
}

effect fn scaled(static factor: i32) -> i32 {
  let got = run oneAgain()
  return got * factor
}
```

This checks and runs; with `main` returning `run scaled(3)`, the program exits with status 3. Passing `again(one())` instead of the block also works, and so does the block once `factor` is an ordinary parameter. An anonymous function `fn(x: i32) -> i32 { ... }` in the same place gets the same SEM0245.

Inside a `static for` body, a block or an anonymous function is refused with the other form of SEM0245, at the block: "An `effect {}` block inside a `static for` body is not supported by the native compiler yet: every unrolled iteration would share its one declaration; move the code that builds and runs it into a named function and call that from the loop body". The fix is the same: a named function, called from the loop body.

## Borrowing while an effect is alive

An effect that borrows a local keeps the borrow from the moment it is built until it has run. The same is true of a closure. Read `station.reads` between building `reading` and running it:

```silk
  let reading = retrying(readStation(&mut station.*), move transient, 3, 100)
  let before = station.reads
```

```
Checking weather (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.16s
[x86_64-unknown-linux-gnu]
/home/you/weather/src/main.silk:120:16: error[OWN0011] An owner access that conflicts with an active borrowed-view loan
  note: /home/you/weather/src/main.silk:119:38: related location
Failed weather in 0.23s
```

`reading` holds `&mut station`, so even reading the station is refused. Read it before you build the effect, or after you run it. The rule is the same whether or not the effect ever runs: building it is enough.

If `retrying` declared its predicate as a plain `fn(&E) -> bool`, the closure that updates `checked` would not fit, because a closure with a mutable capture is a `mut fn`. The argument is refused the same way, with SEM0076 at the closure:

```
Checking weather (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.14s
[x86_64-unknown-linux-gnu]
/home/you/weather/src/main.silk:119:55: error[SEM0076] Callable value with mode `mut` cannot satisfy a parameter with mode shared (no `mut` or `once`), which may call it through a shared borrow
Failed weather in 0.20s
```

When you write a combinator, accept the weakest mode you can use: `once fn` and `once Effect` if you call it once, `mut fn` and `mut Effect` if you call it repeatedly. Plain `fn` and `Effect` are needed only when something must call or run the value through a shared reference.

## Logging from a combinator

A combinator can log like any other effect function, type parameters and all. Add `LogError` and `&mut Logger` to the rows of `withBudget` and log the measurement:

```silk
  run Effect.log("  took {took} ms\n", &.{ took: took })
```

```
Checking weather (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    2 modules                         1.23s
  borrow   227 bodies                        0.01s
Finished weather in 1.28s
```

Every caller of `withBudget` now needs a `Logger` in its row, and every caller gets the line whether it wants it or not. Returning what you measured, as `Timed` does, keeps the combinator free of a `Logger` and lets the caller decide how to report it.

## API reference

- `silk/effect`: `Effect.result`, `Effect.sleep`, `Effect.retry`, `Effect.log`, `Effect.provideMut`, `Effect.bindRequirementOwned`
- `silk/result`: `Result`
- `silk/monotonic_clock`: `MonotonicClock`, `MonotonicClock.deadlineAfter`
- `silk/system_clock`: `SystemClock`, `Instant`
- `silk/logger`: `Logger`, `LogError`; `silk/os_logger`: `StdoutLogger`
- `silk/byte_duplex`: `ByteDuplex`, `ByteIoError` (deadlines on I/O)
