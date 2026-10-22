Scoped nonblocking TCP and pathname-Unix connections and listeners over ByteDuplex.

## When to use

Use connectResolvedOwned or connectUnixOwned when the caller must retain an outbound connection.
The shorter connectResolved and connectUnix operations consume the same owner into a protected
callback scope. Use listen or listenUnix for one affine listener, then accept one independently
owned Connection at a time.

## Details

Every native syscall is nonblocking. Temporary unavailability uses zero-time poll followed by a
positive MonotonicClock wait. One acquisition deadline is shared by every sequential candidate
or accept retry. Socket flush means kernel acceptance, not delivery to the peer.

## Gotchas

Timer polling trades readiness latency for a bounded idle poll rate. A None deadline may wait
indefinitely. Listener close never unlinks a pathname. Structured Effect exits close once;
fatal traps carry no cleanup guarantee. Darwin setup is single-threaded and does not promise
cross-thread fork safety. On unsupported targets or no-libc profiles, reached native operations
produce a compile-time error. Unused imports and portable option metadata remain available.

Import as `NativeSocket` with `import silk.native_socket { NativeSocket }`.

Public declarations: 33.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The visible directional lifetime of one native connection.

::Anchor{id="ConnectionPhase.Connecting"}

### `Connecting`

```silk
Connecting
```

Native connection establishment has not completed.

::Anchor{id="ConnectionPhase.Open"}

### `Open`

```silk
Open
```

The descriptor is available for its permitted operations.

::Anchor{id="ConnectionPhase.WriteClosed"}

### `WriteClosed`

```silk
WriteClosed
```

The local write direction is closed; reads remain available.

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

The descriptor is terminally closed.

::Anchor{id="NativeSocketOperation"}

## `NativeSocketOperation`

```silk
pub enum NativeSocketOperation
```

The native boundary that produced a socket failure.

::Anchor{id="NativeSocketOperation.Socket"}

### `Socket`

```silk
Socket
```

Native socket creation.

::Anchor{id="NativeSocketOperation.Configure"}

### `Configure`

```silk
Configure
```

Native descriptor or socket-option setup.

::Anchor{id="NativeSocketOperation.Connect"}

### `Connect`

```silk
Connect
```

Native outbound connection establishment.

::Anchor{id="NativeSocketOperation.Bind"}

### `Bind`

```silk
Bind
```

Native local-address binding.

::Anchor{id="NativeSocketOperation.Listen"}

### `Listen`

```silk
Listen
```

Native listener activation.

::Anchor{id="NativeSocketOperation.GetSocketName"}

### `GetSocketName`

```silk
GetSocketName
```

Native bound-address inspection.

::Anchor{id="NativeSocketOperation.Accept"}

### `Accept`

```silk
Accept
```

Native incoming connection acceptance.

::Anchor{id="NativeSocketOperation.ConvertAddress"}

### `ConvertAddress`

```silk
ConvertAddress
```

Conversion of a returned native address.

::Anchor{id="NativeSocketOperation.Poll"}

### `Poll`

```silk
Poll
```

Native zero-time readiness inspection.

::Anchor{id="NativeSocketOperation.GetSocketOption"}

### `GetSocketOption`

```silk
GetSocketOption
```

Native socket error inspection.

::Anchor{id="NativeSocketOperation.Read"}

### `Read`

```silk
Read
```

Native input transfer.

::Anchor{id="NativeSocketOperation.Write"}

### `Write`

```silk
Write
```

Native output transfer.

::Anchor{id="NativeSocketOperation.ShutdownWrite"}

### `ShutdownWrite`

```silk
ShutdownWrite
```

Native write-direction shutdown.

::Anchor{id="NativeSocketOperation.Close"}

### `Close`

```silk
Close
```

Native terminal descriptor release.

::Anchor{id="ListenerPhase"}

## `ListenerPhase`

```silk
pub enum ListenerPhase
```

