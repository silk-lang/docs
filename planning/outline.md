# Silk docs outline

## How this outline is built

The docs split into eight sections that follow a reader from install to reference. Every page below lists the topics it must cover, so we can move, merge or cut pages before any prose is written.

- **Sources.** The topics come only from the compiler, the std lib, the examples and the test corpus. None of the existing docs were read.
- **Audience order.** Learn first (install, tour, then the book), then the language reference (core language, effects, concurrency, static evaluation), then projects, tools and task guides, then the generated API reference.
- **One home per concept.** A concept is explained on one page. Other pages link to it instead of repeating it.
- **Hand-written pages explain, the API reference lists.** Guides link into generated std lib pages for signatures, and never copy them.
- **The native compiler is the only `silk`.** The TypeScript bootstrap stays out of user docs and appears only in contributor notes.

## Sections at a glance

Eight sections, about 82 hand-written pages plus the generated API reference. Effects and services, concurrency and static evaluation are parts of the language reference, and the book teaches each of them in its own chapter.

| # | Section | Who it's for | Pages |
| --- | --- | --- | --- |
| 1 | Get started | Someone who has never run silk | 4 |
| 2 | The Silk book | Learning the whole language by building one program, read in order | 13 |
| 3 | Language reference | Looking up the language: syntax, rules, diagnostics, including effects, concurrency and static evaluation | 27 |
| 4 | Projects and packages | Setting up silk.toml, modules, dependencies, workspaces, targets | 8 |
| 5 | Tools | Using the silk CLI: test, format, check, docs | 7 |
| 6 | Guides | Doing a task with the std lib (files, HTTP, TLS, JSON, testing with providers…) | 18 |
| 7 | Std lib API reference | Signatures and per-declaration docs, generated | 177 modules |
| 8 | Appendix | Quick lookup: keywords, precedence, diagnostic codes, glossary | 5 |

## 1. Get started

Four short pages that take a newcomer from nothing to a running program and a working editor.

| Page | Topics |
| --- | --- |
| Install | `install.sh` one-liner; supported hosts (Apple Silicon macOS, x86\_64 and arm64 Linux; Intel Macs not supported); Clang 22+ requirement and `SILK_CLANG`; install location `SILK_INSTALL` (default `~/.silk`) and what lands there; pinning a release with `SILK_RELEASE`; adding to `PATH`; checking with `silk --version`; upgrading and uninstalling |
| Your first program | `silk init`; the generated `silk.toml`, `src/main.silk`, `.gitignore`; `silk run` and passing arguments after `--`; `main` returning `i32` as the exit code; `silk build` and where the executable lands under `build/` |
| A tour of Silk | One small program read top to bottom: structs and unions, `match`, `let`/`let mut`, moves and borrows, an `effect fn` with a failure row, `run`, importing from the std lib. Every paragraph links to its Language page |
| Editor setup | VS Code extension; Zed extension (tree-sitter-silk); tree-sitter grammar for other editors (Neovim, Helix); silk-highlight for websites (Shiki, TanStack); what works today (highlighting) and what's coming (language server) |

## 2. The Silk book

A narrative path through the whole language in thirteen chapters, written to be read in order. Chapters build one small program that grows from a command-line tool into a networked service. Each chapter teaches by doing and links to the reference pages for the full rules, so the book never has to be complete.

