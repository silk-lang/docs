# Time and randomness

This guide builds `timing`, a small program that reads the wall clock and turns it into a date, sleeps and measures how long the sleep took, makes a secret token, rolls dice from a secure source, and rolls them again from a seeded generator that gives the same numbers every run. Clocks and random sources are services, so the tests at the end run with a stopped clock and a virtual one that never waits.

```sh
silk init timing
cd timing
```

## Two clocks, two random sources

| Service | Module | Native provider | Use it for |
| --- | --- | --- | --- |
| `SystemClock` | `silk/system_clock` | `OsSystemClock` in `silk/os_system_clock` | The date and time: timestamps, logs, anything a person reads |
| `MonotonicClock` | `silk/monotonic_clock` | `OsMonotonicClock` in `silk/os_monotonic_clock` | Measuring elapsed time, timeouts, sleeping |
| `Random` | `silk/random` | `OsRandom` in `silk/os_random` | Secrets: tokens, keys, nonces, anything that must not be guessed |
| `InsecureRandom` | `silk/insecure_random` | `Xoshiro256StarStar`, from `InsecureRandom.seeded(seed)` | Reproducible randomness: simulations, games, shuffles, tests |

The wall clock can jump. The operating system may set it back or forward at any time, so never measure a duration with it. The monotonic clock only moves forward, but its starting point means nothing, so never show it to a person.

The same split applies to random numbers. `Random` must be unpredictable and has no seed. `InsecureRandom` is fully determined by its seed and must never be used for anything secret.

## Instants and durations

Both clocks return an `Instant`: signed whole seconds plus a nanosecond part between 0 and 999,999,999. Read the parts with `SystemClock.seconds(&instant)` and `SystemClock.nanoseconds(&instant)`, and build one with `SystemClock.make(seconds, nanoseconds)`, which carries whole seconds out of a nanosecond part outside that range: `SystemClock.make(0, 1500000000)` is 1 second and 500,000,000 nanoseconds. For the system clock, the seconds count from 1970-01-01 00\:00 UTC. For the monotonic clock, they count from an unspecified start.

A duration is a plain `u64` count of nanoseconds. There is no duration type, so name your units:

```silk
// Durations are plain u64 nanoseconds.
const MILLISECOND: u64 = 1000000
const SECONDS_PER_DAY: i64 = 86400
```

The std lib has no calendar either: no dates, no time zones, no formatting of times. For a UTC date you convert the day count yourself. This is the well-known days-to-civil algorithm, which works in 400-year eras:

```silk
// A calendar date in UTC.
struct Date { year: i64 month: i64 day: i64 }

// Converts days since 1970-01-01 to a date in the Gregorian calendar.
// Works in 400-year eras of 146097 days, counted from March 1, year 0.
fn dateFromDays(days: i64) -> Date {
  let shifted = days + 719468
  let mut era = shifted / 146097
  if shifted < 0 {
    era = (shifted - 146096) / 146097
  }
  let dayOfEra = shifted - era * 146097
  let yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365
  let dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
  let monthIndex = (5 * dayOfYear + 2) / 153
  let day = dayOfYear - (153 * monthIndex + 2) / 5 + 1
  let mut month = monthIndex + 3
  let mut year = yearOfEra + era * 400
  if monthIndex >= 10 {
    month = monthIndex - 9
    year = year + 1
  }
  return Date { year: year, month: month, day: day }
}
```

`if` is a statement in Silk, not an expression, so the corrections are written as `let mut` plus an `if`.

## Reading the wall clock

```silk
// Reports the wall-clock time as a UTC date and time of day.
effect fn wallClock() -> () ! LogError ? &mut SystemClock | &mut Logger {
  let now = run SystemClock.now()
  let seconds = SystemClock.seconds(&now)
  let date = dateFromDays(seconds / SECONDS_PER_DAY)
  let inDay = seconds % SECONDS_PER_DAY
  run Effect.log("now: {seconds} s since 1970 = {year}-{month:02}-{day:02}, {hour:02}:{minute:02} UTC\n", &.{
    seconds: seconds,
    year: date.year,
    month: date.month,
    day: date.day,
    hour: inDay / 3600,
    minute: inDay % 3600 / 60,
  })
}
```

