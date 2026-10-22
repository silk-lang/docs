# Unsafe code and C interop

Unsafe code is code whose memory safety the compiler cannot check. This page covers `unsafe` blocks, functions and calls, raw pointer types, and C interoperation: foreign functions and statics, exported functions, C-layout records and callbacks.

## Syntax

```
UnsafeBlock      = 'unsafe' Block
UnsafeCall       = 'unsafe' Expression
UnsafeFunction   = 'unsafe' 'effect'? 'fn' Name Signature Block

ForeignFunction  = 'unsafe' 'extern' '"C"' 'fn' Name ForeignParameters '->' Type Symbol? PropertyClause*
ForeignStatic    = 'unsafe' 'extern' '"C"' 'static' Name ':' Type Symbol? PropertyClause*
ExportFunction   = 'unsafe'? 'export' '"C"' 'fn' Name Parameters '->' Type Symbol? PropertyClause* Block
ExportStatic     = 'export' '"C"' 'static' Name ':' Type Symbol? '=' Expression
CLayoutStruct    = 'pub'? 'extern' '"C"' 'struct' Name '{' Field* '}'
ForeignParameters = '(' ( Parameter ( ',' Parameter )* ( ',' '...' )? )? ')'
Symbol           = 'as' TextLiteral
PropertyClause   = 'with' 'Intrinsic' '.' Name '(' ( Name ':' Expression ( ',' Name ':' Expression )* )? ')'

PointerType      = '?'? ( '*' | '[' '*' ']' ) ( 'const' | 'mut' ) Qualifier* Type
Qualifier        = 'align' '(' Decimal ')' | 'addrspace' '(' Decimal ')'
ForeignFnType    = 'extern' '"C"' 'fn' '(' ( Type ( ',' Type )* )? ')' '->' Type PropertyClause*
```

## What requires unsafe

An unsafe operation must appear inside an `unsafe` block or be acknowledged by an `unsafe` call expression. Otherwise it is SEM0082. Unsafe operations are:

- calling an `unsafe fn`, including standard library ones such as `Pointer.read`, `Pointer.write`, `Pointer.at`;
- calling a foreign (`extern "C"`) function;
- reading a foreign static or an exported static;
- calling an unsafe `Intrinsic` member, such as `Intrinsic.pointerWrite` or `Intrinsic.pointerRequalify`;
- calling an `export "C"` function directly from Silk.

Forming a pointer is safe: `Pointer.fromRef`, `Pointer.fromMutRef`, `Pointer.fromSlice`, `Pointer.null`, `Pointer.isNull`, `Pointer.address` and `Pointer.nonNull` need no `unsafe`.

## Unsafe blocks and calls

- `unsafe { ... }` is a statement. Every unsafe operation directly in its body is allowed.
- An `unsafe` block is not an expression: `let x = unsafe { 1 }` is a parse error.
- `unsafe` before an expression acknowledges exactly one unsafe invocation: `unsafe abs(-1)`.
- The operand of `unsafe` must be a complete unsafe call. `unsafe 1 + 2` is SEM0137.
- `unsafe` binds as tightly as other prefix operators: `unsafe f(a) + unsafe f(b)` acknowledges two calls.
- The acknowledgement does not reach into arguments. In `unsafe f(g(x))`, an unsafe `g` needs its own `unsafe`.
- Unsafe authority does not extend into closure bodies written inside an `unsafe` block.
- Writing `unsafe` on a call inside an `unsafe` block is allowed.

## Unsafe functions

- `unsafe fn` marks a function whose callers must prove a contract. Calls to it are unsafe operations.
- The body of an `unsafe fn` is not an unsafe context. Unsafe operations in it still need an `unsafe` block or call.
- Methods in `impl` blocks may be `unsafe fn`. Call them as `unsafe Type.method(...)`.
- An unsafe function can be passed where `unsafe fn(...) -> T` is expected. Calling the parameter needs `unsafe`.

## Raw pointer types

