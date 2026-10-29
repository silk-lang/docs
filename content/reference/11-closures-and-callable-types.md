# Closures and callable types

A callable is a value you can call. Silk has four sources of callables: function literals, named functions used as values, staged calls that supply only some arguments, and bound methods. This page also covers callable types, which state how a callable may be invoked and how long its captured environment lives.

## Syntax

```
FunctionLiteral = 'effect'? 'fn' '(' Parameters? ')' '->' Type FailureRow? RequirementRow? Block
Parameters      = Parameter (',' Parameter)* ','?
Parameter       = 'mut'? Identifier ':' Type

CallableType    = HigherRanked? Qualifiers 'fn' Environment? '(' (Type (',' Type)*)? ')' '->' Type
HigherRanked    = 'for' '<' Binder (',' Binder)* '>'
Binder          = Lifetime | 'use' Lifetime
Qualifiers      = ('extern' TextLiteral)? 'unsafe'? 'mut'? 'once'?
Environment     = '<' Lifetime '>'

StagedCall      = Expression '(' Arguments? ')'      (fewer arguments than parameters)
BoundMethod     = Expression '.' Identifier          (not followed by '(')
```

## Function literals

- `fn(x: i32) -> i32 { return x + 1 }` is an expression that builds a callable.
- Every parameter needs a type. The `-> T` result is required, even for `()`.
- The body is an ordinary block. It may refer to locals of the enclosing function; those are its captures.
- Each literal and each named function has its own distinct type. Two different callables cannot be assigned to one binding, even with the same signature (SEM0037).
- A literal may be nested inside another literal.
- `effect fn(...) -> T { ... }` builds a callable that returns an Effect instead of running its body. See Effects and run.

## Capture modes

The compiler picks one capture mode per outer binding from how the body uses it. There is no capture list.

| Mode | Chosen when the body | Effect on the outer binding |
| --- | --- | --- |
| Copy | only reads a binding whose type is `Copy` | A snapshot is taken at construction. Later writes outside are not seen. |
| Shared | only reads a non-`Copy` binding | A shared loan lasts while the callable is live. |
| Mutable | assigns to it or a field of it, takes `&mut` of it, passes it where `&mut` is expected, or calls it as a `mut fn` | An exclusive loan lasts while the callable is live. |
| Move | moves it with `move`, drops it with `drop`, matches it by value, or calls it as a `once fn` | The binding is moved into the callable at construction. |

- The strongest use wins: Move over Mutable over Shared over Copy.
- `move x` of a `Copy` binding is still a Copy capture.
- Moving a non-`Copy` capture needs an explicit `move` (OWN0003). Moving a field out of a captured or temporary aggregate is an error (OWN0003, OWN0002).
- A Move capture happens when the literal is built, even if the callable is never called. Using the binding afterwards is OWN0001.
- While a Shared or Mutable capture is live, conflicting access to the outer binding is OWN0011. The loan ends after the callable's last use or at `drop`.

## Invocation modes

A callable's invocation mode follows from its captures:

- `fn`: only Copy and Shared captures. It can be called any number of times through a shared binding, and it is copied when passed.
- `mut fn`: at least one Mutable capture. Calling it needs a `let mut` binding or a `mut` parameter (SEM0077). Passing the binding to a `mut fn` or `once fn` parameter lends it for that call, so it stays usable afterwards. Passing it to a type parameter such as `F: mut fn(i32) -> i32`, or binding it to another name, needs `move`.
- `once fn`: at least one Move capture. It can be called once; a second call is OWN0001. Passing it needs `move`.
- A parameter of type `mut fn` accepts a `fn`. A parameter of type `once fn` accepts a `fn` or `mut fn`. The reverse is SEM0076 at the argument, naming both modes, as in "Callable value with mode `once` cannot satisfy a parameter with mode `mut`, which may call it more than once".

## Callable types

