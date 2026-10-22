# Intrinsics

`Intrinsic` is the compiler-provided namespace of primitive operations, types and properties. The whole namespace is public: any module may use any member. Some members are unsafe. Most programs reach them through standard library wrappers.

## Syntax

```
IntrinsicPath   = 'Intrinsic' '.' Name
IntrinsicCall   = 'unsafe'? 'Intrinsic' '.' Name TypeArguments? '(' Arguments? ')'
IntrinsicImport = 'import' 'Intrinsic' '.' Name
PropertyClause  = 'with' 'Intrinsic' '.' Name '(' ( Name ':' Expression ( ',' Name ':' Expression )* )? ')'
```

## The namespace

- `Intrinsic` needs no import. It is visible in every module.
- Importing it is MOD0004. Any import whose path starts with `Intrinsic`, such as `import Intrinsic { replace }`, prints ``Module Intrinsic cannot be imported: `Intrinsic` is reserved for compiler intrinsics, which are written `Intrinsic.<name>` without an import``. The one importable module is `Intrinsic.application`, below.
- No declaration can take the name: `struct Intrinsic {}` is a binding conflict (SEM0016).
- Members are fixed by the compiler. An unknown member name is SEM0010.
- A member is a value (called like a function), a type, or a property used in a `with` clause or a bound.
- Type arguments are never inferred. Write exactly the number the member takes, or it is SEM0051: `Intrinsic.pointerFromMutRef<i32>(&mut v)`.
- A call's result converts to an annotated binding, a parameter or a declared result like any other value: `let p: ?*const i32 = Intrinsic.pointerNull<i32>()`.

## Value members by category

| Category | Count | Members |
| --- | --: | --- |
| Scalar operations | 618 | `<scalar><Operation>`, see below |
| Pointers | 19 | `pointerFromRef`, `pointerFromMutRef`, `pointerFromSlice`, `pointerFromMutSlice`, `pointerAt`, `pointerAtMut`, `pointerRead`, `pointerWrite`, `pointerReadUnaligned`, `pointerWriteUnaligned`, `pointerRequalify`, `pointerReinterpret`, `pointerBytes`, `pointerAddress`, `pointerIsNull`, `pointerNull`, `pointerTake`, `pointerBorrow`, `pointerBorrowMut` |
| SIMD vectors | 46 | `simdSplat`, `simdFromArray`, `simdToArray`, `simdExtract`, `simdInsert`, `simdLoad`, `simdStore`, `simdPointerLoad`, `simdPointerStore`, `simdLanesEqual` and the other `simdLanes*` comparisons, `simdSelect`, `simdMinimum`, `simdMaximum`, `simdShuffle`, `simdWrapping*`, `simdSaturating*`, `simdShift*`, `simdRotate*`, `simdSqrt`, `simdMulAdd`, `simdReduce*`, `simdMask*`, `simdConvert`, `simdBitcast` |
| Architecture operations | 14 | `x86ShuffleBytes`, `x86MultiplyAddBytes`, `x86MultiplyAddWords`, `x86PackUnsignedSaturate`, `x86PackSignedSaturate`, `x86SumAbsoluteDifferences`, `aarch64TableLookup`, `aarch64DotProduct`, `aarch64PairwiseAdd`, `wasmSwizzle`, `wasmRelaxedSwizzle`, `wasmDot`, `wasmNarrowUnsigned`, `wasmNarrowSigned` |
| Atomics | 13 | `atomicLoad`, `atomicStore`, `atomicSwap`, `atomicCompareExchange`, `atomicCompareExchangeWeak`, `atomicFetchAdd`, `atomicFetchSubtract`, `atomicFetchBitAnd`, `atomicFetchBitOr`, `atomicFetchBitXor`, `atomicFetchMinimum`, `atomicFetchMaximum`, `atomicFence` |
| Allocation and raw storage | 16 | `layoutOf`, `systemAllocationAcquire`, `allocationAdopt`, `rawBufferFrom`, `rawBufferSlot`, `rawBufferCount`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `slotAddress` |
| Shared ownership | 4 | `sharedLayout`, `sharedFromAllocation`, `sharedClone`, `sharedWithMut` |
| Execution | 11 | `executionLayout`, `executionFromAllocation`, `executionDrive`, `relinquish`, `executionCurrent`, `executionRefOf`, `executionLoad`, `executionStore`, `executionCompareExchange`, `executionNotify`, `executionLive` |
| Effect composition | 8 | `bindRequirement`, `bindRequirementMut`, `bindRequirementOwned`, `catchFailure`, `suspendEffect`, `finalizeEffect`, `finalizeEffectNonParking`, `useReleaseNonParking` |
| Text and slices | 5 | `stringUtf8Bytes`, `stringFromUtf8Unchecked`, `stringByteLength`, `stringEqualsExact`, `sliceView` |
| Places | 2 | `replace`, `borrowField` |
| Target queries | 7 | `targetPointerBits`, `targetPointerAlignment`, `targetArchitecture`, `targetOperatingSystem`, `targetAbi`, `targetObjectFormat`, `targetEndianness` |
| Profile queries | 3 | `profileText`, `profileFlag`, `profileContains` |
| Static text | 4 | `staticTextByteLength`, `staticTextByteAt`, `staticTextConcat`, `staticTextSlice` |
| Static sequences | 5 | `staticSequenceEmpty`, `staticSequenceAppend`, `staticSequenceConcat`, `staticSequenceLength`, `staticSequenceAt` |
| Reflection | 6 | `reflectType`, `reflectTypeKind`, `reflectFields`, `reflectFieldKind`, `reflectFieldLabel`, `reflectFieldOrdinal` |
| Tests | 3 | `tests`, `testInfo`, `testFunction` |
| Diagnostics | 2 | `observeUnhandled`, `observeDiagnostics` |
| Machine code | 1 | `assembly` |

