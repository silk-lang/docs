# No-libc Linux and WebAssembly

Silk builds for six targets, and the std lib reference documents eight profiles of them. Three profiles are ordinary hosted systems with a C library: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu` and `x86_64-unknown-linux-gnu`. The other five have no C library at all:

- Linux without libc: `x86_64-unknown-linux-gnu-no-libc` and its `aarch64` twin, which are the Linux targets with `libc = "none"` in the profile, not separate target names.
- Bare WebAssembly: `wasm32-unknown-unknown`, which gets nothing from its host.
- WASI: `wasm32-wasip1` (a core module that imports `wasi_snapshot_preview1`) and `wasm32-wasip2` (a WASI 0.2 component).

This guide writes one program, `squares`, that selects different code for each kind of target, checks it for four profiles, and builds and runs two WebAssembly modules.

## What changes without libc

On a hosted target, the providers you create in `main` talk to the C library: `StdoutWriter`, `StdoutLogger`, `OsFileSystem`, `OsMonotonicClock`, `OsRandom`, the native sockets and HTTP providers. Without libc most of them are gone or refuse to compile. WASI is the exception: there the same providers call the WASI host instead. Everything that only describes work stays everywhere: services, effects, collections, text, JSON, crypto, compression, URI parsing.

| Kind of module | Hosted | Linux, no libc | `wasm32-unknown-unknown` | WASI |
| --- | --- | --- | --- | --- |
| Portable logic (`silk/collections/list`, `silk/json/value`, `silk/crypto/sha2`, ...) | yes | yes | yes | yes |
| Services (`silk/io/writer`, `silk/io/logger`, `silk/system/filesystem`, `silk/system/random`, ...) | yes | yes | yes | yes |
| `Allocator.systemAllocatorProvider()` | yes | yes | yes | yes |
| Output, logging and files (`silk/io/writer_native`, `silk/io/logger_native`, `silk/system/filesystem_native`) | yes | empty module | empty module | yes |
| `OsRandom`, `OsMonotonicClock` | yes | build error | build error | yes |
| Child processes (`silk/system/child_process_native`) | yes | empty module | empty module | empty module |
| Native sockets and HTTP (`silk/net/socket_native`, `silk/http/client_native`, ...) | yes | no | no | no; `wasm32-wasip2` has its own modules |
| Raw kernel calls (`silk/platform/linux/syscall`, `silk/platform/linux/mapping`, `silk/platform/linux/process_inputs`) | empty module | yes | empty module | empty module |

On WASI, `OsFileSystem` reaches only the directories the host preopens, and `OsRandom` uses the host's `random_get`. On the other two kinds of target your code keeps asking for services, and you supply providers you write yourself. That is the same move you make in tests, which the Testing with providers guide covers.

## Reading the per-target API pages

The std lib API reference has one page per module. Each declaration on it ends with a `Profiles:` line that names the profiles where it is declared. On the `silk.io.writer_native` page, for example, the `Writer` operations of `StdoutWriter` list the three hosted profiles plus `wasm32-wasip1` and `wasm32-wasip2`. A declaration missing from a profile is the SEM0014 error shown below. The overview page ends with the list of profile identities and the target each one uses.

A declaration that lists every profile can still refuse a target when you use it. `OsRandom.make()` is declared on all eight profiles, but on `wasm32-unknown-unknown` it stops the build with a `compileError`. The provider's doc comment and its "Gotchas" section say which profiles it supports.

## The manifest

```toml
[package]
name = "squares"
version = "0.1.0"
silk-version = "0.1.0"

[unstable.composition]
runtimes = [
  { name = "hosted", module = "silk/platform/native/start" },
  { name = "raw", module = "silk/platform/linux/start" },
  { name = "standalone", module = "silk/platform/wasm/start" },
  { name = "wasi", module = "silk/platform/wasi/start" },
]
defaults = ["hosted"]

[profiles.bare]
target = "x86_64-unknown-linux-gnu"
libc = "none"
runtime = { kind = "named", name = "raw" }

[profiles.web]
target = "wasm32-unknown-unknown"
runtime = { kind = "named", name = "standalone" }

