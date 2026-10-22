Bounded local HTTP/1 connection pooling with explicit ownership and deterministic eviction.

## Details

A pool preallocates every shared slot before publication. Shared callbacks only scan and move
already-owned values; clock reads, connector calls, user callbacks, allocation, and physical
close operations remain outside shared access. Capacity is fail-fast and local to one scheduler
thread. There is no waiter queue, background expiry worker, request replay, HTTP/2 coalescing,
or WebSocket pooling.

Import as `Pool` with `import silk.http_connection_pool { Pool }`.

Public declarations: 27.

::Anchor{id="DEFAULT_MAX_TOTAL"}

## `DEFAULT_MAX_TOTAL`

```silk
pub const DEFAULT_MAX_TOTAL: usize
```

Default maximum number of opening, leased, and idle connections together.

::Anchor{id="DEFAULT_MAX_IDLE"}

## `DEFAULT_MAX_IDLE`

```silk
pub const DEFAULT_MAX_IDLE: usize
```

Default maximum number of retained idle connections.

::Anchor{id="DEFAULT_MAX_PER_ORIGIN"}

## `DEFAULT_MAX_PER_ORIGIN`

```silk
pub const DEFAULT_MAX_PER_ORIGIN: usize
```

Default maximum number of connections for one normalized original origin.

::Anchor{id="DEFAULT_IDLE_TIMEOUT_NANOSECONDS"}

## `DEFAULT_IDLE_TIMEOUT_NANOSECONDS`

```silk
pub const DEFAULT_IDLE_TIMEOUT_NANOSECONDS: u64
```

Default idle lifetime in nanoseconds.

::Anchor{id="MAX_TOTAL"}

## `MAX_TOTAL`

```silk
pub const MAX_TOTAL: usize
```

Hard maximum total pool capacity.

::Anchor{id="Config"}

## `Config`

```silk
pub struct Config
```

Finite pool limits admitted before shared state is allocated.

::Anchor{id="Config.maxTotal"}

### Field `maxTotal`

```silk
pub maxTotal: usize
```

Maximum opening, leased, and idle count.

::Anchor{id="Config.maxIdle"}

### Field `maxIdle`

```silk
pub maxIdle: usize
```

Maximum retained idle count. Zero disables retention.

::Anchor{id="Config.maxPerOrigin"}

### Field `maxPerOrigin`

```silk
pub maxPerOrigin: usize
```

Maximum count for one normalized original origin.

::Anchor{id="Config.idleTimeoutNanoseconds"}

### Field `idleTimeoutNanoseconds`

```silk
pub idleTimeoutNanoseconds: u64
```

Positive idle lifetime on the pool's monotonic timeline.

::Anchor{id="Config.impl.Copy"}

## Implementation `Copy for Config`

```silk
impl Copy for Config
```

::Anchor{id="Config.impl"}

## Implementation `Config`

```silk
impl Config
```