| Chapter | What you learn | Reference pages |
| --- | --- | --- |
| 1. Hello, Silk | Creating a project, `main`, printing with a logger, running and building | Get started, Program entry |
| 2. Values and functions | Bindings, primitive types, operators, `if` and `while`, writing functions | Lexical structure, Values, Expressions, Control flow, Functions |
| 3. Modeling data | Structs, tuples, enums, unions, `match` and patterns | Structs, Enums and unions, Patterns |
| 4. Ownership | Moving values, `Copy`, borrowing with `&` and `&mut`, reading OWN errors | Ownership and moves, Borrowing |
| 5. Lifetimes in practice | When you need to name a lifetime, structs that hold borrows, `'static` text | Lifetimes |
| 6. Interfaces and generics | Writing a generic function, declaring an interface, operator interfaces, closures | Generics, Interfaces, Closures |
| 7. Effects and failures | Why effects; turning a function into an `effect fn`, `run`, failing with typed errors, catching them, cleanup with `ensuring` | Effects and run, Typed failures |
| 8. Services and providers | Requiring a clock and a filesystem, providing real ones in `main` and fakes in tests | Services and providers, Testing with providers guide |
| 9. Text, collections and memory | Strings and formatting, `List` and `HashMap`, where allocation comes from | Allocation, Text and Collections guides |
| 10. Doing things at once | Forking fibers, joining them, sleeping, cancellation | Fibers and scheduling, Suspension and cancellation |
| 11. Work at compile time | A static parameter, `static if` per target, deriving code with reflection | Static evaluation, Static control flow and reflection, Package parameters |
| 12. Modules, packages and tests | Splitting into modules, a library package, `pub`, writing and running tests | Projects and packages, Testing |
| 13. Putting it together | The finished program as a small HTTP service over TLS, with tests | HTTP server, TLS guides |

## 3. Language reference

The reference for the language: twenty-seven pages in eight parts, terse and complete rather than narrative. Each page gives the syntax, the rules, short examples and the diagnostics that enforce them, and links to the std lib modules it touches. Effects and services, concurrency and static evaluation are parts of it, because their keywords and rules are core syntax.

### Basics

| Page | Topics | Links into API |
| --- | --- | --- |
| Lexical structure | Line comments `//`; doc comments `///` and `//!`; plain `////`; no block comments; identifiers; keywords and contextual words (`where`, `provides`, `test`, `in`, `with`, `some`…); integer literals (`0x`, `0b`, `0o`, `_` separators); floats; duration literals (`1ns`, `5ms`, `2h`); strings, escapes, `"""` triple-quoted, raw `r"…"`; byte strings `b"…"`; char literals and their `u8` reading | `silk/char`, `silk/string` |
| Values and primitive types | Integer types and their sizes; `usize`/`isize` per target; `f32`/`f64`; `bool`; `char`; `string<'a>`; unit `()`; `never`; checked conversions; overflow, divide-by-zero and bounds traps | `silk/u8`…`silk/i64`, `silk/f64`, `silk/numeric` |
| Bindings and statements | `let`, `let mut`, type annotations, pattern lets; assignment (no compound assignment); blocks; `return` and the implicit unit return; discarding values; the `drop` statement (detail lives in Ownership) |  |
| Expressions and operators | Operator table and precedence; the pipeline operator `\|>`; short-circuit `&&` and `\|\|`; no shift operators; operators come from std lib interfaces, imports never turn them on; dereference `.*`; field, tuple and index access | `silk/ops`, `silk/equal`, `silk/order` |
| Control flow | `if`/`else if`/`else`; `if let`; `while`; `break`, `continue`; no `for`, `loop` or labels yet; while let (planned) for draining iterators and queues; how to iterate today (indices, slice and collection helpers); `never` and diverging calls | `silk/slice`, `silk/vector` |
| Program entry and termination | `pub fn main() -> i32` and exit codes; `pub effect fn main()` with failure and requirement rows; what happens on an uncaught failure; traps and how they're reported; reading arguments and standard input | `silk/host_input`, `silk/native_report` |

### Data

| Page | Topics | Links into API |
| --- | --- | --- |
| Structs, tuples and arrays | `struct` declarations, `pub` fields; record literals and contextual `.{ … }`; `tuple` types and `.0`; fixed arrays `[T; N]`; slices `&[T]` and `&mut [T]` | `silk/slice` |
| Enums and unions | Scalar `enum`; tagged `union` with payload variants; generic unions; anonymous structural unions `A \| B`; Option and Result as ordinary std lib unions | `silk/option`, `silk/result` |
| Patterns and match | Pattern kinds (binding, `_`, literal, variant with fields, binder, `..` rest); guards; exhaustiveness; match modes `match &x`, `match &mut x`, `match move x`, `match place`; `if let` |  |

### Functions and abstraction

