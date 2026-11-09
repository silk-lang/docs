# The manifest

Every package has a `silk.toml` at its top. It names the package, and can say where its source starts and what a build makes. It also holds build settings, dependencies, profiles and workspace members. This page lists every key the compiler reads.

## Finding the manifest

- Project commands (`build`, `run`, `check`, `test`, `format`, `doc`, `clean`, `add`, `remove`) look for `silk.toml` in the current directory, then in each parent directory, and use the first one found.
- `--manifest-path <file>` names the manifest instead. It must be the file, not its directory.
- With no manifest anywhere up the tree, the command stops:

```
No silk.toml found from /home/you; run `silk init` to create a package here, or `silk init <name>` for a new folder
```

- Paths inside the manifest are relative to the directory that holds it.
- A manifest with only a `[workspace]` table is a workspace root. See **Workspaces**.

## A minimal manifest

`silk init hello` writes this:

```toml
[package]
name = "hello"
version = "0.1.0"
silk-version = "0.1.0"
```

The root module is `src/main.silk` without saying so: the source starts in `src` and the root module is `main.silk`. Only `name` is required, so `[package]` with a `name` alone is a whole manifest.

`silk init --lib` adds `kind = "library"` and `exports = ["lib"]`, and its root module is `src/lib.silk`. See **Libraries and exports**.

## &#91;package\]

| Key | Required | Value | Meaning |
| --- | --- | --- | --- |
| `name` | yes | string | Package name. Starts with a lowercase ASCII letter; then lowercase letters, digits or `_` (`-` is still accepted). `self`, `silk` and `silkc` are reserved. |
| `version` | no | string | Full semantic version, such as `"0.1.0"`. Default `"0.0.0"`. `"0.1"` is refused. |
| `source` | no | string | The source root: the directory module paths are relative to, relative to the manifest. Default `"src"`. Keep it inside the package: the compiler does not check that it does. |
| `main` | no | string | The root module file, relative to `source`. Default `"main.silk"`, or `"lib.silk"` for a library `kind`. A program's root module declares `main`. |
| `kind` | no | string | What a build makes: `"executable"` (the default), `"library"`, `"static-library"`, `"shared-library"` or `"object"`. See **Build outputs and native linking**. |
| `silk-version` | no | string | The Silk version the package runs with. `silk init` writes the running compiler's version. The `silk` tool hands every command in the package to that version's compiler; `"0.0.0"` pins nothing. A workspace's own `silk-version` wins. Set it with `silk set`; see "Silk versions" in the Command-line reference. |
| `exports` | no | array of strings | Modules other packages may import, in import spelling (`"Board"`, `"codec.Json"`). Each must exist. |
| `include` | no | array of strings | Files and directories outside the source root that `silk pack` puts in the source archive, relative to the package directory, such as `["assets"]`. See **Packaging releases**. |
| `publish` | no | boolean | `false` keeps the package out of `silk pack`: a workspace pack skips it and packing it by name is refused. Default `true`. |
| `description`, `license`, `repository`, `homepage`, `readme` | no | string | Publishing metadata. Builds never read it. In a template, `silk init --list` shows the `description`; see Project templates. |
| `authors`, `keywords` | no | array of strings | Publishing metadata. Builds never read it. |

A `library` is Silk source for other packages to import: `silk build` checks it and makes no file. The other library kinds make an archive or a shared library.

The package identity is `name@version`, such as `hello@0.1.0`. Diagnostics, `[config]` values and symbol maps use it.

## &#91;build\]

