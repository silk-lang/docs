Resource limits and failures for complete-buffer compression codecs.

## Details
LZMA, LZMA2, and XZ decode into caller-owned byte buffers. Limits bound input, output,
dictionary references, and allocated probability tables. Discard output after any error.

Import as `compression` with `import silk.compress.limits as compression`.

Public declarations: 4.

::Anchor{id="DecodeLimits"}

## `DecodeLimits`

```silk
pub struct DecodeLimits
```

Limits for one complete decode. Zero permits no bytes for that resource.

::Anchor{id="DecodeLimits.maxInputBytes"}

### Field `maxInputBytes`

```silk
pub maxInputBytes: usize
```

Maximum length of the supplied compressed input.

::Anchor{id="DecodeLimits.maxOutputBytes"}

### Field `maxOutputBytes`

```silk
pub maxOutputBytes: usize
```

Maximum bytes to write into the caller's output buffer.

::Anchor{id="DecodeLimits.maxDictionaryBytes"}

### Field `maxDictionaryBytes`

```silk
pub maxDictionaryBytes: u64
```

Maximum dictionary size declared by the stream or raw LZMA2 caller.

::Anchor{id="DecodeLimits.maxWorkspaceBytes"}

### Field `maxWorkspaceBytes`

```silk
pub maxWorkspaceBytes: usize
```

Maximum bytes allocated for probability tables, excluding caller-owned buffers.

::Anchor{id="DecodeLimits.impl"}

## Implementation `DecodeLimits`

```silk
impl DecodeLimits
```

::Anchor{id="DecodeLimits.impl.make"}

### Associated function `make`

```silk
pub fn make() -> DecodeLimits
```

Allows 64 MiB input, 256 MiB output, a 64 MiB dictionary, and 16 MiB of tables.

::Anchor{id="DecodeReason"}

## `DecodeReason`

```silk
pub enum DecodeReason
```

The cause of a complete-buffer decoding failure.

::Anchor{id="DecodeReason.InvalidHeader"}

### `InvalidHeader`

```silk
InvalidHeader
```

A container header or property byte is invalid.

::Anchor{id="DecodeReason.InvalidData"}

### `InvalidData`

```silk
InvalidData
```

The range coding or chunk control sequence is invalid.

::Anchor{id="DecodeReason.InvalidDistance"}

### `InvalidDistance`

```silk
InvalidDistance
```

A match refers outside the dictionary or before its last reset.

::Anchor{id="DecodeReason.InvalidSize"}

### `InvalidSize`

```silk
InvalidSize
```

A declared compressed or uncompressed size does not match the data.

::Anchor{id="DecodeReason.TruncatedInput"}

### `TruncatedInput`

```silk
TruncatedInput
```

The input ends before a complete stream is available.

::Anchor{id="DecodeReason.TrailingData"}

### `TrailingData`

```silk
TrailingData
```

Bytes follow the end of a stream where the format permits none.

::Anchor{id="DecodeReason.ChecksumMismatch"}

### `ChecksumMismatch`

```silk
ChecksumMismatch
```

A container checksum does not match its data.

::Anchor{id="DecodeReason.UnsupportedFilter"}

### `UnsupportedFilter`

```silk
UnsupportedFilter
```

The XZ block uses a filter other than a single LZMA2 filter.

::Anchor{id="DecodeReason.UnsupportedCheck"}

### `UnsupportedCheck`

```silk
UnsupportedCheck
```

The XZ stream uses a check other than none, CRC-32, CRC-64, or SHA-256.

::Anchor{id="DecodeReason.InputLimit"}

### `InputLimit`

```silk
InputLimit
```

The supplied input exceeds the input limit.

::Anchor{id="DecodeReason.OutputLimit"}

### `OutputLimit`

```silk
OutputLimit
```

The decoded data exceeds the output buffer or output limit.

::Anchor{id="DecodeReason.DictionaryLimit"}

### `DictionaryLimit`

```silk
DictionaryLimit
```

The declared dictionary exceeds the dictionary limit.

::Anchor{id="DecodeReason.WorkspaceLimit"}

### `WorkspaceLimit`

```silk
WorkspaceLimit
```

Probability tables would exceed the workspace limit.

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

A failure with input and output offsets. Discard all output after a failure.

::Anchor{id="DecodeError.reason"}

### Field `reason`

```silk
pub reason: DecodeReason
```

Why decoding failed.

::Anchor{id="DecodeError.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Input bytes consumed before failure.

::Anchor{id="DecodeError.written"}

### Field `written`

```silk
pub written: usize
```

Output bytes written before failure; these bytes are not verified.

::Anchor{id="DecodeReason.impl.Debug"}

## Implementation `Debug for DecodeReason`

```silk
impl Debug for DecodeReason
```

::Anchor{id="DecodeReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the symbolic reason for a decoding failure.

::Anchor{id="DecodeError.impl.Debug"}

## Implementation `Debug for DecodeError`

```silk
impl Debug for DecodeError
```

::Anchor{id="DecodeError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the failure reason and progress offsets.

::Anchor{id="Decoded"}

## `Decoded`

```silk
pub struct Decoded
```

The verified input and output lengths of a successful complete decode.

::Anchor{id="Decoded.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Compressed bytes consumed.

::Anchor{id="Decoded.written"}

### Field `written`

```silk
pub written: usize
```

Decoded bytes written at the start of the supplied output buffer.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
