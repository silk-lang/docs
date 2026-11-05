Windows `HostInput` with owned arguments and an environment snapshot in raw canonical WTF-8.

## When to use
The Windows entry point supplies `WindowsHostInput` to application effects that require `HostInput`.
Use `WindowsHostInput.capture` in a custom Windows runtime.

Import as `WindowsHostInput` with `import silk.platform.windows.host_input { WindowsHostInput }`.

Public declarations: 1.

::Anchor{id="WindowsHostInput"}

## `WindowsHostInput`

```silk
pub struct WindowsHostInput
```

Owned Windows arguments and environment entries, with case-insensitive environment lookup.

### Details

Arguments and environment values are canonical WTF-8 bytes; lone surrogates survive.
The snapshot does not change. Lookup uses Windows `CompareStringOrdinal` with case ignored,
and returns the first matching entry. Hidden names such as `=C:` are retained.
Working-directory queries return the current native Windows path as WTF-8, not a `Path` spelling.

::Anchor{id="WindowsHostInput.impl"}

## Implementation `WindowsHostInput`

```silk
impl WindowsHostInput
```

::Anchor{id="WindowsHostInput.impl.capture"}

### Associated function `capture`

```silk
pub effect fn capture() -> WindowsHostInput ! HostInputError | OutOfMemoryError ? &mut Allocator
```

Captures the process command line and environment, releasing the OS environment block after copying.

#### Details

MSVC parsing preserves argument zero's special quoting rules. An empty command line gives
one empty argument. Malformed environment entries without a name/value separator are ignored.

#### Errors

- `HostInputError` if Windows cannot supply the command line or environment.
- `OutOfMemoryError` if the owned snapshot cannot be allocated. Partial copies are released.

::Anchor{id="WindowsHostInput.impl.HostInput"}

## Implementation `HostInput for WindowsHostInput`

```silk
impl HostInput for WindowsHostInput
```

::Anchor{id="WindowsHostInput.impl.HostInput.argumentCount"}

### Operation `argumentCount`

```silk
argumentCount: WindowsHostInput.argumentCount
```

::Anchor{id="WindowsHostInput.impl.HostInput.argument"}

### Operation `argument`

```silk
argument: WindowsHostInput.argument
```

::Anchor{id="WindowsHostInput.impl.HostInput.variable"}

### Operation `variable`

```silk
variable: WindowsHostInput.variable
```

::Anchor{id="WindowsHostInput.impl.HostInput.workingDirectory"}

### Operation `workingDirectory`

```silk
workingDirectory: WindowsHostInput.workingDirectory
```

Category: Windows platform.

Profiles: `x86_64-pc-windows-msvc`.
