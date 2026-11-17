# The manifest

`silk.toml` identifies a package, declares its dependencies and records publishing metadata. Compilations, native linking, parameters and generated code belong to the build graph.

## Finding the manifest

Project commands find the nearest `silk.toml` at or above the working directory. `--manifest-path <file>` selects one explicitly. Paths in a manifest are relative to its directory. A manifest containing only `[workspace]` is a workspace root.

```toml
[package]
name = "hello"
version = "0.1.0"
```

The default executable root is `src/main.silk`. A library uses `kind = "library"` and defaults to `src/lib.silk`.

## &#91;package\]

| Key | Required | Value | Meaning |
| --- | --- | --- | --- |
| `name` | yes | string | Package name. Starts with a lowercase ASCII letter; then lowercase letters, digits or `_` (`-` is still accepted). `self`, `silk` and `silkc` are reserved. |
| `version` | no | string | Full semantic version, such as `"0.1.0"`. Default `"0.0.0"`. `"0.1"` is refused. |
| `source` | no | string | The source root: the directory module paths are relative to, relative to the manifest. Default `"src"`. Keep it inside the package. |
| `main` | no | string | The root module file, relative to `source`. Default `"main.silk"`, or `"lib.silk"` for a library `kind`. A program's root module declares `main`. |
| `kind` | no | string | The source package kind: `"executable"` (the default) or `"library"`. A graph chooses the compiled artifact kind. |
| `silk-version` | no | string | The Silk version the package runs with. `silk init` writes the running compiler's version. The `silk` tool hands every command in the package to that version's compiler; `"0.0.0"` pins nothing. A workspace's own `silk-version` wins. Set it with `silk set`; see "Silk versions" in the Command-line reference. |
| `exports` | no | array of strings | Modules other packages may import, in import spelling (`"Board"`, `"codec.Json"`). Each must exist. |
| `include` | no | array of strings | Files and directories outside the source root that `silk pack` puts in the source archive, relative to the package directory, such as `["assets"]`. See **Packaging releases**. |
| `publish` | no | boolean | `false` keeps the package out of `silk pack`: a workspace pack skips it and packing it by name is refused. Default `true`. |
| `description`, `license`, `repository`, `homepage`, `readme` | no | string | Publishing metadata. Builds never read it. In a template, `silk init --list` shows the `description`; see Project templates. |
| `authors`, `keywords` | no | array of strings | Publishing metadata. Builds never read it. |

A `library` is Silk source for other packages to import: `silk build` checks it and makes no file. To make an archive, a shared library or an object, a root command builds a `Compilation.staticArchive`, `loadableModule` or `object`; see Build outputs and native linking.

The package identity is `name@version`, such as `hello@0.1.0`. Diagnostics, resolved parameter bindings and symbol maps use it.

## Dependencies

All dependencies live in one `[dependencies]` table. Entries select a local path, a Git commit and package path, or a package archive URL and SHA-256. `workspace = true` inherits a shared workspace entry. `package` names the published package when the import alias differs.

```toml
[dependencies]
renderer = { path = "../renderer", package = "renderer" }
codegen = { path = "../codegen", tools = true }
```

`tools = true` authorizes that dependency's sandboxed plan tools. It does not run the dependency's tasks. A normal compilation fetches dependencies as selected imports reach them. `silk fetch` fetches all declared dependencies for offline work without evaluating package code.

## Workspace

`[workspace]` declares `members`, an optional shared `output-dir`, `silk-version`, and shared dependencies. Artifact paths are `<output-dir>/<target>/<mode>/<name>`. The default output directory is `build`.

## Native archives

`[native.archive.<name>]` pins downloaded data with `url`, `sha256` and optional `strip`. `[native.override]` supplies local archive replacements. Native sources, libraries, flags and platform SDK selection are expressed by a typed `build.silk` plan or a root `Compilation`.

## &#91;&#91;post-init\]\]

Commands a template runs once, when `silk init --template` creates a project from it. `silk init` removes them from the new manifest, and builds never run them.

| Key | Value | Meaning |
| --- | --- | --- |
| `run` | array of strings | The program, then its arguments. A program with a `/` is a path below the manifest's directory; a bare name is searched on `/usr/local/bin:/usr/bin:/bin`. |
| `arguments` | boolean | When `true`, the command also gets the arguments given to `silk init` after `--`. Default `false`. |

Each command runs in the build tool sandbox, with `SILK_VERSION` set to the creating compiler's release. See Project templates. Work around a build, such as checks before it, is a command in `src/tasks.silk`; see Tasks and build graphs.

## &#91;template\]

What `silk init --template` shows after it creates a project from this template. `silk init` removes the table from the new manifest, and builds only check its shape.

| Key | Value | Meaning |
| --- | --- | --- |
| `next-steps` | array of strings | The commands printed after `cd <project>`, one per line. `[]` prints none. Without it, `silk test` for a library and `silk run` otherwise. |

See Project templates.

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

## &#91;release\]

Read only by `silk change`, the release notes command. Its keys (`repository`, `directory`, `version-file`) are described with that command in the Tools section. Builds ignore the table. It was called `[changes]` before; a manifest that still uses that name is refused.

## &#91;tool.\<name>\]

Settings that belong to other tools, such as an editor. The compiler never reads or checks them.

## Validation

The compiler derives manifest validation and `silk manifest-schema` from one Silk schema. Unknown tables and fields are refused at their source location. A package source root must be inside the package, dependencies must name valid pins, and exported modules must exist.

Use **Tasks and build graphs** for command implementations and **Build plans and generated code** for package requirements. The manifest contains no compilation profiles, hooks, generators or build settings. A manifest written for the old build system stops at the first removed key; **Migrating from manifest builds** shows what replaces each one.
