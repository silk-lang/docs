The interfaces that give user types the arithmetic, bitwise, and logical operators.

## When to use
Implement [`Add`](#Add) to give a type `+`, [`Multiply`](#Multiply) to give it `*`, and so on. Add a bound such as
`T: Add<T, T>` when a generic function applies an operator to its type parameter.

## Details
These aliases name the sealed `Intrinsic` interfaces bound to operators (OP-009); `a + b` means
`Add.add(a, b)` for the conformance of `a`'s type. A conformance is found as for any other
interface: in the sealed interface source or in the module that declares the provider. Operands
are taken by value, and `Right` and `Output` let one type combine with another, as in `Vector * f64`.
Concrete scalar operands always use the built-in operators. Comparison operators are bound to
[`Equal`](https://github.com/silk-lang/silk/blob/main/reference/stdlib/silk.equal) and [`Order`](https://github.com/silk-lang/silk/blob/main/reference/stdlib/silk.order).

## Gotchas
Two conformances that accept the same operand types make the operator ambiguous; Silk never
chooses one by the expected result type.

## Examples
### Give a type the `+` operator
```silk
import silk.ops { Add }

struct Meters { value: i32 }

fn addMeters(left: Meters, right: Meters) -> Meters {
  return Meters { value: left.value + right.value }
}

impl Add<Meters, Meters> for Meters { add: Meters.addMeters }

pub fn main() -> i32 {
  let total = Meters { value: 40 } + Meters { value: 2 }
  return total.value
}
```

Import as `Add` with `import silk.ops { Add }`.

Public declarations: 11.

::Anchor{id="Add"}

## `Add`

```silk
pub type Add = Intrinsic.Add
```

The interface behind `left + right`.

::Anchor{id="Subtract"}

## `Subtract`

```silk
pub type Subtract = Intrinsic.Subtract
```

The interface behind `left - right`.

::Anchor{id="Multiply"}

## `Multiply`

```silk
pub type Multiply = Intrinsic.Multiply
```

The interface behind `left * right`.

::Anchor{id="Divide"}

## `Divide`

```silk
pub type Divide = Intrinsic.Divide
```

The interface behind `left / right`.

::Anchor{id="Remainder"}

## `Remainder`

```silk
pub type Remainder = Intrinsic.Remainder
```

The interface behind `left % right`.

::Anchor{id="Negate"}

## `Negate`

```silk
pub type Negate = Intrinsic.Negate
```

The interface behind `-value`.

::Anchor{id="BitAnd"}

## `BitAnd`

```silk
pub type BitAnd = Intrinsic.BitAnd
```

The interface behind `left & right`.

::Anchor{id="BitOr"}

## `BitOr`

```silk
pub type BitOr = Intrinsic.BitOr
```

The interface behind `left | right`.

::Anchor{id="BitXor"}

## `BitXor`

```silk
pub type BitXor = Intrinsic.BitXor
```

The interface behind `left ^ right`.

::Anchor{id="BitNot"}

## `BitNot`

```silk
pub type BitNot = Intrinsic.BitNot
```

The interface behind `~value`.

::Anchor{id="Not"}

## `Not`

```silk
pub type Not = Intrinsic.Not
```

The interface behind `!value`.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
