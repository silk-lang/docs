TCP and Unix socket connections and listeners, as `ByteDuplex` providers.

## When to use
- To connect, call [`connectResolved`](#connectResolved) with endpoints from `silk.net.resolver`, or [`connectUnix`](#connectUnix)
  with a socket path. The connection is lent to a callback and closed after it. Use
  [`connectResolvedOwned`](#connectResolvedOwned) or [`connectUnixOwned`](#connectUnixOwned) to keep the [`Connection`](#Connection) yourself.
- To serve, call [`listen`](#listen) or [`listenUnix`](#listenUnix), then [`accept`](#accept) for each client. Use
  [`withAccepted`](#withAccepted) to get the connection and the peer address, and close them after.
- To drive sockets from your own readiness loop, such as one on `silk.io.reactor`, use the
  calls that never wait: [`startConnect`](#startConnect) or [`startConnectUnix`](#startConnectUnix) with
  [`Connection.finishConnect`](#Connection.impl.finishConnect), [`Listener.tryAccept`](#Listener.impl.tryAccept), [`Connection.tryRead`](#Connection.impl.tryRead),
  [`Connection.tryWrite`](#Connection.impl.tryWrite), and [`Connection.tryWriteVectored`](#Connection.impl.tryWriteVectored). They return `WouldBlock` when the
  socket is not ready. Register [`Connection.rawDescriptor`](#Connection.impl.rawDescriptor) or [`Listener.rawDescriptor`](#Listener.impl.rawDescriptor) with
  the loop, and try again when it reports the socket ready.

A [`Connection`](#Connection) provides `ByteDuplex`, so `silk.http.exchange`, `silk.http.server`, and
`silk.io.buffered_duplex` can use it.

## Details
All sockets are nonblocking. When a socket is not ready, a waiting operation waits for the poll
interval with `MonotonicClock`, then tries again. So an idle wait costs about one check for each
interval. One deadline covers all attempts of one connect or accept.

A connect tries the endpoints in their order, until one connects or the attempt limit is
reached. A flush means that the kernel accepted the bytes, not that the peer got them.

## Errors
[`NativeSocketError`](#NativeSocketError) tells the rule, the system error, or the deadline. When all endpoints
fail, `AttemptsExhausted` has the error of the last attempt.

## Gotchas
- With a deadline of `None`, a connect or accept can wait forever.
- Closing a Unix listener does not remove its socket file. Remove it yourself.
- Scoped functions close the socket on return, error, and cancellation. A trap does not.
- On Darwin, socket setup is not safe against a `fork` in another thread.
- Supported targets are Windows x86_64 MSVC, Darwin x86_64 or aarch64, and GNU/Linux x86_64 or aarch64.
- Windows uses nonblocking Winsock TCP sockets; Unix-domain operations return `FamilyUnsupported`.
  Each live descriptor keeps Winsock initialized. Socket handles are pointer-sized.

## Examples
### Connect to a local listener
```silk
import silk.io.byte_duplex { ByteDuplex, ByteIoError, ReadTransfer }
import silk.core.effect { Effect }
import silk.system.monotonic_clock { MonotonicClock }
import silk.net.socket_native {
  AcceptedView,
  BoundAddress,
  ConnectOptions,
  Connection,
  ListenOptions,
  Listener,
  NativeSocketError,
  accept,
  connectResolvedOwned,
  listen,
  withAccepted,
}
import silk.net.address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.core.option { Option }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.system.system_clock { Instant }

// Reads one byte from the client and answers with one byte.
effect fn answer<'call>(view: &'call mut AcceptedView<'call>) -> i32
  ! ByteIoError
  ? &mut MonotonicClock {
  let mut input: [u8; 1] = [0]
  match move run ByteDuplex.readSome(&mut input, Option<Instant>.none())
    |> Effect.provideMut<ByteDuplex>(&mut view.connection.*) {
    ReadTransfer.Data { count } => {
      if count != 1 || input[0] != 120 {
        return 1
      }
    }
    ReadTransfer.End => {
      return 1
    }
  }

  // One byte is always written at once, or the call fails.
  let written = run ByteDuplex.writeSome(b"y", Option<Instant>.none())
    |> Effect.provideMut<ByteDuplex>(&mut view.connection.*)
  if written != 1 {
    return 1
  }
  return 0
}

effect fn program() -> i32
  ! NativeSocketError | ByteIoError
  ? &mut MonotonicClock {
  // Port 0 asks the system for a free port.
  let local = Endpoint.make(
    IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) },
    Port.fromU16(0)
  )
  let mut listener = run listen(local, ListenOptions.defaults())
  let bound = match Listener.boundAddress(&listener) {
    BoundAddress.Tcp { endpoint } => endpoint
    _ => {
      return 1
    }
  }
  let targets = [bound]
  let mut client = run connectResolvedOwned(
    &targets,
    ConnectOptions.defaults(),
    Option<Instant>.none()
  )
  let sent = run ByteDuplex.writeSome(b"x", Option<Instant>.none())
    |> Effect.provideMut<ByteDuplex>(&mut client)
  if sent != 1 {
    return 1
  }
  let accepted = run accept(&mut listener, Option<Instant>.none())
  run Listener.close(&mut listener)
  let served = run withAccepted<i32, ByteIoError>(move accepted, answer)
  let mut reply: [u8; 1] = [0]
  let read = run ByteDuplex.readSome(&mut reply, Option<Instant>.none())
    |> Effect.provideMut<ByteDuplex>(&mut client)
  run Connection.close(&mut client)
  return match move read {
    ReadTransfer.Data { count } => {
      if served != 0 || count != 1 || reply[0] != 121 {
        return 1
      }
      return 0
    }
    ReadTransfer.End => 1
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

Import as `NativeSocket` with `import silk.net.socket_native { NativeSocket }`.

Public declarations: 42.

::Anchor{id="RawSocket"}

## `RawSocket`

```silk
pub type RawSocket = i32
```

A socket descriptor of the system: a POSIX file descriptor, or a pointer-sized Winsock
`SOCKET` on Windows.

Get it from [`Connection.rawDescriptor`](#Connection.impl.rawDescriptor) or [`Listener.rawDescriptor`](#Listener.impl.rawDescriptor) to register the socket
with a readiness queue, such as `silk.io.reactor`. The socket stays owned by its connection or
listener: do not close it.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The state of a [`Connection`](#Connection).

::Anchor{id="ConnectionPhase.Connecting"}

### `Connecting`

```silk
Connecting
```

The connect has not finished.

::Anchor{id="ConnectionPhase.Open"}

### `Open`

```silk
Open
```

Reads and writes are allowed.

::Anchor{id="ConnectionPhase.WriteClosed"}

### `WriteClosed`

```silk
WriteClosed
```

The write side is shut down. Reads are still allowed.

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

The socket is closed.

::Anchor{id="NativeSocketOperation"}

## `NativeSocketOperation`

```silk
pub enum NativeSocketOperation
```

The system call that failed.

::Anchor{id="NativeSocketOperation.Socket"}

### `Socket`

```silk
Socket
```

`socket`: create the socket.

::Anchor{id="NativeSocketOperation.Configure"}

### `Configure`

```silk
Configure
```

Set descriptor flags or socket options.

::Anchor{id="NativeSocketOperation.Connect"}

### `Connect`

```silk
Connect
```

`connect`.

::Anchor{id="NativeSocketOperation.Bind"}

### `Bind`

```silk
Bind
```

`bind`.

::Anchor{id="NativeSocketOperation.Listen"}

### `Listen`

```silk
Listen
```

`listen`.

::Anchor{id="NativeSocketOperation.GetSocketName"}

### `GetSocketName`

```silk
GetSocketName
```

`getsockname`: read the bound address.

::Anchor{id="NativeSocketOperation.GetPeerName"}

### `GetPeerName`

```silk
GetPeerName
```

`getpeername`: read the address of the peer.

::Anchor{id="NativeSocketOperation.Accept"}

### `Accept`

```silk
Accept
```

`accept`.

::Anchor{id="NativeSocketOperation.ConvertAddress"}

### `ConvertAddress`

```silk
ConvertAddress
```

Convert an address that the system returned.

::Anchor{id="NativeSocketOperation.Poll"}

### `Poll`

```silk
Poll
```

`poll`: check if the socket is ready.

::Anchor{id="NativeSocketOperation.GetSocketOption"}

### `GetSocketOption`

```silk
GetSocketOption
```

`getsockopt`: read the error of the socket.

::Anchor{id="NativeSocketOperation.Read"}

### `Read`

```silk
Read
```

`read`.

::Anchor{id="NativeSocketOperation.Write"}

### `Write`

```silk
Write
```

`write`.

::Anchor{id="NativeSocketOperation.ShutdownWrite"}

### `ShutdownWrite`

```silk
ShutdownWrite
```

`shutdown` of the write side.

::Anchor{id="NativeSocketOperation.Close"}

### `Close`

```silk
Close
```

`close`.

::Anchor{id="NativeSocketOperation.impl.Debug"}

## Implementation `Debug for NativeSocketOperation`

```silk
impl Debug for NativeSocketOperation
```

::Anchor{id="NativeSocketOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Socket`.

::Anchor{id="ListenerPhase"}

## `ListenerPhase`

```silk
pub enum ListenerPhase
```

The state of a [`Listener`](#Listener).

::Anchor{id="ListenerPhase.Open"}

### `Open`

```silk
Open
```

The listener accepts clients.

::Anchor{id="ListenerPhase.Closed"}

### `Closed`

```silk
Closed
```

The listener is closed.

::Anchor{id="ListenOptionsReason"}

## `ListenOptionsReason`

```silk
pub enum ListenOptionsReason
```

The [`ListenOptions`](#ListenOptions) value that is not valid.

::Anchor{id="ListenOptionsReason.KernelBacklog"}

### `KernelBacklog`

```silk
KernelBacklog
```

The backlog is not 1 through 65535.

::Anchor{id="ListenOptionsReason.PollInterval"}

### `PollInterval`

```silk
PollInterval
```

The poll interval is not 1 nanosecond through 1 second.

::Anchor{id="ListenOptionsReason.impl.Debug"}

## Implementation `Debug for ListenOptionsReason`

```silk
impl Debug for ListenOptionsReason
```

::Anchor{id="ListenOptionsReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `KernelBacklog`.

::Anchor{id="ListenOptionsError"}

## `ListenOptionsError`

```silk
pub struct ListenOptionsError
```

The error of [`ListenOptions.make`](#ListenOptions.impl.make).

::Anchor{id="ListenOptionsError.reason"}

### Field `reason`

```silk
pub reason: ListenOptionsReason
```

The value that is not valid.

::Anchor{id="ListenOptionsError.value"}

### Field `value`

```silk
pub value: u64
```

The value that you gave.

::Anchor{id="ListenOptionsError.impl.Debug"}

## Implementation `Debug for ListenOptionsError`

```silk
impl Debug for ListenOptionsError
```

::Anchor{id="ListenOptionsError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `ListenOptionsError { reason: ..., value: ... }`.

::Anchor{id="InvalidBindReason"}

## `InvalidBindReason`

```silk
pub enum InvalidBindReason
```

Why a Unix socket path for [`listenUnix`](#listenUnix) is not valid.

::Anchor{id="InvalidBindReason.EmptyPath"}

### `EmptyPath`

```silk
EmptyPath
```

The path is empty.

::Anchor{id="InvalidBindReason.RelativePath"}

### `RelativePath`

```silk
RelativePath
```

The path does not start with `/`.

::Anchor{id="InvalidBindReason.NulPath"}

### `NulPath`

```silk
NulPath
```

The path has a NUL byte.

::Anchor{id="InvalidBindReason.AbstractPath"}

### `AbstractPath`

```silk
AbstractPath
```

The path is an abstract socket address, which is not supported.

::Anchor{id="InvalidBindReason.impl.Debug"}

## Implementation `Debug for InvalidBindReason`

```silk
impl Debug for InvalidBindReason
```

::Anchor{id="InvalidBindReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `EmptyPath`.

::Anchor{id="ConnectOptionsReason"}

## `ConnectOptionsReason`

```silk
pub enum ConnectOptionsReason
```

The [`ConnectOptions`](#ConnectOptions) value that is not valid.

::Anchor{id="ConnectOptionsReason.PollInterval"}

### `PollInterval`

```silk
PollInterval
```

The poll interval is not 1 nanosecond through 1 second.

::Anchor{id="ConnectOptionsReason.MaxAttempts"}

### `MaxAttempts`

```silk
MaxAttempts
```

The attempt limit is not 1 through 1024.

::Anchor{id="ConnectOptionsReason.impl.Debug"}

## Implementation `Debug for ConnectOptionsReason`

```silk
impl Debug for ConnectOptionsReason
```

::Anchor{id="ConnectOptionsReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `PollInterval`.

::Anchor{id="ConnectOptionsError"}

## `ConnectOptionsError`

```silk
pub struct ConnectOptionsError
```

The error of [`ConnectOptions.make`](#ConnectOptions.impl.make).

::Anchor{id="ConnectOptionsError.reason"}

### Field `reason`

```silk
pub reason: ConnectOptionsReason
```

The value that is not valid.

::Anchor{id="ConnectOptionsError.value"}

### Field `value`

```silk
pub value: u64
```

The value that you gave.

::Anchor{id="ConnectOptionsError.impl.Debug"}

## Implementation `Debug for ConnectOptionsError`

```silk
impl Debug for ConnectOptionsError
```

::Anchor{id="ConnectOptionsError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `ConnectOptionsError { reason: ..., value: ... }`.

::Anchor{id="InvalidEndpointReason"}

## `InvalidEndpointReason`

```silk
pub enum InvalidEndpointReason
```

Why the endpoints or the Unix socket path of a connect are not valid.

::Anchor{id="InvalidEndpointReason.EmptyEndpoints"}

### `EmptyEndpoints`

```silk
EmptyEndpoints
```

The endpoint list is empty.

::Anchor{id="InvalidEndpointReason.TooManyEndpoints"}

### `TooManyEndpoints`

```silk
TooManyEndpoints
```

There are more endpoints than the attempt limit.

::Anchor{id="InvalidEndpointReason.EmptyPath"}

### `EmptyPath`

```silk
EmptyPath
```

The path is empty.

::Anchor{id="InvalidEndpointReason.RelativePath"}

### `RelativePath`

```silk
RelativePath
```

The path does not start with `/`.

::Anchor{id="InvalidEndpointReason.NulPath"}

### `NulPath`

```silk
NulPath
```

The path has a NUL byte.

::Anchor{id="InvalidEndpointReason.PathTooLong"}

### `PathTooLong`

```silk
PathTooLong
```

The path is too long for a socket address.

::Anchor{id="InvalidEndpointReason.AbstractPath"}

### `AbstractPath`

```silk
AbstractPath
```

The path is an abstract socket address, which is not supported.

::Anchor{id="InvalidEndpointReason.impl.Debug"}

## Implementation `Debug for InvalidEndpointReason`

```silk
impl Debug for InvalidEndpointReason
```

::Anchor{id="InvalidEndpointReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `EmptyEndpoints`.

::Anchor{id="AttemptFailure"}

## `AttemptFailure`

```silk
pub union AttemptFailure
```

The error of the last connect attempt, in `AttemptsExhausted`.

::Anchor{id="AttemptFailure.ConnectionRefused"}

### `ConnectionRefused`

```silk
ConnectionRefused
```

The peer refused the connection.

::Anchor{id="AttemptFailure.NetworkUnreachable"}

### `NetworkUnreachable`

```silk
NetworkUnreachable
```

The network cannot be reached.

::Anchor{id="AttemptFailure.AddressUnavailable"}

### `AddressUnavailable`

```silk
AddressUnavailable
```

The address is not available.

::Anchor{id="AttemptFailure.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

Another system error.

::Anchor{id="AttemptFailure.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeSocketOperation
```

The system call that failed.

::Anchor{id="AttemptFailure.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: i32
```

The host error code: POSIX errno, a Winsock WSA code, or a Win32 handle-configuration error.

::Anchor{id="AttemptFailure.impl.Debug"}

## Implementation `Debug for AttemptFailure`

```silk
impl Debug for AttemptFailure
```

::Anchor{id="AttemptFailure.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `ConnectionRefused`.

::Anchor{id="NativeSocketError"}

## `NativeSocketError`

```silk
pub union NativeSocketError
```

The error of a socket operation: the rule that failed, the system error, or the deadline.

::Anchor{id="NativeSocketError.AttemptsExhausted"}

### `AttemptsExhausted`

```silk
AttemptsExhausted
```

All connect attempts failed.

::Anchor{id="NativeSocketError.AttemptsExhausted.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The number of attempts.

::Anchor{id="NativeSocketError.AttemptsExhausted.last"}

#### Field `last`

```silk
pub last: AttemptFailure
```

The error of the last attempt.

::Anchor{id="NativeSocketError.TimeRangeError"}

### `TimeRangeError`

```silk
TimeRangeError
```

The time of the next check does not fit in an `Instant`.

::Anchor{id="NativeSocketError.InvalidEndpoint"}

### `InvalidEndpoint`

```silk
InvalidEndpoint
```

The endpoints or the socket path of a connect are not valid.

::Anchor{id="NativeSocketError.InvalidEndpoint.reason"}

#### Field `reason`

```silk
pub reason: InvalidEndpointReason
```

The rule that failed.

::Anchor{id="NativeSocketError.InvalidEndpoint.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The byte position of the problem in the path.

::Anchor{id="NativeSocketError.InvalidEndpoint.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The largest allowed value.

::Anchor{id="NativeSocketError.InvalidBindAddress"}

### `InvalidBindAddress`

```silk
InvalidBindAddress
```

The socket path of [`listenUnix`](#listenUnix) is not valid.

::Anchor{id="NativeSocketError.InvalidBindAddress.reason"}

#### Field `reason`

```silk
pub reason: InvalidBindReason
```

The rule that failed.

::Anchor{id="NativeSocketError.InvalidBindAddress.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The byte position of the problem in the path.

::Anchor{id="NativeSocketError.PathTooLong"}

### `PathTooLong`

```silk
PathTooLong
```

The socket path is too long for a socket address.

::Anchor{id="NativeSocketError.PathTooLong.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the path.

::Anchor{id="NativeSocketError.PathTooLong.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The largest allowed length.

::Anchor{id="NativeSocketError.AddressInUse"}

### `AddressInUse`

```silk
AddressInUse
```

The local address is in use.

::Anchor{id="NativeSocketError.InvalidNativeAddress"}

### `InvalidNativeAddress`

```silk
InvalidNativeAddress
```

The system returned an address with a wrong family or length.

::Anchor{id="NativeSocketError.InvalidNativeAddress.family"}

#### Field `family`

```silk
pub family: i32
```

The address family, or -1 if the address is too short.

::Anchor{id="NativeSocketError.InvalidNativeAddress.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the address.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress"}

### `UnsupportedPeerAddress`

```silk
UnsupportedPeerAddress
```

The peer has an address form that is not supported.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress.family"}

#### Field `family`

```silk
pub family: i32
```

The address family, or -1 if the address is too short.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress.length"}

#### Field `length`

```silk
pub length: usize
```

The length of the address.

::Anchor{id="NativeSocketError.FamilyUnsupported"}

### `FamilyUnsupported`

```silk
FamilyUnsupported
```

The system does not support the address family.

::Anchor{id="NativeSocketError.PermissionDenied"}

### `PermissionDenied`

```silk
PermissionDenied
```

The system denied the operation.

::Anchor{id="NativeSocketError.ConnectionRefused"}

### `ConnectionRefused`

```silk
ConnectionRefused
```

The peer refused the connection.

::Anchor{id="NativeSocketError.NetworkUnreachable"}

### `NetworkUnreachable`

```silk
NetworkUnreachable
```

The network cannot be reached.

::Anchor{id="NativeSocketError.AddressUnavailable"}

### `AddressUnavailable`

```silk
AddressUnavailable
```

The address is not available.

::Anchor{id="NativeSocketError.SystemResources"}

### `SystemResources`

```silk
SystemResources
```

The system does not have the resources, such as descriptors.

::Anchor{id="NativeSocketError.Timeout"}

### `Timeout`

```silk
Timeout
```

The deadline passed.

::Anchor{id="NativeSocketError.Closed"}

### `Closed`

```silk
Closed
```

The socket is closed.

::Anchor{id="NativeSocketError.WriteClosed"}

### `WriteClosed`

```silk
WriteClosed
```

The write side is shut down.

::Anchor{id="NativeSocketError.InvalidTransferCount"}

### `InvalidTransferCount`

```silk
InvalidTransferCount
```

The system returned a transfer count that is not valid.

::Anchor{id="NativeSocketError.InvalidTransferCount.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation.

::Anchor{id="NativeSocketError.InvalidTransferCount.count"}

#### Field `count`

```silk
pub count: usize
```

The count that the system returned.

::Anchor{id="NativeSocketError.InvalidTransferCount.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The largest valid count.

::Anchor{id="NativeSocketError.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

Another system error.

::Anchor{id="NativeSocketError.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeSocketOperation
```

The system call that failed.

::Anchor{id="NativeSocketError.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: i32
```

The host error code: POSIX errno, a Winsock WSA code, or a Win32 handle-configuration error.

::Anchor{id="NativeSocketError.impl.Debug"}

## Implementation `Debug for NativeSocketError`

```silk
impl Debug for NativeSocketError
```

::Anchor{id="NativeSocketError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `AttemptsExhausted { ... }`.

::Anchor{id="NativeSocket"}

## `NativeSocket`

```silk
pub struct NativeSocket
```

An empty marker type for this module.

::Anchor{id="ConnectOptions"}

## `ConnectOptions`

```silk
pub struct ConnectOptions
```

The settings of a connect: Nagle, the poll interval, and the attempt limit.

::Anchor{id="ListenOptions"}

## `ListenOptions`

```silk
pub struct ListenOptions
```

The settings of a listener: the backlog, address reuse, IPv6-only mode, and the poll interval of
accept.

::Anchor{id="UnixSocketPath"}

## `UnixSocketPath`

```silk
pub struct UnixSocketPath
```

A copy of a Unix socket path, at most 108 bytes.

::Anchor{id="BoundAddress"}

## `BoundAddress`

```silk
pub union BoundAddress
```

The local address of a [`Listener`](#Listener).

::Anchor{id="BoundAddress.Tcp"}

### `Tcp`

```silk
Tcp
```

A TCP listener.

::Anchor{id="BoundAddress.Tcp.endpoint"}

#### Field `endpoint`

```silk
pub endpoint: Endpoint
```

The address and port. With port 0 in [`listen`](#listen), this is the port that the system chose.

::Anchor{id="BoundAddress.Unix"}

### `Unix`

```silk
Unix
```

A Unix socket listener.

::Anchor{id="BoundAddress.Unix.path"}

#### Field `path`

```silk
pub path: UnixSocketPath
```

The socket path.

::Anchor{id="UnixPeerAddress"}

## `UnixPeerAddress`

```silk
pub union UnixPeerAddress
```

The address of a Unix socket client.

::Anchor{id="UnixPeerAddress.Unnamed"}

### `Unnamed`

```silk
Unnamed
```

The client socket has no path. This is normal for a client.

::Anchor{id="UnixPeerAddress.Pathname"}

### `Pathname`

```silk
Pathname
```

The client socket has a path.

::Anchor{id="UnixPeerAddress.Pathname.path"}

#### Field `path`

```silk
pub path: UnixSocketPath
```

The path.

::Anchor{id="PeerAddress"}

## `PeerAddress`

```silk
pub union PeerAddress
```

The address of an accepted client.

::Anchor{id="PeerAddress.Tcp"}

### `Tcp`

```silk
Tcp
```

A TCP client.

::Anchor{id="PeerAddress.Tcp.endpoint"}

#### Field `endpoint`

```silk
pub endpoint: Endpoint
```

The address and port of the client.

::Anchor{id="PeerAddress.Unix"}

### `Unix`

```silk
Unix
```

A Unix socket client.

::Anchor{id="PeerAddress.Unix.peer"}

#### Field `peer`

```silk
pub peer: UnixPeerAddress
```

The address of the client.

::Anchor{id="Received"}

## `Received`

```silk
pub union Received
```

The outcome of [`Connection.tryRead`](#Connection.impl.tryRead).

::Anchor{id="Received.Data"}

### `Data`

```silk
Data
```

The read copied `count` bytes into the buffer. `count` is 0 only for an empty buffer.

::Anchor{id="Received.Data.count"}

#### Field `count`

```silk
pub count: usize
```

The number of bytes read.

::Anchor{id="Received.End"}

### `End`

```silk
End
```

The peer shut down its write side, and every byte before that was read.

::Anchor{id="Received.WouldBlock"}

### `WouldBlock`

```silk
WouldBlock
```

No bytes are ready. Try again when the socket is readable.

::Anchor{id="Sent"}

## `Sent`

```silk
pub union Sent
```

The outcome of [`Connection.tryWrite`](#Connection.impl.tryWrite) and [`Connection.tryWriteVectored`](#Connection.impl.tryWriteVectored).

::Anchor{id="Sent.Count"}

### `Count`

```silk
Count
```

The kernel took the first `count` bytes. `count` is 0 only when there was nothing to send.

::Anchor{id="Sent.Count.count"}

#### Field `count`

```silk
pub count: usize
```

The number of bytes sent.

::Anchor{id="Sent.WouldBlock"}

### `WouldBlock`

```silk
WouldBlock
```

The send buffer is full. Try again when the socket is writable.

::Anchor{id="Incoming"}

## `Incoming`

```silk
pub union Incoming
```

The outcome of [`Listener.tryAccept`](#Listener.impl.tryAccept).

::Anchor{id="Incoming.Client"}

### `Client`

```silk
Client
```

A client connected.

::Anchor{id="Incoming.Client.accepted"}

#### Field `accepted`

```silk
pub accepted: Accepted
```

The open connection and the address of the client.

::Anchor{id="Incoming.WouldBlock"}

### `WouldBlock`

```silk
WouldBlock
```

No client is waiting. Try again when the listener is readable.

::Anchor{id="ConnectProgress"}

## `ConnectProgress`

```silk
pub enum ConnectProgress
```

The outcome of [`Connection.finishConnect`](#Connection.impl.finishConnect).

::Anchor{id="ConnectProgress.Connected"}

### `Connected`

```silk
Connected
```

The connect finished. The connection is open.

::Anchor{id="ConnectProgress.InProgress"}

### `InProgress`

```silk
InProgress
```

The connect goes on. Try again when the socket is writable.

::Anchor{id="ConnectOptionsError.impl.Copy"}

## Implementation `Copy for ConnectOptionsError`

```silk
impl Copy for ConnectOptionsError
```

::Anchor{id="AttemptFailure.impl.Copy"}

## Implementation `Copy for AttemptFailure`

```silk
impl Copy for AttemptFailure
```

::Anchor{id="NativeSocketError.impl.Copy"}

## Implementation `Copy for NativeSocketError`

```silk
impl Copy for NativeSocketError
```

::Anchor{id="ConnectOptions.impl.Copy"}

## Implementation `Copy for ConnectOptions`

```silk
impl Copy for ConnectOptions
```

::Anchor{id="ListenOptionsError.impl.Copy"}

## Implementation `Copy for ListenOptionsError`

```silk
impl Copy for ListenOptionsError
```

::Anchor{id="ListenOptions.impl.Copy"}

## Implementation `Copy for ListenOptions`

```silk
impl Copy for ListenOptions
```

::Anchor{id="UnixSocketPath.impl.Copy"}

## Implementation `Copy for UnixSocketPath`

```silk
impl Copy for UnixSocketPath
```

::Anchor{id="BoundAddress.impl.Copy"}

## Implementation `Copy for BoundAddress`

```silk
impl Copy for BoundAddress
```

::Anchor{id="UnixPeerAddress.impl.Copy"}

## Implementation `Copy for UnixPeerAddress`

```silk
impl Copy for UnixPeerAddress
```

::Anchor{id="PeerAddress.impl.Copy"}

## Implementation `Copy for PeerAddress`

```silk
impl Copy for PeerAddress
```

::Anchor{id="ConnectOptions.impl"}

## Implementation `ConnectOptions`

```silk
impl ConnectOptions
```

::Anchor{id="ConnectOptions.impl.make"}

### Associated function `make`

```silk
pub fn make(
    noDelay: bool,
    pollIntervalNanoseconds: u64,
    maxAttempts: usize,
  ) -> Result<ConnectOptions, ConnectOptionsError>
```

Returns connect options.

#### Errors
`ConnectOptionsError` if `pollIntervalNanoseconds` is not 1 through 1000000000, or
`maxAttempts` is not 1 through 1024.

::Anchor{id="ConnectOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ConnectOptions
```

Returns the default connect options: Nagle on, a 1 ms poll interval, and 64 attempts.

::Anchor{id="ConnectOptions.impl.noDelay"}

### Method `noDelay`

```silk
pub fn noDelay(self: &Self) -> bool
```

Returns whether Nagle is off (`TCP_NODELAY`).

::Anchor{id="ConnectOptions.impl.pollInterval"}

### Method `pollInterval`

```silk
pub fn pollInterval(self: &Self) -> u64
```

Returns the poll interval, in nanoseconds.

::Anchor{id="ConnectOptions.impl.maxAttempts"}

### Method `maxAttempts`

```silk
pub fn maxAttempts(self: &Self) -> usize
```

Returns the attempt limit.

::Anchor{id="ListenOptions.impl"}

## Implementation `ListenOptions`

```silk
impl ListenOptions
```

::Anchor{id="ListenOptions.impl.make"}

### Associated function `make`

```silk
pub fn make(
    kernelBacklog: usize,
    reuseAddress: bool,
    ipv6Only: bool,
    pollIntervalNanoseconds: u64,
  ) -> Result<ListenOptions, ListenOptionsError>
```

Returns listen options.
Windows defaults to an exclusive bind when `reuseAddress` is false. When true, Windows'
`SO_REUSEADDR` permits binding over an existing listener, unlike Unix's usual reuse behavior.

#### Errors
`ListenOptionsError` if `kernelBacklog` is not 1 through 65535, or `pollIntervalNanoseconds`
is not 1 through 1000000000.

::Anchor{id="ListenOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ListenOptions
```

Returns the default listen options: a backlog of 128, no address reuse, IPv6 listeners that
take only IPv6, and a 1 ms poll interval.

::Anchor{id="ListenOptions.impl.kernelBacklog"}

### Method `kernelBacklog`

```silk
pub fn kernelBacklog(self: &Self) -> usize
```

Returns the backlog of the kernel.

::Anchor{id="ListenOptions.impl.reuseAddress"}

### Method `reuseAddress`

```silk
pub fn reuseAddress(self: &Self) -> bool
```

Returns whether the listener sets `SO_REUSEADDR`.

::Anchor{id="ListenOptions.impl.ipv6Only"}

### Method `ipv6Only`

```silk
pub fn ipv6Only(self: &Self) -> bool
```

Returns whether an IPv6 listener takes only IPv6 clients (`IPV6_V6ONLY`). When false, it
also takes IPv4 clients, as IPv4-mapped IPv6 addresses.

::Anchor{id="ListenOptions.impl.pollInterval"}

### Method `pollInterval`

```silk
pub fn pollInterval(self: &Self) -> u64
```

Returns the poll interval of accept, in nanoseconds.

::Anchor{id="UnixSocketPath.impl"}

## Implementation `UnixSocketPath`

```silk
impl UnixSocketPath
```

::Anchor{id="UnixSocketPath.impl.bytes"}

### Method `bytes`

```silk
pub fn bytes(self: &Self) -> &[u8]
```

Returns the path bytes.

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection
```

An open socket connection. It provides `ByteDuplex`, so `silk.http.exchange`,
`silk.http.server`, and `silk.io.buffered_duplex` can use it.

### Details
The socket is nonblocking. When it is not ready, an operation waits for the poll interval with
`MonotonicClock`, then tries again. So an idle wait costs about one check for each interval. A
flush means that the kernel accepted the bytes, not that the peer got them.

::Anchor{id="Listener"}

## `Listener`

```silk
pub struct Listener
```

A listening socket and its local address.

::Anchor{id="Accepted"}

## `Accepted`

```silk
pub struct Accepted
```

A connection from [`accept`](#accept), with the address of the client. Use it with [`withAccepted`](#withAccepted).

::Anchor{id="AcceptedView"}

## `AcceptedView`

```silk
pub struct AcceptedView<'a>
```

The connection and the client address that [`withAccepted`](#withAccepted) lends to its callback.

::Anchor{id="AcceptedView.connection"}

### Field `connection`

```silk
pub connection: &'a mut Connection
```

The connection. It is valid only in the callback.

::Anchor{id="AcceptedView.peer"}

### Field `peer`

```silk
pub peer: &'a PeerAddress
```

The address of the client.

::Anchor{id="AcceptedContext"}

## `AcceptedContext`

```silk
pub interface AcceptedContext<A, E, ?CallbackRequirements, ?ContextRequirements>
```

A value that serves one accepted connection. See [`withAcceptedContext`](#withAcceptedContext).

### Details
Implement it when the code that serves the connection owns state that is moved in, such as a
handler. `use` gets the value one time.

::Anchor{id="AcceptedContext.use"}

### Operation `use`

```silk
effect<'call> fn use<'call>(
    context: Self,
    view: &'call mut AcceptedView<'call>,
  ) -> A ! E ? CallbackRequirements | ContextRequirements
```

Serves the connection in `view`, with `context`.

::Anchor{id="ConnectionHalves"}

## `ConnectionHalves`

```silk
pub struct ConnectionHalves
```

The two halves of a connection, from [`Connection.split`](#Connection.impl.split).

::Anchor{id="ConnectionHalves.reader"}

### Field `reader`

```silk
pub reader: Connection
```

The half to read from.

::Anchor{id="ConnectionHalves.writer"}

### Field `writer`

```silk
pub writer: Connection
```

The half to write to.

::Anchor{id="Connection.impl"}

## Implementation `Connection`

```silk
impl Connection
```

::Anchor{id="Connection.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ConnectionPhase
```

Returns the state of the connection.

::Anchor{id="Connection.impl.split"}

### Method `split`

```silk
pub effect fn split(self: Self) -> ConnectionHalves ! OutOfMemoryError ? &mut Allocator
```

Splits the connection into a half to read from and a half to write to, so that one fiber can
wait for input while another one writes.

#### Details
Both halves are connections on the same socket, and each keeps its own state. Use `reader`
only to read and `writer` only to write. `ByteDuplex.shutdownWrite` on `writer` closes the
write direction of the socket. Closing or dropping a half releases it; the socket closes when
both halves are closed or dropped.

#### Errors
`OutOfMemoryError` if the shared socket cannot be allocated. The connection is then closed.

::Anchor{id="Connection.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self) -> () ! NativeSocketError
```

Closes the connection. A second call does nothing.

The scoped functions close the connection too, and ignore a close error.

::Anchor{id="Listener.impl"}

## Implementation `Listener`

```silk
impl Listener
```

::Anchor{id="Listener.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ListenerPhase
```

Returns the state of the listener.

::Anchor{id="Listener.impl.boundAddress"}

### Method `boundAddress`

```silk
pub fn boundAddress(self: &Self) -> BoundAddress
```

Returns the local address of the listener.

::Anchor{id="Listener.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self) -> () ! NativeSocketError
```

Closes the listener. A second call does nothing. It does not remove a Unix socket file.

::Anchor{id="Accepted.impl"}

## Implementation `Accepted`

```silk
impl Accepted
```

::Anchor{id="Accepted.impl.peer"}

### Method `peer`

```silk
pub fn peer(self: &Self) -> PeerAddress
```

Returns the address of the client.

::Anchor{id="Accepted.impl.connectionPhase"}

### Method `connectionPhase`

```silk
pub fn connectionPhase(self: &Self) -> ConnectionPhase
```

Returns the state of the connection.

::Anchor{id="Accepted.impl.intoConnection"}

### Method `intoConnection`

```silk
pub fn intoConnection(self: Self) -> Connection
```

Takes the connection out of `self`, and returns it.

#### When to use
Use it to keep a connection open past one callback, such as a client served across the
frames of an event loop. Use [`withAccepted`](#withAccepted) when one callback serves the whole connection.

#### Details
Read [`peer`](#Accepted.impl.peer) first if you need the client address: it goes with `self`. Close the connection
with `Connection.close` to see a close error. Dropping it closes it too, and ignores the error.

::Anchor{id="listen"}

## `listen`

```silk
pub effect fn listen(endpoint: Endpoint, options: ListenOptions) -> Listener ! NativeSocketError
```

Makes a TCP listener on `endpoint`, IPv4 or IPv6.

With port 0, the system chooses a free port. [`Listener.boundAddress`](#Listener.impl.boundAddress) returns it.

### Errors
`AddressInUse`, `PermissionDenied`, `SystemResources`, or another `NativeSocketError`.

::Anchor{id="listenUnix"}

## `listenUnix`

```silk
pub effect fn listenUnix(path: &[u8], options: ListenOptions) -> Listener ! NativeSocketError
```

Makes a Unix socket listener at `path`.

It does not remove an old file at `path` before, or the file after close.

### Errors
`InvalidBindAddress` or `PathTooLong` if `path` is not valid. `AddressInUse` if a file exists.
Windows returns `FamilyUnsupported` for Unix-domain sockets before creating a socket.

::Anchor{id="accept"}

## `accept`

```silk
pub effect fn accept(
  listener: &mut Listener,
  deadline: Option<Instant>,
) -> Accepted ! NativeSocketError ? &mut MonotonicClock
```

Waits for the next client, and returns its connection.

The listener stays open. `deadline` is absolute, and covers all checks of this call.

### Errors
`Timeout` if the deadline passes. `Closed` if the listener is closed.

::Anchor{id="withListener"}

## `withListener`

```silk
pub effect fn withListener<'env, A, E, ?CallbackRequirements>(
  listener: Listener,
  callback: for<'call> once fn<'env>(
    &'call mut Listener
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A ! E ? CallbackRequirements
```

Lends `listener` to `callback`, and closes it after, also on error or cancellation.

::Anchor{id="withAccepted"}

## `withAccepted`

```silk
pub effect fn withAccepted<'env, A, E, ?CallbackRequirements>(
  accepted: Accepted,
  callback: for<'call> once fn<'env>(
    &'call mut AcceptedView<'call>
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A ! E ? CallbackRequirements
where CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Lends the connection and the client address of `accepted` to `callback`, and closes the
connection after, also on error or cancellation.

::Anchor{id="withAcceptedContext"}

## `withAcceptedContext`

```silk
pub effect<'env> fn withAcceptedContext<
  A,
  E,
  ?CallbackRequirements,
  ?ContextRequirements,
  C: AcceptedContext<A, E, CallbackRequirements ? ContextRequirements> + 'env,
  'env,
>(
  accepted: Accepted,
  context: C,
) -> A ! E ? CallbackRequirements | ContextRequirements
where CallbackRequirements in Without<CallbackRequirements, ByteDuplex>,
  ContextRequirements in Without<ContextRequirements, ByteDuplex>
```

Serves `accepted` with `context`, and closes the connection after.

### Details
`context` is used one time. The connection is closed on success, error, and cancellation. A
close error never replaces the result.

::Anchor{id="connectResolvedOwned"}

## `connectResolvedOwned`

```silk
pub effect fn connectResolvedOwned(
  endpoints: &[Endpoint],
  options: ConnectOptions,
  deadline: Option<Instant>,
) -> Connection ! NativeSocketError ? &mut MonotonicClock
```

Connects to the first of `endpoints` that accepts, and returns the connection.

### Errors
- `InvalidEndpoint` if `endpoints` is empty or longer than the attempt limit.
- `AttemptsExhausted` if no endpoint accepts.
- `Timeout` if `deadline` passes.

::Anchor{id="connectUnixOwned"}

## `connectUnixOwned`

```silk
pub effect fn connectUnixOwned(
  path: &[u8],
  options: ConnectOptions,
  deadline: Option<Instant>,
) -> Connection ! NativeSocketError ? &mut MonotonicClock
```

Connects to the Unix socket at `path`, and returns the connection.

### Errors
`InvalidEndpoint` if `path` is not valid. `Timeout` if `deadline` passes.
Windows returns `FamilyUnsupported` for Unix-domain sockets before creating a socket.

::Anchor{id="connectResolved"}

## `connectResolved`

```silk
pub effect fn connectResolved<'env, A, E, ?CallbackRequirements>(
  endpoints: &[Endpoint],
  options: ConnectOptions,
  deadline: Option<Instant>,
  callback: for<'call> once fn<'env>(
    &'call mut Connection
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A ! E | NativeSocketError ? CallbackRequirements | &mut MonotonicClock
where CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Connects to the first of `endpoints` that accepts, lends the connection to `callback`, and
closes it after, also on error or cancellation. A trap does not close it.

### Errors
- The error of `callback`.
- `InvalidEndpoint` if `endpoints` is empty or longer than the attempt limit.
- `AttemptsExhausted` if no endpoint accepts. It has the error of the last attempt.
- `Timeout` if `deadline` passes. One deadline covers all attempts.

### Gotchas
With a deadline of `None`, the connect can wait forever.

::Anchor{id="connectUnix"}

## `connectUnix`

```silk
pub effect fn connectUnix<'env, A, E, ?CallbackRequirements>(
  path: &[u8],
  options: ConnectOptions,
  deadline: Option<Instant>,
  callback: for<'call> once fn<'env>(
    &'call mut Connection
  ) -> once Effect<'call; A ! E ? CallbackRequirements>,
) -> A ! E | NativeSocketError ? CallbackRequirements | &mut MonotonicClock
where CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Connects to the Unix socket at `path`, lends the connection to `callback`, and closes it after,
also on error or cancellation. A trap does not close it.

### Errors
- The error of `callback`.
- `InvalidEndpoint` if `path` is not valid.
- `Timeout` if `deadline` passes.
- `FamilyUnsupported` on Windows, before creating a socket.

::Anchor{id="Connection.impl-2"}

## Implementation `Connection`

```silk
impl Connection
```

::Anchor{id="Connection.impl.ByteDuplex"}

## Implementation `ByteDuplex for Connection`

```silk
impl ByteDuplex for Connection
```

::Anchor{id="Connection.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: Connection.readConnection
```

::Anchor{id="Connection.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: Connection.writeConnection
```

::Anchor{id="Connection.impl.ByteDuplex.writeSomeVectoredRaw"}

### Operation `writeSomeVectoredRaw`

```silk
writeSomeVectoredRaw: Connection.writeConnectionVectored
```

::Anchor{id="Connection.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
flushRaw: Connection.flushConnection
```

::Anchor{id="Connection.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
shutdownWriteRaw: Connection.shutdownConnection
```

::Anchor{id="Connection.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
closeRaw: Connection.closeByteConnection
```

::Anchor{id="startConnect"}

## `startConnect`

```silk
pub effect fn startConnect(endpoint: Endpoint, options: ConnectOptions) -> Connection
! NativeSocketError
```

Makes a TCP socket for `endpoint`, IPv4 or IPv6, and starts its connect without waiting.

### When to use
Use it when your own loop waits for sockets, such as with `silk.io.reactor`. Use
[`connectResolvedOwned`](#connectResolvedOwned) to wait for the connect in this call.

### Details
The socket is nonblocking and close-on-exec, and Nagle is off when `options.noDelay()` is set.
The returned connection is `Open` when the connect finished at once, else `Connecting`. For a
`Connecting` connection, wait until [`Connection.rawDescriptor`](#Connection.impl.rawDescriptor) is writable, then call
[`Connection.finishConnect`](#Connection.impl.finishConnect). The attempt limit and poll interval of `options` are not used.

### Errors
`ConnectionRefused`, `NetworkUnreachable`, `AddressUnavailable`, `PermissionDenied`,
`SystemResources`, or another `NativeSocketError`, if the system refused the connect at once.

::Anchor{id="startConnectFrom"}

## `startConnectFrom`

```silk
pub effect fn startConnectFrom(local: Endpoint, endpoint: Endpoint, options: ConnectOptions) -> Connection
! NativeSocketError
```

Makes a TCP socket bound to the local address `local`, and starts its connect to `endpoint`
without waiting.

### When to use
Use it to choose the local address or port of a connection, as Node's `localAddress` and
`localPort` do. Otherwise use [`startConnect`](#startConnect).

### Details
It works as [`startConnect`](#startConnect) does, with a bind to `local` before the connect. Port 0 in `local`
lets the system choose the port.

### Errors
`FamilyUnsupported` if `local` and `endpoint` are not of one family. `AddressInUse`,
`AddressUnavailable`, or `NativeFailure` with operation `Bind` if the bind fails. Otherwise the
errors of [`startConnect`](#startConnect).

::Anchor{id="startConnectUnix"}

## `startConnectUnix`

```silk
pub effect fn startConnectUnix(path: &[u8], options: ConnectOptions) -> Connection
! NativeSocketError
```

Makes a Unix socket for `path`, and starts its connect without waiting.

### When to use
Use it when your own loop waits for sockets, such as with `silk.io.reactor`. Use
[`connectUnixOwned`](#connectUnixOwned) to wait for the connect in this call.

### Details
The socket is nonblocking and close-on-exec. The returned connection is `Open` when the
connect finished at once, else `Connecting`. For a `Connecting` connection, wait until
[`Connection.rawDescriptor`](#Connection.impl.rawDescriptor) is writable, then call [`Connection.finishConnect`](#Connection.impl.finishConnect). The options
of `options` are not used.

### Errors
`InvalidEndpoint` or `PathTooLong` if `path` is not valid. `ConnectionRefused` if no listener
is at `path`. On Linux, `NativeFailure` with operation `Connect` and errno `EAGAIN` (11) if the
backlog of the listener is full. Windows returns `FamilyUnsupported`.

::Anchor{id="Connection.impl-3"}

## Implementation `Connection`

```silk
impl Connection
```

::Anchor{id="Connection.impl.rawDescriptor"}

### Method `rawDescriptor`

```silk
pub fn rawDescriptor(self: &Self) -> RawSocket
```

Returns the socket descriptor, to register it with a readiness queue such as
`silk.io.reactor`.

#### Details
The connection still owns the socket: do not close it, and remove it from the queue before
the connection is closed or dropped. After a close, it returns the invalid descriptor (-1, or
`INVALID_SOCKET` on Windows). Both halves of a split connection return the same descriptor.

::Anchor{id="Connection.impl.finishConnect"}

### Method `finishConnect`

```silk
pub effect fn finishConnect(self: &mut Self) -> ConnectProgress ! NativeSocketError
```

Checks a connect from [`startConnect`](#startConnect) or [`startConnectUnix`](#startConnectUnix), without waiting.

#### Details
Call it when the socket is writable. It polls the socket once with no timeout, then
returns `Connected` and sets the phase to `Open` when the connect finished, and
`InProgress` while it goes on. It returns `Connected` for a
connection that is already open.

#### Errors
The error of the failed connect, such as `ConnectionRefused` or `NetworkUnreachable`, or
`NativeFailure` with operation `Connect` or `Poll` and the errno. The connection stays
`Connecting`: close it after you remove it from your readiness queue. `Closed` if it is
closed.

::Anchor{id="Connection.impl.tryRead"}

### Method `tryRead`

```silk
pub effect fn tryRead(self: &mut Self, output: &mut [u8]) -> Received ! NativeSocketError
```

Reads the bytes that are ready, at most `output.length`, without waiting.

#### When to use
Use it when your own loop waits for sockets, such as with `silk.io.reactor`. Use
`ByteDuplex.readSome` to wait for bytes in this call.

#### Details
It returns `Data` with the count, `End` when the peer shut down its write side, and
`WouldBlock` when no bytes are ready. After `End`, every call returns `End`. An empty
`output` returns `Data` with count 0 and reads nothing.

#### Errors
`Closed` if the connection is closed or its connect has not finished. `NativeFailure` with
operation `Read` and the errno, such as `ECONNRESET`. The connection stays open: close it
after you remove it from your readiness queue.

::Anchor{id="Connection.impl.tryWrite"}

### Method `tryWrite`

```silk
pub effect fn tryWrite(self: &mut Self, input: &[u8]) -> Sent ! NativeSocketError
```

Sends the bytes of `input` that fit in the send buffer, without waiting.

#### When to use
Use it when your own loop waits for sockets, such as with `silk.io.reactor`. Use
`ByteDuplex.writeSome` to wait for room in this call.

#### Details
It returns `Count` with the bytes sent, which can be fewer than `input.length`, and
`WouldBlock` when the buffer is full. An empty `input` returns `Count` 0. A send to a closed
peer fails and does not raise `SIGPIPE`.

#### Errors
`WriteClosed` after [`shutdownWrite`](#Connection.impl.shutdownWrite). `Closed` if the connection is closed or its connect has
not finished. `NativeFailure` with operation `Write` and the errno, such as `EPIPE` or
`ECONNRESET`.

::Anchor{id="Connection.impl.tryWriteVectored"}

### Method `tryWriteVectored`

```silk
pub effect fn tryWriteVectored(self: &mut Self, inputs: &[&[u8]]) -> Sent ! NativeSocketError
```

Sends the slices of `inputs` in order, as many bytes as fit in the send buffer, in one
system call and without waiting.

#### Details
One call sends from at most eight non-empty slices; empty slices are skipped. It returns
`Count` with the bytes sent, counted across the slices, and `WouldBlock` when the buffer is
full. No slices, or only empty ones, return `Count` 0. A send to a closed peer fails and does
not raise `SIGPIPE`.

#### Errors
`WriteClosed` after [`shutdownWrite`](#Connection.impl.shutdownWrite). `Closed` if the connection is closed or its connect has
not finished. `NativeFailure` with operation `Write` and the errno, such as `EPIPE` or
`ECONNRESET`.

::Anchor{id="Connection.impl.shutdownWrite"}

### Method `shutdownWrite`

```silk
pub effect fn shutdownWrite(self: &mut Self) -> () ! NativeSocketError
```

Shuts down the write side, so the peer reads the end after the bytes already sent. Reads are
still allowed. A second call does nothing. It does not wait.

#### Errors
`Closed` if the connection is closed or its connect has not finished. `NativeFailure` with
operation `ShutdownWrite` and the errno, such as `ENOTCONN` after the peer reset.

::Anchor{id="Connection.impl.setNoDelay"}

### Method `setNoDelay`

```silk
pub effect fn setNoDelay(self: &mut Self, enabled: bool) -> () ! NativeSocketError
```

Turns Nagle off (`TCP_NODELAY` set) when `enabled` is true, and on when it is false.

#### Errors
`Closed` if the connection is closed. `NativeFailure` with operation `Configure` and the
errno, such as `EOPNOTSUPP` on a Unix socket.

::Anchor{id="Connection.impl.setKeepAlive"}

### Method `setKeepAlive`

```silk
pub effect fn setKeepAlive(self: &mut Self, enabled: bool, idleSeconds: u32) -> ()
  ! NativeSocketError
```

Turns TCP keepalive probes on or off (`SO_KEEPALIVE`).

#### Details
With `enabled` and an `idleSeconds` above 0, the first probe goes after the connection is
idle for `idleSeconds` (`TCP_KEEPIDLE` on Linux, `TCP_KEEPALIVE` on Darwin and Windows). With
`idleSeconds` 0, the system default stays. The probe interval and count are the system
defaults. `idleSeconds` is not used when `enabled` is false.

#### Errors
`Closed` if the connection is closed. `NativeFailure` with operation `Configure` and the
errno, such as `EINVAL` for an idle time that the system does not allow.

::Anchor{id="Connection.impl.localEndpoint"}

### Method `localEndpoint`

```silk
pub effect fn localEndpoint(self: &Self) -> Endpoint ! NativeSocketError
```

Returns the local address and port of a TCP connection.

#### Errors
`Closed` if the connection is closed. `InvalidNativeAddress` for a Unix socket connection.
`NativeFailure` with operation `GetSocketName` and the errno.

::Anchor{id="Connection.impl.peerEndpoint"}

### Method `peerEndpoint`

```silk
pub effect fn peerEndpoint(self: &Self) -> Endpoint ! NativeSocketError
```

Returns the address and port of the peer of a TCP connection.

#### Errors
`Closed` if the connection is closed. `InvalidNativeAddress` for a Unix socket connection.
`NativeFailure` with operation `GetPeerName` and the errno, such as `ENOTCONN` before the
connect finished or after the peer reset.

::Anchor{id="Listener.impl-2"}

## Implementation `Listener`

```silk
impl Listener
```

::Anchor{id="Listener.impl.rawDescriptor"}

### Method `rawDescriptor`

```silk
pub fn rawDescriptor(self: &Self) -> RawSocket
```

Returns the socket descriptor, to register it with a readiness queue such as
`silk.io.reactor`. The listener is readable when a client waits.

#### Details
The listener still owns the socket: do not close it, and remove it from the queue before the
listener is closed or dropped. After a close, it returns the invalid descriptor (-1, or
`INVALID_SOCKET` on Windows).

::Anchor{id="Listener.impl.tryAccept"}

### Method `tryAccept`

```silk
pub effect fn tryAccept(self: &mut Self) -> Incoming ! NativeSocketError
```

Accepts the next client if one waits, without waiting.

#### When to use
Use it when your own loop waits for sockets, such as with `silk.io.reactor`. Use [`accept`](#accept)
to wait for a client in this call.

#### Details
It returns `Client` with the open connection, which is nonblocking and close-on-exec with
Nagle on, and `WouldBlock` when no client waits. A client that failed before it was
accepted is skipped.

#### Errors
`Closed` if the listener is closed. `SystemResources` when the process or system is out of
descriptors or memory. `NativeFailure` with operation `Accept` and the errno.

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `wasm64-unknown-unknown`.
