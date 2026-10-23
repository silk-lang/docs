# Values and primitive types

Silk's primitive types are fixed-width integers, two floating-point types, `bool`, `char`, borrowed text `string<'a>`, the unit type `()` and the empty type `never`, plus the SIMD vector and mask types `simd<T, N>` and `mask<N>`. This page also covers integer literal typing, numeric conversion, and what happens on overflow, division by zero and out-of-bounds indexing.

## Syntax

```
PrimitiveType = IntegerType | FloatType | 'bool' | 'char' | StringType | '(' ')' | 'never'
              | VectorType | MaskType
IntegerType   = 'i8' | 'i16' | 'i32' | 'i64' | 'isize'
              | 'u8' | 'u16' | 'u32' | 'u64' | 'usize'
FloatType     = 'f32' | 'f64'
StringType    = 'string' ( '<' Lifetime '>' )?
VectorType    = 'simd' '<' Type ',' Expression '>'
MaskType      = 'mask' '<' Expression '>'
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

## SIMD vectors and masks

`simd<T, N>` holds `N` lanes of the numeric type `T` and works on all of them at once. `mask<N>` holds `N` lanes that are each set or clear; lane comparisons return one. Use them through the `silk/simd` modules, one per shape: `silk.simd.u8x16` for `simd<u8, 16>`, `silk.simd.f32x4` for `simd<f32, 4>`, `silk.simd.mask16` for `mask<16>`, and so on.

- `T` is any integer or float type, including `isize` and `usize`. `bool` and `char` are refused; a vector of booleans is spelled `mask<N>`.
- `N` is a static expression, such as `16` or `2 * N` for a constant `N`. It is a power of two from 2 to 64.
- A vector is 16 to 512 bits wide in total: `simd<u8, 2>` and `simd<f64, 8>` are admitted, `simd<u64, 16>` is not. A mask has 2 to 64 lanes, also a power of two.
- Any other shape is SEM0239 at the type: "A SIMD vector needs a numeric lane type and a power-of-two lane count with a total width of 16 to 512 bits; a mask needs a power-of-two lane count from 2 to 64".
- `simd` and `mask` are not reserved words. A variable may be called `mask`, as the mask modules' parameters are.
- Vectors and masks are `Copy` values. They pass, return and sit in struct fields by value.
- A vector with fixed-width lanes also passes to and from C functions in one vector register, when the target's C ABI has a register of its width. A mask does not. See SIMD vectors at the C boundary in Unsafe code and C interop.
- Lane `0` is at the lowest address in memory.

### Operators

| Operand | Operators | Notes |
| --- | --- | --- |
| Integer vectors | `+` `-` `*` `/` `%` `&` `\|` `^` `~` | Lane by lane. A lane traps where the scalar operator traps: overflow, a zero divisor, `MIN / -1`. |
| Signed integer vectors | unary `-` | Also traps per lane on overflow. |
| Float vectors | `+` `-` `*` `/` `%`, unary `-` | IEEE 754, lane by lane. No bitwise operators. |
| Masks | `&` `\|` `^` `~` `!` | Lane by lane. |
| Vectors and masks | `==` `!=` | `==` is true only when every lane is equal. A NaN lane is never equal. |

- Both operands have the same type. `v * 2` is SEM0135; write `v * u32x4.splat(2)`.
- `<`, `<=`, `>` and `>=` don't apply to vectors (SEM0135). Compare lanes with `lanesLess`, `lanesGreater` and the rest, which return a mask.
- There are no shift operators, as for scalars. Use `shiftLeft`, `shiftRight`, `rotateLeft` and `rotateRight`.

### The silk/simd modules

There is a module for each 128-bit and 256-bit shape, and for the masks they compare into:

| Lanes | 128-bit | 256-bit |
| --- | --- | --- |
| 8-bit | `i8x16`, `u8x16` | `i8x32`, `u8x32` |
| 16-bit | `i16x8`, `u16x8` | `i16x16`, `u16x16` |
| 32-bit | `i32x4`, `u32x4`, `f32x4` | `i32x8`, `u32x8`, `f32x8` |
| 64-bit | `i64x2`, `u64x2`, `f64x2` | `i64x4`, `u64x4`, `f64x4` |
| Masks | `mask2`, `mask4`, `mask8`, `mask16` | `mask32` |

Every vector module has:

| Group | Functions |
| --- | --- |
| Build and read | `LANES`, `splat`, `fromArray`, `toArray`, `extract`, `insert` |
| Memory | `load(slice, offset)`, `store(slice, offset, vector)`; unsafe `loadUnchecked`, `storeUnchecked` over a `[*]` pointer |
| Compare | `lanesEqual`, `lanesNotEqual`, `lanesLess`, `lanesLessOrEqual`, `lanesGreater`, `lanesGreaterOrEqual` |
| Choose | `select(mask, chosen, other)`, `minimum`, `maximum`, `shuffle(left, right, indices)` |
| Reduce | `reduceAdd`, `reduceMinimum`, `reduceMaximum` |
| Convert | `toU32x4`, `toF64x4` and the like, to each shape with the same lane count; `bitcastToU8x16` and the like, to each shape with the same width |

Integer modules add `wrappingAdd`, `wrappingSubtract`, `wrappingMultiply`, `saturatingAdd`, `saturatingSubtract`, `shiftLeft`, `shiftRight`, `rotateLeft`, `rotateRight`, `reduceWrappingAdd`, `reduceBitAnd`, `reduceBitOr` and `reduceBitXor`. Float modules add `sqrt`, `mulAdd` (one rounding) and `reduceAddUnordered`. A mask module has `LANES`, `splat`, `fromArray`, `toArray`, `extract`, `insert`, `any`, `all`, `count`, `firstSet`, `toBits` and `fromBits`.

- `extract` and `insert` trap with `index out of bounds` when the index is `LANES` or more.
- `load` and `store` trap with `slice range out of bounds` unless `offset + LANES` is at most the slice length. The slice needs no alignment beyond its lane type.
- `reduceAdd` on integers traps when the exact sum doesn't fit the lane type; `reduceWrappingAdd` wraps. On floats, `reduceAdd` adds in lane order from lane 0, so every target gets the same result; `reduceAddUnordered` may round differently per target.
- `shiftLeft` and `shiftRight` take a vector of counts and trap with `invalid shift count` when a count is negative or not less than the lane width. `shiftRight` copies the sign bit on signed lanes and inserts zeros on unsigned ones. Rotations take counts modulo the lane width.
- Float `minimum` and `maximum` give NaN when either lane is NaN, and treat `-0.0` as less than `0.0`.
- A `to...` conversion converts each lane as the scalar `to...` function does, and traps with `arithmetic overflow` when a lane doesn't fit.
- `shuffle` takes its indices as a `static` array. An index below `LANES` picks from `left`; `LANES` to `2 * LANES - 1` picks from `right`. A runtime index is SEM0176. An index out of range is SEM0239, reported at the call. `u32x4.shuffle(a, a, [0, 1, 2, 8])` prints "Intrinsic.simdShuffle needs 4 static lane indices, one per result lane, each below 8". The message names the intrinsic that `shuffle` calls.
- `firstSet` returns `LANES` when no lane is set. In `toBits`, lane `i` is bit `i`.

Other admitted shapes, such as `simd<u8, 64>`, `simd<u32, 2>` or `simd<usize, 2>`, have no module. Reach them through the `Intrinsic.simd*` members; see Intrinsics.

### Choosing a width for the target

`silk.simd` itself answers two static questions about the target CPU of the build. Both read the profile's CPU model and features, not the machine the compiler runs on, and cost nothing at run time.

| Function | Result |
| --- | --- |
| `simd.preferredBytes()` | `64` with `avx512bw` enabled, `32` with `avx2`, `16` otherwise, including on arm64 and wasm32 |
| `simd.hardware()` | `true` when 128-bit vectors run in hardware: always on x86-64 and arm64; on wasm32 only with the `simd128` feature |

Vectors of every admitted shape compile on every target, whatever its preferred width. On wasm32 without `simd128` they compile to scalar code. Test `preferredBytes()` in a `static if` to pick a block width, and `hardware()` to keep a plain loop where vectors would only be emulated.

The features come from the profile's `cpu` table; see Targets and profiles. With the default x86-64 model, `preferredBytes()` is `16`. `cpu.model = "x86-64-v3"` or `features = ["avx2"]` makes it `32`, and `cpu.model = "x86-64-v4"` or `features = ["avx512bw"]` makes it `64`. A wasm32 profile turns on hardware vectors with `features = ["simd128"]`.

### Architecture instructions

Some instructions do in one step what takes several portable operations: byte table lookups, multiply-add steps, saturating packs, sums of absolute differences, AES rounds, carry-less multiplication and SHA-256 rounds. The `silk/arch` modules give them as ordinary functions, named after what they compute:

| Module | Functions, with the instruction and the CPU feature it needs |
| --- | --- |
| `silk.arch.x86` | `shuffleBytes` (`pshufb`, ssse3), `shuffleBytes256` (avx2), `multiplyAddBytes` (`pmaddubsw`, ssse3), `multiplyAddBytes256` (avx2), `multiplyAddWords` (`pmaddwd`, sse2), `multiplyAddWords256` (avx2), `packUnsigned16` (`packuswb`, sse2), `packUnsigned16x256` (avx2), `packUnsigned32` (`packusdw`, sse4.1), `packSigned16` (`packsswb`, sse2), `packSigned32` (`packssdw`, sse2), `sumAbsoluteDifferences` (`psadbw`, sse2), `sumAbsoluteDifferences256` (avx2), `aesEncrypt`, `aesEncryptLast`, `aesDecrypt`, `aesDecryptLast`, `aesInverseMixColumns` (`aesenc`, `aesenclast`, `aesdec`, `aesdeclast`, `aesimc`, aes), `carrylessMultiply` (`pclmulqdq`, pclmul), `sha256Rounds2`, `sha256Message1`, `sha256Message2` (`sha256rnds2`, `sha256msg1`, `sha256msg2`, sha) |
| `silk.arch.aarch64` | `tableLookup` (`tbl`, neon), `dotProduct` (`udot`, dotprod), `dotProductSigned` (`sdot`, dotprod), `pairwiseAdd8`, `pairwiseAdd16`, `pairwiseAdd32` (`addp`, neon), `aesEncrypt`, `aesDecrypt`, `aesMixColumns`, `aesInverseMixColumns` (`aese`, `aesd`, `aesmc`, `aesimc`, aes), `sha256Hash`, `sha256Hash2`, `sha256ScheduleUpdate0`, `sha256ScheduleUpdate1` (`sha256h`, `sha256h2`, `sha256su0`, `sha256su1`, sha2) |
| `silk.arch.wasm` | `swizzle` (`i8x16.swizzle`, simd128), `relaxedSwizzle` (`i8x16.relaxed_swizzle`, relaxed-simd), `dot` (`i32x4.dot_i16x8_s`, simd128), `narrowUnsigned`, `narrowSigned` (`i8x16.narrow_i16x8_u` and `_s`, simd128) |

- Every function compiles on every target. Where the build targets the module's architecture with the feature enabled, it is the one instruction. Elsewhere it computes the same lanes with portable code, which is correct but slower.
- The choice is made at compile time from the profile, like `simd.preferredBytes()`. With the default x86-64 profile, `x86.shuffleBytes` takes the portable path; with `cpu.model = "x86-64-v2"` (SSSE3 and SSE4.1) it is `pshufb`, and `x86-64-v3` adds the AVX2 forms.
- Code that only pays off with the instruction tests `Target.hasCpuFeature` from `silk/target` in a `static if` and keeps a plain loop otherwise.
- The 256-bit x86 forms work on each 16-byte half separately: a `shuffleBytes256` index picks only within its own half, and `packUnsigned16x256` interleaves the halves of its operands.
- The AES and SHA-256 functions follow their instructions, so the two modules split the work differently. An x86 AES round is `x86.aesEncrypt(state, key)`; on AArch64 it is `aarch64.aesMixColumns(aarch64.aesEncrypt(state, key))`, because `aese` adds the key first. `silk.arch.aes` has the portable steps (`subBytes`, `shiftRows`, `mixColumns` and their inverses) for checking either. To encrypt data, use `silk/aes_gcm`.
- `x86.sha256Rounds2` does two rounds on the state split as A, B, E, F and C, D, G, H, highest lane first. `aarch64.sha256Hash` and `sha256Hash2` do four rounds on A to D and E to H in lane order. The message schedule takes one extra add on x86 (see the example below). The std lib digests in `silk/sha2` do not call these functions.
- Index rules differ. `x86.shuffleBytes` uses the low four bits of an index and gives `0` when bit 7 is set; `aarch64.tableLookup` and `wasm.swizzle` give `0` for any index of 16 or more. `wasm.relaxedSwizzle` leaves those lanes unspecified, and they may differ between engines.

To run a faster path on machines that have a feature the build does not select, see Targets and profiles, under CPU features at run time. The underlying members are in Intrinsics, under Architecture members.

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
  if byte != u8.MAX {
    return 1
  }
  if Option<i32>.unwrapOr(move narrowed, 0) != 14 {
    return 2
  }
  if (i64.checkedToI32(i64.MAX) |> Option<i32>.unwrapOr(-1)) != -1 {
    return 3
  }
  return 0
}
```

```silk
import silk.i32
import silk.option { Option }
import silk.u8

