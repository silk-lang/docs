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
| `silk-version` | The Silk version the code was written for. `silk init` writes the version of the compiler that made it. |
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
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/hello (llvm, x86_64-unknown-linux-gnu, 210 symbols)
Hello, world!
```

`silk run` builds the package and starts the program. The first line is from the compiler: the root module, where the executable went, and the target. The second is your program. The log message has no `\n` at the end, so your prompt shows up right after `Hello, world!`.

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
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/hello (llvm, x86_64-unknown-linux-gnu, 257 symbols)
Hello, Ada!
0
```

Without an argument, `main` returns 2, and `silk run` exits with the program's status:

```sh
silk run
echo $?
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/hello (llvm, x86_64-unknown-linux-gnu, 257 symbols)
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
check x86_64-unknown-linux-gnu: ok
Check summary: 1 succeeded, 0 failed
```

## Build an executable

```sh
silk build
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/hello (llvm, x86_64-unknown-linux-gnu, 257 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/hello/build/llvm/x86_64-unknown-linux-gnu/debug/hello
Build summary: 1 succeeded, 0 failed
```

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
