Read and write elliptic-curve keys in DER: SEC1 private keys, PKCS #8 private keys, and
SubjectPublicKeyInfo public keys, for the named curves of [`EcCurve`](#EcCurve).

## When to use
Use [`EcKeyDer`](#EcKeyDer) to load a key that OpenSSL, a browser, or Node.js wrote, or to export a key in
one of those forms. The reader tells you the curve, so you can pick `silk.crypto.p256`,
`silk.crypto.p384`, `silk.crypto.p521`, or `silk.crypto.ec` for any other curve.

## Details
SEC1 is the `EC PRIVATE KEY` form of RFC 5915. PKCS #8 is the `PRIVATE KEY` form of RFC 5958
with the algorithm `id-ecPublicKey`. SubjectPublicKeyInfo is the `PUBLIC KEY` form of RFC 5480.
The readers return views into the DER and do not copy. The writers give the same bytes as
OpenSSL. Nothing allocates. PEM is DER in Base64 between header lines; use
`silk.encoding.base64` for it.

## Errors
- [`EcKeyError`](#EcKeyError) for DER that is not valid, or for an algorithm or curve that is not supported.

## Gotchas
The readers check the structure and the lengths, but not the values. Pass the secret to
`P256.fromBytes`, `P384.fromBytes`, or `P521.fromBytes`, and the public key to `validatePublicKey` or
`decompressPublicKey`, before you use them. A private key file can hold a public key that does
not belong to its secret; compare it with the public key of the secret if that matters.

## Examples
### Read a public key
```silk
import silk.collections.slice { Slice }
import silk.crypto.ec_key { EcCurve, EcKeyDer, EcKeyError, EcPublicKeyDer }
import silk.core.result { Result }

pub fn main() -> i32 {
  let mut point: [u8; 65] = [0; 65]
  point[0] = 0x04
  let mut der: [u8; 120] = [0; 120]
  let length = match EcKeyDer.writeSpki(EcCurve.P256, &point, &mut der) {
    Result<usize, EcKeyError>.Success { value } => value
    Result<usize, EcKeyError>.Failure {..} => {
      return 1
    }
  }
  // A P-256 SubjectPublicKeyInfo is 91 bytes.
  if length != 91 {
    return 1
  }
  // The reader takes exactly one key, so pass only the bytes that were written.
  return match EcKeyDer.readSpki(Slice.view<u8>(&der, 0, length)) {
    Result<EcPublicKeyDer, EcKeyError>.Success { value } => {
      if value.curve == EcCurve.P256 && value.publicKey.length == 65 {
        return 0
      }
      return 1
    }
    Result<EcPublicKeyDer, EcKeyError>.Failure {..} => 1
  }
}
```

Import as `EcKeyDer` with `import silk.crypto.ec_key { EcKeyDer }`.

Public declarations: 5.

::Anchor{id="EcCurve"}

## `EcCurve`

```silk
pub enum EcCurve
```

A named elliptic curve over a prime field, as OpenSSL and Node.js `crypto.getCurves` list
them.

::Anchor{id="EcCurve.Secp112r1"}

### `Secp112r1`

```silk
Secp112r1
```

The curve that OpenSSL names `secp112r1`.

::Anchor{id="EcCurve.Secp112r2"}

### `Secp112r2`

```silk
Secp112r2
```

The curve that OpenSSL names `secp112r2`.

::Anchor{id="EcCurve.Secp128r1"}

### `Secp128r1`

```silk
Secp128r1
```

The curve that OpenSSL names `secp128r1`.

::Anchor{id="EcCurve.Secp128r2"}

### `Secp128r2`

```silk
Secp128r2
```

The curve that OpenSSL names `secp128r2`.

::Anchor{id="EcCurve.Secp160k1"}

### `Secp160k1`

```silk
Secp160k1
```

The curve that OpenSSL names `secp160k1`.

::Anchor{id="EcCurve.Secp160r1"}

### `Secp160r1`

```silk
Secp160r1
```

The curve that OpenSSL names `secp160r1`.

::Anchor{id="EcCurve.Secp160r2"}

### `Secp160r2`

```silk
Secp160r2
```

The curve that OpenSSL names `secp160r2`.

::Anchor{id="EcCurve.Secp192k1"}

### `Secp192k1`

```silk
Secp192k1
```

The curve that OpenSSL names `secp192k1`.

::Anchor{id="EcCurve.Secp224k1"}

### `Secp224k1`

```silk
Secp224k1
```

The curve that OpenSSL names `secp224k1`.

::Anchor{id="EcCurve.P224"}

### `P224`

```silk
P224
```

NIST P-224, which OpenSSL and SEC 2 name `secp224r1`.

::Anchor{id="EcCurve.Secp256k1"}

### `Secp256k1`

```silk
Secp256k1
```

The curve that OpenSSL names `secp256k1`.

::Anchor{id="EcCurve.P384"}

### `P384`

```silk
P384
```

NIST P-384, which OpenSSL and SEC 2 name `secp384r1`.

::Anchor{id="EcCurve.P521"}

### `P521`

```silk
P521
```

NIST P-521, which OpenSSL and SEC 2 name `secp521r1`.

::Anchor{id="EcCurve.P192"}

### `P192`

```silk
P192
```

NIST P-192, which OpenSSL names `prime192v1` and SEC 2 names `secp192r1`.

::Anchor{id="EcCurve.Prime192v2"}

### `Prime192v2`

```silk
Prime192v2
```

The curve that OpenSSL names `prime192v2`.

::Anchor{id="EcCurve.Prime192v3"}

### `Prime192v3`

```silk
Prime192v3
```

The curve that OpenSSL names `prime192v3`.

::Anchor{id="EcCurve.Prime239v1"}

### `Prime239v1`

```silk
Prime239v1
```

The curve that OpenSSL names `prime239v1`.

::Anchor{id="EcCurve.Prime239v2"}

### `Prime239v2`

```silk
Prime239v2
```

The curve that OpenSSL names `prime239v2`.

::Anchor{id="EcCurve.Prime239v3"}

### `Prime239v3`

```silk
Prime239v3
```

The curve that OpenSSL names `prime239v3`.

::Anchor{id="EcCurve.P256"}

### `P256`

```silk
P256
```

NIST P-256, which OpenSSL names `prime256v1` and SEC 2 names `secp256r1`.

::Anchor{id="EcCurve.Wtls6"}

### `Wtls6`

```silk
Wtls6
```

The curve that OpenSSL names `wap-wsg-idm-ecid-wtls6`.

::Anchor{id="EcCurve.Wtls7"}

### `Wtls7`

```silk
Wtls7
```

The curve that OpenSSL names `wap-wsg-idm-ecid-wtls7`.

::Anchor{id="EcCurve.Wtls8"}

### `Wtls8`

```silk
Wtls8
```

The curve that OpenSSL names `wap-wsg-idm-ecid-wtls8`.

::Anchor{id="EcCurve.Wtls9"}

### `Wtls9`

```silk
Wtls9
```

The curve that OpenSSL names `wap-wsg-idm-ecid-wtls9`.

::Anchor{id="EcCurve.Wtls12"}

### `Wtls12`

```silk
Wtls12
```

The curve that OpenSSL names `wap-wsg-idm-ecid-wtls12`.

::Anchor{id="EcCurve.BrainpoolP160r1"}

### `BrainpoolP160r1`

```silk
BrainpoolP160r1
```

The curve that OpenSSL names `brainpoolP160r1`.

::Anchor{id="EcCurve.BrainpoolP160t1"}

### `BrainpoolP160t1`

```silk
BrainpoolP160t1
```

The curve that OpenSSL names `brainpoolP160t1`.

::Anchor{id="EcCurve.BrainpoolP192r1"}

### `BrainpoolP192r1`

```silk
BrainpoolP192r1
```

The curve that OpenSSL names `brainpoolP192r1`.

::Anchor{id="EcCurve.BrainpoolP192t1"}

### `BrainpoolP192t1`

```silk
BrainpoolP192t1
```

The curve that OpenSSL names `brainpoolP192t1`.

::Anchor{id="EcCurve.BrainpoolP224r1"}

### `BrainpoolP224r1`

```silk
BrainpoolP224r1
```

The curve that OpenSSL names `brainpoolP224r1`.

::Anchor{id="EcCurve.BrainpoolP224t1"}

### `BrainpoolP224t1`

```silk
BrainpoolP224t1
```

The curve that OpenSSL names `brainpoolP224t1`.

::Anchor{id="EcCurve.BrainpoolP256r1"}

### `BrainpoolP256r1`

```silk
BrainpoolP256r1
```

The curve that OpenSSL names `brainpoolP256r1`.

::Anchor{id="EcCurve.BrainpoolP256t1"}

### `BrainpoolP256t1`

```silk
BrainpoolP256t1
```

The curve that OpenSSL names `brainpoolP256t1`.

::Anchor{id="EcCurve.BrainpoolP320r1"}

### `BrainpoolP320r1`

```silk
BrainpoolP320r1
```

The curve that OpenSSL names `brainpoolP320r1`.

::Anchor{id="EcCurve.BrainpoolP320t1"}

### `BrainpoolP320t1`

```silk
BrainpoolP320t1
```

The curve that OpenSSL names `brainpoolP320t1`.

::Anchor{id="EcCurve.BrainpoolP384r1"}

### `BrainpoolP384r1`

```silk
BrainpoolP384r1
```

The curve that OpenSSL names `brainpoolP384r1`.

::Anchor{id="EcCurve.BrainpoolP384t1"}

### `BrainpoolP384t1`

```silk
BrainpoolP384t1
```

The curve that OpenSSL names `brainpoolP384t1`.

::Anchor{id="EcCurve.BrainpoolP512r1"}

### `BrainpoolP512r1`

```silk
BrainpoolP512r1
```

The curve that OpenSSL names `brainpoolP512r1`.

::Anchor{id="EcCurve.BrainpoolP512t1"}

### `BrainpoolP512t1`

```silk
BrainpoolP512t1
```

The curve that OpenSSL names `brainpoolP512t1`.

::Anchor{id="EcCurve.Sm2"}

### `Sm2`

```silk
Sm2
```

The Chinese SM2 curve, which OpenSSL names `SM2`.

::Anchor{id="EcCurve.impl"}

## Implementation `EcCurve`

```silk
impl EcCurve
```

::Anchor{id="EcCurve.impl.secretLength"}

### Method `secretLength`

```silk
pub fn secretLength(self: &Self) -> usize
```

Returns the length in bytes of a secret and of each half of an ECDSA signature: the byte
length of the order of the base point, such as 32 for P-256 and 66 for P-521.

::Anchor{id="EcCurve.impl.fieldLength"}

### Method `fieldLength`

```silk
pub fn fieldLength(self: &Self) -> usize
```

Returns the length in bytes of a field element, which is the length of a shared secret and
of each coordinate of a public key, such as 32 for P-256 and 66 for P-521.

::Anchor{id="EcCurve.impl.publicKeyLength"}

### Method `publicKeyLength`

```silk
pub fn publicKeyLength(self: &Self) -> usize
```

Returns the length of an uncompressed public key in bytes: twice
[`EcCurve.fieldLength`](#EcCurve.impl.fieldLength) plus 1, such as 65 for P-256.

::Anchor{id="EcCurve.impl.compressedPublicKeyLength"}

### Method `compressedPublicKeyLength`

```silk
pub fn compressedPublicKeyLength(self: &Self) -> usize
```

Returns the length of a compressed public key in bytes: [`EcCurve.fieldLength`](#EcCurve.impl.fieldLength) plus 1,
such as 33 for P-256.

::Anchor{id="EcCurve.impl.objectIdentifier"}

### Method `objectIdentifier`

```silk
pub fn objectIdentifier(self: &Self) -> &[u8]
```

Returns the content bytes of the object identifier that names the curve, without the tag
and length.

::Anchor{id="EcCurve.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> string
```

Returns the name of the curve in OpenSSL and in Node.js `crypto.getCurves`, such as
`prime256v1` or `brainpoolP256r1`.

::Anchor{id="EcCurve.impl.fromName"}

### Associated function `fromName`

```silk
pub fn fromName(name: string) -> Option<EcCurve>
```

Returns the curve for a name of OpenSSL, such as `prime256v1` or `secp256k1`, or a NIST
name: `P-192`, `P-224`, `P-256`, `P-384`, or `P-521`, as Node.js `crypto.createECDH`
accepts. Names are case-sensitive.

::Anchor{id="EcCurve.impl.fromObjectIdentifier"}

### Associated function `fromObjectIdentifier`

```silk
pub fn fromObjectIdentifier(identifier: &[u8]) -> Option<EcCurve>
```

Returns the curve whose object identifier has the content bytes `identifier`, without the
tag and length, or `None`.

::Anchor{id="EcCurve.impl.Debug"}

## Implementation `Debug for EcCurve`

```silk
impl Debug for EcCurve
```

::Anchor{id="EcCurve.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `P256`.

::Anchor{id="EcKeyError"}

## `EcKeyError`

```silk
pub enum EcKeyError
```

The reason that an elliptic-curve key in DER could not be read or written.

::Anchor{id="EcKeyError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

The bytes are not strict DER of the expected structure, or a version is not supported.

::Anchor{id="EcKeyError.UnsupportedAlgorithm"}

### `UnsupportedAlgorithm`

```silk
UnsupportedAlgorithm
```

The key algorithm is not `id-ecPublicKey`.

::Anchor{id="EcKeyError.UnsupportedCurve"}

### `UnsupportedCurve`

```silk
UnsupportedCurve
```

The curve is not one of [`EcCurve`](#EcCurve), the curve is given by explicit parameters, or no curve
is named.

::Anchor{id="EcKeyError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A secret or a public key does not have a length that the curve allows.

::Anchor{id="EcKeyError.impl.Debug"}

## Implementation `Debug for EcKeyError`

```silk
impl Debug for EcKeyError
```

::Anchor{id="EcKeyError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidEncoding`.

::Anchor{id="EcPrivateKeyDer"}

## `EcPrivateKeyDer`

```silk
pub struct EcPrivateKeyDer<'a>
```

A private key that [`EcKeyDer.readSec1`](#EcKeyDer.impl.readSec1) or [`EcKeyDer.readPkcs8`](#EcKeyDer.impl.readPkcs8) read. The slices point into
the DER.

::Anchor{id="EcPrivateKeyDer.curve"}

### Field `curve`

```silk
pub curve: EcCurve
```

The curve of the key.

::Anchor{id="EcPrivateKeyDer.secret"}

### Field `secret`

```silk
pub secret: &'a [u8]
```

The secret, big-endian, of [`EcCurve.secretLength`](#EcCurve.impl.secretLength) bytes.

::Anchor{id="EcPrivateKeyDer.publicKey"}

### Field `publicKey`

```silk
pub publicKey: Option<&'a [u8]>
```

The public key that the file holds, compressed, uncompressed, or hybrid, or `None`.

::Anchor{id="EcPublicKeyDer"}

## `EcPublicKeyDer`

```silk
pub struct EcPublicKeyDer<'a>
```

A public key that [`EcKeyDer.readSpki`](#EcKeyDer.impl.readSpki) read. The slice points into the DER.

::Anchor{id="EcPublicKeyDer.curve"}

### Field `curve`

```silk
pub curve: EcCurve
```

The curve of the key.

::Anchor{id="EcPublicKeyDer.publicKey"}

### Field `publicKey`

```silk
pub publicKey: &'a [u8]
```

The public key in SEC1 form, compressed, uncompressed, or hybrid.

::Anchor{id="EcKeyDer"}

## `EcKeyDer`

```silk
pub struct EcKeyDer
```

Functions that read and write elliptic-curve keys in DER.

### When to use
Use it to load or export a key on a curve of [`EcCurve`](#EcCurve) as SEC1, PKCS #8, or
SubjectPublicKeyInfo.

### Details
The writers give the same bytes as OpenSSL: SEC1 names the curve and holds the public key,
PKCS #8 holds the public key in the inner SEC1 key, and SubjectPublicKeyInfo names the curve. A
SEC1 key is at most 223 bytes, a PKCS #8 key at most 241 bytes, and a SubjectPublicKeyInfo at
most 158 bytes.

### Gotchas
The readers do not check that the secret is in range or that the public key is on the curve.

::Anchor{id="EcKeyDer.impl"}

## Implementation `EcKeyDer`

```silk
impl EcKeyDer
```

::Anchor{id="EcKeyDer.impl.readSec1"}

### Associated function `readSec1`

```silk
pub fn readSec1<'a>(der: &'a [u8]) -> Result<EcPrivateKeyDer<'a>, EcKeyError>
```

Reads a SEC1 `ECPrivateKey` (RFC 5915), the form of an `EC PRIVATE KEY` PEM file.

The key must name its curve. The public key is optional.

#### Errors
- `InvalidEncoding` if `der` is not one strict DER `ECPrivateKey` of version 1.
- `UnsupportedCurve` if the curve is missing, explicit, or not one of [`EcCurve`](#EcCurve).
- `InvalidLength` if the secret or the public key has the wrong length for the curve.

::Anchor{id="EcKeyDer.impl.readPkcs8"}

### Associated function `readPkcs8`

```silk
pub fn readPkcs8<'a>(der: &'a [u8]) -> Result<EcPrivateKeyDer<'a>, EcKeyError>
```

Reads a PKCS #8 `PrivateKeyInfo` or `OneAsymmetricKey` (RFC 5958) with an elliptic-curve key,
the form of a `PRIVATE KEY` PEM file.

Versions 0 and 1 are accepted. Attributes are skipped. A public key of version 1 is used when
the inner key has none.

#### Errors
- `InvalidEncoding` if `der` is not strict DER of that structure, or the inner key names
  another curve.
- `UnsupportedAlgorithm` if the algorithm is not `id-ecPublicKey`.
- `UnsupportedCurve` if the curve is explicit, or not one of [`EcCurve`](#EcCurve).
- `InvalidLength` if the secret or the public key has the wrong length for the curve.

::Anchor{id="EcKeyDer.impl.readSpki"}

### Associated function `readSpki`

```silk
pub fn readSpki<'a>(der: &'a [u8]) -> Result<EcPublicKeyDer<'a>, EcKeyError>
```

Reads a `SubjectPublicKeyInfo` (RFC 5480) with an elliptic-curve key, the form of a
`PUBLIC KEY` PEM file and of the key in an X.509 certificate.

#### Errors
- `InvalidEncoding` if `der` is not one strict DER `SubjectPublicKeyInfo`.
- `UnsupportedAlgorithm` if the algorithm is not `id-ecPublicKey`.
- `UnsupportedCurve` if the curve is explicit, or not one of [`EcCurve`](#EcCurve).
- `InvalidLength` if the public key has the wrong length for the curve.

::Anchor{id="EcKeyDer.impl.writeSec1"}

### Associated function `writeSec1`

```silk
pub fn writeSec1(curve: EcCurve, secret: &[u8], publicKey: &[u8], output: &mut [u8]) -> Result<
    usize,
    EcKeyError,
  >
```

Writes `secret` and `publicKey` as a SEC1 `ECPrivateKey` that names `curve`, and returns the
length. The bytes of `output` after the DER do not change.

#### Errors
- `InvalidLength` if `secret` is not [`EcCurve.secretLength`](#EcCurve.impl.secretLength) bytes, or `publicKey` is not a
  compressed, uncompressed, or hybrid key of that length for the curve. `output` does not
  change.

#### Gotchas
The program traps if `output` is shorter than the DER, at most 223 bytes.

::Anchor{id="EcKeyDer.impl.writePkcs8"}

### Associated function `writePkcs8`

```silk
pub fn writePkcs8(curve: EcCurve, secret: &[u8], publicKey: &[u8], output: &mut [u8]) -> Result<
    usize,
    EcKeyError,
  >
```

Writes `secret` and `publicKey` as a PKCS #8 `PrivateKeyInfo` of version 0 for `curve`, and
returns the length. The inner SEC1 key holds the public key and does not repeat the curve.
The bytes of `output` after the DER do not change.

#### Errors
- `InvalidLength`, as for [`EcKeyDer.writeSec1`](#EcKeyDer.impl.writeSec1).

#### Gotchas
The program traps if `output` is shorter than the DER, at most 241 bytes.

::Anchor{id="EcKeyDer.impl.writeSpki"}

### Associated function `writeSpki`

```silk
pub fn writeSpki(curve: EcCurve, publicKey: &[u8], output: &mut [u8]) -> Result<
    usize,
    EcKeyError
  >
```

Writes `publicKey` as a `SubjectPublicKeyInfo` for `curve`, and returns the length. The bytes
of `output` after the DER do not change.

#### Errors
- `InvalidLength` if `publicKey` is not a compressed, uncompressed, or hybrid key of the right length
  for the curve. `output` does not change.

#### Gotchas
The program traps if `output` is shorter than the DER, at most 158 bytes.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
