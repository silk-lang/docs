# Targets and profiles

A build compiles for one target with one profile. Pick the target with `--target`, the optimization with `--release` or `--optimization`, or both at once with a named profile from `[profiles.<name>]`. Each combination builds into its own directory.

## Targets

| Target | Platform | Default libc |
| --- | --- | --- |
| `aarch64-apple-darwin` | macOS on Apple silicon | `system` |
| `x86_64-unknown-linux-gnu` | Linux on x86-64 | `gnu` |
| `aarch64-unknown-linux-gnu` | Linux on arm64 | `gnu` |
| `wasm32-unknown-unknown` | WebAssembly, no operating system | `none` |

The two Linux targets also have a no-libc form: the same target name with a profile that sets `libc = "none"`.

- `host` means the target the compiler runs on. `--target host` and `[build].targets = ["host"]` accept it; a profile's `target` does not.
- Any other name is refused: `Unsupported target riscv64` (exit 2).

What works for each target with this compiler:

| Target | `silk check` | Executable | Object, archive or IR |
| --- | --- | --- | --- |
| The host's own target | yes | yes | yes |
| Another macOS or Linux target | yes | no: `Cannot link an executable for target aarch64-apple-darwin on host x86_64-unknown-linux-gnu` | yes |
| Linux without libc | yes | not yet (see below) | `kind = "object"` builds |
| `wasm32-unknown-unknown` | yes | yes, a WebAssembly module, on any host (see below) | yes |

To cross-compile, set `[build].stage = "object"` (or `llvm-ir`, `assembly`, `llvm-bitcode`), or `[package].kind = "object"` or `"static-library"`, and link the result with your own toolchain:

```sh
silk build --target aarch64-unknown-linux-gnu
```

```
Compiling tiny (aarch64-unknown-linux-gnu, debug)
  load     51 modules, 1 in package          0.06s
  check    1 module                          0.00s
  codegen  362 functions                     0.20s
  borrow   114 bodies                        0.00s
  link     clang                             0.18s
Finished build/llvm/aarch64-unknown-linux-gnu/debug/tiny.o in 0.50s
```

With an object stage, the `link` row is Clang compiling the object; nothing is linked.

## Choosing targets

- `silk build` and `silk check` take `--target` more than once and run once per target. Without it they use `[build].targets`, else the host.
- `silk run` and `silk test` take one `--target`.
- The std lib surface changes per target. `silk check --target <name>` reports what does not exist there. See **The standard library**.

```sh
silk check --target aarch64-apple-darwin --target aarch64-unknown-linux-gnu --target wasm32-unknown-unknown
```

```
Checking tiny (aarch64-apple-darwin)
  load     51 modules, 1 in package          0.06s
  check    2 modules                         0.12s
  borrow   98 bodies                         0.00s
Finished tiny in 0.18s
Checking tiny (aarch64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    2 modules                         0.10s
  borrow   98 bodies                         0.00s
Finished tiny in 0.14s
Checking tiny (wasm32-unknown-unknown)
  load     47 modules, 1 in package          0.05s
  check    2 modules                         0.04s
  borrow   26 bodies                         0.00s
Finished tiny in 0.10s
```

Each target is a separate unit with its own rows and its own last line. On a terminal, each finished target collapses to one line.

Code can ask which target and profile it is built for at compile time: `silk/target` (`Target`) and `silk/compilation` (`Compilation`). See **Static control flow and reflection** in the reference.

## Optimization profiles

Without a named profile, a build uses one of three optimization profiles.

| Selected by | Optimization | Debug info | Directory |
| --- | --- | --- | --- |
| default, or `--optimization debug` | none (`-O0`) | yes | `debug` |
| `--release`, or `--optimization release` | speed (`-O2`) | no | `release` |
| `--optimization release-with-debug` | speed (`-O2`) | yes | `release-with-debug` |

```sh
silk build --release
```

