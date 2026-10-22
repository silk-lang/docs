Bounded streaming decoding for raw DEFLATE, zlib, and gzip bytes.

## When to use
Use [`Decoder`](#Decoder) to decode compressed input into caller-owned output buffers.
Select [`Format`](#Format) explicitly. Use [`make`](#Decoder.impl.make) to create state and [`step`](#Decoder.impl.step) to decode bytes.
Use [`reset`](#Decoder.impl.reset) to reuse a decoder for another independent stream.
This module does not detect formats or encode data.

## Details
Construction acquires two bounded allocations: history and table storage.
Steps and reset retain no borrowed buffers and allocate nothing.
Limits count consumed input, emitted output, started members, and header bytes within each independent stream.
Raw and zlib stop at the first stream boundary. Gzip accepts concatenated members and requires final input.

## Gotchas
Output is provisional until `Finished`. Discard all output after a decoding failure.
Preset dictionaries are unsupported. A failed decoder rejects steps until a successful reset.

## Examples
### Decode a stored block into a caller-owned buffer
```silk
import silk.allocator {Allocator, OutOfMemoryError}
import silk.effect {Effect}
import silk.inflate {Decoder, DecodeError, Format, Limits, Progress, Status}
import silk.result {Result}

effect fn decode() -> i32 ! OutOfMemoryError | DecodeError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let limits = Limits {
    maxInputBytes: 7,
    maxOutputBytes: 2,
    maxMembers: 1,
    maxHeaderBytes: 0,
    maxMemoryBytes: 65536,
  }
  let creating = Decoder.make(Format.Raw, move limits)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut decoder = run creating
  let input = b"\x01\x02\x00\xfd\xffhi"
  let mut output: [u8; 2] = [0, 0]
  let result = Decoder.step(&mut decoder, &input, &mut output, true)
  return match move result {
    Result<Progress, DecodeError>.Success {value} => inspect(move value, &output)
    Result<Progress, DecodeError>.Failure {error} => 99
  }
}

fn inspect(progress: Progress, output: &[u8]) -> i32 {
  if progress.status != Status.Finished || progress.consumed != 7 || progress.written != 2 {
    return 1
  }
  if output[0] != 104 || output[1] != 105 {
    return 2
  }
  return 0
}

effect fn recover(error: OutOfMemoryError | DecodeError) -> i32 {
  return 99
}

pub fn main() -> i32 {
  return run Effect.catchAll(decode(), recover)
}
```

Import as `Decoder` with `import silk.inflate { Decoder }`.

Public declarations: 8.

::Anchor{id="MEMORY_BOUND"}

## `MEMORY_BOUND`

```silk
pub const MEMORY_BOUND: u64
```

A conservative byte bound for decoder storage, owned tables, and temporary decoding state.

### Details

The bound excludes caller buffers and allocator metadata. A larger allowance does not increase storage.

::Anchor{id="Format"}

## `Format`

```silk
pub enum Format
```

The explicit compressed container format.

::Anchor{id="Format.Raw"}

### `Raw`

```silk
Raw
```

One raw RFC 1951 DEFLATE stream.

::Anchor{id="Format.Zlib"}

### `Zlib`

```silk
Zlib
```

One RFC 1950 zlib stream without a preset dictionary.

::Anchor{id="Format.Gzip"}

### `Gzip`

```silk
Gzip
```

An RFC 1952 gzip stream with one or more concatenated members.

::Anchor{id="Status"}

## `Status`

```silk
pub enum Status
```

The next action required after a successful step.

::Anchor{id="Status.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

Supply more input after discarding exactly the consumed prefix.

::Anchor{id="Status.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

Supply another output buffer and resubmit the unconsumed input suffix.

::Anchor{id="Status.Finished"}

### `Finished`

```silk
Finished
```

The selected container and its integrity checks are complete.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Explicit cumulative resource allowances. Zero permits no units of that resource.

::Anchor{id="Limits.maxInputBytes"}

### Field `maxInputBytes`

```silk
pub maxInputBytes: u64
```

The maximum total number of consumed compressed bytes.

::Anchor{id="Limits.maxOutputBytes"}

### Field `maxOutputBytes`

```silk
pub maxOutputBytes: u64
```

The maximum total number of emitted uncompressed bytes.

::Anchor{id="Limits.maxMembers"}

### Field `maxMembers`

```silk
pub maxMembers: u64
```

The maximum number of started members. Raw and zlib each count as one member.

::Anchor{id="Limits.maxHeaderBytes"}

### Field `maxHeaderBytes`

```silk
pub maxHeaderBytes: u64
```

The maximum total number of wrapper header bytes, including gzip optional fields and header CRC.

::Anchor{id="Limits.maxMemoryBytes"}

### Field `maxMemoryBytes`

```silk
pub maxMemoryBytes: u64
```

The available decoder storage allowance. It must be at least [`MEMORY_BOUND`](#MEMORY_BOUND).

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

Exact progress within one call and the next required action.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The input prefix consumed by this call.

::Anchor{id="Progress.written"}

### Field `written`

```silk
pub written: usize
```

The output prefix initialized by this call.

::Anchor{id="Progress.status"}

### Field `status`

```silk
pub status: Status
```

The next action required from the caller.

::Anchor{id="ErrorKind"}

## `ErrorKind`

```silk
pub enum ErrorKind
```

A decoding failure category or the resource allowance that was exceeded.

::Anchor{id="ErrorKind.InvalidHeader"}

### `InvalidHeader`

```silk
InvalidHeader
```

A wrapper header violates its format.

::Anchor{id="ErrorKind.UnsupportedMethod"}

### `UnsupportedMethod`

```silk
UnsupportedMethod
```

A wrapper requests a compression method other than DEFLATE.

::Anchor{id="ErrorKind.UnsupportedDictionary"}

### `UnsupportedDictionary`

```silk
UnsupportedDictionary
```

A zlib header requests an unsupported preset dictionary.

::Anchor{id="ErrorKind.InvalidBlock"}

### `InvalidBlock`

```silk
InvalidBlock
```

A block type, stored length, or compressed symbol is invalid.

::Anchor{id="ErrorKind.InvalidHuffman"}

### `InvalidHuffman`

```silk
InvalidHuffman
```

A Huffman alphabet or code-length repeat is invalid.

::Anchor{id="ErrorKind.InvalidDistance"}

### `InvalidDistance`

```silk
InvalidDistance
```

A match refers outside initialized history or the declared window.

::Anchor{id="ErrorKind.TruncatedInput"}

### `TruncatedInput`

```silk
TruncatedInput
```

Final input ends before a required field is complete.

::Anchor{id="ErrorKind.ChecksumMismatch"}

### `ChecksumMismatch`

```silk
ChecksumMismatch
```

A header or data checksum does not match.

::Anchor{id="ErrorKind.SizeMismatch"}

### `SizeMismatch`

```silk
SizeMismatch
```

A gzip member size does not match its trailer.

::Anchor{id="ErrorKind.InvalidUse"}

### `InvalidUse`

```silk
InvalidUse
```

The decoder failed earlier or the final-input contract was violated.

::Anchor{id="ErrorKind.InputLimit"}

### `InputLimit`

```silk
InputLimit
```

Consuming the next byte would exceed the input allowance.

::Anchor{id="ErrorKind.OutputLimit"}

### `OutputLimit`

```silk
OutputLimit
```

Emitting the next byte would exceed the output allowance.

::Anchor{id="ErrorKind.MemberLimit"}

### `MemberLimit`

```silk
MemberLimit
```

Starting a member would exceed the member allowance.

::Anchor{id="ErrorKind.HeaderLimit"}

### `HeaderLimit`

```silk
HeaderLimit
```

Consuming a header byte would exceed the header allowance.

::Anchor{id="ErrorKind.MemoryLimit"}

### `MemoryLimit`

```silk
MemoryLimit
```

Construction or reset cannot fit within the decoder storage allowance.

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

A typed failure with exact progress for the failing call.

### Gotchas

The written prefix can contain provisional output. Discard the decoded stream after a step failure.
A rejected reset leaves the original decoder and its output unchanged.

::Anchor{id="DecodeError.kind"}

### Field `kind`

```silk
pub kind: ErrorKind
```

The failure category.

::Anchor{id="DecodeError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The input prefix consumed before failure in this call.

::Anchor{id="DecodeError.written"}

### Field `written`

```silk
pub written: usize
```

The output prefix initialized before failure in this call.

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

An owned, bounded decoder with no retained input or output borrow.

### Details

Drop releases its history and table allocations. A finished decoder returns `Finished` with zero progress on later calls.
A failed decoder rejects later steps with `InvalidUse`.
A successful [`reset`](#Decoder.impl.reset) starts another independent stream with the same owned storage.

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

Creates a decoder and acquires bounded history and table storage through the current allocator.

#### Details

Construction fails with `MemoryLimit` or `MemberLimit` before allocation if either allowance is insufficient.
Allocation failure is `OutOfMemoryError`. The first member counts at construction.

::Anchor{id="Decoder.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self, format: Format, limits: Limits) -> Result<(), DecodeError>
```

Starts another independent stream with the existing decoder storage.

#### When to use

Use after completion, failure, or abandonment to reuse storage without an allocator requirement.

#### Details

Success replaces the format and limits and restores fresh stream behavior. Reset allocates nothing.
The first member counts immediately. Counters and final-input obligations start again for the new stream.
The memory allowance must cover [`MEMORY_BOUND`](#MEMORY_BOUND), and the member allowance must be nonzero.
These checks occur in that order before mutation. Rejection returns `MemoryLimit` or `MemberLimit` with zero progress.
A rejected reset leaves the decoder unchanged. An in-progress stream can continue.

#### Gotchas

Reset does not validate, reclaim, or erase previous output. Output from failed or abandoned streams remains provisional.
Reset does not securely erase the decoder storage.

::Anchor{id="Decoder.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], finalInput: bool) -> Result<
    Progress,
    DecodeError,
  >
```

Decodes input into the supplied output buffer and returns exact per-call progress.

#### Details

Resubmit only the unconsumed input suffix. Once `finalInput` is true, keep it true and preserve that suffix length.
The caller must preserve suffix contents. A later call can provide a new output buffer of any length.
Steps allocate nothing and retain no buffer borrow. An empty output returns `NeedOutput` when emission is required.
Raw and zlib leave trailing input unconsumed. Gzip waits for final exhaustion after a complete member.

#### Gotchas

Output remains provisional until `Finished`. A failure poisons the decoder; discard all output after failure.
Limits are cumulative across calls and gzip members until a successful [`reset`](#Decoder.impl.reset).
Checks occur before the excess byte or member is accepted.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
