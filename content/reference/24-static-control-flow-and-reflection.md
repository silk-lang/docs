# Static control flow and reflection

`static if` and `static for` choose and repeat code during compilation. `compileError` stops a build from a selected branch. `silk/core/reflect`, `silk/core/target` and `silk/core/compilation` supply the static facts these forms test: aggregate fields, the target machine, and the build request.

## Syntax

```
StaticIfStatement   = 'static' 'if' Expression Block ('else' Block)?
StaticForStatement  = 'static' 'for' Identifier 'in' Expression Block
StaticIfDeclaration = 'static' 'if' Expression '{' Declaration* '}'
                      ('else' (StaticIfDeclaration | '{' Declaration* '}'))?
CompileError        = 'compileError' '(' Expression ')'
ExactType           = 'typeof' '(' Path ')'
```

## Static conditions

- The condition of `static if` must be a `bool` (SEM0011) that static evaluation can compute.
- A condition may use literals, `const` and `param` values, static parameters, static functions, and the bindings of an enclosing `static for`.
- A condition that reads a runtime value, such as an ordinary parameter, is SEM0176.
- Static evaluation itself, `const` and `static fn` are covered in Static evaluation.

## `static if` in a body

- `static if` is a statement. It is not an expression: `let x = static if c { 1 } else { 2 }` is a parse error (PAR0001).
- The `else` of a statement form takes a block only. `else if` and `else static if` are parse errors (PAR0001). Nest a second `static if` inside the `else` block instead.
- Exactly one branch is kept. The other branch is removed before type checking.
- Each branch is a block scope. A `let` inside a branch is not visible after it (SEM0006).
- Return analysis sees only the kept branch. `static if true { return 1 }` at the end of a function satisfies its result. With a false condition and no other return, the function falls through (SEM0130).
- `return` and `fail` inside a kept branch leave the function as usual.

## `static if` at module level

- `static if` may also wrap declarations at the top of a module: functions, types, imports, foreign declarations and impls.
- The module form chains with `else static if`. A plain `else` takes a declaration group in braces.
- Declarations in an unselected arm do not exist. Naming one is an unknown-name error (SEM0004 for a call).
- Two arms may declare the same name, since only one arm is kept.
- A package parameter cannot be declared inside a module-level `static if` arm (SEM0214 at the `param`). See Package parameters.

## Unselected branches

- An unselected branch must parse. A syntax error there is still reported (PAR0002).
- Names in an unselected branch are not resolved. Types are not checked. `static if false { return missing }` compiles.
- A `compileError` in an unselected branch has no effect.
- Selection happens per specialization. A branch kept for one instance may be dropped for another. See Specialization below.

## `static for`

- `static for name in sequence { ... }` repeats its body once per element, in order, during compilation. No runtime loop remains.
- The sequence must be a static sequence value: the result of `Reflect.fields<T>()`, or an `Intrinsic.StaticSequence<E>` built with `silk/core/static_sequence`. Anything else, including a fixed array literal, is SEM0176.
- `name` is bound to the current element as a static value. It may appear in `static if` conditions and static arguments.
- Each repetition is checked separately with that element's types. A body that suits one field's type but not another's fails for that field (SEM0012).
- `return` and `fail` inside the body leave the enclosing function.
- `break` and `continue` directly inside a `static for` body are not supported. `silk check` stops with "unsupported: this construct is not supported by the native compiler yet".
- An anonymous function or `effect { ... }` block directly in the body is not supported yet, since every repetition would share its one declaration. It is SEM0245 at the literal: ``An anonymous function inside a `static for` body is not supported by the native compiler yet: every unrolled iteration would share its one declaration; move the code that builds and runs it into a named function and call that from the loop body``. Move that code into a named function and call it from the body.
- `static for` is a statement only. There is no module-level form.

## `compileError`

