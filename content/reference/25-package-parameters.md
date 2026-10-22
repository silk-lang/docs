# Package parameters

A package parameter is a named static value that the build request may set. It is declared with `param` in a package's root module, takes its value from a `silk.toml` binding or from its default, and may be checked with a `where` predicate.

## Syntax

```
ParameterDeclaration = 'pub'? 'param' Identifier ':' Type ('=' Expression)? ('where' Expression)?
```

Manifest tables (TOML) that supply values:

```
[build]
profile = ProfileName
[[build.bindings]]                 (project tier)
[profiles.ProfileName]
target = Triple
[[profiles.ProfileName.bindings]]  (override tier)
```

## Declarations

- `param name: T = default` declares a private parameter. A private parameter must have a default.
- `pub param name: T` may omit the default. Every build must then bind it.
- Package parameters are read only from the root module of the package being built (the `root` of `[package]`).
- A `param` in any other module, or in a dependency package, is not registered. Reading it is SEM0214, reported at the `param` declaration.
- A `param` cannot appear inside a module-level `static if` arm. Parameters are fixed before `static if` selects declarations. Such a `param` is SEM0214 at its declaration.
- A parameter is read-only. Assigning to it is SEM0036.
- A violation of these schema rules stops `silk check` and `silk build` with SEM0214 and a reason. A rule broken in the source is reported at the declaration:

```
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: a private package parameter needs a default value
```

- A `pub param` that nothing binds and that has no default is reported at its declaration, by `silk check` and `silk build`:

```
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: package parameter `x` has no default value and no binding; give it a default or bind it in `[build].bindings` of silk.toml
```

- A refused schema does not hide syntax errors. `silk check` and `silk build` report the module's syntax errors first, then the SEM0214. With `pub param o: f64 = 1.0` on line 1 and a malformed `fn broken( { }` on line 5:

```
src/main.silk:5:12: error[PAR0001] Expected `)`
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: a package parameter's type must be bool, an integer, a string, or a fixed array of them
```

## Types

- The type must be concrete and admissible: `bool`, a fixed-width or pointer-sized integer type, `string`, or a fixed array `[T; N]` of an admissible type.
- Other types, such as `f64`, are SEM0214 at the declaration: "a package parameter's type must be bool, an integer, a string, or a fixed array of them".
- Enum, struct, union and optional types, such as `Option<i32>`, are not supported yet. Each is SEM0214 at the declaration: "package parameter `e` has an enum, struct, union or optional type, which package parameters do not support yet". This holds with or without a default or binding.
- `?T` is not a Silk type, in a `param` or anywhere else. It is one parse error at the `?`, PAR0007 "`?T` is not a Silk type; write an optional type as `Option<T>`", and the rest of the declaration is still checked. `pub param o: ?i32 = 1`, `param o: ?i32 = 1` and `let x: ?i32 = 3` each report PAR0007 alone. `pub param o: ?i32` with no default reports PAR0007 and then SEM0214 "package parameter `o` has no default value and no binding". Written as `Option<i32>`, the parameter gets the SEM0214 above.

## Defaults

- The default is a static expression of the declared type. A mismatch, as in `param a: i32 = true`, is SEM0214 at the default: "the default value of package parameter `a` does not have its type `i32`".
- It may call static functions and read `const` values and other parameters. Calling an ordinary function is SEM0176.
- A default that reads another parameter sees that parameter's final value, after bindings. This gives dependent parameters: `param queueDepth: i32 = workers * 8`.
- Parameters whose defaults read each other form a cycle (SEM0223).
- Every default is evaluated, even when a binding replaces it. A default that fails, for example through `compileError`, fails the build.
- See Static evaluation for what a static expression may contain.

## Validation with `where`

