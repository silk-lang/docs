Bounded HTTP proxy policy, pure route selection, and owned CONNECT rejection metadata.

## Details

Proxy policy owns its prepared authentication token and exact-origin bypass entries. Selection
does not allocate or use the network. A selected route supplies its configured authentication
only through bounded output. CONNECT rejection copies have fixed field and owned-byte limits.

Import as `ProxyConfig` with `import silk.http_proxy { ProxyConfig }`.

Public declarations: 15.

::Anchor{id="ProxyComponent"}

## `ProxyComponent`

```silk
pub enum ProxyComponent
```

The proxy value rejected during admission.

::Anchor{id="ProxyComponent.ProxyUri"}

### `ProxyUri`

```silk
ProxyUri
```

The proxy URI text.

::Anchor{id="ProxyComponent.ProxyEndpoint"}

### `ProxyEndpoint`

```silk
ProxyEndpoint
```

The programmatic proxy endpoint.

::Anchor{id="ProxyComponent.Authentication"}

### `Authentication`

```silk
Authentication
```

The prepared authentication token.

::Anchor{id="ProxyComponent.Bypass"}

### `Bypass`

```silk
Bypass
```

The exact-origin bypass policy.

::Anchor{id="ProxyComponent.Configuration"}

### `Configuration`

```silk
Configuration
```

The complete proxy configuration.

::Anchor{id="ProxyComponent.Route"}

### `Route`

```silk
Route
```

A selected route used by the wrong operation or with a different origin.

::Anchor{id="ProxyLimit"}

## `ProxyLimit`

```silk
pub enum ProxyLimit
```

A bounded proxy configuration resource.

::Anchor{id="ProxyLimit.AuthenticationBytes"}

### `AuthenticationBytes`

```silk
AuthenticationBytes
```

The maximum encoded authentication-token byte count.

::Anchor{id="ProxyLimit.BypassOrigins"}

### `BypassOrigins`

```silk
BypassOrigins
```

The maximum exact-origin bypass-entry count.

::Anchor{id="ProxyLimit.OwnedConfigurationBytes"}

### `OwnedConfigurationBytes`

```silk
OwnedConfigurationBytes
```

The maximum total owned configuration byte count.

::Anchor{id="ProxyReason"}

## `ProxyReason`

```silk
pub union ProxyReason
```

The reason proxy policy admission failed.

::Anchor{id="ProxyReason.InvalidProxyUri"}

### `InvalidProxyUri`

```silk
InvalidProxyUri
```

The proxy URI has invalid syntax or a prohibited URI component.

::Anchor{id="ProxyReason.InvalidProxyPort"}

### `InvalidProxyPort`

```silk
InvalidProxyPort
```

The programmatic proxy endpoint has port zero.

::Anchor{id="ProxyReason.InvalidAuthentication"}

### `InvalidAuthentication`

```silk
InvalidAuthentication
```

The prepared Basic token is empty or is not canonical strict Base64.

