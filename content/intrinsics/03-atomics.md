# Atomics

These members read and write one memory location indivisibly, and order memory accesses between threads. Locks, reference counts, channels and wait queues in the standard library are built from them. Most code uses [`Atomic`](/docs/std/concurrency-atomic#Atomic) in `silk/concurrency/atomic`, which takes a `MemoryOrder` enum instead of text.

## Rules shared by every atomic member

- Atomics follow the C++20 memory model, without `consume`. A **data race**, two accesses to overlapping bytes from different threads where at least one writes, at least one is not atomic and neither happens before the other, is undefined behavior. So is an atomic access that overlaps another atomic access of a different width.
- Every member except `atomicFence` is unsafe. The caller proves that the pointer is non-null, points to live storage for one `T` at `T`'s natural alignment, and that the location is initialized for every operation that reads it.
- `T` is `u8`, `u16`, `u32`, `u64`, `usize`, `i8`, `i16`, `i32`, `i64`, `isize`, or a data pointer type. The fetch operations take the integers only. `bool`, floats, aggregates and 128-bit elements are refused with SEM0237; store a flag as `u8`.
- The ordering is a static text argument, a literal or a value known during specialization. A runtime value is SEM0176, and text that names no ordering, or one the operation does not admit, is SEM0237 at that argument.

| Ordering | Meaning |
| --- | --- |
| `"relaxed"` | Atomicity only; no ordering with other locations |
| `"acquire"` | Later accesses in this thread cannot move before this read |
| `"release"` | Earlier accesses in this thread cannot move after this write |
| `"acquireRelease"` | Both, for a read-modify-write or a fence |
| `"sequentiallyConsistent"` | Acquire and release, in one total order over all such operations |

An acquire read that reads the value a release write stored synchronizes with it: everything the writer did before the release happens before everything the reader does after the acquire.

- A WebAssembly build without the `atomics` feature has one thread, so every atomic access lowers to a plain one and every fence to nothing. The same source builds for both.

### `Intrinsic.atomicLoad`

```silk signature
unsafe fn atomicLoad<T>(pointer: *const T, static order: string<'static>) -> T
```

Reads the pointee atomically and returns it.

- Unsafe, under the rules above.
- Orderings: `"relaxed"`, `"acquire"` or `"sequentiallyConsistent"`. A release ordering is SEM0237.
- Wrapper: [`Atomic.load`](/docs/std/concurrency-atomic#Atomic.impl.load).

```silk
pub fn main() -> i32 {
  let word: u64 = 42
  let pointer = Intrinsic.pointerFromRef<u64>(&word)
  if unsafe Intrinsic.atomicLoad<u64>(pointer, "acquire") != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicStore`

```silk signature
unsafe fn atomicStore<T>(pointer: *mut T, value: T, static order: string<'static>) -> ()
```

Writes `value` to the pointee atomically. The old value is overwritten without being read.

- Unsafe, under the rules above.
- Orderings: `"relaxed"`, `"release"` or `"sequentiallyConsistent"`. An acquire ordering is SEM0237.
- Wrapper: [`Atomic.store`](/docs/std/concurrency-atomic#Atomic.impl.store).

```silk
pub fn main() -> i32 {
  let mut flag: u8 = 0
  let pointer = Intrinsic.pointerFromMutRef<u8>(&mut flag)
  unsafe Intrinsic.atomicStore<u8>(pointer, 1, "release")
  if flag != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicSwap`

```silk signature
unsafe fn atomicSwap<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Writes `value` to the pointee and returns the value it replaced, as one indivisible step.

- Unsafe, under the rules above. Every ordering is admitted.
- Wrapper: [`Atomic.swap`](/docs/std/concurrency-atomic#Atomic.impl.swap).

```silk
pub fn main() -> i32 {
  let mut state: u32 = 7
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut state)
  let previous = unsafe Intrinsic.atomicSwap<u32>(pointer, 9, "acquireRelease")
  if previous != 7 || state != 9 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicCompareExchange`

```silk signature
unsafe fn atomicCompareExchange<T>(
  pointer: *mut T,
  expected: *mut T,
  desired: T,
  static success: string<'static>,
  static failure: string<'static>,
) -> bool
```

Compares the pointee with `*expected`. When they are equal, it stores `desired` with the `success` ordering and returns `true`. Otherwise it returns `false`, and the read uses the `failure` ordering. Either way it writes the value the pointee held to `*expected`.

- Unsafe, under the rules above. The caller also proves that `expected` points to writable storage for one `T` that no other thread touches during the call.
- `success` admits every ordering. `failure` admits `"relaxed"`, `"acquire"` or `"sequentiallyConsistent"`, and may be stronger than `success`.
- Wrapper: [`Atomic.compareExchange`](/docs/std/concurrency-atomic#Atomic.impl.compareExchange), which takes `expected` by value and returns a `CompareExchange` result.

```silk
pub fn main() -> i32 {
  let mut lock: u32 = 0
  let mut expected: u32 = 0
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut lock)
  let observed = Intrinsic.pointerFromMutRef<u32>(&mut expected)
  // The first exchange finds 0 and stores 1.
  if !unsafe Intrinsic.atomicCompareExchange<u32>(pointer, observed, 1, "acquire", "relaxed") {
    return 1
  }
  // The second finds 1, fails, and writes 1 to expected.
  unsafe Intrinsic.pointerWrite<u32>(observed, 0)
  if unsafe Intrinsic.atomicCompareExchange<u32>(pointer, observed, 1, "acquire", "relaxed") {
    return 2
  }
  if unsafe Intrinsic.pointerRead<u32>(observed) != 1 {
    return 3
  }
  return 0
}
```

### `Intrinsic.atomicCompareExchangeWeak`

```silk signature
unsafe fn atomicCompareExchangeWeak<T>(
  pointer: *mut T,
  expected: *mut T,
  desired: T,
  static success: string<'static>,
  static failure: string<'static>,
) -> bool
```

The same as `atomicCompareExchange`, except that it may return `false` even when the pointee equals `*expected`. On targets with load-linked and store-conditional instructions, such as AArch64, it compiles to a shorter sequence, so it suits a retry loop.

- Unsafe, under the same rules as `atomicCompareExchange`.
- Wrapper: [`Atomic.compareExchangeWeak`](/docs/std/concurrency-atomic#Atomic.impl.compareExchangeWeak).

```silk
pub fn main() -> i32 {
  let mut counter: u64 = 41
  let pointer = Intrinsic.pointerFromMutRef<u64>(&mut counter)
  let mut current = unsafe Intrinsic.atomicLoad<u64>(Intrinsic.pointerFromMutRef<u64>(&mut counter), "relaxed")
  let observed = Intrinsic.pointerFromMutRef<u64>(&mut current)
  // Retry until the increment lands; a spurious failure only repeats the loop.
  while !unsafe Intrinsic.atomicCompareExchangeWeak<u64>(pointer, observed, unsafe Intrinsic.pointerRead<u64>(observed) + 1, "release", "relaxed") {}
  if counter != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchAdd`

```silk signature
unsafe fn atomicFetchAdd<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Adds `value` to the pointee, wrapping on overflow, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchAdd`](/docs/std/concurrency-atomic#Atomic.impl.fetchAdd).

```silk
pub fn main() -> i32 {
  let mut word: u32 = 40
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchAdd<u32>(pointer, 2, "acquireRelease")
  if previous != 40 || word != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchSubtract`

```silk signature
unsafe fn atomicFetchSubtract<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Subtracts `value` from the pointee, wrapping on overflow, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchSubtract`](/docs/std/concurrency-atomic#Atomic.impl.fetchSubtract).

```silk
pub fn main() -> i32 {
  let mut word: u32 = 44
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchSubtract<u32>(pointer, 2, "acquireRelease")
  if previous != 44 || word != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchBitAnd`

```silk signature
unsafe fn atomicFetchBitAnd<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Stores the bitwise AND of the pointee and `value`, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchBitAnd`](/docs/std/concurrency-atomic#Atomic.impl.fetchBitAnd).

```silk
pub fn main() -> i32 {
  let mut word: u32 = 0b1110
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchBitAnd<u32>(pointer, 0b0111, "acquireRelease")
  if previous != 0b1110 || word != 0b0110 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchBitOr`

```silk signature
unsafe fn atomicFetchBitOr<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Stores the bitwise OR of the pointee and `value`, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchBitOr`](/docs/std/concurrency-atomic#Atomic.impl.fetchBitOr).

```silk
pub fn main() -> i32 {
  let mut word: u32 = 0b1000
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchBitOr<u32>(pointer, 0b0011, "acquireRelease")
  if previous != 0b1000 || word != 0b1011 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchBitXor`

```silk signature
unsafe fn atomicFetchBitXor<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Stores the bitwise XOR of the pointee and `value`, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchBitXor`](/docs/std/concurrency-atomic#Atomic.impl.fetchBitXor).

```silk
pub fn main() -> i32 {
  let mut word: u32 = 0b1100
  let pointer = Intrinsic.pointerFromMutRef<u32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchBitXor<u32>(pointer, 0b1010, "acquireRelease")
  if previous != 0b1100 || word != 0b0110 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchMinimum`

```silk signature
unsafe fn atomicFetchMinimum<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Stores the smaller of the pointee and `value`, compared under `T`'s signedness, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchMinimum`](/docs/std/concurrency-atomic#Atomic.impl.fetchMinimum).

```silk
pub fn main() -> i32 {
  let mut word: i32 = -5
  let pointer = Intrinsic.pointerFromMutRef<i32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchMinimum<i32>(pointer, 3, "acquireRelease")
  if previous != -5 || word != -5 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFetchMaximum`

```silk signature
unsafe fn atomicFetchMaximum<T>(pointer: *mut T, value: T, static order: string<'static>) -> T
```

Stores the larger of the pointee and `value`, compared under `T`'s signedness, and returns the previous value. The read and the write are one indivisible step.

- Unsafe, under the rules above. `T` is an integer type; a pointer element is SEM0237.
- Every ordering is admitted.
- Wrapper: [`Atomic.fetchMaximum`](/docs/std/concurrency-atomic#Atomic.impl.fetchMaximum).

```silk
pub fn main() -> i32 {
  let mut word: i32 = -5
  let pointer = Intrinsic.pointerFromMutRef<i32>(&mut word)
  let previous = unsafe Intrinsic.atomicFetchMaximum<i32>(pointer, 3, "acquireRelease")
  if previous != -5 || word != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.atomicFence`

```silk signature
fn atomicFence(static order: string<'static>) -> ()
```

Orders the calling thread's memory accesses around this point without accessing memory. A release fence followed by an atomic store, paired with an atomic load followed by an acquire fence in another thread, synchronizes when the load reads the stored value, as a release store and an acquire load would. A sequentially consistent fence joins the single total order.

- Safe: it reads and writes nothing.
- Orderings: `"acquire"`, `"release"`, `"acquireRelease"` or `"sequentiallyConsistent"`. `"relaxed"` is SEM0237.
- A fence orders only the calling thread's accesses. It is not a compiler-only barrier for signal handlers.
- Wrapper: [`Atomic.fence`](/docs/std/concurrency-atomic#Atomic.impl.fence).

```silk
pub fn main() -> i32 {
  let mut data: u32 = 0
  let mut ready: u8 = 0
  data = 42
  Intrinsic.atomicFence("release")
  unsafe Intrinsic.atomicStore<u8>(Intrinsic.pointerFromMutRef<u8>(&mut ready), 1, "relaxed")
  if unsafe Intrinsic.atomicLoad<u8>(Intrinsic.pointerFromRef<u8>(&ready), "relaxed") == 1 {
    Intrinsic.atomicFence("acquire")
    if data != 42 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.wasmAtomicWait32`

```silk signature
unsafe fn wasmAtomicWait32(address: [*]const u8, expected: u32, timeout: i64) -> u32
```

Blocks the calling thread while the 32-bit word at `address` equals `expected` (`memory.atomic.wait32`), for at most `timeout` nanoseconds, or forever when `timeout` is negative. It returns 0 when another thread woke it, 1 when the word did not equal `expected` at the call, and 2 when the timeout passed.

- Unsafe. The caller proves that `address` points to a live, 4-byte aligned word in shared linear memory.
- Only a wasm32 build with the `atomics` feature lowers it. A browser's main thread may refuse to block, which traps.
- Wrapper: [`Atomic.wait`](/docs/std/concurrency-atomic#Atomic.impl.wait), which also covers native targets.

```silk check target=wasm32-unknown-unknown
pub fn main() -> i32 {
  let word: u32 = 1
  let address = unsafe Intrinsic.pointerReinterpret<*const u32, *const u8>(Intrinsic.pointerFromRef<u32>(&word))
  let bytes = unsafe Intrinsic.pointerRequalify<*const u8, [*]const u8>(address)
  // The word is 1, not 0, so the wait returns 1 at once.
  if unsafe Intrinsic.wasmAtomicWait32(bytes, 0, 0) != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.wasmAtomicNotify`

```silk signature
unsafe fn wasmAtomicNotify(address: [*]const u8, count: u32) -> u32
```

Wakes at most `count` threads waiting on the 32-bit word at `address` (`memory.atomic.notify`) and returns how many it woke.

- Unsafe. The caller proves that `address` points to a live, 4-byte aligned word.
- Only a wasm32 build with the `atomics` feature lowers it.
- Wrappers: [`Atomic.notifyOne`](/docs/std/concurrency-atomic#Atomic.impl.notifyOne) and [`Atomic.notifyAll`](/docs/std/concurrency-atomic#Atomic.impl.notifyAll).

```silk check target=wasm32-unknown-unknown
pub fn main() -> i32 {
  let word: u32 = 0
  let address = unsafe Intrinsic.pointerReinterpret<*const u32, *const u8>(Intrinsic.pointerFromRef<u32>(&word))
  let bytes = unsafe Intrinsic.pointerRequalify<*const u8, [*]const u8>(address)
  // No thread waits on the word, so nothing wakes.
  if unsafe Intrinsic.wasmAtomicNotify(bytes, 1) != 0 {
    return 1
  }
  return 0
}
```