- `compileError(message)` fails the build when static evaluation selects it. The diagnostic is SEM0177 at the `compileError` call, with `message` as its text.
- When a call selects the branch through a static argument, a `note: ... related location` line follows and points at that call. See the example below.
- `message` must be static text, such as a string literal or a `const` of type `string`.
- The expression has type `never`, so it may end a branch of a function with a result.
- It is allowed inside a `static if` or `static for` body and inside a `static fn`. In a `static fn` it fails only if a call actually reaches it, for example from a `const` initializer.
- Elsewhere, such as in an ordinary function body or a runtime `if`, it is reported as unsupported.

## Reflection

`silk/core/reflect` exposes aggregate metadata to static code. Descriptors exist only during static evaluation; they have no runtime representation. Import the owner with `import silk.core.reflect { Reflect }`.

| Operation | Result |
| --- | --- |
| `Reflect.typeOf<T>()` | The type descriptor of aggregate `T` (`Intrinsic.Type<T>`) |
| `Reflect.typeKind(descriptor)` | A `u8` aggregate-kind code |
| `Reflect.fields<T>()` | A static sequence of field descriptors (`Intrinsic.Field<T, V>`) in declaration order |
| `Reflect.fieldKind(field)` | A `u8` field-kind code |
| `Reflect.fieldLabel(field)` | The source label of a labeled field, as `string<'static>` |
| `Reflect.fieldOrdinal(field)` | The position of a positional field, as `usize`, counting from 0 |
| `Reflect.borrowField(owner, field)` | `&V`, a borrow of that field of `owner: &T` |

- Kind constants in `silk/core/reflect`: `namedKind` (0, a `struct`), `positionalKind` (1, a `tuple` declaration), `anonymousNamedKind` (2, a `.{ ... }` record), `anonymousPositionalKind` (3, a `( ... )` tuple).
- Field kind constants: `labeledFieldKind` (0) and `positionalFieldKind` (1).
- Every operation except `borrowField` is a `static fn`. Calling one where a runtime value is needed, as in `let fields = Reflect.fields<P>()` in an ordinary function, is SEM0176.
- `borrowField` runs at runtime. Its `field` parameter is `static`, so the descriptor must come from static code, usually a `static for` binding. Type arguments may be written (`borrowField<P, i32>`) or inferred.
- Comparing labels is static: `static if Reflect.fieldLabel(field) == "count"` selects one field.
- `Reflect.fields<T>()` lists only `pub` fields, even when called in the module that declares `T`. Visibility is that of `silk/core/reflect`.
- `Intrinsic.reflectFields<T>()` uses the calling module's visibility instead, so it also lists private fields of a local type. See Intrinsics.
- Listing the fields of a nominal `union` with `Reflect.fields<U>()` is not supported. It is SEM0176 at the `Reflect.fields` call in the user's code. `Reflect.typeOf` of a `union` or of a non-aggregate such as `i32`, and `fieldLabel` of a positional field, are reported as unsupported.
- A fault or unsupported construct reached while statically evaluating another module's function is reported at the outermost call in the user's module. For example, `static if Reflect.typeKind(Reflect.typeOf<i32>()) == 1` reports "unsupported: this construct is not supported by the native compiler yet" at the `Reflect.typeKind` call, followed by a `note:` line at the same position.

## Target and build queries

All of these are fixed by the build request (`--target`, `--release`, `--profile`, `--profile-input`) before static evaluation starts. They have no runtime storage. Each query is a `static fn` or `const`, so it can appear in a `static if` condition or in ordinary expressions.

`silk/core/target`, through `import silk.core.target { Target, ... }`:

| Name | Type |
| --- | --- |
| `Target.arch()` | `Arch`: `Aarch64`, `Wasm32`, `X86_64` |
| `Target.operatingSystem()` | `OperatingSystem`: `Darwin`, `Linux`, `Freestanding` |
| `Target.abi()` | `Abi`: `Apple`, `Gnu`, `Wasm` |
| `Target.objectFormat()` | `ObjectFormat`: `MachO`, `Elf`, `Wasm` |
| `Target.endianness()` | `Endianness`: `Little` |
| `Target.cpu()`, `Target.deployment()` | `string<'static>` |
| `Target.hasCpuFeature(name)` | `bool` |
| `pointerBits`, `pointerAlignment` | `u32` constants |
| `usizeMax`, `isizeMax`, `isizeMin` | target-width constants |

