# Cryptography

This guide builds `sealnote`, a small program that touches each part of the cryptography in the std lib. It hashes text, checks a webhook tag, verifies two release signatures, agrees on a key between two parties, and seals a note with authenticated encryption. Every primitive is a plain function on bytes, except the ones that need fresh randomness, which require the `Random` service.

## What the std lib gives you

The crypto modules are portable and allocate nothing. They work on byte slices (`&[u8]`) and fixed arrays, and they run on every target, including no-libc Linux and WebAssembly.

| Need | Module | Type |
| --- | --- | --- |
| Digest | `silk/crypto/sha2`, `silk/crypto/sha3`, `silk/crypto/blake2b`, `silk/crypto/sha1` | `Sha256`, `Sha384`, `Sha512`, `Sha3_256`, `Blake2b512`, `Sha1`, ... |
| Keyed tag | `silk/crypto/hmac` | `HmacSha256`, `HmacSha384` |
| Key derivation | `silk/crypto/hkdf` | `HkdfSha256`, `HkdfSha384` |
| Authenticated encryption | `silk/crypto/chacha20_poly1305`, `silk/crypto/aes_gcm` | `ChaCha20Poly1305`, `AesGcm` |
| Key agreement | `silk/crypto/x25519`, `silk/crypto/p256` | `X25519`, `P256` |
| Signature verification | `silk/crypto/ed25519`, `silk/crypto/p256`, `silk/crypto/p384`, `silk/crypto/rsa` | `Ed25519PublicKey`, `EcdsaP256Sha256`, `EcdsaP384Sha384`, `RsaPublicKey` |
| Secure random bytes | `silk/system/random`, `silk/system/random_native` | `Random`, `OsRandom` |

There is no signing and no general-purpose public-key encryption. The signature modules verify only: they exist so that TLS and your own code can check signatures made elsewhere. `silk/collections/hash` is a different thing. It hashes collection keys for `HashMap` and is not cryptographic.

## Set up the project

```sh
silk init sealnote
cd sealnote
```

Replace `src/main.silk` piece by piece as you read. The pieces below, in order, make up the whole file. Start with the imports and two helpers:

```silk
import silk.encoding.base64 { Base64 }
import silk.crypto.blake2b { Blake2b512 }
import silk.crypto.chacha20_poly1305 { AeadError, ChaCha20Poly1305 }
import silk.crypto.ed25519 { Ed25519PublicKey }
import silk.core.effect { Effect }
import silk.text.format { Debug, Format, Formatter }
import silk.crypto.hkdf { HkdfSha256 }
import silk.crypto.hmac { HmacSha256 }
import silk.io.logger { LogError, Logger }
import silk.io.logger_native { StdoutLogger }
import silk.system.random_native { OsRandom }
import silk.crypto.p256 { EcdsaP256Sha256 }
import silk.system.random { Random }
import silk.core.result { Result }
import silk.crypto.sha2 { Sha256 }
import silk.crypto.sha3 { Sha3_256 }
import silk.collections.slice { Slice }
import silk.text.string { String }
import silk.num.u8
import silk.io.writer { Writer, WriterError }
import silk.crypto.x25519 { X25519 }

pub struct Broken { pub step: string<'static> }

impl Debug for Broken {
  effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    return run Format.debugFields(self, "Broken", &mut formatter)
  }
}

fn hex<'a>(bytes: &[u8], out: &'a mut [u8]) -> string<'a> {
  let digits = b"0123456789abcdef"
  let mut index: usize = 0
  while index < bytes.length {
    out[index * 2] = digits[u8.toUsize(bytes[index] / 16)]
    out[index * 2 + 1] = digits[u8.toUsize(bytes[index] % 16)]
    index = index + 1
  }
  // Hex digits are ASCII, so the bytes are valid UTF-8.
  return unsafe String.fromUtf8Unchecked(Slice.view(&out, 0, bytes.length * 2))
}
```

`Broken` is the program's one failure type. Each step that can go wrong fails with it and names itself. `main` can fail with it, so it implements `Debug`: when a step fails, the runtime prints the value, as `Broken { step: "seal" }`. `Format.debugFields` writes the struct's `pub` fields, which is why `step` is `pub`.

