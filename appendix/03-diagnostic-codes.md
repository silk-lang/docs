# Diagnostic codes

Every compiler error carries a stable code: three letters for the family and four digits. This page lists every code in the compiler's catalog, with a failing program, the exact output and the fix.

## Reading a diagnostic

A diagnostic prints as `path:line:column: error[CODE] message`. When the compiler knows a second place that matters, such as the earlier declaration a duplicate clashes with, an indented `note: path:line:column: related location` line follows it. `silk check --json` prints one JSON object per diagnostic with `code`, `line`, `column`, `message`, `notes` and `related` locations. A failed check or build exits with status 1.

The message is either a filled-in template, such as `Unknown type Size`, or, when the compiler cannot fill the template, the code's one-line meaning, such as `` A conditional whose condition is not `bool`  ``. The meaning names the rule but not the names or values involved; read the line and column. Entries below give the template when the printed message is the meaning.

A construct the compiler parses but cannot compile yet is not a coded error. It prints `unsupported: this construct is not supported by the native compiler yet` or `unsupported[Reason] not supported by the native compiler yet`, and the command exits with status 2.

| Family | Phase | Codes |
| --- | --- | --- |
| LEX | Lexing literals | LEX0001-LEX0012. This compiler reports none of them; see LEX. |
| PAR | Parsing | PAR0001-PAR0007 |
| MOD | Module and package resolution | MOD0001-MOD0004 |
| OWN | Ownership, moves and loans | OWN0001-OWN0020 |
| SEM | Names, types, effects and everything else | SEM0001-SEM0237 |

There is no LAY family. Gaps in the numbering are codes that were retired; they are never reused.

Each example is the whole `src/main.silk` of a package named `demo` in `/home/you/demo`, run with `silk check` unless the entry says `silk build`. Output lines are quoted as printed. Codes the compiler never reports are listed in the last section.

## LEX: literals

The catalog defines twelve lexical codes for malformed literals. This compiler never prints them: a malformed number is a PAR0002 parse error at the literal, and a malformed string, character, byte string or duration is an `unsupported` refusal (exit status 2). The table gives the catalog message, a failing literal and what `silk check` prints for it.

| Code | Catalog message | Failing literal | Printed instead |
| --- | --- | --- | --- |
| LEX0001 | Unsupported byte sequence | `$5` | ``error[PAR0002] Unexpected `$`; expected valid syntax`` |
| LEX0002 | Unknown static-literal modifier: {modifier} | `x"hello"` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0003 | Unterminated {subject} literal | `"hello` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0004 | Base-{radix} integer literal without digits | `0x` | ``error[PAR0002] Unexpected `0x`; expected valid syntax`` |
| LEX0005 | Digit separator must sit between two digits | `1_000_` | ``error[PAR0002] Unexpected `1_000_`; expected valid syntax`` |
| LEX0006 | Float literal exponent must have at least one digit | `1.5e` | ``error[PAR0002] Unexpected `1.5e`; expected valid syntax`` |
| LEX0007 | Character literal must hold exactly one Unicode scalar, but holds {scalars} | `'ab'` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0008 | Duration components require whole decimal amounts | `1.5s` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0009 | Unknown duration unit {spelling} | `5sec` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0010 | Duration unit {unit} may appear only once | `1h2h` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0011 | Duration unit {unit} must not follow {previous} | `30s2m` | `unsupported: this construct is not supported by the native compiler yet` |
| LEX0012 | Subordinate {unit} component {amount} exceeds {maximum} | `1h75m` | `unsupported: this construct is not supported by the native compiler yet` |

For `$5` the parser also reports SEM0087 at the `5`, because it reads the number as an expression statement.

The well-formed spellings `0x0F`, `1_000_000`, `1.5e3`, `'a'`, `"hello"`, `b"hello"`, `1500ms`, `1h15m` and `2m30s` all pass `silk check`. See Lexical structure and Values and primitive types.

## PAR: parsing

### PAR0001

One required token that is absent at its insertion position.

```silk
struct Point {
  x: i32
  y i32
}
pub fn main() -> i32 {
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:5: error[PAR0001] Expected `:`
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
/home/you/demo/src/main.silk:2:16: error[PAR0002] Unexpected `;`; expected valid syntax
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
/home/you/demo/src/main.silk:2:14: error[PAR0003] Template syntax is reserved but not implemented
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
/home/you/demo/src/main.silk:1:13: error[PAR0004] An import whose reserved final path segment cannot form an implicit binding
```

Message template, not filled by this compiler: `Reserved module segment {spelling} requires an explicit alias or selected-member list`.

Fix: Import members instead, as in `import silk.effect { Effect }`, or add `as name`. See Modules and imports.

### PAR0005

An expression child beyond the parser's supported nesting depth.

The example is `let deep = (((...(1)...)))` with 257 pairs of parentheses on line 2 of `main`.

`silk check` prints:

```text
/home/you/demo/src/main.silk:2:271: error[PAR0005] An expression child beyond the parser's supported nesting depth
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
/home/you/demo/src/main.silk:2:3: error[PAR0006] `loop` is not a Silk keyword; write an unbounded loop as `while true { ... }`
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
/home/you/demo/src/main.silk:2:10: error[PAR0007] `?T` is not a Silk type; write an optional type as `Option<T>`
```

The error is reported once, at the `?`, wherever a type is expected: a `let`, a parameter, a return type, a field or a `param`. The rest of the declaration is still checked, so `param o: ?i32 = 1` reports PAR0007 alone. Inside type arguments, as in `Option<?i32>`, `?` starts a requirement row instead, and the error is SEM0088. Nullable pointers `?*T` and `?R` requirement rows are not affected.

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
/home/you/demo/src/main.silk:1:8: error[MOD0001] Unknown module silk.lists
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
/home/you/demo/src/main.silk:1:8: error[MOD0002] An import redundantly naming its own containing module
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
root = "src/main.silk"

