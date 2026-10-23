# Bindings and statements

A function body is a block of statements that run in order. This page covers `let` bindings, assignment, scopes and shadowing, `return`, expression statements, `drop`, and briefly `let static` and module-level `const`.

## Syntax

```
Block          = '{' Statement* '}'
Statement      = LetStatement | Assignment | ExpressionStatement | DropStatement
               | ReturnStatement | IfStatement | WhileStatement | 'break' | 'continue'
               | FailStatement | UnsafeBlock | StaticIf | StaticFor
LetStatement   = 'let' ( 'mut' | 'static' )? Identifier ( ':' Type )? '=' Expression
               | 'let' Pattern '=' Expression
Assignment     = Expression '=' Expression
ExpressionStatement = Expression
DropStatement  = 'drop' Expression
ReturnStatement = 'return' Expression?
UnsafeBlock    = 'unsafe' Block
ConstDeclaration = 'pub'? 'const' Identifier ':' Type '=' Expression
```

- Statements need no separator. Line breaks and spaces both work: `let a = 1 let b = 2` is two statements.
- `return` with no expression is allowed only directly before `}`. It returns `()`.

## let bindings

- `let name = e` binds an immutable local. Its type is the type of `e`.
- `let name: T = e` checks `e` against `T`. Literals in `e` take their type from `T`. A mismatch is SEM0037.
- Every `let` needs an initializer. `let x: i32` alone is a parse error (PAR0001).
- `let mut name = e` makes the binding assignable.
- A binding may stay unused. Names starting with `_` are ordinary names.
- `let _ = e` is rejected (SEM0087). Use `drop e`.
- Binding a non-Copy local to a new name moves it and needs `move`: `let q = move p`. Without it the compiler reports OWN0003. See Ownership and moves.

## Pattern lets

- `let Pattern = e` destructures `e`. The pattern must be irrefutable for the type of `e` (SEM0133 otherwise; use `if let` or `match`).
- Struct patterns name fields: `let Pair { left, right: extra } = move pair`. `..` skips the rest.
- A non-Copy named variable as the initializer needs `move`: `let Pair { left, .. } = move pair`. Without it the compiler reports OWN0003.
- A temporary, such as a call result or a literal, needs no `move`: `let Pair { left, .. } = make()`.
- There are no tuple patterns. Read tuple elements with `.0`, `.1`, and so on.
- See Patterns and match for the full pattern grammar.

## Assignment

- `place = e` stores `e` into an existing place. Assignment is a statement, not an expression.
- A place is a `mut` local, a field of a place (`p.x`), an indexed element (`a[i]`), or a dereference (`r.*`).
- Assigning to an immutable binding, or to a field or element of one, is SEM0035. Parameters are immutable unless declared `mut v: T`.
- Assigning through a shared reference `&T`, or to a non-place such as a call, is SEM0036.
- Writing through `&mut T` uses `r.* = e`. Field access through a reference needs no explicit `.*`: `r.x = 5` and `r.*.x = 5` both work.
- The assigned value must have the place's type (SEM0037).
- There is no compound assignment. `x += 1` is a parse error; write `x = x + 1`.

## Scopes and shadowing

- A binding is visible from the statement after its `let` to the end of its block. `let x = x + 1` with no earlier `x` is SEM0006.
- There is no bare block statement. A `{` at statement start does not open a scope. Blocks come only with `if`, `while`, `match` arms, `unsafe`, functions and closures.
- Two `let`s in the same block cannot share a name (SEM0008).
- A `let` in a nested block may reuse an outer name. The inner binding shadows the outer one until the block ends. The outer binding is unchanged.
- A `let` in the function body may reuse a parameter name and shadows it.

## Expression statements

