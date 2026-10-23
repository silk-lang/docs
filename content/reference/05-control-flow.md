# Control flow

Control flow in Silk is statement-based: `if`, `if let` and `while` are statements, not expressions. This page covers conditionals, loops, `break`, `continue`, `return`, the `never` type and short-circuit evaluation.

## Syntax

```
IfStatement      = 'if' Condition Block ( 'else' ( IfStatement | IfLetStatement | Block ) )?
IfLetStatement   = 'if' 'let' Pattern '=' Condition Block ( 'else' ( IfStatement | IfLetStatement | Block ) )?
WhileStatement   = 'while' Condition Block
BreakStatement   = 'break'
ContinueStatement = 'continue'
ReturnStatement  = 'return' Expression?
StaticIf         = 'static' 'if' Condition Block ( 'else' Block )?
Condition        = Expression
Block            = '{' Statement* '}'
```

- `Condition` is an ordinary expression, except that a bare record literal is not allowed in it. Wrap one in parentheses: `if p.x == (Point { x: 1 }).x { }`.
- Inside a call's argument list the restriction does not apply: `if f(Point { x: 1 }) { }` parses.
- Parentheses around a condition are allowed but not needed.

## Conditionals

- `if` is a statement. It produces no value, so `let y = if c { 1 } else { 2 }` is a parse error (PAR0001). Use `match` when a value is needed (see Patterns and match).
- The condition must have type `bool` (SEM0011). Integers are not truthy.
- `else if` chains to any depth. `else` may start on the line after the closing brace.
- An `if` whose `then` block and `else` branch both end with `return` (or a call returning `never`) ends the path. The function needs no further `return`.

## `if let`

- `if let Pattern = expr { } else { }` runs the first block when the value matches the pattern. Names bound by the pattern are visible only in that block, not in `else` or after the statement (SEM0006).
- Any pattern from Patterns and match works: `Option.Some { value: at }`, `Left { value }`, `Shape.Circle { radius }`.
- Matching a non-Copy value consumes it. A named variable needs `move` before it: `if let Option.Some { value } = move found { }`. Without it the compiler reports OWN0003.
- A temporary, such as a call result or a constructed value, needs no `move`: `if let Option.Some { value } = find(x) { }`.
- Matching `&expr` or `&mut expr` borrows instead. Bindings are then shared or exclusive views of the parts.
- A value of reference type cannot be matched directly (SEM0226). Match its referent: `if let Status.Bad { code } = &status.* { }`.
- `if let` and plain `if` may be mixed in one `else if` chain.

## Loops

- `while Condition { }` is the only runtime loop. It tests the condition before each iteration.
- There is no `for`, `loop` or `do`/`while`. A statement `loop { }` is PAR0006; write `while true { }`. `loop` is not reserved and may still name a binding. `for` outside `static for` is a parse error.
- `while let` is planned but not available. Today it is a parse error.
- A `while true` loop with no `break` that targets it never completes. It ends the path like a `never` call: `fn f() -> never { while true { } }` checks, and code after the loop is unreachable.
- A `break` that leaves the loop, even in a nested `if`, makes it complete. A non-unit function that can then fall off its end is SEM0130. A `break` of an inner loop does not count.
- Only the literal condition `true` (parentheses allowed) is recognized. `while t { }` with `let t = true` completes as usual.
- To visit a slice or array, keep a `usize` index and compare it with `.length`. Indexes must be `usize` (see Structs, tuples and arrays).

## `break` and `continue`

- `break` leaves the innermost enclosing `while`. `continue` skips to its next condition test.
- Neither takes a label or a value. There are no loop labels. `break 5` is `break` followed by the expression statement `5` (SEM0087).
- Using either outside a loop is SEM0038.
- `break` and `continue` may appear in a `match` arm block inside a loop, including a `match` used as a value: `drop match i { 4 => { break } _ => 0 }`.

## Loops and moves

- Each iteration must start with the same set of live owned values. A body that moves an outer value and does not reassign it before the next iteration is rejected with OWN0005.
- Reassigning the moved binding before the iteration ends fixes it. So does leaving the loop right after the move with `break` or `return`.
- Moving a value inside a `while` condition and then using it after the loop is reported as use after move (OWN0001), even when the moving branch breaks.

