Operations on `simd<f64, 2>`: two 64-bit float lanes in one 128-bit vector.

## When to use
Use this module to work on two `f64` values at once. Use [`load`](#load) and [`store`](#store)
to move lanes between a slice and a vector, a lane comparison such as [`lanesEqual`](#lanesEqual) to make
a `mask<2>`, and `silk.simd.mask2` to test that mask.

## Details
The operators `+`, `-`, `*`, `/` and `%` apply lane by lane and follow IEEE 754 as the
`f64` operators do. `==` is true only when every lane is equal, and a NaN lane is never
equal. [`reduceAdd`](#reduceAdd) adds lanes in order, so it gives the same result on every target.
Lane `0` is at the lowest address in memory.

## Examples
### Scale every lane and add the results
```silk
import silk.simd.f64x2

pub fn main() -> i32 {
  let values = f64x2.fromArray([1.0, 2.0])
  let doubled = f64x2.mulAdd(values, f64x2.splat(2.0), f64x2.splat(0.0))
  if f64x2.reduceAdd(doubled) != 6.0 {
    return 1
  }
  return 0
}
```

Import as `f64x2` with `import silk.simd.f64x2 as f64x2`.

Public declarations: 37.

::Anchor{id="LANES"}

## `LANES`

```silk
pub const LANES: usize
```

The number of lanes in a vector.

::Anchor{id="splat"}

## `splat`

```silk
pub fn splat(lane: f64) -> simd<f64, 2>
```

Returns a vector with every lane set to `lane`.

::Anchor{id="fromArray"}

## `fromArray`

```silk
pub fn fromArray(lanes: [f64; 2]) -> simd<f64, 2>
```

Returns a vector whose lane `i` is `lanes[i]`.

::Anchor{id="toArray"}

## `toArray`

```silk
pub fn toArray(vector: simd<f64, 2>) -> [f64; 2]
```

Returns the lanes of `vector` as an array, in lane order.

::Anchor{id="extract"}

## `extract`

```silk
pub fn extract(vector: simd<f64, 2>, index: usize) -> f64
```

Returns lane `index` of `vector`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="insert"}

## `insert`

```silk
pub fn insert(vector: simd<f64, 2>, index: usize, lane: f64) -> simd<f64, 2>
```

Returns `vector` with lane `index` replaced by `lane`. Traps when `index` is [`LANES`](#LANES) or more.

::Anchor{id="load"}

## `load`

```silk
pub fn load(lanes: &[f64], offset: usize) -> simd<f64, 2>
```

Reads [`LANES`](#LANES) lanes of `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`. The slice needs no alignment beyond
`f64`.

::Anchor{id="store"}

## `store`

```silk
pub fn store(lanes: &mut [f64], offset: usize, vector: simd<f64, 2>) -> ()
```

Writes the lanes of `vector` into `lanes` starting at `offset`.

### Gotchas
Traps unless `offset + LANES` is at most `lanes.length`.

::Anchor{id="loadUnchecked"}

## `loadUnchecked`

```silk
pub unsafe fn loadUnchecked(pointer: [*]const f64) -> simd<f64, 2>
```

Reads [`LANES`](#LANES) lanes starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) live lanes aligned to `f64`.

::Anchor{id="storeUnchecked"}

## `storeUnchecked`

```silk
pub unsafe fn storeUnchecked(pointer: [*]mut f64, vector: simd<f64, 2>) -> ()
```

Writes the lanes of `vector` starting at `pointer`, with no bounds check.

### Gotchas
The caller proves that `pointer` addresses [`LANES`](#LANES) writable lanes aligned to `f64`.

::Anchor{id="lanesEqual"}

## `lanesEqual`

```silk
pub fn lanesEqual(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is equal to lane `i` of `right`. A comparison with a
NaN lane is false.

::Anchor{id="lanesNotEqual"}

## `lanesNotEqual`

```silk
pub fn lanesNotEqual(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is not equal to lane `i` of `right`. A NaN lane is
not equal to any lane.

::Anchor{id="lanesLess"}

## `lanesLess`

```silk
pub fn lanesLess(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than lane `i` of `right`. A comparison with a
NaN lane is false.

::Anchor{id="lanesLessOrEqual"}

## `lanesLessOrEqual`

```silk
pub fn lanesLessOrEqual(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is less than or equal to lane `i` of `right`. A comparison with a
NaN lane is false.

::Anchor{id="lanesGreater"}

## `lanesGreater`

```silk
pub fn lanesGreater(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than lane `i` of `right`. A comparison with a
NaN lane is false.

::Anchor{id="lanesGreaterOrEqual"}

## `lanesGreaterOrEqual`

```silk
pub fn lanesGreaterOrEqual(left: simd<f64, 2>, right: simd<f64, 2>) -> mask<2>
```

Returns a mask with lane `i` set where lane `i` of `left` is greater than or equal to lane `i` of `right`. A comparison with a
NaN lane is false.

::Anchor{id="select"}

## `select`

```silk
pub fn select(mask: mask<2>, chosen: simd<f64, 2>, other: simd<f64, 2>) -> simd<f64, 2>
```

Returns lane `i` of `chosen` where lane `i` of `mask` is set, and lane `i` of `other` elsewhere.

::Anchor{id="minimum"}

## `minimum`

```silk
pub fn minimum(left: simd<f64, 2>, right: simd<f64, 2>) -> simd<f64, 2>
```

Returns the smaller lane of each pair. A NaN lane in either input gives NaN, and `-0.0` is
less than `0.0`.

::Anchor{id="maximum"}

## `maximum`

```silk
pub fn maximum(left: simd<f64, 2>, right: simd<f64, 2>) -> simd<f64, 2>
```

Returns the larger lane of each pair. A NaN lane in either input gives NaN, and `-0.0` is
less than `0.0`.

::Anchor{id="shuffle"}

## `shuffle`

```silk
pub fn shuffle(left: simd<f64, 2>, right: simd<f64, 2>, static indices: [usize; 2]) -> simd<f64, 2>
```

Returns a vector whose lane `i` is lane `indices[i]` of `left` followed by `right`.

### Details
An index below [`LANES`](#LANES) selects from `left`, and an index from [`LANES`](#LANES) to `2 * LANES - 1`
selects from `right`. The indices are static, so each call is one fixed lane permutation.

::Anchor{id="reduceAdd"}

## `reduceAdd`

```silk
pub fn reduceAdd(vector: simd<f64, 2>) -> f64
```

Returns the sum of every lane, added in lane order from lane `0`.

::Anchor{id="reduceAddUnordered"}

## `reduceAddUnordered`

```silk
pub fn reduceAddUnordered(vector: simd<f64, 2>) -> f64
```

Returns the sum of every lane, added in the order the target prefers.

### Gotchas
The rounding can differ between targets. Use [`reduceAdd`](#reduceAdd) for a result that is the same
everywhere.

::Anchor{id="reduceMinimum"}

## `reduceMinimum`

```silk
pub fn reduceMinimum(vector: simd<f64, 2>) -> f64
```

Returns the smallest lane. A NaN lane gives NaN.

::Anchor{id="reduceMaximum"}

## `reduceMaximum`

```silk
pub fn reduceMaximum(vector: simd<f64, 2>) -> f64
```

Returns the largest lane. A NaN lane gives NaN.

::Anchor{id="sqrt"}

## `sqrt`

```silk
pub fn sqrt(vector: simd<f64, 2>) -> simd<f64, 2>
```

Returns the square root of each lane. A negative lane gives NaN.

::Anchor{id="mulAdd"}

## `mulAdd`

```silk
pub fn mulAdd(left: simd<f64, 2>, right: simd<f64, 2>, addend: simd<f64, 2>) -> simd<f64, 2>
```

Returns `left * right + addend` for each lane, with one rounding.

::Anchor{id="toU64x2"}

## `toU64x2`

```silk
pub fn toU64x2(vector: simd<f64, 2>) -> simd<u64, 2>
```

Converts each lane to `u64` as the scalar conversion does. Traps when any lane does not
fit `u64`.

::Anchor{id="toI64x2"}

## `toI64x2`

```silk
pub fn toI64x2(vector: simd<f64, 2>) -> simd<i64, 2>
```

Converts each lane to `i64` as the scalar conversion does. Traps when any lane does not
fit `i64`.

::Anchor{id="bitcastToU8x16"}

## `bitcastToU8x16`

```silk
pub fn bitcastToU8x16(vector: simd<f64, 2>) -> simd<u8, 16>
```

Returns the bits of `vector` as a `simd<u8, 16>`, in memory order.

::Anchor{id="bitcastToI8x16"}

## `bitcastToI8x16`

```silk
pub fn bitcastToI8x16(vector: simd<f64, 2>) -> simd<i8, 16>
```

Returns the bits of `vector` as a `simd<i8, 16>`, in memory order.

::Anchor{id="bitcastToU16x8"}

## `bitcastToU16x8`

```silk
pub fn bitcastToU16x8(vector: simd<f64, 2>) -> simd<u16, 8>
```

Returns the bits of `vector` as a `simd<u16, 8>`, in memory order.

::Anchor{id="bitcastToI16x8"}

## `bitcastToI16x8`

```silk
pub fn bitcastToI16x8(vector: simd<f64, 2>) -> simd<i16, 8>
```

Returns the bits of `vector` as a `simd<i16, 8>`, in memory order.

::Anchor{id="bitcastToU32x4"}

## `bitcastToU32x4`

```silk
pub fn bitcastToU32x4(vector: simd<f64, 2>) -> simd<u32, 4>
```

Returns the bits of `vector` as a `simd<u32, 4>`, in memory order.

::Anchor{id="bitcastToI32x4"}

## `bitcastToI32x4`

```silk
pub fn bitcastToI32x4(vector: simd<f64, 2>) -> simd<i32, 4>
```

Returns the bits of `vector` as a `simd<i32, 4>`, in memory order.

::Anchor{id="bitcastToU64x2"}

## `bitcastToU64x2`

```silk
pub fn bitcastToU64x2(vector: simd<f64, 2>) -> simd<u64, 2>
```

Returns the bits of `vector` as a `simd<u64, 2>`, in memory order.

::Anchor{id="bitcastToI64x2"}

## `bitcastToI64x2`

```silk
pub fn bitcastToI64x2(vector: simd<f64, 2>) -> simd<i64, 2>
```

Returns the bits of `vector` as a `simd<i64, 2>`, in memory order.

::Anchor{id="bitcastToF32x4"}

## `bitcastToF32x4`

```silk
pub fn bitcastToF32x4(vector: simd<f64, 2>) -> simd<f32, 4>
```

Returns the bits of `vector` as a `simd<f32, 4>`, in memory order.

Category: SIMD.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
