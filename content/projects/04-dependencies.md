# Dependencies

A package uses another package by listing it in `[dependencies]`, either with a path to its directory or with a git repository and a commit. Then it imports that package's exported modules with the dependency name in front. There is no registry yet.

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
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }
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
2 spaces
```

- Only modules in the dependency's `[package].exports` can be imported (MOD0003). Inside them, only `pub` names (SEM0015). See **Libraries and exports**.
- The dependency's source is compiled together with yours. You do not build it first.
- Dependencies are not transitive. If `app` depends on `middle` and `middle` on `text-utils`, `app` cannot import `text_utils.lib` without its own entry: that import is MOD0001.

## Git dependencies

A git dependency reads a package from one commit of a git repository:

```toml
[dependencies]
vector = { git = "https://example.com/geometry.git", rev = "fb09a5d023a80e50a973adb896a198ab4daab4db", path = "vector" }
```

| Key | Required | Meaning |
| --- | --- | --- |
| `git` | yes | The repository: a URL with a scheme (`https://...`, `ssh://...`, `file://...`), an scp-style `host:path` such as `git@example.com:team/geometry.git`, or an absolute path to a local repository. A relative path, or a value starting with `-`, is refused. |
| `rev` | yes | The full commit hash: 40 lowercase hexadecimal digits, or 64 for a SHA-256 repository. |
| `path` | no | The directory of the package's `silk.toml` inside the repository, relative to its root. Default: the root. It must stay inside the repository. |
| `package` | no | The package's `[package].name`. When given, it must match. |

`rev` must be the commit itself. A short hash, a branch name or a tag name in `rev` is refused, and so are the `tag` and `branch` keys: branches and tags move, and a short hash can come to match a second commit. The commit pins the whole package, so the same manifest builds the same source every time.

Write the entry by hand. `silk add` only adds path dependencies.

### Fetching

`silk build`, `silk check`, `silk test` and `silk run` fetch each commit that is not on the machine yet, before they load the package graph. Only that one commit is downloaded (a shallow fetch), with the `git` found on `PATH`. If the server will not hand out a single commit by its hash, every branch and tag is fetched and the commit is taken from them. Git never prompts for a password, so a private repository needs credentials git already has, such as an SSH agent or a credential helper.

Here the repository holds two packages, `vector` and `shared`, and `vector/silk.toml` depends on `shared = { path = "../shared" }`. `vector` exports a `length` module whose `length()` returns 42, and the program prints it:

```silk
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }
import vector.length { length }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  run Effect.log("length {n}\n", &.{ n: length() }) |> Effect.provideMut(&mut logger)
}
```

The fetch prints nothing of its own. Its time is part of the `load` row. The first `silk run`:

```
Compiling app (x86_64-unknown-linux-gnu, debug)
  load     147 modules, 1 in package         0.09s
  check    3 modules                         0.15s
  codegen  720 functions                     0.15s
  borrow   233 bodies                        0.01s
  link     clang                             0.38s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/app in 0.82s
length 42
```

Each commit is checked out once into `$SILK_HOME/git/<commit>`, or `~/.silk/git/<commit>` when `SILK_HOME` is not set, without its `.git` directory. A file `<commit>.fetched` next to it marks the checkout complete. A fetch that stopped part way leaves no marker, and the next build fetches that commit again. A checkout never changes, so later builds read it without git or a network, even after the repository is gone. A checkout is found by its commit alone: two URLs that serve one commit share it, and changing only `git` fetches nothing new. To fetch a commit again, delete its directory and its `.fetched` file.

