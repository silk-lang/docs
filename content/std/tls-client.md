An authenticated bounded TLS 1.3 client for caller-driven byte transports.

## When to use

Use [`Client.make`](#Client.impl.make) when an application has an explicit HTTPS identity, trust snapshot,
validation instant, cryptographic random provider, allocator, and byte transport. Use the
driver operations to move exact input and output prefixes without retaining caller buffers.

## Details

The client supports the selected ChaCha20-Poly1305, AES-128-GCM, and AES-256-GCM TLS 1.3
suites with X25519 or P-256. It publishes plaintext only after path, identity,
CertificateVerify, and Finished authentication and acknowledgment of the client Finished.
Configuration, trust, handshake bytes, traffic state, and result evidence have one affine
owner. Resource limits are finite and inclusive.

## Gotchas

This module does not acquire trust, time, entropy, or a transport. It implements a selected
TLS 1.3 profile, not complete Web PKI. Logical state invalidation does not guarantee physical
secret erasure. Drop releases storage but does not send `close_notify`.

## Examples

### Queue and acknowledge a ClientHello with explicit dependencies

The client copies the HTTPS identity and consumes the trust snapshot. Transport writes are
explicit: borrow the current suffix, write that exact prefix, then acknowledge only those bytes.

```silk
import silk.allocator as Allocators {Allocator, OutOfMemoryError}
import silk.effect as Effects {Effect}
import silk.https_identity as Identities {HttpsIdentity, IdentityError, OriginHost, ReferenceIdentity}
import silk.random as Randomness {Random}
import silk.result as Results {Result}
import silk.system_clock as Clocks {SystemClock}
import silk.tls_client as TlsClients {AlpnConfig, Client, ClientConfig, ClientLimits, TlsError}
import silk.trust_anchor as TrustAnchors {TrustAnchor}
import silk.trust_snapshot as TrustSnapshots {SnapshotLimits, TrustSnapshot, TrustSourceError}
import silk.u8
import silk.usize
import silk.list as Lists {List}

struct ExampleRandom { next: usize }

impl Random for ExampleRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    let mut index = usize.ZERO
    while index < output.length {
      output[index] = usize.toU8((self.next + index) % 251 + usize.ONE)
      index = index + usize.ONE
    }
    self.next = self.next + output.length
    return ()
  }
}

effect fn program<'name>(name: &'name [u8]) -> i32 ! OutOfMemoryError {
  let admitted = HttpsIdentity.reference(OriginHost<'name>.Dns {bytes: name})
  let reference = match move admitted {
    Result<ReferenceIdentity<'name>, IdentityError>.Success {value} => value
    Result<ReferenceIdentity<'name>, IdentityError>.Failure {error} => { return 0 }
  }
  let snapshot = TrustSnapshot.fromAnchors(
    List<TrustAnchor>.make(),
    SnapshotLimits {anchors: 0, encodedBytes: 0},
  )
  let trust = match move snapshot {
    Result<TrustSnapshot, TrustSourceError>.Success {value} => move value
    Result<TrustSnapshot, TrustSourceError>.Failure {error} => { return 0 }
  }
  let config = ClientConfig {
    reference: reference,
    alpn: AlpnConfig.defaults(),
    limits: ClientLimits.defaults(),
  }
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut random = ExampleRandom {next: usize.ONE}
  let made = run Client.make(&config, move trust, SystemClock.make(1789156800, 0))
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut client = match move made {
    Result<Client, TlsError>.Success {value} => move value
    Result<Client, TlsError>.Failure {error} => { return 0 }
  }
  let pending = client.pendingOutput()
  let length = pending.length
  drop pending
  if length == 0 { return 0 }
  drop client.ackWritten(length)
  return 42
}

effect fn recover(error: OutOfMemoryError) -> i32 { return 0 }

pub fn main() -> i32 { return run Effect.catchAll(program(b"example.com"), recover) }
```

Import as `Client` with `import silk.tls_client { Client }`.

Public declarations: 15.

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

Inclusive local resource policy for one client connection.

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

A reference already admitted by `HttpsIdentity.reference`; construction revalidates it.

::Anchor{id="ClientConfig.alpn"}

### Field `alpn`

```silk
pub alpn: AlpnConfig<'a>
```

ALPN policy, with opaque protocols in caller preference order.

::Anchor{id="ClientConfig.limits"}

### Field `limits`

```silk
pub limits: ClientLimits
```

Finite connection limits and nested certificate policies.

::Anchor{id="Demand"}

## `Demand`

```silk
pub enum Demand
```

The next action or observable connection event.

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

Exact progress from one client driver operation.

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

ServerHello does not select the admitted TLS 1.3 profile.

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

::Anchor{id="CertificateVerifyFailure"}

## `CertificateVerifyFailure`

```silk
pub union CertificateVerifyFailure
```

A server CertificateVerify failure with its selected signature implementation.

::Anchor{id="CertificateVerifyFailure.Ecdsa"}

### `Ecdsa`

```silk
Ecdsa
```

ECDSA-P256/SHA-256 verification failed.

::Anchor{id="CertificateVerifyFailure.Ecdsa.error"}

#### Field `error`

```silk
pub error: P256SignatureError
```

The exact primitive failure.

::Anchor{id="CertificateVerifyFailure.Rsa"}

### `Rsa`

```silk
Rsa
```

RSA-PSS-RSAE/SHA-256 verification failed.

::Anchor{id="CertificateVerifyFailure.Rsa.error"}

#### Field `error`

```silk
pub error: RsaError
```

The exact primitive failure.

::Anchor{id="TlsError"}

## `TlsError`

```silk
pub union TlsError
```

A typed TLS client failure.

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
pub error: CertificateVerifyFailure
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

::Anchor{id="CertificateVerifyFailure.impl.Copy"}

## Implementation `Copy for CertificateVerifyFailure`

```silk
impl Copy for CertificateVerifyFailure
```

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

Returns the negotiated TLS 1.3 cipher suite.

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

::Anchor{id="Client"}

## `Client`

```silk
pub struct Client
```

One affine authenticated TLS 1.3 client state machine.

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
  ) -> Result<Client, TlsError>
  ! OutOfMemoryError
  ? &mut Allocator | &mut Random
