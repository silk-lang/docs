# Byte streams and buffering

Every byte-oriented connection in the standard library, whether a TCP socket, a TLS session or an in-memory stand-in, is used through one interface: `ByteDuplex`, from `silk/io/byte_duplex`. Protocol code written against it runs over any of them. This guide covers that interface, the deadlines every operation takes, the buffered layer that most protocol code wants on top (`silk/io/buffered_duplex`, `silk/io/buffered_input`, `silk/io/buffered_output`), copying from one stream to another (`silk/io/buffered_transfer`), and testing it all without a network (`silk/io/memory_byte_duplex`).

The program is `numbered`, a small line server. It reads lines from a TCP client and answers each one with its number. It can also run as a relay that passes a connection on to another server, which is the copying example.

```
numbered serve <port>
numbered relay <port> <target-port>
```

## The ByteDuplex model

`ByteDuplex` is a service with five operations. Reads and writes are partial: each moves some bytes and says how many.

| Operation | Does |
| --- | --- |
| `ByteDuplex.readSome(buffer, deadline)` | Waits for input, copies at least one byte into `buffer`, and returns `ReadTransfer.Data { count }`. Returns `ReadTransfer.End` once the peer has finished sending. |
| `ByteDuplex.writeSome(bytes, deadline)` | Hands a prefix of `bytes` to the transport and returns its length, at least 1. |
| `ByteDuplex.flush(deadline)` | Pushes accepted output to the transport's boundary, for a transport that buffers. |
| `ByteDuplex.shutdownWrite(deadline)` | Flushes, then closes the sending direction. The peer sees end of input; you can still read. |
| `ByteDuplex.close()` | Closes both directions. Repeated calls do nothing more. |

`ReadTransfer.End` is the end of the byte stream, not a protocol message: the peer called `shutdownWrite` or closed. The standard library checks every count a provider reports. A count of zero, or more than the buffer holds, closes the stream and fails with `ByteIoError.InvalidTransferCount`, so code above it can trust the numbers.

The failures are one union, `ByteIoError`:

| Variant | Means |
| --- | --- |
| `Timeout { operation }` | The deadline passed first. |
| `Closed { operation }` | That direction, or the whole stream, is already closed. |
| `Provider { operation, code }` | The transport refused, with a provider-specific code. |
| `InvalidTransferCount { operation, count, limit }` | The provider reported an impossible count. |

`operation` is a `ByteIoOperation`: `Read`, `Write`, `Flush`, `ShutdownWrite` or `Close`.

A `ByteDuplex` provider is a value you lend to code with `Effect.provideMut<ByteDuplex>(&mut provider)`, as the Networking guide does with a socket `Connection`. The buffered layer below takes the provider directly instead.

## Deadlines

Each operation except `close` takes `Option<Instant>`: an absolute point on the `MonotonicClock`, or `none()` to wait forever. Absolute deadlines compose. Compute one, pass it to several operations, and together they finish by then:

```silk
let now = run MonotonicClock.now()
let deadline = MonotonicClock.deadlineAfter(&now, 10000000000)  // ten seconds
```

`Instant` is not `Copy`. To pass the same deadline to several calls, make a copy with `MonotonicClock.deadlineAfter(&deadline, 0)`. The operations wait on the `MonotonicClock` in the requirement row, so a test can supply a clock that moves only when told to, as the tests below do.

## Buffered sessions

Reading a line straight from `ByteDuplex` is awkward. One read can return half a line, or a line and a half, and the bytes after the newline belong to the next line. Writing an answer in three small pieces costs three transport writes. `withBufferedCapacity` from `silk/io/buffered_duplex` solves both. It allocates an input buffer and an output buffer of the sizes you give, lends a `BufferedDuplex` session to a callback, and closes the transport when the callback finishes, however it finishes. `withBuffered` does the same with 8192 bytes each way.

On the input side:

