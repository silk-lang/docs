Pointer-width signed integers for offsets whose range follows the selected compilation target.

## When to use
Use `isize` for offsets paired with target-sized counts or addresses. Use a fixed-width integer
for files, protocols, persistent data, or any value that must mean the same thing on 32-bit and
64-bit targets.

## Details
[`BITS`](#BITS), [`MIN`](#MIN), and [`MAX`](#MAX) are selected from the target. Ordinary arithmetic, narrowing
conversions, division by zero, and invalid shift counts trap. `checked*` returns [`Option`](/docs/std/option#Option),
`wrapping*` uses arithmetic modulo the target width, and `saturating*` clamps at the target bound.

Decimal [`parse`](#parse) uses the selected range. Use [`Format`](/docs/std/format#Format) with `Format.display` for defaults or
`Format.displayWith` for explicit options. Both operations stream through a mutable `Writer`
without `Allocator`.

## Gotchas
Code that succeeds at a 64-bit boundary may fail or trap when compiled for a 32-bit target.
[`MIN`](#MIN) also has no positive counterpart. Use [`checkedDivide`](#checkedDivide) when division by `-1` can receive
that value.

## Examples
### Clamp an offset at the target boundary
```silk
import silk.isize

pub fn main() -> i32 {
  if isize.saturatingAdd(isize.MAX, 1) != isize.MAX {
    return 1
  }
  return 42
}
```

Import as `isize` with `import silk.isize`.

Public declarations: 59.

::Anchor{id="MAX"}

## `MAX`

```silk
pub const MAX: isize
```

The largest `isize` value for the compilation target.

### Details

This is 2147483647 on a 32-bit target and 9223372036854775807 on a 64-bit target. Checked
arithmetic rejects results above it.

::Anchor{id="MIN"}

## `MIN`

```silk
pub const MIN: isize
```

The smallest `isize` value for the compilation target.

### Details

This is -2147483648 on a 32-bit target and -9223372036854775808 on a 64-bit target.

::Anchor{id="BITS"}

## `BITS`

```silk
pub const BITS: u32
```

The width of `isize` in bits, which is the compilation target's pointer width.

::Anchor{id="negate"}

## `negate`

```silk
pub fn negate(value: isize) -> isize
```

Returns the arithmetic negation of `value` and traps when `value` is [`MIN`](#MIN). Use
this function when that boundary is a program error.

::Anchor{id="wrappingNegate"}

## `wrappingNegate`

```silk
pub fn wrappingNegate(value: isize) -> isize
```

Returns the arithmetic negation of `value`, wrapped to the `isize` range. [`MIN`](#MIN)
stays [`MIN`](#MIN). Use this function for deliberate modulo arithmetic.

::Anchor{id="saturatingNegate"}

## `saturatingNegate`

```silk
pub fn saturatingNegate(value: isize) -> isize
```

Returns the arithmetic negation of `value`, clamped to the `isize` range. [`MIN`](#MIN)
becomes [`MAX`](#MAX). Use this function when the positive boundary is required.

::Anchor{id="toU8"}

## `toU8`

```silk
pub fn toU8(value: isize) -> u8
```

Converts `value` to `u8`. Traps if `value` is outside the `u8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU8"}

## `checkedToU8`

```silk
pub fn checkedToU8(value: isize) -> Option<u8>
```

Converts `value` to `u8`, or returns `None` if `value` is outside the `u8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU16"}

## `toU16`

```silk
pub fn toU16(value: isize) -> u16
```

Converts `value` to `u16`. Traps if `value` is outside the `u16` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU16"}

## `checkedToU16`

```silk
pub fn checkedToU16(value: isize) -> Option<u16>
```

Converts `value` to `u16`, or returns `None` if `value` is outside the `u16`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU32"}

## `toU32`

```silk
pub fn toU32(value: isize) -> u32
```

Converts `value` to `u32`. Traps if `value` is outside the `u32` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU32"}

## `checkedToU32`

```silk
pub fn checkedToU32(value: isize) -> Option<u32>
```

Converts `value` to `u32`, or returns `None` if `value` is outside the `u32`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toU64"}

## `toU64`

```silk
pub fn toU64(value: isize) -> u64
```

Converts `value` to `u64`. Traps if `value` is outside the `u64` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToU64"}

## `checkedToU64`

```silk
pub fn checkedToU64(value: isize) -> Option<u64>
```

Converts `value` to `u64`, or returns `None` if `value` is outside the `u64`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toUsize"}

## `toUsize`

```silk
pub fn toUsize(value: isize) -> usize
```

Converts `value` to `usize`. Traps if `value` is outside the `usize` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToUsize"}

## `checkedToUsize`

```silk
pub fn checkedToUsize(value: isize) -> Option<usize>
```

Converts `value` to `usize`, or returns `None` if `value` is outside the `usize`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI8"}

## `toI8`

```silk
pub fn toI8(value: isize) -> i8
```

Converts `value` to `i8`. Traps if `value` is outside the `i8` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI8"}

## `checkedToI8`

```silk
pub fn checkedToI8(value: isize) -> Option<i8>
```

Converts `value` to `i8`, or returns `None` if `value` is outside the `i8`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI16"}

## `toI16`

```silk
pub fn toI16(value: isize) -> i16
```

Converts `value` to `i16`. Traps if `value` is outside the `i16` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI16"}

## `checkedToI16`

```silk
pub fn checkedToI16(value: isize) -> Option<i16>
```

Converts `value` to `i16`, or returns `None` if `value` is outside the `i16`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI32"}

## `toI32`

```silk
pub fn toI32(value: isize) -> i32
```

Converts `value` to `i32`. Traps if `value` is outside the `i32` range. Use
this function when an out-of-range value is a program error.

::Anchor{id="checkedToI32"}

## `checkedToI32`

```silk
pub fn checkedToI32(value: isize) -> Option<i32>
```

Converts `value` to `i32`, or returns `None` if `value` is outside the `i32`
range. Use this function when an out-of-range value is input data.

::Anchor{id="toI64"}

## `toI64`

```silk
pub fn toI64(value: isize) -> i64
```

Converts `value` exactly to `i64`. Every `isize` value is representable.

::Anchor{id="checkedToI64"}

## `checkedToI64`

```silk
pub fn checkedToI64(value: isize) -> Option<i64>
```

Converts `value` exactly to `i64` and returns `Some`. Every `isize` value is
representable.

::Anchor{id="toIsize"}

## `toIsize`

```silk
pub fn toIsize(value: isize) -> isize
```

Returns `value` unchanged as `isize`. Use this function when generic conversion code
can select `isize` as both source and destination.

::Anchor{id="checkedToIsize"}

## `checkedToIsize`

```silk
pub fn checkedToIsize(value: isize) -> Option<isize>
```

Returns `Some` with `value` unchanged as `isize`. Use this function when generic
checked-conversion code can select the same source and destination type.

::Anchor{id="toF32"}

## `toF32`

```silk
pub fn toF32(value: isize) -> f32
```

Converts `value` to the nearest `f32` value, with ties to even. Only magnitudes below `2^24` are
exactly representable, so a larger `isize` rounds.

::Anchor{id="toF64"}

## `toF64`

```silk
pub fn toF64(value: isize) -> f64
```

Converts `value` to the nearest `f64` value, with ties to even. Only magnitudes below `2^53` are
exactly representable, so a larger `isize` rounds. Every `isize` is exact on a 32-bit target.

::Anchor{id="add"}

## `add`

```silk
pub fn add(left: isize, right: isize) -> isize
```

Returns `left + right` and traps if the result is outside the `isize` range. Use this function
when overflow is a program error.

::Anchor{id="subtract"}

## `subtract`

```silk
pub fn subtract(left: isize, right: isize) -> isize
```

Returns `left - right` and traps if the result is outside the `isize` range. Use this function
when overflow is a program error.

::Anchor{id="multiply"}

## `multiply`

```silk
pub fn multiply(left: isize, right: isize) -> isize
```

Returns `left * right` and traps if the result is outside the `isize` range. Use this function
when overflow is a program error.

::Anchor{id="divide"}

## `divide`

```silk
pub fn divide(left: isize, right: isize) -> isize
```

Returns `left / right`, rounded toward zero. Traps if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when an invalid quotient is a program error.

::Anchor{id="remainder"}

## `remainder`

```silk
pub fn remainder(left: isize, right: isize) -> isize
```

Returns the remainder with the sign of `left`. Traps if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when invalid division is a program error.

::Anchor{id="bitAnd"}

## `bitAnd`

```silk
pub fn bitAnd(left: isize, right: isize) -> isize
```

Returns the bitwise AND of `left` and `right`.

::Anchor{id="bitOr"}

## `bitOr`

```silk
pub fn bitOr(left: isize, right: isize) -> isize
```

Returns the bitwise OR of `left` and `right`.

::Anchor{id="bitXor"}

## `bitXor`

```silk
pub fn bitXor(left: isize, right: isize) -> isize
```

Returns the bitwise exclusive OR of `left` and `right`.

::Anchor{id="bitNot"}

## `bitNot`

```silk
pub fn bitNot(value: isize) -> isize
```

Returns `value` with each bit inverted.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(left: isize, right: isize) -> isize
```

Shifts `left` bits left by `right` positions. Traps if `right` is negative or not less than
[`BITS`](#BITS).

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(left: isize, right: isize) -> isize
```

Shifts `left` bits right by `right` positions and preserves its sign. Traps if `right` is
negative or not less than [`BITS`](#BITS).

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(left: isize, right: isize) -> isize
```

Rotates the bits of `left` left by `right` positions.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(left: isize, right: isize) -> isize
```

Rotates the bits of `left` right by `right` positions.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: isize, right: isize) -> isize
```

Returns `left + right`, wrapped to the `isize` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: isize, right: isize) -> isize
```

Returns `left - right`, wrapped to the `isize` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: isize, right: isize) -> isize
```

Returns `left * right`, wrapped to the `isize` range. Use this function for
deliberate modulo arithmetic.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: isize, right: isize) -> isize
```

Returns `left + right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: isize, right: isize) -> isize
```

Returns `left - right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="saturatingMultiply"}

## `saturatingMultiply`

```silk
pub fn saturatingMultiply(left: isize, right: isize) -> isize
```

Returns `left * right`, clamped to [`MIN`](#MIN) or [`MAX`](#MAX). Use this function when a
boundary value is the required overflow result.

::Anchor{id="checkedAdd"}

## `checkedAdd`

```silk
pub fn checkedAdd(left: isize, right: isize) -> Option<isize>
```

Returns `Some` with `left + right`, or `None` if the result is outside the `isize` range.
Use this function when overflow is input data.

::Anchor{id="checkedSubtract"}

## `checkedSubtract`

```silk
pub fn checkedSubtract(left: isize, right: isize) -> Option<isize>
```

Returns `Some` with `left - right`, or `None` if the result is outside the `isize` range.
Use this function when overflow is input data.

::Anchor{id="checkedMultiply"}

## `checkedMultiply`

```silk
pub fn checkedMultiply(left: isize, right: isize) -> Option<isize>
```

Returns `Some` with `left * right`, or `None` if the result is outside the `isize` range.
Use this function when overflow is input data.

::Anchor{id="checkedDivide"}

## `checkedDivide`

```silk
pub fn checkedDivide(left: isize, right: isize) -> Option<isize>
```

Returns `Some` with `left / right`, or `None` if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when an invalid quotient is input data.

::Anchor{id="checkedRemainder"}

## `checkedRemainder`

```silk
pub fn checkedRemainder(left: isize, right: isize) -> Option<isize>
```

Returns `Some` with the remainder, or `None` if `right` is zero or [`MIN`](#MIN) is
divided by `-1`. Use this function when invalid division is input data.

::Anchor{id="equals"}

## `equals`

```silk
pub fn equals(left: isize, right: isize) -> bool
```

Returns `true` when `left` and `right` are equal.

::Anchor{id="notEquals"}

## `notEquals`

```silk
pub fn notEquals(left: isize, right: isize) -> bool
```

Returns `true` when `left` and `right` are not equal.

::Anchor{id="lessThan"}

## `lessThan`

```silk
pub fn lessThan(left: isize, right: isize) -> bool
```

Returns `true` when `left` is less than `right`.

::Anchor{id="lessOrEqual"}

## `lessOrEqual`

```silk
pub fn lessOrEqual(left: isize, right: isize) -> bool
```

Returns `true` when `left` is less than or equal to `right`.

::Anchor{id="greaterThan"}

## `greaterThan`

```silk
pub fn greaterThan(left: isize, right: isize) -> bool
```

Returns `true` when `left` is greater than `right`.

::Anchor{id="greaterOrEqual"}

## `greaterOrEqual`

```silk
pub fn greaterOrEqual(left: isize, right: isize) -> bool
```

Returns `true` when `left` is greater than or equal to `right`.

::Anchor{id="parse"}

## `parse`

```silk
pub fn parse(text: string) -> Result<isize, ParseError>
```

Reads the complete text as a signed decimal `isize`.

### Details

A failure contains `silk.format.NotANumber` for empty text, a leading `+`, a non-digit, or
trailing bytes. It contains `silk.format.OutOfRange` outside the target's `isize` range.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
