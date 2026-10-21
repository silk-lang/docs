# Diagnostics and silk check

When the compiler rejects your code, it prints one line per problem: where it is, a stable code, and a message. `silk check` gets you those lines fastest, because it analyzes the package without generating code. This page shows how to read a diagnostic, what the code families mean, and how to get diagnostics as JSON for editors and CI. The full list of codes is in the Appendix, under **Diagnostic codes**.

## Check a package

```sh
silk check
```

With no errors, you get one line per target and a summary:

```
check x86_64-unknown-linux-gnu: ok
Check summary: 1 succeeded, 0 failed
```

`silk build`, `silk run` and `silk test` report the same diagnostics, in the same form, before they stop. `silk check` is the quick way to see them. It exits 0 when every target checks, and 1 when any target has an error.

## Read a diagnostic

This program passes an `i64` where an `i32` is expected:

```silk
fn half(value: i32) -> i32 {
  return value / 2
}

pub fn main() -> i32 {
  let count: i64 = 4
  return half(count)
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

Read it piece by piece:

| Part | Here | Meaning |
| --- | --- | --- |
| Target header | `[x86_64-unknown-linux-gnu]` | The target being checked. The diagnostics below it belong to that target |
| Location | `/home/you/hello/src/main.silk:7:15` | File, line and column, both counted from 1. Column 15 is the start of `count` |
| Severity | `error` | Every diagnostic is an error today; there are no warnings |
| Code | `SEM0012` | A stable identifier. Search for it in the Appendix |
| Message | `Expected i32 but received i64` | What went wrong, with the names and types filled in |

Some diagnostics also point at a second place that matters. Each such place follows the diagnostic on its own indented `note:` line. Declaring `half` twice names the first declaration:

```silk
fn half(value: i32) -> i32 {
  return value / 2
}

fn half(value: i32) -> i32 {
  return value / 2
}

pub fn main() -> i32 {
  return half(8)
}
```

```
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:5:4: error[SEM0003] Duplicate declaration name half
  note: /home/you/hello/src/main.silk:1:4: related location
/home/you/hello/src/main.silk:10:10: error[SEM0016] Two bindings in one scope claiming the same spelling
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

The second error follows from the first: fix the duplicate and it goes away.

When you check several targets, each target with errors gets its own header, and the same mistake usually appears under each:

```sh
silk check --target host --target wasm32-unknown-unknown
```

```
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
[wasm32-unknown-unknown]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
check x86_64-unknown-linux-gnu: failed (exit 1)
check wasm32-unknown-unknown: failed (exit 1)
Check summary: 0 succeeded, 2 failed
```

Diagnostics go to standard error and the result lines to standard output, so in a terminal the two can interleave.

## When the location is not your file

Most diagnostics point into your own source. Two kinds point elsewhere:

- **At your call, for a std lib check.** Some std lib functions check their arguments while your code compiles. When a check fails, the diagnostic is located at your call, with the message the library gave. A misspelled placeholder in a log template is SEM0177 at the `Effect.log` call: `template field {versoin} not found; available visible fields: version`. Chapter 1 of the book walks through this case. A diagnostic can still point into the std lib, with the install shown as `<silk>`, when the std lib's own code is what the compiler cannot handle.
- **Into a dependency.** An error in a package you depend on is located in that package's file.

A message is sometimes a general description rather than a specific one, such as `Two bindings in one scope claiming the same spelling`. That is the code's catalog meaning, printed when the compiler could not fill in the details. It often follows an earlier error; fix the first diagnostic in the list and check again.

## Code families

The letters of a code say which part of the compiler found the problem. A syntax error does not stop analysis of the rest of the file, so a `PAR` error can be followed by `SEM` errors that it caused.

