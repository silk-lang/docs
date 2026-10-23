# 1. Hello, Silk

This book teaches Silk by building one program, a small task tracker called `tasks`. It starts as a few lines that print a message. By the last chapter it saves tasks to a file, runs reminders on fibers and answers HTTP requests. In this first chapter you create the project, look at what is inside it, change the greeting, and learn the commands you will use in every chapter after this one.

## Before you start

You need the `silk` command on your `PATH`. Check that it answers:

```sh
silk --version
```

```
silk v0.1.0
```

Everything else comes with it: the compiler, the standard library and the tools that build, run, test and format your code. There is no separate package manager or build tool to install.

## Create the project

Silk can set up a new project for you. Run `silk init` with the name of a folder:

```sh
silk init tasks
```

```
Initialized Silk project tasks at /home/you/tasks
```

Your path will differ. If you leave out the folder, `silk init` uses the current directory. If you want the package to have a different name from its folder, add `--name`.

Move into the new folder:

```sh
cd tasks
```

## What is in a project

`silk init` created three files:

```
tasks/
  .gitignore
  silk.toml
  src/
    main.silk
```

`silk.toml` is the manifest. It tells the tools what this package is and where its code starts:

```toml
[package]
name = "tasks"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"
```

The `name` is the package name, and it also names the program you build. `version` is your package's own version. `silk-version` is the Silk release the package runs with: an installed `silk` hands every command here to that version. `root` is the root module, the file where the compiler starts reading. Every other file in the package is found by following imports from there.

`.gitignore` holds one line, `/build/`. The build folder is where compiled output goes, and you never commit it.

`src/main.silk` is your program. Open it:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello, world!", &()) |> Effect.provideMut(&mut logger)
}
```

Even this small file shows a lot of Silk. Before you read it line by line, run it.

## Run it

```sh
silk run
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.10s
  check    1 module                          0.16s
  codegen  422 functions                     0.40s
  borrow   137 bodies                        0.01s
  link     clang                             0.25s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 0.96s
Hello, world!
```

`silk run` compiles the package and then starts the program. The lines before `Hello, world!` are the compiler reporting its progress, one row per phase, on standard error. "Check before you run", below, explains the rows. Everything after the `Finished` line is your program's output. From now on, the book shows only the program's output after `silk run`.

Look closely at your terminal. Your shell prompt probably appears right after `Hello, world!` on the same line. That is because the program never printed a line break. Silk prints exactly the bytes you give it, and adds nothing. You fix that below.

## Reading main

Now go through the file from the top.

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }
```

Nothing is in scope by default except the language itself. Each `import` names a module of the standard library and the items you want from it. `silk.effect` is the module `silk/effect`, and `{ Effect }` brings its `Effect` type into this file. You will import much more as the program grows. The module pages of the standard library reference are named the same way, so `silk/logger` is where you read about loggers.

```silk
pub effect fn main() -> ()
  ! LogError {
```

`main` is where the program starts. It must be `pub`, it takes no parameters, and it lives in the root module. The `-> ()` says it returns nothing interesting: `()` is the unit type, which has one value and carries no information.

The word `effect` is the important part. In Silk, a function that talks to the outside world, like printing, reading files or waiting on a clock, is an effect function. The compiler tracks what such a function can do. The line `! LogError` is part of that tracking. It says that `main` may fail with a `LogError`, for example if standard output is closed. If that happens and nothing handles it, the program stops with exit status 1 and a report on standard error. You will learn to handle failures yourself in chapter 7.

```silk
  let mut logger = StdoutLogger.make()
```

This creates a logger that writes to standard output, and binds it to the name `logger`. `let` makes a binding. `mut` lets you change it, or lend it out for changing, which is what happens next.

```silk
  run Effect.log("Hello, world!", &()) |> Effect.provideMut(&mut logger)
```

This line does three things.

- `Effect.log("Hello, world!", &())` describes a log message. It does not print anything yet. It builds a value that says "log this message" and needs a `Logger` to do it.
- `|> Effect.provideMut(&mut logger)` passes that description to `provideMut`, which hands it your logger. The `|>` operator takes the value on its left and passes it as the first argument of the call on its right. `&mut logger` lends the logger out for changing while the message is written.
- `run` actually performs the effect. Without `run`, nothing happens.

This split between describing work and running it is central to Silk. Code that logs does not decide where logs go. It only says it needs a `Logger`, and whoever runs it supplies one. Later in the book that lets the same code log to the terminal, to a test's memory, or into an HTTP response. For now, the takeaway is that printing needs a logger, and `main` creates one and provides it. See **Effects and run** in the reference for the full rules.

## Make it say something useful

Change the message so it is about tasks, and end it with a line break. `\n` inside a string literal is a newline:

```silk
  run Effect.log("tasks: nothing to track yet\n", &()) |> Effect.provideMut(&mut logger)
```

```sh
silk run
```

```
tasks: nothing to track yet
```

