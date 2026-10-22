# The manifest

Every package has a `silk.toml` at its top. It names the package, says where its source starts, and holds build settings, dependencies, profiles and workspace members. This page lists every key the compiler reads.

## Finding the manifest

- Project commands (`build`, `run`, `check`, `test`, `format`, `doc`, `clean`, `add`, `remove`) look for `silk.toml` in the current directory, then in each parent directory, and use the first one found.
- `--manifest-path <file>` names the manifest instead. It must be the file, not its directory.
- With no manifest anywhere up the tree, the command stops:

```
No silk.toml found from /home/you; create one
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
root = "src/main.silk"
```

`silk init --lib` adds `source-root`, `exports` and a `[build]` table. See **Libraries and exports**.

## &#91;package\]

| Key | Required | Value | Meaning |
| --- | --- | --- | --- |
| `name` | yes | string | Package name. Starts with a lowercase ASCII letter; then lowercase letters, digits or `-`. |
| `version` | yes | string | Full semantic version, such as `"0.1.0"`. `"0.1"` is refused. |
| `root` | yes | string | The root module file, relative to the manifest. A program's root declares `main`. |
| `source-root` | no | string | Directory that module paths are relative to. Default: the directory of `root`. `root` must be inside it. |
| `silk-version` | no | string | The Silk toolchain the package runs with. `silk init` writes the running compiler's version. An installed `silk` hands every command in the package to that toolchain; `"0.0.0"` pins nothing. A workspace's own `silk-version` wins. See `silk toolchain` in the Command-line reference. |
| `exports` | no | array of strings | Modules other packages may import, in import spelling (`"Board"`, `"codec.Json"`). Each must exist. |

The package identity is `name@version`, such as `hello@0.1.0`. Diagnostics, bindings and symbol maps use it.

## &#91;build\]

| Key | Value | Default | Meaning |
| --- | --- | --- | --- |
| `artifact` | `"executable"`, `"static-library"`, `"shared-library"`, `"object"` | `"executable"` | What a final build produces. See **Build outputs and native linking**. |
| `stage` | `"final"`, `"llvm-ir"`, `"llvm-bitcode"`, `"assembly"`, `"object"` | `"final"` | Stop after this stage. |
| `output-dir` | string | `"build"` | Output directory, relative to the manifest. Must not leave the package. Refused in a workspace member, which uses `workspace.output-dir`. |
| `targets` | array of strings | `["host"]` | Targets that `build` and `check` cover when no `--target` is given. Each is `"host"` or a target name. |
| `profile` | string | none | Default named profile, used when no `--target`, `--profile` or `--profile-input` is given. Must name a `[profiles.<name>]` table. |
| `bindings` | array of tables | none | Project-tier package parameter bindings, written `[[build.bindings]]`. See **Package parameters** in the reference. |
| `native-link-inputs` | array of tables | none | Extra objects, archives and libraries for the native link. |
| `platform-supply` | table | automatic | An explicit SDK or sysroot for the native link. |
| `composition` | table | std lib catalog | Runtime composition: which runtime module starts the program. Advanced. |
| `native-bindings` | any | none | Reserved. Refused by this compiler. |

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

See **Dependencies** for the naming rules.

## &#91;profiles.\<name>\]

A named profile is a complete build configuration. Select it with `--profile <name>` or `[build].profile`.

| Key | Values | Default |
| --- | --- | --- |
| `target` | a target name (required; `"host"` is not accepted) | none |
| `optimization` | `"none"`, `"speed"` | `"none"` |
| `debug` | `true`, `false` | `true` |
| `libc` | `"gnu"`, `"system"`, `"none"` | per target |
| `artifact` | `"executable"`, `"static-archive"`, `"loadable-module"`, `"object"` | `"executable"` |
| `link` | `"static"`, `"dynamic"` | `"dynamic"` (wasm: `"static"`) |
| `relocation` | `"pic"`, `"static"` | `"pic"` (wasm: `"static"`) |
| `codeModel` | `"small"`, `"large"` | `"small"` |
| `safety` | `"checked"`, `"unchecked"` | `"checked"` |
| `threading` | `"single"`, `"multi"` | `"single"` |
| `maxMemory` | wasm32 only: a size such as `"256MiB"` (bytes, `KiB`, `MiB`, `GiB`) | none (threaded wasm32: 1 GiB) |
| `sanitizers` | array of `"address"`, `"thread"`, `"undefined"` | `[]` |
| `unwind` | `"none"`, `"native"` | `"none"` |
| `deployment` | macOS version such as `"14.0"` | none |
| `cpu` | table: `model`, `features` | target default |
| `entry` | `{ kind = "default" }`, `{ kind = "none" }`, `{ kind = "named", name = "..." }` | default |
| `runtime` | same shape as `entry` | default |
| `bindings` | `[[profiles.<name>.bindings]]` tables | none |

