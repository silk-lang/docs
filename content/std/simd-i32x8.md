Operations on `simd<i32, 8>`: eight signed 32-bit integer lanes in one 256-bit vector.

## When to use
Use this module to work on eight `i32` values at once. Use [`load`](#load) and [`store`](#store)
to move lanes between a slice and a vector, a lane comparison such as [`lanesEqual`](#lanesEqual) to make
a `mask<8>`, and `silk.simd.mask8` to test that mask.

## Details
The operators `+`, `-`, `*`, `/`, `%`, `&`, `|`, `^` and `~` apply lane by lane and trap
exactly where the `i32` operator traps. Use [`wrappingAdd`](#wrappingAdd) or [`saturatingAdd`](#saturatingAdd) when
overflow is expected. `==` is true only when every lane is equal.
Lane `0` is at the lowest address in memory.

## Examples
### Find the first matching lane
```silk
import silk.simd.mask8
import silk.simd.i32x8

pub fn main() -> i32 {
  let mut values: [i32; 8] = i32x8.toArray(i32x8.splat(0))
  values[7] = -3
  let hits = i32x8.lanesEqual(i32x8.fromArray(values), i32x8.splat(-3))
  if !mask8.any(hits) || mask8.firstSet(hits) != 7 {
    return 1
  }
  return 0
}
```

Import as `i32x8` with `import silk.simd.i32x8 as i32x8`.

Public declarations: 49.

::Anchor{id="LANES"}

## `LANES`

```silk
pub const LANES: usize
```

The number of lanes in a vector.

::Anchor{id="splat"}

## `splat`

```silk
pub fn splat(lane: i32) -> simd<i32, 8>
```

Returns a vector with every lane set to `lane`.

::Anchor{id="fromArray"}

## `fromArray`

```silk
pub fn fromArray(lanes: [i32; 8]) -> simd<i32, 8>
```

Returns a vector whose lane `i` is `lanes[i]`.

::Anchor{id="toArray"}

## `toArray`

```silk
pub fn toArray(vector: simd<i32, 8>) -> [i32; 8]
```

Returns the lanes of `vector` as an array, in lane order.

::Anchor{id="extract"}

## `extract`

```silk
pub fn extract(vector: simd<i32, 8>, index: usize) -> i32
```

Returns lane `index` of `vector`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="insert"}

## `insert`

```silk
pub fn insert(vector: simd<i32, 8>, index: usize, lane: i32) -> simd<i32, 8>
```

Returns `vector` with lane `index` replaced by `lane`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="load"}

## `load`

```silk
pub fn load(lanes: &[i32], offset: usize) -> simd<i32, 8>
```

Reads [`LANES`](#LANES) lanes of `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`. The slice needs no alignment beyond
`i32`.

::Anchor{id="store"}

## `store`

```silk
pub fn store(lanes: &mut [i32], offset: usize, vector: simd<i32, 8>) -> ()
```

Writes the lanes of `vector` into `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`.

::Anchor{id="loadUnchecked"}

## `loadUnchecked`

```silk
pub unsafe fn loadUnchecked(pointer: [*]const i32) -> simd<i32, 8>
```

Reads [`LANES`](#LANES) lanes starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) live lanes aligned to `i32`.

::Anchor{id="storeUnchecked"}

## `storeUnchecked`

```silk
pub unsafe fn storeUnchecked(pointer: [*]mut i32, vector: simd<i32, 8>) -> ()
```

Writes the lanes of `vector` starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) writable lanes aligned to `i32`.

::Anchor{id="lanesEqual"}

## `lanesEqual`

```silk
pub fn lanesEqual(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is equal to lane `i` of `right`.

::Anchor{id="lanesNotEqual"}

## `lanesNotEqual`

```silk
pub fn lanesNotEqual(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is not equal to lane `i` of `right`.

::Anchor{id="lanesLess"}

## `lanesLess`

```silk
pub fn lanesLess(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than lane `i` of `right`.

::Anchor{id="lanesLessOrEqual"}

## `lanesLessOrEqual`

```silk
pub fn lanesLessOrEqual(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than or equal to lane `i` of `right`.

::Anchor{id="lanesGreater"}

## `lanesGreater`

```silk
pub fn lanesGreater(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than lane `i` of `right`.

::Anchor{id="lanesGreaterOrEqual"}

## `lanesGreaterOrEqual`

```silk
pub fn lanesGreaterOrEqual(left: simd<i32, 8>, right: simd<i32, 8>) -> mask<8>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than or equal to lane `i` of `right`.

::Anchor{id="select"}

## `select`

```silk
pub fn select(mask: mask<8>, chosen: simd<i32, 8>, other: simd<i32, 8>) -> simd<i32, 8>
```

Returns lane `i` of `chosen` where lane `i` of `mask` is set, and lane `i` of `other` elsewhere.

::Anchor{id="minimum"}

## `minimum`

```silk
pub fn minimum(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the smaller lane of each pair.

::Anchor{id="maximum"}

## `maximum`

```silk
pub fn maximum(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the larger lane of each pair.

::Anchor{id="shuffle"}

## `shuffle`

```silk
pub fn shuffle(left: simd<i32, 8>, right: simd<i32, 8>, static indices: [usize; 8]) -> simd<i32, 8>
```

Returns a vector whose lane `i` is lane `indices[i]` of `left` followed by `right`.

### Details
An index below [`LANES`](#LANES) selects from `left`, and an index from [`LANES`](#LANES) to `2 * LANES - 1`
selects from `right`. The indices are static, so each call is one fixed lane permutation.

::Anchor{id="reduceAdd"}

## `reduceAdd`

```silk
pub fn reduceAdd(vector: simd<i32, 8>) -> i32
```

Returns the sum of every lane. Traps when the exact sum does not fit `i32`.

::Anchor{id="reduceMinimum"}

## `reduceMinimum`

```silk
pub fn reduceMinimum(vector: simd<i32, 8>) -> i32
```

Returns the smallest lane.

::Anchor{id="reduceMaximum"}

## `reduceMaximum`

```silk
pub fn reduceMaximum(vector: simd<i32, 8>) -> i32
```

Returns the largest lane.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the sum of each pair of lanes modulo 2^32.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the difference of each pair of lanes modulo 2^32.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the product of each pair of lanes modulo 2^32.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the sum of each pair of lanes, clamped to the range of `i32`.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: simd<i32, 8>, right: simd<i32, 8>) -> simd<i32, 8>
```

Returns the difference of each pair of lanes, clamped to the range of `i32`.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(vector: simd<i32, 8>, counts: simd<i32, 8>) -> simd<i32, 8>
```

Shifts lane `i` of `vector` left by lane `i` of `counts`.

### Gotchas
Traps when any count is not in the range 0 to 31.

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(vector: simd<i32, 8>, counts: simd<i32, 8>) -> simd<i32, 8>
```

Shifts lane `i` of `vector` right by lane `i` of `counts`. The shift copies the sign bit.

### Gotchas
Traps when any count is not in the range 0 to 31.

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(vector: simd<i32, 8>, counts: simd<i32, 8>) -> simd<i32, 8>
```

Rotates lane `i` of `vector` left by lane `i` of `counts` modulo 32.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(vector: simd<i32, 8>, counts: simd<i32, 8>) -> simd<i32, 8>
```

Rotates lane `i` of `vector` right by lane `i` of `counts` modulo 32.

::Anchor{id="reduceWrappingAdd"}

## `reduceWrappingAdd`

```silk
pub fn reduceWrappingAdd(vector: simd<i32, 8>) -> i32
```

Returns the sum of every lane modulo 2^32.

::Anchor{id="reduceBitAnd"}

## `reduceBitAnd`

```silk
pub fn reduceBitAnd(vector: simd<i32, 8>) -> i32
```

Returns the bitwise and of every lane.

::Anchor{id="reduceBitOr"}

## `reduceBitOr`

```silk
pub fn reduceBitOr(vector: simd<i32, 8>) -> i32
```

Returns the bitwise or of every lane.

::Anchor{id="reduceBitXor"}

## `reduceBitXor`

```silk
pub fn reduceBitXor(vector: simd<i32, 8>) -> i32
```

Returns the bitwise exclusive or of every lane.

::Anchor{id="toU16x8"}

## `toU16x8`

```silk
pub fn toU16x8(vector: simd<i32, 8>) -> simd<u16, 8>
```

Converts each lane to `u16` as the scalar conversion does. Traps when any lane does not
fit `u16`.

::Anchor{id="toI16x8"}

## `toI16x8`

```silk
pub fn toI16x8(vector: simd<i32, 8>) -> simd<i16, 8>
```

Converts each lane to `i16` as the scalar conversion does. Traps when any lane does not
fit `i16`.

::Anchor{id="toU32x8"}

## `toU32x8`

```silk
pub fn toU32x8(vector: simd<i32, 8>) -> simd<u32, 8>
```

Converts each lane to `u32` as the scalar conversion does. Traps when any lane does not
fit `u32`.

::Anchor{id="toF32x8"}

## `toF32x8`

```silk
pub fn toF32x8(vector: simd<i32, 8>) -> simd<f32, 8>
```

Converts each lane to `f32` as the scalar conversion does.

::Anchor{id="bitcastToU8x32"}

## `bitcastToU8x32`

```silk
pub fn bitcastToU8x32(vector: simd<i32, 8>) -> simd<u8, 32>
```

Returns the bits of `vector` as a `simd<u8, 32>`, in memory order.

::Anchor{id="bitcastToI8x32"}

## `bitcastToI8x32`

```silk
pub fn bitcastToI8x32(vector: simd<i32, 8>) -> simd<i8, 32>
```

Returns the bits of `vector` as a `simd<i8, 32>`, in memory order.

::Anchor{id="bitcastToU16x16"}

## `bitcastToU16x16`

```silk
pub fn bitcastToU16x16(vector: simd<i32, 8>) -> simd<u16, 16>
```

Returns the bits of `vector` as a `simd<u16, 16>`, in memory order.

::Anchor{id="bitcastToI16x16"}

## `bitcastToI16x16`

```silk
pub fn bitcastToI16x16(vector: simd<i32, 8>) -> simd<i16, 16>
```

Returns the bits of `vector` as a `simd<i16, 16>`, in memory order.

::Anchor{id="bitcastToU32x8"}

## `bitcastToU32x8`

```silk
pub fn bitcastToU32x8(vector: simd<i32, 8>) -> simd<u32, 8>
```

Returns the bits of `vector` as a `simd<u32, 8>`, in memory order.

::Anchor{id="bitcastToU64x4"}

## `bitcastToU64x4`

```silk
pub fn bitcastToU64x4(vector: simd<i32, 8>) -> simd<u64, 4>
```

Returns the bits of `vector` as a `simd<u64, 4>`, in memory order.

::Anchor{id="bitcastToI64x4"}

## `bitcastToI64x4`

```silk
pub fn bitcastToI64x4(vector: simd<i32, 8>) -> simd<i64, 4>
```

Returns the bits of `vector` as a `simd<i64, 4>`, in memory order.

::Anchor{id="bitcastToF32x8"}

## `bitcastToF32x8`

```silk
pub fn bitcastToF32x8(vector: simd<i32, 8>) -> simd<f32, 8>
```

Returns the bits of `vector` as a `simd<f32, 8>`, in memory order.

::Anchor{id="bitcastToF64x4"}

## `bitcastToF64x4`

```silk
pub fn bitcastToF64x4(vector: simd<i32, 8>) -> simd<f64, 4>
```

Returns the bits of `vector` as a `simd<f64, 4>`, in memory order.

Category: SIMD.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
