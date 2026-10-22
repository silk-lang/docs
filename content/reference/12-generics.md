# Generics

Functions, structs, unions, interfaces and impls can take parameters: types, lifetimes and effect rows. Each use with concrete arguments produces a separate specialized instance.

## Syntax

```
GenericParameters = '<' GenericParameter (',' GenericParameter)* ','? '>'
GenericParameter  = Identifier (':' Bound ('+' Bound)*)?      (type parameter)
                  | Lifetime (':' Lifetime ('+' Lifetime)*)?  (lifetime parameter)
                  | '?' Identifier                            (row parameter)
Bound             = Type | Lifetime

TypeArguments     = '<' (Type | Lifetime) (',' (Type | Lifetime))* '>'
GenericCall       = Path TypeArguments? '(' Arguments? ')'
OwnerMember       = Path TypeArguments '.' Identifier TypeArguments?

WhereClause       = 'where' Constraint (',' Constraint)*
Constraint        = Type 'in' Type
                  | Type 'provides' Type 'from' Type

OpaqueResult      = '->' 'some' GenericParameters Type
ExactType         = 'typeof' '(' Path ')'
```

## Where parameters appear

- `fn name<T>(...)`, `struct Name<T> { ... }`, `union Name<T> { ... }`, `interface Name<T> { ... }`.
- `impl<T> Interface for Type<T> { ... }` and `impl<T> Type<T> { ... }`. See Interfaces and impls.
- An inherent `impl<T> Type<T>` must list exactly the owner's parameters, in order, and cannot bound them (SEM0194).
- Members of an inherent impl may add their own parameters: `fn map<U>(self: Self, u: U) -> Box<U>`.
- A parameter name may appear only once in a list (SEM0050). An interface cannot declare `Self` as a parameter, since `Self` is already bound there (SEM0050).
- Using a parameter of one kind where another kind is expected is SEM0088, for example `Box<'a>` for a type parameter.

## Type arguments and inference

- Type arguments are inferred from the value arguments: `swap(Pair { first: 1, second: true })`.
- Inference uses only the arguments. It never uses the expected result type. A parameter that occurs only in the result cannot be inferred (SEM0052).
- This holds for an owner's arguments too: `let l: List<i32> = List.make()` is SEM0052. Write `List<i32>.make()`.
- Explicit arguments come in `<...>` after the name: `identity<i32>(42)`.
- An explicit list may be a prefix; inference fills the rest: `pick<i32>(40, true)`.
- A parameter left undetermined by both the prefix and the arguments is SEM0099.
- Too many type arguments is SEM0051.
- An argument that contradicts an explicit type argument is reported as a type mismatch (SEM0012).
- A generic type's arguments go on the type: `Box<i32> { v: 1 }`, `Maybe<i32>.None`. They may be inferred in struct literals.
- A member that uses its owner's parameters takes the owner's arguments on the owner: `Box<bool>.map<i32>(...)`, not `Box.map<i32>(...)` (SEM0221).

## Bounds

- `T: Interface` requires a conformance of `T` to the interface. Bounds combine with `+`: `T: Add<T, T> + Order`.
- `T: 'a` requires `T` to stay valid for `'a`. `T: 'static` means `T` holds no borrows.
- `F: fn(i32) -> i32` bounds a parameter by a callable contract. See Closures and callable types.
- `T: Copy` uses the sealed property from `silk/ownership`. `Drop` is not usable as a bound.
- A generic body is checked once, against its bounds only. Using an operation the bounds don't provide is an error even before any call (SEM0135 for an operator).
- At each use, the compiler proves the bounds for the concrete arguments. A missing conformance is SEM0121.
- Bounds on a generic struct are checked wherever the struct type is named with arguments (SEM0121).

## Where clauses

- `where` follows the result and rows of a function. It holds membership and provider constraints. It does not hold `T: Bound`; write bounds inline.
- `where S in E` says failure type `S` is a member of failure union `E`. `where ?S in R` does the same for requirement rows. See Typed failures and Services and providers.
- `where P provides X from Y` relates a provider type to the service requirements it supplies. See Services and providers.

## Other parameter kinds

- Lifetime parameters: `fn first<'a, T>(items: &'a [T]) -> View<'a, T>`. See Lifetimes.
- Row parameters: `?R` stands for an effect requirement row, as in `effect fn twice<?R>(step: Effect<'static; i32 ? R>) -> i32 ? R`. See Services and providers.
- Static value parameters are ordinary parameters marked `static`, as in `fn pick(static table: [i32; 3], index: usize)`. They are not in the `<...>` list. See Static evaluation.

## Specialization

- Each distinct set of concrete arguments gives a separate instance, compiled separately. There is no runtime dispatch.
- A conformance witness is selected per instance.
- Recursion must keep the same type arguments. A recursive call that changes them, as in `expand<[T; 1]>` from `expand<T>`, would need infinitely many instances and is rejected (SEM0053).

## Opaque results

