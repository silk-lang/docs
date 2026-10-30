Distances inward from the four edges of a box, over any number type.

## When to use
Use [`Insets`](#Insets) for margins, padding, borders, or any other amount that grows or shrinks a
rectangle on each side. `silk.geometry.rect.Rect.inflate` applies one to a rectangle.

## Details
An insets value is a `Copy` struct with public `top`, `right`, `bottom`, and `left` fields,
generic over its number type `T`. `top` applies to the minimum y edge and `bottom` to the
maximum y edge, which matches a y-down space such as CSS or SVG. `insets + insets` adds each
side, and `&a == &b` compares every side when `T: Equal`.

## Examples
### Sum padding and a border
```silk
import silk.geometry.insets { Insets }

pub fn main() -> i32 {
  let padding = Insets<f64>.uniform(8.0)
  let border = Insets<f64>.new(1.0, 2.0, 1.0, 2.0)
  let total = padding + border
  if total.horizontal() != 20.0 || total.vertical() != 18.0 {
    return 1
  }
  return 0
}
```

Import as `Insets` with `import silk.geometry.insets { Insets }`.

Public declarations: 1.

::Anchor{id="Insets"}

## `Insets`

```silk
pub struct Insets<T>
```

The distances of number type `T` from the four edges of a box.

### When to use

Use `Insets` for margins, padding, borders, or safe areas. Pass one to
`silk.geometry.rect.Rect.inflate` to grow a rectangle, or negate the sides to shrink it.

### Details

The fields are public. `top` applies to the minimum y edge and `bottom` to the maximum y edge,
as in CSS and SVG. `insets + insets` adds each side, and `&a == &b` compares every side, when
`T` has the operator.

::Anchor{id="Insets.top"}

### Field `top`

```silk
pub top: T
```

The distance from the minimum y edge.

::Anchor{id="Insets.right"}

### Field `right`

```silk
pub right: T
```

The distance from the maximum x edge.

::Anchor{id="Insets.bottom"}

### Field `bottom`

```silk
pub bottom: T
```

The distance from the maximum y edge.

::Anchor{id="Insets.left"}

### Field `left`

```silk
pub left: T
```

The distance from the minimum x edge.

::Anchor{id="Insets.impl.Copy"}

## Implementation `Copy for Insets<T>`

```silk
impl<T: Copy> Copy for Insets<T>
```

::Anchor{id="Insets.impl"}

## Implementation `Insets<T>`

```silk
impl<T> Insets<T>
```

::Anchor{id="Insets.impl.new"}

### Associated function `new`

```silk
pub fn new(top: T, right: T, bottom: T, left: T) -> Insets<T>
```

Returns the insets with `top`, `right`, `bottom`, and `left`, in the CSS order.

::Anchor{id="Insets.impl-2"}

## Implementation `Insets<T>`

```silk
impl<T: Copy> Insets<T>
```

::Anchor{id="Insets.impl.uniform"}

### Associated function `uniform`

```silk
pub fn uniform(value: T) -> Insets<T>
```

Returns the insets whose four sides are all `value`.

::Anchor{id="Insets.impl-3"}

## Implementation `Insets<T>`

```silk
impl<T: Zero> Insets<T>
```

::Anchor{id="Insets.impl.zero"}

### Associated function `zero`

```silk
pub fn zero() -> Insets<T>
```

Returns the insets whose four sides are zero.

::Anchor{id="Insets.impl-4"}

## Implementation `Insets<T>`

```silk
impl<T: Copy + Add<T, T>> Insets<T>
```

::Anchor{id="Insets.impl.horizontal"}

### Method `horizontal`

```silk
pub fn horizontal(self: Self) -> T
```

Returns `left + right`, the total inset along the x axis.

::Anchor{id="Insets.impl.vertical"}

### Method `vertical`

```silk
pub fn vertical(self: Self) -> T
```

Returns `top + bottom`, the total inset along the y axis.

::Anchor{id="Insets.impl.Add"}

## Implementation `Add<Insets<T>, Insets<T>> for Insets<T>`

```silk
impl<T: Add<T, T>> Add<Insets<T>, Insets<T>> for Insets<T>
```

::Anchor{id="Insets.impl.Add.add"}

### Operation `add`

```silk
fn add(left: Self, right: Self) -> Self
```

::Anchor{id="Insets.impl.Equal"}

## Implementation `Equal for Insets<T>`

```silk
impl<T: Equal> Equal for Insets<T>
```

::Anchor{id="Insets.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Category: Geometry.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
