Native `Writer` providers for standard output and standard error.

## When to use
Provide [`StdoutWriter`](#StdoutWriter) or [`StderrWriter`](#StderrWriter) for `Writer` in a native program. Code that writes
uses `silk.writer`, so a test can provide a writer to memory instead.

## Details
Each write writes all bytes to the descriptor. Flush does nothing, because there is no buffer.
The process owns the descriptors, and the providers do not close them.

## Errors
`WriterError` if a write fails. Part of the bytes can be written already.

## Gotchas
The providers exist only on Darwin on aarch64, and Linux with GNU libc on x86_64 or aarch64.

## Examples
### Write to standard output
```silk
import silk.effect { Effect }
import silk.os_writer { StdoutWriter }
import silk.writer { Writer, WriterError }

pub effect fn main() -> i32
  ! WriterError {
  let mut out = StdoutWriter.make()
  run Writer.writeAll(b"Silk\n") |> Effect.provideMut<Writer>(&mut out)
  return 0
}
```

Import as `StdoutWriter` with `import silk.os_writer { StdoutWriter }`.

Public declarations: 2.

::Anchor{id="StdoutWriter"}

## `StdoutWriter`

```silk
pub struct StdoutWriter
```

A `Writer` for standard output.

::Anchor{id="StderrWriter"}

## `StderrWriter`

```silk
pub struct StderrWriter
```

A `Writer` for standard error.

::Anchor{id="StdoutWriter.impl"}

## Implementation `StdoutWriter`

```silk
impl StdoutWriter
```

::Anchor{id="StdoutWriter.impl.make"}

### Associated function `make`

```silk
pub fn make() -> StdoutWriter
```

Returns a writer. It does not write.

::Anchor{id="StderrWriter.impl"}

## Implementation `StderrWriter`

```silk
impl StderrWriter
```

::Anchor{id="StderrWriter.impl.make"}

### Associated function `make`

```silk
pub fn make() -> StderrWriter
```

Returns a writer. It does not write.

::Anchor{id="StdoutWriter.impl.Writer"}

## Implementation `Writer for StdoutWriter`

```silk
impl Writer for StdoutWriter
```

::Anchor{id="StdoutWriter.impl.Writer.writeAll"}

### Operation `writeAll`

```silk
effect fn writeAll(self: &mut Self, val: &[u8]) -> () ! WriterError ? &mut Writer
```

::Anchor{id="StdoutWriter.impl.Writer.flush"}

### Operation `flush`

```silk
effect fn flush(self: &mut Self) -> () ! WriterError ? &mut Writer
```

::Anchor{id="StderrWriter.impl.Writer"}

## Implementation `Writer for StderrWriter`

```silk
impl Writer for StderrWriter
```

::Anchor{id="StderrWriter.impl.Writer.writeAll"}

### Operation `writeAll`

```silk
effect fn writeAll(self: &mut Self, val: &[u8]) -> () ! WriterError ? &mut Writer
```

::Anchor{id="StderrWriter.impl.Writer.flush"}

### Operation `flush`

```silk
effect fn flush(self: &mut Self) -> () ! WriterError ? &mut Writer
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
