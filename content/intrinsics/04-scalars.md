# Scalar operations

Every arithmetic, comparison, bit and conversion operation on `bool`, `char`, the integers and the floats is a scalar intrinsic. The operators are defined by them: `a + b` on `i32` is `Intrinsic.i32Add(a, b)`. The [`silk/num`](/docs/std/num-i32) modules wrap each one as a method, such as `u32.rotateLeft` or `i32.checkedAdd`, and most code calls those.

## Names

A scalar member is the operand type followed by the operation: `u32ShiftLeft`, `f64Sqrt`, `charLessThan`. A conversion is the source type, `To` or `CheckedTo`, and the target type: `i64ToF32`, `u32CheckedToU8`. Each entry below covers one operation for every type that has it, written with a placeholder:

| Placeholder | Types |
| --- | --- |
| `<integer>` | `u8`, `u16`, `u32`, `u64`, `usize`, `i8`, `i16`, `i32`, `i64`, `isize` |
| `<signed>` | `i8`, `i16`, `i32`, `i64`, `isize` |
| `<float>` | `f32`, `f64` |
| `<numeric>` | `<integer>` and `<float>` |
| `<negatable>` | `<signed>` and `<float>` |
| `<ordered>` | `<numeric>` and `char` |
| `<scalar>` | `<ordered>` and `bool` |

In a signature, `T` is the operand type the name starts with. A name for a type the operation does not take, such as `u32Negate` or `f64ShiftLeft`, is SEM0010.

- Every scalar member is safe, and none is generic over the operand type: write the concrete name.
- Ordinary operations trap on overflow, on division by zero and on an invalid shift count, as the operators do. A trap prints `fatal trap: <reason>` and exits with status 132. `Wrapping`, `Saturating` and `Checked` forms never trap.
- The operators on constants evaluate statically, as in `const size: u32 = (1 + 7) * 2`. A `const` initializer that calls a scalar member by name is SEM0176 in v0.1.0-dev.82, so the members are for runtime code.

### `Intrinsic.<numeric>Add`

```silk signature
fn <numeric>Add(left: T, right: T) -> T
```

Returns `left + right`. It is exactly the `+` operator.

