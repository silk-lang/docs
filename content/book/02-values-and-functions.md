# 2. Values and functions

Your `tasks` program prints one fixed line. Before it can track anything, it needs to compute: count the open tasks, add up how long they will take, and turn minutes into hours. This chapter adds a small report over three hard-coded tasks. Along the way you meet Silk's numbers, bindings, loops and functions, and a few of the compiler's opinions about them.

## Moving the work out of main

`main` should stay short. Its job is to set things up and start the real work. So the report goes into its own function, and `main` runs it with a logger.

Here is the shape of `src/main.silk` for this first step:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

effect fn report() -> () ! LogError ? &mut Logger {
  // Three tasks for now: an estimate in minutes, and whether each is finished.
  let estimates = [25, 90, 40]
  let finished = [true, false, false]

  let mut open = 0
  let mut minutesLeft = 0
  let mut index: usize = 0
  while index < estimates.length {
    if !finished[index] {
      open = open + 1
      minutesLeft = minutesLeft + estimates[index]
    }
    index = index + 1
  }

  run Effect.log("{open} open, {minutes} minutes left\n", &.{
    open: open,
    minutes: minutesLeft,
  })
}

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  run report() |> Effect.provideMut(&mut logger)
}
```

Start with the signature of `report`:

```silk
effect fn report() -> () ! LogError ? &mut Logger {
```

You already know `effect fn`, `-> ()` and `! LogError` from `main`. The new part is `? &mut Logger`. It says what the function needs from its caller: a `Logger` it may use. `report` does not create a logger and does not care where its output goes. `main` makes a `StdoutLogger` and provides it, just as it did in chapter 1. The import line now also brings in `Logger`, because the signature names it.

A `//` starts a comment that runs to the end of the line.

Run it:

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 236 symbols)
2 open, 130 minutes left
```

Now take the body apart.

## Arrays and integer types

```silk
  let estimates = [25, 90, 40]
  let finished = [true, false, false]
```

These are fixed-size arrays: three numbers and three `bool` values. Each task is one position across both arrays. That is clumsy, and chapter 3 replaces it with a proper `Task` type, but it is enough to practice with.

What type are 25, 90 and 40? Silk has integer types of fixed sizes: `i8`, `i16`, `i32` and `i64` are signed, `u8` to `u64` are unsigned, and `isize` and `usize` match the machine's pointer size. A number literal takes its type from where you use it. With no other clue, it is an `i32`. So `estimates` is an array of three `i32`, written `[i32; 3]`.

Array positions and lengths are always `usize`. That is why `index` has a type written on it:

```silk
  let mut index: usize = 0
```

The `: usize` is a type annotation. It tells the compiler which type you mean, and the literal `0` becomes a `usize`.

What happens if you leave it off? Try it:

```silk
  let mut index = 0
```

```sh
silk check
```

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:13:15: error[SEM0135] Operator < does not accept (i32, usize)
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Line 13, column 15 is the `<` in `while index < estimates.length`. The message names the operator and the two operand types it got. In Silk, an operator such as `<` is backed by an interface, and each number type opts in for its own operands. SEM0135 says none of those versions accepts `(i32, usize)`. Where did the `i32` come from? Without an annotation, `index` became an `i32`. `estimates.length` is a `usize`. Silk never converts between number types on its own, so `i32 < usize` has no meaning. Put the `: usize` back.

When you really do need to change type, you call a conversion function. They live in modules named after the source type: `silk/usize` has `usize.toI32`, `silk/i32` has `i32.toI64`, and so on. You will use one later in this chapter. Each one stops the program if the value does not fit in the new type. See **Values and primitive types** in the reference for every integer type and conversion.

## let and let mut

A `let` binding cannot change after it is made. To change it, you ask for that up front with `let mut`. The counters in `report` change on every pass through the loop, so they are all `let mut`.

Leave the `mut` off `open` and see what the compiler says:

```silk
  let open = 0
```

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:15:7: error[SEM0035] Cannot assign through immutable binding open
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

This one has a clear message. Line 15 is `open = open + 1`, the first place you try to change `open`. Making mutation visible at the `let` means a reader can trust that every other binding keeps its value. Put the `mut` back.

You may be used to writing `open += 1`. Silk has no compound assignment:

```silk
      open += 1
