Bounded decoding of certificate subjectAltName values into borrowed identity descriptors.

## Details

`CertificateSan.decode` scans all extensions before decoding one SAN value into caller storage.
`CertificateSan.decodeValue` accepts a complete DER GeneralNames value without a certificate owner.
Both operations preserve source order and return a count. Descriptor payloads borrow the input owner.

## Gotchas

Failure can leave partial descriptors in storage. Use storage only after a successful result.
This module checks encoding, not DNS syntax, identity matches, or certificate trust.
Other universal content and legacy string repertoires remain opaque after complete framing checks.
Schema-specific defaults, SET ordering, and implicit-tag content semantics require their owning schema.

Import as `CertificateSan` with `import silk.certificate_identities { CertificateSan }`.

Public declarations: 6.

::Anchor{id="SanDecodeLimits"}

## `SanDecodeLimits`

```silk
pub struct SanDecodeLimits
```

Finite resource budgets for one SAN decode operation.

::Anchor{id="SanDecodeLimits.extensions"}

### Field `extensions`

```silk
pub extensions: usize
```

Maximum extension count scanned, including unrelated extensions.

::Anchor{id="SanDecodeLimits.inputBytes"}

### Field `inputBytes`

```silk
pub inputBytes: usize
```

Maximum sum of all extension OID and value lengths, or raw GeneralNames length.

::Anchor{id="SanDecodeLimits.identities"}

### Field `identities`

```silk
pub identities: usize
```

Maximum number of GeneralName descriptors.

::Anchor{id="SanDecodeLimits.nodes"}

### Field `nodes`

```silk
pub nodes: usize
```

Maximum number of traversed DER nodes.

::Anchor{id="SanDecodeLimits.depth"}

### Field `depth`

```silk
pub depth: usize
```

Maximum DER depth. The implementation also enforces a ceiling of 32.

::Anchor{id="SanDecodeLimits.impl.Copy"}

## Implementation `Copy for SanDecodeLimits`

```silk
impl Copy for SanDecodeLimits
```

::Anchor{id="SanDecodeLimits.impl"}

## Implementation `SanDecodeLimits`

```silk
impl SanDecodeLimits
```

::Anchor{id="SanDecodeLimits.impl.standard"}

### Associated function `standard`

```silk
pub fn standard() -> SanDecodeLimits
```

Returns budgets of 256 extensions, 1 MiB input, 256 identities, 4096 nodes, and depth 32.

::Anchor{id="SanDecodeClass"}

## `SanDecodeClass`

```silk
pub enum SanDecodeClass
```

The category of a SAN adapter failure.

::Anchor{id="SanDecodeClass.Malformed"}

### `Malformed`

```silk
Malformed
```

The SAN DER or GeneralName schema is malformed.

::Anchor{id="SanDecodeClass.ResourceLimit"}

### `ResourceLimit`

```silk
ResourceLimit
```

Input, traversal, or descriptor storage exceeds a budget.

::Anchor{id="SanDecodeReason"}

## `SanDecodeReason`

```silk
pub enum SanDecodeReason
```

The adapter-specific cause of a SAN failure.

::Anchor{id="SanDecodeReason.InvalidDer"}

### `InvalidDer`

```silk
InvalidDer
```

DER encoding or GeneralName schema is invalid.

::Anchor{id="SanDecodeReason.DuplicateSan"}

### `DuplicateSan`

```silk
DuplicateSan
```

More than one subjectAltName extension is present.

::Anchor{id="SanDecodeReason.EmptySan"}

### `EmptySan`

```silk
EmptySan
```

A present SAN contains no names.

::Anchor{id="SanDecodeReason.Extensions"}

### `Extensions`

```silk
Extensions
```

The extension count exceeds its budget.

::Anchor{id="SanDecodeReason.InputBytes"}

### `InputBytes`

```silk
InputBytes
```

Input bytes exceed their budget.

::Anchor{id="SanDecodeReason.Identities"}

### `Identities`

```silk
Identities
```

The descriptor count exceeds its budget.

::Anchor{id="SanDecodeReason.Storage"}

### `Storage`

```silk
Storage
```

Caller storage cannot hold every descriptor.

::Anchor{id="SanDecodeReason.Nodes"}

### `Nodes`

```silk
Nodes
```

DER node count exceeds its budget.

::Anchor{id="SanDecodeReason.Depth"}

