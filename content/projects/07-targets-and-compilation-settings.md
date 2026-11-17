# Targets and compilation settings

Commands embed the standard build `Options`. `--target` selects a platform, `--optimization` selects `none`, `speed` or `size`, and `--debug true|false` selects debug information. `--release` chooses speed optimization without debug information. More specialized settings belong to a `Compilation` in the root's tasks.

## Targets

| Target | Platform | Default libc |
| --- | --- | --- |
| `aarch64-apple-darwin` | macOS on Apple silicon | `system` |
| `x86_64-apple-darwin` | macOS on Intel | `system` |
| `x86_64-unknown-linux-gnu` | Linux on x86-64 | `gnu` |
| `aarch64-unknown-linux-gnu` | Linux on arm64 | `gnu` |
| `x86_64-pc-windows-msvc` | Windows on x86-64 | `system` |
| `wasm32-unknown-unknown` | WebAssembly, no operating system | `none` |
| `wasm64-unknown-unknown` | 64-bit WebAssembly (memory64), no operating system | `none` |
| `wasm32-wasip1` | WebAssembly with WASI Preview 1, a core module | `none` |
| `wasm32-wasip2` | WebAssembly with WASI Preview 2, a component | `none` |

The two Linux targets also have a no-libc form: the same target name with a compilation whose `libc` setting is `none`.

- `host` means the target the compiler runs on. `--target host` accepts it; resolved requests contain the concrete target.
- Any other name is refused: `Unsupported target riscv64` (exit 2).

What works for each target with this compiler:

| Target | `silk check` | Executable | `silk run` and `silk test` |
| --- | --- | --- | --- |
| macOS, Linux and Windows | yes | yes, from any host (see Cross-compiling) | on a host of that target only |
| Linux without libc | yes | not yet (see below) | no |
| `wasm32-unknown-unknown`, `wasm64-unknown-unknown` | yes | yes, a WebAssembly module, on any host (see below) | no; run the module with `wasm-runner.mjs` |
| `wasm32-wasip1`, `wasm32-wasip2` | yes | yes, on any host; `wasm32-wasip2` needs `wasm-tools` (see WASI below) | yes, with Wasmtime |

Objects, static archives, LLVM IR and assembly build for every target. `silk run` for another target stops with `Cannot run target aarch64-apple-darwin on host x86_64-unknown-linux-gnu` (exit 2).

## Choosing and crossing targets

The built-in build command accepts repeated `--target` arguments. Without a target it uses the host. A custom command decides its default targets and constructs one compilation for each. `Compilation.fromPackage` accepts options selecting at most one target.

```sh
silk build --target aarch64-apple-darwin --release
silk check --target wasm32-unknown-unknown
silk build --optimization size --debug false
```

Outputs live in `build/<target>/<mode>/<name>`. The workspace can choose the enclosing output directory.

Cross-target LLVM links use the bundled Clang and LLD tools. Basic macOS and Linux programs use Silk's system-library stubs; a program with native libraries or a static Linux link needs the target's SDK or sysroot. `Compilation.platform` supplies it. Resolution captures automatic host discovery in the request. Windows programs use system DLL imports and the bundled COFF linker. Objects and intermediate output need no target SDK.

## Source facts and backend settings

The program's target, CPU features, runtime, libc, safety and threading settings determine its source-visible compilation facts. `silk.core.target.Target` and `silk.core.compilation.Compilation` expose these during static evaluation.

`Compilation.optimize` and `Compilation.debug` select the program's backend defaults. `Package.optimize` and `Package.debug` override a dependency's generated code without changing those program-wide facts. A generic instance uses the optimization and debug settings of the package that defines it. Mixed package modes compile separate units without cross-package inlining.

A dev command can keep its own code unoptimized and optimize a renderer, container library or development-tool engine. The semantic cache still sees one set of source facts.

## Compilation settings

