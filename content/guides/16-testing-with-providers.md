# Testing with providers

Code that names its services in a `?` row does not care who provides them. In `main` you hand it the real file system, the real network and the real clock. In a test you hand it fakes: providers you control, that keep a record of what happened, and that can fail on cue. This guide builds `beacon`, a small program that reads a report file, tags it with a random id, sends it to a TCP peer and logs how long that took. Then it tests every part of that without a disk, a socket, real randomness or real time.

The **Testing** page in the Tools section explains `test` functions, `Testing.expect` and the `silk test` command. Chapter 8 of the book introduces fake providers. This guide goes further: it fakes six services at once and checks the failures as carefully as the successes.

## The code under test

The package has three files:

```
beacon/
  silk.toml
  src/main.silk          the program
  src/tests.silk         the tests
  src/tests/Fakes.silk   the fake providers
```

`src/main.silk` starts with its imports and three small helpers:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ByteDuplex, ByteIoError }
import silk.effect { Effect }
import silk.filesystem { FileError, FileSystem, Path }
import silk.logger { LogError, Logger }
import silk.monotonic_clock { MonotonicClock }
import silk.native_socket { ConnectOptions, NativeSocketError, connectResolvedOwned }
import silk.network_address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.option { Option }
import silk.os_filesystem { OsFileSystem }
import silk.os_logger { StdoutLogger }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.os_random { OsRandom }
import silk.random { Random }
import silk.slice { Slice }
import silk.string { String }
import silk.system_clock { Instant, SystemClock }
import silk.u8

// Only for `silk test`: the tests module imports this one back.
import tests

fn hex<'a>(bytes: &[u8], out: &'a mut [u8]) -> string<'a> {
  let digits = b"0123456789abcdef"
  let mut index: usize = 0
  while index < bytes.length {
    out[index * 2] = digits[u8.toUsize(bytes[index] / 16)]
    out[index * 2 + 1] = digits[u8.toUsize(bytes[index] % 16)]
    index = index + 1
  }
  return unsafe String.fromUtf8Unchecked(Slice.view(&out, 0, bytes.length * 2))
}

fn copyInstant(value: &Instant) -> Instant {
  return SystemClock.make(SystemClock.seconds(value), SystemClock.nanoseconds(value))
}

fn millisBetween(start: &Instant, end: &Instant) -> i64 {
  let seconds = SystemClock.seconds(end) - SystemClock.seconds(start)
  let nanoseconds = SystemClock.nanoseconds(end) - SystemClock.nanoseconds(start)
  return seconds * 1000 + nanoseconds / 1000000
}

