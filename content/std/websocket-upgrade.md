Bounded WebSocket server handshake inspection and explicit application acceptance.

## Details

`inspect` borrows a parsed HTTP head without allocation. `withUpgrade` runs the application
decision before output, flushes the switching response, then lends the existing buffered channel.
Origin is policy input, not authentication. Valid extension offers are declined; frames and
compression are outside this module.

Import as `WebSocketUpgrade` with `import silk.websocket_upgrade as WebSocketUpgrade`.

Public declarations: 14.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Finite handshake budgets. Zero forbids the corresponding resource.

::Anchor{id="Limits.maxProtocols"}

### Field `maxProtocols`

```silk
pub maxProtocols: usize
```

Maximum offered subprotocol tokens across all fields.

::Anchor{id="Limits.maxProtocolBytes"}

### Field `maxProtocolBytes`

```silk
pub maxProtocolBytes: usize
```

Maximum bytes in each offered subprotocol token.

::Anchor{id="Limits.maxExtensionBytes"}

### Field `maxExtensionBytes`

```silk
pub maxExtensionBytes: usize
```

Maximum aggregate extension field-value bytes.

::Anchor{id="Limits.maxResponseBytes"}

### Field `maxResponseBytes`

```silk
pub maxResponseBytes: usize
```

Maximum serialized response bytes, including generated fields.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

Maximum simultaneous owned payload and index capacities for the response plan.

::Anchor{id="Limits.impl.Copy"}

## Implementation `Copy for Limits`

```silk
impl Copy for Limits
```

::Anchor{id="Limits.impl"}

## Implementation `Limits`

```silk
impl Limits
```

::Anchor{id="Limits.impl.default"}

### Associated function `default`

```silk
pub fn default() -> Limits
```

Returns the default finite handshake budgets.

#### Details

The defaults are 32 protocols, 128 token bytes, 4096 extension bytes, 8192 response bytes, and 16384 owned bytes.

::Anchor{id="ValidationReason"}

## `ValidationReason`

```silk
pub enum ValidationReason
```

The peer-input rule that rejected an offer.

::Anchor{id="ValidationReason.Request"}

### `Request`

```silk
Request
```

The method or HTTP version is unsupported.

::Anchor{id="ValidationReason.Singleton"}

### `Singleton`

```silk
Singleton
```

A required field is absent or a singleton field repeats.

::Anchor{id="ValidationReason.Host"}

### `Host`

```silk
Host
```

Host is not a valid HTTP authority.

::Anchor{id="ValidationReason.Tokens"}

### `Tokens`

```silk
Tokens
```

A comma-token field has invalid syntax or lacks a required token.

::Anchor{id="ValidationReason.ConnectionClose"}

### `ConnectionClose`

```silk
ConnectionClose
```

Connection explicitly requests closure.

::Anchor{id="ValidationReason.Version"}

### `Version`

```silk
Version
```

The version field has invalid decimal syntax.

::Anchor{id="ValidationReason.Key"}

### `Key`

```silk
Key
```

The key is not canonical padded Base64 for sixteen bytes.

::Anchor{id="ValidationReason.Body"}

### `Body`

```silk
Body
```

Request framing permits a nonempty body.

::Anchor{id="ValidationReason.Expect"}

### `Expect`

```silk
Expect
```

An Expect field is present.

::Anchor{id="ValidationReason.Origin"}

### `Origin`

```silk
Origin
```

Origin is not one serialized HTTP(S) origin or null.

::Anchor{id="ValidationReason.DuplicateProtocol"}

### `DuplicateProtocol`

```silk
DuplicateProtocol
```

A subprotocol token occurs more than once.

::Anchor{id="ValidationReason.Extensions"}

### `Extensions`

```silk
Extensions
```

The extension field grammar is malformed.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The finite budget that rejected the handshake.

::Anchor{id="LimitKind.Protocols"}

### `Protocols`

```silk
Protocols
```

Too many offered protocols.

::Anchor{id="LimitKind.ProtocolBytes"}

### `ProtocolBytes`

```silk
ProtocolBytes
```

An offered protocol is too long.

