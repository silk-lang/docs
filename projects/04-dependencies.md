# Dependencies

A package uses another package by listing it in `[dependencies]` with a path to its directory. Then it imports that package's exported modules with the dependency name in front. Dependencies are local paths; there is no registry yet.

## Adding one

From the package that needs the library:

```sh
silk add ../text-utils
```

```
Added dependency text_utils = { path = "../text-utils", package = "text-utils" } to /home/you/app/silk.toml
```

`silk add` reads the dependency's manifest first and writes the entry only if the result is a valid graph. It puts a new `[dependencies]` table right after `[package]`:

```toml
[package]
name = "app"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"

[dependencies]
text_utils = { path = "../text-utils", package = "text-utils" }
```

| Command | Effect |
| --- | --- |
| `silk add <path>` | Adds the package at `<path>` under its own name, with `-` turned into `_`. Adds `package = "..."` when the two differ. |
| `silk add <path> --name <name>` | Uses `<name>` as the dependency name. `<name>` must already be an identifier. |
| `silk add ... --manifest-path <file>` | Edits that manifest instead of the one found from the current directory. |
| `silk remove <name>` | Removes the entry, and the `[dependencies]` table once it is empty. |

You can also write the entry by hand. See **The manifest** for the keys.

## Importing from a dependency

The first segment of the import path is the dependency name. The rest is a module the dependency exports.

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }
import text_utils.lib { countSpaces }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let spaces = countSpaces(b"one two three")
  run Effect.log("{n} spaces\n", &.{ n: spaces }) |> Effect.provideMut(&mut logger)
}
```

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/app (llvm, x86_64-unknown-linux-gnu, 236 symbols)
2 spaces
```

- Only modules in the dependency's `[package].exports` can be imported (MOD0003). Inside them, only `pub` names (SEM0015). See **Libraries and exports**.
- The dependency's source is compiled together with yours. You do not build it first.
- Dependencies are not transitive. If `app` depends on `middle` and `middle` on `text-utils`, `app` cannot import `text_utils.lib` without its own entry: that import is MOD0001.

## Naming rules

- The dependency name (the key) must be an identifier: an ASCII letter or `_`, then letters, digits or `_`. `text-utils` is not one, so `silk add` writes `text_utils`.
- `package`, when present, must equal the dependency's `[package].name`.
- `silk` and `Intrinsic` are reserved for the toolchain.
- The name must not also be a top-level module or directory in your source root. With a `src/lib.silk` of your own, a dependency named `lib` is refused.
- Two names may point at the same package; each is its own import root.

## One graph per build

- No cycles. A package cannot depend on itself, directly or through others.
- One version and one copy per package name. Two paths that reach different versions, or different directories, of `text-utils` are refused.
- Each dependency's manifest must be readable and valid, with a `[package]` name and version, and its `exports` must name real modules.

The whole graph is checked before any source is compiled.

## Errors

From `silk add` and `silk remove` (exit 2):

```
silk: invalid dependency `text_utils`: the package already has a dependency of that name
silk: invalid dependency `app`: a package cannot depend on itself
silk: invalid dependency `app`: app@0.1.0 already depends on text-utils@0.1.0, directly or through other packages, so adding it would form a cycle
silk: invalid dependency `nothing`: the package has no dependency of that name
Cannot read Silk project manifest /home/you/nothing/silk.toml
```

From a build, check or test, for a manifest edited by hand (exit 1). Each line starts with ``silk: invalid dependency `<name>` of <package@version>:`` and ends with the reason:

| Reason | Cause |
| --- | --- |
| `a dependency name must be an identifier` | Key such as `Text-Utils` |
| `the name is reserved for the toolchain` | Key `silk` or `Intrinsic` |
| `a dependency must be a table such as { path = "../library" }` | Entry written as a bare string |
| `path must name the directory of the dependency's silk.toml` | No `path` |
| `no readable silk.toml at its path` | Wrong path |
| `its silk.toml is not valid TOML` | Broken dependency manifest |
| `its silk.toml has no [package] name and version` | Dependency is not a package |
| `package does not match the name in the dependency's silk.toml` | Wrong `package` value |
| `the name is also a top-level module or directory of this package's source root` | Name clash with your own module |
| `<a> depends on <b>, which depends on <a> in turn, directly or through other packages, so they form a cycle` | Cycle |
| `the build already has a different version or copy of this package` | Two versions or copies |

For example, a cycle:

```
silk: invalid dependency `app` of text-utils@0.1.0: text-utils@0.1.0 depends on app@0.1.0, which depends on text-utils@0.1.0 in turn, directly or through other packages, so they form a cycle
```

`silk add` runs the same graph check, so it refuses a second version too:

```
silk: invalid dependency `text_utils` of other@0.1.0: the build already has a different version or copy of this package
```

Extra keys in a dependency entry, such as `version = "1"`, are ignored without a warning.

## See also

The manifest, Libraries and exports, Workspaces, Modules and imports; chapter 12 of the book.
