Parse a URI or a relative reference (RFC 3986) and read its components without allocation.

## When to use
Use [`UriReference.parse`](#UriReference.impl.parse) for text that can be relative, such as an HTML `href`, a redirect
`Location`, or a request target like `/search?q=silk`. Use `silk.uri` when the text must have a
scheme. To change components or build a reference, use `silk.uri_components`. To decode the
escapes in a component, use `silk.uri_percent`.

## Details
[`UriReference.parse`](#UriReference.impl.parse) checks the generic syntax of RFC 3986 and returns a view that borrows the
input. The component functions return slices of the input, so nothing is decoded or normalized:
the case of letters and the spelling of `%XX` escapes do not change. An absent component and an
empty component are different: `http://a/` has no query, but `http://a/?` has an empty query.
[`OwnedUriReference`](#OwnedUriReference) holds the text and the parsed ranges together, for a value that lives
longer than its input.

## Errors
[`UriReference.parse`](#UriReference.impl.parse) returns a [`ParseError`](#ParseError) with the cause, the component, and the byte
position.

## Gotchas
The parser checks syntax only. It does not check that a scheme is known, that a host exists, or
that a port is in range. Raw non-ASCII bytes, spaces, and IPv6 zone identifiers are not valid
RFC 3986 syntax. Encode them with `silk.uri_percent` first.

## Examples
### Read the parts of a relative reference
```silk
import silk.option { Option }
import silk.result { Result }
import silk.uri_reference { ParseError, UriReference }

pub fn main() -> i32 {
  let reference = match UriReference.parse("/search?q=silk#results") {
    Result<UriReference, ParseError>.Success { value } => value
    Result<UriReference, ParseError>.Failure { error: _ } => {
      return 1
    }
  }
  let relative = match UriReference.scheme(&reference) {
    Option<string>.Some { value: _ } => false
    Option<string>.None => true
  }
  let query = UriReference.query(&reference) |> Option<string>.unwrapOr("")
  if !relative || UriReference.path(&reference) != "/search" || query != "q=silk" {
    return 1
  }
  return 0
}
```

### Find the position of a syntax error
```silk
import silk.result { Result }
import silk.uri_reference { Component, ParseError, ParseReason, UriReference }

pub fn main() -> i32 {
  return match UriReference.parse("http://example.com:80a/") {
    Result<UriReference, ParseError>.Failure { error } => {
      if error.reason != ParseReason.InvalidPort || error.component != Component.Port
        || error.offset != 21 {
        return 1
      }
      return 0
    }
    Result<UriReference, ParseError>.Success { value: _ } => 1
  }
}
```

Import as `UriReference` with `import silk.uri_reference { UriReference }`.

Public declarations: 6.

::Anchor{id="HostKind"}

## `HostKind`

```silk
pub enum HostKind
```

The form of a host, from [`UriReference.hostKind`](#UriReference.impl.hostKind).

::Anchor{id="HostKind.RegName"}

### `RegName`

```silk
RegName
```

A registered name, such as `example.com`. An empty host also has this kind.

::Anchor{id="HostKind.Ipv4"}

### `Ipv4`

```silk
Ipv4
```

An IPv4 address in dotted decimal form, such as `192.0.2.1`. An octet with more than one digit
must not start with 0.

::Anchor{id="HostKind.Ipv6"}

### `Ipv6`

```silk
Ipv6
```

An IPv6 address in brackets, such as `[2001:db8::1]`. A zone identifier is not allowed.

::Anchor{id="HostKind.IpvFuture"}

### `IpvFuture`

```silk
IpvFuture
```

A future IP literal in brackets, such as `[v1.x]`.

::Anchor{id="Component"}

## `Component`

```silk
pub enum Component
```

A component of a URI reference.

::Anchor{id="Component.Scheme"}

### `Scheme`

```silk
Scheme
```

The scheme, such as `https`, without the `:`.

::Anchor{id="Component.Authority"}

### `Authority`

```silk
Authority
```

The authority after `//`: user information, host, and port.

::Anchor{id="Component.Userinfo"}

### `Userinfo`

```silk
Userinfo
```

The user information before `@`.

::Anchor{id="Component.Host"}

### `Host`

```silk
Host
```

The registered name or IP literal.

::Anchor{id="Component.Port"}

### `Port`

```silk
Port
```

The decimal port after the `:` of the authority.

::Anchor{id="Component.Path"}

### `Path`

```silk
Path
```

The path, up to `?` or `#`.

::Anchor{id="Component.Query"}

### `Query`

```silk
Query
```

The query after `?`.

::Anchor{id="Component.Fragment"}

### `Fragment`

```silk
Fragment
```

The fragment after `#`.

::Anchor{id="ParseReason"}

## `ParseReason`

```silk
pub enum ParseReason
```

The cause of a [`ParseError`](#ParseError).

::Anchor{id="ParseReason.InvalidCharacter"}

### `InvalidCharacter`

```silk
InvalidCharacter
```

A byte that the component does not allow, such as a space or a non-ASCII byte.

::Anchor{id="ParseReason.InvalidPercentEscape"}

### `InvalidPercentEscape`

```silk
InvalidPercentEscape
```

A `%` that is not followed by two hexadecimal digits.

::Anchor{id="ParseReason.InvalidScheme"}

### `InvalidScheme`

```silk
InvalidScheme
```

A scheme that is empty or does not start with a letter followed by letters, digits, `+`, `-`,
or `.`.

::Anchor{id="ParseReason.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

An IP literal or a host that does not follow the host grammar.

::Anchor{id="ParseReason.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

A port that has a byte that is not a decimal digit.

::Anchor{id="ParseReason.MissingScheme"}

### `MissingScheme`

```silk
MissingScheme
```

The text has no scheme, but a function such as `Uri.parse` needs one.

::Anchor{id="ParseError"}

## `ParseError`

```silk
pub struct ParseError
```

A URI syntax error: the cause, the component, and the byte position.

::Anchor{id="ParseError.reason"}

### Field `reason`

```silk
pub reason: ParseReason
```

The cause of the error.

::Anchor{id="ParseError.component"}

### Field `component`

```silk
pub component: Component
```

The component that has the error.

::Anchor{id="ParseError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The position of the byte that is not valid, from the start of the text. If required syntax is
missing, it is the position where it must be.

::Anchor{id="ParseError.impl.Copy"}

## Implementation `Copy for ParseError`

```silk
impl Copy for ParseError
```

::Anchor{id="UriReference"}

## `UriReference`

```silk
pub struct UriReference<'text>
```

A parsed URI reference that borrows its text.

It is `Copy` and does not allocate. It cannot live longer than its text. Use
[`UriReference.copy`](#UriReference.impl.copy) or [`UriReference.parseOwned`](#UriReference.impl.parseOwned) to get an [`OwnedUriReference`](#OwnedUriReference).

::Anchor{id="UriReference.impl.Copy"}

## Implementation `Copy for UriReference<'text>`

```silk
impl<'text> Copy for UriReference<'text>
```

::Anchor{id="UriReference.impl"}

## Implementation `UriReference<'text>`

```silk
impl<'text> UriReference<'text>
```

::Anchor{id="UriReference.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string<'text>) -> Result<UriReference<'text>, ParseError>
```

Parses `text` as a URI reference: a URI with a scheme, or a relative reference.

It does not allocate, decode, or normalize. If a host is a valid IPv4 address, its kind is
`Ipv4`, not `RegName`.

#### Errors
- [`ParseError`](#ParseError) for the first syntax problem, with its component and byte position.

::Anchor{id="UriReference.impl.validateComponent"}

### Associated function `validateComponent`

```silk
pub fn validateComponent(text: string, component: Component) -> Option<ParseError>
```

Checks that `text` is valid encoded text for one `component`, and returns the error or `None`.

The error `offset` is a position in `text`. A host can be a registered name or an IP literal
in brackets, but not user information or a port. An empty host or port is valid.

#### Gotchas
For a path, it checks only the bytes. Some paths are not valid in every position, for example
a path that starts with `//` when there is no authority.

::Anchor{id="UriReference.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(self: &Self) -> OwnedUriReference ! OutOfMemoryError ? &mut Allocator
```

Returns an [`OwnedUriReference`](#OwnedUriReference) with a copy of the text. It does not parse again.

#### Errors
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="UriReference.impl.parseOwned"}

### Associated function `parseOwned`

```silk
pub effect fn parseOwned(text: string<'text>) -> Result<OwnedUriReference, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Parses `text` and returns an [`OwnedUriReference`](#OwnedUriReference) with a copy of it.

#### Errors
- `Failure` with a [`ParseError`](#ParseError) if `text` is not valid. Nothing is allocated.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="UriReference.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Returns the full text of the reference, as it was parsed.

::Anchor{id="UriReference.impl.scheme"}

### Method `scheme`

```silk
pub fn scheme(self: &Self) -> Option<string<'text>>
```

Returns the scheme without the `:`, or `None` for a relative reference. The case of the
letters does not change.

::Anchor{id="UriReference.impl.authority"}

### Method `authority`

```silk
pub fn authority(self: &Self) -> Option<string<'text>>
```

Returns the authority without the `//`. Returns `None` if the component is absent. A component
that is present but empty, such as the query of `http://a/?`, returns `Some("")`.

::Anchor{id="UriReference.impl.userinfo"}

### Method `userinfo`

```silk
pub fn userinfo(self: &Self) -> Option<string<'text>>
```

Returns the user information without the `@`. Returns `None` if the component is absent. A
component that is present but empty, such as the query of `http://a/?`, returns `Some("")`.

The text is not split at `:` into a user name and a password.

::Anchor{id="UriReference.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Option<string<'text>>
```

Returns the host, with the brackets of an IP literal. Returns `None` if there is no authority.

The host of `file:///x` is present and empty.

::Anchor{id="UriReference.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Option<string<'text>>
```

Returns the port digits without the `:`. Returns `None` if the component is absent. A
component that is present but empty, such as the query of `http://a/?`, returns `Some("")`.

It does not convert the port to a number or check its range.

::Anchor{id="UriReference.impl.path"}

### Method `path`

```silk
pub fn path(self: &Self) -> string<'text>
```

Returns the path. The path is always present, but it can be empty.

::Anchor{id="UriReference.impl.query"}

### Method `query`

```silk
pub fn query(self: &Self) -> Option<string<'text>>
```

Returns the query without the `?`. Returns `None` if the component is absent. A component that
is present but empty, such as the query of `http://a/?`, returns `Some("")`.

::Anchor{id="UriReference.impl.fragment"}

### Method `fragment`

```silk
pub fn fragment(self: &Self) -> Option<string<'text>>
```

Returns the fragment without the `#`. Returns `None` if the component is absent. A component
that is present but empty, such as the query of `http://a/?`, returns `Some("")`.

::Anchor{id="UriReference.impl.hostKind"}

### Method `hostKind`

```silk
pub fn hostKind(self: &Self) -> Option<HostKind>
```

Returns the [`HostKind`](#HostKind) of the host, or `None` if there is no authority.

::Anchor{id="OwnedUriReference"}

## `OwnedUriReference`

```silk
pub struct OwnedUriReference
```

A URI reference that owns its text and its parsed ranges.

Get one from [`UriReference.copy`](#UriReference.impl.copy), [`UriReference.parseOwned`](#UriReference.impl.parseOwned), or
[`OwnedUriReference.fromString`](#OwnedUriReference.impl.fromString). [`OwnedUriReference.view`](#OwnedUriReference.impl.view) returns a [`UriReference`](#UriReference) without
parsing again.

::Anchor{id="OwnedUriReference.impl"}

## Implementation `OwnedUriReference`

```silk
impl OwnedUriReference
```

::Anchor{id="OwnedUriReference.impl.fromString"}

### Associated function `fromString`

```silk
pub fn fromString(text: String) -> Result<OwnedUriReference, ParseError>
```

Parses `text` and keeps it, without a copy or an allocation.

#### Errors
- `Failure` with a [`ParseError`](#ParseError) if `text` is not valid.

#### Gotchas
It consumes `text` also when it fails.

::Anchor{id="OwnedUriReference.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> UriReference
```

Returns a [`UriReference`](#UriReference) that borrows this value. It does not parse again or allocate.

::Anchor{id="OwnedUriReference.impl.intoString"}

### Method `intoString`

```silk
pub fn intoString(self: Self) -> String
```

Returns the text and consumes the value. It does not copy.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
