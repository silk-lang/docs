Turn a host and a port into a list of endpoints to connect to.

## When to use
Make a [`ResolveRequest`](#ResolveRequest) from a `Host` and a `Port`, and call [`Resolver.resolve`](#Resolver.impl.resolve). A numeric
host gives one endpoint without a lookup. A domain name goes to the `Resolver` provider. Use
`silk.native_resolver` in a native program, or give your own provider, for example in tests.

## Details
The result keeps the order of the provider, removes exact duplicates, and keeps only the
addresses of the [`FamilySelection`](#FamilySelection). It holds at most the `maxResults` of the request, and
never more than 64.

## Errors
- `NoAddress` if no address of the selected family remains.
- `LimitExceeded` if there are more distinct endpoints than `maxResults`. The result is never
  cut short.
- `Timeout` if the deadline of a numeric request has passed.
- Other [`ResolverError`](#ResolverError) values come from the provider.

## Gotchas
For a domain name, the provider decides how to use the deadline. `NativeSystemResolver` cannot
stop a lookup, so it returns `DeadlineUnsupported` for a domain request with a deadline.
`maxResults` limits only the result, not the work of the provider.

## Examples
### Resolve with a test provider
This provider returns the same endpoints for every name. The duplicate and the IPv6 address are
removed from the result.

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.monotonic_clock { MonotonicClock }
import silk.network_address {
  AddressError,
  DomainHost,
  Endpoint,
  Host,
  IpAddress,
  Ipv4Address,
  Ipv6Address,
  Port
}
import silk.option { Option }
import silk.result { Result }
import silk.resolver { FamilySelection, ResolveRequest, ResolvedEndpoints, Resolver, ResolverError }
import silk.system_clock { Instant, SystemClock }
import silk.u64

struct FixedResolver {}

impl FixedResolver {
  effect fn resolveDomain(
    self: &mut Self,
    request: &ResolveRequest,
    domain: &DomainHost,
  ) -> ResolvedEndpoints
    ! ResolverError | OutOfMemoryError
    ? &mut Allocator {
    drop domain
    let port = ResolveRequest.port(request)
    let mut result = match ResolvedEndpoints.make(8) {
      Result<ResolvedEndpoints, ResolverError>.Success { value } => move value
      Result<ResolvedEndpoints, ResolverError>.Failure { error } => {
        fail move error
      }
    }
    let first = IpAddress.V4 { value: Ipv4Address.fromOctets([192, 0, 2, 1]) }
    let second = IpAddress.V6 { value: Ipv6Address.fromOctets([0; 16]) }
    let added = run ResolvedEndpoints.admit(&mut result, Endpoint.make(first, port))
    let same = run ResolvedEndpoints.admit(&mut result, Endpoint.make(first, port))
    let other = run ResolvedEndpoints.admit(&mut result, Endpoint.make(second, port))
    return move result
  }
}

impl Resolver for FixedResolver {
  resolveDomain: FixedResolver.resolveDomain
}

struct FixedMonotonic {}

impl MonotonicClock for FixedMonotonic {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }

  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    drop when
    return ()
  }

  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    drop howLong
    return ()
  }
}

