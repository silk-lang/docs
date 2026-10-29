Descriptor reads and writes through WASI.

## Details
These operations borrow descriptors. They never close them.
They retry interrupted calls and report WASI errno values on failure.

Import as `WasiDescriptor` with `import silk.platform.wasi.descriptor { WasiDescriptor }`.

Public declarations: 1.

::Anchor{id="WasiDescriptor"}

## `WasiDescriptor`

```silk
pub struct WasiDescriptor
```

Descriptor transfers for WASI providers. Calls never close the descriptor.

::Anchor{id="WasiDescriptor.impl"}

## Implementation `WasiDescriptor`

```silk
impl WasiDescriptor
```

::Anchor{id="WasiDescriptor.impl.read"}

### Associated function `read`

```silk
pub effect fn read(fd: i32, buffer: &mut [u8], count: &mut usize, error: &mut i32) -> bool
```

Reads once into `buffer`. Returns false with a WASI errno on failure.
An empty buffer succeeds without a host call. A zero count means end of input.

::Anchor{id="WasiDescriptor.impl.isTerminal"}

### Associated function `isTerminal`

```silk
pub effect fn isTerminal(fd: i32) -> bool
```

Returns false because WASI does not define terminal detection.

::Anchor{id="WasiDescriptor.impl.writeAll"}

### Associated function `writeAll`

```silk
pub effect fn writeAll(fd: i32, buffer: &[u8], error: &mut i32) -> bool
```

Writes all bytes in `buffer`. A failure can occur after a partial write.
Returns false with the WASI errno, or zero for an invalid host count.

::Anchor{id="WasiDescriptor.impl.writeAllGather"}

### Associated function `writeAllGather`

```silk
pub effect fn writeAllGather(fd: i32, head: &[u8], rest: &[&[u8]], error: &mut i32) -> bool
```

Writes `head` followed by all slices of `rest`. A failure can follow a partial write.
Returns false with a WASI errno, or zero for an invalid host count.

Category: Native platform.

Profiles: `wasm32-wasip1`, `wasm32-wasip2`.
