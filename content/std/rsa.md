Bounded RSA public-key admission and SHA-256 signature verification.

## When to use

Use `RsaPublicKey` for the selected 2048..4096-bit RSA profile with exponent 65537.
Use `verifyPss` for the selected PSS profile and `verifyCertificate` for certificate signature algorithms.

## Details

Keys own bounded public data. Verification borrows inputs, requires no provider and performs no signing.
Certificate operations consume the original algorithm DER and BIT STRING metadata from a container decoder.

## Gotchas

A valid signature does not establish certificate trust, service identity or a valid certificate path.
Arithmetic processes public values with bounded variable work. This module contains no private-key operation.

Import as `RsaPublicKey` with `import silk.rsa { RsaPublicKey }`.

Public declarations: 2.

::Anchor{id="RsaError"}

## `RsaError`

```silk
pub enum RsaError
```

A bounded RSA admission or verification failure without caller-owned byte data.

::Anchor{id="RsaError.InvalidKey"}

### `InvalidKey`

```silk
InvalidKey
```

The modulus or exponent is outside the selected public-key profile.

::Anchor{id="RsaError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

A DER value has invalid, nonminimal or trailing encoding.

::Anchor{id="RsaError.InvalidParameters"}

### `InvalidParameters`

```silk
InvalidParameters
```

An algorithm identifier or effective parameter is outside the selected profile.

::Anchor{id="RsaError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

The signature width or BIT STRING alignment is invalid.

::Anchor{id="RsaError.MessageTooLong"}

### `MessageTooLong`

```silk
MessageTooLong
```

The message exceeds the SHA-256 input domain.

::Anchor{id="RsaError.InvalidSignature"}

### `InvalidSignature`

```silk
InvalidSignature
```

The representative, padding or digest does not verify.

::Anchor{id="RsaPublicKey"}

## `RsaPublicKey`

```silk
pub struct RsaPublicKey
```

An admitted RSA public key with bounded owned storage and exponent 65537.

::Anchor{id="RsaPublicKey.impl"}

## Implementation `RsaPublicKey`

```silk
impl RsaPublicKey
```

::Anchor{id="RsaPublicKey.impl.fromComponents"}

### Associated function `fromComponents`

```silk
pub fn fromComponents(modulus: &[u8], exponent: &[u8]) -> Result<RsaPublicKey, RsaError>
```

Admits canonical unsigned modulus bytes and exponent 65537 into an owned public key.

#### Details

The modulus must be odd and contain 2048 through 4096 significant bits. Leading zero bytes are rejected.
The exponent must be exactly the three bytes 01 00 01. Rejection returns InvalidKey without retaining input.

::Anchor{id="RsaPublicKey.impl.verifyPss"}

### Method `verifyPss`

```silk
pub fn verifyPss(self: &RsaPublicKey, message: &[u8], signature: &[u8]) -> Result<(), RsaError>
```

Verifies the selected SHA-256 PSS profile against the exact borrowed message bytes.

#### Details

Requires signature width ceil(modulusBits/8), a representative below the modulus, MGF1-SHA-256,
salt length 32 and trailer 1. The message is hashed once. Inputs are borrowed without retention.
InvalidLength, MessageTooLong or InvalidSignature identifies rejection; no input is changed.

#### Gotchas

This operation does not establish certificate trust or service identity. It requires no entropy provider.

::Anchor{id="RsaPublicKey.impl-2"}

## Implementation `RsaPublicKey`

```silk
impl RsaPublicKey
```

::Anchor{id="RsaPublicKey.impl.fromCertificateKey"}

### Associated function `fromCertificateKey`

```silk
pub fn fromCertificateKey(algorithmDer: &[u8], keyDer: &[u8], unusedBits: u8) -> Result<
    RsaPublicKey,
    RsaError,
  >
```

Admits certificate RSA key DER after checking its original AlgorithmIdentifier and BIT STRING alignment.

#### Details

Pass the decoder's algorithm DER, key BIT STRING bytes and unused-bit count unchanged.
Requires rsaEncryption with absent or NULL parameters and a minimal positive RSAPublicKey DER sequence.
The modulus and exponent then pass the same bounded profile as fromComponents.
Malformed DER returns InvalidEncoding; wrong algorithm parameters return InvalidParameters.
Nonzero unused bits return InvalidLength. No borrowed bytes are retained.

::Anchor{id="RsaPublicKey.impl.verifyCertificate"}

### Method `verifyCertificate`

```silk
pub fn verifyCertificate(
    self: &RsaPublicKey,
    message: &[u8],
    algorithmDer: &[u8],
    signature: &[u8],
    unusedBits: u8,
  ) -> Result<(), RsaError>
```

Verifies a certificate signature using admitted SHA-256 PSS or PKCS#1 v1.5 metadata.

#### Details

Pass the original signature AlgorithmIdentifier DER and BIT STRING unused-bit count.
PSS requires effective SHA-256, MGF1-SHA-256, salt32 and trailer1 parameters.
sha256WithRSAEncryption accepts absent or NULL parameters and strict DigestInfo padding.
The message is hashed once. Metadata rejection precedes public exponentiation.
Nonzero unused bits return InvalidLength; unsupported parameters return InvalidParameters.
Other failures match verifyPss. No provider, allocation or mutation is required.

#### Gotchas

Signature validity does not establish certificate trust, path validity or service identity.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
