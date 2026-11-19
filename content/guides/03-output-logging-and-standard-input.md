# Output, logging and standard input

This guide builds `numberlines`, a filter that reads standard input and prints each line with its number. Numbered lines go to standard output. Warnings and a summary go to a logger that writes to standard error. All three streams are services, so the second half of the guide runs the same code in a test, with scripted input and captured output.

```sh
silk init numberlines
cd numberlines
```

## Three services

| Service | Module | Native provider | Operation | Failure |
| --- | --- | --- | --- | --- |
| `Writer` | `silk/io/writer` | `StdoutWriter`, `StderrWriter` in `silk/io/writer_native` | `writeAll(bytes)`, `flush()` | `WriterError` |
| `Logger` | `silk/io/logger` | `StderrLogger`, `StdoutLogger` in `silk/io/logger_native` | `log(level, template, args)` | `never` |
| `StandardInput` | `silk/io/standard_input` | `OsStandardInput` in `silk/io/standard_input_native` | `read(buffer)` | `StreamReadError` |

A `Writer` moves bytes. A `Logger` receives whole events, each with a level. Use a writer for the program's output and a logger for messages about the run. Functions that write or read declare `? &mut Writer` or `? &mut StandardInput`. Logging is ambient. A plain function can run a logging operation, and its callers keep their signatures. The program chooses a logger at the scope where it wants to collect events.

The native providers exist on hosted Linux, macOS and Windows, and on the WASI targets `wasm32-wasip1` and `wasm32-wasip2`. On `wasm32-unknown-unknown` and Linux without libc the `*_native` modules are empty, and you supply your own provider. Two more loggers serve WebAssembly hosts: `ConsoleLogger` for JavaScript hosts and `WasiLogger` for `wasi:logging`; see **Logging on WebAssembly** below.

## Writing output

`emit` writes one numbered line through a template with `Format.format`. The placeholder `{number:>4}` right-aligns the number in four columns:

```silk
// Writes one numbered line: the number right-aligned in four columns.
effect fn emit(number: u32, line: &[u8]) -> () ! WriterError ? &mut Writer {
  match String.fromUtf8(line) {
    Result.Success { value } => {
      run Format.format("{number:>4}  {text}\n", &.{ number: number, text: value })
    }
    Result.Failure { error } => {
      run Effect.logWarning("line {number} is not UTF-8 (byte {offset}); skipped", &.{
        number: number,
        offset: error.offset,
      })
    }
  }
}
```

`Format.format` writes to its `Writer` provider. For bytes with no template, use `Writer.writeString(text)` or `Writer.writeAll(bytes)`. The guide "Text and formatting" covers templates and options in full.

`StdoutWriter` and `StderrWriter` have no buffer of their own: each write goes straight to the descriptor, and `flush` does nothing. Each `StderrWriter` write holds the standard error lock, described below, for its duration. A failed write may already have written a prefix. **Buffering standard output** below shows how to put a buffer in front of them.

## Logging

`Effect.logWarning` from `silk/core/effect` sends one event at level `Warning` to the ambient `Logger`. There is one helper per level of `LogLevel`: `logTrace`, `logDebug`, `logInfo`, `logWarning` and `logError`. `Effect.log` is `logInfo`, and `Effect.logAt(level, ...)` takes the level as a value. The template rules are the same as for `Format.format`.

The default emits warnings and errors to standard error on native and WASI targets and to the console on web targets. Other levels are quiet. A program can install another provider to collect all levels. `silk/io/logger_native` has two:

| Provider | Writes to | Each message becomes |
| --- | --- | --- |
| `StderrLogger` | Standard error | The level name, `: `, the message and a newline, such as `warning: line 5 is not UTF-8` |
| `StdoutLogger` | Standard output | The message exactly as formatted. It ignores the level and adds no newline |

Neither adds a timestamp. `StderrLogger` adds the newline itself, so its templates must not end with one. It also holds the standard error lock for the whole line, so lines from different threads never mix. Use `StdoutLogger` only when the log messages are the program's output.

