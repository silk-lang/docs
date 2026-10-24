# 12. Modules, packages and tests

`tasks` does a lot now: it lists, adds, finishes, reminds, exports and reports its own build. All of it lives in one `main.silk` of about 1,100 lines. In this chapter you split that file into modules, and then into two packages: a library called `taskcore` that knows about tasks and the file format, and the `tasks` program that uses it. A workspace holds both, so one command can check or test them together. Along the way you learn what `pub` really controls, how tests are found, and a few traps in this release's tooling.

## Why split at all

One big file worked well while you were learning. It stops working when you want to find things, test parts on their own, or share code with a second program.

The board and the file format have nothing to do with the command line. A future web page, or a tool that cleans up old tasks, would want them too. So the plan is:

- **`taskcore`**, a library: tasks, titles, the board and the `tasks.txt` format.
- **`tasks`**, the program: argument parsing, output, export, reminders, `main` and the tests that need fake providers.

Here is where everything ends up. The two package folders sit side by side in a workspace folder, `tasks-workspace`, which has a `silk.toml` of its own.

```sh
find . -name '*.silk' -o -name silk.toml | sort
```

```
./silk.toml
./taskcore/silk.toml
./taskcore/src/Board.silk
./taskcore/src/Store.silk
./taskcore/src/Task.silk
./taskcore/src/Text.silk
./taskcore/src/lib.silk
./tasks/silk.toml
./tasks/src/Export.silk
./tasks/src/Remind.silk
./tasks/src/cli/Command.silk
./tasks/src/cli/Show.silk
./tasks/src/main.silk
./tasks/src/tests.silk
./tasks/src/tests/Fakes.silk
```

## A workspace for two packages

A package is a folder with a `silk.toml`. Until now `tasks` was the only one. Two packages that grow together are easier to handle in a *workspace*: a folder whose `silk.toml` lists its member packages. You can still work inside each package as before, and you can also check, build and test all of them from the top.

`silk init` makes the workspace too. From the folder that holds `tasks`:

```sh
silk init --workspace tasks-workspace
```

```
Initialized Silk workspace at /home/you/tasks-workspace
```

It writes a `.gitignore` for `build/` and a manifest with no members yet:

```
[workspace]
members = []
```

Move `tasks` in, then add it to `members` in `tasks-workspace/silk.toml`. `silk init` will not touch a package that already exists, so this one edit is by hand:

```sh
mv tasks tasks-workspace/
```

```
[workspace]
members = ["tasks"]
```

Now create the library. `--lib` asks for a library package instead of a program, and running it inside the workspace adds the new package to `members` for you:

```sh
cd tasks-workspace
silk init --lib taskcore
```

```
Initialized Silk project taskcore at /home/you/tasks-workspace/taskcore
Added taskcore to the workspace members in /home/you/tasks-workspace/silk.toml
```

```
[workspace]
members = ["tasks", "taskcore"]
```

The new package has a `silk.toml` and one source file, `src/lib.silk`, with a function and a test. It gets no `.gitignore` of its own: the workspace's `.gitignore` already covers the shared `build` folder.

```silk
import silk.testing { AssertionError, Testing }

/// The sum of `left` and `right`.
pub fn add(left: i32, right: i32) -> i32 {
  return left + right
}

test effect fn addsTwoNumbers() -> ()
  ! AssertionError<'static> {
  run Testing.expect(add(2, 3) == 5, "2 + 3 is 5")
}
```

From the workspace root, `-p` (short for `--package`) picks one member to work on:

```sh
silk test -p taskcore
```

```
Package taskcore (/home/you/tasks-workspace/taskcore)
  lib::addsTwoNumbers
    PASS  1 us

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 1 discovered)
Time   47 us
Workspace summary: 1 package succeeded, 0 failed
```

The library works before it holds anything of yours. The rest of this chapter fills `taskcore` with the board code.

## Modules are files

