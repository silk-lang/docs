# Tasks and build graphs

A package's build is no longer described in `silk.toml`. The manifest says what the package is and what it depends on. Everything about how it is compiled, such as the target, the optimization of one dependency, a second program, a generated module or a release copy in `dist/`, is ordinary Silk code in the root package's `src/tasks.silk`. Each command builds a graph of compilations and steps as plain values and hands it to the compiler as its last step.

Most packages never need a `tasks.silk`. This page starts from the built-in commands, then writes a first command, and then covers everything a command can do. **Build steps and deferred values** covers steps, caching and generated files. **Migrating from manifest builds** maps every removed manifest key and flag to its replacement.

## Three places, three jobs

| File | Says | Runs | Read for dependencies |
| --- | --- | --- | --- |
| `silk.toml` | The package's identity, its `[dependencies]`, workspace layout, pinned native archives | Nothing | Yes |
| `build.silk` | What the package needs wherever it is compiled: generated modules, C sources, libraries to link | Inside the compiler, by static evaluation; its tool programs run in a sandbox | Yes, it travels with the package |
| `src/tasks.silk` | The commands of this project: what `silk build`, `run`, `test` and `plan` compile, and any command of your own | As a program, with your rights, only when you type a command | Never |

A dependency's `tasks.silk` never builds and never runs. Adding a dependency can only add its static `build.silk` plan, whose programs run sandboxed and only when the dependency's entry says `tools = true`. See **Build plans and generated code**.

## The built-in commands

Without a `tasks.silk`, `silk build`, `silk run`, `silk test` and `silk plan` each make one compilation from `[package]`:

```sh
silk build                                   # this machine, dev mode
silk build --release                         # optimized for speed, no debug information
silk build --optimization size --debug false
silk build --target aarch64-apple-darwin --target wasm32-wasip1
silk run -- --port 8080                      # arguments after -- go to the program
silk test --filter parser
silk plan                                    # write the requests editors read, compile nothing
```

| Option | Meaning |
| --- | --- |
| `--target <triple>` | A target to build. Repeat it to build several; without it, the host. See **Targets and compilation settings** |
| `--optimization none\|speed\|size` | The program's optimization. Default `none` |
| `--release` | The same as `--optimization speed` |
| `--debug true\|false` | Debug information. Default `true` for `none` and `false` otherwise |
| `--unsandboxed-tools` | Lets `build.silk` tool programs run on a host with no sandbox, for this command only |

A build writes the artifact to `build/<target>/<mode>/<name>`, where the mode is `dev`, `release` or `size`, and the request it compiled to `build/requests/<name>.<target>.<mode>.toml`:

```
Compiling hello (x86_64-unknown-linux-gnu, release)
  load      170 modules, 1 in package         0.00s
  cache     nothing to reuse                  0.00s
  check     1 module                          0.02s
  codegen   387 functions                     0.20s
  borrow    253 bodies                        0.01s
  optimize  clang                             0.74s
  link      clang                             0.19s
Finished build/x86_64-unknown-linux-gnu/release/hello in 1.19s
```

That is the whole build system for a package that only needs its own Silk files and its dependencies. Write a `tasks.silk` when a build needs something these flags cannot say.

## A first command

A program `app` depends on a library `renderer` and is slow in development because the renderer is unoptimized. This `src/tasks.silk` replaces `silk build` with a command that always optimizes the renderer, whatever the mode of the rest:

```silk
import silk.build.graph { Build, BuildError, Compilation, Options, Optimize, Package }
import silk.build.step { Deferred }
import silk.cli.command { Command, CommandLine }
import silk.cli.task { Task, TaskSet }
import silk.mem.allocator { Allocator }
import silk.system.filesystem { FileSystem }
import silk.system.host_input { HostInput }

union Tasks {
  Build { pub options: Options },
}

impl CommandLine for Tasks {
  static fn command() -> Command<Tasks> {
    return Command<Tasks>.make("tasks", "The app's commands")
      |> Command.variant("Build", "Build the app, with the renderer always optimized")
      |> Command.flatten("options")
  }
}

impl TaskSet for Tasks {
  effect fn perform(self: Tasks) -> ()
    ! BuildError
    ? &mut Allocator | &mut FileSystem | &mut HostInput {
    match move self {
      Tasks.Build { options } => {
        let renderer = Package.make() |> Package.optimize(run Deferred<Optimize>.value(Optimize.Speed))
        let app = run Compilation.fromPackage(&options)
        let fast = run app.package("renderer", move renderer)
        let graph = run Build.make()
        let ready = run graph.add(move fast)
        drop run ready.compile()
      }
    }
  }
}

pub effect fn main() -> i32
  ? &mut HostInput {
  return run Task.main<Tasks>()
}
```