::Anchor{id="Config.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> Config
```

Returns the finite standard limits: 32 total, 16 idle, 8 per origin, and 30 seconds idle.

::Anchor{id="ConfigField"}

## `ConfigField`

```silk
pub enum ConfigField
```

The configuration field rejected before pool publication.

::Anchor{id="ConfigField.MaxTotal"}

### `MaxTotal`

```silk
MaxTotal
```

`maxTotal` is outside 1 through 1024.

::Anchor{id="ConfigField.MaxIdle"}

### `MaxIdle`

```silk
MaxIdle
```

`maxIdle` exceeds `maxTotal`.

::Anchor{id="ConfigField.MaxPerOrigin"}

### `MaxPerOrigin`

```silk
MaxPerOrigin
```

`maxPerOrigin` is zero or exceeds `maxTotal`.

::Anchor{id="ConfigField.IdleTimeout"}

### `IdleTimeout`

```silk
IdleTimeout
```

The idle duration is zero.

::Anchor{id="PoolError"}

## `PoolError`

```silk
pub union PoolError
```

A pool admission, capacity, lifecycle, or checked-accounting failure.

::Anchor{id="PoolError.InvalidConfig"}

### `InvalidConfig`

```silk
InvalidConfig
```

Configuration was rejected before allocation or publication.

::Anchor{id="PoolError.InvalidConfig.field"}

#### Field `field`

```silk
pub field: ConfigField
```

The configuration field whose value is outside its admitted range.

::Anchor{id="PoolError.PoolFull"}

### `PoolFull`

```silk
PoolFull
```

No legal idle eviction can satisfy global and per-origin capacity.

::Anchor{id="PoolError.PoolClosed"}

### `PoolClosed`

```silk
PoolClosed
```

The root pool has closed; surviving handles cannot acquire or publish.

::Anchor{id="PoolError.ContextMismatch"}

### `ContextMismatch`

```silk
ContextMismatch
```

The key is incompatible with the handle's frozen acquisition/security context.

::Anchor{id="PoolError.OpeningExpired"}

### `OpeningExpired`

```silk
OpeningExpired
```

Opening could not begin or completed at or after its effective acquisition deadline.

::Anchor{id="PoolError.impl.Copy"}

## Implementation `Copy for PoolError`

```silk
impl Copy for PoolError
```

::Anchor{id="Counts"}

## `Counts`

```silk
pub struct Counts
```

A synchronous snapshot of bounded shared accounting.

::Anchor{id="Counts.opening"}

### Field `opening`

```silk
pub opening: usize
```

Connections whose capacity is reserved while opening.

::Anchor{id="Counts.leased"}

### Field `leased`

```silk
pub leased: usize
```

Connections currently lent to callbacks.

::Anchor{id="Counts.idle"}

### Field `idle`

```silk
pub idle: usize
```

Complete connections retained for later reuse.

::Anchor{id="Counts.total"}

### Field `total`

```silk
pub total: usize
```

`opening + leased + idle`.

::Anchor{id="Counts.closed"}

### Field `closed`

```silk
pub closed: bool
```

Whether root ownership has closed the pool.

::Anchor{id="Counts.impl.Copy"}

## Implementation `Copy for Counts`

```silk
impl Copy for Counts
```

::Anchor{id="Collection"}

## `Collection`

```silk
pub struct Collection
```

Result of explicit lazy expiry collection.

::Anchor{id="Collection.expired"}

### Field `expired`

```silk
pub expired: usize
```

Number of expired idle owners physically closed by this call.

::Anchor{id="Collection.impl.Copy"}

## Implementation `Copy for Collection`

```silk
impl Copy for Collection
```

::Anchor{id="CheckoutSource"}

## `CheckoutSource`

```silk
pub enum CheckoutSource
```

Whether checkout selected an idle owner or opened a new one.

::Anchor{id="CheckoutSource.Reused"}

### `Reused`

```silk
Reused
```

A compatible most-recently-returned idle owner was selected.

::Anchor{id="CheckoutSource.Opened"}

### `Opened`

```silk
Opened
```

Capacity was reserved and the immutable connector opened a new owner.

::Anchor{id="CheckoutResult"}

## `CheckoutResult`

```silk
pub struct CheckoutResult<A>
```

A successful callback value paired with its checkout source.

::Anchor{id="CheckoutResult.value"}

### Field `value`

```silk
pub value: A
```

The callback result.

::Anchor{id="CheckoutResult.source"}

### Field `source`

```silk
pub source: CheckoutSource
```

How the exclusive owner was obtained.

::Anchor{id="PoolKey"}

## `PoolKey`

```silk
pub interface PoolKey<CopyError, ?CopyRequirements>
```

Compile-time contract for an independently owned conservative connection key.

::Anchor{id="PoolKey.copy"}

### Operation `copy`

```silk
effect fn copy(key: &Self) -> Self ! CopyError ? CopyRequirements
```

Copies the complete key before entering shared state.

::Anchor{id="PoolKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Reports exact route, provider, and security compatibility.

::Anchor{id="PoolKey.sameOrigin"}

### Operation `sameOrigin`

```silk
fn sameOrigin(left: &Self, right: &Self) -> bool
```

Reports normalized original-origin equality for the per-origin cap.

::Anchor{id="PoolContextCopy"}

## `PoolContextCopy`

```silk
pub interface PoolContextCopy<CopyError, ?CopyRequirements>
```

Fallible bounded-copy contract for immutable context retained beside shared mutable state.

::Anchor{id="PoolContextCopy.copy"}

### Operation `copy`

```silk
effect fn copy(context: &Self) -> Self ! CopyError ? CopyRequirements
```

Fallibly copies all bounded context before a new Shared alias is published.

::Anchor{id="PoolContext"}

## `PoolContext`

```silk
pub interface PoolContext<K, P, AcquisitionError, ?AcquisitionRequirements>
```

Immutable acquisition context retained beside, never inside, shared mutable state.

::Anchor{id="PoolContext.accepts"}

### Operation `accepts`

```silk
fn accepts(context: &Self, key: &K) -> bool
```

Checks key compatibility without allocation, clock access, or transport contact.

::Anchor{id="PoolContext.acquire"}

### Operation `acquire`

```silk
effect fn acquire(
    context: &Self,
    key: &K,
    deadline: Option<Instant>,
  ) -> Connection<P> ! AcquisitionError ? AcquisitionRequirements
```

Opens one complete HTTP owner under only the effective acquisition deadline.

::Anchor{id="PoolHandler"}

## `PoolHandler`

```silk
pub interface PoolHandler<K, P, C, A, E, ?R>
```

A higher-ranked root-pool callback whose pool borrow cannot escape.

::Anchor{id="PoolHandler.handle"}

### Operation `handle`

```silk
effect<'scope> fn handle<'scope>(handler: Self, pool: &'scope mut Pool<K, P, C>) -> A ! E ? R
```

Uses one root pool until success, failure, or structured cancellation closes it.

::Anchor{id="EndpointIdentity"}

## `EndpointIdentity`

```silk
pub union EndpointIdentity
```

Exact endpoint identity retained by the standard conservative key.

::Anchor{id="EndpointIdentity.Direct"}

### `Direct`

```silk
Direct
```

Direct network contact, conservatively partitioned by the original origin.

::Anchor{id="EndpointIdentity.Proxy"}

### `Proxy`

```silk
Proxy
```

A sealed JUL-199 route, including mode, endpoint, original origin, and credential identity.

::Anchor{id="EndpointIdentity.Proxy.route"}

#### Field `route`

```silk
pub route: RouteKey
```

The sealed proxy route identity used to partition reusable connections.

::Anchor{id="EndpointIdentity.Unix"}

### `Unix`

```silk
Unix
```

Direct Unix-domain contact with an exact owned pathname.

::Anchor{id="ConnectionKey"}

## `ConnectionKey`

```silk
pub struct ConnectionKey
```

The standard conservative key used by direct native and proxy-aware pool contexts.

### Details

Provider representation, HTTP policy, TLS verification/trust/ALPN policy, and connector policy
belong to the constructor-sealed [`PoolContext`](#PoolContext). This key retains only request-visible route
identity; direct resolution results never establish equivalence.

::Anchor{id="ConnectionKey.impl"}

## Implementation `ConnectionKey`

```silk
impl ConnectionKey
```

::Anchor{id="ConnectionKey.impl.direct"}

### Associated function `direct`

```silk
pub fn direct(originalOrigin: Origin) -> ConnectionKey
```

Creates a direct network key from the normalized original origin without allocation.

::Anchor{id="ConnectionKey.impl.proxy"}

### Associated function `proxy`

```silk
pub fn proxy(route: RouteKey) -> ConnectionKey
```

Creates a proxy-aware key from the sealed JUL-199 route identity.

::Anchor{id="ConnectionKey.impl.unix"}

### Associated function `unix`

```silk
pub effect fn unix(
    originalOrigin: Origin,
    path: &[u8],
  ) -> ConnectionKey ! OutOfMemoryError ? &mut Allocator
```

Copies one exact Unix pathname into a conservative direct key.

::Anchor{id="ConnectionKey.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Origin
```

Returns the normalized original origin used for per-origin capacity.

::Anchor{id="ConnectionKey.impl.isDirect"}

### Method `isDirect`

```silk
pub fn isDirect(self: &Self) -> bool
```

Returns whether this key selects direct native contact for its original origin.

::Anchor{id="ConnectionKey.impl.matchesUnixPath"}

### Method `matchesUnixPath`

```silk
pub fn matchesUnixPath(self: &Self, path: &[u8]) -> bool
```

Returns whether this key selects the exact supplied Unix path for its original origin.

::Anchor{id="ConnectionKey.impl.PoolKey"}

## Implementation `PoolKey<OutOfMemoryError ? &mut Allocator> for ConnectionKey`

```silk
impl PoolKey<OutOfMemoryError ? &mut Allocator> for ConnectionKey
```

::Anchor{id="ConnectionKey.impl.PoolKey.copy"}

### Operation `copy`

```silk
effect fn copy(key: &Self) -> ConnectionKey ! OutOfMemoryError ? &mut Allocator
```

::Anchor{id="ConnectionKey.impl.PoolKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="ConnectionKey.impl.PoolKey.sameOrigin"}

### Operation `sameOrigin`

```silk
fn sameOrigin(left: &Self, right: &Self) -> bool
```

::Anchor{id="Pool"}

## `Pool`

```silk
pub struct Pool<K, P, C>
```

The scoped root owner. Use [`withPool`](#withPool) so closure runs on every structured exit.

::Anchor{id="Handle"}

## `Handle`

```silk
pub struct Handle<K, P, C>
```

A fallibly copied local handle sharing only preallocated mutable slot state.

::Anchor{id="Pool.impl"}

## Implementation `Pool<K, P, C>`

```silk
impl<K, P, C> Pool<K, P, C>
```

::Anchor{id="Pool.impl.handle"}

### Method `handle`

```silk
pub fn handle(self: &Self) -> &Handle<K, P, C>
```

Borrows the root handle without publishing another Shared alias.

::Anchor{id="context"}

## `context`

```silk
pub fn context<'handle, K, P, C>(handle: &'handle Handle<K, P, C>) -> &'handle C
```

Borrows one handle's immutable acquisition context without exposing shared slot state.

::Anchor{id="withPool"}

## `withPool`

```silk
pub effect<'env> fn withPool<
  K,
  P,
  C: 'env,
  A,
  E,
  ?R,
  H: PoolHandler<K, P, C, A, E ? R> + 'env,
  'env,
>(config: Config, context: C, handler: H) -> A
! E | PoolError | OutOfMemoryError
? R | &mut Allocator
where &mut P provides &HttpTransport from &mut HttpTransport
```

Constructs one finite pool, lends its root, and closes it on every structured exit.

::Anchor{id="copyHandle"}

## `copyHandle`

```silk
pub effect fn copyHandle<
  K,
  P,
  CopyError,
  ?CopyRequirements,
  C: PoolContextCopy<CopyError ? CopyRequirements>,
>(handle: &Handle<K, P, C>) -> Handle<K, P, C> ! CopyError ? CopyRequirements
```

Copies immutable context before cloning Shared state, so copy failure publishes no alias.

::Anchor{id="counts"}

## `counts`

```silk
pub fn counts<K, P, C>(handle: &Handle<K, P, C>) -> Counts
```

Inspects exact shared accounting without allocating or consulting the clock.

::Anchor{id="withConnection"}

## `withConnection`

```silk
pub effect<'env> fn withConnection<
  P,
  A,
  E,
  KeyCopyError,
  AcquisitionError,
  ?KeyCopyRequirements,
  ?AcquisitionRequirements,
  ?CallbackRequirements,
  K: PoolKey<KeyCopyError ? KeyCopyRequirements>,
  C: PoolContext<K, P, AcquisitionError ? AcquisitionRequirements>,
  H: ConnectionHandler<P, A, E ? CallbackRequirements> + 'env,
  'env,
>(
  handle: &Handle<K, P, C>,
  key: &K,
  requestDeadline: Option<Instant>,
  acquisitionDeadline: Option<Instant>,
  handler: H,
) -> CheckoutResult<A>
! E | KeyCopyError | AcquisitionError | PoolError
? KeyCopyRequirements | AcquisitionRequirements | CallbackRequirements | &mut MonotonicClock
where
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut P provides &HttpTransport from &mut HttpTransport
```

Checks out exactly one owner, lends it to `handler`, and publishes it only when client-eligible.

### Details

Acquisition uses the earlier of `requestDeadline` and `acquisitionDeadline`; the connector must
construct pooled owners without retaining that bound. The handler remains responsible for
passing the unchanged request deadline to each HTTP exchange. Failures and cancellation close
instead of replaying the request.

::Anchor{id="collect"}

## `collect`

```silk
pub effect fn collect<K, P, C>(handle: &Handle<K, P, C>) -> Collection
? &mut MonotonicClock
where &mut P provides &HttpTransport from &mut HttpTransport
```

Samples the monotonic clock once, lazily removes every expired idle owner, and closes outside Shared.

::Anchor{id="close"}

## `close`

```silk
pub effect fn close<K, P, C>(pool: &mut Pool<K, P, C>) -> () ! ExchangeError
where &mut P provides &HttpTransport from &mut HttpTransport
```

Marks the pool closed idempotently and physically closes all currently idle owners outside Shared.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
