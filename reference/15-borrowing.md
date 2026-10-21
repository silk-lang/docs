# Borrowing

A borrow lends access to a value without moving it. This page covers shared and exclusive references, slices, projections and reborrows, and the rules the compiler enforces while a loan is active.

## Syntax

```
Borrow          = '&' Expression | '&' 'mut' Expression
Dereference     = Expression '.' '*'
ReferenceType   = '&' Lifetime? Type | '&' Lifetime? 'mut' Type
SliceType       = '&' Lifetime? '[' Type ']' | '&' Lifetime? 'mut' '[' Type ']'
```

The operand of a borrow is usually a place: a binding, a field `x.f`, an element `x[i]`, or a referent `r.*`. Lifetimes are covered in Lifetimes.

## References

- `&T` is a shared reference. Any number may exist at once. It is `Copy`.
- `&mut T` is an exclusive reference. It moves like any non-`Copy` value.
- `&x` borrows `x` shared. `&mut x` borrows it exclusively and needs a `let mut` binding or `mut` parameter (SEM0057).
- `r.*` names the referent. Read it with `r.*`, write it with `r.* = v` through `&mut`.
- Field access sees through references: `r.field` reads, and `r.field = v` writes through `&mut`.
- Writing through a shared reference is rejected (SEM0036).

## Borrowing temporaries

- Borrowing a value that is not a place creates a temporary: `&make()`, `&5`, `&(a + 1)`, `&mut make()`.
- The temporary lives until the end of the enclosing statement. `read(&make())` is fine.
- `let r = &5` followed by a use of `r` is OWN0019. Bind the value to a local first.
- A bound method value such as `make().get` cannot borrow a temporary receiver (SEM0056). Call it directly or bind the receiver first.

## Projections

- `&x.field` and `&mut x.field` borrow one field. `&arr[i]` and `&mut arr[i]` borrow one element.
- Projections work through references: with `b: &mut Box`, `&mut b.value` borrows the field.
- `&arr` converts to a slice `&[T]` where a slice is expected. `&mut arr` converts to `&mut [T]`.
- An array is never passed where a slice is expected without `&` (SEM0012).
- A slice has `.length` and is indexed like an array. Out-of-range indexes trap.
- `Slice.view(values, offset, length)` from `silk/slice` borrows a subrange of a shared slice.

## Reborrowing

- `&mut r.*` reborrows the referent of `r: &mut T` exclusively. `&r.*` reborrows it shared.
- `&mut r.*` with `r: &T` or `r: &[T]` is SEM0058. A shared view cannot become exclusive.
- At a call, an argument `&r` or `&mut r` where `r` is already a reference of the parameter's type passes a reborrow of the referent.
- Elsewhere `&r` makes a reference to the reference: `let k = &r` has type `&&T`.

## Method receivers

- A method whose receiver is `self: &T` or `self: &mut T` can be called on an owned value: `c.inc()` borrows `c` for the call.
- An exclusive receiver needs a mutable place (SEM0057).

## Loans

Each borrow creates a loan on the place it borrows. While the loan is active:

- A shared loan forbids writes, moves and drops of the place, and exclusive borrows of it.
- An exclusive loan also forbids reads and shared borrows of the place.
- Conflicting borrows are OWN0010. Other access to the owner is OWN0011. Moving a non-`Copy` value out through a borrow is OWN0012.
- Fields with different names never conflict. Elements with different constant indexes never conflict. Two runtime indexes into the same array always conflict.

A loan ends after the last use of every reference derived from it. Code after that point can use the owner freely, even in the same block.

## Borrows in match

- `match &e` and `match &mut e` bind each pattern variable to a place inside `e`. The binding has the field's type, not a reference type.
- Read a binding directly, assign it under `match &mut`, or borrow it with `&b` or `&mut b`.
- The bindings are views. Returning or storing one outside its arm is OWN0006.
- `match &mut e` needs a mutable place for `e` (OWN0007).
- A guard may read bindings but cannot consume one (OWN0008).
- `match &mut` on a temporary is OWN0009. Bind the value to a local first.
- A reference cannot be the subject itself (SEM0226). Match its referent: `match &r.*` or `match &mut r.*`.
- The scrutinee stays borrowed for the whole arm. Writing the scrutinee's owner inside the arm is OWN0011.

See Patterns and match for patterns and `match place`.

## Stored loans

- Storing a reference into a struct, array or out-parameter keeps the loan alive as long as the container is used.
- `let h = Holder { view: &a }` then `a = 5` then `h.view.*` is OWN0011, and the read is OWN0019.
- A callee signature can store one argument's loan into another. With `fn keep<'k>(out: &mut Holder<'k>, v: &'k i32)`, the caller's loan on `v`'s referent lasts as long as `'k`.
- This holds for the caller's local lifetimes too. `keep(&mut h, &a)` inside an inner block, followed by `h.view.*` after the block, is OWN0019, just like `h.view = &a`. Parameter order does not matter: `fn stash<'a>(src: &'a i32, out: &mut Holder<'a>)` can be called from local code.
- Inside a function whose parameters name the lifetime, that loan lasts to the end of the function.
- A reference to a local stored where it would outlive the local is OWN0019, or SEM0212 when the call's lifetimes cannot be satisfied.

## Examples

```silk
struct Counter { value: i32 }