`silk/core/compilation`, through `import silk.core.compilation { Compilation, ... }`:

| Name | Type |
| --- | --- |
| `Compilation.libc()` | `Libc`: `None`, `System`, `Gnu` |
| `Compilation.artifact()` | `Artifact`: `Executable`, `LoadableModule`, `StaticArchive`, `Object` |
| `Compilation.link()` | `Link`: `Static`, `Dynamic` |
| `Compilation.codeModel()` | `CodeModel`: `Small`, `Large` |
| `Compilation.relocation()` | `Relocation`: `Static`, `Pic` |
| `Compilation.optimization()` | `Optimization`: `None`, `Speed` |
| `Compilation.safety()` | `Safety`: `Checked`, `Unchecked` |
| `Compilation.threading()` | `Threading`: `Single`, `Multi` |
| `Compilation.unwind()` | `Unwind`: `None`, `Native` |
| `Compilation.entry()`, `Compilation.runtime()` | `Selection`: `Default`, `None`, `Named { name }` |
| `Compilation.hasSanitizer(s)` | `bool`, for `Sanitizer.Address`, `Thread` or `Undefined` |
| `debug` | `bool` constant: whether debug information is requested |

- These enums are scalar enums, so they compare with `==` and `!=`.
- A named profile sets them from its fields, for example `optimization = "speed"` and `debug = false`. The native compiler refuses a profile that sets `safety`, `threading`, `unwind`, `sanitizers` or `entry` away from its default, so those queries return the defaults in every build that compiles. See Package parameters for profiles.

## Exact function types

- `typeof(name)` is a type: the exact type of the ordinary function `name`. It is not a general type-of-expression operator.
- A name with no declaration is SEM0108; an ambiguous name is SEM0109; a name that is not an ordinary function, such as a struct, is SEM0110; a generic function with unsupplied parameters is SEM0111. See Generics.
- `typeof(id<i32>)` names one instantiation of a generic function. Where that type is expected, the plain name `id` is instantiated from it. See Generics.

## Specialization

- Each instance of a generic function is selected separately. In `describe<T>()`, a `static if` on `Reflect.typeKind(Reflect.typeOf<T>())` keeps a different branch for each `T`.
- Each distinct value of a `static` parameter also gives a separate instance with its own selection. A static parameter may drive a finite recursion, as in `countdown(n - 1)` guarded by `static if n == 0`. See Static evaluation.
- Checking happens after selection, per instance. A branch that would not type-check for one instance is fine as long as that instance drops it.
- `static for` bodies are expanded per instance too, one copy per element.

## Examples

```silk
import silk.core.reflect { Reflect, namedKind }

struct Point {
  pub x: i32,
  pub y: i32,
}

struct Sample {
  pub flag: bool,
  pub count: i32,
}

fn total<T>(value: &T) -> i32 {
  static if Reflect.typeKind(Reflect.typeOf<T>()) != namedKind {
    compileError("total requires a named struct")
  }
  let mut sum = 0
  static for field in Reflect.fields<T>() {
    sum = sum + Reflect.borrowField<T, i32>(value, field).*
  }
  return sum
}

fn countOf(sample: &Sample) -> i32 {
  static for field in Reflect.fields<Sample>() {
    static if Reflect.fieldLabel(field) == "count" {
      return Reflect.borrowField(sample, field).*
    }
  }
  return -1
}

pub fn main() -> i32 {
  if total(&Point { x: 40, y: 2 }) != 42 {
    return 1
  }
  if countOf(&Sample { flag: true, count: 7 }) != 7 {
    return 2
  }
  return 0
}
```

