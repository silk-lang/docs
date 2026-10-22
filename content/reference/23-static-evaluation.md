# Static evaluation

Static evaluation runs Silk code inside the compiler and turns the results into values the program uses. This page covers the static phase, `const`, `let static`, `static fn`, static parameters, static text and sequences, the evaluation budgets, and how static failures are reported.

## Syntax

```
ConstantDecl     = 'pub'? 'const' Identifier ':' Type '=' Expression
StaticBinding    = 'let' 'static' Identifier ( ':' Type )? '=' Expression
StaticFunction   = 'pub'? 'static' 'fn' Identifier GenericParameters? '(' Parameters? ')' ( '->' Type )? Block
Parameter        = ( 'mut' | 'static' )? Identifier ':' Type
CompileError     = 'compileError' '(' Expression ')'
```

- A `static fn` is declared at module level or in an inherent `impl` block.
- `static if` and `static for` are covered in Static control flow and reflection. Package `param` declarations are covered in Package parameters.

## The static phase

- Static evaluation happens during compilation, before any code runs. It is demand driven: a value is computed when a site needs it.
- Sites that demand a static value: a `const` initializer, a `let static` initializer, an argument for a `static` parameter, an array length in a type, and a call to a `static fn` written in a runtime body.
- A call to a `static fn` in a runtime body is evaluated statically when every argument is static. The result is embedded in the program.
- Static arguments are literals, constants, `let static` bindings, `static` parameters, and calls to `static fn` with static arguments.
- A runtime value where a static value is needed is SEM0176. This includes a runtime local in a `let static` initializer.
- Every `const` is evaluated, even when nothing uses it.
- Inside a static function, only the branch actually taken is evaluated. A failing call in an untaken branch is not reported.
- Names and types in a `static fn` body are still checked as ordinary code.

## What may run statically

- Arithmetic, comparison and logic on `bool`, `char`, every integer type, `f32` and `f64`.
- Local `let` and `let mut` bindings, assignment to a whole binding, `if`, `while` and `return`.
- Calls to other `static fn`, including generic ones and inherent members such as `Units.kilo()`.
- Construction and field reads of structs without a `Drop` hook, fixed arrays and indexing, scalar enum values and `==` on them, and string values with `==`.
- `silk/static_text`, `silk/static_sequence` and reflection operations.

The following are SEM0176 during static evaluation:

- A call to an ordinary `fn`, including std lib functions such as `usize.toI32`.
- Assignment to a field (`q.x = v`) or an element (`a[i] = v`).
- A value of a type with a `Drop` hook.
- References and slices as values.
- Integer overflow, division by zero, and an out-of-range `StaticText` index or slice boundary.
- Using a `static fn` as a value.

These stop `silk check` with "unsupported: this construct is not supported by the native compiler yet": `match` in a `static fn`, tuple values, and a `static fn` header with `effect`, `unsafe`, or a failure row.

## Determinism and budgets

- A static function cannot be `effect`, `unsafe`, `test`, `extern` or `export`, and has no failure or requirement row. It performs no I/O, so equal inputs always give equal results.
- A `static fn` body runs only in static evaluation over static values. The runtime borrow and move checks do not cover it by design.
- Work is measured in evaluator steps, not time. Each demand has fixed budgets:

| Budget | Limit | Exceeded |
| --- | --- | --- |
| Evaluation steps | 100000 | SEM0179 |
| Nested static calls | 64 | SEM0180 |
| Retained value bytes | 1048576 | SEM0181 |
| Selected runtime nodes for one specialization | 100000 | SEM0182 |

- A `while` loop that never ends stops at the step budget (SEM0179).
- A call that repeats an active call with the same arguments is a cycle (SEM0178).
- Two constants whose initializers refer to each other are SEM0223.
- Retained bytes accumulate over the whole demand. Building a sequence of a few hundred elements by repeated `append` already exceeds the limit.

## Constants

- `const NAME: Type = expression` declares a module-level static value. The type annotation is required. Without it, the declaration does not parse.
- The type must be `bool`, `char`, an integer type, `f32`, `f64` or `string`. Any other type is SEM0086.
- An omitted `string` lifetime in a constant is `'static`.
- The initializer may call `static fn` and read other constants.
- A constant may be read in runtime code, in a `static fn`, as a static argument and as an array length: `[i32; SIZE]`.

## Static bindings

- `let static name = expression` evaluates the initializer statically and binds the result in a runtime body.
- The value may be a scalar, a string, a fixed array, a struct without `Drop`, or a scalar enum value.
- A `let static` binding is itself static. Later `let static` initializers and static arguments may use it.

## Static functions

