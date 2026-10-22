Portable blocking reads of raw standard-input bytes through an explicit provider.

## When to use
Require [`StandardInput`](#StandardInput) for byte-oriented input that should be replaceable in tests. Decode
text separately so invalid input can be handled without losing its original bytes.

## Details
Each read writes only a prefix of the caller's mutable buffer and reports the exact committed
count, which may be smaller than the buffer length. For valid non-empty reads, [`EndOfInput`](#EndOfInput) is
ordinary outcome data and promises that no later read will produce bytes. [`StreamReadError`](#StreamReadError) is
reserved for a provider that could not complete a read.

This service is separate from `Writer`: output commits a complete message or fails,
while input is inherently partial and eventually ends.

## Gotchas
Empty buffers return Filled(0) without observing end-of-input. A provider must preserve this
behavior even after a non-empty read has observed permanent end-of-input.

## Examples
### Read one byte and then observe the end of input

```silk
import silk.effect { Effect }

import silk.standard_input { StandardInput, ReadOutcome, StreamReadError }

import silk.u8

import silk.usize

struct OneByte {
  complete: bool
}

effect fn read(self: &mut OneByte, buffer: &mut [u8]) -> ReadOutcome
! StreamReadError {
  if buffer.length == 0 { return StandardInput.filled(usize.ZERO) }
  if self.complete {
    return StandardInput.endOfInput()
  }
  buffer[usize.ZERO] = u8.toU8(42)
  self.complete = true
  return StandardInput.filled(usize.ONE)
}

impl StandardInput for OneByte {
  read: OneByte.read
}

effect fn program() -> i32
! StreamReadError {
  let mut provider = OneByte {complete: false}
  let mut buffer = [u8.toU8(0)]
  let first = run StandardInput.receive(&mut buffer)
    |> Effect.provideMut<StandardInput>(&mut provider)
  if StandardInput.count(&first) != usize.ONE {
    return 1
  }
  let second = run StandardInput.receive(&mut buffer)
    |> Effect.provideMut<StandardInput>(&mut provider)
  if StandardInput.isEndOfInput(&second) == false {
    return 2
  }
  return u8.toI32(buffer[usize.ZERO])
}

effect fn recover(error: StreamReadError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), recover)
}
```

Import as `StandardInput` with `import silk.standard_input { StandardInput }`.

Public declarations: 5.

::Anchor{id="StreamReadError"}

## `StreamReadError`

```silk
pub struct StreamReadError
```

A typed failure from a standard-input provider that could not complete one read.

::Anchor{id="Filled"}

## `Filled`

```silk
pub struct Filled
```

A read that committed a known prefix of the caller's buffer.

::Anchor{id="Filled.count"}

### Field `count`

```silk
pub count: usize
```

The exact number of leading bytes written, which can be less than the buffer length.

::Anchor{id="EndOfInput"}

## `EndOfInput`

```silk
pub struct EndOfInput
```

A valid non-empty read that observed permanent end-of-input without changing the buffer.

::Anchor{id="ReadOutcome"}

## `ReadOutcome`

```silk
pub struct ReadOutcome
```

One completed read, represented as committed bytes or permanent end-of-input.

### Details

End-of-input is outcome data instead of failure. [`Filled`](#Filled) identifies the exact initialized
prefix; bytes after that prefix retain their previous values.

::Anchor{id="ReadOutcome.value"}

### Field `value`

```silk
pub value: Filled | EndOfInput
```

The committed-byte count or permanent end-of-input result.

::Anchor{id="StandardInput"}

## `StandardInput`

```silk
pub service StandardInput
```

A portable blocking service for partial reads of raw standard-input bytes.

### When to use

Use this service for replaceable byte input. Decode text in a separate operation after each read
when text validation is required.

### Details

`read` changes only the reported leading prefix of the buffer. The committed count can be less
than the buffer length. A host error produces [`StreamReadError`](#StreamReadError); end-of-input does not.

After [`EndOfInput`](#EndOfInput) from a valid non-empty read, later reads do not produce bytes.

::Anchor{id="StandardInput.read"}

### Operation `read`

```silk
effect fn read(
    buffer: &mut [u8]
  ) -> ReadOutcome ! StreamReadError ? &mut StandardInput
```

Reads at most the buffer length and reports the exact committed prefix or end-of-input.

#### Details

Bytes after a [`Filled`](#Filled) count keep their previous values. For a valid non-empty buffer,
[`EndOfInput`](#EndOfInput) means no later call produces bytes. Provider failure produces `StreamReadError`.

#### Gotchas

An empty `buffer` returns Filled(0) without reading, including after end-of-input.

::Anchor{id="StandardInput.impl"}

## Implementation `StandardInput`

```silk
impl StandardInput
```

::Anchor{id="StandardInput.impl.readFailure"}

### Associated function `readFailure`

```silk
pub fn readFailure() -> StreamReadError
```

Creates a standard-input failure for a provider that cannot complete one read.

::Anchor{id="StandardInput.impl.filled"}

### Associated function `filled`

```silk
pub fn filled(count: usize) -> ReadOutcome
```

Creates an outcome for a read that committed exactly `count` leading bytes.

#### Gotchas

A provider must not use a count greater than the buffer length passed to its read operation.

::Anchor{id="StandardInput.impl.endOfInput"}

### Associated function `endOfInput`

```silk
pub fn endOfInput() -> ReadOutcome
```

Creates an outcome that reports permanent end-of-input after a valid non-empty read.

::Anchor{id="StandardInput.impl.count"}

### Associated function `count`

```silk
pub fn count(outcome: &ReadOutcome) -> usize
```

Returns the committed byte count, or zero for end-of-input.

#### Gotchas

A zero count does not by itself identify end-of-input. Use [`isEndOfInput`](#StandardInput.impl.isEndOfInput) when that
distinction controls another read.

::Anchor{id="StandardInput.impl.isEndOfInput"}

### Associated function `isEndOfInput`

```silk
pub fn isEndOfInput(outcome: &ReadOutcome) -> bool
```

Reports whether the outcome guarantees that no later read produces bytes.

::Anchor{id="StandardInput.impl.receive"}

### Associated function `receive`

```silk
pub effect fn receive(
    buffer: &mut [u8]
  ) -> ReadOutcome ! StreamReadError ? &mut StandardInput
```

Reads through the active [`StandardInput`](#StandardInput) provider into a mutable buffer.

#### Details

This wrapper preserves partial-read behavior and the exclusive provider requirement. Inspect
[`count`](#StandardInput.impl.count) before reading buffer bytes. Use [`isEndOfInput`](#StandardInput.impl.isEndOfInput) to decide when draining is complete.

#### Gotchas

`buffer` must be non-empty. A native provider can otherwise report end-of-input while bytes are
still available.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
