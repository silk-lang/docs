# Keywords

Silk reserves 38 keywords. A keyword cannot name a declaration, binding, parameter or field. Another 14 contextual words have a meaning only in one grammar position and are ordinary identifiers everywhere else. The lists come from the compiler's lexer and parser.

## Reserved keywords

| Keyword | Meaning | Reference page |
| --- | --- | --- |
| `as` | Renames an import (`import silk.collections.list as L`) or gives a C symbol name (`as "c_name"`). Not a cast. | Lexical structure, Unsafe code and C interop |
| `break` | Leaves the innermost `while` or `while let` loop. | Control flow |
| `compileError` | `compileError("text")` stops the build when a static branch selects it (SEM0177). | Static control flow and reflection |
| `const` | Declares a module-level constant; also `*const T` pointers. | Static evaluation, Unsafe code and C interop |
| `continue` | Starts the next iteration of the innermost `while` loop. | Control flow |
| `drop` | `drop x` ends a value's life now. Also the name of the `Drop` hook, `fn drop`. | Ownership and moves |
| `effect` | `effect fn` declares an effect function; `effect { ... }` builds an Effect value. | Effects and run |
| `else` | Second branch of `if`, `if let` and `static if`. | Control flow |
| `enum` | Declares a scalar enum, optionally with a backing type: `enum(u8) Color { ... }`. | Enums and unions |
| `export` | `export "C" fn` or `export "C" static` makes a definition callable from C. | Unsafe code and C interop |
| `extern` | `unsafe extern "C" fn` or `static` declares a C definition; `extern "C" struct` gives C layout. | Unsafe code and C interop |
| `fail` | `fail e` raises the typed failure `e` from an effect. | Typed failures |
| `false` | The `bool` value false. | Values and primitive types |
| `fn` | Declares a function, a function literal or a callable type. | Functions and methods, Closures and callable types |
| `for` | `impl I for T`, higher-ranked callable types `for<'a> fn(...)`, and `static for`. There is no runtime `for` loop. | Interfaces and impls, Lifetimes, Static control flow and reflection |
| `if` | Conditional statement; `if let` tests a pattern; `static if` selects code at compile time. | Control flow, Patterns and match |
| `impl` | Adds inherent members to a type, or makes a type conform to an interface or service. | Functions and methods, Interfaces and impls, Services and providers |
| `import` | Imports a module or its members; `pub import` re-exports members. | Lexical structure |
| `interface` | Declares an interface. | Interfaces and impls |
| `let` | Declares a local binding; `let mut`, `let static` and pattern lets; `if let` and `while let`. | Bindings and statements |
| `match` | Pattern-matching expression; `match &x`, `match &mut x`, `match move x`, `match place x`. | Patterns and match |
| `move` | `move x` transfers ownership; `match move`; `fail move e`. | Ownership and moves |
| `mut` | Mutable binding or parameter, `&mut` borrow, `mut fn` callable type, `*mut T` pointer. | Bindings and statements, Borrowing |
| `once` | `once fn` callable type that may be called one time; `once Effect<...>`. | Closures and callable types, Effects and run |
| `param` | Declares a package parameter in the root module. | Package parameters |
| `pub` | Makes a declaration, field or import visible outside its module. | Functions and methods, Structs, tuples and arrays |
| `return` | Leaves the function with a value; `return` alone returns `()`. | Bindings and statements |
| `role` | Declares a role that tells two entries of the same service apart. | Services and providers |
| `run` | Runs an Effect and yields its success value. `run` takes the whole following expression, pipelines included. | Effects and run |
| `service` | Declares a service contract. | Services and providers |
| `static` | `static fn`, `let static`, `static` parameters, `static if`, `static for`, and C statics. | Static evaluation, Static control flow and reflection |
| `struct` | Declares a struct. | Structs, tuples and arrays |
| `true` | The `bool` value true. | Values and primitive types |
| `tuple` | Declares a named tuple type: `tuple Pair(i32, i32)`. | Structs, tuples and arrays |
| `type` | Declares a type alias: `type Id = u64`. | Generics |
| `union` | Declares a nominal tagged union. | Enums and unions |
| `unsafe` | Unsafe blocks, unsafe calls (`unsafe f()`), unsafe functions and C declarations. | Unsafe code and C interop |
| `while` | The only loop statement: `while cond { ... }`, or `while let P = e { ... }` to repeat while `e` matches the pattern `P`. | Control flow |