In Silk, every `.silk` file is a module, and its path is its name. `src/Export.silk` is the module `Export`. `src/cli/Command.silk` is `cli.Command`: folders become dots. There is no separate module declaration to keep in sync.

You import a module by that path, and pick the names you want in braces:

```silk
import cli.Command { Command, UnknownCommand, UsageError, Words, parseCommand }
import cli.Show { showBoard, showVersion }
import Export { exportBoard }
import Remind { MILLISECOND, remindTasks }
```

These are the same braces you have used for the standard library since chapter 1. `silk.effect` is just a module of the package `silk`.

Because the name is the path, it must match the file exactly, capital letters included. Here is `main.silk` with `cli.command` instead of `cli.Command`:

```silk
import cli.command { Command, UnknownCommand, UsageError, Words, parseCommand }
```

```sh
silk check -p tasks
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     79 modules, 7 in package          0.07s
  check    failed: 8 modules, 1 error        0.74s
[x86_64-unknown-linux-gnu]
tasks/src/main.silk:21:8: error[MOD0001] Unknown module cli.command
Failed tasks in 0.81s
Failed 1 of 1 package in 0.85s
```

The `load` row counts every module the build read: the seven of `tasks` itself and the standard library modules they import. When a command covers members of a workspace, a last line counts the packages that finished or failed.

MOD0001 says the module does not exist and prints the path it looked for, `cli.command`. Column 8 points at that path, which is the part to fix.

## `pub`: what a module shows

Everything in a module is private to that module unless you mark it `pub`. That goes for functions, types, constants, and also for each field. While `tasks` was one file, nothing was ever "outside", so you never needed `pub`. Now you do.

Here is the start of `taskcore/src/Task.silk`:

```silk
pub enum Priority {
  Low,
  Normal,
  High,
}
```

```silk
pub tuple TaskId(u32)

impl Copy for TaskId {}
```

```silk
pub union Status {
  Open,
  // When the task was finished, in seconds since 1970 (from the SystemClock).
  Done { pub at: i64 },
}

pub struct Task<'text> {
  pub id: TaskId
  pub title: string<'text>
  pub priority: Priority
  pub status: Status
}

impl<'text> Task<'text> {
  pub fn isOpen(self: &Self) -> bool {
    return match &self.status {
      Status.Open => true
      Status.Done { .. } => false
    }
  }
}
```

There are four layers of `pub` here:

- `pub struct Task` makes the type nameable elsewhere.
- `pub id`, `pub title` and so on make each field readable and writable elsewhere.
- `pub fn isOpen` makes the method callable elsewhere.
- `Done { pub at: i64 }` makes a union variant's field visible. The variants themselves follow the union.

Impls such as `impl Copy for TaskId` carry no `pub`. Other modules can use an impl whenever they can see its type.

The privacy boundary is the module, not the package. That matters, because `Board.silk` and `Store.silk` are in the same package as `Task.silk` but are still "elsewhere". To see it, drop the `pub` from `at`:

```silk
  Done { at: i64 },
```

```sh
silk check -p taskcore
```

```
Checking taskcore (x86_64-unknown-linux-gnu)
  load     47 modules, 5 in package          0.06s
  check    failed: 5 modules, 2 errors       0.19s
[x86_64-unknown-linux-gnu]
taskcore/src/Board.silk:52:23: error[SEM0021] Constructing a struct at a site where its raw constructor is not available
taskcore/src/Store.silk:119:21: error[SEM0028] A field projection naming a private field of another module's struct
Failed taskcore in 0.25s
Failed 1 of 1 package in 0.26s
```

The messages talk about structs, because a union variant with fields is built and read like one. SEM0021, in `Board.silk`, is about building a value: `Status.Done { at: at }` needs every field to be visible, and `at` is not. SEM0028, in `Store.silk`, is about reading: the pattern `Status.Done { at } => at` binds a private field. Put the `pub` back and both go away.