| Key | Value | Default | Meaning |
| --- | --- | --- | --- |
| `stage` | `"final"`, `"llvm-ir"`, `"llvm-bitcode"`, `"assembly"`, `"object"`, `"wasm-text"` | `"final"` | Stop after this stage. `"wasm-text"` writes a WebAssembly target's module in the text format, as `<name>.wat`. |
| `output-dir` | string | `"build"` | Output directory, relative to the manifest. Must not leave the package. Refused in a workspace member, which uses `workspace.output-dir`. |
| `targets` | array of strings | `["host"]` | Targets that `build` and `check` cover when no `--target` is given. Each is `"host"` or a target name. |
| `profile` | string | none | Default named profile, used when no `--target`, `--profile` or `--profile-input` is given. Must name a `[profiles.<name>]` table. |
| `tools` | array of strings | `[]` | Dependencies, by name, whose `build.silk` tool steps may run. Read from the root manifest only. See Build plans and generated code. |
| `unsandboxed-tools` | boolean | `false` | Run tool steps on a host with no sandbox, with a warning each build. Read from the root manifest only. |

## &#91;config\]

Values for the package's parameters, the `pub param` declarations in its root module. A key is the root module's path without `.silk`, then the parameter's name, and the value is plain TOML that Silk checks against the parameter's declared type:

```toml
[config]
main.port = 8080
main.weights = [3, 4]
```

An integer, a boolean, a string or an array of them is a value. Every build receives these values, and a profile's own `config` wins over them. See **Package parameters** in the reference.

## &#91;native\]

| Key | Value | Default | Meaning |
| --- | --- | --- | --- |
| `link` | array of tables | none | Extra objects, archives and libraries for the native link. |
| `platform-supply` | table | automatic | An explicit SDK or sysroot for the native link. |
| `function-order` | string | none | A text file of symbol names, one per line, that a Linux or macOS executable places first, in that order. A relative path below the manifest's directory. |
| `sources` | array of tables | none | C, Objective-C and C++ files the build compiles with Clang, each `{ c = ... }`, `{ objc = ... }`, `{ cpp = ... }` or `{ objcpp = ... }` with optional `include`, `flags` and `os`. |
| `archive.<name>` | table | none | A prebuilt archive pinned by `url` and `sha256` (optional `strip`, or per target under `targets.<target>`). `<name>:<path>` in `link` and `sources` names a file inside it. |
| `override.<name>` | table | none | `path = "<directory>"` replaces archive `<name>` with a local directory. Read from the root manifest only. |

Every `link` and `sources` entry takes an optional `os`: `"macos"`, `"linux"`, `"windows"`, `"wasi"` or a list of them. Build outputs and native linking covers all of these keys.

## &#91;&#91;generate\]\]

Generators that `silk generate` runs. Builds never run them; their outputs are committed.

| Key | Value | Meaning |
| --- | --- | --- |
| `run` | array of strings | The program, then its arguments. A program with a `/` is a path below the manifest's directory; a bare name is searched on `PATH`. |
| `outputs` | array of strings | The files it writes, below the manifest's directory. A `*` in the last segment matches any run of bytes. |

A workspace manifest can declare generators too. See Build plans and generated code.

## &#91;&#91;post-init\]\]

Commands a template runs once, when `silk init --template` creates a project from it. `silk init` removes them from the new manifest, and builds never run them.

| Key | Value | Meaning |
| --- | --- | --- |
| `run` | array of strings | The program, then its arguments. A program with a `/` is a path below the manifest's directory; a bare name is searched on `PATH`. |

Each command also gets the creating compiler's release and the arguments given to `silk init` after `--`. See Project templates, and Hooks and scripts for every hook a package can have.

## &#91;component\]

Only a `wasm32-wasip2` executable reads it. Without the table, the component uses the WASI command world the std lib carries.

| Key | Value | Meaning |
| --- | --- | --- |
| `wit` | string | A WIT file or directory below the package directory. |
| `world` | string | The WIT world the component implements. Required with `wit`. |

## &#91;unstable\]

Settings that may still change shape before they settle.

| Key | Value | Default | Meaning |
| --- | --- | --- | --- |
| `composition` | table | std lib catalog | Runtime composition: which runtime module starts the program. Advanced. |

