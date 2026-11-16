# SIMD

These members work on every lane of a vector at once. `simd<T, N>` holds `N` lanes of the integer or float type `T`, and `mask<N>` holds `N` lanes that are each set or clear. The [`silk/simd/simd`](/docs/std/simd-simd) modules wrap them for the 128-bit and 256-bit shapes, one module per shape such as `silk.simd.u32x4` and `silk.simd.mask4`. Instructions that exist on one architecture only are on the [Architecture](/docs/intrinsics/architecture) page.

## Rules shared by every SIMD member

- Every member takes the vector or mask type as its first type argument, written out: `Intrinsic.simdSplat<simd<u32, 4>>(10)`. In a signature, `V` is that vector type, `L` its lane type, `N` its lane count and `M` a mask type.
- A vector is 16 to 512 bits wide, with a power-of-two lane count; a mask has 2 to 64 lanes. `simd<i32, 3>` and `simd<bool, 4>` are SEM0239.
- A member used with a lane type it does not take is SEM0239 at the call, with the rule in the message: ``Intrinsic.simdShiftLeft takes a SIMD vector with integer lanes, but simd<f32, 4> is not one``.
- Every member is safe except `simdPointerLoad` and `simdPointerStore`. Lane indices and slice ranges are checked and trap when out of range.
- The operators also work on vectors: `a + b` on two `simd<u32, 4>` adds lane-wise and traps on overflow in any lane.
- Shapes wider than the target's registers are split into several instructions, and a shape with no module, such as `simd<u8, 64>` or `simd<u32, 2>`, is reached only through these members.

### `Intrinsic.simdSplat`

```silk signature
fn simdSplat<V>(lane: L) -> V
```

Returns the vector `V` with every lane set to `lane`. `L` is `V`'s lane type.

```silk
pub fn main() -> i32 {
  let tens = Intrinsic.simdSplat<simd<u32, 4>>(10)
  if Intrinsic.simdExtract<simd<u32, 4>>(tens, 3) != 10 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdExtract`

```silk signature
fn simdExtract<V>(vector: V, index: usize) -> L
```

Returns lane `index` of `vector`.

- An index past the last lane traps; it never reads outside the vector. A constant index compiles to one lane move.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  if Intrinsic.simdExtract<simd<u32, 4>>(values, 2) != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdInsert`

```silk signature
fn simdInsert<V>(vector: V, index: usize, lane: L) -> V
```

Returns `vector` with lane `index` replaced by `lane`. The vector is a value, so the original is unchanged.

- An index past the last lane traps.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdInsert<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), 0, 9)
  if Intrinsic.simdExtract<simd<u32, 4>>(values, 0) != 9 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdFromArray`

```silk signature
fn simdFromArray<V>(lanes: [L; N]) -> V
```

Returns the vector whose lane `i` is element `i` of the array. `N` must be `V`'s lane count.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  if Intrinsic.simdExtract<simd<u32, 4>>(values, 3) != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdToArray`

```silk signature
fn simdToArray<V>(vector: V) -> [L; N]
```

Returns the array whose element `i` is lane `i` of the vector.

```silk
pub fn main() -> i32 {
  let lanes = Intrinsic.simdToArray<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]))
  if lanes[0] + lanes[3] != 5 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesEqual`

```silk signature
fn simdLanesEqual<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] == right[i]`. Lane-wise `==`; a NaN lane is never equal.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([1, 0, 3, 0])
  let mask = Intrinsic.simdLanesEqual<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b0101 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesNotEqual`

```silk signature
fn simdLanesNotEqual<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] != right[i]`. Lane-wise `!=`; a NaN lane always differs.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([1, 0, 3, 0])
  let mask = Intrinsic.simdLanesNotEqual<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b1010 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesLess`

```silk signature
fn simdLanesLess<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] < right[i]`. Lane-wise `<`, under the lane type's signedness or IEEE 754 order.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([2, 2, 2, 2])
  let mask = Intrinsic.simdLanesLess<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b0001 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesLessOrEqual`

```silk signature
fn simdLanesLessOrEqual<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] <= right[i]`. Lane-wise `<=`.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([2, 2, 2, 2])
  let mask = Intrinsic.simdLanesLessOrEqual<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b0011 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesGreater`

