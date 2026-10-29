# Build outputs and native linking

`silk build` turns a package into LLVM IR, then hands it to Clang to produce the file `[package].kind` and `[build].stage` ask for. Every file lands under the output directory, in a folder per target and profile.

## The build/ layout

```
build/
  llvm/<target>/<profile>/<file>          silk build, silk run
  llvm/<target>/<profile>/<file>.symbols  symbol map (builds with debug information)
  llvm/<target>/<profile>/<file>.inputs   the files the build read, to skip an unchanged rebuild
  llvm/<target>/<profile>/<file>.units/   cached compiled code, reused by the next build
  test/llvm/<target>/<profile>/<name>     silk test runner
  cache/<package>/                        the checker's cache, per package
  documentation.json                      silk doc
  documentation/<member>.json             silk doc at a workspace root
```

- `build` is `[build].output-dir`, or `[workspace].output-dir` for workspace members. See **Workspaces**.
- `<target>` is the full target name, such as `x86_64-unknown-linux-gnu`.
- `<profile>` is `debug`, `release`, `release-with-debug`, `release-size` or `release-size-with-debug`, or the name of the selected `[profiles.<name>]`. See **Targets and profiles**.
- The `.inputs`, `.units` and `cache` entries only make the next build faster. Deleting them is safe.
- `silk clean` deletes the whole output directory.

## File names

| `[package].kind` | `stage = "final"` (default) |
| --- | --- |
| `executable` | `<name>` |
| `library` | none: the package is checked |
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

`<name>` is `[package].name`, hyphens kept: `libtext-utils.a`. A non-final stage stops before linking, so it works for any target. For a single file, `silk build <source> -o <output> --emit <stage>` does the same. With `stage = "assembly"` in `[build]`, the package from `silk init hello` builds `hello.s`:

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     143 modules, 1 in package         0.06s
  check    1 module                          0.14s
  codegen  689 functions                     0.18s
  borrow   229 bodies                        0.01s
  link     clang                             0.29s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello.s in 0.71s
```

The `link` row is the Clang step whatever the stage; for `assembly` it runs `clang -S`.

## The symbol map

Each output of a build with debug information, such as the default `debug` profile, has a `.symbols` file beside it. Each line is a native symbol, its kind and the Silk declaration it comes from, separated by tabs:

```
main	export	hello@0.1.0:silk/platform/native/start.silk::_._.enter
silk_e0307b61cbd3a68762f928296596e9cb	function	hello@0.1.0:silk/platform/native/start.silk::_._.enter
```

Kinds are `export` (a C name), `function`, `drop` and `helper`. The single-file form prints one `Compiled` line instead of progress: `silk build src/main.silk -o hello.s --emit assembly` prints `Compiled src/main.silk -> hello.s (llvm, x86_64-unknown-linux-gnu, 339 symbols)`, with both paths relative to the current directory, or in full when a file is outside it. Its symbol count is the number of lines in this file.

## Finding Clang

| Source | Used for |
| --- | --- |
| `--clang <path or name>` | `silk build`, `silk run` and `silk test` on a package, and single-file `silk build <source> -o <output>`. A bare name is looked up on `PATH`. |
| `SILK_CLANG` | Every build without `--clang`, when set. |
| `clang` on `PATH` | Otherwise. |

- Use Clang 22 or newer. Silk hands Clang LLVM 22 bitcode, and a build refuses an older Clang before compiling.
- Static archives use `SILK_LLVM_AR` when set, else the `llvm-ar` in Clang's directory.
- Clang runs with only `PATH`, `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL` and `LC_CTYPE` from your environment. `CFLAGS`, `LDFLAGS` and similar are not passed.
- An executable link adds `-lc -lm` after everything else.
- On Linux, an executable links with the `ld.lld` in Clang's installation directory (the `InstalledDir` line of `clang --version`) when there is one, through `--ld-path`. Otherwise Clang uses the system linker. A `platform-supply` that names a linker, and a no-libc build, keep their own linker. The progress row reads `link     clang` either way.
- On Linux, an executable is not position independent unless its profile sets `relocation = "pic"`: the default links with `-fno-pic` and `-no-pie`. See Targets and profiles.

| Problem | Message |
| --- | --- |
| No `clang` on `PATH` | `silk: cannot find clang on PATH; set SILK_CLANG or pass --clang the path of the Clang executable` |
| `--clang` name not found | `silk: cannot find nosuchclang on PATH; pass --clang the path of the Clang executable` |
| The chosen Clang does not start | `silk: cannot run the C compiler /nope/clang (from SILK_CLANG); set SILK_CLANG or pass --clang the path of the Clang executable`. The parenthesis is `from SILK_CLANG`, `from --clang` or `found on PATH`. |

Each of these fails the target and exits 2. `silk build` and `silk run` print the message, then a `link     failed` row and a `Failed` line.

## macOS SDK

On macOS the link needs an SDK. The compiler resolves it once per build, in this order:

1. `[native].platform-supply`, when the manifest sets one.
2. `SDKROOT`, when set. An invalid `SDKROOT` fails; it never falls back.
3. `xcrun` discovery, for the host target only.

The SDK reaches Clang as `-isysroot`, with `-mmacosx-version-min` from the profile's `deployment`. Linux needs no SDK.

`[native].platform-supply` takes one of:

| Value | Meaning |
| --- | --- |
| `{ kind = "automatic" }` | The default: the order above. |
| `{ kind = "native" }` | Host discovery, named explicitly. |
| `{ kind = "explicit", target = "...", root = "...", linker = "...", origin = "...", support = [...] }` | An installed SDK or sysroot at `root` (`-isysroot` on macOS, `--sysroot` on Linux), the linker at `linker` (`--ld-path`), and optional GCC support installations, each `{ root, target, origin }` (`--gcc-install-dir`). `origin` is a label. |
| `{ kind = "managed", name = "..." }` | Recognized, not supported: `UnsupportedProvider: x (project)`. |

Each kind takes only the keys shown. A key it does not take, here `name` under `kind = "native"`, is refused at its own line, and so is an extra key in a `support` entry (`native.platform-supply.support.<key>`):

```toml
[native.platform-supply]
kind = "native"
name = "x"
```

```
Invalid Silk project manifest /home/you/hello/silk.toml:8: native.platform-supply.name is not a supported field
```

Any other shape, such as an unknown `kind`, a string instead of a table, or an `explicit` supply for a target it cannot serve, is refused at the line that writes `platform-supply`, or at the `[native.platform-supply]` header:

```
Invalid Silk project manifest /home/you/hello/silk.toml:7: InvalidConfiguration: platform-supply (/home/you/hello/silk.toml:native.platform-supply)
```

## Extra native link inputs

`[native].link` adds C objects, archives and libraries to the link. Each entry is a table with exactly one kind:

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
[native]
link = [{ object = "native/scale.o" }]
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
exit 42
```

