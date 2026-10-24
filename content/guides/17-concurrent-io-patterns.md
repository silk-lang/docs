# Concurrent I/O patterns

Silk runs concurrent work as fibers: cooperative tasks that share one thread and take turns whenever one of them waits. A program that talks to several sockets at once, or serves several clients at once, forks one fiber per conversation and lets the scheduler switch between them. This guide builds `fanout`, a small TCP program with two commands, and uses it to show four patterns: serving many connections at once, running requests in parallel and joining them, passing results from producer fibers to a consumer, and putting a time limit on any effect.

```
fanout serve <port> <count>
fanout ask <port> <milliseconds> <word>...
```

`fanout serve` accepts `count` connections. For each one it reads a word, waits a tenth of a second per letter (standing in for real work), and answers with the word in capitals. `fanout ask` sends every word on its own connection at the same time, gives each one the same time budget, and prints each answer the moment it arrives.

## The rules that shape the code

Fibers come from `silk/fiber`, `silk/scheduler` and `silk/local_scheduler`. A few rules decide how the program is laid out:

- **One thread, cooperative.** A fiber runs until it waits: on a socket, on a timer, or on another fiber. Then the scheduler resumes another one that is ready. Nothing runs in parallel on several cores.
- **`main` sets up the scheduler.** `main` makes a `LocalScheduler` and a `MonotonicClock` and runs the first task with `LocalScheduler.execute`. Code that may wait on a fiber cannot run directly under `main`.
- **A child requires only the scheduler and the clock.** `Fiber<A, E>.forkChild(child)` takes an effect whose row is at most `? &mut Scheduler | &mut MonotonicClock`, and the child may not borrow from its parent. Everything else the child needs, it either owns (moved in) or makes itself: its own allocator, its own writer.
- **Children do not outlive their parent.** When a task finishes, the scheduler cancels its unfinished children. A parent that wants its children's work done must `join` (or `await`) them.
- **There is no channel, select or timeout in the standard library.** Fibers that need to talk share a `Shared<T>` value from `silk/shared` and poll it. The program below builds a mailbox and a timeout that way.

The socket operations from the Networking guide wait on the `MonotonicClock`. Inside a `LocalScheduler` task, that wait parks only the current fiber, so they are the building blocks used here.

## Shared helpers

The imports, and helpers used by both commands. `readAll` and `writeAll` are the loops from the Networking guide. `passed` and `tenths` work with `Instant` values, which have no comparison of their own:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ByteDuplex, ByteIoError, ReadTransfer }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.fiber { Cancelled, Fiber }
import silk.format { Format }
import silk.host_input { HostInput, HostInputError }
import silk.list { List }
import silk.local_scheduler { LocalScheduler, StalledError }
import silk.monotonic_clock { MonotonicClock }
import silk.native_socket { Accepted, AcceptedView, ConnectOptions, ListenOptions, NativeSocketError, accept, connectResolvedOwned, listen, withAccepted }
import silk.network_address { Endpoint, IpAddress, Ipv4Address, Port }
import silk.option { Option }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.os_writer { StdoutWriter }
import silk.result { Result }
import silk.scheduler { Scheduler, TaskIdExhaustedError }
import silk.shared { Shared }
import silk.slice { Slice }
import silk.string { String }
import silk.system_clock { Instant, SystemClock }
import silk.u8
import silk.u32
import silk.u64
import silk.usize
import silk.writer { Writer, WriterError }

// ---------------------------------------------------------------------------
// Time helpers: `Instant` is not Copy and has no comparison, so the program carries its own.

fn copy(instant: &Instant) -> Instant {
  return MonotonicClock.deadlineAfter(instant, 0)
}

fn passed(now: &Instant, deadline: &Instant) -> bool {
  let nowSeconds = SystemClock.seconds(now)
  let deadlineSeconds = SystemClock.seconds(deadline)
  if nowSeconds != deadlineSeconds {
    return nowSeconds > deadlineSeconds
  }
  return SystemClock.nanoseconds(now) >= SystemClock.nanoseconds(deadline)
}

