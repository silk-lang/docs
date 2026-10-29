# Command-line reference

Every `silk` command, its options and its exit status. `silk` is the tool you type: it installs Silk versions, records release notes, and hands every other command to `silkc`, the compiler of the version a project pins. `silk help` (or `silk --help`) prints one line for each command, and `silk help <command>` (or `silk <command> --help`) prints that command's options. The pages after this one explain testing, formatting, diagnostics, documentation and changesets in more depth.

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
| `silk doctest` | Check and run the Silk examples in documentation comments |
| `silk doc-reference` | Generate the Markdown std lib reference |
| `silk change <subcommand>` | Record changes, version and release the package |
| `silk use`, `silk set`, `silk update self` | Install, pin and select Silk versions, and update the tool |
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

A manifest that has `[workspace]` and no `[package]` is a workspace root. At a root, `check`, `build`, `test` and `doctest` run every member, and `format` and `doc` cover every member. See **Workspaces** in Projects and packages.

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
| `silk init --lib util` | A library: `src/lib.silk`, `kind = "library"`, `exports = ["lib"]` |
| `silk init --workspace ws` | A workspace root with `.gitignore` and one starter executable member, `app`: `[workspace] members = ["app"]`. `--name` names the member |

Inside a workspace, `silk init` also appends the new package to the root's `members`:

```
Initialized Silk project util at /home/you/ws/util
Added util to the workspace members in /home/you/ws/silk.toml
```

`init` refuses to overwrite an existing `silk.toml` and refuses a directory name that is not a valid package name; both exit 2:

```
Refusing to overwrite existing project file /home/you/hello/silk.toml
Cannot derive a portable package name from Bad_Name; pass --name
```

## add and remove

```
silk add <path> [--name <name>] [--manifest-path <path>]
silk remove <name> [--manifest-path <path>]
```

`add` adds the package at `path` as a path dependency, after checking the dependency graph. It cannot add a git dependency; write that entry by hand. It never fetches, so a manifest whose git dependencies are not fetched yet is refused until `silk check` or a build fetches them. The dependency name is the package's name with `-` turned into `_`, or `--name`:

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
  load     143 modules, 1 in package         0.06s
  check    2 modules                         0.14s
  borrow   123 bodies                        0.00s
Finished hello in 0.22s
Checking hello (wasm32-wasip1)
  load     136 modules, 1 in package         0.02s
  check    2 modules                         0.08s
  borrow   79 bodies                         0.00s
Finished hello in 0.11s
```

That is `silk check --target host --target wasm32-wasip1` on the program `silk init` writes.

| Option | Meaning |
| --- | --- |
| `--progress <auto\|live\|plain\|never>` | How progress rows are shown. `auto`, the default, redraws them in place in a terminal and prints each finished row once otherwise. `never` prints none |
| `--quiet`, `-q` | Print only the final line and the diagnostics |
| `--timings` | List the five slowest modules and function bodies before the final line. Bodies are named as written, such as `silk/collections/list.List<T>.appendBytes`; a body inside a conformance shows it in parentheses, such as `main.(Equal for Point).equals` |
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
  load     143 modules, 1 in package         0.03s
  check    1 module                          0.00s
  codegen  689 functions                     0.28s
  borrow   229 bodies                        0.01s
  link     clang                             0.36s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 0.71s
```

`--progress`, `--quiet` and `--timings` work as for `check`. `--timings` also lists the slowest functions to emit.

## run

```
silk run [project options] [--progress <mode>] [--quiet] [arguments...] [-- arguments...]
```

Builds the executable and runs it in the current directory. On a WASI target it runs the module with `wasmtime`; see **Targets and profiles**. The build prints the same progress output as `silk build`, on standard error, and ends with `Finished` before the program starts or `Failed` when it does not build. Standard output carries only the program's output. `--progress` and `--quiet` work as for `check`.

