# Workspaces

A workspace is a folder whose `silk.toml` lists member packages. From its root, one command checks, builds, tests, formats or documents every member, and all members share one output directory.

## Creating one

```sh
silk init --workspace --name store shop
cd shop
silk init --lib pricing
```

```
Initialized Silk workspace at /home/you/shop
Initialized Silk project store at /home/you/shop/store
Run it with `silk run` from the workspace root
Initialized Silk project pricing at /home/you/shop/pricing
Added pricing to the workspace members in /home/you/shop/silk.toml
```

`silk init --workspace` writes a `.gitignore` for `/build/`, the workspace manifest and one starter executable member, so `silk run` works at once. `--name` names that member; without it the member is `app`. Each `silk init` inside the workspace appends the new package to `members`, and gives it no `.gitignore` of its own:

```toml
[workspace]
members = ["store", "pricing"]
```

To bring in a package that already exists, move it into the folder and add it to `members` by hand.

## &#91;workspace\]

| Key | Meaning |
| --- | --- |
| `members` | Required. Member directories, relative to the workspace manifest. `"apps/*"` adds every child directory of `apps`. |
| `output-dir` | Shared output directory. Default `"build"`. |
| `silk-version` | The Silk toolchain for the workspace and every member it lists. Overrides the members' own `silk-version`. Must be a semantic version. |
| `dependencies` | The `[workspace.dependencies]` table: dependencies written once for members to take by name. See **Shared dependencies**. |

- Every member directory must hold a `silk.toml` with a `[package]` name, and no two members may share a name.
- Entries must stay inside the workspace.
- A package is a member only if the workspace lists it. A package in a subfolder that is not listed builds on its own, into its own `build/`.
- A manifest can hold `[package]` and `[workspace]` together. Plain commands then act on the root package; `--workspace` covers the root package and the members.

| Mistake | Message after `Invalid Silk project manifest /home/you/shop/silk.toml:` |
| --- | --- |
| Listed twice | ``workspace.members entry `store` names a member that another entry already lists`` |
| No manifest there | ``workspace.members entry `missing` names a directory without a silk.toml`` |
| Outside the workspace | ``workspace.members entry `../elsewhere` must name a directory inside the workspace`` |
| Same package name | ``workspace.members entry `loose/stray2` names a package whose name another member already has`` |
| Unknown key, such as `ouput-dir` on line 3 | `3: workspace.ouput-dir is not a supported field; did you mean workspace.output-dir?` |
| A `silk-version` that is not a version | `workspace.silk-version must be a valid semantic version` |

## Members still depend explicitly

Being in the same workspace does not let one member import another. Add a path dependency:

```sh
cd store
silk add ../pricing
```

```
Added dependency pricing = { path = "../pricing" } to /home/you/shop/store/silk.toml
```

See **Dependencies**.

## Shared dependencies

When several members use the same dependency, each manifest repeats the same entry, and a new pin means editing all of them. `[workspace.dependencies]` in the workspace manifest writes the entry once:

```toml
[workspace]
members = ["store", "pricing"]

[workspace.dependencies]
vector = { git = "https://example.com/geometry.git", rev = "fb09a5d023a80e50a973adb896a198ab4daab4db", path = "vector" }
pricing = { path = "pricing" }
```

A member takes an entry by name with `workspace = true`:

```toml
[package]
name = "store"
version = "0.1.0"

[dependencies]
vector = { workspace = true }
pricing = { workspace = true }
```

- The entries are written exactly as in `[dependencies]`: path, git or URL dependencies, with the same keys. See **Dependencies**.
- The name is the key in both tables. `vector = { workspace = true }` takes the workspace's `vector`, and the member imports it as `vector`.
- A `path` in `[workspace.dependencies]` is relative to the workspace manifest, not to the member. `pricing = { path = "pricing" }` above names `shop/pricing` for every member, whatever folder the member is in.
- `workspace = true` stands alone. A member cannot add or change a key of the shared entry; a member that needs something else writes its own full entry instead.
- It works in `[dependencies]` and in a profile's `[profiles.<name>.dependencies]`.
- A member only gets the dependencies it lists. An entry no member takes is never read or fetched.
- To change a pin for every member, edit the one line in the workspace manifest.

A package from a git or URL dependency can use `workspace = true` too: its workspace is looked for inside that repository or archive only.

| Mistake | Message after `Invalid Silk project manifest FILE:LINE:` |
| --- | --- |
| The workspace has no such entry | ``dependency `missing` of store@0.1.0: workspace = true takes the entry from [workspace.dependencies] of /home/you/shop/silk.toml, which has no `missing` `` |
| Another key beside `workspace = true` | `dependencies.vector must be a dependency: { path = ... }, { git = ..., rev = ... } or { url = ..., sha256 = ... }, with an optional package, or { workspace = true }` |
| `workspace = false` | `dependencies.vector.workspace must be true; it is false` |
| The package is not a member of any workspace | ``dependency `vector` of tool@0.1.0: workspace = true takes the entry from [workspace.dependencies], but no workspace lists this package as a member`` |
| `workspace = true` inside `[workspace.dependencies]` | `workspace.dependencies.vector must be a dependency written out, as members take it with { workspace = true }; it is { workspace = true }` |