The parts, in order:

- **`union Tasks`.** One variant per command. Its fields are the command's options and arguments, typed. `Build` is the reserved name for `silk build`.
- **`impl CommandLine`.** Describes the command line with `silk.cli`. `Command.flatten("options")` gives the command the standard `--target`, `--optimization`, `--release`, `--debug` and `--unsandboxed-tools` options, parsed into the shared `Options` struct. Flatten it once: one description covers the field in every variant that has it.
- **`impl TaskSet`.** `perform` runs the chosen command. Here it builds the graph: the package's own compilation (`Compilation.fromPackage`), a setting for one dependency (`package("renderer", ...)`), a `Build` with that compilation in it, and `compile()` as the last step.
- **`main`.** `Task.main<Tasks>()` parses the command line, runs the command and turns a failure into a one-line report and an exit status.

`silk build` now builds the tasks program first, then runs its `Build` command:

```
Compiling app tasks (x86_64-unknown-linux-gnu, dev)
  load      356 modules, 1 in package         0.12s
  cache     nothing to reuse                  0.00s
  check     1 module                          0.06s
  codegen   6,209 functions                   3.92s
  borrow    1,606 bodies                      0.10s
  link      clang                             1.18s
Finished build/steps/tasks/x86_64-unknown-linux-gnu/tasks in 5.42s
Compiling app (x86_64-unknown-linux-gnu, dev)
  load      172 modules, 1 in package         0.04s
  check     2 modules                         0.02s
  codegen   401 functions                     0.18s
  borrow    256 bodies                        0.01s
  link      clang                             0.33s
Finished build/x86_64-unknown-linux-gnu/dev/app in 1.68s
```

The tasks program is cached like any compilation. A second `silk build` with nothing changed takes a few hundredths of a second:

```
Compiling app tasks (x86_64-unknown-linux-gnu, dev)
Finished build/steps/tasks/x86_64-unknown-linux-gnu/tasks in 0.00s
Finished build/x86_64-unknown-linux-gnu/dev/app in 0.02s
```

The request in `build/requests/app.x86_64-unknown-linux-gnu.dev.toml` now records the renderer's setting, `optimization = "speed"`, next to the program's own `optimization = "none"`.

## How commands are chosen

`build`, `run`, `test` and `plan` are reserved names. A package with a `tasks.silk` sends all four to its tasks program:

| You type | With a variant of that name | Without one |
| --- | --- | --- |
| `silk build` | Your `Build` command runs | The built-in build |
| `silk run` | Your `Run` command runs | The built-in run |
| `silk test` | Your `Test` command runs | The built-in test |
| `silk plan` | Your `Plan` command runs | The built-in plan |
| `silk task <name>` | The variant spelled `<name>` in kebab case, such as `dist` for `Dist` or `gen-tables` for `GenTables` | `unknown command gentable for tasks; did you mean gen-tables?` |
| `silk task` | | The list of commands |

The built-ins do not call your variants. A project whose `Build` optimizes the renderer gets the built-in, unoptimized compilation from `silk run` unless it also defines `Run`. Share the graph between commands with an ordinary function, as below.

The arguments after the command go to your program, so `silk build --release --target wasm32-wasip1` reaches `Build` as `options`. The toolchain still reads `--manifest-path`, `--stdlib` and `--clang` before it starts the program. Other toolchain flags, such as `-q`, `--progress`, `--timings`, `--ignore-warnings` and `--backend`, are not accepted by a command of your own: declare them as fields if your command needs them.

`silk check` does not build or check `src/tasks.silk`. A mistake in it shows when a command first builds the tasks program.

A `tasks.silk` imports the package's own dependencies like any module of the package. A dependency only the tasks use is fetched only when the tasks program is built. The tasks program is built from what `tasks.silk` imports: the package's own modules, and its `build.silk` plan, come in only when `tasks.silk` imports one of them, so C the application links never reaches the tasks.

### What a command can use

A command is an `effect fn` with your rights. `silk.cli.task` adds:

| Call | Does |
| --- | --- |
| `Task.exec(program, arguments)` | Runs a program with the terminal and environment of the task. A nonzero status fails the task with that status |
| `Task.silk(arguments)` | Runs the same `silk` that started the task, such as `Task.silk(&["pack"])` |
| `Task.capture(program, arguments)` | Runs a program and answers what it wrote |
| `Task.root()`, `Task.invocationDirectory()` | The package directory, where the task runs, and the directory you typed the command in |
| `Task.abort(message)` | Stops with a message and status 1 |

