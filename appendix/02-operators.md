# Operators

Silk has eleven binary operator levels, one prefix level and one postfix level. The table runs from weakest to strongest and comes from the parser's precedence table. Each overloadable operator is bound to one interface; `silk/ops`, `silk/equal` and `silk/order` name them.

## Precedence

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
| 12 | postfix call `f(x)`, `f<T>(x)`, `.name`, `.0`, `.*`, `[i]` | left |

- `run` is a prefix too, but it takes the whole rest of the expression, pipelines included: `run f() != 4` is `run (f() != 4)`. Write `(run f()) != 4`.
- Bitwise operators bind tighter than comparisons, so `x & 1 == 1` is `(x & 1) == 1`.
- Comparison and equality do not chain. `1 < 2 < 3` is a parse error at the second operator:

```
/home/you/demo/src/main.silk:2:17: error[PAR0002] Unexpected `<`; expected valid syntax
/home/you/demo/src/main.silk:2:19: error[SEM0087] An expression statement whose result cannot be intentionally ignored
```

- An index `[i]` must start on the same line as its operand. A call, `.name` or `|>` may start on the next line.
- `=` is not an operator. Assignment is a statement, and there is no compound assignment (`+=`).
- There are no shift operators, no `**` and no cast operator. `1 << 2` is PAR0002. Use `i32.shiftLeft`, `i32.toI64` and similar functions.

## Operator interfaces

| Operator | Interface (operation) | Built in for |
| --- | --- | --- |
| `a + b` | `Add<Right, Output>` (`add`) | same integer type, same float type |
| `a - b` | `Subtract<Right, Output>` (`subtract`) | same integer type, same float type |
| `a * b` | `Multiply<Right, Output>` (`multiply`) | same integer type, same float type |
| `a / b` | `Divide<Right, Output>` (`divide`) | same integer type, same float type |
| `a % b` | `Remainder<Right, Output>` (`remainder`) | same integer type, same float type |
| `-a` | `Negate<Output>` (`negate`) | signed integers, floats |
| `a & b` | `BitAnd<Right, Output>` (`bitAnd`) | same integer type |
| `a \| b` | `BitOr<Right, Output>` (`bitOr`) | same integer type |
| `a ^ b` | `BitXor<Right, Output>` (`bitXor`) | same integer type |
| `~a` | `BitNot<Output>` (`bitNot`) | integers |
| `!a` | `Not<Output>` (`not`) | `bool` |
| `&a == &b`, `&a != &b` | `Equal` (`equals`) | integers, floats, `bool`, `char`, `string`, scalar enums (by value) |
| `&a < &b`, `<=`, `>`, `>=` | `Order` (`compare`) | integers, floats, `char` (by value) |
| `a && b`, `a \|\| b` | none | `bool` only, short-circuit |
| `x \|> f(y)` | none | calls `f(x, y)` |

- The interfaces live in the `Intrinsic` namespace. `silk/ops` exports `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate`, `BitAnd`, `BitOr`, `BitXor`, `BitNot` and `Not`. `silk/equal` exports `Equal`; `silk/order` exports `Order` and `Ordering`.
- Arithmetic, bitwise, `Negate`, `BitNot` and `Not` take their operands by value. `Equal` and `Order` take `&Self`, so a user type compares through references: `&a == &b`.
- `!=` is the negation of `equals`. `<` tests `compare == Less`, `<=` tests `!= Greater`, `>` tests `== Greater`, `>=` tests `!= Less`.
- `Right` and `Output` let one type combine with another, as in `impl Multiply<f64, Vec2> for Vec2`.
- Concrete primitive operands always use the built-in operator. Both operands must have the same type; there is no implicit widening.
- No import turns an operator on. The conformance must be declared in the module that declares the type.
- No matching conformance is SEM0135; two matching conformances are SEM0136.

```
/home/you/demo/src/main.silk:4:13: error[SEM0135] Operator + does not accept (i64, i32)
/home/you/demo/src/main.silk:2:11: error[SEM0135] Operator ! does not accept (i32)
/home/you/demo/src/main.silk:2:16: error[SEM0135] Operator & does not accept (bool, bool)
```

