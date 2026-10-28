The native provider for the `Http` service of `silk.http.client`.

## When to use
Give [`NativeHttp`](#NativeHttp) one time, near `main`, with `Effect.provideMut<Http>(&mut http)`. All code
that requires `? &mut Http` then sends real requests over sockets and TLS.

## Details
The provider has its own clocks, random source, and trust store, so you give only an allocator.
The defaults are a deadline of 30 seconds for each request, a response body of at most 16 MiB,
up to 10 redirects, and the PEM bundle of the platform for HTTPS: `/etc/ssl/cert.pem` on macOS
and `/etc/ssl/certs/ca-certificates.crt` on Linux. [`NativeHttp.fromEnvironment`](#NativeHttp.impl.fromEnvironment) uses the file
in `SSL_CERT_FILE` when it is set, and the proxies in `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`,
and `NO_PROXY`. Each request opens a new HTTP/1.1 connection and sends `Accept-Encoding:
identity`, so the body arrives as the server sent it.

Redirects follow the Fetch standard. After 303, and after 301 or 302 for a POST, the client
sends a GET without a body. After 307 and 308, it sends the same method and body. A redirect
from HTTPS to HTTP fails. A redirect to another origin does not send `Authorization` and
`Cookie`.

## Gotchas
The deadline covers the TLS handshake and the HTTP exchange, but not the name lookup and the TCP
connect. The macOS keychain is not used, only the PEM bundle. [`NativeHttp.make`](#NativeHttp.impl.make) reads no
environment variables, so it never uses a proxy. Only `http://` proxies are supported.

## Examples
### Set up the client
The request in this example fails before it connects, because `ftp` is not supported.

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.http.client { Http, HttpError, HttpErrorKind, Request, Response }
import silk.http.client_native { NativeHttp }
import silk.core.result { Result }

effect fn check() -> i32
  ! OutOfMemoryError
  ? &mut Http | &mut Allocator {
  // A scheme other than http or https fails before any connection.
  let sent = run Effect.result(Http.send(Request.get("ftp://example.com/version")))
  return match move sent {
    Result.Success { value: _ } => 1
    Result.Failure { error } => match move error {
      HttpError failure => {
        if failure.kind == HttpErrorKind.InvalidUrl {
          return 0
        }
        return 1
      }
      OutOfMemoryError allocation => {
        fail move allocation
      }
    }
  }
}

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut http = NativeHttp.make().baseUrl("https://api.example.com").header(
    "Accept",
    "application/json"
  ).timeoutSeconds(10)
  return run check() |> Effect.provideMut<Http>(&mut http)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `HttpClientNative` with `import silk.http.client_native as HttpClientNative`.

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

The maximum number of headers that [`NativeHttp.header`](#NativeHttp.impl.header) adds.

::Anchor{id="NativeHttp"}

## `NativeHttp`

```silk
pub struct NativeHttp<'config>
```

A native HTTP client. It holds the defaults for all requests: the base URL, headers, limits,
and trust.

### When to use

Give it one time, near `main`, with `Effect.provideMut<Http>(&mut http)`. All code that
requires `? &mut Http` then sends real requests over sockets and TLS.

### Details

The provider has its own clocks, random source, and trust store, so you give only an
allocator. The defaults are a deadline of 30 seconds for each request, a response body of at
most 16 MiB, up to 10 redirects, and the PEM bundle of the platform for HTTPS:
`/etc/ssl/cert.pem` on macOS and `/etc/ssl/certs/ca-certificates.crt` on Linux. Each request
opens a new HTTP/1.1 connection and sends `Accept-Encoding: identity`, so the body arrives as
the server sent it.

Redirects follow the Fetch standard. After 303, and after 301 or 302 for a POST, the client
sends a GET without a body. After 307 and 308, it sends the same method and body. A redirect
from HTTPS to HTTP fails. A redirect to another origin does not send `Authorization` and
`Cookie`.

### Gotchas

The deadline covers the TLS handshake and the HTTP exchange, but not the name lookup and the
TCP connect. The macOS keychain is not used, only the PEM bundle. [`NativeHttp.make`](#NativeHttp.impl.make) reads no
environment variables, so it never uses a proxy. Only `http://` proxies are supported.

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

Returns a client with the default limits and the PEM bundle of the platform. It reads
nothing yet.

#### Details

The defaults are a deadline of 30 seconds for each request, a response body of at most 16
MiB, up to 10 redirects, and the PEM bundle `/etc/ssl/cert.pem` on macOS or
`/etc/ssl/certs/ca-certificates.crt` on Linux. Use [`NativeHttp.fromEnvironment`](#NativeHttp.impl.fromEnvironment) to honor
`SSL_CERT_FILE`.

::Anchor{id="NativeHttp.impl.fromEnvironment"}

### Associated function `fromEnvironment`

```silk
pub effect fn fromEnvironment() -> NativeHttp<'config>
    ! HttpError | HostInputError | OutOfMemoryError
    ? &mut HostInput | &mut Allocator
```

Makes a client that uses `SSL_CERT_FILE` as its PEM bundle and the proxy variables when they
are set.

#### Details

A relative `SSL_CERT_FILE` is resolved against the working directory. An empty value fails.

HTTPS requests go through `HTTPS_PROXY`, then `https_proxy`, `ALL_PROXY`, and `all_proxy`,
the first one that is set and not empty. Plain HTTP requests go through `HTTP_PROXY`, then
`http_proxy`, `ALL_PROXY`, and `all_proxy`. HTTPS uses a `CONNECT` tunnel, so TLS still
checks the server certificate. A proxy URL such as `http://user:pass@proxy:3128` sends Basic
credentials to the proxy. A URL without a scheme is read as `http://`.

`NO_PROXY` or `no_proxy` lists hosts that are reached directly, separated by commas. An entry
matches the host and its subdomains, so `example.com` and `.example.com` both match
`api.example.com`. A port in an entry is ignored, and `*` matches every host. An address
range such as `10.0.0.0/8` matches nothing; list the addresses instead.

#### Errors

A proxy URL that is not valid fails with `InvalidUrl`. Only `http://` proxies are supported,
so an `https://` or `socks5://` proxy URL fails too.

::Anchor{id="NativeHttp.impl.baseUrl"}

### Method `baseUrl`

```silk
pub fn baseUrl(self: Self, url: string<'config>) -> NativeHttp<'config>
```

Puts `url` before each request URL that has no scheme, such as `"/repos"`.

::Anchor{id="NativeHttp.impl.header"}

### Method `header`

```silk
pub fn header(self: Self, name: string<'config>, value: string<'config>) -> NativeHttp<'config>
```

Adds a header to each request. A header of the request with the same name replaces it.

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

Sets how many redirects requests follow by default. With 0, a redirect response is returned
as it is.

::Anchor{id="NativeHttp.impl.failOnStatus"}

### Method `failOnStatus`

```silk
pub fn failOnStatus(self: Self) -> NativeHttp<'config>
```

Makes each final response with a status outside 200 to 299 fail with a `Status` error.

::Anchor{id="NativeHttp.impl.trustBundle"}

### Method `trustBundle`

```silk
pub fn trustBundle(self: Self, path: string<'config>) -> NativeHttp<'config>
```

Uses the PEM bundle at the absolute path `path`, such as `"/etc/ssl/cert.pem"`, instead of
the platform bundle.

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

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
