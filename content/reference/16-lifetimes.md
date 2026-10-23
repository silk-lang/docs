# Lifetimes

A lifetime names a region of the program during which a borrow stays valid. This page covers lifetime parameters, outlives bounds, `'static`, elision of omitted lifetimes, and the related diagnostics.

## Syntax

```
Lifetime           = "'" Identifier
LifetimeParameter  = Lifetime ( ':' Lifetime ( '+' Lifetime )* )?
TypeOutlives       = Identifier ':' Lifetime
GenericParameters  = '<' ( LifetimeParameter | TypeParameter ) ( ',' ( LifetimeParameter | TypeParameter ) )* '>'
ReferenceType      = '&' Lifetime? 'mut'? Type
SliceType          = '&' Lifetime? 'mut'? '[' Type ']'
StringType         = 'string' ( '<' Lifetime '>' )?
LifetimeArguments  = '<' Lifetime ( ',' ( Lifetime | Type ) )* '>'
HigherRanked       = 'for' '<' LifetimeParameter ( ',' LifetimeParameter )* '>' CallableType
EffectEnvironment  = 'effect' '<' Lifetime '>' 'fn' ...
```

## Lifetime parameters

- Functions, methods, structs, unions, impls and interfaces declare lifetimes in their generic list: `fn f<'a>(...)`, `struct View<'a> { ... }`, `impl<'a> View<'a> { ... }`, `interface Source<'s> { ... }`.
- Lifetime and type parameters may appear in any order in one list.
- A lifetime used in a header must be declared in that header or an enclosing impl (SEM0209).
- Declaring the same lifetime twice, or declaring `'static`, is SEM0211.
- There is no anonymous lifetime. `'_` is an unknown lifetime (SEM0209).

## Outlives bounds

- `'a: 'b` means `'a` lasts at least as long as `'b`. Several bounds join with `+`: `'a: 'b + 'c`.
- `T: 'a` means every borrow inside `T` lasts at least as long as `'a`. `T: 'static` means `T` holds no borrow shorter than the program.
- Bounds are written inline in the generic list. A `where` clause does not accept lifetime bounds.
- A reference `&'x V<'a>` implies `'a: 'x`, so a method may return the inner borrow at the outer lifetime.
- An unproven lifetime bound is SEM0212. An unproven type outlives bound is also reported as SEM0212.

## 'static

- `'static` lasts for the whole program. It needs no declaration.
- String literals have type `string<'static>`.
- A function with no borrowed inputs must write `'static` on a borrowed result: `fn label() -> string<'static>`.

## References in structs

- A struct field may name a declared lifetime: `struct View<'a> { item: &'a i32 }`.
- A field reference with no lifetime gets a hidden lifetime parameter of the struct, one per omitted lifetime, in field order.
- `struct Pair { a: &i32 b: &i32 }` therefore has two lifetime parameters. `Pair<'x, 'x>` is valid. `Pair<'x>` is SEM0051.
- A `string` field with no lifetime is elided the same way. This works in union variants and in the type's impl blocks: `union Label { Named { text: string }, Empty }`.

## Lifetime arguments

- Lifetimes are usually inferred at a call. They can be written explicitly: `pick<'p, 'p, 'p>(a, b, false)`.
- Inference does not depend on parameter order.
- A lifetime that appears only in the result and has several outlives bounds, as `'c` in `pick<'a: 'c, 'b: 'c, 'c>`, is inferred as the shortest of the argument lifetimes, not `'static`. `pick(&a, &b, false)` is valid.
- Using such a result after one of its referents ends is OWN0019. Returning it from a function where one referent is local is SEM0212. Returning a borrow at a lifetime the input is not declared to outlive, as in `fn f<'a, 'b>(x: &'a i32) -> &'b i32 { return x }`, is SEM0212 at the returned value.
- A type takes lifetime arguments the same way: `View<'a>`, `string<'a>`.
- Writing a lifetime argument pins the call. Its bounds must then hold (SEM0212).

## Elision

Omitted lifetimes in a function signature follow these rules.

