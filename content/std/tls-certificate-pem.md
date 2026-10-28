Internal strict PEM framing and canonical base64 for owned certificate decoders.

## Details

The scanner accepts only certificate blocks and ASCII space, tab, CR, and LF separators. It
checks complete blocks and byte budgets before allocation. Certificate schema checks belong to
the caller.

Import as `Pem` with `import silk.tls.certificate_pem { Pem }`.

Public declarations: 2.

::Anchor{id="PemBlock"}

## `PemBlock`

```silk
pub struct PemBlock
```

One independently owned decoded block and the input position after its END line.

::Anchor{id="PemBlock.bytes"}

### Field `bytes`

```silk
pub bytes: Bytes
```

The exact decoded bytes, without a claim that they form a certificate.

::Anchor{id="PemBlock.nextOffset"}

### Field `nextOffset`

```silk
pub nextOffset: usize
```

The input offset after the END line, including its newline when present.

::Anchor{id="Pem"}

## `Pem`

```silk
pub struct Pem
```

Internal strict certificate PEM operations.

::Anchor{id="Pem.impl"}

## Implementation `Pem`

```silk
impl Pem
```

::Anchor{id="Pem.impl.skipAnnotations"}

### Associated function `skipAnnotations`

```silk
pub fn skipAnnotations(input: &[u8], offset: usize) -> usize
```

Skips printable annotation lines outside blocks, retaining suspect boundary bytes for
rejection.

#### Details

ASCII text and whitespace are annotations only between complete blocks. A line containing
a hyphen boundary, BEGIN or END is always sent to the strict block decoder, even when
malformed or indented. Non-text control bytes are never discarded.

::Anchor{id="Pem.impl.skipWhitespace"}

### Associated function `skipWhitespace`

```silk
pub fn skipWhitespace(input: &[u8], offset: usize) -> usize
```

Returns the first offset without a space, tab, CR, or LF byte.

#### Details

An offset at or beyond the input end returns the input length. This operation allocates
nothing.

::Anchor{id="Pem.impl.decodeNext"}

### Associated function `decodeNext`

```silk
pub effect fn decodeNext(
    input: &[u8],
    offset: usize,
    limits: DecodeLimits,
    certificateIndex: usize,
    totalDerBytes: usize,
  ) -> Result<PemBlock, DecodeError> ! OutOfMemoryError ? &mut Allocator
```

Decodes one strict CERTIFICATE block into owned bytes, with exact byte and certificate limits.

#### Details

The caller supplies the BEGIN offset, block index, and previously decoded DER byte total.
Failures use input offsets and expose no partial bytes. Allocation refusal uses
`OutOfMemoryError`. Complete lexical validation precedes allocation. The caller validates the
returned DER schema.

#### Gotchas

Other well-formed labels are unsupported. Headers, explanatory text, mismatched markers, and
noncanonical base64 fail. This operation stops after one END line. The caller must check
trailing input or decode further blocks.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
