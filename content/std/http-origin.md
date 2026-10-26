The origin of an HTTP request: the scheme, host, and port that a connection goes to.

## When to use
Use [`Origin.fromUri`](#Origin.impl.fromUri) to get the origin of a URL. The client connects to the host and port of
the origin, and for HTTPS checks the server certificate against the host. Use
[`Origin.authorityInto`](#Origin.impl.authorityInto) to write the `Host` value.

## Details
An `Origin` has no path, and does not allocate. A missing port becomes 80 for `http` and 443 for
`https`. [`Origin.authorityInto`](#Origin.impl.authorityInto) writes a lowercase domain, the canonical IP text, and the port
only when it is not the default. A `Host` field that you give never changes the host that TLS
checks.

## Errors
- [`OriginError`](#OriginError) if the scheme is not `http` or `https`, the URI has user information, or the
  host or port is not valid.

## Examples
### Get the origin of a URL
```silk
import silk.http_origin { Origin, OriginError }
import silk.network_address { Port }
import silk.result { Result }
import silk.uri { Uri }
import silk.uri_reference { ParseError }

pub fn main() -> i32 {
  let uri = match Uri.parse("https://Example.COM/docs?page=2") {
    Result<Uri, ParseError>.Success { value } => value
    Result<Uri, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let origin = match Origin.fromUri(&uri) {
    Result<Origin, OriginError>.Success { value } => value
    Result<Origin, OriginError>.Failure { error: _ } => {
      return 1
    }
  }
  if !Origin.secure(&origin) || Port.value(&Origin.port(&origin)) != 443 {
    return 1
  }

  // The default port is not written, and the domain is lowercase.
  let mut output: [u8; 64] = [0; 64]
  let length = match Origin.authorityInto(&origin, &mut output) {
    Result<usize, OriginError>.Success { value } => value
    Result<usize, OriginError>.Failure { error: _ } => {
      return 1
    }
  }
  if length != 11 || output[0] != 101 {
    return 1
  }
  if !Origin.matchesAuthority(&origin, "example.com:443") {
    return 1
  }
  return 0
}
```

Import as `Origin` with `import silk.http_origin { Origin }`.

Public declarations: 2.

::Anchor{id="OriginError"}

## `OriginError`

```silk
pub enum OriginError
```

The reason that an origin is not valid, or that its text does not fit: the scheme is not `http`
or `https`, the URI has user information, the host or port is not valid, or the output is too
small.

::Anchor{id="OriginError.InvalidScheme"}

### `InvalidScheme`

```silk
InvalidScheme
```

The scheme is not `http` or `https`.

::Anchor{id="OriginError.UserInfo"}

### `UserInfo`

```silk
UserInfo
```

The URI has user information, as in `user@host`.

::Anchor{id="OriginError.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

The URI has no host.

::Anchor{id="OriginError.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

The host is not a valid domain name or IP address. See `Host.parse` in `silk.network_address`.

::Anchor{id="OriginError.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

The port is empty, not a number, or not from 1 to 65535.

::Anchor{id="OriginError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer is too small. Nothing was written.

::Anchor{id="OriginError.impl.Debug"}

## Implementation `Debug for OriginError`

```silk
impl Debug for OriginError
```

::Anchor{id="OriginError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidScheme`.

::Anchor{id="Origin"}

## `Origin`

```silk
pub struct Origin
```

The scheme, host, and port of an HTTP server. Make it with [`Origin.fromUri`](#Origin.impl.fromUri) or
[`Origin.make`](#Origin.impl.make).

::Anchor{id="Origin.impl.Copy"}

## Implementation `Copy for Origin`

```silk
impl Copy for Origin
```

::Anchor{id="Origin.impl"}

## Implementation `Origin`

```silk
impl Origin
```

::Anchor{id="Origin.impl.make"}

### Associated function `make`

```silk
pub fn make(host: Host, port: Port, secure: bool) -> Result<Origin, OriginError>
```

Returns the origin for `host` and `port`. `secure` selects HTTPS. Port 0 returns
`InvalidPort`.

::Anchor{id="Origin.impl.fromUri"}

### Associated function `fromUri`

```silk
pub fn fromUri(uri: &Uri) -> Result<Origin, OriginError>
```

Returns the origin of an `http` or `https` URI.

#### Details
A missing port becomes 80 for `http` and 443 for `https`. The path, query, and fragment are
ignored. User information returns `UserInfo`.

::Anchor{id="Origin.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Host
```

Returns the host. The client resolves it, and TLS checks the certificate against it.

::Anchor{id="Origin.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Port
```

Returns the port, with the default port if the URI had none.

::Anchor{id="Origin.impl.secure"}

### Method `secure`

```silk
pub fn secure(self: &Self) -> bool
```

Returns `true` for HTTPS.

::Anchor{id="Origin.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the scheme, the port, and the host are equal. Domains are compared without
case.

::Anchor{id="Origin.impl.authorityInto"}

### Method `authorityInto`

```silk
pub fn authorityInto(self: &Self, output: &mut [u8]) -> Result<usize, OriginError>
```

Writes `host` or `host:port` to the start of `output`, and returns the length. The port is
written only when it is not the default. If `output` is too small, it writes nothing.

::Anchor{id="Origin.impl.authorityWithPortInto"}

### Method `authorityWithPortInto`

```silk
pub fn authorityWithPortInto(self: &Self, output: &mut [u8]) -> Result<usize, OriginError>
```

Writes `host:port` to the start of `output`, and returns the length. The port is always
written. If `output` is too small, it writes nothing.

::Anchor{id="Origin.impl.matchesAuthority"}

### Method `matchesAuthority`

```silk
pub fn matchesAuthority(self: &Self, text: string) -> bool
```

Returns `true` if `text` names this origin.

#### Details
`text` is a host with an optional port. The default port can be written or not. Domains are
compared without case, and equal IP addresses match in any spelling.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
