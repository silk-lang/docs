Native [`StandardInput`](/docs/std/standard-input#StandardInput) provider backed by the process standard-input descriptor.

## When to use
Construct [`OsStandardInput`](#OsStandardInput) at a native application edge and provide it to portable byte-input
code. Use a scripted provider in tests to control partial reads, end-of-input, and failures.

## Details
The provider remembers observed end-of-input and commits each libc read directly into the caller's
buffer. For a non-empty buffer, a zero-length host transfer becomes the outcome selected by
[`StandardInput.endOfInput`](/docs/std/standard-input#StandardInput.impl.endOfInput). Only a host read error becomes [`StreamReadError`](/docs/std/standard-input#StreamReadError). Partial transfer counts are
preserved exactly.

Constructing the provider performs no read. Portable code reads after the application supplies
`&mut OsStandardInput` for the `&mut StandardInput` requirement.

## Gotchas
This module publishes its provider only for the supported native profiles.
WebAssembly selection leaves the module empty.
Empty buffers produce Filled(0) without reading, including after observed end-of-input.
A fresh provider can observe descriptor changes after a previous provider latched end-of-input.

## Examples
### Construct the native provider without reading standard input

```silk
import silk.os_standard_input { OsStandardInput }

pub fn main() -> i32 {
  let provider = OsStandardInput.make()
  drop provider
  return 42
}
```

Import as `OsStandardInput` with `import silk.os_standard_input { OsStandardInput }`.

Public declarations: 1.

::Anchor{id="OsStandardInput"}

## `OsStandardInput`

```silk
pub struct OsStandardInput
```

A native [`StandardInput`](/docs/std/standard-input#StandardInput) provider for the process input descriptor.

### Details

The process owns the descriptor. Each read changes only the committed prefix of the caller's
buffer and preserves the host transfer count.

::Anchor{id="OsStandardInput.impl"}

## Implementation `OsStandardInput`

```silk
impl OsStandardInput
```

::Anchor{id="OsStandardInput.impl-2"}

## Implementation `OsStandardInput`

```silk
impl OsStandardInput
```

::Anchor{id="OsStandardInput.impl.make"}

### Associated function `make`

```silk
pub fn make() -> OsStandardInput
```

Creates a provider for native standard-input bytes.

#### When to use

Use this function at a native application edge. Provide the result as `&mut StandardInput` to
portable code that calls `silk.standard_input.receive`.

#### Details

Construction initializes only the EOF flag and cannot fail. For a non-empty read buffer, a zero-byte
host transfer becomes end-of-input data. A host read error becomes [`StreamReadError`](/docs/std/standard-input#StreamReadError).

::Anchor{id="OsStandardInput.impl.StandardInput"}

## Implementation `StandardInput for OsStandardInput`

```silk
impl StandardInput for OsStandardInput
```

::Anchor{id="OsStandardInput.impl.StandardInput.read"}

### Operation `read`

```silk
read: OsStandardInput.read
```

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
