# Build steps and deferred values

A graph holds steps as well as compilations. A step makes files or a value from declared inputs: a program to run, files to write, a compilation, or a step type of your own. Each step says what its result depends on, and the runner skips it when none of that changed. This page is about steps in a root command's graph. A package's `build.silk` uses the same `Run` and `WriteFiles` in their static form; see **Build plans and generated code**.

## Deferred values

A step's result does not exist while the command builds the graph. A `Deferred<T>` names it: a value that only the running graph resolves. Every setting and input of a compilation or a step takes one, so anything can come from a step.

| Make one with | Names |
| --- | --- |
| `Deferred<T>.value(value)` | A value you already have, such as `Deferred<Optimize>.value(Optimize.Speed)` |
| `Deferred<Path>.source(path)` | A file or directory of the package, relative to its directory. Its contents are part of every key that reads it |
| `Deferred<Path>.external(path)` | An absolute path outside the package, such as an SDK |
| `step.output(name)` | A file a registered step writes |
| `step.value<T>()` | The value a registered step answers |
| `run.captureText()`, `run.captureLines()` | What a `Run` prints |
| `compilation.artifact()` | A compilation's artifact. `emittedHeader()` and `emittedImportLibrary()` name its C header and Windows import library |
| `Package.path(alias, path)` | A file a dependency lists in its `include` |
| `deferred.map(transform)` | `transform` applied once the value is known. It must be a plain function that captures nothing |

There is no way to read a deferred value while building the graph. That is what lets the runner order steps by what they read and run independent ones in parallel: passing `compilation.artifact()` to another compilation is what makes the first one run first.

## Running a program: Run

`Run` describes a process with declared inputs and outputs. In a root command it runs with your rights; add `confined()` to run it in the tool sandbox.

| Call | Does |
| --- | --- |
| `Run.program(name)` | A program by path (`"scripts/colors.sh"`) or on `PATH` (`"git"`). Its contents are part of the key |
| `Run.artifact(deferred)` | A program another compilation builds |
| `argument(deferred)` | One text argument |
| `inputFile(deferred)` | A file argument whose contents are part of the key |
| `outputFile(name)` | A file argument below the step's output directory, which the program must write |
| `keyFile(deferred)`, `keyTree(deferred)` | A file or directory the program reads without being told |
| `keyEnvironment(name)` | Forwards one environment variable and keys its value. Nothing else of your environment is passed |
| `always()` | Runs on every build, and so do the steps that read its result |
| `confined()` | Runs in the operating-system sandbox: its inputs readable, its output directory writable, no network |
| `register()` | Adds it to the graph and answers a handle, for `output(name)` |
| `captureText()`, `captureLines()` | Adds it to the graph and answers what it prints, as text or as lines |

This command generates two modules. A script turns `colors.txt` into `colors.silk`, and a second script prints the module `version` with the commit the build comes from:

```silk
// The program, with two generated modules.
effect fn stamped(options: &Options) -> Compilation
  ! BuildError
  ? &mut Allocator | &mut FileSystem | &mut HostInput {
  // Runs a script on every build; what it prints becomes the module `version`.
  let version = run Run.program("scripts/version.sh")
  let fresh = run version.always()
  let commit = run fresh.captureText()

  // Runs the project's own script, which writes a module from colors.txt.
  let script = run Run.program("scripts/colors.sh")
  let reading = run script.inputFile(run Deferred<Path>.source("colors.txt"))
  let writing = run reading.outputFile("colors.silk")
  let colors = run writing.register()
  let base = run Compilation.fromPackage(options)
  let withColors = run base.moduleFile("colors", run colors.output("colors.silk"))
  return run withColors.module("version", move commit)
}
```

```sh
#!/bin/sh
# scripts/colors.sh <input> <output>
count=$(wc -l < "$1" | tr -d ' ')
echo "pub const COLOR_COUNT: i32 = $count" > "$2"
```

```sh
#!/bin/sh
# scripts/version.sh
echo "pub const COMMIT: string = \"$(git rev-parse --short HEAD)\""
```

`src/main.silk` imports them as `import colors { COLOR_COUNT }` and `import version { COMMIT }`, and prints `built from 11f7a27, 3 colors`. Adding a line to `colors.txt` reruns only `colors.sh`. Because the version script is `always()`, the program recompiles on every build; key it on what it reads instead when that matters.

`compilation.module(name, text)` adds deferred source text as a module of the root package. `compilation.moduleFile(name, path)` adds a file. A module name is one segment, such as `colors`, and a module the package's own files also define is refused.

## Running a program you build

`Run.artifact` takes another compilation's artifact, so a generator written in Silk is compiled for the host and run as a step, as in Zig's `addRunArtifact`. Here `gen/main.silk`, outside the source root, prints a table that becomes the module `squares`:

```silk
Tasks.Build { options } => {
  // A program of this package, compiled for the host and run as a step.
  let generator = run Compilation.executable("gen", "gen/main.silk")
  let table = run (Run.artifact(run generator.artifact())).captureText()

  // A file written from a value.
  let files = run WriteFiles.make()
    |> WriteFiles.text("banner.silk", "pub const TEXT: string = \"squares\"")
  let banner = run files.register()
  let base = run Compilation.fromPackage(&options)
  let withTable = run base.module("squares", move table)
  let app = run withTable.moduleFile("banner", run banner.output("banner.silk"))
  let graph = run Build.make()
  drop run (run graph.add(move app)).compile()
}
```

```
Compiling squares tasks (x86_64-unknown-linux-gnu, dev)
Finished build/steps/tasks/x86_64-unknown-linux-gnu/tasks in 4.83s
Compiling gen (x86_64-unknown-linux-gnu, dev)
Compiling squares (x86_64-unknown-linux-gnu, dev)
Finished build/x86_64-unknown-linux-gnu/dev/squares in 2.39s
```