`hex` writes two hex digits per byte into a buffer you lend it and returns the filled part as text. The std lib has no hex formatter, and templates cannot print a byte array, so you write this once. `Slice.view` from `silk/collections/slice` borrows the first `bytes.length * 2` bytes. `String.fromUtf8Unchecked` is `unsafe` because it skips validation; the digits are ASCII, so that is safe here. Use the checked `String.fromUtf8` when you do not know the bytes.

## Hash some bytes

```silk
effect fn digests() -> () ! LogError ? &mut Logger {
  let mut text: [u8; 128] = [0; 128]
  let sha2 = Sha256.hash(b"abc")
  run Effect.log("sha256   {d}\n", &.{ d: hex(&sha2, &mut text) })

  let mut state = Sha3_256.make()
  state.update(b"a")
  state.update(b"bc")
  let sha3 = state.finish()
  run Effect.log("sha3-256 {d}\n", &.{ d: hex(&sha3, &mut text) })

  let blake = Blake2b512.hash(b"abc")
  run Effect.log("blake2b  {d}\n", &.{ d: hex(&blake, &mut text) })
}
```

Each digest type has the same three entry points. `hash` takes the whole message at once. `make`, then `update` any number of times, then `finish`, does the same in pieces, which is how you hash a file or a stream. `finish` consumes the state, so the compiler stops you from updating a finished hash.

The result is a fixed array: `[u8; 32]` for SHA-256 and SHA3-256, `[u8; 48]` for SHA-384, `[u8; 64]` for SHA-512 and BLAKE2b. `b"abc"` is a byte string literal, a `&[u8]`.

Pick SHA-256 unless a protocol says otherwise. SHA-3 exists for protocols that require it. `Blake2b512` from `silk/crypto/blake2b` is unkeyed BLAKE2b with a 64-byte digest (RFC 7693), for formats that name it, such as minisign's prehashed signatures. It has no key, salt, personalization or shorter digest lengths. `silk/crypto/sha1` is there for old protocols such as WebSocket handshakes and should not be used for anything new.

## Check a keyed tag with HMAC

A webhook sender and receiver share a secret. The sender sends a tag over the body, and the receiver recomputes it:

```silk
effect fn checkWebhook() -> () ! LogError ? &mut Logger {
  let secret = b"webhook-secret"
  let body = b"{\"event\":\"push\"}"
  let sent = HmacSha256.authenticate(secret, body)

  let mut text: [u8; 128] = [0; 128]
  run Effect.log("hmac     {t}\n", &.{ t: hex(&sent, &mut text) })

  let mut state = HmacSha256.make(secret)
  state.update(b"{\"event\":")
  state.update(b"\"push\"}")
  let received = state.finish()
  run Effect.log("webhook tag matches: {ok}\n", &.{ ok: sameBytes(&sent, &received) })
}

fn sameBytes(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length { return false }
  let mut difference: u8 = 0
  let mut index: usize = 0
  while index < left.length {
    difference = u8.bitOr(difference, u8.bitXor(left[index], right[index]))
    index = index + 1
  }
  return difference == 0
}
```

`HmacSha256.authenticate(key, message)` returns the 32-byte tag in one call. The incremental form gives the same tag however you split the message. The result of `sameBytes` is a `bool`, and a template prints it as `true` or `false`.

The HMAC types compute tags. They do not compare them. Comparing with an early-exit loop leaks, through timing, how many leading bytes matched. `sameBytes` instead ORs together the XOR of every byte pair, so it always looks at the whole tag. `u8.bitOr` and `u8.bitXor` come from `silk/num/u8`.

## Verify a signature

A release server signs `release 1.4.2` with an ECDSA P-256 key and publishes the public key and the signature as Base64. The program decodes both and checks the signature, then checks it against a message that was never signed:

```silk
effect fn decode(text: &[u8], out: &mut [u8]) -> usize ! Broken {
  return match move Base64.decodeInto(&mut out, text) {
    Result.Success { value } => value
    Result.Failure { error } => { fail Broken { step: "base64" } }
  }
}

effect fn checkRelease() -> () ! LogError | Broken ? &mut Logger {
  let mut publicKey: [u8; 65] = [0; 65]
  let mut signature: [u8; 72] = [0; 72]
  drop run decode(b"BLiakmQaBDmx17o4EMKPfLiPjl6PbBDhVsxg5lu51BdjqqElxCmHtVI1HBOR8kqYIoqgPMiZwD8LQwlAbibQwPE=", &mut publicKey)
  let length = run decode(b"MEUCIQDBhgtYNiX7CIt/uUNa1+ujOOdfdIMxuYb5mWQGRPKkywIgLCVRhd6YJvKXxLlKwZNpjg/dVvaEz/Fm4ftetsEbUO4=", &mut signature)
  let der = Slice.view(&signature, 0, length)

  let good = match move EcdsaP256Sha256.verify(&publicKey, b"release 1.4.2", der) {
    Result.Success { value } => true
    Result.Failure { error } => false
  }
  let forged = match move EcdsaP256Sha256.verify(&publicKey, b"release 1.4.3", der) {
    Result.Success { value } => true
    Result.Failure { error } => false
  }
  run Effect.log("signature on 1.4.2 valid: {good}\n", &.{ good: good })
  run Effect.log("signature on 1.4.3 valid: {forged}\n", &.{ forged: forged })
}
```

`EcdsaP256Sha256.verify(publicKey, message, signature)` hashes the message with SHA-256 and returns `Result<(), P256SignatureError>`. The public key is the 65-byte uncompressed point (it starts with byte 4). The signature is DER, so its length varies; here it is 71 bytes, and `Slice.view` passes exactly those. `Base64.decodeInto` from `silk/encoding/base64` returns how many bytes it wrote. The Encodings and compression guide covers it.

The error tells you why a check failed (`InvalidKey`, `InvalidEncoding`, and so on), but a wrong signature over a well-formed message is simply a failure. Treat every `Failure` as "not valid".

For P-384 use `EcdsaP384Sha384.verify` from `silk/crypto/p384`, with a 97-byte key. For RSA, `RsaPublicKey.fromComponents(modulus, exponent)` from `silk/crypto/rsa` admits a 2048 to 4096-bit key with exponent 65537, and `verifyPss` checks a SHA-256 PSS signature. Each of these modules also has a `verifyCertificate` that the certificate code in `silk/tls/certificate_profile` uses.

## Verify an Ed25519 signature

A mirror of the release server signs the same text with Ed25519 instead. The key is 32 bytes and the signature always 64:

```silk
effect fn checkMirror() -> () ! LogError | Broken ? &mut Logger {
  let mut publicKey: [u8; 32] = [0; 32]
  let mut signature: [u8; 64] = [0; 64]
  drop run decode(b"A6EHv/POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg=", &mut publicKey)
  drop run decode(b"/sVi4mB7r9385B5GA0l88z2l78KzcjoAD0JbZWfRxmwmdoQgYCA6lDA5xFfBALxuWPlfQacqGyDpc0H5HRQFCA==", &mut signature)

  let key = match move Ed25519PublicKey.fromBytes(&publicKey) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail Broken { step: "ed25519 key" } }
  }
  let good = match move key.verify(b"release 1.4.2", &signature) {
    Result.Success { value } => true
    Result.Failure { error } => false
  }
  let forged = match move key.verify(b"release 1.4.3", &signature) {
    Result.Success { value } => true
    Result.Failure { error } => false
  }
  run Effect.log("ed25519 on 1.4.2 valid: {good}\n", &.{ good: good })
  run Effect.log("ed25519 on 1.4.3 valid: {forged}\n", &.{ forged: forged })
}
```

`Ed25519PublicKey.fromBytes(bytes)` from `silk/crypto/ed25519` decodes and checks the key once, and fails with `Ed25519Error.InvalidKeyLength` or `InvalidKey`. `verify(message, signature)` then returns `Result<(), Ed25519Error>`, failing with `InvalidSignatureLength` or `InvalidSignature`. Unlike ECDSA there is no separate hash to pick: Ed25519 hashes the message itself with SHA-512. For a prehashed format, such as minisign's `ED` algorithm, pass the BLAKE2b digest as the message.

Verification works on public data and does not try to run in constant time. Like the other signature modules, `silk/crypto/ed25519` cannot sign.

## Agree on a key

Two parties, Alice and Bob, each make a key pair, swap public keys, and compute the same shared secret. Then they turn that secret into an encryption key with HKDF:

```silk
effect fn agreeKey() -> [u8; 32] ! Broken ? &mut Random {
  let alice = run X25519.generate()
  let bob = run X25519.generate()
  let alicePublic = alice.publicKey()
  let bobPublic = bob.publicKey()

  let aliceShared = match move alice.agree(&bobPublic) {
    Result.Success { value } => value
    Result.Failure { error } => { fail Broken { step: "alice agree" } }
  }
  let bobShared = match move bob.agree(&alicePublic) {
    Result.Success { value } => value
    Result.Failure { error } => { fail Broken { step: "bob agree" } }
  }
  if !sameBytes(&aliceShared, &bobShared) { fail Broken { step: "shared secrets differ" } }

  let prk = HkdfSha256.extract(b"silk-guide salt", &aliceShared)
  let mut key: [u8; 32] = [0; 32]
  match move HkdfSha256.expand(&prk, b"note encryption v1", &mut key) {
    Result.Success { value } => {}
    Result.Failure { error } => { fail Broken { step: "expand" } }
  }
  return key
}
```

`X25519.generate()` is an effect that requires `&mut Random` from `silk/system/random`. It draws 32 fresh secure bytes and derives the public key. Code that needs randomness says so in its signature, and whoever runs it decides where the bytes come from. To use known bytes, for example a test vector, call `X25519.fromSecret(bytes)` instead.

`publicKey()` returns the 32 bytes to send to the peer. `agree(peer)` consumes the key: the type is not `Copy` and `agree` takes `self` by value, so one ephemeral key can only be used for one agreement. It fails with `X25519Error.AllZeroSharedSecret` for a malicious peer value. `P256` in `silk/crypto/p256` has the same shape with a 65-byte public key, for protocols that require NIST curves.

A shared secret is not a key yet. `HkdfSha256.extract(salt, secret)` turns it into a 32-byte pseudorandom key, and `expand(prk, info, output)` fills `output` with key material bound to the `info` label. Use a different `info` for each key you derive, such as one per direction. `expand` fails only when you ask for more than 255 hash blocks (8160 bytes for SHA-256).

## Seal and open a note

```silk
effect fn sealNote() -> () ! LogError | Broken ? &mut Logger | &mut Random {
  let key = run agreeKey()
  run Effect.log("agreed on a 32-byte key\n", &())

  let note = b"meet at the north gate"
  let header = b"note-17"
  let mut nonce: [u8; 12] = [0; 12]
  run Random.fillBytes(&mut nonce)

  let mut sealed: [u8; 22] = [0; 22]
  let mut tag: [u8; 16] = [0; 16]
  match move ChaCha20Poly1305.seal(&key, &nonce, header, note, &mut sealed, &mut tag) {
    Result.Success { value } => {}
    Result.Failure { error } => { fail Broken { step: "seal" } }
  }

  let mut opened: [u8; 22] = [0; 22]
  match move ChaCha20Poly1305.open(&key, &nonce, header, &sealed, &tag, &mut opened) {
    Result.Success { value } => {}
    Result.Failure { error } => { fail Broken { step: "open" } }
  }
  let text = unsafe String.fromUtf8Unchecked(&opened)
  run Effect.log("opened: {text}\n", &.{ text: text })

  sealed[0] = u8.bitXor(sealed[0], 1)
  match move ChaCha20Poly1305.open(&key, &nonce, header, &sealed, &tag, &mut opened) {
    Result.Success { value } => { fail Broken { step: "tampered note opened" } }
    Result.Failure { error } => {
      match error {
        AeadError.AuthenticationFailed => run Effect.log("tampered: rejected\n", &())
        _ => { fail Broken { step: "unexpected error" } }
      }
    }
  }
}
```

An AEAD cipher encrypts and authenticates in one step. `seal` takes the key, a 12-byte nonce, associated data, the plaintext, and two destinations: the ciphertext (as long as the plaintext) and a detached 16-byte tag. `open` checks the tag first and writes the plaintext only if it matches. On any failure the destinations are left unchanged.

- The nonce must never repeat under one key. Twelve random bytes from `Random.fillBytes` are fine for a modest number of messages. A counter is better when one key seals many.
- The associated data (`header` here) is authenticated but not encrypted. Put things the receiver must trust but can read, such as a message id or a version.
- Flipping one bit of the ciphertext makes `open` fail with `AeadError.AuthenticationFailed`, which the last step shows.

`AesGcm` in `silk/crypto/aes_gcm` takes exactly the same arguments. It accepts a 16 or 32-byte key and fails with the union `AesGcmError`. To switch, change the import and the three calls; because `AesGcmError` is a union rather than an enum, the inner match becomes `match move error`.