| Type | Meaning |
| --- | --- |
| `*const T` | Non-null pointer to one `T`, read-only |
| `*mut T` | Non-null pointer to one `T`, writable |
| `?*const T`, `?*mut T` | The same, but may be null |
| `[*]const T`, `[*]mut T` | Non-null pointer to many `T`, with no length |
| `?[*]const T`, `?[*]mut T` | Many-element pointer that may be null |
| `*const align(1) T` | Pointer with a stated minimum alignment instead of `T`'s natural one |

- A pointer is `Copy`. It owns nothing, holds no loan, and keeps no storage alive.
- A non-null pointer proves only that the address is not zero. It does not prove the storage is live or initialized.
- Implicit conversions only weaken guarantees: `*mut T` to `*const T`, and non-null to nullable.
- Other changes need an explicit, unsafe step. `*const T` to `*mut T`, nullable to non-null, and `align(1)` to natural alignment are type errors (SEM0037).
- `align(n)` requires `n` to be a power of two from 1 to 2^29, at most once per pointer. Otherwise SEM0215.
- `addrspace(n)` accepts only `0` on current targets. Otherwise SEM0215.
- `Intrinsic.pointerRequalify<From, To>` changes qualifiers but not the pointee type; changing the pointee is SEM0215. `Intrinsic.pointerReinterpret<From, To>` changes the pointee.

## The Pointer API

`silk/pointer` wraps the pointer intrinsics. Safe operations:

- `fromRef`, `fromMutRef`: pointer to a borrowed value. `fromSlice`, `fromMutSlice`: nullable many-element pointer to a slice's elements.
- `null<T>()`, `isNull`, `isNullMany`, `address`, `addressMany`.
- `nonNull`, `nonNullMut`, `nonNullMany`, `nonNullManyMut`: return `Option` of the non-null type.

Unsafe operations (the caller proves the storage contract):

- `read<T: Copy>(*const T) -> T` and `write<T: Copy>(*mut T, T)` for naturally aligned storage. A non-Copy T is SEM0121.
- `readUnaligned` and `writeUnaligned` for `align(1)` pointers.
- `at` and `atMut`: pointer to element `index` of a many-element pointer.
- `assumeAligned`, `assumeAlignedMut`, `assumeMany`, `assumeManyMut`, `bytes`.

## Foreign functions

- `unsafe extern "C" fn name(...) -> T` declares a C function. It has no body.
- The ABI string must be `"C"`.
- `as "symbol"` links to a different native name. Without it, the Silk name is the symbol.
- Parameter and result types must be C-compatible scalars: integer and float types, `usize`, `isize`, raw pointers, C function pointers, and `()` as a result.
- `bool` and `char` are rejected (SEM0187). A call that passes or returns a struct, `string` or reference by value is reported as `unsupported[ForeignAggregate]`.
- A trailing `...` declares a C variadic function. Variadic arguments follow the named ones.
- A foreign function cannot be used as a value; it can only be called (SEM0189).

## Foreign properties

A foreign declaration may carry `with Intrinsic.foreign(...)`. It holds either one `noCapture` or `callbacks` field, or a `memory` and `locality` contract:

| Field | Meaning |
| --- | --- |
| `noCapture: ("p", ...)` | Hint that the named pointer parameters are not retained |
| `callbacks: ("f", ...)` | Names every C function-pointer parameter exactly once; required when one exists |
| `memory: "none" \| "read" \| "write" \| "readwrite"` | Memory contract, together with `locality` |
| `locality: "arguments" \| "external"` | Which memory the function may access |

- `memory` and `locality` also annotate a foreign function type: `extern "C" fn(*const i32) -> i32 with Intrinsic.foreign(memory: "read", locality: "arguments")`.
- Any other field in a declaration's `Intrinsic.foreign(...)`, such as `bogus: ("value",)`, is SEM0235 at the clause, in both `silk check` and `silk build`. In a foreign function type it is SEM0188.
- `Intrinsic.foreign(...)` and `Intrinsic.machine(...)` apply only to functions with `extern "C"` or `export "C"` linkage. On a plain function, or on an interface or service operation, either is SEM0236 at the clause. An unknown property or field is SEM0235 instead.

## Statics

