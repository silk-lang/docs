Owned X.509 certificates decoded from bounded DER or strict PEM input.

## When to use

Use `Certificate.decodeDer` for one binary certificate or `Certificate.decodePem` for one CERTIFICATE block.
Use `silk.certificate_bundle.CertificateBundle` for multiple PEM certificates.

## Details

Results own their bytes. Accessors borrow the owner and preserve original signed bytes and all extensions.
Input is borrowed during execution. Allocation refusal uses `OutOfMemoryError`; other failures return `DecodeError`.

## Gotchas

Decoding checks structure only. It does not verify signatures, trust, identities, or certificate validity.
PEM rejects explanatory text, unrelated blocks, VT/FF whitespace, and noncanonical base64.

Import as `Certificate` with `import silk.certificate { Certificate }`.

Public declarations: 12.

::Anchor{id="DecodeLimits"}

## `DecodeLimits`

```silk
pub struct DecodeLimits
```

Inclusive resource limits for one decode call. Zero permits no corresponding resource.

::Anchor{id="DecodeLimits.inputBytes"}

### Field `inputBytes`

```silk
pub inputBytes: usize
```

Maximum complete input length, including PEM whitespace.

::Anchor{id="DecodeLimits.certificateBytes"}

### Field `certificateBytes`

```silk
pub certificateBytes: usize
```

Maximum DER length of one certificate, including its tag and length.

::Anchor{id="DecodeLimits.totalDerBytes"}

### Field `totalDerBytes`

```silk
pub totalDerBytes: usize
```

Maximum sum of certificate DER lengths in one call.

::Anchor{id="DecodeLimits.certificates"}

### Field `certificates`

```silk
pub certificates: usize
```

Maximum certificate count, including duplicates.

::Anchor{id="DecodeLimits.fieldBytes"}

### Field `fieldBytes`

```silk
pub fieldBytes: usize
```

Maximum content length of each primitive or open field, including the BIT STRING count octet.

::Anchor{id="DecodeLimits.extensions"}

### Field `extensions`

```silk
pub extensions: usize
```

Maximum extension count per certificate, including duplicates.

::Anchor{id="DecodeLimits.depth"}

### Field `depth`

```silk
pub depth: usize
```

Maximum traversed TLV depth; the certificate root has depth one.

::Anchor{id="DecodeLimits.nodes"}

### Field `nodes`

```silk
pub nodes: usize
```

Maximum traversed TLV count per certificate; opaque payloads do not add nodes.

::Anchor{id="DecodeLimits.impl.Copy"}

## Implementation `Copy for DecodeLimits`

```silk
impl Copy for DecodeLimits
```

::Anchor{id="DecodeLimits.impl"}

## Implementation `DecodeLimits`

```silk
impl DecodeLimits
```

