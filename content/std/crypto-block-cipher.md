Run any block cipher in the standard modes: ECB, CBC, CTR, CFB, CFB-8, CFB-1, and OFB.

## When to use
Use these modes with a cipher that conforms to [`BlockCipher`](#BlockCipher), such as `silk.crypto.sm4`,
`silk.crypto.aria`, `silk.crypto.camellia`, or `silk.crypto.des`, when a format or a name such
as `sm4-cbc` or `des-ede3-cfb8` in OpenSSL or Node.js asks for one. None of the modes detect
changes to the ciphertext. For new designs, use `silk.crypto.aes_gcm` or
`silk.crypto.chacha20_poly1305`. AES has its own faster mode types in `silk.crypto.aes`.

## Details
A cipher has a block of 8 or 16 bytes, and the IV of each mode is one block. Each mode takes the
cipher by value, so make the cipher first, for example with `Sm4.make`. [`Ecb`](#Ecb) and [`Cbc`](#Cbc)
buffer partial blocks and can add and remove PKCS #7 padding, with `updateLength`, `update`, and
`finish` as in `silk.crypto.aes`. [`Ctr`](#Ctr), [`Cfb`](#Cfb), [`Cfb8`](#Cfb8), [`Cfb1`](#Cfb1), and [`Ofb`](#Ofb) are stream
modes: `apply` writes one output byte for each input byte, and the output does not depend on how
the input was split. CTR counts with the whole block as one big-endian number, as OpenSSL does.
CFB-1 handles whole bytes, most significant bit first. Nothing allocates.

## Errors
The functions return a [`BlockCipherError`](#BlockCipherError). On an error the output does not change, and the
state does not change.

## Gotchas
Never use one key and IV for two messages in CTR, CFB, or OFB: the XOR of the ciphertexts gives
away the XOR of the plaintexts. A wrong padding error from a CBC decryptor can act as an oracle,
so authenticate the ciphertext first. The mode values hold key material and are not erased when
they are dropped.

## Examples
### Encrypt with SM4-CBC
```silk
import silk.crypto.block_cipher { BlockCipherError, Cbc }
import silk.crypto.sm4 { Sm4 }
import silk.core.result { Result }

pub fn main() -> i32 {
  let key: [u8; 16] = [1; 16]
  let iv: [u8; 16] = [2; 16]
  let cipher = match Sm4.make(&key) {
    Result<Sm4, BlockCipherError>.Success { value } => move value
    Result<Sm4, BlockCipherError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut encryptor = match Cbc<Sm4>.encryptor(move cipher, &iv, true) {
    Result<Cbc<Sm4>, BlockCipherError>.Success { value } => move value
    Result<Cbc<Sm4>, BlockCipherError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut ciphertext: [u8; 16] = [0; 16]
  let written = match encryptor.update(b"hello", &mut ciphertext) {
    Result<usize, BlockCipherError>.Success { value } => value
    Result<usize, BlockCipherError>.Failure { error: _ } => {
      return 1
    }
  }
  // Five bytes are kept until `finish`, which pads them to one block.
  if written != 0 {
    return 1
  }
  let last = match encryptor.finish(&mut ciphertext) {
    Result<usize, BlockCipherError>.Success { value } => value
    Result<usize, BlockCipherError>.Failure { error: _ } => {
      return 1
    }
  }
  if last != 16 {
    return 1
  }
  return 0
}
```

Import as `BlockCipher` with `import silk.crypto.block_cipher { BlockCipher }`.

Public declarations: 9.

::Anchor{id="BlockCipher"}

## `BlockCipher`

```silk
pub interface BlockCipher
```

A block cipher that the modes of this module can run.

### Details

The block is 8 or 16 bytes. The functions take a 16-byte array and use only its first
`blockLength` bytes; the rest do not change.

::Anchor{id="BlockCipher.blockLength"}

### Operation `blockLength`

```silk
fn blockLength(self: &Self) -> usize
```

Returns the block length in bytes, 8 or 16.

::Anchor{id="BlockCipher.encryptBlock"}

### Operation `encryptBlock`

```silk
fn encryptBlock(self: &Self, block: &mut [u8; 16]) -> ()
```

Encrypts the first `blockLength` bytes of `block` in place.

::Anchor{id="BlockCipher.decryptBlock"}

### Operation `decryptBlock`

```silk
fn decryptBlock(self: &Self, block: &mut [u8; 16]) -> ()
```

Decrypts the first `blockLength` bytes of `block` in place.

::Anchor{id="BlockCipherError"}

## `BlockCipherError`

```silk
pub union BlockCipherError
```

The reason that a block cipher or mode function rejected a call. The output and the state do
not change.

::Anchor{id="BlockCipherError.InvalidKeyLength"}

### `InvalidKeyLength`

```silk
InvalidKeyLength
```

The key length is not one that the cipher takes.

::Anchor{id="BlockCipherError.InvalidIvLength"}

### `InvalidIvLength`

```silk
InvalidIvLength
```

The IV is not one block long.

::Anchor{id="BlockCipherError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer is shorter than the bytes the call writes.

::Anchor{id="BlockCipherError.InvalidInputLength"}

### `InvalidInputLength`

```silk
InvalidInputLength
```

Without padding, the message is not a whole number of blocks. With padding, the ciphertext
given to a decryptor is not a whole number of blocks.

::Anchor{id="BlockCipherError.InvalidPadding"}

### `InvalidPadding`

```silk
InvalidPadding
```

The last decrypted block does not end in valid PKCS #7 padding. The key or IV is wrong, or the
ciphertext was changed.

::Anchor{id="BlockCipherError.impl.Debug"}

## Implementation `Debug for BlockCipherError`

```silk
impl Debug for BlockCipherError
```

::Anchor{id="BlockCipherError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidKeyLength`.

::Anchor{id="Ecb"}

## `Ecb`

```silk
pub struct Ecb<C>
```

A streaming ECB encryptor or decryptor over the cipher `C`, with or without PKCS #7 padding.

### When to use

Use it only when a format requires ECB, such as `sm4-ecb` or `des-ede3-ecb`. ECB encrypts equal
blocks to equal blocks, so it shows patterns in the data.

### Details

Make one with [`Ecb.encryptor`](#Ecb.impl.encryptor) or [`Ecb.decryptor`](#Ecb.impl.decryptor), call [`Ecb.update`](#Ecb.impl.update) for each part of the
input, then [`Ecb.finish`](#Ecb.impl.finish). `update` writes whole blocks and keeps the rest. With padding on, a
decryptor keeps the last whole block until `finish`, which checks and removes the padding.

::Anchor{id="Ecb.impl"}

## Implementation `Ecb<C>`

```silk
impl<C: BlockCipher> Ecb<C>
```

::Anchor{id="Ecb.impl.encryptor"}

### Associated function `encryptor`

```silk
pub fn encryptor(cipher: C, padding: bool) -> Ecb<C>
```

Returns an encryptor that owns `cipher`. With `padding`, [`Ecb.finish`](#Ecb.impl.finish) adds PKCS #7 padding,
so any message length is valid.

::Anchor{id="Ecb.impl.decryptor"}

### Associated function `decryptor`

```silk
pub fn decryptor(cipher: C, padding: bool) -> Ecb<C>
```

Returns a decryptor that owns `cipher`. With `padding`, [`Ecb.finish`](#Ecb.impl.finish) checks and removes
PKCS #7 padding.

::Anchor{id="Ecb.impl.updateLength"}

### Method `updateLength`

```silk
pub fn updateLength(self: &Self, length: usize) -> usize
```

Returns the number of bytes that [`Ecb.update`](#Ecb.impl.update) writes for `length` more input bytes.

It is the number of whole blocks in the kept bytes plus the input. A decryptor with padding
keeps back its last whole block.

::Anchor{id="Ecb.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<usize, BlockCipherError>
```

Encrypts or decrypts the whole blocks of the kept bytes plus `input` into `output`, keeps the
rest, and returns the number of bytes written, which is [`Ecb.updateLength`](#Ecb.impl.updateLength) of
`input.length`. The bytes of `output` after it do not change. `input` and `output` must not
overlap.

#### Errors

- `OutputTooSmall` if `output` is shorter than [`Ecb.updateLength`](#Ecb.impl.updateLength).

::Anchor{id="Ecb.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self, output: &mut [u8]) -> Result<usize, BlockCipherError>
```

Ends the message, writes the last bytes to `output`, returns their number, and consumes the
state.

An encryptor with padding writes one block. A decryptor with padding writes the last block
without its padding. Without padding, it writes nothing.

#### Errors

- `InvalidInputLength` without padding if the message is not a whole number of blocks, or for
  a decryptor with padding if the ciphertext is not a whole number of blocks.
- `InvalidPadding` for a decryptor with padding if the last block does not end in valid
  PKCS #7 padding.
- `OutputTooSmall` if `output` is shorter than the bytes to write.

::Anchor{id="Cbc"}

## `Cbc`

```silk
pub struct Cbc<C>
```

A streaming CBC encryptor or decryptor over the cipher `C` (NIST SP 800-38A), with or without
PKCS #7 padding.

### When to use

Use it when a format names CBC with this cipher, such as `sm4-cbc`, `camellia-256-cbc`, or
`des-ede3-cbc`.

### Details

Make one with [`Cbc.encryptor`](#Cbc.impl.encryptor) or [`Cbc.decryptor`](#Cbc.impl.decryptor), call [`Cbc.update`](#Cbc.impl.update) for each part of the
input, then [`Cbc.finish`](#Cbc.impl.finish). `update` writes whole blocks and keeps the rest. With padding on, a
decryptor keeps the last whole block until `finish`, which checks and removes the padding. The
IV is one block.

### Gotchas

Use a new random IV for each message under the same key.

::Anchor{id="Cbc.impl"}

## Implementation `Cbc<C>`

```silk
impl<C: BlockCipher> Cbc<C>
```

::Anchor{id="Cbc.impl.encryptor"}

### Associated function `encryptor`

```silk
pub fn encryptor(cipher: C, iv: &[u8], padding: bool) -> Result<Cbc<C>, BlockCipherError>
```

Returns an encryptor that owns `cipher`, for `iv`. With `padding`, [`Cbc.finish`](#Cbc.impl.finish) adds
PKCS #7 padding, so any message length is valid.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cbc.impl.decryptor"}

### Associated function `decryptor`

```silk
pub fn decryptor(cipher: C, iv: &[u8], padding: bool) -> Result<Cbc<C>, BlockCipherError>
```

Returns a decryptor that owns `cipher`, for `iv`. With `padding`, [`Cbc.finish`](#Cbc.impl.finish) checks and
removes PKCS #7 padding.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cbc.impl.updateLength"}

### Method `updateLength`

```silk
pub fn updateLength(self: &Self, length: usize) -> usize
```

Returns the number of bytes that [`Cbc.update`](#Cbc.impl.update) writes for `length` more input bytes.

It is the number of whole blocks in the kept bytes plus the input. A decryptor with padding
keeps back its last whole block.

::Anchor{id="Cbc.impl.update"}

### Method `update`

```silk
pub fn update(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<usize, BlockCipherError>
```

Encrypts or decrypts the whole blocks of the kept bytes plus `input` into `output`, keeps the
rest, and returns the number of bytes written, which is [`Cbc.updateLength`](#Cbc.impl.updateLength) of
`input.length`. The bytes of `output` after it do not change. `input` and `output` must not
overlap.

#### Errors

- `OutputTooSmall` if `output` is shorter than [`Cbc.updateLength`](#Cbc.impl.updateLength).

::Anchor{id="Cbc.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: Self, output: &mut [u8]) -> Result<usize, BlockCipherError>
```

Ends the message, writes the last bytes to `output`, returns their number, and consumes the
state.

An encryptor with padding writes one block. A decryptor with padding writes the last block
without its padding. Without padding, it writes nothing.

#### Errors

- `InvalidInputLength` without padding if the message is not a whole number of blocks, or for
  a decryptor with padding if the ciphertext is not a whole number of blocks.
- `InvalidPadding` for a decryptor with padding if the last block does not end in valid
  PKCS #7 padding.
- `OutputTooSmall` if `output` is shorter than the bytes to write.

::Anchor{id="Ctr"}

## `Ctr`

```silk
pub struct Ctr<C>
```

A CTR key stream over the cipher `C` (NIST SP 800-38A). The same call encrypts and decrypts.

### When to use

Use it when a format names CTR with this cipher, such as `sm4-ctr` or `aria-128-ctr`.

### Details

The IV is the first counter block. The counter is the whole block as one big-endian number and
wraps to zero after all ones, as OpenSSL does.

::Anchor{id="Ctr.impl"}

## Implementation `Ctr<C>`

```silk
impl<C: BlockCipher> Ctr<C>
```

::Anchor{id="Ctr.impl.make"}

### Associated function `make`

```silk
pub fn make(cipher: C, iv: &[u8]) -> Result<Ctr<C>, BlockCipherError>
```

Returns a key stream that owns `cipher`, starting at the counter block `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Ctr.impl.apply"}

### Method `apply`

```silk
pub fn apply(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<(), BlockCipherError>
```

Writes `input` XOR the next `input.length` key stream bytes to the first `input.length`
bytes of `output`.

#### Errors

- `OutputTooSmall` if `output` is shorter than `input`.

::Anchor{id="Cfb"}

## `Cfb`

```silk
pub struct Cfb<C>
```

A CFB encryptor or decryptor with full-block feedback over the cipher `C` (NIST SP 800-38A).

### When to use

Use it when a format names CFB with this cipher, such as `sm4-cfb` or `des-ede3-cfb`, which is
CFB with feedback of one block.

::Anchor{id="Cfb.impl"}

## Implementation `Cfb<C>`

```silk
impl<C: BlockCipher> Cfb<C>
```

::Anchor{id="Cfb.impl.encryptor"}

### Associated function `encryptor`

```silk
pub fn encryptor(cipher: C, iv: &[u8]) -> Result<Cfb<C>, BlockCipherError>
```

Returns an encryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb.impl.decryptor"}

### Associated function `decryptor`

```silk
pub fn decryptor(cipher: C, iv: &[u8]) -> Result<Cfb<C>, BlockCipherError>
```

Returns a decryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb.impl.apply"}

### Method `apply`

```silk
pub fn apply(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<(), BlockCipherError>
```

Encrypts or decrypts `input` into the first `input.length` bytes of `output`.

#### Errors

- `OutputTooSmall` if `output` is shorter than `input`.

::Anchor{id="Cfb8"}

## `Cfb8`

```silk
pub struct Cfb8<C>
```

A CFB encryptor or decryptor with 8-bit feedback over the cipher `C` (NIST SP 800-38A).

### When to use

Use it when a format names CFB-8 with this cipher, such as `aria-128-cfb8` or `des-ede3-cfb8`.

### Details

Each byte costs one block encryption.

::Anchor{id="Cfb8.impl"}

## Implementation `Cfb8<C>`

```silk
impl<C: BlockCipher> Cfb8<C>
```

::Anchor{id="Cfb8.impl.encryptor"}

### Associated function `encryptor`

```silk
pub fn encryptor(cipher: C, iv: &[u8]) -> Result<Cfb8<C>, BlockCipherError>
```

Returns an encryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb8.impl.decryptor"}

### Associated function `decryptor`

```silk
pub fn decryptor(cipher: C, iv: &[u8]) -> Result<Cfb8<C>, BlockCipherError>
```

Returns a decryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb8.impl.apply"}

### Method `apply`

```silk
pub fn apply(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<(), BlockCipherError>
```

Encrypts or decrypts `input` into the first `input.length` bytes of `output`.

#### Errors

- `OutputTooSmall` if `output` is shorter than `input`.

::Anchor{id="Cfb1"}

## `Cfb1`

```silk
pub struct Cfb1<C>
```

A CFB encryptor or decryptor with 1-bit feedback over the cipher `C` (NIST SP 800-38A).

### When to use

Use it when a format names CFB-1 with this cipher, such as `camellia-128-cfb1` or
`des-ede3-cfb1`.

### Details

It handles whole bytes, most significant bit first, as OpenSSL does for a length in bytes. Each
bit costs one block encryption.

::Anchor{id="Cfb1.impl"}

## Implementation `Cfb1<C>`

```silk
impl<C: BlockCipher> Cfb1<C>
```

::Anchor{id="Cfb1.impl.encryptor"}

### Associated function `encryptor`

```silk
pub fn encryptor(cipher: C, iv: &[u8]) -> Result<Cfb1<C>, BlockCipherError>
```

Returns an encryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb1.impl.decryptor"}

### Associated function `decryptor`

```silk
pub fn decryptor(cipher: C, iv: &[u8]) -> Result<Cfb1<C>, BlockCipherError>
```

Returns a decryptor that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Cfb1.impl.apply"}

### Method `apply`

```silk
pub fn apply(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<(), BlockCipherError>
```

Encrypts or decrypts `input` into the first `input.length` bytes of `output`.

#### Errors

- `OutputTooSmall` if `output` is shorter than `input`.

::Anchor{id="Ofb"}

## `Ofb`

```silk
pub struct Ofb<C>
```

An OFB key stream over the cipher `C` (NIST SP 800-38A). The same call encrypts and decrypts.

### When to use

Use it when a format names OFB with this cipher, such as `sm4-ofb` or `des-ede3-ofb`.

::Anchor{id="Ofb.impl"}

## Implementation `Ofb<C>`

```silk
impl<C: BlockCipher> Ofb<C>
```

::Anchor{id="Ofb.impl.make"}

### Associated function `make`

```silk
pub fn make(cipher: C, iv: &[u8]) -> Result<Ofb<C>, BlockCipherError>
```

Returns a key stream that owns `cipher`, for `iv`.

#### Errors

- `InvalidIvLength` if `iv` is not one block.

::Anchor{id="Ofb.impl.apply"}

### Method `apply`

```silk
pub fn apply(self: &mut Self, input: &[u8], output: &mut [u8]) -> Result<(), BlockCipherError>
```

Writes `input` XOR the next `input.length` key stream bytes to the first `input.length`
bytes of `output`.

#### Errors

- `OutputTooSmall` if `output` is shorter than `input`.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