`composition` takes `runtimes`, `defaults`, `components`, `retention` and `requirements`. `requirements`, when it lists anything, is refused. The entries of its lists take only these keys:

| List | Entry keys |
| --- | --- |
| `runtimes` | `name`, `module` |
| `defaults` | none: each entry is a runtime name (a string) |
| `components` | `capability`, `bindings` |
| a component's `bindings` | `operation`, `module`, `declaration` |
| `retention` | `module`, `declaration` |

Build outputs and native linking covers what they do.

## &#91;dependencies\]

One entry per dependency. The key is the name the package imports it by. A path dependency names a directory; a git dependency names a repository and a commit.

```toml
[dependencies]
pricing = { path = "../pricing" }
text_utils = { path = "../text-utils", package = "text-utils" }
vector = { git = "https://example.com/geometry.git", rev = "fb09a5d023a80e50a973adb896a198ab4daab4db", path = "vector" }
greet = { url = "https://example.com/greet-0.1.0.tar.gz", sha256 = "b9b86606bfddde5c73ded12c082aca71c9578b9d09c42f7646202a29051367e2" }
```

| Key | Required | Meaning |
| --- | --- | --- |
| `path` | yes, without `git` or `url` | Path dependency: directory of the dependency's `silk.toml`, relative to this manifest. Git or URL dependency: directory of the package inside the repository or archive, relative to its root. Default: the repository root, or the archive's root or its one top directory. |
| `git` | for a git dependency | The repository: a URL, an scp-style `host:path`, or an absolute path. |
| `rev` | with `git` | The full commit hash, 40 or 64 lowercase hexadecimal digits. |
| `url` | for a URL dependency | Where the package's archive is: an `https://` or `file:///` URL of a `.tar.gz`, `.tar` or ZIP file. |
| `sha256` | with `url` | The archive's SHA-256, 64 lowercase hexadecimal digits. |
| `package` | no | The dependency's `[package].name`. When given, it must match. |

Any other key, such as `version`, `tag` or `branch`, is refused as an unknown key. A git dependency is pinned with `rev`, never with `tag` or `branch`, and a URL dependency with `sha256`. See **Dependencies** for git and archive dependencies, fetching and the naming rules.

## &#91;profiles.\<name>\]

A named profile is a complete build configuration. Select it with `--profile <name>` or `[build].profile`. Two profiles exist without a table: `dev` builds for the host without optimization and with debug information, and `release` builds for the host with `optimization = "speed"` and no debug information. A `[profiles.dev]` or `[profiles.release]` table replaces the built-in one.

| Key | Values | Default |
| --- | --- | --- |
| `target` | a target name (`"host"` is not accepted) | the compiler's host |
| `optimization` | `"none"`, `"speed"`, `"size"` | `"none"` |
| `debug` | `true`, `false` | `true` |
| `libc` | `"gnu"`, `"system"`, `"none"` | per target |
| `artifact` | `"executable"`, `"static-archive"`, `"loadable-module"`, `"object"` | `"executable"` |
| `link` | `"static"`, `"dynamic"` | `"dynamic"` (wasm: `"static"`) |
| `relocation` | `"pic"`, `"static"` | `"static"` for a Linux executable, `"pic"` otherwise (wasm: `"static"`) |
| `code-model` | `"small"`, `"large"` | `"small"` |
| `safety` | `"checked"`, `"unchecked"` | `"checked"` |
| `threading` | `"single"`, `"multi"` | `"single"` |
| `max-memory` | wasm32 only: a size such as `"256MiB"` (bytes, `KiB`, `MiB`, `GiB`) | none (threaded wasm32: 1 GiB) |
| `sanitizers` | array of `"address"`, `"thread"`, `"undefined"` | `[]` |
| `unwind` | `"none"`, `"native"` | `"none"` |
| `deployment` | macOS version such as `"14.0"` | none |
| `cpu` | table: `model`, `features` | target default |
| `entry` | `{ kind = "default" }`, `{ kind = "none" }`, `{ kind = "named", name = "..." }` | default |
| `runtime` | same shape as `entry` | default |
| `stack-size` | wasm32 only: the main thread's stack, a size such as `"8MiB"` | 1 MiB |
| `backend` | `"llvm"`, `"direct"` (WebAssembly without Clang) | `"llvm"` |
| `codegen-units` | an integer from 1 to 256: how many units an optimized native executable splits into | 1 |
| `config` | parameter values, as in `[config]`: `config.main.port = 9090` | none |

