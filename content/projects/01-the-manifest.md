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
| `description`, `license`, `repository`, `homepage`, `readme` | no | string | Publishing metadata. Builds never read it. |
| `authors`, `keywords` | no | array of strings | Publishing metadata. Builds never read it. |

A `library` is Silk source for other packages to import: `silk build` checks it and makes no file. The other library kinds make an archive or a shared library. `package.include` is reserved and refused as not supported yet.

The package identity is `name@version`, such as `hello@0.1.0`. Diagnostics, `[config]` values and symbol maps use it.

## &#91;build\]

| Key | Value | Default | Meaning |
| --- | --- | --- | --- |
| `stage` | `"final"`, `"llvm-ir"`, `"llvm-bitcode"`, `"assembly"`, `"object"` | `"final"` | Stop after this stage. |
| `output-dir` | string | `"build"` | Output directory, relative to the manifest. Must not leave the package. Refused in a workspace member, which uses `workspace.output-dir`. |
| `targets` | array of strings | `["host"]` | Targets that `build` and `check` cover when no `--target` is given. Each is `"host"` or a target name. |
| `profile` | string | none | Default named profile, used when no `--target`, `--profile` or `--profile-input` is given. Must name a `[profiles.<name>]` table. |

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

One entry per dependency. The key is the name the package imports it by.

```toml
[dependencies]
pricing = { path = "../pricing" }
text_utils = { path = "../text-utils", package = "text-utils" }
```

| Key | Required | Meaning |
| --- | --- | --- |
| `path` | yes | Directory of the dependency's `silk.toml`, relative to this manifest. |
| `package` | no | The dependency's `[package].name`. When given, it must match. |

Only path dependencies exist. The other sources and their settings (`git`, `url`, `version`, `tag`, `rev`, `branch`, `hash`, `optional`, `workspace`) are refused as not supported yet. See **Dependencies** for the naming rules.

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
| `config` | parameter values, as in `[config]`: `config.main.port = 9090` | none |

Profile names start with an ASCII letter, then letters, digits, `_` or `-`. Targets and profiles explains what each field does today and which combinations are refused.

## &#91;workspace\]

| Key | Required | Meaning |
| --- | --- | --- |
| `members` | yes | Array of member directories inside the workspace. An entry ending in `/*` adds every child directory. |
| `output-dir` | no | Shared output directory for all members. Default `"build"`. |

A manifest may hold both `[package]` and `[workspace]`. See **Workspaces**.

## &#91;release\]

Read only by `silk change`, the release notes command. Its keys (`repository`, `directory`, `version-file`) are described with that command in the Tools section. Builds ignore the table. It was called `[changes]` before; a manifest that still uses that name is refused.

## &#91;tool.\<name>\]

Settings that belong to other tools, such as an editor. The compiler never reads or checks them.

## Reserved tables

`[dev-dependencies]`, `[target]`, `[lints]`, `[test]`, `[bench]` and `[bin]` are names a later release will read. Today they are refused with `LINE: <table> is not supported yet`, so no manifest relies on them being ignored.

## Earlier spellings

Before 0.1.0 some keys had other names. A manifest that still writes one is refused at its line, with the name to use:

| Earlier spelling | Now |
| --- | --- |
| `[package].root` | `[package].source` for the source root and `[package].main` for the root module below it |
| `[package].source-root` | `[package].source` |
| `[build].artifact` | `[package].kind` |
| `[build].native-link-inputs` | `[native].link` |
| `[build].platform-supply` | `[native].platform-supply` |
| `[build].composition` | `[unstable].composition` |
| `codeModel`, `maxMemory` in a profile | `code-model`, `max-memory` |
| `[[build.bindings]]` tables with tagged values | `[config]`, as `main.port = 8080` |
| `[[profiles.<name>.bindings]]` | `config` in the profile, as `config.main.port = 8080` |

```
Invalid Silk project manifest /home/you/hello/silk.toml:4: build.artifact is an earlier spelling; write package.kind
```

`root = "src/main.silk"` becomes nothing at all, since that is the default. `root = "main.silk"` next to the manifest becomes `source = "."`.

## Errors

The compiler checks the whole manifest before it compiles anything, and stops at the first problem. Manifest errors exit with status 2.

