# 10. Doing things at once

Your board grows as needed, refuses duplicate titles and saves itself through the `FileSystem` service. Every command still does one thing at a time, though. This chapter adds `tasks remind`, which sets a timer for every open task at once. Along the way you meet fibers, the scheduler that runs them, and the rule that a fiber may only hold what it owns.

## One thread, many fibers

A fiber is a small task that can pause and let other fibers run. Silk runs all the fibers of one scheduler on a single thread. Nothing runs in parallel and nothing is interrupted. A fiber keeps the thread until it *parks*: it sleeps, waits for another fiber, yields, or forks a child.

That sounds limiting, but most waiting is not computing. A reminder that fires in 200 ms spends all 200 ms doing nothing. While it waits, other fibers can run, and the waits overlap.

Fibers add no new syntax. They are library operations from `silk/fiber`, `silk/scheduler` and `silk/local_scheduler`, called with `run` like any other effect. You already know the hard part: effects, requirement rows and providers.

## Two waits that overlap

Try the idea in a scratch copy of your project first, so the real program stays untouched. The copy replaces the small scratch project from chapter 2. Without the `rm`, `cp -r` would put the copy inside the old `scratch` folder instead. From the `tasks` folder:

```sh
cd ..
rm -rf scratch
cp -r tasks scratch
cd scratch
```

The copy keeps the name `tasks` in its `silk.toml`, so `silk check` there prints `Checking tasks`.

Replace `src/main.silk` with this. Each `estimate` pretends to need a slow 300 ms lookup:

```silk
import silk.effect { Effect }
import silk.fiber { Fiber, Cancelled }
import silk.local_scheduler { LocalScheduler, StalledError }
import silk.logger { Logger, LogError }
import silk.monotonic_clock { MonotonicClock }
import silk.os_logger { StdoutLogger }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.allocator { OutOfMemoryError }
import silk.scheduler { Scheduler, TaskIdExhaustedError }

const MILLISECOND: u64 = 1000000

// Pretend each estimate needs a slow lookup.
effect fn estimate(minutes: i32, lookup: u64) -> i32
  ? &mut Scheduler | &mut MonotonicClock {
  run Effect.sleep(lookup * MILLISECOND)
  return minutes
}

effect fn total() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  // One after the other, no fibers.
  let a = run estimate(25, 300)
  let b = run estimate(90, 300)
  return a + b
}

pub effect fn main() -> ()
  ! LogError | OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut logger = StdoutLogger.make()
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  let minutes = run LocalScheduler.execute(&mut scheduler, total())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  run Effect.log("{minutes} minutes in total\n", &.{ minutes: minutes })
    |> Effect.provideMut<Logger>(&mut logger)
}
```

`Effect.sleep` takes nanoseconds and needs a `MonotonicClock`: a clock that only moves forward, made for measuring waits. `OsMonotonicClock` is the real one. Build it and time it with the shell's `time` keyword:

```sh
silk build
TIMEFORMAT='time %Rs'; time ./build/llvm/x86_64-unknown-linux-gnu/debug/tasks
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     62 modules, 1 in package          0.07s
  check    1 module                          0.53s
  codegen  2,188 functions                   0.69s
  borrow   412 bodies                        0.03s
  link     clang                             0.52s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 1.90s
115 minutes in total
time 0.604s
```

Two lookups of 300 ms, one after the other: 0.6 s. Now start each lookup in its own fiber, then collect both results. Change `total`:

```silk
effect fn total() -> i32
! OutOfMemoryError | TaskIdExhaustedError | Cancelled
? &mut Scheduler | &mut MonotonicClock {
  let first = run Fiber<i32, never>.forkChild(estimate(25, 300))
  let second = run Fiber<i32, never>.forkChild(estimate(90, 300))
  // join waits for the fiber and hands back its value.
  let a = run Fiber<i32, never>.join(move first)
  let b = run Fiber<i32, never>.join(move second)
  return a + b
}
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     62 modules, 1 in package          0.07s
  check    1 module                          0.56s
  codegen  2,425 functions                   0.88s
  borrow   446 bodies                        0.03s
  link     clang                             0.55s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 2.16s
115 minutes in total
time 0.303s
```

