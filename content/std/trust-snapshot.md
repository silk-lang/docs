A fixed list of trust anchors: the root CAs that certificate path validation starts from.

## When to use
Make a [`TrustSnapshot`](#TrustSnapshot) from your CA certificates with [`TrustSnapshot.fromPem`](#TrustSnapshot.impl.fromPem), or from
anchors with limits with [`TrustSnapshot.fromAnchors`](#TrustSnapshot.impl.fromAnchors). Pass it to path validation or to a TLS
client. Use [`TrustSnapshot.combine`](#TrustSnapshot.impl.combine) to add your own CAs to another snapshot.

## Details
A snapshot keeps its anchors in input order, with duplicates, and does not change after you make
it. [`SnapshotLimits`](#SnapshotLimits) and [`TrustLoadLimits`](#TrustLoadLimits) bound its size. An empty snapshot is valid: it
trusts no certificate.

## Errors
- [`TrustSourceError`](#TrustSourceError) if a certificate is not valid, or a limit is exceeded.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
A snapshot is only a list of authorities. It does not check chains, names, dates, or revocation,
and it is not the trust store of the operating system.

## Examples
### Make an empty snapshot
```silk
import silk.list { List }
import silk.result { Result }
import silk.trust_anchor { TrustAnchor }
import silk.trust_snapshot { SnapshotLimits, TrustSnapshot, TrustSourceError }

pub fn main() -> i32 {
  return match TrustSnapshot.fromAnchors(List<TrustAnchor>.make(), SnapshotLimits.defaults()) {
    Result<TrustSnapshot, TrustSourceError>.Success { value } => {
      // An empty snapshot is valid, but no certificate chains to it.
      if TrustSnapshot.anchors(&value).length != 0 {
        return 1
      }
      return 0
    }
    Result<TrustSnapshot, TrustSourceError>.Failure { error: _ } => 1
  }
}
```

Import as `TrustSnapshot` with `import silk.trust_snapshot { TrustSnapshot }`.

Public declarations: 7.

::Anchor{id="SnapshotLimits"}

## `SnapshotLimits`

```silk
pub struct SnapshotLimits
```

The limits for one snapshot. Each limit is inclusive, and 0 allows nothing.

::Anchor{id="SnapshotLimits.anchors"}

### Field `anchors`

```silk
pub anchors: usize
```

The maximum number of anchors, with duplicates.

::Anchor{id="SnapshotLimits.encodedBytes"}

### Field `encodedBytes`

```silk
pub encodedBytes: usize
```

The maximum size of all anchors, as [`TrustAnchor.encodedBytes`](/docs/std/trust-anchor#TrustAnchor.impl.encodedBytes) counts it.

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

Returns the default limits: 1024 anchors and 8 MiB.

::Anchor{id="TrustLoadLimits"}

## `TrustLoadLimits`

```silk
pub struct TrustLoadLimits
```

The limits for loading trust: the certificate decoder limits and the snapshot limits.

::Anchor{id="TrustLoadLimits.decode"}

### Field `decode`

```silk
pub decode: DecodeLimits
```

The limits for decoding PEM and certificates.

::Anchor{id="TrustLoadLimits.snapshot"}

### Field `snapshot`

```silk
pub snapshot: SnapshotLimits
```

The limits for the snapshot.

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

Returns `DecodeLimits.defaults()` and [`SnapshotLimits.defaults`](#SnapshotLimits.impl.defaults).

::Anchor{id="TrustLimitKind"}

## `TrustLimitKind`

```silk
pub enum TrustLimitKind
```

The limit that a trust load exceeded.

::Anchor{id="TrustLimitKind.AnchorCount"}

### `AnchorCount`

```silk
AnchorCount
```

The number of anchors.

::Anchor{id="TrustLimitKind.EncodedBytes"}

### `EncodedBytes`

```silk
EncodedBytes
```

The size of all anchors.

::Anchor{id="TrustLimitKind.InputBytes"}

### `InputBytes`

```silk
InputBytes
```

The size of a file that a native trust source reads.

::Anchor{id="TrustLimitKind.impl.Debug"}

## Implementation `Debug for TrustLimitKind`

```silk
impl Debug for TrustLimitKind
```

::Anchor{id="TrustLimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `AnchorCount`.

::Anchor{id="TrustConfigurationReason"}

## `TrustConfigurationReason`

```silk
pub enum TrustConfigurationReason
```

The reason that the configuration of a native trust source is not valid.

::Anchor{id="TrustConfigurationReason.EmptyRoot"}

### `EmptyRoot`

```silk
EmptyRoot
```

A root file path is empty.

::Anchor{id="TrustConfigurationReason.NonAbsoluteRoot"}

### `NonAbsoluteRoot`

```silk
NonAbsoluteRoot
```

A root file path is not absolute.

::Anchor{id="TrustConfigurationReason.NulRoot"}

### `NulRoot`

```silk
NulRoot
```

A root file path contains a zero byte.

::Anchor{id="TrustConfigurationReason.PathBytes"}

### `PathBytes`

```silk
PathBytes
```

A root file path is too long.

::Anchor{id="TrustConfigurationReason.impl.Debug"}

## Implementation `Debug for TrustConfigurationReason`

```silk
impl Debug for TrustConfigurationReason
```

::Anchor{id="TrustConfigurationReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `EmptyRoot`.

::Anchor{id="TrustFileOperation"}

## `TrustFileOperation`

```silk
pub enum TrustFileOperation
```

The file step that failed in a native trust source.

::Anchor{id="TrustFileOperation.Open"}

### `Open`

```silk
Open
```

Opening the trust file.

::Anchor{id="TrustFileOperation.Read"}

### `Read`

```silk
Read
```

Reading the trust file.

::Anchor{id="TrustFileOperation.Close"}

### `Close`

```silk
Close
```

Closing the trust file.

::Anchor{id="TrustFileOperation.impl.Debug"}

## Implementation `Debug for TrustFileOperation`

```silk
impl Debug for TrustFileOperation
```

::Anchor{id="TrustFileOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `Open`.

::Anchor{id="TrustSourceError"}

## `TrustSourceError`

```silk
pub union TrustSourceError
```

The reason that loading trust failed. An allocation failure is an `OutOfMemoryError` instead.

::Anchor{id="TrustSourceError.Decode"}

### `Decode`

```silk
Decode
```

A certificate or its PEM is not valid.

::Anchor{id="TrustSourceError.Decode.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The decoder error, with its position.

::Anchor{id="TrustSourceError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A limit was exceeded.

::Anchor{id="TrustSourceError.LimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: TrustLimitKind
```

The limit.

::Anchor{id="TrustSourceError.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The value of the limit.

::Anchor{id="TrustSourceError.InvalidConfiguration"}

### `InvalidConfiguration`

```silk
InvalidConfiguration
```

The configuration of a native trust source is not valid.

::Anchor{id="TrustSourceError.InvalidConfiguration.reason"}

#### Field `reason`

```silk
pub reason: TrustConfigurationReason
```

The problem.

::Anchor{id="TrustSourceError.File"}

### `File`

```silk
File
```

A file operation of a native trust source failed.

::Anchor{id="TrustSourceError.File.operation"}

#### Field `operation`

```silk
pub operation: TrustFileOperation
```

The step that failed.

::Anchor{id="TrustSourceError.File.error"}

#### Field `error`

```silk
pub error: FileError
```

The file error.

::Anchor{id="TrustSourceError.impl.Debug"}

## Implementation `Debug for TrustSourceError`

```silk
impl Debug for TrustSourceError
```

::Anchor{id="TrustSourceError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `Decode { ... }`.

::Anchor{id="TrustSnapshot"}

## `TrustSnapshot`

```silk
pub struct TrustSnapshot
```

A list of trust anchors that does not change. It owns them and keeps their order and duplicates.

### When to use
Make one from your CA certificates with [`TrustSnapshot.fromPem`](#TrustSnapshot.impl.fromPem), or from anchors with limits
with [`TrustSnapshot.fromAnchors`](#TrustSnapshot.impl.fromAnchors). Pass it to path validation or to a TLS client. Use
[`TrustSnapshot.combine`](#TrustSnapshot.impl.combine) to add your own CAs to another snapshot.

### Details
[`SnapshotLimits`](#SnapshotLimits) and [`TrustLoadLimits`](#TrustLoadLimits) bound its size. An empty snapshot is valid: it trusts
no certificate.

### Gotchas
A snapshot is only a list of authorities. It does not check chains, names, dates, or
revocation, and it is not the trust store of the operating system.

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

Returns a snapshot with `anchors`, in their order. It does not copy them.

An empty list is valid.

#### Errors
- `LimitExceeded` if `anchors` goes over `limits`. The anchors are dropped.

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

Returns a snapshot with one anchor without limits for each `CERTIFICATE` block of `input`.

#### Errors
- `Failure` with `Decode` if the PEM or a certificate is not valid. The decoder is strict, and
  an empty file is an error.
- `Failure` with `LimitExceeded` if a limit is exceeded.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="TrustSnapshot.impl.fromAnnotatedPem"}

### Associated function `fromAnnotatedPem`

```silk
pub effect fn fromAnnotatedPem(input: &[u8], limits: TrustLoadLimits) -> Result<TrustSnapshot, TrustSourceError>
  ! OutOfMemoryError ? &mut Allocator
```

Returns a snapshot from a CA file that has comment lines between the blocks.

It uses `CertificateBundle.decodeAnnotatedPem`. A certificate that is not valid fails the
whole call. None are skipped.

#### Errors
- The same errors as [`TrustSnapshot.fromPem`](#TrustSnapshot.impl.fromPem).

#### Gotchas
Use it only for a CA file that you configured and trust, never for data from a peer.

::Anchor{id="TrustSnapshot.impl.anchors"}

### Method `anchors`

```silk
pub fn anchors(self: &Self) -> &[TrustAnchor]
```

Returns the anchors in their order, with duplicates.

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

Returns a copy of the snapshot that is checked against `limits`.

#### Errors
- `Failure` with `LimitExceeded` if the snapshot goes over `limits`.
- `OutOfMemoryError` if the `Allocator` fails.

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

Returns a new snapshot with the anchors of `primary` and then those of `additional`.

Duplicates are kept. Equal certificates are not merged.

#### Errors
- `Failure` with `LimitExceeded` if the result goes over `limits`.
- `OutOfMemoryError` if the `Allocator` fails.

#### Gotchas
An anchor in `additional` with fewer limits than the same certificate in `primary` makes the
trust wider.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
