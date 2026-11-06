Encrypt and decrypt PEM keys with the legacy OpenSSL scheme of the `Proc-Type` and `DEK-Info`
headers (RFC 1421 framing).

## When to use
Use [`LegacyPem`](#LegacyPem) for a `-----BEGIN RSA PRIVATE KEY-----` or `-----BEGIN EC PRIVATE KEY-----`
block with `Proc-Type: 4,ENCRYPTED`, such as the output of `export` with `type: 'pkcs1'` or
`'sec1'` and a cipher in Node.js. For PKCS #8 keys, use `silk.crypto.pkcs8`, which is stronger.

## Details
The key is `EVP_BytesToKey` with MD5, one iteration, and the first 8 bytes of the IV as the
salt. The cipher is AES, Camellia, or ARIA with a 128, 192, or 256-bit key, or Triple DES, all
in CBC mode with PKCS #7 padding ([`LegacyPemCipher`](#LegacyPemCipher)). Read the `DEK-Info` header with
`Pem.header` of `silk.encoding.pem` and pass it to [`LegacyPem.decrypt`](#LegacyPem.impl.decrypt); [`LegacyPem.writeHeaders`](#LegacyPem.impl.writeHeaders)
writes the two headers for `Pem.encode`. Nothing allocates.

## Errors
The functions return a [`LegacyPemError`](#LegacyPemError). On an error the output does not change.

## Gotchas
The scheme derives the key with one MD5 call, so a weak password falls fast to guessing. A wrong
password usually fails with `WrongPassword`, but about one in 256 passes the padding check;
check that the result parses as a key.

## Examples
### Encrypt and decrypt a key
```silk
import silk.crypto.legacy_pem { LegacyPem, LegacyPemCipher, LegacyPemError }
import silk.core.result { Result }
import silk.collections.slice { Slice }

pub fn main() -> i32 {
  let iv: [u8; 16] = [1; 16]
  let mut headers: [u8; 96] = [0; 96]
  let headerLength = LegacyPem.writeHeaders(LegacyPemCipher.Aes256Cbc, &iv, &mut headers)
  // The DEK-Info value starts after "Proc-Type: 4,ENCRYPTED\nDEK-Info: ".
  let dekInfo = Slice.view<u8>(&headers, 33, headerLength - 34)
  let mut sealed: [u8; 32] = [0; 32]
  let length = match LegacyPem.encrypt(LegacyPemCipher.Aes256Cbc, b"secret", &iv, b"key bytes", &mut sealed) {
    Result<usize, LegacyPemError>.Success { value } => value
    Result<usize, LegacyPemError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut opened: [u8; 32] = [0; 32]
  let back = match LegacyPem.decrypt(dekInfo, b"secret", Slice.view<u8>(&sealed, 0, length), &mut opened) {
    Result<usize, LegacyPemError>.Success { value } => value
    Result<usize, LegacyPemError>.Failure { error: _ } => {
      return 1
    }
  }
  if back != 9 || opened[0] != 107 {
    return 1
  }
  return 0
}
```

Import as `LegacyPem` with `import silk.crypto.legacy_pem { LegacyPem }`.

Public declarations: 3.

::Anchor{id="LegacyPemError"}

## `LegacyPemError`

```silk
pub union LegacyPemError
```

The reason that a [`LegacyPem`](#LegacyPem) function rejected a call. The output does not change.

::Anchor{id="LegacyPemError.InvalidDekInfo"}

### `InvalidDekInfo`

```silk
InvalidDekInfo
```

The `DEK-Info` value is not a supported cipher name, a comma, and the IV in hex.

::Anchor{id="LegacyPemError.WrongPassword"}

### `WrongPassword`

```silk
WrongPassword
```

The decrypted data does not end in valid padding: the password is wrong, or the data was
changed.

::Anchor{id="LegacyPemError.InvalidInputLength"}

### `InvalidInputLength`

```silk
InvalidInputLength
```

The ciphertext is empty or not a whole number of blocks.

::Anchor{id="LegacyPemError.InvalidIvLength"}

### `InvalidIvLength`

```silk
InvalidIvLength
```

The IV given to [`LegacyPem.encrypt`](#LegacyPem.impl.encrypt) is not one cipher block.

::Anchor{id="LegacyPemError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer is shorter than the bytes the call writes.

::Anchor{id="LegacyPemError.impl.Debug"}

## Implementation `Debug for LegacyPemError`

```silk
impl Debug for LegacyPemError
```

::Anchor{id="LegacyPemError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `WrongPassword`.

::Anchor{id="LegacyPemCipher"}

## `LegacyPemCipher`

```silk
pub enum LegacyPemCipher
```

The CBC ciphers of the legacy scheme, with their `DEK-Info` names.

::Anchor{id="LegacyPemCipher.Aes128Cbc"}

### `Aes128Cbc`

```silk
Aes128Cbc
```

`AES-128-CBC`.

::Anchor{id="LegacyPemCipher.Aes192Cbc"}

### `Aes192Cbc`

```silk
Aes192Cbc
```

`AES-192-CBC`.

::Anchor{id="LegacyPemCipher.Aes256Cbc"}

### `Aes256Cbc`

```silk
Aes256Cbc
```

`AES-256-CBC`.

::Anchor{id="LegacyPemCipher.TripleDesCbc"}

### `TripleDesCbc`

```silk
TripleDesCbc
```

`DES-EDE3-CBC`, Triple DES with a 24-byte key.

::Anchor{id="LegacyPemCipher.Camellia128Cbc"}

### `Camellia128Cbc`

```silk
Camellia128Cbc
```

`CAMELLIA-128-CBC`.

::Anchor{id="LegacyPemCipher.Camellia192Cbc"}

### `Camellia192Cbc`

```silk
Camellia192Cbc
```

`CAMELLIA-192-CBC`.

::Anchor{id="LegacyPemCipher.Camellia256Cbc"}

### `Camellia256Cbc`

```silk
Camellia256Cbc
```

`CAMELLIA-256-CBC`.

::Anchor{id="LegacyPemCipher.Aria128Cbc"}

### `Aria128Cbc`

```silk
Aria128Cbc
```

`ARIA-128-CBC`.

::Anchor{id="LegacyPemCipher.Aria192Cbc"}

### `Aria192Cbc`

```silk
Aria192Cbc
```

`ARIA-192-CBC`.

::Anchor{id="LegacyPemCipher.Aria256Cbc"}

### `Aria256Cbc`

```silk
Aria256Cbc
```

`ARIA-256-CBC`.

::Anchor{id="LegacyPemCipher.impl"}

## Implementation `LegacyPemCipher`

```silk
impl LegacyPemCipher
```

::Anchor{id="LegacyPemCipher.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> &'static [u8]
```

Returns the name that `DEK-Info` uses, such as `AES-256-CBC`.

::Anchor{id="LegacyPemCipher.impl.keyLength"}

### Method `keyLength`

```silk
pub fn keyLength(self: &Self) -> usize
```

Returns the key length in bytes.

::Anchor{id="LegacyPemCipher.impl.blockLength"}

### Method `blockLength`

```silk
pub fn blockLength(self: &Self) -> usize
```

Returns the block length in bytes, which is also the IV length: 8 for Triple DES, 16 for the
others.

::Anchor{id="LegacyPem"}

## `LegacyPem`

```silk
pub struct LegacyPem
```

Functions of the legacy PEM encryption scheme.

::Anchor{id="LegacyPem.impl"}

## Implementation `LegacyPem`

```silk
impl LegacyPem
```

::Anchor{id="LegacyPem.impl.decrypt"}

### Associated function `decrypt`

```silk
pub fn decrypt(dekInfo: &[u8], password: &[u8], ciphertext: &[u8], output: &mut [u8]) -> Result<usize, LegacyPemError>
```

Decrypts `ciphertext`, the decoded body of a block whose `DEK-Info` header is `dekInfo`, with
`password` into `output`, and returns the number of bytes written.

The cipher name in `dekInfo` compares without regard to case, as in OpenSSL. The result is at
most `ciphertext.length` bytes.

#### Errors

- `InvalidDekInfo` if `dekInfo` is not a name of [`LegacyPemCipher`](#LegacyPemCipher), a comma, and one block
  of IV in hex.
- `InvalidInputLength` if `ciphertext` is empty or not a whole number of blocks.
- `WrongPassword` if the padding is wrong after decryption.
- `OutputTooSmall` if `output` is shorter than `ciphertext`.

::Anchor{id="LegacyPem.impl.encryptedLength"}

### Associated function `encryptedLength`

```silk
pub fn encryptedLength(cipher: LegacyPemCipher, length: usize) -> usize
```

Returns the number of bytes that [`LegacyPem.encrypt`](#LegacyPem.impl.encrypt) writes for `length` bytes with
`cipher`: the length padded to the next whole block.

::Anchor{id="LegacyPem.impl.encrypt"}

### Associated function `encrypt`

```silk
pub fn encrypt(cipher: LegacyPemCipher, password: &[u8], iv: &[u8], plaintext: &[u8], output: &mut [u8]) -> Result<usize, LegacyPemError>
```

Encrypts `plaintext`, the DER of a key, with `cipher`, `password`, and `iv` into `output`,
and returns the number of bytes written, [`LegacyPem.encryptedLength`](#LegacyPem.impl.encryptedLength).

`iv` is one random cipher block; its first 8 bytes are also the salt of the key.

#### Errors

- `InvalidIvLength` if `iv` is not one block of `cipher`.
- `OutputTooSmall` if `output` is shorter than [`LegacyPem.encryptedLength`](#LegacyPem.impl.encryptedLength).

::Anchor{id="LegacyPem.impl.headersLength"}

### Associated function `headersLength`

```silk
pub fn headersLength(cipher: LegacyPemCipher) -> usize
```

Returns the number of bytes that [`LegacyPem.writeHeaders`](#LegacyPem.impl.writeHeaders) writes for `cipher`.

::Anchor{id="LegacyPem.impl.writeHeaders"}

### Associated function `writeHeaders`

```silk
pub fn writeHeaders(cipher: LegacyPemCipher, iv: &[u8], output: &mut [u8]) -> usize
```

Writes the `Proc-Type` and `DEK-Info` header lines for `cipher` and `iv` to `output`, each
ending with LF, ready for the headers of `Pem.encode`, and returns the number of bytes
written, [`LegacyPem.headersLength`](#LegacyPem.impl.headersLength).

The IV is written in uppercase hex, as OpenSSL does. It traps if `iv` is not one block of
`cipher` or `output` is shorter than [`LegacyPem.headersLength`](#LegacyPem.impl.headersLength).

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
