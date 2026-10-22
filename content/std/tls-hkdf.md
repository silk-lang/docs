TLS 1.3 key expansion and transcript-bound secret derivation.

## When to use
Use [`TlsHkdfSha256`](#TlsHkdfSha256) or [`TlsHkdfSha384`](#TlsHkdfSha384) for TLS labels under RFC 8446 section 7.1.
Use `silk.hkdf` for generic HKDF with caller-defined context bytes.

## Details
Operations borrow secrets and inputs without retaining them. Expansion fills caller-owned output.
Label bytes are preserved exactly and receive the fixed `tls13 ` prefix.
These operations require no allocator or provider.

## Gotchas
These operations do not select protocol labels, serialize transcripts, authenticate peers, or implement TLS.
Secret copies are not guaranteed to be erased. Functional correctness does not establish constant-time execution.

Import as `TlsHkdfSha256` with `import silk.tls_hkdf { TlsHkdfSha256 }`.

Public declarations: 3.

::Anchor{id="LabelError"}

## `LabelError`

```silk
pub union LabelError
```

A rejected public length; no variant contains secret or transcript bytes.

::Anchor{id="LabelError.LabelLength"}

### `LabelLength`

```silk
LabelLength
```

A raw label outside the inclusive range 1 through 249 bytes.

::Anchor{id="LabelError.LabelLength.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The requested length in bytes.

::Anchor{id="LabelError.LabelLength.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The largest accepted length in bytes.

::Anchor{id="LabelError.ContextLength"}

### `ContextLength`

```silk
ContextLength
```

A context longer than 255 bytes.

::Anchor{id="LabelError.ContextLength.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The requested length in bytes.

::Anchor{id="LabelError.ContextLength.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The largest accepted length in bytes.

::Anchor{id="LabelError.OutputLength"}

### `OutputLength`

```silk
OutputLength
```

An output longer than 255 digest blocks.

::Anchor{id="LabelError.OutputLength.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The requested length in bytes.

::Anchor{id="LabelError.OutputLength.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The largest accepted length in bytes.

::Anchor{id="LabelError.MessageTooLong"}

### `MessageTooLong`

```silk
MessageTooLong
```

A message longer than the SHA-256 byte-aligned input domain.

::Anchor{id="LabelError.MessageTooLong.requested"}

#### Field `requested`

```silk
pub requested: u64
```

The requested length in bytes.

::Anchor{id="LabelError.MessageTooLong.maximum"}

#### Field `maximum`

```silk
pub maximum: u64
```

The largest accepted length in bytes.

::Anchor{id="TlsHkdfSha256"}

## `TlsHkdfSha256`

```silk
pub struct TlsHkdfSha256
```

TLS label operations with SHA-256 and 32-byte secrets and transcript hashes.

::Anchor{id="TlsHkdfSha256.impl"}

## Implementation `TlsHkdfSha256`

```silk
impl TlsHkdfSha256
```

::Anchor{id="TlsHkdfSha256.impl.expandLabel"}

### Associated function `expandLabel`

```silk
pub fn expandLabel(secret: &([u8; 32]), label: &[u8], context: &[u8], output: &mut [u8]) -> Result<
    (),
    LabelError,
  >
```

Writes TLS-labeled key material, or returns a length error without changing output.

#### Details

Borrows a 32-byte secret, raw label, and context without retaining them.
The raw label must contain 1 through 249 bytes. The context admits 0 through 255 bytes.
Output admits 0 through 8160 bytes. All lengths are checked before output writes, including for empty output.
LabelLength, ContextLength, and OutputLength identify rejected lengths in that order.

#### Gotchas

The fixed `tls13 ` prefix is always added, even when the raw label already starts with those bytes.
No normalization or zero-byte termination occurs. The caller must select the correct protocol label and a strong secret.

::Anchor{id="TlsHkdfSha256.impl.deriveSecret"}

### Associated function `deriveSecret`

```silk
pub fn deriveSecret(secret: &([u8; 32]), label: &[u8], messages: &[u8]) -> Result<
    [u8; 32],
    LabelError,
  >
```

Returns a 32-byte TLS secret bound to the SHA-256 hash of the supplied message bytes.

#### Details

Borrows the secret, raw label, and messages without retaining them or allocating transcript storage.
The raw label must contain 1 through 249 bytes; otherwise LabelLength is returned before hashing.
Empty messages use SHA-256 of the empty byte sequence, not an empty context.
A message longer than 2^61 minus 1 bytes returns MessageTooLong before hashing.

#### Gotchas

The caller supplies the exact serialized handshake messages. This operation does not apply transcript rewriting.
Use `deriveSecretFromHash` for a previously computed transcript hash; this operation would hash those bytes again.

::Anchor{id="TlsHkdfSha256.impl.deriveSecretFromHash"}

### Associated function `deriveSecretFromHash`

```silk
pub fn deriveSecretFromHash(secret: &([u8; 32]), label: &[u8], transcriptHash: &([u8; 32])) -> Result<
    [u8; 32],
    LabelError,
  >
```

Returns a 32-byte TLS secret bound to an existing SHA-256 transcript hash without hashing it again.

#### Details

Borrows the fixed-width secret and transcript hash without retaining them.
The raw label must contain 1 through 249 bytes; otherwise this operation returns LabelLength.

#### Gotchas

For an empty transcript, supply SHA-256 of the empty byte sequence. A zero-filled hash is a different context.
The caller selects the label and owns transcript serialization and rewriting.

::Anchor{id="TlsHkdfSha384"}

## `TlsHkdfSha384`

```silk
pub struct TlsHkdfSha384
```

TLS label operations with SHA-384 and 48-byte secrets and transcript hashes.

::Anchor{id="TlsHkdfSha384.impl"}

## Implementation `TlsHkdfSha384`

```silk
impl TlsHkdfSha384
```

::Anchor{id="TlsHkdfSha384.impl.expandLabel"}

### Associated function `expandLabel`

```silk
pub fn expandLabel(secret: &([u8; 48]), label: &[u8], context: &[u8], output: &mut [u8]) -> Result<
    (),
    LabelError,
  >
```

Writes TLS-labeled key material, or returns a length error without changing output.

#### Details

Borrows a 48-byte secret, raw label, and context without retaining them.
The raw label must contain 1 through 249 bytes. The context admits 0 through 255 bytes.
Output admits 0 through 12240 bytes. All lengths are checked before output writes, including for empty output.
LabelLength, ContextLength, and OutputLength identify rejected lengths in that order.

#### Gotchas

The fixed `tls13 ` prefix is always added, even when the raw label already starts with those bytes.
No normalization or zero-byte termination occurs. The caller must select the correct protocol label and a strong secret.

::Anchor{id="TlsHkdfSha384.impl.deriveSecret"}

### Associated function `deriveSecret`

```silk
pub fn deriveSecret(secret: &([u8; 48]), label: &[u8], messages: &[u8]) -> Result<
    [u8; 48],
    LabelError,
  >
```

Returns a 48-byte TLS secret bound to the SHA-384 hash of the supplied message bytes.

#### Details

Borrows the secret, raw label, and messages without retaining them or allocating transcript storage.
The raw label must contain 1 through 249 bytes; otherwise LabelLength is returned before hashing.
Empty messages use SHA-384 of the empty byte sequence, not an empty context.

#### Gotchas

The caller supplies the exact serialized handshake messages. This operation does not apply transcript rewriting.
Use `deriveSecretFromHash` for a previously computed transcript hash; this operation would hash those bytes again.

::Anchor{id="TlsHkdfSha384.impl.deriveSecretFromHash"}

### Associated function `deriveSecretFromHash`

```silk
pub fn deriveSecretFromHash(secret: &([u8; 48]), label: &[u8], transcriptHash: &([u8; 48])) -> Result<
    [u8; 48],
    LabelError,
  >
```

Returns a 48-byte TLS secret bound to an existing SHA-384 transcript hash without hashing it again.

#### Details

Borrows the fixed-width secret and transcript hash without retaining them.
The raw label must contain 1 through 249 bytes; otherwise this operation returns LabelLength.

#### Gotchas

For an empty transcript, supply SHA-384 of the empty byte sequence. A zero-filled hash is a different context.
The caller selects the label and owns transcript serialization and rewriting.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
