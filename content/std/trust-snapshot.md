Bounded immutable owners for explicit trust-anchor sequences.

## When to use

Use [`fromAnchors`](#TrustSnapshot.impl.fromAnchors) when the application already owns explicit authorities. Use [`fromPem`](#TrustSnapshot.impl.fromPem) to
import strict certificate PEM as unconstrained anchors. Use [`copy`](#TrustSnapshot.impl.copy) or [`combine`](#TrustSnapshot.impl.combine) when a new
owner must survive release of its source snapshots.

## Details

A snapshot preserves every anchor, restriction, duplicate, and input position. All limits are
inclusive. Zero permits no corresponding resource. An empty anchor list is valid explicit
trust that authenticates no peer.

## Gotchas

A snapshot stores explicit authority only. It does not validate a path, identity, time,
revocation state, or OS trust policy. Empty or whitespace-only PEM remains invalid.

Import as `TrustSnapshot` with `import silk.trust_snapshot { TrustSnapshot }`.

Public declarations: 7.

::Anchor{id="SnapshotLimits"}

## `SnapshotLimits`

```silk
pub struct SnapshotLimits
```

Inclusive budgets for one complete trust snapshot.

::Anchor{id="SnapshotLimits.anchors"}

### Field `anchors`

```silk
pub anchors: usize
```

Maximum anchor count, including duplicate certificate values.

::Anchor{id="SnapshotLimits.encodedBytes"}

### Field `encodedBytes`

```silk
pub encodedBytes: usize
```

Maximum aggregate certificate and configured-constraint bytes.

::Anchor{id="SnapshotLimits.impl.Copy"}

## Implementation `Copy for SnapshotLimits`

```silk
impl Copy for SnapshotLimits
```

::Anchor{id="SnapshotLimits.impl"}

## Implementation `SnapshotLimits`

```silk
impl SnapshotLimits
```

::Anchor{id="SnapshotLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> SnapshotLimits
```

Returns finite defaults of 1024 anchors and 8 MiB of retained encoded data.

::Anchor{id="TrustLoadLimits"}

## `TrustLoadLimits`

```silk
pub struct TrustLoadLimits
```

Inclusive strict-decoder and snapshot budgets for one trust-source load.

::Anchor{id="TrustLoadLimits.decode"}

### Field `decode`

```silk
pub decode: DecodeLimits
```

Bounds used by strict PEM, DER, and certificate decoding.

::Anchor{id="TrustLoadLimits.snapshot"}

### Field `snapshot`

```silk
pub snapshot: SnapshotLimits
```

Bounds used by the complete returned snapshot.

::Anchor{id="TrustLoadLimits.impl.Copy"}

## Implementation `Copy for TrustLoadLimits`

```silk
impl Copy for TrustLoadLimits
```

::Anchor{id="TrustLoadLimits.impl"}

## Implementation `TrustLoadLimits`

```silk
impl TrustLoadLimits
```

::Anchor{id="TrustLoadLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> TrustLoadLimits
```

Returns the finite certificate-decoder and snapshot defaults.

::Anchor{id="TrustLimitKind"}

## `TrustLimitKind`

```silk
pub enum TrustLimitKind
```

A bounded trust-source resource category.

::Anchor{id="TrustLimitKind.AnchorCount"}

### `AnchorCount`

```silk
AnchorCount
```

The complete snapshot has too many anchors, including duplicates.

::Anchor{id="TrustLimitKind.EncodedBytes"}

### `EncodedBytes`

```silk
EncodedBytes
```

The aggregate certificate and configured-constraint bytes exceed the budget.

::Anchor{id="TrustLimitKind.InputBytes"}

### `InputBytes`

```silk
InputBytes
```

A native provider input exceeds its acquisition budget.

::Anchor{id="TrustConfigurationReason"}

## `TrustConfigurationReason`

```silk
pub enum TrustConfigurationReason
```

A rejected native trust-source configuration rule.

::Anchor{id="TrustConfigurationReason.EmptyRoot"}

### `EmptyRoot`

```silk
EmptyRoot
```

An explicit native root path has no bytes.

::Anchor{id="TrustConfigurationReason.NonAbsoluteRoot"}

### `NonAbsoluteRoot`

```silk
NonAbsoluteRoot
```

An explicit native root path is not absolute.

::Anchor{id="TrustConfigurationReason.NulRoot"}

### `NulRoot`

```silk
NulRoot
```

An explicit native root path contains a zero byte.

::Anchor{id="TrustConfigurationReason.PathBytes"}

### `PathBytes`

```silk
PathBytes
```

A native root path exceeds its byte budget.

::Anchor{id="TrustFileOperation"}

## `TrustFileOperation`

```silk
pub enum TrustFileOperation
```

A native trust-source file stage.

::Anchor{id="TrustFileOperation.Open"}

### `Open`

```silk
Open
```

Opening the configured trust file failed.

::Anchor{id="TrustFileOperation.Read"}

### `Read`

```silk
Read
```

Reading the configured trust file failed.

::Anchor{id="TrustFileOperation.Close"}

### `Close`

```silk
Close
```

Closing the configured trust file failed.

::Anchor{id="TrustSourceError"}

## `TrustSourceError`

```silk
pub union TrustSourceError
```

A semantic trust-source failure that does not include allocation refusal.

::Anchor{id="TrustSourceError.Decode"}

### `Decode`

```silk
Decode
```

Strict PEM, DER, or certificate decoding failed at the retained decoder location.

::Anchor{id="TrustSourceError.Decode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The complete structured decoder failure.

::Anchor{id="TrustSourceError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A finite trust-source budget was exceeded.

::Anchor{id="TrustSourceError.LimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: TrustLimitKind
```

The exhausted resource category.

::Anchor{id="TrustSourceError.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The inclusive configured budget.

::Anchor{id="TrustSourceError.InvalidConfiguration"}

### `InvalidConfiguration`

```silk
InvalidConfiguration
```

A native provider configuration is invalid.

::Anchor{id="TrustSourceError.InvalidConfiguration.reason"}

#### Field `reason`

```silk
pub reason: TrustConfigurationReason
```

The rejected configuration rule.

::Anchor{id="TrustSourceError.File"}

### `File`

```silk
File
```

A native provider file operation failed.

::Anchor{id="TrustSourceError.File.operation"}

#### Field `operation`

```silk
pub operation: TrustFileOperation
```

The failed file stage.

::Anchor{id="TrustSourceError.File.error"}

#### Field `error`

```silk
pub error: FileError
```

The complete portable file failure with its provider code.

::Anchor{id="TrustSnapshot"}

## `TrustSnapshot`

```silk
pub struct TrustSnapshot
```

One immutable independently owned sequence of explicit trust authorities.

### Details

The snapshot preserves input order and duplicates. Each borrowed anchor remains valid only
while this snapshot remains valid. Construction does not inspect certificate semantics.

::Anchor{id="TrustSnapshot.impl"}

## Implementation `TrustSnapshot`

```silk
impl TrustSnapshot
```

::Anchor{id="TrustSnapshot.impl.fromAnchors"}

### Associated function `fromAnchors`

```silk
pub fn fromAnchors(
    anchors: List<TrustAnchor>,
    limits: SnapshotLimits,
  ) -> Result<TrustSnapshot, TrustSourceError>
```

Consumes a complete anchor list after allocation-free count and byte-budget validation.

#### Details

Success preserves the list allocation, order, duplicates, and configured restrictions.
Failure releases the consumed input and publishes no snapshot. Empty explicit trust is valid.

::Anchor{id="TrustSnapshot.impl.fromPem"}

### Associated function `fromPem`

```silk
pub effect fn fromPem(
    input: &[u8],
    limits: TrustLoadLimits,
  ) -> Result<TrustSnapshot, TrustSourceError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Strictly decodes certificate PEM and moves each certificate into an unconstrained anchor.

#### Details

The result preserves order and duplicates. It reparses no DER and copies no certificate after
decoding. Decoder failures retain their structured locations. Allocation refusal remains an
`OutOfMemoryError` Effect failure. Every failure publishes no snapshot.

#### Gotchas

Empty or whitespace-only PEM is invalid. Import assigns explicit authority but does not
authenticate a path or reproduce OS trust policy.

::Anchor{id="TrustSnapshot.impl.fromAnnotatedPem"}

### Associated function `fromAnnotatedPem`

```silk
pub effect fn fromAnnotatedPem(input: &[u8], limits: TrustLoadLimits) -> Result<TrustSnapshot, TrustSourceError>
  ! OutOfMemoryError ? &mut Allocator
```

Imports configured platform authorities from an annotated certificate PEM document.

#### Details

Uses [`CertificateBundle.decodeAnnotatedPem`](/docs/std/certificate-bundle#CertificateBundle.impl.decodeAnnotatedPem), retaining all certificates, duplicates, limits,
and rejection locations. Malformed certificates fail atomically; none are skipped.

#### Gotchas

Call only with explicitly trusted configuration, never peer-supplied authority. This does
not import keychain settings or validate a certificate path. [`fromPem`](#TrustSnapshot.impl.fromPem) remains strict.

::Anchor{id="TrustSnapshot.impl.anchors"}

### Method `anchors`

```silk
pub fn anchors(self: &Self) -> &[TrustAnchor]
```

Borrows all anchors in their original order, including every duplicate.

::Anchor{id="TrustSnapshot.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: SnapshotLimits,
  ) -> Result<TrustSnapshot, TrustSourceError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Creates an independently owned copy under the supplied inclusive limits.

#### Details

Every certificate and configured constraint is copied. Allocation refusal releases partial
output and leaves this snapshot unchanged.

::Anchor{id="TrustSnapshot.impl.combine"}

### Associated function `combine`

```silk
pub effect fn combine(
    primary: &TrustSnapshot,
    additional: &TrustSnapshot,
    limits: SnapshotLimits,
  ) -> Result<TrustSnapshot, TrustSourceError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Copies `primary` anchors, then `additional` anchors, into one independent owner.

#### Details

The operation preserves every duplicate and configured restriction. It does not merge equal
certificate DER. A less-restricted additional authority can therefore widen trust.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
