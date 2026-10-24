# Services and providers

A service is a named capability that effect functions require and callers supply. This page covers service and role declarations, requirement rows (`? &S`, `? &mut S`), provider implementations, the `Effect` operations that supply providers, row variables, `Without`, `provides` and `in` constraints, and optional services (`? &Option<&S>`).

## Syntax

```
ServiceDecl      = 'pub'? 'service' Identifier GenericParameters? '{' OperationDecl* '}'
OperationDecl    = 'unsafe'? 'effect'? 'fn' Identifier GenericParameters? '(' Parameters? ')'
                   ( '->' Type )? FailureRow? RequirementRow?
RoleDecl         = 'pub'? 'role' Identifier GenericParameters?

ProviderImpl     = 'impl' GenericParameters? Type 'for' Type '{' ProviderMember* '}'
ProviderMember   = FunctionDecl | Identifier ':' TypePath

RequirementRow   = '?' RowMember ( '|' RowMember )*
RowMember        = Requirement | Without | Identifier
Requirement      = '&' 'mut'? Type ( 'at' TypePath )?
Without          = 'Without' '<' RowOperand ',' RowOperand '>'
RowOperand       = RowOperandMember ( '|' RowOperandMember )*
RowOperandMember = Requirement | Type ( 'at' TypePath )?

RowParameter     = '?' Identifier
WhereClause      = 'where' Constraint ( ',' Constraint )*
Constraint       = Type 'in' Type
                 | Type 'provides' Type 'from' Type
```

- `RowParameter` appears in a generic parameter list, for example `<'env, A, E, ?R>`.
- `Without`, `in`, `provides`, `from` and `at` are contextual words, not reserved keywords.

## Requirement rows

- A requirement row `? R` follows the result type and any failure row of an `effect fn`. It lists the services the function needs.
- Each entry is a borrowed service: `&S` (shared) or `&mut S` (exclusive). Entries are joined with `|`. Order does not matter.
- A written row may not name one service (and role) with both accesses. `? &Counter | &mut Counter` is SEM0233; write `? &mut Counter`.
- An entry must name one concrete service type. A struct, an owned `S` without `&`, or a plain type parameter is SEM0070. The one exception is `&Option<&S>`, an optional service (see "Optional services").
- An ordinary `fn` cannot declare a requirement row. This release reports SEM0062, whose message mentions failure channels.
- The `Effect` type carries the same row: `Effect<'env; A ! E ? R>`. See Effects and run.

## Shared and exclusive access

- `&S` lets the operation read the provider. `&mut S` lets it mutate the provider.
- An exclusive entry also satisfies uses that need shared access. A function with `? &mut Counter` may run an Effect that needs `? &Counter`.
- A shared entry does not satisfy an exclusive use. Running an Effect that needs `&mut S` under `? &S` is SEM0071.
- A shared borrow of a provider (`Effect.provide`) cannot satisfy an exclusive entry (SEM0131). An exclusive borrow (`Effect.provideMut`) satisfies either kind.
- One value may be lent shared to several entries at once. Lending it exclusively to two entries at once is a borrow conflict (OWN0010).

## Declaring a service

- `service Name { ... }` declares a service. It holds operations only.
- An operation may have a body. The body is its default: a provider that leaves the operation out uses it, and one that implements the operation replaces it.
- A field or any other member that is not an operation is SEM0090. A `pub` modifier on an operation is a parse error (PAR0001).
- Operation names are distinct within a service (SEM0003).
- An operation normally requires its own service: `effect fn next() -> i32 ? &mut Counter`. The entry's access decides what a provider's implementation may do.
- An operation may require other services as well, and may declare a failure row. For example, `HostInput.argument` requires `? &mut HostInput | &mut Allocator`.
- A service may take type parameters and row parameters: `service Source<T>`, `service AcquiredRouteContext<P, A, E, ?R>`.
- A service with no operations is allowed. It works as a pure capability token.
- A service may also declare plain `fn` operations taking `value: &Self`. Such a service can be used as a generic bound (`T: SchemaService`), like an interface. See Interfaces and impls.

## Calling an operation

- `Service.operation(args)` builds an Effect. `run Service.operation(args)` executes it. Type arguments of a generic service are written on the service: `Source<i32>.take()`.
- The call needs the operation's requirement entries. The enclosing function must declare them or a provider must supply them.

