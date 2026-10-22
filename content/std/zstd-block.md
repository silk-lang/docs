Internal bounded zstd compressed-block decoding with retained entropy tables.

## Details
Callers supply literal, output, and circular history storage. A failed decode invalidates the
state.

Import as `BlockState` with `import silk.support.zstd_block { BlockState }`.

Public declarations: 3.

::Anchor{id="BlockReason"}

## `BlockReason`

```silk
pub enum BlockReason
```

The invalid component of a compressed zstd block.

::Anchor{id="BlockReason.None"}

### `None`

```silk
None
```

No compressed-block failure applies.

::Anchor{id="BlockReason.Literals"}

### `Literals`

```silk
Literals
```

A literal header, tree, or stream is invalid.

::Anchor{id="BlockReason.Sequences"}

### `Sequences`

```silk
Sequences
```

A sequence header, table, or bitstream is invalid.

::Anchor{id="BlockReason.Offset"}

### `Offset`

```silk
Offset
```

A match points outside the available window.

::Anchor{id="BlockReason.Output"}

### `Output`

```silk
Output
```

The decoded block exceeds the supplied output storage.

::Anchor{id="BlockError"}

## `BlockError`

```silk
pub struct BlockError
```

A compressed-block failure and its local compressed byte position.

::Anchor{id="BlockError.reason"}

### Field `reason`

```silk
pub reason: BlockReason
```

The invalid component.

::Anchor{id="BlockError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The local compressed byte position.

::Anchor{id="BlockState"}

## `BlockState`

```silk
pub struct BlockState
```

Retained entropy tables and repeat offsets for one zstd frame.

::Anchor{id="BlockState.impl"}

## Implementation `BlockState`

```silk
impl BlockState
```

::Anchor{id="BlockState.impl.make"}

### Associated function `make`

```silk
pub effect fn make() -> BlockState ! OutOfMemoryError ? &mut Allocator
```

Allocates fresh entropy tables and sets the initial repeat offsets for one frame.

#### Details
The state owns five exact allocations and releases them when dropped. Decode and reset do not
allocate.

::Anchor{id="BlockState.impl.reset"}

### Method `reset`

```silk
pub fn reset(self: &mut Self) -> ()
```

Restores fresh entropy tables and repeat offsets before a new frame.

::Anchor{id="BlockState.impl.workspaceBytes"}

### Associated function `workspaceBytes`

```silk
pub fn workspaceBytes() -> usize
```

Returns a conservative byte bound for tables and transient algorithm scratch on supported
targets.

#### Details
This bound excludes caller-owned compressed, literal, output, and history storage.

::Anchor{id="BlockState.impl.decode"}

### Method `decode`

```silk
pub fn decode(
    self: &mut Self,
    input: &[u8],
    literals: &mut [u8],
    output: &mut [u8],
    history: &[u8],
    historyPosition: usize,
    historyLength: usize,
    windowSize: usize,
  ) -> Result<usize, BlockError>
```

Decodes one complete compressed block into caller-owned storage without allocation.

#### Details
Returns the initialized output length. `historyPosition` is the next circular write position.
`historyLength` counts valid bytes from earlier blocks. `windowSize` bounds match distances.

#### Gotchas
Failure can change tables and scratch bytes. Discard the frame state after failure.

Category: Compiler support.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
