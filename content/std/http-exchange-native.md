Native connection acquisition for one HTTP origin and one serial client scope.

## Details

HTTPS authenticates the original origin with explicit trust. Absolute deadlines are unchanged
through resolution, connection, and TLS authentication. Synchronous hostname resolution rejects
an overall deadline before dispatch. Cleanup closes without a flush or TLS shutdown.

## Gotchas

On unsupported targets or no-libc profiles, reached native acquisition produces a compile-time
error. Unused imports and portable configuration remain available.

Import as `HttpExchangeNative` with `import silk.http_exchange_native as HttpExchangeNative`.

Public declarations: 16.

::Anchor{id="NativeRoute"}

## `NativeRoute`

```silk
pub struct NativeRoute
```

The immutable transport route retained independently of the HTTP origin.

::Anchor{id="NativeRoute.impl.Copy"}

## Implementation `Copy for NativeRoute`

```silk
impl Copy for NativeRoute
```

::Anchor{id="NativeRoute.impl"}

## Implementation `NativeRoute`

```silk
impl NativeRoute
```

::Anchor{id="NativeRoute.impl.isUnix"}

### Method `isUnix`

```silk
pub fn isUnix(self: &Self) -> bool
```

Returns whether this route uses an explicit Unix socket path.

::Anchor{id="NativeRoute.impl.path"}

### Method `path`

```silk
pub fn path<'a>(self: &'a Self) -> &'a [u8]
```

Borrows the exact owned Unix path, or an empty slice for direct TCP.

::Anchor{id="NativeExchangeError"}

## `NativeExchangeError`

```silk
pub union NativeExchangeError
```

A native HTTP option admission or authentication failure.

::Anchor{id="NativeExchangeError.InvalidConnectOptions"}

### `InvalidConnectOptions`

```silk
InvalidConnectOptions
```

The native polling interval or attempt count is outside its finite accepted range.

::Anchor{id="NativeExchangeError.UnsupportedDeadline"}

### `UnsupportedDeadline`

```silk
UnsupportedDeadline
```

Synchronous hostname resolution cannot honor the supplied overall deadline.

::Anchor{id="NativeExchangeError.TrustRequired"}

### `TrustRequired`

```silk
TrustRequired
```

HTTPS owned acquisition requires one caller-prepared frozen trust snapshot.

::Anchor{id="NativeExchangeError.AlpnMismatch"}

### `AlpnMismatch`

```silk
AlpnMismatch
```

Required HTTP/1.1 application protocol negotiation did not succeed.

::Anchor{id="NativeExchangeError.AlpnMismatch.error"}

#### Field `error`

```silk
pub error: ConnectionError
```

The complete TLS connection failure.

::Anchor{id="AlpnPolicy"}

## `AlpnPolicy`

```silk
pub enum AlpnPolicy
```

The HTTP version policy for TLS application protocol negotiation.

::Anchor{id="AlpnPolicy.OptionalHttp11"}

### `OptionalHttp11`

```silk
OptionalHttp11
```

Offers only `http/1.1` and permits an absent selection.

::Anchor{id="AlpnPolicy.RequiredHttp11"}

### `RequiredHttp11`

```silk
RequiredHttp11
```

Requires the peer to select `http/1.1`.

::Anchor{id="AlpnPolicy.Http10"}

### `Http10`

```silk
Http10
```

Sends no ALPN extension for an HTTP/1.0-only peer.

::Anchor{id="Options"}

## `Options`

```silk
pub struct Options
```

Finite native acquisition and TLS authentication limits.

::Anchor{id="Options.maximumAddresses"}

### Field `maximumAddresses`

```silk
pub maximumAddresses: usize
```

Maximum number of resolved numeric addresses.

::Anchor{id="Options.family"}

### Field `family`

```silk
pub family: FamilySelection
```

Address family admitted by resolution.

::Anchor{id="Options.noDelay"}

### Field `noDelay`

```silk
pub noDelay: bool
```

Whether the socket disables Nagle's algorithm.

::Anchor{id="Options.pollIntervalNanoseconds"}

