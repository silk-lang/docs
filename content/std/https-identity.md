Bounded HTTPS DNS-ID and IP-ID matching over caller-supplied identities.

## When to use

Use `HttpsIdentity.reference` with the original HTTPS host before DNS resolution.
Use `HttpsIdentity.verify` with the complete SAN list from the same leaf used for trust validation.

## Details

DNS inputs borrow ASCII LDH bytes or prepared A-labels. IP references own network-order octets.
DNS comparison ignores ASCII case. A whole leftmost wildcard matches exactly one label.
The matcher validates all SANs before success and uses constant temporary storage without allocation.

## Gotchas

Success proves only name matching, not signatures, path trust, name constraints, or TLS authentication.
There is no CN, URI-ID, SRV-ID, alias, or reverse-DNS fallback. Trailing dots and Unicode inputs are rejected.
The caller must validate HTTPS origins and convert IP literals; brackets, ports, escapes and zones are not DNS inputs.

Import as `HttpsIdentity` with `import silk.https_identity { HttpsIdentity }`.

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

The exact bytes; no normalization or text conversion is implicit.

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

The exact bytes; no normalization or text conversion is implicit.

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

The exact bytes; no normalization or text conversion is implicit.

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

A DNS borrow or owned binary IP reference; public construction does not validate it.

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

The exact bytes; no normalization or text conversion is implicit.

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

The exact bytes; no normalization or text conversion is implicit.

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

The exact bytes; no normalization or text conversion is implicit.

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

The exact bytes; no normalization or text conversion is implicit.

::Anchor{id="PresentedIdentity.Ip"}

### `Ip`

```silk
Ip
```

Borrowed network-order address octets; only lengths four and sixteen are valid.

::Anchor{id="PresentedIdentity.Ip.bytes"}

#### Field `bytes`

```silk
pub bytes: &'cert [u8]
```

The exact bytes; no normalization or text conversion is implicit.

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

::Anchor{id="CertificateIdentities"}

## `CertificateIdentities`

```silk
pub union CertificateIdentities<'cert>
```

The complete SAN state; an absent extension is distinct from an empty extension.

::Anchor{id="CertificateIdentities.Absent"}

### `Absent`

```silk
Absent
```

The certificate has no SAN extension; common names are never consulted.

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

::Anchor{id="IdentityLimits"}

## `IdentityLimits`

```silk
pub struct IdentityLimits
```

Inclusive SAN budgets; zero allows none of the corresponding resource.

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

Pure HTTPS DNS-ID and IP-ID reference construction and verification.

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

Creates a reference from the original HTTPS host without allocation or name substitution.

#### Details

DNS bytes remain borrowed and unchanged. IP arrays become owned network-order addresses.
DNS names require 1..253 ASCII octets and 1..63-octet LDH labels without a numeric final label.
Errors follow empty name, total length, NUL, non-ASCII, trailing dot, wildcard, then label grammar order.
Label checks proceed left to right: empty, length, characters, then edge hyphens. Numeric final labels fail last.

#### Gotchas

Supply the original origin host before resolution, never an alias, peer name, or resolved address.
The caller checks HTTPS and converts IP literals. DNS input rejects brackets, ports, escapes, underscores and Unicode.
A-label grammar does not validate Punycode. Explicit IPvFuture, zones, URI-ID and SRV-ID return `Unsupported`.

::Anchor{id="HttpsIdentity.impl.verify"}

### Associated function `verify`

```silk
pub fn verify<'name, 'cert>(
    reference: &ReferenceIdentity<'name>,
    certificate: &CertificateIdentities<'cert>,
    limits: IdentityLimits,
  ) -> Result<IdentityMatch, IdentityError>
```

Validates the complete SAN list and returns the first matching DNS-ID or IP-ID index.

#### Details

Revalidates public references, then checks structure, count, total bytes, and every SAN in order before comparison.
DNS matches ignore ASCII case. A whole leftmost wildcard matches one label; invalid wildcard placement is ignored.
Other malformed DNS names fail, including non-ASCII before wildcard handling. NUL is checked after invalid wildcard skipping.
IP SANs require four or sixteen equal network-order bytes. IPv4 and mapped IPv6 remain distinct.
All descriptors consume limits, including aliases and ignored forms. Zero budgets are valid. Errors retain no input borrow.
Work is linear in reference bytes, SAN count and payload bytes, with constant temporary storage and no allocation.

#### Gotchas

A malformed later SAN defeats an earlier match, even if its identity kind differs from the reference.
Empty present SANs fail structurally. Absent, unsupported-only and mismatching sets return `NoMatch`; there is no CN fallback.
Success does not validate trust, name constraints, signatures, time, or the TLS handshake.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
