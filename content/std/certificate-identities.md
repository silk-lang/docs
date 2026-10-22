Decode the subject alternative names (SAN) of a certificate: the DNS names and IP addresses that
it is for.

## When to use
Use [`CertificateSan.decode`](#CertificateSan.impl.decode) to read the SAN list of a certificate, and pass the result to
`HttpsIdentity.verify` to check a host name. Use [`CertificateSan.decodeValue`](#CertificateSan.impl.decodeValue) when you have
only the DER of a GeneralNames value.

## Details
The functions write one `PresentedIdentity` for each name into storage that you give, in source
order, and return how many they wrote. The names borrow the input. Nothing allocates. Forms
other than DNS names and IP addresses are returned as `Other` with their raw bytes.

## Errors
- [`SanDecodeError`](#SanDecodeError) if the DER is not valid, there are two SAN extensions, the SAN is empty,
  the storage is too small, or a limit is exceeded.

## Gotchas
After an error, the storage can hold some names. Do not use them. These functions check the
encoding only. `HttpsIdentity.verify` checks DNS syntax and IP lengths.

## Examples
### Decode a SAN value
```silk
import silk.certificate_identities {
  CertificateSan,
  SanDecodeError,
  SanDecodeLimits,
  SanDecodeSummary
}
import silk.https_identity { PresentedIdentity }
import silk.result { Result }

pub fn main() -> i32 {
  // GeneralNames with one dNSName: SEQUENCE { [2] "a.example" }.
  let der = b"\x30\x0b\x82\x09a.example"
  let mut storage: [PresentedIdentity; 4] = [PresentedIdentity.Other { tag: 0, bytes: b"" }; 4]
  return match CertificateSan.decodeValue(der, &mut storage, SanDecodeLimits.standard()) {
    Result<SanDecodeSummary, SanDecodeError>.Success { value } => {
      if value.count != 1 {
        return 1
      }
      return match storage[0] {
        PresentedIdentity.Dns { bytes } => {
          if bytes.length != 9 {
            return 1
          }
          return 0
        }
        _ => 1
      }
    }
    Result<SanDecodeSummary, SanDecodeError>.Failure { error: _ } => 1
  }
}
```

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

The failed DER offset. Extension-list failures use zero.

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

Operations that decode the subject alternative names (SAN) of a certificate: the DNS names and
IP addresses that it is for.

### When to use

Use [`CertificateSan.decode`](#CertificateSan.impl.decode) to read the SAN list of a certificate, and pass the result to
`HttpsIdentity.verify` to check a host name. Use [`CertificateSan.decodeValue`](#CertificateSan.impl.decodeValue) when you have
only the DER of a GeneralNames value.

### Details

The functions write one `PresentedIdentity` for each name into storage that you give, in source
order, and return how many they wrote. The names borrow the input. Nothing allocates. Forms
other than DNS names and IP addresses are returned as `Other` with their raw bytes.

### Gotchas

After an error, the storage can hold some names. Do not use them. These functions check the
encoding only. `HttpsIdentity.verify` checks DNS syntax and IP lengths.

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

Checks one DER GeneralNames value and returns the number of names, without storage.

The DER structure and the encoding of each GeneralName are checked. Some ASN.1 types inside
`otherName` and `x400Address` are not checked. Nothing allocates.

#### Errors
- `Failure` with a [`SanDecodeError`](#SanDecodeError) if the DER is not valid or a limit is exceeded.

::Anchor{id="CertificateSan.impl.decodeValue"}

### Associated function `decodeValue`

```silk
pub fn decodeValue<'a>(
    value: &'a [u8],
    storage: &mut [PresentedIdentity<'a>],
    limits: SanDecodeLimits,
  ) -> Result<SanDecodeSummary, SanDecodeError>
```

Decodes the DER GeneralNames value `value` into `storage`, and returns the number of names.

The names borrow `value`. The DER structure and the encoding of each GeneralName are checked.
Some ASN.1 types inside `otherName` and `x400Address` are not checked.

#### Errors
- `Failure` with a [`SanDecodeError`](#SanDecodeError) if the DER is not valid, `storage` is too small, or a
  limit is exceeded.

#### Gotchas
After an error, `storage` can hold some names. Do not use them. This function checks the
encoding only. `HttpsIdentity.verify` checks DNS syntax and IP lengths.

::Anchor{id="CertificateSan.impl.decode"}

### Associated function `decode`

```silk
pub fn decode<'a>(
    certificate: &'a Certificate,
    storage: &mut [PresentedIdentity<'a>],
    limits: SanDecodeLimits,
  ) -> Result<SanDecodeSummary, SanDecodeError>
```

Finds the SAN extension of `certificate`, decodes it into `storage`, and returns a summary.

If the certificate has no SAN extension, `present` is `false` and `count` is 0. The function
writes one `PresentedIdentity` for each name into `storage`, in source order. The names
borrow `certificate`. Nothing allocates. Forms other than DNS names and IP addresses are
returned as `Other` with their raw bytes.

#### Errors
- `Failure` with a [`SanDecodeError`](#SanDecodeError) if there are two SAN extensions, the SAN is empty or not
  valid, `storage` is too small, or a limit is exceeded.

#### Gotchas
After an error, `storage` can hold some names. Do not use them. This function checks the
encoding only. `HttpsIdentity.verify` checks DNS syntax and IP lengths.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
