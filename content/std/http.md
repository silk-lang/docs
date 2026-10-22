Validated, byte-preserving HTTP/1.x scalar values, fields, and message heads.

## When to use

Use these values to share HTTP semantics between parsers, clients, and servers. Parsing and
validation borrow caller storage; use the owned head copies when values must outlive that input.

## Details

Methods remain open case-sensitive tokens, fields retain exact octets, and statuses retain every
code from 100 through 599. This module applies no framing, transport, or connection policy.

## Gotchas

`Header.make` receives semantic field values after wire OWS has been removed. It rejects CR,
LF, NUL, DEL, other forbidden controls, and leading or trailing OWS.

## Examples
### Preserve protocol spelling
```silk
import silk.http { Method, Version }

pub fn main() -> i32 {
  let version = Version.Http11
  let method = Method.patch()
  if Version.format(&version) != "HTTP/1.1" { return 1 }
  if Method.format(&method) != "PATCH" { return 2 }
  return 42
}
```

Import as `Version` with `import silk.http { Version }`.

Public declarations: 13.

::Anchor{id="ValueComponent"}

## `ValueComponent`

```silk
pub enum ValueComponent
```

The component of an HTTP value that failed validation.

::Anchor{id="ValueComponent.Version"}

### `Version`

```silk
Version
```

An HTTP version token.

::Anchor{id="ValueComponent.Method"}

### `Method`

```silk
Method
```

A request method token.

::Anchor{id="ValueComponent.Status"}

### `Status`

```silk
Status
```

A numeric response status.

::Anchor{id="ValueComponent.HeaderName"}

### `HeaderName`

```silk
HeaderName
```

A field name.

::Anchor{id="ValueComponent.HeaderValue"}

### `HeaderValue`

```silk
HeaderValue
```

A field value.

::Anchor{id="ValueComponent.ReasonPhrase"}

### `ReasonPhrase`

```silk
ReasonPhrase
```

An optional response reason phrase.

::Anchor{id="ValueComponent.Headers"}

### `Headers`

```silk
Headers
```

An ordered field collection.

::Anchor{id="ValueComponent.Target"}

### `Target`

```silk
Target
```

A request target.

::Anchor{id="ValueComponent.Authority"}

### `Authority`

```silk
Authority
```

An HTTP authority.

::Anchor{id="ValueComponent.Host"}

### `Host`

```silk
Host
```

A Host field.

::Anchor{id="ValueComponent.Metadata"}

### `Metadata`

```silk
Metadata
```

A structured metadata field value.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The finite limit whose allowed count was exceeded.

::Anchor{id="LimitKind.MethodBytes"}

### `MethodBytes`

```silk
MethodBytes
```

Maximum method bytes.

::Anchor{id="LimitKind.TargetBytes"}

### `TargetBytes`

```silk
TargetBytes
```

Maximum request-target bytes.

::Anchor{id="LimitKind.NameBytes"}

### `NameBytes`

```silk
NameBytes
```

Maximum field-name bytes.

::Anchor{id="LimitKind.ValueBytes"}

### `ValueBytes`

```silk
ValueBytes
```

Maximum field-value or reason bytes.

::Anchor{id="LimitKind.Fields"}

### `Fields`

```silk
Fields
```

Maximum field count.

