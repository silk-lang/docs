A scripted `ByteDuplex` transport in memory, for tests of protocol code.

## When to use
Use [`MemoryByteDuplex`](#MemoryByteDuplex) to test code that uses `silk.byte_duplex.ByteDuplex` without a network.
A script controls what each read returns, how many bytes each write accepts, and when failures
happen. After the test, check the bytes that the code wrote with [`MemoryByteDuplex.outbound`](#MemoryByteDuplex.impl.outbound)
and the order of operations with [`MemoryByteDuplex.audit`](#MemoryByteDuplex.impl.audit).

## Details
[`MemoryByteDuplex.make`](#MemoryByteDuplex.impl.make) takes the read events, the write events, and the sizes of the output
and audit storage. It allocates everything one time. The operations do not allocate.

Each event has a `readyAt` time on the active `MonotonicClock`. An operation waits until the
event is ready. If the deadline comes first, the operation fails with `Timeout`. When an event
time is equal to the deadline, the deadline wins.

A read returns the bytes of the current `Data` event, as many as fit in the output slice. When
the read script is empty, reads return `End`. After `End`, reads return `End` and do not use the
script.

## Gotchas
Each write uses the next write event. A vectored write is one write event that takes bytes from
its slices in order. If there are no more write events, or the output storage is full, the
write fails with a `Provider` error, code 1 or 2. If the audit storage is full, the next
operation fails with code 3. Make the storage large enough for the whole test.

This transport models a reliable byte stream only. It does not model packets, DNS, or
certificates.

## Examples
### Answer a request and check the response
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.buffered_duplex { BufferedDuplex, withBufferedCapacity }
import silk.buffered_input { BufferError }
import silk.byte_duplex { ByteDuplex }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.list { List }
import silk.memory_byte_duplex {
  MemoryByteDuplex,
  MemoryReadEvent,
  MemoryWriteAction,
  MemoryWriteEvent
}
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.system_clock { Instant, SystemClock }

struct FixedClock {}

impl MonotonicClock for FixedClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }

  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    return ()
  }

  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    return ()
  }
}

effect fn transport() -> MemoryByteDuplex
  ! OutOfMemoryError
  ? &mut Allocator {
  let mut reads = List<MemoryReadEvent>.make()
  let bytes = run Bytes.copy(&b"ping")
  run List<MemoryReadEvent>.append(
    &mut reads,
    MemoryReadEvent.Data { readyAt: SystemClock.make(0, 0), bytes: move bytes }
  )
  let mut writes = List<MemoryWriteEvent>.make()
  run List<MemoryWriteEvent>.append(
    &mut writes,
    MemoryWriteEvent {
      readyAt: SystemClock.make(0, 0),
      action: MemoryWriteAction.Accept { count: 4 }
    }
  )
  return run MemoryByteDuplex.make(move reads, move writes, 4, 8, Option<i32>.none())
}

// Reads a 4-byte request and answers it.
effect<'session> fn answer<'session, P>(session: &'session mut BufferedDuplex<'session, P>) -> ()
  ! BufferError
  ? &mut MonotonicClock where
  &'session mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
  let mut request: [u8; 4] = [0, 0, 0, 0]
  run BufferedDuplex.readExact(&mut session.*, &mut request, Option<Instant>.none())
  run BufferedDuplex.writeAll(&mut session.*, b"pong", Option<Instant>.none())
  return run BufferedDuplex.flush(&mut session.*, Option<Instant>.none())
}

