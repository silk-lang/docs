# Migrating from manifest builds

Silk used to describe builds in `silk.toml`: named profiles, `[build]`, `[config]`, `[native]` lists, `[tasks]` hooks and `[[generate]]` generators, with a text `build.silk` plan. All of that is gone. The manifest now says what a package is and what it depends on, a package's own needs are a typed `build.silk` plan, and everything else is code in the root's `src/tasks.silk`. This page takes each removed or changed piece and shows what replaces it, before and after.

The compiler prints no hints for the old keys. A removed table is an unknown field like any other, so the first build of an old project stops at the first one:

```
Invalid Silk project manifest /home/you/app/silk.toml:5: profiles is not a supported field
```

| Old manifest | Message |
| --- | --- |
| `[profiles.<name>]` | `profiles is not a supported field` |
| `[build]` | `build is not a supported field` |
| `[config.<module>]` | `config is not a supported field` |
| `[tasks]` | `tasks is not a supported field` |
| `[[generate]]` | `generate is not a supported field` |
| `[native].link`, `[native].sources`, `function-order`, `platform-supply` | `native.link is not a supported field`, and so on |
| `kind = "static-library"`, `"shared-library"`, `"object"` | `package.kind: expected text that matches /^(executable\|library)$/, got text` |

The removed options are unknown options: `unknown option --profile`, `unknown option --profile-input`, `unknown option --no-hooks`, and `silk: unknown command generate`.

## Where everything went

| Before | After | Section |
| --- | --- | --- |
| `[package]`, `[dependencies]`, `[workspace]`, `[release]`, `[pack]`, `[tool]`, `[[post-init]]`, `[component]`, `[unstable]` | Unchanged | |
| `[native.archive]`, `[native.override]` | Unchanged; `Plan.archivePath` names a file in an archive | Native archives |
| `[profiles.release]` and `--profile release` | `--release`, or `--optimization` and `--debug` | Release builds |
| A profile's `target`, `[build].targets` | `--target`, or a `Build` command that picks the targets | Targets |
| Any other profile key | A `Compilation` setting of the same name | Profile keys |
| A profile's `main` and `artifact` | `Compilation.executable`, `loadableModule`, `staticArchive`, `object` | Other programs and artifacts |
| `[package].kind` library kinds | `kind = "library"` and an artifact constructor in a command | Library kinds |
| `[config]`, a profile's `config` | `Package.set` | Parameters |
| A profile's `dependencies`, `[profiles.tasks.dependencies]` | `[dependencies]`; a dependency is fetched only when a compilation imports it | Dependencies of one compilation |
| `[profiles.tasks]` | Nothing: `src/tasks.silk` builds as the tasks program | Tasks |
| `[build].stage` | `Compilation.emit`, or `--emit` for a single file | Stages |
| `[build].output-dir` | `[workspace].output-dir` | Output directory |
| `[build].tools` | `tools = true` on the dependency's entry | Tool steps |
| `[build].unsandboxed-tools` | `--unsandboxed-tools` on the command line | Tool steps |
| `[native].sources`, `[native].link` and their `os` filter | `build.silk` plan steps, with an `if` on the target | Native sources and links |
| `[native].function-order`, `platform-supply` | `functionOrder` and `platform` | Native sources and links |
| `[tasks]` hooks, `--no-hooks`, `SILK_HOOK`, `SILK_HOOK_RESULT` | Code before or after the last step of a command | Hooks |
| `[[generate]]`, `silk generate`, `silk generate --check` | A command of its own | Generators |
| `pub const PLAN: string` and `Plan.tool...` | `pub const PLAN: Plan`, `Run` and `WriteFiles` | Build plans |
| `--profile-input`, generated manifests | `Compilation` values, or a definition and `silkc resolve` | Programs that drive the compiler |

## Release builds

Before:

```toml
[profiles.release]
optimization = "speed"
debug = false
```

```sh
silk build --profile release
```

After, with no table at all:

```sh
silk build --release                        # speed, no debug information
silk build --optimization size --debug false
silk build --optimization speed --debug true
```