[dependencies]
shapes = { path = "../shapes" }
```

`/home/you/shapes/silk.toml`:

```toml
[package]
name = "shapes"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/lib.silk"
source-root = "src"
exports = ["lib"]

[build]
artifact = "static-library"
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
/home/you/demo/src/main.silk:1:8: error[MOD0003] Module Secret is not exported by package shapes@0.1.0
```

Fix: Import an exported module, or add the module to `exports` in the dependency's `silk.toml`. See Modules and imports, The manifest.

### MOD0004

An import under the reserved module names `silk` or `Intrinsic` that names no standard-library module or intrinsic.

```silk
import Intrinsic { replace }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:8: error[MOD0004] Module Intrinsic cannot be imported: `silk` and `Intrinsic` are reserved module names, so a local module cannot use them
```

Any import of `Intrinsic` or a path under it, such as `import Intrinsic.helpers { hi }`, is MOD0004. An unknown `silk.` path, such as `import silk.nope`, is MOD0001 instead. A local module named `silk` or `Intrinsic` at the top of the source root is refused before checking starts, with `silk: invalid module ...` and exit status 1.

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
/home/you/demo/src/main.silk:6:14: error[OWN0001] t.value was moved and cannot be used again
  note: /home/you/demo/src/main.silk:5:16: related location
```

Fix: Stop using the binding after the move, or copy out what you need first: `let v = t.value` before `take(move t)`. See Ownership and moves.

### OWN0002

A partial move out of a place whose boundary keeps the owner whole.

```silk
import silk.ownership { Drop }
struct Token { value: i32 }
impl Drop for Token { fn drop(self: &mut Token) -> () { return () } }
struct Pair { kept: Token  lost: Token }
fn pair() -> Pair { return Pair { kept: Token { value: 1 }, lost: Token { value: 2 } } }
fn first() -> Token {
  return pair().kept
}
pub fn main() -> i32 { return first().value }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:7:10: error[OWN0002] This place crosses a boundary that does not support partial moves
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
/home/you/demo/src/main.silk:5:15: error[OWN0003] Moving t requires an explicit move
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
/home/you/demo/src/main.silk:6:3: error[OWN0004] An assignment whose right side consumes the owner it is about to replace
```

Message template, not filled by this compiler: `Assignment to {spelling} consumes the same owner before replacement commits`.

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
/home/you/demo/src/main.silk:6:3: error[OWN0005] A loop whose body leaves owner liveness different from what its next iteration expects
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
/home/you/demo/src/main.silk:4:42: error[OWN0006] Borrowed pattern binding value cannot escape its match arm
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
/home/you/demo/src/main.silk:3:10: error[OWN0007] An exclusive match over a binding that is not declared mutable
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
/home/you/demo/src/main.silk:6:29: error[OWN0008] Match guard cannot consume pattern binding value
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
/home/you/demo/src/main.silk:4:10: error[OWN0009] A borrowing match whose scrutinee is not a complete binding place
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
/home/you/demo/src/main.silk:6:8: error[OWN0010] A mutable borrowed-view loan conflicts with an active shared loan
  note: /home/you/demo/src/main.silk:5:14: related location
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
/home/you/demo/src/main.silk:5:3: error[OWN0011] An owner access that conflicts with an active borrowed-view loan
  note: /home/you/demo/src/main.silk:4:14: related location
/home/you/demo/src/main.silk:6:10: error[OWN0019] A borrowed value is used beyond the validity of its referent
  note: /home/you/demo/src/main.silk:4:14: related location
```

Message template, not filled by this compiler: `{access} access to {spelling} conflicts with an active borrowed-view loan`.

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
/home/you/demo/src/main.silk:4:15: error[OWN0012] A non-Copy value cannot be moved out through a borrowed-view place
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
/home/you/demo/src/main.silk:3:10: error[OWN0014] Invoking a stored callable through too weak an aggregate receiver access
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
/home/you/demo/src/main.silk:4:10: error[OWN0015] Running a stored Effect through too weak an aggregate receiver access
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
/home/you/demo/src/main.silk:7:3: error[OWN0016] An access-scoped local-shared borrow escaping or crossing suspension
  note: /home/you/demo/src/main.silk:15:10: related location
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
/home/you/demo/src/main.silk:4:5: error[OWN0018] Returning a callable or Effect that borrows storage owned by the returning function
  note: /home/you/demo/src/main.silk:3:10: related location
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
/home/you/demo/src/main.silk:8:10: error[OWN0019] A borrowed value is used beyond the validity of its referent
  note: /home/you/demo/src/main.silk:3:18: related location
```

Message template, not filled by this compiler: `Lifetime {lifetime} does not remain valid at this use`.

Fix: Declare every referent before the borrow and in the same or an outer block, so it outlives each use. See Lifetimes, Borrowing.

### OWN0020

An owner cannot be preserved by the suspension frame at this run boundary.

The catalog documents OWN0020 but defines no code for it, so no compiler path can report it.

## SEM: names, types and patterns (SEM0001-SEM0058)

### SEM0001

A type name that resolves to no type.

