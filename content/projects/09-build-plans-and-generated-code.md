# Build plans and generated code

Most packages need nothing but their `.silk` files and `silk.toml`. When a package needs more, such as a table built from a data file, a C shim, or a module written by a code generator, Silk offers a few tools. Each one does more than the last, so pick the first that fits:

| Need | Use |
| --- | --- |
| Link a library, compile C files, or use a prebuilt SDK | `[native]` keys in the manifest. See **Build outputs and native linking** |
| Embed a file of the package, or parse it while compiling | `silk.build.source` |
| Run a generator yourself and commit what it writes | `[[generate]]` and `silk generate` |
| Compute modules, sources and libraries from the package's files on every build | `build.silk` |
| Run a real program on every build, such as a code generator you cannot write in Silk | A tool step in `build.silk` |

None of them runs arbitrary code with your user's rights. There is no build script in the Cargo sense: a plan runs inside the compiler, and a tool step runs in an operating-system sandbox.

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

## Committed generators: silk generate

A generator is a program you run yourself, such as a script that turns the Unicode data files into tables. Its output is committed, so a build never runs it. Declare each one in the manifest:

```toml
[[generate]]
run = ["scripts/colors", "colors.txt"]
outputs = ["src/colors.silk"]
```

- `run` is the program, then its arguments. A program spelled with a `/` is a path below the manifest's directory; a bare name is searched on `PATH`.
- `outputs` lists the files it writes, below the manifest's directory. A `*` in the last segment matches any run of bytes, as in `src/generated_*.silk`.
- A workspace manifest can declare entries too.

`silk generate` runs the entries in order, in the manifest's directory, with your environment plus `SILK_GENERATE=1`, and names each output that changed:

```sh
silk generate
```

```
Created src/colors.silk
Ran 1 generator: 1 changed, 0 unchanged
```

An output written with the same bytes keeps its file, modification time included, so a rerun that changes nothing invalidates no build cache:

```
Ran 1 generator: 0 changed, 1 unchanged
```

`silk generate --check` runs the generators but leaves the tree as it was, and exits 1 when a committed output is out of date. Run it in CI:

```
silk: src/colors.silk is stale
silk: generated output is stale; run `silk generate` and commit the result
```

A generator that fails, or that does not write an output declared without a `*`, leaves every output as it was, and `silk generate` exits 1. A manifest it cannot use exits 2.

## Build plans: build.silk

A `build.silk` beside `silk.toml` computes, on every build, what the manifest cannot say. It declares `pub const PLAN: string`, built with `silk.build.plan` from `Plan.empty()`:

```silk
import silk.build.plan { Plan }
import silk.build.source { Source }
import silk.core.static_text { StaticText }

static fn plan() -> string<'static> {
  let mut plan = Plan.empty()
  plan = Plan.module(plan, "limits", StaticText.concat("pub const LIMIT: i32 = ", Source.text("limit.txt")))
  plan = Plan.compileC(plan, "native/twice.c")
  return plan
}

pub const PLAN: string = plan()
```

The package's own code then imports the generated module like any other:

```silk
import limits { LIMIT }

unsafe extern "C" fn twice(value: i32) -> i32

pub fn main() -> i32 {
  return unsafe twice(LIMIT / 2) - 42
}
```

With `42` in `limit.txt`, `silk run` exits 0.

The plan is a constant, computed by static evaluation. It runs no process, reaches no network and reads only the package's own files. Every build and check evaluates each package's `build.silk` first, on its own: it can import only the standard library, not the package it builds. Its steps then join the package as if written there:

| Step | Effect |
| --- | --- |
| `Plan.module(plan, name, source)` | Module `name` of the package, as if the file `<name>.silk` were in its source root |
| `Plan.compileC`, `compileObjectiveC`, `compileCpp` | A `[native].sources` entry `{ c = path }` (or `objc`, `cpp`) |
| `Plan.linkLibrary(plan, name)` | A `[native].link` entry `{ library = name, mode = "dynamic" }` |
| `Plan.linkFramework`, `linkArchive`, `linkObject` | A `[native].link` entry `{ framework = ... }`, `{ static-archive = ... }`, `{ object = ... }` |
| `Plan.tool` and the `tool...` steps | A tool step; see below |

A dependency's plan reaches its dependents the way its manifest entries do. A module name must be one path segment, such as `generated_tables`, and a module the package's own files also define is refused.

A plan that goes wrong refuses the build with exit status 1, naming `build.silk`, after any diagnostics of its evaluation. A `build.silk` with no `PLAN`:

```
Checking tables (x86_64-unknown-linux-gnu)
  load      failed: 1 error                   0.06s
silk: /home/you/tables/build.silk: build.silk computes no plan: its `PLAN` cannot be evaluated
[x86_64-unknown-linux-gnu]
build.silk:1:1: error[SEM0006] A present value name with no matching local declaration
Failed tables in 0.07s
```

The full API is on the `silk.build.plan` page of the Std lib API reference.

## Tool steps

A tool step runs a program of the package while it builds, for a job only a real program can do. It declares the program, its arguments, the files it reads and the files it writes:

```silk
import silk.build.plan { Plan }

static fn plan() -> string<'static> {
  let mut plan = Plan.empty()
  plan = Plan.tool(plan, "colors", "tools/gen.sh")
  plan = Plan.toolInput(plan, "colors.txt")
  plan = Plan.toolOutput(plan, "colors.silk")
  plan = Plan.toolModule(plan, "colors", "colors", "colors.silk")
  return plan
}

pub const PLAN: string = plan()
```

```sh
#!/bin/sh
count=$(wc -l < "$SILK_PACKAGE_DIR/colors.txt")
echo "pub const COLOR_COUNT: i32 = $count" > colors.silk
```

`Plan.toolModule` serves the output `colors.silk` as the package's module `colors`, so `import colors { COLOR_COUNT }` works. `toolArgument`, `toolInput` and `toolOutput` apply to the last `Plan.tool` before them.

How a step runs:

- Before the package is analyzed, in an empty output directory, `<output-dir>/tools/<package>/<step>`, which is its working directory.
- With `HOME` and `TMPDIR` inside that directory, `SILK_TOOL=1`, `SILK_PACKAGE_DIR` naming the package directory, and `PATH=/usr/local/bin:/usr/bin:/bin`. Nothing else from your environment.
- It must exit 0 and write every declared output.
- It runs again only when its program, arguments, inputs or outputs change. An unchanged build skips it.

A step that fails refuses the build and shows what it printed:

```
Compiling tables (x86_64-unknown-linux-gnu, debug)
  load      failed: 1 error                   0.10s
silk: /home/you/tables/build.silk: build.silk computes no plan: its tool step `colors` failed with status 4:
no network

Failed tables in 0.10s
```

A step that exits 0 without writing a declared output fails with `did not write its declared output colors.silk`.

### The sandbox

A tool step runs in an operating-system sandbox:

| Host | Sandbox | The step can |
| --- | --- | --- |
| Linux 6.7 or newer | Landlock | Read and run files below `/usr`, `/bin`, `/lib`, `/lib64`, `/etc`, `/dev` and `/proc`, its program and its declared inputs. Write only its output directory. No TCP; where the kernel allows unprivileged user namespaces, no network interface but loopback |
| macOS | `sandbox-exec` with a profile | Run programs, read the system directories, its program and its inputs, read and write its output directory. No network |
| Anything else | none | Nothing: tool steps are refused |

A write outside the output directory fails inside the step, so the build reports it:

```
silk: /home/you/tables/build.silk: build.silk computes no plan: its tool step `colors` failed with status 2:
/home/you/tables/tools/gen.sh: 5: cannot create /home/you/tables/escape.txt: Permission denied
```

On a host with no sandbox, the build refuses the step:

```
silk: /home/you/palette/build.silk: build.silk computes no plan: this host has no sandbox for build tools (Linux 6.7 with Landlock, or macOS); set [build].unsandboxed-tools = true in the root manifest to run them without one
```

With `unsandboxed-tools = true` in the root manifest's `[build]`, the step runs, and each build that runs one warns:

```
silk: warning: running build tool `colors` of palette without a sandbox ([build].unsandboxed-tools)
```

Set `SILK_NO_TOOL_SANDBOX` to make a host behave as one without a sandbox.

### Tool steps of dependencies

The root package's steps always run. A dependency's steps run only when the root manifest names the dependency, so adding a dependency never starts a program you did not agree to:

```
silk: /home/you/palette/build.silk: build.silk computes no plan: its tool steps run only when the root manifest lists "palette" in [build].tools
```

```toml
[dependencies]
palette = { path = "../palette" }

[build]
tools = ["palette"]
```

## See also

The manifest, Build outputs and native linking, Dependencies; **Static evaluation** and **Compilation profiles** in the reference; `silk.build.plan` and `silk.build.source` in the Std lib API reference.
