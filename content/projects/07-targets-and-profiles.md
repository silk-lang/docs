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

The two Linux targets also have a no-libc form: the same target name with a profile that sets `libc = "none"`.

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

## Compilation operations

| Operation | Purpose |
| --- | --- |
| `target`, `cpu`, `cpuFeatures`, `deployment` | Platform, CPU and minimum OS |
| `libc`, `runtime`, `entry` | Runtime and program entry selection |
| `link`, `codeModel`, `relocation` | Native linking and addressing |
| `optimize`, `debug`, `codegenUnits` | Code generation and debug information |
| `backend` | LLVM, or the direct WebAssembly backend |
| `threading`, `maxMemory`, `stackSize` | Runtime threads and WebAssembly memory limits |
| `platform`, `windows`, `macos`, `wasm` | Platform supply and artifact-specific settings |
| `emit` | Final artifact or an intermediate format |

Each operation accepts a deferred value. Constructors choose executable, shared module, archive, object or test artifacts. Settings are validated during resolution and request replay. Unsupported sanitizer instrumentation, native unwinding and unchecked safety are rejected; they are never silently ignored. Native shared libraries require dynamic linking and PIC.

Optimized executables may use 1 through 256 codegen units. More units can shorten a compiler self-build, while a single unit gives LLVM a larger optimization scope. Measure the workload before changing this setting.

## CPU features at run time

A profile's `cpu` features apply to the whole program, and the program needs a machine that has them. To ship one binary that runs everywhere and goes faster where it can, keep the profile at the baseline, compile the hot function for more features, and call it only after the machine reports them.

- `silk/simd/cpu`, `CpuFeatures`: `CpuFeatures.detect()` asks the running machine; `CpuFeatures.selected()` is the set the profile selects. `has(&features, "avx2")` tests one name, spelled as in `cpu.features`; `containsAll(&features, &other)` tests a whole set.
- `detect()` reads `cpuid` on x86-64 Linux, with or without libc, counting AVX and AVX-512 only when the operating system saves their registers. It reads `getauxval` on arm64 Linux with GNU libc and `sysctlbyname` on arm64 macOS. Elsewhere, such as in a wasm32 module, which cannot ask the engine, it reports the selected set. The result always includes the selected set.
- Every name in the `cpu.features` table above can be tested, `sha` and `aes` included. The examples in Intrinsics include one that runs `sha256rnds2` only where `detect()` reports `sha`.
- Detection is not cached. Call `detect()` once at start and keep the value.
- The directive `@features("avx2")`, on the line before an `unsafe fn`, compiles that function with the listed features, the features they imply and the profile's own. Each call is `unsafe`: the caller has checked the machine. The rules are in Intrinsics, under Functions compiled for CPU features.
- A detected feature does not change `Target.hasCpuFeature`, which reads the profile at compile time, and neither does a function's `@features` list. The `silk/simd/x86` and `silk/simd/aarch64` wrappers and `simd.preferredBytes()` keep their profile answers inside such a function.

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

## WebAssembly and WASI

`wasm32-unknown-unknown` and `wasm64-unknown-unknown` produce core modules. `wasm32-wasip1` produces a WASI core module; `wasm32-wasip2` produces a component and uses `wasm-tools`. WASI launch defaults to Wasmtime, or the graph's explicit `Compilation.runner`.

`Compilation.backend` selects `llvm` or `direct` for WebAssembly. The direct backend emits a module without Clang. Both support `Compilation.wasm` options for imported memory, shared memory, exporting the function table, and command or reactor execution. A reactor exports authored entry points without the implicit command startup.

Memory and stack limits in deferred settings and requests are integer byte counts. Shared memory needs a maximum. Multi-threaded wasm32 builds use atomics, shared memory and the host's worker integration. A Linux compilation selecting libc `none` exposes the raw Linux surface; it must provide an appropriate entry and runtime for a runnable program.

## Profile-guided optimization

Use an explicit compilation definition and request when a script needs specialized compiler settings. The compiler repository's profile-guided build script resolves those settings and compiles the saved request. It does not create a manifest profile or pass JSON settings on the command line.
