Sixteen-bit signed integers with explicit overflow, conversion, and text policies.

## When to use
Use `i16` for data whose public representation is exactly sixteen signed bits, such as a binary
field or compact sample. Use `i32` or `i64` when the range is not itself part of the contract.

## Details
Each arithmetic operation has four forms with different overflow rules:

- The plain form, such as [`add`](#add), traps on overflow. Use it when overflow is a program error.
- The `checked` form, such as [`checkedAdd`](#checkedAdd), returns `None` on overflow. Use it when input data
  controls the operands.
- The `wrapping` form, such as [`wrappingAdd`](#wrappingAdd), computes the result modulo 2^16.
- The `saturating` form, such as [`saturatingAdd`](#saturatingAdd), returns [`MIN`](#MIN) or [`MAX`](#MAX) on overflow.

Division and remainder by zero trap, and so does [`MIN`](#MIN) divided by `-1`. [`checkedDivide`](#checkedDivide) and
[`checkedRemainder`](#checkedRemainder) return `None` for these inputs. The shift count must be in the range 0 to
`BITS - 1`. Otherwise, the program traps. A rotate reduces its count modulo [`BITS`](#BITS), so each
count is valid. A signed right shift copies the sign bit into the new high bits.

A `to` conversion, such as `toU8`, traps if the value is out of the range of the destination
type. A `checkedTo` conversion returns `None` instead. Conversion to `f32` or `f64` is exact.

A `wrappingTo` conversion, such as `wrappingToI16`, never traps. It keeps the low bits of the
two's complement form of the value, like a cast in C or Rust, so it truncates, sign-extends, or
reinterprets bits.

[`countOnes`](#countOnes), [`leadingZeros`](#leadingZeros), and [`trailingZeros`](#trailingZeros) count the bits of the value in its two's
complement form. For zero, both zero counts return [`BITS`](#BITS).

[`parse`](#parse) reads decimal text. A leading `-` is valid, and a leading `+` is not valid. To write a
value as text, use `silk.text.format.Format.display` or `Format.displayWith` with a `Writer`. Neither
needs an `Allocator`.

## Gotchas
[`MIN`](#MIN) cannot be represented as a positive i16, so ordinary [`negate`](#negate) traps for that value.

## Examples
### Preserve the sign during a right shift
```silk
import silk.num.i16

pub fn main() -> i32 {
  let shifted = i16.shiftRight(-84, 1)
  let result = i16.toI32(i16.negate(shifted))
  if result != 42 {
    return 1
  }
  return 0
}
```

### Parse decimal text and reject invalid text
```silk
import silk.text.format { ParseError }
import silk.core.result { Result }
import silk.num.i16

pub fn main() -> i32 {
  let parsed = i16.parse("42") |> Result<i16, ParseError>.unwrapOr(0)
  let invalid = i16.parse("4x2") |> Result<i16, ParseError>.unwrapOr(0)
  if parsed != 42 || invalid != 0 {
    return 1
  }
  return 0
}
```

Import as `i16` with `import silk.num.i16`.

Public declarations: 73.

::Anchor{id="MAX"}

## `MAX`

```silk
pub const MAX: i16
```

The largest `i16` value.

::Anchor{id="MIN"}

## `MIN`

```silk
pub const MIN: i16
```

The smallest `i16` value.

::Anchor{id="BITS"}

## `BITS`

```silk
pub const BITS: u32
```

The fixed width of `i16`, in bits.

::Anchor{id="negate"}

## `negate`

```silk
pub fn negate(value: i16) -> i16
```

Returns the arithmetic negation of `value` and traps when `value` is [`MIN`](#MIN). Use
this function when that boundary is a program error.

::Anchor{id="wrappingNegate"}

## `wrappingNegate`

```silk
pub fn wrappingNegate(value: i16) -> i16
```

Returns the arithmetic negation of `value`, wrapped to the `i16` range. [`MIN`](#MIN)
stays [`MIN`](#MIN). Use this function for deliberate modulo arithmetic.

::Anchor{id="saturatingNegate"}

## `saturatingNegate`

```silk
pub fn saturatingNegate(value: i16) -> i16
```

Returns the arithmetic negation of `value`, clamped to the `i16` range. [`MIN`](#MIN)
becomes [`MAX`](#MAX). Use this function when the positive boundary is required.

::Anchor{id="toU8"}

## `toU8`

```silk
pub fn toU8(value: i16) -> u8
```

Converts `value` to `u8`. Traps if `value` is outside the `u8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU8"}

## `checkedToU8`

```silk
pub fn checkedToU8(value: i16) -> Option<u8>
```

Converts `value` to `u8`, or returns `None` if `value` is outside the `u8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU16"}

## `toU16`

```silk
pub fn toU16(value: i16) -> u16
```

Converts `value` to `u16`. Traps if `value` is outside the `u16` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU16"}

## `checkedToU16`

```silk
pub fn checkedToU16(value: i16) -> Option<u16>
```

Converts `value` to `u16`, or returns `None` if `value` is outside the `u16`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU32"}

## `toU32`

```silk
pub fn toU32(value: i16) -> u32
```

Converts `value` to `u32`. Traps if `value` is outside the `u32` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU32"}

## `checkedToU32`

```silk
pub fn checkedToU32(value: i16) -> Option<u32>
```

Converts `value` to `u32`, or returns `None` if `value` is outside the `u32`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU64"}

## `toU64`

```silk
pub fn toU64(value: i16) -> u64
```

Converts `value` to `u64`. Traps if `value` is outside the `u64` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU64"}

## `checkedToU64`

```silk
pub fn checkedToU64(value: i16) -> Option<u64>
```

Converts `value` to `u64`, or returns `None` if `value` is outside the `u64`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toUsize"}

## `toUsize`

```silk
pub fn toUsize(value: i16) -> usize
```

Converts `value` to `usize`. Traps if `value` is outside the `usize` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToUsize"}

## `checkedToUsize`

```silk
pub fn checkedToUsize(value: i16) -> Option<usize>
```

Converts `value` to `usize`, or returns `None` if `value` is outside the `usize`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI8"}

## `toI8`

```silk
pub fn toI8(value: i16) -> i8
```

Converts `value` to `i8`. Traps if `value` is outside the `i8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI8"}

## `checkedToI8`

```silk
pub fn checkedToI8(value: i16) -> Option<i8>
```

Converts `value` to `i8`, or returns `None` if `value` is outside the `i8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI16"}

## `toI16`

```silk
pub fn toI16(value: i16) -> i16
```

Returns `value` unchanged as `i16`. Use this function when generic conversion code
can select `i16` as both source and destination.

::Anchor{id="checkedToI16"}

## `checkedToI16`

```silk
pub fn checkedToI16(value: i16) -> Option<i16>
```

Returns `Some` with `value` unchanged as `i16`. Use this function when generic
checked-conversion code can select the same source and destination type.

::Anchor{id="toI32"}

## `toI32`

```silk
pub fn toI32(value: i16) -> i32
```

Converts `value` exactly to `i32`. Every `i16` value is representable.

::Anchor{id="checkedToI32"}

## `checkedToI32`

```silk
pub fn checkedToI32(value: i16) -> Option<i32>
```

Converts `value` exactly to `i32` and returns `Some`. Every `i16` value is
representable.

::Anchor{id="toI64"}

## `toI64`

```silk
pub fn toI64(value: i16) -> i64
```

Converts `value` exactly to `i64`. Every `i16` value is representable.

::Anchor{id="checkedToI64"}

## `checkedToI64`

```silk
pub fn checkedToI64(value: i16) -> Option<i64>
```

Converts `value` exactly to `i64` and returns `Some`. Every `i16` value is
representable.

::Anchor{id="toIsize"}

## `toIsize`

```silk
pub fn toIsize(value: i16) -> isize
```

Converts `value` exactly to `isize`. Every `i16` value is representable.

::Anchor{id="checkedToIsize"}

## `checkedToIsize`

```silk
pub fn checkedToIsize(value: i16) -> Option<isize>
```

Converts `value` exactly to `isize` and returns `Some`. Every `i16` value is
representable.

::Anchor{id="toF32"}

## `toF32`

```silk
pub fn toF32(value: i16) -> f32
```

Converts `value` exactly to `f32`. Every `i16` magnitude is below `2^24` and so is exactly
representable.

::Anchor{id="toF64"}

## `toF64`

```silk
pub fn toF64(value: i16) -> f64
```

Converts `value` exactly to `f64`. Every `i16` magnitude is below `2^53` and so is exactly
representable.

::Anchor{id="wrappingToU8"}

## `wrappingToU8`

```silk
pub fn wrappingToU8(value: i16) -> u8
```

Converts `value` to `u8` modulo 2^8. Keeps the low 8 bits of the two's complement
form of `value` and reads them as `u8`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU16"}

## `wrappingToU16`

```silk
pub fn wrappingToU16(value: i16) -> u16
```

Converts `value` to `u16` modulo 2^16. Keeps the low 16 bits of the two's complement
form of `value` and reads them as `u16`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU32"}

## `wrappingToU32`

```silk
pub fn wrappingToU32(value: i16) -> u32
```

Converts `value` to `u32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `u32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU64"}

## `wrappingToU64`

```silk
pub fn wrappingToU64(value: i16) -> u64
```

Converts `value` to `u64` modulo 2^64. Keeps the low 64 bits of the two's complement
form of `value` and reads them as `u64`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToUsize"}

## `wrappingToUsize`

```silk
pub fn wrappingToUsize(value: i16) -> usize
```

Converts `value` to `usize` modulo 2^`usize.BITS`. Keeps the low `usize.BITS` bits of the two's
complement form of `value` and reads them as `usize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI8"}

## `wrappingToI8`

```silk
pub fn wrappingToI8(value: i16) -> i8
```

Converts `value` to `i8` modulo 2^8. Keeps the low 8 bits of the two's complement
form of `value` and reads them as `i8`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI16"}

## `wrappingToI16`

```silk
pub fn wrappingToI16(value: i16) -> i16
```

Returns `value` unchanged. Use this function when generic wrapping-conversion code
can select `i16` as both source and destination.

::Anchor{id="wrappingToI32"}

## `wrappingToI32`

```silk
pub fn wrappingToI32(value: i16) -> i32
```

Converts `value` to `i32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `i32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI64"}

## `wrappingToI64`

```silk
pub fn wrappingToI64(value: i16) -> i64
```

Converts `value` to `i64` modulo 2^64. Keeps the low 64 bits of the two's complement
form of `value` and reads them as `i64`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToIsize"}

## `wrappingToIsize`

```silk
pub fn wrappingToIsize(value: i16) -> isize
```

Converts `value` to `isize` modulo 2^`isize.BITS`. Keeps the low `isize.BITS` bits of the two's
complement form of `value` and reads them as `isize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="add"}

## `add`

```silk
pub fn add(left: i16, right: i16) -> i16
```

Returns `left + right` and traps if the result is outside the `i16` range. Use this function
when overflow is a program error.

::Anchor{id="subtract"}

## `subtract`

```silk
pub fn subtract(left: i16, right: i16) -> i16
```

Returns `left - right` and traps if the result is outside the `i16` range. Use this function
when overflow is a program error.

::Anchor{id="multiply"}

## `multiply`

```silk
pub fn multiply(left: i16, right: i16) -> i16
```

Returns `left * right` and traps if the result is outside the `i16` range. Use this function
when overflow is a program error.

::Anchor{id="divide"}

## `divide`

```silk
pub fn divide(left: i16, right: i16) -> i16
```

Returns `left / right`, rounded toward zero. Traps if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when an invalid quotient is a program error.

::Anchor{id="remainder"}

## `remainder`

```silk
pub fn remainder(left: i16, right: i16) -> i16
```

Returns the remainder with the sign of `left`. Traps if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when invalid division is a program error.

::Anchor{id="bitAnd"}

## `bitAnd`

```silk
pub fn bitAnd(left: i16, right: i16) -> i16
```

Returns the bitwise AND of `left` and `right`.

::Anchor{id="bitOr"}

## `bitOr`

```silk
pub fn bitOr(left: i16, right: i16) -> i16
```

Returns the bitwise OR of `left` and `right`.

::Anchor{id="bitXor"}

## `bitXor`

```silk
pub fn bitXor(left: i16, right: i16) -> i16
```

Returns the bitwise exclusive OR of `left` and `right`.

::Anchor{id="bitNot"}

## `bitNot`

```silk
pub fn bitNot(value: i16) -> i16
```

Returns `value` with each bit inverted.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(left: i16, right: i16) -> i16
```

Shifts `left` bits left by `right` positions. Traps if `right` is negative or not less than
[`BITS`](#BITS).

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(left: i16, right: i16) -> i16
```

Shifts `left` bits right by `right` positions and preserves its sign. Traps if `right` is
negative or not less than [`BITS`](#BITS).

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(left: i16, right: i16) -> i16
```

Rotates the bits of `left` left by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(left: i16, right: i16) -> i16
```

Rotates the bits of `left` right by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="countOnes"}

## `countOnes`

```silk
pub fn countOnes(value: i16) -> u32
```

Returns the number of one bits in the two's complement form of `value`.

::Anchor{id="leadingZeros"}

## `leadingZeros`

```silk
pub fn leadingZeros(value: i16) -> u32
```

Returns the number of zero bits above the highest one bit of the two's complement form of
`value`. Returns [`BITS`](#BITS) for zero and 0 for a negative value.

::Anchor{id="trailingZeros"}

## `trailingZeros`

```silk
pub fn trailingZeros(value: i16) -> u32
```

Returns the number of zero bits below the lowest one bit of `value`. Returns [`BITS`](#BITS) for zero.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: i16, right: i16) -> i16
```

Returns `left + right`, wrapped to the `i16` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: i16, right: i16) -> i16
```

Returns `left - right`, wrapped to the `i16` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: i16, right: i16) -> i16
```

Returns `left * right`, wrapped to the `i16` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: i16, right: i16) -> i16
```

Returns `left + right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: i16, right: i16) -> i16
```

Returns `left - right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingMultiply"}

## `saturatingMultiply`

```silk
pub fn saturatingMultiply(left: i16, right: i16) -> i16
```

Returns `left * right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="multiplyHigh"}

## `multiplyHigh`

```silk
pub fn multiplyHigh(left: i16, right: i16) -> i16
```

Returns the high 16 bits of the exact 32-bit product `left * right`. It never overflows.

### When to use

Use this function with [`wrappingMultiply`](#wrappingMultiply), which returns the low 16 bits, when an algorithm
needs the full product, such as multi-word arithmetic, multiply-shift hashing, or division by
a precomputed reciprocal.

### Details

The product is signed, so the high half carries its sign: `multiplyHigh(-1, 1)` is `-1`. The
full product is the high half times 2^16 plus the low half read as unsigned bits.

::Anchor{id="checkedAdd"}

## `checkedAdd`

```silk
pub fn checkedAdd(left: i16, right: i16) -> Option<i16>
```

Returns `Some` with `left + right`, or `None` if the result is outside the `i16` range.
Use this function when overflow is input data.

::Anchor{id="checkedSubtract"}

## `checkedSubtract`

```silk
pub fn checkedSubtract(left: i16, right: i16) -> Option<i16>
```

Returns `Some` with `left - right`, or `None` if the result is outside the `i16` range.
Use this function when overflow is input data.

::Anchor{id="checkedMultiply"}

## `checkedMultiply`

```silk
pub fn checkedMultiply(left: i16, right: i16) -> Option<i16>
```

Returns `Some` with `left * right`, or `None` if the result is outside the `i16` range.
Use this function when overflow is input data.

::Anchor{id="checkedDivide"}

## `checkedDivide`

```silk
pub fn checkedDivide(left: i16, right: i16) -> Option<i16>
```

Returns `Some` with `left / right`, or `None` if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when an invalid quotient is input data.

::Anchor{id="checkedRemainder"}

## `checkedRemainder`

```silk
pub fn checkedRemainder(left: i16, right: i16) -> Option<i16>
```

Returns `Some` with the remainder, or `None` if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when invalid division is input data.

::Anchor{id="equals"}

## `equals`

```silk
pub fn equals(left: i16, right: i16) -> bool
```

Returns `true` if `left` and `right` are equal.

::Anchor{id="notEquals"}

## `notEquals`

```silk
pub fn notEquals(left: i16, right: i16) -> bool
```

Returns `true` if `left` and `right` are not equal.

::Anchor{id="lessThan"}

## `lessThan`

```silk
pub fn lessThan(left: i16, right: i16) -> bool
```

Returns `true` if `left` is less than `right`.

::Anchor{id="lessOrEqual"}

## `lessOrEqual`

```silk
pub fn lessOrEqual(left: i16, right: i16) -> bool
```

Returns `true` if `left` is less than or equal to `right`.

::Anchor{id="greaterThan"}

## `greaterThan`

```silk
pub fn greaterThan(left: i16, right: i16) -> bool
```

Returns `true` if `left` is greater than `right`.

::Anchor{id="greaterOrEqual"}

## `greaterOrEqual`

```silk
pub fn greaterOrEqual(left: i16, right: i16) -> bool
```

Returns `true` if `left` is greater than or equal to `right`.

::Anchor{id="parse"}

## `parse`

```silk
pub fn parse(text: string) -> Result<i16, ParseError>
```

Returns the `i16` value of the decimal text `text`, or a `ParseError`.

### Details

The complete text must be one decimal number, with an optional leading `-`. This function does
not skip spaces and does not accept digit separators.

### Errors

- `ParseError` with reason `silk.text.format.NotANumber` if `text` is empty, starts with `+`,
  contains a byte that is not a digit, or has bytes after the number. `offset` gives the byte
  position where the read stopped.
- `ParseError` with reason `silk.text.format.OutOfRange` if the number is outside the range of `i16`.

Category: Numbers.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