effect fn writeAll(bytes: &[u8], deadline: &Instant) -> ()
! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock {
  let mut offset: usize = 0
  while offset < bytes.length {
    let rest = Slice.view(bytes, offset, bytes.length - offset)
    offset = offset + run ByteDuplex.writeSome(rest, Option<Instant>.some(copyInstant(deadline)))
  }
}
```

`import tests` is there only for `silk test`. A program's tests are found by following imports from the root module, so the root has to import the module that holds them. `tests` imports `main` back; that cycle is allowed.

`hex` writes bytes as lowercase hex into a buffer you pass in. `copyInstant` exists because `Instant` is not `Copy`, and each `ByteDuplex` call takes its own deadline. `writeAll` keeps calling `ByteDuplex.writeSome` until every byte is accepted, since a byte stream may take only part of what you give it.

Now the function the tests are about:

```silk
// Sends one report file to the peer: a header line with a random id, then the file.
pub effect fn sendReport(path: &Path) -> usize
! FileError | OutOfMemoryError | ByteIoError | LogError
? &mut FileSystem | &mut Allocator | &mut ByteDuplex | &mut MonotonicClock | &mut Random | &mut Logger {
  let body = run FileSystem.readFile(path)
  let mut idBytes: [u8; 4] = [0; 4]
  run Random.fillBytes(&mut idBytes)
  let mut idText: [u8; 8] = [0; 8]
  let id = hex(&idBytes, &mut idText)

  let start = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&start, 2000000000)
  run writeAll(b"REPORT ", &deadline)
  run writeAll(String.utf8Bytes(id), &deadline)
  run writeAll(b"\n", &deadline)
  run writeAll(body.asSlice(), &deadline)
  run ByteDuplex.shutdownWrite(Option<Instant>.some(copyInstant(&deadline)))
  let end = run MonotonicClock.now()

  let sent = body.length()
  let ms = millisBetween(&start, &end)
  run Effect.log("sent {sent} bytes as {id} in {ms} ms\n", &.{ sent: sent, id: id, ms: ms })
  return sent
}
```

`sendReport` needs six services, and its `?` row says so: a `FileSystem` to read the report, an `Allocator` for the copy it reads into, a `ByteDuplex` to send on, a `MonotonicClock` for the deadline and the timing, a `Random` for the id, and a `Logger` for the result. It never mentions a path on disk, a socket or the operating system. Its `!` row lists the four ways it can fail. Each test below provides all six services and checks one outcome.

`main` provides the real ones:

```silk
pub effect fn main() -> () ! FileError | OutOfMemoryError | ByteIoError | LogError | NativeSocketError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut files = run OsFileSystem.make("/tmp") |> Effect.provideMut<Allocator>(&mut allocator)
  let mut clock = OsMonotonicClock.make()
  let mut random = OsRandom.make()
  let mut logger = StdoutLogger.make()
  let path = run Path.make("/report.txt") |> Effect.provideMut<Allocator>(&mut allocator)

  let address = IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }
  let endpoints = [Endpoint.make(address, Port.fromU16(7070))]
  let now = run MonotonicClock.now() |> Effect.provideMut<MonotonicClock>(&mut clock)
  let deadline = MonotonicClock.deadlineAfter(&now, 2000000000)
  let options = ConnectOptions.defaults()
  let mut connection = run connectResolvedOwned(&endpoints, options, Option<Instant>.some(move deadline))
    |> Effect.provideMut<MonotonicClock>(&mut clock)

  drop run sendReport(&path)
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<ByteDuplex>(&mut connection)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Logger>(&mut logger)
  run connection.close()
}
```

`OsFileSystem.make("/tmp")` roots the file system at `/tmp`, so the `Path` `/report.txt` is the file `/tmp/report.txt`. `connectResolvedOwned` connects to 127.0.0.1 port 7070 and returns a `Connection`, which is a `ByteDuplex` provider. The Networking guide explains connections and deadlines.

## Run it for real

Create the report, and start a listener in a second terminal:

```sh
printf 'disk 81%%\nload 0.42\n' > /tmp/report.txt
nc -l 127.0.0.1 7070
```

Then run `beacon`:

```sh
silk run
```

```
sent 19 bytes as b9a44880 in 0 ms
```

`nc` prints what arrived:

```
REPORT b9a44880
disk 81%
load 0.42
```

The id changes on every run, and the time depends on your machine. With no listener, `connectResolvedOwned` fails and `main` ends with `unhandled error: silk/native_socket.NativeSocketError`. None of that is something a test should depend on.

## The fakes

The fakes live in `src/tests/Fakes.silk`, so every test module can share them. A fake is an ordinary provider: a struct and an `impl` of the service. Two helpers come first:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.filesystem { AtomicWriteError, DirectoryEntry, DirectoryInfo, Durability }
import silk.filesystem { FileError, FileInfo, FileSystem, Path, PublicationPolicy }
import silk.layout { Layout }
import silk.list { List }
import silk.logger { InMemoryLogger, Logger }
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.random { Random }
import silk.system_clock { Instant, SystemClock }

pub fn sameBytes(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length { return false }
  let mut index: usize = 0
  while index < left.length {
    if left[index] != right[index] { return false }
    index = index + 1
  }
  return true
}

// Whether event `index` of an in-memory logger is exactly `expected`.
pub fn logged(logger: &InMemoryLogger, index: usize, expected: &[u8]) -> bool {
  if index >= Logger.length(logger) { return false }
  if Logger.messageLengthAt(logger, index) != expected.length { return false }
  let mut at: usize = 0
  while at < expected.length {
    if Logger.messageByteAt(logger, index, at) != expected[at] { return false }
    at = at + 1
  }
  return true
}
```

`sameBytes` compares two byte slices. `logged` checks one event of an `InMemoryLogger`, the test logger from `silk/logger`. `Logger.length`, `Logger.messageLengthAt` and `Logger.messageByteAt` read back what it holds.

### A scripted Random

```silk
// Random: hands out next, next + 1, next + 2, ...
pub struct ScriptedRandom { pub next: u8 }

impl Random for ScriptedRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    let mut index: usize = 0
    while index < output.length {
      output[index] = self.next
      self.next = self.next + 1
      index = index + 1
    }
  }
}
```