A bad entry stops the build with exit status 1 and names the manifest and the entry's index. A path must stay inside the package, so an absolute path, or one with `.` or `..` segments, is refused on purpose:

```
silk: invalid native link input: /home/you/cmix/silk.toml: [native].link[0]: object /tmp/abs.o must be a relative path below the manifest's directory, without . or .. segments, so the package names only its own files
```

An entry with no kind, or with two, ends in `an entry is exactly one object, static-archive, search-path, linker-script or framework value, or one library with mode "static" or "dynamic"`. A bad `mode` ends in `a library's mode must be "static" or "dynamic"`. An entry for another platform is refused the same way: `silk: invalid native link input: /home/you/cmix/silk.toml: [native].link[0]: framework Security links only on macOS targets`. A file that does not exist is reported by Clang at link time, `clang: error: no such file or directory: '/home/you/cmix/native/missing.o'`, and the build exits 1.

See **Unsafe code and C interop** in the reference for `extern "C"`.

## Function order

`[native].function-order` names a text file of symbols that a Linux or macOS executable places first, in the order listed, so that code which runs together shares memory pages:

```toml
[native]
function-order = "order.txt"
```

```
# hot path first
silk_f0247e45df317956d0904dd2e95b51a8
main
```

- One symbol per line, as the symbol map or `nm` spells it. Blank lines and lines starting with `#` are skipped. On macOS the compiler adds the leading `_` itself.
- Linux links with function sections and passes the file to lld as `--symbol-ordering-file`; macOS passes it as `-order_file`. A wasm32 module ignores it.
- The path follows the same rule as `[native].link`: `silk: invalid native link input: /home/you/hello/silk.toml: [native].function-order must be a relative path below the manifest's directory, without . or .. segments, so the package names only its own files` (exit 1).
- A file that cannot be read stops the link: `silk: cannot read the function order file /home/you/hello/order.txt that [native].function-order names` (exit 2).
- Editing the file relinks the executable, with no other recompilation.

## Runtime composition (advanced)

An executable starts in a runtime module that sets up the process and calls `main`. Without `[unstable].composition`, the compiler takes it from the std lib's catalog (`compositions.json`):

| Targets | libc | Runtime |
| --- | --- | --- |
| `aarch64-apple-darwin` | `system` | `silk/platform/native/start` (hosted) |
| Linux x86-64 and arm64 | `gnu` | `silk/platform/native/start` (hosted) |
| `wasm32-unknown-unknown` | `none` | `silk/platform/wasm/start` (standalone) |
| `wasm32-wasip1`, `wasm32-wasip2` | `none` | `silk/platform/wasi/start` (wasi) |

`[unstable].composition` replaces the catalog for one package. Its keys:

| Key | Meaning |
| --- | --- |
| `runtimes` | `[{ name = "...", module = "silk/..." }]`: runtimes this package may use. |
| `defaults` | Exactly one runtime name, used unless the profile's `runtime` names another. An executable needs one. Each entry must be a string: `unstable.composition.defaults entries must be runtime names`. A name not listed in `runtimes` is refused at its line: `unstable.composition.defaults entry "main" names no runtime in unstable.composition.runtimes; it lists "start"`, or `it lists none`. |
| `components` | `[{ capability = "execution-storage", bindings = [{ operation = "...", module = "...", declaration = "..." }] }]`: the `create`, `acquire`, `release` and `destroy` operations of execution storage, bound to module declarations. `execution-storage` is the only capability; any other is refused, as in `unstable.composition.components.capability = "other" is not supported by the native compiler; the only capability is "execution-storage"`. An `operation` other than those four is refused at its line: `unstable.composition.components.bindings.operation = "frobnicate" is not an operation; use create, acquire, release or destroy`. So is one that is not a string (`unstable.composition.components.bindings.operation must be a string: create, acquire, release or destroy`), and an entry with no `operation` at the entry's line (`unstable.composition.components.bindings entry has no operation; use create, acquire, release or destroy`). |
| `retention` | `[{ module = "...", declaration = "..." }]`: extra declarations kept in the output. |
| `requirements` | Must be empty: `unstable.composition.requirements is not supported by the native compiler yet`. |

Any other key is refused at its line, as in `Invalid Silk project manifest /home/you/hello/silk.toml:7: unstable.composition.bogus is not a supported field`. So is a key the entries of these lists do not take, even inside an array written over several lines:

```toml
[unstable]
composition = { runtimes = [
  { name = "synchronous", module = "silk/platform/native/start_sync" },
  { name = "hosted", modul = "silk/platform/native/start" },
], defaults = ["synchronous"] }
```

```
Invalid Silk project manifest /home/you/hello/silk.toml:9: unstable.composition.runtimes.modul is not a supported field; did you mean unstable.composition.runtimes.module?
```

Line 9 is the line that writes `modul`. A misspelled key in a `retention` entry is refused the same way (`unstable.composition.retention.decl is not a supported field`), and in a component's `bindings` entry as `unstable.composition.components.bindings.<key>`.

For example, `silk/platform/native/start_sync` is a smaller hosted runtime for a `main` that returns `i32` and needs only `HostInput`:

```toml
[unstable]
composition = { runtimes = [{ name = "synchronous", module = "silk/platform/native/start_sync" }], defaults = ["synchronous"] }
```

```silk
import silk.system.host_input { HostInput, HostInputError }
import silk.num.usize

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
exit 3
```

A `main` the runtime cannot start is SEM0225. Here `main` is a plain `pub fn main() -> i32`:

```
Compiling sync (x86_64-unknown-linux-gnu, debug)
  load     123 modules, 1 in package         0.07s
  check    1 module                          0.05s
  codegen  failed: 117 functions, 1 error    0.01s
[x86_64-unknown-linux-gnu]
src/main.silk:1:8: error[SEM0225] Entry point `main` has a result or requirement the selected runtime `silk/platform/native/start_sync` cannot start
Failed sync in 0.15s
```

A composition that leaves no single runtime, such as one with two runtimes and no `defaults`, is `silk: the build selects no single runtime (ARTIFACT-001)`. A std lib runtime selected for a target its catalog entry does not list, such as `silk/platform/native/start` for `wasm32-wasip1`, is refused before anything compiles, and the message names the runtime to use: ``silk: the runtime module silk/platform/native/start does not support the target wasm32-wasip1; list silk/platform/wasi/start in [unstable.composition].runtimes and select it for this profile with `runtime = { kind = "named", name = ... }` (ARTIFACT-001)``. A default that `runtimes` does not list is refused earlier, at its line in `silk.toml` (see the `defaults` key above). Read a runtime module's page in the Std lib API reference before you select it. Linux without libc in Targets and profiles shows the `silk/platform/linux/start` case.

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
exit 7
```

An executable that exports no C `main` is refused before Clang runs, with exit status 2. Here `main` is a plain `pub fn main() -> i32`, and `silk build` prints:

```
Compiling tiny (x86_64-unknown-linux-gnu, bare)
  load     116 modules, 1 in package         0.00s
  check    1 module                          0.00s
  codegen  0 functions                       0.00s
  borrow   1 body                            0.00s
[x86_64-unknown-linux-gnu]
silk: an executable built with runtime = { kind = "none" } has no `main`; export one, as `export "C" fn start() -> i32 as "main"` does, or select a runtime
Failed tiny in 0.01s
```

- `silk check` does not look for the C `main`; only an executable build does.
- An `object` or `static-library` artifact, and a non-final stage, need no `main`.
- When the package has native link inputs, one of them may define `main`, so the compiler leaves the check to the linker. A link without one fails with Clang's ``undefined reference to `main'`` and exit status 1.

## See also

The manifest, Targets and profiles, Libraries and exports, Workspaces; **Unsafe code and C interop** and **Program entry and termination** in the reference.
