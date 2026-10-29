# Expressions and operators

Expressions compute values. This page covers operators and their precedence, postfix forms, the `|>` pipeline, how operators apply to primitive and user types, and briefly the other expression forms.

## Syntax

```
Expression  = Binary
Binary      = Prefix ( BinaryOp Prefix )*
BinaryOp    = '|>' | '||' | '&&' | '==' | '!=' | '<' | '<=' | '>' | '>='
            | '|' | '^' | '&' | '+' | '-' | '*' | '/' | '%'
Prefix      = ( '-' | '!' | '~' | '&' 'mut'? | 'move' | 'unsafe' ) Prefix
            | 'run' Expression
            | Postfix
Postfix     = Primary ( Call | GenericCall | '.' Identifier | '.' IntegerLiteral | '.' '*' | Index )*
Call        = '(' ( Expression ( ',' Expression )* ','? )? ')'
GenericCall = '<' TypeArguments '>' Call
Index       = '[' Expression ']'
Primary     = Literal | Path | '(' Expression ')' | '(' ')' | TupleLiteral | ArrayLiteral
            | StructLiteral | '.' '{' FieldInits '}' | MatchExpression
            | AnonymousFunction | 'effect' Block | 'compileError' '(' Expression ')'
TupleLiteral = '(' Expression ',' ( Expression ( ',' Expression )* ','? )? ')'
ArrayLiteral = '[' ( Expression ( ',' Expression )* ','? )? ']'
```

## Precedence and associativity

From weakest to strongest:

| Level | Operators | Associativity |
| --- | --- | --- |
| 1 | `\|>` | left |
| 2 | `\|\|` | left |
| 3 | `&&` | left |
| 4 | `==` `!=` | none |
| 5 | `<` `<=` `>` `>=` | none |
| 6 | `\|` | left |
| 7 | `^` | left |
| 8 | `&` | left |
| 9 | `+` `-` | left |
| 10 | `*` `/` `%` | left |
| 11 | prefix `-` `!` `~` `&` `&mut` `move` `unsafe` | right |
| 12 | postfix calls, `.name`, `.0`, `.*`, `[i]` | left |

- Bitwise operators bind tighter than comparisons. `x & 1 == 1` means `(x & 1) == 1`.
- `<` and `==` levels differ, so `a < b == c` means `(a < b) == c`.
- Comparisons don't chain. `let ok = a < b < c` and `a == b == c` are parse errors: PAR0002 at the second operator, plus a follow-on SEM0087. Combine with `&&` instead.
- A prefix operator applies to a whole postfix chain: `-p.x` is `-(p.x)` and `&a[i]` is `&(a[i])`.
- `run` takes the whole rest of the expression as its operand: `run f() != 4` means `run (f() != 4)`. Write `(run f()) != 4`.
- `|>` is weakest, so `x |> f != 3` pipes `x` into `f != 3`, which compares a function with a number (SEM0135). Write `(x |> f) != 3`.
- Parentheses group any expression.
- Operands, call arguments and a pipeline's input evaluate left to right.

## Arithmetic and bitwise operators

| Operator | Operand types | Result |
| --- | --- | --- |
| `+` `-` `*` `/` | same integer type, or same float type | that type |
| `%` | same integer type, or same float type | that type |
| unary `-` | signed integer or float | that type |
| `&` `\|` `^` | same integer type | that type |
| `~` | integer | that type |

- Both operands must have the same type. There is no implicit widening (SEM0135).
- An unannotated literal operand takes the other operand's type: `small + 55` with `small: u8` is `u8`.
- Integer `+`, `-`, `*` and unary `-` trap on overflow. `/` and `%` trap on a zero divisor and on `MIN / -1`. See Values and primitive types.
- Unary `-` on an unsigned integer is SEM0135. `char`, `bool` and `string` support no arithmetic.
- There are no shift operators and no `**`. Use `i32.shiftLeft` and similar std lib functions. `1 << 2` and `x >> 1` are one PAR0010 each: "Silk has no `<<` or `>>`; shift with the functions of the value's type, as in `i32.shiftLeft(value, count)` or `i32.shiftRight(value, count)`".

