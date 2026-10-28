# Effects and run

An effect is a lazy computation value. Calling an `effect fn`, or writing an `effect { ... }` block, builds an `Effect` value without running any of its body; `run` executes it and yields its success value.

## Syntax

```
EffectFunction   = 'pub'? 'unsafe'? 'effect' Environment? 'fn' Identifier GenericParameters?
                   '(' Parameters? ')' ( '->' ResultType )? FailureRow? RequirementRow?
                   WhereClause? Block
Environment      = '<' Lifetime ( '&' Lifetime )* '>'

EffectBlock      = 'effect' Block
EffectFnLiteral  = 'effect' 'fn' '(' Parameters? ')' '->' Type FailureRow? RequirementRow? Block
RunExpression    = 'run' Expression

EffectType       = ( 'once' | 'mut' )? 'Effect' '<' ( Lifetime ( '&' Lifetime )* ';' )?
                   Type FailureRow? RequirementRow? '>'
FailureRow       = '!' Type ( '|' Type )*
RequirementRow   = '?' Requirement ( '|' Requirement )*

ResultType       = Type | OpaqueResult
OpaqueResult     = 'some' '<' Identifier ':' Type '>' Type
```

- `FailureRow` is covered in Typed failures. `RequirementRow` and providers are covered in Services and providers.
- In a type, `;` separates the environment lifetimes from the success type.

## Effect functions

- `effect fn` declares a function whose call returns an `Effect` instead of running the body.
- `effect fn f(...) -> A ! E ? R` has type `fn(...) -> Effect<'env; A ! E ? R>`. It can be passed where such a callable is expected.
- The arguments are evaluated when the effect is built, not when it runs.
- Without `-> A` the success type is `()`. Without `! E` the effect cannot fail. Without `? R` it has no requirements.
- Only an `effect fn` may declare a failure row (SEM0062) or contain `fail` (SEM0063). See Typed failures.
- An `effect fn` may be generic, a method in an `impl` block, or a service operation. See Functions and methods and Services and providers.
- Calling an `effect fn` without using the result is SEM0087: the Effect value would be discarded unrun. Use `run`, store it, or `drop` it.

## Running effects

- `run e` executes the Effect `e` and evaluates to its success value. Applying `run` to a non-Effect value is SEM0065.
- `run` may appear in any function body, including an ordinary `fn`.
- Each failure of `e` must be declared by the enclosing `effect fn` or handled first. Otherwise it is SEM0066. See Typed failures.
- Each requirement of `e` must be declared by the enclosing `effect fn` or provided first. Otherwise it is SEM0071. See Services and providers.
- In an ordinary `fn`, `run` therefore needs an Effect with no failures and no requirements left.
- `run`'s operand extends over binary operators and pipelines. `run a + b` means `run (a + b)`; write `(run a) + (run b)`.
- `run load() |> Effect.map(f)` builds the whole pipeline first and runs the result.
- `run run outer()` runs an Effect whose success value is another Effect, then runs that one.
- A `run` whose success value is not `()` or `never` cannot stand alone as a statement (SEM0087). Discard it with `drop run e`.

## Effect blocks and literals

- `effect { ... }` is an expression of type `Effect`. Its body runs only when the Effect runs.
- Inside the block, `return v` completes the effect with `v`. A body that reaches its end completes with `()`.
- The block's success type is the union of its return value types. `return 1` and `return false` give `i32 | bool`.
- The failure row is the union of the block's `fail` payloads and the failures of its `run`s. The requirement row is inferred the same way.
- The block captures the locals it uses. Reading a local borrows it while the Effect is alive. `move x` inside the block moves `x` into the Effect at construction.
- Assigning to a local that a live effect block borrows is OWN0011, even if the Effect never runs.
- `effect fn(params) -> T ! E ? R { ... }` is an anonymous effect function. Calling it returns an Effect. Its success type is mandatory.

## The Effect type

- `Effect<'env; A ! E ? R>` is the built-in type of effects: success type `A`, failure row `E`, requirement row `R`.
- It needs no import. `import silk.core.effect { Effect }` imports the unrelated struct `Effect` that owns the combinators, such as `Effect.map`.
- `'env` bounds every borrow the Effect holds. `'a & 'b` lists several lifetimes. `'static` means the Effect holds no borrows.
- The environment may be omitted: `Effect<i32>`. It is then elided like a reference lifetime. See Lifetimes.
- `! E` and `? R` are optional. Without them the Effect cannot fail or needs nothing.
- An Effect that borrows a local cannot be returned from the function that owns the local (OWN0018).
- Returning an Effect whose environment is shorter than the declared one is SEM0129.
- A function with result `Effect<...>` may return different Effects on different paths, such as calls of two different effect functions.