- `fill(session, minimum, deadline)` reads until at least `minimum` bytes are buffered and returns `FillOutcome.Available { count }`, or `FillOutcome.End { available }` if the stream ended first. Asking for more than the buffer's capacity fails with `BufferError.BufferTooSmall`.
- `peek(session)` borrows the buffered bytes without removing them.
- `consume(session, count)` removes bytes from the front once you have dealt with them. The bytes after them stay buffered for the next call.
- `readSome`, `readExact`, `discardAtMost` and `discardExact` cover the other common cases.

On the output side, `writeAll`, `writeSome` and `writeVecAll` copy bytes into the output buffer, which is written to the transport when it fills. `flush(session, deadline)` writes what is pending now. `shutdownWrite` flushes and then half-closes.

The scope never flushes for you. When the callback returns or fails, anything still in the output buffer is dropped and the transport is closed. A protocol must flush, or call `shutdownWrite`, before it finishes, and also before it waits for the peer to say something more; otherwise the peer may be waiting for an answer that is still sitting in the buffer.

Failures from these operations are `BufferError` from `silk/io/buffered_input`. The transport's own failures arrive wrapped, with how far the operation got: `ReadFailed { progress, error }` and `WriteFailed { accepted, drained, error }`, where `error` is the `ByteIoError`. After such a failure the session is terminal, and further operations fail with `BufferError.Terminal`.

The buffers also exist on their own. `BufferedOutput` from `silk/io/buffered_output` is the output half without a session: make it with `BufferedOutput.make(capacity)`, write through it to a `ByteDuplex` with a deadline, and end with `finish`, because dropping it does not flush. Code that writes text through the `Writer` service, such as `Format.format`, wants `BufferedWriter` from the same module instead. It wraps a `Writer` provider such as `StdoutWriter` and is a `Writer` itself; the Output, logging and standard input guide shows it. Use `BufferedOutput` when the destination is a `ByteDuplex` or the caller keeps it, and `BufferedWriter` for code that requires `&mut Writer`.

## The protocol

`numberLines` is the server's work, written against a session over any provider `P`:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.io.buffered_duplex { BufferedDuplex, withBufferedCapacity, withBufferedPairCapacity }
import silk.io.buffered_input { BufferError, FillOutcome }
import silk.io.buffered_transfer { BufferedTransfer }
import silk.io.byte_duplex { ByteDuplex, ByteIoError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.system.host_input { HostInput, HostInputError }
import silk.collections.list { List }
import silk.io.memory_byte_duplex { MemoryByteDuplex, MemoryReadEvent, MemoryWriteAction, MemoryWriteEvent }
import silk.system.monotonic_clock { MonotonicClock }
import silk.net.socket_native { AcceptedView, ConnectOptions, Connection, ListenOptions, NativeSocketError, accept, connectResolvedOwned, listen, withAccepted }
import silk.net.address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.core.option { Option }
import silk.system.monotonic_clock_native { OsMonotonicClock }
import silk.io.writer_native { StderrWriter }
import silk.core.result { Result }
import silk.collections.slice { Slice }
import silk.system.system_clock { Instant, SystemClock }
import silk.testing.testing { AssertionError, Testing }
import silk.num.u32
import silk.num.u64
import silk.num.u8
import silk.num.usize
import silk.io.writer { Writer, WriterError }

// ---------------------------------------------------------------------------
// The protocol: read lines, answer each one as "N: line".

pub struct LineTooLong {}

// The longest line the server accepts, newline included. It is also the input buffer's capacity.
const MAX_LINE: usize = 64

// Waits until the buffer holds a whole line and returns its length, newline included.
// Returns 0 at the end of the input. A last line without a newline counts as a line.
effect<'call> fn nextLine<'call, 'transport: 'call, P>(session: &'call mut BufferedDuplex<'transport, P>, deadline: &Instant) -> usize
! BufferError | LineTooLong
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
  while true {
    let unread = BufferedDuplex.peek(&session.*)
    let mut index: usize = 0
    while index < unread.length {
      if unread[index] == 10 {
        return index + 1
      }
      index = index + 1
    }
    let have = unread.length
    drop unread
    if have == MAX_LINE {
      fail LineTooLong {}
    }
    // About to wait for the peer: first send the answers written so far.
    if BufferedDuplex.pending(&session.*) > 0 {
      run BufferedDuplex.flush(&mut session.*, Option<Instant>.some(MonotonicClock.deadlineAfter(deadline, 0)))
    }
    match move run BufferedDuplex.fill(&mut session.*, have + 1, Option<Instant>.some(MonotonicClock.deadlineAfter(deadline, 0))) {
      FillOutcome.Available { .. } => {}
      FillOutcome.End { available } => { return available }
    }
  }
  return 0
}