`SystemClock.now()` is a service operation, so `wallClock` lists `? &mut SystemClock`. It has no failure row: a clock read that fails is a trap, not a typed failure. The option `:02` pads a number to two digits with zeros, so March prints as `03`, not `3`. The guide "Text and formatting" lists the other placeholder options.

## Measuring and sleeping

`Effect.sleep(nanoseconds)` waits on the ambient `MonotonicClock`. Read the clock before and after to see how long something took:

```silk
// Nanoseconds from `start` to `end` on one monotonic timeline.
fn elapsed(start: &Instant, end: &Instant) -> i64 {
  let seconds = SystemClock.seconds(end) - SystemClock.seconds(start)
  return seconds * 1000000000 + SystemClock.nanoseconds(end) - SystemClock.nanoseconds(start)
}

// Sleeps, and measures how long the sleep really took.
effect fn timedSleep(milliseconds: u64) -> i64 ? &mut MonotonicClock {
  let start = run MonotonicClock.now()
  run Effect.sleep(milliseconds * MILLISECOND)
  let end = run MonotonicClock.now()
  return elapsed(&start, &end)
}
```

The monotonic clock has two waits. `MonotonicClock.waitFor(nanoseconds)`, which `Effect.sleep` calls, waits at least that long. `MonotonicClock.waitUntil(instant)` waits until an absolute mark, and `MonotonicClock.deadlineAfter(&start, nanoseconds)` computes one. A deadline is useful when several steps share one time budget: compute it once and wait until it, instead of adding up waits.

Marks belong to the provider that made them. Don't compare a monotonic mark with a system time, or marks from two different providers. Both are `Instant`, so the compiler can't stop you.

`OsMonotonicClock` blocks the whole thread while it waits. Inside a fiber scheduler, the scheduler provides its own clock to each fiber, and a sleep parks only that fiber. Chapter 10 of the book and the guide "Concurrent I/O patterns" cover that.

## Secure random values

`Random` has one operation, `fillBytes`, which fills a buffer with unpredictable bytes. A secret token is 16 such bytes, written as hex:

```silk
const HEX: string = "0123456789abcdef"

// A secret token: 16 bytes from the secure source, written as hex.
effect fn token() -> () ! LogError ? &mut Random | &mut Logger {
  let mut bytes: [u8; 16] = [0; 16]
  run Random.fillBytes(&mut bytes)
  let digits = String.utf8Bytes(HEX)
  let mut text: [u8; 32] = [0; 32]
  let mut index: usize = 0
  while index < 16 {
    text[index * 2] = digits[u8.toUsize(bytes[index] / 16)]
    text[index * 2 + 1] = digits[u8.toUsize(bytes[index] % 16)]
    index = index + 1
  }
  let shown = match String.fromUtf8(&text) {
    Result.Success { value } => value
    Result.Failure { .. } => "?"
  }
  run Effect.log("token: {token}\n", &.{ token: shown })
}
```

On top of `fillBytes`, `Random.nextU64()`, `Random.nextBool()` and `Random.below(n)` derive numbers. `below(n)` returns a value from 0 to n - 1 without the bias you get from `nextU64() % n`. It returns an `Option`, which is `None` only when `n` is 0:

```silk
// One roll of a six-sided die, from a secure source.
effect fn roll() -> u64 ? &mut Random {
  let value = match run Random.below(6) {
    Option.Some { value } => value
    Option.None => 0
  }
  return value + 1
}
```

`OsRandom` uses `getrandom` on Linux and `arc4random_buf` on macOS. Like the clocks, it has no failure row. If the system can't deliver secure bytes, the program stops with a trap rather than carry on with weak ones. A provider of `Random` must never hand out predictable bytes, so a target without a secure source simply has no `Random` provider.

