# Workspaces

A workspace is a folder whose `silk.toml` lists member packages. From its root, one command checks, builds, tests, formats or documents every member, and all members share one output directory.

## Creating one

```sh
silk init --workspace shop
cd shop
silk init --lib pricing
silk init store
```

```
Initialized Silk workspace at /home/you/shop
Initialized Silk project pricing at /home/you/shop/pricing
Added pricing to the workspace members in /home/you/shop/silk.toml
Initialized Silk project store at /home/you/shop/store
Added store to the workspace members in /home/you/shop/silk.toml
```

`silk init --workspace` writes a `.gitignore` for `/build/` and this manifest. Each `silk init` inside the workspace appends the new package to `members`, and gives it no `.gitignore` of its own:

```toml
[workspace]
members = ["pricing", "store"]
```

To bring in a package that already exists, move it into the folder and add it to `members` by hand.

## &#91;workspace\]

| Key | Meaning |
| --- | --- |
| `members` | Required. Member directories, relative to the workspace manifest. `"apps/*"` adds every child directory of `apps`. |
| `output-dir` | Shared output directory. Default `"build"`. |

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
| Unknown key | `workspace.<key> is not a supported field` |

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

## Running commands from the root

At a workspace root with no `[package]`, `build`, `check`, `test`, `format` and `doc` cover every member. Members run in dependency order: a member comes after the members it depends on, and otherwise keeps its place in `members`.

```sh
silk build
```

```
Package pricing (/home/you/shop/pricing)
Compiled src/lib.silk -> ../build/llvm/x86_64-unknown-linux-gnu/debug/libpricing.a (llvm, x86_64-unknown-linux-gnu, 0 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/shop/build/llvm/x86_64-unknown-linux-gnu/debug/libpricing.a
Build summary: 1 succeeded, 0 failed
Package store (/home/you/shop/store)
Compiled src/main.silk -> ../build/llvm/x86_64-unknown-linux-gnu/debug/store (llvm, x86_64-unknown-linux-gnu, 183 symbols)
build llvm/x86_64-unknown-linux-gnu: ok /home/you/shop/build/llvm/x86_64-unknown-linux-gnu/debug/store
Build summary: 1 succeeded, 0 failed
Workspace summary: 2 packages succeeded, 0 failed
```

- Each member gets a `Package <name> (<dir>)` heading and its usual report. The last line counts packages.
- A failing member does not stop the others. The command exits 1 if any member failed: `Workspace summary: 3 packages succeeded, 1 failed`.
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
Package store (/home/you/shop/store)
check x86_64-unknown-linux-gnu: ok
Check summary: 1 succeeded, 0 failed
Workspace summary: 1 package succeeded, 0 failed
```

A name that is not a member is refused with the list of members (exit 2):

```
silk: the workspace at /home/you/shop/silk.toml has no package named `nope`
silk: its members are: pricing, store
```

## silk run at the root

`silk run` runs one program. At the root it picks the only member that builds an executable, so libraries do not count:

```sh
silk run
```

```
Compiled src/main.silk -> ../build/llvm/x86_64-unknown-linux-gnu/debug/store (llvm, x86_64-unknown-linux-gnu, 183 symbols)
```

With two programs, name one:

```
silk: `run` runs one package; pass --package <name> to choose a workspace member
```

```sh
silk run -p tools
```

`-p` naming a library is refused: `Cannot run static-library artifact`. The program runs in the current directory, not in the member's folder.

## The shared output directory

All members build into the workspace's output directory, so paths in reports start with `../build` when seen from a member. After `silk build` and `silk test` at the root, `build/` holds, among symbol maps:

```
build/llvm/x86_64-unknown-linux-gnu/debug/libpricing.a
build/llvm/x86_64-unknown-linux-gnu/debug/store
build/test/llvm/x86_64-unknown-linux-gnu/debug/pricing
build/test/llvm/x86_64-unknown-linux-gnu/debug/store
```

This holds when you build from inside a member folder too. A member's own `[build].output-dir` is refused:

```
Invalid Silk project manifest /home/you/shop/pricing/silk.toml: build.output-dir cannot be set in a workspace member; set workspace.output-dir instead
```

Because members share a directory, their package names must differ. See **Build outputs and native linking** for the layout.

## See also

The manifest, Dependencies, Build outputs and native linking; the command-line reference in the Tools section; chapter 12 of the book.
