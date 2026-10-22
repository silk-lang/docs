Allocation-free JSON string escaping and formatting through the ambient Writer.

## When to use
Use [`JsonOutput`](#JsonOutput) when writing a JSON string, validated number, or container punctuation.
[`JsonOptions`](#JsonOptions) chooses compact or indented output and bounds container depth.

## Details
Each operation writes directly to `Writer`. A failed write may leave an accepted prefix; no
operation flushes the provider or allocates JSON-owned storage.

## Examples
### Configure two-space indentation
```silk
import silk.json_output { JsonOptions }
import silk.usize

pub fn main() -> i32 {
  let options = JsonOptions.indented(2)
  return usize.toI32(options.indent)
}
```

Import as `JsonOutput` with `import silk.json_output { JsonOutput }`.

Public declarations: 2.

::Anchor{id="JsonOptions"}

## `JsonOptions`

```silk
pub struct JsonOptions
```

Immutable policy carried by each JSON writer invocation.

::Anchor{id="JsonOptions.indent"}

### Field `indent`

```silk
pub indent: usize
```

Spaces per indentation level; zero selects compact output.

::Anchor{id="JsonOptions.depth"}

### Field `depth`

```silk
pub depth: usize
```

The current container depth.

::Anchor{id="JsonOptions.depthLimit"}

### Field `depthLimit`

```silk
pub depthLimit: usize
```

The greatest permitted container depth.

::Anchor{id="JsonOptions.impl.Copy"}

## Implementation `Copy for JsonOptions`

```silk
impl Copy for JsonOptions
```

::Anchor{id="JsonOutput"}

## `JsonOutput`

```silk
pub struct JsonOutput
```

Low-level JSON output operations shared by tree and typed serializers.

::Anchor{id="JsonOptions.impl"}

## Implementation `JsonOptions`

```silk
impl JsonOptions
```

::Anchor{id="JsonOptions.impl.compact"}

### Associated function `compact`

```silk
pub fn compact() -> JsonOptions
```

Selects compact output with the scanner's nesting limit.

::Anchor{id="JsonOptions.impl.indented"}

### Associated function `indented`

```silk
pub fn indented(width: usize) -> JsonOptions
```

Selects indentation width while retaining the default nesting limit.

::Anchor{id="JsonOptions.impl.child"}

### Method `child`

```silk
pub effect fn child(self: &JsonOptions) -> JsonOptions ! JsonError
```

Returns policy for one nested container or fails before its opening delimiter.

::Anchor{id="JsonOutput.impl"}

## Implementation `JsonOutput`

```silk
impl JsonOutput
```

::Anchor{id="JsonOutput.impl.writeString"}

### Associated function `writeString`

```silk
pub effect fn writeString(value: string) -> () ! WriterError ? &mut Writer
```

Writes one UTF-8 string with RFC 8259 quoting and control-byte escapes.

::Anchor{id="JsonOutput.impl.writeNumber"}

### Associated function `writeNumber`

```silk
pub effect fn writeNumber(value: string) -> () ! JsonError | WriterError ? &mut Writer
```

Validates and writes one complete JSON number lexeme without reformatting it.

::Anchor{id="JsonOutput.impl.separator"}

### Associated function `separator`

```silk
pub effect fn separator(options: &JsonOptions, first: bool) -> () ! WriterError ? &mut Writer
```

Writes a comma before a later member or item and its optional indentation.

::Anchor{id="JsonOutput.impl.line"}

### Associated function `line`

```silk
pub effect fn line(options: &JsonOptions) -> () ! WriterError ? &mut Writer
```

Writes a newline and spaces for the current depth when indentation is enabled.

::Anchor{id="JsonOutput.impl.colon"}

### Associated function `colon`

```silk
pub effect fn colon(options: &JsonOptions) -> () ! WriterError ? &mut Writer
```

Writes a colon followed by one optional space.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
