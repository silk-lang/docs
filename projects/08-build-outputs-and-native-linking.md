# Build outputs and native linking

`silk build` turns a package into LLVM IR, then hands it to Clang to produce the file `[build].artifact` and `[build].stage` ask for. Every file lands under the output directory, in a folder per target and profile.

## The build/ layout

```
build/
  llvm/<target>/<profile>/<file>          silk build, silk run
  llvm/<target>/<profile>/<file>.symbols  symbol map
  test/llvm/<target>/<profile>/<name>     silk test runner
  documentation.json                      silk doc
  documentation/<member>.json             silk doc at a workspace root
```

- `build` is `[build].output-dir`, or `[workspace].output-dir` for workspace members. See **Workspaces**.
- `<target>` is the full target name, such as `x86_64-unknown-linux-gnu`.
- `<profile>` is `debug`, `release` or `release-with-debug`, or the name of the selected `[profiles.<name>]`. See **Targets and profiles**.
- `silk clean` deletes the whole output directory.

## File names

| `[build].artifact` | `stage = "final"` (default) |
| --- | --- |
| `executable` | `<name>` |
| `static-library` | `lib<name>.a` |
| `shared-library` | `lib<name>.so`, `lib<name>.dylib` on macOS (not built yet) |
| `object` | `<name>.o` |

| `[build].stage` | File | What Clang does |
| --- | --- | --- |
| `llvm-ir` | `<name>.ll` | nothing; the IR as text |
| `llvm-bitcode` | `<name>.bc` | `-c -emit-llvm` |
| `assembly` | `<name>.s` | `-S` |
| `object` | `<name>.o` | `-c` |
| `final` | as above | compiles and, for an executable, links |

`<name>` is `[package].name`, hyphens kept: `libtext-utils.a`. A non-final stage stops before linking, so it works for any target. For a single file, `silk build <source> -o <output> --emit <stage>` does the same.

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/hello.s (llvm, x86_64-unknown-linux-gnu, 210 symbols)
```

## The symbol map

Each output has a `.symbols` file beside it. Each line is a native symbol, its kind and the Silk declaration it comes from, separated by tabs:

```
main	export	hello@0.1.0:silk/native_start.silk::_._.enter
silk_5d3308971cc4722980f0a2011e60fca5	function	hello@0.1.0:silk/native_start.silk::_._.enter
```

Kinds are `export` (a C name), `function`, `drop` and `helper`. The count in the `Compiled` line is the number of lines in this file.

## Finding Clang

| Source | Used for |
| --- | --- |
| `--clang <path or name>` | `silk build`, `silk run` and `silk test` on a package, and single-file `silk build <source> -o <output>`. A bare name is looked up on `PATH`. |
| `SILK_CLANG` | Every build without `--clang`, when set. |
| `clang` on `PATH` | Otherwise. |

- Use Clang 18 or newer. Linux without libc needs Clang 22 or newer, because the inline assembly in its runtime uses LLVM 22 syntax. Clang 17 and older are untested.
- Static archives use `SILK_LLVM_AR` when set, else the `llvm-ar` in Clang's directory.
- Clang runs with only `PATH`, `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL` and `LC_CTYPE` from your environment. `CFLAGS`, `LDFLAGS` and similar are not passed.
- An executable link adds `-lc -lm` after everything else.

| Problem | Message |
| --- | --- |
| No `clang` on `PATH` | `silk: cannot find clang on PATH; set SILK_CLANG to the Clang executable` |
| `--clang` name not found | `silk: cannot find nosuchclang on PATH; pass --clang the path of the Clang executable` |
| The chosen Clang does not start | `silk: cannot run the C compiler /nope/clang (from SILK_CLANG); set SILK_CLANG or pass --clang the path of the Clang executable`. The parenthesis is `from SILK_CLANG`, `from --clang` or `found on PATH`. |

Each of these fails the target, prints its `failed (exit 2)` line and summary, and exits 2.

## macOS SDK

On macOS the link needs an SDK. The compiler resolves it once per build, in this order:

1. `[build].platform-supply`, when the manifest sets one.
2. `SDKROOT`, when set. An invalid `SDKROOT` fails; it never falls back.
3. `xcrun` discovery, for the host target only.

The SDK reaches Clang as `-isysroot`, with `-mmacosx-version-min` from the profile's `deployment`. Linux needs no SDK.

`[build].platform-supply` takes one of:

| Value | Meaning |
| --- | --- |
| `{ kind = "automatic" }` | The default: the order above. |
| `{ kind = "native" }` | Host discovery, named explicitly. |
| `{ kind = "explicit", target = "...", root = "...", linker = "...", origin = "...", support = [...] }` | An installed SDK or sysroot at `root` (`-isysroot` on macOS, `--sysroot` on Linux), the linker at `linker` (`--ld-path`), and optional GCC support installations, each `{ root, target, origin }` (`--gcc-install-dir`). `origin` is a label. |
| `{ kind = "managed", name = "..." }` | Recognized, not supported: `UnsupportedProvider: x (project)`. |

Any other shape is refused:

```
Invalid Silk project manifest /home/you/tiny/silk.toml: InvalidConfiguration: platform-supply (/home/you/tiny/silk.toml:build.platform-supply)
```

## Extra native link inputs

`[build].native-link-inputs` adds C objects, archives and libraries to the link. Each entry is a table with exactly one kind:

| Entry | Linker argument | Notes |
| --- | --- | --- |
| `{ object = "native/scale.o" }` | the path |  |
| `{ static-archive = "native/libscale.a" }` | the path |  |
| `{ search-path = "native" }` | `-L<path>` |  |
| `{ library = "scale", mode = "dynamic" }` | `-lscale` |  |
| `{ library = "scale", mode = "static" }` | `-Wl,-Bstatic -lscale -Wl,-Bdynamic` | not on macOS |
| `{ linker-script = "link.ld" }` | `-Xlinker -T -Xlinker <path>` | Linux only |
| `{ framework = "Security" }` | `-framework Security` | macOS only |

- Paths are relative to the manifest, with no absolute paths and no `..`.
- Inputs go to the linker in the order listed, before `-lc -lm`.
- An `object` artifact merges only objects and archives into its `.o`. A `static-library` adds only objects as archive members.

A C function linked into a Silk program:

```c
int scale(int value) {
  return value * 3;
}
```

```sh
clang -c -fPIC native/scale.c -o native/scale.o
```

```toml
[build]
native-link-inputs = [{ object = "native/scale.o" }]
```

```silk
unsafe extern "C" fn scale(value: i32) -> i32