| Family | Phase | Typical causes | Example |
| --- | --- | --- | --- |
| `LEX` | Lexical: reading characters into tokens | A number like `0x` with no digits, a misplaced digit separator, an unterminated literal | LEX0004 |
| `PAR` | Parser: building the syntax tree | A missing token, an unexpected token such as a `;` after a statement | ``error[PAR0002] Unexpected `;`; expected valid syntax`` |
| `MOD` | Modules: resolving imports | An import of a module that does not exist, or that its package does not export | `error[MOD0001] Unknown module silk.vector` |
| `SEM` | Semantic analysis | Unknown names, type mismatches, wrong arguments, effect rows, services, generics, static evaluation | `error[SEM0012] Expected i32 but received i64` |
| `OWN` | Ownership and borrowing | Use after move, conflicting borrows, a borrow that outlives its value | `error[OWN0001] data was moved and cannot be used again` |

`SEM` is by far the largest family. The ownership rules behind `OWN` codes are in **Ownership and moves** and **Borrowing** in the language reference.

`silk check` and `silk build` report a lexical mistake at the bad token and skip parse errors inside it:

```
/home/you/hello/src/main.silk:2:15: error[LEX0004] Base-16 integer literal without digits
```

`silk format` refuses such a file and lists its codes, parse errors included: `cannot format damaged source (LEX0004, PAR0002)`.

## Lines that are not coded diagnostics

A few other lines can appear around diagnostics:

| Line | Meaning |
| --- | --- |
| `path:line:column: unsupported: this construct is not supported by the native compiler yet` | The code may be valid, but this compiler cannot handle it yet. The command exits 2 |
| `SILK_GAP ...` | A notice about a known gap in the native compiler, such as the test result cache. Informational unless the command stops |
| `silk: ...` | The command itself failed: no manifest, an unknown package, an invalid option |
| `ARTIFACT-001` and similar | The build setup was refused, for example a target with no runtime or a missing native tool. The line names the subject and how to fix it |

## Diagnostics as JSON

`silk check --json` writes each diagnostic as one JSON object on its own line, on standard error, in place of the human line. The result lines and summary stay the same on standard output, and so does the exit status.

```sh
silk check --json
```

```
{"target":"x86_64-unknown-linux-gnu","code":"SEM0012","severity":"error","path":"/home/you/hello/src/main.silk","line":7,"column":15,"start":109,"end":114,"message":"Expected i32 but received i64","notes":[],"related":[]}
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

| Field | Type | Meaning |
| --- | --- | --- |
| `target` | string | The target triple being checked |
| `code` | string | The stable code, such as `SEM0012` |
| `severity` | string | Always `"error"` today |
| `path` | string | Absolute path of the file |
| `line`, `column` | number | 1-based position of the start |
| `start`, `end` | number | Byte offsets of the span in the file, end exclusive |
| `message` | string | The same text as the human line |
| `notes` | array of strings | Reserved; empty today |
| `related` | array of objects | Other places that matter, each with `path`, `line`, `column`, `start`, `end` and `label` |

A duplicate declaration, for example, points at the second `half` and lists the first one as related:

```
{"target":"x86_64-unknown-linux-gnu","code":"SEM0003","severity":"error","path":"/home/you/hello/src/main.silk","line":5,"column":4,"start":54,"end":58,"message":"Duplicate declaration name half","notes":[],"related":[{"path":"/home/you/hello/src/main.silk","line":1,"column":4,"start":3,"end":7,"label":null}]}
```

The human format prints the same related location as the `note:` line shown in **Read a diagnostic**.

For CI, `silk check` on its own is enough: it exits 1 on any error. Use `--json` when a tool needs to place the errors, such as an editor or a review bot. Read standard error line by line and parse the lines that start with `{`.

## Summary

- A diagnostic reads `path:line:column: error[CODE] message`, under a `[target]` header, followed by an indented `note:` line for each related location.
- The code family tells you the phase: `LEX`, `PAR`, `MOD`, `SEM` or `OWN`.
- A std lib check that rejects your arguments is reported at your call. A location inside the std lib is rare and usually an `unsupported` line.
- `silk check --json` writes one JSON object per diagnostic on standard error, with byte offsets and related locations.
- Fix the first diagnostic first; later ones are often consequences.
