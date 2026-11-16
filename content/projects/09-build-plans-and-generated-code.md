# Build plans and generated code

A root command builds a graph in ordinary Silk. A dependency contributes a static typed `build.silk` plan. Neither fetching nor adding a dependency evaluates its plan.

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

## Package parameters and plans

A package may declare `pub param` values in source or `build.silk`. The consumer binds them with `Package.set`. Values retain their declared type, including enums and nested options. A parameter without a default is required when resolving the compilation. `Package.supplyPath` authorizes an external path; ordinary plan paths remain inside the declaring package.

`build.silk` exports `pub const PLAN: Plan`. The compiler evaluates it statically, with standard-library imports and the package's parameters. The plan contributes generated modules, native sources and link inputs. Target conditions are ordinary static code.

```silk
import silk.build.plan { Plan }
import silk.build.step { sourcePath }

static fn plan() -> Plan {
  let mut result = Plan.empty()
  result = result |> Plan.compileC(sourcePath("native/codec.c"))
  result = result |> Plan.includePath(sourcePath("include"))
  if Intrinsic.targetOperatingSystem() == "linux" {
    result = result |> Plan.linkLibrary("m", "dynamic", false, false)
  }
  return result
}

pub const PLAN: Plan = plan()
```

Native archive pins and local overrides remain manifest data. `Plan.archivePath(name, path)` names a file in a pinned archive. Per-file flags and include directories belong to `Plan.compileNative`; `compileSources` selects a declared glob. Root compilations expose equivalent native operations.

A dependency's tool steps require `tools = true` on its dependency entry. Tools execute in a sandbox. On a host without confinement, only an explicit `--unsandboxed-tools` argument authorizes execution. The language server never supplies that argument.

## Generated values

`WriteFiles` writes declared text or bytes into a cached step output. `Run` launches a tool with declared inputs, output files and environment. `Compilation.moduleFile` accepts the resulting deferred path; `Compilation.module` accepts deferred source text. `Compilation.embed` exposes a generated file to the compilation.

The graph records dependencies through these values. A command never reads a deferred result while constructing the graph. `Build.write` runs prerequisites needed to resolve request values, writes the requests and leaves the root artifacts uncompiled.

For a generator whose output is committed, expose a maintenance command in the root's `tasks.silk`. The command runs only when explicitly invoked. There are no manifest hooks or generator tables.

## Sandboxing

A plan imports only the standard library and reads package files or explicitly supplied paths. It cannot execute custom user step types. Its tool commands run under the operating-system sandbox, with declared inputs and output directories. A dependency's entry must set `tools = true` before its tools can run.

If the host cannot provide confinement, an explicit `--unsandboxed-tools` argument authorizes execution for that invocation. No manifest can grant this permission. The language server never enables it and retains saved requests when it cannot refresh a plan.
