CRC checksums used by gzip and XZ containers.

Import as `CompressionChecksum` with `import silk.support.compression_checksum { CompressionChecksum }`.

Public declarations: 1.

::Anchor{id="CompressionChecksum"}

## `CompressionChecksum`

```silk
pub struct CompressionChecksum
```

Allocation-free container checksums.

::Anchor{id="CompressionChecksum.impl"}

## Implementation `CompressionChecksum`

```silk
impl CompressionChecksum
```

::Anchor{id="CompressionChecksum.impl.crc32"}

### Associated function `crc32`

```silk
pub fn crc32(bytes: &[u8]) -> u32
```

Returns the reflected IEEE CRC-32 of the supplied bytes.

::Anchor{id="CompressionChecksum.impl.crc32Byte"}

### Associated function `crc32Byte`

```silk
pub fn crc32Byte(state: u32, byte: u8) -> u32
```

Updates a running reflected CRC-32; initialize and finalize by XOR with 4294967295.

::Anchor{id="CompressionChecksum.impl.crc64"}

### Associated function `crc64`

```silk
pub fn crc64(bytes: &[u8]) -> u64
```

Returns the CRC-64/XZ checksum of the supplied bytes.

Category: Compiler support.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
