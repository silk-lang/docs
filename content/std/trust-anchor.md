A trust anchor: a CA certificate that you trust, with optional limits that you add.

## When to use
Make a [`TrustAnchor`](#TrustAnchor) for each root CA that can start a certificate chain, and put the anchors
in a `TrustSnapshot`. Use [`TrustAnchor.fromCertificate`](#TrustAnchor.impl.fromCertificate) to trust a certificate as it is. Use
[`TrustAnchor.fromCertificateWithConstraints`](#TrustAnchor.impl.fromCertificateWithConstraints) to limit it more, for example to a maximum chain
length or to names under `example.com`.

## Details
The anchor owns its certificate. The limits that you add are kept apart from the limits inside
the certificate, and path validation applies both.

## Errors
- `ProfileError` from [`TrustAnchor.fromCertificateWithConstraints`](#TrustAnchor.impl.fromCertificateWithConstraints) if the name constraints
  that you give are not valid or go over a limit.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
Making an anchor gives a certificate full authority. It does not check the certificate, its
self-signature, or its dates. Anchor only certificates that you trust.

Import as `TrustAnchor` with `import silk.trust_anchor { TrustAnchor }`.

Public declarations: 1.

::Anchor{id="TrustAnchor"}

## `TrustAnchor`

```silk
pub struct TrustAnchor
```

A CA certificate that you trust, with optional limits on chain length and names.

::Anchor{id="TrustAnchor.impl"}

## Implementation `TrustAnchor`

```silk
impl TrustAnchor
```

::Anchor{id="TrustAnchor.impl.fromCertificate"}

### Associated function `fromCertificate`

```silk
pub fn fromCertificate(certificate: Certificate) -> TrustAnchor
```

Returns an anchor for `certificate`, with no limits that you add. It does not allocate or
check the certificate.

::Anchor{id="TrustAnchor.impl.fromCertificateWithConstraints"}

### Associated function `fromCertificateWithConstraints`

```silk
pub effect fn fromCertificateWithConstraints(
    certificate: Certificate,
    maximumPathLength: Option<usize>,
    configuredNameConstraints: Option<&[u8]>,
    limits: ProfileLimits,
  ) -> Result<TrustAnchor, ProfileError>
  ! OutOfMemoryError
  ? &mut Allocator
```

Returns an anchor for `certificate`, with a maximum chain length and name constraints that you
add.

`maximumPathLength` works like the `pathLenConstraint` of a basic constraints extension.
`configuredNameConstraints` is the DER of a NameConstraints value. Only DNS and IP address
constraints are supported. The anchor keeps a copy of it.

#### Errors
- `Failure` with a `ProfileError` if the name constraints are not valid or go over `limits`.
  The certificate is dropped.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="TrustAnchor.impl.clone"}

### Method `clone`

```silk
pub effect fn clone(self: &Self) -> TrustAnchor ! OutOfMemoryError ? &mut Allocator
```

Returns a copy of the anchor, with its certificate and limits.

#### Errors
- `OutOfMemoryError` if the `Allocator` fails. The original does not change.

::Anchor{id="TrustAnchor.impl.certificate"}

### Method `certificate`

```silk
pub fn certificate(self: &Self) -> &Certificate
```

Returns the certificate of the anchor.

::Anchor{id="TrustAnchor.impl.configuredPathLength"}

### Method `configuredPathLength`

```silk
pub fn configuredPathLength(self: &Self) -> Option<usize>
```

Returns the maximum chain length that you added, or `None`.

::Anchor{id="TrustAnchor.impl.configuredNameConstraints"}

### Method `configuredNameConstraints`

```silk
pub fn configuredNameConstraints(self: &Self) -> Option<&[u8]>
```

Returns the DER of the name constraints that you added, or `None`.

::Anchor{id="TrustAnchor.impl.encodedBytes"}

### Method `encodedBytes`

```silk
pub fn encodedBytes(self: &Self) -> usize
```

Returns the size of the certificate DER plus the name constraint DER. Snapshot limits count
this value.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
