WebSocket frames (RFC 6455) for clients and servers, without I/O.

## When to use
Use [`Session`](#Session) when you move the bytes yourself, for example in an event loop: give it the
bytes that you read with [`Session.receive`](#Session.impl.receive), and write the bytes that it appends to your output
buffer. For a session over a byte duplex that does the reads and writes, use
`silk.http.websocket_stream`. [`Decoder`](#Decoder) and [`appendFrame`](#appendFrame) are the lower layer, for
programs that handle the protocol rules themselves.

## Details
Both roles use the same code. The only difference is the masking direction: a client masks
every frame with a new 4-byte key, and a server masks none. A [`Session`](#Session) or [`Decoder`](#Decoder) of the
server role fails on an unmasked frame, and one of the client role fails on a masked frame.

[`Session.receive`](#Session.impl.receive) reads frames until one event is complete:
- `Text` and `Binary` give a complete message. Fragmented messages are joined, and Text is
  checked as UTF-8 as it arrives. Get the bytes with [`Session.message`](#Session.impl.message).
- `Ping` was answered: the Pong is in your output buffer.
- `Pong` gives the payload of a Pong.
- `Close` means that the peer sent Close. If you had not sent Close, the answer Close is in your
  output buffer. The session is then `Closed`: write the output, then close the connection.

When a peer frame breaks a rule, [`Session.receive`](#Session.impl.receive) appends a Close with the code of the error
(1002, 1007 or 1009, see [`closeCodeOf`](#closeCodeOf)) to your output, the session becomes `Failed`, and the
call fails. Write the output, then close the connection.

## Errors
[`WebSocketError`](#WebSocketError) tells which rule, limit or state check failed. `OutOfMemoryError` if a
message buffer cannot grow.

## Gotchas
- Extensions such as `permessage-deflate` are not supported. A frame with a reserved bit fails.
- A message is joined in memory, up to `maxMessageBytes`. The buffer grows as frames arrive.
- The mask keys of a client come from a generator seeded by [`Session.make`](#Session.impl.make). Give it a seed
  from `silk.system.random`.

## Examples
### Answer a message from a client
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.http.websocket { Event, Limits, Role, Session, WebSocketError, appendFrame, Opcode }

effect fn program() -> i32 ! WebSocketError | OutOfMemoryError ? &mut Allocator {
  // A masked Text frame "Hi", as a client sends it.
  let mut wire = Bytes.make()
  run appendFrame(&mut wire, Opcode.Text, true, b"Hi", Option<[u8; 4]>.some([1, 2, 3, 4]))

  let mut session = match move Session.make(Role.Server, Limits.defaults(), 0) {
    Result.Success {value} => move value
    Result.Failure {error} => { fail move error }
  }
  let mut output = Bytes.make()
  let received = run session.receive(Bytes.asSlice(&wire), &mut output)
  if received.consumed != Bytes.length(&wire) { return 1 }
  match received.event {
    Option.Some {value: Event.Text {length}} => {
      if length != 2 || session.message()[1] != 105 { return 2 }
    }
    _ => { return 3 }
  }
  // The reply is an unmasked Text frame in `output`.
  run session.sendText("Hello", &mut output)
  if Bytes.length(&output) != 7 { return 4 }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(program(), failed)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `WebSocketCodec` with `import silk.http.websocket as WebSocketCodec`.

Public declarations: 19.

::Anchor{id="Role"}

## `Role`

```silk
pub enum Role
```

The side of a connection.

::Anchor{id="Role.Client"}

### `Client`

```silk
Client
```

The side that opened the connection. It masks its frames.

::Anchor{id="Role.Server"}

### `Server`

```silk
Server
```

The side that accepted the connection. It does not mask its frames.

::Anchor{id="Role.impl.Debug"}

## Implementation `Debug for Role`

```silk
impl Debug for Role
```

::Anchor{id="Role.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Client`.

::Anchor{id="Opcode"}

## `Opcode`

```silk
pub enum Opcode
```

The kind of a frame.

::Anchor{id="Opcode.Continuation"}

### `Continuation`

```silk
Continuation
```

A later fragment of a message (0).

::Anchor{id="Opcode.Text"}

### `Text`

```silk
Text
```

The first frame of a Text message (1).

::Anchor{id="Opcode.Binary"}

### `Binary`

```silk
Binary
```

The first frame of a Binary message (2).

::Anchor{id="Opcode.Close"}

### `Close`

```silk
Close
```

A Close (8).

::Anchor{id="Opcode.Ping"}

### `Ping`

```silk
Ping
```

A Ping (9).

::Anchor{id="Opcode.Pong"}

### `Pong`

```silk
Pong
```

A Pong (10).

::Anchor{id="Opcode.impl.Debug"}

## Implementation `Debug for Opcode`

```silk
impl Debug for Opcode
```

::Anchor{id="Opcode.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Text`.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The limits of a session or decoder.

::Anchor{id="Limits.maxMessageBytes"}

### Field `maxMessageBytes`

```silk
pub maxMessageBytes: usize
```

The maximum length of one message, all fragments together. It is more than zero.

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

Returns the default limits: messages of at most 1048576 bytes.

::Anchor{id="ProtocolReason"}

## `ProtocolReason`

```silk
pub enum ProtocolReason
```

The frame rule that a peer broke. The Close for it has code 1002.

::Anchor{id="ProtocolReason.MaskRequired"}

### `MaskRequired`

```silk
MaskRequired
```

A client frame is not masked.

::Anchor{id="ProtocolReason.MaskForbidden"}

### `MaskForbidden`

```silk
MaskForbidden
```

A server frame is masked.

::Anchor{id="ProtocolReason.Rsv"}

### `Rsv`

```silk
Rsv
```

A reserved bit is set.

::Anchor{id="ProtocolReason.ReservedOpcode"}

### `ReservedOpcode`

```silk
ReservedOpcode
```

The opcode is reserved.

::Anchor{id="ProtocolReason.NonMinimalLength"}

### `NonMinimalLength`

```silk
NonMinimalLength
```

The length uses more bytes than necessary.

::Anchor{id="ProtocolReason.LengthHighBit"}

### `LengthHighBit`

```silk
LengthHighBit
```

The highest bit of a 64-bit length is set.

::Anchor{id="ProtocolReason.ControlTooLarge"}

### `ControlTooLarge`

```silk
ControlTooLarge
```

A control frame has more than 125 bytes.

::Anchor{id="ProtocolReason.ControlFragmented"}

### `ControlFragmented`

```silk
ControlFragmented
```

A control frame is not final.

::Anchor{id="ProtocolReason.UnexpectedContinuation"}

### `UnexpectedContinuation`

```silk
UnexpectedContinuation
```

A Continuation frame came with no message to continue.

::Anchor{id="ProtocolReason.ExpectedContinuation"}

### `ExpectedContinuation`

```silk
ExpectedContinuation
```

A Text or Binary frame came before the last fragment of the previous message.

::Anchor{id="ProtocolReason.ClosePayloadLength"}

### `ClosePayloadLength`

```silk
ClosePayloadLength
```

A Close frame has a payload of exactly one byte.

::Anchor{id="ProtocolReason.CloseCode"}

### `CloseCode`

```silk
CloseCode
```

A Close frame has a code that is not allowed.

::Anchor{id="ProtocolReason.FrameAfterClose"}

### `FrameAfterClose`

```silk
FrameAfterClose
```

A frame came after the Close of the peer.

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

Writes the name of the variant, such as `MaskRequired`.

::Anchor{id="Utf8Component"}

## `Utf8Component`

```silk
pub enum Utf8Component
```

The text that is not valid UTF-8. The Close for it has code 1007.

::Anchor{id="Utf8Component.Text"}

### `Text`

```silk
Text
```

A Text message.

::Anchor{id="Utf8Component.CloseReason"}

### `CloseReason`

```silk
CloseReason
```

The reason of a Close frame.

::Anchor{id="Utf8Component.impl.Debug"}

## Implementation `Debug for Utf8Component`

```silk
impl Debug for Utf8Component
```

::Anchor{id="Utf8Component.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Text`.

::Anchor{id="CloseDataReason"}

## `CloseDataReason`

```silk
pub enum CloseDataReason
```

The rule of [`CloseData.make`](#CloseData.impl.make) that failed.

::Anchor{id="CloseDataReason.Code"}

### `Code`

```silk
Code
```

The code is not allowed in a Close that you send.

::Anchor{id="CloseDataReason.ReasonTooLarge"}

### `ReasonTooLarge`

```silk
ReasonTooLarge
```

The reason has more than 123 bytes.

::Anchor{id="CloseDataReason.impl.Debug"}

## Implementation `Debug for CloseDataReason`

```silk
impl Debug for CloseDataReason
```

::Anchor{id="CloseDataReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Code`.

::Anchor{id="State"}

## `State`

```silk
pub enum State
```

The state of a [`Session`](#Session).

::Anchor{id="State.Open"}

### `Open`

```silk
Open
```

Messages can be sent and received.

::Anchor{id="State.CloseSent"}

### `CloseSent`

```silk
CloseSent
```

This side sent Close and waits for the Close of the peer. Frames are still received.

::Anchor{id="State.Closed"}

### `Closed`

```silk
Closed
```

Both sides sent Close. Write the output that is left, then close the connection.

::Anchor{id="State.Failed"}

### `Failed`

```silk
Failed
```

A rule or limit check failed. Write the output that is left, then close the connection.

::Anchor{id="State.impl.Debug"}

## Implementation `Debug for State`

```silk
impl Debug for State
```

::Anchor{id="State.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Open`.

::Anchor{id="WebSocketError"}

## `WebSocketError`

```silk
pub union WebSocketError
```

The error of a WebSocket operation.

### Details
[`closeCodeOf`](#closeCodeOf) gives the Close code that a peer error gets: 1002 for `ProtocolError`, 1007 for
`InvalidUtf8`, and 1009 for `MessageTooLarge`.

::Anchor{id="WebSocketError.InvalidLimits"}

### `InvalidLimits`

```silk
InvalidLimits
```

`maxMessageBytes` is zero.

::Anchor{id="WebSocketError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The operation is not allowed in the state of the session.

::Anchor{id="WebSocketError.InvalidState.state"}

#### Field `state`

```silk
pub state: State
```

The state.

::Anchor{id="WebSocketError.PreviousFailure"}

### `PreviousFailure`

```silk
PreviousFailure
```

An earlier error ended the session or decoder.

::Anchor{id="WebSocketError.MessageTooLarge"}

### `MessageTooLarge`

```silk
MessageTooLarge
```

A message is longer than `maxMessageBytes`.

::Anchor{id="WebSocketError.MessageTooLarge.length"}

#### Field `length`

```silk
pub length: u64
```

The length of the message so far, with the frame that broke the limit.

::Anchor{id="WebSocketError.MessageTooLarge.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of `maxMessageBytes`.

::Anchor{id="WebSocketError.ProtocolError"}

### `ProtocolError`

```silk
ProtocolError
```

A peer frame broke a rule of RFC 6455.

::Anchor{id="WebSocketError.ProtocolError.reason"}

#### Field `reason`

```silk
pub reason: ProtocolReason
```

The rule.

::Anchor{id="WebSocketError.InvalidCloseData"}

### `InvalidCloseData`

```silk
InvalidCloseData
```

The Close data that you gave is not valid.

::Anchor{id="WebSocketError.InvalidCloseData.reason"}

#### Field `reason`

```silk
pub reason: CloseDataReason
```

The rule.

::Anchor{id="WebSocketError.InvalidUtf8"}

### `InvalidUtf8`

```silk
InvalidUtf8
```

Text is not valid UTF-8.

::Anchor{id="WebSocketError.InvalidUtf8.component"}

#### Field `component`

```silk
pub component: Utf8Component
```

The text that failed.

::Anchor{id="WebSocketError.ControlPayloadTooLarge"}

### `ControlPayloadTooLarge`

```silk
ControlPayloadTooLarge
```

A Ping or Pong payload that you gave has more than 125 bytes.

::Anchor{id="WebSocketError.ControlPayloadTooLarge.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the payload.

::Anchor{id="WebSocketError.FragmentOrder"}

### `FragmentOrder`

```silk
FragmentOrder
```

A fragment does not continue the message that you are sending, or a message starts before the
last fragment of the previous one.

::Anchor{id="WebSocketError.impl.Copy"}

## Implementation `Copy for WebSocketError`

```silk
impl Copy for WebSocketError
```

::Anchor{id="WebSocketError.impl.Debug"}

## Implementation `Debug for WebSocketError`

```silk
impl Debug for WebSocketError
```

::Anchor{id="WebSocketError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the variant and its fields, such as
`MessageTooLarge { length: 70000, allowed: 65536 }`.

::Anchor{id="closeCodeOf"}

## `closeCodeOf`

```silk
pub fn closeCodeOf(error: &WebSocketError) -> u16
```

Returns the Close code for a peer error: 1002 for `ProtocolError`, 1007 for `InvalidUtf8`,
1009 for `MessageTooLarge`, and 1011 for any other error.

::Anchor{id="ControlPayload"}

## `ControlPayload`

```silk
pub struct ControlPayload
```

The payload of a Ping or Pong, at most 125 bytes.

::Anchor{id="ControlPayload.impl.Copy"}

## Implementation `Copy for ControlPayload`

```silk
impl Copy for ControlPayload
```

::Anchor{id="ControlPayload.impl"}

## Implementation `ControlPayload`

```silk
impl ControlPayload
```

::Anchor{id="ControlPayload.impl.make"}

### Associated function `make`

```silk
pub fn make(bytes: &[u8]) -> Result<ControlPayload, WebSocketError>
```

Returns a copy of `bytes` as a payload.

#### Errors
`ControlPayloadTooLarge` if `bytes` has more than 125 bytes.

::Anchor{id="ControlPayload.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice<'payload>(self: &'payload Self) -> &'payload [u8]
```

Returns the payload bytes.

::Anchor{id="CloseReason"}

## `CloseReason`

```silk
pub struct CloseReason
```

The reason of a Close frame: valid UTF-8, at most 123 bytes.

::Anchor{id="CloseReason.impl.Copy"}

## Implementation `Copy for CloseReason`

```silk
impl Copy for CloseReason
```

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

Returns the reason bytes. They are valid UTF-8.

::Anchor{id="CloseData"}

## `CloseData`

```silk
pub struct CloseData
```

The code and reason of a Close frame that you send. Make it with [`CloseData.make`](#CloseData.impl.make).

::Anchor{id="CloseData.impl.Copy"}

## Implementation `Copy for CloseData`

```silk
impl Copy for CloseData
```

::Anchor{id="CloseData.impl"}

## Implementation `CloseData`

```silk
impl CloseData
```

::Anchor{id="CloseData.impl.make"}

### Associated function `make`

```silk
pub fn make(code: u16, reason: string) -> Result<CloseData, WebSocketError>
```

Returns Close data with `code` and a copy of `reason`.

#### Errors
- `InvalidCloseData` with `Code` if `code` cannot be sent. Allowed codes are 1000 through
  1003, 1007 through 1009, 1011, and 3000 through 4999. A received Close can also carry 1010
  and 1012 through 1014.
- `InvalidCloseData` with `ReasonTooLarge` if `reason` has more than 123 bytes.

::Anchor{id="CloseData.impl.code"}

### Method `code`

```silk
pub fn code(self: &Self) -> u16
```

Returns the code.

::Anchor{id="CloseData.impl.reason"}

### Method `reason`

```silk
pub fn reason<'data>(self: &'data Self) -> &'data CloseReason
```

Returns the reason.

::Anchor{id="PeerCloseData"}

## `PeerCloseData`

```silk
pub union PeerCloseData
```

The code and reason in the Close of the peer.

::Anchor{id="PeerCloseData.Absent"}

### `Absent`

```silk
Absent
```

The Close had no payload. RFC 6455 reports this as code 1005.

::Anchor{id="PeerCloseData.Present"}

### `Present`

```silk
Present
```

The Close had a code and a reason.

::Anchor{id="PeerCloseData.Present.code"}

#### Field `code`

```silk
pub code: u16
```

The code.

::Anchor{id="PeerCloseData.Present.reason"}

#### Field `reason`

```silk
pub reason: CloseReason
```

The reason. It can be empty.

::Anchor{id="PeerCloseData.impl.Copy"}

## Implementation `Copy for PeerCloseData`

```silk
impl Copy for PeerCloseData
```

::Anchor{id="Event"}

## `Event`

```silk
pub union Event
```

One complete event from the peer.

::Anchor{id="Event.Text"}

### `Text`

```silk
Text
```

A Text message of `length` bytes, valid UTF-8. Get it with [`Session.message`](#Session.impl.message) or
[`Decoder.message`](#Decoder.impl.message) before the next call that receives.

::Anchor{id="Event.Text.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the message.

::Anchor{id="Event.Binary"}

### `Binary`

```silk
Binary
```

A Binary message of `length` bytes. Get it with [`Session.message`](#Session.impl.message) or [`Decoder.message`](#Decoder.impl.message)
before the next call that receives.

::Anchor{id="Event.Binary.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the message.

::Anchor{id="Event.Ping"}

### `Ping`

```silk
Ping
```

A Ping. A [`Session`](#Session) already put the Pong in the output.

::Anchor{id="Event.Ping.payload"}

#### Field `payload`

```silk
pub payload: ControlPayload
```

The payload.

::Anchor{id="Event.Pong"}

### `Pong`

```silk
Pong
```

A Pong.

::Anchor{id="Event.Pong.payload"}

#### Field `payload`

```silk
pub payload: ControlPayload
```

The payload.

::Anchor{id="Event.Close"}

### `Close`

```silk
Close
```

The Close of the peer.

::Anchor{id="Event.Close.data"}

#### Field `data`

```silk
pub data: PeerCloseData
```

The code and reason of the peer.

::Anchor{id="Event.impl.Copy"}

## Implementation `Copy for Event`

```silk
impl Copy for Event
```

::Anchor{id="Received"}

## `Received`

```silk
pub struct Received
```

The result of one receive call.

::Anchor{id="Received.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

How many input bytes were used. Give the rest again in the next call.

::Anchor{id="Received.event"}

### Field `event`

```silk
pub event: Option<Event>
```

The event that is complete, if any. With `None`, all input was used and more is needed.

::Anchor{id="Received.impl.Copy"}

## Implementation `Copy for Received`

```silk
impl Copy for Received
```

::Anchor{id="Decoder"}

## `Decoder`

```silk
pub struct Decoder
```

Splits bytes into frames and checks them, for one role. It does not answer Pings or Closes:
[`Session`](#Session) does that.

### Details
[`Decoder.feed`](#Decoder.impl.feed) keeps a partial frame between calls. Fragments of a message are joined in an
internal buffer, up to `maxMessageBytes`. Control frames can come between fragments.

::Anchor{id="Decoder.impl"}

## Implementation `Decoder`

```silk
impl Decoder
```

::Anchor{id="Decoder.impl.make"}

### Associated function `make`

```silk
pub fn make(side: Role, limits: Limits) -> Result<Decoder, WebSocketError>
```

Returns a decoder for frames that a peer of `role` sends to you. A server decodes with
`Role.Client` frames: give the role of this side, and it checks the masking of the peer.

#### Errors
`InvalidLimits` if `maxMessageBytes` is zero.

::Anchor{id="Decoder.impl.message"}

### Method `message`

```silk
pub fn message<'decoder>(self: &'decoder Self) -> &'decoder [u8]
```

Returns the last complete Text or Binary message. It is empty before the first one, and it is
cleared by the next [`Decoder.feed`](#Decoder.impl.feed).

::Anchor{id="Decoder.impl.feed"}

### Method `feed`

```silk
pub effect fn feed(self: &mut Self, input: &[u8]) -> Received
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Reads frames from `input` until one event is complete or the input is used.

#### Details
The message of the previous `Text` or `Binary` event is cleared first. After a `Close`
event, any later frame fails with `FrameAfterClose`.

#### Errors
`ProtocolError`, `MessageTooLarge` or `InvalidUtf8` for a bad frame, and `PreviousFailure`
after one of them. `OutOfMemoryError` if the message buffer cannot grow.

::Anchor{id="appendFrame"}

## `appendFrame`

```silk
pub effect fn appendFrame(
  output: &mut Bytes,
  opcode: Opcode,
  fin: bool,
  payload: &[u8],
  mask: Option<[u8; 4]>,
) -> () ! OutOfMemoryError ? &mut Allocator
```

Appends one frame to `output`.

### Details
With a `mask` key, the payload is masked with it, as a client must do. Without one, the frame
is not masked, as a server must do. `fin` marks the last frame of a message. This function does
not check the order of fragments or the length of control payloads: [`Session`](#Session) does.

### Errors
`OutOfMemoryError` if `output` cannot grow.

::Anchor{id="MessageKind"}

## `MessageKind`

```silk
pub enum MessageKind
```

The kind of a message that you send in fragments with [`Session.sendFragment`](#Session.impl.sendFragment).

::Anchor{id="MessageKind.Text"}

### `Text`

```silk
Text
```

A Text message. Each fragment must be valid UTF-8 on its own, so that the message is too.

::Anchor{id="MessageKind.Binary"}

### `Binary`

```silk
Binary
```

A Binary message.

::Anchor{id="Session"}

## `Session`

```silk
pub struct Session
```

A WebSocket session without I/O: it receives bytes, and appends the frames to send to an output
buffer.

### Details
[`Session.receive`](#Session.impl.receive) answers a Ping with a Pong and a Close with a Close, in the output. The
send functions append one frame each. Write the output to the connection in the order it was
appended. When the state is `Closed` or `Failed`, write the output that is left and close the
connection.

::Anchor{id="Session.impl"}

## Implementation `Session`

```silk
impl Session
```

::Anchor{id="Session.impl.make"}

### Associated function `make`

```silk
pub fn make(side: Role, limits: Limits, seed: u64) -> Result<Session, WebSocketError>
```

Returns an open session for `role`. `seed` seeds the mask keys of a client: give it a value
from `silk.system.random`. A server ignores it.

#### Errors
`InvalidLimits` if `maxMessageBytes` is zero.

::Anchor{id="Session.impl.side"}

### Method `side`

```silk
pub fn side(self: &Self) -> Role
```

Returns the role.

::Anchor{id="Session.impl.state"}

### Method `state`

```silk
pub fn state(self: &Self) -> State
```

Returns the state.

::Anchor{id="Session.impl.advance"}

### Method `advance`

```silk
pub fn advance(self: &mut Self, state: State) -> ()
```

Moves the state forward to `state`, for two sessions that share one connection, such as the
receive and send sides of a split session.

#### Details
`Failed` and `Closed` are final. `CloseSent` replaces only `Open`. `Open` changes nothing.

::Anchor{id="Session.impl.message"}

### Method `message`

```silk
pub fn message<'session>(self: &'session Self) -> &'session [u8]
```

Returns the last complete Text or Binary message. It is valid until the next
[`Session.receive`](#Session.impl.receive).

::Anchor{id="Session.impl.messageText"}

### Method `messageText`

```silk
pub fn messageText<'session>(self: &'session Self) -> string<'session>
```

Returns the last complete Text message as text. It is empty if the last message was Binary.

::Anchor{id="Session.impl.receive"}

### Method `receive`

```silk
pub effect fn receive(self: &mut Self, input: &[u8], output: &mut Bytes) -> Received
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Reads frames from `input` until one event is complete or the input is used, and appends the
frames that answer the peer to `output`.

#### Details
- A Ping is answered with a Pong, unless this side already sent Close.
- A Close is answered with a Close that has the same code, unless this side already sent
  Close. The state becomes `Closed`.
- A peer error appends a Close with [`closeCodeOf`](#closeCodeOf) the error, unless this side already sent
  Close. The state becomes `Failed`.

#### Errors
- `InvalidState` if the state is `Closed`.
- `ProtocolError`, `MessageTooLarge` or `InvalidUtf8` for a bad frame, `PreviousFailure` if
  the state is `Failed`.
- `OutOfMemoryError` if a buffer cannot grow.

::Anchor{id="Session.impl.sendText"}

### Method `sendText`

```silk
pub effect fn sendText(self: &mut Self, text: string, output: &mut Bytes) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends `text` as one Text frame.

#### Errors
`InvalidState` if the state is not `Open`, `FragmentOrder` while a fragmented message is being
sent. `OutOfMemoryError` if `output` cannot grow.

::Anchor{id="Session.impl.sendBinary"}

### Method `sendBinary`

```silk
pub effect fn sendBinary(self: &mut Self, bytes: &[u8], output: &mut Bytes) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends `bytes` as one Binary frame.

#### Errors
`InvalidState` if the state is not `Open`, `FragmentOrder` while a fragmented message is being
sent. `OutOfMemoryError` if `output` cannot grow.

::Anchor{id="Session.impl.sendFragment"}

### Method `sendFragment`

```silk
pub effect fn sendFragment(
    self: &mut Self,
    kind: MessageKind,
    payload: &[u8],
    fin: bool,
    output: &mut Bytes,
  ) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends one fragment of a message. `kind` gives the kind of the message, and is checked only
on the first fragment. `fin` marks the last fragment.

#### Details
Control frames ([`Session.sendPing`](#Session.impl.sendPing), [`Session.sendClose`](#Session.impl.sendClose)) can go between fragments. A Text
fragment must be complete UTF-8, because it is text.

#### Errors
`InvalidState` if the state is not `Open`. `OutOfMemoryError` if `output` cannot grow.

::Anchor{id="Session.impl.sendPing"}

### Method `sendPing`

```silk
pub effect fn sendPing(self: &mut Self, payload: &[u8], output: &mut Bytes) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends a Ping with `payload`.

#### Errors
`InvalidState` if the state is not `Open`, `ControlPayloadTooLarge` if `payload` has more than
125 bytes. `OutOfMemoryError` if `output` cannot grow.

::Anchor{id="Session.impl.sendPong"}

### Method `sendPong`

```silk
pub effect fn sendPong(self: &mut Self, payload: &[u8], output: &mut Bytes) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends a Pong with `payload`, for example as a heartbeat. A Ping from the peer is answered
by [`Session.receive`](#Session.impl.receive), so you do not need this for that.

#### Errors
`InvalidState` if the state is not `Open`, `ControlPayloadTooLarge` if `payload` has more than
125 bytes. `OutOfMemoryError` if `output` cannot grow.

::Anchor{id="Session.impl.sendClose"}

### Method `sendClose`

```silk
pub effect fn sendClose(self: &mut Self, data: Option<CloseData>, output: &mut Bytes) -> ()
  ! WebSocketError | OutOfMemoryError
  ? &mut Allocator
```

Appends a Close. The state becomes `CloseSent`, and then `Closed` when the Close of the peer
arrives.

#### Details
`data` gives the code and reason. With `None`, the Close has no payload. If the state is
already `CloseSent` or `Closed`, it does nothing.

#### Errors
`PreviousFailure` if the state is `Failed`. `OutOfMemoryError` if `output` cannot grow.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
