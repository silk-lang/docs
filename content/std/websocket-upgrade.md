The server side of the WebSocket opening handshake (RFC 6455, version 13).

## When to use
In an `silk.http_server` request callback, call [`withUpgrade`](#withUpgrade) with a [`DecisionHandler`](#DecisionHandler). The
handler looks at the [`Offer`](#Offer) and returns a [`Decision`](#Decision): accept, maybe with a subprotocol, or
reject with a status. After an accept, your callback gets the channel for WebSocket frames, for
example through `silk.websocket_server`.

Use [`inspect`](#inspect) and [`acceptInto`](#acceptInto) alone to check a handshake without a server.

## Details
[`inspect`](#inspect) checks a parsed request head. It does not allocate. The request must be an HTTP/1.1
`GET` with a valid `Host`, `Upgrade: websocket`, `Connection: upgrade`, a 16-byte key, version
13, and no body or `Expect`.

[`withUpgrade`](#withUpgrade) does these steps:
1. It calls [`inspect`](#inspect). If it fails, nothing is sent and the request stays active, so you can
   call [`reject`](#reject).
2. It calls the [`DecisionHandler`](#DecisionHandler). The decision is checked before any output.
3. For `Reject`, it sends that status. For `Accept`, it sends 101 with the accept value and the
   protocol, flushes it, and lends the channel to your callback.

## Errors
- [`UpgradeError`](#UpgradeError) if the request is not a valid handshake, a limit is exceeded, or the decision
  is not valid. No response was sent.
- `ServerError` from `silk.http_server` if the output fails.
- The errors of the decision handler and the callback.

## Gotchas
- `Origin` is only a hint from the browser. It is not authentication. Check it in the decision
  if you need it.
- Extensions such as `permessage-deflate` are not supported. Offers are ignored, and an `Accept`
  with `extensions: true` fails with `UnsupportedNegotiation`.
- This module does only the handshake. It does not read or write frames.

## Examples
### Inspect a handshake
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http_head {
  Limits as HeadLimits,
  ParseError,
  ParsedRequest,
  RequestHead,
  RequestParser,
  parseRequest
}
import silk.http_headers { Limits as ValueLimits }
import silk.option { Option }
import silk.result { Result }
import silk.websocket_upgrade { Limits, Offer, UpgradeError, acceptInto, inspect, rejectionStatus }

fn headLimits() -> HeadLimits {
  return HeadLimits {
    maxHeadBytes: 4096,
    maxStartLineBytes: 1024,
    maxFieldLineBytes: 1024,
    maxOwnedBytes: 8192,
    values: ValueLimits {
      maxMethodBytes: 16,
      maxTargetBytes: 1024,
      maxNameBytes: 64,
      maxValueBytes: 1024,
      maxFields: 32,
      maxFieldBytes: 4096,
      maxOwnedBytes: 8192,
    },
  }
}

fn equal(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length {
    return false
  }
  let mut index: usize = 0
  while index < left.length {
    if left[index] != right[index] {
      return false
    }
    index = index + 1
  }
  return true
}

effect fn program() -> i32
  ! OutOfMemoryError
  ? &mut Allocator {
  // The sample handshake from RFC 6455.
  let wire = b"GET /chat HTTP/1.1\r\nHost: server.example.com\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Protocol: chat, superchat\r\nSec-WebSocket-Version: 13\r\n\r\n"
  let parsed = match move run parseRequest(&wire, headLimits()) {
    Result<ParsedRequest, ParseError>.Success { value } => move value
    Result<ParsedRequest, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let head = match RequestParser.head(&parsed.parser) {
    Result<RequestHead, ParseError>.Success { value } => value
    Result<RequestHead, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let offer = match move inspect(&head, Limits.defaults()) {
    Result<Offer, UpgradeError>.Success { value } => move value
    Result<Offer, UpgradeError>.Failure { error: _ } => {
      return 1
    }
  }
  if offer.protocolCount() != 2 {
    return 1
  }
  let first = match offer.protocolAt(0) {
    Option.Some { value } => value
    Option.None => {
      return 1
    }
  }
  if !equal(first, b"chat") {
    return 1
  }
  let mut accept: [u8; 28] = [0; 28]
  let written = match move offer.acceptInto(&mut accept) {
    Result<usize, UpgradeError>.Success { value } => value
    Result<usize, UpgradeError>.Failure { error: _ } => {
      return 1
    }
  }
  if written != 28 || !equal(&accept, b"s3pPLMBiTxaQ9kYGzzhZRbK+xOo=") {
    return 1
  }

  // The same value, from the key alone.
  let mut again: [u8; 28] = [0; 28]
  let direct = match move acceptInto(b"dGhlIHNhbXBsZSBub25jZQ==", &mut again) {
    Result<usize, UpgradeError>.Success { value } => value
    Result<usize, UpgradeError>.Failure { error: _ } => {
      return 1
    }
  }
  if direct != 28 || !equal(&again, &accept) {
    return 1
  }

  // An old protocol version fails. `reject` would answer with 426.
  let old = b"GET /chat HTTP/1.1\r\nHost: server.example.com\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 8\r\n\r\n"
  let oldParsed = match move run parseRequest(&old, headLimits()) {
    Result<ParsedRequest, ParseError>.Success { value } => move value
    Result<ParsedRequest, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let oldHead = match RequestParser.head(&oldParsed.parser) {
    Result<RequestHead, ParseError>.Success { value } => value
    Result<RequestHead, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  return match move inspect(&oldHead, Limits.defaults()) {
    Result<Offer, UpgradeError>.Success { value: _ } => 1
    Result<Offer, UpgradeError>.Failure { error } => {
      if rejectionStatus(&error) != 426 {
        return 1
      }
      return 0
    }
  }
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `WebSocketUpgrade` with `import silk.websocket_upgrade as WebSocketUpgrade`.

Public declarations: 14.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The limits of a handshake. A zero limit allows none of that resource.

::Anchor{id="Limits.maxProtocols"}

### Field `maxProtocols`

```silk
pub maxProtocols: usize
```

The maximum number of offered subprotocols, in all `Sec-WebSocket-Protocol` fields.

::Anchor{id="Limits.maxProtocolBytes"}

### Field `maxProtocolBytes`

```silk
pub maxProtocolBytes: usize
```

The maximum length of one offered subprotocol.

::Anchor{id="Limits.maxExtensionBytes"}

### Field `maxExtensionBytes`

```silk
pub maxExtensionBytes: usize
```

The maximum total length of the `Sec-WebSocket-Extensions` values.

::Anchor{id="Limits.maxResponseBytes"}

### Field `maxResponseBytes`

```silk
pub maxResponseBytes: usize
```

The maximum size of the response head, with the fields that are added.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

The maximum memory for the response.

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

::Anchor{id="Limits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> Limits
```

Returns the default limits: 32 protocols, 128 bytes for each protocol, 4096 extension bytes,
8192 response bytes, and 16384 owned bytes.

::Anchor{id="ValidationReason"}

## `ValidationReason`

```silk
pub enum ValidationReason
```

The rule of the request that failed.

::Anchor{id="ValidationReason.Request"}

### `Request`

```silk
Request
```

The method is not `GET`, or the version is not HTTP/1.1.

::Anchor{id="ValidationReason.Singleton"}

### `Singleton`

```silk
Singleton
```

A required field is missing, or a field that is allowed one time occurs more.

::Anchor{id="ValidationReason.Host"}

### `Host`

```silk
Host
```

`Host` is not a valid authority.

::Anchor{id="ValidationReason.Tokens"}

### `Tokens`

```silk
Tokens
```

`Upgrade` or `Connection` is not a valid token list, or does not have `websocket` or
`upgrade`.

::Anchor{id="ValidationReason.ConnectionClose"}

### `ConnectionClose`

```silk
ConnectionClose
```

`Connection` has `close`.

::Anchor{id="ValidationReason.Version"}

### `Version`

```silk
Version
```

`Sec-WebSocket-Version` is not a decimal number.

::Anchor{id="ValidationReason.Key"}

### `Key`

```silk
Key
```

`Sec-WebSocket-Key` is not 16 bytes in canonical padded Base64.

::Anchor{id="ValidationReason.Body"}

### `Body`

```silk
Body
```

The request can have a body.

::Anchor{id="ValidationReason.Expect"}

### `Expect`

```silk
Expect
```

The request has `Expect`.

::Anchor{id="ValidationReason.Origin"}

### `Origin`

```silk
Origin
```

`Origin` is not one HTTP or HTTPS origin, or `null`.

::Anchor{id="ValidationReason.DuplicateProtocol"}

### `DuplicateProtocol`

```silk
DuplicateProtocol
```

A subprotocol is offered two times.

::Anchor{id="ValidationReason.Extensions"}

### `Extensions`

```silk
Extensions
```

`Sec-WebSocket-Extensions` is not valid.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The limit that was exceeded.

::Anchor{id="LimitKind.Protocols"}

### `Protocols`

```silk
Protocols
```

Too many subprotocols.

::Anchor{id="LimitKind.ProtocolBytes"}

### `ProtocolBytes`

```silk
ProtocolBytes
```

A subprotocol is too long.

::Anchor{id="LimitKind.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

The extension fields are too long.

::Anchor{id="LimitKind.ResponseBytes"}

### `ResponseBytes`

```silk
ResponseBytes
```

The response head is too large.

::Anchor{id="LimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

The response needs too much memory.

::Anchor{id="LimitKind.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size does not fit in `usize`.

::Anchor{id="DecisionReason"}

## `DecisionReason`

```silk
pub enum DecisionReason
```

The rule of the decision that failed.

::Anchor{id="DecisionReason.Protocol"}

### `Protocol`

```silk
Protocol
```

The selected protocol is not one of the offered protocols. The compare is case-sensitive.

::Anchor{id="DecisionReason.Header"}

### `Header`

```silk
Header
```

An extra header replaces a field that the handshake sets, such as `Sec-WebSocket-Protocol` or
`Content-Length`.

::Anchor{id="DecisionReason.Status"}

### `Status`

```silk
Status
```

A `Reject` status is less than 200.

::Anchor{id="UpgradeError"}

## `UpgradeError`

```silk
pub union UpgradeError
```

The error of a handshake. No error sends a response. Use [`reject`](#reject) to send one.

::Anchor{id="UpgradeError.Validation"}

### `Validation`

```silk
Validation
```

The request is not a valid handshake.

::Anchor{id="UpgradeError.Validation.reason"}

#### Field `reason`

```silk
pub reason: ValidationReason
```

The rule that failed.

::Anchor{id="UpgradeError.UnsupportedVersion"}

### `UnsupportedVersion`

```silk
UnsupportedVersion
```

The request asks for another WebSocket version. [`reject`](#reject) sends 426.

::Anchor{id="UpgradeError.UnsupportedVersion.supported"}

#### Field `supported`

```silk
pub supported: u16
```

The supported version: 13.

::Anchor{id="UpgradeError.Limit"}

### `Limit`

```silk
Limit
```

A limit was exceeded.

::Anchor{id="UpgradeError.Limit.kind"}

#### Field `kind`

```silk
pub kind: LimitKind
```

The limit.

::Anchor{id="UpgradeError.InvalidDecision"}

### `InvalidDecision`

```silk
InvalidDecision
```

The decision cannot make a valid response.

::Anchor{id="UpgradeError.InvalidDecision.reason"}

#### Field `reason`

```silk
pub reason: DecisionReason
```

The rule that failed.

::Anchor{id="UpgradeError.UnsupportedNegotiation"}

### `UnsupportedNegotiation`

```silk
UnsupportedNegotiation
```

The decision asks for extensions, which are not supported.

::Anchor{id="UpgradeError.Value"}

### `Value`

```silk
Value
```

A response value is not valid.

::Anchor{id="UpgradeError.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The value error.

::Anchor{id="Offer"}

## `Offer`

```silk
pub struct Offer<'head>
```

A valid handshake request, from [`inspect`](#inspect). It borrows the request head.

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

Returns the request target, such as `/chat`.

::Anchor{id="Offer.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> &'head [u8]
```

Returns the value of `Host`.

::Anchor{id="Offer.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Option<&'head [u8]>
```

Returns the value of `Origin`, or `None` if there is none. The value can be `null`.

::Anchor{id="Offer.impl.protocolCount"}

### Method `protocolCount`

```silk
pub fn protocolCount(self: &Self) -> usize
```

Returns the number of offered subprotocols.

::Anchor{id="Offer.impl.protocolAt"}

### Method `protocolAt`

```silk
pub fn protocolAt(self: &Self, index: usize) -> Option<&'head [u8]>
```

Returns the offered subprotocol at `index`, in the order of the request, or `None`.

::Anchor{id="Offer.impl.extensionsPresent"}

### Method `extensionsPresent`

```silk
pub fn extensionsPresent(self: &Self) -> bool
```

Returns whether the request offers extensions. They are ignored.

::Anchor{id="Offer.impl.acceptInto"}

### Method `acceptInto`

```silk
pub fn acceptInto(self: &Self, output: &mut [u8]) -> Result<usize, UpgradeError>
```

Writes the 28-byte `Sec-WebSocket-Accept` value for the key to `output`, and returns 28.

#### Errors
`Limit` with `ResponseBytes` if `output` is shorter than 28 bytes.

::Anchor{id="acceptInto"}

## `acceptInto`

```silk
pub fn acceptInto(key: &[u8], output: &mut [u8]) -> Result<usize, UpgradeError>
```

Writes the 28-byte `Sec-WebSocket-Accept` value for `key` to `output`, and returns 28.

### Details
It removes spaces and tabs around `key` first. It does not check the rest of the handshake. If
it fails, `output` is not changed.

### Errors
- `Validation` with `Key` if `key` is not 16 bytes in canonical padded Base64.
- `Limit` with `ResponseBytes` if `output` is shorter than 28 bytes.

::Anchor{id="Outcome"}

## `Outcome`

```silk
pub union Outcome<A>
```

The result of [`withUpgrade`](#withUpgrade).

::Anchor{id="Outcome.Upgraded"}

### `Upgraded`

```silk
Upgraded
```

The 101 response was sent, and the callback finished.

::Anchor{id="Outcome.Upgraded.value"}

#### Field `value`

```silk
pub value: A
```

The value of the callback.

::Anchor{id="Outcome.Rejected"}

### `Rejected`

```silk
Rejected
```

The decision was `Reject`, and its response was sent.

::Anchor{id="Outcome.Rejected.status"}

#### Field `status`

```silk
pub status: u16
```

The status that was sent.

::Anchor{id="Decision"}

## `Decision`

```silk
pub union Decision<'value>
```

The answer of a [`DecisionHandler`](#DecisionHandler).

::Anchor{id="Decision.Accept"}

### `Accept`

```silk
Accept
```

Accepts the handshake.

::Anchor{id="Decision.Accept.protocol"}

#### Field `protocol`

```silk
pub protocol: Option<string<'value>>
```

The selected subprotocol, or `None`. It must be one of the offered protocols, with the same
case.

::Anchor{id="Decision.Accept.headers"}

#### Field `headers`

```silk
pub headers: Option<Headers<'value>>
```

More fields for the response, such as `Set-Cookie`. They cannot replace the fields of the
handshake.

::Anchor{id="Decision.Accept.extensions"}

#### Field `extensions`

```silk
pub extensions: bool
```

Set it to false. True fails with `UnsupportedNegotiation`.

::Anchor{id="Decision.Reject"}

### `Reject`

```silk
Reject
```

Rejects the handshake with a normal HTTP response with no body.

::Anchor{id="Decision.Reject.status"}

#### Field `status`

```silk
pub status: Status
```

The status, 200 or more. For example, 403.

::Anchor{id="Decision.Reject.headers"}

#### Field `headers`

```silk
pub headers: Option<Headers<'value>>
```

More fields for the response, such as `WWW-Authenticate`.

::Anchor{id="DecisionHandler"}

## `DecisionHandler`

```silk
pub interface DecisionHandler<D, ?R>
```

Decides if a WebSocket handshake is accepted. [`withUpgrade`](#withUpgrade) calls it with the [`Offer`](#Offer) after
the request passed [`inspect`](#inspect), and checks the [`Decision`](#Decision) before any output.

### Gotchas
`Origin` is only a hint from the browser. It is not authentication. Check it in the decision if
you need it. Extensions such as `permessage-deflate` are not supported, so an `Accept` with
`extensions: true` fails with `UnsupportedNegotiation`.

::Anchor{id="DecisionHandler.decide"}

### Operation `decide`

```silk
effect<'call> fn decide<'call, 'head: 'call>(handler: &'call Self, offer: &'call Offer<'head>) -> Decision<
    'call,
  > ! D ? R
```

Returns the [`Decision`](#Decision) for `offer`. The decision can borrow from the handler or the offer.

::Anchor{id="inspect"}

## `inspect`

```silk
pub fn inspect<'head>(head: &RequestHead<'head>, limits: Limits) -> Result<
  Offer<'head>,
  UpgradeError,
>
```

Checks that `head` is a valid WebSocket handshake, and returns its [`Offer`](#Offer).

It does not allocate or use services.

### Errors
- `Validation` if a rule fails. The reason tells which.
- `UnsupportedVersion` if the version is a number other than 13.
- `Limit` if the subprotocols or extensions exceed `limits`.

::Anchor{id="rejectionStatus"}

## `rejectionStatus`

```silk
pub fn rejectionStatus(error: &UpgradeError) -> u16
```

Returns the status that [`reject`](#reject) sends for `error`: 417 for `Expect`, 426 for a version, and
400 for all others.

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

Checks the handshake, asks `handler`, and sends the response. After an accept, it lends the
channel to `use`.

### Details
The handler gets the [`Offer`](#Offer). The response is made and checked before any output, so the
decision can borrow from the offer. The channel keeps any bytes that the client sent after the
request head. Give the same deadline that you used for the request.

### Errors
- [`UpgradeError`](#UpgradeError) before any output. The request is still active, so you can call [`reject`](#reject).
- `ServerError` if the output fails.
- The errors of the handler and of `use`.

### Gotchas
After the 101 response starts, a transport error ends the connection. This function does not
read or write frames, and does not do TLS.

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

Sends the response for a handshake error, with no body.

### Details
It sends the status of [`rejectionStatus`](#rejectionStatus). For `UnsupportedVersion`, it also sends
`Sec-WebSocket-Version: 13`. Call it only before a 101 response starts.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
