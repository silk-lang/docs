Proxy settings for HTTP clients, and the choice of a route for each origin.

## When to use
Make a [`ProxyConfig`](#ProxyConfig) with [`ProxyConfig.fromUri`](#ProxyConfig.impl.fromUri) or [`ProxyConfig.make`](#ProxyConfig.impl.make). Then call
[`selectRoute`](#selectRoute) for each origin. `silk.http_request` and `silk.http_exchange` use the [`Route`](#Route)
to prepare and send the request.

## Details
[`selectRoute`](#selectRoute) does not allocate or use the network. It returns:
- `Direct` for an origin in the [`BypassPolicy`](#BypassPolicy).
- `Tunnel` for an HTTPS origin. The client sends `CONNECT` to the proxy, then does TLS with the
  origin through the tunnel.
- `Forward` for a plain HTTP origin. The client sends the request to the proxy with the full URI
  as target.

The configuration owns its Basic token. A route writes the `Proxy-Authorization` value only into
a buffer that you give. [`classifyConnect`](#classifyConnect) reads the response of the proxy to `CONNECT`.

## Errors
- [`ProxyError`](#ProxyError) with a [`ProxyAdmissionError`](#ProxyAdmissionError) if a setting is not valid. It holds no
  credentials.
- [`ProxyError`](#ProxyError) with the response head if the proxy rejects `CONNECT`.

## Gotchas
Only plain `http` proxies are supported. An `https` proxy URI fails with
`UnsupportedProxyTransport`. Environment variables such as `HTTPS_PROXY` are not read.

## Examples
### Select routes
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.http_origin { Origin, OriginError }
import silk.http_proxy {
  BypassPolicy,
  ProxyAuth,
  ProxyAuthContextId,
  ProxyConfig,
  ProxyConfigId,
  ProxyError,
  Route,
  RouteMode,
  selectRoute
}
import silk.option { Option }
import silk.result { Result }
import silk.uri { Uri }
import silk.uri_reference { ParseError }

fn origin(text: string<'static>) -> Origin {
  let uri = match Uri.parse(text) {
    Result<Uri, ParseError>.Success { value } => value
    Result<Uri, ParseError>.Failure { error: _ } => {
      let invalid = 1 / 0
      return origin(text)
    }
  }
  return match Origin.fromUri(&uri) {
    Result<Origin, OriginError>.Success { value } => value
    Result<Origin, OriginError>.Failure { error: _ } => {
      let invalid = 1 / 0
      return origin(text)
    }
  }
}

effect fn program() -> i32
  ! OutOfMemoryError
  ? &mut Allocator {
  // The token is the Base64 of "user:pass".
  let auth = match run ProxyAuth.preparedBasic(ProxyAuthContextId.make(1), b"dXNlcjpwYXNz") {
    Result<ProxyAuth, ProxyError>.Success { value } => move value
    Result<ProxyAuth, ProxyError>.Failure { error: _ } => {
      return 1
    }
  }
  let local = [origin("http://localhost:8080")]
  let bypass = match run BypassPolicy.copy(&local) {
    Result<BypassPolicy, ProxyError>.Success { value } => move value
    Result<BypassPolicy, ProxyError>.Failure { error: _ } => {
      return 1
    }
  }
  let config = match ProxyConfig.fromUri(
    ProxyConfigId.make(1),
    "http://proxy.example:3128",
    move auth,
    move bypass,
    4096,
  ) {
    Result<ProxyConfig, ProxyError>.Success { value } => move value
    Result<ProxyConfig, ProxyError>.Failure { error: _ } => {
      return 1
    }
  }

  // HTTPS goes through a CONNECT tunnel, plain HTTP is forwarded, and the bypass origin is direct.
  let secure = selectRoute(&config, origin("https://example.com/"))
  let plain = selectRoute(&config, origin("http://example.com/"))
  let direct = selectRoute(&config, origin("http://localhost:8080/"))
  if Route.mode(&secure) != RouteMode.Tunnel || Route.mode(&plain) != RouteMode.Forward
    || Route.mode(&direct) != RouteMode.Direct {
    return 1
  }
  let mut header: [u8; 64] = [0; 64]
  let length = match Route.writeProxyAuthorizationInto(&plain, &mut header) {
    Option<usize>.Some { value } => value
    Option<usize>.None => 0
  }

  // "Basic dXNlcjpwYXNz"
  if length != 18 || header[0] != 66 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `ProxyConfig` with `import silk.http_proxy { ProxyConfig }`.

Public declarations: 15.

::Anchor{id="ProxyComponent"}

## `ProxyComponent`

```silk
pub enum ProxyComponent
```

The setting that is not valid.

::Anchor{id="ProxyComponent.ProxyUri"}

### `ProxyUri`

```silk
ProxyUri
```

The proxy URI.

::Anchor{id="ProxyComponent.ProxyEndpoint"}

### `ProxyEndpoint`

```silk
ProxyEndpoint
```

The proxy host and port.

::Anchor{id="ProxyComponent.Authentication"}

### `Authentication`

```silk
Authentication
```

The Basic token.

::Anchor{id="ProxyComponent.Bypass"}

### `Bypass`

```silk
Bypass
```

The bypass list.

::Anchor{id="ProxyComponent.Configuration"}

### `Configuration`

```silk
Configuration
```

The configuration as a whole.

::Anchor{id="ProxyComponent.Route"}

### `Route`

```silk
Route
```

A route that was used for the wrong operation, or for another origin.

::Anchor{id="ProxyLimit"}

## `ProxyLimit`

```silk
pub enum ProxyLimit
```

A limit of a proxy configuration.

::Anchor{id="ProxyLimit.AuthenticationBytes"}

### `AuthenticationBytes`

```silk
AuthenticationBytes
```

The maximum length of the Basic token.

::Anchor{id="ProxyLimit.BypassOrigins"}

### `BypassOrigins`

```silk
BypassOrigins
```

The maximum number of bypass origins, 64.

::Anchor{id="ProxyLimit.OwnedConfigurationBytes"}

### `OwnedConfigurationBytes`

```silk
OwnedConfigurationBytes
```

The `maxOwnedConfigBytes` of the configuration.

::Anchor{id="ProxyReason"}

## `ProxyReason`

```silk
pub union ProxyReason
```

The rule that failed.

::Anchor{id="ProxyReason.InvalidProxyUri"}

### `InvalidProxyUri`

```silk
InvalidProxyUri
```

The proxy URI is not valid, or has a part that is not allowed, such as a path or user
information.

::Anchor{id="ProxyReason.InvalidProxyPort"}

### `InvalidProxyPort`

```silk
InvalidProxyPort
```

The proxy port is 0.

::Anchor{id="ProxyReason.InvalidAuthentication"}

### `InvalidAuthentication`

```silk
InvalidAuthentication
```

The Basic token is empty, or is not canonical Base64.

::Anchor{id="ProxyReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size does not fit in `usize`.

::Anchor{id="ProxyReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A value exceeded a limit.

::Anchor{id="ProxyReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: ProxyLimit
```

The limit.

::Anchor{id="ProxyReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of the limit.

::Anchor{id="ProxyReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The value that was found.

::Anchor{id="ProxyReason.UnsupportedProxyTransport"}

### `UnsupportedProxyTransport`

```silk
UnsupportedProxyTransport
```

The proxy URI uses `https`, which is not supported.

::Anchor{id="ProxyReason.InvalidRoute"}

### `InvalidRoute`

```silk
InvalidRoute
```

The route mode or its origin does not fit the operation.

::Anchor{id="ProxyAdmissionError"}

## `ProxyAdmissionError`

```silk
pub struct ProxyAdmissionError
```

The error for a setting that is not valid. It holds no credentials.

::Anchor{id="ProxyAdmissionError.component"}

### Field `component`

```silk
pub component: ProxyComponent
```

The setting.

::Anchor{id="ProxyAdmissionError.reason"}

### Field `reason`

```silk
pub reason: ProxyReason
```

The rule that failed.

::Anchor{id="ProxyError"}

## `ProxyError`

```silk
pub union ProxyError
```

The error from proxy settings or from a `CONNECT` response.

::Anchor{id="ProxyError.Admission"}

### `Admission`

```silk
Admission
```

A setting or a route is not valid.

::Anchor{id="ProxyError.Admission.error"}

#### Field `error`

```silk
pub error: ProxyAdmissionError
```

The error.

::Anchor{id="ProxyError.ProxyMetadataLimit"}

### `ProxyMetadataLimit`

```silk
ProxyMetadataLimit
```

The `CONNECT` response head is too large to copy.

::Anchor{id="ProxyError.ProxyAuthenticationRequired"}

### `ProxyAuthenticationRequired`

```silk
ProxyAuthenticationRequired
```

The proxy answered 407. The copy keeps only the status, the reason, and the
`Proxy-Authenticate` fields.

::Anchor{id="ProxyError.ProxyAuthenticationRequired.response"}

#### Field `response`

```silk
pub response: OwnedResponseHead
```

The copy of the response head.

::Anchor{id="ProxyError.ProxyRejected"}

### `ProxyRejected`

```silk
ProxyRejected
```

The proxy answered with another status that is not 2xx. The copy keeps all fields.

::Anchor{id="ProxyError.ProxyRejected.response"}

#### Field `response`

```silk
pub response: OwnedResponseHead
```

The copy of the response head.

::Anchor{id="ProxyError.InvalidConnectResponse"}

### `InvalidConnectResponse`

```silk
InvalidConnectResponse
```

[`classifyConnect`](#classifyConnect) was called before a final response.

::Anchor{id="ProxyConfigId"}

## `ProxyConfigId`

```silk
pub struct ProxyConfigId
```

A number that you choose to identify a configuration, for example in a pool key. It is not
secret.

::Anchor{id="ProxyAuthContextId"}

## `ProxyAuthContextId`

```silk
pub struct ProxyAuthContextId
```

A number that you choose to identify a set of credentials, for example in a pool key. It is not
secret.

::Anchor{id="ProxyAuth"}

## `ProxyAuth`

```silk
pub union ProxyAuth
```

The credentials for the proxy.

::Anchor{id="ProxyAuth.None"}

### `None`

```silk
None
```

No credentials.

::Anchor{id="ProxyAuth.Basic"}

### `Basic`

```silk
Basic
```

A Basic token.

::Anchor{id="BypassPolicy"}

## `BypassPolicy`

```silk
pub struct BypassPolicy
```

The origins that do not use the proxy. An origin matches only with the same scheme, host, and
port.

::Anchor{id="ProxyConfig"}

## `ProxyConfig`

```silk
pub struct ProxyConfig
```

The settings of a proxy: its host and port, its credentials, and the bypass list.

::Anchor{id="RouteMode"}

## `RouteMode`

```silk
pub enum RouteMode
```

How a request goes to an origin.

::Anchor{id="RouteMode.Direct"}

### `Direct`

```silk
Direct
```

Directly to the origin.

::Anchor{id="RouteMode.Forward"}

### `Forward`

```silk
Forward
```

To the proxy, with the full URI as target.

::Anchor{id="RouteMode.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

Through a `CONNECT` tunnel at the proxy, then TLS with the origin.

::Anchor{id="Route"}

## `Route`

```silk
pub union Route<'configuration>
```

The route for one origin, from [`selectRoute`](#selectRoute).

::Anchor{id="Route.Direct"}

### `Direct`

```silk
Direct
```

Go directly to an origin in the bypass list.

::Anchor{id="Route.Direct.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The origin.

::Anchor{id="Route.Forward"}

### `Forward`

```silk
Forward
```

Send plain HTTP through the proxy.

::Anchor{id="Route.Forward.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The plain HTTP origin.

::Anchor{id="Route.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

Open a tunnel through the proxy for TLS with the origin.

::Anchor{id="Route.Tunnel.origin"}

#### Field `origin`

```silk
pub origin: Origin
```

The HTTPS origin. TLS checks its certificate.

::Anchor{id="RouteKey"}

## `RouteKey`

```silk
pub struct RouteKey
```

A key that identifies a route, for example for a connection pool. It has no credentials.

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

Returns the `InvalidRoute` error.

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

Returns the identity for `value`.

::Anchor{id="ProxyConfigId.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the two identities have the same value.

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

Returns the identity for `value`.

::Anchor{id="ProxyAuthContextId.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the two identities have the same value.

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

Returns credentials with no token.

::Anchor{id="ProxyAuth.impl.preparedBasic"}

### Associated function `preparedBasic`

```silk
pub effect fn preparedBasic(
    contextId: ProxyAuthContextId,
    token: &[u8],
  ) -> Result<ProxyAuth, ProxyError> ! OutOfMemoryError ? &mut Allocator
```

Checks and copies `token`, the Base64 of `user:password`. It must be canonical Base64, and at
most 4096 bytes.

::Anchor{id="ProxyAuth.impl.contextId"}

### Method `contextId`

```silk
pub fn contextId(self: &Self) -> ProxyAuthContextId
```

Returns the identity of the credentials.

::Anchor{id="ProxyAuth.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the length of the token, or 0.

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

Copies up to 64 origins into a bypass list.

::Anchor{id="BypassPolicy.impl.contains"}

### Method `contains`

```silk
pub fn contains(self: &Self, origin: &Origin) -> bool
```

Returns `true` if `origin` has the same scheme, host, and port as an origin in the list.

::Anchor{id="BypassPolicy.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the memory of the list, in bytes.

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

Returns a configuration for a proxy at `proxyHost` and `proxyPort`. The port cannot be 0.
`maxOwnedConfigBytes` limits the memory of the host, the token, and the bypass list.

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

Returns a configuration for the proxy in `text`, such as `http://proxy:3128`. The URI can have
only the `http` scheme, a host, and a port.

::Anchor{id="ProxyConfig.impl.id"}

### Method `id`

```silk
pub fn id(self: &Self) -> ProxyConfigId
```

Returns the identity of the configuration.

::Anchor{id="ProxyConfig.impl.authContextId"}

### Method `authContextId`

```silk
pub fn authContextId(self: &Self) -> ProxyAuthContextId
```

Returns the identity of the credentials.

::Anchor{id="ProxyConfig.impl.proxyHost"}

### Method `proxyHost`

```silk
pub fn proxyHost(self: &Self) -> Host
```

Returns the proxy host.

::Anchor{id="ProxyConfig.impl.proxyPort"}

### Method `proxyPort`

```silk
pub fn proxyPort(self: &Self) -> Port
```

Returns the proxy port.

::Anchor{id="ProxyConfig.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns the memory of the configuration, in bytes.

::Anchor{id="selectRoute"}

## `selectRoute`

```silk
pub fn selectRoute<'configuration>(
  configuration: &'configuration ProxyConfig,
  origin: Origin,
) -> Route<'configuration>
```

Returns the route for `origin`: `Direct` for a bypass origin, `Tunnel` for HTTPS, and `Forward`
for plain HTTP. It does not allocate or use the network.

::Anchor{id="classifyConnect"}

## `classifyConnect`

```silk
pub effect fn classifyConnect(
  head: &ResponseHead,
) -> () ! ProxyError | OutOfMemoryError ? &mut Allocator
```

Reads the final response of the proxy to `CONNECT`.

### Details
A 2xx status succeeds. A 407 fails with `ProxyAuthenticationRequired`, and other statuses with
`ProxyRejected`, with a copy of the head. If the head is too large to copy, it fails with
`ProxyMetadataLimit`. Call it only after a final response head.

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

Returns the mode of the route.

::Anchor{id="Route.impl.originalOrigin"}

### Method `originalOrigin`

```silk
pub fn originalOrigin(self: &Self) -> Origin
```

Returns the origin that the route is for.

::Anchor{id="Route.impl.proxyHost"}

### Method `proxyHost`

```silk
pub fn proxyHost(self: &Self) -> Host
```

Returns the proxy host.

::Anchor{id="Route.impl.proxyPort"}

### Method `proxyPort`

```silk
pub fn proxyPort(self: &Self) -> Port
```

Returns the proxy port.

::Anchor{id="Route.impl.physicalPeer"}

### Method `physicalPeer`

```silk
pub fn physicalPeer(self: &Self) -> Result<Origin, OriginError>
```

Returns the proxy as a plain HTTP origin, the server to connect to.

::Anchor{id="Route.impl.proxyAuthorizationLength"}

### Method `proxyAuthorizationLength`

```silk
pub fn proxyAuthorizationLength(self: &Self) -> usize
```

Returns the length of the `Proxy-Authorization` value, or 0 if there are no credentials.

::Anchor{id="Route.impl.writeProxyAuthorizationInto"}

### Method `writeProxyAuthorizationInto`

```silk
pub fn writeProxyAuthorizationInto(self: &Self, output: &mut [u8]) -> Option<usize>
```

Writes the `Proxy-Authorization` value, such as `Basic dXNlcjpwYXNz`, to the start of
`output`, and returns its length. Returns `None` and writes nothing if `output` is too small.

::Anchor{id="Route.impl.configId"}

### Method `configId`

```silk
pub fn configId(self: &Self) -> ProxyConfigId
```

Returns the identity of the configuration.

::Anchor{id="Route.impl.authContextId"}

### Method `authContextId`

```silk
pub fn authContextId(self: &Self) -> ProxyAuthContextId
```

Returns the identity of the credentials.

::Anchor{id="Route.impl.key"}

### Method `key`

```silk
pub fn key(self: &Self) -> RouteKey
```

Returns the key of the route. It does not read the credentials.

::Anchor{id="Route.impl.recompute"}

### Method `recompute`

```silk
pub fn recompute(self: &Self, origin: Origin) -> Route<'configuration>
```

Returns the route for another origin, with the same configuration, for example after a
redirect.

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

Returns the origin of the route.

::Anchor{id="RouteKey.impl.mode"}

### Method `mode`

```silk
pub fn mode(self: &Self) -> RouteMode
```

Returns the mode of the route.

::Anchor{id="RouteKey.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the mode, the origin, the proxy, and the two identities are equal.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