Private is still useful. In `Remind.silk`, the struct `Reminder { id: TaskId delay: u64 }` keeps its fields private. Only `Remind` makes reminders, so no other module needs to see inside one. See **Structs, tuples and arrays** and **Enums and unions** in the reference for the full visibility rules.

## A library package

Here is the manifest that `silk init --lib` wrote, `taskcore/silk.toml`, after one change:

```
[package]
name = "taskcore"
version = "0.1.0"
silk-version = "0.1.0"
kind = "library"
exports = ["Board", "Task", "Text", "Store"]
```

Two lines deserve a closer look:

- `kind = "library"` says this package is Silk source for other packages, not a program. `silk build` checks it and makes no file of its own. Its root module, where the package starts, is `src/lib.silk`, since a library has no `main`. Module paths are relative to `src`, so `src/Board.silk` is the module `Board`.
- `exports` lists the modules that other packages may import. The rest stay internal to `taskcore`.

The change is `exports`. The generated manifest said `exports = ["lib"]`, because `add` lived in `lib`. Now the board code lives in `Board.silk`, `Store.silk`, `Task.silk` and `Text.silk`, so those are the modules to export. The example `add` and its test go, and `lib.silk` keeps only a comment:

```silk
//! taskcore: the task board and its file format, shared by the `tasks` program
//! and anything else that wants to read a tasks file.
//!
//! Users import the modules directly: `import taskcore.Board`.
```

The root doesn't need to import anything. `silk check`, `silk build` and `silk test` look at every module listed in `exports`, whether the root reaches it or not. To see that, add an obvious type error to `Store.silk`:

```silk
fn broken() -> i32 {
  return true
}
```

```sh
silk check -p taskcore
```

```
Checking taskcore (x86_64-unknown-linux-gnu)
  load     47 modules, 5 in package          0.05s
  check    failed: 5 modules, 1 error        0.77s
[x86_64-unknown-linux-gnu]
taskcore/src/Store.silk:187:10: error[SEM0129] Return expected i32 but received bool
Failed taskcore in 0.83s
Failed 1 of 1 package in 0.84s
```

`silk test` stops on the same line and runs nothing. A mistake in an exported module can't hide, and neither can its tests. Take `broken` out again.

The list itself has to be right. An entry that names no module is refused before anything compiles. Misspell `"Store"` as `"Stores"` and check:

```
Checking taskcore (x86_64-unknown-linux-gnu)
  load     failed: 1 error                   0.00s
silk: invalid exports of taskcore@0.1.0: Stores is not a module of the package
Failed taskcore in 0.00s
Failed 1 of 1 package in 0.00s
```

Fix the spelling. With that in place, build the library on its own:

```sh
cd taskcore
silk build
```

```
Checking taskcore (x86_64-unknown-linux-gnu)
  load     47 modules, 5 in package          0.05s
  check    5 modules                         0.67s
  borrow   191 bodies                        0.01s
Finished taskcore in 0.74s
```

The first line says `Checking`, not `Compiling`, and no file is made. A `library` is Silk source for other packages, so there is nothing to link: the program that depends on `taskcore` compiles its source along with its own. What the library build tells you is that the package is sound on its own.

## Depending on `taskcore`

The program says where to find the library in its own manifest. Being in the same workspace is not enough: a member only sees the packages it depends on. `silk add` records the dependency for you. Give it the path to the library's folder:

```sh
cd ../tasks
silk add ../taskcore
```

```
Added dependency taskcore = { path = "../taskcore" } to /home/you/tasks-workspace/tasks/silk.toml
```

`silk add` reads the library's manifest first, so a wrong path or a dependency cycle is refused before anything is written. `silk remove taskcore` takes the line out again, and the table too once it is empty. Here is `tasks/silk.toml` now. `silk add` puts the new `[dependencies]` table right after `[package]`; the bindings and profile come from chapter 11:

```
[package]
name = "tasks"
version = "0.1.0"
silk-version = "0.1.0"

[dependencies]
taskcore = { path = "../taskcore" }

[[build.bindings]]
package = "tasks@0.1.0"
module = "main"
parameter = "remindBudgetMs"
value = { kind = "integer", value = "300" }
origin = { source = "silk.toml", provenance = "literal" }

[profiles.demo]
target = "x86_64-unknown-linux-gnu"

[[profiles.demo.bindings]]
package = "tasks@0.1.0"
module = "main"
parameter = "fileName"
value = { kind = "string", value = "/demo-tasks.txt" }
origin = { source = "silk.toml", provenance = "literal" }
```

`path` is relative to the manifest. Now the program imports the library's modules with the package name in front:

```silk
import taskcore.Board { Board, DuplicateTask, NoSuchTask }
import taskcore.Store { CorruptFile, fileText, parseBoard, render }
import taskcore.Task { Draft, TaskId }
```

The other modules of `tasks` do the same. `cli/Show.silk` needs `import taskcore.Board { Board, OpenTasks, count }`, `Remind.silk` needs `Priority` and `TaskId`, and so on. Each module imports only what it uses.

### Crossing the line

Package boundaries add two checks on top of module privacy. First, a name you import must be `pub`. Suppose `fileText` in `Store.silk` loses its `pub`:

```silk
effect fn fileText(bytes: &Bytes) -> string ! CorruptFile {
```

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     78 modules, 7 in package          0.09s
  check    failed: 8 modules, 1 error        1.67s
[x86_64-unknown-linux-gnu]
tasks/src/main.silk:19:38: error[SEM0015] An import or qualified reference naming a private member of another module
Failed tasks in 1.76s
```

Line 19, column 38 is `fileText` in the import of `taskcore.Store`. SEM0015 means the name exists but is private.

Second, the module itself must be in `exports`. Add a `Secret.silk` to `taskcore` with a public function, but leave it out of `exports`. Then try to use it from the program:

```silk
import taskcore.Secret { salt }
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     79 modules, 7 in package          0.07s
  check    failed: 8 modules, 1 error        5.39s
[x86_64-unknown-linux-gnu]
tasks/src/main.silk:27:8: error[MOD0003] Module Secret is not exported by package taskcore@0.1.0
Failed tasks in 5.46s
```

This one has a clear message. `pub` decides what a module shows to other modules. `exports` decides which modules a package shows to other packages. You need both.

### When names collide

Sometimes you want a module and a name from it at once. `taskcore.Board` is a module, and `Board` is a struct inside it. Importing both with the same spelling looks harmless:

```silk
import taskcore.Board
import taskcore.Board { Board, DuplicateTask, NoSuchTask }
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     78 modules, 7 in package          0.09s
  check    failed: 8 modules, 1 error        1.56s
[x86_64-unknown-linux-gnu]
tasks/src/main.silk:19:25: error[SEM0016] Multiple bindings claim Board
  note: tasks/src/main.silk:18:17: related location
Failed tasks in 1.65s
```

SEM0016 is a binding conflict: the name `Board` is bound twice, once to the module and once to the struct. The error points at the second binding, the struct in the second import, and the note points at the first, the module. Give the module another name with `as`:

```silk
import taskcore.Board as Boards
import taskcore.Board { Board, DuplicateTask, NoSuchTask }

fn openCount(board: &Board) -> i32 {
  return Boards.count(board, &Boards.OpenTasks {})
}
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     78 modules, 7 in package          0.08s
  check    8 modules                         5.37s
  borrow   826 bodies                        0.07s
