Decode one X.509 certificate from DER or PEM, and read its fields.

## When to use
Use [`Certificate.decodePem`](#Certificate.impl.decodePem) for a `.pem` or `.crt` file with one `CERTIFICATE` block, and
[`Certificate.decodeDer`](#Certificate.impl.decodeDer) for binary DER, such as a certificate from a TLS handshake. For a file
with more than one certificate, use `silk.certificate_bundle`.

## Details
A [`Certificate`](#Certificate) owns a copy of its DER bytes. The accessors return slices of that DER, such as
[`Certificate.subjectDer`](#Certificate.impl.subjectDer) or [`Certificate.tbsDer`](#Certificate.impl.tbsDer), and decoded values, such as
[`Certificate.notAfter`](#Certificate.impl.notAfter). Nothing is normalized: names, algorithms, and extensions keep their
original bytes, and unknown or duplicate extensions stay available. [`DecodeLimits`](#DecodeLimits) bound the
work for input that you do not control.

## Errors
- [`DecodeError`](#DecodeError) if the input is not a valid certificate or goes over a limit. `reason` gives
  the rule, and `offset` with `offsetSpace` gives the position.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
Decoding checks only the structure. It does not verify the signature, the chain, the names, or
the dates. Use `silk.certificate_path` for that. The PEM decoder is strict: text outside the
block, other labels, and non-canonical Base64 are errors.

## Examples
### Report where a PEM certificate is broken
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.certificate { Certificate, DecodeError, DecodeLimits, DecodeReason }
import silk.effect { Effect }
import silk.result { Result }

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let pem = b"-----BEGIN CERTIFICATE-----\n!!!!\n-----END CERTIFICATE-----\n"
  let decoded = run Certificate.decodePem(pem, DecodeLimits.defaults())
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move decoded {
    Result<Certificate, DecodeError>.Failure { error } => {
      // `!` is not a Base64 character.
      if error.reason != DecodeReason.Base64 {
        return 1
      }
      return 0
    }
    Result<Certificate, DecodeError>.Success { value: _ } => 1
  }
}
```

Import as `Certificate` with `import silk.certificate { Certificate }`.

Public declarations: 12.

::Anchor{id="DecodeLimits"}

## `DecodeLimits`

```silk
pub struct DecodeLimits
```

The resource limits for one decode call. Each limit is inclusive, and 0 allows nothing.
[`DecodeLimits.defaults`](#DecodeLimits.impl.defaults) gives safe values.

::Anchor{id="DecodeLimits.inputBytes"}

### Field `inputBytes`

```silk
pub inputBytes: usize
```

The maximum input length, with PEM whitespace.

::Anchor{id="DecodeLimits.certificateBytes"}

### Field `certificateBytes`

```silk
pub certificateBytes: usize
```

The maximum DER length of one certificate.

::Anchor{id="DecodeLimits.totalDerBytes"}

### Field `totalDerBytes`

```silk
pub totalDerBytes: usize
```

The maximum DER length of all certificates together.

::Anchor{id="DecodeLimits.certificates"}

### Field `certificates`

```silk
pub certificates: usize
```

The maximum number of certificates, with duplicates.

::Anchor{id="DecodeLimits.fieldBytes"}

### Field `fieldBytes`

```silk
pub fieldBytes: usize
```

The maximum content length of one field.

::Anchor{id="DecodeLimits.extensions"}

### Field `extensions`

```silk
pub extensions: usize
```

The maximum number of extensions in one certificate.

::Anchor{id="DecodeLimits.depth"}

### Field `depth`

```silk
pub depth: usize
```

The maximum nesting depth of DER values. The certificate itself has depth 1.

::Anchor{id="DecodeLimits.nodes"}

### Field `nodes`

```silk
pub nodes: usize
```

The maximum number of DER values in one certificate.

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

Returns the default limits: 16 MiB of input, 1 MiB for each certificate, 8 MiB of DER in
total, 1024 certificates, 256 KiB for each field, 256 extensions, a depth of 32, and 65536 DER
values for each certificate.

::Anchor{id="DecodeClass"}

## `DecodeClass`

```silk
pub enum DecodeClass
```

The kind of a [`DecodeError`](#DecodeError).

::Anchor{id="DecodeClass.Malformed"}

### `Malformed`

```silk
Malformed
```

The input breaks a rule of PEM, DER, or the X.509 structure.

::Anchor{id="DecodeClass.Unsupported"}

### `Unsupported`

```silk
Unsupported
```

The input is valid, but its version or PEM label is not supported.

::Anchor{id="DecodeClass.ResourceLimit"}

### `ResourceLimit`

```silk
ResourceLimit
```

The input goes over a [`DecodeLimits`](#DecodeLimits) value or a size that the target can hold.

::Anchor{id="DecodeReason"}

## `DecodeReason`

```silk
pub enum DecodeReason
```

The rule that a [`DecodeError`](#DecodeError) broke.

::Anchor{id="DecodeReason.EmptyInput"}

### `EmptyInput`

```silk
EmptyInput
```

The input has no certificate.

::Anchor{id="DecodeReason.PemSyntax"}

### `PemSyntax`

```silk
PemSyntax
```

A PEM marker or a byte between the markers is not valid.

::Anchor{id="DecodeReason.Base64"}

### `Base64`

```silk
Base64
```

The Base64 has a character, padding, or unused bits that are not valid.

::Anchor{id="DecodeReason.TrailingData"}

### `TrailingData`

```silk
TrailingData
```

There are bytes after the one certificate that the function reads.

::Anchor{id="DecodeReason.Truncated"}

### `Truncated`

```silk
Truncated
```

The input ends before a value is complete.

::Anchor{id="DecodeReason.Tag"}

### `Tag`

```silk
Tag
```

A DER tag is not valid.

::Anchor{id="DecodeReason.Length"}

### `Length`

```silk
Length
```

A DER length is not in its shortest form.

::Anchor{id="DecodeReason.Integer"}

### `Integer`

```silk
Integer
```

An INTEGER is empty or not in its shortest form.

::Anchor{id="DecodeReason.Boolean"}

### `Boolean`

```silk
Boolean
```

A BOOLEAN is not one byte of `0x00` or `0xff`.

::Anchor{id="DecodeReason.BitString"}

### `BitString`

```silk
BitString
```

The unused-bit count of a BIT STRING, or its unused bits, are not valid.

::Anchor{id="DecodeReason.Oid"}

### `Oid`

```silk
Oid
```

An object identifier is not valid.

::Anchor{id="DecodeReason.SetOrder"}

### `SetOrder`

```silk
SetOrder
```

The values of a SET OF in a name are not in DER order.

::Anchor{id="DecodeReason.DefaultValue"}

### `DefaultValue`

```silk
DefaultValue
```

A field that has its default value is encoded. DER does not allow it.

::Anchor{id="DecodeReason.Time"}

### `Time`

```silk
Time
```

A time or date is not valid.

::Anchor{id="DecodeReason.Schema"}

### `Schema`

```silk
Schema
```

The fields do not have the structure of an X.509 certificate.

::Anchor{id="DecodeReason.StringEncoding"}

### `StringEncoding`

```silk
StringEncoding
```

A text field does not follow its string type.

::Anchor{id="DecodeReason.Version"}

### `Version`

```silk
Version
```

The version is not v1, v2, or v3.

::Anchor{id="DecodeReason.PemLabel"}

### `PemLabel`

```silk
PemLabel
```

The PEM label is not `CERTIFICATE`.

::Anchor{id="DecodeReason.InputBytes"}

### `InputBytes`

```silk
InputBytes
```

The input is longer than `inputBytes`.

::Anchor{id="DecodeReason.CertificateBytes"}

### `CertificateBytes`

```silk
CertificateBytes
```

A certificate is longer than `certificateBytes`.

::Anchor{id="DecodeReason.TotalDerBytes"}

### `TotalDerBytes`

```silk
TotalDerBytes
```

All certificates together are longer than `totalDerBytes`.

::Anchor{id="DecodeReason.Certificates"}

### `Certificates`

```silk
Certificates
```

There are more certificates than `certificates`.

::Anchor{id="DecodeReason.FieldBytes"}

### `FieldBytes`

```silk
FieldBytes
```

A field is longer than `fieldBytes`.

::Anchor{id="DecodeReason.Extensions"}

### `Extensions`

```silk
Extensions
```

A certificate has more extensions than `extensions`.

::Anchor{id="DecodeReason.Depth"}

### `Depth`

```silk
Depth
```

The DER values nest deeper than `depth`.

::Anchor{id="DecodeReason.Nodes"}

### `Nodes`

```silk
Nodes
```

A certificate has more DER values than `nodes`.

::Anchor{id="DecodeReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A length, a tag number, or an allocation size does not fit in `usize`.

::Anchor{id="DecodeOffsetSpace"}

## `DecodeOffsetSpace`

```silk
pub enum DecodeOffsetSpace
```

The bytes that [`DecodeError.offset`](#DecodeError.offset) counts in.

::Anchor{id="DecodeOffsetSpace.Input"}

### `Input`

```silk
Input
```

The offset is a position in the input that you gave.

::Anchor{id="DecodeOffsetSpace.Der"}

### `Der`

```silk
Der
```

The offset is a position in the DER of the PEM block at `certificateIndex`, after Base64
decoding.

::Anchor{id="CertificateVersion"}

## `CertificateVersion`

```silk
pub enum CertificateVersion
```

The X.509 version of a certificate.

::Anchor{id="CertificateVersion.V1"}

### `V1`

```silk
V1
```

Version 1. The version field is absent.

::Anchor{id="CertificateVersion.V2"}

### `V2`

```silk
V2
```

Version 2.

::Anchor{id="CertificateVersion.V3"}

### `V3`

```silk
V3
```

Version 3. Most certificates use it, because only v3 has extensions.

::Anchor{id="DecodeError"}

## `DecodeError`

```silk
pub struct DecodeError
```

A certificate decoding error, with the rule and the position. It does not borrow the input.

### Details

`reason` gives the rule that the input broke. `offset` gives the position, and `offsetSpace`
tells if `offset` counts in the input or in the decoded DER.

::Anchor{id="DecodeError.kind"}

### Field `kind`

```silk
pub kind: DecodeClass
```

The kind of error.

::Anchor{id="DecodeError.reason"}

### Field `reason`

```silk
pub reason: DecodeReason
```

The rule that the input broke.

::Anchor{id="DecodeError.certificateIndex"}

### Field `certificateIndex`

```silk
pub certificateIndex: usize
```

The index of the certificate that failed, from 0. Errors in the document itself use 0.

::Anchor{id="DecodeError.offsetSpace"}

### Field `offsetSpace`

```silk
pub offsetSpace: DecodeOffsetSpace
```

Tells you if `offset` counts in the input or in the decoded DER.

::Anchor{id="DecodeError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The position of the byte or tag that failed, or the position where missing data must be.

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

A date and time in UTC from a certificate.

::Anchor{id="CertificateTime.year"}

### Field `year`

```silk
pub year: u16
```

The year, from 1 to 9999.

::Anchor{id="CertificateTime.month"}

### Field `month`

```silk
pub month: u8
```

The month, from 1 to 12.

::Anchor{id="CertificateTime.day"}

### Field `day`

```silk
pub day: u8
```

The day of the month.

::Anchor{id="CertificateTime.hour"}

### Field `hour`

```silk
pub hour: u8
```

The hour, from 0 to 23.

::Anchor{id="CertificateTime.minute"}

### Field `minute`

```silk
pub minute: u8
```

The minute, from 0 to 59.

::Anchor{id="CertificateTime.second"}

### Field `second`

```silk
pub second: u8
```

The second, from 0 to 59.

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

The content of a BIT STRING, such as a public key or a signature. It borrows the certificate.

::Anchor{id="BitStringView.bytes"}

### Field `bytes`

```silk
pub bytes: &'a [u8]
```

The bits, without the first byte that counts the unused bits.

::Anchor{id="BitStringView.unusedBits"}

### Field `unusedBits`

```silk
pub unusedBits: u8
```

The number of unused bits at the end of the last byte. Keys and signatures use 0.

::Anchor{id="AlgorithmView"}

## `AlgorithmView`

```silk
pub struct AlgorithmView<'a>
```

An algorithm identifier, such as the signature algorithm. It borrows the certificate.

::Anchor{id="AlgorithmView.der"}

### Field `der`

```silk
pub der: &'a [u8]
```

The full DER of the AlgorithmIdentifier.

::Anchor{id="AlgorithmView.oid"}

### Field `oid`

```silk
pub oid: &'a [u8]
```

The bytes of the object identifier, without the tag and the length.

::Anchor{id="AlgorithmView.parametersDer"}

### Field `parametersDer`

```silk
pub parametersDer: Option<&'a [u8]>
```

The full DER of the parameters, or `None` if they are absent. Absent parameters and an
explicit NULL are different.

::Anchor{id="CertificateOffsets"}

## `CertificateOffsets`

```silk
pub struct CertificateOffsets
```

The positions of the main fields in the DER of a certificate. Use them to point at a field in an
error message.

::Anchor{id="CertificateOffsets.tbs"}

### Field `tbs`

```silk
pub tbs: usize
```

The position of the TBSCertificate, the part that the issuer signs.

::Anchor{id="CertificateOffsets.version"}

### Field `version`

```silk
pub version: usize
```

The position of the version field, or the first TBSCertificate field if the version is absent.

::Anchor{id="CertificateOffsets.serial"}

### Field `serial`

```silk
pub serial: usize
```

The position of the serial number.

::Anchor{id="CertificateOffsets.tbsSignatureAlgorithm"}

### Field `tbsSignatureAlgorithm`

```silk
pub tbsSignatureAlgorithm: usize
```

The position of the signature algorithm inside the TBSCertificate.

::Anchor{id="CertificateOffsets.issuer"}

### Field `issuer`

```silk
pub issuer: usize
```

The position of the issuer name.

::Anchor{id="CertificateOffsets.subject"}

### Field `subject`

```silk
pub subject: usize
```

The position of the subject name.

::Anchor{id="CertificateOffsets.spki"}

### Field `spki`

```silk
pub spki: usize
```

The position of the SubjectPublicKeyInfo.

::Anchor{id="CertificateOffsets.publicKey"}

### Field `publicKey`

```silk
pub publicKey: usize
```

The position of the public key BIT STRING.

::Anchor{id="CertificateOffsets.signatureAlgorithm"}

### Field `signatureAlgorithm`

```silk
pub signatureAlgorithm: usize
```

The position of the outer signature algorithm.

::Anchor{id="CertificateOffsets.signature"}

### Field `signature`

```silk
pub signature: usize
```

The position of the signature BIT STRING.

::Anchor{id="CertificateOffsets.issuerUniqueId"}

### Field `issuerUniqueId`

```silk
pub issuerUniqueId: usize
```

The position of the issuer unique ID, or the TBSCertificate if it is absent.

::Anchor{id="CertificateOffsets.subjectUniqueId"}

### Field `subjectUniqueId`

```silk
pub subjectUniqueId: usize
```

The position of the subject unique ID, or the TBSCertificate if it is absent.

::Anchor{id="ExtensionView"}

## `ExtensionView`

```silk
pub struct ExtensionView<'a>
```

One extension of a certificate, as it is in the DER. It borrows the certificate.

::Anchor{id="ExtensionView.offset"}

### Field `offset`

```silk
pub offset: usize
```

The position of the extension in the DER of the certificate.

::Anchor{id="ExtensionView.valueOffset"}

### Field `valueOffset`

```silk
pub valueOffset: usize
```

The position of the extension value in the DER of the certificate.

::Anchor{id="ExtensionView.der"}

### Field `der`

```silk
pub der: &'a [u8]
```

The full DER of the extension.

::Anchor{id="ExtensionView.oid"}

### Field `oid`

```silk
pub oid: &'a [u8]
```

The bytes of the extension object identifier, without the tag and the length.

::Anchor{id="ExtensionView.critical"}

### Field `critical`

```silk
pub critical: bool
```

`true` if the extension is marked critical. An absent flag is `false`.

::Anchor{id="ExtensionView.value"}

### Field `value`

```silk
pub value: &'a [u8]
```

The bytes inside the extension OCTET STRING. They are not decoded.

::Anchor{id="Certificate"}

## `Certificate`

```silk
pub struct Certificate
```

A decoded X.509 certificate that owns its DER bytes.

### When to use

Make one with [`Certificate.decodePem`](#Certificate.impl.decodePem) for a `.pem` or `.crt` file with one `CERTIFICATE`
block, or with [`Certificate.decodeDer`](#Certificate.impl.decodeDer) for binary DER, such as a certificate from a TLS
handshake. For a file with more than one certificate, use `silk.certificate_bundle`.

### Details

The accessors return slices of the DER, such as [`Certificate.subjectDer`](#Certificate.impl.subjectDer), and decoded values,
such as [`Certificate.notAfter`](#Certificate.impl.notAfter). Nothing is normalized: names, algorithms, and extensions keep
their original bytes.
The accessors borrow the certificate. Unknown algorithms, duplicate extensions, and other values
that a validator can reject stay available, so that `silk.certificate_profile` can check them.

### Gotchas

Decoding checks only the structure. It does not verify the signature, the chain, the names, or
the dates. Use `silk.certificate_path` for that.

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

Returns a copy of the certificate. It does not decode again.

#### Errors
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="Certificate.impl.decodeDer"}

### Associated function `decodeDer`

```silk
pub effect fn decodeDer(input: &[u8], limits: DecodeLimits) -> Result<Certificate, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Decodes one DER certificate from `input`, and copies it.

All of `input` must be the certificate. Bytes after it, also whitespace, are an error. The
limits in `limits` bound the work for input that you do not control.

#### Errors
- `Failure` with a [`DecodeError`](#DecodeError) if `input` is not one valid certificate or goes over a
  limit.
- `OutOfMemoryError` if the `Allocator` fails.

#### Gotchas
Decoding checks only the structure. It does not verify the signature, the chain, the names,
or the dates. Use `silk.certificate_path` for that.

::Anchor{id="Certificate.impl.decodePem"}

### Associated function `decodePem`

```silk
pub effect fn decodePem(input: &[u8], limits: DecodeLimits) -> Result<Certificate, DecodeError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Decodes one PEM `CERTIFICATE` block from `input`.

Spaces, tabs, CR, and LF are allowed around the Base64 lines. The Base64 must be canonical.

#### Errors
- `Failure` with a [`DecodeError`](#DecodeError) if there is text outside the block, a second block, another
  label, or a certificate that is not valid.
- `OutOfMemoryError` if the `Allocator` fails.

#### Gotchas
Some PEM readers ignore text outside the block. This one does not. Use
`CertificateBundle.decodeAnnotatedPem` for a CA file with comments.

Decoding checks only the structure. It does not verify the signature, the chain, the names,
or the dates. Use `silk.certificate_path` for that.

::Anchor{id="Certificate.impl.tbsDer"}

### Method `tbsDer`

```silk
pub fn tbsDer(self: &Self) -> &[u8]
```

Returns the DER of the TBSCertificate, the part that the issuer signs.

::Anchor{id="Certificate.impl.issuerDer"}

### Method `issuerDer`

```silk
pub fn issuerDer(self: &Self) -> &[u8]
```

Returns the DER of the issuer name, as it is. It is not normalized.

::Anchor{id="Certificate.impl.subjectDer"}

### Method `subjectDer`

```silk
pub fn subjectDer(self: &Self) -> &[u8]
```

Returns the DER of the subject name, as it is. It is not normalized.

::Anchor{id="Certificate.impl.validityDer"}

### Method `validityDer`

```silk
pub fn validityDer(self: &Self) -> &[u8]
```

Returns the DER of the validity period.

::Anchor{id="Certificate.impl.spkiDer"}

### Method `spkiDer`

```silk
pub fn spkiDer(self: &Self) -> &[u8]
```

Returns the DER of the SubjectPublicKeyInfo: the key algorithm and the public key.

::Anchor{id="Certificate.impl.der"}

### Method `der`

```silk
pub fn der(self: &Self) -> &[u8]
```

Returns the full DER of the certificate.

::Anchor{id="Certificate.impl.version"}

### Method `version`

```silk
pub fn version(self: &Self) -> CertificateVersion
```

Returns the X.509 version.

::Anchor{id="Certificate.impl.offsets"}

### Method `offsets`

```silk
pub fn offsets(self: &Self) -> CertificateOffsets
```

Returns the positions of the main fields in [`Certificate.der`](#Certificate.impl.der).

::Anchor{id="Certificate.impl.serial"}

### Method `serial`

```silk
pub fn serial(self: &Self) -> &[u8]
```

Returns the bytes of the serial number, as a big-endian signed integer. A leading zero byte is
kept when the high bit is set.

::Anchor{id="Certificate.impl.notBefore"}

### Method `notBefore`

```silk
pub fn notBefore(self: &Self) -> CertificateTime
```

Returns the start of the validity period. It does not read a clock.

::Anchor{id="Certificate.impl.notAfter"}

### Method `notAfter`

```silk
pub fn notAfter(self: &Self) -> CertificateTime
```

Returns the end of the validity period. It does not check that it is after
[`Certificate.notBefore`](#Certificate.impl.notBefore).

::Anchor{id="Certificate.impl.publicKey"}

### Method `publicKey`

```silk
pub fn publicKey<'a>(self: &'a Self) -> BitStringView<'a>
```

Returns the subject public key bits.

::Anchor{id="Certificate.impl.signature"}

### Method `signature`

```silk
pub fn signature<'a>(self: &'a Self) -> BitStringView<'a>
```

Returns the signature bits.

::Anchor{id="Certificate.impl.publicKeyAlgorithm"}

### Method `publicKeyAlgorithm`

```silk
pub fn publicKeyAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Returns the algorithm of the subject public key.

::Anchor{id="Certificate.impl.tbsSignatureAlgorithm"}

### Method `tbsSignatureAlgorithm`

```silk
pub fn tbsSignatureAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Returns the signature algorithm inside the TBSCertificate. It must be the same as
[`Certificate.signatureAlgorithm`](#Certificate.impl.signatureAlgorithm), but this function does not check it.

::Anchor{id="Certificate.impl.signatureAlgorithm"}

### Method `signatureAlgorithm`

```silk
pub fn signatureAlgorithm<'a>(self: &'a Self) -> AlgorithmView<'a>
```

Returns the outer signature algorithm, which the issuer used to sign.

::Anchor{id="Certificate.impl.issuerUniqueId"}

### Method `issuerUniqueId`

```silk
pub fn issuerUniqueId<'a>(self: &'a Self) -> Option<BitStringView<'a>>
```

Returns the issuer unique ID, or `None` if it is absent. Modern certificates do not use it.

::Anchor{id="Certificate.impl.subjectUniqueId"}

### Method `subjectUniqueId`

```silk
pub fn subjectUniqueId<'a>(self: &'a Self) -> Option<BitStringView<'a>>
```

Returns the subject unique ID, or `None` if it is absent. Modern certificates do not use it.

::Anchor{id="Certificate.impl.extensionCount"}

### Method `extensionCount`

```silk
pub fn extensionCount(self: &Self) -> usize
```

Returns the number of extensions, with unknown and duplicate ones.

::Anchor{id="Certificate.impl.extension"}

### Method `extension`

```silk
pub fn extension<'a>(self: &'a Self, index: usize) -> Option<ExtensionView<'a>>
```

Returns the extension at `index` in source order, or `None` if `index` is out of range. The
value is not decoded.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
