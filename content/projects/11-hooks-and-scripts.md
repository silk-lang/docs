# Hooks and scripts

A package can keep its own commands as tasks written in Silk, run them with `silk task`, and have Silk run them around its own commands. It can also ask Silk to run programs at three more moments: when you run `silk generate`, on every build, and once when `silk init` creates a project from a template. This page compares them and shows where each is set up. The pages linked from each section have the full rules.

| Hook | Written in | Runs | Who runs it | Environment |
| --- | --- | --- | --- | --- |
| Tasks | `src/tasks.silk` | When you run `silk task <name>` | You, in the package's directory, with your rights | Yours, plus `SILK_PROJECT_ROOT`, `SILK_INVOCATION_DIRECTORY` and `SILK_COMPILER` |
| `[tasks]` hooks | `silk.toml` | Before or after `silk build`, `run`, `test` and `pack`, in the package you run them in | The command, as `silk task <name>` | As for tasks, plus `SILK_HOOK` and, after `silk pack`, `SILK_HOOK_RESULT` |
| `[[generate]]` | `silk.toml` | When you run `silk generate`, never during a build | You, in the manifest's directory | Yours, plus `SILK_GENERATE=1` |
| `build.silk` plan | `build.silk` beside `silk.toml` | Every build, inside the compiler | The compiler; it starts no program | None: the plan can only read package files |
| `build.silk` tool step | `build.silk`, with `Plan.tool` | Every build that needs it, before the package is analyzed | The build, in an operating-system sandbox | `HOME`, `TMPDIR`, `PATH`, `SILK_TOOL=1` and `SILK_PACKAGE_DIR` only |
| `[[post-init]]` | A template's `silk.toml` | Once, when `silk init --template` creates a project | `silk init`, in the new project's directory, in the same sandbox as tool steps | `PATH`, `HOME`, `TMPDIR` and `SILK_VERSION` only |

Every hook that starts a program names it the same way: a path with a `/` is a file of the package, and a bare name is searched on `PATH`, which for a sandboxed command is `/usr/local/bin:/usr/bin:/bin`. The program must exit 0, or the command that ran it fails.

Tasks and `[tasks]` hooks run only in the package you are working in. Where the package is a dependency, Silk never builds its tasks, never fetches their dependencies, and never reads its `[tasks]` table.

## Tasks: silk task

A package's tasks are a Silk program in `src/tasks.silk`, built by the package's `tasks` profile. Write them there instead of keeping shell, Python or JavaScript scripts beside the package. The tasks are the variants of a union that describes the command line with `silk.cli`, so each task gets typed options, `silk task` with no name lists them, and a misspelled name gets a suggestion.

```silk
import silk.cli.command { Command, CommandLine, Opt }
import silk.cli.task { Task, TaskError, TaskSet }
import silk.io.writer { WriterError }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.system.child_process { ChildProcess, ProcessError }
import silk.system.filesystem { FileError, FileSystem }
import silk.system.host_input { HostInput, HostInputError }
import silk.text.string { String }

union Tasks {
  Codegen,
  Release { pub version: String },
}

impl CommandLine for Tasks {
  static fn command() -> Command<Tasks> {
    return Command<Tasks>.make("tasks", "This project's tasks")
      |> Command.variant("Codegen", "Regenerate the tables")
      |> Command.variant("Release", "Test and pack a release")
      |> Command.arg("version", Opt.about("The version") |> Opt.required)
  }
}

impl TaskSet for Tasks {
  effect fn perform(self: Tasks) -> ()
    ! TaskError | ProcessError | FileError | HostInputError | OutOfMemoryError | WriterError
    ? &mut HostInput | &mut Allocator | &mut ChildProcess | &mut FileSystem {
    match move self {
      Tasks.Codegen => run Task.exec("scripts/generate", &["--pinned"])
      Tasks.Release { version: _ } => {
        run Task.silk(&["test"])
        run Task.silk(&["pack"])
      }
    }
  }
}

pub effect fn main() -> i32 ? &mut HostInput {
  return run Task.main<Tasks>()
}
```

```sh
silk task                     # lists the tasks
silk task codegen
silk task release 1.2.0
```