`Random` has one operation, `fillBytes`. This fake fills the buffer with counting bytes from `next`, so a test knows the id in advance: starting at 160 (`0xa0`) the id is `a0a1a2a3`. The helpers `Random.nextU64`, `Random.below` and `Random.nextBool` all go through `fillBytes`, so they work with this provider too. Use a fake like this only in tests. Code that needs a real secret must get its bytes from `OsRandom` or another real source.

If you want random-looking but repeatable numbers that are not secrets, such as shuffled test data, `silk/insecure_random` has a seeded generator, `InsecureRandom.seeded(seed)`. It provides the separate `InsecureRandom` service, not `Random`.

### A virtual clock

```silk
// MonotonicClock: time stands still until someone waits, then jumps.
pub struct VirtualClock { pub mark: Instant }

impl VirtualClock {
  pub fn atZero() -> VirtualClock {
    return VirtualClock { mark: SystemClock.make(0, 0) }
  }
  pub fn millis(self: &Self) -> i64 {
    return SystemClock.seconds(&self.mark) * 1000 + SystemClock.nanoseconds(&self.mark) / 1000000
  }
}

impl MonotonicClock for VirtualClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(SystemClock.seconds(&self.mark), SystemClock.nanoseconds(&self.mark))
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return 1
  }
  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    let later = SystemClock.seconds(&when) > SystemClock.seconds(&self.mark)
      || (SystemClock.seconds(&when) == SystemClock.seconds(&self.mark)
        && SystemClock.nanoseconds(&when) > SystemClock.nanoseconds(&self.mark))
    if later { self.mark = move when }
  }
  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    self.mark = MonotonicClock.deadlineAfter(&self.mark, howLong)
  }
}
```

`MonotonicClock` has four operations. `VirtualClock` reads a stored mark, and time moves only when someone waits: `waitUntil` jumps forward to the requested mark and `waitFor` adds to it. A test that waits five seconds therefore finishes in microseconds. `millis` lets a test read the clock afterwards.

Build instants with `SystemClock.make(seconds, nanoseconds)` and `MonotonicClock.deadlineAfter(&start, nanoseconds)`. `SystemClock.make` carries whole seconds out of the nanosecond part, so "5000 ms after zero" can be `SystemClock.make(0, 5000000000)`, which is 5 seconds and 0 nanoseconds. A negative part borrows: `SystemClock.make(0, -1)` is -1 seconds and 999,999,999 nanoseconds. Only a total beyond the `i64` range of seconds traps.

### A counting allocator

```silk
// Allocator: counts requests and refuses the one numbered `failAt` (counting from 1).
pub struct CountingAllocator {
  pub calls: usize,
  pub failAt: usize,
}

impl CountingAllocator {
  pub fn unlimited() -> CountingAllocator {
    return CountingAllocator { calls: 0, failAt: 0 }
  }
  pub fn failingAt(call: usize) -> CountingAllocator {
    return CountingAllocator { calls: 0, failAt: call }
  }
}

impl Allocator for CountingAllocator {
  effect fn allocate(self: &mut Self, layout: Layout) -> Intrinsic.Allocation ! OutOfMemoryError {
    self.calls = self.calls + 1
    if self.calls == self.failAt { fail OutOfMemoryError {} }
    let mut system = Allocator.systemAllocatorProvider()
    return run Allocator.allocate(move layout) |> Effect.provideMut<Allocator>(&mut system)
  }
}
```

`Allocator` has one operation, `allocate`. `CountingAllocator` counts each request and passes it on to the system allocator, except the request numbered `failAt`, which it refuses with `OutOfMemoryError`. `failAt` of 0 never matches, so `unlimited()` never refuses. A provider may create and provide another provider, as `allocate` does here.

### An in-memory file system