pub fn main() -> i32 {
  return unsafe scale(14)
}
```

```sh
silk run; echo "exit $?"
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/cmix (llvm, x86_64-unknown-linux-gnu, 182 symbols)
exit 42
```

A bad entry stops the build with exit status 1 and names the manifest and the entry's index. A path must stay inside the package, so an absolute path, or one with `.` or `..` segments, is refused on purpose:

```
silk: invalid native link input: /home/you/cmix/silk.toml: [build].native-link-inputs[0]: object /tmp/abs.o must be a relative path below the manifest's directory, without . or .. segments, so the package names only its own files
```

An entry with no kind, or with two, ends in `an entry is exactly one object, static-archive, search-path, linker-script or framework value, or one library with mode "static" or "dynamic"`. A bad `mode` ends in `a library's mode must be "static" or "dynamic"`. An entry for another platform names only the entry: `silk: invalid native link input: framework Security links only on macOS targets`. A file that does not exist is reported by Clang at link time, `clang: error: no such file or directory: '/home/you/cmix/native/missing.o'`, and the build exits 1.

See **Unsafe code and C interop** in the reference for `extern "C"`.

## Runtime composition (advanced)

An executable starts in a runtime module that sets up the process and calls `main`. Without `[build].composition`, the compiler takes it from the std lib's catalog (`compositions.json`):

| Targets | libc | Runtime |
| --- | --- | --- |
| `aarch64-apple-darwin` | `system` | `silk/native_start` (hosted) |
| Linux x86-64 and arm64 | `gnu` | `silk/native_start` (hosted) |
| `wasm32-unknown-unknown` | `none` | `silk/wasm_start` (standalone) |

`[build].composition` replaces the catalog for one package. Its keys:

| Key | Meaning |
| --- | --- |
| `runtimes` | `[{ name = "...", module = "silk/..." }]`: runtimes this package may use. |
| `defaults` | Exactly one runtime name, used unless the profile's `runtime` names another. An executable needs one. Each entry must be a string: `build.composition.defaults entries must be runtime names`. |
| `components` | `[{ capability = "...", bindings = [{ operation = "...", module = "...", declaration = "..." }] }]`: capability bindings, such as `execution-storage` operations bound to module declarations. |
| `retention` | `[{ module = "...", declaration = "..." }]`: extra declarations kept in the output. |
| `requirements` | Must be empty: `build.composition.requirements is not supported by the native compiler yet`. |

Any other key is refused at its line, as in `Invalid Silk project manifest /home/you/hello/silk.toml:8: build.composition.bogus is not a supported field`. So is a key the entries of these lists do not take, even inside an array written over several lines:

```toml
[build]
composition = { runtimes = [
  { name = "synchronous", module = "silk/native_start_sync" },
  { name = "hosted", modul = "silk/native_start" },
], defaults = ["synchronous"] }
```

```
Invalid Silk project manifest /home/you/hello/silk.toml:10: build.composition.runtimes.modul is not a supported field
```

Line 10 is the line that writes `modul`. A misspelled key in a `retention` entry is refused the same way (`build.composition.retention.decl is not a supported field`), and in a component's `bindings` entry as `build.composition.components.bindings.<key>`.

For example, `silk/native_start_sync` is a smaller hosted runtime for a `main` that returns `i32` and needs only `HostInput`:

```toml
[build]
composition = { runtimes = [{ name = "synchronous", module = "silk/native_start_sync" }], defaults = ["synchronous"] }
```

```silk
import silk.host_input { HostInput, HostInputError }
import silk.usize

pub effect fn main() -> i32 ! HostInputError ? &mut HostInput {
  let count = run HostInput.argumentCount()
  if count == usize.ONE {
    return 0
  }
  return 3
}
```

```sh
silk run -- a b; echo "exit $?"
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/sync (llvm, x86_64-unknown-linux-gnu, 97 symbols)
exit 3
```

A `main` the runtime cannot start is SEM0225. Here `main` is a plain `pub fn main() -> i32`:

```
[x86_64-unknown-linux-gnu]
/home/you/tiny/src/main.silk:1:8: error[SEM0225] Entry point `main` has a result or requirement the selected runtime `silk/native_start_sync` cannot start
run x86_64-unknown-linux-gnu: failed (exit 1)
Run summary: 0 succeeded, 1 failed
```

A composition that leaves no single runtime, or a default it does not list, is `silk: the build selects no single runtime (ARTIFACT-001)`. Read a runtime module's page in the Std lib API reference before you select it. Linux without libc in Targets and profiles shows the `silk/raw_start` case.

## Building without a runtime

A profile with `runtime = { kind = "none" }` builds with no runtime module, so nothing calls the Silk `main`. The program starts in a C `main` that you export:

```toml
[build]
profile = "bare"

[profiles.bare]
target = "x86_64-unknown-linux-gnu"
runtime = { kind = "none" }
```

```silk
export "C" fn start() -> i32 as "main" {
  return 7
}
```

```sh
silk run; echo "exit $?"
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/bare/bare (llvm, x86_64-unknown-linux-gnu, 2 symbols)
exit 7
```

An executable that exports no C `main` is refused before Clang runs, with exit status 2. Here `main` is a plain `pub fn main() -> i32`, and `silk build` prints:

```
silk: an executable built with runtime = { kind = "none" } has no `main`; export one, as `export "C" fn start() -> i32 as "main"` does, or select a runtime
build llvm/x86_64-unknown-linux-gnu: failed (exit 2)
Build summary: 0 succeeded, 1 failed
```

- `silk check` does not look for the C `main`; only an executable build does.
- An `object` or `static-library` artifact, and a non-final stage, need no `main`.
- When the package has native link inputs, one of them may define `main`, so the compiler leaves the check to the linker. A link without one fails with Clang's ``undefined reference to `main'`` and exit status 1.

## See also

The manifest, Targets and profiles, Libraries and exports, Workspaces; **Unsafe code and C interop** and **Program entry and termination** in the reference.
