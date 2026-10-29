# Interfaces and impls

An interface names a set of operations. An `impl` makes a type conform to an interface by supplying each operation. Bounds such as `T: Interface` then let generic code call those operations, and operator interfaces give user types operators such as `+` and `==`.

## Syntax

```
InterfaceDecl  = 'pub'? 'interface' Identifier GenericParameters? '{' Operation* '}'
Operation      = Directive* 'static'? ('effect' Environment?)? 'unsafe'? 'fn' Identifier GenericParameters?
                 '(' Parameters? ')' '->' Type FailureRow? RequirementRow?

ConformanceImpl = 'impl' GenericParameters? InterfaceType 'for' Type '{' ImplMember* '}'
ImplMember      = FunctionDecl
                | Identifier ':' Path

InterfaceCall  = InterfaceType '.' Identifier '(' Arguments? ')'
InterfaceType  = Path TypeArguments?
```

## Interface declarations

- An interface body lists operations only. Stored fields and other members are rejected (SEM0090).
- An operation may have a body. The body is its default: an impl that leaves the operation out uses it, and one that implements the operation replaces it.
- `Self` inside the interface stands for the conforming type. Receivers are written as ordinary parameters: `value: Self`, `value: &Self` or `value: &mut Self`. The parameter name is free.
- An operation may be an `effect fn` or an `unsafe fn`, and may have its own type parameters: `fn conv<U>(value: &Self, u: U) -> U`. A call supplies them like any generic call: `Convert.conv<i32>(item, 7)`, `c.conv(true)`.
- An operation may be a `static fn`. It answers a question about the conforming type during static evaluation, such as `static fn takesValue() -> bool`. See Static evaluation.
- An operation parameter may be `static`. A runtime caller supplies it through `Interface.member(...)` or the receiver form, as for an inherent method.
- An operation parameter cannot be `mut` (SEM0143).
- An interface may have type parameters: `interface Decoder<T> { ... }`. `Decoder<bool>` and `Decoder<i64>` are separate interfaces for conformance purposes.
- An interface with no operations is a marker: `interface Marker {}`.
- An interface is not a type. It cannot be used as a parameter or value type (SEM0018). Use a bounded type parameter instead.

## Impls

- `impl Interface for Type { ... }` declares a conformance. Every operation without a default body must be supplied, each at most once and with a matching signature. A missing, extra, repeated or mismatched member is SEM0083. The message names the interface and the member: ``Invalid conformance: `Shape` requires `area`, which this implementation does not define``, or ``member `decode` does not match the operation of `Info`: it returns a different type``. A duplicate impl prints ``Invalid conformance: `Square` implements `Shape` twice; keep one implementation`` at the second impl, and a repeated member ``Invalid conformance: `area` is defined twice in the implementation of `Shape` for `Square` `` at the second definition.
- A member is either a full function definition or a binding `name: path` to an existing function.
- A binding may name a top-level function (`area: squareArea`), an inherent member (`multiply: Vec2.scale`), or an intrinsic (`mix: Intrinsic.i32WrappingAdd`).
- A generic impl declares its parameters after `impl`: `impl<T> Marker for Box<T> {}`.
- A generic impl may bound its parameters. `impl<T: Size> Size for Box<T>` is a conditional conformance: `Box<T>` conforms only when `T` does.
- Every impl parameter must occur in the head (SEM0083).
- A bound in an impl head must bound a part of the provider type, so that each proof moves toward a smaller type. `impl<T: Show> Show for Box<T>` descends. A bound on a parameter that the provider does not contain, such as `impl<T: Show> Pick<T> for Settings`, is SEM0120: "A conformance requirement that does not descend toward a base witness".
- Only the provider has to descend. The bound may repeat a parameter in its interface arguments: `impl<T: Eq2<Pair<T, T>>> Eq2<T> for Box<T>` is accepted.
- A `static fn` operation is supplied by a `static fn` member, and a runtime operation by a runtime one. A mismatch, or `static` parameters that differ, is SEM0083: "Invalid conformance: member `takesValue` does not match the operation of `Arg`: one of them is a `static fn` and the other is not, or their `static` parameters differ".
- An inherent `impl Type { ... }` without an interface defines associated members. See Functions and methods.

## Where an impl may live

