Incremental seed-zero XXH64 state for zstd frame checksum validation.

## Details
`Xxh64.make` creates fixed storage. `Xxh64.updateByte` accepts decoded bytes, and `Xxh64.finish`
returns the complete hash without changing the state. The decoder compares its low 32 bits.

Import as `Xxh64` with `import silk.support.zstd_checksum { Xxh64 }`.

Public declarations: 1.

::Anchor{id="Xxh64"}

## `Xxh64`

```silk
pub struct Xxh64
```

An allocation-free seed-zero checksum state with a 32-byte partial stripe.

::Anchor{id="Xxh64.impl"}

## Implementation `Xxh64`

```silk
impl Xxh64
```

::Anchor{id="Xxh64.impl.make"}

### Associated function `make`

```silk
pub fn make() -> Xxh64
```

Creates an empty seed-zero checksum state without allocating storage.

::Anchor{id="Xxh64.impl.updateByte"}

### Method `updateByte`

```silk
pub fn updateByte(self: &mut Self, value: u8) -> ()
```

Adds one decoded byte without allocating storage.

#### Gotchas

The caller must reject input that would make the total byte count exceed `u64.MAX`.

::Anchor{id="Xxh64.impl.finish"}

### Method `finish`

```silk
pub fn finish(self: &Self) -> u64
```

Returns the seed-zero XXH64 digest without changing or consuming the state.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
