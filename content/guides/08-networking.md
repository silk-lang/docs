# Networking

Silk's networking starts from three ideas. Addresses are plain values (`silk/network_address`). Name lookup is a service (`silk/resolver`), so tests can swap it. A connected socket is a byte stream (`ByteDuplex`, from `silk/byte_duplex`), the same interface every protocol in the standard library reads and writes. This guide builds `ask`, a small TCP tool with three commands: resolve a name, serve one connection, and send a message. It covers addresses, resolving, connecting, listening, and deadlines. The HTTP server and HTTP client guides build on the same pieces.

```
ask resolve <host>
ask serve <port>
ask send <host> <port> <message>
```

`ask serve` accepts one connection, reads everything the client sends, and answers it in capital letters. `ask send` connects, sends its message, and prints the answer.

## Addresses and hosts

`silk/network_address` has one value type for each thing you pass around:

| Type | What it holds | Make one with |
| --- | --- | --- |
| `Ipv4Address`, `Ipv6Address` | The address octets, in network order | `Ipv4Address.fromOctets([127, 0, 0, 1])`, `Ipv4Address.parse(b"10.0.0.1")` |
| `IpAddress` | Either kind | `IpAddress.V4 { value: ... }`, `IpAddress.V6 { value: ... }` |
| `Port` | A port number | `Port.fromU16(8080)`, or `Port.make(n)` to check a `usize` |
| `Endpoint` | An address and a port | `Endpoint.make(address, port)` |
| `Host` | A domain name, an IPv4 address or an IPv6 address | `Host.parse(b"example.com")` |

`Host.parse` takes a host as it appears in a URL: `example.com`, `127.0.0.1`, or an IPv6 address in brackets, `[::1]`. It accepts ASCII names only, so an internationalized name must already be in its `xn--` form. It rejects a port, a trailing dot, and spaces. Parsing and formatting allocate nothing; `formatInto` writes an address into a byte buffer you supply and returns the length.

## The program: resolving

`resolveHost` turns text into a `Host`, wraps it in a `ResolveRequest`, and asks the `Resolver` service:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ByteDuplex, ByteIoError, ReadTransfer }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.format { Format }
import silk.host_input { HostInput, HostInputError }
import silk.monotonic_clock { MonotonicClock }
import silk.native_resolver { NativeSystemResolver }
import silk.native_socket { AcceptedView, AttemptFailure, ConnectOptions, ListenOptions, Listener, NativeSocketError, accept, connectResolvedOwned, listen, withAccepted, withListener }
import silk.network_address { Endpoint, Host, IpAddress, Ipv4Address, Port }
import silk.option { Option }
import silk.os_monotonic_clock { OsMonotonicClock }
import silk.os_writer { StdoutWriter }
import silk.resolver { FamilySelection, ResolveRequest, ResolvedEndpoints, Resolver, ResolverError }
import silk.result { Result }
import silk.slice { Slice }
import silk.system_clock { Instant }
import silk.u8
import silk.u32
import silk.writer { Writer, WriterError }

pub struct UsageError {}
pub struct BadHost {}

// ---------------------------------------------------------------------------
// Resolving: a host name or numeric address to a list of endpoints.

effect fn resolveHost(name: &[u8], port: u16) -> ResolvedEndpoints
! BadHost | ResolverError | OutOfMemoryError
? &mut Resolver | &mut MonotonicClock | &mut Allocator {
  let host = match move Host.parse(name) {
    Result.Success { value } => move value
    Result.Failure { .. } => { fail BadHost {} }
  }
  let request = match move ResolveRequest.make(move host, Port.fromU16(port), FamilySelection.Any, 8, Option<Instant>.none()) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail move error }
  }
  return run Resolver.resolve(&request)
}