The task runs in the package directory with your environment plus `SILK_PROJECT_ROOT`, `SILK_INVOCATION_DIRECTORY`, `SILK_COMPILER` (the compiler that started it) and `SILK_STDLIB`.

## Compilations

A `Compilation` is one artifact: a program, a library file, an object or a test runner. Start from the package's default, or name the artifact:

| Constructor | Makes |
| --- | --- |
| `Compilation.fromPackage(&options)` | What the built-in commands make from `[package]`, with the command's target, optimization and debug choice. `options` may name at most one target |
| `Compilation.executable(name, root)` | A program named `name` from the root module `root`, a path relative to the package directory, such as `"src/bench.silk"` |
| `Compilation.loadableModule(name, root)` | A shared library (`.so`, `.dylib`, `.dll`) or a wasm reactor module |
| `Compilation.staticArchive(name, root)` | A static archive for C programs |
| `Compilation.object(name, root)` | One relocatable object |
| `Compilation.test(name, root)` | A test runner for the tests below `root` |

A named constructor starts in dev mode for the host. Apply the command's options to it yourself, as in `archive.optimize(run Deferred<Optimize>.value(options.optimize))`.

Each setting is a method that answers the changed compilation. Settings take `Deferred` values, so a setting can come from a step that has not run yet; a value you already know is `run Deferred<T>.value(...)`:

```silk
let base = run Compilation.fromPackage(&options)
let wasm = run base.target(run Deferred<String>.value(run String.copy("wasm32-wasip1")))
let small = run wasm.optimize(run Deferred<Optimize>.value(Optimize.Size))
```

**Targets and compilation settings** lists every setting. **Build outputs and native linking** covers artifacts, C sources and libraries.

### One dependency's settings: Package

`compilation.package(alias, settings)` configures one entry of `[dependencies]`, or the package itself under the alias `self`:

| `Package` call | Does |
| --- | --- |
| `Package.make()` | No changes |
| `optimize(deferred)` | Optimizes the code this package defines, generic instances included, whatever the program's mode |
| `debug(deferred)` | Debug information for this package's code |
| `set(module, name, deferred)` | Binds the parameter `pub param name` declared in `module`, such as `"lib.silk"` or `"build.silk"`. See **Package parameters** in the reference |
| `supplyPath(module, name, deferred)` | Binds a path parameter and lets the package's plan read that path |
| `Package.path(alias, path)` | A file the dependency lists in its `include`, as a deferred path |
| `without()` | Leaves the dependency out of this compilation, the same as `compilation.without(alias)` |

The alias must be declared in `silk.toml`: a graph cannot add a package. Per-package optimization changes only code generation. `silk.core.compilation` still answers the program's mode everywhere, so no code specializes differently.

```silk
let own = run Package.make() |> Package.set("main.silk", "port", run Deferred<i32>.value(9090))
let base = run Compilation.fromPackage(options)
return run base.package("self", move own)
```

## Finishing a graph

A command's last step hands its values to the runner. There are three ways to finish:

| Call | Does | Answers |
| --- | --- | --- |
| `build.compile()` | Runs every step the graph reaches and compiles every compilation in it | `Built` |
| `compilation.build()` | The same for a graph of one compilation | `Built` |
| `build.write()` | Runs only what the requests need, writes the request files and compiles nothing | `Planned` |

`Build.make()` starts an empty graph in the current package. `add(compilation)` and `addStep(step, output)` add roots. `parallelism(workers)` and `memoryBudget(bytes)` bound how much runs at once; one compilation is estimated at 3 GiB unless `compilation.memoryBudget(bytes)` says otherwise.

`Built` holds the artifacts in the order they were added:

| Call | Does |
| --- | --- |
| `built.launch(arguments)` | Runs the one artifact with the terminal and environment. A WASI artifact runs under `wasmtime run`, or the compilation's `runner`. A nonzero status fails the task with the same status |
| `built.launchAt(index, arguments)` | The same for one artifact of several |
| `built.write(directory)` | Copies the artifacts, with any emitted header and import library, to `directory`, keeping executable bits |
| `built.artifacts` | Each artifact's `name`, `path` and `request` |

## Sharing a graph between commands

Because a graph is a value, the usual way to keep `build`, `run` and a release command in step is a function. This `tasks.silk` builds every `--target`, runs the same compilation for the host, and adds `silk task dist`, which copies release builds into `dist/`:

```silk
import silk.build.graph { Build, BuildError, Compilation, Options, Optimize, Package }
import silk.build.step { Deferred }
import silk.cli.command { Command, CommandLine, Opt }
import silk.collections.list { List }
import silk.core.option { Option }
import silk.cli.task { Task, TaskError, TaskSet }
import silk.mem.allocator { Allocator }
import silk.system.filesystem { FileSystem }
import silk.system.host_input { HostInput }
import silk.text.string { String }

union Tasks {
  /// `silk build`: every `--target`, with the renderer always optimized.
  Build { pub options: Options },
  /// `silk run`: the same compilation for the host, then launch it.
  Run { pub options: Options, pub arguments: List<String> },
  /// `silk task dist`: release builds copied into `dist/`.
  Dist { pub options: Options },
}

impl CommandLine for Tasks {
  static fn command() -> Command<Tasks> {
    return Command<Tasks>.make("tasks", "The app's commands")
      |> Command.variant("Build", "Build the app for every --target")
      |> Command.variant("Run", "Build the app for this machine and run it")
      |> Command.variant("Dist", "Build release binaries into dist/")
      |> Command.flatten("options")
      |> Command.arg("arguments", Opt.about("The program's arguments"))
  }
}

// The app for at most one target, shared by every command.
effect fn app(options: &Options) -> Compilation
  ! BuildError
  ? &mut Allocator | &mut FileSystem | &mut HostInput {
  let renderer = Package.make() |> Package.optimize(run Deferred<Optimize>.value(Optimize.Speed))
  let base = run Compilation.fromPackage(options)
  return run base.package("renderer", move renderer)
}

// One compilation per `--target`, or the host's when there is none.
effect fn everyTarget(options: &Options) -> Build
  ! BuildError
  ? &mut Allocator | &mut FileSystem | &mut HostInput {
  let mut graph = run Build.make()
  let targets = options.target.asSlice()
  if targets.length == 0 {
    let current = move graph
    graph = run current.add(run app(options))
  }
  let mut at: usize = 0
  while at < targets.length {
    let mut one = List<String>.make()
    run one.append(run String.copy(targets[at].view()))
    let single = Options {
      target: move one,
      optimize: options.optimize,
      debug: options.debug,
      unsandboxedTools: options.unsandboxedTools,
    }
    let current = move graph
    graph = run current.add(run app(&single))
    at = at + 1
  }
  return move graph
}

impl TaskSet for Tasks {
  effect fn perform(self: Tasks) -> ()
    ! BuildError | TaskError
    ? &mut Allocator | &mut FileSystem | &mut HostInput {
    match move self {
      Tasks.Build { options } => {
        drop run (run everyTarget(&options)).compile()
      }
      Tasks.Run { options, arguments } => {
        let built = run (run app(&options)).build()
        let mut words = List<string>.make()
        let given = arguments.asSlice()
        let mut at: usize = 0
        while at < given.length {
          run words.append(given[at].view())
          at = at + 1
        }
        run built.launch(words.asSlice())
      }
      Tasks.Dist { options } => {
        let release = Options {
          target: move options.target,
          optimize: Optimize.Speed,
          debug: Option<bool>.Some { value: false },
          unsandboxedTools: false,
        }
        let built = run (run everyTarget(&release)).compile()
        drop run built.write("dist")
      }
    }
  }
}

pub effect fn main() -> i32
  ? &mut HostInput {
  return run Task.main<Tasks>()
}
```

```sh
silk build --target x86_64-unknown-linux-gnu --target wasm32-wasip1
```

```
Compiling app tasks (x86_64-unknown-linux-gnu, dev)
Finished build/steps/tasks/x86_64-unknown-linux-gnu/tasks in 0.00s
Compiling app (x86_64-unknown-linux-gnu, dev)
Compiling app (wasm32-wasip1, dev)
Finished build/x86_64-unknown-linux-gnu/dev/app in 1.66s
Finished build/wasm32-wasip1/dev/app.wasm in 1.66s
```

The two compilations run in parallel. `silk task` lists the commands with the descriptions from `CommandLine`:

```
Usage: tasks <command>

The app's commands

Options:
  -h, --help     Print this help

Commands:
  build          Build the app for every --target
  run            Build the app for this machine and run it
  dist           Build release binaries into dist/
```

`silk task dist` leaves `dist/app` and its symbol map `dist/app.symbols`.

A value is moved into each call that changes it, so a graph that grows in a loop is moved out first (`let current = move graph`) and then assigned.

## Branching with when

`when(condition, transform)` on `Compilation`, `Build` and `Run` applies `transform` only when `condition` is true, so a pipeline can branch without new names. `transform` can be a named `effect fn`, a lambda that answers the call's Effect, or an `effect` lambda that runs steps itself:

```silk
let base = run Compilation.fromPackage(options)
let app = run base.when(!devtools, |c| c.without("devtools"))
let shipped = run app.when(release, effect |c| {
  let stripped = run c.debug(run Deferred<bool>.value(false))
  return run stripped.without("profiler")
})
```

A plain lambda cannot `run`; write `effect |c| { ... }` for that. A false condition never calls the transform. `Plan.when` in `build.silk` takes a plain `fn`, because plans are static.

## Doing work around a build

A command is code, so work before or after compiling is a line before or after the last step. This `Build` checks formatting first and stops if the check fails:

```silk
Tasks.Build { options } => {
  run Task.silk(&["format", "--check", "src"])
  let graph = run Build.make()
  drop run (run graph.add(run app(&options))).compile()
}
```

```
/home/you/app/src/main.silk: needs formatting
error: /home/you/.silk/bin/silkc failed with status 1
```

A command of its own fits work that only you start, such as regenerating committed tables or publishing a release:

```silk
Tasks.Tables => run Task.exec("scripts/generate-unicode", &["--pinned"])
Tasks.Release => {
  run Task.silk(&["test"])
  run Task.silk(&["pack"])
  run Task.exec("scripts/upload", &["dist"])
}
```

Work whose output feeds a compilation, such as a generated module, belongs in a step instead, so it runs only when its inputs change. See **Build steps and deferred values**.

## The plan command and editors

The language server and other tools never run a build. They read the request files in `build/requests/`, which every build and every `silk plan` writes. `build/requests/plan.json` lists the requests of the last plan:

```json
{"version":1,"files":["app.x86_64-unknown-linux-gnu.dev.toml"]}
```

`silk plan` writes them without compiling anything. The built-in plan writes the built-in compilation. A project whose commands compile something else defines `Plan` and finishes with `write()`, so the editor sees the same compilation as the build:

```silk
Tasks.Plan { options } => {
  let graph = run Build.make()
  drop run (run graph.add(run app(&options))).write()
}
```

`write()` still runs the steps a request needs, such as a program that generates a module, so the request can name the generated file.

What the editor does:

- In a trusted workspace whose `tasks.silk` has no `Plan` variant, it runs the built-in plan, which starts no project code.
- When `Tasks` has its own `Plan`, running it runs your code, so the editor asks once, with Allow and Not now. It reads `tasks.silk` to tell; it does not run it. Allow is kept in `$SILK_HOME/editor-plans` (`~/.silk/editor-plans` without `SILK_HOME`), never in the project. It covers every worktree of the repository, and outside Git, the workspace's directory. Deleting that file revokes it. Not now lasts for the editor session.
- Otherwise it reads the requests the last build or plan left, and says once per session when `tasks.silk` is newer than they are.
- A failed plan keeps the last good requests and says to run `silk build` or `silk plan`.

`silk check`, `format`, `doc`, `hash` and `pack` never start a task.

## Requests

A request is a complete, explicit description of one compilation in TOML: absolute paths, the target and every setting, every package with its parameters, generated modules and native inputs.

```toml
version = 1
name = "hello"
artifact = "executable"
root = "/home/you/hello/src/main.silk"
root-module = "main.silk"
output = "/home/you/hello/build/x86_64-unknown-linux-gnu/release/hello"
stdlib = "/home/you/.silk/lib/silk/stdlib"
profile = {target = "x86_64-unknown-linux-gnu", cpu = "x86-64", cpu-features = ["sse2"], libc = "gnu", entry = "default", runtime = "default", link = "dynamic", code-model = "small", relocation = "static", optimization = "speed", debug = false, safety = "checked", threading = "single", sanitizers = [], unwind = "none", backend = "llvm", codegen-units = 1}
packages = [{name = "hello", version = "0.1.0", directory = "/home/you/hello", source = "/home/you/hello/src", dependencies = [], exports = [], parameters = [], modules = []}]
native = {sources = [], link = []}
emit = "final"
```

The runner compiles each one with `silkc compile --request <file>`, which reads no manifest, fetches nothing and evaluates no plan. You can do the same to repeat a compilation exactly, or hand a request to another tool. `silkc request-schema` prints the request's JSON Schema, and `silkc resolve --definition <file> --output <request>` turns a compilation definition (`silk.build.definition`) into a request without a tasks program.

## See also

Build steps and deferred values, Build plans and generated code, Targets and compilation settings, Build outputs and native linking, Migrating from manifest builds; `silk.build.graph`, `silk.build.compilation`, `silk.build.package` and `silk.cli.task` in the standard library reference.
