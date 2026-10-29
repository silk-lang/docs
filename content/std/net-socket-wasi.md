TCP connections and listeners through WASI Preview 2 network capabilities.

## When to use
Use `Network.make` to acquire the host-granted network, then connect or listen. Connections
provide `ByteDuplex` for portable HTTP, TLS, and other stream protocols.

## Details
The host decides which addresses may be used. Socket operations retain WASI network error
codes. Polling honors deadlines on the supplied monotonic clock. Closing a connection drops
its streams before its parent socket; drop also closes every remaining resource.

Import as `wasi_socket` with `import silk.net.socket_wasi as wasi_socket`.

Public declarations: 6.

::Anchor{id="SocketError"}

## `SocketError`

```silk
pub struct SocketError
```

A WASI network error. `code` is the ordinal of `wasi:sockets/network.error-code`.
In particular 1 is access denied, 5 timeout, 8 would block, and 14 connection refused.

::Anchor{id="SocketError.code"}

### Field `code`

```silk
pub code: u32
```

::Anchor{id="SocketAddress"}

## `SocketAddress`

```silk
pub struct SocketAddress
```

An IP socket address, including IPv6 flow information and interface scope.

::Anchor{id="SocketAddress.endpoint"}

### Field `endpoint`

```silk
pub endpoint: Endpoint
```

The IP address and port.

::Anchor{id="SocketAddress.flowInfo"}

### Field `flowInfo`

```silk
pub flowInfo: u32
```

IPv6 flow information. Ignored for IPv4.

::Anchor{id="SocketAddress.scopeId"}

### Field `scopeId`

```silk
pub scopeId: u32
```

IPv6 interface scope. Ignored for IPv4.

::Anchor{id="SocketAddress.impl"}

## Implementation `SocketAddress`

```silk
impl SocketAddress
```

::Anchor{id="SocketAddress.impl.make"}

### Associated function `make`

```silk
pub fn make(endpoint: Endpoint) -> SocketAddress
```

Makes an address with zero IPv6 flow information and scope.

::Anchor{id="SocketAddress.impl.lanes"}

### Method `lanes`

```silk
pub fn lanes(self: &Self) -> [u32; 12]
```

Returns the twelve flattened canonical lanes of an `ip-socket-address`.

::Anchor{id="decodeAddress"}

## `decodeAddress`

```silk
pub unsafe fn decodeAddress(result: &ResultArea, offset: usize) -> SocketAddress
```

Decodes an initialized canonical `ip-socket-address` at `offset` in a result area.
The record and its tag must be a valid host result.

::Anchor{id="Network"}

## `Network`

```silk
pub struct Network
```

An owned default-network capability. The runtime controls the addresses it grants.

::Anchor{id="Network.impl"}

## Implementation `Network`

```silk
impl Network
```

::Anchor{id="Network.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Network
```

Acquires the host's default network capability. This does not grant additional access.

::Anchor{id="Network.impl.handle"}

### Method `handle`

```silk
pub fn handle(self: &Self) -> u32
```

Borrows the network handle for unsafe WASI operations. Ownership stays with this value.

::Anchor{id="Network.impl.connect"}

### Method `connect`

```silk
pub effect fn connect(self: &Self, address: &SocketAddress, deadline: Option<Instant>) -> Connection
      ! SocketError ? &mut MonotonicClock
```

Opens a TCP connection to `address`, or fails with the host error or timeout code 5.

::Anchor{id="Network.impl.listen"}

### Method `listen`

```silk
pub effect fn listen(self: &Self, address: &SocketAddress, deadline: Option<Instant>) -> Listener
      ! SocketError ? &mut MonotonicClock
```

Binds and starts a TCP listener, using the host's default backlog.
Port zero asks the host to choose a port; `Listener.address` returns it after binding.

::Anchor{id="Network.impl.Drop"}

## Implementation `Drop for Network`

```silk
impl Drop for Network
```

::Anchor{id="Network.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="Listener"}

## `Listener`

```silk
pub struct Listener
```

An owned TCP listener. Drop closes it. Accepted connections own their sockets independently.

::Anchor{id="Listener.impl"}

## Implementation `Listener`

```silk
impl Listener
```

::Anchor{id="Listener.impl.address"}

### Method `address`

```silk
pub effect fn address(self: &Self) -> SocketAddress ! SocketError
```

Returns the bound local address, including the port the host chose for a port-zero bind.

::Anchor{id="Listener.impl.accept"}

### Method `accept`

```silk
pub effect fn accept(self: &mut Self, deadline: Option<Instant>) -> Connection
      ! SocketError ? &mut MonotonicClock
```

Accepts a connection, polling until one arrives or the deadline expires.

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection
```

An owned TCP connection providing portable `ByteDuplex` operations.
Close and drop release input and output streams before releasing their parent socket.

::Anchor{id="Connection.impl"}

## Implementation `Connection`

```silk
impl Connection
```

::Anchor{id="Connection.impl.close"}

### Method `close`

```silk
pub fn close(self: &mut Self) -> ()
```

Closes the connection. Repeated calls do nothing.

::Anchor{id="Connection.impl.peer"}

### Method `peer`

```silk
pub effect fn peer(self: &Self) -> SocketAddress ! SocketError
```

Returns the remote peer address. Calling it on a closed connection fails with code 9.

::Anchor{id="Connection.impl.address"}

### Method `address`

```silk
pub effect fn address(self: &Self) -> SocketAddress ! SocketError
```

Returns the local address. Calling it on a closed connection fails with code 9.

::Anchor{id="Connection.impl.Drop"}

## Implementation `Drop for Connection`

```silk
impl Drop for Connection
```

::Anchor{id="Connection.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="Connection.impl.ByteDuplex"}

## Implementation `ByteDuplex for Connection`

```silk
impl ByteDuplex for Connection
```

::Anchor{id="Connection.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
unsafe effect fn readSomeRaw(self: &mut Self, output: &mut [u8], deadline: Option<Instant>) -> ReadTransfer
      ! ByteIoError ? &mut MonotonicClock
```

::Anchor{id="Connection.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
unsafe effect fn writeSomeRaw(self: &mut Self, input: &[u8], deadline: Option<Instant>) -> usize
      ! ByteIoError ? &mut MonotonicClock
```

::Anchor{id="Connection.impl.ByteDuplex.writeSomeVectoredRaw"}

### Operation `writeSomeVectoredRaw`

```silk
unsafe effect fn writeSomeVectoredRaw(self: &mut Self, inputs: &[&[u8]], deadline: Option<Instant>) -> usize
      ! ByteIoError ? &mut MonotonicClock
```

::Anchor{id="Connection.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
unsafe effect fn flushRaw(self: &mut Self, deadline: Option<Instant>) -> ()
      ! ByteIoError ? &mut MonotonicClock
```

::Anchor{id="Connection.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
unsafe effect fn shutdownWriteRaw(self: &mut Self, deadline: Option<Instant>) -> ()
      ! ByteIoError ? &mut MonotonicClock
```

::Anchor{id="Connection.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
unsafe effect fn closeRaw(self: &mut Self) -> () ! ByteIoError
```

Category: Networking.

Profiles: `wasm32-wasip2`.
