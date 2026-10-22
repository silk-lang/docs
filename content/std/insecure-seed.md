One provider-stable 128-bit value for initialization-time hash-flood hardening.

## When to use
Read [`InsecureSeed`](#InsecureSeed) once while initializing a language runtime or application data structure.
Use [`fixed`](#InsecureSeed.impl.fixed) in deterministic environments or [`fromRandom`](#InsecureSeed.impl.fromRandom) when secure randomness is present.

## Details
A provider returns the same copyable [`Seed`](#Seed) on every shared read. [`fromRandom`](#InsecureSeed.impl.fromRandom) consumes two
secure words exactly once and stores them in an immutable provider.

## Gotchas
This capability is not a reusable stream and makes no cryptographic promise. Current Silk hash
collections use a different one-word hash policy and do not consume this seed automatically.

## Examples
### Provide a deterministic initialization seed
```silk
import silk.effect { Effect }
import silk.insecure_seed { InsecureSeed }

pub fn main() -> i32 {
  let provider = InsecureSeed.fixed(20, 22)
  let seed = run InsecureSeed.get()
    |> Effect.provide<InsecureSeed>(&provider)
  if InsecureSeed.first(&seed) + InsecureSeed.second(&seed) != 42 { return 0 }
  return 42
}
```

Import as `InsecureSeed` with `import silk.insecure_seed { InsecureSeed }`.

Public declarations: 3.

::Anchor{id="Seed"}

## `Seed`

```silk
pub struct Seed
```

A copyable pair of initialization seed words with private representation.

::Anchor{id="Seed.impl.Copy"}

## Implementation `Copy for Seed`

```silk
impl Copy for Seed
```

::Anchor{id="InsecureSeed"}

## `InsecureSeed`

```silk
pub service InsecureSeed
```

A shared capability that returns one provider-stable [`Seed`](#Seed).

::Anchor{id="InsecureSeed.get"}

### Operation `get`

```silk
effect fn get() -> Seed ? &InsecureSeed
```

Returns a copy of the provider's stable seed.

::Anchor{id="InsecureSeed.impl"}

## Implementation `InsecureSeed`

```silk
impl InsecureSeed
```

::Anchor{id="InsecureSeed.impl.first"}

### Associated function `first`

```silk
pub fn first(seed: &Seed) -> u64
```

Returns the first word of `seed`.

::Anchor{id="InsecureSeed.impl.second"}

### Associated function `second`

```silk
pub fn second(seed: &Seed) -> u64
```

Returns the second word of `seed`.

::Anchor{id="InsecureSeed.impl.fixed"}

### Associated function `fixed`

```silk
pub fn fixed(first: u64, second: u64) -> FixedInsecureSeed
```

Creates a deterministic provider from two explicit words without requiring secure randomness.

::Anchor{id="InsecureSeed.impl.fromRandom"}

### Associated function `fromRandom`

```silk
pub effect fn fromRandom() -> FixedInsecureSeed ? &mut Random
```

Samples two secure words once and returns an immutable seed provider.

::Anchor{id="FixedInsecureSeed"}

## `FixedInsecureSeed`

```silk
pub struct FixedInsecureSeed
```

An immutable provider containing one fixed seed.

::Anchor{id="FixedInsecureSeed.impl"}

## Implementation `FixedInsecureSeed`

```silk
impl FixedInsecureSeed
```

::Anchor{id="FixedInsecureSeed.impl.InsecureSeed"}

## Implementation `InsecureSeed for FixedInsecureSeed`

```silk
impl InsecureSeed for FixedInsecureSeed
```

::Anchor{id="FixedInsecureSeed.impl.InsecureSeed.get"}

### Operation `get`

```silk
get: FixedInsecureSeed.fixedGet
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
