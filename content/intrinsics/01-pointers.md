# Pointers

These members make raw pointers, move along them, read and write through them, turn them back into references, and change their qualifiers. They are the primitives under [`silk/mem/pointer`](/docs/std/mem-pointer), which most code should use instead.

## Pointer types

| Type | Null | Points to |
| --- | --- | --- |
| `*const T`, `*mut T` | never | one `T` |
| `[*]const T`, `[*]mut T` | never | the first of many `T`; the pointer carries no length |
| `?*const T`, `?*mut T`, `?[*]const T`, `?[*]mut T` | allowed | as above when not null |
| `*const align(N) T`, `*mut align(1) T`, ... | as written | a `T` at an address aligned to `N` bytes instead of `T`'s natural alignment |

- A pointer is `Copy`. It owns nothing, holds no borrow and keeps nothing alive.
- Making, comparing and converting pointers is safe. Reading or writing through one is `unsafe`.
- Some changes happen implicitly, because they only drop a guarantee: `*mut T` to `*const T`, a non-null pointer to its nullable form, and natural alignment to a smaller `align(N)`. Every other change goes through `pointerRequalify` or `pointerReinterpret`.
- Type arguments are never inferred. Write them: `Intrinsic.pointerRead<i32>(pointer)`.
- A member that takes a reference or a slice takes exactly `&T`, `&mut T`, `&[T]` or `&mut [T]` of its type argument. A reference to an array is not a slice here; bind it to a slice first, as in `let values: &[i32] = &array`.

## Safety vocabulary

The unsafe members below state what the caller proves. These words have one meaning on this page:

- **Live**: the storage has not been released, and the value in it has not been moved out or dropped.
- **Initialized**: the bytes hold a valid value of the type. A `bool` must be 0 or 1, a `char` a Unicode scalar value, a union a valid variant, a reference non-null and aligned.
- **Aligned**: the address is a multiple of the alignment the pointer type states: `T`'s natural alignment (`Layout.of<T>().alignment`) unless the type says `align(N)`.
- **Exclusive**: for the duration stated, no other reference, pointer access or thread reads or writes the same bytes.

Violating any of them is undefined behavior: the compiler and LLVM optimize on the assumption that it never happens, so the program can do anything, not just crash. Debug builds do not check these rules.

### `Intrinsic.pointerFromRef`

```silk signature
fn pointerFromRef<T>(value: &T) -> *const T
```

Returns the address of the value that `value` refers to.

