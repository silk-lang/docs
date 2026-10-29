HTTP/1.0 and HTTP/1.1 values: versions, methods, statuses, header fields, and message heads.

## When to use
Use these types to make or inspect an HTTP message head. `silk.http.head` parses and writes
them, and the client and server modules take them. Each `make` and `parse` function checks the
value. The values borrow their text. Call `copy` on a head to keep it after its input is gone.

## Details
A [`Method`](#Method) is any valid token, and keeps its spelling, so `get` and `GET` are different. A
[`Status`](#Status) is any code from 100 to 599. A [`Header`](#Header) keeps the exact bytes of its name and
value. [`RequestHead.make`](#RequestHead.impl.make) checks that the target form fits the method, and that an HTTP/1.1
request has one `Host` field. This module does not read or write bodies.

## Errors
- [`ValueError`](#ValueError) tells which rule failed in [`ValueError.reason`](#ValueError.reason), in which part in
  [`ValueError.component`](#ValueError.component), and where, in [`ValueError.fieldIndex`](#ValueError.fieldIndex) and [`ValueError.offset`](#ValueError.offset).

## Gotchas
[`Header.make`](#Header.impl.make) takes the value without the spaces around it on the wire. It rejects CR, LF,
NUL, DEL, other control bytes, and leading or trailing spaces or tabs.

## Examples
### Make a response head
```silk
import silk.http.message { Header, ResponseHead, Status, StatusClass, ValueError, Version }
import silk.http.headers { Headers, Limits }
import silk.core.option { Option }
import silk.core.result { Result }

fn limits() -> Limits {
  return Limits {
    maxMethodBytes: 64,
    maxTargetBytes: 8192,
    maxNameBytes: 256,
    maxValueBytes: 8192,
    maxFields: 128,
    maxFieldBytes: 65536,
    maxOwnedBytes: 131072,
  }
}

pub fn main() -> i32 {
  let status = match Status.fromCode(404) {
    Result<Status, ValueError>.Success { value } => value
    Result<Status, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  if Status.class(&status) != StatusClass.ClientError {
    return 1
  }
  let header = match Header.make("Content-Type", b"text/plain", limits()) {
    Result<Header, ValueError>.Success { value } => value
    Result<Header, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  let entries = [header]
  let headers = match Headers.make(&entries, limits()) {
    Result<Headers, ValueError>.Success { value } => value
    Result<Headers, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  let reason = b"Not Found"
  let head = match ResponseHead.make(
    Version.Http11,
    status,
    Option<&[u8]>.some(&reason),
    headers,
    limits(),
  ) {
    Result<ResponseHead, ValueError>.Success { value } => move value
    Result<ResponseHead, ValueError>.Failure { error: _ } => {
      return 1
    }
  }
  if Status.code(&ResponseHead.status(&head)) != 404 {
    return 1
  }

  // A value with a line break fails.
  let bad = match Header.make("X-Note", b"a\r\nb", limits()) {
    Result<Header, ValueError>.Success { value: _ } => false
    Result<Header, ValueError>.Failure { error } => error.offset == 1
  }
  if !bad {
    return 1
  }
  return 0
}
```

Import as `Version` with `import silk.http.message { Version }`.

Public declarations: 13.

::Anchor{id="ValueComponent"}

## `ValueComponent`

```silk
pub enum ValueComponent
```

The part of an HTTP value that failed a check. See [`ValueError.component`](#ValueError.component).

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

A list of header fields.

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

The `Host` field of a request.

::Anchor{id="ValueComponent.Metadata"}

### `Metadata`

```silk
Metadata
```

A list in a field such as `Connection`, `Content-Encoding`, or `Transfer-Encoding`.

::Anchor{id="ValueComponent.impl.Debug"}

## Implementation `Debug for ValueComponent`

```silk
impl Debug for ValueComponent
```

::Anchor{id="ValueComponent.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Version`.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The limit in [`Limits`](/docs/std/http-headers#Limits) that a value exceeded. See [`ValueReason.LimitExceeded`](#ValueReason.LimitExceeded).

::Anchor{id="LimitKind.MethodBytes"}

### `MethodBytes`

```silk
MethodBytes
```

`maxMethodBytes`: the length of a method.

::Anchor{id="LimitKind.TargetBytes"}

### `TargetBytes`

```silk
TargetBytes
```

`maxTargetBytes`: the length of a request target.

::Anchor{id="LimitKind.NameBytes"}

### `NameBytes`

```silk
NameBytes
```

`maxNameBytes`: the length of a field name.

::Anchor{id="LimitKind.ValueBytes"}

### `ValueBytes`

```silk
ValueBytes
```

`maxValueBytes`: the length of a field value or a reason phrase.

::Anchor{id="LimitKind.Fields"}

### `Fields`

```silk
Fields
```

`maxFields`: the number of fields.

::Anchor{id="LimitKind.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

`maxFieldBytes`: the total length of all names and values.

::Anchor{id="LimitKind.OwnedBytes"}

### `OwnedBytes`

```silk
OwnedBytes
```

`maxOwnedBytes`: the memory for a copy.

::Anchor{id="LimitKind.UniqueField"}

### `UniqueField`

```silk
UniqueField
```

A field must occur at most one time, but it occurred more times.

::Anchor{id="LimitKind.impl.Debug"}

## Implementation `Debug for LimitKind`

```silk
impl Debug for LimitKind
```

::Anchor{id="LimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `MethodBytes`.

::Anchor{id="ValueReason"}

## `ValueReason`

```silk
pub union ValueReason
```

The rule that failed. See [`ValueError.reason`](#ValueError.reason).

::Anchor{id="ValueReason.InvalidToken"}

### `InvalidToken`

```silk
InvalidToken
```

A token, such as a method or a field name, is empty or has a byte that is not allowed in a
token.

::Anchor{id="ValueReason.InvalidValueByte"}

### `InvalidValueByte`

```silk
InvalidValueByte
```

A value has a byte that is not allowed, such as CR, LF, or NUL.

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

The target form does not fit the method. For example, `CONNECT` needs `host:port`, and only
`OPTIONS` can use `*`.

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

A value exceeded a limit in [`Limits`](/docs/std/http-headers#Limits).

::Anchor{id="ValueReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: LimitKind
```

The limit that was exceeded.

::Anchor{id="ValueReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: usize
```

The value of the limit.

::Anchor{id="ValueReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: usize
```

The size that was found.

::Anchor{id="ValueReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A size calculation overflowed `usize`.

::Anchor{id="ValueReason.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer is too small. Nothing was written.

::Anchor{id="ValueReason.OutputTooSmall.required"}

#### Field `required`

```silk
pub required: usize
```

The number of bytes that the output needs.

::Anchor{id="ValueReason.OutputTooSmall.available"}

#### Field `available`

```silk
pub available: usize
```

The length of the buffer that you gave.

::Anchor{id="ValueReason.impl.Copy"}

## Implementation `Copy for ValueReason`

```silk
impl Copy for ValueReason
```

::Anchor{id="ValueReason.impl.Debug"}

## Implementation `Debug for ValueReason`

```silk
impl Debug for ValueReason
```

::Anchor{id="ValueReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `InvalidToken`.

::Anchor{id="ValueError"}

## `ValueError`

```silk
pub struct ValueError
```

The error from checking an HTTP value. It tells which rule failed, and where.

### Details

`reason` gives the rule, `component` the part of the value, and `fieldIndex` and `offset` the
position.

::Anchor{id="ValueError.reason"}

### Field `reason`

```silk
pub reason: ValueReason
```

The rule that failed.

::Anchor{id="ValueError.component"}

### Field `component`

```silk
pub component: ValueComponent
```

The part that failed.

::Anchor{id="ValueError.fieldIndex"}

### Field `fieldIndex`

```silk
pub fieldIndex: Option<usize>
```

The position of the field in its list, from 0, when the error is in a field.

::Anchor{id="ValueError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset in the part where the rule failed.

::Anchor{id="ValueError.impl.Debug"}

## Implementation `Debug for ValueError`

```silk
impl Debug for ValueError
```

::Anchor{id="ValueError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `ValueError { reason: ..., component: ..., ... }`.

::Anchor{id="Version"}

## `Version`

```silk
pub enum Version
```

An HTTP version that this module supports.

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

::Anchor{id="Version.impl.Debug"}

## Implementation `Debug for Version`

```silk
impl Debug for Version
```

::Anchor{id="Version.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Http10`.

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

Returns `HTTP/1.0` or `HTTP/1.1`.

::Anchor{id="Method"}

## `Method`

```silk
pub struct Method<'text>
```

An HTTP method, such as `GET`. It keeps its exact spelling, and is compared with case.

### Details

Any valid token is a method, so `get` and `GET` are different methods. It borrows its text. The
`make` and `parse` functions check the token.

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

Checks that `text` is a token of at most `maxBytes` bytes, and returns it as a method.

::Anchor{id="Method.impl.format"}

### Method `format`

```silk
pub fn format(self: &Self) -> string<'text>
```

Returns the method text, spelled as given.

::Anchor{id="Method.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Method) -> bool
```

Returns `true` if the two methods have the same spelling. Case matters.

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

The class of a status code, from its first digit.

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

An HTTP status code from 100 to 599. Codes without a name, such as 299, are kept.

::Anchor{id="Status.impl.Copy"}

## Implementation `Copy for Status`

```silk
impl Copy for Status
```

::Anchor{id="Status.impl.Debug"}

## Implementation `Debug for Status`

```silk
impl Debug for Status
```

::Anchor{id="Status.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the code, as `Status { code: 404 }`.

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

Returns the status for `code`, or `InvalidStatus` if `code` is not from 100 to 599.

::Anchor{id="Status.impl.code"}

### Method `code`

```silk
pub fn code(self: &Self) -> u16
```

Returns the code, such as 404.

::Anchor{id="Status.impl.class"}

### Method `class`

```silk
pub fn class(self: &Self) -> StatusClass
```

Returns the class, from the first digit of the code.

::Anchor{id="Header"}

## `Header`

```silk
pub struct Header<'value>
```

An HTTP header field. It borrows its name and value, and keeps their exact bytes.

### Gotchas

[`Header.make`](#Header.impl.make) takes the value without the spaces around it on the wire. It rejects CR, LF,
NUL, DEL, other control bytes, and leading or trailing spaces or tabs.

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

Checks a field and returns it.

`name` must be a token. `value` is the value without the spaces around it on the wire.

#### Errors
- `InvalidToken` if `name` is not valid.
- `InvalidValueByte` if `value` has a control byte, or starts or ends with a space or a tab.
- `LimitExceeded` if `name` or `value` is too long for `limits`.

::Anchor{id="Header.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> string<'value>
```

Returns the field name, spelled as given.

::Anchor{id="Header.impl.value-2"}

### Method `value`

```silk
pub fn value(self: &Self) -> &'value [u8]
```

Returns the field value bytes.

::Anchor{id="RequestHead"}

## `RequestHead`

```silk
pub struct RequestHead<'value>
```

A checked request line and header fields, without a body. It borrows its parts.

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

Checks the parts of a request head and returns it.

#### Errors
- `MethodTargetMismatch` if the target form does not fit the method.
- `MissingHost` or `DuplicateHost` if an HTTP/1.1 request has no `Host` field, or more than
  one.

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

Returns the method.

::Anchor{id="RequestHead.impl.target"}

### Method `target`

```silk
pub fn target(self: &Self) -> RequestTarget<'value>
```

Returns the request target.

::Anchor{id="RequestHead.impl.headers"}

### Method `headers`

```silk
pub fn headers(self: &Self) -> Headers<'value>
```

Returns the header fields, in order.

::Anchor{id="RequestHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: Limits,
  ) -> Result<OwnedRequestHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the head into new memory, so that it does not borrow its input.

#### Errors
- `LimitExceeded` if the head exceeds `limits`. Nothing is allocated.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="OwnedRequestHead"}

## `OwnedRequestHead`

```silk
pub struct OwnedRequestHead
```

A request head that owns its memory. Get a [`RequestHead`](#RequestHead) from it with
[`OwnedRequestHead.view`](#OwnedRequestHead.impl.view).

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

Returns the head as a [`RequestHead`](#RequestHead) that borrows this value.

::Anchor{id="ResponseHead"}

## `ResponseHead`

```silk
pub struct ResponseHead<'value>
```

A checked status line and header fields, without a body. It borrows its parts.

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

Checks the parts of a response head and returns it.

`reason` is the optional text after the status code, such as `Not Found`.

#### Errors
- `InvalidValueByte` if `reason` has a control byte.
- `LimitExceeded` if `reason` is longer than `maxValueBytes`.

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

Returns the status.

::Anchor{id="ResponseHead.impl.reason"}

### Method `reason`

```silk
pub fn reason(self: &Self) -> Option<&'value [u8]>
```

Returns the reason phrase, if there is one.

::Anchor{id="ResponseHead.impl.headers"}

### Method `headers`

```silk
pub fn headers(self: &Self) -> Headers<'value>
```

Returns the header fields, in order.

::Anchor{id="ResponseHead.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: Limits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the head into new memory, so that it does not borrow its input.

#### Errors
- `LimitExceeded` if the head exceeds `limits`. Nothing is allocated.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="ResponseHead.impl.copyMatchingHeaders"}

### Method `copyMatchingHeaders`

```silk
pub effect fn copyMatchingHeaders(
    self: &Self,
    name: string<'value>,
    limits: Limits,
  ) -> Result<OwnedResponseHead, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies the status, the reason, and only the fields named `name`, into new memory.

#### Details
Names are compared without case. Repeated fields stay separate, in their order. `limits`
applies to the copied parts only.

::Anchor{id="OwnedResponseHead"}

## `OwnedResponseHead`

```silk
pub struct OwnedResponseHead
```

A response head that owns its memory. Get a [`ResponseHead`](#ResponseHead) from it with
[`OwnedResponseHead.view`](#OwnedResponseHead.impl.view).

::Anchor{id="OwnedResponseHead.impl.Debug"}

## Implementation `Debug for OwnedResponseHead`

```silk
impl Debug for OwnedResponseHead
```

::Anchor{id="OwnedResponseHead.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the version and the status, as `OwnedResponseHead { version: Http11, status: Status { code: 407 } }`. It leaves out the reason phrase and the headers.

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

Returns the head as a [`ResponseHead`](#ResponseHead) that borrows this value.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
