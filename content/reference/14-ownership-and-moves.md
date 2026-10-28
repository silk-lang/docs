# Ownership and moves

Every value has exactly one owner. This page covers which values copy and which move, the explicit `move` and `drop` forms, partial moves, `Copy` and `Drop` conformances, when destructors run, and replacing a value in place.

## Syntax

```
MoveExpression    = 'move' Expression
DropStatement     = 'drop' Expression
MatchMove         = 'match' 'move' Expression '{' MatchArm* '}'
CopyConformance   = 'impl' GenericParameters? Copy 'for' Type '{' '}'
DropConformance   = 'impl' GenericParameters? Drop 'for' Type '{' DropHook '}'
DropHook          = 'fn' 'drop' '(' 'self' ':' '&' 'mut' Type ')' '->' '(' ')' Block
```

`Copy` and `Drop` are the names exported by `silk/core/ownership`. They are aliases of `Intrinsic.Copy` and `Intrinsic.Drop`, so `impl Intrinsic.Copy for T {}` is the same conformance.

## Owners

- A `let` binding, a parameter, a field, an array element and a temporary each own their value.
- When an owner goes out of scope, it drops the value it still owns.
- Moving a value transfers ownership. The source becomes moved and cannot be read again (OWN0001).
- Assigning to a moved `let mut` binding or field makes it owned again.

## Copy types

These types copy implicitly. Reading them never moves the source.

- Every scalar primitive: integers, floats, `bool`, `char`.
- `()` and `string` (a string is a borrowed view).
- Shared references `&T` and shared slices `&[T]`.
- Raw pointers and foreign function types.
- Scalar `enum` types. They are always `Copy` and cannot be declared `Copy` or `Drop` again.
- Fixed arrays `[T; N]` whose element type is `Copy`.
- Structural unions such as `i32 | bool` whose members are all `Copy`.
- Callable values whose invocation mode is shared. See Closures and callable types.
- A type parameter `T` only under a `T: Copy` bound.

Everything else moves. That includes exclusive references `&mut T` and `&mut [T]`, every `struct` (even an empty one), nominal `union` types, and tuples.

## Explicit moves

- Moving out of a named place needs `move`: `move x`, `move p.field`. Without it the compiler reports OWN0003.
- This holds everywhere a value leaves a place: `let`, assignment, call arguments, `return`, struct and array literals.
- A temporary needs no `move`. Call results and literals move into their destination directly.
- `move` on a `Copy` value copies it. The source stays usable.
- A move inside a branch makes the binding maybe-moved after the branch. Reading it is OWN0001.
- At scope end a maybe-moved binding is dropped only if the branch that moves it did not run.
- A loop must leave each owner in the same state at the end of every iteration as at entry. Moving an owner in a loop body without reassigning it is OWN0005.

## Partial moves

- `move p.field` moves one field out of a local. The other fields stay owned and readable.
- After a partial move, using the whole value is OWN0001. Reassigning the moved field restores the whole value.
- At scope end, only the fields still owned are dropped.
- Partial moves are rejected (OWN0002) when the place:
  - belongs to a type with its own `Drop` conformance,
  - is a field of a temporary such as `make().field`,
  - is reached through a reference, as in `move r.field` with `r: &P`.
- Moving a whole referent or slice element out, as in `move r.*` or `move s[0]`, is OWN0012. See Borrowing.

## Moving out in match

- `match move e { ... }` consumes the scrutinee. Arm bindings own the parts they bind.
- `match e` on a non-`Copy` place without `move` or a borrow is OWN0003.
- `match &e` and `match &mut e` borrow instead. See Borrowing.
- A guard cannot consume a binding of its own arm (OWN0008). Guards read; arms consume.
- See Patterns and match for patterns and `match place`.

## Opting into Copy

- `impl Copy for T {}` makes a struct, nominal union or nominal tuple copy implicitly.
- The impl body must be empty. Declaring a member is SEM0083.
- Every stored field must be `Copy`, and the type must not also implement `Drop`. Otherwise the conformance is SEM0083.
- The check runs where the compiler first needs to know whether the type copies, so an unused invalid impl may go unreported.
- A generic type can opt in under bounds: `impl<T: Copy> Copy for Wrapper<T> {}`.
- A `Copy` or `Drop` head may not select by lifetime. Naming `'static`, repeating one lifetime, or bounding a lifetime in the head is SEM0220.

## The drop statement

- `drop e` consumes `e` now. A named place is dropped and becomes moved.
- `drop` also ends a `Copy` binding: reading it afterwards is OWN0001.
- `drop make()` drops a temporary immediately.
- `let _ = e` is not allowed (SEM0087). Use `drop e`.

## Destructors

- `impl Drop for T { fn drop(self: &mut Self) -> () { ... } }` gives `T` a cleanup hook. Spelling the receiver `&mut T` is the same.
- The impl must declare exactly this one member with exactly this signature. A missing `drop`, any other member, another receiver, a `mut self` receiver binding, extra parameters, another result, `unsafe` or `effect` is SEM0084.
- A `Drop` conformance on a scalar `enum` is SEM0084.
- The hook cannot be called directly. Cleanup runs only through drops.
- When a value with a hook is dropped, the hook runs first, then the fields are dropped.

## When values are dropped