effect fn printEndpoints(endpoints: &ResolvedEndpoints) -> () ! WriterError ? &mut Writer {
  let mut index: usize = 0
  while index < endpoints.length() {
    let endpoint = endpoints.get(index)
    let mut text: [u8; 64] = [0; 64]
    let address = endpoint.address()
    match move address.formatInto(&mut text) {
      Result.Success { value } => {
        run Writer.writeAll(Slice.view(&text, 0, value))
        run Writer.writeAll(b"\n")
      }
      Result.Failure { .. } => run Writer.writeAll(b"(unprintable)\n")
    }
    index = index + 1
  }
}
```

`ResolveRequest.make(host, port, family, maxResults, deadline)` says what you want: the port to put in every endpoint, `FamilySelection.Any`, `V4` or `V6`, and at most how many results (here 8). A numeric host never reaches the provider; `Resolver.resolve` answers it directly. A domain goes to whichever provider `main` supplies.

`NativeSystemResolver` from `silk/native_resolver` is the native provider. It calls the operating system's `getaddrinfo`, which blocks the thread until it returns and cannot be cancelled. For that reason it refuses a request that carries a deadline, with `ResolverError.DeadlineUnsupported`, before doing any work. Pass `Option<Instant>.none()` as here. Because the call blocks the whole thread, a fiber-based timeout such as the one in the Concurrent I/O patterns guide cannot cut it short either. If lookups must be bounded, supply a different `Resolver` provider.

## Sending

A socket is used through `ByteDuplex`. Its operations move part of a buffer and tell you how much:

| Operation | Does |
| --- | --- |
| `ByteDuplex.readSome(buffer, deadline)` | Reads at least one byte into `buffer`; returns `ReadTransfer.Data { count }`, or `ReadTransfer.End` when the peer has finished sending |
| `ByteDuplex.writeSome(bytes, deadline)` | Writes a prefix of `bytes` and returns its length |
| `ByteDuplex.flush(deadline)` | Hands buffered output to the kernel |
| `ByteDuplex.shutdownWrite(deadline)` | Flushes, then tells the peer you will send nothing more; you can still read |
| `ByteDuplex.close()` | Closes both directions |

A partial write is normal, so `writeAll` loops until every byte is accepted. `readAll` loops until `End`.

```silk
// ---------------------------------------------------------------------------
// Sending: connect, write the whole message, half-close, read the whole reply.

effect fn writeAll(input: &[u8], deadline: &Instant) -> () ! ByteIoError ? &mut ByteDuplex | &mut MonotonicClock {
  let mut offset: usize = 0
  while offset < input.length {
    offset = offset + run ByteDuplex.writeSome(Slice.view(input, offset, input.length - offset), Option<Instant>.some(copy(deadline)))
  }
}

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

effect fn exchange(message: &[u8], deadline: &Instant) -> Bytes ! ByteIoError | OutOfMemoryError ? &mut ByteDuplex | &mut MonotonicClock | &mut Allocator {
  run writeAll(message, deadline)
  run ByteDuplex.shutdownWrite(Option<Instant>.some(copy(deadline)))
  return run readAll(deadline)
}

fn copy(instant: &Instant) -> Instant {
  return MonotonicClock.deadlineAfter(instant, 0)
}

effect fn send(endpoints: &ResolvedEndpoints, message: &[u8]) -> Bytes
! NativeSocketError | ByteIoError | OutOfMemoryError
? &mut MonotonicClock | &mut Allocator {
  // One deadline, three seconds from now, covers connecting, writing and reading.
  let now = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&now, 3000000000)
  let mut connection = run connectResolvedOwned(endpoints.asSlice(), ConnectOptions.defaults(), Option<Instant>.some(copy(&deadline)))
  let reply = run Effect.result(exchange(message, &deadline) |> Effect.provideMut<ByteDuplex>(&mut connection))
  drop run Effect.result(connection.close())
  return match move reply {
    Result.Success { value } => move value
    Result.Failure { error } => match move error {
      ByteIoError failure => { fail move failure }
      OutOfMemoryError exhausted => { fail move exhausted }
    }
  }
}
```

`connectResolvedOwned` takes the endpoints from the resolver and tries them in order until one connects. It returns a `Connection`, which is a `ByteDuplex` provider: `Effect.provideMut<ByteDuplex>(&mut connection)` lends it to `exchange`. `exchange` never mentions sockets, so it would run unchanged over any other `ByteDuplex`, such as the in-memory one in the Byte streams and buffering guide.

`connectResolved` is the scoped variant. It takes a callback, lends the connection to it, and closes the connection when the callback returns. Use the owned form, as here, when you close the connection yourself.

Every operation takes a deadline: an absolute `Instant` on the `MonotonicClock`, or `none()` to wait forever. Make one with `MonotonicClock.deadlineAfter(&now, nanoseconds)`. `send` computes one deadline and passes it to every step, so the whole exchange, connecting included, takes at most three seconds. `Instant` is not `Copy`, so the small `copy` helper makes a fresh one for each call.

The sockets are nonblocking. While an operation waits, it sleeps on the `MonotonicClock` and checks again every millisecond (the poll interval in `ConnectOptions` and `ListenOptions`). Under the fiber scheduler, that wait parks only the current fiber.

## Serving

`listen` binds a listening socket. `accept` waits for one connection, and `withAccepted` lends it, with the peer's address, to a callback and closes it afterwards. `withListener` does the same for the listener:

```silk
// ---------------------------------------------------------------------------
// Serving: accept one connection, read the message, answer it in capitals.

