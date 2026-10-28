An authenticated TLS 1.3 connection over a `ByteDuplex` transport, with timeouts and close
handling.

## When to use
Use [`withClient`](#withClient) to authenticate a server, use the connection inside a callback, and close it
when the callback returns. Use [`authenticateOwned`](#authenticateOwned) when the connection must live longer than
one scope, for example in a connection pool. Then you must call [`OwnedConnection.close`](#OwnedConnection.impl.close). Load
the trust snapshot before you call either one.

## Details
Authentication reads the wall clock one time for certificate dates, makes a `Client`, and runs
the handshake over the transport. [`ConnectionOptions`](#ConnectionOptions) sets the handshake timeout, and an
optional external deadline. You get the connection only after authentication succeeds. Then use
[`OwnedConnection.readSome`](#OwnedConnection.impl.readSome), [`OwnedConnection.writeSome`](#OwnedConnection.impl.writeSome), and [`OwnedConnection.flush`](#OwnedConnection.impl.flush).

## Errors
- [`ConnectionError`](#ConnectionError) for a TLS failure, a transport failure, or a timeout.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
After an I/O error or a cancellation, the connection closes its transport, so that no partial
buffer is sent again. [`OwnedConnection.shutdownWrite`](#OwnedConnection.impl.shutdownWrite) sends `close_notify` and closes the
write direction. [`OwnedConnection.close`](#OwnedConnection.impl.close) closes at once, without `close_notify`.
[`withClient`](#withClient) ignores errors from its own close, so that they do not hide the result of the
callback.

## Examples
### Connect every dependency
This example gives the client no server bytes and no trust, so the handshake fails. A real
program provides a network transport, the system clocks, a secure `Random`, and loaded trust in
the same places.

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.tls.https_identity { HttpsIdentity, OriginHost, ReferenceIdentity }
import silk.io.memory_byte_duplex { MemoryByteDuplex, MemoryReadEvent, MemoryWriteEvent }
import silk.system.monotonic_clock { MonotonicClock }
import silk.option { Option }
import silk.system.random { Random }
import silk.core.result { Result }
import silk.system.system_clock { Instant, SystemClock }
import silk.tls.client { AlpnConfig, ClientConfig, ClientLimits }
import silk.tls.connection { OwnedConnection, ConnectionOptions, withClient }
import silk.tls.trust_anchor { TrustAnchor }
import silk.tls.trust_snapshot { SnapshotLimits, TrustSnapshot }
import silk.num.u64
import silk.num.usize
import silk.collections.list { List }

struct FixedWall {}

impl SystemClock for FixedWall {
  effect fn now(self: &mut Self) -> Instant {
    return SystemClock.make(0, 0)
  }

  effect fn getResolution(self: &mut Self) -> u64 {
    return u64.toU64(1)
  }
}

struct FixedMonotonic {}

impl MonotonicClock for FixedMonotonic {
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

struct ExampleRandom {}

impl Random for ExampleRandom {
  effect fn fillBytes(self: &mut Self, output: &mut [u8]) -> () {
    let mut index = usize.ZERO
    while index < output.length {
      output[index] = 1
      index = index + usize.ONE
    }
    return ()
  }
}

fn reference<'a>(host: &'a [u8]) -> ReferenceIdentity<'a> {
  return match move HttpsIdentity.reference(OriginHost<'a>.Dns { bytes: host }) {
    Result.Success { value } => value
    Result.Failure { error } => {
      Intrinsic.trap("unexpected failure")
      return reference(host)
    }
  }
}

fn emptyTrust() -> TrustSnapshot {
  return match move TrustSnapshot.fromAnchors(
    List<TrustAnchor>.make(),
    SnapshotLimits { anchors: 0, encodedBytes: 0 },
  ) {
    Result.Success { value } => move value
    Result.Failure { error } => {
      Intrinsic.trap("unexpected failure")
      return emptyTrust()
    }
  }
}

effect fn inspect(connection: &mut OwnedConnection<MemoryByteDuplex>) -> i32 {
  // The handshake fails in this example, so reaching this point is unexpected.
  drop connection
  return 1
}

effect<'env> fn expected<E: 'env, 'env>(error: E) -> i32 {
  drop error
  return 0
}

effect<'env> fn failed<E: 'env, 'env>(error: E) -> i32 {
  drop error
  return 1
}

effect fn program() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let reads = List<MemoryReadEvent>.make()
  let writes = List<MemoryWriteEvent>.make()
  let mut transport = run MemoryByteDuplex.make(move reads, move writes, 256, 4, Option<i32>.none())
    |> Effect.provideMut<Allocator>(&mut allocator)
  let trust = emptyTrust()
  let mut wall = FixedWall {}
  let mut monotonic = FixedMonotonic {}
  let mut random = ExampleRandom {}
  let host = b"example.com"
  let config = ClientConfig {
    reference: reference(&host),
    alpn: AlpnConfig.defaults(),
    limits: ClientLimits.defaults(),
  }
  let attempt = withClient<i32, never>(
    move transport,
    &config,
    move trust,
    ConnectionOptions.defaults(),
    inspect,
  )
    |> Effect.provideMut<SystemClock>(&mut wall)
    |> Effect.provideMut<MonotonicClock>(&mut monotonic)
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Allocator>(&mut allocator)

  // Without server bytes, authentication fails as expected.
  return run Effect.catchAll(move attempt, expected)
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), failed)
}
```

Import as `OwnedConnection` with `import silk.tls.connection { OwnedConnection }`.

Public declarations: 6.

::Anchor{id="ConnectionPhase"}

## `ConnectionPhase`

```silk
pub enum ConnectionPhase
```

The state of an [`OwnedConnection`](#OwnedConnection). Read it with [`OwnedConnection.phase`](#OwnedConnection.impl.phase).

::Anchor{id="ConnectionPhase.Open"}

### `Open`

```silk
Open
```

You can read and write.

::Anchor{id="ConnectionPhase.PeerEnded"}

### `PeerEnded`

```silk
PeerEnded
```

The server sent `close_notify`. You can still read plaintext that is buffered.

::Anchor{id="ConnectionPhase.WriteShutdown"}

### `WriteShutdown`

```silk
WriteShutdown
```

You called [`OwnedConnection.shutdownWrite`](#OwnedConnection.impl.shutdownWrite). You can still read, but you cannot write.

::Anchor{id="ConnectionPhase.Invalid"}

### `Invalid`

```silk
Invalid
```

A TLS or transport error occurred. Later I/O fails. Call [`OwnedConnection.close`](#OwnedConnection.impl.close).

::Anchor{id="ConnectionPhase.Closed"}

### `Closed`

```silk
Closed
```

You called [`OwnedConnection.close`](#OwnedConnection.impl.close). All later I/O fails.

::Anchor{id="ConnectionError"}

## `ConnectionError`

```silk
pub union ConnectionError
```

The error from authentication and from connection I/O: a TLS failure, a transport failure, or a
timeout.

::Anchor{id="ConnectionError.Tls"}

### `Tls`

```silk
Tls
```

The TLS client rejected the server or the operation. After this error, the connection stays
failed.

::Anchor{id="ConnectionError.Tls.error"}

#### Field `error`

```silk
pub error: TlsError
```

The TLS error.

::Anchor{id="ConnectionError.Io"}

### `Io`

```silk
Io
```

The transport failed. During the handshake, a transport timeout becomes `HandshakeTimeout`.

::Anchor{id="ConnectionError.Io.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The transport error.

::Anchor{id="ConnectionError.HandshakeTimeout"}

### `HandshakeTimeout`

```silk
HandshakeTimeout
```

The handshake did not complete before its deadline.

::Anchor{id="ConnectionError.impl.Debug"}

## Implementation `Debug for ConnectionError`

```silk
impl Debug for ConnectionError
```

::Anchor{id="ConnectionError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `Tls { ... }`.

::Anchor{id="ConnectionOptions"}

## `ConnectionOptions`

```silk
pub struct ConnectionOptions
```

Timeouts for authentication: the handshake timeout and an optional external deadline. Start from
[`ConnectionOptions.defaults`](#ConnectionOptions.impl.defaults).

::Anchor{id="ConnectionOptions.handshakeTimeoutNanoseconds"}

### Field `handshakeTimeoutNanoseconds`

```silk
pub handshakeTimeoutNanoseconds: u64
```

The maximum duration of the handshake, in nanoseconds, measured with the `MonotonicClock`.

::Anchor{id="ConnectionOptions.externalDeadline"}

### Field `externalDeadline`

```silk
pub externalDeadline: Option<Instant>
```

An optional absolute deadline on the `MonotonicClock`. If it is earlier than the handshake
timeout, the handshake stops at this deadline.

::Anchor{id="ConnectionOptions.impl"}

## Implementation `ConnectionOptions`

```silk
impl ConnectionOptions
```

::Anchor{id="ConnectionOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> ConnectionOptions
```

Returns a 30-second handshake timeout and no external deadline.

::Anchor{id="OwnedConnection"}

## `OwnedConnection`

```silk
pub struct OwnedConnection<P>
```

An authenticated TLS client connection that owns its transport `P`.

Get one from [`authenticateOwned`](#authenticateOwned), or borrow one in the [`withClient`](#withClient) callback. All I/O
functions take an optional `deadline` on the `MonotonicClock`. Use `Option<Instant>.none()` to
wait without a limit. Use [`OwnedConnection.readSome`](#OwnedConnection.impl.readSome), [`OwnedConnection.writeSome`](#OwnedConnection.impl.writeSome), and
[`OwnedConnection.flush`](#OwnedConnection.impl.flush) for application data.

### Gotchas
After an I/O error or a cancellation, the connection closes its transport, so that no partial
buffer is sent again. [`OwnedConnection.shutdownWrite`](#OwnedConnection.impl.shutdownWrite) sends `close_notify` and closes the
write direction. [`OwnedConnection.close`](#OwnedConnection.impl.close) closes at once, without `close_notify`. You must call
[`OwnedConnection.close`](#OwnedConnection.impl.close) on a connection from [`authenticateOwned`](#authenticateOwned).

::Anchor{id="OwnedConnection.impl"}

## Implementation `OwnedConnection<P>`

```silk
impl<P> OwnedConnection<P>
```

::Anchor{id="OwnedConnection.impl.phase"}

### Method `phase`

```silk
pub fn phase(self: &Self) -> ConnectionPhase
```

Returns the current [`ConnectionPhase`](#ConnectionPhase).

::Anchor{id="OwnedConnection.impl.authentication"}

### Method `authentication`

```silk
pub fn authentication<'a>(self: &'a Self) -> Option<Authentication<'a>>
```

Returns the result of authentication: the cipher suite, the ALPN protocol, and the certificate
details.

::Anchor{id="OwnedConnection.impl.readSome"}

### Method `readSome`

```silk
pub effect fn readSome<'connection>(
    self: &'connection mut Self,
    output: &mut [u8],
    deadline: Option<Instant>,
  ) -> ReadTransfer
  ! ConnectionError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

Reads decrypted application data into `output`, and returns how many bytes it read.

#### Details
The function first sends TLS output that is waiting. It returns at least one byte, or the end
of input when the server sent `close_notify`.

#### Errors
- `Tls` with `TruncatedAfterAuthentication` if the transport ends without `close_notify`.
- `Tls` with `EmptyBuffer` if `output` is empty.
- `Io` if the transport fails or the `deadline` passes.

::Anchor{id="OwnedConnection.impl.writeSome"}

### Method `writeSome`

```silk
pub effect fn writeSome<'connection>(
    self: &'connection mut Self,
    input: &[u8],
    deadline: Option<Instant>,
  ) -> usize
  ! ConnectionError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

Encrypts and sends a prefix of `input`, and returns how many bytes it sent.

#### Details
One call encrypts at most one TLS record of 16384 bytes, and sends all of that record before
it returns. Call it again with the rest of `input`.

#### Errors
- `Tls` if the connection cannot write, for example after [`OwnedConnection.shutdownWrite`](#OwnedConnection.impl.shutdownWrite).
- `Io` if the transport fails, the server closed the connection, or the `deadline` passes.

::Anchor{id="OwnedConnection.impl.flush"}

### Method `flush`

```silk
pub effect fn flush<'connection>(self: &'connection mut Self, deadline: Option<Instant>) -> ()
  ! ConnectionError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends all TLS output that is waiting, then flushes the transport.

::Anchor{id="OwnedConnection.impl.shutdownWrite"}

### Method `shutdownWrite`

```silk
pub effect fn shutdownWrite<'connection>(self: &'connection mut Self, deadline: Option<Instant>) -> ()
  ! ConnectionError | OutOfMemoryError
  ? &mut MonotonicClock | &mut Allocator | &mut Random
  where
    &mut P provides &ByteDuplex from &mut ByteDuplex,
    &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

Sends `close_notify`, flushes, and closes the write direction of the transport.

You can still read the response of the server after this call. Call [`OwnedConnection.close`](#OwnedConnection.impl.close)
when you are done.

::Anchor{id="OwnedConnection.impl.close"}

### Method `close`

```silk
pub effect fn close(self: &mut Self) -> ()
  ! ConnectionError
  ? Without<&mut ByteDuplex, ByteDuplex>
  where &mut P provides &ByteDuplex from &mut ByteDuplex
```

Closes the transport at once, without `close_notify`.

#### Details
The phase becomes `Closed` before the transport is closed. A second call does nothing and
succeeds.

#### Errors
- `Io` if the transport fails to close. The connection stays closed.

::Anchor{id="authenticateOwned"}

## `authenticateOwned`

```silk
pub effect<'env> fn authenticateOwned<P: 'env, 'env>(
  provider: P,
  config: &ClientConfig,
  trust: TrustSnapshot,
  options: ConnectionOptions,
) -> OwnedConnection<P>
! ConnectionError | OutOfMemoryError
? &mut SystemClock | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random
```

Runs the TLS handshake over `provider`, and returns the authenticated connection.

### Details
The function reads the `SystemClock` one time to check certificate dates, and uses the
`MonotonicClock` for the timeouts in `options`. You own the result. Call
[`OwnedConnection.close`](#OwnedConnection.impl.close) when you are done.

### Errors
- [`ConnectionError`](#ConnectionError) if the handshake fails or times out. The function closes `provider` before
  it returns the error.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="withClient"}

## `withClient`

```silk
pub effect<'env> fn withClient<'env, A, E, ?CallbackRequirements, P: 'env>(
  provider: P,
  config: &'env ClientConfig,
  trust: TrustSnapshot,
  options: ConnectionOptions,
  callback: for<'call> once fn<'env>(&'call mut OwnedConnection<P>) -> once Effect<'call & 'env; A ! E ? CallbackRequirements>,
) -> A
! E | ConnectionError | OutOfMemoryError
? CallbackRequirements | &mut SystemClock | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut P provides &ByteDuplex from &mut ByteDuplex,
  &mut P provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  CallbackRequirements in Without<CallbackRequirements, ByteDuplex>
```

Runs the TLS handshake over `provider`, calls `callback` with the authenticated connection, and
then closes it.

### When to use
Use it to authenticate a server and use the connection inside one scope. Use
[`authenticateOwned`](#authenticateOwned) when the connection must live longer, for example in a connection pool.
Load the trust snapshot before you call it.

### Details
The function reads the `SystemClock` one time to check certificate dates, and uses the
`MonotonicClock` for the timeouts in `options`. /// The connection closes when the callback
returns, fails, or is cancelled. Errors from that close are ignored. Call
[`OwnedConnection.shutdownWrite`](#OwnedConnection.impl.shutdownWrite) in the callback to send `close_notify`.

### Errors
- `E` from the callback.
- [`ConnectionError`](#ConnectionError) if the handshake fails or times out.
- `OutOfMemoryError` if the `Allocator` fails.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