### Field `pollIntervalNanoseconds`

```silk
pub pollIntervalNanoseconds: u64
```

Native readiness polling interval in nanoseconds.

::Anchor{id="Options.maximumAttempts"}

### Field `maximumAttempts`

```silk
pub maximumAttempts: usize
```

Maximum native connection attempts.

::Anchor{id="Options.deadline"}

### Field `deadline`

```silk
pub deadline: Option<Instant>
```

Absolute overall deadline on the active monotonic timeline.

::Anchor{id="Options.handshakeNanoseconds"}

### Field `handshakeNanoseconds`

```silk
pub handshakeNanoseconds: u64
```

Maximum TLS authentication duration in nanoseconds.

::Anchor{id="Options.tls"}

### Field `tls`

```silk
pub tls: ClientLimits
```

TLS protocol storage limits.

::Anchor{id="Options.trust"}

### Field `trust`

```silk
pub trust: TrustLoadLimits
```

Explicit trust source load bounds.

::Anchor{id="Options.alpn"}

### Field `alpn`

```silk
pub alpn: AlpnPolicy
```

HTTP-only application protocol negotiation policy.

::Anchor{id="Options.impl"}

## Implementation `Options`

```silk
impl Options
```

::Anchor{id="Options.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> Options
```

Returns finite defaults with no overall deadline and optional HTTP/1.1 negotiation.

::Anchor{id="NativeTransport"}

## `NativeTransport`

```silk
pub struct NativeTransport
```

One affine native HTTP transport that owns its exact socket or TLS connection.

::Anchor{id="NativeRouteProvider"}

## `NativeRouteProvider`

```silk
pub struct NativeRouteProvider
```

One affine plain native provider owned by a routed HTTP scope.

### Details

The provider retains the exact socket selected for the route's physical peer. HTTP and raw
byte authority share one terminal state so CONNECT transfer cannot duplicate ownership.

::Anchor{id="NativeRouteProvider.impl"}

## Implementation `NativeRouteProvider`

```silk
impl NativeRouteProvider
```

::Anchor{id="NativeRouteProvider.impl.HttpTransport"}

## Implementation `HttpTransport for NativeRouteProvider`

```silk
impl HttpTransport for NativeRouteProvider
```

::Anchor{id="NativeRouteProvider.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: NativeRouteProvider.readHttp
```

::Anchor{id="NativeRouteProvider.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: NativeRouteProvider.writeHttp
```

::Anchor{id="NativeRouteProvider.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: NativeRouteProvider.flushHttp
```

::Anchor{id="NativeRouteProvider.impl.HttpTransport.close"}

### Operation `close`

```silk
close: NativeRouteProvider.closeHttp
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex"}

## Implementation `ByteDuplex for NativeRouteProvider`

```silk
impl ByteDuplex for NativeRouteProvider
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: NativeRouteProvider.readBytes
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: NativeRouteProvider.writeBytes
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
flushRaw: NativeRouteProvider.flushBytes
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
shutdownWriteRaw: NativeRouteProvider.shutdownBytes
```

::Anchor{id="NativeRouteProvider.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
closeRaw: NativeRouteProvider.closeBytes
```

::Anchor{id="acquireOwned"}

## `acquireOwned`

```silk
pub effect fn acquireOwned(
  origin: Origin,
  options: Options,
  limits: Limits,
  preparedTrust: Option<TrustSnapshot>,
  acquisitionDeadline: Option<Instant>,
) -> Connection<NativeTransport>
! NativeExchangeError | ExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | OutOfMemoryError
? &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
```

Acquires and publishes one complete direct TCP or HTTPS HTTP connection owner.

### Details

`acquisitionDeadline` can only shorten `options.deadline`. HTTPS consumes one caller-prepared
frozen trust snapshot and authenticates the exact original origin. The returned HTTP owner
retains no acquisition or request deadline; callers must close it or transfer it into another
scoped owner.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="admitUnixRoute"}

## `admitUnixRoute`

```silk
pub effect fn admitUnixRoute(path: &[u8]) -> NativeRoute ! NativeSocketError
```

Copies one Unix path into bounded native route metadata before transport contact.

### Details

The target-specific native address capacity is checked before the returned route is published.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="acquireUnixOwned"}

