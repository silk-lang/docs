Owned network addresses, endpoints, and validated origin hosts.

## When to use

Parse URI hosts before resolution, retain the resulting Host for HTTP/TLS identity, and pass
its numeric address or domain to silk.resolver.

## Details

IPv4 and IPv6 own network-order octets. DomainHost owns its admitted source spelling in fixed
253-byte storage and compares ASCII case-insensitively. Parsing and formatting allocate nothing.

## Gotchas

This profile accepts prepared ASCII LDH/A-label domains only. It rejects search-root dots,
Unicode mapping, escapes, zones, IPvFuture, userinfo, ports, and legacy libc IPv4 spellings.

Import as `NetworkAddress` with `import silk.network_address { NetworkAddress }`.

Public declarations: 12.

::Anchor{id="AddressReason"}

## `AddressReason`

```silk
pub enum AddressReason
```

The failed network-address admission rule.

::Anchor{id="AddressReason.Empty"}

### `Empty`

```silk
Empty
```

The numeric address input is empty.

::Anchor{id="AddressReason.InvalidCharacter"}

### `InvalidCharacter`

```silk
InvalidCharacter
```

An input byte is not admitted in this position.

::Anchor{id="AddressReason.InvalidComponent"}

### `InvalidComponent`

```silk
InvalidComponent
```

An address component has invalid syntax.

::Anchor{id="AddressReason.LeadingZero"}

### `LeadingZero`

```silk
LeadingZero
```

An IPv4 component contains a prohibited leading zero.

::Anchor{id="AddressReason.ComponentOverflow"}

### `ComponentOverflow`

```silk
ComponentOverflow
```

An address component exceeds its numeric range.

::Anchor{id="AddressReason.WrongComponentCount"}

### `WrongComponentCount`

```silk
WrongComponentCount
```

The address has the wrong number of components.

::Anchor{id="AddressReason.MultipleCompression"}

### `MultipleCompression`

```silk
MultipleCompression
```

The IPv6 spelling contains multiple compression markers.

::Anchor{id="AddressReason.CompressionWithoutOmission"}

### `CompressionWithoutOmission`

```silk
CompressionWithoutOmission
```

IPv6 compression does not omit any component.

::Anchor{id="HostReason"}

## `HostReason`

```silk
pub enum HostReason
```

The failed domain-host admission rule.

::Anchor{id="HostReason.EmptyName"}

### `EmptyName`

```silk
EmptyName
```

The domain name is empty.

::Anchor{id="HostReason.NameTooLong"}

### `NameTooLong`

```silk
NameTooLong
```

The domain name exceeds the admitted byte length.

::Anchor{id="HostReason.EmptyLabel"}

### `EmptyLabel`

```silk
EmptyLabel
```

A domain label is empty.

::Anchor{id="HostReason.LabelTooLong"}

### `LabelTooLong`

```silk
LabelTooLong
```

A domain label exceeds the admitted byte length.

::Anchor{id="HostReason.Nul"}

### `Nul`

```silk
Nul
```

The domain contains a NUL byte.

::Anchor{id="HostReason.NonAscii"}

### `NonAscii`

```silk
NonAscii
```

The domain contains a non-ASCII byte.

::Anchor{id="HostReason.InvalidCharacter"}

### `InvalidCharacter`

```silk
InvalidCharacter
```

An input byte is not admitted in this position.

::Anchor{id="HostReason.EdgeHyphen"}

### `EdgeHyphen`

```silk
EdgeHyphen
```

A domain label begins or ends with a hyphen.

::Anchor{id="HostReason.InvalidALabel"}

### `InvalidALabel`

```silk
InvalidALabel
```

An encoded internationalized label is invalid.

::Anchor{id="HostReason.TrailingDot"}

### `TrailingDot`

```silk
TrailingDot
```

The domain has a prohibited trailing dot.

::Anchor{id="HostReason.NumericFinalLabel"}

### `NumericFinalLabel`

```silk
NumericFinalLabel
```

The final domain label is entirely numeric.

::Anchor{id="UnsupportedHostForm"}

## `UnsupportedHostForm`

```silk
pub enum UnsupportedHostForm
```

A URI host form outside the first network profile.

::Anchor{id="UnsupportedHostForm.IpvFuture"}