- `unsafe extern "C" static name: T as "symbol"` declares C data.
- `export "C" static name: T as "symbol" = value` defines a C object. `as "symbol"` is optional.
- The type of an exported static must be a C scalar. `bool` and arrays are SEM0187. The value is evaluated statically.
- An exported static may be declared in any module of the package that the build includes.
- Reading a foreign or exported static by name is an unsafe operation (SEM0082 outside `unsafe`). Assigning to one is SEM0036.

## Exported functions

- `export "C" fn name(...) -> T { ... }` defines a function with C linkage. `as "symbol"` sets its native name.
- `unsafe export "C" fn` is also accepted.
- An exported function may be declared in any module of the package that the build includes.
- The exported function's body must not suspend (SEM0201).
- Pass an exported function for a C function-pointer parameter. Passing an ordinary `fn` is a type error (SEM0012).

## Native symbols

- A native symbol is the `as "..."` name of a foreign or exported declaration, or its Silk name when `as` is absent.
- A symbol must be an ASCII identifier: a letter or `_`, then letters, digits, `_` or `$`. Otherwise SEM0190.
- Reserved symbols are SEM0191: `main` and `_start` (unless no runtime is selected), `silk_raw_process_entry`, names starting `__silk_`, `silk_suspend_` or `silk_execution_storage_`, `silk_` plus 32 lowercase hex digits, and `silk_` names ending in `__`.
- All claims of one symbol must agree (SEM0192). Two exports of one symbol conflict. An import and an export of one symbol must both be functions or both be statics, with the same C types and the same variadic shape.
- An import whose C types exactly match a package export binds to that export.
- Imports alone are not compared: two `extern` declarations of one symbol with different types are accepted.

## C-layout records

- `extern "C" struct Name { ... }` declares a record laid out as a C struct.
- A C-layout record cannot have type parameters (SEM0205).
- Fields may be C scalars (integers, floats, `usize`, `isize`), raw pointers, C function addresses (`extern "C" fn` types), fixed arrays, other C-layout records, and enums with a representation (`enum(u8) Name`).
- Any other field type is SEM0206. That includes `bool`, `char`, `string`, `()`, references, ordinary structs, Silk callables and enums without `(R)`.
- Pass C-layout records to C through pointers, for example `Pointer.fromMutRef(&mut value)`.

## Examples

```silk
import silk.pointer { Pointer }

unsafe extern "C" fn strlen(text: [*]const u8) -> usize
unsafe extern "C" fn snprintf(buffer: ?[*]mut u8, size: usize, format: ?[*]const u8, ...) -> i32
unsafe extern "C" fn getpid() -> i32

pub fn main() -> i32 {
  let mut buffer: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0]
  let format = b"n=%d\0"
  let written = unsafe snprintf(Pointer.fromMutSlice(&mut buffer), 8, Pointer.fromSlice(format), 42)
  if written != 4 { return 1 }
  if buffer[2] != 52 || buffer[3] != 50 { return 2 }
  let text = Pointer.fromSlice(&buffer)
  unsafe {
    let many = Intrinsic.pointerRequalify<?[*]const u8, [*]const u8>(text)
    if strlen(many) != 4 { return 3 }
  }
  if unsafe getpid() <= 0 { return 4 }
  return 0
}
```

A C callback, sorting with libc `qsort`:

```silk
import silk.pointer { Pointer }

unsafe extern "C" fn qsort(
  base: ?[*]mut i32,
  count: usize,
  size: usize,
  compare: extern "C" fn(*const i32, *const i32) -> i32
) -> () with Intrinsic.foreign(callbacks: ("compare",))

export "C" fn descending(left: *const i32, right: *const i32) -> i32 {
  let a = unsafe Pointer.read(left)
  let b = unsafe Pointer.read(right)
  if a > b { return -1 }
  if a < b { return 1 }
  return 0
}

pub fn main() -> i32 {
  let mut values = [3, 9, 1, 7]
  unsafe qsort(Pointer.fromMutSlice(&mut values), 4, 4, descending)
  if values[0] != 9 || values[1] != 7 || values[2] != 3 || values[3] != 1 { return 1 }
  return 0
}
```

