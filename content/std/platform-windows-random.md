Secure Windows random bytes without a C runtime.

## When to use
The native `OsRandom` provider calls [`WindowsRandom.fillBytes`](#WindowsRandom.impl.fillBytes). Applications use the portable
`Random` service so tests can provide a deterministic source.

Import as `WindowsRandom` with `import silk.platform.windows.random { WindowsRandom }`.

Public declarations: 1.

::Anchor{id="WindowsRandom"}

## `WindowsRandom`

```silk
pub struct WindowsRandom
```

Secure randomness from Windows' `bcryptprimitives.dll`. No provider state is retained.

::Anchor{id="WindowsRandom.impl"}

## Implementation `WindowsRandom`

```silk
impl WindowsRandom
```

::Anchor{id="WindowsRandom.impl.fillBytes"}

### Associated function `fillBytes`

```silk
pub effect fn fillBytes(output: &mut [u8]) -> ()
```

Fills the entire buffer using `ProcessPrng`. Empty input makes no host call.
A failed call traps; callers must not use any partially written bytes after failure.

Category: Windows platform.

Profiles: `x86_64-pc-windows-msvc`.
