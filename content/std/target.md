Facts about the target machine of the current compilation: architecture, operating system, ABI,
and pointer width.

## When to use
Use [`Target`](#Target) with `static if` to select code for a machine, such as a system call for Linux or
Darwin. Use [`pointerBits`](#pointerBits), [`usizeMax`](#usizeMax), and the other constants for pointer-sized arithmetic.
Use `silk.compilation` for build choices, such as the artifact kind or the safety policy.

## Details
The compiler fixes these facts before static evaluation, from the selected target. They do not
depend on the host machine. They have no runtime storage, so a selection adds no runtime cost.

## Examples
### Select a value for the pointer width
```silk
import silk.target { Target, Arch }

fn wordBytes() -> i32 {
  static if Target.arch() == Arch.Wasm32 {
    return 4
  }
  return 8
}

pub fn main() -> i32 {
  let bytes = wordBytes()
  if bytes != 4 && bytes != 8 {
    return 1
  }
  return 0
}
```

Import as `Target` with `import silk.target { Target }`.

Public declarations: 11.

::Anchor{id="Arch"}

## `Arch`

```silk
pub enum Arch
```

The instruction set architectures that the compiler supports.

### Details

Read the target value with [`Target.arch`](#Target.impl.arch).

::Anchor{id="Arch.Aarch64"}

### `Aarch64`

```silk
Aarch64
```

64-bit Arm (AArch64).

::Anchor{id="Arch.Wasm32"}

### `Wasm32`

```silk
Wasm32
```

32-bit WebAssembly.

::Anchor{id="Arch.X86_64"}

### `X86_64`

```silk
X86_64
```

64-bit x86 (x86-64).

::Anchor{id="OperatingSystem"}

## `OperatingSystem`

```silk
pub enum OperatingSystem
```

The operating systems that the compiler supports.

### Details

Read the target value with [`Target.operatingSystem`](#Target.impl.operatingSystem).

::Anchor{id="OperatingSystem.Darwin"}

### `Darwin`

```silk
Darwin
```

Darwin (macOS).

::Anchor{id="OperatingSystem.Linux"}

### `Linux`

```silk
Linux
```

Linux.

::Anchor{id="OperatingSystem.Freestanding"}

### `Freestanding`

```silk
Freestanding
```

No operating system, such as WebAssembly without a host interface.

::Anchor{id="OperatingSystem.Wasi"}

### `Wasi`

```silk
Wasi
```

The WebAssembly System Interface (WASI).

::Anchor{id="Abi"}

## `Abi`

```silk
pub enum Abi
```

The platform calling conventions that the compiler supports.

### Details

Read the target value with [`Target.abi`](#Target.impl.abi).

::Anchor{id="Abi.Apple"}

### `Apple`

```silk
Apple
```

The Apple calling convention.

::Anchor{id="Abi.Gnu"}

### `Gnu`

```silk
Gnu
```

The GNU calling convention.

::Anchor{id="Abi.Wasm"}

### `Wasm`

```silk
Wasm
```

The WebAssembly calling convention.

::Anchor{id="ObjectFormat"}

## `ObjectFormat`

```silk
pub enum ObjectFormat
```

The object file formats that the compiler supports.

### Details

Read the target value with [`Target.objectFormat`](#Target.impl.objectFormat).

::Anchor{id="ObjectFormat.MachO"}

### `MachO`

```silk
MachO
```

Mach-O, the format of Darwin.

::Anchor{id="ObjectFormat.Elf"}

### `Elf`

```silk
Elf
```

ELF, the format of Linux.

::Anchor{id="ObjectFormat.Wasm"}

### `Wasm`

```silk
Wasm
```

The WebAssembly binary format.

::Anchor{id="Endianness"}

## `Endianness`

```silk
pub enum Endianness
```

The byte orders that the compiler supports.

### Details

Read the target value with [`Target.endianness`](#Target.impl.endianness).

::Anchor{id="Endianness.Little"}

### `Little`

```silk
Little
```

Little-endian. The least significant byte is at the lowest address.

::Anchor{id="pointerBits"}

## `pointerBits`

```silk
pub const pointerBits: u32
```

The width of a pointer on the target, in bits: 32 or 64.

::Anchor{id="usizeMax"}

## `usizeMax`

```silk
pub const usizeMax: usize
```

The maximum `usize` value on the target: `2^32 - 1` or `2^64 - 1`.

::Anchor{id="isizeMax"}

## `isizeMax`

```silk
pub const isizeMax: isize
```

The maximum `isize` value on the target: `2^31 - 1` or `2^63 - 1`.

::Anchor{id="isizeMin"}

## `isizeMin`

```silk
pub const isizeMin: isize
```

The minimum `isize` value on the target: `-2^31` or `-2^63`.

::Anchor{id="pointerAlignment"}

## `pointerAlignment`

```silk
pub const pointerAlignment: u32
```

The alignment of a data pointer on the target, in bytes.

::Anchor{id="Target"}

## `Target`

```silk
pub struct Target
```

The owner type of the target queries. It has no fields and is never constructed.

### Details

Each operation is `static`. Use it in a `static if`, a `static fn`, or a `const` initializer.

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

Returns the instruction set architecture of the target.

::Anchor{id="Target.impl.operatingSystem"}

### Associated function `operatingSystem`

```silk
pub static fn operatingSystem() -> OperatingSystem
```

Returns the operating system of the target.

::Anchor{id="Target.impl.abi"}

### Associated function `abi`

```silk
pub static fn abi() -> Abi
```

Returns the calling convention of the target.

::Anchor{id="Target.impl.objectFormat"}

### Associated function `objectFormat`

```silk
pub static fn objectFormat() -> ObjectFormat
```

Returns the object file format of the target.

::Anchor{id="Target.impl.endianness"}

### Associated function `endianness`

```silk
pub static fn endianness() -> Endianness
```

Returns the byte order of the target.

::Anchor{id="Target.impl.cpu"}

### Associated function `cpu`

```silk
pub static fn cpu() -> string<'static>
```

Returns the name of the CPU model that the build selects, as written in the compilation
profile.

::Anchor{id="Target.impl.deployment"}

### Associated function `deployment`

```silk
pub static fn deployment() -> string<'static>
```

Returns the minimum platform version that the build selects, as written in the compilation
profile.

::Anchor{id="Target.impl.hasCpuFeature"}

### Associated function `hasCpuFeature`

```silk
pub static fn hasCpuFeature(value: string<'static>) -> bool
```

Returns `true` if the build enables the CPU feature `value`.

#### Details

`value` is a canonical feature name of the target, as written in the compilation profile.

Category: Core.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