```silk signature
fn simdLanesGreater<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] > right[i]`. Lane-wise `>`.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([2, 2, 2, 2])
  let mask = Intrinsic.simdLanesGreater<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b1100 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLanesGreaterOrEqual`

```silk signature
fn simdLanesGreaterOrEqual<V>(left: V, right: V) -> mask<N>
```

Compares `left` and `right` lane by lane and returns a mask whose lane `i` is set when `left[i] >= right[i]`. Lane-wise `>=`.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let other = Intrinsic.simdFromArray<simd<u32, 4>>([2, 2, 2, 2])
  let mask = Intrinsic.simdLanesGreaterOrEqual<simd<u32, 4>>(values, other)
  if Intrinsic.simdMaskToBits<mask<4>>(mask) != 0b1110 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdSelect`

```silk signature
fn simdSelect<V>(mask: mask<N>, chosen: V, other: V) -> V
```

Returns lane `i` of `chosen` where mask lane `i` is set, and lane `i` of `other` where it is clear. It is a branch-free `if` per lane.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let small = Intrinsic.simdLanesLess<simd<u32, 4>>(values, Intrinsic.simdSplat<simd<u32, 4>>(3))
  // Lanes below 3 become 0.
  let clipped = Intrinsic.simdSelect<simd<u32, 4>>(small, Intrinsic.simdSplat<simd<u32, 4>>(0), values)
  if Intrinsic.simdExtract<simd<u32, 4>>(clipped, 1) != 0 || Intrinsic.simdExtract<simd<u32, 4>>(clipped, 2) != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdWrappingAdd`

```silk signature
fn simdWrappingAdd<V>(left: V, right: V) -> V
```

Returns the lane-wise integer sum modulo 2 to the power of the lane width. It never traps. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u8, 4>>([255, 1, 2, 3])
  let result = Intrinsic.simdWrappingAdd<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(1))
  if Intrinsic.simdExtract<simd<u8, 4>>(result, 0) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdWrappingSubtract`

```silk signature
fn simdWrappingSubtract<V>(left: V, right: V) -> V
```

Returns the lane-wise integer difference modulo 2 to the power of the lane width. It never traps. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u8, 4>>([0, 1, 2, 3])
  let result = Intrinsic.simdWrappingSubtract<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(1))
  if Intrinsic.simdExtract<simd<u8, 4>>(result, 0) != 255 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdWrappingMultiply`

```silk signature
fn simdWrappingMultiply<V>(left: V, right: V) -> V
```

Returns the lane-wise low half of the integer product. It never traps. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u8, 4>>([16, 1, 2, 3])
  let result = Intrinsic.simdWrappingMultiply<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(17))
  if Intrinsic.simdExtract<simd<u8, 4>>(result, 0) != 16 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdSaturatingAdd`

```silk signature
fn simdSaturatingAdd<V>(left: V, right: V) -> V
```

Returns the lane-wise integer sum clamped to the lane type's range. It never traps. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u8, 4>>([250, 1, 2, 3])
  let result = Intrinsic.simdSaturatingAdd<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(10))
  if Intrinsic.simdExtract<simd<u8, 4>>(result, 0) != 255 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdSaturatingSubtract`

```silk signature
fn simdSaturatingSubtract<V>(left: V, right: V) -> V
```

Returns the lane-wise integer difference clamped to the lane type's range. It never traps. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u8, 4>>([3, 1, 2, 3])
  let result = Intrinsic.simdSaturatingSubtract<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(5))
  if Intrinsic.simdExtract<simd<u8, 4>>(result, 0) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdShiftLeft`

```silk signature
fn simdShiftLeft<V>(left: V, right: V) -> V
```

Shifts each lane of `left` left by the matching lane of `right`, filling with zeros. Integer lanes only.

- A count of the lane width or more traps.

```silk
pub fn main() -> i32 {
  let shifted = Intrinsic.simdShiftLeft<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdFromArray<simd<u32, 4>>([0, 1, 2, 3]))
  if Intrinsic.simdExtract<simd<u32, 4>>(shifted, 3) != 32 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdShiftRight`

```silk signature
fn simdShiftRight<V>(left: V, right: V) -> V
```

Shifts each lane of `left` right by the matching lane of `right`: logical for unsigned lanes, arithmetic for signed lanes. Integer lanes only.