`silk task` builds the `tasks` profile, then runs the program from the package's directory with the arguments after the task's name. Compiler options, such as `--stdlib`, go before the name. The build is cached like any other, so a task that has not changed starts at once.

| Name | Value |
| --- | --- |
| `SILK_PROJECT_ROOT` | The package's directory, where the task runs |
| `SILK_INVOCATION_DIRECTORY` | The directory you ran `silk task` in |
| `SILK_COMPILER` | The compiler that built the tasks, for running `silk` again |

The `tasks` profile needs no table in `silk.toml`: when the manifest declares none, it builds an executable for this machine, in debug mode, from `tasks.silk` below `[package].source`. Declare `[profiles.tasks]` to change any of that, such as its `main`, and `[profiles.tasks.dependencies]` to give the tasks dependencies of their own; they are fetched only when the tasks build. See "Named profiles" in **Targets and profiles**.

`Task.main` reads the command line, runs the chosen task, and turns a `TaskError` into a one-line report and an exit status. `Task.exec` runs a program with the terminal and environment of the task, `Task.silk` runs the compiler that built the tasks, and `Task.capture` answers what a program wrote. A task that needs another task calls it, because tasks are ordinary functions. See `silk.cli.task` in the standard library reference.

## Hooks: [tasks]

The root manifest's `[tasks]` table names tasks that run around Silk's own commands, each as `silk task <name>` from the package's directory:

```toml
[tasks]
before-build = ["codegen"]
before-pack = ["check-licenses"]
after-pack = ["upload"]
```

| Key | Runs |
| --- | --- |
| `before-build` | Before `silk build` does any work |
| `after-build` | After `silk build` succeeds |
| `before-run` | Before `silk run` or `silk debug` builds |
| `before-test` | Before `silk test` builds |
| `after-test` | After `silk test` passes |
| `before-pack` | Before `silk pack` writes anything |
| `after-pack` | After `silk pack` succeeds |

Each key holds task names, which run in order. A failing task stops the command with the task's exit status. While a hook runs, `SILK_HOOK` holds its key, such as `before-build`; after `silk pack`, `SILK_HOOK_RESULT` holds the object `silk pack --json` prints, so an `after-pack` task can read where the archive is.

Only the manifest of the package you run the command in is read, so a dependency's `[tasks]` never runs. `--no-hooks` skips the hooks, and a Silk command that a hook starts, such as a `Task.silk(&["build"])` in a `before-pack` task, runs none.

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
arguments = true
```

Each command runs in the build tool sandbox: it can write only the new project and a scratch `HOME`, and it has no network. `SILK_VERSION` is set to the release of the compiler creating the project. It gets only the arguments in its `run`, unless it sets `arguments = true`: then it also gets the arguments given to `silk init` after `--`:

```sh
silk init site -t acme/starters/web -- --port 8080
```

```
scripts/setup --greeting hello --port 8080
```

On a host with no sandbox, `silk init` refuses a template with entries unless you pass `--unsandboxed-post-init`. When a command fails, `silk init` removes the project it was creating. See "[[post-init]]" in **Project templates**.

## Writing a hook script

A script works in any hook that starts a program. These rules apply to all of them:

- Commit the executable bit with the script: `git update-index --chmod=+x scripts/setup`. A template keeps the bits it finds, and a dependency fetched from git does too.
- Start it with a `#!` line, such as `#!/bin/sh`. Silk starts the file itself, never through a shell.
- The path in `run` is relative to the package's directory, without `.` or `..` segments. A program elsewhere goes on `PATH` and is named by its bare name.
- On Windows, which has no sandbox for tool steps and `[[post-init]]` entries, the program must be one Windows can start, such as an `.exe`. Run a script through its interpreter instead, as in `run = ["python", "scripts/setup.py"]`.
- Print what you want the user to see. `silk generate` and `silk init` show a command's output, and a failing tool step's output is part of the build error.
- Exit with a status other than 0 to stop. `silk generate` keeps every output as it was, a build stops with the step's output, and `silk init` removes the project.

## See also

Build plans and generated code, Project templates, Targets and profiles, The manifest; `task`, `generate` and `init` in the Command-line reference; `silk.cli.task` in the standard library reference.
