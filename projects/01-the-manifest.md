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
| `silk-version` | no | string | Semantic version of the compiler that created the package. Recorded only; no build compares it. |
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

`composition.requirements`, when it lists anything, is refused too. Build outputs and native linking covers the last four keys.

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
Invalid Silk project manifest /home/you/hello/silk.toml: build.artefact is not a supported field
```

| Problem | Message after `Invalid Silk project manifest <path>:` |
| --- | --- |
| Not TOML | `the manifest is not valid TOML` |
| No `[package]` and no `[workspace]` | `missing [package] table` |
| Bad name | `package.name must start with a lowercase letter and contain only lowercase letters, digits, or hyphens` |
| Bad or missing version | `package.version must be a valid semantic version` |
| Missing root | `package.root must be a non-empty string` |
| Root outside source root | `package.root must be a module below the source root` |
| Unknown `[build]` key | `build.<key> is not a supported field` |
| Bad artifact | `build.artifact must be executable, shared-library, static-library, or object` |
| Bad stage | `build.stage is not an admitted emission stage` |
| Output dir escapes | `build.output-dir must be a non-empty manifest-relative directory that does not escape the project` |
| Bad target list | `build.targets must be a non-empty array of host or canonical target ids` |
| Unknown `[workspace]` key | `workspace.<key> is not a supported field` |
| `output-dir` in a member | `build.output-dir cannot be set in a workspace member; set workspace.output-dir instead` |

Problems in `[dependencies]` and `exports` print as `silk: invalid dependency ...` and `silk: invalid exports of ...` (exit 1). See **Dependencies** and **Libraries and exports**.

Profile problems print only a class and a subject, with no file name, and exit 2:

```
InvalidInput: profile fields
```

That line means a `[profiles.<name>]` table has a key not in the table above. `InvalidInput: <field>` means a bad value; `UnsupportedCombination: <field>` means a value the target cannot use, such as `libc = "system"` on Linux.

## Keys that are not checked

Unknown keys are refused in `[build]`, `[workspace]`, profiles and bindings. They are accepted silently in `[package]`, in dependency entries and at the top level. A misspelled `[packge]` table or a `description` key changes nothing and reports nothing.

## See also

Dependencies, Libraries and exports, Workspaces, Targets and profiles, Build outputs and native linking; **Package parameters** in the reference; chapters 11 and 12 of the book.
