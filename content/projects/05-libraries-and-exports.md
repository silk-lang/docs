# Libraries and exports

A library is a package that other packages depend on. Its `[package].exports` lists the modules they may import. Its `[build].artifact` says what `silk build` makes on its own, for use outside Silk.

## Exports

```toml
[package]
name = "text-utils"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/lib.silk"
source-root = "src"
exports = ["lib", "Ffi"]

[build]
artifact = "static-library"
```

- Each entry is a module name in import spelling, relative to `source-root`: `"lib"`, `"codec.Json"`.
- Every entry must name an existing file. The list is checked before anything compiles.
- A module not listed is internal. Other packages that import it get MOD0003. With `exports = ["codec.Unit"]`, `app`'s import of `text_utils.lib` fails:

```
Checking app (x86_64-unknown-linux-gnu)
  load     54 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
src/main.silk:4:8: error[MOD0003] Module lib is not exported by package text-utils@0.1.0
Failed app in 0.16s
```

- The root module is not exported unless listed. `silk init --lib` lists it: `exports = ["lib"]`.
- Inside an exported module, other packages see only `pub` declarations (SEM0015). `pub` decides what a module shows; `exports` decides which modules a package shows.
- `check`, `build` and `test` cover every exported module, whether or not the root imports it.
- No `exports` key, or `exports = []`, means nothing is importable. The package still builds.

| Bad `exports` | Message |
| --- | --- |
| `exports = "lib"` | `silk: invalid exports of text-utils@0.1.0: [package].exports must be an array of module names` |
| `exports = ["codec/Unit"]` | `` silk: invalid exports of text-utils@0.1.0: codec/Unit is not a module name such as `codec.Json`  `` |
| `exports = ["Hiddn"]` | `silk: invalid exports of text-utils@0.1.0: Hiddn is not a module of the package` |

## Library artifacts

Packages that depend on a library compile its source with their own. The artifact matters only when something outside Silk links the library.

| `[build].artifact` | File | Status |
| --- | --- | --- |
| `"static-library"` | `lib<name>.a` | Works. An archive of one object. |
| `"object"` | `<name>.o` | Works. One relocatable object. |
| `"shared-library"` | `lib<name>.so`, or `lib<name>.dylib` on macOS | Not built yet: `SILK_GAP artifact-form: the shared-library form is not native yet`, exit 2. |
| `"executable"` (default) | `<name>` | A program. |

Profiles name the same forms `static-archive`, `loadable-module`, `object` and `executable`. A profile's `artifact` must name the same form as `[build].artifact`, or the manifest is refused. See **Targets and profiles**.

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

With `exports = ["lib", "Ffi"]`, as above, build the library on its own:

```sh
cd text-utils
silk build
```

```
Compiling text-utils (x86_64-unknown-linux-gnu, debug)
  load     41 modules, 2 in package          0.05s
  check    2 modules                         0.00s
  codegen  2 functions                       0.00s
  borrow   2 bodies                          0.00s
  link     clang                             0.04s
Finished build/llvm/x86_64-unknown-linux-gnu/debug/libtext-utils.a in 0.09s
```

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
clang main.c ../text-utils/build/llvm/x86_64-unknown-linux-gnu/debug/libtext-utils.a -o demo
./demo
```

```
2 spaces
```

See **Unsafe code and C interop** in the reference for `export "C"` rules.

## See also

The manifest, Dependencies, Modules and imports, Build outputs and native linking; chapter 12 of the book.