// Writes the decimal digits of `value`.
effect<'call> fn writeNumber<'call, 'transport: 'call, P>(session: &'call mut BufferedDuplex<'transport, P>, value: usize, deadline: &Instant) -> ()
! BufferError
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
  let mut digits: [u8; 20] = [0; 20]
  let mut start: usize = 20
  let mut rest = value
  while start == 20 || rest > 0 {
    start = start - 1
    digits[start] = 48 + usize.toU8(rest % 10)
    rest = rest / 10
  }
  run BufferedDuplex.writeAll(&mut session.*, Slice.view(&digits, start, 20 - start), Option<Instant>.some(MonotonicClock.deadlineAfter(deadline, 0)))
}

// Numbers every line until the input ends, then flushes and half-closes. Returns the line count.
// Each line must arrive within `idle` nanoseconds of the previous one.
effect<'call> fn numberLines<'call, 'transport: 'call, P>(session: &'call mut BufferedDuplex<'transport, P>, idle: u64) -> usize
! BufferError | LineTooLong
? &mut MonotonicClock
where &'transport mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
  let mut count: usize = 0
  while true {
    let now = run MonotonicClock.now()
    let deadline = MonotonicClock.deadlineAfter(&now, idle)
    let length = run nextLine(&mut session.*, &deadline)
    if length == 0 {
      run BufferedDuplex.shutdownWrite(&mut session.*, Option<Instant>.some(move deadline))
      return count
    }
    // Copy the line out, so the session can be borrowed again for writing.
    let mut line: [u8; 64] = [0; 64]
    let unread = BufferedDuplex.peek(&session.*)
    let mut index: usize = 0
    while index < length {
      line[index] = unread[index]
      index = index + 1
    }
    drop unread
    run BufferedDuplex.consume(&mut session.*, length)
    count = count + 1
    let mut text = length
    if line[length - 1] == 10 {
      text = length - 1
    }
    run writeNumber(&mut session.*, count, &deadline)
    run BufferedDuplex.writeAll(&mut session.*, b": ", Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
    run BufferedDuplex.writeAll(&mut session.*, Slice.view(&line, 0, text), Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
    run BufferedDuplex.writeAll(&mut session.*, b"\n", Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
  }
  return count
}
```

`nextLine` looks for a newline in what is already buffered, and asks `fill` for one more byte than it has when there is none. The input buffer is `MAX_LINE` bytes, so a buffer that is full with no newline in it means the line is too long. That is how the buffer's capacity doubles as a limit on what a client can make the server hold.

Before it waits for more input, `nextLine` flushes the answers written so far. Without that line, a client that sends one line and waits would never see the answer: it would sit in the output buffer until the buffer filled or the input ended.

`numberLines` computes a fresh deadline for each line, so the limit is on how long the client may stay quiet, not on the whole conversation. `peek` borrows the session, so the line is copied into a local array before the session is borrowed again to write the answer.

The `where` clause says what `P` must be: a provider that offers `ByteDuplex` using a `MonotonicClock`. Native sockets and the in-memory test provider both are.

## Copying between streams

`BufferedTransfer.transferAtMost(source, destination, limit, deadline)` moves up to `limit` bytes from one session's input to another session's output. It removes from the source only what the destination accepted, and returns a `TransferOutcome` with the `count` and whether it saw the source's end (`endObserved`). `transferExact` moves an exact number of bytes or fails with `BufferError.UnexpectedEnd`.

```silk
// ---------------------------------------------------------------------------
// Copying: move everything from one stream to another, then half-close the destination.

effect<'source & 'target> fn copyAll<'source, 'sourceTransport: 'source, 'target, 'targetTransport: 'target, SP, DP>(
  source: &'source mut BufferedDuplex<'sourceTransport, SP>,
  destination: &'target mut BufferedDuplex<'targetTransport, DP>,
  idle: u64,
) -> usize
! BufferError
? &mut MonotonicClock
where &'sourceTransport mut SP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  &'targetTransport mut DP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock {
  let mut total: usize = 0
  while true {
    let now = run MonotonicClock.now()
    let deadline = MonotonicClock.deadlineAfter(&now, idle)
    let moved = run BufferedTransfer.transferAtMost(&mut source.*, &mut destination.*, 4096, Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
    total = total + moved.count
    if moved.endObserved {
      run BufferedDuplex.shutdownWrite(&mut destination.*, Option<Instant>.some(move deadline))
      return total
    }
  }
  return total
}

// The relay: the client's request goes to the target, the target's answer back to the client.
effect<'clientCall & 'targetCall> fn relay<'clientCall, 'targetCall>(
  client: &'clientCall mut BufferedDuplex<'clientCall, Connection>,
  target: &'targetCall mut BufferedDuplex<'targetCall, Connection>,
) -> usize ! BufferError ? &mut MonotonicClock {
  let sent = run copyAll(&mut client.*, &mut target.*, 5000000000)
  let received = run copyAll(&mut target.*, &mut client.*, 5000000000)
  return sent + received
}

fn same(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length {
    return false
  }
  let mut index: usize = 0
  while index < left.length {
    if left[index] != right[index] {
      return false
    }
    index = index + 1
  }
  return true
}
```

`copyAll` repeats the transfer until the source ends, then half-closes the destination, which flushes what is left. `relay` uses it twice: the client's request to the target, then the target's answer back. `withBufferedPairCapacity` opens both sessions at once and closes both transports afterwards. Copying one direction to the end before starting the other suits a request-and-answer protocol like this one. A relay for a conversation would copy both directions at once, one fiber each; see the Concurrent I/O patterns guide.

## In-memory streams for tests

`MemoryByteDuplex` from `silk/io/memory_byte_duplex` is a `ByteDuplex` provider that plays a script. You give it:

- read events, in order: `MemoryReadEvent.Data { readyAt, bytes }`, `End { readyAt }`, or `Failure { readyAt, code }`. Each becomes readable at its `readyAt` time on the `MonotonicClock`, and a `Data` event is handed out in as many pieces as the reader's buffer requires.
- write events, one per transport write: `MemoryWriteEvent { readyAt, action }`, where the action is `MemoryWriteAction.Accept { count }` (take at most `count` bytes) or `Failure { code }`.
- the capacity for the bytes it accepts, and for its audit log.

Afterwards, `outbound()` returns everything written, `audit()` lists the operations in order, and `phase()` tells whether it was closed.

```silk
// ---------------------------------------------------------------------------
// Tests: a scripted in-memory stream stands in for the socket.

struct ManualClock {
  seconds: i64,
  nanoseconds: i64,
}

impl MonotonicClock for ManualClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(self.seconds, self.nanoseconds)
  }
  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }
  // Waiting moves virtual time forward at once.
  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    self.seconds = SystemClock.seconds(&when)
    self.nanoseconds = SystemClock.nanoseconds(&when)
  }
  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    let now = SystemClock.make(self.seconds, self.nanoseconds)
    let later = MonotonicClock.deadlineAfter(&now, howLong)
    self.seconds = SystemClock.seconds(&later)
    self.nanoseconds = SystemClock.nanoseconds(&later)
  }
}

