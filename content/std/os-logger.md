Native logging through the process standard-output descriptor.

## When to use
Provide [`StdoutLogger`](#StdoutLogger) at a native application edge. Portable code uses `silk.logger.Logger`
and can replace this provider with `silk.logger.InMemoryLogger`.

## Details
Construction performs no output. Each log formats directly through the stdout Writer without
adding a newline or severity label. Descriptor failures become LogError code 3.

## Gotchas
The descriptor remains process-owned. A failed write may have committed a prefix.
The module is empty on WebAssembly and no-libc profiles.

Import as `StdoutLogger` with `import silk.os_logger { StdoutLogger }`.

Public declarations: 1.

::Anchor{id="StdoutLogger"}

## `StdoutLogger`

```silk
pub struct StdoutLogger
```

A [`Logger`](/docs/std/logger#Logger) provider that formats each complete message to process standard output.

### Details

The provider ignores the severity for physical formatting and writes only the formatted UTF-8
message bytes. It adds no newline and performs no message allocation.

::Anchor{id="StdoutLogger.impl"}

## Implementation `StdoutLogger`

```silk
impl StdoutLogger
```

::Anchor{id="StdoutLogger.impl.make"}

### Associated function `make`

```silk
pub fn make() -> StdoutLogger
```

Creates a native stdout logger without writing or acquiring a descriptor.

::Anchor{id="StdoutLogger.impl.Logger"}

## Implementation `Logger for StdoutLogger`

```silk
impl Logger for StdoutLogger
```

::Anchor{id="StdoutLogger.impl.Logger.log"}

### Operation `log`

```silk
log: StdoutLogger.writeStdout
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
