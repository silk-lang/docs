DSA keys and signatures (FIPS 186-4): parameter and key generation, signing, verification, and
the DER forms that OpenSSL and Node.js use.

## When to use
Use [`DsaPrivateKey`](#DsaPrivateKey) to sign and [`DsaPublicKey`](#DsaPublicKey) to verify where a format requires DSA, such
as Node.js `crypto.sign` with a `dsa` key, `generateKeyPair('dsa')`, or old SSH and X.509 keys.
For a new design, use `silk.crypto.ed25519` or ECDSA instead.

## Details
A [`DsaParameters`](#DsaParameters) value holds the primes `p` and `q`, where `q` divides `p - 1`, and a
generator `g` of order `q` modulo `p`. `p` has 512 to 8192 bits and `q` 160, 224, or 256 bits
(the pairs of FIPS 186-4 are 1024/160, 2048/224, 2048/256, and 3072/256). A private key is a
number `x` from 1 to `q - 1` and its public key is `y = g^x mod p`.

The signing functions take the digest of the message, not the message. A digest longer than
`q` keeps its leftmost bytes, as OpenSSL does. A signature is `r || s`, each big-endian and as
long as `q`, the IEEE P1363 form that Node.js calls `ieee-p1363`. [`DsaSignature`](#DsaSignature) converts it
to and from the DER form that is the default of Node.js.

The private operations use the constant-time arithmetic of `silk.crypto.modular`: their time
does not depend on `x` or on the per-signature secret `k`.

## Errors
- [`DsaError`](#DsaError) for parameters, a key, a length, an encoding, or a signature that is not valid.

## Gotchas
The keys do not check that `p` and `q` are prime or that `g` has order `q`. Use keys and
parameters only from sources that you trust. Each signature needs a fresh secret from a
cryptographically secure `Random`; a repeated or predictable one reveals the private key.

## Examples
### Sign and verify a digest
```silk
import silk.core.effect { Effect }
import silk.core.result { Result }
import silk.crypto.dsa { DsaError, DsaParameters, DsaPrivateKey }
import silk.crypto.sha2 { Sha256 }
import silk.num.u64
import silk.system.random { Random }

// A test provider. Never use it for keys.
struct Counter {
  state: u64,
}

impl Random for Counter {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    let mut index: usize = 0
    while index < output.length {
      self.state = u64.wrappingAdd(u64.wrappingMultiply(self.state, 6364136223846793005), 1)
      output[index] = u64.toU8(u64.shiftRight(self.state, 56))
      index = index + 1
    }
  }
}

effect fn signAndVerify() -> i32 ! DsaError ? &mut Random {
  let parameters = run DsaParameters.generate(1024, 160)
  let key = run DsaPrivateKey.generate(&parameters)
  let digest = Sha256.hash(b"hello")
  let mut signature: [u8; 40] = [0; 40]
  run key.signDigest(&digest, &mut signature)
  return match key.publicKey().verifyDigest(&digest, &signature) {
    Result<(), DsaError>.Success { value: _ } => 0
    Result<(), DsaError>.Failure { error: _ } => 1
  }
}

pub effect fn main() -> i32 ! DsaError {
  let mut random = Counter { state: 1 }
  return run signAndVerify() |> Effect.provideMut<Random>(&mut random)
}
```

Import as `DsaPrivateKey` with `import silk.crypto.dsa { DsaPrivateKey }`.

Public declarations: 5.

::Anchor{id="DsaError"}

## `DsaError`

```silk
pub enum DsaError
```

The reason that DSA parameters, a key, an encoding, or a signature were rejected.

::Anchor{id="DsaError.InvalidParameters"}

### `InvalidParameters`

```silk
InvalidParameters
```

The sizes are not supported: `p` is not 512 to 8192 bits, or `q` is not 160, 224, or 256
bits, or the values are not consistent: `p` or `q` is even, or `g` is not from 2 to `p - 1`.

::Anchor{id="DsaError.InvalidKey"}

### `InvalidKey`

```silk
InvalidKey
```

A key value is out of range: `x` is not from 1 to `q - 1`, or `y` is not from 2 to `p - 1`.

::Anchor{id="DsaError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

A DER value is not valid, not minimal, has bytes after it, or names another algorithm.

::Anchor{id="DsaError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

An output or a signature does not have the required length.

::Anchor{id="DsaError.InvalidSignature"}

### `InvalidSignature`

```silk
InvalidSignature
```

The signature does not match the digest and the key.

::Anchor{id="DsaError.impl.Debug"}

## Implementation `Debug for DsaError`

```silk
impl Debug for DsaError
```

::Anchor{id="DsaError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidKey`.

::Anchor{id="DsaParameters"}

## `DsaParameters`

```silk
pub struct DsaParameters
```

The domain parameters of DSA: the primes `p` and `q`, where `q` divides `p - 1`, and the
generator `g`.

### When to use
Make one with [`DsaParameters.generate`](#DsaParameters.impl.generate), from its parts with [`DsaParameters.fromComponents`](#DsaParameters.impl.fromComponents),
or from the DER `Dss-Parms` of a key or a `DSA PARAMETERS` PEM block with
[`DsaParameters.fromDer`](#DsaParameters.impl.fromDer). Many keys can share one set of parameters.

### Details
`p` has 512 to 8192 bits and `q` has 160, 224, or 256 bits.

### Gotchas
It does not check that `p` and `q` are prime or that `g` has order `q`. It is a fixed-size
value of about 5 KiB. Pass it by reference.

::Anchor{id="DsaParameters.impl.Copy"}

## Implementation `Copy for DsaParameters`

```silk
impl Copy for DsaParameters
```

::Anchor{id="DsaPublicKey"}

## `DsaPublicKey`

```silk
pub struct DsaPublicKey
```

A DSA public key: the parameters and `y = g^x mod p`.

### When to use
Use it to verify signatures. Make one with [`DsaPublicKey.fromComponents`](#DsaPublicKey.impl.fromComponents), from a
SubjectPublicKeyInfo with [`DsaPublicKey.fromSpkiDer`](#DsaPublicKey.impl.fromSpkiDer), or from a private key with
[`DsaPrivateKey.publicKey`](#DsaPrivateKey.impl.publicKey).

### Gotchas
It is a fixed-size value of about 6 KiB. Pass it by reference.

::Anchor{id="DsaPublicKey.impl.Copy"}

## Implementation `Copy for DsaPublicKey`

```silk
impl Copy for DsaPublicKey
```

::Anchor{id="DsaPrivateKey"}

## `DsaPrivateKey`

```silk
pub struct DsaPrivateKey
```

A DSA private key: the parameters, the secret `x`, and the public value `y`.

### When to use
Use it to sign digests. Generate one with [`DsaPrivateKey.generate`](#DsaPrivateKey.impl.generate), or read one with
[`DsaPrivateKey.fromComponents`](#DsaPrivateKey.impl.fromComponents), [`DsaPrivateKey.fromPkcs8Der`](#DsaPrivateKey.impl.fromPkcs8Der), or
[`DsaPrivateKey.fromTraditionalDer`](#DsaPrivateKey.impl.fromTraditionalDer).

### Gotchas
It does not erase its memory when dropped. It is a fixed-size value of about 7 KiB. Pass it by
reference.

::Anchor{id="DsaPrivateKey.impl.Copy"}

## Implementation `Copy for DsaPrivateKey`

```silk
impl Copy for DsaPrivateKey
```

::Anchor{id="DsaSignature"}

## `DsaSignature`

```silk
pub struct DsaSignature
```

Conversions between the `r || s` form of a DSA signature and its DER form.

### When to use
Use it for Node.js `dsaEncoding`: `der`, the default, is the DER `SEQUENCE` of two
`INTEGER`s, and `ieee-p1363` is `r || s`, which the signing functions of this module write.

::Anchor{id="DsaParameters.impl"}

## Implementation `DsaParameters`

```silk
impl DsaParameters
```

::Anchor{id="DsaParameters.impl.generate"}

### Associated function `generate`

```silk
pub effect fn generate(pBits: usize, qBits: usize) -> DsaParameters
    ! DsaError
    ? &mut Random
```

Returns new parameters with a `p` of `pBits` bits and a `q` of `qBits` bits, from the ambient
`Random`, as `generateKeyPair('dsa')` and `generateKeyPair('dsa', { divisorLength })` do in
Node.js.

`q` is a random prime of `qBits` bits, `p` a random prime of `pBits` bits with `p = 1` modulo
`2q`, both tested with [`Prime.recommendedRounds`](/docs/std/crypto-prime#Prime.impl.recommendedRounds) of Miller-Rabin, and `g` is
`h^((p - 1) / q) mod p` for the first `h` from 2 up that does not give 1 (FIPS 186-4 A.2.1).

#### Errors
- `InvalidParameters` if `pBits` is not 512 to 8192, or `qBits` is not 160, 224, or 256.

#### Gotchas
It takes a random time, about a second for 2048 bits and much longer for 3072 bits. The
primes do not come from a seed, so they cannot be verified as FIPS 186-4 A.1.1.2 primes can.

::Anchor{id="DsaParameters.impl.fromComponents"}

### Associated function `fromComponents`

```silk
pub fn fromComponents(p: &[u8], q: &[u8], g: &[u8]) -> Result<DsaParameters, DsaError>
```

Returns the parameters for the big-endian `p`, `q`, and `g`. Leading zero bytes are allowed.

#### Errors
- `InvalidParameters` if `p` is not an odd number of 512 to 8192 bits, `q` is not an odd
  number of 160, 224, or 256 bits, or `g` is not from 2 to `p - 1`.

#### Gotchas
It does not check that `p` and `q` are prime, that `q` divides `p - 1`, or that `g` has
order `q`.

::Anchor{id="DsaParameters.impl.primeBits"}

### Method `primeBits`

```silk
pub fn primeBits(self: &Self) -> usize
```

Returns the number of bits of `p`, as `modulusLength` in Node.js.

::Anchor{id="DsaParameters.impl.divisorBits"}

### Method `divisorBits`

```silk
pub fn divisorBits(self: &Self) -> usize
```

Returns the number of bits of `q`, as `divisorLength` in Node.js.

::Anchor{id="DsaParameters.impl.primeLength"}

### Method `primeLength`

```silk
pub fn primeLength(self: &Self) -> usize
```

Returns the length of `p` in bytes, which is the length of a public value `y`.

::Anchor{id="DsaParameters.impl.divisorLength"}

### Method `divisorLength`

```silk
pub fn divisorLength(self: &Self) -> usize
```

Returns the length of `q` in bytes, which is the length of a secret `x` and of each half of
a signature.

::Anchor{id="DsaParameters.impl.signatureLength"}

### Method `signatureLength`

```silk
pub fn signatureLength(self: &Self) -> usize
```

Returns the length in bytes of a signature in the `r || s` form: twice
[`DsaParameters.divisorLength`](#DsaParameters.impl.divisorLength).

::Anchor{id="DsaParameters.impl.prime"}

### Method `prime`

```silk
pub fn prime(self: &Self) -> Natural
```

Returns `p` as a number.

::Anchor{id="DsaParameters.impl.divisor"}

### Method `divisor`

```silk
pub fn divisor(self: &Self) -> Natural
```

Returns `q` as a number.

::Anchor{id="DsaParameters.impl.generator"}

### Method `generator`

```silk
pub fn generator(self: &Self) -> Natural
```

Returns `g` as a number, with the word length of `p`.

::Anchor{id="DsaPublicKey.impl"}

## Implementation `DsaPublicKey`

```silk
impl DsaPublicKey
```

::Anchor{id="DsaPublicKey.impl.fromComponents"}

### Associated function `fromComponents`

```silk
pub fn fromComponents(parameters: &DsaParameters, y: &[u8]) -> Result<DsaPublicKey, DsaError>
```

Returns the public key for `parameters` and the big-endian public value `y`. Leading zero
bytes are allowed.

#### Errors
- `InvalidKey` if `y` is not from 2 to `p - 1`.

::Anchor{id="DsaPublicKey.impl.parameters"}

### Method `parameters`

```silk
pub fn parameters(self: &Self) -> DsaParameters
```

Returns the parameters of the key.

::Anchor{id="DsaPublicKey.impl.publicValue"}

### Method `publicValue`

```silk
pub fn publicValue(self: &Self) -> Natural
```

Returns the public value `y`, with the word length of `p`.

::Anchor{id="DsaPublicKey.impl.verifyDigest"}

### Method `verifyDigest`

```silk
pub fn verifyDigest(self: &Self, digest: &[u8], signature: &[u8]) -> Result<(), DsaError>
```

Checks that `signature` is a valid signature in the `r || s` form of the message with the
digest `digest`.

A digest longer than `q` keeps its leftmost [`DsaParameters.divisorLength`](#DsaParameters.impl.divisorLength) bytes. The time
depends on the values, which are all public.

#### Errors
- `InvalidLength` if `signature` is not [`DsaParameters.signatureLength`](#DsaParameters.impl.signatureLength) bytes.
- `InvalidSignature` if `r` or `s` is not from 1 to `q - 1`, or the signature does not
  match.

::Anchor{id="DsaPrivateKey.impl"}

## Implementation `DsaPrivateKey`

```silk
impl DsaPrivateKey
```

::Anchor{id="DsaPrivateKey.impl.generate"}

### Associated function `generate`

```silk
pub effect fn generate(parameters: &DsaParameters) -> DsaPrivateKey
    ? &mut Random
```

Returns a new key for `parameters`, with a secret from the ambient `Random`.

The secret is uniform from 1 to `q - 1` (FIPS 186-4 B.1.1). The time does not depend on the
secret. The `Random` provider must be cryptographically secure.

::Anchor{id="DsaPrivateKey.impl.fromComponents"}

### Associated function `fromComponents`

```silk
pub fn fromComponents(parameters: &DsaParameters, x: &[u8]) -> Result<DsaPrivateKey, DsaError>
```

Returns the private key for `parameters` and the big-endian secret `x`, and computes its
public value. Leading zero bytes are allowed.

#### Errors
- `InvalidKey` if `x` is not from 1 to `q - 1`.

::Anchor{id="DsaPrivateKey.impl.parameters"}

### Method `parameters`

```silk
pub fn parameters(self: &Self) -> DsaParameters
```

Returns the parameters of the key.

::Anchor{id="DsaPrivateKey.impl.publicKey"}

### Method `publicKey`

```silk
pub fn publicKey(self: &Self) -> DsaPublicKey
```

Returns the public half of the key.

::Anchor{id="DsaPrivateKey.impl.secret"}

### Method `secret`

```silk
pub fn secret(self: &Self) -> Natural
```

Returns the secret `x`, with the word length of `q`.

#### Gotchas
The value is the private key. Keep it secret.

::Anchor{id="DsaPrivateKey.impl.signDigest"}

### Method `signDigest`

```silk
pub effect fn signDigest(self: &Self, digest: &[u8], signature: &mut [u8]) -> ()
    ! DsaError
    ? &mut Random
```

Signs the message with the digest `digest` and writes the signature to `signature` in the
`r || s` form. It reads the per-signature secret `k` from the ambient `Random`.

A digest longer than `q` keeps its leftmost [`DsaParameters.divisorLength`](#DsaParameters.impl.divisorLength) bytes, as
OpenSSL does. The time does not depend on `x` or `k`.

#### Errors
- `InvalidLength` if `signature` is not [`DsaParameters.signatureLength`](#DsaParameters.impl.signatureLength) bytes.

#### Gotchas
The `Random` provider must be cryptographically secure: a repeated or biased `k` reveals
the private key.

::Anchor{id="DsaSignature.impl"}

## Implementation `DsaSignature`

```silk
impl DsaSignature
```

::Anchor{id="DsaSignature.impl.derLength"}

### Associated function `derLength`

```silk
pub fn derLength(signature: &[u8]) -> usize
```

Returns the length of the DER form of the `r || s` signature `signature`.

#### Gotchas
The program traps if `signature` has an odd length or is longer than 64 bytes.

::Anchor{id="DsaSignature.impl.toDer"}

### Associated function `toDer`

```silk
pub fn toDer(signature: &[u8], output: &mut [u8]) -> Result<usize, DsaError>
```

Writes the DER form of the `r || s` signature `signature` to the start of `output`, and
returns its length, which is [`DsaSignature.derLength`](#DsaSignature.impl.derLength).

The bytes of `output` after the DER do not change.

#### Errors
- `InvalidLength` if `output` is shorter than the DER.

#### Gotchas
The program traps if `signature` has an odd length or is longer than 64 bytes.

::Anchor{id="DsaSignature.impl.fromDer"}

### Associated function `fromDer`

```silk
pub fn fromDer(der: &[u8], output: &mut [u8]) -> Result<(), DsaError>
```

Reads the DER signature `der` and writes it to all of `output` in the `r || s` form, each
half `output.length / 2` bytes, such as [`DsaParameters.signatureLength`](#DsaParameters.impl.signatureLength).

#### Errors
- `InvalidEncoding` if `der` is not strict DER of two non-negative integers.
- `InvalidSignature` if `r` or `s` is 0 or does not fit in half of `output`.
- `InvalidLength` if `output` has an odd length.

::Anchor{id="DsaParameters.impl-2"}

## Implementation `DsaParameters`

```silk
impl DsaParameters
```

::Anchor{id="DsaParameters.impl.fromDer"}

### Associated function `fromDer`

```silk
pub fn fromDer(der: &[u8]) -> Result<DsaParameters, DsaError>
```

Reads the DER `Dss-Parms` `der`: `SEQUENCE { p, q, g }`, the content of a `DSA PARAMETERS`
PEM block.

#### Errors
- `InvalidEncoding` if `der` is not strict DER of three non-negative integers.
- `InvalidParameters` if the values are not valid for [`DsaParameters.fromComponents`](#DsaParameters.impl.fromComponents).

::Anchor{id="DsaParameters.impl.derLength"}

### Method `derLength`

```silk
pub fn derLength(self: &Self) -> usize
```

Returns the length of the DER `Dss-Parms` of the parameters.

::Anchor{id="DsaParameters.impl.writeDer"}

### Method `writeDer`

```silk
pub fn writeDer(self: &Self, output: &mut [u8]) -> Result<usize, DsaError>
```

Writes the DER `Dss-Parms` of the parameters to the start of `output`, and returns its
length, which is [`DsaParameters.derLength`](#DsaParameters.impl.derLength).

#### Errors
- `InvalidLength` if `output` is shorter than the DER.

::Anchor{id="DsaPublicKey.impl-2"}

## Implementation `DsaPublicKey`

```silk
impl DsaPublicKey
```

::Anchor{id="DsaPublicKey.impl.fromSpkiDer"}

### Associated function `fromSpkiDer`

```silk
pub fn fromSpkiDer(der: &[u8]) -> Result<DsaPublicKey, DsaError>
```

Reads the DER SubjectPublicKeyInfo `der` of a DSA key, with the `id-dsa` algorithm and its
`Dss-Parms`, as Node.js exports with `type: 'spki'`.

#### Errors
- `InvalidEncoding` if `der` is not strict DER, names another algorithm, or has no
  parameters.
- `InvalidParameters` if the parameters are not valid.
- `InvalidKey` if `y` is not from 2 to `p - 1`.

::Anchor{id="DsaPublicKey.impl.spkiDerLength"}

### Method `spkiDerLength`

```silk
pub fn spkiDerLength(self: &Self) -> usize
```

Returns the length of the DER SubjectPublicKeyInfo of the key.

::Anchor{id="DsaPublicKey.impl.writeSpkiDer"}

### Method `writeSpkiDer`

```silk
pub fn writeSpkiDer(self: &Self, output: &mut [u8]) -> Result<usize, DsaError>
```

Writes the DER SubjectPublicKeyInfo of the key to the start of `output`, and returns its
length, which is [`DsaPublicKey.spkiDerLength`](#DsaPublicKey.impl.spkiDerLength).

#### Errors
- `InvalidLength` if `output` is shorter than the DER.

::Anchor{id="DsaPrivateKey.impl-2"}

## Implementation `DsaPrivateKey`

```silk
impl DsaPrivateKey
```

::Anchor{id="DsaPrivateKey.impl.fromPkcs8Der"}

### Associated function `fromPkcs8Der`

```silk
pub fn fromPkcs8Der(der: &[u8]) -> Result<DsaPrivateKey, DsaError>
```

Reads the DER PKCS #8 PrivateKeyInfo `der` of a DSA key, with the `id-dsa` algorithm and
its `Dss-Parms` and the secret as an `INTEGER`, as Node.js exports with `type: 'pkcs8'`.

It computes the public value from the secret. Version 1 keys, attributes, and a public key
field (RFC 5958) are accepted and the public key field is ignored.

#### Errors
- `InvalidEncoding` if `der` is not strict DER or names another algorithm.
- `InvalidParameters` if the parameters are not valid.
- `InvalidKey` if `x` is not from 1 to `q - 1`.

::Anchor{id="DsaPrivateKey.impl.pkcs8DerLength"}

### Method `pkcs8DerLength`

```silk
pub fn pkcs8DerLength(self: &Self) -> usize
```

Returns the length of the DER PKCS #8 PrivateKeyInfo of the key.

::Anchor{id="DsaPrivateKey.impl.writePkcs8Der"}

### Method `writePkcs8Der`

```silk
pub fn writePkcs8Der(self: &Self, output: &mut [u8]) -> Result<usize, DsaError>
```

Writes the DER PKCS #8 PrivateKeyInfo of the key, version 0 with the secret as an
`INTEGER`, to the start of `output`, and returns its length, which is
[`DsaPrivateKey.pkcs8DerLength`](#DsaPrivateKey.impl.pkcs8DerLength).

#### Errors
- `InvalidLength` if `output` is shorter than the DER.

::Anchor{id="DsaPrivateKey.impl.fromTraditionalDer"}

### Associated function `fromTraditionalDer`

```silk
pub fn fromTraditionalDer(der: &[u8]) -> Result<DsaPrivateKey, DsaError>
```

Reads the DER OpenSSL DSA private key `der`: `SEQUENCE { 0, p, q, g, y, x }`, the content of
a `DSA PRIVATE KEY` PEM block.

#### Errors
- `InvalidEncoding` if `der` is not strict DER of six non-negative integers, or the version
  is not 0.
- `InvalidParameters` if the parameters are not valid.
- `InvalidKey` if `x` is not from 1 to `q - 1`, or `y` is not `g^x mod p`.

::Anchor{id="DsaPrivateKey.impl.traditionalDerLength"}

### Method `traditionalDerLength`

```silk
pub fn traditionalDerLength(self: &Self) -> usize
```

Returns the length of the DER OpenSSL DSA private key of the key.

::Anchor{id="DsaPrivateKey.impl.writeTraditionalDer"}

### Method `writeTraditionalDer`

```silk
pub fn writeTraditionalDer(self: &Self, output: &mut [u8]) -> Result<usize, DsaError>
```

Writes the DER OpenSSL DSA private key `SEQUENCE { 0, p, q, g, y, x }` of the key to the
start of `output`, and returns its length, which is [`DsaPrivateKey.traditionalDerLength`](#DsaPrivateKey.impl.traditionalDerLength).

#### Errors
- `InvalidLength` if `output` is shorter than the DER.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
