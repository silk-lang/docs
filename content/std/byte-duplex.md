Partial reliable-byte input and output with explicit deadlines and directional shutdown.

## When to use

Require [`ByteDuplex`](#ByteDuplex) when a protocol driver owns its buffers and must acknowledge exact
transport prefixes. Use `silk.writer.Writer` when each write is all-or-error.

## Details

Each nonempty successful transfer reports one positive prefix. Bytes after that prefix remain
with the caller. Deadlines are absolute marks from the active `MonotonicClock` provider.
`ReadTransfer.End` is transport end. It is not a protocol close message.

## Gotchas

An invalid provider count makes the lease unusable. A canceled external transfer can also make
ownership ambiguous. Close such a lease and do not retry its last buffer.

Import as `ByteDuplex` with `import silk.byte_duplex { ByteDuplex }`.

Public declarations: 4.

::Anchor{id="ByteIoOperation"}

## `ByteIoOperation`

```silk
pub enum ByteIoOperation
```

The operation associated with one portable byte-I/O failure.

::Anchor{id="ByteIoOperation.Read"}

### `Read`

```silk
Read
```

A partial input transfer.

::Anchor{id="ByteIoOperation.Write"}

### `Write`

```silk
Write
```

A partial output transfer.

::Anchor{id="ByteIoOperation.Flush"}

### `Flush`

```silk
Flush
```

A transport-boundary flush.

::Anchor{id="ByteIoOperation.ShutdownWrite"}

### `ShutdownWrite`

```silk
ShutdownWrite
```

A write-direction shutdown.

::Anchor{id="ByteIoOperation.Close"}

### `Close`

```silk
Close
```

A terminal duplex close.

::Anchor{id="ByteIoError"}

## `ByteIoError`

```silk
pub union ByteIoError
```

A typed failure from one [`ByteDuplex`](#ByteDuplex) operation.

::Anchor{id="ByteIoError.Timeout"}

### `Timeout`

```silk
Timeout
```

The absolute monotonic deadline was reached.

::Anchor{id="ByteIoError.Timeout.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that reached its deadline.

::Anchor{id="ByteIoError.InvalidTransferCount"}

### `InvalidTransferCount`

```silk
InvalidTransferCount
```

The provider reported an impossible successful prefix.

::Anchor{id="ByteIoError.InvalidTransferCount.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation that reported the count.

::Anchor{id="ByteIoError.InvalidTransferCount.count"}

#### Field `count`

```silk
pub count: usize
```

The count reported by the provider.

::Anchor{id="ByteIoError.InvalidTransferCount.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The caller buffer length for that transfer.

::Anchor{id="ByteIoError.Closed"}

### `Closed`

```silk
Closed
```

The requested direction or complete lease is closed.

::Anchor{id="ByteIoError.Closed.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation rejected after closure.

::Anchor{id="ByteIoError.Provider"}

### `Provider`

```silk
Provider
```

The provider rejected an otherwise valid operation.

::Anchor{id="ByteIoError.Provider.operation"}

#### Field `operation`

```silk
pub operation: ByteIoOperation
```

The rejected operation.

::Anchor{id="ByteIoError.Provider.code"}

#### Field `code`

```silk
pub code: i32
```

One provider-defined diagnostic code.

::Anchor{id="ReadTransfer"}

## `ReadTransfer`

```silk
pub union ReadTransfer
```

The result of one partial input operation.

::Anchor{id="ReadTransfer.Data"}

### `Data`

```silk
Data
```

A positive prefix of the output slice now contains input bytes.

::Anchor{id="ReadTransfer.Data.count"}

#### Field `count`

```silk
pub count: usize
```

The exact initialized prefix length.

::Anchor{id="ReadTransfer.End"}

### `End`

```silk
End
```

The underlying transport reached orderly end-of-input.

::Anchor{id="ByteDuplex"}

## `ByteDuplex`

```silk
pub service ByteDuplex
```

Unsafe provider hooks for one exclusive reliable-byte transport.

### Details

Ordinary callers use the safe inherent operations with the corresponding names. Provider
implementations satisfy these hooks; calling one directly acknowledges that its raw transfer
count has not passed the canonical boundary validation.

::Anchor{id="ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
unsafe effect fn readSomeRaw(
    output: &mut [u8],
    deadline: Option<Instant>
  ) -> ReadTransfer ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Performs one provider read before canonical transfer validation.

::Anchor{id="ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
unsafe effect fn writeSomeRaw(
    input: &[u8],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Performs one provider write before canonical transfer validation.

::Anchor{id="ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
unsafe effect fn flushRaw(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Performs the provider's transport-boundary flush.

::Anchor{id="ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
unsafe effect fn shutdownWriteRaw(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Closes only the provider's write direction after the canonical wrapper has flushed.

::Anchor{id="ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
unsafe effect fn closeRaw() -> () ! ByteIoError ? &mut ByteDuplex with Intrinsic.nonParking()
```

Closes the complete transport lease. Implementations must remain terminal and idempotent.

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

Reads one positive prefix or reports orderly transport end.

#### Details

Empty output completes without calling the provider. An impossible provider count terminally
closes the lease and returns `InvalidTransferCount`, even if that close itself fails.

::Anchor{id="ByteDuplex.impl.writeSome"}

### Associated function `writeSome`

```silk
pub effect fn writeSome(
    input: &[u8],
    deadline: Option<Instant>
  ) -> usize ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Writes one positive prefix and returns its exact length.

#### Details

Empty input completes without calling the provider. An impossible provider count terminally
closes the lease and returns `InvalidTransferCount`, even if that close itself fails.

::Anchor{id="ByteDuplex.impl.flush"}

### Associated function `flush`

```silk
pub effect fn flush(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Flushes accepted output to the provider's documented transport boundary.

::Anchor{id="ByteDuplex.impl.shutdownWrite"}

### Associated function `shutdownWrite`

```silk
pub effect fn shutdownWrite(
    deadline: Option<Instant>
  ) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock
```

Flushes accepted output and then closes only the write direction.

::Anchor{id="ByteDuplex.impl.close"}

### Associated function `close`

```silk
pub effect fn close() -> () ! ByteIoError ? &mut ByteDuplex
```

Closes the complete transport lease. Repeated calls remain terminal.

::Anchor{id="ByteDuplex.impl.timeout"}

### Associated function `timeout`

```silk
pub fn timeout(operation: ByteIoOperation) -> ByteIoError
```

Constructs a timeout failure for `operation`.

::Anchor{id="ByteDuplex.impl.invalidTransferCount"}

### Associated function `invalidTransferCount`

```silk
pub fn invalidTransferCount(
    operation: ByteIoOperation,
    count: usize,
    limit: usize,
  ) -> ByteIoError
```

Constructs an invalid-count failure with the observed and permitted counts.

::Anchor{id="ByteDuplex.impl.closed"}

### Associated function `closed`

```silk
pub fn closed(operation: ByteIoOperation) -> ByteIoError
```

Constructs a closed-direction failure for `operation`.

::Anchor{id="ByteDuplex.impl.provider"}

### Associated function `provider`

```silk
pub fn provider(operation: ByteIoOperation, code: i32) -> ByteIoError
```

Constructs a provider failure with one provider-defined diagnostic code.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
