# Intrinsics

`Intrinsic` is the compiler-provided namespace of primitive operations and types. The whole namespace is public: any module may use any member. Some members are unsafe. Most programs reach them through standard library wrappers. This page also covers directives, the `@name` lines that tell the compiler how to build a function.

## Syntax

```
IntrinsicPath   = 'Intrinsic' '.' Name
IntrinsicCall   = 'unsafe'? 'Intrinsic' '.' Name TypeArguments? '(' Arguments? ')'
IntrinsicImport = 'import' 'Intrinsic' '.' Name
Directive       = '@' Name ( '(' ( DirectiveArg ( ',' DirectiveArg )* ','? )? ')' )?
DirectiveArg    = ( Name ':' )? DirectiveLit
DirectiveLit    = TextLiteral | '-'? DecimalInteger | 'true' | 'false' | '(' ( DirectiveLit ( ',' DirectiveLit )* ','? )? ')'
```

## The namespace

- `Intrinsic` needs no import. It is visible in every module.
- Importing it is MOD0004. Any import whose path starts with `Intrinsic`, such as `import Intrinsic { replace }`, prints ``Module Intrinsic cannot be imported: `Intrinsic` is reserved for compiler intrinsics, which are written `Intrinsic.<name>` without an import``. The one importable module is `Intrinsic.application`, below.
- No declaration can take the name: `struct Intrinsic {}` is a binding conflict (SEM0016).
- Members are fixed by the compiler. An unknown member name is SEM0010.
- A member is a value (called like a function), a type, or a property used as a bound.
- Type arguments are never inferred. Write exactly the number the member takes, or it is SEM0051: `Intrinsic.pointerFromMutRef<i32>(&mut v)`.
- A call's result converts to an annotated binding, a parameter or a declared result like any other value: `let p: ?*const i32 = Intrinsic.pointerNull<i32>()`.

## Value members by category

| Category | Count | Members |
| --- | --: | --- |
| Scalar operations | 618 | `<scalar><Operation>`, see below |
| Pointers | 22 | `pointerFromRef`, `pointerFromMutRef`, `pointerFromSlice`, `pointerFromMutSlice`, `pointerAt`, `pointerAtMut`, `pointerRead`, `pointerWrite`, `pointerReadUnaligned`, `pointerWriteUnaligned`, `pointerRequalify`, `pointerReinterpret`, `pointerBytes`, `pointerAddress`, `pointerIsNull`, `pointerNull`, `pointerNullFunction`, `pointerTake`, `pointerBorrow`, `pointerBorrowMut`, `pointerBorrowMany`, `pointerBorrowManyMut` |
| SIMD vectors | 46 | `simdSplat`, `simdFromArray`, `simdToArray`, `simdExtract`, `simdInsert`, `simdLoad`, `simdStore`, `simdPointerLoad`, `simdPointerStore`, `simdLanesEqual` and the other `simdLanes*` comparisons, `simdSelect`, `simdMinimum`, `simdMaximum`, `simdShuffle`, `simdWrapping*`, `simdSaturating*`, `simdShift*`, `simdRotate*`, `simdSqrt`, `simdMulAdd`, `simdReduce*`, `simdMask*`, `simdConvert`, `simdBitcast` |
| Architecture operations | 31 | `x86ShuffleBytes`, `x86MultiplyAddBytes`, `x86MultiplyAddWords`, `x86PackUnsignedSaturate`, `x86PackSignedSaturate`, `x86SumAbsoluteDifferences`, `x86AesEncrypt`, `x86AesEncryptLast`, `x86AesDecrypt`, `x86AesDecryptLast`, `x86AesInverseMixColumns`, `x86CarrylessMultiply`, `x86Sha256Rounds2`, `x86Sha256Message1`, `x86Sha256Message2`, `aarch64TableLookup`, `aarch64DotProduct`, `aarch64PairwiseAdd`, `aarch64AesEncrypt`, `aarch64AesDecrypt`, `aarch64AesMixColumns`, `aarch64AesInverseMixColumns`, `aarch64Sha256Hash`, `aarch64Sha256Hash2`, `aarch64Sha256ScheduleUpdate0`, `aarch64Sha256ScheduleUpdate1`, `wasmSwizzle`, `wasmRelaxedSwizzle`, `wasmDot`, `wasmNarrowUnsigned`, `wasmNarrowSigned` |
| Atomics | 13 | `atomicLoad`, `atomicStore`, `atomicSwap`, `atomicCompareExchange`, `atomicCompareExchangeWeak`, `atomicFetchAdd`, `atomicFetchSubtract`, `atomicFetchBitAnd`, `atomicFetchBitOr`, `atomicFetchBitXor`, `atomicFetchMinimum`, `atomicFetchMaximum`, `atomicFence` |
| Allocation and raw storage | 17 | `layoutOf`, `systemAllocationAcquire`, `allocationAdopt`, `rawBufferEmpty`, `rawBufferFrom`, `rawBufferSlot`, `rawBufferCount`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `slotAddress` |
| Shared ownership | 4 | `sharedLayout`, `sharedFromAllocation`, `sharedClone`, `sharedWithMut` |
| Execution | 11 | `executionLayout`, `executionFromAllocation`, `executionDrive`, `relinquish`, `executionCurrent`, `executionRefOf`, `executionLoad`, `executionStore`, `executionCompareExchange`, `executionNotify`, `executionLive` |
| Effect composition | 8 | `bindRequirement`, `bindRequirementMut`, `bindRequirementOwned`, `catchFailure`, `suspendEffect`, `finalizeEffect`, `finalizeEffectNonParking`, `useReleaseNonParking` |
| Text and slices | 5 | `stringUtf8Bytes`, `stringFromUtf8Unchecked`, `stringByteLength`, `stringEqualsExact`, `sliceView` |
| Places | 3 | `replace`, `borrowField`, `borrowFieldMut` |
| Target queries | 7 | `targetPointerBits`, `targetPointerAlignment`, `targetArchitecture`, `targetOperatingSystem`, `targetAbi`, `targetObjectFormat`, `targetEndianness` |
| Profile queries | 3 | `profileText`, `profileFlag`, `profileContains` |
| Static text | 4 | `staticTextByteLength`, `staticTextByteAt`, `staticTextConcat`, `staticTextSlice` |
| Static sequences | 5 | `staticSequenceEmpty`, `staticSequenceAppend`, `staticSequenceConcat`, `staticSequenceLength`, `staticSequenceAt` |
| Reflection | 11 | `reflectType`, `reflectTypeKind`, `reflectFields`, `reflectFieldKind`, `reflectFieldLabel`, `reflectFieldOrdinal`, `reflectVariants`, `reflectVariantLabel`, `reflectVariantFields`, `makeVariant`, `isVariant` |
| Tests | 3 | `tests`, `testInfo`, `testFunction` |
| Diagnostics | 3 | `observeUnhandled`, `observeHandled`, `observeDiagnostics` |
| Traps | 1 | `trap` |
| Machine code and stack | 3 | `assembly`, `frameAddress`, `stackAllocate` |
| Enums | 1 | `enumValue` |

