A TLS 1.2 and TLS 1.3 server state machine that does the handshake and protects application data over a
byte transport that you drive.

## When to use
Use [`Server`](#Server) to accept TLS connections, for example in an HTTPS server or a runtime's
`node:tls`. Make one server for each accepted connection with [`Server.make`](#Server.impl.make), then move bytes
between it and the transport until it reports `HandshakeComplete`, and then read and write
application data.

## Details
The server accepts the versions that `ServerConfig.versions` allows, and prefers TLS 1.3. In
TLS 1.3 it selects the first cipher suite in the client's order among
ChaCha20-Poly1305, AES-128-GCM, and AES-256-GCM. It selects the key exchange group from
X25519, P-256, and P-384 in that order, limited by your [`GroupPolicy`](#GroupPolicy). If the client sent no
key share for an allowed group that it supports, the server sends one HelloRetryRequest. The
server signs CertificateVerify with the leaf's ECDSA P-256, ECDSA P-384, Ed25519, or RSA key
([`SigningKey`](/docs/std/tls-signature#SigningKey)), using a scheme that the client offers, and checks the client's Finished
message. An RSA key signs with RSA-PSS, preferring SHA-256, then SHA-384, then SHA-512.

The server reads the client's SNI name, which you get from [`Server.serverName`](#Server.impl.serverName), and selects an
ALPN protocol from your [`AlpnConfig`](/docs/std/tls-client#AlpnConfig) in your preference order. It handles KeyUpdate in both
directions, `close_notify`, and the compatibility `change_cipher_spec` records.

In TLS 1.2 (RFC 5246), the server selects the first ECDHE suite in the client's order that its
key can sign for: ECDSA keys take the ECDSA suites and RSA keys take the RSA suites, each with
ChaCha20-Poly1305, AES-128-GCM, or AES-256-GCM. An Ed25519 key serves no TLS 1.2 suite. The
server requires the extended master secret (RFC 7627), and an ECDSA certificate's curve must be
in the client's groups. When TLS 1.3 is also allowed, it puts the RFC 8446 downgrade mark in a
TLS 1.2 ServerHello.

Each call returns a [`ServerProgress`](#ServerProgress): how many bytes it took or wrote, and the next
[`ServerDemand`](#ServerDemand). Output works in two steps: write [`Server.pendingOutput`](#Server.impl.pendingOutput) to the transport,
and then call [`Server.ackWritten`](#Server.impl.ackWritten) with the number of bytes written. During the handshake, the
server takes no input while output is pending. [`ServerLimits`](#ServerLimits) bound all memory and work.

## Errors
- [`ServerError`](#ServerError) for a configuration that is not valid, an alert from the client, a protocol
  error, no shared parameters, a client certificate that [`ClientAuth`](#ClientAuth) rejects, a limit, or a
  call in the wrong state. An error from a call after
  [`Server.make`](#Server.impl.make) is permanent for the server.
- `OutOfMemoryError` if the `Allocator` fails.

With [`ClientAuth`](#ClientAuth) `Request`, the server sends a CertificateRequest, checks the client's
CertificateVerify with its leaf's key, and validates the client's chain against your trust
anchors for the `ClientAuth` purpose. In TLS 1.2 the request lists no certificate authorities,
and the client may sign with ECDSA or RSA under SHA-256 or SHA-384. [`Server.clientCertificateStatus`](#Server.impl.clientCertificateStatus) and
[`Server.clientCertificates`](#Server.impl.clientCertificates) tell you the result.

With [`TicketPolicy`](#TicketPolicy) `Issue`, the server sends NewSessionTicket messages after the client's
Finished, when the client offered `psk_dhe_ke`. Each ticket holds the session state sealed with
AES-256-GCM under your [`TicketKey`](#TicketKey), so the server keeps no session cache. A ClientHello that
offers a valid ticket resumes: the server checks the binder, sends no certificate messages, and
[`Server.resumed`](#Server.impl.resumed) returns `true`. A ticket from a handshake whose client certificate the
current [`ClientAuth`](#ClientAuth) would refuse gives a full handshake instead.

When the `TicketPolicy` `maxEarlyData` is not 0, the tickets allow 0-RTT data. The server
accepts a resuming client's early data when the ticket allows it, there was no
HelloRetryRequest, the cipher suite and ALPN protocol are the ones of the session, and the
client's ticket age is within 10 seconds of the server's. It then reports `PlaintextReady`
before `HandshakeComplete`, and [`Server.earlyData`](#Server.impl.earlyData) returns `Accepted`. Otherwise it skips
the early data, up to [`ServerLimits`](#ServerLimits) `rejectedEarlyDataBytes`.

The server keeps no state across connections, so it cannot detect a replayed ClientHello. An
attacker can deliver the same early data many times. Accept 0-RTT data only for requests that
are safe to repeat.

## Gotchas
The server resumes only sessions from its own tickets, and only with (EC)DHE. The ticket checks
use the [`TicketPolicy`](#TicketPolicy) `now`, so make a server with the current time. It does not ask for `ed25519` client signatures, because the
certificate profile admits no Ed25519 client keys. The server sends no alert when it fails, so
close the transport. Dropping the server does not send `close_notify`.
Call [`Server.closeWrite`](#Server.impl.closeWrite) first. Secrets are not erased.

## Examples
### Reject a configuration without certificates
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.system.random { Random }
import silk.core.result { Result }
import silk.crypto.p256 { P256 }
import silk.tls.client { AlpnConfig }
import silk.tls.certificate { CertificateDer }
import silk.tls.signature { SigningKey }
import silk.tls.record { VersionPolicy }
import silk.tls.server {
  ClientAuth,
  GroupPolicy,
  Server,
  ServerConfig,
  ServerError,
  ServerLimits,
  TicketPolicy,
}
import silk.collections.slice { Slice }
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
  let key = run P256.generate() |> Effect.provideMut<Random>(&mut random)
  let chain: [CertificateDer<'static>; 0] = []
  let config = ServerConfig<'static> {
    certificates: Slice.view<CertificateDer<'static>>(&chain, 0, 0),
    alpn: AlpnConfig.defaults(),
    groups: GroupPolicy.defaults(),
    clientAuth: ClientAuth<'static>.Off,
    tickets: TicketPolicy<'static>.Off,
    versions: VersionPolicy.defaults(),
    limits: ServerLimits.defaults(),
  }
  let made = run Server.make(&config, SigningKey.EcdsaP256 { key: move key })
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move made {
    Result<Server, ServerError>.Success {..} => 1
    Result<Server, ServerError>.Failure { error: ServerError.EmptyCertificateChain } => 0
    Result<Server, ServerError>.Failure {..} => 1
  }
}
```

Import as `Server` with `import silk.tls.server { Server }`.

Public declarations: 16.

::Anchor{id="ServerGroup"}

## `ServerGroup`

```silk
pub enum ServerGroup
```

A key exchange group that the server can select.

::Anchor{id="ServerGroup.X25519"}

### `X25519`

```silk
X25519
```

X25519 with a 32-byte public key.

::Anchor{id="ServerGroup.P256"}

### `P256`

```silk
P256
```

The NIST P-256 curve with a 65-byte uncompressed point.

::Anchor{id="ServerGroup.P384"}

### `P384`

```silk
P384
```

The NIST P-384 curve with a 97-byte uncompressed point.

::Anchor{id="ServerGroup.impl.Debug"}

## Implementation `Debug for ServerGroup`

```silk
impl Debug for ServerGroup
```

::Anchor{id="ServerGroup.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `X25519`.

::Anchor{id="GroupPolicy"}

## `GroupPolicy`

```silk
pub struct GroupPolicy
```

The key exchange groups that the server allows. It prefers X25519, then P-256, then P-384.

::Anchor{id="GroupPolicy.x25519"}

### Field `x25519`

```silk
pub x25519: bool
```

Allows X25519.

::Anchor{id="GroupPolicy.p256"}

### Field `p256`

```silk
pub p256: bool
```

Allows P-256.

::Anchor{id="GroupPolicy.p384"}

### Field `p384`

```silk
pub p384: bool
```

Allows P-384.

::Anchor{id="GroupPolicy.impl.Copy"}

## Implementation `Copy for GroupPolicy`

```silk
impl Copy for GroupPolicy
```

::Anchor{id="GroupPolicy.impl"}

## Implementation `GroupPolicy`

```silk
impl GroupPolicy
```

::Anchor{id="GroupPolicy.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> GroupPolicy
```

Returns the policy that allows all three groups.

::Anchor{id="ServerLimits"}

## `ServerLimits`

```silk
pub struct ServerLimits
```

Inclusive local resource policy for one server connection. The limits bound all memory and work
of the server.

::Anchor{id="ServerLimits.handshakeBodyBytes"}

### Field `handshakeBodyBytes`

```silk
pub handshakeBodyBytes: usize
```

Maximum body bytes in one handshake message from the client, from 64 to 16777215.

::Anchor{id="ServerLimits.handshakeBytes"}

### Field `handshakeBytes`

```silk
pub handshakeBytes: usize
```

Maximum total handshake bytes from the client, including four-byte headers.

::Anchor{id="ServerLimits.handshakeMessages"}

### Field `handshakeMessages`

```silk
pub handshakeMessages: usize
```

Maximum handshake message count from the client.

::Anchor{id="ServerLimits.extensionBytes"}

### Field `extensionBytes`

```silk
pub extensionBytes: usize
```

Maximum bytes in one extension vector.

::Anchor{id="ServerLimits.emptyRecords"}

### Field `emptyRecords`

```silk
pub emptyRecords: usize
```

Maximum consecutive empty application or compatibility records.

::Anchor{id="ServerLimits.postHandshakeControls"}

### Field `postHandshakeControls`

```silk
pub postHandshakeControls: usize
```

Maximum consecutive post-handshake control messages without positive application content.

::Anchor{id="ServerLimits.certificates"}

### Field `certificates`

```silk
pub certificates: usize
```

Maximum certificate count in the configured chain, at most 16.

::Anchor{id="ServerLimits.certificateBytes"}

### Field `certificateBytes`

```silk
pub certificateBytes: usize
```

Maximum aggregate DER bytes in the configured chain.

::Anchor{id="ServerLimits.certificateDecode"}

### Field `certificateDecode`

```silk
pub certificateDecode: DecodeLimits
```

Strict decoder policy for the configured leaf certificate and each client certificate.

::Anchor{id="ServerLimits.clientCertificates"}

### Field `clientCertificates`

```silk
pub clientCertificates: usize
```

Maximum certificate count in a client's chain, at most 16.

::Anchor{id="ServerLimits.clientCertificateBytes"}

### Field `clientCertificateBytes`

```silk
pub clientCertificateBytes: usize
```

Maximum aggregate DER bytes in a client's chain.

::Anchor{id="ServerLimits.clientTrust"}

### Field `clientTrust`

```silk
pub clientTrust: SnapshotLimits
```

Limits for the copy of [`ClientAuth`](#ClientAuth)'s trust anchors.

::Anchor{id="ServerLimits.clientValidation"}

### Field `clientValidation`

```silk
pub clientValidation: ValidationLimits
```

Limits for validating a client's chain.

::Anchor{id="ServerLimits.rejectedEarlyDataBytes"}

### Field `rejectedEarlyDataBytes`

```silk
pub rejectedEarlyDataBytes: usize
```

Maximum protected record bytes of rejected 0-RTT data that the server skips. More fails
with `BadRecordMac`.

::Anchor{id="ServerLimits.impl.Copy"}

## Implementation `Copy for ServerLimits`

```silk
impl Copy for ServerLimits
```

::Anchor{id="ServerLimits.impl"}

## Implementation `ServerLimits`

```silk
impl ServerLimits
```

::Anchor{id="ServerLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ServerLimits
```

Returns the finite TLS server defaults.

::Anchor{id="ServerConfig"}

## `ServerConfig`

```silk
pub struct ServerConfig<'a>
```

Borrowed server configuration that [`Server.make`](#Server.impl.make) copies into owned storage.

::Anchor{id="ServerConfig.certificates"}

### Field `certificates`

```silk
pub certificates: &'a [CertificateDer<'a>]
```

The certificate chain, leaf first. The leaf's public key matches the [`SigningKey`](/docs/std/tls-signature#SigningKey).

::Anchor{id="ServerConfig.alpn"}

### Field `alpn`

```silk
pub alpn: AlpnConfig<'a>
```

The supported ALPN protocols in server preference order. `required` makes a client without
ALPN fail.

::Anchor{id="ServerConfig.groups"}

### Field `groups`

```silk
pub groups: GroupPolicy
```

The key exchange groups that the server allows.

::Anchor{id="ServerConfig.clientAuth"}

### Field `clientAuth`

```silk
pub clientAuth: ClientAuth<'a>
```

Whether the server asks for a client certificate, and how it checks one.

::Anchor{id="ServerConfig.tickets"}

### Field `tickets`

```silk
pub tickets: TicketPolicy<'a>
```

Whether the server issues session tickets and resumes sessions from them.

::Anchor{id="ServerConfig.versions"}

### Field `versions`

```silk
pub versions: VersionPolicy
```

The TLS versions the server accepts. `VersionPolicy.defaults()` accepts TLS 1.2 and TLS 1.3.

::Anchor{id="ServerConfig.limits"}

### Field `limits`

```silk
pub limits: ServerLimits
```

Finite connection limits.

::Anchor{id="TicketKey"}

## `TicketKey`

```silk
pub struct TicketKey
```

The key that seals and opens session tickets, in [`TicketPolicy`](#TicketPolicy).

### Details
The 48 bytes are a 16-byte key name, which the server puts at the start of each ticket, and a
32-byte AES-256-GCM key. Servers that share a key resume each other's sessions.

### Gotchas
Anyone with the key can decrypt the session secrets of every ticket that it sealed. Make it
with random bytes, keep it secret, and replace it often.

::Anchor{id="TicketKey.impl.Copy"}

## Implementation `Copy for TicketKey`

```silk
impl Copy for TicketKey
```

::Anchor{id="TicketKey.impl"}

## Implementation `TicketKey`

```silk
impl TicketKey
```

::Anchor{id="TicketKey.impl.make"}

### Associated function `make`

```silk
pub fn make(bytes: &[u8; 48]) -> TicketKey
```

Returns the key with the name `bytes[0..16]` and the AES-256-GCM key `bytes[16..48]`.

::Anchor{id="TicketPolicy"}

## `TicketPolicy`

```silk
pub union TicketPolicy<'a>
```

Whether a [`Server`](#Server) issues session tickets, in [`ServerConfig.tickets`](#ServerConfig.tickets).

::Anchor{id="TicketPolicy.Off"}

### `Off`

```silk
Off
```

The server issues no tickets and does full handshakes only.

::Anchor{id="TicketPolicy.Issue"}

### `Issue`

```silk
Issue
```

After the client's Finished, the server sends `count` NewSessionTicket messages sealed with
`key`. A later ClientHello that offers one of them resumes the session without certificates,
when the ticket is younger than `lifetime` at `now`, has the same server name, and has the
same cipher suite hash.

::Anchor{id="TicketPolicy.Issue.key"}

#### Field `key`

```silk
pub key: &'a TicketKey
```

The key that seals and opens tickets.

::Anchor{id="TicketPolicy.Issue.now"}

#### Field `now`

```silk
pub now: &'a Instant
```

The current time, which dates new tickets and checks the age of offered ones.

::Anchor{id="TicketPolicy.Issue.lifetime"}

#### Field `lifetime`

```silk
pub lifetime: usize
```

The ticket lifetime in seconds, from 1 to 604800.

::Anchor{id="TicketPolicy.Issue.count"}

#### Field `count`

```silk
pub count: usize
```

The number of tickets to send after each handshake, from 1 to 4.

::Anchor{id="TicketPolicy.Issue.maxEarlyData"}

#### Field `maxEarlyData`

```silk
pub maxEarlyData: usize
```

The most 0-RTT plaintext bytes that a client may send when it resumes from one of these
tickets, at most 16777216, or 0 for none.

::Anchor{id="TicketPolicy.impl.Copy"}

## Implementation `Copy for TicketPolicy<'a>`

```silk
impl<'a> Copy for TicketPolicy<'a>
```

::Anchor{id="ClientAuth"}

## `ClientAuth`

```silk
pub union ClientAuth<'a>
```

Whether a [`Server`](#Server) asks the client for a certificate, in [`ServerConfig.clientAuth`](#ServerConfig.clientAuth).

::Anchor{id="ClientAuth.Off"}

### `Off`

```silk
Off
```

The server does not ask for a client certificate.

::Anchor{id="ClientAuth.Request"}

### `Request`

```silk
Request
```

The server sends a CertificateRequest. When the client sends a chain, the server checks its
CertificateVerify with the leaf's key, and validates the chain against `trust` at
`validationTime` for the `ClientAuth` purpose.

::Anchor{id="ClientAuth.Request.trust"}

#### Field `trust`

```silk
pub trust: &'a TrustSnapshot
```

The anchors that a client chain must lead to. [`Server.make`](#Server.impl.make) copies them.

::Anchor{id="ClientAuth.Request.validationTime"}

#### Field `validationTime`

```silk
pub validationTime: &'a Instant
```

The time at which certificate dates are checked.

::Anchor{id="ClientAuth.Request.required"}

#### Field `required`

```silk
pub required: bool
```

Whether a client that sends no certificate fails with `ClientCertificateRequired`.

::Anchor{id="ClientAuth.Request.rejectUntrusted"}

#### Field `rejectUntrusted`

```silk
pub rejectUntrusted: bool
```

Whether a chain that does not validate fails with `UntrustedClientCertificate`. Otherwise
the handshake completes, and [`Server.clientCertificateStatus`](#Server.impl.clientCertificateStatus) gives `Untrusted`.

::Anchor{id="ClientAuth.impl.Copy"}

## Implementation `Copy for ClientAuth<'a>`

```silk
impl<'a> Copy for ClientAuth<'a>
```

::Anchor{id="ClientCertificateStatus"}

## `ClientCertificateStatus`

```silk
pub union ClientCertificateStatus
```

What the server knows about the client's certificate, from
[`Server.clientCertificateStatus`](#Server.impl.clientCertificateStatus).

::Anchor{id="ClientCertificateStatus.NotRequested"}

### `NotRequested`

```silk
NotRequested
```

The server does not ask for a client certificate.

::Anchor{id="ClientCertificateStatus.Pending"}

### `Pending`

```silk
Pending
```

The client has not sent its Certificate message yet.

::Anchor{id="ClientCertificateStatus.Absent"}

### `Absent`

```silk
Absent
```

The client sent no certificate.

::Anchor{id="ClientCertificateStatus.Trusted"}

### `Trusted`

```silk
Trusted
```

The chain validated, and the client signed CertificateVerify with the leaf's key.

::Anchor{id="ClientCertificateStatus.Untrusted"}

### `Untrusted`

```silk
Untrusted
```

The client signed CertificateVerify with the leaf's key, but the chain did not validate.

::Anchor{id="ClientCertificateStatus.Untrusted.error"}

#### Field `error`

```silk
pub error: ValidationError
```

Why the chain did not validate.

::Anchor{id="ClientCertificateStatus.Resumed"}

### `Resumed`

```silk
Resumed
```

The connection resumed a session in which the client presented a certificate. The client
sends no certificate on resumption, so [`Server.clientCertificates`](#Server.impl.clientCertificates) is empty.

::Anchor{id="ClientCertificateStatus.Resumed.trusted"}

#### Field `trusted`

```silk
pub trusted: bool
```

Whether the chain validated in the original handshake.

::Anchor{id="ClientCertificateStatus.impl.Debug"}

## Implementation `Debug for ClientCertificateStatus`

```silk
impl Debug for ClientCertificateStatus
```

::Anchor{id="ClientCertificateStatus.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant and its fields, such as `Untrusted { ... }`.

::Anchor{id="ServerDemand"}

## `ServerDemand`

```silk
pub enum ServerDemand
```

The next action or observable connection event of a [`Server`](#Server), in [`ServerProgress.demand`](#ServerProgress.demand).

::Anchor{id="ServerDemand.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

Supply client transport bytes.

::Anchor{id="ServerDemand.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

Write and acknowledge the complete pending output before other work.

::Anchor{id="ServerDemand.PlaintextReady"}

### `PlaintextReady`

```silk
PlaintextReady
```

Read buffered application plaintext.

::Anchor{id="ServerDemand.HandshakeComplete"}

### `HandshakeComplete`

```silk
HandshakeComplete
```

Observe the one-shot handshake completion. Application data can flow after it.

::Anchor{id="ServerDemand.PeerClosed"}

### `PeerClosed`

```silk
PeerClosed
```

The client's direction closed cleanly.

::Anchor{id="ServerDemand.Closed"}

### `Closed`

```silk
Closed
```

Both directions closed cleanly and no output remains.

::Anchor{id="ServerProgress"}

## `ServerProgress`

```silk
pub struct ServerProgress
```

Exact progress from one [`Server`](#Server) operation: how many bytes it took or wrote, and the next
[`ServerDemand`](#ServerDemand).

::Anchor{id="ServerProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The accepted prefix of caller input or application plaintext.

::Anchor{id="ServerProgress.written"}

### Field `written`

```silk
pub written: usize
```

The bytes copied into a caller plaintext destination.

::Anchor{id="ServerProgress.demand"}

### Field `demand`

```silk
pub demand: ServerDemand
```

The next action or event.

::Anchor{id="ServerProgress.impl.Copy"}

## Implementation `Copy for ServerProgress`

```silk
impl Copy for ServerProgress
```

::Anchor{id="ServerOperation"}

## `ServerOperation`

```silk
pub enum ServerOperation
```

A public operation rejected because of caller state.

::Anchor{id="ServerOperation.FeedInput"}

### `FeedInput`

```silk
FeedInput
```

Transport input feed.

::Anchor{id="ServerOperation.Progress"}

### `Progress`

```silk
Progress
```

State-machine progress without new bytes.

::Anchor{id="ServerOperation.AckWritten"}

### `AckWritten`

```silk
AckWritten
```

Pending-output acknowledgment.

::Anchor{id="ServerOperation.ReadPlaintext"}

### `ReadPlaintext`

```silk
ReadPlaintext
```

Application plaintext read.

::Anchor{id="ServerOperation.WritePlaintext"}

### `WritePlaintext`

```silk
WritePlaintext
```

Application plaintext write.

::Anchor{id="ServerOperation.RequestKeyUpdate"}

### `RequestKeyUpdate`

```silk
RequestKeyUpdate
```

Local traffic-key update request.

::Anchor{id="ServerOperation.CloseWrite"}

### `CloseWrite`

```silk
CloseWrite
```

Local write-direction close.

::Anchor{id="ServerOperation.EndInput"}

### `EndInput`

```silk
EndInput
```

Transport input end.

::Anchor{id="ServerOperation.impl.Debug"}

## Implementation `Debug for ServerOperation`

```silk
impl Debug for ServerOperation
```

::Anchor{id="ServerOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `FeedInput`.

::Anchor{id="ServerProtocolReason"}

## `ServerProtocolReason`

```silk
pub enum ServerProtocolReason
```

A protocol rule that the client broke.

::Anchor{id="ServerProtocolReason.Record"}

### `Record`

```silk
Record
```

A record has an invalid content type, version, length, padding, or inner framing.

::Anchor{id="ServerProtocolReason.UnexpectedMessage"}

### `UnexpectedMessage`

```silk
UnexpectedMessage
```

A message or record arrived in an invalid order.

::Anchor{id="ServerProtocolReason.InvalidLength"}

### `InvalidLength`

```silk
InvalidLength
```

A handshake message or vector is truncated or has trailing bytes.

::Anchor{id="ServerProtocolReason.Extension"}

### `Extension`

```silk
Extension
```

An extension is duplicated, misplaced, or malformed.

::Anchor{id="ServerProtocolReason.ClientHello"}

### `ClientHello`

```silk
ClientHello
```

ClientHello has a field that TLS 1.3 forbids.

::Anchor{id="ServerProtocolReason.HelloRetryRequest"}

### `HelloRetryRequest`

```silk
HelloRetryRequest
```

The second ClientHello does not follow the HelloRetryRequest.

::Anchor{id="ServerProtocolReason.CompatibilityCcs"}

### `CompatibilityCcs`

```silk
CompatibilityCcs
```

A compatibility `change_cipher_spec` record is outside its window or not exactly `{1}`.

::Anchor{id="ServerProtocolReason.PostHandshake"}

### `PostHandshake`

```silk
PostHandshake
```

A KeyUpdate or other post-handshake message is not valid.

::Anchor{id="ServerProtocolReason.ClientCertificate"}

### `ClientCertificate`

```silk
ClientCertificate
```

A client Certificate or CertificateVerify message has invalid framing.

::Anchor{id="ServerProtocolReason.InternalState"}

### `InternalState`

```silk
InternalState
```

The server reached an impossible private transition.

::Anchor{id="ServerProtocolReason.EarlyData"}

### `EarlyData`

```silk
EarlyData
```

The client sent more 0-RTT data than the ticket allows, or misplaced EndOfEarlyData.

::Anchor{id="ServerProtocolReason.impl.Debug"}

## Implementation `Debug for ServerProtocolReason`

```silk
impl Debug for ServerProtocolReason
```

::Anchor{id="ServerProtocolReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Record`.

::Anchor{id="NegotiationFailure"}

## `NegotiationFailure`

```silk
pub enum NegotiationFailure
```

A handshake parameter that the client and the server do not share.

::Anchor{id="NegotiationFailure.Version"}

### `Version`

```silk
Version
```

The client offers no TLS version that the server accepts.

::Anchor{id="NegotiationFailure.CipherSuite"}

### `CipherSuite`

```silk
CipherSuite
```

The client offers no supported cipher suite.

::Anchor{id="NegotiationFailure.Group"}

### `Group`

```silk
Group
```

The client supports no group that the [`GroupPolicy`](#GroupPolicy) allows.

::Anchor{id="NegotiationFailure.SignatureScheme"}

### `SignatureScheme`

```silk
SignatureScheme
```

The client does not accept the signature scheme of the [`SigningKey`](/docs/std/tls-signature#SigningKey).

::Anchor{id="NegotiationFailure.ExtendedMasterSecret"}

### `ExtendedMasterSecret`

```silk
ExtendedMasterSecret
```

A TLS 1.2 client does not offer the extended master secret (RFC 7627), which the server
requires.

::Anchor{id="NegotiationFailure.impl.Debug"}

## Implementation `Debug for NegotiationFailure`

```silk
impl Debug for NegotiationFailure
```

::Anchor{id="NegotiationFailure.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Version`.

::Anchor{id="ServerLimitKind"}

## `ServerLimitKind`

```silk
pub enum ServerLimitKind
```

A named finite resource exhausted by client input or configuration.

::Anchor{id="ServerLimitKind.HandshakeBodyBytes"}

### `HandshakeBodyBytes`

```silk
HandshakeBodyBytes
```

One handshake body.

::Anchor{id="ServerLimitKind.HandshakeBytes"}

### `HandshakeBytes`

```silk
HandshakeBytes
```

Aggregate handshake headers and bodies.

::Anchor{id="ServerLimitKind.HandshakeMessages"}

### `HandshakeMessages`

```silk
HandshakeMessages
```

Handshake message count.

::Anchor{id="ServerLimitKind.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

One extension vector.

::Anchor{id="ServerLimitKind.EmptyRecords"}

### `EmptyRecords`

```silk
EmptyRecords
```

Consecutive empty application or compatibility records.

::Anchor{id="ServerLimitKind.PostHandshakeControls"}

### `PostHandshakeControls`

```silk
PostHandshakeControls
```

Consecutive post-handshake control messages.

::Anchor{id="ServerLimitKind.Certificates"}

### `Certificates`

```silk
Certificates
```

Configured certificate count.

::Anchor{id="ServerLimitKind.CertificateBytes"}

### `CertificateBytes`

```silk
CertificateBytes
```

Configured certificate DER bytes.

::Anchor{id="ServerLimitKind.Alpn"}

### `Alpn`

```silk
Alpn
```

One ALPN protocol or list.

::Anchor{id="ServerLimitKind.ClientCertificates"}

### `ClientCertificates`

```silk
ClientCertificates
```

Client certificate count.

::Anchor{id="ServerLimitKind.ClientCertificateBytes"}

### `ClientCertificateBytes`

```silk
ClientCertificateBytes
```

Client certificate DER bytes.

::Anchor{id="ServerLimitKind.ClientTrust"}

### `ClientTrust`

```silk
ClientTrust
```

Trust anchors for client certificates.

::Anchor{id="ServerLimitKind.impl.Debug"}

## Implementation `Debug for ServerLimitKind`

```silk
impl Debug for ServerLimitKind
```

::Anchor{id="ServerLimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `HandshakeBodyBytes`.

::Anchor{id="ServerError"}

## `ServerError`

```silk
pub union ServerError
```

A typed TLS server failure. An error from a call after [`Server.make`](#Server.impl.make) is permanent for the
server.

::Anchor{id="ServerError.EmptyCertificateChain"}

### `EmptyCertificateChain`

```silk
EmptyCertificateChain
```

The configured chain has no certificates.

::Anchor{id="ServerError.CertificateDecode"}

### `CertificateDecode`

```silk
CertificateDecode
```

The configured leaf certificate did not decode.

::Anchor{id="ServerError.CertificateDecode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The complete strict decoder failure.

::Anchor{id="ServerError.KeyMismatch"}

### `KeyMismatch`

```silk
KeyMismatch
```

The configured leaf certificate's public key does not match the [`SigningKey`](/docs/std/tls-signature#SigningKey).

::Anchor{id="ServerError.PeerAlert"}

### `PeerAlert`

```silk
PeerAlert
```

The client sent a fatal alert with this wire description.

::Anchor{id="ServerError.PeerAlert.code"}

#### Field `code`

```silk
pub code: u8
```

The alert description byte.

::Anchor{id="ServerError.BadRecordMac"}

### `BadRecordMac`

```silk
BadRecordMac
```

Protected record authentication failed.

::Anchor{id="ServerError.ProtocolViolation"}

### `ProtocolViolation`

```silk
ProtocolViolation
```

The client broke a protocol rule.

::Anchor{id="ServerError.ProtocolViolation.reason"}

#### Field `reason`

```silk
pub reason: ServerProtocolReason
```

The rejected rule.

::Anchor{id="ServerError.Negotiation"}

### `Negotiation`

```silk
Negotiation
```

The client and the server share no value for a handshake parameter.

::Anchor{id="ServerError.Negotiation.failure"}

#### Field `failure`

```silk
pub failure: NegotiationFailure
```

The parameter without a shared value.

::Anchor{id="ServerError.InvalidKeyShare"}

### `InvalidKeyShare`

```silk
InvalidKeyShare
```

The client's key share is not a valid public key.

::Anchor{id="ServerError.Signing"}

### `Signing`

```silk
Signing
```

The key could not sign CertificateVerify, for example because an RSA key is too small for
the scheme.

::Anchor{id="ServerError.Signing.error"}

#### Field `error`

```silk
pub error: SigningError
```

The signing failure.

::Anchor{id="ServerError.Finished"}

### `Finished`

```silk
Finished
```

The client's Finished did not authenticate the transcript.

::Anchor{id="ServerError.Binder"}

### `Binder`

```silk
Binder
```

The client's PSK binder did not authenticate the ClientHello for a ticket that the server
sealed.

::Anchor{id="ServerError.InvalidTicketPolicy"}

### `InvalidTicketPolicy`

```silk
InvalidTicketPolicy
```

[`TicketPolicy`](#TicketPolicy) `Issue` has a lifetime, count, or `maxEarlyData` out of range.

::Anchor{id="ServerError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A finite resource budget was exceeded.

::Anchor{id="ServerError.LimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: ServerLimitKind
```

The exhausted resource category.

::Anchor{id="ServerError.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The inclusive configured limit.

::Anchor{id="ServerError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

A caller operation is invalid in the current state.

::Anchor{id="ServerError.InvalidState.operation"}

#### Field `operation`

```silk
pub operation: ServerOperation
```

The rejected operation.

::Anchor{id="ServerError.EmptyBuffer"}

### `EmptyBuffer`

```silk
EmptyBuffer
```

A caller supplied an empty plaintext output buffer.

::Anchor{id="ServerError.HandshakeTruncated"}

### `HandshakeTruncated`

```silk
HandshakeTruncated
```

Transport input ended before the handshake completed.

::Anchor{id="ServerError.Truncated"}

### `Truncated`

```silk
Truncated
```

Transport input ended after the handshake without client `close_notify`.

::Anchor{id="ServerError.NoApplicationProtocol"}

### `NoApplicationProtocol`

```silk
NoApplicationProtocol
```

The client's ALPN offer shares no protocol with the server, or the server requires ALPN and
the client sent none.

::Anchor{id="ServerError.ClientCertificateRequired"}

### `ClientCertificateRequired`

```silk
ClientCertificateRequired
```

The server requires a client certificate, and the client sent none.

::Anchor{id="ServerError.ClientCertificateDecode"}

### `ClientCertificateDecode`

```silk
ClientCertificateDecode
```

A client certificate did not decode.

::Anchor{id="ServerError.ClientCertificateDecode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The decoder failure.

::Anchor{id="ServerError.ClientCertificateVerify"}

### `ClientCertificateVerify`

```silk
ClientCertificateVerify
```

The client's CertificateVerify did not verify with its leaf's key.

::Anchor{id="ServerError.ClientCertificateVerify.error"}

#### Field `error`

```silk
pub error: SignatureFailure
```

The signature failure.

::Anchor{id="ServerError.UntrustedClientCertificate"}

### `UntrustedClientCertificate`

```silk
UntrustedClientCertificate
```

The client's chain did not validate, and [`ClientAuth`](#ClientAuth) rejects such chains.
[`Server.clientCertificateStatus`](#Server.impl.clientCertificateStatus) gives the full validation error.

::Anchor{id="ServerError.UntrustedClientCertificate.reason"}

#### Field `reason`

```silk
pub reason: ValidationReason
```

Why the chain did not validate.

::Anchor{id="ServerError.impl.Copy"}

## Implementation `Copy for ServerError`

```silk
impl Copy for ServerError
```

::Anchor{id="ServerError.impl.Debug"}

## Implementation `Debug for ServerError`

```silk
impl Debug for ServerError
```

::Anchor{id="ServerError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant and its fields, such as `PeerAlert { ... }`.

::Anchor{id="Server"}

## `Server`

```silk
pub struct Server
```

A TLS 1.2 and TLS 1.3 server state machine that does no I/O.

### When to use
Make one server for each accepted connection with [`Server.make`](#Server.impl.make). Then move bytes between it
and the transport until it reports `HandshakeComplete`, and then read and write application
data.

### Details
Each operation returns a [`ServerProgress`](#ServerProgress) with a [`ServerDemand`](#ServerDemand) that tells you what to do
next. Output works in two steps: write [`Server.pendingOutput`](#Server.impl.pendingOutput) to the transport, and then call
[`Server.ackWritten`](#Server.impl.ackWritten) with the number of bytes written. The server does not keep your buffers.

### Gotchas
A [`ServerError`](#ServerError) from a call after [`Server.make`](#Server.impl.make) is permanent for the server. The server sends
no alert when it fails. In TLS 1.2 it does not resume sessions, has no KeyUpdate, and refuses
renegotiation. Dropping the server does not send `close_notify`. Call
[`Server.closeWrite`](#Server.impl.closeWrite) first. Secrets are not erased.

::Anchor{id="Server.impl"}

## Implementation `Server`

```silk
impl Server
```

::Anchor{id="Server.impl.make"}

### Associated function `make`

```silk
pub effect fn make<'a>(config: &ServerConfig<'a>, key: SigningKey) -> Result<Server, ServerError>
    ! OutOfMemoryError
    ? &mut Allocator
```

Returns a new server for `config` and the leaf's private `key`, waiting for the ClientHello.

The server copies the chain and the ALPN protocols. It decodes the leaf certificate and checks
that its public key is the public key of `key`.

#### Errors
- `EmptyCertificateChain`, `CertificateDecode`, or `KeyMismatch` for a chain that is not
  valid.
- `LimitExceeded` for limits, a chain, or ALPN protocols that are not valid.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Server.impl.pendingOutput"}

### Method `pendingOutput`

```silk
pub fn pendingOutput<'a>(self: &'a Self) -> &'a [u8]
```

Returns the TLS output to send to the client. After you send some of it, call
[`Server.ackWritten`](#Server.impl.ackWritten).

::Anchor{id="Server.impl.serverName"}

### Method `serverName`

```silk
pub fn serverName<'a>(self: &'a Self) -> Option<&'a [u8]>
```

Returns the host name that the client sent in its SNI extension, after the server read the
ClientHello. Before that, or without SNI, returns `None`.

::Anchor{id="Server.impl.selectedAlpn"}

### Method `selectedAlpn`

```silk
pub fn selectedAlpn<'a>(self: &'a Self) -> Option<&'a [u8]>
```

Returns the ALPN protocol that the server selected, after the server read the ClientHello.
Before that, or without a selection, returns `None`.

::Anchor{id="Server.impl.cipherSuite"}

### Method `cipherSuite`

```silk
pub fn cipherSuite(self: &Self) -> Option<CipherSuite>
```

Returns the negotiated cipher suite after the `HandshakeComplete` action. Before that, returns
`None`.

::Anchor{id="Server.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Option<TlsVersion>
```

Returns the negotiated TLS version after the `HandshakeComplete` action. Before that, returns
`None`.

::Anchor{id="Server.impl.group"}

### Method `group`

```silk
pub fn group(self: &Self) -> Option<ServerGroup>
```

Returns the negotiated key exchange group after the `HandshakeComplete` action. Before that,
returns `None`.

::Anchor{id="Server.impl.retried"}

### Method `retried`

```silk
pub fn retried(self: &Self) -> bool
```

Returns whether the server sent a HelloRetryRequest in this handshake.

::Anchor{id="Server.impl.resumed"}

### Method `resumed`

```silk
pub fn resumed(self: &Self) -> bool
```

Returns whether the handshake resumed a session from a ticket, after the server read the
ClientHello. A resumed handshake sends no certificates.

::Anchor{id="Server.impl.earlyData"}

### Method `earlyData`

```silk
pub fn earlyData(self: &Self) -> EarlyDataStatus
```

Returns what happened to the client's 0-RTT data, after the server read the ClientHello. It
is `NotOffered`, `Accepted`, or `Rejected`. Plaintext that you read before
`HandshakeComplete` is accepted early data.

::Anchor{id="Server.impl.clientCertificateStatus"}

### Method `clientCertificateStatus`

```silk
pub fn clientCertificateStatus<'a>(self: &'a Self) -> &'a ClientCertificateStatus
```

Returns what the server knows about the client's certificate. After `HandshakeComplete` it is
`NotRequested`, `Absent`, `Trusted`, or `Untrusted`.

::Anchor{id="Server.impl.clientCertificates"}

### Method `clientCertificates`

```silk
pub fn clientCertificates<'a>(self: &'a Self) -> &'a [Certificate]
```

Returns the client's certificates, leaf first, as the client sent them. It is empty until the
client's Certificate message arrives, and when the client sent none.

::Anchor{id="Server.impl.closeNotified"}

### Method `closeNotified`

```silk
pub fn closeNotified(self: &Self) -> bool
```

Returns whether the client sent `close_notify`. Plaintext that came before it can still be
read.

::Anchor{id="Server.impl.feedInput"}

### Method `feedInput`

```silk
pub effect fn feedInput(self: &mut Self, input: &[u8]) -> Result<ServerProgress, ServerError>
    ! OutOfMemoryError
    ? &mut Allocator | &mut Random
```

Gives bytes from the client to the server. `consumed` in the result tells how many it
accepted.

#### Details
The server does not keep `input`. Give the bytes that it did not accept again in the next
call. During the handshake, it accepts no bytes while output is pending. After the client
sends `close_notify`, the server accepts and ignores all later bytes.

::Anchor{id="Server.impl.progress"}

### Method `progress`

```silk
pub effect fn progress(self: &mut Self) -> Result<ServerProgress, ServerError>
    ! OutOfMemoryError
    ? &mut Allocator | &mut Random
```

Processes buffered handshake messages without new input, and returns the next action.

::Anchor{id="Server.impl.ackWritten"}

### Method `ackWritten`

```silk
pub fn ackWritten(self: &mut Self, count: usize) -> Result<ServerProgress, ServerError>
```

Tells the server that the transport sent the first `count` bytes of [`Server.pendingOutput`](#Server.impl.pendingOutput).

::Anchor{id="Server.impl.readPlaintext"}

### Method `readPlaintext`

```silk
pub fn readPlaintext(self: &mut Self, output: &mut [u8]) -> Result<ServerProgress, ServerError>
```

Copies decrypted application data into `output`. `written` in the result tells how many
bytes.

#### Gotchas
An empty `output` returns the `EmptyBuffer` error. It never means the end of input.

::Anchor{id="Server.impl.writePlaintext"}

### Method `writePlaintext`

```silk
pub fn writePlaintext(self: &mut Self, input: &[u8]) -> Result<ServerProgress, ServerError>
```

Encrypts a prefix of `input`, at most 16384 bytes. `consumed` in the result tells how many
bytes.

#### Details
When TLS output is waiting, the server accepts no bytes. Send that output first. Do not give
accepted bytes again, even if the transport sent only part of the record.

::Anchor{id="Server.impl.requestKeyUpdate"}

### Method `requestKeyUpdate`

```silk
pub fn requestKeyUpdate(self: &mut Self) -> Result<ServerProgress, ServerError>
```

Asks for a new local traffic key before the next application write. More calls before that
write do nothing.

::Anchor{id="Server.impl.closeWrite"}

### Method `closeWrite`

```silk
pub fn closeWrite(self: &mut Self) -> Result<ServerProgress, ServerError>
```

Queues `close_notify` after the accepted output. More calls do nothing.

::Anchor{id="Server.impl.endInput"}

### Method `endInput`

```silk
pub fn endInput(self: &mut Self) -> Result<ServerProgress, ServerError>
```

Tells the server that the transport has no more input. Pending output stays pending.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
