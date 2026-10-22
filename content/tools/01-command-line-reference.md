# Command-line reference

Every `silk` command, its options and its exit status. `silk --help` prints the same synopsis in short form, and `silk <command> --help` prints the lines for one command. The pages after this one explain testing, formatting, diagnostics, documentation and changesets in more depth.

## Commands

| Command | What it does |
| --- | --- |
| `silk init [path]` | Create a package or a workspace |
| `silk add <path>` | Add a path dependency to the manifest |
| `silk remove <name>` | Remove a dependency from the manifest |
| `silk check` | Type-check the package for each target, without producing output |
| `silk build` | Build the package for each target |
| `silk run [args]` | Build the host executable and run it |
| `silk test` | Build the test runner and run the tests |
| `silk clean` | Delete the build output directory |
| `silk format [paths]` | Rewrite source files in the standard layout |
| `silk lsp` | Run the language server for an editor |
| `silk doc` | Write the package's documentation as JSON |
| `silk doctest` | Type-check the Silk examples in documentation comments |
| `silk doc-reference` | Generate the Markdown std lib reference |
| `silk changes <subcommand>` | Record changes, version and release the package |
| `silk --help`, `-h` | Print the synopsis and exit 0 |
| `silk <command> --help`, `-h` | Print that command's usage lines and exit 0 |
| `silk --version`, `-v` | Print `silk v0.1.0` and exit 0 |

An unknown command prints `` silk: unknown command `frobnicate`  `` and the synopsis, and exits 2.

## Finding the project

Project commands start from the current directory and walk up to the nearest `silk.toml`. `--manifest-path <path>` names the manifest directly and turns the search off.

When no manifest is found, the command stops with exit status 2:

```
No silk.toml found from /home/you; create one
```

A manifest that has `[workspace]` and no `[package]` is a workspace root. At a root, `check`, `build` and `test` run every member, and `format` and `doc` cover every member. See **Workspaces** in Projects and packages.

## Shared project options

`check`, `build`, `run` and `test` take these options. Each may appear once unless marked repeatable.

| Option | Meaning |
| --- | --- |
| `--manifest-path <path>` | Use this manifest; no upward search |
| `-p <name>`, `--package <name>` | Select a workspace member by package name. Repeatable. `run` takes one |
| `--workspace` | Select every member of the enclosing workspace |
| `--target <host\|triple>` | Build for this target. Repeatable for `check` and `build`. `run` and `test` need a target the host can run |
| `--release` | Use the `release` optimization profile (optimized, no debug information) |
| `--optimization <debug\|release\|release-with-debug>` | Pick the optimization profile. `--release` with any other value exits 2 |
| `--profile <name>` | Use the named `[profiles.<name>]` from the manifest |
| `--profile-input <json>` | Supply a complete logical profile as JSON |
| `--stdlib <directory>` | Use this std lib instead of the one installed beside `silk`. A directory without `compositions.json` exits 1 |
| `--clang <path>` | `build`, `run` and `test` only. Use this Clang; a bare name is looked up on `PATH`. See **Build outputs and native linking** |

Without `--target`, a command uses the targets the manifest selects, or the host. Targets, profiles and output paths are described in **Targets and profiles** and **Build outputs and native linking**.

## init

```
silk init [path] [--name <name>] [--lib | --workspace]
```

Creates a package in `path`, or in the current directory. The package name comes from the directory unless you pass `--name`.

| Form | Creates |
| --- | --- |
| `silk init app` | An executable: `silk.toml`, `src/main.silk`, `.gitignore` |
| `silk init --lib util` | A static library: `src/lib.silk`, `exports = ["lib"]`, `[build] artifact = "static-library"` |
| `silk init --workspace ws` | A workspace root: `[workspace] members = []` and `.gitignore` |

Inside a workspace, `silk init` also appends the new package to the root's `members`:

```
Initialized Silk project util at /home/you/ws/util
Added util to the workspace members in /home/you/ws/silk.toml
```

`--workspace` takes no `--name`. `init` refuses to overwrite an existing `silk.toml` and refuses a directory name that is not a valid package name; both exit 2:

```
Refusing to overwrite existing project file /home/you/hello/silk.toml
Cannot derive a portable package name from Bad_Name; pass --name
```

## add and remove

```
silk add <path> [--name <name>] [--manifest-path <path>]
silk remove <name> [--manifest-path <path>]
```

