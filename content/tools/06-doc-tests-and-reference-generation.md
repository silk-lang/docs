# Doc tests and reference generation

Three commands work with documentation comments. `silk doc` extracts your package's documentation as JSON. `silk doctest` type-checks every Silk example in your package and runs each one that is a program, so the examples cannot drift away from the code. `silk doc-reference` turns the standard library's documentation into the Markdown API reference. How to write the comments themselves is in **Writing documentation**.

## Extract documentation with silk doc

Run `silk doc` anywhere in a package:

```sh
silk doc
```

```
warning: /home/you/shapes/src/Circle.silk:5: documentation link [`lib.area`] names no declaration and stays plain code
warning: /home/you/shapes/src/Circle.silk:17: documentation link [`Nope`] names no declaration and stays plain code
Documentation: /home/you/shapes/build/documentation.json
```

The warnings name links in doc comments that resolve to no declaration; see **Writing documentation**. They go to standard error and do not change the exit status.

The file describes every module of the package and every declaration in it, with its doc comment as Markdown and the links in that comment already resolved. Every module means every module `check` sees: the root and the modules it reaches by imports, plus `exports` for a library (see **Modules and imports**). A new module that nothing imports yet is left out, and `silk doctest` then collects none of its examples. `-o <path>` writes somewhere else; the path is relative to the package directory, not the current directory. `--target <triple>` extracts for another target, which matters when a module's declarations differ by target.

At a workspace root, `silk doc` writes one file per member, `build/documentation/<member>.json`, and refuses `-o`. To write one member's file elsewhere, select it with `--manifest-path <member>/silk.toml`.

By default only public declarations are included. `--include-private` adds private ones, test functions among them; use it for internal documentation or tooling, not for published pages.

### The JSON format

The format is marked `"experimental": true` and may change. Its outline:

| Field | Meaning |
| --- | --- |
| `schema`, `version` | `"silk-documentation"` and `1` |
| `target`, `profile` | The target the documentation was extracted for |
| `modules[]` | One entry per module: `name`, `sourcePath`, `documentation`, `items` |
| `items[]` | Declarations in source order: `id`, `kind`, `name`, `visibility`, `signature`, `source`, `documentation`, and `parent` (an index into `items`) for members |
| `documentation` | The comment as `markdown`, its `source` position, and resolved `links` |
| `links[]` | Each ``[`Name`]`` in the comment: its `spelling` and the `target` declaration `id` |

`kind` is a word such as `Struct`, `Field`, `Function`, `AssociatedFunction` or `Parameter`, and `visibility` is `Public`, `Private` or `Inherited`. A link that did not resolve has no entry in `links`, and `silk doc` warns about it.

## Check examples with silk doctest

Run `silk doctest` anywhere inside a package. It extracts the package's documentation the way `silk doc` does, in memory, and checks each `silk` fence in it:

```sh
silk doctest
```

```
/home/you/shapes/src/lib.silk:39 (byte 977): PASSED
/home/you/shapes/src/Circle.silk:21 (byte 552): PASSED
Doctest: 2 collected, 2 passed, 0 skipped, 0 failed.
```

Each line names the file and the line where the example's fence opens. At a workspace root, `silk doctest` checks and runs the examples of every member, each member's results under a `Package <name>` line, and fails when any example fails or no member has one. `--manifest-path <member>/silk.toml` checks one member. A JSON file that `silk doc` already wrote can be checked instead with `silk doctest -i build/documentation.json --source-root src`; `-i` is short for `--input`.

What a check does:

- Each example is type-checked as a complete module of its own, with every declaration and import checked.
- An example that declares a `main` is then built for your machine with the package's default profile and run in the package directory. It passes when `main` returns 0. Any other status fails it, and its output is printed under the result line.
- An example without a `main` is only type-checked, and so is one marked `silk,no_run`, such as a server that never stops.
- Results are printed in source order. A `silk,ignore` fence counts as skipped. A fence with any other attribute fails without being checked.
- With `--target <triple>` for another platform, or with `-i` or `--stdlib`, examples are only type-checked, not run.

An example that does not type-check prints its diagnostics, located in the example itself as `example:line:column`:

```
/home/you/shapes/src/lib.silk:39 (byte 977): PASSED
/home/you/shapes/src/Circle.silk:21 (byte 552): FAILED
example:4:27: error[SEM0135] Operator - does not accept (i32, string<'static>)
Doctest: 2 collected, 1 passed, 0 skipped, 1 failed.
```

