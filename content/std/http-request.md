Origin-bound HTTP request preparation with finite storage and explicit header policy.

## Details
`prepare` owns the direct serialized head before an exchange can send bytes. The routed
operations require a policy-selected proxy route. They derive the proxy peer and authentication
from that route. All operations generate framing fields and reject conflicting caller fields.

Import as `HttpRequest` with `import silk.http_request as HttpRequest`.

Public declarations: 11.

::Anchor{id="BodyMode"}

## `BodyMode`

```silk
pub union BodyMode
```

The exact request payload delimiter.

::Anchor{id="BodyMode.Empty"}

### `Empty`

```silk
Empty
```

Sends no request payload.

::Anchor{id="BodyMode.KnownLength"}

### `KnownLength`

```silk
KnownLength
```

Sends exactly this many payload bytes.

::Anchor{id="BodyMode.KnownLength.length"}

#### Field `length`

```silk
pub length: u64
```

The exact payload length.

::Anchor{id="BodyMode.Chunked"}

### `Chunked`

```silk
Chunked
```

Sends HTTP/1.1 chunks and explicit trailers.

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

A generated field policy that distinguishes omission from a default.

::Anchor{id="HeaderControl.Default"}

### `Default`

```silk
Default
```

Generates the documented default value.

::Anchor{id="HeaderControl.Omit"}

### `Omit`

```silk
Omit
```

Deliberately omits the field when the protocol permits it.

::Anchor{id="HeaderControl.Value"}

### `Value`

```silk
Value
```

Uses one explicit validated value.

