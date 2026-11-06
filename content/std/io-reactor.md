Wait for many native descriptors at once: one blocking call reports which ones are readable or
writable, and another thread can wake the wait.

## When to use
Use a [`Reactor`](#Reactor) to build an event loop, such as the loop of a JavaScript runtime or a network
server, that serves many sockets, pipes, or terminals on one thread. Register each descriptor
with [`Reactor.register`](#Reactor.impl.register) and a token of your choice, then call [`Reactor.wait`](#Reactor.impl.wait) in a loop. Give
a [`Waker`](#Waker) to other threads, so that they can end a wait, for example after they finished work
for the loop.

## Details
The reactor uses `epoll` on Linux and `kqueue` on Darwin. Readiness is level-triggered: a
descriptor that stays readable is reported by each wait, until you read all its data or change
its [`Interest`](#Interest). The reactor never reads, writes, or closes your descriptors.

[`Reactor.make`](#Reactor.impl.make) opens the kernel queue and the wake source. A [`Waker`](#Waker) shares them with the
reactor, so they stay open until the reactor and every waker are dropped. Many wakes before one
wait end that wait one time.

## Errors
Each operation fails with [`ReactorError`](#ReactorError): the [`ReactorOperation`](#ReactorOperation) and the native error code.

## Gotchas
- Deregister a descriptor before you close it. On Linux, a closed descriptor that another
  descriptor still refers to, such as after `dup`, stays registered.
- On Darwin, readable and writable readiness come as two events with the same token.
- A token must not be [`WAKE_TOKEN`](#WAKE_TOKEN). The reactor uses it for the wake source.
- The module is empty on targets other than Darwin on x86_64 or aarch64, and Linux with GNU libc
  on x86_64 or aarch64.

## Examples
### Wake a wait from the same thread
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.io.reactor { ReadyEvent, Reactor, ReactorError }

effect fn program() -> i32 ! ReactorError | OutOfMemoryError ? &mut Allocator {
  let mut reactor = run Reactor.make()
  let waker = Reactor.waker(&reactor)
  run waker.wake()

  // The wake ends the wait at once, and it is not reported as an event.
  let mut events = [ReadyEvent.empty(), ReadyEvent.empty()]
  let count = run reactor.wait(&mut events, Option<u64>.some(1000000000))
  if count != 0 {
    return 1
  }

  // With no wake and no descriptor, a zero timeout returns at once.
  let none = run reactor.wait(&mut events, Option<u64>.some(0))
  if none != 0 {
    return 1
  }
  return 0
}

pub effect fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let result = run Effect.result(program()) |> Effect.provideMut<Allocator>(&mut allocator)
  return match move result {
    Result<i32, ReactorError | OutOfMemoryError>.Success { value } => value
    Result<i32, ReactorError | OutOfMemoryError>.Failure { .. } => 1
  }
}
```

Import as `Reactor` with `import silk.io.reactor { Reactor }`.

Public declarations: 7.

::Anchor{id="ReactorOperation"}

## `ReactorOperation`

```silk
pub enum ReactorOperation
```

The operation of a [`Reactor`](#Reactor) or [`Waker`](#Waker) that failed.

::Anchor{id="ReactorOperation.Create"}

### `Create`

```silk
Create
```

Opening the kernel queue or the wake source, in [`Reactor.make`](#Reactor.impl.make).

::Anchor{id="ReactorOperation.Register"}

### `Register`

```silk
Register
```

Adding a descriptor, in [`Reactor.register`](#Reactor.impl.register).

::Anchor{id="ReactorOperation.Modify"}

### `Modify`

```silk
Modify
```

Changing the interest of a descriptor, in [`Reactor.modify`](#Reactor.impl.modify).

::Anchor{id="ReactorOperation.Deregister"}

### `Deregister`

```silk
Deregister
```

Removing a descriptor, in [`Reactor.deregister`](#Reactor.impl.deregister).

::Anchor{id="ReactorOperation.Wait"}

### `Wait`

```silk
Wait
```

Waiting for events, in [`Reactor.wait`](#Reactor.impl.wait).

::Anchor{id="ReactorOperation.Wake"}

### `Wake`

```silk
Wake
```

Signaling the wake source, in [`Waker.wake`](#Waker.impl.wake).

::Anchor{id="ReactorError"}

## `ReactorError`

```silk
pub struct ReactorError
```

A failed reactor operation: which one, and the native error code.

### Details
`code` is the `errno` value of the failed system call, such as 9 (`EBADF`) for a descriptor that
is not open, or 17 (`EEXIST`) for a descriptor that is already registered on Linux.

::Anchor{id="ReactorError.operation"}

### Field `operation`

```silk
pub operation: ReactorOperation
```

The operation that failed.

::Anchor{id="ReactorError.code"}

### Field `code`

```silk
pub code: i32
```

The native error code.

::Anchor{id="Interest"}

## `Interest`

```silk
pub struct Interest
```

The readiness that a registered descriptor reports.

### Details
Make one with [`Interest.readOnly`](#Interest.impl.readOnly), [`Interest.writeOnly`](#Interest.impl.writeOnly), or [`Interest.both`](#Interest.impl.both). An interest
with neither flag keeps the descriptor registered but reports only errors and hangups on Linux,
and nothing on Darwin.

::Anchor{id="Interest.readable"}

### Field `readable`

```silk
pub readable: bool
```

Report the descriptor when a read would not block.

::Anchor{id="Interest.writable"}

### Field `writable`

```silk
pub writable: bool
```

Report the descriptor when a write would not block.

::Anchor{id="Interest.impl.Copy"}

## Implementation `Copy for Interest`

```silk
impl Copy for Interest
```

::Anchor{id="Interest.impl"}

## Implementation `Interest`

```silk
impl Interest
```

::Anchor{id="Interest.impl.readOnly"}

### Associated function `readOnly`

```silk
pub fn readOnly() -> Interest
```

Returns an interest in reads only.

::Anchor{id="Interest.impl.writeOnly"}

### Associated function `writeOnly`

```silk
pub fn writeOnly() -> Interest
```

Returns an interest in writes only.

::Anchor{id="Interest.impl.both"}

### Associated function `both`

```silk
pub fn both() -> Interest
```

Returns an interest in reads and writes.

::Anchor{id="ReadyEvent"}

## `ReadyEvent`

```silk
pub struct ReadyEvent
```

One descriptor that [`Reactor.wait`](#Reactor.impl.wait) found ready.

### Details
`token` is the value given to [`Reactor.register`](#Reactor.impl.register). More than one flag can be set. `hangup`
means that the peer closed its side, or the pipe has no writer; data that was sent before can
still be readable. `error` means that the descriptor has a pending error: read it with the
operation that you do next, such as a read or `getsockopt(SO_ERROR)`.

::Anchor{id="ReadyEvent.token"}

### Field `token`

```silk
pub token: u64
```

The token of the descriptor.

::Anchor{id="ReadyEvent.readable"}

### Field `readable`

```silk
pub readable: bool
```

A read would not block.

::Anchor{id="ReadyEvent.writable"}

### Field `writable`

```silk
pub writable: bool
```

A write would not block.

::Anchor{id="ReadyEvent.hangup"}

### Field `hangup`

```silk
pub hangup: bool
```

The peer closed its side.

::Anchor{id="ReadyEvent.error"}

### Field `error`

```silk
pub error: bool
```

The descriptor has a pending error.

::Anchor{id="ReadyEvent.impl.Copy"}

## Implementation `Copy for ReadyEvent`

```silk
impl Copy for ReadyEvent
```

::Anchor{id="ReadyEvent.impl"}

## Implementation `ReadyEvent`

```silk
impl ReadyEvent
```

::Anchor{id="ReadyEvent.impl.empty"}

### Associated function `empty`

```silk
pub fn empty() -> ReadyEvent
```

Returns an event with token 0 and no flags, to fill an event buffer before a wait.

::Anchor{id="Reactor"}

## `Reactor`

```silk
pub struct Reactor
```

A set of registered descriptors, and the wait for their readiness.

### Details
The reactor uses `epoll` on Linux and `kqueue` on Darwin. Readiness is level-triggered: a
descriptor that stays readable is reported by each wait. The reactor never reads, writes, or
closes your descriptors. Dropping the reactor closes the kernel queue when no [`Waker`](#Waker) is left.

### Gotchas
- Deregister a descriptor before you close it.
- On Darwin, readable and writable readiness come as two events with the same token.
- Use one reactor on one thread at a time. Other threads use a [`Waker`](#Waker).

::Anchor{id="Reactor.impl.Transferable"}

## Implementation `Transferable for Reactor`

```silk
impl Transferable for Reactor
```

::Anchor{id="Waker"}

## `Waker`

```silk
pub struct Waker
```

A handle that ends a [`Reactor.wait`](#Reactor.impl.wait) from any thread.

### Details
[`Waker.wake`](#Waker.impl.wake) makes the current or the next wait of its reactor return. Many wakes before one
wait end that wait one time. A waker keeps the kernel queue of its reactor open, also after the
reactor is dropped; a wake then has no effect.

::Anchor{id="Waker.impl.Transferable"}

## Implementation `Transferable for Waker`

```silk
impl Transferable for Waker
```

::Anchor{id="Waker.impl.Concurrent"}

## Implementation `Concurrent for Waker`

```silk
impl Concurrent for Waker
```

::Anchor{id="Waker.impl"}

## Implementation `Waker`

```silk
impl Waker
```

::Anchor{id="Waker.impl.wake"}

### Method `wake`

```silk
pub effect fn wake(self: &Self) -> () ! ReactorError
```

Makes the current or the next wait of the reactor return.

#### Errors
[`ReactorError`](#ReactorError) with operation `Wake` if the wake source cannot be signaled.

::Anchor{id="Waker.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> Waker
```

Returns another waker for the same reactor.

::Anchor{id="WAKE_TOKEN"}

## `WAKE_TOKEN`

```silk
pub const WAKE_TOKEN: u64
```

The token that a [`Reactor`](#Reactor) keeps for its wake source. Do not register a descriptor with it.

::Anchor{id="Reactor.impl"}

## Implementation `Reactor`

```silk
impl Reactor
```

::Anchor{id="Reactor.impl.make"}

### Associated function `make`

```silk
pub effect fn make() -> Reactor ! ReactorError | OutOfMemoryError ? &mut Allocator
```

Opens a new kernel queue and wake source, with no registered descriptors.

#### Details
The descriptors are close-on-exec, so a child process does not get them.

#### Errors
- [`ReactorError`](#ReactorError) with operation `Create` if the system cannot open the queue or the wake
  source, for example when the process has too many open descriptors.
- `OutOfMemoryError` if the shared state cannot be allocated.

::Anchor{id="Reactor.impl.waker"}

### Method `waker`

```silk
pub fn waker(self: &Self) -> Waker
```

Returns a [`Waker`](#Waker) that ends a wait of this reactor from any thread.

::Anchor{id="Reactor.impl.register"}

### Method `register`

```silk
pub effect fn register(self: &mut Self, fd: i32, token: u64, interest: Interest) -> () ! ReactorError
```

Adds the descriptor `fd` with `token`, and reports it when it matches `interest`.

#### Details
The reactor does not take ownership of `fd`. Each event of `fd` carries `token`.

#### Errors
[`ReactorError`](#ReactorError) with operation `Register`, for example with code 9 (`EBADF`) if `fd` is not
open, or 17 (`EEXIST`) on Linux if `fd` is already registered. A token equal to
[`WAKE_TOKEN`](#WAKE_TOKEN) fails with code 22 (`EINVAL`).

::Anchor{id="Reactor.impl.modify"}

### Method `modify`

```silk
pub effect fn modify(self: &mut Self, fd: i32, token: u64, interest: Interest) -> () ! ReactorError
```

Changes the token and the interest of the registered descriptor `fd`.

#### Errors
[`ReactorError`](#ReactorError) with operation `Modify`, for example with code 2 (`ENOENT`) on Linux if `fd`
is not registered. A token equal to [`WAKE_TOKEN`](#WAKE_TOKEN) fails with code 22 (`EINVAL`).

::Anchor{id="Reactor.impl.deregister"}

### Method `deregister`

```silk
pub effect fn deregister(self: &mut Self, fd: i32) -> () ! ReactorError
```

Removes the descriptor `fd`. Later waits do not report it.

#### Errors
[`ReactorError`](#ReactorError) with operation `Deregister`, for example with code 2 (`ENOENT`) if `fd` is
not registered.

::Anchor{id="Reactor.impl.wait"}

### Method `wait`

```silk
pub effect fn wait(self: &mut Self, events: &mut [ReadyEvent], timeout: Option<u64>) -> usize ! ReactorError
```

Waits until a registered descriptor is ready, a [`Waker`](#Waker) wakes the reactor, or the timeout
passes. Writes the ready descriptors to the start of `events`, and returns their number.

#### Details
`timeout` is in nanoseconds. `none` waits with no limit, and `some(0)` checks once and does
not block. On Linux, a timeout is rounded up to whole milliseconds. A wake ends the wait and
is not written to `events`, so a wait can return 0 before the timeout. A signal that interrupts
the wait also returns 0. At most `events.length` events are returned; the others stay for the
next wait.

#### Errors
[`ReactorError`](#ReactorError) with operation `Wait` if the system call fails for a reason other than a
signal.

Category: Input and output.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