Same answer, half the time. Here is what each piece does:

- `Fiber<A, E>.forkChild(effect)` starts the effect as a child task and gives you a `Fiber<A, E>` handle. `A` is its success type and `E` its failure type. Write both type arguments; the compiler does not infer them here.
- The child does not start at the fork. The parent keeps going until it parks, here at the first `join`. Only then do both children run, and both go to sleep at almost the same moment.
- `join` consumes the handle (note the `move`), waits if the child is not done, and returns its value. Its failure row is the child's `E` plus `Cancelled`.
- `forkChild` itself can fail with `OutOfMemoryError` or `TaskIdExhaustedError`, and it needs `? &mut Scheduler`.

Something has to provide that `Scheduler`. `LocalScheduler.make()` creates the standard one, and `LocalScheduler.execute(&mut scheduler, total())` runs `total` as the *root* fiber. It returns once the root is done. `execute` asks its caller for a `MonotonicClock`, which it uses to wait for the earliest timer when every fiber is asleep. It adds `StalledError` to the failures, for the case where fibers are waiting on something that can never happen.

## When a child fails

`join` passes a child's failure straight up. Sometimes you would rather look at the result as data. `await` does that: it never fails, and it returns an `Outcome` whose `value` is a `Success`, a `Failure` or `Cancelled`. Put this in the scratch project:

```silk
import silk.effect { Effect }
import silk.fiber { Fiber, Cancelled, Failure, Outcome, Success }
import silk.local_scheduler { LocalScheduler, StalledError }
import silk.logger { Logger, LogError }
import silk.monotonic_clock { MonotonicClock }
import silk.os_logger { StdoutLogger }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.allocator { OutOfMemoryError }
import silk.scheduler { Scheduler, TaskIdExhaustedError }

struct NoSuchTask {
  id: u32
}

effect fn lookup(id: u32) -> i32
  ! NoSuchTask
  ? &mut Scheduler | &mut MonotonicClock {
  if id > 3 {
    fail NoSuchTask { id: id }
  }
  return 25
}

// await never fails: success, typed failure and cancellation all come back as data.
effect fn check(id: u32) -> i32
  ! OutOfMemoryError | TaskIdExhaustedError
  ? &mut Scheduler | &mut MonotonicClock {
  let fiber = run Fiber<i32, NoSuchTask>.forkChild(lookup(id))
  let outcome = run Fiber<i32, NoSuchTask>.await(move fiber)
  let Outcome<i32, NoSuchTask> { value } = move outcome
  return match move value {
    Success<i32> { value: minutes } => minutes
    Failure<NoSuchTask> { error } => -1
    Cancelled {} => -2
  }
}

pub effect fn main() -> ()
  ! LogError | OutOfMemoryError | TaskIdExhaustedError | StalledError {
  let mut logger = StdoutLogger.make()
  let mut clock = OsMonotonicClock.make()
  let mut scheduler = LocalScheduler.make()
  let found = run LocalScheduler.execute(&mut scheduler, check(2))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  let missing = run LocalScheduler.execute(&mut scheduler, check(9))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  run Effect.log("task 2: {a}, task 9: {b}\n", &.{ a: found, b: missing })
    |> Effect.provideMut<Logger>(&mut logger)
}
```

```sh
silk run
```

```
task 2: 25, task 9: -1
```

Look at the failure row of `check`: `NoSuchTask` is not in it. The typed failure became an ordinary value, exactly like `Effect.result` in chapter 7. One scheduler can also run `execute` several times; each call gets fresh task storage.

## What a fiber may hold

A forked child can outlive the line that forked it. That is the whole point: you fork, carry on, and look at the result later. It also means a child cannot lean on anything that might disappear first. Silk enforces two rules:

- A child may only require `Scheduler` and `MonotonicClock`.
- A child may only hold `'static` data. It cannot borrow from its parent.

Here is a reminder that wants to log by itself, in the scratch project:

```silk
import silk.effect { Effect }
import silk.fiber { Fiber }
import silk.logger { Logger, LogError }
import silk.monotonic_clock { MonotonicClock }
import silk.allocator { OutOfMemoryError }
import silk.scheduler { Scheduler, TaskIdExhaustedError }

effect fn shout() -> () ! LogError ? &mut Logger {
  run Effect.log("reminder!\n", &())
}

effect fn root() -> () ! OutOfMemoryError | TaskIdExhaustedError ? &mut Scheduler | &mut MonotonicClock {
  // A fiber may only ask for Scheduler and MonotonicClock.
  let fiber = run Fiber<(), LogError>.forkChild(shout())
  drop fiber
}

pub fn main() -> i32 { return 0 }
```

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     55 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:14:49: error[SEM0076] A callable value whose signature cannot satisfy the expected callable type
Failed tasks in 0.17s
```

The message is general. Column 49 is the argument to `forkChild`, and the "expected callable type" is what a fiber may be: `shout()` needs a `Logger`, and a fiber is not allowed to ask for one. Replace `shout` with a child that borrows a title instead:

```silk
effect fn measure(title: string) -> usize ? &mut Scheduler | &mut MonotonicClock {
  return String.byteLength(title)
}

effect fn root<'text>(title: string<'text>) -> () ! OutOfMemoryError | TaskIdExhaustedError ? &mut Scheduler | &mut MonotonicClock {
  // The fiber may outlive `title`, so it cannot borrow it.
  let fiber = run Fiber<usize, never>.forkChild(measure(title))
  drop fiber
}
```

(This version imports `silk.string { String }` instead of the logger.) It fails on the same line, but with a lifetime error:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     55 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:14:15: error[SEM0212] A lifetime that must outlive another but is not known to
Failed tasks in 0.19s
```

Column 15 is the `run` of the fork. SEM0212 means one lifetime has to outlive another and does not. Here the child must be `'static`, but `measure(title)` borrows `title`, which is only valid during `'text`.

So a failed `forkChild` comes in two kinds. SEM0076 means the child needs a service other than the two allowed. SEM0212 means it borrows something. The fix is always the same shape: give the child owned values, and do the logging or the borrowing in the parent.

That leaves a puzzle. How do fibers report back if they cannot borrow? With `Shared<T>` from `silk/shared`. A `Shared` is an owned, counted handle to one value on the heap. Each fiber gets its own clone of the handle, and they all point at the same value. `Shared.withMut(&handle, callback)` lends the value to a callback for a moment. The callback must be an ordinary `fn` that runs no effects, so nobody can park while holding the value. See **Allocation and shared ownership** in the reference.

## Planning the reminders

Back in the real `tasks` project:

```sh
cd ../tasks
```

Here is the plan for `tasks remind`:

- One fiber per open task, at most eight.
- Each fiber sleeps by priority: 100 ms for high, 200 for normal, 400 for low. Then it records its task id.
- The root fiber waits out a time budget, 250 ms by default, and returns.
- Whatever has not fired by then is cancelled.

Start with the imports. Add these next to the others:

```silk
import silk.fiber { Fiber, Cancelled }
import silk.local_scheduler { LocalScheduler, StalledError }
import silk.monotonic_clock { MonotonicClock }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.scheduler { Scheduler, TaskIdExhaustedError }
import silk.shared { Shared }
import silk.u32
```

Then a new section near the end of the program, before `execute`. First the delays and what a fiber carries:

```silk
// ---------------------------------------------------------------------------
// Reminders: one fiber per open task, all running at once under one scheduler.

const MILLISECOND: u64 = 1000000

// The most urgent tasks get reminded first.
fn delayFor(priority: Priority) -> u64 {
  return match priority {
    Priority.High => 100 * MILLISECOND
    Priority.Normal => 200 * MILLISECOND
    Priority.Low => 400 * MILLISECOND
  }
}

// What a reminder fiber needs. Fibers outlive the function that forks them,
// so they may only hold owned, 'static data: an id and a delay, not a borrowed title.
struct Reminder { id: TaskId delay: u64 }

const MAX_REMINDERS: usize = 8

// Reminders that went off, in the order they went off.
struct Fired { ids: [u32; 8] count: usize }

fn record(fired: &mut Fired, id: TaskId) -> () {
  fired.ids[fired.count] = id.0
  fired.count = fired.count + 1
}
```

A `Reminder` holds a `TaskId` and a number, both `Copy`, both owned. The title stays behind on the board, which borrows its text from the loaded file. The fiber only needs the id; the parent can look the title up again afterwards.

Now the fiber itself. It sleeps, then records its id into the shared `Fired`:

```silk
effect fn remind(reminder: Reminder, fired: Shared<Fired>) -> ()
? &mut Scheduler | &mut MonotonicClock {
  run Effect.sleep(reminder.delay)
  let id = reminder.id
  Shared.withMut(&fired, fn(state: &mut Fired) -> () { record(state, id) })
}
```

The closure receives `state: &mut Fired` and hands it to `record`. Check it:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     67 modules, 1 in package          0.07s
  check    failed: 2 modules, 1 error        4.11s
[x86_64-unknown-linux-gnu]
src/main.silk:576:63: error[OWN0003] Moving state requires an explicit move
Failed tasks in 4.19s
```

A `&mut` is a unique loan, so passing it on moves it, and Silk wants every move written out. Silk does not quietly reborrow a `&mut` for you, as you saw in chapter 9. Write `move state`:

```silk
  Shared.withMut(&fired, fn(state: &mut Fired) -> () { record(move state, id) })
```

## The root fiber

The root forks one `remind` per reminder, then sleeps for the budget:

```silk
// The root fiber: fork every reminder, then wait out the budget. When the root returns,
// the scheduler cancels every reminder that has not gone off yet.
effect fn remindAll(reminders: List<Reminder>, fired: Shared<Fired>, budget: u64) -> ()
! OutOfMemoryError | TaskIdExhaustedError
? &mut Scheduler | &mut MonotonicClock {
  let all = reminders.asSlice()
  let mut index: usize = 0
  while index < all.length {
    let reminder = Reminder { id: all[index].id, delay: all[index].delay }
    let fiber = run Fiber<(), never>.forkChild(remind(move reminder, Shared.clone(&fired)))
    // Dropping the handle does not cancel the fiber; it keeps running.
    drop fiber
    index = index + 1
  }
  run Effect.sleep(budget)
}
```

Three things deserve a closer look.

`remindAll` takes the `List` by value. It is the root fiber, so it follows the same rules as a child: owned data only. Each `Reminder` is copied out of the list field by field and moved into its fiber.

Each fiber gets `Shared.clone(&fired)`, its own handle to the one `Fired` value. Clones are cheap: they bump a count.

The handles are dropped right away. Dropping a `Fiber` means "I will not look at the result". It does not stop the fiber. So who stops a reminder that is still asleep? The scheduler. Fibers in Silk are *structured*: when a task finishes, the scheduler cancels its unfinished children. When the root returns, nothing it started outlives it. A cancelled fiber never resumes from its sleep, so a late reminder simply never records anything. See **Suspension and cancellation** in the reference for what cancellation cleans up.

## Running the scheduler

`runReminders` builds the list, creates the shared result and the scheduler, and runs the root:

```silk
fn snapshot(fired: &Fired) -> Fired {
  return Fired { ids: fired.ids, count: fired.count }
}