[profiles.wasi]
target = "wasm32-wasip1"
runtime = { kind = "named", name = "wasi" }
```

A target alone does not say how a program starts. The runtime module does that, and the std lib's catalog knows three: `silk/platform/native/start` for hosted targets, `silk/platform/wasm/start` for `wasm32-unknown-unknown` and `silk/platform/wasi/start` for both WASI targets. For Linux without libc there is no default, so you list the runtimes yourself in `[unstable.composition]` and pick one per profile:

- `hosted` (`silk/platform/native/start`) is the default, used by `silk run` and by any profile that names no runtime.
- `raw` (`silk/platform/linux/start`) enters at `_start` straight from the kernel. It calls `pub fn main(inputs: &ProcessInputs) -> i32` and turns the result into the exit status.
- `standalone` (`silk/platform/wasm/start`) exports `main` from the WebAssembly module. The host calls it with no arguments and receives an `i32`: an `i32` result passes through, a unit result is 0, and a typed failure is 1. It gives the program no host services.
- `wasi` (`silk/platform/wasi/start`) exports `_start`, the WASI command entry. `main` may return `i32` or `()`, or be an `effect fn` with either result; it may require `&mut HostInput`, which reads the WASI arguments and environment. A failure exits with status 1. Other services need providers you create in `main`, as on a hosted target.

The `bare` profile selects Linux with `libc = "none"`, `web` selects bare wasm32, and `wasi` selects WASI Preview 1. **Targets and profiles** in the Projects section lists every profile key. Without the composition, `silk check --profile bare` stops with `silk: the build selects no single runtime (ARTIFACT-001)`. Once a composition is present it replaces the catalog, so it must list `wasi` too. If it does not, `silk check --profile wasi` and `silk build --profile wasi` stop before compiling anything. A profile that names the missing `wasi` runtime gets `silk: the build selects no single runtime (ARTIFACT-001)`. A profile with no `runtime` line gets the default, `hosted`, which the catalog refuses for this target:

```
silk: the runtime module silk/platform/native/start does not support the target wasm32-wasip1; list silk/platform/wasi/start in [unstable.composition].runtimes and select it for this profile with `runtime = { kind = "named", name = ... }` (ARTIFACT-001)
```

## The program

```silk
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.io.writer { Writer, WriterError }
import silk.core.compilation { Compilation, Libc }
import silk.core.target { OperatingSystem, Target }

fn sumOfSquares(limit: i32) -> i32 {
  let mut total = 0
  let mut n = 1
  while n <= limit {
    total = total + n * n
    n = n + 1
  }
  return total
}

effect fn report(limit: i32) -> ()
  ! WriterError
  ? &mut Writer {
  let total = sumOfSquares(limit)
  run Format.format("sum of squares to {limit}: {total}\n", &.{ limit: limit, total: total })
}