- `where predicate` follows the default, or the type when there is no default.
- The predicate must be `bool`. Otherwise it is SEM0214 at the predicate: "the `where` predicate of package parameter `x` is not a `bool`". It may read this parameter and others.
- Predicates run against the final values of all parameters, whether they come from a default or a binding.
- A predicate that is `false` is SEM0214 at the predicate: "the bound value of package parameter `x` does not satisfy its `where` predicate".
- Comparison and logical operators work in predicates. Indexing (`weights[0]`) is reported as unsupported ("unsupported: this construct is not supported by the native compiler yet").

## Using parameters

- A parameter name is a static value of its type. It can appear wherever such a value can: runtime expressions, `const` initializers, `static if` conditions, and `static` arguments.
- A module-level `static if` may test a parameter to choose declarations. See Static control flow and reflection.
- A `static` parameter that receives a package parameter gives one instance per final value. See Static evaluation.

## `pub param`

- Only a `pub param` accepts a binding. A binding that names a private parameter is refused.
- `pub` is what makes a parameter part of the package's configurable surface. Without it, the default is the only value.

## Bindings

A binding is a TOML table in `[[build.bindings]]` or `[[profiles.<name>.bindings]]`. It has exactly these keys:

| Key | Content |
| --- | --- |
| `package` | `"name@version"` of the package, such as `"demo@0.1.0"` |
| `module` | The root module's path without `.silk`, such as `"main"` for `src/main.silk` |
| `parameter` | The parameter's name |
| `value` | A typed value table, below |
| `origin` | `{ source = "...", provenance = "..." }`, plus `translator` when `provenance` is `"translated-public"` |

Value tables:

| `kind` | Other keys | For |
| --- | --- | --- |
| `"integer"` | `value = "decimal text"` | integer types; must fit the declared type |
| `"boolean"` | `value = true \| false` | `bool` |
| `"string"` | `value = "text"` | `string` |
| `"array"` | `values = [ ... ]`, each element a value table | fixed arrays; the length and element kinds must match |
| `"enum"` | `type`, `member` | enums (no parameter can have this type yet) |
| `"none"`, `"some"` | `value` for `some` | two-variant unions (not yet) |
| `"record"` | `fields = { name = ..., ... }` | structs (not yet) |

- Integer values are decimal strings, not TOML numbers. `"-0"` reads as `0`.
- An array binding lists one value table per element: `value = { kind = "array", values = [{ kind = "integer", value = "3" }, { kind = "integer", value = "4" }] }` binds a `[i32; 2]` parameter.
- `provenance` is `"literal"`, or `"translated-public"` with a `translator` key.
- Only `"translated-public"` takes a `translator`. A `"literal"` binding with one is refused at the line of its `origin`: `InvalidInput: build.bindings: origin.translator: only provenance "translated-public" names a translator`.
- `"secret"`, `"physical-supply"` and `"runtime"` are forbidden, with or without a `translator`. So is `"translated-public"` without a `translator`. One such binding anywhere in the manifest, even in an unselected profile, stops every build. The refusal follows the manifest path and the line of the binding's `origin`, and names the provenance: `ForbiddenProvenance: build.bindings: origin.provenance = "secret" cannot be bound in a manifest`, or `origin.provenance = "translated-public" needs origin.translator`. A profile's binding reads `profiles.<name>.bindings: ...`. Another spelling is `InvalidInput: build.bindings: origin.provenance = "bogus" is not literal, translated-public, secret, physical-supply or runtime`.
- A missing or mistyped field is named. A missing `origin`, `package`, `module`, `parameter` or `value` is refused at the line of the binding's `[[...]]` header, as in `InvalidInput: build.bindings: package is missing; a binding names its package, module and parameter` and `InvalidInput: build.bindings: value is missing`. A field of the wrong type is refused at its own line: `module must be a string`, `origin.source must be a non-empty string`, `origin.provenance must be a string`, `origin.translator must be a non-empty string`. A missing `source` or `provenance` is refused at the line of `origin`. An empty `source = ""` or `translator = ""` is accepted. An extra key is refused at its own line and named: `build.bindings.extra is not a supported field`. An extra key inside the `value` or `origin` table is refused at its own line too, named by its path: `build.bindings.value.extra`, `build.bindings.origin.bogus`. Inside an array value the element's number shows, counted from 0: `build.bindings.value.values.1.bogus is not a supported field` is an extra key in the second element. A profile's binding reads `profiles.<name>.bindings.value.extra`.
- A binding for an unknown parameter, a value of the wrong kind, or an integer out of range is refused with SEM0214 at the binding's `parameter` line in `silk.toml`, naming the parameter, as in ``silk.toml:10: error[SEM0214] invalid package parameter binding: the value bound to `x` does not have its parameter's type``. An unknown name reads "module `main.silk` declares no package parameter `y`". An array of the wrong length or element kind is refused the same way.
- Every binding is type-checked, including one that loses on precedence.