// Runs the reminders for up to MAX_REMINDERS open tasks and reports which went off.
effect fn runReminders(board: &Board, budget: u64) -> Fired
! OutOfMemoryError | TaskIdExhaustedError | StalledError
? &mut MonotonicClock | &mut Allocator {
  let mut reminders = List<Reminder>.make()
  let tasks = board.tasks.asSlice()
  let mut index: usize = 0
  while index < tasks.length && reminders.length() < MAX_REMINDERS {
    let task = &tasks[index]
    if task.isOpen() {
      run reminders.append(Reminder { id: task.id, delay: delayFor(task.priority) })
    }
    index = index + 1
  }
  let fired = run Shared<Fired>.make(Fired { ids: [0, 0, 0, 0, 0, 0, 0, 0], count: 0 })
  let mut scheduler = LocalScheduler.make()
  run LocalScheduler.execute(&mut scheduler, remindAll(move reminders, Shared.clone(&fired), budget))
  return Shared.with(&fired, snapshot)
}
```

`Shared<Fired>.make` allocates, so it needs the `Allocator`. After `execute` returns, every fiber is finished or cancelled, and `Shared.with` copies the result out through `snapshot`.

Notice the requirement row: `MonotonicClock` and `Allocator`, but no `Scheduler`. `LocalScheduler.execute` provides `Scheduler` to the fibers inside it, the same way `provideMut` does for other services. What happens if you forget it? Try this in the scratch project:

```silk
import silk.effect { Effect }
import silk.fiber { Fiber, Cancelled }
import silk.monotonic_clock { MonotonicClock }
import silk.allocator { OutOfMemoryError }
import silk.scheduler { Scheduler, TaskIdExhaustedError }

effect fn work() -> i32 ? &mut Scheduler | &mut MonotonicClock { return 1 }

effect fn root() -> i32 ! OutOfMemoryError | TaskIdExhaustedError | Cancelled ? &mut Scheduler | &mut MonotonicClock {
  let fiber = run Fiber<i32, never>.forkChild(work())
  return run Fiber<i32, never>.join(move fiber)
}

// Forgot LocalScheduler.execute: nothing provides the Scheduler service.
pub effect fn main() -> i32 ! OutOfMemoryError | TaskIdExhaustedError | Cancelled {
  return run root()
}
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     55 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.09s
[x86_64-unknown-linux-gnu]
src/main.silk:16:10: error[SEM0071] A `run` whose requirements the enclosing signature does not provide
Failed tasks in 0.14s
```

SEM0071 is the "missing provider" error from chapter 8. Line 16 runs `root()`, which needs a `Scheduler` that nothing provides. Wrap the call in `LocalScheduler.execute` and provide a clock, as `runReminders` does.

## Wiring up the command

The reminders report ids. `remindTasks` turns them back into titles and counts the ones that missed:

```silk
fn titleOf<'text>(board: &Board<'text>, id: u32) -> string<'text> {
  let tasks = board.tasks.asSlice()
  let mut index: usize = 0
  while index < tasks.length {
    if tasks[index].id.0 == id {
      return tasks[index].title
    }
    index = index + 1
  }
  return "?"
}

effect fn remindTasks(board: &mut Board, budget: u64) -> ()
! LogError | OutOfMemoryError | TaskIdExhaustedError | StalledError
? &mut Logger | &mut MonotonicClock | &mut Allocator {
  run board.tasks.sort()
  let fired = run runReminders(&board.*, budget)
  let mut index: usize = 0
  while index < fired.count {
    let id = fired.ids[index]
    run Effect.log("reminder: #{id} {title}\n", &.{ id: id, title: titleOf(&board.*, id) })
    index = index + 1
  }
  let open = count(&board.*, &OpenTasks {})
  let missed = open - usize.toI32(fired.count)
  run Effect.log("{missed} cancelled when the time ran out\n", &.{ missed: missed })
}
```

Sorting first means that, with more than eight open tasks, the most urgent eight get reminders. The logging happens here, in the parent, which is allowed to use the `Logger`.

The command takes an optional budget in milliseconds. Add a variant to `Command`:

```silk
  Remind { budget: u64 },