```silk
fn size() -> Size { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:14: error[SEM0001] Unknown type Size
```

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
/home/you/demo/src/main.silk:2:19: error[SEM0002] A literal outside its selected integer range
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
/home/you/demo/src/main.silk:2:4: error[SEM0003] Duplicate declaration name area
  note: /home/you/demo/src/main.silk:1:4: related location
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
/home/you/demo/src/main.silk:2:10: error[SEM0004] Unknown function total
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
/home/you/demo/src/main.silk:1:16: error[SEM0005] Duplicate parameter name a
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
/home/you/demo/src/main.silk:2:10: error[SEM0006] Unknown value count
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
/home/you/demo/src/main.silk:3:10: error[SEM0007] Expected 2 arguments but received 3
```

Fix: Pass exactly the declared number of arguments. See Functions and methods, Closures and callable types.

### SEM0008

A binding whose name repeats a parameter or an earlier binding.

```silk
pub fn main() -> i32 {
  let n = 1
  let n = 2
  return n
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:7: error[SEM0008] A binding whose name repeats a parameter or an earlier binding
```

Message template, not filled by this compiler: `Cannot rebind {spelling}`.

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
/home/you/demo/src/main.silk:2:10: error[SEM0009] Unknown name u32; is `import silk.u32` missing?
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
/home/you/demo/src/main.silk:6:17: error[SEM0010] A known actor called with an unknown operation name
```

Message template, not filled by this compiler: `{actor} has no operation {spelling}`.

Fix: Call an operation the type declares, here `Point.make()`. See Functions and methods.

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
/home/you/demo/src/main.silk:3:6: error[SEM0011] A conditional whose condition is not `bool`
```

Message template, not filled by this compiler: `Condition must be bool, found {actual}`.

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
/home/you/demo/src/main.silk:4:13: error[SEM0012] Expected i64 but received i32
```

Fix: Pass the parameter type. Integers do not widen implicitly: use `i32.toI64(small)` after `import silk.i32`. See Functions and methods.

### SEM0014

An import or qualified reference naming a member its module does not declare.

```silk
import silk.list {Stack}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:19: error[SEM0014] Module silk/list has no member Stack
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
/home/you/demo/src/main.silk:1:16: error[SEM0015] An import or qualified reference naming a private member of another module
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
/home/you/demo/src/main.silk:1:19: error[SEM0016] Two bindings in one scope claiming the same spelling
```

Message template, not filled by this compiler: `Multiple bindings claim {spelling}`.

Fix: Rename the local declaration, or import under another name with `as`. See Modules and imports.

### SEM0017

A struct declaration that names one field twice.

```silk
struct Point { x: i32 x: i32 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:23: error[SEM0017] Duplicate field name x
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
/home/you/demo/src/main.silk:2:12: error[SEM0018] Expected a type, found size
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
/home/you/demo/src/main.silk:2:20: error[SEM0019] A public declaration whose signature mentions a private type
```

Message template, not filled by this compiler: `Public declaration exposes private type {type}`.

Fix: Make the type `pub`, or make the function private. See Functions and methods.

### SEM0021

Constructing a struct at a site where its raw constructor is not available.

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
/home/you/demo/src/main.silk:3:11: error[SEM0021] Constructing a struct at a site where its raw constructor is not available
```

Message template, not filled by this compiler: `Cannot construct {type} because its raw constructor is not available at this site`.

Fix: Construct the struct through a `pub` function of its module, or make every field `pub`. See Structs, tuples and arrays, Modules and imports.

### SEM0022

A struct literal naming a field its type does not declare.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2, z: 3 }
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:31: error[SEM0022] main.Point has no field z
```

Fix: Initialize only declared fields. See Structs, tuples and arrays, Enums and unions.

### SEM0023

A struct literal that initializes one field twice.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, x: 2, y: 3 }
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:25: error[SEM0023] A struct literal that initializes one field twice
```

Message template, not filled by this compiler: `Field {field} is initialized more than once`.

Fix: Initialize each field once. See Structs, tuples and arrays, Enums and unions.

### SEM0024

A struct literal that omits a declared field.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1 }
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:11: error[SEM0024] A struct literal that omits a declared field
```

Message template, not filled by this compiler: `Missing initializer for {type}.{field}`.

Fix: Initialize every field. See Structs, tuples and arrays, Enums and unions.

### SEM0025

A struct literal field whose value mismatches the field type.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: true }
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:28: error[SEM0025] Field y expects i32 but received bool
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
/home/you/demo/src/main.silk:3:12: error[SEM0026] A field projection on a value that is not a struct
```

Message template, not filled by this compiler: `Cannot project a field from {actual}`.

Fix: Project fields only from structs. See Structs, tuples and arrays.

### SEM0027

A field projection naming a field its struct does not declare.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  return p.z
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:4:12: error[SEM0027] main.Point has no field z
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
/home/you/demo/src/main.silk:4:12: error[SEM0028] A field projection naming a private field of another module's struct
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
/home/you/demo/src/main.silk:2:15: error[SEM0029] An empty array literal needs an expected Array type
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
/home/you/demo/src/main.silk:2:26: error[SEM0030] An array literal element whose type mismatches the element type
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
/home/you/demo/src/main.silk:2:22: error[SEM0031] An array literal whose element count differs from its expected length
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
/home/you/demo/src/main.silk:4:10: error[SEM0032] Indexing a value whose type does not support indexing
```

Message template, not filled by this compiler: `Cannot index {actual}`.

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
/home/you/demo/src/main.silk:4:13: error[SEM0033] An index expression whose type is not `usize`
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
/home/you/demo/src/main.silk:3:13: error[SEM0034] A statically known index outside an array's known length
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
/home/you/demo/src/main.silk:3:3: error[SEM0035] Cannot assign through immutable binding n
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
/home/you/demo/src/main.silk:3:3: error[SEM0036] Assignment requires a writable binding, field, or indexed place
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
/home/you/demo/src/main.silk:3:7: error[SEM0037] Assignment expected i32 but received bool
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
/home/you/demo/src/main.silk:2:3: error[SEM0038] `break` or `continue` outside any loop
```

Message template, not filled by this compiler: `{transfer} is only valid inside a loop`.

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
/home/you/demo/src/main.silk:2:16: error[SEM0039] A structural union member that is not a detached ordinary value with finite storage
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
/home/you/demo/src/main.silk:1:48: error[SEM0040] A union conversion whose source has members its target lacks
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
/home/you/demo/src/main.silk:4:5: error[SEM0042] A match arm naming a member its scrutinee type does not have
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
/home/you/demo/src/main.silk:7:5: error[SEM0043] A match arm that earlier arms already cover
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
/home/you/demo/src/main.silk:4:10: error[SEM0044] Match does not cover Empty
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
/home/you/demo/src/main.silk:4:10: error[SEM0045] Match guard must be bool, found i32
```

