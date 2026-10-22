Native direct TCP, Unix, and HTTPS contexts for bounded HTTP connection pools.

## When to use

Use [`withDirectPool`](#withDirectPool) for direct TCP and HTTPS origins. Use [`withUnixPool`](#withUnixPool) when one exact
Unix path supplies the physical transport for HTTP or HTTPS origins.

## Details

Each pool owns one immutable [`Context`](#Context). Construction copies the prepared trust snapshot
before pool publication. Each HTTPS opening receives another bounded copy before contact.
Native acquisition gets the checkout deadline, but each published HTTP owner retains no
acquisition or request deadline.

## Gotchas

These contexts reject proxy keys with `PoolError.ContextMismatch` before native contact. A
later owned proxy transport seam must provide a different context.

Import as `PoolNative` with `import silk.http_connection_pool_native as PoolNative`.

Public declarations: 8.

::Anchor{id="Context"}

## `Context`

```silk
pub struct Context
```

An immutable native provider, HTTP, route, TLS, ALPN, and prepared-trust context.

### Details

Construction is available only through [`withDirectPool`](#withDirectPool) and [`withUnixPool`](#withUnixPool). The context
accepts direct keys for its route and rejects all sealed proxy keys before native contact.

::Anchor{id="limitsEqual"}

## `limitsEqual`

```silk
pub fn limitsEqual(left: &Limits, right: &Limits) -> bool
```

Compares every HTTP connection, parser, framing, capacity, and discard limit.

::Anchor{id="Context.impl"}

## Implementation `Context`

```silk
impl Context
```

::Anchor{id="Context.impl.PoolContextCopy"}

## Implementation `PoolContextCopy<TrustSourceError | OutOfMemoryError ? &mut Allocator> for Context`

```silk
impl PoolContextCopy<
  TrustSourceError | OutOfMemoryError ? &mut Allocator
> for Context
```

::Anchor{id="Context.impl.PoolContextCopy.copy"}

### Operation `copy`

```silk
copy: Context.copyContext
```

::Anchor{id="Context.impl.PoolContext"}

## Implementation `PoolContext<ConnectionKey, NativeTransport, NativeExchangeError | ExchangeError | ResolverError | NativeSocketError | ConnectionError | IdentityError | TrustSourceError | OutOfMemoryError ? &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random> for Context`

```silk
impl PoolContext<
  ConnectionKey,
  NativeTransport,
  NativeExchangeError
    | ExchangeError
    | ResolverError
    | NativeSocketError
    | ConnectionError
    | IdentityError
    | TrustSourceError
    | OutOfMemoryError
  ? &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
> for Context
```

::Anchor{id="Context.impl.PoolContext.accepts"}

### Operation `accepts`

```silk
accepts: Context.acceptsKey
```

::Anchor{id="Context.impl.PoolContext.acquire"}

### Operation `acquire`

```silk
acquire: Context.acquire
```

::Anchor{id="withDirectPool"}

## `withDirectPool`

```silk
pub effect<'env> fn withDirectPool<
  A,
  E,
  ?R,
  H: PoolHandler<ConnectionKey, NativeTransport, Context, A, E ? R> + 'env,
  'env,
>(
  config: Config,
  options: Options,
  limits: Limits,
  preparedTrust: Option<&TrustSnapshot>,
  handler: H,
) -> A
! E | PoolError | TrustSourceError | OutOfMemoryError
? R | &mut Allocator
where &mut NativeTransport provides &HttpTransport from &mut HttpTransport
```

Constructs and lends a bounded pool for direct TCP and HTTPS origins.

### Details

Construction copies `preparedTrust` under `options.trust.snapshot` before pool publication.
The context clears `options.deadline`; each checkout supplies its opening deadline separately.

::Anchor{id="withUnixPool"}

## `withUnixPool`

```silk
pub effect<'env> fn withUnixPool<
  A,
  E,
  ?R,
  H: PoolHandler<ConnectionKey, NativeTransport, Context, A, E ? R> + 'env,
  'env,
>(
  config: Config,
  path: &[u8],
  options: Options,
  limits: Limits,
  preparedTrust: Option<&TrustSnapshot>,
  handler: H,
) -> A
! E | PoolError | NativeExchangeError | NativeSocketError | TrustSourceError | OutOfMemoryError
? R | &mut Allocator
where &mut NativeTransport provides &HttpTransport from &mut HttpTransport
```

Constructs and lends a bounded pool for one exact Unix path and HTTP or HTTPS origins.

### Details

Construction copies the path and `preparedTrust` before pool publication. TLS authenticates
each original origin. The context clears `options.deadline` before any checkout.

::Anchor{id="copyHandle"}

## `copyHandle`

```silk
pub effect fn copyHandle(
  handle: &Handle<ConnectionKey, NativeTransport, Context>,
) -> Handle<ConnectionKey, NativeTransport, Context>
! TrustSourceError | OutOfMemoryError
? &mut Allocator
```

Copies the complete native context before publishing another shared-state alias.

### Details

Trust or allocation failure leaves the source handle valid and publishes no new handle.

::Anchor{id="acceptsLimits"}

## `acceptsLimits`

```silk
pub fn acceptsLimits(
  handle: &Handle<ConnectionKey, NativeTransport, Context>,
  limits: Limits,
) -> bool
```

Reports whether a handle's frozen HTTP connection limits exactly match `limits`.

### Details

Fetch-style clients use this pre-contact admission before a checkout can reuse or open an owner.
Every parser, framing, capacity, informational, request-budget, and discard field participates;
the comparison does not inspect mutable pool state.

::Anchor{id="withConnection"}

## `withConnection`

```silk
pub effect<'env> fn withConnection<
  A,
  E,
  ?R,
  H: ConnectionHandler<NativeTransport, A, E ? R> + 'env,
  'env,
>(
  handle: &Handle<ConnectionKey, NativeTransport, Context>,
  origin: Origin,
  requestDeadline: Option<Instant>,
  acquisitionDeadline: Option<Instant>,
  handler: H,
) -> CheckoutResult<A>
! E
  | PoolError
  | NativeExchangeError
  | ExchangeError
  | ResolverError
  | NativeSocketError
  | ConnectionError
  | IdentityError
  | TrustSourceError
  | OutOfMemoryError
? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
where
  &mut NativeTransport provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut NativeTransport provides &HttpTransport from &mut HttpTransport
```

Checks out one direct origin and lends its exclusive connection to `handler`.

### Details

`requestDeadline` remains the request bound. `acquisitionDeadline` can only shorten opening.
A Unix or proxy pool returns `PoolError.ContextMismatch` before native contact.

::Anchor{id="withUnixConnection"}

## `withUnixConnection`

```silk
pub effect<'env> fn withUnixConnection<
  A,
  E,
  ?R,
  H: ConnectionHandler<NativeTransport, A, E ? R> + 'env,
  'env,
>(
  handle: &Handle<ConnectionKey, NativeTransport, Context>,
  path: &[u8],
  origin: Origin,
  requestDeadline: Option<Instant>,
  acquisitionDeadline: Option<Instant>,
  handler: H,
) -> CheckoutResult<A>
! E
  | PoolError
  | NativeExchangeError
  | ExchangeError
  | ResolverError
  | NativeSocketError
  | ConnectionError
  | IdentityError
  | TrustSourceError
  | OutOfMemoryError
? R | &mut Allocator | &mut MonotonicClock | &mut SystemClock | &mut Random
where
  &mut NativeTransport provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut NativeTransport provides &HttpTransport from &mut HttpTransport
```

Checks out one origin through the pool's exact Unix path and lends its connection to `handler`.

### Details

The supplied path forms the conservative key. A different path returns
`PoolError.ContextMismatch` before native contact. The request deadline remains unchanged.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
