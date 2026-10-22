The `ByteDuplex` effect: a two-way byte stream, such as a TCP connection, with partial reads and
writes and deadlines.

## When to use
Require `&mut ByteDuplex` in protocol code that must know exactly how many bytes each read and
write moved, such as HTTP or TLS. Most code uses it through `silk.buffered_duplex`. Use
`silk.writer.Writer` when each write must complete or fail as a whole.

## Details
[`ByteDuplex.readSome`](#ByteDuplex.impl.readSome), [`ByteDuplex.writeSome`](#ByteDuplex.impl.writeSome), and [`ByteDuplex.writeSomeVectored`](#ByteDuplex.impl.writeSomeVectored) can move
fewer bytes than the caller offers. A successful read or write of a non-empty slice moves at
least one byte. The bytes after that count stay with the caller. `ReadTransfer.End` means that
the peer ended the stream. It is not a message of the protocol.

Each operation takes a deadline: an absolute time on the active `MonotonicClock`, or none.

A provider implements the `unsafe` `...Raw` operations. The safe operations check the counts
that the provider reports, so callers use only the safe operations.

## Errors
- [`ByteIoError`](#ByteIoError) for each failure. `Timeout` when the deadline passes, `Closed` after a close,
  `Provider` for a failure of the transport.

## Gotchas
If a provider reports a count that is not possible, the safe operation closes the transport and
fails with `InvalidTransferCount`. Do not try again with the same buffer. If an operation is
canceled during a transfer, it is not known how many bytes moved. Close the transport.

## See also
- `silk.buffered_duplex` for buffered reads and writes over a `ByteDuplex`.
- `silk.memory_byte_duplex` for a scripted transport to use in tests.

Import as `ByteDuplex` with `import silk.byte_duplex { ByteDuplex }`.

Public declarations: 4.

::Anchor{id="ByteIoOperation"}

## `ByteIoOperation`

```silk
pub enum ByteIoOperation
```

The operation that failed, as recorded in a [`ByteIoError`](#ByteIoError).

::Anchor{id="ByteIoOperation.Read"}

### `Read`

```silk
Read
```

A read.

::Anchor{id="ByteIoOperation.Write"}

### `Write`

```silk
Write
```

A write.

::Anchor{id="ByteIoOperation.Flush"}

### `Flush`

```silk
Flush
```

A flush.

::Anchor{id="ByteIoOperation.ShutdownWrite"}

### `ShutdownWrite`

```silk
ShutdownWrite
```

A close of the write direction.

::Anchor{id="ByteIoOperation.Close"}

### `Close`

```silk
Close
```

A close of the whole transport.

::Anchor{id="ByteIoError"}

## `ByteIoError`

```silk
pub union ByteIoError
```

The error from a [`ByteDuplex`](#ByteDuplex) operation.

### Details

`Timeout` means that the deadline passed, `Closed` that the transport or its write direction is
closed, and `Provider` that the transport failed for its own reason. `InvalidTransferCount`
means that the provider reported a count that is not possible. The safe operation then closes
the transport.

### Gotchas

After `InvalidTransferCount`, do not try again with the same buffer. If an operation is canceled
during a transfer, it is not known how many bytes moved. Close the transport.

::Anchor{id="ByteIoError.Timeout"}

### `Timeout`

```silk
Timeout
```

The deadline passed before the operation completed.

::Anchor{id="ByteIoError.Timeout.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that failed.

::Anchor{id="ByteIoError.InvalidTransferCount"}

### `InvalidTransferCount`

```silk
InvalidTransferCount
```

The provider reported a count that is not possible: 0, or more than the slice length. The
transport is closed.

::Anchor{id="ByteIoError.InvalidTransferCount.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that failed.

::Anchor{id="ByteIoError.InvalidTransferCount.count"}

#### Field `count`

```silk
pub count: usize
```

The count that the provider reported.

::Anchor{id="ByteIoError.InvalidTransferCount.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The length of the slice that the caller offered.

::Anchor{id="ByteIoError.Closed"}

### `Closed`

```silk
Closed
```

The transport, or its write direction, is closed.

::Anchor{id="ByteIoError.Closed.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that failed.

::Anchor{id="ByteIoError.Provider"}

### `Provider`

```silk
Provider
```

The transport failed for its own reason, such as a connection reset.

::Anchor{id="ByteIoError.Provider.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that failed.

::Anchor{id="ByteIoError.Provider.code"}

#### Field `code`

```silk
pub code: i32
```

A code that the provider defines, such as an `errno` value.

::Anchor{id="ReadTransfer"}

## `ReadTransfer`

```silk
pub union ReadTransfer
```

The result of a read.

::Anchor{id="ReadTransfer.Data"}

### `Data`

```silk
Data
```

The read put bytes at the start of the output slice.

::Anchor{id="ReadTransfer.Data.count"}

#### Field `count`

```silk
pub count: usize
```

The number of bytes that the read put in the output slice. It is at least 1 for a non-empty
slice.

::Anchor{id="ReadTransfer.End"}

### `End`

```silk
End
```

The peer ended the stream. Later reads also return `End`.

::Anchor{id="ByteDuplex"}

## `ByteDuplex`

```silk
pub service ByteDuplex
```

The effect for one two-way byte stream that the code uses alone, such as a TCP connection,
with partial reads and writes and deadlines.

### When to use

Require `&mut ByteDuplex` in protocol code that must know exactly how many bytes each read and
write moved, such as HTTP or TLS. Most code uses it through `silk.buffered_duplex`. Use
`silk.writer.Writer` when each write must complete or fail as a whole.

### Details

A read or write can move fewer bytes than the caller offers. A successful read or write of a
non-empty slice moves at least one byte. `ReadTransfer.End` means that the peer ended the
stream. Each operation takes a deadline: an absolute time on the active `MonotonicClock`, or
none.

A provider implements the `...Raw` operations. Callers use the safe operations with the same
names without `Raw`: [`ByteDuplex.readSome`](#ByteDuplex.impl.readSome), [`ByteDuplex.writeSome`](#ByteDuplex.impl.writeSome),
[`ByteDuplex.writeSomeVectored`](#ByteDuplex.impl.writeSomeVectored), [`ByteDuplex.flush`](#ByteDuplex.impl.flush), [`ByteDuplex.shutdownWrite`](#ByteDuplex.impl.shutdownWrite), and
[`ByteDuplex.close`](#ByteDuplex.impl.close). A direct call to a `...Raw` operation is `unsafe`, because its count is
not checked.

### Gotchas

If a provider reports a count that is not possible, the safe operation closes the transport and
fails with `InvalidTransferCount`. If an operation is canceled during a transfer, it is not
known how many bytes moved. Close the transport.

::Anchor{id="ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
unsafe effect fn readSomeRaw(
    output: &mut [u8],
    deadline: Option<Instant>
  ) -> ReadTransfer ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

The provider read. It puts bytes at the start of `output` and returns their count, or `End`.

::Anchor{id="ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
unsafe effect fn writeSomeRaw(
    input: &[u8],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

The provider write. It sends bytes from the start of `input` and returns their count.

::Anchor{id="ByteDuplex.writeSomeVectoredRaw"}

### Operation `writeSomeVectoredRaw`

```silk
unsafe effect fn writeSomeVectoredRaw(
    inputs: &[&[u8]],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

The provider vectored write. It sends bytes from the slices of `inputs`, in order, as if they
were one slice, and returns their count. The safe wrapper calls it only when the slices hold
at least one byte.

#### Details

A provider can send several slices in one operation, such as one `writev` system call. A
provider with no such operation writes [`ByteDuplex.firstNonEmpty`](#ByteDuplex.impl.firstNonEmpty) with its own write.

::Anchor{id="ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
unsafe effect fn flushRaw(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

The provider flush. It sends any bytes that the provider holds in a buffer.

::Anchor{id="ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
unsafe effect fn shutdownWriteRaw(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

The provider close of the write direction. The safe wrapper flushes before it calls this.

::Anchor{id="ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
unsafe effect fn closeRaw() -> () ! ByteIoError ? &mut ByteDuplex with Intrinsic.nonParking()
```

The provider close of the whole transport. After the first call, the provider stays closed,
and a later call must succeed and do nothing.

::Anchor{id="ByteDuplex.impl"}

## Implementation `ByteDuplex`

```silk
impl ByteDuplex
```

::Anchor{id="ByteDuplex.impl.readSome"}

### Associated function `readSome`

```silk
pub effect fn readSome(
    output: &mut [u8],
    deadline: Option<Instant>
  ) -> ReadTransfer ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Reads at least one byte into the start of `output`, or returns `ReadTransfer.End` if the peer
ended the stream.

#### Details

An empty `output` returns a count of 0 and does not use the provider. `deadline` is an
absolute time on the active `MonotonicClock`. `Option.none()` means no time limit.

#### Errors

- `ByteIoError.Timeout` if the deadline passes.
- `ByteIoError.InvalidTransferCount` if the provider reports 0 or more than `output.length`.
  The transport is closed, also if the close fails.
- `ByteIoError.Closed` or `ByteIoError.Provider` from the provider.

::Anchor{id="ByteDuplex.impl.writeSome"}

### Associated function `writeSome`

```silk
pub effect fn writeSome(
    input: &[u8],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Writes at least one byte from the start of `input` and returns how many bytes it wrote.

#### Details

An empty `input` returns 0 and does not use the provider. The bytes after the returned count
are not written. Call `writeSome` again with the rest. `deadline` is an absolute time on the
active `MonotonicClock`. `Option.none()` means no time limit.

#### Errors

- `ByteIoError.Timeout` if the deadline passes.
- `ByteIoError.InvalidTransferCount` if the provider reports 0 or more than `input.length`.
  The transport is closed, also if the close fails.
- `ByteIoError.Closed` or `ByteIoError.Provider` from the provider.

::Anchor{id="ByteDuplex.impl.writeSomeVectored"}

### Associated function `writeSomeVectored`

```silk
pub effect fn writeSomeVectored(
    inputs: &[&[u8]],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Writes at least one byte from the slices of `inputs`, in order, as if they were one slice, and
returns how many bytes it wrote.

#### When to use

Use it for a message that is in several parts, such as buffered bytes and a large body, so
that a provider such as a socket can send the parts in one operation without a copy.

#### Details

The count can end inside any slice. The bytes after it are not written. When the slices hold
no bytes, it returns 0 and does not use the provider. `deadline` is an absolute time on the
active `MonotonicClock`. `Option.none()` means no time limit.

#### Errors

- `ByteIoError.Timeout` if the deadline passes.
- `ByteIoError.InvalidTransferCount` if the provider reports 0 or more than the sum of the
  slice lengths. The transport is closed, also if the close fails.
- `ByteIoError.Closed` or `ByteIoError.Provider` from the provider.

::Anchor{id="ByteDuplex.impl.firstNonEmpty"}

### Associated function `firstNonEmpty`

```silk
pub fn firstNonEmpty<'a>(inputs: &[&'a [u8]]) -> &'a [u8]
```

Returns the first slice of `inputs` that is not empty, or an empty slice.

#### When to use

Use it to implement `writeSomeVectoredRaw` in a provider that has no faster way to write
several slices: write the returned slice with the provider's own write. A partial write of
the first part is a valid vectored write.

::Anchor{id="ByteDuplex.impl.flush"}

### Associated function `flush`

```silk
pub effect fn flush(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Sends any bytes that the provider holds in a buffer.

#### Errors

- `ByteIoError` from the provider, or `Timeout` if the deadline passes.

::Anchor{id="ByteDuplex.impl.shutdownWrite"}

### Associated function `shutdownWrite`

```silk
pub effect fn shutdownWrite(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Flushes and then closes the write direction. Reads still work.

#### When to use

Use it to tell the peer that no more data comes, while you still read its answer.

#### Errors

- `ByteIoError` from the flush or the shutdown, or `Timeout` if the deadline passes.

::Anchor{id="ByteDuplex.impl.close"}

### Associated function `close`

```silk
pub effect fn close() -> () ! ByteIoError ? &mut ByteDuplex
```

Closes the whole transport. A later call does nothing.

#### Errors

- `ByteIoError` from the provider. The transport is closed also when the close reports an
  error.

::Anchor{id="ByteDuplex.impl.timeout"}

### Associated function `timeout`

```silk
pub fn timeout(operation: ByteIoOperation) -> ByteIoError
```

Returns `ByteIoError.Timeout` for `operation`. Providers use it.

::Anchor{id="ByteDuplex.impl.invalidTransferCount"}

### Associated function `invalidTransferCount`

```silk
pub fn invalidTransferCount(
    operation: ByteIoOperation,
    count: usize,
    limit: usize,
  ) -> ByteIoError
```

Returns `ByteIoError.InvalidTransferCount` with the reported `count` and the slice length
`limit`.

::Anchor{id="ByteDuplex.impl.closed"}

### Associated function `closed`

```silk
pub fn closed(operation: ByteIoOperation) -> ByteIoError
```

Returns `ByteIoError.Closed` for `operation`. Providers use it.

::Anchor{id="ByteDuplex.impl.provider"}

### Associated function `provider`

```silk
pub fn provider(operation: ByteIoOperation, code: i32) -> ByteIoError
```

Returns `ByteIoError.Provider` for `operation` with a provider-defined `code`.

Category: Input and output.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