effect fn program() -> i32
  ! ResolverError | OutOfMemoryError {
  let host = match Host.parse(b"example.com") {
    Result<Host, AddressError>.Success { value } => value
    Result<Host, AddressError>.Failure { error: _ } => {
      return 1
    }
  }
  let request = match ResolveRequest.make(
    host,
    Port.fromU16(443),
    FamilySelection.V4,
    4,
    Option<Instant>.none(),
  ) {
    Result<ResolveRequest, ResolverError>.Success { value } => move value
    Result<ResolveRequest, ResolverError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut resolver = FixedResolver {}
  let mut clock = FixedMonotonic {}
  let endpoints = run Resolver.resolve(&request) |> Effect.provideMut<Resolver>(&mut resolver)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  if ResolvedEndpoints.length(&endpoints) != 1 {
    return 1
  }
  let endpoint = ResolvedEndpoints.get(&endpoints, 0)
  let address = Endpoint.address(&endpoint)
  if !IpAddress.isV4(&address) || Port.value(&Endpoint.port(&endpoint)) != 443 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `Resolver` with `import silk.resolver { Resolver }`.

Public declarations: 9.

::Anchor{id="FamilySelection"}

## `FamilySelection`

```silk
pub enum FamilySelection
```

The address families to keep in a result.

::Anchor{id="FamilySelection.Any"}

### `Any`

```silk
Any
```

Keep IPv4 and IPv6 addresses.

::Anchor{id="FamilySelection.V4"}

### `V4`

```silk
V4
```

Keep only IPv4 addresses.

::Anchor{id="FamilySelection.V6"}

### `V6`

```silk
V6
```

Keep only IPv6 addresses.

::Anchor{id="ResolverInputReason"}

## `ResolverInputReason`

```silk
pub enum ResolverInputReason
```

The reason that a `maxResults` value is not valid.

::Anchor{id="ResolverInputReason.ZeroResults"}

### `ZeroResults`

```silk
ZeroResults
```

`maxResults` is 0.

::Anchor{id="ResolverInputReason.TooManyResults"}

### `TooManyResults`

```silk
TooManyResults
```

`maxResults` is more than 64.

::Anchor{id="NativeResolverOperation"}

## `NativeResolverOperation`

```silk
pub enum NativeResolverOperation
```

The system call that failed in a native provider.

::Anchor{id="NativeResolverOperation.GetAddrInfo"}

### `GetAddrInfo`

```silk
GetAddrInfo
```

The `getaddrinfo` call.

::Anchor{id="NativeResultReason"}

## `NativeResultReason`

```silk
pub enum NativeResultReason
```

The reason that a native provider rejected a successful `getaddrinfo` result.

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

The error from a resolution.

::Anchor{id="ResolverError.InvalidInput"}

### `InvalidInput`

```silk
InvalidInput
```

The `maxResults` of the request is not valid.

::Anchor{id="ResolverError.InvalidInput.reason"}

#### Field `reason`

```silk
pub reason: ResolverInputReason
```

The rule that failed.

::Anchor{id="ResolverError.InvalidInput.value"}

#### Field `value`

```silk
pub value: usize
```

The `maxResults` that you gave.

::Anchor{id="ResolverError.UnsupportedForm"}

### `UnsupportedForm`

```silk
UnsupportedForm
```

The provider does not support this form of host.

::Anchor{id="ResolverError.Timeout"}

### `Timeout`

```silk
Timeout
```

The deadline of the request has passed.

::Anchor{id="ResolverError.DeadlineUnsupported"}

### `DeadlineUnsupported`

```silk
DeadlineUnsupported
```

The provider cannot stop a lookup at a deadline, so it did not start.

::Anchor{id="ResolverError.NoAddress"}

### `NoAddress`

```silk
NoAddress
```

No address of the selected family was found.

::Anchor{id="ResolverError.NameNotFound"}

### `NameNotFound`

```silk
NameNotFound
```

The name does not exist.

::Anchor{id="ResolverError.TemporaryFailure"}

### `TemporaryFailure`

```silk
TemporaryFailure
```

The lookup failed for a temporary reason, for example a DNS server timeout. Try again later.

::Anchor{id="ResolverError.FamilyUnsupported"}

### `FamilyUnsupported`

```silk
FamilyUnsupported
```

The system does not support the selected family.

::Anchor{id="ResolverError.SystemResources"}

### `SystemResources`

```silk
SystemResources
```

The system did not have the resources, such as memory, for the lookup.

::Anchor{id="ResolverError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

The lookup found more distinct endpoints than `maxResults`.

::Anchor{id="ResolverError.LimitExceeded.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The `maxResults` of the request.

::Anchor{id="ResolverError.InvalidNativeResult"}

### `InvalidNativeResult`

```silk
InvalidNativeResult
```

The system returned a result that is not valid.

::Anchor{id="ResolverError.InvalidNativeResult.reason"}

#### Field `reason`

```silk
pub reason: NativeResultReason
```

The problem in the result.

::Anchor{id="ResolverError.InvalidNativeResult.index"}

#### Field `index`

```silk
pub index: usize
```

The position of the bad entry in the result list, from 0.

::Anchor{id="ResolverError.NativeFailure"}

### `NativeFailure`

```silk
NativeFailure
```

The system lookup failed with a code that has no other variant.

::Anchor{id="ResolverError.NativeFailure.operation"}

#### Field `operation`

```silk
pub operation: NativeResolverOperation
```

The call that failed.

::Anchor{id="ResolverError.NativeFailure.eai"}

#### Field `eai`

```silk
pub eai: i32
```

The `EAI_*` code from `getaddrinfo`.

::Anchor{id="ResolverError.NativeFailure.errno"}

#### Field `errno`

```silk
pub errno: Option<i32>
```

The `errno` value, when the code is `EAI_SYSTEM`.

::Anchor{id="ResolveRequest"}

## `ResolveRequest`

```silk
pub struct ResolveRequest
```

What to resolve: a host, a port, the families to keep, the maximum result count, and an optional
deadline. Make it with [`ResolveRequest.make`](#ResolveRequest.impl.make).

::Anchor{id="ResolvedEndpoints"}

## `ResolvedEndpoints`

```silk
pub struct ResolvedEndpoints
```

The endpoints of a resolution, without duplicates, in the order of the provider.

::Anchor{id="Admission"}

## `Admission`

```silk
pub enum Admission
```

The result of [`ResolvedEndpoints.admit`](#ResolvedEndpoints.impl.admit).

::Anchor{id="Admission.Added"}

### `Added`

```silk
Added
```

The endpoint was added.

::Anchor{id="Admission.Duplicate"}

### `Duplicate`

```silk
Duplicate
```

An equal endpoint is already in the list, so nothing changed.

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

Returns a request.

`maxResults` is from 1 to 64. `deadline` is a time on the `MonotonicClock`.

#### Errors
- `InvalidInput` if `maxResults` is 0 or more than 64.

::Anchor{id="ResolveRequest.impl.host"}

### Method `host`

```silk
pub fn host(self: &Self) -> Host
```

Returns the host.

::Anchor{id="ResolveRequest.impl.port"}

### Method `port`

```silk
pub fn port(self: &Self) -> Port
```

Returns the port.

::Anchor{id="ResolveRequest.impl.family"}

### Method `family`

```silk
pub fn family(self: &Self) -> FamilySelection
```

Returns the families to keep.

::Anchor{id="ResolveRequest.impl.maxResults"}

### Method `maxResults`

```silk
pub fn maxResults(self: &Self) -> usize
```

Returns the maximum number of endpoints in the result.

::Anchor{id="ResolveRequest.impl.hasDeadline"}

### Method `hasDeadline`

```silk
pub fn hasDeadline(self: &Self) -> bool
```

Returns `true` if the request has a deadline.

::Anchor{id="ResolveRequest.impl.deadline"}

### Method `deadline`

```silk
pub fn deadline(self: &Self) -> Option<Instant>
```

Returns the deadline, if there is one. A provider that cannot keep it returns
`DeadlineUnsupported`.

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

Returns an empty list that holds at most `maximum` endpoints, from 1 to 64.

::Anchor{id="ResolvedEndpoints.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns the number of endpoints.

::Anchor{id="ResolvedEndpoints.impl.get"}

### Method `get`

```silk
pub fn get(self: &Self, index: usize) -> Endpoint
```

Returns the endpoint at `index`. `index` must be less than [`ResolvedEndpoints.length`](#ResolvedEndpoints.impl.length).

::Anchor{id="ResolvedEndpoints.impl.asSlice"}

### Method `asSlice`

```silk
pub fn asSlice(self: &Self) -> &[Endpoint]
```

Returns the endpoints as a slice.

::Anchor{id="ResolvedEndpoints.impl.admit"}

### Method `admit`

```silk
pub effect fn admit(self: &mut Self, endpoint: Endpoint) -> Admission
  ! ResolverError | OutOfMemoryError
  ? &mut Allocator
```

Adds `endpoint` to the end of the list, if it is not in the list yet.

#### Errors
- `LimitExceeded` if the list is full and `endpoint` is new.

::Anchor{id="Resolver"}

## `Resolver`

```silk
pub service Resolver
```

The service that looks up domain names. [`Resolver.resolve`](#Resolver.impl.resolve) calls it only for domain names.

### When to use
Require `&mut Resolver` in code that connects by name, and call [`Resolver.resolve`](#Resolver.impl.resolve). Provide
`silk.native_resolver.NativeSystemResolver` in a native program, or your own provider, for
example in tests.

### Gotchas
For a domain name, the provider decides how to use the deadline. `NativeSystemResolver` cannot
stop a lookup, so it returns `DeadlineUnsupported` for a domain request with a deadline.

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

Looks up `domain` and returns its endpoints, with the port of `request`. [`Resolver.resolve`](#Resolver.impl.resolve)
filters the families and removes duplicates after this call.

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

Returns the endpoints for `request`.

A numeric host gives one endpoint, without the provider. A domain name calls
[`Resolver.resolveDomain`](#Resolver.resolveDomain) on the provider. The result keeps the order of the provider,
removes exact duplicates, and keeps only the addresses of the [`FamilySelection`](#FamilySelection). It holds at
most the `maxResults` of the request, and never more than 64.

#### Errors
- `NoAddress` if no address of the selected family remains.
- `LimitExceeded` if there are more distinct endpoints than `maxResults`. The result is never
  cut short.
- `Timeout` if the deadline of a numeric request has passed.
- Other [`ResolverError`](#ResolverError) values come from the provider.
- `OutOfMemoryError` if the `Allocator` cannot supply the result.

#### Gotchas
`maxResults` limits only the result, not the work of the provider.

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
