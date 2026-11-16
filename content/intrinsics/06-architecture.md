# Architecture operations

These members are single instructions of one architecture that the portable [SIMD](/docs/intrinsics/simd) members cannot express: byte shuffles, saturating packs, dot products, and the AES, carry-less multiply, SHA-256 and SHA-1 instructions. Each lowers to exactly one LLVM intrinsic. The `silk/simd/x86`, `silk/simd/aarch64` and `silk/simd/wasm` modules wrap them in functions that use the instruction where the profile enables it and portable code everywhere else.

## Rules shared by every architecture member

- A call is admitted only when the selected target is the member's architecture and the instruction's CPU feature is enabled, by the profile or by the `@features` directive of the function that makes the call. A feature counts when an enabled feature implies it: `avx2` admits the `ssse3` and `sse4.1` shapes, and on AArch64 `crypto` admits the `aes` and `sha2` ones. Otherwise the call is SEM0241: "Intrinsic.x86ShuffleBytes needs x86_64 with ssse3, which this profile does not select; guard it with `static if Target.hasCpuFeature(...)` or list the feature in the function's `@features(...)` directive".
- A function with `@features` must be an `unsafe fn`, and each call to it is unsafe: running it on a CPU without the features is undefined behavior. Check first with `CpuFeatures.detect()` from [`silk/simd/cpu`](/docs/std/simd-cpu).
- The members themselves are safe once admitted. They read and write only their vector operands.
- The first type argument is the first operand's vector type, and it selects one of the listed shapes. A shape the member does not take is SEM0239, and the message lists the shapes it takes. The shape is checked before the target, so a wrong shape is reported on any target.
- Code for several targets puts each call under a `static if` on `Intrinsic.targetArchitecture()`, so that the other targets never see it.

The examples are checked for the architecture they name, not run, since the machine that runs the checks may lack the feature.

### `Intrinsic.x86ShuffleBytes`

```silk signature
fn x86ShuffleBytes<V>(table: V, indices: V) -> V
```

`pshufb`: lane `i` is `table[indices[i] & 15]` within each 128-bit half, or zero when bit 7 of `indices[i]` is set.