## How requirements flow

- Calling an `effect fn` does not run it. The resulting Effect carries the callee's whole row.
- `run e` executes `e` inside the current function. Every remaining entry of `e`'s row must be covered by the enclosing function's declared row. Otherwise it is SEM0071.
- A function that runs an Effect needing a service, without providing it, must declare that requirement itself. The requirement then passes to its caller.
- Providing an entry removes it from the Effect's row. Running the result then needs only what remains.
- `pub fn main() -> i32` declares no row. Every Effect it runs must be fully provided first.

## Implementing a service

- `impl Service for Type { ... }` makes `Type` a provider of `Service`.
- Every operation needs a member. A missing member is SEM0083.
- A member is either an inline function or a mapping `operation: Type.function` to an existing function.
- The provider arrives as the first parameter `self`. The operation's own entry becomes that parameter, so the member does not repeat it. Other requirements and failures stay in the member's signature.
- For an operation that requires `&Service`, `self` must be `&Self`. Using `&mut Self` there is SEM0083.
- For an operation that requires `&mut Service`, `self` may be `&mut Self` or `&Self`.
- A role-qualified operation (`? &mut Journal at Audit`) is implemented by an ordinary member. The role is not written in the impl.
- A generic service is implemented per application: `impl Source<i32> for Fixed`.

## Supplying providers

These operations live in `Effect` from `silk/effect`. Each takes an Effect and a provider, and returns an Effect whose row lacks the selected entry. All other entries remain.

| Operation | Provider | Satisfies |
| --- | --- | --- |
| `Effect.provide(e, &p)` | shared borrow | shared entries only |
| `Effect.provideMut(e, &mut p)` | exclusive borrow | shared or exclusive entries |
| `Effect.bindRequirement(e, &p)` | shared borrow | same as `provide` |
| `Effect.bindRequirementMut(e, &mut p)` | exclusive borrow | same as `provideMut` |
| `Effect.bindRequirementOwned(e, p)` | owned value | shared or exclusive entries |
| `Effect.provideEffect(e, acquire)` | value produced by running `acquire` | shared or exclusive entries |

- They are usually written in a pipeline: `run work() |> Effect.provideMut<Counter>(&mut counter)`. `run` applies after the whole pipeline.
- The selected entry is the first generic argument: `Effect.provideMut<Counter>`, `Effect.provide<Journal at Audit>`. It names the service and role, without `&`.
- The selection may be omitted when the provider's type matches exactly one entry. Matching several entries is SEM0125. Matching none is SEM0123.
- Inside a generic function, the selection must be written. Otherwise the selector cannot be inferred (SEM0099).
- A selection that names more than one entry, such as `Effect.provide<Counter | Label>`, is SEM0126.
- A borrowed provider stays borrowed until the Effect is consumed. Touching it in between is a borrow error (OWN0011). After `run`, the caller has full access again and sees any mutation.
- `bindRequirementOwned` moves the provider into the Effect and releases it with the Effect.
- `provideEffect` runs `acquire` on each execution, before the body. Failures of `acquire` join the result's failure row. Its requirements join the result's row.
- The `Intrinsic.bindRequirement`, `Intrinsic.bindRequirementMut` and `Intrinsic.bindRequirementOwned` primitives underlie these operations. See Intrinsics.

## Roles

- `role Name` declares a role. A role has no body and no values. It only distinguishes requirement entries.
- `&S at Role` is a separate entry from `&S` and from `&S at OtherRole`. One row may hold all of them, each with its own provider.
- An operation declared with `? &S` cannot run under an entry `&S at Role`. That is SEM0071.
- To use roles, declare role-qualified operations: `effect fn audit() -> i32 ? &mut Journal at Audit`.
- Provide a role entry by selecting it: `Effect.provideMut<Journal at Audit>(&mut book)`.
- An unknown role name is SEM0001.

## Row variables

- `?R` in a generic parameter list declares a row variable. It stands for a whole requirement row.
- Use it as `? R` in a signature or inside an Effect type: `once Effect<'env; A ! E ? R>`.
- A row variable cannot appear where a type is expected. That is SEM0088.
- Row arguments may be written explicitly as rows: `within<&Counter, &Counter>(work())`.

## Without

