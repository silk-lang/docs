Fixed-capacity retained byte input for incremental protocol parsing.

## Details

`BufferedInput` owns one reusable initialized allocation. `peek` borrows only the unread prefix;
`consume` advances it explicitly, so bytes read beyond a protocol delimiter remain available.

Import as `BufferedInput` with `import silk.buffered_input { BufferedInput }`.

Public declarations: 5.

::Anchor{id="MAX_CAPACITY"}

## `MAX_CAPACITY`

```silk
pub const MAX_CAPACITY: usize
```

The largest allocation accepted by one buffered direction.

::Anchor{id="BufferError"}

## `BufferError`

```silk
pub union BufferError
```

A typed buffering, progress, or source-boundary failure.

::Anchor{id="BufferError.InvalidCapacity"}

### `InvalidCapacity`

```silk
InvalidCapacity
```

Construction rejected a zero or excessive capacity before allocation.

::Anchor{id="BufferError.InvalidCapacity.capacity"}

#### Field `capacity`

```silk
pub capacity: usize
```

The rejected allocation size in bytes.

::Anchor{id="BufferError.BufferTooSmall"}

### `BufferTooSmall`

```silk
BufferTooSmall
```

A fill request cannot fit in the fixed allocation.

::Anchor{id="BufferError.BufferTooSmall.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The minimum retained byte count requested.

::Anchor{id="BufferError.BufferTooSmall.capacity"}

#### Field `capacity`

```silk
pub capacity: usize
```

The fixed allocation size in bytes.

::Anchor{id="BufferError.InvalidConsumption"}

### `InvalidConsumption`

```silk
InvalidConsumption
```

Consume would advance beyond the initialized unread prefix.

::Anchor{id="BufferError.InvalidConsumption.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The byte count requested for consumption.

::Anchor{id="BufferError.InvalidConsumption.available"}

#### Field `available`

```silk
pub available: usize
```

The initialized unread byte count.

::Anchor{id="BufferError.InvalidReadCount"}

### `InvalidReadCount`

```silk
InvalidReadCount
```

An input provider reported an impossible successful count.

::Anchor{id="BufferError.InvalidReadCount.count"}

#### Field `count`

```silk
pub count: usize
```

The successful count reported by the provider.

::Anchor{id="BufferError.InvalidReadCount.limit"}

#### Field `limit`

```silk
pub limit: usize
```

The destination length offered to the provider.

::Anchor{id="BufferError.UnexpectedEnd"}

### `UnexpectedEnd`

```silk
UnexpectedEnd
```

Underlying end arrived before an exact operation completed.

::Anchor{id="BufferError.UnexpectedEnd.progress"}

#### Field `progress`

```silk
pub progress: usize
```

The exact prefix copied or discarded before end.

::Anchor{id="BufferError.ReadFailed"}

### `ReadFailed`

```silk
ReadFailed
```

A ByteDuplex read failed after `progress` bytes had already been copied by this operation.

::Anchor{id="BufferError.ReadFailed.progress"}

#### Field `progress`

```silk
pub progress: usize
```

The exact prefix copied before the failed read.

::Anchor{id="BufferError.ReadFailed.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The underlying duplex read failure.

::Anchor{id="BufferError.InputFailed"}

### `InputFailed`

```silk
InputFailed
```

A StandardInput read failed after `progress` bytes had already been copied by this operation.

::Anchor{id="BufferError.InputFailed.progress"}

#### Field `progress`

```silk
pub progress: usize
```

The exact prefix copied before the failed read.

::Anchor{id="BufferError.InputFailed.error"}

#### Field `error`

```silk
pub error: StreamReadError
```

The underlying standard-input failure.

::Anchor{id="BufferError.WriteFailed"}

### `WriteFailed`

```silk
WriteFailed
```

A ByteDuplex write or flush failed after accepting a caller prefix and draining pending bytes.

::Anchor{id="BufferError.WriteFailed.accepted"}

#### Field `accepted`

```silk
pub accepted: usize
```

The exact current caller-input prefix accepted into buffered ownership.

::Anchor{id="BufferError.WriteFailed.drained"}

#### Field `drained`

```silk
pub drained: usize
```

The exact pending prefix acknowledged by the transport during the failing drain operation.

::Anchor{id="BufferError.WriteFailed.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The underlying transport failure.

::Anchor{id="BufferError.UnknownExternalTransfer"}

### `UnknownExternalTransfer`

```silk
UnknownExternalTransfer
```

Writer failed an all-or-error call after earlier complete arguments were accepted.

::Anchor{id="BufferError.UnknownExternalTransfer.progress"}

#### Field `progress`

```silk
pub progress: usize
```

The bytes accepted before the failed Writer call; the failed call has unknown external progress.

::Anchor{id="BufferError.UnknownExternalTransfer.error"}

#### Field `error`

```silk
pub error: WriterError
```

The underlying Writer failure.

::Anchor{id="BufferError.LengthOverflow"}

### `LengthOverflow`

```silk
LengthOverflow
```

Finite vector-length arithmetic overflowed before output.

::Anchor{id="BufferError.Terminal"}

### `Terminal`

```silk
Terminal
```

A preceding external failure made the state unusable.

::Anchor{id="FillOutcome"}

## `FillOutcome`

```silk
pub union FillOutcome
```

The observable result of satisfying a minimum retained prefix.

::Anchor{id="FillOutcome.Available"}

### `Available`

```silk
Available
```

At least the requested minimum is available.

::Anchor{id="FillOutcome.Available.count"}

#### Field `count`

```silk
pub count: usize
```

The initialized unread byte count.

::Anchor{id="FillOutcome.End"}

### `End`

```silk
End
```

The source ended; `available` retained bytes can still be consumed.

::Anchor{id="FillOutcome.End.available"}

#### Field `available`

```silk
pub available: usize
```

The retained byte count still available after source end.

::Anchor{id="DiscardOutcome"}

## `DiscardOutcome`

```silk
pub struct DiscardOutcome
```

The result of a finite discard.

::Anchor{id="DiscardOutcome.count"}

### Field `count`

```silk
pub count: usize
```

The exact consumed byte count.

::Anchor{id="DiscardOutcome.endObserved"}

### Field `endObserved`

```silk
pub endObserved: bool
```

True only when the operation actually observed source end.

::Anchor{id="BufferedInput"}

## `BufferedInput`

```silk
pub struct BufferedInput
```

One fixed-capacity retained input buffer.

::Anchor{id="BufferedInput.impl"}

## Implementation `BufferedInput`

```silk
impl BufferedInput
```

::Anchor{id="BufferedInput.impl.make"}

### Associated function `make`

```silk
pub effect fn make(capacity: usize) -> BufferedInput
  ! BufferError | OutOfMemoryError
  ? &mut Allocator
```

Allocates and initializes one fixed-capacity input buffer.

::Anchor{id="BufferedInput.impl.capacity"}

### Method `capacity`

```silk
pub fn capacity(self: &Self) -> usize
```

Returns the immutable fixed capacity.

::Anchor{id="BufferedInput.impl.unread"}

### Method `unread`

```silk
pub fn unread(self: &Self) -> usize
```

Returns the initialized unread count.

::Anchor{id="BufferedInput.impl.isEnded"}

### Method `isEnded`

```silk
pub fn isEnded(self: &Self) -> bool
```

Reports whether the source has reached sticky end.

::Anchor{id="BufferedInput.impl.isTerminal"}

### Method `isTerminal`

```silk
pub fn isTerminal(self: &Self) -> bool
```

Reports whether an external failure made this input terminal.

::Anchor{id="BufferedInput.impl.peek"}

### Method `peek`

```silk
pub fn peek<'a>(self: &'a Self) -> &'a [u8]
```

Borrows exactly the initialized unread slice.

::Anchor{id="BufferedInput.impl.consume"}

### Method `consume`

```silk
pub effect fn consume(self: &mut Self, count: usize) -> () ! BufferError
```

Advances by `count` initialized bytes, preserving state on overrun.

::Anchor{id="BufferedInput.impl.fill"}

### Method `fill`

```silk
pub effect fn fill(
    self: &mut Self,
    minimum: usize,
    deadline: Option<Instant>,
  ) -> FillOutcome
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Retains at least `minimum` bytes or reports sticky source end.

::Anchor{id="BufferedInput.impl.fillStandard"}

### Method `fillStandard`

```silk
pub effect fn fillStandard(self: &mut Self, minimum: usize) -> FillOutcome
  ! BufferError
  ? &mut StandardInput
```

Retains through StandardInput without advertising a deadline.

::Anchor{id="BufferedInput.impl.readSome"}

### Method `readSome`

```silk
pub effect fn readSome(
    self: &mut Self,
    output: &mut [u8],
    deadline: Option<Instant>,
  ) -> ReadTransfer
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Copies one positive prefix or reports sticky end.

::Anchor{id="BufferedInput.impl.readSomeStandard"}

### Method `readSomeStandard`

```silk
pub effect fn readSomeStandard(self: &mut Self, output: &mut [u8]) -> ReadTransfer
  ! BufferError
  ? &mut StandardInput
```

Copies one positive prefix through StandardInput or reports sticky end.

::Anchor{id="BufferedInput.impl.readExact"}

### Method `readExact`

```silk
pub effect fn readExact(
    self: &mut Self,
    output: &mut [u8],
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Fills the complete destination or reports its precisely copied prefix.

::Anchor{id="BufferedInput.impl.discardAtMost"}

### Method `discardAtMost`

```silk
pub effect fn discardAtMost(
    self: &mut Self,
    limit: usize,
    deadline: Option<Instant>,
  ) -> DiscardOutcome
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Discards no more than `limit` and reports whether end was actually observed.

::Anchor{id="BufferedInput.impl.discardExact"}

### Method `discardExact`

```silk
pub effect fn discardExact(
    self: &mut Self,
    count: usize,
    deadline: Option<Instant>,
  ) -> ()
  ! BufferError
  ? &mut ByteDuplex | &mut MonotonicClock
```

Discards exactly `count` bytes or reports the consumed prefix at early end.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
