Minimal source-defined test assertions and runtime selection predicates.

## When to use
Mark a parameterless unit function with `test`, then use [`expect`](#Testing.impl.expect) for a boolean condition.
Custom runners may reuse [`matches`](#Testing.impl.matches) to apply the builtin runner's file and name policy.

## Details
Assertions are ordinary typed failures. They require no service and carry the caller's borrowed
diagnostic message. Runtime filters are literal: file paths compare exactly, while names use
ASCII-only case folding and bytewise substring matching.

Import as `Testing` with `import silk.testing { Testing }`.

Public declarations: 2.

::Anchor{id="AssertionError"}

## `AssertionError`

```silk
pub struct AssertionError<'message>
```

A failed boolean expectation with the caller-provided diagnostic message.

::Anchor{id="Testing"}

## `Testing`

```silk
pub struct Testing
```

Source-defined test helpers with no compiler-known behavior.

::Anchor{id="Testing.impl"}

## Implementation `Testing`

```silk
impl Testing
```

::Anchor{id="Testing.impl.expect"}

### Associated function `expect`

```silk
pub effect fn expect<'message>(
    condition: bool,
    message: string<'message>
  ) -> () ! AssertionError<'message>
```

Fails with `message` when `condition` is false.

::Anchor{id="Testing.impl.assertionMessage"}

### Associated function `assertionMessage`

```silk
pub fn assertionMessage<'message>(error: &'message AssertionError<'message>) -> string<'message>
```

Returns the diagnostic message retained by one assertion failure.

::Anchor{id="Testing.impl.matches"}

### Associated function `matches`

```silk
pub fn matches(
    path: string,
    name: string,
    fileFilter: string,
    nameFilter: string,
  ) -> bool
```

Applies exact logical-file matching and literal ASCII case-insensitive name matching.
Empty file or name filters match every test.

::Anchor{id="Testing.impl.matchesQualified"}

### Associated function `matchesQualified`

```silk
pub fn matchesQualified(
    path: string,
    module: string,
    name: string,
    fileFilter: string,
    nameFilter: string,
  ) -> bool
```

Applies [`matches`](#Testing.impl.matches), except that the name filter matches anywhere in the test's qualified
name `module::name`, as the builtin runner reports it.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
