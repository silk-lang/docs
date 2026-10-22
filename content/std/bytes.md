Owned byte buffers for file contents, process output, and other data with no fixed encoding.

## When to use
Use [`Bytes`](#Bytes) when each byte must stay unchanged and the data is not necessarily text. Use
`silk.string.String` when the data is valid UTF-8 and the code needs text operations. Use
`silk.list.List<u8>` when the code appends many single bytes.

## Details
[`Bytes.make`](#Bytes.impl.make) does not allocate. [`Bytes.zeroed`](#Bytes.impl.zeroed), [`Bytes.copy`](#Bytes.impl.copy), [`Bytes.append`](#Bytes.impl.append), and
[`Bytes.reserveExact`](#Bytes.impl.reserveExact) can allocate and need an `Allocator`. [`Bytes.asSlice`](#Bytes.impl.asSlice) and
[`Bytes.asMutSlice`](#Bytes.impl.asMutSlice) borrow the bytes. Dropping a `Bytes` value releases its storage.

## Examples
### Copy, append, and change bytes
```silk
import silk.bytes { Bytes }
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut bytes = run Bytes.copy(b"AB") |> Effect.provideMut<Allocator>(&mut allocator)
  run Bytes.append(&mut bytes, b"C") |> Effect.provideMut<Allocator>(&mut allocator)
  let mut writable = Bytes.asMutSlice(&mut bytes)
  writable[1] = 48
  drop writable

  // The bytes are now "A0C".
  let readable = Bytes.asSlice(&bytes)
  if readable.length != 3 || readable[1] != 48 || readable[2] != 67 {
    return 1
  }
  return 0
}
```

Import as `Bytes` with `import silk.bytes { Bytes }`.

Public declarations: 1.

::Anchor{id="Bytes"}

## `Bytes`

```silk
pub struct Bytes
```

An owned sequence of bytes. Dropping it releases its storage.

### Details

The length is the number of bytes in the value. The length grows with [`Bytes.append`](#Bytes.impl.append). The
capacity of the storage is not part of the public contract.

::Anchor{id="Bytes.impl"}

## Implementation `Bytes`

```silk
impl Bytes
```

::Anchor{id="Bytes.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Bytes
```

Returns an empty `Bytes` value. This function does not allocate.

::Anchor{id="Bytes.impl.zeroed"}

### Associated function `zeroed`

```silk
pub effect fn zeroed(length: usize) -> Bytes ! OutOfMemoryError ? &mut Allocator
```

Returns a `Bytes` value of `length` zero bytes.

#### When to use

Use `zeroed` to make a buffer that code then fills through [`Bytes.asMutSlice`](#Bytes.impl.asMutSlice), such as the
destination of a read.

#### Details

A `length` of 0 returns an empty value and does not allocate.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage.

::Anchor{id="Bytes.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of bytes.

::Anchor{id="Bytes.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(values: &[u8]) -> Bytes ! OutOfMemoryError ? &mut Allocator
```

Returns a new `Bytes` value that holds a copy of `values`.

#### Details

An empty `values` does not allocate. Otherwise, the function makes one allocation of exactly
`values.length` bytes.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage.

::Anchor{id="Bytes.impl.reserveExact"}

### Method `reserveExact`

```silk
pub effect fn reserveExact(self: &mut Self, additional: usize) -> ()
  ! OutOfMemoryError
  ? &mut Allocator
```

Makes sure that at least `additional` more bytes fit without another allocation. The length
does not change.

#### Details

If the capacity is already sufficient, this function does nothing. Otherwise, it makes one
allocation for exactly `length + additional` bytes.

#### Errors

- `OutOfMemoryError` if `length + additional` overflows `usize`, or the `Allocator` cannot
  supply the storage. The value does not change.

::Anchor{id="Bytes.impl.clear"}

### Method `clear`

```silk
pub fn clear(self: &mut Self) -> ()
```

Removes all bytes. The storage stays allocated for reuse.

::Anchor{id="Bytes.impl.truncate"}

### Method `truncate`

```silk
pub fn truncate(self: &mut Self, length: usize) -> ()
```

Removes the bytes from position `length` to the end. The storage stays allocated for reuse.

#### Details

If `length` is more than or equal to the current length, this function does nothing.

::Anchor{id="Bytes.impl.append"}

### Method `append`

```silk
pub effect fn append(self: &mut Self, values: &[u8]) -> () ! OutOfMemoryError ? &mut Allocator
```

Adds a copy of `values` at the end, in order.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage. The value does not change.

::Anchor{id="Bytes.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice(self: &Self) -> &[u8]
```

Returns a shared borrow of all bytes as a slice.

::Anchor{id="Bytes.impl.asMutSlice"}

### Method `asMutSlice`

```silk
pub fn asMutSlice(self: &mut Self) -> &mut [u8]
```

Returns an exclusive borrow of all bytes as a slice.

#### Details

Use the slice to change bytes in place. The slice cannot change the length. The compiler
rejects other uses of the value, such as [`Bytes.append`](#Bytes.impl.append), while the slice is live.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