## Generic code and primitives

A bound such as `T: Add<T, T>` lets generic code use an operator. In this release the primitive types conform to only two of the interfaces as bounds:

| Bound | Primitive types that satisfy it |
| --- | --- |
| `Add<T, T>` | `i8` to `i64`, `isize`, `u8` to `u64`, `usize` |
| `Order` | the same ten integer types |

Every other bound on a primitive is SEM0121 at the call: `T: Subtract<T, T>` with `i32`, `T: Add<T, T>` with `f64`, `T: Equal` with `i32`, `T: Order` with `char`.

```
/home/you/demo/src/main.silk:4:7: error[SEM0121] A concrete specialization whose conditional requirements cannot be proved
```

## Example

Every overloadable operator on one user type. The program exits 0.

```silk
import silk.ops {Add, Subtract, Multiply, Divide, Remainder, Negate, BitAnd, BitOr, BitXor, BitNot, Not}
import silk.equal {Equal}
import silk.order {Order, Ordering}

struct N { v: i32 }

fn add(a: N, b: N) -> N { return N { v: a.v + b.v } }
fn sub(a: N, b: N) -> N { return N { v: a.v - b.v } }
fn mul(a: N, b: N) -> N { return N { v: a.v * b.v } }
fn div(a: N, b: N) -> N { return N { v: a.v / b.v } }
fn rem(a: N, b: N) -> N { return N { v: a.v % b.v } }
fn neg(a: N) -> N { return N { v: -a.v } }
fn band(a: N, b: N) -> N { return N { v: a.v & b.v } }
fn bor(a: N, b: N) -> N { return N { v: a.v | b.v } }
fn bxor(a: N, b: N) -> N { return N { v: a.v ^ b.v } }
fn bnot(a: N) -> N { return N { v: ~a.v } }
fn lnot(a: N) -> bool { return a.v == 0 }
fn eq(a: &N, b: &N) -> bool { return a.v == b.v }
fn cmp(a: &N, b: &N) -> Ordering {
  if a.v < b.v { return Ordering.Less }
  if a.v > b.v { return Ordering.Greater }
  return Ordering.Equal
}

impl Add<N, N> for N { add: N.add }
impl Subtract<N, N> for N { subtract: N.sub }
impl Multiply<N, N> for N { multiply: N.mul }
impl Divide<N, N> for N { divide: N.div }
impl Remainder<N, N> for N { remainder: N.rem }
impl Negate<N> for N { negate: N.neg }
impl BitAnd<N, N> for N { bitAnd: N.band }
impl BitOr<N, N> for N { bitOr: N.bor }
impl BitXor<N, N> for N { bitXor: N.bxor }
impl BitNot<N> for N { bitNot: N.bnot }
impl Not<bool> for N { not: N.lnot }
impl Equal for N { equals: N.eq }
impl Order for N { compare: N.cmp }

pub fn main() -> i32 {
  let a = N { v: 12 } + N { v: 3 } - N { v: 1 }
  let b = N { v: 2 } * N { v: 7 } / N { v: 2 } % N { v: 4 }
  let c = -N { v: 5 }
  let d = (N { v: 6 } & N { v: 3 }) | (N { v: 8 } ^ N { v: 1 })
  let e = ~N { v: 0 }
  let f = !N { v: 0 }
  if a.v != 14 || b.v != 3 || c.v != -5 || d.v != 11 || e.v != -1 || !f { return 1 }
  let one = N { v: 1 }
  let two = N { v: 2 }
  if !(&one == &one) || &one != &one { return 2 }
  if !(&one < &two) || &two <= &one || &one > &two || !(&two >= &two) { return 3 }
  return 0
}
```

## See also

Expressions and operators, Interfaces and impls, Generics, Keywords. Modules: `silk/ops`, `silk/equal`, `silk/order`, `silk/numeric`.
