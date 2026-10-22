Mutable URI components with explicit raw-byte encoding and selective serialization.

## When to use

Use [`UriComponents`](#UriComponents) to construct a reference or modify components borrowed from an existing one.
Use `silk.uri_reference.UriReference.parse` to inspect complete serialized input.

## Details

Raw component bytes are percent encoded. Encoded component text retains its escape spelling.
Serialization validates component boundaries before changing output. Owned construction adopts
the completed serialization without another copy.

Import as `UriComponents` with `import silk.uri_components { UriComponents }`.

Public declarations: 5.

::Anchor{id="ComponentValue"}

## `ComponentValue`

```silk
pub union ComponentValue<'text>
```

Component data that explicitly selects raw-byte encoding or existing encoded text.

::Anchor{id="ComponentValue.Raw"}

### `Raw`

```silk
Raw
```

Raw bytes that are encoded according to the selected URI component grammar.

::Anchor{id="ComponentValue.Raw.bytes"}

#### Field `bytes`

```silk
pub bytes: &'text [u8]
```

The bytes to encode; percent signs are data and are escaped again.

::Anchor{id="ComponentValue.Encoded"}

### `Encoded`

```silk
Encoded
```

Already encoded text whose valid percent escapes retain their original spelling.

::Anchor{id="ComponentValue.Encoded.text"}

#### Field `text`

```silk
pub text: string<'text>
```

The text to validate before serialization; delimiters for other components are rejected.

::Anchor{id="Host"}

## `Host`

```silk
pub union Host<'text>
```

An authority host with an explicit distinction between names and bracketed IP literals.

::Anchor{id="Host.RegName"}

### `RegName`

```silk
RegName
```

A registered name or dotted decimal host; raw bytes use registered-name encoding.

::Anchor{id="Host.RegName.value"}

#### Field `value`

```silk
pub value: ComponentValue<'text>
```

The raw or encoded host name, including an empty name.

::Anchor{id="Host.IpLiteral"}

### `IpLiteral`

```silk
IpLiteral
```

A bracketed IPv6 or IPvFuture literal that must already satisfy the host grammar.

::Anchor{id="Host.IpLiteral.text"}

#### Field `text`

```silk
pub text: string<'text>
```

The complete literal, including its opening and closing brackets.

::Anchor{id="Authority"}

## `Authority`

```silk
pub struct Authority<'text>
```

Structured authority data with unsplit user information and a lexical decimal port.

::Anchor{id="Authority.userinfo"}

### Field `userinfo`

```silk
pub userinfo: Option<ComponentValue<'text>>
```

Optional user information; a present empty value emits an at sign.

::Anchor{id="Authority.host"}

### Field `host`

```silk
pub host: Host<'text>
```

The registered name or bracketed IP literal.

::Anchor{id="Authority.port"}

### Field `port`

```silk
pub port: Option<string<'text>>
```

Optional decimal text; a present empty value emits a colon without digits.

::Anchor{id="Serialization"}

## `Serialization`

```silk
pub enum Serialization
```

The components to include in a serialization.

::Anchor{id="Serialization.Full"}

### `Full`

```silk
Full
```

Every component, preserving present empty delimiters.

::Anchor{id="Serialization.WithoutAuthentication"}

### `WithoutAuthentication`

```silk
WithoutAuthentication
```

Every component except user information and its at sign.

::Anchor{id="Serialization.PathAndQuery"}

### `PathAndQuery`

```silk
PathAndQuery
```

Only the path and optional query, without scheme, authority, or fragment.

::Anchor{id="UriComponents"}

## `UriComponents`

```silk
pub struct UriComponents<'text>
```

Mutable URI-reference components borrowing their raw bytes or encoded text.

### Details

Modify public fields to construct another reference. No component owns its input storage.
An absent component differs from a present empty component. The path is always present.

::Anchor{id="UriComponents.scheme"}

### Field `scheme`

```silk
pub scheme: Option<string<'text>>
```

An optional scheme without its colon.

::Anchor{id="UriComponents.authority"}

### Field `authority`

```silk
pub authority: Option<Authority<'text>>
```

An optional structured authority without its two slashes.

::Anchor{id="UriComponents.path"}

### Field `path`

```silk
pub path: ComponentValue<'text>
```

The complete raw or encoded path, including any separating slashes.

::Anchor{id="UriComponents.query"}

### Field `query`

```silk
pub query: Option<ComponentValue<'text>>
```

An optional raw or encoded query without its question mark.

::Anchor{id="UriComponents.fragment"}

### Field `fragment`

```silk
pub fragment: Option<ComponentValue<'text>>
```

An optional raw or encoded fragment without its number sign.

::Anchor{id="UriComponents.impl"}

## Implementation `UriComponents<'text>`

```silk
impl<'text> UriComponents<'text>
```

::Anchor{id="UriComponents.impl.make"}

### Associated function `make`

```silk
pub fn make() -> UriComponents<'text>
```

Creates an empty relative reference without allocating.

::Anchor{id="UriComponents.impl.fromReference"}

### Associated function `fromReference`

```silk
pub fn fromReference(reference: &UriReference<'text>) -> UriComponents<'text>
```

Borrows every parsed component as encoded text for inspection or modification without allocating.

#### Details

Serialization with `Full` preserves the original text when no fields have changed.

::Anchor{id="UriComponents.impl.serializeInto"}

### Associated function `serializeInto`

```silk
pub effect fn serializeInto(output: &mut Bytes, self: &Self, selection: Serialization) -> Result<
    (),
    ParseError,
  > ! OutOfMemoryError ? &mut Allocator
```

Replaces reusable output with validated selected components.

#### Details

Component errors report offsets within the supplied component and leave output unchanged.
Size overflow and allocation failure also leave output unchanged. Existing sufficient capacity is reused.
Full output is reparsed without allocation; any recomposition error reports an output offset.
Raw first-relative-segment colons are escaped so they cannot introduce a scheme.

#### Gotchas

A recomposition error leaves the attempted serialization in output. `PathAndQuery` can produce
text that is not a complete URI reference. Omitted components are still validated.

::Anchor{id="UriComponents.impl.serializeOwned"}

### Method `serializeOwned`

```silk
pub effect fn serializeOwned(self: &Self, selection: Serialization) -> Result<String, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Serializes selected components into independent text with one exact allocation for nonempty output.

#### Details

Validation errors return ordinary result data. Allocation and size overflow use `OutOfMemoryError`.

::Anchor{id="UriComponents.impl.buildOwned"}

### Method `buildOwned`

```silk
pub effect fn buildOwned(self: &Self) -> Result<OwnedUriReference, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Builds an owned URI reference from every component without copying the completed output.

#### Details

Nonempty output uses one exact allocation. The completed String is validated and adopted.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
