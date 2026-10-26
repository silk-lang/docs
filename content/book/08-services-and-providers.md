# 8. Services and providers

At the end of chapter 7, `tasks` could list, add and finish tasks, and it reported mistakes as typed failures. But every run started from the same seed, and nothing was saved. This chapter gives the program a memory: it keeps the board in `tasks.txt`, stamps finished tasks with the real time, and tells you when the file is damaged. Along the way you will meet services, the second half of an effect's signature, and you will test the whole program without touching the disk.

## What the program needs from the world

Saving a file and reading the clock are not things a function can do on its own. Something outside the program has to do them. In Silk that something is a *service*: a named set of operations that an effect asks for and a caller supplies.

You already use one. `Effect.log` needs a `Logger`, and every function that logs says so with `? &mut Logger`. The `!` row after the return type lists how a function can fail. The `?` row lists what it needs.

This chapter adds three more services from the standard library:

- `FileSystem` from `silk/filesystem`, to read and write `tasks.txt`.
- `SystemClock` from `silk/system_clock`, to learn the time of day.
- `Allocator` from `silk/allocator`, because reading a file creates a new `Bytes` value, and that needs memory.

Here is where the program ends up. `execute` is the whole program in one effect, and its signature says exactly what it touches:

```silk
// The whole program. It needs four services; it does not care which providers supply them.
effect fn execute<'text>(words: &'text Words) -> i32
! LogError | UsageError | UnknownCommand<'text> | BoardFull | NoSuchTask | CorruptFile
| FileError | OutOfMemoryError
? &mut Logger | &mut FileSystem | &mut SystemClock | &mut Allocator {
  let path = run Path.make(FILE)
  let saved = run load(&path)
  let mut board = run parseBoard(run fileText(&saved))
  let command = run parseCommand(words)
  match move command {
    Command.List => {
      run showBoard(&board)
    }
    Command.Add { title, priority } => {
      run addTask(&mut board, Draft { title: title, priority: priority })
      run save(&path, &board)
    }
    Command.Done { id } => {
      run finishTask(&mut board, id)
      run save(&path, &board)
    }
  }
  return 0
}
```

Read the `?` row as a promise. `execute` will use a logger, a file system, a clock and an allocator, and nothing else. It does not say *which* ones. The terminal or a test buffer, the real disk or an in-memory fake: that choice belongs to whoever runs it. That is the reason services exist. The same code runs for real in `main` and against fakes in a test, without a single `if testing`.

## Telling time

Finished tasks used to record a made-up day number. Now they record seconds since 1970, which is what a clock gives you:

```silk
union Status {
  Open,
  // When the task was finished, in seconds since 1970 (from the SystemClock).
  Done { at: i64 },
}
```

`finishTask` asks the clock for the current instant. `SystemClock.now()` is a service operation: calling it builds an effect, and `run` performs it. Because it runs a clock operation, `finishTask` must list `&mut SystemClock` in its own row:

```silk
effect fn finishTask(board: &mut Board, id: TaskId) -> () ! NoSuchTask | LogError ? &mut Logger | &mut SystemClock {
  let now = run SystemClock.now()
  run board.complete(id, SystemClock.seconds(&now))
  run Effect.log("finished {id}\n", &.{ id: id })
}
```

`showBoard` reads the clock once and passes the seconds to `show`, which turns the difference into days. `show` itself only needs the logger, since it gets the time as a plain number:

```silk
const DAY: i64 = 86400

effect fn show(task: &Task, now: i64) -> () ! LogError ? &mut Logger {
  match &task.status {
    Status.Open => {
      run Effect.log("[ ] {id} {title} ({priority})\n", &.{
        id: task.id,
        title: task.title,
        priority: task.priority,
      })
    }
    Status.Done { at } => {
      let days = (now - at) / DAY
      if days == 0 {
        run Effect.log("[x] {id} {title} ({priority}, done today)\n", &.{
          id: task.id,
          title: task.title,
          priority: task.priority,
        })
      } else {
        run Effect.log("[x] {id} {title} ({priority}, done {days} days ago)\n", &.{
          id: task.id,
          title: task.title,
          priority: task.priority,
          days: days,
        })
      }
    }
  }
}

effect fn showBoard(board: &Board) -> () ! LogError ? &mut Logger | &mut SystemClock {
  let now = run SystemClock.now()
  let mut index: usize = 0
  while index < board.count {
    run show(&board.tasks[index], SystemClock.seconds(&now))
    index = index + 1
  }
  run Effect.log("{open} open\n", &.{ open: count(board, &OpenTasks {}) })
}
```

Notice how requirements travel. `show` needs a logger. `showBoard` runs `show`, so it needs one too, plus the clock. `execute` runs `showBoard`, so it collects both. Each function declares what it runs and does not provide. Nothing is hidden, and nothing is global.

## The file format

The board lives in `tasks.txt`, one task per line, with four fields separated by `|`:

```silk
// The board lives in this file, inside the FileSystem provider's root.
const FILE: string = "/tasks.txt"

// One task per line: status byte, priority byte, finish time, title, separated by `|`.
//   x|n|1760950000|Buy milk
//    |h|0|Write the Silk book
```

The parser from chapter 5 gains the time field. `parseLine` reads one line and fails with a new typed failure, `CorruptFile`, when the line does not fit the shape:

```silk
struct CorruptFile {}

effect fn parseLine<'text>(board: &mut Board<'text>, text: string<'text>, start: usize, end: usize) -> ()
! BoardFull | NoSuchTask | CorruptFile {
  let bytes = String.utf8Bytes(text)
  if end - start < 7 || bytes[start + 1] != '|' || bytes[start + 3] != '|' {
    fail CorruptFile {}
  }
  let timeEnd = nextBar(bytes, start + 4, end)
  if timeEnd == end {
    fail CorruptFile {}
  }
  let at = match Format.i64Value(part(text, start + 4, timeEnd)) {
    Result.Success { value } => value
    Result.Failure { .. } => run corrupt()
  }
  let id = run board.add(Draft {
    title: part(text, timeEnd + 1, end),
    priority: priorityFrom(bytes[start + 2]),
  })
  if bytes[start] == 'x' {
    run board.complete(id, at)
  }
}
```

`parseLine` has no `?` row at all. Parsing is pure work on text you already have, so it needs no service. Only the code that fetches or stores the text does.

`render` goes the other way. It builds a `Bytes` buffer, which is why it needs `&mut Allocator`. It writes the digits of each timestamp by hand with a small `appendNumber` helper. You will replace that with templates in chapter 9, so it is not shown here. Note one line, though:

```silk
    let at = match &task.status {
      Status.Open => 0
      Status.Done { at } => at
    }
```

The two arms must agree on one type. The `Done` arm gives an `i64`. The plain `0` in the `Open` arm has no type of its own yet, so it takes the type of the other arm, and `at` is an `i64`.

`load` and `save` are the only functions that touch the file system:

```silk
effect fn load(path: &Path) -> Bytes
! FileError | OutOfMemoryError
? &mut FileSystem | &mut Allocator {
  if run FileSystem.exists(path) {
    return run FileSystem.readFile(path)
  }
  return Bytes.make()
}

effect fn save(path: &Path, board: &Board) -> ()
! FileError | OutOfMemoryError
? &mut FileSystem | &mut Allocator {
  let bytes = run render(board)
  run FileSystem.writeFile(path, Bytes.asSlice(&bytes))
}
```

A missing file is not an error. It is just an empty board. `fileText` turns the loaded bytes into a `string` view and fails with `CorruptFile` if they are not valid UTF-8.

Two new failures reach `explain`, so it gets two new arms. `FileError` carries a reason with a numeric code. `OutOfMemoryError` is passed on, like `LogError`:

```silk
    CorruptFile {} => {
      run Effect.log("tasks.txt is damaged; fix or delete it\n", &())
      return 1
    }
    FileError problem => {
      run Effect.log("could not read or write tasks.txt (reason {code})\n", &.{
        code: problem.reason.code,
      })
      return 1
    }
    OutOfMemoryError held => {
      fail move held
    }
```

The `SEED` constant is gone. The board now starts from whatever the file holds.

## Wiring the real providers

A service is an interface for effects. A *provider* is a value that implements it. `main` is where the program picks real providers and hands them to `execute`:

```silk
pub effect fn main() -> i32
! LogError | HostInputError | OutOfMemoryError
? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let words = Words {
    command: run wordAt(1) |> Effect.provideMut<Allocator>(&mut allocator),
    first: run wordAt(2) |> Effect.provideMut<Allocator>(&mut allocator),
    second: run wordAt(3) |> Effect.provideMut<Allocator>(&mut allocator),
  }

  // The real providers: stdout, the files under the current directory, the system clock.
  let mut logger = StdoutLogger.make()
  let here = run HostInput.workingDirectory() |> Effect.provideMut<Allocator>(&mut allocator)
  let mut files = run OsFileSystem.makeBytes(Bytes.asSlice(&here)) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut clock = OsSystemClock.make()

  let handled = Effect.catchAll(execute(&words), explain)
  return run move handled
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Read the last statement from the inside out. `Effect.catchAll(execute(&words), explain)` is an effect that still needs four services. Each `Effect.provideMut<S>(&mut p)` lends one provider exclusively and removes `S` from the row. After four of them the row is empty, and `run` can perform the whole thing. The order of the `provideMut` steps does not matter.

`OsFileSystem` from `silk/os_filesystem` is confined to a root directory. Here the root is the working directory, which `HostInput` reports. Inside the provider, `/` means that root, so `/tasks.txt` is `tasks.txt` in the directory you run the program from. The provider refuses paths that try to escape it.

`OsSystemClock` from `silk/os_system_clock` asks the operating system for the time. The new imports at the top of the file are:

```silk
import silk.allocator { Allocator, OutOfMemoryError, SystemAllocator }
import silk.filesystem { DirectoryEntry, DirectoryInfo, FileError, FileInfo, FileSystem, Path, AtomicWriteError, Durability, PublicationPolicy }
import silk.i64
import silk.list { List }
import silk.os_filesystem { OsFileSystem }
import silk.os_system_clock { OsSystemClock }
import silk.system_clock { Instant, SystemClock }
import silk.testing { AssertionError, Testing }
import silk.u8
```

Most of the `silk/filesystem` names, and `List`, are for the test fake later in the chapter.

## Run it

Start in an empty directory. Below, `tasks` is short for the built binary, `./build/llvm/x86_64-unknown-linux-gnu/debug/tasks`.

```sh
silk run -- list
```

```
0 open
```

No file yet, so no tasks. Add three and finish one:

```sh
tasks add 'Buy milk'
tasks add 'Write the Silk book' high
tasks add 'Water the plants' low
tasks done 1
tasks list
```

```
added #1
added #2
added #3
finished #1
[x] #1 Buy milk (normal, done today)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
```

Each command was a separate process, and the board survived between them. Look at the file:

```sh
cat tasks.txt
```

```
x|n|1792458780|Buy milk
 |h|0|Write the Silk book
 |l|0|Water the plants
```

The board is still a fixed array of four, and the errors still work:

```sh
tasks add 'Call the plumber'
tasks add 'Fix the bike'
tasks done 9
```

```
added #4
the board is full
there is no task #9
```

Now damage the file on purpose:

```sh
printf 'garbage\n' > tasks.txt
tasks list
```

```
tasks.txt is damaged; fix or delete it
```

The exit status is 1. `parseLine` saw a line too short to be a task and failed with `CorruptFile`, and `explain` turned that into a message.

## Forgetting a provider

What happens if `main` forgets one? Delete the `FileSystem` line from the pipeline:

```silk
  return run move handled
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
```

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     59 modules, 1 in package          0.08s
  check    failed: 2 modules, 1 error        2.33s
[x86_64-unknown-linux-gnu]
src/main.silk:539:10: error[SEM0071] This `run` needs `&mut FileSystem`, which the enclosing function does not provide; add `? &mut FileSystem` to its signature, or provide it with `|> Effect.provideMut(&mut value)`
Failed tasks in 2.41s
```

