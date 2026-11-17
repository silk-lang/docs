# Libraries and exports

A library is a package that other packages depend on. Its `[package].exports` lists the modules they may import. A `library` is checked by the built-in `silk build`. A command chooses an artifact when a C program or another external consumer needs a compiled file.

## Exports

```toml
[package]
name = "text-utils"
version = "0.1.0"
silk-version = "0.1.0"
kind = "library"
exports = ["lib", "Ffi"]
```

A library kind's root module defaults to `src/lib.silk`.

- Each entry is a module name in import spelling, relative to the source root: `"lib"`, `"codec.Json"`.
- Every entry must name an existing file. The list is checked before anything compiles.
- An entry may name a directory whose `mod.silk` is a barrel module: `exports = ["codec"]` publishes `src/codec/mod.silk`. The modules it re-exports from stay internal unless listed. See **Modules and imports**.
- A module not listed is internal. Other packages that import it get MOD0003. With `exports = ["codec.Unit"]`, `app`'s import of `text_utils.lib` fails:

```
Checking app (x86_64-unknown-linux-gnu)
  load      145 modules, 1 in package         0.06s
  check     failed: 3 modules, 1 error        0.13s
[x86_64-unknown-linux-gnu]
src/main.silk:4:8: error[MOD0003] Module lib is not exported by package text-utils@0.1.0
Failed app in 0.20s
```

- The root module is not exported unless listed. `silk init --lib` lists it: `exports = ["lib"]`.
- Inside an exported module, other packages see only `pub` declarations (SEM0015). `pub` decides what a module shows; `exports` decides which modules a package shows.
- `check`, `build` and `test` cover every exported module, whether or not the root imports it.
- No `exports` key, or `exports = []`, means nothing is importable. The package still builds.

A bad list is a manifest error at the `exports` line, with exit status 2:

```
Invalid Silk project manifest /home/you/text-utils/silk.toml:6: exports of text-utils@0.1.0: Hiddn is not a module of the package
```

| Bad `exports` | Message after `exports of text-utils@0.1.0:` |
| --- | --- |
| `exports = "lib"` | `[package].exports must be an array of module names` |
| `exports = ["codec/Unit"]` | `` codec/Unit is not a module name such as `codec.Json` `` |
| `exports = ["Hiddn"]` | `Hiddn is not a module of the package` |
| `exports = ["codec.mod"]` | ``codec.mod names a `mod.silk` file; list its directory's path without `.mod` `` |
| `exports = ["codec"]` with both `codec.silk` and `codec/mod.silk` | ``codec names both a module file and its directory's `mod.silk`; remove or rename one of them`` |

## Conformances a library can define

A library may implement an interface for a type it declares, or an interface it declares for any type. It may also define a conformance whose first type argument is a type it declares, even for a type it does not own. That lets a library give `2.0 * vector` a meaning, with the scalar on the left:

```silk
import silk.core.ops { Multiply }

/// A vector on the plane.
pub struct Vector {
  pub x: f64,
  pub y: f64,
}

/// `factor * vector` scales the vector.
impl Multiply<Vector, Vector> for f64 {
  fn multiply(left: f64, right: Vector) -> Vector {
    return Vector { x: left * right.x, y: left * right.y }
  }
}
```

A package that depends on it writes `2.0 * Vector { x: 1.5, y: 3.0 }`. The rule is IMPL-004; see **Interfaces and impls** in the reference.

## Library artifacts

Packages that depend on a library compile its source with their own. The file matters only when something outside Silk links the library. When nothing does, `kind = "library"` makes no file at all: `silk build` checks the package.

| Compilation constructor | File |
| --- | --- |
| `staticArchive` | `lib<name>.a` |
| `object` | `<name>.o` |
| `loadableModule` | `lib<name>.so`, `lib<name>.dylib` or `<name>.dll` |
| `executable` | `<name>` or `<name>.exe` |

Artifact forms belong to the graph. The manifest has only `library` and `executable` kinds. Shared native libraries require dynamic linking and position-independent code. See **Tasks and build graphs** and **Build outputs and native linking**.

- A library has no runtime. Its roots are its `export "C"` functions and statics, plus what they reach. A library with no C exports builds an empty archive: the build's `codegen` row reads `0 functions`.
- The archive holds the compiled Silk code, not libc. Link it with a C toolchain that supplies libc.
- Files land in the output directory like any build. See **Build outputs and native linking**.

## Walkthrough: one library, two users

Two packages side by side:

```
text-utils/   library: silk init --lib text-utils
app/          program: silk init app
```

`text-utils/src/lib.silk` is the Silk API:

```silk
/// The number of bytes in `text` that are ASCII spaces.
pub fn countSpaces(text: &[u8]) -> i32 {
  let mut count = 0
  let mut at: usize = 0
  while at < text.length {
    if text[at] == 32 {
      count = count + 1
    }
    at = at + 1
  }
  return count
}
```

`text-utils/src/Ffi.silk` is the C API:

```silk
/// C entry point: 1 when `byte` is an ASCII space, else 0.
export "C" fn tu_is_space(byte: u8) -> i32 {
  if byte == 32 {
    return 1
  }
  return 0
}
```

Keep `exports = ["lib", "Ffi"]` and `kind = "library"` in the manifest. Add `src/tasks.silk` to build an archive for the C consumer:

```silk
import silk.build.graph { Compilation, BuildError }
import silk.cli.command { Command, CommandLine }
import silk.cli.task { Task, TaskSet }
import silk.mem.allocator { Allocator }
import silk.system.filesystem { FileSystem }
import silk.system.host_input { HostInput }

union Tasks { Archive }
impl CommandLine for Tasks {
  static fn command() -> Command<Tasks> {
    return Command<Tasks>.make("text-utils", "Build the C archive")
  }
}
impl TaskSet for Tasks {
  effect fn perform(self: Self) -> ()
    ! BuildError
    ? &mut Allocator | &mut FileSystem | &mut HostInput {
    let archive = run Compilation.staticArchive("text-utils", "src/Ffi.silk")
    drop run archive.build()
  }
}
pub effect fn main() -> i32 ? &mut HostInput {
  return run Task.main<Tasks>()
}
```

```sh
cd text-utils
silk task archive
```

The archive is written to `build/<host-target>/dev/libtext-utils.a`.

The symbol map next to the archive shows the C name and the Silk declaration it comes from:

```
tu_is_space	export	text-utils@0.1.0:Ffi.silk::tu_is_space
silk_860e739b2f655601d296a3b9378a3784	function	text-utils@0.1.0:Ffi.silk::tu_is_space
```

**First user: a Silk program.** In `app`, run `silk add ../text-utils` and import `text_utils.lib { countSpaces }`. The program and its output are on the Dependencies page. `app` compiles `lib.silk` from source; it never reads the archive.

**Second user: a C program.** `cdemo/main.c`, in a folder next to the two packages:

```c
#include <stdio.h>

int tu_is_space(unsigned char byte);

int main(void) {
  const char *text = "one two three";
  int spaces = 0;
  for (const char *at = text; *at; at++) {
    spaces += tu_is_space((unsigned char)*at);
  }
  printf("%d spaces\n", spaces);
  return 0;
}
```

```sh
clang main.c ../text-utils/build/x86_64-unknown-linux-gnu/dev/libtext-utils.a -o demo
./demo
```

```
2 spaces
```

See **Unsafe code and C interop** in the reference for `export "C"` rules.

## See also

The manifest, Dependencies, Modules and imports, Build outputs and native linking; chapter 12 of the book.