The inventory holds 829 members: 628 scalar operations and the 201 in the table.

## Scalar operations

A scalar operation is named by a scalar type followed by an operation: `i32WrappingAdd`, `u64ShiftLeft`, `f64Sqrt`, `usizeCheckedToU8`.

| Kind | Count | Operations |
| --- | --: | --- |
| Arithmetic | 67 | `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate` |
| Multiply high | 10 | `MultiplyHigh`: the high half of the double-width product, for every integer type |
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
- Each integer module (`silk/num/i32`, `silk/num/u64`, ...) wraps these as ordinary functions such as `i32.checkedAdd` and `i32.toU8`.

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

- The `silk/simd/simd` modules wrap these for the 128-bit and 256-bit shapes. Other admitted shapes, such as `simd<u8, 64>` or `simd<u32, 2>`, are reachable only here. The types, operators and modules are in Values and primitive types, under SIMD vectors and masks.

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
| `x86AesEncrypt`, `x86AesEncryptLast` | `aesenc`, `aesenclast` | `simd<u64, 2>` state and round key (aes) | same shape |
| `x86AesDecrypt`, `x86AesDecryptLast` | `aesdec`, `aesdeclast` | `simd<u64, 2>` state and round key (aes) | same shape |
| `x86AesInverseMixColumns` | `aesimc` | one `simd<u64, 2>` (aes) | same shape |
| `x86CarrylessMultiply` | `pclmulqdq` with selector 0 | `simd<u64, 2>` (pclmul) | same shape |
| `x86Sha256Rounds2` | `sha256rnds2` | three `simd<u32, 4>`: `cdgh`, `abef`, `wk` (sha) | same shape |
| `x86Sha256Message1`, `x86Sha256Message2` | `sha256msg1`, `sha256msg2` | `simd<u32, 4>` (sha) | same shape |
| `aarch64TableLookup` | `tbl` | `simd<u8, 16>` (neon) | same shape |
| `aarch64DotProduct` | `udot`, `sdot` | `simd<u32, 4>` sum with two `simd<u8, 16>`, or `simd<i32, 4>` with two `simd<i8, 16>` (dotprod) | the sum's shape |
| `aarch64PairwiseAdd` | `addp` | `simd<u8, 16>`, `simd<u16, 8>`, `simd<u32, 4>` (neon) | same shape |
| `aarch64AesEncrypt`, `aarch64AesDecrypt` | `aese`, `aesd` | `simd<u8, 16>` state and round key (aes) | same shape |
| `aarch64AesMixColumns`, `aarch64AesInverseMixColumns` | `aesmc`, `aesimc` | one `simd<u8, 16>` (aes) | same shape |
| `aarch64Sha256Hash`, `aarch64Sha256Hash2` | `sha256h`, `sha256h2` | three `simd<u32, 4>` (sha2) | same shape |
| `aarch64Sha256ScheduleUpdate0` | `sha256su0` | `simd<u32, 4>` (sha2) | same shape |
| `aarch64Sha256ScheduleUpdate1` | `sha256su1` | three `simd<u32, 4>` (sha2) | same shape |
| `wasmSwizzle` | `i8x16.swizzle` | `simd<u8, 16>` (simd128) | same shape |
| `wasmRelaxedSwizzle` | `i8x16.relaxed_swizzle` | `simd<u8, 16>` (relaxed-simd) | same shape |
| `wasmDot` | `i32x4.dot_i16x8_s` | `simd<i16, 8>` (simd128) | `simd<i32, 4>` |
| `wasmNarrowUnsigned` | `i8x16.narrow_i16x8_u` | `simd<i16, 8>` (simd128) | `simd<u8, 16>` |
| `wasmNarrowSigned` | `i8x16.narrow_i16x8_s` | `simd<i16, 8>` (simd128) | `simd<i8, 16>` |

