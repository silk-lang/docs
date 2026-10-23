# Command-line reference

Every `silk` command, its options and its exit status. `silk help` (or `silk --help`) prints one line for each command, and `silk help <command>` (or `silk <command> --help`) prints that command's options. The pages after this one explain testing, formatting, diagnostics, documentation and changesets in more depth.

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
| `silk toolchain <subcommand>` | List, install, pin and remove Silk toolchains |
| `silk +<version> <command>` | Run the command with that installed toolchain |
| `silk help`, `silk --help`, `-h` | Print one line for each command and exit 0 |
| `silk help <command>`, `silk <command> --help`, `-h` | Print that command's usage lines and exit 0 |
| `silk --version`, `-v` | Print `silk v0.1.0` and exit 0 |

An unknown command prints `` silk: unknown command `frobnicate`  `` and the command list, and exits 2. So does `silk help frobnicate`. A lone argument that is not a command is read as a Silk source file whose syntax tree to print, a debugging aid. When no such file exists, `silk foo.silk` prints `` silk: no such source file `foo.silk`; a lone argument is a command or a Silk source file to dump `` and the command list, and exits 2.

An option a command does not take is named, with the closest option it does take, followed by that command's usage lines; the exit status is 2:

```
$ silk check --relase
silk check: unknown option `--relase`; did you mean `--release`?
usage: silk check [--manifest-path <path>] [--package <name>]... [--workspace] [--target <host|triple>]... [--release] [--optimization <profile>] [--profile <name>] [--profile-input <json>] [--stdlib <directory>] [--progress auto|live|plain|never] [--quiet] [--timings] [--json] [--replay <script> [--differential]]
```

## Finding the project

Project commands start from the current directory and walk up to the nearest `silk.toml`. `--manifest-path <path>` names the manifest directly and turns the search off.

When no manifest is found, the command stops with exit status 2:

```
No silk.toml found from /home/you; run `silk init` to create a package here, or `silk init <name>` for a new folder
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
| `--timings` | List the five slowest modules and function bodies before the final line. Bodies are named as written, such as `silk/list.List<T>.appendBytes`; a body inside a conformance shows it in parentheses, such as `main.(Equal for Point).equals` |
| `--json` | Write each diagnostic as one JSON object per line, with no progress output |
| `--replay <script>` | Apply the edits in a TOML script in memory and print the incremental checker's counters for each step, on standard output |
| `--differential` | With `--replay`, also check each step from scratch and exit 1 if the results differ |

## build

```
silk build [project options] [--progress <mode>] [--quiet] [--timings]
```

Builds every planned target. The rows add `codegen` and `link`, and the final line names the program, relative to the current directory, or in full when it is outside it, as from inside a workspace member:

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
silk run [project options] [--progress <mode>] [--quiet] [arguments...] [-- arguments...]
```

Builds the host executable and runs it in the current directory. The build prints the same progress output as `silk build`, on standard error, and ends with `Finished` before the program starts or `Failed` when it does not build. Standard output carries only the program's output. `--progress` and `--quiet` work as for `check`.

Options are read up to `--`. Any argument that does not start with `-`, and every argument after `--`, is passed to the program in order. The exit status is the program's own. A program whose `main` returns 7 makes `silk run` exit 7. A build that fails exits 1, or 2 when Clang is missing or the construct is not supported yet, and the program does not start.

```
$ silk run --quiet -- Ada
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 1.49s
Hello, Ada!
```

At a workspace root, `run` runs the only executable member. With two or more, pass `-p`. A library cannot run:

```
Cannot run static-library artifact
```

## test

```
silk test [project options] [--root <path>] [--file <path>] [--filter <text>]
```

Builds the test runner under `build/test/` and runs the selected tests. `--no-cache` is accepted and changes nothing in this release, because test results are not cached yet.

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

Deletes the build output directory and prints `Removed /home/you/hello/build`. At a workspace root it deletes the shared output directory. When there is nothing to remove, it prints `Nothing to clean: /home/you/hello/build does not exist` and still exits 0.

## format

```
silk format [paths] [--check] [--manifest-path <path>]
```

Formats every `.silk` file under the package's source root, or only the given files and directories. `--check` reports files that need formatting and changes nothing. Put `--` before a path that starts with `-`. See **Formatting**.

## lsp

```
silk lsp [--stdlib <directory>]
```

Runs a language server that speaks the Language Server Protocol over standard input and output. An editor starts it; you do not run it by hand. It reports diagnostics as you type, lists the declarations in a file, folds blocks, and formats the file the way `silk format` does. Hover, go to definition and signature help work for the functions you call, from your package or the std lib, and for local variables where they are used. Inlay hints show the type of each `let` binding. Completion, find references, rename and workspace symbol search work over the package. See **Editor setup** in Get started.

