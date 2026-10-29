Owned UDP sockets and complete datagrams through WASI Preview 2.

## Details
A socket owns its incoming and outgoing datagram streams and drops them before the socket.
The host controls network access. Datagram boundaries are preserved; receive returns the whole
payload, and send returns only after the host accepts the datagram. Deadlines use the supplied clock.

Import as `UdpSocket` with `import silk.net.datagram_wasi { UdpSocket }`.

Public declarations: 2.

::Anchor{id="Datagram"}

## `Datagram`

```silk
pub struct Datagram
```

One complete received datagram, owning its bytes and sender address.

::Anchor{id="Datagram.data"}

### Field `data`

```silk
pub data: Bytes
```

The complete datagram payload, including a possible empty payload.

::Anchor{id="Datagram.source"}

### Field `source`

```silk
pub source: SocketAddress
```

The sender's socket address.

::Anchor{id="UdpSocket"}

## `UdpSocket`

```silk
pub struct UdpSocket
```

An owned UDP socket and its receive/send streams. Close and drop release all three resources.

::Anchor{id="UdpSocket.impl"}

## Implementation `UdpSocket`

```silk
impl UdpSocket
```

::Anchor{id="UdpSocket.impl.bind"}

### Associated function `bind`

```silk
pub effect fn bind(network: &Network, local: &SocketAddress, remote: Option<&SocketAddress>, deadline: Option<Instant>) -> UdpSocket
      ! SocketError ? &mut MonotonicClock
```

Binds a UDP socket to `local`. A remote address restricts incoming traffic and supplies the
default send destination; absent means unconnected UDP. Port zero chooses a local port.

::Anchor{id="UdpSocket.impl.address"}

### Method `address`

```silk
pub effect fn address(self: &Self) -> SocketAddress ! SocketError
```

Returns the bound local address. A closed socket fails with code 9.

::Anchor{id="UdpSocket.impl.send"}

### Method `send`

```silk
pub effect fn send(self: &mut Self, bytes: &[u8], remote: Option<&SocketAddress>, deadline: Option<Instant>) -> ()
      ! SocketError ? &mut MonotonicClock
```

Sends one complete datagram. Unconnected sockets require a destination; connected sockets
may use none. Empty payloads are valid datagrams. A closed socket fails with code 9.

::Anchor{id="UdpSocket.impl.receive"}

### Method `receive`

```silk
pub effect fn receive(self: &mut Self, deadline: Option<Instant>) -> Datagram
      ! SocketError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator
```

Receives one complete datagram and owns its payload. Waits until data arrives or the
deadline expires. Allocation failure releases all buffers the host returned.

::Anchor{id="UdpSocket.impl.close"}

### Method `close`

```silk
pub fn close(self: &mut Self) -> ()
```

Closes both datagram streams and then their parent socket. Repeated calls do nothing.

::Anchor{id="UdpSocket.impl.Drop"}

## Implementation `Drop for UdpSocket`

```silk
impl Drop for UdpSocket
```

::Anchor{id="UdpSocket.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

Category: Networking.

Profiles: `wasm32-wasip2`.