Fix: Write a `bool` guard: `_ if n > 2`. See Patterns and match.

### SEM0046

A struct pattern that omits a field without a trailing `..`.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let Point { x } = move p
  return x
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:4:7: error[SEM0046] A struct pattern that omits a field without a trailing `..`
```

Message template, not filled by this compiler: `Pattern for {type} is missing field {field}; add it or use ..`.

Fix: Name every field or end the pattern with `..`: `Point { x, .. }`. See Patterns and match.

### SEM0047

A struct pattern that names one field twice.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let Point { x, x: other, y } = move p
  return x
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:4:18: error[SEM0047] A struct pattern that names one field twice
```

Message template, not filled by this compiler: `Pattern field {field} appears more than once`.

Fix: Name each field once. See Patterns and match.

### SEM0048

A pattern binding whose spelling collides with an existing declaration.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let x = 0
  let p = Point { x: 1, y: 2 }
  let Point { x, y } = move p
  return y
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:5:15: error[SEM0048] A pattern binding whose spelling collides with an existing declaration
```

Message template, not filled by this compiler: `Pattern binding {spelling} conflicts with an existing declaration`.

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
/home/you/demo/src/main.silk:7:10: error[SEM0049] Match arms whose result types have no common type
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
/home/you/demo/src/main.silk:1:12: error[SEM0050] Duplicate type parameter T
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
/home/you/demo/src/main.silk:3:10: error[SEM0051] An application with the wrong number of type arguments
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
/home/you/demo/src/main.silk:3:11: error[SEM0052] Cannot infer all type arguments for Option.none from supplied values
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
/home/you/demo/src/main.silk:1:1: error[SEM0053] Recursion that re-specializes its callee with different type arguments
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
/home/you/demo/src/main.silk:7:14: error[SEM0056] A borrowed view requires a direct stable owner or borrowed view
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
/home/you/demo/src/main.silk:4:13: error[SEM0057] An exclusive borrow of a binding that is not declared mutable
```

Message template, not filled by this compiler: `Exclusive borrowing requires mutable binding {spelling}`.

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
/home/you/demo/src/main.silk:2:33: error[SEM0058] A shared view cannot be reborrowed exclusively
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
/home/you/demo/src/main.silk:2:18: error[SEM0060] usize literals cannot be negative
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
/home/you/demo/src/main.silk:2:21: error[SEM0062] Only effect functions may declare a failure channel
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
/home/you/demo/src/main.silk:3:3: error[SEM0063] Only effect functions may originate a typed failure
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
/home/you/demo/src/main.silk:4:8: error[SEM0064] An effect function failing with a type its signature does not declare
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
/home/you/demo/src/main.silk:3:14: error[SEM0065] `run` applied to a value that is not an effect
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
/home/you/demo/src/main.silk:6:10: error[SEM0066] A `run` whose failures the enclosing signature does not declare
```

Message template, not filled by this compiler: `Run leaves unhandled failures: {failures}`.

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
/home/you/demo/src/main.silk:7:14: error[SEM0067] An `Effect.catch` handler that does not fit the failures it handles
```

Message template, not filled by this compiler: `Invalid Effect.catch handler: {detail}`.

Fix: Make the handler take the failure type it handles: `Effect.catch<Missing>(load(), recover)` with `recover(error: Missing)`. See Typed failures.

### SEM0070

A non-concrete or non-nominal capability in a requirement row.

```silk
effect fn count() -> i32 ? &mut i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:28: error[SEM0070] A non-concrete or non-nominal capability in a requirement row
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
/home/you/demo/src/main.silk:6:10: error[SEM0071] A `run` whose requirements the enclosing signature does not provide
```

Message template, not filled by this compiler: `Run leaves unsatisfied requirements: {requirements}`.

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
/home/you/demo/src/main.silk:3:10: error[SEM0075] A call whose callee is not callable
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
/home/you/demo/src/main.silk:10:20: error[SEM0076] A callable value whose signature cannot satisfy the expected callable type
```

Message template, not filled by this compiler: `Callable {actual} cannot satisfy {expected}`.

Fix: Pass a callable or Effect whose mode and environment fit the parameter. Take `once Effect` to run it once. See Closures and callable types.

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
/home/you/demo/src/main.silk:4:3: error[SEM0077] Invoking a stored callable through a place without the access its contract requires
```

Message template, not filled by this compiler: `Callable invocation requires {required} access`.

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
/home/you/demo/src/main.silk:4:15: error[SEM0078] Calling a unary callable with no arguments instead of naming it
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
/home/you/demo/src/main.silk:2:10: error[SEM0081] Cannot return an owned callable whose concrete environment identity is unknown
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
/home/you/demo/src/main.silk:3:10: error[SEM0082] A raw storage operation outside lexical unsafe authority
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
/home/you/demo/src/main.silk:5:1: error[SEM0083] An invalid source-declared capability implementation
```

Message template, not filled by this compiler: `Invalid conformance: {detail}`.

Fix: Implement every interface member. `Copy` needs every field to be `Copy`. See Interfaces and impls.

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
/home/you/demo/src/main.silk:4:3: error[SEM0084] Invalid Drop hook: the hook is `fn drop(self: &mut Self) -> ()`
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
/home/you/demo/src/main.silk:2:14: error[SEM0085] Malformed escapes, invalid UTF-8, or non-byte literal values
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
/home/you/demo/src/main.silk:1:1: error[SEM0086] Invalid constant: a constant requires a type annotation, as in `const NAME: i32 = 5`
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
/home/you/demo/src/main.silk:3:3: error[SEM0087] An expression statement whose result cannot be intentionally ignored
```

