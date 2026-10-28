Eight-bit unsigned integers for bytes, compact counters, and exact binary representations.

## When to use
Use `u8` for an individual byte or a field specified as eight unsigned bits. Prefer a wider
integer for general counting unless the 0 through 255 range is intentional.

## Details
Each arithmetic operation has four forms with different overflow rules:

- The plain form, such as [`add`](#add), traps on overflow. Use it when overflow is a program error.
- The `checked` form, such as [`checkedAdd`](#checkedAdd), returns `None` on overflow. Use it when input data
  controls the operands.
- The `wrapping` form, such as [`wrappingAdd`](#wrappingAdd), computes the result modulo 2^8.
- The `saturating` form, such as [`saturatingAdd`](#saturatingAdd), returns [`MIN`](#MIN) or [`MAX`](#MAX) on overflow.

Division and remainder by zero trap. [`checkedDivide`](#checkedDivide) and [`checkedRemainder`](#checkedRemainder) return `None`.
The shift count must be in the range 0 to `BITS - 1`. Otherwise, the program traps. A rotate
reduces its count modulo [`BITS`](#BITS), so each count is valid. A right shift inserts zero bits.

A `to` conversion, such as `toU8`, traps if the value is out of the range of the destination
type. A `checkedTo` conversion returns `None` instead. Conversion to `f32` or `f64` is exact.

A `wrappingTo` conversion, such as `wrappingToI16`, never traps. It keeps the low bits of the
two's complement form of the value, like a cast in C or Rust, so it truncates, sign-extends, or
reinterprets bits.

[`countOnes`](#countOnes), [`leadingZeros`](#leadingZeros), and [`trailingZeros`](#trailingZeros) count the bits of the value. For
zero, both zero counts return [`BITS`](#BITS).

[`parse`](#parse) reads decimal text. A sign is not valid. To write a value as text, use
`silk.format.Format.display` or `Format.displayWith` with a `Writer`. Neither needs an
`Allocator`.

## Examples
### Choose an overflow policy instead of relying on a trap
```silk
import silk.option { Option }
import silk.num.u8

pub fn main() -> i32 {
  let checked = u8.checkedAdd(255, 1)
  let recovered = move checked |> Option<u8>.unwrapOr(42)
  if recovered != 42 {
    return 1
  }
  if u8.wrappingAdd(255, 1) != 0 {
    return 1
  }
  if u8.saturatingAdd(255, 1) != 255 {
    return 1
  }
  return 0
}
```

### Parse decimal text and reject invalid text
```silk
import silk.format { ParseError }
import silk.core.result { Result }
import silk.num.u8

pub fn main() -> i32 {
  let parsed = u8.parse("42") |> Result<u8, ParseError>.unwrapOr(0)
  let invalid = u8.parse("4x2") |> Result<u8, ParseError>.unwrapOr(0)
  if parsed != 42 || invalid != 0 {
    return 1
  }
  return 0
}
```

## See also
Use the `silk.text.char` module when a value is a Unicode scalar rather than an arbitrary byte.

Import as `u8` with `import silk.num.u8`.

Public declarations: 70.

::Anchor{id="MAX"}

## `MAX`

```silk
pub const MAX: u8
```

The largest `u8` value.

::Anchor{id="MIN"}

## `MIN`

```silk
pub const MIN: u8
```

The smallest `u8` value.

::Anchor{id="BITS"}

## `BITS`

```silk
pub const BITS: u32
```

The fixed width of `u8`, in bits.

::Anchor{id="toU8"}

## `toU8`

```silk
pub fn toU8(value: u8) -> u8
```

Returns `value` unchanged as `u8`. Use this function when generic conversion code
can select `u8` as both source and destination.

::Anchor{id="checkedToU8"}

## `checkedToU8`

```silk
pub fn checkedToU8(value: u8) -> Option<u8>
```

Returns `Some` with `value` unchanged as `u8`. Use this function when generic
checked-conversion code can select the same source and destination type.

::Anchor{id="toU16"}

## `toU16`

```silk
pub fn toU16(value: u8) -> u16
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `u16`. Every `u8` value is representable.

::Anchor{id="checkedToU16"}

## `checkedToU16`

```silk
pub fn checkedToU16(value: u8) -> Option<u16>
```

Converts `value` exactly to `u16` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toU32"}

## `toU32`

```silk
pub fn toU32(value: u8) -> u32
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `u32`. Every `u8` value is representable.

::Anchor{id="checkedToU32"}

## `checkedToU32`

```silk
pub fn checkedToU32(value: u8) -> Option<u32>
```

Converts `value` exactly to `u32` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toU64"}

## `toU64`

```silk
pub fn toU64(value: u8) -> u64
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `u64`. Every `u8` value is representable.

::Anchor{id="checkedToU64"}

## `checkedToU64`

```silk
pub fn checkedToU64(value: u8) -> Option<u64>
```

Converts `value` exactly to `u64` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toUsize"}

## `toUsize`

```silk
pub fn toUsize(value: u8) -> usize
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `usize`. Every `u8` value is representable.

::Anchor{id="checkedToUsize"}

## `checkedToUsize`

```silk
pub fn checkedToUsize(value: u8) -> Option<usize>
```

Converts `value` exactly to `usize` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toI8"}

## `toI8`

```silk
pub fn toI8(value: u8) -> i8
with Intrinsic.inlineAlways()
```

Converts `value` to `i8`. Traps if `value` is outside the `i8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI8"}

## `checkedToI8`

```silk
pub fn checkedToI8(value: u8) -> Option<i8>
```

Converts `value` to `i8`, or returns `None` if `value` is outside the `i8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI16"}

## `toI16`

```silk
pub fn toI16(value: u8) -> i16
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `i16`. Every `u8` value is representable.

::Anchor{id="checkedToI16"}

## `checkedToI16`

```silk
pub fn checkedToI16(value: u8) -> Option<i16>
```

Converts `value` exactly to `i16` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toI32"}

## `toI32`

```silk
pub fn toI32(value: u8) -> i32
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `i32`. Every `u8` value is representable.

::Anchor{id="checkedToI32"}

## `checkedToI32`

```silk
pub fn checkedToI32(value: u8) -> Option<i32>
```

Converts `value` exactly to `i32` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toI64"}

## `toI64`

```silk
pub fn toI64(value: u8) -> i64
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `i64`. Every `u8` value is representable.

::Anchor{id="checkedToI64"}

## `checkedToI64`

```silk
pub fn checkedToI64(value: u8) -> Option<i64>
```

Converts `value` exactly to `i64` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toIsize"}

## `toIsize`

```silk
pub fn toIsize(value: u8) -> isize
with Intrinsic.inlineAlways()
```

Converts `value` exactly to `isize`. Every `u8` value is representable.

::Anchor{id="checkedToIsize"}

## `checkedToIsize`

```silk
pub fn checkedToIsize(value: u8) -> Option<isize>
```

Converts `value` exactly to `isize` and returns `Some`. Every `u8` value is
representable.

::Anchor{id="toF32"}

## `toF32`

```silk
pub fn toF32(value: u8) -> f32
```

Converts `value` exactly to `f32`. Every `u8` value is below `2^24` and so is exactly
representable.

::Anchor{id="toF64"}

## `toF64`

```silk
pub fn toF64(value: u8) -> f64
```

Converts `value` exactly to `f64`. Every `u8` value is below `2^53` and so is exactly
representable.

::Anchor{id="wrappingToU8"}

## `wrappingToU8`

```silk
pub fn wrappingToU8(value: u8) -> u8
```

Returns `value` unchanged. Use this function when generic wrapping-conversion code
can select `u8` as both source and destination.

::Anchor{id="wrappingToU16"}

## `wrappingToU16`

```silk
pub fn wrappingToU16(value: u8) -> u16
```

Converts `value` to `u16` modulo 2^16. Keeps the low 16 bits of the two's complement
form of `value` and reads them as `u16`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU32"}

## `wrappingToU32`

```silk
pub fn wrappingToU32(value: u8) -> u32
```

Converts `value` to `u32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `u32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU64"}

## `wrappingToU64`

```silk
pub fn wrappingToU64(value: u8) -> u64
```

Converts `value` to `u64` modulo 2^64. Keeps the low 64 bits of the two's complement
form of `value` and reads them as `u64`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToUsize"}

## `wrappingToUsize`

```silk
pub fn wrappingToUsize(value: u8) -> usize
```

Converts `value` to `usize` modulo 2^`usize.BITS`. Keeps the low `usize.BITS` bits of the two's
complement form of `value` and reads them as `usize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI8"}

## `wrappingToI8`

```silk
pub fn wrappingToI8(value: u8) -> i8
```

Converts `value` to `i8` modulo 2^8. Keeps the low 8 bits of the two's complement
form of `value` and reads them as `i8`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI16"}

## `wrappingToI16`

```silk
pub fn wrappingToI16(value: u8) -> i16
```

Converts `value` to `i16` modulo 2^16. Keeps the low 16 bits of the two's complement
form of `value` and reads them as `i16`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI32"}

## `wrappingToI32`

```silk
pub fn wrappingToI32(value: u8) -> i32
```

Converts `value` to `i32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `i32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI64"}

## `wrappingToI64`

```silk
pub fn wrappingToI64(value: u8) -> i64
```

Converts `value` to `i64` modulo 2^64. Keeps the low 64 bits of the two's complement
form of `value` and reads them as `i64`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToIsize"}

## `wrappingToIsize`

```silk
pub fn wrappingToIsize(value: u8) -> isize
```

Converts `value` to `isize` modulo 2^`isize.BITS`. Keeps the low `isize.BITS` bits of the two's
complement form of `value` and reads them as `isize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="add"}

## `add`

```silk
pub fn add(left: u8, right: u8) -> u8
```

Returns `left + right` and traps if the result is outside the `u8` range. Use this function
when overflow is a program error.

::Anchor{id="subtract"}

## `subtract`

```silk
pub fn subtract(left: u8, right: u8) -> u8
```

Returns `left - right` and traps if the result is outside the `u8` range. Use this function
when overflow is a program error.

::Anchor{id="multiply"}

## `multiply`

```silk
pub fn multiply(left: u8, right: u8) -> u8
```

Returns `left * right` and traps if the result is outside the `u8` range. Use this function
when overflow is a program error.

::Anchor{id="divide"}

## `divide`

```silk
pub fn divide(left: u8, right: u8) -> u8
```

Returns `left / right`. Traps if `right` is zero. Use this function when a zero
divisor is a program error.

::Anchor{id="remainder"}

## `remainder`

```silk
pub fn remainder(left: u8, right: u8) -> u8
```

Returns the remainder of `left / right`. Traps if `right` is zero. Use this function
when a zero divisor is a program error.

::Anchor{id="bitAnd"}

## `bitAnd`

```silk
pub fn bitAnd(left: u8, right: u8) -> u8
```

Returns the bitwise AND of `left` and `right`.

::Anchor{id="bitOr"}

## `bitOr`

```silk
pub fn bitOr(left: u8, right: u8) -> u8
```

Returns the bitwise OR of `left` and `right`.

::Anchor{id="bitXor"}

## `bitXor`

```silk
pub fn bitXor(left: u8, right: u8) -> u8
```

Returns the bitwise exclusive OR of `left` and `right`.

::Anchor{id="bitNot"}

## `bitNot`

```silk
pub fn bitNot(value: u8) -> u8
```

Returns `value` with each bit inverted.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(left: u8, right: u8) -> u8
```

Shifts `left` bits left by `right` positions. Traps if `right` is not less than [`BITS`](#BITS).

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(left: u8, right: u8) -> u8
```

Shifts `left` bits right by `right` positions and inserts zero bits. Traps if `right` is
not less than [`BITS`](#BITS).

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(left: u8, right: u8) -> u8
```

Rotates the bits of `left` left by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(left: u8, right: u8) -> u8
```

Rotates the bits of `left` right by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="countOnes"}

## `countOnes`

```silk
pub fn countOnes(value: u8) -> u32
```

Returns the number of one bits in `value`.

::Anchor{id="leadingZeros"}

## `leadingZeros`

```silk
pub fn leadingZeros(value: u8) -> u32
```

Returns the number of zero bits above the highest one bit of `value`. Returns [`BITS`](#BITS) for
zero.

::Anchor{id="trailingZeros"}

## `trailingZeros`

```silk
pub fn trailingZeros(value: u8) -> u32
```

Returns the number of zero bits below the lowest one bit of `value`. Returns [`BITS`](#BITS) for zero.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: u8, right: u8) -> u8
```

Returns `left + right`, wrapped to the `u8` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: u8, right: u8) -> u8
```

Returns `left - right`, wrapped to the `u8` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: u8, right: u8) -> u8
```

Returns `left * right`, wrapped to the `u8` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: u8, right: u8) -> u8
```

Returns `left + right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: u8, right: u8) -> u8
```

Returns `left - right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingMultiply"}

## `saturatingMultiply`

```silk
pub fn saturatingMultiply(left: u8, right: u8) -> u8
```

Returns `left * right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="multiplyHigh"}

## `multiplyHigh`

```silk
pub fn multiplyHigh(left: u8, right: u8) -> u8
```

Returns the high 8 bits of the exact 16-bit product `left * right`. It never overflows.

### When to use

Use this function with [`wrappingMultiply`](#wrappingMultiply), which returns the low 8 bits, when an algorithm
needs the full product, such as multi-word arithmetic, multiply-shift hashing, or division by
a precomputed reciprocal.

::Anchor{id="checkedAdd"}

## `checkedAdd`

```silk
pub fn checkedAdd(left: u8, right: u8) -> Option<u8>
```

Returns `Some` with `left + right`, or `None` if the result is outside the `u8` range.
Use this function when overflow is input data.

::Anchor{id="checkedSubtract"}

## `checkedSubtract`

```silk
pub fn checkedSubtract(left: u8, right: u8) -> Option<u8>
```

Returns `Some` with `left - right`, or `None` if the result is outside the `u8` range.
Use this function when overflow is input data.

::Anchor{id="checkedMultiply"}

## `checkedMultiply`

```silk
pub fn checkedMultiply(left: u8, right: u8) -> Option<u8>
```

Returns `Some` with `left * right`, or `None` if the result is outside the `u8` range.
Use this function when overflow is input data.

::Anchor{id="checkedDivide"}

## `checkedDivide`

```silk
pub fn checkedDivide(left: u8, right: u8) -> Option<u8>
```

Returns `Some` with `left / right`, or `None` if `right` is zero. Use this
function when a zero divisor is input data.

::Anchor{id="checkedRemainder"}

## `checkedRemainder`

```silk
pub fn checkedRemainder(left: u8, right: u8) -> Option<u8>
```

Returns `Some` with the remainder, or `None` if `right` is zero. Use this function
when a zero divisor is input data.

::Anchor{id="equals"}

## `equals`

```silk
pub fn equals(left: u8, right: u8) -> bool
```

Returns `true` if `left` and `right` are equal.

::Anchor{id="notEquals"}

## `notEquals`

```silk
pub fn notEquals(left: u8, right: u8) -> bool
```

Returns `true` if `left` and `right` are not equal.

::Anchor{id="lessThan"}

## `lessThan`

```silk
pub fn lessThan(left: u8, right: u8) -> bool
```

Returns `true` if `left` is less than `right`.

::Anchor{id="lessOrEqual"}

## `lessOrEqual`

```silk
pub fn lessOrEqual(left: u8, right: u8) -> bool
```

Returns `true` if `left` is less than or equal to `right`.

::Anchor{id="greaterThan"}

## `greaterThan`

```silk
pub fn greaterThan(left: u8, right: u8) -> bool
```

Returns `true` if `left` is greater than `right`.

::Anchor{id="greaterOrEqual"}

## `greaterOrEqual`

```silk
pub fn greaterOrEqual(left: u8, right: u8) -> bool
```

Returns `true` if `left` is greater than or equal to `right`.

::Anchor{id="parse"}

## `parse`

```silk
pub fn parse(text: string) -> Result<u8, ParseError>
```

Returns the `u8` value of the decimal text `text`, or a `ParseError`.

### Details

The complete text must be one decimal number. This function does not skip spaces and does not
accept digit separators.

### Errors

- `ParseError` with reason `silk.format.NotANumber` if `text` is empty, has a sign, contains a
  byte that is not a digit, or has bytes after the number. `offset` gives the byte position
  where the read stopped.
- `ParseError` with reason `silk.format.OutOfRange` if the number is outside the range of `u8`.

Category: Numbers.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