- At the end of a block, owned locals drop in reverse declaration order.
- A function's locals drop before its parameters.
- `return`, `break` and `continue` drop the locals of every scope they leave.
- Assigning to an owned place drops the old value at the assignment, then stores the new one. This applies to locals, fields, array elements, slice elements and `mut` parameters.
- A temporary not moved anywhere drops at the end of its statement.
- Struct fields drop in declaration order. Array elements drop in index order.
- A moved value is never dropped by its old owner.
- An `effect fn` that exits with `fail` drops its locals on the way out. See Typed failures.

## Replacing in place

- `Intrinsic.replace(place, value)` stores `value` into `place` and returns the old value. No drop runs.
- `place` must be a writable place: a `let mut` binding, a field, an indexed element, or `r.*` with `r: &mut T`. Otherwise SEM0035 or SEM0036.
- `silk/core/ownership` has no wrapper for it; call the intrinsic directly.
- An assignment whose right side moves out of the place being assigned is OWN0004, for example `t = next(move t)`. Move the old value out first, or use `Intrinsic.replace`.

## Examples

```silk
import silk.core.ownership { Copy }

struct Point {
  x: i32,
  y: i32,
}

impl Copy for Point {}

struct Token {
  id: i32,
}

fn consume(token: Token) -> i32 {
  return token.id
}

pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let q = p
  let r = p
  let a = Token { id: 3 }
  let b = move a
  let mut c = Token { id: 4 }
  let total = consume(move c)
  c = Token { id: 5 }
  return q.x + r.y + b.id + total + c.id - 15
}
```

Partial moves, `match move` and `Intrinsic.replace`:

```silk
struct Token {
  value: i32,
}

struct Pair {
  left: Token,
  right: Token,
}

union Slot {
  Empty,
  Full { token: Token }
}

fn consume(token: Token) -> i32 {
  return token.value
}

fn take(slot: &mut Slot) -> i32 {
  let old = Intrinsic.replace(slot.*, Slot.Empty)
  return match move old {
    Slot.Empty => 0
    Slot.Full { token } => consume(move token)
  }
}

pub fn main() -> i32 {
  let mut pair = Pair { left: Token { value: 1 }, right: Token { value: 2 } }
  let left = consume(move pair.left)
  let right = pair.right.value
  pair.left = Token { value: 10 }
  let whole = move pair
  let mut slot = Slot.Full { token: Token { value: 7 } }
  let first = take(&mut slot)
  let second = take(&mut slot)
  return left + right + whole.left.value + first + second - 20
}
```

Drop order, recorded through a shared log:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.core.ownership { Drop }
import silk.mem.shared { Shared }

struct Log {
  order: i32,
}

struct Tracer {
  id: i32,
  log: Shared<Log>,
}

struct Pair {
  first: Tracer,
  second: Tracer,
}

fn record(log: &mut Log, id: i32) -> i32 {
  log.order = log.order * 10 + id
  return log.order
}

impl Drop for Tracer {
  fn drop(self: &mut Tracer) -> () {
    let id = self.id
    let seen = Shared<Log>.withMut<i32>(&self.log, record(id))
    return ()
  }
}

fn tracer(id: i32, log: &Shared<Log>) -> Tracer {
  return Tracer { id: id, log: Shared<Log>.clone(log) }
}

fn scenario(log: &Shared<Log>) -> () {
  let mut a = tracer(1, log)
  let pair = Pair { first: tracer(4, log), second: tracer(5, log) }
  a = tracer(3, log)
  let b = tracer(2, log)
  drop b
  return ()
}

fn order(log: &Log) -> i32 {
  return log.order
}

effect fn body() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let log = run Shared<Log>.make(Log { order: 0 }) |> Effect.provideMut<Allocator>(&mut allocator)
  scenario(&log)

  // 1: replaced by assignment, 2: dropped by `drop b`,
  // then at scope end: pair (fields 4, 5), then a (3).
  if Shared<Log>.with<i32>(&log, order) != 12453 {
    return 1
  }
  return 0
}

effect fn recover(error: OutOfMemoryError) -> i32 {
  return 2
}

pub fn main() -> i32 {
  return run Effect.catchAll(body(), recover)
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0001 | A binding is used after it was moved (or after `drop`) |
| OWN0002 | A partial move crosses a boundary that does not support it: a `Drop` type, a temporary, or a reference |
| OWN0003 | Moving a named place requires an explicit `move` |
| OWN0004 | An assignment consumes the place it is replacing |
| OWN0005 | A loop repeats with owners in a different state than at entry |
| OWN0008 | A match guard consumes a pattern binding |
| OWN0012 | A non-`Copy` value is moved out through a borrowed place |
| SEM0083 | Invalid `Copy` conformance: the impl declares a member, a field is not `Copy`, the type has `Drop`, or the type is a primitive or enum |
| SEM0084 | Invalid `Drop` conformance: the impl is not exactly `fn drop(self: &mut Self) -> ()`, or the type is a scalar enum |
| SEM0087 | `let _ = e`; use `drop e` |
| SEM0220 | A `Copy` or `Drop` head names `'static`, repeats one lifetime, or bounds a lifetime |

## See also

Borrowing · Lifetimes · Patterns and match · Bindings and statements · Allocation and shared ownership · Closures and callable types · Intrinsics · Effects and run · Typed failures · Services and providers · `silk/core/ownership`, `silk/mem/shared`
