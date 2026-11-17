# Build plans and generated code

Most packages need nothing but their `.silk` files and `silk.toml`. When a package needs more, such as a table built from a data file, a C shim, a system library or a module written by a code generator, pick the first tool that fits:

| Need | Use |
| --- | --- |
| Embed a file of the package, or parse it while compiling | `silk.build.source`, below |
| Something the package needs wherever it is compiled: generated modules, C sources, libraries to link | The package's `build.silk` plan, below |
| A real program that writes part of the package on every build | A tool step in `build.silk`, in the sandbox |
| Something only your project's own build needs, such as a host tool, the network or a secret | A step in the root's `tasks.silk`; see **Build steps and deferred values** |
| A generator whose output you commit | A command of its own in `tasks.silk`, run when you choose |

A plan runs inside the compiler and a tool step runs in an operating-system sandbox, so a dependency's build can never act with your rights. Only the root's `tasks.silk` does, and only when you type a command.

## Reading package files

`silk.build.source` reads a file of the calling package while the package compiles:

| Member | Result | Value |
| --- | --- | --- |
| `Source.read(path)` | `&'static [u8]` | The file's bytes |
| `Source.text(path)` | `string<'static>` | The file's text, checked to be UTF-8 |
| `Source.compressed(path)` | `Compressed` | The file's bytes, kept compressed until the program asks |
| `Source.compressedText(path)` | `CompressedText` | The file's text, checked to be UTF-8, kept compressed until the program asks |

```silk
import silk.build.source { Source }
import silk.core.static_text { StaticText }

pub fn sceneShader() -> &'static [u8] {
  return Source.read("shaders/scene.wgsl")
}

static fn composedShader() -> string<'static> {
  return StaticText.concat(Source.text("shaders/blend.wgsl"), Source.text("shaders/compose.wgsl"))
}
```

- The path is relative to the directory that holds the package's `silk.toml`, uses `/`, and has no empty, `.` or `..` segment, so a package reads only its own files.
- Write the path as a string literal in the call. The build finds the files each module reads from those literals.
- Runtime code receives the file as a constant. A `static fn` can parse it while the package compiles.
- The file is read as bytes. It is never compiled as Silk, whatever its name or contents, so a library can embed JavaScript, a shader or a font.
- Editing the file rebuilds only the code that read it. `silk check` reads it too.

### From a library

A library embeds its own files, and the packages that depend on it need to do nothing. Here the library `ui_js` keeps a script next to its source:

```
ui-js/
  silk.toml
  js/index.js
  src/lib.silk
```

```silk
import silk.build.source { Source }

pub fn script() -> &'static [u8] {
  return Source.read("js/index.js")
}
```

An application that lists `ui_js = { path = "../ui-js" }`, or a git or URL dependency, calls `script()` and builds with the file's bytes. The path stays relative to the library's directory, wherever the library was fetched to.

- A library's own `static fn` reads the library's files, even when another package calls it.
- A library you release with `silk pack` lists the files it embeds in `[package].include` when they sit outside the source root, so the archive holds them. See **Packaging releases**.

### Keeping a large file compressed

`Source.read` puts the whole file in the program. For a large file that the program needs only sometimes, or only once at startup, `Source.compressed` and `Source.compressedText` keep it as a Zstandard frame instead and expand it when the program asks:

```silk
import silk.build.source { CompressedText, Source }
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.text.string { String }

pub effect fn main() -> ()
  ! LogError | OutOfMemoryError {
  let mut logger = StdoutLogger.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  let packed = Source.compressedText("js/index.js")
  let script = run CompressedText.text(&packed) |> Effect.provideMut<Allocator>(&mut allocator)
  run Effect.log(
    "{held} bytes in the program, {full} bytes of script\n",
    &.{
      held: CompressedText.compressedLength(&packed),
      full: String.ownedUtf8Bytes(&script).length,
    },
  )
    |> Effect.provideMut(&mut logger)
}
```

