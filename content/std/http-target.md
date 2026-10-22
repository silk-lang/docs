HTTP request-target forms, authority validation, URI conversion, and Host selection.

## When to use

Use [`RequestTarget.parse`](#RequestTarget.impl.parse) for received or already serialized targets and [`RequestTarget.fromUri`](#RequestTarget.impl.fromUri)
for outgoing origin- or absolute-form bytes. Use [`validateRequestHost`](#validateRequestHost) before server routing.

## Details

Parsing preserves accepted spelling and percent escapes. URI conversion deliberately omits a
fragment, while raw target parsing rejects one. No operation resolves DNS or connects.

Import as `RequestTarget` with `import silk.http_target { RequestTarget }`.

Public declarations: 6.

::Anchor{id="TargetForm"}

## `TargetForm`

```silk
pub enum TargetForm
```

A URI conversion request-target form.

::Anchor{id="TargetForm.Origin"}

### `Origin`

```silk
Origin
```

Origin-form path plus optional query.

::Anchor{id="TargetForm.Absolute"}

### `Absolute`

```silk
Absolute
```

Absolute-form URI without a fragment.

::Anchor{id="HttpAuthority"}

## `HttpAuthority`

```silk
pub struct HttpAuthority<'text>
```

A validated HTTP authority retaining lexical host and optional port spelling.

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

Validates an authority without userinfo, preserving bracketed IP literals.

::Anchor{id="HttpAuthority.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Borrows the complete authority serialization.

::Anchor{id="HttpAuthority.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> string<'text>
```

Borrows the host, retaining brackets around an IP literal.

::Anchor{id="HttpAuthority.impl.portText"}

### Method `portText`

```silk
pub fn portText(self: &Self) -> Option<string<'text>>
```

Borrows optional port digits without the colon.

::Anchor{id="HttpAuthority.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Option<u16>
```

Returns the checked optional numeric port.

::Anchor{id="RequestTarget"}

## `RequestTarget`

```silk
pub union RequestTarget<'text>
```

One of the four HTTP request-target forms.

::Anchor{id="RequestTarget.Origin"}

### `Origin`

```silk
Origin
```

Origin-form absolute path plus optional query.

::Anchor{id="RequestTarget.Absolute"}

### `Absolute`

```silk
Absolute
```

Absolute-form generic URI.

::Anchor{id="RequestTarget.Authority"}

### `Authority`

```silk
Authority
```

CONNECT authority-form destination.

::Anchor{id="RequestTarget.Asterisk"}

### `Asterisk`

```silk
Asterisk
```

Server-wide OPTIONS asterisk-form.

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

Parses one exact target form using method-specific admission rules.

::Anchor{id="RequestTarget.impl.validateForMethod"}

### Associated function `validateForMethod`

```silk
pub fn validateForMethod(
    method: &Method,
    target: RequestTarget<'text>,
  ) -> Result<(), ValueError>
```

Rejects a validated target form that does not match `method`.

::Anchor{id="RequestTarget.impl.format"}

### Method `format`

```silk
pub fn format(self: Self) -> string<'text>
```

Borrows the accepted lexical request target.

::Anchor{id="RequestTarget.impl.isAbsolute"}

### Method `isAbsolute`

```silk
pub fn isAbsolute(self: &Self) -> bool
```

Reports whether this target is absolute-form.

::Anchor{id="RequestTarget.impl.isAuthority"}

### Method `isAuthority`

```silk
pub fn isAuthority(self: &Self) -> bool
```

Reports whether this target is authority-form.

::Anchor{id="RequestTarget.impl.fromUri"}

### Associated function `fromUri`

```silk
pub fn fromUri(
    uri: &Uri,
    form: TargetForm,
    output: &mut [u8],
  ) -> Result<usize, ValueError>
```

Serializes origin- or absolute-form from a generic URI, deliberately omitting its fragment.

::Anchor{id="validateRequestHost"}

## `validateRequestHost`

```silk
pub fn validateRequestHost<'value>(
  version: Version,
  target: &RequestTarget,
  headers: &Headers<'value>,
) -> Result<Option<HttpAuthority<'value>>, ValueError>
```

Validates Host cardinality and syntax, returning the optional parsed Host authority.

::Anchor{id="effectiveAuthority"}

## `effectiveAuthority`

```silk
pub fn effectiveAuthority<'value>(
  target: RequestTarget<'value>,
  host: Option<HttpAuthority<'value>>,
) -> Result<Option<HttpAuthority<'value>>, ValueError>
```

Selects target authority for absolute/CONNECT and Host for origin/asterisk.

::Anchor{id="hostForUri"}

## `hostForUri`

```silk
pub fn hostForUri<'value>(uri: &Uri<'value>, output: &mut [u8]) -> Result<usize, ValueError>
```

Serializes outgoing Host from a URI authority after rejecting userinfo.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