```silk
import silk.core.target { Target, OperatingSystem, pointerBits }
import silk.core.static_sequence { StaticSequence }

static if Target.operatingSystem() == OperatingSystem.Linux {
  fn platform() -> i32 {
    return 1
  }
} else static if Target.operatingSystem() == OperatingSystem.Darwin {
  fn platform() -> i32 {
    return 2
  }
} else {
  fn platform() -> i32 {
    return 0
  }
}

static fn sizes() -> Intrinsic.StaticSequence<i32> {
  let mut items = StaticSequence.empty<i32>()
  items = StaticSequence.append<i32>(move items, 8)
  items = StaticSequence.append<i32>(move items, 16)
  return move items
}

fn wordBits() -> i32 {
  static if pointerBits == 64 {
    return 64
  } else {
    compileError("a 64-bit target is required")
  }
}

pub fn main() -> i32 {
  if platform() == 0 {
    return 1
  }
  let mut sum = 0
  static for size in sizes() {
    sum = sum + size
  }
  if sum != 24 {
    return 2
  }
  return wordBits() - 64
}
```

```silk
import silk.core.reflect { Reflect, positionalKind }

struct Named { pub value: i32 }
tuple Pair(i32, i32)

fn arity<T>() -> i32 {
  let mut count = 0
  static for field in Reflect.fields<T>() {
    count = count + 1
  }
  return count
}

fn describe<T>() -> i32 {
  static if Reflect.typeKind(Reflect.typeOf<T>()) == positionalKind {
    return 100 + arity<T>()
  } else {
    return arity<T>()
  }
}

fn scaled(static factor: i32, value: i32) -> i32 {
  static if factor == 0 {
    compileError("factor must be nonzero")
  }
  return value * factor
}

pub fn main() -> i32 {
  if describe<Named>() != 1 { return 1 }
  if describe<Pair>() != 102 { return 2 }
  if scaled(2, 21) != 42 { return 3 }
  return 0
}
```

Calling `scaled(0, 21)` instead, on line 32, fails the build with SEM0177. The note is the call that selected the branch:

```
src/main.silk:24:5: error[SEM0177] factor must be nonzero
  note: src/main.silk:32:6: related location
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0001 | A required token is missing, for example `else if` after a statement `static if` |
| PAR0002 | Unexpected tokens, including inside an unselected branch |
| SEM0004 | A call names a declaration that does not exist, including one in an unselected module arm |
| SEM0006 | Unknown value, such as a binding declared inside a `static if` branch |
| SEM0011 | A `static if` condition is not `bool` |
| SEM0012 | An argument type mismatches, for example in one `static for` repetition |
| SEM0108 | A `typeof` name resolves to no declaration |
| SEM0109 | A `typeof` name belongs to more than one declaration |
| SEM0110 | A `typeof` name is not an ordinary callable |
| SEM0111 | A `typeof` generic function has unsupplied parameters |
| SEM0130 | A non-unit function falls through after branch selection |
| SEM0176 | Static evaluation needs runtime work: a runtime condition, a non-sequence in `static for`, or a reflection call in runtime code |
| SEM0177 | A selected `compileError`, with a note at the selecting call |
| SEM0245 | An anonymous function or `effect {}` block in a `static for` body, or in a function with `static` parameters |

## See also

Static evaluation · Package parameters · Generics · Intrinsics · Control flow · Structs, tuples and arrays · `silk/core/reflect`, `silk/core/target`, `silk/core/compilation`, `silk/core/static_sequence`, `silk/core/static_text`, `silk/json/reflect`

## Open questions

- `break` and `continue` in a `static for` body, and `compileError` outside a static context, report `unsupported: this construct is not supported by the native compiler yet` rather than a semantic error code. Whether these become errors or features is not settled.
- `Reflect.typeOf<U>()` of a union is reported as unsupported rather than with a semantic error code.
