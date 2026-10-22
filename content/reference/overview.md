This directory is the prescriptive programmer-facing reference for Silk's language rules. It states
the intended language behavior against which the compiler, standard library, tests, and other
documentation are reconciled. It is assembled during language stabilization from author decisions,
OpenSpec requirements, tests, and compiler behavior.

## Audience

The primary reader is a programmer writing Silk who knows general programming concepts but does not
know Silk compiler internals. Familiarity with Rust, Effect, or Effect TypeScript may help, but is
not assumed.

Language and compiler contributors are a secondary audience. Evidence links connect each rule to
the detailed artifacts used to verify or reconcile it.

## Authority during stabilization

Each rule carries one status:

- **Confirmed** — the language author has explicitly confirmed the intended programmer-visible
  behavior during stabilization.
- **Candidate** — existing decisions, specifications, tests, and implementation support one
  coherent rule, but the author has not yet confirmed it.
- **Disputed** — authoritative-looking artifacts disagree or the implementation contradicts the
  intended rule.
- **Unsupported** — the boundary is deliberate and programmer-visible.
- **Unresolved** — no coherent rule has been selected.

Confirmed rules prescribe intended Silk semantics but do not create a compatibility promise before
1.0. Candidate, disputed, and unresolved rules mark the exact places where the prescription is not
yet final. Existing OpenSpec requirements and tests remain trace evidence; stabilization work must
reconcile them with confirmed rules rather than silently preserving a contradiction.

## Reference shape

Every rule uses the same compact structure:

1. **Status**
2. **Rule** — one programmer-visible statement
3. **Example** — the smallest useful valid program or fragment
4. **Boundary** — the nearest program that is invalid or behaves differently
5. **Diagnostics** — the source error required at an invalid boundary. Rules that only define valid
   behavior say that no diagnostic applies.
6. **Evidence** — decisions, specifications, tests, and known implementation mismatches

A required diagnostic describes the language contract independently from the current compiler. It
states the invalid condition, the offending source location, and the information the error must
communicate. A stable diagnostic code is recorded when one exists; an unassigned code remains
explicit rather than borrowing an unrelated current code. Exact message wording belongs to the
generated diagnostic catalog, not to the language rule.

Defining intended semantics comes before a systematic implementation audit. A current compiler
mismatch is recorded when stabilization work encounters one, but discovering every mismatch is not
a prerequisite for confirming a language rule.

Compiler representations such as TIR, MIR, generated runners, layouts, and backend instructions do
not belong in a language rule unless a program can observe them.

## Contents

- [Artifact roots and native requirements](/docs/reference/artifact-roots-and-requirements)
- [LLVM helper capabilities](/docs/reference/llvm-helper-capabilities)
- [Lexical form](/docs/reference/lexical-form) — identifiers, the closed keyword vocabulary, comments, numeric
  and duration spellings, text and byte forms, character literals, and longest tokenization.
- [Program entry](/docs/reference/program-entry) — ordinary and effectful `main`, automatic Effect execution,
  unhandled typed failures, and requirement closure.
- [Tests and the source runner](/docs/reference/testing) — test declarations, import-graph discovery, static
  descriptors, authored fingerprints, runtime filters, sequential execution, and exit behavior.
- [Statements and discarded values](/docs/reference/statements-and-discarding) — which expression results may be
  ignored and how `drop` makes intentional discard explicit.
- [Effects and execution](/docs/reference/effects-and-execution) — effect construction, success values, `run`,
  nested Effects, and the two delayed boundaries of effectful anonymous callables.
- [Effect suspension and stack-safe recursion](/docs/reference/effect-suspension) — the explicit suspension
  boundary, covered recursive cycles, exact channel preservation, ownership and cleanup, logical
  depth, supported-target behavior, pay-for-use, and the boundary with future async execution.
- [Independently resumable Effect executions](/docs/reference/independent-execution) — explicit caller-funded
  Execution ownership, activation, external parking, Wake readiness, cancellation, cleanup, and the
  ordinary-source scheduling boundary.