::Anchor{id="DecodeLimits.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> DecodeLimits
```

Returns finite default limits: 16 MiB input, 1 MiB certificates, 8 MiB total DER, and 1024 certificates.

#### Details

Fields are limited to 256 KiB, extensions to 256, depth to 32, and nodes to 65536 per certificate.

::Anchor{id="DecodeClass"}

## `DecodeClass`

```silk
pub enum DecodeClass
```

The category of a decoding failure.

::Anchor{id="DecodeClass.Malformed"}

### `Malformed`

```silk
Malformed
```

The input violates the accepted encoding or schema.

::Anchor{id="DecodeClass.Unsupported"}

### `Unsupported`

```silk
Unsupported
```

The version or PEM label is outside the selected format.

::Anchor{id="DecodeClass.ResourceLimit"}

### `ResourceLimit`

```silk
ResourceLimit
```

A configured limit or machine size bound is exceeded.

::Anchor{id="DecodeReason"}

## `DecodeReason`

```silk
pub enum DecodeReason
```

The specific failed decoding rule.

::Anchor{id="DecodeReason.EmptyInput"}

### `EmptyInput`

```silk
EmptyInput
```

The input contains no certificate.

::Anchor{id="DecodeReason.PemSyntax"}

### `PemSyntax`

```silk
PemSyntax
```

A PEM marker or document byte is invalid.

::Anchor{id="DecodeReason.Base64"}

### `Base64`

```silk
Base64
```

Base64 alphabet, padding, or pad bits are invalid.

::Anchor{id="DecodeReason.TrailingData"}

### `TrailingData`

```silk
TrailingData
```

Data follows the required single certificate.

::Anchor{id="DecodeReason.Truncated"}

### `Truncated`

```silk
Truncated
```

Required input ends before its declared boundary.

::Anchor{id="DecodeReason.Tag"}

### `Tag`

```silk
Tag
```

A tag encoding or primitive/constructed bit is invalid.

::Anchor{id="DecodeReason.Length"}

### `Length`

```silk
Length
```

A DER length encoding is not canonical.

::Anchor{id="DecodeReason.Integer"}

### `Integer`

```silk
Integer
```

An INTEGER is empty or is not minimally encoded.

::Anchor{id="DecodeReason.Boolean"}

### `Boolean`

```silk
Boolean
```

A BOOLEAN is not one canonical octet.

::Anchor{id="DecodeReason.BitString"}

### `BitString`

```silk
BitString
```

A BIT STRING count or unused tail bits are invalid.

::Anchor{id="DecodeReason.Oid"}

### `Oid`

```silk
Oid
```

An OID subidentifier is empty, unfinished, or nonminimal.

::Anchor{id="DecodeReason.SetOrder"}

### `SetOrder`

```silk
SetOrder
```

An RDN SET OF is not in DER order.

::Anchor{id="DecodeReason.DefaultValue"}

### `DefaultValue`

```silk
DefaultValue
```

A default value is explicitly encoded.

::Anchor{id="DecodeReason.Time"}

### `Time`

```silk
Time
```

A certificate time or calendar date is invalid.

::Anchor{id="DecodeReason.Schema"}

### `Schema`

```silk
Schema
```

The certificate fields violate the selected schema.

::Anchor{id="DecodeReason.StringEncoding"}

### `StringEncoding`

```silk
StringEncoding
```

An ASN.1 string encoding is invalid.

::Anchor{id="DecodeReason.Version"}

### `Version`

```silk
Version
```

The certificate version is not v1, v2, or v3.

::Anchor{id="DecodeReason.PemLabel"}

### `PemLabel`

```silk
PemLabel
```

The PEM label is not CERTIFICATE.

::Anchor{id="DecodeReason.InputBytes"}

### `InputBytes`

```silk
InputBytes
```

The complete input exceeds its limit.

::Anchor{id="DecodeReason.CertificateBytes"}

### `CertificateBytes`

```silk
CertificateBytes
```

One certificate exceeds its DER byte limit.

::Anchor{id="DecodeReason.TotalDerBytes"}

### `TotalDerBytes`

```silk
TotalDerBytes
```

The aggregate DER bytes exceed their limit.

::Anchor{id="DecodeReason.Certificates"}

### `Certificates`

```silk
Certificates
```

The certificate count exceeds its limit.

::Anchor{id="DecodeReason.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

A primitive or open field exceeds its content limit.

::Anchor{id="DecodeReason.Extensions"}

### `Extensions`

```silk
Extensions
```

The extension count exceeds its limit.

::Anchor{id="DecodeReason.Depth"}

### `Depth`

```silk
Depth
```

The traversed TLV depth exceeds its limit.

::Anchor{id="DecodeReason.Nodes"}

### `Nodes`

```silk
Nodes
```

The traversed TLV count exceeds its limit.

::Anchor{id="DecodeReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A length, tag number, or allocation size exceeds the target size range.

::Anchor{id="DecodeOffsetSpace"}

## `DecodeOffsetSpace`

```silk
pub enum DecodeOffsetSpace
```

The byte sequence used by a diagnostic offset.

::Anchor{id="DecodeOffsetSpace.Input"}

### `Input`

```silk
Input
```

The offset is in the original supplied input.

::Anchor{id="DecodeOffsetSpace.Der"}

### `Der`

```silk
Der
```

The offset is in the DER decoded from the indicated PEM block.

::Anchor{id="CertificateVersion"}

## `CertificateVersion`

```silk
pub enum CertificateVersion
```

The structural X.509 certificate version.

::Anchor{id="CertificateVersion.V1"}

### `V1`

```silk
V1
```

Version one, encoded by an absent version field.

::Anchor{id="CertificateVersion.V2"}

### `V2`

```silk
V2
```

Version two, encoded as INTEGER one.

::Anchor{id="CertificateVersion.V3"}

### `V3`

```silk
V3
```

Version three, encoded as INTEGER two.

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

A decoding failure without a borrow of the input.

::Anchor{id="DecodeError.kind"}

### Field `kind`

```silk
pub kind: DecodeClass
```

The failure category.

::Anchor{id="DecodeError.reason"}

### Field `reason`

```silk
pub reason: DecodeReason
```

The failed rule.

::Anchor{id="DecodeError.certificateIndex"}

### Field `certificateIndex`

```silk
pub certificateIndex: usize
```

The zero-based attempted certificate index; document failures use zero.

::Anchor{id="DecodeError.offsetSpace"}

### Field `offsetSpace`

```silk
pub offsetSpace: DecodeOffsetSpace
```

The coordinate system for the offset.

::Anchor{id="DecodeError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The offending byte, TLV tag, or end offset when required input is missing.

::Anchor{id="DecodeError.impl.Copy"}

## Implementation `Copy for DecodeError`

```silk
impl Copy for DecodeError
```

::Anchor{id="CertificateTime"}

## `CertificateTime`

```silk
pub struct CertificateTime
```

A decoded Gregorian certificate time in UTC.

::Anchor{id="CertificateTime.year"}

### Field `year`

```silk
pub year: u16
```

The full year, from 1 through 9999.

::Anchor{id="CertificateTime.month"}

### Field `month`

```silk
pub month: u8
```

The month, from 1 through 12.

::Anchor{id="CertificateTime.day"}

### Field `day`

```silk
pub day: u8
```

The valid day of the month.

::Anchor{id="CertificateTime.hour"}

### Field `hour`

```silk
pub hour: u8
```

The hour, from 0 through 23.

::Anchor{id="CertificateTime.minute"}

### Field `minute`

```silk
pub minute: u8
```

The minute, from 0 through 59.

::Anchor{id="CertificateTime.second"}

### Field `second`

```silk
pub second: u8
```

The second, from 0 through 59.

::Anchor{id="CertificateTime.impl.Copy"}

## Implementation `Copy for CertificateTime`

```silk
impl Copy for CertificateTime
```

::Anchor{id="BitStringView"}

## `BitStringView`

```silk
pub struct BitStringView<'a>
```

A borrowed BIT STRING payload with its unused-bit metadata.

::Anchor{id="BitStringView.bytes"}

### Field `bytes`

```silk
pub bytes: &'a [u8]
```

The original payload, excluding its initial count octet.

::Anchor{id="BitStringView.unusedBits"}

### Field `unusedBits`

```silk
pub unusedBits: u8
```

The number of zero low bits in the last payload octet.

::Anchor{id="AlgorithmView"}

## `AlgorithmView`

```silk
pub struct AlgorithmView<'a>
```

A borrowed AlgorithmIdentifier with uninterpreted parameters.

::Anchor{id="AlgorithmView.der"}

### Field `der`

```silk
pub der: &'a [u8]
```

The complete original AlgorithmIdentifier TLV.

::Anchor{id="AlgorithmView.oid"}

### Field `oid`

```silk
pub oid: &'a [u8]
```

The canonical OID content octets, without tag or length.

::Anchor{id="AlgorithmView.parametersDer"}

### Field `parametersDer`

```silk
pub parametersDer: Option<&'a [u8]>
```

The complete parameter TLV; absence differs from explicit NULL.

::Anchor{id="CertificateOffsets"}

## `CertificateOffsets`

```silk
pub struct CertificateOffsets
```

Stable byte offsets for semantically significant fields in the retained certificate DER.

::Anchor{id="CertificateOffsets.tbs"}

### Field `tbs`

```silk
pub tbs: usize
```

Complete TBSCertificate tag.

::Anchor{id="CertificateOffsets.version"}

### Field `version`

```silk
pub version: usize
```

Explicit version wrapper, or the first TBSCertificate field when version is absent.

::Anchor{id="CertificateOffsets.serial"}

### Field `serial`

```silk
pub serial: usize
```

Serial-number INTEGER tag.

::Anchor{id="CertificateOffsets.tbsSignatureAlgorithm"}

### Field `tbsSignatureAlgorithm`

```silk
pub tbsSignatureAlgorithm: usize
```

Inner TBSCertificate signature AlgorithmIdentifier tag.

::Anchor{id="CertificateOffsets.issuer"}

### Field `issuer`

```silk
pub issuer: usize
```

Issuer Name tag.

::Anchor{id="CertificateOffsets.subject"}

### Field `subject`

```silk
pub subject: usize
```

Subject Name tag.

::Anchor{id="CertificateOffsets.spki"}

### Field `spki`

```silk
pub spki: usize
```

SubjectPublicKeyInfo tag.

::Anchor{id="CertificateOffsets.publicKey"}

### Field `publicKey`

```silk
pub publicKey: usize
```

SubjectPublicKey BIT STRING tag.

::Anchor{id="CertificateOffsets.signatureAlgorithm"}

### Field `signatureAlgorithm`

```silk
pub signatureAlgorithm: usize
```

Outer signature AlgorithmIdentifier tag.

::Anchor{id="CertificateOffsets.signature"}

### Field `signature`

```silk
pub signature: usize
```

Signature-value BIT STRING tag.

::Anchor{id="CertificateOffsets.issuerUniqueId"}

### Field `issuerUniqueId`

```silk
pub issuerUniqueId: usize
```

Issuer unique-identifier tag, or the TBSCertificate tag when absent.

::Anchor{id="CertificateOffsets.subjectUniqueId"}

### Field `subjectUniqueId`

```silk
pub subjectUniqueId: usize
```

Subject unique-identifier tag, or the TBSCertificate tag when absent.

::Anchor{id="ExtensionView"}

## `ExtensionView`

```silk
pub struct ExtensionView<'a>
```

A borrowed raw extension, including unknown or duplicate extensions.

::Anchor{id="ExtensionView.offset"}

### Field `offset`

```silk
pub offset: usize
```

Byte offset of the complete Extension TLV in the certificate DER.

::Anchor{id="ExtensionView.valueOffset"}

### Field `valueOffset`

```silk
pub valueOffset: usize
```

Byte offset of the extension value content in the certificate DER.

::Anchor{id="ExtensionView.der"}

### Field `der`

```silk
pub der: &'a [u8]
```

The complete original Extension TLV.

::Anchor{id="ExtensionView.oid"}

### Field `oid`

```silk
pub oid: &'a [u8]
```

The canonical OID content octets, without tag or length.

::Anchor{id="ExtensionView.critical"}

### Field `critical`

```silk
pub critical: bool
```

The critical bit, false when absent.

::Anchor{id="ExtensionView.value"}

### Field `value`

```silk
pub value: &'a [u8]
```

The exact OCTET STRING content, without ASN.1 interpretation.

::Anchor{id="Certificate"}

## `Certificate`

```silk
pub struct Certificate
```

An immutable owned certificate that preserves its original DER and all raw extensions.

### Details

Accessors borrow this owner. Dropping the certificate releases all owned storage.
Unknown algorithms, duplicate extensions, and policy-invalid serials remain available to independent validators.

::Anchor{id="Certificate.impl"}

## Implementation `Certificate`

```silk
impl Certificate
```

::Anchor{id="Certificate.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(self: &Self) -> Certificate ! OutOfMemoryError ? &mut Allocator
```

Copies this decoded certificate into independent owned storage without reinterpreting it.

#### Details

The copy preserves every original DER byte, checked field offset, algorithm spelling, and raw
extension in source order. Allocation refusal releases partial storage and returns
`OutOfMemoryError`; no semantic validation is performed.

::Anchor{id="Certificate.impl.decodeDer"}

### Associated function `decodeDer`

```silk
pub effect fn decodeDer(input: &[u8], limits: DecodeLimits) -> Result<Certificate, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Decodes exactly one DER certificate into independent owned storage.

#### Details

Limits are inclusive. Structural failures return `DecodeError`; allocation refusal uses `OutOfMemoryError`.
No partial result escapes. The result retains no input borrow. Trailing bytes, including whitespace, fail.

#### Gotchas

Success does not verify signatures, trust, names, or current validity. Extensions remain opaque.

::Anchor{id="Certificate.impl.decodePem"}

### Associated function `decodePem`

```silk
pub effect fn decodePem(input: &[u8], limits: DecodeLimits) -> Result<Certificate, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Decodes exactly one strict CERTIFICATE PEM block into independent owned storage.

#### Details

The parser accepts SP, HT, LF, CRLF, and CR whitespace, with canonical base64 padding and pad bits.
Other labels are unsupported. Text outside markers, malformed markers, and a second block fail.
Allocation refusal uses `OutOfMemoryError`; no partial certificate escapes.

#### Gotchas

This strict profile rejects explanatory text and VT/FF that permissive RFC 7468 readers can ignore.
Success does not establish trust or validate a signature.

::Anchor{id="Certificate.impl.tbsDer"}

### Method `tbsDer`

```silk
pub fn tbsDer(self: &Self) -> &[u8]
```

Borrows the complete original signed TBSCertificate TLV; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.issuerDer"}

### Method `issuerDer`

```silk
pub fn issuerDer(self: &Self) -> &[u8]
```

Borrows the complete issuer Name TLV, without normalization; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.subjectDer"}

### Method `subjectDer`

```silk
pub fn subjectDer(self: &Self) -> &[u8]
```

Borrows the complete subject Name TLV, without normalization; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.validityDer"}

### Method `validityDer`

```silk
pub fn validityDer(self: &Self) -> &[u8]
```

Borrows the complete original Validity TLV; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.spkiDer"}

### Method `spkiDer`

```silk
pub fn spkiDer(self: &Self) -> &[u8]
```

Borrows the complete original SubjectPublicKeyInfo TLV; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.der"}

### Method `der`

```silk
pub fn der(self: &Self) -> &[u8]
```

Borrows all original DER bytes; the view cannot outlive this owner.

::Anchor{id="Certificate.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> CertificateVersion
```

Returns the structural certificate version without imposing validation policy.

::Anchor{id="Certificate.impl.offsets"}

### Method `offsets`

```silk
pub fn offsets(self: &Self) -> CertificateOffsets
```

Returns stable byte offsets for semantic diagnostics over the retained DER.

::Anchor{id="Certificate.impl.serial"}

### Method `serial`

```silk
pub fn serial(self: &Self) -> &[u8]
```

Borrows minimal signed INTEGER content, including a required sign octet; the view borrows this owner.

::Anchor{id="Certificate.impl.notBefore"}

### Method `notBefore`

```silk
pub fn notBefore(self: &Self) -> CertificateTime
```

Returns the decoded UTC lower validity boundary without consulting a clock.

::Anchor{id="Certificate.impl.notAfter"}

### Method `notAfter`

```silk
pub fn notAfter(self: &Self) -> CertificateTime
```

Returns the decoded UTC upper validity boundary without checking interval order.

::Anchor{id="Certificate.impl.publicKey"}

### Method `publicKey`

```silk
pub fn publicKey<'a>(self: &'a Self) -> BitStringView<'a>
```

Borrows the original subjectPublicKey payload and unused-bit count; the view borrows this owner.

::Anchor{id="Certificate.impl.signature"}

### Method `signature`

```silk
pub fn signature<'a>(self: &'a Self) -> BitStringView<'a>
```

Borrows the original signatureValue payload and unused-bit count; the view borrows this owner.

::Anchor{id="Certificate.impl.publicKeyAlgorithm"}

### Method `publicKeyAlgorithm`

```silk
pub fn publicKeyAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Borrows the SPKI AlgorithmIdentifier, preserving parameter absence and original encoding.