// Tenths of a second from `start` to `now`.
fn tenths(start: &Instant, now: &Instant) -> i64 {
  let seconds = SystemClock.seconds(now) - SystemClock.seconds(start)
  let nanoseconds = SystemClock.nanoseconds(now) - SystemClock.nanoseconds(start)
  return (seconds * 1000000000 + nanoseconds) / 100000000
}

// ---------------------------------------------------------------------------
// Byte helpers shared by both sides.

effect fn readAll(deadline: &Instant) -> Bytes ! ByteIoError | OutOfMemoryError ? &mut ByteDuplex | &mut MonotonicClock | &mut Allocator {
  let mut reply = Bytes.make()
  let mut chunk: [u8; 256] = [0; 256]
  while true {
    match move run ByteDuplex.readSome(&mut chunk, Option<Instant>.some(copy(deadline))) {
      ReadTransfer.End => { return move reply }
      ReadTransfer.Data { count } => run reply.append(Slice.view(&chunk, 0, count))
    }
  }
  return move reply
}

effect fn writeAll(input: &[u8], deadline: &Instant) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock {
  let mut offset: usize = 0
  while offset < input.length {
    offset = offset + run ByteDuplex.writeSome(Slice.view(input, offset, input.length - offset), Option<Instant>.some(copy(deadline)))
  }
}

fn upper(bytes: &mut [u8]) -> () {
  let mut index: usize = 0
  while index < bytes.length {
    if bytes[index] >= 97 && bytes[index] <= 122 {
      bytes[index] = bytes[index] - 32
    }
    index = index + 1
  }
}

fn asText(bytes: &[u8]) -> string {
  return match move String.fromUtf8(bytes) {
    Result.Success { value } => value
    Result.Failure { .. } => "?"
  }
}

fn local(port: u16) -> Endpoint {
  return Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
}
```

## Serving many connections

The parent task owns the listener. It accepts a connection, forks a child for it, and goes straight back to accepting. `accept` returns an owned `Accepted`, which moves into the child, so the child does not borrow anything from its parent:

```silk
// ---------------------------------------------------------------------------
// Serving many connections: accept in the parent, one child fiber per connection.

// Reads the word, waits a tenth of a second per letter, answers in capitals.
effect fn shout() -> Bytes ! ByteIoError | OutOfMemoryError ? &mut ByteDuplex | &mut MonotonicClock | &mut Allocator {
  let now = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&now, 5000000000)
  let mut word = run readAll(&deadline)
  run Effect.sleep(usize.toU64(word.length()) * 100000000)
  let answer = run Bytes.copy(Bytes.asSlice(&word))
  upper(Bytes.asMutSlice(&mut word))
  run writeAll(Bytes.asSlice(&word), &deadline)
  run ByteDuplex.shutdownWrite(Option<Instant>.some(copy(&deadline)))
  return move answer
}

effect<'call> fn useConnection<'call>(view: &'call mut AcceptedView<'call>) -> Bytes ! ByteIoError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  return run shout() |> Effect.provideMut<ByteDuplex>(&mut view.connection.*)
}

// The child task for one connection. It owns the connection and makes its own allocator and
// writer, because a child may require only the scheduler and the clock.
effect fn handle(accepted: Accepted) -> () ! WriterError ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut writer = StdoutWriter.make()
  let outcome = run Effect.result(withAccepted(move accepted, useConnection)) |> Effect.provideMut<Allocator>(&mut allocator)
  match move outcome {
    Result.Success { value } => run Format.format("served {word}\n", &.{ word: asText(Bytes.asSlice(&value)) }) |> Effect.provideMut<Writer>(&mut writer)
    Result.Failure { error } => {
      drop error
      run Format.format("a connection failed\n", &()) |> Effect.provideMut<Writer>(&mut writer)
    }
  }
}

