# Hooks and scripts

A package can ask Silk to run commands of its own at three moments: when you run `silk generate`, on every build, and once when `silk init` creates a project from a template. This page compares them and shows where each is set up. The pages linked from each section have the full rules.

| Hook | Written in | Runs | Who runs it | Environment |
| --- | --- | --- | --- | --- |
| `[[generate]]` | `silk.toml` | When you run `silk generate`, never during a build | You, in the manifest's directory | Yours, plus `SILK_GENERATE=1` |
| `build.silk` plan | `build.silk` beside `silk.toml` | Every build, inside the compiler | The compiler; it starts no program | None: the plan can only read package files |
| `build.silk` tool step | `build.silk`, with `Plan.tool` | Every build that needs it, before the package is analyzed | The build, in an operating-system sandbox | `HOME`, `TMPDIR`, `PATH`, `SILK_TOOL=1` and `SILK_PACKAGE_DIR` only |
| `[[post-init]]` | A template's `silk.toml` | Once, when `silk init --template` creates a project | `silk init`, in the new project's directory | Yours |

Every hook that starts a program names it the same way: a path with a `/` is a file of the package, and a bare name is searched on `PATH`. The program must exit 0, or the command that ran it fails.

Silk has no table of named commands, such as npm's `scripts`. A `[scripts]` table in `silk.toml` is refused like any other unknown table. Keep such commands in a script of the package, or in your task runner.

## Generators: [[generate]]

A generator writes files you commit, such as a table built from a data file. `silk generate` runs it; builds and dependents never do, so building the package needs neither the generator nor its inputs.

```toml
[[generate]]
run = ["scripts/generate-unicode", "--pinned"]
outputs = ["src/generated_tables.silk", "src/generated_*.silk"]
```

| Key | Value | Meaning |
| --- | --- | --- |
| `run` | array of strings | The program, then its arguments |
| `outputs` | array of strings | The files it writes, below the manifest's directory. A `*` in the last segment matches any run of bytes |

The command runs in the manifest's directory with your environment plus `SILK_GENERATE=1`, so one script can tell whether `silk generate` started it. `silk generate --check` runs every generator but leaves the tree as it was, and exits 1 when a committed output is stale; run it in CI. A workspace root's generators run first, then each member's.

See "Committed generators: silk generate" in **Build plans and generated code**, and `generate` in the Command-line reference.

## Build scripts: build.silk

`build.silk` is the package's build script. It is Silk code that the compiler evaluates on every build, and it declares a plan: modules to add, C files to compile, libraries to link. A plan runs inside the compiler, can only read the package's files, and starts no program, so a dependency's plan is always safe to evaluate.

```silk
import silk.build.plan { Plan }
import silk.build.source { Source }
import silk.core.static_text { StaticText }

static fn plan() -> string<'static> {
  let mut plan = Plan.empty()
  plan = Plan.module(plan, "limits", StaticText.concat("pub const LIMIT: i32 = ", Source.text("limit.txt")))
  return plan
}

pub const PLAN: string = plan()
```

When a build needs a real program, such as a code generator you cannot write in Silk, the plan declares a tool step with `Plan.tool`, its inputs and its outputs. A tool step:

- Runs in an empty output directory, `<output-dir>/tools/<package>/<step>`, in an operating-system sandbox that lets it read its inputs and write only that directory.
- Runs again only when its program, arguments, inputs or outputs change.
- Of a dependency, runs only when the root manifest lists the dependency in `[build].tools`.

See "Build plans: build.silk" and "Tool steps" in **Build plans and generated code**.

## Template setup: [[post-init]]

A template's `[[post-init]]` entries run once, in the new project's directory, after `silk init --template` has copied the template. `silk init` removes them from the new manifest, so they never run again.

```toml
[[post-init]]
run = ["scripts/setup", "--greeting", "hello"]
```

`run` is the only key. Each command gets its own arguments, then the release of the compiler creating the project, then the arguments given to `silk init` after `--`:

```sh
silk init site -t acme/starters/web -- --port 8080
```

```
scripts/setup --greeting hello 0.1.0-dev.56+f7d93cff9716 --port 8080
```

When a command fails, `silk init` removes the project it was creating. See "[[post-init]]" in **Project templates**.

## Writing a hook script

A script works in any hook that starts a program. These rules apply to all of them:

- Commit the executable bit with the script: `git update-index --chmod=+x scripts/setup`. A template keeps the bits it finds, and a dependency fetched from git does too.
- Start it with a `#!` line, such as `#!/bin/sh`. Silk starts the file itself, never through a shell.
- The path in `run` is relative to the package's directory, without `.` or `..` segments. A program elsewhere goes on `PATH` and is named by its bare name.
- On Windows, the program must be one Windows can start, such as an `.exe`. Run a script through its interpreter instead, as in `run = ["python", "scripts/setup.py"]`.
- Print what you want the user to see. `silk generate` and `silk init` show a command's output, and a failing tool step's output is part of the build error.
- Exit with a status other than 0 to stop. `silk generate` keeps every output as it was, a build stops with the step's output, and `silk init` removes the project.

## See also

Build plans and generated code, Project templates, The manifest; `generate` and `init` in the Command-line reference.
