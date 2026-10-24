# Diagnostic codes

Every compiler error carries a stable code: three letters for the family and four digits. This page lists every code in the compiler's catalog, with a failing program, the exact output and the fix.

## Reading a diagnostic

A diagnostic prints as `path:line:column: error[CODE] message`. When the compiler knows a second place that matters, such as the earlier declaration a duplicate clashes with, an indented `note: path:line:column: related location` line follows it. Some codes say what that place is instead, such as `the earlier borrow starts here`. `silk check --json` prints one JSON object per diagnostic with `code`, `line`, `column`, `message`, `notes` and `related` locations. A failed check or build exits with status 1.

The message is either a filled-in template, such as `Unknown type Size`, or, when the compiler cannot fill the template, the code's one-line meaning, such as `Invoking a stored callable through too weak an aggregate receiver access`. The meaning names the rule but not the names or values involved; read the line and column. Entries below give the template when the printed message is the meaning.

A construct the compiler parses but cannot compile yet is not a coded error. It prints `unsupported: this construct is not supported by the native compiler yet` or `unsupported[Reason] not supported by the native compiler yet`, and the command exits with status 2.

| Family | Phase | Codes |
| --- | --- | --- |
| LEX | Lexing tokens and literals | LEX0001-LEX0014 |
| PAR | Parsing | PAR0001-PAR0007 |
| MOD | Module and package resolution | MOD0001-MOD0004 |
| OWN | Ownership, moves and loans | OWN0001-OWN0019 |
| SEM | Names, types, effects and everything else | SEM0001-SEM0245 |

There is no LAY family. Gaps in the numbering are codes that were retired, such as SEM0041 and SEM0199; they are never reused.

Each example is the whole `src/main.silk` of a package named `demo` in `/home/you/demo`, run with `silk check` unless the entry says `silk build`. Output lines are quoted as printed. Codes the compiler never reports are listed in the last section.

## LEX: tokens and literals

The lexer reports these codes at the invalid token. `silk check` and `silk build` print them and exit with status 1. Parse errors inside an invalid token are not reported, so a lexical error is usually the only one for its line.

### LEX0001

A byte sequence that does not start any token.

```silk
pub fn main() -> i32 {
  let value = $5
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0001] Unsupported byte sequence
src/main.silk:2:16: error[SEM0087] Expression statement produces i32, but only () or never may be ignored
```

The parser then reads the `5` as an expression statement and also reports SEM0087.

A UTF-8 byte order mark at the very start of a file is whitespace, not LEX0001; one anywhere else is reported.

Fix: Remove the stray character. Silk has no `$` operator; identifiers are ASCII letters, digits and `_`. See Lexical structure.

### LEX0002

An identifier-like modifier before a quote that is not a literal prefix.

```silk
pub fn main() -> i32 {
  let value = x"hello"
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0002] Unknown static-literal modifier: `x`
```

Fix: Use a known prefix, such as `b"hello"` for bytes, or none. See Lexical structure.

### LEX0003

A string or byte string literal with no closing delimiter.

```silk
pub fn main() -> i32 {
  let value = "hello
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0003] Unterminated string literal
```

An unterminated byte string, `b"hello`, is the same code. An unclosed character, `'a`, reads as a lifetime and gives PAR0001 and PAR0002 instead.

Fix: Close the literal: `"hello"`. See Lexical structure.

### LEX0004

A base prefix with no digits after it.

```silk
pub fn main() -> i32 {
  let value = 0x
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0004] Base-16 integer literal without digits
```

The message names the base: `0b` is Base-2 and `0o` is Base-8.

Fix: Write at least one digit after the prefix: `0x0`. See Lexical structure.

### LEX0005

A digit separator that is not between two digits.

```silk
pub fn main() -> i32 {
  let value = 1_000_
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0005] Digit separator must sit between two digits
```

A doubled separator, `1__0`, is the same code.

Fix: Put each `_` between two digits: `1_000`. See Lexical structure.

### LEX0006

A float exponent with no digits.

```silk
pub fn main() -> i32 {
  let value = 1.5e
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0006] Float literal exponent must have at least one digit
```

Fix: Write the exponent's digits: `1.5e3`. See Lexical structure.

### LEX0007

A character literal that does not hold exactly one Unicode scalar.

```silk
pub fn main() -> i32 {
  let value = 'ab'
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0007] Character literal must hold exactly one Unicode scalar, but holds 2
```

An empty literal, `''`, holds 0.

Fix: Use one character, `'a'`, or a string, `"ab"`. See Lexical structure, Values and primitive types.

### LEX0008

A duration amount that is not a whole decimal number.

```silk
pub fn main() -> i32 {
  let value = 1.5s
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0008] Duration components require whole decimal amounts
```

Fix: Use whole amounts in smaller units: `1500ms`, or `1s500ms`. See Lexical structure.

### LEX0009

A suffix on a number that is not a duration unit.

```silk
pub fn main() -> i32 {
  let value = 5sec
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:16: error[LEX0009] Unknown duration unit `sec`
```

The column is the suffix. A letter that is no unit at all, as in `5q`, is the same code.

Fix: Use a unit from the vocabulary: `5s`. See Lexical structure.

### LEX0010

A duration unit written twice in one literal.

```silk
pub fn main() -> i32 {
  let value = 1h2h
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:18: error[LEX0010] Duration unit `h` may appear only once
```

Fix: Write each unit once: `3h`. See Lexical structure.

### LEX0011

Duration units that are not in descending order.

```silk
pub fn main() -> i32 {
  let value = 30s2m
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:19: error[LEX0011] Duration unit `m` must not follow `s`
```

Fix: Write the larger unit first: `2m30s`. See Lexical structure.

### LEX0012

A component after the first that reaches the next unit up.

```silk
pub fn main() -> i32 {
  let value = 1h75m
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:17: error[LEX0012] Subordinate `m` component 75 exceeds 59
```

Fix: Carry into the larger unit: `2h15m`, or write the amount alone: `135m`. See Lexical structure.

### LEX0013

A digit or letter in a base-prefixed integer literal that is not a digit of its base.

```silk
pub fn main() -> i32 {
  let value = 0xG1
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0013] Base-16 integer literal contains `G`, which is not a base-16 digit
```

The column is the literal. The message names the base and the first bad digit: `0o9` gives ``Base-8 integer literal contains `9`, which is not a base-8 digit``, and `0b102` gives the same for base 2.

Fix: Use only digits of the base: `0x1F`, `0o7`, `0b101`. See Lexical structure.

### LEX0014

A numeric literal written with a type suffix.

```silk
pub fn main() -> i32 {
  let value = 7u8
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[LEX0014] Numeric literals take no type suffix such as `u8`; write the type as an annotation instead, as in `let value: u8 = 7`
```

The column is the start of the literal, and the message repeats its digits and suffix: `5usize` gives ``as in `let value: usize = 5` ``. Every integer and float type name is caught this way, after an integer or a float: `1.5f32` gives ``such as `f32`; write the type as an annotation instead, as in `let value: f32 = 1.5` ``. A float with an integer suffix gets its own wording. `2.5e3u8` gives ``Numeric literals take no type suffix such as `u8`; `2.5e3` is a float literal, which integer type `u8` cannot hold, so write a float type as an annotation instead, as in `let value: f64 = 2.5e3` ``.

Fix: Drop the suffix and give the type where the value is used: `let value: u8 = 7`, or pass `7` to a `u8` parameter. See Lexical structure and Values and primitive types.

The well-formed spellings `0x0F`, `1_000_000`, `1.5e3`, `'a'`, `"hello"`, `b"hello"`, `1500ms`, `1h15m` and `2m30s` all pass `silk check`. See Lexical structure and Values and primitive types.

## PAR: parsing

### PAR0001

One required token that is absent at its insertion position.

```silk
struct Point {
  x: i32,
  y i32
}
pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:5: error[PAR0001] Expected `:`
```

Fix: Write the missing token. Struct fields need `name: Type`. See Lexical structure.

### PAR0002

One maximal region of unexpected concrete tokens.

```silk
pub fn main() -> i32 {
  let total = 1;
  return total
}
```

`silk check` prints:

```text
src/main.silk:2:16: error[PAR0002] Unexpected `;`; expected valid syntax
```

Fix: Remove the stray tokens. Silk has no `;` terminator. See Lexical structure.

### PAR0003

A primary-expression template start reserved for future support.

```silk
pub fn main() -> i32 {
  let page = <html>
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:14: error[PAR0003] Template syntax is reserved but not implemented
```

Fix: Do not start an expression with `<`. Templates are not implemented. See Lexical structure.

### PAR0004

An import whose reserved final path segment cannot form an implicit binding.

```silk
import silk.effect
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:13: error[PAR0004] An import whose reserved final path segment cannot form an implicit binding
```

Message template, not filled by this compiler: `Reserved module segment {spelling} requires an explicit alias or selected-member list`.

Fix: Import members instead, as in `import silk.effect { Effect }`, or add `as name`. See Modules and imports.

### PAR0005

An expression child beyond the parser's supported nesting depth.

The example is `let deep = (((...(1)...)))` with 257 pairs of parentheses on line 2 of `main`.

`silk check` prints:

```text
src/main.silk:2:271: error[PAR0005] An expression child beyond the parser's supported nesting depth
```

Message template, not filled by this compiler: `Expression nesting exceeds the supported limit of {limit}`.

Fix: Split the expression with `let` bindings. The limit is 256 nested children. See Expressions and operators.

### PAR0006

A statement spelled `loop { ... }`, which Silk writes as `while true`.

```silk
pub fn main() -> i32 {
  loop { }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:3: error[PAR0006] `loop` is not a Silk keyword; write an unbounded loop as `while true { ... }`
```

Fix: Write `while true { ... }`. See Control flow.

### PAR0007

An optional type written `?T` in a type position.

```silk
pub fn main() -> i32 {
  let x: ?i32 = 3
  return x
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[PAR0007] `?T` is not a Silk type; write an optional type as `Option<T>`
```

The error is reported once, at the `?`, wherever a type is expected: a `let`, a parameter, a return type, a field or a `param`. The rest of the declaration is still checked, so `param o: ?i32 = 1` reports PAR0007 alone. Inside type arguments, as in `Option<?i32>`, it is the same error at the `?`, and `??i32` is reported once. Nullable pointers `?*T` and `?R` requirement rows are not affected.

Fix: Write `Option<i32>`. See Enums and unions.

## MOD: modules and packages

### MOD0001

An import naming a module absent from the supplied sources.

```silk
import silk.lists {List}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:8: error[MOD0001] Unknown module silk.lists
```

Fix: Correct the module path. Std lib modules are listed in the API reference. See Modules and imports.

### MOD0002

An import redundantly naming its own containing module.

```silk
import main as me
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:8: error[MOD0002] An import redundantly naming its own containing module
```

Message template, not filled by this compiler: `Module {module} imports itself`.

Only the import is reported. The names it would have bound cause no further errors, in the module itself or in modules that import it.

Fix: Remove the import. Names in the same module are already in scope. See Modules and imports.

### MOD0003

An import of another package's module that its manifest does not export.

`src/main.silk`:

```silk
import shapes.Secret {salt}
pub fn main() -> i32 { return salt() }
```

`silk.toml`:

```toml
[package]
name = "demo"
version = "0.1.0"
silk-version = "0.1.0"

[dependencies]
shapes = { path = "../shapes" }
```

`/home/you/shapes/silk.toml`:

```toml
[package]
name = "shapes"
version = "0.1.0"
silk-version = "0.1.0"
kind = "static-library"
exports = ["lib"]
```

`/home/you/shapes/src/lib.silk`:

```silk
pub fn area() -> i32 { return 1 }
```

`/home/you/shapes/src/Secret.silk`:

```silk
pub fn salt() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:8: error[MOD0003] Module Secret is not exported by package shapes@0.1.0
```

Fix: Import an exported module, or add the module to `exports` in the dependency's `silk.toml`. See Modules and imports, The manifest.

### MOD0004

An import of the reserved `Intrinsic` module or a module below it other than `Intrinsic.application`. Intrinsics are written `Intrinsic.<name>` without an import.

```silk
import Intrinsic { replace }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:8: error[MOD0004] Module Intrinsic cannot be imported: `Intrinsic` is reserved for compiler intrinsics, which are written `Intrinsic.<name>` without an import
```

Any import whose path starts with `Intrinsic`, such as `import Intrinsic.helpers { hi }`, is MOD0004, except `import Intrinsic.application`. The message names the imported path: `Module Intrinsic.helpers cannot be imported: ...`. An unknown `silk.` path, such as `import silk.nope`, is MOD0001 instead. A local module named `silk` or `Intrinsic` at the top of the source root is refused before checking starts, with `silk: invalid module ...` and exit status 1.

Fix: Remove the import and write `Intrinsic.replace(...)` directly; `Intrinsic` needs no import. Rename a local module that uses a reserved name. See The standard library, Intrinsics.

## OWN: ownership and borrowing

### OWN0001

A use of a binding after its consuming move.

```silk
struct Token { value: i32 }
fn take(t: Token) -> i32 { return t.value }
pub fn main() -> i32 {
  let t = Token { value: 1 }
  let a = take(move t)
  return a + t.value
}
```

`silk check` prints:

```text
src/main.silk:6:14: error[OWN0001] t.value was moved and cannot be used again
  note: src/main.silk:5:16: related location
```

Fix: Stop using the binding after the move, or copy out what you need first: `let v = t.value` before `take(move t)`. See Ownership and moves.

### OWN0002

A partial move out of a place whose boundary keeps the owner whole.

```silk
import silk.ownership { Drop }
struct Token { value: i32 }
impl Drop for Token { fn drop(self: &mut Token) -> () { return () } }
struct Pair { kept: Token,  lost: Token }
fn pair() -> Pair { return Pair { kept: Token { value: 1 }, lost: Token { value: 2 } } }
fn first() -> Token {
  return pair().kept
}
pub fn main() -> i32 { return first().value }
```

`silk check` prints:

```text
src/main.silk:7:10: error[OWN0002] This place crosses a boundary that does not support partial moves
```

Fix: Bind the temporary first (`let p = pair()`), then move the field: `move p.kept`. A type with a Drop hook cannot be partially moved. See Ownership and moves.

### OWN0003

A non-Copy value consumed without the explicit `move` its position requires.

```silk
struct Token { value: i32 }
fn take(t: Token) -> i32 { return t.value }
pub fn main() -> i32 {
  let t = Token { value: 1 }
  return take(t)
}
```

`silk check` prints:

```text
src/main.silk:5:15: error[OWN0003] Moving t requires an explicit move
```

Fix: Write `move`: `take(move t)`. See Ownership and moves.

### OWN0004

An assignment whose right side consumes the owner it is about to replace.

```silk
struct Token { value: i32 }
struct Holder { token: Token }
fn wrap(t: Token) -> Token { return move t }
pub fn main() -> i32 {
  let mut h = Holder { token: Token { value: 1 } }
  h.token = wrap(move h.token)
  return h.token.value
}
```

`silk check` prints:

```text
src/main.silk:6:3: error[OWN0004] `h.token` is consumed while computing its own replacement; move it out first with `let current = move h.token`, then assign `h.token` from `current`
```

Fix: Move the old value into a local first, then assign: `let old = move h.token` then `h.token = wrap(move old)`. See Ownership and moves.

### OWN0005

A loop whose body leaves owner liveness different from what its next iteration expects.

```silk
struct Token { value: i32 }
fn take(t: Token) -> i32 { return t.value }
pub fn main() -> i32 {
  let t = Token { value: 1 }
  let mut n = 0
  while n < 3 {
    n = n + take(move t)
  }
  return n
}
```