## Effect modes and once effects

- Like callables, Effects have three invocation modes, set by what they capture. See Closures and callable types.

| Type | Captures | Running it |
| --- | --- | --- |
| `Effect<...>` | Copy values and shared borrows | Any number of times through a shared binding |
| `mut Effect<...>` | At least one `&mut` borrow | Any number of times; the binding must be `mut` (SEM0077) |
| `once Effect<...>` | At least one owned non-Copy value | At most once; a second `run` is OWN0001 |

- `run` consumes a `once` Effect. `run move e` is the same.
- A parameter of type `once Effect` accepts all three modes. A `mut Effect` parameter accepts `Effect` and `mut Effect`.
- A `once` Effect passed where `Effect` or `mut Effect` is expected, or a `mut` Effect passed where `Effect` is expected, is SEM0076 at the argument. The message names both modes: "Callable value with mode `mut` cannot satisfy a parameter with mode shared (no `mut` or `once`), which may call it through a shared borrow".
- Passing a stored `once` Effect needs `move` (OWN0003).
- Dropping an unrun Effect drops the values it captured.
- Running a stored Effect field needs enough access to the whole aggregate: a `mut Effect` field needs `&mut` (OWN0015).

## Storing and passing effects

- Effects are ordinary values: bind them with `let`, pass them as arguments, return them and pass them through pipelines.
- A struct stores an Effect through a type parameter bounded by an Effect type: `struct Job<F: once Effect<'static; i32>> { work: F }`.
- A struct field declared with the `Effect<...>` type itself can be declared but not used: running or constructing it is reported as unsupported.
- A generic function can abstract over rows. Failure rows are type parameters (`E`); requirement rows are row parameters (`?R`):

```
effect fn twice<'env, E, ?R>(step: Effect<'env; i32 ! E ? R>) -> i32 ! E ? R
```

## Opaque effect results

- `-> some<F: Effect<'env; A ! E ? R>> F` returns one concrete Effect type without naming it. Callers see only the bound.
- The bound must be an Effect or callable type (SEM0116).
- Every return site of one function must produce the same concrete Effect. Returning calls of two different effect functions is SEM0113.

## Effect environments

- `effect<'env> fn` names the environment lifetime of the Effect a call returns. `'env` must also appear in the generic list.
- Without it, the Effect retains the regions of its inputs, or `'static` when it borrows nothing.
- A generic effect function that takes a value of a type parameter may leave the environment implicit: `effect fn keep<A>(value: A) -> A` checks as if written `effect<'env> fn keep<A: 'env, 'env>(value: A) -> A`.

## Effect main

- `pub effect fn main()` is an entry point. A failure that escapes it ends the program with status 1. See Program entry and termination.
- Failure types in the row of a `pub` function must be public (SEM0019).

## Combinators

- The struct `Effect` in `silk/core/effect` holds the combinators. They are lazy: each returns a new Effect and runs nothing.
- Most take the input as `once Effect`, so each composed Effect runs its parts at most once.

| Member | Behavior |
| --- | --- |
| `Effect.of(value)` | Effect that succeeds with `value` |
| `Effect.map(e, f)` | Applies plain `f` to the success value |
| `Effect.flatMap(e, f)` | Runs `e`, then the Effect `f` returns; rows are joined |
| `Effect.flatten(e)` | Runs `e`, then the Effect it produced |
| `Effect.tap(e, f)` | Like `flatMap`, but `f` must return an Effect of the same success type |
| `Effect.zip(a, b)`, `Effect.zip3(a, b, c)` | Runs left to right and collects the values in `Pair` or `Triple` (fields `first`, `second`, `third`) |
| `Effect.ifThenElse(c, onTrue, onFalse)` | Builds and runs only the selected branch; the branches are `once fn() -> Effect` |
| `Effect.suspend(e)` | Runs `e` through the stack-safe executor; see Suspension and cancellation |
| `Effect.sleep(ns)` | Waits on the `MonotonicClock` service; see Fibers and scheduling |
| `Effect.provide`, `Effect.provideMut`, `Effect.provideEffect` | Supply a requirement; see Services and providers |
| `Effect.log`, `Effect.logAt`, `Effect.logInfo`, and so on | Log through the `Logger` service |

- Recovery and cleanup combinators (`catch`, `catchAll`, `mapError`, `mapBoth`, `result`, `retry`, `ensuring`) are covered in Typed failures.
- Composing two Effects joins their rows: `! E | F` and `? R | S`.

## Examples