```

and a parser for the number, next to `parseId`:

```silk
// "remind" takes an optional time budget in milliseconds.
effect fn parseMilliseconds(word: string) -> u64 ! UsageError {
  if word == "" {
    return 250 * MILLISECOND
  }
  return match Format.u32Value(word) {
    Result.Success { value } => u32.toU64(value) * MILLISECOND
    Result.Failure { .. } => run usage()
  }
}
```

`u32.toU64` lives in the `silk/u32` module, which is why the import list gained `import silk.u32`. Leave that import out and the compiler says so:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     67 modules, 1 in package          0.09s
  check    failed: 2 modules, 1 error        4.36s
[x86_64-unknown-linux-gnu]
src/main.silk:470:33: error[SEM0009] Unknown name u32; is `import silk.u32` missing?
Failed tasks in 4.46s
```

The message names what the compiler could not find and suggests the likely cause. Conversions like `u32.toU64`, `usize.toI32` and `u8.toU64` each need their type's module imported.

In `parseCommand`, recognise the word:

```silk
  if name == "remind" {
    return Command.Remind { budget: run parseMilliseconds(run text(&words.first)) }
  }
```

`execute` gains the new arm, two new failures and the `MonotonicClock` requirement:

```silk
effect fn execute<'text>(words: &'text Words) -> i32
! LogError | UsageError | UnknownCommand<'text> | DuplicateTask | NoSuchTask | CorruptFile
| FileError | WriterError | OutOfMemoryError | TaskIdExhaustedError | StalledError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut MonotonicClock | &mut Allocator {
```

```silk
    Command.Remind { budget } => {
      run remindTasks(&mut board, budget)
    }
```

`explain` must now handle the two new failures. Add them to its parameter type, `... | LogError | TaskIdExhaustedError | StalledError`, and add two arms:

```silk
    TaskIdExhaustedError problem => {
      drop problem
      run Effect.log("too many reminders at once\n", &())
      return 1
    }
    StalledError problem => {
      drop problem
      run Effect.log("the reminders stalled\n", &())
      return 1
    }
```

Update the usage line in `printUsage` to end with `| done <id> | remind [ms]`. Finally `main` provides the real monotonic clock. Only the `timer` lines are new; `clock` is still the `OsSystemClock` from chapter 8:

```silk
  let mut clock = OsSystemClock.make()
  let mut timer = OsMonotonicClock.make()

  let handled = Effect.catchAll(execute(&words), explain)
  return run move handled
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<MonotonicClock>(&mut timer)
    |> Effect.provideMut<Allocator>(&mut allocator)
```

Two clocks, two jobs. `SystemClock` tells the date, for "done 3 days ago". `MonotonicClock` measures durations and never jumps backwards when someone changes the system time.

## Try it

Build, add a few tasks of different priorities, and finish one:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Buy milk'
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Write the Silk book' high
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Water the plants' low
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Call the plumber' high
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks done 4
```

```
added #1
added #2
added #3
added #4
finished #4
```

Three tasks are open: one high (100 ms), one normal (200 ms), one low (400 ms). Run the reminders with the default budget of 250 ms:

```sh
TIMEFORMAT='time %Rs'; time ./build/llvm/x86_64-unknown-linux-gnu/debug/tasks remind
```

```
reminder: #2 Write the Silk book
reminder: #1 Buy milk
1 cancelled when the time ran out
time 0.253s
```

The high-priority reminder fired first, then the normal one. The low one was still asleep at 250 ms, so it was cancelled when the root returned. The whole run took 0.25 s. Run one after the other, the three sleeps would add up to 0.7 s.

Give it more time:

```sh
TIMEFORMAT='time %Rs'; time ./build/llvm/x86_64-unknown-linux-gnu/debug/tasks remind 500
```

```
reminder: #2 Write the Silk book
reminder: #1 Buy milk
reminder: #3 Water the plants
0 cancelled when the time ran out
time 0.503s
```

All three fired. The run still takes the full 0.5 s, because the root sleeps for the whole budget. With too little time, nothing fires:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks remind 50
```

