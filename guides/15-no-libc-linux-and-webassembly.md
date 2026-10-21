# No-libc Linux and WebAssembly

Silk compiles for six targets. Four are ordinary hosted systems with a C library. The other two have no C library at all: Linux without libc (`x86_64-unknown-linux-gnu-no-libc` and its `aarch64` twin, in the reference's naming) and WebAssembly (`wasm32-unknown-unknown`). This guide writes one program, `squares`, that selects different code for each kind of target, checks it for all three, and shows what this release can and cannot build.

## What changes without libc

On a hosted target, the providers you create in `main` talk to the C library: `StdoutWriter`, `StdoutLogger`, `OsFileSystem`, `OsMonotonicClock`, `OsRandom`, the native sockets and HTTP providers. Without libc they are gone or refuse to compile. Everything that only describes work stays: services, effects, collections, text, JSON, crypto, compression, URI parsing.

| Kind of module | Hosted | Linux, no libc | wasm32 |
| --- | --- | --- | --- |
| Portable logic (`silk/list`, `silk/json_value`, `silk/sha2`, ...) | yes | yes | yes |
| Services (`silk/writer`, `silk/logger`, `silk/filesystem`, `silk/random`, ...) | yes | yes | yes |
| `Allocator.systemAllocatorProvider()` | yes | yes | yes |
| OS providers (`silk/os_writer`, `silk/os_logger`, `silk/os_filesystem`, `silk/os_child_process`, ...) | yes | empty module | empty module |
| `OsRandom`, `OsMonotonicClock`, native sockets, native HTTP | yes | compile error | compile error |
| Raw kernel calls (`silk/raw_linux`, `silk/raw_mapping`, `silk/raw_process_inputs`) | empty module | yes | empty module |

So on these targets your code keeps asking for services, and you supply providers you write yourself. That is the same move you make in tests, which the Testing with providers guide covers.

## Reading the per-target API pages

The std lib API reference has one page per module and target surface. Its index lists, for each page, the profiles it covers. When a module's public API differs by target, it gets more than one page: `os-writer.md` covers the hosted targets and declares `StdoutWriter` and `StderrWriter`, while `os-writer.profile-2.md` covers the no-libc and wasm32 profiles and declares nothing. `raw-linux.md` is empty on hosted targets and wasm32; `raw-linux.profile-2.md` holds `RawLinux` for the no-libc profiles.

A page that lists all six profiles can still refuse a target when you use it. `OsRandom.make()` exists on every page, but on wasm32 it stops the build with a `compileError`. The provider's doc comment and its "Gotchas" section say which profiles it supports.

## The manifest

```toml
[package]
name = "squares"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"

[build.composition]
runtimes = [
  { name = "hosted", module = "silk/native_start" },
  { name = "raw", module = "silk/raw_start" },
  { name = "standalone", module = "silk/wasm_start" },
]
defaults = ["hosted"]

[profiles.bare]
target = "x86_64-unknown-linux-gnu"
libc = "none"
runtime = { kind = "named", name = "raw" }

[profiles.web]
target = "wasm32-unknown-unknown"
runtime = { kind = "named", name = "standalone" }
```

A target alone does not say how a program starts. The runtime module does that, and the std lib's catalog only knows two: `silk/native_start` for hosted targets and `silk/wasm_start` for wasm32. For Linux without libc there is no default, so you list the runtimes yourself in `[build.composition]` and pick one per profile:

- `hosted` (`silk/native_start`) is the default, used by `silk run` and by any profile that names no runtime.
- `raw` (`silk/raw_start`) enters at `_start` straight from the kernel. It calls `pub fn main(inputs: &ProcessInputs) -> i32` and turns the result into the exit status.
- `standalone` (`silk/wasm_start`) exports `main` from the WebAssembly module. The host calls it with no arguments and receives an `i32`: an `i32` result passes through, a unit result is 0, and a typed failure is 1. It gives the program no host services.

The `bare` profile selects Linux with `libc = "none"`; `web` selects wasm32. **Targets and profiles** in the Projects section lists every profile key. Without the composition, `silk check --profile bare` stops with `silk: the build selects no single runtime (ARTIFACT-001)`.

## The program

```silk
import silk.effect { Effect }
import silk.format { Format }
import silk.writer { Writer, WriterError }
import silk.compilation { Compilation, Libc }
import silk.target { Arch, Target }

fn sumOfSquares(limit: i32) -> i32 {
  let mut total = 0
  let mut n = 1
  while n <= limit {
    total = total + n * n
    n = n + 1
  }
  return total
}

effect fn report(limit: i32) -> () ! WriterError ? &mut Writer {
  let total = sumOfSquares(limit)
  run Format.format("sum of squares to {limit}: {total}\n", &.{ limit: limit, total: total })
}

static if Target.arch() == Arch.Wasm32 {
  pub fn main() -> i32 {
    return sumOfSquares(10)
  }
} else static if Compilation.libc() == Libc.None {
  import silk.raw_linux { RawLinux }
  import silk.raw_process_inputs { ProcessInputs }
  import silk.result { Result }
  import silk.slice { Slice }

  struct RawStdout {}

  effect fn writeAll(self: &mut RawStdout, bytes: &[u8]) -> () ! WriterError {
    let mut offset: usize = 0
    while offset < bytes.length {
      let result = RawLinux.write(1, Slice.view(bytes, offset, bytes.length - offset))
      if RawLinux.error(result) != 0 { fail Writer.failure() }
      offset = offset + result
    }
  }

  effect fn flush(self: &mut RawStdout) -> () ! WriterError {}

  impl Writer for RawStdout { writeAll: RawStdout.writeAll flush: RawStdout.flush }

  pub fn main(inputs: &ProcessInputs) -> i32 {
    let mut out = RawStdout {}
    let outcome = run Effect.result(report(10)) |> Effect.provideMut<Writer>(&mut out)
    return match move outcome {
      Result.Success { value } => 0
      Result.Failure { error } => 1
    }
  }
} else {
  import silk.os_writer { StdoutWriter }

  pub effect fn main() -> () ! WriterError {
    let mut out = StdoutWriter.make()
    run report(10) |> Effect.provideMut<Writer>(&mut out)
  }
}
```

`sumOfSquares` and `report` are the portable part. `report` needs a `Writer` and does not care which one.

The rest is three versions of `main`, chosen by a module-level `static if`. `Target.arch()` from `silk/target` and `Compilation.libc()` from `silk/compilation` are static functions: the compiler knows their answers before it type-checks, so only the selected arm exists in the build. That is why each arm can import modules the others cannot use. See **Static control flow and reflection** in the reference.

- On wasm32, `main` returns the number. The host reads it as the call's result. `silk/wasm_start` accepts a `main` that returns `i32` or `()`, or an `effect fn` that returns `()` and may fail. An `effect fn main() -> i32` is refused there with SEM0225, even though that error's text describes the hosted runtime's shapes.
- On Linux without libc, `RawStdout` implements the `Writer` service with `RawLinux.write` on descriptor 1. `RawLinux.write` returns the kernel's raw result; `RawLinux.error` turns it into zero or an error number. With that provider, the same `report` runs unchanged.
- Everywhere else, `StdoutWriter` from `silk/os_writer` does the job.

`silk/target` also has `operatingSystem()`, `abi()`, `endianness()`, `pointerBits` and `hasCpuFeature("...")`. `silk/compilation` reports the rest of the build request, such as `artifact()`, `safety()` and `threading()`.

## Check every target

On the host, nothing new:

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/squares (llvm, x86_64-unknown-linux-gnu, 223 symbols)
sum of squares to 10: 385
```

`silk check` takes a profile, so each arm gets type-checked against its own target's std lib:

```sh
silk check --profile bare
```

```
check x86_64-unknown-linux-gnu: ok
Check summary: 1 succeeded, 0 failed
```

```sh
silk check --profile web
```

```
check wasm32-unknown-unknown: ok
Check summary: 1 succeeded, 0 failed
```

Run these checks in CI. They are the cheapest way to keep a portable library portable.

## Mistakes the checks catch

Copy the hosted `main`, with its `StdoutWriter` import, into the wasm32 arm in place of the one there. The host build is unaffected, but the wasm check fails:

```sh
silk check --profile web
```

```
[wasm32-unknown-unknown]
/home/you/squares/src/main.silk:23:27: error[SEM0014] Module silk/os_writer has no member StdoutWriter
check wasm32-unknown-unknown: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

`silk/os_writer` exists on wasm32, but its wasm32 page declares nothing. Now try a provider that is declared everywhere but refuses wasm32. Put `let random = OsRandom.make()` in the wasm32 `main`, with `import silk.os_random { OsRandom }`:

```
[wasm32-unknown-unknown]
<silk>/lib/silk/stdlib/silk/os_random.silk:41:14: error[SEM0177] OsRandom requires a supported Darwin or GNU libc profile
check wasm32-unknown-unknown: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

SEM0177 means library code asked the compiler to stop. The location is inside the std lib, but the mistake is the call in your code. On such a target, write a `Random` provider over whatever entropy the host gives you.

## Building: what works today

This release checks both targets but cannot produce a program for either. These are the messages you get:

```sh
silk build --profile bare
```

```
<silk>/lib/silk/stdlib/silk/raw_start.silk:27:5: unsupported[foreign-contract] not supported by the native compiler yet
build llvm/x86_64-unknown-linux-gnu: failed (exit 2)
Build summary: 0 succeeded, 1 failed
```

```sh
silk build --profile web
```

```
Cannot link an executable for target wasm32-unknown-unknown on host x86_64-unknown-linux-gnu
build llvm/wasm32-unknown-unknown: failed (exit 2)
Build summary: 0 succeeded, 1 failed
```

The compiler links executables only for the host target. Stopping early with `[build] stage = "object"` does not help yet: code generation then stops at the C-ABI export in `silk/wasm_start` with `unsupported[c-abi-target] not supported by the native compiler yet`. The same happens for a library-style module that exports its own `export "C"` functions.

Nothing in the Silk repository's test scripts or CI workflows runs WebAssembly output, so there is no reference runtime to point to. When wasm32 builds land, the result is a module with no imports from the host that exports `main`. Any WebAssembly host can instantiate it and call `main()` to get the `i32`. Until then, use the wasm32 and no-libc profiles to check code, and keep the code they check portable.

## API reference

- `silk/target`: `Target`, `Arch`, `OperatingSystem`, `Abi`, `Endianness`, `pointerBits`
- `silk/compilation`: `Compilation`, `Libc`, `Artifact`
- `silk/raw_linux`: `RawLinux` (no-libc Linux only)
- `silk/raw_process_inputs`: `ProcessInputs` (no-libc Linux only)
- `silk/raw_mapping`: `Mapping` (no-libc Linux only)
- `silk/raw_start`, `silk/wasm_start`, `silk/native_start`: runtime modules, no public items
- `silk/writer`: `Writer`, `WriterError`; `silk/os_writer`: `StdoutWriter` (hosted only)
- `silk/format`: `Format`; `silk/slice`: `Slice`