### Logging on WebAssembly

`StderrLogger` works on `wasm32-wasip1` and `wasm32-wasip2` as it does natively, since every WASI runtime has a standard error. Two other providers hand each event to the host with its level:

| Provider | Module | Target | Each message goes to |
| --- | --- | --- | --- |
| `ConsoleLogger` | `silk/io/logger_console` | `wasm32-unknown-unknown` | The host's console, through an import `silk.console` |
| `WasiLogger` | `silk/io/logger_wasi` | `wasm32-wasip2` | `wasi:logging/logging.log`, with the level and a context string |

Each exists only on its target; elsewhere its module declares nothing. Neither allocates, adds a level name, a timestamp or a newline, or can fail.

`ConsoleLogger.make()` takes no arguments. The default web logger and an explicitly installed `ConsoleLogger` both write through `silk.console`. The std lib's runner, `<silk>/lib/silk/stdlib/host/wasm-runner.mjs`, supplies the import and calls the console method of each level: `console.debug` for trace and debug, then `console.info`, `console.warn` and `console.error`. In a package `greeter` built with `--target wasm32-unknown-unknown`:

```silk
import silk.core.effect { Effect }
import silk.concurrency.sync { Arc }
import silk.io.logger { Logger }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.io.logger_console { ConsoleLogger }

pub effect fn main() -> () ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let logger = run Arc<ConsoleLogger>.make(ConsoleLogger.make()) |> Effect.provideMut<Allocator>(&mut allocator)
  let values = .{ name: "silk", count: 3 }
  run Effect.logInfo("{name} started {count} workers", &values)
    |> Effect.provideAmbient<Logger>(&logger)
  run Effect.logWarning("{name} is running low on memory", &values)
    |> Effect.provideAmbient<Logger>(&logger)
  return ()
}
```

```sh
silk build --target wasm32-unknown-unknown --quiet
node <silk>/lib/silk/stdlib/host/wasm-runner.mjs build/wasm32-unknown-unknown/dev/greeter.wasm
```

```
silk started 3 workers
silk is running low on memory
```

In Node, `console.info` writes to standard output and `console.warn` to standard error. From your own script, `runWasm(bytes, { onLog: (level, text) => ... })` receives each message instead, with `level` one of `trace`, `debug`, `info`, `warning` and `error`. A host that instantiates the module itself must supply `silk.console(level, address, length, more)`: `level` counts from 0 for trace to 4 for error, `address` and `length` name UTF-8 bytes in the module's memory, and `more` is 1 when the next call continues the same message. The logger formats into a 256-byte buffer, so a longer message arrives in parts that the host joins before it decodes them.

`WasiLogger.make(context)` takes the context, a `string<'static>`, that every record carries. It suits platforms that collect `wasi:logging` records, such as Spin or wasmCloud. `wasi:logging` is a draft interface, `wasi:logging/logging@0.1.0-draft`. The std lib's `command` world lists it, and a component imports it only when it provides `WasiLogger`. `wasmtime run` has no implementation, so `silk run` refuses such a component, here in a package `component`, with status 1:

```silk
import silk.core.effect { Effect }
import silk.concurrency.sync { Arc }
import silk.io.logger { Logger }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.io.logger_wasi { WasiLogger }

pub effect fn main() -> i32 ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let logger = run Arc<WasiLogger>.make(WasiLogger.make("startup")) |> Effect.provideMut<Allocator>(&mut allocator)
  let values = .{ count: 3 }
  run Effect.logInfo("started {count} workers", &values)
    |> Effect.provideAmbient<Logger>(&logger)
  return 0
}
```

```sh
silk run --target wasm32-wasip2 --quiet
```

```
Finished build/wasm32-wasip2/dev/component.wasm in 0.92s
Error: failed to run main module `/home/you/component/build/wasm32-wasip2/dev/component.wasm`

Caused by:
    0: component imports instance `wasi:logging/logging@0.1.0-draft`, but a matching implementation was not found in the linker
    1: instance export `log` has the wrong type
    2: function implementation is missing
```