```

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:15:13: error[PAR0001] Expected identifier
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

PAR codes come from the parser, which reads the shape of your code before any types are checked. It got as far as `+` and then found `=` where it expected a name. The error does not say "no `+=` in Silk", so remember it: write `open = open + 1`.

## Loops and conditions

```silk
  while index < estimates.length {
    if !finished[index] {
      open = open + 1
      minutesLeft = minutesLeft + estimates[index]
    }
    index = index + 1
  }
```

`while` repeats its block as long as the condition is `true`. `estimates[index]` reads one element. `!` turns `true` into `false` and back, so `if !finished[index]` means "if this task is not finished". Conditions must be `bool`. A number is not a condition.

Reading past the end of an array does not return garbage. If `index` ever reached 3 here, the program would stop with `fatal trap: index out of bounds`. You will see a trap of the same kind later in this chapter.

Silk also has `break` and `continue` for leaving a loop or skipping to the next pass. See **Control flow** in the reference.

## Functions

The report should say "2 of 3 tasks open, 33% done". Two small calculations make that easier to read as their own functions. Add them above `report`:

```silk
fn percent(part: i32, whole: i32) -> i32 {
  if whole == 0 {
    return 0
  }
  return part * 100 / whole
}

fn noun(count: i32) -> string<'static> {
  if count == 1 {
    return "task"
  }
  return "tasks"
}
```

A function lists its parameters with their types, then its result type after `->`. Parameter types are always written out. The compiler infers types inside a body, but never across a function boundary, so each signature reads on its own.

`return` hands back a value. Silk does not return the last expression of a function by itself: every value leaves through `return`.

These are plain `fn`, not `effect fn`. They only compute, so they need no logger and cannot fail. A plain function can be called directly, like `percent(1, 3)`, with no `run`.

Integer division drops the remainder, so `percent(1, 3)` is 33. Dividing by zero would stop the program, which is why `percent` checks `whole` first.

`noun` returns text. A text literal such as `"task"` has the type `string<'static>`. `string` is a view of some text stored elsewhere, and `'static` says that text lives as long as the program does. Literals are built into the program, so they qualify. Chapter 5 explains the part in angle brackets properly.

## if is a statement

You might want to write `noun` with a value-producing `if`:

```silk
fn noun(count: i32) -> string<'static> {
  let word = if count == 1 { "task" } else { "tasks" }
  return word
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:16:14: error[PAR0001] Expected identifier
/home/you/tasks/src/main.silk:16:30: error[SEM0087] An expression statement whose result cannot be intentionally ignored
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

The real message is the first line: the parser did not expect `if` after `=`. In Silk, `if` is a statement. It runs one block or another, but it has no value of its own. The SEM0087 that follows is a knock-on error: once the parser lost its place, it read `{ "task" }` as a statement on its own. That statement produces a value, and Silk does not let a value be thrown away unnoticed.

There are two good ways to choose a value. Return from inside the `if`, as the version above `report` does. Or start with one value and change it:

```silk
  let mut label = "tasks"
  if open == 1 {
    label = "task"
  }
```

The `match` expression in chapter 3 does produce a value, and it covers many of the places where you would reach for an if-expression.

## Constants

To show time in hours, you divide by 60. A bare 60 in the middle of a calculation hides its meaning, so give it a name at the top of the file, below the imports:

```silk
const MINUTES_PER_HOUR: i32 = 60
```

A `const` is fixed when the program is compiled. Its type is always written out. By convention its name is in capitals.

`130 / 60` is 2 and `130 % 60` is 10. `%` is the remainder. Together they turn 130 minutes into 2 hours and 10 minutes.

## The finished report

Here is the whole file:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }
import silk.usize

const MINUTES_PER_HOUR: i32 = 60

fn percent(part: i32, whole: i32) -> i32 {
  if whole == 0 {
    return 0
  }
  return part * 100 / whole
}

fn noun(count: i32) -> string<'static> {
  if count == 1 {
    return "task"
  }
  return "tasks"
}