`add` adds the package at `path` as a path dependency, after checking the dependency graph. The dependency name is the package's name with `-` turned into `_`, or `--name`:

```
Added dependency util = { path = "../util" } to /home/you/ws/app/silk.toml
```

`remove` deletes the entry, and the `[dependencies]` table when it becomes empty. Removing a name that is not there exits 2:

```
silk: invalid dependency `util`: the package has no dependency of that name
```

See **Dependencies** in Projects and packages.

## check

```
silk check [project options] [--progress <mode>] [--quiet] [--timings] [--json] [--replay <script> [--differential]]
```

Analyzes every planned target without generating code. Each target prints a heading, a row per phase and a final line, on standard error. See **Diagnostics and silk check**.

```
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    2 modules                         0.13s
  borrow   99 bodies                         0.00s
Finished hello in 0.20s
Checking hello (wasm32-unknown-unknown)
  load     47 modules, 1 in package          0.06s
  check    2 modules                         0.04s
  borrow   27 bodies                         0.00s
Finished hello in 0.11s
```

| Option | Meaning |
| --- | --- |
| `--progress <auto\|live\|plain\|never>` | How progress rows are shown. `auto`, the default, redraws them in place in a terminal and prints each finished row once otherwise. `never` prints none |
| `--quiet`, `-q` | Print only the final line and the diagnostics |
| `--timings` | List the five slowest modules and function bodies before the final line |
| `--json` | Write each diagnostic as one JSON object per line, with no progress output |
| `--replay <script>` | Apply the edits in a TOML script in memory and print the incremental checker's counters for each step, on standard output |
| `--differential` | With `--replay`, also check each step from scratch and exit 1 if the results differ |

## build

```
silk build [project options] [--progress <mode>] [--quiet] [--timings]
```

Builds every planned target. The rows add `codegen` and `link`, and the final line names the program, relative to the package directory:

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     51 modules, 1 in package          0.07s
  check    1 module                          0.00s
  codegen  364 functions                     0.25s
  borrow   115 bodies                        0.01s
  link     clang                             0.17s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 0.55s