::Anchor{id="ProxyReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

The required owned byte count does not fit in `usize`.

::Anchor{id="ProxyReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A resource exceeds its admitted maximum.

::Anchor{id="ProxyReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: ProxyLimit
```

The resource that exceeds its limit.

::Anchor{id="ProxyReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The inclusive admitted maximum.

::Anchor{id="ProxyReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The rejected resource value.

::Anchor{id="ProxyReason.UnsupportedProxyTransport"}

### `UnsupportedProxyTransport`

```silk
UnsupportedProxyTransport
```

The proxy URI uses the unsupported `https` scheme.

::Anchor{id="ProxyReason.InvalidRoute"}

### `InvalidRoute`

```silk
InvalidRoute
```

The selected route mode or original origin is incompatible with the requested operation.

::Anchor{id="ProxyAdmissionError"}

## `ProxyAdmissionError`

```silk
pub struct ProxyAdmissionError
```

A copyable proxy-policy admission failure containing no identity or credential bytes.

::Anchor{id="ProxyAdmissionError.component"}

### Field `component`

```silk
pub component: ProxyComponent
```

The proxy value that failed admission.

::Anchor{id="ProxyAdmissionError.reason"}

### Field `reason`

```silk
pub reason: ProxyReason
```

The admission rule that failed.

::Anchor{id="ProxyError"}

## `ProxyError`

```silk
pub union ProxyError
```

A typed proxy failure whose response variants own only bounded, nonsecret metadata.

::Anchor{id="ProxyError.Admission"}

### `Admission`

```silk
Admission
```

Configuration, route, or credential admission failed without retaining input bytes.

::Anchor{id="ProxyError.Admission.error"}

#### Field `error`

```silk
pub error: ProxyAdmissionError
```

The structured copyable admission failure.

::Anchor{id="ProxyError.ProxyMetadataLimit"}

### `ProxyMetadataLimit`

```silk
ProxyMetadataLimit
```

A complete CONNECT response exceeded the fixed owned-metadata budget.

::Anchor{id="ProxyError.ProxyAuthenticationRequired"}

### `ProxyAuthenticationRequired`

```silk
ProxyAuthenticationRequired
```

A 407 response retaining status, reason, and ordered `Proxy-Authenticate` fields only.

::Anchor{id="ProxyError.ProxyAuthenticationRequired.response"}

#### Field `response`

```silk
pub response: OwnedResponseHead
```

The bounded independently owned response metadata.

::Anchor{id="ProxyError.ProxyRejected"}

### `ProxyRejected`

```silk
ProxyRejected
```

Another final non-2xx response retaining status, reason, and all ordered fields.

::Anchor{id="ProxyError.ProxyRejected.response"}

#### Field `response`

```silk
pub response: OwnedResponseHead
```

The bounded independently owned response metadata.

::Anchor{id="ProxyError.InvalidConnectResponse"}

### `InvalidConnectResponse`

```silk
InvalidConnectResponse
```

Response classification was attempted before a final CONNECT response existed.

::Anchor{id="ProxyConfigId"}

## `ProxyConfigId`

```silk
pub struct ProxyConfigId
```

An opaque configuration identity made from a caller-supplied nonsecret `u64`.

::Anchor{id="ProxyAuthContextId"}

## `ProxyAuthContextId`

```silk
pub struct ProxyAuthContextId
```

An opaque authentication-context identity made from a caller-supplied nonsecret `u64`.

::Anchor{id="ProxyAuth"}

## `ProxyAuth`

```silk
pub union ProxyAuth
```

Prepared proxy authentication owned by a proxy configuration.

::Anchor{id="ProxyAuth.None"}

### `None`

```silk
None
```

An authentication context that has no credential token.

::Anchor{id="ProxyAuth.Basic"}

### `Basic`

```silk
Basic
```

An authentication context that owns a prepared Basic token.

::Anchor{id="BypassPolicy"}

## `BypassPolicy`

```silk
pub struct BypassPolicy
```

A bounded list of exact normalized origins that bypass the proxy.

::Anchor{id="ProxyConfig"}

## `ProxyConfig`

```silk
pub struct ProxyConfig
```

Immutable owned proxy configuration.

::Anchor{id="RouteMode"}

## `RouteMode`

```silk
pub enum RouteMode
```

The route mode selected for one origin.

::Anchor{id="RouteMode.Direct"}

### `Direct`

```silk
Direct
```

Contact the origin directly.

::Anchor{id="RouteMode.Forward"}

### `Forward`

```silk
Forward
```

Contact the proxy and use an absolute-form HTTP request.

::Anchor{id="RouteMode.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

Contact the proxy and use CONNECT before origin TLS.

::Anchor{id="Route"}

## `Route`

```silk
pub union Route<'configuration>
```

The pure route selected for one original HTTP origin.

::Anchor{id="Route.Direct"}

### `Direct`

```silk
Direct
```

A route that contacts an exact bypass origin directly.

::Anchor{id="Route.Direct.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The original origin that matched bypass policy.

::Anchor{id="Route.Forward"}

### `Forward`

```silk
Forward
```

A route that sends plaintext HTTP through the proxy.

::Anchor{id="Route.Forward.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The original plaintext HTTP origin.

::Anchor{id="Route.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

A route that establishes a proxy tunnel for origin TLS.

::Anchor{id="Route.Tunnel.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The original HTTPS origin for TLS authentication.

::Anchor{id="RouteKey"}

## `RouteKey`

```silk
pub struct RouteKey
```

Stable route identity for later pooling and redirect recomputation.

::Anchor{id="ProxyReason.impl.Copy"}

## Implementation `Copy for ProxyReason`

```silk
impl Copy for ProxyReason
```

::Anchor{id="ProxyAdmissionError.impl.Copy"}

## Implementation `Copy for ProxyAdmissionError`

```silk
impl Copy for ProxyAdmissionError
```

::Anchor{id="ProxyConfigId.impl.Copy"}

## Implementation `Copy for ProxyConfigId`

```silk
impl Copy for ProxyConfigId
```

::Anchor{id="ProxyAuthContextId.impl.Copy"}

## Implementation `Copy for ProxyAuthContextId`

```silk
impl Copy for ProxyAuthContextId
```

::Anchor{id="Route.impl.Copy"}

## Implementation `Copy for Route<'configuration>`

```silk
impl<'configuration> Copy for Route<'configuration>
```

::Anchor{id="RouteKey.impl.Copy"}

## Implementation `Copy for RouteKey`

```silk
impl Copy for RouteKey
```

::Anchor{id="ProxyError.impl"}

## Implementation `ProxyError`

```silk
impl ProxyError
```

::Anchor{id="ProxyError.impl.invalidRoute"}

### Associated function `invalidRoute`

```silk
pub fn invalidRoute() -> ProxyError
```

Returns the credential-free failure for an incompatible sealed route.

::Anchor{id="ProxyConfigId.impl"}

## Implementation `ProxyConfigId`

```silk
impl ProxyConfigId
```

::Anchor{id="ProxyConfigId.impl.make"}

### Associated function `make`

```silk
pub fn make(value: u64) -> ProxyConfigId
```

Preserves a caller-supplied nonsecret identity payload opaquely.

::Anchor{id="ProxyConfigId.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports exact caller-payload equality without exposing the payload.

::Anchor{id="ProxyAuthContextId.impl"}

## Implementation `ProxyAuthContextId`

```silk
impl ProxyAuthContextId
```

::Anchor{id="ProxyAuthContextId.impl.make"}

### Associated function `make`

```silk
pub fn make(value: u64) -> ProxyAuthContextId
```

Preserves a caller-supplied nonsecret identity payload opaquely.

::Anchor{id="ProxyAuthContextId.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports exact caller-payload equality without exposing the payload.

::Anchor{id="ProxyAuth.impl"}

## Implementation `ProxyAuth`

```silk
impl ProxyAuth
```

::Anchor{id="ProxyAuth.impl.none"}

### Associated function `none`

```silk
pub fn none(contextId: ProxyAuthContextId) -> ProxyAuth
```

Creates an authentication context with no credential bytes.

::Anchor{id="ProxyAuth.impl.preparedBasic"}

### Associated function `preparedBasic`

```silk
pub effect fn preparedBasic(
    contextId: ProxyAuthContextId,
    token: &[u8],
  ) -> Result<ProxyAuth, ProxyError> ! OutOfMemoryError ? &mut Allocator
```

Strictly validates and copies one nonempty prepared Basic token.

::Anchor{id="ProxyAuth.impl.contextId"}

### Method `contextId`

```silk
pub fn contextId(self: &Self) -> ProxyAuthContextId
```

Returns the caller-supplied authentication-context identity.

::Anchor{id="ProxyAuth.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns retained credential bytes without exposing them.

::Anchor{id="BypassPolicy.impl"}

## Implementation `BypassPolicy`

```silk
impl BypassPolicy
```

::Anchor{id="BypassPolicy.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(origins: &[Origin]) -> Result<BypassPolicy, ProxyError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Copies at most 64 exact normalized HTTP origins into immutable owned policy.

::Anchor{id="BypassPolicy.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, origin: &Origin) -> bool
```

Reports exact scheme, normalized-host, and effective-port membership.

::Anchor{id="BypassPolicy.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns copied bypass-entry storage size.

::Anchor{id="ProxyConfig.impl"}

## Implementation `ProxyConfig`

```silk
impl ProxyConfig
```

::Anchor{id="ProxyConfig.impl.make"}

### Associated function `make`

```silk
pub fn make(
    id: ProxyConfigId,
    proxyHost: Host,
    proxyPort: Port,
    authentication: ProxyAuth,
    bypass: BypassPolicy,
    maxOwnedConfigBytes: usize,
  ) -> Result<ProxyConfig, ProxyError>
```

Admits a plain programmatic proxy endpoint under a total owned-byte budget.

::Anchor{id="ProxyConfig.impl.fromUri"}

### Associated function `fromUri`

```silk
pub fn fromUri<'text>(
    id: ProxyConfigId,
    text: string<'text>,
    authentication: ProxyAuth,
    bypass: BypassPolicy,
    maxOwnedConfigBytes: usize,
  ) -> Result<ProxyConfig, ProxyError>
```

Parses only a plain `http` authority with no userinfo, path, query, or fragment.

::Anchor{id="ProxyConfig.impl.id"}

### Method `id`

```silk
pub fn id(self: &Self) -> ProxyConfigId
```

Returns the caller-supplied configuration identity.

::Anchor{id="ProxyConfig.impl.authContextId"}

### Method `authContextId`

```silk
pub fn authContextId(self: &Self) -> ProxyAuthContextId
```

Returns the caller-supplied authentication-context identity.

::Anchor{id="ProxyConfig.impl.proxyHost"}

### Method `proxyHost`

```silk
pub fn proxyHost(self: &Self) -> Host
```

Returns the checked proxy host.

::Anchor{id="ProxyConfig.impl.proxyPort"}

### Method `proxyPort`

```silk
pub fn proxyPort(self: &Self) -> Port
```

Returns the checked nonzero proxy port.

::Anchor{id="ProxyConfig.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the copied host, token, and bypass-entry byte count.

::Anchor{id="selectRoute"}

## `selectRoute`

```silk
pub fn selectRoute<'configuration>(
  configuration: &'configuration ProxyConfig,
  origin: Origin,
) -> Route<'configuration>
```

Purely selects Direct, Forward, or Tunnel for one original origin.

::Anchor{id="classifyConnect"}

## `classifyConnect`

```silk
pub effect fn classifyConnect(
  head: &ResponseHead,
) -> () ! ProxyError | OutOfMemoryError ? &mut Allocator
```

Classifies a complete final CONNECT response into success or bounded rejection metadata.

### Details

Any 2xx response is accepted. A 407 retains status, reason, and ordered duplicate
`Proxy-Authenticate` fields only; other final non-2xx responses retain all ordered fields.
Complete-head copy failures map to `ProxyMetadataLimit`, while allocation failure remains
`OutOfMemoryError`. Call this only after the shared client's parser has returned a final head.

::Anchor{id="Route.impl"}

## Implementation `Route<'configuration>`

```silk
impl<'configuration> Route<'configuration>
```

::Anchor{id="Route.impl.mode"}

### Method `mode`

```silk
pub fn mode(self: &Self) -> RouteMode
```

Returns the selected route mode.

::Anchor{id="Route.impl.originalOrigin"}

### Method `originalOrigin`

```silk
pub fn originalOrigin(self: &Self) -> Origin
```

Returns the original origin that policy evaluated.

::Anchor{id="Route.impl.proxyHost"}

### Method `proxyHost`

```silk
pub fn proxyHost(self: &Self) -> Host
```

Returns the proxy host retained when policy selected the route.

::Anchor{id="Route.impl.proxyPort"}

### Method `proxyPort`

```silk
pub fn proxyPort(self: &Self) -> Port
```

Returns the proxy port retained when policy selected the route.

::Anchor{id="Route.impl.physicalPeer"}

### Method `physicalPeer`

```silk
pub fn physicalPeer(self: &Self) -> Result<Origin, OriginError>
```

Returns the plaintext proxy peer retained by the sealed route.

::Anchor{id="Route.impl.proxyAuthorizationLength"}

### Method `proxyAuthorizationLength`

```silk
pub fn proxyAuthorizationLength(self: &Self) -> usize
```

Returns the complete configured `Proxy-Authorization` value length, or zero when absent.

#### Details

The prepared token remains private; possessing a policy-selected route is the capability to
request its bounded wire representation.

::Anchor{id="Route.impl.writeProxyAuthorizationInto"}

### Method `writeProxyAuthorizationInto`

```silk
pub fn writeProxyAuthorizationInto(self: &Self, output: &mut [u8]) -> Option<usize>
```

Writes the complete configured `Proxy-Authorization` value without exposing token storage.
Returns `None` without changing `output` when it is too small.

::Anchor{id="Route.impl.configId"}

### Method `configId`

```silk
pub fn configId(self: &Self) -> ProxyConfigId
```

Returns the configuration identity retained when policy selected the route.

::Anchor{id="Route.impl.authContextId"}

### Method `authContextId`

```silk
pub fn authContextId(self: &Self) -> ProxyAuthContextId
```

Returns the authentication-context identity retained when policy selected the route.

::Anchor{id="Route.impl.key"}

### Method `key`

```silk
pub fn key(self: &Self) -> RouteKey
```

Returns a stable key without reading or formatting authentication bytes.

::Anchor{id="Route.impl.recompute"}

### Method `recompute`

```silk
pub fn recompute(self: &Self, origin: Origin) -> Route<'configuration>
```

Recomputes policy for a new origin under the current immutable configuration.

::Anchor{id="RouteKey.impl"}

## Implementation `RouteKey`

```silk
impl RouteKey
```

::Anchor{id="RouteKey.impl.originalOrigin"}

### Method `originalOrigin`

```silk
pub fn originalOrigin(self: &Self) -> Origin
```

Returns the normalized original origin retained by this sealed route identity.

::Anchor{id="RouteKey.impl.mode"}

### Method `mode`

```silk
pub fn mode(self: &Self) -> RouteMode
```

Returns the selected route mode without exposing proxy configuration or credential bytes.

::Anchor{id="RouteKey.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Compares route mode, original origin, proxy endpoint, and both opaque identities.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