## Seeded random values

`InsecureRandom.seeded(seed)` returns a `Xoshiro256StarStar` generator, which is itself the provider. The same seed gives the same sequence on every run and every supported target:

```silk
// The same seed always gives the same rolls.
effect fn seededRolls(seed: u64) -> () ! LogError ? &mut Logger {
  let mut generator = InsecureRandom.seeded(seed)
  let mut rolls: [u64; 8] = [0; 8]
  let mut index: usize = 0
  while index < 8 {
    let value = match run InsecureRandom.below(6) |> Effect.provideMut<InsecureRandom>(&mut generator) {
      Option.Some { value } => value
      Option.None => 0
    }
    rolls[index] = value + 1
    index = index + 1
  }
  run Effect.log("seed {seed}: {a} {b} {c} {d} {e} {f} {g} {h}\n", &.{
    seed: seed,
    a: rolls[0], b: rolls[1], c: rolls[2], d: rolls[3],
    e: rolls[4], f: rolls[5], g: rolls[6], h: rolls[7],
  })
}
```

`seededRolls` creates and provides its own generator, so its row has only the logger. `InsecureRandom` has the same helpers as `Random`: `nextU64`, `nextBool`, `below` and `fillBytes`.

The two services are separate on purpose. Try to provide the seeded generator where `main` provides the secure one:

```silk
  let mut secure = InsecureRandom.seeded(1)
```

```
Checking timing (x86_64-unknown-linux-gnu)
  load     60 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        1.75s
[x86_64-unknown-linux-gnu]
src/main.silk:144:7: error[SEM0123] The provider matches no compatible requirement
Failed timing in 1.81s
```

SEM0123 means the value given to `provideMut<Random>` does not implement `Random`. A seeded generator can't stand in for a secure source by accident.

`silk/insecure_seed` is a third, narrower service: one fixed 128-bit value read at start-up, for hash-flood hardening in a runtime you write. The std lib's hash collections do not use it; they take an explicit `Hash.seed`.

## Run it

```silk
effect fn report() -> () ! LogError ? &mut SystemClock | &mut MonotonicClock | &mut Random | &mut Logger {
  run wallClock()
  let slept = run timedSleep(50)
  run Effect.log("asked for 50 ms, slept {ms} ms\n", &.{ ms: slept / 1000000 })
  run token()
  let first = run roll()
  let second = run roll()
  run Effect.log("secure dice: {first} and {second}\n", &.{ first: first, second: second })
  run seededRolls(42)
  run seededRolls(42)
  run seededRolls(7)
}

pub effect fn main() -> () ! LogError {
  let mut wall = OsSystemClock.make()
  let mut steady = OsMonotonicClock.make()
  let mut secure = OsRandom.make()
  let mut logger = StdoutLogger.make()
  run report()
    |> Effect.provideMut<SystemClock>(&mut wall)
    |> Effect.provideMut<MonotonicClock>(&mut steady)
    |> Effect.provideMut<Random>(&mut secure)
    |> Effect.provideMut<Logger>(&mut logger)
}
```

The imports:

```silk
import silk.effect { Effect }
import silk.insecure_random { InsecureRandom }
import silk.logger { Logger, LogError }
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.os_logger { StdoutLogger }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.os_random { OsRandom }
import silk.os_system_clock { OsSystemClock }
import silk.random { Random }
import silk.result { Result }
import silk.string { String }
import silk.system_clock { Instant, SystemClock }
import silk.testing { AssertionError, Testing }
import silk.u8
```

```sh
silk run
```

```
now: 1792518771 s since 1970 = 2026-10-20, 17:52 UTC
asked for 50 ms, slept 50 ms
token: 8343ba6a350cde8651ecaa655bd7c90f
secure dice: 6 and 5
seed 42: 1 1 6 6 5 1 5 4
seed 42: 1 1 6 6 5 1 5 4
seed 7: 1 3 1 5 3 6 5 5
```