## Scalar operations

A scalar operation is named by a scalar type followed by an operation: `i32WrappingAdd`, `u64ShiftLeft`, `f64Sqrt`, `usizeCheckedToU8`.

| Kind | Count | Operations |
| --- | --: | --- |
| Arithmetic | 67 | `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate` |
| Wrapping | 35 | `WrappingAdd`, `WrappingSubtract`, `WrappingMultiply`, `WrappingNegate` |
| Saturating | 35 | `SaturatingAdd`, `SaturatingSubtract`, `SaturatingMultiply`, `SaturatingNegate` |
| Checked arithmetic | 50 | `CheckedAdd`, `CheckedSubtract`, `CheckedMultiply`, `CheckedDivide`, `CheckedRemainder` |
| Bits | 80 | `BitAnd`, `BitOr`, `BitXor`, `BitNot`, `ShiftLeft`, `ShiftRight`, `RotateLeft`, `RotateRight` |
| Comparison | 82 | `Equals`, `NotEquals`, `LessThan`, `LessOrEqual`, `GreaterThan`, `GreaterOrEqual`, `TotalOrder` (float) |
| Conversion | 150 | `To<Type>` between numeric types, `f32ToBits`, `f32FromBits` and `f64` forms, `charToU32`, `charFromU32` |
| Checked conversion | 100 | `CheckedTo<Type>` between integer types |
| Float classification | 12 | `IsNaN`, `IsInfinite`, `IsFinite`, `IsNormal`, `IsSubnormal`, `IsSignNegative` |
| Float math | 6 | `Sqrt`, `Sin`, `Cos` |
| Logical | 1 | `boolNot` |

- Integer scalars are `i8` to `i64`, `isize`, `u8` to `u64` and `usize`. Floats are `f32` and `f64`. `bool` and `char` have equality, comparison and conversion members.
- Negating members exist only for signed integers and floats. Wrapping, saturating and checked members exist only for integers.
- Plain `To<Type>` conversions trap when the value does not fit: `Intrinsic.i32ToU8(300)` traps with "arithmetic overflow".
- A checked member takes the result type `R` as its one type argument. After the operands it takes two functions that build `R` on success and on failure: `Intrinsic.i32CheckedAdd<Option<i32>>(a, b, Option.some, Option.none)`.
- Each integer module (`silk/i32`, `silk/u64`, ...) wraps these as ordinary functions such as `i32.checkedAdd` and `i32.toU8`.

## SIMD members

- Each takes the vector or mask type as its first type argument: `Intrinsic.simdSplat<simd<u32, 4>>(10)`. `simdShuffle`, `simdConvert` and `simdBitcast` take a second, the result type: `Intrinsic.simdShuffle<simd<u32, 4>, simd<u32, 2>>(a, a, [0, 1])`.
- `simdShuffle` may change the lane count: four-lane operands can give two or eight lanes. Its indices are static (SEM0176 otherwise) and below twice the operand lane count.
- `simdConvert` keeps the lane count; `simdBitcast` keeps the total width.
- A member used with type arguments it does not take is SEM0239, at the call. The message says which rule failed:

| Refusal | Message |
| --- | --- |
| Lanes the member does not take | ``Intrinsic.simdShiftLeft takes a SIMD vector with integer lanes, but simd<f32, 4> is not one``; `simdSqrt` asks for floating-point lanes, `simdMaskAny` for ``a mask`` |
| `simdConvert` between lane counts | ``Intrinsic.simdConvert needs simd<u8, 16> and simd<f32, 4> to have the same lane count, but they have 16 and 4`` |
| `simdBitcast` between widths | ``Intrinsic.simdBitcast needs simd<u32, 4> and simd<u32, 8> to have the same width in bits, but they have 128 and 256`` |
| `simdShuffle` to another lane type | ``Intrinsic.simdShuffle needs simd<u32, 4> and simd<i32, 4> to have the same lane type, but they have u32 and i32`` |
| `simdShuffle` index out of range | ``Intrinsic.simdShuffle needs 4 static lane indices, one per result lane, each below 8``, at the indices |

- The `silk/simd` modules wrap these for the 128-bit and 256-bit shapes. Other admitted shapes, such as `simd<u8, 64>` or `simd<u32, 2>`, are reachable only here. The types, operators and modules are in Values and primitive types, under SIMD vectors and masks.

## Architecture members

Each architecture member stands for one instruction of one target that the portable SIMD members don't express. It takes the operand vector type as its one type argument; the result type follows from it.

| Member | Instruction | Operands, with the feature each shape needs | Result |
| --- | --- | --- | --- |
| `x86ShuffleBytes` | `pshufb` | `simd<u8, 16>` (ssse3), `simd<u8, 32>` (avx2) | same shape |
| `x86MultiplyAddBytes` | `pmaddubsw` | `simd<u8, 16>` and `simd<i8, 16>` (ssse3), `simd<u8, 32>` and `simd<i8, 32>` (avx2) | `simd<i16, 8>`, `simd<i16, 16>` |
| `x86MultiplyAddWords` | `pmaddwd` | `simd<i16, 8>` (sse2), `simd<i16, 16>` (avx2) | `simd<i32, 4>`, `simd<i32, 8>` |
| `x86PackUnsignedSaturate` | `packuswb`, `packusdw` | `simd<i16, 8>` (sse2), `simd<i16, 16>` (avx2), `simd<i32, 4>` (sse4.1) | `simd<u8, 16>`, `simd<u8, 32>`, `simd<u16, 8>` |
| `x86PackSignedSaturate` | `packsswb`, `packssdw` | `simd<i16, 8>` (sse2), `simd<i32, 4>` (sse2) | `simd<i8, 16>`, `simd<i16, 8>` |
| `x86SumAbsoluteDifferences` | `psadbw` | `simd<u8, 16>` (sse2), `simd<u8, 32>` (avx2) | `simd<u64, 2>`, `simd<u64, 4>` |
| `aarch64TableLookup` | `tbl` | `simd<u8, 16>` (neon) | same shape |
| `aarch64DotProduct` | `udot`, `sdot` | `simd<u32, 4>` sum with two `simd<u8, 16>`, or `simd<i32, 4>` with two `simd<i8, 16>` (dotprod) | the sum's shape |
| `aarch64PairwiseAdd` | `addp` | `simd<u8, 16>`, `simd<u16, 8>`, `simd<u32, 4>` (neon) | same shape |
| `wasmSwizzle` | `i8x16.swizzle` | `simd<u8, 16>` (simd128) | same shape |
| `wasmRelaxedSwizzle` | `i8x16.relaxed_swizzle` | `simd<u8, 16>` (relaxed-simd) | same shape |
| `wasmDot` | `i32x4.dot_i16x8_s` | `simd<i16, 8>` (simd128) | `simd<i32, 4>` |
| `wasmNarrowUnsigned` | `i8x16.narrow_i16x8_u` | `simd<i16, 8>` (simd128) | `simd<u8, 16>` |
| `wasmNarrowSigned` | `i8x16.narrow_i16x8_s` | `simd<i16, 8>` (simd128) | `simd<i8, 16>` |

