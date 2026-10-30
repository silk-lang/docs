# Debugging

When a Silk program stops on a bug, it says where. A trap names the function it happened in and the functions that called it, an unhandled error names its type, its call path and its value, and a WebAssembly host shows the same report. When that is not enough, `silk debug` starts the program under LLDB, which shows the source line and the values of parameters and `let` bindings. This page walks through each, on native targets, on WASI and in a JavaScript host.

The examples use this package, `scores`, whose `best` asks for one score past the end:

```silk
fn pick(scores: &[i32], index: usize) -> i32 {
  return scores[index]
}

fn best(scores: &[i32]) -> i32 {
  return pick(scores, scores.length)
}

pub fn main() -> i32 {
  let scores = [70, 85, 92]
  return best(&scores)
}
```

## Trap reports

```sh
silk run --quiet
```

```
Finished build/llvm/x86_64-unknown-linux-gnu/debug/scores in 0.01s
fatal trap: index out of bounds
  at main.pick (main:2:10)
  at main.best
  at main.main
```

The first line is the reason. The next names the function where the trap happened and its site, `module:line:column`: line 2, column 10 of the `main` module, the index expression. The lines below it are the functions that called it, innermost first, by name only. The process then stops with an illegal-instruction signal, so `silk run` exits with status 132.

The calling functions come from an unoptimized build, such as the default `debug` profile. An optimized build names only the trapping function:

```sh
silk run --release --quiet
```

```
Finished build/llvm/x86_64-unknown-linux-gnu/release/scores in 0.94s
fatal trap: index out of bounds
  at main.pick (main:2:10)
```

A stack overflow has no site to report. The process's fault handler prints `fatal trap: stack overflow` with no `at` lines, and the status is 139.

### Traps after a resume

A function that suspends, such as one that waits on another fiber, leaves the machine stack when it parks and comes back on a different stack when it resumes. The report still names the functions that were waiting on it. Here `work` runs in a forked fiber, and `pick` yields once before it reads past the end:

```silk
import silk.mem.allocator { OutOfMemoryError }
import silk.core.effect { Effect }
import silk.concurrency.fiber { Cancelled, Fiber }
import silk.concurrency.local_scheduler { LocalScheduler, StalledError }
import silk.system.monotonic_clock { MonotonicClock }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.concurrency.scheduler { Scheduler, TaskIdExhaustedError }

fn at(values: &[i32], index: usize) -> i32 {
  return values[index]
}

effect fn pick(values: &[i32], index: usize) -> i32 {
  run Fiber.yieldNow()
  return at(values, index)
}

effect fn work(index: usize) -> i32 {
  let values = [1, 2, 3]
  return run pick(&values, index)
}

effect fn root() -> i32
! OutOfMemoryError | TaskIdExhaustedError | Cancelled
? &mut Scheduler | &mut MonotonicClock {
  let child = run Fiber<i32, never>.forkChild(work(5))
  return run child.join()
}

pub effect fn main() -> i32
! OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError {
  let mut clock = OsMonotonicClock.make()
  let mut scheduler = LocalScheduler.make()
  return run scheduler.execute<i32, OutOfMemoryError | TaskIdExhaustedError | Cancelled>(root())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
}
```

```
fatal trap: index out of bounds
  at main.at (main:10:10)
  at main.pick
  at main.work
  at main.main
```

`pick` and `work` are the suspended callers of the resumed frame. On a native target the chain then continues on the machine stack that resumed the fiber, which here leads back to `main`. A WebAssembly program, which has no unwinder, names the suspended callers and stops there.

## Unhandled errors

A typed failure that escapes an effect `main` is not a trap. The program exits with status 1 and reports the failure's type, where it was raised, the calls that led there, and its `Debug` form:

```silk
import silk.io.writer { Writer, WriterError }
import silk.text.format { Debug, Format, Formatter }

pub struct ConfigError { pub code: i32 }

impl Debug for ConfigError {
  effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    return run Format.debugFields(self, "ConfigError", &mut formatter)
  }
}

effect fn load(code: i32) -> i32 ! ConfigError {
  if code > 0 {
    fail ConfigError { code: code }
  }
  return code
}

effect fn configure(code: i32) -> i32 ! ConfigError {
  return run load(code)
}

pub effect fn main() -> () ! ConfigError {
  let code = run configure(7)
}
```