fn upper(bytes: &mut [u8]) -> () {
  let mut index: usize = 0
  while index < bytes.length {
    if bytes[index] >= 97 && bytes[index] <= 122 {
      bytes[index] = bytes[index] - 32
    }
    index = index + 1
  }
}

effect fn shout() -> () ! ByteIoError | OutOfMemoryError ? &mut ByteDuplex | &mut MonotonicClock | &mut Allocator {
  let now = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&now, 3000000000)
  let mut message = run readAll(&deadline)
  upper(Bytes.asMutSlice(&mut message))
  run writeAll(Bytes.asSlice(&message), &deadline)
  run ByteDuplex.shutdownWrite(Option<Instant>.some(copy(&deadline)))
}

effect<'call> fn serveOne<'call>(view: &'call mut AcceptedView<'call>) -> () ! ByteIoError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  run shout() |> Effect.provideMut<ByteDuplex>(&mut view.connection.*)
}

effect fn acceptOne(listener: &mut Listener) -> () ! NativeSocketError | ByteIoError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  let accepted = run accept(&mut listener.*, Option<Instant>.none())
  run withAccepted(move accepted, serveOne)
}

effect fn serve(port: u16) -> () ! NativeSocketError | ByteIoError | OutOfMemoryError ? &mut MonotonicClock | &mut Allocator {
  let endpoint = Endpoint.make(IpAddress.V4 { value: Ipv4Address.fromOctets([127, 0, 0, 1]) }, Port.fromU16(port))
  let listener = run listen(endpoint, ListenOptions.defaults())
  run withListener(move listener, acceptOne)
}
```

`ListenOptions.defaults()` sets a backlog of 128, leaves address reuse off, and polls every millisecond. Use `ListenOptions.make(backlog, true, pollNanoseconds)` to turn reuse on, so a restarted server can bind the port again at once. `listenUnix` and `connectUnixOwned` do the same for Unix domain sockets, given a path.

## The command line

The rest of the program reads the arguments, runs one command, and turns every failure into one line:

```silk
// ---------------------------------------------------------------------------
// Command line: ask resolve <host> | ask serve <port> | ask send <host> <port> <message>

effect fn argument(index: usize) -> Bytes ! UsageError | HostInputError | OutOfMemoryError ? &mut HostInput | &mut Allocator {
  return match move run HostInput.argument(index) {
    Option.Some { value } => move value
    Option.None => { fail UsageError {} }
  }
}