`silk check` prints:

```text
src/main.silk:6:3: error[OWN0005] A loop whose body leaves owner liveness different from what its next iteration expects
```

Message template, not filled by this compiler: `Loop {loop} repeats with incompatible owner liveness`.

Fix: Give the moved owner a new value before the next iteration, or move it once outside the loop. See Ownership and moves, Control flow.

### OWN0006

A borrowed pattern binding that outlives its match arm.

```silk
struct Payload {}
struct Box { value: Payload }
fn escape(input: Box) -> Payload {
  return match &input { Box { value } => value }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:42: error[OWN0006] Borrowed pattern binding value cannot escape its match arm
```

Fix: Match by value (`match move input`) to take the field, or return a borrow with a lifetime. See Borrowing, Patterns and match.

### OWN0007

An exclusive match over a binding that is not declared mutable.

```silk
struct Box { value: i32 }
fn exclusive(input: Box) -> i32 {
  return match &mut input { Box { .. } => 0 }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:10: error[OWN0007] An exclusive match over a binding that is not declared mutable
```

Message template, not filled by this compiler: `Exclusive match requires mutable binding {spelling}`.

Fix: Declare the binding mutable: `mut input: Box`. See Borrowing, Patterns and match.

### OWN0008

A match guard that consumes a binding its pattern introduced.

```silk
struct Payload {}
struct Box { value: Payload }
fn accept(value: Payload) -> bool { return true }
fn inspect(input: Box) -> i32 {
  return match move input {
    Box { value } if accept(move value) => 1
    Box { .. } => 0
  }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:6:29: error[OWN0008] Match guard cannot consume pattern binding value
```

Fix: Borrow in the guard instead of moving: pass `&value` to a function that takes `&Payload`. See Ownership and moves, Borrowing.

### OWN0009

A borrowing match whose subject is not a complete binding place.

```silk
struct Box { value: i32 }
fn make() -> Box { return Box { value: 1 } }
pub fn main() -> i32 {
  return match &mut make() { Box { value } => 0 }
}
```

`silk check` prints:

```text
src/main.silk:4:10: error[OWN0009] A borrowing match whose scrutinee is not a complete binding place
```

Message template, not filled by this compiler: `{access} match requires a complete binding place`.

Fix: Bind the value first: `let mut b = make()` then `match &mut b`. See Borrowing, Patterns and match.

### OWN0010

A borrowed-view loan that conflicts with an active loan of the same storage.

```silk
struct Token { value: i32 }
fn bump(t: &mut Token) -> () { return () }
pub fn main() -> i32 {
  let mut t = Token { value: 1 }
  let view = &t
  bump(&mut t)
  return view.value
}
```

`silk check` prints:

```text
src/main.silk:6:8: error[OWN0010] A mutable borrow of `t` conflicts with an earlier shared borrow of it that is still in use; use that borrow for the last time before this one
  note: src/main.silk:5:14: the earlier borrow starts here
```

Fix: End the shared loan before taking the exclusive one: read `view.value` before `bump(&mut t)`. See Borrowing, Services and providers.

### OWN0011

An owner access that conflicts with an active borrowed-view loan.

```silk
struct Token { value: i32 }
pub fn main() -> i32 {
  let mut t = Token { value: 1 }
  let view = &t
  t = Token { value: 2 }
  return view.value
}
```

`silk check` prints:

```text
src/main.silk:5:3: error[OWN0011] Assigning `t` while a borrow of it is still in use; use that borrow for the last time before this
  note: src/main.silk:4:14: the borrow starts here
src/main.silk:6:10: error[OWN0019] `view` is used after `t`, which it borrows, ended or was replaced
  note: src/main.silk:4:14: the borrow starts here
```

Fix: Finish using the borrow before changing the owner: read `view.value` before the assignment. See Borrowing.

### OWN0012

Moving a non-Copy value out through a borrowed-view place.

```silk
struct Token { value: i32 }
fn take(t: Token) -> i32 { return t.value }
fn probe(t: &Token) -> i32 {
  return take(move t.*)
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:15: error[OWN0012] A non-Copy value cannot be moved out through a borrowed-view place
```

Fix: Take the owner by value (`t: Token`), or copy the fields you need out of the borrow. See Ownership and moves, Borrowing.

### OWN0014

Invoking a stored callable through too weak an aggregate receiver access.

```silk
struct Stepper<'env, F: mut fn<'env>(i32) -> i32> { step: F }
fn advance<'env, F: mut fn<'env>(i32) -> i32>(stepper: &Stepper<'env, F>) -> i32 {
  return stepper.step(1)
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:10: error[OWN0014] Invoking a stored callable through too weak an aggregate receiver access
```

Message template, not filled by this compiler: `Cannot invoke field {field} of {aggregate} through {receiver} aggregate access: {contract} requires {required} access to the whole aggregate`.

Fix: Take the holder by `&mut` (`stepper: &mut Stepper<'env, F>`) for a `mut fn`, or by value for a `once fn`. See Closures and callable types.

### OWN0015

Running a stored Effect through too weak an aggregate receiver access.

```silk
import silk.effect { Effect }
struct Running<'env, F: mut Effect<'env; i32>> { operation: F }
fn runShared<'env, F: mut Effect<'env; i32>>(value: &Running<'env, F>) -> i32 {
  return run value.operation
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:10: error[OWN0015] Running a stored Effect through too weak an aggregate receiver access
```

Message template, not filled by this compiler: `Cannot run field {field} of {aggregate} through {receiver} aggregate access: {contract} requires {required} access to the whole aggregate`.

Fix: Take the holder by `&mut` for a `mut Effect`, or by value for a `once Effect`. See Effects and run.

### OWN0016

An access-scoped local-shared borrow escaping or crossing suspension.

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.fiber { Fiber }
import silk.shared { Shared }
struct Counter { value: i32 }
fn bump(c: &mut Counter) -> i32 {
  run Fiber<(), ()>.yieldNow()
  c.value = c.value + 1
  return c.value
}
effect fn work() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let shared = run (Shared<Counter>.make(Counter { value: 0 })
    |> Effect.provideMut<Allocator>(&mut allocator))
  return Shared<Counter>.withMut<i32>(&shared, bump)
}
effect fn recover(error: OutOfMemoryError) -> i32 { return -1 }
pub fn main() -> i32 {
  return run Effect.catchAll(work(), recover)
}
```

`silk build` prints:

```text
src/main.silk:7:3: error[OWN0016] An access-scoped local-shared borrow escaping or crossing suspension
  note: src/main.silk:15:10: related location
```

Message template, not filled by this compiler: `Local-shared access cannot invoke an external readiness callback while its exclusive borrow is live` / `Local-shared access cannot suspend while its exclusive borrow is live`.

Fix: Do the suspending work outside the `withMut` callback. A callback that holds the access must not `run` anything that can park. See Allocation and shared ownership, Suspension and cancellation.

### OWN0018

Returning a callable or Effect that borrows storage owned by the returning function.

```silk
fn leak() -> mut fn<'static>() -> i32 {
  let mut cell = 40
  return fn() -> i32 {
    cell = cell + 1
    return cell
  }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:5: error[OWN0018] Returning a callable or Effect that borrows storage owned by the returning function
  note: src/main.silk:3:10: related location
```

Message template, not filled by this compiler: `{executable} cannot escape with a {access} borrow of local {spelling}`.

Fix: Move an owned value into the literal (`let owned = move cell`) and return a `once fn<'static>`. See Closures and callable types, Effects and run.

### OWN0019

A borrowed value is used beyond the validity of its referent.

```silk
struct Token { value: i32 }
pub fn main() -> i32 {
  let mut view = &Token { value: 1 }
  if true {
    let inner = Token { value: 2 }
    view = &inner
  }
  return view.value
}
```

`silk check` prints:

```text
src/main.silk:8:10: error[OWN0019] `view` is used after a temporary value, which it borrows, ended or was replaced
  note: src/main.silk:3:18: the borrow starts here
```

Fix: Declare every referent before the borrow and in the same or an outer block, so it outlives each use. See Lifetimes, Borrowing.

## SEM: names, types and patterns (SEM0001-SEM0058)

### SEM0001

A type name that resolves to no type.

```silk
fn size() -> Size { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:14: error[SEM0001] Unknown type Size
```

A commonly used standard-library type also names its import. `fn sizes() -> List<i32>` without the import prints ``Unknown type List; is `import silk.list { List }` missing?``, and SEM0009 does the same for a call such as `List<i32>.make()`.

Fix: Declare the type, import it, or fix its spelling. See Values and primitive types.

### SEM0002

A literal outside its selected integer range.

```silk
pub fn main() -> i32 {
  let small: u8 = 300
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:19: error[SEM0002] A literal outside its selected integer range
```

Message template, not filled by this compiler: `Integer literal {spelling} exceeds the {type} range {minimum} through {maximum}`.

Fix: Use a literal that fits the type, or a wider type: `let small: u16 = 300`. See Values and primitive types.

### SEM0003

Two declarations with the same name in one module.

```silk
fn area() -> i32 { return 1 }
fn area() -> i32 { return 2 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:4: error[SEM0003] Duplicate declaration name area
  note: src/main.silk:1:4: related location
```

Fix: Rename one of the declarations. Silk has no overloading. See Functions and methods.

### SEM0004

A call to a function name that is not declared.

```silk
pub fn main() -> i32 {
  return total(1, 2)
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0004] Unknown function total
```

Fix: Declare or import the function, or fix its spelling. See Functions and methods.

### SEM0005

Two parameters with the same name.

```silk
fn add(a: i32, a: i32) -> i32 { return a }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:16: error[SEM0005] Duplicate parameter name a
```

Fix: Give each parameter its own name. See Functions and methods.

### SEM0006

A value name with no binding in scope.

```silk
pub fn main() -> i32 {
  return count
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0006] Unknown value count
```

Fix: Declare the binding before its use, or import the constant (`import silk.u32` for `u32.MAX`). See Bindings and statements.

### SEM0007

A call with the wrong number of arguments.

```silk
fn add(a: i32, b: i32) -> i32 { return a + b }
pub fn main() -> i32 {
  return add(1, 2, 3)
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0007] Expected 2 arguments but received 3
```

Fix: Pass exactly the declared number of arguments. See Functions and methods, Closures and callable types.

### SEM0008

A `let` whose name repeats an earlier binding in the same block.

```silk
pub fn main() -> i32 {
  let n = 1
  let n = 2
  return n
}
```

`silk check` prints:

```text
src/main.silk:3:7: error[SEM0008] Cannot rebind n
```

A body may rebind a parameter: in `fn next(n: i32) -> i32`, the line `let n = n + 1` is accepted.

Fix: Use a new name, or declare `let mut n` and assign. See Bindings and statements.

### SEM0009

A qualified call whose first segment names no known type or module.

```silk
pub fn main() -> i32 {
  return u32.max(1, 2)
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0009] Unknown name u32; is `import silk.u32` missing?
```

Fix: Add the import the message names: `import silk.u32`. See Values and primitive types.

### SEM0010

A call to an associated function that the type does not declare.

```silk
struct Point { x: i32 }
impl Point {
  fn make() -> Point { return Point { x: 0 } }
}
pub fn main() -> i32 {
  let p = Point.build()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:6:17: error[SEM0010] main.Point has no associated function `build`
```

A call on a value names the method instead, such as ``silk/list.List<i32> has no method `push` ``.

Fix: Call a function or method the type declares, here `Point.make()`. See Functions and methods.

### SEM0011

A conditional whose condition is not `bool`.

```silk
pub fn main() -> i32 {
  let n = 3
  if n { return 1 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:6: error[SEM0011] Condition must be bool, found i32
```

Fix: Write a `bool` condition: `if n != 0`. See Control flow.

### SEM0012

A call argument whose type mismatches its parameter.

```silk
fn take(n: i64) -> i64 { return n }
pub fn main() -> i32 {
  let small: i32 = 1
  drop take(small)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:13: error[SEM0012] Expected i64 but received i32
```

When the types differ only in a lifetime, the message names both, as in `Expected string<'static> but received string` for a borrowed `string` passed to a `string<'static>` parameter. A lifetime the compiler has not named prints as `'_`, as in `Expected main.Draft<'static> but received main.Draft<'_>`.

Fix: Pass the parameter type. Integers do not widen implicitly: use `i32.toI64(small)` after `import silk.i32`. See Functions and methods.

### SEM0014

An import or qualified reference naming a member its module does not declare.

```silk
import silk.list {Stack}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:19: error[SEM0014] Module silk/list has no member Stack
```

Fix: Import a member the module declares, here `List`. See Modules and imports.

### SEM0015

An import or qualified reference naming a private member of another module.

`src/main.silk`:

```silk
import helper {secret}
pub fn main() -> i32 { return secret() }
```

`src/helper.silk`:

```silk
fn secret() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:16: error[SEM0015] An import or qualified reference naming a private member of another module
```

Message template, not filled by this compiler: `{module}.{spelling} is private`.

Fix: Mark the member `pub` in its module. See Modules and imports.

### SEM0016

Two bindings in one scope claiming the same spelling.

```silk
import silk.list {List}
struct List { size: i32 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:8: error[SEM0016] Multiple bindings claim List
  note: src/main.silk:1:19: related location
```

The error is at the second binding, here the struct, with a note on the first. Two imports that bind one name are reported the same way, once, at the second import:

```silk
import silk.format { Format }
import silk.inflate { Format }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:23: error[SEM0016] Multiple bindings claim Format
  note: src/main.silk:1:22: related location
```

Fix: Rename the local declaration, or import under another name with `as`. See Modules and imports.

### SEM0017

A struct declaration that names one field twice.

```silk
struct Point { x: i32, x: i32 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:24: error[SEM0017] Duplicate field name x
```

Fix: Give each field its own name. See Structs, tuples and arrays.

### SEM0018

A type position whose name resolves to something other than a type.

```silk
fn size() -> i32 { return 1 }
fn grow(n: size) -> i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:12: error[SEM0018] Expected a type, found size
```

Fix: Write a type in type positions. See Generics.

### SEM0019

A public declaration whose signature mentions a private type.

```silk
struct Secret { value: i32 }
pub fn reveal() -> Secret { return Secret { value: 1 } }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:20: error[SEM0019] Public declaration exposes private type `Secret`
```

Fix: Make the type `pub`, or make the function private. See Functions and methods.

### SEM0020

Aggregates that contain themselves inline and so have no finite layout.

```silk
struct Node { next: Node }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0020] Inline recursive aggregate layout: main.Node
```

The struct is refused at its declaration, whether or not it is used.

Fix: Store the recursive part behind an owning pointer or in a collection, such as `next: Option<Box<Node>>` or `children: List<Node>`. See Allocation and shared ownership.

### SEM0021

A struct or variant literal outside the module that can see all of its fields.

`src/main.silk`:

```silk
import shapes {Circle}
pub fn main() -> i32 {
  let c = Circle { radius: 2 }
  return 0
}
```

`src/shapes.silk`:

```silk
pub struct Circle { radius: i32 }
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0021] Cannot construct shapes.Circle here because it has fields private to its module; call a function that module provides to build one
```

The message never names the private fields. A union variant is named with its union, such as `shapes.Shape.Square`.

Fix: Construct the struct through a `pub` function of its module, or make every field `pub`. See Structs, tuples and arrays, Modules and imports.

### SEM0022

A struct literal naming a field its type does not declare.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2, z: 3 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:31: error[SEM0022] main.Point has no field z
```

Fix: Initialize only declared fields. See Structs, tuples and arrays, Enums and unions.

### SEM0023

A struct literal that initializes one field twice.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, x: 2, y: 3 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:25: error[SEM0023] A struct literal that initializes one field twice
```