- Most take two operands. `x86AesInverseMixColumns`, `aarch64AesMixColumns` and `aarch64AesInverseMixColumns` take one. `aarch64DotProduct` takes three, the sum first and then two byte vectors: `Intrinsic.aarch64DotProduct<simd<u32, 4>>(sum, left, right)`. `x86Sha256Rounds2`, `aarch64Sha256Hash`, `aarch64Sha256Hash2` and `aarch64Sha256ScheduleUpdate1` take three as well.
- The x86 AES members take the 16-byte state as `simd<u64, 2>`; the AArch64 ones take `simd<u8, 16>`. An x86 encryption round is `aesenc` alone; an AArch64 round is `aesmc` of `aese`, because `aese` adds the key first and stops before MixColumns.
- The two SHA-256 sets hold the eight working variables differently. On x86, `abef` holds A, B, E and F in lanes 3, 2, 1 and 0, `cdgh` holds C, D, G and H the same way, and one `sha256rnds2` does two rounds with the two message-plus-constant words in lanes 0 and 1 of `wk`; it returns the new `abef`, and the old `abef` becomes the new `cdgh`. On AArch64, `abcd` and `efgh` hold the variables in lane order, and `sha256h` and `sha256h2` do four rounds with all four lanes of `wk`, returning the new `abcd` and `efgh`. Give `sha256h2` the `abcd` from before the `sha256h` call.
- For the message schedule, `x86Sha256Message1` and `aarch64Sha256ScheduleUpdate0` compute `W[i] + sigma0(W[i + 1])` for four words. On x86 the caller adds `W[9..12]` before `x86Sha256Message2`; `aarch64Sha256ScheduleUpdate1` takes those words itself.
- A call is admitted only when the selected target is the member's architecture and the feature is enabled, either by the profile (see Targets and profiles) or by the `@features` directive of the function that makes the call (below). A feature counts when an enabled feature implies it: `avx2` admits the `ssse3` and `sse4.1` shapes. On arm64, `crypto` admits the `aes` and `sha2` members.
- Otherwise the call is SEM0241. With the default x86-64 profile, which has SSE2 but not SSSE3, `Intrinsic.x86ShuffleBytes<simd<u8, 16>>(a, a)` prints "Intrinsic.x86ShuffleBytes needs x86_64 with ssse3, which this profile does not select; guard it with `static if Target.hasCpuFeature(...)` or list the feature in the function's `@features(...)` directive". An AArch64 member on x86-64 prints "needs aarch64 with neon".
- Code for several targets puts each call under a `static if` on `Target.arch()` and `Target.hasCpuFeature`, or in a function with `@features`.
- A shape the member does not take is SEM0239 at the call, and the message lists the shapes it takes: `x86ShuffleBytes<simd<u16, 8>>` prints ``Intrinsic.x86ShuffleBytes takes a first operand of simd<u8, 16> or simd<u8, 32>, but simd<u16, 8> is not one``. The shape is checked before the target and features, so this is reported on any target.
- `silk/simd/x86`, `silk/simd/aarch64` and `silk/simd/wasm` wrap each member in a function that compiles to the instruction where the profile enables it and to portable code everywhere else. See Values and primitive types, under SIMD vectors and masks.

## Type members

| Category | Members |
| --- | --- |
| Storage types | `Allocation`, `RawBuffer<T>`, `Slot<'storage, T>`, `SharedCore<T>`, `StorageFailure`, `Execution<A>`, `ExecutionRef` |
| Static-only types | `Type<Owner>`, `Field<Owner, Value>`, `Fields<Owner>`, `Variant<Union>`, `Variants<Union>`, `StaticSequence`, `Test`, `Tests`, `TestInfo` |
| Ownership properties | `Copy`, `Drop` |
| Execution properties | `NonParking`, `Detached` (used as bounds) |
| Operator interfaces | `Add`, `Subtract`, `Multiply`, `Divide`, `Remainder`, `Negate`, `BitAnd`, `BitOr`, `BitXor`, `BitNot`, `Not`, `Equal`, `Order`, and the enum `Ordering` |
| Module | `application`, imported by entry modules as `import Intrinsic.application` |