::Anchor{id="Certificate.impl.tbsSignatureAlgorithm"}

### Method `tbsSignatureAlgorithm`

```silk
pub fn tbsSignatureAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Borrows the TBSCertificate signature AlgorithmIdentifier, preserving parameter absence and original encoding.

::Anchor{id="Certificate.impl.signatureAlgorithm"}

### Method `signatureAlgorithm`

```silk
pub fn signatureAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Borrows the outer signature AlgorithmIdentifier, preserving parameter absence and original encoding.

::Anchor{id="Certificate.impl.issuerUniqueId"}

### Method `issuerUniqueId`

```silk
pub fn issuerUniqueId<'a>(self: &'a Self) -> Option<BitStringView<'a>>
```

Borrows the optional unique ID and unused-bit count; absence returns `None`. The view borrows this owner.

::Anchor{id="Certificate.impl.subjectUniqueId"}

### Method `subjectUniqueId`

```silk
pub fn subjectUniqueId<'a>(self: &'a Self) -> Option<BitStringView<'a>>
```

Borrows the optional unique ID and unused-bit count; absence returns `None`. The view borrows this owner.

::Anchor{id="Certificate.impl.extensionCount"}

### Method `extensionCount`

```silk
pub fn extensionCount(self: &Self) -> usize
```

Returns the extension count, including duplicates and unknown OIDs.

::Anchor{id="Certificate.impl.extension"}

### Method `extension`

```silk
pub fn extension<'a>(self: &'a Self, index: usize) -> Option<ExtensionView<'a>>
```

Borrows an extension in input order, or returns `None` when the index is out of range.

#### Details

The value is exact OCTET STRING content. Unknown and duplicate OIDs remain present. The view borrows this owner.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