```
Invalid Silk project manifest /home/you/hello/silk.toml:8: build.artefact is not a supported field
```

Most errors name the line after the path, here line 8 of `silk.toml`. A few, such as a missing `[package]` table, name only the file.

When an unknown key is close to a key the table takes, within a third of its length in single-letter edits, the message names that key:

```
Invalid Silk project manifest /home/you/hello/silk.toml:2: package.nmae is not a supported field; did you mean package.name?
```

`build.artefact` above gets no suggestion, because the close key `build.artifact` is an earlier spelling, not a supported key. Keys inside profiles get no suggestion either. A key inside an inline table or array that spans several lines is named at its own line, not at the line that opens the value.

| Problem | Message after `Invalid Silk project manifest <path>:` |
| --- | --- |
| Not TOML | `LINE: the manifest is not valid TOML: ` and what is wrong, such as `the file ends before a string, array, inline table or table header is closed` |
| No `[package]` and no `[workspace]` | `missing [package] table` |
| Only `[workspace]`, for a command that needs a package | `this manifest only defines a workspace; run the command in one of its member directories` |
| An earlier spelling, such as `[build].artifact` | `LINE: build.artifact is an earlier spelling; write package.kind` |
| A reserved table, such as `[dev-dependencies]` | `LINE: dev-dependencies is not supported yet` |
| A reserved key, such as `package.include` or a `git` dependency | `LINE: package.include is not supported yet` |
| Unknown top-level key or table, such as `[packge]` | `LINE: packge is not a supported field; did you mean package?` |
| Unknown `[package]` key | `LINE: package.<key> is not a supported field`, plus `; did you mean package.<close key>?` when there is one, as for every unknown key below |
| Unknown key in a dependency entry | `LINE: dependencies.<name>.<key> is not a supported field` |
| Bad name | `LINE: package.name "Hello" is not a package name: it must start with a lowercase letter and contain only lowercase letters, digits, underscores, or hyphens, and must not be self, silk or silkc` |
| Bad version | `LINE: package.version "0.1" is not a semantic version; write MAJOR.MINOR.PATCH, as 0.1.0` |
| Bad `silk-version` | `LINE: package.silk-version "x" is not a semantic version; write MAJOR.MINOR.PATCH, as 1.0.0` |
| Empty or non-string `source` or `main` | `LINE: package.main must be a non-empty string` (or `package.source`) |
| `main` outside the source root | `LINE: package.main must name a module below the source root` |
| Metadata of the wrong type | `LINE: package.description must be a string`, `LINE: package.authors must be an array of strings` |
| Bad kind | `LINE: package.kind "app" is not a package kind; write executable, library, static-library, shared-library, or object` |
| Unknown `[build]` key | `LINE: build.<key> is not a supported field` |
| Unknown `[native]` or `[unstable]` key | `LINE: native.<key> is not a supported field` (or `unstable.<key>`) |
| `[component]` without a usable `wit` or `world` | `component.wit must name a WIT file or directory below the package directory`, `component.world must name the WIT world to build` |
| Unknown `[unstable].composition` key | `LINE: unstable.composition.<key> is not a supported field` |
| Unknown key in a `runtimes`, `components` or `retention` entry | `LINE: unstable.composition.runtimes.<key> is not a supported field` (or `components`, `retention`) |
| Unknown key in a component's `bindings` entry | `LINE: unstable.composition.components.bindings.<key> is not a supported field` |
| A `defaults` entry that is not a string | `LINE: unstable.composition.defaults entries must be runtime names` |
| `composition.requirements` lists anything | `LINE: unstable.composition.requirements is not supported by the native compiler yet` |
| A component binding `operation` other than `create`, `acquire`, `release` or `destroy` | `LINE: unstable.composition.components.bindings.operation = "frobnicate" is not an operation; use create, acquire, release or destroy` |
| A component binding with no `operation` | `LINE: unstable.composition.components.bindings entry has no operation; use create, acquire, release or destroy` |
| A component binding `operation` that is not a string, such as `operation = 3` | `LINE: unstable.composition.components.bindings.operation must be a string: create, acquire, release or destroy` |
| A component `capability` other than `"execution-storage"` | `LINE: unstable.composition.components.capability = "other" is not supported by the native compiler; the only capability is "execution-storage"` |
| Unknown key in `platform-supply` or in one of its `support` entries | `LINE: native.platform-supply.<key> is not a supported field` (or `native.platform-supply.support.<key>`) |
| Any other bad `platform-supply` | `LINE: InvalidConfiguration: platform-supply (<path>:native.platform-supply)` |
| Bad stage | `LINE: build.stage is not an admitted emission stage` |
| Output dir escapes | `LINE: build.output-dir must be a non-empty manifest-relative directory that does not escape the project` |
| Bad target list | `LINE: build.targets must be a non-empty array of host or canonical target ids` |
| Unknown `[workspace]` key | `LINE: workspace.<key> is not a supported field` |
| `output-dir` in a member | `build.output-dir cannot be set in a workspace member; set workspace.output-dir instead` |

