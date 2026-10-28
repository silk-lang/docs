TCP and Unix socket connections and listeners, as `ByteDuplex` providers.

## When to use
- To connect, call [`connectResolved`](#connectResolved) with endpoints from `silk.net.resolver`, or [`connectUnix`](#connectUnix)
  with a socket path. The connection is lent to a callback and closed after it. Use
  [`connectResolvedOwned`](#connectResolvedOwned) or [`connectUnixOwned`](#connectUnixOwned) to keep the [`Connection`](#Connection) yourself.
- To serve, call [`listen`](#listen) or [`listenUnix`](#listenUnix), then [`accept`](#accept) for each client. Use
  [`withAccepted`](#withAccepted) to get the connection and the peer address, and close them after.

A [`Connection`](#Connection) provides `ByteDuplex`, so `silk.http.exchange`, `silk.http.server`, and
`silk.io.buffered_duplex` can use it.

## Details
All sockets are nonblocking. When a socket is not ready, the operation waits for the poll
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
- A call fails to compile on targets other than Darwin on aarch64, and Linux with GNU libc on
  x86_64 or aarch64. The option types still compile.

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
import silk.option { Option }
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

Public declarations: 33.

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

The `errno` value.

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

The `errno` value.

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

The settings of a listener: the backlog, address reuse, and the poll interval of accept.

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
    pollIntervalNanoseconds: u64,
  ) -> Result<ListenOptions, ListenOptionsError>
```

Returns listen options.

#### Errors
`ListenOptionsError` if `kernelBacklog` is not 1 through 65535, or `pollIntervalNanoseconds`
is not 1 through 1000000000.

::Anchor{id="ListenOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ListenOptions
```

Returns the default listen options: a backlog of 128, no address reuse, and a 1 ms poll
interval.

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

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
