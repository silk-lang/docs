# Writing documentation

Silk documentation lives in the source, in comments that start with `///` or `//!`. The tools read those comments as Markdown, resolve the links in them to declarations, and check the code examples. This page shows where the comments go, the headings the standard library uses, and how to link and give examples. **Doc tests and reference generation** covers the commands that consume them.

## Two kinds of doc comment

`///` documents the declaration right below it. `//!` documents the whole module and goes at the very top of the file.

```silk
//! Circle measurements in whole units.
//!
//! # When to use
//! Use [`diameter`] and [`circumference`] for quick integer estimates.

import silk.testing { AssertionError, Testing }

/// The diameter of a circle with radius `radius`.
pub fn diameter(radius: i32) -> i32 {
  return radius * 2
}
```

The rules for what attaches where are strict:

- A `///` block attaches only to a declaration on the very next line. A blank line between them, or an ordinary `//` comment, detaches it, and the comment documents nothing.
- Each line of the block must start with `///`, with only spaces before it. A `///` after code on the same line is not a doc comment.
- `////` (four or more slashes) is an ordinary comment.
- The `//!` block must be the first thing in the file, with no line before it. A `//!` further down is not module documentation.
- One space after `///` or `//!` is removed; the rest of the line is kept exactly, so indentation inside code blocks survives.

Doc comments can go on anything with a name: modules, structs and their fields, enums and their cases, unions, services, interfaces, functions, `impl` members, and parameters. A parameter is documented by a `///` line just above it inside the parameter list:

```silk
pub fn circumference(
  /// The radius in whole units.
  radius: i32
) -> i32 {
  return diameter(radius) * 3
}
```

Undocumented parameters are not shown on reference pages; documented ones are.

## The first sentence

Start every doc comment with one sentence that says what the thing is or does, then a blank line before anything more. The first paragraph is the summary: reference indexes show it next to the name. Write it as a phrase that completes "This is..." or "This...":

```silk
/// An axis-aligned rectangle measured in whole units.
pub struct Rect {
  /// The horizontal size.
  pub width: i32,
  /// The vertical size.
  pub height: i32,
}
```

For a function, describe the result or the action: "The area of `rect`, in square units." or "Fails with `message` when `condition` is false." Name parameters in backticks.

## Standard headings

After the summary, the standard library uses up to four headings, always in this order and always spelled this way. Use the ones that have something to say and skip the rest.

| Heading | What goes there |
| --- | --- |
| `# When to use` | Which declaration to reach for, and when to use something else instead. Mostly on modules |
| `# Details` | Rules, guarantees and behavior a careful caller needs: ownership, what happens at limits, cost |
| `# Gotchas` | Behavior that surprises people, and how to avoid it |
| `# Examples` | One or more complete programs, each under a `##` heading that names the task |

Write headings with a single `#` in every doc comment. The reference generator moves them down a level to fit the page: a module's `# Details` becomes `## Details`, a declaration's becomes `### Details`, and a `##` example title one level below that.

A module comment in the standard library style:

```silk
//! Small geometry helpers for rectangles and circles.
//!
//! # When to use
//! Use [`Rect`] for axis-aligned boxes and [`area`] to measure one. Circles live in
//! [`Circle.diameter`] and its neighbors.
//!
//! # Gotchas
//! Sides are `i32`, so [`Rect.width`] times [`height`] can overflow.
```

A function comment with a gotcha and an example:

````silk
/// The area of `rect`, in square units.
///
/// # Gotchas
/// The multiplication is not checked, so very large sides overflow.
///
/// # Examples
/// ```silk
/// import lib { Rect, area }
///
/// pub fn main() -> i32 {
///   let r = Rect { width: 3, height: 4 }
///   return area(&r) - 12
/// }
/// ```
pub fn area(rect: &Rect) -> i32 {
  return rect.width * rect.height
}
````

The rest is ordinary Markdown: paragraphs, lists, `inline code`, fenced code blocks, and links written `[text](https://...)`. The tools keep your Markdown as written and change only heading depth and code links.

## Link to declarations

Write a declaration's name in backticks inside square brackets: ``[`Rect`]``. The documentation tools resolve it to that declaration, and the reference pages turn it into a link. Plain backticks without brackets stay plain code.

| You write | Resolves to |
| --- | --- |
| ``[`area`]`` | A declaration in this module, or a name this module imports |
| ``[`Circle.diameter`]`` | A qualified name: a member of a type, or a declaration in a module this file imports as a whole (`import Circle`, not only `import Circle { diameter }`) |
| ``[`Rect.width`]`` | A field, case or method of a type |
| ``[`height`]`` | A member written bare, when exactly one type in this module has a member of that name |
| ``[`Self`]`` | Inside an `impl` or a type, the type being documented |
| ``[`Self.isSquare`]`` | A member of that type |