| Page | Topics | Links into API |
| --- | --- | --- |
| Functions and methods | `fn`, parameters and return types; `pub`; inherent `impl` blocks; receivers `self: Self`, `&Self`, `&mut Self`; associated functions and calling them; bound method values |  |
| Closures and callable types | Function literals; capture modes (copy, shared, mutable, `move`); callable types `fn(A) -> B`; `once fn`; storing and passing callables; partial application (\`combine(3)\` returns a callable for the remaining arguments); higher-ranked `for<'a> fn` |  |
| Generics | Type, lifetime, row (`?R`) and static parameters; explicit type arguments `f<T>(x)`; bounds inline and in `where`; monomorphization; opaque returns `some<F: …> F`; `typeof` |  |
| Interfaces and impls | `interface`; `impl X for T`; impls bound to existing functions (`impl Mixer for i32 { mix: … }`); generic impls; operator interfaces; `Copy` and `Drop` as interfaces; `Self` | `silk/ownership`, `silk/ops`, `silk/hash` |

### Memory and ownership

| Page | Topics | Links into API |
| --- | --- | --- |
| Ownership and moves | Every value has one owner; explicit `move` (no implicit moves); opting into copying with `impl Copy`; partial moves; `drop x`; destructors with `impl Drop`; cleanup order at scope end and on failure | `silk/ownership` |
| Borrowing | Shared `&T` and exclusive `&mut T`; slices; dereference and reborrow (`&mut x.*`); what a loan blocks while it lives; borrows in `match`; storing a borrow into a place (stored loans); reading OWN errors |  |
| Lifetimes | Naming lifetimes `'a`; outlives bounds `'a: 'b`; `'static`; elision rules; lifetimes on structs, impls and effect functions; lifetime arguments at call sites; higher-ranked callables |  |
| Allocation and shared ownership | Allocation as a requirement (`? &mut Allocator`) instead of a global heap; out-of-memory as a typed failure; `Box`; `Vector`; local shared ownership with `Shared` (`with`/`withMut`, why it can't cross suspension) | `silk/allocator`, `silk/box`, `silk/vector`, `silk/shared` |

### Effects and services

| Page | Topics | Links into API |
| --- | --- | --- |
| Effects and run | effect fn versus fn; calling builds an Effect value and run executes it; effect blocks; the Effect<'env; A ! E ? R> type; storing and passing effects; once effects; opaque some\<F: Effect<…>> F; effect<'env> environment lifetimes; pub effect fn main | silk/effect |
| Typed failures | Failure rows (! A, several types joined); fail; propagation through run; catch, catchAll, mapError, result; ensuring finalizers and their order; drops on failure; never; failures versus traps | silk/effect, silk/result |
| Services and providers | Requirement rows (? &S, ? &mut S); shared versus exclusive requirements; declaring a service; how requirements flow to callers; Without; impl Service for Type; provide, provideMut, provideEffect, bindRequirement; roles (&Service at Role); in and provides constraints in where clauses; row variables ?R; what main is given | silk/effect |

### Concurrency

| Page | Topics | Links into API |
| --- | --- | --- |
| Fibers and scheduling | One thread, cooperative fibers; forkChild, join, await and Outcome; yieldNow; the Scheduler service and LocalScheduler; StalledError; what the runtime sets up for main; sleeping and timers | silk/fiber, silk/scheduler, silk/local\_scheduler |
| Suspension and cancellation | Where a program can suspend; what may stay alive across a suspension and the OWN errors when it can't; Shared access and suspension; cancelling fibers and their children; what runs on cancel; nonParking; Execution, park and wake for library authors | silk/fiber, silk/execution, silk/shared |

### Static evaluation

| Page | Topics | Links into API |
| --- | --- | --- |
| Static evaluation | The static phase; what may run statically; determinism and evaluation budgets; const, let static and static fn; static parameters and one instance per value; static text and sequences; how static errors are reported | silk/static\_text, silk/static\_sequence |
| Static control flow and reflection | static if and static for; compileError; what is checked in an unselected branch; reflection (Reflect.typeOf, fields, labels, kinds, ordinals); typeof; target and build queries; specialization | silk/reflect, silk/target, silk/compilation |
| Package parameters | param name: T = default; validating with where; pub param; values from silk.toml bindings and profiles; a parameter that depends on another | silk/compilation |

### Advanced

| Page | Topics | Links into API |
| --- | --- | --- |
| Unsafe code and C interop | `unsafe` blocks, functions and call expressions; raw pointers (`*const T`, `*mut T`, nullable and many-element forms); the `Pointer` API; `extern "C"` functions and statics; `export "C"`; C-layout structs; variadics; callbacks; what the compiler refuses (unwinding, suspension inside exports) | `silk/pointer`, `silk/raw_buffer`, `silk/layout` |
| Intrinsics | The Intrinsic namespace: always public, some members unsafe; what it holds (operations, reflection, target queries, requirement binding, execution and allocation primitives); when to use an intrinsic directly versus its std lib wrapper; how unsafe intrinsics are marked and called | Intrinsic reference (generated) |

## 4. Projects and packages

Eight pages on how code is organized and built, from one file up to a workspace of packages.

| Page | Topics |
| --- | --- |
| The manifest | `silk.toml` found by walking up from the current directory; `[package]` keys (`name`, `version`, `silk-version`, `root`, `source-root`, `exports`); unknown keys are errors; a full key reference table for every table below |
| Modules and imports | One file is one module; dotted paths map to files under the source root; `import a.b`, `import a.b as X`, `import a.b { X, Y as Z }`; re-exports with `pub import`; `pub` versus private items and fields |
| The standard library | `silk.*` modules are always available with no dependency entry; module names use underscores (`silk.http_client`); the recommended import line on each API page; where the std lib is found and `--stdlib`; reserved names `silk` and `Intrinsic` |
| Dependencies | Path dependencies `name = { path = "…" }`; the optional `package` name check; naming rules; no cycles, one version per package; importing from a dependency by its name |
| Libraries and exports | `[package].exports` decides which modules other packages may import; library artifacts (static, shared, loadable module, object); a small two-package walkthrough |
| Workspaces | `[workspace].members`; the shared output directory; running `build`, `test` and `format` from the workspace root |
| Targets and profiles | Supported targets (Apple Silicon macOS, Linux x86\_64 and arm64 with and without libc, `wasm32-unknown-unknown`); `--target`; `--release` and optimization levels; named `[profiles.<name>]` and their fields (libc, safety, threading, sanitizers, relocation…); how the std lib surface changes per target, linking to the per-target API pages |
| Build outputs and native linking | The `build/` layout per target and profile; artifact kinds and stages (`llvm-ir`, `assembly`, `object`); how Clang is found (`SILK_CLANG`, `--clang`); macOS SDK discovery; extra native link inputs; runtime composition in `[build].composition` (advanced) |

## 5. Tools

Seven pages on the `silk` command beyond building.

| Page | Topics |
| --- | --- |
| Command-line reference | Every command (`init`, `build`, `run`, `check`, `test`, `format`, `clean`, `doc`, `doctest`, `doc-reference`, `changes`) with its flags and exit codes; shared project flags (`--manifest-path`, `--target`, `--profile`, `--release`); single-file `build` and `test` forms; environment variables |
| Testing | `test fn` and `test effect fn`; assertions from `silk.testing`; how tests are discovered from a root module; `--root`, `--file`, `--filter`; where the test runner is built; testing effectful code with fake providers (links to Testing with providers) |
| Formatting | `silk format` on a package or on paths; `--check` for CI; what the outcomes and exit codes mean |
| Diagnostics and `silk check` | Reading an error (`path:line:column: error[CODE]` plus notes); code families (LEX, PAR, MOD, SEM, OWN, LAY) and where each comes from; `silk check --json` for tools and CI; link to the full code list in the appendix |
| Writing documentation | `///` and `//!` comments; the When to use, Details, Gotchas and Examples headings; linking to declarations with `[Name]`; anchors; examples in comments |
| Doc tests and reference generation | `silk doctest` (each `silk` block type-checks as its own module, `ignore` to skip); `silk doc` JSON output and `--include-private`; generating Markdown reference pages for your own package (planned: `doc-reference` for any package, not only the std lib) |
| Changesets and releases | `silk changes add`, `status`, `version`, `since`, `recover`; migration notes; pre-release tags; using it to version and release your own package; the `[changes]` manifest table |

## 6. Guides

Eighteen task pages, one per std lib area that needs a walkthrough. Each guide builds one small working program, explains the choices it makes, and ends with links to every module it used. Areas that are simple lookups (integer types, hashing primitives, URI helpers) get no guide, only API pages.

| Guide | Topics | Links into API |
| --- | --- | --- |
| Text and formatting | `string` versus bytes; UTF-8 decoding; chars and Unicode properties; building text with `Format.format("{name}", &value)` and escaping braces | `silk/string`, `silk/utf8_decoder`, `silk/unicode`, `silk/format` |
| Collections | `Vector`, slices, `HashMap`, `HashSet`, `Bytes`; making your own type hashable and comparable | `silk/vector`, `silk/hash_map`, `silk/hash_set`, `silk/bytes`, `silk/hash` |
| Output, logging and standard input | Writers and loggers as services; `StdoutLogger`; reading standard input; swapping providers in tests | `silk/writer`, `silk/logger`, `silk/os_logger`, `silk/standard_input` |
| Files and directories | The `FileSystem` service and `Path`; reading and writing whole files; atomic writes and durability; temporary directories; file errors; an in-memory filesystem for tests | `silk/filesystem`, `silk/os_filesystem` |
| Child processes | Spawning, arguments and environment; pipes to and from the child; exit status; process errors | `silk/child_process` |
| Time and randomness | System versus monotonic clocks; durations; sleeping; secure versus insecure random numbers and seeding | `silk/system_clock`, `silk/monotonic_clock`, `silk/random`, `silk/insecure_random` |
| Byte streams and buffering | The `ByteDuplex` model; deadlines; buffered input and output; copying between streams; in-memory streams for tests | `silk/byte_duplex`, `silk/buffered_input`, `silk/buffered_output`, `silk/buffered_transfer` |
| Networking | Resolving addresses; connecting and listening with sockets; timeouts | `silk/network_address`, `silk/resolver`, `silk/native_socket` |
| HTTP client | `fetch` for one request versus a client versus a connection pool; headers and bodies; redirects; proxies; content decoding; HTTPS | `silk/http_fetch`, `silk/http_client`, `silk/http_connection_pool`, `silk/http_redirect`, `silk/http_proxy` |
| HTTP server and WebSockets | Accepting connections and serving requests; routing on the request target; writing responses and bodies; upgrading to a WebSocket and exchanging messages | `silk/http_server`, `silk/websocket_upgrade`, `silk/websocket_server` |
| TLS, certificates and trust | Trust sources, anchors and snapshots; loading the system bundle or a PEM file; certificate path validation; HTTPS identity; TLS client connections | `silk/tls_client`, `silk/trust_source`, `silk/certificate`, `silk/certificate_bundle` |
| Cryptography | Hashing (SHA-1/2/3); HMAC and HKDF; authenticated encryption (AES-GCM, ChaCha20-Poly1305); key agreement (X25519, P-256); signatures (P-256, P-384, RSA verification) | `silk/sha2`, `silk/hmac`, `silk/aes_gcm`, `silk/x25519`, `silk/p256`, `silk/rsa` |
| JSON and TOML | Value trees versus streaming readers versus typed codecs; deriving a codec with reflection; writing output | `silk/json_value`, `silk/json_reader`, `silk/json_codec`, `silk/json_reflect`, `silk/toml_value`, `silk/toml_codec` |
| Encodings and compression | Base64; URI parsing and percent-encoding; inflate (gzip/deflate) and Zstandard decoding | `silk/base64`, `silk/uri`, `silk/inflate`, `silk/zstd` |
| No-libc Linux and WebAssembly | What changes without libc; `wasm32-unknown-unknown`; startup modules; which std lib modules exist per target and how to read the per-target API pages | `silk/target`, `silk/raw_linux`, `silk/wasm_start` |
| Testing with providers | Swapping real providers for fakes: a fixed clock, an in-memory filesystem, an in-memory byte stream, a capturing writer or logger, a counting allocator; asserting on failures | silk/testing, silk/memory\_byte\_duplex, silk/filesystem |
| Concurrent I/O patterns | Serving many connections at once; running requests in parallel and joining them; producer and consumer fibers; timeouts around any effect | silk/fiber, silk/http\_server, silk/http\_client |
| Writing effect combinators | Higher-order effects; generic effectful code with row variables; writing your own retry or timeout; borrowing rules inside effect blocks and closures | silk/effect |

## 7. Std lib API reference

The API reference is the last section, generated by `silk doc-reference` from std lib doc comments, one page per module (177 modules today). It is never edited by hand: fixing a page means fixing the doc comment and regenerating.

**What a generated page already has.** A module page opens with a summary, then When to use, Details, Gotchas and Examples, the import line, and the profiles it applies to. Each public declaration gets a short anchor such as `AesGcmError.InvalidTagLength`. A module whose public surface differs per target gets one page per surface (the `.profile-2` pages, for example `http-server-native` on no-libc and wasm).

**How it sits in the site.** The API reference is published exactly as docgen produces it, index included. This outline doesn't restructure it and only covers the hand-written parts.

**Intrinsic reference.** The `Intrinsic` namespace (about 700 members) is public, so it gets its own generated page set beside the std lib modules, built from the compiler's intrinsic catalog. Unsafe members are marked as such. The Intrinsics page in the Language reference explains the namespace and links here.

**How hand-written pages link into it.**

1. Every guide and language page ends with an "API reference" box listing the modules it uses.
2. Inline mentions of a std lib name link to its anchor, written as module path plus declaration, for example `silk/fiber#Fiber` or `silk/aes_gcm#AesGcmError.InvalidTagLength`. A link checker fails the build when an anchor disappears.
3. Generated pages link back the other way: a module's When to use section can point at the guide that teaches it (`silk/http_server` → HTTP server guide). This needs a small doc-comment convention for linking to hand-written pages.
4. Language pages that explain a built-in concept (ownership, effects, Option/Result) link to the std lib type that carries it rather than re-listing its methods.

## 8. Appendix

Five lookup pages, hand-written for now.

| Page | Topics | Source |
| --- | --- | --- |
| Keywords | Every keyword and contextual word with a one-line meaning and a link to its page | Hand-written for now (generating it is postponed) |
| Operators | Precedence table, operator interfaces each operator maps to | Hand-written from the parser's precedence table |
| Diagnostic codes | Every LEX, PAR, MOD, SEM, OWN and LAY code with its message, a failing example and the fix | Hand-written for now (generating it is postponed) |
| Grammar summary | Compact grammar of declarations, statements, expressions, patterns and types | Hand-written |
| Glossary | Owner, move, loan, lifetime, row, requirement, service, provider, role, suspension, trap, profile, target | Hand-written |

## Open questions

- [x] **One Language section or two?** The outline merges the tutorial and the reference into one set of pages in learning order. The alternative is a short "book" plus a terse spec-style reference. Decided: two, a book (section 2) plus a reference (section 3, which also covers effects, concurrency and static evaluation).
- [x] **Iteration.** There is no `for` or `loop`, only `while` and collection helpers. Is a `for` loop planned? Decided: while let comes first, a for loop maybe later. The Control flow page covers while let once it lands.
- [x] **Which `Intrinsic.*` names are public?** Corpus programs call `Intrinsic.replace` and `Intrinsic.bindRequirement` directly. Decided: all of Intrinsic is public, some members unsafe. It gets an Intrinsics page and a generated reference.
- [ ] **Generator fix before linking.** About 68 generated impl headings render an empty type name ("Implementation \`\`"), in the generated pages in reference/stdlib (for example box.md, where impl\<T> Box\<T> gets an empty heading and the bare anchor impl), so their anchors aren't safe link targets yet. The fix belongs in docgen, not in the docs.
- [ ] **Generated appendix pages.** Should the keyword list and diagnostic codes come from a `silk` command, like `doc-reference` does for the std lib? Postponed: both pages are hand-written for now.
- [x] **Platform modules.** Keep the `native-*`, `os-*` and `raw-*` std lib API pages (for example silk/native\_filesystem, silk/os\_filesystem, silk/raw\_linux) in a separate sub-index of the API reference, or leave them out of the site? Decided: the API reference stays as docgen generates it.
- [x] **Changesets.** Is `silk changes` meant for users, or only for this repo's releases? Decided: for users through the CLI, not as a library. The Changesets and releases page in Tools stays and covers only the command.
- [x] **`doc-reference` for user packages.** Should users get Markdown pages for their own packages, or does `doc-reference` stay std lib only? Decided: users get pages for their own packages. doc-reference needs to grow to support it.