- All take two operands except `aarch64DotProduct`, which takes the sum first and then two byte vectors: `Intrinsic.aarch64DotProduct<simd<u32, 4>>(sum, left, right)`.
- A call is admitted only when the selected target is the member's architecture and the feature is enabled, either by the profile (see Targets and profiles) or by the `features` list of the function that makes the call (below). A feature counts when an enabled feature implies it: `avx2` admits the `ssse3` and `sse4.1` shapes.
- Otherwise the call is SEM0241. With the default x86-64 profile, which has SSE2 but not SSSE3, `Intrinsic.x86ShuffleBytes<simd<u8, 16>>(a, a)` prints "Intrinsic.x86ShuffleBytes needs x86_64 with ssse3, which this profile does not select; guard it with `static if Target.hasCpuFeature(...)` or list the feature in the function's `features`". An AArch64 member on x86-64 prints "needs aarch64 with neon".
- Code for several targets puts each call under a `static if` on `Target.arch()` and `Target.hasCpuFeature`, or in a function that lists the feature.
- A shape the member does not take is SEM0239 at the call, and the message lists the shapes it takes: `x86ShuffleBytes<simd<u16, 8>>` prints ``Intrinsic.x86ShuffleBytes takes a first operand of simd<u8, 16> or simd<u8, 32>, but simd<u16, 8> is not one``. The shape is checked before the target and features, so this is reported on any target.
- `silk/arch/x86`, `silk/arch/aarch64` and `silk/arch/wasm` wrap each member in a function that compiles to the instruction where the profile enables it and to portable code everywhere else. See Values and primitive types, under SIMD vectors and masks.

## Type and property members

| Category | Members |
| --- | --- |
| Storage types | `Allocation`, `RawBuffer<T>`, `Slot<'storage, T>`, `SharedCore<T>`, `StorageFailure`, `Execution<A>`, `ExecutionRef` |
| Static-only types | `Type<Owner>`, `Field<Owner, Value>`, `Fields<Owner>`, `StaticSequence`, `Test`, `Tests`, `TestInfo` |
| Ownership properties | `Copy`, `Drop` |
| Execution properties | `NonParking`, `Detached` (used as bounds) |
| Operator interfaces | `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate`, `BitAnd`, `BitOr`, `BitXor`, `BitNot`, `Not`, `Equal`, `Order`, and the enum `Ordering` |
| Property clauses | `with Intrinsic.foreign(...)`, `with Intrinsic.nonParking()`, `with Intrinsic.machine(...)` |
| Module | `application`, imported by entry modules as `import Intrinsic.application` |

- `impl Intrinsic.Copy for T {}` and `impl Copy for T {}` (with `Copy` from `silk/ownership`) are the same conformance. The same holds for `Drop`.
- `with Intrinsic.foreign(...)` describes foreign functions; see Unsafe code and C interop.
- `with Intrinsic.machine(naked: true, noReturn: true)` appears only on startup entry points in the standard library.
- `with Intrinsic.nonParking()` takes no fields. It is accepted on an ordinary function or service operation.
- The property vocabulary is closed: `Intrinsic.foreign(memory:, locality:, noCapture:, callbacks:)`, `Intrinsic.machine(naked:, noReturn:, features:)` and `Intrinsic.nonParking()`. A function or service operation header with any other property, or any other field, is SEM0235 at the clause, in both `silk check` and `silk build`. Examples: `with Intrinsic.detached()`, `with Intrinsic.nonParking(strict: true)`.
- `Intrinsic.foreign(...)` and `Intrinsic.machine(naked:, noReturn:)` apply only to `extern "C"` and `export "C"` functions. `Intrinsic.machine(features:)` applies only to other runtime functions, and only with no other field. Any other placement, such as `naked:` on a plain function, `features:` on an `export "C"` or `static` function, or either clause on an interface or service operation, is SEM0236 at the clause: "This property clause is not allowed on this declaration; `Intrinsic.foreign` and `Intrinsic.machine(naked:, noReturn:)` apply only to `extern "C"` or `export "C"` functions, and `Intrinsic.machine(features:)` only to other runtime functions".
- SEM0235 takes precedence: a clause with an unknown field, such as `Intrinsic.machine(naked: true, bogus: 1)` on a plain function, is SEM0235.

## Functions compiled for CPU features