effect fn serve(port: u16, count: u32) -> () ! NativeSocketError | WriterError | OutOfMemoryError | TaskIdExhaustedError | Cancelled ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut listener = run listen(local(port), ListenOptions.defaults())
  let mut children = List<Fiber<(), WriterError>>.make()
  let mut accepted: u32 = 0
  while accepted < count {
    let connection = run accept(&mut listener, Option<Instant>.none())
    let child = run Fiber<(), WriterError>.forkChild(handle(move connection))
    run children.append(move child) |> Effect.provideMut<Allocator>(&mut allocator)
    accepted = accepted + 1
  }
  drop run Effect.result(listener.close())
  // The parent must outlive its children: when a task finishes, its unfinished children are cancelled.
  while children.length() > 0 {
    run Fiber.join(children.remove(0))
  }
}
```

`handle` is the child. Its row is `? &mut Scheduler | &mut MonotonicClock` and nothing else, so it makes its own allocator and its own `StdoutWriter`. A failed connection is reported and ends only that child: the client in the timeout example below hangs up early, and the server carries on.

`serve` keeps every child's `Fiber` in a list and joins them all once it has accepted `count` connections. Without the joins, `serve` would return while children were still working, and the scheduler would cancel them.

The same shape works for the HTTP server from the HTTP server and WebSockets guide. Instead of `serveNext`, which accepts and serves one connection in the same task, accept in the parent and call `withConnection` from `silk/http_server` in the child. With that guide's `Greeter` handler and `limits()`:

```silk
effect<'call> fn useConnection<'call>(view: &'call mut AcceptedView<'call>) -> u16
! ServerError | UpgradeError | BufferError | OutOfMemoryError ? &mut Logger | &mut MonotonicClock | &mut Allocator {
  return run withConnection<u16, ServerError | UpgradeError | OutOfMemoryError>(&mut view.connection.*, limits(), Greeter {})
}

// One child per connection. It makes its own allocator and logger.
effect fn handle(accepted: Accepted) -> () ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut logger = StdoutLogger.make()
  let outcome = run Effect.result(withAccepted(move accepted, useConnection))
    |> Effect.provideMut<Logger>(&mut logger)
    |> Effect.provideMut<Allocator>(&mut allocator)
  if let Result.Failure { error } = move outcome {
    drop error
  }
}

effect fn serve(port: u16, count: u32) -> () ! NativeSocketError | OutOfMemoryError | TaskIdExhaustedError | Cancelled ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let endpoint = Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
  let mut listener = run listen(endpoint, ListenOptions.defaults())
  let mut children = List<Fiber<(), never>>.make()
  let mut accepted: u32 = 0
  while accepted < count {
    let connection = run accept(&mut listener, Option<Instant>.none())
    let child = run Fiber<(), never>.forkChild(handle(move connection))
    run children.append(move child) |> Effect.provideMut<Allocator>(&mut allocator)
    accepted = accepted + 1
  }
  while children.length() > 0 {
    run Fiber.join(children.remove(0))
  }
}
```

To compare, open one client that connects and waits 1.5 seconds before sending its request, and two that send at once. With the serial `serveNext` loop, every client waits for the slow one:

```
slow HTTP/1.1 200 OK 1.5s
fast1 HTTP/1.1 200 OK 1.5s
fast2 HTTP/1.1 200 OK 1.5s
```

With a fiber per connection, the fast clients are answered at once:

```
fast1 HTTP/1.1 200 OK 0.1s
fast2 HTTP/1.1 200 OK 0.2s
slow HTTP/1.1 200 OK 1.5s
```

## A timeout around any effect

Every socket operation already takes a deadline. `within` adds one to any effect that can run as a fiber, including one made of many socket calls, without changing the effect itself:

```silk
// ---------------------------------------------------------------------------
// A timeout around any effect: run it in a child of a fresh scheduler and stop waiting at the deadline.

