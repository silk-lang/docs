# Unsafe code and C interop

Unsafe code is code whose memory safety the compiler cannot check. This page covers `unsafe` blocks, functions and calls, raw pointer types, and C interoperation: foreign functions and statics, the directives on them, exported functions, SIMD vectors in C signatures, C-layout records, callbacks and WebAssembly imports.

## Syntax

```
UnsafeBlock      = 'unsafe' Block
UnsafeCall       = 'unsafe' Expression
UnsafeFunction   = 'unsafe' 'effect'? 'fn' Name Signature Block

ForeignFunction  = Directive* 'unsafe' 'extern' '"C"' 'fn' Name ForeignParameters '->' Type Symbol?
ForeignStatic    = 'unsafe' 'extern' '"C"' 'static' Name ':' Type Symbol?
ExportFunction   = Directive* 'unsafe'? 'export' '"C"' 'fn' Name Parameters '->' Type Symbol? Block
ExportStatic     = 'export' '"C"' 'static' Name ':' Type Symbol? '=' Expression
CLayoutStruct    = 'pub'? 'extern' '"C"' 'struct' Name LifetimeParameters? '{' Field* '}'
ForeignParameters = '(' ( Parameter ( ',' Parameter )* ( ',' '...' )? )? ')'
Symbol           = 'as' TextLiteral
Directive        = '@' Name ( '(' Arguments ')' )?

PointerType      = '?'? ( '*' | '[' '*' ']' ) ( 'const' | 'mut' ) Qualifier* Type
Qualifier        = 'align' '(' Decimal ')' | 'addrspace' '(' Decimal ')'
ForeignFnType    = Directive* '?'? 'extern' '"C"' 'fn' '(' ( Type ( ',' Type )* )? ')' '->' Type
```

## What requires unsafe

An unsafe operation must appear inside an `unsafe` block or be acknowledged by an `unsafe` call expression. Otherwise it is SEM0082. Unsafe operations are:

- calling an `unsafe fn`, including standard library ones such as `Pointer.read`, `Pointer.write`, `Pointer.at`;
- calling a foreign (`extern "C"`) function;
- reading a foreign static or an exported static;
- calling an unsafe `Intrinsic` member, such as `Intrinsic.pointerWrite` or `Intrinsic.pointerRequalify`;
- calling an `export "C"` function directly from Silk, as in `unsafe twice(21)`.

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

`silk/mem/pointer` wraps the pointer intrinsics. Safe operations:

- `fromRef`, `fromMutRef`: pointer to a borrowed value. `fromSlice`, `fromMutSlice`: nullable many-element pointer to a slice's elements.
- `null<T>()`, `isNull`, `isNullMany`, `address`, `addressMany`.
- `nonNull`, `nonNullMut`, `nonNullMany`, `nonNullManyMut`: return `Option` of the non-null type.

Unsafe operations (the caller proves the storage contract):

- `read<T: Copy>(*const T) -> T` and `write<T: Copy>(*mut T, T)` for naturally aligned storage. A non-Copy T is SEM0121.
- `readUnaligned` and `writeUnaligned` for `align(1)` pointers.
- `at` and `atMut`: pointer to element `index` of a many-element pointer.
- `take<T>(*mut T) -> T` moves the value out. `put<T>(*mut T, T)` moves one in. `dropInPlace<T>(*mut T)` runs the value's drop where it lies and leaves the storage uninitialized, without copying the value out first.
- `borrow`, `borrowMut`, `borrowMany`, `borrowManyMut`: a reference or slice whose loan is tied to an anchor the caller passes.
- `assumeAligned`, `assumeAlignedMut`, `assumeMany`, `assumeManyMut`, `bytes`.

## Foreign functions

- `unsafe extern "C" fn name(...) -> T` declares a C function. It has no body.
- The declaration must be `unsafe` (SEM0186) and its ABI string must be `"C"` (SEM0185). It may not have generic parameters or be `static` or `effect` (SEM0188). Each is reported at the declaration by `silk check`, whether or not the function is called.
- `as "symbol"` links to a different native name. Without it, the Silk name is the symbol.
- Parameter and result types must be C-compatible: integer and float types, `usize`, `isize`, raw pointers, C function pointers (`extern "C" fn(...) -> T`, or `?extern "C" fn(...) -> T` when C may pass or receive null), `extern "C" struct` types by value, and `()` as a result. A struct passed or returned by value follows the platform's C rules, in registers or in memory, as a C compiler would pass it. SIMD vectors cross too, with the limits in SIMD vectors at the C boundary below.
- Any other type is rejected at the declaration (SEM0187): `bool`, `char`, `string` and references are "not admitted by the C ABI", and the message for a struct without `extern "C"` says it has no C layout and to declare it `extern "C" struct`.
- A trailing `...` declares a C variadic function. Variadic arguments follow the named ones.
- A foreign function cannot be used as a value; it can only be called (SEM0189).