## `acquireUnixOwned`

```silk
pub effect fn acquireUnixOwned(
  path: &[u8],
  origin: Origin,
  options: Options,
  limits: Limits,
  preparedTrust: Option<TrustSnapshot>,
  acquisitionDeadline: Option<Instant>,
) -> Connection<NativeTransport>
! NativeExchangeError | ExchangeError | NativeSocketError | ConnectionError | IdentityError | OutOfMemoryError
? &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
```

Acquires and publishes one complete Unix-routed HTTP or HTTPS connection owner.

### Details

The Unix path selects only the physical transport. TLS still authenticates `origin`, and the
returned HTTP owner retains neither the acquisition nor request deadline.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="withConnection"}

## `withConnection`

```silk
pub effect<'env> fn withConnection<
  A,
  E,
  ?R,
  H: ConnectionHandler<NativeTransport, A, E ? R> + 'env,
  'env,
>(origin: Origin, options: Options, limits: Limits, handler: H) -> A
! E | ExchangeError | NativeExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError
? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random | &mut TrustSource
where R in Without<R, HttpTransport>
```

Resolves and acquires one origin, then lends its serial HTTP connection to one handler.

### Details

HTTPS freezes trust before opening and authenticates the original origin. Host fields never
replace that identity. `Http10` disables ALPN; other policies offer only HTTP/1.1.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="withUnixConnection"}

## `withUnixConnection`

```silk
pub effect<'env> fn withUnixConnection<
  A,
  E,
  ?R,
  H: ConnectionHandler<NativeTransport, A, E ? R> + 'env,
  'env,
>(path: &[u8], origin: Origin, options: Options, limits: Limits, handler: H) -> A
! E | ExchangeError | NativeExchangeError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError
? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random | &mut TrustSource
where R in Without<R, HttpTransport>
```

Connects an explicit Unix socket while retaining a separate HTTP and TLS authority.

### Details

The socket path selects only the transport. HTTPS authenticates `origin` with explicit trust.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="withProxyRoute"}

## `withProxyRoute`

```silk
pub effect<'env> fn withProxyRoute<
  'configuration,
  A,
  E,
  ?R,
  H: RouteHandler<'configuration, NativeRouteProvider, A, E ? R> + 'env,
  'env,
>(
  route: Route<'configuration>,
  options: Options,
  limits: Limits,
  preparedTrust: Option<TrustSnapshot>,
  handler: H,
) -> A
! E | ProxyError | ExchangeError | NativeExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | OutOfMemoryError
? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
where R in Without<R, ByteDuplex>, R in Without<R, HttpTransport>
```

Resolves and connects only one sealed route's physical peer, then lends the final HTTP scope.

### Details

`options.deadline` is passed unchanged through native preflight, resolution, connection,
CONNECT, and TLS. `limits` supplies both the HTTP scope and generated CONNECT bounds. Secure
routes consume caller-prepared trust; no resolver fallback or alternate endpoint is selected.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="NativeTransport.impl"}

## Implementation `NativeTransport`

```silk
impl NativeTransport
```

::Anchor{id="NativeTransport.impl.route"}

### Method `route`

```silk
pub fn route(self: &Self) -> NativeRoute
```

Returns owned immutable route metadata while leaving the transport exclusively inside its session.

::Anchor{id="NativeTransport.impl.HttpTransport"}

## Implementation `HttpTransport for NativeTransport`

```silk
impl HttpTransport for NativeTransport
```

