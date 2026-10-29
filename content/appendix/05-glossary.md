# Glossary

Terms the book and the reference use, with the reference page that defines each one. Most terms used inside a definition have their own entry.

## Core terms

| Term | Meaning | Reference page |
| --- | --- | --- |
| Owner | Whatever holds a value: a `let` binding, a parameter, a field, an array element or a temporary. Each value has exactly one owner, and the owner drops the value when it goes out of scope. | Ownership and moves |
| Move | Transferring ownership to a new owner. The source becomes moved and cannot be read again (OWN0001). A non-`Copy` value moves only where `move` is written, as in `let q = move p`. | Ownership and moves |
| Loan | What a borrow creates on the place it borrows. While a loan is active the compiler restricts other access to that place. A loan ends after the last use of every reference derived from it. | Borrowing |
| Lifetime | A named region of the program during which a borrow stays valid, written `'a`. `'static` lasts for the whole program. | Lifetimes |
| Row | A set of entries joined with `\|` in a header or Effect type. The failure row `! E` lists failure types; the requirement row `? R` lists services. Order does not matter. | Typed failures, Services and providers |
| Requirement | One entry of a requirement row: a borrowed service, `&S` (shared) or `&mut S` (exclusive), optionally with a role, as in `&mut Journal at Audit`. | Services and providers |
| Service | A named capability that effect functions require and callers supply, declared with `service Name { ... }`. It holds operation signatures only. | Services and providers |
| Provider | A value that implements a service (`impl Service for Type`) and is lent to an Effect to satisfy one requirement, for example with `Effect.provideMut`. | Services and providers |
| Role | A name declared with `role Name` that distinguishes requirement entries for the same service: `&S at Audit` and `&S` are separate entries with separate providers. A role has no body and no values. | Services and providers |
| Suspension | A running Effect stopping at a `run` and resuming later. A suspension point is a `run` whose Effect can suspend; parking an `Execution` is the only external suspension. | Suspension and cancellation |
| Trap | A fatal runtime error, such as arithmetic overflow, division by zero or an out-of-bounds index. It does not unwind and runs no cleanup, finalizers or `Drop` hooks. | Program entry and termination |
| Profile | A named build configuration, `[profiles.<name>]` in `silk.toml`. It builds for the host unless it sets `target`, and may set `optimization` (`none`, `speed` or `size`), `safety`, `debug` and other fields, plus parameter values under `config`. Selected with `--profile` or `[build].profile`. | Package parameters |
| Target | The machine a build compiles for, given as a triple such as `x86_64-unknown-linux-gnu` by `--target` or a profile. `silk/core/target` exposes its architecture, operating system and other facts to static code. | Static control flow and reflection |

## Other terms