## Foreign directives

A foreign or exported function takes directives on the lines before it. They state facts about the C side that the compiler cannot see. Intrinsics lists every directive and its class.

| Directive | Meaning |
| --- | --- |
| `@foreign(memory: "none" \| "read" \| "write" \| "readwrite")` | What the function does with memory. The optimizer trusts it |
| `@foreign(locality: "arguments" \| "external")` | Which memory: only what the pointer arguments reach, or any. Write it together with `memory` |
| `@foreign(noCapture: ("p", ...))` | The named pointer parameters are not kept after the call returns |
| `@callbacks("compare", ...)` | C calls these function-pointer parameters on this thread, before it returns |
| `@threadCallbacks("routine", ...)` | C may call these on another thread, during or after the call |
| `@deferredCallbacks("info.callback", ...)` | C keeps these and calls them later, on this thread, from a call marked `@invokesDeferredCallbacks` |
| `@invokesDeferredCallbacks` | This call may run callbacks that an earlier `@deferredCallbacks` call registered on this thread |

- The arguments of `@foreign` are named, each at most once, and may be combined: `@foreign(memory: "read", noCapture: ("left", "right"))`.
- A foreign function type takes `@foreign` with `memory` and `locality` only: `@foreign(memory: "read", locality: "arguments") extern "C" fn(*const i32) -> i32`. Any other directive or argument there, such as `noCapture` or `@callbacks`, is SEM0188 at the type.
- An unknown argument, such as `@foreign(bogus: 1)`, or a repeated one is SEM0235 at the directive, in both `silk check` and `silk build`.
- `@foreign`, the callback directives, `@naked` and `@noReturn` apply only to `extern "C"` and `export "C"` functions. On a plain function, or on an interface or service operation, each is SEM0236 at the directive.
- A leftover `with Intrinsic.foreign(...)` clause is PAR0011. Its message says to write the facts as `@foreign(...)`, the callbacks as `@callbacks(...)`, `@threadCallbacks(...)`, `@deferredCallbacks(...)` or `@invokesDeferredCallbacks`, and a WebAssembly module and name as `as "module#name"`.

## Callbacks

A C function-pointer parameter, or a field of one inside a by-value `extern "C" struct` argument, is a callback. Every callback must be named in exactly one callback directive. The name is the parameter's name, or a path through struct fields: `"info.callback"` is the `callback` field of the parameter `info`. A path cannot pass through a raw pointer.

- A callback parameter named by no directive is SEM0187 at the declaration, and the message gives the directive to add: ``A C function-pointer parameter must be named in the declaration's directives; add `@callbacks("compare")` before the declaration``.
- Any other broken contract is SEM0187 at the declaration with one message: "Invalid C callback contract: name every direct or by-value struct callback exactly once across the callback lists, with at most one list per mode; retained callbacks and deferred reentry cannot carry reference loans, and callback contracts cannot promise restricted memory access". That covers an unnamed callback field in a struct argument, a callback named twice, a path through a raw pointer, and a path that names no callback.
- One declaration may combine lists of different modes, such as `@deferredCallbacks("lost")` with `@threadCallbacks("error")`, with at most one list per mode.
- The same SEM0187 refuses a callback directive together with `@foreign(memory: ...)`, since a callback can touch any memory. It also refuses `@deferredCallbacks` or `@invokesDeferredCallbacks` on a declaration with a reference or slice parameter, since the loan would outlive the call.
- `@invokesDeferredCallbacks` takes no argument and goes on an imported function. On an `export "C"` function it is SEM0187.
- The value passed for a callback is an `export "C"` function, or a value of a C function-pointer type. An ordinary `fn` is a type error (SEM0012).

### Nullable function pointers

- `?extern "C" fn(i32, *mut i32) -> ()` is a C function pointer that may be null. Use it for a parameter or a C-layout field that C allows to be `NULL`.
- An `export "C"` function or an `extern "C" fn` value converts to it. `Intrinsic.pointerNullFunction<F>()` is the null value of the nullable type `F`.
- It cannot be called directly (SEM0075). Test it with `Intrinsic.pointerIsNull<F>(value)`, then refine it with `unsafe Intrinsic.pointerRequalify<F, extern "C" fn(...) -> T>(value)` and call the result.
- A nullable callback is named in a callback directive like any other.

## WebAssembly imports

On `wasm32` targets, `as "module#name"` imports a function from a host module: `unsafe extern "C" fn hostAdd(a: i32, b: i32) -> i32 as "env#host_add"` imports `host_add` from `env`. `"module#"` with nothing after `#` uses the function's own Silk name. Without `#`, the text is a plain symbol name, as on native targets. The WASI modules of the std lib import this way, for example `as "wasi:io/poll@0.2.12#poll"`.