Profile names start with an ASCII letter, then letters, digits, `_` or `-`. Targets and profiles explains what each field does today and which combinations are refused.

## &#91;workspace\]

| Key | Required | Meaning |
| --- | --- | --- |
| `members` | yes | Array of member directories inside the workspace. An entry ending in `/*` adds every child directory. |
| `output-dir` | no | Shared output directory for all members. Default `"build"`. |
| `silk-version` | no | The Silk version every member runs with. It wins over a member's own `silk-version`; `silk set` sets it. |

A manifest may hold both `[package]` and `[workspace]`. See **Workspaces**.

## &#91;release\]

Read only by `silk change`, the release notes command. Its keys (`repository`, `directory`, `version-file`) are described with that command in the Tools section. Builds ignore the table, but its keys are checked like any other.

## &#91;tool.\<name>\]

Settings that belong to other tools, such as an editor. The compiler never reads or checks them.

## Errors

The compiler checks the whole manifest before it compiles anything, and stops at the first problem. Manifest errors exit with status 2.

```
Invalid Silk project manifest /home/you/hello/silk.toml:8: build.artefact is not a supported field
```

Most errors name the line after the path, here line 8 of `silk.toml`. A key inside an inline table or array that spans several lines is named at its own line, not at the line that opens the value. The language server reports the same errors in an open `silk.toml`, all of them at once, as you type.

### Shape errors

First the manifest is checked against the manifest schema, `compiler/manifest.schema.toml` in the Silk repository. The schema checks the package's own manifest, its workspace's manifest and the manifest of every dependency. An error names the field by its dotted path, with `[0]` for the first entry of an array, and says what is wrong:

| Problem | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- |
| An unknown key or table | `package.nmae is not a supported field; did you mean package.name?` |
| A missing key | `package needs name`, `component needs world` |
| A value of the wrong type | `build.targets must be an array; it is "host"` |
| A value outside a fixed list | `package.kind must be "executable", "library", "static-library", "shared-library" or "object"; it is "lib"` |
| A value of the wrong form | `package.version must be a full semantic version, such as 0.1.0; it is "0.1"` |
| A number out of range | `profiles.fast.codegen-units must be at least 1; it is 0` |
| A table that matches none of its forms | `dependencies.vector must be a dependency: { path = ... }, { git = ..., rev = ... } or { url = ..., sha256 = ... }, with an optional package` |
| A bad table name | `a name in profiles must be a profile name: an ASCII letter, then letters, digits, _ or -` |
| No `[package]` and no `[workspace]` | `manifest must be a package or workspace manifest, with a [package] or [workspace] table` |

The suggestion after an unknown key names the key of the same table that is closest, within a third of its length in single-letter edits. `build.artefact` above gets none, since `[build]` has no key that close. An unknown key is reported before any other problem in the manifest, and a value of the wrong type or form before a table that matches none of its forms.

Every key the schema does not list is an unknown key, whether an earlier release had it or a later one adds it. There are no aliases: `[package].root`, `[build].artifact`, `[changes]`, a profile's `codeModel` and `[dev-dependencies]` are all refused as unknown keys. The suggestion points at the current spelling when it is close, as `profiles.fast.codeModel is not a supported field; did you mean profiles.fast.code-model?`.

