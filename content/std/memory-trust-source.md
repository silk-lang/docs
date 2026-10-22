Explicit replaceable in-memory trust for deterministic applications and tests.

## When to use

Use [`MemoryTrustSource`](#MemoryTrustSource) when the application already owns its trust snapshot and wants later
loads to observe explicit replacement. Supply it lexically as `silk.trust_source.TrustSource`.

## Details

Each load copies the current snapshot. Replacement exchanges complete owners without allocation
and affects only later loads. Earlier loaded snapshots remain independent.

## Gotchas

This provider performs no I/O, refresh, deduplication, path validation, or OS-policy discovery.

Import as `MemoryTrustSource` with `import silk.memory_trust_source { MemoryTrustSource }`.

Public declarations: 1.

::Anchor{id="MemoryTrustSource"}

## `MemoryTrustSource`

```silk
pub struct MemoryTrustSource
```

A mutable provider that owns one complete current trust snapshot.

::Anchor{id="MemoryTrustSource.impl"}

## Implementation `MemoryTrustSource`

```silk
impl MemoryTrustSource
```

::Anchor{id="MemoryTrustSource.impl.make"}

### Associated function `make`

```silk
pub fn make(snapshot: TrustSnapshot) -> MemoryTrustSource
```

Consumes a snapshot and creates a provider without allocation or validation.

::Anchor{id="MemoryTrustSource.impl.replace"}

### Method `replace`

```silk
pub fn replace(self: &mut Self, next: TrustSnapshot) -> TrustSnapshot
```

Atomically replaces current trust and returns the complete old snapshot.

#### Details

This operation allocates nothing and cannot fail. The new snapshot affects only later loads.
Existing loaded snapshots remain independent owners.

::Anchor{id="MemoryTrustSource.impl.TrustSource"}

## Implementation `TrustSource for MemoryTrustSource`

```silk
impl TrustSource for MemoryTrustSource
```

::Anchor{id="MemoryTrustSource.impl.TrustSource.load"}

### Operation `load`

```silk
load: MemoryTrustSource.loadCurrent
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
