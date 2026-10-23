# Output, logging and standard input

This guide builds `numberlines`, a filter that reads standard input and prints each line with its number. Numbered lines go to standard output. Warnings and a summary go to a logger that writes to standard error. All three streams are services, so the second half of the guide runs the same code in a test, with scripted input and captured output.

```sh
silk init numberlines
cd numberlines
```

## Three services

| Service | Module | Native provider | Operation | Failure |
| --- | --- | --- | --- | --- |
| `Writer` | `silk/writer` | `StdoutWriter`, `StderrWriter` in `silk/os_writer` | `writeAll(bytes)`, `flush()` | `WriterError` |
| `Logger` | `silk/logger` | `StderrLogger`, `StdoutLogger` in `silk/os_logger` | `log(level, template, args)` | `LogError` |
| `StandardInput` | `silk/standard_input` | `OsStandardInput` in `silk/os_standard_input` | `read(buffer)` | `StreamReadError` |

A `Writer` moves bytes. A `Logger` receives whole events, each with a level. Use a writer for the program's output and a logger for messages about the run. Code that needs one says so with `? &mut Writer`, `? &mut Logger` or `? &mut StandardInput`, and never names a provider. `main` picks the real ones.

The native providers exist only on Linux and macOS with libc. On WebAssembly and the no-libc targets the `os_*` modules are empty, and you supply your own provider.

## Writing output

`emit` writes one numbered line through a template with `Format.format`. The placeholder `{number:>4}` right-aligns the number in four columns:

```silk
// Writes one numbered line: the number right-aligned in four columns.
effect fn emit(number: u32, line: &[u8]) -> () ! WriterError | LogError ? &mut Writer | &mut Logger {
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

`Format.format` writes to the ambient `Writer`. For bytes with no template, use `Writer.writeString(text)` or `Writer.writeAll(bytes)`. The guide "Text and formatting" covers templates and options in full.

`StdoutWriter` and `StderrWriter` have no buffer of their own: each write goes straight to the descriptor, and `flush` does nothing. Each `StderrWriter` write holds the standard error lock, described below, for its duration. A failed write may already have written a prefix.

## Logging

`Effect.logWarning` from `silk/effect` sends one event at level `Warning` to the ambient `Logger`. There is one helper per level of `LogLevel`: `logTrace`, `logDebug`, `logInfo`, `logWarning` and `logError`. `Effect.log` is `logInfo`, and `Effect.logAt(level, ...)` takes the level as a value. The template rules are the same as for `Format.format`.

What a message looks like is the provider's choice. `silk/os_logger` has two:

| Provider | Writes to | Each message becomes |
| --- | --- | --- |
| `StderrLogger` | Standard error | The level name, `: `, the message and a newline, such as `warning: line 5 is not UTF-8` |
| `StdoutLogger` | Standard output | The message exactly as formatted. It ignores the level and adds no newline |

Neither adds a timestamp. `StderrLogger` adds the newline itself, so its templates must not end with one. It also holds the standard error lock for the whole line, so lines from different threads never mix. Use `StdoutLogger` only when the log messages are the program's output.

## Reading standard input

`StandardInput.receive(&mut buffer)` reads into a buffer you own and returns a `ReadOutcome`. Either it filled a prefix of the buffer, maybe shorter than the buffer, or it saw the end of input. End of input is a normal outcome, not a failure. Only a read the host could not complete is a `StreamReadError`.

```silk
// Reads standard input to the end and numbers every line.
effect fn numberLines() -> u32
! StreamReadError | WriterError | LogError | OutOfMemoryError
? &mut StandardInput | &mut Writer | &mut Logger | &mut Allocator {
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

The signature lists four services. Reading, writing and logging are three of them, and `Bytes.append` needs the allocator.

## Wiring it in main

```silk
pub effect fn main() -> i32 ! StreamReadError | WriterError | LogError | OutOfMemoryError {
  let mut input = OsStandardInput.make()
  let mut out = StdoutWriter.make()
  let mut logger = StderrLogger.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  drop run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}
```

The program keeps standard output clean for the numbered lines, so the logger is `StderrLogger`. Making the providers does no I/O. `OsStandardInput.make()` reads nothing until the first `receive`. The imports for the program and its tests:

```silk
import silk.allocator { Allocator, OutOfMemoryError, SystemAllocator }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.format { Format }
import silk.logger { Logger, LogError, LogLevel }
import silk.os_logger { StderrLogger }
import silk.os_standard_input { OsStandardInput }
import silk.os_writer { StdoutWriter }
import silk.result { Result }
import silk.standard_input { ReadOutcome, StandardInput, StreamReadError }
import silk.string { String }
import silk.testing { AssertionError, Testing }
import silk.writer { Writer, WriterError }
```

## Run it

Make an input file with an empty line, an accented word, one invalid byte and no newline at the end:

```sh
silk build
printf 'first line\nsecond line\n\ncaf\xc3\xa9\nbad \xff here\nno newline at end' > input.txt
./build/llvm/x86_64-unknown-linux-gnu/debug/numberlines < input.txt
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
./build/llvm/x86_64-unknown-linux-gnu/debug/numberlines < input.txt 2>/dev/null
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
./build/llvm/x86_64-unknown-linux-gnu/debug/numberlines < /dev/null
```

```
info: 0 lines, 0 bytes
```

## A quick message on standard error

While you look for a bug, you often want to see one value without threading a logger through the code. `StderrWriter.print` from `silk/os_writer` formats a template and writes it to standard error. It is a plain function, so it needs no service and no `run`. Add one line to the read loop of `numberLines`, and import `StderrWriter`:

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
struct ScriptedInput { text: &'static [u8] position: usize step: usize }

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

**Output.** `CapturingWriter` appends every write to a `Bytes`. `writeAll` may only fail with `WriterError` and has no allocator in its row, so the writer carries its own `SystemAllocator` and maps `OutOfMemoryError` to `Writer.failure()`. A `Writer` also implements `writeVectored`, which writes several slices as one; a provider with no faster way to do that hands it to `Writer.writeEach`, which calls `writeAll` for each slice:

```silk
// A Writer that keeps everything written to it.
struct CapturingWriter { out: Bytes allocator: SystemAllocator }

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
  effect fn writeVectored(self: &mut Self, vals: &[&[u8]]) -> () ! WriterError ? &mut Writer {
    return run Writer.writeEach(&mut self, vals)
  }
  effect fn flush(self: &mut Self) -> () ! WriterError ? &mut Writer {
    return ()
  }
}
```

**Logs.** `Logger.inMemoryProvider()` from `silk/logger` keeps the events. `Logger.length` counts them, `Logger.levelAt` gives an event's level, and `messageLengthAt` and `messageByteAt` read its text. It holds at most eight events and 64 message bytes in total. A log past either limit fails with `LogError` and is not kept. `Logger.inMemoryProviderFailAt(n)` makes the n-th call fail, for testing how your code handles a broken logger.

Now the tests. `sameBytes` is a small loop that compares two byte slices:

```silk
test effect fn numbersEveryLine()
! AssertionError<'static> | StreamReadError | WriterError | LogError | OutOfMemoryError {
  let mut input = ScriptedInput { text: b"one\ntwo\nthree", position: 0, step: 3 }
  let mut out = CapturingWriter { out: Bytes.make(), allocator: Allocator.systemAllocatorProvider() }
  let mut logger = Logger.inMemoryProvider()
  let mut allocator = Allocator.systemAllocatorProvider()
  let lines = run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(lines == 3, "three lines")
  run Testing.expect(sameBytes(out.out.asSlice(), b"   1  one\n   2  two\n   3  three\n"), "numbered output")
  run Testing.expect(Logger.length(&logger) == 1, "one summary event")
  run Testing.expect(Logger.levelAt(&logger, 0) == LogLevel.Info, "the summary is info")
}

test effect fn warnsAboutInvalidUtf8()
! AssertionError<'static> | StreamReadError | WriterError | LogError | OutOfMemoryError {
  let mut input = ScriptedInput { text: b"ok\n\xFF\n", position: 0, step: 64 }
  let mut out = CapturingWriter { out: Bytes.make(), allocator: Allocator.systemAllocatorProvider() }
  let mut logger = Logger.inMemoryProvider()
  let mut allocator = Allocator.systemAllocatorProvider()
  drop run numberLines()
    |> Effect.provideMut<StandardInput>(&mut input)
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(sameBytes(out.out.asSlice(), b"   1  ok\n"), "only the valid line is printed")
  run Testing.expect(Logger.length(&logger) == 2, "a warning and a summary")
  run Testing.expect(Logger.levelAt(&logger, 0) == LogLevel.Warning, "the first event is a warning")
}
```

`provideMut` lends each provider for one `run` and gives it back, so after the run the test can look inside `out` and `logger`. Run the test:

```sh
silk test
```

```
  main::numbersEveryLine
    PASS  40 us
  main::warnsAboutInvalidUtf8
    PASS  19 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   146 us
```

When an expectation fails, the runner prints its message under the test's name. Expect four lines instead of three, `lines == 4`, and the run exits with status 1:

```
  main::numbersEveryLine
    assertion failed: three lines
    FAIL  64 us
  main::warnsAboutInvalidUtf8
    PASS  15 us

Tests  1 passed, 1 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   139 us
```

The message is the text you passed to `expect`, unchanged, which is why it still says three. Put the 3 back.

The guide "Testing with providers" goes further with fakes, and chapter 8 of the book introduces services and providers.

## API reference

- `silk/writer`: `Writer`, `WriterError`
- `silk/os_writer`: `StdoutWriter`, `StderrWriter` (`print`, `lock`), `LockedStderr`
- `silk/logger`: `Logger`, `LogLevel`, `LogError`, `InMemoryLogger`
- `silk/os_logger`: `StderrLogger`, `StdoutLogger`
- `silk/standard_input`: `StandardInput`, `ReadOutcome`, `StreamReadError`
- `silk/os_standard_input`: `OsStandardInput`
- `silk/effect`: `Effect` (`log`, `logInfo`, `logWarning`, `provideMut`, `catchAll`)
- `silk/format`: `Format`
- `silk/testing`: `Testing`, `AssertionError`
- `silk/bytes`: `Bytes`