Message template, not filled by this compiler: `Expression statement produces {actual}, but only () or never may be ignored`.

Fix: Bind the result (`let n = one()`) or drop it (`drop one()`). See Bindings and statements.

### SEM0088

Using a generic binder in a value, failure-row, or requirement-row position of another kind.

```silk
fn wrap<?R>(value: R) -> i32 { return 0 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:20: error[SEM0088] Using a generic binder in a value, failure-row, or requirement-row position of another kind
```

Message template, not filled by this compiler: `Generic parameter {spelling} has kind {actual}, expected {expected}`.

Fix: Use the binder in the position of its kind: `?R` in a requirement row, `T` in a value position. See Generics.

### SEM0090

Storage, bodies, or defaults inside a source service contract.

```silk
service Store {
  effect fn get() -> i32 ? &Store { return 0 }
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:2:3: error[SEM0090] Storage, bodies, or defaults inside a source service contract
```

Message template, not filled by this compiler: `Invalid service declaration: {detail}`.

Fix: Declare only the operation signature in the service. Implement it in an `impl`. See Services and providers.

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
/home/you/demo/src/main.silk:4:11: error[SEM0099] One named type parameter left undetermined by an explicit prefix and the arguments
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
/home/you/demo/src/main.silk:1:14: error[SEM0108] A `typeof` item that resolves to no declaration in scope
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
/home/you/demo/src/main.silk:1:16: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/demo/src/main.silk:3:14: error[SEM0109] A `typeof` item whose name belongs to more than one declaration
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
/home/you/demo/src/main.silk:2:14: error[SEM0110] A `typeof` item that names something other than an ordinary callable
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
/home/you/demo/src/main.silk:2:14: error[SEM0111] A `typeof` item whose generic parameters are not all supplied
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
/home/you/demo/src/main.silk:2:18: error[SEM0112] A public contract exposing the exact identity of a private item
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
/home/you/demo/src/main.silk:3:24: error[SEM0113] One opaque producer specialization yielding multiple exact identities
  note: /home/you/demo/src/main.silk:4:18: related location
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
/home/you/demo/src/main.silk:2:11: error[SEM0114] An opaque family whose representation evidence contains no local construction
/home/you/demo/src/main.silk:1:11: error[SEM0114] An opaque family whose representation evidence contains no local construction
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
/home/you/demo/src/main.silk:1:20: error[SEM0115] An opaque realization whose inline captures contain that same family
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
/home/you/demo/src/main.silk:1:13: error[SEM0116] An opaque result binder whose bound is not callable or Effect representation
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
/home/you/demo/src/main.silk:1:15: error[SEM0117] An opaque producer whose reachable returns establish no representation
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
/home/you/demo/src/main.silk:2:16: error[SEM0118] An opaque result declared where no producer body can establish its identity
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
/home/you/demo/src/main.silk:6:1: error[SEM0119] Two conformance heads that may name one provider under one interface
```

Message template, not filled by this compiler: `{head} may overlap {other}`.

Fix: Keep conformance heads disjoint, or keep only the generic one. See Interfaces and impls.

### SEM0120

A conformance requirement that does not descend toward a base witness.

```silk
interface Eq2<T> { fn eq2(a: &Self, b: &T) -> bool }
struct Box2<T> { v: T }
struct Pair<A, B> { a: A b: B }
fn boxEq<T: Eq2<Pair<T, T>>>(a: &Box2<T>, b: &T) -> bool { return true }
impl<T: Eq2<Pair<T, T>>> Eq2<T> for Box2<T> { eq2: Box2.boxEq }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:5:9: error[SEM0120] A conformance requirement that does not descend toward a base witness
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
/home/you/demo/src/main.silk:5:11: error[SEM0121] `main.Token: Copy` cannot be proved: the callee requires a `Copy` type argument here, and this type does not implement `Copy`
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
/home/you/demo/src/main.silk:9:14: error[SEM0123] The provider matches no compatible requirement
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
/home/you/demo/src/main.silk:10:14: error[SEM0125] The provider matches more than one requirement; select one explicitly
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
/home/you/demo/src/main.silk:9:14: error[SEM0126] An explicitly or independently selected row that is not exactly one member
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
/home/you/demo/src/main.silk:2:10: error[SEM0129] Return expected i32 but received bool
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
/home/you/demo/src/main.silk:3:1: error[SEM0130] A reachable non-unit function fallthrough
```

Message template, not filled by this compiler: `A reachable path must return {expected}`.

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
/home/you/demo/src/main.silk:13:14: error[SEM0131] A provider whose key matches but whose access cannot satisfy the requirement
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
/home/you/demo/src/main.silk:4:7: error[SEM0133] A refutable pattern in an unconditional local binding
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
/home/you/demo/src/main.silk:4:13: error[SEM0135] Operator + does not accept (i64, i32)
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
/home/you/demo/src/main.silk:8:22: error[SEM0136] Operator syntax matched by more than one conformance of its operator interface
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
/home/you/demo/src/main.silk:2:10: error[SEM0137] `unsafe` must acknowledge a complete unsafe invocation
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
/home/you/demo/src/main.silk:6:14: error[SEM0139] A concrete executable that fails one sealed static-property obligation
/home/you/demo/src/main.silk:5:8: error[SEM0225] Entry point `main` may park, but the selected runtime starts it without a scheduler, so it must not park
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
/home/you/demo/src/main.silk:2:11: error[SEM0143] `mut` where no mutable owned parameter storage exists
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
/home/you/demo/src/main.silk:1:1: error[SEM0146] A scalar enum with no declared members
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
/home/you/demo/src/main.silk:1:6: error[SEM0147] A scalar enum representation outside the fixed-width integer set
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
/home/you/demo/src/main.silk:1:19: error[SEM0148] Duplicate enum member name Red
  note: /home/you/demo/src/main.silk:1:14: related location
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
/home/you/demo/src/main.silk:1:31: error[SEM0149] A scalar enum discriminant repeated after its first declaration
  note: /home/you/demo/src/main.silk:1:20: related location
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
/home/you/demo/src/main.silk:1:24: error[SEM0150] An explicit scalar enum discriminant outside its representation range
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
/home/you/demo/src/main.silk:1:29: error[SEM0151] An implicit scalar enum successor outside its representation range
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
/home/you/demo/src/main.silk:1:24: error[SEM0152] A negative discriminant under an unsigned scalar enum representation
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
/home/you/demo/src/main.silk:3:11: error[SEM0153] A member missing from a resolved scalar enum
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
/home/you/demo/src/main.silk:4:18: error[SEM0154] A canonical member used through or required by another enum
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
/home/you/demo/src/main.silk:3:18: error[SEM0155] Implicit mixing between a scalar enum and an integer
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
/home/you/demo/src/main.silk:4:16: error[SEM0156] Equality between distinct canonical scalar enums
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
/home/you/demo/src/main.silk:3:16: error[SEM0157] Direct ordering of scalar enum values
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
/home/you/demo/src/main.silk:4:10: error[SEM0158] Match over Color does not cover Blue
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
/home/you/demo/src/main.silk:6:5: error[SEM0159] A repeated unguarded scalar enum member arm
  note: /home/you/demo/src/main.silk:5:5: related location
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
/home/you/demo/src/main.silk:6:5: error[SEM0160] Enum match arm is unreachable after `_`
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
/home/you/demo/src/main.silk:6:5: error[SEM0161] A scalar enum pattern naming a member of another enum
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
/home/you/demo/src/main.silk:5:5: error[SEM0162] An integer literal pattern used against a scalar enum
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
/home/you/demo/src/main.silk:1:1: error[SEM0164] A nominal union declaration with no variants
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
/home/you/demo/src/main.silk:1:22: error[SEM0165] Duplicate union variant Empty
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
/home/you/demo/src/main.silk:1:15: error[SEM0166] A named-field variant whose braces contain no field
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
/home/you/demo/src/main.silk:3:11: error[SEM0167] A variant selector absent from its resolved nominal union
```

