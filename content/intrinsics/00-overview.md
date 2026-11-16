# Intrinsics

## Overview

`Intrinsic` is the namespace of operations and types the compiler provides itself. Everything else in Silk, including the whole standard library, is built from them. These pages document every member: its signature, what it does, what the caller must prove, and an example that runs.

Most programs never name an intrinsic. The standard library wraps each one in an ordinary function or type, such as `Pointer.read` for `pointerRead` or `Atomic` for the atomics, and each entry links to its wrapper. Reach for the intrinsic itself when you write such a wrapper, when you bind to C, or when the wrapper does not exist yet.

| Page | What it covers |
| --- | --- |
| **Pointers** | Raw pointers: making them from references and slices, offsetting, reading, writing, borrowing through them, reinterpreting, null, and stack storage. |
| **Memory and storage** | Layouts, allocations, raw buffers and slots, the shared-ownership core, slice and string views, and WebAssembly memory. |
| **Atomics** | Atomic loads, stores, exchanges, fetch operations and fences, with the C++20 memory model. |
| **Scalar operations** | Arithmetic, wrapping, saturating and checked arithmetic, bits, comparisons, conversions and float classification for every scalar type. |
| **SIMD** | Portable vector operations on `simd<T, N>` and masks. |
| **Architecture operations** | Single instructions of x86-64, AArch64 and WebAssembly that the portable SIMD members do not express. |
| **Static evaluation** | Target and profile queries, static text, embedded files, static sequences, reflection and the test catalog. |
| **Effects and execution** | Effect composition, failure reports, traps, inline assembly and execution packages. |
| **Types and properties** | The storage, execution and descriptor types, the `Copy`, `Drop`, thread and execution properties, the operator interfaces and `Intrinsic.application`. |

## Reading an entry

Each member has an entry headed by its name:

- A signature in Silk syntax. Type parameters, lifetimes and the `static` marker on parameters that must be known during specialization are as the compiler checks them. Signatures are not declarations you can import: `Intrinsic` cannot be imported, and every member is written `Intrinsic.<name>`.
- What the member does, then its rules as a list. **Unsafe** members say exactly what the caller proves; breaking that is undefined behavior, and the entry says which mistakes are checked (a trap or a diagnostic) and which are not.
- The wrapper in the standard library, when there is one.
- A complete program. Each one runs with `silk run` and exits with status 0, or is checked with `silk check` for a target other than the one you run on. Copy one into `src/main.silk` of a new package to try it.

The scalar operations are documented one family per entry, such as `Intrinsic.<integer>WrappingAdd` for `i8WrappingAdd` through `usizeWrappingAdd`. The placeholders are listed at the top of [Scalar operations](/docs/intrinsics/scalars).

Type arguments are written out for most members, all of them or none: `Intrinsic.pointerRead<u32>(pointer)`. A member that infers them says so in its entry.

## How these pages stay correct

`scripts/check-intrinsics.ts` in the docs repository compares these pages with a silk checkout and a silk binary:

- every member the compiler's tables define has exactly one entry, and no entry names a member that does not exist;
- every link into the standard library reference names a page and an anchor that exist;
- with `--run`, every example compiles and runs with the given silk.

Continuous integration runs it against the newest silk release, so a release that adds, removes or changes a member fails the docs build until these pages follow.

The language rules for the namespace, the directives and the diagnostics are in [Intrinsics](/docs/reference/intrinsics) in the language reference.
