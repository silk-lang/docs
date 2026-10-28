The target of an HTTP request, the authority in it, and the `Host` field.

## When to use
A server uses [`RequestTarget.parse`](#RequestTarget.impl.parse) on the target of a received request line, and
[`validateRequestHost`](#validateRequestHost) and [`effectiveAuthority`](#effectiveAuthority) to find the host that the client asked for. A
client uses [`RequestTarget.fromUri`](#RequestTarget.impl.fromUri) and [`hostForUri`](#hostForUri) to write the target and the `Host`
value for a URI.

## Details
There are four target forms. Origin form is a path and query, such as `/search?q=silk`. Absolute
form is a full URI, used with proxies. Authority form is `host:port`, used only with `CONNECT`.
Asterisk form is `*`, used only with `OPTIONS`. Parsing keeps the spelling and the percent
escapes of the input. Nothing in this module does DNS or connects.

## Errors
- `ValueError` with `InvalidTarget`, `InvalidAuthority`, `InvalidPort`, or
  `MethodTargetMismatch`, and the byte offset.

## Gotchas
A received target with a fragment (`#...`) fails. [`RequestTarget.fromUri`](#RequestTarget.impl.fromUri) drops the fragment
of a URI, because a fragment is never sent.

## Examples
### Parse request targets
```silk
import silk.http.message { Method, ValueError, ValueReason }
import silk.http.target { HttpAuthority, RequestTarget, effectiveAuthority }
import silk.option { Option }
import silk.core.result { Result }

pub fn main() -> i32 {
  let get = Method.get()
  let target = match RequestTarget.parse(&get, "/search?q=silk", 8192) {
    Result<RequestTarget, ValueError>.Success { value } => value
    Result<RequestTarget, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  if RequestTarget.isAbsolute(&target) || RequestTarget.format(target) != "/search?q=silk" {
    return 1
  }

  // CONNECT takes host:port.
  let connect = Method.connect()
  let tunnel = match RequestTarget.parse(&connect, "example.com:443", 8192) {
    Result<RequestTarget, ValueError>.Success { value } => value
    Result<RequestTarget, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  let port = match effectiveAuthority(tunnel, Option<HttpAuthority>.none()) {
    Result<Option<HttpAuthority>, ValueError>.Success {
      value: Option<HttpAuthority>.Some { value }
    } => HttpAuthority.port(&value)
    _ => Option<u16>.none()
  }
  if Option<u16>.unwrapOr(move port, 0) != 443 {
    return 1
  }

  // Only OPTIONS can use "*".
  let mismatch = match RequestTarget.parse(&get, "*", 8192) {
    Result<RequestTarget, ValueError>.Success { value: _ } => false
    Result<RequestTarget, ValueError>.Failure { error } => match error.reason {
      ValueReason.MethodTargetMismatch => true
      _ => false
    }
  }
  if !mismatch {
    return 1
  }
  return 0
}
```

Import as `RequestTarget` with `import silk.http.target { RequestTarget }`.

Public declarations: 6.

::Anchor{id="TargetForm"}

## `TargetForm`

```silk
pub enum TargetForm
```

The target form that [`RequestTarget.fromUri`](#RequestTarget.impl.fromUri) writes.

::Anchor{id="TargetForm.Origin"}

### `Origin`

```silk
Origin
```

The path and query, such as `/search?q=silk`. Use it for a direct request.

::Anchor{id="TargetForm.Absolute"}

### `Absolute`

```silk
Absolute
```

The full URI without the fragment. Use it for a request to an HTTP proxy.

::Anchor{id="HttpAuthority"}

## `HttpAuthority`

```silk
pub struct HttpAuthority<'text>
```

A checked `host` or `host:port`, without user information. It keeps the spelling of its input.

::Anchor{id="HttpAuthority.impl.Copy"}

## Implementation `Copy for HttpAuthority<'text>`

```silk
impl<'text> Copy for HttpAuthority<'text>
```

::Anchor{id="HttpAuthority.impl"}

## Implementation `HttpAuthority<'text>`

```silk
impl<'text> HttpAuthority<'text>
```

::Anchor{id="HttpAuthority.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string<'text>) -> Result<HttpAuthority<'text>, ValueError>
```

Checks `text` as a `host[:port]` authority. An IPv6 host keeps its brackets. User information
fails.

::Anchor{id="HttpAuthority.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Returns the whole authority text.

::Anchor{id="HttpAuthority.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> string<'text>
```

Returns the host, with brackets for IPv6.

::Anchor{id="HttpAuthority.impl.portText"}

### Method `portText`

```silk
pub fn portText(self: &Self) -> Option<string<'text>>
```

Returns the port digits without the colon, or `None` if there is no port.

::Anchor{id="HttpAuthority.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Option<u16>
```

Returns the port as a number, or `None` if there is no port.

::Anchor{id="RequestTarget"}

## `RequestTarget`

```silk
pub union RequestTarget<'text>
```

The target of a request, in one of its four forms.

### Details

Origin form is a path and query, such as `/search?q=silk`. Absolute form is a full URI, used
with proxies. Authority form is `host:port`, used only with `CONNECT`. Asterisk form is `*`,
used only with `OPTIONS`. Parsing keeps the spelling and the percent escapes of the input.

### Gotchas

A received target with a fragment (`#...`) fails. [`RequestTarget.fromUri`](#RequestTarget.impl.fromUri) drops the fragment
of a URI, because a fragment is never sent.

::Anchor{id="RequestTarget.Origin"}

### `Origin`

```silk
Origin
```

A path and an optional query, such as `/a?b=c`.

::Anchor{id="RequestTarget.Absolute"}

### `Absolute`

```silk
Absolute
```

A full URI, such as `http://example.com/a`.

::Anchor{id="RequestTarget.Authority"}

### `Authority`

```silk
Authority
```

A `host:port`, for `CONNECT`.

::Anchor{id="RequestTarget.Asterisk"}

### `Asterisk`

```silk
Asterisk
```

The `*` target, for `OPTIONS`.

::Anchor{id="RequestTarget.impl.Copy"}

## Implementation `Copy for RequestTarget<'text>`

```silk
impl<'text> Copy for RequestTarget<'text>
```

::Anchor{id="RequestTarget.impl"}

## Implementation `RequestTarget<'text>`

```silk
impl<'text> RequestTarget<'text>
```

::Anchor{id="RequestTarget.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(
    method: &Method,
    text: string<'text>,
    maxBytes: usize,
  ) -> Result<RequestTarget<'text>, ValueError>
```

Parses a received target, and selects its form from the method and the text.

#### Details
`*` is asterisk form. With `CONNECT`, the text is authority form, and needs a port that is not
0. Text that starts with `/` is origin form. All other text is absolute form.

#### Errors
- `LimitExceeded` if `text` is longer than `maxBytes`.
- `InvalidTarget` if `text` is empty, has a space, a control byte, or a fragment.
- `MethodTargetMismatch` if `*` is used without `OPTIONS`.

::Anchor{id="RequestTarget.impl.validateForMethod"}

### Associated function `validateForMethod`

```silk
pub fn validateForMethod(
    method: &Method,
    target: RequestTarget<'text>,
  ) -> Result<(), ValueError>
```

Returns `MethodTargetMismatch` if the form of `target` does not fit `method`.

::Anchor{id="RequestTarget.impl.format"}

### Method `format`

```silk
pub fn format(self: Self) -> string<'text>
```

Returns the target text, spelled as received.

::Anchor{id="RequestTarget.impl.isAbsolute"}

### Method `isAbsolute`

```silk
pub fn isAbsolute(self: &Self) -> bool
```

Returns `true` for absolute form.

::Anchor{id="RequestTarget.impl.isAuthority"}

### Method `isAuthority`

```silk
pub fn isAuthority(self: &Self) -> bool
```

Returns `true` for authority form.

::Anchor{id="RequestTarget.impl.fromUri"}

### Associated function `fromUri`

```silk
pub fn fromUri(
    uri: &Uri,
    form: TargetForm,
    output: &mut [u8],
  ) -> Result<usize, ValueError>
```

Writes the target for `uri` in the given `form` to the start of `output`, and returns the
length.

The fragment is not written. An empty path is written as `/`.

#### Errors
- `InvalidAuthority` if `uri` has user information.
- `OutputTooSmall` if `output` is too small. Nothing is written.

::Anchor{id="validateRequestHost"}

## `validateRequestHost`

```silk
pub fn validateRequestHost<'value>(
  version: Version,
  target: &RequestTarget,
  headers: &Headers<'value>,
) -> Result<Option<HttpAuthority<'value>>, ValueError>
```

Checks the `Host` field of a received request, and returns its authority.

### Errors
- `MissingHost` if an HTTP/1.1 request has no `Host` field.
- `DuplicateHost` if there is more than one `Host` field.
- `InvalidAuthority` if the value is not a valid authority. `fieldIndex` tells which field.

::Anchor{id="effectiveAuthority"}

## `effectiveAuthority`

```silk
pub fn effectiveAuthority<'value>(
  target: RequestTarget<'value>,
  host: Option<HttpAuthority<'value>>,
) -> Result<Option<HttpAuthority<'value>>, ValueError>
```

Returns the authority that the request is for: the authority in an absolute or `CONNECT` target,
else the `Host` authority.

::Anchor{id="hostForUri"}

## `hostForUri`

```silk
pub fn hostForUri<'value>(uri: &Uri<'value>, output: &mut [u8]) -> Result<usize, ValueError>
```

Writes the `Host` value for `uri`, such as `example.com:8080`, to the start of `output`, and
returns the length.

### Errors
- `InvalidAuthority` if `uri` has user information or no host.
- `OutputTooSmall` if `output` is too small. Nothing is written.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
