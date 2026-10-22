Bounded server WebSocket messages over one validated upgraded HTTP channel.

## When to use

Use [`withServer`](#withServer) after `silk.websocket_upgrade.withUpgrade` accepts a request and lends its
exact buffered channel.

## Details

The actor accepts final, unfragmented client frames with mandatory masking. It validates one
complete event at a time and writes final unmasked server frames. The scoped session owns all
frame ordering and closes the upgraded channel when its callback ends.

## Gotchas

This actor does not implement continuation frames, extensions, compression, a listener, or TLS
server acquisition. Unsupported fragmentation closes with code `1003` when a finite deadline
permits that response.

Import as `WebSocketServer` with `import silk.websocket_server as WebSocketServer`.

Public declarations: 25.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Finite message and close-handshake limits for one server session.

::Anchor{id="Limits.maxMessageBytes"}

### Field `maxMessageBytes`

```silk
pub maxMessageBytes: usize
```

The maximum payload bytes in one Text or Binary frame.

::Anchor{id="Limits.maxCloseFrames"}

### Field `maxCloseFrames`

```silk
pub maxCloseFrames: usize
```

The maximum peer frames accepted by one [`finishClose`](#finishClose) call.

::Anchor{id="Limits.maxCloseBytes"}

### Field `maxCloseBytes`

```silk
pub maxCloseBytes: usize
```

The maximum aggregate peer frame bytes accepted by one [`finishClose`](#finishClose) call.

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

Returns limits for 65,536-byte messages, 32 close frames, and 65,536 close bytes.

::Anchor{id="Limits.impl.make"}

### Associated function `make`

```silk
pub fn make(
    maxMessageBytes: usize,
    maxCloseFrames: usize,
    maxCloseBytes: usize,
  ) -> Result<Limits, WebSocketError>
```

Validates and returns finite positive session limits.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The finite limit or arithmetic rule that rejected session construction.

::Anchor{id="LimitKind.MessageBytes"}

### `MessageBytes`

```silk
MessageBytes
```

The message-byte limit is zero.

::Anchor{id="LimitKind.CloseFrames"}

### `CloseFrames`

```silk
CloseFrames
```

The close-frame limit is zero.

::Anchor{id="LimitKind.CloseBytes"}

### `CloseBytes`

```silk
CloseBytes
```

The close-byte limit is zero.

::Anchor{id="LimitKind.Arithmetic"}

### `Arithmetic`

```silk
Arithmetic
```

Checked size arithmetic cannot represent a required value.

::Anchor{id="State"}

## `State`

```silk
pub enum State
```

The externally visible lifecycle state of one session.

::Anchor{id="State.Open"}

### `Open`

```silk
Open
```

The session accepts message, control, and peer Close events.

::Anchor{id="State.CloseSent"}

### `CloseSent`

```silk
CloseSent
```

The server sent one Close and waits for the peer Close.

::Anchor{id="State.Closed"}

### `Closed`

```silk
Closed
```

The close handshake and terminal transport close completed.

::Anchor{id="State.Failed"}

### `Failed`

```silk
Failed
```

A preceding failure made all later frame operations unavailable.

::Anchor{id="Operation"}

## `Operation`

```silk
pub enum Operation
```

The public operation associated with a state or transport failure.

::Anchor{id="Operation.ReadEvent"}

### `ReadEvent`

```silk
ReadEvent
```

Read one peer event.

::Anchor{id="Operation.WriteText"}

### `WriteText`

```silk
WriteText
```

Write one Text frame.

::Anchor{id="Operation.WriteBinary"}

### `WriteBinary`

```silk
WriteBinary
```

Write one Binary frame.

::Anchor{id="Operation.WritePing"}

### `WritePing`

```silk
WritePing
```

Write one Ping frame.

::Anchor{id="Operation.WritePong"}

### `WritePong`

```silk
WritePong
```

Write one Pong frame.

::Anchor{id="Operation.SendClose"}

### `SendClose`

```silk
SendClose
```

Send the local Close frame.

::Anchor{id="Operation.FinishClose"}

### `FinishClose`

```silk
FinishClose
```

Pump peer frames until the close handshake completes.

::Anchor{id="ProtocolReason"}

## `ProtocolReason`

```silk
pub enum ProtocolReason
```

The peer frame rule that selected protocol Close code `1002`.

::Anchor{id="ProtocolReason.MaskRequired"}

### `MaskRequired`

```silk
MaskRequired
```

A client frame does not contain the required mask.

::Anchor{id="ProtocolReason.Rsv"}

### `Rsv`

```silk
Rsv
```

One or more reserved bits are set.

::Anchor{id="ProtocolReason.ReservedOpcode"}

### `ReservedOpcode`

```silk
ReservedOpcode
```

The opcode is reserved by the selected profile.

::Anchor{id="ProtocolReason.NonMinimalLength"}

### `NonMinimalLength`

```silk
NonMinimalLength
```

An extended length uses a longer than necessary encoding.

::Anchor{id="ProtocolReason.LengthHighBit"}

### `LengthHighBit`

```silk
LengthHighBit
```

A 64-bit payload length has its most significant bit set.

::Anchor{id="ProtocolReason.ControlTooLarge"}

### `ControlTooLarge`

```silk
ControlTooLarge
```

A control frame payload exceeds 125 bytes.

::Anchor{id="ProtocolReason.ControlFragmented"}

### `ControlFragmented`

```silk
ControlFragmented
```

A control frame clears FIN and therefore attempts illegal fragmentation.

::Anchor{id="ProtocolReason.ClosePayloadLength"}

### `ClosePayloadLength`

```silk
ClosePayloadLength
```

A Close frame payload has exactly one byte.

::Anchor{id="ProtocolReason.CloseCode"}

### `CloseCode`

```silk
CloseCode
```

A peer Close frame contains a disallowed status code.

::Anchor{id="Utf8Component"}

## `Utf8Component`

```silk
pub enum Utf8Component
```

The text value that failed complete UTF-8 validation.

::Anchor{id="Utf8Component.Text"}

### `Text`

```silk
Text
```

A Text message payload.

::Anchor{id="Utf8Component.CloseReason"}

### `CloseReason`

```silk
CloseReason
```

A Close status reason.

::Anchor{id="CloseDataReason"}

## `CloseDataReason`

```silk
pub enum CloseDataReason
```

The caller Close value rule that rejected construction.

::Anchor{id="CloseDataReason.Code"}

### `Code`

```silk
Code
```

The status code is not permitted for a server Close frame.

::Anchor{id="CloseDataReason.ReasonTooLarge"}

### `ReasonTooLarge`

```silk
ReasonTooLarge
```

The UTF-8 reason contains more than 123 bytes.

::Anchor{id="CloseLimitKind"}

## `CloseLimitKind`

```silk
pub enum CloseLimitKind
```

The aggregate close-handshake budget that was exhausted.

::Anchor{id="CloseLimitKind.Frames"}

### `Frames`

```silk
Frames
```

The peer frame-count budget.

::Anchor{id="CloseLimitKind.Bytes"}

### `Bytes`

```silk
Bytes
```

The aggregate peer wire-byte budget.

::Anchor{id="Failure"}

## `Failure`

```silk
pub enum Failure
```

A copyable classification retained after the first terminal failure.

::Anchor{id="Failure.Protocol"}

### `Protocol`

```silk
Protocol
```

Peer frame syntax violated the protocol.

::Anchor{id="Failure.Fragmentation"}

### `Fragmentation`

```silk
Fragmentation
```

A continuation or nonfinal frame requested unsupported fragmentation.

::Anchor{id="Failure.Utf8"}

### `Utf8`

```silk
Utf8
```

Text or a Close reason was not UTF-8.

::Anchor{id="Failure.MessageLimit"}

### `MessageLimit`

```silk
MessageLimit
```

A data payload exceeded the message policy.

::Anchor{id="Failure.BufferCapacity"}

### `BufferCapacity`

```silk
BufferCapacity
```

A legal data payload exceeded caller storage.

::Anchor{id="Failure.CloseLimit"}

### `CloseLimit`

```silk
CloseLimit
```

A close-handshake aggregate budget was exhausted.

::Anchor{id="Failure.Truncated"}

### `Truncated`

```silk
Truncated
```

The byte stream ended before a complete required frame.

::Anchor{id="Failure.Transport"}

### `Transport`

```silk
Transport
```

Buffered or terminal transport I/O failed.

::Anchor{id="WebSocketError"}

## `WebSocketError`

```silk
pub union WebSocketError
```

A typed WebSocket admission, frame, lifecycle, or transport failure.

::Anchor{id="WebSocketError.InvalidLimits"}

### `InvalidLimits`

```silk
InvalidLimits
```

Session construction rejected a zero finite limit.

::Anchor{id="WebSocketError.InvalidLimits.kind"}

#### Field `kind`

```silk
pub kind: LimitKind
```

The invalid public limit.

::Anchor{id="WebSocketError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The operation is not available in the current lifecycle state.

::Anchor{id="WebSocketError.InvalidState.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The rejected operation.

::Anchor{id="WebSocketError.InvalidState.state"}

#### Field `state`

```silk
pub state: State
```

The state that rejected the operation.

::Anchor{id="WebSocketError.PreviousFailure"}

### `PreviousFailure`

```silk
PreviousFailure
```

A preceding terminal failure prevents more frame I/O.

::Anchor{id="WebSocketError.PreviousFailure.failure"}

#### Field `failure`

```silk
pub failure: Failure
```

The retained copyable classification of the first failure.

::Anchor{id="WebSocketError.BufferTooSmall"}

### `BufferTooSmall`

```silk
BufferTooSmall
```

Caller storage cannot hold one otherwise legal complete data payload.

::Anchor{id="WebSocketError.BufferTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

The complete required payload capacity.

::Anchor{id="WebSocketError.BufferTooSmall.capacity"}

#### Field `capacity`

```silk
pub capacity: usize
```

The supplied output capacity.

::Anchor{id="WebSocketError.MessageTooLarge"}

### `MessageTooLarge`

```silk
MessageTooLarge
```

A peer or caller data payload exceeds the message policy.

::Anchor{id="WebSocketError.MessageTooLarge.length"}

#### Field `length`

```silk
pub length: u64
```

The rejected payload length before narrowing.

::Anchor{id="WebSocketError.MessageTooLarge.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The configured message-byte limit.

::Anchor{id="WebSocketError.UnsupportedFragmentation"}

### `UnsupportedFragmentation`

```silk
UnsupportedFragmentation
```

The frame requests continuation or fragmentation outside this profile.

::Anchor{id="WebSocketError.ProtocolError"}

### `ProtocolError`

```silk
ProtocolError
```

Peer framing violates one exact RFC 6455 protocol rule.

::Anchor{id="WebSocketError.ProtocolError.reason"}

#### Field `reason`

```silk
pub reason: ProtocolReason
```

The rule that rejected the frame.

::Anchor{id="WebSocketError.InvalidCloseData"}

### `InvalidCloseData`

```silk
InvalidCloseData
```

Caller-supplied Close metadata is not valid for server output.

::Anchor{id="WebSocketError.InvalidCloseData.reason"}

#### Field `reason`

```silk
pub reason: CloseDataReason
```

The rejected caller-data rule.

::Anchor{id="WebSocketError.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

A complete peer or caller text value is not UTF-8.

::Anchor{id="WebSocketError.InvalidUtf8.component"}

#### Field `component`

```silk
pub component: Utf8Component
```

The text value that failed validation.

::Anchor{id="WebSocketError.CloseLimitExceeded"}

### `CloseLimitExceeded`

```silk
CloseLimitExceeded
```

One aggregate close-handshake budget is exhausted.

::Anchor{id="WebSocketError.CloseLimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: CloseLimitKind
```

The exhausted budget.

::Anchor{id="WebSocketError.CloseLimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The configured inclusive maximum.

::Anchor{id="WebSocketError.Truncated"}

### `Truncated`

```silk
Truncated
```

The byte stream ended before a complete required frame.

::Anchor{id="WebSocketError.Buffer"}

### `Buffer`

```silk
Buffer
```

Buffered frame I/O failed with exact accepted-prefix coordinates.

::Anchor{id="WebSocketError.Buffer.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The frame operation that failed.

::Anchor{id="WebSocketError.Buffer.frameAccepted"}

#### Field `frameAccepted`

```silk
pub frameAccepted: usize
```

Bytes accepted from the complete frame before this buffered failure.

::Anchor{id="WebSocketError.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The original buffered failure.

::Anchor{id="WebSocketError.Transport"}

### `Transport`

```silk
Transport
```

Terminal channel close failed after one frame operation.

::Anchor{id="WebSocketError.Transport.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The frame operation that required terminal close.

::Anchor{id="WebSocketError.Transport.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The original byte-I/O failure.

::Anchor{id="ControlPayload"}

## `ControlPayload`

```silk
pub struct ControlPayload
```

An owned Ping or Pong payload with at most 125 bytes.

::Anchor{id="ControlPayload.impl"}

## Implementation `ControlPayload`

```silk
impl ControlPayload
```

::Anchor{id="ControlPayload.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice<'payload>(self: &'payload Self) -> &'payload [u8]
```

Borrows the complete copied control payload.

::Anchor{id="CloseReason"}

## `CloseReason`

```silk
pub struct CloseReason
```

An owned validated Close reason with at most 123 UTF-8 bytes.

::Anchor{id="CloseReason.impl"}

## Implementation `CloseReason`

```silk
impl CloseReason
```

::Anchor{id="CloseReason.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice<'reason>(self: &'reason Self) -> &'reason [u8]
```

Borrows the complete copied UTF-8 reason bytes.

::Anchor{id="CloseData"}

## `CloseData`

```silk
pub struct CloseData
```

Owned validated status and reason data for one server Close frame.

::Anchor{id="CloseData.impl"}

## Implementation `CloseData`

```silk
impl CloseData
```

::Anchor{id="CloseData.impl.make"}

### Associated function `make`

```silk
pub fn make(code: u16, reason: &[u8]) -> Result<CloseData, WebSocketError>
```

Validates and copies one server Close status and UTF-8 reason.

#### Details

The operation rejects client-only code `1010`, other disallowed codes, reasons above 123
bytes, and invalid UTF-8 before it publishes owned data.

::Anchor{id="CloseData.impl.code"}

### Method `code`

```silk
pub fn code(self: &Self) -> u16
```

Returns the validated status code.

::Anchor{id="CloseData.impl.reason"}

### Method `reason`

```silk
pub fn reason<'data>(self: &'data Self) -> &'data CloseReason
```

Borrows the owned validated reason.

::Anchor{id="PeerCloseData"}

## `PeerCloseData`

```silk
pub union PeerCloseData
```

Owned peer Close metadata without a synthetic no-status code.

::Anchor{id="PeerCloseData.Absent"}

### `Absent`

```silk
Absent
```

The peer sent an empty Close payload.

::Anchor{id="PeerCloseData.Present"}

### `Present`

```silk
Present
```

The peer sent one validated status and reason.

::Anchor{id="PeerCloseData.Present.code"}

#### Field `code`

```silk
pub code: u16
```

The exact peer status code.

::Anchor{id="PeerCloseData.Present.reason"}

#### Field `reason`

```silk
pub reason: CloseReason
```

The copied validated peer reason.

::Anchor{id="Event"}

## `Event`

```silk
pub union Event
```

One completely validated peer frame event.

::Anchor{id="Event.Text"}

### `Text`

```silk
Text
```

The caller output prefix contains one valid UTF-8 Text payload.

::Anchor{id="Event.Text.count"}

#### Field `count`

```silk
pub count: usize
```

The initialized payload prefix length.

::Anchor{id="Event.Binary"}

### `Binary`

```silk
Binary
```

The caller output prefix contains one Binary payload.

::Anchor{id="Event.Binary.count"}

#### Field `count`

```silk
pub count: usize
```

The initialized payload prefix length.

::Anchor{id="Event.Ping"}

### `Ping`

```silk
Ping
```

One Ping payload was copied after its automatic Pong flushed.

::Anchor{id="Event.Ping.payload"}

#### Field `payload`

```silk
pub payload: ControlPayload
```

The copied Ping payload.

::Anchor{id="Event.Pong"}

### `Pong`

```silk
Pong
```

One Pong payload was copied without a hidden follow-up read.

::Anchor{id="Event.Pong.payload"}

#### Field `payload`

```silk
pub payload: ControlPayload
```

The copied Pong payload.

::Anchor{id="Event.PeerClose"}

### `PeerClose`

```silk
PeerClose
```

The peer Close reply and terminal channel close completed.

::Anchor{id="Event.PeerClose.data"}

#### Field `data`

```silk
pub data: PeerCloseData
```

The exact copied peer Close metadata.

::Anchor{id="ServerWebSocket"}

## `ServerWebSocket`

```silk
pub struct ServerWebSocket<'channel, 'transport, P>
```

One callback-scoped affine server WebSocket over the upgraded buffered channel.

### Details

Callers receive this value only through [`withServer`](#withServer). A returned event never retains a
mutable borrow into this value.

::Anchor{id="state"}

## `state`

```silk
pub fn state<'channel, 'transport, P>(
  socket: &ServerWebSocket<'channel, 'transport, P>,
) -> State
```

Returns the current public lifecycle state without performing I/O.

::Anchor{id="readEvent"}

## `readEvent`

```silk
pub effect fn readEvent<'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  output: &mut [u8],
  deadline: Option<Instant>,
) -> Event
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Reads and validates exactly one peer event.

### Details

Text and Binary bytes are written directly into `output`. If this operation fails after it
modifies a prefix, that prefix is unusable. Ping is published only after its identical Pong
response flushes. Pong is returned without a hidden follow-up read.

### Gotchas

A legal data payload that exceeds `output` closes the session and returns `BufferTooSmall`
without reading the payload. Fragmented messages are not supported.

::Anchor{id="writeText"}

## `writeText`

```silk
pub effect fn writeText<'message, 'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  message: string<'message>,
  deadline: Option<Instant>,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Writes and flushes one final unmasked Text frame.

::Anchor{id="writeBinary"}

## `writeBinary`

```silk
pub effect fn writeBinary<'message, 'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  message: &'message [u8],
  deadline: Option<Instant>,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Writes and flushes one final unmasked Binary frame.

::Anchor{id="writePing"}

## `writePing`

```silk
pub effect fn writePing<'message, 'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  message: &'message [u8],
  deadline: Option<Instant>,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Writes and flushes one final unmasked Ping frame with at most 125 payload bytes.

::Anchor{id="writePong"}

## `writePong`

```silk
pub effect fn writePong<'message, 'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  message: &'message [u8],
  deadline: Option<Instant>,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Writes and flushes one final unmasked Pong frame with at most 125 payload bytes.

::Anchor{id="sendClose"}

## `sendClose`

```silk
pub effect fn sendClose<'close, 'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  data: Option<&'close CloseData>,
  deadline: Option<Instant>,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Sends and flushes the local Close frame once.

### Details

`Open` sends the supplied validated status and reason, or an empty payload for `None`, then
enters `CloseSent`. Repeated calls in `CloseSent` or `Closed` succeed locally without inspecting
`data` or writing another byte.

::Anchor{id="finishClose"}

## `finishClose`

```silk
pub effect fn finishClose<'channel, 'transport, P>(
  socket: &mut ServerWebSocket<'channel, 'transport, P>,
  deadline: Instant,
) -> ()
! WebSocketError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Pumps a bounded peer close handshake until a valid peer Close arrives.

### Details

The caller supplies one absolute deadline. The same mark is passed unchanged to every partial
read, automatic Pong write, and flush and is checked before the first frame and between frames.
Data frames are validated and discarded without publication; controls remain observable only
through their required protocol effects.

### Gotchas

This operation is available only after [`sendClose`](#sendClose). Both configured aggregate limits include
complete inbound wire bytes: header, extended length, mask, and payload.

::Anchor{id="withServer"}

## `withServer`

```silk
pub effect fn withServer<
  'callback,
  'channel,
  'transport: 'channel,
  A,
  E,
  ?R,
  P,
>(
  channel: &'channel mut BufferedDuplex<'transport, P>,
  limits: Limits,
  use: for<'call, 'channelView: 'call, 'transportView: 'channelView> once fn<'callback>(
    &'call mut ServerWebSocket<'channelView, 'transportView, P>,
  ) -> once Effect<'call; A ! E ? R>,
) -> A
! E | WebSocketError
? R | &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex,
  &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  R in Without<R, ByteDuplex>
```

Lends one affine server WebSocket over the exact upgraded buffered channel.

### Details

Positive limits are validated before the session performs I/O. The higher-ranked callback
cannot retain the session or a channel view. Terminal release runs after callback success,
typed failure, or structured cancellation and never replaces the protected outcome.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