## `return`

- `return Expression` leaves the current function with that value. The value must match the declared result (SEM0129).
- A bare `return` is allowed only directly before `}`; it returns `()`. Anything else after `return` is parsed as its value.
- A function body with no final `return` gets an implicit `return ()`. In a function whose result is not `()`, a path that reaches the end is SEM0130.
- Statements after a `return` are accepted without a diagnostic.

## `never` and diverging calls

- `never` is the result type of a computation that does not complete. A `-> never` function must not reach its end (SEM0130). Ending it with a `while true` loop that has no `break` satisfies this.
- A call returning `never` may stand alone as a statement. It ends the path, so no `return` is needed after it.
- `return stop(code)` is allowed in a function of any result type, and `let x: i32 = stop(1)` type-checks.
- For failing with a typed error instead, see Typed failures.

## Short-circuit evaluation

- `a && b` evaluates `b` only when `a` is `true`. `a || b` evaluates `b` only when `a` is `false`.
- Both operands must be `bool`. `1 && true` is SEM0135.
- Ownership analysis follows the short circuit. A move in the right operand may not have happened (see Ownership and moves).

## `static if`

- `static if Condition { } else { }` selects a branch during compilation. See Static control flow and reflection.
- The parser also accepts `static for Name in Expression { }`; see Static control flow and reflection.

## Examples

```silk
fn classify(value: i32) -> i32 {
  if value < 0 {
    return -1
  } else if value == 0 {
    return 0
  } else {
    return 1
  }
}

fn sumPositive(values: &[i32]) -> i32 {
  let mut total = 0
  let mut index: usize = 0
  while index < values.length {
    let value = values[index]
    index = index + 1
    if value < 0 {
      continue
    }
    if value > 100 {
      break
    }
    total = total + value
  }
  return total
}

pub fn main() -> i32 {
  let values = [4, -2, 6, 500, 7]
  if classify(-5) != -1 || classify(0) != 0 {
    return 1
  }
  if sumPositive(&values) != 10 {
    return 2
  }
  return 0
}
```

```silk
import silk.option { Option }

fn find(values: &[i32], wanted: i32) -> Option<usize> {
  let mut index: usize = 0
  while index < values.length {
    if values[index] == wanted {
      return Option.Some { value: index }
    }
    index = index + 1
  }
  return Option.None
}

fn positionOf(values: &[i32], wanted: i32) -> usize {
  if let Option.Some { value: at } = find(values, wanted) {
    return at
  }
  return values.length
}

pub fn main() -> i32 {
  let values = [4, 8, 15]
  if positionOf(&values, 15) != 2 {
    return 1
  }
  if let Option.Some { value } = find(&values, 99) {
    return 2
  } else {
    return 0
  }
}
```

```silk
fn bump(counter: &mut [i32], answer: bool) -> bool {
  counter[0] = counter[0] + 1
  return answer
}

pub fn main() -> i32 {
  let mut calls = [0]
  if false && bump(&mut calls, true) {
    return 1
  }
  if true || bump(&mut calls, true) {} else {
    return 2
  }
  if calls[0] != 0 {
    return 3
  }
  if true && bump(&mut calls, false) {
    return 4
  }
  return calls[0] - 1
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0001 | A required token is missing, for example `if` used as a value |
| PAR0006 | A statement written `loop { ... }`; use `while true { ... }` |
| SEM0006 | Unknown value, for example an `if let` binding used outside its block |
| SEM0011 | Condition is not `bool` |
| SEM0038 | `break` or `continue` outside a loop |
| SEM0087 | Expression statement whose result is not `()` or `never` |
| SEM0129 | `return` value does not match the declared result |
| SEM0130 | A reachable path falls off the end of a non-unit function |
| SEM0135 | Operator does not accept these operands, for example `&&` on integers |
| SEM0226 | `if let` on a reference; match its referent with `&r.*` |
| OWN0001 | Use of a binding after it was moved |
| OWN0003 | A non-Copy value is consumed without `move` |
| OWN0005 | Loop body leaves owned values live differently than the next iteration expects |

## See also

Bindings and statements · Expressions and operators · Patterns and match · Ownership and moves · Program entry and termination · Effects and run · Typed failures · Services and providers · Static evaluation · `silk/option`