With a 1.1 MB JavaScript bundle at `js/index.js`:

```
204875 bytes in the program, 1123332 bytes of script
```

| Member | Result | Meaning |
| --- | --- | --- |
| `Compressed.bytes(&packed)` | `Bytes` | Expands the file. Needs an `Allocator`; fails only with `OutOfMemoryError`. |
| `CompressedText.text(&packed)` | `String` | Expands the text. The build already checked that it is UTF-8. |
| `length(&packed)` | `usize` | The size of the expanded file. Expands nothing. |
| `compressedLength(&packed)` | `usize` | The size the program holds. Expands nothing. |

- The build compresses the file once and compresses it again only when the file changes. The frame is the same on every host, so builds stay reproducible.
- Each call to `bytes` or `text` expands the file again. Keep the result when the program needs it more than once.
- Expanding allocates the result and, for the length of the call, a decoder: a window as large as the file, up to 4 MiB, and about 400 KiB of buffers.
- A file that does not shrink, such as a PNG, is stored as it is plus a few bytes. Use `Source.read` for those.
- On the bundle above, compressing adds about 60 ms to the build and expanding takes about 15 ms.

See **Static evaluation** in the reference for the exact rules.

## Build plans: build.silk

A `build.silk` beside `silk.toml` declares what the package needs wherever it is compiled, as the constant `PLAN`:

```
tables/
  silk.toml
  build.silk
  limit.txt
  colors.txt
  native/twice.c
  tools/gen.sh
  src/main.silk
```

```silk
import silk.build.plan { Library, Plan }
import silk.build.run { Run }
import silk.build.step { sourcePath }
import silk.build.write_files { WriteFiles }
import silk.build.source { Source }
import silk.core.static_text { StaticText }

// A module written from a file of the package.
static fn limits() -> WriteFiles {
  return WriteFiles.empty()
    |> WriteFiles.literal(
      "limits.silk",
      StaticText.concat("pub const LIMIT: i32 = ", Source.text("limit.txt")),
    )
}

// A module a program of the package writes, in the tool sandbox.
static fn colors() -> Run {
  return Run.command("tools/gen.sh")
    |> Run.input(sourcePath("colors.txt"))
    |> Run.output("colors.silk")
}

static fn plan() -> Plan {
  let mut plan = Plan.empty()
    |> Plan.module("limits", limits().result("limits.silk"))
    |> Plan.module("colors", colors().result("colors.silk"))
    |> Plan.compileC(sourcePath("native/twice.c"))
  if Intrinsic.targetOperatingSystem() == "linux" {
    plan = plan |> Plan.linkLibrary("m", Library.dynamicSearch())
  }
  return plan
}

pub const PLAN: Plan = plan()
```

```sh
#!/bin/sh
# tools/gen.sh <input> <output>
count=$(wc -l < "$1" | tr -d ' ')
echo "pub const COLOR_COUNT: i32 = $count" > "$2"
```

The package's own code imports the generated modules and calls the C function like any other:

```silk
import colors { COLOR_COUNT }
import limits { LIMIT }
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

unsafe extern "C" fn twice(value: i32) -> i32

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let doubled = unsafe twice(LIMIT)
  run Effect.log(
    "{doubled} from C, {COLOR_COUNT} colors\n",
    &.{ doubled: doubled, COLOR_COUNT: COLOR_COUNT },
  )
    |> Effect.provideMut(&mut logger)
}
```

With `21` in `limit.txt` and three lines in `colors.txt`, `silk run` prints `42 from C, 3 colors`.

The rules:

- **It is static.** `PLAN` is computed by static evaluation, like any `const`. It reads only the package's own files and paths a consumer supplied, and it can import only the standard library, not the package it builds.
- **It travels with the package.** Every compilation that imports one of the package's modules evaluates its plan, for the compilation's target, so a dependency's C sources and libraries reach every program that uses it. There is nothing to repeat in the consumer. Declaring a dependency alone links nothing; a package of only C, which the dependent never imports, is linked with `Plan.linkDependency`.
- **Conditions are code.** Branch on `Intrinsic.targetOperatingSystem()`, the target or a package parameter with an `if`, or with `Plan.when(condition, transform)`, where `transform` is a plain `fn(Plan) -> Plan`.
- **Paths are deferred.** `sourcePath("native/twice.c")` is a file of the package, relative to its directory. `suppliedPath(parameter)` is a path a consumer supplied. `Plan.archivePath(name, path)` is a file in a pinned `[native.archive]`. A step's `result(name)` is a file a step writes.

A `build.silk` without a valid `PLAN` stops every build that reaches the package:

```
silk: /home/you/vec/build.silk: build.silk computes no plan: its `PLAN` cannot be evaluated
[x86_64-unknown-linux-gnu]
/home/you/vec/build.silk:1:1: error[SEM0006] A present value name with no matching local declaration
```

### Plan steps

| Step | Adds |
| --- | --- |
| `Plan.module(name, path)` | The file at `path`, usually a step's `result`, as module `name` of the package. One segment, such as `generated_tables`; a module the package's own files define is refused |
| `compileC(path)`, `compileCpp`, `compileObjectiveC`, `compileObjectiveCpp` | One native source file |
| `compileNative(language, path, flags, include)` | One source file with its own flags and include directories; `language` is `c`, `cpp`, `objc` or `objcpp` |
| `compileSources(language, directory, pattern, flags, include)` | Every file in `directory` matching `pattern`, such as `"*.c"` |
| `cFlag(flag)`, `includePath(path)` | A flag or include directory for every native file of the package |
| `linkLibrary(name, Library.dynamicSearch())` | A system library, found by the linker. `Library.staticSearch()` asks for its static form. Add `.weak()` to let the program start without it, or `.needed()` to keep it linked when no symbol refers to it |
| `linkFramework(name, Framework.make())` | A macOS framework, also with `.weak()` or `.needed()` |
| `linkArchive(path)`, `linkObject(path)` | A prebuilt archive or object |
| `searchPath(path)`, `frameworkSearchPath(path)` | A directory the linker searches |
| `rpath(text)` | A runtime library search path, such as `"@executable_path/../lib"` or `"$ORIGIN"` |
| `linkerScript(path)`, `functionOrder(path)` | A linker script, or a symbol order file |
| `linkDependency(alias)` | The plan of a dependency this package declares, in every artifact that links this package, even when nothing imports the dependency |

Flags are limited to defines (`-D`, `-U`), warnings (`-W`, `-w`, `-pedantic`), a language standard (`-std=`), optimization (`-O`), debug information (`-g`) and code generation (`-f`, `-m`). A flag that loads code, reads other files or changes tools is refused:

```
silk: invalid native link input: sources take defines (-D, -U), warnings (-W, -w, -pedantic), a language standard (-std=), optimization (-O), debug information (-g) and code generation flags (-f, -m), and never a flag that loads code, reads other files or changes tools
```

A library with a directory of C files and a header directory, which links `libm` only on Linux:

```silk
import silk.build.plan { Library, Plan }
import silk.build.step { sourcePath }

static fn linkMath(plan: Plan) -> Plan {
  return plan |> Plan.linkLibrary("m", Library.dynamicSearch())
}

pub const PLAN: Plan = Plan.empty()
  |> Plan.compileSources(
    "c",
    sourcePath("native"),
    "*.c",
    &["-DSCALE_EXTRA=2"],
    &[sourcePath("include")],
  )
  |> Plan.when(Intrinsic.targetOperatingSystem() == "linux", linkMath)
```

### Writing files