```silk
// FileSystem: one file at one path. Everything else is unsupported.
pub struct MemoryFiles {
  pub path: Bytes,
  pub contents: Bytes,
}

impl MemoryFiles {
  pub effect fn holding(path: &[u8], contents: &[u8]) -> MemoryFiles
  ! OutOfMemoryError ? &mut Allocator {
    return MemoryFiles { path: run Bytes.copy(path), contents: run Bytes.copy(contents) }
  }
}

effect fn unsupported() -> never ! FileError {
  fail FileSystem.error(FileSystem.pathOperation(), FileSystem.unsupported())
}

impl FileSystem for MemoryFiles {
  effect fn readFile(self: &mut Self, path: &Path) -> Bytes
  ! FileError | OutOfMemoryError ? &mut Allocator {
    if !sameBytes(path.rawBytes(), self.path.asSlice()) {
      fail FileSystem.error(FileSystem.readFileOperation(), FileSystem.notFound())
    }
    return run Bytes.copy(self.contents.asSlice())
  }
  effect fn stat(self: &mut Self, path: &Path) -> FileInfo | DirectoryInfo ! FileError {
    if !sameBytes(path.rawBytes(), self.path.asSlice()) {
      fail FileSystem.error(FileSystem.statOperation(), FileSystem.notFound())
    }
    return FileSystem.fileInfo(self.contents.length())
  }
  // The rest of the service: this fake does not support it.
  effect fn writeFile(self: &mut Self, path: &Path, bytes: &[u8]) -> () ! FileError {
    run unsupported()
  }
  effect fn createFile(self: &mut Self, path: &Path, bytes: &[u8]) -> () ! FileError {
    run unsupported()
  }
  effect fn writeFileAtomic(
    self: &mut Self,
    path: &Path,
    bytes: &[u8],
    policy: PublicationPolicy,
    durability: Durability,
  ) -> () ! AtomicWriteError {
    let cause = FileSystem.error(FileSystem.writeFileAtomicOperation(), FileSystem.unsupported())
    fail AtomicWriteError {
      published: false,
      cause: move cause,
      cleanupError: Option<FileError>.None,
      stagingName: Bytes.make(),
    }
  }
  effect fn syncDirectory(self: &mut Self, path: &Path) -> () ! FileError {
    run unsupported()
  }
  effect fn listDirectory(self: &mut Self, path: &Path) -> List<DirectoryEntry>
  ! FileError | OutOfMemoryError ? &mut Allocator {
    return run unsupported()
  }
  effect fn createDirectory(self: &mut Self, path: &Path) -> () ! FileError {
    run unsupported()
  }
  effect fn removeFile(self: &mut Self, path: &Path) -> () ! FileError {
    run unsupported()
  }
  effect fn removeDirectory(self: &mut Self, path: &Path) -> () ! FileError {
    run unsupported()
  }
  effect fn createTemporaryDirectory(self: &mut Self, parent: &Path, prefix: &[u8]) -> Path
  ! FileError | OutOfMemoryError ? &mut Allocator {
    return run unsupported()
  }
}
```

`FileSystem` has eleven operations, and an `impl` must provide all of them. This fake holds one file at one path. `readFile` and `stat` work; for any other path they fail with the reason `FileSystem.notFound()`, as a real file system would. The other nine operations fail as unsupported, which is enough for code that only reads. When the code you test also writes, store the bytes in the struct, as `MemoryFiles` does in chapter 8 of the book.

`readFile` is the only operation whose row includes `Allocator`, so it can copy with `Bytes.copy`. The copy comes from whichever allocator the caller provided; in the tests below that is the counting allocator.

## Fakes from the standard library

You do not have to write every fake yourself:

| Provider | Module | Service | Use in tests |
| --- | --- | --- | --- |
| `Logger.inMemoryProvider()` | `silk/logger` | `Logger` | Keeps up to 8 events and 64 message bytes; read them with `Logger.length`, `levelAt`, `messageLengthAt`, `messageByteAt` |
| `Logger.inMemoryProviderFailAt(n)` | `silk/logger` | `Logger` | Same, but call number `n` (from 0) fails with `LogError`; `Logger.attempts` counts calls |
| `MemoryByteDuplex.make(...)` | `silk/memory_byte_duplex` | `ByteDuplex` | Scripted reads and writes on the `MonotonicClock` timeline; `outbound()`, `audit()`, `phase()`, `closeAttempts()` show what happened |
| `InsecureRandom.seeded(seed)` | `silk/insecure_random` | `InsecureRandom` | A fixed pseudorandom sequence, for code that does not need secrets |
| `MemoryTrustSource.make(snapshot)` | `silk/memory_trust_source` | `TrustSource` | A trust store you fill yourself, for TLS code |

The in-memory logger fails with `LogError` once it is full, so keep each test's logging small.

## A test world

