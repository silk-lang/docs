# Build outputs and native linking

A compilation's constructor chooses its artifact: `Compilation.executable`, `loadableModule`, `staticArchive`, `object` or `test`. A manifest's `kind` describes a source package as an executable or library.

## Output layout

The runner writes artifacts to `build/<target>/<mode>/<name>`, under the workspace's `output-dir` when configured. `Built.write` copies them to distribution directories. Request files and their index live in `build/requests`; tools read those records instead of scanning build directories.

`Compilation.emit` selects `final`, `llvm-ir`, `llvm-bitcode`, `assembly`, `object` or `wasm-text`. Intermediate output preserves the defining package's optimization and debug settings. It does not merge native link inputs into the intermediate artifact.

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

`Compilation.platform` selects an SDK, sysroot, linker and support installations. Resolution captures automatic host SDK discovery in the request, so replay does not rediscover a different SDK. Cross links requiring system libraries need a suitable target supply. Cross-target object emission does not need a linker SDK.

## Native sources and libraries

A package exports `PLAN` from `build.silk`:

```silk
import silk.build.plan { Plan }
import silk.build.step { sourcePath }

pub const PLAN: Plan = Plan.empty()
  |> Plan.compileC(sourcePath("native/helper.c"))
  |> Plan.includePath(sourcePath("include"))
  |> Plan.linkLibrary("m", "dynamic", false, false)
```

Use `compileCpp`, `compileObjectiveC` and `compileObjectiveCpp` for other source languages. `compileNative` supplies per-file flags and include directories, while `compileSources` declares a glob. `linkObject`, `linkArchive`, `searchPath`, `frameworkSearchPath`, `linkFramework`, `rpath`, `linkerScript` and `functionOrder` describe link inputs. A static target condition selects platform-specific entries.

Root `Compilation` values provide equivalent operations using deferred inputs. `linkArtifact` links the output of another compilation and orders it through the graph. Framework and library operations carry weak and needed flags.

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