::Anchor{id="NativeTransport.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: NativeTransport.read
```

::Anchor{id="NativeTransport.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: NativeTransport.write
```

::Anchor{id="NativeTransport.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: NativeTransport.flushOutput
```

::Anchor{id="NativeTransport.impl.HttpTransport.close"}

### Operation `close`

```silk
close: NativeTransport.closeLease
```

::Anchor{id="preflight"}

## `preflight`

```silk
pub fn preflight(origin: &Origin, options: &Options) -> Result<(), NativeExchangeError>
```

Checks native TCP support and rejects a hostname deadline before resolver dispatch.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="preflightProxyRoute"}

## `preflightProxyRoute`

```silk
pub fn preflightProxyRoute<'configuration>(route: &Route<'configuration>, options: &Options) -> Result<
  Origin,
  ProxyError | NativeExchangeError,
>
```

Returns the exact route-selected native peer after target and deadline preflight.

### Details

Direct returns the original origin; Forward and Tunnel return the sealed plain proxy origin.
A finite deadline with either selected domain fails before synchronous resolver dispatch.

### Gotchas

On unsupported targets or no-libc profiles, a reached call produces a compile-time error.

::Anchor{id="NativeRedirectClient"}

## `NativeRedirectClient`

```silk
pub struct NativeRedirectClient<'configuration, 'policy, A, HandlerError, ?HandlerRequirements>
```

Rebuildable native route acquisition for bounded redirect operations.

### Details

The initial sealed route retains the immutable proxy configuration. On supported native
targets, every attempt recomputes policy for its current URI, completes method, target, header,
and native-route preflight before destination contact, and replaces the stored option deadline
with the operation's unchanged absolute deadline. Secure attempts load a fresh trust snapshot
before acquisition; tunneled TLS continues to authenticate the original origin through
[`withProxyRoute`](#withProxyRoute). On unsupported targets or no-libc profiles, reached acquisition produces a
compile-time error.

::Anchor{id="NativeRedirectClient.impl"}

## Implementation `NativeRedirectClient<'configuration, 'policy, A, HandlerError, HandlerRequirements>`

```silk
impl<'configuration, 'policy, A, HandlerError, ?HandlerRequirements> NativeRedirectClient<
  'configuration,
  'policy,
  A,
  HandlerError,
  HandlerRequirements,
>
```

::Anchor{id="NativeRedirectClient.impl.make"}

### Associated function `make`

```silk
pub fn make(route: Route<'configuration>, options: Options, limits: Limits) -> NativeRedirectClient<
    'configuration,
    'policy,
    A,
    HandlerError,
    HandlerRequirements,
  >
```

Creates a reusable redirect attempt client from one policy-selected route.

#### Gotchas

Construction on unsupported targets or no-libc profiles produces a compile-time error.

::Anchor{id="NativeRedirectClient.impl-2"}

## Implementation `NativeRedirectClient<'configuration, 'policy, A, HandlerError, HandlerRequirements>`

```silk
impl<'configuration, 'policy, A, HandlerError, ?HandlerRequirements> NativeRedirectClient<
  'configuration,
  'policy,
  A,
  HandlerError,
  HandlerRequirements,
>
```

::Anchor{id="NativeRedirectClient.impl.AttemptClient"}

## Implementation `AttemptClient<'policy, NativeRouteProvider, A, HandlerError, ProxyError | RequestError | ValueError | OriginError | ExchangeError | NativeExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError, &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random | &mut TrustSource, HandlerRequirements> for NativeRedirectClient<'configuration, 'policy, A, HandlerError, HandlerRequirements>`

```silk
impl<'configuration, 'policy, A, HandlerError, ?HandlerRequirements> AttemptClient<
  'policy,
  NativeRouteProvider,
  A,
  HandlerError,
  ProxyError | RequestError | ValueError | OriginError | ExchangeError | NativeExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError,
  &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random | &mut TrustSource,
  HandlerRequirements,
> for NativeRedirectClient<'configuration, 'policy, A, HandlerError, HandlerRequirements>
```

::Anchor{id="NativeRedirectClient.impl.AttemptClient.withAttempt"}

### Operation `withAttempt`

```silk
withAttempt: NativeRedirectClient.withAttempt
```

::Anchor{id="route"}

## `route`

```silk
pub fn route(connection: &Connection<NativeTransport>) -> NativeRoute
```

Returns immutable native route metadata from an owned HTTP session without lending its transport mutably.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