- `impl Intrinsic.Copy for T {}` and `impl Copy for T {}` (with `Copy` from `silk/core/ownership`) are the same conformance. The same holds for `Drop`.

## Directives

A directive is a line such as `@inline` or `@features("avx2")` written before a declaration. It tells the compiler how to build that function, never what the function means. The table is closed: no source declares a directive, an argument is a literal, and no static evaluation or reflection can see one. Directives replaced the `with Intrinsic.*(...)` clauses of earlier releases.

| Directive | Arguments | Goes on | Class |
| --- | --- | --- | --- |
| `@inline` | none | a function with a Silk body | hint |
| `@inlineAlways` | none | a function with a Silk body | hint |
| `@inlineNever` | none | a function with a Silk body | hint |
| `@cold` | none | a function with a Silk body | hint |
| `@nonParking` | none | a function with a Silk body, or a service or interface operation | checked contract |
| `@features("avx2", ...)` | CPU feature names | an `unsafe fn` with a Silk body | target |
| `@foreign(memory:, locality:, noCapture:)` | named, each at most once | an `extern "C"` or `export "C"` function, or a foreign function type | optimizer fact |
| `@callbacks("compare", ...)` | parameter paths | an `extern "C"` or `export "C"` function | checked contract |
| `@threadCallbacks("routine", ...)` | parameter paths | an `extern "C"` or `export "C"` function | checked contract |
| `@deferredCallbacks("info.callback", ...)` | parameter paths | an `extern "C"` or `export "C"` function | checked contract |
| `@invokesDeferredCallbacks` | none | an `extern "C"` or `export "C"` function | checked contract |
| `@naked` | none | an `extern "C"` or `export "C"` function | codegen shape |
| `@noReturn` | none | an `extern "C"` or `export "C"` function | codegen shape |

The class says what removing the directive does. Removing a hint leaves the same program. Removing an optimizer fact leaves the same behavior with fewer optimizations. Removing a checked contract leaves the same runtime behavior, but some uses may stop compiling. Removing a target directive gives the same results in slower code. A codegen shape describes a body written for that shape, so removing it breaks the body.

- Write each directive on its own line before the declaration, after any `///` doc comment or before it. Both attach, for the compiler and for `silk doc`. Order does not matter. `silk format` puts each directive on its own line.
- In a service, interface or `impl` body, a directive goes before the member: `@nonParking effect fn close() -> ()` on two lines.
- A foreign function type takes `@foreign` before `extern`: `@foreign(memory: "none") extern "C" fn(i32) -> i32`.
- Arguments are literals: text, decimal integers, `true`, `false`, and parenthesized tuples of them. `@features("avx2", "bmi2")` and `@features(("avx2", "bmi2"))` mean the same. A name or a call in an argument is a parse error (PAR0002) at the name, and the directive is not reported again.
- `@inline`, `@inlineAlways`, `@inlineNever` and `@cold` ask for inlining and code layout. `@cold` keeps the function out of line and lays out the branches that reach it as unlikely. A function takes at most one of the four.
- `@nonParking` makes every call owe a proof that the callee never parks its thread. On a function or an operation, a body that can park is SEM0139 at each call that enters it, when `silk build` checks it. See Suspension and cancellation.
- `@foreign`, the callback directives, `@naked` and `@noReturn` are described in Unsafe code and C interop. `@naked @noReturn` appears only on startup entry points in the standard library.
- An unknown directive, an argument the directive does not take, or a repeated named argument is SEM0235 at the directive: "This directive, or one of its arguments, is not one the language defines". Examples: `@bogus`, `@detached`, `@nonParking(strict: true)`, `@foreign(bogus: 1)`.
- A known directive on a declaration that does not take it is SEM0236 at the directive: "This directive is not allowed here; `@inline`, `@inlineAlways`, `@inlineNever`, `@cold` and `@features` apply only to runtime functions with a Silk body, `@nonParking` also to service operations, and `@foreign`, `@callbacks`, `@threadCallbacks`, `@deferredCallbacks`, `@invokesDeferredCallbacks`, `@naked` and `@noReturn` only to `extern "C"` or `export "C"` functions". Examples: `@naked` on a plain function, `@inline` on a service operation or a struct, `@features` on an `export "C"` function, and any directive on a `static fn`. SEM0235 takes precedence.
- A directive before an `import` or a `static if` is a parse error at the `@` (PAR0002), with no other error.
- On a function with a Silk body or an operation, the same directive twice, or two of the inline hints, is SEM0250 at the second one. `@inline` twice prints ``error[SEM0250] `@inline` is written twice on this declaration; keep one``, and `@cold` then `@inlineNever` prints ``error[SEM0250] `@inlineNever` cannot be written with `@cold`: a function takes at most one of `@inline`, `@inlineAlways`, `@inlineNever` and `@cold` ``.
- A leftover `with` clause is PAR0011 at the clause. The message names the directive to write: `fn work() -> i32 with Intrinsic.inline() { return 1 }` prints ``Silk has no `with` clauses; write `@inline` on the line before the declaration``. For `with Intrinsic.foreign(...)` and `with Intrinsic.machine(...)` it lists the directives that replace each field. `module with ...` is gone and is PAR0011 too; delete the line, since a module takes no directives.