effect fn arrive(reads: &mut List<MemoryReadEvent>, seconds: i64, text: &[u8]) -> () ! OutOfMemoryError ? &mut Allocator {
  run reads.append(MemoryReadEvent.Data { readyAt: SystemClock.make(seconds, 0), bytes: run Bytes.copy(text) })
}

// A peer that takes at most `count` bytes per write, `times` times.
effect fn accepting(count: usize, times: usize) -> List<MemoryWriteEvent> ! OutOfMemoryError ? &mut Allocator {
  let mut writes = List<MemoryWriteEvent>.make()
  let mut index: usize = 0
  while index < times {
    run writes.append(MemoryWriteEvent { readyAt: SystemClock.make(0, 0), action: MemoryWriteAction.Accept { count: count } })
    index = index + 1
  }
  return move writes
}

test effect fn numbersLinesSplitAcrossReads() ! AssertionError<'static> | BufferError | LineTooLong | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = ManualClock { seconds: 0, nanoseconds: 0 }
  let mut reads = List<MemoryReadEvent>.make()
  run arrive(&mut reads, 0, b"hel") |> Effect.provideMut<Allocator>(&mut allocator)
  run arrive(&mut reads, 0, b"lo\nwor") |> Effect.provideMut<Allocator>(&mut allocator)
  run arrive(&mut reads, 0, b"ld\nlast") |> Effect.provideMut<Allocator>(&mut allocator)
  run reads.append(MemoryReadEvent.End { readyAt: SystemClock.make(0, 0) }) |> Effect.provideMut<Allocator>(&mut allocator)
  // The peer accepts only 5 bytes per write, so the buffered output has to keep writing.
  let writes = run accepting(5, 8) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut peer = run MemoryByteDuplex.make(move reads, move writes, 256, 32, Option<i32>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
  let count = run withBufferedCapacity(&mut peer, MAX_LINE, 256, numberLines(1000000000))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(count == 3, "three lines, the last without a newline")
  run Testing.expect(same(peer.outbound(), b"1: hello\n2: world\n3: last\n"), "each line is numbered")
}

