# Project templates

`silk init` creates a new package from a template: a directory of a GitHub repository that holds a `silk.toml`. Without `--template`, it uses the official `default` template, so even a plain `silk init` fetches one. This page covers naming a template, listing templates, what `silk init` copies and changes, and how to write a template of your own, including the `[[post-init]]` commands a template runs once in the new project.

## Creating a project from a template

```sh
silk init site --template acme/starters/web
```

```
Initialized Silk project site at /home/you/site from template acme/starters/web (491fc724043f612c986fe5edb0a5af87bb58e148)
```

`-t` is short for `--template`. The last part of the line is the full hash of the commit the files came from, so you can tell later which version of the template a project started from.

`silk init` with no `--template` uses `silk-lang/examples/default`:

```sh
silk init hello
```

```
Initialized Silk project hello at /home/you/hello from template silk-lang/examples/default (3d330376eba6f634d1ca384269e46bc3c96727d8)
```

| Form | Creates |
| --- | --- |
| `silk init hello` | A program from the official `default` template. Needs `git` and the network |
| `silk init hello -t <template>` | A package or a workspace from that template |
| `silk init hello -t minimal` | The same program as `default`, written by the compiler itself. Works offline |
| `silk init --lib util` | A library, written by the compiler. Works offline |
| `silk init --workspace ws` | A workspace with one starter member, written by the compiler. Works offline |

`--template` cannot be combined with `--lib` or `--workspace`, because the template decides what it creates:

```
silk init: `--template` cannot be combined with `--lib` or `--workspace`: the template decides what it creates
```

`--name` works with a package template as it does without one. A workspace template has no package to name, so `--name` is refused there.

## Naming a template

A template is written `<owner>/<repository>[/<directory>...][@<revision>]`:

| Written | Means |
| --- | --- |
| `hello` | One segment: the directory `hello` of the official examples, `silk-lang/examples/hello` |
| `acme/starters` | Two segments: the root of the repository `acme/starters` |
| `acme/starters/web` | Three or more: the directory `web` inside `acme/starters` |
| `acme/starters/web@v2` | The same directory at the branch or tag `v2` |
| `acme/starters@491fc724043f612c986fe5edb0a5af87bb58e148` | The root at that commit |

Two segments always name a repository's root, never a directory of the official examples. The revision is a branch, a tag or a full commit hash; without one, `silk init` uses the repository's default branch.

A name it cannot read exits 2:

```
Template revision `` must be a branch, a tag or a full commit hash
```

A template that cannot be fetched, or that names no directory of its repository, exits 1:

```
Cannot fetch template acme/starters/web@nope: git fetch failed: fatal: couldn't find remote ref nope
Check the template's name and your network connection, or add `-t minimal` to create a minimal project offline
```

```
Template silk-lang/examples/Bad Name names no directory of its repository; `silk init --list` shows the official templates
```

## Listing templates

`silk init --list` (or `-l`) lists the official templates with their descriptions:

```sh
silk init --list
```

```
Templates in silk-lang/examples (3d330376eba6f634d1ca384269e46bc3c96727d8):
  default  A program that logs a greeting, what `silk init` creates
  hello    A program that logs a greeting
  library  A library package with one function and its test
Create a project from one with `silk init <path> --template <name>`
```

Give it a template name to list another repository, or a directory inside one:

```sh
silk init --list acme/starters
```

```
Templates in acme/starters (491fc724043f612c986fe5edb0a5af87bb58e148):
  acme/starters/web  A web server starter
Create a project from one with `silk init <path> --template <name>`
```

Every directory with a `silk.toml` is a template, unless it is inside another template, so a workspace template's members are not listed on their own. Each is listed by the name `--template` takes, with the `description` from its `[package]` table.

## What silk init does

1. It fetches the repository with the `git` on your `PATH`, without history, into a scratch directory below `$SILK_HOME/git` (`~/.silk/git` when `SILK_HOME` is unset). The scratch directory is removed afterwards.
2. It copies every file of the template's directory into the project directory, keeping executable bits and symbolic links. The repository's `.git` directory is not copied.
3. It edits the new `silk.toml`:
   - In a package template, `[package].name` becomes the project's name (the directory name, or `--name`), `silk-version` becomes the running compiler's release, and `description` is removed, because it describes the template and not your project.
   - In a workspace template, a `[workspace].silk-version` pin becomes the running compiler's release. The members are copied as they are.
   - Every `[[post-init]]` entry is removed, so it never runs again.