`LogLevel.Warning` becomes `warn`, and `wasi:logging`'s `critical` level has no Silk level. The logger formats into a 512-byte buffer, so a longer message becomes several records, in order, each ending on a whole character. A component with its own `[component].world` imports `wasi:logging/logging@0.1.0-draft` there.

## Reading standard input

`StandardInput.receive(&mut buffer)` reads into a buffer you own and returns a `ReadOutcome`. Either it filled a prefix of the buffer, maybe shorter than the buffer, or it saw the end of input. End of input is a normal outcome, not a failure. Only a read the host could not complete is a `StreamReadError`.

```silk
// Reads standard input to the end and numbers every line.
effect fn numberLines() -> u32
! StreamReadError | WriterError | OutOfMemoryError
? &mut StandardInput | &mut Writer | &mut Allocator {
  let mut buffer: [u8; 64] = [0; 64]
  let mut line = Bytes.make()
  let mut number: u32 = 0
  let mut total: usize = 0
  while true {
    let outcome = run StandardInput.receive(&mut buffer)
    if StandardInput.isEndOfInput(&outcome) {
      break
    }
    let count = StandardInput.count(&outcome)
    total = total + count
    let mut index: usize = 0
    while index < count {
      if buffer[index] == '\n' {
        number = number + 1
        run emit(number, line.asSlice())
        line.clear()
      } else {
        let one: [u8; 1] = [buffer[index]]
        run line.append(&one)
      }
      index = index + 1
    }
  }
  if line.length() > 0 {
    number = number + 1
    run emit(number, line.asSlice())
  }
  run Effect.logInfo("{lines} lines, {bytes} bytes", &.{ lines: number, bytes: total })
  return number
}
```

A few rules make this loop correct:

- Read only the first `StandardInput.count(&outcome)` bytes. The rest of the buffer holds whatever was there before.
- Test `isEndOfInput` to stop. A count of zero alone does not mean the end.
- Pass a buffer that is not empty. An empty buffer always returns a count of zero and never reports the end.

The 64-byte buffer is deliberately small: a line may be split across reads, so the program collects the current line in a `Bytes` and handles it at each `\n`. A line can also be split in the middle of a UTF-8 sequence. Collecting whole lines before calling `String.fromUtf8` sidesteps that. To decode as you go, use `Utf8Decoder`, shown in "Text and formatting".

The signature lists three services. The loop reads from `StandardInput`, writes through `Writer`, and uses `Allocator` for `Bytes.append`. Its summary goes to the current ambient logger.

## Wiring it in main

```silk
pub effect fn main() -> i32 ! StreamReadError | WriterError | OutOfMemoryError {
  let mut input = OsStandardInput.make()
  let mut out = StdoutWriter.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  let logger = run Arc<StderrLogger>.make(StderrLogger.make()) |> Effect.provideMut<Allocator>(&mut allocator)
  drop run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideAmbient<Logger>(&logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}
```

The program keeps standard output clean for the numbered lines, so the logger is `StderrLogger`. `OsStandardInput.make()` reads nothing until the first `receive`. The imports for the program and its tests:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError, SystemAllocator }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.concurrency.sync { Arc }
import silk.io.logger { InMemoryLogger, Logger, LogLevel }
import silk.io.logger_native { StderrLogger }
import silk.io.standard_input_native { OsStandardInput }
import silk.io.writer_native { StdoutWriter }
import silk.core.result { Result }
import silk.io.standard_input { ReadOutcome, StandardInput, StreamReadError }
import silk.text.string { String }
import silk.testing.testing { AssertionError, Testing }
import silk.io.writer { Writer, WriterError }
```

## Run it

Make an input file with an empty line, an accented word, one invalid byte and no newline at the end:

```sh
silk build
printf 'first line\nsecond line\n\ncaf\xc3\xa9\nbad \xff here\nno newline at end' > input.txt
./build/x86_64-unknown-linux-gnu/dev/numberlines < input.txt
```

```
   1  first line
   2  second line
   3  
   4  café
