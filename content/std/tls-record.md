Frame and protect TLS 1.3 records (RFC 8446, section 5) over a byte transport that you drive.

## When to use
Most programs use `silk.tls_connection` or `silk.tls_client`, which use this module. Use
[`TlsRecordSender`](#TlsRecordSender) and [`TlsRecordReceiver`](#TlsRecordReceiver) directly to build another TLS endpoint or a test
tool. The `makePlaintext` functions frame records without encryption, for the first handshake
messages. The `make` functions take a traffic secret and encrypt with the [`CipherSuite`](#CipherSuite).

## Details
Each direction allocates fixed buffers one time, when you make it. Later calls do not allocate
and do not keep your buffers. The sender holds at most one encoded record: write
[`TlsRecordSender.pendingOutput`](#TlsRecordSender.impl.pendingOutput) to the transport, and then call [`TlsRecordSender.ackWritten`](#TlsRecordSender.impl.ackWritten)
with the number of bytes that the transport took. The receiver takes input in pieces with
[`TlsRecordReceiver.feedInput`](#TlsRecordReceiver.impl.feedInput), and gives you one complete, authenticated record at a time. A
traffic key protects at most [`RECORDS_PER_EPOCH`](#RECORDS_PER_EPOCH) records.

## Errors
- [`RecordError`](#RecordError) for a wrong secret length, a call in the wrong state, a record that is too
  large or not valid, a record that fails authentication, or a key that is used up.
- `OutOfMemoryError` from the `make` functions if the `Allocator` fails.

## Gotchas
A traffic secret does not prove who the peer is. This module does not do the handshake, check
certificates, or decide when to send `close_notify`. An error from a peer record is permanent
for that receiver. Secrets are not erased.

## Examples
### Send a record and receive it
```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.result { Result }
import silk.tls_record {
  ContentType,
  InputDemand,
  InputProgress,
  OutputProgress,
  RecordError,
  TlsRecordReceiver,
  TlsRecordSender
}

pub effect fn main() -> i32
  ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut sender = run TlsRecordSender.makePlaintext()
    |> Effect.provideMut<Allocator>(&mut allocator)
  let mut receiver = run TlsRecordReceiver.makePlaintext()
    |> Effect.provideMut<Allocator>(&mut allocator)
  match TlsRecordSender.queueRecord(&mut sender, ContentType.Handshake, b"hello") {
    Result<OutputProgress, RecordError>.Success { value } => {
      if value.accepted != 5 {
        return 1
      }
    }
    Result<OutputProgress, RecordError>.Failure { error: _ } => {
      return 1
    }
  }

  // The wire bytes are a 5-byte record header and the content.
  let wire = TlsRecordSender.pendingOutput(&sender)
  let length = wire.length
  match TlsRecordReceiver.feedInput(&mut receiver, wire) {
    Result<InputProgress, RecordError>.Success { value } => {
      if value.consumed != 10 || value.demand != InputDemand.RecordReady {
        return 1
      }
    }
    Result<InputProgress, RecordError>.Failure { error: _ } => {
      return 1
    }
  }
  match TlsRecordSender.ackWritten(&mut sender, length) {
    Result<(), RecordError>.Success { value: _ } => {}
    Result<(), RecordError>.Failure { error: _ } => {
      return 1
    }
  }
  let mut content: [u8; 16] = [0; 16]
  return match TlsRecordReceiver.consumeRecordInto(&mut receiver, &mut content) {
    Result<usize, RecordError>.Success { value } => {
      if value != 5 || content[0] != 104 {
        return 1
      }
      return 0
    }
    Result<usize, RecordError>.Failure { error: _ } => 1
  }
}
```

Import as `TlsRecordSender` with `import silk.tls_record { TlsRecordSender }`.

Public declarations: 11.

::Anchor{id="RECORDS_PER_EPOCH"}

## `RECORDS_PER_EPOCH`

```silk
pub const RECORDS_PER_EPOCH: u64
```

The maximum number of records that one traffic key protects. After it, install a new key, for
example after a KeyUpdate.

::Anchor{id="CipherSuite"}

## `CipherSuite`

```silk
pub enum CipherSuite
```

A TLS 1.3 cipher suite that this module supports.

::Anchor{id="CipherSuite.Aes128GcmSha256"}

### `Aes128GcmSha256`

```silk
Aes128GcmSha256
```

`TLS_AES_128_GCM_SHA256`. Its traffic secrets are 32 bytes.

::Anchor{id="CipherSuite.Aes256GcmSha384"}

### `Aes256GcmSha384`

```silk
Aes256GcmSha384
```

`TLS_AES_256_GCM_SHA384`. Its traffic secrets are 48 bytes.

::Anchor{id="CipherSuite.ChaCha20Poly1305Sha256"}

### `ChaCha20Poly1305Sha256`

```silk
ChaCha20Poly1305Sha256
```

`TLS_CHACHA20_POLY1305_SHA256`. Its traffic secrets are 32 bytes.

::Anchor{id="ContentType"}

## `ContentType`

```silk
pub enum ContentType
```

The content type of a record.

::Anchor{id="ContentType.ChangeCipherSpec"}

### `ChangeCipherSpec`

```silk
ChangeCipherSpec
```

The `change_cipher_spec` record that TLS 1.3 sends only for middlebox compatibility. Only the
plaintext form, with the content `{1}`, is accepted.

::Anchor{id="ContentType.Alert"}

### `Alert`

```silk
Alert
```

An alert. The content is exactly 2 bytes.

::Anchor{id="ContentType.Handshake"}

### `Handshake`

```silk
Handshake
```

Handshake messages. The content is not empty.

::Anchor{id="ContentType.ApplicationData"}

### `ApplicationData`

```silk
ApplicationData
```

Application data. The content can be empty.

::Anchor{id="InputDemand"}

## `InputDemand`

```silk
pub enum InputDemand
```

What the receiver needs after [`TlsRecordReceiver.feedInput`](#TlsRecordReceiver.impl.feedInput).

::Anchor{id="InputDemand.NeedInput"}

### `NeedInput`

```silk
NeedInput
```

The record is not complete. Give more bytes.

::Anchor{id="InputDemand.RecordReady"}

### `RecordReady`

```silk
RecordReady
```

A record is complete. Read it, and then consume it.

::Anchor{id="InputDemand.NeedRecordConsumption"}

### `NeedRecordConsumption`

```silk
NeedRecordConsumption
```

A record was already ready, so no bytes were taken. Consume it first.

::Anchor{id="InputProgress"}

## `InputProgress`

```silk
pub struct InputProgress
```

The result of [`TlsRecordReceiver.feedInput`](#TlsRecordReceiver.impl.feedInput).

::Anchor{id="InputProgress.consumed"}

### Field `consumed`

```silk
pub consumed: usize
```

The number of input bytes that the receiver took. Give the rest again later.

::Anchor{id="InputProgress.demand"}

### Field `demand`

```silk
pub demand: InputDemand
```

What the receiver needs next.

::Anchor{id="OutputDemand"}

## `OutputDemand`

```silk
pub enum OutputDemand
```

What the sender needs after [`TlsRecordSender.queueRecord`](#TlsRecordSender.impl.queueRecord).

::Anchor{id="OutputDemand.RecordQueued"}

### `RecordQueued`

```silk
RecordQueued
```

A record is encoded. Write [`TlsRecordSender.pendingOutput`](#TlsRecordSender.impl.pendingOutput) to the transport.

::Anchor{id="OutputDemand.NeedOutput"}

### `NeedOutput`

```silk
NeedOutput
```

An earlier record is not fully written yet, so nothing was taken. Write and acknowledge it
first.

::Anchor{id="OutputProgress"}

## `OutputProgress`

```silk
pub struct OutputProgress
```

The result of [`TlsRecordSender.queueRecord`](#TlsRecordSender.impl.queueRecord).

::Anchor{id="OutputProgress.accepted"}

### Field `accepted`

```silk
pub accepted: usize
```

The number of content bytes in the queued record. At most 16384.

::Anchor{id="OutputProgress.demand"}

### Field `demand`

```silk
pub demand: OutputDemand
```

What the sender needs next.

::Anchor{id="RecordError"}

## `RecordError`

```silk
pub union RecordError
```

The reason that a record operation failed.

::Anchor{id="RecordError.InvalidSecretLength"}

### `InvalidSecretLength`

```silk
InvalidSecretLength
```

The traffic secret has the wrong length for the cipher suite.

::Anchor{id="RecordError.InvalidSecretLength.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The supplied byte length.

::Anchor{id="RecordError.InvalidSecretLength.expected"}

#### Field `expected`

```silk
pub expected: usize
```

The required byte length.

::Anchor{id="RecordError.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The call is not valid now, for example a feed while a record is ready, or any call after a
peer error.

::Anchor{id="RecordError.RecordOverflow"}

### `RecordOverflow`

```silk
RecordOverflow
```

A record, or the content to copy, is larger than the limit or the buffer.

::Anchor{id="RecordError.RecordOverflow.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The rejected length.

::Anchor{id="RecordError.RecordOverflow.maximum"}

#### Field `maximum`

```silk
pub maximum: usize
```

The largest admitted length.

::Anchor{id="RecordError.InvalidContent"}

### `InvalidContent`

```silk
InvalidContent
```

A content type, version, inner plaintext, or alert is not valid.

::Anchor{id="RecordError.AuthenticationFailed"}

### `AuthenticationFailed`

```silk
AuthenticationFailed
```

A protected record failed decryption. It was changed, or the key is wrong.

::Anchor{id="RecordError.InvalidAcknowledgment"}

### `InvalidAcknowledgment`

```silk
InvalidAcknowledgment
```

An acknowledgment is larger than the pending output.

::Anchor{id="RecordError.InvalidAcknowledgment.requested"}

#### Field `requested`

```silk
pub requested: usize
```

The requested acknowledgment count.

::Anchor{id="RecordError.InvalidAcknowledgment.pending"}

#### Field `pending`

```silk
pub pending: usize
```

The number of bytes currently pending.

::Anchor{id="RecordError.KeyUsageExhausted"}

### `KeyUsageExhausted`

```silk
KeyUsageExhausted
```

The traffic key protected [`RECORDS_PER_EPOCH`](#RECORDS_PER_EPOCH) records. Install a new key.

::Anchor{id="RecordError.impl.Debug"}

## Implementation `Debug for RecordError`

```silk
impl Debug for RecordError
```

::Anchor{id="RecordError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant and its fields, such as `InvalidSecretLength { ... }`.

::Anchor{id="RecordView"}

## `RecordView`

```silk
pub struct RecordView<'owner>
```

A complete record from a receiver. It borrows the receiver until you consume the record.

::Anchor{id="RecordView.contentType"}

### Field `contentType`

```silk
pub contentType: ContentType
```

The content type, after authentication.

::Anchor{id="RecordView.content"}

### Field `content`

```silk
pub content: &'owner [u8]
```

The content, without the header, the tag, the inner type, or the padding.

::Anchor{id="TlsRecordSender"}

## `TlsRecordSender`

```silk
pub struct TlsRecordSender
```

The send direction of a TLS record layer. It holds at most one encoded record.

Most programs use `silk.tls_connection` or `silk.tls_client`, which use the record layer. Use it
directly to build another TLS endpoint or a test tool. `makePlaintext` frames records without
encryption, for the first handshake messages. `make` takes a traffic secret and encrypts with
the [`CipherSuite`](#CipherSuite).

It allocates a fixed buffer one time, when you make it. Write
[`TlsRecordSender.pendingOutput`](#TlsRecordSender.impl.pendingOutput) to the transport, and then call
[`TlsRecordSender.ackWritten`](#TlsRecordSender.impl.ackWritten) with the number of bytes that the transport took. A traffic key
protects at most [`RECORDS_PER_EPOCH`](#RECORDS_PER_EPOCH) records.

The protected form derives the key and IV from the traffic secret and starts at sequence number
0. Records are not padded.

### Gotchas
There is no way to reset the sequence number. When the key is used up, install a new one with
[`TlsRecordSender.replaceEpoch`](#TlsRecordSender.impl.replaceEpoch).

::Anchor{id="TlsRecordSender.impl"}

## Implementation `TlsRecordSender`

```silk
impl TlsRecordSender
```

::Anchor{id="TlsRecordSender.impl.make"}

### Associated function `make`

```silk
pub effect fn make(
    suite: CipherSuite,
    trafficSecret: &[u8],
  ) -> Result<TlsRecordSender, RecordError> ! OutOfMemoryError ? &mut Allocator
```

Returns a sender that encrypts with `suite` and `trafficSecret`.

The secret is 32 bytes for the SHA-256 suites and 48 bytes for the SHA-384 suite.

#### Errors
- `Failure` with `InvalidSecretLength` if the secret has the wrong length. Nothing is
  allocated.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="TlsRecordSender.impl.makePlaintext"}

### Associated function `makePlaintext`

```silk
pub effect fn makePlaintext() -> TlsRecordSender ! OutOfMemoryError ? &mut Allocator
```

Returns a sender that frames records without encryption, for the first handshake messages.

::Anchor{id="TlsRecordSender.impl.replaceEpoch"}

### Method `replaceEpoch`

```silk
pub fn replaceEpoch(
    self: &mut Self,
    suite: CipherSuite,
    trafficSecret: &[u8],
  ) -> Result<(), RecordError>
```

Replaces the traffic key, for example after the handshake or a KeyUpdate. It does not
allocate.

The sequence number starts at 0 again.

#### Errors
- `InvalidState` if output is pending.
- `InvalidSecretLength` if the secret has the wrong length.

On an error, the old key stays in use.

::Anchor{id="TlsRecordSender.impl.queueRecord"}

### Method `queueRecord`

```silk
pub fn queueRecord(
    self: &mut Self,
    contentType: ContentType,
    content: &[u8],
  ) -> Result<OutputProgress, RecordError>
```

Encodes one record with up to 16384 bytes of `content`, and returns how many bytes it took.

If a record is still pending, it takes nothing and returns `NeedOutput`. It does not keep
`content`.

#### Errors
- `InvalidContent` for empty handshake content or an alert that is not 2 bytes.
- `KeyUsageExhausted` if the key is used up.

::Anchor{id="TlsRecordSender.impl.pendingOutput"}

### Method `pendingOutput`

```silk
pub fn pendingOutput<'owner>(self: &'owner Self) -> &'owner [u8]
```

Returns the bytes of the pending record that are not written yet. It returns an empty slice
when nothing is pending.

::Anchor{id="TlsRecordSender.impl.cancelPending"}

### Method `cancelPending`

```silk
pub fn cancelPending(self: &mut Self) -> ()
```

Drops the pending record. The key and the sequence number do not change.

#### Gotchas
If part of the record was written, the stream is broken. Close the transport.

::Anchor{id="TlsRecordSender.impl.recordsRemaining"}

### Method `recordsRemaining`

```silk
pub fn recordsRemaining(self: &Self) -> u64
```

Returns the number of records that the current key can still protect, or 0 for a plaintext
sender.

::Anchor{id="TlsRecordSender.impl.ackWritten"}

### Method `ackWritten`

```silk
pub fn ackWritten(self: &mut Self, count: usize) -> Result<(), RecordError>
```

Marks the first `count` pending bytes as written.

#### Errors
- `InvalidAcknowledgment` if `count` is more than the pending bytes. Nothing changes.

::Anchor{id="TlsRecordReceiver"}

## `TlsRecordReceiver`

```silk
pub struct TlsRecordReceiver
```

The receive direction of a TLS record layer. It holds at most one complete record.

Most programs use `silk.tls_connection` or `silk.tls_client`, which use the record layer. Use it
directly to build another TLS endpoint or a test tool. It allocates a fixed buffer one
time, when you make it, and takes input in pieces with [`TlsRecordReceiver.feedInput`](#TlsRecordReceiver.impl.feedInput).

It checks each header before it copies the body, and it gives you a record only after
authentication and all content checks.

### Gotchas
Any error in a peer record is permanent for this receiver. Do not use it again.

::Anchor{id="TlsRecordReceiver.impl"}

## Implementation `TlsRecordReceiver`

```silk
impl TlsRecordReceiver
```

::Anchor{id="TlsRecordReceiver.impl.make"}

### Associated function `make`

```silk
pub effect fn make(
    suite: CipherSuite,
    trafficSecret: &[u8],
  ) -> Result<TlsRecordReceiver, RecordError> ! OutOfMemoryError ? &mut Allocator
```

Returns a receiver that decrypts with `suite` and `trafficSecret`.

#### Errors
- `Failure` with `InvalidSecretLength` if the secret has the wrong length.
- `OutOfMemoryError` if the `Allocator` fails.

::Anchor{id="TlsRecordReceiver.impl.makePlaintext"}

### Associated function `makePlaintext`

```silk
pub effect fn makePlaintext() -> TlsRecordReceiver ! OutOfMemoryError ? &mut Allocator
```

Returns a receiver for records without encryption, for the first handshake messages.

::Anchor{id="TlsRecordReceiver.impl.replaceEpoch"}

### Method `replaceEpoch`

```silk
pub fn replaceEpoch(
    self: &mut Self,
    suite: CipherSuite,
    trafficSecret: &[u8],
  ) -> Result<(), RecordError>
```

Replaces the traffic key. It does not allocate. The sequence number starts at 0 again.

#### Errors
- `InvalidState` if part of a record was received, a record is ready, or the receiver failed.
- `InvalidSecretLength` if the secret has the wrong length.

On an error, the old key stays in use.

::Anchor{id="TlsRecordReceiver.impl.feedInput"}

### Method `feedInput`

```silk
pub fn feedInput(self: &mut Self, input: &[u8]) -> Result<InputProgress, RecordError>
```

Copies bytes of the current record from `input`, and returns how many it took and what it
needs next.

It stops at the end of a record, so give the rest of `input` again after you consume the
record. With an encrypted key, a plaintext `change_cipher_spec` record with the content `{1}`
is still accepted.

#### Errors
- `RecordOverflow`, `InvalidContent`, or `AuthenticationFailed` for a bad record. These errors
  are permanent.

::Anchor{id="TlsRecordReceiver.impl.record"}

### Method `record`

```silk
pub fn record<'owner>(self: &'owner Self) -> Option<RecordView<'owner>>
```

Returns the ready record, or `None` if no record is complete.

::Anchor{id="TlsRecordReceiver.impl.readyContentType"}

### Method `readyContentType`

```silk
pub fn readyContentType(self: &Self) -> Option<ContentType>
```

Returns the content type of the ready record, or `None`.

::Anchor{id="TlsRecordReceiver.impl.readyLength"}

### Method `readyLength`

```silk
pub fn readyLength(self: &Self) -> usize
```

Returns the content length of the ready record, or 0 if none is ready.

::Anchor{id="TlsRecordReceiver.impl.consumeRecordInto"}

### Method `consumeRecordInto`

```silk
pub fn consumeRecordInto(
    self: &mut Self,
    destination: &mut [u8],
  ) -> Result<usize, RecordError>
```

Copies the content of the ready record into `destination`, consumes the record, and returns
its length.

#### Errors
- `RecordOverflow` if `destination` is too small. The record stays ready.
- `InvalidState` if no record is ready.

::Anchor{id="TlsRecordReceiver.impl.consumeRecord"}

### Method `consumeRecord`

```silk
pub fn consumeRecord(self: &mut Self) -> Result<(), RecordError>
```

Releases the ready record, so that the receiver can take the next one.

#### Errors
- `InvalidState` if no record is ready.

Category: TLS and certificates.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
