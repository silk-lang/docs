Check one certificate against the TLS server certificate profile, and read its extensions.

## When to use
`silk.certificate_path` uses this module for each certificate of a chain. Use
[`CertificateProfile.inspect`](#CertificateProfile.impl.inspect) directly to check one certificate for a role (leaf, intermediate,
or anchor) and to read its basic constraints, key usage, and other extensions. Use
[`CertificateProfile.verifyIssuedBy`](#CertificateProfile.impl.verifyIssuedBy) to check that one certificate signed another.

## Details
The profile is strict. Keys and signatures must be ECDSA P-256 with SHA-256, ECDSA P-384 with
SHA-384, or RSA with SHA-256 (2048 to 4096 bits). An unknown critical extension or another
algorithm is an error. The result borrows the certificate and does not allocate.

## Errors
- [`ProfileError`](#ProfileError) with the reason, the extension, and the position of the problem.

## Gotchas
A certificate that passes does not mean that you can trust it. This module does not check dates,
the chain, the host name, or revocation.

Import as `CertificateProfile` with `import silk.certificate_profile { CertificateProfile }`.

Public declarations: 10.

::Anchor{id="CertificateRole"}

## `CertificateRole`

```silk
pub enum CertificateRole
```

The certificate's intended position in the restricted TLS-server profile.

::Anchor{id="CertificateRole.ServerLeaf"}

### `ServerLeaf`

```silk
ServerLeaf
```

A peer end-entity certificate inspected for admission to later TLS-server validation.

::Anchor{id="CertificateRole.Intermediate"}

### `Intermediate`

```silk
Intermediate
```

A non-anchor CA certificate below the trust endpoint.

::Anchor{id="CertificateRole.Anchor"}

### `Anchor`

```silk
Anchor
```

An explicitly configured trust endpoint outside the returned path.

::Anchor{id="CertificateKeyKind"}

## `CertificateKeyKind`

```silk
pub enum CertificateKeyKind
```

The admitted public-key algorithm and bounded key profile.

::Anchor{id="CertificateKeyKind.P256"}

### `P256`

```silk
P256
```

An uncompressed validated secp256r1 point.

::Anchor{id="CertificateKeyKind.P384"}

### `P384`

```silk
P384
```

An uncompressed validated secp384r1 point.

::Anchor{id="CertificateKeyKind.Rsa"}

### `Rsa`

```silk
Rsa
```

An odd 2048..4096-bit RSA modulus with exponent 65537.

::Anchor{id="ProfileLimits"}

## `ProfileLimits`

```silk
pub struct ProfileLimits
```

Inclusive budgets for one semantic inspection or configured-constraint validation.

::Anchor{id="ProfileLimits.extensions"}

### Field `extensions`

```silk
pub extensions: usize
```

Maximum number of certificate extensions, including unknown and duplicate OIDs.

::Anchor{id="ProfileLimits.extensionBytes"}

### Field `extensionBytes`

```silk
pub extensionBytes: usize
```

Maximum bytes in each extension value, including opaque unknown noncritical values.

::Anchor{id="ProfileLimits.sanNames"}

### Field `sanNames`

```silk
pub sanNames: usize
```

Maximum names in one subjectAltName value.

::Anchor{id="ProfileLimits.constraintSubtrees"}

### Field `constraintSubtrees`

```silk
pub constraintSubtrees: usize
```

Maximum GeneralSubtree values across one NameConstraints value.

::Anchor{id="ProfileLimits.nodes"}

### Field `nodes`

```silk
pub nodes: usize
```

Maximum traversed extension-value TLV nodes across one operation.

::Anchor{id="ProfileLimits.depth"}

### Field `depth`

```silk
pub depth: usize
```

Maximum traversed extension-value TLV depth. A value root has depth one.

::Anchor{id="ProfileLimits.impl.Copy"}

## Implementation `Copy for ProfileLimits`

```silk
impl Copy for ProfileLimits
```

::Anchor{id="ProfileLimits.impl"}

## Implementation `ProfileLimits`

```silk
impl ProfileLimits
```

::Anchor{id="ProfileLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ProfileLimits
```

Returns 64 extensions, 16384 bytes per value, 256 SAN names, 256 constraint subtrees,
4096 traversed nodes, and depth 16.

::Anchor{id="ProfileClass"}

## `ProfileClass`

```silk
pub enum ProfileClass
```

The broad category of a semantic profile failure.

::Anchor{id="ProfileClass.Malformed"}

### `Malformed`

```silk
Malformed
```

DER or recognized extension content violates the selected schema.

::Anchor{id="ProfileClass.Unsupported"}

### `Unsupported`

```silk
Unsupported
```

A well-formed value is outside the deliberately restricted profile.

::Anchor{id="ProfileClass.ResourceLimit"}

### `ResourceLimit`

```silk
ResourceLimit
```

A configured finite budget or target size bound is exceeded.

::Anchor{id="ProfileOffsetSpace"}

## `ProfileOffsetSpace`

```silk
pub enum ProfileOffsetSpace
```

The byte sequence in which a profile error offset is measured.

::Anchor{id="ProfileOffsetSpace.CertificateDer"}

### `CertificateDer`

```silk
CertificateDer
```

Offset in the complete decoded certificate DER.

::Anchor{id="ProfileOffsetSpace.ConfiguredConstraintDer"}

### `ConfiguredConstraintDer`

```silk
ConfiguredConstraintDer
```

Offset in caller-supplied configured NameConstraints DER.

::Anchor{id="ProfileReason"}

## `ProfileReason`

```silk
pub enum ProfileReason
```

The stable semantic reason for a profile rejection.

::Anchor{id="ProfileReason.Version"}

### `Version`

```silk
Version
```

The certificate version is invalid for the selected role.

::Anchor{id="ProfileReason.Serial"}

### `Serial`

```silk
Serial
```

A path-certificate serial is nonpositive, zero, or longer than 20 content octets.

::Anchor{id="ProfileReason.UniqueIdentifier"}

### `UniqueIdentifier`

```silk
UniqueIdentifier
```

An issuer or subject unique identifier is present.

::Anchor{id="ProfileReason.PublicKey"}

### `PublicKey`

```silk
PublicKey
```

The public-key algorithm, encoding, parameters, or mathematical key is not admitted.

::Anchor{id="ProfileReason.SignatureAlgorithm"}

### `SignatureAlgorithm`

```silk
SignatureAlgorithm
```

The signature algorithm OID or signature BIT STRING metadata is not admitted.

::Anchor{id="ProfileReason.SignatureParameters"}

### `SignatureParameters`

```silk
SignatureParameters
```

A recognized signature algorithm has forbidden, missing, or unsupported parameters.

::Anchor{id="ProfileReason.SignatureAlgorithmMismatch"}

### `SignatureAlgorithmMismatch`

```silk
SignatureAlgorithmMismatch
```

Inner and outer signature identifiers do not denote the same admitted effective algorithm.

::Anchor{id="ProfileReason.Extensions"}

### `Extensions`

```silk
Extensions
```

More certificate extensions are present than the configured bound.

::Anchor{id="ProfileReason.ExtensionBytes"}

### `ExtensionBytes`

```silk
ExtensionBytes
```

One extension value exceeds its configured byte bound.

::Anchor{id="ProfileReason.DuplicateExtension"}

### `DuplicateExtension`

```silk
DuplicateExtension
```

A duplicate extension OID is present.

::Anchor{id="ProfileReason.UnknownCriticalExtension"}

### `UnknownCriticalExtension`

```silk
UnknownCriticalExtension
```

A critical extension has no supported semantics in this profile.

::Anchor{id="ProfileReason.MalformedExtension"}

### `MalformedExtension`

```silk
MalformedExtension
```

A recognized extension violates strict DER or its selected schema.

::Anchor{id="ProfileReason.BasicConstraints"}

### `BasicConstraints`

```silk
BasicConstraints
```

BasicConstraints conflicts with the role or path-length rules.

::Anchor{id="ProfileReason.KeyUsage"}

### `KeyUsage`

```silk
KeyUsage
```

KeyUsage encoding or dependent bits are invalid.

::Anchor{id="ProfileReason.MissingKeyUsage"}

### `MissingKeyUsage`

```silk
MissingKeyUsage
```

A present KeyUsage does not authorize the selected role.

::Anchor{id="ProfileReason.ExtendedKeyUsage"}

### `ExtendedKeyUsage`

```silk
ExtendedKeyUsage
```

ExtendedKeyUsage is empty or malformed.

::Anchor{id="ProfileReason.MissingServerAuth"}

### `MissingServerAuth`

```silk
MissingServerAuth
```

A present ExtendedKeyUsage omits id-kp-serverAuth.

::Anchor{id="ProfileReason.SubjectAltName"}

### `SubjectAltName`

```silk
SubjectAltName
```

subjectAltName is malformed or contains an invalid DNS/IP identity.

::Anchor{id="ProfileReason.EmptySubject"}

### `EmptySubject`

```silk
EmptySubject
```

An empty subject lacks a nonempty critical subjectAltName.

::Anchor{id="ProfileReason.UnsupportedCriticalName"}

### `UnsupportedCriticalName`

```silk
UnsupportedCriticalName
```

A critical subjectAltName contains an unsupported GeneralName alternative.

::Anchor{id="ProfileReason.NameConstraints"}

### `NameConstraints`

```silk
NameConstraints
```

NameConstraints is malformed, empty, noncritical, or used on an end entity.

::Anchor{id="ProfileReason.UnsupportedNameConstraint"}

### `UnsupportedNameConstraint`

```silk
UnsupportedNameConstraint
```

A NameConstraints subtree form is outside the DNS/IP subset.

::Anchor{id="ProfileReason.PolicyProcessing"}

### `PolicyProcessing`

```silk
PolicyProcessing
```

A certificate-policy feature requiring policy-tree processing is present.

::Anchor{id="ProfileReason.TlsFeature"}

### `TlsFeature`

```silk
TlsFeature
```

TLS Feature is present although this profile cannot satisfy must-staple semantics.

::Anchor{id="ProfileReason.Role"}

### `Role`

```silk
Role
```

The certificate role's CA or BasicConstraints policy is violated.

::Anchor{id="ProfileReason.SanNames"}

### `SanNames`

```silk
SanNames
```

A SAN name count exceeds its configured bound.

::Anchor{id="ProfileReason.ConstraintSubtrees"}

### `ConstraintSubtrees`

```silk
ConstraintSubtrees
```

A NameConstraints subtree count exceeds its configured bound.

::Anchor{id="ProfileReason.Nodes"}

### `Nodes`

```silk
Nodes
```

The traversed extension-value node count exceeds its configured bound.

::Anchor{id="ProfileReason.Depth"}

### `Depth`

```silk
Depth
```

The traversed extension-value depth exceeds its configured bound.

::Anchor{id="ProfileReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

Checked size or counter arithmetic cannot be represented.

::Anchor{id="ProfileReason.IssuerName"}

### `IssuerName`

```silk
IssuerName
```

The subject issuer Name DER does not exactly equal the issuer subject Name DER.

::Anchor{id="ProfileReason.SignatureRejected"}

### `SignatureRejected`

```silk
SignatureRejected
```

An admitted cryptographic primitive rejected the retained signature.

::Anchor{id="ProfileReason.NameConstraintViolation"}

### `NameConstraintViolation`

```silk
NameConstraintViolation
```

A subordinate DNS or IP subjectAltName violates one NameConstraints source.

::Anchor{id="ProfileReason.NameComparisons"}

### `NameComparisons`

```silk
NameComparisons
```

The caller-supplied name/subtree comparison budget is exhausted.

::Anchor{id="ProfileError"}

## `ProfileError`

```silk
pub struct ProfileError
```

An owned certificate-profile error with optional extension context and a stable byte offset.

::Anchor{id="ProfileError.kind"}

### Field `kind`

```silk
pub kind: ProfileClass
```

Broad failure category.

::Anchor{id="ProfileError.reason"}

### Field `reason`

```silk
pub reason: ProfileReason
```

Stable semantic failure reason.

::Anchor{id="ProfileError.extensionIndex"}

### Field `extensionIndex`

```silk
pub extensionIndex: Option<usize>
```

Zero-based extension index when the failure belongs to one certificate extension.

::Anchor{id="ProfileError.offsetSpace"}

### Field `offsetSpace`

```silk
pub offsetSpace: ProfileOffsetSpace
```

Coordinate system for `offset`.

::Anchor{id="ProfileError.offset"}

### Field `offset`

```silk
pub offset: usize
```

Byte offset in the selected coordinate system.

::Anchor{id="KeyUsage"}

## `KeyUsage`

```silk
pub struct KeyUsage
```

Parsed KeyUsage bits retained independently of their original DER positions.

::Anchor{id="KeyUsage.digitalSignature"}

### Field `digitalSignature`

```silk
pub digitalSignature: bool
```

digitalSignature bit.

::Anchor{id="KeyUsage.contentCommitment"}

### Field `contentCommitment`

```silk
pub contentCommitment: bool
```

contentCommitment/nonRepudiation bit.

::Anchor{id="KeyUsage.keyEncipherment"}

### Field `keyEncipherment`

```silk
pub keyEncipherment: bool
```

keyEncipherment bit.

::Anchor{id="KeyUsage.dataEncipherment"}

### Field `dataEncipherment`

```silk
pub dataEncipherment: bool
```

dataEncipherment bit.

::Anchor{id="KeyUsage.keyAgreement"}

### Field `keyAgreement`

```silk
pub keyAgreement: bool
```

keyAgreement bit.

::Anchor{id="KeyUsage.keyCertSign"}

### Field `keyCertSign`

```silk
pub keyCertSign: bool
```

keyCertSign bit.

::Anchor{id="KeyUsage.crlSign"}

### Field `crlSign`

```silk
pub crlSign: bool
```

cRLSign bit.

::Anchor{id="KeyUsage.encipherOnly"}

### Field `encipherOnly`

```silk
pub encipherOnly: bool
```

encipherOnly bit.

::Anchor{id="KeyUsage.decipherOnly"}

### Field `decipherOnly`

```silk
pub decipherOnly: bool
```

decipherOnly bit.

::Anchor{id="KeyUsage.impl.Copy"}

## Implementation `Copy for KeyUsage`

```silk
impl Copy for KeyUsage
```

::Anchor{id="ExtendedKeyUsage"}

## `ExtendedKeyUsage`

```silk
pub struct ExtendedKeyUsage
```

Parsed ExtendedKeyUsage facts used by the restricted TLS-server profile.

::Anchor{id="ExtendedKeyUsage.serverAuth"}

### Field `serverAuth`

```silk
pub serverAuth: bool
```

Whether id-kp-serverAuth occurs.

::Anchor{id="ExtendedKeyUsage.anyExtendedKeyUsage"}

### Field `anyExtendedKeyUsage`

```silk
pub anyExtendedKeyUsage: bool
```

Whether anyExtendedKeyUsage occurs. It never substitutes for serverAuth.

::Anchor{id="ExtendedKeyUsage.purposeCount"}

### Field `purposeCount`

```silk
pub purposeCount: usize
```

Number of key-purpose identifiers in the original extension.

::Anchor{id="ExtendedKeyUsage.impl.Copy"}

## Implementation `Copy for ExtendedKeyUsage`

```silk
impl Copy for ExtendedKeyUsage
```

::Anchor{id="CertificateProfile"}

## `CertificateProfile`

```silk
pub struct CertificateProfile<'a>
```

One immutable borrowed semantic view over a complete decoded certificate.

::Anchor{id="CertificateProfile.impl.Copy"}

## Implementation `Copy for CertificateProfile<'a>`

```silk
impl<'a> Copy for CertificateProfile<'a>
```

::Anchor{id="CertificateProfile.impl"}

## Implementation `CertificateProfile<'a>`

```silk
impl<'a> CertificateProfile<'a>
```

::Anchor{id="CertificateProfile.impl.inspect"}

### Associated function `inspect`

```silk
pub fn inspect(
    certificate: &'a Certificate,
    selectedRole: CertificateRole,
    limits: ProfileLimits,
  ) -> Result<CertificateProfile<'a>, ProfileError>
```

Checks `certificate` for the role `selectedRole`, and returns a view of its checked fields.

For a leaf or an intermediate, the inner and outer signature algorithms must match and be
supported. For an anchor, the signature, serial number, dates, and self-signature are not
checked, because you chose to trust it.

#### Errors
- `Failure` with a [`ProfileError`](#ProfileError) if the certificate does not fit the profile for the role
  or goes over `limits`.

#### Gotchas
It does not verify a signature or check dates.

::Anchor{id="CertificateProfile.impl.certificate"}

### Method `certificate`

```silk
pub fn certificate(self: &Self) -> &'a Certificate
```

Borrows the structurally decoded certificate retained by this view.

::Anchor{id="CertificateProfile.impl.certificateRole"}

### Method `certificateRole`

```silk
pub fn certificateRole(self: &Self) -> CertificateRole
```

Returns the role under which this certificate was inspected.

::Anchor{id="CertificateProfile.impl.keyKind"}

### Method `keyKind`

```silk
pub fn keyKind(self: &Self) -> CertificateKeyKind
```

Returns the admitted public-key profile.

::Anchor{id="CertificateProfile.impl.ca"}

### Method `ca`

```silk
pub fn ca(self: &Self) -> bool
```

Returns the admitted BasicConstraints CA value, or false when absent.

::Anchor{id="CertificateProfile.impl.pathLength"}

### Method `pathLength`

```silk
pub fn pathLength(self: &Self) -> Option<usize>
```

Returns the admitted BasicConstraints path length when present.

::Anchor{id="CertificateProfile.impl.keyUsage"}

### Method `keyUsage`

```silk
pub fn keyUsage(self: &Self) -> Option<KeyUsage>
```

Returns admitted KeyUsage facts when the extension was present.

::Anchor{id="CertificateProfile.impl.extendedKeyUsage"}

### Method `extendedKeyUsage`

```silk
pub fn extendedKeyUsage(self: &Self) -> Option<ExtendedKeyUsage>
```

Returns admitted ExtendedKeyUsage facts when the extension was present.

::Anchor{id="CertificateProfile.impl.subjectAltNamesDer"}

### Method `subjectAltNamesDer`

```silk
pub fn subjectAltNamesDer(self: &Self) -> Option<&'a [u8]>
```

Borrows the exact subjectAltName extension-value DER when present.

::Anchor{id="CertificateProfile.impl.nameConstraintsDer"}

### Method `nameConstraintsDer`

```silk
pub fn nameConstraintsDer(self: &Self) -> Option<&'a [u8]>
```

Borrows the exact embedded NameConstraints extension-value DER when present.

::Anchor{id="CertificateProfile.impl.validateConfiguredNameConstraints"}

### Associated function `validateConfiguredNameConstraints`

```silk
pub fn validateConfiguredNameConstraints(
    value: &[u8],
    limits: ProfileLimits,
  ) -> Result<(), ProfileError>
```

Validates strict configured DNS/IP NameConstraints without allocating or retaining input.

::Anchor{id="CertificateProfile.impl.checkNameConstraints"}

### Associated function `checkNameConstraints`

```silk
pub fn checkNameConstraints(
    subject: &CertificateProfile,
    constraintDer: &[u8],
    comparisons: &mut usize,
    maximumComparisons: usize,
    offsetSpace: ProfileOffsetSpace,
  ) -> Result<(), ProfileError>
```

Checks every DNS and IP subjectAltName against one strict NameConstraints value.

#### Details

Exclusions run before permissions. The operation consumes one comparison before each
same-form name/subtree comparison and updates `comparisons` across calls. `offsetSpace`
identifies the coordinate system used by any returned constraint error.

#### Gotchas

The constraint value must first pass [`validateConfiguredNameConstraints`](#CertificateProfile.impl.validateConfiguredNameConstraints) or profile
inspection. The operation checks only one constraint source. Callers must apply all sources.

::Anchor{id="CertificateProfile.impl.verifyIssuedBy"}

### Associated function `verifyIssuedBy`

```silk
pub fn verifyIssuedBy(
    subject: &CertificateProfile,
    issuer: &CertificateProfile,
  ) -> Result<(), ProfileError>
```

Verifies exact issuer-name linkage and the subject's retained original TBS signature.

#### Gotchas

This checks only one edge. It does not establish path, time, constraint, trust, or identity
authentication.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