The visible lifetime of one native listener.

::Anchor{id="ListenerPhase.Open"}

### `Open`

```silk
Open
```

The descriptor is available for its permitted operations.

::Anchor{id="ListenerPhase.Closed"}

### `Closed`

```silk
Closed
```

The descriptor is terminally closed.

::Anchor{id="ListenOptionsReason"}

## `ListenOptionsReason`

```silk
pub enum ListenOptionsReason
```

The rejected ListenOptions field.

::Anchor{id="ListenOptionsReason.KernelBacklog"}

### `KernelBacklog`

```silk
KernelBacklog
```

The kernel backlog is outside 1..65535.

::Anchor{id="ListenOptionsReason.PollInterval"}

### `PollInterval`

```silk
PollInterval
```

The polling interval is outside 1..1,000,000,000 nanoseconds.

::Anchor{id="ListenOptionsError"}

## `ListenOptionsError`

```silk
pub struct ListenOptionsError
```

A typed ListenOptions admission failure.

::Anchor{id="ListenOptionsError.reason"}

### Field `reason`

```silk
pub reason: ListenOptionsReason
```

The input admission rule that failed.

::Anchor{id="ListenOptionsError.value"}

### Field `value`

```silk
pub value: u64
```

The rejected option value.

::Anchor{id="InvalidBindReason"}

## `InvalidBindReason`

```silk
pub enum InvalidBindReason
```

The rejected local pathname condition.

::Anchor{id="InvalidBindReason.EmptyPath"}

### `EmptyPath`

```silk
EmptyPath
```

The pathname contains no bytes.

::Anchor{id="InvalidBindReason.RelativePath"}

### `RelativePath`

```silk
RelativePath
```

The pathname does not start with a slash.

::Anchor{id="InvalidBindReason.NulPath"}

### `NulPath`

```silk
NulPath
```

The pathname contains a NUL byte.

::Anchor{id="InvalidBindReason.AbstractPath"}

### `AbstractPath`

```silk
AbstractPath
```

The pathname requests an unsupported abstract address.

::Anchor{id="ConnectOptionsReason"}

## `ConnectOptionsReason`

```silk
pub enum ConnectOptionsReason
```

The rejected ConnectOptions field.

::Anchor{id="ConnectOptionsReason.PollInterval"}

### `PollInterval`

```silk
PollInterval
```

The polling interval is outside 1..1,000,000,000 nanoseconds.

::Anchor{id="ConnectOptionsReason.MaxAttempts"}

### `MaxAttempts`

```silk
MaxAttempts
```

The connection attempt limit is outside 1..1024.

::Anchor{id="ConnectOptionsError"}

## `ConnectOptionsError`

```silk
pub struct ConnectOptionsError
```

A typed ConnectOptions admission failure.

::Anchor{id="ConnectOptionsError.reason"}

### Field `reason`

```silk
pub reason: ConnectOptionsReason
```

The input admission rule that failed.

::Anchor{id="ConnectOptionsError.value"}

### Field `value`

```silk
pub value: u64
```

The rejected option value.

::Anchor{id="InvalidEndpointReason"}

## `InvalidEndpointReason`

```silk
pub enum InvalidEndpointReason
```

The rejected endpoint or pathname condition.

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

The endpoint count exceeds the attempt limit.

::Anchor{id="InvalidEndpointReason.EmptyPath"}

### `EmptyPath`

```silk
EmptyPath
```

The pathname contains no bytes.

::Anchor{id="InvalidEndpointReason.RelativePath"}

### `RelativePath`

```silk
RelativePath
```

The pathname does not start with a slash.

::Anchor{id="InvalidEndpointReason.NulPath"}

### `NulPath`

```silk
NulPath
```

The pathname contains a NUL byte.

::Anchor{id="InvalidEndpointReason.PathTooLong"}

### `PathTooLong`

```silk
PathTooLong
```