Message template, not filled by this compiler: `Union {unionName} has no variant {variantName}`.

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
/home/you/demo/src/main.silk:2:17: error[SEM0170] Duration literal exceeds the u64 nanosecond range
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
/home/you/demo/src/main.silk:3:10: error[SEM0171] Postfix referent projection whose subject is not a reference
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
/home/you/demo/src/main.silk:3:11: error[SEM0172] Positional construction with the wrong number of tuple elements
```

Message template, not filled by this compiler: `{type} expects {expected} tuple elements but received {actual}`.

Fix: Pass one value per tuple element. See Structs, tuples and arrays.

### SEM0173

Using tuple syntax with a named struct or record syntax with a tuple.

```silk
struct Point { x: i32 y: i32 }
pub fn main() -> i32 {
  let p: Point = (1, 2)
  return 0
}
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:3:18: error[SEM0173] Using tuple syntax with a named struct or record syntax with a tuple
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
/home/you/demo/src/main.silk:4:25: error[SEM0176] Crossing from static evaluation into unavailable runtime work
```

Message template, not filled by this compiler: `{operation} is not available during static evaluation for {target}`.

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
/home/you/demo/src/main.silk:3:5: error[SEM0177] this target is not supported
```

Fix: The text is the author's message. Change the static condition, target or profile. See Static control flow and reflection.

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
/home/you/demo/src/main.silk:1:43: error[SEM0178] A cycle in one demanded static application
  note: /home/you/demo/src/main.silk:3:18: related location
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
/home/you/demo/src/main.silk:3:24: error[SEM0179] Exhausting the static evaluator's deterministic step budget
  note: /home/you/demo/src/main.silk:7:18: related location
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
/home/you/demo/src/main.silk:3:10: error[SEM0180] Exhausting the static evaluator's logical call-depth budget
  note: /home/you/demo/src/main.silk:6:18: related location
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
/home/you/demo/src/main.silk:1:46: error[SEM0181] Exhausting the static evaluator's retained-value budget
  note: /home/you/demo/src/main.silk:3:22: related location
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
/home/you/demo/src/main.silk:1:10: error[SEM0183] A type alias whose target resolves back through the alias itself
/home/you/demo/src/main.silk:2:10: error[SEM0183] A type alias whose target resolves back through the alias itself
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
/home/you/demo/src/main.silk:1:14: error[SEM0184] A generic type alias parameter that is bounded, of an unsupported kind, or unused
```

Message template, not filled by this compiler: `Type alias {alias} parameter {parameter} must be a type or lifetime parameter` / `Type alias {alias} parameter {parameter} does not occur in its target` / `Type alias {alias} parameter {parameter} cannot declare bounds; the target's bounds apply at each use`.

Fix: Use every alias parameter, without bounds. See Generics.

## SEM: C interop, impls, lifetimes and properties (SEM0187-SEM0237)

### SEM0187

A foreign parameter or result type outside the C-compatible scalar subset.

```silk
unsafe extern "C" fn flag(value: f64) -> bool
pub fn main() -> i32 { unsafe { if flag(1.0) { return 0 } } return 1 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:2:36: error[SEM0187] A foreign parameter or result type outside the C-compatible scalar subset
```

Message template, not filled by this compiler: `{type} is not admitted by the {abi} ABI`.