::Anchor{id="LimitKind.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

Maximum aggregate name-plus-value bytes.

::Anchor{id="LimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

Maximum owned payload and index bytes.

::Anchor{id="LimitKind.UniqueField"}

### `UniqueField`

```silk
UniqueField
```

At most one matching field was required.

::Anchor{id="ValueReason"}

## `ValueReason`

```silk
pub union ValueReason
```

A closed semantic HTTP value failure reason.

::Anchor{id="ValueReason.InvalidToken"}

### `InvalidToken`

```silk
InvalidToken
```

A token is empty or contains a byte outside `tchar`.

::Anchor{id="ValueReason.InvalidValueByte"}

### `InvalidValueByte`

```silk
InvalidValueByte
```

A value contains a forbidden byte.

::Anchor{id="ValueReason.UnsupportedVersion"}

### `UnsupportedVersion`

```silk
UnsupportedVersion
```

A version is not HTTP/1.0 or HTTP/1.1.

::Anchor{id="ValueReason.InvalidStatus"}

### `InvalidStatus`

```silk
InvalidStatus
```

A response code is outside 100 through 599.

::Anchor{id="ValueReason.InvalidTarget"}

### `InvalidTarget`

```silk
InvalidTarget
```

A request target has invalid syntax.

::Anchor{id="ValueReason.InvalidAuthority"}

### `InvalidAuthority`

```silk
InvalidAuthority
```

An HTTP authority has invalid syntax.

::Anchor{id="ValueReason.InvalidPort"}

### `InvalidPort`

```silk
InvalidPort
```

A port is absent, empty, nonnumeric, or outside its accepted range.

::Anchor{id="ValueReason.MethodTargetMismatch"}

### `MethodTargetMismatch`

```silk
MethodTargetMismatch
```

The request method cannot use the supplied target form.

::Anchor{id="ValueReason.MissingHost"}

### `MissingHost`

```silk
MissingHost
```

HTTP/1.1 has no Host field.

::Anchor{id="ValueReason.DuplicateHost"}

### `DuplicateHost`

```silk
DuplicateHost
```

More than one Host field is present.

::Anchor{id="ValueReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

One explicit finite limit was exceeded.

::Anchor{id="ValueReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: LimitKind
```

The rejected limit.

::Anchor{id="ValueReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The configured maximum.

::Anchor{id="ValueReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The attempted count.

::Anchor{id="ValueReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked size arithmetic overflowed `usize`.

::Anchor{id="ValueReason.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

Caller-owned output cannot hold the complete serialization.

::Anchor{id="ValueReason.OutputTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

Complete required output bytes.

::Anchor{id="ValueReason.OutputTooSmall.available"}

#### Field `available`

```silk
pub available: usize
```

Available caller output bytes.

::Anchor{id="ValueReason.impl.Copy"}

## Implementation `Copy for ValueReason`

```silk
impl Copy for ValueReason
```

::Anchor{id="ValueError"}

## `ValueError`

```silk
pub struct ValueError
```

A semantic HTTP value failure with source location information.

::Anchor{id="ValueError.reason"}

### Field `reason`

```silk
pub reason: ValueReason
```

The recovery-oriented failure category.

::Anchor{id="ValueError.component"}

### Field `component`

```silk
pub component: ValueComponent
```

The value component being validated.

::Anchor{id="ValueError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

The source field ordinal when the error came from a collection.

::Anchor{id="ValueError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The zero-based component byte offset.

::Anchor{id="Version"}

## `Version`

```silk
pub enum Version
```

One supported HTTP protocol version.

::Anchor{id="Version.Http10"}

### `Http10`

```silk
Http10
```

HTTP/1.0.

::Anchor{id="Version.Http11"}

### `Http11`

```silk
Http11
```

HTTP/1.1.

::Anchor{id="Version.impl"}

## Implementation `Version`

```silk
impl Version
```

::Anchor{id="Version.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Result<Version, ValueError>
```

Parses exactly `HTTP/1.0` or `HTTP/1.1`.

::Anchor{id="Version.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'static>
```

Formats one supported version as its exact protocol token.

::Anchor{id="Method"}

## `Method`

```silk
pub struct Method<'text>
```

A borrowed open HTTP method token with preserved spelling.

::Anchor{id="Method.impl.Copy"}

## Implementation `Copy for Method<'text>`

```silk
impl<'text> Copy for Method<'text>
```

::Anchor{id="Method.impl"}

## Implementation `Method<'text>`

```silk
impl<'text> Method<'text>
```

::Anchor{id="Method.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string<'text>, maxBytes: usize) -> Result<Method<'text>, ValueError>
```

Validates a nonempty `tchar` token within `maxBytes` and borrows it unchanged.

::Anchor{id="Method.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Borrows the original method spelling.

::Anchor{id="Method.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Method) -> bool
```

Compares method spelling case-sensitively.

::Anchor{id="Method.impl.get"}

### Associated function `get`

```silk
pub fn get() -> Method<'static>
```

Returns the standard GET method value.

::Anchor{id="Method.impl.head"}

### Associated function `head`

```silk
pub fn head() -> Method<'static>
```

Returns the standard HEAD method value.

::Anchor{id="Method.impl.post"}

### Associated function `post`

```silk
pub fn post() -> Method<'static>
```

Returns the standard POST method value.

::Anchor{id="Method.impl.put"}

### Associated function `put`

```silk
pub fn put() -> Method<'static>
```

Returns the standard PUT method value.

::Anchor{id="Method.impl.delete"}

### Associated function `delete`

```silk
pub fn delete() -> Method<'static>
```

Returns the standard DELETE method value.

::Anchor{id="Method.impl.connect"}

### Associated function `connect`

```silk
pub fn connect() -> Method<'static>
```

Returns the standard CONNECT method value.

::Anchor{id="Method.impl.options"}

### Associated function `options`

```silk
pub fn options() -> Method<'static>
```

Returns the standard OPTIONS method value.

::Anchor{id="Method.impl.trace"}

### Associated function `trace`

```silk
pub fn trace() -> Method<'static>
```

Returns the standard TRACE method value.

::Anchor{id="Method.impl.patch"}

### Associated function `patch`

```silk
pub fn patch() -> Method<'static>
```

Returns the standard PATCH method value.

::Anchor{id="StatusClass"}

## `StatusClass`

```silk
pub enum StatusClass
```

The protocol class of a response status.

::Anchor{id="StatusClass.Informational"}

### `Informational`

```silk
Informational
```

1xx informational.

::Anchor{id="StatusClass.Successful"}

### `Successful`

```silk
Successful
```

2xx successful.

::Anchor{id="StatusClass.Redirection"}

### `Redirection`

```silk
Redirection
```

3xx redirection.

::Anchor{id="StatusClass.ClientError"}

### `ClientError`

```silk
ClientError
```

4xx client error.

::Anchor{id="StatusClass.ServerError"}

### `ServerError`

```silk
ServerError
```

5xx server error.

::Anchor{id="Status"}

## `Status`

```silk
pub struct Status
```

A response status retaining registered and unregistered valid codes.

::Anchor{id="Status.impl.Copy"}

## Implementation `Copy for Status`

```silk
impl Copy for Status
```

::Anchor{id="Status.impl"}

## Implementation `Status`

```silk
impl Status
```

::Anchor{id="Status.impl.fromCode"}

### Associated function `fromCode`

```silk
pub fn fromCode(code: u16) -> Result<Status, ValueError>
```

Constructs a status from any code in the inclusive 100 through 599 range.

::Anchor{id="Status.impl.code"}

### Method `code`

```silk
pub fn code(self: &Self) -> u16
```

Returns the preserved numeric status code.

::Anchor{id="Status.impl.class"}

### Method `class`

```silk
pub fn class(self: &Self) -> StatusClass
```

Returns the status class derived from the hundreds digit.

::Anchor{id="Header"}

## `Header`

```silk
pub struct Header<'value>
```

A validated header field borrowing its exact name spelling and raw value octets.

::Anchor{id="Header.impl.Copy"}

## Implementation `Copy for Header<'value>`

```silk
impl<'value> Copy for Header<'value>
```

::Anchor{id="Header.impl"}

## Implementation `Header<'value>`

```silk
impl<'value> Header<'value>
```

::Anchor{id="Header.impl.make"}

### Associated function `make`

```silk
pub fn make(
    name: string<'value>,
    value: &'value [u8],
    limits: Limits,
  ) -> Result<Header<'value>, ValueError>
```

Validates one semantic field after wire OWS removal and borrows it unchanged.

::Anchor{id="Header.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> string<'value>
```

Borrows the original field-name spelling.

::Anchor{id="Header.impl.value-2"}

### Method `value`

```silk
pub fn value(self: &Self) -> &'value [u8]
```

Borrows the exact validated field-value octets.

::Anchor{id="RequestHead"}

## `RequestHead`

```silk
pub struct RequestHead<'value>
```

A validated request head without body, framing, connection, or exchange state.

::Anchor{id="RequestHead.impl.Copy"}

## Implementation `Copy for RequestHead<'value>`

```silk
impl<'value> Copy for RequestHead<'value>
```

::Anchor{id="RequestHead.impl"}

## Implementation `RequestHead<'value>`

```silk
impl<'value> RequestHead<'value>
```

::Anchor{id="RequestHead.impl.make"}

### Associated function `make`

```silk
pub fn make(
    version: Version,
    method: Method<'value>,
    target: RequestTarget<'value>,
    headers: Headers<'value>,
  ) -> Result<RequestHead<'value>, ValueError>
```

Combines validated request components and enforces the HTTP/1.1 Host requirement.

::Anchor{id="RequestHead.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the request version.

::Anchor{id="RequestHead.impl.method"}

### Method `method`

```silk
pub fn method(self: &Self) -> Method<'value>
```

Returns the borrowed request method.

::Anchor{id="RequestHead.impl.target"}

### Method `target`

```silk
pub fn target(self: &Self) -> RequestTarget<'value>
```

Returns the borrowed request target.

::Anchor{id="RequestHead.impl.headers"}

### Method `headers`

```silk
pub fn headers(self: &Self) -> Headers<'value>
```

Returns the borrowed ordered fields.

::Anchor{id="RequestHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: Limits,
  ) -> Result<OwnedRequestHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the complete request head into independent bounded storage.

::Anchor{id="OwnedRequestHead"}

## `OwnedRequestHead`

```silk
pub struct OwnedRequestHead
```

An independently owned request head whose views borrow only this value.

::Anchor{id="OwnedRequestHead.impl"}

## Implementation `OwnedRequestHead`

```silk
impl OwnedRequestHead
```

::Anchor{id="OwnedRequestHead.impl.view"}

### Method `view`

```silk
pub fn view<'value>(self: &'value Self) -> RequestHead<'value>
```

Reconstructs a validated request view tied to this owner without allocation.

::Anchor{id="ResponseHead"}

## `ResponseHead`

```silk
pub struct ResponseHead<'value>
```

A validated response head without body, framing, connection, or exchange state.

::Anchor{id="ResponseHead.impl"}

## Implementation `ResponseHead<'value>`

```silk
impl<'value> ResponseHead<'value>
```

::Anchor{id="ResponseHead.impl.make"}

### Associated function `make`

```silk
pub fn make(
    version: Version,
    status: Status,
    reason: Option<&'value [u8]>,
    headers: Headers<'value>,
    limits: Limits,
  ) -> Result<ResponseHead<'value>, ValueError>
```

Validates an optional reason phrase and combines response metadata.

::Anchor{id="ResponseHead.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> Version
```

Returns the response version.

::Anchor{id="ResponseHead.impl.status"}

### Method `status`

```silk
pub fn status(self: &Self) -> Status
```

Returns the response status.

::Anchor{id="ResponseHead.impl.reason"}

### Method `reason`

```silk
pub fn reason(self: &Self) -> Option<&'value [u8]>
```

Returns the exact optional reason-phrase bytes.

::Anchor{id="ResponseHead.impl.headers"}

### Method `headers`

```silk
pub fn headers(self: &Self) -> Headers<'value>
```

Returns the borrowed ordered fields.

::Anchor{id="ResponseHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: Limits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the complete response head into independent bounded storage.

::Anchor{id="ResponseHead.impl.copyMatchingHeaders"}

### Method `copyMatchingHeaders`

```silk
pub effect fn copyMatchingHeaders(
    self: &Self,
    name: string<'value>,
    limits: Limits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the response status, reason, and only matching fields into independent storage.

#### Details

Matching is ASCII case-insensitive. Duplicate matches remain distinct and preserve wire order.
The total-owned limit covers copied reason bytes, field payload, and field records.

::Anchor{id="OwnedResponseHead"}

## `OwnedResponseHead`

```silk
pub struct OwnedResponseHead
```

An independently owned response head whose views borrow only this value.

::Anchor{id="OwnedResponseHead.impl"}

## Implementation `OwnedResponseHead`

```silk
impl OwnedResponseHead
```

::Anchor{id="OwnedResponseHead.impl.view"}

### Method `view`

```silk
pub fn view<'value>(self: &'value Self) -> ResponseHead<'value>
```

Reconstructs a validated response view tied to this owner without allocation.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
