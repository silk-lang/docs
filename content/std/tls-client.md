A TLS 1.2 and TLS 1.3 client state machine that authenticates an HTTPS server over a byte transport that you
drive.

## When to use
Most programs use `silk.tls.connection`, which drives this client over a `ByteDuplex`. Use
[`Client`](#Client) directly when you need full control of the transport, for example in an event loop.
Make it with [`Client.make`](#Client.impl.make), then move bytes between it and the transport until it reports
`Authenticated`, and then read and write application data.

## Details
The client offers the versions that `ClientConfig.versions` allows. In TLS 1.3 it supports the
cipher suites ChaCha20-Poly1305, AES-128-GCM, and AES-256-GCM, and the key exchange groups X25519
and P-256. In TLS 1.2 (RFC 5246) it supports the ECDHE suites with ECDSA or RSA keys and
ChaCha20-Poly1305, AES-128-GCM, or AES-256-GCM, and the groups X25519, P-256, and P-384. It
requires the extended master secret (RFC 7627) and secure renegotiation from a TLS 1.2 server,
and when TLS 1.3 is also allowed, it rejects a TLS 1.2 ServerHello with the RFC 8446 downgrade
mark. It checks the certificate chain
against your `TrustSnapshot`, the host name of your `ReferenceIdentity`, the CertificateVerify
signature, and the Finished message. It gives no application data before all checks pass.

When the server sends a CertificateRequest, the client answers with the [`ClientCredential`](#ClientCredential)
given to [`Client.make`](#Client.impl.make): the chain and a CertificateVerify signed with its key, using a scheme
that the server lists. In TLS 1.2 the key must sign a digest, so it is ECDSA or RSA, and the
scheme's hash may differ from the suite's. With `ClientCredential.None`, or when no listed scheme
fits the key, it sends an empty Certificate message, and the server decides whether to go on.

With [`Resumption`](#Resumption) `Enabled`, the client asks for session tickets and returns each one as a
[`Session`](#Session) from [`Client.takeSession`](#Client.impl.takeSession). A later client given that session offers it as a PSK
with (EC)DHE, and when the server accepts, the handshake skips the certificate messages.
[`Session.encode`](#Session.impl.encode) and [`Session.decode`](#Session.impl.decode) let you keep sessions across processes.

A session whose ticket allows early data also lets the client send the `Resumption` `earlyData`
bytes as 0-RTT data, right after the ClientHello and before the server answers.
[`Client.earlyData`](#Client.impl.earlyData) tells you whether the server accepted them. When it rejected them, write
them again after `Authenticated`.

Each call returns a [`Progress`](#Progress): how many bytes it took or wrote, and the next [`Demand`](#Demand).
Output works in two steps: write [`Client.pendingOutput`](#Client.impl.pendingOutput) to the transport, and then call
[`Client.ackWritten`](#Client.impl.ackWritten) with the number of bytes written. The client does not keep your buffers.
[`ClientLimits`](#ClientLimits) bound all memory and work.

## Errors
- [`TlsError`](#TlsError) for an alert from the server, a protocol error, a certificate that fails, a
  limit, or a call in the wrong state. An error is permanent for the client.
- `OutOfMemoryError` from [`Client.make`](#Client.impl.make) if the `Allocator` fails.

## Gotchas
You provide the trust, the time, the random source, and the transport. The client supports one
profile, not all of the Web PKI. In TLS 1.2 it does not resume sessions, has no KeyUpdate,
sends an empty Certificate for an Ed25519 credential, and ignores a HelloRequest, so the server
cannot renegotiate. Dropping the client does not send `close_notify`. Call
[`Client.closeWrite`](#Client.impl.closeWrite) first. Secrets are not erased.

## Examples
### Make a client and send its ClientHello
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.tls.https_identity { HttpsIdentity, IdentityError, OriginHost, ReferenceIdentity }
import silk.collections.list { List }
import silk.system.random { Random }
import silk.core.result { Result }
import silk.system.system_clock { SystemClock }
import silk.tls.client { AlpnConfig, Client, ClientConfig, ClientCredential, ClientLimits, Progress, Resumption, TlsError }
import silk.tls.record { VersionPolicy }
import silk.tls.trust_anchor { TrustAnchor }
import silk.tls.trust_snapshot { SnapshotLimits, TrustSnapshot, TrustSourceError }
import silk.num.usize

// Not secure. Real programs use a `Random` provider from the operating system.
struct ExampleRandom {
  next: usize,
}

impl Random for ExampleRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    let mut index: usize = 0
    while index < output.length {
      output[index] = usize.toU8((self.next + index) % 251 + 1)
      index = index + 1
    }
    self.next = self.next + output.length
    return ()
  }
}

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut random = ExampleRandom { next: 1 }
  let reference = match HttpsIdentity.reference(OriginHost<'static>.Dns { bytes: b"example.com" }) {
    Result<ReferenceIdentity, IdentityError>.Success { value } => value
    Result<ReferenceIdentity, IdentityError>.Failure {..} => {
      return 1
    }
  }

  // An empty snapshot trusts no server. Real programs load CA certificates.
  let trust = match TrustSnapshot.fromAnchors(List<TrustAnchor>.make(), SnapshotLimits.defaults()) {
    Result<TrustSnapshot, TrustSourceError>.Success { value } => move value
    Result<TrustSnapshot, TrustSourceError>.Failure {..} => {
      return 1
    }
  }
  let config = ClientConfig {
    reference: reference,
    alpn: AlpnConfig.defaults(),
    resumption: Resumption.Disabled,
    versions: VersionPolicy.defaults(),
    limits: ClientLimits.defaults()
  }
  let made = run Client.make(&config, move trust, SystemClock.make(1789156800, 0), ClientCredential.None)
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut client = match move made {
    Result<Client, TlsError>.Success { value } => move value
    Result<Client, TlsError>.Failure {..} => {
      return 1
    }
  }

  // The ClientHello is ready. Write it to the transport, then acknowledge the bytes written.
  let length = Client.pendingOutput(&client).length
  if length == 0 {
    return 1
  }
  return match Client.ackWritten(&mut client, length) {
    Result<Progress, TlsError>.Success {..} => 0
    Result<Progress, TlsError>.Failure {..} => 1
  }
}
```

Import as `Client` with `import silk.tls.client { Client }`.

Public declarations: 19.

::Anchor{id="NamedGroup"}

## `NamedGroup`

```silk
pub enum NamedGroup
```

One key-exchange group selected for the authenticated connection.

::Anchor{id="NamedGroup.X25519"}

### `X25519`

```silk
X25519
```

X25519 with a 32-byte encoded public key.

::Anchor{id="NamedGroup.P256"}

### `P256`

```silk
P256
```

The NIST P-256 curve with a 65-byte uncompressed encoded point.

::Anchor{id="NamedGroup.P384"}

### `P384`

```silk
P384
```

The NIST P-384 curve with a 97-byte uncompressed encoded point, in TLS 1.2 only.

::Anchor{id="AlpnProtocol"}

## `AlpnProtocol`

```silk
pub struct AlpnProtocol<'a>
```

One borrowed opaque ALPN protocol offered in caller order.

::Anchor{id="AlpnProtocol.bytes"}

### Field `bytes`

```silk
pub bytes: &'a [u8]
```

The nonempty protocol bytes, without a length prefix.

::Anchor{id="AlpnConfig"}

## `AlpnConfig`

```silk
pub union AlpnConfig<'a>
```

Borrowed ALPN policy copied by [`Client.make`](#Client.impl.make).

::Anchor{id="AlpnConfig.Disabled"}

### `Disabled`

```silk
Disabled
```

Sends no ALPN extension and accepts no server selection.

::Anchor{id="AlpnConfig.Offered"}

### `Offered`

```silk
Offered
```

Sends one ordered, nonempty, duplicate-free protocol list.

::Anchor{id="AlpnConfig.Offered.protocols"}

#### Field `protocols`

```silk
pub protocols: &'a [AlpnProtocol<'a>]
```

The protocols in preference order.

::Anchor{id="AlpnConfig.Offered.required"}

#### Field `required`

```silk
pub required: bool
```

Whether absence of a server selection is a failure.

::Anchor{id="AlpnProtocol.impl.Copy"}

## Implementation `Copy for AlpnProtocol<'a>`

```silk
impl<'a> Copy for AlpnProtocol<'a>
```

::Anchor{id="AlpnConfig.impl.Copy"}

## Implementation `Copy for AlpnConfig<'a>`

```silk
impl<'a> Copy for AlpnConfig<'a>
```

::Anchor{id="AlpnConfig.impl"}

## Implementation `AlpnConfig<'a>`

```silk
impl<'a> AlpnConfig<'a>
```

::Anchor{id="AlpnConfig.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> AlpnConfig<'a>
```

Returns the default policy, which sends no ALPN extension.

::Anchor{id="ClientLimits"}

## `ClientLimits`

```silk
pub struct ClientLimits
```

Inclusive local resource policy for one client connection. The limits bound all memory and work
of the client.

::Anchor{id="ClientLimits.handshakeBodyBytes"}

### Field `handshakeBodyBytes`

```silk
pub handshakeBodyBytes: usize
```

Maximum body bytes in one handshake message.

::Anchor{id="ClientLimits.handshakeBytes"}

### Field `handshakeBytes`

```silk
pub handshakeBytes: usize
```

Maximum total initial-handshake bytes, including four-byte headers.

::Anchor{id="ClientLimits.handshakeMessages"}

### Field `handshakeMessages`

```silk
pub handshakeMessages: usize
```

Maximum initial-handshake message count.

::Anchor{id="ClientLimits.peerCertificates"}

### Field `peerCertificates`

```silk
pub peerCertificates: usize
```

Maximum peer certificate count, including the leaf.

::Anchor{id="ClientLimits.certificateBytes"}

### Field `certificateBytes`

```silk
pub certificateBytes: usize
```

Maximum DER bytes in one peer certificate.

::Anchor{id="ClientLimits.certificateTotalBytes"}

### Field `certificateTotalBytes`

```silk
pub certificateTotalBytes: usize
```

Maximum aggregate peer DER bytes.

::Anchor{id="ClientLimits.cookieBytes"}

### Field `cookieBytes`

```silk
pub cookieBytes: usize
```

Maximum echoed HelloRetryRequest cookie bytes.

::Anchor{id="ClientLimits.extensionBytes"}

### Field `extensionBytes`

```silk
pub extensionBytes: usize
```

Maximum bytes in one extension vector.

::Anchor{id="ClientLimits.emptyRecords"}

### Field `emptyRecords`

```silk
pub emptyRecords: usize
```

Maximum consecutive empty application or compatibility records.

::Anchor{id="ClientLimits.postHandshakeControls"}

### Field `postHandshakeControls`

```silk
pub postHandshakeControls: usize
```

Maximum consecutive post-handshake control messages without positive application content.

::Anchor{id="ClientLimits.tickets"}

### Field `tickets`

```silk
pub tickets: usize
```

Maximum accepted NewSessionTicket messages.

::Anchor{id="ClientLimits.ticketBytes"}

### Field `ticketBytes`

```silk
pub ticketBytes: usize
```

Maximum total encoded NewSessionTicket bytes.

::Anchor{id="ClientLimits.certificateDecode"}

### Field `certificateDecode`

```silk
pub certificateDecode: DecodeLimits
```

Strict certificate decoder policy.

::Anchor{id="ClientLimits.sanDecode"}

### Field `sanDecode`

```silk
pub sanDecode: SanDecodeLimits
```

Strict SAN adapter policy.

::Anchor{id="ClientLimits.identity"}

### Field `identity`

```silk
pub identity: IdentityLimits
```

HTTPS identity policy.

::Anchor{id="ClientLimits.path"}

### Field `path`

```silk
pub path: ValidationLimits
```

Certificate-path policy.

::Anchor{id="ClientLimits.credentialCertificates"}

### Field `credentialCertificates`

```silk
pub credentialCertificates: usize
```

Maximum certificate count in a [`ClientCredential`](#ClientCredential) chain, at most 16.

::Anchor{id="ClientLimits.credentialBytes"}

### Field `credentialBytes`

```silk
pub credentialBytes: usize
```

Maximum aggregate DER bytes in a [`ClientCredential`](#ClientCredential) chain.

::Anchor{id="ClientLimits.impl.Copy"}

## Implementation `Copy for ClientLimits`

```silk
impl Copy for ClientLimits
```

::Anchor{id="ClientLimits.impl"}

## Implementation `ClientLimits`

```silk
impl ClientLimits
```

::Anchor{id="ClientLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ClientLimits
```

Returns the finite TLS client defaults.

::Anchor{id="ClientConfig"}

## `ClientConfig`

```silk
pub struct ClientConfig<'a>
```

Borrowed client configuration that construction copies into owned storage.

::Anchor{id="ClientConfig.reference"}

### Field `reference`

```silk
pub reference: ReferenceIdentity<'a>
```

A reference already admitted by `HttpsIdentity.reference`. Construction revalidates it.

::Anchor{id="ClientConfig.alpn"}

### Field `alpn`

```silk
pub alpn: AlpnConfig<'a>
```

ALPN policy, with opaque protocols in caller preference order.

::Anchor{id="ClientConfig.resumption"}

### Field `resumption`

```silk
pub resumption: Resumption<'a>
```

Whether the client asks for session tickets, and which session it offers.

::Anchor{id="ClientConfig.versions"}

### Field `versions`

```silk
pub versions: VersionPolicy
```

The TLS versions the client offers. `VersionPolicy.defaults()` offers TLS 1.2 and TLS 1.3.

::Anchor{id="ClientConfig.limits"}

### Field `limits`

```silk
pub limits: ClientLimits
```

Finite connection limits and nested certificate policies.

::Anchor{id="Resumption"}

## `Resumption`

```silk
pub union Resumption<'a>
```

Whether a [`Client`](#Client) resumes sessions, in [`ClientConfig.resumption`](#ClientConfig.resumption).

::Anchor{id="Resumption.Disabled"}

### `Disabled`

```silk
Disabled
```

The client does not send `psk_key_exchange_modes`, so servers send no tickets, and it drops
any ticket that a server sends anyway.

::Anchor{id="Resumption.Enabled"}

### `Enabled`

```silk
Enabled
```

The client asks for tickets, which [`Client.takeSession`](#Client.impl.takeSession) returns as sessions.

::Anchor{id="Resumption.Enabled.session"}

#### Field `session`

```silk
pub session: Option<&'a Session>
```

A session to resume, from [`Client.takeSession`](#Client.impl.takeSession) or [`Session.decode`](#Session.impl.decode), or `None` for a
full handshake. [`Client.make`](#Client.impl.make) copies it. The client offers it only before it expires and
only to the server name of the connection it came from. Otherwise it does a full handshake.

::Anchor{id="Resumption.Enabled.earlyData"}

#### Field `earlyData`

```silk
pub earlyData: &'a [u8]
```

Bytes to send as 0-RTT data with `session`, at most 16384, or an empty slice for none.
[`Client.make`](#Client.impl.make) copies them. The client sends them only when it offers the session and the
session's [`Session.maxEarlyData`](#Session.impl.maxEarlyData) is at least their length.

##### Gotchas
An attacker can replay 0-RTT data to the server, so send only requests that are safe to
repeat.

::Anchor{id="EarlyDataStatus"}

## `EarlyDataStatus`

```silk
pub enum EarlyDataStatus
```

What happened to the 0-RTT data of a connection, from [`Client.earlyData`](#Client.impl.earlyData) or `Server.earlyData`.

::Anchor{id="EarlyDataStatus.NotOffered"}

### `NotOffered`

```silk
NotOffered
```

No early data was offered.

::Anchor{id="EarlyDataStatus.Pending"}

### `Pending`

```silk
Pending
```

The client sent early data and waits for the server's answer. A server never reports it.

::Anchor{id="EarlyDataStatus.Accepted"}

### `Accepted`

```silk
Accepted
```

The server accepted the early data.

::Anchor{id="EarlyDataStatus.Rejected"}

### `Rejected`

```silk
Rejected
```

The server rejected the early data, which it did not read.

::Anchor{id="EarlyDataStatus.impl.Debug"}

## Implementation `Debug for EarlyDataStatus`

```silk
impl Debug for EarlyDataStatus
```

::Anchor{id="EarlyDataStatus.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Accepted`.

::Anchor{id="Resumption.impl.Copy"}

## Implementation `Copy for Resumption<'a>`

```silk
impl<'a> Copy for Resumption<'a>
```

::Anchor{id="ClientCredential"}

## `ClientCredential`

```silk
pub union ClientCredential<'a>
```

The certificate that a [`Client`](#Client) sends when the server asks for one, in [`Client.make`](#Client.impl.make).

::Anchor{id="ClientCredential.None"}

### `None`

```silk
None
```

The client answers a CertificateRequest with an empty Certificate message.

::Anchor{id="ClientCredential.Certificate"}

### `Certificate`

```silk
Certificate
```

The client sends `certificates`, leaf first, and signs CertificateVerify with `key`, the
leaf's private key. It signs only with a scheme that the server's CertificateRequest lists;
otherwise it sends an empty Certificate message.

::Anchor{id="ClientCredential.Certificate.certificates"}

#### Field `certificates`

```silk
pub certificates: &'a [CertificateDer<'a>]
```

The chain, leaf first. [`Client.make`](#Client.impl.make) copies it.

::Anchor{id="ClientCredential.Certificate.key"}

#### Field `key`

```silk
pub key: SigningKey
```

The private key of the leaf.

::Anchor{id="Session"}

## `Session`

```silk
pub struct Session
```

A TLS 1.3 session from a server's NewSessionTicket, for resuming with
`ClientConfig.session`.

### Details
[`Client.takeSession`](#Client.impl.takeSession) returns one for each ticket the server sends after the handshake. A
session holds the resumption secret, the ticket, the cipher suite, the server name and ALPN
protocol of its connection, and the leaf certificate that the full handshake authenticated.
[`Session.encode`](#Session.impl.encode) and [`Session.decode`](#Session.impl.decode) save and load it.

### Gotchas
The encoded session holds the resumption secret. Store it as you would a key. A server can
refuse a ticket at any time, and the client then does a full handshake.

::Anchor{id="SessionError"}

## `SessionError`

```silk
pub enum SessionError
```

Why [`Session.encode`](#Session.impl.encode) or [`Session.decode`](#Session.impl.decode) fails.

::Anchor{id="SessionError.InvalidEncoding"}

### `InvalidEncoding`

```silk
InvalidEncoding
```

The bytes are not a session that [`Session.encode`](#Session.impl.encode) wrote.

::Anchor{id="SessionError.OutputTooShort"}

### `OutputTooShort`

```silk
OutputTooShort
```

The output is shorter than [`Session.encodedLength`](#Session.impl.encodedLength).

::Anchor{id="SessionError.impl.Debug"}

## Implementation `Debug for SessionError`

```silk
impl Debug for SessionError
```

::Anchor{id="SessionError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidEncoding`.

::Anchor{id="Session.impl"}

## Implementation `Session`

```silk
impl Session
```

::Anchor{id="Session.impl.suite"}

### Method `suite`

```silk
pub fn suite(self: &Self) -> CipherSuite
```

Returns the cipher suite of the connection that issued the session.

::Anchor{id="Session.impl.ticket"}

### Method `ticket`

```silk
pub fn ticket<'a>(self: &'a Self) -> &'a [u8]
```

Borrows the opaque ticket that the server issued.

::Anchor{id="Session.impl.lifetime"}

### Method `lifetime`

```silk
pub fn lifetime(self: &Self) -> usize
```

Returns the ticket lifetime that the server gave, in seconds.

::Anchor{id="Session.impl.issuedAt"}

### Method `issuedAt`

```silk
pub fn issuedAt(self: &Self) -> Instant
```

Returns the time the client received the ticket, from the client's validation time.

::Anchor{id="Session.impl.isExpired"}

### Method `isExpired`

```silk
pub fn isExpired(self: &Self, at: &Instant) -> bool
```

Returns whether the lifetime has passed at `at`.

::Anchor{id="Session.impl.maxEarlyData"}

### Method `maxEarlyData`

```silk
pub fn maxEarlyData(self: &Self) -> usize
```

Returns the most early data in bytes that the server accepts with this session, or 0.

::Anchor{id="Session.impl.alpn"}

### Method `alpn`

```silk
pub fn alpn<'a>(self: &'a Self) -> Option<&'a [u8]>
```

Borrows the ALPN protocol of the connection that issued the session, if it had one.

::Anchor{id="Session.impl.leafDer"}

### Method `leafDer`

```silk
pub fn leafDer<'a>(self: &'a Self) -> &'a [u8]
```

Borrows the DER of the leaf certificate that the full handshake authenticated.

::Anchor{id="Session.impl.encodedLength"}

### Method `encodedLength`

```silk
pub fn encodedLength(self: &Self) -> usize
```

Returns the length of [`Session.encode`](#Session.impl.encode)'s output.

::Anchor{id="Session.impl.encode"}

### Method `encode`

```silk
pub fn encode(self: &Self, output: &mut [u8]) -> Result<usize, SessionError>
```

Writes the session to the start of `output`, and returns the number of bytes written.

#### Errors
- `OutputTooShort` if `output` is shorter than [`Session.encodedLength`](#Session.impl.encodedLength).

::Anchor{id="Session.impl.decode"}

### Associated function `decode`

```silk
pub effect fn decode(bytes: &[u8]) -> Result<Session, SessionError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Reads a session that [`Session.encode`](#Session.impl.encode) wrote.

#### Errors
- `InvalidEncoding` if `bytes` is not exactly one encoded session.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Demand"}

## `Demand`

```silk
pub enum Demand
```

The next action or observable connection event of a [`Client`](#Client), in [`Progress.demand`](#Progress.demand).

::Anchor{id="Demand.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

Supply peer transport bytes.

::Anchor{id="Demand.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

Write and acknowledge the complete pending output suffix before other work.

::Anchor{id="Demand.PlaintextReady"}

### `PlaintextReady`

```silk
PlaintextReady
```

Read authenticated buffered application plaintext.

::Anchor{id="Demand.Authenticated"}

### `Authenticated`

```silk
Authenticated
```

Observe the one-shot authentication transition and its metadata.

::Anchor{id="Demand.PeerClosed"}

### `PeerClosed`

```silk
PeerClosed
```

The peer receive direction closed cleanly.

::Anchor{id="Demand.Closed"}

### `Closed`

```silk
Closed
```

Both directions closed cleanly and no output remains.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

Exact progress from one [`Client`](#Client) operation: how many bytes it took or wrote, and the next
[`Demand`](#Demand).

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The accepted prefix of caller input or application plaintext.

::Anchor{id="Progress.written"}

### Field `written`

```silk
pub written: usize
```

The bytes copied into a caller plaintext destination.

::Anchor{id="Progress.demand"}

### Field `demand`

```silk
pub demand: Demand
```

The next action or event under the fixed precedence rule.

::Anchor{id="ClientOperation"}

## `ClientOperation`

```silk
pub enum ClientOperation
```

A public operation rejected because of caller state.

::Anchor{id="ClientOperation.FeedInput"}

### `FeedInput`

```silk
FeedInput
```

Transport input feed.

::Anchor{id="ClientOperation.Progress"}

### `Progress`

```silk
Progress
```

State-machine progress without new bytes.

::Anchor{id="ClientOperation.AckWritten"}

### `AckWritten`

```silk
AckWritten
```

Pending-output acknowledgment.

::Anchor{id="ClientOperation.ReadPlaintext"}

### `ReadPlaintext`

```silk
ReadPlaintext
```

Application plaintext read.

::Anchor{id="ClientOperation.WritePlaintext"}

### `WritePlaintext`

```silk
WritePlaintext
```

Application plaintext write.

::Anchor{id="ClientOperation.RequestKeyUpdate"}

### `RequestKeyUpdate`

```silk
RequestKeyUpdate
```

Local traffic-key update request.

::Anchor{id="ClientOperation.CloseWrite"}

### `CloseWrite`

```silk
CloseWrite
```

Local write-direction close.

::Anchor{id="ClientOperation.EndInput"}

### `EndInput`

```silk
EndInput
```

Transport input end.

::Anchor{id="ClientOperation.impl.Debug"}

## Implementation `Debug for ClientOperation`

```silk
impl Debug for ClientOperation
```

::Anchor{id="ClientOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `FeedInput`.

::Anchor{id="ProtocolReason"}

## `ProtocolReason`

```silk
pub enum ProtocolReason
```

A protocol grammar or state-machine rule rejected from the peer.

::Anchor{id="ProtocolReason.Record"}

### `Record`

```silk
Record
```

A record has an invalid content type, version, length, padding, or inner framing.

::Anchor{id="ProtocolReason.UnexpectedMessage"}

### `UnexpectedMessage`

```silk
UnexpectedMessage
```

A handshake message arrived in an invalid order.

::Anchor{id="ProtocolReason.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A handshake message or vector is truncated or has trailing bytes.

::Anchor{id="ProtocolReason.Extension"}

### `Extension`

```silk
Extension
```

An extension is duplicated, unsolicited, misplaced, or malformed.

::Anchor{id="ProtocolReason.ServerHello"}

### `ServerHello`

```silk
ServerHello
```

ServerHello does not select an offered version and profile, or a TLS 1.2 ServerHello carries
the downgrade mark while TLS 1.3 is allowed.

::Anchor{id="ProtocolReason.HelloRetryRequest"}

### `HelloRetryRequest`

```silk
HelloRetryRequest
```

HelloRetryRequest violates its single-retry and changed-ClientHello rules.

::Anchor{id="ProtocolReason.CompatibilityCcs"}

### `CompatibilityCcs`

```silk
CompatibilityCcs
```

Compatibility CCS is outside its window or not exactly `{1}`.

::Anchor{id="ProtocolReason.CertificateRequest"}

### `CertificateRequest`

```silk
CertificateRequest
```

A CertificateRequest has invalid framing, duplication, or a profile-forbidden extension.

::Anchor{id="ProtocolReason.Certificate"}

### `Certificate`

```silk
Certificate
```

A peer Certificate message violates its TLS envelope.

::Anchor{id="ProtocolReason.PostHandshake"}

### `PostHandshake`

```silk
PostHandshake
```

A NewSessionTicket or KeyUpdate message violates its TLS envelope.

::Anchor{id="ProtocolReason.InternalState"}

### `InternalState`

```silk
InternalState
```

The client reached an impossible private transition.

::Anchor{id="ProtocolReason.impl.Debug"}

## Implementation `Debug for ProtocolReason`

```silk
impl Debug for ProtocolReason
```

::Anchor{id="ProtocolReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Record`.

::Anchor{id="TlsLimitKind"}

## `TlsLimitKind`

```silk
pub enum TlsLimitKind
```

A named finite resource exhausted by peer input or configuration.

::Anchor{id="TlsLimitKind.HandshakeBodyBytes"}

### `HandshakeBodyBytes`

```silk
HandshakeBodyBytes
```

One handshake body.

::Anchor{id="TlsLimitKind.HandshakeBytes"}

### `HandshakeBytes`

```silk
HandshakeBytes
```

Aggregate initial-handshake headers and bodies.

::Anchor{id="TlsLimitKind.HandshakeMessages"}

### `HandshakeMessages`

```silk
HandshakeMessages
```

Initial-handshake message count.

::Anchor{id="TlsLimitKind.PeerCertificates"}

### `PeerCertificates`

```silk
PeerCertificates
```

Peer certificate count.

::Anchor{id="TlsLimitKind.CertificateBytes"}

### `CertificateBytes`

```silk
CertificateBytes
```

DER bytes in one peer certificate.

::Anchor{id="TlsLimitKind.CertificateTotalBytes"}

### `CertificateTotalBytes`

```silk
CertificateTotalBytes
```

Aggregate peer certificate DER bytes.

::Anchor{id="TlsLimitKind.CookieBytes"}

### `CookieBytes`

```silk
CookieBytes
```

HelloRetryRequest cookie bytes.

::Anchor{id="TlsLimitKind.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

One extension vector.

::Anchor{id="TlsLimitKind.EmptyRecords"}

### `EmptyRecords`

```silk
EmptyRecords
```

Consecutive empty application or compatibility records.

::Anchor{id="TlsLimitKind.PostHandshakeControls"}

### `PostHandshakeControls`

```silk
PostHandshakeControls
```

Consecutive post-handshake control messages.

::Anchor{id="TlsLimitKind.Tickets"}

### `Tickets`

```silk
Tickets
```

NewSessionTicket count.

::Anchor{id="TlsLimitKind.TicketBytes"}

### `TicketBytes`

```silk
TicketBytes
```

Aggregate encoded NewSessionTicket bytes.

::Anchor{id="TlsLimitKind.Arithmetic"}

### `Arithmetic`

```silk
Arithmetic
```

Checked size arithmetic.

::Anchor{id="TlsLimitKind.Alpn"}

### `Alpn`

```silk
Alpn
```

One ALPN protocol or list.

::Anchor{id="TlsLimitKind.CertificateDecode"}

### `CertificateDecode`

```silk
CertificateDecode
```

The configured certificate-decoder policy.

::Anchor{id="TlsLimitKind.CertificateSanDecode"}

### `CertificateSanDecode`

```silk
CertificateSanDecode
```

The configured certificate-SAN decoder policy.

::Anchor{id="TlsLimitKind.CertificateIdentity"}

### `CertificateIdentity`

```silk
CertificateIdentity
```

The configured HTTPS identity policy.

::Anchor{id="TlsLimitKind.CertificatePath"}

### `CertificatePath`

```silk
CertificatePath
```

The configured certificate-path search policy.

::Anchor{id="TlsLimitKind.CertificateProfile"}

### `CertificateProfile`

```silk
CertificateProfile
```

The configured semantic certificate-profile policy.

::Anchor{id="TlsLimitKind.CredentialCertificates"}

### `CredentialCertificates`

```silk
CredentialCertificates
```

Certificate count in the client's credential chain.

::Anchor{id="TlsLimitKind.CredentialBytes"}

### `CredentialBytes`

```silk
CredentialBytes
```

DER bytes in the client's credential chain.

::Anchor{id="TlsLimitKind.EarlyDataBytes"}

### `EarlyDataBytes`

```silk
EarlyDataBytes
```

The `Resumption` `earlyData` bytes.

::Anchor{id="TlsLimitKind.impl.Debug"}

## Implementation `Debug for TlsLimitKind`

```silk
impl Debug for TlsLimitKind
```

::Anchor{id="TlsLimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `HandshakeBodyBytes`.

::Anchor{id="CertificateIdentityFailure"}

## `CertificateIdentityFailure`

```silk
pub union CertificateIdentityFailure
```

A certificate identity failure that preserves its originating actor.

::Anchor{id="CertificateIdentityFailure.Decode"}

### `Decode`

```silk
Decode
```

The certificate SAN adapter rejected structure or a resource bound.

::Anchor{id="CertificateIdentityFailure.Decode.error"}

#### Field `error`

```silk
pub error: SanDecodeError
```

The complete SAN adapter failure.

::Anchor{id="CertificateIdentityFailure.Match"}

### `Match`

```silk
Match
```

The HTTPS reference matcher rejected the complete decoded identity set.

::Anchor{id="CertificateIdentityFailure.Match.error"}

#### Field `error`

```silk
pub error: IdentityError
```

The complete HTTPS identity failure.

::Anchor{id="CertificateIdentityFailure.impl.Debug"}

## Implementation `Debug for CertificateIdentityFailure`

```silk
impl Debug for CertificateIdentityFailure
```

::Anchor{id="CertificateIdentityFailure.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `Decode { ... }`.

::Anchor{id="TlsError"}

## `TlsError`

```silk
pub union TlsError
```

A typed TLS client failure: an alert from the server, a protocol error, a certificate that
fails, a limit, or a call in the wrong state. An error is permanent for the client.

::Anchor{id="TlsError.PeerAlert"}

### `PeerAlert`

```silk
PeerAlert
```

The peer sent a fatal alert with this wire description.

::Anchor{id="TlsError.PeerAlert.code"}

#### Field `code`

```silk
pub code: u8
```

The alert description byte.

::Anchor{id="TlsError.BadRecordMac"}

### `BadRecordMac`

```silk
BadRecordMac
```

Protected record authentication failed.

::Anchor{id="TlsError.ProtocolViolation"}

### `ProtocolViolation`

```silk
ProtocolViolation
```

Peer syntax, ordering, or negotiation violated the selected TLS profile.

::Anchor{id="TlsError.ProtocolViolation.reason"}

#### Field `reason`

```silk
pub reason: ProtocolReason
```

The rejected rule.

::Anchor{id="TlsError.CertificateDecode"}

### `CertificateDecode`

```silk
CertificateDecode
```

A peer certificate did not decode.

::Anchor{id="TlsError.CertificateDecode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The complete strict decoder failure.

::Anchor{id="TlsError.CertificatePath"}

### `CertificatePath`

```silk
CertificatePath
```

Certificate-path construction or validation failed.

::Anchor{id="TlsError.CertificatePath.error"}

#### Field `error`

```silk
pub error: ValidationError
```

The complete bounded path failure.

::Anchor{id="TlsError.CertificateIdentity"}

### `CertificateIdentity`

```silk
CertificateIdentity
```

SAN decoding or HTTPS reference matching failed.

::Anchor{id="TlsError.CertificateIdentity.error"}

#### Field `error`

```silk
pub error: CertificateIdentityFailure
```

The exact nested identity failure.

::Anchor{id="TlsError.CertificateVerify"}

### `CertificateVerify`

```silk
CertificateVerify
```

Server CertificateVerify did not authenticate the transcript with the selected leaf key.

::Anchor{id="TlsError.CertificateVerify.error"}

#### Field `error`

```silk
pub error: SignatureFailure
```

The exact selected primitive failure.

::Anchor{id="TlsError.Finished"}

### `Finished`

```silk
Finished
```

Server Finished did not authenticate the transcript.

::Anchor{id="TlsError.UnsupportedProfile"}

### `UnsupportedProfile`

```silk
UnsupportedProfile
```

A server-selected suite, group, signature, or extension shape is outside the selected profile.

::Anchor{id="TlsError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A finite resource budget was exceeded.

::Anchor{id="TlsError.LimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: TlsLimitKind
```

The exhausted resource category.

::Anchor{id="TlsError.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The inclusive configured limit.

::Anchor{id="TlsError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

A caller operation is invalid in the current state.

::Anchor{id="TlsError.InvalidState.operation"}

#### Field `operation`

```silk
pub operation: ClientOperation
```

The rejected operation.

::Anchor{id="TlsError.EmptyBuffer"}

### `EmptyBuffer`

```silk
EmptyBuffer
```

A caller supplied an empty plaintext output buffer.

::Anchor{id="TlsError.HandshakeTruncated"}

### `HandshakeTruncated`

```silk
HandshakeTruncated
```

Transport input ended before authentication and peer closure.

::Anchor{id="TlsError.Truncated"}

### `Truncated`

```silk
Truncated
```

Transport input ended after authentication without peer `close_notify`.

::Anchor{id="TlsError.NoApplicationProtocol"}

### `NoApplicationProtocol`

```silk
NoApplicationProtocol
```

The server omits a required ALPN selection or selects a protocol that was not offered.

::Anchor{id="TlsError.EmptyCredential"}

### `EmptyCredential`

```silk
EmptyCredential
```

The [`ClientCredential`](#ClientCredential) has no certificates.

::Anchor{id="TlsError.CredentialDecode"}

### `CredentialDecode`

```silk
CredentialDecode
```

The [`ClientCredential`](#ClientCredential) leaf certificate did not decode.

::Anchor{id="TlsError.CredentialDecode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The decoder failure.

::Anchor{id="TlsError.CredentialKeyMismatch"}

### `CredentialKeyMismatch`

```silk
CredentialKeyMismatch
```

The [`ClientCredential`](#ClientCredential) key is not the key of its leaf certificate.

::Anchor{id="TlsError.Signing"}

### `Signing`

```silk
Signing
```

The credential key could not sign CertificateVerify.

::Anchor{id="TlsError.Signing.error"}

#### Field `error`

```silk
pub error: SigningError
```

The signing failure.

::Anchor{id="TlsError.impl.Debug"}

## Implementation `Debug for TlsError`

```silk
impl Debug for TlsError
```

::Anchor{id="TlsError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `PeerAlert { ... }`.

::Anchor{id="Authentication"}

## `Authentication`

```silk
pub struct Authentication<'a>
```

Authenticated result metadata borrowed from one client owner.

::Anchor{id="Authentication.impl"}

## Implementation `Authentication<'a>`

```silk
impl<'a> Authentication<'a>
```

::Anchor{id="Authentication.impl.suite"}

### Method `suite`

```silk
pub fn suite(self: &Self) -> CipherSuite
```

Returns the negotiated cipher suite.

::Anchor{id="Authentication.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> TlsVersion
```

Returns the negotiated TLS version.

::Anchor{id="Authentication.impl.group"}

### Method `group`

```silk
pub fn group(self: &Self) -> NamedGroup
```

Returns the negotiated ephemeral key-exchange group.

::Anchor{id="Authentication.impl.selectedAlpn"}

### Method `selectedAlpn`

```silk
pub fn selectedAlpn(self: &Self) -> Option<&'a [u8]>
```

Returns the selected offered ALPN protocol, or `None` when ALPN was disabled or optional.

::Anchor{id="Authentication.impl.leafDer"}

### Method `leafDer`

```silk
pub fn leafDer(self: &Self) -> &'a [u8]
```

Borrows the exact DER of the leaf used for path, identity, and signature authentication.

::Anchor{id="Authentication.impl.intermediateIndices"}

### Method `intermediateIndices`

```silk
pub fn intermediateIndices(self: &Self) -> &'a [usize]
```

Borrows selected intermediate indices in leaf-to-anchor order.

::Anchor{id="Authentication.impl.anchorIndex"}

### Method `anchorIndex`

```silk
pub fn anchorIndex(self: &Self) -> usize
```

Returns the selected explicit trust-anchor index.

::Anchor{id="Authentication.impl.validationTime"}

### Method `validationTime`

```silk
pub fn validationTime(self: &Self) -> Instant
```

Returns the exact caller-supplied validation instant, including nanoseconds.

::Anchor{id="Authentication.impl.revocationStatus"}

### Method `revocationStatus`

```silk
pub fn revocationStatus(self: &Self) -> RevocationStatus
```

Returns the revocation evidence produced by certificate-path validation.

::Anchor{id="Authentication.impl.sanIndex"}

### Method `sanIndex`

```silk
pub fn sanIndex(self: &Self) -> usize
```

Returns the matching SAN's original certificate index.

::Anchor{id="Authentication.impl.resumed"}

### Method `resumed`

```silk
pub fn resumed(self: &Self) -> bool
```

Returns whether the handshake resumed a [`Session`](#Session). Then the server sent no certificate, and
the leaf, anchor index, and SAN index are those of the full handshake that issued the session.
The intermediate indices are empty.

::Anchor{id="Client"}

## `Client`

```silk
pub struct Client
```

A TLS 1.2 and TLS 1.3 client state machine that does no I/O.

### When to use
Most programs use `silk.tls.connection`, which drives this client over a `ByteDuplex`. Use it
directly when you need full control of the transport, for example in an event loop. Make it
with [`Client.make`](#Client.impl.make), then move bytes between it and the transport until it reports
`Authenticated`, and then read and write application data.

### Details
Each operation returns a [`Progress`](#Progress) with a [`Demand`](#Demand) that tells you what to do next. Output
works in two steps: write [`Client.pendingOutput`](#Client.impl.pendingOutput) to the transport, and then call
[`Client.ackWritten`](#Client.impl.ackWritten) with the number of bytes written. The client does not keep your buffers.
[`ClientLimits`](#ClientLimits) bound all memory and work.

It supports TLS 1.3 with the cipher suites ChaCha20-Poly1305, AES-128-GCM, and AES-256-GCM, and
the key exchange groups X25519 and P-256. It supports TLS 1.2 with the ECDHE versions of those
ciphers and the groups X25519, P-256, and P-384. Server keys can be ECDSA P-256, ECDSA P-384,
or RSA (PSS, and in TLS 1.2 also PKCS #1 v1.5). It checks the certificate chain against your `TrustSnapshot`, the
host name of your `ReferenceIdentity`, the CertificateVerify signature, and the Finished
message. It gives no application data before all checks pass.

### Gotchas
A [`TlsError`](#TlsError) is permanent for the client. Dropping the client does not send `close_notify`.
Call [`Client.closeWrite`](#Client.impl.closeWrite) first. Secrets are not erased.

::Anchor{id="Client.impl"}

## Implementation `Client`

```silk
impl Client
```

::Anchor{id="Client.impl.make"}

### Associated function `make`

```silk
pub effect fn make<'a>(
    config: &ClientConfig<'a>,
    trust: TrustSnapshot,
    validationTime: Instant,
    credential: ClientCredential<'a>,
  ) -> Result<Client, TlsError>
  ! OutOfMemoryError
  ? &mut Allocator | &mut Random
```

Returns a new client for `config` and `trust`, with the ClientHello already queued as pending
output.

`validationTime` is the time used to check certificate dates. `credential` is what the client
sends when the server asks for a certificate. The client copies `config` and the credential's
chain, and consumes `trust` and the credential's key. A DNS name is sent as SNI in lowercase.
An IP address sends no SNI.

#### Errors
- `Failure` with a `TlsError` if `config` is not valid, or if the credential has no
  certificates (`EmptyCredential`), a leaf that does not decode (`CredentialDecode`), a key
  that is not the leaf's (`CredentialKeyMismatch`), or a chain over the credential limits.
- `OutOfMemoryError` if the `Allocator` fails.

#### Gotchas
Give a correct current time and a secure `Random` provider. If `Random` fails, the program
stops.

::Anchor{id="Client.impl.pendingOutput"}

### Method `pendingOutput`

```silk
pub fn pendingOutput<'a>(self: &'a Self) -> &'a [u8]
```

Returns the TLS output to send to the server. After you send some of it, call
[`Client.ackWritten`](#Client.impl.ackWritten).

::Anchor{id="Client.impl.closeNotified"}

### Method `closeNotified`

```silk
pub fn closeNotified(self: &Self) -> bool
```

Returns whether the server sent `close_notify`. Plaintext that came before it can still be
read.

::Anchor{id="Client.impl.authentication"}

### Method `authentication`

```silk
pub fn authentication<'a>(self: &'a Self) -> Option<Authentication<'a>>
```

Returns the result of authentication, after the `Authenticated` action. Before that, returns
`None`.

::Anchor{id="Client.impl.earlyData"}

### Method `earlyData`

```silk
pub fn earlyData(self: &Self) -> EarlyDataStatus
```

Returns what happened to the `Resumption` `earlyData` bytes. It is `Pending` from
[`Client.make`](#Client.impl.make) until the server's EncryptedExtensions, and final by `Authenticated`.

::Anchor{id="Client.impl.takeSession"}

### Method `takeSession`

```silk
pub fn takeSession(self: &mut Self) -> Option<Session>
```

Removes and returns the oldest [`Session`](#Session) from the server's NewSessionTicket messages, or
`None` when no new one has arrived.

The client keeps at most `limits.tickets` sessions over the connection. A ticket with a zero
lifetime gives no session.

::Anchor{id="Client.impl.feedInput"}

### Method `feedInput`

```silk
pub effect fn feedInput(
    self: &mut Self,
    input: &[u8],
  ) -> Result<Progress, TlsError>
  ! OutOfMemoryError
  ? &mut Allocator | &mut Random
```

Gives bytes from the server to the client. `consumed` in the result tells how many it
accepted.

#### Details
The client does not keep `input`. Give the bytes that it did not accept again in the next
call. The client processes all complete handshake messages before it asks for more input.
After the server sends `close_notify`, the client accepts and ignores all later bytes.

::Anchor{id="Client.impl.progress"}

### Method `progress`

```silk
pub effect fn progress(self: &mut Self) -> Result<Progress, TlsError>
  ! OutOfMemoryError
  ? &mut Allocator | &mut Random
```

Processes buffered handshake messages without new input, and returns the next action.

::Anchor{id="Client.impl.ackWritten"}

### Method `ackWritten`

```silk
pub fn ackWritten(self: &mut Self, count: usize) -> Result<Progress, TlsError>
```

Tells the client that the transport sent the first `count` bytes of [`Client.pendingOutput`](#Client.impl.pendingOutput).

::Anchor{id="Client.impl.readPlaintext"}

### Method `readPlaintext`

```silk
pub fn readPlaintext(
    self: &mut Self,
    output: &mut [u8],
  ) -> Result<Progress, TlsError>
```

Copies decrypted application data into `output`. `produced` in the result tells how many
bytes.

#### Gotchas
An empty `output` returns the `EmptyBuffer` error. It never means the end of input.

::Anchor{id="Client.impl.writePlaintext"}

### Method `writePlaintext`

```silk
pub fn writePlaintext(self: &mut Self, input: &[u8]) -> Result<Progress, TlsError>
```

Encrypts a prefix of `input`, at most 16384 bytes. `consumed` in the result tells how many
bytes.

#### Details
When TLS output is waiting, the client accepts no bytes. Send that output first. Do not give
accepted bytes again, even if the transport sent only part of the record.

::Anchor{id="Client.impl.requestKeyUpdate"}

### Method `requestKeyUpdate`

```silk
pub fn requestKeyUpdate(self: &mut Self) -> Result<Progress, TlsError>
```

Asks for a new local traffic key before the next application write. More calls before that
write do nothing.

::Anchor{id="Client.impl.closeWrite"}

### Method `closeWrite`

```silk
pub fn closeWrite(self: &mut Self) -> Result<Progress, TlsError>
```

Queues `close_notify` after the accepted output. More calls do nothing.

::Anchor{id="Client.impl.endInput"}

### Method `endInput`

```silk
pub fn endInput(self: &mut Self) -> Result<Progress, TlsError>
```

Tells the client that the transport has no more input. Pending output stays pending.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