- An impl must be in one of these modules: the one that declares the interface, the one that declares the provider type, or the one that declares the interface application's first type argument. Otherwise it is SEM0083, naming the modules that may hold it.
- The first-type-argument rule lets the module that declares `Vector2` also declare `impl Multiply<Vector2<f64>, Vector2<f64>> for f64`, so `2.0 * vector` works. Without it, scalar types such as `i32` and `f64` could only get user conformances in the interface's module.
- The std lib operator interfaces live in a sealed module that no package can write to, so the message names only the modules you can use, as in ``Invalid conformance: `silk.core.ops.Add<meters.Meters, meters.Meters>` is a standard operator interface and `meters.Meters` is declared in `meters`, so this impl must be in `meters` ``. For `impl Multiply<Meters, Meters> for i32` outside `meters` it says ``... is a standard operator interface and `i32` is a builtin type, so this impl must be in `meters` ``, the module of the first type argument.
- Conformances are found without importing the impl. Importing the interface and the type is enough.

## Coherence

- At most one impl may apply to a given type and interface application.
- Two identical heads are SEM0083.
- Heads that could both match one type are SEM0119, for example `impl<T> One for B<T>` and `impl One for B<i32>`. There is no specialization; bounds never make heads distinct.
- Different interface arguments do not overlap: `impl Encodable<Numeric> for Age` and `impl Encodable<Textual> for Age` may coexist.

## Calling operations

- `Interface.member(args)` calls the operation for the type of its `Self` argument: `Shape.area(&square)`.
- For an interface with arguments, give them on the interface: `Decoder<bool>.decode(&d, 1)`.
- Receiver form `value.member(args)` also works when the first parameter is `Self`, `&Self` or `&mut Self`. The receiver is borrowed or moved as the parameter requires.
- Pipelines work too: `&square |> Shape.area`.
- In a generic body, both forms work through a bound: `T: Shape` allows `Shape.area(item)` and `item.area()`.
- An inherent member of the same name wins over the interface member in receiver form. Call the interface member through `Interface.member`.
- A receiver call that matches members from two bounds of one parameter (SEM0200) or two conformances (SEM0202) is ambiguous. Call it through the interface name.
- A member supplied by an interface cannot be taken as a value with `value.member`. Call it.
- The conformance is chosen per specialization. There is no runtime dispatch.
- A `static fn` operation is called during static evaluation, as `Arg.takesValue()` in a `static fn` bounded by `T: Arg`. A runtime call is SEM0176: "`Arg.takesValue` runs only during static evaluation, so runtime code cannot call it".

## Operator interfaces

`a + b` means `Add.add(a, b)` for the conformance of the left operand's type. Concrete scalar operands always use the built-in operators. The interfaces are sealed in `Intrinsic` and re-exported under ordinary names.

| Interface | Module | Operator | Operation |
| --- | --- | --- | --- |
| `Add<Right, Output>` | `silk/core/ops` | `a + b` | `add(left: Self, right: Right) -> Output` |
| `Subtract<Right, Output>` | `silk/core/ops` | `a - b` | `subtract(left: Self, right: Right) -> Output` |
| `Multiply<Right, Output>` | `silk/core/ops` | `a * b` | `multiply(left: Self, right: Right) -> Output` |
| `Divide<Right, Output>` | `silk/core/ops` | `a / b` | `divide(left: Self, right: Right) -> Output` |
| `Remainder<Right, Output>` | `silk/core/ops` | `a % b` | `remainder(left: Self, right: Right) -> Output` |
| `Negate<Output>` | `silk/core/ops` | `-a` | `negate(value: Self) -> Output` |
| `BitAnd<Right, Output>` | `silk/core/ops` | `a & b` | `bitAnd(left: Self, right: Right) -> Output` |
| `BitOr<Right, Output>` | `silk/core/ops` | `a \| b` | `bitOr(left: Self, right: Right) -> Output` |
| `BitXor<Right, Output>` | `silk/core/ops` | `a ^ b` | `bitXor(left: Self, right: Right) -> Output` |
| `BitNot<Output>` | `silk/core/ops` | `~a` | `bitNot(value: Self) -> Output` |
| `Not<Output>` | `silk/core/ops` | `!a` | `not(value: Self) -> Output` |
| `Equal` | `silk/core/equal` | `a == b`, `a != b` | `equals(left: &Self, right: &Self) -> bool` |
| `Order` | `silk/core/order` | `<`, `<=`, `>`, `>=` | `compare(left: &Self, right: &Self) -> Ordering` |