fn storeResult<A, E>(slot: &mut Option<Result<A, E>>, result: Result<A, E>) -> () {
  drop Intrinsic.replace(slot.*, Option<Result<A, E>>.some(move result))
}

fn takeResult<A, E>(slot: &mut Option<Result<A, E>>) -> Option<Result<A, E>> {
  return Intrinsic.replace(slot.*, Option<Result<A, E>>.none())
}

effect fn deliver<A: 'static, E: 'static>(
  work: once Effect<'static; A ! E ? &mut Scheduler | &mut MonotonicClock>,
  slot: Shared<Option<Result<A, E>>>,
) -> () ? &mut Scheduler | &mut MonotonicClock {
  let result = run Effect.result(move work)
  Shared.withMut(&slot, storeResult<A, E>(move result))
}

effect fn race<A: 'static, E: 'static>(
  budget: u64,
  work: once Effect<'static; A ! E ? &mut Scheduler | &mut MonotonicClock>,
) -> Option<Result<A, E>> ! OutOfMemoryError | TaskIdExhaustedError ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let slot = run Shared<Option<Result<A, E>>>.make(Option<Result<A, E>>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
  drop run Fiber<(), never>.forkChild(deliver<A, E>(move work, Shared.clone(&slot)))
  let start = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&start, budget)
  while true {
    match move Shared.withMut(&slot, takeResult) {
      Option.Some { value } => { return Option<Result<A, E>>.some(move value) }
      Option.None => {}
    }
    let now = run MonotonicClock.now()
    if passed(&now, &deadline) {
      return Option<Result<A, E>>.none()
    }
    run Effect.sleep(1000000)
  }
  return Option<Result<A, E>>.none()
}

// Returns `None` if `work` has not finished after `budget` nanoseconds. The unfinished work is
// cancelled when the inner scheduler's root returns.
effect fn within<A: 'static, E: 'static>(
  budget: u64,
  work: once Effect<'static; A ! E ? &mut Scheduler | &mut MonotonicClock>,
) -> Option<Result<A, E>> ! OutOfMemoryError | TaskIdExhaustedError | StalledError ? &mut MonotonicClock {
  let mut scheduler = LocalScheduler.make()
  return run LocalScheduler.execute(&mut scheduler, race<A, E>(budget, move work))
}
```

`within` starts a fresh `LocalScheduler` inside the current task. Its root, `race`, forks the work as a child and then checks a shared slot once a millisecond until the work has stored its result there or the budget has passed. Either way `race` returns, and when the root of a scheduler returns, every unfinished task under it is cancelled. That is what stops the work: a request that is still waiting on its socket is cancelled and its connection closed.

Three details are worth noting:

- The work's result, success or failure, comes back as a value: `Option<Result<A, E>>`, where `None` means the budget ran out. `deliver` uses `Effect.result` so a failure ends up in the slot too, instead of ending the child unobserved.
- The slot is a `Shared<Option<Result<A, E>>>`. `Shared.withMut` lends the value to a plain function for the length of one call. `storeResult(move result)` is a staged call: it fixes the second argument now, and `withMut` supplies the first.
- The inner scheduler waits on the outer task's clock. When `within` runs inside a fiber, as it does below, its sleeps park that fiber only.

Polling once a millisecond is the cost of having no wait-for-either primitive. It is cheap for a handful of fibers, and the budget is honored to within a millisecond or so.

## Parallel requests, a producer and a consumer

`fanout ask` forks one producer per word. Each producer makes its request under `within`, turns the outcome into a line of text, and posts it to a shared mailbox. The parent is the consumer: it takes answers out of the mailbox in the order they arrived and prints them.

```silk
// ---------------------------------------------------------------------------
// Asking in parallel: one producer fiber per word, one consumer printing answers as they arrive.

