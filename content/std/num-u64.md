Sixty-four-bit unsigned integers for wide masks, counters, hashes, and exact interchange values.

## When to use
Use `u64` when a stable unsigned 64-bit representation matters. It is the representation used
for hash output. Use `usize` instead for target-sized collection lengths and indices.

## Details
Each arithmetic operation has four forms with different overflow rules:

- The plain form, such as [`add`](#add), traps on overflow. Use it when overflow is a program error.
- The `checked` form, such as [`checkedAdd`](#checkedAdd), returns `None` on overflow. Use it when input data
  controls the operands.
- The `wrapping` form, such as [`wrappingAdd`](#wrappingAdd), computes the result modulo 2^64.
- The `saturating` form, such as [`saturatingAdd`](#saturatingAdd), returns [`MIN`](#MIN) or [`MAX`](#MAX) on overflow.

Division and remainder by zero trap. [`checkedDivide`](#checkedDivide) and [`checkedRemainder`](#checkedRemainder) return `None`.
The shift count must be in the range 0 to `BITS - 1`. Otherwise, the program traps. A rotate
reduces its count modulo [`BITS`](#BITS), so each count is valid. A right shift inserts zero bits.

A `to` conversion, such as `toU8`, traps if the value is out of the range of the destination
type. A `checkedTo` conversion returns `None` instead. Conversion to `f32` or `f64` rounds to
the nearest value if the integer has more significant bits than the float.

A `wrappingTo` conversion, such as `wrappingToI16`, never traps. It keeps the low bits of the
two's complement form of the value, like a cast in C or Rust, so it truncates, sign-extends, or
reinterprets bits.

[`countOnes`](#countOnes), [`leadingZeros`](#leadingZeros), and [`trailingZeros`](#trailingZeros) count the bits of the value. For
zero, both zero counts return [`BITS`](#BITS).

[`parse`](#parse) reads decimal text. A sign is not valid. To write a value as text, use
`silk.text.format.Format.display` or `Format.displayWith` with a `Writer`. Neither needs an
`Allocator`.

## Gotchas
A `u64` can represent values that neither `i64` nor every target's `usize` can hold. Use a
checked conversion when that boundary is controlled by input.

## Examples
### Read the high half of a 64-bit field
```silk
import silk.num.u64

pub fn main() -> i32 {
  let high = u64.shiftRight(0x0000002A00000000, 32)
  let result = u64.toI32(high)
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
import silk.num.u64

pub fn main() -> i32 {
  let parsed = u64.parse("42") |> Result<u64, ParseError>.unwrapOr(0)
  let invalid = u64.parse("4x2") |> Result<u64, ParseError>.unwrapOr(0)
  if parsed != 42 || invalid != 0 {
    return 1
  }
  return 0
}
```

Import as `u64` with `import silk.num.u64`.

Public declarations: 70.

::Anchor{id="MAX"}

## `MAX`

```silk
pub const MAX: u64
```

The largest `u64` value.

::Anchor{id="MIN"}

## `MIN`

```silk
pub const MIN: u64
```

The smallest `u64` value.

::Anchor{id="BITS"}

## `BITS`

```silk
pub const BITS: u32
```

The fixed width of `u64`, in bits.

::Anchor{id="toU8"}

## `toU8`

```silk
pub fn toU8(value: u64) -> u8
```

Converts `value` to `u8`. Traps if `value` is outside the `u8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU8"}

## `checkedToU8`

```silk
pub fn checkedToU8(value: u64) -> Option<u8>
```

Converts `value` to `u8`, or returns `None` if `value` is outside the `u8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU16"}

## `toU16`

```silk
pub fn toU16(value: u64) -> u16
```

Converts `value` to `u16`. Traps if `value` is outside the `u16` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU16"}

## `checkedToU16`

```silk
pub fn checkedToU16(value: u64) -> Option<u16>
```

Converts `value` to `u16`, or returns `None` if `value` is outside the `u16`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU32"}

## `toU32`

```silk
pub fn toU32(value: u64) -> u32
```

Converts `value` to `u32`. Traps if `value` is outside the `u32` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU32"}

## `checkedToU32`

```silk
pub fn checkedToU32(value: u64) -> Option<u32>
```

Converts `value` to `u32`, or returns `None` if `value` is outside the `u32`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU64"}

## `toU64`

```silk
pub fn toU64(value: u64) -> u64
```

Returns `value` unchanged as `u64`. Use this function when generic conversion code
can select `u64` as both source and destination.

::Anchor{id="checkedToU64"}

## `checkedToU64`

```silk
pub fn checkedToU64(value: u64) -> Option<u64>
```

Returns `Some` with `value` unchanged as `u64`. Use this function when generic
checked-conversion code can select the same source and destination type.

::Anchor{id="toUsize"}

## `toUsize`

```silk
pub fn toUsize(value: u64) -> usize
```

Converts `value` to `usize`. Traps if `value` is outside the `usize` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToUsize"}

## `checkedToUsize`

```silk
pub fn checkedToUsize(value: u64) -> Option<usize>
```

Converts `value` to `usize`, or returns `None` if `value` is outside the `usize`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI8"}

## `toI8`

```silk
pub fn toI8(value: u64) -> i8
```

Converts `value` to `i8`. Traps if `value` is outside the `i8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI8"}

## `checkedToI8`

```silk
pub fn checkedToI8(value: u64) -> Option<i8>
```

Converts `value` to `i8`, or returns `None` if `value` is outside the `i8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI16"}

## `toI16`

```silk
pub fn toI16(value: u64) -> i16
```

Converts `value` to `i16`. Traps if `value` is outside the `i16` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI16"}

## `checkedToI16`

```silk
pub fn checkedToI16(value: u64) -> Option<i16>
```

Converts `value` to `i16`, or returns `None` if `value` is outside the `i16`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI32"}

## `toI32`

```silk
pub fn toI32(value: u64) -> i32
```

Converts `value` to `i32`. Traps if `value` is outside the `i32` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI32"}

## `checkedToI32`

```silk
pub fn checkedToI32(value: u64) -> Option<i32>
```

Converts `value` to `i32`, or returns `None` if `value` is outside the `i32`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI64"}

## `toI64`

```silk
pub fn toI64(value: u64) -> i64
```

Converts `value` to `i64`. Traps if `value` is outside the `i64` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI64"}

## `checkedToI64`

```silk
pub fn checkedToI64(value: u64) -> Option<i64>
```

Converts `value` to `i64`, or returns `None` if `value` is outside the `i64`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toIsize"}

## `toIsize`

```silk
pub fn toIsize(value: u64) -> isize
```

Converts `value` to `isize`. Traps if `value` is outside the `isize` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToIsize"}

## `checkedToIsize`

```silk
pub fn checkedToIsize(value: u64) -> Option<isize>
```

Converts `value` to `isize`, or returns `None` if `value` is outside the `isize`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toF32"}

## `toF32`

```silk
pub fn toF32(value: u64) -> f32
```

Converts `value` to the nearest `f32` value, with ties to even. Only magnitudes below `2^24` are
exactly representable, so a larger `u64` rounds.

::Anchor{id="toF64"}

## `toF64`

```silk
pub fn toF64(value: u64) -> f64
```

Converts `value` to the nearest `f64` value, with ties to even. Only magnitudes below `2^53` are
exactly representable, so a larger `u64` rounds.

::Anchor{id="wrappingToU8"}

## `wrappingToU8`

```silk
pub fn wrappingToU8(value: u64) -> u8
```

Converts `value` to `u8` modulo 2^8. Keeps the low 8 bits of the two's complement
form of `value` and reads them as `u8`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU16"}

## `wrappingToU16`

```silk
pub fn wrappingToU16(value: u64) -> u16
```

Converts `value` to `u16` modulo 2^16. Keeps the low 16 bits of the two's complement
form of `value` and reads them as `u16`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU32"}

## `wrappingToU32`

```silk
pub fn wrappingToU32(value: u64) -> u32
```

Converts `value` to `u32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `u32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToU64"}

## `wrappingToU64`

```silk
pub fn wrappingToU64(value: u64) -> u64
```

Returns `value` unchanged. Use this function when generic wrapping-conversion code
can select `u64` as both source and destination.

::Anchor{id="wrappingToUsize"}

## `wrappingToUsize`

```silk
pub fn wrappingToUsize(value: u64) -> usize
```

Converts `value` to `usize` modulo 2^`usize.BITS`. Keeps the low `usize.BITS` bits of the two's
complement form of `value` and reads them as `usize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI8"}

## `wrappingToI8`

```silk
pub fn wrappingToI8(value: u64) -> i8
```

Converts `value` to `i8` modulo 2^8. Keeps the low 8 bits of the two's complement
form of `value` and reads them as `i8`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI16"}

## `wrappingToI16`

```silk
pub fn wrappingToI16(value: u64) -> i16
```

Converts `value` to `i16` modulo 2^16. Keeps the low 16 bits of the two's complement
form of `value` and reads them as `i16`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI32"}

## `wrappingToI32`

```silk
pub fn wrappingToI32(value: u64) -> i32
```

Converts `value` to `i32` modulo 2^32. Keeps the low 32 bits of the two's complement
form of `value` and reads them as `i32`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToI64"}

## `wrappingToI64`

```silk
pub fn wrappingToI64(value: u64) -> i64
```

Converts `value` to `i64` modulo 2^64. Keeps the low 64 bits of the two's complement
form of `value` and reads them as `i64`, so it never traps. Use this function for deliberate
truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="wrappingToIsize"}

## `wrappingToIsize`

```silk
pub fn wrappingToIsize(value: u64) -> isize
```

Converts `value` to `isize` modulo 2^`isize.BITS`. Keeps the low `isize.BITS` bits of the two's
complement form of `value` and reads them as `isize`, so it never traps. Use this function for
deliberate truncation, sign extension, or bit reinterpretation, such as reading a signed field.

::Anchor{id="add"}

## `add`

```silk
pub fn add(left: u64, right: u64) -> u64
```

Returns `left + right` and traps if the result is outside the `u64` range. Use this function
when overflow is a program error.

::Anchor{id="subtract"}

## `subtract`

```silk
pub fn subtract(left: u64, right: u64) -> u64
```

Returns `left - right` and traps if the result is outside the `u64` range. Use this function
when overflow is a program error.

::Anchor{id="multiply"}

## `multiply`

```silk
pub fn multiply(left: u64, right: u64) -> u64
```

Returns `left * right` and traps if the result is outside the `u64` range. Use this function
when overflow is a program error.

::Anchor{id="divide"}

## `divide`

```silk
pub fn divide(left: u64, right: u64) -> u64
```

Returns `left / right`. Traps if `right` is zero. Use this function when a zero
divisor is a program error.

::Anchor{id="remainder"}

## `remainder`

```silk
pub fn remainder(left: u64, right: u64) -> u64
```

Returns the remainder of `left / right`. Traps if `right` is zero. Use this function
when a zero divisor is a program error.

::Anchor{id="bitAnd"}

## `bitAnd`

```silk
pub fn bitAnd(left: u64, right: u64) -> u64
```

Returns the bitwise AND of `left` and `right`.

::Anchor{id="bitOr"}

## `bitOr`

```silk
pub fn bitOr(left: u64, right: u64) -> u64
```

Returns the bitwise OR of `left` and `right`.

::Anchor{id="bitXor"}

## `bitXor`

```silk
pub fn bitXor(left: u64, right: u64) -> u64
```

Returns the bitwise exclusive OR of `left` and `right`.

::Anchor{id="bitNot"}

## `bitNot`

```silk
pub fn bitNot(value: u64) -> u64
```

Returns `value` with each bit inverted.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(left: u64, right: u64) -> u64
```

Shifts `left` bits left by `right` positions. Traps if `right` is not less than [`BITS`](#BITS).

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(left: u64, right: u64) -> u64
```

Shifts `left` bits right by `right` positions and inserts zero bits. Traps if `right` is
not less than [`BITS`](#BITS).

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(left: u64, right: u64) -> u64
```

Rotates the bits of `left` left by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(left: u64, right: u64) -> u64
```

Rotates the bits of `left` right by `right` positions. The count is reduced modulo [`BITS`](#BITS), so
each count is valid.

::Anchor{id="countOnes"}

## `countOnes`

```silk
pub fn countOnes(value: u64) -> u32
```

Returns the number of one bits in `value`.

::Anchor{id="leadingZeros"}

## `leadingZeros`

```silk
pub fn leadingZeros(value: u64) -> u32
```

Returns the number of zero bits above the highest one bit of `value`. Returns 64 for zero.

::Anchor{id="trailingZeros"}

## `trailingZeros`

```silk
pub fn trailingZeros(value: u64) -> u32
```

Returns the number of zero bits below the lowest one bit of `value`. Returns 64 for zero.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: u64, right: u64) -> u64
```

Returns `left + right`, wrapped to the `u64` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: u64, right: u64) -> u64
```

Returns `left - right`, wrapped to the `u64` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: u64, right: u64) -> u64
```

Returns `left * right`, wrapped to the `u64` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: u64, right: u64) -> u64
```

Returns `left + right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: u64, right: u64) -> u64
```

Returns `left - right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingMultiply"}

## `saturatingMultiply`

```silk
pub fn saturatingMultiply(left: u64, right: u64) -> u64
```

Returns `left * right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="multiplyHigh"}

## `multiplyHigh`

```silk
pub fn multiplyHigh(left: u64, right: u64) -> u64
```

Returns the high 64 bits of the exact 128-bit product `left * right`. It never overflows.

### When to use

Use this function with [`wrappingMultiply`](#wrappingMultiply), which returns the low 64 bits, when an algorithm
needs the full product, such as multi-word arithmetic, multiply-shift hashing, or division by
a precomputed reciprocal.

### Details

### Examples

#### Split a 128-bit product into its halves

```silk
import silk.num.u64

pub fn main() -> i32 {
  let high = u64.multiplyHigh(0xFFFFFFFFFFFFFFFF, 0xFFFFFFFFFFFFFFFF)
  let low = u64.wrappingMultiply(0xFFFFFFFFFFFFFFFF, 0xFFFFFFFFFFFFFFFF)
  if high != 0xFFFFFFFFFFFFFFFE || low != 1 {
    return 1
  }
  return 0
}
```

::Anchor{id="checkedAdd"}

## `checkedAdd`

```silk
pub fn checkedAdd(left: u64, right: u64) -> Option<u64>
```

Returns `Some` with `left + right`, or `None` if the result is outside the `u64` range.
Use this function when overflow is input data.

::Anchor{id="checkedSubtract"}

## `checkedSubtract`

```silk
pub fn checkedSubtract(left: u64, right: u64) -> Option<u64>
```

Returns `Some` with `left - right`, or `None` if the result is outside the `u64` range.
Use this function when overflow is input data.

::Anchor{id="checkedMultiply"}

## `checkedMultiply`

```silk
pub fn checkedMultiply(left: u64, right: u64) -> Option<u64>
```

Returns `Some` with `left * right`, or `None` if the result is outside the `u64` range.
Use this function when overflow is input data.

::Anchor{id="checkedDivide"}

## `checkedDivide`

```silk
pub fn checkedDivide(left: u64, right: u64) -> Option<u64>
```

Returns `Some` with `left / right`, or `None` if `right` is zero. Use this
function when a zero divisor is input data.

::Anchor{id="checkedRemainder"}

## `checkedRemainder`

```silk
pub fn checkedRemainder(left: u64, right: u64) -> Option<u64>
```

Returns `Some` with the remainder, or `None` if `right` is zero. Use this function
when a zero divisor is input data.

::Anchor{id="equals"}

## `equals`

```silk
pub fn equals(left: u64, right: u64) -> bool
```

Returns `true` if `left` and `right` are equal.

::Anchor{id="notEquals"}

## `notEquals`

```silk
pub fn notEquals(left: u64, right: u64) -> bool
```

Returns `true` if `left` and `right` are not equal.

::Anchor{id="lessThan"}

## `lessThan`

```silk
pub fn lessThan(left: u64, right: u64) -> bool
```

Returns `true` if `left` is less than `right`.

::Anchor{id="lessOrEqual"}

## `lessOrEqual`

```silk
pub fn lessOrEqual(left: u64, right: u64) -> bool
```

Returns `true` if `left` is less than or equal to `right`.

::Anchor{id="greaterThan"}

## `greaterThan`

```silk
pub fn greaterThan(left: u64, right: u64) -> bool
```

Returns `true` if `left` is greater than `right`.

::Anchor{id="greaterOrEqual"}

## `greaterOrEqual`

```silk
pub fn greaterOrEqual(left: u64, right: u64) -> bool
```

Returns `true` if `left` is greater than or equal to `right`.

::Anchor{id="parse"}

## `parse`

```silk
pub fn parse(text: string) -> Result<u64, ParseError>
```

Returns the `u64` value of the decimal text `text`, or a `ParseError`.

### Details

The complete text must be one decimal number. This function does not skip spaces and does not
accept digit separators.

### Errors

- `ParseError` with reason `silk.text.format.NotANumber` if `text` is empty, has a sign, contains a
  byte that is not a digit, or has bytes after the number. `offset` gives the byte position
  where the read stopped.
- `ParseError` with reason `silk.text.format.OutOfRange` if the number is outside the range of `u64`.

Category: Numbers.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