`silk run`, `silk test`, `silk plan` and `silk pack --bin` take the same options. The output directory is named by the mode: `build/<target>/release/` for speed, `build/<target>/size/` for size and `build/<target>/dev/` for none.

## Targets

A profile that only named a target becomes the `--target` option, which may be repeated:

```toml
# Before
[profiles.web]
target = "wasm32-wasip1"
```

```sh
# After
silk build --target wasm32-wasip1
silk build --target x86_64-unknown-linux-gnu --target wasm32-wasip1
```

`[build].targets` made a bare `silk build` build several targets. Now a `Build` command decides that. This one builds the listed targets when none is given:

```silk
// One compilation per target: the ones typed, or these two.
effect fn targets(options: &Options) -> Build
  ! BuildError
  ? &mut Allocator | &mut FileSystem | &mut HostInput {
  let mut names = List<String>.make()
  if options.target.length() == 0 {
    run names.append(run String.copy("x86_64-unknown-linux-gnu"))
    run names.append(run String.copy("wasm32-wasip1"))
  }
  let typed = options.target.asSlice()
  let mut at: usize = 0
  while at < typed.length {
    run names.append(run String.copy(typed[at].view()))
    at = at + 1
  }
  let mut graph = run Build.make()
  let selected = names.asSlice()
  at = 0
  while at < selected.length {
    let base = run Compilation.fromPackage(&Options.make())
    let targeted = run base.target(run Deferred<String>.value(run String.copy(selected[at].view())))
    let optimized = run targeted.optimize(run Deferred<Optimize>.value(options.optimize))
    let compilation = run optimized.debug(run Deferred<bool>.value(options.debugInfo()))
    let current = move graph
    graph = run current.add(move compilation)
    at = at + 1
  }
  return move graph
}
```

A bare `silk build` now builds both, and `silk build --target wasm32-wasip1` only the one typed:

```
Compiling multi (x86_64-unknown-linux-gnu, dev)
Compiling multi (wasm32-wasip1, dev)
Finished build/x86_64-unknown-linux-gnu/dev/multi in 2.09s
Finished build/wasm32-wasip1/dev/multi.wasm in 2.09s
```

**Tasks and build graphs** has a complete `tasks.silk` with this shape.

## Profile keys

Every other key of a profile is a `Compilation` setting with the same meaning. Each takes a deferred value; for a value you know, wrap it with `run Deferred<T>.value(...)`:

| Profile key | `Compilation` setting | Value |
| --- | --- | --- |
| `target` | `target` | `Deferred<String>` |
| `cpu.model`, `cpu.features` | `cpu`, `cpuFeatures` | `Deferred<String>`, `Deferred<List<String>>` |
| `deployment` | `deployment` | `"14.0"` |
| `libc` | `libc` | `"none"`, `"system"` or `"gnu"` |
| `entry`, `runtime` | `entry`, `runtime` | `"default"`, `"none"` or a declared name. The old `{ kind = "named", name = "x" }` is now `"x"` |
| `link`, `code-model`, `relocation` | `link`, `codeModel`, `relocation` | As before, such as `"static"`, `"large"`, `"pic"` |
| `optimization` | `optimize` | `Deferred<Optimize>`: `Optimize.None`, `Speed` or `Size` |
| `debug` | `debug` | `Deferred<bool>` |
| `safety`, `threading`, `unwind`, `backend` | `safety`, `threading`, `unwind`, `backend` | As before |
| `sanitizers` | `sanitizers` | `Deferred<List<String>>` |
| `codegen-units` | `codegenUnits` | `Deferred<u64>` |
| `max-memory`, `stack-size` | `maxMemory`, `stackSize` | `Deferred<u64>` in bytes. `"256MiB"` is now `268435456` |
| `main` | the constructor's `root` | See below |
| `artifact` | the constructor | See below |
| `config` | `Package.set` | See Parameters |
| `dependencies` | `[dependencies]` | See below |

Before:

```toml
[profiles.fast]
cpu.model = "x86-64-v3"
relocation = "pic"
codegen-units = 8
```

After, in a command:

```silk
let base = run Compilation.fromPackage(&options)
let pic = run base.relocation(run Deferred<String>.value(run String.copy("pic")))
let modern = run pic.cpu(run Deferred<String>.value(run String.copy("x86-64-v3")))
let fast = run modern.codegenUnits(run Deferred<u64>.value(8))
```

The request records `cpu = "x86-64-v3"`, `relocation = "pic"` and `codegen-units = 8`. Combinations are checked when the request is resolved, as they were when a profile was assembled: `libc = "none"` alone, for example, stops with `the build selects no single runtime (ARTIFACT-001)` until the compilation also selects a runtime and an entry.

## Other programs and artifacts

A profile with its own `main` built a second program from the same package. Now it is a compilation with its own root, usually in a command of its own:

```toml
# Before
[profiles.bench]
main = "bench.silk"
optimization = "speed"
```

```silk
// After: `silk task bench`
Tasks.Bench { options: _ } => {
  let bench = run Compilation.executable("bench", "src/bench.silk")
  let fast = run bench.optimize(run Deferred<Optimize>.value(Optimize.Speed))
  let built = run fast.build()
  run built.launch(&[])
}
```

The root is relative to the package directory now, not to `[package].source`, so `bench.silk` becomes `src/bench.silk`.

## Library kinds

`[package].kind` takes only `executable` and `library`. A package that was a `static-library`, `shared-library` or `object` is a `library`, and a command builds the file:

```toml
# Before
[package]
name = "vec"
kind = "static-library"
```

```toml
# After
[package]
name = "vec"
kind = "library"
exports = ["lib"]
```

```silk
Tasks.Build { options } => {
  let archive = run Compilation.staticArchive("vec", "src/lib.silk")
  let tuned = run archive.optimize(run Deferred<Optimize>.value(options.optimize))
  let graph = run Build.make()
  let built = run (run graph.add(move tuned)).compile()
  drop run built.write("dist")
}
```

| Old kind | Constructor | Writes on Linux |
| --- | --- | --- |
| `static-library` | `Compilation.staticArchive` | `vec.a` |
| `shared-library` | `Compilation.loadableModule` | `vec.so` |
| `object` | `Compilation.object` | `vec.o` |

Silk packages that depend on the library are unaffected: they compile it from source, as before. A plan's named libraries, such as `linkLibrary("m", ...)`, are refused in a static archive today; leave them to the program that links it.

## Parameters

`[config]` bound package parameters from the manifest:

```toml
# Before
[config.main]
port = 9090

[config.renderer.lib]
workers = 8
```

`Package.set(module, name, value)` binds them in a command. The module is the file that declares the parameter, relative to its package's source root; the root package is `self`:

```silk
// After
let own = run Package.make() |> Package.set("main.silk", "port", run Deferred<i32>.value(9090))
let renderer = run Package.make() |> Package.set("lib.silk", "workers", run Deferred<i32>.value(8))
let base = run Compilation.fromPackage(&options)
let withOwn = run base.package("self", move own)
let app = run withOwn.package("renderer", move renderer)
```

Values keep their declared type, so an enum is bound as the enum and an integer as an integer, not as TOML text. A parameter the package declares without a default must now be bound in every compilation that reaches it. A parameter in `build.silk` is bound with the module `"build.silk"`. See **Package parameters** in the reference.

## Dependencies of one compilation

A profile's `dependencies` added packages only to that profile's build, and `[profiles.tasks.dependencies]` only to the tasks. Now there is one `[dependencies]` table, and a dependency is fetched only when a compilation reaches an import of it. A package that only the tasks or only the benchmark imports costs the other builds nothing. To keep a declared package out of one compilation, say so:

```toml
[dependencies]
devtools = { path = "../devtools" }
```

```silk
let shipped = run base.when(options.optimize != Optimize.None, |c| c.without("devtools"))
```

`silk fetch` still fetches everything, for offline work.

## Tasks

`[profiles.tasks]` configured the program `silk task` built. There is nothing to configure now: `src/tasks.silk` is the tasks program, built for the host in dev mode, with the package's `[dependencies]`. A tasks program written before keeps working as it is, as long as its union has no variant named `Build`, `Run`, `Test` or `Plan` that you did not mean as a replacement. A variant with one of those names now runs for `silk build`, `run`, `test` or `plan`.