```
Compiling tiny (x86_64-unknown-linux-gnu, release)
  load     51 modules, 1 in package          0.06s
  check    1 module                          0.00s
  codegen  362 functions                     0.20s
  borrow   114 bodies                        0.00s
  link     clang                             0.45s
Finished build/llvm/x86_64-unknown-linux-gnu/release/tiny in 0.76s
```

The heading names the profile in parentheses after the target.

## Named profiles

A named profile fixes the target and every other build setting in one place:

```toml
[profiles.fast]
target = "x86_64-unknown-linux-gnu"
optimization = "speed"
debug = false
```

```sh
silk build --profile fast
```

```
Compiling tiny (x86_64-unknown-linux-gnu, fast)
  load     51 modules, 1 in package          0.05s
  check    1 module                          0.00s
  codegen  362 functions                     0.22s
  borrow   114 bodies                        0.00s
  link     clang                             0.45s
Finished build/llvm/x86_64-unknown-linux-gnu/fast/tiny in 0.79s
```

- A named profile builds into a directory with its own name, beside `debug` and `release`.
- `target` defaults to the compiler's host. Every other field has a default too, so a profile turns on optimization only when it says `optimization = "speed"`.
- `dev` and `release` exist without a table. `dev` builds for the host without optimization and with debug information; `release` builds with `optimization = "speed"` and without it. A `[profiles.dev]` or `[profiles.release]` table replaces the built-in one.
- `[build].profile = "fast"` makes it the default for builds with no `--target`, `--profile` or `--profile-input`.
- `--profile-input '<json>'` passes a whole profile as JSON, with the same fields, except that `code-model` and `max-memory` are spelled `codeModel` and `maxMemory`. Its directory comes from its optimization and debug settings.
- A named or JSON profile cannot be combined with `--target`, `--release` or `--optimization`:

```
Named/full profiles conflict with target and optimization flags
```

- A profile can also set package parameter values with `config.main.port = 9090`; they win over `[config]`. See **Package parameters** in the reference and chapter 11 of the book.

## Profile fields

The manifest page lists every field and its values. The native build applies these:

| Field | Effect |
| --- | --- |
| `target` | The target. |
| `optimization` | `none` passes `-O0` to Clang; `speed` passes `-O2`. |
| `debug` | `true` passes `-g`. |
| `libc` | Chooses the runtime from the std lib catalog. Linux takes `gnu` or `none`; macOS takes `system` (or `none` for object and archive output only); wasm takes `none`. |
| `runtime` | `{ kind = "named", name = "..." }` picks a runtime listed in `[unstable].composition`; `{ kind = "none" }` builds without one, so an executable must export its own C `main`. `"default"` and `"none"` take no other key, so `{ kind = "default", name = "x" }` is refused as `profiles.u.runtime.name is not a supported field`. See Build outputs and native linking. |
| `relocation` | `pic` or `static` code for object, archive and IR output. |
| `deployment` | macOS minimum version for the link. Only `aarch64-apple-darwin` takes it. |
| `cpu` | `features` turns on each listed CPU feature in Clang. `model` accepts the target's default, `x86-64` on x86-64 Linux and `generic` elsewhere; x86-64 Linux also takes the levels `x86-64-v2`, `x86-64-v3` and `x86-64-v4`. |
| `code-model` | `large` passes `-mcmodel=large`. x86-64 targets only. |
| `link` | `static` links a static executable (`-static`) with code that is not position independent. |
| `artifact` | Must name the same form as `[package].kind`. Set the output form there. |
| `threading` | `multi` on wasm32 builds with atomics and a shared memory (see below). Refused on other targets. |
| `max-memory` | wasm32 only: the most linear memory the module may grow to, such as `"256MiB"`. Bytes, `KiB`, `MiB` or `GiB`; a multiple of 64 KiB and at most 4 GiB. |

`cpu.features` takes these names:

| Target | Features |
| --- | --- |
| x86-64 Linux | `aes`, `avx`, `avx2`, `avx512bw`, `avx512cd`, `avx512dq`, `avx512f`, `avx512vbmi`, `avx512vl`, `bmi`, `bmi2`, `cx16`, `f16c`, `fma`, `lzcnt`, `movbe`, `pclmul`, `popcnt`, `sha`, `sse2`, `sse3`, `sse4.1`, `sse4.2`, `ssse3`, `xsave` |
| arm64 | `aes`, `crc`, `crypto`, `dotprod`, `fp-armv8`, `fullfp16`, `i8mm`, `lse`, `neon`, `rdm`, `sha2`, `sha3` |
| wasm32 | `atomics`, `bulk-memory`, `mutable-globals`, `relaxed-simd`, `sign-ext`, `simd128` |

A feature also turns on the features it implies, so `avx2` brings `avx` and the SSE levels below it. A level model brings its features: `x86-64-v3` includes `avx2`, `fma` and `bmi2`, and `x86-64-v4` the AVX-512 set. SSE2 on x86-64 and NEON on arm64 are always on. Code can test any of them with `Target.hasCpuFeature`, `silk/simd` uses them to pick a vector width, and `silk/arch` to pick an instruction (see SIMD vectors and masks in Values and primitive types). To test the running machine instead, see CPU features at run time below. With this profile, `Target.hasCpuFeature("avx2")` is `true`:

```toml
[profiles.fast]
target = "x86_64-unknown-linux-gnu"

[profiles.fast.cpu]
features = ["avx2"]
```

`link = "static"` on Linux gives a static executable:

```toml
[profiles.fast]
target = "x86_64-unknown-linux-gnu"
link = "static"
```

```sh
silk build --profile fast
file build/llvm/x86_64-unknown-linux-gnu/fast/tiny
```

```
Compiling tiny (x86_64-unknown-linux-gnu, fast)
  load     51 modules, 1 in package          0.05s
  check    1 module                          0.00s
  codegen  362 functions                     0.21s
  borrow   114 bodies                        0.00s
  link     clang                             0.39s
Finished build/llvm/x86_64-unknown-linux-gnu/fast/tiny in 0.72s
build/llvm/x86_64-unknown-linux-gnu/fast/tiny: ELF 64-bit LSB executable, x86-64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=800f30f73d46b54cc9ec80f7f6bbea4225a993b1, for GNU/Linux 3.2.0, not stripped
```

The other fields are valid values that the native compiler cannot build yet. Rather than ignore them, it refuses a profile that changes them from the default:

| Field | Refused value | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- | --- |
| `sanitizers` | any non-empty list | `profiles.fast.sanitizers is not supported by the native compiler yet` |
| `unwind` | `"native"` | `profiles.fast.unwind = "native" is not supported by the native compiler yet` |
| `safety` | `"unchecked"` | `profiles.fast.safety = "unchecked" is not supported by the native compiler yet` |
| `threading` | `"multi"`, except on wasm32 | `profiles.fast.threading = "multi" is not supported by the native compiler yet` |
| `entry` | `{ kind = "none" }` or `{ kind = "named", ... }` | `profiles.fast.entry is not supported by the native compiler yet` |
| `code-model` | `"large"` on an arm64 target | `profiles.arm.code-model = "large" is not supported by the native compiler yet` |

`--profile-input` is checked the same way. Its errors name the flag, not the manifest, and the field as `--profile-input.<field>`:

```sh
silk build --profile-input '{"target":"x86_64-unknown-linux-gnu","safety":"unchecked"}'
```

```
Invalid --profile-input: --profile-input.safety = "unchecked" is not supported by the native compiler yet
```

The combinations below and bad values are refused the same way, as in `Invalid --profile-input: UnsupportedCombination: --profile-input.libc = "system"`. JSON that does not parse is `Invalid --profile-input JSON`. All of these exit with status 2.

These combinations are refused when the manifest is read:

| Combination | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- |
| `libc` not valid for the target | `UnsupportedCombination: profiles.fast.libc = "system"` |
| `deployment` on a Linux target | `UnsupportedCombination: profiles.fast.deployment = "14.0"` |
| wasm with `link`, `relocation`, `code-model`, `unwind`, `deployment` or `sanitizers` changed from its defaults | `UnsupportedCombination: profiles.web.target = "wasm32-unknown-unknown"` |
| `sanitizers` with both `address` and `thread` | `UnsupportedCombination: profiles.fast.sanitizers` |
| `thread` sanitizer without `threading = "multi"` | `UnsupportedCombination: profiles.fast.threading` |
| macOS executable with `link = "static"` | `UnsupportedCombination: profiles.mac.link = "static"` |
| `target = "host"` | `UnsupportedCombination: profiles.fast.target = "host"` |
| `max-memory` on a target other than wasm32 | `UnsupportedCombination: profiles.hostmem.max-memory = "256MiB"` |
| `cpu.model` other than the target's default | `UnsupportedCombination: profiles.fast.cpu.model = "znver3"` |
| a `cpu.features` entry the target does not have | `UnsupportedCombination: profiles.fast.cpu.features` |
| `artifact` different from `[package].kind` | `UnsupportedCombination: profiles.fast.artifact = "object" differs from [package].kind = "executable"; set [package].kind to choose the artifact, and omit the profile's artifact or write it as "executable"` |

The profile names in these messages are the ones used to produce them; yours shows its own. LINE is the line of the field, or of the `[profiles.<name>]` header when the field is missing, as for the thread sanitizer without `threading`. A field inside an inline table written over several lines, such as `features` in `cpu = { model = "x86-64",` followed by `features = ["avx512"] }` on the next line, is reported at the line that writes it.

## CPU features at run time

A profile's `cpu` features apply to the whole program, and the program needs a machine that has them. To ship one binary that runs everywhere and goes faster where it can, keep the profile at the baseline, compile the hot function for more features, and call it only after the machine reports them.

- `silk/cpu`, `CpuFeatures`: `CpuFeatures.detect()` asks the running machine; `CpuFeatures.selected()` is the set the profile selects. `has(&features, "avx2")` tests one name, spelled as in `cpu.features`; `containsAll(&features, &other)` tests a whole set.
- `detect()` reads `cpuid` on x86-64 Linux, with or without libc, counting AVX and AVX-512 only when the operating system saves their registers. It reads `getauxval` on arm64 Linux with GNU libc and `sysctlbyname` on arm64 macOS. Elsewhere, such as in a wasm32 module, which cannot ask the engine, it reports the selected set. The result always includes the selected set.
- Every name in the `cpu.features` table above can be tested, `sha` and `aes` included. The examples in Intrinsics include one that runs `sha256rnds2` only where `detect()` reports `sha`.
- Detection is not cached. Call `detect()` once at start and keep the value.
- `with Intrinsic.machine(features: ("avx2",))` on an `unsafe fn` compiles that function with the listed features, the features they imply and the profile's own. Each call is `unsafe`: the caller has checked the machine. The rules are in Intrinsics, under Functions compiled for CPU features.
- A detected feature does not change `Target.hasCpuFeature`, which reads the profile at compile time, and neither does a function's `features` list. The `silk/arch` wrappers and `simd.preferredBytes()` keep their profile answers inside such a function.

The same portable loop, compiled twice. In a release build the optimizer inlines `total` into `totalAvx2` and vectorizes it with 32-byte AVX2 registers; the rest of the program stays at the default x86-64 level:

```silk
import silk.cpu { CpuFeatures }
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }
import silk.u32
import silk.usize

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
unsafe fn totalAvx2(values: &[u32]) -> u32 with Intrinsic .machine (features: ("avx2",)) {
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

On a machine without it, the program prints `portable kernel: 499500`. The `features` list names x86-64 features, so a program that also builds for other targets puts `totalAvx2` and its call under `static if Target.arch() == Arch.X86_64`; a name the target lacks is SEM0242.

## Linux without libc

A no-libc program uses the `silk.raw_start` runtime and `silk.raw_linux` system calls. Its `main` takes the process inputs:

```silk
import silk.raw_process_inputs { ProcessInputs }