A link resolves against what the module can see, the same way code would. A name that resolves to nothing, or to more than one thing, is left as plain code with no link. `silk doc` prints a warning on standard error for each one, naming the file and the line of the link, and still exits 0:

```
warning: /home/you/shapes/src/Circle.silk:17: documentation link [`Nope`] names no declaration and stays plain code
```

A name that matches more than one declaration gets its own warning, which lists the candidates. Here a module comment links ``[`size`]`` and two structs, `A` and `B`, each have a public `size` field:

```
warning: /home/you/demo/src/main.silk:1: documentation link [`size`] is ambiguous: it could name `A.size` or `B.size`; qualify it with the owner, and until then it stays plain code
```

Only package documentation is checked this way; `silk doc --stdlib` prints no warnings.

A link to a private declaration resolves only when private declarations are extracted too, with `silk doc --include-private`. Without it, the private declaration is not in the output, so the link gets the same warning as a name that does not exist:

```
warning: /home/you/shapes/src/main.silk:1: documentation link [`helper`] names no declaration and stays plain code
```

Here `twice` is public and its comment links ``[`helper`]``, a private function. Reference pages show only public declarations, so link to private code only in documentation meant for the package's own developers.

To show brackets and code without a link, escape the bracket: `\[`. An ordinary Markdown link, `[text](url)` or a reference link with a definition, is never treated as a declaration link.

## How links look on a reference page

Each declaration on a generated page has an anchor named after its path in the module: `Rect`, `Rect.width`, `Rect.impl.square` for a method, and `Rect.impl.Drop` for an interface implementation. A repeated path gets `-2`, `-3` and so on. A link to another module points at that module's page, named after the last part of the module path in lowercase, with `-` in place of `_`: `silk.http_client` is on `http-client.md`.

This is how the `silk/option` module comment renders in the standard library reference. The source:

```
//! Use [`Option`] when absence is an expected answer and needs no error payload. Use [`map`] for a
//! pure transform, [`flatMap`] when the transform may also return absence, and [`unwrapOr`] only
//! when the caller is ready to consume the option.
```

The generated Markdown:

```markdown
Use [`Option`](#Option) when absence is an expected answer and needs no error payload. Use [`map`](#Option.impl.map) for a
pure transform, [`flatMap`](#Option.impl.flatMap) when the transform may also return absence, and [`unwrapOr`](#Option.impl.unwrapOr) only
when the caller is ready to consume the option.
```

## Examples in comments

A fenced block whose info string is `silk` is an example, and `silk doctest` type-checks it. Make each example a complete module: its own imports, and usually a `pub fn main() -> i32` that returns 0 when the example behaves as described. `silk doctest` runs an example with a `main` and fails it when `main` returns anything else, and a reader can copy it into a file and run it too.

Other fences, such as `text` or `toml`, are shown as they are and not checked. To show Silk code that should not be checked, such as a fragment, mark the fence `silk,ignore`:

````silk
/// ```silk,ignore
/// let c = circumference(2)
/// ```
````

To check an example with a `main` without running it, such as a server that never stops, mark the fence `silk,no_run`. `ignore` and `no_run` are the only attributes. Any other word after `silk,` makes the example fail, so a typo cannot quietly turn a check off. **Doc tests and reference generation** shows how to run the checks and how examples import your package.

## Style

Follow the standard library's voice so your pages read like its pages:

- Present tense, plain sentences, no first person. Say what the code does, not what it "will" do.
- Keep the summary to one sentence. Put rules in `# Details`, not in the summary.
- Prefer a link to a declaration over repeating its rules.
- Give each example a `##` title that names a task, such as "Store and recover one owned value".
- Document every public declaration, including fields and enum cases. A field's or case's comment can be a short phrase.

## Summary

- `///` documents the next line's declaration; `//!` at the top of a file documents the module. Blank lines and `//` comments detach a doc comment.
- Start with a one-sentence summary, then use `# When to use`, `# Details`, `# Gotchas` and `# Examples` as needed.
- Link with ``[`Name`]``, ``[`Type.member`]`` or ``[`Self`]``. Unresolved links stay plain text, and `silk doc` warns about each one.
- `silk` fences are checked by `silk doctest`, and those with a `main` are run; mark fragments `silk,ignore` and programs that must not run `silk,no_run`.
