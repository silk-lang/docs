The WASI Preview 2 provider for the portable `Http` service.

## When to use
Provide `WasiHttp.make()` for `Http` in a component whose host enables `wasi:http`.
The host supplies HTTP transport, TLS verification, and network policy.

## Details
Defaults are a 30-second deadline for the whole request, a 16 MiB response body, and ten
redirects. Request overrides are honored. Redirects follow Fetch method rules, reject HTTPS
downgrades, and remove credentials when the origin changes. Request and response bodies stream
through host backpressure; the returned response owns the complete body.

Import as `WasiHttp` with `import silk.http.client_wasi { WasiHttp }`.

Public declarations: 1.

::Anchor{id="WasiHttp"}

## `WasiHttp`

```silk
pub struct WasiHttp
```

A WASI HTTP provider with a host monotonic clock. Hosts control transport and TLS policy.

::Anchor{id="WasiHttp.impl"}

## Implementation `WasiHttp`

```silk
impl WasiHttp
```

::Anchor{id="WasiHttp.impl.make"}

### Associated function `make`

```silk
pub fn make() -> WasiHttp
```

Makes a client with a 30-second deadline, a 16 MiB body limit, and ten redirects by default.

::Anchor{id="WasiHttp.impl.Http"}

## Implementation `Http for WasiHttp`

```silk
impl Http for WasiHttp
```

::Anchor{id="WasiHttp.impl.Http.send"}

### Operation `send`

```silk
effect fn send(self: &mut Self, request: Request) -> Response ! HttpError | OutOfMemoryError ? &mut Allocator
```

Category: HTTP.

Profiles: `wasm32-wasip2`.
