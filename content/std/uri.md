Borrowed RFC 3986 URIs, explicit ownership, and reusable relative-reference resolution.

## When to use
Use [`parse`](#Uri.impl.parse) when a scheme is required. Use `silk.uri_reference` for relative references.
Use [`resolveInto`](#Uri.impl.resolveInto) to reuse output storage, or [`resolveOwned`](#Uri.impl.resolveOwned) for an independent owner.

## Details
[`Uri`](#Uri) accepts the RFC `URI` production, including fragments. Parsing allocates nothing.
Resolution removes literal path dot segments and preserves copied component spelling.
These operations do not apply network, scheme, or normalization policy.

Import as `Uri` with `import silk.uri { Uri }`.

Public declarations: 2.

::Anchor{id="Uri"}

## `Uri`

```silk
pub struct Uri<'text>
```

A parsed URI borrowing input text, with a required scheme and an optional fragment.

### Details
Parsing and component access allocate nothing. The value cannot outlive its input.

::Anchor{id="Uri.impl.Copy"}

## Implementation `Copy for Uri<'text>`

```silk
impl<'text> Copy for Uri<'text>
```

::Anchor{id="Uri.impl"}

## Implementation `Uri<'text>`

```silk
impl<'text> Uri<'text>
```

::Anchor{id="Uri.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string<'text>) -> Result<Uri<'text>, ParseError>
```

Validates and borrows a scheme-bearing URI without allocating or normalizing.

#### Details
A missing scheme returns `MissingScheme` at byte zero. Other syntax errors identify their
component and byte. The returned view retains the input lifetime.

::Anchor{id="Uri.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(self: &Self) -> OwnedUri ! OutOfMemoryError ? &mut Allocator
```

Copies this parsed URI into independently owned storage with one allocation for its text.

::Anchor{id="Uri.impl.parseOwned"}

### Associated function `parseOwned`

```silk
pub effect fn parseOwned(text: string<'text>) -> Result<OwnedUri, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Validates input and explicitly copies it into owned storage; invalid input does not allocate.

::Anchor{id="Uri.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Borrows the original URI text with delimiters, letter case, and escape spelling unchanged.

::Anchor{id="Uri.impl.asReference"}

### Method `asReference`

```silk
pub fn asReference(self: &Self) -> UriReference<'text>
```

Returns this scheme-bearing URI as a borrowed generic reference without validation or allocation.

::Anchor{id="Uri.impl.scheme"}

### Method `scheme`

```silk
pub fn scheme(self: &Self) -> string<'text>
```

Borrows the required scheme without its colon and preserves its letter case.

::Anchor{id="Uri.impl.authority"}

### Method `authority`

```silk
pub fn authority(self: &Self) -> Option<string<'text>>
```

Borrows the authority without `//`, or returns `None` when absent. An empty authority remains present.

::Anchor{id="Uri.impl.userinfo"}

### Method `userinfo`

```silk
pub fn userinfo(self: &Self) -> Option<string<'text>>
```

Borrows userinfo without `@`, or returns `None` when absent. An empty userinfo remains present.

::Anchor{id="Uri.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Option<string<'text>>
```

Borrows the host, including IP-literal brackets, or returns `None` without authority. An empty host remains present.

::Anchor{id="Uri.impl.hostKind"}

### Method `hostKind`

```silk
pub fn hostKind(self: &Self) -> Option<HostKind>
```

Returns the parsed host classification, or `None` when authority is absent.

::Anchor{id="Uri.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Option<string<'text>>
```

Borrows the port digits without the colon, or returns `None` when absent. An empty port remains present.

::Anchor{id="Uri.impl.path"}

### Method `path`

```silk
pub fn path(self: &Self) -> string<'text>
```

Borrows the path with its escape spelling unchanged. The path can be empty.

::Anchor{id="Uri.impl.query"}

### Method `query`

```silk
pub fn query(self: &Self) -> Option<string<'text>>
```

Borrows the query without `?`, or returns `None` when absent. An empty query remains present.

::Anchor{id="Uri.impl.fragment"}

### Method `fragment`

```silk
pub fn fragment(self: &Self) -> Option<string<'text>>
```

Borrows the fragment without `#`, or returns `None` when absent. An empty fragment remains present.

::Anchor{id="Uri.impl.resolveInto"}

### Associated function `resolveInto`

```silk
pub effect fn resolveInto(output: &mut Bytes, base: &Uri, reference: &UriReference) -> Result<
    (),
    ParseError,
  > ! OutOfMemoryError ? &mut Allocator
```

Resolves into reusable byte storage with strict RFC 3986 section 5.2 semantics.

#### Details
Replaces output after reserving sufficient capacity. A single backing buffer holds the selected
components and the path is compacted directly in it. Existing sufficient capacity allocates
nothing. Allocation failure leaves the destination unchanged. Success returns unit; parse
its ASCII byte view with [`parse`](#Uri.impl.parse) to obtain a borrowed URI without allocating.

#### Gotchas
Output cannot overlap the borrowed inputs. Dot removal may expose `//` as authority syntax;
invalid recomposition returns a syntax error and leaves the attempted serialization in output.

::Anchor{id="Uri.impl.resolveOwned"}

### Associated function `resolveOwned`

```silk
pub effect fn resolveOwned(base: &Uri, reference: &UriReference) -> Result<OwnedUri, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Resolves with one owned backing allocation and adopts the completed serialization without copying.

#### Details
Reserves a calculated upper bound once. The final allocation may have spare capacity after
dot removal. Use [`resolveInto`](#Uri.impl.resolveInto) when the caller already has reusable storage.
Recomposition validation and its syntax-failure behavior are the same as `resolveInto`.

::Anchor{id="OwnedUri"}

## `OwnedUri`

```silk
pub struct OwnedUri
```

An immutable owned URI whose borrowed views cannot outlive its storage.

::Anchor{id="OwnedUri.impl"}

## Implementation `OwnedUri`

```silk
impl OwnedUri
```

::Anchor{id="OwnedUri.impl.fromString"}

### Associated function `fromString`

```silk
pub fn fromString(text: String) -> Result<OwnedUri, ParseError>
```

Validates and adopts existing owned text without allocation or copying.

#### Gotchas
Consumes the supplied String on success and failure. A scheme is required.

::Anchor{id="OwnedUri.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> Uri
```

Borrows a parsed URI directly from the stored ranges without reparsing or allocating.

::Anchor{id="OwnedUri.impl.intoString"}

### Method `intoString`

```silk
pub fn intoString(self: Self) -> String
```

Transfers the owned serialization out of this URI without copying or allocating.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