- `fn(A, B) -> R` describes a callable taking `A` and `B` and returning `R`. `mut` and `once` prefixes select the invocation mode above.
- Callable types appear as parameter types, as result types, and as bounds on type parameters: `F: fn(i32) -> i32`.
- A callable parameter type is implicitly generic: each distinct argument callable gets its own instance. Passing a callable whose signature does not match is reported as SEM0052 at the call. A mismatch against a type-parameter bound is SEM0076.
- A callable parameter may be wider than the type asks for. When it is a closed structural union that holds every member the type passes, the callable fits: `fn score(pet: Cat | Dog) -> i32` is accepted where `fn(Cat) -> i32` is expected, and each call widens its argument into the union. The same holds for a union argument such as `A | B` into `A | B | C`, and for `Effect.catch` and `Effect.catchAll` handlers. A parameter that lacks a member is still a mismatch.
- A local binding may be annotated with a callable type: `let f: fn(i32) -> i32 = inc`. The initializer may be a named function or a literal whose parameters, result and environment lifetime match. A mismatch is SEM0037.
- The initializer's invocation mode must be at least as strong as the written one. A `fn` fits `mut fn` and `once fn`, and a `mut fn` fits `once fn`. A `mut fn` for `fn`, or a `once fn` for `mut fn`, is SEM0037.
- `fn<'static>` in an annotation rejects a literal that borrows a local (SEM0037).
- The annotation checks the initializer but does not erase its type. Assigning a different function to the binding later is still SEM0037.
- The binding keeps the callable's own invocation mode. A `fn` annotated `once fn` can be called twice. A `mut fn` annotated `once fn` still needs a `let mut` binding (SEM0077).
- A struct may declare a field of bare callable type, such as `struct H { f: fn(i32) -> i32 }`, but constructing a value of it is not supported. Make the struct generic: `struct Holder<F: fn<'static>(i32) -> i32> { step: F }`.
- Calling a `mut fn` stored in a field needs `&mut` access to the whole aggregate (OWN0014). A `fn` field can be called through `&`.
- `unsafe fn(A) -> R` is a callable that must be called inside `unsafe` (SEM0082). See Unsafe code and C interop.
- `extern "C" fn(A) -> R` is a C function pointer type, used for foreign callbacks. `?extern "C" fn(A) -> R` is one that may be null; it is tested and refined before a call. See Unsafe code and C interop.

## Environment lifetime

- `fn<'env>(A) -> R` says the captured environment stays valid for `'env`. `fn<'static>` holds no borrows.
- When omitted, the environment lifetime is elided like a reference lifetime. A result `fn(...)` with no reference input to tie it to is SEM0210.
- A callable that borrows a local of the returning function cannot be returned (OWN0018). Move the value in instead and return a `once fn<'static>`.
- `for<'a> fn(&'a T) -> &'a U` is higher-ranked: the callable must work for every `'a` chosen at each call.
- `for<use 'call> ...` binds a lifetime that is fresh for each invocation; it appears in `silk/core/effect`. See Lifetimes.

## Returning callables

- A function may return a literal, a named function, a staged call or a bound method.
- `-> fn<'static>(i32) -> i32` returns a callable that owns or copies all it captured.
- `-> some<F: fn<'static>(i32) -> i32> F` returns an opaque callable. Every return must produce the same construction (SEM0113). See Generics.
- `-> typeof(name)` returns the exact type of the named function `name`. See Generics.

## Staged calls

- Calling a function with fewer arguments than parameters builds a callable for the rest.
- The supplied arguments fill the *trailing* parameters, in order. The remaining leading parameters become the new callable's parameters.
- With `fn combine(a: i32, b: i32, c: i32)`, `combine(3)` binds `c = 3`, and `combine(3)(2)(1)` computes `combine(1, 2, 3)`.
- `combine(2, 3)` binds `b = 2, c = 3`, leaving `a`.
- Staged arguments are captured by value. A non-`Copy` argument needs `move` (OWN0003); a borrow such as `&values` keeps its loan in the callable.
- This pairs with `|>`: `x |> f(a)` calls `f(x, a)`. See Expressions and operators.
- Calling a function with parameters and no arguments is SEM0078. Name the function directly to use it as a value.
- Too many arguments is SEM0007.

## Bound methods

- `value.method` without parentheses builds a callable with the receiver already supplied.
- The receiver's access picks the mode: `self: &Self` gives `fn`, `self: &mut Self` gives `mut fn` and holds an exclusive loan, `self: Self` gives `once fn` and consumes the value.
- Only inherent methods can be taken as values. A member supplied by an interface must be called.

## Examples

```silk
struct Token {
  value: i32,
}

fn consume(token: Token) -> i32 {
  return token.value
}

fn callTwice(mut step: mut fn() -> i32) -> i32 {
  return step() + step()
}

fn callOnce(step: once fn() -> i32) -> i32 {
  return step()
}

pub fn main() -> i32 {
  let offset = 2
  let shared = Token { value: 10 }
  let mut counter = 0
  let owned = Token { value: 17 }

  let add = fn(x: i32) -> i32 {
    return x + offset
  }
  let read = fn() -> i32 {
    return shared.value
  }
  let mut bump = fn() -> i32 {
    counter = counter + 1
    return counter
  }
  let take = fn() -> i32 {
    return consume(move owned)
  }

  if add(40) != 42 || read() != 10 {
    return 1
  }
  if callTwice(move bump) != 3 {
    return 2
  }
  if counter != 2 {
    return 3
  }
  if callOnce(move take) != 17 {
    return 4
  }
  return 0
}
```