pub fn main(inputs: &ProcessInputs) -> i32 {
  return 7
}
```

```toml
[build]
profile = "bare"

[unstable.composition]
runtimes = [{ name = "raw", module = "silk/raw_start" }]
defaults = ["raw"]

[profiles.bare]
target = "x86_64-unknown-linux-gnu"
libc = "none"
link = "static"
relocation = "static"
```

`silk check` accepts this package. `silk build` stops in the runtime's entry point, which this compiler cannot generate yet:

```
Compiling bare (x86_64-unknown-linux-gnu, bare)
  load     44 modules, 1 in package          0.05s
  check    1 module                          0.00s
  codegen  failed: 12 functions, 1 error     0.00s
[x86_64-unknown-linux-gnu]
<silk>/lib/silk/stdlib/silk/raw_start.silk:29:5: unsupported[foreign-contract] not supported by the native compiler yet
Failed bare in 0.10s
```

The command exits with status 2.

Without the composition, `libc = "none"` finds no runtime in the std lib catalog: `silk: the build selects no single runtime (ARTIFACT-001)`.

## WebAssembly

`silk build --target wasm32-unknown-unknown`, or a profile with that target, links a WebAssembly module on any host. Clang links it freestanding with a small runtime the compiler carries: an allocator over linear memory, which reuses freed memory and grows the memory only when it must, and the byte routines LLVM calls. Every wasm32 module is compiled with bulk memory, which that runtime uses for copies and fills, so a profile need not list `bulk-memory` in `cpu.features`. Clang 18 builds it. The module imports nothing. It exports its `memory`, `main`, and every `export "C"` function under its own name. The program `silk init` writes does not build for wasm32 as it is, because it imports `silk.os_logger`, which needs an operating system to write to; a wasm32 program starts from a `main` like this one:

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
```

```
Compiling web (wasm32-unknown-unknown, debug)
  load     47 modules, 1 in package          0.07s
  check    1 module                          0.00s
  codegen  32 functions                      0.02s
  borrow   24 bodies                         0.00s
  link     clang                             0.10s
Finished build/llvm/wasm32-unknown-unknown/debug/web in 0.23s
```

A host instantiates it with an empty import object and calls `main()` (42) or `add(2, 3)` (5). `node <silk>/lib/silk/stdlib/host/wasm-runner.mjs <module>` runs `main` and exits with its result. On wasm32, a C function takes and returns scalars and pointers only; C statics, variadic functions and callbacks are refused. `kind = "object"` and `"static-library"` build too.

A wasm32 profile may set `threading = "multi"`:

```toml
[profiles.threads]
target = "wasm32-unknown-unknown"
threading = "multi"
max-memory = "256MiB"
```

The module is compiled with atomics and bulk memory and imports a shared memory (`env.memory`) and `wasi.thread-spawn`, so `silk/native_thread` works. `wasm-runner.mjs` creates the memory and runs `main` and each thread in its own Worker. `max-memory` sets the memory's maximum; a threaded module defaults to 1 GiB. Joining a thread frees its stack. A value that is not a multiple of 64 KiB, or above 4 GiB, is `InvalidInput: profiles.threads.max-memory = "100KiB"`. A threaded module needs Clang 19 or newer, because Clang 18 crashes on it or writes a module the host rejects; `silk build` refuses an older Clang and names it.

The **No-libc Linux and WebAssembly** guide builds a portable program for wasm32 and runs it in Node.

## See also

The manifest, The standard library, Build outputs and native linking; **Package parameters**, **Static control flow and reflection** and **Intrinsics** in the reference; chapter 11 of the book; `silk/cpu`, `silk/arch/x86`, `silk/arch/aarch64`, `silk/arch/wasm`.
