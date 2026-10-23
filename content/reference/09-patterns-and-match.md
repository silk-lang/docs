# Patterns and match

A pattern tests the shape of a value and binds names to its parts. Patterns appear in `match` arms, in `if let` conditions and in destructuring `let` statements.

## Syntax

```
MatchExpression = 'match' MatchAccess? Expression '{' MatchArm* '}'
MatchAccess     = '&' 'mut'? | 'move' | 'place'
MatchArm        = Pattern ( 'if' Expression )? '=>' ( Block | Expression )

IfLet           = 'if' 'let' Pattern '=' Expression Block ( 'else' ( IfStatement | Block ) )?
LetPattern      = 'let' Pattern '=' Expression

Pattern         = '_'
                | '-'? IntegerLiteral
                | TypePath '.' Identifier                                   // enum member or bare variant
                | TypePath TypeArguments? '.' Identifier FieldPatterns      // record variant
                | Type Identifier                                           // binder
                | Type FieldPatterns                                        // struct or member record
FieldPatterns   = '{' ( FieldPattern ( ',' FieldPattern )* ','? )? '}'
FieldPattern    = '..' | Identifier ( ':' ( Identifier | Pattern ) )?
```

- Arms follow one another with no separator. A comma between arms is a parse error (PAR0002).
- The subject is parsed without record literals: write `match move (Token { value: 1 }) { … }`, not `match move Token { value: 1 } { … }`.
- In a field, `name: …` accepts a binding name or a nested variant, enum member or record pattern. It does not accept an integer literal.

## Match expressions

- `match` is an expression. Its value is the value of the selected arm.
- Arms are tried in order. The first arm whose pattern matches and whose guard (if any) is `true` runs.
- An arm body is an expression or a block. A block arm does not yield a value. Use it for statements or to leave with `return`, `break` or `continue`.
- With an expected type, every arm must have that type. Without one, arms of different types join into a structural union (`i32 | bool`). Arms that cannot join are SEM0049.
- Without an expected type, an unsuffixed integer literal arm takes the integer type of the other arms: with `big: i64`, `match n { 0 => big  _ => 7 }` is `i64`. A literal that does not fit that type, such as `300` beside a `u8` arm, still forms a union.
- A `match` used as a statement must produce `()` (SEM0087). Write block arms there.

## Pattern kinds

| Pattern | Matches | Binds |
| --- | --- | --- |
| `_` | Anything | Nothing |
| `3`, `-1` | An integer subject equal to the literal | Nothing |
| `Color.Red` | That enum member | Nothing |
| `Shape.Empty` | That bare union variant | Nothing |
| `Shape.Rect { width, .. }` | That record variant | Listed fields |
| `Point { x, y }` | A struct, or that struct as a union member | Listed fields |
| `Left held` | A value of struct type `Left` | The whole value as `held` |
| `i32 n`, `[f64; 2] v` | That member of a structural union, or a scalar subject of that type | The whole value |

- There is no plain identifier pattern. `x => …` is a parse error. Bind a whole value with the binder form `Type name`, or match `_` and use the subject.
- The binder form works on struct subjects (`Token held`) and union members.
- On an integer, `bool`, `char`, `f32`/`f64` or scalar enum subject, a binder of the subject's type binds the whole value and covers every case like `_`: `match n { i32 x => x + 1 }`, `char c => …`, `Color v => …`. A binder of another type, such as `i64 x` on an `i32`, is SEM0042.
- There are no `bool`, `char`, string, range or tuple patterns. Use guards (`_ if c == 'a'`) for those tests.
- Integer patterns accept base prefixes (`0x10`).
- Field shorthand `{ value }` binds the field under its own name. `{ value: v }` binds it as `v`. `{ value: _ }` matches the field without using it.
- A record pattern must name every field or end with `..` (SEM0046). `..` may stand anywhere in the field list. A field may appear only once (SEM0047). An unknown field is SEM0022.
- Nested patterns work through fields: `Holder { shape: Shape.Circle { radius: r }, tag }`. A field may also name an enum member: `Paint { color: Color.Red, .. }`.
- A binding name that repeats a local in scope is SEM0048. Repeating a function name is allowed.
- Unit variants take no braces in patterns: `Shape.Empty {}` is SEM0224.
- An arm that names a type or member the subject does not have is SEM0042.
- For generic unions, write the type arguments in the pattern: `Maybe<i32>.Some { value }`.

## Guards