static if Target.operatingSystem() == OperatingSystem.Freestanding {
  pub fn main() -> i32 {
    return sumOfSquares(10)
  }
} else static if Target.operatingSystem() == OperatingSystem.Linux && Compilation.libc() == Libc.None {
  import silk.platform.linux.syscall { RawLinux }
  import silk.platform.linux.process_inputs { ProcessInputs }
  import silk.core.result { Result }
  import silk.collections.slice { Slice }

  struct RawStdout {}

  effect fn writeAll(self: &mut RawStdout, bytes: &[u8]) -> ()
    ! WriterError {
    let mut offset: usize = 0
    while offset < bytes.length {
      let result = RawLinux.write(1, Slice.view(bytes, offset, bytes.length - offset))
      if RawLinux.error(result) != 0 {
        fail Writer.failure()
      }
      offset = offset + result
    }
  }

  effect fn flush(self: &mut RawStdout) -> () ! WriterError {}

  impl Writer for RawStdout {
    writeAll: RawStdout.writeAll

    flush: RawStdout.flush
  }

  pub fn main(inputs: &ProcessInputs) -> i32 {
    let mut out = RawStdout {}
    let outcome = run Effect.result(report(10)) |> Effect.provideMut<Writer>(&mut out)
    return match move outcome {
      Result.Success { value } => 0
      Result.Failure { error } => 1
    }
  }
} else {
  import silk.io.writer_native { StdoutWriter }

  pub effect fn main() -> ()
    ! WriterError {
    let mut out = StdoutWriter.make()
    run report(10) |> Effect.provideMut<Writer>(&mut out)
  }
}
```

`sumOfSquares` and `report` are the portable part. `report` needs a `Writer` and does not care which one.

The rest is three versions of `main`, chosen by a module-level `static if`. `Target.operatingSystem()` from `silk/core/target` and `Compilation.libc()` from `silk/core/compilation` are static functions: the compiler knows their answers before it type-checks, so only the selected arm exists in the build. That is why each arm can import modules the others cannot use. See **Static control flow and reflection** in the reference.

- On `wasm32-unknown-unknown`, whose operating system is `OperatingSystem.Freestanding`, `main` returns the number. The host reads it as the call's result. `silk/platform/wasm/start` accepts a `main` that returns `i32` or `()`, or an `effect fn` that returns `()` and may fail. An `effect fn main() -> i32` is refused there with SEM0225: "Entry point `main` has a result the selected runtime `silk/platform/wasm/start` cannot start; it accepts i32, (), or an Effect producing () with no requirements".
- On Linux without libc, `RawStdout` implements the `Writer` service with `RawLinux.write` on descriptor 1. `RawLinux.write` returns the kernel's raw result; `RawLinux.error` turns it into zero or an error number. `writeVectored`, which writes several slices as one, has no faster way here, so it is left out and its default body calls `writeAll` for each slice. With that provider, the same `report` runs unchanged.
- Everywhere else, `StdoutWriter` from `silk/io/writer_native` does the job. That includes WASI (`OperatingSystem.Wasi`), where it writes with `fd_write`. Both WASI targets also have `libc = "none"`, which is why the second arm tests for Linux too.

`silk/core/target` also has `arch()`, `abi()`, `endianness()`, `pointerBits` and `hasCpuFeature("...")`. `silk/core/compilation` reports the rest of the build request, such as `artifact()`, `safety()` and `threading()`.

## Check every target

On the host, nothing new:

```sh
silk run
```

```
sum of squares to 10: 385
```

`silk check` takes a profile, so each arm gets type-checked against its own target's std lib:

```sh
silk check --profile bare
```

```
Checking squares (x86_64-unknown-linux-gnu)
  load     131 modules, 1 in package         0.02s
  check    2 modules                         0.10s
  borrow   29 bodies                         0.00s
Finished squares in 0.13s
```

```sh
silk check --profile web
```

```
Checking squares (wasm32-unknown-unknown)
  load     139 modules, 1 in package         0.02s
  check    2 modules                         0.02s
  borrow   22 bodies                         0.00s
Finished squares in 0.06s
```

```sh
silk check --profile wasi
```

```
Checking squares (wasm32-wasip1)
  load     139 modules, 1 in package         0.01s
  check    2 modules                         0.11s
  borrow   82 bodies                         0.00s
Finished squares in 0.14s
```

`--target wasm32-wasip2` checks the Preview 2 surface the same way. Run these checks in CI. They are the cheapest way to keep a portable library portable.

## Mistakes the checks catch

Copy the hosted `main`, with its `StdoutWriter` import, into the `Freestanding` arm in place of the one there. The host and WASI builds are unaffected, but the `web` check fails:

```sh
silk check --profile web
```

```
Checking squares (wasm32-unknown-unknown)
  load     139 modules, 1 in package         0.06s
  check    failed: 2 modules, 1 error        0.04s
[wasm32-unknown-unknown]
src/main.silk:25:34: error[SEM0014] Module silk.io.writer_native has no member StdoutWriter
Failed squares in 0.11s
```

`silk/io/writer_native` exists on `wasm32-unknown-unknown`, but declares nothing there. Now try a provider that is declared everywhere but refuses that target. Put `let random = OsRandom.make()` in the `Freestanding` `main`, with `import silk.system.random_native { OsRandom }`. This one `silk check --profile web` does not catch; it passes. The build stops:

```sh
silk build --profile web
```

```
Compiling squares (wasm32-unknown-unknown, web)
  load     143 modules, 1 in package         0.02s
  check    1 module                          0.00s
  codegen  failed: 32 functions, 1 error     0.02s