- A `#` import is for WebAssembly only. For any other target it is SEM0193 at the declaration, in both `silk check` and `silk build`, even when nothing calls it. The example above prints "Foreign function `env#host_add` is unavailable for x86_64-unknown-linux-gnu; guard the declaration with `static if Target.objectFormat() == ObjectFormat.Wasm`". Put such declarations under that `static if`, or under `static if Target.arch() == Arch.Wasm32`, when the package also builds natively.

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
- Only the profile's `cpu` counts. An `@features` directive on the calling function does not satisfy SEM0244. See Targets and profiles for `cpu`.
- A C function-pointer type cannot carry a vector: `extern "C" fn(simd<f32, 4>) -> f32` is SEM0187.

## Native symbols

- A native symbol is the `as "..."` name of a foreign or exported declaration, or its Silk name when `as` is absent.
- A symbol must be an ASCII identifier: a letter or `_`, then letters, digits, `_` or `$`. Otherwise SEM0190.
- Reserved symbols are SEM0191: `main` and `_start` (unless no runtime is selected), `silk_raw_process_entry`, names starting `__silk_`, `silk_suspend_` or `silk_execution_storage_`, `silk_` plus 32 lowercase hex digits, and `silk_` names ending in `__`.
- All claims of one symbol must agree (SEM0192). Two exports of one symbol conflict. An import and an export of one symbol must both be functions or both be statics, with the same C types and the same variadic shape.
- An import whose C types exactly match a package export binds to that export. Silk code may also call the export by its Silk name, with `unsafe`.
- Imports alone are not compared: two `extern` declarations of one symbol with different types are accepted.

## C-layout records

- `extern "C" struct Name { ... }` declares a record laid out as a C struct.
- A C-layout record cannot have type parameters (SEM0205). It may have lifetime parameters, as in `extern "C" struct BufferRef<'a> { data: ?[*]const u8, length: usize }`. A lifetime has no representation, so the layout stays that of the fields; it ties a record to the Silk data its pointers point into.
- Fields may be C scalars (integers, floats, `usize`, `isize`), raw pointers, C function addresses (`extern "C" fn` and `?extern "C" fn` types), fixed arrays, other C-layout records, and enums with a representation (`enum(u8) Name`).
- Any other field type is SEM0206. That includes `bool`, `char`, `string`, `()`, references, ordinary structs, Silk callables and enums without `(R)`.
- Pass a C-layout record to C by value, as a C struct is, or through a pointer, for example `Pointer.fromMutRef(&mut value)`.

## Examples

```silk
import silk.mem.pointer { Pointer }

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
import silk.mem.pointer { Pointer }

@callbacks("compare")
unsafe extern "C" fn qsort(
  base: ?[*]mut i32,
  count: usize,
  size: usize,
  compare: extern "C" fn(*const i32, *const i32) -> i32
) -> ()

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
import silk.mem.pointer { Pointer }

extern "C" struct Timespec {
  seconds: i64,
  nanoseconds: i64,
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

An exported function and static, read directly and through matching imports:

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
    if doubled(21) != 42 || twice(21) != 42 {
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
[native]
link = [{ object = "native/vec.o" }]
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

Callbacks in three modes, with a nullable function pointer. C calls `notify`'s callback before it returns, keeps the listener's handler, and calls it later from `pump`. The C file `native/events.c`:

```c
#include <stddef.h>
#include <stdint.h>

typedef void (*Handler)(int32_t code, int32_t *total);

struct Listener {
  Handler handler;
  int32_t *total;
};

static struct Listener pending;

void listen(struct Listener listener) { pending = listener; }

int32_t pump(int32_t code) {
  if (pending.handler == NULL) return 0;
  pending.handler(code, pending.total);
  return 1;
}

int32_t notify(Handler maybe, int32_t *total) {
  if (maybe == NULL) return 0;
  maybe(1, total);
  return 1;
}
```

Compile it and link the object as above (`clang -c -fPIC native/events.c -o native/events.o`, then `link = [{ object = "native/events.o" }]` under `[native]`):

```silk
import silk.mem.pointer { Pointer }

type Handler = ?extern "C" fn(i32, *mut i32) -> ()

extern "C" struct Listener {
  handler: Handler,
  total: *mut i32,
}

// C keeps the handler and calls it later, on this thread, from `pump`.
@deferredCallbacks("listener.handler")
unsafe extern "C" fn listen(listener: Listener) -> ()

@invokesDeferredCallbacks
unsafe extern "C" fn pump(code: i32) -> i32

// C calls `maybe` before it returns, unless it is null.
@callbacks("maybe")
unsafe extern "C" fn notify(maybe: Handler, total: *mut i32) -> i32

export "C" fn add(code: i32, total: *mut i32) -> () {
  unsafe Pointer.write(total, unsafe Pointer.read(total) + code)
}