The pathname and its terminator exceed native address capacity.

::Anchor{id="InvalidEndpointReason.AbstractPath"}

### `AbstractPath`

```silk
AbstractPath
```

The pathname requests an unsupported abstract address.

::Anchor{id="AttemptFailure"}

## `AttemptFailure`

```silk
pub union AttemptFailure
```

One nonrecursive failure retained when the attempt budget is exhausted.

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

The destination network is unreachable.

::Anchor{id="AttemptFailure.AddressUnavailable"}

### `AddressUnavailable`

```silk
AddressUnavailable
```

The requested address is unavailable.

::Anchor{id="AttemptFailure.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

A native boundary failed with the retained operation and error number.

::Anchor{id="AttemptFailure.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeSocketOperation
```

The native or byte-I/O operation that failed.

::Anchor{id="AttemptFailure.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: i32
```

The native error number reported by the selected platform.

::Anchor{id="NativeSocketError"}

## `NativeSocketError`

```silk
pub union NativeSocketError
```

A native socket acquisition or explicit lifecycle failure.

::Anchor{id="NativeSocketError.AttemptsExhausted"}

### `AttemptsExhausted`

```silk
AttemptsExhausted
```

The admitted connection attempt budget is exhausted.

::Anchor{id="NativeSocketError.AttemptsExhausted.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The number of native connect attempts already made.

::Anchor{id="NativeSocketError.AttemptsExhausted.last"}

#### Field `last`

```silk
pub last: AttemptFailure
```

The failure from the final attempted candidate.

::Anchor{id="NativeSocketError.TimeRangeError"}

### `TimeRangeError`

```silk
TimeRangeError
```

The next positive wake time is not representable.

::Anchor{id="NativeSocketError.InvalidEndpoint"}

### `InvalidEndpoint`

```silk
InvalidEndpoint
```

An endpoint list or Unix pathname failed admission.

::Anchor{id="NativeSocketError.InvalidEndpoint.reason"}

#### Field `reason`

```silk
pub reason: InvalidEndpointReason
```

The input admission rule that failed.

::Anchor{id="NativeSocketError.InvalidEndpoint.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the rejected pathname input.

::Anchor{id="NativeSocketError.InvalidEndpoint.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The admitted maximum for this input or transfer.

::Anchor{id="NativeSocketError.InvalidBindAddress"}

### `InvalidBindAddress`

```silk
InvalidBindAddress
```

A Unix bind pathname failed admission.

::Anchor{id="NativeSocketError.InvalidBindAddress.reason"}

#### Field `reason`

```silk
pub reason: InvalidBindReason
```

The input admission rule that failed.

::Anchor{id="NativeSocketError.InvalidBindAddress.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the rejected pathname input.

::Anchor{id="NativeSocketError.PathTooLong"}

### `PathTooLong`

```silk
PathTooLong
```

The pathname and its terminator exceed native address capacity.

::Anchor{id="NativeSocketError.PathTooLong.length"}

#### Field `length`

```silk
pub length: usize
```

The pathname or returned native address length in bytes.

::Anchor{id="NativeSocketError.PathTooLong.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The admitted maximum for this input or transfer.

::Anchor{id="NativeSocketError.AddressInUse"}

### `AddressInUse`

```silk
AddressInUse
```

The requested local address is already in use.

::Anchor{id="NativeSocketError.InvalidNativeAddress"}

### `InvalidNativeAddress`

```silk
InvalidNativeAddress
```

The returned native address has an invalid family or length.

::Anchor{id="NativeSocketError.InvalidNativeAddress.family"}

#### Field `family`

```silk
pub family: i32
```

The native address family, or -1 when the header is too short.

::Anchor{id="NativeSocketError.InvalidNativeAddress.length"}

#### Field `length`

```silk
pub length: usize
```

The pathname or returned native address length in bytes.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress"}

### `UnsupportedPeerAddress`

```silk
UnsupportedPeerAddress
```

The returned peer uses an unsupported address form.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress.family"}

#### Field `family`

```silk
pub family: i32
```

The native address family, or -1 when the header is too short.

::Anchor{id="NativeSocketError.UnsupportedPeerAddress.length"}

#### Field `length`

```silk
pub length: usize
```

The pathname or returned native address length in bytes.

::Anchor{id="NativeSocketError.FamilyUnsupported"}

### `FamilyUnsupported`

```silk
FamilyUnsupported
```

The requested address family is unsupported.

::Anchor{id="NativeSocketError.PermissionDenied"}

### `PermissionDenied`

```silk
PermissionDenied
```

The operating system denied the operation.

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

The destination network is unreachable.

::Anchor{id="NativeSocketError.AddressUnavailable"}

### `AddressUnavailable`

```silk
AddressUnavailable
```

The requested address is unavailable.

::Anchor{id="NativeSocketError.SystemResources"}

### `SystemResources`

```silk
SystemResources
```

The operating system cannot supply the required resources.

::Anchor{id="NativeSocketError.Timeout"}

### `Timeout`

```silk
Timeout
```

The supplied absolute deadline has been reached.

::Anchor{id="NativeSocketError.Closed"}

### `Closed`

```silk
Closed
```

The descriptor is terminally closed.

::Anchor{id="NativeSocketError.WriteClosed"}

### `WriteClosed`

```silk
WriteClosed
```

The local write direction is closed; reads remain available.

::Anchor{id="NativeSocketError.InvalidTransferCount"}

### `InvalidTransferCount`

```silk
InvalidTransferCount
```

A native success reported an impossible transfer count.

::Anchor{id="NativeSocketError.InvalidTransferCount.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The native or byte-I/O operation that failed.

::Anchor{id="NativeSocketError.InvalidTransferCount.count"}

#### Field `count`

```silk
pub count: usize
```

The invalid successful transfer count reported by the native operation.

::Anchor{id="NativeSocketError.InvalidTransferCount.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The admitted maximum for this input or transfer.

::Anchor{id="NativeSocketError.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

A native boundary failed with the retained operation and error number.

::Anchor{id="NativeSocketError.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeSocketOperation
```

The native or byte-I/O operation that failed.

::Anchor{id="NativeSocketError.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: i32
```

The native error number reported by the selected platform.

::Anchor{id="NativeSocket"}

## `NativeSocket`

```silk
pub struct NativeSocket
```

Namespace anchor for the selected native socket actor.

::Anchor{id="ConnectOptions"}

## `ConnectOptions`

```silk
pub struct ConnectOptions
```

Finite readiness and attempt policy copied into one connection.

::Anchor{id="ListenOptions"}

## `ListenOptions`

```silk
pub struct ListenOptions
```

Finite kernel admission and cooperative accept policy.

::Anchor{id="UnixSocketPath"}

## `UnixSocketPath`

```silk
pub struct UnixSocketPath
```

One owned pathname spelling used by listener metadata.

::Anchor{id="BoundAddress"}

## `BoundAddress`

```silk
pub union BoundAddress
```

The actual local address owned by a published listener.

::Anchor{id="BoundAddress.Tcp"}

### `Tcp`

```silk
Tcp
```

An owned numeric TCP endpoint.

::Anchor{id="BoundAddress.Tcp.endpoint"}

#### Field `endpoint`

```silk
pub endpoint: Endpoint
```

The owned numeric address and port.

::Anchor{id="BoundAddress.Unix"}

### `Unix`

```silk
Unix
```

An owned Unix-domain address.

::Anchor{id="BoundAddress.Unix.path"}

#### Field `path`

```silk
pub path: UnixSocketPath
```

The owned Unix pathname spelling.

::Anchor{id="UnixPeerAddress"}

## `UnixPeerAddress`

```silk
pub union UnixPeerAddress
```

The peer identity returned for one accepted Unix connection.

::Anchor{id="UnixPeerAddress.Unnamed"}

### `Unnamed`

```silk
Unnamed
```

The peer has no bound pathname.

::Anchor{id="UnixPeerAddress.Pathname"}

### `Pathname`

```silk
Pathname
```

The peer has an owned pathname spelling.

::Anchor{id="UnixPeerAddress.Pathname.path"}

#### Field `path`

```silk
pub path: UnixSocketPath
```

The owned Unix pathname spelling.

::Anchor{id="PeerAddress"}

## `PeerAddress`

```silk
pub union PeerAddress
```

The owned peer identity returned with one accepted connection.

::Anchor{id="PeerAddress.Tcp"}

### `Tcp`

```silk
Tcp
```

An owned numeric TCP endpoint.

::Anchor{id="PeerAddress.Tcp.endpoint"}

#### Field `endpoint`

```silk
pub endpoint: Endpoint
```

The owned numeric address and port.

::Anchor{id="PeerAddress.Unix"}

### `Unix`

```silk
Unix
```

An owned Unix-domain address.

::Anchor{id="PeerAddress.Unix.peer"}

#### Field `peer`

```silk
pub peer: UnixPeerAddress
```

The accepted peer identity.

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

Admits a 1..1,000,000,000ns interval and 1..1024 native attempts.

::Anchor{id="ConnectOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ConnectOptions
```

Selects Nagle, a one-millisecond readiness interval, and 64 attempts.

::Anchor{id="ConnectOptions.impl.noDelay"}

### Method `noDelay`

```silk
pub fn noDelay(self: &Self) -> bool
```

Reports whether outbound TCP disables Nagle buffering.

::Anchor{id="ConnectOptions.impl.pollInterval"}

### Method `pollInterval`

```silk
pub fn pollInterval(self: &Self) -> u64
```

Returns the positive polling interval in nanoseconds.

::Anchor{id="ConnectOptions.impl.maxAttempts"}

### Method `maxAttempts`

```silk
pub fn maxAttempts(self: &Self) -> usize
```

Returns the maximum number of native connection attempts.

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

Admits backlog 1..65535 and a 1..1,000,000,000ns polling interval.

::Anchor{id="ListenOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ListenOptions
```

Selects backlog 128, no address reuse, and a one-millisecond polling interval.

::Anchor{id="ListenOptions.impl.kernelBacklog"}

### Method `kernelBacklog`

```silk
pub fn kernelBacklog(self: &Self) -> usize
```

Returns the requested kernel backlog limit.

::Anchor{id="ListenOptions.impl.reuseAddress"}

### Method `reuseAddress`

```silk
pub fn reuseAddress(self: &Self) -> bool
```

Reports whether listener creation enables SO_REUSEADDR.

::Anchor{id="ListenOptions.impl.pollInterval"}

### Method `pollInterval`

```silk
pub fn pollInterval(self: &Self) -> u64
```

Returns the positive polling interval in nanoseconds.

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

Borrows the exact owned pathname spelling.

::Anchor{id="Connection"}

## `Connection`

```silk
pub struct Connection
```

One affine native descriptor lent only inside a connection callback.

::Anchor{id="Listener"}

## `Listener`

```silk
pub struct Listener
```

One affine native listening descriptor and its validated local identity.

::Anchor{id="Accepted"}

## `Accepted`

```silk
pub struct Accepted
```

One independently owned accepted connection and peer identity.

::Anchor{id="AcceptedView"}

## `AcceptedView`

```silk
pub struct AcceptedView<'a>
```

The higher-ranked loans available only inside one accepted-result scope.

::Anchor{id="AcceptedView.connection"}

### Field `connection`

```silk
pub connection: &'a mut Connection
```

The exclusive connection loan valid only within this accepted-result scope.

::Anchor{id="AcceptedView.peer"}

### Field `peer`

```silk
pub peer: &'a PeerAddress
```

The accepted peer identity.

::Anchor{id="AcceptedContext"}

## `AcceptedContext`

```silk
pub interface AcceptedContext<A, E, ?CallbackRequirements, ?ContextRequirements>
```

Compile-time adapter from one owned context to an accepted-connection use.

### Details

Implement this interface when the scoped use owns affine or once-callable state. The first row
preserves caller-selected requirements and the second records requirements introduced by the
concrete context. Selection adds no runtime service or requirement-row member: `context` is
consumed once and the accepted loans remain independently higher-ranked.

::Anchor{id="AcceptedContext.use"}

### Operation `use`

```silk
effect<'call> fn use<'call>(
    context: Self,
    view: &'call mut AcceptedView<'call>,
  ) -> A ! E ? CallbackRequirements | ContextRequirements
```

Consumes one owned context while using temporary accepted-connection loans.

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

Returns the current descriptor lifecycle phase.

::Anchor{id="Connection.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self) -> () ! NativeSocketError
```

Explicitly closes this connection once. Scoped cleanup recovers this error.

#### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Returns the current descriptor lifecycle phase.

::Anchor{id="Listener.impl.boundAddress"}

### Method `boundAddress`

```silk
pub fn boundAddress(self: &Self) -> BoundAddress
```

Returns a copy of the actual local address recorded after listener creation.

::Anchor{id="Listener.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self) -> () ! NativeSocketError
```

Explicitly closes this listener once without unlinking a Unix pathname.

#### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Returns a copy of the independently owned accepted peer identity.

::Anchor{id="Accepted.impl.connectionPhase"}

### Method `connectionPhase`

```silk
pub fn connectionPhase(self: &Self) -> ConnectionPhase
```

Returns the accepted connection lifecycle phase.

::Anchor{id="listen"}

## `listen`

```silk
pub effect fn listen(endpoint: Endpoint, options: ListenOptions) -> Listener ! NativeSocketError
```

Creates one IPv4 or IPv6 listener and publishes its actual bound endpoint.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="listenUnix"}

## `listenUnix`

```silk
pub effect fn listenUnix(path: &[u8], options: ListenOptions) -> Listener ! NativeSocketError
```

Creates one pathname-Unix listener without unlinking before bind or after close.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="accept"}

## `accept`

```silk
pub effect fn accept(
  listener: &mut Listener,
  deadline: Option<Instant>,
) -> Accepted ! NativeSocketError ? &mut MonotonicClock
```

Accepts one independently owned connection under an unchanged absolute deadline.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Consumes one listener and lends it through a nonparking structured finalizer.

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

Consumes one accepted owner and lends its connection plus borrowed peer metadata.

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

Consumes one compile-time-selected context with temporary accepted-connection loans.

### Details

The context is captured by the once-callable protected use and consumed exactly once. Structured
success, typed failure, and cancellation close the connection once; close failure never
replaces the protected outcome.

::Anchor{id="connectResolvedOwned"}

## `connectResolvedOwned`

```silk
pub effect fn connectResolvedOwned(
  endpoints: &[Endpoint],
  options: ConnectOptions,
  deadline: Option<Instant>,
) -> Connection ! NativeSocketError ? &mut MonotonicClock
```

Connects an ordered nonempty numeric endpoint slice and returns one affine provider owner.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="connectUnixOwned"}

## `connectUnixOwned`

```silk
pub effect fn connectUnixOwned(
  path: &[u8],
  options: ConnectOptions,
  deadline: Option<Instant>,
) -> Connection ! NativeSocketError ? &mut MonotonicClock
```

Connects one absolute pathname Unix socket and returns one affine provider owner.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Connects an ordered nonempty numeric endpoint slice and lends the owned provider in one scope.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Connects one absolute pathname Unix socket and lends the owned provider in one scope.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

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

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
