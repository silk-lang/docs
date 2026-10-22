HKDF key extraction and expansion with SHA-256 and SHA-384.

## When to use
Use [`HkdfSha256`](#HkdfSha256) or [`HkdfSha384`](#HkdfSha384) to derive keys from secret input material under RFC 5869.
Use `silk.hmac` when the protocol needs a message authentication tag.

## Details
`extract` returns a fixed-size pseudorandom key. `expand` borrows that key and context bytes,
then fills caller-owned output. These operations allocate no memory.

## Gotchas
HKDF is not a password-hashing function. These actors provide no protocol labels or secret-erasure guarantee.
Expansion rejects output beyond 255 digest blocks with [`OutputTooLongError`](#OutputTooLongError) before any output write.

Import as `HkdfSha256` with `import silk.hkdf { HkdfSha256 }`.

Public declarations: 3.

::Anchor{id="OutputTooLongError"}

## `OutputTooLongError`

```silk
pub struct OutputTooLongError
```

An HKDF output request that exceeds the selected hash's 255-block limit.

::Anchor{id="OutputTooLongError.requested"}

### Field `requested`

```silk
pub requested: usize
```

The requested output length in bytes.

::Anchor{id="OutputTooLongError.maximum"}

### Field `maximum`

```silk
pub maximum: usize
```

The maximum output length in bytes for the selected hash.

::Anchor{id="HkdfSha256"}

## `HkdfSha256`

```silk
pub struct HkdfSha256
```

HKDF-SHA-256 extraction and expansion with a 32-byte pseudorandom key.

::Anchor{id="HkdfSha256.impl"}

## Implementation `HkdfSha256`

```silk
impl HkdfSha256
```

::Anchor{id="HkdfSha256.impl.extract"}

### Associated function `extract`

```silk
pub fn extract(salt: &[u8], ikm: &[u8]) -> [u8; 32]
```

Returns a 32-byte pseudorandom key from borrowed salt and input key material.

#### Details

An empty salt is equivalent to 32 zero bytes. Empty input key material is valid.
Use the result with `HkdfSha256.expand` and protocol-specific context bytes.

#### Gotchas

If the salt exceeds the 64-bit bit-length domain, the program traps.
If the input plus the 64-byte HMAC pad exceeds that domain, the program traps.

::Anchor{id="HkdfSha256.impl.expand"}

### Associated function `expand`

```silk
pub fn expand(prk: &([u8; 32]), info: &[u8], output: &mut [u8]) -> Result<(), OutputTooLongError>
```

Writes the requested HKDF-SHA-256 output prefix, or returns an error without changing output.

#### Details

`prk` must be a pseudorandom key from extraction or an equivalently strong key source.
Empty `info` and zero output length are valid. Lengths through 8160 bytes succeed.
Larger lengths return `OutputTooLongError` with the requested length and maximum 8160.

#### Gotchas

If the HMAC input exceeds the 64-bit bit-length domain, the program traps.
That input includes the 64-byte pad, previous digest, `info`, and one counter byte.

::Anchor{id="HkdfSha384"}

## `HkdfSha384`

```silk
pub struct HkdfSha384
```

HKDF-SHA-384 extraction and expansion with a 48-byte pseudorandom key.

::Anchor{id="HkdfSha384.impl"}

## Implementation `HkdfSha384`

```silk
impl HkdfSha384
```

::Anchor{id="HkdfSha384.impl.extract"}

### Associated function `extract`

```silk
pub fn extract(salt: &[u8], ikm: &[u8]) -> [u8; 48]
```

Returns a 48-byte pseudorandom key from borrowed salt and input key material.

#### Details

An empty salt is equivalent to 48 zero bytes. Empty input key material is valid.
Use the result with `HkdfSha384.expand` and protocol-specific context bytes.

#### Gotchas

If the salt exceeds the 128-bit bit-length domain, the program traps.
If the input plus the 128-byte HMAC pad exceeds that domain, the program traps.

::Anchor{id="HkdfSha384.impl.expand"}

### Associated function `expand`

```silk
pub fn expand(prk: &([u8; 48]), info: &[u8], output: &mut [u8]) -> Result<(), OutputTooLongError>
```

Writes the requested HKDF-SHA-384 output prefix, or returns an error without changing output.

#### Details

`prk` must be a pseudorandom key from extraction or an equivalently strong key source.
Empty `info` and zero output length are valid. Lengths through 12240 bytes succeed.
Larger lengths return `OutputTooLongError` with the requested length and maximum 12240.

#### Gotchas

If the HMAC input exceeds the 128-bit bit-length domain, the program traps.
That input includes the 128-byte pad, previous digest, `info`, and one counter byte.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