impl Counter {
  fn get(self: &Counter) -> i32 { return self.value }
  fn bump(self: &mut Counter) -> () {
    self.value = self.value + 1
    return ()
  }
}

fn sum(values: &[i32]) -> i32 {
  let mut total = 0
  let mut i: usize = 0
  while i < values.length {
    total = total + values[i]
    i = i + 1
  }
  return total
}

fn setFirst(values: &mut [i32], value: i32) -> () {
  values[0] = value
  return ()
}

pub fn main() -> i32 {
  let mut c = Counter { value: 1 }
  c.bump()
  let r = &mut c.value
  r.* = r.* + 10
  let mut arr = [1, 2, 3]
  setFirst(&mut arr, 4)
  let first = &mut arr[0]
  let second = &arr[1]
  first.* = first.* + second.*
  return c.get() + sum(&arr) - 23
}
```

## Errors and fixes

OWN0010, conflicting loans:

```silk
pub fn main() -> i32 {
  let mut x = 1
  let r = &mut x
  let s = &x
  r.* = 2
  return s.*
}
```

Finish with `r` before taking `s`:

```silk
pub fn main() -> i32 {
  let mut x = 1
  let r = &mut x
  r.* = 2
  let s = &x
  return s.* - 2
}
```

OWN0011, owner access during a loan. The later read through `r` is also OWN0019:

```silk
pub fn main() -> i32 {
  let mut x = 1
  let r = &x
  x = 5
  return r.*
}
```

Read through `r` before the write:

```silk
pub fn main() -> i32 {
  let mut x = 1
  let r = &x
  let seen = r.*
  x = 5
  return seen + x - 6
}
```

OWN0012, moving out through a borrow:

```silk
struct Tok { v: i32 }
fn take(r: &Tok) -> Tok { return move r.* }
pub fn main() -> i32 { return 0 }
```

Take `&mut` and leave a value behind:

```silk
struct Tok { v: i32 }
fn take(r: &mut Tok) -> Tok { return Intrinsic.replace(r.*, Tok { v: 0 }) }
pub fn main() -> i32 {
  let mut t = Tok { v: 7 }
  let old = take(&mut t)
  return old.v + t.v - 7
}
```

OWN0006, a borrowed binding escapes its arm:

```silk
struct Tok { v: i32 }
struct Box { t: Tok }
fn inner(b: Box) -> i32 {
  let r = match &b { Box { t } => t }
  return r.v
}
pub fn main() -> i32 { return 0 }
```

Copy the needed value out inside the arm:

```silk
struct Tok { v: i32 }
struct Box { t: Tok }
fn value(b: Box) -> i32 {
  let r = match &b { Box { t } => t.v }
  return r
}
pub fn main() -> i32 { return value(Box { t: Tok { v: 4 } }) - 4 }
```

OWN0019, a reference outlives its referent:

```silk
pub fn main() -> i32 {
  let zero = 0
  let mut r = &zero
  if true {
    let inner = 5
    r = &inner
  }
  return r.*
}
```

Declare the referent in the outer scope:

```silk
pub fn main() -> i32 {
  let zero = 0
  let inner = 5
  let mut r = &zero
  if true {
    r = &inner
  }
  return r.* - 5
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0006 | A borrowed pattern binding escapes its match arm |
| OWN0007 | An exclusive match needs a mutable binding |
| OWN0008 | A match guard consumes a pattern binding |
| OWN0009 | A borrowed match needs a complete binding place, not a temporary |
| OWN0010 | A new loan conflicts with an active loan |
| OWN0011 | Access to an owner conflicts with an active loan |
| OWN0012 | A non-`Copy` value is moved out through a borrowed place |
| OWN0019 | A borrowed value is used after its referent stopped being valid |
| SEM0012 | An argument's type does not match its parameter, such as an array passed for a slice |
| SEM0036 | Assignment target is not writable |
| SEM0056 | A borrow needs a direct stable owner or borrowed view |
| SEM0057 | Exclusive borrowing needs a mutable binding |
| SEM0058 | A shared view cannot be reborrowed exclusively |
| SEM0212 | A lifetime bound at a call or store does not hold |
| SEM0226 | `match` or `if let` subject is a reference; match its referent with `&r.*` |

## See also

Ownership and moves · Lifetimes · Patterns and match · Functions and methods · Structs, tuples and arrays · Allocation and shared ownership · `silk/slice`

## Open questions

- `out.view = &src.*` followed by `src.* = 9`, with `src: &'a mut i32` and `out: &mut Holder<'a>`, is accepted. `silk check` only prints `note[borrow-check] this body is not borrow-checked yet (stored-loans); it may hide OWN0019, OWN0011, OWN0010` at the start of the function body. The same store through a call is OWN0011.
