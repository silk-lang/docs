# Values and primitive types

Silk's primitive types are fixed-width integers, two floating-point types, `bool`, `char`, borrowed text `string<'a>`, the unit type `()` and the empty type `never`. This page also covers integer literal typing, numeric conversion, and what happens on overflow, division by zero and out-of-bounds indexing.

## Syntax

```
PrimitiveType = IntegerType | FloatType | 'bool' | 'char' | StringType | '(' ')' | 'never'
IntegerType   = 'i8' | 'i16' | 'i32' | 'i64' | 'isize'
              | 'u8' | 'u16' | 'u32' | 'u64' | 'usize'
FloatType     = 'f32' | 'f64'
StringType    = 'string' ( '<' Lifetime '>' )?
```

## Integer types

| Type | Bits | Range |
| --- | --- | --- |
| `i8` | 8 | -128 to 127 |
| `i16` | 16 | -32768 to 32767 |
| `i32` | 32 | -2147483648 to 2147483647 |
| `i64` | 64 | -9223372036854775808 to 9223372036854775807 |
| `u8` | 8 | 0 to 255 |
| `u16` | 16 | 0 to 65535 |
| `u32` | 32 | 0 to 4294967295 |
| `u64` | 64 | 0 to 18446744073709551615 |
| `isize` | target pointer width | signed |
| `usize` | target pointer width | unsigned |

- Signed types use two's complement. Each type's alignment equals its size.
- `usize` and `isize` follow the target. They are 64 bits on `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu` and `aarch64-apple-darwin`, and 32 bits on `wasm32-unknown-unknown`.
- A literal that fits a 64-bit `usize` can be out of range on `wasm32` (SEM0002 there).
- Array indexes and lengths are `usize`.
- Each integer module (`silk/i32`, `silk/usize`, …) exports `MIN`, `MAX` and `BITS`. `silk/usize` also exports `ZERO` and `ONE`.

## Integer literal typing

- A literal takes its type from its context: a `let` annotation, a parameter, a field, a return type, or the other operand of a binary operator.
- With no context a literal is `i32`. Later uses never change that type.
- A literal `match` arm with no expected type takes the integer type of the other arms when it fits. See Patterns and match.
- `let small: u8 = 200` then `small + 55` makes `55` a `u8`.
- A literal outside its type's range is an error (SEM0002). Hexadecimal, octal and binary literals denote values, not bit patterns: `let x: i8 = 0xFF` is SEM0002.
- A minus sign directly before a literal is part of the literal. So `-2147483648` is a valid `i32`.
- A negative literal for `usize` is SEM0060. For other unsigned types it is SEM0002.
- An integer literal is never a float: `let x: f64 = 1` is an error (SEM0037). Write `1.0`.
- A character literal can initialize a `u8` when its scalar value is at most 255: `let b: u8 = 'A'`. A larger scalar is SEM0002.

## Floating-point types

- `f32` is IEEE binary32 and `f64` is IEEE binary64. A float literal with no context is `f64`.
- A float literal too large for its type becomes infinity: `let x: f32 = 1e39` is accepted.
- Arithmetic rounds to nearest, ties to even.
- Division by zero and overflow produce infinities or NaN. They never trap.
- `==` and ordering return `false` when either operand is NaN.
- `%` works on floats.
- `silk/f64` and `silk/f32` provide `isNaN`, `isInfinite`, `toBits`, `fromBits`, `sqrt`, `floor`, `round`, `totalOrder` and more.

## bool, char, string

- `bool` has the values `true` and `false`. It occupies one byte.
- `char` is one Unicode scalar value: 0 to 0x10FFFF, excluding surrogates 0xD800 to 0xDFFF. It occupies four bytes.
- `char.toU32` reads the scalar. `char.fromU32` returns `Option<char>` and rejects invalid scalars.
- `string<'a>` is a borrowed view of valid UTF-8 bytes that lives for `'a`. Writing `string` alone lets the compiler pick or elide the lifetime.
- A text literal has type `string<'static>`. A byte-string literal `b"…"` has type `&[u8]`.
- `string` values are copied, not moved. On 64-bit targets a `string` is 16 bytes.
- Owned, growable text is `String` from `silk/string`. `String.byteLength` measures a `string` in bytes.

## Unit and never

- `()` is the unit type. Its only value is also written `()`. It has size zero.
- A function with no result type returns `()`.
- `never` is the type of a computation that does not return. It has no values.
- A call that returns `never` may stand where any type is expected, such as `let n: i32 = halt()`.
- A `never` call ends a path: a non-unit function may end with one instead of a `return` (no SEM0130).
- An expression statement may produce only `()` or `never`. See Bindings and statements.

## Numeric conversion