A C-layout record and a foreign static:

```silk
import silk.pointer { Pointer }

extern "C" struct Timespec {
  seconds: i64
  nanoseconds: i64
}

unsafe extern "C" fn clock_gettime(clock: i32, value: *mut Timespec) -> i32
unsafe extern "C" static environment: ?[*]const ?[*]const u8 as "environ"

pub fn main() -> i32 {
  let mut now = Timespec { seconds: -1, nanoseconds: -1 }
  if unsafe clock_gettime(1, Pointer.fromMutRef(&mut now)) != 0 { return 1 }
  if now.seconds < 0 || now.nanoseconds >= 1000000000 { return 2 }
  unsafe {
    if Pointer.isNullMany(environment) { return 3 }
  }
  return 0
}
```

An exported function and static, read through matching imports:

```silk
export "C" static limit: i32 = 40
export "C" fn twice(value: i32) -> i32 { return value * 2 }
unsafe extern "C" fn doubled(value: i32) -> i32 as "twice"
unsafe extern "C" static seenLimit: i32 as "limit"

pub fn main() -> i32 {
  unsafe {
    if limit != 40 || seenLimit != 40 { return 1 }
    if doubled(21) != 42 { return 2 }
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0082 | Unsafe operation outside an `unsafe` block or acknowledgement, including reading a static |
| SEM0121 | `T: Copy` cannot be proved, for example `Pointer.read` of a non-`Copy` type |
| SEM0137 | `unsafe` does not acknowledge a complete unsafe invocation |
| SEM0185 | Foreign function ABI string is not `"C"` |
| SEM0186 | Foreign function declared without `unsafe` |
| SEM0187 | Foreign parameter or result type is not a C-compatible scalar |
| SEM0188 | Silk-only contract syntax on a foreign declaration |
| SEM0189 | Foreign function used as a value instead of called |
| SEM0190 | Native symbol is not an ASCII identifier |
| SEM0191 | Native symbol is reserved by the compiler or its runtime |
| SEM0192 | Claims of one symbol disagree: two exports, a function and a static, or different C types or variadic shape |
| SEM0193 | Foreign call unavailable on the selected target |
| SEM0201 | `export "C"` function body may suspend |
| SEM0205 | C-layout record declares type parameters |
| SEM0206 | C-layout record field outside the C object subset |
| SEM0207 | Value cannot become a noncapturing C callback address |
| SEM0208 | Foreign static used on a target without native symbol linkage |
| SEM0215 | Invalid pointer alignment, address space or qualifier conversion |
| SEM0235 | Unknown property or property field in a `with Intrinsic.*` clause |
| SEM0236 | `Intrinsic.foreign` or `Intrinsic.machine` on a function without linkage, or on an interface or service operation |

## See also

Values and primitive types · Functions and methods · Closures and callable types · Structs, tuples and arrays · Ownership and moves · Allocation and shared ownership · Intrinsics · Effects and run · Typed failures · Services and providers · `silk/pointer`, `silk/raw_buffer`, `silk/slot`, `silk/layout`

## Open questions

The rules above come from compiler source and the diagnostic catalog. Several are not enforced as written:

- SEM0186: `extern "C" fn abs(value: i32) -> i32` without `unsafe` passes `silk check`, and `silk build` reports `unsupported[foreign-contract] not supported by the native compiler yet`, not SEM0186.
- SEM0185, SEM0188: on a declaration, `extern "Rust"` is `unsupported[foreign-abi]` at build, and a call to a generic foreign function is `unsupported[ForeignAggregate]` in check and build. The codes fire only for foreign function types.
- SEM0201, SEM0207, SEM0193, SEM0208 have no producer in the compiler. An `export "C" effect fn` that parks passes check and is `unsupported[foreign-contract]` at build. Without the `callbacks` property, a callback parameter is an unsupported gap (`unsupported[ForeignCallback]`).
- A direct Silk call to an `export "C"` function needs `unsafe` and is then an unsupported gap ("foreign-export").
- `addrspace(n)` other than `0` may be meant for other targets.
