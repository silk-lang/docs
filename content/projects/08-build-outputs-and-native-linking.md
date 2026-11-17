# Build outputs and native linking

This page covers what a build writes and how Silk code links with C: artifact kinds, the output layout, intermediate stages, Clang, native sources and libraries, prebuilt archives and C headers.

## Artifacts

`[package].kind` says what a package is to its dependents: `executable` (the default) or `library`. The built-in `silk build` links an executable and only checks a library, which other packages compile from source. Every other kind of file is a compilation in a command of `tasks.silk`, chosen by its constructor:

| Constructor | Writes | For |
| --- | --- | --- |
| `Compilation.executable(name, root)` | `name`, `name.exe` on Windows, `name.wasm` for WebAssembly | A program |
| `Compilation.loadableModule(name, root)` | `name.so`, `name.dylib` or `name.dll`; a reactor module for WebAssembly | A plugin, or a library loaded by another language |
| `Compilation.staticArchive(name, root)` | `name.a`, `name.lib` on Windows | A C program that links Silk code statically |
| `Compilation.object(name, root)` | `name.o`, `name.obj` on Windows | Another linker |
| `Compilation.test(name, root)` | A test runner | Tests of a root |

`root` is a path relative to the package directory, such as `"src/lib.silk"`. A library that C programs link builds itself with a command:

```silk
Tasks.Build { options } => {
  let archive = run Compilation.staticArchive("vec", "src/lib.silk")
  let tuned = run archive.optimize(run Deferred<Optimize>.value(options.optimize))
  let graph = run Build.make()
  let built = run (run graph.add(move tuned)).compile()
  drop run built.write("dist")
}
```

```
Compiling vec (x86_64-unknown-linux-gnu, dev)
Finished build/x86_64-unknown-linux-gnu/dev/vec.a in 0.37s
```

A static archive holds only code: a plan's named libraries, such as `linkLibrary("m", ...)`, are refused in one today, so leave them to the program that links the archive.

## Output layout

```
build/
  <target>/<mode>/<name>          the artifact, with <name>.symbols beside it
  requests/<name>.<target>.<mode>.toml
  requests/plan.json              the requests of the last plan
  steps/<key>/                    each step's cached outputs
  steps/tasks/<target>/tasks      the tasks program
  cache/                          the compiler's incremental state
```

The mode is `dev` for `--optimization none`, `release` for `speed` and `size` for `size`. A workspace puts one `build/` at its root, or at its `output-dir`. `built.write(directory)` copies artifacts somewhere else; nothing else writes outside `build/`. Tools read `build/requests/` instead of looking for artifacts.

## Intermediate stages

`compilation.emit(stage)` writes `final` (the default), `llvm-ir`, `llvm-bitcode`, `assembly`, `object` or `wasm-text` in place of the linked artifact:

```silk
let base = run app(&options)
let ir = run base.emit(run Deferred<String>.value(run String.copy("llvm-ir")))
```

```
Finished build/x86_64-unknown-linux-gnu/dev/app.ll in 0.00s
```

A single file takes `--emit` directly: `silk build main.silk -o main.ll --emit llvm-ir`. Intermediate output keeps each package's optimization and debug settings and does not include native link inputs.

## Finding Clang

| Source | Used for |
| --- | --- |
| `--clang <path or name>` | `silk build`, `silk run` and `silk test` on a package, and single-file `silk build <source> -o <output>`. A bare name is looked up on `PATH`. |
| `SILK_CLANG` | Every build without `--clang`, when set. |
| The bundled Clang | Otherwise, when the compiler has a release's LLVM beside it, at `<prefix>/lib/silk/llvm/bin/clang` for `<prefix>/bin/silkc`. The first build makes the tool links there. |
| `clang` on `PATH` | Otherwise. |

