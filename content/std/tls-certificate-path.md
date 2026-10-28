Validate the certificate chain of a TLS server, from its leaf certificate to a trust anchor.

## When to use
Call [`CertificatePath.validate`](#CertificatePath.impl.validate) with the certificates that a server sent and your
`TrustAnchor` list, before you trust the server. After it succeeds, check the host name with
`silk.tls.https_identity`, and check the TLS CertificateVerify and Finished messages.
`silk.tls.client` does all of these steps for you.

## Details
The validator tries to build a path from the leaf, through the intermediates, to an anchor. At
each step it tries the anchors first and then the intermediates, in the order that you gave
them, and it backtracks when a candidate fails. It checks signatures, validity dates at the
[`Instant`](/docs/std/system-system-clock#Instant) that you give, basic constraints, key usage, path length, and DNS and IP name
constraints. [`ValidationLimits`](#ValidationLimits) bound all work, so a hostile chain cannot make it run for
long.

## Errors
- [`ValidationError`](#ValidationError) if no valid path exists, an input is not valid, or a limit is exceeded.
  `reason`, `location`, and `offset` tell you what failed and where.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
A [`ValidatedPath`](#ValidatedPath) does not authenticate a TLS connection by itself. Revocation (CRL and OCSP),
certificate transparency, fetching missing intermediates, and browser root policies are not
checked.

Import as `CertificatePath` with `import silk.tls.certificate_path { CertificatePath }`.

Public declarations: 9.

::Anchor{id="ValidationLimits"}

## `ValidationLimits`

```silk
pub struct ValidationLimits
```

The limits for one validation call. Each limit is inclusive, and 0 allows nothing.
[`ValidationLimits.defaults`](#ValidationLimits.impl.defaults) gives safe values.

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

Returns the default limits: 64 peer certificates of up to 64 KiB each and 1 MiB in total, 1024
anchors and 16 MiB of anchor data, paths of up to 8 certificates, 4096 issuer candidates, 100
signature checks, 100 complete paths, 250000 name comparisons, and the profile defaults.

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

::Anchor{id="ValidationClass.impl.Debug"}

## Implementation `Debug for ValidationClass`

```silk
impl Debug for ValidationClass
```

::Anchor{id="ValidationClass.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidInput`.

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

::Anchor{id="ValidationReason.impl.Debug"}

## Implementation `Debug for ValidationReason`

```silk
impl Debug for ValidationReason
```

::Anchor{id="ValidationReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `UnsupportedVersion`.

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

::Anchor{id="ValidationLocation.impl.Debug"}

## Implementation `Debug for ValidationLocation`

```silk
impl Debug for ValidationLocation
```

::Anchor{id="ValidationLocation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `Leaf`.

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

::Anchor{id="ValidationLimit.impl.Debug"}

## Implementation `Debug for ValidationLimit`

```silk
impl Debug for ValidationLimit
```

::Anchor{id="ValidationLimit.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `PeerCertificates`.

::Anchor{id="ValidationError"}

## `ValidationError`

```silk
pub struct ValidationError
```

The error of one failed [`CertificatePath.validate`](#CertificatePath.impl.validate) call.

### Details

`reason`, `location`, and `offset` tell what failed and where. When no path is valid, `reason`
is `NoValidPath` and `detailReason` gives the first rejection. It owns its values and does not
borrow the input.

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

::Anchor{id="ValidationError.impl.Debug"}

## Implementation `Debug for ValidationError`

```silk
impl Debug for ValidationError
```

::Anchor{id="ValidationError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `ValidationError { kind: ..., reason: ..., ... }`.

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

A path that passed validation. It borrows the certificates and anchors that you gave.

The intermediates are given as indexes into your list, from the leaf toward the anchor.

### Gotchas

A validated path does not authenticate a TLS connection by itself. Check the host name with
`silk.tls.https_identity`, and check the TLS CertificateVerify and Finished messages. Revocation
(CRL and OCSP), certificate transparency, fetching missing intermediates, and browser root
policies are not checked.

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

Returns the leaf certificate.

::Anchor{id="ValidatedPath.impl.anchorIndex"}

### Method `anchorIndex`

```silk
pub fn anchorIndex(self: &Self) -> usize
```

Returns the index of the trust anchor that the path ends at, in your anchor list.

::Anchor{id="ValidatedPath.impl.intermediateCount"}

### Method `intermediateCount`

```silk
pub fn intermediateCount(self: &Self) -> usize
```

Returns the number of intermediate certificates in the path.

::Anchor{id="ValidatedPath.impl.intermediateIndex"}

### Method `intermediateIndex`

```silk
pub fn intermediateIndex(self: &Self, index: usize) -> Option<usize>
```

Returns the index in your intermediate list of the path certificate at `index`, counted from
the leaf, or `None` if `index` is out of range.

::Anchor{id="ValidatedPath.impl.validationTime"}

### Method `validationTime`

```silk
pub fn validationTime(self: &Self) -> Instant
```

Returns the time that the dates were checked at.

::Anchor{id="ValidatedPath.impl.revocationStatus"}

### Method `revocationStatus`

```silk
pub fn revocationStatus(self: &Self) -> RevocationStatus
```

Returns `NotChecked`, because path validation does not check revocation.

::Anchor{id="CertificatePath"}

## `CertificatePath`

```silk
pub struct CertificatePath
```

Functions that validate the certificate chain of a TLS server, from its leaf certificate to a
trust anchor.

### When to use

Call [`CertificatePath.validate`](#CertificatePath.impl.validate) with the certificates that a server sent and your
`TrustAnchor` list, before you trust the server. `silk.tls.client` does this and the other
TLS checks for you.

### Gotchas

A [`ValidatedPath`](#ValidatedPath) does not authenticate a TLS connection by itself. Revocation (CRL and OCSP),
certificate transparency, fetching missing intermediates, and browser root policies are not
checked.

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

Finds and checks a path from `leaf` through `intermediates` to one of `anchors`, at time `at`.

At each step it tries the anchors first and then the intermediates, in the order that you
gave them, and it backtracks when a candidate fails. It checks signatures, validity dates at
`at`, basic constraints, key usage, path length, and DNS and IP name constraints. `limits`
bound all work, so a hostile chain cannot make it run for long.

It returns the first valid path that it finds. A candidate that fails does not stop the
search, but each limit counts across the whole call. The result borrows `leaf`,
`intermediates`, and `anchors`.

#### Errors
- `Failure` with a [`ValidationError`](#ValidationError). If no path is valid, `reason` is `NoValidPath` and
  `detailReason` gives the first rejection.
- `OutOfMemoryError` if the `Allocator` fails.

#### Gotchas
A valid path does not authenticate a TLS connection by itself. After it succeeds, check the
host name with `silk.tls.https_identity`, and check the TLS CertificateVerify and Finished
messages. Revocation (CRL and OCSP), certificate transparency, fetching missing
intermediates, and browser root policies are not checked.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
