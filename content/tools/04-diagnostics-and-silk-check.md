# Diagnostics and silk check

When the compiler rejects your code, it prints one line per problem: where it is, a stable code, and a message. `silk check` gets you those lines fastest, because it analyzes the package without generating code. This page shows how to read a diagnostic, what the code families mean, and how to get diagnostics as JSON for editors and CI. The full list of codes is in the Appendix, under **Diagnostic codes**.

## Check a package

```sh
silk check
```

With no errors, you get a heading, one row per compiler phase, and a final line:

```
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.08s
  check    2 modules                         0.16s
  borrow   99 bodies                         0.00s
Finished hello in 0.24s
```

The heading names the package and the target. `load` reads and parses the modules your package needs: 51 here, the std lib modules included, and 1 of them in your package. `check` analyzes the modules that matter to the program, and `borrow` checks ownership and borrowing in each function body. The times are wall-clock times and vary from run to run. **Progress output** below explains how these lines change in a terminal and how to turn them off.

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
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
Failed hello in 0.15s
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
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    failed: 2 modules, 2 errors       0.09s
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:5:4: error[SEM0003] Duplicate declaration name half
  note: /home/you/hello/src/main.silk:1:4: related location
/home/you/hello/src/main.silk:5:4: error[SEM0016] Multiple bindings claim half
  note: /home/you/hello/src/main.silk:1:4: related location
