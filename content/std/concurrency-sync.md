Shared ownership, locks and thread parking for values that several native threads use.

## When to use
- [`Arc`](#Arc) gives several threads ownership of one value.
- [`Mutex`](#Mutex) lets them change the value one thread at a time.
- [`Parker`](#Parker) puts a thread to sleep until another thread wakes it.

## Details
[`Arc`](#Arc) counts its handles atomically. Thus threads can clone and drop handles at the same time.
The last handle to drop, on any thread, drops the value.

[`Mutex`](#Mutex) is a futex lock on [`Atomic.wait`](/docs/std/concurrency-atomic#Atomic.impl.wait) and [`Atomic.notifyOne`](/docs/std/concurrency-atomic#Atomic.impl.notifyOne). An uncontended lock or
unlock is one atomic operation. A contended lock sleeps in the operating system and does not
spin.

[`Parker`](#Parker) holds one wakeup token. Thus an unpark that comes before the park is not lost.

Each type keeps its shared state in its own allocation, and reaches it through raw pointers that
it computed when that allocation was new. Handles and guards only copy those pointers. Each
write to state that other threads can see is atomic or done under the lock.

## Gotchas
- These types need the same targets as [`Atomic.wait`](/docs/std/concurrency-atomic#Atomic.impl.wait): Darwin on aarch64, Linux with GNU libc
  on x86_64 or aarch64, and wasm32.
- An `Arc<T>` gives only shared borrows. Change the value through a `Mutex` or atomics. Unlike
  `Shared<T>`, `Arc<T>` does not detect reentrant access.
- A reference cycle of `Arc` handles leaks.

## Examples
### Count on two threads
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.thread_native { NativeThread, SpawnError }
import silk.concurrency.sync { Arc, Mutex }

fn addOne(total: Arc<Mutex<i32>>) -> i32 {
  let mut guard = total.get().lock()
  let value = guard.getMut()
  value.* = value.* + 1
  return 0
}

effect fn program() -> i32
  ! OutOfMemoryError | SpawnError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mutex = run Mutex<i32>.make(41) |> Effect.provideMut<Allocator>(&mut allocator)
  let total = run Arc<Mutex<i32>>.make(move mutex) |> Effect.provideMut<Allocator>(&mut allocator)

  // Each thread gets its own handle to the same mutex.
  let mine = total.clone()
  let worker = run NativeThread.spawn(
    fn() -> i32 {
      return addOne(move mine)
    }
  )
    |> Effect.provideMut<Allocator>(&mut allocator)
  if worker.join() != 0 {
    return 1
  }
  let guard = total.get().lock()
  if guard.get().* != 42 {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

### Wait for another thread
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.thread_native { NativeThread, SpawnError }
import silk.concurrency.sync { Parker, Unparker }

fn wake(unparker: Unparker) -> i32 {
  unparker.unpark()
  return 0
}

effect fn program() -> i32
  ! OutOfMemoryError | SpawnError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let parker = run Parker.make() |> Effect.provideMut<Allocator>(&mut allocator)
  let unparker = parker.unparker()
  let worker = run NativeThread.spawn(
    fn() -> i32 {
      return wake(move unparker)
    }
  )
    |> Effect.provideMut<Allocator>(&mut allocator)

  // Waits for the token. The worker can unpark before or after this call.
  parker.park()
  return worker.join()
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `Arc` with `import silk.concurrency.sync { Arc }`.

Public declarations: 5.

::Anchor{id="Arc"}

## `Arc`

```silk
pub struct Arc<T>
```

A thread-safe reference-counted handle to one shared value.

### When to use

Use it to give several native threads ownership of one value. Change the value through a
[`Mutex`](#Mutex) or atomics.

### Details

It counts its handles atomically, so threads can clone and drop handles at the same time. The
last handle to drop, on any thread, drops the value. /// [`get`](#Arc.impl.get) borrows the value for as long
as the handle is borrowed. `Arc<T>` is `Transferable` and `Concurrent` when `T` is both, since
every handle lets its thread read the value.

### Gotchas

- It gives only shared borrows. Unlike `Shared<T>`, it does not detect reentrant access.
- A reference cycle of `Arc` handles leaks.
- These types need the same targets as `Atomic.wait`: Darwin on aarch64, Linux with GNU libc on
x86_64 or aarch64, and wasm32.

::Anchor{id="Arc.impl.Transferable"}

## Implementation `Transferable for Arc<T>`

```silk
impl<T: Transferable + Concurrent> Transferable for Arc<T>
```

::Anchor{id="Arc.impl.Concurrent"}

## Implementation `Concurrent for Arc<T>`

```silk
impl<T: Transferable + Concurrent> Concurrent for Arc<T>
```

::Anchor{id="Arc.impl"}

## Implementation `Arc<T>`

```silk
impl<T> Arc<T>
```

::Anchor{id="Arc.impl.make"}

### Associated function `make`

```silk
pub effect<'env> fn make<'env>(value: T) -> Arc<T> ! OutOfMemoryError ? &mut Allocator
```

Moves `value` into a new allocation owned by one handle.

::Anchor{id="Arc.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> Arc<T>
```

Adds one handle to the same value.

#### Details

The count is a word, and a count past half its range traps before the handle exists.

::Anchor{id="Arc.impl.get"}

### Method `get`

```silk
pub fn get<'a>(self: &'a Self) -> &'a T
```

Borrows the shared value for as long as this handle is borrowed.

::Anchor{id="Arc.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of handles at the time of the read. Other threads can change it at once.

::Anchor{id="Arc.impl.Drop"}

## Implementation `Drop for Arc<T>`

```silk
impl<T> Drop for Arc<T>
```

::Anchor{id="Arc.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Arc<T>) -> ()
```

::Anchor{id="Mutex"}

## `Mutex`

```silk
pub struct Mutex<T>
```

A lock that gives one thread at a time exclusive access to a value.

### Details

[`lock`](#Mutex.impl.lock) returns a [`MutexGuard`](#MutexGuard), which borrows the value until it is dropped. `Mutex<T>` is
`Transferable` and `Concurrent` when `T` is `Transferable`: the lock passes the value between
threads one at a time. Share a mutex by putting it in an [`Arc`](#Arc). It is a futex lock: an
uncontended lock or unlock is one atomic operation, and a contended lock sleeps in the operating
system and does not spin.

### Gotchas

- Locking a mutex again on the thread that holds it deadlocks.
- These types need the same targets as `Atomic.wait`: Darwin on aarch64, Linux with GNU libc on
x86_64 or aarch64, and wasm32.

::Anchor{id="Mutex.impl.Transferable"}

## Implementation `Transferable for Mutex<T>`

```silk
impl<T: Transferable> Transferable for Mutex<T>
```

::Anchor{id="Mutex.impl.Concurrent"}

## Implementation `Concurrent for Mutex<T>`

```silk
impl<T: Transferable> Concurrent for Mutex<T>
```

::Anchor{id="Mutex.impl"}

## Implementation `Mutex<T>`

```silk
impl<T> Mutex<T>
```

::Anchor{id="Mutex.impl.make"}

### Associated function `make`

```silk
pub effect<'env> fn make<'env>(value: T) -> Mutex<T> ! OutOfMemoryError ? &mut Allocator
```

Moves `value` into a new, unlocked mutex.

::Anchor{id="Mutex.impl.lock"}

### Method `lock`

```silk
pub fn lock<'a>(self: &'a Self) -> MutexGuard<'a, T>
```

Waits until the lock is free, takes it, and returns the guard that releases it.

::Anchor{id="Mutex.impl.tryLock"}

### Method `tryLock`

```silk
pub fn tryLock<'a>(self: &'a Self) -> Option<MutexGuard<'a, T>>
```

Takes the lock when it is free, without waiting.

::Anchor{id="Mutex.impl.Drop"}

## Implementation `Drop for Mutex<T>`

```silk
impl<T> Drop for Mutex<T>
```

::Anchor{id="Mutex.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Mutex<T>) -> ()
```

::Anchor{id="MutexGuard"}

## `MutexGuard`

```silk
pub struct MutexGuard<'a, T>
```

Exclusive access to the value of a locked [`Mutex`](#Mutex). Dropping the guard unlocks the mutex.

::Anchor{id="MutexGuard.impl"}

## Implementation `MutexGuard<'a, T>`

```silk
impl<'a, T> MutexGuard<'a, T>
```

::Anchor{id="MutexGuard.impl.get"}

### Method `get`

```silk
pub fn get<'b>(self: &'b Self) -> &'b T
```

Borrows the locked value.

::Anchor{id="MutexGuard.impl.getMut"}

### Method `getMut`

```silk
pub fn getMut<'b>(self: &'b mut Self) -> &'b mut T
```

Borrows the locked value exclusively.

::Anchor{id="MutexGuard.impl.Drop"}

## Implementation `Drop for MutexGuard<'a, T>`

```silk
impl<'a, T> Drop for MutexGuard<'a, T>
```

::Anchor{id="MutexGuard.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut MutexGuard<'a, T>) -> ()
```

::Anchor{id="Parker"}

## `Parker`

```silk
pub struct Parker
```

A one-token sleep for the thread that owns it.

### Details
[`park`](#Parker.impl.park) returns at once if a token is waiting, and consumes it. If no token is waiting, it
sleeps until an [`Unparker`](#Unparker) supplies one. Tokens do not add up: several unparks before one park
wake it one time. A `Parker` stays with its thread. Its [`Unparker`](#Unparker)s go to the threads that
wake it.

### Gotchas
- `park` can also return with no token. Check your own condition again in a loop.
- These types need the same targets as `Atomic.wait`: Darwin on aarch64, Linux with GNU libc on
x86_64 or aarch64, and wasm32.

::Anchor{id="Unparker"}

## `Unparker`

```silk
pub struct Unparker
```

The waking side of a [`Parker`](#Parker). Any thread can hold one.

::Anchor{id="Unparker.impl.Transferable"}

## Implementation `Transferable for Unparker`

```silk
impl Transferable for Unparker
```

::Anchor{id="Unparker.impl.Concurrent"}

## Implementation `Concurrent for Unparker`

```silk
impl Concurrent for Unparker
```

::Anchor{id="Parker.impl.Transferable"}

## Implementation `Transferable for Parker`

```silk
impl Transferable for Parker
```

::Anchor{id="Parker.impl"}

## Implementation `Parker`

```silk
impl Parker
```

::Anchor{id="Parker.impl.make"}

### Associated function `make`

```silk
pub effect fn make() -> Parker ! OutOfMemoryError ? &mut Allocator
```

Makes a parker with no token.

::Anchor{id="Parker.impl.unparker"}

### Method `unparker`

```silk
pub fn unparker(self: &Self) -> Unparker
```

Returns an [`Unparker`](#Unparker) that wakes this parker.

::Anchor{id="Parker.impl.park"}

### Method `park`

```silk
pub fn park(self: &Self) -> ()
```

Consumes a waiting token, or sleeps until one arrives.

#### Gotchas
It can also return with no token. Check your own condition again in a loop.

::Anchor{id="Parker.impl.parkTimeout"}

### Method `parkTimeout`

```silk
pub fn parkTimeout(self: &Self, timeout: u64) -> bool
```

Consumes a waiting token, or sleeps until one arrives or `timeout` nanoseconds pass. Returns
whether it consumed a token.

#### Gotchas
It can also return `false` early, with no token. Check your own condition again in a loop.

::Anchor{id="Unparker.impl"}

## Implementation `Unparker`

```silk
impl Unparker
```

::Anchor{id="Unparker.impl.unpark"}

### Method `unpark`

```silk
pub fn unpark(self: &Self) -> ()
```

Supplies the token, and wakes the parker if it sleeps.

::Anchor{id="Unparker.impl.clone"}

### Method `clone`

```silk
pub fn clone(self: &Self) -> Unparker
```

Adds another unparker for the same parker.

Category: Concurrency.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