- `Without<R, S>` is row `R` with the entry selected by `S` removed. `S` names a service and optional role, without `&`: `Without<R, Counter>`, `Without<R, Clock at Primary>`.
- Writing `&` or `&mut` in the selector position is SEM0070.
- `Effect.provide` and its relatives return `? Without<R, S>`.
- `Without` also works on concrete rows: `Effect<'env; i32 ? Without<&mut Counter | &Label, Label>>` is a row containing only `&mut Counter`.

## provides and in constraints

- `where P provides S from R` states that provider `P` can supply the entry selected by `S` in row `R`. `P` is written with its access: `&'env P`, `&'env mut P`, or an owned `P`.
- The provider's access must be sufficient for the stored entry, as in "Shared and exclusive access".
- Generic code that calls `Effect.provide` or a relative on a row variable needs this constraint.
- `where R in Without<R, S>` states that row `R` has no entry for `S`. A call whose row does contain `S` is rejected (SEM0234).
- `where S in R` between two row variables states that every entry of `S` is in `R`. A function declaring `? R` may then run an Effect whose row is `S`.
- At a call, a row argument for `S` with an entry missing from `R`, or with stronger access than `R` gives, is rejected with SEM0234, which names the premise: "This call does not prove the requirement premise `&mut main.Logger in &main.Logger`". A row variable that appears only in the result cannot be inferred (SEM0099); write the row arguments.
- `in` between failure types is covered in Typed failures.

## Optional services

- `? &Option<&S>` declares an optional service: the effect runs with or without a provider of `S`. `Option` is the one from `silk/option`; the compiler recognizes it in requirement rows, selectors and `Without`.
- `&Option<&S>` is its own requirement entry, separate from `&S`. A row may hold both.
- Branch on it with `withSome<&S>(absent, present)` from `silk/option`. Both arguments are Effects. `present` may also require `S`; `absent` may not. The provider decides at run time which branch runs, and the other is dropped. The type argument may be omitted when the arguments determine it.
- Both branches share every other requirement of the row. The rest of the row must not contain `S` (`where R in Without<R, S>`). An `absent` branch that requires `S` is SEM0234.
- Three providers satisfy `&Option<&S>`:

| Provider | Branch that runs |
| --- | --- |
| `Effect.provide(e, &Option<P>.some(p))`, where `&P` provides `S` | `present`, with `p` |
| `Effect.provide(e, &Option<P>.none())` or `&Option<never>.none()` | `absent` |
| `provideSome<&S>(e, &p)` from `silk/option` | `present`, with the borrowed `p` |

- `Option<never>.none()` is the absent provider when no provider type is at hand: `never` serves every service and has no values.
- A provider of `S` alone does not satisfy `&Option<&S>`. Providing one is SEM0123. Lift it with `provideSome`.
- A function that declares `? &S` cannot run an Effect that needs `&Option<&S>` without providing it (SEM0071).
- The optional service must be shared. An `Option` provider lends its service through a shared borrow, so nothing could provide `&Option<&mut S>`, and the requirement itself is SEM0240, reported where the row is written: "An optional service takes shared access only: an `Option` provider lends its service through a shared borrow, so nothing can provide `&Option<&mut S>`; require `&mut S`, or `&Option<&S>`".
- Diagnostics may name the service the key stands for as `OptionService`, declared in `silk/option`. Code does not name it.

## What main is given

- Process startup supplies exactly one service: `&mut HostInput` from `silk/host_input`, holding arguments, environment and working directory.
- `pub effect fn main() -> i32 ? &mut HostInput` (or `-> ()`) receives it. A failure row is allowed.
- Any other requirement on `main` must be provided inside the program. A `main` that declares one is SEM0225, reported at `main` by both `silk check` and `silk build`.
- Startup supplies no allocator, clock or scheduler. Create providers such as `Allocator.systemAllocatorProvider()` or `OsMonotonicClock.make()` and provide them yourself. See Allocation and shared ownership, and Fibers and scheduling.

## Examples

A service with a shared and an exclusive operation, an inline member and a mapped member:

```silk
import silk.effect { Effect }

service Counter {
  effect fn next() -> i32 ? &mut Counter

  effect fn peek() -> i32 ? &Counter
}

struct Counting {
  value: i32,
}

effect fn peekCounting(self: &Counting) -> i32 {
  return self.value
}

impl Counter for Counting {
  effect fn next(self: &mut Self) -> i32 {
    self.value = self.value + 1
    return self.value
  }

  peek: Counting.peekCounting
}

effect fn look() -> i32
  ? &Counter {
  return run Counter.peek()
}

effect fn step() -> i32
  ? &mut Counter {
  let stepped = run Counter.next()
  let seen = run look()
  return stepped + seen
}

pub fn main() -> i32 {
  let mut counter = Counting { value: 20 }
  let both = run step() |> Effect.provideMut<Counter>(&mut counter)
  let seen = run look() |> Effect.provide(&counter)
  if counter.value != 21 {
    return 1
  }
  return both + seen - 63
}
```

Two providers of one service, kept apart by a role:

```silk
import silk.effect { Effect }

role Audit

service Journal {
  effect fn record() -> i32 ? &mut Journal

  effect fn audit() -> i32 ? &mut Journal at Audit
}

struct Book {
  entries: i32,
}

impl Journal for Book {
  effect fn record(self: &mut Self) -> i32 {
    self.entries = self.entries + 1
    return self.entries
  }

  effect fn audit(self: &mut Self) -> i32 {
    self.entries = self.entries + 100
    return self.entries
  }
}

effect fn work() -> i32
  ? &mut Journal | &mut Journal at Audit {
  let recorded = run Journal.record()
  let audited = run Journal.audit()
  return recorded + audited
}

pub fn main() -> i32 {
  let mut daily = Book { entries: 0 }
  let mut audit = Book { entries: 0 }
  let total = run work() |> Effect.provideMut<Journal>(&mut daily)
    |> Effect.provideMut<Journal at Audit>(&mut audit)
  if daily.entries != 1 || audit.entries != 100 {
    return 1
  }
  return total - 101
}
```

Generic providers over a row variable, with `provides`, `in` and `Without`:

```silk
import silk.effect { Effect }

service Counter {
  effect fn next() -> i32 ? &mut Counter
}

service Label {
  effect fn label() -> i32 ? &Label
}

struct Counting {
  value: i32,
}

impl Counter for Counting {
  effect fn next(self: &mut Self) -> i32 {
    self.value = self.value + 1
    return self.value
  }
}

struct Fixed {
  value: i32,
}

impl Label for Fixed {
  effect fn label(self: &Self) -> i32 {
    return self.value
  }
}

effect fn work() -> i32
  ? &mut Counter | &Label {
  let counted = run Counter.next()
  let labelled = run Label.label()
  return counted + labelled
}

effect fn withCounter<'env, A, E, ? R>(
  body: once Effect<'env; A ! E ? R>,
  counter: &'env mut Counting,
) -> A
  ! E
  ? Without<R, Counter> where &'env mut Counting provides Counter from R {
  return run Effect.provideMut<Counter>(move body, move counter)
}

effect fn counterFree<'env, A, ? R>(body: once Effect<'env; A ? R>) -> A
  ? R where R in Without<R, Counter> {
  return run move body
}

pub fn main() -> i32 {
  let mut counter = Counting { value: 1 }
  let fixed = Fixed { value: 40 }
  let labelOnly = withCounter(work(), &mut counter)
  let total = run counterFree(move labelOnly) |> Effect.provide(&fixed)
  return total - 42
}
```

A row variable included in another with `where S in R`:

```silk
import silk.effect { Effect }

service Counter {
  effect fn next() -> i32 ? &mut Counter
}

struct Counting {
  value: i32,
}

impl Counter for Counting {
  effect fn next(self: &mut Self) -> i32 {
    self.value = self.value + 1
    return self.value
  }
}

effect fn inner<'env, ? S, ? R>(body: once Effect<'env; i32 ? S>) -> i32
  ? R where S in R {
  return run move body
}

effect fn twice() -> i32
  ? &mut Counter {
  let a = run Counter.next()
  let b = run Counter.next()
  return a + b
}

pub fn main() -> i32 {
  let mut counter = Counting { value: 0 }
  let total = run inner<&mut Counter, &mut Counter>(twice())
    |> Effect.provideMut<Counter>(&mut counter)
  return total - 3
}
```

`main` receiving the startup service:

```silk
import silk.host_input { HostInput, HostInputError }
import silk.usize

pub effect fn main() -> i32
  ! HostInputError
  ? &mut HostInput {
  let count = run HostInput.argumentCount()
  if count == usize.ONE {
    return 0
  }
  return 1
}
```

An optional tracer. `measure` runs `traced` when a `Tracer` is provided and `plain` otherwise:

```silk
import silk.effect { Effect }
import silk.option { Option, provideSome, withSome }

service Tracer {
  effect fn trace(value: i32) -> i32 ? &Tracer
}

struct Offset {
  amount: i32,
}

impl Tracer for Offset {
  effect fn trace(self: &Self, value: i32) -> i32 {
    return value + self.amount
  }
}

effect fn plain() -> i32 {
  return 1
}

effect fn traced() -> i32 ? &Tracer {
  return run Tracer.trace(1)
}

// Runs with or without a Tracer.
effect fn measure() -> i32 ? &Option<&Tracer> {
  return run withSome<&Tracer>(plain(), traced())
}

pub fn main() -> i32 {
  let offset = Offset { amount: 10 }
  let owned = Option<Offset>.some(Offset { amount: 20 })
  let missing = Option<Offset>.none()
  let none = Option<never>.none()
  let lifted = run provideSome<&Tracer>(measure(), &offset)
  let present = run Effect.provide(measure(), &owned)
  let absent = run Effect.provide(measure(), &missing)
  let never = run Effect.provide(measure(), &none)
  if lifted != 11 || present != 21 || absent != 1 || never != 1 { return 1 }
  return 0
}
```

A `main` that provides the plain provider instead, `let offset = Offset { amount: 10 }` followed by `return run Effect.provide(measure(), &offset)`, is rejected:

```
src/main.silk:33:14: error[SEM0123] The provider matches no compatible requirement
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0001 | Expected token missing, for example `pub` on a service operation |
| SEM0001 | Unknown type, including an unknown role name |
| SEM0003 | Repeated operation name in a service |
| SEM0062 | Requirement row on an ordinary `fn` (message mentions failure channels) |
| SEM0070 | Requirement entry is not one concrete service type |
| SEM0071 | `run` leaves requirements that the enclosing signature does not provide |
| SEM0083 | Invalid conformance: missing member, or `&mut Self` for a shared operation |
| SEM0088 | Row variable used where a type is expected |
| SEM0090 | Service contains a field or another member that is not an operation |
| SEM0099 | Selected entry or row argument cannot be inferred |
| SEM0123 | Provider matches no requirement entry, including a plain provider of `S` for `&Option<&S>` |
| SEM0125 | Provider matches more than one entry; select one explicitly |
| SEM0126 | Selected row does not have exactly one member |
| SEM0131 | Provider access cannot satisfy the entry, for example a shared borrow for `&mut S` |
| SEM0225 | `main` declares a requirement other than `&mut HostInput` |
| SEM0233 | A requirement row names one service with both shared and exclusive access |
| SEM0234 | A call does not prove a `where S in R` premise of its callee, including `R in Without<R, S>`, as when the `absent` branch of `withSome` requires `S` |
| SEM0240 | An optional service with exclusive access, `&Option<&mut S>` |
| OWN0010 | One provider lent exclusively to two entries at once |
| OWN0011 | Provider used while an unconsumed Effect still borrows it |

## See also

Effects and run · Typed failures · Fibers and scheduling · Suspension and cancellation · Interfaces and impls · Generics · Borrowing · Lifetimes · Allocation and shared ownership · Program entry and termination · Intrinsics · `silk/effect` · `silk/option` · `silk/host_input` · `silk/allocator` · `silk/monotonic_clock`

## Open questions

- An operation declared without a requirement on its own service, such as `effect fn x() -> i32` inside `service Bad`, is accepted. Implementing it fails with SEM0083.
- In a `provides` constraint, the selector is accepted as `Counter`, `&Counter` or `&mut Counter` with the same effect. The access in the selector is ignored (silk#2012).
- Removing the `provides` constraint from a generic provider wrapper stops `silk check` at its `Effect.provideMut` call with "unsupported: this construct is not supported by the native compiler yet" instead of a diagnostic.
- `effect fn f<R>() -> i32 ? R`, with `R` declared as a type parameter, reports SEM0070 rather than SEM0088.