// Silk never calls a nullable function pointer directly: test it, then refine it.
fn callTwice(handler: Handler, total: *mut i32) -> bool {
  if Intrinsic.pointerIsNull<Handler>(handler) {
    return false
  }
  let present = unsafe Intrinsic.pointerRequalify<Handler, extern "C" fn(i32, *mut i32) -> ()>(handler)
  unsafe present(2, total)
  unsafe present(2, total)
  return true
}

pub fn main() -> i32 {
  let mut total: i32 = 0
  let place = Pointer.fromMutRef(&mut total)
  let none = Intrinsic.pointerNullFunction<Handler>()
  if unsafe notify(none, place) != 0 || callTwice(none, place) {
    return 1
  }
  if unsafe notify(add, place) != 1 || !callTwice(add, place) {
    return 2
  }
  unsafe listen(Listener { handler: add, total: place })
  if unsafe pump(100) != 1 {
    return 3
  }
  return total
}
```

```sh
silk run; echo "exit $?"
```

```
exit 105
```

`notify` adds 1, the two direct calls in `callTwice` add 2 each, and the deferred call from `pump` adds 100.

A WebAssembly import. Build it with `silk build --target wasm32-unknown-unknown`; the module imports `host_add` from `env` and `tick` from `clock`, and exports `main`:

```silk
unsafe extern "C" fn hostAdd(a: i32, b: i32) -> i32 as "env#host_add"
unsafe extern "C" fn tick() -> () as "clock#"

pub fn main() -> i32 {
  unsafe tick()
  return unsafe hostAdd(40, 2) - 42
}
```

A host supplies the imports. With Node.js:

```js
import { readFileSync } from "node:fs";
let ticks = 0;
const { instance } = await WebAssembly.instantiate(readFileSync(process.argv[2]), {
  env: { host_add: (a, b) => a + b },
  clock: { tick: () => { ticks += 1; } },
});
console.log(`main returned ${instance.exports.main()} after ${ticks} tick`);
```

```sh
node host.mjs build/llvm/wasm32-unknown-unknown/debug/w
```

```
main returned 0 after 1 tick
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0011 | A leftover `with Intrinsic.foreign(...)` clause; write directives before the declaration |
| SEM0082 | Unsafe operation outside an `unsafe` block or acknowledgement, including reading a static |
| SEM0121 | `T: Copy` cannot be proved, for example `Pointer.read` of a non-`Copy` type |
| SEM0137 | `unsafe` does not acknowledge a complete unsafe invocation |
| SEM0185 | Foreign function ABI string is not `"C"` |
| SEM0186 | Foreign function declared without `unsafe` |
| SEM0187 | Foreign parameter or result type is not C-compatible, including `mask<N>` and pointer-sized vector lanes; or a callback contract that is missing or broken |
| SEM0188 | Silk-only contract syntax on a foreign declaration |
| SEM0189 | Foreign function used as a value instead of called |
| SEM0190 | Native symbol is not an ASCII identifier |
| SEM0191 | Native symbol is reserved by the compiler or its runtime |
| SEM0192 | Claims of one symbol disagree: two exports, a function and a static, or different C types or variadic shape |
| SEM0193 | WebAssembly import, `as "module#name"`, declared for a target that is not WebAssembly |
| SEM0201 | `export "C"` function body may suspend |
| SEM0205 | C-layout record declares type parameters |
| SEM0206 | C-layout record field outside the C object subset |
| SEM0207 | Value cannot become a noncapturing C callback address |
| SEM0208 | Foreign static used on a target without native symbol linkage |
| SEM0215 | Invalid pointer alignment, address space or qualifier conversion |
| SEM0235 | Unknown directive or directive argument, such as `@foreign(bogus: 1)` |
| SEM0236 | A C-only directive such as `@foreign` or `@callbacks` on a function without linkage, or on an interface or service operation |
| SEM0244 | SIMD vector in a foreign call or `export "C"` signature that the target's C ABI cannot pass in a vector register the profile selects |

## See also

Values and primitive types (SIMD vectors and masks) · Targets and profiles · Build outputs and native linking · Functions and methods · Closures and callable types · Structs, tuples and arrays · Ownership and moves · Allocation and shared ownership · Intrinsics · Effects and run · Typed failures · Services and providers · `silk/mem/pointer`, `silk/mem/raw_buffer`, `silk/mem/slot`, `silk/mem/layout`

## Open questions

The rules above come from compiler source and the diagnostic catalog. Several are not enforced as written:

- SEM0207 and SEM0208 have no producer in the compiler.
- A direct Silk call to an `export "C"` function needs `unsafe`, like a foreign call, although the body is Silk code the compiler checked.
- `addrspace(n)` other than `0` may be meant for other targets.
