Decompress raw DEFLATE, zlib, and gzip data in steps, with fixed memory and limits that you set.

## When to use
Use a [`Decoder`](#Decoder) to read `.gz` files, zlib streams, or HTTP bodies with `Content-Encoding:
gzip` or `deflate`. Choose the [`Format`](#Format) yourself, because the decoder does not detect it. Make
a decoder with [`Decoder.make`](#Decoder.impl.make), call [`Decoder.step`](#Decoder.impl.step) until it returns `Finished`, and call
[`Decoder.reset`](#Decoder.impl.reset) to decode another stream with the same storage. This module does not compress.

## Details
[`Decoder.make`](#Decoder.impl.make) allocates a 32 KiB history and the Huffman tables one time. Later calls do not
allocate and do not keep a borrow of your buffers. Each call to [`Decoder.step`](#Decoder.impl.step) takes the input
that is not consumed yet and an output buffer, and returns a [`Progress`](#Progress): how many bytes it
consumed and wrote, and what it needs next. The [`Limits`](#Limits) apply to the full stream across all
calls.

Raw and zlib stop at the end of the first stream and leave the bytes after it unconsumed. Gzip
accepts more than one member. It finishes only when the input is marked final and all input is
consumed.

## Errors
- `OutOfMemoryError` from [`Decoder.make`](#Decoder.impl.make) if the `Allocator` fails.
- [`DecodeError`](#DecodeError) if the data is not valid, a limit is too small, or the calls do not follow the
  rules of [`Decoder.step`](#Decoder.impl.step). Its `kind` tells you the cause.

## Gotchas
Output is not verified until `Finished`, because the checksum comes at the end. If a step fails,
discard all output of the stream. A failed decoder rejects each later step with `InvalidUse`
until you call [`Decoder.reset`](#Decoder.impl.reset). Zlib streams with a preset dictionary are not supported.

## Examples
### Decode a stored DEFLATE block
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.inflate { DecodeError, Decoder, Format, Limits, Progress, Status }
import silk.result { Result }

pub effect fn main() -> i32
  ! OutOfMemoryError | DecodeError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let limits = Limits {
    maxInputBytes: 1024,
    maxOutputBytes: 1024,
    maxMembers: 1,
    maxHeaderBytes: 0,
    maxMemoryBytes: 65536
  }
  let mut decoder = run Decoder.make(Format.Raw, move limits)
    |> Effect.provideMut<Allocator>(&mut allocator)

  // A final stored block: header, length 2, its complement, then the bytes "hi".
  let input = b"\x01\x02\x00\xfd\xffhi"
  let mut output: [u8; 16] = [0; 16]
  return match Decoder.step(&mut decoder, &input, &mut output, true) {
    Result<Progress, DecodeError>.Success { value } => {
      if value.status != Status.Finished || value.written != 2 || output[0] != 104
        || output[1] != 105 {
        return 1
      }
      return 0
    }
    Result<Progress, DecodeError>.Failure { error: _ } => 1
  }
}
```

Import as `Decoder` with `import silk.inflate { Decoder }`.

Public declarations: 8.

::Anchor{id="MEMORY_BOUND"}

## `MEMORY_BOUND`

```silk
pub const MEMORY_BOUND: u64
```

The number of bytes of storage that a [`Decoder`](#Decoder) needs: 64 KiB.

It counts the history, the tables, and the decoder state. It does not count your buffers or the
overhead of the allocator. [`Limits.maxMemoryBytes`](#Limits.maxMemoryBytes) must be at least this value. A larger value
does not make the decoder use more memory.

::Anchor{id="Format"}

## `Format`

```silk
pub enum Format
```

The container format of the compressed data.

The decoder does not detect the format. Choose it yourself: `Gzip` for `.gz` files and
`Content-Encoding: gzip`, `Zlib` for `Content-Encoding: deflate`, and `Raw` for DEFLATE data
with no header.

::Anchor{id="Format.Raw"}

### `Raw`

```silk
Raw
```

One raw DEFLATE stream (RFC 1951) with no header or checksum.

::Anchor{id="Format.Zlib"}

### `Zlib`

```silk
Zlib
```

One zlib stream (RFC 1950): a 2-byte header, DEFLATE data, and an Adler-32 checksum. A preset
dictionary is not supported.

::Anchor{id="Format.Gzip"}

### `Gzip`

```silk
Gzip
```

Gzip data (RFC 1952): one or more members, each with a header, DEFLATE data, a CRC-32, and the
size.

::Anchor{id="Status"}

## `Status`

```silk
pub enum Status
```

What the decoder needs after a successful step.

::Anchor{id="Status.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

All given input is consumed. Call again with more input, or with `finalInput` set if there is
no more.

::Anchor{id="Status.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

The output buffer is full. Call again with a new output buffer and the input that was not
consumed.

::Anchor{id="Status.Finished"}

### `Finished`

```silk
Finished
```

The stream is complete and its checksums are correct. Later steps return `Finished` and do
nothing.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The resource limits for one stream. Each limit counts across all calls and gzip members. A limit
of 0 allows nothing.

::Anchor{id="Limits.maxInputBytes"}

### Field `maxInputBytes`

```silk
pub maxInputBytes: u64
```

The maximum number of compressed bytes to consume.

::Anchor{id="Limits.maxOutputBytes"}

### Field `maxOutputBytes`

```silk
pub maxOutputBytes: u64
```

The maximum number of decompressed bytes to write.

::Anchor{id="Limits.maxMembers"}

### Field `maxMembers`

```silk
pub maxMembers: u64
```

The maximum number of gzip members. A raw or zlib stream is one member. It must not be 0.

::Anchor{id="Limits.maxHeaderBytes"}

### Field `maxHeaderBytes`

```silk
pub maxHeaderBytes: u64
```

The maximum number of header bytes, with the optional gzip fields and the header CRC. A raw
stream has no header bytes.

::Anchor{id="Limits.maxMemoryBytes"}

### Field `maxMemoryBytes`

```silk
pub maxMemoryBytes: u64
```

The storage that the decoder can use. It must be at least [`MEMORY_BOUND`](#MEMORY_BOUND).

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

The result of one successful step.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call consumed, from the start of the input.

::Anchor{id="Progress.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote, from the start of the output.

::Anchor{id="Progress.status"}

### Field `status`

```silk
pub status: Status
```

What the decoder needs next.

::Anchor{id="ErrorKind"}

## `ErrorKind`

```silk
pub enum ErrorKind
```

The cause of a [`DecodeError`](#DecodeError).

::Anchor{id="ErrorKind.InvalidHeader"}

### `InvalidHeader`

```silk
InvalidHeader
```

A zlib or gzip header is not valid.

::Anchor{id="ErrorKind.UnsupportedMethod"}

### `UnsupportedMethod`

```silk
UnsupportedMethod
```

The header names a compression method that is not DEFLATE.

::Anchor{id="ErrorKind.UnsupportedDictionary"}

### `UnsupportedDictionary`

```silk
UnsupportedDictionary
```

The zlib header asks for a preset dictionary.

::Anchor{id="ErrorKind.InvalidBlock"}

### `InvalidBlock`

```silk
InvalidBlock
```

A block type, a stored block length, or a compressed symbol is not valid.

::Anchor{id="ErrorKind.InvalidHuffman"}

### `InvalidHuffman`

```silk
InvalidHuffman
```

A Huffman code or a code-length repeat is not valid.

::Anchor{id="ErrorKind.InvalidDistance"}

### `InvalidDistance`

```silk
InvalidDistance
```

A back-reference points before the start of the output or outside the window.

::Anchor{id="ErrorKind.TruncatedInput"}

### `TruncatedInput`

```silk
TruncatedInput
```

The final input ends before the stream is complete.

::Anchor{id="ErrorKind.ChecksumMismatch"}

### `ChecksumMismatch`

```silk
ChecksumMismatch
```

A header CRC, CRC-32, or Adler-32 checksum is not correct.

::Anchor{id="ErrorKind.SizeMismatch"}

### `SizeMismatch`

```silk
SizeMismatch
```

The size in a gzip trailer is not the size of the decoded member.

::Anchor{id="ErrorKind.InvalidUse"}

### `InvalidUse`

```silk
InvalidUse
```

The decoder failed before, or a call broke the rules of [`Decoder.step`](#Decoder.impl.step) about final input.

::Anchor{id="ErrorKind.InputLimit"}

### `InputLimit`

```silk
InputLimit
```

The next input byte would go over [`Limits.maxInputBytes`](#Limits.maxInputBytes).

::Anchor{id="ErrorKind.OutputLimit"}

### `OutputLimit`

```silk
OutputLimit
```

The next output byte would go over [`Limits.maxOutputBytes`](#Limits.maxOutputBytes).

::Anchor{id="ErrorKind.MemberLimit"}

### `MemberLimit`

```silk
MemberLimit
```

A new gzip member would go over [`Limits.maxMembers`](#Limits.maxMembers), or the limit is 0.

::Anchor{id="ErrorKind.HeaderLimit"}

### `HeaderLimit`

```silk
HeaderLimit
```

The next header byte would go over [`Limits.maxHeaderBytes`](#Limits.maxHeaderBytes).

::Anchor{id="ErrorKind.MemoryLimit"}

### `MemoryLimit`

```silk
MemoryLimit
```

[`Limits.maxMemoryBytes`](#Limits.maxMemoryBytes) is less than [`MEMORY_BOUND`](#MEMORY_BOUND).

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

A decoding failure, with the progress of the call before it failed.

### Gotchas
The output that the call wrote is not valid. Discard all output of the stream after a failed
step. A failed [`Decoder.reset`](#Decoder.impl.reset) does not change the decoder.

::Anchor{id="DecodeError.kind"}

### Field `kind`

```silk
pub kind: ErrorKind
```

The cause of the failure.

::Anchor{id="DecodeError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that this call consumed before it failed.

::Anchor{id="DecodeError.written"}

### Field `written`

```silk
pub written: usize
```

The number of output bytes that this call wrote before it failed.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

A DEFLATE, zlib, or gzip decoder that owns its history and tables.

### When to use
Use it to decompress `.gz` files, zlib streams, or HTTP bodies with `Content-Encoding: gzip` or
`deflate`, in steps and with fixed memory. Make one with [`Decoder.make`](#Decoder.impl.make), call
[`Decoder.step`](#Decoder.impl.step) until it returns `Finished`, and call [`Decoder.reset`](#Decoder.impl.reset) to decode another
stream with the same storage. It does not compress.

### Details
[`Decoder.make`](#Decoder.impl.make) allocates a 32 KiB history and the Huffman tables one time. Later calls do not
allocate and do not keep a borrow of your buffers. The [`Limits`](#Limits) apply to the full stream
across all calls.

Dropping it releases the storage. After `Finished`, each step returns `Finished` with no
progress. After a failure, each step fails with `InvalidUse`. [`Decoder.reset`](#Decoder.impl.reset) starts a new
stream with the same storage.

### Gotchas
Output is not verified until `Finished`, because the checksum comes at the end. Zlib streams
with a preset dictionary are not supported.

::Anchor{id="Decoder.impl"}

## Implementation `Decoder`

```silk
impl Decoder
```

::Anchor{id="Decoder.impl.make"}

### Associated function `make`

```silk
pub effect fn make(format: Format, limits: Limits) -> Decoder
  ! OutOfMemoryError | DecodeError
  ? &mut Allocator
```

Returns a decoder for one stream in `format`, with storage from the ambient `Allocator`.

The first member counts against [`Limits.maxMembers`](#Limits.maxMembers) at once.

#### Errors
- [`DecodeError`](#DecodeError) with `MemoryLimit` if `maxMemoryBytes` is less than [`MEMORY_BOUND`](#MEMORY_BOUND), or
  with `MemberLimit` if `maxMembers` is 0. These checks come before the allocation.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Decoder.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self, format: Format, limits: Limits) -> Result<(), DecodeError>
```

Starts a new stream in `format` with new `limits`, and keeps the storage of the decoder.

Use it after a stream finishes or fails, or to stop a stream. It does not allocate. All
counters and the final-input state start again, and the first member counts at once.

#### Errors
- `MemoryLimit` if `maxMemoryBytes` is less than [`MEMORY_BOUND`](#MEMORY_BOUND), then `MemberLimit` if
  `maxMembers` is 0. If it fails, the decoder does not change and a stream in progress can
  continue.

#### Gotchas
It does not erase the earlier output or the history storage.

::Anchor{id="Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], finalInput: bool) -> Result<
    Progress,
    DecodeError,
  >
```

Decodes from `input` into `output` and returns how much it consumed and wrote.

On the next call, give only the input after the consumed prefix. You can give a new output
buffer of any length. Set `finalInput` when `input` holds all remaining data. After that, each
call must set `finalInput` and give exactly the input that is not consumed yet.

If the output has no space and the decoder has bytes to write, it returns `NeedOutput`.

Raw and zlib stop at the end of the first stream and leave the bytes after it unconsumed. Gzip
accepts more than one member. It finishes only when the input is marked final and all input is
consumed.

#### Errors
- [`DecodeError`](#DecodeError) if the data is not valid, a [`Limits`](#Limits) value would be exceeded, or the final
  input ends early (`TruncatedInput`). The limit checks occur before the byte or member that
  would go over the limit.
- `InvalidUse` if the decoder failed before, or the call changes the final input.

#### Gotchas
Output is not verified until `Finished`, because the checksum comes at the end. After a
failure, discard all output of the stream.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