- There are no implicit numeric conversions. `i32` and `i64` operands don't mix (SEM0135), and an `i32` value can't initialize an `i64` binding (SEM0037).
- There is no cast operator. `as` is a keyword, but `x as i64` is not an expression.
- Convert with std lib functions named after the target type: `i32.toI64(x)`, `u8.toI32(b)`, `usize.toI32(n)`.
- Each such module must be imported, as in `import silk.i32`. Without the import, a call such as `u32.toU64(x)` is SEM0009: "Unknown name u32; is `import silk.u32` missing?". A value such as `u32.MAX`, or a bare `u32`, is SEM0006: "Unknown value u32; is `import silk.u32` missing?".
- The hint is left out when the module has syntax errors. The message is then plain, as in "Unknown value i32".
- Every integer module has `toU8`, `toU16`, `toU32`, `toU64`, `toUsize`, `toI8`, `toI16`, `toI32`, `toI64`, `toIsize`, `toF32` and `toF64`.
- `toX` traps when the value doesn't fit. `checkedToX` returns `Option<X>` with `None` instead.
- Float-to-integer `toX` truncates toward zero: `f64.toI32(-2.7)` is `-2`. It traps on NaN, infinity or out-of-range values. `checkedToX` returns `None` for those.
- Integer-to-float conversion rounds to nearest. `i32.toF64` is always exact.

## Overflow and traps

- `+`, `-`, `*` and unary `-` on integers trap when the result is out of range. This includes unsigned underflow such as `0 - 1` on `u8`.
- `/` and `%` trap on a zero divisor and on `MIN / -1`.
- Integer division truncates toward zero. `%` takes the sign of the left operand: `-7 / 2` is `-3`, `-7 % 2` is `-1`.
- Indexing an array out of bounds traps. A constant index that is known out of bounds is a compile error (SEM0034).
- A failed `toX` conversion traps.
- A trap ends the process at once. There is no unwinding. On native targets it prints `fatal trap: <kind>` and a source location to standard error. Kinds include `arithmetic overflow`, `division by zero`, `index out of bounds` and `invalid shift count`.
- Each integer module offers explicit policies for when overflow is expected:
  - `wrappingAdd`, `wrappingSubtract`, `wrappingMultiply`, `wrappingNegate`: modulo 2^BITS.
  - `saturatingAdd`, `saturatingSubtract`, `saturatingMultiply`, `saturatingNegate`: clamp to `MIN` or `MAX`.
  - `checkedAdd`, `checkedSubtract`, `checkedMultiply`, `checkedDivide`, `checkedRemainder`: return `Option`.
- There are no shift operators. Use `shiftLeft`, `shiftRight`, `rotateLeft` and `rotateRight`. A shift count that is negative or not less than `BITS` traps.

## Examples

```silk
import silk.i32
import silk.i64
import silk.option { Option }
import silk.u8

fn widen(value: i64) -> i64 {
  return value * 2
}

pub fn main() -> i32 {
  let small: u8 = 200
  let byte = small + 55
  let count = 7
  let big = widen(i32.toI64(count))
  let narrowed = i64.checkedToI32(big)
  if byte != u8.MAX { return 1 }
  if Option<i32>.unwrapOr(move narrowed, 0) != 14 { return 2 }
  if (i64.checkedToI32(i64.MAX) |> Option<i32>.unwrapOr(-1)) != -1 { return 3 }
  return 0
}
```

```silk
import silk.i32
import silk.option { Option }
import silk.u8

pub fn main() -> i32 {
  let top: u8 = 250
  if u8.wrappingAdd(top, 10) != 4 { return 1 }
  if u8.saturatingAdd(top, 10) != 255 { return 2 }
  let checked = u8.checkedAdd(top, 10)
  if Option<u8>.unwrapOr(move checked, 0) != 0 { return 3 }
  let quotient = i32.checkedDivide(i32.MIN, -1)
    |> Option<i32>.unwrapOr(0)
  return quotient
}
```

```silk
import silk.char
import silk.string { String }
import silk.usize

pub fn main() -> i32 {
  let letter = 'é'
  let byte: u8 = 'A'
  let text: string = "héllo"
  let nothing: () = ()
  drop nothing
  if char.toU32(letter) != 0xE9 { return 1 }
  if byte != 65 { return 2 }
  if String.byteLength(text) != 6 { return 3 }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0002 | Integer literal outside the range of its selected type |
| SEM0006 | Unknown value, such as `u32.MAX` without `import silk.u32` |
| SEM0009 | Unknown name, such as an integer module function called without its `import` |
| SEM0012 | Argument type does not match the parameter, e.g. `f64 + 1` |
| SEM0034 | Constant array index outside the array length |
| SEM0037 | Initializer or assigned value has the wrong type, e.g. `let x: f64 = 1` |
| SEM0060 | Negative literal used as `usize` |
| SEM0130 | A reachable path of a non-unit function falls through without returning |
| SEM0135 | No operator accepts these operand types, e.g. `i32 + i64` or `-x` on `u8` |

## See also

Lexical structure · Expressions and operators · Bindings and statements · Structs, tuples and arrays · Intrinsics · `silk/i8`, `silk/i16`, `silk/i32`, `silk/i64`, `silk/isize`, `silk/u8`, `silk/u16`, `silk/u32`, `silk/u64`, `silk/usize`, `silk/f32`, `silk/f64`, `silk/numeric`, `silk/bool`, `silk/char`, `silk/string`, `silk/layout`

## Open questions

- Catalog code LAY0001 describes a `usize` or `isize` literal outside the target word. On `wasm32-unknown-unknown`, `let x: usize = 4294967296` reports SEM0002 instead, so it's unclear when LAY0001 fires.
- `f64 + 1` reports SEM0012 ("Expected f64 but received i32", an argument-mismatch code) where SEM0135 might be expected.