effect fn report() -> () ! LogError ? &mut Logger {
  // Three tasks for now: an estimate in minutes, and whether each is finished.
  let estimates = [25, 90, 40]
  let finished = [true, false, false]

  let mut open = 0
  let mut minutesLeft = 0
  let mut index: usize = 0
  while index < estimates.length {
    if !finished[index] {
      open = open + 1
      minutesLeft = minutesLeft + estimates[index]
    }
    index = index + 1
  }

  let total = usize.toI32(estimates.length)
  let done = total - open
  run Effect.log("{open} of {total} {noun} open, {percent}% done\n", &.{
    open: open,
    total: total,
    noun: noun(total),
    percent: percent(done, total),
  })
  run Effect.log("time left: {hours}h {minutes}m\n", &.{
    hours: minutesLeft / MINUTES_PER_HOUR,
    minutes: minutesLeft % MINUTES_PER_HOUR,
  })
}

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  run report() |> Effect.provideMut(&mut logger)
}
```

Three things are new at the end of `report`.

`import silk.usize` imports a whole module rather than names from it. You then call its functions through the module name: `usize.toI32(estimates.length)` turns the `usize` length into an `i32`, so it can mix with `open`.

The log arguments are records with several fields, one per placeholder. Fields can hold any expression, including function calls. A field may share its name with a function, as `noun` does here.

There are now two `run` lines. Each one performs its log before the next line starts.

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 248 symbols)
2 of 3 tasks open, 33% done
time left: 2h 10m
```

## Experiments in a scratch project

Some questions are easier to answer in a tiny program of their own. Make a second project next to `tasks` for that:

```sh
cd ..
silk init scratch
cd scratch
```

A program does not have to log. The simplest `main` is a plain function that returns an `i32`, and that number becomes the process's exit status. Put this in `scratch/src/main.silk`:

```silk
pub fn main() -> i32 {
  let estimate = 25
  return estimate + 17
}
```

```sh
silk run
echo $?
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/scratch (llvm, x86_64-unknown-linux-gnu, 182 symbols)
42
```

That is a handy way to test a calculation without any imports.

### Mixing integer sizes

Suppose a total in minutes is an `i32`, but you want to add it to an `i64`:

```silk
fn total(minutes: i32, extra: i64) -> i64 {
  return minutes + extra
}

pub fn main() -> i32 {
  drop total(25, 5)
  return 0
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/scratch/src/main.silk:2:18: error[SEM0135] Operator + does not accept (i32, i64)
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

It is the same SEM0135 you saw with `index`, this time for `+`: there is no `+` for an `i32` and an `i64`. `drop` in `main` throws away the result of `total`. Silk does not let you ignore a value silently, so a call whose result you do not want is written with `drop`.

Widen the `i32` yourself:

```silk
import silk.i32

fn total(minutes: i32, extra: i64) -> i64 {
  return i32.toI64(minutes) + extra
}

pub fn main() -> i32 {
  if total(25, 5) != 30 {
    return 1
  }
  return 0
}
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/scratch (llvm, x86_64-unknown-linux-gnu, 184 symbols)
```

It compiles, runs, and exits with 0.

### Overflow

A `u8` holds 0 to 255. What happens when a sum does not fit?

```silk
fn addMinutes(left: u8, right: u8) -> u8 {
  return left + right
}

pub fn main() -> i32 {
  let total = addMinutes(200, 90)
  return 0
}
```

This compiles. The trouble comes when it runs:

```sh
silk run
echo $?
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/scratch (llvm, x86_64-unknown-linux-gnu, 183 symbols)
fatal trap: arithmetic overflow
  at main.addMinutes (main:2:10)
132
```

200 plus 90 is 290, which a `u8` cannot hold. Silk does not wrap around to 34 quietly. It stops the program with a trap, names the reason and points at line 2, column 10 of the `main` module, the `+`. The exit status 132 is how the shell reports the signal a trap raises, and your shell may add a line such as `Illegal instruction`.

A trap is for bugs, not for expected situations. When wrapping or clamping is what you want, ask for it by name: `silk/u8` and the other integer modules have `wrappingAdd`, `saturatingAdd` and `checkedAdd`. See **Values and primitive types** in the reference.

Go back to the `tasks` folder before the next chapter:

```sh
cd ../tasks
```

## Summary

- Integer literals are `i32` unless their context says otherwise. Array indexes and lengths are `usize`.
- Silk never converts number types for you. Use functions like `usize.toI32` and `i32.toI64`, and annotate bindings like `let mut index: usize = 0`.
- `let` bindings are fixed. `let mut` ones can change, with `x = x + 1`, since there is no `+=`.
- `if` and `while` are statements. Choose a value by returning from inside an `if`, or by assigning a `let mut`.
- Functions write out parameter and result types and return with `return`. `const` names a fixed value.
- Overflow, division by zero and out-of-range indexes stop the program with a trap.

Next, chapter 3 replaces the parallel arrays with real types for tasks, priorities and commands.
