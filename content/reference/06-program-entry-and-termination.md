# Program entry and termination

An executable starts at `pub fn main` or `pub effect fn main` in the package's root module. This page covers the accepted `main` signatures, exit status, uncaught failures, traps, and reading arguments and standard input.

## Syntax

```
Main        = 'pub' 'fn' 'main' '(' ')' ( '->' MainResult )? Block
            | 'pub' 'effect' 'fn' 'main' '(' ')' ( '->' MainResult )? FailureRow? HostRow? Block
MainResult  = 'i32' | '()'
FailureRow  = '!' Type ( '|' Type )*
HostRow     = '?' '&' 'mut' 'HostInput'
```

## Entry point

- The entry point is the function named `main` in the root module of the package. It must be `pub` and take no parameters.
- The default hosted runtime is the std lib module `silk/platform/native/start`. It calls `main` and turns its result into the process status.
- A package can name other runtimes in `silk.toml`, as `[unstable]` `composition = { runtimes = [{ name = "synchronous", module = "silk/platform/native/start_sync" }], defaults = [] }`. A profile picks one with `runtime = { kind = "named", name = "synchronous" }` beside its `target`, and `silk build --profile <name>` uses it. A name listed in `defaults` is used by a plain `silk build`. `silk/platform/native/start_sync` starts only an `effect fn main() -> i32 ? &HostInput`. It also accepts `? &mut HostInput` and a failure row. A typed failure drops its payload and exits with 1, with no report.
- Under `silk/platform/native/start_sync`, any other `main`, such as `pub fn main() -> i32` or `pub effect fn main() -> i32` with no requirement, is SEM0225 at `main` in both `silk check` and `silk build`: "Entry point `main` has a result or requirement the selected runtime `silk/platform/native/start_sync` cannot start".
- Both `silk check` and `silk build` check the entry against the runtime, except for parking: a `main` that may park passes `silk check` and fails only `silk build`. A `main` the runtime cannot start is SEM0225, reported at the name `main`, or at line 1, column 1 when there is none:

| Problem | Message |
| --- | --- |
| No `main` in the root module | Entry point `main` is missing: the entry module must declare `pub fn main` |
| `main` is not `pub` | Entry point `main` must be `pub` |
| `main` declares a parameter | Entry point `main` must take no parameters |
| Unsupported result type or requirement | Entry point `main` has a result the selected runtime cannot start; the default runtime accepts i32, (), or an Effect producing () or i32 that requires at most `&mut HostInput` |
| A `main` shape a std lib runtime such as `silk/platform/native/start_sync` does not adapt | Entry point `main` has a result or requirement the selected runtime `<module>` cannot start |
| `main` may park | Entry point `main` may park, but the selected runtime starts it without a scheduler, so it must not park |

- The parking check runs only in `silk build`. See Fibers and scheduling.

## Accepted signatures

| Signature | Exit status |
| --- | --- |
| `pub fn main() -> i32` | The returned value |
| `pub fn main()` or `pub fn main() -> ()` | 0 |
| `pub effect fn main() -> i32 ! E` | The returned value, or 1 on an uncaught failure |
| `pub effect fn main() ! E` | 0, or 1 on an uncaught failure |

- The failure row `! E` is optional and may list several types: `! A | B`. Each type must implement `Debug`, which the report uses to show the value. Otherwise `main` is rejected (SEM0225).
- The only requirement the runtime provides is `? &mut HostInput` from `silk/system/host_input`. It holds an owned copy of the arguments and environment.
- Any other requirement, such as `? &mut Allocator`, is rejected (SEM0225). Supply other services inside `main`, for example `Allocator.systemAllocatorProvider()`. See Services and providers.
- Other result types, such as `u8` or `bool`, are rejected (SEM0225).
- A plain `pub fn main` can still `run` an effect whose failures are all handled, for example through `Effect.catchAll`.

## Exit status

- On POSIX hosts the status is the low 8 bits of the returned `i32`. `return 300` exits with 44 and `return -1` exits with 255.
- Returning normally from a unit `main` exits with 0.

## Uncaught failures

- A failure that escapes an effect `main` ends the program with status 1. The payload is dropped first.
- The runtime writes a report to standard error. The first line names the failure's type as `module.Type`. Each following line is a frame `at module.function (module:line:column)`, innermost first.
- When a failure escapes from a handler that was handling another failure, the report adds a `while handling:` section for the earlier one.
- The last line, `unhandled value:`, holds the failure's `Debug` form, written before the payload is dropped. A form longer than 1024 bytes is cut at a character boundary and ends with `[value truncated]`.
- Typed failures, `fail` and `run` are covered in Effects and run and Typed failures.

