Read and write ML-KEM and ML-DSA keys in DER: PKCS #8 private keys and SubjectPublicKeyInfo
public keys, in the IETF LAMPS profiles for X.509 (draft-ietf-lamps-dilithium-certificates
and draft-ietf-lamps-kyber-certificates).

## When to use
Use [`MlKeyDer`](#MlKeyDer) to load an ML-KEM or ML-DSA key that OpenSSL, Node.js, or another library
wrote, or to export one in those forms. The reader tells you the algorithm; pass the bytes to
`silk.crypto.ml_kem` or `silk.crypto.ml_dsa`.

## Details
A public key is the `PUBLIC KEY` form: the algorithm identifier and the raw encapsulation key in
a BIT STRING. A private key is the `PRIVATE KEY` form of RFC 5958 whose inner value is one of
three choices:
- the seed alone, with the context tag `[0]`: 64 bytes `d || z` for ML-KEM, 32 bytes for
  ML-DSA;
- the expanded private key alone, in an OCTET STRING;
- both, as a SEQUENCE of the seed and the expanded key.

The algorithm identifiers have no parameters. The readers return views into the DER and do not
copy. Nothing allocates. PEM is DER in Base64 between header lines; use `silk.encoding.pem`
for it.

## Errors
- [`MlKeyError`](#MlKeyError) for DER that is not valid, for another algorithm, or for a key of the wrong
  length.

## Gotchas
The readers check the structure and the lengths, but not the values. A private key with both
forms can hold an expanded key that does not belong to its seed. Expand the seed with
`MlKem.keyPairFromSeed` or `MlDsa.keyPairFromSeed` and compare when that matters, as the
profiles ask. Check an ML-KEM expanded key alone with `MlKem.checkDecapsulationKey`.

## Examples
### Write and read an ML-KEM-768 private key seed
```silk
import silk.collections.slice { Slice }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.crypto.ml_key { MlKeyAlgorithm, MlKeyDer, MlKeyError, MlPrivateKeyDer }

pub fn main() -> i32 {
  let seed: [u8; 64] = [9; 64]
  let mut der: [u8; 86] = [0; 86]
  let none = Option<&[u8]>.none()
  let length = match MlKeyDer.writePkcs8(MlKeyAlgorithm.MlKem768, Option<&[u8]>.some(&seed), none, &mut der) {
    Result<usize, MlKeyError>.Success { value } => value
    Result<usize, MlKeyError>.Failure {..} => {
      return 1
    }
  }
  // The seed form of PKCS #8 is 86 bytes.
  if length != 86 {
    return 1
  }
  return match MlKeyDer.readPkcs8(Slice.view<u8>(&der, 0, length)) {
    Result<MlPrivateKeyDer, MlKeyError>.Success { value } => {
      if value.algorithm == MlKeyAlgorithm.MlKem768 {
        return 0
      }
      return 1
    }
    Result<MlPrivateKeyDer, MlKeyError>.Failure {..} => 1
  }
}
```

Import as `MlKeyDer` with `import silk.crypto.ml_key { MlKeyDer }`.

Public declarations: 5.

::Anchor{id="MlKeyAlgorithm"}

## `MlKeyAlgorithm`

```silk
pub enum MlKeyAlgorithm
```

An algorithm whose keys [`MlKeyDer`](#MlKeyDer) reads and writes.

::Anchor{id="MlKeyAlgorithm.MlKem512"}

### `MlKem512`

```silk
MlKem512
```

::Anchor{id="MlKeyAlgorithm.MlKem768"}

### `MlKem768`

```silk
MlKem768
```

::Anchor{id="MlKeyAlgorithm.MlKem1024"}

### `MlKem1024`

```silk
MlKem1024
```

::Anchor{id="MlKeyAlgorithm.MlDsa44"}

### `MlDsa44`

```silk
MlDsa44
```

::Anchor{id="MlKeyAlgorithm.MlDsa65"}

### `MlDsa65`

```silk
MlDsa65
```

::Anchor{id="MlKeyAlgorithm.MlDsa87"}

### `MlDsa87`

```silk
MlDsa87
```

::Anchor{id="MlKeyAlgorithm.impl"}

## Implementation `MlKeyAlgorithm`

```silk
impl MlKeyAlgorithm
```

::Anchor{id="MlKeyAlgorithm.impl.fromMlKem"}

### Associated function `fromMlKem`

```silk
pub fn fromMlKem(parameters: MlKemParameters) -> MlKeyAlgorithm
```

Returns the algorithm of an ML-KEM parameter set.

::Anchor{id="MlKeyAlgorithm.impl.fromMlDsa"}

### Associated function `fromMlDsa`

```silk
pub fn fromMlDsa(parameters: MlDsaParameters) -> MlKeyAlgorithm
```

Returns the algorithm of an ML-DSA parameter set.

::Anchor{id="MlKeyAlgorithm.impl.mlKemParameters"}

### Method `mlKemParameters`

```silk
pub fn mlKemParameters(self: &Self) -> Option<MlKemParameters>
```

Returns the ML-KEM parameter set, or `None` for an algorithm that is not ML-KEM.

::Anchor{id="MlKeyAlgorithm.impl.mlDsaParameters"}

### Method `mlDsaParameters`

```silk
pub fn mlDsaParameters(self: &Self) -> Option<MlDsaParameters>
```

Returns the ML-DSA parameter set, or `None` for an algorithm that is not ML-DSA.

::Anchor{id="MlKeyAlgorithm.impl.seedLength"}

### Method `seedLength`

```silk
pub fn seedLength(self: &Self) -> usize
```

Returns the length of the private key seed: 64 bytes for ML-KEM and 32 for ML-DSA.

::Anchor{id="MlKeyAlgorithm.impl.expandedKeyLength"}

### Method `expandedKeyLength`

```silk
pub fn expandedKeyLength(self: &Self) -> usize
```

Returns the length of the expanded private key: the ML-KEM decapsulation key, or the ML-DSA
private key.

::Anchor{id="MlKeyAlgorithm.impl.publicKeyLength"}

### Method `publicKeyLength`

```silk
pub fn publicKeyLength(self: &Self) -> usize
```

Returns the length of the public key: the ML-KEM encapsulation key, or the ML-DSA public key.

::Anchor{id="MlKeyAlgorithm.impl.objectIdentifier"}

### Method `objectIdentifier`

```silk
pub fn objectIdentifier(self: &Self) -> &[u8]
```

Returns the DER content of the object identifier, without the tag and length.

::Anchor{id="MlKeyAlgorithm.impl.Debug"}

## Implementation `Debug for MlKeyAlgorithm`

```silk
impl Debug for MlKeyAlgorithm
```

::Anchor{id="MlKeyAlgorithm.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

::Anchor{id="MlKeyError"}

## `MlKeyError`

```silk
pub enum MlKeyError
```

Why [`MlKeyDer`](#MlKeyDer) refused a key.

::Anchor{id="MlKeyError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

The bytes are not the DER structure of the key, or an output buffer is too short.

::Anchor{id="MlKeyError.UnsupportedAlgorithm"}

### `UnsupportedAlgorithm`

```silk
UnsupportedAlgorithm
```

The algorithm identifier names another algorithm.

::Anchor{id="MlKeyError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A key has the wrong length for its algorithm, or a private key has neither form.

::Anchor{id="MlKeyError.impl.Debug"}

## Implementation `Debug for MlKeyError`

```silk
impl Debug for MlKeyError
```

::Anchor{id="MlKeyError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

::Anchor{id="MlPrivateKeyDer"}

## `MlPrivateKeyDer`

```silk
pub struct MlPrivateKeyDer<'a>
```

A private key read from PKCS #8: views into the DER. At least one of `seed` and `expandedKey`
is `Some`, and each has the length of the algorithm.

::Anchor{id="MlPrivateKeyDer.algorithm"}

### Field `algorithm`

```silk
pub algorithm: MlKeyAlgorithm
```

::Anchor{id="MlPrivateKeyDer.seed"}

### Field `seed`

```silk
pub seed: Option<&'a [u8]>
```

::Anchor{id="MlPrivateKeyDer.expandedKey"}

### Field `expandedKey`

```silk
pub expandedKey: Option<&'a [u8]>
```

::Anchor{id="MlPublicKeyDer"}

## `MlPublicKeyDer`

```silk
pub struct MlPublicKeyDer<'a>
```

A public key read from SubjectPublicKeyInfo: a view into the DER.

::Anchor{id="MlPublicKeyDer.algorithm"}

### Field `algorithm`

```silk
pub algorithm: MlKeyAlgorithm
```

::Anchor{id="MlPublicKeyDer.publicKey"}

### Field `publicKey`

```silk
pub publicKey: &'a [u8]
```

::Anchor{id="MlKeyDer"}

## `MlKeyDer`

```silk
pub struct MlKeyDer
```

Reads and writes ML-KEM and ML-DSA keys as PKCS #8 and SubjectPublicKeyInfo DER.

::Anchor{id="MlKeyDer.impl"}

## Implementation `MlKeyDer`

```silk
impl MlKeyDer
```

::Anchor{id="MlKeyDer.impl.readPkcs8"}

### Associated function `readPkcs8`

```silk
pub fn readPkcs8<'a>(der: &'a [u8]) -> Result<MlPrivateKeyDer<'a>, MlKeyError>
```

Reads a PKCS #8 `PRIVATE KEY` in any of the three private key forms.

The version can be 0 or 1, and attributes are skipped. A version 1 public key is refused,
since the profile has none.

#### Errors
- `InvalidEncoding`, `UnsupportedAlgorithm`, or `InvalidLength`.

::Anchor{id="MlKeyDer.impl.readSpki"}

### Associated function `readSpki`

```silk
pub fn readSpki<'a>(der: &'a [u8]) -> Result<MlPublicKeyDer<'a>, MlKeyError>
```

Reads a SubjectPublicKeyInfo `PUBLIC KEY`.

#### Errors
- `InvalidEncoding`, `UnsupportedAlgorithm`, or `InvalidLength`.

::Anchor{id="MlKeyDer.impl.pkcs8Length"}

### Associated function `pkcs8Length`

```silk
pub fn pkcs8Length(algorithm: MlKeyAlgorithm, hasSeed: bool, hasExpandedKey: bool) -> usize
```

Returns the length of the PKCS #8 DER that [`MlKeyDer.writePkcs8`](#MlKeyDer.impl.writePkcs8) writes for the forms
that are present.

::Anchor{id="MlKeyDer.impl.writePkcs8"}

### Associated function `writePkcs8`

```silk
pub fn writePkcs8(
    algorithm: MlKeyAlgorithm,
    seed: Option<&[u8]>,
    expandedKey: Option<&[u8]>,
    output: &mut [u8],
  ) -> Result<usize, MlKeyError>
```

Writes a PKCS #8 `PRIVATE KEY` into `output` and returns its length. With `seed` alone it
writes the seed form, with `expandedKey` alone the expanded form, and with both the form
that holds both.

#### Errors
- `InvalidLength` if neither is given, or one has the wrong length.
- `InvalidEncoding` if `output` is shorter than [`MlKeyDer.pkcs8Length`](#MlKeyDer.impl.pkcs8Length).

::Anchor{id="MlKeyDer.impl.spkiLength"}

### Associated function `spkiLength`

```silk
pub fn spkiLength(algorithm: MlKeyAlgorithm) -> usize
```

Returns the length of the SubjectPublicKeyInfo DER for `algorithm`.

::Anchor{id="MlKeyDer.impl.writeSpki"}

### Associated function `writeSpki`

```silk
pub fn writeSpki(algorithm: MlKeyAlgorithm, publicKey: &[u8], output: &mut [u8]) -> Result<
    usize,
    MlKeyError,
  >
```

Writes a SubjectPublicKeyInfo `PUBLIC KEY` into `output` and returns its length.

#### Errors
- `InvalidLength` if `publicKey` has the wrong length.
- `InvalidEncoding` if `output` is shorter than [`MlKeyDer.spkiLength`](#MlKeyDer.impl.spkiLength).

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