test effect fn aSilentPeerTimesOut() ! AssertionError<'static> | LineTooLong | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = ManualClock { seconds: 0, nanoseconds: 0 }
  let mut reads = List<MemoryReadEvent>.make()
  run arrive(&mut reads, 0, b"hi\n") |> Effect.provideMut<Allocator>(&mut allocator)
  run arrive(&mut reads, 3, b"late\n") |> Effect.provideMut<Allocator>(&mut allocator)
  let writes = run accepting(64, 4) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut peer = run MemoryByteDuplex.make(move reads, move writes, 256, 32, Option<i32>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
  let outcome = run Effect.result(withBufferedCapacity(&mut peer, MAX_LINE, 256, numberLines(1000000000)))
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let timedOut = match move outcome {
    Result.Failure { error } => match move error {
      BufferError failure => match move failure {
        BufferError.ReadFailed { error: ByteIoError.Timeout { .. }, .. } => true
        _ => false
      }
      _ => false
    }
    Result.Success { .. } => false
  }
  run Testing.expect(timedOut, "the second line comes 3 s later, after the 1 s deadline")
  run Testing.expect(clock.seconds == 1, "the wait ended at the deadline")
}

test effect fn copiesEveryByte() ! AssertionError<'static> | BufferError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = ManualClock { seconds: 0, nanoseconds: 0 }
  let mut reads = List<MemoryReadEvent>.make()
  run arrive(&mut reads, 0, b"one ") |> Effect.provideMut<Allocator>(&mut allocator)
  run arrive(&mut reads, 1, b"two ") |> Effect.provideMut<Allocator>(&mut allocator)
  run arrive(&mut reads, 2, b"three") |> Effect.provideMut<Allocator>(&mut allocator)
  run reads.append(MemoryReadEvent.End { readyAt: SystemClock.make(2, 0) }) |> Effect.provideMut<Allocator>(&mut allocator)
  let none = run accepting(1, 0) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut source = run MemoryByteDuplex.make(move reads, move none, 0, 32, Option<i32>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
  let writes = run accepting(3, 8) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut destination = run MemoryByteDuplex.make(List<MemoryReadEvent>.make(), move writes, 64, 32, Option<i32>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
  let copied = run withBufferedPairCapacity(&mut source, 16, 16, &mut destination, 16, 16, copyBoth)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  run Testing.expect(copied == 13, "13 bytes copied")
  run Testing.expect(same(destination.outbound(), b"one two three"), "in order")
}

effect<'sourceCall & 'targetCall> fn copyBoth<'sourceCall, 'targetCall>(
  source: &'sourceCall mut BufferedDuplex<'sourceCall, MemoryByteDuplex>,
  target: &'targetCall mut BufferedDuplex<'targetCall, MemoryByteDuplex>,
) -> usize ! BufferError ? &mut MonotonicClock {
  return run copyAll(&mut source.*, &mut target.*, 5000000000)
}
```

`ManualClock` is a `MonotonicClock` whose waits move time forward at once, so the tests take microseconds even when they script three seconds of silence. Each test checks one thing a socket test could not easily control:

- `numbersLinesSplitAcrossReads` delivers the lines in pieces that cut through them and lets the peer accept only 5 bytes per write. The output is still exact.
- `aSilentPeerTimesOut` delivers the second line 3 seconds after the first, against a 1-second idle limit. The failure is `BufferError.ReadFailed` wrapping `ByteIoError.Timeout`, and the clock shows the wait stopped at the deadline.
- `copiesEveryByte` copies through a destination that accepts 3 bytes at a time.

```sh
silk test
```

```
  main::aSilentPeerTimesOut
    PASS  76 us
  main::copiesEveryByte
    PASS  43 us
  main::numbersLinesSplitAcrossReads
    PASS  66 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   1 ms
```

## The program

`main` accepts one connection, then either numbers its lines or relays it:

```silk
// ---------------------------------------------------------------------------
// The program: numbered serve <port> | numbered relay <port> <target-port>

pub struct UsageError {}

fn local(port: u16) -> Endpoint {
  return Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
}

effect<'call> fn serveOne<'call>(view: &'call mut AcceptedView<'call>) -> usize
! BufferError | LineTooLong | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator {
  // 64 bytes of input buffer bound the line length; 1024 bytes of output batch the answers.
  return run withBufferedCapacity(&mut view.connection.*, MAX_LINE, 1024, numberLines(10000000000))
}

effect<'call> fn relayOne<'call>(view: &'call mut AcceptedView<'call>, targetPort: u16) -> usize
! NativeSocketError | BufferError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator {
  let endpoints = [local(targetPort)]
  let mut target = run connectResolvedOwned(&endpoints, ConnectOptions.defaults(), Option<Instant>.none())
  return run withBufferedPairCapacity(&mut view.connection.*, 4096, 4096, &mut target, 4096, 4096, relay)
}

effect fn portArgument(index: usize) -> u16 ! UsageError | HostInputError | OutOfMemoryError ? &mut HostInput | &mut Allocator {
  let text = match move run HostInput.argument(index) {
    Option.Some { value } => move value
    Option.None => { fail UsageError {} }
  }
  let digits = Bytes.asSlice(&text)
  if digits.length == 0 || digits.length > 5 {
    fail UsageError {}
  }
  let mut value: u32 = 0
  let mut position: usize = 0
  while position < digits.length {
    if digits[position] < 48 || digits[position] > 57 {
      fail UsageError {}
    }
    value = value * 10 + u8.toU32(digits[position] - 48)
    position = position + 1
  }
  if value > 65535 {
    fail UsageError {}
  }
  return u32.toU16(value)
}

effect fn command() -> usize
! UsageError | HostInputError | NativeSocketError | BufferError | LineTooLong | OutOfMemoryError
? &mut HostInput | &mut MonotonicClock | &mut Allocator {
  let verb = match move run HostInput.argument(1) {
    Option.Some { value } => move value
    Option.None => { fail UsageError {} }
  }
  let port = run portArgument(2)
  // Address reuse lets the server bind again at once after a previous run.
  let options = match move ListenOptions.make(128, true, 1000000) {
    Result.Success { value } => value
    Result.Failure { .. } => ListenOptions.defaults()
  }
  let mut listener = run listen(local(port), options)
  let accepted = run accept(&mut listener, Option<Instant>.none())
  if same(Bytes.asSlice(&verb), b"serve") {
    return run withAccepted(move accepted, serveOne)
  }
  if same(Bytes.asSlice(&verb), b"relay") {
    let targetPort = run portArgument(3)
    return run withAccepted(move accepted, relayOne(targetPort))
  }
  fail UsageError {}
}

pub effect fn main() -> i32 ! WriterError ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = OsMonotonicClock.make()
  let mut writer = StderrWriter.make()
  let outcome = run Effect.result(command())
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let message = match move outcome {
    Result.Success { .. } => { return 0 }
    Result.Failure { error } => match move error {
      UsageError _ => "usage: numbered serve <port> | numbered relay <port> <target-port>"
      LineTooLong _ => "a line was longer than 64 bytes"
      BufferError failure => match move failure {
        BufferError.ReadFailed { error: ByteIoError.Timeout { .. }, .. } => "the client went quiet"
        _ => "the connection failed"
      }
      NativeSocketError failure => match move failure {
        NativeSocketError.AddressInUse => "the port is already in use"
        _ => "the socket failed"
      }
      _ => "the program failed"
    }
  }
  run Format.format("numbered: {message}\n", &.{ message: message }) |> Effect.provideMut<Writer>(&mut writer)
  return 1
}
```

`serveOne` opens the session with a 64-byte input buffer, the line limit, and a 1024-byte output buffer, and gives each line ten seconds. `numberLines(10000000000)` is a staged call: it fixes the idle limit now, and `withBufferedCapacity` supplies the session. The listener turns on address reuse so the server can be restarted on the same port at once.

## Try it

Build, start the server, and send it three lines with the `ask` program from the Networking guide. `ask send` sends its message, half-closes, and prints the reply:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/numbered serve 7300 &
ask send 127.0.0.1 7300 $'roses are red\nviolets are blue\nno newline at the end'
```