warning: line 5 is not UTF-8 (byte 4); skipped
   6  no newline at end
info: 6 lines, 58 bytes
```

Line 5 has `\xff` at byte 4 and is skipped with a warning. The last line has no newline and is still counted. Send standard error away and only the numbered lines remain:

```sh
./build/x86_64-unknown-linux-gnu/dev/numberlines < input.txt 2>/dev/null
```

```
   1  first line
   2  second line
   3  
   4  café
   6  no newline at end
```

With empty input, the first read reports the end:

```sh
./build/x86_64-unknown-linux-gnu/dev/numberlines < /dev/null
```

```
info: 0 lines, 0 bytes
```

## Buffering standard output

`Format.format` writes each piece of a template separately: the padding, the number, the two spaces, the text and the newline. With an unbuffered `StdoutWriter`, each piece is one system call, 24 writes to standard output for this input. `BufferedWriter` from `silk/io/buffered_output` collects small writes in a buffer and sends them when it fills. It wraps any `Writer` provider and is itself a `Writer`, so `numberLines` does not change. Only `main` does:

```silk
pub effect fn main() -> i32
! StreamReadError | WriterError | BufferError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut input = OsStandardInput.make()
  let mut out = run BufferedWriter<StdoutWriter>.make(StdoutWriter.make(), 4096)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let logger = run Arc<StderrLogger>.make(StderrLogger.make()) |> Effect.provideMut<Allocator>(&mut allocator)
  drop run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideAmbient<Logger>(&logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  drop run BufferedWriter<StdoutWriter>.finish(move out)
  return 0
}
```

Add `import silk.io.buffered_output { BufferedWriter }` and `import silk.io.buffered_input { BufferError }`. `BufferedWriter.make(destination, capacity)` takes the provider by value and allocates the buffer, which is why it needs the allocator and can fail with `BufferError` (a capacity of zero or over 1 MiB). Under `strace -e trace=write`, the run on `input.txt` now makes one write to standard output, of 78 bytes.

`finish` sends what is left, flushes the destination and gives it back. `Writer.flush()` sends the pending bytes without ending the writer. Dropping a `BufferedWriter` does not flush it, so bytes that were never flushed are lost. Buffering also changes the order in which the two streams reach a terminal. The logger still writes at once, so with `2>&1` the warning and the summary now come first and the numbered lines after them:

```
warning: line 5 is not UTF-8 (byte 4); skipped
info: 6 lines, 58 bytes
   1  first line
   2  second line
   3  
   4  café
   6  no newline at end
```

For a stream protocol with deadlines, use `BufferedOutput` from the same module, which the Byte streams and buffering guide covers.

## A quick message on standard error

While debugging, you can print a value directly to standard error. `StderrWriter.print` from `silk/io/writer_native` formats a template and writes it to standard error. It is a plain function, so it needs no service and no `run`. Add one line to the read loop of `numberLines`, and import `StderrWriter`:

```silk
    total = total + count
    StderrWriter.print("read {} bytes\n", &(count, ))
```

```
read 58 bytes
   1  first line
   2  second line
   3  
   4  café
warning: line 5 is not UTF-8 (byte 4); skipped
   6  no newline at end
info: 6 lines, 58 bytes
```

The template is checked like any other. `print` adds no newline, formats into a 64-byte buffer on the stack, and ignores a failed write. Take it out again when you are done; for messages that stay, use the logger.

Both `print` and `StderrLogger` hold the process's standard error lock while they write, so a message from one thread never lands in the middle of another's. To write one line from several parts under the lock, take it yourself with `StderrWriter.lock`. It returns a `LockedStderr`, a `Writer` that collects the writes in a buffer you lend and sends them when the buffer fills, on `flush`, and when it drops:

```silk
// Writes one line from several parts while holding the standard error lock.
effect fn progress(done: u32, total: u32) -> () ! WriterError ? &mut Writer {
  run Writer.writeString("progress: ")
  run Format.format("{done}/{total}", &.{ done: done, total: total })
  run Writer.writeString("\n")
}

