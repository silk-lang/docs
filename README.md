# Silk documentation

- [Get started](get-started/): install Silk, write a first program and set up an editor.
- [The Silk book](book/): learn the language by building one program, chapter by chapter.
- [Language reference](reference/): the rules of the language, one topic per page.
- [Projects and packages](projects/): manifests, modules, dependencies, workspaces and builds.
- [Tools](tools/): the `silk` command, testing, formatting, diagnostics and releases.
- [Guides](guides/): task-focused pages on the standard library.
- [Appendix](appendix/): keywords, operators, diagnostic codes, grammar and glossary.

The std lib API reference is not in this repo. It is generated from the compiler repo, [silk-lang/silk](https://github.com/silk-lang/silk), into `reference/stdlib` by `silk doc-reference`.

Pages that need an update later are tracked as [issues](https://github.com/silk-lang/docs/issues).

## Index

### Get started

- [Overview](get-started/00-overview.md)
- [Install](get-started/01-install.md)
- [Your first program](get-started/02-your-first-program.md)
- [A tour of Silk](get-started/03-a-tour-of-silk.md)
- [Editor setup](get-started/04-editor-setup.md)

### The Silk book

- [Overview](book/00-overview.md)
- [1. Hello, Silk](book/01-hello-silk.md)
- [2. Values and functions](book/02-values-and-functions.md)
- [3. Modeling data](book/03-modeling-data.md)
- [4. Ownership](book/04-ownership.md)
- [5. Lifetimes in practice](book/05-lifetimes-in-practice.md)
- [6. Interfaces and generics](book/06-interfaces-and-generics.md)
- [7. Effects and failures](book/07-effects-and-failures.md)
- [8. Services and providers](book/08-services-and-providers.md)
- [9. Text, collections and memory](book/09-text-collections-and-memory.md)
- [10. Doing things at once](book/10-doing-things-at-once.md)
- [11. Work at compile time](book/11-work-at-compile-time.md)
- [12. Modules, packages and tests](book/12-modules-packages-and-tests.md)
- [13. Putting it together](book/13-putting-it-together.md)

### Language reference

- [Overview](reference/00-overview.md)
- [Lexical structure](reference/01-lexical-structure.md)
- [Values and primitive types](reference/02-values-and-primitive-types.md)
- [Bindings and statements](reference/03-bindings-and-statements.md)
- [Expressions and operators](reference/04-expressions-and-operators.md)
- [Control flow](reference/05-control-flow.md)
- [Program entry and termination](reference/06-program-entry-and-termination.md)
- [Structs, tuples and arrays](reference/07-structs-tuples-and-arrays.md)
- [Enums and unions](reference/08-enums-and-unions.md)
- [Patterns and match](reference/09-patterns-and-match.md)
- [Functions and methods](reference/10-functions-and-methods.md)
- [Closures and callable types](reference/11-closures-and-callable-types.md)
- [Generics](reference/12-generics.md)
- [Interfaces and impls](reference/13-interfaces-and-impls.md)
- [Ownership and moves](reference/14-ownership-and-moves.md)
- [Borrowing](reference/15-borrowing.md)
- [Lifetimes](reference/16-lifetimes.md)
- [Allocation and shared ownership](reference/17-allocation-and-shared-ownership.md)
- [Effects and run](reference/18-effects-and-run.md)
- [Typed failures](reference/19-typed-failures.md)
- [Services and providers](reference/20-services-and-providers.md)
- [Fibers and scheduling](reference/21-fibers-and-scheduling.md)
- [Suspension and cancellation](reference/22-suspension-and-cancellation.md)
- [Static evaluation](reference/23-static-evaluation.md)
- [Static control flow and reflection](reference/24-static-control-flow-and-reflection.md)
- [Package parameters](reference/25-package-parameters.md)
- [Unsafe code and C interop](reference/26-unsafe-code-and-c-interop.md)
- [Intrinsics](reference/27-intrinsics.md)

### Projects and packages

- [Overview](projects/00-overview.md)
- [The manifest](projects/01-the-manifest.md)
- [Modules and imports](projects/02-modules-and-imports.md)
- [The standard library](projects/03-the-standard-library.md)
- [Dependencies](projects/04-dependencies.md)
- [Libraries and exports](projects/05-libraries-and-exports.md)
- [Workspaces](projects/06-workspaces.md)
- [Targets and profiles](projects/07-targets-and-profiles.md)
- [Build outputs and native linking](projects/08-build-outputs-and-native-linking.md)

### Tools

- [Overview](tools/00-overview.md)
- [Command-line reference](tools/01-command-line-reference.md)
- [Testing](tools/02-testing.md)
- [Formatting](tools/03-formatting.md)
- [Diagnostics and silk check](tools/04-diagnostics-and-silk-check.md)
- [Writing documentation](tools/05-writing-documentation.md)
- [Doc tests and reference generation](tools/06-doc-tests-and-reference-generation.md)
- [Changesets and releases](tools/07-changesets-and-releases.md)

### Guides

- [Overview](guides/00-overview.md)
- [Text and formatting](guides/01-text-and-formatting.md)
- [Collections](guides/02-collections.md)
- [Output, logging and standard input](guides/03-output-logging-and-standard-input.md)
- [Files and directories](guides/04-files-and-directories.md)
- [Child processes](guides/05-child-processes.md)
- [Time and randomness](guides/06-time-and-randomness.md)
- [Byte streams and buffering](guides/07-byte-streams-and-buffering.md)
- [Networking](guides/08-networking.md)
- [HTTP client](guides/09-http-client.md)
- [HTTP server and WebSockets](guides/10-http-server-and-websockets.md)
- [TLS, certificates and trust](guides/11-tls-certificates-and-trust.md)
- [Cryptography](guides/12-cryptography.md)
- [JSON and TOML](guides/13-json-and-toml.md)
- [Encodings and compression](guides/14-encodings-and-compression.md)
- [No-libc Linux and WebAssembly](guides/15-no-libc-linux-and-webassembly.md)
- [Testing with providers](guides/16-testing-with-providers.md)
- [Concurrent I/O patterns](guides/17-concurrent-io-patterns.md)
- [Writing effect combinators](guides/18-writing-effect-combinators.md)

### Appendix

- [Overview](appendix/00-overview.md)
- [Keywords](appendix/01-keywords.md)
- [Operators](appendix/02-operators.md)
- [Diagnostic codes](appendix/03-diagnostic-codes.md)
- [Grammar summary](appendix/04-grammar-summary.md)
- [Glossary](appendix/05-glossary.md)
