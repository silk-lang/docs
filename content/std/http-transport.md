Rich HTTP byte transport adapters that retain the exact plain or authenticated TLS provider.

## Details

`plain` and `secured` borrow one concrete provider exclusively. The outer owner retains physical
resource ownership. `close` terminally closes the logical lease without a flush or TLS shutdown.

Import as `HttpTransport` with `import silk.http_transport { HttpTransport }`.

Public declarations: 8.

::Anchor{id="TransportError"}

## `TransportError`

```silk
pub union TransportError
```

A transport failure with its original structured cause.

::Anchor{id="TransportError.Plain"}

### `Plain`

```silk
Plain
```

A failure from the plain byte provider.

::Anchor{id="TransportError.Plain.error"}

#### Field `error`

```silk
pub error: ByteIoError
```

The original byte operation failure.

::Anchor{id="TransportError.Secured"}

### `Secured`

```silk
Secured
```

A failure from the authenticated TLS connection.

::Anchor{id="TransportError.Secured.error"}

#### Field `error`

```silk
pub error: ConnectionError
```

The original TLS connection failure.

::Anchor{id="HttpTransport"}

## `HttpTransport`

```silk
pub service HttpTransport
```

Partial HTTP byte transfers with unchanged absolute deadlines and rich failure causes.

::Anchor{id="HttpTransport.readSomeRaw"}

### Operation `readSomeRaw`

```silk
unsafe effect fn readSomeRaw(output: &mut [u8], deadline: Option<Instant>) -> ReadTransfer ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Performs one provider read before canonical transfer-count validation.

::Anchor{id="HttpTransport.writeSomeRaw"}

### Operation `writeSomeRaw`

```silk
unsafe effect fn writeSomeRaw(input: &[u8], deadline: Option<Instant>) -> usize ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Performs one provider write before canonical transfer-count validation.

::Anchor{id="HttpTransport.flush"}

### Operation `flush`

```silk
effect fn flush(deadline: Option<Instant>) -> () ! TransportError | OutOfMemoryError ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Flushes accepted bytes to the provider boundary.

::Anchor{id="HttpTransport.close"}

### Operation `close`

```silk
effect fn close() -> () ! TransportError ? &mut HttpTransport with Intrinsic.nonParking()
```

Closes the logical lease without parking; repeated calls complete locally.

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

Reads one validated positive prefix or transport end; empty output completes locally.

::Anchor{id="HttpTransport.impl.writeSome"}

### Associated function `writeSome`

```silk
pub effect fn writeSome(input: &[u8], deadline: Option<Instant>) -> usize
  ! TransportError | OutOfMemoryError
  ? &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random
```

Writes one validated positive prefix; empty input completes locally.

::Anchor{id="Plain"}

## `Plain`

```silk
pub struct Plain<'provider, P>
```

An exclusive borrowed plain byte provider with terminal close state.

::Anchor{id="Secured"}

## `Secured`

```silk
pub struct Secured<'provider, P>
```

An exclusive borrowed authenticated TLS connection with terminal close state.

::Anchor{id="plain"}

## `plain`

```silk
pub fn plain<'provider, P>(provider: &'provider mut P) -> Plain<'provider, P>
```

Borrows one exact plain provider without allocation or I/O.

::Anchor{id="secured"}

## `secured`

```silk
pub fn secured<'provider, P>(provider: &'provider mut OwnedConnection<P>) -> Secured<'provider, P>
```

Borrows one exact authenticated connection without allocation or I/O.

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

An exclusive logical loan of one exact HTTP transport provider.

::Anchor{id="borrow"}

## `borrow`

```silk
pub fn borrow<'provider, P>(provider: &'provider mut P) -> Loan<'provider, P>
```

Borrows one HTTP provider for a scoped owned client session without allocation.

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
