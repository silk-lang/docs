Encrypt and decrypt private keys in the PKCS #8 `EncryptedPrivateKeyInfo` format with PBES2
(RFC 8018, RFC 5958).

## When to use
Use [`EncryptedPkcs8`](#EncryptedPkcs8) for an `-----BEGIN ENCRYPTED PRIVATE KEY-----` block, such as the input
of `createPrivateKey` with a passphrase in Node.js, or the output of `export` with `type:
'pkcs8'` and a cipher. Find and decode the PEM block with `silk.encoding.pem`, and read the
decrypted `PrivateKeyInfo` with the key modules, such as `RsaPrivateKey.fromPkcs8Der`.

## Details
PBES2 derives the key from the password with PBKDF2 and encrypts the DER with a CBC cipher and
PKCS #7 padding. The PRF is HMAC with SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA-512/224, or
SHA-512/256 ([`Pbes2Prf`](#Pbes2Prf)), and the cipher is AES-128, AES-192, or AES-256 in CBC mode, or Triple
DES in CBC mode ([`Pbes2Cipher`](#Pbes2Cipher)). These are the choices of OpenSSL's `pkcs8` command. The
caller gives the salt and IV of [`EncryptedPkcs8.encrypt`](#EncryptedPkcs8.impl.encrypt), so this module needs no random
source. Nothing allocates.

## Errors
The functions return a [`Pkcs8Error`](#Pkcs8Error). On an error the output does not change.

## Gotchas
A wrong password usually fails with `WrongPassword`, but about one wrong password in 256 passes
the padding check and returns garbage, so check that the result parses as a key. PBES1, the
PKCS #12 schemes, and scrypt in PBES2 fail with `UnsupportedAlgorithm`. The time grows with the
iteration count, which comes from the input: limit it before decrypting a key from outside.

## Examples
### Encrypt and decrypt a key
```silk
import silk.crypto.pkcs8 { EncryptedPkcs8, Pbes2Cipher, Pbes2Parameters, Pbes2Prf, Pkcs8Error }
import silk.core.result { Result }
import silk.collections.slice { Slice }

pub fn main() -> i32 {
  let key: [u8; 5] = [48, 3, 2, 1, 0]
  let parameters = Pbes2Parameters {
    cipher: Pbes2Cipher.Aes256Cbc,
    prf: Pbes2Prf.HmacSha256,
    iterations: 2048,
    salt: b"saltsalt",
    iv: b"0123456789abcdef",
  }
  let mut sealed: [u8; 160] = [0; 160]
  let length = match EncryptedPkcs8.encrypt(&key, b"secret", &parameters, &mut sealed) {
    Result<usize, Pkcs8Error>.Success { value } => value
    Result<usize, Pkcs8Error>.Failure { error: _ } => {
      return 1
    }
  }
  let mut opened: [u8; 160] = [0; 160]
  let opened_length = match EncryptedPkcs8.decrypt(Slice.view<u8>(&sealed, 0, length), b"secret", &mut opened) {
    Result<usize, Pkcs8Error>.Success { value } => value
    Result<usize, Pkcs8Error>.Failure { error: _ } => {
      return 1
    }
  }
  if opened_length != 5 || opened[0] != 48 {
    return 1
  }
  return 0
}
```

Import as `EncryptedPkcs8` with `import silk.crypto.pkcs8 { EncryptedPkcs8 }`.

Public declarations: 5.

::Anchor{id="Pkcs8Error"}

## `Pkcs8Error`

```silk
pub union Pkcs8Error
```

The reason that an [`EncryptedPkcs8`](#EncryptedPkcs8) function rejected a call. The output does not change.

::Anchor{id="Pkcs8Error.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

The input is not strict DER of an `EncryptedPrivateKeyInfo` with PBES2 parameters.

::Anchor{id="Pkcs8Error.UnsupportedAlgorithm"}

### `UnsupportedAlgorithm`

```silk
UnsupportedAlgorithm
```

The scheme, key derivation, PRF, or cipher is not one that this module supports.

::Anchor{id="Pkcs8Error.WrongPassword"}

### `WrongPassword`

```silk
WrongPassword
```

The decrypted data does not end in valid padding: the password is wrong, or the data was
changed.

::Anchor{id="Pkcs8Error.InvalidParameters"}

### `InvalidParameters`

```silk
InvalidParameters
```

The salt is empty, the iteration count is 0, or the IV is not one cipher block.

::Anchor{id="Pkcs8Error.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer is shorter than the bytes the call writes.

::Anchor{id="Pkcs8Error.impl.Debug"}

## Implementation `Debug for Pkcs8Error`

```silk
impl Debug for Pkcs8Error
```

::Anchor{id="Pkcs8Error.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `WrongPassword`.

::Anchor{id="Pbes2Cipher"}

## `Pbes2Cipher`

```silk
pub enum Pbes2Cipher
```

The CBC ciphers that PBES2 can use here.

::Anchor{id="Pbes2Cipher.Aes128Cbc"}

### `Aes128Cbc`

```silk
Aes128Cbc
```

AES-128 in CBC mode, `aes-128-cbc`.

::Anchor{id="Pbes2Cipher.Aes192Cbc"}

### `Aes192Cbc`

```silk
Aes192Cbc
```

AES-192 in CBC mode, `aes-192-cbc`.

::Anchor{id="Pbes2Cipher.Aes256Cbc"}

### `Aes256Cbc`

```silk
Aes256Cbc
```

AES-256 in CBC mode, `aes-256-cbc`.

::Anchor{id="Pbes2Cipher.TripleDesCbc"}

### `TripleDesCbc`

```silk
TripleDesCbc
```

Triple DES with a 24-byte key in CBC mode, `des-ede3-cbc`.

::Anchor{id="Pbes2Cipher.impl"}

## Implementation `Pbes2Cipher`

```silk
impl Pbes2Cipher
```

::Anchor{id="Pbes2Cipher.impl.keyLength"}

### Method `keyLength`

```silk
pub fn keyLength(self: &Self) -> usize
```

Returns the key length in bytes: 16, 24, 32, or 24.

::Anchor{id="Pbes2Cipher.impl.blockLength"}

### Method `blockLength`

```silk
pub fn blockLength(self: &Self) -> usize
```

Returns the block length in bytes, which is also the IV length: 16 for AES, 8 for Triple DES.

::Anchor{id="Pbes2Prf"}

## `Pbes2Prf`

```silk
pub enum Pbes2Prf
```

The HMAC functions that PBKDF2 can use as its PRF here.

::Anchor{id="Pbes2Prf.HmacSha1"}

### `HmacSha1`

```silk
HmacSha1
```

HMAC-SHA-1, the default when the parameters name no PRF.

::Anchor{id="Pbes2Prf.HmacSha224"}

### `HmacSha224`

```silk
HmacSha224
```

HMAC-SHA-224.

::Anchor{id="Pbes2Prf.HmacSha256"}

### `HmacSha256`

```silk
HmacSha256
```

HMAC-SHA-256, which OpenSSL writes by default.

::Anchor{id="Pbes2Prf.HmacSha384"}

### `HmacSha384`

```silk
HmacSha384
```

HMAC-SHA-384.

::Anchor{id="Pbes2Prf.HmacSha512"}

### `HmacSha512`

```silk
HmacSha512
```

HMAC-SHA-512.

::Anchor{id="Pbes2Prf.HmacSha512_224"}

### `HmacSha512_224`

```silk
HmacSha512_224
```

HMAC-SHA-512/224.

::Anchor{id="Pbes2Prf.HmacSha512_256"}

### `HmacSha512_256`

```silk
HmacSha512_256
```

HMAC-SHA-512/256.

::Anchor{id="Pbes2Prf.impl"}

## Implementation `Pbes2Prf`

```silk
impl Pbes2Prf
```

::Anchor{id="Pbes2Parameters"}

## `Pbes2Parameters`

```silk
pub struct Pbes2Parameters<'a>
```

The choices of [`EncryptedPkcs8.encrypt`](#EncryptedPkcs8.impl.encrypt).

### Details

`salt` should be at least 8 random bytes and `iv` one random cipher block. OpenSSL uses a
16-byte salt and 2048 iterations by default; more iterations make a guessed password cost more.

::Anchor{id="Pbes2Parameters.cipher"}

### Field `cipher`

```silk
pub cipher: Pbes2Cipher
```

The cipher that encrypts the key.

::Anchor{id="Pbes2Parameters.prf"}

### Field `prf`

```silk
pub prf: Pbes2Prf
```

The PRF of PBKDF2.

::Anchor{id="Pbes2Parameters.iterations"}

### Field `iterations`

```silk
pub iterations: u32
```

The PBKDF2 iteration count, at least 1.

::Anchor{id="Pbes2Parameters.salt"}

### Field `salt`

```silk
pub salt: &'a [u8]
```

The PBKDF2 salt, not empty.

::Anchor{id="Pbes2Parameters.iv"}

### Field `iv`

```silk
pub iv: &'a [u8]
```

The CBC IV, one cipher block.

::Anchor{id="EncryptedPkcs8"}

## `EncryptedPkcs8`

```silk
pub struct EncryptedPkcs8
```

Functions that encrypt and decrypt PKCS #8 private keys with PBES2.

::Anchor{id="EncryptedPkcs8.impl"}

## Implementation `EncryptedPkcs8`

```silk
impl EncryptedPkcs8
```

::Anchor{id="EncryptedPkcs8.impl.decrypt"}

### Associated function `decrypt`

```silk
pub fn decrypt(der: &[u8], password: &[u8], output: &mut [u8]) -> Result<usize, Pkcs8Error>
```

Decrypts the `EncryptedPrivateKeyInfo` DER `der` with `password` into `output` and returns
the length of the `PrivateKeyInfo` DER written.

The result is at most [`EncryptedPkcs8.decryptedLength`](#EncryptedPkcs8.impl.decryptedLength) bytes.

#### Errors

- `InvalidEncoding` if `der` is not strict DER of an `EncryptedPrivateKeyInfo` with PBES2
  parameters, or the PBKDF2 key length does not match the cipher.
- `UnsupportedAlgorithm` if the scheme is not PBES2 with PBKDF2, or the PRF or the cipher is
  not one of [`Pbes2Prf`](#Pbes2Prf) and [`Pbes2Cipher`](#Pbes2Cipher).
- `InvalidParameters` if the iteration count is 0 or the IV is not one block.
- `WrongPassword` if the padding is wrong after decryption.
- `OutputTooSmall` if `output` is shorter than the encrypted data.

::Anchor{id="EncryptedPkcs8.impl.decryptedLength"}

### Associated function `decryptedLength`

```silk
pub fn decryptedLength(der: &[u8]) -> usize
```

Returns the most bytes that [`EncryptedPkcs8.decrypt`](#EncryptedPkcs8.impl.decrypt) writes for `der`: the length of its
encrypted data, or 0 if `der` does not parse.

::Anchor{id="EncryptedPkcs8.impl.encryptedLength"}

### Associated function `encryptedLength`

```silk
pub fn encryptedLength(length: usize, parameters: &Pbes2Parameters) -> usize
```

Returns the number of bytes that [`EncryptedPkcs8.encrypt`](#EncryptedPkcs8.impl.encrypt) writes for a `PrivateKeyInfo` of
`length` bytes with `parameters`.

::Anchor{id="EncryptedPkcs8.impl.encrypt"}

### Associated function `encrypt`

```silk
pub fn encrypt(der: &[u8], password: &[u8], parameters: &Pbes2Parameters, output: &mut [u8]) -> Result<usize, Pkcs8Error>
```

Encrypts the `PrivateKeyInfo` DER `der` with `password` and `parameters` into `output` as an
`EncryptedPrivateKeyInfo`, and returns the number of bytes written,
[`EncryptedPkcs8.encryptedLength`](#EncryptedPkcs8.impl.encryptedLength).

The PRF is written even when it is HMAC-SHA-1, and the key length is left out, as OpenSSL
does. The function does not check that `der` is a key.

#### Errors

- `InvalidParameters` if the salt is empty, the iteration count is 0, or the IV is not one
  block of the cipher.
- `OutputTooSmall` if `output` is shorter than [`EncryptedPkcs8.encryptedLength`](#EncryptedPkcs8.impl.encryptedLength).

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
