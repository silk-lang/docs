Effectful JSON array construction through the ambient Writer.

## When to use
Use [`JsonArray`](#JsonArray) to write a slice of values with a [`Serialize`](/docs/std/json-codec#Serialize) implementation.

## Details
The array owns its comma and depth state. It does not own or borrow the Writer.
A failed write can leave an accepted prefix in the Writer.

Import as `JsonArray` with `import silk.json_array { JsonArray }`.

Public declarations: 1.

::Anchor{id="JsonArray"}

## `JsonArray`

```silk
pub struct JsonArray
```

Owned formatting state for one open JSON array.

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

Opens an array after checking its depth limit.

::Anchor{id="JsonArray.impl.items"}

### Method `items`

```silk
pub effect fn items<'env, T: Serialize, E, ?R>(
    self: once Effect<'env; JsonArray ! E ? R>,
    values: &'env [T]
  ) -> JsonArray ! E | JsonError | WriterError ? R | &mut Writer
```

Writes all values in source order and returns the open array state.

#### Details
The incoming Effect runs once. If it fails, this operation writes nothing.

::Anchor{id="JsonArray.impl.end"}

### Method `end`

```silk
pub effect fn end<'env, E, ?R>(
    self: once Effect<'env; JsonArray ! E ? R>
  ) -> () ! E | JsonError | WriterError ? R | &mut Writer
```

Closes an array and returns the completed write.

#### Details
The incoming Effect runs once. If it fails, the closing bracket is not written.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
