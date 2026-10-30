Two- and three-dimensional displacements over any number type.

## When to use
Use [`Vector2`](#Vector2) or [`Vector3`](#Vector3) for a direction, an offset, or a velocity: a value that has a
size and a direction but no position. Use `silk.geometry.point` for a position. A point minus a
point gives a vector, and a point plus a vector gives a point.

## Details
A vector is a `Copy` struct with public fields, generic over its number type `T`. The operators
`+`, `-`, unary `-`, `* T`, and `/ T` work lane by lane when `T` has them, and `==` compares
every field when `T: Equal`. `f32 * Vector2<f32>` and `f64 * Vector2<f64>` (and the `Vector3`
forms) scale from the left. Methods appear only when `T` has the operations they need: `dot`
needs addition and multiplication, and `length` and `normalize` need
`silk.num.numeric.Float`.

The types add no runtime cost: a generic vector operation compiles to the same code as the same
arithmetic written on separate fields.

## Gotchas
Comparison takes shared borrows, as in `&a == &b`. Float fields compare with IEEE rules, so a
vector with a NaN field is not equal to itself.

## Examples
### Find the angle between two directions
```silk
import silk.geometry.vector { Vector2 }

pub fn main() -> i32 {
  let right = Vector2<f64>.new(2.0, 0.0)
  let up = Vector2<f64>.new(0.0, 3.0)
  let turn = right.normalize().cross(up.normalize())
  let scaled = 2.0 * right + up * 0.5
  if turn != 1.0 || scaled.x != 4.0 || scaled.y != 1.5 {
    return 1
  }
  return 0
}
```

Import as `Vector2` with `import silk.geometry.vector { Vector2 }`.

Public declarations: 2.

::Anchor{id="Vector2"}

## `Vector2`

```silk
pub struct Vector2<T>
```

A two-dimensional displacement with an `x` and a `y` component of number type `T`.

### When to use

Use `Vector2` for an offset, a direction, or a size of movement in a plane. Use
`silk.geometry.point.Point2` for a position.

### Details

The fields are public, so code can read and build them directly. `+`, `-`, unary `-`, `* T`, and
`/ T` apply to each component when `T` has the operator. `f32 * Vector2<f32>` and `f64 *
Vector2<f64>` scale from the left. `&a == &b` compares both components when `T: Equal`.

::Anchor{id="Vector2.x"}

### Field `x`

```silk
pub x: T
```

The horizontal component.

::Anchor{id="Vector2.y"}

### Field `y`

```silk
pub y: T
```

The vertical component. In a y-down space, such as SVG or a screen, positive `y` points down.

::Anchor{id="Vector2.impl.Copy"}

## Implementation `Copy for Vector2<T>`

```silk
impl<T: Copy> Copy for Vector2<T>
```

::Anchor{id="Vector2.impl"}

## Implementation `Vector2<T>`

```silk
impl<T> Vector2<T>
```

::Anchor{id="Vector2.impl.new"}

### Associated function `new`

```silk
pub fn new(x: T, y: T) -> Vector2<T>
```

Returns the vector with components `x` and `y`.

::Anchor{id="Vector2.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> Vector2<U>
```

Returns a vector whose components are `transform` applied to `x`, then to `y`.

#### When to use

Use `map` to change the number type, such as from font units in `i32` to `f64`.

::Anchor{id="Vector2.impl-2"}

## Implementation `Vector2<T>`

```silk
impl<T: Copy> Vector2<T>
```

::Anchor{id="Vector2.impl.splat"}

### Associated function `splat`

```silk
pub fn splat(value: T) -> Vector2<T>
```

Returns the vector whose two components are both `value`.

::Anchor{id="Vector2.impl.components"}

### Method `components`

```silk
pub fn components(self: Self) -> [T; 2]
```

Returns the components as the array `[x, y]`.

::Anchor{id="Vector2.impl-3"}

## Implementation `Vector2<T>`

```silk
impl<T: Zero> Vector2<T>
```

::Anchor{id="Vector2.impl.zero"}

### Associated function `zero`

```silk
pub fn zero() -> Vector2<T>
```

Returns the vector whose two components are zero.

::Anchor{id="Vector2.impl-4"}

## Implementation `Vector2<T>`

```silk
impl<T: Copy + Add<T, T> + Subtract<T, T> + Multiply<T, T>> Vector2<T>
```

::Anchor{id="Vector2.impl.dot"}

### Method `dot`

```silk
pub fn dot(self: Self, other: Vector2<T>) -> T
```

Returns the dot product `self.x * other.x + self.y * other.y`.

#### Details

The result is positive when the vectors point into the same half-plane, zero when they are
perpendicular, and negative when they point away from each other.

::Anchor{id="Vector2.impl.cross"}

### Method `cross`

```silk
pub fn cross(self: Self, other: Vector2<T>) -> T
```

Returns the two-dimensional cross product `self.x * other.y - self.y * other.x`.

#### Details

The result is the signed area of the parallelogram that the two vectors span. It is positive
when `other` turns from `self` toward positive `y`, which is clockwise in a y-down space.

::Anchor{id="Vector2.impl.lengthSquared"}

### Method `lengthSquared`

```silk
pub fn lengthSquared(self: Self) -> T
```

Returns `self.dot(self)`, the square of the length, with no square root.

#### When to use

Use `lengthSquared` to compare lengths, or when `T` is an integer or fixed-point type.

::Anchor{id="Vector2.impl-5"}

## Implementation `Vector2<T>`

```silk
impl<T: Copy + Negate<T>> Vector2<T>
```

::Anchor{id="Vector2.impl.perp"}

### Method `perp`

```silk
pub fn perp(self: Self) -> Vector2<T>
```

Returns the vector `(-y, x)`, which is `self` turned a quarter turn toward positive `y`.

::Anchor{id="Vector2.impl-6"}

## Implementation `Vector2<T>`

```silk
impl<T: Copy + Float + Add<T, T> + Subtract<T, T> + Multiply<T, T> + Divide<T, T>> Vector2<T>
```

::Anchor{id="Vector2.impl.length"}

### Method `length`

```silk
pub fn length(self: Self) -> T
```

Returns the length of the vector, computed without overflow in the intermediate squares.

::Anchor{id="Vector2.impl.normalize"}

### Method `normalize`

```silk
pub fn normalize(self: Self) -> Vector2<T>
```

Returns the vector with the same direction and a length of one.

#### Gotchas

A zero vector, or a vector with an infinite or NaN component, gives NaN components.

::Anchor{id="Vector2.impl.angle"}

### Method `angle`

```silk
pub fn angle(self: Self) -> T
```

Returns the angle in radians from the positive x axis to the vector, in `[-pi, pi]`.

::Anchor{id="Vector2.impl.fromAngle"}

### Associated function `fromAngle`

```silk
pub fn fromAngle(radians: T) -> Vector2<T>
```

Returns the vector of length one at `radians` from the positive x axis.

::Anchor{id="Vector2.impl.lerp"}

### Method `lerp`

```silk
pub fn lerp(self: Self, other: Vector2<T>, t: T) -> Vector2<T>
```

Returns `self + (other - self) * t`: `self` at `t = 0` and `other` at `t = 1`.

::Anchor{id="Vector2.impl.isFinite"}

### Method `isFinite`

```silk
pub fn isFinite(self: Self) -> bool
```

Returns `true` when both components are neither infinite nor NaN.

::Anchor{id="Vector2.impl.Add"}

## Implementation `Add<Vector2<T>, Vector2<T>> for Vector2<T>`

```silk
impl<T: Add<T, T>> Add<Vector2<T>, Vector2<T>> for Vector2<T>
```

::Anchor{id="Vector2.impl.Add.add"}

### Operation `add`

```silk
fn add(left: Self, right: Self) -> Self
```

::Anchor{id="Vector2.impl.Subtract"}

## Implementation `Subtract<Vector2<T>, Vector2<T>> for Vector2<T>`

```silk
impl<T: Subtract<T, T>> Subtract<Vector2<T>, Vector2<T>> for Vector2<T>
```

::Anchor{id="Vector2.impl.Subtract.subtract"}

### Operation `subtract`

```silk
fn subtract(left: Self, right: Self) -> Self
```

::Anchor{id="Vector2.impl.Negate"}

## Implementation `Negate<Vector2<T>> for Vector2<T>`

```silk
impl<T: Negate<T>> Negate<Vector2<T>> for Vector2<T>
```

::Anchor{id="Vector2.impl.Negate.negate"}

### Operation `negate`

```silk
fn negate(value: Self) -> Self
```

::Anchor{id="Vector2.impl.Multiply"}

## Implementation `Multiply<T, Vector2<T>> for Vector2<T>`

```silk
impl<T: Copy + Multiply<T, T>> Multiply<T, Vector2<T>> for Vector2<T>
```

::Anchor{id="Vector2.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: Self, right: T) -> Self
```

::Anchor{id="Vector2.impl.Divide"}

## Implementation `Divide<T, Vector2<T>> for Vector2<T>`

```silk
impl<T: Copy + Divide<T, T>> Divide<T, Vector2<T>> for Vector2<T>
```

::Anchor{id="Vector2.impl.Divide.divide"}

### Operation `divide`

```silk
fn divide(left: Self, right: T) -> Self
```

::Anchor{id="f32.impl.Multiply"}

## Implementation `Multiply<Vector2<f32>, Vector2<f32>> for f32`

```silk
impl Multiply<Vector2<f32>, Vector2<f32>> for f32
```

::Anchor{id="f32.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: f32, right: Vector2<f32>) -> Vector2<f32>
```

::Anchor{id="f64.impl.Multiply"}

## Implementation `Multiply<Vector2<f64>, Vector2<f64>> for f64`

```silk
impl Multiply<Vector2<f64>, Vector2<f64>> for f64
```

::Anchor{id="f64.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: f64, right: Vector2<f64>) -> Vector2<f64>
```

::Anchor{id="Vector2.impl.Equal"}

## Implementation `Equal for Vector2<T>`

```silk
impl<T: Equal> Equal for Vector2<T>
```

::Anchor{id="Vector2.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="Vector3"}

## `Vector3`

```silk
pub struct Vector3<T>
```

A three-dimensional displacement with `x`, `y`, and `z` components of number type `T`.

### When to use

Use `Vector3` for an offset or a direction in space, such as an axis of rotation or a surface
normal. Use `silk.geometry.point.Point3` for a position.

### Details

The fields are public. `+`, `-`, unary `-`, `* T`, and `/ T` apply to each component when `T`
has the operator. `f32 * Vector3<f32>` and `f64 * Vector3<f64>` scale from the left. `&a == &b`
compares all three components when `T: Equal`.

::Anchor{id="Vector3.x"}

### Field `x`

```silk
pub x: T
```

The first component.

::Anchor{id="Vector3.y"}

### Field `y`

```silk
pub y: T
```

The second component.

::Anchor{id="Vector3.z"}

### Field `z`

```silk
pub z: T
```

The third component.

::Anchor{id="Vector3.impl.Copy"}

## Implementation `Copy for Vector3<T>`

```silk
impl<T: Copy> Copy for Vector3<T>
```

::Anchor{id="Vector3.impl"}

## Implementation `Vector3<T>`

```silk
impl<T> Vector3<T>
```

::Anchor{id="Vector3.impl.new"}

### Associated function `new`

```silk
pub fn new(x: T, y: T, z: T) -> Vector3<T>
```

Returns the vector with components `x`, `y`, and `z`.

::Anchor{id="Vector3.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> Vector3<U>
```

Returns a vector whose components are `transform` applied to `x`, `y`, then `z`.

::Anchor{id="Vector3.impl-2"}

## Implementation `Vector3<T>`

```silk
impl<T: Copy> Vector3<T>
```

::Anchor{id="Vector3.impl.splat"}

### Associated function `splat`

```silk
pub fn splat(value: T) -> Vector3<T>
```

Returns the vector whose three components are all `value`.

::Anchor{id="Vector3.impl.components"}

### Method `components`

```silk
pub fn components(self: Self) -> [T; 3]
```

Returns the components as the array `[x, y, z]`.

::Anchor{id="Vector3.impl-3"}

## Implementation `Vector3<T>`

```silk
impl<T: Zero> Vector3<T>
```

::Anchor{id="Vector3.impl.zero"}

### Associated function `zero`

```silk
pub fn zero() -> Vector3<T>
```

Returns the vector whose three components are zero.

::Anchor{id="Vector3.impl-4"}

## Implementation `Vector3<T>`

```silk
impl<T: Copy + Add<T, T> + Subtract<T, T> + Multiply<T, T>> Vector3<T>
```

::Anchor{id="Vector3.impl.dot"}

### Method `dot`

```silk
pub fn dot(self: Self, other: Vector3<T>) -> T
```

Returns the dot product `self.x * other.x + self.y * other.y + self.z * other.z`.

::Anchor{id="Vector3.impl.cross"}

### Method `cross`

```silk
pub fn cross(self: Self, other: Vector3<T>) -> Vector3<T>
```

Returns the cross product: the vector perpendicular to both inputs, by the right-hand rule.

#### Details

Its length is the area of the parallelogram that the two vectors span. The result is zero when
the inputs are parallel.

::Anchor{id="Vector3.impl.lengthSquared"}

### Method `lengthSquared`

```silk
pub fn lengthSquared(self: Self) -> T
```

Returns `self.dot(self)`, the square of the length, with no square root.

::Anchor{id="Vector3.impl-5"}

## Implementation `Vector3<T>`

```silk
impl<T: Copy + Float + Add<T, T> + Subtract<T, T> + Multiply<T, T> + Divide<T, T>> Vector3<T>
```

::Anchor{id="Vector3.impl.length"}

### Method `length`

```silk
pub fn length(self: Self) -> T
```

Returns the length of the vector, computed without overflow in the intermediate squares.

::Anchor{id="Vector3.impl.normalize"}

### Method `normalize`

```silk
pub fn normalize(self: Self) -> Vector3<T>
```

Returns the vector with the same direction and a length of one.

#### Gotchas

A zero vector, or a vector with an infinite or NaN component, gives NaN components.

::Anchor{id="Vector3.impl.lerp"}

### Method `lerp`

```silk
pub fn lerp(self: Self, other: Vector3<T>, t: T) -> Vector3<T>
```

Returns `self + (other - self) * t`: `self` at `t = 0` and `other` at `t = 1`.

::Anchor{id="Vector3.impl.isFinite"}

### Method `isFinite`

```silk
pub fn isFinite(self: Self) -> bool
```

Returns `true` when all three components are neither infinite nor NaN.

::Anchor{id="Vector3.impl.Add"}

## Implementation `Add<Vector3<T>, Vector3<T>> for Vector3<T>`

```silk
impl<T: Add<T, T>> Add<Vector3<T>, Vector3<T>> for Vector3<T>
```

::Anchor{id="Vector3.impl.Add.add"}

### Operation `add`

```silk
fn add(left: Self, right: Self) -> Self
```

::Anchor{id="Vector3.impl.Subtract"}

## Implementation `Subtract<Vector3<T>, Vector3<T>> for Vector3<T>`

```silk
impl<T: Subtract<T, T>> Subtract<Vector3<T>, Vector3<T>> for Vector3<T>
```

::Anchor{id="Vector3.impl.Subtract.subtract"}

### Operation `subtract`

```silk
fn subtract(left: Self, right: Self) -> Self
```

::Anchor{id="Vector3.impl.Negate"}

## Implementation `Negate<Vector3<T>> for Vector3<T>`

```silk
impl<T: Negate<T>> Negate<Vector3<T>> for Vector3<T>
```

::Anchor{id="Vector3.impl.Negate.negate"}

### Operation `negate`

```silk
fn negate(value: Self) -> Self
```

::Anchor{id="Vector3.impl.Multiply"}

## Implementation `Multiply<T, Vector3<T>> for Vector3<T>`

```silk
impl<T: Copy + Multiply<T, T>> Multiply<T, Vector3<T>> for Vector3<T>
```

::Anchor{id="Vector3.impl.Multiply.multiply"}

### Operation `multiply`

```silk
fn multiply(left: Self, right: T) -> Self
```

::Anchor{id="Vector3.impl.Divide"}

## Implementation `Divide<T, Vector3<T>> for Vector3<T>`

```silk
impl<T: Copy + Divide<T, T>> Divide<T, Vector3<T>> for Vector3<T>
```

::Anchor{id="Vector3.impl.Divide.divide"}

### Operation `divide`

```silk
fn divide(left: Self, right: T) -> Self
```

::Anchor{id="f32.impl.Multiply-2"}

## Implementation `Multiply<Vector3<f32>, Vector3<f32>> for f32`

```silk
impl Multiply<Vector3<f32>, Vector3<f32>> for f32
```

::Anchor{id="f32.impl.Multiply.multiply-2"}

### Operation `multiply`

```silk
fn multiply(left: f32, right: Vector3<f32>) -> Vector3<f32>
```

::Anchor{id="f64.impl.Multiply-2"}

## Implementation `Multiply<Vector3<f64>, Vector3<f64>> for f64`

```silk
impl Multiply<Vector3<f64>, Vector3<f64>> for f64
```

::Anchor{id="f64.impl.Multiply.multiply-2"}

### Operation `multiply`

```silk
fn multiply(left: f64, right: Vector3<f64>) -> Vector3<f64>
```

::Anchor{id="Vector3.impl.Equal"}

## Implementation `Equal for Vector3<T>`

```silk
impl<T: Equal> Equal for Vector3<T>
```

::Anchor{id="Vector3.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Category: Geometry.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
