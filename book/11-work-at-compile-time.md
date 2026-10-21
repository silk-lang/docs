# 11. Work at compile time

`tasks` can now list, add, finish and remind, and the reminders run side by side as fibers. Some of its choices are still baked in as plain constants: the file name, the default time budget. This chapter moves decisions to compile time. You will set values from `silk.toml`, pick code by target and build mode, compile one function per bar width, and generate a CSV export from a struct's fields.

## Code that runs inside the compiler

You have used one compile-time feature since chapter 2: `const`. The compiler works out a constant's value while it builds, and the program just contains the answer.

Silk takes that idea much further. Ordinary-looking Silk code can run inside the compiler, in the *static phase*, before your program exists. The results become fixed values, or decide which code is compiled at all. Three things make this useful for `tasks`:

- **Package parameters** let the build, not the source, choose a value.
- **`static if`** keeps one branch and throws the other away before type checking.
- **Reflection** lets a `static for` loop walk a struct's fields.

Everything static is deterministic. The static phase has no I/O and no effects, so the same inputs always give the same program. See **Static evaluation** in the reference for exactly what may run there.

## Package parameters

Start with the file name and the reminder budget. Replace the `FILE` constant with two parameters:

```silk
// The board lives in `fileName`, inside the FileSystem provider's root.
// Package parameters: static values the build can set from silk.toml or a profile.
pub param fileName: string = "/tasks.txt"
pub param remindBudgetMs: u32 = 250 where remindBudgetMs > 0 && remindBudgetMs <= 60000
```

A `param` looks like a `const` with two extras. `pub` makes it settable from outside: the build may bind a new value, and the default is used only when nothing does. `where` is a check the compiler runs against the final value, whichever place it came from. A budget of zero, or of more than a minute, should never reach a user.

Use the parameters where the old values were. In `execute`:

```silk
  let path = run Path.make(fileName)
```

and in `parseMilliseconds`, where the default budget lives:

```silk
  if word == "" {
    return u32.toU64(remindBudgetMs) * MILLISECOND
  }
```

A parameter is a static value of its type, so it works in ordinary runtime code like any constant.

Package parameters live only in the package's root module, `src/main.silk` here. Chapter 12 has more to say about that once the program has several modules.

What does a failed `where` look like? In the scratch project from chapter 10, try a default that breaks its own rule:

```silk
pub param remindBudgetMs: u32 = 0 where remindBudgetMs > 0 && remindBudgetMs <= 60000

pub fn main() -> i32 {
  return 0
}
```

```sh
silk check
```

```
[x86_64-unknown-linux-gnu]
/home/you/scratch/src/main.silk:1:41: error[SEM0214] Invalid compilation configuration: the bound value of package parameter `remindBudgetMs` does not satisfy its `where` predicate
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

SEM0214 covers every way a build's configuration can be wrong, and the message says which one this is. Column 41 is the start of the predicate. The value 0 failed the check, so the build stops. Nothing has run yet.

## A version command

To see what the build decided, `tasks` needs a way to tell you. Add a `Version` variant to `Command`, after `Remind`:

```silk
  Version,
```

and recognise it in `parseCommand`:

```silk
  if name == "version" {
    return Command.Version
  }
```

`Version` reports the platform, the build mode and both parameters. The first two are facts about the build, and `silk/target` and `silk/compilation` expose them as static functions. Add the imports:

```silk
import silk.compilation { Compilation, Optimization }
import silk.target { Target, OperatingSystem }
```

Now the platform name. Write it as a module-level `static if`, which chooses between whole declarations:

```silk
// ---------------------------------------------------------------------------
// Compile-time facts about the build.

static if Target.operatingSystem() == OperatingSystem.Linux {
  const PLATFORM: string = "linux"
} else static if Target.operatingSystem() == OperatingSystem.Darwin {
  const PLATFORM: string = "macos"
} else {
  const PLATFORM: string = "freestanding"
}
```

Three arms declare the same name, and that is fine: only the selected arm exists. On Linux, the other two `PLATFORM` constants are never seen by the type checker. Module-level `static if` can wrap any declaration this way: functions, imports, impls, even a whole platform-specific module of helpers.

The build mode comes from `Compilation.optimization()`. Here a `static if` *statement* inside a function picks a return:

```silk
fn buildKind() -> string<'static> {
  static if Compilation.optimization() == Optimization.Speed {
    return "release"
  } else {
    return "debug"
  }
}

effect fn showVersion() -> () ! LogError ? &mut Logger {
  run Effect.log("tasks 0.11 ({platform}, {build} build)\n", &.{ platform: PLATFORM, build: buildKind() })
  run Effect.log("tasks file {file}, reminders wait {ms}ms\n", &.{ file: fileName, ms: remindBudgetMs })
}
```

The compiled `buildKind` contains a single `return`. There is no runtime test.

The statement form is a little stricter than the module form. You might want three build kinds and reach for `else static if`:

```silk
  static if Compilation.optimization() == Optimization.Speed {
    return "release"
  } else static if Compilation.optimization() == Optimization.None {
    return "debug"
  }