`with Intrinsic.machine(features: ("avx2",))` compiles one function for CPU features that the profile does not select. The rest of the program keeps the profile's features, so one binary runs everywhere and takes the faster function only on a machine that has the features.

```
unsafe fn lookup(table: simd<u8, 32>, indices: simd<u8, 32>) -> simd<u8, 32> with Intrinsic.machine(features: ("avx2",)) {
  return Intrinsic.x86ShuffleBytes<simd<u8, 32>>(table, indices)
}
```

- The value is a tuple of text literals, `("ssse3", "avx2")`, or one literal, `"avx2"`. A name outside the target's feature catalog is SEM0242: `features: ("neon",)` on x86-64 prints "neon is not a CPU feature of x86_64-unknown-linux-gnu; `features` lists text literals from the target's catalog". A constant or any other non-literal entry is also SEM0242, with "a non-literal entry" in place of the name. An empty list, `features: ()`, is SEM0242 too: "`features` lists no CPU feature; name at least one text literal from the catalog of x86_64-unknown-linux-gnu, or remove the clause". Level names such as `"x86-64-v3"` are models, not features.
- The function must be declared `unsafe fn`; otherwise SEM0243 at the declaration: "safe enables CPU features, so it must be declared `unsafe fn`; each caller proves the CPU has them". Each call is an unsafe operation (SEM0082 outside `unsafe`). Running it on a machine without the features is undefined; check first with `CpuFeatures.detect()` from `silk/cpu`.
- Free functions, methods, generic functions and effect functions take the clause. `with Intrinsic.nonParking()` may sit beside it. A closure does not take a `with` clause.
- The function is compiled with the listed features, the features they imply and the profile's features. Architecture members that need them are admitted in its body (SEM0241 otherwise). Functions it calls are compiled for the profile, unless the optimizer inlines them into it.
- `Target.hasCpuFeature` and the other static queries still read the profile inside the function. A `silk/arch` wrapper called from it takes its portable path unless the profile enables the feature; call the `Intrinsic` member directly instead.
- A `static if` on `Intrinsic.targetArchitecture()` keeps the function out of builds for other targets, where its features would be SEM0242.

## Unsafe members

- These members are unsafe: `pointerAt`, `pointerAtMut`, `pointerRead`, `pointerWrite`, `pointerReadUnaligned`, `pointerWriteUnaligned`, `pointerRequalify`, `pointerReinterpret`, `pointerBytes`, `pointerTake`, `pointerBorrow`, `pointerBorrowMut`, `simdPointerLoad`, `simdPointerStore`, `assembly`.
- Every atomic member except `atomicFence` is unsafe. Each takes its memory order as a static string, such as `"acquire"`; an order or element type the operation does not admit is SEM0237.
- So are these storage members: `allocationAdopt`, `rawBufferFrom`, `rawBufferSlot`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `sharedFromAllocation`, `stringFromUtf8Unchecked`, `executionFromAllocation`.
- Call them inside `unsafe { }` or as `unsafe Intrinsic.member(...)`. Otherwise SEM0082.
- No other member is unsafe. Scalar operations, the other SIMD members, architecture members, target queries and reflection are safe. A function compiled for extra CPU features is unsafe to call; see Functions compiled for CPU features above.
- `allocationAdopt(base: *mut u8, layout: Layout, reclaim: extern "C" fn(?*mut u8) -> (), context: ?*mut u8)` returns an `Allocation` over storage that the caller manages. Dropping it calls `reclaim(context)` instead of returning memory to the system. `Arena` in `silk/arena` uses it for each allocation it hands out.

## Static-only members

- Target queries, profile queries, static text, static sequences, reflection descriptors, `tests` and `testInfo` exist only during static evaluation.
- Use them in `const` initializers, `static if` conditions and `static fn` bodies. See Static evaluation.
- Using one in runtime code is SEM0176: `let bits = Intrinsic.targetPointerBits()` inside `main` is rejected.
- `profileFlag(name)` returns `bool`. `profileText(name)` returns `string<'static>`.

## Target availability

- Some members exist only on some targets. A reachable member that the selected target does not provide is SEM0093.

## Prefer the standard library

The wrappers below give typed results and documented contracts. Use `Intrinsic` directly only when no wrapper fits.