- Shapes, with the x86_64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `ssse3`; `simd<u8, 32>`, `simd<u8, 32>` to `simd<u8, 32>` with `avx2`.
- Wrappers: [`shuffleBytes`](/docs/std/simd-x86#shuffleBytes), [`shuffleBytes256`](/docs/std/simd-x86#shuffleBytes256) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("ssse3")
unsafe fn shuffleBytes(table: simd<u8, 16>, indices: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.x86ShuffleBytes<simd<u8, 16>>(table, indices)
}

pub fn main() -> i32 {
  let table = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let indices = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe shuffleBytes(table, indices)
  drop result
  return 0
}
```

### `Intrinsic.x86MultiplyAddBytes`

```silk signature
fn x86MultiplyAddBytes<V>(left: V, right: W) -> R
```

`pmaddubsw`: unsigned bytes times signed bytes, adjacent products summed with signed saturation.

- Shapes, with the x86_64 feature each needs: `simd<u8, 16>`, `simd<i8, 16>` to `simd<i16, 8>` with `ssse3`; `simd<u8, 32>`, `simd<i8, 32>` to `simd<i16, 16>` with `avx2`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`multiplyAddBytes`](/docs/std/simd-x86#multiplyAddBytes), [`multiplyAddBytes256`](/docs/std/simd-x86#multiplyAddBytes256) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("ssse3")
unsafe fn multiplyAddBytes(left: simd<u8, 16>, right: simd<i8, 16>) -> simd<i16, 8> {
  return Intrinsic.x86MultiplyAddBytes<simd<u8, 16>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let right = Intrinsic.simdSplat<simd<i8, 16>>(1)
  let result = unsafe multiplyAddBytes(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86MultiplyAddWords`

```silk signature
fn x86MultiplyAddWords<V>(left: V, right: V) -> R
```

`pmaddwd`: signed 16-bit products, adjacent pairs summed into 32-bit lanes.

- Shapes, with the x86_64 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<i32, 4>` with `sse2`; `simd<i16, 16>`, `simd<i16, 16>` to `simd<i32, 8>` with `avx2`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`multiplyAddWords`](/docs/std/simd-x86#multiplyAddWords), [`multiplyAddWords256`](/docs/std/simd-x86#multiplyAddWords256) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sse2")
unsafe fn multiplyAddWords(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<i32, 4> {
  return Intrinsic.x86MultiplyAddWords<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe multiplyAddWords(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86PackUnsignedSaturate`

```silk signature
fn x86PackUnsignedSaturate<V>(left: V, right: V) -> R
```

`packuswb` and `packusdw`: both operands narrowed to half-width unsigned lanes with saturation, `left` first within each 128-bit half.

- Shapes, with the x86_64 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<u8, 16>` with `sse2`; `simd<i16, 16>`, `simd<i16, 16>` to `simd<u8, 32>` with `avx2`; `simd<i32, 4>`, `simd<i32, 4>` to `simd<u16, 8>` with `sse4.1`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`packUnsigned16`](/docs/std/simd-x86#packUnsigned16), [`packUnsigned16x256`](/docs/std/simd-x86#packUnsigned16x256), [`packUnsigned32`](/docs/std/simd-x86#packUnsigned32) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sse2")
unsafe fn packUnsignedSaturate(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<u8, 16> {
  return Intrinsic.x86PackUnsignedSaturate<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe packUnsignedSaturate(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86PackSignedSaturate`

```silk signature
fn x86PackSignedSaturate<V>(left: V, right: V) -> R
```

`packsswb` and `packssdw`: both operands narrowed to half-width signed lanes with saturation.

- Shapes, with the x86_64 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<i8, 16>` with `sse2`; `simd<i32, 4>`, `simd<i32, 4>` to `simd<i16, 8>` with `sse2`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`packSigned16`](/docs/std/simd-x86#packSigned16), [`packSigned32`](/docs/std/simd-x86#packSigned32) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sse2")
unsafe fn packSignedSaturate(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<i8, 16> {
  return Intrinsic.x86PackSignedSaturate<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe packSignedSaturate(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86SumAbsoluteDifferences`

```silk signature
fn x86SumAbsoluteDifferences<V>(left: V, right: V) -> R
```

`psadbw`: the sum of absolute byte differences of each 8-byte group.

- Shapes, with the x86_64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u64, 2>` with `sse2`; `simd<u8, 32>`, `simd<u8, 32>` to `simd<u64, 4>` with `avx2`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`sumAbsoluteDifferences`](/docs/std/simd-x86#sumAbsoluteDifferences), [`sumAbsoluteDifferences256`](/docs/std/simd-x86#sumAbsoluteDifferences256) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sse2")
unsafe fn sumAbsoluteDifferences(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u64, 2> {
  return Intrinsic.x86SumAbsoluteDifferences<simd<u8, 16>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let right = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe sumAbsoluteDifferences(left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64TableLookup`

```silk signature
fn aarch64TableLookup<V>(table: V, indices: V) -> V
```

`tbl`: lane `i` is `table[indices[i]]`, or zero when `indices[i]` is 16 or more.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `neon`.
- Wrapper: [`tableLookup`](/docs/std/simd-aarch64#tableLookup) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("neon")
unsafe fn tableLookup(table: simd<u8, 16>, indices: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64TableLookup<simd<u8, 16>>(table, indices)
}

pub fn main() -> i32 {
  let table = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let indices = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe tableLookup(table, indices)
  drop result
  return 0
}
```

### `Intrinsic.aarch64DotProduct`

```silk signature
fn aarch64DotProduct<V>(sum: V, left: W, right: W) -> V
```

`udot` and `sdot`: each 32-bit lane of `sum` plus the dot product of its four byte lanes of `left` and `right`.

- Shapes, with the aarch64 feature each needs: `simd<u32, 4>`, `simd<u8, 16>`, `simd<u8, 16>` to `simd<u32, 4>` with `dotprod`; `simd<i32, 4>`, `simd<i8, 16>`, `simd<i8, 16>` to `simd<i32, 4>` with `dotprod`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrappers: [`dotProduct`](/docs/std/simd-aarch64#dotProduct), [`dotProductSigned`](/docs/std/simd-aarch64#dotProductSigned) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("dotprod")
unsafe fn dotProduct(sum: simd<u32, 4>, left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u32, 4> {
  return Intrinsic.aarch64DotProduct<simd<u32, 4>>(sum, left, right)
}

pub fn main() -> i32 {
  let sum = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let left = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let right = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe dotProduct(sum, left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64PairwiseAdd`

```silk signature
fn aarch64PairwiseAdd<V>(left: V, right: V) -> V
```

`addp`: sums of adjacent lane pairs of `left`, then of `right`, wrapping.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `neon`; `simd<u16, 8>`, `simd<u16, 8>` to `simd<u16, 8>` with `neon`; `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `neon`.
- Wrappers: [`pairwiseAdd8`](/docs/std/simd-aarch64#pairwiseAdd8), [`pairwiseAdd16`](/docs/std/simd-aarch64#pairwiseAdd16), [`pairwiseAdd32`](/docs/std/simd-aarch64#pairwiseAdd32) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("neon")
unsafe fn pairwiseAdd(left: simd<u8, 16>, right: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64PairwiseAdd<simd<u8, 16>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let right = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe pairwiseAdd(left, right)
  drop result
  return 0
}
```

### `Intrinsic.wasmSwizzle`

```silk signature
fn wasmSwizzle<V>(table: V, indices: V) -> V
```

`i8x16.swizzle`: lane `i` is `table[indices[i]]`, or zero when `indices[i]` is 16 or more.

- Shapes, with the wasm32 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `simd128`.
- Wrapper: [`swizzle`](/docs/std/simd-wasm#swizzle) in `silk/simd/wasm`, which fall back to portable code where the feature is missing.

```silk check target=wasm32-unknown-unknown
@features("simd128")
unsafe fn swizzle(table: simd<u8, 16>, indices: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.wasmSwizzle<simd<u8, 16>>(table, indices)
}

pub fn main() -> i32 {
  let table = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let indices = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe swizzle(table, indices)
  drop result
  return 0
}
```

### `Intrinsic.wasmRelaxedSwizzle`

```silk signature
fn wasmRelaxedSwizzle<V>(table: V, indices: V) -> V
```

`i8x16.relaxed_swizzle`: as `wasmSwizzle` for indices below 16; other lanes are unspecified.

- Shapes, with the wasm32 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `relaxed-simd`.
- Wrapper: [`relaxedSwizzle`](/docs/std/simd-wasm#relaxedSwizzle) in `silk/simd/wasm`, which fall back to portable code where the feature is missing.

```silk check target=wasm32-unknown-unknown
@features("relaxed-simd")
unsafe fn relaxedSwizzle(table: simd<u8, 16>, indices: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.wasmRelaxedSwizzle<simd<u8, 16>>(table, indices)
}

pub fn main() -> i32 {
  let table = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let indices = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe relaxedSwizzle(table, indices)
  drop result
  return 0
}
```

### `Intrinsic.wasmDot`

```silk signature
fn wasmDot<V>(left: V, right: V) -> R
```

`i32x4.dot_i16x8_s`: signed 16-bit products, adjacent pairs summed into 32-bit lanes.

- Shapes, with the wasm32 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<i32, 4>` with `simd128`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrapper: [`dot`](/docs/std/simd-wasm#dot) in `silk/simd/wasm`, which fall back to portable code where the feature is missing.

```silk check target=wasm32-unknown-unknown
@features("simd128")
unsafe fn dot(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<i32, 4> {
  return Intrinsic.wasmDot<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe dot(left, right)
  drop result
  return 0
}
```

### `Intrinsic.wasmNarrowUnsigned`

```silk signature
fn wasmNarrowUnsigned<V>(left: V, right: V) -> R
```

`i8x16.narrow_i16x8_u`: both operands narrowed to unsigned bytes with saturation, `left` first.

- Shapes, with the wasm32 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<u8, 16>` with `simd128`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrapper: [`narrowUnsigned`](/docs/std/simd-wasm#narrowUnsigned) in `silk/simd/wasm`, which fall back to portable code where the feature is missing.

```silk check target=wasm32-unknown-unknown
@features("simd128")
unsafe fn narrowUnsigned(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<u8, 16> {
  return Intrinsic.wasmNarrowUnsigned<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe narrowUnsigned(left, right)
  drop result
  return 0
}
```

### `Intrinsic.wasmNarrowSigned`

```silk signature
fn wasmNarrowSigned<V>(left: V, right: V) -> R
```

`i8x16.narrow_i16x8_s`: both operands narrowed to signed bytes with saturation, `left` first.

- Shapes, with the wasm32 feature each needs: `simd<i16, 8>`, `simd<i16, 8>` to `simd<i8, 16>` with `simd128`.
- `V` is the first operand's type and selects the shape; the other operand and result types follow from it, as listed.
- Wrapper: [`narrowSigned`](/docs/std/simd-wasm#narrowSigned) in `silk/simd/wasm`, which fall back to portable code where the feature is missing.

```silk check target=wasm32-unknown-unknown
@features("simd128")
unsafe fn narrowSigned(left: simd<i16, 8>, right: simd<i16, 8>) -> simd<i8, 16> {
  return Intrinsic.wasmNarrowSigned<simd<i16, 8>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let right = Intrinsic.simdSplat<simd<i16, 8>>(1)
  let result = unsafe narrowSigned(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86AesEncrypt`

```silk signature
fn x86AesEncrypt<V>(state: V, key: V) -> V
```

`aesenc`: one AES encryption round of `state` with the round key `key`: ShiftRows, SubBytes and MixColumns, then the key added.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`aesEncrypt`](/docs/std/simd-x86#aesEncrypt) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("aes")
unsafe fn aesEncrypt(state: simd<u64, 2>, key: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86AesEncrypt<simd<u64, 2>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let key = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe aesEncrypt(state, key)
  drop result
  return 0
}
```

### `Intrinsic.x86AesEncryptLast`

```silk signature
fn x86AesEncryptLast<V>(state: V, key: V) -> V
```

`aesenclast`: the last AES encryption round, which skips MixColumns.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`aesEncryptLast`](/docs/std/simd-x86#aesEncryptLast) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("aes")
unsafe fn aesEncryptLast(state: simd<u64, 2>, key: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86AesEncryptLast<simd<u64, 2>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let key = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe aesEncryptLast(state, key)
  drop result
  return 0
}
```

### `Intrinsic.x86AesDecrypt`

```silk signature
fn x86AesDecrypt<V>(state: V, key: V) -> V
```

`aesdec`: one AES decryption round of the equivalent inverse cipher: InvShiftRows, InvSubBytes and InvMixColumns, then the key added.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`aesDecrypt`](/docs/std/simd-x86#aesDecrypt) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("aes")
unsafe fn aesDecrypt(state: simd<u64, 2>, key: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86AesDecrypt<simd<u64, 2>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let key = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe aesDecrypt(state, key)
  drop result
  return 0
}
```

### `Intrinsic.x86AesDecryptLast`

```silk signature
fn x86AesDecryptLast<V>(state: V, key: V) -> V
```

`aesdeclast`: the last AES decryption round, which skips InvMixColumns.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`aesDecryptLast`](/docs/std/simd-x86#aesDecryptLast) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("aes")
unsafe fn aesDecryptLast(state: simd<u64, 2>, key: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86AesDecryptLast<simd<u64, 2>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let key = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe aesDecryptLast(state, key)
  drop result
  return 0
}
```

### `Intrinsic.x86AesInverseMixColumns`

```silk signature
fn x86AesInverseMixColumns<V>(key: V) -> V
```

`aesimc`: InvMixColumns of one round key, for the decryption key schedule.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`aesInverseMixColumns`](/docs/std/simd-x86#aesInverseMixColumns) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("aes")
unsafe fn aesInverseMixColumns(key: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86AesInverseMixColumns<simd<u64, 2>>(key)
}

pub fn main() -> i32 {
  let key = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe aesInverseMixColumns(key)
  drop result
  return 0
}
```

### `Intrinsic.x86CarrylessMultiply`

```silk signature
fn x86CarrylessMultiply<V>(left: V, right: V) -> V
```

`pclmulqdq` with selector 0: the 128-bit carry-less product of lane 0 of `left` and lane 0 of `right`, low half in lane 0.

- Shapes, with the x86_64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `pclmul`.
- Wrapper: [`carrylessMultiply`](/docs/std/simd-x86#carrylessMultiply) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("pclmul")
unsafe fn carrylessMultiply(left: simd<u64, 2>, right: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.x86CarrylessMultiply<simd<u64, 2>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let right = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe carrylessMultiply(left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64AesEncrypt`

```silk signature
fn aarch64AesEncrypt<V>(state: V, key: V) -> V
```

`aese`: the key added to `state`, then ShiftRows and SubBytes.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `aes`.
- Wrapper: [`aesEncrypt`](/docs/std/simd-aarch64#aesEncrypt) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn aesEncrypt(state: simd<u8, 16>, key: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64AesEncrypt<simd<u8, 16>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let key = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe aesEncrypt(state, key)
  drop result
  return 0
}
```

### `Intrinsic.aarch64AesDecrypt`

```silk signature
fn aarch64AesDecrypt<V>(state: V, key: V) -> V
```

`aesd`: the key added to `state`, then InvShiftRows and InvSubBytes.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>`, `simd<u8, 16>` to `simd<u8, 16>` with `aes`.
- Wrapper: [`aesDecrypt`](/docs/std/simd-aarch64#aesDecrypt) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn aesDecrypt(state: simd<u8, 16>, key: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64AesDecrypt<simd<u8, 16>>(state, key)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let key = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe aesDecrypt(state, key)
  drop result
  return 0
}
```

### `Intrinsic.aarch64AesMixColumns`

```silk signature
fn aarch64AesMixColumns<V>(state: V) -> V
```

`aesmc`: AES MixColumns.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>` to `simd<u8, 16>` with `aes`.
- Wrapper: [`aesMixColumns`](/docs/std/simd-aarch64#aesMixColumns) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn aesMixColumns(state: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64AesMixColumns<simd<u8, 16>>(state)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe aesMixColumns(state)
  drop result
  return 0
}
```

### `Intrinsic.aarch64AesInverseMixColumns`

```silk signature
fn aarch64AesInverseMixColumns<V>(state: V) -> V
```

`aesimc`: AES InvMixColumns.

- Shapes, with the aarch64 feature each needs: `simd<u8, 16>` to `simd<u8, 16>` with `aes`.
- Wrapper: [`aesInverseMixColumns`](/docs/std/simd-aarch64#aesInverseMixColumns) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn aesInverseMixColumns(state: simd<u8, 16>) -> simd<u8, 16> {
  return Intrinsic.aarch64AesInverseMixColumns<simd<u8, 16>>(state)
}

pub fn main() -> i32 {
  let state = Intrinsic.simdSplat<simd<u8, 16>>(1)
  let result = unsafe aesInverseMixColumns(state)
  drop result
  return 0
}
```

### `Intrinsic.aarch64PolynomialMultiply`

```silk signature
fn aarch64PolynomialMultiply<V>(left: V, right: V) -> V
```

`pmull`: the 128-bit carry-less product of lane 0 of `left` and lane 0 of `right`, low half in lane 0.

- Shapes, with the aarch64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`polynomialMultiply`](/docs/std/simd-aarch64#polynomialMultiply) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn polynomialMultiply(left: simd<u64, 2>, right: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.aarch64PolynomialMultiply<simd<u64, 2>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let right = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe polynomialMultiply(left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64PolynomialMultiplyHigh`

```silk signature
fn aarch64PolynomialMultiplyHigh<V>(left: V, right: V) -> V
```

`pmull2`: the 128-bit carry-less product of lane 1 of `left` and lane 1 of `right`, low half in lane 0.

- Shapes, with the aarch64 feature each needs: `simd<u64, 2>`, `simd<u64, 2>` to `simd<u64, 2>` with `aes`.
- Wrapper: [`polynomialMultiplyHigh`](/docs/std/simd-aarch64#polynomialMultiplyHigh) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("aes")
unsafe fn polynomialMultiplyHigh(left: simd<u64, 2>, right: simd<u64, 2>) -> simd<u64, 2> {
  return Intrinsic.aarch64PolynomialMultiplyHigh<simd<u64, 2>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let right = Intrinsic.simdSplat<simd<u64, 2>>(1)
  let result = unsafe polynomialMultiplyHigh(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha256Rounds2`

```silk signature
fn x86Sha256Rounds2<V>(cdgh: V, abef: V, wk: V) -> V
```

`sha256rnds2`: two SHA-256 rounds. `cdgh` holds C, D, G and H in lanes 3, 2, 1 and 0, `abef` holds A, B, E and F the same way, and lanes 0 and 1 of `wk` are the two message words plus round constants; the result is the new A, B, E and F.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha256Rounds2`](/docs/std/simd-x86#sha256Rounds2) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha256Rounds2(cdgh: simd<u32, 4>, abef: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha256Rounds2<simd<u32, 4>>(cdgh, abef, wk)
}

pub fn main() -> i32 {
  let cdgh = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let abef = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256Rounds2(cdgh, abef, wk)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha256Message1`

```silk signature
fn x86Sha256Message1<V>(left: V, right: V) -> V
```

`sha256msg1`: the first step of four SHA-256 message words: lane `i` is `W[i] + sigma0(W[i + 1])` over the eight lanes of `left` then `right`.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha256Message1`](/docs/std/simd-x86#sha256Message1) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha256Message1(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha256Message1<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256Message1(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha256Message2`

```silk signature
fn x86Sha256Message2<V>(left: V, right: V) -> V
```

`sha256msg2`: the last step of four SHA-256 message words: lane `i` of `left` plus `sigma1` of the word two before it, taken from lanes 2 and 3 of `right` and then from the result.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha256Message2`](/docs/std/simd-x86#sha256Message2) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha256Message2(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha256Message2<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256Message2(left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64Sha256Hash`

```silk signature
fn aarch64Sha256Hash<V>(abcd: V, efgh: V, wk: V) -> V
```

`sha256h`: four SHA-256 rounds, returning the new A, B, C and D from `abcd`, `efgh` and the four words of `wk`.

- Shapes, with the aarch64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha2`.
- Wrapper: [`sha256Hash`](/docs/std/simd-aarch64#sha256Hash) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("sha2")
unsafe fn sha256Hash(abcd: simd<u32, 4>, efgh: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.aarch64Sha256Hash<simd<u32, 4>>(abcd, efgh, wk)
}

pub fn main() -> i32 {
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let efgh = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256Hash(abcd, efgh, wk)
  drop result
  return 0
}
```

### `Intrinsic.aarch64Sha256Hash2`

```silk signature
fn aarch64Sha256Hash2<V>(efgh: V, abcd: V, wk: V) -> V
```

`sha256h2`: the same four rounds, returning the new E, F, G and H from `efgh`, `abcd` and `wk`.

- Shapes, with the aarch64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha2`.
- Wrapper: [`sha256Hash2`](/docs/std/simd-aarch64#sha256Hash2) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("sha2")
unsafe fn sha256Hash2(efgh: simd<u32, 4>, abcd: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.aarch64Sha256Hash2<simd<u32, 4>>(efgh, abcd, wk)
}

pub fn main() -> i32 {
  let efgh = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256Hash2(efgh, abcd, wk)
  drop result
  return 0
}
```

### `Intrinsic.aarch64Sha256ScheduleUpdate0`

```silk signature
fn aarch64Sha256ScheduleUpdate0<V>(left: V, right: V) -> V
```

`sha256su0`: lane `i` is `W[i] + sigma0(W[i + 1])` over the eight lanes of `left` then `right`.

- Shapes, with the aarch64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha2`.
- Wrapper: [`sha256ScheduleUpdate0`](/docs/std/simd-aarch64#sha256ScheduleUpdate0) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("sha2")
unsafe fn sha256ScheduleUpdate0(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.aarch64Sha256ScheduleUpdate0<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256ScheduleUpdate0(left, right)
  drop result
  return 0
}
```

### `Intrinsic.aarch64Sha256ScheduleUpdate1`

```silk signature
fn aarch64Sha256ScheduleUpdate1<V>(partial: V, middle: V, last: V) -> V
```

`sha256su1`: the next four message words from the `sha256su0` result and the words eight and twelve before them.

- Shapes, with the aarch64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha2`.
- Wrapper: [`sha256ScheduleUpdate1`](/docs/std/simd-aarch64#sha256ScheduleUpdate1) in `silk/simd/aarch64`, which fall back to portable code where the feature is missing.

```silk check target=aarch64-unknown-linux-gnu
@features("sha2")
unsafe fn sha256ScheduleUpdate1(partial: simd<u32, 4>, middle: simd<u32, 4>, last: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.aarch64Sha256ScheduleUpdate1<simd<u32, 4>>(partial, middle, last)
}

pub fn main() -> i32 {
  let partial = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let middle = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let last = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha256ScheduleUpdate1(partial, middle, last)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Rounds4Stage0`

```silk signature
fn x86Sha1Rounds4Stage0<V>(abcd: V, wk: V) -> V
```

`sha1rnds4` with selector 0: four SHA-1 rounds of rounds 0 to 19 (Ch, K = 0x5a827999). `abcd` holds A, B, C and D in lanes 3 to 0, and `wk` holds W[t] + E, W[t+1], W[t+2] and W[t+3] the same way; the result is the new A, B, C and D.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Rounds4Stage0`](/docs/std/simd-x86#sha1Rounds4Stage0) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Rounds4Stage0(abcd: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Rounds4Stage0<simd<u32, 4>>(abcd, wk)
}

pub fn main() -> i32 {
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Rounds4Stage0(abcd, wk)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Rounds4Stage1`

```silk signature
fn x86Sha1Rounds4Stage1<V>(abcd: V, wk: V) -> V
```

`sha1rnds4` with selector 1: four rounds of rounds 20 to 39 (Parity, K = 0x6ed9eba1).

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Rounds4Stage1`](/docs/std/simd-x86#sha1Rounds4Stage1) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Rounds4Stage1(abcd: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Rounds4Stage1<simd<u32, 4>>(abcd, wk)
}

pub fn main() -> i32 {
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Rounds4Stage1(abcd, wk)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Rounds4Stage2`

```silk signature
fn x86Sha1Rounds4Stage2<V>(abcd: V, wk: V) -> V
```

`sha1rnds4` with selector 2: four rounds of rounds 40 to 59 (Maj, K = 0x8f1bbcdc).

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Rounds4Stage2`](/docs/std/simd-x86#sha1Rounds4Stage2) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Rounds4Stage2(abcd: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Rounds4Stage2<simd<u32, 4>>(abcd, wk)
}

pub fn main() -> i32 {
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Rounds4Stage2(abcd, wk)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Rounds4Stage3`

```silk signature
fn x86Sha1Rounds4Stage3<V>(abcd: V, wk: V) -> V
```

`sha1rnds4` with selector 3: four rounds of rounds 60 to 79 (Parity, K = 0xca62c1d6).

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Rounds4Stage3`](/docs/std/simd-x86#sha1Rounds4Stage3) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Rounds4Stage3(abcd: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Rounds4Stage3<simd<u32, 4>>(abcd, wk)
}

pub fn main() -> i32 {
  let abcd = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let wk = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Rounds4Stage3(abcd, wk)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1NextE`

```silk signature
fn x86Sha1NextE<V>(left: V, right: V) -> V
```

`sha1nexte`: lane 3 of `right` plus A of `left` (lane 3) rotated left by 30, with lanes 0 to 2 of `right`: the E of four rounds later added to the next message words.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1NextE`](/docs/std/simd-x86#sha1NextE) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1NextE(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1NextE<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1NextE(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Message1`

```silk signature
fn x86Sha1Message1<V>(left: V, right: V) -> V
```

`sha1msg1`: with W[0..3] in lanes 3 to 0 of `left` and W[4], W[5] in lanes 3 and 2 of `right`, lanes 3 to 0 are W[0]^W[2], W[1]^W[3], W[2]^W[4] and W[3]^W[5].

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Message1`](/docs/std/simd-x86#sha1Message1) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Message1(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Message1<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Message1(left, right)
  drop result
  return 0
}
```

### `Intrinsic.x86Sha1Message2`

```silk signature
fn x86Sha1Message2<V>(left: V, right: V) -> V
```

`sha1msg2`: the next four SHA-1 message words from the partial sums in `left` and W[13..15] in lanes 2 to 0 of `right`.

- Shapes, with the x86_64 feature each needs: `simd<u32, 4>`, `simd<u32, 4>` to `simd<u32, 4>` with `sha`.
- Wrapper: [`sha1Message2`](/docs/std/simd-x86#sha1Message2) in `silk/simd/x86`, which fall back to portable code where the feature is missing.

```silk check target=x86_64-unknown-linux-gnu
@features("sha")
unsafe fn sha1Message2(left: simd<u32, 4>, right: simd<u32, 4>) -> simd<u32, 4> {
  return Intrinsic.x86Sha1Message2<simd<u32, 4>>(left, right)
}

pub fn main() -> i32 {
  let left = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let right = Intrinsic.simdSplat<simd<u32, 4>>(1)
  let result = unsafe sha1Message2(left, right)
  drop result
  return 0
}
```