- `-> some<F: Bound> F` hides the exact result type behind a bound. The caller sees only the bound.
- The bound must be a callable contract or an Effect (SEM0116).
- Every reachable return must produce the same construction (SEM0113). Two different functions or literals don't unify.

## Exact types

- `typeof(name)` is the exact type of the function `name`. It is usable as a result type.
- The name must resolve to one ordinary function in scope (SEM0108, SEM0109, SEM0110).
- A generic function's parameters must all be supplied (SEM0111).
- `typeof(id<i32>)` names the instantiation of a generic function. Where that type is expected, the plain name `id` is instantiated from it: as an argument (`apply(id, 5)`), a return value (`return id`) or an annotated initializer (`let f: typeof(id<i32>) = id`).
- A different function there is a type error: SEM0012 as an argument, SEM0129 as a return value, SEM0037 as an initializer.
- `id<i32>` is not a value expression. `return id<i32>` is a parse error (PAR0002).

## Examples

```silk
struct Pair<A, B> { first: A second: B }

union Maybe<T> {
  None,
  Some { value: T },
}

fn swap<A, B>(pair: Pair<A, B>) -> Pair<B, A> {
  return Pair { first: move pair.second, second: move pair.first }
}

fn pick<A, B>(left: A, right: B) -> A { return move left }

fn orElse<T>(maybe: Maybe<T>, fallback: T) -> T {
  return match move maybe {
    Maybe<T>.Some { value } => move value
    Maybe<T>.None => move fallback
  }
}

pub fn main() -> i32 {
  let swapped = swap(Pair { first: 1, second: true })
  if !swapped.first || swapped.second != 1 { return 1 }
  if pick<i32>(40, false) != 40 { return 2 }
  if orElse(Maybe<i32>.Some { value: 42 }, 0) != 42 { return 3 }
  if orElse(Maybe<i32>.None, 7) != 7 { return 4 }
  return 0
}
```

```silk
import silk.ops { Add }
import silk.order { Order }

struct Meters { value: i32 }

fn addMeters(left: Meters, right: Meters) -> Meters {
  return Meters { value: left.value + right.value }
}

impl Add<Meters, Meters> for Meters { add: addMeters }

fn larger<T: Order>(left: T, right: T) -> T {
  if (&left) < (&right) { return move right }
  return move left
}

fn sumLarger<T: Add<T, T> + Order>(a: T, b: T, c: T) -> T {
  return larger(move a, move b) + move c
}

fn add(value: i32, amount: i32) -> i32 { return value + amount }

fn adder(amount: i32) -> some<F: fn<'static>(i32) -> i32> F { return add(amount) }

fn exactAdd() -> typeof(add) { return add }

pub fn main() -> i32 {
  if sumLarger(3, 9, 1) != 10 { return 1 }
  let total = Meters { value: 40 } + Meters { value: 2 }
  if total.value != 42 { return 2 }
  if adder(40)(2) != 42 { return 3 }
  if exactAdd()(40, 2) != 42 { return 4 }
  return 0
}
```

```silk
fn id<T>(value: T) -> T { return move value }

fn apply(f: typeof(id<i32>), value: i32) -> i32 { return f(value) }

fn pick() -> typeof(id<i32>) { return id }

pub fn main() -> i32 {
  if apply(id, 5) != 5 { return 1 }
  if pick()(7) != 7 { return 2 }
  let f: typeof(id<i32>) = id
  if f(9) != 9 { return 3 }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0012 | Value argument contradicts an explicit type argument |
| SEM0037 | Initializer is a different function than the `typeof` annotation names |
| SEM0050 | Duplicate type parameter |
| SEM0051 | Wrong number of type arguments |
| SEM0052 | Cannot infer all type arguments from the supplied values |
| SEM0053 | Recursive call changes the type arguments (polymorphic recursion) |
| SEM0088 | Generic parameter used where a different kind is expected |
| SEM0099 | A type parameter is left undetermined by the explicit prefix and the arguments |
| SEM0108 | `typeof` names nothing in scope |
| SEM0109 | `typeof` name is ambiguous |
| SEM0110 | `typeof` names something other than an ordinary function |
| SEM0111 | `typeof` names a generic function without all its arguments |
| SEM0113 | Opaque result has more than one realization |
| SEM0116 | Opaque result bound is not a callable or Effect |
| SEM0129 | Returned function differs from the `typeof` result type |
| SEM0121 | Bound cannot be proved for the concrete arguments |
| SEM0135 | Operator not available for the operand types |
| SEM0194 | Inherent impl head is not exactly the owner's parameters |
| SEM0221 | Owner type arguments placed on the member instead of the owner |

## See also

Interfaces and impls · Closures and callable types · Functions and methods · Lifetimes · Structs, tuples and arrays · Enums and unions · Static evaluation · Effects and run · Typed failures · Services and providers · `silk/ops`, `silk/order`, `silk/ownership`

## Open questions

- SEM0100 (explicit type argument contradicts the arguments) exists in the catalog, but a contradiction such as `id<i32>(true)` is reported as SEM0012 ("Expected i32 but received bool").
