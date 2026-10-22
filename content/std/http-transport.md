The byte transport under an HTTP connection: plain bytes or TLS.

## When to use
`silk.http_exchange` reads and writes through the [`HttpTransport`](#HttpTransport) service. Use [`plain`](#plain) to
use a byte duplex, such as a TCP socket, as the transport. Use [`secured`](#secured) to use a TLS
connection. Implement [`HttpTransport`](#HttpTransport) yourself for a custom transport, for example in tests.

## Details
[`plain`](#plain), [`secured`](#secured), and [`borrow`](#borrow) borrow a provider. They do not allocate or do I/O. The
caller keeps ownership of the provider.

[`HttpTransport.readSome`](#HttpTransport.impl.readSome) and [`HttpTransport.writeSome`](#HttpTransport.impl.writeSome) check the counts of the provider. A
count of zero, or more than the buffer, closes the transport and fails. An empty buffer returns
zero at once, and does not call the provider.

Each operation gets an absolute deadline, and passes it to the provider unchanged.

## Errors
[`TransportError`](#TransportError) keeps the original error: `Plain` for a byte duplex error, `Secured` for a
TLS error.

## Gotchas
- `close` closes the provider: the socket for [`plain`](#plain), the TLS connection for [`secured`](#secured). It
  does not flush. A second call does nothing.
- After `close`, each read, write, or flush fails with a `Closed` error.

## Examples
### Write and read over a memory duplex
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.byte_duplex { ReadTransfer }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.http_transport { HttpTransport, TransportError, plain }
import silk.list { List }
import silk.memory_byte_duplex {
  MemoryByteDuplex,
  MemoryReadEvent,
  MemoryWriteAction,
  MemoryWriteEvent
}
import silk.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.random { Random }
import silk.result { Result }
import silk.system_clock { Instant, SystemClock }
import silk.u64

struct FixedClock {}

impl MonotonicClock for FixedClock {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }

  effect fn waitUntil(self: &mut Self, when: Instant) -> () {
    drop when
    return ()
  }

  effect fn waitFor(self: &mut Self, howLong: u64) -> () {
    drop howLong
    return ()
  }
}

struct ZeroRandom {}

impl Random for ZeroRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    drop output
    return ()
  }
}

// Writes a ping, reads the reply, and closes the transport.
effect fn exchange() -> i32
  ! TransportError | OutOfMemoryError
  ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random {
  let written = run HttpTransport.writeSome(b"ping", Option<Instant>.none())
  if written != 4 {
    return 1
  }
  run HttpTransport.flush(Option<Instant>.none())
  let mut reply: [u8; 8] = [0; 8]
  let count = match run HttpTransport.readSome(&mut reply, Option<Instant>.none()) {
    ReadTransfer.Data { count } => count
    ReadTransfer.End => {
      return 1
    }
  }
  if count != 4 || reply[0] != 112 {
    return 1
  }
  run HttpTransport.close()

  // A second close does nothing.
  run HttpTransport.close()
  return 0
}

effect fn program() -> i32
  ! TransportError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random {
  let reply = run Bytes.copy(b"pong")
  let mut reads = List<MemoryReadEvent>.make()
  run List.append(
    &mut reads,
    MemoryReadEvent.Data { readyAt: SystemClock.make(0, 0), bytes: move reply }
  )
  let mut writes = List<MemoryWriteEvent>.make()
  run List.append(
    &mut writes,
    MemoryWriteEvent {
      readyAt: SystemClock.make(0, 0),
      action: MemoryWriteAction.Accept { count: 64 }
    },
  )
  let mut memory = run MemoryByteDuplex.make(move reads, move writes, 64, 8, Option<i32>.none())
  let mut transport = plain(&mut memory)
  let result = run exchange() |> Effect.provideMut<HttpTransport>(&mut transport)
  drop transport
  if MemoryByteDuplex.closeAttempts(&memory) != 1 {
    return 1
  }
  return result
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut clock = FixedClock {}
  let mut random = ZeroRandom {}
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `HttpTransport` with `import silk.http_transport { HttpTransport }`.

Public declarations: 8.

::Anchor{id="TransportError"}

## `TransportError`

```silk
pub union TransportError
```

The error of a transport operation, with its original cause.

::Anchor{id="TransportError.Plain"}

### `Plain`

```silk
Plain
```

The byte duplex failed.

::Anchor{id="TransportError.Plain.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The error of the byte duplex.

::Anchor{id="TransportError.Secured"}

### `Secured`

```silk
Secured
```

The TLS connection failed.

::Anchor{id="TransportError.Secured.error"}

#### Field `error`

```silk
pub error: ConnectionError
```

The error of the TLS connection.

::Anchor{id="HttpTransport"}

## `HttpTransport`

```silk
pub service HttpTransport
```

Reads and writes the bytes of an HTTP connection.

Call [`HttpTransport.readSome`](#HttpTransport.impl.readSome) and [`HttpTransport.writeSome`](#HttpTransport.impl.writeSome), not the raw operations.

::Anchor{id="HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
unsafe effect fn readSomeRaw(output: &mut [u8], deadline: Option<Instant>) -> ReadTransfer ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads bytes from the provider into `output`. It is unsafe because it does not check the count.
Use [`HttpTransport.readSome`](#HttpTransport.impl.readSome).

::Anchor{id="HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
unsafe effect fn writeSomeRaw(input: &[u8], deadline: Option<Instant>) -> usize ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Writes bytes from `input` to the provider. It is unsafe because it does not check the count.
Use [`HttpTransport.writeSome`](#HttpTransport.impl.writeSome).

::Anchor{id="HttpTransport.flush"}

### Operation `flush`

```silk
effect fn flush(deadline: Option<Instant>) -> () ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends all bytes that writes accepted to the provider.

::Anchor{id="HttpTransport.close"}

### Operation `close`

```silk
effect fn close() -> () ! TransportError ? &mut HttpTransport with Intrinsic.nonParking()
```

Closes the transport without waiting. A second call does nothing.

::Anchor{id="HttpTransport.impl"}

## Implementation `HttpTransport`

```silk
impl HttpTransport
```

::Anchor{id="HttpTransport.impl.readSome"}

### Associated function `readSome`

```silk
pub effect fn readSome(output: &mut [u8], deadline: Option<Instant>) -> ReadTransfer
  ! TransportError | OutOfMemoryError
  ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads at least one byte into the start of `output`, or returns `End`.

If `output` is empty, it returns zero bytes at once. If the provider reports zero bytes, or
more than `output.length`, the transport is closed and the read fails.

::Anchor{id="HttpTransport.impl.writeSome"}

### Associated function `writeSome`

```silk
pub effect fn writeSome(input: &[u8], deadline: Option<Instant>) -> usize
  ! TransportError | OutOfMemoryError
  ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Writes at least one byte from the start of `input`, and returns the count.

The count can be less than `input.length`. If `input` is empty, it returns zero at once. If
the provider reports zero, or more than `input.length`, the transport is closed and the write
fails.

::Anchor{id="Plain"}

## `Plain`

```silk
pub struct Plain<'provider, P>
```

A transport over a byte duplex. Make it with [`plain`](#plain).

::Anchor{id="Secured"}

## `Secured`

```silk
pub struct Secured<'provider, P>
```

A transport over a TLS connection. Make it with [`secured`](#secured).

::Anchor{id="plain"}

## `plain`

```silk
pub fn plain<'provider, P>(provider: &'provider mut P) -> Plain<'provider, P>
```

Uses the byte duplex `provider` as a transport. It does not allocate or do I/O.

::Anchor{id="secured"}

## `secured`

```silk
pub fn secured<'provider, P>(provider: &'provider mut OwnedConnection<P>) -> Secured<'provider, P>
```

Uses the TLS connection `provider` as a transport. It does not allocate or do I/O.

::Anchor{id="Plain.impl"}

## Implementation `Plain<'provider, P>`

```silk
impl<'provider, P> Plain<'provider, P>
```

::Anchor{id="Plain.impl.HttpTransport"}

## Implementation `HttpTransport for Plain<'provider, P>`

```silk
impl<'provider, P> HttpTransport for Plain<'provider, P>
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

::Anchor{id="Plain.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: Plain.read
```

::Anchor{id="Plain.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: Plain.write
```

::Anchor{id="Plain.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: Plain.flushOutput
```

::Anchor{id="Plain.impl.HttpTransport.close"}

### Operation `close`

```silk
close: Plain.closeLease
```

::Anchor{id="Secured.impl"}

## Implementation `Secured<'provider, P>`

```silk
impl<'provider, P> Secured<'provider, P>
```

::Anchor{id="Secured.impl.HttpTransport"}

## Implementation `HttpTransport for Secured<'provider, P>`

```silk
impl<'provider, P> HttpTransport for Secured<'provider, P>
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

::Anchor{id="Secured.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: Secured.read
```

::Anchor{id="Secured.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: Secured.write
```

::Anchor{id="Secured.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: Secured.flushOutput
```

::Anchor{id="Secured.impl.HttpTransport.close"}

### Operation `close`

```silk
close: Secured.closeLease
```

::Anchor{id="Loan"}

## `Loan`

```silk
pub struct Loan<'provider, P>
```

A transport that borrows another transport. Make it with [`borrow`](#borrow).

Closing the loan closes the transport that it borrows.

::Anchor{id="borrow"}

## `borrow`

```silk
pub fn borrow<'provider, P>(provider: &'provider mut P) -> Loan<'provider, P>
```

Borrows the transport `provider` as a [`Loan`](#Loan). It does not allocate or do I/O.

::Anchor{id="Loan.impl"}

## Implementation `Loan<'provider, P>`

```silk
impl<'provider, P> Loan<'provider, P>
```

::Anchor{id="Loan.impl.HttpTransport"}

## Implementation `HttpTransport for Loan<'provider, P>`

```silk
impl<'provider, P> HttpTransport for Loan<'provider, P>
where
  &mut P provides &HttpTransport from &mut HttpTransport,
  &mut P provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

::Anchor{id="Loan.impl.HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: Loan.read
```

::Anchor{id="Loan.impl.HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: Loan.write
```

::Anchor{id="Loan.impl.HttpTransport.flush"}

### Operation `flush`

```silk
flush: Loan.flushOutput
```

::Anchor{id="Loan.impl.HttpTransport.close"}

### Operation `close`

```silk
close: Loan.closeLease
```

::Anchor{id="Loan.impl.ByteDuplex"}

## Implementation `ByteDuplex for Loan<'provider, P>`

```silk
impl<'provider, P> ByteDuplex for Loan<'provider, P>
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock
```

::Anchor{id="Loan.impl.ByteDuplex.readSomeRaw"}

### Operation `readSomeRaw`

```silk
readSomeRaw: Loan.readBytes
```

::Anchor{id="Loan.impl.ByteDuplex.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
writeSomeRaw: Loan.writeBytes
```

::Anchor{id="Loan.impl.ByteDuplex.flushRaw"}

### Operation `flushRaw`

```silk
flushRaw: Loan.flushBytes
```

::Anchor{id="Loan.impl.ByteDuplex.shutdownWriteRaw"}

### Operation `shutdownWriteRaw`

```silk
shutdownWriteRaw: Loan.shutdownBytes
```

::Anchor{id="Loan.impl.ByteDuplex.closeRaw"}

### Operation `closeRaw`

```silk
closeRaw: Loan.closeBytes
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