## Logical operators

- `!` negates a `bool`. `!` on an integer is SEM0135; use `~`.
- `&&` and `||` take `bool` operands and short-circuit. The right operand runs only when needed.
- `&&` binds tighter than `||`.
- `&` and `|` don't accept `bool` operands.

## Comparison operators

| Operator | Operand types |
| --- | --- |
| `==` `!=` | integers, floats, `bool`, `char`, `string`, scalar enums, types implementing `Equal` |
| `<` `<=` `>` `>=` | integers, floats, `char`, types implementing `Order` |

- Both operands must have the same type. Comparing `i64` with `i32` is SEM0135.
- `string` equality compares contents. `string` has no ordering operators.
- `bool` has no ordering operators.
- A comparison yields `bool`.

## Operators on user types

- Operators on non-primitive types come from interfaces. `silk/core/ops` names them: `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate`, `BitAnd`, `BitOr`, `BitXor`, `BitNot`, `Not`.
- `a + b` means `Add.add(a, b)` for the conformance of `a`'s type. Operands are passed by value.
- `==` and `!=` use `Equal` from `silk/core/equal`. Ordering operators use `Order` from `silk/core/order`.
- For a user type, write the comparison operands as references: `&a == &b`. Comparing by value is SEM0135.
- A conformance must be declared in the module that declares the type, in the module that declares the interface's first type argument, or in the interface's own source. A conformance anywhere else is invalid (SEM0083).
- The first-type-argument rule lets a module that declares `Meters` also define `3 * meters`, as `impl Multiply<Meters, Meters> for i32`. See Interfaces and impls.
- No import activates an operator. The use site needs neither `silk/core/ops` nor the module holding the conformance.
- With no matching conformance the operator is SEM0135. With two matching conformances it is SEM0136.
- Concrete primitive operands always use the built-in operator.
- Generic code applies an operator to `T` through a bound such as `T: Add<T, T>`. See Interfaces and impls and `silk/num/numeric`.

## Postfix forms

- `f(a, b)` calls `f`. A trailing comma is allowed.
- `f<T>(x)` passes explicit type arguments. A `<` after an expression starts type arguments only when balanced angles are followed by `(`. So `a < b > (c)` parses as a generic call.
- `e.name` reads a field. Through a reference it reads the referent's field without `.*`.
- `e.0`, `e.1` read tuple elements. `t.1.0` doesn't work because `1.0` lexes as a float. Write `(t.1).0`.
- `e.*` reads the referent of a reference. On a non-reference it is SEM0171.
- `e[i]` indexes an array or slice. The index must be `usize` (SEM0033). Out of bounds traps.
- Calls and `.` projections may continue on the next line. `[i]` may not: on a new line, `[` starts a new statement.

## Pipeline

- `x |> f` calls `f(x)`.
- `x |> f(a, b)` calls `f(x, a, b)`. The input becomes the first argument.
- `x |> f()` with a one-parameter `f` is SEM0078. Write `x |> f`.
- Pipelines chain left to right: `x |> f |> g(1)` is `g(f(x), 1)`.
- A pipeline step may start on the next line.

## Other expression forms

- Literals: see Lexical structure. Names and paths such as `Option<i32>.some`: see Functions and methods and Generics.
- `()` is the unit value. `(a, b)` is a tuple. `(a,)` is a one-element tuple. `(e)` is grouping.
- `[a, b, c]` is an array literal. `Name { field: e }` is a struct literal. `.{ field: e }` takes its type from context. See Structs, tuples and arrays.
- In `if` and `while` conditions and `match` subjects, a struct literal must be parenthesized: `(P { x: 1 }).x`.
- `match` is an expression. `if` is a statement, and also an expression when its `else` chain ends in a final `else`. See Patterns and match, and Control flow.
- `fn (x: T) -> R { … }` is an anonymous function. See Closures and callable types.
- `move e` transfers ownership of a place. See Ownership and moves.
- `&e` and `&mut e` borrow a place. See Borrowing.
- `unsafe e` acknowledges one unsafe call. See Unsafe code and C interop.
- `run e` runs an Effect. `effect { … }` builds one. See Effects and run.
- `compileError(e)` fails compilation when selected. See Static control flow and reflection.

