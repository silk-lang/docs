Compress bytes as raw DEFLATE, zlib, or gzip, in steps or all at once, with zlib's levels,
strategies, and flush modes.

## When to use
Use an [`Encoder`](#Encoder) to write `.gz` files, zlib streams, or HTTP bodies with `Content-Encoding:
gzip` or `deflate`, in steps and with fixed memory. Use [`Encoder.encode`](#Encoder.impl.encode) to compress one
complete buffer. Choose the container with `silk.compress.inflate.Format`, and decode with
`silk.compress.inflate.Decoder`.

## Details
The encoder follows the design of zlib: a sliding window of up to 32 KiB with hash chains,
greedy matching for levels 1 to 3, lazy matching for levels 4 to 9, and blocks that use stored,
fixed Huffman, or dynamic Huffman codes, whichever is smallest. Level 0 writes stored blocks.
[`Encoder.make`](#Encoder.impl.make) allocates all storage one time. Later calls do not allocate and do not keep a
borrow of your buffers. The output is deterministic: gzip uses timestamp zero, no optional
fields, and OS byte 255. The bytes are a valid stream but are not the same bytes that zlib
writes.

## Examples
### Compress a buffer with zlib framing
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.compress.deflate { EncodeError, Encoder, Options }
import silk.compress.inflate { Format }

pub effect fn main() -> i32
  ! OutOfMemoryError | EncodeError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let input = b"abcabcabcabcabcabcabcabcabcabc"
  let mut output: [u8; 64] = [0; 64]
  let written = run Encoder.encode(input, &mut output, Format.Zlib, Options.make(6))
    |> Effect.provideMut<Allocator>(&mut allocator)
  // A zlib stream starts with 0x78 and is much shorter than the repeated input.
  if output[0] != 120 || written >= input.length {
    return 1
  }
  return 0
}
```

Import as `Encoder` with `import silk.compress.deflate { Encoder }`.

Public declarations: 8.

::Anchor{id="Strategy"}

## `Strategy`

```silk
pub enum Strategy
```

How the encoder looks for repeated data.

The values match zlib's strategies. `Default` suits most data.

::Anchor{id="Strategy.Default"}

### `Default`

```silk
Default
```

Find matches with the effort that the level sets.

::Anchor{id="Strategy.Filtered"}

### `Filtered`

```silk
Filtered
```

Like `Default`, but drop short matches, for data made of small values with a random spread,
such as the output of a filter or predictor.

::Anchor{id="Strategy.HuffmanOnly"}

### `HuffmanOnly`

```silk
HuffmanOnly
```

Do not look for matches. Each byte is a literal in a Huffman block.

::Anchor{id="Strategy.Rle"}

### `Rle`

```silk
Rle
```

Look only for runs of one repeated byte, at distance 1. It is fast and suits images such as
PNG rows.

::Anchor{id="Strategy.Fixed"}

### `Fixed`

```silk
Fixed
```

Use the fixed Huffman codes of DEFLATE in each compressed block, never dynamic codes.

::Anchor{id="Flush"}

## `Flush`

```silk
pub enum Flush
```

What a call to [`Encoder.step`](#Encoder.impl.step) must finish before it returns.

The values match zlib's flush modes. Use `None` while more input follows, and `Finish` with the
last input.

::Anchor{id="Flush.None"}

### `None`

```silk
None
```

Compress as the encoder sees fit. Output can lag behind the input.

::Anchor{id="Flush.Partial"}

### `Partial`

```silk
Partial
```

Write all input in a block, then an empty fixed block, as zlib's `Z_PARTIAL_FLUSH` does. The
output can end within a byte.

::Anchor{id="Flush.Sync"}

### `Sync`

```silk
Sync
```

Write all input, then an empty stored block (`00 00 ff ff`), so that the output ends on a byte
and a decoder can decode all of it. This is zlib's `Z_SYNC_FLUSH`.

::Anchor{id="Flush.Full"}

### `Full`

```silk
Full
```

Like `Sync`, then forget the history, so that a decoder can start at this point. Compression
becomes worse. This is zlib's `Z_FULL_FLUSH`.

::Anchor{id="Flush.Block"}

### `Block`

```silk
Block
```

Write all input and end the current block, without the bytes that `Sync` adds. Up to 7 bits
of the block stay in the encoder until the next call. This is zlib's `Z_BLOCK`.

::Anchor{id="Flush.Finish"}

### `Finish`

```silk
Finish
```

Write all input, end the stream, and write the checksum trailer. After it finishes, the
encoder accepts no more input.

::Anchor{id="EncodeStatus"}

## `EncodeStatus`

```silk
pub enum EncodeStatus
```

What the encoder needs after a successful [`Encoder.step`](#Encoder.impl.step).

::Anchor{id="EncodeStatus.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

All input is consumed and the flush was `None`. Call again with more input, or with a flush.

::Anchor{id="EncodeStatus.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

The output buffer is full. Call again with a new output buffer, the input that was not
consumed, and the same flush.

::Anchor{id="EncodeStatus.Flushed"}

### `Flushed`

```silk
Flushed
```

All input is consumed and the flush, other than `None` or `Finish`, is complete.

::Anchor{id="EncodeStatus.Finished"}

### `Finished`

```silk
Finished
```

The stream, with its trailer, is complete.

::Anchor{id="EncodeProgress"}

## `EncodeProgress`

```silk
pub struct EncodeProgress
```

The result of one successful [`Encoder.step`](#Encoder.impl.step).

::Anchor{id="EncodeProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call consumed, from the start of the input.

::Anchor{id="EncodeProgress.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote, from the start of the output.

::Anchor{id="EncodeProgress.status"}

### Field `status`

```silk
pub status: EncodeStatus
```

What the encoder needs next.

::Anchor{id="EncodeErrorKind"}

## `EncodeErrorKind`

```silk
pub enum EncodeErrorKind
```

The cause of an [`EncodeError`](#EncodeError).

::Anchor{id="EncodeErrorKind.InvalidOptions"}

### `InvalidOptions`

```silk
InvalidOptions
```

A level, window size, memory level, or strategy is outside its range, or raw or gzip framing
asks for 8 window bits.

::Anchor{id="EncodeErrorKind.InvalidUse"}

### `InvalidUse`

```silk
InvalidUse
```

The call is not allowed now: a dictionary after the stream started or with gzip framing,
input after the stream finished, or any step after a failure.

::Anchor{id="EncodeErrorKind.OutputFull"}

### `OutputFull`

```silk
OutputFull
```

[`Encoder.encode`](#Encoder.impl.encode) filled the output buffer before the stream was complete.

::Anchor{id="EncodeErrorKind.impl.Debug"}

## Implementation `Debug for EncodeErrorKind`

```silk
impl Debug for EncodeErrorKind
```

::Anchor{id="EncodeErrorKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidOptions`.

::Anchor{id="EncodeError"}

## `EncodeError`

```silk
pub struct EncodeError
```

An encoding failure, with the progress of the call before it failed.

### Gotchas
After a failed [`Encoder.step`](#Encoder.impl.step), discard the stream. Each later step fails with `InvalidUse`
until you call [`Encoder.reset`](#Encoder.impl.reset).

::Anchor{id="EncodeError.kind"}

### Field `kind`

```silk
pub kind: EncodeErrorKind
```

The cause of the failure.

::Anchor{id="EncodeError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that the call consumed before it failed.

::Anchor{id="EncodeError.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that the call wrote before it failed.

::Anchor{id="EncodeError.impl.Debug"}

## Implementation `Debug for EncodeError`

```silk
impl Debug for EncodeError
```

::Anchor{id="EncodeError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the fields, as `EncodeError { kind: ..., consumed: ..., written: ... }`.

::Anchor{id="Options"}

## `Options`

```silk
pub struct Options
```

The settings of an [`Encoder`](#Encoder), with the ranges and meanings of zlib's `deflateInit2`.

::Anchor{id="Options.level"}

### Field `level`

```silk
pub level: u32
```

The effort, from 0 to 9. 0 stores the data without compression, 1 is the fastest, and 9 is
the smallest. 6 is zlib's default.

::Anchor{id="Options.windowBits"}

### Field `windowBits`

```silk
pub windowBits: u32
```

The base-2 logarithm of the window, from 8 to 15. A larger window finds more matches and
uses more memory. 8 is treated as 9, as zlib does, and only with zlib framing.

::Anchor{id="Options.memoryLevel"}

### Field `memoryLevel`

```silk
pub memoryLevel: u32
```

How much memory the match table and the block buffer use, from 1 to 9. 8 is zlib's default.

::Anchor{id="Options.strategy"}

### Field `strategy`

```silk
pub strategy: Strategy
```

How the encoder looks for repeated data.

::Anchor{id="Options.impl"}

## Implementation `Options`

```silk
impl Options
```

::Anchor{id="Options.impl.make"}

### Associated function `make`

```silk
pub fn make(level: u32) -> Options
```

Returns options with `level`, a 32 KiB window, memory level 8, and the default strategy, the
defaults of zlib's `deflateInit`.

::Anchor{id="Encoder"}

## `Encoder`

```silk
pub struct Encoder
```

A streaming DEFLATE, zlib, or gzip encoder that owns its window, tables, and output buffer.

### When to use
Use it to compress data that arrives in parts, or to control flushing, as zlib's `deflate`
does. Make one with [`Encoder.make`](#Encoder.impl.make), call [`Encoder.step`](#Encoder.impl.step) with each part of the input, and
end with `Flush.Finish`. Call [`Encoder.reset`](#Encoder.impl.reset) to compress another stream with the same storage.

### Details
[`Encoder.make`](#Encoder.impl.make) allocates all storage one time: about `2 << windowBits` bytes of window,
`2 << windowBits` bytes of chains, `2 << (memoryLevel + 7)` bytes of hash heads, and
`7 << (memoryLevel + 6)` bytes of block and output buffers. Later calls do not allocate and do
not keep a borrow of your buffers, so you can move the encoder between threads between calls.

### Gotchas
Compressed bytes can wait in the encoder until a flush. Use `Flush.Sync` to make all input so
far decodable.

::Anchor{id="Encoder.impl"}

## Implementation `Encoder`

```silk
impl Encoder
```

::Anchor{id="Encoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make(format: Format, options: Options) -> Encoder
    ! OutOfMemoryError | EncodeError
    ? &mut Allocator
```

Returns an encoder for one stream in `format` with `options`, with storage from the ambient
`Allocator`.

#### Errors
- [`EncodeError`](#EncodeError) with `InvalidOptions` if an option is outside its range, checked before the
  allocation.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Encoder.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> ()
```

Starts a new stream with the same format, options, and storage, as zlib's `deflateReset`
does.

It does not allocate. It drops the input and output that the encoder holds, any dictionary,
and a failure. Parameters set with [`Encoder.setParameters`](#Encoder.impl.setParameters) stay.

::Anchor{id="Encoder.impl.setDictionary"}

### Method `setDictionary`

```silk
pub fn setDictionary(self: &mut Self, dictionary: &[u8]) -> Result<(), EncodeError>
```

Loads `dictionary` as data that the stream can refer to, before the first step, as zlib's
`deflateSetDictionary` does.

#### Details
Only the last bytes that fit in the window are used. With zlib framing the header names the
dictionary by its Adler-32, and the decoder must load the same dictionary. With raw framing
the decoder must load the same dictionary without being told.

#### Errors
`InvalidUse` with gzip framing, after the first step, or after a failure.

::Anchor{id="Encoder.impl.setParameters"}

### Method `setParameters`

```silk
pub fn setParameters(self: &mut Self, level: u32, strategy: Strategy) -> Result<(), EncodeError>
```

Changes the level and strategy for the data after this call, as zlib's `deflateParams` does.

#### Details
If the encoder holds input of the current block, the next [`Encoder.step`](#Encoder.impl.step) ends that block
with the old settings before it compresses more, as `Flush.Block` does. Only then do the new
settings apply.

#### Errors
`InvalidOptions` if `level` is more than 9. `InvalidUse` after a failure or after the stream
finished.

::Anchor{id="Encoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], flush: Flush) -> Result<
    EncodeProgress,
    EncodeError,
  >
```

Compresses from `input` into `output` and returns how much it consumed and wrote.

#### Details
On the next call, give only the input after the consumed prefix. You can give a new output
buffer of any length. Call with `Flush.None` while more input follows. A flush finishes only
when the step returns `Flushed`, or `Finished` for `Flush.Finish`. Until then, call again with
the same flush. A second flush of the same kind with no new input writes nothing.

#### Errors
`InvalidUse` with input after the stream finished, or after an earlier failure.

::Anchor{id="Encoder.impl.encodedBound"}

### Associated function `encodedBound`

```silk
pub fn encodedBound(length: usize, format: Format) -> Option<usize>
```

Returns the most bytes that [`Encoder.encode`](#Encoder.impl.encode) can write for `length` input bytes in
`format`, with any options, or `None` if that count does not fit in `usize`.

#### Details
An output buffer of this size never fails with `OutputFull`. The bound is
`length + length / 8 + length / 64 + 6` plus the container: 0 bytes for raw DEFLATE, 10 for
zlib with room for a dictionary id, and 18 for gzip.

::Anchor{id="Encoder.impl.encode"}

### Associated function `encode`

```silk
pub effect fn encode(input: &[u8], output: &mut [u8], format: Format, options: Options) -> usize
    ! OutOfMemoryError | EncodeError
    ? &mut Allocator
```

Compresses all of `input` into the start of `output` in `format` with `options`, and returns
the encoded length.

#### Details
It makes an [`Encoder`](#Encoder) with storage from the ambient `Allocator`, runs one step with
`Flush.Finish`, and releases the storage before it returns. Input and output must not overlap,
as enforced by their shared and exclusive borrows.

#### Errors
- `OutputFull` if `output` fills before the stream is complete. It never occurs when `output`
  holds at least `Encoder.encodedBound(input.length, format)` bytes. Discard the partial
  stream.
- `InvalidOptions` if an option is outside its range.
- `OutOfMemoryError` if the `Allocator` fails.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