```
unhandled error: main.ConfigError
  at main.load (main:14:5)
  at main.configure (main:20:10)
  at main.main (main:24:14)
unhandled value: ConfigError { code: 7 }
```

Every frame has its site, in a `--release` build too. The error type of `main` must implement `Debug` on every target, WebAssembly included. **Program entry and termination** in the reference has the full format, including the `while handling:` section.

## Failing tests

`silk test` prints the same reports under the test's name. A trap stops the runner process, so the test is marked `FAIL  stopped the test process` and the runner starts again for the rest. Add a test to `scores`:

```silk
test fn bestOfThree() -> () {
  let scores = [70, 85, 92]
  let value = best(&scores)
}
```

```sh
silk test
```

```
  main::bestOfThree
    fatal trap: index out of bounds
      at main.pick (main:2:10)
      at main.best
      at main.bestOfThree
    FAIL  stopped the test process

Tests  0 passed, 1 failed (0 cached, 1 executed, 1 selected, 1 discovered)
Time   525 us
```

On a WASI target the callers also get their lines, read from Wasmtime's trace, as `file:line:column` of the source file:

```sh
silk test --target wasm32-wasip1
```

```
  main::bestOfThree
    fatal trap: index out of bounds
      at main.pick (main:2:10)
      at main.best (main.silk:6:10)
      at main.bestOfThree (main.silk:16:15)
    FAIL  stopped the test process

Tests  0 passed, 1 failed (0 cached, 1 executed, 1 selected, 1 discovered)
Time   724 us
```

**Testing** covers the rest of the runner's output.

## WebAssembly on WASI

On `wasm32-wasip1` and `wasm32-wasip2`, the program writes the same report before it stops, and the unhandled error above prints exactly as on a native target. A trap is followed by Wasmtime's own trace, since `silk run` runs the module with `wasmtime run`:

```sh
silk run --target wasm32-wasip1 --quiet
```

```
Finished build/llvm/wasm32-wasip1/debug/scores in 0.56s
fatal trap: index out of bounds
  at main.pick (main:2:10)
Error: failed to run main module `/home/you/scores/build/llvm/wasm32-wasip1/debug/scores`

Caused by:
    0: failed to invoke command default
    1: error while executing at wasm backtrace:
    0:  0x1b858 - main.pick
                    at /home/you/scores/main.silk:2:10
    1:  0x1b76f - main.best
                    at /home/you/scores/main.silk:6:10
    2:   0xb5a5 - main.main
                    at /home/you/scores/main.silk:11:10
    3:   0xb41c - silk/platform/wasi/start.invokeApplication
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:107:17
    4:  0x20283 - silk/platform/wasi/start.invoke
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:116:12
    5:  0x20223 - silk/platform/wasi/start.observedApplication
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:124:16
    6:  0x200f9 - silk/platform/wasi/start.observedApplication
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:121:12
    7:  0x1cbdd - silk/concurrency/execution.Execution.make
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/concurrency/execution.silk:268:14
    8:  0x173cb - silk/concurrency/execution.Execution.drive
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/concurrency/execution.silk:337:5
    9:  0x1582d - silk/platform/wasi/start.start
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:153:5
   10:  0x1c2ca - silk/core/effect.Effect.catchAll
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/core/effect.silk:503:12
                - silk/platform/wasi/start.startup
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:167:12
   11:    0xaa6 - silk/platform/wasi/start.enter
                    at /home/you/.silk/toolchains/0.1.0-dev.36+f7208b4cfac6/lib/silk/stdlib/silk/platform/wasi/start.silk:176:16
   12:    0x803 - scores!silk/platform/wasi/start.enter
    2: wasm trap: wasm `unreachable` instruction executed
```

The status is 134. Two things make this trace readable:

- A wasm executable built with debug information names its functions as the source does, `main.pick` or `silk/platform/wasi/start.invoke`, in the module's name section. Any engine that prints a trace uses those names.
- `silk run` and `silk test` set `WASMTIME_BACKTRACE_DETAILS=1` for Wasmtime, which adds each frame's `file:line:column` from the module's DWARF. A value already in your environment is kept, so `WASMTIME_BACKTRACE_DETAILS=0` turns the lines off. When you run a built module with `wasmtime run` yourself, set it yourself.