- A count of the lane width or more traps.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<i32, 4>>([-8, 8, 16, 32])
  let shifted = Intrinsic.simdShiftRight<simd<i32, 4>>(values, Intrinsic.simdSplat<simd<i32, 4>>(2))
  if Intrinsic.simdExtract<simd<i32, 4>>(shifted, 0) != -2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdRotateLeft`

```silk signature
fn simdRotateLeft<V>(left: V, right: V) -> V
```

Rotates each lane of `left` left by the matching lane of `right`, modulo the lane width. Integer lanes only; it never traps.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdSplat<simd<u8, 4>>(0x81)
  let rotated = Intrinsic.simdRotateLeft<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(1))
  if Intrinsic.simdExtract<simd<u8, 4>>(rotated, 0) != 0x03 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdRotateRight`

```silk signature
fn simdRotateRight<V>(left: V, right: V) -> V
```

Rotates each lane of `left` right by the matching lane of `right`, modulo the lane width. Integer lanes only.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdSplat<simd<u8, 4>>(0x81)
  let rotated = Intrinsic.simdRotateRight<simd<u8, 4>>(values, Intrinsic.simdSplat<simd<u8, 4>>(1))
  if Intrinsic.simdExtract<simd<u8, 4>>(rotated, 0) != 0xc0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMinimum`

```silk signature
fn simdMinimum<V>(left: V, right: V) -> V
```

Returns the lane-wise lesser value. Integer lanes compare under their signedness. A float lane follows the scalar `min` in `silk/num/f32`, except that the payload of a NaN result is unspecified.

```silk
pub fn main() -> i32 {
  let low = Intrinsic.simdMinimum<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdExtract<simd<u32, 4>>(low, 3) != 2 || Intrinsic.simdExtract<simd<u32, 4>>(low, 0) != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaximum`

```silk signature
fn simdMaximum<V>(left: V, right: V) -> V
```

Returns the lane-wise greater value, under the same rules as `simdMinimum`.

```silk
pub fn main() -> i32 {
  let high = Intrinsic.simdMaximum<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdExtract<simd<u32, 4>>(high, 0) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdSqrt`

```silk signature
fn simdSqrt<V>(vector: V) -> V
```

Returns the correctly rounded square root of each lane. Float lanes only.

```silk
pub fn main() -> i32 {
  let roots = Intrinsic.simdSqrt<simd<f32, 4>>(Intrinsic.simdFromArray<simd<f32, 4>>([1.0, 4.0, 9.0, 16.0]))
  if Intrinsic.simdExtract<simd<f32, 4>>(roots, 3) != 4.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMulAdd`

```silk signature
fn simdMulAdd<V>(left: V, right: V, addend: V) -> V
```

Returns `left * right + addend` for each lane, fused: rounded once, as `fma`. Float lanes only.


```silk
pub fn main() -> i32 {
  let two = Intrinsic.simdSplat<simd<f32, 4>>(2.0)
  let result = Intrinsic.simdMulAdd<simd<f32, 4>>(Intrinsic.simdFromArray<simd<f32, 4>>([1.0, 4.0, 9.0, 16.0]), two, two)
  if Intrinsic.simdExtract<simd<f32, 4>>(result, 0) != 4.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceAdd`

```silk signature
fn simdReduceAdd<V>(vector: V) -> L
```

Returns the sum of every lane.

- Integer lanes: a sum that leaves the lane type traps with "arithmetic overflow"; use `simdReduceWrappingAdd` to wrap.
- Float lanes: the lanes are added in order from lane 0, so the result is reproducible. `simdReduceAddUnordered` lets the target pick a faster order.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceAdd<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 10 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceWrappingAdd`

```silk signature
fn simdReduceWrappingAdd<V>(vector: V) -> L
```

Returns the sum of every integer lane modulo 2 to the power of the lane width. It never traps.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdSplat<simd<u8, 4>>(100)
  if Intrinsic.simdReduceWrappingAdd<simd<u8, 4>>(values) != 144 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceAddUnordered`

```silk signature
fn simdReduceAddUnordered<V>(vector: V) -> L
```

Returns the sum of every float lane, added in an order the target chooses. Rounding may differ from `simdReduceAdd`, and from one target to another.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceAddUnordered<simd<f32, 4>>(Intrinsic.simdFromArray<simd<f32, 4>>([1.0, 4.0, 9.0, 16.0])) != 30.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceMinimum`

```silk signature
fn simdReduceMinimum<V>(vector: V) -> L
```

Returns the least lane, under the rules of `simdMinimum`.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceMinimum<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceMaximum`

```silk signature
fn simdReduceMaximum<V>(vector: V) -> L
```

Returns the greatest lane, under the rules of `simdMaximum`.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceMaximum<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceBitAnd`

```silk signature
fn simdReduceBitAnd<V>(vector: V) -> L
```

Returns the bitwise AND of every integer lane.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceBitAnd<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceBitOr`

```silk signature
fn simdReduceBitOr<V>(vector: V) -> L
```

Returns the bitwise OR of every integer lane.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceBitOr<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 7 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdReduceBitXor`

```silk signature
fn simdReduceBitXor<V>(vector: V) -> L
```

Returns the bitwise exclusive OR of every integer lane.

```silk
pub fn main() -> i32 {
  if Intrinsic.simdReduceBitXor<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])) != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskAny`

```silk signature
fn simdMaskAny<M>(mask: M) -> bool
```

Returns whether any lane of the mask is set.

```silk
pub fn main() -> i32 {
  let large = Intrinsic.simdLanesGreater<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if !Intrinsic.simdMaskAny<mask<4>>(large) {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskAll`

```silk signature
fn simdMaskAll<M>(mask: M) -> bool
```

Returns whether every lane of the mask is set.

```silk
pub fn main() -> i32 {
  let large = Intrinsic.simdLanesGreater<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdMaskAll<mask<4>>(large) {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskCount`

```silk signature
fn simdMaskCount<M>(mask: M) -> usize
```

Returns the number of set lanes.

```silk
pub fn main() -> i32 {
  let large = Intrinsic.simdLanesGreater<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdMaskCount<mask<4>>(large) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskFirstSet`

```silk signature
fn simdMaskFirstSet<M>(mask: M) -> usize
```

Returns the index of the lowest set lane, or the lane count when no lane is set. A byte search uses it to find the first match.

```silk
pub fn main() -> i32 {
  let large = Intrinsic.simdLanesGreater<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdMaskFirstSet<mask<4>>(large) != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskToBits`

```silk signature
fn simdMaskToBits<M>(mask: M) -> u64
```

Returns the mask as an integer: lane `i` is bit `i`, and the bits above the last lane are zero.

```silk
pub fn main() -> i32 {
  let large = Intrinsic.simdLanesGreater<simd<u32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]), Intrinsic.simdSplat<simd<u32, 4>>(2))
  if Intrinsic.simdMaskToBits<mask<4>>(large) != 0b1100 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdMaskFromBits`

```silk signature
fn simdMaskFromBits<M>(bits: u64) -> M
```

Returns the mask whose lane `i` is set when bit `i` of `bits` is set. Bits past the last lane are ignored.

```silk
pub fn main() -> i32 {
  let mask = Intrinsic.simdMaskFromBits<mask<4>>(0xf1)
  if Intrinsic.simdMaskCount<mask<4>>(mask) != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdLoad`

```silk signature
fn simdLoad<V>(values: &[L], offset: usize) -> V
```

Returns the vector of `values[offset]` to `values[offset + N - 1]`, where `N` is `V`'s lane count. The slice may have any alignment.

- A range past the end of the slice traps.

```silk
pub fn main() -> i32 {
  let array: [u32; 6] = [1, 2, 3, 4, 5, 6]
  let values: &[u32] = &array
  let middle = Intrinsic.simdLoad<simd<u32, 4>>(values, 2)
  if Intrinsic.simdExtract<simd<u32, 4>>(middle, 0) != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdStore`

```silk signature
fn simdStore<V>(values: &mut [L], offset: usize, vector: V) -> ()
```

Writes the lanes of `vector` to `values[offset]` through `values[offset + N - 1]`.

- A range past the end of the slice traps before anything is written.

```silk
pub fn main() -> i32 {
  let mut array: [u32; 6] = [0; 6]
  let values: &mut [u32] = &mut array
  Intrinsic.simdStore<simd<u32, 4>>(move values, 2, Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]))
  if array[5] != 4 || array[1] != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdPointerLoad`

```silk signature
unsafe fn simdPointerLoad<V>(pointer: [*]const L) -> V
```

Returns the vector of `N` consecutive elements starting at `pointer`, without a bounds check.

- Unsafe. The caller proves that `N` elements from `pointer` are live and initialized. The pointer needs only the element's alignment, not the vector's.

```silk
pub fn main() -> i32 {
  let array: [u32; 4] = [5, 6, 7, 8]
  let values: &[u32] = &array
  let pointer = unsafe Intrinsic.pointerRequalify<?[*]const u32, [*]const u32>(Intrinsic.pointerFromSlice<u32>(values))
  let vector = unsafe Intrinsic.simdPointerLoad<simd<u32, 4>>(pointer)
  if Intrinsic.simdReduceAdd<simd<u32, 4>>(vector) != 26 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdPointerStore`

```silk signature
unsafe fn simdPointerStore<V>(pointer: [*]mut L, vector: V) -> ()
```

Writes the lanes of `vector` to `N` consecutive elements starting at `pointer`, without a bounds check.

- Unsafe. The caller proves that `N` elements from `pointer` are live, writable and not used by anything else. The pointer needs only the element's alignment.

```silk
pub fn main() -> i32 {
  let mut array: [u32; 4] = [0; 4]
  let values: &mut [u32] = &mut array
  let pointer = unsafe Intrinsic.pointerRequalify<?[*]mut u32, [*]mut u32>(Intrinsic.pointerFromMutSlice<u32>(move values))
  unsafe Intrinsic.simdPointerStore<simd<u32, 4>>(pointer, Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]))
  if array[3] != 4 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdConvert`

```silk signature
fn simdConvert<From, To>(vector: From) -> To
```

Converts each lane to the lane type of `To`, as the scalar `To` conversion does: integers keep their exact value, floats to integers truncate toward zero. `From` and `To` have the same lane count.

- A lane that does not fit the target type traps, as the scalar conversion does.
- Different lane counts are SEM0239.

```silk
pub fn main() -> i32 {
  let floats = Intrinsic.simdConvert<simd<u32, 4>, simd<f32, 4>>(Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4]))
  if Intrinsic.simdExtract<simd<f32, 4>>(floats, 3) != 4.0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.simdBitcast`

```silk signature
fn simdBitcast<From, To>(vector: From) -> To
```

Returns a vector with the same bits as another vector type of the same total width, such as `simd<u32, 4>` as `simd<u8, 16>`. Lane 0 is at the lowest address, so the byte order within a lane is the target's.

- Different widths are SEM0239. Every bit pattern is a valid integer or float lane, so it is safe.

```silk
pub fn main() -> i32 {
  let bytes = Intrinsic.simdBitcast<simd<u32, 4>, simd<u8, 16>>(Intrinsic.simdSplat<simd<u32, 4>>(0x01020304))
  static if Intrinsic.targetEndianness() == "little" {
    if Intrinsic.simdExtract<simd<u8, 16>>(bytes, 0) != 4 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.simdShuffle`

```silk signature
fn simdShuffle<V, R>(left: V, right: V, static indices: [usize; M]) -> R
```

Returns a vector of `M` lanes where lane `i` is lane `indices[i]` of `left` followed by `right`: indices below `N` pick from `left`, and `N` to `2N - 1` from `right`. `R` has `V`'s lane type and `M` lanes, so a shuffle can also narrow or widen.

- The indices are static, a literal or a value known during specialization (SEM0176 otherwise), and each is below `2N` (SEM0239 otherwise). A changed lane type is SEM0239.

```silk
pub fn main() -> i32 {
  let values = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let reversed = Intrinsic.simdShuffle<simd<u32, 4>, simd<u32, 4>>(values, values, [3, 2, 1, 0])
  let pair = Intrinsic.simdShuffle<simd<u32, 4>, simd<u32, 2>>(values, Intrinsic.simdSplat<simd<u32, 4>>(9), [0, 4])
  if Intrinsic.simdExtract<simd<u32, 4>>(reversed, 0) != 4 || Intrinsic.simdExtract<simd<u32, 2>>(pair, 1) != 9 {
    return 1
  }
  return 0
}
```