Failed hello in 0.14s
```

The second error follows from the first: fix the duplicate and it goes away.

A syntax error is reported once, where the source is damaged, and the parser carries on with the rest of the file. Here the parameter list of `half` is missing its `)`:

```silk
fn half(value: i32 -> i32 {
  return value / 2
}

pub fn main() -> i32 {
  let total: i32 = "8"
  return half(total)
}
```

```
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.11s
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:1:20: error[PAR0001] Expected `)`
/home/you/hello/src/main.silk:6:20: error[SEM0037] Assignment expected i32 but received string<'static>
Failed hello in 0.17s
```

The missing `)` gets one diagnostic, not one for each token the parser had to skip, and the type error in `main` is still found. When a declaration is damaged beyond repair, the parser skips to the next line that starts a declaration.

When you check several targets, each target with errors gets its own header, and the same mistake usually appears under each:

```sh
silk check --target host --target wasm32-unknown-unknown
```

```
Checking hello (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
Failed hello in 0.16s
Checking hello (wasm32-unknown-unknown)
  load     47 modules, 1 in package          0.03s
  check    failed: 2 modules, 1 error        0.02s
[wasm32-unknown-unknown]
/home/you/hello/src/main.silk:7:15: error[SEM0012] Expected i32 but received i64
Failed hello in 0.06s
```

The targets are checked one after the other, and each one prints its own heading, rows and final line. A failed phase says `failed:` and counts the errors it reported. The diagnostics follow the rows, and the `borrow` phase does not run once `check` has failed.

## When the location is not your file

Most diagnostics point into your own source. Two kinds point elsewhere:

- **At your call, for a std lib check.** Some std lib functions check their arguments while your code compiles. When a check fails, the diagnostic is located at your call, with the message the library gave. A misspelled placeholder in a log template is SEM0177 at the `Effect.log` call: `template field {versoin} not found; available visible fields: version`. Chapter 1 of the book walks through this case. A diagnostic can still point into the std lib, with the install shown as `<silk>`, when the std lib's own code is what the compiler cannot handle.
- **Into a dependency.** An error in a package you depend on is located in that package's file.

A message is sometimes a general description rather than a specific one, such as ``A `run` whose failures the enclosing signature does not declare``. That is the code's catalog meaning, printed when the compiler could not fill in the details. It often follows an earlier error; fix the first diagnostic in the list and check again.

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

## Progress output

The heading, the phase rows and the final line are progress output. `silk check`, `silk build` and `silk run` print them on standard error, so standard output stays free for a program's own output. `silk run` prints them for its build, then starts the program after the `Finished` line. `silk test` prints no progress rows.

| Row | Meaning |
| --- | --- |
| `load` | Modules read and parsed, and how many of them are in your package |
| `check` | Modules analyzed |
| `borrow` | Function bodies checked for ownership and borrowing |
| `codegen` | Functions turned into machine code (`silk build` and `silk run`) |
| `link` | The native linker run (`silk build` and `silk run`) |

`silk build` and `silk run` end with `Finished` and the path of the program they built, relative to the current directory. When the program is outside it, as when you build inside a workspace member, the path is absolute; it never starts with `../`. A command that stops on an error ends with `Failed <package> in <time>`.

A phase that fails says so in its row: `check    failed: 2 modules, 1 error`. A row with nothing more to say reads just `failed`, as the `link` row does when Clang is missing:

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     53 modules, 1 in package          0.10s
  check    1 module                          0.11s
  codegen  422 functions                     0.28s
  borrow   137 bodies                        0.01s
silk: cannot find clang on PATH; set SILK_CLANG or pass --clang the path of the Clang executable
  link     failed                            0.00s
Failed hello in 0.52s
```

A build that is refused before any module is checked, such as a package parameter binding that names no parameter or an `exports` entry that names no module, still gets a `load` row, then the message:

```
Checking taskcore (x86_64-unknown-linux-gnu)
  load     failed: 1 error                   0.00s
silk: invalid exports of taskcore@0.1.0: Stores is not a module of the package
Failed taskcore in 0.00s
```

How the rows look depends on where standard error goes:

- **Plain**, when standard error is a file, a pipe or a CI log: each row is printed once, when its phase ends. All the examples in these docs are plain output.
- **Live**, when standard error is a terminal: each running phase is redrawn in place with a spinner, a bar, a count and the elapsed time, and a finished phase gets a check mark or a cross. Colors are used unless the `NO_COLOR` environment variable is set to a non-empty value. The width follows `COLUMNS` and defaults to 80. A terminal with `TERM=dumb` gets plain output.

When one command covers several targets or workspace packages, live output keeps one line per finished package, and the running one is labeled like `[1/2] pricing`. A command that selects workspace packages ends with a total, such as `Finished 2 packages in 1.92s` or `Failed 1 of 2 packages in 0.84s`.

Choose the style with `--progress`, or with the `SILK_PROGRESS` environment variable when you cannot change the command line:

| Value | Effect |
| --- | --- |
| `auto` | Live in a terminal, plain otherwise. The default |
| `live` | Always live |
| `plain` | Always plain |
| `never` | No progress output at all. Diagnostics still print |

The option wins over the variable, and an invalid `SILK_PROGRESS` value is ignored. `--quiet` (or `-q`) keeps only the final line and the diagnostics:

```sh
silk check --quiet
```

```
Finished hello in 0.20s
```

`--json` and `--replay` print no progress output at all.

## Find slow modules

`silk check --timings` and `silk build --timings` add the five slowest items of each phase before the final line:

```sh
silk check --timings
```

```
Checking hello (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.06s
  check    2 modules                         0.21s
  borrow   126 bodies                        0.00s
  Slowest modules to check
      206.4ms  silk/native_start.silk
       3.61ms  main.silk
  Slowest bodies to borrow-check
       1.00ms  silk/list.releaseBuffer
       0.28ms  silk/native_start.start
       0.26ms  silk/execution_storage.acquire
       0.22ms  silk/native_diagnostics.makePool
       0.21ms  silk/native_start.(EntryResult<Effect<'env; () ! E ? &mut HostInput>> for Application<Effect<'env; () ! E ? &mut HostInput>>).code
Finished hello in 0.27s
```

`silk build --timings` also lists the slowest functions to emit. Std lib modules appear in the lists because they are checked with your program. A body is named by its module and its name as written: `silk/native_diagnostics.makePool` for a function, `silk/list.List<T>.appendBytes` for a method. A body inside a conformance shows the conformance in parentheses, as the `code` body of `silk/native_start` does above. A header written over several lines is shown on one line, with its spacing and trailing commas dropped. `--quiet` turns the lists off.

## Replay edits

`silk check --replay <script>` measures the incremental checker, the part of the compiler that rechecks only what an edit affects. It is a tool for working on the compiler and for reporting slow rechecks, not for checking your code: it prints counters, not diagnostics. The script is a TOML file of `[[edit]]` tables, applied in memory one after the other. Your files are not changed.

```toml
[[edit]]
kind = "trivia"
module = "main.silk"
find = "pub effect fn main"
replace = "// entry point\npub effect fn main"

[[edit]]
kind = "body"
module = "main.silk"
find = "Hello, world!"
replace = "Hello, Silk!"
```

| Key | Meaning |
| --- | --- |
| `kind` | What the edit changes: `trivia`, `body`, `header-same-type`, `header-new-type`, `add`, `delete` or `rename` |
| `module` | The file, relative to the package's source folder |
| `find`, `replace` | The text to replace. `find` must occur exactly once in the file |
| `to` | The new path, for a `rename` |

```sh
silk check --replay edits.toml
```

```
silk-replay step=0 kind=initial module=- demands=19659 hits=17540 units-run=2119 marked-outdated=0 fingerprinted=1402 unchanged=0 verified=0 graph-units=2119 graph-bytes=1114368 rejections=0 update-us=0 check-us=216831
silk-replay step=1 kind=trivia module=main.silk demands=1162 hits=1160 units-run=2 marked-outdated=2 fingerprinted=0 unchanged=0 verified=0 graph-units=2119 graph-bytes=1114368 rejections=0 update-us=57 check-us=8088
silk-replay step=2 kind=body module=main.silk demands=3102 hits=3068 units-run=34 marked-outdated=2 fingerprinted=0 unchanged=0 verified=0 graph-units=2151 graph-bytes=1769728 rejections=0 update-us=38 check-us=22087
```

Step 0 is the first full check. Each later step is one edit: `units-run` counts the pieces of work the checker redid, `hits` the ones it reused, and `check-us` the time in microseconds. The lines go to standard output. Add `--differential` to also check each step from scratch and compare: each step gets a `silk-replay-differential step=N rejections=0 differences=0` line, and the command exits 1 when the two disagree. A bad script exits 2 with a `silk:` line, such as `silk: replay edit 2 (main.silk): its find text does not occur exactly once`.

## Diagnostics as JSON

`silk check --json` writes each diagnostic as one JSON object on its own line, on standard error, in place of the human line. The heading, phase rows and final line are left out, so standard error holds only JSON. The exit status is the same.

```sh
silk check --json
```

```
{"target":"x86_64-unknown-linux-gnu","code":"SEM0012","severity":"error","path":"/home/you/hello/src/main.silk","line":7,"column":15,"start":109,"end":114,"message":"Expected i32 but received i64","notes":[],"related":[]}
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
- Progress rows go to standard error. `--progress`, `SILK_PROGRESS` and `--quiet` control them, and `--timings` lists the slowest modules.
- `silk check --json` writes one JSON object per diagnostic on standard error, with byte offsets and related locations.
- Fix the first diagnostic first; later ones are often consequences.
