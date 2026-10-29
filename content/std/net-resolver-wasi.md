DNS resolution through a WASI Preview 2 network capability.

## When to use
Provide `WasiResolver` for the portable `Resolver` service in a Preview 2 component.
The runtime must grant name lookup. The provider owns its network capability and releases each
lookup stream on success, failure, or timeout.

Import as `WasiResolver` with `import silk.net.resolver_wasi { WasiResolver }`.

Public declarations: 1.

::Anchor{id="WasiResolver"}

## `WasiResolver`

```silk
pub struct WasiResolver
```

The WASI provider for `Resolver`, owning its network capability and host monotonic clock.
Domain deadlines are absolute times on `OsMonotonicClock`. Host policy controls name lookup.

::Anchor{id="WasiResolver.impl"}

## Implementation `WasiResolver`

```silk
impl WasiResolver
```

::Anchor{id="WasiResolver.impl.make"}

### Associated function `make`

```silk
pub fn make() -> WasiResolver
```

Acquires the host-granted default network and a host monotonic clock.

::Anchor{id="WasiResolver.impl.Resolver"}

## Implementation `Resolver for WasiResolver`

```silk
impl Resolver for WasiResolver
```

::Anchor{id="WasiResolver.impl.Resolver.resolveDomain"}

### Operation `resolveDomain`

```silk
effect fn resolveDomain(self: &mut Self, request: &ResolveRequest, domain: &DomainHost) -> ResolvedEndpoints
      ! ResolverError | OutOfMemoryError ? &mut Allocator
```

Category: Networking.

Profiles: `wasm32-wasip2`.