A mistake in the shared entry itself, such as a `rev` that is not a full commit hash, is reported at its line in the workspace manifest.

`silk pack` writes each `workspace = true` entry out in the archive's `silk.toml`, so the archive builds without the workspace. See **Packaging releases**.

## Running commands from the root

At a workspace root with no `[package]`, `build`, `check`, `test`, `format` and `doc` cover every member. Members run in dependency order: a member comes after the members it depends on, and otherwise keeps its place in `members`.

```sh
silk build
```

```
Checking pricing (x86_64-unknown-linux-gnu)
  load      118 modules, 1 in package         0.15s
  check     1 module                          0.03s
  borrow    2 bodies                          0.00s
Finished pricing in 0.19s
Compiling store (x86_64-unknown-linux-gnu, debug)
  load      139 modules, 1 in package         0.05s
  check     2 modules                         0.07s
  codegen   486 functions                     0.09s
  borrow    149 bodies                        0.00s
  link      clang                             0.32s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/store in 0.55s
Finished 2 packages in 0.63s
```

- Each member reports its own phases and ends with its own `Finished` or `Failed` line. `pricing` is a `library`, so it is checked and makes no file. The path in a member's `Finished` line is relative to the folder you ran the command in. Run from inside a member, it is outside that folder, so it is printed in full: `Finished /home/you/shop/build/llvm/x86_64-unknown-linux-gnu/debug/store in 0.48s`.
- The last line counts packages. A failing member does not stop the others; the last line then reads like `Failed 1 of 3 packages in 2.10s`, and the command exits 1.
- On a terminal, each finished member collapses to one line, and the member in progress is labeled with its position, such as `[2/2] store`. See **Diagnostics and silk check** in Tools for how progress output works.
- `silk test` still prints a `Package <name> (<dir>)` heading for each member and ends with `Workspace summary: 2 packages succeeded, 0 failed`.
- `silk format` and `silk format --check` list every member's files.
- `silk doc` writes one file per member: `build/documentation/<member>.json`.
- `silk clean` removes the shared output directory: `Removed /home/you/shop/build`.

## Choosing packages

| Option | Effect |
| --- | --- |
| `-p <name>`, `--package <name>` | Only that member. Repeat to pick several. Works on `build`, `check`, `test` and `run`. |
| `--workspace` | Every member, even when run inside a member directory. |
| neither, in a member directory | Only that member, as for a lone package. |

```sh
silk check -p store
```

```
Checking store (x86_64-unknown-linux-gnu)
  load      139 modules, 1 in package         0.02s
  check     3 modules                         0.07s
  borrow    89 bodies                         0.00s
Finished store in 0.12s
Finished 1 package in 0.14s
```

A name that is not a member is refused with the list of members (exit 2):

```
silk: the workspace at /home/you/shop/silk.toml has no package named `nope`
silk: its members are: pricing, store
```

## silk run at the root

`silk run` runs one program. At the root it picks the only member that builds an executable, so libraries do not count:

```sh
silk run; echo "exit $?"
```

```
exit 0
```

`store` prints nothing; its `main` returns 0 when the discount is right. With two programs, name one:

```
silk: `run` runs one package; pass --package <name> to choose a workspace member
```

```sh
silk run -p tools
```

`-p` naming a library is refused: `Cannot run library artifact` (exit 2). The program runs in the current directory, not in the member's folder.

## The shared output directory

All members build into the workspace's output directory, so from inside a member the program is at `../build/...`. After `silk build` and `silk test` at the root, `build/` holds, besides symbol maps, input records and caches:

```
build/cache/pricing/...
build/cache/store/...
build/llvm/x86_64-unknown-linux-gnu/debug/store
build/test/llvm/x86_64-unknown-linux-gnu/debug/pricing
build/test/llvm/x86_64-unknown-linux-gnu/debug/store
```

`pricing` is a `library`, so `silk build` makes no file for it; its test runner is still built.

This holds when you build from inside a member folder too. A member's own `[build].output-dir` is refused:

```
Invalid Silk project manifest /home/you/shop/pricing/silk.toml: build.output-dir cannot be set in a workspace member; set workspace.output-dir instead
```

Because members share a directory, their package names must differ. See **Build outputs and native linking** for the layout.

## See also

The manifest, Dependencies, Build outputs and native linking; the command-line reference in the Tools section; chapter 12 of the book.