`WriteFiles.empty() |> WriteFiles.literal(name, text)` writes a file from text the plan computes, such as the `limits.silk` module above. `.result(name)` is its path, for `Plan.module` or any other step. Nothing runs: the file is written from the static value.

## Tool steps

A tool step runs a program of the package while it builds, for a job only a real program can do. `Run.command(path)` names the program, a path below the package directory, and the rest declares what it gets:

| Static `Run` call | Does |
| --- | --- |
| `Run.command(path)` | The package's program at `path`. `Run.executable(deferred)` takes a deferred path instead |
| `arg(text)` | One text argument |
| `input(path)` | A file argument, readable in the sandbox and part of the key |
| `output(name)` | A file argument in the step's output directory, which the program must write |
| `reads(path)`, `readsTree(path)` | A file or directory the program reads without an argument |
| `result(name)` | The path of an output, for `Plan.module` or another step |

How a step runs:

- In its own output directory below `build/steps/`, which is its working directory, with the arguments in the order declared. Paths are absolute, so a script uses `$1` instead of looking for the package.
- With no environment of yours.
- It must exit 0 and write every declared output.
- It runs again only when its program, arguments or inputs change. An unchanged build skips it.

A step that fails stops the build and shows what it printed:

```
Compiling tables (x86_64-unknown-linux-gnu, dev)
silk: /home/you/tables/build.silk: build.silk computes no plan: build process failed with status 4: no network

Failed tables in 0.21s
```

A step that exits 0 without writing a declared output fails with `the process did not write its declared output colors.silk`, naming the file.

### The sandbox

| Host | Sandbox | The step can |
| --- | --- | --- |
| Linux 6.7 or newer | Landlock | Read and run files below `/usr`, `/bin`, `/lib`, `/lib64`, `/etc`, `/dev` and `/proc`, its program and its declared inputs. Write only its output directory. No network |
| macOS | `sandbox-exec` with a profile | Run programs, read the system directories, its program and its inputs, read and write its output directory. No network |
| Anything else | none | Nothing: tool steps are refused |

On a host with no sandbox, the build refuses the step and names the way out:

```
silk: /home/you/tables/build.silk: build.silk computes no plan: package tools require a supported operating-system sandbox; run silk build --unsandboxed-tools to authorize this invocation
```

`--unsandboxed-tools` applies to the one command you type it on. No file can grant it, and the language server never passes it. Set `SILK_NO_TOOL_SANDBOX` to make a host behave as one without a sandbox.

### Tool steps of dependencies

The root package's tool steps always run. A dependency's run only when its entry in the root manifest says `tools = true`, so adding a dependency never starts a program you did not agree to:

```
silk: /home/you/greeter/build.silk: build.silk computes no plan: this dependency runs a package tool without permission; add `tools = true` to its entry under [dependencies] in the root package's silk.toml
```

```toml
[dependencies]
greeter = { path = "../greeter", tools = true }
```

## Plan parameters and supplied paths

A `build.silk` can declare `pub param` values and use them in the plan, and a consumer binds them with `Package.set("build.silk", name, value)`. A plan reaches outside its package only through a path parameter that the consumer supplies:

```silk
import silk.build.plan { Plan }
import silk.build.step { suppliedPath }

pub param input: string

static fn answer(plan: Plan) -> Plan {
  return plan.module("answer", suppliedPath(input))
}

pub const PLAN: Plan = Plan.empty() |> Plan.when(true, answer)
```

```silk
let settings = run Package.make()
  |> Package.supplyPath("build.silk", "input", run Deferred<Path>.external("/opt/sdk/answer.silk"))
let app = run base.package("generated", move settings)
```

A parameter without a default must be bound, or resolving the compilation fails. See **Package parameters** in the reference.

## See also

Tasks and build graphs, Build steps and deferred values, Build outputs and native linking, Dependencies; **Static evaluation** and **Package parameters** in the reference; `silk.build.plan`, `silk.build.run` and `silk.build.source` in the standard library reference.