Everything about how a program is compiled, beyond what `--target`, `--optimization`, `--debug` and `--release` choose, is a setting on its `Compilation` in a root command. Each takes a deferred value; for a value you know, wrap it with `run Deferred<T>.value(...)`.

| Setting | Values and effect |
| --- | --- |
| `target` | A target from the table above. |
| `optimize` | `Optimize.None` passes `-O0` to Clang, `Optimize.Speed` `-O2` and `Optimize.Size` `-Oz`. |
| `debug` | `true` writes debug information (`-g`). |
| `cpu` | The CPU model: the target's default, `x86-64` on x86-64 targets and `generic` elsewhere. x86-64 targets also take the levels `x86-64-v2`, `x86-64-v3` and `x86-64-v4`. `x86-64-v4` needs Clang 23 or newer. |
| `cpuFeatures` | A list of feature names, from the table below, turned on in Clang. |
| `libc` | Linux takes `gnu` or `none`; macOS takes `system` (or `none` for object and archive output only); Windows takes `system`; wasm takes `none`. |
| `runtime`, `entry` | The runtime from `[unstable.composition]`, such as `raw`, and how the program starts. See Runtime composition in **Build outputs and native linking**. |
| `link` | `static` links a static executable (`-static`) with code that is not position independent. |
| `relocation` | `pic` or `static` code. On Linux it also decides whether an executable is position independent: the default, `static`, links a non-PIE executable, and `pic` links a PIE. macOS output defaults to `pic`. |
| `codeModel` | `large` passes `-mcmodel=large`. x86-64 targets only. |
| `deployment` | The minimum macOS version for the link. Only the two macOS targets take it. |
| `backend` | `llvm`, the default, or `direct` for WebAssembly without Clang. `--backend` on the command line sets it for the built-in commands. |
| `codegenUnits` | 1 to 256: how many units an optimized executable splits into. More units can shorten the build of a large program; one unit gives LLVM the widest scope. Measure before changing it. |
| `threading` | `multi` on `wasm32-unknown-unknown` builds with atomics and a shared memory. Refused elsewhere. |
| `maxMemory`, `stackSize` | WebAssembly limits, in bytes: the most linear memory the module may grow to, a multiple of 64 KiB and at most 4 GiB, and the stack size. |
| `safety`, `unwind`, `sanitizers` | Valid values the compiler cannot build yet: `unchecked`, `native` and any sanitizer are refused rather than ignored. |
| `platform`, `windows`, `macos`, `wasm` | Platform supplies and artifact-specific settings, such as a WebAssembly module's imported memory or reactor mode. |
| `emit` | The final artifact or an intermediate stage. See **Build outputs and native linking**. |

`cpuFeatures` takes these names:

| Target | Features |
| --- | --- |
| x86-64 | `aes`, `avx`, `avx2`, `avx512bw`, `avx512cd`, `avx512dq`, `avx512f`, `avx512vbmi`, `avx512vl`, `bmi`, `bmi2`, `cx16`, `f16c`, `fma`, `lzcnt`, `movbe`, `pclmul`, `popcnt`, `sha`, `sse2`, `sse3`, `sse4.1`, `sse4.2`, `ssse3`, `xsave` |
| arm64 | `aes`, `crc`, `crypto`, `dotprod`, `fp-armv8`, `fullfp16`, `i8mm`, `lse`, `neon`, `rdm`, `sha2`, `sha3` |
| wasm32 | `atomics`, `bulk-memory`, `mutable-globals`, `relaxed-simd`, `sign-ext`, `simd128` |

A feature also turns on the features it implies, so `avx2` brings `avx` and the SSE levels below it. A level brings its features: `x86-64-v3` includes `avx2`, `fma` and `bmi2`, and `x86-64-v4` the AVX-512 set. SSE2 on x86-64 and NEON on arm64 are always on. Code tests them with `Target.hasCpuFeature`, `silk/simd/simd` uses them to pick a vector width, and `silk/simd/x86` and `silk/simd/aarch64` to pick an instruction.

