Decoding validated JSON string tokens into owned UTF-8 bytes.

## When to use
Use [`JsonText.decode`](#JsonText.impl.decode) after `JsonScanner` has validated a string token. The returned bytes
are valid UTF-8 and can be adopted by `String` without another copy.

Import as `JsonText` with `import silk.json_text { JsonText }`.

Public declarations: 1.

::Anchor{id="JsonText"}

## `JsonText`

```silk
pub struct JsonText
```

Operations on validated JSON string token text.

::Anchor{id="JsonText.impl"}

## Implementation `JsonText`

```silk
impl JsonText
```

::Anchor{id="JsonText.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(raw: &[u8]) -> Bytes ! OutOfMemoryError ? &mut Allocator
```

Copies scanner-validated UTF-8 or ASCII bytes into owned storage.

::Anchor{id="JsonText.impl.decode"}

### Associated function `decode`

```silk
pub effect fn decode(raw: &[u8], offset: usize, escaped: bool)
    -> Bytes ! JsonError | OutOfMemoryError ? &mut Allocator
```

Decodes one quoted token, including escapes, into owned valid UTF-8 bytes.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