[wasm32-unknown-unknown]
src/main.silk:28:18: error[SEM0177] OsRandom requires a supported WASI, Darwin or GNU libc profile
Failed squares in 0.05s
```

SEM0177 means library code asked the compiler to stop. The test runs inside `OsRandom.make`, and the error is reported at your call to it. So build each profile in CI as well as checking it. On such a target, write a `Random` provider over whatever entropy the host gives you.

## Build and run the bare WebAssembly module

```sh
silk build --profile web
```

```
Compiling squares (wasm32-unknown-unknown, web)
  load     139 modules, 1 in package         0.02s
  check    1 module                          0.00s
  codegen  31 functions                      0.03s
  borrow   24 bodies                         0.00s
  link     clang                             0.15s
Finished build/llvm/wasm32-unknown-unknown/web/squares in 0.22s
```

The output is a WebAssembly module, built on any host with Clang and `wasm-ld`. It imports nothing and exports two things: its `memory` and `main`. The compiler links in a small runtime of its own: an allocator over linear memory and the byte routines LLVM calls. So `Allocator.systemAllocatorProvider()` works here too. Freed memory is reused, and neighbouring free blocks are merged. The module grows its memory only when no free block is large enough.

Any WebAssembly host can instantiate the module and call `main()`. In Node, save this as `run.mjs`:

```js
import { readFile } from 'node:fs/promises'

const bytes = await readFile('build/llvm/wasm32-unknown-unknown/web/squares')
const { instance } = await WebAssembly.instantiate(bytes, {})
console.log(instance.exports.main())
```

```sh
node run.mjs
```

```
385
```

The std lib also ships a runner, `<silk>/lib/silk/stdlib/host/wasm-runner.mjs`. It runs `main` and exits with its result as the process status, which keeps only the low 8 bits: 385 becomes 129.

```sh
node <silk>/lib/silk/stdlib/host/wasm-runner.mjs build/llvm/wasm32-unknown-unknown/web/squares
echo $?
```

```
129
```

An `export "C" fn` in the program is exported from the module under its name, next to `main`, so the host can call it with numbers. Only scalar and pointer arguments cross that boundary on wasm32; C statics, variadic functions and callbacks are refused.

A wasm32 profile may also set `threading = "multi"`. The module then imports a shared memory, plus the wasi-threads `thread-spawn` function when it starts threads, and `silk/concurrency/thread_native` runs each thread as a Worker under `wasm-runner.mjs`. `max-memory` in the profile caps the memory, for example `max-memory = "256MiB"`; threaded modules default to 1 GiB. Joining a thread frees its stack, so a program that starts and joins threads in a loop does not use up that limit.

## Build and run a WASI module

```sh
silk build --profile wasi
```

```
Compiling squares (wasm32-wasip1, wasi)
  load     139 modules, 1 in package         0.01s
  check    1 module                          0.00s
  codegen  218 functions                     0.18s
  borrow   148 bodies                        0.00s
  link     clang                             0.25s
Finished build/llvm/wasm32-wasip1/wasi/squares in 0.49s
```

This is a WASI Preview 1 command, about 113 KiB. It exports `memory` and `_start`, and imports only what it uses from `wasi_snapshot_preview1`: here `args_get`, `args_sizes_get`, `environ_get`, `environ_sizes_get`, `fd_write` and `proc_exit`. The `StdoutWriter` arm of `main` runs, so the program prints its line itself.

`silk run --profile wasi` builds it and runs it with Wasmtime, giving the program the current directory as `/`. Without Wasmtime it builds and then stops with status 2:

```
silk: running WASI needs wasmtime on PATH or SILK_WASMTIME
```

Any WASI Preview 1 host works. Node has one built in. Save this as `run-wasi.mjs`:

```js
import { readFile } from 'node:fs/promises'
import { WASI } from 'node:wasi'