### `IpvFuture`

```silk
IpvFuture
```

The host uses unsupported IPvFuture syntax.

::Anchor{id="UnsupportedHostForm.ZoneIdentifier"}

### `ZoneIdentifier`

```silk
ZoneIdentifier
```

The host contains an unsupported IPv6 zone identifier.

::Anchor{id="UnsupportedHostForm.EscapedHost"}

### `EscapedHost`

```silk
EscapedHost
```

The host contains unsupported percent escapes.

::Anchor{id="UnsupportedHostForm.UserInfo"}

### `UserInfo`

```silk
UserInfo
```

The host input contains URI user information.

::Anchor{id="UnsupportedHostForm.PortDelimiter"}

### `PortDelimiter`

```silk
PortDelimiter
```

The host input contains a port delimiter.

::Anchor{id="UnsupportedHostForm.UriDelimiter"}

### `UriDelimiter`

```silk
UriDelimiter
```

The host input contains a URI delimiter.

::Anchor{id="AddressError"}

## `AddressError`

```silk
pub union AddressError
```

A typed value-construction or presentation failure.

::Anchor{id="AddressError.InvalidAddress"}

### `InvalidAddress`

```silk
InvalidAddress
```

Numeric address admission failed.

::Anchor{id="AddressError.InvalidAddress.reason"}

#### Field `reason`

```silk
pub reason: AddressReason
```

The admission rule that rejected the supplied bytes.