::Anchor{id="HeaderControl.Value.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The caller-owned semantic field bytes.

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

One explicit authorization source.

::Anchor{id="Authorization.Absent"}

### `Absent`

```silk
Absent
```

Sends no generated authorization field.

::Anchor{id="Authorization.Value"}

### `Value`

```silk
Value
```

Sends one explicit validated field value.

::Anchor{id="Authorization.Value.value"}

#### Field `value`

```silk
pub value: &'value [u8]
```

The complete authorization field value.

::Anchor{id="Authorization.Basic"}

### `Basic`

```silk
Basic
```

Encodes caller-selected username and password bytes.

::Anchor{id="Authorization.Basic.username"}

#### Field `username`

```silk
pub username: &'value [u8]
```

Username bytes without colon or controls.

::Anchor{id="Authorization.Basic.password"}

#### Field `password`

```silk
pub password: &'value [u8]
```

Password bytes without controls.

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

Explicit permission to send Basic credentials without TLS.

::Anchor{id="BasicSecurity.RequireTls"}

### `RequireTls`

```silk
RequireTls
```

Rejects Basic credentials for a plaintext origin.

::Anchor{id="BasicSecurity.AllowInsecureBasic"}

### `AllowInsecureBasic`

```silk
AllowInsecureBasic
```

Permits plaintext Basic without changing HTTPS authentication.

::Anchor{id="HeaderPolicy"}

## `HeaderPolicy`

```silk
pub struct HeaderPolicy<'value>
```

Policy for generated request fields and connection persistence.

::Anchor{id="HeaderPolicy.host"}

### Field `host`

```silk
pub host: HeaderControl<'value>
```

Defaults to the normalized origin authority; HTTP/1.1 cannot omit it.

::Anchor{id="HeaderPolicy.userAgent"}

### Field `userAgent`

```silk
pub userAgent: HeaderControl<'value>
```

Defaults to `silk-http/1`.

::Anchor{id="HeaderPolicy.accept"}

### Field `accept`

```silk
pub accept: HeaderControl<'value>
```

Defaults to `*/*`.

::Anchor{id="HeaderPolicy.authorization"}

### Field `authorization`

```silk
pub authorization: Authorization<'value>
```

One optional explicit authorization source.

::Anchor{id="HeaderPolicy.basicSecurity"}

### Field `basicSecurity`

```silk
pub basicSecurity: BasicSecurity
```

Requires TLS for Basic unless explicitly overridden.

::Anchor{id="HeaderPolicy.http10KeepAlive"}

### Field `http10KeepAlive`

```silk
pub http10KeepAlive: bool
```

Permits HTTP/1.0 keep-alive; HTTP/1.1 uses normal persistence.

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

Returns generated defaults, absent authorization, and plaintext Basic rejection.

::Anchor{id="RequestError"}

## `RequestError`

```silk
pub union RequestError
```

A precise preflight failure with no network side effects.

::Anchor{id="RequestError.Value"}

### `Value`

```silk
Value
```

A shared HTTP value failed validation.

::Anchor{id="RequestError.Value.error"}

#### Field `error`

```silk
pub error: ValueError
```

The original value failure.

::Anchor{id="RequestError.Origin"}

### `Origin`

```silk
Origin
```

An origin could not be constructed or serialized.

::Anchor{id="RequestError.Origin.error"}

#### Field `error`

```silk
pub error: OriginError
```

The original origin failure.

::Anchor{id="RequestError.Basic"}

### `Basic`

```silk
Basic
```

Credentials failed strict Basic encoding.

::Anchor{id="RequestError.Basic.error"}

#### Field `error`

```silk
pub error: BasicError
```

The credential failure, without credential bytes.

::Anchor{id="RequestError.ConflictingHeader"}

### `ConflictingHeader`

```silk
ConflictingHeader
```

A caller field conflicts with generated policy.

::Anchor{id="RequestError.ConflictingAuthority"}

### `ConflictingAuthority`

```silk
ConflictingAuthority
```

The explicit Host differs from the connection origin.

::Anchor{id="RequestError.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

HTTP/1.1 cannot omit Host.

::Anchor{id="RequestError.InvalidBodyMode"}

### `InvalidBodyMode`

```silk
InvalidBodyMode
```

The body or continue mode is unavailable for the selected version.

::Anchor{id="RequestError.MultipleAuthorization"}

### `MultipleAuthorization`

```silk
MultipleAuthorization
```

More than one authorization source was supplied.

::Anchor{id="RequestError.InsecureBasic"}

### `InsecureBasic`

```silk
InsecureBasic
```

Plaintext Basic lacks explicit permission.

::Anchor{id="RequestError.ProxyAuthorization"}

### `ProxyAuthorization`

```silk
ProxyAuthorization
```

A direct request supplies proxy credentials.

::Anchor{id="RequestError.CredentialLimit"}

### `CredentialLimit`

```silk
CredentialLimit
```

Credential bytes exceed the finite budget.

::Anchor{id="RequestError.HeaderLimit"}

### `HeaderLimit`

```silk
HeaderLimit
```

Generated or copied fields exceed the configured finite count.

::Anchor{id="RequestError.InvalidTarget"}

### `InvalidTarget`

```silk
InvalidTarget
```

A direct request uses an absolute target for another origin.

::Anchor{id="PreparedRequest"}

## `PreparedRequest`

```silk
pub struct PreparedRequest
```

One owned, origin-bound, preflighted head with unforgeable framing policy.

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

Borrows the serialized request head until this owner is dropped.

::Anchor{id="PreparedRequest.impl.origin"}

### Method `origin`

```silk
pub fn origin(self: &Self) -> Origin
```

Returns the logical request origin used for target, Host, and origin credentials.

::Anchor{id="PreparedRequest.impl.physicalPeer"}

### Method `physicalPeer`

```silk
pub fn physicalPeer(self: &Self) -> Origin
```

Returns the physical peer on whose connection this request is admitted.

::Anchor{id="PreparedRequest.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the admitted HTTP version.

::Anchor{id="PreparedRequest.impl.bodyMode"}

### Method `bodyMode`

```silk
pub fn bodyMode(self: &Self) -> BodyMode
```

Returns the exact selected body delimiter.

::Anchor{id="PreparedRequest.impl.require100"}

### Method `require100`

```silk
pub fn require100(self: &Self) -> bool
```

Returns whether the head contains the generated 100-continue expectation.

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

Validates and serializes one request before any transport operation.

### Details
Caller fields preserve order. Host, User-Agent, Accept, framing, Expect, and Connection belong
to policy and cannot also occur in `headers`. Output owns all borrowed input bytes.
`maxHeadBytes` and `maxCredentialBytes` bound owned head and credential storage.

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

Prepares one Forward route as an origin-bound absolute-form request for its plain proxy peer.

### Details

The sealed route is the only source of the physical peer and `Proxy-Authorization`. The
original URI spelling is preserved except that user information and fragments are excluded and
an empty path becomes `/`. Forward preparation always generates the logical-origin Host,
including for HTTP/1.0.

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

Prepares the one body-free HTTP/1.1 CONNECT head admitted by a Tunnel route.

### Details

The authority-form target and Host are both derived from the route's normalized original
origin and always include its effective port. Callers cannot supply fields, a body, a physical
peer, or proxy credentials.

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

Converts a validated URI to an origin-form request with query and no fragment.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