The prompt is back on its own line.

## Templates and arguments

The first argument to `Effect.log` is not just a string. It is a template, and it can contain placeholders in braces. The second argument supplies the values. So far you passed `&()`, a borrowed unit value, because the template had no placeholders.

Put the version number into the message. Replace the body of `main` so the file reads:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("tasks {version}: nothing to track yet\n", &.{ version: "0.1" })
    |> Effect.provideMut(&mut logger)
}
```

`.{ version: "0.1" }` is an anonymous record: a small value with one field named `version`. The `&` in front lends it to `Effect.log` instead of handing it over. The placeholder `{version}` in the template is filled from the field with the same name.

The long line is split before `|>`. A line that starts with `|>` continues the expression above it, so you can break pipelines wherever they read best.

```sh
silk run
```

```
tasks 0.1: nothing to track yet
```

Templates are checked when you compile, not when the program runs. The template must be known at compile time for that reason, and every placeholder must match a field of the argument. A typo can never print a broken message. It stops the build instead.

## Check before you run

It is worth seeing that check in action. Misspell the placeholder:

```silk
  run Effect.log("tasks {versoin}: nothing to track yet\n", &.{ version: "0.1" })
    |> Effect.provideMut(&mut logger)
```

Try to run it:

```sh
silk run
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.10s
  check    failed: 1 module, 1 error         0.15s
[x86_64-unknown-linux-gnu]
src/main.silk:9:7: error[SEM0177] template field {versoin} not found; available visible fields: version
Failed tasks in 0.27s
```

The program did not compile, so nothing ran, and `silk run` exits with status 1. You get the same report without building anything from `silk check`:

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.14s
[x86_64-unknown-linux-gnu]
src/main.silk:9:7: error[SEM0177] template field {versoin} not found; available visible fields: version
Failed tasks in 0.19s
```

`silk check` type-checks the package for each target without producing a program, so it is fast. While it works, it reports its progress: the package and target it is checking, one row per phase with what the phase covered and how long it took, and a last line that says whether it finished or failed. Here `load` read your one module and 52 modules of the standard library, and `check` stopped with one error. Then come the errors themselves. Each error line has a file, a line and a column, then the error code in brackets, then a message.

Line 9, column 7 is the start of the `Effect.log` call. The template is checked by the standard library module `silk/format`, which runs while your code compiles. When it finds a placeholder with no matching field, it asks the compiler to stop the build, and the compiler reports the stop at your call. SEM0177 means library code requested the failure, and the message is the text the library gave: the placeholder it could not fill, `{versoin}`, and the fields you did pass, here just `version`. Compare the two and the typo is plain.

Fix the spelling back to `{version}` and check again:

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.04s
  check    2 modules                         0.20s
  borrow   144 bodies                        0.00s
Finished tasks in 0.25s
```

The `borrow` row is the ownership check, which runs over each function body once the types are known. Chapter 4 explains what it looks for. The times on your machine will differ.

Make `silk check` a habit. Run it whenever you change code, and use `silk run` once it passes. Every error shown in this book comes from `silk check`.

## Build a program you can ship

`silk run` builds and runs in one step. When you want the program itself, use `silk build`:

```sh
silk build
```

```
Compiling tasks (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.05s
  check    1 module                          0.19s
  codegen  462 functions                     0.25s
  borrow   155 bodies                        0.01s
  link     clang                             0.19s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/tasks in 0.72s
```

A build runs the same phases as a check, then two more: `codegen` turns the functions your program uses into machine code, and `link` runs Clang to make the executable. The last line names the file it wrote. The program is a native executable at `build/llvm/<target>/debug/tasks`. On 64-bit Linux the target is `x86_64-unknown-linux-gnu`. `debug` is the default build: compiled quickly, without optimizations. You can run the file directly, with no `silk` involved:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tasks
```

```
tasks 0.1: nothing to track yet
```

Next to it you will find `tasks.symbols`, a table that maps the program's machine-level symbol names back to Silk names.

Two more commands round out the set for now. `silk build --release` builds an optimized program into `build/llvm/<target>/release/` instead. `silk clean` deletes the `build` folder when you want a fresh start. Chapter 11 returns to build options.

## Summary

- `silk init tasks` creates a package with `silk.toml`, `src/main.silk` and a `.gitignore` for `build/`.
- A program starts at `pub fn main` or `pub effect fn main` in the root module named in `silk.toml`.
- Printing goes through a `Logger`: `Effect.log` describes a message, `Effect.provideMut(&mut logger)` supplies the logger, and `run` performs it.
- Log templates are checked at compile time. Placeholders like `{version}` are filled from the fields of a borrowed record like `&.{ version: "0.1" }`.
- `silk check` reports errors fast, without building. `silk run` builds and runs. `silk build` writes the program to `build/llvm/<target>/debug/tasks`.

Next, in chapter 2, the program starts counting: numbers, bindings, functions and loops.