## Stages

```toml
# Before
[build]
stage = "llvm-ir"
```

```silk
// After
let ir = run base.emit(run Deferred<String>.value(run String.copy("llvm-ir")))
```

A single file still takes `--emit`: `silk build main.silk -o main.ll --emit llvm-ir`.

## Output directory

`[build].output-dir` is gone. A workspace still sets one with `[workspace].output-dir`; a single package always writes `build/`. Use `built.write("dist")` in a command to put artifacts somewhere else.

## Tool steps

A dependency's tool steps were authorized in the root's `[build].tools`. The permission now sits on the dependency's own entry:

```toml
# Before
[dependencies]
palette = { path = "../palette" }

[build]
tools = ["palette"]
```

```toml
# After
[dependencies]
palette = { path = "../palette", tools = true }
```

`[build].unsandboxed-tools = true` let tool steps run on a host with no sandbox, and the language server honored it when it opened the project. No file can grant that now. Type it on the command that needs it, and only that command gets it:

```sh
silk build --unsandboxed-tools
```

## Native sources and links

The `[native]` lists move into the package's `build.silk`, so they still travel to every program that uses the package. Before:

```toml
[native]
sources = [
  { c = ["native/scale.c", "native/norm.c"], flags = ["-DSCALE_EXTRA=2"], include = ["include"] },
]
link = [
  { library = "m", mode = "dynamic", os = "linux" },
  { framework = "Metal", os = "macos" },
  { static-archive = "vendor/libfoo.a" },
  { object = "vendor/start.o" },
  { search-path = "vendor/lib" },
]
function-order = "order.txt"
```

After, in `build.silk`:

```silk
import silk.build.plan { Framework, Library, Plan }
import silk.build.step { sourcePath }

static fn plan() -> Plan {
  let mut plan = Plan.empty()
    |> Plan.compileSources(
      "c",
      sourcePath("native"),
      "*.c",
      &["-DSCALE_EXTRA=2"],
      &[sourcePath("include")],
    )
    |> Plan.linkArchive(sourcePath("vendor/libfoo.a"))
    |> Plan.linkObject(sourcePath("vendor/start.o"))
    |> Plan.searchPath(sourcePath("vendor/lib"))
    |> Plan.functionOrder(sourcePath("order.txt"))
  if Intrinsic.targetOperatingSystem() == "linux" {
    plan = plan |> Plan.linkLibrary("m", Library.dynamicSearch())
  }
  if Intrinsic.targetOperatingSystem() == "macos" {
    plan = plan |> Plan.linkFramework("Metal", Framework.make())
  }
  return plan
}

pub const PLAN: Plan = plan()
```

| `[native]` entry | Plan step |
| --- | --- |
| `{ c = path }` (`objc`, `cpp`, `objcpp`) | `compileC(sourcePath(path))` (`compileObjectiveC`, `compileCpp`, `compileObjectiveCpp`) |
| `{ c = [...], flags, include }` | `compileNative(language, path, flags, include)` per file, or `compileSources(language, directory, pattern, flags, include)` for a glob |
| `{ library = n, mode = "dynamic" }` | `linkLibrary(n, Library.dynamicSearch())` |
| `{ library = n, mode = "static" }` | `linkLibrary(n, Library.staticSearch())` |
| `{ framework = n }` | `linkFramework(n, Framework.make())` |
| `{ static-archive = p }`, `{ object = p }` | `linkArchive(sourcePath(p))`, `linkObject(sourcePath(p))` |
| `{ search-path = p }`, `{ linker-script = p }` | `searchPath(sourcePath(p))`, `linkerScript(sourcePath(p))` |
| `os = "linux"` on any entry | An `if` on `Intrinsic.targetOperatingSystem()`, or `Plan.when` |
| `function-order = p` | `functionOrder(sourcePath(p))`, or `Compilation.functionOrder` for the root |
| `platform-supply` | `Compilation.platform` in the root's command. Automatic discovery is the default |

New with the plan: `.weak()` and `.needed()` on a library or framework, `frameworkSearchPath` and `rpath`. A path into a pinned archive, which used to be written as the archive's name and a path, is `Plan.archivePath("dawn", "lib/libdawn.a")`.