Fix: Use C scalar types (integers, `f32`, `f64`, raw pointers) in foreign signatures. `bool` is not one of them. See Unsafe code and C interop.

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
/home/you/demo/src/main.silk:3:11: error[SEM0189] Using a foreign function as a first-class value rather than calling it
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
/home/you/demo/src/main.silk:1:48: error[SEM0190] A native symbol that is not an ASCII identifier
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
/home/you/demo/src/main.silk:1:48: error[SEM0191] A native symbol the compiler reserves for its own runtime or entry
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
/home/you/demo/src/main.silk:2:50: error[SEM0192] Two reachable declarations of one symbol with different C signatures
  note: /home/you/demo/src/main.silk:1:15: related location
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
/home/you/demo/src/main.silk:1:6: error[SEM0194] An inherent impl head that is not the whole family of a module-local nominal
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
/home/you/demo/src/main.silk:3:3: error[SEM0195] An inherent impl member that cannot be an associated member
```

Message template, not filled by this compiler: `impl {owner} cannot declare a drop hook; declare impl Drop for {owner} instead` / `{owner}.{member} collides with the {collidesWith} {member} of {owner}` / `impl {owner} cannot map {member} to another declaration; only a conformance maps operations`.

Fix: Rename the member. Inherent members cannot share a field name or be named `drop` (use `impl Drop`). See Functions and methods.

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
/home/you/demo/src/main.silk:3:6: error[SEM0196] Two inherent members of one owner sharing a name
/home/you/demo/src/main.silk:4:6: error[SEM0196] Two inherent members of one owner sharing a name
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
/home/you/demo/src/main.silk:7:13: error[SEM0198] An associated function called on a value as though it had a receiver
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
/home/you/demo/src/main.silk:3:62: error[SEM0200] A receiver operation declared by more than one bound of one type parameter
```

Message template, not filled by this compiler: `{member} is declared by more than one bound of {parameter} ({interfaces}); call it through the bound, as {interfaces}.{member}(...)`.

Fix: Call through one interface: `Named.name(value)`. See Interfaces and impls.

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
/home/you/demo/src/main.silk:8:12: error[SEM0202] name is supplied to main.Point by more than one interface (Named or Labeled); call it through one, as Named or Labeled.name(...)
```

Fix: Call through one interface: `Named.name(&p)`. See Interfaces and impls.

### SEM0205

A C-layout record that declares type parameters.

```silk
extern "C" struct Pair<T> {
  left: i32
  right: i32
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:1: error[SEM0205] A C-layout record that declares type parameters
```

Message template, not filled by this compiler: `C-layout record {record} cannot declare type parameters`.

Fix: Remove the type parameters from the C-layout struct. See Unsafe code and C interop.

### SEM0206

A C-layout record field outside the closed C object subset.

```silk
extern "C" struct Flags {
  on: bool
  name: string
}
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:2:7: error[SEM0206] A C-layout record field outside the closed C object subset
/home/you/demo/src/main.silk:3:9: error[SEM0206] A C-layout record field outside the closed C object subset
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
/home/you/demo/src/main.silk:1:19: error[SEM0209] Unknown lifetime 'a
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
/home/you/demo/src/main.silk:1:30: error[SEM0210] The omitted output lifetime has no unique input; name its lifetime explicitly
```

Fix: Name the lifetime: `fn pick<'a>(a: &'a i32, b: &i32) -> &'a i32`. See Lifetimes.

### SEM0211

A lifetime binder or outlives bound has an unsupported declaration shape.

```silk
struct View<'a, 'a> { left: &'a i32 }
pub fn main() -> i32 { return 0 }
```

`silk check` prints:

```text
/home/you/demo/src/main.silk:1:17: error[SEM0211] A lifetime binder or outlives bound has an unsupported declaration shape
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
/home/you/demo/src/main.silk:4:15: error[SEM0212] A lifetime that must outlive another but is not known to
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
/home/you/demo/src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: a package parameter's type must be bool, an integer, a string, or a fixed array of them
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
/home/you/demo/src/main.silk:1:16: error[SEM0215] Invalid raw-pointer alignment, address space, or qualifier conversion
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
/home/you/demo/src/main.silk:1:15: error[SEM0218] A `test` qualifier marks a function outside the finite executable test contract
```

Message template, not filled by this compiler: `Invalid test declaration: {detail}`.

Fix: Declare tests as `test fn name() -> ()` or a `test effect fn` with no parameters. See Functions and methods.

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
/home/you/demo/src/main.silk:3:1: error[SEM0220] A sealed Drop or Copy head names `'static`, repeats one region, or bounds a region
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
/home/you/demo/src/main.silk:6:25: error[SEM0221] A member list follows an unwritten owner whose parameters the member uses (GEN-008)
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
/home/you/demo/src/main.silk:1:16: error[SEM0223] Cannot resolve a non-alias dependency cycle
/home/you/demo/src/main.silk:2:16: error[SEM0223] Cannot resolve a non-alias dependency cycle
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
/home/you/demo/src/main.silk:4:5: error[SEM0224] A unit nominal-union variant is written with a braced payload pattern (PATT-021)
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
/home/you/demo/src/main.silk:1:8: error[SEM0225] Entry point `main` has a result the selected runtime cannot start; the default runtime accepts i32, (), or an Effect producing () or i32 that requires at most `&mut HostInput`
```

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
/home/you/demo/src/main.silk:3:16: error[SEM0226] Cannot match reference `status` directly; match its referent with `match &status.*`
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
/home/you/demo/src/main.silk:4:38: error[SEM0233] A requirement row names the same service with both shared and exclusive access; write it once
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
/home/you/demo/src/main.silk:15:14: error[SEM0234] This call does not prove the requirement premise `&mut main.Logger in &main.Clock`
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
/home/you/demo/src/main.silk:1:19: error[SEM0235] This property clause names a property or property argument the language does not define
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
/home/you/demo/src/main.silk:1:19: error[SEM0236] This property clause is not allowed on this declaration; `Intrinsic.foreign` and `Intrinsic.machine` apply only to `extern "C"` or `export "C"` functions
```