The generator is not added to the graph itself: reading its artifact is what puts it there. The second build changes nothing and finishes in 0.04 s.

## Writing files: WriteFiles

`WriteFiles.make()` starts a set of files. `text(name, content)` adds a file whose content you have; `value(name, deferred)` one whose content comes from a step. `register()` adds the set to the graph, and `output(name)` names one of its files, as `banner.silk` above.

## Embedding a file

`compilation.embed(name, path)` adds a module `name` whose `data` constant holds the bytes of a file, another step's output or another compilation's artifact. `build.embed(name, path)` does it for every compilation of a graph. The program imports it as `import payload { data }`. For a file of the package itself, `Source.read` is simpler; see **Build plans and generated code**.

```silk
let asset = run Package.path("ui_assets", "fonts/inter.ttf")
let app = run base.embed("font", move asset)
```

## A step of your own

A type that implements `Step` is a step. `key` declares everything its result depends on, and `make` produces the result, reading only what the key declared:

```silk
pub interface Step {
  effect fn key(self: &Self, key: &mut Key) -> () ! StepFailure ? &mut Allocator;
  effect fn make(self: &Self, make: &mut Make) -> () ! StepFailure ? ...;
}
```

This graph has a step that writes a stamp file, a compilation that embeds it, and a step that reads the finished artifact and writes whether it is big:

```silk
// Runs in the task program and feeds the compilation, which the compiler runs.
struct Stamp {}

impl Step for Stamp {
  effect fn key(self: &Self, key: &mut Key) -> ()
    ! StepFailure
    ? &mut Allocator {
    return run key.text("stamp-v1")
  }

  effect fn make(self: &Self, make: &mut Make) -> ()
    ! StepFailure
    ? &mut Allocator {
    return run make.write("stamp.bin", b"stamped")
  }
}

// Runs in the task program after the compiler built the artifact it reads.
struct Size {
  artifact: Deferred<Path>,
}

impl Step for Size {
  effect fn key(self: &Self, key: &mut Key) -> ()
    ! StepFailure
    ? &mut Allocator {
    return run key.file(&self.artifact)
  }

  effect fn make(self: &Self, make: &mut Make) -> ()
    ! StepFailure
    ? &mut Allocator {
    let bytes = run make.read(&self.artifact)
    if bytes.length() > 1000 {
      return run make.write("size.txt", b"big\n")
    }
    return run make.write("size.txt", b"small\n")
  }
}
```

```silk
Tasks.Build { options } => {
  let stamp = run Step.register(Stamp {})
  let base = run Compilation.fromPackage(&options)
  let compilation = run base.embed("stamp", run stamp.output("stamp.bin"))
  let size = run Step.register(Size { artifact: run compilation.artifact() })
  let build = run Build.make()
  let graph = run build.add(move compilation)
  let whole = run graph.addStep(move size, "size.txt")
  drop run whole.compile()
}
```

`Step.register` adds a step and answers its handle. `addStep(handle, output)` makes it a root of the build, with one output as its artifact.

What a key can declare:

| `Key` call | Part of the key |
| --- | --- |
| `text(value)`, `bytes(value)` | A value. Change it, such as `"stamp-v2"`, to invalidate the step |
| `file(deferred)`, `tree(deferred)` | A file's contents, or every file below a directory |
| `packageTree(deferred)` | A directory of the package, as `silk pack` would see it |
| `value(deferred)` | A deferred value, and the step that makes it |
| `files(deferred)`, `trees(deferred)` | A deferred list of paths |
| `environment(name)` | An environment variable |
| `toolchain(compiler)` | A compiler's contents |
| `always()` | Nothing: the step runs every time |

What `make` can do, through `Make`:

| `Make` call | Does |
| --- | --- |
| `read(deferred)`, `readWithin(tree, name)`, `glob(tree, pattern)` | Read a declared file, a file in a declared directory, or list one |
| `get(deferred)` | Resolve a declared deferred value |
| `write(name, bytes)`, `value(value)`, `valueFile(name, value)` | Write an output file, or answer a value |
| `output(name)`, `readOutput(name)` | The path of an output, or what was written to it |
| `exec(...)`, `execConfined(...)` | Run a program, plainly or in the sandbox |

A read of anything the key did not declare fails the step, so a key cannot silently miss an input.

## Caching and where steps run

Each step's outputs live in `build/steps/<key>/`, named by the digest of its key. A step whose key is unchanged and whose outputs are complete is not run again; the second build of every example on this page is a few hundredths of a second. `silk clean` removes `build/` and the cache with it.

The compiler runs every standard step itself (compilations, `Run`, `WriteFiles`, embedded files and `Package.path`), with `silkc graph`. Only a step type of your own runs in the tasks program. A graph that mixes them alternates: the tasks program runs `Stamp`, the compiler runs the compilation, then the tasks program runs `Size`. A tasks program with no step of its own carries no runner and builds in a few seconds.

Independent steps run in parallel on fibers. `build.parallelism(workers)` caps the workers. `build.memoryBudget(bytes)` caps the sum of the running steps' estimates; a compilation is estimated at 3 GiB unless its `memoryBudget` says otherwise, and a step larger than the budget runs alone.

## Sharing step types

A library can export step types and graph helpers as ordinary modules. The root's `tasks.silk` imports and runs them. A dependency never runs a step by itself: its own build needs go in its `build.silk`.

## See also

Tasks and build graphs, Build plans and generated code; `silk.build.step`, `silk.build.run` and `silk.build.write_files` in the standard library reference.