## Functions compiled for CPU features

`@features("avx2")` compiles one function for CPU features that the profile does not select. The rest of the program keeps the profile's features, so one binary runs everywhere and takes the faster function only on a machine that has the features.

```
@features("avx2")
unsafe fn lookup(table: simd<u8, 32>, indices: simd<u8, 32>) -> simd<u8, 32> {
  return Intrinsic.x86ShuffleBytes<simd<u8, 32>>(table, indices)
}
```

- The arguments are text literals, one per feature: `@features("ssse3", "avx2")`. A name outside the target's feature catalog is SEM0242 at that name: `@features("neon")` on x86-64 prints "neon is not a CPU feature of x86_64-unknown-linux-gnu; `@features` lists text literals from the target's catalog". An empty list, `@features()`, is SEM0242 too: "`@features` lists no CPU feature; name at least one text literal from the catalog of x86_64-unknown-linux-gnu, or remove the directive". Level names such as `"x86-64-v3"` are models, not features.
- The function must be declared `unsafe fn`; otherwise SEM0243 at the declaration: "lookup enables CPU features, so it must be declared `unsafe fn`; each caller proves the CPU has them". Each call is an unsafe operation (SEM0082 outside `unsafe`). Running it on a machine without the features is undefined; check first with `CpuFeatures.detect()` from `silk/simd/cpu`.
- Free functions, methods, generic functions and effect functions take the directive. `@nonParking` and an inline hint may sit beside it. A closure takes no directive.
- The function is compiled with the listed features, the features they imply and the profile's features. Architecture members that need them are admitted in its body (SEM0241 otherwise). Functions it calls are compiled for the profile, unless the optimizer inlines them into it.
- `Target.hasCpuFeature` and the other static queries still read the profile inside the function. A `silk/simd/x86` or `silk/simd/aarch64` wrapper called from it takes its portable path unless the profile enables the feature; call the `Intrinsic` member directly instead.
- A `static if` on `Intrinsic.targetArchitecture()` keeps the function out of builds for other targets, where its features would be SEM0242.

## Unsafe members

- These members are unsafe: `pointerAt`, `pointerAtMut`, `pointerRead`, `pointerWrite`, `pointerReadUnaligned`, `pointerWriteUnaligned`, `pointerRequalify`, `pointerReinterpret`, `pointerBytes`, `pointerTake`, `pointerBorrow`, `pointerBorrowMut`, `pointerBorrowMany`, `pointerBorrowManyMut`, `simdPointerLoad`, `simdPointerStore`, `stackAllocate`, `assembly`.
- Every atomic member except `atomicFence` is unsafe. Each takes its memory order as a static string, such as `"acquire"`; an order or element type the operation does not admit is SEM0237.
- So are these storage members: `allocationAdopt`, `rawBufferFrom`, `rawBufferSlot`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `sharedFromAllocation`, `stringFromUtf8Unchecked`, `executionFromAllocation`.
- Call them inside `unsafe { }` or as `unsafe Intrinsic.member(...)`. Otherwise SEM0082.
- No other member is unsafe. Scalar operations, the other SIMD members, architecture members, target queries and reflection are safe. A function compiled for extra CPU features is unsafe to call; see Functions compiled for CPU features above.
- `allocationAdopt(base: *mut u8, layout: Layout, reclaim: extern "C" fn(?*mut u8) -> (), context: ?*mut u8)` returns an `Allocation` over storage that the caller manages. Dropping it calls `reclaim(context)` instead of returning memory to the system. `Arena` in `silk/mem/arena` uses it for each allocation it hands out.

## Traps, the stack and slice views