| Term | Meaning | Reference page |
| --- | --- | --- |
| Anonymous aggregate | A record `.{ ... }` or tuple `( ... )` literal with no type context. Each literal has its own type. | Structs, tuples and arrays |
| Config (manifest) | A line under `[config]` in `silk.toml`, or `config.<module>.<parameter>` in a profile, that sets a package parameter's value, such as `main.port = 8080`. | Package parameters |
| Binding (variable) | A name introduced by `let`, a parameter or a pattern. | Bindings and statements |
| Borrow | `&e` or `&mut e`: a reference to a place that lends access without moving the value. | Borrowing |
| Bound | A requirement on a type parameter, as in `T: Order` or `T: 'a`. | Generics |
| Bound method | `value.method` without a call, which makes a callable with the receiver captured. | Closures and callable types |
| Callable | A value that can be called: a function literal, a named function used as a value, a staged call or a bound method. | Closures and callable types |
| Cancellation | Dropping a parked `Execution`. Owners live at the suspension point are dropped and non-parking finalizers run; the body does not resume. | Suspension and cancellation |
| Conformance | An `impl Interface for Type` that makes a type satisfy an interface. | Interfaces and impls |
| Contextual record | `.{ x: 1, y: 2 }`, a record literal whose type comes from where it is used. | Structs, tuples and arrays |
| `Copy` | The conformance for types that copy implicitly instead of moving: scalars, `string`, shared references, scalar enums and others. | Ownership and moves |
| Detached | `Intrinsic.Detached`: a sealed property of an executable that retains no external lexical or provider loan. | Suspension and cancellation |
| Directive | A fixed instruction written on the line before a function or service operation, such as `@inline`, `@cold` or `@features("avx2")`, that says how to build it but not what it means. The set is closed, and arguments are literals. A `with` clause, the older spelling, is PAR0011. | Intrinsics, Unsafe code and C interop |
| `Drop` | The conformance that gives a type a `fn drop` hook, run when its owner drops it. | Ownership and moves |
| Effect | A lazy computation value of type `Effect<'env; A ! E ? R>`. Calling an `effect fn` or writing `effect { ... }` builds one; nothing runs until `run`. | Effects and run |
| Environment | The lifetime a callable's or Effect's captured state lives for, written `fn<'env>` or `Effect<'env; ...>`. | Closures and callable types, Effects and run |
| Exclusive access | `&mut`: the only access to a place or service while it lasts. | Borrowing, Services and providers |
| Execution | An owner of a suspendable computation from `silk/concurrency/execution`. It parks and is woken by a `Wake`. | Suspension and cancellation |
| Failure | A value an effect raises with `fail` instead of succeeding. Its type appears in the failure row. | Typed failures |
| Fiber | A cooperative task on one thread, created with `Fiber.forkChild` and observed through a `Fiber<A, E>` handle. | Fibers and scheduling |
| Finalizer | Code that `Effect.ensuring` and related operations run after an Effect finishes. | Typed failures, Suspension and cancellation |
| Instance | One specialization of a generic declaration for one set of concrete arguments. | Generics |
| Interface | A named set of operations that types conform to with `impl`. | Interfaces and impls |
| Intrinsic | A compiler-provided operation, type or property in the `Intrinsic` namespace. | Intrinsics |
| Invocation mode | How often a callable can be called: shared (`fn`), mutable (`mut fn`) or once (`once fn`). | Closures and callable types |
| Manifest | The `silk.toml` file that describes a package. | The manifest |
| Module | One `.silk` source file, imported by its path, as in `import silk.collections.list`. | Modules and imports |
| `never` | The empty type: an expression of type `never` does not produce a value. | Values and primitive types |
| NonParking | `Intrinsic.NonParking`: a sealed property of an executable whose call graph cannot reach external parking. | Suspension and cancellation |
| Nominal union | A `union` declaration whose variants may carry named fields. | Enums and unions |
| Outcome | The success value or failure of an Effect, held or returned as data, as by `Effect.result`. | Typed failures |
| Package | A unit of compilation described by a manifest, named `name@version`. | The manifest |
| Package parameter | A named static value declared with `param` in a package's root module and set under `[config]` in `silk.toml` or by its default. | Package parameters |
| Park | Giving up the current `Execution` until a `Wake` makes it eligible again. | Suspension and cancellation |
| Place | Something that can be assigned, borrowed or moved from: a `mut` local, a field `p.x`, an element `a[i]` or a referent `r.*`. | Bindings and statements, Borrowing |
| Reborrow | Borrowing again through an existing reference, as in `&mut x.*`. | Borrowing |
| Referent | The value a reference points to, reached with `.*`. | Borrowing |
| Role marker | `#Role` after a reference type, as in `&Port #Reader`. The parser accepts it; this compiler reports it as unsupported. Requirement rows name a role with `at` instead. | Services and providers |
| Root module | The module `[package].main` names below `[package].source`; by default `src/main.silk`, or `src/lib.silk` for a library. | The manifest |
| `run` | The prefix that executes an Effect and yields its success value. | Effects and run |
| Row variable | `?R` in a generic list: a parameter that stands for a whole requirement row. | Services and providers |
| Scheduler | The service that runs fibers. `LocalScheduler` is the provided implementation. | Fibers and scheduling |
| Shared access | `&`: read access that may coexist with other shared access. | Borrowing, Services and providers |
| Slice | `&[T]` or `&mut [T]`: a borrowed view of a run of elements. | Structs, tuples and arrays |
| Specialization | Compiling a generic declaration separately for each set of concrete arguments. There is no runtime dispatch. | Generics |
| Staged call | A call with fewer arguments than parameters. The arguments fill the trailing parameters and the result is a callable for the leading ones: `combine(3)(2)(1)` is `combine(1, 2, 3)`. | Closures and callable types |
| Static evaluation | Running Silk code inside the compiler, for `const`, `let static`, `static fn`, static parameters and array lengths. | Static evaluation |
| Static value | A value known during static evaluation. | Static evaluation |
| Stored loan | A reference stored into a struct, array or out-parameter. Its loan stays alive as long as the container is used. | Borrowing |
| Structural union | An anonymous union type such as `i32 \| bool`. | Enums and unions |
| Unit | The type `()` and its only value `()`. | Values and primitive types |
| Unsafe | Code whose memory safety the compiler cannot check: `unsafe` blocks, functions and calls. | Unsafe code and C interop |
| `Without` | A row operator, `Without<R, S>`: row `R` with the entries of `S` removed. | Typed failures, Services and providers |
| WASI | The WebAssembly System Interface, the host API a WebAssembly program uses outside a browser. `--target wasm32-wasip1` builds a preview 1 module; `wasm32-wasip2` builds a preview 2 component and needs `wasm-tools`. | Targets and profiles |
| Witness | The conformance selected to supply an interface operation for one instance. | Generics |