Fix: Put `Intrinsic.machine` and `Intrinsic.foreign` only on `extern "C"` or `export "C"` functions. See Unsafe code and C interop, Intrinsics.

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
/home/you/demo/src/main.silk:2:51: error[SEM0237] This atomic operation does not admit this memory order or element type
```

The column points at the memory order. A store takes `"relaxed"`, `"release"` or `"sequentiallyConsistent"`, not `"acquire"`. The same code covers an arithmetic operation on a float, such as `Intrinsic.atomicFetchAdd<f64>`, a compare-exchange whose failure order is `"release"`, and a misspelled order such as `"seqCst"`.

Fix: Use an order the operation admits: `"release"` here. Most code should use `silk/atomic` instead of the intrinsics. See Intrinsics.

## Codes this compiler does not report

These SEM codes are in the catalog, but no path in this compiler reports them, or the case they describe is refused or accepted another way. The last column says what happened when the case was tried; "Not tried" means no reachable program was found.

| Code | Meaning | Catalog message | Tried | What happens |
| --- | --- | --- | --- | --- |
| SEM0020 | Aggregates that contain themselves inline and so have no finite layout. | `Inline recursive aggregate layout: {members}` | `struct Node { next: Node }` | `check` and `build` accept it while unused. Used in a function, `build` refuses with `unsupported[InlineStorageUnavailable] not supported by the native compiler yet`. |
| SEM0059 | Passing an array where a slice is expected without an explicit borrow. | `Passing an array as {expected} requires an explicit borrow` | `sum(xs)` with `xs: [i32; 3]` for `&[i32]` | SEM0012 at the argument. |
| SEM0061 | A type that cannot inhabit an Effect failure channel. | `Effect failure {type} must be a detached ordinary value type` | `effect fn boom() -> i32 ! &i32` | SEM0210 for the elided lifetime. |
| SEM0068 | A mutable binding inside an effect recipe. | `Effect recipe bindings are immutable` | `let mut n` assigned inside `effect { }` | Accepted. |
| SEM0080 | Merging callable values from different construction sites without explicit erasure. | `Cannot merge callable values from different construction sites without explicit erasure` |  | Not tried. |
| SEM0089 | A failure or requirement row that cannot be finitely decomposed. | `Requirement row does not contain &mut {capability}@{role}` / `Requirement row does not contain &{capability}@{role}` / `Requirement {capability} has role {actual}, expected {expected}` / `Requirement {capability}@{role} has access {actual}, expected {expected}` / `Requirement row remainder is ambiguous across {parameters}` / `Requirement row specialization is not finite and concrete` / `Failure type does not contain selected member {member}` |  | Not tried. |
| SEM0093 | One reachable intrinsic unavailable on the requested execution target. | `{operation} is unavailable for {target}` |  | Not tried. |
| SEM0095 | A float literal spelling no floating-point value can represent. | `Invalid float literal: {spelling}` | `let x = 1e999` | Accepted by `check` and `build`. |
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
| SEM0185 | A foreign function whose ABI string is not "C". | `Foreign ABI "{abi}" is not supported; only "C" is available` | `unsafe extern "Rust" fn abs(value: i32) -> i32` | `check` accepts it; `build` refuses with `unsupported[foreign-abi] not supported by the native compiler yet`. |
| SEM0186 | A foreign function declared without the mandatory unsafe qualifier. | `Foreign function {name} must be declared unsafe` | `extern "C" fn abs(value: i32) -> i32` | The declaration is accepted; a call outside `unsafe` gets SEM0082. |
| SEM0188 | Silk-only contract syntax retained on a foreign function declaration. | `A foreign function declaration must not include {restriction}` | `unsafe extern "C" fn first<T>(value: i32) -> i32` | `check` accepts it; `build` refuses with `unsupported[foreign-contract] not supported by the native compiler yet`. |
| SEM0193 | One reachable foreign call unavailable on the requested execution surface. | `Foreign function {symbol} is unavailable for {surface}` |  | Not tried. |
| SEM0197 | A selective import naming an inherent member as if it were a root declaration. | `{module} has no root declaration {member}; it is a member of {owner}, so import {owner} and write {owner}.{member}` | `import shapes { area }` for an inherent member | SEM0014. |
| SEM0199 | Nesting one anonymous callable body inside another in the first language slice. | `Anonymous callable bodies cannot be nested in this language slice` | a function literal inside another | Accepted. |
| SEM0201 | An `export "C"` function whose body may suspend. | `Exported function {symbol} may suspend; a C-callable body must be synchronous` | `export "C" fn` whose body runs `Fiber.yieldNow()` | Accepted by `check` and `build`. |
| SEM0203 | Naming a conformance-supplied receiver operation as a value instead of calling it. | `{member} is supplied to {receiver} by an interface and must be called; it has no value form` | `let f = p.name` for an interface method | SEM0027. |
| SEM0207 | A value that cannot become an exact noncapturing C callback address. | `{name} cannot be used as a C callback: {detail}` |  | Not tried. |
| SEM0208 | Reachable C data on an execution surface without native symbol linkage. | `Foreign static {symbol} is unavailable on {surface}; C data symbols require native LLVM linkage` |  | Not tried. |
| SEM0213 | A type that must remain valid for a lifetime but is not known to. | `Type {type} does not remain valid for {lifetime}` |  | Not tried. |
| SEM0216 | A diagnostic observer callback lacks a complete direct-execution proof. | `Diagnostic observer callback requires direct execution: {detail}` |  | Not tried. |
| SEM0217 | Terminal observation is provably outside a selected failure handler. | `Terminal diagnostic observation requires a selected failure context` |  | Not tried. |
| SEM0219 | Emitted code references a function instance whose valid body native lowering does not support yet. | `Native lowering does not support this function body yet` |  | Not tried. |
| SEM0222 | A namespace-qualified type named where a value is required (NAME-005). | `{member} in {module} is a type, not a value; select it with an import and write {member}.<member> for its members` |  | Not tried. |