fn portOf(text: &[u8]) -> Option<u16> {
  if text.length == 0 || text.length > 5 {
    return Option<u16>.none()
  }
  let mut value: u32 = 0
  let mut index: usize = 0
  while index < text.length {
    if text[index] < 48 || text[index] > 57 {
      return Option<u16>.none()
    }
    value = value * 10 + u8.toU32(text[index] - 48)
    index = index + 1
  }
  if value > 65535 {
    return Option<u16>.none()
  }
  return Option<u16>.some(u32.toU16(value))
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
! UsageError | BadHost | ResolverError | NativeSocketError | ByteIoError | HostInputError | WriterError | OutOfMemoryError
? &mut HostInput | &mut Resolver | &mut Writer | &mut MonotonicClock | &mut Allocator {
  let verb = run argument(1)
  if same(Bytes.asSlice(&verb), b"resolve") {
    let name = run argument(2)
    let endpoints = run resolveHost(Bytes.asSlice(&name), 0)
    run printEndpoints(&endpoints)
    return ()
  }
  if same(Bytes.asSlice(&verb), b"serve") {
    let port = run argument(2)
    match portOf(Bytes.asSlice(&port)) {
      Option.Some { value } => run serve(value)
      Option.None => { fail UsageError {} }
    }
    return ()
  }
  if same(Bytes.asSlice(&verb), b"send") {
    let name = run argument(2)
    let port = run argument(3)
    let message = run argument(4)
    let number = match portOf(Bytes.asSlice(&port)) {
      Option.Some { value } => value
      Option.None => { fail UsageError {} }
    }
    let endpoints = run resolveHost(Bytes.asSlice(&name), number)
    let reply = run send(&endpoints, Bytes.asSlice(&message))
    run Writer.writeAll(Bytes.asSlice(&reply))
    run Writer.writeAll(b"\n")
    return ()
  }
  fail UsageError {}
}

// Turns each failure into one line of text.
effect fn report(error: UsageError | BadHost | ResolverError | NativeSocketError | ByteIoError | HostInputError | WriterError | OutOfMemoryError) -> i32 ! WriterError ? &mut Writer {
  let message = match move error {
    UsageError _ => "usage: ask resolve <host> | ask serve <port> | ask send <host> <port> <message>"
    BadHost _ => "that is not a host name or IP address"
    ResolverError failure => match move failure {
      ResolverError.NameNotFound => "no such host"
      _ => "the host could not be resolved"
    }
    NativeSocketError failure => match move failure {
      NativeSocketError.AttemptsExhausted { last: AttemptFailure.ConnectionRefused, .. } => "the connection was refused"
      NativeSocketError.AttemptsExhausted { .. } => "no address accepted the connection"
      NativeSocketError.AddressInUse => "the port is already in use"
      NativeSocketError.Timeout => "the deadline passed while connecting"
      _ => "the socket failed"
    }
    ByteIoError failure => match move failure {
      ByteIoError.Timeout { .. } => "the deadline passed while talking"
      _ => "the connection failed"
    }
    HostInputError _ => "could not read the arguments"
    WriterError failure => { fail move failure }
    OutOfMemoryError _ => "out of memory"
  }
  run Format.format("ask: {message}\n", &.{ message: message })
  return 1
}

pub effect fn main() -> i32 ! WriterError ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut resolver = NativeSystemResolver.make()
  let mut writer = StdoutWriter.make()
  let mut clock = OsMonotonicClock.make()
  let outcome = run Effect.result(command())
    |> Effect.provideMut<Resolver>(&mut resolver)
    |> Effect.provideMut<Writer>(&mut writer)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move outcome {
    Result.Success { .. } => 0
    Result.Failure { error } => run report(move error) |> Effect.provideMut<Writer>(&mut writer)
  }
}
```

`report` shows how the failures are shaped. A refused connection is not a plain `ConnectionRefused`: `connectResolvedOwned` tries every endpoint, so it reports `AttemptsExhausted`, with the last attempt's failure in `last`. A deadline that passes while connecting is `NativeSocketError.Timeout`; one that passes while reading or writing is `ByteIoError.Timeout`.

## Try it

Build, then resolve a few names:

```sh
silk build
./build/llvm/x86_64-unknown-linux-gnu/debug/ask resolve example.com
```

```
172.66.147.243
104.20.23.154
```

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/ask resolve '[::1]'
./build/llvm/x86_64-unknown-linux-gnu/debug/ask resolve ::1
./build/llvm/x86_64-unknown-linux-gnu/debug/ask resolve no-such-host.invalid
```

```
::1
ask: that is not a host name or IP address
ask: no such host
```

The addresses you see for `example.com` depend on your network. Now start the server in the background and send it a message:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/ask serve 7070 &
./build/llvm/x86_64-unknown-linux-gnu/debug/ask send 127.0.0.1 7070 'hello over tcp'
```

```
HELLO OVER TCP
```

The server handled its one connection and exited, so a second send finds nothing listening:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/ask send 127.0.0.1 7070 again
```

```
ask: the connection was refused
```

Last, point `ask send` at a server that accepts connections and never answers. Any will do; a few lines of Python that call `listen` and `accept` and then sleep are enough. After three seconds:

```
ask: the deadline passed while talking
```

The connection itself succeeded, because the kernel accepts it on the server's behalf. It was the read that ran out of time.

## API reference

- `silk/network_address`: `Host`, `IpAddress`, `Ipv4Address`, `Ipv6Address`, `Port`, `Endpoint`
- `silk/resolver`: `Resolver`, `ResolveRequest`, `ResolvedEndpoints`, `FamilySelection`, `ResolverError`
- `silk/native_resolver`: `NativeSystemResolver`
- `silk/native_socket`: `listen`, `accept`, `withListener`, `withAccepted`, `connectResolved`, `connectResolvedOwned`, `ConnectOptions`, `ListenOptions`, `Connection`, `NativeSocketError`
- `silk/byte_duplex`: `ByteDuplex`, `ReadTransfer`, `ByteIoError`
- `silk/monotonic_clock`: `MonotonicClock`
