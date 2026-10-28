Build a URI reference from its components, or change the components of a parsed one.

## When to use
Use [`UriComponents`](#UriComponents) to make a URL from parts, such as a host from a configuration file and a
path from user input, or to change one part of a parsed URL. Give each part as raw bytes, which
are encoded for you, or as text that is already encoded. To only read a URL, use
`silk.uri.reference`.

## Details
[`UriComponents.make`](#UriComponents.impl.make) returns an empty relative reference, and [`UriComponents.fromReference`](#UriComponents.impl.fromReference)
borrows each part of a parsed reference. Change the public fields, and then call
[`UriComponents.serializeOwned`](#UriComponents.impl.serializeOwned), [`UriComponents.serializeInto`](#UriComponents.impl.serializeInto), or
[`UriComponents.buildOwned`](#UriComponents.impl.buildOwned). Raw values are percent-encoded for their component with
`silk.uri.percent`. Encoded values keep their escape spelling. Each part is checked before
anything is written, and the result is parsed again to make sure that it is a valid reference.

## Errors
- `ParseError` if a part is not valid. The offset is a position in that part, or a position in
  the output if the parts do not make a valid reference together.
- `OutOfMemoryError` from the functions that allocate.

## Examples
### Build a URL with encoded parts
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.option { Option }
import silk.core.result { Result }
import silk.text.string { String }
import silk.uri.components { Authority, ComponentValue, Host, Serialization, UriComponents }
import silk.uri.reference { ParseError }

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut parts = UriComponents<'static>.make()
  parts.scheme = Option<string<'static>>.some("https")
  parts.authority = Option<Authority<'static>>.some(
    Authority<'static> {
      userinfo: Option<ComponentValue<'static>>.none(),
      host: Host<'static>.RegName {
        value: ComponentValue<'static>.Encoded { text: "example.com" }
      },
      port: Option<string<'static>>.none()
    }
  )
  parts.path = ComponentValue<'static>.Raw { bytes: b"/my files" }
  parts.query = Option<ComponentValue<'static>>.some(
    ComponentValue<'static>.Raw { bytes: b"q=tea time" }
  )
  let built = run UriComponents.serializeOwned(&parts, Serialization.Full)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move built {
    Result<String, ParseError>.Success { value } => {
      if String.view(&value) != "https://example.com/my%20files?q=tea%20time" {
        return 1
      }
      return 0
    }
    Result<String, ParseError>.Failure { error: _ } => 1
  }
}
```

Import as `UriComponents` with `import silk.uri.components { UriComponents }`.

Public declarations: 5.

::Anchor{id="ComponentValue"}

## `ComponentValue`

```silk
pub union ComponentValue<'text>
```

The value of a component: raw bytes to encode, or text that is already encoded.

::Anchor{id="ComponentValue.Raw"}

### `Raw`

```silk
Raw
```

Raw bytes. Each byte that the component does not allow is percent-encoded.

::Anchor{id="ComponentValue.Raw.bytes"}

#### Field `bytes`

```silk
pub bytes: &'text [u8]
```

The bytes to encode. A `%` is data, so it becomes `%25`.

::Anchor{id="ComponentValue.Encoded"}

### `Encoded`

```silk
Encoded
```

Text that is already encoded. It is checked, and its escapes are written as they are.

::Anchor{id="ComponentValue.Encoded.text"}

#### Field `text`

```silk
pub text: string<'text>
```

The encoded text. It must not contain the delimiters of other components, such as `?` in a
path.

::Anchor{id="Host"}

## `Host`

```silk
pub union Host<'text>
```

The host of an authority: a name or an IP literal.

::Anchor{id="Host.RegName"}

### `RegName`

```silk
RegName
```

A registered name or an IPv4 address. A raw value is encoded with `RegName` rules.

::Anchor{id="Host.RegName.value"}

#### Field `value`

```silk
pub value: ComponentValue<'text>
```

The host name. It can be empty.

::Anchor{id="Host.IpLiteral"}

### `IpLiteral`

```silk
IpLiteral
```

An IPv6 or IPvFuture literal. It must be valid host syntax.

::Anchor{id="Host.IpLiteral.text"}

#### Field `text`

```silk
pub text: string<'text>
```

The literal with its brackets, such as `[2001:db8::1]`.

::Anchor{id="Authority"}

## `Authority`

```silk
pub struct Authority<'text>
```

The authority of a URI: optional user information, a host, and an optional port.

::Anchor{id="Authority.userinfo"}

### Field `userinfo`

```silk
pub userinfo: Option<ComponentValue<'text>>
```

The user information, or `None`. A present empty value writes `@` with nothing before it.

::Anchor{id="Authority.host"}

### Field `host`

```silk
pub host: Host<'text>
```

The host.

::Anchor{id="Authority.port"}

### Field `port`

```silk
pub port: Option<string<'text>>
```

The port as decimal digits, or `None`. A present empty value writes `:` with no digits.

::Anchor{id="Serialization"}

## `Serialization`

```silk
pub enum Serialization
```

The components that a serialization writes.

::Anchor{id="Serialization.Full"}

### `Full`

```silk
Full
```

All components. Present empty components keep their delimiters.

::Anchor{id="Serialization.WithoutAuthentication"}

### `WithoutAuthentication`

```silk
WithoutAuthentication
```

All components except the user information and its `@`. Use it to log or show a URL without
its credentials.

::Anchor{id="Serialization.PathAndQuery"}

### `PathAndQuery`

```silk
PathAndQuery
```

Only the path and the query, such as the target of an HTTP request line.

::Anchor{id="UriComponents"}

## `UriComponents`

```silk
pub struct UriComponents<'text>
```

The components of a URI reference, as fields that you can change.

The fields borrow their bytes or text. An absent component (`None`) and a present empty
component are different. The path is always present, but it can be empty.

::Anchor{id="UriComponents.scheme"}

### Field `scheme`

```silk
pub scheme: Option<string<'text>>
```

The scheme without the `:`, or `None` for a relative reference.

::Anchor{id="UriComponents.authority"}

### Field `authority`

```silk
pub authority: Option<Authority<'text>>
```

The authority without the `//`, or `None`.