const wasi = new WASI({ version: 'preview1', returnOnExit: true })
const bytes = await readFile('build/llvm/wasm32-wasip1/wasi/squares')
const { instance } = await WebAssembly.instantiate(bytes, wasi.getImportObject())
process.exitCode = wasi.start(instance)
```

```sh
node --no-warnings run-wasi.mjs
```

```
sum of squares to 10: 385
```

`--no-warnings` hides Node's notice that WASI is experimental. To let the program read files, pass `preopens`, for example `{ '/': '.' }`, to `new WASI`.

### Preview 2 components

`wasm32-wasip2` builds the same core module and then turns it into a WASI 0.2 component. That step runs `wasm-tools` (on `PATH`, or named by `SILK_WASM_TOOLS`) with the Preview 1 command adapter that `SILK_WASI_ADAPTER` points to. Without `wasm-tools`, a profile with `target = "wasm32-wasip2"` checks and compiles, then fails at the link step with status 2:

```
silk: wasm32-wasip2 needs wasm-tools on PATH or SILK_WASM_TOOLS
```

The component targets the std lib's bundled WIT, `<silk>/lib/silk/stdlib/wit/world.wit`, at WASI 0.2.12. Its `command` world is the CLI imports plus outgoing HTTP, and its `http` world is `wasi:http/proxy`. A package can name its own WIT directory and world in its manifest:

```toml
[component]
wit = "wit"
world = "my-world"
```

Only Preview 2 has networking. These modules exist on `wasm32-wasip2` and declare nothing on Preview 1:

- `silk/net/socket_wasi` (`Network`), `silk/net/resolver_wasi` (`WasiResolver`) and `silk/net/datagram_wasi`: TCP, name lookup and UDP through `wasi:sockets`.
- `silk/http/client_wasi`: `WasiHttp`, an HTTP client provider over `wasi:http/outgoing-handler`.
- `silk/http/server_wasi`: `Exchange`, which takes the request and response handles of a `wasi:http` incoming handler.

This guide checked them against `wasm32-wasip2` but could not run a component, since that needs Wasmtime.

## Building without libc

The no-libc profile checks but does not build yet:

```sh
silk build --profile bare
```

```
Compiling squares (x86_64-unknown-linux-gnu, bare)
  load     131 modules, 1 in package         0.03s
  check    1 module                          0.00s
  codegen  failed: 95 functions, 1 error     0.12s
[x86_64-unknown-linux-gnu]
<silk>/lib/silk/stdlib/silk/platform/linux/start.silk:31:5: unsupported[foreign-contract] not supported by the native compiler yet
Failed squares in 0.17s
```

The command exits with status 2.

The compiler cannot generate the raw runtime's entry point yet. Until it can, use the `bare` profile to check code, and keep the code it checks portable.

## API reference

- `silk/core/target`: `Target`, `Arch`, `OperatingSystem`, `Abi`, `Endianness`, `pointerBits`
- `silk/core/compilation`: `Compilation`, `Libc`, `Artifact`
- `silk/platform/linux/syscall`: `RawLinux` (no-libc Linux only)
- `silk/platform/linux/process_inputs`: `ProcessInputs` (no-libc Linux only)
- `silk/platform/linux/mapping`: `Mapping` (no-libc Linux only)
- `silk/platform/linux/start`, `silk/platform/wasm/start`, `silk/platform/wasi/start`, `silk/platform/native/start`: runtime modules, no public items
- `silk/platform/wasi/preview1`, `silk/platform/wasi/preview2`: raw WASI imports, for writing providers
- `silk/net/socket_wasi`, `silk/net/resolver_wasi`, `silk/net/datagram_wasi`, `silk/http/client_wasi`, `silk/http/server_wasi`: networking and HTTP (`wasm32-wasip2` only)
- `silk/concurrency/thread_native`: `NativeThread` (hosted targets, and wasm32 with `threading = "multi"`)
- `<silk>/lib/silk/stdlib/host/wasm-runner.mjs`: runs a wasm32 module in Node or a browser
- `silk/io/writer`: `Writer`, `WriterError`; `silk/io/writer_native`: `StdoutWriter` (hosted and WASI)
- `silk/text/format`: `Format`; `silk/collections/slice`: `Slice`
