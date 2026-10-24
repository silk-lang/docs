# Package parameters

A package parameter is a named static value that the build request may set. It is declared with `param` in a package's root module, takes its value from `[config]` in `silk.toml` or from its default, and may be checked with a `where` predicate.

## Syntax

```
ParameterDeclaration = 'pub'? 'param' Identifier ':' Type ('=' Expression)? ('where' Expression)?
```

Manifest tables (TOML) that supply values:

```
[config]
ModulePath.ParameterName = Value              (project tier)
[build]
profile = ProfileName
[profiles.ProfileName]
target = Triple                               (optional; the host by default)
config.ModulePath.ParameterName = Value       (override tier)
```

## Declarations

- `param name: T = default` declares a private parameter. A private parameter must have a default.
- `pub param name: T` may omit the default. Every build must then bind it.
- Package parameters are read only from the root module of the package being built (`[package].main` below `[package].source`, by default `src/main.silk`).
- A `param` in any other module, or in a dependency package, is not registered. Reading it is SEM0214, reported at the `param` declaration.
- A `param` cannot appear inside a module-level `static if` arm. Parameters are fixed before `static if` selects declarations. Such a `param` is SEM0214 at its declaration.
- A parameter is read-only. Assigning to it is SEM0036.
- A violation of these schema rules stops `silk check` and `silk build` with SEM0214 and a reason. A rule broken in the source is reported at the declaration:

```
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: a private package parameter needs a default value
```

- A `pub param` that nothing binds and that has no default is reported at its declaration, by `silk check` and `silk build`:

```
src/main.silk:1:1: error[SEM0214] Invalid compilation configuration: package parameter `x` has no default value and no binding; give it a default or set it under `[config]` in silk.toml
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

- Only a `pub param` accepts a value from `[config]`. A value for a private parameter is refused: "package parameter `x` is not `pub`, so it cannot be bound".
- `pub` is what makes a parameter part of the package's configurable surface. Without it, the default is the only value.

## Setting values with `[config]`

A value is one line under `[config]`. The key is the root module's path without `.silk`, then the parameter's name: `main.port = 8080` sets `port` of `src/main.silk`, and `lib.level = 2` sets `level` of `src/lib.silk` in a library. A module below the source root spells its directories with dots: `net.http.retries = 3` is `src/net/http.silk`.

```toml
[config]
main.port = 8080
main.weights = [3, 4]

[config.main]           # the same, written as a table
label = "edge"
```

The value is plain TOML. Silk checks it against the parameter's declared type:

| Declared type | TOML value |
| --- | --- |
| An integer type | An integer, such as `8080`, `-3`, `1_000` or `0xff`. It must fit the type. `-0` reads as `0`. |
| `bool` | `true` or `false` |
| `string` | A string |
| `[T; N]` | An array of exactly `N` values of `T`, such as `[3, 4]` for `[i32; 2]` |

- Every value in a manifest is a literal. Values that come from somewhere else, such as a secret or the environment, cannot be written there.
- A key with no module before the parameter is refused at its line: `InvalidInput: config.port: name the module before the parameter, as config.main.port`.
- A float, date or time is refused at its line: `InvalidInput: config.main.ratio: a package parameter value is an integer, a boolean, a string or an array of them`.
- A value for an unknown parameter, of the wrong type, or out of range is refused with SEM0214 at the line of its key, naming the parameter, as in ``silk.toml:6: error[SEM0214] invalid package parameter binding: the value bound to `port` does not have its parameter's type``. An unknown name reads "module `main.silk` declares no package parameter `prot`". An array of the wrong length or element type is refused the same way.
- Every value is type-checked, including one that loses on precedence.
- `[config]` only reaches the package the manifest describes. A dependency's parameters keep their defaults.
- Before 0.1.0 values were written as `[[build.bindings]]` tables with tagged values. `build.bindings` and a profile's `bindings` are now refused at their line: `build.bindings is an earlier spelling; write config, as config.main.limit = 42`.

`--profile-input` JSON still carries tagged `bindings`, the transport tools use. Each binding has `package` (`"name@version"`), `module` (`"main"`), `parameter`, `value` and `origin`. A value is `{ "kind": "integer", "value": "8080" }`, `{ "kind": "boolean", "value": true }`, `{ "kind": "string", "value": "x" }` or `{ "kind": "array", "values": [ ... ] }`. `origin` is `{ "source": "...", "provenance": "literal" }`, or `"translated-public"` with a `translator`; `"secret"`, `"physical-supply"` and `"runtime"` are refused.

## Profiles and precedence

- `[profiles.<name>]` is a named build profile. `target` defaults to the host. Other fields include `optimization`, `safety`, `threading`, `debug`, `libc` and `artifact`; `silk/compilation` and `silk/target` read them. The native compiler refuses `safety = "unchecked"` and `threading = "multi"` for now; see Targets and profiles in the Projects section.
- `[build].profile` names the default profile. `--profile <name>` selects another. An unknown name is refused, and so is an empty one: `profile = ""` is `InvalidInput: build.profile`.
- A build of a named profile, selected by `--profile` or by `[build].profile`, writes its output to `build/llvm/<triple>/<name>/`. Other builds use `debug/` or `release/`.
- `--profile-input <json>` supplies a complete profile, with the same fields and tagged `bindings`, as JSON.
- `--profile` and `--profile-input` cannot be combined with `--target`, `--release` or `--optimization`.
- `[config]` values are project-tier. Every build receives them, including `--release` builds without a profile.
- A profile's `config` values (`config.main.verbose = true` in `[profiles.<name>]`) and the bindings of `--profile-input` are override-tier. An override value beats a project value for the same parameter.
- Two values for one parameter at the same tier conflict, even when they are equal. The build is refused.
- Without any value, a parameter takes its default.

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
  if queueDepth != 32 {
    return 2
  }
  if label != "service" {
    return 3
  }
  return spread(workers, 8) - 2
}
```

A required parameter and a profile override. `silk.toml`:

```toml
[package]
name = "demo"
version = "0.1.0"
silk-version = "0.1.0"

[config]
main.port = 8080

[build]
profile = "dev"

[profiles.dev]
config.main.verbose = true
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
