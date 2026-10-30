Generic helpers and numeric contracts for algorithms over primitive numbers.

## When to use
Bound a type parameter with [`Zero`](#Zero) or [`One`](#One) when generic code needs the additive or
multiplicative identity of its number type, and with [`Float`](#Float) when it needs square roots,
trigonometry, or other binary floating-point operations. Call [`Numeric.add`](#Numeric.impl.add) to add two values
of any primitive number type from generic code. Use the concrete number modules directly when an
algorithm also needs width-specific conversion, overflow, bitwise, or formatting operations.

## Details
Every primitive integer and float type conforms to [`Zero`](#Zero) and [`One`](#One). Only `f32` and `f64`
conform to [`Float`](#Float), whose operations call the functions of `silk.num.f32` and `silk.num.f64`.
A library number type, such as a fixed-point type, can conform in its own module. The helpers
bound their type parameter with these interfaces or with the operator interfaces of
`silk.core.ops`, such as `T: Add<T, T>`. The compiler selects the conformance during
specialization. A helper adds no effect requirement and no runtime dispatch.

## Gotchas
Each helper keeps the overflow rule of the operator. Integer addition traps if the result is
outside the range of the type.

## Examples
### Add values through one generic contract
```silk
import silk.num.numeric { Numeric }
import silk.core.ops { Add }

fn total<T: Add<T, T>>(first: T, second: T, third: T) -> T {
  let partial = Numeric.add<T>(move first, move second)
  return Numeric.add<T>(move partial, move third)
}

pub fn main() -> i32 {
  let small: u8 = total<u8>(1, 2, 3)
  let large: i64 = total<i64>(40, 1, 1)
  if small != 6 || large != 42 {
    return 1
  }
  return 0
}
```

### Compute a length for any float type
```silk
import silk.num.numeric { Float }
import silk.core.ops { Add, Multiply }
import silk.core.ownership { Copy }

fn length<T: Copy + Float + Add<T, T> + Multiply<T, T>>(x: T, y: T) -> T {
  return Float.sqrt(x * x + y * y)
}

pub fn main() -> i32 {
  let wide: f64 = length<f64>(3.0, 4.0)
  let narrow: f32 = length<f32>(6.0, 8.0)
  if wide != 5.0 || narrow != 10.0 {
    return 1
  }
  return 0
}
```

Import as `Numeric` with `import silk.num.numeric { Numeric }`.

Public declarations: 4.

::Anchor{id="Numeric"}

## `Numeric`

```silk
pub struct Numeric
```

The owner type of the generic numeric helpers. It has no fields and is never constructed.

::Anchor{id="Numeric.impl"}

## Implementation `Numeric`

```silk
impl Numeric
```

::Anchor{id="Numeric.impl.add"}

### Associated function `add`

```silk
pub fn add<T: Add<T, T>>(left: T, right: T) -> T
```

Returns `left + right` for any type `T` that has the `+` operator.

#### When to use

Use `add` in generic code, or to pass addition as a named function.

#### Gotchas

For an integer type, the program traps if the sum is outside the range of `T`.

::Anchor{id="Numeric.impl.zero"}

### Associated function `zero`

```silk
pub fn zero<T: Zero>() -> T
```

Returns the additive identity of `T`, such as `0` for an integer type or `0.0` for a float.

#### When to use

Use `zero` when code must name the zero of a type that it writes as an argument, such as
`Numeric.zero<i32>()`. Inside a generic body that bounds `T: Zero`, `Zero.zero()` gives the
same value.

::Anchor{id="Numeric.impl.one"}

### Associated function `one`

```silk
pub fn one<T: One>() -> T
```

Returns the multiplicative identity of `T`, such as `1` for an integer type or `1.0` for a
float.

#### When to use

Use `one` when code must name the one of a type that it writes as an argument, such as
`Numeric.one<f32>()`. Inside a generic body that bounds `T: One`, `One.one()` gives the same
value.

::Anchor{id="Zero"}

## `Zero`

```silk
pub interface Zero
```

The additive identity of a number type.

### When to use

Bound a type parameter with `Zero` when generic code must start a sum, build an origin, or test
for zero without a literal of the concrete type.

### Details

Every primitive integer type returns `0`, and `f32` and `f64` return positive zero. A library
number type, such as a fixed-point type, can implement `Zero` in its own module.

::Anchor{id="Zero.zero"}

### Operation `zero`

```silk
fn zero() -> Self
```

Returns the value that leaves any other value unchanged under addition.

::Anchor{id="One"}

## `One`

```silk
pub interface One
```

The multiplicative identity of a number type.

### When to use

Bound a type parameter with `One` when generic code must build an identity transform, a unit
scale, or another value that needs `1` of the concrete type.

### Details

Every primitive integer type returns `1`, and `f32` and `f64` return `1.0`. A library number
type, such as a fixed-point type, can implement `One` in its own module.

::Anchor{id="One.one"}

### Operation `one`

```silk
fn one() -> Self
```

Returns the value that leaves any other value unchanged under multiplication.

::Anchor{id="Float"}

## `Float`

```silk
pub interface Float
```

The binary floating-point operations that generic geometry and numeric code needs.

### When to use

Bound a type parameter with `Float` when generic code needs square roots, trigonometry,
rounding, or finiteness tests and must work for both `f32` and `f64`.

### Details

`f32` and `f64` conform, and each operation calls the function of the same name in
`silk.num.f32` or `silk.num.f64`. So each operation returns the same bits on every target and
gives the canonical quiet NaN for every NaN result. Angles are in radians.

### Gotchas

`Float` does not include `Zero` or `One`. Bound with `T: Float + Zero + One` when generic code
also needs those values.

::Anchor{id="Float.sqrt"}

### Operation `sqrt`

```silk
fn sqrt(value: Self) -> Self
```

Returns the square root of `value`. Negative nonzero inputs and NaN return NaN.

::Anchor{id="Float.abs"}

### Operation `abs`

```silk
fn abs(value: Self) -> Self
```

Returns the magnitude of `value`, which clears the sign bit.

::Anchor{id="Float.floor"}

### Operation `floor`

```silk
fn floor(value: Self) -> Self
```

Returns the largest integer value that is not greater than `value`.

::Anchor{id="Float.ceil"}

### Operation `ceil`

```silk
fn ceil(value: Self) -> Self
```

Returns the smallest integer value that is not less than `value`.

::Anchor{id="Float.round"}

### Operation `round`

```silk
fn round(value: Self) -> Self
```

Returns the nearest integer value to `value`, with halfway cases away from zero.

::Anchor{id="Float.trunc"}

### Operation `trunc`

```silk
fn trunc(value: Self) -> Self
```

Returns the integer part of `value`, which discards the fraction toward zero.

::Anchor{id="Float.min"}

### Operation `min`

```silk
fn min(left: Self, right: Self) -> Self
```

Returns the smaller of `left` and `right`, with negative zero below positive zero. A NaN
operand gives NaN.

::Anchor{id="Float.max"}

### Operation `max`

```silk
fn max(left: Self, right: Self) -> Self
```

Returns the larger of `left` and `right`, with positive zero above negative zero. A NaN
operand gives NaN.

::Anchor{id="Float.sin"}

### Operation `sin`

```silk
fn sin(value: Self) -> Self
```

Returns the sine of `value`, an angle in radians.

::Anchor{id="Float.cos"}

### Operation `cos`

```silk
fn cos(value: Self) -> Self
```

Returns the cosine of `value`, an angle in radians.

::Anchor{id="Float.tan"}

### Operation `tan`

```silk
fn tan(value: Self) -> Self
```

Returns the tangent of `value`, an angle in radians.

::Anchor{id="Float.atan2"}

### Operation `atan2`

```silk
fn atan2(y: Self, x: Self) -> Self
```

Returns the angle in radians from the positive x axis to the point `(x, y)`, in `[-pi, pi]`.

::Anchor{id="Float.hypot"}

### Operation `hypot`

```silk
fn hypot(x: Self, y: Self) -> Self
```

Returns `sqrt(x * x + y * y)` without overflow or underflow in the intermediate squares.

::Anchor{id="Float.fma"}

### Operation `fma`

```silk
fn fma(left: Self, right: Self, addend: Self) -> Self
```

Returns `left * right + addend` with one rounding.

::Anchor{id="Float.isFinite"}

### Operation `isFinite`

```silk
fn isFinite(value: Self) -> bool
```

Returns `true` when `value` is neither infinite nor NaN.

::Anchor{id="Float.isNaN"}

### Operation `isNaN`

```silk
fn isNaN(value: Self) -> bool
```

Returns `true` when `value` is NaN.

::Anchor{id="u8.impl.Zero"}

## Implementation `Zero for u8`

```silk
impl Zero for u8
```

::Anchor{id="u8.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> u8
```

::Anchor{id="u16.impl.Zero"}

## Implementation `Zero for u16`

```silk
impl Zero for u16
```

::Anchor{id="u16.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> u16
```

::Anchor{id="u32.impl.Zero"}

## Implementation `Zero for u32`

```silk
impl Zero for u32
```

::Anchor{id="u32.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> u32
```

::Anchor{id="u64.impl.Zero"}

## Implementation `Zero for u64`

```silk
impl Zero for u64
```

::Anchor{id="u64.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> u64
```

::Anchor{id="usize.impl.Zero"}

## Implementation `Zero for usize`

```silk
impl Zero for usize
```

::Anchor{id="usize.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> usize
```

::Anchor{id="i8.impl.Zero"}

## Implementation `Zero for i8`

```silk
impl Zero for i8
```

::Anchor{id="i8.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> i8
```

::Anchor{id="i16.impl.Zero"}

## Implementation `Zero for i16`

```silk
impl Zero for i16
```

::Anchor{id="i16.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> i16
```

::Anchor{id="i32.impl.Zero"}

## Implementation `Zero for i32`

```silk
impl Zero for i32
```

::Anchor{id="i32.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> i32
```

::Anchor{id="i64.impl.Zero"}

## Implementation `Zero for i64`

```silk
impl Zero for i64
```

::Anchor{id="i64.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> i64
```

::Anchor{id="isize.impl.Zero"}

## Implementation `Zero for isize`

```silk
impl Zero for isize
```

::Anchor{id="isize.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> isize
```

::Anchor{id="f32.impl.Zero"}

## Implementation `Zero for f32`

```silk
impl Zero for f32
```

::Anchor{id="f32.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> f32
```

::Anchor{id="f64.impl.Zero"}

## Implementation `Zero for f64`

```silk
impl Zero for f64
```

::Anchor{id="f64.impl.Zero.zero"}

### Operation `zero`

```silk
fn zero() -> f64
```

::Anchor{id="u8.impl.One"}

## Implementation `One for u8`

```silk
impl One for u8
```

::Anchor{id="u8.impl.One.one"}

### Operation `one`

```silk
fn one() -> u8
```

::Anchor{id="u16.impl.One"}

## Implementation `One for u16`

```silk
impl One for u16
```

::Anchor{id="u16.impl.One.one"}

### Operation `one`

```silk
fn one() -> u16
```

::Anchor{id="u32.impl.One"}

## Implementation `One for u32`

```silk
impl One for u32
```

::Anchor{id="u32.impl.One.one"}

### Operation `one`

```silk
fn one() -> u32
```

::Anchor{id="u64.impl.One"}

## Implementation `One for u64`

```silk
impl One for u64
```

::Anchor{id="u64.impl.One.one"}

### Operation `one`

```silk
fn one() -> u64
```

::Anchor{id="usize.impl.One"}

## Implementation `One for usize`

```silk
impl One for usize
```

::Anchor{id="usize.impl.One.one"}

### Operation `one`

```silk
fn one() -> usize
```

::Anchor{id="i8.impl.One"}

## Implementation `One for i8`

```silk
impl One for i8
```

::Anchor{id="i8.impl.One.one"}

### Operation `one`

```silk
fn one() -> i8
```

::Anchor{id="i16.impl.One"}

## Implementation `One for i16`

```silk
impl One for i16
```

::Anchor{id="i16.impl.One.one"}

### Operation `one`

```silk
fn one() -> i16
```

::Anchor{id="i32.impl.One"}

## Implementation `One for i32`

```silk
impl One for i32
```

::Anchor{id="i32.impl.One.one"}

### Operation `one`

```silk
fn one() -> i32
```

::Anchor{id="i64.impl.One"}

## Implementation `One for i64`

```silk
impl One for i64
```

::Anchor{id="i64.impl.One.one"}

### Operation `one`

```silk
fn one() -> i64
```

::Anchor{id="isize.impl.One"}

## Implementation `One for isize`

```silk
impl One for isize
```

::Anchor{id="isize.impl.One.one"}

### Operation `one`

```silk
fn one() -> isize
```

::Anchor{id="f32.impl.One"}

## Implementation `One for f32`

```silk
impl One for f32
```

::Anchor{id="f32.impl.One.one"}

### Operation `one`

```silk
fn one() -> f32
```

::Anchor{id="f64.impl.One"}

## Implementation `One for f64`

```silk
impl One for f64
```

::Anchor{id="f64.impl.One.one"}

### Operation `one`

```silk
fn one() -> f64
```

::Anchor{id="f32.impl.Float"}

## Implementation `Float for f32`

```silk
impl Float for f32
```

::Anchor{id="f32.impl.Float.sqrt"}

### Operation `sqrt`

```silk
fn sqrt(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.abs"}

### Operation `abs`

```silk
fn abs(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.floor"}

### Operation `floor`

```silk
fn floor(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.ceil"}

### Operation `ceil`

```silk
fn ceil(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.round"}

### Operation `round`

```silk
fn round(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.trunc"}

### Operation `trunc`

```silk
fn trunc(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.sin"}

### Operation `sin`

```silk
fn sin(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.cos"}

### Operation `cos`

```silk
fn cos(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.tan"}

### Operation `tan`

```silk
fn tan(value: f32) -> f32
```

::Anchor{id="f32.impl.Float.min"}

### Operation `min`

```silk
fn min(left: f32, right: f32) -> f32
```

::Anchor{id="f32.impl.Float.max"}

### Operation `max`

```silk
fn max(left: f32, right: f32) -> f32
```

::Anchor{id="f32.impl.Float.atan2"}

### Operation `atan2`

```silk
fn atan2(y: f32, x: f32) -> f32
```

::Anchor{id="f32.impl.Float.hypot"}

### Operation `hypot`

```silk
fn hypot(x: f32, y: f32) -> f32
```

::Anchor{id="f32.impl.Float.fma"}

### Operation `fma`

```silk
fn fma(left: f32, right: f32, addend: f32) -> f32
```

::Anchor{id="f32.impl.Float.isFinite"}

### Operation `isFinite`

```silk
fn isFinite(value: f32) -> bool
```

::Anchor{id="f32.impl.Float.isNaN"}

### Operation `isNaN`

```silk
fn isNaN(value: f32) -> bool
```

::Anchor{id="f64.impl.Float"}

## Implementation `Float for f64`

```silk
impl Float for f64
```

::Anchor{id="f64.impl.Float.sqrt"}

### Operation `sqrt`

```silk
fn sqrt(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.abs"}

### Operation `abs`

```silk
fn abs(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.floor"}

### Operation `floor`

```silk
fn floor(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.ceil"}

### Operation `ceil`

```silk
fn ceil(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.round"}

### Operation `round`

```silk
fn round(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.trunc"}

### Operation `trunc`

```silk
fn trunc(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.sin"}

### Operation `sin`

```silk
fn sin(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.cos"}

### Operation `cos`

```silk
fn cos(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.tan"}

### Operation `tan`

```silk
fn tan(value: f64) -> f64
```

::Anchor{id="f64.impl.Float.min"}

### Operation `min`

```silk
fn min(left: f64, right: f64) -> f64
```

::Anchor{id="f64.impl.Float.max"}

### Operation `max`

```silk
fn max(left: f64, right: f64) -> f64
```

::Anchor{id="f64.impl.Float.atan2"}

### Operation `atan2`

```silk
fn atan2(y: f64, x: f64) -> f64
```

::Anchor{id="f64.impl.Float.hypot"}

### Operation `hypot`

```silk
fn hypot(x: f64, y: f64) -> f64
```

::Anchor{id="f64.impl.Float.fma"}

### Operation `fma`

```silk
fn fma(left: f64, right: f64, addend: f64) -> f64
```

::Anchor{id="f64.impl.Float.isFinite"}

### Operation `isFinite`

```silk
fn isFinite(value: f64) -> bool
```

::Anchor{id="f64.impl.Float.isNaN"}

### Operation `isNaN`

```silk
fn isNaN(value: f64) -> bool
```

Category: Numbers.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
