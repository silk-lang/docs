Check and write the head of an HTTP request before it is sent.

## When to use
Use [`fromUri`](#fromUri) or [`prepare`](#prepare) to make a [`PreparedRequest`](#PreparedRequest) for a direct connection to an
origin. `silk.http_exchange` sends it. Use [`prepareForward`](#prepareForward) and [`prepareConnect`](#prepareConnect) for a route
from `silk.http_proxy`. Most programs use `silk.http_client` or `silk.http_fetch`, which call
this module.

## Details
The [`HeaderPolicy`](#HeaderPolicy) adds `Host`, `User-Agent`, `Accept`, and `Authorization`. The [`BodyMode`](#BodyMode)
adds `Content-Length` or `Transfer-Encoding`. You cannot also give these fields, or `Expect` and
`Connection`, in `headers`. Your other fields keep their order. The prepared request owns a copy
of all its bytes. Nothing is sent and nothing is resolved here.

## Errors
- [`RequestError`](#RequestError) tells which check failed. Nothing was sent.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
By default, Basic credentials fail over plain HTTP with `InsecureBasic`. Set `basicSecurity` to
`AllowInsecureBasic` only when you accept that the password is sent as plain text.

## Examples
### Prepare a GET request
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http { Header, Method, ValueError, Version }
import silk.http_headers { Headers, Limits }
import silk.http_request { BodyMode, HeaderPolicy, PreparedRequest, RequestError, fromUri }
import silk.result { Result }
import silk.uri { Uri }
import silk.uri_reference { ParseError }
import silk.usize

fn limits() -> Limits {
  return Limits {
    maxMethodBytes: 64,
    maxTargetBytes: 8192,
    maxNameBytes: 256,
    maxValueBytes: 8192,
    maxFields: 32,
    maxFieldBytes: 8192,
    maxOwnedBytes: 16384,
  }
}

fn check(actual: &[u8], expected: &[u8]) -> i32 {
  let mut i = usize.ZERO
  while i < actual.length && i < expected.length {
    if actual[i] != expected[i] {
      return 1
    }
    i = i + usize.ONE
  }
  if actual.length != expected.length {
    return 1
  }
  return 0
}

effect fn program() -> i32
  ! RequestError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let uri = match Uri.parse("http://example.com/a?b#frag") {
    Result<Uri, ParseError>.Success { value } => value
    Result<Uri, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let entries: [Header<'static>; 0] = []
  let headers = match Headers.make(&entries, limits()) {
    Result<Headers, ValueError>.Success { value } => value
    Result<Headers, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  let policy = HeaderPolicy.defaults()
  let prepared = run fromUri(
    &uri,
    Version.Http11,
    Method.get(),
    &headers,
    &policy,
    BodyMode.Empty,
    false,
    limits(),
    4096,
    256
  )
    |> Effect.provideMut<Allocator>(&mut allocator)

  // The fragment is not sent, and the policy adds Host, User-Agent, and Accept.
  return check(
    PreparedRequest.bytes(&prepared),
    b"GET /a?b HTTP/1.1\r\nHost: example.com\r\nUser-Agent: silk-http/1\r\nAccept: */*\r\n\r\n"
  )
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `HttpRequest` with `import silk.http_request as HttpRequest`.

Public declarations: 11.

::Anchor{id="BodyMode"}

## `BodyMode`

```silk
pub union BodyMode
```

How the request body is framed. It adds `Content-Length` or `Transfer-Encoding`, so you cannot
also give these fields in `headers`.

::Anchor{id="BodyMode.Empty"}

### `Empty`

```silk
Empty
```

There is no body. No framing field is sent.

::Anchor{id="BodyMode.KnownLength"}

### `KnownLength`

```silk
KnownLength
```

The body has a known length. `Content-Length` is sent.

::Anchor{id="BodyMode.KnownLength.length"}

#### Field `length`

```silk
pub length: u64
```

The length of the body, in bytes.

::Anchor{id="BodyMode.Chunked"}

### `Chunked`

```silk
Chunked
```

The body is sent in chunks, with trailers. `Transfer-Encoding: chunked` is sent. Only for
HTTP/1.1.

::Anchor{id="BodyMode.impl.Copy"}

## Implementation `Copy for BodyMode`

```silk
impl Copy for BodyMode
```

::Anchor{id="HeaderControl"}

## `HeaderControl`

```silk
pub union HeaderControl<'value>
```

What to do with a field that the policy makes.

::Anchor{id="HeaderControl.Default"}

### `Default`

```silk
Default
```

Send the default value: for `Host`, the authority of the origin; for `User-Agent`,
`silk-http/1`; for `Accept`, `*/*`; for `Authorization`, no field.

::Anchor{id="HeaderControl.Omit"}

### `Omit`

```silk
Omit
```

Do not send the field. HTTP/1.1 cannot omit `Host`.

::Anchor{id="HeaderControl.Value"}

### `Value`

```silk
Value
```

Send this value.

::Anchor{id="HeaderControl.Value.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The field value, without the spaces around it.

::Anchor{id="HeaderControl.impl.Copy"}

## Implementation `Copy for HeaderControl<'value>`

```silk
impl<'value> Copy for HeaderControl<'value>
```

::Anchor{id="Authorization"}

## `Authorization`

```silk
pub union Authorization<'value>
```

The `Authorization` field to send.

::Anchor{id="Authorization.Absent"}

### `Absent`

```silk
Absent
```

Send no `Authorization` field.

::Anchor{id="Authorization.Value"}

### `Value`

```silk
Value
```

Send this value, such as `Bearer abc`.

::Anchor{id="Authorization.Value.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The whole field value.

::Anchor{id="Authorization.Basic"}

### `Basic`

```silk
Basic
```

Send HTTP Basic credentials. See `silk.http_basic`.

::Anchor{id="Authorization.Basic.username"}

#### Field `username`

```silk
pub username: &'value [u8]
```

The username. It cannot have a colon or a control byte.

::Anchor{id="Authorization.Basic.password"}

#### Field `password`

```silk
pub password: &'value [u8]
```

The password. It cannot have a control byte.

::Anchor{id="Authorization.impl.Copy"}

## Implementation `Copy for Authorization<'value>`

```silk
impl<'value> Copy for Authorization<'value>
```

::Anchor{id="BasicSecurity"}

## `BasicSecurity`

```silk
pub enum BasicSecurity
```

Whether Basic credentials can go over plain HTTP.

::Anchor{id="BasicSecurity.RequireTls"}

### `RequireTls`

```silk
RequireTls
```

Basic credentials need HTTPS. Over plain HTTP, the request fails with `InsecureBasic`.

::Anchor{id="BasicSecurity.AllowInsecureBasic"}

### `AllowInsecureBasic`

```silk
AllowInsecureBasic
```

Basic credentials can go over plain HTTP, where anyone on the path can read them.

::Anchor{id="HeaderPolicy"}

## `HeaderPolicy`

```silk
pub struct HeaderPolicy<'value>
```

The fields that the request adds: `Host`, `User-Agent`, `Accept`, and `Authorization`. Start
from [`HeaderPolicy.defaults`](#HeaderPolicy.impl.defaults). You cannot also give these fields in `headers`.

### Gotchas

By default, Basic credentials fail over plain HTTP with `InsecureBasic`. Set `basicSecurity` to
`AllowInsecureBasic` only when you accept that the password is sent as plain text.

::Anchor{id="HeaderPolicy.host"}

### Field `host`

```silk
pub host: HeaderControl<'value>
```

The `Host` field. The default is the authority of the origin, such as `example.com:8080`.

::Anchor{id="HeaderPolicy.userAgent"}

### Field `userAgent`

```silk
pub userAgent: HeaderControl<'value>
```

The `User-Agent` field. The default is `silk-http/1`.

::Anchor{id="HeaderPolicy.accept"}

### Field `accept`

```silk
pub accept: HeaderControl<'value>
```

The `Accept` field. The default is `*/*`.

::Anchor{id="HeaderPolicy.authorization"}

### Field `authorization`

```silk
pub authorization: Authorization<'value>
```

The `Authorization` field. The default is none.

::Anchor{id="HeaderPolicy.basicSecurity"}

### Field `basicSecurity`

```silk
pub basicSecurity: BasicSecurity
```

Whether Basic credentials can go over plain HTTP. The default is `RequireTls`.

::Anchor{id="HeaderPolicy.http10KeepAlive"}

### Field `http10KeepAlive`

```silk
pub http10KeepAlive: bool
```

When `true`, an HTTP/1.0 request sends `Connection: keep-alive`. HTTP/1.1 keeps the connection
by default.

::Anchor{id="HeaderPolicy.impl.Copy"}

## Implementation `Copy for HeaderPolicy<'value>`

```silk
impl<'value> Copy for HeaderPolicy<'value>
```

::Anchor{id="HeaderPolicy.impl"}

## Implementation `HeaderPolicy<'value>`

```silk
impl<'value> HeaderPolicy<'value>
```

::Anchor{id="HeaderPolicy.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> HeaderPolicy<'value>
```

Returns the default policy: default `Host`, `User-Agent`, and `Accept`, no `Authorization`,
and `RequireTls`.

::Anchor{id="RequestError"}

## `RequestError`

```silk
pub union RequestError
```

The reason that a request was not prepared. Nothing was sent.

::Anchor{id="RequestError.Value"}

### `Value`

```silk
Value
```

A method, target, or field is not valid.

::Anchor{id="RequestError.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The error from `silk.http`.

::Anchor{id="RequestError.Origin"}

### `Origin`

```silk
Origin
```

The origin is not valid, or its authority does not fit.

::Anchor{id="RequestError.Origin.error"}

#### Field `error`

```silk
pub error: OriginError
```

The error from `silk.http_origin`.

::Anchor{id="RequestError.Basic"}

### `Basic`

```silk
Basic
```

The Basic credentials are not valid.

::Anchor{id="RequestError.Basic.error"}

#### Field `error`

```silk
pub error: BasicError
```

The error from `silk.http_basic`. It does not hold the credentials.

::Anchor{id="RequestError.ConflictingHeader"}

### `ConflictingHeader`

```silk
ConflictingHeader
```

`headers` has a field that the policy or the body mode makes, such as `Host` or
`Content-Length`.

::Anchor{id="RequestError.ConflictingAuthority"}

### `ConflictingAuthority`

```silk
ConflictingAuthority
```

The `Host` value in the policy names another origin.

::Anchor{id="RequestError.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

The policy omits `Host` in an HTTP/1.1 request.

::Anchor{id="RequestError.InvalidBodyMode"}

### `InvalidBodyMode`

```silk
InvalidBodyMode
```

The body mode or `require100` does not work with the version. For example, HTTP/1.0 cannot
send chunks.

::Anchor{id="RequestError.MultipleAuthorization"}

### `MultipleAuthorization`

```silk
MultipleAuthorization
```

There is more than one source of credentials.

::Anchor{id="RequestError.InsecureBasic"}

### `InsecureBasic`

```silk
InsecureBasic
```

Basic credentials would go over plain HTTP. See [`BasicSecurity`](#BasicSecurity).

::Anchor{id="RequestError.ProxyAuthorization"}

### `ProxyAuthorization`

```silk
ProxyAuthorization
```

A direct request has a `Proxy-Authorization` field. Proxy credentials come only from a route.

::Anchor{id="RequestError.CredentialLimit"}

### `CredentialLimit`

```silk
CredentialLimit
```

The credentials are longer than `maxCredentialBytes`.

::Anchor{id="RequestError.HeaderLimit"}

### `HeaderLimit`

```silk
HeaderLimit
```

The request has more fields than the limits allow.

::Anchor{id="RequestError.InvalidTarget"}

### `InvalidTarget`

```silk
InvalidTarget
```

A direct request has an absolute target for another origin.

::Anchor{id="PreparedRequest"}

## `PreparedRequest`

```silk
pub struct PreparedRequest
```

A checked request head, written as bytes and ready to send. It owns its memory.

### When to use

Make one with [`fromUri`](#fromUri) or [`prepare`](#prepare) for a direct connection to an origin, or with
[`prepareForward`](#prepareForward) and [`prepareConnect`](#prepareConnect) for a route from `silk.http_proxy`. Send it with
`silk.http_exchange`.

::Anchor{id="PreparedRequest.impl"}

## Implementation `PreparedRequest`

```silk
impl PreparedRequest
```

::Anchor{id="PreparedRequest.impl.bytes"}

### Method `bytes`

```silk
pub fn bytes<'a>(self: &'a Self) -> &'a [u8]
```

Returns the bytes of the head, ending with the empty line.

::Anchor{id="PreparedRequest.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Origin
```

Returns the origin that the request is for.

::Anchor{id="PreparedRequest.impl.physicalPeer"}

### Method `physicalPeer`

```silk
pub fn physicalPeer(self: &Self) -> Origin
```

Returns the server to connect to. It is the origin, or the proxy for a routed request.

::Anchor{id="PreparedRequest.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the HTTP version.

::Anchor{id="PreparedRequest.impl.bodyMode"}

### Method `bodyMode`

```silk
pub fn bodyMode(self: &Self) -> BodyMode
```

Returns how the body is framed.

::Anchor{id="PreparedRequest.impl.require100"}

### Method `require100`

```silk
pub fn require100(self: &Self) -> bool
```

Returns `true` if the head has `Expect: 100-continue`.

::Anchor{id="prepare"}

## `prepare`

```silk
pub effect fn prepare<'value>(
  origin: &Origin,
  version: Version,
  method: Method<'value>,
  target: RequestTarget<'value>,
  headers: &Headers<'value>,
  policy: &HeaderPolicy<'value>,
  body: BodyMode,
  require100: bool,
  limits: Limits,
  maxHeadBytes: usize,
  maxCredentialBytes: usize,
) -> PreparedRequest ! RequestError | OutOfMemoryError ? &mut Allocator
```

Checks a request to `origin` and writes its head.

### Details
The [`HeaderPolicy`](#HeaderPolicy) adds `Host`, `User-Agent`, `Accept`, and `Authorization`. The
[`BodyMode`](#BodyMode) adds `Content-Length` or `Transfer-Encoding`. You cannot also give these fields, or
`Expect` and `Connection`, in `headers`. The prepared request owns a copy of all its bytes.
Nothing is sent and nothing is resolved here. Your fields in `headers` keep their order. When
`require100` is `true`, the head has `Expect:
100-continue`, and the client waits for the server before it sends the body. `maxHeadBytes`
limits the size of the head, and `maxCredentialBytes` the size of the credentials.

::Anchor{id="prepareForward"}

## `prepareForward`

```silk
pub effect fn prepareForward<'configuration, 'value>(
  route: &Route<'configuration>,
  uri: &Uri<'value>,
  version: Version,
  method: Method<'value>,
  headers: &Headers<'value>,
  policy: &HeaderPolicy<'value>,
  body: BodyMode,
  require100: bool,
  limits: Limits,
  maxHeadBytes: usize,
  maxCredentialBytes: usize,
) -> PreparedRequest ! ProxyError | RequestError | OutOfMemoryError ? &mut Allocator
```

Prepares a request for a `Forward` route, which sends it to a plain HTTP proxy.

### Details
The target is the full URI, without user information and fragment, and an empty path becomes
`/`. The route gives the proxy and its `Proxy-Authorization`. `Host` is always sent, also for
HTTP/1.0.

::Anchor{id="prepareConnect"}

## `prepareConnect`

```silk
pub effect fn prepareConnect<'configuration>(
  route: &Route<'configuration>,
  limits: Limits,
  maxHeadBytes: usize,
  maxCredentialBytes: usize,
) -> PreparedRequest ! ProxyError | RequestError | OutOfMemoryError ? &mut Allocator
```

Prepares the HTTP/1.1 `CONNECT` request for a `Tunnel` route.

The target and `Host` are `host:port` of the origin, always with the port. You cannot give
fields, a body, or credentials. The route gives them.

::Anchor{id="fromUri"}

## `fromUri`

```silk
pub effect fn fromUri<'value>(
  uri: &Uri<'value>,
  version: Version,
  method: Method<'value>,
  headers: &Headers<'value>,
  policy: &HeaderPolicy<'value>,
  body: BodyMode,
  require100: bool,
  limits: Limits,
  maxHeadBytes: usize,
  maxCredentialBytes: usize,
) -> PreparedRequest ! RequestError | OutOfMemoryError ? &mut Allocator
```

Checks a direct request for `uri` and writes its head. The origin and the target come from
`uri`. The fragment is not sent.

### Details
The [`HeaderPolicy`](#HeaderPolicy) adds `Host`, `User-Agent`, `Accept`, and `Authorization`, and the
[`BodyMode`](#BodyMode) adds `Content-Length` or `Transfer-Encoding`. Your other fields in `headers` keep
their order. Nothing is sent and nothing is resolved here.

### Gotchas
By default, Basic credentials fail over plain HTTP with `InsecureBasic`.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