Finished tasks in 5.46s
```

`as` works for single names too. You will meet it in the next chapter, where three standard library modules each export a type called `Limits`.

## Package parameters stay in the root

In chapter 11, `fileName` and `remindBudgetMs` were package parameters, and any function could read them. That was easy when every function lived in the root module. Package parameters are only read from the root module of the package being built, which for `tasks` is `main`. So the parameters stay in `main.silk`:

```silk
pub param fileName: string = "/tasks.txt"
pub param remindBudgetMs: u32 = 250 where remindBudgetMs > 0 && remindBudgetMs <= 60000
```

Declaring one in another module is an error once you use it. Suppose you add a bar width parameter to `cli/Show.silk`, just below its imports:

```silk
pub param barWidth: usize = 20
```

and draw the bar with `run bar(barWidth, done, total)`:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     78 modules, 7 in package          0.09s
  check    failed: 8 modules, 1 error        3.50s
[x86_64-unknown-linux-gnu]
tasks/src/cli/Show.silk:11:1: error[SEM0214] Invalid compilation configuration: package parameter `barWidth` is not declared in the root package's root module, the only module that may declare `param`
Failed tasks in 3.59s
```

It is the SEM0214 from chapter 11, and this time the message gives the reason: the parameter is outside the root module. Line 11 is the `param` declaration itself, not the line that reads it.

Instead, the functions that used the parameters now take them as arguments, and `main` passes them in. `showVersion` gained two parameters:

```silk
pub effect fn showVersion(file: string, budgetMs: u32) -> () ! LogError ? &mut Logger {
  run Effect.log("tasks 0.12 ({platform}, {build} build)\n", &.{ platform: PLATFORM, build: buildKind() })
  run Effect.log("tasks file {file}, reminders wait {ms}ms\n", &.{ file: file, ms: budgetMs })
}
```

So did `parseCommand`, which needs the default reminder budget:

```silk
pub effect fn parseCommand<'text>(words: &'text Words, defaultBudget: u64) -> Command<'text> ! UsageError | UnknownCommand<'text> {
```

`execute` in `main.silk` reads the parameters and hands them down:

```silk
  let command = run parseCommand(words, u32.toU64(remindBudgetMs) * MILLISECOND)
```

```silk
    Command.Version => {
      run showVersion(fileName, remindBudgetMs)
    }
```

This is better design anyway. `cli.Show` and `cli.Command` no longer depend on how the program is configured, so a test can call them with any values. See **Package parameters** in the reference.

Build and run the program. Nothing should look different, apart from the version number and where the program ends up:

```sh
silk build
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     78 modules, 7 in package          0.09s
  check    7 modules                         4.49s
  codegen  4,312 functions                   2.06s
  borrow   845 bodies                        0.08s
  link     clang                             1.00s
Finished /home/you/tasks-workspace/build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 7.85s
```

The program now lives in the workspace's shared `build` folder, so from `tasks/` you start it as `../build/...`. The old `tasks/build` folder from earlier chapters is no longer used, and you can delete it.

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Buy milk'
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Write the Silk book' high
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks add 'Water the plants' low
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks done 1
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks list
```

```
added #1
added #2
added #3
finished #1
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
[x] #1 Buy milk (normal, done today)
2 open [######--------------]
```

```sh
../build/llvm/x86_64-unknown-linux-gnu/debug/tasks version
```

```
tasks 0.12 (linux, debug build)
tasks file /tasks.txt, reminders wait 300ms
```

The binding of 300 ms from `silk.toml` still reaches `main`, and `main` passes it to `showVersion`.

## Tests, and a deliberate cycle

Tests move with the code they test. `taskcore` has four: one in `Text`, one in `Board` and two in `Store`. They need nothing from the program. Here is the one in `Text.silk`:

```silk
test effect fn partCutsTheTitle() ! AssertionError<'static> {
  run Testing.expect(part("x|n|Buy milk", 4, 12) == "Buy milk", "the title follows the two markers")
  run Testing.expect(part("x|n|", 4, 4) == "", "an empty stretch gives empty text")
}
```

The program's tests need `execute` and `explain` from `main`, plus the fake providers. The fakes (`FixedClock`, `VirtualClock`, `MemoryFiles`, `sameBytes` and `wordsOf`) move to `tests/Fakes.silk`, so the module is `tests.Fakes`. The tests stay in `tests.silk`, which starts like this:

```silk
import taskcore.Board { Board, DuplicateTask, NoSuchTask, count }
import taskcore.Task { Draft, Priority }
import main { execute, explain }
import Remind { MILLISECOND, runReminders }
import tests.Fakes { FixedClock, MemoryFiles, VirtualClock, sameBytes, wordsOf }
```

A program has no `exports`, so `silk test` finds its tests the same way `silk check` finds errors: by following imports from the root. So `main.silk` has to import `tests`:

```silk
// Only for `silk test`: the tests module imports this one back.
import tests
```

Now `main` imports `tests` and `tests` imports `main`. That is an import cycle, and Silk allows it. Modules in one package can refer to each other in any direction. Note that a `tests` module next to a `tests/` folder is fine: `tests` is `src/tests.silk`, and `tests.Fakes` is `src/tests/Fakes.silk`.

### Running them

Run the library's tests from `taskcore/`:

```sh
cd ../taskcore
silk test
```

```
  Board::duplicateTitlesAreRefused
    PASS  21 us
  Store::damagedLinesAreReported
    PASS  5 us
  Store::fileFormatRoundTrips
    PASS  27 us
  Text::partCutsTheTitle
    PASS  1 us

