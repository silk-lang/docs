# Unsafe code and C interop

Unsafe code is code whose memory safety the compiler cannot check. This page covers `unsafe` blocks, functions and calls, raw pointer types, and C interoperation: foreign functions and statics, exported functions, SIMD vectors in C signatures, C-layout records and callbacks.

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
- The declaration must be `unsafe` (SEM0186) and its ABI string must be `"C"` (SEM0185). It may not have generic parameters or be `static` or `effect` (SEM0188). Each is reported at the declaration by `silk check`, whether or not the function is called.
- `as "symbol"` links to a different native name. Without it, the Silk name is the symbol.
- Parameter and result types must be C-compatible scalars: integer and float types, `usize`, `isize`, raw pointers, C function pointers, and `()` as a result. SIMD vectors cross too, with the limits in SIMD vectors at the C boundary below.
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
- The exported function's body must not suspend. `silk build` refuses a body that can park, directly or through what it calls, with SEM0201 at the declaration. `silk check` does not report it. An `export "C" effect fn` is SEM0188.
- Pass an exported function for a C function-pointer parameter. Passing an ordinary `fn` is a type error (SEM0012).

## SIMD vectors at the C boundary

A `simd<T, N>` parameter or result of an `extern "C"` or `export "C"` function passes by value in one vector register, the way C compilers pass a vector type of the same size. On the C side, declare a vector with the same lane type and count, such as `float __attribute__((vector_size(16)))` for `simd<f32, 4>`.

- Lane types are the fixed-width numbers: `i8`, `u8`, `i16`, `u16`, `i32`, `u32`, `i64`, `u64`, `f32`, `f64`.
- `simd<isize, N>`, `simd<usize, N>` and `mask<N>` do not cross: C has no vector type for them. They are SEM0187, "mask<4> is not admitted by the C ABI", at each call of a foreign function and at the parameter or result type of an `export "C"` function.
- The vector's total width must be one the target's C ABI passes in a vector register, and the profile must select that register's CPU feature:

| Target | Width | Needs |
| --- | --- | --- |
| x86-64 Linux | 128 bits, such as `simd<f32, 4>` or `simd<u8, 16>` | `sse2`, always on |
| x86-64 Linux | 256 bits, such as `simd<f64, 4>` | `avx` (`x86-64-v3` brings it) |
| x86-64 Linux | 512 bits, such as `simd<u8, 64>` | `avx512f` (`x86-64-v4` brings it) |
| arm64 | 64 and 128 bits, such as `simd<f32, 2>` | `neon`, always on |
| wasm32 | 128 bits | `simd128` |

- Any other width, such as `simd<u8, 8>` on x86-64, is SEM0244: "simd<u8, 8> crosses the C boundary in one vector register, but x86_64-unknown-linux-gnu C passes no vector of that width".
- A width whose feature the profile does not select is also SEM0244: "simd<f32, 8> crosses the C boundary in one vector register, which needs the CPU feature `avx`; select it in the profile's `cpu`".
- For a foreign function, SEM0244 is reported at each call, at the callee's name. A declaration that is never called is not checked. For an `export "C"` function, it is reported at the vector type in the declaration, by `silk check` as well as `silk build`.
- Only the profile's `cpu` counts. A `features` list from `Intrinsic.machine(...)` on the calling function does not satisfy SEM0244. See Targets and profiles for `cpu`.
- A C function-pointer type cannot carry a vector: `extern "C" fn(simd<f32, 4>) -> f32` is SEM0187.

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
  if written != 4 {
    return 1
  }
  if buffer[2] != 52 || buffer[3] != 50 {
    return 2
  }
  let text = Pointer.fromSlice(&buffer)
  unsafe {
    let many = Intrinsic.pointerRequalify<?[*]const u8, [*]const u8>(text)
    if strlen(many) != 4 {
      return 3
    }
  }
  if unsafe getpid() <= 0 {
    return 4
  }
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
  if a > b {
    return -1
  }
  if a < b {
    return 1
  }
  return 0
}

