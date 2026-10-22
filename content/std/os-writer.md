Native Writer providers borrowing process standard output and standard error.

## When to use
Construct [`StdoutWriter`](#StdoutWriter) or [`StderrWriter`](#StderrWriter) at a native application edge and provide it for
`silk.writer.Writer`. Portable code can supply its own Writer provider instead.

## Details
Construction makes no foreign call. Writes complete each byte sequence through selected libc
descriptor calls. Flush is a no-op because these providers have no userspace buffer.

## Gotchas
A failed write may have committed a prefix. Descriptors remain process-owned and are never
closed by these providers. The module is empty on WebAssembly and no-libc profiles.

Import as `StdoutWriter` with `import silk.os_writer { StdoutWriter }`.

Public declarations: 2.

::Anchor{id="StdoutWriter"}

## `StdoutWriter`

```silk
pub struct StdoutWriter
```

A Writer provider borrowing process standard output without owning or closing its descriptor.

::Anchor{id="StderrWriter"}

## `StderrWriter`

```silk
pub struct StderrWriter
```

A Writer provider borrowing process standard error without owning or closing its descriptor.

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

Creates a provider borrowing standard output without making a foreign call.

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

Creates a provider borrowing standard error without making a foreign call.

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
