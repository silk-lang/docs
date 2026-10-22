Strict standard-padded Base64 operations for caller-provided byte storage.

## When to use
Use [`Base64`](#Base64) when a protocol requires the RFC 4648 standard alphabet and required padding.
Use [`encodedLength`](#Base64.impl.encodedLength) or [`decodedLength`](#Base64.impl.decodedLength) to calculate exact storage before a write.

## Details
[`encodeInto`](#Base64.impl.encodeInto) and [`decodeInto`](#Base64.impl.decodeInto) write to caller-owned slices without allocation. Decoding
rejects whitespace, URL-safe characters, malformed padding, and nonzero unused pad bits. All
failures occur before destination mutation. A successful write does not change the unused suffix.

## Gotchas
This module does not implement MIME, PEM whitespace, URL-safe, unpadded, streaming, or
allocating variants. Base64 is an encoding, not encryption.

Import as `Base64` with `import silk.base64 { Base64 }`.

Public declarations: 3.

::Anchor{id="Base64Reason"}

## `Base64Reason`

```silk
pub enum Base64Reason
```

The reason a Base64 size calculation, validation, or caller-buffer operation failed.

::Anchor{id="Base64Reason.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A nonempty encoded input does not contain a whole four-byte quantum.

::Anchor{id="Base64Reason.InvalidByte"}

### `InvalidByte`

```silk
InvalidByte
```

An input byte is outside the standard Base64 alphabet.

::Anchor{id="Base64Reason.InvalidPadding"}

### `InvalidPadding`

```silk
InvalidPadding
```

A padding byte is misplaced, excessive, or missing from its required final position.

::Anchor{id="Base64Reason.NonCanonicalPadBits"}

### `NonCanonicalPadBits`

```silk
NonCanonicalPadBits
```

Unused bits in the final significant sextet are nonzero.

::Anchor{id="Base64Reason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

The encoded result length is not representable as `usize` for the selected target.

::Anchor{id="Base64Reason.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The caller-provided output slice cannot hold the complete result.

::Anchor{id="Base64Error"}

## `Base64Error`

```silk
pub struct Base64Error
```

A deterministic Base64 failure with details relevant to its reason.

### Details
Validation failures populate `offset`. `OutputTooSmall` populates `required` and `available`.
`SizeOverflow` has no additional fields, and unused fields are `None`.

::Anchor{id="Base64Error.reason"}

### Field `reason`

```silk
pub reason: Base64Reason
```

The stable failure category.

::Anchor{id="Base64Error.offset"}

### Field `offset`

```silk
pub offset: Option<usize>
```

The offending input byte, input length, or final significant sextet position.

::Anchor{id="Base64Error.required"}

### Field `required`

```silk
pub required: Option<usize>
```

The exact output length needed by `OutputTooSmall`.

::Anchor{id="Base64Error.available"}

### Field `available`

```silk
pub available: Option<usize>
```

The supplied output length reported by `OutputTooSmall`.

::Anchor{id="Base64"}

## `Base64`

```silk
pub struct Base64
```

The owner of strict standard-padded Base64 operations.

::Anchor{id="Base64.impl"}

## Implementation `Base64`

```silk
impl Base64
```

::Anchor{id="Base64.impl.encodedLength"}

### Associated function `encodedLength`

```silk
pub fn encodedLength(inputLength: usize) -> Result<usize, Base64Error>
```

Returns the exact standard-padded encoded length without allocation.

#### Details
Zero returns zero. An unrepresentable result returns `SizeOverflow` without a trap. All
optional error fields are `None` for `SizeOverflow`.

::Anchor{id="Base64.impl.decodedLength"}

### Associated function `decodedLength`

```silk
pub fn decodedLength(input: &[u8]) -> Result<usize, Base64Error>
```

Validates strict standard-padded Base64 and returns its exact decoded byte length.

#### Details
Empty input returns zero. A nonempty input must contain complete four-byte quanta. Validation
checks bytes from left to right and accepts padding only in the final quantum.

#### Gotchas
The function rejects whitespace, URL-safe bytes, malformed padding, and nonzero unused pad
bits. The returned error identifies the first failure offset.

::Anchor{id="Base64.impl.encodeInto"}

### Associated function `encodeInto`

```silk
pub fn encodeInto(output: &mut [u8], input: &[u8]) -> Result<usize, Base64Error>
```

Encodes bytes into a caller-owned output prefix and returns the number of written bytes.

#### Details
The function checks the exact size and capacity before the first write. A failure does not
change `output`. A successful write does not change bytes after the returned prefix.

#### Gotchas
The function returns `SizeOverflow` for an unrepresentable result. It returns `OutputTooSmall`
with exact `required` and `available` values for insufficient output. It does not add a NUL
terminator.

::Anchor{id="Base64.impl.decodeInto"}

### Associated function `decodeInto`

```silk
pub fn decodeInto(output: &mut [u8], input: &[u8]) -> Result<usize, Base64Error>
```

Decodes strict standard-padded Base64 into an output prefix and returns the written length.

#### Details
The function completes strict validation and capacity checking before the first write. A
failure does not change `output`. A successful write does not change the unused suffix.

#### Gotchas
An input-validation error takes precedence over `OutputTooSmall`. The function rejects
whitespace, URL-safe bytes, malformed padding, and nonzero unused pad bits.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
