Portable HMAC authentication with SHA-256 and SHA-384.

## When to use
Use [`HmacSha256`](#HmacSha256) or [`HmacSha384`](#HmacSha384) when a protocol requires a keyed authentication tag.
Use `silk.hkdf` to derive keys from secret input material.

## Details
Each actor supports `make`, incremental `update`, consuming `finish`, and one-shot
`authenticate`. Inputs are borrowed. States use fixed storage and allocate no memory.

## Gotchas
These actors compute tags but do not verify them or provide constant-time comparison.
Secret state is not guaranteed to be erased. The SHA input limit includes the initial key pad.

Import as `HmacSha256` with `import silk.hmac { HmacSha256 }`.

Public declarations: 2.

::Anchor{id="HmacSha256"}

## `HmacSha256`

```silk
pub struct HmacSha256
```

An incremental HMAC-SHA-256 state that returns a 32-byte authentication tag.

### Details

The state owns fixed storage. `finish` consumes the state. Secret state is not guaranteed to be erased.

::Anchor{id="HmacSha256.impl"}

## Implementation `HmacSha256`

```silk
impl HmacSha256
```

::Anchor{id="HmacSha256.impl.make"}

### Associated function `make`

```silk
pub fn make(key: &[u8]) -> HmacSha256
```

Creates an HMAC-SHA-256 state from a borrowed key. An empty key is valid.

#### Details

Keys longer than 64 bytes are hashed before use. The state does not retain the input borrow.

#### Gotchas

If the key exceeds the SHA-256 64-bit bit-length domain, the program traps.

::Anchor{id="HmacSha256.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, bytes: &[u8]) -> ()
```

Adds borrowed bytes to the HMAC-SHA-256 message in order. An empty update has no effect.

#### Details

Any segmentation of the same message produces the same tag.

#### Gotchas

If the message plus the 64-byte key pad exceeds the 64-bit bit-length domain, the program traps.

::Anchor{id="HmacSha256.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self) -> [u8; 32]
```

Consumes the HMAC-SHA-256 state and returns its complete 32-byte authentication tag.

::Anchor{id="HmacSha256.impl.authenticate"}

### Associated function `authenticate`

```silk
pub fn authenticate(key: &[u8], message: &[u8]) -> [u8; 32]
```

Returns the complete 32-byte HMAC-SHA-256 tag for a borrowed key and message.

#### Details

Empty keys and messages are valid. This operation computes a tag; it does not verify a received tag.

#### Gotchas

If the key exceeds the 64-bit bit-length domain, the program traps.
If the message plus the 64-byte key pad exceeds that domain, the program traps.

::Anchor{id="HmacSha384"}

## `HmacSha384`

```silk
pub struct HmacSha384
```

An incremental HMAC-SHA-384 state that returns a 48-byte authentication tag.

### Details

The state owns fixed storage. `finish` consumes the state. Secret state is not guaranteed to be erased.

::Anchor{id="HmacSha384.impl"}

## Implementation `HmacSha384`

```silk
impl HmacSha384
```

::Anchor{id="HmacSha384.impl.make"}

### Associated function `make`

```silk
pub fn make(key: &[u8]) -> HmacSha384
```

Creates an HMAC-SHA-384 state from a borrowed key. An empty key is valid.

#### Details

Keys longer than 128 bytes are hashed before use. The state does not retain the input borrow.

#### Gotchas

If the key exceeds the SHA-384 128-bit bit-length domain, the program traps.

::Anchor{id="HmacSha384.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, bytes: &[u8]) -> ()
```

Adds borrowed bytes to the HMAC-SHA-384 message in order. An empty update has no effect.

#### Details

Any segmentation of the same message produces the same tag.

#### Gotchas

If the message plus the 128-byte key pad exceeds the 128-bit bit-length domain, the program traps.

::Anchor{id="HmacSha384.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self) -> [u8; 48]
```

Consumes the HMAC-SHA-384 state and returns its complete 48-byte authentication tag.

::Anchor{id="HmacSha384.impl.authenticate"}

### Associated function `authenticate`

```silk
pub fn authenticate(key: &[u8], message: &[u8]) -> [u8; 48]
```

Returns the complete 48-byte HMAC-SHA-384 tag for a borrowed key and message.

#### Details

Empty keys and messages are valid. This operation computes a tag; it does not verify a received tag.

#### Gotchas

If the key exceeds the 128-bit bit-length domain, the program traps.
If the message plus the 128-byte key pad exceeds that domain, the program traps.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