Options are read up to `--`. Any argument that does not start with `-`, and every argument after `--`, is passed to the program in order. The exit status is the program's own. A program whose `main` returns 7 makes `silk run` exit 7. A build that fails exits 1, or 2 when Clang is missing or the construct is not supported yet, and the program does not start.

```
$ silk run --quiet -- Ada
Finished build/llvm/x86_64-unknown-linux-gnu/debug/hello in 0.78s
Hello, Ada!
```

At a workspace root, `run` runs the only executable member. With two or more, pass `-p`. A library cannot run:

```
Cannot run library artifact
```

## test

```
silk test [project options] [--root <path>] [--file <path>] [--filter <text>] [--timeout <seconds>] [--no-cache]
```

Builds the test runner under `build/test/` and runs the selected tests. When nothing the runner was built from has changed, the next run reuses it instead of building it again. Every run executes every selected test.

| Option | Meaning |
| --- | --- |
| `--root <path>` | Discover tests from this module instead of the package root |
| `--file <path>` | Run only tests declared in this source file |
| `--filter <text>` | Run only tests whose `module::name` contains the text, ignoring ASCII case |
| `--timeout <seconds>` | Fail a test that runs longer than this; 60 by default, `0` for no limit |
| `--no-cache` | Build the runner again even when nothing changed |

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

Runs a language server that speaks the Language Server Protocol over standard input and output. An editor starts it; you do not run it by hand. It reports diagnostics as you type, lists the declarations in a file, folds blocks, and formats the file the way `silk format` does. Hover and go to definition work on the names you use and declare, from your package or the std lib, and signature help on the call you type. Inlay hints show the type of each `let` binding. Completion, find references, rename and workspace symbol search work over the package. See **Editor setup** in Get started.

## doc, doctest and doc-reference

```
silk doc [--manifest-path <path> | --stdlib] [-o <json>] [--include-private] [--target <triple>] [--stdlib-root <directory>]
silk doctest [--manifest-path <path>] [--target <triple>] [--stdlib-root <directory>]
silk doctest (-i <json> | --stdlib) [--source-root <directory>] [--target <triple>] [--stdlib-root <directory>]
silk doc-reference [--stdlib-root <directory>] -o <directory> [--check]
```

`-o` is short for `--output` and `-i` for `--input`. `silk doc --help`, `silk doctest --help` and `silk doc-reference --help` print these lines. `silk doc` warns on standard error about each documentation link that names no declaration. A link to a private declaration resolves only with `--include-private`. See **Doc tests and reference generation**.

## change

```
silk change [--dir <path>] patch|minor|major "Summary" [--migration "Guidance"]
silk change [--dir <path>] status [--tag <name>]
silk change [--dir <path>] version [--tag <name>]
silk change [--dir <path>] release [--json]
silk change [--dir <path>] snapshot --commit <sha> [--dev <n>] [--json]
silk change [--dir <path>] since [version|dependency] [--to <version>] [--from <version>] [--source <path>] [--json]
silk change [--dir <path>] recover
```

`silk change --help` prints the full usage with notes. The `silk` tool runs these itself, whatever version the project pins. See **Changesets and releases**.

## Silk versions

```
silk use [--json]
silk use <version> [--dev] [--json]
silk use list [--json]
silk use which [--json]
silk use uninstall <version>
silk set <version> [--dev] [--json]
silk update self [--dev]
silk +<version> <command> [args]
```

Silk ships as two programs. `silk` is the tool, the command you type, and the installer puts it on your `PATH`. `silkc` is the compiler, one per installed version. The tool manages the Silk versions installed side by side in `$SILK_HOME/toolchains/<version>` (`SILK_HOME` defaults to `~/.silk`) and runs every other command, unchanged, with the `silkc` of the version the directory selects: `silk build` is `silkc build` from the pinned version. The compilers are not on your `PATH`, so editors, scripts and habit always reach the pinned one. When nothing selects a version, the tool runs the `silkc` in the same folder as itself, which is how a release archive, Homebrew or mise works without `~/.silk`.