pub fn main() -> i32 {
  let mut values = [3, 9, 1, 7]
  unsafe qsort(Pointer.fromMutSlice(&mut values), 4, 4, descending)
  if values[0] != 9 || values[1] != 7 || values[2] != 3 || values[3] != 1 {
    return 1
  }
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
  if unsafe clock_gettime(1, Pointer.fromMutRef(&mut now)) != 0 {
    return 1
  }
  if now.seconds < 0 || now.nanoseconds >= 1000000000 {
    return 2
  }
  unsafe {
    if Pointer.isNullMany(environment) {
      return 3
    }
  }
  return 0
}
```

An exported function and static, read through matching imports:

```silk
export "C" static limit: i32 = 40

export "C" fn twice(value: i32) -> i32 {
  return value * 2
}

unsafe extern "C" fn doubled(value: i32) -> i32 as "twice"

unsafe extern "C" static seenLimit: i32 as "limit"

pub fn main() -> i32 {
  unsafe {
    if limit != 40 || seenLimit != 40 {
      return 1
    }
    if doubled(21) != 42 {
      return 2
    }
  }
  return 0
}
```

A C function that takes and returns `simd<f32, 4>`, and C code that calls an exported Silk function on `simd<i32, 4>`. The C file `native/vec.c`:

```c
typedef float f32x4 __attribute__((vector_size(16)));
typedef int i32x4 __attribute__((vector_size(16)));

f32x4 scale(f32x4 values, float factor) { return values * factor; }

i32x4 add_lanes(i32x4 a, i32x4 b);

int check_add(void) {
  i32x4 sum = add_lanes((i32x4){1, 2, 3, 4}, (i32x4){10, 20, 30, 40});
  return sum[0] + sum[1] + sum[2] + sum[3];
}
```

Compile it and list the object in the manifest, as in Build outputs and native linking:

```sh
clang -c -fPIC native/vec.c -o native/vec.o
```

```toml
[build]
native-link-inputs = [{ object = "native/vec.o" }]
```

```silk
import silk.simd.f32x4

unsafe extern "C" fn scale(values: simd<f32, 4>, factor: f32) -> simd<f32, 4>

unsafe extern "C" fn check_add() -> i32

export "C" fn add_lanes(a: simd<i32, 4>, b: simd<i32, 4>) -> simd<i32, 4> {
  return a + b
}

pub fn main() -> i32 {
  let values = f32x4.fromArray([1.0, 2.0, 3.0, 4.0])
  let scaled = f32x4.toArray(unsafe scale(values, 2.5))
  if scaled[3] != 10.0 {
    return 1
  }
  return unsafe check_add()
}
```

```sh
silk run; echo "exit $?"
```

```
exit 110
```

The exit status is 11 + 22 + 33 + 44. A 256-bit vector such as `simd<f64, 4>` works the same way under a profile with `[profiles.avx.cpu] features = ["avx"]`, run with `silk run --profile avx`, and with the C file compiled with `-mavx`. Under the default profile, its call is SEM0244.

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0082 | Unsafe operation outside an `unsafe` block or acknowledgement, including reading a static |
| SEM0121 | `T: Copy` cannot be proved, for example `Pointer.read` of a non-`Copy` type |
| SEM0137 | `unsafe` does not acknowledge a complete unsafe invocation |
| SEM0185 | Foreign function ABI string is not `"C"` |
| SEM0186 | Foreign function declared without `unsafe` |
| SEM0187 | Foreign parameter or result type is not a C-compatible scalar, including `mask<N>` and pointer-sized vector lanes |
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
| SEM0244 | SIMD vector in a foreign call or `export "C"` signature that the target's C ABI cannot pass in a vector register the profile selects |

## See also

Values and primitive types (SIMD vectors and masks) · Targets and profiles · Build outputs and native linking · Functions and methods · Closures and callable types · Structs, tuples and arrays · Ownership and moves · Allocation and shared ownership · Intrinsics · Effects and run · Typed failures · Services and providers · `silk/pointer`, `silk/raw_buffer`, `silk/slot`, `silk/layout`

## Open questions

The rules above come from compiler source and the diagnostic catalog. Several are not enforced as written:

- SEM0207, SEM0193, SEM0208 have no producer in the compiler. Without the `callbacks` property, a callback parameter is an unsupported gap (`unsupported[ForeignCallback]`).
- A direct Silk call to an `export "C"` function needs `unsafe` and is then an unsupported gap ("foreign-export").
- `addrspace(n)` other than `0` may be meant for other targets.