The editor (`silk lsp`), `silk add`, `silk doc` and `silk doctest` never fetch. They read the commits that are already there. Until one of the four commands above has fetched the commit, `silk add` refuses to edit the manifest:

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependency `vector` of app@0.1.0: commit fb09a5d023a80e50a973adb896a198ab4daab4db of https://example.com/geometry.git is not fetched yet; silk build, check, test and run fetch it
```

`silk doc` stops with `silk doc: invalid project, target, profile, source, or compiler analysis` and `silk doctest` with the same line starting `silk doctest:` (exit 2), and the editor shows no diagnostics for the package. Run `silk check` once to fetch.

There is no lock file. The `rev` in the manifest is the whole record of what a build uses.

### Packages inside the repository

The package read from a commit may have dependencies of its own:

- A path dependency must stay inside the same repository. `vector`'s `shared = { path = "../shared" }` above is read from the same commit.
- A path that leaves the repository is refused. The message names the manifest inside the checkout:

```
Invalid Silk project manifest /home/you/.silk/git/c459ef60881fc5d487329dfcd82386f499be17f9/plot/silk.toml:8: dependency `colors` of plot@0.1.0: a package from a git dependency reaches packages by path only inside its own repository
```

- A git dependency is allowed. It is fetched too, in the same build.

Only the packages the build reaches are read, so other packages in the repository may be anything, even broken.

## Naming rules

- The dependency name (the key) must be an identifier: an ASCII letter or `_`, then letters, digits or `_`. `text-utils` is not one, so `silk add` writes `text_utils`.
- `package`, when present, must equal the dependency's `[package].name`.
- `silk` and `Intrinsic` are reserved for the toolchain.
- The name must not also be a top-level module or directory in your source root. With a `src/lib.silk` of your own, a dependency named `lib` is refused.
- Two names may point at the same package; each is its own import root.

## One graph per build

- No cycles. A package cannot depend on itself, directly or through others.
- One version and one copy per package name. Two paths that reach different versions, or different directories, of `text-utils` are refused.
- Each dependency's manifest must be readable and valid, with a `[package]` name, and its `exports` must name real modules.

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

From a build, check, test or run, for a manifest edited by hand, the problem is a manifest error (exit 2). The message names the manifest and the line of the entry, then ``dependency `<name>` of <package@version>:`` and the reason:

```
Invalid Silk project manifest /home/you/app/silk.toml:8: dependency `Text-Utils` of app@0.1.0: a dependency name must be an identifier
```

| Reason | Cause |
| --- | --- |
| `a dependency name must be an identifier` | Key such as `Text-Utils` |
| `the name is reserved for the toolchain` | Key `silk` or `Intrinsic` |
| `a dependency must be a table such as { path = "../library" }` | Entry written as a bare string |
| `path must name the directory of the dependency's silk.toml` | No `path` |
| `no readable silk.toml at /home/you/nothere` | Wrong path |
| `its silk.toml is not valid TOML: ...` | Broken dependency manifest. The message names that manifest and its line instead of yours |
| `its silk.toml has no [package] name` | Dependency is not a package, such as a workspace root. The message names that manifest |
| `package does not match the name in the dependency's silk.toml` | Wrong `package` value |
| `the name is also a top-level module or directory of this package's source root` | Name clash with your own module |
| `<a> depends on <b>, which depends on <a> in turn, directly or through other packages, so they form a cycle` | Cycle |
| `the build already has a different version or copy of this package` | Two versions or copies |
| `rev must be a full commit hash: 40 or 64 lowercase hexadecimal digits` | `rev` is a short hash, a branch or tag name, or has uppercase letters |
| `a git dependency needs rev, the full hash of the commit to build` | `git` without `rev` |
| `rev pins a git dependency; add git, the repository URL` | `rev` without `git` |
| `git must be the repository URL or absolute path, as git = "https://example.com/library.git"` | Empty `git`, a relative path, or a value starting with `-` |
| `path of a git dependency must name a directory inside the repository, relative to its root` | Absolute `path`, a `..` segment, or a symbolic link out of the repository |
| `fetching commit <rev> of <git> failed: the repository has no such commit` | A commit the repository does not have |
| `fetching commit <rev> of <git> failed: git fetch failed: ` and git's first error line | The repository cannot be reached |
| `fetching commit <rev> of <git> failed: fetching it needs git, and no git is on PATH` | No `git` on `PATH` |
| `its checkout cannot be written below <store>` | The `git` folder in `SILK_HOME` cannot be written |
| `a package from a git dependency reaches packages by path only inside its own repository` | A package from a commit names a path outside its repository. The message names that package's manifest |

For example, a cycle, reported at the entry that closes it:

```
Invalid Silk project manifest /home/you/text-utils/silk.toml:9: dependency `app` of text-utils@0.1.0: text-utils@0.1.0 depends on app@0.1.0, which depends on text-utils@0.1.0 in turn, directly or through other packages, so they form a cycle
```

`silk add` runs the same graph check, so it refuses a second copy too. Here `other` already depends on a copy of `text-utils` in another directory:

```
Invalid Silk project manifest /home/you/other/silk.toml:6: dependency `tu2` of other@0.1.0: the build already has a different version or copy of this package
```

For example, a commit the repository does not have:

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependency `vector` of app@0.1.0: fetching commit 0000000000000000000000000000000000000000 of https://example.com/geometry.git failed: the repository has no such commit
```

And a short hash:

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependency `vector` of app@0.1.0: rev must be a full commit hash: 40 or 64 lowercase hexadecimal digits
```

`tag` and `branch` are refused before the graph is read, at their line, like other keys that are not supported yet:

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependencies.vector.tag is not supported yet
```

Pin the commit with `rev` instead. `git rev-parse v1.2.0^{commit}` in the repository prints the full hash of a tag's commit.

A dependency entry cannot pin a version yet. `version = "1"` is a manifest error (exit 2), named at the line that writes it:

```toml
[dependencies]
text_utils = { path = "../text-utils", package = "text-utils", version = "1" }
```

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependencies.text_utils.version is not supported yet
```

When the entry's table spans several lines, the line is the one with that key, not the one with the dependency name. Any other key the entry does not take is refused the same way, as "is not a supported field", with a suggestion when one is close: `dependencies.text_utils.pth is not a supported field; did you mean dependencies.text_utils.path?`.

## See also

The manifest, Libraries and exports, Workspaces, Modules and imports; chapter 12 of the book.
