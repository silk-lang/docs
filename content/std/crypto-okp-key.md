Read and write X25519, X448, Ed25519, and Ed448 keys in DER: PKCS #8 private keys and
SubjectPublicKeyInfo public keys, as RFC 8410 defines them.

## When to use
Use [`OkpKeyDer`](#OkpKeyDer) to load a key that OpenSSL, a browser, or Node.js wrote, or to export a key in
one of those forms. The reader tells you the algorithm, so you can pick `silk.crypto.x25519`,
`silk.crypto.ed25519`, or `silk.crypto.curve448`. JOSE calls these keys octet key pairs, OKP.

## Details
A private key is the `PRIVATE KEY` form of RFC 5958: the algorithm identifier and the raw secret
in an inner OCTET STRING. For Ed25519 and Ed448 the secret is the seed of RFC 8032, 32 or 57
bytes; for X25519 and X448 it is the scalar before clamping, 32 or 56 bytes. A public key is the
`PUBLIC KEY` form, the raw public key in a BIT STRING. The algorithm identifiers have no
parameters. The readers return views into the DER and do not copy. The writers give the same
bytes as OpenSSL. Nothing allocates. PEM is DER in Base64 between header lines; use
`silk.encoding.pem` for it.

## Errors
- [`OkpKeyError`](#OkpKeyError) for DER that is not valid, for another algorithm, or for a key of the wrong
  length.

## Gotchas
The readers check the structure and the lengths, but not the values. A private key file can
hold a public key that does not belong to its secret; compare it with the public key of the
secret if that matters.

## Examples
### Write and read an Ed25519 public key
```silk
import silk.collections.slice { Slice }
import silk.crypto.okp_key { OkpAlgorithm, OkpKeyDer, OkpKeyError, OkpPublicKeyDer }
import silk.core.result { Result }

pub fn main() -> i32 {
  let key: [u8; 32] = [7; 32]
  let mut der: [u8; 44] = [0; 44]
  let length = match OkpKeyDer.writeSpki(OkpAlgorithm.Ed25519, &key, &mut der) {
    Result<usize, OkpKeyError>.Success { value } => value
    Result<usize, OkpKeyError>.Failure {..} => {
      return 1
    }
  }
  // An Ed25519 SubjectPublicKeyInfo is 44 bytes.
  if length != 44 {
    return 1
  }
  return match OkpKeyDer.readSpki(Slice.view<u8>(&der, 0, length)) {
    Result<OkpPublicKeyDer, OkpKeyError>.Success { value } => {
      if value.algorithm == OkpAlgorithm.Ed25519 && value.publicKey[0] == 7 {
        return 0
      }
      return 1
    }
    Result<OkpPublicKeyDer, OkpKeyError>.Failure {..} => 1
  }
}
```

Import as `OkpKeyDer` with `import silk.crypto.okp_key { OkpKeyDer }`.

Public declarations: 5.

::Anchor{id="OkpAlgorithm"}

## `OkpAlgorithm`

```silk
pub enum OkpAlgorithm
```

A key algorithm of RFC 8410 that [`OkpKeyDer`](#OkpKeyDer) reads and writes.

::Anchor{id="OkpAlgorithm.X25519"}

### `X25519`

```silk
X25519
```

X25519 key agreement, `id-X25519` (1.3.101.110).

::Anchor{id="OkpAlgorithm.X448"}

### `X448`

```silk
X448
```

X448 key agreement, `id-X448` (1.3.101.111).

::Anchor{id="OkpAlgorithm.Ed25519"}

### `Ed25519`

```silk
Ed25519
```

Ed25519 signatures, `id-Ed25519` (1.3.101.112).

::Anchor{id="OkpAlgorithm.Ed448"}

### `Ed448`

```silk
Ed448
```

Ed448 signatures, `id-Ed448` (1.3.101.113).

::Anchor{id="OkpAlgorithm.impl"}

## Implementation `OkpAlgorithm`

```silk
impl OkpAlgorithm
```

::Anchor{id="OkpAlgorithm.impl.secretLength"}

### Method `secretLength`

```silk
pub fn secretLength(self: &Self) -> usize
```

Returns the length of a secret in bytes: 32 for X25519 and Ed25519, 56 for X448, and 57 for
Ed448.

::Anchor{id="OkpAlgorithm.impl.publicKeyLength"}

### Method `publicKeyLength`

```silk
pub fn publicKeyLength(self: &Self) -> usize
```

Returns the length of a public key in bytes, the same as [`OkpAlgorithm.secretLength`](#OkpAlgorithm.impl.secretLength).

::Anchor{id="OkpAlgorithm.impl.objectIdentifier"}

### Method `objectIdentifier`

```silk
pub fn objectIdentifier(self: &Self) -> &[u8]
```

Returns the content bytes of the object identifier that names the algorithm, without the tag
and length.

::Anchor{id="OkpAlgorithm.impl.Debug"}

## Implementation `Debug for OkpAlgorithm`

```silk
impl Debug for OkpAlgorithm
```

::Anchor{id="OkpAlgorithm.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Ed25519`.

::Anchor{id="OkpKeyError"}

## `OkpKeyError`

```silk
pub enum OkpKeyError
```

The reason that a key in DER could not be read or written.

::Anchor{id="OkpKeyError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

The bytes are not strict DER of the expected structure, the algorithm has parameters, or a
version is not supported.

::Anchor{id="OkpKeyError.UnsupportedAlgorithm"}

### `UnsupportedAlgorithm`

```silk
UnsupportedAlgorithm
```

The key algorithm is not X25519, X448, Ed25519, or Ed448.

::Anchor{id="OkpKeyError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A secret or a public key does not have the length of the algorithm.

::Anchor{id="OkpKeyError.impl.Debug"}

## Implementation `Debug for OkpKeyError`

```silk
impl Debug for OkpKeyError
```

::Anchor{id="OkpKeyError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidEncoding`.

::Anchor{id="OkpPrivateKeyDer"}

## `OkpPrivateKeyDer`

```silk
pub struct OkpPrivateKeyDer<'a>
```

A private key that [`OkpKeyDer.readPkcs8`](#OkpKeyDer.impl.readPkcs8) read. The slices point into the DER.

::Anchor{id="OkpPrivateKeyDer.algorithm"}

### Field `algorithm`

```silk
pub algorithm: OkpAlgorithm
```

The algorithm of the key.

::Anchor{id="OkpPrivateKeyDer.secret"}

### Field `secret`

```silk
pub secret: &'a [u8]
```

The secret, of [`OkpAlgorithm.secretLength`](#OkpAlgorithm.impl.secretLength) bytes.

::Anchor{id="OkpPrivateKeyDer.publicKey"}

### Field `publicKey`

```silk
pub publicKey: Option<&'a [u8]>
```

The public key that a version 1 key holds, or `None`.

::Anchor{id="OkpPublicKeyDer"}

## `OkpPublicKeyDer`

```silk
pub struct OkpPublicKeyDer<'a>
```

A public key that [`OkpKeyDer.readSpki`](#OkpKeyDer.impl.readSpki) read. The slice points into the DER.

::Anchor{id="OkpPublicKeyDer.algorithm"}

### Field `algorithm`

```silk
pub algorithm: OkpAlgorithm
```

The algorithm of the key.

::Anchor{id="OkpPublicKeyDer.publicKey"}

### Field `publicKey`

```silk
pub publicKey: &'a [u8]
```

The public key, of [`OkpAlgorithm.publicKeyLength`](#OkpAlgorithm.impl.publicKeyLength) bytes.

::Anchor{id="OkpKeyDer"}

## `OkpKeyDer`

```silk
pub struct OkpKeyDer
```

Functions that read and write X25519, X448, Ed25519, and Ed448 keys in DER.

### When to use
Use it to load or export one of these keys as PKCS #8 or SubjectPublicKeyInfo.

### Details
The writers give the same bytes as OpenSSL: a PKCS #8 key of version 0 without the public key,
at most 73 bytes, and a SubjectPublicKeyInfo of at most 69 bytes.

### Gotchas
The readers do not check that a public key is a valid point.

::Anchor{id="OkpKeyDer.impl"}

## Implementation `OkpKeyDer`

```silk
impl OkpKeyDer
```

::Anchor{id="OkpKeyDer.impl.readPkcs8"}

### Associated function `readPkcs8`

```silk
pub fn readPkcs8<'a>(der: &'a [u8]) -> Result<OkpPrivateKeyDer<'a>, OkpKeyError>
```

Reads a PKCS #8 `PrivateKeyInfo` or `OneAsymmetricKey` (RFC 5958) with an RFC 8410 key, the
form of a `PRIVATE KEY` PEM file.

Versions 0 and 1 are accepted. Attributes are skipped. A public key is accepted in version 1.

#### Errors
- `InvalidEncoding` if `der` is not one strict DER key of that structure.
- `UnsupportedAlgorithm` if the algorithm is not X25519, X448, Ed25519, or Ed448.
- `InvalidLength` if the secret or the public key has the wrong length.

::Anchor{id="OkpKeyDer.impl.readSpki"}

### Associated function `readSpki`

```silk
pub fn readSpki<'a>(der: &'a [u8]) -> Result<OkpPublicKeyDer<'a>, OkpKeyError>
```

Reads a `SubjectPublicKeyInfo` with an RFC 8410 key, the form of a `PUBLIC KEY` PEM file and
of the key in an X.509 certificate.

#### Errors
- `InvalidEncoding` if `der` is not one strict DER `SubjectPublicKeyInfo`.
- `UnsupportedAlgorithm` if the algorithm is not X25519, X448, Ed25519, or Ed448.
- `InvalidLength` if the public key has the wrong length.

::Anchor{id="OkpKeyDer.impl.writePkcs8"}

### Associated function `writePkcs8`

```silk
pub fn writePkcs8(algorithm: OkpAlgorithm, secret: &[u8], output: &mut [u8]) -> Result<
    usize,
    OkpKeyError,
  >
```

Writes `secret` as a PKCS #8 `PrivateKeyInfo` of version 0 for `algorithm`, and returns the
length. The bytes of `output` after the DER do not change.

#### Errors
- `InvalidLength` if `secret` is not [`OkpAlgorithm.secretLength`](#OkpAlgorithm.impl.secretLength) bytes. `output` does not
  change.

#### Gotchas
The program traps if `output` is shorter than the DER: 16 bytes more than the secret, at most
73 bytes.

::Anchor{id="OkpKeyDer.impl.writeSpki"}

### Associated function `writeSpki`

```silk
pub fn writeSpki(algorithm: OkpAlgorithm, publicKey: &[u8], output: &mut [u8]) -> Result<
    usize,
    OkpKeyError,
  >
```

Writes `publicKey` as a `SubjectPublicKeyInfo` for `algorithm`, and returns the length. The
bytes of `output` after the DER do not change.

#### Errors
- `InvalidLength` if `publicKey` is not [`OkpAlgorithm.publicKeyLength`](#OkpAlgorithm.impl.publicKeyLength) bytes. `output` does
  not change.

#### Gotchas
The program traps if `output` is shorter than the DER: 12 bytes more than the key, at most 69
bytes.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