- `Pattern if condition => …` runs the arm only when the condition is `true`. The condition must be `bool` (SEM0045).
- The guard sees the arm's bindings. It cannot consume them (OWN0008).
- A guarded arm does not count toward exhaustiveness.

## Exhaustiveness and reachability

- A `match` must cover every value of its subject (SEM0044).
- A struct subject is covered by one unguarded `Type { … }` arm with only binding fields.
- A nominal union is covered by one unguarded arm per variant. A structural union is covered by one per member.
- An integer subject needs `_` or an unguarded binder such as `i32 x`.
- An unguarded binder on an enum subject covers like `_`. An enum arm after it is SEM0160. A `_` or binder after arms that already name every member is unreachable (SEM0043).
- Struct arms that name enum members in a field are covered only when, together, they cover every member of that field (SEM0044 otherwise).
- An unguarded `_` covers everything that remains.
- An arm already covered by earlier unguarded arms is unreachable (SEM0043).
- Enums have their own codes: a missing member is SEM0158, a repeated member is SEM0159, an arm after `_` is SEM0160, a member of another enum is SEM0161, and an integer pattern is SEM0162.

## Access modes

The access mode before the subject says how the arms reach it.

| Form | Subject | Bindings |
| --- | --- | --- |
| `match e` | Copy, or a temporary | Copies, or own their parts |
| `match move e` | Consumed | Own their parts |
| `match &e` | Borrowed shared | Read-only views of the parts |
| `match &mut e` | Borrowed exclusive | Writable views of the parts |
| `match place p` | Refined in its own storage | The parts themselves |

- `match e` on a non-Copy named variable is OWN0003. Use `move` to consume it or `&` to inspect it.
- A temporary subject, such as a call result, is consumed without `move`, as for `let` and `if let`: `match make() { … }`.
- A subject of reference type cannot be matched directly (SEM0226). Match its referent: `match &status.*` or `match &mut status.*`. The same holds for `if let`.
- `match move e` transfers the subject into the selected arm. Use it to take payloads out of an owned value.
- `match &e` names the parts without a reference type: a bound `i32` field reads as `i32`. If `e` is not a place, it is evaluated into a temporary.
- Each borrowed binding holds a loan of the subject. The loan ends after the binding's last use, so the arm may assign the owner afterwards.
- `match &mut e` lets the arm assign through bindings (`value = 5`) or pass `&mut value`. It needs a `mut` binding (OWN0007) and an existing place (OWN0009).
- A borrowed binding cannot leave its arm. Moving it out is OWN0006.
- Under `&mut`, assigning the owner while a binding is still in use is OWN0011.
- `match place p` matches the storage at `p` directly. Bindings are the fields themselves: the arm may move out of a binding and assign it a new value.
- The `place` subject must be a complete binding place: a local, a field path of one, or a literal fixed-array index. A runtime index or a dereference is OWN0009.
- Use `&` to read, `&mut` to edit fields in place, `move` to consume, and `place` to replace an owned field's value.

## if let

- `if let Pattern = e { … }` runs the block when the pattern matches. It needs no exhaustiveness.
- Bindings are in scope only in the first block.
- `else` and `else if` (including `else if let`) chain as for `if`. See Control flow.
- The initializer chooses the access: `&e` borrows shared, `&mut e` borrows exclusive, `move e` consumes, and a Copy value is copied.
- A temporary initializer, such as a call result or a constructed value, is consumed without `move`. A non-Copy named variable still needs `move` (OWN0003).
- An enum member is a pattern too: `if let Color.Green = c { }`.

## let patterns

- `let Pattern = e` destructures a value. The pattern must be irrefutable (SEM0133). Use `if let` or `match` otherwise.
- A struct pattern is irrefutable. So is a union variant when the union has one variant.
- The initializer chooses the access, as for `if let`. A non-Copy named variable needs `move` or a borrow (OWN0003). A temporary such as a call result or struct literal needs neither.
- A borrowed `let` pattern keeps its loan to the end of the enclosing block.
- `let _ = e` is not a pattern binding (SEM0087). Use `drop e`.

## Examples