- An expression on its own is a statement only if its type is `()` or `never` (SEM0087 otherwise).
- To discard any other result, write `drop e`. To keep it, bind it, return it, or pass it on.
- A call to an `effect fn` produces an `Effect` value. It does nothing until it is `run`. See Effects and run.
- `drop e` evaluates `e` and ends ownership of the result. `drop p` consumes the local `p` without `move`. Using `p` later is OWN0001.
- A statement that starts with `(` continues the previous line's expression as a call. `let a = f` followed by a line `(3)` means `let a = f(3)`.
- A statement that starts with `[` never continues the previous line. Indexing can't cross a line break.

## Returns

- `return e` leaves the function with `e`. Its type must match the result type (SEM0129).
- A function or effect body with no result type gets an implicit `return ()` at its end.
- A non-unit function must return on every reachable path (SEM0130). A call that returns `never` also ends a path, as does a `while true` loop with no `break`.
- See Control flow for `if`, `while`, `break` and `continue`, and Typed failures for `fail`.

## let static and const

- `let static name = e` evaluates `e` at compile time and binds the result. `e` may call only `static fn` functions (SEM0176 otherwise). `let static mut` is not allowed. See Static evaluation.
- `const NAME: T = e` declares a module-level constant. The type annotation is required: `const A = 5` is SEM0086.
- A constant's type must be a scalar such as an integer, float or `bool`, or `string`. A struct or array constant is SEM0086.
- A constant initializer may use operators and `static fn` calls: `const C: i32 = 1 + 2`.
- `pub const` exports the constant.

## Examples

```silk
struct Point {
  x: i32
  y: i32
}

fn reset(target: &mut i32) {
  target.* = 0
}

pub fn main() -> i32 {
  let mut total = 1
  total = total + 1
  let mut point = Point { x: 1, y: 2 }
  point.x = 10
  let mut slots: [i32; 3] = [1, 2, 3]
  let index: usize = 2
  slots[index] = 30
  let mut spare = 5
  reset(&mut spare)
  if total != 2 {
    return 1
  }
  if point.x + point.y != 12 {
    return 2
  }
  if slots[index] != 30 {
    return 3
  }
  if spare != 0 {
    return 4
  }
  return 0
}
```

```silk
struct Pair {
  left: i32
  right: i32
}

fn make() -> Pair {
  return Pair { left: 40, right: 2 }
}

pub fn main() -> i32 {
  let value = 1
  if value == 1 {
    let value = 2
    if value != 2 {
      return 1
    }
  }
  let Pair { left, right: extra } = make()
  let Pair { left: first, .. } = make()
  drop first
  drop make()
  return left + extra - 42 + value - 1
}
```

```silk
const BASE: i32 = 40

static fn offset(step: i32) -> i32 {
  return step * 2
}

pub fn main() -> i32 {
  let static extra = offset(1)
  if BASE + extra != 42 {
    return 1
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0001 | Required token missing, e.g. `let x: i32` with no initializer or `x += 1` |
| PAR0002 | Unexpected tokens, e.g. `;` as a terminator or `let static mut` |
| SEM0006 | Name with no visible binding |
| SEM0008 | A `let` repeats a name already bound in the same block |
| SEM0035 | Assignment through an immutable binding |
| SEM0036 | Assignment target is not a writable binding, field, index or `&mut` dereference |
| SEM0037 | Initializer or assigned value has the wrong type |
| SEM0086 | Constant without a type annotation, or type or initializer outside the constant rules |
| SEM0087 | Expression statement whose result is not `()` or `never`, including `let _ = e` |
| SEM0129 | `return` value does not match the result type |
| SEM0130 | A reachable path of a non-unit function falls through |
| SEM0133 | Refutable pattern in a `let` |
| SEM0176 | `let static` or `const` reaches work unavailable at compile time |
| OWN0001 | Use of a binding after it was moved or dropped |
| OWN0003 | A move that must be written with `move` |

## See also

Expressions and operators · Control flow · Patterns and match · Ownership and moves · Borrowing · Values and primitive types · Functions and methods · Static evaluation · Effects and run · Typed failures · Services and providers