Tests  4 passed, 0 failed (0 cached, 4 executed, 4 selected, 4 discovered)
Time   150 us
```

Each test is named after its module. Then the program's tests from `tasks/`:

```sh
cd ../tasks
silk test
```

```
  tests::finishingRecordsTheClockTime
    PASS  96 us
  tests::slowRemindersAreCancelled
    PASS  165 us
  tests::unknownTaskIsReported
    PASS  15 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   384 us
```

Notice that the library's tests are not run again here. Each package tests its own modules.

`--filter` runs only the tests whose names contain some text:

```sh
silk test --filter Reminders
```

```
  tests::slowRemindersAreCancelled
    PASS  231 us

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 3 discovered)
Time   298 us
```

The text is matched against the name as it is printed, module included. So from `taskcore/`, `--filter Store::` picks out the tests of one module:

```sh
cd ../taskcore
silk test --filter Store::
```

```
  Store::damagedLinesAreReported
    PASS  8 us
  Store::fileFormatRoundTrips
    PASS  36 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 4 discovered)
Time   91 us
```

### The whole workspace at once

Changing to each folder in turn gets old quickly. `--workspace` runs every member, one after the other:

```sh
cd ..
silk test --workspace
```

```
Package taskcore (/home/you/tasks-workspace/taskcore)
  Board::duplicateTitlesAreRefused
    PASS  15 us
  Store::damagedLinesAreReported
    PASS  5 us
  Store::fileFormatRoundTrips
    PASS  28 us
  Text::partCutsTheTitle
    PASS  1 us

Tests  4 passed, 0 failed (0 cached, 4 executed, 4 selected, 4 discovered)
Time   125 us
Package tasks (/home/you/tasks-workspace/tasks)
  tests::finishingRecordsTheClockTime
    PASS  83 us
  tests::slowRemindersAreCancelled
    PASS  161 us
  tests::unknownTaskIsReported
    PASS  14 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   358 us