::Anchor{id="UriComponents.path"}

### Field `path`

```silk
pub path: ComponentValue<'text>
```

The full path, with its `/` separators. A raw path keeps `/` and encodes `?` and `#`.

::Anchor{id="UriComponents.query"}

### Field `query`

```silk
pub query: Option<ComponentValue<'text>>
```

The query without the `?`, or `None`.

::Anchor{id="UriComponents.fragment"}

### Field `fragment`

```silk
pub fragment: Option<ComponentValue<'text>>
```

The fragment without the `#`, or `None`.

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

Returns an empty relative reference: no scheme, no authority, an empty path, no query, and no
fragment.

::Anchor{id="UriComponents.impl.fromReference"}

### Associated function `fromReference`

```silk
pub fn fromReference(reference: &UriReference<'text>) -> UriComponents<'text>
```

Returns the components of `reference` as encoded values that borrow from it.

If you change nothing, `Full` serialization gives the original text again.

::Anchor{id="UriComponents.impl.serializeInto"}

### Associated function `serializeInto`

```silk
pub effect fn serializeInto(output: &mut Bytes, self: &Self, selection: Serialization) -> Result<
    (),
    ParseError,
  > ! OutOfMemoryError ? &mut Allocator
```

Replaces the contents of `output` with the components that `selection` names.

In a reference without a scheme, a `:` in the first segment of a raw path is encoded, so the
segment cannot look like a scheme. If `output` has enough capacity, it does not allocate.

#### Errors
- `Failure` with a `ParseError` if a component is not valid. The offset is a position in that
  component, and `output` does not change. The components that `selection` leaves out are also
  checked.
- `Failure` with a `ParseError` if the result is not a valid reference. The offset is a
  position in `output`, which holds the text that failed.
- `OutOfMemoryError` if the `Allocator` fails or the size does not fit in `usize`. `output`
  does not change.

#### Gotchas
`PathAndQuery` can give text that is not a complete URI reference.

::Anchor{id="UriComponents.impl.serializeOwned"}

### Method `serializeOwned`

```silk
pub effect fn serializeOwned(self: &Self, selection: Serialization) -> Result<String, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Returns the components that `selection` names as a new string.

It allocates exactly the needed size, and nothing for an empty result.

#### Errors
- `Failure` with a `ParseError` if a component is not valid, or the result is not a valid
  reference.
- `OutOfMemoryError` if the `Allocator` fails or the size does not fit in `usize`.

::Anchor{id="UriComponents.impl.buildOwned"}

### Method `buildOwned`

```silk
pub effect fn buildOwned(self: &Self) -> Result<OwnedUriReference, ParseError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Returns all components as a new `OwnedUriReference`. The text is not copied again.

#### Errors
- `Failure` with a `ParseError` if a component is not valid, or the result is not a valid
  reference.
- `OutOfMemoryError` if the `Allocator` fails.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