```
3 cancelled when the time ran out
```

And a budget that is not a number is a usage error, exit code 2:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks remind soon
```

```
usage: tasks list | add <title> [low|normal|high] | done <id> | remind [ms]
```

## Testing with virtual time

A test that really sleeps is slow, and its timing can wobble on a busy machine. But the scheduler gets all its time from the `MonotonicClock` you provide. So provide a fake one: a clock whose waits just move its hands forward.

```silk
// A monotonic clock with virtual time: waiting just moves the hands, so tests never sleep.
struct VirtualClock { mark: Instant }

impl MonotonicClock for VirtualClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(SystemClock.seconds(&self.mark), SystemClock.nanoseconds(&self.mark))
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }
  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    self.mark = move when
  }
  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    self.mark = MonotonicClock.deadlineAfter(&self.mark, howLong)
  }
}
```

When every fiber is asleep, the scheduler asks the clock to wait until the earliest deadline. `VirtualClock` jumps straight there. The fibers wake in the same order as with a real clock, but no time passes.

Because `execute` now requires a `MonotonicClock`, the two tests from chapter 8 need one too. In each, create `let mut timer = VirtualClock { mark: SystemClock.make(0, 0) }` and add `|> Effect.provideMut<MonotonicClock>(&mut timer)` to every pipeline that runs `execute`. Then add a test for the reminders:

```silk
test effect fn slowRemindersAreCancelled()
! AssertionError<'static> | DuplicateTask | OutOfMemoryError | TaskIdExhaustedError | StalledError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut timer = VirtualClock { mark: SystemClock.make(0, 0) }
  let mut board: Board<'static> = Board.make()
  drop run board.add(Draft { title: "Water the plants", priority: Priority.Low })
    |> Effect.provideMut<Allocator>(&mut allocator)
  drop run board.add(Draft { title: "Write the Silk book", priority: Priority.High })
    |> Effect.provideMut<Allocator>(&mut allocator)
  drop run board.add(Draft { title: "Buy milk", priority: Priority.Normal })
    |> Effect.provideMut<Allocator>(&mut allocator)

  // 250 virtual milliseconds pass instantly.
  let fired = run runReminders(&board, 250 * MILLISECOND)
    |> Effect.provideMut<MonotonicClock>(&mut timer)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(fired.count == 2, "two reminders went off")
  run Testing.expect(fired.ids[0] == 2 && fired.ids[1] == 3, "high before normal")
}
```

```sh
silk test
```

```
  main::finishingRecordsTheClockTime
    PASS  89 us
  main::slowRemindersAreCancelled
    PASS  175 us
  main::unknownTaskIsReported
    PASS  12 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   337 us
```

A quarter of a virtual second, checked in 175 microseconds. This is the payoff of treating time as a service: the code under test is exactly the code that runs for real. Only the provider changed. See **Fibers and scheduling** in the reference for the full timer rules.

## Summary

- You can fork child fibers with `Fiber<A, E>.forkChild`, and collect them with `join` (failures pass through) or `await` (an `Outcome` as data).
- You can run a root fiber with `LocalScheduler.execute`, providing a `MonotonicClock` for its timers, and sleep with `Effect.sleep`.
- You know the two fiber rules: only `Scheduler` and `MonotonicClock` (SEM0076 at a fork), and only owned `'static` data (SEM0212).
- You can share results between fibers with `Shared`, `Shared.clone` and `Shared.withMut`.
- You know that dropping a handle does not cancel a fiber, but the end of its parent does.
- You can test timing code instantly with a virtual-time `MonotonicClock` provider.

The next chapter moves work to compile time: package parameters set from `silk.toml`, `static if` on the target, and a CSV export generated by reflection.
