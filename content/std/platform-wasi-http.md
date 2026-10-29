Ownership and canonical ABI operations for WASI Preview 2 HTTP providers.

## When to use
Provider implementations use these operations to release HTTP resources and host-allocated
values on every exit path. Applications use `silk.http.client_wasi` and `silk.http.server_wasi`.

Import as `wasi_http` with `import silk.platform.wasi.http as wasi_http`.

Public declarations: 18.

::Anchor{id="ResourceKind"}

## `ResourceKind`

```silk
pub enum ResourceKind
```

The type of an owned WASI HTTP handle. Only unsafe constructors accept this tag.

::Anchor{id="ResourceKind.Fields"}

### `Fields`

```silk
Fields
```

::Anchor{id="ResourceKind.OutgoingRequest"}

### `OutgoingRequest`

```silk
OutgoingRequest
```

::Anchor{id="ResourceKind.IncomingRequest"}

### `IncomingRequest`

```silk
IncomingRequest
```

::Anchor{id="ResourceKind.IncomingResponse"}

### `IncomingResponse`

```silk
IncomingResponse
```

::Anchor{id="ResourceKind.OutgoingResponse"}

### `OutgoingResponse`

```silk
OutgoingResponse
```

::Anchor{id="ResourceKind.IncomingBody"}

### `IncomingBody`

```silk
IncomingBody
```

::Anchor{id="ResourceKind.OutgoingBody"}

### `OutgoingBody`

```silk
OutgoingBody
```

::Anchor{id="ResourceKind.FutureResponse"}

### `FutureResponse`

```silk
FutureResponse
```

::Anchor{id="ResourceKind.FutureTrailers"}

### `FutureTrailers`

```silk
FutureTrailers
```

::Anchor{id="ResourceKind.Options"}

### `Options`

```silk
Options
```

::Anchor{id="ResourceKind.ResponseOut"}

### `ResponseOut`

```silk
ResponseOut
```

::Anchor{id="Resource"}

## `Resource`

```silk
pub struct Resource
```

An HTTP resource owner used by provider implementations. Drop releases an untransferred handle.

::Anchor{id="Resource.impl"}

## Implementation `Resource`

```silk
impl Resource
```

::Anchor{id="Resource.impl.take"}

### Associated function `take`

```silk
pub unsafe fn take(handle: u32, kind: ResourceKind) -> Resource
```

Takes a live handle of `kind`. The caller surrenders its previous owner and keeps any parent
alive until this owner is dropped or transferred.

::Anchor{id="Resource.impl.handle"}

### Method `handle`

```silk
pub fn handle(self: &Self) -> u32
```

Borrows the owned handle. Calling this after transfer traps.

::Anchor{id="Resource.impl.release"}

### Method `release`

```silk
pub unsafe fn release(self: &mut Self) -> u32
```

Transfers the handle without dropping it. The caller must give it to an owning host argument
or another owner, and must first release all child resources.

::Anchor{id="Resource.impl.Drop"}

## Implementation `Drop for Resource`

```silk
impl Drop for Resource
```