- `static fn` declares a function that runs only in the static phase. It may be `pub` and generic.
- A `static fn` may be a member of an inherent `impl`. It cannot implement an interface member.
- A `static fn` must have a body.
- Calling a `static fn` with a runtime argument is SEM0176 at that argument.

## Static parameters

- `static name: T` marks an ordinary function's parameter as static. Each call must pass a static argument (SEM0176 otherwise).
- The parameter has no runtime representation. Its value is part of the function's identity: each distinct value produces one instance. Equal values share an instance, however they are written (`2`, `TWO`, `1 + 1`).
- Inside the function, the parameter is static. It may feed `let static`, `static if` and other static parameters.
- Static parameter types include integers, scalar enums, `string`, fixed arrays and structs without `Drop`.
- Recursion through static parameters must reach a base case. `countdown(n - 1)` guarded by `static if n == 0` is accepted. Recursion whose static argument keeps growing is refused as not supported.
- An anonymous function or `effect { ... }` block in a function with a `static` parameter is not supported yet: the native compiler does not build it once per static argument. It is SEM0245 at the literal: ``An `effect {}` block cannot run inside `scaled` yet: the native compiler does not specialize it for each argument of a `static` parameter; move the code that builds and runs it into a named function without `static` parameters and call that from `scaled` ``. Put the literal in a named function without `static` parameters and call that.

## Static text

`silk/static_text` provides `StaticText`, whose operations work only in the static phase. Text is UTF-8 bytes.

| Operation | Result |
| --- | --- |
| `StaticText.byteLength(text)` | byte length as `usize` |
| `StaticText.byteAt(text, index)` | the byte at `index` as `u8`; out of range is SEM0176 |
| `StaticText.concat(left, right)` | the joined `string<'static>` |
| `StaticText.slice(text, start, end)` | bytes `start..end` as `string<'static>`; a boundary inside a scalar is SEM0176 |

- A `static fn` returning `string` needs an explicit `string<'static>` result. An unannotated `string` result is SEM0210.

## Static sequences

`silk/static_sequence` provides `StaticSequence` over the type `Intrinsic.StaticSequence<Element>`, an immutable sequence that exists only in the static phase.

- `StaticSequence.empty<T>()` makes an empty sequence. `StaticSequence.append<T>(move s, value)` returns a new sequence with one more element.
- Sequences are passed and reassigned with `move`.
- A `static for` loop walks a sequence. See Static control flow and reflection.
- `StaticSequence.concat`, `StaticSequence.length` and `StaticSequence.at` are declared but refused as not supported. The refusal is reported at the user's call that reached them, like other static errors in another module. Its related location points into `silk/static_sequence.silk`.

## Static error reporting

- A static failure is reported at the failing operation, which is usually inside the `static fn`, not at the demanding site.
- A runtime argument is reported at the argument.
- When the failing operation is in another module, such as `silk/static_text` or `silk/reflect`, the error is reported at the outermost call in the evaluated module that reached it. `static if StaticText.byteAt("abc", 7) == 0` reports SEM0176 at the `StaticText.byteAt` call. `const B: u8 = pick()`, where the user's `static fn pick` calls `StaticText.byteAt("abc", 7)`, reports it at `pick()`. In both cases a `note: ... related location` line follows at the same position.
- `compileError(message)` fails the evaluation that reaches it with SEM0177. The diagnostic's message is the `message` text. `message` must be static text, such as a literal or a `string` constant.
- The SEM0177 is reported at the `compileError`. When a call selected it through a static argument, a note points at that call. In the second example below, changing `scaled(3, 1)` on line 24 to `scaled(-1, 1)` reports:

  ```
  /home/you/demo/src/main.silk:8:26: error[SEM0177] factor must not be negative
    note: /home/you/demo/src/main.silk:24:50: related location
  ```
- `compileError` in an untaken branch, or in an unselected `static if` arm, reports nothing. This makes it a static assertion.
- `compileError` in ordinary runtime code that is not inside a static selection is refused as not supported.

## Examples

Constants, a static function, `let static`, and constant array lengths:

```silk
const SIZE: usize = 3
const GREETING: string = "silk"

static fn triple(value: i32) -> i32 { return value * 3 }

static fn sumTo(limit: i32) -> i32 {
  let mut total = 0
  let mut i = 1
  while i <= limit {
    total = total + i
    i = i + 1
  }
  return total
}

static fn doubled(n: usize) -> usize { return n * 2 }

const TWELVE: i32 = triple(4)

pub fn main() -> i32 {
  let static fiftyFive = sumTo(10)
  let values: [i32; SIZE] = [1, 2, 3]
  let wider: [i32; doubled(2)] = [0, 0, 0, 4]
  if GREETING != "silk" { return 1 }
  return TWELVE + fiftyFive + values[2] + wider[3] - 74
}
```

