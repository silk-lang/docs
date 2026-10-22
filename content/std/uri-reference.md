Borrowed RFC 3986 URI references, explicit owned storage, and lossless component views.

## When to use

Use [`parse`](#UriReference.impl.parse) for a URI or a relative reference. Use `silk.uri` when a scheme is required.

## Details

[`parse`](#UriReference.impl.parse) borrows its input without allocation. [`OwnedUriReference`](#OwnedUriReference) provides explicit owned storage.
Empty components remain distinct from absent components. Parsing does not decode percent escapes.

## Gotchas

This module checks generic URI syntax. It does not apply scheme, network, or identity policy.
Raw non-ASCII bytes and IPv6 zone identifiers are not RFC 3986 syntax.

Import as `UriReference` with `import silk.uri_reference { UriReference }`.

Public declarations: 6.

::Anchor{id="HostKind"}

## `HostKind`

```silk
pub enum HostKind
```

The RFC grammar that matches an authority host.

::Anchor{id="HostKind.RegName"}

### `RegName`

```silk
RegName
```

A registered name, including an empty host.

::Anchor{id="HostKind.Ipv4"}

### `Ipv4`

```silk
Ipv4
```

Four decimal octets with no leading zero in a multi-digit octet.

::Anchor{id="HostKind.Ipv6"}

### `Ipv6`

```silk
Ipv6
```

A bracketed IPv6 address without a zone identifier.

::Anchor{id="HostKind.IpvFuture"}

### `IpvFuture`

```silk
IpvFuture
```

A bracketed future IP literal with a hexadecimal version.

::Anchor{id="Component"}

## `Component`

```silk
pub enum Component
```

The URI component in which syntax validation fails.

::Anchor{id="Component.Scheme"}

### `Scheme`

```silk
Scheme
```

The scheme before its colon.

::Anchor{id="Component.Authority"}

### `Authority`

```silk
Authority
```

The authority after two slashes.

::Anchor{id="Component.Userinfo"}

### `Userinfo`

```silk
Userinfo
```

The user information before its at sign.

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

The decimal port after its colon.

::Anchor{id="Component.Path"}

### `Path`

```silk
Path
```

The path before a query or fragment delimiter.

::Anchor{id="Component.Query"}

### `Query`

```silk
Query
```

The query after its question mark.

::Anchor{id="Component.Fragment"}

### `Fragment`

```silk
Fragment
```

The fragment after its number sign.

::Anchor{id="ParseReason"}

## `ParseReason`

```silk
pub enum ParseReason
```

A generic URI syntax failure category.

::Anchor{id="ParseReason.InvalidCharacter"}

### `InvalidCharacter`

```silk
InvalidCharacter
```

A byte is not allowed in the selected component.

::Anchor{id="ParseReason.InvalidPercentEscape"}

### `InvalidPercentEscape`

```silk
InvalidPercentEscape
```

A percent sign is not followed by two hexadecimal digits.

::Anchor{id="ParseReason.InvalidScheme"}

### `InvalidScheme`

```silk
InvalidScheme
```

A scheme is empty or does not follow the scheme grammar.

::Anchor{id="ParseReason.InvalidHost"}

### `InvalidHost`

```silk
InvalidHost
```

An IP literal or host delimiter does not follow the host grammar.

::Anchor{id="ParseReason.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

A port contains a non-decimal byte.

::Anchor{id="ParseReason.MissingScheme"}

### `MissingScheme`

```silk
MissingScheme
```

A scheme-bearing URI was requested but the input has no scheme.

::Anchor{id="ParseError"}

## `ParseError`

```silk
pub struct ParseError
```

A syntax failure with its component and original byte position.

::Anchor{id="ParseError.reason"}

### Field `reason`

```silk
pub reason: ParseReason
```

The failed syntax rule.

::Anchor{id="ParseError.component"}

### Field `component`

```silk
pub component: Component
```

The component that contains the failure.

::Anchor{id="ParseError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The zero-based offending byte offset, or the end offset when required syntax is missing.

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

An immutable parsed reference borrowing its original serialization.

### Details

Parsing allocates nothing. The result and its component views cannot outlive the input.
Use [`copy`](#UriReference.impl.copy) to retain the value independently, or [`OwnedUriReference.fromString`](#OwnedUriReference.impl.fromString) to adopt text.

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

Validates and borrows a URI reference without allocating or normalizing.

#### Details

Syntax errors identify the failed component and byte. Valid dotted decimal hosts take
precedence over registered names. The result retains the lifetime of `text`.

::Anchor{id="UriReference.impl.validateComponent"}

### Associated function `validateComponent`

```silk
pub fn validateComponent(text: string, component: Component) -> Option<ParseError>
```

Validates the encoded grammar of one component without allocating.

#### Details

Errors are relative to the supplied component text. Path checks its allowed bytes; assembly
must additionally check path form against the presence of scheme and authority. Host accepts
bracketed literals or reg-names, never userinfo or a port. Empty ports and hosts are valid.

::Anchor{id="UriReference.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(self: &Self) -> OwnedUriReference ! OutOfMemoryError ? &mut Allocator
```

Copies a parsed reference into independent owned storage with one allocation for nonempty input.

::Anchor{id="UriReference.impl.parseOwned"}

### Associated function `parseOwned`

```silk
pub effect fn parseOwned(text: string<'text>) -> Result<OwnedUriReference, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Validates input and explicitly copies it into owned storage; invalid input does not allocate.

::Anchor{id="UriReference.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Returns the original borrowed serialization, preserving all delimiters and escape spelling.

::Anchor{id="UriReference.impl.scheme"}

### Method `scheme`

```silk
pub fn scheme(self: &Self) -> Option<string<'text>>
```

Borrows the scheme without its colon, or returns `None` for a relative reference.

::Anchor{id="UriReference.impl.authority"}

### Method `authority`

```silk
pub fn authority(self: &Self) -> Option<string<'text>>
```

Borrows the authority without its two slashes, including a present empty authority.

::Anchor{id="UriReference.impl.userinfo"}

### Method `userinfo`

```silk
pub fn userinfo(self: &Self) -> Option<string<'text>>
```

Borrows user information without its at sign, or returns `None` when absent.

#### Details

An empty value is present. Colons remain part of the value; no username or password split occurs.

::Anchor{id="UriReference.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Option<string<'text>>
```

Borrows the host with IP-literal brackets intact, or returns `None` when authority is absent.

#### Details

An empty authority has a present empty host. The view borrows from the input without allocation.

::Anchor{id="UriReference.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Option<string<'text>>
```

Borrows the decimal port without its colon, or returns `None` when the colon is absent.

#### Details

An empty port is present. This operation does not convert the port to a number or impose a limit.

::Anchor{id="UriReference.impl.path"}

### Method `path`

```silk
pub fn path(self: &Self) -> string<'text>
```

Borrows the path from the input without allocation; an empty path returns an empty string.

::Anchor{id="UriReference.impl.query"}

### Method `query`

```silk
pub fn query(self: &Self) -> Option<string<'text>>
```

Borrows the query without its question mark, including a present empty query.

::Anchor{id="UriReference.impl.fragment"}

### Method `fragment`

```silk
pub fn fragment(self: &Self) -> Option<string<'text>>
```

Borrows the fragment without its number sign, including a present empty fragment.

::Anchor{id="UriReference.impl.hostKind"}

### Method `hostKind`

```silk
pub fn hostKind(self: &Self) -> Option<HostKind>
```

Returns the host grammar classification, or `None` when authority is absent.

::Anchor{id="OwnedUriReference"}

## `OwnedUriReference`

```silk
pub struct OwnedUriReference
```

An immutable owner of validated URI-reference text and scalar component ranges.

### Details

Owns no references into itself. [`view`](#OwnedUriReference.impl.view) borrows existing storage without reparsing or allocating.
Use [`fromString`](#OwnedUriReference.impl.fromString) to transfer existing storage, or [`UriReference.parseOwned`](#UriReference.impl.parseOwned) to copy input.

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

Validates and adopts an existing String without copying or allocating.

#### Gotchas

This operation consumes the String on both success and syntax failure.

::Anchor{id="OwnedUriReference.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> UriReference
```

Borrows a parsed reference from this owner's stored ranges without validation or allocation.

::Anchor{id="OwnedUriReference.impl.intoString"}

### Method `intoString`

```silk
pub fn intoString(self: Self) -> String
```

Transfers the original owned serialization out of the parsed owner without copying.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
