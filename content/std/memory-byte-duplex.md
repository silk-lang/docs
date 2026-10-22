A bounded scripted in-memory [`ByteDuplex`](/docs/std/byte-duplex#ByteDuplex) provider for deterministic protocol execution.

## When to use

Use [`MemoryByteDuplex`](#MemoryByteDuplex) to drive exact transport fragments, deadlines, end, and failures
without a socket. Supply it lexically as `silk.byte_duplex.ByteDuplex`.

## Details

Construction owns all script, output, and audit storage. Service operations allocate nothing.
Event times and operation deadlines use the active `MonotonicClock` timeline. The provider
records accepted byte prefixes and lifecycle order for later inspection. Once input reports
`End`, later reads remain at end without consulting another script event.

## Gotchas

This provider models reliable bytes only. It does not model packets, network policy, DNS, or
host trust. When an event time equals a deadline, the deadline wins.

Import as `MemoryByteDuplex` with `import silk.memory_byte_duplex { MemoryByteDuplex }`.

Public declarations: 6.

::Anchor{id="MemoryReadEvent"}

## `MemoryReadEvent`

```silk
pub union MemoryReadEvent
```

One scripted input event on an absolute monotonic timeline.

::Anchor{id="MemoryReadEvent.Data"}

### `Data`

```silk
Data
```

Makes owned bytes available at `readyAt` and permits fragmentation by caller buffer size.

::Anchor{id="MemoryReadEvent.Data.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The event's absolute ready mark.

::Anchor{id="MemoryReadEvent.Data.bytes"}

#### Field `bytes`

```silk
pub bytes: Bytes
```

The complete bytes released in order.

::Anchor{id="MemoryReadEvent.End"}

### `End`

```silk
End
```

Reports orderly transport end at `readyAt`.

::Anchor{id="MemoryReadEvent.End.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The event's absolute ready mark.

::Anchor{id="MemoryReadEvent.Failure"}

### `Failure`

```silk
Failure
```

Reports one provider failure at `readyAt`.

::Anchor{id="MemoryReadEvent.Failure.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The event's absolute ready mark.

::Anchor{id="MemoryReadEvent.Failure.code"}

#### Field `code`

```silk
pub code: i32
```

One provider-defined diagnostic code.

::Anchor{id="MemoryReadEvent.InvalidCount"}

### `InvalidCount`

```silk
InvalidCount
```

Reports an impossible count to test lease validation.

::Anchor{id="MemoryReadEvent.InvalidCount.readyAt"}

#### Field `readyAt`

```silk
pub readyAt: Instant
```

The event's absolute ready mark.

::Anchor{id="MemoryReadEvent.InvalidCount.count"}

#### Field `count`

```silk
pub count: usize
```

The impossible count returned without changing the output buffer.

::Anchor{id="MemoryWriteAction"}

## `MemoryWriteAction`

```silk
pub union MemoryWriteAction
```

One scripted output action on an absolute monotonic timeline.

::Anchor{id="MemoryWriteAction.Accept"}

### `Accept`

```silk
Accept
```

Accepts at most this positive prefix.

::Anchor{id="MemoryWriteAction.Accept.count"}

#### Field `count`

```silk
pub count: usize
```

The maximum accepted prefix.

::Anchor{id="MemoryWriteAction.Failure"}

### `Failure`

```silk
Failure
```

Reports one provider failure without accepting bytes.

::Anchor{id="MemoryWriteAction.Failure.code"}

#### Field `code`

```silk
pub code: i32
```

One provider-defined diagnostic code.

::Anchor{id="MemoryWriteAction.InvalidCount"}

### `InvalidCount`

```silk
InvalidCount
```

Reports an impossible count without accepting bytes.

::Anchor{id="MemoryWriteAction.InvalidCount.count"}

#### Field `count`

```silk
pub count: usize
```

The impossible returned count.

::Anchor{id="MemoryWriteEvent"}

## `MemoryWriteEvent`

```silk
pub struct MemoryWriteEvent
```

One scripted output event on an absolute monotonic timeline.

::Anchor{id="MemoryWriteEvent.readyAt"}

### Field `readyAt`

```silk
pub readyAt: Instant
```

The event's absolute ready mark.

::Anchor{id="MemoryWriteEvent.action"}

### Field `action`

```silk
pub action: MemoryWriteAction
```

The action performed when the event becomes ready.

::Anchor{id="MemoryByteDuplexPhase"}

## `MemoryByteDuplexPhase`

```silk
pub enum MemoryByteDuplexPhase
```

The provider lifecycle phase visible to deterministic assertions.

::Anchor{id="MemoryByteDuplexPhase.Open"}

### `Open`

```silk
Open
```

The complete lease and write direction remain active; input may still be readable or at end.

::Anchor{id="MemoryByteDuplexPhase.WriteShutdown"}

### `WriteShutdown`

```silk
WriteShutdown
```

The write direction is closed; input may still be readable or at end.

::Anchor{id="MemoryByteDuplexPhase.Closed"}

### `Closed`

```silk
Closed
```

The complete lease is terminal.

::Anchor{id="MemoryByteDuplexPhase.Invalid"}

### `Invalid`

```silk
Invalid
```

An impossible transfer count invalidated the lease.

::Anchor{id="MemoryByteDuplexAudit"}

## `MemoryByteDuplexAudit`

```silk
pub struct MemoryByteDuplexAudit
```

One operation recorded in provider order.

::Anchor{id="MemoryByteDuplexAudit.operation"}

### Field `operation`

```silk
pub operation: ByteIoOperation
```

The observed operation.

::Anchor{id="MemoryByteDuplexAudit.count"}

### Field `count`

```silk
pub count: usize
```

The exact successful transfer prefix, or zero for lifecycle operations and failures.

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

A bounded scripted provider with owned input, output, and audit storage.

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

Constructs a bounded provider and preallocates every byte and audit slot used by operations.

::Anchor{id="MemoryByteDuplex.impl.outbound"}

### Method `outbound`

```silk
pub fn outbound<'a>(self: &'a Self) -> &'a [u8]
```

Returns the exact accepted output prefix in write order.

::Anchor{id="MemoryByteDuplex.impl.audit"}

### Method `audit`

```silk
pub fn audit<'a>(self: &'a Self) -> &'a [MemoryByteDuplexAudit]
```

Returns the initialized audit prefix in operation order.

::Anchor{id="MemoryByteDuplex.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> MemoryByteDuplexPhase
```

Returns the current directional or terminal phase.

::Anchor{id="MemoryByteDuplex.impl.closeAttempts"}

### Method `closeAttempts`

```silk
pub fn closeAttempts(self: &Self) -> usize
```

Returns the number of first and repeated terminal close calls.

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

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
