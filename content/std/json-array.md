Write a JSON array to the `Writer`.

## When to use
Use [`JsonArray`](#JsonArray) in a `Serialize` implementation to write a slice of values as a JSON array:
`JsonArray.begin(options) |> JsonArray.items(&values) |> JsonArray.end`. Each value must
implement `Serialize`. For a `List<T>`, `Json.serialize` already writes an array.

## Details
Each step returns an effect that the next step runs. The array keeps track of commas and of the
depth. It does not allocate.

## Errors
- `JsonError` if the nesting is deeper than the limit in the options, or a value fails.
- `WriterError` if the `Writer` fails. Bytes that it accepted before the failure stay written.

Import as `JsonArray` with `import silk.json.array { JsonArray }`.

Public declarations: 1.

::Anchor{id="JsonArray"}

## `JsonArray`

```silk
pub struct JsonArray
```

The state of one open JSON array.

### When to use
Use it in a `Serialize` implementation to write a slice of values as a JSON array:
`JsonArray.begin(options) |> JsonArray.items(&values) |> JsonArray.end`. Each value must
implement `Serialize`. For a `List<T>`, `Json.serialize` already writes an array.

### Details
Each step returns an effect that the next step runs. The array keeps track of commas and of the
depth. It does not allocate.

::Anchor{id="JsonArray.impl"}

## Implementation `JsonArray`

```silk
impl JsonArray
```

::Anchor{id="JsonArray.impl.begin"}

### Associated function `begin`

```silk
pub effect fn begin(options: &JsonOptions)
    -> JsonArray ! JsonError | WriterError ? &mut Writer
```

Writes `[` and returns the state of the open array.

#### Errors

- `JsonError` with reason `DepthExceeded` if the array would be deeper than the limit in
  `options`. Nothing is written.
- `WriterError` if the `Writer` fails. Bytes that it accepted before the failure stay written.

::Anchor{id="JsonArray.impl.items"}

### Method `items`

```silk
pub effect fn items<'env, T: Serialize, E, ?R>(
    self: once Effect<'env; JsonArray ! E ? R>,
    values: &'env [T]
  ) -> JsonArray ! E | JsonError | WriterError ? R | &mut Writer
```

Writes each element of `values` in order, with commas between them.

#### Details

The array operations form a chain with `|>`: `JsonArray.begin(options) |>
JsonArray.items(&values) |> JsonArray.end`. It runs the effect of the step before it one time.
If that step fails, this step writes nothing.

#### Errors
- `JsonError` from a value, or from the step before it.
- `WriterError` if the `Writer` fails. Bytes that it accepted before the failure stay written.

::Anchor{id="JsonArray.impl.end"}

### Method `end`

```silk
pub effect fn end<'env, E, ?R>(
    self: once Effect<'env; JsonArray ! E ? R>
  ) -> () ! E | JsonError | WriterError ? R | &mut Writer
```

Writes `]` and completes the array.

#### Details

The array operations form a chain with `|>`: `JsonArray.begin(options) |>
JsonArray.items(&values) |> JsonArray.end`. It runs the effect of the step before it one time.
If that step fails, it does not write `]`.

#### Errors
- `JsonError` from the step before it.
- `WriterError` if the `Writer` fails. Bytes that it accepted before the failure stay written.

Category: Data formats.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
