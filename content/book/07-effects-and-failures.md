# 7. Effects and failures

So far `tasks` always does the same thing: it parses a fixed board and prints it. This chapter makes it a real command-line program. It reads `list`, `add` and `done` from its arguments, and it answers mistakes with a clear message and a proper exit code. Doing that well means taking failure seriously, and that is where effects come in.

## Why effects

Think about everything that can go wrong once `tasks` reads its arguments. The user may type no command at all, or one that doesn't exist. `done two` isn't a number. `done 9` names a task that isn't there. `add` on a full board has nowhere to put the task. Each of these needs its own message, and the program should exit with a status a script can check.

Most languages give you two ways to report such problems, and both have a cost. Exceptions are invisible: nothing in a function's signature tells you what it can throw, so it is easy to forget one. Error codes are visible but easy to ignore: nothing stops you from dropping the return value. Side effects have the same problem. You can't tell from a signature whether a function prints, reads a file or looks at the clock.

Silk takes a different route. A function that does more than compute a value is an *effect function*, and its signature says everything it does:

```silk
effect fn show(task: &Task) -> () ! LogError ? &mut Logger {
```

You have been writing lines like this since chapter 1. Now you can read them. `-> ()` is the success type. `! LogError` is the *failure row*: the ways this can fail. `? &mut Logger` is the *requirement row*: what it needs from its surroundings. The compiler checks all three. If you run something that can fail with `NoSuchTask`, your function must either declare `! NoSuchTask` or handle it. Nothing slips through unannounced.

The second idea is less familiar. Calling an effect function does not do the work. It builds a value, an `Effect`, that describes the work. `run` performs it. Because the work is a value, you can wrap it before it runs: attach a handler for its failures, a cleanup step, or a provider for what it needs. You have already done the last one: `|> Effect.provideMut(&mut logger)` wraps an effect with a logger. This chapter adds the other two.

## Effects are lazy

Laziness surprises people the first time, so see it on its own. Put this program in your scratch project. It builds a greeting and forgets to run it:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

effect fn greet() -> () ! LogError ? &mut Logger {
  run Effect.log("hello\n", &())
}

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  greet()
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.10s
  check    failed: 2 modules, 1 error        0.18s
[x86_64-unknown-linux-gnu]
src/main.silk:11:3: error[SEM0087] Expression statement produces an Effect of `()` that is never run (write `run` before it to run it, or `drop` it to discard it), but only () or never may be ignored
Failed scratch in 0.29s
```

Line 11 is `greet()`. It builds an Effect and throws it away, which is never what you meant. SEM0087 says an Effect is a result you may not drop silently, and the message names both ways out: `run` it, or say `drop` to discard it on purpose. You can also store it and run it later.

Storing it shows what laziness means:

```silk
pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  let greeting = greet()
  run Effect.log("built, not run yet\n", &()) |> Effect.provideMut(&mut logger)
  run greeting |> Effect.provideMut(&mut logger)
  run greeting |> Effect.provideMut(&mut logger)
}
```

```sh
silk run
```

```
built, not run yet
hello
hello
```

Building `greeting` printed nothing. Each `run` performed it once. An effect is a recipe, and `run` cooks it. See **Effects and run** in the reference for the full rules.

## Failures are values

A typed failure is an ordinary value. Usually it is a small struct that carries what the handler will need. Add four of them after `Draft`:

```silk
// Typed failures: ordinary structs that an effect can `fail` with.
struct UsageError {}
struct UnknownCommand<'text> { name: string<'text> }
struct BoardFull {}
struct NoSuchTask { id: TaskId }
```

`UnknownCommand` borrows the word the user typed, so it has a lifetime, just like `Task` in chapter 5.

Now let the board fail. In chapter 5, `add` on a full board would index past the end of the array and stop the program with a trap. `complete` returned a `bool` that callers could ignore. Make both of them effect functions:

```silk
  effect fn add(self: &mut Self, draft: Draft<'text>) -> TaskId ! BoardFull {
    if self.count == self.tasks.length {
      fail BoardFull {}
    }
    let Draft { title, priority } = move draft
    let id = TaskId(self.nextId)
    self.tasks[self.count] = Task { id: id, title: title, priority: priority, status: Status.Open }
    self.count = self.count + 1
    self.nextId = self.nextId + 1
    return id
  }

  effect fn complete(self: &mut Self, id: TaskId, day: u32) -> () ! NoSuchTask {
    let mut index: usize = 0
    while index < self.count {
      let task = &mut self.tasks[index]
      if &task.id == &id {
        task.status = Status.Done { day: day }
        return ()
      }
      index = index + 1
    }
    fail NoSuchTask { id: id }
  }