::Anchor{id="LimitKind.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

Extension fields exceed their aggregate budget.

::Anchor{id="LimitKind.ResponseBytes"}

### `ResponseBytes`

```silk
ResponseBytes
```

Serialized response bytes exceed the budget.

::Anchor{id="LimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

Owned capacities exceed the budget.

::Anchor{id="LimitKind.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked size arithmetic overflowed.

::Anchor{id="DecisionReason"}

## `DecisionReason`

```silk
pub enum DecisionReason
```

The application decision rule that failed before output.

::Anchor{id="DecisionReason.Protocol"}

### `Protocol`

```silk
Protocol
```

The selected protocol is not exactly one offered token.

::Anchor{id="DecisionReason.Header"}

### `Header`

```silk
Header
```

An extra response field overrides a generated or framing field.

::Anchor{id="DecisionReason.Status"}

### `Status`

```silk
Status
```

Application rejection must use a final response status.

::Anchor{id="UpgradeError"}

## `UpgradeError`

```silk
pub union UpgradeError
```

A typed inspection or decision failure. No variant writes a response by itself.

::Anchor{id="UpgradeError.Validation"}

### `Validation`

```silk
Validation
```

Peer metadata violates the selected WebSocket handshake profile.

::Anchor{id="UpgradeError.Validation.reason"}

#### Field `reason`

```silk
pub reason: ValidationReason
```

The failed peer-input rule.

::Anchor{id="UpgradeError.UnsupportedVersion"}

### `UnsupportedVersion`

```silk
UnsupportedVersion
```

A well-formed version is unsupported; the server supports version 13.

::Anchor{id="UpgradeError.UnsupportedVersion.supported"}

#### Field `supported`

```silk
pub supported: u16
```

The supported protocol version, always 13.

::Anchor{id="UpgradeError.Limit"}

### `Limit`

```silk
Limit
```

A finite budget or checked size operation failed.

::Anchor{id="UpgradeError.Limit.kind"}

#### Field `kind`

```silk
pub kind: LimitKind
```

The exceeded budget or overflow category.

::Anchor{id="UpgradeError.InvalidDecision"}

### `InvalidDecision`

```silk
InvalidDecision
```

Application acceptance cannot be serialized as a valid handshake.

::Anchor{id="UpgradeError.InvalidDecision.reason"}

#### Field `reason`

```silk
pub reason: DecisionReason
```

The failed application decision rule.

::Anchor{id="UpgradeError.UnsupportedNegotiation"}

### `UnsupportedNegotiation`

```silk
UnsupportedNegotiation
```

Application acceptance requested an unimplemented extension.

::Anchor{id="UpgradeError.Value"}

### `Value`

```silk
Value
```

Shared HTTP value validation rejected response metadata.

::Anchor{id="UpgradeError.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The original structured HTTP value failure.

::Anchor{id="Offer"}

## `Offer`

```silk
pub struct Offer<'head>
```

Validated metadata that borrows one parsed request and cannot authorize another request.

::Anchor{id="Offer.impl"}

## Implementation `Offer<'head>`

```silk
impl<'head> Offer<'head>
```

::Anchor{id="Offer.impl.target"}

### Method `target`

```silk
pub fn target(self: &Self) -> RequestTarget<'head>
```

Returns the request target borrowed from the parsed head.

::Anchor{id="Offer.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> &'head [u8]
```

Returns the validated Host field bytes.

::Anchor{id="Offer.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Option<&'head [u8]>
```

Returns absent Origin or its exact validated bytes, including literal null.

::Anchor{id="Offer.impl.protocolCount"}

### Method `protocolCount`

```silk
pub fn protocolCount(self: &Self) -> usize
```

Returns the number of unique protocols in combined wire order.

::Anchor{id="Offer.impl.protocolAt"}

### Method `protocolAt`

```silk
pub fn protocolAt(self: &Self, index: usize) -> Option<&'head [u8]>
```

Returns one protocol by combined wire index, or None for an absent index.

::Anchor{id="Offer.impl.extensionsPresent"}

### Method `extensionsPresent`

```silk
pub fn extensionsPresent(self: &Self) -> bool
```

Returns whether at least one syntactically valid extension field was supplied.

::Anchor{id="Offer.impl.acceptInto"}

### Method `acceptInto`

```silk
pub fn acceptInto(self: &Self, output: &mut [u8]) -> Result<usize, UpgradeError>
```

Writes the 28-byte accept value into caller storage without allocation.

::Anchor{id="acceptInto"}

## `acceptInto`

```silk
pub fn acceptInto(key: &[u8], output: &mut [u8]) -> Result<usize, UpgradeError>
```

Validates a canonical sixteen-byte WebSocket key and writes its 28-byte accept value.

### Details

This pure transformation trims outer HTTP OWS and hashes the original encoded key. It does not
authorize an upgrade. Invalid input or insufficient output capacity leaves output unchanged.

::Anchor{id="Outcome"}

## `Outcome`

```silk
pub union Outcome<A>
```

The completed handshake outcome, including ordinary application rejection.

::Anchor{id="Outcome.Upgraded"}

### `Upgraded`

```silk
Upgraded
```

The upgraded channel callback completed successfully.

::Anchor{id="Outcome.Upgraded.value"}

#### Field `value`

```silk
pub value: A
```

The callback's result.

::Anchor{id="Outcome.Rejected"}

### `Rejected`

```silk
Rejected
```

The application rejection was sent as an ordinary HTTP response.

::Anchor{id="Outcome.Rejected.status"}

#### Field `status`

```silk
pub status: u16
```

The sent HTTP status code.

::Anchor{id="Decision"}

## `Decision`

```silk
pub union Decision<'value>
```

An explicit application decision whose values borrow the scoped policy or request offer.

::Anchor{id="Decision.Accept"}

### `Accept`

```silk
Accept
```

Accepts an optional offered protocol and ordinary response headers. Extensions must be false.

::Anchor{id="Decision.Accept.protocol"}

#### Field `protocol`

```silk
pub protocol: Option<string<'value>>
```

No protocol, or exactly one case-sensitive offered token.

::Anchor{id="Decision.Accept.headers"}

#### Field `headers`

```silk
pub headers: Option<Headers<'value>>
```

Validated extra fields; repeated ordinary fields remain in order.

::Anchor{id="Decision.Accept.extensions"}

#### Field `extensions`

```silk
pub extensions: bool
```

Requests extension negotiation. True fails with UnsupportedNegotiation.

::Anchor{id="Decision.Reject"}

### `Reject`

```silk
Reject
```

Sends an ordinary final body-free rejection and does not lend the channel.

::Anchor{id="Decision.Reject.status"}

#### Field `status`

```silk
pub status: Status
```

The application-selected final HTTP status.

::Anchor{id="Decision.Reject.headers"}

#### Field `headers`

```silk
pub headers: Option<Headers<'value>>
```

Optional ordinary response fields, including authentication headers.

::Anchor{id="DecisionHandler"}

## `DecisionHandler`

```silk
pub interface DecisionHandler<D, ?R>
```

A compile-time policy that makes one explicit decision from a scoped request offer.

::Anchor{id="DecisionHandler.decide"}

### Operation `decide`

```silk
effect<'call> fn decide<'call, 'head: 'call>(handler: &'call Self, offer: &'call Offer<'head>) -> Decision<
    'call,
  > ! D ? R
```

Borrows policy and offer data for one decision and preserves failure and requirement channels.

::Anchor{id="inspect"}

## `inspect`

```silk
pub fn inspect<'head>(head: &RequestHead<'head>, limits: Limits) -> Result<
  Offer<'head>,
  UpgradeError,
>
```

Validates one borrowed parsed request without allocation or ambient services.

::Anchor{id="rejectionStatus"}

## `rejectionStatus`

```silk
pub fn rejectionStatus(error: &UpgradeError) -> u16
```

Returns the default rejection status without writing: 417 for Expect, 426 for version, otherwise 400.

::Anchor{id="withUpgrade"}

## `withUpgrade`

```silk
pub effect<'env> fn withUpgrade<
  'loan,
  'request: 'loan,
  'connection: 'request,
  'transport: 'connection,
  'callback,
  A,
  D,
  E,
  ?DecisionRequirements,
  ?CallbackRequirements,
  P,
  H: DecisionHandler<D ? DecisionRequirements> + 'env,
  'env,
>(
  request: &'loan mut Request<'request, 'connection, 'transport, P>,
  limits: Limits,
  deadline: Option<Instant>,
  handler: H,
  use: for<'call, 'transportView: 'call> once fn<'callback>(
    &'call mut BufferedDuplex<'transportView, P>,
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> Outcome<A>
! D | E | UpgradeError | ServerError | OutOfMemoryError
? DecisionRequirements | CallbackRequirements | &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Runs explicit acceptance and lends the existing channel only after the complete 101 flush.

### Details

The decision borrows the policy or current offer. The operation copies its response before
the HTTP handoff, so borrowed metadata cannot escape the handshake.
Rejected retains the sent application status. Errors before output leave HTTP active.
Use the same absolute deadline for the enclosing HTTP request acquisition.

### Gotchas

After switching output starts, transport failure is terminal. The enclosing server scope keeps
its close authority armed. This operation provides no frame or native TLS server implementation.

::Anchor{id="reject"}

## `reject`

```silk
pub effect fn reject<'loan, 'request: 'loan, 'connection: 'request, 'transport: 'connection, P>(
  request: &'loan mut Request<'request, 'connection, 'transport, P>,
  error: &UpgradeError,
  limits: Limits,
  deadline: Option<Instant>,
) -> ()
! UpgradeError | ServerError | OutOfMemoryError
? &mut Allocator | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Sends the deterministic body-free HTTP rejection for a typed handshake failure.

### Details

UnsupportedVersion sends 426 with Sec-WebSocket-Version: 13. Expect sends 417; other failures
send 400. This operation is available only before switching output starts.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