```

Creates a client, consumes explicit trust, copies validated configuration, and queues ClientHello.

#### Details

The operation validates all caller-controlled limits, identity, time, and ALPN data before
allocation. It samples no clock and loads no trust. DNS bytes become one owned lowercase
A-label used for both SNI and certificate identity. IP references send no SNI.

#### Gotchas

The caller must supply a trustworthy validation instant and providers. Random-provider
failure remains fatal. Allocation refusal is an `OutOfMemoryError` Effect failure.

::Anchor{id="Client.impl.pendingOutput"}

### Method `pendingOutput`

```silk
pub fn pendingOutput<'a>(self: &'a Self) -> &'a [u8]
```

Borrows the exact unacknowledged TLS output suffix.

::Anchor{id="Client.impl.authentication"}

### Method `authentication`

```silk
pub fn authentication<'a>(self: &'a Self) -> Option<Authentication<'a>>
```

Returns authenticated metadata only after the one-shot authentication event becomes visible.

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

Feeds a peer-ciphertext prefix without retaining the caller slice.

#### Details

The returned `consumed` count identifies the exact accepted prefix. A clean peer close
consumes and ignores all later transport bytes as required by TLS 1.3. Before requesting
more input, the client drains every complete handshake message exposed by the accepted
record and schedules mandatory response output.

::Anchor{id="Client.impl.progress"}

### Method `progress`

```silk
pub effect fn progress(self: &mut Self) -> Result<Progress, TlsError>
  ! OutOfMemoryError
  ? &mut Allocator | &mut Random
```

Drains complete buffered handshake work and schedules mandatory control output without input.

::Anchor{id="Client.impl.ackWritten"}

### Method `ackWritten`

```silk
pub fn ackWritten(self: &mut Self, count: usize) -> Result<Progress, TlsError>
```

Acknowledges one transmitted prefix without acknowledging bytes implicitly.

::Anchor{id="Client.impl.readPlaintext"}

### Method `readPlaintext`

```silk
pub fn readPlaintext(
    self: &mut Self,
    output: &mut [u8],
  ) -> Result<Progress, TlsError>
```

Copies authenticated application plaintext or reports pending input, closure, or truncation.

#### Gotchas

A zero-length destination returns `EmptyBuffer`; it is never clean EOF.

::Anchor{id="Client.impl.writePlaintext"}

### Method `writePlaintext`

```silk
pub fn writePlaintext(self: &mut Self, input: &[u8]) -> Result<Progress, TlsError>
```

Accepts at most one 16384-byte application fragment after authentication.

#### Details

Mandatory control output has priority and accepts no plaintext. A positive accepted prefix
is encrypted once and must not be resubmitted after partial transport writes.

::Anchor{id="Client.impl.requestKeyUpdate"}

### Method `requestKeyUpdate`

```silk
pub fn requestKeyUpdate(self: &mut Self) -> Result<Progress, TlsError>
```

Schedules one coalesced local KeyUpdate before the next application write.

::Anchor{id="Client.impl.closeWrite"}

### Method `closeWrite`

```silk
pub fn closeWrite(self: &mut Self) -> Result<Progress, TlsError>
```

Idempotently schedules one local `close_notify` after accepted output.

::Anchor{id="Client.impl.endInput"}

### Method `endInput`

```silk
pub fn endInput(self: &mut Self) -> Result<Progress, TlsError>
```

Marks transport input EOF without acknowledging pending output.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
