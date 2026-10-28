A bounded pool of HTTP/1 connections, for reuse across requests to the same origin.

## When to use
Most code uses `silk.http.connection_pool_native`, which supplies a context for direct TCP,
HTTPS, and Unix connections. Use this module directly to pool connections from a custom
[`PoolContext`](#PoolContext), for example over a test transport.

1. Call [`withPool`](#withPool) with a [`Config`](#Config), a context, and a [`PoolHandler`](#PoolHandler). The pool lives only
   inside the handler, and closes when the handler returns, fails, or is cancelled.
2. For each request, call [`withConnection`](#withConnection) with a key. The handler gets one connection to use
   alone. [`CheckoutResult.source`](#CheckoutResult.source) tells if the connection was reused or new.
3. Call [`collect`](#collect) from time to time to close idle connections that have expired.

## Details
[`withPool`](#withPool) allocates all slots before the handler starts. After that, the pool does not
allocate. Each slot is opening, leased, or idle. The total of the three is at most `maxTotal`,
and the total for one origin is at most `maxPerOrigin`.

A checkout does these steps:
1. It removes one expired idle connection, if there is one.
2. It takes the idle connection with the same key that was returned last.
3. If there is none, it reserves a slot. If the pool or the origin is at its limit, it evicts
   the oldest idle connection. If no idle connection can be evicted, it fails with `PoolFull`.
4. It opens a new connection with [`PoolContext.acquire`](#PoolContext.acquire) if it reserved a slot.

After the handler, the connection goes back to the idle list only if `silk.http.exchange` says
that it is eligible for reuse. Otherwise the pool closes it. If the idle list is full, the
oldest idle connection is closed.

The pool does not use locks. Use it from one thread only. Calls to the clock, the connector, the
handler, and close are done outside the shared state.

## Errors
- [`PoolError`](#PoolError) for a bad [`Config`](#Config), a full or closed pool, a key that the context does not
  accept, or an opening that ends after its deadline.
- The errors of the key copy, the connector, and the handler, unchanged.
- `ExchangeError` from [`close`](#close) if an idle connection fails to close.

## Gotchas
- There is no wait queue. When the pool is full, a checkout fails at once with `PoolFull`.
- The pool never sends a request again. If the handler fails or is cancelled, the connection is
  closed.
- Expired idle connections are closed only by a checkout, a return, or [`collect`](#collect). No
  background task closes them.
- There is no HTTP/2 and no WebSocket pooling.

Import as `Pool` with `import silk.http.connection_pool { Pool }`.

Public declarations: 27.

::Anchor{id="DEFAULT_MAX_TOTAL"}

## `DEFAULT_MAX_TOTAL`

```silk
pub const DEFAULT_MAX_TOTAL: usize
```

The default maximum number of connections: opening, leased, and idle together.

::Anchor{id="DEFAULT_MAX_IDLE"}

## `DEFAULT_MAX_IDLE`

```silk
pub const DEFAULT_MAX_IDLE: usize
```

The default maximum number of idle connections.

::Anchor{id="DEFAULT_MAX_PER_ORIGIN"}

## `DEFAULT_MAX_PER_ORIGIN`

```silk
pub const DEFAULT_MAX_PER_ORIGIN: usize
```

The default maximum number of connections to one origin.

::Anchor{id="DEFAULT_IDLE_TIMEOUT_NANOSECONDS"}

## `DEFAULT_IDLE_TIMEOUT_NANOSECONDS`

```silk
pub const DEFAULT_IDLE_TIMEOUT_NANOSECONDS: u64
```

The default time that a connection stays idle before it expires: 30 seconds.

::Anchor{id="MAX_TOTAL"}

## `MAX_TOTAL`

```silk
pub const MAX_TOTAL: usize
```

The largest `maxTotal` that a [`Config`](#Config) accepts.

::Anchor{id="Config"}

## `Config`

```silk
pub struct Config
```

The limits of a pool. [`withPool`](#withPool) checks them before it allocates.

::Anchor{id="Config.maxTotal"}

### Field `maxTotal`

```silk
pub maxTotal: usize
```

The maximum number of opening, leased, and idle connections together. It is 1 through
[`MAX_TOTAL`](#MAX_TOTAL).

::Anchor{id="Config.maxIdle"}

### Field `maxIdle`

```silk
pub maxIdle: usize
```

The maximum number of idle connections. It is at most `maxTotal`. Zero disables reuse.

::Anchor{id="Config.maxPerOrigin"}

### Field `maxPerOrigin`

```silk
pub maxPerOrigin: usize
```

The maximum number of connections to one origin. It is 1 through `maxTotal`.

::Anchor{id="Config.idleTimeoutNanoseconds"}

### Field `idleTimeoutNanoseconds`

```silk
pub idleTimeoutNanoseconds: u64
```

The time that a connection stays idle before it expires, on the monotonic clock. It is more
than zero.

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

Returns the default limits: 32 in total, 16 idle, 8 for each origin, and 30 seconds of idle
time.

::Anchor{id="ConfigField"}

## `ConfigField`

```silk
pub enum ConfigField
```

The [`Config`](#Config) field that is not valid.

::Anchor{id="ConfigField.MaxTotal"}

### `MaxTotal`

```silk
MaxTotal
```

`maxTotal` is zero or more than [`MAX_TOTAL`](#MAX_TOTAL).

::Anchor{id="ConfigField.MaxIdle"}

### `MaxIdle`

```silk
MaxIdle
```

`maxIdle` is more than `maxTotal`.

::Anchor{id="ConfigField.MaxPerOrigin"}

### `MaxPerOrigin`

```silk
MaxPerOrigin
```

`maxPerOrigin` is zero or more than `maxTotal`.

::Anchor{id="ConfigField.IdleTimeout"}

### `IdleTimeout`

```silk
IdleTimeout
```

`idleTimeoutNanoseconds` is zero.

::Anchor{id="ConfigField.impl.Debug"}

## Implementation `Debug for ConfigField`

```silk
impl Debug for ConfigField
```

::Anchor{id="ConfigField.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `MaxTotal`.

::Anchor{id="PoolError"}

## `PoolError`

```silk
pub union PoolError
```

The error of a pool operation: a bad [`Config`](#Config), a full or closed pool, a key that the context
does not accept, or an opening that ends after its deadline.

::Anchor{id="PoolError.InvalidConfig"}

### `InvalidConfig`

```silk
InvalidConfig
```

The [`Config`](#Config) is not valid. Nothing was allocated.

::Anchor{id="PoolError.InvalidConfig.field"}

#### Field `field`

```silk
pub field: ConfigField
```

The field that is not valid.

::Anchor{id="PoolError.PoolFull"}

### `PoolFull`

```silk
PoolFull
```

The pool or the origin is at its limit, and no idle connection can be evicted.

::Anchor{id="PoolError.PoolClosed"}

### `PoolClosed`

```silk
PoolClosed
```

The pool is closed. A copied [`Handle`](#Handle) can outlive its pool, but it cannot check out.

::Anchor{id="PoolError.ContextMismatch"}

### `ContextMismatch`

```silk
ContextMismatch
```

The context of the pool does not accept the key. For example, a direct pool got a proxy key.

::Anchor{id="PoolError.OpeningExpired"}

### `OpeningExpired`

```silk
OpeningExpired
```

The deadline passed before or while the connection was opened. A new connection is closed.

::Anchor{id="PoolError.impl.Copy"}

## Implementation `Copy for PoolError`

```silk
impl Copy for PoolError
```

::Anchor{id="PoolError.impl.Debug"}

## Implementation `Debug for PoolError`

```silk
impl Debug for PoolError
```

::Anchor{id="PoolError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `InvalidConfig { ... }`.

::Anchor{id="Counts"}

## `Counts`

```silk
pub struct Counts
```

A snapshot of the slots of a pool. See [`counts`](#counts).

::Anchor{id="Counts.opening"}

### Field `opening`

```silk
pub opening: usize
```

The number of connections that are being opened.

::Anchor{id="Counts.leased"}

### Field `leased`

```silk
pub leased: usize
```

The number of connections that a handler is using.

::Anchor{id="Counts.idle"}

### Field `idle`

```silk
pub idle: usize
```

The number of connections that are ready for reuse.

::Anchor{id="Counts.total"}

### Field `total`

```silk
pub total: usize
```

The sum of `opening`, `leased`, and `idle`.

::Anchor{id="Counts.closed"}

### Field `closed`

```silk
pub closed: bool
```

Whether the pool is closed.

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

The result of [`collect`](#collect).

::Anchor{id="Collection.expired"}

### Field `expired`

```silk
pub expired: usize
```

The number of expired idle connections that were closed.

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

Where the connection of a checkout came from.

::Anchor{id="CheckoutSource.Reused"}

### `Reused`

```silk
Reused
```

An idle connection with the same key. The one that was returned last is used first.

::Anchor{id="CheckoutSource.Opened"}

### `Opened`

```silk
Opened
```

A new connection from [`PoolContext.acquire`](#PoolContext.acquire).

::Anchor{id="CheckoutResult"}

## `CheckoutResult`

```silk
pub struct CheckoutResult<A>
```

The result of [`withConnection`](#withConnection).

::Anchor{id="CheckoutResult.value"}

### Field `value`

```silk
pub value: A
```

The value that the handler returned.

::Anchor{id="CheckoutResult.source"}

### Field `source`

```silk
pub source: CheckoutSource
```

Whether the connection was reused or new.

::Anchor{id="PoolKey"}

## `PoolKey`

```silk
pub interface PoolKey<CopyError, ?CopyRequirements>
```

The key that selects which connections can be reused for a request.

Two keys are [`PoolKey.equals`](#PoolKey.equals) only if a connection for one is safe to use for the other. The
pool stores a copy of each key. [`ConnectionKey`](#ConnectionKey) is the standard key.

::Anchor{id="PoolKey.copy"}

### Operation `copy`

```silk
effect fn copy(key: &Self) -> Self ! CopyError ? CopyRequirements
```

Returns a copy of `key` that the pool can keep.

::Anchor{id="PoolKey.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Returns whether a connection for one key can be used for the other: the same route, provider,
and security settings.

::Anchor{id="PoolKey.sameOrigin"}

### Operation `sameOrigin`

```silk
fn sameOrigin(left: &Self, right: &Self) -> bool
```

Returns whether the keys have the same original origin. The pool uses it for `maxPerOrigin`.

::Anchor{id="PoolContextCopy"}

## `PoolContextCopy`

```silk
pub interface PoolContextCopy<CopyError, ?CopyRequirements>
```

Copies a pool context, for [`copyHandle`](#copyHandle).

::Anchor{id="PoolContextCopy.copy"}

### Operation `copy`

```silk
effect fn copy(context: &Self) -> Self ! CopyError ? CopyRequirements
```

Returns a copy of `context`. If it fails, no handle is made.

::Anchor{id="PoolContext"}

## `PoolContext`

```silk
pub interface PoolContext<K, P, AcquisitionError, ?AcquisitionRequirements>
```

Opens new connections for a pool.

The pool keeps the context outside its shared state and never changes it.

::Anchor{id="PoolContext.accepts"}

### Operation `accepts`

```silk
fn accepts(context: &Self, key: &K) -> bool
```

Returns whether this context can open connections for `key`. It does not allocate, read the
clock, or use the network.

::Anchor{id="PoolContext.acquire"}

### Operation `acquire`

```silk
effect fn acquire(
    context: &Self,
    key: &K,
    deadline: Option<Instant>,
  ) -> Connection<P> ! AcquisitionError ? AcquisitionRequirements
```

Opens one connection for `key`. It finishes before `deadline`, if there is one. The connection
does not keep the deadline.

::Anchor{id="PoolHandler"}

## `PoolHandler`

```silk
pub interface PoolHandler<K, P, C, A, E, ?R>
```

The code that uses a pool. [`withPool`](#withPool) lends the pool to it, and closes the pool when it
returns, fails, or is cancelled.

::Anchor{id="PoolHandler.handle"}

### Operation `handle`

```silk
effect<'scope> fn handle<'scope>(handler: Self, pool: &'scope mut Pool<K, P, C>) -> A ! E ? R
```

Uses `pool`. The pool closes when this returns. The borrow of the pool cannot escape.

::Anchor{id="EndpointIdentity"}

## `EndpointIdentity`

```silk
pub union EndpointIdentity
```

How a [`ConnectionKey`](#ConnectionKey) reaches its origin.

::Anchor{id="EndpointIdentity.Direct"}

### `Direct`

```silk
Direct
```

A direct network connection to the original origin.

::Anchor{id="EndpointIdentity.Proxy"}

### `Proxy`

```silk
Proxy
```

A connection through a proxy.

::Anchor{id="EndpointIdentity.Proxy.route"}

#### Field `route`

```silk
pub route: RouteKey
```

The route: the mode, the proxy, the original origin, and the identity of the credentials.

::Anchor{id="EndpointIdentity.Unix"}

### `Unix`

```silk
Unix
```

A connection to a Unix socket at an exact path.

::Anchor{id="ConnectionKey"}

## `ConnectionKey`

```silk
pub struct ConnectionKey
```

The standard [`PoolKey`](#PoolKey): the original origin and how it is reached.

### Details
The key holds only the route. The TLS, trust, HTTP, and connector settings are part of the
[`PoolContext`](#PoolContext), so all keys of one pool share them. Two direct keys for the same origin are
equal, even if DNS gives other addresses.

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

Returns a key for a direct connection to `originalOrigin`. It does not allocate.

::Anchor{id="ConnectionKey.impl.proxy"}

### Associated function `proxy`

```silk
pub fn proxy(route: RouteKey) -> ConnectionKey
```

Returns a key for a connection through a proxy route. The origin comes from the route.

::Anchor{id="ConnectionKey.impl.unix"}

### Associated function `unix`

```silk
pub effect fn unix(
    originalOrigin: Origin,
    path: &[u8],
  ) -> ConnectionKey ! OutOfMemoryError ? &mut Allocator
```

Returns a key for a connection to `originalOrigin` through the Unix socket at `path`. It
copies `path`.

::Anchor{id="ConnectionKey.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Origin
```

Returns the original origin.

::Anchor{id="ConnectionKey.impl.isDirect"}

### Method `isDirect`

```silk
pub fn isDirect(self: &Self) -> bool
```

Returns whether the key is for a direct network connection.

::Anchor{id="ConnectionKey.impl.matchesUnixPath"}

### Method `matchesUnixPath`

```silk
pub fn matchesUnixPath(self: &Self, path: &[u8]) -> bool
```

Returns whether the key is for a Unix socket at exactly `path`.

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

A pool. [`withPool`](#withPool) lends it to a [`PoolHandler`](#PoolHandler), and closes it after.

::Anchor{id="Handle"}

## `Handle`

```silk
pub struct Handle<K, P, C>
```

A reference to a pool, for checkouts.

Get the handle of a pool with [`Pool.handle`](#Pool.impl.handle). Make more handles with [`copyHandle`](#copyHandle). All
handles share the slots of the pool.

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

Returns the handle of the pool.

::Anchor{id="context"}

## `context`

```silk
pub fn context<'handle, K, P, C>(handle: &'handle Handle<K, P, C>) -> &'handle C
```

Returns the context of a handle.

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

Makes a pool, lends it to `handler`, and closes it after.

### Details
The pool allocates all `config.maxTotal` slots first and then does not allocate. Each slot is
opening, leased, or idle. The total of the three is at most `maxTotal`, and the total for one
origin is at most `maxPerOrigin`. It closes when the handler returns, fails,
or is cancelled. Closing closes all idle connections.

### Errors
- `PoolError.InvalidConfig` if `config` is not valid.
- `OutOfMemoryError` if the slots cannot be allocated.
- The error of the handler.

### Gotchas
- Use the pool from one thread only. It does not use locks.
- There is no wait queue. When the pool is full, a checkout fails at once with `PoolFull`.
- Expired idle connections are closed only by a checkout, a return, or [`collect`](#collect). No
  background task closes them.
- There is no HTTP/2 and no WebSocket pooling.

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

Returns another handle for the same pool.

It copies the context first. If that fails, no new handle is made.

::Anchor{id="counts"}

## `counts`

```silk
pub fn counts<K, P, C>(handle: &Handle<K, P, C>) -> Counts
```

Returns the number of opening, leased, and idle connections. It does not allocate or read the
clock.

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

Checks out one connection for `key`, and lends it to `handler`.

### Details
A checkout does these steps:
1. It removes one expired idle connection, if there is one.
2. It takes the idle connection with the same key that was returned last.
3. If there is none, it reserves a slot. If the pool or the origin is at its limit, it evicts
   the oldest idle connection. If no idle connection can be evicted, it fails with `PoolFull`.
4. It opens a new connection with `PoolContext.acquire` if it reserved a slot.

The handler gets the connection to use alone. `CheckoutResult.source` tells if the connection
was reused or new. To open a new connection, the context gets the earlier of `requestDeadline`
and `acquisitionDeadline`. The handler uses `requestDeadline` for its exchanges.

After the handler returns, the connection goes back to the pool if it is eligible for reuse.
Otherwise it is closed. If the handler fails or is cancelled, the connection is closed. If the
idle list is full, the oldest idle connection is closed.

### Gotchas
There is no wait queue: when the pool is full, the checkout fails at once with `PoolFull`. The
pool never sends a request again.

### Errors
- `PoolError.ContextMismatch` if the context does not accept `key`.
- `PoolError.OpeningExpired` if the deadline passes before or during opening.
- `PoolError.PoolFull` or `PoolError.PoolClosed`.
- The errors of the key copy, the connector, and the handler.

::Anchor{id="collect"}

## `collect`

```silk
pub effect fn collect<K, P, C>(handle: &Handle<K, P, C>) -> Collection
? &mut MonotonicClock
where &mut P provides &HttpTransport from &mut HttpTransport
```

Closes all idle connections that have expired. It reads the clock one time.

Call it from time to time. No background task closes expired idle connections.

::Anchor{id="close"}

## `close`

```silk
pub effect fn close<K, P, C>(pool: &mut Pool<K, P, C>) -> () ! ExchangeError
where &mut P provides &HttpTransport from &mut HttpTransport
```

Closes the pool and all its idle connections.

Calling it again does nothing. Leased connections are closed when their handlers finish. If some
connections fail to close, it still closes the others, and then fails with the first error.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
