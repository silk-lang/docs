Owned Preview 2 input and output streams with partial transfers and deadlines.

## Details
Stream owners close their resource on drop. Operations use WASI polling and the supplied
monotonic clock. The parent resource, such as a TCP socket or HTTP body, must outlive its streams.

Import as `wasi_stream` with `import silk.platform.wasi.stream as wasi_stream`.

Public declarations: 3.

::Anchor{id="StreamError"}

## `StreamError`

```silk
pub enum StreamError
```

A stream failure: a closed resource, an expired deadline, or another host I/O failure.

::Anchor{id="StreamError.Closed"}

### `Closed`

```silk
Closed
```

::Anchor{id="StreamError.Timeout"}

### `Timeout`

```silk
Timeout
```

::Anchor{id="StreamError.Host"}

### `Host`

```silk
Host
```

::Anchor{id="InputStream"}

## `InputStream`

```silk
pub struct InputStream
```

An owned Preview 2 input stream. Its parent must outlive it.

::Anchor{id="OutputStream"}

## `OutputStream`

```silk
pub struct OutputStream
```

An owned Preview 2 output stream. Its parent must outlive it.

::Anchor{id="InputStream.impl"}

## Implementation `InputStream`

```silk
impl InputStream
```

::Anchor{id="InputStream.impl.take"}

### Associated function `take`

```silk
pub unsafe fn take(handle: u32) -> InputStream
```

Takes exclusive ownership of a live input-stream handle. The caller keeps its parent alive.

::Anchor{id="InputStream.impl.handle"}

### Method `handle`

```silk
pub fn handle(self: &Self) -> u32
```

Borrows the handle without transferring ownership. It is valid until this owner is dropped.

::Anchor{id="InputStream.impl.read"}

### Method `read`

```silk
pub effect fn read(self: &mut Self, output: &mut [u8], deadline: Option<Instant>) -> ReadTransfer
      ! StreamError ? &mut MonotonicClock
```

Reads a nonempty partial transfer or EOF. An empty output returns zero immediately.
An expired deadline fails with `Timeout`; other failures are `Closed` or `Host`.

::Anchor{id="InputStream.impl.Drop"}

## Implementation `Drop for InputStream`

```silk
impl Drop for InputStream
```

::Anchor{id="InputStream.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

::Anchor{id="OutputStream.impl"}

## Implementation `OutputStream`

```silk
impl OutputStream
```

::Anchor{id="OutputStream.impl.take"}

### Associated function `take`

```silk
pub unsafe fn take(handle: u32) -> OutputStream
```

Takes exclusive ownership of a live output-stream handle. The caller keeps its parent alive.

::Anchor{id="OutputStream.impl.handle"}

### Method `handle`

```silk
pub fn handle(self: &Self) -> u32
```

Borrows the handle without transferring ownership. It is valid until this owner is dropped.

::Anchor{id="OutputStream.impl.write"}

### Method `write`

```silk
pub effect fn write(self: &mut Self, input: &[u8], deadline: Option<Instant>) -> usize
      ! StreamError ? &mut MonotonicClock
```

Writes a nonempty partial transfer, honoring host backpressure and the deadline.
An empty input returns zero; host I/O errors release their error resource before failing.

::Anchor{id="OutputStream.impl.flush"}

### Method `flush`

```silk
pub effect fn flush(self: &mut Self, deadline: Option<Instant>) -> ()
      ! StreamError ? &mut MonotonicClock
```

Flushes buffered bytes and waits until the host permits another write.

::Anchor{id="OutputStream.impl.Drop"}

## Implementation `Drop for OutputStream`

```silk
impl Drop for OutputStream
```

::Anchor{id="OutputStream.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Self) -> ()
```

Category: Native platform.

Profiles: `wasm32-wasip2`.