- `Intrinsic.trap(reason)` stops the program with a trap, as an overflow does. `reason` is a `string<'static>`, and the result type is `never`, so `return Intrinsic.trap("...")` ends a branch of any function. The runtime prints `fatal trap: <reason>` and the frame, and the process exits with status 132. The std lib uses it for precondition failures, such as `f32.toU8` of NaN.
- `Intrinsic.frameAddress()` returns the address of the running function's stack frame as `[*]const u8`. The stack grows down on every target, so a caller's frame is at the same or a higher address. It is safe to call; reading through the address is not.
- `unsafe Intrinsic.stackAllocate<T>(count)` returns `[*]mut T` storage for `count` values on the running function's stack. The storage is uninitialized, nothing in it is dropped, and it ends when the function returns or suspends. The caller proves it fits in the stack that is left; the compiler does not check. A byte size that overflows `usize` traps.
- `silk/mem/stack` wraps both: `Stack.frameAddress()` and `unsafe Stack.withStorage<T, A>(count, use)`, which calls `use` once with the storage.
- `Intrinsic.sliceView<T>(values, offset, length)` returns the subrange `offset..offset + length` with the same loan, and traps when it is out of range. Given a shared `&[T]` it returns `&[T]`. Given an exclusive `&mut [T]` that the caller moves in, as in `Intrinsic.sliceView<T>(move values, 1, 3)`, it returns an exclusive `&mut [T]`. Passing a `&mut [T]` binding without `move` is an error.
- `Intrinsic.pointerNullFunction<F>()` returns the null value of a nullable C function pointer type `F`, such as `?extern "C" fn(i32) -> ()`. See Unsafe code and C interop.

## Static-only members

- Target queries, profile queries, static text, static sequences, reflection descriptors (`reflectType`, `reflectFields`, `reflectVariants` and the queries on them), `tests` and `testInfo` exist only during static evaluation.
- `borrowField`, `borrowFieldMut`, `makeVariant` and `isVariant` run at runtime, but take their field or variant descriptor as a `static` argument.
- Use them in `const` initializers, `static if` conditions and `static fn` bodies. See Static evaluation.
- Using one in runtime code is SEM0176: `let bits = Intrinsic.targetPointerBits()` inside `main` prints "Intrinsic.targetPointerBits runs only during static evaluation, so runtime code cannot call it".
- `profileFlag(name)` returns `bool`. `profileText(name)` returns `string<'static>`.

## Target availability

- Some members exist only on some targets. A reachable member that the selected target does not provide is SEM0093.

## Prefer the standard library

The wrappers below give typed results and documented contracts. Use `Intrinsic` directly only when no wrapper fits.

| Intrinsic area | Wrapper |
| --- | --- |
| Scalar operations | `silk/num/i8` ... `silk/num/usize`, `silk/num/f32`, `silk/num/f64`, `silk/core/bool`, `silk/text/char` |
| `Copy`, `Drop` | `silk/core/ownership` |
| Operator interfaces | `silk/core/ops`, `silk/core/equal`, `silk/core/order` |
| Pointers | `silk/mem/pointer` |
| Atomics | `silk/concurrency/atomic` |
| SIMD vectors | `silk/simd/simd` and one module per shape, such as `silk/simd/u8x16` and `silk/simd/mask16` |
| Architecture operations | `silk/simd/x86`, `silk/simd/aarch64`, `silk/simd/wasm` |
| Stack frame and scratch storage | `silk/mem/stack` (`Stack.frameAddress()`, `Stack.withStorage`) |
| Allocation, raw storage | `silk/mem/allocator`, `silk/mem/arena`, `silk/mem/layout`, `silk/mem/raw_buffer`, `silk/mem/slot`, `silk/mem/box`, `silk/collections/list` |
| Shared ownership | `silk/mem/shared` |
| Execution | `silk/concurrency/execution` |
| Effect composition | `silk/core/effect` (`provide`, `provideMut`, `catch`, `catchAll`, finalizers) |
| Target queries | `silk/core/target` (`Target.arch()`, `Target.operatingSystem()`, `Target.hasCpuFeature(...)`, `pointerBits`) |
| CPU features of the running machine | `silk/simd/cpu` (`CpuFeatures.detect()`, `has`) |
| Profile queries | `silk/core/compilation` (`Compilation.libc()`, `debug`, ...) |
| Reflection | `silk/core/reflect` (`Reflect.typeOf`, `Reflect.fields`, `Reflect.typeKind`, ...) |
| Static text and sequences | `silk/core/static_text`, `silk/core/static_sequence` |
| `sliceView` | `silk/collections/slice` |
| Tests | `silk/testing/runner` |

## Examples

```silk
const pointerBits: u32 = Intrinsic.targetPointerBits()

pub fn main() -> i32 {
  let big: i32 = 2147483647
  let wrapped = Intrinsic.i32WrappingAdd(big, 1)
  if wrapped != -2147483648 {
    return 1
  }
  if pointerBits != 64 {
    return 2
  }
  let mut place = 5
  let old = Intrinsic.replace(place, 9)
  if old != 5 || place != 9 {
    return 3
  }
  let narrowed: u8 = Intrinsic.i32ToU8(44)
  if narrowed != 44 {
    return 4
  }
  static if Intrinsic.targetOperatingSystem() == "linux" {
    return 0
  }
  return 5
}
```