## doc, doctest and doc-reference

```
silk doc [--manifest-path <path> | --stdlib] [-o <json>] [--include-private] [--target <triple>] [--stdlib-root <directory>]
silk doctest (-i <json> | --stdlib) [--source-root <directory>] [--target <triple>] [--stdlib-root <directory>]
silk doc-reference [--stdlib-root <directory>] -o <directory> [--check]
```

`-o` is short for `--output` and `-i` for `--input`. `silk doc --help`, `silk doctest --help` and `silk doc-reference --help` print these three lines. `silk doc` warns on standard error about each documentation link that names no declaration. A link to a private declaration resolves only with `--include-private`. See **Doc tests and reference generation**.

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

## toolchain

```
silk toolchain list [--json]
silk toolchain which [--json]
silk toolchain install [version] [--json]
silk toolchain use <version> [--json]
silk toolchain default <version>
silk toolchain uninstall <version>
```

Manages the Silk versions installed side by side in `$SILK_HOME/toolchains/<version>` (`SILK_HOME` defaults to `~/.silk`). When `SILK_HOME` is unset and `HOME` names no existing directory, `install`, `use`, `default` and `uninstall` create nothing and exit 1 with `silk toolchain: cannot find the toolchain directory; set SILK_HOME to an absolute path, or HOME to an existing directory`; `list` and `which` still show the running compiler. Each toolchain is a release archive unpacked as is: `bin/silk` beside `lib/silk/stdlib`. No subcommand prompts. Results go to standard output, and `--json` prints one JSON object instead. `silk toolchain help`, `silk toolchain --help` and `silk toolchain -h` print the usage above with notes and exit 0. `silk help toolchain` prints the one-line synopsis of `silk toolchain`.

| Subcommand | What it does |
| --- | --- |
| `list` | Every installed toolchain, newest first, and the running compiler. `*` marks the one selected here; tags say `pinned here`, `default` and `running` |
| `which` | The selected version, why it was selected, and the path of its `silk`. Exits 3 when it is not installed |
| `install [version]` | Download, verify and install a release. Without a version, installs the selected one |
| `use <version>` | Install a release, then pin the project to it in `silk.toml` |
| `default <version>` | Write `default = "<version>"` to `$SILK_HOME/settings.toml` |
| `uninstall <version>` | Delete that toolchain's directory |

```
$ silk toolchain list
  0.2.0  /home/you/.silk/toolchains/0.2.0/bin/silk
* 0.1.0  (pinned here, default)  /home/you/.silk/toolchains/0.1.0/bin/silk
  0.0.0  (running)  /home/you/silk/bin/silk
$ silk toolchain which
0.1.0 (package silk-version in /home/you/app/silk.toml)
/home/you/.silk/toolchains/0.1.0/bin/silk
$ silk toolchain which --json
{"version":"0.1.0","origin":"package","manifest":"/home/you/app/silk.toml","installed":true,"path":"/home/you/.silk/toolchains/0.1.0/bin/silk","running":false,"install":"silk toolchain install 0.1.0"}
```

Here `silk` itself is a compiler built from source, which reports version 0.0.0. A compiler that is not in the toolchain store, such as a local build, shows in `list` as an extra row tagged `running`. When the running compiler is one of the installed toolchains, its row carries the `running` tag instead.

### Which version a command runs

`silk` picks a version before every command. The first of these that is set wins:

| Origin | `which` says | JSON `origin` |
| --- | --- | --- |
| `silk +<version> <command>` | `selected with +<version>` | `command-line` |
| `SILK_TOOLCHAIN` | `selected by SILK_TOOLCHAIN` | `environment` |
| `[workspace].silk-version` of a workspace that lists the package | `workspace silk-version in <manifest>` | `workspace` |
| `[package].silk-version` of the nearest `silk.toml` | `package silk-version in <manifest>` | `package` |
| `default` in `$SILK_HOME/settings.toml` | `default in settings.toml` | `default` |
| the running compiler | `the running compiler` | `running` |

`silk-version = "0.0.0"` pins nothing. A version without build metadata, such as `0.1.0-dev.6`, matches the newest installed build of it, such as `0.1.0-dev.6+1aed5da1a342`.

When the selected version is not the running compiler, `silk` sets `SILK_TOOLCHAIN` to the toolchain's full version and replaces itself with that toolchain's `silk`, which runs the command. `silk toolchain` itself always runs in the compiler you started. `SILK_TOOLCHAIN=local` selects the running compiler; `silk toolchain which` then names its version and path, with the origin `selected by SILK_TOOLCHAIN`. A compiler built from source reports version 0.0.0 and follows only `+<version>`.

When the selected toolchain is not installed, the command does not run. It exits 3:

```
$ silk +0.3.0 build
silk: Silk 0.3.0 (selected with +<version>) is not installed.
Install it with: silk toolchain install 0.3.0
```

A `+` argument that is not a semantic version is a usage error, exit 2:

```
$ silk +garbage build
silk: `+garbage` is not a Silk version; +<version> takes a semantic version such as +0.1.0-dev.6
```

With `SILK_AUTO_INSTALL=1` in the environment, or `auto-install = true` in `$SILK_HOME/settings.toml`, a missing toolchain is installed first, with the notice `silk: installing Silk <version> (auto-install is on)` and the install output on standard error, so the command's own output stays alone on standard output.

`silk lsp` behaves differently, because an editor starts it. When its toolchain is missing, it prints the same lines on standard error and then serves a minimal language server: it answers `initialize` with no capabilities, shows the message in the editor with `window/showMessage`, answers other requests with a `MethodNotFound` error, and exits 0 after `shutdown` and `exit`.

### install and use

`install` downloads `silk-<version>-<target>.tar.gz`, its `.minisig` signature and `native-seed.json` from the silk-lang/silk GitHub releases, over HTTPS. Before installing, it checks:

- the archive is signed by the Silk release key, and the trusted comment reads `silk v<version> <archive name>`;
- `bin/silk` has the SHA-256 that `native-seed.json` names for the host target;
- the archive holds `bin/silk` and `lib/silk/stdlib` and no path outside its top folder.

It unpacks into a hidden staging folder in `$SILK_HOME/toolchains` and renames it into place only when every check passes, so a failed or interrupted install leaves nothing. Installing a toolchain that is already there changes nothing:

```
$ silk toolchain install 0.1.0-dev.6+1aed5da1a342
Installed Silk 0.1.0-dev.6+1aed5da1a342 in /home/you/.silk/toolchains/0.1.0-dev.6+1aed5da1a342
$ silk toolchain install 0.1.0-dev.6+1aed5da1a342 --json
{"version":"0.1.0-dev.6+1aed5da1a342","path":"/home/you/.silk/toolchains/0.1.0-dev.6+1aed5da1a342","changed":false}
```

A version without build metadata is resolved to its newest published build, which needs the GitHub release listing. A full version does not. `install` does not change the default toolchain or `$SILK_HOME/bin/silk`; `default` and the installer do.

`SILK_TOOLCHAIN_MIRROR` names an absolute directory to install from instead of GitHub, for machines without access to it. It holds one `v<version>` folder of release assets per release, and the same checks apply. A relative path is refused with exit status 1: `silk toolchain: SILK_TOOLCHAIN_MIRROR must be an absolute directory path`. A tampered archive is refused with exit status 5:

```
silk toolchain: silk-0.1.0-dev.6+1aed5da1a342-x86_64-unknown-linux-gnu.tar.gz is not signed by the Silk release key: the signature does not match the file
```

`use` installs first, so a version that cannot be installed is never pinned. Then it writes `silk-version` into the `[workspace]` table of the workspace that lists the package, or into the package's own `[package]` table:

```
$ silk toolchain use 0.1.0-dev.6+1aed5da1a342
Pinned Silk 0.1.0-dev.6+1aed5da1a342 in /home/you/app/silk.toml ([package].silk-version)
Was 0.1.0-dev.5. See what changed since then: silk changes since 0.1.0-dev.5
```

The second line, on standard error, appears when the pin changed from another version. Outside a project, `use` exits 1 with `` silk toolchain: no silk.toml here or above; run `silk init` first ``. `use` refuses `0.0.0`.

### default and uninstall

```
$ silk toolchain default 0.1.0
Default toolchain: 0.1.0
$ silk toolchain uninstall 0.2.0
Removed 0.2.0
$ silk toolchain uninstall 0.5.0
0.5.0 is not installed; nothing to remove
```

`default` accepts a version that is not installed yet and adds a note on standard error naming the install command. `uninstall` refuses, with exit status 1, the toolchain that `$SILK_HOME/bin/silk` links to, so that `silk` keeps working.

### Exit status of toolchain commands

| Status | Meaning |
| --- | --- |
| 0 | Success, including a command that changed nothing |
| 1 | Failure: no toolchain directory, no `silk.toml` for `use`, a mirror that cannot be read, a toolchain that cannot be removed |
| 2 | Usage error: unknown subcommand or option, a version that is not a semantic version, `install` with nothing selected |
| 3 | The selected toolchain is not installed. Any command can exit 3 this way |
| 4 | A download failed |
| 5 | A release failed verification |

## Single-file forms

Two lower-level forms compile one root module directly. They still need a `silk.toml` in the source file's directory or above it, which supplies the package context. Without one, both stop with exit status 2:

```
No silk.toml found from /home/you/loose; run `silk init` to create a package here, or `silk init <name>` for a new folder
```

```
silk build <source> -o <output> [--emit final|llvm-ir|llvm-bitcode|assembly|object] [--target <triple>] [--clang <path>] [--stdlib <directory>] [--optimization none|speed] [--debug true|false] [--stats]
silk test <root> -o <executable> [--stdlib <directory>] [--filter <text>] [--file <path>] [--optimization none|speed] [--debug true|false]
```

`--emit` picks the output stage: `llvm-ir` writes LLVM text, `object` an object file. `--stats` prints compiler query counters. Diagnostics print the same way as `silk check` prints them, and a successful build prints one `Compiled` line. Paths in that line are relative to the current directory, or absolute when the file is outside it:

```
$ silk build bad.silk -o out
/home/you/demo/bad.silk:1:31: error[SEM0129] Return expected i32 but received bool
$ silk build good.silk -o out
Compiled good.silk -> out (llvm, x86_64-unknown-linux-gnu, 182 symbols)
```

With `SILK_RECEIPTS` set in the environment, a failed build prints each diagnostic as a `SILK_BUILD_ERROR=` JSON record with the code, byte span and module instead, for tools that read them.

## Exit status

| Status | Meaning |
| --- | --- |
| 0 | Success. For `format --check`: every file is already formatted |
| 1 | The work ran and failed: compile errors, a failing test, a `--file` or `--filter` that matched no test, files that need formatting, a failing doc test, stale reference pages, a `--stdlib` that is not a std lib, a bad native link input, a source file or folder named `silk` or `Intrinsic`, any `silk changes` error including a malformed `silk changes` command line |
| 2 | The command could not start: a malformed command line (it names the argument it refuses, suggests the closest option for a misspelled one, and prints the command's usage lines), an unknown command, no manifest, an invalid manifest (including an unknown key or a profile field the native compiler cannot build yet), an invalid `--profile-input`, an executable built with `runtime = { kind = "none" }` that exports no C `main`, an unknown target or profile, an unknown workspace member, conflicting options, `test` without `--no-cache`, a refused `init`, `add` or `remove`, a Clang that is missing or does not start, a construct the compiler does not support yet |
| 3, 4, 5 | The selected toolchain is not installed, a toolchain download failed, or a release failed verification. See "Exit status of toolchain commands" |
| other | `silk run` only: the program's own status |

In a workspace, each member gets a status and the command exits with the worst one: 2 over 1 over 0.

## Environment variables

| Variable | Used for |
| --- | --- |
| `PATH` | Finding `clang`, and finding the installed `silk` and its std lib |
| `SILK_CLANG` | The Clang executable, when `--clang` is not given |
| `SILK_LLVM_AR` | The archiver for static libraries; default is `llvm-ar` beside Clang |
| `SDKROOT`, `DEVELOPER_DIR` | macOS SDK selection; an invalid `SDKROOT` is an error |
| `SILK_PROGRESS` | The progress style for `check`, `build` and `run` when `--progress` is not given: `auto`, `live`, `plain` or `never`. An invalid value is ignored |
| `NO_COLOR` | Set to a non-empty value, turns off colors in live progress output |
| `COLUMNS` | The width of live progress output; default 80 |
| `TERM` | `dumb` turns live progress output into plain rows |
| `SILK_RECEIPTS` | Set, makes the single-file `silk build` print diagnostics as `SILK_BUILD_ERROR=` JSON records |
| `SSL_CERT_FILE` | The certificate bundle for `silk changes since` and `silk toolchain install` when they fetch releases over HTTPS |
| `SILK_HOME` | Where toolchains and `settings.toml` live; default `~/.silk`. Must be an absolute path |
| `SILK_TOOLCHAIN` | The toolchain version to run, overriding the project's pin; `local` keeps the running compiler |
| `SILK_AUTO_INSTALL` | `1` installs a missing selected toolchain before running the command |
| `SILK_TOOLCHAIN_MIRROR` | An absolute directory of release assets to install toolchains from instead of GitHub |
| `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL`, `LC_CTYPE` | Passed through to Clang; no other variable is |

The installer reads `SILK_HOME`, `SILK_RELEASE` and `SILK_CHANNEL`; see **Install**. The std lib is found at `lib/silk/stdlib` beside the `bin` directory that holds `silk`, following symbolic links.

## Output streams

Test results, `--replay` lines, `formatted` and `unchanged` go to standard output. Progress rows, diagnostics, refusals, warnings, `needs formatting`, and `SILK_GAP` notices go to standard error. `silk run` prints its build's progress rows on standard error and leaves standard output to the program, which writes to both as it chooses. `silk test` prints no progress rows.