pub effect fn main() -> i32 ! WriterError {
  let mut buffer: [u8; 64] = [0; 64]
  let mut stderr = StderrWriter.lock(&mut buffer)
  run progress(3, 8) |> Effect.provideMut<Writer>(&mut stderr)
  run Writer.flush() |> Effect.provideMut<Writer>(&mut stderr)
  drop stderr
  return 0
}
```

This prints `progress: 3/8` on standard error. Other threads that write to standard error wait while you hold the lock, so drop it soon. The drop ignores a failed write; call `flush` first to see the failure. Bytes still in the buffer are lost if the program traps before the drop.

## Swapping providers in a test

`numberLines` never names a provider, so a test can hand it fakes. You need three.

**Input.** `ScriptedInput` returns a fixed text a few bytes per read, which exercises lines split across reads:

```silk
// Standard input that hands out a fixed text a few bytes at a time.
struct ScriptedInput { text: &'static [u8], position: usize, step: usize }

impl StandardInput for ScriptedInput {
  effect fn read(self: &mut Self, buffer: &mut [u8]) -> ReadOutcome ! StreamReadError {
    if buffer.length == 0 {
      return StandardInput.filled(0)
    }
    if self.position == self.text.length {
      return StandardInput.endOfInput()
    }
    let mut count: usize = 0
    while count < buffer.length && count < self.step && self.position < self.text.length {
      buffer[count] = self.text[self.position]
      self.position = self.position + 1
      count = count + 1
    }
    return StandardInput.filled(count)
  }
}
```

`StandardInput.filled(n)` and `StandardInput.endOfInput()` build the two outcomes. A provider follows the same rules as the native one: an empty buffer gets `filled(0)`, and after the end, every read reports the end again.

**Output.** `CapturingWriter` appends every write to a `Bytes`. `writeAll` may only fail with `WriterError` and has no allocator in its row, so the writer carries its own `SystemAllocator` and maps `OutOfMemoryError` to `Writer.failure()`. A `Writer` also has `writeVectored`, which writes several slices as one. Its default body calls `writeAll` for each slice, so a provider with no faster way leaves it out:

```silk
// A Writer that keeps everything written to it.
struct CapturingWriter { out: Bytes, allocator: SystemAllocator }

effect fn appendBytes(out: &mut Bytes, bytes: &[u8]) -> () ! OutOfMemoryError ? &mut Allocator {
  run out.append(bytes)
}

effect fn writerFull(error: OutOfMemoryError) -> () ! WriterError {
  fail Writer.failure()
}

impl Writer for CapturingWriter {
  effect fn writeAll(self: &mut Self, bytes: &[u8]) -> () ! WriterError ? &mut Writer {
    let appending = Effect.catchAll(appendBytes(&mut self.out, bytes), writerFull)
    run move appending |> Effect.provideMut<Allocator>(&mut self.allocator)
  }
  effect fn flush(self: &mut Self) -> () ! WriterError ? &mut Writer {
    return ()
  }
}
```

**Logs.** `Logger.inMemoryProvider()` from `silk/io/logger` keeps the events. `Logger.length` counts them, `Logger.levelAt` gives an event's level, and `messageLengthAt` and `messageByteAt` read its text. It holds at most eight events and 64 message bytes in total. The provider discards a whole event when it exceeds either limit. `Logger.attempts` counts every call. `Logger.inMemoryProviderFailAt(n)` drops the event at zero-based attempt `n`, so tests can check that the program continues.

Now the tests. `sameBytes` is a small loop that compares two byte slices:

```silk
fn sameBytes(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length { return false }
  let mut i: usize = 0
  while i < left.length {
    if left[i] != right[i] { return false }
    i = i + 1
  }
  return true
}

test effect fn numbersEveryLine()
! AssertionError<'static> | StreamReadError | WriterError | OutOfMemoryError {
  let mut input = ScriptedInput { text: b"one\ntwo\nthree", position: 0, step: 3 }
  let mut out = CapturingWriter { out: Bytes.make(), allocator: Allocator.systemAllocatorProvider() }
  let mut allocator = Allocator.systemAllocatorProvider()
  let provider = run Logger.inMemoryProvider() |> Effect.provideMut<Allocator>(&mut allocator)
  let logger = run Arc<InMemoryLogger>.make(move provider) |> Effect.provideMut<Allocator>(&mut allocator)
  let lines = run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideAmbient<Logger>(&logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(lines == 3, "three lines")
  run Testing.expect(sameBytes(out.out.asSlice(), b"   1  one\n   2  two\n   3  three\n"), "numbered output")
  run Testing.expect(Logger.length(logger.get()) == 1, "one summary event")
  run Testing.expect(Logger.levelAt(logger.get(), 0) == LogLevel.Info, "the summary is info")
}

test effect fn warnsAboutInvalidUtf8()
! AssertionError<'static> | StreamReadError | WriterError | OutOfMemoryError {
  let mut input = ScriptedInput { text: b"ok\n\xFF\n", position: 0, step: 64 }
  let mut out = CapturingWriter { out: Bytes.make(), allocator: Allocator.systemAllocatorProvider() }
  let mut allocator = Allocator.systemAllocatorProvider()
  let provider = run Logger.inMemoryProvider() |> Effect.provideMut<Allocator>(&mut allocator)
  let logger = run Arc<InMemoryLogger>.make(move provider) |> Effect.provideMut<Allocator>(&mut allocator)
  drop run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideAmbient<Logger>(&logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(sameBytes(out.out.asSlice(), b"   1  ok\n"), "only the valid line is printed")
  run Testing.expect(Logger.length(logger.get()) == 2, "a warning and a summary")
  run Testing.expect(Logger.levelAt(logger.get(), 0) == LogLevel.Warning, "the first event is a warning")
}
```

`provideMut` lends the input and writer for the run. The test retains its own `Arc` to inspect the captured log messages afterward. Run the test:

```sh
silk test
```

```
  main::numbersEveryLine
    PASS  41 us
  main::warnsAboutInvalidUtf8
    PASS  28 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   1 ms
```

When an expectation fails, the runner prints its message under the test's name, and below it the place of the failed call. Expect four lines instead of three, `lines == 4`, and the run exits with status 1:

```
  main::numbersEveryLine
    assertion failed: three lines
      at main.numbersEveryLine (main:144:3)
    FAIL  82 us
  main::warnsAboutInvalidUtf8
    CACHED

Tests  1 passed, 1 failed (1 cached, 1 executed, 2 selected, 2 discovered)
Time   1 ms
```

The message is the text you passed to `expect`, unchanged, which is why it still says three. `main:144:3` is the line and column of that `Testing.expect` call in `src/main.silk`. Put the 3 back.

The guide "Testing with providers" goes further with fakes, and chapter 8 of the book introduces services and providers.

## API reference

- `silk/io/writer`: `Writer`, `WriterError`
- `silk/io/writer_native`: `StdoutWriter`, `StderrWriter` (`print`, `lock`), `LockedStderr`
- `silk/io/buffered_output`: `BufferedWriter`; `silk/io/buffered_input`: `BufferError`
- `silk/io/logger`: `Logger`, `LogLevel`, `InMemoryLogger`, `WarningsToStderr`
- `silk/io/logger_native`: `StderrLogger`, `StdoutLogger`
- `silk/io/logger_console`: `ConsoleLogger` (`wasm32-unknown-unknown` only)
- `silk/io/logger_wasi`: `WasiLogger` (`wasm32-wasip2` only)
- `silk/io/standard_input`: `StandardInput`, `ReadOutcome`, `StreamReadError`
- `silk/io/standard_input_native`: `OsStandardInput`
- `silk/core/effect`: `Effect` (`log`, `logInfo`, `logWarning`, `provideAmbient`, `provideMut`, `catchAll`)
- `silk/text/format`: `Format`
- `silk/testing/testing`: `Testing`, `AssertionError`
- `silk/collections/bytes`: `Bytes`
