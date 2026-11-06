Bounded channels that pass values between fibers on one thread.

## When to use
Use [`Channel.make`](#Channel.impl.make) when one fiber must wake another one with data, for example to pass each
new message of one connection to the fibers that serve the other connections. [`Sender.send`](#Sender.impl.send)
waits while the channel is full, and [`Receiver.receive`](#Receiver.impl.receive) waits while it is empty.

## Details
A channel holds at most `capacity` values, in order. It allocates its storage one time, in
[`Channel.make`](#Channel.impl.make). Later operations do not allocate, except to remember a waiting fiber.

[`Sender`](#Sender) and [`Receiver`](#Receiver) handles can be cloned, so several fibers can send and receive. Each
value goes to one receiver. The channel closes when [`Sender.close`](#Sender.impl.close) or [`Receiver.close`](#Receiver.impl.close) is
called, when every `Sender` is dropped, or when every `Receiver` is dropped. After the close,
sends fail and give the value back, and receives return the values that are left, then `None`.

A waiting fiber parks its `Execution`, so the channel works under any scheduler that drives
fibers, such as `silk.concurrency.local_scheduler`.

## Errors
`OutOfMemoryError` if [`Channel.make`](#Channel.impl.make) cannot allocate, or if a fiber cannot be added to the
list of waiting fibers.

## Gotchas
- Handles stay on the thread that made them. For threads, use `silk.concurrency.sync`.
- A fiber that waits is woken each time the channel changes, and checks again. This is cheap for
  a few waiting fibers, not for thousands of them on one channel.

## Examples
### Pass values from one fiber to another
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.concurrency.channel { Channel, Sender }
import silk.concurrency.fiber { Cancelled, Fiber }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }

effect fn produce(sender: Sender<i32>) -> i32 {
  let mut value = 1
  while value <= 3 {
    // Waits while the channel is full.
    match run sender.send(value) {
      Result.Success {..} => {}
      Result.Failure {..} => { return 1 }
    }
    value = value + 1
  }
  // Dropping the last Sender closes the channel.
  drop sender
  return 0
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  // Room for one value, so the producer waits until each value is received.
  let channel = run Channel<i32>.make(1)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let Channel<i32> {sender, receiver} = move channel
  let producer = run Fiber<i32, never>.forkChild(produce(move sender))
  let mut total = 0
  while true {
    match run receiver.receive() {
      Option.Some {value} => { total = total + value }
      Option.None => { break }
    }
  }
  let produced = run producer.join()
  if produced != 0 || total != 6 { return 1 }
  return 0
}

effect fn program() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut clock = OsMonotonicClock.make()
  let mut scheduler = LocalScheduler.make()
  return run scheduler.execute<i32, OutOfMemoryError | TaskIdExhaustedError | Cancelled>(root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `Channel` with `import silk.concurrency.channel { Channel }`.

Public declarations: 5.

::Anchor{id="Channel"}

## `Channel`

```silk
pub struct Channel<T>
```

The two ends of a new channel, from [`Channel.make`](#Channel.impl.make).

::Anchor{id="Channel.sender"}

### Field `sender`

```silk
pub sender: Sender<T>
```

The end that sends values.

::Anchor{id="Channel.receiver"}

### Field `receiver`

```silk
pub receiver: Receiver<T>
```

The end that receives values.

::Anchor{id="Sender"}

## `Sender`

```silk
pub struct Sender<T>
```

The sending end of a channel. Clone it to send from several fibers.

### Gotchas
One handle waits for one fiber at a time. Give each fiber its own clone: a second fiber that
waits on the same handle checks again at each turn of the scheduler instead of parking.

::Anchor{id="Receiver"}

## `Receiver`

```silk
pub struct Receiver<T>
```

The receiving end of a channel. Clone it to receive in several fibers. Each value goes to one
receiver.

### Gotchas
One handle waits for one fiber at a time. Give each fiber its own clone: a second fiber that
waits on the same handle checks again at each turn of the scheduler instead of parking.

::Anchor{id="TrySend"}

## `TrySend`

```silk
pub union TrySend<T>
```

The result of [`Sender.trySend`](#Sender.impl.trySend).

::Anchor{id="TrySend.Sent"}

### `Sent`

```silk
Sent
```

The value is in the channel.

::Anchor{id="TrySend.Full"}

### `Full`

```silk
Full
```

The channel is full. The value is given back.

::Anchor{id="TrySend.Full.value"}

#### Field `value`

```silk
pub value: T
```

The value that was not sent.

::Anchor{id="TrySend.Closed"}

### `Closed`

```silk
Closed
```

The channel is closed. The value is given back.

::Anchor{id="TrySend.Closed.value"}

#### Field `value`

```silk
pub value: T
```

The value that was not sent.

::Anchor{id="TryReceive"}

## `TryReceive`

```silk
pub union TryReceive<T>
```

The result of [`Receiver.tryReceive`](#Receiver.impl.tryReceive).

::Anchor{id="TryReceive.Received"}

### `Received`

```silk
Received
```

The oldest value of the channel.

::Anchor{id="TryReceive.Received.value"}

#### Field `value`

```silk
pub value: T
```

The value.

::Anchor{id="TryReceive.Empty"}

### `Empty`

```silk
Empty
```

The channel is empty and open.

::Anchor{id="TryReceive.Closed"}

### `Closed`

```silk
Closed
```

The channel is empty and closed. No value will come.

::Anchor{id="Channel.impl"}

## Implementation `Channel<T>`

```silk
impl<T> Channel<T>
```

::Anchor{id="Channel.impl.make"}

### Associated function `make`

```silk
pub effect<'env> fn make<'env>(capacity: usize) -> Channel<T> ! OutOfMemoryError ? &mut Allocator
```

Returns a new open channel that holds at most `capacity` values.

#### Details
A `capacity` of zero is taken as one.

#### Errors
`OutOfMemoryError` if the storage cannot be allocated.

::Anchor{id="Sender.impl"}

## Implementation `Sender<T>`

```silk
impl<T> Sender<T>
```

::Anchor{id="Sender.impl.clone"}

### Method `clone`

```silk
pub effect fn clone(self: &Self) -> Sender<T> ! OutOfMemoryError ? &mut Allocator
```

Returns another sender for the same channel.

#### Errors
`OutOfMemoryError` if the waiting place of the new handle cannot be allocated.

::Anchor{id="Sender.impl.send"}

### Method `send`

```silk
pub effect fn send(self: &Self, item: T) -> Result<(), T>
```

Puts `value` in the channel, and waits while the channel is full.

#### Details
It returns `Failure` with the value if the channel is closed, also while it waits.

::Anchor{id="Sender.impl.trySend"}

### Method `trySend`

```silk
pub fn trySend(self: &Self, value: T) -> TrySend<T>
```

Puts `value` in the channel if there is room. It does not wait.

::Anchor{id="Sender.impl.close"}

### Method `close`

```silk
pub fn close(self: &Self) -> ()
```

Closes the channel for all handles. Values that are already in it can still be received.

::Anchor{id="Sender.impl.isClosed"}

### Method `isClosed`

```silk
pub fn isClosed(self: &Self) -> bool
```

Returns whether the channel is closed.

::Anchor{id="Receiver.impl"}

## Implementation `Receiver<T>`

```silk
impl<T> Receiver<T>
```

::Anchor{id="Receiver.impl.clone"}

### Method `clone`

```silk
pub effect fn clone(self: &Self) -> Receiver<T> ! OutOfMemoryError ? &mut Allocator
```

Returns another receiver for the same channel.

#### Errors
`OutOfMemoryError` if the waiting place of the new handle cannot be allocated.

::Anchor{id="Receiver.impl.receive"}

### Method `receive`

```silk
pub effect fn receive(self: &Self) -> Option<T>
```

Returns the oldest value, and waits while the channel is empty and open. Returns `None` when
the channel is empty and closed.

::Anchor{id="Receiver.impl.tryReceive"}

### Method `tryReceive`

```silk
pub fn tryReceive(self: &Self) -> TryReceive<T>
```

Returns the oldest value if there is one. It does not wait.

::Anchor{id="Receiver.impl.close"}

### Method `close`

```silk
pub fn close(self: &Self) -> ()
```

Closes the channel for all handles. Values that are already in it can still be received.

::Anchor{id="Receiver.impl.length"}

### Method `length`

```silk
pub fn length(self: &Self) -> usize
```

Returns how many values the channel holds now.

::Anchor{id="Sender.impl.Drop"}

## Implementation `Drop for Sender<T>`

```silk
impl<T> Drop for Sender<T>
```

::Anchor{id="Sender.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Sender<T>) -> ()
```

::Anchor{id="Receiver.impl.Drop"}

## Implementation `Drop for Receiver<T>`

```silk
impl<T> Drop for Receiver<T>
```

::Anchor{id="Receiver.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Receiver<T>) -> ()
```

Category: Concurrency.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