SEM0071 means "this `run` leaves a requirement that nobody provides." The location points at the `run`. The effect still needs `&mut FileSystem`, and `main` does not declare it either. Put the line back.

The same error appears in a smaller setting. Put this in your scratch project. Here a plain `pub fn main` runs an effect that needs a clock:

```silk
import silk.effect { Effect }
import silk.system_clock { SystemClock }

effect fn stamp() -> i64 ? &mut SystemClock {
  let now = run SystemClock.now()
  return SystemClock.seconds(&now)
}

pub fn main() -> i32 {
  let seconds = run stamp()
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.13s
[x86_64-unknown-linux-gnu]
src/main.silk:10:17: error[SEM0071] This `run` needs `&mut SystemClock`, which the enclosing function does not provide; add `? &mut SystemClock` to its signature, or provide it with `|> Effect.provideMut(&mut value)`
Failed scratch in 0.19s
```

A plain `fn` cannot declare a `?` row, so every effect it runs must be fully provided first. See **Services and providers** in the reference for how requirements flow.

## Two rules about providers

**`main` gets exactly one service.** When the program starts, the runtime provides `&mut HostInput` (arguments, environment, working directory) and nothing else. You might try to ask for a clock directly:

```silk
import silk.system_clock { SystemClock }

pub effect fn main() -> i32 ? &mut SystemClock {
  let now = run SystemClock.now()
  return 0
}
```

```sh
silk check
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    failed: 2 modules                 0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:3:15: error[SEM0225] Entry point `main` has a result the selected runtime cannot start; the default runtime accepts i32, (), or an Effect producing () or i32 that requires at most `&mut HostInput` and whose errors all implement `Debug`
Failed scratch in 0.18s
```

SEM0225 points at `main` and lists what the runtime can start. An effectful `main` may require `&mut HostInput` and nothing more. A `SystemClock` is something the runtime won't hand you. The fix is what `tasks` already does. Create the providers inside `main` and provide them yourself.

**Shared and exclusive access are different.** A requirement written `&mut S` needs a provider lent with `provideMut`. Lending one with `Effect.provide`, which only shares it, is not enough:

```silk
import silk.effect { Effect }
import silk.os_system_clock { OsSystemClock }
import silk.system_clock { SystemClock }

effect fn stamp() -> i64 ? &mut SystemClock {
  let now = run SystemClock.now()
  return SystemClock.seconds(&now)
}

pub fn main() -> i32 {
  let clock = OsSystemClock.make()
  let seconds = run stamp() |> Effect.provide<SystemClock>(&clock)
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.09s
[x86_64-unknown-linux-gnu]
src/main.silk:12:21: error[SEM0131] A provider whose key matches but whose access cannot satisfy the requirement
Failed scratch in 0.14s
```

SEM0131 says you lent the right service, but with too little access. Write `let mut clock` and `Effect.provideMut<SystemClock>(&mut clock)`. The same borrowing rules you learned in chapter 4 apply: a provider lent exclusively is yours again once the `run` finishes.

## A service of your own

The standard services are not special. You can declare one with `service`. Try this in your scratch project: a `Notifier` that sends reminders, with one provider that prints and one that only counts.

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

// A service is a set of operations. Code that needs it says `? &mut Notifier`.
service Notifier {
  effect fn notify(title: string) -> () ! LogError ? &mut Notifier
}

// One provider prints...
struct Printing {}

impl Notifier for Printing {
  effect fn notify(self: &mut Self, title: string) -> ()
    ! LogError {
    let mut logger = StdoutLogger.make()
    run Effect.log("reminder: {title}\n", &.{ title: title })
      |> Effect.provideMut<Logger>(&mut logger)
  }
}

