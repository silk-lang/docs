Bounded, resumable Zstandard decoding into caller-owned byte slices.

## When to use
Use [`Zstd`](#Zstd) for RFC 8878 files or HTTP zstd content. The decoder accepts all non-dictionary block modes.
Use `Zstd.make` to allocate state, then [`step`](#Zstd.impl.step) until the result reports `Finished`.

## Details
Input and output are borrowed only for one call. State owns its history and scratch storage.
Limits apply across all concatenated regular and skippable frames. A frame boundary is not end of input.
The first final call fixes the input end. Later calls must supply its unconsumed suffix with final input set.

## Gotchas
Output is provisional until `Finished`: a later checksum or truncated trailer can invalidate earlier output.
A failure is terminal. Drop the decoder to release its storage and construct another decoder for another stream.

Import as `Zstd` with `import silk.zstd { Zstd }`.

Public declarations: 6.

::Anchor{id="ZstdLimits"}

## `ZstdLimits`

```silk
pub struct ZstdLimits
```

Resource limits for one complete concatenated input stream.

::Anchor{id="ZstdLimits.inputBytes"}

### Field `inputBytes`

```silk
pub inputBytes: u64
```

Maximum consumed bytes, including headers, trailers, and skipped bytes.

::Anchor{id="ZstdLimits.outputBytes"}

### Field `outputBytes`

```silk
pub outputBytes: u64
```

Maximum decoded bytes across all regular frames.

::Anchor{id="ZstdLimits.frames"}

### Field `frames`

```silk
pub frames: u64
```

Maximum regular and skippable frame count combined.

::Anchor{id="ZstdLimits.skippableBytes"}

### Field `skippableBytes`

```silk
pub skippableBytes: u64
```

Maximum skipped payload bytes across all skippable frames.

::Anchor{id="ZstdLimits.windowBytes"}

### Field `windowBytes`

```silk
pub windowBytes: usize
```

Maximum advertised window and exact allocated history capacity.

::Anchor{id="ZstdLimits.workspaceBytes"}

### Field `workspaceBytes`

```silk
pub workspaceBytes: usize
```

Maximum non-window workspace, including staging, state, and bounded entropy scratch.

::Anchor{id="ZstdLimits.impl"}

## Implementation `ZstdLimits`

```silk
impl ZstdLimits
```

::Anchor{id="ZstdLimits.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Self
```

Returns limits of 64 MiB input, 256 MiB output, 1024 frames, 8 MiB skipped bytes and window, and 1 MiB workspace.

::Anchor{id="ZstdStatus"}

## `ZstdStatus`

```silk
pub enum ZstdStatus
```

The resource needed to continue, or successful end of the complete input.

::Anchor{id="ZstdStatus.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

The supplied input is exhausted; supply more input or declare its end.

::Anchor{id="ZstdStatus.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

Pending decoded bytes need output space; supply a nonempty output slice.

::Anchor{id="ZstdStatus.Finished"}

### `Finished`

```silk
Finished
```

Final input ended after complete frame and trailer validation.

::Anchor{id="ZstdProgress"}

## `ZstdProgress`

```silk
pub struct ZstdProgress
```

Exact progress made by one successful step.

::Anchor{id="ZstdProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Input bytes consumed by this call; resubmit only the remaining suffix.

::Anchor{id="ZstdProgress.written"}

### Field `written`

```silk
pub written: usize
```

Output bytes written by this call; only this prefix of the destination was changed.

::Anchor{id="ZstdProgress.status"}

### Field `status`

```silk
pub status: ZstdStatus
```

The required next resource or terminal completion.

::Anchor{id="ZstdReason"}

## `ZstdReason`

```silk
pub enum ZstdReason
```

A precise category of decoder failure.

::Anchor{id="ZstdReason.None"}

### `None`

```silk
None
```

No failure; used only by live internal state.

::Anchor{id="ZstdReason.InvalidConfiguration"}

### `InvalidConfiguration`

```silk
InvalidConfiguration
```

Configuration cannot represent the required storage.

::Anchor{id="ZstdReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

A call changes an established final input boundary or adds input after completion.

::Anchor{id="ZstdReason.InvalidMagic"}

### `InvalidMagic`

```silk
InvalidMagic
```

Input does not start with a regular or skippable frame magic number.

::Anchor{id="ZstdReason.ReservedFrame"}

### `ReservedFrame`

```silk
ReservedFrame
```

The reserved frame-header bit is set.

::Anchor{id="ZstdReason.ReservedBlock"}

### `ReservedBlock`

```silk
ReservedBlock
```

A block uses the reserved block type.

::Anchor{id="ZstdReason.BlockSize"}

### `BlockSize`

```silk
BlockSize
```

A block exceeds the frame block maximum or has an invalid size.

::Anchor{id="ZstdReason.MalformedBlock"}

### `MalformedBlock`

```silk
MalformedBlock
```

Entropy data or a match sequence is invalid; inspect the block reason.

::Anchor{id="ZstdReason.UnsupportedDictionary"}

### `UnsupportedDictionary`

```silk
UnsupportedDictionary
```

A frame requests a nonzero dictionary ID.

::Anchor{id="ZstdReason.Truncated"}

### `Truncated`

```silk
Truncated
```

Final input ends before a complete stream is available.

::Anchor{id="ZstdReason.Checksum"}

### `Checksum`

```silk
Checksum
```

The frame checksum differs from seed-zero XXH64 of its decoded bytes.

::Anchor{id="ZstdReason.ContentSize"}

### `ContentSize`

```silk
ContentSize
```

Decoded frame length differs from its declared content size.

::Anchor{id="ZstdReason.InputLimit"}

### `InputLimit`

```silk
InputLimit
```

Cumulative input exceeds its configured limit.

::Anchor{id="ZstdReason.OutputLimit"}

### `OutputLimit`

```silk
OutputLimit
```

Cumulative decoded output exceeds its configured limit.

::Anchor{id="ZstdReason.FrameLimit"}

### `FrameLimit`

```silk
FrameLimit
```

The combined regular and skippable frame count exceeds its limit.

::Anchor{id="ZstdReason.SkippableLimit"}

### `SkippableLimit`

```silk
SkippableLimit
```

Cumulative skipped payload bytes exceed their limit.

::Anchor{id="ZstdReason.WindowLimit"}

### `WindowLimit`

```silk
WindowLimit
```

The advertised frame window exceeds the configured history capacity.

::Anchor{id="ZstdReason.WorkspaceLimit"}

### `WorkspaceLimit`

```silk
WorkspaceLimit
```

The configured workspace budget cannot hold bounded decoder storage.

::Anchor{id="ZstdError"}

## `ZstdError`

```silk
pub struct ZstdError
```

A terminal decoding failure with exact progress and location.

### Details

`consumed` and `written` describe this call, including progress before failure.
Previously written bytes remain provisional. Repeated calls return the same reason and offset with zero progress.

::Anchor{id="ZstdError.reason"}

### Field `reason`

```silk
pub reason: ZstdReason
```

The category that stopped decoding.

::Anchor{id="ZstdError.blockReason"}

### Field `blockReason`

```silk
pub blockReason: BlockReason
```

The compressed-block category, or `None` for framing and resource failures.

::Anchor{id="ZstdError.offset"}

### Field `offset`

```silk
pub offset: u64
```

The cumulative consumed input position where failure was detected.

::Anchor{id="ZstdError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Input bytes consumed during this call before failure.

::Anchor{id="ZstdError.written"}

### Field `written`

```silk
pub written: usize
```

Output bytes written during this call before failure.

::Anchor{id="Zstd"}

## `Zstd`

```silk
pub struct Zstd
```

An owned, allocation-free-after-construction decoder for one concatenated stream.

### Details

The state releases all allocations when dropped. It retains neither input nor output borrows between calls.
Each regular frame resets its history, entropy tables, and checksum, but cumulative limits do not reset.

::Anchor{id="Zstd.impl"}

## Implementation `Zstd`

```silk
impl Zstd
```

::Anchor{id="Zstd.impl.make"}

### Associated function `make`

```silk
pub effect fn make(limits: ZstdLimits) -> Self ! ZstdError | OutOfMemoryError ? &mut Allocator
```

Allocates exact bounded storage and creates a decoder for one complete input stream.

#### Details

Allocation uses the supplied `Allocator`. No allocation occurs during `step`.
Storage includes `windowBytes`, three 128 KiB staging buffers, and bounded state and entropy scratch.
A zero window or unrepresentable total size fails before allocation. Insufficient workspace reports `WorkspaceLimit`.

::Anchor{id="Zstd.impl.step"}

### Method `step`

```silk
pub fn step(self: &mut Self, input: &[u8], output: &mut [u8], finalInput: bool) -> Result<
    ZstdProgress,
    ZstdError,
  >
```

Consumes input and writes output until a resource is needed, input finishes, or a typed error occurs.

#### Details

Resubmit only `input[consumed..]` and use only `output[..written]` from each result.
A final call fixes the absolute input end. Later calls must supply the complete unconsumed suffix with `finalInput` true.
`NeedOutput` with an empty destination makes no output progress; provide a nonempty destination before retrying.
`NeedInput` exhausts the input. `Finished` validates all concatenated frames and permits only empty final retries.

#### Gotchas

Output can precede a checksum or truncation failure. Do not treat it as validated until `Finished`.
Failure poisons this state. Subsequent calls report the same failure location and make no progress.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