Line 4 of that example is `return circumference(2) - "12"`. An example whose program returns something other than 0 says so:

```
/home/you/shapes/src/lib.silk:39 (byte 977): FAILED: the example exited with status 1
```

An example program is built like any program of the package, into `build/doctest/`, so the first run takes as long as a build. A program that never stops keeps `silk doctest` waiting, so mark it `silk,no_run`.

### How examples import your package

An example sees the standard library and your package, by the package's name or by each module's path below the source root. In the `shapes` package, `src/lib.silk` is `shapes.lib` or `lib`, and `src/Circle.silk` is `shapes.Circle` or `Circle`. A hyphenated name is written with underscores, as a dependent package writes it: package `round-shapes` is `round_shapes.lib`. This example imports `shapes.Circle` by the package name:

````silk
/// ```silk
/// import shapes.Circle { circumference }
///
/// pub fn main() -> i32 {
///   return circumference(2) - 12
/// }
/// ```
````

The package name makes an example read like code in a package that depends on yours. Unlike a dependent package, an example can also name modules the package does not export, such as `shapes.Circle` here. When you check a JSON file with `-i`, pass `--source-root src` too; the package name then comes from the nearest `silk.toml` above that directory. Without it, neither form resolves, and each failing import is reported once:

```
/home/you/shapes/src/lib.silk:39 (byte 977): FAILED
example:1:8: error[MOD0001] Unknown module lib
/home/you/shapes/src/Circle.silk:21 (byte 552): FAILED
example:1:8: error[MOD0001] Unknown module shapes.Circle
Doctest: 2 collected, 0 passed, 0 skipped, 2 failed.
```

### Exit status

| Status | When |
| --- | --- |
| 0 | At least one example was collected and none failed |
| 1 | An example failed, or no example was collected at all |
| 2 | The input is missing or not valid documentation JSON, or an option is wrong |

A run with nothing to check is a failure on purpose, so a broken setup cannot pass silently:

```
Doctest: 0 collected, 0 passed, 0 skipped, 0 failed.
No Silk examples collected; nothing was verified.
```

### In CI

One command is enough:

```sh
silk doctest
```

`silk doctest --stdlib` checks the standard library's own examples, with no JSON file needed. It is how the std lib keeps its 73 examples honest, and a quick way to confirm an installation works.

## Generate the std lib reference with silk doc-reference

`silk doc-reference` writes the Markdown pages of the standard library API reference: one page per module and an `index.md` that lists them with their summaries.

```sh
silk doc-reference -o reference/stdlib
```

It extracts the library once per supported profile: Apple Silicon macOS, arm64 and x86\_64 Linux with and without libc, and `wasm32-unknown-unknown`. Each page lists the profiles it applies to. When a module's public surface differs between profiles, each distinct surface gets its own page: `os-filesystem.md` for the hosted targets and `os-filesystem.profile-2.md` for the no-libc and WebAssembly ones. Code links become Markdown links to anchors on the same page or on another module's page. Each page starts with a `Generated by silk doc-reference` comment; edit the doc comments in the source, not the pages.

The std lib comes from the installation unless you pass `--stdlib-root <directory>`, which must hold the library's `manifest.json`. Writing replaces every page and removes `.md` files in the output directory that no longer belong there.

`--check` compares instead of writing, and reports each difference:

```
/home/you/silk/reference/stdlib/core-bool.md is missing
/home/you/silk/reference/stdlib/mem-box.md is stale
/home/you/silk/reference/stdlib/old.md is extra or renamed
```

It exits 1 when anything differs and 0 when the pages are current, so CI can fail when someone changes a doc comment without regenerating.

### Reference pages for your own package

`doc-reference` works only on the standard library in this release. For your own package, `silk doc` gives you the same information as JSON, ready for a site generator of your own. A Markdown generator for any package is planned.

## Summary

- `silk doc` writes `build/documentation.json`; `--include-private` adds private declarations.
- `silk doctest` type-checks every `silk` example of the package it runs in, runs each one with a `main`, and exits 1 when one fails or none are found. Mark examples that must not run `silk,no_run`.
- Examples import your modules by package name, with `_` for `-` in a hyphenated name, such as `import shapes.Circle { ... }`, or by their path under the source root.
- `silk doc-reference -o <dir>` regenerates the std lib Markdown reference; `--check` verifies it is current.
