Bounded byte transfer coupled to retained input and exact-prefix buffered output.

Import as `BufferedTransfer` with `import silk.buffered_transfer { BufferedTransfer }`.

Public declarations: 2.

::Anchor{id="TransferOutcome"}

## `TransferOutcome`

```silk
pub struct TransferOutcome
```

One finite transfer result.

::Anchor{id="TransferOutcome.count"}

### Field `count`

```silk
pub count: usize
```

The exact destination-accepted and source-consumed count.

::Anchor{id="TransferOutcome.endObserved"}

### Field `endObserved`

```silk
pub endObserved: bool
```

True only when the operation actually observed source end.

::Anchor{id="BufferedTransfer"}

## `BufferedTransfer`

```silk
pub struct BufferedTransfer
```

The owner of bounded exact-prefix transfer operations.

::Anchor{id="BufferedTransfer.impl"}

## Implementation `BufferedTransfer`

```silk
impl BufferedTransfer
```

::Anchor{id="BufferedTransfer.impl.transferAtMost"}

### Associated function `transferAtMost`

```silk
pub effect fn transferAtMost<'source, 'destination, SP, DP>(
  source: &mut BufferedDuplex<'source, SP>,
  destination: &mut BufferedDuplex<'destination, DP>,
  limit: usize,
  deadline: Option<Instant>,
) -> TransferOutcome
! BufferError
? &mut MonotonicClock
where &mut SP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  &mut DP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Transfers no more than `limit`, consuming only destination-accepted bytes.

::Anchor{id="BufferedTransfer.impl.transferExact"}

### Associated function `transferExact`

```silk
pub effect fn transferExact<'source, 'destination, SP, DP>(
  source: &mut BufferedDuplex<'source, SP>,
  destination: &mut BufferedDuplex<'destination, DP>,
  count: usize,
  deadline: Option<Instant>,
) -> ()
! BufferError
? &mut MonotonicClock
where &mut SP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  &mut DP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

Transfers exactly `count` bytes or reports early end with the transferred prefix.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
