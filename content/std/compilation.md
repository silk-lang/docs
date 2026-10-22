Typed logical build choices fixed before source specialization.

## When to use
Use [`artifact`](#Compilation.impl.artifact), [`safety`](#Compilation.impl.safety), and [`threading`](#Compilation.impl.threading) to select source behavior from the build request.
Use `silk.target` for machine facts such as architecture and pointer width.

## Details
These values describe logical requests. They do not discover SDKs, load runtime packages, or
change ownership rules. All operations in this module run during static evaluation.

Import as `Compilation` with `import silk.compilation { Compilation }`.

Public declarations: 13.

::Anchor{id="Libc"}

## `Libc`

```silk
pub enum Libc
```

The admitted choices for the C library request.

::Anchor{id="Libc.None"}

### `None`

```silk
None
```

The `none` C library request.

::Anchor{id="Libc.System"}

### `System`

```silk
System
```

The `system` C library request.

::Anchor{id="Libc.Gnu"}

### `Gnu`

```silk
Gnu
```

The `gnu` C library request.

::Anchor{id="Artifact"}

## `Artifact`

```silk
pub enum Artifact
```

The admitted choices for the artifact request.

::Anchor{id="Artifact.Executable"}

### `Executable`

```silk
Executable
```

The `executable` artifact request.

::Anchor{id="Artifact.LoadableModule"}

### `LoadableModule`

```silk
LoadableModule
```

The `loadable-module` artifact request.

::Anchor{id="Artifact.StaticArchive"}

### `StaticArchive`

```silk
StaticArchive
```

The `static-archive` artifact request.

::Anchor{id="Artifact.Object"}

### `Object`

```silk
Object
```

The `object` artifact request.

::Anchor{id="Link"}

## `Link`

```silk
pub enum Link
```

The admitted choices for the link request.

::Anchor{id="Link.Static"}

### `Static`

```silk
Static
```

The `static` link request.

::Anchor{id="Link.Dynamic"}

### `Dynamic`

```silk
Dynamic
```

The `dynamic` link request.

::Anchor{id="CodeModel"}

## `CodeModel`

```silk
pub enum CodeModel
```

The admitted choices for the code model.

::Anchor{id="CodeModel.Small"}

### `Small`

```silk
Small
```

The `small` code model.

::Anchor{id="CodeModel.Large"}

### `Large`

```silk
Large
```

The `large` code model.

::Anchor{id="Relocation"}

## `Relocation`

```silk
pub enum Relocation
```

The admitted choices for the relocation model.

::Anchor{id="Relocation.Static"}

### `Static`

```silk
Static
```

The `static` relocation model.

::Anchor{id="Relocation.Pic"}

### `Pic`

```silk
Pic
```

The `pic` relocation model.

::Anchor{id="Optimization"}

## `Optimization`

```silk
pub enum Optimization
```

The admitted choices for the optimization request.

::Anchor{id="Optimization.None"}

### `None`

```silk
None
```

The `none` optimization request.

::Anchor{id="Optimization.Speed"}

### `Speed`

```silk
Speed
```

The `speed` optimization request.

::Anchor{id="Safety"}

## `Safety`

```silk
pub enum Safety
```

The admitted choices for the library safety policy.

::Anchor{id="Safety.Checked"}

### `Checked`

```silk
Checked
```

The `checked` library safety policy.

::Anchor{id="Safety.Unchecked"}

### `Unchecked`

```silk
Unchecked
```

The `unchecked` library safety policy.

::Anchor{id="Threading"}

## `Threading`

```silk
pub enum Threading
```

The admitted choices for the library threading policy.

::Anchor{id="Threading.Single"}

### `Single`

```silk
Single
```

The `single` library threading policy.

::Anchor{id="Threading.Multi"}

### `Multi`

```silk
Multi
```

The `multi` library threading policy.

::Anchor{id="Unwind"}

## `Unwind`

```silk
pub enum Unwind
```

The admitted choices for the unwind request.

::Anchor{id="Unwind.None"}

### `None`

```silk
None
```

The `none` unwind request.

::Anchor{id="Unwind.Native"}

### `Native`

```silk
Native
```

The `native` unwind request.

::Anchor{id="Selection"}

## `Selection`

```silk
pub union Selection
```

A logical default, absent, or named entry/runtime request.

::Anchor{id="Selection.Default"}

### `Default`

```silk
Default
```

The platform's default request.

::Anchor{id="Selection.None"}

### `None`

```silk
None
```

An explicit request for no composition or entry.

::Anchor{id="Selection.Named"}

### `Named`

```silk
Named
```

A logical symbol or package identity, without a physical path.

::Anchor{id="Selection.Named.name"}

#### Field `name`

```silk
pub name: string<'static>
```

The selected logical identity.

::Anchor{id="Sanitizer"}

## `Sanitizer`

```silk
pub enum Sanitizer
```

The sanitizer requests supported by a compilation profile.

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

Whether the build requests debug information.

::Anchor{id="Compilation"}

## `Compilation`

```silk
pub struct Compilation
```

The scope for Compilation operations.

### Details

This owner carries no data. Select it with `import silk.compilation { Compilation }`
to access its inherent operations.

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

Returns the selected C library request during static evaluation.

::Anchor{id="Compilation.impl.artifact"}

### Associated function `artifact`

```silk
pub static fn artifact() -> Artifact
```

Returns the selected artifact request during static evaluation.

::Anchor{id="Compilation.impl.link"}

### Associated function `link`

```silk
pub static fn link() -> Link
```

Returns the selected link request during static evaluation.

::Anchor{id="Compilation.impl.codeModel"}

### Associated function `codeModel`

```silk
pub static fn codeModel() -> CodeModel
```

Returns the selected code model during static evaluation.

::Anchor{id="Compilation.impl.relocation"}

### Associated function `relocation`

```silk
pub static fn relocation() -> Relocation
```

Returns the selected relocation model during static evaluation.

::Anchor{id="Compilation.impl.optimization"}

### Associated function `optimization`

```silk
pub static fn optimization() -> Optimization
```

Returns the selected optimization request during static evaluation.

::Anchor{id="Compilation.impl.safety"}

### Associated function `safety`

```silk
pub static fn safety() -> Safety
```

Returns the selected library safety policy during static evaluation.

::Anchor{id="Compilation.impl.threading"}

### Associated function `threading`

```silk
pub static fn threading() -> Threading
```

Returns the selected library threading policy during static evaluation.

::Anchor{id="Compilation.impl.unwind"}

### Associated function `unwind`

```silk
pub static fn unwind() -> Unwind
```

Returns the selected unwind request during static evaluation.

::Anchor{id="Compilation.impl.entry"}

### Associated function `entry`

```silk
pub static fn entry() -> Selection
```

Returns the logical entry request without resolving a startup symbol.

::Anchor{id="Compilation.impl.runtime"}

### Associated function `runtime`

```silk
pub static fn runtime() -> Selection
```

Returns the logical runtime request without loading a runtime package.

::Anchor{id="Compilation.impl.hasSanitizer"}

### Associated function `hasSanitizer`

```silk
pub static fn hasSanitizer(value: Sanitizer) -> bool
```

Returns whether the build requests the selected sanitizer.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