::Anchor{id="AddressError.InvalidAddress.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the rejected input.

::Anchor{id="AddressError.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

Domain host admission failed.

::Anchor{id="AddressError.InvalidHost.reason"}

#### Field `reason`

```silk
pub reason: HostReason
```

The admission rule that rejected the supplied bytes.

::Anchor{id="AddressError.InvalidHost.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the rejected input.

::Anchor{id="AddressError.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

The supplied port is outside 0..65535.

::Anchor{id="AddressError.InvalidPort.value"}

#### Field `value`

```silk
pub value: usize
```

The supplied port number outside the admitted 0..65535 range.

::Anchor{id="AddressError.UnsupportedForm"}

### `UnsupportedForm`

```silk
UnsupportedForm
```

The input uses an unsupported host form.

::Anchor{id="AddressError.UnsupportedForm.form"}

#### Field `form`

```silk
pub form: UnsupportedHostForm
```

The unsupported URI host form.

::Anchor{id="AddressError.UnsupportedForm.offset"}

#### Field `offset`

```silk
pub offset: usize
```

The zero-based byte offset of the rejected input.

::Anchor{id="AddressError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The supplied output cannot hold the complete formatted value.

::Anchor{id="AddressError.OutputTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

The output capacity needed for the complete spelling.

::Anchor{id="AddressError.OutputTooSmall.available"}

#### Field `available`

```silk
pub available: usize
```

The output capacity supplied by the caller.

::Anchor{id="Ipv4Address"}

## `Ipv4Address`

```silk
pub struct Ipv4Address
```

Four owned network-order IPv4 octets.

::Anchor{id="Ipv6Address"}

## `Ipv6Address`

```silk
pub struct Ipv6Address
```

Sixteen owned network-order IPv6 octets.

::Anchor{id="IpAddress"}

## `IpAddress`

```silk
pub union IpAddress
```

An owned numeric network address whose family remains explicit.

::Anchor{id="IpAddress.V4"}

### `V4`

```silk
V4
```

An IPv4 address.

::Anchor{id="IpAddress.V4.value"}

#### Field `value`

```silk
pub value: Ipv4Address
```

The four network-order IPv4 octets.

::Anchor{id="IpAddress.V6"}

### `V6`

```silk
V6
```

An IPv6 address.

::Anchor{id="IpAddress.V6.value"}

#### Field `value`

```silk
pub value: Ipv6Address
```

The sixteen network-order IPv6 octets.

::Anchor{id="Port"}

## `Port`

```silk
pub struct Port
```

A checked transport port. Zero is valid for listener binding.

::Anchor{id="Endpoint"}

## `Endpoint`

```silk
pub struct Endpoint
```

An owned connectable numeric address and port.

::Anchor{id="DomainHost"}

## `DomainHost`

```silk
pub struct DomainHost
```

A validated absolute ASCII domain in preserved source spelling.

::Anchor{id="Host"}

## `Host`

```silk
pub union Host
```

A classified owned origin host.

::Anchor{id="Host.Domain"}

### `Domain`

```silk
Domain
```

A validated ASCII domain host.

::Anchor{id="Host.Domain.value"}

#### Field `value`

```silk
pub value: DomainHost
```

The validated ASCII domain in its original spelling.

::Anchor{id="Host.Ipv4"}

### `Ipv4`

```silk
Ipv4
```

An owned IPv4 origin host.

::Anchor{id="Host.Ipv4.value"}

#### Field `value`

```silk
pub value: Ipv4Address
```

The four network-order IPv4 octets.

::Anchor{id="Host.Ipv6"}

### `Ipv6`

```silk
Ipv6
```

An owned IPv6 origin host.

::Anchor{id="Host.Ipv6.value"}

#### Field `value`

```silk
pub value: Ipv6Address
```

The sixteen network-order IPv6 octets.

::Anchor{id="NetworkAddress"}

## `NetworkAddress`

```silk
pub struct NetworkAddress
```

Operations shared across the network address value family.

::Anchor{id="AddressError.impl.Copy"}

## Implementation `Copy for AddressError`

```silk
impl Copy for AddressError
```

::Anchor{id="Ipv4Address.impl.Copy"}

## Implementation `Copy for Ipv4Address`

```silk
impl Copy for Ipv4Address
```

::Anchor{id="Ipv6Address.impl.Copy"}

## Implementation `Copy for Ipv6Address`

```silk
impl Copy for Ipv6Address
```

::Anchor{id="IpAddress.impl.Copy"}

## Implementation `Copy for IpAddress`

```silk
impl Copy for IpAddress
```

::Anchor{id="Port.impl.Copy"}

## Implementation `Copy for Port`

```silk
impl Copy for Port
```

::Anchor{id="Endpoint.impl.Copy"}

## Implementation `Copy for Endpoint`

```silk
impl Copy for Endpoint
```

::Anchor{id="DomainHost.impl.Copy"}

## Implementation `Copy for DomainHost`

```silk
impl Copy for DomainHost
```

::Anchor{id="Host.impl.Copy"}

## Implementation `Copy for Host`

```silk
impl Copy for Host
```

::Anchor{id="Ipv4Address.impl"}

## Implementation `Ipv4Address`

```silk
impl Ipv4Address
```

::Anchor{id="Ipv4Address.impl.fromOctets"}

### Associated function `fromOctets`

```silk
pub fn fromOctets(octets: [u8; 4]) -> Ipv4Address
```

Constructs an IPv4 address from exact network-order octets.

::Anchor{id="Ipv4Address.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(bytes: &[u8]) -> Result<Ipv4Address, AddressError>
```

Parses a strict RFC 3986 decimal dotted quad.

::Anchor{id="Ipv4Address.impl.octets"}

### Method `octets`

```silk
pub fn octets(self: &Self) -> [u8; 4]
```

Returns the owned network-order octets by value.

::Anchor{id="Ipv4Address.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports exact binary equality.

::Anchor{id="Ipv4Address.impl.formatInto"}

### Method `formatInto`

```silk
pub fn formatInto(self: &Self, output: &mut [u8]) -> Result<usize, AddressError>
```

Formats canonical decimal dotted-quad text without partial output.

::Anchor{id="Ipv6Address.impl"}

## Implementation `Ipv6Address`

```silk
impl Ipv6Address
```

::Anchor{id="Ipv6Address.impl.fromOctets"}

### Associated function `fromOctets`

```silk
pub fn fromOctets(octets: [u8; 16]) -> Ipv6Address
```

Constructs an IPv6 address from exact network-order octets.

::Anchor{id="Ipv6Address.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(bytes: &[u8]) -> Result<Ipv6Address, AddressError>
```

Parses RFC 4291 IPv6 text without zones or IPvFuture.

::Anchor{id="Ipv6Address.impl.octets"}

### Method `octets`

```silk
pub fn octets(self: &Self) -> [u8; 16]
```

Returns the owned network-order octets by value.

::Anchor{id="Ipv6Address.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports exact binary equality.

::Anchor{id="Ipv6Address.impl.formatInto"}

### Method `formatInto`

```silk
pub fn formatInto(self: &Self, output: &mut [u8]) -> Result<usize, AddressError>
```

Formats canonical RFC 5952 lowercase text without partial output.

::Anchor{id="IpAddress.impl"}

## Implementation `IpAddress`

```silk
impl IpAddress
```

::Anchor{id="IpAddress.impl.isV4"}

### Method `isV4`

```silk
pub fn isV4(self: &Self) -> bool
```

Reports whether this address is IPv4.

::Anchor{id="IpAddress.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports family-sensitive exact equality.

::Anchor{id="IpAddress.impl.formatInto"}

### Method `formatInto`

```silk
pub fn formatInto(self: &Self, output: &mut [u8]) -> Result<usize, AddressError>
```

Formats the selected canonical address form.

::Anchor{id="Port.impl"}

## Implementation `Port`

```silk
impl Port
```

::Anchor{id="Port.impl.make"}

### Associated function `make`

```silk
pub fn make(value: usize) -> Result<Port, AddressError>
```

Checks a pointer-width integer as an inclusive u16 transport port.

::Anchor{id="Port.impl.fromU16"}

### Associated function `fromU16`

```silk
pub fn fromU16(value: u16) -> Port
```

Constructs a port from an already checked u16.

::Anchor{id="Port.impl.value"}

### Method `value`

```silk
pub fn value(self: &Self) -> u16
```

Returns the underlying checked u16.

::Anchor{id="Endpoint.impl"}

## Implementation `Endpoint`

```silk
impl Endpoint
```

::Anchor{id="Endpoint.impl.make"}

### Associated function `make`

```silk
pub fn make(address: IpAddress, port: Port) -> Endpoint
```

Owns one numeric address and checked port.

::Anchor{id="Endpoint.impl.address"}

### Method `address`

```silk
pub fn address(self: &Self) -> IpAddress
```

Returns the owned address by value.

::Anchor{id="Endpoint.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Port
```

Returns the checked port by value.

::Anchor{id="Endpoint.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports exact address-and-port equality.

::Anchor{id="DomainHost.impl"}

## Implementation `DomainHost`

```silk
impl DomainHost
```

::Anchor{id="DomainHost.impl.make"}

### Associated function `make`

```silk
pub fn make(bytes: &[u8]) -> Result<DomainHost, AddressError>
```

Copies and validates an absolute unrooted ASCII LDH/A-label domain.

::Anchor{id="DomainHost.impl.bytes"}

### Method `bytes`

```silk
pub fn bytes<'a>(self: &'a Self) -> &'a [u8]
```

Borrows the preserved source-spelling bytes.

::Anchor{id="DomainHost.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the stored byte length.

::Anchor{id="DomainHost.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Reports ASCII case-insensitive equality.

::Anchor{id="Host.impl"}

## Implementation `Host`

```silk
impl Host
```

::Anchor{id="Host.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(bytes: &[u8]) -> Result<Host, AddressError>
```

Classifies an RFC 3986 URI host into owned numeric or domain identity.

::Anchor{id="Host.impl.numeric"}

### Method `numeric`

```silk
pub fn numeric(self: &Self) -> IpAddress | ()
```

Returns the numeric address when this host is numeric.

::Anchor{id="Ipv4Address.impl.Display"}

## Implementation `Display for Ipv4Address`

```silk
impl Display for Ipv4Address
```

::Anchor{id="Ipv4Address.impl.Display.display"}

### Operation `display`

```silk
effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

::Anchor{id="Ipv6Address.impl.Display"}

## Implementation `Display for Ipv6Address`

```silk
impl Display for Ipv6Address
```

::Anchor{id="Ipv6Address.impl.Display.display"}

### Operation `display`

```silk
effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

::Anchor{id="IpAddress.impl.Display"}

## Implementation `Display for IpAddress`

```silk
impl Display for IpAddress
```

::Anchor{id="IpAddress.impl.Display.display"}

### Operation `display`

```silk
effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

::Anchor{id="DomainHost.impl.Display"}

## Implementation `Display for DomainHost`

```silk
impl Display for DomainHost
```

::Anchor{id="DomainHost.impl.Display.display"}

### Operation `display`

```silk
effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