Run it again. The time, the token and the secure dice change. The seeded rolls do not: seed 42 gives `1 1 6 6 5 1 5 4` every time.

## Testing with fake clocks

A test should not wait for real time or depend on today's date. Both clock services are small, so fakes are short. `FixedClock` is a wall clock stopped at one instant:

```silk
// A wall clock stopped at one instant.
struct FixedClock { seconds: i64 }

impl SystemClock for FixedClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(self.seconds, 0)
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }
}
```

`VirtualClock` is a monotonic clock whose waits return at once and move its mark forward. It also counts the waits:

```silk
// A monotonic clock that never really waits. A wait moves its mark forward.
struct VirtualClock { mark: Instant waits: u32 }

impl MonotonicClock for VirtualClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(SystemClock.seconds(&self.mark), SystemClock.nanoseconds(&self.mark))
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }
  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    self.mark = move when
    self.waits = self.waits + 1
  }
  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    self.mark = MonotonicClock.deadlineAfter(&self.mark, howLong)
    self.waits = self.waits + 1
  }
}
```

`Instant` is not `Copy`, so `now` builds a fresh one from the parts and `waitUntil` moves its argument in. The tests:

```silk
fn sameDate(date: Date, year: i64, month: i64, day: i64) -> bool {
  return date.year == year && date.month == month && date.day == day
}

test effect fn convertsDays() ! AssertionError<'static> {
  run Testing.expect(sameDate(dateFromDays(0), 1970, 1, 1), "day 0 is 1970-01-01")
  run Testing.expect(sameDate(dateFromDays(19782), 2024, 2, 29), "a leap day")
  run Testing.expect(sameDate(dateFromDays(-1), 1969, 12, 31), "the day before the epoch")
}

test effect fn sleepUsesTheProvidedClock() ! AssertionError<'static> {
  let mut clock = VirtualClock { mark: SystemClock.make(100, 999999999), waits: 0 }
  let slept = run timedSleep(250) |> Effect.provideMut<MonotonicClock>(&mut clock)
  run Testing.expect(slept == 250000000, "exactly 250 ms passed on the virtual clock")
  run Testing.expect(clock.waits == 1, "one wait")
  run Testing.expect(SystemClock.seconds(&clock.mark) == 101, "the mark carried into the next second")
}

test effect fn wallClockReadsTheProvider() ! AssertionError<'static> | LogError {
  let mut clock = FixedClock { seconds: 1709210096 }
  let mut logger = Logger.inMemoryProvider()
  run wallClock()
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Logger>(&mut logger)
  run Testing.expect(Logger.length(&logger) == 1, "one line")
}
```

The sleep test asks for 250 ms and finishes in microseconds. It starts the virtual clock just before a whole second, so the test also checks that `deadlineAfter` carries the nanoseconds into the seconds.

```sh
silk test
```

```
  main::convertsDays
    PASS  2 us
  main::sleepUsesTheProvidedClock
    PASS  2 us
  main::wallClockReadsTheProvider
    PASS  15 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   71 us
```

For code that needs `Random`, a test can provide a scripted `fillBytes` that writes known bytes. Use such a provider only in tests. In production, `Random` must come from `OsRandom` or another real secure source.

## API reference

- `silk/system_clock`: `SystemClock`, `Instant`
- `silk/os_system_clock`: `OsSystemClock`
- `silk/monotonic_clock`: `MonotonicClock`
- `silk/os_monotonic_clock`: `OsMonotonicClock`
- `silk/random`: `Random`
- `silk/os_random`: `OsRandom`
- `silk/insecure_random`: `InsecureRandom`, `Xoshiro256StarStar`
- `silk/insecure_seed`: `InsecureSeed`
- `silk/effect`: `Effect` (`sleep`)
- `silk/logger`: `Logger`
- `silk/testing`: `Testing`, `AssertionError`
