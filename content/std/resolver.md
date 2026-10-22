Finite, provider-replaceable host resolution policy.

## When to use

Build a ResolveRequest from an owned Host and call Resolver.resolve. Numeric hosts are handled
locally; domain hosts dispatch to the lexically supplied Resolver provider.

## Details

Results own at most 64 endpoints, preserve provider order, and deduplicate exact addresses.
A deadline on a numeric host is checked against exactly one MonotonicClock sample. Domain
providers either enforce their deadline with structured cancellation or reject it before work.

## Gotchas

The result bound limits published endpoints only. It does not bound a provider's internal
allocation, traversal, elapsed time, or host-scheduler blockage.

Import as `Resolver` with `import silk.resolver { Resolver }`.

Public declarations: 9.

::Anchor{id="FamilySelection"}

## `FamilySelection`

```silk
pub enum FamilySelection
```

The admitted address families for one resolution.

::Anchor{id="FamilySelection.Any"}

### `Any`

```silk
Any
```

Accepts both IPv4 and IPv6 results.

::Anchor{id="FamilySelection.V4"}

### `V4`

```silk
V4
```

An IPv4 address.

::Anchor{id="FamilySelection.V6"}

### `V6`

```silk
V6
```

An IPv6 address.

::Anchor{id="ResolverInputReason"}

## `ResolverInputReason`

```silk
pub enum ResolverInputReason
```

The failed request admission rule.

::Anchor{id="ResolverInputReason.ZeroResults"}

### `ZeroResults`

```silk
ZeroResults
```

The requested result limit is zero.

::Anchor{id="ResolverInputReason.TooManyResults"}

### `TooManyResults`

```silk
TooManyResults
```

The requested result limit exceeds 64.

::Anchor{id="NativeResolverOperation"}

## `NativeResolverOperation`

```silk
pub enum NativeResolverOperation
```

The native operation that produced a wrapped host failure.

::Anchor{id="NativeResolverOperation.GetAddrInfo"}

### `GetAddrInfo`

```silk
GetAddrInfo
```

Native getaddrinfo host resolution.

::Anchor{id="NativeResultReason"}

## `NativeResultReason`

```silk
pub enum NativeResultReason
```

The reason a successful native result chain was rejected.

::Anchor{id="NativeResultReason.NullChain"}

### `NullChain`

```silk
NullChain
```

A successful native lookup returned no result chain.

::Anchor{id="NativeResultReason.UnknownFamily"}

### `UnknownFamily`

```silk
UnknownFamily
```

A native result contains an unsupported address family.

::Anchor{id="NativeResultReason.NullAddress"}

### `NullAddress`

```silk
NullAddress
```

A native result has no address pointer.

::Anchor{id="NativeResultReason.ShortAddress"}

### `ShortAddress`

```silk
ShortAddress
```

A native address is shorter than its family requires.

::Anchor{id="ResolverError"}

## `ResolverError`

```silk
pub union ResolverError
```

A typed host-resolution failure.

::Anchor{id="ResolverError.InvalidInput"}

### `InvalidInput`

```silk
InvalidInput
```

The resolution request failed pure admission.

::Anchor{id="ResolverError.InvalidInput.reason"}

#### Field `reason`

```silk
pub reason: ResolverInputReason
```

The admission rule that rejected the request or native result.

::Anchor{id="ResolverError.InvalidInput.value"}

#### Field `value`

```silk
pub value: usize
```

The rejected result-count limit.

::Anchor{id="ResolverError.UnsupportedForm"}

### `UnsupportedForm`

```silk
UnsupportedForm
```

The input uses an unsupported host form.

::Anchor{id="ResolverError.Timeout"}

### `Timeout`

```silk
Timeout
```

The supplied absolute deadline has been reached.

::Anchor{id="ResolverError.DeadlineUnsupported"}

### `DeadlineUnsupported`

```silk
DeadlineUnsupported
```

The selected provider cannot enforce the supplied deadline.

::Anchor{id="ResolverError.NoAddress"}

### `NoAddress`

```silk
NoAddress
```

No admitted address remains after selection.

::Anchor{id="ResolverError.NameNotFound"}

### `NameNotFound`

```silk
NameNotFound
```

The requested host name was not found.

::Anchor{id="ResolverError.TemporaryFailure"}

### `TemporaryFailure`

```silk
TemporaryFailure
```

The host lookup reported a temporary failure.

::Anchor{id="ResolverError.FamilyUnsupported"}

### `FamilyUnsupported`

```silk
FamilyUnsupported
```

The requested address family is unsupported.

::Anchor{id="ResolverError.SystemResources"}

### `SystemResources`

```silk
SystemResources
```

The operating system cannot supply the required resources.