`sendReport` needs six providers in every test. `src/tests.silk` gathers them in one struct and builds a fresh one per test:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ByteDuplex, ByteIoError, ByteIoOperation }
import silk.effect { Effect }
import silk.filesystem { FileError, FileSystem, Path }
import silk.list { List }
import silk.logger { InMemoryLogger, LogError, Logger }
import silk.memory_byte_duplex { MemoryByteDuplex, MemoryReadEvent, MemoryWriteAction, MemoryWriteEvent }
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.random { Random }
import silk.result { Result }
import silk.system_clock { SystemClock }
import silk.testing { AssertionError, Testing }
import main { sendReport }
import tests.Fakes { CountingAllocator, MemoryFiles, ScriptedRandom, VirtualClock, logged, sameBytes }

// Everything sendReport talks to, as fakes.
struct World {
  path: Path,
  files: MemoryFiles,
  peer: MemoryByteDuplex,
  clock: VirtualClock,
  random: ScriptedRandom,
  logger: InMemoryLogger,
  allocator: CountingAllocator,
}

// A peer that takes at most 5 bytes per write and is first ready `delayMs` after time zero.
effect fn slowPeer(delayMs: u64) -> MemoryByteDuplex ! OutOfMemoryError ? &mut Allocator {
  let mut writes = List<MemoryWriteEvent>.make()
  let mut index = 0
  while index < 16 {
    let event = MemoryWriteEvent {
      readyAt: MonotonicClock.deadlineAfter(&SystemClock.make(0, 0), delayMs * 1000000),
      action: MemoryWriteAction.Accept { count: 5 },
    }
    drop run writes.append(move event)
    index = index + 1
  }
  let reads = List<MemoryReadEvent>.make()
  return run MemoryByteDuplex.make(move reads, move writes, 256, 32, Option<i32>.none())
}

effect fn makeWorld(stored: &[u8], delayMs: u64) -> World ! FileError | OutOfMemoryError {
  let mut system = Allocator.systemAllocatorProvider()
  return World {
    path: run Path.make("/report.txt") |> Effect.provideMut<Allocator>(&mut system),
    files: run MemoryFiles.holding(stored, b"disk 81%\nload 0.42\n")
      |> Effect.provideMut<Allocator>(&mut system),
    peer: run slowPeer(delayMs) |> Effect.provideMut<Allocator>(&mut system),
    clock: VirtualClock.atZero(),
    random: ScriptedRandom { next: 160 },
    logger: Logger.inMemoryProvider(),
    allocator: CountingAllocator.unlimited(),
  }
}