Static parameters, one instance per value, and a static assertion:

```silk
import silk.static_text { StaticText }
import silk.usize

struct Config { base: i32 }
static fn makeConfig(base: i32) -> Config { return Config { base: base } }

fn scaled(static factor: i32, value: i32) -> i32 {
  static if factor < 0 { compileError("factor must not be negative") }
  return factor * value
}

fn width(static label: string) -> i32 {
  let static n = StaticText.byteLength(label)
  return usize.toI32(n)
}

fn based(static config: Config, value: i32) -> i32 { return config.base + value }

const TWO: i32 = 2
const LABEL: string = "four"

pub fn main() -> i32 {
  let static c = makeConfig(30)
  let products = scaled(2, 6) + scaled(TWO, 7) + scaled(3, 1)
  return products + width(LABEL) + based(c, 2) - 65
}
```

Static text inspection and a static sequence walked by `static for`:

```silk
import silk.static_text { StaticText }
import silk.static_sequence { StaticSequence }

static fn countByte(text: string, wanted: u8) -> i32 {
  let mut count = 0
  let mut i: usize = 0
  while i < StaticText.byteLength(text) {
    if StaticText.byteAt(text, i) == wanted { count = count + 1 }
    i = i + 1
  }
  return count
}

static fn greeting() -> string<'static> {
  return StaticText.concat(StaticText.slice("hello world", 0, 5), ", silk")
}

static fn squares(n: i32) -> Intrinsic.StaticSequence<i32> {
  let mut values = StaticSequence.empty<i32>()
  let mut i = 1
  while i <= n {
    values = StaticSequence.append<i32>(move values, i * i)
    i = i + 1
  }
  return move values
}

const GREETING: string = greeting()

pub fn main() -> i32 {
  let static ls = countByte(GREETING, 108)
  let mut total = 0
  static for square in squares(3) {
    total = total + square
  }
  return ls + total - 17
}
```

## Errors and fixes

SEM0176, a runtime value passed to a `static fn`:

```silk
static fn triple(value: i32) -> i32 { return value * 3 }
pub fn main() -> i32 {
  let x = 4
  return triple(x) - 12
}
```

Make the argument static with `let static`, a constant or a literal:

```silk
static fn triple(value: i32) -> i32 { return value * 3 }
pub fn main() -> i32 {
  let static x = 4
  return triple(x) - 12
}
```

SEM0176, field assignment in a `static fn`. Build a new value instead:

```silk
struct Point { x: i32 y: i32 }
static fn shifted(p: Point) -> Point { return Point { x: p.x + 1, y: p.y } }
pub fn main() -> i32 {
  let static q = shifted(Point { x: 1, y: 2 })
  return q.x + q.y - 4
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0086 | A constant's type or value is outside the constant contract |
| SEM0176 | Static evaluation reaches work that is unavailable in the static phase, or a runtime value where a static value is needed |
| SEM0177 | A reached `compileError` rejects the static demand |
| SEM0178 | A static call repeats an active call with the same arguments |
| SEM0179 | The static step budget is exhausted |
| SEM0180 | The static call-depth budget is exhausted |
| SEM0181 | The static retained-value budget is exhausted |
| SEM0182 | The residual-growth budget of one specialization is exhausted |
| SEM0210 | An omitted result lifetime has no unique input to come from, as in a `static fn` returning bare `string` |
| SEM0223 | Constants depend on each other in a cycle |
| SEM0245 | An anonymous function or `effect {}` block in a function with `static` parameters |

## See also

Static control flow and reflection · Package parameters · Functions and methods · Bindings and statements · Values and primitive types · Structs, tuples and arrays · Generics · `silk/static_text` · `silk/static_sequence`

## Open questions

- Most messages for SEM0176 and SEM0178 through SEM0182 are fixed text, such as "Crossing from static evaluation into unavailable runtime work". They don't name the value or call involved.
- `StaticSequence.concat`, `length` and `at` are refused as not supported, so a sequence can only be built with `append` and consumed with `static for`.
- The retained-value budget appears to count every intermediate sequence. About 400 `append` calls of `i32` exceed 1 MiB.
- A constant initializer written as a struct literal, such as `Point { x: 1 }`, fails to parse instead of reporting SEM0086 alone.
- `static effect fn`, `static unsafe fn` and a `static fn` with a failure row are refused as not supported rather than reported with a stable code.
- SEM0182 has a producer in the compiler, but no small program here triggered it before SEM0181.
