Byte size and alignment values that describe the memory to request from an allocator.

## When to use
Use [`Layout.of`](#Layout.impl.of) for memory that holds a Silk type. Use [`Layout.repeat`](#Layout.impl.repeat) for an array of
elements. Use [`Layout.make`](#Layout.impl.make) only when the code knows a byte size and alignment but no type,
such as at a foreign boundary.

## Details
An alignment is always a power of two and never zero. A [`Layout`](#Layout) only describes memory. It
does not allocate or initialize memory. [`Layout.make`](#Layout.impl.make) and [`Layout.repeat`](#Layout.impl.repeat) check their
inputs and return an error value instead of an invalid layout.

## Examples
### Size storage for repeated values
```silk
import silk.mem.layout { Layout, LayoutOverflow }
import silk.num.usize

pub fn main() -> i32 {
  let element = Layout.of<i32>()
  let bytes = match move Layout.repeat(move element, 3) {
    Layout { bytes, alignment } => bytes
    LayoutOverflow {} => usize.ZERO
  }
  if bytes != 12 {
    return 1
  }
  return 0
}
```

Import as `Layout` with `import silk.mem.layout { Layout }`.

Public declarations: 3.

::Anchor{id="Layout"}

## `Layout`

```silk
pub struct Layout
```

A byte size and an alignment that describe one block of memory.

### Details

Make a layout with [`Layout.of`](#Layout.impl.of), [`Layout.make`](#Layout.impl.make), or [`Layout.repeat`](#Layout.impl.repeat). These functions make
sure that `alignment` is a power of two and never zero. A struct literal does not check the
fields. A layout only describes memory. It does not allocate or initialize memory.

::Anchor{id="Layout.bytes"}

### Field `bytes`

```silk
pub bytes: usize
```

The number of bytes in the block. It can be zero.

::Anchor{id="Layout.alignment"}

### Field `alignment`

```silk
pub alignment: usize
```

The alignment of the block in bytes. The start address must be a multiple of this value. It is
a power of two.

::Anchor{id="Layout.impl"}

## Implementation `Layout`

```silk
impl Layout
```

::Anchor{id="Layout.impl.of"}

### Associated function `of`

```silk
pub fn of<T>() -> Layout
```

Returns the byte size and alignment of one value of type `T`.

::Anchor{id="Layout.impl.make"}

### Associated function `make`

```silk
pub fn make(size: usize, alignment: usize) -> Layout | InvalidAlignment
```

Returns a layout with `size` bytes and the given `alignment`, or [`InvalidAlignment`](#InvalidAlignment) if
`alignment` is not valid.

#### When to use

Use `make` when the code has a byte size and alignment but no Silk type. Use [`Layout.of`](#Layout.impl.of)
when a type is available.

#### Errors

- [`InvalidAlignment`](#InvalidAlignment) if `alignment` is zero or is not a power of two.

::Anchor{id="Layout.impl.repeat"}

### Associated function `repeat`

```silk
pub fn repeat(layout: Layout, count: usize) -> Layout | LayoutOverflow
```

Returns the layout of `count` consecutive blocks of `layout`, or [`LayoutOverflow`](#LayoutOverflow) if the
size is too large.

#### Details

The result has `layout.bytes * count` bytes and the alignment of `layout`. A `count` of zero
gives a layout of zero bytes.

#### Errors

- [`LayoutOverflow`](#LayoutOverflow) if `layout.bytes * count` is more than the maximum `usize`.

::Anchor{id="InvalidAlignment"}

## `InvalidAlignment`

```silk
pub struct InvalidAlignment
```

The error value of [`Layout.make`](#Layout.impl.make) for an alignment that is zero or not a power of two.

::Anchor{id="InvalidAlignment.alignment"}

### Field `alignment`

```silk
pub alignment: usize
```

The alignment that [`Layout.make`](#Layout.impl.make) did not accept.

::Anchor{id="LayoutOverflow"}

## `LayoutOverflow`

```silk
pub struct LayoutOverflow
```

The error value of [`Layout.repeat`](#Layout.impl.repeat) when the total byte size is more than the maximum `usize`.

Category: Memory.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