- Each omitted lifetime in a parameter type becomes a fresh lifetime parameter.
- A parameter's outer borrow is the lifetime of its outermost `&T`, `&mut T`, `&[T]` or `string`. Lifetimes nested inside a struct type such as `View` are not outer borrows.
- An omitted lifetime in the result takes the receiver's outer borrow, when the receiver parameter has one.
- Otherwise it takes the outer borrow of the only parameter that has one.
- Otherwise the result lifetime must be written (SEM0210). This covers zero or several borrowed parameters.
- Omitted lifetimes in a callable type such as `fn(&i32) -> &i32` are fresh for each call, like an explicit `for<'x>`.
- In a body, omitted lifetimes in annotations are inferred.

## Effect functions

- `effect<'env> fn f<T: 'env, 'env>(value: T) -> ...` names the environment lifetime the returned effect retains. `'env` must also be declared in the generic list.
- Without it, an `effect fn` retains the intersection of the regions its inputs retain, or `'static` when they retain none.
- A generic `effect fn` that takes a type parameter by value, as in `effect fn keep<A>(value: A) -> A`, gets an implicit `'env` with `A: 'env`.
- See Effects and run.

## Higher-ranked callables

- `for<'x> fn(&'x i32) -> &'x i32` is a callable that accepts any lifetime `'x` chosen at each call.
- `for` binders may carry bounds: `for<'call, 'view: 'call> ...`.
- See Closures and callable types.

## Validity

- A borrow must not be used after its referent stops being valid (OWN0019). This covers storing one into a longer-lived container and borrowing a temporary past its statement. The error points at the use, with a note at the borrow.
- Returning a reference to a local is SEM0212, reported at the borrow: the result's lifetime must outlive the function, and the local does not.
- A borrow stored into a value bounded by a caller's lifetime, such as an out-parameter `&mut View<'s>`, must outlive that lifetime (SEM0212 or OWN0019).
- A `Copy` or `Drop` impl head may not select by lifetime: no `'static`, no repeated lifetime, no bound (SEM0220).

## Examples

```silk
struct View<'a> {
  item: &'a i32
}

impl<'a> View<'a> {
  fn get(self: &View<'a>) -> &'a i32 {
    return self.item
  }
}

fn longest<'a>(left: &'a i32, right: &'a i32) -> &'a i32 {
  if left.* >= right.* {
    return left
  }
  return right
}

fn widen<'short, 'long: 'short>(value: &'long i32) -> &'short i32 {
  return value
}

fn first(values: &[i32]) -> &i32 {
  return &values[0]
}

fn label() -> string<'static> {
  return "static text"
}

pub fn main() -> i32 {
  let a = 3
  let b = 7
  let view = View { item: longest(&a, &b) }
  let item = view.get()
  let wide = widen(item)
  let arr = [5, 6]
  let head = first(&arr)
  let text = label()
  return wide.* + head.* - 12
}
```

Interfaces, type outlives bounds and higher-ranked callables:

```silk
interface Source<'s> {
  fn peek(self: &Self) -> &'s i32
}

struct Fixed<'s> {
  value: &'s i32
}

impl<'s> Source<'s> for Fixed<'s> {
  fn peek(self: &Self) -> &'s i32 {
    return self.value
  }
}

struct Holder<'a, T: 'a> {
  item: &'a T
}

fn read<'s, S: Source<'s>>(source: &S) -> i32 {
  return source.peek().*
}

fn hold<'a, T: 'a>(item: &'a T) -> Holder<'a, T> {
  return Holder { item: item }
}

fn apply(f: for<'x> fn(&'x i32) -> &'x i32, value: &i32) -> i32 {
  return f(value).*
}

fn same<'b>(value: &'b i32) -> &'b i32 {
  return value
}

pub fn main() -> i32 {
  let k = 6
  let source = Fixed { value: &k }
  let held = hold(&k)
  return read(&source) + held.item.* + apply(same, &k) - 18
}
```

Inferred and explicit lifetime arguments at a call:

```silk
fn pick<'a: 'c, 'b: 'c, 'c>(x: &'a i32, y: &'b i32, first: bool) -> &'c i32 {
  if first {
    return x
  }
  return y
}

fn both<'p>(a: &'p i32, b: &'p i32) -> i32 {
  return pick<'p, 'p, 'p>(a, b, false).*
}

pub fn main() -> i32 {
  let a = 1
  let b = 2
  if pick(&a, &b, true).* != 1 {
    return 1
  }
  return both(&a, &b) - 2
}
```

