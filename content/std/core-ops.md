The interfaces that give user types the arithmetic, bitwise, and logical operators.

## When to use
Implement [`Add`](#Add) to give a type `+`, [`Multiply`](#Multiply) to give it `*`, and so on. Add a bound such
as `T: Add<T, T>` when a generic function applies an operator to its type parameter.

## Details
These names refer to the sealed `Intrinsic` operator interfaces (OP-009). The expression `a + b`
means `Add.add(a, b)` for the conformance of the type of `a`. The compiler finds a conformance
in the same places as for other interfaces: the interface source or the module that declares
the type.

Operands move into the member by value. `Right` and `Output` let one type combine with another
type, as in `Vector * f64`. Concrete scalar operands always use the built-in operators. The
comparison operators use `silk.core.equal.Equal` and `silk.core.order.Order`.

## Gotchas
If two conformances accept the same operand types, the operator is ambiguous and the compiler
reports an error. The compiler does not use the expected result type to select a conformance.

## Examples
### Give a type the `+` operator
```silk
import silk.core.ops { Add }

struct Meters {
  value: i32,
}

fn addMeters(left: Meters, right: Meters) -> Meters {
  return Meters { value: left.value + right.value }
}

impl Add<Meters, Meters> for Meters {
  add: Meters.addMeters
}

pub fn main() -> i32 {
  let total = Meters { value: 40 } + Meters { value: 2 }
  if total.value != 42 {
    return 1
  }
  return 0
}
```

Import as `Add` with `import silk.core.ops { Add }`.

Public declarations: 11.

::Anchor{id="Add"}

## `Add`

```silk
pub type Add = Intrinsic.Add
```

The interface behind `left + right`.

### Details

A conformance `impl Add<Right, Output> for T` gives the member
`add(left: T, right: Right) -> Output`. The expression `left + right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="Subtract"}

## `Subtract`

```silk
pub type Subtract = Intrinsic.Subtract
```

The interface behind `left - right`.

### Details

A conformance `impl Subtract<Right, Output> for T` gives the member
`subtract(left: T, right: Right) -> Output`. The expression `left - right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="Multiply"}

## `Multiply`

```silk
pub type Multiply = Intrinsic.Multiply
```

The interface behind `left * right`.

### Details

A conformance `impl Multiply<Right, Output> for T` gives the member
`multiply(left: T, right: Right) -> Output`. The expression `left * right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="Divide"}

## `Divide`

```silk
pub type Divide = Intrinsic.Divide
```

The interface behind `left / right`.

### Details

A conformance `impl Divide<Right, Output> for T` gives the member
`divide(left: T, right: Right) -> Output`. The expression `left / right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="Remainder"}

## `Remainder`

```silk
pub type Remainder = Intrinsic.Remainder
```

The interface behind `left % right`.

### Details

A conformance `impl Remainder<Right, Output> for T` gives the member
`remainder(left: T, right: Right) -> Output`. The expression `left % right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="Negate"}

## `Negate`

```silk
pub type Negate = Intrinsic.Negate
```

The interface behind `-value`.

### Details

A conformance `impl Negate<Output> for T` gives the member `negate(value: T) -> Output`. The
expression `-value` calls it with the operand by value.

::Anchor{id="BitAnd"}

## `BitAnd`

```silk
pub type BitAnd = Intrinsic.BitAnd
```

The interface behind `left & right`.

### Details

A conformance `impl BitAnd<Right, Output> for T` gives the member
`bitAnd(left: T, right: Right) -> Output`. The expression `left & right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="BitOr"}

## `BitOr`

```silk
pub type BitOr = Intrinsic.BitOr
```

The interface behind `left | right`.

### Details

A conformance `impl BitOr<Right, Output> for T` gives the member
`bitOr(left: T, right: Right) -> Output`. The expression `left | right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="BitXor"}

## `BitXor`

```silk
pub type BitXor = Intrinsic.BitXor
```

The interface behind `left ^ right`.

### Details

A conformance `impl BitXor<Right, Output> for T` gives the member
`bitXor(left: T, right: Right) -> Output`. The expression `left ^ right` calls it with both
operands by value. `Right` and `Output` can differ from `T`.

::Anchor{id="BitNot"}

## `BitNot`

```silk
pub type BitNot = Intrinsic.BitNot
```

The interface behind `~value`.

### Details

A conformance `impl BitNot<Output> for T` gives the member `bitNot(value: T) -> Output`. The
expression `~value` calls it with the operand by value.

::Anchor{id="Not"}

## `Not`

```silk
pub type Not = Intrinsic.Not
```

The interface behind `!value`.

### Details

A conformance `impl Not<Output> for T` gives the member `not(value: T) -> Output`. The
expression `!value` calls it with the operand by value.

Category: Core.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