When the manifest's `silk-version` names a Silk that the running compiler cannot stand in for, every shape error says so, since that Silk may take the key:

```
Invalid Silk project manifest /home/you/hello/silk.toml:6: tasks is not a supported field; the manifest pins Silk 0.2.0 with silk-version, and this is Silk 0.1.0: build it with Silk 0.2.0 (silk use installs it)
```

The `silk` tool runs the pinned Silk on its own, so this happens only when `SILK_TOOLCHAIN`, `silk +<version>` or a direct `silkc` picks another one. A dependency written for another Silk is refused for its `silk-version` before its shape is checked; see **Dependencies**.

### Other errors

Then the compiler checks what the schema cannot, such as paths on disk and combinations of keys:

| Problem | Message after `Invalid Silk project manifest <path>:` |
| --- | --- |
| Not TOML | `LINE: the manifest is not valid TOML: ` and what is wrong, such as `the file ends before a string, array, inline table or table header is closed` |
| Only `[workspace]`, for a command that needs a package | `this manifest only defines a workspace; run the command in one of its member directories` |
| `main` outside the source root | `LINE: package.main must name a module below the source root` |
| Output dir escapes | `LINE: build.output-dir must be a non-empty manifest-relative directory that does not escape the project` |
| `output-dir` in a member | `build.output-dir cannot be set in a workspace member; set workspace.output-dir instead` |
| `[component]` without a usable `wit` | `component.wit must name a WIT file or directory below the package directory` |
| A `defaults` runtime that `runtimes` does not list | `LINE: unstable.composition.defaults entry "main" names no runtime in unstable.composition.runtimes; it lists "start"` |
| Any other bad `platform-supply` | `LINE: InvalidConfiguration: platform-supply (<path>:native.platform-supply)` |

Problems in `[dependencies]` beyond their shape, and in `exports`, are manifest errors too, as in `` LINE: dependency `foo` of app@0.1.0: no readable silk.toml at /home/you/nothere `` and `LINE: exports of app@0.1.0: nope is not a module of the package`. A shape error in a dependency's own manifest names that manifest and the dependency, as in `` Invalid Silk project manifest /home/you/text-utils/silk.toml:4: dependency `text_utils` of app@0.1.0: its silk.toml is invalid: package.nmae is not a supported field; did you mean package.name? ``. A bad `[native].link` entry or `function-order` path prints as `silk: invalid native link input: ...` (exit 1); see Build outputs and native linking. See **Dependencies** and **Libraries and exports**.

Profile problems that pass the schema name the profile and the key, with the refused value after it:

```
Invalid Silk project manifest /home/you/hello/silk.toml:9: UnsupportedCombination: profiles.fast.libc = "system"
```

| Problem | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- |
| A value the target cannot use | `UnsupportedCombination: profiles.fast.libc = "system"` |
| A value the native compiler cannot build yet | `profiles.fast.safety = "unchecked" is not supported by the native compiler yet` |
| `[build].profile` names no profile | `InvalidInput: build.profile = "fats" names no [profiles.fats] table` |

LINE is the line of the key, or of the table header when the problem is the table itself. A `[config]` value of the wrong type, or one for a parameter the module does not declare, is refused with SEM0214 at the line of its key; see **Package parameters** in the reference. The compiler finds a key by its whole path, so a key named like one on an earlier line, such as a profile's `runtime = { kind = "default", name = "x" }` below `[package] name`, is reported at its own line. Targets and profiles lists every refused combination.

## Keys that are not checked

Unknown keys are refused everywhere in the manifest, in every table and in the entries of every array, except one table: `[tool.<name>]`, which belongs to other tools. The compiler never reads or checks it, so put settings for an editor or another tool there.

## See also

Dependencies, Libraries and exports, Workspaces, Targets and profiles, Build outputs and native linking, Build plans and generated code; **Package parameters** in the reference; chapters 11 and 12 of the book.
