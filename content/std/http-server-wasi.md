HTTP requests delivered to a WASI Preview 2 component.

## When to use
Export the canonical `wasi:http/incoming-handler@0.2.12#handle` function from a component
with the `wasi:http/incoming-handler` WIT interface. Transfer its two handles to
`Exchange.take`, then read the request and send one response. The host owns listening,
transport, TLS, and HTTP framing. Provide `Allocator` and `MonotonicClock` to body operations.

## Details
Request metadata is copied into owned values. Bodies are bounded by the caller's limit and
deadline. A response is submitted before its body is written, so host backpressure can advance.
Dropping an unanswered exchange releases both handles; the host treats it as a failed request.

Import as `WasiHttpServer` with `import silk.http.server_wasi as WasiHttpServer`.

Public declarations: 2.

::Anchor{id="Request"}

## `Request`

```silk
pub struct Request
```

An owned snapshot of request metadata. Field order, duplicates, and raw field values survive.

::Anchor{id="Request.method"}

### Field `method`

```silk
pub method: String
```

The case-sensitive HTTP method.

::Anchor{id="Request.pathWithQuery"}

### Field `pathWithQuery`

```silk
pub pathWithQuery: Option<String>
```

The path and optional query supplied by the host, absent when the request has neither.

::Anchor{id="Request.scheme"}

### Field `scheme`

```silk
pub scheme: Option<String>
```

The request scheme, when supplied by the host.

::Anchor{id="Request.authority"}

### Field `authority`

```silk
pub authority: Option<String>
```

The request authority, when supplied by the host.

::Anchor{id="Request.fields"}

### Field `fields`

```silk
pub fields: List<Field>
```

The request's fields in host order.

::Anchor{id="Exchange"}

## `Exchange`

```silk
pub struct Exchange
```

Owns one incoming request and its response out-parameter. Responding consumes this value.

::Anchor{id="Exchange.impl"}

## Implementation `Exchange`

```silk
impl Exchange
```

::Anchor{id="Exchange.impl.take"}

### Associated function `take`

```silk
pub unsafe fn take(request: u32, response: u32) -> Exchange
```

Takes the incoming-request and response-outparam handles passed to the WIT `handle` export.
Both handles must be live, unborrowed, and uniquely owned; the caller gives up ownership.

::Anchor{id="Exchange.impl.metadata"}

### Method `metadata`

```silk
pub effect fn metadata(self: &Self) -> Request ! HttpError | OutOfMemoryError ? &mut Allocator
```

Copies the request method, optional URL parts, and fields. It does not consume the body.

::Anchor{id="Exchange.impl.readBody"}

### Method `readBody`

```silk
pub effect fn readBody(self: &mut Self, maximum: usize, deadline: Option<Instant>) -> Bytes
      ! HttpError | OutOfMemoryError ? &mut Allocator | &mut MonotonicClock
```

Reads the request body once, enforcing the byte limit and absolute monotonic deadline.
A second call fails. Dropping a failed read releases its body and stream resources.

::Anchor{id="Exchange.impl.respond"}

### Method `respond`

```silk
pub effect fn respond(self: Self, status: u16, fields: &[Field], body: &[u8], deadline: Option<Instant>) -> ()
      ! HttpError ? &mut MonotonicClock
```

Sends a response with ordered fields and a complete body, consuming this exchange.
The host validates status and field restrictions. Failure before submission drops the
out-parameter; failure after submission terminates the response body.

Category: HTTP.

Profiles: `wasm32-wasip2`.