::Anchor{id="ResolverError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The distinct endpoint count exceeds the requested result limit.

::Anchor{id="ResolverError.LimitExceeded.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The maximum number of distinct endpoints allowed in the result.

::Anchor{id="ResolverError.InvalidNativeResult"}

### `InvalidNativeResult`

```silk
InvalidNativeResult
```

A successful native result failed validation.

::Anchor{id="ResolverError.InvalidNativeResult.reason"}

#### Field `reason`

```silk
pub reason: NativeResultReason
```

The admission rule that rejected the request or native result.

::Anchor{id="ResolverError.InvalidNativeResult.index"}

#### Field `index`

```silk
pub index: usize
```

The zero-based native result-chain index.

::Anchor{id="ResolverError.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

A native boundary failed with the retained operation and error number.

::Anchor{id="ResolverError.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeResolverOperation
```

The native operation that reported this failure.

::Anchor{id="ResolverError.NativeFailure.eai"}

#### Field `eai`

```silk
pub eai: i32
```

The exact getaddrinfo error code.

::Anchor{id="ResolverError.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: Option<i32>
```

The system error number when getaddrinfo reports a system failure.

::Anchor{id="ResolveRequest"}

## `ResolveRequest`

```silk
pub struct ResolveRequest
```

One finite owned resolution request.

::Anchor{id="ResolvedEndpoints"}

## `ResolvedEndpoints`

```silk
pub struct ResolvedEndpoints
```

One finite owned sequence of resolved endpoints.

::Anchor{id="Admission"}

## `Admission`

```silk
pub enum Admission
```

Whether one candidate changed a result builder.

::Anchor{id="Admission.Added"}

### `Added`

```silk
Added
```

The candidate was appended to the owned result.

::Anchor{id="Admission.Duplicate"}

### `Duplicate`

```silk
Duplicate
```

An equal endpoint was already present.

::Anchor{id="ResolveRequest.impl"}

## Implementation `ResolveRequest`

```silk
impl ResolveRequest
```

::Anchor{id="ResolveRequest.impl.make"}

### Associated function `make`

```silk
pub fn make(
    host: Host,
    port: Port,
    family: FamilySelection,
    maxResults: usize,
    deadline: Option<Instant>,
  ) -> Result<ResolveRequest, ResolverError>
```

Admits an owned host, checked port, finite capacity, family, and optional absolute deadline.

::Anchor{id="ResolveRequest.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Host
```

Returns the owned host by value.

::Anchor{id="ResolveRequest.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Port
```

Returns the checked port by value.

::Anchor{id="ResolveRequest.impl.family"}

### Method `family`

```silk
pub fn family(self: &Self) -> FamilySelection
```

Returns the selected address family.

::Anchor{id="ResolveRequest.impl.maxResults"}

### Method `maxResults`

```silk
pub fn maxResults(self: &Self) -> usize
```

Returns the finite result capacity.

::Anchor{id="ResolveRequest.impl.hasDeadline"}

### Method `hasDeadline`

```silk
pub fn hasDeadline(self: &Self) -> bool
```

Reports whether the request carries an absolute deadline.

::Anchor{id="ResolveRequest.impl.deadline"}

### Method `deadline`

```silk
pub fn deadline(self: &Self) -> Option<Instant>
```

Returns the optional absolute deadline for a provider that can enforce it.

::Anchor{id="ResolvedEndpoints.impl"}

## Implementation `ResolvedEndpoints`

```silk
impl ResolvedEndpoints
```

::Anchor{id="ResolvedEndpoints.impl.make"}

### Associated function `make`

```silk
pub fn make(maximum: usize) -> Result<ResolvedEndpoints, ResolverError>
```

Creates an empty finite builder after validating its capacity.

::Anchor{id="ResolvedEndpoints.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of admitted endpoints.

::Anchor{id="ResolvedEndpoints.impl.get"}

### Method `get`

```silk
pub fn get(self: &Self, index: usize) -> Endpoint
```

Returns a copied endpoint at a valid index.

::Anchor{id="ResolvedEndpoints.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice(self: &Self) -> &[Endpoint]
```

Borrows the admitted endpoint prefix.

::Anchor{id="ResolvedEndpoints.impl.admit"}

### Method `admit`

```silk
pub effect fn admit(self: &mut Self, endpoint: Endpoint) -> Admission
  ! ResolverError | OutOfMemoryError
  ? &mut Allocator
```

Adds one stable-distinct endpoint, or fails instead of truncating beyond the capacity.

::Anchor{id="Resolver"}

## `Resolver`

```silk
pub service Resolver
```

A replaceable domain-only resolver provider.

::Anchor{id="Resolver.resolveDomain"}

### Operation `resolveDomain`

```silk
effect fn resolveDomain(
    request: &ResolveRequest,
    domain: &DomainHost,
  ) -> ResolvedEndpoints
  ! ResolverError | OutOfMemoryError
  ? &mut Resolver | &mut Allocator
```

Resolves one admitted domain request and owns all returned endpoint storage.

::Anchor{id="Resolver.impl"}

## Implementation `Resolver`

```silk
impl Resolver
```

::Anchor{id="Resolver.impl.resolve"}

### Associated function `resolve`

```silk
pub effect fn resolve(request: &ResolveRequest) -> ResolvedEndpoints
  ! ResolverError | OutOfMemoryError
  ? &mut Resolver | &mut Allocator | &mut MonotonicClock
```

Resolves one owned host with finite results and exact numeric deadline preflight.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