pub effect fn main() -> i32
  ! BufferError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = FixedClock {}
  let mut duplex = run transport() |> Effect.provideMut<Allocator>(&mut allocator)
  run withBufferedCapacity<(), BufferError>(&mut duplex, 16, 16, answer)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let sent = MemoryByteDuplex.outbound(&duplex)
  if sent.length != 4 || sent[0] != 112 || sent[1] != 111 {
    return 1
  }
  return 0
}
```

Import as `MemoryByteDuplex` with `import silk.memory_byte_duplex { MemoryByteDuplex }`.

Public declarations: 6.

::Anchor{id="MemoryReadEvent"}

## `MemoryReadEvent`

```silk
pub union MemoryReadEvent
```

One step of the read script.

::Anchor{id="MemoryReadEvent.Data"}

### `Data`

```silk
Data
```

Makes `bytes` available at `readyAt`. Reads take them in order, as many as fit in each output
slice.

::Anchor{id="MemoryReadEvent.Data.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The time when the event is ready.

::Anchor{id="MemoryReadEvent.Data.bytes"}

#### Field `bytes`

```silk
pub bytes: Bytes
```

The bytes that reads return.

::Anchor{id="MemoryReadEvent.End"}

### `End`

```silk
End
```

Ends the stream at `readyAt`.

::Anchor{id="MemoryReadEvent.End.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The time when the event is ready.

::Anchor{id="MemoryReadEvent.Failure"}

### `Failure`

```silk
Failure
```

Makes the read fail at `readyAt` with `ByteIoError.Provider`.

::Anchor{id="MemoryReadEvent.Failure.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The time when the event is ready.

::Anchor{id="MemoryReadEvent.Failure.code"}

#### Field `code`

```silk
pub code: i32
```

The `code` of the `Provider` error.

::Anchor{id="MemoryReadEvent.InvalidCount"}

### `InvalidCount`

```silk
InvalidCount
```

Makes the read report `count` without writing bytes, to test the count check.

::Anchor{id="MemoryReadEvent.InvalidCount.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The time when the event is ready.

::Anchor{id="MemoryReadEvent.InvalidCount.count"}

#### Field `count`

```silk
pub count: usize
```

The count to report. Use 0 or a value larger than the output slice.

::Anchor{id="MemoryWriteAction"}

## `MemoryWriteAction`

```silk
pub union MemoryWriteAction
```

What one write does.

::Anchor{id="MemoryWriteAction.Accept"}

### `Accept`

```silk
Accept
```

Accepts up to `count` bytes from the start of the input.

::Anchor{id="MemoryWriteAction.Accept.count"}

#### Field `count`

```silk
pub count: usize
```

The maximum number of bytes to accept.

::Anchor{id="MemoryWriteAction.Failure"}

### `Failure`

```silk
Failure
```

Makes the write fail with `ByteIoError.Provider`. No bytes are accepted.

::Anchor{id="MemoryWriteAction.Failure.code"}

#### Field `code`

```silk
pub code: i32
```

The `code` of the `Provider` error.

::Anchor{id="MemoryWriteAction.InvalidCount"}

### `InvalidCount`

```silk
InvalidCount
```

Makes the write report `count` without accepting bytes, to test the count check.

::Anchor{id="MemoryWriteAction.InvalidCount.count"}

#### Field `count`

```silk
pub count: usize
```

The count to report.

::Anchor{id="MemoryWriteEvent"}

## `MemoryWriteEvent`

```silk
pub struct MemoryWriteEvent
```

One step of the write script.

::Anchor{id="MemoryWriteEvent.readyAt"}

### Field `readyAt`

```silk
pub readyAt: Instant
```

The time when the write can happen.

::Anchor{id="MemoryWriteEvent.action"}

### Field `action`

```silk
pub action: MemoryWriteAction
```

What the write does.

::Anchor{id="MemoryByteDuplexPhase"}

## `MemoryByteDuplexPhase`

```silk
pub enum MemoryByteDuplexPhase
```

The state of a [`MemoryByteDuplex`](#MemoryByteDuplex), for checks in tests.

::Anchor{id="MemoryByteDuplexPhase.Open"}

### `Open`

```silk
Open
```

Reads and writes work.

::Anchor{id="MemoryByteDuplexPhase.WriteShutdown"}

### `WriteShutdown`

```silk
WriteShutdown
```

The write direction is closed. Reads still work.

::Anchor{id="MemoryByteDuplexPhase.Closed"}

### `Closed`

```silk
Closed
```

The transport is closed.

::Anchor{id="MemoryByteDuplexPhase.Invalid"}

### `Invalid`

```silk
Invalid
```

A write failed, or the script or storage ran out. Reads and writes fail.

::Anchor{id="MemoryByteDuplexAudit"}

## `MemoryByteDuplexAudit`

```silk
pub struct MemoryByteDuplexAudit
```

One recorded operation.

::Anchor{id="MemoryByteDuplexAudit.operation"}

### Field `operation`

```silk
pub operation: ByteIoOperation
```

The operation.

::Anchor{id="MemoryByteDuplexAudit.count"}

### Field `count`

```silk
pub count: usize
```

The number of bytes that the operation moved. It is 0 for flush, shutdown, close, and
failures.

::Anchor{id="MemoryWriteAction.impl.Copy"}

## Implementation `Copy for MemoryWriteAction`

```silk
impl Copy for MemoryWriteAction
```

::Anchor{id="MemoryByteDuplexAudit.impl.Copy"}

## Implementation `Copy for MemoryByteDuplexAudit`

```silk
impl Copy for MemoryByteDuplexAudit
```

::Anchor{id="MemoryByteDuplex"}

## `MemoryByteDuplex`

```silk
pub struct MemoryByteDuplex
```

A scripted `ByteDuplex` transport in memory, for tests of protocol code. Make one with
[`MemoryByteDuplex.make`](#MemoryByteDuplex.impl.make) and provide it as `ByteDuplex`.

### When to use
Use it to test code that uses `silk.byte_duplex.ByteDuplex` without a network. A script controls
what each read returns, how many bytes each write accepts, and when failures happen. After the
test, check the bytes that the code wrote with [`MemoryByteDuplex.outbound`](#MemoryByteDuplex.impl.outbound) and the order of
operations with [`MemoryByteDuplex.audit`](#MemoryByteDuplex.impl.audit).

### Details
[`MemoryByteDuplex.make`](#MemoryByteDuplex.impl.make) allocates everything one time. The operations do not allocate.

Each event has a `readyAt` time on the active `MonotonicClock`. An operation waits until the
event is ready. If the deadline comes first, the operation fails with `Timeout`. When an event
time is equal to the deadline, the deadline wins.

A read returns the bytes of the current `Data` event, as many as fit in the output slice. When
the read script is empty, reads return `End`. After `End`, reads return `End` and do not use the
script.

### Gotchas
Each write uses the next write event. A vectored write is one write event that takes bytes from
its slices in order. If there are no more write events, or the output storage is full, the
write fails with a `Provider` error, code 1 or 2. If the audit storage is full, the next
operation fails with code 3. Make the storage large enough for the whole test.

This transport models a reliable byte stream only. It does not model packets, DNS, or
certificates.

::Anchor{id="MemoryByteDuplex.impl"}

## Implementation `MemoryByteDuplex`

```silk
impl MemoryByteDuplex
```

::Anchor{id="MemoryByteDuplex.impl.make"}

### Associated function `make`

```silk
pub effect fn make(
    reads: List<MemoryReadEvent>,
    writes: List<MemoryWriteEvent>,
    outboundCapacity: usize,
    auditCapacity: usize,
    closeFailure: Option<i32>,
  ) -> MemoryByteDuplex ! OutOfMemoryError ? &mut Allocator