// ...another only counts, which is what a test wants.
struct Counting {
  sent: i32,
}

impl Notifier for Counting {
  effect fn notify(self: &mut Self, title: string) -> ()
    ! LogError {
    self.sent = self.sent + 1
  }
}

effect fn remindAll() -> ()
  ! LogError
  ? &mut Notifier {
  run Notifier.notify("Water the plants")
  run Notifier.notify("Call the plumber")
}

pub effect fn main() -> i32
  ! LogError {
  let mut printing = Printing {}
  run remindAll() |> Effect.provideMut<Notifier>(&mut printing)
  let mut counting = Counting { sent: 0 }
  run remindAll() |> Effect.provideMut<Notifier>(&mut counting)
  return counting.sent
}
```

A service holds only signatures. Each operation names its own service in its `?` row. In the `impl`, that entry becomes the `self` parameter, so the member does not repeat it.

```sh
silk run
```

```
reminder: Water the plants
reminder: Call the plumber
```

The exit status is 2: the second run went to `Counting`, which saw two reminders and printed nothing. `remindAll` never knew the difference.

Some services are optional. Tracing or metrics, for example, should run when a caller provides them and be skipped otherwise. Write such a requirement as `? &Option<&Tracer>` and choose between the two paths with `withSome` from `silk/option`. **Services and providers** in the reference shows how.

## Testing with fake providers

That last trick is how you test `tasks`. A test should not depend on today's date or leave files on your disk. So the test gives `execute` a fixed clock and a file system that lives in memory.

The clock is short. `SystemClock` has two operations, and `FixedClock` answers both with constants:

```silk
// A clock that always says the same thing.
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

`FileSystem` is bigger: eleven operations, and an `impl` must provide all of them or the compiler reports SEM0083. `MemoryFiles` holds one file. It implements the three operations `tasks` really uses: `readFile`, `writeFile` and `stat`. (`FileSystem.exists` is a helper built on `stat`, and it treats "not found" as `false`.) The rest fail with an "unsupported" error:

```silk
// A file system that holds a single file in memory.
struct MemoryFiles {
  contents: Bytes,
  present: bool,
  allocator: SystemAllocator,
}

effect fn unsupported() -> never ! FileError {
  fail FileSystem.error(FileSystem.pathOperation(), FileSystem.unsupported())
}

effect fn missing() -> never ! FileError {
  fail FileSystem.error(FileSystem.statOperation(), FileSystem.notFound())
}

effect fn noSpace(error: OutOfMemoryError) -> () ! FileError {
  fail FileSystem.error(FileSystem.writeFileOperation(), FileSystem.noSpace())
}

impl FileSystem for MemoryFiles {
  effect fn readFile(self: &mut Self, path: &Path) -> Bytes ! FileError | OutOfMemoryError ? &mut Allocator {
    if !self.present {
      run missing()
    }
    return run Bytes.copy(Bytes.asSlice(&self.contents))
  }
  effect fn writeFile(self: &mut Self, path: &Path, bytes: &[u8]) -> () ! FileError {
    let copy = Effect.catchAll(storeCopy(&mut self.contents, bytes), noSpace)
    run move copy |> Effect.provideMut<Allocator>(&mut self.allocator)
    self.present = true
  }
  // createFile, writeFileAtomic and syncDirectory fail as unsupported.
  effect fn stat(self: &mut Self, path: &Path) -> FileInfo | DirectoryInfo ! FileError {
    if !self.present {
      run missing()
    }
    return FileSystem.fileInfo(self.contents.length())
  }
  effect fn listDirectory(self: &mut Self, path: &Path) -> List<DirectoryEntry> ! FileError | OutOfMemoryError ? &mut Allocator {
    return run unsupported()
  }
  // createDirectory, removeFile, removeDirectory and
  // createTemporaryDirectory fail as unsupported too.
}
```