```

`fail` ends the effect with a failure instead of a result. `complete` no longer returns a `bool`: it either succeeds or fails with a `NoSuchTask` that says which id was missing.

Only effect functions can fail. Try it in a plain `fn`:

```silk
struct NoSuchTask { id: u32 }

fn complete(id: u32) -> () {
  if id > 3 {
    fail NoSuchTask { id: id }
  }
}

pub fn main() -> i32 {
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:5:5: error[SEM0063] Only effect functions may originate a typed failure
Failed scratch in 0.17s
```

This time the message says it all. A plain `fn` promises to return a value, so its callers never need to think about failure.

## Failures travel through run

`parseBoard` calls `add` and `complete`, so it now builds effects and must run them. When you `run` an effect that can fail, its failures pass straight through to your caller. Leave the failure row off and see what the compiler says. Here is the same situation in miniature:

```silk
struct NoSuchTask { id: u32 }

effect fn complete(id: u32) -> () ! NoSuchTask {
  if id > 3 {
    fail NoSuchTask { id: id }
  }
}

effect fn finish(id: u32) -> () {
  run complete(id)
}

pub fn main() -> i32 {
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
src/main.silk:10:3: error[SEM0066] A `run` whose failures the enclosing signature does not declare
Failed scratch in 0.15s
```

SEM0066 is the heart of the system, and its message says it plainly. `run complete(id)` can fail with `NoSuchTask`, and `finish` says it can't fail at all. You have two honest choices: declare the failure, or handle it. For `parseBoard`, declare both:

```silk
effect fn parseBoard<'text>(text: string<'text>) -> Board<'text> ! BoardFull | NoSuchTask {
  let mut board: Board<'text> = Board.make()
  let bytes = String.utf8Bytes(text)
  let mut start: usize = 0
  let mut index: usize = 0
  while index < bytes.length {
    if bytes[index] == '\n' {
      if index - start > 4 {
        let id = run board.add(Draft {
          title: part(text, start + 4, index),
          priority: priorityFrom(bytes[start + 2]),
        })
        if bytes[start] == 'x' {
          run board.complete(id, 1)
        }
      }
      start = index + 1
    }
    index = index + 1
  }
  return move board
}
```

`! BoardFull | NoSuchTask` lists several failure types with `|`. `run board.add(...)` evaluates to the `TaskId` on success, so the code reads as if nothing could go wrong, and the signature tells the truth about what can.

## Reading the command line

The arguments arrive as raw bytes. A small struct holds the three words `tasks` cares about:

```silk
// The words after the program name. Titles borrow from these bytes.
struct Words {
  command: Bytes,
  first: Bytes,
  second: Bytes,
}
```

`main` reads them through the `HostInput` service from `silk/host_input`. `HostInput.argument(index)` gives `Option<Bytes>`: the argument, or nothing if there are fewer. Copying an argument into `Bytes` allocates memory, so this effect also needs an `Allocator`. Its requirement row says so:

```silk
effect fn wordAt(index: usize) -> Bytes
! HostInputError | OutOfMemoryError
? &mut HostInput | &mut Allocator {
  let found = run HostInput.argument(index)
  return match move found {
    Option<Bytes>.Some { value } => move value
    Option<Bytes>.None => Bytes.make()
  }
}
```

A missing word becomes empty bytes, which keeps the parser simple. Chapter 8 explains services and providers in depth.

Next, turn bytes into text. Arguments need not be valid UTF-8, and that is a usage error too:

```silk
effect fn text<'text>(bytes: &'text Bytes) -> string<'text> ! UsageError {
  return match String.fromUtf8(Bytes.asSlice(bytes)) {
    Result<string<'text>, InvalidUtf8>.Success { value } => value
    Result<string<'text>, InvalidUtf8>.Failure { .. } => run usage()
  }
}

