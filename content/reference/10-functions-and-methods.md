# Functions and methods

A function is a named, module-level callable declared with `fn`. A method is a function declared in an inherent `impl` block and called through its owner type or a value of it.

## Syntax

```
FunctionDecl    = 'pub'? 'test'? 'static'? 'unsafe'? ( 'effect' Environment? )? 'fn' Identifier
                  GenericParameters? '(' Parameters? ')' ( '->' Type )? WhereClause? Block
Parameters      = Parameter ( ',' Parameter )* ','?
Parameter       = ( 'mut' | 'static' )? Identifier ':' Type

InherentImpl    = 'impl' GenericParameters? Type '{' FunctionDecl* '}'

Call            = Expression TypeArguments? '(' Arguments? ')'
MethodCall      = Expression '.' Identifier TypeArguments? '(' Arguments? ')'
QualifiedCall   = TypePath TypeArguments? '.' Identifier '(' Arguments? ')'
```

- Failure and requirement rows (`! E`, `? R`) and `extern`/`export` forms also attach to function headers. They are covered in Typed failures, Services and providers, and Unsafe code and C interop.

## Declarations

- Functions are declared at module level. Declaration order does not matter: a function may call one declared later.
- `pub` makes a function visible to other modules. Calling a private function of another module is SEM0015.
- Parameter names must be distinct (SEM0005). A trailing comma is allowed.
- Parameters are immutable. `mut name: T` makes the parameter assignable inside the body. Assigning to a parameter without `mut` is SEM0035.
- A parameter may carry a `///` doc comment.

## Results and return

- `-> T` declares the result type. Without it, the result is `()`.
- `return e` leaves the function with `e`. `return` alone returns `()`.
- A body that can reach its end returns `()` implicitly. This is valid only when the result is `()`. Otherwise it is SEM0130.
- A returned value that does not match the result type is SEM0129.
- Functions may be directly or mutually recursive.

## Calls

- `f(a, b)` calls `f`. Arguments must match the parameter types (SEM0012).
- More arguments than parameters is SEM0007.
- Fewer arguments than parameters produces a partially applied callable: `let inc = add(1)`. See Closures and callable types.
- Arguments are passed by value. A non-Copy argument needs `move`. See Ownership and moves.
- Generic functions take type arguments explicitly (`id<i32>(0)`) or infer them from the arguments. See Generics.

## Inherent impl blocks

- `impl Type { … }` adds associated functions to a struct, union or enum declared in the same module.
- The head must name the whole type family: `impl<T> Maybe<T>`, not `impl Maybe<i32>`. Built-in types such as `i32` cannot take inherent impls. Both are SEM0194.
- Inside the block, `Self` names the owner type with its parameters.
- Each member name may appear once per owner (SEM0196).
- A member may not share its name with a field of the owner (SEM0195: "Point.x collides with the field x of Point"). An inherent member may not be named `drop` either; declare `impl Drop for Point` (SEM0195). Mapping a member to another declaration, `origin: make`, works only in a conformance (SEM0195).
- `pub` on a member makes it callable from other modules. A private member is SEM0015 there.

## Receivers

- A member whose first parameter has type `Self`, `&Self` or `&mut Self` (or the owner type spelled out) is a method. That parameter is the receiver.
- `self` is an ordinary name, not a keyword. `fn read(this: &Self)` declares a method too.
- `self: Self` takes the receiver by value. `self: &Self` borrows it shared. `self: &mut Self` borrows it exclusively.
- A member with no receiver is an associated function. Call it as `Type.name(…)`. Calling it on a value is SEM0198.

## Method calls

- `value.method(args)` calls a method with `value` as the receiver. `Type.method(receiver, args)` is the same call with the receiver written explicitly.
- A receiver call borrows automatically. For a `&Self` receiver, `c.read()` stands for `Type.read(&c)`. For `&mut Self`, `c.bump()` stands for `Type.bump(&mut c)` and requires `c` to be `mut` (SEM0057).
- A receiver that is already a reference is reborrowed. A `&mut Self` method through a shared reference is SEM0058.
- A by-value receiver moves an owned place without a written `move`. Using it afterwards is OWN0001. A Copy receiver is copied.
- A temporary receiver works too: `Counter { value: 2 }.take()` and chains such as `Option<i32>.some(4).map(f).unwrapOr(0)`.
- A struct field that holds a callable is called with the same spelling: `runner.apply(2)`.
- Methods supplied by interfaces are also called with the receiver spelling. See Interfaces and impls.
- `x |> Type.method(args)` passes `x` as the first argument. See Expressions and operators.