Problems in `[dependencies]` other than an unknown key, and in `exports`, are manifest errors too, as in `` LINE: dependency `foo` of app@0.1.0: no readable silk.toml at /home/you/nothere `` and `LINE: exports of app@0.1.0: nope is not a module of the package`. A bad `[native].link` entry or `function-order` path prints as `silk: invalid native link input: ...` (exit 1); see Build outputs and native linking. See **Dependencies** and **Libraries and exports**.

Profile problems name the profile and the key. A bad value is quoted after the key:

```
Invalid Silk project manifest /home/you/hello/silk.toml:9: InvalidInput: profiles.fast.optimization = "fast"
```

| Problem | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- |
| A key profiles do not have | `profiles.fast.optimisation is not a supported field; did you mean optimization?`. The suggestion names the key alone, and only when one is close |
| `codeModel` or `maxMemory` | `InvalidInput: profiles.fast.codeModel is an earlier spelling; write code-model` |
| A key `cpu` does not have | `profiles.fast.cpu.modle is not a supported field` |
| A key `entry` or `runtime` does not have | `profiles.fast.entry.bogus is not a supported field`. `kind = "default"` and `"none"` take only `kind`; `"named"` takes `kind` and `name`. |
| A value the field does not take | `InvalidInput: profiles.fast.optimization = "fast"` |
| A value the target cannot use | `UnsupportedCombination: profiles.fast.libc = "system"` |
| A value the native compiler cannot build yet | `profiles.fast.safety = "unchecked" is not supported by the native compiler yet` |
| `[build].profile` names no profile | `InvalidInput: build.profile = "fats" names no [profiles.fats] table` |
| `[build].profile = ""` | `InvalidInput: build.profile` |
| A profile's `bindings` | `InvalidInput: profiles.fast.bindings is an earlier spelling; write config` |
| A `[config]` key with no module, such as `port = 1` | `InvalidInput: config.port: name the module before the parameter, as config.main.port` |
| A `[config]` value that is a float, date or time | `InvalidInput: config.main.ratio: a package parameter value is an integer, a boolean, a string or an array of them` |
| A bad profile name, quoted or not | ``InvalidInput: profiles.1fast: a profile name is an ASCII letter, then letters, digits, `_` or `-` `` |

LINE is the line of the key, or of the table header when the problem is the table itself, as for a bad profile name. A `[config]` value of the wrong type, or one for a parameter the module does not declare, is refused with SEM0214 at the line of its key; see **Package parameters** in the reference. The compiler finds a key by its whole path, so a key named like one on an earlier line, such as a profile's `runtime = { kind = "default", name = "x" }` below `[package] name`, is reported at its own line. The message names the key without array indexes. Targets and profiles lists every refused combination.

## Keys that are not checked

Unknown keys are refused everywhere the compiler reads: the top level, `[package]`, dependency entries, `[build]`, `[native]`, `platform-supply` and its `support` entries, `[component]`, `[unstable]`, `composition` and the entries of its lists, `[workspace]`, profiles with their `cpu`, `entry` and `runtime` tables, and bindings with their `value` and `origin` tables. A misspelled `[packge]` table or a `descripton` key stops the build, with `did you mean package?` or `did you mean package.description?`.

Two tables are not checked: `[release]`, which builds ignore and `silk change` reads, and `[tool.<name>]`, which belongs to other tools.

## See also

Dependencies, Libraries and exports, Workspaces, Targets and profiles, Build outputs and native linking; **Package parameters** in the reference; chapters 11 and 12 of the book.
