The TLS 1.2 pseudorandom function (RFC 5246 section 5) and the secrets that TLS 1.2 derives
with it: the extended master secret (RFC 7627), the key block, and Finished.

## When to use
`silk.tls.client` and `silk.tls.server` use this module for TLS 1.2 handshakes. Use [`TlsPrf`](#TlsPrf)
directly only when you build your own TLS 1.2 endpoint, or to export keying material.

## Details
The PRF is `P_SHA256` or `P_SHA384` over HMAC, selected by the cipher suite's hash. The master
secret is always the extended master secret, over the hash of the handshake messages through
ClientKeyExchange; this module has no form for the legacy master secret.

## Gotchas
The functions do not check that the secrets came from a handshake. Secrets are not erased.

## Examples
### Expand a secret with the SHA-256 PRF
```silk
import silk.tls.prf { TlsPrf }

pub fn main() -> i32 {
  let secret: [u8; 16] = [155, 190, 67, 107, 169, 64, 240, 23, 177, 118, 82, 132, 154, 113, 219, 53]
  let seed: [u8; 16] = [160, 186, 159, 147, 108, 218, 49, 24, 39, 166, 247, 150, 255, 213, 25, 140]
  let mut output: [u8; 100] = [0; 100]
  TlsPrf.expand(32, &secret, "test label", &seed, &mut output)
  // The first bytes of the widely used TLS 1.2 PRF test vector.
  if output[0] != 227 || output[1] != 242 || output[99] == 0 {
    return 1
  }
  return 0
}
```

Import as `TlsPrf` with `import silk.tls.prf { TlsPrf }`.

Public declarations: 3.

::Anchor{id="VERIFY_DATA_LENGTH"}

## `VERIFY_DATA_LENGTH`

```silk
pub const VERIFY_DATA_LENGTH: usize
```

The length of TLS 1.2 Finished `verify_data`.

::Anchor{id="Tls12Keys"}

## `Tls12Keys`

```silk
pub struct Tls12Keys
```

The TLS 1.2 traffic keys of one connection, from the key block (RFC 5246 section 6.3).

### Details
The key fields hold `keyLength` bytes and the IV fields hold `ivLength` bytes, followed by
zeros. The IV is the 4-byte salt for AES-GCM and the 12-byte IV for ChaCha20-Poly1305.

::Anchor{id="Tls12Keys.clientKey"}

### Field `clientKey`

```silk
pub clientKey: [u8; 32]
```

The client's write key.

::Anchor{id="Tls12Keys.serverKey"}

### Field `serverKey`

```silk
pub serverKey: [u8; 32]
```

The server's write key.

::Anchor{id="Tls12Keys.clientIv"}

### Field `clientIv`

```silk
pub clientIv: [u8; 12]
```

The client's fixed IV.

::Anchor{id="Tls12Keys.serverIv"}

### Field `serverIv`

```silk
pub serverIv: [u8; 12]
```

The server's fixed IV.

::Anchor{id="Tls12Keys.keyLength"}

### Field `keyLength`

```silk
pub keyLength: usize
```

The key length: 16 for AES-128-GCM, 32 otherwise.

::Anchor{id="Tls12Keys.ivLength"}

### Field `ivLength`

```silk
pub ivLength: usize
```

The IV length: 4 for AES-GCM, 12 for ChaCha20-Poly1305.

::Anchor{id="Tls12Keys.impl.Copy"}

## Implementation `Copy for Tls12Keys`

```silk
impl Copy for Tls12Keys
```

::Anchor{id="TlsPrf"}

## `TlsPrf`

```silk
pub struct TlsPrf
```

The TLS 1.2 PRF and the secrets derived with it.

::Anchor{id="TlsPrf.impl"}

## Implementation `TlsPrf`

```silk
impl TlsPrf
```

::Anchor{id="TlsPrf.impl.expand"}

### Associated function `expand`

```silk
pub fn expand(hashLength: usize, secret: &[u8], label: string, seed: &[u8], output: &mut [u8]) -> ()
```

Fills `output` with `PRF(secret, label, seed)` (RFC 5246 section 5), with HMAC-SHA384 when
`hashLength` is 48 and HMAC-SHA256 otherwise.

::Anchor{id="TlsPrf.impl.expandBytes"}

### Associated function `expandBytes`

```silk
pub fn expandBytes(
    hashLength: usize,
    secret: &[u8],
    label: &[u8],
    seed: &[u8],
    output: &mut [u8],
  ) -> ()
```

Fills `output` with `PRF(secret, label, seed)`, as [`TlsPrf.expand`](#TlsPrf.impl.expand) does, for a label given
as bytes.

::Anchor{id="TlsPrf.impl.extendedMasterSecret"}

### Associated function `extendedMasterSecret`

```silk
pub fn extendedMasterSecret(suite: CipherSuite, preMaster: &[u8], sessionHash: &[u8]) -> [u8; 48]
```

Returns the extended master secret (RFC 7627 section 4) for the suite's PRF, from the
ECDHE shared secret `preMaster` and `sessionHash`, the hash of the handshake messages through
ClientKeyExchange.

::Anchor{id="TlsPrf.impl.keys"}

### Associated function `keys`

```silk
pub fn keys(
    suite: CipherSuite,
    master: &[u8; 48],
    clientRandom: &[u8; 32],
    serverRandom: &[u8; 32],
  ) -> Tls12Keys
```

Returns the traffic keys of `suite` from the master secret and the two hello random values
(RFC 5246 section 6.3).

::Anchor{id="TlsPrf.impl.finished"}

### Associated function `finished`

```silk
pub fn finished(
    suite: CipherSuite,
    master: &[u8; 48],
    client: bool,
    handshakeHash: &[u8],
  ) -> [u8; 12]
```

Returns the Finished `verify_data` (RFC 5246 section 7.4.9) that the client sends when
`client` is `true`, and the server's otherwise, over `handshakeHash`, the hash of the
handshake messages before that Finished.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