## Nesting limits

- An expression may nest at most 256 child expressions deep: about 256 parentheses or prefix operators. Deeper nesting is PAR0005: "Code nested deeper than the compiler supports; split it into smaller expressions, blocks or types".
- A flat chain of binary operators such as `1 + 1 + …` fits about 1,000 operators before PAR0005.

## Examples

```silk
fn subtract(left: i32, right: i32) -> i32 {
  return left - right
}

fn negate(value: i32) -> i32 {
  return -value
}

pub fn main() -> i32 {
  if 1 + 2 * 3 != 7 {
    return 1
  }
  if 10 - 4 - 3 != 3 {
    return 2
  }
  if (6 & 3) != 2 || 6 & 3 != 2 {
    return 3
  }
  if -7 / 2 != -3 || -7 % 2 != -1 {
    return 4
  }
  let piped = 10 |> subtract(3) |> negate
  if piped != -7 {
    return 5
  }
  if (2 |> subtract(5)) != -3 {
    return 6
  }
  let zero = 0
  if false && 1 / zero == 0 {
    return 7
  }
  return 0
}
```

```silk
import silk.core.equal { Equal }
import silk.core.ops { Add }

struct Meters {
  value: i32,
}

fn addMeters(left: Meters, right: Meters) -> Meters {
  return Meters { value: left.value + right.value }
}

fn sameMeters(left: &Meters, right: &Meters) -> bool {
  return left.value == right.value
}

impl Add<Meters, Meters> for Meters {
  add: Meters.addMeters
}

impl Equal for Meters {
  equals: Meters.sameMeters
}

pub fn main() -> i32 {
  let total = Meters { value: 40 } + Meters { value: 2 }
  let expected = Meters { value: 42 }
  if &total != &expected {
    return 1
  }
  return 0
}
```

```silk
struct Counter {
  hits: i32,
}

fn bump(counter: &mut Counter) {
  counter.hits = counter.hits + 1
}

fn identity<T>(value: T) -> T {
  return move value
}

pub fn main() -> i32 {
  let mut counter = Counter { hits: 0 }
  bump(&mut counter)
  let pair = (counter.hits, true)
  let grid = [[1, 2], [3, 4]]
  let row: usize = 1
  let wide = identity<i64>(5)
  let moved = identity(move counter)
  if pair.0 != 1 || !pair.1 {
    return 1
  }
  if grid[row][row] != 4 {
    return 2
  }
  if wide != 5 || moved.hits != 1 {
    return 3
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0002 | Unexpected tokens, e.g. an unparenthesized struct literal in a condition |
| PAR0005 | Expression nesting beyond the supported limit |
| PAR0010 | A habit from another language, e.g. `<<` or `>>` |
| SEM0011 | Condition is not `bool` |
| SEM0012 | Argument type does not match the parameter |
| SEM0033 | Index is not `usize` |
| SEM0034 | Constant index outside the array length |
| SEM0075 | Call of a value that is not callable |
| SEM0078 | Unary function called with `()` as a pipeline target |
| SEM0083 | Invalid conformance, e.g. an operator impl outside the type's module |
| SEM0135 | No conformance of the operator's interface accepts these operands |
| SEM0136 | More than one conformance accepts these operands |
| SEM0171 | `.*` on a value that is not a reference |

## See also

Lexical structure · Values and primitive types · Bindings and statements · Control flow · Structs, tuples and arrays · Patterns and match · Functions and methods · Closures and callable types · Generics · Interfaces and impls · Ownership and moves · Borrowing · Unsafe code and C interop · Effects and run · Typed failures · Services and providers · Static evaluation · `silk/core/ops`, `silk/core/equal`, `silk/core/order`, `silk/num/numeric`, `silk/core/bool`