effect fn send(world: &mut World) -> usize ! FileError | OutOfMemoryError | ByteIoError | LogError {
  return run sendReport(&world.path)
    |> Effect.provideMut<FileSystem>(&mut world.files)
    |> Effect.provideMut<Allocator>(&mut world.allocator)
    |> Effect.provideMut<ByteDuplex>(&mut world.peer)
    |> Effect.provideMut<MonotonicClock>(&mut world.clock)
    |> Effect.provideMut<Random>(&mut world.random)
    |> Effect.provideMut<Logger>(&mut world.logger)
}
```

`slowPeer` scripts the far end of the connection with `MemoryByteDuplex`. `MemoryByteDuplex.make` takes the read events, the write events, the room for outgoing bytes, the room for its audit log, and an optional error code for `close`. All storage is allocated here, so the provider allocates nothing while the test runs. Each `writeSome` call uses up one write event. `MemoryWriteAction.Accept { count: 5 }` takes at most 5 bytes, so `writeAll` has to loop, just as with a real socket. `MemoryWriteAction.Failure { code }` would make the write fail instead.

Each event has a `readyAt` time on the `MonotonicClock`. When a write arrives before that time, the provider waits on the clock. With `VirtualClock` that wait is a jump: the peer is ready 250 ms after zero, so the first write moves the clock to 250 ms, and the later writes find it ready. If the deadline comes first, the clock jumps to the deadline and the write fails with `ByteIoError.Timeout`. When the two times are equal, the deadline wins.

`makeWorld` builds the path, the files and the peer with its own system allocator, so that setup is not counted. The world's `CountingAllocator` starts at zero and sees only what `sendReport` asks for.

`send` provides every field of the world to `sendReport`. `Effect.provideMut` lends each provider for the duration of the `run` and gives it back afterwards, so the test can look inside `world.peer`, `world.logger` and the rest when `send` returns. Lending different fields of one struct at the same time is allowed, because they do not overlap.

## Testing the success path

```silk
test effect fn sendsHeaderThenBody()
! AssertionError<'static> | FileError | OutOfMemoryError | ByteIoError | LogError {
  let mut world = run makeWorld(b"/report.txt", 250)
  let sent = run send(&mut world)
  run Testing.expect(sent == 19, "the whole file was sent")
  let wire = b"REPORT a0a1a2a3\ndisk 81%\nload 0.42\n"
  run Testing.expect(sameBytes(world.peer.outbound(), wire), "header, then body")
  let line = b"sent 19 bytes as a0a1a2a3 in 250 ms\n"
  run Testing.expect(logged(&world.logger, 0, line), "log line uses virtual time")
  run Testing.expect(world.allocator.calls == 1, "one allocation")
}
```

Each check reads a different fake:

- `world.peer.outbound()` is every byte the peer accepted, in order. The test compares the exact bytes on the wire, header included. The id is `a0a1a2a3` because of `ScriptedRandom`.
- The log line says 250 ms, because that is how far `VirtualClock` jumped. With the real clock the number would differ from run to run.
- The counting allocator saw exactly one request: the copy in `readFile`. The id and its hex text are fixed-size arrays on the stack, the logger has fixed storage, and the peer allocated its storage in `makeWorld`. If a change to `sendReport` starts allocating per write, this check catches it.

## Testing the failures

A failing effect stops at the first `fail`, so to look at a failure you turn it into a value with `Effect.result`. It returns a `Result` whose `Failure` holds the error. The error is a union of the four failure types in `send`'s row, so the test matches the type it expects and treats everything else, including success, as wrong:

```silk
test effect fn missingFileSendsNothing() ! AssertionError<'static> | FileError | OutOfMemoryError {
  let mut world = run makeWorld(b"/other.txt", 250)
  let outcome = run Effect.result(send(&mut world))
  let notFound = match move outcome {
    Result.Success { value } => false
    Result.Failure { error } => match move error {
      FileError problem =>
        FileSystem.reasonCode(move problem.reason) == FileSystem.reasonCode(FileSystem.notFound())
      _ => false
    }
  }
  run Testing.expect(notFound, "fails with NotFound")
  run Testing.expect(world.peer.outbound().length == 0, "nothing reached the peer")
  run Testing.expect(world.random.next == 160, "no id was drawn")
}
```

The file is stored at `/other.txt`, so `readFile` fails with `NotFound`. `FileSystem.reasonCode` turns the reason into a number you can compare. The other two checks say that nothing happened after the failure: no bytes reached the peer, and `world.random.next` is still 160, so no id was drawn.

A slow peer:

```silk
test effect fn slowPeerTimesOut() ! AssertionError<'static> | FileError | OutOfMemoryError {
  let mut world = run makeWorld(b"/report.txt", 5000)
  let outcome = run Effect.result(send(&mut world))
  let timedOut = match move outcome {
    Result.Success { value } => false
    Result.Failure { error } => match move error {
      ByteIoError.Timeout { operation } => operation == ByteIoOperation.Write
      _ => false
    }
  }
  run Testing.expect(timedOut, "the first write times out")
  run Testing.expect(world.clock.millis() == 2000, "the clock jumped to the deadline")
  run Testing.expect(Logger.length(&world.logger) == 0, "nothing was logged")
}
```

This peer is not ready until 5000 ms, but `sendReport` gives up after 2000 ms. A union member that is itself a union can be matched by variant: `ByteIoError.Timeout { operation }` checks both the error and which operation timed out. The clock stops exactly at the deadline, and nothing was logged. The test takes microseconds, not two seconds.

Running out of memory:

```silk
test effect fn outOfMemoryIsReported() ! AssertionError<'static> | FileError | OutOfMemoryError {
  let mut world = run makeWorld(b"/report.txt", 250)
  world.allocator = CountingAllocator.failingAt(1)
  let outcome = run Effect.result(send(&mut world))
  let refused = match move outcome {
    Result.Success { value } => false
    Result.Failure { error } => match move error {
      OutOfMemoryError problem => true
      _ => false
    }
  }
  run Testing.expect(refused, "fails with OutOfMemoryError")
  run Testing.expect(world.peer.outbound().length == 0, "nothing reached the peer")
}
```

The world's fields can be replaced before the run. `CountingAllocator.failingAt(1)` refuses the first request, the copy in `readFile`, so `sendReport` fails with `OutOfMemoryError` before it sends anything.

A failing logger:

```silk
test effect fn logFailureComesAfterSending() ! AssertionError<'static> | FileError | OutOfMemoryError {
  let mut world = run makeWorld(b"/report.txt", 250)
  world.logger = Logger.inMemoryProviderFailAt(0)
  let outcome = run Effect.result(send(&mut world))
  let logFailed = match move outcome {
    Result.Success { value } => false
    Result.Failure { error } => match move error {
      LogError problem => true
      _ => false
    }
  }
  run Testing.expect(logFailed, "fails with LogError")
  run Testing.expect(world.peer.outbound().length == 35, "the report was already sent")
}
```

`Logger.inMemoryProviderFailAt(0)` fails the first log call. The test shows an ordering fact about `sendReport`: by the time logging fails, all 35 bytes have reached the peer. The caller gets a `LogError` even though the report was delivered. Whether that is what you want is a design question; the test makes the behavior visible and pins it down.

## Run the tests

```sh
silk test
```

```
  tests::logFailureComesAfterSending
    PASS  55 us
  tests::missingFileSendsNothing
    PASS  25 us
  tests::outOfMemoryIsReported
    PASS  32 us
  tests::sendsHeaderThenBody
    PASS  40 us
  tests::slowPeerTimesOut
    PASS  28 us