Each installed version is a release archive unpacked as is, without its `bin/silk`: `bin/silkc` beside `lib/silk/stdlib`. No command prompts. Results go to standard output, and `--json` prints one JSON object instead. `silk --help` prints the usage with notes, and `silk --version` prints the version the directory selects, as `silk v0.1.0`. When `SILK_HOME` is unset and `HOME` names no existing directory, commands that need the store exit 1 with `silk: cannot find the toolchain directory; set SILK_HOME to an absolute path, or HOME to an existing directory`.

| Command | What it does |
| --- | --- |
| `use` | Install the version this project pins. Leaves your default alone. Exits 2 where nothing is pinned |
| `use <version>` | Install that version and make it your default, used outside projects and by `silk init`. Never edits a project |
| `use list` | Every installed version, newest first. `*` marks the one selected here; tags say `pinned here` and `default` |
| `use which` | The selected version, why it was selected, and the path of its `silkc`. Exits 3 when it is not installed |
| `use uninstall <version>` | Delete that version's directory |
| `set <version>` | Pin the project to that version in `silk.toml`. Downloads nothing |
| `update self` | Replace the tool with the one from the newest release. Installs no Silk version |

A version is a release such as `0.1.0` or `0.1.0-dev.11`, `latest` (the newest stable release) or `dev` (the newest release, dev releases included); `latest --dev` is the same as `dev`. Until a stable release is published, `latest` names nothing: `silk use latest` exits 1 with `` silk: no stable Silk release is published yet; `latest --dev` names the newest dev release ``. `use <version>` and `set` always write the full version, build metadata included.

```
$ silk use list
* 0.1.0-dev.14+0066f03c8c33  (pinned here, default)  /home/you/.silk/toolchains/0.1.0-dev.14+0066f03c8c33/bin/silkc
$ silk use which
0.1.0-dev.14 (package silk-version in /home/you/app/silk.toml)
/home/you/.silk/toolchains/0.1.0-dev.14+0066f03c8c33/bin/silkc
$ silk use which --json
{"version":"0.1.0-dev.14","origin":"package","manifest":"/home/you/app/silk.toml","installed":true,"path":"/home/you/.silk/toolchains/0.1.0-dev.14+0066f03c8c33/bin/silkc","install":"silk use"}
```

A version released before the compiler was named `silkc` holds only `bin/silk`, the compiler; the tool runs that one instead.

### Which version a command runs

The tool picks a version before every command it forwards. The first of these that is set wins:

| Origin | `which` says | JSON `origin` |
| --- | --- | --- |
| `silk +<version> <command>` | `selected with +<version>` | `command-line` |
| `SILK_TOOLCHAIN` | `selected by SILK_TOOLCHAIN` | `environment` |
| `[workspace].silk-version` of a workspace that lists the package | `workspace silk-version in <manifest>` | `workspace` |
| `[package].silk-version` of the nearest `silk.toml` | `package silk-version in <manifest>` | `package` |
| `default` in `$SILK_HOME/settings.toml` | `default in settings.toml` | `default` |

`silk-version = "0.0.0"` pins nothing. A version without build metadata, such as `0.1.0-dev.11`, matches the newest installed build of it, such as `0.1.0-dev.11+6de14da2a8a6`.

The tool then replaces itself with that version's `silkc`, passing the arguments unchanged without the `+<version>`, and sets `SILK_TOOLCHAIN` to the full version and `SILK_HOME`. It never reads a forwarded command's options, so a compiler command the tool does not know still works.

When the selected version is not installed, the command does not run. It exits 3:

```
$ silk build
silk: Silk 0.1.0-dev.10+3934b61998da (package silk-version in /home/you/app/silk.toml) is not installed.
Install it with: silk use
```