Message template, not filled by this compiler: `Field {field} is initialized more than once`.

Fix: Initialize each field once. See Structs, tuples and arrays, Enums and unions.

### SEM0024

A struct literal that omits a declared field.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0024] `Point { ... }` omits field `y`
```

Fix: Initialize every field. See Structs, tuples and arrays, Enums and unions.

### SEM0025

A struct literal field whose value mismatches the field type.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: true }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:28: error[SEM0025] Field y expects i32 but received bool
```

Fix: Give each field a value of its declared type. See Structs, tuples and arrays.

### SEM0026

A field projection on a value that is not a struct.

```silk
pub fn main() -> i32 {
  let n = 3
  return n.value
}
```

`silk check` prints:

```text
src/main.silk:3:12: error[SEM0026] A field projection on a value that is not a struct
```

Message template, not filled by this compiler: `Cannot project a field from {actual}`.

Fix: Project fields only from structs. See Structs, tuples and arrays.

### SEM0027

A field projection naming a field its struct does not declare.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  return p.z
}
```

`silk check` prints:

```text
src/main.silk:4:12: error[SEM0027] main.Point has no field z
```

Fix: Name a declared field. See Enums and unions, Structs, tuples and arrays.

### SEM0028

A field projection naming a private field of another module's struct.

`src/main.silk`:

```silk
import shapes {Circle}
pub fn main() -> i32 {
  let c = Circle.make()
  return c.radius
}
```

`src/shapes.silk`:

```silk
pub struct Circle { radius: i32 }
impl Circle {
  pub fn make() -> Circle { return Circle { radius: 0 } }
}
```

`silk check` prints:

```text
src/main.silk:4:12: error[SEM0028] A field projection naming a private field of another module's struct
```

Message template, not filled by this compiler: `{type}.{field} is private`.

Fix: Mark the field `pub`, or read it through a `pub` method. See Enums and unions, Structs, tuples and arrays.

### SEM0029

An empty array literal with no expected `Array` type to fix its element.

```silk
pub fn main() -> i32 {
  let empty = []
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:15: error[SEM0029] An empty array literal needs an expected Array type
```

Fix: Annotate the binding: `let empty: [i32; 0] = []`. See Structs, tuples and arrays.

### SEM0030

An array literal element whose type mismatches the element type.

```silk
pub fn main() -> i32 {
  let xs: [i32; 2] = [1, true]
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:26: error[SEM0030] An array literal element whose type mismatches the element type
```

Message template, not filled by this compiler: `Array element {index} expects {expected} but received {actual}`.

Fix: Make every element the declared element type. See Structs, tuples and arrays.

### SEM0031

An array literal whose element count differs from its expected length.

```silk
pub fn main() -> i32 {
  let xs: [i32; 3] = [1, 2]
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:22: error[SEM0031] An array literal whose element count differs from its expected length
```

Message template, not filled by this compiler: `Array literal expects {expected} elements but received {actual}`.

Fix: Write exactly the declared number of elements. See Structs, tuples and arrays.

### SEM0032

Indexing a value whose type does not support indexing.

```silk
pub fn main() -> i32 {
  let n = 5
  let i: usize = 0
  return n[i]
}
```

`silk check` prints:

```text
src/main.silk:4:10: error[SEM0032] Cannot index i32
```

Fix: Index arrays and slices only. See Structs, tuples and arrays.

### SEM0033

An index expression whose type is not `usize`.

```silk
pub fn main() -> i32 {
  let xs = [1, 2, 3]
  let i: i32 = 0
  return xs[i]
}
```

`silk check` prints:

```text
src/main.silk:4:13: error[SEM0033] An index expression whose type is not `usize`
```

Message template, not filled by this compiler: `Array index must be usize, found {actual}`.

Fix: Index with `usize`: `let i: usize = 0`. See Structs, tuples and arrays.

### SEM0034

A statically known index outside an array's known length.

```silk
pub fn main() -> i32 {
  let xs = [1, 2, 3]
  return xs[5]
}
```

`silk check` prints:

```text
src/main.silk:3:13: error[SEM0034] A statically known index outside an array's known length
```

Message template, not filled by this compiler: `Array index {index} is outside length {length}`.

Fix: Use an index below the array length. See Structs, tuples and arrays.

### SEM0035

Assigning through a binding that is not declared mutable.

```silk
pub fn main() -> i32 {
  let n = 1
  n = 2
  return n
}
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0035] Cannot assign through immutable binding n
```

Fix: Declare the binding `let mut n = 1`. See Bindings and statements.

### SEM0036

An assignment whose left side is not a writable place.

```silk
fn one() -> i32 { return 1 }
pub fn main() -> i32 {
  one() = 2
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0036] Assignment requires a writable binding, field, or indexed place
```

Fix: Assign to a binding, field or index of a `mut` binding. See Bindings and statements.

### SEM0037

An assigned value whose type mismatches its place.

```silk
pub fn main() -> i32 {
  let mut n = 1
  n = true
  return n
}
```

`silk check` prints:

```text
src/main.silk:3:7: error[SEM0037] Assignment expected i32 but received bool
```

Fix: Assign a value of the place's type. See Bindings and statements.

### SEM0038

`break` or `continue` outside any loop.

```silk
pub fn main() -> i32 {
  break
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:3: error[SEM0038] break is only valid inside a loop
```

Fix: Use `break` and `continue` only inside `while`. See Control flow.

### SEM0039

A structural union member that is not a detached ordinary value with finite storage.

```silk
pub fn main() -> i32 {
  let x: i32 | &i32 = 1
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:16: error[SEM0039] A structural union member that is not a detached ordinary value with finite storage
```

Message template, not filled by this compiler: `Structural union members must be detached ordinary values with finite storage, found {type}`.

Fix: Use owned values as union members: `i32 | bool`, not `&i32`. See Enums and unions.

### SEM0040

A union conversion whose source has members its target lacks.

```silk
fn widen(v: i32 | bool) -> i32 | char { return v }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:48: error[SEM0040] A union conversion whose source has members its target lacks
```

Message template, not filled by this compiler: `{source} cannot widen to {target}; missing {missing}`.

Fix: Widen only to a union that has every source member: `i32 | bool | char`. See Enums and unions.

### SEM0042

A match arm naming a member the subject type does not have.

```silk
pub fn main() -> i32 {
  let n: i32 = 3
  return match n {
    i64 x => 1
    _ => 0
  }
}
```

`silk check` prints:

```text
src/main.silk:4:5: error[SEM0042] A match arm naming a member its scrutinee type does not have
```

Message template, not filled by this compiler: `{member} is not a member of {scrutinee}`.

Fix: Match only members of the subject type. See Patterns and match.

### SEM0043

A match arm that earlier arms already cover.

```silk
union Shape { Circle { radius: i32 }, Empty }
pub fn main() -> i32 {
  let s = Shape.Empty
  return match move s {
    Shape.Circle { radius } => radius
    Shape.Empty => 0
    _ => 1
  }
}
```

`silk check` prints:

```text
src/main.silk:7:5: error[SEM0043] A match arm that earlier arms already cover
```

Message template, not filled by this compiler: `Unreachable match arm {member}`.

Fix: Remove the arm, or move it before the arms that already cover it. See Patterns and match.

### SEM0044

A match that does not cover every member of the subject type.

```silk
union Shape { Circle { radius: i32 }, Empty }
pub fn main() -> i32 {
  let s = Shape.Empty
  return match move s {
    Shape.Circle { radius } => radius
  }
}
```

`silk check` prints:

```text
src/main.silk:4:10: error[SEM0044] Match over Shape does not cover Empty
```

Fix: Add an arm for each missing member, or a final `_` arm. See Patterns and match.

### SEM0045

A match guard whose type is not `bool`.

```silk
pub fn main() -> i32 {
  let n = 3
  return match n {
    _ if n => 1
    _ => 0
  }
}
```

`silk check` prints:

```text
src/main.silk:4:10: error[SEM0045] Match guard must be bool, found i32
```

Fix: Write a `bool` guard: `_ if n > 2`. See Patterns and match.

### SEM0046

A struct pattern that omits a field without a trailing `..`.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let Point { x } = move p
  return x
}
```

`silk check` prints:

```text
src/main.silk:4:7: error[SEM0046] A struct pattern that omits a field without a trailing `..`
```

Message template, not filled by this compiler: `Pattern for {type} is missing field {field}; add it or use ..`.

Fix: Name every field or end the pattern with `..`: `Point { x, .. }`. See Patterns and match.

### SEM0047

A struct pattern that names one field twice.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let Point { x, x: other, y } = move p
  return x
}
```

`silk check` prints:

```text
src/main.silk:4:18: error[SEM0047] A struct pattern that names one field twice
```

Message template, not filled by this compiler: `Pattern field {field} appears more than once`.

Fix: Name each field once. See Patterns and match.

### SEM0048

A pattern binding whose name is already declared in scope.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let x = 0
  let p = Point { x: 1, y: 2 }
  let Point { x, y } = move p
  return y
}
```

`silk check` prints:

```text
src/main.silk:5:15: error[SEM0048] `x` is already declared in this scope; bind field `x` to another name, as in `{ x: found }`
```

A binding that is not a record field, such as `Color c` in a match arm, asks for another name instead.

Fix: Rename the binder: `Point { x: px, y }`. See Patterns and match.

### SEM0049

Match arms whose result types have no common type.

```silk
struct Point { x: i32 }
pub fn main() -> i32 {
  let n = 3
  let p = Point { x: 1 }
  let r = match n {
    0 => &p
    _ => 2
  }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:7:10: error[SEM0049] Match arms whose result types have no common type
```

Message template, not filled by this compiler: `Match arms have incompatible result types: {types}`.

Fix: Make every arm produce the same type. See Patterns and match.

### SEM0050

A generic parameter list that declares one spelling twice.

```silk
fn pair<T, T>(a: T) -> T { return move a }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:12: error[SEM0050] Duplicate type parameter T
```

Fix: Give each type parameter its own name. See Generics.

### SEM0051

An application with the wrong number of type arguments.

```silk
import silk.option {Option}
pub fn main() -> i32 {
  let o: Option<i32, i32> = Option<i32>.none()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0051] An application with the wrong number of type arguments
```

Message template, not filled by this compiler: `{target} expects {expected} type argument{expectedWord}, received {actual}`.

Fix: Pass the declared number of type arguments: `Option<i32>`. See Generics.

### SEM0052

A generic call whose type arguments its values do not determine.

```silk
import silk.option {Option}
pub fn main() -> i32 {
  let o = Option.none()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0052] Cannot infer all type arguments for Option.none from supplied values
```

Fix: Write the type arguments: `Option<i32>.none()`. See Generics.

### SEM0053

Recursion that re-specializes its callee with different type arguments.

```silk
fn grow<T>(value: T, depth: i32) -> i32 {
  if depth == 0 { return 0 }
  return grow<[T; 1]>([move value], depth - 1)
}
pub fn main() -> i32 { return grow<i32>(1, 3) }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0053] Recursion that re-specializes its callee with different type arguments
```

Message template, not filled by this compiler: `Recursive specialization changes type arguments from {caller} to {target}`.

Fix: Recurse with the same type arguments, or use a runtime value instead of a growing type. See Generics.

### SEM0056

An operand that cannot form a borrowed view.

```silk
struct Counter { n: i32 }
impl Counter {
  fn make() -> Counter { return Counter { n: 0 } }
  fn get(self: &Counter) -> i32 { return self.n }
}
pub fn main() -> i32 {
  let read = Counter.make().get
  return 0
}
```

`silk check` prints:

```text
src/main.silk:7:14: error[SEM0056] A borrowed view requires a direct stable owner or borrowed view
```

Fix: Bind the value first: `let c = Counter.make()` then `c.get()`. See Borrowing.

### SEM0057

An exclusive borrow of a binding that is not declared mutable.

```silk
fn bump(n: &mut i32) -> () { n.* = n.* + 1 }
pub fn main() -> i32 {
  let n = 1
  bump(&mut n)
  return n
}
```

`silk check` prints:

```text
src/main.silk:4:13: error[SEM0057] `n` is not mutable; declare it with `mut`, as in `let mut n`, to borrow it with `&mut`
```

Fix: Declare the binding `let mut n = 1`. See Borrowing, Functions and methods.

### SEM0058

An exclusive reborrow of a shared reference or slice.

```silk
fn bump(n: &mut i32) -> () { n.* = n.* + 1 }
fn reader(n: &i32) -> () { bump(&mut n.*) }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:33: error[SEM0058] `n` is a shared reference, so it cannot lend `&mut` access; take a `&mut` reference where it comes from to change what it points at
```

Fix: Take `&mut i32` in the outer function, or only read through the shared borrow. See Borrowing, Functions and methods.

## SEM: effects, callables, generics and conformances (SEM0060-SEM0126)

### SEM0060

A negative decimal literal contextualized as unsigned `usize`.

```silk
pub fn main() -> i32 {
  let n: usize = -1
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:18: error[SEM0060] usize literals cannot be negative
```

Fix: Use a signed type, or a non-negative value. See Values and primitive types.

### SEM0062

A failure channel attached to an ordinary function.

```silk
struct Oops {}
fn risky() -> i32 ! Oops { return 1 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:21: error[SEM0062] Only effect functions may declare a failure channel
```

Fix: Declare the function `effect fn`. See Typed failures.

### SEM0063

`fail` outside an effect function.

```silk
struct Oops {}
fn risky() -> i32 {
  fail Oops {}
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0063] Only an `effect fn` can `fail`; declare `risky` as an `effect fn` that names the failure type after `!`
```

Fix: Declare the function `effect fn` with a failure row: `effect fn risky() -> i32 ! Oops`. See Typed failures.

### SEM0064

An effect function failing with a type its signature does not declare.

```silk
struct Oops {}
struct Other {}
effect fn risky() -> i32 ! Oops {
  fail Other {}
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:8: error[SEM0064] An effect function failing with a type its signature does not declare
```

Message template, not filled by this compiler: `Failure {type} is not declared by this effect function`.

Fix: Add the type to the failure row (`! Oops | Other`), or fail with a declared type. See Typed failures.

### SEM0065

`run` applied to a value that is not an effect.

```silk
pub fn main() -> i32 {
  let n = 3
  return run n
}
```

`silk check` prints:

```text
src/main.silk:3:14: error[SEM0065] `run` applied to a value that is not an effect
```

Message template, not filled by this compiler: `Cannot run non-effect value {type}`.

Fix: Use `run` only on an Effect value. See Effects and run.

### SEM0066

A `run` whose failures the enclosing signature does not declare.

```silk
struct Oops {}
effect fn risky() -> i32 ! Oops {
  fail Oops {}
}
pub effect fn main() -> i32 {
  return run risky()
}
```

`silk check` prints:

```text
src/main.silk:6:10: error[SEM0066] This `run` can fail with `Oops`, which the enclosing function does not declare; add `! Oops` to its signature, or handle the failure with `Effect.result`
```

Fix: Declare the failure on the caller (`! Oops`), or handle it with `Effect.catch`. See Typed failures, Effects and run.

### SEM0067

An `Effect.catch` handler that does not fit the failures it handles.

```silk
import silk.effect {Effect}
struct Missing {}
struct Other {}
effect fn load() -> i32 ! Missing { fail Missing {} }
effect fn recover(error: Other) -> i32 { return 0 }
pub fn main() -> i32 {
  return run Effect.catch<Other>(load(), recover)
}
```

`silk check` prints:

```text
src/main.silk:7:14: error[SEM0067] Invalid Effect.catch handler: `main.Other` is not a failure of the handled Effect, which fails with `main.Missing`
```

The same code covers an `Effect.catchAll` handler whose parameter does not accept every failure of the handled Effect. When the parameter is a single type, the message names the missing failure:

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

struct Oops {}

effect fn work() -> i32 ! Oops | LogError ? &mut Logger {
  run Effect.log("working\n", &())
  fail Oops {}
}

effect fn explain(failure: Oops) -> i32 {
  return 1
}

pub effect fn main() -> i32 ! LogError {
  let mut logger = StdoutLogger.make()
  let handled = Effect.catchAll(work(), explain)
  return run move handled |> Effect.provideMut<Logger>(&mut logger)
}
```

`silk check` prints:

```text
src/main.silk:18:41: error[SEM0067] Invalid Effect.catch handler: its parameter type `main.Oops` does not accept `silk/logger.LogError`, a failure of the handled Effect; add it to the parameter's union
```

The message names the missing failures the same way when the parameter is a union that lacks a member, when the handled Effect has a single failure, and in the pipeline form, `work() |> Effect.catchAll(explain)`. With several missing it says ``does not accept `main.B`, `main.C`, failures of the handled Effect; add them to the parameter's union``.

A handler that is a plain `fn` is the same code. A handler returns an Effect, so it must be an `effect fn`:

```silk
import silk.effect { Effect }
struct Problem {}
effect fn load() -> i32 ! Problem { fail Problem {} }
fn recover(error: Problem) -> i32 { return 0 }
pub effect fn main() -> i32 {
  return run Effect.catchAll(load(), recover)
}
```

`silk check` prints:

```text
src/main.silk:6:38: error[SEM0067] Invalid Effect.catch handler: the handler is a plain `fn` that returns `i32`, but a handler returns the Effect that recovers; declare it `effect fn` with the same parameter and result
```

Fix: Make the handler take the failure type it handles: `Effect.catch<Missing>(load(), recover)` with `recover(error: Missing)`. For `catchAll`, give the parameter every failure in the row: `failure: Oops | LogError`. Declare a handler `effect fn recover(error: Problem) -> i32`. See Typed failures.

### SEM0070

A non-concrete or non-nominal capability in a requirement row.

```silk
effect fn count() -> i32 ? &mut i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:28: error[SEM0070] A non-concrete or non-nominal capability in a requirement row
```

Message template, not filled by this compiler: `Effect requirement {type} must be one concrete service type`.

Fix: Name a service or nominal type in the requirement row. See Services and providers.

### SEM0071

A `run` whose requirements the enclosing signature does not provide.

```silk
service Clock {
  effect fn now() -> i32 ? &Clock
}
effect fn stamp() -> i32 ? &Clock { return run Clock.now() }
pub fn main() -> i32 {
  return run stamp()
}
```

`silk check` prints:

```text
src/main.silk:6:10: error[SEM0071] This `run` needs `&Clock`, which the enclosing function does not provide; add `? &Clock` to its signature, or provide it with `|> Effect.provideMut(&mut value)`
```

Fix: Provide the service with `Effect.provide`, or declare it in the caller's row. See Services and providers.

### SEM0075

A call whose callee is not callable.

```silk
pub fn main() -> i32 {
  let n = 3
  return n(1)
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0075] A call whose callee is not callable
```

Message template, not filled by this compiler: `Cannot call non-callable value {actual}`.

Fix: Call only functions and callable values. See Closures and callable types.

### SEM0076

A callable value whose signature cannot satisfy the expected callable type.

```silk
struct Token { n: i32 }
effect fn consume(t: Token) -> i32 { return t.n }
effect fn twice(e: Effect<'static; i32>) -> i32 {
  let a = run e
  let b = run e
  return a + b
}
pub fn main() -> i32 {
  let t = Token { n: 1 }
  return run twice(consume(move t))
}
```

`silk check` prints:

```text
src/main.silk:10:20: error[SEM0076] Callable value with mode `once` cannot satisfy a parameter with mode shared (no `mut` or `once`), which may call it through a shared borrow
```

A closure that assigns a captured variable is a `mut fn`, and passing it for a plain `fn` parameter is the same error at the argument:

```silk
fn apply(f: fn() -> i32) -> i32 { return f() }
pub fn main() -> i32 {
  let mut n = 0
  return apply(fn() -> i32 {
    n = n + 1
    return n
  })
}
```

`silk check` prints:

```text
src/main.silk:4:16: error[SEM0076] Callable value with mode `mut` cannot satisfy a parameter with mode shared (no `mut` or `once`), which may call it through a shared borrow
```

Fix: Pass a callable or Effect whose mode and environment fit the parameter. Take `once Effect` to run it once, and `mut fn` to accept a closure that mutates its captures. See Closures and callable types.

### SEM0077

Invoking a stored callable through a place without the access its contract requires.

```silk
pub fn main() -> i32 {
  let mut total = 0
  let add = fn(n: i32) -> () { total = total + n }
  add(2)
  drop add
  return total
}
```

`silk check` prints:

```text
src/main.silk:4:3: error[SEM0077] `add` changes what it captures, so calling it needs a mutable binding; declare it `let mut add`
```

Fix: Declare the binding `let mut add` so a `mut fn` can be called through it. See Closures and callable types.

### SEM0078

Calling a unary callable with no arguments instead of naming it.

```silk
fn one() -> i32 { return 1 }
fn twice(n: i32) -> i32 { return n * 2 }
pub fn main() -> i32 {
  return 3 |> twice()
}
```

`silk check` prints:

```text
src/main.silk:4:15: error[SEM0078] Calling a unary callable with no arguments instead of naming it
```

Message template, not filled by this compiler: `{target} is unary; name it directly instead of calling it with no arguments`.

Fix: Name the function without parentheses: `3 |> twice`. See Closures and callable types.

### SEM0081

Returning an owned callable whose concrete environment is unknown.

```silk
fn keep(f: once fn<'static>(i32) -> i32) -> once fn<'static>(i32) -> i32 {
  return move f
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0081] Cannot return an owned callable whose concrete environment identity is unknown
```

Fix: Return a callable whose identity is known, or use an opaque result `some<F: ...> F`. See Closures and callable types.

### SEM0082

A raw storage operation outside lexical unsafe authority.

```silk
unsafe fn danger() -> i32 { return 1 }
pub fn main() -> i32 {
  return danger()
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0082] A raw storage operation outside lexical unsafe authority
```

Message template, not filled by this compiler: `{operation} requires unsafe acknowledgement`.

Fix: Call the unsafe function inside `unsafe { ... }`. See Unsafe code and C interop.

### SEM0083

An invalid source-declared capability implementation.

```silk
interface Shape {
  fn area(value: &Self) -> i32
}
struct Square { side: i32 }
impl Shape for Square {}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:5:1: error[SEM0083] Invalid conformance: `Shape` requires `area`, which this implementation does not define
```

The column is the start of the `impl` for a missing operation, and the member's line for a member that is wrong. The message names the interface and the member:

- Several missing operations are listed together: ``Invalid conformance: `Box3` requires `width` and `depth`, which this implementation does not define``.
- A member whose signature differs says how: ``Invalid conformance: member `decode` does not match the operation of `Info`: it returns a different type``. Other endings are ``it takes a different number of parameters`` and ``its parameter 1 takes stronger access than promised, or consumes a borrowed operand``, as when a provider takes `&mut Self` for an operation that requires `&Service`.
- A member the interface does not have: ``Invalid conformance: `other` is not an operation of `Info` ``.
- A member in `impl Copy`: ``Invalid conformance: `impl Copy` declares no members; the compiler copies the value``.

- A second identical `impl`, at the second one: ``Invalid conformance: `Square` implements `Shape` twice; keep one implementation``.
- A member defined twice, at the second definition: ``Invalid conformance: `area` is defined twice in the implementation of `Shape` for `Square` ``.

Fix: Implement every interface member, with the interface's signature, and nothing else. `Copy` needs every field to be `Copy`. See Interfaces and impls.

### SEM0084

A Drop implementation outside the compiler-sealed hook contract.

```silk
import silk.ownership {Drop}
struct File { fd: i32 }
impl Drop for File {
  fn drop(self: File) -> () {}
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:3: error[SEM0084] Invalid Drop hook: the hook is `fn drop(self: &mut Self) -> ()`
```

Fix: Write the hook as `fn drop(self: &mut Self) -> ()`. See Ownership and moves.

### SEM0085

Malformed escapes, invalid UTF-8, or non-byte literal values.

```silk
pub fn main() -> i32 {
  let text = "tab\qhere"
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:14: error[SEM0085] Malformed escapes, invalid UTF-8, or non-byte literal values
```

Message template, not filled by this compiler: `Invalid static literal: {detail}`.

Fix: Use a supported escape: `\n` `\r` `\t` `\0` `\\` `\"`, `\'` in a character literal, `\xHH` or `\u{H...}`.

### SEM0086

A typed constant whose type or literal is outside the constant contract.

```silk
const LIMIT = 10
pub fn main() -> i32 { return LIMIT }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0086] Invalid constant: a constant requires a type annotation, as in `const NAME: i32 = 5`
```

Fix: Annotate the constant: `const LIMIT: i32 = 10`. See Static evaluation.

### SEM0087

An expression statement whose result cannot be intentionally ignored.

```silk
fn one() -> i32 { return 1 }
pub fn main() -> i32 {
  one()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0087] Expression statement produces i32, but only () or never may be ignored
```

An Effect that is built and never run gets its own message. Here `compute` is an `effect fn`:

```silk
effect fn compute() -> i32 { return 1 }
pub effect fn main() -> i32 {
  compute()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0087] Expression statement produces an Effect of `i32` that is never run (write `run` before it to run it, or `drop` it to discard it), but only () or never may be ignored
```

Fix: Bind the result (`let n = one()`) or drop it (`drop one()`). Run an Effect with `run compute()`, and discard its result with `drop run compute()`. See Bindings and statements, and Effects and run.

### SEM0088

Using a generic binder in a value, failure-row, or requirement-row position of another kind.

```silk
fn wrap<?R>(value: R) -> i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:20: error[SEM0088] Generic parameter `?R` has kind a requirement row, expected a type
```

A type argument list that leaves out a requirement row is the same code:

```silk
struct Holder<T, ?R> { value: T }
fn take(h: Holder<i32>) -> i32 { return h.value }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:18: error[SEM0088] Generic parameter `?R` has kind none because its row argument is omitted, expected a requirement row; write `? never` for an empty row
```

Fix: Use the binder in the position of its kind: `?R` in a requirement row, `T` in a value position. Write `Holder<i32 ? never>` for an empty row. See Generics.

### SEM0090

Storage or another non-operation member inside an interface or service.

```silk
service Store {
  count: i32
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:3: error[PAR0002] Unexpected `count`; expected valid syntax
src/main.silk:2:8: error[PAR0002] Unexpected `:`; expected valid syntax
src/main.silk:2:10: error[PAR0002] Unexpected `i32`; expected valid syntax
src/main.silk:2:3: error[SEM0090] Storage or another non-operation member inside an interface or service
```

Message template, not filled by this compiler: `Invalid service declaration: {detail}`.

An operation with a body is not this error: the body is the operation's default, used by a provider or impl that leaves the operation out.

Fix: Keep state in the type that provides the service or implements the interface, not in the contract. A service or interface holds only operations. See Services and providers.

### SEM0099

One named type parameter left undetermined by an explicit prefix and the arguments.

```silk
import silk.option {Option}
fn convert<A, B>(a: A) -> Option<B> { return Option<B>.none() }
pub fn main() -> i32 {
  let o = convert<i32>(1)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:11: error[SEM0099] One named type parameter left undetermined by an explicit prefix and the arguments
```

Message template, not filled by this compiler: `Cannot infer type argument {parameter} of {target} from supplied values`.

Fix: Pass all type arguments: `convert<i32, bool>(1)`. See Generics.

### SEM0108

A `typeof` item that resolves to no declaration in scope.

```silk
fn pick() -> typeof(add) { return add }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:14: error[SEM0108] A `typeof` item that resolves to no declaration in scope
```

Message template, not filled by this compiler: `Cannot name the exact representation of {item}: no declaration of that name is in scope`.

Fix: Name a function declared in scope. See Generics.

### SEM0109

A `typeof` item whose name belongs to more than one declaration.

`src/main.silk`:

```silk
import helper {add}
fn add(a: i32) -> i32 { return a }
fn pick() -> typeof(add) { return add }
pub fn main() -> i32 { return 0 }
```

`src/helper.silk`:

```silk
pub fn add(a: i32) -> i32 { return a }
```

`silk check` prints:

```text
src/main.silk:2:4: error[SEM0016] Multiple bindings claim add
  note: src/main.silk:1:16: related location
src/main.silk:3:14: error[SEM0109] A `typeof` item whose name belongs to more than one declaration
```

Message template, not filled by this compiler: `Cannot name the exact representation of {item}: {count} declarations carry that name, so no single item is resolved`.

Fix: Remove the clash so the name has one declaration. See Generics.

### SEM0110

A `typeof` item that names something other than an ordinary callable.

```silk
struct Point { x: i32 }
fn pick() -> typeof(Point) { return Point }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:14: error[SEM0110] A `typeof` item that names something other than an ordinary callable
```

Message template, not filled by this compiler: `Cannot name the exact representation of {item}: it names {subject}, which has no source-nameable exact identity`.

Fix: Name a function. `typeof` takes ordinary callables only. See Generics.

### SEM0111

A `typeof` item whose generic parameters are not all supplied.

```silk
fn same<T>(v: T) -> T { return move v }
fn pick() -> typeof(same) { return same }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:14: error[SEM0111] A `typeof` item whose generic parameters are not all supplied
```

Message template, not filled by this compiler: `Cannot name the exact representation of {item}: an exact representation names one construction, but {expected} generic parameters were declared and {actual} concrete arguments were supplied`.

Fix: Name a non-generic function, or a generic one applied to all its arguments. See Generics.

### SEM0112

A public contract exposing the exact identity of a private item.

```silk
fn secret(n: i32) -> i32 { return n }
pub fn pick() -> typeof(secret) { return secret }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:18: error[SEM0112] A public contract exposing the exact identity of a private item
```

Message template, not filled by this compiler: `Public contract exposes the exact representation of private {item}`.

Fix: Make the function `pub`, or keep the signature private. See Generics.

### SEM0113

One opaque producer specialization yielding multiple exact identities.

```silk
fn inc(n: i32) -> i32 { return n + 1 }
fn dec(n: i32) -> i32 { return n - 1 }
fn choose(up: bool) -> some<F: fn<'static>(i32) -> i32> F {
  if up { return inc }
  return dec
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:24: error[SEM0113] One opaque producer specialization yielding multiple exact identities
  note: src/main.silk:4:18: related location
```

Message template, not filled by this compiler: `Opaque result {family} has divergent reachable realizations: {realizations}`.

Fix: Return one producer from every path of an opaque result. See Generics.

### SEM0114

An opaque family whose representation evidence contains no local construction.

```silk
fn a() -> some<F: fn<'static>() -> i32> F { return b() }
fn b() -> some<F: fn<'static>() -> i32> F { return a() }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:11: error[SEM0114] An opaque family whose representation evidence contains no local construction
src/main.silk:1:11: error[SEM0114] An opaque family whose representation evidence contains no local construction
```

Message template, not filled by this compiler: `Opaque realization cycle has no local concrete construction: {families}`.

Fix: Construct the value locally in at least one producer. See Generics.

### SEM0115

An opaque realization whose inline captures contain that same family.

```silk
fn nest(n: i32) -> some<F: once fn<'static>() -> i32> F {
  let inner = nest(n)
  return fn() -> i32 {
    let g = move inner
    return g()
  }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:20: error[SEM0115] An opaque realization whose inline captures contain that same family
```

Message template, not filled by this compiler: `Opaque results form an infinite inline layout cycle: {families}`.

Fix: Do not store the opaque family inside its own realization. See Generics.

### SEM0116

An opaque result binder whose bound is not callable or Effect representation.

```silk
fn one() -> some<F: i32> F { return 1 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:13: error[SEM0116] An opaque result binder whose bound is not callable or Effect representation
```

Message template, not filled by this compiler: `Opaque result binder {binder} must have a callable or Effect representation bound, but its kind is {actual}`.

Fix: Bound an opaque result by a callable or `Effect` type. See Generics.

### SEM0117

An opaque producer whose reachable returns establish no representation.

```silk
fn never() -> some<F: fn<'static>() -> i32> F {
  while true {}
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:15: error[SEM0117] An opaque producer whose reachable returns establish no representation
```

Message template, not filled by this compiler: `Opaque result {family} has no reachable callable or Effect representation construction`.

Fix: Return a value from the function. See Generics.

### SEM0118

An opaque result declared where no producer body can establish its identity.

```silk
interface Maker {
  fn make() -> some<F: fn<'static>() -> i32> F
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:16: error[SEM0118] An opaque result declared where no producer body can establish its identity
```

Message template, not filled by this compiler: `Opaque result {declaration} is not permitted on a {context} operation because no producer body can establish one static representation`.

Fix: Use opaque results only in function bodies, not in interface or service signatures. See Generics.

### SEM0119

Two conformance heads that may name one provider under one interface.

```silk
interface One { fn one(v: &Self) -> i32 }
struct B<T> { v: T }
fn anyOne<T>(v: &B<T>) -> i32 { return 1 }
fn intOne(v: &B<i32>) -> i32 { return 2 }
impl<T> One for B<T> { one: B.anyOne }
impl One for B<i32> { one: B.intOne }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:6:1: error[SEM0119] Two conformance heads that may name one provider under one interface
```

Message template, not filled by this compiler: `{head} may overlap {other}`.

Fix: Keep conformance heads disjoint, or keep only the generic one. See Interfaces and impls.

### SEM0120

A conformance requirement that does not descend toward a base witness.

```silk
interface Eq2<T> { fn eq2(a: &Self, b: &T) -> bool }
struct Box2<T> { v: T }
struct Pair<A, B> { a: A, b: B }
fn boxEq<T: Eq2<Pair<T, T>>>(a: &Box2<T>, b: &T) -> bool { return true }
impl<T: Eq2<Pair<T, T>>> Eq2<T> for Box2<T> { eq2: Box2.boxEq }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:5:9: error[SEM0120] A conformance requirement that does not descend toward a base witness
```

Message template, not filled by this compiler: `{head} declares a requirement that does not descend`.

Fix: Write conformance requirements that get smaller toward a base case. See Interfaces and impls.

### SEM0121

A concrete specialization whose conditional requirements cannot be proved.

```silk
import silk.ownership {Copy}
fn twin<T: Copy>(v: T) -> T { return v }
struct Token { n: i32 }
pub fn main() -> i32 {
  let t = twin(Token { n: 1 })
  return 0
}
```

`silk check` prints:

```text
src/main.silk:5:11: error[SEM0121] `main.Token: Copy` cannot be proved: the callee requires a `Copy` type argument here, and this type does not implement `Copy`
```

Fix: Pass a type that implements the bound, or implement it. See Generics, Interfaces and impls.

### SEM0123

A provider that matches no member of its concrete source requirement row.

```silk
import silk.effect {Effect}
service Clock { effect fn now() -> i32 ? &Clock }
service Dice { effect fn roll() -> i32 ? &Dice }
struct Fixed { n: i32 }
impl Dice for Fixed { effect fn roll(self: &Self) -> i32 { return self.n } }
effect fn stamp() -> i32 ? &Clock { return run Clock.now() }
pub fn main() -> i32 {
  let d = Fixed { n: 1 }
  return run stamp() |> Effect.provide(&d)
}
```

`silk check` prints:

```text
src/main.silk:9:14: error[SEM0123] The provider matches no compatible requirement
```

Fix: Provide a value whose type implements the required service. See Services and providers.

### SEM0125

Provider selection that retains more than one common requirement member.

```silk
import silk.effect {Effect}
role Audit
service Journal { effect fn read() -> i32 ? &Journal }
struct Book { n: i32 }
impl Journal for Book { effect fn read(self: &Self) -> i32 { return self.n } }
effect fn both() -> i32 ? &Journal | &Journal at Audit { return run Journal.read() }
pub fn main() -> i32 {
  let b = Book { n: 1 }
  let c = Book { n: 2 }
  return run both() |> Effect.provide(&b) |> Effect.provide(&c)
}
```

`silk check` prints:

```text
src/main.silk:10:14: error[SEM0125] The provider matches more than one requirement; select one explicitly
```

Fix: Select the requirement explicitly with `Effect.provide<Journal at Audit>(...)`, or give the rows distinct services. See Services and providers.

### SEM0126

An explicitly or independently selected row that is not exactly one member.

```silk
import silk.effect {Effect}
service Clock { effect fn now() -> i32 ? &Clock }
service Dice { effect fn roll() -> i32 ? &Dice }
struct Fixed { n: i32 }
impl Clock for Fixed { effect fn now(self: &Self) -> i32 { return self.n } }
effect fn stamp() -> i32 ? &Clock { return run Clock.now() }
pub fn main() -> i32 {
  let d = Fixed { n: 1 }
  return run stamp() |> Effect.provide<Clock | Dice>(&d)
}
```

`silk check` prints:

```text
src/main.silk:9:14: error[SEM0126] An explicitly or independently selected row that is not exactly one member
```

Message template, not filled by this compiler: `Selected requirement row has {count} members; exactly one is required`.

Fix: Select exactly one service: `Effect.provide<Clock>(&d)`. See Services and providers.

## SEM: returns, operators, enums, unions and static evaluation (SEM0129-SEM0184)

### SEM0129

An explicit return whose value violates the declaration result.

```silk
pub fn main() -> i32 {
  return true
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0129] Return expected i32 but received bool
```

Fix: Return a value of the declared result type. See Functions and methods.

### SEM0130

A reachable non-unit function fallthrough.

```silk
fn sign(n: i32) -> i32 {
  if n > 0 { return 1 }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:1: error[SEM0130] A reachable path must return i32
```

Fix: End every path with `return`. See Functions and methods.

### SEM0131

A provider whose key matches but whose access cannot satisfy the requirement.

```silk
import silk.effect {Effect}
service Counter { effect fn next() -> i32 ? &mut Counter }
struct Count { n: i32 }
impl Counter for Count {
  effect fn next(self: &mut Self) -> i32 {
    self.n = self.n + 1
    return self.n
  }
}
effect fn step() -> i32 ? &mut Counter { return run Counter.next() }
pub fn main() -> i32 {
  let c = Count { n: 0 }
  return run step() |> Effect.provide(&c)
}
```

`silk check` prints:

```text
src/main.silk:13:14: error[SEM0131] A provider whose key matches but whose access cannot satisfy the requirement
```

Message template, not filled by this compiler: `{provider} provider access cannot satisfy an {required} requirement`.

Fix: Provide with the access the row asks for: `Effect.provideMut(&mut c)` for `&mut Counter`. See Services and providers.

### SEM0133

A refutable pattern in an unconditional local binding.

```silk
import silk.option {Option}
pub fn main() -> i32 {
  let o = Option<i32>.some(1)
  let Option<i32>.Some {value} = move o
  return value
}
```

`silk check` prints:

```text
src/main.silk:4:7: error[SEM0133] A refutable pattern in an unconditional local binding
```

Message template, not filled by this compiler: `Let pattern is refutable for {actual}; it does not cover {missing}. Use if let or match`.

Fix: Use `if let` or `match` for a pattern that can fail. See Patterns and match, Bindings and statements.

### SEM0135

Operator syntax whose operator interface has no conformance accepting its operands.

```silk
pub fn main() -> i32 {
  let a: i64 = 1
  let b: i32 = 2
  let c = a + b
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:13: error[SEM0135] Operator + does not accept (i64, i32)
```

Fix: Convert one operand so both have the same type. See Expressions and operators.

### SEM0136

Operator syntax matched by more than one conformance of its operator interface.

```silk
import silk.ops {Add}
struct M { v: i32 }
fn addM(a: M, b: M) -> M { return M { v: a.v + b.v } }
fn addI(a: M, b: M) -> i32 { return a.v + b.v }
impl Add<M, M> for M { add: M.addM }
impl Add<M, i32> for M { add: M.addI }
pub fn main() -> i32 {
  let s = M { v: 1 } + M { v: 2 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:8:22: error[SEM0136] Operator syntax matched by more than one conformance of its operator interface
```

Message template, not filled by this compiler: `Operator {operator} is ambiguous between {candidates}`.

Fix: Keep one conformance of the operator interface per operand types and output. See Expressions and operators, Interfaces and impls.

### SEM0137

An unsafe acknowledgement that does not complete an unsafe invocation.

```silk
pub fn main() -> i32 {
  return unsafe 1 + 2
}
```

`silk check` prints:

```text
src/main.silk:2:10: error[SEM0137] `unsafe` must acknowledge a complete unsafe invocation
```

Fix: Put `unsafe` on the unsafe call itself, not on a wider expression. See Unsafe code and C interop.

### SEM0139

A concrete executable that fails one sealed static-property obligation.

```silk
import silk.effect {Effect}
import silk.fiber {Fiber}
effect fn work() -> i32 { return 1 }
effect fn cleanup() -> () { run Fiber.yieldNow() }
pub fn main() -> i32 {
  return run work() |> Effect.ensuringNonParking(cleanup())
}
```

`silk build` prints:

```text
src/main.silk:6:14: error[SEM0139] A concrete executable that fails one sealed static-property obligation
src/main.silk:5:8: error[SEM0225] Entry point `main` may park, but the selected runtime starts it without a scheduler, so it must not park
```

Message template, not filled by this compiler: `{property} is unsatisfied: {causes}`.

Fix: Give `Effect.ensuringNonParking` a cleanup that never parks. See Suspension and cancellation.

### SEM0143

`mut` where no mutable owned parameter storage exists.

```silk
interface Grow {
  fn grow(mut value: Self) -> Self
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:11: error[SEM0143] `mut` where no mutable owned parameter storage exists
```

Message template, not filled by this compiler: `` `mut` declares mutable owned parameter storage; use `&mut` for exclusive borrowed access `` / `` `mut` declares function-local owned parameter storage and is not valid in a service or interface contract ``.

Fix: Remove `mut` from parameters that have no owned storage, such as in interface signatures. See Interfaces and impls.

### SEM0146

A scalar enum with no declared members.

```silk
enum Color {}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0146] A scalar enum with no declared members
```

Message template, not filled by this compiler: `Enum {enumName} must declare at least one member`.

Fix: Declare at least one member. See Enums and unions.

### SEM0147

A scalar enum representation outside the fixed-width integer set.

```silk
enum(f32) Color { Red }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:6: error[SEM0147] A scalar enum representation outside the fixed-width integer set
```

Message template, not filled by this compiler: `{spelling} is not a scalar enum representation`.

Fix: Use a fixed-width integer representation such as `u8` or `i32`. See Enums and unions.

### SEM0148

A scalar enum member name repeated after its first declaration.

```silk
enum Color { Red, Red }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:19: error[SEM0148] Duplicate enum member name Red
  note: src/main.silk:1:14: related location
```

Fix: Give each member its own name. See Enums and unions.

### SEM0149

A scalar enum discriminant repeated after its first declaration.

```silk
enum Color { Red = 1, Green = 1 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:31: error[SEM0149] A scalar enum discriminant repeated after its first declaration
  note: src/main.silk:1:20: related location
```

Message template, not filled by this compiler: `Duplicate enum discriminant {value}`.

Fix: Give each member its own discriminant. See Enums and unions.

### SEM0150

An explicit scalar enum discriminant outside its representation range.

```silk
enum(u8) Color { Red = 300 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:24: error[SEM0150] An explicit scalar enum discriminant outside its representation range
```

Message template, not filled by this compiler: `Enum discriminant {value} is outside {representation}`.

Fix: Use a discriminant inside the representation range, or a wider representation. See Enums and unions.

### SEM0151

An implicit scalar enum successor outside its representation range.

```silk
enum(u8) Color { Red = 255, Green }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:29: error[SEM0151] An implicit scalar enum successor outside its representation range
```

Message template, not filled by this compiler: `Implicit enum discriminant after {predecessor} exceeds {representation}`.

Fix: Give the next member an explicit value in range, or widen the representation. See Enums and unions.

### SEM0152

A negative discriminant under an unsigned scalar enum representation.

```silk
enum(u8) Color { Red = -1 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:24: error[SEM0152] A negative discriminant under an unsigned scalar enum representation
```

Message template, not filled by this compiler: `Unsigned enum representation {representation} cannot hold {value}`.

Fix: Use a signed representation for negative discriminants. See Enums and unions.

### SEM0153

A member missing from a resolved scalar enum.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  let c = Color.Blue
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0153] A member missing from a resolved scalar enum
```

Message template, not filled by this compiler: `Enum {enumName} has no member {member}`.

Fix: Name a declared member. See Enums and unions.

### SEM0154

A canonical member used through or required by another enum.

```silk
enum Color { Red, Green }
enum Light { Red, Off }
pub fn main() -> i32 {
  let c: Color = Light.Red
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:18: error[SEM0154] A canonical member used through or required by another enum
```

Message template, not filled by this compiler: `Enum member of {actual} cannot be used as {expected}`.

Fix: Use the member of the expected enum: `Color.Red`. See Enums and unions.

### SEM0155

Implicit mixing between a scalar enum and an integer.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  let c: Color = 1
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:18: error[SEM0155] Implicit mixing between a scalar enum and an integer
```

Message template, not filled by this compiler: `{enumName} does not implicitly convert to {integer}` / `{integer} does not implicitly construct {enumName}`.

Fix: Use a member (`Color.Green`), or convert explicitly. See Enums and unions.

### SEM0156

Equality between distinct canonical scalar enums.

```silk
enum Color { Red, Green }
enum Light { On, Off }
pub fn main() -> i32 {
  if Color.Red == Light.On { return 1 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:16: error[SEM0156] Equality between distinct canonical scalar enums
```

Message template, not filled by this compiler: `Equality requires one enum type, not {left} and {right}`.

Fix: Compare values of the same enum. See Enums and unions.

### SEM0157

Direct ordering of scalar enum values.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  if Color.Red < Color.Green { return 1 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:16: error[SEM0157] Direct ordering of scalar enum values
```

Message template, not filled by this compiler: `Enum {enumName} does not support {operator}; compare backing values explicitly`.

Fix: Compare the discriminants, not the enum values. See Enums and unions.

### SEM0158

A scalar enum match that leaves canonical members uncovered.

```silk
enum Color { Red, Green, Blue }
pub fn main() -> i32 {
  let c = Color.Red
  return match c {
    Color.Red => 1
    Color.Green => 2
  }
}
```

`silk check` prints:

```text
src/main.silk:4:10: error[SEM0158] Match over Color does not cover Blue
```

Fix: Add the missing member arms, or a `_` arm. See Patterns and match.

### SEM0159

A repeated unguarded scalar enum member arm.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  let c = Color.Red
  return match c {
    Color.Red => 1
    Color.Red => 2
    Color.Green => 3
  }
}
```

`silk check` prints:

```text
src/main.silk:6:5: error[SEM0159] A repeated unguarded scalar enum member arm
  note: src/main.silk:5:5: related location
```

Message template, not filled by this compiler: `Duplicate enum match arm {member}`.

Fix: Remove the repeated arm. See Patterns and match.

### SEM0160

A scalar enum arm following an unguarded wildcard.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  let c = Color.Red
  return match c {
    _ => 0
    Color.Green => 3
  }
}
```

`silk check` prints:

```text
src/main.silk:6:5: error[SEM0160] Enum match arm is unreachable after `_`
```

Fix: Put the `_` arm last. See Patterns and match.

### SEM0161

A scalar enum pattern naming a member of another enum.

```silk
enum Color { Red, Green }
enum Light { On, Off }
pub fn main() -> i32 {
  let c = Color.Red
  return match c {
    Light.On => 1
    _ => 0
  }
}
```

`silk check` prints:

```text
src/main.silk:6:5: error[SEM0161] A scalar enum pattern naming a member of another enum
```

Message template, not filled by this compiler: `Enum pattern from {actual} cannot match {expected}`.

Fix: Use members of the subject's enum. See Patterns and match.

### SEM0162

An integer literal pattern used against a scalar enum.

```silk
enum Color { Red, Green }
pub fn main() -> i32 {
  let c = Color.Red
  return match c {
    0 => 1
    _ => 0
  }
}
```

`silk check` prints:

```text
src/main.silk:5:5: error[SEM0162] An integer literal pattern used against a scalar enum
```

Message template, not filled by this compiler: `Integer pattern {value} cannot match enum {enum_}`.

Fix: Match members, not integers. See Patterns and match.

### SEM0164

A nominal union declaration with no variants.

```silk
union Shape {}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0164] A nominal union declaration with no variants
```

Message template, not filled by this compiler: `Union {unionName} must declare at least one variant`.

Fix: Declare at least one variant. See Enums and unions.

### SEM0165

A repeated variant name within one nominal union.

```silk
union Shape { Empty, Empty }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:22: error[SEM0165] Duplicate union variant Empty
```

Fix: Give each variant its own name. See Enums and unions.

### SEM0166

A named-field variant whose braces contain no field.

```silk
union Shape { Circle {}, Empty }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:15: error[SEM0166] A named-field variant whose braces contain no field
```

Message template, not filled by this compiler: `Union variant {variantName} must omit braces or declare at least one field`.

Fix: Write a unit variant without braces: `Circle`. See Enums and unions.

### SEM0167

A variant selector absent from its resolved nominal union.

```silk
union Shape { Circle { radius: i32 }, Empty }
pub fn main() -> i32 {
  let s = Shape.Square
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0167] Union `Shape` has no variant `Square`
```

Fix: Name a declared variant. See Enums and unions.

### SEM0170

A duration literal whose exact nanosecond total exceeds `u64`.

```silk
pub fn main() -> i32 {
  let forever = 1000000000000h
  return 0
}
```

`silk check` prints:

```text
src/main.silk:2:17: error[SEM0170] Duration literal exceeds the u64 nanosecond range
```

Fix: Use a duration that fits in u64 nanoseconds (about 584 years). See Values and primitive types.

### SEM0171

Postfix referent projection whose subject is not a reference.

```silk
pub fn main() -> i32 {
  let n = 3
  return n.*
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0171] Postfix referent projection whose subject is not a reference
```

Message template, not filled by this compiler: `Cannot project a referent from {actual}; the subject must be a reference`.

Fix: Dereference only references. See Expressions and operators.

### SEM0172

Positional construction with the wrong number of tuple elements.

```silk
tuple Pair(i32, i32)
pub fn main() -> i32 {
  let p = Pair(1, 2, 3)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0172] Positional construction with the wrong number of tuple elements
```

Message template, not filled by this compiler: `{type} expects {expected} tuple elements but received {actual}`.

Fix: Pass one value per tuple element. See Structs, tuples and arrays.

### SEM0173

Using tuple syntax with a named struct or record syntax with a tuple.

```silk
struct Point { x: i32, y: i32 }
pub fn main() -> i32 {
  let p: Point = (1, 2)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:18: error[SEM0173] Using tuple syntax with a named struct or record syntax with a tuple
```

Message template, not filled by this compiler: `A contextual {expected} literal cannot construct {actual}`.

Fix: Construct a named struct with braces: `Point { x: 1, y: 2 }`. See Structs, tuples and arrays.

### SEM0176

Crossing from static evaluation into unavailable runtime work.

```silk
static fn double(n: i32) -> i32 { return n * 2 }
pub fn main() -> i32 {
  let n = 3
  let static d = double(n)
  return d
}
```

`silk check` prints:

```text
src/main.silk:4:25: error[SEM0176] reading the runtime value `n` is not available during static evaluation for x86_64-unknown-linux-gnu
```

Fix: Use only values known at compile time in static evaluation. See Static evaluation.

### SEM0177

A selected source-requested compile failure.

```silk
pub fn main() -> i32 {
  static if true {
    compileError("this target is not supported")
  }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:5: error[SEM0177] this target is not supported
```

When the `compileError` sits in a function that a call selects through a static argument, a note names the selecting call:

```silk
fn bar(static width: usize) -> usize {
  static if width == 0 {
    compileError("a bar needs a width")
  }
  return width
}
pub fn main() -> i32 {
  let w = bar(0)
  return 0
}
```

```text
src/main.silk:3:5: error[SEM0177] a bar needs a width
  note: src/main.silk:8:11: related location
```

The std lib's format templates use the same code. A template error is reported at your `Effect.log` or `Format.format` call, and its span covers the whole pipeline:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  run Effect.log("{name} has {count} tasks\n", &.{ name: "Julia", cuont: 3 })
    |> Effect.provideMut(&mut logger)
}
```

```text
src/main.silk:7:7: error[SEM0177] template field {count} not found; available visible fields: name, cuont
```

With a positional template, `"{} has {} tasks, {} open\n"` and `&("Julia", 3)`:

```text
src/main.silk:7:7: error[SEM0177] template placeholder 3 `{}` has no positional field; the arguments have 2
```

Fix: The text is the author's message. Change the static condition, target or profile, or the call that selected the branch. For a template, match each placeholder to a field. See Static control flow and reflection, and Text and formatting.

### SEM0178

A cycle in one demanded static application.

```silk
static fn forever(n: i32) -> i32 { return forever(n) }
pub fn main() -> i32 {
  let static x = forever(1)
  return x
}
```

`silk check` prints:

```text
src/main.silk:1:43: error[SEM0178] A cycle in one demanded static application
  note: src/main.silk:3:18: related location
```

Message template, not filled by this compiler: `Static evaluation of {application} is cyclic for {target}`.

Fix: Give the static recursion a base case. See Static evaluation.

### SEM0179

Exhausting the static evaluator's deterministic step budget.

```silk
static fn spin() -> i32 {
  let mut n = 0
  while true { n = n + 1 }
  return n
}
pub fn main() -> i32 {
  let static x = spin()
  return x
}
```

`silk check` prints:

```text
src/main.silk:3:24: error[SEM0179] Exhausting the static evaluator's deterministic step budget
  note: src/main.silk:7:18: related location
```

Message template, not filled by this compiler: `Static evaluation exceeded its step limit of {limit} for {target}`.

Fix: Let the static loop end within the step budget. See Static evaluation.

### SEM0180

Exhausting the static evaluator's logical call-depth budget.

```silk
static fn deep(n: i32) -> i32 {
  if n == 0 { return 0 }
  return deep(n - 1) + 1
}
pub fn main() -> i32 {
  let static x = deep(100)
  return x
}
```

`silk check` prints:

```text
src/main.silk:3:10: error[SEM0180] Exhausting the static evaluator's logical call-depth budget
  note: src/main.silk:6:18: related location
```

Message template, not filled by this compiler: `Static evaluation exceeded its call-depth limit of {limit} for {target}`.

Fix: Reduce static recursion depth. See Static evaluation.

### SEM0181

Exhausting the static evaluator's retained-value budget.

```silk
static fn big() -> [i64; 100000000] { return [0; 100000000] }
pub fn main() -> i32 {
  let static table = big()
  return 0
}
```

`silk check` prints:

```text
src/main.silk:1:46: error[SEM0181] Exhausting the static evaluator's retained-value budget
  note: src/main.silk:3:22: related location
```

Message template, not filled by this compiler: `Static evaluation exceeded its retained-value limit of {limit} bytes for {target}`.

Fix: Build smaller static values. See Static evaluation.

### SEM0183

A type alias whose target resolves back through the alias itself.

```silk
type A = B
type B = A
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:10: error[SEM0183] A type alias whose target resolves back through the alias itself
src/main.silk:2:10: error[SEM0183] A type alias whose target resolves back through the alias itself
```

Message template, not filled by this compiler: `Type alias {alias} is cyclic: {aliases}`.

Fix: Point the alias at a real type. See Generics.

### SEM0184

A generic type alias parameter that is bounded, of an unsupported kind, or unused.

```silk
type Same<T, U> = T
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:14: error[SEM0184] A generic type alias parameter that is bounded, of an unsupported kind, or unused
```

Message template, not filled by this compiler: `Type alias {alias} parameter {parameter} must be a type or lifetime parameter` / `Type alias {alias} parameter {parameter} does not occur in its target` / `Type alias {alias} parameter {parameter} cannot declare bounds; the target's bounds apply at each use`.

Fix: Use every alias parameter, without bounds. See Generics.

## SEM: C interop, impls, lifetimes and properties (SEM0187-SEM0245)

### SEM0185

A foreign function whose ABI string is not "C".

```silk
unsafe extern "Rust" fn abs(value: i32) -> i32
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:15: error[SEM0185] Foreign ABI "Rust" is not supported; only "C" is available
```

The declaration is refused whether or not it is called. The column is the ABI string.

Fix: Write `extern "C"`. See Unsafe code and C interop.

### SEM0186

A foreign function declared without the mandatory unsafe qualifier.

```silk
extern "C" fn abs(value: i32) -> i32
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0186] Foreign function abs must be declared unsafe
```

Fix: Declare it `unsafe extern "C" fn` and call it inside `unsafe { }`. See Unsafe code and C interop.

### SEM0187

A foreign parameter or result type outside the C-compatible scalar subset.

```silk
unsafe extern "C" fn flag(value: f64) -> bool
pub fn main() -> i32 { unsafe { if flag(1.0) { return 0 } } return 1 }
```

`silk check` prints:

```text
src/main.silk:2:36: error[SEM0187] A foreign parameter or result type outside the C-compatible scalar subset
```

A vector with no C vector type fills the template `{type} is not admitted by the {abi} ABI`: `mask<N>`, `simd<isize, N>` and `simd<usize, N>` print, for example, `mask<4> is not admitted by the C ABI`. For an imported function it is reported at each call, at the callee's name, and a declaration that is never called is not checked. For an `export "C"` function it is reported at the parameter or result type.

Fix: Use C scalar types (integers, `f32`, `f64`, raw pointers) in foreign signatures. `bool` is not one of them. See Unsafe code and C interop.

### SEM0188

Silk-only contract syntax retained on a foreign function declaration.

```silk
unsafe extern "C" fn first<T>(value: i32) -> i32
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:28: error[SEM0188] A foreign function declaration must not include generic parameters
```

The message names what is not allowed. Generic parameters, `static` and `effect` are each refused on an `extern` declaration. An exported function may not be an `effect fn` either, and the message names the export:

```silk
struct Problem {}
export "C" effect fn tick() -> i32 ! Problem { fail Problem {} }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:1: error[SEM0188] An `export "C"` function must not include effect
```

Fix: Declare the C function with concrete C types, and write any generic or effectful wrapper as an ordinary Silk function that calls it. Export a plain `fn`. See Unsafe code and C interop.

### SEM0189

Using a foreign function as a first-class value rather than calling it.

```silk
unsafe extern "C" fn abs(value: i32) -> i32
pub fn main() -> i32 {
  let f = abs
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:11: error[SEM0189] Using a foreign function as a first-class value rather than calling it
```

Message template, not filled by this compiler: `Foreign function {name} can only be called; it cannot be used as a first-class value`.

Fix: Call the foreign function inside `unsafe { ... }` instead of storing it. See Unsafe code and C interop.

### SEM0190

A native symbol that is not an ASCII identifier.

```silk
unsafe extern "C" fn abs(value: i32) -> i32 as "a-b"
pub fn main() -> i32 { unsafe { return abs(-3) - 3 } }
```

`silk check` prints:

```text
src/main.silk:1:48: error[SEM0190] A native symbol that is not an ASCII identifier
```

Message template, not filled by this compiler: `"{symbol}" is not a valid native symbol; use a letter or underscore followed by letters, digits, or underscores`.

Fix: Use an ASCII identifier as the symbol: `as "c_abs"`. See Unsafe code and C interop.

### SEM0191

A native symbol the compiler reserves for its own runtime or entry.

```silk
unsafe extern "C" fn abs(value: i32) -> i32 as "main"
pub fn main() -> i32 { unsafe { return abs(-3) - 3 } }
```

`silk check` prints:

```text
src/main.silk:1:48: error[SEM0191] A native symbol the compiler reserves for its own runtime or entry
```

Message template, not filled by this compiler: `Native symbol {symbol} is reserved by the compiler runtime`.

Fix: Use a symbol other than `main` or a runtime symbol. See Unsafe code and C interop.

### SEM0192

Two reachable declarations of one symbol with different C signatures.

```silk
export "C" fn twice(value: i32) -> i32 { return value * 2 }
unsafe extern "C" fn again(value: i64) -> i64 as "twice"
pub fn main() -> i32 { unsafe { let doubled = again(2) } return 0 }
```

`silk check` prints:

```text
src/main.silk:2:50: error[SEM0192] Two reachable declarations of one symbol with different C signatures
  note: src/main.silk:1:15: related location
```

Message template, not filled by this compiler: `Foreign symbol {symbol} is declared with a conflicting C signature or behavioral contract`.

Fix: Declare one C signature per symbol. See Unsafe code and C interop.

### SEM0194

An inherent impl head that is not the whole family of a module-local nominal.

```silk
impl i32 {
  fn double(self: &Self) -> i32 { return self.* * 2 }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:6: error[SEM0194] An inherent impl head that is not the whole family of a module-local nominal
```

Message template, not filled by this compiler: `impl {owner} cannot bound its binders; inherent members belong to every instantiation` / `impl {owner} must be declared in the module that declares {owner}` / `impl {owner} cannot use a type alias as its owner; name the aliased nominal type instead` / `impl {owner} must name a struct, union, enum, service, or interface declaration` / `impl {owner} must name the whole type family: its arguments are exactly the impl's own binders, in order, each once`.

Fix: Write inherent impls only for nominal types declared in the same module. See Functions and methods, Generics.

### SEM0195

An inherent impl member that cannot be an associated member.

```silk
struct Point { x: i32 }
impl Point {
  fn x(self: &Self) -> i32 { return 1 }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0195] Point.x collides with the field x of Point
```

A mapping member, `name: target`, is the same code in an inherent impl. Only a conformance maps operations:

```silk
struct Point { x: i32 }
fn make() -> Point { return Point { x: 0 } }
impl Point {
  origin: make
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:3: error[SEM0195] impl Point cannot map origin to another declaration; only a conformance maps operations
```

An inherent member named `drop` is the same code:

```silk
struct Point { x: i32 }
impl Point {
  fn drop(self: &mut Point) -> () {}
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:3: error[SEM0195] impl Point cannot declare a drop hook; declare impl Drop for Point instead
```

Fix: Rename the member. Inherent members cannot share a field name or be named `drop` (use `impl Drop`). Declare a member as a function, `fn origin() -> Point { return make() }`, instead of mapping it. See Functions and methods.

### SEM0196

Two inherent members of one owner sharing a name.

```silk
struct Point { x: i32 }
impl Point {
  fn make() -> Point { return Point { x: 0 } }
  fn make() -> Point { return Point { x: 1 } }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:6: error[SEM0196] Two inherent members of one owner sharing a name
src/main.silk:4:6: error[SEM0196] Two inherent members of one owner sharing a name
```

Message template, not filled by this compiler: `{owner}.{member} is declared more than once; one owner has at most one member of each name`.

Fix: Give each inherent member its own name. See Functions and methods.

### SEM0198

An associated function called on a value as though it had a receiver.

```silk
struct Point { x: i32 }
impl Point {
  fn origin() -> Point { return Point { x: 0 } }
}
pub fn main() -> i32 {
  let p = Point { x: 1 }
  let q = p.origin()
  return q.x
}
```

`silk check` prints:

```text
src/main.silk:7:13: error[SEM0198] An associated function called on a value as though it had a receiver
```

Message template, not filled by this compiler: `{owner}.{member} is an associated function without a receiver; call it as {owner}.{member}(...)`.

Fix: Call the associated function on the type: `Point.origin()`. See Functions and methods.

### SEM0200

A receiver operation declared by more than one bound of one type parameter.

```silk
interface Named { fn name(self: &Self) -> i32 }
interface Labeled { fn name(self: &Self) -> i32 }
fn show<T: Named + Labeled>(value: &T) -> i32 { return value.name() }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:62: error[SEM0200] A receiver operation declared by more than one bound of one type parameter
```

Message template, not filled by this compiler: `{member} is declared by more than one bound of {parameter} ({interfaces}); call it through the bound, as {calls}`.

Fix: Call through one interface: `Named.name(value)`. See Interfaces and impls.

### SEM0201

An `export "C"` function whose body may suspend.

```silk
import silk.fiber { Fiber }
export "C" fn waits() -> i32 {
  run Fiber<(), ()>.yieldNow()
  return 0
}
pub fn main() -> i32 { return 0 }
```

`silk build` prints:

```text
src/main.silk:2:1: error[SEM0201] Exported function waits may suspend; a C-callable body must be synchronous
```

Only a build reports it; `silk check` accepts the program. A C caller has no scheduler to resume a parked body, so the build refuses any exported body that can park, directly or through what it calls. The check is conservative and may refuse a body that would not park in practice.

Fix: Keep exported bodies synchronous. Do parking work in Silk code under a scheduler, not behind the C boundary. See Unsafe code and C interop, Suspension and cancellation.

### SEM0202

A receiver operation supplied by more than one of the receiver's conformances.

```silk
interface Named { fn name(self: &Self) -> i32 }
interface Labeled { fn name(self: &Self) -> i32 }
struct Point { x: i32 }
impl Named for Point { fn name(self: &Self) -> i32 { return 1 } }
impl Labeled for Point { fn name(self: &Self) -> i32 { return 2 } }
pub fn main() -> i32 {
  let p = Point { x: 0 }
  return p.name()
}
```

`silk check` prints:

```text
src/main.silk:8:12: error[SEM0202] name is supplied to main.Point by more than one interface (Named or Labeled); call it through one, as Named.name(...) or Labeled.name(...)
```

Fix: Call through one interface: `Named.name(&p)`. See Interfaces and impls.

### SEM0205

A C-layout record that declares type parameters.

```silk
extern "C" struct Pair<T> {
  left: i32,
  right: i32,
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0205] A C-layout record that declares type parameters
```

Message template, not filled by this compiler: `C-layout record {record} cannot declare type parameters`.

Fix: Remove the type parameters from the C-layout struct. See Unsafe code and C interop.

### SEM0206

A C-layout record field outside the closed C object subset.

```silk
extern "C" struct Flags {
  on: bool,
  name: string,
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:7: error[SEM0206] A C-layout record field outside the closed C object subset
src/main.silk:3:9: error[SEM0206] A C-layout record field outside the closed C object subset
```

Message template, not filled by this compiler: `Field {field} of C-layout record {record} has unsupported type {type}`.

Fix: Use C object types in C-layout fields: integers, floats, raw pointers, nested C-layout structs. See Unsafe code and C interop.

### SEM0209

An explicit lifetime does not name a binder in its lexical header scope.

```silk
fn first(values: &'a [i32]) -> &'a i32 { return &values[0] }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:19: error[SEM0209] Unknown lifetime 'a
```

Fix: Declare the lifetime: `fn first<'a>(values: &'a [i32]) -> &'a i32`. See Lifetimes.

### SEM0210

An omitted output region has no unique declaration-level input relationship.

```silk
fn pick(a: &i32, b: &i32) -> &i32 { return a }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:30: error[SEM0210] The omitted output lifetime has no unique input; name its lifetime explicitly
```

Fix: Name the lifetime: `fn pick<'a>(a: &'a i32, b: &i32) -> &'a i32`. See Lifetimes.

The most common case has no borrowed input at all, such as a function that returns a string literal:

```silk
fn noun() -> string { return "task" }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:14: error[SEM0210] The result is a borrow, but the function has no borrowed input it could come from; for a literal or other data that lives for the whole program, write `'static`, as in `string<'static>` or `&'static T`
```

Fix: Return text that lives for the whole program: `fn noun() -> string<'static> { return "task" }`. See Lifetimes.

### SEM0211

A lifetime binder or outlives bound has an unsupported declaration shape.

```silk
struct View<'a, 'a> { left: &'a i32 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:17: error[SEM0211] A lifetime binder or outlives bound has an unsupported declaration shape
```

Message template, not filled by this compiler: `Invalid lifetime binder: {detail}`.

Fix: Declare each lifetime once. See Lifetimes.

### SEM0212

A lifetime that must outlive another but is not known to.

```silk
fn keep(x: &'static i32) -> i32 { return x.* }
pub fn main() -> i32 {
  let local = 5
  return keep(&local)
}
```

`silk check` prints:

```text
src/main.silk:4:15: error[SEM0212] A lifetime that must outlive another but is not known to
```

Message template, not filled by this compiler: `Lifetime {longer} does not outlive {shorter}`.

Fix: Pass a borrow that lives long enough, or relax the bound: `x: &i32`. See Lifetimes.

### SEM0214

Rejected profile inputs, package schemas, defaults, or predicates.

```silk
pub param level: f64 = 1.0
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: a package parameter's type must be bool, an integer, a string, or a fixed array of them
```

Fix: Use `bool`, an integer, `string`, or a fixed array of them. See Package parameters.

### SEM0215

Invalid raw-pointer alignment, address space, or qualifier conversion.

```silk
fn f(p: *const align(3) i32) -> i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:16: error[SEM0215] Invalid raw-pointer alignment, address space, or qualifier conversion
```

Message template, not filled by this compiler: `Invalid pointer qualifier {qualifier}: {detail}`.

Fix: Use a power-of-two alignment and a valid address space. See Unsafe code and C interop.

### SEM0218

A `test` qualifier marks a function outside the finite executable test contract.

```silk
test fn probe(n: i32) -> () { return () }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:1:15: error[SEM0218] A `test` qualifier marks a function outside the finite executable test contract
```

Message template, not filled by this compiler: `Invalid test declaration: {detail}`.

A test with a requirement row is refused with the filled message, at the row:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.string { String }
test effect fn copies() -> () ! OutOfMemoryError ? &mut Allocator {
  let text = run String.copy("hi")
}
pub fn main() -> i32 { return 0 }
```

```text
src/main.silk:3:50: error[SEM0218] Invalid test declaration: a test cannot have a requirement row; the test runner provides no services, so provide them inside the test
```

Fix: Declare tests as `test fn name() -> ()` or a `test effect fn` with no parameters and no `?` row. Create and provide the services inside the test. See Functions and methods, and Testing in the Tools section.

### SEM0220

A sealed Drop or Copy head names `'static`, repeats one region, or bounds a region.

```silk
import silk.ownership { Drop }
struct View<'a> { left: &'a i32 }
impl Drop for View<'static> { fn drop(self: &mut Self) -> () { return () } }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:1: error[SEM0220] A sealed Drop or Copy head names `'static`, repeats one region, or bounds a region
```

Message template, not filled by this compiler: `{head} selects by region: it {selection}`.

Fix: Implement `Drop` or `Copy` for the generic head: `impl<'a> Drop for View<'a>`. See Ownership and moves.

### SEM0221

A member list follows an unwritten owner whose parameters the member uses (GEN-008).

```silk
union Maybe<T> { Some { value: T }, None }
impl<T> Maybe<T> {
  fn some(value: T) -> Maybe<T> { return Maybe<T>.Some { value: move value } }
}
pub fn main() -> i32 {
  let value = Maybe.some<i32>(1)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:6:25: error[SEM0221] A member list follows an unwritten owner whose parameters the member uses (GEN-008)
```

Message template, not filled by this compiler: `{owner}.{member} uses {owner}'s parameters, so its type arguments follow a written owner: {owner}<...>.{member}<...>`.

Fix: Write the owner's type arguments on the owner: `Maybe<i32>.some(1)`. See Generics.

### SEM0223

A non-alias resolution dependency cycle prevents resolving a declaration or value.

```silk
const A: i32 = B
const B: i32 = A
pub fn main() -> i32 { return A }
```

`silk check` prints:

```text
src/main.silk:1:16: error[SEM0223] Cannot resolve a non-alias dependency cycle
src/main.silk:2:16: error[SEM0223] Cannot resolve a non-alias dependency cycle
```

Fix: Break the cycle: give one constant a value that does not depend on the other. See Static evaluation.

### SEM0224

A unit nominal-union variant is written with a braced payload pattern (PATT-021).

```silk
union Status { Open, Done { at: i64 } }
fn seconds(status: Status) -> i64 {
  return match move status {
    Status.Open {} => 0
    Status.Done { at } => at
  }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:5: error[SEM0224] A unit nominal-union variant is written with a braced payload pattern (PATT-021)
```

Message template, not filled by this compiler: `Unit variant {variant} does not accept a payload pattern`.

Fix: Write a unit variant pattern without braces: `Status.Open`. See Patterns and match.

### SEM0225

A program entry `main` that the selected runtime cannot start.

```silk
pub fn main() -> u64 { return 0 }
```

`silk build` prints:

```text
src/main.silk:1:8: error[SEM0225] Entry point `main` has a result the selected runtime cannot start; the default runtime accepts i32, (), or an Effect producing () or i32 that requires at most `&mut HostInput`
```

The message describes the runtime that was selected. For a wasm32 build with `silk/wasm_start`, `pub effect fn main() -> i32` gives ``Entry point `main` has a result the selected runtime `silk/wasm_start` cannot start; it accepts i32, (), or an Effect producing () with no requirements``.

Fix: Return `i32` or `()` from `main`, or an Effect that produces one of them. See Program entry and termination.

### SEM0226

A match whose subject is a reference rather than the value it refers to.

```silk
union Status { Open, Done { at: i64 } }
fn seconds(status: &Status) -> i64 {
  return match status {
    Status.Open => 0
    Status.Done { at } => at
  }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:3:16: error[SEM0226] Cannot match reference `status` directly; match its referent with `match &status.*`
```

Fix: Match the referent: `match &status.*`. See Patterns and match.

### SEM0233

A written requirement row names one service-role key with both shared and exclusive access.

```silk
service Counter {
  effect fn next() -> i32 ? &mut Counter
}
effect fn both() -> i32 ? &Counter | &mut Counter {
  return run Counter.next()
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:4:38: error[SEM0233] A requirement row names the same service with both shared and exclusive access; write it once
```

Fix: Name the service once, with the strongest access: `? &mut Counter`. See Services and providers.

### SEM0234

A call that does not prove a `?S in R` requirement-row premise of its callee.

```silk
import silk.effect { Effect }

service Clock {}
service Logger {}

effect fn premised<?R, ?S>(work: once Effect<i32 ? S>) -> i32
? R
where S in R {
  return run move work
}

effect fn logged() -> i32 ? &mut Logger { return 2 }

effect fn mismatched() -> i32 ? &Clock {
  return run premised<&Clock, &mut Logger>(logged())
}

pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:15:14: error[SEM0234] This call does not prove the requirement premise `&mut main.Logger in &main.Clock`
```

Fix: Pass requirement rows that satisfy the callee's `where S in R` premise. See Services and providers.

### SEM0235

A header property clause, or a property argument, that the language does not define.

```silk
fn plain() -> i32 with Intrinsic.bogus(x: 3) { return 1 }
pub fn main() -> i32 { return plain() }
```

`silk check` prints:

```text
src/main.silk:1:19: error[SEM0235] This property clause names a property or property argument the language does not define
```

Fix: Use a property and argument the language defines. See Unsafe code and C interop, Intrinsics.

### SEM0236

A known header property clause written on a declaration that does not take it.

```silk
fn naked() -> i32 with Intrinsic.machine(naked: true) { return 0 }
pub fn main() -> i32 { return naked() }
```

`silk check` prints:

```text
src/main.silk:1:19: error[SEM0236] This property clause is not allowed on this declaration; `Intrinsic.foreign` and `Intrinsic.machine(naked:, noReturn:)` apply only to `extern "C"` or `export "C"` functions, and `Intrinsic.machine(features:)` only to other runtime functions
```

The same code covers `Intrinsic.machine(features:)` on an `extern "C"`, `export "C"` or `static` function, a `features:` clause with another field beside it, and either property on an interface or service operation.

Fix: Put `Intrinsic.foreign` and `Intrinsic.machine(naked:, noReturn:)` only on `extern "C"` or `export "C"` functions, and `Intrinsic.machine(features:)` alone on an ordinary `unsafe fn`. See Unsafe code and C interop, Intrinsics.

### SEM0237

An atomic intrinsic call whose memory order or element type the operation does not admit.

```silk
unsafe fn publish(pointer: *mut u32) -> () {
  unsafe { Intrinsic.atomicStore<u32>(pointer, 1, "acquire") }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
src/main.silk:2:51: error[SEM0237] This atomic operation does not admit this memory order or element type
```

The column points at the memory order. A store takes `"relaxed"`, `"release"` or `"sequentiallyConsistent"`, not `"acquire"`. The same code covers an arithmetic operation on a float, such as `Intrinsic.atomicFetchAdd<f64>`, a compare-exchange whose failure order is `"release"`, and a misspelled order such as `"seqCst"`.

Fix: Use an order the operation admits: `"release"` here. Most code should use `silk/atomic` instead of the intrinsics. See Intrinsics.

### SEM0238

A type named through a module import in a value position.

```silk
import silk.inflate
pub fn main() -> i32 {
  let format = inflate.Format.Gzip
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:16: error[SEM0238] Format is a type of module silk.inflate, which a value cannot reach through the module name; import it by name, as in `import silk.inflate { Format }`
```

A module import lets you name the module's types in type positions, such as `inflate.Format` in a signature, but not reach their members as values.

Fix: Import the type by name and use it directly: `import silk.inflate { Format }`, then `Format.Gzip`. See Modules and imports.

### SEM0239

A SIMD vector or mask type whose lane type or lane count is not admitted, or a SIMD operation used on a shape it does not take.

```silk
fn take(value: simd<bool, 4>) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
src/main.silk:1:16: error[SEM0239] A SIMD vector needs a numeric lane type and a power-of-two lane count with a total width of 16 to 512 bits; a mask needs a power-of-two lane count from 2 to 64
```

The column is the type. `simd<i32, 3>` is refused the same way, because 3 is not a power of two.

An `Intrinsic.simd*` member whose type arguments break one of its rules gets the same code with a message for that rule, at the call:

- ``Intrinsic.simdSqrt takes a SIMD vector with floating-point lanes, but simd<u8, 16> is not one``; `simdShiftLeft` asks for integer lanes and `simdMaskAny` for a mask.
- ``Intrinsic.simdConvert needs simd<u8, 16> and simd<f32, 4> to have the same lane count, but they have 16 and 4``.
- ``Intrinsic.simdBitcast needs simd<u32, 4> and simd<u32, 8> to have the same width in bits, but they have 128 and 256``.
- ``Intrinsic.simdShuffle needs simd<u32, 4> and simd<i32, 4> to have the same lane type, but they have u32 and i32``.
- ``Intrinsic.simdShuffle needs 4 static lane indices, one per result lane, each below 8``, at the indices. A `shuffle` from a `silk/simd` module prints this too, at your call to it.

An architecture member given a shape it does not take gets the same code, with the shapes it takes: ``Intrinsic.x86ShuffleBytes takes a first operand of simd<u8, 16> or simd<u8, 32>, but simd<u16, 8> is not one``. Intrinsics lists the shapes each one takes.

Fix: For a shape, use a numeric lane type and a lane count the message admits, such as `simd<i32, 4>`, or `mask<4>` for four boolean lanes. The `silk/simd` modules, such as `silk.simd.i32x4`, name the supported shapes and offer only the operations each lane type takes. For a member, give it the lanes it names, or vectors that agree in the measure it names. See [SIMD vectors and masks](/docs/reference/values-and-primitive-types#simd-vectors-and-masks) in Values and primitive types.

### SEM0240

A requirement for an optional service with exclusive access, `&Option<&mut S>`.

```silk
import silk.option { Option }

service Counter {
  effect fn bump() -> i32 ? &mut Counter
}

effect fn measure() -> i32 ? &Option<&mut Counter> {
  return 0
}

pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
src/main.silk:7:31: error[SEM0240] An optional service takes shared access only: an `Option` provider lends its service through a shared borrow, so nothing can provide `&Option<&mut S>`; require `&mut S`, or `&Option<&S>`
```

The column is the `Option` in the requirement row. The error is reported at the requirement, so a function that declares it is refused even before anything provides it.

Fix: Require `? &mut Counter` when the code needs exclusive access, or `? &Option<&Counter>` for an optional service with shared operations. See Services and providers.

### SEM0241

An architecture intrinsic whose target or CPU feature is not enabled for the function that calls it.

```silk
pub fn main() -> i32 {
  let bytes = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let picked = Intrinsic.x86ShuffleBytes<simd<u8, 16>>(bytes, bytes)
  return 0
}
```

`silk check` prints:

```text
src/main.silk:3:16: error[SEM0241] Intrinsic.x86ShuffleBytes needs x86_64 with ssse3, which this profile does not select; guard it with `static if Target.hasCpuFeature(...)` or list the feature in the function's `features`
```

The default x86-64 profile has SSE2 but not SSSE3. An `aarch64*` or `wasm*` member on x86-64 is refused the same way, as "needs aarch64 with neon" or "needs wasm32 with simd128".

Fix: Call the `silk/arch` wrapper, here `x86.shuffleBytes` from `silk.arch.x86`, which falls back to portable code. Or select the feature in the profile (`cpu.model = "x86-64-v2"`) and guard the call with `static if Target.hasCpuFeature("ssse3")`, or make the call from an `unsafe fn` with `with Intrinsic.machine(features: ("ssse3",))`. See Intrinsics and Targets and profiles.

### SEM0242

A `features` entry that is not a text literal naming a CPU feature of the target.

```silk
unsafe fn fast(value: u32) -> u32 with Intrinsic.machine(features: ("neon",)) {
  return value
}

pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
src/main.silk:1:69: error[SEM0242] neon is not a CPU feature of x86_64-unknown-linux-gnu; `features` lists text literals from the target's catalog
```

The column is the entry. A constant or another non-literal entry prints "a non-literal entry" in place of the name. An empty list, `features: ()`, prints `` `features` lists no CPU feature; name at least one text literal from the catalog of x86_64-unknown-linux-gnu, or remove the clause ``, at the `()`. Level names such as `"x86-64-v3"` are refused too: they are CPU models, not features.

Fix: List features from the target's catalog in Targets and profiles, as text literals. Put a function for another architecture under `static if Intrinsic.targetArchitecture() == "aarch64"` or the like, so other targets never check it.

### SEM0243

A function that lists CPU `features` but is not declared `unsafe`.

```silk
fn fast(value: u32) -> u32 with Intrinsic.machine(features: ("avx2",)) {
  return value
}

pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
src/main.silk:1:1: error[SEM0243] fast enables CPU features, so it must be declared `unsafe fn`; each caller proves the CPU has them
```

Running AVX2 code on a machine without AVX2 is undefined, so each call must be `unsafe`.

Fix: Declare it `unsafe fn fast(...)`, and call it inside `unsafe` after `CpuFeatures.detect()` from `silk/cpu` reports the features. See Intrinsics.

### SEM0244

A SIMD vector in a C call that the target's C ABI cannot pass in a vector register the profile selects.

```silk
unsafe extern "C" fn total(values: simd<f32, 8>) -> f32

pub fn main() -> i32 {
  let sum = unsafe total(Intrinsic.simdSplat<simd<f32, 8>>(1.0))
  if sum != 8.0 { return 1 }
  return 0
}
```

`silk check` prints:

```text
src/main.silk:4:20: error[SEM0244] simd<f32, 8> crosses the C boundary in one vector register, which needs the CPU feature `avx`; select it in the profile's `cpu`
```

For an imported function the column is the callee's name; each call is reported, and a declaration that is never called is not. An `export "C"` function is checked at its declaration, by `silk check` as well as `silk build`, at the vector type. On x86-64, 128-bit vectors need nothing, 256-bit ones `avx` and 512-bit ones `avx512f`. A width the target's C ABI has no register for prints the other form, as for `simd<u8, 8>` on x86-64: "simd<u8, 8> crosses the C boundary in one vector register, but x86_64-unknown-linux-gnu C passes no vector of that width". A function's own `features` list does not count.

Fix: Select the feature in the profile, as in `[profiles.fast.cpu] features = ["avx"]` or `model = "x86-64-v3"`, and build with `--profile fast`. Or pass the vector in 128-bit halves, or through a pointer. See Unsafe code and C interop and Targets and profiles.

### SEM0245

An anonymous function or `effect {}` block that the native compiler cannot specialize yet: one run from a function with `static` parameters, or one in a `static for` body.

```silk
import silk.effect { Effect }

effect fn again<'env, A, E, ?R>(mut action: mut Effect<'env; A ! E ? R>) -> A ! E ? R {
  return run action
}

effect fn one() -> i32 {
  return 1
}

effect fn scaled(static factor: i32) -> i32 {
  let got = run again(effect { return run one() })
  return got * factor
}

pub fn main() -> i32 {
  return run scaled(3)
}
```

`silk check` prints:

```text
src/main.silk:12:23: error[SEM0245] An `effect {}` block cannot run inside `scaled` yet: the native compiler does not specialize it for each argument of a `static` parameter; move the code that builds and runs it into a named function without `static` parameters and call that from `scaled`
```

The column is the block. An anonymous function prints "An anonymous function" in place of "An `effect {}` block". Inside a `static for` body the message is the other template: ``An `effect {}` block inside a `static for` body is not supported by the native compiler yet: every unrolled iteration would share its one declaration; move the code that builds and runs it into a named function and call that from the loop body``.

Fix: Move the code that builds and runs the block into a named function without `static` parameters, such as `effect fn oneAgain() -> i32 { return run again(effect { return run one() }) }`, and call it from `scaled` or from the loop body. See Writing effect combinators and Static control flow and reflection.

## Codes this compiler does not report

These SEM codes are in the catalog, but no path in this compiler reports them, or the case they describe is refused or accepted another way. The last column says what happened when the case was tried; "Not tried" means no reachable program was found.

| Code | Meaning | Catalog message | Tried | What happens |
| --- | --- | --- | --- | --- |
| SEM0059 | Passing an array where a slice is expected without an explicit borrow. | `Passing an array as {expected} requires an explicit borrow` | `sum(xs)` with `xs: [i32; 3]` for `&[i32]` | SEM0012 at the argument. |
| SEM0061 | A type that cannot inhabit an Effect failure channel. | `Effect failure {type} must be a detached ordinary value type` | `effect fn boom() -> i32 ! &i32` | SEM0210 for the elided lifetime. |
| SEM0068 | A mutable binding inside an effect recipe. | `Effect recipe bindings are immutable` | `let mut n` assigned inside `effect { }` | Accepted. |
| SEM0080 | Merging callable values from different construction sites without explicit erasure. | `Cannot merge callable values from different construction sites without explicit erasure` |  | Not tried. |
| SEM0089 | A failure or requirement row that cannot be finitely decomposed. | `Requirement row does not contain &mut {capability}@{role}` / `Requirement row does not contain &{capability}@{role}` / `Requirement {capability} has role {actual}, expected {expected}` / `Requirement {capability}@{role} has access {actual}, expected {expected}` / `Requirement row remainder is ambiguous across {parameters}` / `Requirement row specialization is not finite and concrete` / `Failure type does not contain selected member {member}` |  | Not tried. |
| SEM0093 | One reachable intrinsic unavailable on the requested execution target. | `{operation} is unavailable for {target}` |  | Not tried. |
| SEM0095 | A float literal spelling no floating-point value can represent. | `Invalid float literal: {spelling}` | `let x = 1e999` | Accepted by `check` and `build`, by design: a float literal too large for its type is infinity. |
| SEM0097 | A bound operation call whose receiver names more than one bounded parameter. | `{spelling} is ambiguous across bounded type parameters {parameters}` |  | Not tried. |
| SEM0100 | An explicit type argument contradicting the type its value arguments imply. | `Type argument {parameter} of {target} is {written}, but the supplied values imply {implied}` |  | Not tried. |
| SEM0101 | A bound operation whose selected witness has no lowering. | `{spelling} has no witness that can be lowered for {provider}` |  | Not tried. |
| SEM0103 | Constructing an aggregate that stores a bare callable value. | `Cannot construct {aggregate}: {site} would store the {kind} {callable}, whose environment layout depends on a hidden concrete identity that {aggregate} does not carry` / `Cannot construct {aggregate}: {site} retains the static identity of {callable}, but represented callable storage has no supported runtime layout` |  | Not tried. |
| SEM0104 | The first struct initializer that contradicts an inferred representation. | `Representation {parameter} was inferred as {expected}, but this initializer uses {actual}` |  | Not tried. |
| SEM0105 | The first exact representation that diverges at a static value join. | `Cannot join {expected} with {actual}; consume each represented value inside its branch before joining` |  | Not tried. |
| SEM0106 | A representation argument whose contract cannot satisfy its required bound. | `Representation {parameter} requires {required}, but the supplied bound {actual} is not admissible` |  | Not tried. |
| SEM0107 | Storing a represented Effect before its runtime layout is supported. | `Cannot construct {aggregate}: {site} retains the static identity of {effect}, but represented Effect storage has no supported runtime layout` |  | Not tried. |
| SEM0122 | A complete application that reaches the instance frontier with open rows or evidence. | `{declaration} reaches a complete application with unresolved contract rows or evidence` |  | Not tried. |
| SEM0124 | Provider relations sharing a selector but retaining disjoint candidate sets. | `Provider constraints select incompatible requirement members` |  | Not tried. |
| SEM0127 | A surviving provider candidate with more than one conformance witness. | `More than one conformance witness can provide the selected requirement` |  | Not tried. |
| SEM0128 | A surviving provider candidate whose conformance mapping is invalid. | `The provider's conformance mapping is invalid: {reason}` |  | Not tried. |
| SEM0132 | An Effect join whose alternatives cannot be represented as a finite composite. | `Cannot form a finite Effect join: {detail}` |  | Not tried. |
| SEM0138 | A statically known allocation/layout specialization mismatch. | `Local-shared allocation was planned for {actual}, not {expected}` |  | Not tried. |
| SEM0141 | An ordinary capability conjoined with one exact executable bound. | `{conjunct} is not a sealed executable property` |  | Not tried. |
| SEM0142 | A statically known execution-package allocation/layout mismatch. | `Execution allocation was planned for {actual}, not {expected}` |  | Not tried. |
| SEM0145 | Mutating an outer callable from a deferred effect recipe. | `A deferred effect cannot mutate captured callable binding {spelling}` |  | Not tried. |
| SEM0163 | Effect-block return sites whose success types disagree. | `Effect block return sites have incompatible types: {types}` | `effect { if true { return 1 } return true }` | Accepted: the result type is `i32 \| bool`. |
| SEM0168 | A variant qualifier that does not name a nominal union. | `Expected a nominal union, found {actual}` | corpus program `inherent-head-bound-member-value` | SEM0212. |
| SEM0169 | Construction through an incomplete nominal union declaration. | `Cannot construct invalid nominal union {unionName}` |  | Not tried. |
| SEM0174 | Attempting to join distinct anonymous aggregate occurrences. | `Separate anonymous aggregate occurrences do not acquire a common type` |  | Not tried. |
| SEM0175 | Attempting named-field construction of a positional aggregate. | `{type} is positional and cannot be constructed with named fields` | `Pair { first: 1, second: 2 }` for `tuple Pair(i32, i32)` | SEM0018. |
| SEM0182 | Exhausting the static evaluator's residual-growth budget. | `Static evaluation exceeded its residual-growth limit of {limit} nodes for {target}` |  | Not tried. |
| SEM0193 | One reachable foreign call unavailable on the requested execution surface. | `Foreign function {symbol} is unavailable for {surface}` |  | Not tried. |
| SEM0197 | A selective import naming an inherent member as if it were a root declaration. | `{module} has no root declaration {member}; it is a member of {owner}, so import {owner} and write {owner}.{member}` | `import shapes { area }` for an inherent member | SEM0014. |
| SEM0203 | Naming a conformance-supplied receiver operation as a value instead of calling it. | `{member} is supplied to {receiver} by an interface and must be called; it has no value form` | `let f = p.name` for an interface method | SEM0027. |
| SEM0207 | A value that cannot become an exact noncapturing C callback address. | `{name} cannot be used as a C callback: {detail}` |  | Not tried. |
| SEM0208 | Reachable C data on an execution surface without native symbol linkage. | `Foreign static {symbol} is unavailable on {surface}; C data symbols require native LLVM linkage` |  | Not tried. |
| SEM0213 | A type that must remain valid for a lifetime but is not known to. | `Type {type} does not remain valid for {lifetime}` |  | Not tried. |
| SEM0216 | A diagnostic observer callback lacks a complete direct-execution proof. | `Diagnostic observer callback requires direct execution: {detail}` |  | Not tried. |
| SEM0217 | Terminal observation is provably outside a selected failure handler. | `Terminal diagnostic observation requires a selected failure context` |  | Not tried. |
| SEM0219 | Emitted code references a function instance whose valid body native lowering does not support yet. | `Native lowering does not support this function body yet` |  | Not tried. |
| SEM0222 | A namespace-qualified type named where a value is required (NAME-005). | `{member} in {module} is a type, not a value; select it with an import and write {member}.<member> for its members` | `let format = inflate.Format.Gzip` after `import silk.inflate` | SEM0238. |