pub fn main() -> i32 {
  let top: u8 = 250
  if u8.wrappingAdd(top, 10) != 4 {
    return 1
  }
  if u8.saturatingAdd(top, 10) != 255 {
    return 2
  }
  let checked = u8.checkedAdd(top, 10)
  if Option<u8>.unwrapOr(move checked, 0) != 0 {
    return 3
  }
  let quotient = i32.checkedDivide(i32.MIN, -1) |> Option<i32>.unwrapOr(0)
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
  if char.toU32(letter) != 0xE9 {
    return 1
  }
  if byte != 65 {
    return 2
  }
  if String.byteLength(text) != 6 {
    return 3
  }
  return 0
}
```

A byte search over 16-byte blocks, with a scalar loop for the tail:

```silk
import silk.simd.mask16
import silk.simd.u8x16

// The index of the first `wanted` byte in `text`, or `text.length` when it is absent.
fn find(text: &[u8], wanted: u8) -> usize {
  let needle = u8x16.splat(wanted)
  let mut at: usize = 0
  while at + u8x16.LANES <= text.length {
    let hits = u8x16.lanesEqual(u8x16.load(text, at), needle)
    if mask16.any(hits) {
      return at + mask16.firstSet(hits)
    }
    at = at + u8x16.LANES
  }
  while at < text.length {
    if text[at] == wanted {
      return at
    }
    at = at + 1
  }
  return text.length
}

pub fn main() -> i32 {
  let text = b"the quick brown fox jumps over the lazy dog"
  if find(text, 'j') != 20 {
    return 1
  }
  if find(text, 'g') != 42 {
    return 2
  }
  if find(text, '!') != text.length {
    return 3
  }
  return 0
}
```

A sum that uses eight lanes when the profile prefers 32-byte vectors, then masks, `select` and `shuffle`. It exits with 0 under the default profile, with `cpu.model = "x86-64-v3"`, and on wasm32:

```silk
import silk.simd
import silk.simd.i32x4
import silk.simd.i32x8
import silk.simd.mask4

// The sum of `values`, eight lanes at a time where the CPU handles 32-byte vectors well.
fn total(values: &[i32]) -> i32 {
  let mut at: usize = 0
  let mut sum = 0
  static if simd.preferredBytes() >= 32 {
    let mut lanes = i32x8.splat(0)
    while at + i32x8.LANES <= values.length {
      lanes = lanes + i32x8.load(values, at)
      at = at + i32x8.LANES
    }
    sum = i32x8.reduceAdd(lanes)
  } else {
    let mut lanes = i32x4.splat(0)
    while at + i32x4.LANES <= values.length {
      lanes = lanes + i32x4.load(values, at)
      at = at + i32x4.LANES
    }
    sum = i32x4.reduceAdd(lanes)
  }
  while at < values.length {
    sum = sum + values[at]
    at = at + 1
  }
  return sum
}

pub fn main() -> i32 {
  let values: [i32; 11] = [4, -2, 9, 7, 1, 0, -5, 3, 8, 2, 6]
  if total(&values) != 33 {
    return 1
  }

  let v = i32x4.fromArray([4, -2, 9, 7])
  let negative = i32x4.lanesLess(v, i32x4.splat(0))
  if mask4.toBits(negative) != 2 {
    return 2
  }
  let clamped = i32x4.select(negative, i32x4.splat(0), v)
  if i32x4.toArray(clamped)[1] != 0 {
    return 3
  }
  let reversed = i32x4.shuffle(v, v, [3, 2, 1, 0])
  if i32x4.extract(reversed, 0) != 7 {
    return 4
  }
  if i32x4.reduceMaximum(v) != 9 {
    return 5
  }
  return 0
}
```

Sixteen nibbles to hex digits with one table lookup. It exits with 0 under the default profile, which runs the portable path, and under `cpu.model = "x86-64-v2"`, which compiles `shuffleBytes` to `pshufb`:

```silk
import silk.arch.x86
import silk.simd.u8x16

// Sixteen nibbles to sixteen lowercase hex digits with one table lookup.
fn hexDigits(nibbles: simd<u8, 16>) -> simd<u8, 16> {
  let digits = u8x16.fromArray([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102])
  return x86.shuffleBytes(digits, nibbles)
}

