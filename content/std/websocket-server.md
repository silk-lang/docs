WebSocket messages on the server side, over a channel from an accepted handshake.

## When to use
After `withUpgrade` of `silk.websocket_upgrade` accepts a handshake, it lends you the channel.
Call [`withServer`](#withServer) with it. In the callback, call [`readEvent`](#readEvent) in a loop, and answer with
[`writeText`](#writeText) or [`writeBinary`](#writeBinary).

## Details
Each [`readEvent`](#readEvent) reads one complete frame and checks it before it returns:
- `Text` and `Binary` write the payload to your buffer. Text is valid UTF-8.
- `Ping` is answered with a `Pong` before [`readEvent`](#readEvent) returns.
- `PeerClose` means that the client sent Close. The server answered with Close and closed the
  channel.

To close from the server, call [`sendClose`](#sendClose), then [`finishClose`](#finishClose) to wait for the Close of the
client. Client frames must be masked. Server frames are not masked. The channel is closed when
the callback of [`withServer`](#withServer) ends.

When a client frame breaks a rule, the session fails, and later calls fail with
`PreviousFailure`. Unless the deadline has passed, the server first sends Close with a code:
1002 for a protocol error, 1003 for fragmentation, 1007 for bad UTF-8, and 1009 for a message
that is too large for the limits or the buffer. With no deadline, it allows that Close one
second.

## Errors
[`WebSocketError`](#WebSocketError) tells the rule, limit, state, or transport error.

## Gotchas
- Fragmented messages, extensions, and compression are not supported. A fragmented message fails
  the session.
- If a message is larger than your buffer, the session fails with `BufferTooSmall`. Give a
  buffer of `maxMessageBytes`.

## Examples
### Answer one message
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.buffered_duplex { BufferedDuplex }
import silk.buffered_input { BufferError }
import silk.byte_duplex { ByteDuplex }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.http_body { Limits as BodyLimits }
import silk.http_head { Limits as HeadLimits }
import silk.http_headers { Headers, Limits as ValueLimits }
import silk.http_server {
  Connection,
  ConnectionHandler,
  Limits as ServerLimits,
  Request,
  ServerError,
  withConnection,
  withRequest
}
import silk.list { List }
import silk.memory_byte_duplex {
  MemoryByteDuplex,
  MemoryReadEvent,
  MemoryWriteAction,
  MemoryWriteEvent
}
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.result { Result }
import silk.system_clock { Instant, SystemClock }
import silk.u64
import silk.usize
import silk.websocket_server as WebSocketServer {
  Event,
  Limits as SocketLimits,
  ServerWebSocket,
  WebSocketError
}
import silk.websocket_upgrade {
  Decision,
  DecisionHandler,
  Limits,
  Offer,
  Outcome,
  UpgradeError,
  withUpgrade
}

struct FixedClock {}

impl MonotonicClock for FixedClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }

  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    drop when
    return ()
  }

  effect fn waitFor(self: &mut Self, duration: u64) -> () {
    drop duration
    return ()
  }
}

fn valueLimits() -> ValueLimits {
  return ValueLimits {
    maxMethodBytes: 32,
    maxTargetBytes: 128,
    maxNameBytes: 64,
    maxValueBytes: 256,
    maxFields: 12,
    maxFieldBytes: 512,
    maxOwnedBytes: 2048,
  }
}

fn serverLimits() -> ServerLimits {
  return ServerLimits {
    head: HeadLimits {
      maxHeadBytes: 1024,
      maxStartLineBytes: 256,
      maxFieldLineBytes: 256,
      maxOwnedBytes: 2048,
      values: valueLimits(),
    },
    body: BodyLimits {
      maxWireBytes: 1024,
      maxPayloadBytes: 512,
      maxChunkBytes: 64,
      maxChunks: 8,
      maxChunkLineBytes: 64,
      maxExtensionBytes: 128,
      maxTrailerBytes: 256,
      maxTrailerFields: 4,
      maxOwnedBytes: 2048,
      trailerValues: valueLimits(),
    },
    values: valueLimits(),
    readCapacity: 256,
    writeCapacity: 256,
    maxRequestsPerConnection: 1,
    maxInformationalResponses: 2,
    maxDiscardWireBytes: u64.toU64(256),
    shutdownDrainBytes: 16,
  }
}

// Accepts each handshake, with no subprotocol.
struct AcceptAll {}

impl DecisionHandler<UpgradeError ? &mut MonotonicClock> for AcceptAll {
  effect<'call> fn decide<'call, 'head: 'call>(
    handler: &'call Self,
    offer: &'call Offer<'head>
  ) -> Decision<'call>
    ! UpgradeError
    ? &mut MonotonicClock {
    return Decision.Accept {
      protocol: Option<string<'call>>.none(),
      headers: Option<Headers<'call>>.none(),
      extensions: false,
    }
  }
}

// Reads one text message, answers it, then reads the close of the client.
effect<'call> fn chat<'call, 'channel: 'call, 'transport: 'channel>(
  socket: &'call mut ServerWebSocket<'channel, 'transport, MemoryByteDuplex>,
) -> i32
  ! WebSocketError
  ? &mut MonotonicClock {
  let mut message: [u8; 64] = [0; 64]
  match move run WebSocketServer.readEvent(&mut socket.*, &mut message, Option<Instant>.none()) {
    Event.Text { count } => {
      if count != 2 || message[0] != 72 {
        return 1
      }
    }
    _ => {
      return 1
    }
  }
  run WebSocketServer.writeText(&mut socket.*, "Hello", Option<Instant>.none())

  // `PeerClose` means that the reply Close was sent and the channel is closed.
  return match move run WebSocketServer.readEvent(
    &mut socket.*,
    &mut message,
    Option<Instant>.none()
  ) {
    Event.PeerClose { data: _ } => 0
    _ => 1
  }
}

effect<'call> fn useChannel<'call, 'transport: 'call>(
  channel: &'call mut BufferedDuplex<'transport, MemoryByteDuplex>,
) -> i32
  ! WebSocketError
  ? &mut MonotonicClock {
  return run WebSocketServer.withServer(move channel, SocketLimits.defaults(), chat)
}

effect<'call> fn handleRequest<
  'call,
  'request: 'call,
  'connection: 'request,
  'transport: 'connection
>(request: &'call mut Request<'request, 'connection, 'transport, MemoryByteDuplex>) -> i32
  ! UpgradeError | WebSocketError | ServerError | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock {
  let outcome = run withUpgrade<i32, UpgradeError, WebSocketError>(
    move request,
    Limits.defaults(),
    Option<Instant>.none(),
    AcceptAll {},
    useChannel,
  )
  return match move outcome {
    Outcome.Upgraded { value } => value
    Outcome.Rejected { status: _ } => 1
  }
}

struct Handler {}

impl ConnectionHandler<
  MemoryByteDuplex,
  i32,
  UpgradeError | WebSocketError | ServerError | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock
> for Handler {
  effect<'call> fn handle<'call, 'connection: 'call, 'transport: 'connection>(
    handler: Self,
    connection: &'call mut Connection<'connection, 'transport, MemoryByteDuplex>,
  ) -> i32
    ! UpgradeError | WebSocketError | ServerError | OutOfMemoryError
    ? &mut Allocator | &mut MonotonicClock where
    &'transport mut MemoryByteDuplex provides &ByteDuplex from &mut ByteDuplex
      | &mut MonotonicClock {
    drop handler
    return match run withRequest(&mut connection.*, Option<Instant>.none(), handleRequest) {
      Option.Some { value } => value
      Option.None => 1
    }
  }
}

effect fn program() -> i32
  ! UpgradeError | WebSocketError | ServerError | BufferError | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock {
  let handshake = run Bytes.copy(
    b"GET /chat HTTP/1.1\r\nHost: example.test\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n"
  )

  // A masked text frame "Hi" and a masked Close with code 1000. The mask is zero.
  let frames: [u8; 16] = [129, 130, 0, 0, 0, 0, 72, 105, 136, 130, 0, 0, 0, 0, 3, 232]
  let client = run Bytes.copy(&frames)
  let mut reads = List<MemoryReadEvent>.make()
  run List.append(
    &mut reads,
    MemoryReadEvent.Data { readyAt: SystemClock.make(0, 0), bytes: move handshake }
  )
  run List.append(
    &mut reads,
    MemoryReadEvent.Data { readyAt: SystemClock.make(0, 0), bytes: move client }
  )
  let mut writes = List<MemoryWriteEvent>.make()
  let mut index = usize.ZERO
  while index < 4 {
    run List.append(
      &mut writes,
      MemoryWriteEvent {
        readyAt: SystemClock.make(0, 0),
        action: MemoryWriteAction.Accept { count: 512 }
      },
    )
    index = index + usize.ONE
  }
  let mut transport = run MemoryByteDuplex.make(
    move reads,
    move writes,
    512,
    64,
    Option<i32>.none()
  )
  let code = run withConnection(&mut transport, serverLimits(), Handler {})
  if code != 0 {
    return code
  }

  // The output ends with the text frame "Hello" and the reply Close.
  let expected: [u8; 11] = [129, 5, 72, 101, 108, 108, 111, 136, 2, 3, 232]
  let sent = transport.outbound()
  if sent.length < 11 {
    return 1
  }
  let start = sent.length - 11
  let mut at = usize.ZERO
  while at < 11 {
    if sent[start + at] != expected[at] {
      return 1
    }
    at = at + usize.ONE
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = FixedClock {}
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `WebSocketServer` with `import silk.websocket_server as WebSocketServer`.

Public declarations: 25.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

The limits of a session. All are more than zero.

::Anchor{id="Limits.maxMessageBytes"}

### Field `maxMessageBytes`

```silk
pub maxMessageBytes: usize
```

The maximum payload of one Text or Binary message.

::Anchor{id="Limits.maxCloseFrames"}

### Field `maxCloseFrames`

```silk
pub maxCloseFrames: usize
```

The maximum number of client frames that one [`finishClose`](#finishClose) call reads.

::Anchor{id="Limits.maxCloseBytes"}

### Field `maxCloseBytes`

```silk
pub maxCloseBytes: usize
```

The maximum number of client bytes, with frame headers, that one [`finishClose`](#finishClose) call reads.

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

Returns the default limits: 65536-byte messages, 32 close frames, and 65536 close bytes.

::Anchor{id="Limits.impl.make"}

### Associated function `make`

```silk
pub fn make(
    maxMessageBytes: usize,
    maxCloseFrames: usize,
    maxCloseBytes: usize,
  ) -> Result<Limits, WebSocketError>
```

Returns limits with these values.

#### Errors
`InvalidLimits` if a value is zero.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The limit that is not valid.

::Anchor{id="LimitKind.MessageBytes"}

### `MessageBytes`

```silk
MessageBytes
```

`maxMessageBytes` is zero.

::Anchor{id="LimitKind.CloseFrames"}

### `CloseFrames`

```silk
CloseFrames
```

`maxCloseFrames` is zero.

::Anchor{id="LimitKind.CloseBytes"}

### `CloseBytes`

```silk
CloseBytes
```

`maxCloseBytes` is zero.

::Anchor{id="LimitKind.Arithmetic"}

### `Arithmetic`

```silk
Arithmetic
```

A size does not fit in its type.

::Anchor{id="LimitKind.impl.Debug"}

## Implementation `Debug for LimitKind`

```silk
impl Debug for LimitKind
```

::Anchor{id="LimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `MessageBytes`.

::Anchor{id="State"}

## `State`

```silk
pub enum State
```

The state of a session.

::Anchor{id="State.Open"}

### `Open`

```silk
Open
```

Messages can be read and written.

::Anchor{id="State.CloseSent"}

### `CloseSent`

```silk
CloseSent
```

The server sent Close, and waits for the Close of the client. [`finishClose`](#finishClose) reads until it
arrives.

::Anchor{id="State.Closed"}

### `Closed`

```silk
Closed
```

Both sides sent Close, and the channel is closed.

::Anchor{id="State.Failed"}

### `Failed`

```silk
Failed
```

An error ended the session. All later frame operations fail.

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

::Anchor{id="Operation"}

## `Operation`

```silk
pub enum Operation
```

The operation that failed.

::Anchor{id="Operation.ReadEvent"}

### `ReadEvent`

```silk
ReadEvent
```

[`readEvent`](#readEvent).

::Anchor{id="Operation.WriteText"}

### `WriteText`

```silk
WriteText
```

[`writeText`](#writeText).

::Anchor{id="Operation.WriteBinary"}

### `WriteBinary`

```silk
WriteBinary
```

[`writeBinary`](#writeBinary).

::Anchor{id="Operation.WritePing"}

### `WritePing`

```silk
WritePing
```

[`writePing`](#writePing).

::Anchor{id="Operation.WritePong"}

### `WritePong`

```silk
WritePong
```

[`writePong`](#writePong).

::Anchor{id="Operation.SendClose"}

### `SendClose`

```silk
SendClose
```

[`sendClose`](#sendClose).

::Anchor{id="Operation.FinishClose"}

### `FinishClose`

```silk
FinishClose
```

[`finishClose`](#finishClose).

::Anchor{id="Operation.impl.Debug"}

## Implementation `Debug for Operation`

```silk
impl Debug for Operation
```

::Anchor{id="Operation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `ReadEvent`.

::Anchor{id="ProtocolReason"}

## `ProtocolReason`

```silk
pub enum ProtocolReason
```

The frame rule that failed. The server sends Close with code 1002.

::Anchor{id="ProtocolReason.MaskRequired"}

### `MaskRequired`

```silk
MaskRequired
```

A client frame is not masked.

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

The text that is not valid UTF-8.

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

The code is not allowed in a server Close.

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

::Anchor{id="CloseLimitKind"}

## `CloseLimitKind`

```silk
pub enum CloseLimitKind
```

The [`finishClose`](#finishClose) limit that was exceeded.

::Anchor{id="CloseLimitKind.Frames"}

### `Frames`

```silk
Frames
```

`maxCloseFrames`.

::Anchor{id="CloseLimitKind.Bytes"}

### `Bytes`

```silk
Bytes
```

`maxCloseBytes`.

::Anchor{id="CloseLimitKind.impl.Debug"}

## Implementation `Debug for CloseLimitKind`

```silk
impl Debug for CloseLimitKind
```

::Anchor{id="CloseLimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Frames`.

::Anchor{id="Failure"}

## `Failure`

```silk
pub enum Failure
```

The kind of the first error of a failed session. Later calls return it in `PreviousFailure`.

::Anchor{id="Failure.Protocol"}

### `Protocol`

```silk
Protocol
```

A client frame broke a protocol rule.

::Anchor{id="Failure.Fragmentation"}

### `Fragmentation`

```silk
Fragmentation
```

The client sent a fragmented message.

::Anchor{id="Failure.Utf8"}

### `Utf8`

```silk
Utf8
```

Text or a Close reason was not valid UTF-8.

::Anchor{id="Failure.MessageLimit"}

### `MessageLimit`

```silk
MessageLimit
```

A message was larger than `maxMessageBytes`.

::Anchor{id="Failure.BufferCapacity"}

### `BufferCapacity`

```silk
BufferCapacity
```

A message was larger than the buffer of the caller.

::Anchor{id="Failure.CloseLimit"}

### `CloseLimit`

```silk
CloseLimit
```

A [`finishClose`](#finishClose) limit was exceeded.

::Anchor{id="Failure.Truncated"}

### `Truncated`

```silk
Truncated
```

The input ended in the middle of a frame.

::Anchor{id="Failure.Transport"}

### `Transport`

```silk
Transport
```

A read, write, or close failed.

::Anchor{id="Failure.impl.Debug"}

## Implementation `Debug for Failure`

```silk
impl Debug for Failure
```

::Anchor{id="Failure.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Protocol`.

::Anchor{id="WebSocketError"}

## `WebSocketError`

```silk
pub union WebSocketError
```

The error of a WebSocket operation: the rule, limit, state, or transport error.

### Details
When a client frame breaks a rule, the session fails, and later calls fail with
`PreviousFailure`. Unless the deadline has passed, the server first sends Close with a code:
1002 for a protocol error, 1003 for fragmentation, 1007 for bad UTF-8, and 1009 for a message
that is too large for the limits or the buffer. With no deadline, it allows that Close one
second.

::Anchor{id="WebSocketError.InvalidLimits"}

### `InvalidLimits`

```silk
InvalidLimits
```

A limit is zero.

::Anchor{id="WebSocketError.InvalidLimits.kind"}

#### Field `kind`

```silk
pub kind: LimitKind
```

The limit.

::Anchor{id="WebSocketError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The operation is not allowed in the current state.

::Anchor{id="WebSocketError.InvalidState.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The operation.

::Anchor{id="WebSocketError.InvalidState.state"}

#### Field `state`

```silk
pub state: State
```

The current state.

::Anchor{id="WebSocketError.PreviousFailure"}

### `PreviousFailure`

```silk
PreviousFailure
```

An earlier error ended the session.

::Anchor{id="WebSocketError.PreviousFailure.failure"}

#### Field `failure`

```silk
pub failure: Failure
```

The kind of the earlier error.

::Anchor{id="WebSocketError.BufferTooSmall"}

### `BufferTooSmall`

```silk
BufferTooSmall
```

A valid message does not fit in the buffer. The message is not read, and the session fails.

::Anchor{id="WebSocketError.BufferTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

The size of the message.

::Anchor{id="WebSocketError.BufferTooSmall.capacity"}

#### Field `capacity`

```silk
pub capacity: usize
```

The size of the buffer.

::Anchor{id="WebSocketError.MessageTooLarge"}

### `MessageTooLarge`

```silk
MessageTooLarge
```

A message is larger than `maxMessageBytes`.

::Anchor{id="WebSocketError.MessageTooLarge.length"}

#### Field `length`

```silk
pub length: u64
```

The length of the message.

::Anchor{id="WebSocketError.MessageTooLarge.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of `maxMessageBytes`.

::Anchor{id="WebSocketError.UnsupportedFragmentation"}

### `UnsupportedFragmentation`

```silk
UnsupportedFragmentation
```

The client sent a fragmented message, which is not supported.

::Anchor{id="WebSocketError.ProtocolError"}

### `ProtocolError`

```silk
ProtocolError
```

A client frame broke a rule of RFC 6455.

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

The Close data is not valid for a server.

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

::Anchor{id="WebSocketError.CloseLimitExceeded"}

### `CloseLimitExceeded`

```silk
CloseLimitExceeded
```

A [`finishClose`](#finishClose) limit was exceeded.

::Anchor{id="WebSocketError.CloseLimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: CloseLimitKind
```

The limit.

::Anchor{id="WebSocketError.CloseLimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of the limit.

::Anchor{id="WebSocketError.Truncated"}

### `Truncated`

```silk
Truncated
```

The input ended in the middle of a frame.

::Anchor{id="WebSocketError.Buffer"}

### `Buffer`

```silk
Buffer
```

A buffered read, write, or flush failed.

::Anchor{id="WebSocketError.Buffer.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The operation.

::Anchor{id="WebSocketError.Buffer.frameAccepted"}

#### Field `frameAccepted`

```silk
pub frameAccepted: usize
```

The bytes of the frame that were accepted before the error.

::Anchor{id="WebSocketError.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The buffer error.

::Anchor{id="WebSocketError.Transport"}

### `Transport`

```silk
Transport
```

Closing the channel failed.

::Anchor{id="WebSocketError.Transport.operation"}

#### Field `operation`

```silk
pub operation: Operation
```

The operation.

::Anchor{id="WebSocketError.Transport.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The transport error.

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

Writes the name of the variant and its fields, such as `InvalidLimits { ... }`.

::Anchor{id="ControlPayload"}

## `ControlPayload`

```silk
pub struct ControlPayload
```

The payload of a Ping or Pong, at most 125 bytes.

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

Returns the payload bytes.

::Anchor{id="CloseReason"}

## `CloseReason`

```silk
pub struct CloseReason
```

The reason of a Close frame: valid UTF-8, at most 123 bytes.

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

Returns the reason bytes.

::Anchor{id="CloseData"}

## `CloseData`

```silk
pub struct CloseData
```

The code and reason of a server Close frame. Make it with [`CloseData.make`](#CloseData.impl.make).

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

Returns Close data with `code` and a copy of `reason`.

#### Errors
- `InvalidCloseData` with `Code` if `code` is not allowed. Allowed codes are 1000 through
  1003, 1007 through 1014 except 1010, and 3000 through 4999.
- `InvalidCloseData` with `ReasonTooLarge` if `reason` has more than 123 bytes.
- `InvalidUtf8` if `reason` is not valid UTF-8.

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

The code and reason in the Close of the client.

::Anchor{id="PeerCloseData.Absent"}

### `Absent`

```silk
Absent
```

The Close had no payload.

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

::Anchor{id="Event"}

## `Event`

```silk
pub union Event
```

A frame from the client, from [`readEvent`](#readEvent).

::Anchor{id="Event.Text"}

### `Text`

```silk
Text
```

A Text message. The first `count` bytes of the buffer hold it, and they are valid UTF-8.

::Anchor{id="Event.Text.count"}

#### Field `count`

```silk
pub count: usize
```

The length of the message.

::Anchor{id="Event.Binary"}

### `Binary`

```silk
Binary
```

A Binary message. The first `count` bytes of the buffer hold it.

::Anchor{id="Event.Binary.count"}

#### Field `count`

```silk
pub count: usize
```

The length of the message.

::Anchor{id="Event.Ping"}

### `Ping`

```silk
Ping
```

A Ping. The `Pong` answer was already sent.

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

::Anchor{id="Event.PeerClose"}

### `PeerClose`

```silk
PeerClose
```

The client sent Close. The server answered with Close, and the channel is closed.

::Anchor{id="Event.PeerClose.data"}

#### Field `data`

```silk
pub data: PeerCloseData
```

The code and reason of the client.

::Anchor{id="ServerWebSocket"}

## `ServerWebSocket`

```silk
pub struct ServerWebSocket<'channel, 'transport, P>
```

A WebSocket session. [`withServer`](#withServer) lends it to a callback, and it cannot escape the callback.

::Anchor{id="state"}

## `state`

```silk
pub fn state<'channel, 'transport, P>(
  socket: &ServerWebSocket<'channel, 'transport, P>,
) -> State
```

Returns the state of the session. It does no I/O.

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

Reads one frame from the client, and returns it as an [`Event`](#Event).

### Details
Text and Binary payloads are written to the start of `output`. If the call fails after it wrote
part of `output`, those bytes are not valid. A Ping is answered with a Pong before the call
returns. A Close is answered with a Close, and the channel is closed.

### Errors
- `BufferTooSmall` if a message does not fit in `output`. The message is not read.
- `MessageTooLarge`, `ProtocolError`, `UnsupportedFragmentation`, or `InvalidUtf8` for a bad
  frame.
- `InvalidState` if the session is not open. All of these fail the session.

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

Sends `message` as one Text frame, and flushes it.

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

Sends `message` as one Binary frame, and flushes it.

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

Sends a Ping with `message`, and flushes it. `message` has at most 125 bytes.

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

Sends a Pong with `message`, and flushes it. `message` has at most 125 bytes.

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

Sends a Close frame, and flushes it. The state becomes `CloseSent`.

### Details
`data` gives the code and reason. With `None`, the Close has no payload. If the state is already
`CloseSent` or `Closed`, it does nothing.

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

Reads frames from the client until its Close arrives, then closes the channel.

### Details
Call it after [`sendClose`](#sendClose). Data frames are checked and dropped. A Ping is still answered.
`deadline` applies to all reads and writes. The reads are limited by `maxCloseFrames` and
`maxCloseBytes`, with frame headers.

### Errors
- `InvalidState` if the state is `Open`.
- `CloseLimitExceeded` if a limit is reached before the Close of the client.

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

Starts a WebSocket session on `channel`, and lends it to `use`.

### When to use
After `withUpgrade` of `silk.websocket_upgrade` accepts a handshake, it lends you the channel.
Call `withServer` with it. In the callback, call [`readEvent`](#readEvent) in a loop, and answer with
[`writeText`](#writeText) or [`writeBinary`](#writeBinary). To close from the server, call [`sendClose`](#sendClose), then
[`finishClose`](#finishClose).

### Details
Client frames must be masked. Server frames are not masked. /// `channel` comes from
`silk.websocket_upgrade`. The limits are checked before any I/O. The channel is closed when
`use` returns, fails, or is cancelled.

### Errors
- `InvalidLimits` if a limit is zero.
- The error of `use`.

### Gotchas
Fragmented messages, extensions, and compression are not supported. A fragmented message fails
the session.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