- [Single-threaded schedulers and Fibers](/docs/reference/single-threaded-fibers) — explicit scheduler entry,
  atomic child publication, affine observation, deterministic readiness, structured cancellation,
  typed shutdown, and provider reuse.
- [Effect contracts](/docs/reference/effect-contracts) — success, failure, and requirement channels; declaration
  bounds; generic failure types and requirement rows; and finite compatible Effect joins.
- [Requirements and services](/docs/reference/requirements-and-services) — runtime-provided capabilities,
  dependency-eligible interfaces, conformances, roles, access, provision, and requirement-row
  operations.
- [Typed failures](/docs/reference/typed-failures) — ordinary failure values, propagation, recovery, cleanup,
  diagnostic context, and fatal traps.
- [Language style guide](/docs/reference/style-guide) — non-semantic naming and data-first actor-function
  conventions for readable, composable, and extensible Silk APIs.
- [Doc comment style guide](/docs/reference/documentation-style-guide) — required public comment coverage,
  standard sections, complete examples, symbol links, and ASD-STE100 writing rules.
- [Lifetimes and elision](/docs/reference/lifetimes) — named validity bounds, borrowed contents, header defaults,
  quantified callable contracts, retained environments, region checking, and inspectable lifetime
  expansion.
- [Ownership and borrowing](/docs/reference/ownership-and-borrowing) — Copy and affine values, moves, borrows,
  mutation, anonymous capture modes, cleanup, allocation lifecycles, and returned views.
- [Allocation-backed local shared ownership](/docs/reference/local-shared-ownership) — `Shared<T>` construction,
  affine strong handles, callback-scoped access, conflict traps, exact last-handle cleanup, and the
  explicit cycle and thread-transfer boundaries.
- [Functions, callables, and control flow](/docs/reference/functions-callables-and-control-flow) — named and
  anonymous callable contracts, exact callable identities, Effect-block terminal inference, ordered
  calls, returns, callable sections, pipelines, conditionals, loops, and matches.
- [Static evaluation](/docs/reference/static-evaluation) — static functions, parameters, bindings, statement-only
  selection, compile errors, value and mutation limits, deterministic diagnostics, target values,
  and the residual runtime boundary.
- [Patterns and destructuring](/docs/reference/patterns-and-destructuring) — one pattern language across exact
  union-member matches, scalar enum member matches, irrefutable local destructuring, and
  conditional `if let`.
- [Values and types](/docs/reference/values-and-types) — foundational scalars, duration literals, nominal structs, fixed
  arrays, lexical views, nominal and structural unions, scalar enums, precise inference, and
  compatibility.
- [Expressions and operators](/docs/reference/expressions-and-operators) — deterministic evaluation, anonymous
  callable syntax, expression composition, scalar and explicitly declared custom operators, scalar
  enum equality, short-circuiting, assignment, atomic replacement, and explicit conversion.
- [Modules, names, and visibility](/docs/reference/modules-names-and-visibility) — path-derived module identity,
  source-root lookup, contextual import-path segments, static imports, cycles, namespace bindings,
  aliases, collisions, nominal qualifiers and associated items, public declaration boundaries,
  redundancy, explicit standard-library imports, re-export boundaries, and packages with path
  dependencies.
- [Module static selection](/docs/reference/module-static-selection) — profile-specific declaration groups,
  demanded condition dependencies, selective publication, availability cycles and inactive ranges.
- [Generics, interfaces, and specialization](/docs/reference/generics-interfaces-and-specialization) — generic
  parameters and inference, compile-time interface contracts, conformances, coherence, and finite
  static specialization, including exact and opaque callable and Effect representations.
- [Native pointer boundary](/docs/reference/native-pointer-boundary) — qualified raw addresses, native output
  states, and independently checked C ABI behavior.