effect fn request(port: u16, word: Bytes) -> Bytes ! NativeSocketError | ByteIoError | OutOfMemoryError ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let now = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&now, 5000000000)
  let endpoints = [local(port)]
  let mut connection = run connectResolvedOwned(&endpoints, ConnectOptions.defaults(), Option<Instant>.some(copy(&deadline)))
  let reply = run Effect.result(exchange(Bytes.asSlice(&word), &deadline))
    |> Effect.provideMut<ByteDuplex>(&mut connection)
    |> Effect.provideMut<Allocator>(&mut allocator)
  drop run Effect.result(connection.close())
  return match move reply {
    Result.Success { value } => move value
    Result.Failure { error } => match move error {
      ByteIoError failure => { fail move failure }
      OutOfMemoryError exhausted => { fail move exhausted }
    }
  }
}

effect fn exchange(word: &[u8], deadline: &Instant) -> Bytes ! ByteIoError | OutOfMemoryError ? &mut ByteDuplex | &mut MonotonicClock | &mut Allocator {
  run writeAll(word, deadline)
  run ByteDuplex.shutdownWrite(Option<Instant>.some(copy(deadline)))
  return run readAll(deadline)
}

// The mailbox between the producers and the consumer: one answer slot per word, and the order
// in which the slots were filled.
struct Mailbox {
  answers: List<Option<Bytes>>,
  order: [usize; 16],
  count: usize,
}

struct Arrival {
  index: usize,
  answer: Bytes,
}

fn post(mailbox: &mut Mailbox, index: usize, answer: Bytes) -> () {
  mailbox.answers.set(index, Option<Bytes>.some(move answer))
  mailbox.order[mailbox.count] = index
  mailbox.count = mailbox.count + 1
}

fn collect(mailbox: &mut Mailbox, seen: usize) -> Option<Arrival> {
  if seen == mailbox.count {
    return Option<Arrival>.none()
  }
  let index = mailbox.order[seen]
  let slots = mailbox.answers.asMutSlice()
  return match move Intrinsic.replace(slots[index], Option<Bytes>.none()) {
    Option.Some { value } => Option<Arrival>.some(Arrival { index: index, answer: move value })
    Option.None => Option<Arrival>.none()
  }
}

effect fn note(text: &[u8]) -> Bytes ! OutOfMemoryError ? &mut Allocator {
  return run Bytes.copy(text)
}

// A producer: asks for one word under the time budget and posts whatever happened.
effect fn produce(index: usize, port: u16, word: Bytes, budget: u64, mailbox: Shared<Mailbox>) -> () ! OutOfMemoryError ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let outcome = run Effect.result(within<Bytes, NativeSocketError | ByteIoError | OutOfMemoryError>(budget, request(port, move word)))
  let answer = match move outcome {
    Result.Success { value: Option.Some { value: Result.Success { value: reply } } } => move reply
    Result.Success { value: Option.None } => run note(b"(no answer in time)") |> Effect.provideMut<Allocator>(&mut allocator)
    _ => run note(b"(failed)") |> Effect.provideMut<Allocator>(&mut allocator)
  }
  Shared.withMut(&mailbox, post(index, move answer))
}

