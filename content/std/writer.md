Complete stdout and stderr byte writes through a replaceable service.

## When to use
Use [`Writer`](#Writer) when code must write complete byte sequences without selecting a destination.
Use `silk.os_writer` providers at a native process boundary. Use `silk.logger.Logger` for
structured log events.

## Details
A Writer requirement remains in an Effect until a caller supplies a provider. Applications and
tests can replace the provider for one lexical operation. Provider failure produces
[`WriterError`](#WriterError).

## Gotchas
Native providers live in `silk.os_writer` and require selected Darwin or GNU libc. [`ignoreError`](#Writer.impl.ignoreError) removes the typed
failure value and returns unit for a failed Effect.

Import as `Writer` with `import silk.writer { Writer }`.

Public declarations: 2.

::Anchor{id="WriterError"}

## `WriterError`

```silk
pub struct WriterError
```

A typed failure from a Writer provider that did not complete one write or flush operation.

::Anchor{id="Writer"}

## `Writer`

```silk
pub service Writer
```

A replaceable mutable service for complete byte writes and explicit flush operations.

::Anchor{id="Writer.writeAll"}

### Operation `writeAll`

```silk
effect fn writeAll(val: &[u8]) -> () ! WriterError ? &mut Writer
```

Writes one complete immutable byte sequence through the active Writer provider.

::Anchor{id="Writer.flush"}

### Operation `flush`

```silk
effect fn flush() -> () ! WriterError ? &mut Writer
```

Requests that the active Writer provider commit its buffered output.

::Anchor{id="Writer.impl"}

## Implementation `Writer`

```silk
impl Writer
```

::Anchor{id="Writer.impl.failure"}

### Associated function `failure`

```silk
pub fn failure() -> WriterError
```

Creates a failure for a provider that could not complete a write or flush operation.

::Anchor{id="Writer.impl.ignoreError"}

### Method `ignoreError`

```silk
pub effect fn ignoreError<A, E, ?R>(self: once Effect<A ! E ? R>) -> A | () ? R
```

Runs one Effect and converts its typed failure to unit while it preserves a successful value.

#### Details

This function consumes `self` one time and preserves its provider requirements. It discards the
error value when the Effect fails.

::Anchor{id="Writer.impl.writeString"}

### Associated function `writeString`

```silk
pub effect fn writeString(val: string) -> () ! WriterError ? &mut Writer
```

Writes the UTF-8 bytes of `val` through the active Writer provider.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