## Contextual words

These words are identifiers except in the position shown. `let where = 1` and `fn some(test: i32)` compile.

| Word | Where it is special | Meaning | Reference page |
| --- | --- | --- | --- |
| `_` | Pattern, `let` | Matches anything and binds nothing. `let _ = e` is rejected (SEM0087); write `drop e`. | Patterns and match |
| `addrspace` | After `*const` or `*mut` | `addrspace(n)` pointer qualifier; only `0` today. | Unsafe code and C interop |
| `align` | After `*const` or `*mut` | `align(n)` states a pointer's minimum alignment. | Unsafe code and C interop |
| `at` | Requirement rows and call type arguments | `&mut Journal at Audit` selects a role. | Services and providers |
| `from` | `where` clause | `P provides X from Y`. | Services and providers |
| `in` | `where` clause, `static for` | `where S in E` membership; `static for f in fields { ... }`. | Typed failures, Services and providers, Static control flow and reflection |
| `place` | After `match` | `match place x` matches the storage of `x` directly. | Patterns and match |
| `provides` | `where` clause | Relates a provider type to the requirement it supplies. | Services and providers |
| `some` | After `->` | `-> some<F: Bound> F` declares an opaque result. | Generics, Effects and run |
| `test` | Before `fn`, `effect`, `static`, `unsafe`, `extern` or `export` | Marks a test function. | Functions and methods |
| `typeof` | Type position, before `(` | `typeof(add)` is the exact type of a named function. | Generics |
| `use` | In a `for<...>` binder list | `for<use 'call>` binds a lifetime fresh for each call. | Lifetimes |
| `where` | After a signature, an `impl` head or a `param` | Constraint clause; on `param`, a validation predicate. | Generics, Package parameters |
| `Without` | Row position, before `<` | `Without<R, S>` removes `S` from row `R`. | Typed failures, Services and providers |

## Names that are not keywords

- `self` and `Self`: `self` is an ordinary parameter name. `Self` names the owner type inside an `impl` or interface. See Interfaces and impls.
- `Intrinsic` is a namespace visible in every module without an import. See Intrinsics.
- Primitive type names (`i32`, `bool`, `string`, `never`) are not keywords.
- `loop` is not a keyword. `loop { ... }` is reported as PAR0006: "`loop` is not a Silk keyword; write an unbounded loop as `while true { ... }`".
- `x as i64` is not an expression. `as` there is PAR0002: "Silk has no `as` cast; convert with a function of the source type, such as `usize.toI32(count)`, or `usize.checkedToI32(count)` for an `Option` when the value may not fit".
- `with` and `module` are ordinary identifiers. They used to introduce property clauses (`with Intrinsic.inline()`, `module with ...`); such a clause is now PAR0011, and the compiler names the directive to write instead, such as `@inline`. See Intrinsics.
- Directive names after `@` (`inline`, `cold`, `nonParking`, `features`, `foreign`, `callbacks` and the rest) are not keywords either. The full list is under Directives in Intrinsics.

## Keywords in import paths

An import path segment may be spelled like a keyword: `import silk.core.effect {Effect}`. When the last segment is a keyword and the import has neither an alias nor a member list, the import cannot bind that name:

```silk
import silk.core.effect
```

```
src/main.silk:1:18: error[PAR0004] An import whose reserved final path segment cannot form an implicit binding
```

Add an alias (`import silk.core.effect as effects`) or a member list.

## See also

Lexical structure, Operators, Grammar summary.