```silk
fn combine(a: i32, b: i32, c: i32) -> i32 {
  return a * 100 + b * 10 + c
}

fn apply(f: fn(i32) -> i32, x: i32) -> i32 {
  return f(x)
}

fn adder(n: i32) -> fn<'static>(i32) -> i32 {
  return fn(x: i32) -> i32 {
    return x + n
  }
}

pub fn main() -> i32 {
  let lastTwo = combine(2, 3)
  if lastTwo(1) != 123 {
    return 1
  }
  if combine(3)(2)(1) != 123 {
    return 2
  }
  if (1 |> combine(2, 3)) != 123 {
    return 3
  }
  if apply(adder(40), 2) != 42 {
    return 4
  }
  let step: fn(i32) -> i32 = combine(0, 0)
  if apply(step, 1) != 100 {
    return 5
  }
  return 0
}
```

```silk
pub struct Counter {
  value: i32,
}

impl Counter {
  pub fn read(self: &Self) -> i32 {
    return self.value
  }

  pub fn bump(self: &mut Self) -> i32 {
    self.value = self.value + 1
    return self.value
  }
}

struct Holder<F: mut fn<'static>() -> i32> {
  step: F,
}

fn drive<F: mut fn<'static>() -> i32>(holder: &mut Holder<F>) -> i32 {
  return holder.step() + holder.step()
}

pub fn main() -> i32 {
  let shared = Counter { value: 10 }
  let read = shared.read
  let mut exclusive = Counter { value: 0 }
  let mut bump = exclusive.bump
  if read() != 10 || bump() != 1 || bump() != 2 {
    return 1
  }
  drop bump
  if exclusive.value != 2 {
    return 2
  }
  let mut holder = Holder {
    step: fn() -> i32 {
      return 5
    }
  }
  if drive(&mut holder) != 10 {
    return 3
  }
  return 0
}
```

A callable whose parameter is a wider union than the use passes:

```silk
struct Cat { lives: i32 }
struct Dog { tricks: i32 }

fn score(pet: Cat | Dog) -> i32 {
  return match move pet {
    Cat { lives } => lives
    Dog { tricks } => tricks * 10
  }
}

fn judge(f: fn(Cat) -> i32) -> i32 {
  return f(Cat { lives: 9 })
}

pub fn main() -> i32 {
  // `score` takes `Cat | Dog`, which holds every member of `Cat`.
  if judge(score) != 9 {
    return 1
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0001 | Use of a binding after it was moved, including into a callable, or a second call of a `once fn` |
| OWN0002 | Moving a field out of a temporary inside a callable body |
| OWN0003 | Moving a non-`Copy` capture or staged argument without `move` |
| OWN0011 | Access to an outer binding conflicts with a callable's live capture loan |
| OWN0014 | Stored callable invoked through too weak access to its aggregate |
| OWN0018 | Returned callable borrows storage owned by the returning function |
| OWN0019 | A borrow kept by a callable is used after its referent ends |
| SEM0007 | Too many arguments |
| SEM0037 | Assigning a callable of a different type, or an initializer that does not match a callable annotation |
| SEM0052 | Argument callable does not match a callable parameter type |
| SEM0075 | Calling a value that is not callable |
| SEM0076 | Callable does not satisfy a callable bound, or its mode is weaker than the parameter's |
| SEM0077 | Calling a `mut fn` through an immutable binding |
| SEM0078 | Calling a function that has parameters with no arguments |
| SEM0082 | Calling an `unsafe fn` value outside `unsafe` |
| SEM0210 | Callable result environment lifetime cannot be elided |

## See also

Functions and methods · Generics · Ownership and moves · Borrowing · Lifetimes · Unsafe code and C interop · Expressions and operators · Effects and run · Typed failures · Services and providers

## Open questions

- The declaration `struct H { f: fn(i32) -> i32 }` checks and builds, but constructing it, as in `H { f: inc }` or with a callable literal, prints "unsupported: this construct is not supported by the native compiler yet" rather than SEM0103.
- A mismatched callable argument to a `fn(...)` parameter reports SEM0052 ("A generic call whose type arguments its values do not determine"), not SEM0076.
