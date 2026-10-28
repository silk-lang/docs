Make the value of an `Authorization: Basic` header from a username and a password.

## When to use
Use [`encodeInto`](#encodeInto) to make the header value for HTTP Basic authentication. Use [`encodedLength`](#encodedLength)
first to size the output buffer.

## Details
The value is `Basic ` and the Base64 of `username:password`. You choose the character encoding
of the credentials, usually UTF-8. You also give a scratch buffer for `username:password`.
Nothing is written to a buffer if a check fails.

## Errors
- [`BasicError`](#BasicError) if a credential has a byte that is not allowed, or a buffer is too small.

## Gotchas
Basic credentials are not encrypted. Send them only over HTTPS. After the call, the scratch
buffer holds the password as plain text. Overwrite it when you are done.

## Examples
### Encode credentials
```silk
import silk.http.basic { BasicError, encodeInto, encodedLength }
import silk.core.result { Result }

pub fn main() -> i32 {
  let mut scratch: [u8; 64] = [0; 64]
  let mut output: [u8; 64] = [0; 64]
  let length = match encodeInto(b"Aladdin", b"open sesame", &mut scratch, &mut output) {
    Result<usize, BasicError>.Success { value } => value
    Result<usize, BasicError>.Failure { error: _ } => {
      return 1
    }
  }

  // "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
  if length != 34 || output[6] != 81 || output[33] != 61 {
    return 1
  }
  let size = match encodedLength(7, 11) {
    Result<usize, BasicError>.Success { value } => value
    Result<usize, BasicError>.Failure { error: _ } => 0
  }
  if size != length {
    return 1
  }

  // A colon in the username fails.
  let colon = match encodeInto(b"a:b", b"c", &mut scratch, &mut output) {
    Result<usize, BasicError>.Success { value: _ } => false
    Result<usize, BasicError>.Failure { error } => error == BasicError.InvalidUsername
  }
  if !colon {
    return 1
  }
  return 0
}
```

Import as `HttpBasic` with `import silk.http.basic as HttpBasic`.

Public declarations: 3.

::Anchor{id="BasicError"}

## `BasicError`

```silk
pub enum BasicError
```

The reason that [`encodeInto`](#encodeInto) failed. It never holds the credentials.

::Anchor{id="BasicError.InvalidUsername"}

### `InvalidUsername`

```silk
InvalidUsername
```

The username contains a colon, a control byte, or DEL.

::Anchor{id="BasicError.InvalidPassword"}

### `InvalidPassword`

```silk
InvalidPassword
```

The password contains a control byte or DEL.

::Anchor{id="BasicError.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

The length of the result does not fit in `usize`.

::Anchor{id="BasicError.ScratchTooSmall"}

### `ScratchTooSmall`

```silk
ScratchTooSmall
```

The scratch buffer cannot hold `username:password`.

::Anchor{id="BasicError.OutputTooSmall"}

### `OutputTooSmall`

```silk
OutputTooSmall
```

The output buffer cannot hold the whole value. See [`encodedLength`](#encodedLength).

::Anchor{id="BasicError.impl.Debug"}

## Implementation `Debug for BasicError`

```silk
impl Debug for BasicError
```

::Anchor{id="BasicError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the variant, such as `InvalidUsername`.

::Anchor{id="encodedLength"}

## `encodedLength`

```silk
pub fn encodedLength(usernameLength: usize, passwordLength: usize) -> Result<usize, BasicError>
```

Returns the length of the header value for credentials of these lengths, including `Basic `.

::Anchor{id="encodeInto"}

## `encodeInto`

```silk
pub fn encodeInto(username: &[u8], password: &[u8], scratch: &mut [u8], output: &mut [u8]) -> Result<
  usize,
  BasicError,
>
```

Writes `Basic ` and the Base64 of `username:password` to the start of `output`, and returns the
length.

### Details
The function writes `username:password` to `scratch` first. Bytes that are not ASCII are copied
without a change. You choose the character encoding of the credentials, usually UTF-8. Use
[`encodedLength`](#encodedLength) to size `output`.

### Errors
- `InvalidUsername` if `username` has a colon, a control byte, or DEL.
- `InvalidPassword` if `password` has a control byte or DEL.
- `ScratchTooSmall` or `OutputTooSmall` if a buffer is too small. Nothing is written to a buffer
  if the function fails.

### Gotchas
Basic credentials are not encrypted. Send them only over HTTPS. After the call, `scratch` holds
the password as plain text. Overwrite it when you are done.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