| Intrinsic area | Wrapper |
| --- | --- |
| Scalar operations | `silk/i8` ... `silk/usize`, `silk/f32`, `silk/f64`, `silk/bool`, `silk/char` |
| `Copy`, `Drop` | `silk/ownership` |
| Operator interfaces | `silk/ops`, `silk/equal`, `silk/order` |
| Pointers | `silk/pointer` |
| Atomics | `silk/atomic` |
| SIMD vectors | `silk/simd` and one module per shape, such as `silk/simd/u8x16` and `silk/simd/mask16` |
| Architecture operations | `silk/arch/x86`, `silk/arch/aarch64`, `silk/arch/wasm` |
| Allocation, raw storage | `silk/allocator`, `silk/arena`, `silk/layout`, `silk/raw_buffer`, `silk/slot`, `silk/box`, `silk/list` |
| Shared ownership | `silk/shared` |
| Execution | `silk/execution` |
| Effect composition | `silk/effect` (`provide`, `provideMut`, `catch`, `catchAll`, finalizers) |
| Target queries | `silk/target` (`Target.arch()`, `Target.operatingSystem()`, `Target.hasCpuFeature(...)`, `pointerBits`) |
| CPU features of the running machine | `silk/cpu` (`CpuFeatures.detect()`, `has`) |
| Profile queries | `silk/compilation` (`Compilation.libc()`, `debug`, ...) |
| Reflection | `silk/reflect` (`Reflect.typeOf`, `Reflect.fields`, `Reflect.typeKind`, ...) |
| Static text and sequences | `silk/static_text`, `silk/static_sequence` |
| `sliceView` | `silk/slice` |
| Tests | `silk/test_runner` |

## Examples

```silk
const pointerBits: u32 = Intrinsic.targetPointerBits()

pub fn main() -> i32 {
  let big: i32 = 2147483647
  let wrapped = Intrinsic.i32WrappingAdd(big, 1)
  if wrapped != -2147483648 { return 1 }
  if pointerBits != 64 { return 2 }
  let mut place = 5
  let old = Intrinsic.replace(place, 9)
  if old != 5 || place != 9 { return 3 }
  let narrowed: u8 = Intrinsic.i32ToU8(44)
  if narrowed != 44 { return 4 }
  static if Intrinsic.targetOperatingSystem() == "linux" {
    return 0
  }
  return 5
}
```

```silk
import silk.option { Option }

pub fn main() -> i32 {
  let big: i32 = 2147483647
  let sum = Intrinsic.i32CheckedAdd<Option<i32>>(big, 1, Option.some, Option.none)
  if let Option<i32>.Some {value} = move sum { return 1 }
  let saturated = Intrinsic.i32SaturatingAdd(big, 1)
  if saturated != big { return 2 }
  let shifted = Intrinsic.u32ShiftLeft(1, 4)
  if shifted != 16 { return 3 }
  let narrow = Intrinsic.i32CheckedToU8<Option<u8>>(300, Option.some, Option.none)
  if let Option<u8>.Some {value} = move narrow { return 4 }
  return 0
}
```

Ownership properties and an unsafe pointer member, without any import:

```silk
struct Point { x: i32 y: i32 }
impl Intrinsic.Copy for Point {}

struct Counter { hits: *mut i32 }
impl Intrinsic.Drop for Counter {
  fn drop(self: &mut Counter) -> () {
    unsafe Intrinsic.pointerWrite<i32>(self.hits, 1)
  }
}

fn twice<T: Intrinsic.Copy>(value: T) -> i32 {
  let first = value
  let second = value
  return 2
}

pub fn main() -> i32 {
  let p = Point { x: 1, y: 2 }
  let q = p
  let mut hits = 0
  let guard = Counter { hits: Intrinsic.pointerFromMutRef<i32>(&mut hits) }
  drop guard
  return twice(p) + p.x + q.y + hits - 6
}
```

SIMD members on shapes that have no `silk/simd` module, a 64-lane byte vector and a two-lane result:

```silk
pub fn main() -> i32 {
  let a = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let pair = Intrinsic.simdShuffle<simd<u32, 4>, simd<u32, 2>>(a, a, [3, 0])
  if pair != Intrinsic.simdFromArray<simd<u32, 2>>([4, 1]) { return 1 }
  let bytes = Intrinsic.simdSplat<simd<u8, 64>>(3)
  if Intrinsic.simdReduceAdd<simd<u8, 64>>(bytes) != 192 { return 2 }
  let floats = Intrinsic.simdConvert<simd<u32, 4>, simd<f32, 4>>(a)
  let bits = Intrinsic.simdBitcast<simd<f32, 4>, simd<u32, 4>>(floats)
  if Intrinsic.simdExtract<simd<u32, 4>>(bits, 0) != 0x3F800000 { return 3 }
  return 0
}
```

