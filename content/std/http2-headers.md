HTTP/2 field validation for requests, responses, and trailers under RFC 9113 section 8.

Import as `Message` with `import silk.http2_headers { Message }`.

Public declarations: 3.

::Anchor{id="Section"}

## `Section`

```silk
pub enum Section
```

The expected field section type.

::Anchor{id="Section.Request"}

### `Request`

```silk
Request
```

Initial request fields, including request pseudo-headers.

::Anchor{id="Section.Response"}

### `Response`

```silk
Response
```

Informational or final response fields, including `:status`.

::Anchor{id="Section.Trailers"}

### `Trailers`

```silk
Trailers
```

Trailing fields, without pseudo-headers.

::Anchor{id="Message"}

## `Message`

```silk
pub struct Message
```

Message properties needed for body validation.

::Anchor{id="Message.hasLength"}

### Field `hasLength`

```silk
pub hasLength: bool
```

True if Content-Length is present.

::Anchor{id="Message.length"}

### Field `length`

```silk
pub length: u64
```

The declared body length, or zero if absent.

::Anchor{id="Message.status"}

### Field `status`

```silk
pub status: u32
```

Response status, or zero for requests and trailers.

::Anchor{id="Message.head"}

### Field `head`

```silk
pub head: bool
```

True for a HEAD request.

::Anchor{id="Message.connect"}

### Field `connect`

```silk
pub connect: bool
```

True for a CONNECT request.

::Anchor{id="validate"}

## `validate`

```silk
pub effect<'call> fn validate<'call, 'data: 'call>(
  fields: &'call [Field<'data>],
  section: Section,
  stream: u32
) -> Message
  ! ProtocolError
```

Validates one complete decoded field section. Violations are stream PROTOCOL_ERRORs.
It rejects invalid bytes, pseudo-header order and duplicates, connection fields, and conflicting Content-Length values.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