::Anchor{id="Resource.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="bytesAddress"}

## `bytesAddress`

```silk
pub fn bytesAddress(bytes: &[u8]) -> u32
```

Returns the wasm32 address of a borrowed byte slice; the borrow must survive the host call.

::Anchor{id="textAddress"}

## `textAddress`

```silk
pub fn textAddress(text: string) -> u32
```

Returns the wasm32 address of borrowed UTF-8 text; the borrow must survive the host call.

::Anchor{id="copyBytes"}

## `copyBytes`

```silk
pub unsafe effect fn copyBytes(pointer: ?[*]const u8, length: u32) -> Bytes
    ! OutOfMemoryError ? &mut Allocator
```

Copies an initialized host-owned buffer without taking ownership of it.
The caller guarantees `length` readable bytes and keeps the allocation alive during the copy.

::Anchor{id="HttpResult"}

## `HttpResult`

```silk
pub extern "C" struct HttpResult
```

Storage for a canonical `result<resource, error-code>`. Drop frees an error's string payloads.

::Anchor{id="HttpResult.impl"}

## Implementation `HttpResult`

```silk
impl HttpResult
```

::Anchor{id="HttpResult.impl.make"}

### Associated function `make`

```silk
pub fn make() -> HttpResult
```

Initializes storage before passing its address to the host.

::Anchor{id="HttpResult.impl.handle"}

### Method `handle`

```silk
pub effect fn handle(self: &Self) -> u32 ! HttpError
```

Returns the handle on success, or an HTTP error retaining the WASI error ordinal.

::Anchor{id="HttpResult.impl.Drop"}

## Implementation `Drop for HttpResult`

```silk
impl Drop for HttpResult
```

::Anchor{id="HttpResult.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="FutureResult"}

## `FutureResult`

```silk
pub extern "C" struct FutureResult
```

Storage for the result of an HTTP future. Drop frees error payloads in a completed result.

::Anchor{id="FutureResult.impl"}

## Implementation `FutureResult`

```silk
impl FutureResult
```

::Anchor{id="FutureResult.impl.make"}

### Associated function `make`

```silk
pub fn make() -> FutureResult
```

Initializes future result storage before a host `get` call.

::Anchor{id="FutureResult.impl.ready"}

### Method `ready`

```silk
pub fn ready(self: &Self) -> bool
```

Whether the future produced a value. A false result may be polled again after readiness.

::Anchor{id="FutureResult.impl.response"}

### Method `response`

```silk
pub effect fn response(self: &Self) -> u32 ! HttpError
```

Returns a completed response handle or fails with its error. Call only when ready is true.

::Anchor{id="FutureResult.impl.trailers"}

### Method `trailers`

```silk
pub effect fn trailers(self: &Self) -> () ! HttpError
```

Checks a completed trailers result and releases its optional owned fields handle.

::Anchor{id="protocol"}

## `protocol`

```silk
pub fn protocol(message: string<'static>) -> HttpError
```

Makes a protocol failure for a malformed or unusable host result.

::Anchor{id="hostError"}

## `hostError`

```silk
pub fn hostError(code: u32) -> HttpError
```

Converts a WASI HTTP error ordinal, retaining it as the provider cause.

::Anchor{id="deadline"}

## `deadline`

```silk
pub fn deadline(value: &Option<Instant>) -> Option<Instant>
```

Copies an optional deadline without transferring the caller's option.

::Anchor{id="streamError"}

## `streamError`

```silk
pub fn streamError(error: StreamError) -> HttpError
```

Converts stream failures to HTTP failure kinds.

::Anchor{id="wait"}

## `wait`

```silk
pub unsafe effect fn wait(pollable: u32, until: &Option<Instant>) -> () ! HttpError ? &mut MonotonicClock
```

Waits on an owned pollable and releases it, failing if the supplied clock reaches the deadline.

::Anchor{id="readBody"}

## `readBody`

```silk
pub unsafe effect fn readBody(body: Resource, maximum: usize, until: &Option<Instant>) -> Bytes
    ! HttpError | OutOfMemoryError ? &mut Allocator | &mut MonotonicClock
```

Drains an owned incoming body, validates completion and trailers, and enforces `maximum` bytes.
The body must be an incoming-body handle with no existing stream child.

::Anchor{id="writeBody"}

## `writeBody`

```silk
pub unsafe effect fn writeBody(body: Resource, bytes: &[u8], until: &Option<Instant>) -> ()
    ! HttpError ? &mut MonotonicClock
```

Writes all bytes and finishes an owned outgoing body. The request or response must already
have been sent to the host so that it can consume bytes under backpressure.

::Anchor{id="Field"}

## `Field`

```silk
pub struct Field
```

One owned HTTP field, preserving its name and raw value bytes.

::Anchor{id="Field.name"}

### Field `name`

```silk
pub name: String
```

The UTF-8 field name.

::Anchor{id="Field.value"}

### Field `value`

```silk
pub value: Bytes
```

The field value bytes, which need not be UTF-8.

::Anchor{id="readFields"}

## `readFields`

```silk
pub unsafe effect fn readFields(handle: u32) -> List<Field> ! HttpError | OutOfMemoryError ? &mut Allocator
```

Copies a live fields resource into ordinary owned values, preserving repeated fields and order.
The caller keeps the fields resource and its parent alive until the operation returns.

::Anchor{id="appendField"}

## `appendField`

```silk
pub unsafe effect fn appendField(handle: u32, name: string, value: &[u8]) -> () ! HttpError
```

Appends a field to a live mutable fields resource. Host header restrictions remain in force.

::Anchor{id="responseHead"}

## `responseHead`

```silk
pub effect fn responseHead(status: u16, fields: &[Field]) -> OwnedResponseHead
    ! HttpError | OutOfMemoryError ? &mut Allocator
```

Validates and copies response fields and status into Silk's portable response-head value.

Category: Native platform.

Profiles: `wasm32-wasip2`.
