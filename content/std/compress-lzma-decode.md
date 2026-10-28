Shared LZMA range decoder and probability models for LZMA, LZMA2, and XZ.

Import as `LzmaState` with `import silk.compress.lzma_decode { LzmaState }`.

Public declarations: 1.

::Anchor{id="LzmaState"}

## `LzmaState`

```silk
pub struct LzmaState
```

Internal range and dictionary state. The output buffer also holds dictionary history.

::Anchor{id="LzmaState.ip"}

### Field `ip`

```silk
pub ip: usize
```

Current input offset.

::Anchor{id="LzmaState.inputEnd"}

### Field `inputEnd`

```silk
pub inputEnd: usize
```

Exclusive input bound for the current chunk.

::Anchor{id="LzmaState.op"}

### Field `op`

```silk
pub op: usize
```

Current output offset.

::Anchor{id="LzmaState.outputEnd"}

### Field `outputEnd`

```silk
pub outputEnd: usize
```

Exclusive output bound for the current stream or chunk.

::Anchor{id="LzmaState.dictionaryStart"}

### Field `dictionaryStart`

```silk
pub dictionaryStart: usize
```

Output offset of the most recent dictionary reset.

::Anchor{id="LzmaState.dictionarySize"}

### Field `dictionarySize`

```silk
pub dictionarySize: u64
```

Maximum permitted match distance.

::Anchor{id="LzmaState.failed"}

### Field `failed`

```silk
pub failed: bool
```

First failure, if any.

::Anchor{id="LzmaState.reason"}

### Field `reason`

```silk
pub reason: DecodeReason
```

Failure reason, meaningful only when failed is true.

::Anchor{id="LzmaState.ended"}

### Field `ended`

```silk
pub ended: bool
```

Whether an LZMA end marker was decoded.

::Anchor{id="LzmaState.range"}

### Field `range`

```silk
pub range: u32
```

Current arithmetic range.

::Anchor{id="LzmaState.code"}

### Field `code`

```silk
pub code: u32
```

Current arithmetic code.

::Anchor{id="LzmaState.impl"}

## Implementation `LzmaState`

```silk
impl LzmaState
```

::Anchor{id="LzmaState.impl.make"}

### Associated function `make`

```silk
pub fn make(inputEnd: usize, outputEnd: usize) -> LzmaState
```

Creates empty state; probability storage is allocated by configure.

::Anchor{id="LzmaState.impl.reject"}

### Method `reject`

```silk
pub fn reject(self: &mut Self, reason: DecodeReason) -> ()
```

Records only the first failure.

::Anchor{id="LzmaState.impl.error"}

### Method `error`

```silk
pub fn error(self: &Self) -> DecodeError
```

Returns the current failure with progress offsets.

::Anchor{id="LzmaState.impl.byte"}

### Method `byte`

```silk
pub fn byte(self: &mut Self, input: &[u8]) -> u32
```

Reads one byte without crossing the current chunk's input boundary.

::Anchor{id="LzmaState.impl.little"}

### Method `little`

```silk
pub fn little(self: &mut Self, input: &[u8], count: u32) -> u64
```

Reads a little-endian integer of at most eight bytes.

::Anchor{id="LzmaState.impl.configure"}

### Method `configure`

```silk
pub effect fn configure(self: &mut Self, property: u32, lzma2: bool, workspace: usize) -> ()
    ! OutOfMemoryError
    ? &mut Allocator
```

Validates properties and resets all probability models within the workspace limit.

::Anchor{id="LzmaState.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> ()
```

Resets probabilities and repeat distances without changing dictionary history.

::Anchor{id="LzmaState.impl.startRange"}

### Method `startRange`

```silk
pub fn startRange(self: &mut Self, input: &[u8]) -> ()
```

Starts a five-byte range-coded chunk and validates its reserved byte.

::Anchor{id="LzmaState.impl.put"}

### Method `put`

```silk
pub fn put(self: &mut Self, output: &mut [u8], value: u8) -> ()
```

Appends a byte, respecting the caller's output bound.

::Anchor{id="LzmaState.impl.symbol"}

### Method `symbol`

```silk
pub fn symbol(self: &mut Self, input: &[u8], output: &mut [u8]) -> ()
```

Decodes one literal, match, or end marker with bounded input and output access.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