```

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:563:10: error[PAR0001] Expected `{`
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Inside a function, `else` takes a block only. To chain, nest a second `static if` inside the `else` block. Chained `else static if` exists only at module level.

`static if` is also a statement, not an expression. In the scratch project, this does not parse:

```silk
import silk.target { Target, OperatingSystem }

pub fn main() -> i32 {
  let code = static if Target.operatingSystem() == OperatingSystem.Linux { 1 } else { 2 }
  return 0
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/scratch/src/main.silk:4:14: error[PAR0001] Expected identifier
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Silk has no `if` expression either, as you saw in chapter 2. Declare a `let mut` first and assign it in each branch, or return from each branch as `buildKind` does.

Wire the command into `execute`:

```silk
    Command.Version => {
      run showVersion()
    }
```

and add `| version` to the end of the usage line. Build and ask:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks version
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 1324 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/debug/tasks
Build summary: 1 succeeded, 0 failed
tasks 0.11 (linux, debug build)
tasks file /tasks.txt, reminders wait 250ms
```

Both parameters have their defaults.

A release build changes the optimization, so it selects the other branch:

```sh
silk build --release
./build/llvm/x86_64-unknown-linux-gnu/release/tasks version
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/release/tasks (llvm, x86_64-unknown-linux-gnu, 1324 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/release/tasks
Build summary: 1 succeeded, 0 failed
tasks 0.11 (linux, release build)
tasks file /tasks.txt, reminders wait 250ms
```

Release builds go to their own `release` directory. See **Static control flow and reflection** in the reference for every target and build query.

## Binding parameters in silk.toml

Say you find 250 ms a bit short. You could edit the default, but the default is the library author's choice. The person building the program sets their own value in `silk.toml`, with a binding:

```toml
[package]
name = "tasks"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"

[[build.bindings]]
package = "tasks@0.1.0"
module = "main"
parameter = "remindBudgetMs"
value = { kind = "integer", value = "300" }
origin = { source = "silk.toml", provenance = "literal" }
```

A binding is wordy on purpose. It names the package with its version, the root module and the parameter. The value is typed: an `integer` kind with its digits as a string. `origin` records where the value came from, so a build can always say why a parameter has the value it has.

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks version
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 1324 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/debug/tasks
Build summary: 1 succeeded, 0 failed
tasks 0.11 (linux, debug build)
tasks file /tasks.txt, reminders wait 300ms
```

The `remind` command picks up the new default with no other change. With the four tasks from chapter 10:

```sh
TIMEFORMAT='time %Rs'; time ./build/llvm/x86_64-unknown-linux-gnu/debug/tasks remind
```

```
reminder: #2 Write the Silk book
reminder: #1 Buy milk
1 cancelled when the time ran out
time 0.303s
```

The `where` clause guards bindings too. Change the value to `"90000"` and check:

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:248:43: error[SEM0214] Invalid compilation configuration: the bound value of package parameter `remindBudgetMs` does not satisfy its `where` predicate
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Line 248 is the `param` declaration, and column 43 is its predicate. The error points at the rule the value broke, not at `silk.toml`.

A typo in the parameter name is a different mistake, so it points somewhere else. With `parameter = "remindBudget"`:

```
/home/you/tasks/silk.toml:10: error[SEM0214] invalid package parameter binding: module `main.silk` declares no package parameter `remindBudget`
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

It is the same code as before, but this time the location is line 10 of `silk.toml`, the `parameter` line, and the message names the module and the name it could not find. Put the value back to `"300"` and the name to `remindBudgetMs`.

## Profiles

A profile is a named set of build settings with its own bindings. Add a `demo` profile that keeps its tasks in a separate file:

```toml
[profiles.demo]
target = "x86_64-unknown-linux-gnu"

[[profiles.demo.bindings]]
package = "tasks@0.1.0"
module = "main"
parameter = "fileName"
value = { kind = "string", value = "/demo-tasks.txt" }
origin = { source = "silk.toml", provenance = "literal" }
```

A profile must name its target. Its bindings win over the `[[build.bindings]]` ones, and the `[[build.bindings]]` still apply, so the budget stays 300. Build with `--profile`:

```sh
silk build --profile demo
./build/llvm/x86_64-unknown-linux-gnu/demo/tasks version
./build/llvm/x86_64-unknown-linux-gnu/demo/tasks add 'Try the demo profile'
ls *.txt
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/demo/tasks (llvm, x86_64-unknown-linux-gnu, 1324 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/demo/tasks
Build summary: 1 succeeded, 0 failed
tasks 0.11 (linux, debug build)
tasks file /demo-tasks.txt, reminders wait 300ms
added #1
demo-tasks.txt
tasks.txt
```

A profile build goes to a directory named after the profile, `demo/tasks`, next to `debug` and `release`. The demo binary starts a fresh board in its own file, and your real tasks are untouched. So is your normal binary:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks version
```

```
tasks 0.11 (linux, debug build)
tasks file /tasks.txt, reminders wait 300ms
```

The profile only changed the file name, so the demo binary still says `debug build`: a profile turns on optimization only when it says so, with a line such as `optimization = "speed"`.

See **Package parameters** in the reference for every value kind, precedence and `--profile-input`.

## A function per width

The list ends with "3 open". A small progress bar would be nicer: `[#####---------------]`. The bar's width is a design choice, fixed in the source, and a width of zero or two hundred is a mistake you would like to catch at build time.

A *static parameter* does that. Mark a parameter `static`, and every call must pass a value the compiler knows. Inside the function, the parameter is static too, so `static if` can test it:

```silk
// One copy of this function is compiled per width, and a bad width is a build error.
effect fn bar(static width: usize, done: usize, total: usize) -> () ! LogError ? &mut Logger {
  static if width == 0 || width > 40 {
    compileError("a progress bar is 1 to 40 cells wide")
  }
  let mut filled: usize = 0
  if total > 0 {
    filled = done * width / total
  }
  run Effect.log("[", &())
  let mut cell: usize = 0
  while cell < width {
    if cell < filled {
      run Effect.log("#", &())
    } else {
      run Effect.log("-", &())
    }
    cell = cell + 1
  }
  run Effect.log("]", &())
}
```

`compileError` stops the build, but only when static evaluation selects it. In an unselected branch it does nothing, which makes `static if` plus `compileError` a compile-time assertion. The value of `width` is part of the function's identity: `bar(20, ...)` and `bar(10, ...)` would be two separate compiled functions, each with its own selection.

Call it at the end of `showBoard`. Add `import silk.i32` for the conversion:

```silk
  let open = count(&board.*, &OpenTasks {})
  let total = board.tasks.length()
  let done = total - i32.toUsize(open)
  run Effect.log("{open} open ", &.{ open: open })
  run bar(20, done, total)
  run Effect.log("\n", &())
}
```

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks list
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 1366 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/debug/tasks
Build summary: 1 succeeded, 0 failed
[ ] #2 Write the Silk book (high)
[ ] #1 Buy milk (normal)
[ ] #3 Water the plants (low)
[x] #4 Call the plumber (high, done today)
3 open [#####---------------]
```

One of four done, five of twenty cells. Now make the mistake on purpose: change the call to `bar(0, done, total)` and check.

```
[x86_64-unknown-linux-gnu]
/home/you/tasks/src/main.silk:558:5: error[SEM0177] a progress bar is 1 to 40 cells wide
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Line 558 is the `compileError` itself, and the message is your own text. The call that selected the branch is not named. With one call site that is easy to trace. With many, search for calls whose static argument breaks the rule. Put the width back to 20.

What if `width` were an ordinary parameter? Try a smaller case in the scratch project:

```silk
// `static if` can only test values known while compiling.
fn label(verbose: bool) -> string<'static> {
  static if verbose {
    return "verbose"
  }
  return "quiet"
}

pub fn main() -> i32 {
  let shown = label(true)
  return 0
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/scratch/src/main.silk:3:13: error[SEM0176] Crossing from static evaluation into unavailable runtime work
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

In plainer words, static evaluation needs a runtime value. Column 13 is `verbose`, which is only known when the program runs. Make the parameter static, and each call compiles its own copy:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

// A static parameter: every call site passes a compile-time value, and each value gets its own copy.
fn label(static verbose: bool) -> string<'static> {
  static if verbose {
    return "verbose"
  }
  return "quiet"
}

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  run Effect.log("{a} {b}\n", &.{ a: label(true), b: label(false) }) |> Effect.provideMut<Logger>(&mut logger)
}
```

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 214 symbols)
verbose quiet
```

## Export by reflection

The last feature is `tasks export`, which prints the board as CSV. You could write the header and every column by hand. But then the header and the columns can drift apart. Instead, describe one CSV row as a struct and let the compiler walk its fields:

```silk
// ---------------------------------------------------------------------------
// Export: CSV whose header and columns are generated from a struct's fields.

// Only `pub` fields are visible to reflection.
struct Row<'text> {
  pub id: u32
  pub title: string<'text>
  pub priority: Priority
  pub done: string<'static>
}
```

`silk/reflect` gives static code a view of a type. `Reflect.fields<T>()` is a static sequence of field descriptors, in declaration order. `static for` repeats its body once per element, at compile time, so no loop remains in the program. Import it:

```silk
import silk.reflect { Reflect, namedKind }
```

The header writes each field's label:

```silk
effect fn csvHeader<T>() -> () ! LogError ? &mut Logger {
  static if Reflect.typeKind(Reflect.typeOf<T>()) != namedKind {
    compileError("csvHeader needs a struct with named fields")
  }
  let mut first = true
  static for field in Reflect.fields<T>() {
    if !first {
      run Effect.log(",", &())
    }
    run Effect.log("{name}", &.{ name: Reflect.fieldLabel(field) })
    first = false
  }
  run Effect.log("\n", &())
}
```

The `static if` at the top is another compile-time assertion: a tuple has no labels, so `csvHeader` refuses one. The `if !first` inside the loop is ordinary runtime code; only the loop itself is unrolled.

Each line borrows each field's value with `Reflect.borrowField` and logs it:

```silk
// Every field must implement Display; the loop is unrolled once per field at compile time.
effect fn csvLine<T>(row: &T) -> () ! LogError ? &mut Logger {
  let mut first = true
  static for field in Reflect.fields<T>() {
    if !first {
      run Effect.log(",", &())
    }
    run Effect.log("{value}", &.{ value: Reflect.borrowField(row, field).* })
    first = false
  }
  run Effect.log("\n", &())
}
```

Each repetition is type-checked on its own, with that field's type. For `Row`, the body is checked once with a `u32`, once with a `string`, once with a `Priority`, and once more with a `string`. Each type has `Display`, so all four work.

Now fill a `Row` per task:

```silk
effect fn exportBoard(board: &Board) -> () ! LogError ? &mut Logger {
  run csvHeader<Row>()
  let tasks = board.tasks.asSlice()
  let mut index: usize = 0
  while index < tasks.length {
    let task = &tasks[index]
    let mut done = "no"
    if !task.isOpen() {
      done = "yes"
    }
    run csvLine(&Row { id: task.id.0, title: task.title, priority: task.priority, done: done })
    index = index + 1
  }
}
```

Finally, wire up the command. Add `Export,` to `Command`, just before `Version`, and recognise the word in `parseCommand`:

```silk
  if name == "export" {
    return Command.Export
  }
```

Add the arm to `execute`:

```silk
    Command.Export => {
      run exportBoard(&board)
    }
```

and make the usage line end with `| remind [ms] | export | version`.

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks export
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 1413 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tasks/build/llvm/x86_64-unknown-linux-gnu/debug/tasks
Build summary: 1 succeeded, 0 failed
id,title,priority,done
1,Buy milk,normal,no
2,Write the Silk book,high,no
3,Water the plants,low,no
4,Call the plumber,high,yes
```

Add a field to `Row` and both the header and every line grow a column. They cannot disagree.

Two mistakes are worth seeing here. First, `done` is a yes-or-no value, so `bool` seems the natural type. Change the field to `pub done: bool` and pass `done: !task.isOpen()`:

```
[x86_64-unknown-linux-gnu]
<silk>/lib/silk/stdlib/silk/format.silk:423:21: error[SEM0121] A concrete specialization whose conditional requirements cannot be proved
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

You met this one in chapter 6. `bool` has no `Display`, so the template cannot print it, and the error is reported inside the standard library's `format.silk`. When the `static for` repeats the body for the `bool` field, that repetition fails. This is why `done` is a `string<'static>` holding `"yes"` or `"no"`.

Second, forget a `pub`. Write `title: string<'text>` without it, and the program still builds. The export is quietly different:

```
id,priority,done
1,normal,no
2,high,no
3,low,no
4,high,yes
```

`Reflect.fields` lists only `pub` fields, even inside the module that declares the struct. No error warns you, so check the header when an export looks short. Put the `pub` back.

## Run the tests

None of the tests touched the new code paths, but the parameters changed `execute`, so run them anyway:

```sh
silk test --no-cache
```

```
Compiled src/main.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/tasks (llvm, x86_64-unknown-linux-gnu, 1582 symbols)
  main::finishingRecordsTheClockTime
    PASS  95 us
  main::slowRemindersAreCancelled
    PASS  197 us
  main::unknownTaskIsReported
    PASS  13 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   372 us
```

## Summary

- You can declare package parameters with `param`, give them defaults and `where` checks, and bind them in `silk.toml` or in a profile selected with `--profile`.
- You can choose declarations with module-level `static if` (including `else static if`) and choose statements with `static if` inside a function.
- You can ask the build about itself through `Target` and `Compilation`, and see the result change with `--release`.
- You can write `static` parameters, which compile one copy per value, and refuse bad values with `compileError`.
- You can walk a struct's `pub` fields with `static for` over `Reflect.fields`, reading labels with `fieldLabel` and values with `borrowField`.

The next chapter splits the single file into a `taskcore` library and a `tasks` program, with modules, `pub`, exports and library tests.
