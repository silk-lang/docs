A value for each of the four corners of a box, over any number type.

## When to use
Use [`Corners`](#Corners) for corner radii of a rounded box, such as a card, a button, a shadow, or a
clipped image. `silk.geometry.rounded_rect.RoundedRect` pairs one with a rectangle.

## Details
A corners value is a `Copy` struct with public `topLeft`, `topRight`, `bottomRight`, and
`bottomLeft` fields, generic over its number type `T`. The names match a y-down space such as
CSS or SVG: top is the minimum y edge and left the minimum x edge. `corners + corners` adds each
corner, `corners * T` scales each corner, and `&a == &b` compares every corner when `T: Equal`.

## Examples
### Fit radii to a small box
```silk
import silk.geometry.corners { Corners }
import silk.geometry.size { Size2 }

pub fn main() -> i32 {
  let radii = Corners<f64>.new(4.0, 30.0, 4.0, -2.0) * 2.0
  let fitted = radii.clampToSize(Size2<f64>.new(100.0, 40.0))
  if fitted.topLeft != 8.0 || fitted.topRight != 20.0 || fitted.bottomLeft != 0.0 {
    return 1
  }
  return 0
}
```

Import as `Corners` with `import silk.geometry.corners { Corners }`.

Public declarations: 1.

::Anchor{id="Corners"}

## `Corners`

```silk
pub struct Corners<T>
```

A value of number type `T` for each of the four corners of a box, such as corner radii.

### When to use

Use `Corners` for the radii of a rounded box. Use `silk.geometry.insets.Insets` for a value per
edge, such as padding or border widths.

### Details

The fields are public. Top is the minimum y edge and left the minimum x edge, as in CSS and SVG.
`corners + corners` adds each corner, `corners * T` scales each corner, and `&a == &b` compares
every corner, when `T` has the operator.

::Anchor{id="Corners.topLeft"}

### Field `topLeft`

```silk
pub topLeft: T
```

The value at the minimum x, minimum y corner.

::Anchor{id="Corners.topRight"}

### Field `topRight`

```silk
pub topRight: T
```

The value at the maximum x, minimum y corner.

::Anchor{id="Corners.bottomRight"}

### Field `bottomRight`

```silk
pub bottomRight: T
```

The value at the maximum x, maximum y corner.

::Anchor{id="Corners.bottomLeft"}

### Field `bottomLeft`

```silk
pub bottomLeft: T
```

The value at the minimum x, maximum y corner.

::Anchor{id="Corners.impl.Copy"}

## Implementation `Copy for Corners<T>`

```silk
impl<T: Copy> Copy for Corners<T>
```

::Anchor{id="Corners.impl"}

## Implementation `Corners<T>`

```silk
impl<T> Corners<T>
```

::Anchor{id="Corners.impl.new"}

### Associated function `new`

```silk
pub fn new(topLeft: T, topRight: T, bottomRight: T, bottomLeft: T) -> Corners<T>
```

Returns the corners with `topLeft`, `topRight`, `bottomRight`, and `bottomLeft`, in the
clockwise order of CSS `border-radius`.

::Anchor{id="Corners.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> Corners<U>
```

Returns corners whose fields are `transform` applied to `topLeft`, `topRight`, `bottomRight`,
then `bottomLeft`.

::Anchor{id="Corners.impl-2"}

## Implementation `Corners<T>`

```silk
impl<T: Copy> Corners<T>
```

::Anchor{id="Corners.impl.uniform"}

### Associated function `uniform`

```silk
pub fn uniform(value: T) -> Corners<T>
```

Returns the corners whose four values are all `value`.

::Anchor{id="Corners.impl-3"}

## Implementation `Corners<T>`

```silk
impl<T: Zero> Corners<T>
```

::Anchor{id="Corners.impl.zero"}

### Associated function `zero`

```silk
pub fn zero() -> Corners<T>
```

Returns the corners whose four values are zero: square corners.

::Anchor{id="Corners.impl-4"}

## Implementation `Corners<T>`

```silk
impl<T: Copy + Order> Corners<T>
```

::Anchor{id="Corners.impl.max"}

### Method `max`

```silk
pub fn max(self: Self) -> T
```

Returns the largest of the four values.

#### Gotchas

For a float type, the comparison follows the IEEE 754 total order of `Order`: a NaN with the
sign bit clear is above every number.

::Anchor{id="Corners.impl-5"}

## Implementation `Corners<T>`

```silk
impl<T: Copy + Order + Zero + One + Add<T, T> + Divide<T, T>> Corners<T>
```

::Anchor{id="Corners.impl.clampToSize"}

### Method `clampToSize`

```silk
pub fn clampToSize(self: Self, size: Size2<T>) -> Corners<T>
```

Returns the radii limited so that they fit a box of `size`: each corner is clamped between zero
and half of the smaller of the width and the height.

#### When to use

Call it before drawing or hit-testing a rounded box whose radii come from user input or a
style, so that no two corner arcs overlap and no radius is negative.

#### Details

Each corner is clamped on its own, as GPU quad shaders do, so a fitted corner keeps its radius
even when another corner is reduced. CSS instead scales every radius by one shared factor; the
two agree whenever no radius exceeds half the smaller side. A negative or zero width or height
gives zero radii.

::Anchor{id="Corners.impl.Add"}

## Implementation `Add<Corners<T>, Corners<T>> for Corners<T>`

```silk
impl<T: Add<T, T>> Add<Corners<T>, Corners<T>> for Corners<T>
```

::Anchor{id="Corners.impl.Add.add"}

### Operation `add`

```silk
fn add(left: Self, right: Self) -> Self
```

::Anchor{id="Corners.impl.Multiply"}

## Implementation `Multiply<T, Corners<T>> for Corners<T>`

```silk
impl<T: Copy + Multiply<T, T>> Multiply<T, Corners<T>> for Corners<T>
```

::Anchor{id="Corners.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: Self, right: T) -> Self
```

::Anchor{id="Corners.impl.Equal"}

## Implementation `Equal for Corners<T>`

```silk
impl<T: Equal> Equal for Corners<T>
```

::Anchor{id="Corners.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Category: Geometry.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