What only the root needs can also go on its `Compilation` in `tasks.silk`, with the same names. See **Build outputs and native linking**.

## Hooks

`[tasks]` ran tasks around Silk's commands. A command is code now, so the work goes before or after its last step.

```toml
# Before
[tasks]
before-build = ["codegen"]
after-test = ["coverage"]
before-pack = ["check-licenses"]
after-pack = ["upload"]
```

```silk
// After
// `codegen`, `checkLicenses` and `upload` are functions of your own.
Tasks.Build { options } => {
  run codegen()
  let graph = run Build.make()
  drop run (run graph.add(run app(&options))).compile()
}
Tasks.Release => {
  run checkLicenses()
  let report = run Task.capture("silk", &["pack", "--json"])
  run upload(&report)
}
```

| Hook | Replacement |
| --- | --- |
| `before-build`, `after-build` | Code before or after `compile()` in `Build` |
| `before-run` | Code before `build()` in `Run` |
| `before-test`, `after-test` | A `Test` command, or a command of your own that calls `Task.silk(&["test"])` |
| `before-pack`, `after-pack` | A command of your own around `Task.silk(&["pack"])`. `silk pack` itself runs no tasks |
| `SILK_HOOK_RESULT` | `Task.capture` of `silk pack --json` |
| `--no-hooks` | Run the step you want directly, such as `silk task build-only` |

A reserved command does not call the built-in for you, so a `Build` that only wanted a `before-build` hook builds the package itself with `Compilation.fromPackage(&options)`. Work whose output feeds the build, such as generated code, fits better as a step, which runs only when its inputs change. See **Build steps and deferred values**.

## Generators

`[[generate]]` declared programs that `silk generate` ran and `silk generate --check` compared, for output you commit:

```toml
# Before
[[generate]]
run = ["scripts/generate-unicode", "--pinned"]
outputs = ["src/generated_tables.silk"]
```

Now the generator is a command, and the check is a second one:

```silk
// After: `silk task tables` and `silk task check-tables`
Tasks.Tables => run Task.exec("scripts/generate-unicode", &["--pinned"])
Tasks.CheckTables => {
  run Task.exec("scripts/generate-unicode", &["--pinned"])
  run Task.exec("git", &["diff", "--exit-code", "src/generated_tables.silk"])
}
```

If the output does not need committing, generate it on every build instead: a `Run` step in a command, or a tool step in `build.silk` so it travels with the package.

## Build plans

`build.silk` used to compute a text plan, `pub const PLAN: string`, with functions that took the plan as their first argument. The plan is a typed value now, and its steps take deferred paths:

```silk
// Before
import silk.build.plan { Plan }
import silk.build.source { Source }
import silk.core.static_text { StaticText }

static fn plan() -> string<'static> {
  let mut plan = Plan.empty()
  plan = Plan.module(plan, "limits", StaticText.concat("pub const LIMIT: i32 = ", Source.text("limit.txt")))
  plan = Plan.compileC(plan, "native/twice.c")
  plan = Plan.linkLibrary(plan, "m")
  plan = Plan.tool(plan, "colors", "tools/gen.sh")
  plan = Plan.toolInput(plan, "colors.txt")
  plan = Plan.toolOutput(plan, "colors.silk")
  plan = Plan.toolModule(plan, "colors", "colors", "colors.silk")
  return plan
}

pub const PLAN: string = plan()
```

```silk
// After
import silk.build.plan { Library, Plan }
import silk.build.run { Run }
import silk.build.step { sourcePath }
import silk.build.write_files { WriteFiles }
import silk.build.source { Source }
import silk.core.static_text { StaticText }

static fn limits() -> WriteFiles {
  return WriteFiles.empty()
    |> WriteFiles.literal(
      "limits.silk",
      StaticText.concat("pub const LIMIT: i32 = ", Source.text("limit.txt")),
    )
}

static fn colors() -> Run {
  return Run.command("tools/gen.sh")
    |> Run.input(sourcePath("colors.txt"))
    |> Run.output("colors.silk")
}

pub const PLAN: Plan = Plan.empty()
  |> Plan.module("limits", limits().result("limits.silk"))
  |> Plan.module("colors", colors().result("colors.silk"))
  |> Plan.compileC(sourcePath("native/twice.c"))
  |> Plan.linkLibrary("m", Library.dynamicSearch())
```

