The native provider for the `silk.http_client` service.

## When to use

Supply [`NativeHttp`](#NativeHttp) once, near `main`, with `Effect.provideMut<Http>(&mut http)`. Everything
that requires `? &mut Http` then sends real requests over native sockets and TLS.

## Details

The provider owns its clocks, random source, and trust store, so callers only supply an
allocator. Defaults: a 30 second deadline per request, a 16 MiB response body limit, up to 10
redirects, and the platform PEM bundle (`/etc/ssl/cert.pem` on macOS,
`/etc/ssl/certs/ca-certificates.crt` on Linux) for HTTPS. [`NativeHttp.fromEnvironment`](#NativeHttp.impl.fromEnvironment) uses
`SSL_CERT_FILE` instead when it is set. Each request opens one fresh HTTP/1.1 connection and
sends `Accept-Encoding: identity`, so bodies arrive exactly as the server encoded them.

Redirects follow the fetch standard: 303, and 301 or 302 after POST, continue as GET without a
body; 307 and 308 repeat the method and body. A redirect from HTTPS to HTTP fails, and a
redirect to another origin drops `Authorization` and `Cookie`.

## Gotchas

The deadline covers the TLS handshake and the HTTP exchange. Native name resolution and the TCP
connect are not bounded by it. The macOS keychain is not consulted; only the PEM bundle is.

Import as `HttpClientNative` with `import silk.http_client_native as HttpClientNative`.

Public declarations: 5.

::Anchor{id="DEFAULT_TIMEOUT_SECONDS"}

## `DEFAULT_TIMEOUT_SECONDS`

```silk
pub const DEFAULT_TIMEOUT_SECONDS: u64
```

The default deadline for one request, in seconds.

::Anchor{id="DEFAULT_MAX_BODY_BYTES"}

## `DEFAULT_MAX_BODY_BYTES`

```silk
pub const DEFAULT_MAX_BODY_BYTES: usize
```

The default response body limit, in bytes.

::Anchor{id="DEFAULT_MAX_REDIRECTS"}

## `DEFAULT_MAX_REDIRECTS`

```silk
pub const DEFAULT_MAX_REDIRECTS: usize
```

The default number of redirects followed.

::Anchor{id="MAX_DEFAULT_HEADERS"}

## `MAX_DEFAULT_HEADERS`

```silk
pub const MAX_DEFAULT_HEADERS: usize
```

The maximum number of default headers one provider holds.

::Anchor{id="NativeHttp"}

## `NativeHttp`

```silk
pub struct NativeHttp<'config>
```

A native HTTP client: sockets, TLS, redirects, and the defaults every request starts from.

::Anchor{id="NativeHttp.impl"}

## Implementation `NativeHttp<'config>`

```silk
impl<'config> NativeHttp<'config>
```

::Anchor{id="NativeHttp.impl.make"}

### Associated function `make`

```silk
pub fn make() -> NativeHttp<'config>
```

Makes a client with the default limits and the platform PEM bundle; nothing is read yet.

::Anchor{id="NativeHttp.impl.fromEnvironment"}

### Associated function `fromEnvironment`

```silk
pub effect fn fromEnvironment() -> NativeHttp<'config>
    ! HttpError | HostInputError | OutOfMemoryError
    ? &mut HostInput | &mut Allocator
```

Makes a client that uses `SSL_CERT_FILE` as its PEM bundle when that variable is set.

#### Details

A relative path is resolved against the working directory. An empty value fails.

::Anchor{id="NativeHttp.impl.baseUrl"}

### Method `baseUrl`

```silk
pub fn baseUrl(self: Self, url: string<'config>) -> NativeHttp<'config>
```

Prefixes every request URL that has no scheme, such as `"/repos"`, with `url`.

::Anchor{id="NativeHttp.impl.header"}

### Method `header`

```silk
pub fn header(self: Self, name: string<'config>, value: string<'config>) -> NativeHttp<'config>
```

Adds a header to every request; a request header with the same name replaces it.

::Anchor{id="NativeHttp.impl.timeoutSeconds"}

### Method `timeoutSeconds`

```silk
pub fn timeoutSeconds(self: Self, seconds: u64) -> NativeHttp<'config>
```

Sets the default deadline for each request.

::Anchor{id="NativeHttp.impl.maxBodyBytes"}

### Method `maxBodyBytes`

```silk
pub fn maxBodyBytes(self: Self, limit: usize) -> NativeHttp<'config>
```

Sets the default response body limit.

::Anchor{id="NativeHttp.impl.maxRedirects"}

### Method `maxRedirects`

```silk
pub fn maxRedirects(self: Self, hops: usize) -> NativeHttp<'config>
```

Sets how many redirects requests follow by default; zero returns redirects as responses.

::Anchor{id="NativeHttp.impl.failOnStatus"}

### Method `failOnStatus`

```silk
pub fn failOnStatus(self: Self) -> NativeHttp<'config>
```

Makes every non-2xx final response fail with an `HttpErrorKind.Status` error.

::Anchor{id="NativeHttp.impl.trustBundle"}

### Method `trustBundle`

```silk
pub fn trustBundle(self: Self, path: &'config [u8]) -> NativeHttp<'config>
```

Uses the PEM bundle at this absolute path instead of the platform bundle.

::Anchor{id="NativeHttp.impl.Http"}

## Implementation `Http for NativeHttp<'config>`

```silk
impl<'config> Http for NativeHttp<'config>
```

::Anchor{id="NativeHttp.impl.Http.send"}

### Operation `send`

```silk
effect fn send(self: &mut Self, request: Request) -> Response ! HttpError | OutOfMemoryError ? &mut Allocator
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