- A release bundles LLVM 23 (Clang, LLD and `llvm-ar`, for x86-64, ARM64 and WebAssembly). Another Clang must be 22 or newer; a build refuses an older one before compiling.
- Static archives use `SILK_LLVM_AR` when set, else the `llvm-ar` in Clang's directory.
- Clang runs with only `PATH`, `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL` and `LC_CTYPE` from your environment. `CFLAGS`, `LDFLAGS` and similar are not passed.
- An executable link adds `-lc -lm` after everything else.
- On Linux, an executable links with the `ld.lld` in Clang's installation directory (the `InstalledDir` line of `clang --version`) when there is one, through `--ld-path`. Otherwise Clang uses the system linker. An explicit platform supply that names a linker, and a no-libc build, keep their own linker. The bundled Clang has its `ld.lld` beside it. The progress row reads `link      clang` either way.
- On Linux, an executable is not position independent unless `Compilation.relocation` selects `pic`: the default links with `-fno-pic` and `-no-pie`. See Targets and compilation settings.

| Problem | Message |
| --- | --- |
| No bundled Clang and no `clang` on `PATH` | `silk: cannot find clang on PATH; set SILK_CLANG or pass --clang the path of the Clang executable` |
| `--clang` name not found | `silk: cannot find nosuchclang on PATH; pass --clang the path of the Clang executable` |
| The chosen Clang does not start | `silk: cannot run the C compiler /nope/clang (from SILK_CLANG); set SILK_CLANG or pass --clang the path of the Clang executable`. The parenthesis is `from SILK_CLANG`, `from --clang` or `found on PATH`. |

Each of these fails the target and exits 2. `silk build` and `silk run` print the message, then a `link      failed` row and a `Failed` line.

## Platform supplies

`compilation.platform(deferred)` names the sysroot, the linker and compiler-support directories for a cross link that needs the target's system libraries, as a `Platform` value from `silk.build.request` with absolute `sysroot` and `linker` paths and a list of `support` installations. Without a supply, the build finds the host's SDK itself and records what it found in the request, so a replay does not find a different one. An object or an intermediate stage needs no SDK.

## Native sources and libraries

What a package always needs, wherever it is compiled, goes in its `build.silk` plan, so it reaches every program that uses the package:

```silk
import silk.build.plan { Library, Plan }
import silk.build.step { sourcePath }

pub const PLAN: Plan = Plan.empty()
  |> Plan.compileC(sourcePath("native/helper.c"))
  |> Plan.includePath(sourcePath("include"))
  |> Plan.linkLibrary("m", Library.dynamicSearch())
```

**Build plans and generated code** lists every plan step: one file or a glob of files with their flags and include directories, libraries, frameworks, archives, objects, search paths, runtime search paths, linker scripts and symbol order files.

A named library or framework says how it is linked with a value:

| Value | Links |
| --- | --- |
| `Library.dynamicSearch()` | The shared library the linker finds, such as `-lm` |
| `Library.staticSearch()` | The static form of the library |
| `Framework.make()` | A macOS framework |
| `.weak()` | So the program still starts when the library or framework is missing |
| `.needed()` | Kept even when no symbol refers to it |

What only the root program needs, or what depends on the command, goes on its `Compilation`. The same steps take deferred values there, so a source or a library name can come from another step:

```silk
Tasks.Build { options } => {
  let mut flags = List<String>.make()
  run flags.append(run String.copy("-DTWO=2"))
  let base = run Compilation.fromPackage(&options)
  let withC = run base.compileC(
    run Deferred<Path>.source("native/twice.c"),
    run Deferred<List<String>>.value(move flags),
    List<Deferred<Path>>.make(),
  )
  let linked = run withC.linkLibrary(
    run Deferred<String>.value(run String.copy("m")),
    Library.dynamicSearch(),
  )
  let graph = run Build.make()
  drop run (run graph.add(move linked)).compile()
}
```

`compilation.linkArtifact(other.artifact())` links what another compilation builds, such as a static archive, and builds it first.

### A package of only C

A dependency's plan links into a program once the program imports one of the dependency's modules. A package that only wraps C sources has nothing to import: the program declares the C functions itself. Its plan links when the dependent names it with `Plan.linkDependency`. Here `cdouble` compiles one C file:

```silk
// cdouble/build.silk
import silk.build.plan { Plan }
import silk.build.step { sourcePath }

pub const PLAN: Plan = Plan.empty() |> Plan.compileC(sourcePath("native/double.c"))
```

```c
// cdouble/native/double.c
int cdouble_twice(int value) { return value * 2; }
```

The application lists `cdouble = { path = "../cdouble" }` under `[dependencies]` and links it from its own plan:

```silk
// app/build.silk
import silk.build.plan { Plan }

pub const PLAN: Plan = Plan.empty() |> Plan.linkDependency("cdouble")
```

```silk
// app/src/main.silk
unsafe extern "C" fn cdouble_twice(value: i32) -> i32

pub fn main() -> i32 {
  return unsafe cdouble_twice(21) - 42
}
```

`silk run` exits with 0. Without the `linkDependency` line the link stops with `ld.lld: error: undefined symbol: cdouble_twice`, and a name the manifest does not declare refuses the plan:

```
silk: /home/you/app/build.silk: build.silk computes no plan: Plan.linkDependency names `cdoubel`, which the package's manifest does not declare
```

## Prebuilt archives

`[native.archive.<name>]` pins a prebuilt archive, such as a vendor's SDK, by `url` and `sha256`. `Plan.archivePath(name, path)` names a file inside it, so the package uses the SDK without copying it in:

```toml
[native.archive.dawn.targets.aarch64-apple-darwin]
url = "https://github.com/google/dawn/releases/download/<version>/Dawn-<commit>-macos-latest-Release.tar.gz"
sha256 = "d4f419dcbe81de4b86e6fbf172b647f41c67820a925efca55dae3bd43248d8e2"
strip = 1
```

| Key | Meaning |
| --- | --- |
| `url` | `https://`, or `file:///` for a local mirror |
| `sha256` | The file's SHA-256, 64 hexadecimal digits |
| `strip` | Leading path segments to drop when extracting. Optional |
| `targets.<target>` | The same keys for one target, when each target has its own file |

- A build that links the package fetches the file once into `$SILK_HOME/archives/<sha256>` (`~/.silk/archives` by default), checks its SHA-256 before reading it, and extracts it if it is a tar file, gzip-compressed or not. Later builds reuse the extraction.
- Extraction writes only directories and regular files, skips links, and refuses a member path that is absolute or holds `..`.
- `silk check` fetches nothing. With `SILK_OFFLINE` set, a build that needs an archive it does not have fails, naming it.
- `SILK_ARCHIVE_MIRROR` fetches archives from a mirror or a local directory by replacing URL prefixes, and the SHA-256 is still checked. See "Fetching archives from a mirror" in **Dependencies**.
- Only the declaring manifest may use its archives, and two packages of one build may not declare the same name. A build for a target the archive has no `url` for refuses the reference.

### Using your own copy

To build against a local checkout of the SDK instead, override the archive with a directory. In the root manifest:

```toml
[native.override.dawn]
path = "../dawn-build"
```

or, for one machine, in `$SILK_HOME/native-overrides.toml`. An override is never fetched, a relative path is resolved against the file that names it, and the machine's file wins over the root manifest. A dependency's overrides are ignored.

## C libraries and platform metadata

`Compilation.header` emits a C header describing exported C declarations, including supported aggregates and callbacks. `emittedHeader` exposes that output as a deferred path. Windows `importLibrary` and `emittedImportLibrary` do the same for an import library.

`Compilation.windows` accepts a subsystem, manifest and resource files. Resources are compiled with the bundled LLVM resource compiler. `Compilation.macos` accepts a dylib install name and signing entitlements; entitlement signing runs on macOS. `Compilation.wasm` controls memory imports, shared memory, table export and command or reactor execution.

A native shared library uses dynamic linking and position-independent code. Unsupported combinations are refused before linking.

## Runtime composition

`[unstable.composition]` remains package metadata for runtime providers. A root compilation selects a runtime with `Compilation.runtime`. A native executable using runtime `none` must export a C `main` or link an input that provides it. Library artifacts acquire no executable startup.