## Profiles and precedence

- `[profiles.<name>]` is a named build profile. `target` is required. Other fields include `optimization`, `safety`, `threading`, `debug`, `libc` and `artifact`; `silk/compilation` and `silk/target` read them. The native compiler refuses `safety = "unchecked"` and `threading = "multi"` for now; see Targets and profiles in the Projects section.
- `[build].profile` names the default profile. `--profile <name>` selects another. An unknown name is refused.
- A build of a named profile, selected by `--profile` or by `[build].profile`, writes its output to `build/llvm/<triple>/<name>/`. Other builds use `debug/` or `release/`.
- `--profile-input <json>` supplies a complete profile, with the same fields and `bindings`, as JSON.
- `--profile` and `--profile-input` cannot be combined with `--target`, `--release` or `--optimization`.
- `[[build.bindings]]` are project-tier bindings. Every build receives them, including `--release` builds without a profile.
- Bindings of the selected profile and of `--profile-input` are override-tier bindings. An override binding beats a project binding for the same parameter.
- Two bindings for one parameter at the same tier conflict, even with equal values. The build is refused.
- Without any binding, a parameter takes its default.

## Examples

```silk
pub param verbose: bool = false
pub param workers: i32 = 4 where workers > 0 && workers <= 64
param queueDepth: i32 = workers * 8
pub param label: string = "service"

fn spread(static count: i32, items: i32) -> i32 {
  return items / count
}

pub fn main() -> i32 {
  static if verbose {
    return 1
  }
  if queueDepth != 32 { return 2 }
  if label != "service" { return 3 }
  return spread(workers, 8) - 2
}
```

A required parameter and a profile override. `silk.toml`:

```toml
[package]
name = "demo"
version = "0.1.0"
silk-version = "0.1.0"
root = "src/main.silk"

[build]
profile = "dev"

[[build.bindings]]
package = "demo@0.1.0"
module = "main"
parameter = "port"
value = { kind = "integer", value = "8080" }
origin = { source = "silk.toml", provenance = "literal" }

[profiles.dev]
target = "x86_64-unknown-linux-gnu"

[[profiles.dev.bindings]]
package = "demo@0.1.0"
module = "main"
parameter = "verbose"
value = { kind = "boolean", value = true }
origin = { source = "silk.toml", provenance = "literal" }
```

`src/main.silk`:

```silk
pub param port: u16
pub param verbose: bool = false
param retries: i32 = 3 where retries >= 0

pub fn main() -> i32 {
  if port != 8080 { return 1 }
  static if !verbose { return 2 }
  return retries - 3
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0036 | Assignment to a parameter, which is not a writable place |
| SEM0176 | A default needs runtime work, such as an ordinary function call |
| SEM0177 | A default reached a `compileError` |
| SEM0214 | Rejected parameter schema, binding, default or predicate: invalid declaration or type, unbound `pub param`, refused binding, wrong default type, non-`bool` or false `where`, `param` in a module-level `static if`, or a parameter outside the root module |
| SEM0223 | Parameters whose defaults depend on each other |

## See also

Static evaluation · Static control flow and reflection · Program entry and termination · `silk/compilation`, `silk/target`
