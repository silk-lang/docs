Queues that move owned values between native threads, for building work-stealing schedulers.

## When to use
Use [`WorkDeque`](#WorkDeque) for one thread's own work that idle threads may steal, [`Injector`](#Injector) for a
queue every thread both pushes to and takes from, and [`Mailbox`](#Mailbox) for many threads sending to
one receiver.

## Details
[`WorkDeque.make`](#WorkDeque.impl.make) returns the [`Worker`](#Worker) that owns a Chase-Lev deque: it pushes and pops at the
bottom with no contention, and its [`Stealer`](#Stealer)s take from the top with one compare-exchange.
The ring grows by doubling; older rings stay allocated until the deque is dropped, because a
stealer may still be reading one. [`Injector`](#Injector) is a FIFO list under a [`Mutex`](/docs/std/sync#Mutex). [`Mailbox`](#Mailbox) is
Vyukov's multi-producer, single-consumer queue: a send is one swap and one store, with no lock.

Every pushed value moves into its own allocation, a parcel, and the queues move parcel
addresses atomically. A value is read only by the thread that won it, so no thread ever copies
a value it does not own.

## Gotchas
A pushing or sending operation allocates, so it takes an `Allocator`. [`Stealer.steal`](#Stealer.impl.steal) reports
[`Steal.Retry`](#Steal.Retry) when it loses a race; retrying is the caller's choice. [`MailboxReceiver.receive`](#MailboxReceiver.impl.receive)
may report nothing for a moment while a send is between its two steps.

## Examples
### Steal work on another thread
```silk,ignore
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.native_thread { NativeThread, SpawnError }
import silk.work_queue { Steal, Stealer, WorkDeque }

fn stealOne(stealer: Stealer<i32>) -> i32 {
  while true {
    match stealer.steal() {
      Steal<i32>.Success { value } => { return value }
      Steal<i32>.Empty => { return 0 }
      Steal<i32>.Retry => {}
    }
  }
  return 0
}

effect fn program() -> i32 ! OutOfMemoryError | SpawnError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut worker = run WorkDeque.make<i32>() |> Effect.provideMut<Allocator>(&mut allocator)
  run worker.push(42) |> Effect.provideMut<Allocator>(&mut allocator)
  let stealer = worker.stealer()
  let thief = run NativeThread.spawn(fn() -> i32 { return stealOne(move stealer) })
    |> Effect.provideMut<Allocator>(&mut allocator)
  return thief.join()
}
```

Import as `WorkDeque` with `import silk.work_queue { WorkDeque }`.

Public declarations: 8.

::Anchor{id="WorkDeque"}

## `WorkDeque`

```silk
pub struct WorkDeque
```

The constructor of work-stealing deques.

::Anchor{id="WorkDeque.impl"}

## Implementation `WorkDeque`

```silk
impl WorkDeque
```

::Anchor{id="WorkDeque.impl.make"}

### Associated function `make`

```silk
pub effect fn make<T>() -> Worker<T> ! OutOfMemoryError ? &mut Allocator
```

Makes an empty deque and returns the worker that owns it.

::Anchor{id="Worker"}

## `Worker`

```silk
pub struct Worker<T>
```

The owner of a work-stealing deque, which pushes and pops at its bottom.

### Details

A worker is `Transferable` when `T` is, so it may move to the thread that runs the work, but
pushing and popping take it exclusively. [`pop`](#Worker.impl.pop) returns the most recently pushed value.

::Anchor{id="Steal"}

## `Steal`

```silk
pub union Steal<T>
```

What one steal attempt found.

::Anchor{id="Steal.Empty"}

### `Empty`

```silk
Empty
```

The deque was empty.

::Anchor{id="Steal.Retry"}

### `Retry`

```silk
Retry
```

Another thread took the value this attempt saw; trying again may succeed.

::Anchor{id="Steal.Success"}

### `Success`

```silk
Success
```

The oldest value in the deque, now owned by the caller.

::Anchor{id="Steal.Success.value"}

#### Field `value`

```silk
pub value: T
```

The stolen value.

::Anchor{id="Worker.impl"}

## Implementation `Worker<T>`

```silk
impl<T> Worker<T>
```

::Anchor{id="Worker.impl.push"}

### Method `push`

```silk
pub effect<'env> fn push<'env>(self: &mut Self, value: T) -> () ! OutOfMemoryError ? &mut Allocator
```

Pushes `value` at the bottom, growing the ring when it is full.

::Anchor{id="Worker.impl.pop"}

### Method `pop`

```silk
pub fn pop(self: &mut Self) -> Option<T>
```

Pops the most recently pushed value, or reports none when the deque is empty.

::Anchor{id="Worker.impl.stealer"}

### Method `stealer`

```silk
pub fn stealer(self: &Self) -> Stealer<T>
```

Returns a stealer for this deque.

::Anchor{id="Stealer"}

## `Stealer`

```silk
pub struct Stealer<T>
```

A handle that takes the oldest values from a [`Worker`](#Worker)'s deque, from any thread.

### Details

A stealer is `Transferable` and `Concurrent` when `T` is `Transferable`.

::Anchor{id="Stealer.impl"}

## Implementation `Stealer<T>`

```silk
impl<T> Stealer<T>
```

::Anchor{id="Stealer.impl.steal"}

### Method `steal`

```silk
pub fn steal(self: &Self) -> Steal<T>
```

Takes the oldest value, or reports that the deque was empty or that the attempt lost a race.

::Anchor{id="Stealer.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> Stealer<T>
```

Adds another stealer for the same deque.

::Anchor{id="Injector"}

## `Injector`

```silk
pub struct Injector<T>
```

A shared FIFO queue that every thread may push to and take from.

### Details

Clones are handles to the same queue. An injector is `Transferable` and `Concurrent` when `T`
is `Transferable`. Each operation holds a lock only to link or unlink one parcel.

::Anchor{id="Injector.impl"}

## Implementation `Injector<T>`

```silk
impl<T> Injector<T>
```

::Anchor{id="Injector.impl.make"}

### Associated function `make`

```silk
pub effect<'env> fn make<'env>() -> Injector<T> ! OutOfMemoryError ? &mut Allocator
```

Makes an empty queue.

::Anchor{id="Injector.impl.push"}

### Method `push`

```silk
pub effect<'env> fn push<'env>(self: &Self, value: T) -> () ! OutOfMemoryError ? &mut Allocator
```

Appends `value` at the back.

::Anchor{id="Injector.impl.pop"}

### Method `pop`

```silk
pub fn pop(self: &Self) -> Option<T>
```

Takes the value at the front, or reports none when the queue is empty.

::Anchor{id="Injector.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> Injector<T>
```

Adds another handle to the same queue.

::Anchor{id="Mailbox"}

## `Mailbox`

```silk
pub struct Mailbox
```

The constructor of multi-producer, single-consumer mailboxes.

::Anchor{id="Mailbox.impl"}

## Implementation `Mailbox`

```silk
impl Mailbox
```

::Anchor{id="Mailbox.impl.make"}

### Associated function `make`

```silk
pub effect fn make<T>() -> MailboxReceiver<T> ! OutOfMemoryError ? &mut Allocator
```

Makes an empty mailbox and returns its receiver.

::Anchor{id="MailboxReceiver"}

## `MailboxReceiver`

```silk
pub struct MailboxReceiver<T>
```

The one receiving end of a [`Mailbox`](#Mailbox).

### Details

A receiver is `Transferable` when `T` is; receiving takes it exclusively.

::Anchor{id="MailboxReceiver.impl"}

## Implementation `MailboxReceiver<T>`

```silk
impl<T> MailboxReceiver<T>
```

::Anchor{id="MailboxReceiver.impl.receive"}

### Method `receive`

```silk
pub fn receive(self: &mut Self) -> Option<T>
```

Takes the oldest value sent, or reports none.

#### Gotchas

A send that has swapped itself in but not yet linked reports none until it links, so a
caller that knows a value is coming retries.

::Anchor{id="MailboxReceiver.impl.sender"}

### Method `sender`

```silk
pub fn sender(self: &Self) -> MailboxSender<T>
```

Returns a sender for this mailbox.

::Anchor{id="MailboxSender"}

## `MailboxSender`

```silk
pub struct MailboxSender<T>
```

A sending end of a [`Mailbox`](#Mailbox), which any thread may hold.

### Details

A sender is `Transferable` and `Concurrent` when `T` is `Transferable`.

::Anchor{id="MailboxSender.impl"}

## Implementation `MailboxSender<T>`

```silk
impl<T> MailboxSender<T>
```

::Anchor{id="MailboxSender.impl.send"}

### Method `send`

```silk
pub effect<'env> fn send<'env>(self: &Self, value: T) -> () ! OutOfMemoryError ? &mut Allocator
```

Sends `value` to the receiver.

::Anchor{id="MailboxSender.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> MailboxSender<T>
```

Adds another sender for the same mailbox.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