```silk
import silk.core.option { Option }

pub fn main() -> i32 {
  let big: i32 = 2147483647
  let sum = Intrinsic.i32CheckedAdd<Option<i32>>(big, 1, Option.some, Option.none)
  if let Option<i32>.Some { value } = move sum {
    return 1
  }
  let saturated = Intrinsic.i32SaturatingAdd(big, 1)
  if saturated != big {
    return 2
  }
  let shifted = Intrinsic.u32ShiftLeft(1, 4)
  if shifted != 16 {
    return 3
  }
  let narrow = Intrinsic.i32CheckedToU8<Option<u8>>(300, Option.some, Option.none)
  if let Option<u8>.Some { value } = move narrow {
    return 4
  }
  return 0
}
```

Ownership properties and an unsafe pointer member, without any import:

```silk
struct Point {
  x: i32,
  y: i32,
}

impl Intrinsic.Copy for Point {}

struct Counter {
  hits: *mut i32,
}

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

SIMD members on shapes that have no `silk/simd/simd` module, a 64-lane byte vector and a two-lane result:

```silk
pub fn main() -> i32 {
  let a = Intrinsic.simdFromArray<simd<u32, 4>>([1, 2, 3, 4])
  let pair = Intrinsic.simdShuffle<simd<u32, 4>, simd<u32, 2>>(a, a, [3, 0])
  if pair != Intrinsic.simdFromArray<simd<u32, 2>>([4, 1]) {
    return 1
  }
  let bytes = Intrinsic.simdSplat<simd<u8, 64>>(3)
  if Intrinsic.simdReduceAdd<simd<u8, 64>>(bytes) != 192 {
    return 2
  }
  let floats = Intrinsic.simdConvert<simd<u32, 4>, simd<f32, 4>>(a)
  let bits = Intrinsic.simdBitcast<simd<f32, 4>, simd<u32, 4>>(floats)
  if Intrinsic.simdExtract<simd<u32, 4>>(bits, 0) != 0x3F800000 {
    return 3
  }
  return 0
}
```

A function compiled for AVX2, called only after the running machine reports AVX2. The program builds for every target and exits with 0 on any x86-64 machine:

```silk
import silk.simd.cpu { CpuFeatures }

static if Intrinsic.targetArchitecture() == "x86_64" {
  // Compiled for AVX2, so the 32-byte pshufb is admitted. AVX2 implies SSSE3, so the
  // 16-byte form is admitted too.
  @features("avx2")
  unsafe fn lookup(table: simd<u8, 32>, indices: simd<u8, 32>) -> simd<u8, 32> {
    let low = Intrinsic.x86ShuffleBytes<simd<u8, 16>>(
      Intrinsic.simdSplat<simd<u8, 16>>(7),
      Intrinsic.simdSplat<simd<u8, 16>>(0)
    )
    if Intrinsic.simdExtract<simd<u8, 16>>(low, 0) != 7 {
      return table
    }
    return Intrinsic.x86ShuffleBytes<simd<u8, 32>>(table, indices)
  }
}

pub fn main() -> i32 {
  let machine = CpuFeatures.detect()
  static if Intrinsic.targetArchitecture() == "x86_64" {
    if CpuFeatures.has(&machine, "avx2") {
      let table = Intrinsic.simdFromArray<simd<u8, 32>>(
        [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          31,
        ]
      )

      // Each index picks within its own 16-byte half: lane 3, then lane 19.
      let picked = unsafe lookup(table, Intrinsic.simdSplat<simd<u8, 32>>(3))
      if Intrinsic.simdExtract<simd<u8, 32>>(picked, 0) != 3 {
        return 1
      }
      if Intrinsic.simdExtract<simd<u8, 32>>(picked, 16) != 19 {
        return 2
      }
    }
  }
  return 0
}
```

Two SHA-256 rounds with `sha256rnds2`, checked against the `silk/simd/x86` wrapper, which takes its portable path under the default profile. The program exits with 0 with or without SHA, and also builds for AArch64:

```silk
import silk.simd.x86
import silk.simd.cpu { CpuFeatures }
import silk.simd.u32x4

static if Intrinsic.targetArchitecture() == "x86_64" {
  // Compiled for SHA, so sha256rnds2 is admitted in this body.
  @features("sha")
  unsafe fn rounds(cdgh: simd<u32, 4>, abef: simd<u32, 4>, wk: simd<u32, 4>) -> simd<u32, 4> {
    return Intrinsic.x86Sha256Rounds2<simd<u32, 4>>(cdgh, abef, wk)
  }
}