- Integers: a sum outside the type's range traps with "arithmetic overflow". Use `WrappingAdd`, `SaturatingAdd` or `CheckedAdd` for other overflow behavior.
- Floats: IEEE 754 addition, rounded to nearest; overflow gives an infinity.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8Add(200, 55) != 255 || Intrinsic.f64Add(0.5, 0.25) != 0.75 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<numeric>Subtract`

```silk signature
fn <numeric>Subtract(left: T, right: T) -> T
```

Returns `left - right`. It is exactly the `-` operator.

- Integers: a difference outside the type's range traps with "arithmetic overflow", so `u32Subtract(0, 1)` traps.
- Floats: IEEE 754 subtraction.

```silk
pub fn main() -> i32 {
  if Intrinsic.i32Subtract(2, 5) != -3 || Intrinsic.f32Subtract(1.0, 0.5) != 0.5 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<numeric>Multiply`

```silk signature
fn <numeric>Multiply(left: T, right: T) -> T
```

Returns `left * right`. It is exactly the `*` operator.

- Integers: a product outside the type's range traps with "arithmetic overflow".
- Floats: IEEE 754 multiplication.

```silk
pub fn main() -> i32 {
  if Intrinsic.u16Multiply(300, 200) != 60000 || Intrinsic.f64Multiply(1.5, 4.0) != 6.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<numeric>Divide`

```silk signature
fn <numeric>Divide(left: T, right: T) -> T
```

Returns `left / right`. It is exactly the `/` operator.

- Integers: the quotient rounds toward zero, so `i32Divide(-7, 2)` is `-3`. A zero divisor traps with "division by zero", and the signed `MIN / -1` traps with "arithmetic overflow".
- Floats: IEEE 754 division. A zero divisor gives an infinity or NaN, never a trap.

```silk
pub fn main() -> i32 {
  if Intrinsic.i32Divide(-7, 2) != -3 || Intrinsic.f64Divide(1.0, 4.0) != 0.25 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<numeric>Remainder`

```silk signature
fn <numeric>Remainder(left: T, right: T) -> T
```

Returns the remainder of `left / right`, with the sign of `left`. It is exactly the `%` operator.

- Integers: `i32Remainder(-7, 2)` is `-1`. A zero divisor traps with "division by zero", and the signed `MIN % -1` traps with "arithmetic overflow".
- Floats: the remainder of the quotient truncated toward zero, as C's `fmod`: `f64Remainder(7.5, 2.0)` is `1.5`.

```silk
pub fn main() -> i32 {
  if Intrinsic.i32Remainder(-7, 2) != -1 || Intrinsic.f64Remainder(7.5, 2.0) != 1.5 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<negatable>Negate`

```silk signature
fn <negatable>Negate(value: T) -> T
```

Returns `-value`. It is exactly the prefix `-` operator. `<negatable>` is a signed integer type or a float type; unsigned integers have no `Negate`.

- Integers: negating `MIN` traps with "arithmetic overflow".
- Floats: flips the sign bit, also of zero and NaN.

```silk
pub fn main() -> i32 {
  if Intrinsic.i64Negate(5) != -5 || !Intrinsic.f32IsSignNegative(Intrinsic.f32Negate(0.0)) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<scalar>Equals`

```silk signature
fn <scalar>Equals(left: T, right: T) -> bool
```

Returns whether `left == right`. It is exactly the `==` operator, for `bool`, `char`, the integers and the floats.

- Floats: IEEE 754 equality, so `0.0` equals `-0.0` and NaN equals nothing, not even itself.

```silk
pub fn main() -> i32 {
  let nan = Intrinsic.f64Divide(0.0, 0.0)
  if !Intrinsic.charEquals('a', 'a') || Intrinsic.f64Equals(nan, nan) || !Intrinsic.f64Equals(0.0, -0.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<scalar>NotEquals`

```silk signature
fn <scalar>NotEquals(left: T, right: T) -> bool
```

Returns whether `left != right`. It is exactly the `!=` operator.

- Floats: NaN differs from every value, itself included.

```silk
pub fn main() -> i32 {
  if !Intrinsic.boolNotEquals(true, false) || Intrinsic.u8NotEquals(3, 3) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<ordered>LessThan`

```silk signature
fn <ordered>LessThan(left: &T, right: &T) -> bool
```

Returns whether `left < right`. It is exactly the `<` operator, for `char`, the integers and the floats.

- It is the only scalar operation that takes its operands as shared references: `Intrinsic.i32LessThan(&a, &b)`. The other comparisons take values.
- Integers compare under their signedness, `char` by code point, and floats under IEEE 754, where every comparison with NaN is false.

```silk
pub fn main() -> i32 {
  let a: i32 = -1
  let b: i32 = 1
  if !Intrinsic.i32LessThan(&a, &b) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<ordered>LessOrEqual`

```silk signature
fn <ordered>LessOrEqual(left: T, right: T) -> bool
```

Returns whether `left <= right`. It is exactly the `<=` operator.

- Floats: false when either operand is NaN.

```silk
pub fn main() -> i32 {
  if !Intrinsic.u32LessOrEqual(4, 4) || Intrinsic.charLessOrEqual('b', 'a') {
    return 1
  }
  return 0
}
```

### `Intrinsic.<ordered>GreaterThan`

```silk signature
fn <ordered>GreaterThan(left: T, right: T) -> bool
```

Returns whether `left > right`. It is exactly the `>` operator.

- Floats: false when either operand is NaN.

```silk
pub fn main() -> i32 {
  if !Intrinsic.i8GreaterThan(1, -1) || Intrinsic.f32GreaterThan(1.0, 1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<ordered>GreaterOrEqual`

```silk signature
fn <ordered>GreaterOrEqual(left: T, right: T) -> bool
```

Returns whether `left >= right`. It is exactly the `>=` operator.

- Floats: false when either operand is NaN.

```silk
pub fn main() -> i32 {
  if !Intrinsic.usizeGreaterOrEqual(8, 8) || Intrinsic.f64GreaterOrEqual(0.5, 1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>BitAnd`

```silk signature
fn <integer>BitAnd(left: T, right: T) -> T
```

Returns the bitwise AND of two integers. It is exactly the `&` operator.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8BitAnd(0b1100, 0b1010) != 0b1000 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>BitOr`

```silk signature
fn <integer>BitOr(left: T, right: T) -> T
```

Returns the bitwise OR of two integers. It is exactly the `|` operator.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8BitOr(0b1100, 0b1010) != 0b1110 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>BitXor`

```silk signature
fn <integer>BitXor(left: T, right: T) -> T
```

Returns the bitwise exclusive OR of two integers. It is exactly the `^` operator.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8BitXor(0b1100, 0b1010) != 0b0110 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>BitNot`

```silk signature
fn <integer>BitNot(value: T) -> T
```

Returns the integer with every bit flipped. It is exactly the prefix `~` operator.

- For a signed integer it is `-value - 1`.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8BitNot(0) != 255 || Intrinsic.i32BitNot(5) != -6 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>ShiftLeft`

```silk signature
fn <integer>ShiftLeft(value: T, count: T) -> T
```

Shifts `value` left by `count` bits, filling with zeros. Bits shifted past the top are lost; there is no overflow check.

- `count` has the same type as `value`. A count that is negative or at least the bit width traps with "invalid shift count".

```silk
pub fn main() -> i32 {
  if Intrinsic.u32ShiftLeft(1, 4) != 16 || Intrinsic.u8ShiftLeft(0x81, 1) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>ShiftRight`

```silk signature
fn <integer>ShiftRight(value: T, count: T) -> T
```

Shifts `value` right by `count` bits: a logical shift that fills with zeros for unsigned types, and an arithmetic shift that copies the sign bit for signed types.

- A count that is negative or at least the bit width traps with "invalid shift count".

```silk
pub fn main() -> i32 {
  if Intrinsic.u32ShiftRight(0x80, 4) != 8 || Intrinsic.i32ShiftRight(-8, 1) != -4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>RotateLeft`

```silk signature
fn <integer>RotateLeft(value: T, count: T) -> T
```

Rotates the bits of `value` left by `count`: bits shifted out at the top come back at the bottom.

- The count is taken modulo the bit width, so it never traps: `u32RotateLeft(1, 33)` is `2`.

```silk
pub fn main() -> i32 {
  if Intrinsic.u32RotateLeft(0x80000001, 1) != 3 || Intrinsic.u32RotateLeft(1, 33) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>RotateRight`

```silk signature
fn <integer>RotateRight(value: T, count: T) -> T
```

Rotates the bits of `value` right by `count`: bits shifted out at the bottom come back at the top.

- The count is taken modulo the bit width.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8RotateRight(1, 1) != 0x80 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>WrappingAdd`

```silk signature
fn <integer>WrappingAdd(left: T, right: T) -> T
```

Returns the sum modulo 2 to the power of the bit width: the low bits of the exact result. It never traps.

- Use it for hashes, checksums and counters that are meant to wrap.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8WrappingAdd(250, 10) != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>WrappingSubtract`

```silk signature
fn <integer>WrappingSubtract(left: T, right: T) -> T
```

Returns the difference modulo 2 to the power of the bit width: the low bits of the exact result. It never traps.

- Use it for hashes, checksums and counters that are meant to wrap.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8WrappingSubtract(0, 1) != 255 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>WrappingMultiply`

```silk signature
fn <integer>WrappingMultiply(left: T, right: T) -> T
```

Returns the product modulo 2 to the power of the bit width: the low bits of the exact result. It never traps.

- Use it for hashes, checksums and counters that are meant to wrap.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8WrappingMultiply(16, 17) != 16 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<signed>WrappingNegate`

```silk signature
fn <signed>WrappingNegate(value: T) -> T
```

Returns `-value` modulo 2 to the power of the bit width, for a signed integer. Negating `MIN` gives `MIN` instead of trapping.

```silk
pub fn main() -> i32 {
  if Intrinsic.i8WrappingNegate(-128) != -128 || Intrinsic.i8WrappingNegate(5) != -5 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>SaturatingAdd`

```silk signature
fn <integer>SaturatingAdd(left: T, right: T) -> T
```

Returns the sum, clamped to the type's range: a result above `MAX` gives `MAX`, and one below `MIN` gives `MIN`. It never traps.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8SaturatingAdd(250, 10) != 255 || Intrinsic.i8SaturatingAdd(-100, -100) != -128 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>SaturatingSubtract`

```silk signature
fn <integer>SaturatingSubtract(left: T, right: T) -> T
```

Returns the difference, clamped to the type's range: a result above `MAX` gives `MAX`, and one below `MIN` gives `MIN`. It never traps.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8SaturatingSubtract(3, 5) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>SaturatingMultiply`

```silk signature
fn <integer>SaturatingMultiply(left: T, right: T) -> T
```

Returns the product, clamped to the type's range: a result above `MAX` gives `MAX`, and one below `MIN` gives `MIN`. It never traps.

```silk
pub fn main() -> i32 {
  if Intrinsic.u8SaturatingMultiply(20, 20) != 255 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<signed>SaturatingNegate`

```silk signature
fn <signed>SaturatingNegate(value: T) -> T
```

Returns `-value` clamped to the type's range, for a signed integer: negating `MIN` gives `MAX`.

```silk
pub fn main() -> i32 {
  if Intrinsic.i8SaturatingNegate(-128) != 127 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>MultiplyHigh`

```silk signature
fn <integer>MultiplyHigh(left: T, right: T) -> T
```

Returns the high half of the exact double-width product: for `u64`, the upper 64 bits of the 128-bit product. It never overflows.

- Signed types take the high half of the signed product.
- Together with `WrappingMultiply`, which gives the low half, it gives the full product, as fast division by a constant and 128-bit arithmetic need.

```silk
pub fn main() -> i32 {
  if Intrinsic.u64MultiplyHigh(0xffffffffffffffff, 2) != 1 || Intrinsic.u8MultiplyHigh(16, 32) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedAdd`

```silk signature
fn <integer>CheckedAdd<R>(left: T, right: T, present: fn(T) -> R, absent: fn() -> R) -> R
```

Computes the exact sum and returns `present(result)` when it fits in `T`, or `absent()` when it does not. It never traps.

- The result is absent on overflow.
- `R` is any type: pass `Option.some` and `Option.none` for an `Option<T>`, or two functions of your own. The type argument is required.
- The wrapper in each `silk/num` module returns `Option<T>`.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let fits = Intrinsic.u8CheckedAdd<Option<u8>>(200, 55, Option.some, Option.none)
  if let Option<u8>.Some { value } = move fits {
    if value != 255 {
      return 1
    }
  } else {
    return 2
  }
  let zero = Intrinsic.u8CheckedAdd<bool>(255, 2, |_: u8| -> bool { return true }, || -> bool { return false })
  if zero {
    return 3
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedSubtract`

```silk signature
fn <integer>CheckedSubtract<R>(left: T, right: T, present: fn(T) -> R, absent: fn() -> R) -> R
```

Computes the exact difference and returns `present(result)` when it fits in `T`, or `absent()` when it does not. It never traps.

- The result is absent on overflow.
- `R` is any type: pass `Option.some` and `Option.none` for an `Option<T>`, or two functions of your own. The type argument is required.
- The wrapper in each `silk/num` module returns `Option<T>`.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let fits = Intrinsic.u8CheckedSubtract<Option<u8>>(5, 3, Option.some, Option.none)
  if let Option<u8>.Some { value } = move fits {
    if value != 2 {
      return 1
    }
  } else {
    return 2
  }
  let zero = Intrinsic.u8CheckedSubtract<bool>(0, 1, |_: u8| -> bool { return true }, || -> bool { return false })
  if zero {
    return 3
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedMultiply`

```silk signature
fn <integer>CheckedMultiply<R>(left: T, right: T, present: fn(T) -> R, absent: fn() -> R) -> R
```

Computes the exact product and returns `present(result)` when it fits in `T`, or `absent()` when it does not. It never traps.

- The result is absent on overflow.
- `R` is any type: pass `Option.some` and `Option.none` for an `Option<T>`, or two functions of your own. The type argument is required.
- The wrapper in each `silk/num` module returns `Option<T>`.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let fits = Intrinsic.u8CheckedMultiply<Option<u8>>(15, 17, Option.some, Option.none)
  if let Option<u8>.Some { value } = move fits {
    if value != 255 {
      return 1
    }
  } else {
    return 2
  }
  let zero = Intrinsic.u8CheckedMultiply<bool>(255, 2, |_: u8| -> bool { return true }, || -> bool { return false })
  if zero {
    return 3
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedDivide`

```silk signature
fn <integer>CheckedDivide<R>(left: T, right: T, present: fn(T) -> R, absent: fn() -> R) -> R
```

Computes the exact quotient and returns `present(result)` when it fits in `T`, or `absent()` when it does not. It never traps.

- The result is absent for a zero divisor and for the signed `MIN` divided by `-1`.
- `R` is any type: pass `Option.some` and `Option.none` for an `Option<T>`, or two functions of your own. The type argument is required.
- The wrapper in each `silk/num` module returns `Option<T>`.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let fits = Intrinsic.u8CheckedDivide<Option<u8>>(9, 2, Option.some, Option.none)
  if let Option<u8>.Some { value } = move fits {
    if value != 4 {
      return 1
    }
  } else {
    return 2
  }
  let zero = Intrinsic.u8CheckedDivide<bool>(255, 0, |_: u8| -> bool { return true }, || -> bool { return false })
  if zero {
    return 3
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedRemainder`

```silk signature
fn <integer>CheckedRemainder<R>(left: T, right: T, present: fn(T) -> R, absent: fn() -> R) -> R
```

Computes the exact remainder and returns `present(result)` when it fits in `T`, or `absent()` when it does not. It never traps.

- The result is absent for a zero divisor and for the signed `MIN` divided by `-1`.
- `R` is any type: pass `Option.some` and `Option.none` for an `Option<T>`, or two functions of your own. The type argument is required.
- The wrapper in each `silk/num` module returns `Option<T>`.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let fits = Intrinsic.u8CheckedRemainder<Option<u8>>(9, 2, Option.some, Option.none)
  if let Option<u8>.Some { value } = move fits {
    if value != 1 {
      return 1
    }
  } else {
    return 2
  }
  let zero = Intrinsic.u8CheckedRemainder<bool>(255, 0, |_: u8| -> bool { return true }, || -> bool { return false })
  if zero {
    return 3
  }
  return 0
}
```

### `Intrinsic.<float>IsNaN`

```silk signature
fn <float>IsNaN(value: T) -> bool
```

Returns whether `value` is a NaN, of any payload or sign.

```silk
pub fn main() -> i32 {
  let nan = Intrinsic.f64Divide(0.0, 0.0)
  if !Intrinsic.f64IsNaN(nan) || Intrinsic.f64IsNaN(1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>IsInfinite`

```silk signature
fn <float>IsInfinite(value: T) -> bool
```

Returns whether `value` is positive or negative infinity.

```silk
pub fn main() -> i32 {
  if !Intrinsic.f32IsInfinite(Intrinsic.f32Divide(-1.0, 0.0)) || Intrinsic.f32IsInfinite(1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>IsFinite`

```silk signature
fn <float>IsFinite(value: T) -> bool
```

Returns whether `value` is neither infinite nor NaN.

```silk
pub fn main() -> i32 {
  if !Intrinsic.f64IsFinite(0.0) || Intrinsic.f64IsFinite(Intrinsic.f64Divide(1.0, 0.0)) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>IsNormal`

```silk signature
fn <float>IsNormal(value: T) -> bool
```

Returns whether `value` is a normal number: not zero, subnormal, infinite or NaN.

```silk
pub fn main() -> i32 {
  if !Intrinsic.f64IsNormal(1.0) || Intrinsic.f64IsNormal(0.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>IsSubnormal`

```silk signature
fn <float>IsSubnormal(value: T) -> bool
```

Returns whether `value` is subnormal: nonzero, with a magnitude below the smallest normal number.

```silk
pub fn main() -> i32 {
  let tiny = Intrinsic.f32FromBits(1)
  if !Intrinsic.f32IsSubnormal(tiny) || Intrinsic.f32IsSubnormal(1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>IsSignNegative`

```silk signature
fn <float>IsSignNegative(value: T) -> bool
```

Returns whether the sign bit of `value` is set. Unlike `value < 0.0`, it is true for `-0.0` and for a NaN with the sign bit set.

```silk
pub fn main() -> i32 {
  if !Intrinsic.f64IsSignNegative(-0.0) || Intrinsic.f64IsSignNegative(0.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>TotalOrder`

```silk signature
fn <float>TotalOrder(left: T, right: T) -> bool
```

Returns whether `left` comes at or before `right` in the IEEE 754 total order: negative NaNs, negative infinity, the negative numbers, `-0.0`, `0.0`, the positive numbers, positive infinity, positive NaNs.

- Unlike `<=`, it orders every pair, NaN included, and puts `-0.0` before `0.0`. Sorting floats uses it.

```silk
pub fn main() -> i32 {
  if !Intrinsic.f64TotalOrder(-0.0, 0.0) || Intrinsic.f64TotalOrder(0.0, -0.0) || !Intrinsic.f64TotalOrder(1.0, 1.0) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>ToBits`

```silk signature
fn <float>ToBits(value: T) -> U
```

Returns the IEEE 754 bits of a float unchanged: `f32ToBits` returns `u32`, `f64ToBits` returns `u64`.

```silk
pub fn main() -> i32 {
  if Intrinsic.f32ToBits(1.0) != 0x3f800000 || Intrinsic.f64ToBits(-0.0) != 0x8000000000000000 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>FromBits`

```silk signature
fn <float>FromBits(bits: U) -> T
```

Returns the float with exactly these IEEE 754 bits: `f32FromBits` takes `u32`, `f64FromBits` takes `u64`. Every bit pattern is a valid float, NaNs included.

```silk
pub fn main() -> i32 {
  if Intrinsic.f32FromBits(0x3f800000) != 1.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.<float>Sqrt`

```silk signature
fn <float>Sqrt(value: T) -> T
```

Returns the correctly rounded square root. A negative input other than `-0.0` gives NaN.

- It lowers to the hardware instruction, such as `sqrtsd` or `fsqrt`. Other math functions, such as sine and logarithms, are Silk code in `silk/num/f32` and `silk/num/f64`.

```silk
pub fn main() -> i32 {
  if Intrinsic.f64Sqrt(16.0) != 4.0 || !Intrinsic.f64IsNaN(Intrinsic.f64Sqrt(-1.0)) {
    return 1
  }
  return 0
}
```

### `Intrinsic.boolNot`

```silk signature
fn boolNot(value: bool) -> bool
```

Returns the negation of a `bool`. It is exactly the prefix `!` operator.

```silk
pub fn main() -> i32 {
  if Intrinsic.boolNot(true) {
    return 1
  }
  return 0
}
```

### `Intrinsic.boolExpect`

```silk signature
fn boolExpect(condition: bool, expected: bool) -> bool
```

Returns `condition` unchanged, and tells the optimizer that it usually equals `expected`, so the likely branch is laid out as the straight path. It is LLVM's `llvm.expect`.

- A hint only: a wrong guess is slower, never incorrect.
- Wrappers: [`likely`](/docs/std/core-hint#likely) and [`unlikely`](/docs/std/core-hint#unlikely) in `silk/core/hint`.

```silk
pub fn main() -> i32 {
  let value: u32 = 7
  if Intrinsic.boolExpect(value == 0, false) {
    return 1
  }
  return 0
}
```

### `Intrinsic.<numeric>To<numeric>`

```silk signature
fn <numeric>To<numeric>(value: T) -> U
```

Converts a number to another numeric type, such as `i32ToU8` or `f64ToI64`. Every pair of integer and float types has one, and `charToU32` returns a character's code point.

- Integer to integer: the exact value. A value outside the target's range traps with "arithmetic overflow"; `CheckedTo` returns an absent result instead.
- Integer to float: rounded to the nearest float, so `i64ToF32(16777217)` is `16777216.0`.
- Float to integer: truncated toward zero, so `f64ToI32(-1.75)` is `-1`. NaN, an infinity or a value outside the range traps with "arithmetic overflow".
- Float to float: `f32ToF64` is exact, and `f64ToF32` rounds to nearest.
- The `silk/num` modules wrap them as methods such as `i32.toU8`.

```silk
pub fn main() -> i32 {
  if Intrinsic.i32ToU8(44) != 44 || Intrinsic.f64ToI32(-1.75) != -1 || Intrinsic.charToU32('A') != 65 {
    return 1
  }
  if Intrinsic.i64ToF32(16777217) != 16777216.0 {
    return 2
  }
  return 0
}
```

### `Intrinsic.<integer>CheckedTo<integer>`

```silk signature
fn <integer>CheckedTo<integer><R>(value: T, present: fn(U) -> R, absent: fn() -> R) -> R
```

Converts an integer to another integer type, returning `present(result)` when the value fits and `absent()` when it does not. `charFromU32` is the one checked conversion to `char`: it is absent for a surrogate or a value above `0x10FFFF`.

- The type argument `R` is required, as for the checked arithmetic.
- There is no checked float conversion; compare against the range first.

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let narrow = Intrinsic.i32CheckedToU8<Option<u8>>(300, Option.some, Option.none)
  if let Option<u8>.Some { .. } = move narrow {
    return 1
  }
  let letter = Intrinsic.charFromU32<Option<char>>(0x41, Option.some, Option.none)
  if let Option<char>.Some { value } = move letter {
    if value != 'A' {
      return 2
    }
  } else {
    return 3
  }
  return 0
}
```