- Arithmetic and bitwise operands are taken by value. `Right` and `Output` let a type combine with another type, as in `Vec2 * i32 -> Vec2`.
- `Equal` and `Order` take references, so compare user values as `&a == &b` and `&a < &b`. Comparing the values directly is SEM0135.
- `Order` maps `<` to `compare == Less`, `<=` to `!= Greater`, `>` to `== Greater` and `>=` to `!= Less`. `Ordering` has `Less`, `Equal` and `Greater`.
- No conformance accepting the operand types is SEM0135. More than one is SEM0136. The expected result type never selects between them.
- A generic function uses an operator on `T` only through a bound: `T: Add<T, T>`. A primitive type satisfies a bound when its built-in operator accepts it: `i32` satisfies `Add<i32, i32>`, `Order` and `BitXor<i32, i32>`, and `f64` satisfies `Add<f64, f64>` and `Equal` but not `Order`. The full table is in the Operators appendix.
- A generic body may also use an operator on a generic type, such as `scale * point` with `Scale<T>` and `Point<T>`, through a conditional impl like `impl<T: Copy + Multiply<T, T>> Multiply<Point<T>, Point<T>> for Scale<T>`. The body's own bounds must prove the impl's bounds; if they don't, it is SEM0121 at the operator. See Generics.

## Copy and Drop

- `Copy` and `Drop` in `silk/core/ownership` are aliases of the sealed properties `Intrinsic.Copy` and `Intrinsic.Drop`.
- `impl Copy for Point {}` lets values of `Point` duplicate on use. It has no members; declaring one is SEM0083. `impl<T: Copy> Copy for Box<T> {}` is conditional.
- `impl Drop for Token { fn drop(self: &mut Self) -> () { ... } }` gives a type a cleanup operation. The impl holds exactly this member with exactly this signature. Anything else, including a `mut self` receiver binding, is SEM0084.
- `Copy` can be a bound; `Drop` cannot (SEM0083). See Ownership and moves.

## Examples

```silk
interface Shape {
  fn area(shape: &Self) -> i32

  fn grow(shape: &mut Self, by: i32) -> ()

  fn label(shape: Self) -> i32
}

struct Square {
  side: i32,
}

fn squareArea(shape: &Square) -> i32 {
  return shape.side * shape.side
}

impl Shape for Square {
  area: squareArea

  fn grow(shape: &mut Self, by: i32) -> () {
    shape.side = shape.side + by
    return ()
  }

  fn label(shape: Self) -> i32 {
    return 4
  }
}

fn totalArea<T: Shape>(items: &[T]) -> i32 {
  let mut sum = 0
  let mut at: usize = 0
  while at < items.length {
    sum = sum + Shape.area(&items[at])
    at = at + 1
  }
  return sum
}

pub fn main() -> i32 {
  let mut square = Square { side: 2 }
  if Shape.area(&square) != 4 {
    return 1
  }
  square.grow(1)
  if square.area() != 9 {
    return 2
  }
  if (&square |> Shape.area) != 9 {
    return 3
  }
  let items = [Square { side: 1 }, Square { side: 2 }]
  if totalArea(&items) != 5 {
    return 4
  }
  if square.label() != 4 {
    return 5
  }
  return 0
}
```

```silk
import silk.core.equal { Equal }
import silk.core.ops { Multiply, Negate }

struct Vec2 {
  x: i32,
  y: i32,
}

impl Vec2 {
  fn scale(left: Self, right: i32) -> Self {
    return Vec2 { x: left.x * right, y: left.y * right }
  }

  fn dot(left: Self, right: Self) -> i32 {
    return left.x * right.x + left.y * right.y
  }
}

fn negateVec(value: Vec2) -> Vec2 {
  return Vec2 { x: -value.x, y: -value.y }
}

fn sameVec(left: &Vec2, right: &Vec2) -> bool {
  return left.x == right.x && left.y == right.y
}

impl Multiply<i32, Vec2> for Vec2 {
  multiply: Vec2.scale
}

impl Multiply<Vec2, i32> for Vec2 {
  multiply: Vec2.dot
}

impl Negate<Vec2> for Vec2 {
  negate: negateVec
}

impl Equal for Vec2 {
  equals: sameVec
}

fn doubled<T: Multiply<i32, T>>(value: T) -> T {
  return move value * 2
}

pub fn main() -> i32 {
  let v = doubled(Vec2 { x: 1, y: 2 })
  let expected = Vec2 { x: 2, y: 4 }
  let flipped = -Vec2 { x: 2, y: 4 }
  if &v != &expected || &v == &flipped {
    return 1
  }
  if flipped.x != -2 {
    return 2
  }
  let ones = Vec2 { x: 1, y: 1 }
  let product = move v * move ones
  if product != 6 {
    return 3
  }
  return 0
}
```