effect fn usage() -> never ! UsageError {
  fail UsageError {}
}
```

`usage` has the success type `never`. It can only fail, so `run usage()` never produces a value, and it fits in any match arm. That is how the failure arm can stand where a `string` is expected.

Priorities and ids parse the same way. `Format.u32Value` returns a plain `Result`, and a bad number becomes a usage error:

```silk
effect fn parsePriority(word: string) -> Priority ! UsageError {
  if word == "" || word == "normal" {
    return Priority.Normal
  }
  if word == "high" {
    return Priority.High
  }
  if word == "low" {
    return Priority.Low
  }
  fail UsageError {}
}

effect fn parseId(word: string) -> TaskId ! UsageError {
  return match Format.u32Value(word) {
    Result.Success { value } => TaskId(value)
    Result.Failure { .. } => run usage()
  }
}
```

`parseCommand` puts it together. Its result is a `Command`, which now borrows its title from the words:

```silk
// What the user asked for on the command line.
union Command<'text> {
  List,
  Add { title: string<'text>, priority: Priority },
  Done { id: TaskId },
}
```

```silk
effect fn parseCommand<'text>(words: &'text Words) -> Command<'text> ! UsageError | UnknownCommand<'text> {
  let name = run text(&words.command)
  if name == "list" {
    return Command.List
  }
  if name == "add" {
    let title = run text(&words.first)
    if title == "" {
      fail UsageError {}
    }
    let priority = run parsePriority(run text(&words.second))
    return Command.Add { title: title, priority: priority }
  }
  if name == "done" {
    return Command.Done { id: run parseId(run text(&words.first)) }
  }
  if name == "" {
    fail UsageError {}
  }
  fail UnknownCommand { name: name }
}
```

Read the signature and you know every way a command line can be wrong.

## The whole program as one effect

`execute` does one command from start to finish. Its rows are the union of everything it runs:

```silk
effect fn execute<'text>(words: &'text Words) -> i32
! LogError | UsageError | UnknownCommand<'text> | BoardFull | NoSuchTask
? &mut Logger {
  let mut board: Board<'text> = run parseBoard(SEED)
  let command = run parseCommand(words)
  match move command {
    Command.List => {
      run showBoard(&board)
    }
    Command.Add { title, priority } => {
      run addTask(&mut board, Draft { title: title, priority: priority })
    }
    Command.Done { id } => {
      run finishTask(&mut board, id)
    }
  }
  return 0
}

effect fn addTask<'text>(board: &mut Board<'text>, draft: Draft<'text>) -> () ! BoardFull | LogError ? &mut Logger {
  let id = run board.add(move draft)
  run Effect.log("added {id}\n", &.{ id: id })
}

effect fn finishTask(board: &mut Board, id: TaskId) -> () ! NoSuchTask | LogError ? &mut Logger {
  run board.complete(id, 7)
  run Effect.log("finished {id}\n", &.{ id: id })
}
```

Nothing is saved yet, so `add` and `done` change a board that disappears when the program exits. Chapter 8 fixes that. For now the day of completion is a stand-in, 7.

## What happens if nobody handles a failure

A failure can travel all the way out of `main`. Try it:

```silk
pub struct NoSuchTask { id: u32 }

effect fn complete(id: u32) -> () ! NoSuchTask {
  if id > 3 {
    fail NoSuchTask { id: id }
  }
}

pub effect fn main() -> () ! NoSuchTask {
  run complete(2)
  run complete(9)
}
```

```sh
silk run
```

```
unhandled error: main.NoSuchTask
  at main.complete (main:5:5)
  at main.main (main:11:3)
```

The program exits with status 1 and prints where the failure started. That is useful while developing, but users deserve better. Notice the `pub` on the struct: `main` is `pub`, and a public signature can only name public failure types. Without it, SEM0019 reports a public declaration whose signature mentions a private type.

## Handling failures

A *handler* is an effect function that receives the failure value. `explain` turns each failure into a message and an exit code:

```silk
// A failure handler: an effect fn that receives the failure value.
effect fn explain<'text>(
  error: UsageError | UnknownCommand<'text> | BoardFull | NoSuchTask | LogError,
) -> i32 ! LogError ? &mut Logger {
  return match move error {
    UsageError {} => run printUsage()
    UnknownCommand { name } => {
      run Effect.log("unknown command '{name}'\n", &.{ name: name })
      return run printUsage()
    }
    BoardFull {} => {
      run Effect.log("the board is full\n", &())
      return 1
    }
    NoSuchTask { id } => {
      run Effect.log("there is no task {id}\n", &.{ id: id })
      return 1
    }
    LogError held => {
      fail move held
    }
  }
}

