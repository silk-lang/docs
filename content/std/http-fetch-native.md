The native [`Context`](#Context) for `silk.http_fetch`: it connects over sockets and TLS, with a proxy
policy and an optional connection pool.

## When to use
Make a [`Context`](#Context) with [`Context.make`](#Context.impl.make), or [`Context.makeWithPool`](#Context.impl.makeWithPool) to reuse connections, and
give it to `Fetch.make`.

## Details
The context keeps one proxy policy. For each attempt, it selects the route again for the current
URI before it connects. [`Context.makeWithPool`](#Context.impl.makeWithPool) copies a handle to a native pool. The copy
shares the slots and settings of the pool.

## Gotchas
The native pool holds only direct TCP and Unix connections. When the proxy policy selects a
proxy for an origin, the attempt does not use the pool, and fails instead of a direct
connection. It never sends proxy credentials to a pooled direct connection.

Import as `FetchNative` with `import silk.http_fetch_native as FetchNative`.

Public declarations: 1.

::Anchor{id="Context"}

## `Context`

```silk
pub struct Context<'configuration>
```

The native connection context for `silk.http_fetch`.

### Details
[`Context.make`](#Context.impl.make) does not allocate. [`Context.makeWithPool`](#Context.impl.makeWithPool) first makes the same context, then
copies the pool handle. If the copy fails, no context is returned, and the pool handle stays
valid.

::Anchor{id="Context.impl"}

## Implementation `Context<'configuration>`

```silk
impl<'configuration> Context<'configuration>
```

::Anchor{id="Context.impl.make"}

### Associated function `make`

```silk
pub fn make(
    route: Route<'configuration>,
    options: Options,
    limits: Limits,
  ) -> Context<'configuration>
```

Returns a context that opens a new connection for each attempt.

::Anchor{id="Context.impl.makeWithPool"}

### Associated function `makeWithPool`

```silk
pub effect fn makeWithPool(
    route: Route<'configuration>,
    options: Options,
    limits: Limits,
    pool: &Handle<ConnectionKey, NativeTransport, NativePool.Context>,
  ) -> Context<'configuration>
  ! PoolError | TrustSourceError | OutOfMemoryError
  ? &mut Allocator
```

Returns a context that can use connections from `pool`.

#### Details
The pool keeps its own transport, HTTP, TLS, ALPN, and trust settings. Each attempt checks
that its route can use the pool before it connects.

::Anchor{id="Context.impl.hasPool"}

### Method `hasPool`

```silk
pub fn hasPool(self: &Self) -> bool
```

Returns `true` if the context has a pool.

::Anchor{id="Context.impl.FetchClient"}

## Implementation `FetchClient<'policy, NativeRouteProvider, NativeTransport, A, HandlerError, ProxyError | RequestError | ValueError | OriginError | ExchangeError | NativeExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError | PoolError, HandlerRequirements, &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random | &mut TrustSource> for Context<'configuration>`

```silk
impl<
    'configuration,
    'policy,
    A,
    HandlerError,
    ?HandlerRequirements,
  > FetchClient<
    'policy,
    NativeRouteProvider,
    NativeTransport,
    A,
    HandlerError,
    ProxyError
      | RequestError
      | ValueError
      | OriginError
      | ExchangeError
      | NativeExchangeError
      | ResolverError
      | NativeSocketError
      | ConnectionError
      | IdentityError
      | TrustSourceError
      | OutOfMemoryError
      | PoolError,
    HandlerRequirements,
    &mut Allocator
      | &mut MonotonicClock
      | &mut SystemClock
      | &mut Random
      | &mut TrustSource,
  > for Context<'configuration>
```

::Anchor{id="Context.impl.FetchClient.withAttempt"}

### Operation `withAttempt`

```silk
effect fn withAttempt(
      client: &mut Self,
      request: AttemptRequest<'policy>,
      httpLimits: Limits,
      poolMode: PoolMode,
      proxyMode: ProxyMode,
      deadline: Option<Instant>,
    ) -> A
    ! HandlerError
      | ProxyError
      | RequestError
      | ValueError
      | OriginError
      | ExchangeError
      | NativeExchangeError
      | ResolverError
      | NativeSocketError
      | ConnectionError
      | IdentityError
      | TrustSourceError
      | OutOfMemoryError
      | PoolError
    ? HandlerRequirements
      | &mut HybridAttempt<
        'policy,
        NativeRouteProvider,
        NativeTransport,
        A,
        HandlerError ? HandlerRequirements
      >
      | &mut Allocator
      | &mut MonotonicClock
      | &mut SystemClock
      | &mut Random
      | &mut TrustSource
    where HandlerRequirements in Without<HandlerRequirements, ByteDuplex>,
      HandlerRequirements in Without<HandlerRequirements, HttpTransport>
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