Building is lazy and arguments are evaluated at the call; an Effect without captures can run many times:

```silk
fn inc(counter: &mut i32) -> i32 {
  counter.* = counter.* + 1
  return counter.*
}

effect fn keep(value: i32) -> i32 {
  return value
}

effect fn bump(counter: &mut i32) {
  counter.* = counter.* + 1
}

pub fn main() -> i32 {
  let mut calls = 0
  let pending = keep(inc(&mut calls))
  if calls != 1 {
    return 1
  }
  let a = run pending
  let b = run pending
  if calls != 1 || a + b != 2 {
    return 2
  }

  let mut n = 0
  let mut step = bump(&mut n)
  run step
  run step
  drop step
  if n != 2 {
    return 3
  }
  return 0
}
```

Effect blocks, an anonymous effect function, an opaque result and a stored Effect:

```silk
import silk.core.effect { Effect }

struct Token {
  value: i32,
}

struct Oops {
  code: i32,
}

struct Job<F: once Effect<'static; i32>> {
  work: F,
}

effect fn take(token: Token) -> i32 {
  return token.value
}

fn make(value: i32) -> some<F: Effect<'static; i32>> F {
  return effect {
    return value * 2
  }
}

pub fn main() -> i32 {
  let base = 40
  let add = effect {
    return base + 2
  }
  let failing = effect {
    if base > 0 {
      fail Oops { code: 1 }
    }
    return 0
  }
  let recover = effect fn(error: Oops) -> i32 {
    return error.code
  }
  let job = Job { work: take(Token { value: 3 }) }

  let a = run add
  let b = run Effect.catchAll(failing, recover)
  let c = run make(2)
  let d = run job.work
  return a + b + c + d - 50
}
```

A generic effect function over failure and requirement rows:

```silk
import silk.core.effect { Effect }

struct Problem {
  code: i32,
}

effect fn twice<'env, E, ? R>(step: Effect<'env; i32 ! E ? R>) -> i32
  ! E
  ? R {
  let a = run step
  let b = run step
  return a + b
}

effect fn ten(ok: bool) -> i32
  ! Problem {
  if !ok {
    fail Problem { code: 1 }
  }
  return 10
}

effect fn recover(problem: Problem) -> i32 {
  return problem.code
}

pub fn main() -> i32 {
  let good = run twice(ten(true)) |> Effect.catchAll(recover)
  let bad = run twice(ten(false)) |> Effect.catchAll(recover)
  return good + bad - 21
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0019 | A `pub` signature exposes a private type, such as a failure type |
| SEM0062 | Failure row on an ordinary `fn` |
| SEM0063 | `fail` outside an effect function |
| SEM0065 | `run` applied to a value that is not an Effect |
| SEM0066 | `run` leaves failures the enclosing signature does not declare |
| SEM0071 | `run` leaves requirements the enclosing signature does not provide |
| SEM0076 | An Effect passed where a parameter needs a stronger mode: `once` for `Effect` or `mut Effect`, `mut` for `Effect` |
| SEM0077 | Running a `mut` Effect through an immutable binding |
| SEM0087 | An unused Effect or non-unit `run` result as a statement |
| SEM0113 | An opaque result has more than one concrete realization |
| SEM0116 | An opaque result bound is not an Effect or callable type |
| SEM0129 | Returned Effect does not match the declared result, for example a shorter environment |
| SEM0210 | An omitted result or Effect environment lifetime has no unique input; name it |
| OWN0001 | A `once` Effect run or used after it was consumed |
| OWN0003 | Passing a stored `once` Effect without `move` |
| OWN0011 | Writing a local while a live Effect borrows it |
| OWN0015 | Running a stored Effect field through too weak an aggregate access |
| OWN0018 | Returning an Effect that borrows the returning function's locals |

## See also

Typed failures · Services and providers · Closures and callable types · Functions and methods · Lifetimes · Generics · Ownership and moves · Program entry and termination · Fibers and scheduling · Suspension and cancellation · `silk/core/effect`, `silk/core/result`

## Open questions

- Catalog codes SEM0068 (mutable effect recipe binding), SEM0107 (stored represented Effect), SEM0132 (non-finite Effect join), SEM0145 (deferred callable mutation) and SEM0163 (effect block return mismatch) have no producer in the compiler. `let mut` inside an effect block is accepted, and mismatched block returns form a union.
- A struct field of type `Effect<'static; i32>` passes `silk check` when only declared. Running the field (`run h.job`) stops `silk check` with `unsupported[typed-form] not supported by the native compiler yet`, and constructing a value fails `silk build` with `unsupported[scalar-layout]`.
