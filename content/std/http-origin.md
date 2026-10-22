Owned checked HTTP origins, separate from request paths and explicit Host fields.

## Details

An origin retains the checked host, effective port, and transport scheme without allocation.
Authority output uses lowercase domain bytes, canonical numeric addresses, and nondefault ports.
An explicit Host field never changes the origin used for TLS authentication.

Import as `Origin` with `import silk.http_origin { Origin }`.

Public declarations: 2.

::Anchor{id="OriginError"}

## `OriginError`

```silk
pub enum OriginError
```

A rejected HTTP origin or insufficient authority output buffer.

::Anchor{id="OriginError.InvalidScheme"}

### `InvalidScheme`

```silk
InvalidScheme
```

The URI scheme is neither HTTP nor HTTPS.

::Anchor{id="OriginError.UserInfo"}

### `UserInfo`

```silk
UserInfo
```

User information is forbidden in an HTTP origin.

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

The host fails the checked network identity rules.

::Anchor{id="OriginError.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

The port is empty, nondecimal, or outside 1 through 65535.

::Anchor{id="OriginError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

Output cannot hold the complete authority.

::Anchor{id="Origin"}

## `Origin`

```silk
pub struct Origin
```

An owned HTTP authority and secure-transport selection.

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

Checks a host, a nonzero port, and an explicit transport-security selection.

::Anchor{id="Origin.impl.fromUri"}

### Associated function `fromUri`

```silk
pub fn fromUri(uri: &Uri) -> Result<Origin, OriginError>
```

Checks an HTTP or HTTPS URI and copies its host and effective port without allocation.

#### Details

User information is rejected. Absent ports become 80 for HTTP and 443 for HTTPS.
The path, query, and fragment do not contribute to this origin.

::Anchor{id="Origin.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Host
```

Returns the owned checked identity used for resolution and TLS authentication.

::Anchor{id="Origin.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Port
```

Returns the effective checked port, including a scheme default.

::Anchor{id="Origin.impl.secure"}

### Method `secure`

```silk
pub fn secure(self: &Self) -> bool
```

Returns whether this origin requires authenticated TLS.

::Anchor{id="Origin.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Compares transport scheme, effective port, and case-insensitive checked host identity.

::Anchor{id="Origin.impl.authorityInto"}

### Method `authorityInto`

```silk
pub fn authorityInto(self: &Self, output: &mut [u8]) -> Result<usize, OriginError>
```

Writes the normalized authority and leaves output unchanged when capacity is insufficient.

::Anchor{id="Origin.impl.authorityWithPortInto"}

### Method `authorityWithPortInto`

```silk
pub fn authorityWithPortInto(self: &Self, output: &mut [u8]) -> Result<usize, OriginError>
```

Writes the normalized authority with its effective port, including a default port.

#### Details

A capacity failure leaves `output` unchanged.

::Anchor{id="Origin.impl.matchesAuthority"}

### Method `matchesAuthority`

```silk
pub fn matchesAuthority(self: &Self, text: string) -> bool
```

Checks an explicit authority against this origin, allowing an explicit default port.

#### Details

The authority must contain only a checked host and optional decimal port.
Case-insensitive domains and equivalent numeric addresses compare equal.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