```
1: roses are red
2: violets are blue
3: no newline at the end

```

(The blank line is `ask` ending the reply with a newline of its own.) Through a relay:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/numbered serve 7300 &
./build/llvm/x86_64-unknown-linux-gnu/debug/numbered relay 7301 7300 &
ask send 127.0.0.1 7301 $'through\nthe relay'
```

```
1: through
2: the relay

```

A line longer than 64 bytes ends the session. The server reports it, and closes the connection with input still unread, which the client sees as a reset:

```
numbered: a line was longer than 64 bytes
ask: the connection failed
```

A client that sends one line and then goes quiet gets its answer at once, because of the flush before waiting, and after ten seconds the server gives up with `numbered: the client went quiet`.

## API reference

- `silk/io/byte_duplex`: `ByteDuplex`, `ReadTransfer`, `ByteIoError`, `ByteIoOperation`
- `silk/io/buffered_duplex`: `BufferedDuplex`, `withBuffered`, `withBufferedCapacity`, `withBufferedPairCapacity`, `DEFAULT_CAPACITY`
- `silk/io/buffered_input`: `BufferedInput`, `BufferError`, `FillOutcome`
- `silk/io/buffered_output`: `BufferedOutput`, `BufferedWriter`
- `silk/io/buffered_transfer`: `BufferedTransfer`, `TransferOutcome`
- `silk/io/memory_byte_duplex`: `MemoryByteDuplex`, `MemoryReadEvent`, `MemoryWriteEvent`, `MemoryWriteAction`
- `silk/system/monotonic_clock`: `MonotonicClock`