```silk
union Shape {
  Circle { radius: i32 },
  Rect { width: i32, height: i32 },
  Empty,
}

fn area(shape: &Shape) -> i32 {
  return match &shape.* {
    Shape.Circle { radius } => radius * radius * 3
    Shape.Rect { width: w, height: h } => w * h
    Shape.Empty => 0
  }
}

fn tall(shape: Shape) -> i32 {
  return match move shape {
    Shape.Rect { height, .. } if height > 10 => 1
    Shape.Rect { .. } => 2
    _ => 3
  }
}

fn sign(n: i32) -> i32 {
  return match n {
    0 => 0
    _ if n < 0 => -1
    _ => 1
  }
}

pub fn main() -> i32 {
  let rect = Shape.Rect { width: 4, height: 5 }
  if area(&rect) != 20 {
    return 1
  }
  if tall(move rect) != 2 {
    return 2
  }
  if tall(Shape.Rect { width: 1, height: 12 }) != 1 {
    return 3
  }
  if sign(-7) != -1 || sign(0) != 0 {
    return 4
  }
  return 0
}
```

```silk
struct Token {
  value: i32
}

union Packet {
  Empty,
  Ready { left: Token, right: Token }
}

pub fn main() -> i32 {
  let mut packet = Packet.Ready { left: Token { value: 1 }, right: Token { value: 2 } }
  match &mut packet {
    Packet.Ready { right, .. } => {
      right.value = 20
    }
    Packet.Empty => {}
  }
  let mut taken = 0
  match place packet {
    Packet.Ready { left, .. } => {
      let old = move left
      taken = old.value
      left = Token { value: 9 }
    }
    Packet.Empty => {}
  }
  let sum = match &packet {
    Packet.Ready { left, right } => left.value + right.value
    Packet.Empty => 0
  }
  drop packet
  if taken != 1 || sum != 29 {
    return 1
  }
  return 0
}
```

```silk
struct Left {
  value: i32
}

struct Right {}

struct Point {
  x: i32
  y: i32
}

fn read(input: Left | Right) -> i32 {
  if let Left { value } = &input {
    return value
  } else if let Right {} = &input {
    return 0
  }
  return -1
}

fn whole(input: Left | Right) -> i32 {
  return match move input {
    Left held => held.value
    Right _ => 0
  }
}

pub fn main() -> i32 {
  let point = Point { x: 3, y: 4 }
  let Point { x, y } = move point
  if read(Left { value: 7 }) != 7 || read(Right {}) != 0 {
    return 1
  }
  if whole(Left { value: x + y }) != 7 {
    return 2
  }
  return 0
}
```

```silk
enum Color {
  Red,
  Green,
  Blue
}

struct Paint {
  color: Color
  amount: i32
}

fn make(color: Color, amount: i32) -> Paint {
  return Paint { color: color, amount: amount }
}

fn score(paint: Paint) -> i32 {
  return match move paint {
    Paint { color: Color.Red, amount } => amount
    Paint { color: Color.Green, .. } => 100
    Paint { color: Color.Blue, amount: a } => a * 2
  }
}

fn next(n: i32) -> i32 {
  return match n {
    i32 whole => whole + 1
  }
}

pub fn main() -> i32 {
  let c = Color.Green
  if let Color.Red = c {
    return 1
  }
  let Paint { amount, .. } = make(Color.Blue, 3)
  if score(make(Color.Blue, amount)) != 6 {
    return 2
  }
  if next(4) != 5 {
    return 3
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| OWN0003 | Plain `match` on a non-Copy named variable; use `move` or a borrow |
| OWN0006 | Borrowed pattern binding escapes its arm |
| OWN0007 | `match &mut` on a binding not declared `mut` |
| OWN0008 | Guard consumes a pattern binding |
| OWN0009 | `&mut` or `place` subject is not a complete binding place |
| OWN0011 | Owner access conflicts with a binding's active loan |
| SEM0042 | Arm names a member the subject does not have, or a binder of the wrong type |
| SEM0043 | Arm is unreachable |
| SEM0044 | Match does not cover every case |
| SEM0045 | Guard is not `bool` |
| SEM0046 | Record pattern omits a field without `..` |
| SEM0047 | Record pattern names a field twice |
| SEM0048 | Pattern binding collides with an existing local |
| SEM0049 | Arm results have no common type |
| SEM0087 | Statement `match` produces a non-unit value |
| SEM0133 | Refutable pattern in `let` |
| SEM0158 | Enum match leaves members uncovered |
| SEM0159 | Repeated unguarded enum member arm |
| SEM0160 | Enum arm after an unguarded `_` or binder |
| SEM0161 | Enum pattern names a member of another enum |
| SEM0162 | Integer pattern against an enum |
| SEM0224 | Unit variant written with braces in a pattern |
| SEM0226 | `match` or `if let` subject is a reference; match its referent with `&r.*` |

## See also

Enums and unions · Structs, tuples and arrays · Control flow · Ownership and moves · Borrowing · Bindings and statements
