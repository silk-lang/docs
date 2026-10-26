The `InsecureSeed` effect: one fixed 128-bit value that a program reads when it starts.

## When to use
Read [`InsecureSeed.get`](#InsecureSeed.get) while you set up a runtime or a data structure that needs a seed, for
example to make hash collisions harder to cause. Provide [`InsecureSeed.fixed`](#InsecureSeed.impl.fixed) for repeatable
runs, or [`InsecureSeed.fromRandom`](#InsecureSeed.impl.fromRandom) when secure randomness is available.

## Details
Each read returns the same [`Seed`](#Seed). [`InsecureSeed.fromRandom`](#InsecureSeed.impl.fromRandom) reads two `u64` values from
`Random` one time and keeps them.

## Gotchas
It is not a sequence of random values and is not secure. The hash collections of the standard
library do not read it. Give them a seed with `silk.hash.Hash.seed`.

## Examples
### Provide a fixed seed
```silk
import silk.effect { Effect }
import silk.insecure_seed { InsecureSeed }

pub fn main() -> i32 {
  let provider = InsecureSeed.fixed(20, 22)
  let seed = run InsecureSeed.get() |> Effect.provide<InsecureSeed>(&provider)
  if InsecureSeed.first(&seed) + InsecureSeed.second(&seed) != 42 {
    return 1
  }
  return 0
}
```

Import as `InsecureSeed` with `import silk.insecure_seed { InsecureSeed }`.

Public declarations: 3.

::Anchor{id="Seed"}

## `Seed`

```silk
pub struct Seed
```

A seed of two `u64` words. Read them with [`InsecureSeed.first`](#InsecureSeed.impl.first) and [`InsecureSeed.second`](#InsecureSeed.impl.second).

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

The effect that returns the same 128-bit [`Seed`](#Seed) on each read. It needs only shared access.

### When to use
Read [`InsecureSeed.get`](#InsecureSeed.get) while you set up a runtime or a data structure that needs a seed, for
example to make hash collisions harder to cause. Provide [`InsecureSeed.fixed`](#InsecureSeed.impl.fixed) for repeatable
runs, or [`InsecureSeed.fromRandom`](#InsecureSeed.impl.fromRandom) when secure randomness is available.

### Gotchas
It is not a sequence of random values and is not secure. The hash collections of the standard
library do not read it. Give them a seed with `silk.hash.Hash.seed`.

::Anchor{id="InsecureSeed.get"}

### Operation `get`

```silk
effect fn get() -> Seed ? &InsecureSeed
```

Returns the seed of the provider. Each read returns the same seed.

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

Returns a provider with the seed `first`, `second`. It does not use randomness.

::Anchor{id="InsecureSeed.impl.fromRandom"}

### Associated function `fromRandom`

```silk
pub effect fn fromRandom() -> FixedInsecureSeed ? &mut Random
```

Returns a provider with a seed from two `u64` values of `Random`. It reads `Random` one time,
and the provider keeps the same seed after that.

::Anchor{id="FixedInsecureSeed"}

## `FixedInsecureSeed`

```silk
pub struct FixedInsecureSeed
```

A provider that holds one seed. Make one with [`InsecureSeed.fixed`](#InsecureSeed.impl.fixed) or
[`InsecureSeed.fromRandom`](#InsecureSeed.impl.fromRandom).

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

Category: System.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