```silk
interface Size {
  fn size(value: &Self) -> i32
}

struct Box<T> {
  value: T,
}

struct Leaf {}

impl Size for Leaf {
  fn size(value: &Self) -> i32 {
    return 1
  }
}

impl<T: Size> Size for Box<T> {
  fn size(value: &Self) -> i32 {
    return 10 + Size.size(&value.value)
  }
}

fn measure<T: Size>(value: &T) -> i32 {
  return value.size()
}

pub fn main() -> i32 {
  let nested = Box { value: Box { value: Leaf {} } }
  if measure(&nested) != 21 {
    return 1
  }
  return 0
}
```

A conformance for a scalar provider, held by the module that declares the first type argument:

```silk
import silk.core.ops { Multiply }

struct Meters {
  value: i32,
}

// This module declares `Meters`, the first type argument, so it may hold
// the conformance for the scalar `i32`.
impl Multiply<Meters, Meters> for i32 {
  fn multiply(left: i32, right: Meters) -> Meters {
    return Meters { value: left * right.value }
  }
}

pub fn main() -> i32 {
  let length = 3 * Meters { value: 14 }
  return length.value - 42
}
```

A `static fn` operation that picks a branch at compile time:

```silk
interface Arg {
  // Answered during static evaluation.
  static fn takesValue() -> bool
}

struct Flag {}

struct Text {}

impl Arg for Flag {
  static fn takesValue() -> bool {
    return false
  }
}

impl Arg for Text {
  static fn takesValue() -> bool {
    return true
  }
}

static fn takes<T: Arg>() -> bool {
  return Arg.takesValue()
}

fn width<T: Arg>() -> i32 {
  static if takes<T>() {
    return 40
  } else {
    return 2
  }
}

pub fn main() -> i32 {
  if width<Text>() + width<Flag>() != 42 {
    return 1
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0018 | An interface used where a type is expected |
| SEM0083 | Invalid conformance: missing, extra or mismatched member (including a `static fn` mismatch), duplicate impl, impl outside the modules that may hold it, unconstrained impl parameter, or `Drop` used as a bound |
| SEM0084 | Invalid `Drop` conformance: the impl is not exactly `fn drop(self: &mut Self) -> ()` |
| SEM0090 | Stored field or another member that is not an operation inside an interface |
| SEM0119 | Two impl heads may overlap |
| SEM0120 | Impl bound does not bound a part of the provider type |
| SEM0121 | Conformance required by a bound cannot be proved |
| SEM0176 | A runtime call of a `static fn` operation |
| SEM0135 | No operator conformance accepts the operands |
| SEM0136 | More than one operator conformance accepts the operands |
| SEM0143 | `mut` parameter in an interface operation |
| SEM0200 | Receiver call declared by more than one bound of a type parameter |
| SEM0202 | Receiver call supplied by more than one conformance |

## See also

Generics · Functions and methods · Closures and callable types · Ownership and moves · Expressions and operators · Effects and run · Typed failures · Services and providers · `silk/core/ops`, `silk/core/equal`, `silk/core/order`, `silk/core/ownership`

## Open questions

- A runtime operation with no `Self` parameter (such as `fn unit() -> Self`) can be declared and implemented, but calling it as `Shape.unit()` reports "unsupported: this construct is not supported by the native compiler yet". A `static fn` operation with no `Self` parameter works.
- Taking an interface-supplied member as a value, as in `let f = s.area`, reports SEM0027 ("main.Square has no field area"), not SEM0203.
- `Copy` conformances are checked on demand. An `impl Copy` whose field is not `Copy`, or whose type also has `Drop`, is not reported unless a copy is needed.
- An impl binding `add: Cell.cellAdd`, where `cellAdd` is a top-level function and not a member of `Cell`, is accepted. Whether this is intended is unclear.