Workspace summary: 2 packages succeeded, 0 failed
```

Each package gets a `Package` heading and its usual report. The order follows the dependencies, not `members`: `taskcore` comes first because `tasks` depends on it. The last line counts packages, not tests. If any test fails, that package counts as failed and the command exits with status 1.

At the workspace root, plain `silk test` means the same thing, because the root manifest has no package of its own. `--workspace` is useful from inside a member, where it still runs them all. `silk check` and `silk build` take the same options.

`silk run` works at the root too. It builds and runs the workspace's only program, `tasks`:

```sh
silk run version
```

```
tasks 0.12 (linux, debug build)
tasks file /tasks.txt, reminders wait 300ms
```

The program runs in the folder you are in, though, so from the root it reads and writes a `tasks.txt` next to the workspace's `silk.toml`, not the one in `tasks/`. This chapter keeps running the board from `tasks/`.

To run just one member, name it with `-p`, as you did for the new library. You can repeat `-p` to pick several. A name that is not a member is refused, with the list of names that are:

```sh
silk test -p taskscore
```

```
silk: the workspace at /home/you/tasks-workspace/silk.toml has no package named `taskscore`
silk: its members are: taskcore, tasks
```

### When a test fails

It helps to know what a failure looks like before you need it. Go back to `tasks/` and change the reminder test to expect three reminders instead of two:

```silk
  run Testing.expect(fired.count == 3, "all three reminders went off")
```

```sh
cd tasks
silk test
```

```
  tests::finishingRecordsTheClockTime
    PASS  101 us
  tests::slowRemindersAreCancelled
    assertion failed: all three reminders went off
    FAIL  193 us
  tests::unknownTaskIsReported
    PASS  15 us

Tests  2 passed, 1 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   395 us
```

The run exits with status 1. The line under the test's name is the message you passed to `expect`. A failed `Testing.expect` is a typed failure, `AssertionError`, and the message is the whole report, so write it as the fact you expect. Change the 3 back to 2.

## Formatting

`silk format --check` reports files whose layout differs from the standard style, without changing them. At the workspace root it covers every member:

```sh
cd ..
silk format --check
```

```
/home/you/tasks-workspace/taskcore/src/Board.silk: needs formatting
/home/you/tasks-workspace/taskcore/src/Store.silk: needs formatting
/home/you/tasks-workspace/taskcore/src/Task.silk: needs formatting
/home/you/tasks-workspace/taskcore/src/Text.silk: needs formatting
/home/you/tasks-workspace/taskcore/src/lib.silk: unchanged
/home/you/tasks-workspace/tasks/src/Export.silk: needs formatting
/home/you/tasks-workspace/tasks/src/Remind.silk: needs formatting
/home/you/tasks-workspace/tasks/src/cli/Command.silk: needs formatting
/home/you/tasks-workspace/tasks/src/cli/Show.silk: needs formatting
/home/you/tasks-workspace/tasks/src/main.silk: needs formatting
/home/you/tasks-workspace/tasks/src/tests.silk: needs formatting
/home/you/tasks-workspace/tasks/src/tests/Fakes.silk: needs formatting
```

A file that is already tidy is listed as `unchanged`. Inside a package folder, the same command checks only that package. It exits with status 1 when any file needs work, which makes it useful in CI.

Plain `silk format` rewrites the files in place. Nearly every file is listed because the code in this book keeps the layout it grew with: the standard style splits long signatures before `!` and `?`, joins a struct literal onto one line when it fits, and gives each field of a struct declaration its own line. Run `silk format` in your own copy if you like that style. It changes only layout, so `silk check` and `silk test --workspace` still pass afterwards, and a second `silk format --check` lists every file as `unchanged`.

## Summary

- A file is a module, named by its path: `src/cli/Command.silk` is `cli.Command`.
- Everything is private to its module until marked `pub`, including struct fields and union variant fields.
- `silk init --workspace` makes a workspace, and `silk init --lib` inside it adds a library package to `members`.
- A library package sets `kind = "library"` and names its `exports`. Check, build and test cover every exported module, and an entry that names no module is refused.
- `silk add ../taskcore` writes the `[dependencies]` entry, and the program imports `taskcore.Module { ... }`. Use `as` when a module and a name collide.
- Package parameters live in the root module; pass their values to other modules as arguments.
- `silk test` runs a package's tests, `--workspace` and `-p` choose packages from one place, `--filter` narrows the tests by their `module::name`, and modules may import each other in a cycle.

The next chapter turns `tasks` into an HTTP service that runs the same `execute` for every request.
