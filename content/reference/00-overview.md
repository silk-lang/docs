# Silk language reference

## What this covers

This is the reference for the core Silk language: syntax, rules and the diagnostics that enforce them. It is terse on purpose. The Silk book teaches, and this reference is where you look things up.

Every example on these pages was compiled with `silk check` or run with `silk run` on release v0.1.0-dev.8624 (source commit 5081812).

Two later changes on main are already reflected: the std lib collection `Vector` is now `List` (in `silk/collections/list`), and arrays gain the repeat form `[value; count]`. Examples using those were not run, since no release has them yet.

## How a page is laid out

1. **Summary.** One or two sentences on what the page covers.
2. **Syntax.** The grammar in the notation below.
3. **Rules.** What the compiler accepts and what each form means, as short bullets.
4. **Examples.** Small complete programs that compile.
5. **Diagnostics.** The error codes for this topic, with their messages.
6. **See also.** Related reference pages and std lib API pages.

## Grammar notation

| Notation | Meaning |
| --- | --- |
| `'fn'` | A literal token |
| `Name` | Another grammar rule |
| `x?` | Optional |
| `x*` / `x+` | Zero or more / one or more |
| `a \| b` | Either |
| `( … )` | Grouping |

## Pages

| Part | Pages |
| --- | --- |
| Basics | Lexical structure · Values and primitive types · Bindings and statements · Expressions and operators · Control flow · Program entry and termination |
| Data | Structs, tuples and arrays · Enums and unions · Patterns and match |
| Functions and abstraction | Functions and methods · Closures and callable types · Generics · Interfaces and impls |
| Memory and ownership | Ownership and moves · Borrowing · Lifetimes · Allocation and shared ownership |
| Effects and services | Effects and run · Typed failures · Services and providers |
| Concurrency | Fibers and scheduling · Suspension and cancellation |
| Static evaluation | Static evaluation · Static control flow and reflection · Package parameters |
| Advanced | Unsafe code and C interop · Intrinsics |
