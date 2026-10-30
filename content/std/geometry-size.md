Two-dimensional extents over any number type.

## When to use
Use [`Size2`](#Size2) for a width and a height with no position, such as a viewport, an image, or the
measured size of a layout box. Use `silk.geometry.rect.Rect` when the extent also has a
position.

## Details
A size is a `Copy` struct with public `width` and `height` fields, generic over its number type
`T`. `size + size` adds extents, `size * T` and `size / T` scale them, and `&a == &b` compares
both fields when `T: Equal`. Methods appear only when `T` has the operations they need.

## Examples
### Scale a viewport and test it
```silk
import silk.geometry.size { Size2 }

pub fn main() -> i32 {
  let viewport = Size2<f64>.new(800.0, 600.0) * 0.5
  if viewport.area() != 120000.0 || viewport.isEmpty() {
    return 1
  }
  return 0
}
```

Import as `Size2` with `import silk.geometry.size { Size2 }`.

Public declarations: 1.

::Anchor{id="Size2"}

## `Size2`

```silk
pub struct Size2<T>
```

A width and a height of number type `T`, with no position.

### When to use

Use `Size2` for an extent alone. Use `silk.geometry.rect.Rect` for an extent at a position.

### Details

The fields are public. `size + size` adds both fields, `size * T` and `size / T` scale them, and
`&a == &b` compares them, when `T` has the operator. A size can be negative; [`isEmpty`](#Size2.impl.isEmpty) is
`true` for a negative or zero extent.

::Anchor{id="Size2.width"}

### Field `width`

```silk
pub width: T
```

The extent along the x axis.

::Anchor{id="Size2.height"}

### Field `height`

```silk
pub height: T
```

The extent along the y axis.

::Anchor{id="Size2.impl.Copy"}

## Implementation `Copy for Size2<T>`

```silk
impl<T: Copy> Copy for Size2<T>
```

::Anchor{id="Size2.impl"}

## Implementation `Size2<T>`

```silk
impl<T> Size2<T>
```

::Anchor{id="Size2.impl.new"}

### Associated function `new`

```silk
pub fn new(width: T, height: T) -> Size2<T>
```

Returns the size with `width` and `height`.

::Anchor{id="Size2.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> Size2<U>
```

Returns a size whose fields are `transform` applied to `width`, then to `height`.

::Anchor{id="Size2.impl.toVector"}

### Method `toVector`

```silk
pub fn toVector(self: Self) -> Vector2<T>
```

Returns the vector `(width, height)`, the offset from a box's minimum corner to its maximum.

::Anchor{id="Size2.impl-2"}

## Implementation `Size2<T>`

```silk
impl<T: Zero> Size2<T>
```

::Anchor{id="Size2.impl.zero"}

### Associated function `zero`

```silk
pub fn zero() -> Size2<T>
```

Returns the size whose width and height are zero.

::Anchor{id="Size2.impl-3"}

## Implementation `Size2<T>`

```silk
impl<T: Copy + Multiply<T, T>> Size2<T>
```

::Anchor{id="Size2.impl.area"}

### Method `area`

```silk
pub fn area(self: Self) -> T
```

Returns `width * height`.

::Anchor{id="Size2.impl-4"}

## Implementation `Size2<T>`

```silk
impl<T: Zero + Order> Size2<T>
```

::Anchor{id="Size2.impl.isEmpty"}

### Method `isEmpty`

```silk
pub fn isEmpty(self: &Self) -> bool
```

Returns `true` when the width or the height is zero or negative.

#### Gotchas

For a float type, the comparison follows the IEEE 754 total order of `Order`: negative zero is
below positive zero, and a NaN with the sign bit clear is above every number.

::Anchor{id="Size2.impl.Add"}

## Implementation `Add<Size2<T>, Size2<T>> for Size2<T>`

```silk
impl<T: Add<T, T>> Add<Size2<T>, Size2<T>> for Size2<T>
```

::Anchor{id="Size2.impl.Add.add"}

### Operation `add`

```silk
fn add(left: Self, right: Self) -> Self
```

::Anchor{id="Size2.impl.Multiply"}

## Implementation `Multiply<T, Size2<T>> for Size2<T>`

```silk
impl<T: Copy + Multiply<T, T>> Multiply<T, Size2<T>> for Size2<T>
```

::Anchor{id="Size2.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: Self, right: T) -> Self
```

::Anchor{id="Size2.impl.Divide"}

## Implementation `Divide<T, Size2<T>> for Size2<T>`

```silk
impl<T: Copy + Divide<T, T>> Divide<T, Size2<T>> for Size2<T>
```

::Anchor{id="Size2.impl.Divide.divide"}

### Operation `divide`

```silk
fn divide(left: Self, right: T) -> Self
```

::Anchor{id="Size2.impl.Equal"}

## Implementation `Equal for Size2<T>`

```silk
impl<T: Equal> Equal for Size2<T>
```

::Anchor{id="Size2.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Category: Geometry.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