The Silk report above the trace names only the trapping function, because the module cannot walk its own stack. The trace has the callers. After a fiber resumes, the report also names the suspended callers, as in **Traps after a resume**:

```
fatal trap: index out of bounds
  at main.at (main:10:10)
  at main.pick
  at main.work
Error: failed to run main module `/home/you/fibers/build/llvm/wasm32-wasip1/debug/fibers`
```

A build without debug information, such as `--release`, has neither names nor lines, so its trace shows hashed symbols:

```
Finished build/llvm/wasm32-wasip1/release/scores in 1.15s
fatal trap: index out of bounds
  at main.pick (main:2:10)
Error: failed to run main module `/home/you/scores/build/llvm/wasm32-wasip1/release/scores`

Caused by:
    0: failed to invoke command default
    1: error while executing at wasm backtrace:
    0:   0x552b - scores!silk_e623a62ba6790a7fd4d6fcbf5ddb8e88
    1:   0x50be - scores!silk_9ac656f0f6aeced1a91c2370f6c8e607
    2:    0xa28 - scores!silk_6871c33ce0bdf5a2a2de5d379fee34c7
    3:    0x2b6 - scores!_start
    2: wasm trap: wasm `unreachable` instruction executed
```

The `.symbols` file beside the module maps each `silk_...` name back to its declaration; see **Build outputs and native linking**. Deep recursion on WASI ends with Wasmtime's `wasm trap: call stack exhausted` and its trace, without a Silk report.

## WebAssembly in a JavaScript host

A `wasm32-unknown-unknown` module has no standard error. It writes its report into a buffer in its own memory and exports it as `silk_report` (a function that returns the address) and `silk_report_length`, next to `memory` and `main`. The std lib's runner, `<silk>/lib/silk/stdlib/host/wasm-runner.mjs`, reads it. Give `scores` a profile for the target:

```toml
[profiles.web]
target = "wasm32-unknown-unknown"
```

```sh
silk build --profile web --quiet
node <silk>/lib/silk/stdlib/host/wasm-runner.mjs build/llvm/wasm32-unknown-unknown/web/scores
```

```
fatal trap: index out of bounds
  at main.pick (main:2:10)
RuntimeError: unreachable
    at scores.main.pick (wasm://wasm/scores-0004f292:wasm-function[72]:0xa9df)
    at scores.main.best (wasm://wasm/scores-0004f292:wasm-function[71]:0xa8f6)
    at scores.main.main (wasm://wasm/scores-0004f292:wasm-function[112]:0xe059)
    at scores.silk/platform/wasm/start.invokeApplication (wasm://wasm/scores-0004f292:wasm-function[105]:0xd992)
    at scores.silk/platform/wasm/start.invoke (wasm://wasm/scores-0004f292:wasm-function[104]:0xd937)
    at scores.silk/platform/wasm/start.observedApplication (wasm://wasm/scores-0004f292:wasm-function[107]:0xdb13)
    at scores.silk/platform/wasm/start.observedApplication (wasm://wasm/scores-0004f292:wasm-function[73]:0xac8e)
    at scores.silk/concurrency/execution.Execution.make (wasm://wasm/scores-0004f292:wasm-function[24]:0x33ca)
    at scores.silk/concurrency/execution.Execution.drive (wasm://wasm/scores-0004f292:wasm-function[74]:0xb1b6)
    at scores.silk/platform/wasm/start.start (wasm://wasm/scores-0004f292:wasm-function[19]:0x1a3a)
```

The runner prints the Silk report, then the engine's stack, whose frames carry the names from the name section, and exits with status 134. An unhandled error prints its report and the runner exits with `main`'s status, 1:

```
unhandled error: main.ConfigError
  at main.load (main:14:5)
  at main.configure (main:20:10)
  at main.main (main:24:14)
unhandled value: ConfigError { code: 7 }
```

From your own script, `runWasm(bytes, options)` runs the module and resolves to `main`'s status. A trap rejects with a `SilkError`, whose `message` is the report's first line, whose `report` is the whole report, and whose `stack` is the report followed by the engine's stack; its `cause` is the engine's `WebAssembly.RuntimeError`. A trap that left no report rejects with the engine's error itself. The report of a `main` that fails goes to `options.onReport`, by default `console.error`. With a copy of the runner beside the script:

```js
import { readFile } from 'node:fs/promises'
import { runWasm, SilkError } from './wasm-runner.mjs'

const bytes = await readFile('build/llvm/wasm32-unknown-unknown/web/scores')
try {
  console.log('status', await runWasm(bytes))
} catch (error) {
  if (!(error instanceof SilkError)) throw error
  console.log('message:', error.message)
  console.log('report:')
  console.log(error.report)
}
```

```sh
node host.mjs
```

```
message: fatal trap: index out of bounds
report:
fatal trap: index out of bounds
  at main.pick (main:2:10)
```

A host that instantiates the module itself reads the same buffer: after `main` returns or traps, decode `silk_report_length()` bytes of `memory` starting at `silk_report()`.

### Source maps and the .debug.wasm file

A debug build of a `wasm32-unknown-unknown` executable keeps its DWARF out of the module it ships, so the file you serve stays small. Two files appear beside it:

```sh
ls build/llvm/wasm32-unknown-unknown/web/
```

```
scores
scores.debug.wasm
scores.inputs
scores.map
scores.symbols
scores.units
```

- `scores.debug.wasm` is the same module with its DWARF. The shipped module names it in an `external_debug_info` custom section, which Chrome's DWARF support follows.
- `scores.map` is a source map derived from the line table, with each source file's text included. The shipped module names it in a `sourceMappingURL` section, which Firefox and Safari read.

Both names are relative, so serve the two files next to the module. A build without debug information, such as `release`, writes neither, and its module has no name section.

## Line tables

An unoptimized debug executable, native or wasm, carries line tables, so debuggers, symbolizers and the backtraces above show `file:line:column` for its Silk frames. The single-file `silk build <source> -o <output> --emit llvm-ir --debug true --optimization none` prints the same information as `!dbg` metadata and `#dbg_declare` records in the LLVM text.

## silk debug

`silk debug` builds the package like `silk run` and starts it under a debugger instead of running it. It takes the options of `silk run` except `--coredump`, plus `--port`, and passes the program's arguments the same way. Use a profile with debug information, such as the default `debug`: a `--release` build has none.

### Native programs

On a native target, `silk debug` becomes LLDB on the built executable, `lldb -- <program> [arguments...]`. It uses `SILK_LLDB` when set, else `lldb` on `PATH`. Without either it builds the program and then stops with status 2:

```
silk: `debug` needs lldb on PATH or SILK_LLDB
```

This package, `shapes`, overflows:

```silk
struct Rect { width: i32, height: i32 }

fn area(rect: &Rect) -> i32 {
  let scaled = rect.width * 1000000
  return scaled * rect.height
}

pub fn main() -> i32 {
  let rect = Rect { width: 3000, height: 4 }
  return area(&rect)
}
```

```sh
silk debug --quiet
```

```
Finished build/llvm/x86_64-unknown-linux-gnu/debug/shapes in 0.01s
(lldb) target create "/home/you/shapes/build/llvm/x86_64-unknown-linux-gnu/debug/shapes"
Current executable set to '/home/you/shapes/build/llvm/x86_64-unknown-linux-gnu/debug/shapes' (x86_64).
(lldb) run
Process 3293 launched: '/home/you/shapes/build/llvm/x86_64-unknown-linux-gnu/debug/shapes' (x86_64)
fatal trap: arithmetic overflow
  at main.area (main:4:16)
  at main.main
Process 3293 stopped
* thread #1, name = 'shapes', stop reason = signal SIGILL: illegal operand
    frame #0: 0x000000000022e355 shapes`main.area(rect=0x00007fffffff903c) at main.silk:4:16
   1    struct Rect { width: i32, height: i32 }
   2
   3    fn area(rect: &Rect) -> i32 {
-> 4      let scaled = rect.width * 1000000
                       ^
   5      return scaled * rect.height
   6    }
   7
(lldb) frame variable
(main.Rect *) rect = 0x00007fffffff903c
(int) scaled = 32767
(lldb) frame variable *rect
(main.Rect) *rect = (0 = 3000, 1 = 4)
(lldb) up
frame #1: 0x000000000022e2d6 shapes`main.main at main.silk:10:10
   7
   8    pub fn main() -> i32 {
   9      let rect = Rect { width: 3000, height: 4 }
-> 10     return area(&rect)
                 ^
   11   }
