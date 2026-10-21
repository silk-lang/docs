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
| Atomics | 13 | `atomicLoad`, `atomicStore`, `atomicSwap`, `atomicCompareExchange`, `atomicCompareExchangeWeak`, `atomicFetchAdd`, `atomicFetchSubtract`, `atomicFetchBitAnd`, `atomicFetchBitOr`, `atomicFetchBitXor`, `atomicFetchMinimum`, `atomicFetchMaximum`, `atomicFence` |
| Allocation and raw storage | 15 | `layoutOf`, `systemAllocationAcquire`, `rawBufferFrom`, `rawBufferSlot`, `rawBufferCount`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `slotAddress` |
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
- `with Intrinsic.nonParking()` takes no fields. On an ordinary function or service operation it is the only accepted property.
- The property vocabulary is closed: `Intrinsic.foreign(memory:, locality:, noCapture:, callbacks:)`, `Intrinsic.machine(naked:, noReturn:)` and `Intrinsic.nonParking()`. A function or service operation header with any other property, or any other field, is SEM0235 at the clause, in both `silk check` and `silk build`. Examples: `with Intrinsic.detached()`, `with Intrinsic.nonParking(strict: true)`.
- `Intrinsic.foreign(...)` and `Intrinsic.machine(...)` apply only to `extern "C"` and `export "C"` functions. On a plain function, or on an interface or service operation, either is SEM0236 at the clause: "This property clause is not allowed on this declaration; `Intrinsic.foreign` and `Intrinsic.machine` apply only to `extern "C"` or `export "C"` functions".
- SEM0235 takes precedence: a clause with an unknown field, such as `Intrinsic.machine(naked: true, bogus: 1)` on a plain function, is SEM0235.

## Unsafe members

- These members are unsafe: `pointerAt`, `pointerAtMut`, `pointerRead`, `pointerWrite`, `pointerReadUnaligned`, `pointerWriteUnaligned`, `pointerRequalify`, `pointerReinterpret`, `pointerBytes`, `pointerTake`, `pointerBorrow`, `pointerBorrowMut`, `assembly`.
- Every atomic member except `atomicFence` is unsafe. Each takes its memory order as a static string, such as `"acquire"`; an order or element type the operation does not admit is SEM0237.
- So are these storage members: `rawBufferFrom`, `rawBufferSlot`, `rawBufferRead`, `rawBufferCopy`, `rawBufferFill`, `rawBufferView`, `rawBufferViewMut`, `slotWrite`, `slotTake`, `slotDrop`, `slotCopy`, `sharedFromAllocation`, `stringFromUtf8Unchecked`, `executionFromAllocation`.
- Call them inside `unsafe { }` or as `unsafe Intrinsic.member(...)`. Otherwise SEM0082.
- No other member is unsafe. Scalar operations, target queries and reflection are safe.

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
| Allocation, raw storage | `silk/allocator`, `silk/layout`, `silk/raw_buffer`, `silk/slot`, `silk/box`, `silk/list` |
| Shared ownership | `silk/shared` |
| Execution | `silk/execution` |
| Effect composition | `silk/effect` (`provide`, `provideMut`, `catch`, `catchAll`, finalizers) |
| Target queries | `silk/target` (`Target.arch()`, `Target.operatingSystem()`, `pointerBits`) |
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
| SEM0236 | Known property on a declaration that does not take it, such as `Intrinsic.machine(...)` on a plain function |
| SEM0237 | An atomic member with a memory order or element type it does not admit, such as `atomicStore` with `"acquire"` |

## See also

Values and primitive types · Interfaces and impls · Ownership and moves · Unsafe code and C interop · Allocation and shared ownership · Static evaluation · Effects and run · Typed failures · Services and providers · Fibers and scheduling · `silk/ownership`, `silk/pointer`, `silk/reflect`, `silk/target`, `silk/compilation`, `silk/effect`

## Open questions

- `enumValue` is in the runtime intrinsic catalog, but no compiler or standard library code calls it. Its contract is unconfirmed.
- SEM0093 (intrinsic unavailable on the requested target) has no producer in the compiler.
- Inside a runtime function, the SEM0176 message names the target as "unselected-target": "Intrinsic.targetOperatingSystem is not available during static evaluation for unselected-target".