// The consumer: forks the producers, then prints each answer as it arrives.
effect fn askAll(port: u16, budget: u64, words: List<Bytes>) -> () ! WriterError | OutOfMemoryError | TaskIdExhaustedError | Cancelled ? &mut Scheduler | &mut MonotonicClock {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut writer = StdoutWriter.make()
  let total = words.length()
  let mut slots = List<Option<Bytes>>.make()
  let mut index: usize = 0
  while index < total {
    run slots.append(Option<Bytes>.none()) |> Effect.provideMut<Allocator>(&mut allocator)
    index = index + 1
  }
  let mailbox = run Shared<Mailbox>.make(Mailbox { answers: move slots, order: [0; 16], count: 0 }) |> Effect.provideMut<Allocator>(&mut allocator)
  let start = run MonotonicClock.now()
  let mut producers = List<Fiber<(), OutOfMemoryError>>.make()
  index = 0
  while index < total {
    let word = run Bytes.copy(Bytes.asSlice(&words.asSlice()[index])) |> Effect.provideMut<Allocator>(&mut allocator)
    let producer = run Fiber<(), OutOfMemoryError>.forkChild(produce(index, port, move word, budget, Shared.clone(&mailbox)))
    run producers.append(move producer) |> Effect.provideMut<Allocator>(&mut allocator)
    index = index + 1
  }
  let mut seen: usize = 0
  while seen < total {
    match move Shared.withMut(&mailbox, collect(seen)) {
      Option.Some { value } => {
        let now = run MonotonicClock.now()
        let elapsed = tenths(&start, &now)
        let seconds = elapsed / 10
        let tenth = elapsed % 10
        let word = asText(Bytes.asSlice(&words.asSlice()[value.index]))
        let answer = asText(Bytes.asSlice(&value.answer))
        run Format.format("{seconds}.{tenth}s  {word} -> {answer}\n", &.{ seconds: seconds, tenth: tenth, word: word, answer: answer }) |> Effect.provideMut<Writer>(&mut writer)
        seen = seen + 1
      }
      Option.None => run Effect.sleep(1000000)
    }
  }
  while producers.length() > 0 {
    run Fiber.join(producers.remove(0))
  }
}
```

The mailbox holds one answer slot per word and a fixed array of slot numbers in arrival order, which is why `fanout ask` takes at most 16 words. `post` and `collect` are plain functions, because `Shared.withMut` lends the mailbox only to a plain function, which cannot allocate. That is why `askAll` creates every slot before forking anything: posting an answer then needs no memory. `collect` uses `Intrinsic.replace` to take the answer out of its slot and leave `None` behind.

The consumer polls the mailbox once a millisecond, like `race`. When every word has an answer it joins the producers. They have all posted by then, so the joins return at once; they are there so that a producer failure is not lost, and because a parent must not finish before its children.

To run requests in parallel and simply wait for all of them, leave out the mailbox: fork, keep the `Fiber` values, and join them in order. `serve` above does exactly that.

## The command line

```silk
// ---------------------------------------------------------------------------
// The command line: fanout serve <port> <count> | fanout ask <port> <milliseconds> <word>...

pub struct UsageError {}

effect fn argument(index: usize) -> Bytes ! UsageError | HostInputError | OutOfMemoryError ? &mut HostInput | &mut Allocator {
  return match move run HostInput.argument(index) {
    Option.Some { value } => move value
    Option.None => { fail UsageError {} }
  }
}

