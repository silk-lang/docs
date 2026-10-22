Native HostInput provider backed by an owned process-input snapshot.

## When to use
Capture NativeHostInput at the application boundary and move it into this provider. Portable
code receives it through the mutable HostInput service and obtains independent owned results.

## Details
Arguments and environment retain their captured bytes. Working-directory lookup observes the
current process directory on each call. Dropping the provider releases the complete snapshot.

## Gotchas
Available only on the supported native libc profiles. Capturing foreign input requires that
its storage remain readable and unchanged throughout capture.

Import as `OsHostInput` with `import silk.os_host_input { OsHostInput }`.

Public declarations: 1.

::Anchor{id="OsHostInput"}

## `OsHostInput`

```silk
pub struct OsHostInput
```

An affine HostInput provider owning its argument and environment snapshot.

::Anchor{id="OsHostInput.impl"}

## Implementation `OsHostInput`

```silk
impl OsHostInput
```

::Anchor{id="OsHostInput.impl.make"}

### Associated function `make`

```silk
pub fn make(inputs: NativeHostInput) -> OsHostInput
```

Moves an already captured snapshot into the portable service provider.

#### Details
Construction reads no foreign state and performs no allocation.

::Anchor{id="OsHostInput.impl.HostInput"}

## Implementation `HostInput for OsHostInput`

```silk
impl HostInput for OsHostInput
```

::Anchor{id="OsHostInput.impl.HostInput.argumentCount"}

### Operation `argumentCount`

```silk
argumentCount: OsHostInput.argumentCount
```

::Anchor{id="OsHostInput.impl.HostInput.argument"}

### Operation `argument`

```silk
argument: OsHostInput.argument
```

::Anchor{id="OsHostInput.impl.HostInput.variable"}

### Operation `variable`

```silk
variable: OsHostInput.variable
```

::Anchor{id="OsHostInput.impl.HostInput.workingDirectory"}

### Operation `workingDirectory`

```silk
workingDirectory: OsHostInput.workingDirectory
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
