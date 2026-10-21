# Modules and imports

Each `.silk` file is a module, and its path below the source root is its name. Imports bring a module, or names from it, into scope. Everything in a module is private to it until marked `pub`.

## Syntax

```
ImportDecl  = 'pub'? 'import' ModulePath ('as' Identifier)? MemberList?
ModulePath  = Segment ('.' Segment)*
MemberList  = '{' Member (',' Member)* ','? '}'
Member      = Identifier ('as' Identifier)?
```

- `pub import` requires a member list.
- Imports are module-level declarations. They may also sit inside a top-level `static if`, as std lib modules do.

## Files are modules

- The module name is the file's path below `[package].source-root`, without `.silk`, with `/` written as `.`. `src/geometry/Point.silk` is `geometry.Point` when the source root is `src`.
- The source root defaults to the directory of `[package].root`. See **The manifest**.
- Names match file names exactly, case included. `import geometry.point` does not find `Point.silk`.
- A directory is not a module. `import geometry` fails when only `geometry/` exists.
- There is no module declaration inside the file.
- A module named `tests` and a directory `tests/` can sit side by side: `tests` is `src/tests.silk`, `tests.Fakes` is `src/tests/Fakes.silk`.

## Import forms

| Form | Binds |
| --- | --- |
| `import geometry.Point` | the module, as `Point` (the last segment) |
| `import geometry.Point as P` | the module, as `P` |
| `import geometry.Point { Point, normSquared }` | the two names |
| `import geometry.Point { normSquared as norm2 }` | `norm2` |
| `import geometry.Shapes as S { Rect }` | the module as `S`, and `Rect` |

- A module binding gives qualified access: `Point.normSquared(&p)`.
- Members are types, functions, constants, interfaces and services the module declares or re-exports.
- A module path whose last segment is a keyword, such as `silk.match`, needs `as` or a member list (PAR0004).
- Std lib modules start with `silk.`. A dependency's modules start with the dependency name: `import pricing.lib { discounted }`. See **The standard library** and **Dependencies**.

## Re-exports

`pub import` makes the imported names part of the importing module's public surface.

```silk
pub import geometry.Point { Point, normSquared as norm2 }
```

Another module can then write `import geometry.Shapes { Point, norm2 }`, or call `S.norm2(...)` through a module binding.

## Visibility

- Without `pub`, a declaration is visible only inside its own module. The boundary is the module, not the package.
- `pub` applies separately to the type, to each field, to each method, and to the fields of each union variant.
- A struct whose fields are not all visible cannot be built with a literal outside its module (SEM0021). Reading a private field is SEM0028.
- A `pub` declaration may not mention a private type in its signature (SEM0019).
- Impls take no `pub`. An impl is usable wherever its type is visible.
- Across packages, the module must also be listed in the dependency's `exports` (MOD0003). See **Libraries and exports**.

## Cycles and reachability

- Modules of one package may import each other in a cycle. `A` importing `B` while `B` imports `A` is fine.
- In a program, `check`, `build` and `test` see the root module and every module reachable from it by imports. A file nothing imports is not checked. A library also covers every module in `exports`.
- A module may import the root module: `import main { execute }`.

## Example

```
src/
  main.silk
  geometry/
    Point.silk
    Shapes.silk
```

`src/geometry/Point.silk`:

```silk
/// A point on the plane.
pub struct Point {
  pub x: i32
  pub y: i32
}

/// The squared distance from the origin.
pub fn normSquared(point: &Point) -> i32 {
  return point.x * point.x + point.y * point.y
}

fn secret() -> i32 {
  return 42
}
```

`src/geometry/Shapes.silk`:

```silk
pub import geometry.Point { Point, normSquared as norm2 }

/// A rectangle given by two corners.
pub struct Rect {
  pub low: Point
  pub high: Point
}

pub fn area(rect: &Rect) -> i32 {
  return (rect.high.x - rect.low.x) * (rect.high.y - rect.low.y)
}
```

`src/main.silk`:

```silk
import geometry.Point
import geometry.Shapes as S { Rect, area }

pub fn main() -> i32 {
  let corner = Point.Point { x: 3, y: 4 }
  let rect = Rect { low: Point.Point { x: 0, y: 0 }, high: move corner }
  if Point.normSquared(&rect.high) != 25 {
    return 1
  }
  if S.norm2(&rect.high) != 25 {
    return 2
  }
  return area(&rect)
}
```

```sh
silk run; echo "exit $?"
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/shapes (llvm, x86_64-unknown-linux-gnu, 184 symbols)
exit 12
```

Importing the private `secret`:

```silk
import geometry.Point { secret }
```

```
[x86_64-unknown-linux-gnu]
/home/you/shapes/src/main.silk:1:25: error[SEM0015] An import or qualified reference naming a private member of another module
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| MOD0001 | No module at that path: `Unknown module geometry.Pointt` |
| MOD0002 | A module imports itself. Only the import is reported, with no follow-on SEM0016 in that module or in modules that import it |
| MOD0003 | Another package's module that its `exports` does not list |
| MOD0004 | An import of `Intrinsic`, or of a module under it. `Intrinsic` needs no import. See **The standard library** for reserved names |
| SEM0014 | The module has no such member: `Module geometry/Point has no member Nope` |
| SEM0015 | The member exists but is private |
| SEM0016 | Two bindings with the same name in one scope, such as a module and a type both called `Board` |
| SEM0019 | A `pub` signature mentions a private type |
| SEM0021 | Struct literal outside its module while a field is private |
| SEM0028 | Reading a private field of another module's struct |
| PAR0001 | `pub import` without a member list (`Expected {`) |
| PAR0004 | Keyword as the last path segment with no `as` or member list |

## See also

The manifest, The standard library, Dependencies, Libraries and exports; **Structs, tuples and arrays**, **Enums and unions** and **Package parameters** in the reference (parameters may only be declared in the root module); chapter 12 of the book.
