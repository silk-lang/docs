HTTP/2 over the existing plain or TLS `HttpTransport` service.

Create a [`Driver`](#Driver), queue requests or responses through `Driver.connection`, and call
`Driver.next` to flush output and receive an event. Calls preserve unread bytes between events.
The provider remains caller-owned. Use `silk.http.transport.plain` for a socket or
`silk.http.transport.secured` after a TLS handshake with required `h2` ALPN.

Import as `Driver` with `import silk.http.http2_connection { Driver }`.

Public declarations: 3.

::Anchor{id="protocol"}

## `protocol`

```silk
pub fn protocol() -> AlpnProtocol<'static>
```

Returns the `h2` ALPN identifier. Offer it with `AlpnConfig.Offered` and `required: true` for HTTP/2-only TLS.

::Anchor{id="requireAlpn"}

## `requireAlpn`

```silk
pub effect fn requireAlpn(authentication: &Authentication) -> ()
  ! ProtocolError
```

Verifies that an authenticated TLS connection selected `h2`. Other protocols fail with PROTOCOL_ERROR.

::Anchor{id="Driver"}

## `Driver`

```silk
pub struct Driver
```

A buffered driver for one HTTP/2 connection. It borrows the transport through the Effect service.

::Anchor{id="Driver.impl"}

## Implementation `Driver`

```silk
impl Driver
```

::Anchor{id="Driver.impl.make"}

### Associated function `make`

```silk
pub effect fn make(endpoint: Role, limits: Limits) -> Driver
    ! ProtocolError | OutOfMemoryError
    ? &mut Allocator
```

Creates a protocol connection and a 16 KiB transport read buffer. No I/O occurs until `flush` or `next`.

::Anchor{id="Driver.impl.connection"}

### Method `connection`

```silk
pub fn connection(self: &mut Self) -> &mut Connection
```

Borrows the protocol connection to open streams, send fields or data, return credit, or initiate shutdown.

::Anchor{id="Driver.impl.flush"}

### Method `flush`

```silk
pub effect fn flush(self: &mut Self, deadline: Option<Instant>) -> ()
    ! ProtocolError | TransportError | OutOfMemoryError
    ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends all queued protocol bytes and flushes the transport with the caller's absolute deadline.

::Anchor{id="Driver.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self, deadline: Option<Instant>, drainBytes: usize) -> ()
    ! ProtocolError | TransportError | OutOfMemoryError
    ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Flushes output, drains at most `drainBytes` incoming bytes, and closes the transport.
Give a finite deadline after GOAWAY so unread socket data does not discard the shutdown frame.
Drain failures stop draining. Flush and close failures are returned after the close attempt.

::Anchor{id="Driver.impl.next"}

### Method `next`

```silk
pub effect fn next(self: &mut Self, deadline: Option<Instant>) -> Option<Event>
    ! ProtocolError | TransportError | OutOfMemoryError
    ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Flushes queued output, then waits for one event. None means clean transport EOF.
A partial frame or unfinished stream at EOF fails. Protocol errors attempt to flush GOAWAY before returning.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
