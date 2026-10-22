# Your first program

This page takes you from an empty folder to a program that reads an argument, prints a greeting and sets its exit status. You need `silk` on your `PATH` and Clang 18 or newer; see Install.

## Create a package

```sh
silk init hello
```

```
Initialized Silk project hello at /home/you/hello
```

`silk init` makes the folder and three files in it. Without a path it uses the current folder. `--name <name>` gives the package a name other than the folder's. It refuses to touch a folder that already has a `silk.toml`:

```
Refusing to overwrite existing project file /home/you/hello/silk.toml
```

`silk init --lib` makes a library package and `silk init --workspace` a workspace; see Projects and packages.

## The generated files

```
hello/
  .gitignore
  silk.toml
  src/
    main.silk
```

`silk.toml` is the manifest:

```toml
[package]
name = "hello"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"
```

| Key | Meaning |
| --- | --- |
| `name` | The package name. The executable gets this name too. |
| `version` | Your package's own version. |
| `silk-version` | The Silk toolchain the package runs with. `silk init` writes the version of the compiler that made it. |
| `root` | The root module. The compiler starts reading here and finds other files through imports. |

`.gitignore` holds one line, `/build/`. Compiled output goes to `build/`, and you don't commit it.

`src/main.silk` is a complete program:

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

`main` is an effect function, because printing is an effect. `! LogError` says it can fail with a `LogError`. Printing goes through a logger: `Effect.log` describes the message, `Effect.provideMut(&mut logger)` supplies a logger that writes to standard output, and `run` performs it. Chapter 1 of the Silk book, Hello, Silk, reads this file line by line.

## Run it

```sh
cd hello
silk run
```

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.10s
  check    1 module                          0.16s
  codegen  422 functions                     0.40s
  borrow   137 bodies                        0.01s
  link     clang                             0.25s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 0.96s
Hello, world!
```

`silk run` builds the package and starts the program. The first lines are the build's progress: one row per compiler phase, then the path of the program it built. They go to standard error, and the program's own output follows on standard output, so `silk run > out.txt` captures only `Hello, world!`. In a terminal the rows are redrawn in place while they run. `silk run --quiet` keeps only the `Finished` line. From here on, the output shown after `silk run` is the program's alone.

The log message has no `\n` at the end, so your prompt shows up right after `Hello, world!`.

## Read an argument and choose the exit status

Replace `src/main.silk` with this:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.host_input { HostInput, HostInputError }
import silk.logger { LogError }
import silk.option { Option }
import silk.os_logger { StdoutLogger }
import silk.result { Result }
import silk.string { String, InvalidUtf8 }

pub effect fn main() -> i32
  ! LogError | HostInputError | OutOfMemoryError
  ? &mut HostInput {
  let mut logger = StdoutLogger.make()
  let mut allocator = Allocator.systemAllocatorProvider()

  let first = run HostInput.argument(1) |> Effect.provideMut<Allocator>(&mut allocator)
  let name = match move first {
    Option<Bytes>.Some { value } => move value
    Option<Bytes>.None => {
      run Effect.log("usage: hello <name>\n", &()) |> Effect.provideMut(&mut logger)
      return 2
    }
  }
  let text = match String.fromUtf8(Bytes.asSlice(&name)) {
    Result<string, InvalidUtf8>.Success { value } => value
    Result<string, InvalidUtf8>.Failure { .. } => "stranger"
  }

  run Effect.log("Hello, {name}!\n", &.{ name: text }) |> Effect.provideMut(&mut logger)
  return 0
}
```

What changed:

- `-> i32`: `main` now returns the process exit status.
- `? &mut HostInput`: `main` asks the runtime for the program's arguments and environment. This is the only requirement `main` may have.
- `HostInput.argument(1)` returns `Option<Bytes>`. Index 0 is the program's own name. Copying the argument allocates, so the call gets an `Allocator`.
- Arguments are raw bytes. `String.fromUtf8` turns them into a `string`, or fails on bytes that are not UTF-8.
- `{name}` in the template is filled from the `name` field of `&.{ name: text }`. The compiler checks that every placeholder has a field.

Arguments after `--` go to your program:

```sh
silk run -- Ada
echo $?
```

```
Hello, Ada!
0
```

Without an argument, `main` returns 2, and `silk run` exits with the program's status:

```sh
silk run
echo $?
```

```
usage: hello <name>
2
```

`silk run Ada` works as well, but `--` makes sure an argument such as `--release` reaches your program instead of `silk`.

On POSIX hosts the status is the low 8 bits of the `i32`. A `main` that returns `()` exits with 0. A failure that escapes an effect `main`, such as a `LogError` here, ends the program with status 1 and a report on standard error. See Program entry and termination.

## Check without building

`silk check` type-checks the package and builds nothing, so it is the fastest way to see errors:

```sh
silk check
```

```
Checking hello (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.07s
  check    2 modules                         0.30s
  borrow   175 bodies                        0.01s
Finished hello in 0.38s
```

While it works, `silk check` reports each phase on standard error: `load` reads your module and the standard library modules it imports, `check` type-checks them, and `borrow` checks ownership in each function body. The last line says the check finished and how long it took. Errors, when there are any, appear between the phase rows and a closing `Failed` line.

## Build an executable

```sh
silk build
```

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.07s
  check    1 module                          0.01s
  codegen  550 functions                     0.48s
  borrow   186 bodies                        0.01s
  link     clang                             0.22s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 0.83s
```

A build adds two phases: `codegen` generates machine code for the functions the program uses, and `link` runs Clang to produce the executable. The last line names it.

The executable lands at `build/llvm/<target>/debug/<name>`. It runs on its own, with no `silk` involved:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/hello Grace
```

```
Hello, Grace!
```

Next to it is `hello.symbols`, a table that maps machine-level symbol names back to Silk names.

| Command | Output |
| --- | --- |
| `silk build` | `build/llvm/<target>/debug/<name>`, unoptimized, fast to compile |
| `silk build --release` | `build/llvm/<target>/release/<name>`, optimized |
| `silk clean` | Deletes `build/` |

The target is your host's: `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu` or `aarch64-apple-darwin`.

## Next

A tour of Silk shows more of the language in one program. The Silk book teaches it in order, starting from this same `silk init`.