This command builds a static AVX2 executable for x86-64 Linux:

```silk
Tasks.Fast { options } => {
  let mut features = List<String>.make()
  run features.append(run String.copy("avx2"))
  let base = run Compilation.fromPackage(&options)
  let targeted = run base.target(run Deferred<String>.value(run String.copy("x86_64-unknown-linux-gnu")))
  let tuned = run targeted.cpuFeatures(run Deferred<List<String>>.value(move features))
  let fast = run tuned.link(run Deferred<String>.value(run String.copy("static")))
  let graph = run Build.make()
  drop run (run graph.add(move fast)).compile()
}
```

```sh
silk task fast --release
file build/x86_64-unknown-linux-gnu/release/tiny
```

```
build/x86_64-unknown-linux-gnu/release/tiny: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked, for GNU/Linux 3.2.0, not stripped
```

In that program `Target.hasCpuFeature("avx2")` is `true`.

Settings are checked when the compilation is resolved, before anything compiles. A value the compiler cannot build, or a combination that does not exist, stops the command with status 1, naming the setting:

```
error: cannot resolve the compilation definition: silk: invalid compilation settings: UnsupportedCombination: cpu.features
```

| Refused | Names |
| --- | --- |
| A CPU model the target does not have, such as `znver3` | `cpu.model` |
| A feature name the target does not have | `cpu.features` |
| `libc` not valid for the target, such as `system` on Linux | `libc` |
| `deployment` on a target that is not macOS | `deployment` |
| `threading` `multi` on a native target | `threading` |
| `safety` `unchecked`, `unwind` `native`, any sanitizer | `safety`, `unwind`, `sanitizers` |
| `backend` `direct` on a native target | `backend = "direct" builds WebAssembly targets only; choose a wasm target, such as wasm32-wasip1, or backend = "llvm"` |

Without a composition, `libc` `none` finds no runtime in the std lib catalog: `the build selects no single runtime (ARTIFACT-001)`. The guide **No-libc Linux and WebAssembly** builds one program for raw Linux, bare WebAssembly and WASI.

## CPU features at run time

A compilation's `cpu` features apply to the whole program, and the program needs a machine that has them. To ship one binary that runs everywhere and goes faster where it can, keep the compilation at the baseline, compile the hot function for more features, and call it only after the machine reports them.

- `silk/simd/cpu`, `CpuFeatures`: `CpuFeatures.detect()` asks the running machine; `CpuFeatures.selected()` is the set the compilation selects. `has(&features, "avx2")` tests one name, spelled as in `Compilation.cpuFeatures`; `containsAll(&features, &other)` tests a whole set.
- `detect()` reads `cpuid` on x86-64 Linux, with or without libc, counting AVX and AVX-512 only when the operating system saves their registers. It reads `getauxval` on arm64 Linux with GNU libc and `sysctlbyname` on arm64 macOS. Elsewhere, such as in a wasm32 module, which cannot ask the engine, it reports the selected set. The result always includes the selected set.
- Every name in the CPU features table above can be tested, `sha` and `aes` included. The examples in Intrinsics include one that runs `sha256rnds2` only where `detect()` reports `sha`.
- Detection is not cached. Call `detect()` once at start and keep the value.
- The directive `@features("avx2")`, on the line before an `unsafe fn`, compiles that function with the listed features, the features they imply and the compilation's own. Each call is `unsafe`: the caller has checked the machine. The rules are in Intrinsics, under Functions compiled for CPU features.
- A detected feature does not change `Target.hasCpuFeature`, which reads the compilation's settings at compile time, and neither does a function's `@features` list. The `silk/simd/x86` and `silk/simd/aarch64` wrappers and `simd.preferredBytes()` keep their compilation answers inside such a function.

The same portable loop, compiled twice. In a release build the optimizer inlines `total` into `totalAvx2` and vectorizes it with 32-byte AVX2 registers; the rest of the program stays at the default x86-64 level:

```silk
import silk.simd.cpu { CpuFeatures }
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }
import silk.num.u32
import silk.num.usize

// The portable kernel: every machine can run it.
fn total(values: &[u32]) -> u32 {
  let mut sum: u32 = 0
  let mut at: usize = 0
  while at < values.length {
    sum = u32.wrappingAdd(sum, values[at])
    at = at + 1
  }
  return sum
}

// The same kernel compiled for AVX2. A caller must know the machine has it.
@features("avx2")
unsafe fn totalAvx2(values: &[u32]) -> u32 {
  return total(values)
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let mut values: [u32; 1000] = [0; 1000]
  let mut at: usize = 0
  while at < 1000 {
    values[at] = usize.toU32(at)
    at = at + 1
  }
  let machine = CpuFeatures.detect()
  if CpuFeatures.has(&machine, "avx2") {
    let sum = unsafe totalAvx2(&values)
    run Effect.log("avx2 kernel: {sum}\n", &.{ sum: sum }) |> Effect.provideMut(&mut logger)
  } else {
    let sum = total(&values)
    run Effect.log("portable kernel: {sum}\n", &.{ sum: sum }) |> Effect.provideMut(&mut logger)
  }
}
```

`silk run --release` prints, after the build lines, on a machine with AVX2:

```
avx2 kernel: 499500
```

On a machine without it, the program prints `portable kernel: 499500`. The `@features` list names x86-64 features, so a program that also builds for other targets puts `totalAvx2` and its call under `static if Target.arch() == Arch.X86_64`; a name the target lacks is SEM0242.

## WebAssembly

`silk build --target wasm32-unknown-unknown` links a WebAssembly module on any host, as `build/wasm32-unknown-unknown/<mode>/<name>.wasm`. Clang links it freestanding with a small runtime the compiler carries: an allocator over linear memory, which reuses freed memory and grows the memory only when it must, and the byte routines LLVM calls. Every wasm32 module is compiled with bulk memory, which that runtime uses for copies and fills. The module imports nothing unless the program uses the host: `ConsoleLogger` imports `silk.console`, and `OsRandom`, `OsSystemClock` and `OsMonotonicClock` import `silk.random` and `silk.clock`, which `<silk>/lib/silk/stdlib/host/wasm-runner.mjs` supplies. It exports its `memory`, `main`, and every `export "C"` function under its own name. The program `silk init` writes does not build for wasm32 as it is, because it imports `silk.io.logger_native`, which needs an operating system; a wasm32 program starts from a `main` like this one:

```silk
export "C" fn add(left: i32, right: i32) -> i32 {
  return left + right
}

pub fn main() -> i32 {
  return 42
}
```

```sh
silk build --target wasm32-unknown-unknown
node <silk>/lib/silk/stdlib/host/wasm-runner.mjs build/wasm32-unknown-unknown/dev/web.wasm
```

The runner calls `main` and exits with 42; a host of your own instantiates the module with an empty import object and can call `add(2, 3)`. The module also exports `silk_report` and `silk_report_length`, a buffer that holds the report of a trap or an unhandled error, which the runner prints. A dev build writes `web.wasm.debug.wasm` (the module with its DWARF) and `web.wasm.map` (a source map) beside the module; see **Debugging**. On wasm32 a C function takes and returns scalars and pointers only; C statics, variadic functions and callbacks are refused.

A `wasm32-unknown-unknown` compilation may set `threading` to `multi`. The module is then compiled with atomics and imports a shared memory (`env.memory`), plus `wasi.thread-spawn` when the program starts threads, so `silk/concurrency/thread_native` works. `wasm-runner.mjs` creates the memory and runs `main` and each thread in its own Worker. `maxMemory` sets the memory's maximum; a threaded module defaults to 1 GiB. `Compilation.wasm` selects an imported or shared memory, an exported function table, and command or reactor execution; a reactor exports its entry points without the command startup.

## The direct WebAssembly backend

