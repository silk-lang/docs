Fixed-capacity retained byte output with exact-prefix flushing.

## Details

A successful write means this actor owns the reported prefix. Only explicit `flush` or `finish`
promises to drive pending bytes to the provider boundary; drop and scope release never flush.

Import as `BufferedOutput` with `import silk.buffered_output { BufferedOutput }`.

Public declarations: 1.

::Anchor{id="BufferedOutput"}

## `BufferedOutput`

```silk
pub struct BufferedOutput
```

One fixed-capacity pending output buffer.

::Anchor{id="BufferedOutput.impl"}

## Implementation `BufferedOutput`

```silk
impl BufferedOutput
```

::Anchor{id="BufferedOutput.impl.make"}

### Associated function `make`

```silk
pub effect fn make(capacity: usize) -> BufferedOutput
  ! BufferError | OutOfMemoryError
  ? &mut Allocator
```

Allocates and initializes one fixed-capacity output buffer.

::Anchor{id="BufferedOutput.impl.capacity"}

### Method `capacity`

```silk
pub fn capacity(self: &Self) -> usize
```

Returns the immutable fixed capacity.

::Anchor{id="BufferedOutput.impl.pending"}

### Method `pending`

```silk
pub fn pending(self: &Self) -> usize
```

Returns the retained pending byte count.

::Anchor{id="BufferedOutput.impl.isTerminal"}

### Method `isTerminal`

```silk
pub fn isTerminal(self: &Self) -> bool
```

Reports whether a preceding external failure made this output terminal.

::Anchor{id="BufferedOutput.impl.writeSome"}

### Method `writeSome`

```silk
pub effect fn writeSome(
    self: &mut Self,
    input: &[u8],
    deadline: Option<Instant>,
  ) -> usize
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Accepts one positive input prefix, writing pending bytes only when space is needed.

::Anchor{id="BufferedOutput.impl.writeAll"}

### Method `writeAll`

```silk
pub effect fn writeAll(
    self: &mut Self,
    input: &[u8],
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Accepts the complete finite input or reports its accepted prefix on failure.

::Anchor{id="BufferedOutput.impl.writeVecAll"}

### Method `writeVecAll`

```silk
pub effect fn writeVecAll(
    self: &mut Self,
    inputs: &[Bytes],
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Accepts borrowed byte vectors in order after checking aggregate length arithmetic.

::Anchor{id="BufferedOutput.impl.flush"}

### Method `flush`

```silk
pub effect fn flush(
    self: &mut Self,
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Writes every pending byte exactly once, then flushes the provider boundary.

::Anchor{id="BufferedOutput.impl.finish"}

### Method `finish`

```silk
pub effect fn finish(
    self: &mut Self,
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Explicitly completes pending output; equivalent to flush.

::Anchor{id="BufferedOutput.impl.writeSomeWriter"}

### Method `writeSomeWriter`

```silk
pub effect fn writeSomeWriter(self: &mut Self, input: &[u8]) -> usize
  ! BufferError
  ? &mut Writer
```

Accepts one prefix for a Writer-backed adapter without advertising deadlines.

::Anchor{id="BufferedOutput.impl.writeAllWriter"}

### Method `writeAllWriter`

```silk
pub effect fn writeAllWriter(self: &mut Self, input: &[u8]) -> ()
  ! BufferError
  ? &mut Writer
```

Accepts a complete finite value for a Writer-backed adapter.

::Anchor{id="BufferedOutput.impl.flushWriter"}

### Method `flushWriter`

```silk
pub effect fn flushWriter(self: &mut Self) -> () ! BufferError ? &mut Writer
```

Writes the complete pending value through Writer, whose failure has unknown external progress.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