- [Atomic memory operations](/docs/reference/atomic-memory-operations) — the C++20 memory model, static
  orderings, atomic loads, stores, read-modify-writes, compare-exchange, and fences.
- [Thread properties](/docs/reference/thread-properties) — the sealed `Transferable` and `Concurrent`
  properties, their derivation from stored parts, and `impl` assertions for synchronized types.
- [Unsafe code, intrinsics, and targets](/docs/reference/unsafe-intrinsics-and-targets) — lexical unsafe
  acknowledgement, caller-owned unsafe contracts, sealed compiler primitives, and reachable target
  availability. Rules are confirmed.
- [Runtime and standard-library boundary](/docs/reference/runtime-and-standard-library) — language versus
  library semantics, ordinary portable and target-provider source, private runtime support,
  distribution contents, and pay-for-use.
- [Program termination and reporting](/docs/reference/program-termination-and-reporting) — ordinary and effect
  statuses, unhandled typed-error reports, logical traces, fatal traps, and host boundaries.

Every domain in the initial stabilization map now has a reference page. Individual pages continue
to name unresolved boundaries rather than inventing rules to make the table look complete.

Tutorials, task-oriented guides, design rationale, compiler architecture, and standard-library API
documentation remain separate from this reference.

- [Compilation profiles and package configuration](/docs/reference/compilation-profiles)

- [Selected source and profile tooling](/docs/reference/selected-source-tooling): source availability, profile catalogs, editor selection and platform provenance.

- [Foreign-call contracts](/docs/reference/foreign-call-contracts): explicit immediate C-call behavior, call-only references and fatal foreign-unwind boundaries.

- [Native assembly and entry fragments](/docs/reference/native-assembly)

- Native standard streams
- Native clocks
- Native entropy
- Native filesystem

- [Base64](/docs/reference/base64) — strict RFC 4648 standard-padded encoding and decoding into caller-owned storage.
- [Buffered byte I/O](/docs/reference/buffered-byte-io) — fixed-capacity lookahead, output buffering, scoped duplex composition, and bounded transfer.
- [HTTP head parsing](/docs/reference/http-head-parsing) — bounded incremental request/response heads, borrowed views, and atomic serialization.
- [HTTP body framing](/docs/reference/http-body-framing) — strict bounded message framing, chunked transfer, trailers, and completion evidence.
- [HTTP content decoding](/docs/reference/http-content-decoding) — bounded streaming content-coding plans, decoding, metadata, and reuse evidence.
- [Streaming HTTP server](/docs/reference/http-server) — bounded serial request handling, framed bodies, explicit response output, graceful shutdown, and scoped protocol handoff.
- [Streaming HTTP client](/docs/reference/http-exchange) — origin-bound request policy, owned sessions, staged exchanges, and authenticated native TLS transport.
- [HTTP proxy routing](/docs/reference/http-proxy-routing) — explicit bounded proxy policy, routed admission, CONNECT tunnel ownership, and original-origin TLS.
- [HTTP redirects](/docs/reference/http-redirects) — bounded redirect policy, replay sources, authority changes, scoped cleanup, and final response ownership.
- [HTTP connection pooling](/docs/reference/http-connection-pooling) — bounded local ownership, conservative reuse, deterministic eviction, and explicit closure.
- [Network addresses and resolution](/docs/reference/network-address-resolution) — owned IP/domain/endpoint values, bounded resolution, and synchronous native DNS limits.
- [Native socket connections](/docs/reference/native-socket-connections) — scoped nonblocking TCP and pathname-Unix ByteDuplex connections with bounded cooperative polling.
- [P-256 key agreement](/docs/reference/p256-key-agreement) — scalar ownership, SEC1 admission, explicit entropy and bounded arithmetic.
- [ECDSA P-256 verification](/docs/reference/ecdsa-p256-verification) — borrowed messages, strict DER and retained certificate parameter policy.

- [Native socket listeners](/docs/reference/native-socket-listeners) — scoped nonblocking TCP and pathname-Unix listeners with bounded accept polling.