`--backend direct`, or `Compilation.backend` set to `direct`, builds a WebAssembly target without LLVM or Clang: the compiler writes the module itself. It builds `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2` and `wasm64-unknown-unknown`, including SIMD and threaded modules:

```sh
silk build --target wasm32-wasip1 --backend direct
```

- There is no `link` row: the module is written as it is generated, to the same path as an LLVM build.
- Each function body is translated once and reused across builds, so an edit rebuilds only what changed. An optimized direct build inlines calls and runs its own passes, but its code still runs several times slower than LLVM's: use it for fast edit loops and where LLVM is not available, such as in a browser, and the default backend for a release you ship.
- The module has the same imports and exports as an LLVM build, so `wasm-runner.mjs`, Wasmtime and Node run it the same way. A `wasm32-wasip2` component still needs `wasm-tools` and the Preview 1 adapter.
- For a native target it is refused: `backend = "direct" builds WebAssembly targets only`.
- The playground on this site builds with the direct backend, with the compiler itself running in the browser.

## WASI

`wasm32-wasip1` and `wasm32-wasip2` build programs for a WASI runtime such as Wasmtime. Both use the `wasi` runtime, `silk/platform/wasi/start`, which gives `main` standard output, files, arguments and the environment through WASI. Unlike `wasm32-unknown-unknown`, the program `silk init` writes builds and runs as it is.

- A `wasm32-wasip1` executable is a core module that exports `memory` and `_start` and imports only `wasi_snapshot_preview1` functions, so any Preview 1 host runs it, Node's `node:wasi` included.
- `silk run` and `silk test` on a WASI target run the module with `wasmtime run`, giving it the current directory as `/`. `SILK_WASMTIME` names another `wasmtime`, and `Compilation.runner` another runner. Without one: `silk: running WASI needs wasmtime on PATH or SILK_WASMTIME` (exit 2).
- A trap or an unhandled error prints the same report as on a native target. `silk run` and `silk test` set `WASMTIME_BACKTRACE_DETAILS=1`, so Wasmtime's trace shows each frame's Silk name and source line. See **Debugging**.
- A `wasm32-wasip2` executable is a component. The compiler links a Preview 1 core module, then turns it into a component with `wasm-tools component new` and the Preview 1 command adapter, `wasi_snapshot_preview1.command.wasm` from the Wasmtime release, which `SILK_WASI_ADAPTER` must name. `SILK_WASM_TOOLS` names another `wasm-tools`. Without them the link fails with `silk: wasm32-wasip2 needs wasm-tools on PATH or SILK_WASM_TOOLS` or `silk: wasm32-wasip2 needs SILK_WASI_ADAPTER pointing to wasi_snapshot_preview1.command.wasm` (exit 2).
- The component implements the WASI command world in the std lib's `wit/` folder, unless the manifest names its own with `[component]`; see The manifest.
- Sockets, name resolution and the HTTP client and server exist only on `wasm32-wasip2`. See The standard library.

## Profile-guided optimization

Two environment variables pass Clang's instrumentation PGO flags to a native build:

| Variable | Clang flag |
| --- | --- |
| `SILK_PROFILE_GENERATE=<dir>` | `-fprofile-generate=<dir>`: the program writes raw profiles into `<dir>` when it runs |
| `SILK_PROFILE_USE=<file>` | `-fprofile-use=<file>`: the build reads a merged profile |

```sh
SILK_PROFILE_GENERATE=/home/you/pgo silk build --release
./build/x86_64-unknown-linux-gnu/release/hello
llvm-profdata merge -o /home/you/hello.profdata /home/you/pgo/*.profraw
SILK_PROFILE_USE=/home/you/hello.profdata silk build --release
```

Run the instrumented program on typical input before merging. `llvm-profdata` comes with LLVM; use the one that matches your Clang. Both variables are part of what a build depends on, so changing them, or the profile file, rebuilds.

## See also

Build outputs and native linking, Tasks and build graphs, No-libc Linux and WebAssembly in the Guides, Debugging in Tools.