| Before | After |
| --- | --- |
| `pub const PLAN: string` | `pub const PLAN: Plan` |
| `Plan.empty()` answering a string | `Plan.empty()` answering a `Plan`; chain steps with `\|>` |
| `Plan.module(plan, name, sourceText)` | `WriteFiles.literal(file, sourceText)`, then `Plan.module(name, files.result(file))` |
| `Plan.compileC(plan, "native/a.c")` | `Plan.compileC(sourcePath("native/a.c"))` |
| `Plan.linkLibrary(plan, name)` | `Plan.linkLibrary(name, Library.dynamicSearch())` |
| `Plan.linkFramework(plan, name)` | `Plan.linkFramework(name, Framework.make())` |
| `Plan.linkArchive(plan, path)`, `linkObject` | `Plan.linkArchive(sourcePath(path))`, `linkObject` |
| `Plan.tool(plan, step, program)` | `Run.command(program)` |
| `Plan.toolArgument(plan, text)` | `Run.arg(text)` |
| `Plan.toolInput(plan, path)` | `Run.input(sourcePath(path))`, which also passes the path as an argument; `Run.reads` for a file read without one |
| `Plan.toolOutput(plan, file)` | `Run.output(file)`, which passes the output's path as an argument |
| `Plan.toolModule(plan, module, step, file)` | `Plan.module(module, run.result(file))` |

A tool program changes too:

- It gets its input and output paths as arguments, in the order declared, so it no longer reads `SILK_PACKAGE_DIR` or writes relative to its working directory. The old `wc -l < "$SILK_PACKAGE_DIR/colors.txt" > colors.silk` becomes `wc -l < "$1" > "$2"`.
- `SILK_TOOL`, `HOME`, `TMPDIR` and `PATH` are no longer set for it. A shell script still finds the standard tools.
- Its output directory is `build/steps/<key>/` instead of `<output-dir>/tools/<package>/<step>`.

## Programs that drive the compiler

A program that wrote a manifest and called `silk build --manifest-path ... --profile-input '{...}'`, as silkui did, builds `Compilation` values instead and finishes with `compile()`, `build()` or `write()`. It no longer searches the build directory for the artifact: `built.artifacts` names each one, and `build/requests/` holds the exact request. A program that is not a tasks program can still describe a compilation as a definition (`silk.build.definition`) and resolve it with `silkc resolve --definition <file> --output <request>`, then compile it with `silkc compile --request <request>`.

## If you tried the pipeline preview

Projects moved to the `0.1.0-pipeline.1` preview need two more changes:

- Delete `pub const COMMANDS: string = Task.commands<Tasks>()` from `tasks.silk`. Nothing reads it; a `tasks.silk` declares nothing for the toolchain.
- Link values replace positional arguments: `Plan.linkLibrary("m", "dynamic", false, false)` is `Plan.linkLibrary("m", Library.dynamicSearch())`, a `true` weak or needed flag is `.weak()` or `.needed()`, and `linkFramework(name, weak, needed)` is `linkFramework(name, Framework.make())`. The same holds on `Compilation`.

## A checklist

1. Delete `[profiles]`, `[build]`, `[config]`, `[tasks]`, `[[generate]]` and the `[native]` lists from every `silk.toml`; keep `[native.archive]` and `[native.override]`.
2. Change library kinds to `kind = "library"`.
3. Move `[build].tools` entries to `tools = true` on each dependency.
4. Rewrite `build.silk` as a typed `Plan`, adding what `[native]` listed.
5. Replace `--profile` in scripts and CI with `--release`, `--optimization`, `--debug` and `--target`.
6. Put what remains (other programs, library files, parameters, per-dependency optimization, hooks, generators) in `src/tasks.silk`, sharing one graph function between `Build`, `Run` and `Plan`.
7. Run `silk build`, `silk test` and `silk plan`, and commit.
