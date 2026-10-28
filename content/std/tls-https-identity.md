Check that a server certificate is for the host name or IP address in an HTTPS URL (RFC 6125 and
RFC 9110).

## When to use
After certificate path validation succeeds, call [`HttpsIdentity.reference`](#HttpsIdentity.impl.reference) with the host of
the URL, and then [`HttpsIdentity.verify`](#HttpsIdentity.impl.verify) with the subject alternative names of the leaf
certificate. `silk.tls.client` does this for you.

## Details
DNS names compare without regard to ASCII case. A wildcard is allowed only as the full leftmost
label of a certificate name, and it matches exactly one label: `*.example.com` matches
`api.example.com`, but not `example.com` or `a.b.example.com`. An IP address matches only an IP
SAN with the same bytes. All SANs are checked before a match is returned, and nothing allocates.

## Errors
- [`IdentityError`](#IdentityError) if the host is not a valid DNS name, a SAN is not valid, a limit is
  exceeded, or no SAN matches (`NoMatch`).

## Gotchas
Use the host from the URL, before DNS resolution. Never use a resolved address or a CNAME
target. The common name (CN) is never used. Names with a trailing dot and Unicode names are
rejected: convert an internationalized name to its `xn--` form first. A match does not prove
that the chain is trusted.

## Examples
### Match a host against a wildcard certificate
```silk
import silk.tls.https_identity {
  CertificateIdentities,
  HttpsIdentity,
  IdentityError,
  IdentityLimits,
  IdentityMatch,
  OriginHost,
  PresentedIdentity,
  ReferenceIdentity
}
import silk.core.result { Result }

fn certificateView<'a>(entries: &'a [PresentedIdentity<'a>]) -> CertificateIdentities<'a> {
  return CertificateIdentities<'a>.Decoded { entries: entries }
}

pub fn main() -> i32 {
  let reference = match HttpsIdentity.reference(
    OriginHost<'static>.Dns { bytes: b"API.example.com" }
  ) {
    Result<ReferenceIdentity, IdentityError>.Success { value } => value
    Result<ReferenceIdentity, IdentityError>.Failure { error: _ } => {
      return 1
    }
  }
  let sans: [PresentedIdentity<'static>; 2] = [
    PresentedIdentity<'static>.Dns { bytes: b"example.com" },
    PresentedIdentity<'static>.Dns { bytes: b"*.example.com" }
  ]
  let certificate = certificateView(&sans)
  return match HttpsIdentity.verify(&reference, &certificate, IdentityLimits.standard()) {
    Result<IdentityMatch, IdentityError>.Success { value } => {
      // The wildcard at index 1 matches. Case does not matter.
      if value.sanIndex != 1 {
        return 1
      }
      return 0
    }
    Result<IdentityMatch, IdentityError>.Failure { error: _ } => 1
  }
}
```

Import as `HttpsIdentity` with `import silk.tls.https_identity { HttpsIdentity }`.

Public declarations: 13.

::Anchor{id="UnsupportedForm"}

## `UnsupportedForm`

```silk
pub enum UnsupportedForm
```

A reference form that HTTPS identity verification does not support.

::Anchor{id="UnsupportedForm.IpvFuture"}

### `IpvFuture`

```silk
IpvFuture
```

An IPvFuture reference is unsupported.

::Anchor{id="UnsupportedForm.ZoneIdentifier"}

### `ZoneIdentifier`

```silk
ZoneIdentifier
```

A scoped address reference is unsupported.

::Anchor{id="UnsupportedForm.UriId"}

### `UriId`

```silk
UriId
```

A URI-ID reference is unsupported for HTTPS.

::Anchor{id="UnsupportedForm.SrvId"}

### `SrvId`

```silk
SrvId
```

An SRV-ID reference is unsupported for HTTPS.

::Anchor{id="UnsupportedForm.impl.Debug"}

## Implementation `Debug for UnsupportedForm`

```silk
impl Debug for UnsupportedForm
```

::Anchor{id="UnsupportedForm.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `IpvFuture`.

::Anchor{id="OriginHost"}

## `OriginHost`

```silk
pub union OriginHost<'name>
```

The original HTTPS host, classified by the caller before DNS resolution.

::Anchor{id="OriginHost.Dns"}

### `Dns`

```silk
Dns
```

Borrowed ASCII DNS bytes without a trailing dot.

::Anchor{id="OriginHost.Dns.bytes"}

#### Field `bytes`

```silk
pub bytes: &'name [u8]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="OriginHost.Ipv4"}

### `Ipv4`

```silk
Ipv4
```

Four owned network-order address octets.

::Anchor{id="OriginHost.Ipv4.bytes"}

#### Field `bytes`

```silk
pub bytes: [u8; 4]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="OriginHost.Ipv6"}

### `Ipv6`

```silk
Ipv6
```

Sixteen owned network-order address octets.

::Anchor{id="OriginHost.Ipv6.bytes"}

#### Field `bytes`

```silk
pub bytes: [u8; 16]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="OriginHost.Unsupported"}

### `Unsupported`

```silk
Unsupported
```

An explicitly unsupported reference form.

::Anchor{id="OriginHost.Unsupported.form"}

#### Field `form`

```silk
pub form: UnsupportedForm
```

The unsupported reference form.

::Anchor{id="ReferenceIdentity"}

## `ReferenceIdentity`

```silk
pub union ReferenceIdentity<'name>
```

The host to check, from [`HttpsIdentity.reference`](#HttpsIdentity.impl.reference). Values that you build yourself are checked
again by [`HttpsIdentity.verify`](#HttpsIdentity.impl.verify).

::Anchor{id="ReferenceIdentity.Dns"}

### `Dns`

```silk
Dns
```

Borrowed ASCII DNS bytes without a trailing dot.

::Anchor{id="ReferenceIdentity.Dns.bytes"}

#### Field `bytes`

```silk
pub bytes: &'name [u8]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="ReferenceIdentity.Ipv4"}

### `Ipv4`

```silk
Ipv4
```

Four owned network-order address octets.

::Anchor{id="ReferenceIdentity.Ipv4.bytes"}

#### Field `bytes`

```silk
pub bytes: [u8; 4]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="ReferenceIdentity.Ipv6"}

### `Ipv6`

```silk
Ipv6
```

Sixteen owned network-order address octets.

::Anchor{id="ReferenceIdentity.Ipv6.bytes"}

#### Field `bytes`

```silk
pub bytes: [u8; 16]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="PresentedIdentity"}

## `PresentedIdentity`

```silk
pub union PresentedIdentity<'cert>
```

One untrusted SAN descriptor in original certificate order.

::Anchor{id="PresentedIdentity.Dns"}

### `Dns`

```silk
Dns
```

Borrowed ASCII DNS bytes without a trailing dot.

::Anchor{id="PresentedIdentity.Dns.bytes"}

#### Field `bytes`

```silk
pub bytes: &'cert [u8]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="PresentedIdentity.Ip"}

### `Ip`

```silk
Ip
```

Borrowed network-order address octets. Only lengths four and sixteen are valid.

::Anchor{id="PresentedIdentity.Ip.bytes"}

#### Field `bytes`

```silk
pub bytes: &'cert [u8]
```

The exact bytes. No normalization or text conversion is implicit.

::Anchor{id="PresentedIdentity.Other"}

### `Other`

```silk
Other
```

An uninterpreted GeneralName with an alternative number other than two or seven.

::Anchor{id="PresentedIdentity.Other.tag"}

#### Field `tag`

```silk
pub tag: u8
```

The decoded GeneralName alternative number, from zero through eight except two and seven.

::Anchor{id="PresentedIdentity.Other.bytes"}

#### Field `bytes`

```silk
pub bytes: &'cert [u8]
```

The complete alternative content octets, counted even when this form is ignored.

::Anchor{id="CertificateStructureError"}

## `CertificateStructureError`

```silk
pub enum CertificateStructureError
```

A structural failure reported by a complete SAN decoder.

::Anchor{id="CertificateStructureError.InvalidDer"}

### `InvalidDer`

```silk
InvalidDer
```

The SAN input violates DER framing.

::Anchor{id="CertificateStructureError.InvalidGeneralName"}

### `InvalidGeneralName`

```silk
InvalidGeneralName
```

A GeneralName violates its structural encoding.

::Anchor{id="CertificateStructureError.DuplicateSanExtension"}

### `DuplicateSanExtension`

```silk
DuplicateSanExtension
```

The certificate contains more than one SAN extension.

::Anchor{id="CertificateStructureError.EmptySanExtension"}

### `EmptySanExtension`

```silk
EmptySanExtension
```

A present SAN extension has no GeneralNames.

::Anchor{id="CertificateStructureError.impl.Debug"}

## Implementation `Debug for CertificateStructureError`

```silk
impl Debug for CertificateStructureError
```

::Anchor{id="CertificateStructureError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidDer`.

::Anchor{id="CertificateIdentities"}

## `CertificateIdentities`

```silk
pub union CertificateIdentities<'cert>
```

The SAN state of a certificate. A certificate without a SAN extension is different from one with
an empty SAN extension.

::Anchor{id="CertificateIdentities.Absent"}

### `Absent`

```silk
Absent
```

The certificate has no SAN extension. Common names are never consulted.

::Anchor{id="CertificateIdentities.Decoded"}

### `Decoded`

```silk
Decoded
```

All SAN descriptors in source order, with no filtered entries.

::Anchor{id="CertificateIdentities.Decoded.entries"}

#### Field `entries`

```silk
pub entries: &'cert [PresentedIdentity<'cert>]
```

The complete shared descriptor slice and payloads, bounded by the same lifetime.

::Anchor{id="CertificateIdentities.Malformed"}

### `Malformed`

```silk
Malformed
```

A structural failure that must prevent a match.

::Anchor{id="CertificateIdentities.Malformed.reason"}

#### Field `reason`

```silk
pub reason: CertificateStructureError
```

The failed rule.

::Anchor{id="NameError"}

## `NameError`

```silk
pub enum NameError
```

The first failed DNS admission rule under the documented precedence.

::Anchor{id="NameError.EmptyName"}

### `EmptyName`

```silk
EmptyName
```

The name has no octets.

::Anchor{id="NameError.NameTooLong"}

### `NameTooLong`

```silk
NameTooLong
```

The name exceeds 253 octets.

::Anchor{id="NameError.EmptyLabel"}

### `EmptyLabel`

```silk
EmptyLabel
```

A label has no octets.

::Anchor{id="NameError.LabelTooLong"}

### `LabelTooLong`

```silk
LabelTooLong
```

A label exceeds 63 octets.

::Anchor{id="NameError.Nul"}

### `Nul`

```silk
Nul
```

The name contains an embedded zero octet.

::Anchor{id="NameError.NonAscii"}

### `NonAscii`

```silk
NonAscii
```

The name contains an octet above 127.

::Anchor{id="NameError.InvalidCharacter"}

### `InvalidCharacter`

```silk
InvalidCharacter
```

A label contains an octet outside ASCII letters, digits and hyphens.

::Anchor{id="NameError.EdgeHyphen"}

### `EdgeHyphen`

```silk
EdgeHyphen
```

A label starts or ends with a hyphen.

::Anchor{id="NameError.TrailingDot"}

### `TrailingDot`

```silk
TrailingDot
```

The name ends with a dot.

::Anchor{id="NameError.WildcardReference"}

### `WildcardReference`

```silk
WildcardReference
```

A reference contains an asterisk.

::Anchor{id="NameError.NumericFinalLabel"}

### `NumericFinalLabel`

```silk
NumericFinalLabel
```

The final label contains decimal digits only.

::Anchor{id="NameError.MissingWildcardSuffix"}

### `MissingWildcardSuffix`

```silk
MissingWildcardSuffix
```

A wildcard name has no suffix.

::Anchor{id="NameError.impl.Debug"}

## Implementation `Debug for NameError`

```silk
impl Debug for NameError
```

::Anchor{id="NameError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `EmptyName`.

::Anchor{id="CertificateIdentityError"}

## `CertificateIdentityError`

```silk
pub enum CertificateIdentityError
```

An invalid SAN descriptor form or binary address size.

::Anchor{id="CertificateIdentityError.InvalidIpLength"}

### `InvalidIpLength`

```silk
InvalidIpLength
```

An IP SAN has neither four nor sixteen octets.

::Anchor{id="CertificateIdentityError.WrongGeneralNameTag"}

### `WrongGeneralNameTag`

```silk
WrongGeneralNameTag
```

An Other descriptor uses tag two, seven, or a number above eight.

::Anchor{id="CertificateIdentityError.impl.Debug"}

## Implementation `Debug for CertificateIdentityError`

```silk
impl Debug for CertificateIdentityError
```

::Anchor{id="CertificateIdentityError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidIpLength`.

::Anchor{id="LimitKind"}

## `LimitKind`

```silk
pub enum LimitKind
```

The exhausted matcher budget.

::Anchor{id="LimitKind.SanCount"}

### `SanCount`

```silk
SanCount
```

The total descriptor count exceeds the configured budget.

::Anchor{id="LimitKind.SanBytes"}

### `SanBytes`

```silk
SanBytes
```

The sum of payload lengths exceeds the configured budget.

::Anchor{id="LimitKind.impl.Debug"}

## Implementation `Debug for LimitKind`

```silk
impl Debug for LimitKind
```

::Anchor{id="LimitKind.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `SanCount`.

::Anchor{id="IdentityError"}

## `IdentityError`

```silk
pub union IdentityError
```

An identity failure that is independent of certificate path trust.

::Anchor{id="IdentityError.MalformedReference"}

### `MalformedReference`

```silk
MalformedReference
```

The reference violates DNS admission rules.

::Anchor{id="IdentityError.MalformedReference.reason"}

#### Field `reason`

```silk
pub reason: NameError
```

The failed rule.

::Anchor{id="IdentityError.MalformedCertificateStructure"}

### `MalformedCertificateStructure`

```silk
MalformedCertificateStructure
```

The complete SAN structure is malformed.

::Anchor{id="IdentityError.MalformedCertificateStructure.reason"}

#### Field `reason`

```silk
pub reason: CertificateStructureError
```

The failed rule.

::Anchor{id="IdentityError.MalformedCertificateName"}

### `MalformedCertificateName`

```silk
MalformedCertificateName
```

A DNS SAN violates name admission rules.

::Anchor{id="IdentityError.MalformedCertificateName.index"}

#### Field `index`

```silk
pub index: usize
```

The original zero-based SAN index.

::Anchor{id="IdentityError.MalformedCertificateName.reason"}

#### Field `reason`

```silk
pub reason: NameError
```

The failed rule.

::Anchor{id="IdentityError.MalformedCertificateIdentity"}

### `MalformedCertificateIdentity`

```silk
MalformedCertificateIdentity
```

A SAN descriptor has an invalid form.

::Anchor{id="IdentityError.MalformedCertificateIdentity.index"}

#### Field `index`

```silk
pub index: usize
```

The original zero-based SAN index.

::Anchor{id="IdentityError.MalformedCertificateIdentity.reason"}

#### Field `reason`

```silk
pub reason: CertificateIdentityError
```

The failed rule.

::Anchor{id="IdentityError.Unsupported"}

### `Unsupported`

```silk
Unsupported
```

An explicitly unsupported reference form.

::Anchor{id="IdentityError.Unsupported.form"}

#### Field `form`

```silk
pub form: UnsupportedForm
```

The unsupported reference form.

::Anchor{id="IdentityError.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A count or byte budget was exceeded.

::Anchor{id="IdentityError.LimitExceeded.kind"}

#### Field `kind`

```silk
pub kind: LimitKind
```

The exhausted resource budget.

::Anchor{id="IdentityError.NoMatch"}

### `NoMatch`

```silk
NoMatch
```

No eligible SAN matches the reference.

::Anchor{id="IdentityError.impl.Debug"}

## Implementation `Debug for IdentityError`

```silk
impl Debug for IdentityError
```

::Anchor{id="IdentityError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `MalformedReference { ... }`.

::Anchor{id="IdentityLimits"}

## `IdentityLimits`

```silk
pub struct IdentityLimits
```

The limits for one [`HttpsIdentity.verify`](#HttpsIdentity.impl.verify) call. Each limit is inclusive, and 0 allows nothing.

::Anchor{id="IdentityLimits.maxSanCount"}

### Field `maxSanCount`

```silk
pub maxSanCount: usize
```

Maximum number of descriptors, including ignored and unsupported forms.

::Anchor{id="IdentityLimits.maxSanBytes"}

### Field `maxSanBytes`

```silk
pub maxSanBytes: usize
```

Maximum sum of all payload lengths, counting each alias occurrence.

::Anchor{id="IdentityMatch"}

## `IdentityMatch`

```silk
pub struct IdentityMatch
```

The first matching SAN index after validation of the entire SAN set.

::Anchor{id="IdentityMatch.sanIndex"}

### Field `sanIndex`

```silk
pub sanIndex: usize
```

The original zero-based index of the first matching SAN.

::Anchor{id="HttpsIdentity"}

## `HttpsIdentity`

```silk
pub struct HttpsIdentity
```

Checks that a server certificate is for the host name or IP address in an HTTPS URL (RFC 6125
and RFC 9110).

### When to use

After certificate path validation succeeds, call [`HttpsIdentity.reference`](#HttpsIdentity.impl.reference) with the host of
the URL, and then [`HttpsIdentity.verify`](#HttpsIdentity.impl.verify) with the subject alternative names of the leaf
certificate. `silk.tls.client` does this for you.

### Details

DNS names compare without regard to ASCII case. A wildcard is allowed only as the full leftmost
label of a certificate name, and it matches exactly one label: `*.example.com` matches
`api.example.com`, but not `example.com` or `a.b.example.com`. An IP address matches only an IP
SAN with the same bytes. Nothing allocates.

### Gotchas

Use the host from the URL, before DNS resolution. Never use a resolved address or a CNAME
target. The common name (CN) is never used. Names with a trailing dot and Unicode names are
rejected: convert an internationalized name to its `xn--` form first. A match does not prove
that the chain is trusted.

::Anchor{id="OriginHost.impl.Copy"}

## Implementation `Copy for OriginHost<'a>`

```silk
impl<'a> Copy for OriginHost<'a>
```

::Anchor{id="ReferenceIdentity.impl.Copy"}

## Implementation `Copy for ReferenceIdentity<'a>`

```silk
impl<'a> Copy for ReferenceIdentity<'a>
```

::Anchor{id="PresentedIdentity.impl.Copy"}

## Implementation `Copy for PresentedIdentity<'a>`

```silk
impl<'a> Copy for PresentedIdentity<'a>
```

::Anchor{id="CertificateIdentities.impl.Copy"}

## Implementation `Copy for CertificateIdentities<'a>`

```silk
impl<'a> Copy for CertificateIdentities<'a>
```

::Anchor{id="IdentityError.impl.Copy"}

## Implementation `Copy for IdentityError`

```silk
impl Copy for IdentityError
```

::Anchor{id="IdentityLimits.impl.Copy"}

## Implementation `Copy for IdentityLimits`

```silk
impl Copy for IdentityLimits
```

::Anchor{id="IdentityMatch.impl.Copy"}

## Implementation `Copy for IdentityMatch`

```silk
impl Copy for IdentityMatch
```

::Anchor{id="IdentityLimits.impl"}

## Implementation `IdentityLimits`

```silk
impl IdentityLimits
```

::Anchor{id="IdentityLimits.impl.standard"}

### Associated function `standard`

```silk
pub fn standard() -> IdentityLimits
```

Returns inclusive limits of 256 SAN descriptors and 65536 payload octets.

::Anchor{id="HttpsIdentity.impl"}

## Implementation `HttpsIdentity`

```silk
impl HttpsIdentity
```

::Anchor{id="HttpsIdentity.impl.exactDnsNameError"}

### Associated function `exactDnsNameError`

```silk
pub fn exactDnsNameError(bytes: &[u8]) -> Option<NameError>
```

Returns the shared HTTPS-profile admission error for one exact DNS name, when invalid.

#### Details

This applies the canonical 253-octet, LDH-label, edge-hyphen, wildcard-free, and
nonnumeric-final-label grammar used by HTTPS reference identities.

::Anchor{id="HttpsIdentity.impl.presentedDnsNameError"}

### Associated function `presentedDnsNameError`

```silk
pub fn presentedDnsNameError(bytes: &[u8]) -> Option<NameError>
```

Returns the shared HTTPS-profile admission error for one presented DNS name, when invalid.

#### Details

A wildcard is admitted only as the complete leftmost `*.` label and remains included in the
253-octet total-name bound. All other label policy is identical to exact DNS names.

::Anchor{id="HttpsIdentity.impl-2"}

## Implementation `HttpsIdentity`

```silk
impl HttpsIdentity
```

::Anchor{id="HttpsIdentity.impl.reference"}

### Associated function `reference`

```silk
pub fn reference<'name>(host: OriginHost<'name>) -> Result<
    ReferenceIdentity<'name>,
    IdentityError,
  >
```

Checks the host of an HTTPS URL and returns it as a reference to verify. It does not allocate.

A DNS name must be 1 to 253 ASCII bytes, with labels of 1 to 63 letters, digits, and hyphens.
A label must not start or end with a hyphen, and the last label must not be all digits. An IP
address must already be converted to its 4 or 16 bytes.

#### Errors
- `MalformedReference` with the first rule that the name breaks.
- `Unsupported` for an IPvFuture address, a zone identifier, a URI-ID, or an SRV-ID.

#### Gotchas
Use the host from the URL, before DNS resolution. Remove brackets and the port first. An
`xn--` label is not checked as Punycode.

::Anchor{id="HttpsIdentity.impl.verify"}

### Associated function `verify`

```silk
pub fn verify<'name, 'cert>(
    reference: &ReferenceIdentity<'name>,
    certificate: &CertificateIdentities<'cert>,
    limits: IdentityLimits,
  ) -> Result<IdentityMatch, IdentityError>
```

Checks all SANs of `certificate`, and returns the index of the first one that matches
`reference`.

DNS names compare without regard to ASCII case. A wildcard SAN matches one label. A wildcard
in another position is ignored. An IP SAN must have the same 4 or 16 bytes. An IPv4 address
does not match its IPv6-mapped form.

#### Errors
- `NoMatch` if no SAN matches, the certificate has no SAN, or it has only other name forms.
- `MalformedCertificateStructure`, `MalformedCertificateName`, or
  `MalformedCertificateIdentity` if a SAN is not valid.
- `LimitExceeded` if the SANs go over `limits`.
- `MalformedReference` if `reference` is not valid.

#### Gotchas
One SAN that is not valid fails the call, also when an earlier SAN matches. A match does not
check the chain, the dates, or the TLS handshake. The common name (CN) is never used.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
