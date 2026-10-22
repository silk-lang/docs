Deterministic bounded TLS-server certificate paths to explicit trust authority.

## When to use

Use [`CertificatePath.validate`](#CertificatePath.impl.validate) after certificate decoding and before HTTPS identity and TLS
CertificateVerify checks. Supply every trust candidate explicitly as a [`TrustAnchor`](/docs/std/trust-anchor#TrustAnchor).

## Details

Validation borrows all certificate input. It searches anchors first and then intermediates in
caller order. All resource and work bounds are finite and inclusive. One caller-supplied
[`Instant`](/docs/std/system-clock#Instant) controls every date check.

## Gotchas

A [`ValidatedPath`](#ValidatedPath) does not authenticate a TLS connection. The caller must verify the service
identity, CertificateVerify, and Finished before it accepts application data. Revocation,
certificate transparency, network retrieval, and browser root policy are not checked.

Import as `CertificatePath` with `import silk.certificate_path { CertificatePath }`.

Public declarations: 9.

::Anchor{id="ValidationLimits"}

## `ValidationLimits`

```silk
pub struct ValidationLimits
```

Inclusive input and work limits for one path-validation call.

::Anchor{id="ValidationLimits.peerCertificates"}

### Field `peerCertificates`

```silk
pub peerCertificates: usize
```

Maximum peer certificates, including the leaf.

::Anchor{id="ValidationLimits.certificateBytes"}

### Field `certificateBytes`

```silk
pub certificateBytes: usize
```

Maximum DER bytes in each peer certificate.

::Anchor{id="ValidationLimits.peerBytes"}

### Field `peerBytes`

```silk
pub peerBytes: usize
```

Maximum aggregate peer certificate DER bytes.

::Anchor{id="ValidationLimits.anchors"}

### Field `anchors`

```silk
pub anchors: usize
```

Maximum explicit trust-anchor candidates.

::Anchor{id="ValidationLimits.anchorBytes"}

### Field `anchorBytes`

```silk
pub anchorBytes: usize
```

Maximum aggregate encoded trust-anchor bytes.

::Anchor{id="ValidationLimits.pathCertificates"}

### Field `pathCertificates`

```silk
pub pathCertificates: usize
```

Maximum selected path certificates, excluding the anchor and including the leaf.

::Anchor{id="ValidationLimits.issuerCandidates"}

### Field `issuerCandidates`

```silk
pub issuerCandidates: usize
```

Maximum issuer-candidate visits.

::Anchor{id="ValidationLimits.signatureVerifications"}

### Field `signatureVerifications`

```silk
pub signatureVerifications: usize
```

Maximum primitive signature verifications.

::Anchor{id="ValidationLimits.completePaths"}

### Field `completePaths`

```silk
pub completePaths: usize
```

Maximum reached anchored candidate paths.

::Anchor{id="ValidationLimits.nameComparisons"}

### Field `nameComparisons`

```silk
pub nameComparisons: usize
```

Maximum DNS or IP name/subtree comparisons.

::Anchor{id="ValidationLimits.profile"}

### Field `profile`

```silk
pub profile: ProfileLimits
```

Bounds for each semantic certificate-profile inspection.

::Anchor{id="ValidationLimits.impl.Copy"}

## Implementation `Copy for ValidationLimits`

```silk
impl Copy for ValidationLimits
```

::Anchor{id="ValidationLimits.impl"}

## Implementation `ValidationLimits`

```silk
impl ValidationLimits
```

::Anchor{id="ValidationLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ValidationLimits
```

Returns the fixed default input, search, signature, path, comparison, and profile bounds.

::Anchor{id="ValidationClass"}

## `ValidationClass`

```silk
pub enum ValidationClass
```

The broad category of a path-validation failure.

::Anchor{id="ValidationClass.InvalidInput"}

### `InvalidInput`

```silk
InvalidInput
```

Caller input is invalid independently of trust-path selection.

::Anchor{id="ValidationClass.Rejected"}

### `Rejected`

```silk
Rejected
```

The fixed certificate policy rejects all deterministic candidate paths.

::Anchor{id="ValidationClass.ResourceLimit"}

### `ResourceLimit`

```silk
ResourceLimit
```

An inclusive caller-supplied resource or work bound is exceeded.

::Anchor{id="ValidationReason"}

## `ValidationReason`

```silk
pub enum ValidationReason
```

Stable path-validation rejection reasons.

::Anchor{id="ValidationReason.UnsupportedVersion"}

### `UnsupportedVersion`

```silk
UnsupportedVersion
```

The certificate version is outside the fixed role profile.

::Anchor{id="ValidationReason.UnsupportedAlgorithm"}

### `UnsupportedAlgorithm`

```silk
UnsupportedAlgorithm
```

A required signature or key algorithm is unsupported.

::Anchor{id="ValidationReason.UnsupportedParameters"}

### `UnsupportedParameters`

```silk
UnsupportedParameters
```

Algorithm parameters are unsupported or inconsistent.

::Anchor{id="ValidationReason.UnsupportedExtension"}

### `UnsupportedExtension`

```silk
UnsupportedExtension
```

An extension needs unsupported processing.

::Anchor{id="ValidationReason.UnsupportedConstraint"}

### `UnsupportedConstraint`

```silk
UnsupportedConstraint
```

A NameConstraints form is outside the DNS/IP subset.

::Anchor{id="ValidationReason.UnsupportedPolicy"}

### `UnsupportedPolicy`

```silk
UnsupportedPolicy
```

Certificate policy processing is required but not implemented.

::Anchor{id="ValidationReason.InvalidKey"}

### `InvalidKey`

```silk
InvalidKey
```

A public key is malformed or outside the admitted profile.

::Anchor{id="ValidationReason.InvalidSignature"}

### `InvalidSignature`

```silk
InvalidSignature
```

A retained certificate signature does not verify.

::Anchor{id="ValidationReason.InvalidSerial"}

### `InvalidSerial`

```silk
InvalidSerial
```

A path-certificate serial is invalid.

::Anchor{id="ValidationReason.InvalidUsage"}

### `InvalidUsage`

```silk
InvalidUsage
```

KeyUsage or ExtendedKeyUsage rejects the selected role.

::Anchor{id="ValidationReason.InvalidBasicConstraints"}

### `InvalidBasicConstraints`

```silk
InvalidBasicConstraints
```

BasicConstraints or CA-role policy rejects the certificate.

::Anchor{id="ValidationReason.InvalidName"}

### `InvalidName`

```silk
InvalidName
```

A subject name or subjectAltName is invalid.

::Anchor{id="ValidationReason.InvalidTime"}

### `InvalidTime`

```silk
InvalidTime
```

A caller instant or certificate validity interval is invalid.

::Anchor{id="ValidationReason.DuplicateExtension"}

### `DuplicateExtension`

```silk
DuplicateExtension
```

Two extensions contain the same OID.

::Anchor{id="ValidationReason.IssuerMismatch"}

### `IssuerMismatch`

```silk
IssuerMismatch
```

Exact issuer and subject Name DER do not match.

::Anchor{id="ValidationReason.NameConstraintViolation"}

### `NameConstraintViolation`

```silk
NameConstraintViolation
```

A subordinate SAN violates cumulative NameConstraints.

::Anchor{id="ValidationReason.PathLengthExceeded"}

### `PathLengthExceeded`

```silk
PathLengthExceeded
```

An embedded or configured path-length restriction is exceeded.

::Anchor{id="ValidationReason.Cycle"}

### `Cycle`

```silk
Cycle
```

A linked candidate repeats certificate DER already on the current path.

::Anchor{id="ValidationReason.NoIssuer"}

### `NoIssuer`

```silk
NoIssuer
```

No supplied candidate has an exact linking subject Name.

::Anchor{id="ValidationReason.NoValidPath"}

### `NoValidPath`

```silk
NoValidPath
```

Every deterministically visited linked path is rejected.

::Anchor{id="ValidationReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A checked length or counter sum is not representable.

::Anchor{id="ValidationLocation"}

## `ValidationLocation`

```silk
pub union ValidationLocation
```

The input position associated with one validation failure.

::Anchor{id="ValidationLocation.Leaf"}

### `Leaf`

```silk
Leaf
```

The peer end-entity certificate.

::Anchor{id="ValidationLocation.Intermediate"}

### `Intermediate`

```silk
Intermediate
```

One peer intermediate at its original caller index.

::Anchor{id="ValidationLocation.Intermediate.index"}

#### Field `index`

```silk
pub index: usize
```

The original caller index.

::Anchor{id="ValidationLocation.Anchor"}

### `Anchor`

```silk
Anchor
```

One explicit trust anchor at its original caller index.

::Anchor{id="ValidationLocation.Anchor.index"}

#### Field `index`

```silk
pub index: usize
```

The original caller index.

::Anchor{id="ValidationLocation.Call"}

### `Call`

```silk
Call
```

The validation call rather than one certificate.

::Anchor{id="ValidationLocation.impl.Copy"}

## Implementation `Copy for ValidationLocation`

```silk
impl Copy for ValidationLocation
```

::Anchor{id="ValidationLimit"}

## `ValidationLimit`

```silk
pub enum ValidationLimit
```

A named inclusive validation bound.

::Anchor{id="ValidationLimit.PeerCertificates"}

### `PeerCertificates`

```silk
PeerCertificates
```

Total peer certificate count, including the leaf.

::Anchor{id="ValidationLimit.CertificateBytes"}

### `CertificateBytes`

```silk
CertificateBytes
```

DER bytes in one peer certificate.

::Anchor{id="ValidationLimit.PeerBytes"}

### `PeerBytes`

```silk
PeerBytes
```

Aggregate peer certificate DER bytes.

::Anchor{id="ValidationLimit.Anchors"}

### `Anchors`

```silk
Anchors
```

Explicit trust-anchor count.

::Anchor{id="ValidationLimit.AnchorBytes"}

### `AnchorBytes`

```silk
AnchorBytes
```

Aggregate encoded trust-anchor bytes.

::Anchor{id="ValidationLimit.PathCertificates"}

### `PathCertificates`

```silk
PathCertificates
```

Selected path certificate count, excluding the anchor.

::Anchor{id="ValidationLimit.IssuerCandidates"}

### `IssuerCandidates`

```silk
IssuerCandidates
```

Issuer-candidate visits.

::Anchor{id="ValidationLimit.SignatureVerifications"}

### `SignatureVerifications`

```silk
SignatureVerifications
```

Primitive signature verifications.

::Anchor{id="ValidationLimit.CompletePaths"}

### `CompletePaths`

```silk
CompletePaths
```

Complete anchored candidate paths.

::Anchor{id="ValidationLimit.NameComparisons"}

### `NameComparisons`

```silk
NameComparisons
```

DNS or IP name/subtree comparisons.

::Anchor{id="ValidationLimit.ProfileExtensions"}

### `ProfileExtensions`

```silk
ProfileExtensions
```

Certificate-profile extension count.

::Anchor{id="ValidationLimit.ProfileExtensionBytes"}

### `ProfileExtensionBytes`

```silk
ProfileExtensionBytes
```

One certificate-profile extension value size.

::Anchor{id="ValidationLimit.ProfileSanNames"}

### `ProfileSanNames`

```silk
ProfileSanNames
```

Certificate-profile subjectAltName count.

::Anchor{id="ValidationLimit.ProfileConstraintSubtrees"}

### `ProfileConstraintSubtrees`

```silk
ProfileConstraintSubtrees
```

Certificate-profile NameConstraints subtree count.

::Anchor{id="ValidationLimit.ProfileNodes"}

### `ProfileNodes`

```silk
ProfileNodes
```

Certificate-profile DER-node count.

::Anchor{id="ValidationLimit.ProfileDepth"}

### `ProfileDepth`

```silk
ProfileDepth
```

Certificate-profile DER nesting depth.

::Anchor{id="ValidationLimit.Arithmetic"}

### `Arithmetic`

```silk
Arithmetic
```

Checked arithmetic representation.

::Anchor{id="ValidationError"}

## `ValidationError`

```silk
pub struct ValidationError
```

Owned scalar evidence for one failed validation call.

::Anchor{id="ValidationError.kind"}

### Field `kind`

```silk
pub kind: ValidationClass
```

Broad failure category.

::Anchor{id="ValidationError.reason"}

### Field `reason`

```silk
pub reason: ValidationReason
```

Stable primary reason.

::Anchor{id="ValidationError.detailReason"}

### Field `detailReason`

```silk
pub detailReason: Option<ValidationReason>
```

First rejected-candidate detail when `reason` is `NoValidPath`.

::Anchor{id="ValidationError.location"}

### Field `location`

```silk
pub location: ValidationLocation
```

Input position associated with the primary or retained detail.

::Anchor{id="ValidationError.extensionIndex"}

### Field `extensionIndex`

```silk
pub extensionIndex: Option<usize>
```

Extension index when a profile failure belongs to an extension.

::Anchor{id="ValidationError.limit"}

### Field `limit`

```silk
pub limit: Option<ValidationLimit>
```

Named bound for a resource-limit failure.

::Anchor{id="ValidationError.offset"}

### Field `offset`

```silk
pub offset: usize
```

Byte offset in the relevant certificate or configured constraint input.

::Anchor{id="RevocationStatus"}

## `RevocationStatus`

```silk
pub enum RevocationStatus
```

Revocation evidence attached to a validated path.

::Anchor{id="RevocationStatus.NotChecked"}

### `NotChecked`

```silk
NotChecked
```

No CRL, OCSP, must-staple, or other revocation check was performed.

::Anchor{id="ValidatedPath"}

## `ValidatedPath`

```silk
pub struct ValidatedPath<'a>
```

One borrowed selected path plus owned caller-order intermediate indices.

::Anchor{id="ValidatedPath.impl"}

## Implementation `ValidatedPath<'a>`

```silk
impl<'a> ValidatedPath<'a>
```

::Anchor{id="ValidatedPath.impl.leaf"}

### Method `leaf`

```silk
pub fn leaf(self: &Self) -> &'a Certificate
```

Borrows the exact caller-supplied leaf certificate.

::Anchor{id="ValidatedPath.impl.anchorIndex"}

### Method `anchorIndex`

```silk
pub fn anchorIndex(self: &Self) -> usize
```

Returns the selected trust anchor's original caller index.

::Anchor{id="ValidatedPath.impl.intermediateCount"}

### Method `intermediateCount`

```silk
pub fn intermediateCount(self: &Self) -> usize
```

Returns the number of selected peer intermediate certificates.

::Anchor{id="ValidatedPath.impl.intermediateIndex"}

### Method `intermediateIndex`

```silk
pub fn intermediateIndex(self: &Self, index: usize) -> Option<usize>
```

Returns one selected intermediate's original caller index, in leaf-to-anchor order.

::Anchor{id="ValidatedPath.impl.validationTime"}

### Method `validationTime`

```silk
pub fn validationTime(self: &Self) -> Instant
```

Returns the copied caller-supplied validation instant.

::Anchor{id="ValidatedPath.impl.revocationStatus"}

### Method `revocationStatus`

```silk
pub fn revocationStatus(self: &Self) -> RevocationStatus
```

Returns `NotChecked` because path validation performs no revocation operation.

::Anchor{id="CertificatePath"}

## `CertificatePath`

```silk
pub struct CertificatePath
```

The namespace for bounded deterministic certificate-path validation.

::Anchor{id="CertificatePath.impl"}

## Implementation `CertificatePath`

```silk
impl CertificatePath
```

::Anchor{id="CertificatePath.impl.validate"}

### Associated function `validate`

```silk
pub effect fn validate<'a>(
    leaf: &'a Certificate,
    intermediates: &'a [Certificate],
    anchors: &'a [TrustAnchor],
    at: &Instant,
    limits: ValidationLimits,
  ) -> Result<ValidatedPath<'a>, ValidationError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Builds and validates the first deterministic TLS-server path to explicit authority.

#### Details

The result borrows `leaf`, `intermediates`, and `anchors` for `'a`. Search tries anchors in
caller order before intermediates in caller order at each depth. Counters span the complete
call and do not reset during backtracking.

#### Gotchas

Zero permits no corresponding input or operation. Work-budget exhaustion is terminal. An
ordinary candidate rejection does not stop a later alternate path.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