effect fn number(index: usize) -> u32 ! UsageError | HostInputError | OutOfMemoryError ? &mut HostInput | &mut Allocator {
  let text = run argument(index)
  let digits = Bytes.asSlice(&text)
  if digits.length == 0 || digits.length > 6 {
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
  return value
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

effect fn command() -> ()
! UsageError | HostInputError | NativeSocketError | WriterError | OutOfMemoryError | TaskIdExhaustedError | Cancelled | StalledError
? &mut HostInput | &mut Allocator {
  let verb = run argument(1)
  let port = run number(2)
  if port > 65535 {
    fail UsageError {}
  }
  let mut scheduler = LocalScheduler.make()
  let mut clock = OsMonotonicClock.make()
  if same(Bytes.asSlice(&verb), b"serve") {
    let count = run number(3)
    run LocalScheduler.execute(&mut scheduler, serve(u32.toU16(port), count)) |> Effect.provideMut<MonotonicClock>(&mut clock)
    return ()
  }
  if same(Bytes.asSlice(&verb), b"ask") {
    let budget = u32.toU64(run number(3)) * 1000000
    let total = run HostInput.argumentCount()
    if total < 5 || total > 20 {
      fail UsageError {}
    }
    let mut words = List<Bytes>.make()
    let mut index: usize = 4
    while index < total {
      run words.append(run argument(index))
      index = index + 1
    }
    run LocalScheduler.execute(&mut scheduler, askAll(u32.toU16(port), budget, move words)) |> Effect.provideMut<MonotonicClock>(&mut clock)
    return ()
  }
  fail UsageError {}
}

pub effect fn main() -> i32 ! WriterError ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut writer = StdoutWriter.make()
  let outcome = run Effect.result(command()) |> Effect.provideMut<Allocator>(&mut allocator)
  let message = match move outcome {
    Result.Success { .. } => { return 0 }
    Result.Failure { error } => match move error {
      UsageError _ => "usage: fanout serve <port> <count> | fanout ask <port> <milliseconds> <word>..."
      NativeSocketError _ => "the socket failed"
      WriterError failure => { fail move failure }
      _ => "the program failed"
    }
  }
  run Format.format("fanout: {message}\n", &.{ message: message }) |> Effect.provideMut<Writer>(&mut writer)
  return 1
}
```

`command` reads the arguments before any scheduler starts, because a child cannot require `HostInput`. It then moves the words into the root task, `askAll`, by value. `execute` adds `StalledError`, raised if every task is waiting on something that can never happen, and `OutOfMemoryError`.

## Try it

Build, start a server for four connections, and ask four words with a budget of one second:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/fanout serve 7272 4 &
./build/llvm/x86_64-unknown-linux-gnu/debug/fanout ask 7272 1000 hello hi concurrency silk
```

```
0.2s  hi -> HI
0.4s  silk -> SILK
0.5s  hello -> HELLO
1.0s  concurrency -> (no answer in time)
```

The answers arrive in order of length, not in the order the words were given, and the whole run takes about one second. Asked one after another, the same four words would take 2.2 seconds. The server prints one line per connection:

```
served hi
served silk
served hello
a connection failed
```

The last line is `concurrency`: the server finished its 1.1 seconds of work after the client had given up and closed the connection. With a budget of two seconds, every word is answered:

```
0.2s  hi -> HI
0.4s  silk -> SILK
0.5s  hello -> HELLO
1.1s  concurrency -> CONCURRENCY
```

With no server listening, every request fails at once:

```
0.0s  nobody -> (failed)
```

## What about the HTTP client?

`NativeHttp` from `silk/http_client_native` keeps its own `OsMonotonicClock` and waits on it, rather than on the clock of the task that calls it. Waiting on that clock blocks the thread, so the scheduler cannot switch fibers while a request is in flight. Two fibers that each send a request to a server taking one second to answer finish after two seconds, not one; the same two requests made over native sockets, as above, finish after one. Until that changes:

- Forking HTTP client requests into fibers is correct but gives no overlap.
- `within` cannot cut a `NativeHttp` request short, because the request never lets the scheduler run. Use the request's own `timeoutSeconds`, described in the HTTP client guide.
- The lower layers, `silk/http_fetch` and `silk/http_exchange_native`, take the `MonotonicClock` from their caller's requirements instead of making their own, so under a scheduler they wait on the task's clock. They are the place to start if HTTP requests must overlap.

## API reference

- `silk/fiber`: `Fiber`, `Fiber.forkChild`, `Fiber.join`, `Fiber.await`, `Fiber.yieldNow`, `Cancelled`
- `silk/local_scheduler`: `LocalScheduler`, `StalledError`
- `silk/scheduler`: `Scheduler`, `TaskIdExhaustedError`
- `silk/shared`: `Shared`
- `silk/monotonic_clock`: `MonotonicClock`
- `silk/effect`: `Effect.sleep`, `Effect.result`
- `silk/native_socket`: `listen`, `accept`, `withAccepted`, `connectResolvedOwned`
- `silk/http_server`: `withConnection`
- `silk/http_client_native`: `NativeHttp`