## Errors and fixes

SEM0209, an undeclared lifetime:

```silk
fn read(x: &'b i32) -> i32 { return x.* }
pub fn main() -> i32 { return 0 }
```

SEM0210, an ambiguous result lifetime:

```silk
fn pick(a: &i32, b: &i32) -> &i32 { return a }
pub fn main() -> i32 { return 0 }
```

Name the lifetime the result borrows from:

```silk
fn pick<'a>(a: &'a i32, b: &i32) -> &'a i32 {
  return a
}

pub fn main() -> i32 {
  let x = 1
  let y = 2
  return pick(&x, &y).* - 1
}
```

SEM0211, a duplicated binder:

```silk
fn same<'a, 'a>(x: &'a i32) -> &'a i32 { return x }
pub fn main() -> i32 { return 0 }
```

SEM0212, a bound that does not hold:

```silk
fn widen<'a, 'b: 'a>(value: &'b i32) -> &'a i32 { return value }
fn swap<'a, 'b>(x: &'a i32) -> &'b i32 { return widen<'b, 'a>(x) }
pub fn main() -> i32 { return 0 }
```

Declare the needed relationship:

```silk
fn widen<'a, 'b: 'a>(value: &'b i32) -> &'a i32 {
  return value
}

fn swap<'a: 'b, 'b>(x: &'a i32) -> &'b i32 {
  return widen<'b, 'a>(x)
}

pub fn main() -> i32 {
  let k = 5
  return swap(&k).* - 5
}
```

SEM0212 for a type outlives bound:

```silk
fn keep<T: 'static>(value: T) -> i32 {
  drop value
  return 0
}
pub fn main() -> i32 {
  let local = 3
  return keep(&local)
}
```

SEM0220, a `Drop` head that selects by lifetime:

```silk
import silk.ownership { Drop }
struct Handle<'a> { item: &'a i32 }
impl Drop for Handle<'static> {
  fn drop(self: &mut Handle<'static>) -> () { return () }
}
pub fn main() -> i32 { return 0 }
```

Implement it for every lifetime:

```silk
import silk.ownership { Drop }

struct Handle<'a> {
  item: &'a i32
}

impl<'a> Drop for Handle<'a> {
  fn drop(self: &mut Handle<'a>) -> () {
    return ()
  }
}

pub fn main() -> i32 {
  let k = 1
  let h = Handle { item: &k }
  return h.item.* - 1
}
```

SEM0212, returning a borrow of a local. The error points at `&local`:

```silk
fn bad(x: &i32) -> &i32 {
  let local = 1
  return &local
}
pub fn main() -> i32 { return 0 }
```

SEM0212, storing a borrow of a local into an out-parameter:

```silk
struct View<'a> { item: &'a i32 }
fn fill<'s>(out: &mut View<'s>) -> () {
  let local = 3
  out.* = View { item: &local }
  return ()
}
pub fn main() -> i32 { return 0 }
```

Store a borrow the caller provides:

```silk
struct View<'a> {
  item: &'a i32
}

fn fill<'s>(out: &mut View<'s>, source: &'s i32) -> () {
  out.* = View { item: source }
  return ()
}

pub fn main() -> i32 {
  let zero = 0
  let k = 4
  let mut view = View { item: &zero }
  fill(&mut view, &k)
  return view.item.* - 4
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0019 | A borrowed value is used beyond the validity of its referent |
| SEM0051 | Wrong number of type or lifetime arguments |
| SEM0209 | An explicit lifetime names no binder in scope |
| SEM0210 | An omitted result lifetime has no unique input |
| SEM0211 | Invalid lifetime binder, such as a duplicate or `'static` |
| SEM0212 | A lifetime bound or type outlives bound does not hold, including a returned borrow of a local |
| SEM0220 | A `Drop` or `Copy` head names `'static`, repeats one lifetime, or bounds a lifetime |

SEM0213 (type does not remain valid for a lifetime) is in the catalog, but the compiler has no producer for it. Type outlives failures report SEM0212.

## See also

Borrowing · Ownership and moves · Generics · Interfaces and impls · Functions and methods · Closures and callable types · Effects and run · Typed failures · Services and providers