When nothing selects a version and no `silkc` sits beside the tool, it also exits 3, with `silk: no Silk version is selected here: no project pins one and there is no default. Install the newest Silk as the default with: silk use latest`. A `+` argument that is not a semantic version is a usage error, exit 2:

```
$ silk +garbage build
silk: `+garbage` is not a Silk version; +<version> takes a semantic version such as +0.1.0-dev.11
```

A `silk-version` the tool cannot read, such as a form a newer tool understands, is a configuration error, exit 2, ending with `A newer tool may read it; update silk with: silk update self`. The tool never guesses what such a pin means.

With `SILK_AUTO_INSTALL=1` in the environment, or `auto-install = true` in `$SILK_HOME/settings.toml`, a missing version is installed first, with the notice `silk: installing Silk <version> (auto-install is on)` and the install output on standard error, so the command's own output stays alone on standard output. This install does not change your default.

`silk lsp` behaves differently, because an editor starts it. When the version is missing, the tool prints the same lines on standard error and then serves a minimal language server: it answers `initialize` with no capabilities, shows the message in the editor with `window/showMessage`, answers other requests with a `MethodNotFound` error, and exits 0 after `shutdown` and `exit`.

### use

`use` downloads `silk-<version>-<target>.tar.gz`, its `.minisig` signature and `native-seed.json` from the silk-lang/silk GitHub releases, over HTTPS. Before installing, it checks:

- the archive is signed by the Silk release key, and the trusted comment reads `silk v<version> <archive name>`;
- the compiler `bin/silkc` has the SHA-256 that `native-seed.json` names for the host target;
- the archive holds the compiler and `lib/silk/stdlib` and no path outside its top folder.

It unpacks into a hidden staging folder in `$SILK_HOME/toolchains` and renames it into place only when every check passes, so a failed or interrupted install leaves nothing. Installs hold a lock on `$SILK_HOME/.install.lock`, so two at once download a release once. Installing a version that is already there downloads nothing. Inside a project that pins another version, `use <version>` adds a note on standard error saying how to move the project with `silk set`.

A version without build metadata is resolved to its newest published build, which needs the GitHub release listing. A full version does not.

`SILK_TOOLCHAIN_MIRROR` names an absolute directory to install from instead of GitHub, for machines without access to it. It holds one `v<version>` folder of release assets per release, and the same checks apply. A relative path is refused with exit status 1: `silk: SILK_TOOLCHAIN_MIRROR must be an absolute directory path`. A tampered archive is refused with exit status 5:

```
silk: silk-0.1.0-dev.14+0066f03c8c33-x86_64-unknown-linux-gnu.tar.gz is not signed by the Silk release key: the signature does not match the file
```

### set

`set` writes `silk-version` into the `[workspace]` table of the workspace that lists the package, or into the package's own `[package]` table, and moves the members' own pins along with a workspace pin. It downloads nothing, so it also works offline for a full version:

```
$ silk set 0.1.0-dev.13
Pinned Silk 0.1.0-dev.13+e62f1b34f810 in /home/you/app/silk.toml ([package].silk-version, was 0.1.0-dev.14+0066f03c8c33)
Silk 0.1.0-dev.13+e62f1b34f810 is not installed yet. Install it with: silk use
```

The last line goes to standard error. Outside a project, `set` exits 2 with `` silk set: no silk.toml here or above; start a project with `silk init` ``. `set` refuses `0.0.0`.

### uninstall

```
$ silk use uninstall 0.1.0-dev.14
Removed 0.1.0-dev.14+0066f03c8c33
It was your default; choose another with: silk use <version>
This project pins it (package silk-version in /home/you/app/silk.toml), so its commands stop until you reinstall it with: silk use
$ silk use uninstall 0.5.0
0.5.0 is not installed; nothing to remove
```

### update

`silk update self` takes the newest stable release (the newest dev release while none is stable, or always with `--dev`), checks its archive's signature, and replaces `$SILK_HOME/bin/silk` with its `bin/silk`. It installs no Silk version, and leaves a tool that is already as new alone, saying `silk 0.1.0 is up to date (newest release: 0.1.0)`. This and the installer are the only ways the tool changes; it never updates itself on its own.