Profile names start with an ASCII letter, then letters, digits, `_` or `-`. Targets and profiles explains what each field does today and which combinations are refused.

## &#91;workspace\]

| Key | Required | Meaning |
| --- | --- | --- |
| `members` | yes | Array of member directories inside the workspace. An entry ending in `/*` adds every child directory. |
| `output-dir` | no | Shared output directory for all members. Default `"build"`. |

A manifest may hold both `[package]` and `[workspace]`. See **Workspaces**.

## &#91;changes\]

Read only by `silk changes`, the release-notes tool. Its keys (`repository`, `directory`, `version-file`) are described with that command in the Tools section. Builds ignore the table.

## Errors

The compiler checks the whole manifest before it compiles anything, and stops at the first problem. Manifest errors exit with status 2.

```
Invalid Silk project manifest /home/you/hello/silk.toml:8: build.artefact is not a supported field
```

An unknown key, a composition problem, a `platform-supply` problem and a profile problem name the line after the path, here line 8 of `silk.toml`. The other errors name only the file. A key inside an inline table or array that spans several lines is named at its own line, not at the line that opens the value.

| Problem | Message after `Invalid Silk project manifest <path>:` |
| --- | --- |
| Not TOML | `the manifest is not valid TOML` |
| No `[package]` and no `[workspace]` | `missing [package] table` |
| Unknown top-level key or table, such as `[packge]` | `LINE: packge is not a supported field` |
| Unknown `[package]` key | `LINE: package.<key> is not a supported field` |
| Unknown key in a dependency entry | `LINE: dependencies.<name>.<key> is not a supported field` |
| Bad name | `package.name must start with a lowercase letter and contain only lowercase letters, digits, or hyphens` |
| Bad or missing version | `package.version must be a valid semantic version` |
| Missing root | `package.root must be a non-empty string` |
| Root outside source root | `package.root must be a module below the source root` |
| Unknown `[build]` key | `LINE: build.<key> is not a supported field` |
| Unknown `[build.composition]` key | `LINE: build.composition.<key> is not a supported field` |
| Unknown key in a `runtimes`, `components` or `retention` entry | `LINE: build.composition.runtimes.<key> is not a supported field` (or `components`, `retention`) |
| Unknown key in a component's `bindings` entry | `LINE: build.composition.components.bindings.<key> is not a supported field` |
| A `defaults` entry that is not a string | `LINE: build.composition.defaults entries must be runtime names` |
| `composition.requirements` lists anything | `LINE: build.composition.requirements is not supported by the native compiler yet` |
| A component binding `operation` other than `create`, `acquire`, `release` or `destroy` | `LINE: build.composition.components.bindings.operation = "frobnicate" is not an operation; use create, acquire, release or destroy` |
| A component binding with no `operation` | `LINE: build.composition.components.bindings entry has no operation; use create, acquire, release or destroy` |
| A component binding `operation` that is not a string, such as `operation = 3` | `LINE: build.composition.components.bindings.operation must be a string: create, acquire, release or destroy` |
| A component `capability` other than `"execution-storage"` | `LINE: build.composition.components.capability = "other" is not supported by the native compiler; the only capability is "execution-storage"` |
| Unknown key in `platform-supply` or in one of its `support` entries | `LINE: build.platform-supply.<key> is not a supported field` (or `build.platform-supply.support.<key>`) |
| Any other bad `platform-supply` | `LINE: InvalidConfiguration: platform-supply (<path>:build.platform-supply)` |
| Bad artifact | `build.artifact must be executable, shared-library, static-library, or object` |
| Bad stage | `build.stage is not an admitted emission stage` |
| Output dir escapes | `build.output-dir must be a non-empty manifest-relative directory that does not escape the project` |
| Bad target list | `build.targets must be a non-empty array of host or canonical target ids` |
| `native-bindings` | `build.native-bindings is not supported by the native compiler yet` |
| Unknown `[workspace]` key | `LINE: workspace.<key> is not a supported field` |
| `output-dir` in a member | `build.output-dir cannot be set in a workspace member; set workspace.output-dir instead` |

Problems in `[dependencies]` other than an unknown key, and in `exports`, print as `silk: invalid dependency ...` and `silk: invalid exports of ...` (exit 1). See **Dependencies** and **Libraries and exports**.

Profile problems name the profile and the key. A bad value is quoted after the key:

```
Invalid Silk project manifest /home/you/hello/silk.toml:9: InvalidInput: profiles.fast.optimization = "fast"
```