Tests  5 passed, 0 failed (0 cached, 5 executed, 5 selected, 5 discovered)
Time   308 us
```

The times vary from run to run; the results do not.

## When a check fails

Suppose you expect the log line to say `in 0 ms`, as it did when you ran the program for real. Change line 75 of `src/tests.silk` to that and run again:

```
  tests::logFailureComesAfterSending
    PASS  56 us
  tests::missingFileSendsNothing
    PASS  24 us
  tests::outOfMemoryIsReported
    PASS  26 us
  tests::sendsHeaderThenBody
    assertion failed: log line uses virtual time
    FAIL  73 us
  tests::slowPeerTimesOut
    PASS  33 us

Tests  4 passed, 1 failed (0 cached, 5 executed, 5 selected, 5 discovered)
Time   359 us
```

The command exits with status 1. The line under the test's name is the message of the failing `expect`, and it is the whole report. A message that says what was expected, like `log line uses virtual time`, tells you what broke before you open the file.

Forgetting to provide a fake is caught before anything runs. Remove the `Random` line from `send`, and `silk check` stops:

```
src/tests.silk:59:10: error[SEM0071] This `run` needs `&mut Random`, which the enclosing function does not provide; add `? &mut Random` to its signature, or provide it with `|> Effect.provideMut(&mut value)`
```

Provide every service inside the test or in a helper it calls, as `send` does. The test runner provides no services, so a test whose own header has a `?` row is refused by `silk check` with SEM0218; see the **Testing** page.

## Choosing what to fake

- Fake every service whose answers vary: time, randomness, the network, the file system. Those are what make tests slow or flaky.
- Give each fake a way to fail on cue, like `failAt` here and in `Logger.inMemoryProviderFailAt`. Most bugs are in the failure paths.
- Check what did not happen as well as what did: no bytes sent, no id drawn, nothing logged.
- Keep fakes in their own module, such as `tests/Fakes.silk`, so tests in several modules can share them.
- A fake for `Writer` works the same way: a struct with a buffer, and an `impl Writer` whose `writeAll` copies the bytes into it, whose `flush` does nothing, and no `writeVectored`, since its default body calls `writeAll` for each slice.

## API reference

- `silk/testing`: `Testing.expect`, `AssertionError`
- `silk/effect`: `Effect.provideMut`, `Effect.result`
- `silk/result`: `Result`
- `silk/logger`: `Logger`, `InMemoryLogger`, `Logger.inMemoryProvider`, `Logger.inMemoryProviderFailAt`, `LogError`
- `silk/memory_byte_duplex`: `MemoryByteDuplex`, `MemoryWriteEvent`, `MemoryWriteAction`, `MemoryReadEvent`
- `silk/byte_duplex`: `ByteDuplex`, `ByteIoError`, `ByteIoOperation`
- `silk/monotonic_clock`: `MonotonicClock`; `silk/system_clock`: `SystemClock`, `Instant`
- `silk/random`: `Random`; `silk/insecure_random`: `InsecureRandom`
- `silk/allocator`: `Allocator`, `OutOfMemoryError`; `silk/layout`: `Layout`
- `silk/filesystem`: `FileSystem`, `Path`, `FileError`
- `silk/memory_trust_source`: `MemoryTrustSource`
