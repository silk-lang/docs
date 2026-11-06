Finite-field Diffie-Hellman key agreement (DH) over a prime modulus.

## When to use
Use [`DhPrivateKey`](#DhPrivateKey) where a protocol needs classic Diffie-Hellman, such as Node.js
`crypto.createDiffieHellman` and `crypto.getDiffieHellman`, SSH `diffie-hellman-group14`, or the
TLS groups `ffdhe2048` and up. For a new design, `silk.crypto.x25519` is faster and simpler.

## Details
A [`DhGroup`](#DhGroup) is a prime `p` and a generator `g`. [`DhGroup.named`](#DhGroup.impl.named) gives the MODP groups of RFC
2409 and RFC 3526 and the FFDHE groups of RFC 7919, all with `g = 2`. [`DhGroup.make`](#DhGroup.impl.make) takes any
odd prime from 512 to 8192 bits. A secret `x` gives the public key `g^x mod p`, and
[`DhPrivateKey.agree`](#DhPrivateKey.impl.agree) returns `y^x mod p` for the peer key `y`, big-endian and padded to the
length of `p`, as Node.js and TLS expect. The exponentiation takes the same time for every
secret of a group. Nothing allocates.

## Errors
- [`DhError`](#DhError) for a group, a secret, or a peer key that is not valid.

## Gotchas
[`DhGroup.make`](#DhGroup.impl.make) does not test that `p` is prime. Call [`DhGroup.check`](#DhGroup.impl.check) on a group from a
source that you do not trust, and use only safe primes. The key exchange does not authenticate the
peer. Pass the shared secret through `silk.crypto.hkdf` before you use it as a key. The secret
is not erased when it is dropped.

## Examples
### Agree on a shared secret
```silk
import silk.crypto.dh { DhError, DhGroup, DhNamedGroup, DhPrivateKey }
import silk.crypto.modular { Natural }
import silk.core.result { Result }

pub fn main() -> i32 {
  let group = DhGroup.named(DhNamedGroup.Modp14)
  // Real programs use `DhPrivateKey.generate(&group)` with a secure `Random` provider.
  let alice = match DhPrivateKey.fromBytes(&group, b"\x51\x7a\x2c\x09\x33") {
    Result<DhPrivateKey, DhError>.Success { value } => value
    Result<DhPrivateKey, DhError>.Failure {..} => {
      return 1
    }
  }
  let bob = match DhPrivateKey.fromBytes(&group, b"\x07\xe2\x91\x4c\x6d") {
    Result<DhPrivateKey, DhError>.Success { value } => value
    Result<DhPrivateKey, DhError>.Failure {..} => {
      return 1
    }
  }
  let mut alicePublic: [u8; 256] = [0; 256]
  let mut bobPublic: [u8; 256] = [0; 256]
  alice.writePublicKey(&mut alicePublic)
  bob.writePublicKey(&mut bobPublic)

  let mut fromAlice: [u8; 256] = [0; 256]
  let mut fromBob: [u8; 256] = [0; 256]
  match alice.agree(&bobPublic, &mut fromAlice) {
    Result<(), DhError>.Success {..} => {}
    Result<(), DhError>.Failure {..} => {
      return 1
    }
  }
  match bob.agree(&alicePublic, &mut fromBob) {
    Result<(), DhError>.Success {..} => {}
    Result<(), DhError>.Failure {..} => {
      return 1
    }
  }
  let mut i: usize = 0
  while i < 256 {
    if fromAlice[i] != fromBob[i] {
      return 1
    }
    i = i + 1
  }
  return 0
}
```

Import as `DhPrivateKey` with `import silk.crypto.dh { DhPrivateKey }`.

Public declarations: 5.

::Anchor{id="DhError"}

## `DhError`

```silk
pub enum DhError
```

The reason that a DH group, secret, or peer key is not valid. It holds no secret bytes.

::Anchor{id="DhError.InvalidPrime"}

### `InvalidPrime`

```silk
InvalidPrime
```

The prime is even, or not from 512 to 8192 bits.

::Anchor{id="DhError.InvalidGenerator"}

### `InvalidGenerator`

```silk
InvalidGenerator
```

The generator is not from 2 to `p - 2`.

::Anchor{id="DhError.InvalidSecret"}

### `InvalidSecret`

```silk
InvalidSecret
```

The secret is 0, or not less than `p`.

::Anchor{id="DhError.KeyTooSmall"}

### `KeyTooSmall`

```silk
KeyTooSmall
```

The peer key is 0 or 1. OpenSSL calls this a key that is too small.

::Anchor{id="DhError.KeyTooLarge"}

### `KeyTooLarge`

```silk
KeyTooLarge
```

The peer key is `p - 1` or more. OpenSSL calls this a key that is too large.

::Anchor{id="DhError.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

An output does not have the length of the prime.

::Anchor{id="DhError.impl.Debug"}

## Implementation `Debug for DhError`

```silk
impl Debug for DhError
```

::Anchor{id="DhError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `InvalidPrime`.

::Anchor{id="DhNamedGroup"}

## `DhNamedGroup`

```silk
pub enum DhNamedGroup
```

A standard DH group. Every one has the generator 2 and a safe prime `p = 2q + 1`.

::Anchor{id="DhNamedGroup.Modp1"}

### `Modp1`

```silk
Modp1
```

The 768-bit MODP group 1 of RFC 2409. It is too small to be secure; use it only to talk to old systems.

::Anchor{id="DhNamedGroup.Modp2"}

### `Modp2`

```silk
Modp2
```

The 1024-bit MODP group 2 of RFC 2409. It is too small to be secure; use it only to talk to old systems.

::Anchor{id="DhNamedGroup.Modp5"}

### `Modp5`

```silk
Modp5
```

The 1536-bit MODP group 5 of RFC 3526.

::Anchor{id="DhNamedGroup.Modp14"}

### `Modp14`

```silk
Modp14
```

The 2048-bit MODP group 14 of RFC 3526.

::Anchor{id="DhNamedGroup.Modp15"}

### `Modp15`

```silk
Modp15
```

The 3072-bit MODP group 15 of RFC 3526.

::Anchor{id="DhNamedGroup.Modp16"}

### `Modp16`

```silk
Modp16
```

The 4096-bit MODP group 16 of RFC 3526.

::Anchor{id="DhNamedGroup.Modp17"}

### `Modp17`

```silk
Modp17
```

The 6144-bit MODP group 17 of RFC 3526.

::Anchor{id="DhNamedGroup.Modp18"}

### `Modp18`

```silk
Modp18
```

The 8192-bit MODP group 18 of RFC 3526.

::Anchor{id="DhNamedGroup.Ffdhe2048"}

### `Ffdhe2048`

```silk
Ffdhe2048
```

The 2048-bit group `ffdhe2048` of RFC 7919, for TLS.

::Anchor{id="DhNamedGroup.Ffdhe3072"}

### `Ffdhe3072`

```silk
Ffdhe3072
```

The 3072-bit group `ffdhe3072` of RFC 7919, for TLS.

::Anchor{id="DhNamedGroup.Ffdhe4096"}

### `Ffdhe4096`

```silk
Ffdhe4096
```

The 4096-bit group `ffdhe4096` of RFC 7919, for TLS.

::Anchor{id="DhNamedGroup.Ffdhe6144"}

### `Ffdhe6144`

```silk
Ffdhe6144
```

The 6144-bit group `ffdhe6144` of RFC 7919, for TLS.

::Anchor{id="DhNamedGroup.Ffdhe8192"}

### `Ffdhe8192`

```silk
Ffdhe8192
```

The 8192-bit group `ffdhe8192` of RFC 7919, for TLS.

::Anchor{id="DhNamedGroup.impl.Debug"}

## Implementation `Debug for DhNamedGroup`

```silk
impl Debug for DhNamedGroup
```

::Anchor{id="DhNamedGroup.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Modp14`.

::Anchor{id="DhGroup"}

## `DhGroup`

```silk
pub struct DhGroup
```

A DH group: a prime modulus `p` and a generator `g`.

### When to use
Use [`DhGroup.named`](#DhGroup.impl.named) for a standard group, or [`DhGroup.make`](#DhGroup.impl.make) for a group that the peer sends.

### Details
The group is a fixed-size `Copy` value of about 3 KiB that does not allocate.

::Anchor{id="DhGroup.impl.Copy"}

## Implementation `Copy for DhGroup`

```silk
impl Copy for DhGroup
```

::Anchor{id="DhGroup.impl"}

## Implementation `DhGroup`

```silk
impl DhGroup
```

::Anchor{id="DhGroup.impl.named"}

### Associated function `named`

```silk
pub fn named(group: DhNamedGroup) -> DhGroup
```

Returns the standard group `group`.

::Anchor{id="DhGroup.impl.make"}

### Associated function `make`

```silk
pub fn make(prime: &[u8], generator: &[u8]) -> Result<DhGroup, DhError>
```

Returns the group with the big-endian prime `prime` and generator `generator`.

Leading zero bytes are allowed.

#### Errors
- `InvalidPrime` if the prime is even, or not from 512 to 8192 bits.
- `InvalidGenerator` if the generator is not from 2 to `p - 2`.

#### Gotchas
It does not test that `prime` is prime; [`DhGroup.check`](#DhGroup.impl.check) does.

::Anchor{id="DhGroup.impl.prime"}

### Method `prime`

```silk
pub fn prime(self: &Self) -> Natural
```

Returns the prime `p`, with the word length of the group.

::Anchor{id="DhGroup.impl.generator"}

### Method `generator`

```silk
pub fn generator(self: &Self) -> Natural
```

Returns the generator `g`, with the word length of the group.

::Anchor{id="DhGroup.impl.primeLength"}

### Method `primeLength`

```silk
pub fn primeLength(self: &Self) -> usize
```

Returns the length of `p` in bytes, such as 256 for a 2048-bit group. Public keys and shared
secrets have this length.

::Anchor{id="DhGroup.impl.primeBits"}

### Method `primeBits`

```silk
pub fn primeBits(self: &Self) -> usize
```

Returns the length of `p` in bits.

::Anchor{id="DhGroup.impl.check"}

### Method `check`

```silk
pub effect fn check(self: &Self) -> DhCheck
    ? &mut Random
```

Tests whether `p` is prime and whether `(p - 1) / 2` is prime too, as OpenSSL `DH_check`
does for a group without a known subgroup order.

It uses `silk.crypto.prime` with [`Prime.recommendedRounds`](/docs/std/crypto-prime#Prime.impl.recommendedRounds) and reads random bases from the
ambient `Random`. For an 8192-bit group it takes seconds, so check a custom group once, and do
not check the named groups, which are safe primes.

::Anchor{id="DhCheck"}

## `DhCheck`

```silk
pub struct DhCheck
```

The result of [`DhGroup.check`](#DhGroup.impl.check): whether the prime of a group is prime and safe.

### Details
Node.js reports the same facts as `verifyError`: `DH_CHECK_P_NOT_PRIME` (1) when
[`DhCheck.prime`](#DhCheck.prime) is false, and `DH_CHECK_P_NOT_SAFE_PRIME` (2) when [`DhCheck.safePrime`](#DhCheck.safePrime) is
false.

::Anchor{id="DhCheck.prime"}

### Field `prime`

```silk
pub prime: bool
```

Whether `p` passed the primality test.

::Anchor{id="DhCheck.safePrime"}

### Field `safePrime`

```silk
pub safePrime: bool
```

Whether `p` and `(p - 1) / 2` both passed the primality test.

::Anchor{id="DhPrivateKey"}

## `DhPrivateKey`

```silk
pub struct DhPrivateKey
```

A DH secret with its group and public key.

### When to use
Make one with [`DhPrivateKey.generate`](#DhPrivateKey.impl.generate) for each key exchange, send the public key from
[`DhPrivateKey.writePublicKey`](#DhPrivateKey.impl.writePublicKey), and call [`DhPrivateKey.agree`](#DhPrivateKey.impl.agree) with the peer key.

### Details
The value is a fixed-size `Copy` value of about 5 KiB that does not allocate. The secret has the
word length of the group, so every exponentiation in a group takes the same time.

### Gotchas
Pass the shared secret through `silk.crypto.hkdf` before you use it as a key. The secret is not
erased when it is dropped.

::Anchor{id="DhPrivateKey.impl.Copy"}

## Implementation `Copy for DhPrivateKey`

```silk
impl Copy for DhPrivateKey
```

::Anchor{id="DhPrivateKey.impl"}

## Implementation `DhPrivateKey`

```silk
impl DhPrivateKey
```

::Anchor{id="DhPrivateKey.impl.generate"}

### Associated function `generate`

```silk
pub effect fn generate(group: &DhGroup) -> DhPrivateKey
    ? &mut Random
```

Returns a new random secret in `group`, with bytes from the ambient `Random`.

The secret is uniform from 2 to `2^(n - 1) - 1` for an `n`-bit prime, as in OpenSSL. The
`Random` provider must be cryptographically secure. If it fails, the program stops.

::Anchor{id="DhPrivateKey.impl.fromBytes"}

### Associated function `fromBytes`

```silk
pub fn fromBytes(group: &DhGroup, secret: &[u8]) -> Result<DhPrivateKey, DhError>
```

Returns the key for the big-endian secret `secret` in `group`, as Node.js
`setPrivateKey` does.

Leading zero bytes are allowed.

#### Errors
- `InvalidSecret` if the secret is 0, or not less than `p`.

::Anchor{id="DhPrivateKey.impl.group"}

### Method `group`

```silk
pub fn group(self: &Self) -> DhGroup
```

Returns the group of the key.

::Anchor{id="DhPrivateKey.impl.secret"}

### Method `secret`

```silk
pub fn secret(self: &Self) -> Natural
```

Returns the secret `x`, with the word length of the group.

#### Gotchas
The value is the private key. Keep it secret.

::Anchor{id="DhPrivateKey.impl.publicKey"}

### Method `publicKey`

```silk
pub fn publicKey(self: &Self) -> Natural
```

Returns the public key `g^x mod p`, with the word length of the group.

::Anchor{id="DhPrivateKey.impl.writePublicKey"}

### Method `writePublicKey`

```silk
pub fn writePublicKey(self: &Self, output: &mut [u8]) -> ()
```

Writes the public key to all of `output`, big-endian with leading zero bytes.

#### Gotchas
The program traps if `output` is shorter than [`DhGroup.primeLength`](#DhGroup.impl.primeLength).

::Anchor{id="DhPrivateKey.impl.agree"}

### Method `agree`

```silk
pub fn agree(self: &Self, peer: &[u8], output: &mut [u8]) -> Result<(), DhError>
```

Writes the shared secret `y^x mod p` for the big-endian peer key `peer` to `output`,
big-endian and padded with leading zero bytes to the length of `p`.

Leading zero bytes in `peer` are allowed. The time does not depend on the secret or on the
value of the peer key.

#### Errors
- `InvalidLength` if `output` is not [`DhGroup.primeLength`](#DhGroup.impl.primeLength) bytes.
- `KeyTooSmall` if the peer key is 0 or 1.
- `KeyTooLarge` if the peer key is `p - 1` or more.

`output` does not change when it fails.

Category: Cryptography.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