A function compiled for AVX2, called only after the running machine reports AVX2. The program builds for every target and exits with 0 on any x86-64 machine:

```silk
import silk.cpu { CpuFeatures }

static if Intrinsic.targetArchitecture() == "x86_64" {
  // Compiled for AVX2, so the 32-byte pshufb is admitted. AVX2 implies SSSE3, so the
  // 16-byte form is admitted too.
  unsafe fn lookup(table: simd<u8, 32>, indices: simd<u8, 32>) -> simd<u8, 32> with Intrinsic.machine(features: ("avx2",)) {
    let low = Intrinsic.x86ShuffleBytes<simd<u8, 16>>(Intrinsic.simdSplat<simd<u8, 16>>(7), Intrinsic.simdSplat<simd<u8, 16>>(0))
    if Intrinsic.simdExtract<simd<u8, 16>>(low, 0) != 7 { return table }
    return Intrinsic.x86ShuffleBytes<simd<u8, 32>>(table, indices)
  }
}

pub fn main() -> i32 {
  let machine = CpuFeatures.detect()
  static if Intrinsic.targetArchitecture() == "x86_64" {
    if CpuFeatures.has(&machine, "avx2") {
      let table = Intrinsic.simdFromArray<simd<u8, 32>>([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ])
      // Each index picks within its own 16-byte half: lane 3, then lane 19.
      let picked = unsafe lookup(table, Intrinsic.simdSplat<simd<u8, 32>>(3))
      if Intrinsic.simdExtract<simd<u8, 32>>(picked, 0) != 3 { return 1 }
      if Intrinsic.simdExtract<simd<u8, 32>>(picked, 16) != 19 { return 2 }
    }
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0010 | Unknown member of a known namespace, such as `Intrinsic.bogus` |
| SEM0016 | Binding conflict, such as declaring a type named `Intrinsic` |
| SEM0051 | Wrong number of type arguments |
| SEM0082 | Unsafe member called outside unsafe authority |
| SEM0093 | Reachable intrinsic unavailable on the selected target |
| SEM0176 | Static-only member used in runtime code |
| SEM0215 | Invalid pointer qualifier conversion, such as `pointerRequalify` changing the pointee |
| SEM0235 | Unknown property or property field in a `with Intrinsic.*` clause, such as `with Intrinsic.detached()` |
| SEM0236 | Known property on a declaration that does not take it, such as `Intrinsic.machine(naked: true)` on a plain function or `Intrinsic.machine(features:)` on an `export "C"` one |
| SEM0237 | An atomic member with a memory order or element type it does not admit, such as `atomicStore` with `"acquire"` |
| SEM0239 | A SIMD or architecture member with a vector shape or lane type it does not admit, such as `simdSqrt<simd<u8, 16>>` or `x86ShuffleBytes<simd<u16, 8>>`, or vectors that differ in lane count, width or lane type where they must match |
| SEM0241 | An architecture member whose target or CPU feature is not enabled for the calling function |
| SEM0242 | A `features` entry that is not a text literal naming a CPU feature of the target, or an empty `features` list |
| SEM0243 | A function with `features` that is not declared `unsafe fn` |

## See also

Values and primitive types · Interfaces and impls · Ownership and moves · Unsafe code and C interop · Allocation and shared ownership · Static evaluation · Effects and run · Typed failures · Services and providers · Fibers and scheduling · `silk/ownership`, `silk/pointer`, `silk/simd`, `silk/arch/x86`, `silk/arch/aarch64`, `silk/arch/wasm`, `silk/cpu`, `silk/reflect`, `silk/target`, `silk/compilation`, `silk/effect`

## Open questions

- `enumValue` is in the runtime intrinsic catalog, but no compiler or standard library code calls it. Its contract is unconfirmed.
- SEM0093 (intrinsic unavailable on the requested target) has no producer in the compiler.
- Inside a runtime function, the SEM0176 message names the target as "unselected-target": "Intrinsic.targetOperatingSystem is not available during static evaluation for unselected-target".