```

`--progress`, `--quiet` and `--timings` work as for `check`. `--timings` also lists the slowest functions to emit.

## run

```
silk run [project options] [arguments...] [-- arguments...]
```

Builds the host executable and runs it in the current directory. Options are read up to `--`. Any argument that does not start with `-`, and every argument after `--`, is passed to the program in order. The exit status is the program's own. A program whose `main` returns 7 makes `silk run` exit 7.

At a workspace root, `run` runs the only executable member. With two or more, pass `-p`. A library cannot run:

```
Cannot run static-library artifact
```

## test

```
silk test [project options] [--root <path>] [--file <path>] [--filter <text>] --no-cache
```

Builds the test runner under `build/test/` and runs the selected tests. In this release `--no-cache` is required; without it the command prints a `SILK_GAP test-result-cache` line and exits 2 without running anything.

| Option | Meaning |
| --- | --- |
| `--root <path>` | Discover tests from this module instead of the package root |
| `--file <path>` | Run only tests declared in this source file |
| `--filter <text>` | Run only tests whose `module::name` contains the text, ignoring ASCII case |

`--root` and `--file` name files of one package, so in a workspace they need `-p`. See **Testing**.

## clean

```
silk clean [--manifest-path <path>]
```

Deletes the build output directory and prints `Removed /home/you/hello/build`. At a workspace root it deletes the shared output directory. It succeeds when there is nothing to remove.

## format

```
silk format [paths] [--check] [--manifest-path <path>]
```

Formats every `.silk` file under the package's source root, or only the given files and directories. `--check` reports files that need formatting and changes nothing. Put `--` before a path that starts with `-`. See **Formatting**.

## lsp

```
silk lsp [--stdlib <directory>]
```

Runs a language server that speaks the Language Server Protocol over standard input and output. An editor starts it; you do not run it by hand. It reports diagnostics as you type, lists the declarations in a file, folds blocks, and formats the file the way `silk format` does. Hover, go to definition and signature help work for functions declared in your package, but not yet for std lib names or local variables, and in some function bodies they return nothing. See **Editor setup** in Get started.

## doc, doctest and doc-reference

```
silk doc [--manifest-path <path> | --stdlib] [-o <json>] [--include-private] [--target <triple>] [--stdlib-root <directory>]
silk doctest (-i <json> | --stdlib) [--source-root <directory>] [--target <triple>] [--stdlib-root <directory>]
silk doc-reference [--stdlib-root <directory>] -o <directory> [--check]
```

`-o` is short for `--output` and `-i` for `--input`. `silk doc --help`, `silk doctest --help` and `silk doc-reference --help` print these three lines. `silk doc` warns on standard error about each documentation link that names no declaration. See **Doc tests and reference generation**.

## changes

```
silk changes [--dir <path>] add patch|minor|major "Summary" [--migration "Guidance"]
silk changes [--dir <path>] status [--tag <name>]
silk changes [--dir <path>] version [--tag <name>]
silk changes [--dir <path>] release [--json]
silk changes [--dir <path>] snapshot --commit <sha> [--dev <n>] [--json]
silk changes [--dir <path>] since [version|dependency] [--to <version>] [--from <version>] [--source <path>] [--json]
silk changes [--dir <path>] recover
```

`silk changes --help` prints the full usage with notes. See **Changesets and releases**.

## Single-file forms

Two lower-level forms compile one root module directly. They still need a `silk.toml` in the source file's directory or above it, which supplies the package context. Without one, both stop with exit status 2:

```
No silk.toml found from /home/you/loose; create one
```

```
silk build <source> -o <output> [--emit final|llvm-ir|llvm-bitcode|assembly|object] [--target <triple>] [--clang <path>] [--stdlib <directory>] [--optimization none|speed] [--debug true|false] [--stats]
silk test <root> -o <executable> [--stdlib <directory>] [--filter <text>] [--file <path>] [--optimization none|speed] [--debug true|false] --no-cache
```

`--emit` picks the output stage: `llvm-ir` writes LLVM text, `object` an object file. `--stats` prints compiler query counters. These forms print each diagnostic as a `SILK_BUILD_ERROR=` JSON record with the code and byte span, and no message; use `silk check` to read errors.

## Exit status

| Status | Meaning |
| --- | --- |
| 0 | Success. For `format --check`: every file is already formatted |
| 1 | The work ran and failed: compile errors, a failing test, a `--file` or `--filter` that matched no test, files that need formatting, a failing doc test, stale reference pages, a `--stdlib` that is not a std lib, a bad native link input, a source file or folder named `silk` or `Intrinsic`, any `silk changes` error including a malformed `silk changes` command line |
| 2 | The command could not start: a malformed command line (it prints the synopsis), an unknown command, no manifest, an invalid manifest (including an unknown key or a profile field the native compiler cannot build yet), an invalid `--profile-input`, an executable built with `runtime = { kind = "none" }` that exports no C `main`, an unknown target or profile, an unknown workspace member, conflicting options, `test` without `--no-cache`, a refused `init`, `add` or `remove`, a Clang that is missing or does not start, a construct the compiler does not support yet |
| other | `silk run` only: the program's own status |

In a workspace, each member gets a status and the command exits with the worst one: 2 over 1 over 0.

## Environment variables

| Variable | Used for |
| --- | --- |
| `PATH` | Finding `clang`, and finding the installed `silk` and its std lib |
| `SILK_CLANG` | The Clang executable, when `--clang` is not given |
| `SILK_LLVM_AR` | The archiver for static libraries; default is `llvm-ar` beside Clang |
| `SDKROOT`, `DEVELOPER_DIR` | macOS SDK selection; an invalid `SDKROOT` is an error |
| `SILK_PROGRESS` | The progress style for `check` and `build` when `--progress` is not given: `auto`, `live`, `plain` or `never`. An invalid value is ignored |
| `NO_COLOR` | Set to a non-empty value, turns off colors in live progress output |
| `COLUMNS` | The width of live progress output; default 80 |
| `TERM` | `dumb` turns live progress output into plain rows |
| `SSL_CERT_FILE` | The certificate bundle for `silk changes since` when it fetches releases over HTTPS |
| `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL`, `LC_CTYPE` | Passed through to Clang; no other variable is |

The installer reads `SILK_INSTALL`, `SILK_RELEASE` and `SILK_CHANNEL`; see **Install**. The std lib is found at `lib/silk/stdlib` beside the `bin` directory that holds `silk`, following symbolic links.

## Output streams

Test results, `--replay` lines, the `run ...: failed` lines of `silk run`, `formatted` and `unchanged` go to standard output. Progress rows, diagnostics, refusals, warnings, `needs formatting`, and `SILK_GAP` notices go to standard error. `silk run` and `silk test` print no progress rows. A program started by `silk run` writes to both as it chooses.