### `Depth`

```silk
Depth
```

DER depth exceeds its budget or the hard ceiling of 32.

::Anchor{id="SanDecodeError"}

## `SanDecodeError`

```silk
pub struct SanDecodeError
```

An owned SAN error with an offset in GeneralNames DER, or zero for extension-list failures.

::Anchor{id="SanDecodeError.kind"}

### Field `kind`

```silk
pub kind: SanDecodeClass
```

The category of this failure.

::Anchor{id="SanDecodeError.reason"}

### Field `reason`

```silk
pub reason: SanDecodeReason
```

The failed adapter rule.

::Anchor{id="SanDecodeError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The failed DER offset; extension-list failures use zero.

::Anchor{id="SanDecodeSummary"}

## `SanDecodeSummary`

```silk
pub struct SanDecodeSummary
```

The initialized descriptor prefix after successful decoding.

::Anchor{id="SanDecodeSummary.present"}

### Field `present`

```silk
pub present: bool
```

Whether a subjectAltName extension was present.

::Anchor{id="SanDecodeSummary.count"}

### Field `count`

```silk
pub count: usize
```

Number of initialized entries in caller storage.

::Anchor{id="SanDecodeSummary.nodes"}

### Field `nodes`

```silk
pub nodes: usize
```

Number of DER nodes traversed while validating the selected GeneralNames value.

::Anchor{id="CertificateSan"}

## `CertificateSan`

```silk
pub struct CertificateSan
```

Operations that decode complete SAN values without allocation or identity matching.

::Anchor{id="CertificateSan.impl"}

## Implementation `CertificateSan`

```silk
impl CertificateSan
```

::Anchor{id="CertificateSan.impl.validateValue"}

### Associated function `validateValue`

```silk
pub fn validateValue(
    value: &[u8],
    limits: SanDecodeLimits,
  ) -> Result<SanDecodeSummary, SanDecodeError>
```

Validates one complete DER GeneralNames value without descriptor storage or allocation.

#### Details

This performs the same complete framing and GeneralName schema checks as `decodeValue`,
enforces the supplied input, identity, node, and depth budgets, and returns the name count.
Payload syntax such as DNS label policy and IP address width remains the consumer's job.

::Anchor{id="CertificateSan.impl.decodeValue"}

### Associated function `decodeValue`

```silk
pub fn decodeValue<'a>(
    value: &'a [u8],
    storage: &mut [PresentedIdentity<'a>],
    limits: SanDecodeLimits,
  ) -> Result<SanDecodeSummary, SanDecodeError>
```

Decodes one complete DER GeneralNames value into a caller-owned descriptor prefix.

#### Details

Payloads borrow `value`; storage remains caller-owned. Success reports the initialized prefix length.
All names retain source order. Unsupported alternatives retain their complete content octets.
Complete DER framing and GeneralName wrappers are checked before success.
Universal checks cover BOOLEAN, INTEGER, ENUMERATED, REAL, BIT STRING, NULL, OID, relative OID, and canonical UTC/GeneralizedTime.
UTF8String, NumericString, PrintableString, IA5String, VisibleString, UniversalString, and BMPString encodings are checked.
ORAddress attribute semantics and otherName open-value semantics remain outside this decoder.
Other universal contents and T61, Videotex, GraphicString, and GeneralString repertoires remain opaque.
Schema-dependent SET ordering, default values, and implicit content rules require the owning schema.

#### Gotchas

An error can leave partial descriptors. Never consume them after failure.
DNS syntax and IP lengths require `HttpsIdentity.verify`; this operation does not establish trust.

::Anchor{id="CertificateSan.impl.decode"}

### Associated function `decode`

```silk
pub fn decode<'a>(
    certificate: &'a Certificate,
    storage: &mut [PresentedIdentity<'a>],
    limits: SanDecodeLimits,
  ) -> Result<SanDecodeSummary, SanDecodeError>
```

Scans every certificate extension and decodes the unique subjectAltName value into caller storage.

#### Details

Extension count and aggregate OID/value bytes are bounded before SAN parsing.
Duplicate SAN extensions fail before any descriptor is written. Absence returns `present = false` and zero count.
The result prefix borrows `certificate`; retain that owner while descriptors are in use.

#### Gotchas

Parsing failure can leave partial storage. Consume descriptors only after success, then perform identity and trust verification separately.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