pub fn main() -> i32 {
  // The SHA-256 initial state: A, B, E, F and C, D, G, H, highest lane first.
  let abef = u32x4.fromArray([0x9b05688c, 0x510e527f, 0xbb67ae85, 0x6a09e667])
  let cdgh = u32x4.fromArray([0x5be0cd19, 0x1f83d9ab, 0xa54ff53a, 0x3c6ef372])

  // Two message words plus their round constants in lanes 0 and 1.
  let wk = u32x4.fromArray([0x61626380 + 0x428a2f98, 0x71374491, 0, 0])
  let portable = x86.sha256Rounds2(cdgh, abef, wk)
  static if Intrinsic.targetArchitecture() == "x86_64" {
    let machine = CpuFeatures.detect()
    if CpuFeatures.has(&machine, "sha") && unsafe rounds(cdgh, abef, wk) != portable {
      return 1
    }
  }

  // After rounds 0 and 1 of the "abc" example in FIPS 180-4, A and B are these.
  if u32x4.extract(portable, 3) != 0x5a6ad9ad || u32x4.extract(portable, 2) != 0x5d6aebcd {
    return 2
  }
  return 0
}
```

An exclusive slice view, the stack, and a trap. The program ends with the trap:

```silk
import silk.mem.pointer { Pointer }

fn checked(divisor: i32) -> i32 {
  if divisor == 0 {
    return Intrinsic.trap("checked: the divisor is zero")
  }
  return 100 / divisor
}

fn middle(values: &mut [i32]) -> &mut [i32] {
  return Intrinsic.sliceView<i32>(move values, 1, 3)
}

fn deeper(level: i32) -> usize {
  if level == 0 {
    return Pointer.addressMany<u8>(Intrinsic.frameAddress())
  }
  return deeper(level - 1)
}

pub fn main() -> i32 {
  let mut values = [1, 2, 3, 4, 5]
  let view = middle(&mut values)
  view[0] = 20
  view[2] = 40
  if values[1] != 20 || values[3] != 40 {
    return 1
  }
  let top = Pointer.addressMany<u8>(Intrinsic.frameAddress())
  if deeper(8) >= top {
    return 2
  }
  unsafe {
    let scratch = Intrinsic.stackAllocate<i32>(4)
    Pointer.write<i32>(Pointer.atMut<i32>(scratch, 3), 7)
    if Pointer.read<i32>(Pointer.atMut<i32>(scratch, 3)) != 7 {
      return 3
    }
  }
  return checked(0)
}
```

```sh
silk run; echo "exit $?"
```

```
fatal trap: checked: the divisor is zero
  at main.checked (main:5:12)
exit 132
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0011 | A leftover `with Intrinsic.*(...)` clause or `module with ...`; write directives before the declaration |
| SEM0010 | Unknown member of a known namespace, such as `Intrinsic.bogus` |
| SEM0016 | Binding conflict, such as declaring a type named `Intrinsic` |
| SEM0051 | Wrong number of type arguments |
| SEM0082 | Unsafe member called outside unsafe authority |
| SEM0093 | Reachable intrinsic unavailable on the selected target |
| SEM0176 | Static-only member used in runtime code |
| SEM0215 | Invalid pointer qualifier conversion, such as `pointerRequalify` changing the pointee |
| SEM0235 | Unknown directive or directive argument, such as `@detached` or `@nonParking(strict: true)` |
| SEM0236 | Known directive on a declaration that does not take it, such as `@naked` on a plain function or `@features` on an `export "C"` one |
| SEM0237 | An atomic member with a memory order or element type it does not admit, such as `atomicStore` with `"acquire"` |
| SEM0239 | A SIMD or architecture member with a vector shape or lane type it does not admit, such as `simdSqrt<simd<u8, 16>>` or `x86ShuffleBytes<simd<u16, 8>>`, or vectors that differ in lane count, width or lane type where they must match |
| SEM0241 | An architecture member whose target or CPU feature is not enabled for the calling function |
| SEM0242 | An `@features` entry that names no CPU feature of the target, or an empty `@features` list |
| SEM0243 | A function with `@features` that is not declared `unsafe fn` |
| SEM0250 | The same directive twice on one declaration, or two inline hints |

## See also

Values and primitive types · Interfaces and impls · Ownership and moves · Unsafe code and C interop · Allocation and shared ownership · Static evaluation · Effects and run · Typed failures · Services and providers · Fibers and scheduling · `silk/core/ownership`, `silk/mem/pointer`, `silk/simd/simd`, `silk/simd/x86`, `silk/simd/aarch64`, `silk/simd/wasm`, `silk/simd/cpu`, `silk/core/reflect`, `silk/core/target`, `silk/core/compilation`, `silk/core/effect`

## Open questions

- `enumValue` is in the runtime intrinsic catalog, but no compiler or standard library code calls it. Its contract is unconfirmed.
- SEM0093 (intrinsic unavailable on the requested target) has no producer in the compiler.
- A repeated `@foreign` on an `extern "C"` function, such as `@foreign(memory: "none")` on two lines, passes `silk check`. `silk build` then stops at the declaration with `unsupported[foreign-contract] not supported by the native compiler yet` (exit status 2) instead of SEM0250.
- `@features(NAME)`, a name where a text literal belongs, is PAR0002 at the name, followed by SEM0242 "`@features` lists no CPU feature", although the directive did name one.
