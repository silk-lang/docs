Check a TLS 1.3 or TLS 1.2 handshake signature with the public key of a peer's leaf
certificate, and sign one with a leaf's private key.

## When to use
`silk.tls.client` uses this module for the server's CertificateVerify, and `silk.tls.server`
uses it for a client certificate's. Call [`HandshakeSignature.verify`](#HandshakeSignature.impl.verify) directly only when you
build your own TLS 1.3 handshake.

## Details
[`HandshakeSignature.verify`](#HandshakeSignature.impl.verify) takes a TLS `SignatureScheme` code and checks that it fits the
certificate's key: `ecdsa_secp256r1_sha256` (1027) and `ecdsa_secp384r1_sha384` (1283) for an
EC key on that curve, `rsa_pss_rsae_sha256`, `_sha384` and `_sha512` (2052, 2053, 2054) for an
`rsaEncryption` key, with a salt as long as the digest, and `ed25519` (2055) for an Ed25519 key.
With [`TlsVersion`](/docs/std/tls-record#TlsVersion) `Tls12` it also takes `rsa_pkcs1_sha256`, `_sha384` and `_sha512` (1025,
1281, 1537) for an `rsaEncryption` key, and the two ECDSA schemes for a key on either curve,
because TLS 1.2 ties the ECDSA schemes to a hash only. [`HandshakeSignature.keyType`](#HandshakeSignature.impl.keyType) gives the
key type of a certificate.

[`SigningKey`](#SigningKey) is the private key of a leaf certificate, for the side that signs. It checks that
it matches a certificate, picks a scheme from a peer's [`SchemeSet`](#SchemeSet), and signs.

## Errors
- [`SignatureFailure`](#SignatureFailure) for a scheme that this module does not know, a scheme that does not fit
  the key, or a signature that does not verify.

## Gotchas
The message is the full signed content: for TLS 1.3, the 64 spaces, the context string, a zero
byte, and the transcript hash of RFC 8446 section 4.4.3; for a TLS 1.2 ServerKeyExchange, the
two hello random values and the key exchange parameters; for a TLS 1.2 CertificateVerify, all
handshake messages so far. This module does not build it.

## Examples
### Reject a scheme that this module does not know
```silk
import silk.core.result { Result }
import silk.tls.signature { CertificateKeyType, HandshakeSignature, SignatureFailure }

pub fn main() -> i32 {
  // 513 is rsa_pkcs1_sha256, which TLS 1.3 does not use for CertificateVerify.
  return match HandshakeSignature.schemeKeyType(513) {
    Result<CertificateKeyType, SignatureFailure>.Failure { error } => match error {
      SignatureFailure.UnsupportedScheme => 0
      _ => 1
    }
    Result<CertificateKeyType, SignatureFailure>.Success { .. } => 2
  }
}
```

Import as `HandshakeSignature` with `import silk.tls.signature { HandshakeSignature }`.

Public declarations: 7.

::Anchor{id="CertificateKeyType"}

## `CertificateKeyType`

```silk
pub enum CertificateKeyType
```

The type of a certificate's public key, as far as TLS 1.3 signatures go.

::Anchor{id="CertificateKeyType.EcdsaP256"}

### `EcdsaP256`

```silk
EcdsaP256
```

An `id-ecPublicKey` key on secp256r1.

::Anchor{id="CertificateKeyType.EcdsaP384"}

### `EcdsaP384`

```silk
EcdsaP384
```

An `id-ecPublicKey` key on secp384r1.

::Anchor{id="CertificateKeyType.Ed25519"}

### `Ed25519`

```silk
Ed25519
```

An `id-Ed25519` key.

::Anchor{id="CertificateKeyType.Rsa"}

### `Rsa`

```silk
Rsa
```

An `rsaEncryption` key.

::Anchor{id="SignatureFailure"}

## `SignatureFailure`

```silk
pub union SignatureFailure
```

Why a CertificateVerify signature did not verify.

::Anchor{id="SignatureFailure.UnsupportedScheme"}

### `UnsupportedScheme`

```silk
UnsupportedScheme
```

The scheme is not one that this module knows.

::Anchor{id="SignatureFailure.KeyMismatch"}

### `KeyMismatch`

```silk
KeyMismatch
```

The scheme does not fit the type of the certificate's key.

::Anchor{id="SignatureFailure.Ecdsa"}

### `Ecdsa`

```silk
Ecdsa
```

ECDSA P-256 with SHA-256 failed.

::Anchor{id="SignatureFailure.Ecdsa.error"}

#### Field `error`

```silk
pub error: P256SignatureError
```

The primitive failure.

::Anchor{id="SignatureFailure.EcdsaP384"}

### `EcdsaP384`

```silk
EcdsaP384
```

ECDSA P-384 with SHA-384 failed.

::Anchor{id="SignatureFailure.EcdsaP384.error"}

#### Field `error`

```silk
pub error: P384SignatureError
```

The primitive failure.

::Anchor{id="SignatureFailure.Rsa"}

### `Rsa`

```silk
Rsa
```

RSA-PSS or RSA PKCS #1 v1.5 failed, or the certificate's RSA key is not valid.

::Anchor{id="SignatureFailure.Rsa.error"}

#### Field `error`

```silk
pub error: RsaError
```

The primitive failure.

::Anchor{id="SignatureFailure.Ed25519"}

### `Ed25519`

```silk
Ed25519
```

Ed25519 failed, or the certificate's Ed25519 key is not valid.

::Anchor{id="SignatureFailure.Ed25519.error"}

#### Field `error`

```silk
pub error: Ed25519Error
```

The primitive failure.

::Anchor{id="SignatureFailure.impl.Copy"}

## Implementation `Copy for SignatureFailure`

```silk
impl Copy for SignatureFailure
```

::Anchor{id="SignatureFailure.impl.Debug"}

## Implementation `Debug for SignatureFailure`

```silk
impl Debug for SignatureFailure
```

::Anchor{id="SignatureFailure.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant and its fields, such as `Ecdsa { ... }`.

::Anchor{id="HandshakeSignature"}

## `HandshakeSignature`

```silk
pub struct HandshakeSignature
```

Functions that check TLS handshake signatures.

::Anchor{id="HandshakeSignature.impl"}

## Implementation `HandshakeSignature`

```silk
impl HandshakeSignature
```

::Anchor{id="HandshakeSignature.impl.keyType"}

### Associated function `keyType`

```silk
pub fn keyType(certificate: &Certificate) -> Option<CertificateKeyType>
```

Returns the type of `certificate`'s public key, or `None` for a key that no TLS 1.3 scheme of
this module signs with.

::Anchor{id="HandshakeSignature.impl.schemeKeyType"}

### Associated function `schemeKeyType`

```silk
pub fn schemeKeyType(scheme: usize) -> Result<CertificateKeyType, SignatureFailure>
```

Returns the key type that the TLS `SignatureScheme` code `scheme` signs with.

#### Errors
- `UnsupportedScheme` for a scheme that this module does not know.

::Anchor{id="HandshakeSignature.impl.verify"}

### Associated function `verify`

```silk
pub fn verify(
    certificate: &Certificate,
    scheme: usize,
    message: &[u8],
    signature: &[u8],
    version: TlsVersion,
  ) -> Result<(), SignatureFailure>
```

Checks that `signature` signs `message` under `scheme` with the public key of `certificate`,
with the scheme rules of `version`.

#### Errors
- `UnsupportedScheme` or `KeyMismatch` for a scheme that this module does not know, that
  `version` does not allow, or that does not fit the key.
- `Ecdsa`, `EcdsaP384`, `Rsa`, or `Ed25519` for a key or a signature that is not valid.

::Anchor{id="HandshakeSignature.impl.digestLength"}

### Associated function `digestLength`

```silk
pub fn digestLength(scheme: usize) -> Option<usize>
```

Returns the digest length of a scheme that TLS 1.2 CertificateVerify signs by digest with
[`SigningKey.signDigest`](#SigningKey.impl.signDigest) and [`HandshakeSignature.verifyDigest`](#HandshakeSignature.impl.verifyDigest): 32 for
`ecdsa_secp256r1_sha256`, `rsa_pss_rsae_sha256`, and `rsa_pkcs1_sha256`, and 48 for
`ecdsa_secp384r1_sha384`, `rsa_pss_rsae_sha384`, and `rsa_pkcs1_sha384`. Returns `None` for
any other scheme.

::Anchor{id="HandshakeSignature.impl.verifyDigest"}

### Associated function `verifyDigest`

```silk
pub fn verifyDigest(
    certificate: &Certificate,
    scheme: usize,
    digest: &[u8],
    signature: &[u8],
  ) -> Result<(), SignatureFailure>
```

Checks that `signature` signs `digest` under `scheme` with the public key of `certificate`,
as a TLS 1.2 CertificateVerify does. `digest` is the hash of the handshake messages under the
hash of `scheme`, which must be one that [`HandshakeSignature.digestLength`](#HandshakeSignature.impl.digestLength) knows. An ECDSA
scheme names only its hash in TLS 1.2, so either curve may sign with either.

#### Errors
- `UnsupportedScheme` for another scheme, or a digest of the wrong length.
- `KeyMismatch` for a scheme that does not fit the key.
- `Ecdsa`, `EcdsaP384`, or `Rsa` for a key or a signature that is not valid.

::Anchor{id="SchemeSet"}

## `SchemeSet`

```silk
pub struct SchemeSet
```

A set of TLS `SignatureScheme` codes that this module knows, such as the ones that a peer
offers in `signature_algorithms`. Unknown codes are left out.

::Anchor{id="SchemeSet.impl.Copy"}

## Implementation `Copy for SchemeSet`

```silk
impl Copy for SchemeSet
```

::Anchor{id="SchemeSet.impl"}

## Implementation `SchemeSet`

```silk
impl SchemeSet
```

::Anchor{id="SchemeSet.impl.empty"}

### Associated function `empty`

```silk
pub fn empty() -> SchemeSet
```

Returns an empty set.

::Anchor{id="SchemeSet.impl.insert"}

### Method `insert`

```silk
pub fn insert(self: &mut Self, scheme: usize) -> ()
```

Adds `scheme` to the set. A code that this module does not know is ignored.

::Anchor{id="SchemeSet.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, scheme: usize) -> bool
```

Returns whether the set holds `scheme`.

::Anchor{id="SIGNATURE_LIMIT"}

## `SIGNATURE_LIMIT`

```silk
pub const SIGNATURE_LIMIT: usize
```

The longest signature that [`SigningKey.sign`](#SigningKey.impl.sign) writes: an 8192-bit RSA signature.

::Anchor{id="SigningError"}

## `SigningError`

```silk
pub union SigningError
```

Why [`SigningKey.sign`](#SigningKey.impl.sign) did not sign.

::Anchor{id="SigningError.UnsupportedScheme"}

### `UnsupportedScheme`

```silk
UnsupportedScheme
```

The scheme is not one that this key signs with.

::Anchor{id="SigningError.OutputTooShort"}

### `OutputTooShort`

```silk
OutputTooShort
```

The output is shorter than the signature.

::Anchor{id="SigningError.Rsa"}

### `Rsa`

```silk
Rsa
```

RSA signing failed.

::Anchor{id="SigningError.Rsa.error"}

#### Field `error`

```silk
pub error: RsaError
```

The primitive failure.

::Anchor{id="SigningError.impl.Copy"}

## Implementation `Copy for SigningError`

```silk
impl Copy for SigningError
```

::Anchor{id="SigningError.impl.Debug"}

## Implementation `Debug for SigningError`

```silk
impl Debug for SigningError
```

::Anchor{id="SigningError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `Rsa { ... }`.

::Anchor{id="SigningKey"}

## `SigningKey`

```silk
pub union SigningKey
```

The private key of a leaf certificate, which signs CertificateVerify, or a TLS 1.2
ServerKeyExchange.

::Anchor{id="SigningKey.EcdsaP256"}

### `EcdsaP256`

```silk
EcdsaP256
```

An ECDSA P-256 key, used with the `ecdsa_secp256r1_sha256` scheme.

::Anchor{id="SigningKey.EcdsaP256.key"}

#### Field `key`

```silk
pub key: P256
```

The private key.

::Anchor{id="SigningKey.EcdsaP384"}

### `EcdsaP384`

```silk
EcdsaP384
```

An ECDSA P-384 key, used with the `ecdsa_secp384r1_sha384` scheme.

::Anchor{id="SigningKey.EcdsaP384.key"}

#### Field `key`

```silk
pub key: P384
```

The private key.

::Anchor{id="SigningKey.Ed25519"}

### `Ed25519`

```silk
Ed25519
```

An Ed25519 key, used with the `ed25519` scheme.

::Anchor{id="SigningKey.Ed25519.key"}

#### Field `key`

```silk
pub key: Ed25519PrivateKey
```

The private key.

::Anchor{id="SigningKey.Rsa"}

### `Rsa`

```silk
Rsa
```

An RSA key for an `rsaEncryption` certificate, used with the `rsa_pss_rsae_sha256`,
`rsa_pss_rsae_sha384`, or `rsa_pss_rsae_sha512` scheme, in that order of preference. In TLS
1.2, when the peer offers none of them, it signs with `rsa_pkcs1_sha256`, `rsa_pkcs1_sha384`,
or `rsa_pkcs1_sha512`.

::Anchor{id="SigningKey.Rsa.key"}

#### Field `key`

```silk
pub key: RsaPrivateKey
```

The private key.

::Anchor{id="SigningKey.impl"}

## Implementation `SigningKey`

```silk
impl SigningKey
```

::Anchor{id="SigningKey.impl.matches"}

### Method `matches`

```silk
pub fn matches(self: &Self, certificate: &Certificate) -> bool
```

Returns whether `certificate`'s public key is the public key of this key, with the matching
algorithm.

::Anchor{id="SigningKey.impl.chooseScheme"}

### Method `chooseScheme`

```silk
pub fn chooseScheme(self: &Self, offered: &SchemeSet, version: TlsVersion) -> Option<usize>
```

Returns this key's preferred scheme among `offered` for a handshake of `version`, or `None`
when the peer offers none that this key signs with.

::Anchor{id="SigningKey.impl.sign"}

### Method `sign`

```silk
pub effect fn sign(self: &Self, scheme: usize, message: &[u8], output: &mut [u8]) -> Result<
    usize,
    SigningError
  >
  ? &mut Random
```

Signs `message` under `scheme`, writes the signature to the start of `output`, and returns
its length. ECDSA signatures are DER, as TLS sends them. An output of [`SIGNATURE_LIMIT`](#SIGNATURE_LIMIT)
bytes always fits.

#### Errors
- `UnsupportedScheme` for a scheme that this key does not sign with.
- `OutputTooShort` when `output` cannot hold the signature.
- `Rsa` when RSA signing fails.

::Anchor{id="SigningKey.impl.signDigest"}

### Method `signDigest`

```silk
pub effect fn signDigest(self: &Self, scheme: usize, digest: &[u8], output: &mut [u8]) -> Result<
    usize,
    SigningError
  >
  ? &mut Random
```

Signs a TLS 1.2 CertificateVerify `digest`, the hash of the handshake messages under the
hash of `scheme`, writes the signature to the start of `output`, and returns its length.

`scheme` is one of `ecdsa_secp256r1_sha256` and `ecdsa_secp384r1_sha384` for the key's own
curve, `rsa_pss_rsae_sha256`, `rsa_pss_rsae_sha384`, `rsa_pkcs1_sha256`, or
`rsa_pkcs1_sha384`. [`HandshakeSignature.digestLength`](#HandshakeSignature.impl.digestLength) gives the digest length.

#### Errors
- `UnsupportedScheme` for another scheme, a scheme that this key does not sign with, a digest
  of the wrong length, or an Ed25519 key, which signs only whole messages.
- `OutputTooShort` when `output` cannot hold the signature.
- `Rsa` when RSA signing fails.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