pub fn main() -> i32 {
  let nibbles = u8x16.fromArray([12, 10, 15, 14, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13])
  let hex = hexDigits(nibbles)
  if u8x16.extract(hex, 0) != 99 || u8x16.extract(hex, 4) != 48 || u8x16.extract(hex, 15) != 100 {
    return 1
  }

  // A set bit 7 gives a zero lane, as pshufb does.
  let cleared = x86.shuffleBytes(nibbles, u8x16.splat(128))
  if cleared != u8x16.splat(0) {
    return 2
  }
  return 0
}
```

The next four SHA-256 message words, computed with each module. It exits with 0 under the default profile, where both take their portable paths, and under `cpu.features = ["sha"]`, which compiles the x86 functions to `sha256msg1` and `sha256msg2`. On arm64 with `sha2`, the AArch64 functions are `sha256su0` and `sha256su1`:

```silk
import silk.arch.aarch64
import silk.arch.x86
import silk.simd.u32x4
import silk.u32

fn sigma1(x: u32) -> u32 {
  return u32.rotateRight(x, 17) ^ u32.rotateRight(x, 19) ^ u32.shiftRight(x, 10)
}

// W[16..19] from W[0..15], the x86 way: two steps, with W[9..12] added between them.
fn nextX86(w: &[simd<u32, 4>; 4]) -> simd<u32, 4> {
  let partial = x86.sha256Message1(w[0], w[1])
  let middle = u32x4.shuffle(w[2], w[3], [1, 2, 3, 4])
  return x86.sha256Message2(u32x4.wrappingAdd(partial, middle), w[3])
}

// The same words, the AArch64 way.
fn nextAarch64(w: &[simd<u32, 4>; 4]) -> simd<u32, 4> {
  let partial = aarch64.sha256ScheduleUpdate0(w[0], w[1])
  return aarch64.sha256ScheduleUpdate1(partial, w[2], w[3])
}

pub fn main() -> i32 {
  // The one padded block of the message "abc".
  let w = [
    u32x4.fromArray([0x61626380, 0, 0, 0]),
    u32x4.splat(0),
    u32x4.splat(0),
    u32x4.fromArray([0, 0, 0, 0x18]),
  ]
  let a = nextX86(&w)
  if a != nextAarch64(&w) {
    return 1
  }

  // W[16] = W[0] + sigma0(W[1]) + W[9] + sigma1(W[14]), and W[1], W[9] and W[14] are 0.
  if u32x4.extract(a, 0) != 0x61626380 {
    return 2
  }
  if u32x4.extract(a, 1) != sigma1(0x18) {
    return 3
  }
  return 0
}
```

Vector `+` traps per lane like scalar `+`. Use the wrapping or saturating form when overflow is expected:

```silk
import silk.simd.u8x16

pub fn main() -> i32 {
  let high = u8x16.splat(250)
  let wrapped = u8x16.wrappingAdd(high, u8x16.splat(10))
  let clamped = u8x16.saturatingAdd(high, u8x16.splat(10))
  if u8x16.extract(wrapped, 0) != 4 || u8x16.extract(clamped, 0) != 255 { return 1 }
  let sum = high + u8x16.splat(10)
  return 0
}
```

`silk run` prints, after the build lines, and the shell shows status 132:

```
fatal trap: arithmetic overflow
  at main.main (main:8:13)
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
| SEM0176 | A `shuffle` index that is not static |
| SEM0239 | A vector or mask shape that is not admitted, such as `simd<i32, 3>` or `simd<bool, 4>`; also a lane operation on a lane type it doesn't take, a `shuffle` index out of range, or a conversion between different lane counts |

## See also

Lexical structure · Expressions and operators · Bindings and statements · Structs, tuples and arrays · Intrinsics · Unsafe code and C interop · `silk/i8`, `silk/i16`, `silk/i32`, `silk/i64`, `silk/isize`, `silk/u8`, `silk/u16`, `silk/u32`, `silk/u64`, `silk/usize`, `silk/f32`, `silk/f64`, `silk/numeric`, `silk/bool`, `silk/char`, `silk/string`, `silk/layout`, `silk/simd` and its shape modules (`silk/simd/u8x16`, `silk/simd/mask16`, ...), `silk/arch/x86`, `silk/arch/aarch64`, `silk/arch/wasm`

## Open questions

- `f64 + 1` reports SEM0012 ("Expected f64 but received i32", an argument-mismatch code) where SEM0135 might be expected.