`silk update silk` changes nothing and exits 2, because Silk versions are installed side by side rather than updated:

```
$ silk update silk
silk update silk: Silk versions are not updated in place.
To install the newest Silk as your default: silk use latest
To move this project to it: silk set latest, then silk use
```

### Exit status of the tool

| Status | Meaning |
| --- | --- |
| 0 | Success, including a command that changed nothing |
| 1 | Failure: no toolchain directory, a mirror that cannot be read, a version that cannot be removed, a release without the silk tool for `update self` |
| 2 | Usage or configuration error: unknown subcommand or option, a version that is not a semantic version, `use` or `set` with no project, a pin the tool cannot read |
| 3 | The selected version is not installed, or nothing selects one. Any forwarded command can exit 3 this way |
| 4 | A download failed |
| 5 | A release failed verification |

## Single-file forms

Two lower-level forms compile one root module directly. They still need a `silk.toml` in the source file's directory or above it, which supplies the package context. Without one, both stop with exit status 2:

```
No silk.toml found from /home/you/loose; run `silk init` to create a package here, or `silk init <name>` for a new folder
```

```
silk build <source> -o <output> [--emit final|llvm-ir|llvm-bitcode|assembly|object] [--target <triple>] [--clang <path>] [--stdlib <directory>] [--optimization none|speed|size] [--debug true|false] [--stats]
silk test <root> -o <executable> [--stdlib <directory>] [--filter <text>] [--file <path>] [--timeout <seconds>] [--optimization none|speed|size] [--debug true|false] [--no-cache]
```

`--emit` picks the output stage: `llvm-ir` writes LLVM text, the whole-program module the executable would link, and `object` an object file. `--optimization` names the Clang optimization directly: `none` (`-O0`), `speed` (`-O2`) or `size` (`-Oz`). The source file must sit below the package's source root; when that folder does not exist, both forms stop with `silk: invalid source root` (exit 1). `--stats` prints compiler query counters. Diagnostics print the same way as `silk check` prints them, and a successful build prints one `Compiled` line. Paths in that line are relative to the current directory, or absolute when the file is outside it:

```
$ silk build bad.silk -o out
/home/you/demo/bad.silk:1:31: error[SEM0129] Return expected i32 but received bool
$ silk build good.silk -o out
Compiled good.silk -> out (llvm, x86_64-unknown-linux-gnu, 243 symbols)
```

With `SILK_RECEIPTS` set in the environment, a failed build prints each diagnostic as a `SILK_BUILD_ERROR=` JSON record with the code, byte span and module instead, for tools that read them.

## Exit status