## Function and method values

- A function name without a call is a value: `let f = add`. Each function has its own type, written `typeof(add)`.
- Two distinct functions have distinct types, even with the same signature. A `fn(A) -> R` bound or local annotation accepts any of them: `let f: fn(i32) -> i32 = inc`. See Closures and callable types.
- `Type.method` without a call is the method as a function value. Its first parameter is the receiver.
- `value.method` without a call is a bound method value. It captures the receiver and takes the remaining arguments: `let read = c.read` then `read()`.
- Binding a by-value method moves the receiver at that point. Calling a bound `&mut Self` method needs a `mut` binding (SEM0077).

## Function modifiers

- `effect fn` declares an effectful function, run with `run`. See Effects and run.
- `static fn` declares a function evaluated at compile time. See Static evaluation.
- `unsafe fn` declares a function callable only under an `unsafe` acknowledgement (`unsafe f()`). See Unsafe code and C interop.
- `test fn` declares a test entry. It must be module-level, non-generic, take no parameters and return `()` (SEM0218).
- `pub fn main() -> i32` is the program entry. See Program entry and termination.

## Examples

```silk
pub struct Counter {
  value: i32,
}

impl Counter {
  pub fn zero() -> Self {
    return Counter { value: 0 }
  }

  pub fn read(self: &Self) -> i32 {
    return self.value
  }

  pub fn bump(self: &mut Self) -> () {
    self.value = self.value + 1
  }

  pub fn take(self: Self) -> i32 {
    return self.value
  }
}

pub fn main() -> i32 {
  let mut c = Counter.zero()
  c.bump()
  Counter.bump(&mut c)
  if c.read() != 2 || Counter.read(&c) != 2 {
    return 1
  }
  let read = c.read
  if read() != 2 {
    return 2
  }
  let last = c.take()
  if last != 2 {
    return 3
  }
  if (Counter { value: 5 }).take() != 5 {
    return 4
  }
  return 0
}
```

```silk
fn countdown(mut n: i32) -> i32 {
  let mut steps = 0
  while n > 0 {
    n = n - 1
    steps = steps + 1
  }
  return steps
}

fn even(n: i32) -> bool {
  if n == 0 {
    return true
  }
  return odd(n - 1)
}

fn odd(n: i32) -> bool {
  if n == 0 {
    return false
  }
  return even(n - 1)
}

fn log(flag: bool) {
  if flag {
    return
  }
}

fn add(a: i32, b: i32) -> i32 {
  return a + b
}

fn pick() -> typeof (add) {
  return add
}

pub fn main() -> i32 {
  log(true)
  if countdown(4) != 4 {
    return 1
  }
  if !even(10) || odd(10) {
    return 2
  }
  let f = pick()
  if f(1, 2) != 3 {
    return 3
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0001 | Value used after a by-value receiver moved it |
| SEM0005 | Duplicate parameter name |
| SEM0007 | Too many arguments |
| SEM0012 | Argument type does not match the parameter |
| SEM0015 | Private function or member of another module |
| SEM0035 | Assignment to a parameter not declared `mut` |
| SEM0057 | `&mut Self` method called on a binding that is not `mut` |
| SEM0058 | `&mut Self` method called through a shared reference |
| SEM0077 | Bound `&mut Self` method called through a binding that is not `mut` |
| SEM0129 | Returned value does not match the result type |
| SEM0130 | Non-unit function can reach its end |
| SEM0194 | Inherent impl head is not a whole module-local type family |
| SEM0195 | Inherent member cannot be an associated member, for example it shares a field's name |
| SEM0196 | Two members of one owner share a name |
| SEM0198 | Associated function called on a value |
| SEM0218 | Invalid `test fn` declaration |

## See also

Closures and callable types · Generics · Interfaces and impls · Ownership and moves · Borrowing · Program entry and termination · Unsafe code and C interop · Effects and run · Typed failures · Services and providers · Static evaluation

## Open questions

- `impl<F: fn(i32) -> i32> Runner<F>` is SEM0194 even when the struct declares the same bound. `impl<F> Runner<F>` is accepted.
- SEM0143 (`mut` on a parameter without owned storage) applies to interface and service operations. It is not covered here.