| Problem | Message after `Invalid Silk project manifest <path>:LINE:` |
| --- | --- |
| A key profiles do not have | `profiles.fast.optimisation is not a supported field` |
| A key `cpu` does not have | `profiles.fast.cpu.modle is not a supported field` |
| A key `entry` or `runtime` does not have | `profiles.fast.entry.bogus is not a supported field`. `kind = "default"` and `"none"` take only `kind`; `"named"` takes `kind` and `name`. |
| A value the field does not take | `InvalidInput: profiles.fast.optimization = "fast"` |
| A value the target cannot use | `UnsupportedCombination: profiles.fast.libc = "system"` |
| A value the native compiler cannot build yet | `profiles.fast.safety = "unchecked" is not supported by the native compiler yet` |
| `[build].profile` names no profile | `InvalidInput: build.profile = "fats" names no [profiles.fats] table` |
| `[build].profile = ""` | `InvalidInput: build.profile` |
| A key bindings do not have | `build.bindings.extra is not a supported field`, or `profiles.fast.bindings.extra` for a profile's binding |
| A key a binding's `origin` does not have | `build.bindings.origin.bogus is not a supported field`. `origin` takes `source`, `provenance` and `translator`. |
| A binding with no `origin` | `InvalidInput: build.bindings: origin is missing; write origin = { source = "silk.toml", provenance = "literal" }` |
| An `origin` that is not a table | `InvalidInput: build.bindings: origin must be a table such as { source = "silk.toml", provenance = "literal" }` |
| A missing, empty or non-string `origin.source` | `InvalidInput: build.bindings: origin.source must be a non-empty string` |
| A missing `origin.provenance`, or one that is not a string | `InvalidInput: build.bindings: origin.provenance is missing`, `InvalidInput: build.bindings: origin.provenance must be a string` |
| A `provenance` of `"secret"`, `"physical-supply"` or `"runtime"` | `ForbiddenProvenance: build.bindings: origin.provenance = "secret" cannot be bound in a manifest` |
| `"translated-public"` without a `translator` | `ForbiddenProvenance: build.bindings: origin.provenance = "translated-public" needs origin.translator` |
| Any other `provenance` | `InvalidInput: build.bindings: origin.provenance = "bogus" is not literal, translated-public, secret, physical-supply or runtime` |
| A `translator` that is empty or not a string | `InvalidInput: build.bindings: origin.translator must be a non-empty string` |
| A `translator` on a binding whose `provenance` is not `"translated-public"` | `InvalidInput: build.bindings: origin.translator: only provenance "translated-public" names a translator` |
| A key a binding's `value` does not have | `build.bindings.value.extra is not a supported field`. Inside an array the item number shows: `build.bindings.value.values.1.bogus` is the second element. |
| A binding with no `package`, `module` or `parameter` | `InvalidInput: build.bindings: package is missing; a binding names its package, module and parameter`, or `profiles.fast.bindings: ...` for a profile's binding |
| A `package`, `module` or `parameter` that is not a string | `InvalidInput: build.bindings: module must be a string` |
| A binding with no `value` | `InvalidInput: build.bindings: value is missing` |
| A `value` that is not a table, such as `value = 3` | `InvalidInput: build.bindings: value must be a table with a kind, such as { kind = "integer", value = "1" }` |
| A `value` whose `kind` is not one of the value kinds | `InvalidInput: build.bindings: value.kind must be integer, boolean, string, enum, none, some, array or record` |
| A bad profile name, quoted or not | ``InvalidInput: profiles.1fast: a profile name is an ASCII letter, then letters, digits, `_` or `-` `` |

LINE is the line of the key, or of the table header when the problem is the table itself, as for a bad profile name or a binding with a missing key. A binding's `origin` problems are at the line of its `origin`, or at the field's own line when `origin` is written as a `[build.bindings.origin]` sub-table. A mistyped `package`, `module`, `parameter` or `value` is at its own line. The compiler finds a key by its whole path, so a key named like one on an earlier line, such as a profile's `runtime = { kind = "default", name = "x" }` below `[package] name`, is reported at its own line. The message names the key without array indexes, except for the elements of an array `value`. Targets and profiles lists every refused combination.

## Keys that are not checked

Unknown keys are refused everywhere the compiler reads: the top level, `[package]`, dependency entries, `[build]`, `platform-supply` and its `support` entries, `[build.composition]` and the entries of its lists, `[workspace]`, profiles with their `cpu`, `entry` and `runtime` tables, and bindings with their `value` and `origin` tables. A misspelled `[packge]` table or a `description` key stops the build.

One table is not checked: `[changes]`. Builds ignore it; `silk changes` reads it.

## See also

Dependencies, Libraries and exports, Workspaces, Targets and profiles, Build outputs and native linking; **Package parameters** in the reference; chapters 11 and 12 of the book.