| Status | Meaning |
| --- | --- |
| 0 | Success. For `format --check`: every file is already formatted |
| 1 | The work ran and failed: compile errors, a failing test, a `--file` or `--filter` that matched no test, files that need formatting, a failing doc test, stale reference pages, a `--stdlib` that is not a std lib, a bad native link input, any `silk change` error including a malformed `silk change` command line |
| 2 | The command could not start: a malformed command line (it names the argument it refuses, suggests the closest option for a misspelled one, and prints the command's usage lines), an unknown command, no manifest, an invalid manifest (including an unknown key or a profile field the native compiler cannot build yet), an invalid `--profile-input`, an executable built with `runtime = { kind = "none" }` that exports no C `main`, an unknown target or profile, an unknown workspace member, a source file or folder named `silk` or `Intrinsic`, a dependency or `exports` problem, conflicting options, a refused `init`, `add` or `remove`, a Clang that is missing or does not start, a construct the compiler does not support yet |
| 3, 4, 5 | From the tool: the selected version is not installed, a download failed, or a release failed verification. See "Exit status of the tool" |
| other | `silk run` only: the program's own status |

In a workspace, each member gets a status and the command exits with the worst one: 2 over 1 over 0.

## Environment variables

| Variable | Used for |
| --- | --- |
| `PATH` | Finding `clang`, `git` (to fetch git dependencies) and the `silk` tool |
| `SILK_CLANG` | The Clang executable, when `--clang` is not given |
| `SILK_LLVM_AR` | The archiver for static libraries; default is `llvm-ar` beside Clang |
| `SDKROOT`, `DEVELOPER_DIR` | macOS SDK selection; an invalid `SDKROOT` is an error |
| `SILK_PROGRESS` | The progress style for `check`, `build` and `run` when `--progress` is not given: `auto`, `live`, `plain` or `never`. An invalid value is ignored |
| `NO_COLOR` | Set to a non-empty value, turns off colors in live progress output |
| `COLUMNS` | The width of live progress output; default 80 |
| `TERM` | `dumb` turns live progress output into plain rows |
| `SILK_RECEIPTS` | Set, makes the single-file `silk build` print diagnostics as `SILK_BUILD_ERROR=` JSON records |
| `SILK_PROFILE_GENERATE` | A directory: native builds pass `-fprofile-generate=<dir>` to Clang, for profile-guided optimization. See **Targets and profiles** |
| `SILK_PROFILE_USE` | A merged `.profdata` file: native builds pass `-fprofile-use=<file>` to Clang |
| `SILK_WASMTIME` | The `wasmtime` that `silk run` and `silk test` use on a WASI target; default `wasmtime` on `PATH` |
| `SILK_WASM_TOOLS` | The `wasm-tools` that builds a `wasm32-wasip2` component; default `wasm-tools` on `PATH` |
| `SILK_WASI_ADAPTER` | The Preview 1 command adapter, `wasi_snapshot_preview1.command.wasm`, that a `wasm32-wasip2` executable needs |
| `SILK_WASI_REACTOR_ADAPTER` | The Preview 1 reactor adapter, for a `wasm32-wasip2` component without a `main` |
| `SSL_CERT_FILE` | The certificate bundle for `silk change since` and `silk use` when they fetch releases over HTTPS |
| `SILK_HOME` | For the tool: where versions, `bin/silk` and `settings.toml` live; default `~/.silk`. Must be an absolute path. For the compiler: git dependencies are checked out in `$SILK_HOME/git`, or `$HOME/.silk/git` when it is unset |
| `SILK_TOOLCHAIN` | For the tool: the version to run, overriding the project's pin. The tool sets it to the full version it runs |
| `SILK_AUTO_INSTALL` | For the tool: `1` installs a missing selected version before running the command |
| `SILK_TOOLCHAIN_MIRROR` | For the tool: an absolute directory of release assets to install from instead of GitHub |
| `HOME`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL`, `LC_CTYPE` | Passed through to Clang; no other variable is |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `ALL_PROXY` (and lowercase), `SSH_AUTH_SOCK`, `GIT_SSH_COMMAND`, `SSL_CERT_FILE`, `SSL_CERT_DIR`, `GIT_SSL_CAINFO`, `XDG_CONFIG_HOME` | Passed through to `git` when it fetches a git dependency, with `PATH`, `HOME`, `USER`, `TMPDIR`, `LANG` and `LC_ALL`; no other variable is. `GIT_TERMINAL_PROMPT=0` is set, so git never prompts |

The installer reads `SILK_HOME`, `SILK_RELEASE` and `SILK_CHANNEL`; see **Install**. The std lib is found at `lib/silk/stdlib` beside the `bin` directory that holds `silkc`, following symbolic links.

## Output streams

Test results, `--replay` lines, `formatted` and `unchanged` go to standard output. Progress rows, diagnostics, refusals, warnings, `needs formatting`, and `SILK_GAP` notices go to standard error. `silk run` prints its build's progress rows on standard error and leaves standard output to the program, which writes to both as it chooses. `silk test` prints no progress rows.
