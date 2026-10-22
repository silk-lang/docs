A simple HTTP client: send a request, and get the whole response in memory.

## When to use
Use [`Http`](#Http) to call web APIs. Code that sends requests requires `? &mut Http`. The program
gives a provider one time, near `main`: `NativeHttp` from `silk.http_client_native` for real
requests, or a fake in tests. Use `silk.http_exchange` to stream bodies or to control the
connection.

## Details
Build a [`Request`](#Request) with chained calls, such as `Request.get("/repos").query("page",
"2").bearer(token)`. Building never allocates and never fails. [`Http.send`](#Http.send) checks the request.
A response with any status, also 4xx and 5xx, is a [`Response`](#Response). Call [`Response.expectOk`](#Response.impl.expectOk) to
make a status outside 200 to 299 an error.

## Errors
- [`HttpError`](#HttpError) for all failures. Its `kind` tells what failed, `status` has the response status
  if one arrived, and `cause` keeps the error from the lower module.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
A request holds at most 8 path segments, 16 query parameters, and 32 headers. More fail at send
time with `InvalidRequest`. [`Request.json`](#Request.impl.json) writes only the fields that are visible from your
module. Fields that are private to another module are not written.

## Examples
### Test code that uses Http with a fake provider
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http_client { Http, HttpError, Request, Response }
import silk.string { String }

struct FakeHttp {
  calls: i32
}

impl Http for FakeHttp {
  effect fn send(self: &mut Self, request: Request) -> Response
    ! HttpError | OutOfMemoryError
    ? &mut Allocator {
    self.calls = self.calls + 1
    let url = run request.resolveUrl("https://api.example.com")
    if String.view(&url) == "https://api.example.com/search?q=a%20b" {
      return run Response.make(200, b"found")
    }
    return run Response.make(404, b"")
  }
}

// This function works with any provider.
effect fn search() -> i32
  ! HttpError | OutOfMemoryError
  ? &mut Http | &mut Allocator {
  let response = run Http.send(Request.get("/search").query("q", "a b"))
  let checked = run response.expectOk()
  let text = run checked.text()
  if text != "found" {
    return 1
  }
  return 0
}

pub effect fn main() -> i32
  ! HttpError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut fake = FakeHttp { calls: 0 }
  let code = run search() |> Effect.provideMut<Http>(&mut fake)
    |> Effect.provideMut<Allocator>(&mut allocator)
  if fake.calls != 1 {
    return 1
  }
  return code
}
```

Import as `HttpClient` with `import silk.http_client as HttpClient`.

Public declarations: 11.

::Anchor{id="MAX_PATH_SEGMENTS"}

## `MAX_PATH_SEGMENTS`

```silk
pub const MAX_PATH_SEGMENTS: usize
```

The maximum number of path segments in a request.

::Anchor{id="MAX_QUERY_PARAMETERS"}

## `MAX_QUERY_PARAMETERS`

```silk
pub const MAX_QUERY_PARAMETERS: usize
```

The maximum number of query parameters in a request.

::Anchor{id="MAX_HEADERS"}

## `MAX_HEADERS`

```silk
pub const MAX_HEADERS: usize
```

The maximum number of headers that you add to a request.

::Anchor{id="HttpErrorKind"}

## `HttpErrorKind`

```silk
pub enum HttpErrorKind
```

What kind of failure an [`HttpError`](#HttpError) reports.

::Anchor{id="HttpErrorKind.InvalidUrl"}

### `InvalidUrl`

```silk
InvalidUrl
```

The URL is not valid, has user information, or its scheme is not `http` or `https`.

::Anchor{id="HttpErrorKind.InvalidRequest"}

### `InvalidRequest`

```silk
InvalidRequest
```

A method or a header is not valid, or the request has too many parts.

::Anchor{id="HttpErrorKind.Encode"}

### `Encode`

```silk
Encode
```

The request body could not be encoded.

::Anchor{id="HttpErrorKind.Connect"}

### `Connect`

```silk
Connect
```

Name resolution or the TCP connection failed.

::Anchor{id="HttpErrorKind.Tls"}

### `Tls`

```silk
Tls
```

TLS negotiation, certificate validation, or the trust store failed.

::Anchor{id="HttpErrorKind.Timeout"}

### `Timeout`

```silk
Timeout
```

The request deadline passed.

::Anchor{id="HttpErrorKind.Protocol"}

### `Protocol`

```silk
Protocol
```

The response broke the HTTP rules or a limit.

::Anchor{id="HttpErrorKind.TooLarge"}

### `TooLarge`

```silk
TooLarge
```

The response body exceeded the configured limit.

::Anchor{id="HttpErrorKind.Redirect"}

### `Redirect`

```silk
Redirect
```

A redirect is not valid, is not safe, or there were too many redirects.

::Anchor{id="HttpErrorKind.Status"}

### `Status`

```silk
Status
```

The status is not from 200 to 299, and [`Response.expectOk`](#Response.impl.expectOk) or the provider rejects it.

::Anchor{id="HttpErrorKind.Decode"}

### `Decode`

```silk
Decode
```

The response body could not be decoded as requested.

::Anchor{id="HttpCause"}

## `HttpCause`

```silk
pub union HttpCause
```

The lower-level error behind an [`HttpError`](#HttpError), kept for code that needs the detail.

::Anchor{id="HttpCause.None"}

### `None`

```silk
None
```

No lower-level error.

::Anchor{id="HttpCause.Uri"}

### `Uri`

```silk
Uri
```

URL parsing failed.

::Anchor{id="HttpCause.Uri.error"}

#### Field `error`

```silk
pub error: UriError
```

The parser failure.

::Anchor{id="HttpCause.Value"}

### `Value`

```silk
Value
```

A header or status value was invalid.

::Anchor{id="HttpCause.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The value failure.

::Anchor{id="HttpCause.Request"}

### `Request`

```silk
Request
```

Request preparation failed.

::Anchor{id="HttpCause.Request.error"}

#### Field `error`

```silk
pub error: RequestError
```

The preparation failure.

::Anchor{id="HttpCause.Exchange"}

### `Exchange`

```silk
Exchange
```

The HTTP exchange failed.

::Anchor{id="HttpCause.Exchange.error"}

#### Field `error`

```silk
pub error: ExchangeError
```

The exchange failure.

::Anchor{id="HttpCause.Resolver"}

### `Resolver`

```silk
Resolver
```

Name resolution failed.

::Anchor{id="HttpCause.Resolver.error"}

#### Field `error`

```silk
pub error: ResolverError
```

The resolver failure.

::Anchor{id="HttpCause.Tls"}

### `Tls`

```silk
Tls
```

TLS negotiation or certificate validation failed.

::Anchor{id="HttpCause.Tls.error"}

#### Field `error`

```silk
pub error: ConnectionError
```

The connection failure.

::Anchor{id="HttpCause.Identity"}

### `Identity`

```silk
Identity
```

The server certificate identity could not be checked.

::Anchor{id="HttpCause.Identity.error"}

#### Field `error`

```silk
pub error: IdentityError
```

The identity failure.

::Anchor{id="HttpCause.Trust"}

### `Trust`

```silk
Trust
```

The trust store could not be loaded.

::Anchor{id="HttpCause.Trust.error"}

#### Field `error`

```silk
pub error: TrustSourceError
```

The trust source failure.

::Anchor{id="HttpCause.Json"}

### `Json`

```silk
Json
```

JSON encoding or decoding failed.

::Anchor{id="HttpCause.Json.error"}

#### Field `error`

```silk
pub error: JsonError
```

The JSON failure.

::Anchor{id="HttpCause.Utf8"}

### `Utf8`

```silk
Utf8
```

The body was not valid UTF-8.

::Anchor{id="HttpCause.Utf8.error"}

#### Field `error`

```silk
pub error: InvalidUtf8
```

The decoding failure.

::Anchor{id="HttpError"}

## `HttpError`

```silk
pub struct HttpError
```

One HTTP client failure.

### Details

`kind` tells what failed, `status` has the response status if one arrived, and `cause` keeps
the error from the lower module.

::Anchor{id="HttpError.kind"}

### Field `kind`

```silk
pub kind: HttpErrorKind
```

What went wrong.

::Anchor{id="HttpError.message"}

### Field `message`

```silk
pub message: string<'static>
```

A short description for people.

::Anchor{id="HttpError.status"}

### Field `status`

```silk
pub status: Option<u16>
```

The response status, when a response arrived.

::Anchor{id="HttpError.cause"}

### Field `cause`

```silk
pub cause: HttpCause
```

The lower-level error, when there is one.

::Anchor{id="HttpError.impl"}

## Implementation `HttpError`

```silk
impl HttpError
```

::Anchor{id="HttpError.impl.make"}

### Associated function `make`

```silk
pub fn make(kind: HttpErrorKind, message: string<'static>) -> HttpError
```

Makes an error with no status and no lower-level cause.

::Anchor{id="HttpError.impl.caused"}

### Associated function `caused`

```silk
pub fn caused(kind: HttpErrorKind, message: string<'static>, cause: HttpCause) -> HttpError
```

Makes an error that keeps a lower-level cause.

::Anchor{id="Field"}

## `Field`

```silk
pub struct Field<'a>
```

One query parameter or header as given to a [`Request`](#Request).

::Anchor{id="Field.name"}

### Field `name`

```silk
pub name: string<'a>
```

The parameter or header name.

::Anchor{id="Field.value"}

### Field `value`

```silk
pub value: string<'a>
```

The parameter or header value.

::Anchor{id="Field.impl.Copy"}

## Implementation `Copy for Field<'a>`

```silk
impl<'a> Copy for Field<'a>
```

::Anchor{id="Body"}

## `Body`

```silk
pub union Body<'a>
```

The request payload and its media type.

::Anchor{id="Body.Empty"}

### `Empty`

```silk
Empty
```

No payload.

::Anchor{id="Body.Borrowed"}

### `Borrowed`

```silk
Borrowed
```

Borrowed payload bytes.

::Anchor{id="Body.Borrowed.data"}

#### Field `data`

```silk
pub data: &'a [u8]
```

The payload.

::Anchor{id="Body.Borrowed.contentType"}

#### Field `contentType`

```silk
pub contentType: string<'a>
```

The `Content-Type` value.

::Anchor{id="Body.Owned"}

### `Owned`

```silk
Owned
```

Owned payload bytes, such as encoded JSON.

::Anchor{id="Body.Owned.data"}

#### Field `data`

```silk
pub data: Bytes
```

The payload.

::Anchor{id="Body.Owned.contentType"}

#### Field `contentType`

```silk
pub contentType: string<'static>
```

The `Content-Type` value.

::Anchor{id="Request"}

## `Request`

```silk
pub struct Request<'a>
```

An HTTP request that you build with chained calls. Nothing is checked or sent until
[`Http.send`](#Http.send).

### Details

Build it with chained calls, such as `Request.get("/repos").query("page", "2").bearer(token)`.
Nothing is checked until [`Http.send`](#Http.send). Only [`Request.json`](#Request.impl.json) allocates.

### Gotchas

A request holds at most 8 path segments, 16 query parameters, and 32 headers. More fail at send
time with `InvalidRequest`. [`Request.json`](#Request.impl.json) writes only the fields that are visible from your
module.

::Anchor{id="Request.impl"}

## Implementation `Request<'a>`

```silk
impl<'a> Request<'a>
```

::Anchor{id="Request.impl.make"}

### Associated function `make`

```silk
pub fn make(method: Method<'static>, url: string<'a>) -> Request<'a>
```

Starts a request with an explicit method.

::Anchor{id="Request.impl.get"}

### Associated function `get`

```silk
pub fn get(url: string<'a>) -> Request<'a>
```

Starts a GET request.

::Anchor{id="Request.impl.post"}

### Associated function `post`

```silk
pub fn post(url: string<'a>) -> Request<'a>
```

Starts a POST request.

::Anchor{id="Request.impl.put"}

### Associated function `put`

```silk
pub fn put(url: string<'a>) -> Request<'a>
```

Starts a PUT request.

::Anchor{id="Request.impl.patch"}

### Associated function `patch`

```silk
pub fn patch(url: string<'a>) -> Request<'a>
```

Starts a PATCH request.

::Anchor{id="Request.impl.delete"}

### Associated function `delete`

```silk
pub fn delete(url: string<'a>) -> Request<'a>
```

Starts a DELETE request.

::Anchor{id="Request.impl.head"}

### Associated function `head`

```silk
pub fn head(url: string<'a>) -> Request<'a>
```

Starts a HEAD request.

::Anchor{id="Request.impl.options"}

### Associated function `options`

```silk
pub fn options(url: string<'a>) -> Request<'a>
```

Starts an OPTIONS request.

::Anchor{id="Request.impl.path"}

### Method `path`

```silk
pub fn path(self: Self, segment: string<'a>) -> Request<'a>
```

Adds `segment` to the end of the URL path, as given, such as `"/repos"`.

::Anchor{id="Request.impl.query"}

### Method `query`

```silk
pub fn query(self: Self, name: string<'a>, value: string<'a>) -> Request<'a>
```

Adds a query parameter. The name and the value are percent-encoded when the request is sent.

::Anchor{id="Request.impl.header"}

### Method `header`

```silk
pub fn header(self: Self, name: string<'a>, value: string<'a>) -> Request<'a>
```

Adds a header. The name and value are validated when the request is sent.

#### Details

`User-Agent`, `Accept`, `Authorization`, and `Host` replace the generated values.
`Content-Length` and `Transfer-Encoding` are generated from the body and are rejected.

::Anchor{id="Request.impl.bearer"}

### Method `bearer`

```silk
pub fn bearer(self: Self, token: string<'a>) -> Request<'a>
```

Sets `Authorization: Bearer <token>`, replacing any `Authorization` header.

::Anchor{id="Request.impl.bytes"}

### Method `bytes`

```silk
pub fn bytes(self: Self, data: &'a [u8], contentType: string<'a>) -> Request<'a>
```

Sends borrowed bytes with an explicit `Content-Type`.

::Anchor{id="Request.impl.text"}

### Method `text`

```silk
pub fn text(self: Self, text: string<'a>) -> Request<'a>
```

Sends UTF-8 text as `text/plain; charset=utf-8`.

::Anchor{id="Request.impl.json"}

### Method `json`

```silk
pub effect fn json<T>(self: Self, value: &T) -> Request<'a>
  ! HttpError | OutOfMemoryError
  ? &mut Allocator
```

Serializes the visible fields of `value` as compact JSON and sends it as `application/json`.

#### Details

`value` is a named or anonymous struct, such as `&.{ title: "Water plants" }`. Its fields are
written in declaration order through their `Serialize` witnesses. The bytes are allocated
from the ambient allocator.

#### Gotchas

Fields that are private to another module are not written.

::Anchor{id="Request.impl.timeoutSeconds"}

### Method `timeoutSeconds`

```silk
pub fn timeoutSeconds(self: Self, seconds: u64) -> Request<'a>
```

Sets the deadline of this request, in place of the default of the provider.

::Anchor{id="Request.impl.maxBodyBytes"}

### Method `maxBodyBytes`

```silk
pub fn maxBodyBytes(self: Self, limit: usize) -> Request<'a>
```

Sets the maximum size of the response body, in place of the default of the provider.

::Anchor{id="Request.impl.maxRedirects"}

### Method `maxRedirects`

```silk
pub fn maxRedirects(self: Self, hops: usize) -> Request<'a>
```

Sets the maximum number of redirects to follow. With 0, a redirect response is returned as it
is.

::Anchor{id="Request.impl.method"}

### Method `method`

```silk
pub fn method(self: &Self) -> Method<'static>
```

Returns the request method.

::Anchor{id="Request.impl.url"}

### Method `url`

```silk
pub fn url(self: &Self) -> string<'a>
```

Returns the URL exactly as given, before path segments and query parameters.

::Anchor{id="Request.impl.paths"}

### Method `paths`

```silk
pub fn paths(self: &Self) -> &[string<'a>]
```

Returns the path segments in the order they were added.

::Anchor{id="Request.impl.queryParameters"}

### Method `queryParameters`

```silk
pub fn queryParameters(self: &Self) -> &[Field<'a>]
```

Returns the query parameters in the order they were added.

::Anchor{id="Request.impl.headers"}

### Method `headers`

```silk
pub fn headers(self: &Self) -> &[Field<'a>]
```

Returns the headers in the order they were added.

::Anchor{id="Request.impl.bodyBytes"}

### Method `bodyBytes`

```silk
pub fn bodyBytes(self: &Self) -> &[u8]
```

Returns the payload bytes, empty when there is no body.

::Anchor{id="Request.impl.contentType"}

### Method `contentType`

```silk
pub fn contentType(self: &Self) -> Option<string<'a>>
```

Returns the payload's `Content-Type`, when there is a body.

::Anchor{id="Request.impl.hasBody"}

### Method `hasBody`

```silk
pub fn hasBody(self: &Self) -> bool
```

Returns whether the request has a body.

::Anchor{id="Request.impl.overflowed"}

### Method `overflowed`

```silk
pub fn overflowed(self: &Self) -> bool
```

Returns `true` if the request has more parts than it can hold. [`Http.send`](#Http.send) then fails with
`InvalidRequest`.

::Anchor{id="Request.impl.timeout"}

### Method `timeout`

```silk
pub fn timeout(self: &Self) -> Option<u64>
```

Returns the per-request timeout in seconds, when set.

::Anchor{id="Request.impl.maxBody"}

### Method `maxBody`

```silk
pub fn maxBody(self: &Self) -> Option<usize>
```

Returns the per-request response body limit, when set.

::Anchor{id="Request.impl.bearerToken"}

### Method `bearerToken`

```silk
pub fn bearerToken(self: &Self) -> Option<string<'a>>
```

Returns the bearer token, when set.

::Anchor{id="Request.impl.redirects"}

### Method `redirects`

```silk
pub fn redirects(self: &Self) -> Option<usize>
```

Returns the per-request redirect limit, when set.

::Anchor{id="Request.impl.resolveUrl"}

### Method `resolveUrl`

```silk
pub effect fn resolveUrl(self: &Self, base: string) -> String ! OutOfMemoryError ? &mut Allocator
```

Returns the full URL: `base` if the URL has no scheme, then the URL, the path segments, and
the percent-encoded query parameters.

::Anchor{id="Response"}

## `Response`

```silk
pub struct Response
```

A complete response: status, headers, and the whole body in memory.

### Details

A response with any status, also 4xx and 5xx, is a `Response`. Call [`Response.expectOk`](#Response.impl.expectOk) to
make a status outside 200 to 299 an error.

::Anchor{id="Response.impl"}

## Implementation `Response`

```silk
impl Response
```

::Anchor{id="Response.impl.fromParts"}

### Associated function `fromParts`

```silk
pub fn fromParts(head: OwnedResponseHead, body: Bytes, url: String) -> Response
```

Makes a response from a head, a body, and the final URL. Providers use it.

::Anchor{id="Response.impl.make"}

### Associated function `make`

```silk
pub effect fn make(status: u16, body: &[u8]) -> Response
  ! HttpError | OutOfMemoryError
  ? &mut Allocator
```

Makes a response with no headers, for fake providers in tests.

::Anchor{id="Response.impl.withHeaders"}

### Associated function `withHeaders`

```silk
pub effect fn withHeaders(status: u16, headers: &[Header], body: &[u8]) -> Response
  ! HttpError | OutOfMemoryError
  ? &mut Allocator
```

Makes a response with headers, for fake providers in tests.

::Anchor{id="Response.impl.status"}

### Method `status`

```silk
pub fn status(self: &Self) -> u16
```

Returns the status code, such as 200 or 404.

::Anchor{id="Response.impl.ok"}

### Method `ok`

```silk
pub fn ok(self: &Self) -> bool
```

Returns `true` if the status is from 200 to 299.

::Anchor{id="Response.impl.header"}

### Method `header`

```silk
pub fn header<'r>(self: &'r Self, name: string) -> Option<&'r [u8]>
```

Returns the value of the first header with this name, compared without case.

::Anchor{id="Response.impl.head"}

### Method `head`

```silk
pub fn head<'r>(self: &'r Self) -> ResponseHead<'r>
```

Returns the response head with every header.

::Anchor{id="Response.impl.body"}

### Method `body`

```silk
pub fn body(self: &Self) -> &[u8]
```

Returns the body bytes.

::Anchor{id="Response.impl.intoBody"}

### Method `intoBody`

```silk
pub fn intoBody(self: Self) -> Bytes
```

Moves the body out of the response.

::Anchor{id="Response.impl.url"}

### Method `url`

```silk
pub fn url(self: &Self) -> string
```

Returns the URL of the response, after redirects. It is empty for a response from
[`Response.make`](#Response.impl.make).

::Anchor{id="Response.impl.text"}

### Method `text`

```silk
pub effect fn text(self: &Self) -> string ! HttpError
```

Returns the body as text. Fails with `Decode` if the body is not valid UTF-8.

::Anchor{id="Response.impl.json"}

### Method `json`

```silk
pub effect fn json(self: &Self) -> Value ! HttpError | OutOfMemoryError ? &mut Allocator
```

Parses the body as one JSON document. Fails with `Decode` if it is not valid JSON.

::Anchor{id="Response.impl.decode"}

### Method `decode`

```silk
pub effect fn decode<T: Deserialize>(self: &Self) -> T ! HttpError | OutOfMemoryError ? &mut Allocator
```

Decodes the body as one JSON document of type `T`. Fails with `Decode` if it does not match.

::Anchor{id="Response.impl.expectOk"}

### Method `expectOk`

```silk
pub effect fn expectOk(self: Self) -> Response ! HttpError
```

Returns the response if its status is from 200 to 299. Otherwise fails with a `Status` error
that has the status.

::Anchor{id="Http"}

## `Http`

```silk
pub service Http
```

The service that sends HTTP requests.

### Details
The provider decides how requests travel. `NativeHttp` in `silk.http_client_native` uses sockets
and TLS, and a test provider can return fixed responses. A provider can also wrap another
provider, for example to add headers, logs, or retries, and forward with
`Effect.provideMut<Http>`.

### When to use

Use it to call web APIs. Code that sends requests requires `? &mut Http`. The program gives a
provider one time, near `main`: `NativeHttp` from `silk.http_client_native` for real requests,
or a fake in tests. Use `silk.http_exchange` to stream bodies or to control the connection.

::Anchor{id="Http.send"}

### Operation `send`

```silk
effect fn send(request: Request) -> Response ! HttpError | OutOfMemoryError ? &mut Http | &mut Allocator
```

Sends one request and returns the complete response, whatever its status.

#### Details

It checks the request first. A response with a 4xx or 5xx status is a success. Call
`Response.expectOk` to make it an error.

#### Errors

- `HttpError` for all failures. Its `kind` tells what failed, `status` has the response
  status if one arrived, and `cause` keeps the error from the lower module. A request with
  more than 8 path segments, 16 query parameters, or 32 headers fails with
  `InvalidRequest`.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Http.impl"}

## Implementation `Http`

```silk
impl Http
```

::Anchor{id="Http.impl.get"}

### Associated function `get`

```silk
pub effect fn get(url: string) -> Response ! HttpError | OutOfMemoryError ? &mut Http | &mut Allocator
```

Sends a GET request to `url`.

::Anchor{id="Http.impl.postJson"}

### Associated function `postJson`

```silk
pub effect fn postJson<T>(url: string, value: &T) -> Response
  ! HttpError | OutOfMemoryError
  ? &mut Http | &mut Allocator
```

Sends `value` as JSON in a POST request to `url`.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
