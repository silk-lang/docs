A transport-independent HTTP/2 connection for clients and servers (RFC 9113).

Feed incoming bytes to `Connection.receive`, send `Connection.output`, and acknowledge sent bytes
with `Connection.consumeOutput`. Each call returns at most one application event. Keep calling
with the unconsumed input. SETTINGS and PING acknowledgments are queued automatically.

DATA uses connection and stream flow control. Call `Connection.release` only after consuming
received data. A zero return from `Connection.sendData` means flow control or queued output blocks progress.
Streams can progress independently. Field blocks remain contiguous on the wire.

Use prior knowledge on cleartext transports. On TLS, select `h2` with ALPN before creating this
connection. The obsolete HTTP/1.1 Upgrade handshake is not part of RFC 9113.

## Examples
### Queue two requests on one connection
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.http.hpack { Field }
import silk.http.http2 { Connection, Limits, Role }
import silk.http.http2_frame { ProtocolError }
import silk.num.u32
import silk.num.usize

effect fn requests() -> i32
  ! ProtocolError | OutOfMemoryError
  ? &mut Allocator {
  let mut connection = run Connection.make(Role.Client, Limits.defaults())
  let fields = [
    Field { name: b":method", value: b"GET", sensitive: false },
    Field { name: b":scheme", value: b"https", sensitive: false },
    Field { name: b":authority", value: b"example.com", sensitive: false },
    Field { name: b":path", value: b"/", sensitive: false }
  ]
  let first = run Connection.open(&mut connection, &fields, true)
  let second = run Connection.open(&mut connection, &fields, true)

  // Send these queued bytes over the authenticated h2 transport.
  let wire = Connection.output(&connection)
  if first != 1 || second != 3 || wire.length < 24 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(requests(), failed) |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `Connection` with `import silk.http.http2 { Connection }`.

Public declarations: 5.

::Anchor{id="Role"}

## `Role`

```silk
pub enum Role
```

The endpoint role. Clients allocate odd stream identifiers; servers allocate even identifiers for push.

::Anchor{id="Role.Client"}

### `Client`

```silk
Client
```

Sends the client preface and initiates requests.

::Anchor{id="Role.Server"}

### `Server`

```silk
Server
```

Checks the client preface and accepts requests.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Connection resource limits. The receiver advertises the applicable limits in SETTINGS.

::Anchor{id="Limits.streams"}

### Field `streams`

```silk
pub streams: u32
```

Maximum simultaneous peer-initiated streams.

::Anchor{id="Limits.frameBytes"}

### Field `frameBytes`

```silk
pub frameBytes: u32
```

Maximum accepted frame payload, from 16384 through 16777215 bytes.

::Anchor{id="Limits.fields"}

### Field `fields`

```silk
pub fields: usize
```

Maximum decoded field count per block.

::Anchor{id="Limits.headerBytes"}

### Field `headerBytes`

```silk
pub headerBytes: u32
```

Maximum decoded field-list size, including 32 bytes per field.

::Anchor{id="Limits.compressedBytes"}

### Field `compressedBytes`

```silk
pub compressedBytes: usize
```

Maximum compressed field block bytes across HEADERS and CONTINUATION frames.

::Anchor{id="Limits.tableBytes"}

### Field `tableBytes`

```silk
pub tableBytes: u32
```

Maximum HPACK dynamic table bytes.

::Anchor{id="Limits.windowBytes"}

### Field `windowBytes`

```silk
pub windowBytes: u32
```

Initial receive window for each stream, at most 2147483647 bytes.

::Anchor{id="Limits.outputBytes"}

### Field `outputBytes`

```silk
pub outputBytes: usize
```

Maximum unsent wire bytes. Drain output before queuing more application data.

::Anchor{id="Limits.push"}

### Field `push`

```silk
pub push: bool
```

Whether a client accepts push for the exact authority and scheme of the associated request. Servers ignore this field.

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

Returns limits of 100 streams, 16 KiB frames, 64 KiB field lists, and 1 MiB queued output.

::Anchor{id="Event"}

## `Event`

```silk
pub union Event
```

One event from the peer. DATA storage belongs to the event until the application drops it.

::Anchor{id="Event.None"}

### `None`

```silk
None
```

No application event. Continue with the unconsumed input, or wait for more bytes.

::Anchor{id="Event.Headers"}

### `Headers`

```silk
Headers
```

A complete initial, informational, or trailing field section.

::Anchor{id="Event.Headers.stream"}

#### Field `stream`

```silk
pub stream: u32
```

The stream identifier.

::Anchor{id="Event.Headers.fields"}

#### Field `fields`

```silk
pub fields: List<Header>
```

Decoded fields in wire order.

::Anchor{id="Event.Headers.endStream"}

#### Field `endStream`

```silk
pub endStream: bool
```

True if this section ends the peer's side of the stream.

::Anchor{id="Event.Data"}

### `Data`

```silk
Data
```

Stream body bytes with frame padding removed.

::Anchor{id="Event.Data.stream"}

#### Field `stream`

```silk
pub stream: u32
```

The stream identifier.

::Anchor{id="Event.Data.bytes"}

#### Field `bytes`

```silk
pub bytes: Bytes
```

The body bytes. Call `release` after consuming them.

::Anchor{id="Event.Data.endStream"}

#### Field `endStream`

```silk
pub endStream: bool
```

True if the peer finished this stream.

::Anchor{id="Event.Push"}

### `Push`

```silk
Push
```

A server push request. A client can reject it with `reset`.

::Anchor{id="Event.Push.stream"}

#### Field `stream`

```silk
pub stream: u32
```

The associated request stream.

::Anchor{id="Event.Push.promised"}

#### Field `promised`

```silk
pub promised: u32
```

The promised even stream identifier.

::Anchor{id="Event.Push.fields"}

#### Field `fields`

```silk
pub fields: List<Header>
```

The promised request fields.

::Anchor{id="Event.Reset"}

### `Reset`

```silk
Reset
```

The peer reset one stream.

::Anchor{id="Event.Reset.stream"}

#### Field `stream`

```silk
pub stream: u32
```

The reset stream.

::Anchor{id="Event.Reset.code"}

#### Field `code`

```silk
pub code: u32
```

The wire error code, including unknown extension codes.

::Anchor{id="Event.Pong"}

### `Pong`

```silk
Pong
```

A PING acknowledgment with its opaque payload.

::Anchor{id="Event.Pong.bytes"}

#### Field `bytes`

```silk
pub bytes: Bytes
```

The eight bytes supplied by the peer.

::Anchor{id="Event.Goaway"}

### `Goaway`

```silk
Goaway
```

The peer started graceful shutdown. Existing eligible streams can still finish.

::Anchor{id="Event.Goaway.lastStream"}

#### Field `lastStream`

```silk
pub lastStream: u32
```

The last locally initiated stream the peer might have processed.

::Anchor{id="Event.Goaway.code"}

#### Field `code`

```silk
pub code: u32
```

The peer's wire error code.

::Anchor{id="Event.Goaway.debug"}

#### Field `debug`

```silk
pub debug: Bytes
```

Opaque diagnostic bytes.

::Anchor{id="Event.Settings"}

### `Settings`

```silk
Settings
```

The peer's settings changed or it acknowledged local settings.

::Anchor{id="Event.StreamError"}

### `StreamError`

```silk
StreamError
```

A rejected stream. RST_STREAM is queued; other streams remain usable.

::Anchor{id="Event.StreamError.stream"}

#### Field `stream`

```silk
pub stream: u32
```

The rejected stream identifier.

::Anchor{id="Event.StreamError.code"}

#### Field `code`

```silk
pub code: u32
```

The wire error code.

::Anchor{id="Event.Writable"}

### `Writable`

```silk
Writable
```

The peer granted connection or stream send credit.

::Anchor{id="Progress"}

## `Progress`

```silk
pub struct Progress
```

The result of feeding incoming wire bytes.

::Anchor{id="Progress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

Bytes consumed from the supplied input.

::Anchor{id="Progress.event"}

### Field `event`

```silk
pub event: Event
```

At most one complete event.

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection
```

An owned HTTP/2 state machine. It does no I/O and needs no compiler or native protocol support.
Connection errors queue GOAWAY and make the connection terminal. Stream errors queue RST_STREAM.

::Anchor{id="Connection.impl"}

## Implementation `Connection`

```silk
impl Connection
```

::Anchor{id="Connection.impl.make"}

### Associated function `make`

```silk
pub effect fn make(endpoint: Role, limits: Limits) -> Connection
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Creates a connection and queues its preface and initial SETTINGS.
Invalid limits fail with PROTOCOL_ERROR. TLS callers must first verify ALPN selected `h2`.

::Anchor{id="Connection.impl.output"}

### Method `output`

```silk
pub fn output(self: &Self) -> &[u8]
```

Borrows all unsent bytes. Send them in order before calling `consumeOutput`.

::Anchor{id="Connection.impl.consumeOutput"}

### Method `consumeOutput`

```silk
pub effect fn consumeOutput(self: &mut Self, count: usize) -> ()
    ! ProtocolError
```

Marks bytes as sent. A count beyond the available output fails with PROTOCOL_ERROR.

::Anchor{id="Connection.impl.failed"}

### Method `failed`

```silk
pub fn failed(self: &Self) -> bool
```

True after a connection error. Drain the queued GOAWAY, then close the transport.

::Anchor{id="Connection.impl.receive"}

### Method `receive`

```silk
pub effect<'call> fn receive<'call>(self: &'call mut Self, input: &'call [u8]) -> Progress
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Consumes a wire fragment and returns at most one event. Partial frames are retained within the frame limit.
Stream errors queue RST_STREAM; connection errors queue GOAWAY and reject subsequent input.

::Anchor{id="Connection.impl.finishInput"}

### Method `finishInput`

```silk
pub effect fn finishInput(self: &mut Self) -> ()
    ! ProtocolError
```

Reports EOF. A truncated preface, frame, field block, or open stream fails with PROTOCOL_ERROR.

::Anchor{id="Connection.impl.open"}

### Method `open`

```silk
pub effect fn open(self: &mut Self, fields: &[Field], endStream: bool) -> u32
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Opens a client request stream. GOAWAY, exhausted identifiers, and peer stream limits refuse new streams.

::Anchor{id="Connection.impl.sendHeaders"}

### Method `sendHeaders`

```silk
pub effect fn sendHeaders(self: &mut Self, id: u32, fields: &[Field], endStream: bool) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Queues response fields or trailers on an existing stream. Trailers must end the stream.
Informational responses leave the stream ready for a final response and cannot end it.

::Anchor{id="Connection.impl.sendData"}

### Method `sendData`

```silk
pub effect fn sendData(self: &mut Self, id: u32, input: &[u8], endStream: bool) -> usize
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Queues as many body bytes as flow control, the frame size, and output space allow.
END_STREAM is sent only when all input bytes fit. A zero return with nonempty input means backpressure.

::Anchor{id="Connection.impl.release"}

### Method `release`

```silk
pub effect fn release(self: &mut Self, id: u32, count: u32) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Returns consumed DATA credit to the peer. Padding credit is returned automatically.
The count cannot exceed unreleased body bytes for this stream. Closed streams return connection credit only.

::Anchor{id="Connection.impl.reset"}

### Method `reset`

```silk
pub effect fn reset(self: &mut Self, id: u32, code: u32) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Cancels an existing stream and queues RST_STREAM. Queued incoming body credit is returned to the connection.

::Anchor{id="Connection.impl.ping"}

### Method `ping`

```silk
pub effect fn ping(self: &mut Self, bytes: &[u8]) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Sends a PING with exactly eight opaque bytes. Other lengths fail with FRAME_SIZE_ERROR.

::Anchor{id="Connection.impl.shutdown"}

### Method `shutdown`

```silk
pub effect fn shutdown(self: &mut Self, code: u32, debug: &[u8]) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Stops accepting new streams and queues GOAWAY. Existing streams can finish when the code is NO_ERROR.

::Anchor{id="Connection.impl.settingsTimeout"}

### Method `settingsTimeout`

```silk
pub effect fn settingsTimeout(self: &mut Self) -> ()
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Fails the connection if the initial SETTINGS acknowledgment has not arrived by the caller's deadline.

::Anchor{id="Connection.impl.push"}

### Method `push`

```silk
pub effect fn push(self: &mut Self, associated: u32, fields: &[Field]) -> u32
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Reserves a server push stream and queues PUSH_PROMISE. The request must use GET or HEAD without a body.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