|  | `ChaCha20Poly1305` | `AesGcm` |
| --- | --- | --- |
| Key | 32 bytes | 16 or 32 bytes |
| Nonce, tag | 12, 16 bytes | 12, 16 bytes |
| Error type | enum `AeadError` | union `AesGcmError` |
| Tag mismatch | `AeadError.AuthenticationFailed` | `AesGcmError.AuthenticationFailed` |

## Provide the services and run

`main` creates the two providers and hands them over:

```silk
pub effect fn main() -> () ! LogError | Broken {
  let mut logger = StdoutLogger.make()
  let mut random = OsRandom.make()
  run digests() |> Effect.provideMut(&mut logger)
  run checkWebhook() |> Effect.provideMut(&mut logger)
  run checkRelease() |> Effect.provideMut(&mut logger)
  run checkMirror() |> Effect.provideMut(&mut logger)
  run sealNote()
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Logger>(&mut logger)
}
```

`OsRandom` from `silk/system/random_native` reads the operating system's secure random source. Nothing in the program reaches for it on its own: `X25519.generate` and `Random.fillBytes` only say they need a `Random`, and `main` decides which. In a test you can provide your own `Random` that hands out fixed bytes and get the same keys every run. The Testing with providers guide shows how to write such a provider.

Run it:

```sh
silk run
```

```
sha256   ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
sha3-256 3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532
blake2b  ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923
hmac     7eaf83970d7ec8ac8821fb679caa6197a556926ca35aaee7893bc5f4461a6bba
webhook tag matches: true
signature on 1.4.2 valid: true
signature on 1.4.3 valid: false
ed25519 on 1.4.2 valid: true
ed25519 on 1.4.3 valid: false
agreed on a 32-byte key
opened: meet at the north gate
tampered: rejected
```

The keys and nonce are fresh on every run, but the output is the same because the program never prints them.

Now leave out the `Random` provider, so the last `run` reads `run sealNote() |> Effect.provideMut<Logger>(&mut logger)`:

```sh
silk check
```

```
Checking sealnote (x86_64-unknown-linux-gnu)
  load     67 modules, 1 in package          0.08s
  check    failed: 2 modules, 1 error        0.18s
[x86_64-unknown-linux-gnu]
src/main.silk:192:3: error[SEM0071] This `run` needs `&mut Random`, which the enclosing function does not provide; add `? &mut Random` to its signature, or provide it with `|> Effect.provideMut(&mut value)`
Failed sealnote in 0.27s
```

`sealNote` still needs `&mut Random`, and `main` neither provides it nor can declare it, so the program does not compile. A program cannot use secure randomness without choosing a source. See **Services and providers** in the reference.

## Things to keep in mind

- Secret state is not guaranteed to be erased from memory when a key or hash state is dropped.
- Comparing tags is your job; use a constant-time loop like `sameBytes`.
- Long inputs past a hash's length limit (2^64 bits for SHA-256) trap rather than fail.
- Use `Random` for every key, nonce and token. `silk/system/insecure_random` is for simulations and shuffles only. The Time and randomness guide explains the difference.

## API reference

- `silk/crypto/sha2`: `Sha256`, `Sha224`, `Sha384`, `Sha512`, `Sha512_224`, `Sha512_256`
- `silk/crypto/sha3`: `Sha3_224`, `Sha3_256`, `Sha3_384`, `Sha3_512`
- `silk/crypto/blake2b`: `Blake2b512`
- `silk/crypto/sha1`: `Sha1`
- `silk/crypto/hmac`: `HmacSha256`, `HmacSha384`
- `silk/crypto/hkdf`: `HkdfSha256`, `HkdfSha384`, `OutputTooLongError`
- `silk/crypto/chacha20_poly1305`: `ChaCha20Poly1305`, `AeadError`
- `silk/crypto/aes_gcm`: `AesGcm`, `AesGcmError`
- `silk/crypto/x25519`: `X25519`, `X25519Error`
- `silk/crypto/ed25519`: `Ed25519PublicKey`, `Ed25519Error`
- `silk/crypto/p256`: `P256`, `P256Error`, `EcdsaP256Sha256`, `P256SignatureError`
- `silk/crypto/p384`: `EcdsaP384Sha384`, `P384SignatureError`
- `silk/crypto/rsa`: `RsaPublicKey`, `RsaError`
- `silk/system/random`: `Random`; `silk/system/random_native`: `OsRandom`
- `silk/encoding/base64`: `Base64`; `silk/collections/slice`: `Slice`; `silk/num/u8`
