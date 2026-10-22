One owned heap indirection for recursive data and values whose storage must have a stable size.

## When to use
Use [`Box`](#Box) to break an inline layout cycle, such as a tree node that owns more tree nodes. Use
[`make`](#Box.impl.make) to allocate, [`get`](#Box.impl.get) or [`getMut`](#Box.impl.getMut) to borrow the element, and [`into`](#Box.impl.into) to recover it.

## Details
A box owns exactly one allocation and one value. Borrowing exposes a one-element slice because
Silk can return a slice tied to a parameter but cannot return a bare borrowed value. Dropping
the box recursively drops its element; consuming it with [`into`](#Box.impl.into) transfers the element and
still releases the allocation exactly once.

## Gotchas
Ordinary recursive destruction uses the call stack. For a very deep chain, consume links with
[`into`](#Box.impl.into) in an iterative loop when stack depth matters.

## Examples
### Store and recover one owned value
```silk
import silk.box { Box }

import silk.allocator { Allocator, OutOfMemoryError }

import silk.effect { Effect }

effect fn build() -> i32
! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut creating = Box<i32>.make(42)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let boxed = run creating
  let borrowed = Box<i32>.get(&boxed)
  if borrowed[0] != 42 {
    return 1
  }
  return Box<i32>.into(move boxed)
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}
```

Import as `Box` with `import silk.box { Box }`.

Public declarations: 3.

::Anchor{id="Vacant"}

## `Vacant`

```silk
pub struct Vacant
```

A marker for a box whose element has been transferred to its caller.

::Anchor{id="Occupied"}

## `Occupied`

```silk
pub struct Occupied
```

A marker for a box that owns one initialized element.

::Anchor{id="Box"}

## `Box`

```silk
pub struct Box<T>
```

Owns one heap-allocated `T` and releases both the value and its allocation on drop.

::Anchor{id="Box.impl"}

## Implementation `Box<T>`

```silk
impl<T> Box<T>
```

::Anchor{id="Box.impl.make"}

### Associated function `make`

```silk
pub effect<'env> fn make<'env>(value: T) -> Box<T> ! OutOfMemoryError ? &mut Allocator
```

Moves one value into a new box with storage for exactly one element.

#### Details

The returned box owns the value and the allocation. Allocation failure produces
`OutOfMemoryError` and does not produce a partial box.

::Anchor{id="Box.impl.get"}

### Method `get`

```silk
pub fn get(self: &Self) -> &[T]
```

Borrows the held value as a shared slice of length one.

#### Details

The slice borrows the box and remains valid only for the lexical borrow.

::Anchor{id="Box.impl.getMut"}

### Method `getMut`

```silk
pub fn getMut(self: &mut Self) -> &mut [T]
```

Borrows the held value as an exclusive slice of length one.

#### Details

The slice permits mutation of the element and remains valid only for the lexical borrow.

::Anchor{id="Box.impl.into"}

### Method `into`

```silk
pub fn into(self: Self) -> T
```

Consumes the box, returns its owned value, and releases its allocation.

::Anchor{id="Box.impl.Drop"}

## Implementation `Drop for Box<T>`

```silk
impl<T> Drop for Box<T>
```

::Anchor{id="Box.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Box<T>) -> ()
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
