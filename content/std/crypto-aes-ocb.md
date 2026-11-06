Encrypt and authenticate data with AES-OCB3 (RFC 7253), for a message in parts.

## When to use
Use [`AesOcbEncryptor`](#AesOcbEncryptor) and [`AesOcbDecryptor`](#AesOcbDecryptor) where a protocol names OCB, or for Node's
`aes-128-ocb`. For new designs, `silk.crypto.aes_gcm` is the common choice.

## Details
The key is 16, 24, or 32 bytes, the nonce 1 to 15 bytes, and the tag 1 to 16 bytes. The tag
length is fixed when the value is made, because OCB mixes it into the nonce. The associated
data (`aad`) is authenticated but not encrypted. `update` writes the ciphertext of every
complete 16-byte block and keeps a partial block, so [`AesOcbEncryptor.updateLength`](#AesOcbEncryptor.impl.updateLength) says how
many bytes a call writes. `finish` writes the rest. Nothing allocates.

## Errors
The functions return an [`AesOcbError`](#AesOcbError). All checks come before the first write, and on any
error the output buffers do not change.

## Gotchas
The same key and nonce must never encrypt two messages. [`AesOcbDecryptor.update`](#AesOcbDecryptor.impl.update) writes
plaintext before the tag is checked: do not use it until [`AesOcbDecryptor.finish`](#AesOcbDecryptor.impl.finish) succeeds. A
message is at most 2^32 blocks. The values do not erase their copies of the key.

## Examples
### Encrypt and decrypt
```silk
import silk.crypto.aes_ocb { AesOcbDecryptor, AesOcbEncryptor, AesOcbError }
import silk.core.result { Result }

pub fn main() -> i32 {
  let key: [u8; 16] = [4; 16]
  let nonce: [u8; 12] = [8; 12]
  let mut encryptor = match AesOcbEncryptor.make(&key, &nonce, b"v1", 16) {
    Result<AesOcbEncryptor, AesOcbError>.Success { value } => move value
    Result<AesOcbEncryptor, AesOcbError>.Failure { error: _ } => { return 1 }
  }
  let mut ciphertext: [u8; 5] = [0; 5]
  let mut tag: [u8; 16] = [0; 16]
  // Five bytes are less than a block, so update writes nothing and finish writes them.
  if let Result.Failure { error: _ } = encryptor.update(b"hello", &mut ciphertext) { return 1 }
  if let Result.Failure { error: _ } = encryptor.finish(&mut ciphertext, &mut tag) { return 1 }
  let mut decryptor = match AesOcbDecryptor.make(&key, &nonce, b"v1", 16) {
    Result<AesOcbDecryptor, AesOcbError>.Success { value } => move value
    Result<AesOcbDecryptor, AesOcbError>.Failure { error: _ } => { return 1 }
  }
  let mut plaintext: [u8; 5] = [0; 5]
  if let Result.Failure { error: _ } = decryptor.update(&ciphertext, &mut plaintext) { return 1 }
  return match decryptor.finish(&mut plaintext, &tag) {
    Result<usize, AesOcbError>.Success { value } => if value == 5 && plaintext[0] == 104 { 0 } else { 1 }
    Result<usize, AesOcbError>.Failure { error: _ } => 1
  }
}
```

Import as `AesOcbEncryptor` with `import silk.crypto.aes_ocb { AesOcbEncryptor }`.

Public declarations: 3.

::Anchor{id="AesOcbError"}

## `AesOcbError`

```silk
pub enum AesOcbError
```

The reason that an OCB call was rejected. The checks run in the order of the variants, and the
first failure is returned.

::Anchor{id="AesOcbError.InvalidKeyLength"}

### `InvalidKeyLength`

```silk
InvalidKeyLength
```

The key is not 16, 24, or 32 bytes.

::Anchor{id="AesOcbError.InvalidNonceLength"}

### `InvalidNonceLength`

```silk
InvalidNonceLength
```

The nonce is not 1 to 15 bytes.

::Anchor{id="AesOcbError.InvalidTagLength"}

### `InvalidTagLength`

```silk
InvalidTagLength
```

The tag length is not 1 to 16 bytes, or a tag buffer does not have that length.

::Anchor{id="AesOcbError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output is shorter than the bytes the call writes.

::Anchor{id="AesOcbError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The message is longer than 2^32 blocks.

::Anchor{id="AesOcbError.AuthenticationFailed"}

### `AuthenticationFailed`

```silk
AuthenticationFailed
```

The tag is not correct for the key, nonce, associated data, and ciphertext.

::Anchor{id="AesOcbError.impl.Debug"}

## Implementation `Debug for AesOcbError`

```silk
impl Debug for AesOcbError
```

::Anchor{id="AesOcbError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidKeyLength`.

::Anchor{id="AesOcbEncryptor"}

## `AesOcbEncryptor`

```silk
pub struct AesOcbEncryptor
```

A streaming AES-OCB3 encryptor (RFC 7253).

### Details

Make one with [`AesOcbEncryptor.make`](#AesOcbEncryptor.impl.make), give the message with [`AesOcbEncryptor.update`](#AesOcbEncryptor.impl.update), then
call [`AesOcbEncryptor.finish`](#AesOcbEncryptor.impl.finish) for the last partial block and the tag. Any split of the
message gives the same result. Nothing allocates.

### Gotchas

The same key and nonce must never encrypt two messages. The value holds key material and is not
erased when it is dropped.

::Anchor{id="AesOcbEncryptor.impl"}

## Implementation `AesOcbEncryptor`

```silk
impl AesOcbEncryptor
```

::Anchor{id="AesOcbEncryptor.impl.make"}

### Associated function `make`

```silk
pub fn make(key: &[u8], nonce: &[u8], aad: &[u8], tagLength: usize) -> Result<AesOcbEncryptor, AesOcbError>
```

Returns an encryptor for `key` and `nonce` that authenticates `aad` and makes a tag of
`tagLength` bytes.

#### Errors

- `InvalidKeyLength` if `key` is not 16, 24, or 32 bytes.
- `InvalidNonceLength` if `nonce` is not 1 to 15 bytes.
- `InvalidTagLength` if `tagLength` is not 1 to 16.

::Anchor{id="AesOcbEncryptor.impl.updateLength"}

### Method `updateLength`

```silk
pub fn updateLength(self: &Self, length: usize) -> usize
```

Returns how many bytes [`AesOcbEncryptor.update`](#AesOcbEncryptor.impl.update) writes for `length` more input bytes: every
complete 16-byte block.

::Anchor{id="AesOcbEncryptor.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, plaintext: &[u8], ciphertext: &mut [u8]) -> Result<usize, AesOcbError>
```

Encrypts the complete blocks of the buffered bytes and `plaintext` into `ciphertext` and
returns how many bytes it wrote. A partial block stays buffered.

#### Errors

On an error the state and `ciphertext` do not change.

- `OutputTooSmall` if `ciphertext` is shorter than [`AesOcbEncryptor.updateLength`](#AesOcbEncryptor.impl.updateLength).
- `LimitExceeded` if the message grows past 2^32 blocks.

::Anchor{id="AesOcbEncryptor.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self, ciphertext: &mut [u8], tag: &mut [u8]) -> Result<usize, AesOcbError>
```

Encrypts the buffered partial block into `ciphertext`, writes the tag to `tag`, and returns
how many ciphertext bytes it wrote (0 to 15).

#### Errors

- `InvalidTagLength` if `tag` is not the tag length given to [`AesOcbEncryptor.make`](#AesOcbEncryptor.impl.make).
- `OutputTooSmall` if `ciphertext` is shorter than the buffered bytes.

::Anchor{id="AesOcbDecryptor"}

## `AesOcbDecryptor`

```silk
pub struct AesOcbDecryptor
```

A streaming AES-OCB3 decryptor (RFC 7253).

### Details

Make one with [`AesOcbDecryptor.make`](#AesOcbDecryptor.impl.make), give the ciphertext with [`AesOcbDecryptor.update`](#AesOcbDecryptor.impl.update),
then call [`AesOcbDecryptor.finish`](#AesOcbDecryptor.impl.finish) with the received tag. Nothing allocates.

### Gotchas

[`AesOcbDecryptor.update`](#AesOcbDecryptor.impl.update) writes plaintext before the tag is checked. Do not use or release it
until [`AesOcbDecryptor.finish`](#AesOcbDecryptor.impl.finish) succeeds. The value holds key material and is not erased when it
is dropped.

::Anchor{id="AesOcbDecryptor.impl"}

## Implementation `AesOcbDecryptor`

```silk
impl AesOcbDecryptor
```

::Anchor{id="AesOcbDecryptor.impl.make"}

### Associated function `make`

```silk
pub fn make(key: &[u8], nonce: &[u8], aad: &[u8], tagLength: usize) -> Result<AesOcbDecryptor, AesOcbError>
```

Returns a decryptor for `key` and `nonce` that authenticates `aad` and checks a tag of
`tagLength` bytes.

#### Errors

- `InvalidKeyLength` if `key` is not 16, 24, or 32 bytes.
- `InvalidNonceLength` if `nonce` is not 1 to 15 bytes.
- `InvalidTagLength` if `tagLength` is not 1 to 16.

::Anchor{id="AesOcbDecryptor.impl.updateLength"}

### Method `updateLength`

```silk
pub fn updateLength(self: &Self, length: usize) -> usize
```

Returns how many bytes [`AesOcbDecryptor.update`](#AesOcbDecryptor.impl.update) writes for `length` more input bytes: every
complete 16-byte block.

::Anchor{id="AesOcbDecryptor.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, ciphertext: &[u8], plaintext: &mut [u8]) -> Result<usize, AesOcbError>
```

Decrypts the complete blocks of the buffered bytes and `ciphertext` into `plaintext` and
returns how many bytes it wrote. The plaintext is not authenticated until
[`AesOcbDecryptor.finish`](#AesOcbDecryptor.impl.finish) succeeds.

#### Errors

On an error the state and `plaintext` do not change.

- `OutputTooSmall` if `plaintext` is shorter than [`AesOcbDecryptor.updateLength`](#AesOcbDecryptor.impl.updateLength).
- `LimitExceeded` if the ciphertext grows past 2^32 blocks.

::Anchor{id="AesOcbDecryptor.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self, plaintext: &mut [u8], tag: &[u8]) -> Result<usize, AesOcbError>
```

Decrypts the buffered partial block into `plaintext`, checks `tag`, and returns how many
plaintext bytes it wrote (0 to 15).

#### Errors

- `InvalidTagLength` if `tag` is not the tag length given to [`AesOcbDecryptor.make`](#AesOcbDecryptor.impl.make).
- `OutputTooSmall` if `plaintext` is shorter than the buffered bytes.
- `AuthenticationFailed` if the tag is not correct. Discard all plaintext this value wrote.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
