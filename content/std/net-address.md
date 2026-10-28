IP addresses, ports, endpoints, and the host of a URI, as checked values that do not allocate.

## When to use
Use [`Host.parse`](#Host.impl.parse) on the host of a URI. It returns a domain name, an IPv4 address, or an IPv6
address. Give the result to `silk.net.resolver` to get endpoints, and keep it to check the identity
of an HTTPS server. Use [`Ipv4Address`](#Ipv4Address), [`Ipv6Address`](#Ipv6Address), [`Port`](#Port), and [`Endpoint`](#Endpoint) when you
already have a numeric address.

## Details
Addresses store their bytes in network order. A [`DomainHost`](#DomainHost) keeps the spelling of its input
in a fixed buffer of 253 bytes, and compares without case. The `formatInto` functions write the
canonical text into a buffer that you give. IPv6 text uses the short lowercase form of RFC 5952,
for example `2001:db8::1`.

## Errors
- [`AddressError`](#AddressError) tells which rule failed, and the byte offset where it failed.

## Gotchas
Only plain ASCII domains are accepted. Convert an internationalized name to its `xn--` form
first. These forms fail: a trailing dot, percent escapes, an IPv6 zone such as `%eth0`,
IPvFuture, user information, a port, and old IPv4 forms such as `127.1` or `0x7f.0.0.1`.

## Examples
### Parse hosts and format an address
```silk
import silk.net.address { AddressError, Host, Ipv6Address, Port }
import silk.core.result { Result }

pub fn main() -> i32 {
  let host = match Host.parse("[2001:DB8:0:0::1]") {
    Result<Host, AddressError>.Success { value } => value
    Result<Host, AddressError>.Failure { error: _ } => {
      return 1
    }
  }
  let address = match host {
    Host.Ipv6 { value } => value
    _ => {
      return 1
    }
  }
  let mut text: [u8; 64] = [0; 64]
  let length = match Ipv6Address.formatInto(&address, &mut text) {
    Result<usize, AddressError>.Success { value } => value
    Result<usize, AddressError>.Failure { error: _ } => {
      return 1
    }
  }

  // The canonical form is "2001:db8::1".
  if length != 11 || text[0] != 50 || text[9] != 58 || text[10] != 49 {
    return 1
  }
  let failed = match Port.make(70000) {
    Result<Port, AddressError>.Success { value: _ } => false
    Result<Port, AddressError>.Failure { error: AddressError.InvalidPort { value } } => value
      == 70000
    Result<Port, AddressError>.Failure { error: _ } => false
  }
  if !failed {
    return 1
  }
  return 0
}
```

Import as `NetworkAddress` with `import silk.net.address { NetworkAddress }`.

Public declarations: 12.

::Anchor{id="AddressReason"}

## `AddressReason`

```silk
pub enum AddressReason
```

The rule that rejected an IP address. [`AddressError.InvalidAddress`](#AddressError.InvalidAddress) carries it, with the byte
offset where the check failed.

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

An IPv4 part has a leading zero, as in `010`. The old octal form is not accepted.

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

The address has the wrong number of parts: IPv4 needs 4, and IPv6 needs 8 or `::`.

::Anchor{id="AddressReason.MultipleCompression"}

### `MultipleCompression`

```silk
MultipleCompression
```

The IPv6 text has `::` more than one time.

::Anchor{id="AddressReason.CompressionWithoutOmission"}

### `CompressionWithoutOmission`

```silk
CompressionWithoutOmission
```

The IPv6 text has `::` together with all 8 parts, so `::` replaces nothing.

::Anchor{id="AddressReason.impl.Debug"}

## Implementation `Debug for AddressReason`

```silk
impl Debug for AddressReason
```

::Anchor{id="AddressReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Empty`.

::Anchor{id="HostReason"}

## `HostReason`

```silk
pub enum HostReason
```

The rule that rejected a domain name. [`AddressError.InvalidHost`](#AddressError.InvalidHost) carries it, with the byte
offset where the check failed.

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

The name is longer than 253 bytes.

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

A label, the part between two dots, is longer than 63 bytes.

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

A label that starts with `xn--` is not a valid Punycode label.

::Anchor{id="HostReason.TrailingDot"}

### `TrailingDot`

```silk
TrailingDot
```

The name ends with a dot, as in `example.com.`.

::Anchor{id="HostReason.NumericFinalLabel"}

### `NumericFinalLabel`

```silk
NumericFinalLabel
```

The last label has only digits, so the name looks like an IPv4 address.

::Anchor{id="HostReason.impl.Debug"}

## Implementation `Debug for HostReason`

```silk
impl Debug for HostReason
```

::Anchor{id="HostReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `EmptyName`.

::Anchor{id="UnsupportedHostForm"}

## `UnsupportedHostForm`

```silk
pub enum UnsupportedHostForm
```

A host form that is valid in a URI, but that this module does not accept.

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

The IPv6 host has a zone, as in `[fe80::1%25eth0]`.

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

The input has user information, as in `user@host`. Give only the host.

::Anchor{id="UnsupportedHostForm.PortDelimiter"}

### `PortDelimiter`

```silk
PortDelimiter
```

The input has a port, as in `host:80`. Give only the host.

::Anchor{id="UnsupportedHostForm.UriDelimiter"}

### `UriDelimiter`

```silk
UriDelimiter
```

The input has `/`, `?`, or `#`. Give only the host.

::Anchor{id="UnsupportedHostForm.impl.Debug"}

## Implementation `Debug for UnsupportedHostForm`

```silk
impl Debug for UnsupportedHostForm
```

::Anchor{id="UnsupportedHostForm.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `IpvFuture`.

::Anchor{id="AddressError"}

## `AddressError`

```silk
pub union AddressError
```

The error from parsing, checking, or formatting a value in this module.

::Anchor{id="AddressError.InvalidAddress"}

### `InvalidAddress`

```silk
InvalidAddress
```

The IP address text is not valid.

::Anchor{id="AddressError.InvalidAddress.reason"}

#### Field `reason`

```silk
pub reason: AddressReason
```

The rule that failed.

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

The domain name is not valid.

::Anchor{id="AddressError.InvalidHost.reason"}

#### Field `reason`

```silk
pub reason: HostReason
```

The rule that failed.

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

The port number is more than 65535.

::Anchor{id="AddressError.InvalidPort.value"}

#### Field `value`

```silk
pub value: usize
```

The number that you gave.

::Anchor{id="AddressError.UnsupportedForm"}

### `UnsupportedForm`

```silk
UnsupportedForm
```

The host uses a form that this module does not accept.

::Anchor{id="AddressError.UnsupportedForm.form"}

#### Field `form`

```silk
pub form: UnsupportedHostForm
```

The form that was found.

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

The output buffer is too small. Nothing was written.

::Anchor{id="AddressError.OutputTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

The number of bytes that the text needs.

::Anchor{id="AddressError.OutputTooSmall.available"}

#### Field `available`

```silk
pub available: usize
```

The length of the buffer that you gave.

::Anchor{id="AddressError.impl.Debug"}

## Implementation `Debug for AddressError`

```silk
impl Debug for AddressError
```

::Anchor{id="AddressError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `InvalidAddress { ... }`.

::Anchor{id="Ipv4Address"}

## `Ipv4Address`

```silk
pub struct Ipv4Address
```

An IPv4 address, as 4 bytes in network order.

::Anchor{id="Ipv6Address"}

## `Ipv6Address`

```silk
pub struct Ipv6Address
```

An IPv6 address, as 16 bytes in network order.

::Anchor{id="IpAddress"}

## `IpAddress`

```silk
pub union IpAddress
```

An IPv4 or an IPv6 address.

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

A TCP or UDP port, from 0 to 65535. Port 0 is accepted, for example to let the system choose the
port of a listener.

::Anchor{id="Endpoint"}

## `Endpoint`

```silk
pub struct Endpoint
```

An IP address and a port that you can connect to.

::Anchor{id="DomainHost"}

## `DomainHost`

```silk
pub struct DomainHost
```

A checked ASCII domain name, such as `example.com`. It keeps the spelling of its input, and
compares without case.

It stores the name in a fixed buffer of 253 bytes and does not allocate. Only plain ASCII names
are accepted. Convert an internationalized name to its `xn--` form first.

::Anchor{id="Host"}

## `Host`

```silk
pub union Host
```

The host of a URI: a domain name, an IPv4 address, or an IPv6 address. Make it with
[`Host.parse`](#Host.impl.parse).

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

The domain name, spelled as in the input.

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

The namespace of this module. The functions are on the value types.

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

Returns the IPv4 address with these 4 bytes, in network order.

::Anchor{id="Ipv4Address.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Result<Ipv4Address, AddressError>
```

Parses decimal dotted text, such as `192.0.2.1`. Each part is 0 to 255 without leading zeros.

::Anchor{id="Ipv4Address.impl.parseBytes"}

### Associated function `parseBytes`

```silk
pub fn parseBytes(bytes: &[u8]) -> Result<Ipv4Address, AddressError>
```

Parses decimal dotted text, such as `192.0.2.1`. Each part is 0 to 255 without leading zeros.

#### When to use
Use it for text that you have as bytes, such as part of a request you read. For a `string`,
use `Ipv4Address.parse`.

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

Writes the canonical text to the start of `output`, and returns its length. If `output` is too
small, it writes nothing and returns `OutputTooSmall`.

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

Returns the IPv6 address with these 16 bytes, in network order.

::Anchor{id="Ipv6Address.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Result<Ipv6Address, AddressError>
```

Parses hexadecimal IPv6 text, such as `2001:db8::1`, without brackets or a zone. A dotted IPv4
end, as in `::ffff:192.0.2.1`, is not accepted.

::Anchor{id="Ipv6Address.impl.parseBytes"}

### Associated function `parseBytes`

```silk
pub fn parseBytes(bytes: &[u8]) -> Result<Ipv6Address, AddressError>
```

Parses hexadecimal IPv6 text, such as `2001:db8::1`, without brackets or a zone. A dotted IPv4
end, as in `::ffff:192.0.2.1`, is not accepted.

#### When to use
Use it for text that you have as bytes, such as part of a request you read. For a `string`,
use `Ipv6Address.parse`.

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

Writes the canonical lowercase text, such as `2001:db8::1`, to the start of `output`, and
returns its length. If `output` is too small, it writes nothing and returns `OutputTooSmall`.

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

Returns `true` for an IPv4 address.

::Anchor{id="IpAddress.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the two addresses are of the same family and have the same bytes. An IPv4
address never equals an IPv6 address, also not an IPv4-mapped one.

::Anchor{id="IpAddress.impl.formatInto"}

### Method `formatInto`

```silk
pub fn formatInto(self: &Self, output: &mut [u8]) -> Result<usize, AddressError>
```

Writes the canonical text of the IPv4 or IPv6 address to the start of `output`, and returns
its length. IPv6 has no brackets.

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

Returns the port, or `InvalidPort` if `value` is more than 65535.

::Anchor{id="Port.impl.fromU16"}

### Associated function `fromU16`

```silk
pub fn fromU16(value: u16) -> Port
```

Returns the port with this number. Every `u16` is a valid port.

::Anchor{id="Port.impl.value"}

### Method `value`

```silk
pub fn value(self: &Self) -> u16
```

Returns the port number.

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

Returns the endpoint for `address` and `port`.

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
pub fn make(text: string) -> Result<DomainHost, AddressError>
```

Checks the text `text` as a domain name and copies it.

#### Details
The name must be plain ASCII, 1 to 253 bytes, with labels of 1 to 63 bytes that do not begin
or end with a hyphen. A label that starts with `xn--` must be valid Punycode. The last label
must not be only digits.

#### Errors
- [`AddressError.InvalidHost`](#AddressError.InvalidHost) with a [`HostReason`](#HostReason) and the byte offset if a rule fails. A
  trailing dot, as in `example.com.`, fails with `TrailingDot`.

#### Gotchas
Convert an internationalized name to its `xn--` form first.

::Anchor{id="DomainHost.impl.makeBytes"}

### Associated function `makeBytes`

```silk
pub fn makeBytes(bytes: &[u8]) -> Result<DomainHost, AddressError>
```

Checks `bytes` as a domain name and copies it.

#### When to use
Use it for a name that you have as bytes, such as part of a request you read. For a `string`,
use `DomainHost.make`.

#### Details
The name must be plain ASCII, 1 to 253 bytes, with labels of 1 to 63 bytes that do not begin
or end with a hyphen. A label that starts with `xn--` must be valid Punycode. The last label
must not be only digits.

#### Errors
- [`AddressError.InvalidHost`](#AddressError.InvalidHost) with a [`HostReason`](#HostReason) and the byte offset if a rule fails. A
  trailing dot, as in `example.com.`, fails with `TrailingDot`.

#### Gotchas
Convert an internationalized name to its `xn--` form first.

::Anchor{id="DomainHost.impl.bytes"}

### Method `bytes`

```silk
pub fn bytes<'a>(self: &'a Self) -> &'a [u8]
```

Returns the name, spelled as in the input.

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

Returns `true` if the names are equal without case, so `Example.COM` equals `example.com`.

::Anchor{id="Host.impl"}

## Implementation `Host`

```silk
impl Host
```

::Anchor{id="Host.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Result<Host, AddressError>
```

Parses the host part of a URI.

#### Details
`[...]` is parsed as IPv6, decimal dotted text is parsed as IPv4, and all other text as a
domain name. Give only the host, without user information or a port. The result does not
allocate. Give it to `silk.net.resolver` to get endpoints, and keep it to check the identity of
an HTTPS server.

#### Errors
- [`AddressError`](#AddressError) with the rule that failed and the byte offset where it failed.

#### Gotchas
These forms fail: a trailing dot, percent escapes, an IPv6 zone such as `%eth0`, IPvFuture,
user information, a port, non-ASCII names, and old IPv4 forms such as `127.1` or
`0x7f.0.0.1`.

::Anchor{id="Host.impl.parseBytes"}

### Associated function `parseBytes`

```silk
pub fn parseBytes(bytes: &[u8]) -> Result<Host, AddressError>
```

Parses the host part of a URI.

#### When to use
Use it for a host that you have as bytes, such as the host of a URI you parsed. For a
`string`, use `Host.parse`.

#### Details
`[...]` is parsed as IPv6, decimal dotted text is parsed as IPv4, and all other text as a
domain name. Give only the host, without user information or a port. The result does not
allocate. Give it to `silk.net.resolver` to get endpoints, and keep it to check the identity of
an HTTPS server.

#### Errors
- [`AddressError`](#AddressError) with the rule that failed and the byte offset where it failed.

#### Gotchas
These forms fail: a trailing dot, percent escapes, an IPv6 zone such as `%eth0`, IPvFuture,
user information, a port, non-ASCII names, and old IPv4 forms such as `127.1` or
`0x7f.0.0.1`.

::Anchor{id="Host.impl.numeric"}

### Method `numeric`

```silk
pub fn numeric(self: &Self) -> IpAddress | ()
```

Returns the IP address of a numeric host, or `()` for a domain name.

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

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