effect fn printUsage() -> i32 ! LogError ? &mut Logger {
  run Effect.log("usage: tasks list | add <title> [low|normal|high] | done <id>\n", &())
  return 2
}
```

The parameter's type is the whole failure row of `execute`. Each arm matches one member by its type. `LogError held` binds the value as it is. If logging itself failed, there is nothing sensible to print, so the handler fails again with the same value and leaves it to `main`. See **Patterns and match** in the reference for type patterns.

`Effect.catchAll(e, handler)` wraps an effect with a handler. On success, you get the effect's value. On failure, you get whatever the handler returns, here an exit code. Either way the result is an `i32`, and the only failure left is the handler's own `LogError`.

It is natural to write this as a pipeline, like `provideMut`. Here is that idea in a small program:

```silk
import silk.effect { Effect }

struct Unknown<'text> { name: string<'text> }

effect fn parse<'text>(word: string<'text>) -> i32 ! Unknown<'text> {
  if word == "list" {
    return 0
  }
  fail Unknown { name: word }
}

effect fn explain<'text>(error: Unknown<'text>) -> i32 {
  drop error
  return 2
}

pub fn main() -> i32 {
  return run parse("frobnicate") |> Effect.catchAll(explain)
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
src/main.silk:18:37: error[SEM0099] One named type parameter left undetermined by an explicit prefix and the arguments
Failed scratch in 0.15s
```

SEM0099 says a type parameter was left undetermined. The handler is generic over `'text`, and in the pipeline form the compiler can't work out which lifetime to use. Pass both arguments directly and it can:

```silk
pub fn main() -> i32 {
  return run Effect.catchAll(parse("frobnicate"), explain)
}
```

This version runs and exits with status 2. Handlers without lifetime parameters work fine in a pipeline. For generic ones like `explain`, call `Effect.catchAll` directly.

Notice also that `main` here is a plain `fn` that uses `run`. That is allowed once every failure is handled, because then there is nothing left that could escape.

## Cleanup that always runs

Users may be surprised that `add` and `done` are forgotten. Until chapter 8, `tasks` should say so after every command, whether it worked or not. `Effect.ensuring(e, finalizer)` runs the finalizer after `e`, on success and on failure, and then passes on `e`'s outcome unchanged.

The obvious finalizer is a log line:

```silk
  let guarded = Effect.ensuring(execute(&words), Effect.log("(nothing is saved yet)\n", &()))
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.18s
[x86_64-unknown-linux-gnu]
src/main.silk:390:17: error[SEM0052] A generic call whose type arguments its values do not determine
Failed tasks in 0.24s
```

SEM0052 says the compiler found no type arguments for `ensuring` that fit the values you passed. The value that doesn't fit is the finalizer: `ensuring` wants one whose failure row is `never`. A finalizer must not fail. If it could, which failure would win, the command's or the cleanup's? `Effect.log` can fail with `LogError`, so it isn't allowed as is. Handle its failure first, inside the finalizer:

```silk
// A finalizer runs whether the command succeeded or failed. It must not fail itself.
effect fn reminder() -> () ? &mut Logger {
  run Effect.log("(nothing is saved yet)\n", &())
    |> Effect.catchAll(ignoreLogError)
}

effect fn ignoreLogError(error: LogError) -> () {
  drop error
}
```

`reminder` has no failure row, so it can't fail. It still needs a `Logger`.

## Wiring main

`main` reads the words, then builds the whole program as one value, layer by layer, and runs it once:

```silk
pub effect fn main() -> i32
! LogError | HostInputError | OutOfMemoryError
? &mut HostInput {
  let mut logger = StdoutLogger.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  let words = Words {
    command: run wordAt(1) |> Effect.provideMut<Allocator>(&mut allocator),
    first: run wordAt(2) |> Effect.provideMut<Allocator>(&mut allocator),
    second: run wordAt(3) |> Effect.provideMut<Allocator>(&mut allocator),
  }
  let guarded = Effect.ensuring(execute(&words), reminder())
  let handled = Effect.catchAll(move guarded, explain)
  return run move handled |> Effect.provideMut<Logger>(&mut logger)
}
```

Index 0 is the program's own name, so the words start at 1. `main` asks for `? &mut HostInput`, and the runtime provides it; that is the one requirement `main` may have. The returned `i32` becomes the exit status.

Then come three layers. `execute(&words)` describes the command. `ensuring` adds the reminder. `catchAll` adds the handler. Nothing has happened yet. The single `run` at the end performs it all, with the logger provided. The combinators consume the effect they wrap, so you pass the stored ones with `move`.

The imports have grown:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.equal { Equal }
import silk.format { Display, Format, Formatter }
import silk.host_input { HostInput, HostInputError }
import silk.logger { Logger, LogError }
import silk.option { Option }
import silk.order { Order, Ordering }
import silk.os_logger { StdoutLogger }
import silk.ownership { Copy }
import silk.result { Result }
import silk.string { String, InvalidUtf8 }
import silk.writer { Writer, WriterError }
```

## Run it

Arguments after `--` go to the program:

```sh
silk run -- list
```

```
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
(nothing is saved yet)
```

To save typing, run the built binary through an alias:

```sh
alias tasks=./build/llvm/x86_64-unknown-linux-gnu/debug/tasks
tasks add 'Call the plumber' high
tasks done 2
```

```
added #4
(nothing is saved yet)
finished #2
(nothing is saved yet)
```

Both exit with status 0. Now the mistakes. `echo $?` prints the exit status:

```sh
tasks done 9; echo $?
```

```
(nothing is saved yet)
there is no task #9
1
```

```sh
tasks frobnicate; echo $?
```

```
(nothing is saved yet)
unknown command 'frobnicate'
usage: tasks list | add <title> [low|normal|high] | done <id>
2
```

`tasks add`, `tasks add 'Fix the bike' urgent` and `tasks done two` all print the reminder and the usage line, and exit with status 2.

Look at the order of the lines on failure. The reminder comes first, then the message. That follows from how `main` stacked the layers. `ensuring` is the inner layer, so its finalizer runs as the failure leaves `execute`. Only then does the failure reach `explain` in the outer layer. Swap the two layers and the order would swap too. Because effects are values you compose, the order of cleanup and handling is something you can read off the code.

## Failures as data

A handler decides what a failure means for the whole program. Sometimes you want to decide on the spot instead, right where the effect runs. `Effect.result(e)` runs `e` and never fails. It gives you a `Result` holding either the value or the failure:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }
import silk.result { Result }

struct NoSuchTask {
  id: u32,
}

effect fn complete(id: u32) -> u32
  ! NoSuchTask {
  if id > 3 {
    fail NoSuchTask { id: id }
  }
  return id
}

effect fn report(id: u32) -> ()
  ! LogError
  ? &mut Logger {
  let outcome = run Effect.result(complete(id))
  match move outcome {
    Result<u32, NoSuchTask>.Success { value } => {
      run Effect.log("finished #{id}\n", &.{ id: value })
    }
    Result<u32, NoSuchTask>.Failure { error } => {
      run Effect.log("no task #{id}, carrying on\n", &.{ id: error.id })
    }
  }
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  run report(2) |> Effect.provideMut(&mut logger)
  run report(9) |> Effect.provideMut(&mut logger)
}
```

```sh
silk run
```

```
finished #2
no task #9, carrying on
```

`report` doesn't list `NoSuchTask` in its row, because the failure became data before it could escape. Use `result` when the caller has a real alternative, and a handler like `explain` when a failure should end the work. See **Typed failures** in the reference for `catch`, which handles a single member of a row, and for `mapError` and `retry`.

## Summary

- You know why Silk has effects: an `effect fn` signature lists its success type, its failures after `!` and its requirements after `?`, and the compiler checks all three.
- You know that calling an effect function only builds a value, and that `run` performs it. SEM0087 catches an effect you forgot to run.
- You can define failure types, raise them with `fail`, and let them travel through `run`. SEM0066 tells you when one is neither declared nor handled.
- You can handle failures with `Effect.catchAll` and a handler, or turn them into data with `Effect.result`.
- You can attach cleanup with `Effect.ensuring`, whose finalizer must not fail.
- You can read command-line arguments through `HostInput` and return an exit status from `main`.

Chapter 8 makes the board last between runs, by saving it to a file through the `FileSystem` service, and shows how to write providers of your own.