## Traps

- A trap is a fatal runtime error. It does not unwind and runs no cleanup.
- The runtime writes `fatal trap: <reason>` to standard error, followed by the frame where it happened. The process then stops with an illegal-instruction signal (the shell shows status 132).
- Reasons include `arithmetic overflow`, `division by zero`, `index out of bounds` and `slice range out of bounds`.
- Arithmetic overflow traps for every integer width, including `u8`. Use the `checked*`, `wrapping*` or `saturating*` functions in `silk/num/i32` and the other integer modules to avoid it.
- Indexes that are known at compile time to be out of range are rejected before the program runs (SEM0034).

## Arguments and standard input

- Declare `? &mut HostInput` on `main` to read process arguments, environment variables and the working directory. `HostInput.argumentCount()` includes the program name at index 0.
- `HostInput.argument(index)` returns `Option<Bytes>` and needs an `Allocator`. Arguments are raw bytes and need not be UTF-8.
- Standard input is not provided automatically. Construct `OsStandardInput.make()` from `silk/io/standard_input_native` and provide it for the `StandardInput` requirement.
- Standard output is written through `StdoutWriter.make()` from `silk/io/writer_native` and the `Writer` service.

## Termination

- A program ends when `main` returns, when a failure escapes an effect `main`, or when a trap occurs.
- The startup code installs no scheduler or event loop. A `main` that needs to suspend must set up its own execution owner. See Fibers and scheduling.

## Examples

```silk
pub fn main() -> i32 {
  let answer = 6 * 7
  if answer != 42 {
    return 1
  }
  return 0
}
```

An uncaught failure:

```silk
import silk.format { Debug, Format, Formatter }
import silk.io.writer { Writer, WriterError }

pub struct NotFound { pub code: i32 }

impl Debug for NotFound {
  effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    return run Format.debugFields(self, "NotFound", &mut formatter)
  }
}

effect fn load(present: bool) -> i32 ! NotFound {
  if !present { fail NotFound { code: 4 } }
  return 1
}

pub effect fn main() -> i32 ! NotFound {
  let value = run load(false)
  return value
}
```

This exits with status 1 and writes to standard error (for a root module named `main`):

```
unhandled error: main.NotFound
  at main.load (main:13:17)
  at main.main (main:18:15)
unhandled value: NotFound { code: 4 }
```

Echo the first argument, then return the number of bytes read from standard input:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.system.host_input { HostInput, HostInputError }
import silk.option { Option }
import silk.io.standard_input_native { OsStandardInput }
import silk.io.writer_native { StdoutWriter }
import silk.io.standard_input { StandardInput, StreamReadError }
import silk.io.writer { Writer, WriterError }
import silk.num.usize

pub effect fn main() -> i32
! HostInputError | OutOfMemoryError | WriterError | StreamReadError
? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut stdout = StdoutWriter.make()
  let first = run HostInput.argument(1) |> Effect.provideMut<Allocator>(&mut allocator)
  if let Option.Some { value: bytes } = move first {
    run Writer.writeAll(Bytes.asSlice(&bytes)) |> Effect.provideMut<Writer>(&mut stdout)
    run Writer.writeAll(b"\n") |> Effect.provideMut<Writer>(&mut stdout)
  }
  let mut input = OsStandardInput.make()
  let mut buffer: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0]
  let mut total: usize = 0
  while true {
    let outcome = run StandardInput.receive(&mut buffer) |> Effect.provideMut<StandardInput>(&mut input)
    if StandardInput.isEndOfInput(&outcome) { break }
    total = total + StandardInput.count(&outcome)
  }
  return usize.toI32(total)
}
```

Running `printf 'hello there' | ./app world` prints `world` and exits with status 11.

A trap report, from indexing past the end of a three-element slice in a function `at`:

```
fatal trap: index out of bounds
  at main.at (main:2:10)
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0034 | Statically known index outside an array's length |
| SEM0225 | Entry point `main` that the selected runtime cannot start: missing, private, has parameters, unsupported result or requirement, or may park |

## See also

Control flow · Functions and methods · Structs, tuples and arrays · Values and primitive types · Effects and run · Typed failures · Services and providers · Fibers and scheduling · `silk/platform/native/start`, `silk/system/host_input`, `silk/io/standard_input`, `silk/io/standard_input_native`, `silk/io/writer_native`, `silk/io/writer`

## Open questions

- No std lib function that ends the process early with a chosen status was found.
