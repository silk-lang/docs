The native provider of the `Logger` effect: it writes each message to standard output.

## When to use
Provide [`StdoutLogger`](#StdoutLogger) for `Logger` in a native program. Code that logs uses `silk.logger`, so
a test can provide `InMemoryLogger` instead.

## Details
Each message is formatted directly to standard output. The logger adds no level, timestamp, or
newline, and it does not allocate.

## Errors
`LogError` with code 3 if the write fails. Part of the message can be written already.

## Gotchas
The provider exists only on Darwin on aarch64, and Linux with GNU libc on x86_64 or aarch64.

## Examples
### Log to standard output
```silk
import silk.effect { Effect }
import silk.logger { LogError, Logger }
import silk.os_logger { StdoutLogger }

pub effect fn main() -> i32
  ! LogError {
  let mut logger = StdoutLogger.make()
  let values = .{ name: "silk", count: 3 }

  // The logger adds no newline, so the template ends with one.
  run Effect.logInfo("{name} started {count} workers\n", &values)
    |> Effect.provideMut<Logger>(&mut logger)
  return 0
}
```

Import as `StdoutLogger` with `import silk.os_logger { StdoutLogger }`.

Public declarations: 1.

::Anchor{id="StdoutLogger"}

## `StdoutLogger`

```silk
pub struct StdoutLogger
```

The native `Logger` provider. It writes only the formatted message, and ignores the level.

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

Returns a logger. It does not write anything.

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
