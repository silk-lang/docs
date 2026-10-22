Typed compile-time facts for the selected compilation profile.

## When to use
Use [`arch`](#Target.impl.arch) and [`operatingSystem`](#Target.impl.operatingSystem) to select source behavior for a machine. Use [`pointerBits`](#pointerBits)
for pointer-sized arithmetic. Read logical artifact and runtime requests through `silk.compilation`.

## Details
These facts are fixed before static evaluation. They have no runtime storage.

Import as `Target` with `import silk.target { Target }`.

Public declarations: 11.

::Anchor{id="Arch"}

## `Arch`

```silk
pub enum Arch
```

The instruction-set architectures supported by the compiler.

::Anchor{id="Arch.Aarch64"}

### `Aarch64`

```silk
Aarch64
```

The Aarch64 choice.

::Anchor{id="Arch.Wasm32"}

### `Wasm32`

```silk
Wasm32
```

The Wasm32 choice.

::Anchor{id="Arch.X86_64"}

### `X86_64`

```silk
X86_64
```

The X86_64 choice.

::Anchor{id="OperatingSystem"}

## `OperatingSystem`

```silk
pub enum OperatingSystem
```

The operating systems supported by the compiler.

::Anchor{id="OperatingSystem.Darwin"}

### `Darwin`

```silk
Darwin
```

The Darwin choice.

::Anchor{id="OperatingSystem.Linux"}

### `Linux`

```silk
Linux
```

The Linux choice.

::Anchor{id="OperatingSystem.Freestanding"}

### `Freestanding`

```silk
Freestanding
```

The Freestanding choice.

::Anchor{id="Abi"}

## `Abi`

```silk
pub enum Abi
```

The platform calling conventions supported by the compiler.

::Anchor{id="Abi.Apple"}

### `Apple`

```silk
Apple
```

The Apple choice.

::Anchor{id="Abi.Gnu"}

### `Gnu`

```silk
Gnu
```

The Gnu choice.

::Anchor{id="Abi.Wasm"}

### `Wasm`

```silk
Wasm
```

The Wasm choice.

::Anchor{id="ObjectFormat"}

## `ObjectFormat`

```silk
pub enum ObjectFormat
```

The object-file formats supported by the compiler.

::Anchor{id="ObjectFormat.MachO"}

### `MachO`

```silk
MachO
```

The MachO choice.

::Anchor{id="ObjectFormat.Elf"}

### `Elf`

```silk
Elf
```

The Elf choice.

::Anchor{id="ObjectFormat.Wasm"}

### `Wasm`

```silk
Wasm
```

The Wasm choice.

::Anchor{id="Endianness"}

## `Endianness`

```silk
pub enum Endianness
```

The byte orders supported by the compiler.

::Anchor{id="Endianness.Little"}

### `Little`

```silk
Little
```

The Little choice.

::Anchor{id="pointerBits"}

## `pointerBits`

```silk
pub const pointerBits: u32
```

The pointer width of the selected compilation target, in bits.

::Anchor{id="usizeMax"}

## `usizeMax`

```silk
pub const usizeMax: usize
```

The greatest `usize` value supported by the selected compilation target.

::Anchor{id="isizeMax"}

## `isizeMax`

```silk
pub const isizeMax: isize
```

The greatest `isize` value supported by the selected compilation target.

::Anchor{id="isizeMin"}

## `isizeMin`

```silk
pub const isizeMin: isize
```

The least `isize` value supported by the selected compilation target.

::Anchor{id="pointerAlignment"}

## `pointerAlignment`

```silk
pub const pointerAlignment: u32
```

The alignment of a data pointer, in bytes.

::Anchor{id="Target"}

## `Target`

```silk
pub struct Target
```

The scope for Target operations.

### Details

This owner carries no data. Select it with `import silk.target { Target }`
to access its inherent operations.

::Anchor{id="Target.impl"}

## Implementation `Target`

```silk
impl Target
```

::Anchor{id="Target.impl.arch"}

### Associated function `arch`

```silk
pub static fn arch() -> Arch
```

Returns the selected Arch during static evaluation.

::Anchor{id="Target.impl.operatingSystem"}

### Associated function `operatingSystem`

```silk
pub static fn operatingSystem() -> OperatingSystem
```

Returns the selected OperatingSystem during static evaluation.

::Anchor{id="Target.impl.abi"}

### Associated function `abi`

```silk
pub static fn abi() -> Abi
```

Returns the selected Abi during static evaluation.

::Anchor{id="Target.impl.objectFormat"}

### Associated function `objectFormat`

```silk
pub static fn objectFormat() -> ObjectFormat
```

Returns the selected ObjectFormat during static evaluation.

::Anchor{id="Target.impl.endianness"}

### Associated function `endianness`

```silk
pub static fn endianness() -> Endianness
```

Returns the selected Endianness during static evaluation.

::Anchor{id="Target.impl.cpu"}

### Associated function `cpu`

```silk
pub static fn cpu() -> string<'static>
```

Returns the logical cpu selection.

::Anchor{id="Target.impl.deployment"}

### Associated function `deployment`

```silk
pub static fn deployment() -> string<'static>
```

Returns the logical deployment selection.

::Anchor{id="Target.impl.hasCpuFeature"}

### Associated function `hasCpuFeature`

```silk
pub static fn hasCpuFeature(value: string<'static>) -> bool
```

Whether a canonical CPU feature is enabled.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