4. A workspace, or a package outside a workspace, gets `/build/` in its `.gitignore`. A `.gitignore` from the template is kept, with the line added when it lacks it.
5. It runs the template's `[[post-init]]` entries in order, in the project directory.
6. Inside a workspace, it adds the new package to the root's `members`, as `silk init` always does.

`silk init` never overwrites a file. If the template holds a file that already exists in the project directory, it stops before writing anything and exits 2:

```
Refusing to overwrite existing project file /home/you/site/scripts/setup
```

When any later step fails, including a `[[post-init]]` entry, `silk init` removes every file and directory it created and restores a `.gitignore` it changed, so a failed run leaves the directory as it found it.

## Writing a template

A template is any directory of a GitHub repository with a `silk.toml`, a package or a workspace. Push it, and `silk init -t <owner>/<repository>/<directory>` can use it. The repository must be one `git` can fetch: a public repository, or a private one your `git` has credentials for.

```
starters/
  web/
    silk.toml
    src/
      main.silk
    scripts/
      setup
```

```toml
[package]
name = "web"
version = "0.1.0"
description = "A web server starter"

[[post-init]]
run = ["scripts/setup", "--greeting", "hello"]
```

Keep the template itself a working package: `name` can be anything, because `silk init` replaces it, and `silk check` in the template's directory checks it like any other package. Builds read `[[post-init]]` only to check its shape, so a template builds with its entries in place.

`description` is what `silk init --list` shows. It is removed from every project made from the template.

## [[post-init]]

A `[[post-init]]` entry names one command that `silk init` runs after it has copied the template, for adjustments that copying cannot make: renaming a module after the package, filling in a placeholder, or printing next steps. Entries run in the order they are written.

| Key | Value | Meaning |
| --- | --- | --- |
| `run` | array of strings | The program, then its arguments. A program with a `/` is a path below the template's directory, without `.` or `..` segments; a bare name is searched on `PATH`. |

`run` is the only key. An entry with any other key, or an empty `run`, makes the template's `silk.toml` invalid, and `silk init` refuses the template.

Each command:

- Runs in the new project's directory, after every file has been copied.
- Gets your environment. On Windows, it gets only the variables a program usually needs, such as `PATH`, `TEMP`, `USERPROFILE` and `SILK_HOME`.
- Gets its own arguments from `run`, then the release of the compiler that is creating the project, then every argument given to `silk init` after `--`.
- Must exit 0.

What the commands print to standard output and standard error is shown before the `Initialized` line.

### Arguments

With the template above, this command:

```sh
silk init site -t acme/starters/web -- --port 8080
```

runs `scripts/setup` like this:

```
scripts/setup --greeting hello 0.1.0-dev.56+f7d93cff9716 --port 8080
```

The release lets a script pick versions that match the compiler. The arguments after `--` let a template take options from the person running `silk init`. Every entry gets them, so an entry that runs a program you do not control, such as `git init`, sees them too, and most programs refuse arguments they do not expect. Run such a program from a script of the template instead, which can read its own arguments and drop the rest:

```sh
#!/bin/sh
# $1 and $2 are the entry's own arguments, $3 is the Silk release, the rest came after `--`.
greeting=$2
release=$3
shift 3
git init --quiet
echo "Created with Silk $release"
```

### When an entry fails

A command that exits with a status other than 0, or that cannot be started, stops `silk init`. The project is removed and `silk init` exits 1:

```
silk: git init --quiet failed with status 129
silk: the template's [[post-init]] entry failed, so the project was removed
```

A program that cannot be found is named with where it was looked for:

```
silk: [[post-init]][0]: cannot find the program scripts/setup in the template
```

### Scripts in a template

The script files of a template are copied into the project like any other file, so they stay there after `silk init`. Commit the executable bit with the script (`git update-index --chmod=+x scripts/setup`), because `silk init` keeps the bits it finds and does not add any. Start a script with a `#!` line; on Windows, name a program that Windows can start, such as an `.exe`, or run a script through an interpreter on `PATH`, as in `run = ["python", "scripts/setup.py"]`.

A script that should not stay in the project can remove itself as its last step.

## See also

Hooks and scripts, The manifest, Workspaces; `init` in the Command-line reference.