Look closely at `writeFile`. Its signature, fixed by the service, has no `Allocator` in its row, yet copying the bytes needs memory. So `MemoryFiles` owns its own `SystemAllocator` and provides it inside the operation. It also has to turn `OutOfMemoryError` into a `FileError`, because that is the only failure `writeFile` may report. `noSpace` does that through `Effect.catchAll`. A provider is just code: it can create providers of its own.

`Logger.inMemoryProvider()` from `silk/logger` is the last fake. It collects lines instead of printing them, and `Logger.length` counts them.

Now the test. A `test effect fn` is an effect that the test runner performs. It fails if it fails, and `Testing.expect` from `silk/testing` fails with an `AssertionError` when its condition is false:

```silk
test effect fn finishingRecordsTheClockTime() ! AssertionError<'static> | LogError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut files = MemoryFiles { contents: Bytes.make(), present: false, allocator: Allocator.systemAllocatorProvider() }
  let mut clock = FixedClock { seconds: 1000 }
  let mut logger = Logger.inMemoryProvider()

  let add = run wordsOf(b"add", b"Buy milk", b"") |> Effect.provideMut<Allocator>(&mut allocator)
  let done = run wordsOf(b"done", b"1", b"") |> Effect.provideMut<Allocator>(&mut allocator)
  drop run Effect.catchAll(execute(&add), explain)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  drop run Effect.catchAll(execute(&done), explain)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)

  run Testing.expect(Logger.length(&logger) == 2, "two lines were logged")
  run Testing.expect(sameBytes(Bytes.asSlice(&files.contents), b"x|n|1000|Buy milk\n"), "the file records the fake time")
}
```

This is the same `execute` and the same `explain` that `main` runs. Only the providers changed. Because `provideMut` lends the providers and gives them back after `run`, the test can then look inside `files` and `logger` to check what happened. `wordsOf` builds a `Words` from byte literals, and `sameBytes` compares two byte slices. Both are short helpers in the snapshot.

The test creates every provider it needs. A test cannot have a `?` row of its own, because the test runner provides no services, and `silk check` refuses one with SEM0218.

A second test checks a failure. `Effect.result`, from chapter 7, turns the outcome into a value the test can match:

```silk
test effect fn unknownTaskIsReported() ! AssertionError<'static> | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut files = MemoryFiles { contents: Bytes.make(), present: false, allocator: Allocator.systemAllocatorProvider() }
  let mut clock = FixedClock { seconds: 1000 }
  let mut logger = Logger.inMemoryProvider()
  let done = run wordsOf(b"done", b"7", b"") |> Effect.provideMut<Allocator>(&mut allocator)
  let outcome = run Effect.result(execute(&done))
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<SystemClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let failedRight = match move outcome {
    Result.Success { .. } => false
    Result.Failure { error } => match move error {
      NoSuchTask { id } => id.0 == 7
      _ => false
    }
  }
  run Testing.expect(failedRight, "done 7 fails with NoSuchTask")
  run Testing.expect(!files.present, "nothing was written")
}
```

Run the tests:

```sh
silk test
```

```
  main::finishingRecordsTheClockTime
    PASS  56 us
  main::unknownTaskIsReported
    PASS  13 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   154 us
```

Both tests run in microseconds and touch no files.

## Summary

- A `?` row lists the services an effect needs, just as `!` lists how it fails. Requirements pass up to the caller until someone provides them.
- `Effect.provideMut<S>(&mut provider)` lends a provider and removes `S` from the row. A chain of them empties the row so `run` can go.
- `main` receives only `HostInput`. It creates `StdoutLogger`, `OsFileSystem`, `OsSystemClock` and the system allocator and provides them.
- You can declare a `service` and write providers for it with `impl Service for Type`.
- The same program runs under fake providers in a `test effect fn`, checked with `silk test`.

Chapter 9 lifts the four-task limit with a growable `List`, refuses duplicate titles with a `HashMap`, and looks at how text and memory work.
