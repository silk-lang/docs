Compress bytes as Zstandard frames (RFC 8878), in steps or all at once, with levels 1 to 22.

## When to use
Use a [`ZstdEncoder`](#ZstdEncoder) to write `.zst` files or HTTP bodies with `Content-Encoding: zstd`, in
steps and with fixed memory. Use [`ZstdEncoder.encode`](#ZstdEncoder.impl.encode) to compress one complete buffer. Decode
with `silk.compress.zstd.Zstd`.

## Details
Each level uses the parameters and match strategy of the reference `zstd` for large inputs:
one hash table for levels 1 and 2, two hash tables for 3 and 4, lazy matching over hash chains
for 5 to 12, a binary tree with lazy matching for 13 to 15, and a binary tree with an optimal
parser that prices literals and sequences for 16 to 22. The window grows from 512 KiB at level
1 to 128 MiB at level 22. Literals use Huffman codes, and sequences use FSE tables made for each
block, or the predefined tables when those are smaller. A block that does not shrink is stored
raw, and a block of one repeated byte is stored as RLE.
[`ZstdEncoder.make`](#ZstdEncoder.impl.make) allocates all storage one time. Later calls do not allocate and do not
keep a borrow of your buffers. The output is deterministic but is not the same bytes that the
reference `zstd` writes.

## Examples
### Compress a buffer
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.compress.zstd_encode { ZstdEncodeError, ZstdEncoder, ZstdOptions }

pub effect fn main() -> i32
  ! OutOfMemoryError | ZstdEncodeError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let input = b"abcabcabcabcabcabcabcabcabcabcabcabc"
  let mut output: [u8; 64] = [0; 64]
  let written = run ZstdEncoder.encode(input, &mut output, ZstdOptions.make(3))
    |> Effect.provideMut<Allocator>(&mut allocator)
  // A frame starts with the magic number 28 b5 2f fd.
  if output[0] != 40 || output[3] != 253 || written >= input.length {
    return 1
  }
  return 0
}
```

Import as `ZstdEncoder` with `import silk.compress.zstd_encode { ZstdEncoder }`.

Public declarations: 7.

::Anchor{id="ZstdFlush"}

## `ZstdFlush`

```silk
pub enum ZstdFlush
```

What a call to [`ZstdEncoder.step`](#ZstdEncoder.impl.step) must finish before it returns.

The values match the end directives of the reference `ZSTD_compressStream2`.

::Anchor{id="ZstdFlush.Continue"}

### `Continue`

```silk
Continue
```

Compress as the encoder sees fit. Output can lag behind the input by up to one block.

::Anchor{id="ZstdFlush.Flush"}

### `Flush`

```silk
Flush
```

Write all input in complete blocks, so that a decoder can decode all of it.

::Anchor{id="ZstdFlush.End"}

### `End`

```silk
End
```

Write all input, end the frame, and write the checksum if it is on. After it finishes, the
encoder accepts no more input.

::Anchor{id="ZstdEncodeStatus"}

## `ZstdEncodeStatus`

```silk
pub enum ZstdEncodeStatus
```

What the encoder needs after a successful [`ZstdEncoder.step`](#ZstdEncoder.impl.step).

::Anchor{id="ZstdEncodeStatus.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

All input is consumed and the flush was `Continue`. Call again with more input, or with
another flush.

::Anchor{id="ZstdEncodeStatus.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

The output buffer is full. Call again with a new output buffer, the input that was not
consumed, and the same flush.

::Anchor{id="ZstdEncodeStatus.Flushed"}

### `Flushed`

```silk
Flushed
```

All input is consumed and written in complete blocks, after `ZstdFlush.Flush`.

::Anchor{id="ZstdEncodeStatus.Finished"}

### `Finished`

```silk
Finished
```

The frame is complete.

::Anchor{id="ZstdEncodeProgress"}

## `ZstdEncodeProgress`

```silk
pub struct ZstdEncodeProgress
```

The result of one successful [`ZstdEncoder.step`](#ZstdEncoder.impl.step).

::Anchor{id="ZstdEncodeProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call consumed, from the start of the input.

::Anchor{id="ZstdEncodeProgress.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote, from the start of the output.

::Anchor{id="ZstdEncodeProgress.status"}

### Field `status`

```silk
pub status: ZstdEncodeStatus
```

What the encoder needs next.

::Anchor{id="ZstdEncodeErrorKind"}

## `ZstdEncodeErrorKind`

```silk
pub enum ZstdEncodeErrorKind
```

The cause of a [`ZstdEncodeError`](#ZstdEncodeError).

::Anchor{id="ZstdEncodeErrorKind.InvalidOptions"}

### `InvalidOptions`

```silk
InvalidOptions
```

The level or window size is outside its range.

::Anchor{id="ZstdEncodeErrorKind.InvalidUse"}

### `InvalidUse`

```silk
InvalidUse
```

The call is not allowed now: a pledged size after the frame started, input after the frame
finished, a frame whose size differs from the pledged size, or any step after a failure.

::Anchor{id="ZstdEncodeErrorKind.OutputFull"}

### `OutputFull`

```silk
OutputFull
```

[`ZstdEncoder.encode`](#ZstdEncoder.impl.encode) filled the output buffer before the frame was complete.

::Anchor{id="ZstdEncodeErrorKind.impl.Debug"}

## Implementation `Debug for ZstdEncodeErrorKind`

```silk
impl Debug for ZstdEncodeErrorKind
```

::Anchor{id="ZstdEncodeErrorKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidOptions`.

::Anchor{id="ZstdEncodeError"}

## `ZstdEncodeError`

```silk
pub struct ZstdEncodeError
```

An encoding failure, with the progress of the call before it failed.

### Gotchas
After a failed [`ZstdEncoder.step`](#ZstdEncoder.impl.step), discard the frame. Each later step fails with
`InvalidUse` until you call [`ZstdEncoder.reset`](#ZstdEncoder.impl.reset).

::Anchor{id="ZstdEncodeError.kind"}

### Field `kind`

```silk
pub kind: ZstdEncodeErrorKind
```

The cause of the failure.

::Anchor{id="ZstdEncodeError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that the call consumed before it failed.

::Anchor{id="ZstdEncodeError.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that the call wrote before it failed.

::Anchor{id="ZstdEncodeError.impl.Debug"}

## Implementation `Debug for ZstdEncodeError`

```silk
impl Debug for ZstdEncodeError
```

::Anchor{id="ZstdEncodeError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the fields, as `ZstdEncodeError { kind: ..., consumed: ..., written: ... }`.

::Anchor{id="ZstdOptions"}

## `ZstdOptions`

```silk
pub struct ZstdOptions
```

The settings of a [`ZstdEncoder`](#ZstdEncoder).

::Anchor{id="ZstdOptions.level"}

### Field `level`

```silk
pub level: u32
```

The effort, from 1 to 22. 1 is the fastest, 22 the smallest, and 3 is the default of the
reference `zstd`.

::Anchor{id="ZstdOptions.windowLog"}

### Field `windowLog`

```silk
pub windowLog: u32
```

The base-2 logarithm of the match window, from 10 to 27. A larger window finds older matches
and uses more memory. The decoder needs a window of the same size.

::Anchor{id="ZstdOptions.checksum"}

### Field `checksum`

```silk
pub checksum: bool
```

Whether the frame ends with the low 32 bits of the XXH64 of the content.

::Anchor{id="ZstdOptions.contentSize"}

### Field `contentSize`

```silk
pub contentSize: bool
```

Whether the frame header records the content size when the encoder knows it: from
[`ZstdEncoder.setPledgedSize`](#ZstdEncoder.impl.setPledgedSize), or when the first step ends the frame.

::Anchor{id="ZstdOptions.impl"}

## Implementation `ZstdOptions`

```silk
impl ZstdOptions
```

::Anchor{id="ZstdOptions.impl.make"}

### Associated function `make`

```silk
pub fn make(level: u32) -> ZstdOptions
```

Returns options for `level` with the window of the reference `zstd` for that level (512 KiB
for level 1, 1 MiB for 2, 2 MiB for 3 to 8, 4 MiB for 9 to 16, 8 MiB for 17 to 19, and 32,
64, and 128 MiB for 20, 21, and 22), no checksum, and the content size recorded when known.

::Anchor{id="ZstdEncoder"}

## `ZstdEncoder`

```silk
pub struct ZstdEncoder
```

A streaming Zstandard encoder that owns its window, match tables, and output buffer.

### When to use
Use it to compress data that arrives in parts, as the reference `ZSTD_compressStream2` does.
Make one with [`ZstdEncoder.make`](#ZstdEncoder.impl.make), call [`ZstdEncoder.step`](#ZstdEncoder.impl.step) with each part of the input, and
end with `ZstdFlush.End`. Call [`ZstdEncoder.reset`](#ZstdEncoder.impl.reset) to write another frame with the same
storage.

### Details
[`ZstdEncoder.make`](#ZstdEncoder.impl.make) allocates all storage one time: twice the window, the hash and chain
tables (64 KiB together at level 1, 640 MiB at level 22, and smaller when the window is), about
640 KiB of block buffers, and 160 KiB more for the optimal parser of levels 16 to 22. Later
calls do not allocate and do not keep a borrow of your buffers, so you can move the encoder
between threads between calls.

::Anchor{id="ZstdEncoder.impl"}

## Implementation `ZstdEncoder`

```silk
impl ZstdEncoder
```

::Anchor{id="ZstdEncoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make(options: ZstdOptions) -> ZstdEncoder
    ! OutOfMemoryError | ZstdEncodeError
    ? &mut Allocator
```

Returns an encoder for one frame with `options`, with storage from the ambient `Allocator`.

#### Errors
- [`ZstdEncodeError`](#ZstdEncodeError) with `InvalidOptions` if the level is not 1 to 22 or the window log is
  not 10 to 27, checked before the allocation.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="ZstdEncoder.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> ()
```

Starts a new frame with the same options and storage. It does not allocate. It drops the
input and output that the encoder holds, the pledged size, and a failure.

::Anchor{id="ZstdEncoder.impl.setPledgedSize"}

### Method `setPledgedSize`

```silk
pub fn setPledgedSize(self: &mut Self, size: u64) -> Result<(), ZstdEncodeError>
```

Declares the exact size of the frame's content before the first step, as the reference
`ZSTD_CCtx_setPledgedSrcSize` does. The frame header then records the size.

#### Errors
`InvalidUse` after the first step or after a failure. The step that ends the frame fails with
`InvalidUse` if the content has another size.

::Anchor{id="ZstdEncoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], flush: ZstdFlush) -> Result<
    ZstdEncodeProgress,
    ZstdEncodeError,
  >
```

Compresses from `input` into `output` and returns how much it consumed and wrote.

#### Details
On the next call, give only the input after the consumed prefix. You can give a new output
buffer of any length. Call with `ZstdFlush.Continue` while more input follows. A flush
finishes only when the step returns `Flushed`, or `Finished` for `ZstdFlush.End`. Until then,
call again with the same flush.

#### Errors
`InvalidUse` with input after the frame finished, a frame whose size differs from the pledged
size, or after an earlier failure.

::Anchor{id="ZstdEncoder.impl.encodedBound"}

### Associated function `encodedBound`

```silk
pub fn encodedBound(length: usize) -> Option<usize>
```

Returns the most bytes that [`ZstdEncoder.encode`](#ZstdEncoder.impl.encode) can write for `length` input bytes with
any options, or `None` if that count does not fit in `usize`.

#### Details
An output buffer of this size never fails with `OutputFull`. The bound is the frame header
(at most 18 bytes), 3 bytes per 128 KiB block or part of one, the input, and a 4-byte
checksum.

::Anchor{id="ZstdEncoder.impl.encode"}

### Associated function `encode`

```silk
pub effect fn encode(input: &[u8], output: &mut [u8], options: ZstdOptions) -> usize
    ! OutOfMemoryError | ZstdEncodeError
    ? &mut Allocator
```

Compresses all of `input` into the start of `output` as one frame with `options`, and returns
the encoded length.

#### Details
It makes a [`ZstdEncoder`](#ZstdEncoder) with storage from the ambient `Allocator`, runs one step with
`ZstdFlush.End`, and releases the storage before it returns. The window shrinks to the
smallest power of two, at least 1 KiB, that holds the input, so small inputs need little
memory and the decoder needs a small window. The frame header records the
content size if `options.contentSize` is set.

#### Errors
- `OutputFull` if `output` fills before the frame is complete. It never occurs when `output`
  holds at least `ZstdEncoder.encodedBound(input.length)` bytes. Discard the partial frame.
- `InvalidOptions` if an option is outside its range.
- `OutOfMemoryError` if the `Allocator` fails.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
