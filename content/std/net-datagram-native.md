Nonblocking UDP sockets on the native system: send and receive whole datagrams.

## When to use
Use a [`NativeUdpSocket`](#NativeUdpSocket) to send datagrams, such as DNS queries, from a native program. Every
socket is nonblocking: a send or a receive that cannot complete now returns `WouldBlock` and does
not wait. Call [`NativeUdpSocket.waitReadable`](#NativeUdpSocket.impl.waitReadable) to wait, or register
[`NativeUdpSocket.rawDescriptor`](#NativeUdpSocket.impl.rawDescriptor) with your own event loop.

## Details
A socket is IPv4 or IPv6, and is closed when it is dropped. A socket made for IPv6 does not
accept IPv4 traffic. After [`NativeUdpSocket.connect`](#NativeUdpSocket.impl.connect), the system drops datagrams from other
peers, and reports `ConnectionRefused` when the peer reports that its port is closed.
[`waitAny`](#waitAny) waits for any of several sockets.

The module supports Linux with GNU libc, macOS, and Windows on x86_64.

## Examples
### Send a datagram to yourself

```silk
import silk.core.effect { Effect }
import silk.net.address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.net.datagram_native { DatagramError, Family, NativeUdpSocket, Received, Sent }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }

effect fn program() -> i32 ! DatagramError ? &mut MonotonicClock {
  let loopback = IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }
  let mut socket = run NativeUdpSocket.open(Family.V4)
  run NativeUdpSocket.bind(&mut socket, Endpoint.make(loopback, Port.fromU16(0)))
  let local = run NativeUdpSocket.localEndpoint(&socket)
  match run NativeUdpSocket.sendTo(&mut socket, b"ping", local) {
    Sent.Count { count } => {
      if count != 4 { return 1 }
    }
    Sent.WouldBlock => { return 1 }
  }
  let now = run MonotonicClock.now()
  if !(run NativeUdpSocket.waitReadable(&socket, MonotonicClock.deadlineAfter(&now, 1000000000))) {
    return 1
  }
  let mut buffer: [u8; 16] = [0; 16]
  return match run NativeUdpSocket.receive(&mut socket, &mut buffer) {
    Received.Datagram { count, from } => {
      if count != 4 || buffer[0] != 112 || !Endpoint.equals(&from, &local) { return 1 }
      return 0
    }
    Received.WouldBlock => 1
  }
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut clock = OsMonotonicClock.make()
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<MonotonicClock>(&mut clock)
}
```

Import as `NativeUdpSocket` with `import silk.net.datagram_native { NativeUdpSocket }`.

Public declarations: 9.

::Anchor{id="RawSocket"}

## `RawSocket`

```silk
pub type RawSocket = i32
```

The type of a raw socket handle: a file descriptor.

::Anchor{id="Family"}

## `Family`

```silk
pub enum Family
```

The address family of a socket.

::Anchor{id="Family.V4"}

### `V4`

```silk
V4
```

IPv4.

::Anchor{id="Family.V6"}

### `V6`

```silk
V6
```

IPv6.

::Anchor{id="MulticastInterface"}

## `MulticastInterface`

```silk
pub union MulticastInterface
```

The network interface for multicast traffic, in [`NativeUdpSocket.setMulticastInterface`](#NativeUdpSocket.impl.setMulticastInterface) and
the group calls such as [`NativeUdpSocket.joinGroup`](#NativeUdpSocket.impl.joinGroup).

::Anchor{id="MulticastInterface.Default"}

### `Default`

```silk
Default
```

The interface that the system chooses.

::Anchor{id="MulticastInterface.V4"}

### `V4`

```silk
V4
```

The IPv4 interface with this local address. Use it with IPv4 groups.

::Anchor{id="MulticastInterface.V4.address"}

#### Field `address`

```silk
pub address: Ipv4Address
```

The local address of the interface.

::Anchor{id="MulticastInterface.V6"}

### `V6`

```silk
V6
```

The IPv6 interface with this index, as `if_nametoindex` returns it. Use it with IPv6 groups.

::Anchor{id="MulticastInterface.V6.index"}

#### Field `index`

```silk
pub index: u32
```

The index of the interface.

::Anchor{id="MulticastInterface.impl.Copy"}

## Implementation `Copy for MulticastInterface`

```silk
impl Copy for MulticastInterface
```

::Anchor{id="DatagramOperation"}

## `DatagramOperation`

```silk
pub enum DatagramOperation
```

The system call that failed.

::Anchor{id="DatagramOperation.Socket"}

### `Socket`

```silk
Socket
```

Making the socket.

::Anchor{id="DatagramOperation.Configure"}

### `Configure`

```silk
Configure
```

Making the socket nonblocking and not inherited by child processes.

::Anchor{id="DatagramOperation.Bind"}

### `Bind`

```silk
Bind
```

Binding a local address.

::Anchor{id="DatagramOperation.Connect"}

### `Connect`

```silk
Connect
```

Connecting to a peer.

::Anchor{id="DatagramOperation.Send"}

### `Send`

```silk
Send
```

Sending a datagram.

::Anchor{id="DatagramOperation.Receive"}

### `Receive`

```silk
Receive
```

Receiving a datagram.

::Anchor{id="DatagramOperation.LocalAddress"}

### `LocalAddress`

```silk
LocalAddress
```

Reading the local address.

::Anchor{id="DatagramOperation.PeerAddress"}

### `PeerAddress`

```silk
PeerAddress
```

Reading the address of the connected peer.

::Anchor{id="DatagramOperation.Disconnect"}

### `Disconnect`

```silk
Disconnect
```

Removing the connected peer.

::Anchor{id="DatagramOperation.Option"}

### `Option`

```silk
Option
```

Reading or setting a socket option, such as the TTL or a multicast group.

::Anchor{id="DatagramOperation.Wait"}

### `Wait`

```silk
Wait
```

Waiting for a datagram.

::Anchor{id="DatagramOperation.impl.Debug"}

## Implementation `Debug for DatagramOperation`

```silk
impl Debug for DatagramOperation
```

::Anchor{id="DatagramOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Send`.

::Anchor{id="DatagramError"}

## `DatagramError`

```silk
pub union DatagramError
```

The error from a UDP socket operation.

::Anchor{id="DatagramError.ConnectionRefused"}

### `ConnectionRefused`

```silk
ConnectionRefused
```

The peer reported that its port is closed. On Linux and macOS only a connected socket gets
this; on Windows any socket can.

::Anchor{id="DatagramError.ConnectionRefused.operation"}

#### Field `operation`

```silk
pub operation: DatagramOperation
```

The operation that saw the report.

::Anchor{id="DatagramError.AddressInUse"}

### `AddressInUse`

```silk
AddressInUse
```

The local address is in use.

::Anchor{id="DatagramError.PermissionDenied"}

### `PermissionDenied`

```silk
PermissionDenied
```

The system does not allow the operation, for example a bind to a privileged port.

::Anchor{id="DatagramError.NetworkUnreachable"}

### `NetworkUnreachable`

```silk
NetworkUnreachable
```

The network or host of the peer cannot be reached.

::Anchor{id="DatagramError.MessageTooLarge"}

### `MessageTooLarge`

```silk
MessageTooLarge
```

The datagram is too long to send, or, on Windows, too long for the receive buffer.

::Anchor{id="DatagramError.FamilyUnsupported"}

### `FamilyUnsupported`

```silk
FamilyUnsupported
```

The address family is not supported or not enabled.

::Anchor{id="DatagramError.InvalidNativeAddress"}

### `InvalidNativeAddress`

```silk
InvalidNativeAddress
```

The system returned an address that is not IPv4 or IPv6.

::Anchor{id="DatagramError.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

Another system error.

::Anchor{id="DatagramError.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: DatagramOperation
```

The operation that failed.

::Anchor{id="DatagramError.NativeFailure.code"}

#### Field `code`

```silk
pub code: i32
```

The `errno` value, or the Winsock error code on Windows.

::Anchor{id="DatagramError.impl.Debug"}

## Implementation `Debug for DatagramError`

```silk
impl Debug for DatagramError
```

::Anchor{id="DatagramError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant and its fields, such as `NativeFailure { ... }`.

::Anchor{id="Sent"}

## `Sent`

```silk
pub union Sent
```

The result of a send.

::Anchor{id="Sent.Count"}

### `Count`

```silk
Count
```

The system took the whole datagram.

::Anchor{id="Sent.Count.count"}

#### Field `count`

```silk
pub count: usize
```

The number of bytes sent, which is the length of the datagram.

::Anchor{id="Sent.WouldBlock"}

### `WouldBlock`

```silk
WouldBlock
```

The send buffer is full. Try again later.

::Anchor{id="Received"}

## `Received`

```silk
pub union Received
```

The result of a receive.

::Anchor{id="Received.Datagram"}

### `Datagram`

```silk
Datagram
```

One datagram is at the start of the buffer.

::Anchor{id="Received.Datagram.count"}

#### Field `count`

```silk
pub count: usize
```

The number of bytes of the datagram in the buffer. A longer datagram is cut to the buffer
length on Linux and macOS.

::Anchor{id="Received.Datagram.from"}

#### Field `from`

```silk
pub from: Endpoint
```

The address that sent the datagram.

::Anchor{id="Received.WouldBlock"}

### `WouldBlock`

```silk
WouldBlock
```

No datagram is waiting. Try again later.

::Anchor{id="NativeUdpSocket"}

## `NativeUdpSocket`

```silk
pub struct NativeUdpSocket
```

A nonblocking UDP socket. It is closed when it is dropped.

::Anchor{id="NativeUdpSocket.impl.Drop"}

## Implementation `Drop for NativeUdpSocket`

```silk
impl Drop for NativeUdpSocket
```

::Anchor{id="NativeUdpSocket.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut NativeUdpSocket) -> ()
```

::Anchor{id="NativeUdpSocket.impl"}

## Implementation `NativeUdpSocket`

```silk
impl NativeUdpSocket
```

::Anchor{id="NativeUdpSocket.impl.open"}

### Associated function `open`

```silk
pub effect fn open(family: Family) -> NativeUdpSocket
    ! DatagramError
```

Makes an unbound UDP socket for `family`. It is nonblocking, and child processes do not get it.

#### Errors
- `FamilyUnsupported` if the system has no support for `family`.
- Another `DatagramError` if the system cannot make the socket.

::Anchor{id="NativeUdpSocket.impl.adopt"}

### Associated function `adopt`

```silk
pub unsafe effect fn adopt(fd: RawSocket, family: Family) -> NativeUdpSocket
    ! DatagramError
```

Takes an open UDP socket of `family`, such as one that another process sent, and makes it
nonblocking and kept from child processes. The returned socket owns `fd` and closes it when
it is dropped.

#### When to use
Use it for a socket descriptor that this program did not make, as Node's `dgram` does for a
socket shared by a cluster primary. Use [`NativeUdpSocket.open`](#NativeUdpSocket.impl.open) for a new socket.

#### Safety
`fd` must be an open UDP socket of `family` that nothing else closes.

#### Errors
- A `DatagramError` with operation `Configure` if the system cannot set the socket flags. The
  socket is closed then.

::Anchor{id="NativeUdpSocket.impl.family"}

### Method `family`

```silk
pub fn family(self: &Self) -> Family
```

Returns the family of the socket.

::Anchor{id="NativeUdpSocket.impl.rawDescriptor"}

### Method `rawDescriptor`

```silk
pub fn rawDescriptor(self: &Self) -> RawSocket
```

Returns the raw handle of the socket, for example to register it with an event loop. The socket
still owns it: do not close it.

::Anchor{id="NativeUdpSocket.impl.bind"}

### Method `bind`

```silk
pub effect fn bind(self: &mut Self, endpoint: Endpoint) -> ()
    ! DatagramError
```

Binds the socket to the local address `endpoint`. Port 0 lets the system choose a free port.

#### Errors
- `AddressInUse`, `PermissionDenied`, or another `DatagramError` from the system.
- `FamilyUnsupported` if `endpoint` is not of the family of the socket.

::Anchor{id="NativeUdpSocket.impl.connect"}

### Method `connect`

```silk
pub effect fn connect(self: &mut Self, endpoint: Endpoint) -> ()
    ! DatagramError
```

Connects the socket to `endpoint`: [`NativeUdpSocket.send`](#NativeUdpSocket.impl.send) then goes there, and the system
drops datagrams from other addresses.

#### Errors
- `NetworkUnreachable`, or another `DatagramError` from the system.
- `FamilyUnsupported` if `endpoint` is not of the family of the socket.

::Anchor{id="NativeUdpSocket.impl.localEndpoint"}

### Method `localEndpoint`

```silk
pub effect fn localEndpoint(self: &Self) -> Endpoint
    ! DatagramError
```

Returns the local address of the socket, such as the port that the system chose.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.peerEndpoint"}

### Method `peerEndpoint`

```silk
pub effect fn peerEndpoint(self: &Self) -> Endpoint
    ! DatagramError
```

Returns the address of the peer that [`NativeUdpSocket.connect`](#NativeUdpSocket.impl.connect) set.

#### Errors
- A `DatagramError` from the system, such as `NativeFailure` with operation `PeerAddress` and
  `ENOTCONN` when the socket is not connected.

::Anchor{id="NativeUdpSocket.impl.disconnect"}

### Method `disconnect`

```silk
pub effect fn disconnect(self: &mut Self) -> ()
    ! DatagramError
```

Removes the peer that [`NativeUdpSocket.connect`](#NativeUdpSocket.impl.connect) set, so that the socket can send to and
receive from any address again. The socket stays bound to its local address.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setIpv6Only"}

### Method `setIpv6Only`

```silk
pub effect fn setIpv6Only(self: &mut Self, enabled: bool) -> ()
    ! DatagramError
```

Sets whether an IPv6 socket takes only IPv6 traffic (`IPV6_V6ONLY`). [`NativeUdpSocket.open`](#NativeUdpSocket.impl.open)
turns it on. Turn it off before [`NativeUdpSocket.bind`](#NativeUdpSocket.impl.bind) to take IPv4 traffic too, as
IPv4-mapped IPv6 addresses.

#### Errors
- `FamilyUnsupported` for an IPv4 socket.
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setReuseAddress"}

### Method `setReuseAddress`

```silk
pub effect fn setReuseAddress(self: &mut Self, enabled: bool) -> ()
    ! DatagramError
```

Sets whether other sockets can bind the same address and port, as several receivers of one
multicast group do. Call it before [`NativeUdpSocket.bind`](#NativeUdpSocket.impl.bind).

#### Details
It sets `SO_REUSEADDR`. On macOS it also sets `SO_REUSEPORT`, which macOS needs to share a
port.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setBroadcast"}

### Method `setBroadcast`

```silk
pub effect fn setBroadcast(self: &mut Self, enabled: bool) -> ()
    ! DatagramError
```

Sets whether the socket can send to broadcast addresses (`SO_BROADCAST`).

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setTtl"}

### Method `setTtl`

```silk
pub effect fn setTtl(self: &mut Self, hops: u8) -> ()
    ! DatagramError
```

Sets the hop limit of unicast datagrams: `IP_TTL` for an IPv4 socket and
`IPV6_UNICAST_HOPS` for an IPv6 socket.

#### Errors
- A `DatagramError` from the system, such as `NativeFailure` with `EINVAL` for 0 on some
  systems.

::Anchor{id="NativeUdpSocket.impl.setMulticastTtl"}

### Method `setMulticastTtl`

```silk
pub effect fn setMulticastTtl(self: &mut Self, hops: u8) -> ()
    ! DatagramError
```

Sets the hop limit of multicast datagrams: `IP_MULTICAST_TTL` for an IPv4 socket and
`IPV6_MULTICAST_HOPS` for an IPv6 socket. 0 keeps them on this host.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setMulticastLoopback"}

### Method `setMulticastLoopback`

```silk
pub effect fn setMulticastLoopback(self: &mut Self, enabled: bool) -> ()
    ! DatagramError
```

Sets whether this host gets the multicast datagrams that the socket sends:
`IP_MULTICAST_LOOP` or `IPV6_MULTICAST_LOOP`.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setMulticastInterface"}

### Method `setMulticastInterface`

```silk
pub effect fn setMulticastInterface(self: &mut Self, via: MulticastInterface) -> ()
    ! DatagramError
```

Sets the interface that sends the multicast datagrams of the socket: `IP_MULTICAST_IF` or
`IPV6_MULTICAST_IF`. `Default` lets the system choose again.

#### Errors
- `FamilyUnsupported` if `via` is `V4` for an IPv6 socket, or `V6` for an IPv4 socket.
- A `DatagramError` from the system, such as `NativeFailure` with `EADDRNOTAVAIL` when no
  interface has the address.

::Anchor{id="NativeUdpSocket.impl.joinGroup"}

### Method `joinGroup`

```silk
pub effect fn joinGroup(self: &mut Self, group: IpAddress, via: MulticastInterface) -> ()
    ! DatagramError
```

Joins the multicast group `group` on `via`, so that the socket gets its datagrams.

#### Details
The family of `group` chooses the option: `IP_ADD_MEMBERSHIP` for IPv4 and `IPV6_JOIN_GROUP`
for IPv6. Bind the socket to the port of the group first.

#### Errors
- `FamilyUnsupported` if `via` is of the other family than `group`.
- A `DatagramError` from the system, such as `NativeFailure` with `EINVAL` when `group` is not
  a multicast address, or `EADDRINUSE` when the socket is already a member.

::Anchor{id="NativeUdpSocket.impl.leaveGroup"}

### Method `leaveGroup`

```silk
pub effect fn leaveGroup(self: &mut Self, group: IpAddress, via: MulticastInterface) -> ()
    ! DatagramError
```

Leaves the multicast group `group` on `via`, which [`NativeUdpSocket.joinGroup`](#NativeUdpSocket.impl.joinGroup) joined.

#### Errors
- `FamilyUnsupported` if `via` is of the other family than `group`.
- A `DatagramError` from the system, such as `NativeFailure` with `EADDRNOTAVAIL` when the
  socket is not a member.

::Anchor{id="NativeUdpSocket.impl.joinSourceGroup"}

### Method `joinSourceGroup`

```silk
pub effect fn joinSourceGroup(
    self: &mut Self,
    group: IpAddress,
    source: IpAddress,
    via: MulticastInterface,
  ) -> ()
    ! DatagramError
```

Joins the multicast group `group` on `via` for datagrams from `source` only
(source-specific multicast).

#### Details
IPv4 uses `IP_ADD_SOURCE_MEMBERSHIP`. IPv6 uses `MCAST_JOIN_SOURCE_GROUP`.

#### Errors
- `FamilyUnsupported` if `group`, `source`, and `via` are not all of one family.
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.leaveSourceGroup"}

### Method `leaveSourceGroup`

```silk
pub effect fn leaveSourceGroup(
    self: &mut Self,
    group: IpAddress,
    source: IpAddress,
    via: MulticastInterface,
  ) -> ()
    ! DatagramError
```

Leaves the source-specific group that [`NativeUdpSocket.joinSourceGroup`](#NativeUdpSocket.impl.joinSourceGroup) joined.

#### Errors
- `FamilyUnsupported` if `group`, `source`, and `via` are not all of one family.
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.receiveBufferSize"}

### Method `receiveBufferSize`

```silk
pub effect fn receiveBufferSize(self: &Self) -> usize
    ! DatagramError
```

Returns the size of the receive buffer of the socket in bytes (`SO_RCVBUF`).

#### Details
Linux reports twice the size that [`NativeUdpSocket.setReceiveBufferSize`](#NativeUdpSocket.impl.setReceiveBufferSize) set, because it
counts its bookkeeping.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setReceiveBufferSize"}

### Method `setReceiveBufferSize`

```silk
pub effect fn setReceiveBufferSize(self: &mut Self, size: usize) -> ()
    ! DatagramError
```

Asks the system for a receive buffer of `size` bytes (`SO_RCVBUF`). The system can round or
cap it.

#### Errors
- `NativeFailure` with operation `Option` and `EINVAL` if `size` does not fit in an `int`.
- Another `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.sendBufferSize"}

### Method `sendBufferSize`

```silk
pub effect fn sendBufferSize(self: &Self) -> usize
    ! DatagramError
```

Returns the size of the send buffer of the socket in bytes (`SO_SNDBUF`).

#### Details
Linux reports twice the size that [`NativeUdpSocket.setSendBufferSize`](#NativeUdpSocket.impl.setSendBufferSize) set, because it
counts its bookkeeping.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.setSendBufferSize"}

### Method `setSendBufferSize`

```silk
pub effect fn setSendBufferSize(self: &mut Self, size: usize) -> ()
    ! DatagramError
```

Asks the system for a send buffer of `size` bytes (`SO_SNDBUF`). The system can round or cap
it.

#### Errors
- `NativeFailure` with operation `Option` and `EINVAL` if `size` does not fit in an `int`.
- Another `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.send"}

### Method `send`

```silk
pub effect fn send(self: &mut Self, datagram: &[u8]) -> Sent
    ! DatagramError
```

Sends `datagram` to the connected peer.

#### Errors
- `ConnectionRefused` if the peer reported a closed port for an earlier datagram.
- `MessageTooLarge`, or another `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.sendTo"}

### Method `sendTo`

```silk
pub effect fn sendTo(self: &mut Self, datagram: &[u8], endpoint: Endpoint) -> Sent
    ! DatagramError
```

Sends `datagram` to `endpoint`.

#### Errors
- `FamilyUnsupported` if `endpoint` is not of the family of the socket.
- `MessageTooLarge`, `NetworkUnreachable`, or another `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.receive"}

### Method `receive`

```silk
pub effect fn receive(self: &mut Self, buffer: &mut [u8]) -> Received
    ! DatagramError
```

Receives one datagram into `buffer`, if one is waiting.

#### Details
A datagram longer than `buffer` is cut to its length on Linux and macOS. Use a buffer of 65535
bytes to get every datagram whole.

#### Errors
- `ConnectionRefused` if the socket is connected and the peer reported a closed port.
- `MessageTooLarge` on Windows, for a datagram longer than `buffer`.
- Another `DatagramError` from the system.

::Anchor{id="NativeUdpSocket.impl.waitReadable"}

### Method `waitReadable`

```silk
pub effect fn waitReadable(self: &Self, deadline: Instant) -> bool
    ! DatagramError
    ? &mut MonotonicClock
```

Waits until a datagram or an error is waiting on the socket, or until `deadline` on the
`MonotonicClock`. Returns `false` if the deadline passed first.

#### When to use
Use it in a program without an event loop. It blocks the thread.

#### Errors
- A `DatagramError` from the system.

::Anchor{id="waitAny"}

## `waitAny`

```silk
pub effect fn waitAny(sockets: &[NativeUdpSocket], deadline: Instant) -> bool
  ! DatagramError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator
```

Waits until a datagram or an error is waiting on any of `sockets`, or until `deadline` on the
`MonotonicClock`. Returns `false` if the deadline passed first.

### When to use
Use it in a program without an event loop, then call [`NativeUdpSocket.receive`](#NativeUdpSocket.impl.receive) on each socket:
a socket that has nothing returns `Received.WouldBlock`. It blocks the thread.

### Errors
- A `DatagramError` from the system.
- `OutOfMemoryError` if the `Allocator` cannot supply the list of sockets for the system.

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `wasm64-unknown-unknown`.
