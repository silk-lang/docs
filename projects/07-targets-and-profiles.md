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
| Linux without libc | yes | not yet (see below) | `artifact = "object"` builds |
| `wasm32-unknown-unknown` | yes | no | only code with no C exports (see below) |

To cross-compile, set `[build].stage = "object"` (or `llvm-ir`, `assembly`, `llvm-bitcode`), or `[build].artifact = "object"` or `"static-library"`, and link the result with your own toolchain:

```sh
silk build --target aarch64-unknown-linux-gnu
```

```
Compiled src/main.silk -> build/llvm/aarch64-unknown-linux-gnu/debug/tiny.o (llvm, aarch64-unknown-linux-gnu, 182 symbols)
build llvm/aarch64-unknown-linux-gnu: ok /home/you/tiny/build/llvm/aarch64-unknown-linux-gnu/debug/tiny.o
Build summary: 1 succeeded, 0 failed
```

## Choosing targets

- `silk build` and `silk check` take `--target` more than once and run once per target. Without it they use `[build].targets`, else the host.
- `silk run` and `silk test` take one `--target`.
- The std lib surface changes per target. `silk check --target <name>` reports what does not exist there. See **The standard library**.

```sh
silk check --target aarch64-apple-darwin --target aarch64-unknown-linux-gnu --target wasm32-unknown-unknown
```

```
check aarch64-apple-darwin: ok
check aarch64-unknown-linux-gnu: ok
check wasm32-unknown-unknown: ok
Check summary: 3 succeeded, 0 failed
```

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
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/release/tiny (llvm, x86_64-unknown-linux-gnu, 182 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tiny/build/llvm/x86_64-unknown-linux-gnu/release/tiny
Build summary: 1 succeeded, 0 failed
```

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
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/fast/tiny (llvm, x86_64-unknown-linux-gnu, 182 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/tiny/build/llvm/x86_64-unknown-linux-gnu/fast/tiny
Build summary: 1 succeeded, 0 failed
```

- A named profile builds into a directory with its own name, beside `debug` and `release`.
- `target` is required. Every other field has a default, so a profile turns on optimization only when it says `optimization = "speed"`.
- `[build].profile = "fast"` makes it the default for builds with no `--target`, `--profile` or `--profile-input`.
- `--profile-input '<json>'` passes a whole profile as JSON, with the same fields. Its directory comes from its optimization and debug settings.
- A named or JSON profile cannot be combined with `--target`, `--release` or `--optimization`:

```
Named/full profiles conflict with target and optimization flags
```

- Profiles also carry package parameter bindings, which win over `[[build.bindings]]`. See **Package parameters** in the reference and chapter 11 of the book.

## Profile fields

The manifest page lists every field and its values. Today the native build applies these:

| Field | Effect |
| --- | --- |
| `target` | The target. |
| `optimization` | `none` passes `-O0` to Clang; `speed` passes `-O2`. |
| `debug` | `true` passes `-g`. |
| `libc` | Chooses the runtime from the std lib catalog. Linux takes `gnu` or `none`; macOS takes `system` (or `none` for object and archive output only); wasm takes `none`. |
| `runtime` | `{ kind = "named", name = "..." }` picks a runtime listed in `[build].composition`; `{ kind = "none" }` builds without one. |
| `relocation` | `pic` or `static` code for object, archive and IR output. |
| `deployment` | macOS minimum version for the link. |

The other fields (`cpu`, `entry`, `link`, `codeModel`, `safety`, `threading`, `sanitizers`, `unwind`) are checked for valid values and combinations, and except `sanitizers` and `cpu` features they are readable through `Compilation`. The native build does not act on them yet. `sanitizers = ["address"]`, for example, builds a program with no sanitizer and no warning. A profile's `artifact` does not change the output form either; set `[build].artifact` instead.

These combinations are refused when the manifest is read:

| Combination | Message |
| --- | --- |
| `libc` not valid for the target | `UnsupportedCombination: libc` |
| wasm with `link`, `relocation`, `codeModel`, `unwind`, `deployment` or `sanitizers` changed from its defaults | `UnsupportedCombination: target` |
| `sanitizers` with both `address` and `thread` | `UnsupportedCombination: sanitizers` |
| `thread` sanitizer without `threading = "multi"` | `UnsupportedCombination: threading` |
| macOS executable with `link = "static"` | `UnsupportedCombination: link` |
| `target = "host"` | `UnsupportedCombination: target` |

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

[build.composition]
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
<silk>/lib/silk/stdlib/silk/raw_start.silk:27:5: unsupported[foreign-contract] not supported by the native compiler yet
build llvm/x86_64-unknown-linux-gnu: failed (exit 2)
Build summary: 0 succeeded, 1 failed
```

Without the composition, `libc = "none"` finds no runtime in the std lib catalog: `silk: the build selects no single runtime (ARTIFACT-001)`.

## WebAssembly

`silk check --target wasm32-unknown-unknown` works and shows the wasm std lib surface. Building is limited in this release:

- An executable cannot be linked on any host.
- The wasm runtime and every `export "C"` function stop with `unsupported[c-abi-target] not supported by the native compiler yet`.
- An `object` or `static-library` artifact with no C exports builds, but holds no symbols.

## See also

The manifest, The standard library, Build outputs and native linking; **Package parameters** and **Static control flow and reflection** in the reference; chapter 11 of the book.
