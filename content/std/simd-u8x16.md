Operations on `simd<u8, 16>`: sixteen unsigned 8-bit integer lanes in one 128-bit vector.

## When to use
Use this module to work on sixteen `u8` values at once. Use [`load`](#load) and [`store`](#store)
to move lanes between a slice and a vector, a lane comparison such as [`lanesEqual`](#lanesEqual) to make
a `mask<16>`, and `silk.simd.mask16` to test that mask.

## Details
The operators `+`, `-`, `*`, `/`, `%`, `&`, `|`, `^` and `~` apply lane by lane and trap
exactly where the `u8` operator traps. Use [`wrappingAdd`](#wrappingAdd) or [`saturatingAdd`](#saturatingAdd) when
overflow is expected. `==` is true only when every lane is equal.
Lane `0` is at the lowest address in memory.

## Examples
### Find the first matching lane
```silk
import silk.simd.mask16
import silk.simd.u8x16

pub fn main() -> i32 {
  let mut values: [u8; 16] = u8x16.toArray(u8x16.splat(0))
  values[15] = 3
  let hits = u8x16.lanesEqual(u8x16.fromArray(values), u8x16.splat(3))
  if !mask16.any(hits) || mask16.firstSet(hits) != 15 {
    return 1
  }
  return 0
}
```

Import as `u8x16` with `import silk.simd.u8x16 as u8x16`.

Public declarations: 48.

::Anchor{id="LANES"}

## `LANES`

```silk
pub const LANES: usize
```

The number of lanes in a vector.

::Anchor{id="splat"}

## `splat`

```silk
pub fn splat(lane: u8) -> simd<u8, 16>
```

Returns a vector with every lane set to `lane`.

::Anchor{id="fromArray"}

## `fromArray`

```silk
pub fn fromArray(lanes: [u8; 16]) -> simd<u8, 16>
```

Returns a vector whose lane `i` is `lanes[i]`.

::Anchor{id="toArray"}

## `toArray`

```silk
pub fn toArray(vector: simd<u8, 16>) -> [u8; 16]
```

Returns the lanes of `vector` as an array, in lane order.

::Anchor{id="extract"}

## `extract`

```silk
pub fn extract(vector: simd<u8, 16>, index: usize) -> u8
```

Returns lane `index` of `vector`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="insert"}

## `insert`

```silk
pub fn insert(vector: simd<u8, 16>, index: usize, lane: u8) -> simd<u8, 16>
```

Returns `vector` with lane `index` replaced by `lane`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="load"}

## `load`

```silk
pub fn load(lanes: &[u8], offset: usize) -> simd<u8, 16>
```

Reads [`LANES`](#LANES) lanes of `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`. The slice needs no alignment beyond
`u8`.

::Anchor{id="store"}

## `store`

```silk
pub fn store(lanes: &mut [u8], offset: usize, vector: simd<u8, 16>) -> ()
```

Writes the lanes of `vector` into `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`.

::Anchor{id="loadUnchecked"}

## `loadUnchecked`

```silk
pub unsafe fn loadUnchecked(pointer: [*]const u8) -> simd<u8, 16>
```

Reads [`LANES`](#LANES) lanes starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) live lanes aligned to `u8`.

::Anchor{id="storeUnchecked"}

## `storeUnchecked`

```silk
pub unsafe fn storeUnchecked(pointer: [*]mut u8, vector: simd<u8, 16>) -> ()
```

Writes the lanes of `vector` starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) writable lanes aligned to `u8`.

::Anchor{id="lanesEqual"}

## `lanesEqual`

```silk
pub fn lanesEqual(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is equal to lane `i` of `right`.

::Anchor{id="lanesNotEqual"}

## `lanesNotEqual`

```silk
pub fn lanesNotEqual(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is not equal to lane `i` of `right`.

::Anchor{id="lanesLess"}

## `lanesLess`

```silk
pub fn lanesLess(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than lane `i` of `right`.

::Anchor{id="lanesLessOrEqual"}

## `lanesLessOrEqual`

```silk
pub fn lanesLessOrEqual(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than or equal to lane `i` of `right`.

::Anchor{id="lanesGreater"}

## `lanesGreater`

```silk
pub fn lanesGreater(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than lane `i` of `right`.

::Anchor{id="lanesGreaterOrEqual"}

## `lanesGreaterOrEqual`

```silk
pub fn lanesGreaterOrEqual(left: simd<u8, 16>, right: simd<u8, 16>) -> mask<16>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than or equal to lane `i` of `right`.

::Anchor{id="select"}

## `select`

```silk
pub fn select(mask: mask<16>, chosen: simd<u8, 16>, other: simd<u8, 16>) -> simd<u8, 16>
```

Returns lane `i` of `chosen` where lane `i` of `mask` is set, and lane `i` of `other` elsewhere.

::Anchor{id="minimum"}

## `minimum`

```silk
pub fn minimum(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the smaller lane of each pair.

::Anchor{id="maximum"}

## `maximum`

```silk
pub fn maximum(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the larger lane of each pair.

::Anchor{id="shuffle"}

## `shuffle`

```silk
pub fn shuffle(left: simd<u8, 16>, right: simd<u8, 16>, static indices: [usize; 16]) -> simd<u8, 16>
```

Returns a vector whose lane `i` is lane `indices[i]` of `left` followed by `right`.

### Details
An index below [`LANES`](#LANES) selects from `left`, and an index from [`LANES`](#LANES) to `2 * LANES - 1`
selects from `right`. The indices are static, so each call is one fixed lane permutation.

::Anchor{id="reduceAdd"}

## `reduceAdd`

```silk
pub fn reduceAdd(vector: simd<u8, 16>) -> u8
```

Returns the sum of every lane. Traps when the exact sum does not fit `u8`.

::Anchor{id="reduceMinimum"}

## `reduceMinimum`

```silk
pub fn reduceMinimum(vector: simd<u8, 16>) -> u8
```

Returns the smallest lane.

::Anchor{id="reduceMaximum"}

## `reduceMaximum`

```silk
pub fn reduceMaximum(vector: simd<u8, 16>) -> u8
```

Returns the largest lane.

::Anchor{id="wrappingAdd"}

## `wrappingAdd`

```silk
pub fn wrappingAdd(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the sum of each pair of lanes modulo 2^8.

::Anchor{id="wrappingSubtract"}

## `wrappingSubtract`

```silk
pub fn wrappingSubtract(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the difference of each pair of lanes modulo 2^8.

::Anchor{id="wrappingMultiply"}

## `wrappingMultiply`

```silk
pub fn wrappingMultiply(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the product of each pair of lanes modulo 2^8.

::Anchor{id="saturatingAdd"}

## `saturatingAdd`

```silk
pub fn saturatingAdd(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the sum of each pair of lanes, clamped to the range of `u8`.

::Anchor{id="saturatingSubtract"}

## `saturatingSubtract`

```silk
pub fn saturatingSubtract(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16>
```

Returns the difference of each pair of lanes, clamped to the range of `u8`.

::Anchor{id="shiftLeft"}

## `shiftLeft`

```silk
pub fn shiftLeft(vector: simd<u8, 16>, counts: simd<u8, 16>) -> simd<u8, 16>
```

Shifts lane `i` of `vector` left by lane `i` of `counts`.

### Gotchas
Traps when any count is not in the range 0 to 7.

::Anchor{id="shiftRight"}

## `shiftRight`

```silk
pub fn shiftRight(vector: simd<u8, 16>, counts: simd<u8, 16>) -> simd<u8, 16>
```

Shifts lane `i` of `vector` right by lane `i` of `counts`. The shift inserts zero bits.

### Gotchas
Traps when any count is not in the range 0 to 7.

::Anchor{id="rotateLeft"}

## `rotateLeft`

```silk
pub fn rotateLeft(vector: simd<u8, 16>, counts: simd<u8, 16>) -> simd<u8, 16>
```

Rotates lane `i` of `vector` left by lane `i` of `counts` modulo 8.

::Anchor{id="rotateRight"}

## `rotateRight`

```silk
pub fn rotateRight(vector: simd<u8, 16>, counts: simd<u8, 16>) -> simd<u8, 16>
```

Rotates lane `i` of `vector` right by lane `i` of `counts` modulo 8.

::Anchor{id="reduceWrappingAdd"}

## `reduceWrappingAdd`

```silk
pub fn reduceWrappingAdd(vector: simd<u8, 16>) -> u8
```

Returns the sum of every lane modulo 2^8.

::Anchor{id="reduceBitAnd"}

## `reduceBitAnd`

```silk
pub fn reduceBitAnd(vector: simd<u8, 16>) -> u8
```

Returns the bitwise and of every lane.

::Anchor{id="reduceBitOr"}

## `reduceBitOr`

```silk
pub fn reduceBitOr(vector: simd<u8, 16>) -> u8
```

Returns the bitwise or of every lane.

::Anchor{id="reduceBitXor"}

## `reduceBitXor`

```silk
pub fn reduceBitXor(vector: simd<u8, 16>) -> u8
```

Returns the bitwise exclusive or of every lane.

::Anchor{id="toI8x16"}

## `toI8x16`

```silk
pub fn toI8x16(vector: simd<u8, 16>) -> simd<i8, 16>
```

Converts each lane to `i8` as the scalar conversion does. Traps when any lane does not
fit `i8`.

::Anchor{id="toU16x16"}

## `toU16x16`

```silk
pub fn toU16x16(vector: simd<u8, 16>) -> simd<u16, 16>
```

Converts each lane to `u16` as the scalar conversion does. Traps when any lane does not
fit `u16`.

::Anchor{id="toI16x16"}

## `toI16x16`

```silk
pub fn toI16x16(vector: simd<u8, 16>) -> simd<i16, 16>
```

Converts each lane to `i16` as the scalar conversion does. Traps when any lane does not
fit `i16`.

::Anchor{id="bitcastToI8x16"}

## `bitcastToI8x16`

```silk
pub fn bitcastToI8x16(vector: simd<u8, 16>) -> simd<i8, 16>
```

Returns the bits of `vector` as a `simd<i8, 16>`, in memory order.

::Anchor{id="bitcastToU16x8"}

## `bitcastToU16x8`

```silk
pub fn bitcastToU16x8(vector: simd<u8, 16>) -> simd<u16, 8>
```

Returns the bits of `vector` as a `simd<u16, 8>`, in memory order.

::Anchor{id="bitcastToI16x8"}

## `bitcastToI16x8`

```silk
pub fn bitcastToI16x8(vector: simd<u8, 16>) -> simd<i16, 8>
```

Returns the bits of `vector` as a `simd<i16, 8>`, in memory order.

::Anchor{id="bitcastToU32x4"}

## `bitcastToU32x4`

```silk
pub fn bitcastToU32x4(vector: simd<u8, 16>) -> simd<u32, 4>
```

Returns the bits of `vector` as a `simd<u32, 4>`, in memory order.

::Anchor{id="bitcastToI32x4"}

## `bitcastToI32x4`

```silk
pub fn bitcastToI32x4(vector: simd<u8, 16>) -> simd<i32, 4>
```

Returns the bits of `vector` as a `simd<i32, 4>`, in memory order.

::Anchor{id="bitcastToU64x2"}

## `bitcastToU64x2`

```silk
pub fn bitcastToU64x2(vector: simd<u8, 16>) -> simd<u64, 2>
```

Returns the bits of `vector` as a `simd<u64, 2>`, in memory order.

::Anchor{id="bitcastToI64x2"}

## `bitcastToI64x2`

```silk
pub fn bitcastToI64x2(vector: simd<u8, 16>) -> simd<i64, 2>
```

Returns the bits of `vector` as a `simd<i64, 2>`, in memory order.

::Anchor{id="bitcastToF32x4"}

## `bitcastToF32x4`

```silk
pub fn bitcastToF32x4(vector: simd<u8, 16>) -> simd<f32, 4>
```

Returns the bits of `vector` as a `simd<f32, 4>`, in memory order.

::Anchor{id="bitcastToF64x2"}

## `bitcastToF64x2`

```silk
pub fn bitcastToF64x2(vector: simd<u8, 16>) -> simd<f64, 2>
```

Returns the bits of `vector` as a `simd<f64, 2>`, in memory order.

Category: SIMD.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