- Safe. It reads nothing.
- The borrow of `value` ends when the call returns. The pointer does not keep the value alive and does not stop other code from moving, changing or dropping it; every later access through the pointer must prove the value is still live.
- Writing through the result after `pointerRequalify` to `*mut T` is undefined behavior: the referent was only shared.
- Wrapper: [`Pointer.fromRef`](/docs/std/mem-pointer#Pointer.impl.fromRef).

```silk
pub fn main() -> i32 {
  let value: i32 = 42
  let pointer = Intrinsic.pointerFromRef<i32>(&value)
  // The address is the referent's own address, so reading it gives the value back.
  return unsafe Intrinsic.pointerRead<i32>(pointer) - 42
}
```

### `Intrinsic.pointerFromMutRef`

```silk signature
fn pointerFromMutRef<T>(value: &mut T) -> *mut T
```

Returns the writable address of the value that `value` refers to exclusively.

- Safe. It reads nothing.
- The exclusive borrow ends when the call returns. After that, ordinary code can use the value again, so a later write through the pointer must not overlap a live reference to it.
- Wrapper: [`Pointer.fromMutRef`](/docs/std/mem-pointer#Pointer.impl.fromMutRef).

```silk
pub fn main() -> i32 {
  let mut value: i32 = 1
  let pointer = Intrinsic.pointerFromMutRef<i32>(&mut value)
  unsafe {
    Intrinsic.pointerWrite<i32>(pointer, 42)
  }
  return value - 42
}
```

### `Intrinsic.pointerFromSlice`

```silk signature
fn pointerFromSlice<T>(values: &[T]) -> ?[*]const T
```

Returns the address of the first element of `values`.

- Safe. It reads nothing.
- The result has no length: pass `values.length` along with it. Its type allows null so that it can describe any slice at a C boundary; a slice of an array, including an empty one, has a non-null address. Use `pointerRequalify` or [`Pointer.nonNullMany`](/docs/std/mem-pointer#Pointer.impl.nonNullMany) to get a `[*]const T` for indexing.
- The pointer does not keep the slice's storage alive. An empty slice's address may be one past an allocation, so reading through it is undefined behavior.
- Wrapper: [`Pointer.fromSlice`](/docs/std/mem-pointer#Pointer.impl.fromSlice).

```silk
pub fn main() -> i32 {
  let array = [10, 20, 30]
  let values: &[i32] = &array
  let first = unsafe Intrinsic.pointerRequalify<?[*]const i32, [*]const i32>(Intrinsic.pointerFromSlice<i32>(values))
  let last = unsafe Intrinsic.pointerRead<i32>(unsafe Intrinsic.pointerAt<i32>(first, values.length - 1))
  return last - 30
}
```

### `Intrinsic.pointerFromMutSlice`

```silk signature
fn pointerFromMutSlice<T>(values: &mut [T]) -> ?[*]mut T
```

Returns the writable address of the first element of `values`.

- Safe. The same rules as `pointerFromSlice` apply. Pass the slice with `move` when it is a binding of type `&mut [T]`, as in `Intrinsic.pointerFromMutSlice<T>(move values)`, or reborrow it with `&mut values` when the binding is used again.
- Writes through the result must stay within `values.length` elements and must not overlap a live reference.
- Wrapper: [`Pointer.fromMutSlice`](/docs/std/mem-pointer#Pointer.impl.fromMutSlice).

```silk
fn zero(values: &mut [u8]) -> () {
  let count = values.length
  let base = unsafe Intrinsic.pointerRequalify<?[*]mut u8, [*]mut u8>(Intrinsic.pointerFromMutSlice<u8>(move values))
  let mut at: usize = 0
  while at < count {
    unsafe {
      Intrinsic.pointerWrite<u8>(Intrinsic.pointerAtMut<u8>(base, at), 0)
    }
    at = at + 1
  }
}

pub fn main() -> i32 {
  let mut bytes: [u8; 4] = [1, 2, 3, 4]
  zero(&mut bytes)
  if bytes[0] != 0 || bytes[3] != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.pointerAt`

```silk signature
unsafe fn pointerAt<T>(pointer: [*]const T, index: usize) -> *const T
```

Returns the address of element `index` of a many-element pointer: `pointer` plus `index * stride`, where the stride is `Layout.of<T>().bytes` rounded up to `T`'s alignment.

- Unsafe. It reads nothing, but the caller proves that the result stays inside the same live allocation as `pointer`, or is one past its last element. The result is a single-element pointer, so reading it needs the element to be live and initialized too.
- There is no bounds check. The multiplication and addition wrap; an index that leaves the allocation is undefined behavior even if the result is never read.
- Wrapper: [`Pointer.at`](/docs/std/mem-pointer#Pointer.impl.at).

```silk
pub fn main() -> i32 {
  let array: [u16; 3] = [7, 8, 9]
  let values: &[u16] = &array
  let base = unsafe Intrinsic.pointerRequalify<?[*]const u16, [*]const u16>(Intrinsic.pointerFromSlice<u16>(values))
  let second = unsafe Intrinsic.pointerAt<u16>(base, 1)
  // Two bytes apart, the stride of u16.
  if Intrinsic.pointerAddress<*const u16>(second) - Intrinsic.pointerAddress<[*]const u16>(base) != 2 {
    return 1
  }
  if unsafe Intrinsic.pointerRead<u16>(second) != 8 {
    return 1
  }
  return 0
}
```

### `Intrinsic.pointerAtMut`

```silk signature
unsafe fn pointerAtMut<T>(pointer: [*]mut T, index: usize) -> *mut T
```

The writable form of `pointerAt`: the address of element `index`, as a `*mut T`.

- Unsafe, with the same obligations as `pointerAt`, and the allocation must be writable.
- Wrapper: [`Pointer.atMut`](/docs/std/mem-pointer#Pointer.impl.atMut).

```silk
pub fn main() -> i32 {
  let mut array: [i64; 4] = [0, 0, 0, 0]
  let values: &mut [i64] = &mut array
  let base = unsafe Intrinsic.pointerRequalify<?[*]mut i64, [*]mut i64>(Intrinsic.pointerFromMutSlice<i64>(move values))
  unsafe {
    Intrinsic.pointerWrite<i64>(Intrinsic.pointerAtMut<i64>(base, 2), 5)
  }
  return Intrinsic.i64ToI32(array[2]) - 5
}
```

### `Intrinsic.pointerRead`

```silk signature
unsafe fn pointerRead<T: Copy>(pointer: *const T) -> T
```

Returns a copy of the `T` at `pointer`. The storage keeps its value.

- Unsafe. The caller proves that `pointer` is aligned for `T` and points to a live, initialized `T`, and that no other thread writes it during the read without synchronization (a data race is undefined behavior; use the atomics for shared words).
- `T` must be `Copy`; a non-`Copy` `T` is SEM0121 at the call. To move a value out, use `pointerTake`.
- For storage that is not aligned for `T`, use `pointerReadUnaligned`.
- Wrapper: [`Pointer.read`](/docs/std/mem-pointer#Pointer.impl.read).

```silk
struct Point {
  x: i32,
  y: i32,
}

impl Intrinsic.Copy for Point {}

pub fn main() -> i32 {
  let point = Point { x: 3, y: 4 }
  let copy = unsafe Intrinsic.pointerRead<Point>(Intrinsic.pointerFromRef<Point>(&point))
  return copy.x + copy.y - 7
}
```

### `Intrinsic.pointerWrite`

```silk signature
unsafe fn pointerWrite<T>(pointer: *mut T, value: T) -> ()
```

Moves `value` into the storage at `pointer`.

- Unsafe. The caller proves that `pointer` is aligned for `T`, points to live, writable storage for a `T`, and that no reference or other thread reads or writes it at the same time.
- The old contents are overwritten without being dropped. Writing over an initialized value that has a drop leaks it; drop it first with `pointerTake`, or write only into uninitialized storage.
- `T` need not be `Copy`: the value moves in. [`Pointer.write`](/docs/std/mem-pointer#Pointer.impl.write) keeps a `Copy` bound; [`Pointer.put`](/docs/std/mem-pointer#Pointer.impl.put) is the moving wrapper.

```silk
pub fn main() -> i32 {
  let mut slot: u32 = 0
  unsafe {
    Intrinsic.pointerWrite<u32>(Intrinsic.pointerFromMutRef<u32>(&mut slot), 9)
  }
  return Intrinsic.u32ToI32(slot) - 9
}
```

### `Intrinsic.pointerTake`

```silk signature
unsafe fn pointerTake<T>(pointer: *mut T) -> T
```

Moves the `T` out of the storage at `pointer` and returns it. The storage is uninitialized afterwards.

- Unsafe. The caller proves that `pointer` is aligned and points to a live, initialized `T` that nothing else will take, read or drop again. After the call the caller owns the value; the storage must be refilled with `pointerWrite`, or never read or dropped. Taking the same value twice runs its drop twice.
- `T` need not be `Copy`. `drop Intrinsic.pointerTake<T>(pointer)` drops a value in place.
- Wrappers: [`Pointer.take`](/docs/std/mem-pointer#Pointer.impl.take), [`Pointer.dropInPlace`](/docs/std/mem-pointer#Pointer.impl.dropInPlace).

```silk
struct Token {
  id: i32,
}

pub fn main() -> i32 {
  let mut storage = Token { id: 5 }
  let pointer = Intrinsic.pointerFromMutRef<Token>(&mut storage)
  unsafe {
    // Move the value out, then put a new one in before `storage` is used or dropped again.
    let taken = Intrinsic.pointerTake<Token>(pointer)
    Intrinsic.pointerWrite<Token>(pointer, Token { id: taken.id + 1 })
  }
  return storage.id - 6
}
```

### `Intrinsic.pointerReadUnaligned`

```silk signature
unsafe fn pointerReadUnaligned<T: Copy>(pointer: *const align(1) T) -> T
```

Returns a copy of the `T` at `pointer`, which may sit at any address.

- Unsafe. The caller proves that the `Layout.of<T>().bytes` bytes at `pointer` are live, readable and form an initialized `T`. Alignment is not required.
- Get a `*const align(1) T` from a byte pointer with `pointerReinterpret`, or from an aligned pointer implicitly.
- Wrapper: [`Pointer.readUnaligned`](/docs/std/mem-pointer#Pointer.impl.readUnaligned).

```silk
pub fn main() -> i32 {
  // A little-endian u32 at byte offset 1 of a byte array.
  let array: [u8; 5] = [0, 0x2A, 0, 0, 0]
  let bytes: &[u8] = &array
  let base = unsafe Intrinsic.pointerRequalify<?[*]const u8, [*]const u8>(Intrinsic.pointerFromSlice<u8>(bytes))
  let at = unsafe Intrinsic.pointerAt<u8>(base, 1)
  let word = unsafe Intrinsic.pointerReadUnaligned<u32>(unsafe Intrinsic.pointerReinterpret<*const u8, *const align(1) u32>(at))
  static if Intrinsic.targetEndianness() == "little" {
    return Intrinsic.u32ToI32(word) - 42
  }
  return 0
}
```

### `Intrinsic.pointerWriteUnaligned`

```silk signature
unsafe fn pointerWriteUnaligned<T: Copy>(pointer: *mut align(1) T, value: T) -> ()
```

Writes `value` to the bytes at `pointer`, which may sit at any address.

- Unsafe. The caller proves that the `Layout.of<T>().bytes` bytes at `pointer` are live and writable, with no concurrent access. The old bytes are overwritten.
- Wrapper: [`Pointer.writeUnaligned`](/docs/std/mem-pointer#Pointer.impl.writeUnaligned).

```silk
pub fn main() -> i32 {
  let mut array: [u8; 6] = [0, 0, 0, 0, 0, 0]
  let bytes: &mut [u8] = &mut array
  let base = unsafe Intrinsic.pointerRequalify<?[*]mut u8, [*]mut u8>(Intrinsic.pointerFromMutSlice<u8>(move bytes))
  unsafe {
    let at = Intrinsic.pointerAtMut<u8>(base, 1)
    Intrinsic.pointerWriteUnaligned<u16>(Intrinsic.pointerReinterpret<*mut u8, *mut align(1) u16>(at), 0x0102)
  }
  static if Intrinsic.targetEndianness() == "little" {
    if array[1] != 2 || array[2] != 1 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.pointerBorrow`

```silk signature
unsafe fn pointerBorrow<A, T>(anchor: &'a A, pointer: *const T) -> &'a T
```

Turns `pointer` into a shared reference whose lifetime is the loan of `anchor`.

- The anchor only names the loan; it is not read. Borrow checking then keeps `anchor` borrowed for as long as the result lives, so a handle that owns storage through a raw pointer can pass itself as the anchor and hand out a reference that cannot outlive it.
- Unsafe. The caller proves that the referent is aligned, live and initialized for the whole loan, and that nothing writes it during the loan except through atomics.
- The result costs nothing: it is the pointer's address.
- Wrapper: [`Pointer.borrow`](/docs/std/mem-pointer#Pointer.impl.borrow).

```silk
struct Handle {
  target: *const i32,
}

impl Handle {
  // The reference lives as long as the borrow of the handle.
  fn get(self: &Self) -> &i32 {
    return unsafe Intrinsic.pointerBorrow<Handle, i32>(self, self.target)
  }
}

pub fn main() -> i32 {
  let value: i32 = 11
  let handle = Handle { target: Intrinsic.pointerFromRef<i32>(&value) }
  return handle.get().* - 11
}
```

### `Intrinsic.pointerBorrowMut`

```silk signature
unsafe fn pointerBorrowMut<A, T>(anchor: &'a mut A, pointer: *mut T) -> &'a mut T
```

Turns `pointer` into an exclusive reference whose lifetime is the exclusive loan of `anchor`.

- Unsafe. The caller proves that the referent is aligned, live and initialized for the whole loan, and that nothing else reads or writes it during the loan. Two live exclusive references to the same value are undefined behavior.
- Wrapper: [`Pointer.borrowMut`](/docs/std/mem-pointer#Pointer.impl.borrowMut).

```silk
struct Cell {
  target: *mut i32,
}

impl Cell {
  fn get(self: &mut Self) -> &mut i32 {
    let target = self.target
    return unsafe Intrinsic.pointerBorrowMut<Cell, i32>(self, target)
  }
}

pub fn main() -> i32 {
  let mut value: i32 = 1
  let mut cell = Cell { target: Intrinsic.pointerFromMutRef<i32>(&mut value) }
  let reference = cell.get()
  reference.* = 8
  return value - 8
}
```

### `Intrinsic.pointerBorrowMany`

```silk signature
unsafe fn pointerBorrowMany<A, T>(anchor: &'a A, pointer: [*]const T, length: usize) -> &'a [T]
```

Turns `pointer` and `length` into a shared slice whose lifetime is the loan of `anchor`. The anchor may also be a slice `&'a [A]`, so a view of a slice's own storage borrows that slice.

- Unsafe. The caller proves that `pointer` addresses `length` contiguous, initialized elements in one live allocation, that `length * Layout.of<T>().bytes` fits in `isize`, and the rules of `pointerBorrow` for the whole loan. A zero length still needs a non-null pointer aligned for `T`.
- There is no check: the slice is the pointer and the length.
- Wrappers: [`Pointer.borrowMany`](/docs/std/mem-pointer#Pointer.impl.borrowMany); `Slice.asBytes` in `silk/collections/slice` views a slice as bytes this way.

```silk
fn bytesOf(values: &[u32]) -> &[u8] {
  let first = unsafe Intrinsic.pointerRequalify<?[*]const u32, [*]const u32>(Intrinsic.pointerFromSlice<u32>(values))
  let bytes = unsafe Intrinsic.pointerReinterpret<[*]const u32, [*]const u8>(first)
  return unsafe Intrinsic.pointerBorrowMany<u32, u8>(values, bytes, values.length * 4)
}

pub fn main() -> i32 {
  let array: [u32; 2] = [1, 2]
  let bytes = bytesOf(&array)
  if bytes.length != 8 {
    return 1
  }
  static if Intrinsic.targetEndianness() == "little" {
    return Intrinsic.u8ToI32(bytes[4]) - 2
  }
  return 0
}
```

### `Intrinsic.pointerBorrowManyMut`

```silk signature
unsafe fn pointerBorrowManyMut<A, T>(anchor: &'a mut A, pointer: [*]mut T, length: usize) -> &'a mut [T]
```

The exclusive form of `pointerBorrowMany`: an exclusive slice of `length` elements, valid for the exclusive loan of `anchor`. The anchor may be `&'a mut [A]`.

- Unsafe, with the obligations of `pointerBorrowMany` and `pointerBorrowMut`: nothing else may access the elements during the loan.
- Pass a `&mut [A]` anchor with `move` when the binding is not used again.
- Wrapper: [`Pointer.borrowManyMut`](/docs/std/mem-pointer#Pointer.impl.borrowManyMut).

```silk
fn tail(values: &mut [i32]) -> &mut [i32] {
  let count = values.length
  let first = unsafe Intrinsic.pointerRequalify<?[*]mut i32, [*]mut i32>(Intrinsic.pointerFromMutSlice<i32>(&mut values))
  let second = unsafe Intrinsic.pointerRequalify<*mut i32, [*]mut i32>(unsafe Intrinsic.pointerAtMut<i32>(first, 1))
  return unsafe Intrinsic.pointerBorrowManyMut<i32, i32>(move values, second, count - 1)
}

pub fn main() -> i32 {
  let mut array = [1, 2, 3]
  let rest = tail(&mut array)
  rest[0] = 20
  return array[1] - 20
}
```

### `Intrinsic.pointerRequalify`

```silk signature
unsafe fn pointerRequalify<From, To>(pointer: From) -> To
```

Returns the same address under other qualifiers. `From` and `To` are pointer types with the same pointee; any of mutability (`const`/`mut`), nullability (`?`), extent (`*`/`[*]`) and alignment (`align(N)`) may change. For a native function pointer type, only nullability may change, and the signature and behavior must be identical.

- Unsafe. The caller proves every guarantee the new type adds: that a pointer made non-null is not null, that a pointer made `mut` points to writable storage that may be written, that a pointer made `[*]` starts a run of elements, and that a pointer given a stronger alignment is aligned to it. The conversion itself reads nothing and keeps the address.
- A different pointee is SEM0215; use `pointerReinterpret` for that.
- Wrappers: [`Pointer.nonNull`](/docs/std/mem-pointer#Pointer.impl.nonNull) and its forms check for null and are safe; [`Pointer.assumeAligned`](/docs/std/mem-pointer#Pointer.impl.assumeAligned), [`Pointer.assumeMany`](/docs/std/mem-pointer#Pointer.impl.assumeMany) and their `Mut` forms are unsafe.

```silk
pub fn main() -> i32 {
  let mut value: i32 = 3
  let nullable: ?*mut i32 = Intrinsic.pointerFromMutRef<i32>(&mut value)
  if Intrinsic.pointerIsNull<?*mut i32>(nullable) {
    return 1
  }
  // Checked above, so removing the `?` is sound.
  let present = unsafe Intrinsic.pointerRequalify<?*mut i32, *mut i32>(nullable)
  let many = unsafe Intrinsic.pointerRequalify<*mut i32, [*]mut i32>(present)
  return unsafe Intrinsic.pointerRead<i32>(unsafe Intrinsic.pointerAtMut<i32>(many, 0)) - 3
}
```

### `Intrinsic.pointerReinterpret`

```silk signature
unsafe fn pointerReinterpret<From, To>(pointer: From) -> To
```

Returns the same address with another pointee type. `From` and `To` are data pointer types with the same mutability, nullability and extent; the pointee, and the `align(N)`, may differ.

- Unsafe. Before any typed access through the result, the caller proves that the address is aligned as `To` states and that the bytes form an initialized value of the new pointee. The conversion reads nothing, initializes nothing, and creates no ownership or loan.
- Changing mutability, nullability or extent at the same time is SEM0215; combine it with `pointerRequalify`.
- It cannot make a pointer from an integer.
- Wrappers: [`Pointer.cast`](/docs/std/mem-pointer#Pointer.impl.cast), [`Pointer.castMut`](/docs/std/mem-pointer#Pointer.impl.castMut) and [`Pointer.castUnaligned`](/docs/std/mem-pointer#Pointer.impl.castUnaligned) in `silk/mem/pointer`.

```silk
pub fn main() -> i32 {
  let value: f32 = 1.0
  let bits = unsafe Intrinsic.pointerReinterpret<*const f32, *const u32>(Intrinsic.pointerFromRef<f32>(&value))
  // f32 and u32 have the same size and alignment, and every bit pattern is a valid u32.
  if unsafe Intrinsic.pointerRead<u32>(bits) != 0x3F800000 {
    return 1
  }
  return 0
}
```

### `Intrinsic.pointerBytes`

```silk signature
unsafe fn pointerBytes<T>(pointer: ?*const T) -> ?[*]const u8
```

Returns the same address as a readonly, many-element byte pointer, keeping null as null.

- Unsafe: the result claims bytes at the address. Each byte read through it must be live, readable and initialized. Padding bytes of a struct are not initialized.
- Useful to read the leading fields of a C record whose full size is not known, without reading a whole `T`.
- Wrapper: [`Pointer.bytes`](/docs/std/mem-pointer#Pointer.impl.bytes).

```silk
pub fn main() -> i32 {
  let value: u16 = 0x0201
  let bytes = unsafe Intrinsic.pointerBytes<u16>(Intrinsic.pointerFromRef<u16>(&value))
  let first = unsafe Intrinsic.pointerRequalify<?[*]const u8, [*]const u8>(bytes)
  let low = unsafe Intrinsic.pointerRead<u8>(unsafe Intrinsic.pointerAt<u8>(first, 0))
  static if Intrinsic.targetEndianness() == "little" {
    return Intrinsic.u8ToI32(low) - 1
  }
  return 0
}
```

### `Intrinsic.pointerAddress`

```silk signature
fn pointerAddress<P>(pointer: P) -> usize
```

Returns the numeric address of a data pointer of any type `P`, or 0 for null.

- Safe. It does not read the pointee, keep it alive, or let you rebuild a pointer from the number.
- `P` must be a data pointer type (SEM0215 otherwise); a native function pointer has no address here.
- Runtime only: a static body cannot call it.
- Wrappers: [`Pointer.address`](/docs/std/mem-pointer#Pointer.impl.address), [`Pointer.addressMany`](/docs/std/mem-pointer#Pointer.impl.addressMany).

```silk
pub fn main() -> i32 {
  let array: [u64; 2] = [0, 0]
  let first = Intrinsic.pointerFromRef<u64>(&array[0])
  let second = Intrinsic.pointerFromRef<u64>(&array[1])
  let gap = Intrinsic.pointerAddress<*const u64>(second) - Intrinsic.pointerAddress<*const u64>(first)
  if gap != 8 || Intrinsic.pointerAddress<?*mut u64>(Intrinsic.pointerNull<u64>()) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.pointerIsNull`

```silk signature
fn pointerIsNull<P>(pointer: P) -> bool
```

Returns whether `pointer` is null. `P` is a data pointer type or a nullable native function pointer type such as `?extern "C" fn(i32) -> ()`.

- Safe. A non-null result does not prove that the memory is live or initialized.
- A non-nullable `P` always answers `false`.
- Wrappers: [`Pointer.isNull`](/docs/std/mem-pointer#Pointer.impl.isNull), [`Pointer.isNullMany`](/docs/std/mem-pointer#Pointer.impl.isNullMany), and `Pointer.nonNull`, which returns an `Option`.

```silk
pub fn main() -> i32 {
  let empty = Intrinsic.pointerNull<u8>()
  let callback = Intrinsic.pointerNullFunction<?extern "C" fn(i32) -> ()>()
  if !Intrinsic.pointerIsNull<?*mut u8>(empty) || !Intrinsic.pointerIsNull<?extern "C" fn(i32) -> ()>(callback) {
    return 1
  }
  let value: u8 = 0
  if Intrinsic.pointerIsNull<?*const u8>(Intrinsic.pointerFromRef<u8>(&value)) {
    return 2
  }
  return 0
}
```

### `Intrinsic.pointerNull`

```silk signature
fn pointerNull<T>() -> ?*mut T
```

Returns the null single-element pointer to `T`, address 0.

- Safe. It converts implicitly to `?*const T`. For a many-element null, requalify it: `unsafe Intrinsic.pointerRequalify<?*mut T, ?[*]mut T>(Intrinsic.pointerNull<T>())` is sound because null adds no guarantee.
- Wrapper: [`Pointer.null`](/docs/std/mem-pointer#Pointer.impl.null).

```silk
pub fn main() -> i32 {
  let none: ?*const i32 = Intrinsic.pointerNull<i32>()
  let many = unsafe Intrinsic.pointerRequalify<?*mut i32, ?[*]mut i32>(Intrinsic.pointerNull<i32>())
  if !Intrinsic.pointerIsNull<?*const i32>(none) || !Intrinsic.pointerIsNull<?[*]mut i32>(many) {
    return 1
  }
  return 0
}
```

### `Intrinsic.pointerNullFunction`

```silk signature
fn pointerNullFunction<F>() -> F
```

Returns the null value of a nullable native function pointer type `F`, such as `?extern "C" fn(i32) -> ()`, for a C field or argument that has no callback.

- Safe. `F` must be a nullable `extern "C" fn` type (SEM0215 otherwise).
- Calling through a null function pointer is undefined behavior; test it with `pointerIsNull` and remove the `?` with `pointerRequalify` first.

```silk
struct Options {
  onEvent: ?extern "C" fn(i32) -> (),
}

pub fn main() -> i32 {
  let options = Options { onEvent: Intrinsic.pointerNullFunction<?extern "C" fn(i32) -> ()>() }
  if !Intrinsic.pointerIsNull<?extern "C" fn(i32) -> ()>(options.onEvent) {
    return 1
  }
  return 0
}
```

## Stack, frames and other addresses

### `Intrinsic.stackAllocate`

```silk signature
unsafe fn stackAllocate<T>(count: usize) -> [*]mut T
```

Returns storage for `count` values of `T` on the running function's stack, at `T`'s natural alignment. It lives until the function returns.

- Unsafe. The caller proves that the storage fits in the stack the thread has left; running past the end of the stack is undefined behavior, not a stack overflow trap.
- The storage is uninitialized. Write before reading. Nothing in it is ever dropped.
- A byte size that does not fit `usize` traps with `arithmetic overflow`.
- A function that suspends (a fiber) loses the storage at the suspension, so do not use it across one.
- Each call grows the frame until the function returns, so a loop should allocate in a callee. [`Stack.withStorage`](/docs/std/mem-stack#Stack.impl.withStorage) is that callee. Runtime only.

```silk
fn sumOfSquares(count: usize) -> u64 {
  let scratch = unsafe Intrinsic.stackAllocate<u64>(count)
  let mut at: usize = 0
  while at < count {
    unsafe {
      Intrinsic.pointerWrite<u64>(Intrinsic.pointerAtMut<u64>(scratch, at), Intrinsic.usizeToU64(at * at))
    }
    at = at + 1
  }
  let mut total: u64 = 0
  at = 0
  while at < count {
    total = total + unsafe Intrinsic.pointerRead<u64>(unsafe Intrinsic.pointerAtMut<u64>(scratch, at))
    at = at + 1
  }
  return total
}

pub fn main() -> i32 {
  return Intrinsic.u64ToI32(sumOfSquares(4)) - 14
}
```

### `Intrinsic.frameAddress`

```silk signature
fn frameAddress() -> [*]const u8
```

Returns the address of the running function's stack frame: the machine frame on native targets, the frame in the linear-memory stack on wasm32 (a function that keeps nothing in linear memory shares its caller's).

- Safe to call. Stacks grow down on every supported target, so a caller's frame is at the same or a higher address. Inlining can merge a function into its caller's frame.
- The address is valid for comparison, and for unsafe reads only while that frame is live.
- Runtime only. Wrapper: [`Stack.frameAddress`](/docs/std/mem-stack#Stack.impl.frameAddress).

```silk
@inlineNever
fn deeper(level: i32) -> usize {
  if level == 0 {
    return Intrinsic.pointerAddress<[*]const u8>(Intrinsic.frameAddress())
  }
  return deeper(level - 1)
}

pub fn main() -> i32 {
  let top = Intrinsic.pointerAddress<[*]const u8>(Intrinsic.frameAddress())
  if deeper(16) > top {
    return 1
  }
  return 0
}
```

### `Intrinsic.prefetch`

```silk signature
fn prefetch<P>(pointer: P, static write: bool, static locality: u32, static instruction: bool) -> ()
```

A hint that the program will soon read the memory at `pointer`, or write it when `write` is `true`. `P` is any data pointer type, nullable or not.

- `locality` says how long to keep the line, from 0 (no reuse) to 3 (every cache level). `instruction` selects the instruction cache instead of the data cache. All three are static; a locality past 3 is SEM0214, and a `P` that is not a data pointer is SEM0215.
- Safe. It reads and writes nothing, never faults, also for null or released memory, and never changes what the program computes. It lowers to `llvm.prefetch`: one instruction on x86_64 and AArch64, nothing on wasm32.
- Runtime only. Wrappers: `Prefetch.hint` and `Prefetch.hintMany` in [`silk/mem/prefetch`](/docs/std/mem-prefetch), which take an options struct.

```silk
fn sum(values: &[u64]) -> u64 {
  let base = Intrinsic.pointerFromSlice<u64>(values)
  let mut total: u64 = 0
  let mut at: usize = 0
  while at < values.length {
    if at + 8 < values.length {
      // Ask for the element eight ahead, for reading, kept in every cache level.
      let ahead = unsafe Intrinsic.pointerAt<u64>(unsafe Intrinsic.pointerRequalify<?[*]const u64, [*]const u64>(base), at + 8)
      Intrinsic.prefetch<*const u64>(ahead, false, 3, false)
    }
    total = total + values[at]
    at = at + 1
  }
  return total
}

pub fn main() -> i32 {
  let array: [u64; 16] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  return Intrinsic.u64ToI32(sum(&array)) - 16
}
```

### `Intrinsic.processWord`

```silk signature
fn processWord() -> *mut u64
```

Returns the address of one zero-initialized `u64` that belongs to the calling function instance and lives as long as the process. Every call in that instance returns the same address; another function, or another instance of a generic function, has its own word and cannot name this one.

- Safe to call. Every thread shares the word, so read and write it only with the atomics (which are unsafe). A plain read or write that races with another thread is undefined behavior.
- With `processSlot` and `threadSlot`, it is the only storage in Silk that outlives a call. A function that caches a value in its word must answer as if it computed it on every call, as `CpuFeatures.machine` does for the CPU features.
- Runtime only.

```silk
// Counts its own calls. The word starts at 0 and is shared by every thread.
fn calls() -> u64 {
  let word = Intrinsic.processWord()
  return unsafe Intrinsic.atomicFetchAdd<u64>(word, 1, "relaxed") + 1
}

pub fn main() -> i32 {
  drop calls()
  drop calls()
  return Intrinsic.u64ToI32(calls()) - 3
}
```

### `Intrinsic.processSlot`

```silk signature
fn processSlot<T>() -> *mut T
```

Returns the address of one zero-initialized `T` that belongs to this call site in the calling function instance and lives as long as the process. Every run of that call returns the same address; another call site, even in the same function, has its own slot. Where `processWord` holds one `u64`, a slot holds any type, so a cache can keep a whole record.

- Safe to call; reading or writing through the pointer is unsafe. Every thread shares the slot, so a slot that more than one thread touches needs atomics or a lock.
- The slot starts as all zero bytes, which must be a valid `T` for any read before the first write.
- Runtime only.

```silk
struct Totals { calls: u64, sum: u64 }

// Remembers every value it was given, in one slot for the whole process.
fn record(value: u64) -> u64 {
  let totals = Intrinsic.processSlot<Totals>()
  unsafe {
    totals.*.calls = totals.*.calls + 1
    totals.*.sum = totals.*.sum + value
    return totals.*.sum
  }
}

pub fn main() -> i32 {
  drop record(2)
  drop record(3)
  return Intrinsic.u64ToI32(record(5)) - 10
}
```

### `Intrinsic.threadSlot`

```silk signature
fn threadSlot<T>() -> *mut T
```

Like `processSlot`, but each thread has its own slot at this call site: zeroed when the thread starts and gone when it ends. No other thread can reach it, so plain reads and writes through the pointer do not race.

- Safe to call; reading or writing through the pointer is unsafe. Do not keep the address past the end of the thread.
- Runtime only.

```silk
// Counts calls on the current thread only.
fn depth() -> u32 {
  let slot = Intrinsic.threadSlot<u32>()
  unsafe {
    slot.* = slot.* + 1
    return slot.*
  }
}

pub fn main() -> i32 {
  drop depth()
  return Intrinsic.u32ToI32(depth()) - 2
}
```

### `Intrinsic.variadicArguments`

```silk signature
fn variadicArguments() -> *mut u64
```

In the body of an `export "C"` function whose parameters end with `...`, returns the address of its C `va_list`. The exported entry starts the list at the first variadic argument before the body runs, and the list lives until the function returns.

- Safe to call; reading arguments from the list is unsafe. The layout of a `va_list` depends on the target ABI, so read it with [`VaList`](/docs/std/mem-va-list#VaList) from `silk/mem/va_list` (`VaList.of(Intrinsic.variadicArguments())`, then `next<T>()`).
- Calling it anywhere else is a compile error. Runtime only.

```silk check
import silk.mem.va_list { VaList }

// C calls this as `sum(count, ...)` with `count` more `int` arguments.
pub unsafe export "C" fn sum(count: i32, ...) -> i32 as "example_sum" {
  let mut arguments = unsafe VaList.of(Intrinsic.variadicArguments())
  let mut total: i32 = 0
  let mut at: i32 = 0
  while at < count {
    total = total + unsafe arguments.next<i32>()
    at = at + 1
  }
  return total
}

pub fn main() -> i32 {
  return 0
}
```

## Common recipes

- **Cast a pointer to another type.** `pointerReinterpret<*const T, *const U>`, or [`Pointer.cast<T, U>`](/docs/std/mem-pointer#Pointer.impl.cast). The alignment and initialization of the new type are yours to prove.
- **A zero-filled value of a C struct.** [`Pointer.zeroed<T>()`](/docs/std/mem-pointer#Pointer.impl.zeroed). It is `stackAllocate<T>(1)`, a byte-wise zero fill through `pointerReinterpret<[*]mut T, [*]mut u8>`, and `pointerTake`. It is unsafe because all-zero bytes are not a valid value of every type.
- **The offset of a field.** `Layout.offsetOf<T>("field")` (on `fieldOffset`, see Memory and storage). Use it with `pointerReinterpret` to a byte pointer and `pointerAt` to address one field of a foreign record.
- **Check for null without unsafe.** `Pointer.nonNull` returns `Option<*const T>`; it is `pointerIsNull` and `pointerRequalify` together.
