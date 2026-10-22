Build choices of the current compilation, such as safety, threading, and artifact kind, for use
in static evaluation.

## When to use
Use [`Compilation`](#Compilation) to select code for the build request, for example with `static if`. Use
[`Compilation.safety`](#Compilation.impl.safety) to select checked or unchecked library code, and
[`Compilation.threading`](#Compilation.impl.threading) to select single-thread or multi-thread code. Use `silk.target` for
facts about the machine, such as the architecture and the pointer width.

## Details
Each value comes from the compilation profile, which is fixed before specialization. The values
describe logical requests. They do not find SDKs, load runtime packages, or change the ownership
rules. Each operation in this module is `static`, so the selection adds no runtime cost.

## Examples
### Select code for the safety policy
```silk
import silk.compilation { Compilation, Safety }

fn boundsChecked() -> bool {
  static if Compilation.safety() == Safety.Checked {
    return true
  }
  return false
}

pub fn main() -> i32 {
  let checked = boundsChecked()
  return 0
}
```

Import as `Compilation` with `import silk.compilation { Compilation }`.

Public declarations: 13.

::Anchor{id="Libc"}

## `Libc`

```silk
pub enum Libc
```

The C library that the build requests.

### Details

Read the selected value with [`Compilation.libc`](#Compilation.impl.libc).

::Anchor{id="Libc.None"}

### `None`

```silk
None
```

No C library. The program uses only Silk code and direct system calls.

::Anchor{id="Libc.System"}

### `System`

```silk
System
```

The C library of the platform, such as the libc of macOS.

::Anchor{id="Libc.Gnu"}

### `Gnu`

```silk
Gnu
```

The GNU C library (glibc).

::Anchor{id="Artifact"}

## `Artifact`

```silk
pub enum Artifact
```

The kind of output file that the build requests.

### Details

Read the selected value with [`Compilation.artifact`](#Compilation.impl.artifact).

::Anchor{id="Artifact.Executable"}

### `Executable`

```silk
Executable
```

A program that the operating system can start.

::Anchor{id="Artifact.LoadableModule"}

### `LoadableModule`

```silk
LoadableModule
```

A module that a host program loads at runtime, such as a shared library or a WebAssembly
module.

::Anchor{id="Artifact.StaticArchive"}

### `StaticArchive`

```silk
StaticArchive
```

A static library archive for a later link step.

::Anchor{id="Artifact.Object"}

### `Object`

```silk
Object
```

One relocatable object file.

::Anchor{id="Link"}

## `Link`

```silk
pub enum Link
```

The link mode that the build requests.

### Details

Read the selected value with [`Compilation.link`](#Compilation.impl.link).

::Anchor{id="Link.Static"}

### `Static`

```silk
Static
```

Static linking. The artifact includes its dependencies.

::Anchor{id="Link.Dynamic"}

### `Dynamic`

```silk
Dynamic
```

Dynamic linking. The artifact loads shared libraries at startup.

::Anchor{id="CodeModel"}

## `CodeModel`

```silk
pub enum CodeModel
```

The code model that the build requests.

### Details

Read the selected value with [`Compilation.codeModel`](#Compilation.impl.codeModel).

::Anchor{id="CodeModel.Small"}

### `Small`

```silk
Small
```

The small code model. Code and static data must be in a limited address range.

::Anchor{id="CodeModel.Large"}

### `Large`

```silk
Large
```

The large code model. Code and static data can be at any address.

::Anchor{id="Relocation"}

## `Relocation`

```silk
pub enum Relocation
```

The relocation model that the build requests.

### Details

Read the selected value with [`Compilation.relocation`](#Compilation.impl.relocation).

::Anchor{id="Relocation.Static"}

### `Static`

```silk
Static
```

Code for a fixed load address.

::Anchor{id="Relocation.Pic"}

### `Pic`

```silk
Pic
```

Position-independent code, which can load at any address.

::Anchor{id="Optimization"}

## `Optimization`

```silk
pub enum Optimization
```

The optimization level that the build requests.

### Details

Read the selected value with [`Compilation.optimization`](#Compilation.impl.optimization).

::Anchor{id="Optimization.None"}

### `None`

```silk
None
```

No optimization.

::Anchor{id="Optimization.Speed"}

### `Speed`

```silk
Speed
```

Optimization for speed.

::Anchor{id="Safety"}

## `Safety`

```silk
pub enum Safety
```

The library safety policy that the build requests.

### Details

Read the selected value with [`Compilation.safety`](#Compilation.impl.safety).

::Anchor{id="Safety.Checked"}

### `Checked`

```silk
Checked
```

The library does its runtime checks.

::Anchor{id="Safety.Unchecked"}

### `Unchecked`

```silk
Unchecked
```

Library code can omit runtime checks. The caller is responsible for valid inputs.

::Anchor{id="Threading"}

## `Threading`

```silk
pub enum Threading
```

The library threading policy that the build requests.

### Details

Read the selected value with [`Compilation.threading`](#Compilation.impl.threading).

::Anchor{id="Threading.Single"}

### `Single`

```silk
Single
```

The program has one thread. The library can use code without synchronization.

::Anchor{id="Threading.Multi"}

### `Multi`

```silk
Multi
```

The program can have more than one thread. The library uses synchronized code.

::Anchor{id="Unwind"}

## `Unwind`

```silk
pub enum Unwind
```

The unwind mode that the build requests.

### Details

Read the selected value with [`Compilation.unwind`](#Compilation.impl.unwind).

::Anchor{id="Unwind.None"}

### `None`

```silk
None
```

No unwind tables.

::Anchor{id="Unwind.Native"}

### `Native`

```silk
Native
```

Unwind tables for the native platform.

::Anchor{id="Selection"}

## `Selection`

```silk
pub union Selection
```

An entry or runtime request: the platform default, none, or a named symbol or package.

### Details

[`Compilation.entry`](#Compilation.impl.entry) and [`Compilation.runtime`](#Compilation.impl.runtime) return this type. A name is a logical
identity, not a file path.

::Anchor{id="Selection.Default"}

### `Default`

```silk
Default
```

The default of the platform.

::Anchor{id="Selection.None"}

### `None`

```silk
None
```

No entry point or no runtime.

::Anchor{id="Selection.Named"}

### `Named`

```silk
Named
```

A named symbol or package.

::Anchor{id="Selection.Named.name"}

#### Field `name`

```silk
pub name: string<'static>
```

The logical name of the symbol or package.

::Anchor{id="Sanitizer"}

## `Sanitizer`

```silk
pub enum Sanitizer
```

A sanitizer that a build can request.

### Details

Test a sanitizer with [`Compilation.hasSanitizer`](#Compilation.impl.hasSanitizer). A build can request more than one sanitizer.

::Anchor{id="Sanitizer.Address"}

### `Address`

```silk
Address
```

Address checks for instrumented memory operations.

::Anchor{id="Sanitizer.Thread"}

### `Thread`

```silk
Thread
```

Data-race checks for instrumented concurrent operations.

::Anchor{id="Sanitizer.Undefined"}

### `Undefined`

```silk
Undefined
```

Checks for instrumented undefined behavior.

::Anchor{id="debug"}

## `debug`

```silk
pub const debug: bool
```

`true` if the build requests debug information.

::Anchor{id="Compilation"}

## `Compilation`

```silk
pub struct Compilation
```

The owner type of the compilation queries. It has no fields and is never constructed.

### Details

Each operation is `static`. Use it in a `static if`, a `static fn`, or a `const` initializer.

::Anchor{id="Compilation.impl"}

## Implementation `Compilation`

```silk
impl Compilation
```

::Anchor{id="Compilation.impl.libc"}

### Associated function `libc`

```silk
pub static fn libc() -> Libc
```

Returns the C library that the build requests.

::Anchor{id="Compilation.impl.artifact"}

### Associated function `artifact`

```silk
pub static fn artifact() -> Artifact
```

Returns the kind of output file that the build requests.

::Anchor{id="Compilation.impl.link"}

### Associated function `link`

```silk
pub static fn link() -> Link
```

Returns the link mode that the build requests.

::Anchor{id="Compilation.impl.codeModel"}

### Associated function `codeModel`

```silk
pub static fn codeModel() -> CodeModel
```

Returns the code model that the build requests.

::Anchor{id="Compilation.impl.relocation"}

### Associated function `relocation`

```silk
pub static fn relocation() -> Relocation
```

Returns the relocation model that the build requests.

::Anchor{id="Compilation.impl.optimization"}

### Associated function `optimization`

```silk
pub static fn optimization() -> Optimization
```

Returns the optimization level that the build requests.

::Anchor{id="Compilation.impl.safety"}

### Associated function `safety`

```silk
pub static fn safety() -> Safety
```

Returns the library safety policy that the build requests.

#### When to use

Use `safety` to select between checked and unchecked library code, for example to omit bounds
checks in an unchecked build.

::Anchor{id="Compilation.impl.threading"}

### Associated function `threading`

```silk
pub static fn threading() -> Threading
```

Returns the library threading policy that the build requests.

#### When to use

Use `threading` to select between code with and without synchronization.

::Anchor{id="Compilation.impl.unwind"}

### Associated function `unwind`

```silk
pub static fn unwind() -> Unwind
```

Returns the unwind mode that the build requests.

::Anchor{id="Compilation.impl.entry"}

### Associated function `entry`

```silk
pub static fn entry() -> Selection
```

Returns the entry point request of the build.

#### Details

The result is a logical request. This function does not find a startup symbol.

::Anchor{id="Compilation.impl.runtime"}

### Associated function `runtime`

```silk
pub static fn runtime() -> Selection
```

Returns the runtime request of the build.

#### Details

The result is a logical request. This function does not load a runtime package.

::Anchor{id="Compilation.impl.hasSanitizer"}

### Associated function `hasSanitizer`

```silk
pub static fn hasSanitizer(value: Sanitizer) -> bool
```

Returns `true` if the build requests the sanitizer `value`.

Category: Core.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