```

Returns a transport that follows `reads` and `writes`.

#### Details

`outboundCapacity` is the maximum number of bytes that writes can accept in total.
`auditCapacity` is the maximum number of operations that the audit records, including the
close. If `closeFailure` is present, the first close fails with that provider code.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage.

::Anchor{id="MemoryByteDuplex.impl.outbound"}

### Method `outbound`

```silk
pub fn outbound<'a>(self: &'a Self) -> &'a [u8]
```

Returns all bytes that writes accepted, in order.

::Anchor{id="MemoryByteDuplex.impl.audit"}

### Method `audit`

```silk
pub fn audit<'a>(self: &'a Self) -> &'a [MemoryByteDuplexAudit]
```

Returns the recorded operations, in order.

::Anchor{id="MemoryByteDuplex.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> MemoryByteDuplexPhase
```

Returns the current state.

::Anchor{id="MemoryByteDuplex.impl.closeAttempts"}

### Method `closeAttempts`

```silk
pub fn closeAttempts(self: &Self) -> usize
```

Returns how many times the transport was closed, including closes that did nothing.

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex"}

## Implementation `ByteDuplex for MemoryByteDuplex`

```silk
impl ByteDuplex for MemoryByteDuplex
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: MemoryByteDuplex.read
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: MemoryByteDuplex.write
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.writeSomeVectoredRaw"}

### Operation `writeSomeVectoredRaw`

```silk
writeSomeVectoredRaw: MemoryByteDuplex.writeVectored
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
flushRaw: MemoryByteDuplex.flushOutput
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
shutdownWriteRaw: MemoryByteDuplex.shutdownOutput
```

::Anchor{id="MemoryByteDuplex.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
closeRaw: MemoryByteDuplex.closeLease
```

Category: Input and output.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