(lldb) frame variable
(main.Rect) rect = (0 = 3000, 1 = 4)
(lldb) kill
Process 3293 exited with status = 9 (0x00000009) killed
(lldb) quit
```

The trap stops the process with `SIGILL` at the trapping expression, and every Silk frame has its source line. Breakpoints by file and line work too, such as `breakpoint set --file main.silk --line 5`.

### Variables

A debug build describes each parameter and `let` binding to the debugger, by name and type, so `frame variable` shows them. In the session above:

- `scaled` has not been assigned yet when the trap fires, so it shows whatever its slot held.
- A struct's fields are named by position for now, `0` and `1`, in declaration order: `width` is `0` and `height` is `1`.
- Integers, floats, `bool`, `char`, references, pointers, strings, slices, arrays and structs are described. A reference shows as a pointer, which `frame variable *rect` follows. A slice shows its `pointer` and `length`, and a union shows its tag.
- The variables of a function that suspends, an `effect fn` that runs `Fiber.yieldNow()` for example, live in its saved frame and are not described to the debugger yet.

### WASI programs

On a WASI target, `silk debug` runs the module under Wasmtime's debugger stub, which waits for LLDB on port 1234 before the program starts. `--port <[address:]port>` picks another port or address. In one terminal:

```sh
silk debug --target wasm32-wasip1 --quiet
```

```
Finished build/llvm/wasm32-wasip1/debug/scores in 0.01s
Debugger: Debugger listening on 127.0.0.1:1234
Debugger: In LLDB, attach with: process connect --plugin wasm connect://127.0.0.1:1234
```

In another, start `lldb` and connect:

```
(lldb) process connect --plugin wasm connect://127.0.0.1:1234
Process 1 stopped
* thread #1, stop reason = signal SIGTRAP
    frame #0: 0x00000000
error: memory read failed for 0x0
(lldb) continue
Process 1 resuming
Process 1 stopped
* thread #1, stop reason = signal SIGSEGV
    frame #0: 0x400000000001b858 wasm-0`main.pick(scores=&[i32] @ 0x000ff1b4, index=3) at main.silk:2:10
   1    fn pick(scores: &[i32], index: usize) -> i32 {
-> 2      return scores[index]
                 ^
   3    }
   4
   5    fn best(scores: &[i32]) -> i32 {
   6      return pick(scores, scores.length)
   7    }
(lldb) frame variable
(&[i32]) scores = {
  pointer = 0x000ff210
  length = 3
}
(unsigned int) index = 3
(lldb) up
frame #1: 0x400000000001b775 wasm-0`main.best(scores=&[i32] @ 0x000ff1e4) at main.silk:6:10
   3    }
   4
   5    fn best(scores: &[i32]) -> i32 {
-> 6      return pick(scores, scores.length)
              ^
   7    }
   8
   9    pub fn main() -> i32 {
(lldb) frame variable
(&[i32]) scores = {
  pointer = 0x000ff210
  length = 3
}
(lldb) kill
Process 1 exited with status = 6 (0x00000006) failed to send k packet
(lldb) quit
```

LLDB attaches before the program starts, where it has no frame to show yet, and `continue` runs the program to the trap. The first terminal then prints the Silk report and Wasmtime's trace, as `silk run` does. The session above used LLDB 22, whose `wasm` process plugin talks to Wasmtime.

## Core dumps of WASI programs

`silk run --coredump <path>` has Wasmtime write a core dump to `path` when a WASI program traps. The program's output and the trace are the same as without it:

```sh
silk run --target wasm32-wasip1 --quiet --coredump scores.core
```

The dump is itself a WebAssembly file in the tool conventions' core dump format: the instance's memory and globals, and the stack of the trap in custom sections, for tools that read wasm core dumps. Wasmtime separates its options with commas, so the path cannot hold one:

```
silk: the `--coredump` path cannot contain a comma
```

A native program dumps core as the operating system is configured to, so the option is refused there, before the build:

```
silk: `--coredump` needs a WASI target; a native program dumps core as the system configures
```

Both refusals exit with status 2.

## Logging on WebAssembly

A message from a running program often explains a bug before a debugger does. `StderrLogger` works on the WASI targets as on native ones. A `wasm32-unknown-unknown` module logs to the host's console with `ConsoleLogger`, and a `wasm32-wasip2` component on a platform with `wasi:logging` uses `WasiLogger`. The **Output, logging and standard input** guide shows both.
