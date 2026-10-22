Portable blocking child execution from structured byte arguments to fully captured output.

## When to use
Build a [`ProcessRequest`](#ProcessRequest) when one executable should run directly. This API is not a shell:
spaces, quotes, and metacharacters in an argument remain data and are never parsed as command
syntax.

## Details
Requests preserve NUL-free argument and environment-entry bytes in insertion order. The
environment begins empty, and the working directory is inherited unless [`requestWithin`](#ChildProcess.impl.requestWithin)
selects one. Child standard input is closed. `ChildProcess.execute` blocks until termination and
owns complete stdout and stderr captures in [`ProcessOutcome`](#ProcessOutcome). A nonzero exit is outcome data.

[`ProcessError`](#ProcessError) is reserved for failing to spawn, wait, or capture; it carries a stable
portable reason and may retain a provider code. Execution also reports [`OutOfMemoryError`](/docs/std/allocator#OutOfMemoryError) when
captured output cannot be owned.

## Gotchas
An argument, environment name, or environment value must not contain NUL. The request uses NUL
as its entry separator, and a native provider cannot preserve an embedded NUL as data.

## Examples
### Handle a nonzero child exit as outcome data

```silk
import silk.bytes { Bytes }

import silk.child_process { ChildProcess, ProcessError, ProcessOutcome, ProcessRequest }

import silk.allocator { Allocator, OutOfMemoryError }

import silk.effect { Effect }

import silk.filesystem { Path, FileError }

import silk.option { Option }

struct Completed {}

effect fn execute(self: &mut Completed, request: &ProcessRequest) -> ProcessOutcome
! ProcessError | OutOfMemoryError
? &mut Allocator {
  return ChildProcess.exited(7, Bytes.make(), Bytes.make())
}

impl ChildProcess for Completed {
  execute: Completed.execute
}

effect fn program() -> i32
! FileError | OutOfMemoryError | ProcessError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut provider = Completed {}
  let path = run Path.make("/tool")
    |> Effect.provideMut<Allocator>(&mut allocator)
  let request = run ChildProcess.request(&path)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let outcome = run ChildProcess.submit(&request)
    |> Effect.provideMut<ChildProcess>(&mut provider)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move ChildProcess.exitCode(&outcome) {
    Option<i32>.Some {value} => 35 + value
    Option<i32>.None => 1
  }
}

effect fn recover(error: FileError | OutOfMemoryError | ProcessError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(program(), recover)
}
```

Import as `ChildProcess` with `import silk.child_process { ChildProcess }`.

Public declarations: 8.

::Anchor{id="ProcessOperation"}

## `ProcessOperation`

```silk
pub struct ProcessOperation
```

A provider-reported execution stage for one [`ProcessError`](#ProcessError).

::Anchor{id="ProcessOperation.code"}

### Field `code`

```silk
pub code: i32
```

The stable numeric code for the provider-reported execution stage.

::Anchor{id="ProcessReason"}

## `ProcessReason`

```silk
pub struct ProcessReason
```

A portable recovery category for one [`ProcessError`](#ProcessError).

::Anchor{id="ProcessReason.code"}

### Field `code`

```silk
pub code: i32
```

The stable numeric code for the portable recovery category.

::Anchor{id="ProcessError"}

## `ProcessError`

```silk
pub struct ProcessError
```

A typed failure to start, wait for, or capture one child process.

### Details

`operation` identifies the provider-reported stage. `reason` gives a portable recovery category.
Use [`providerCode`](#ChildProcess.impl.providerCode) when diagnostics also need a provider-defined numeric code.

A child that exits with a nonzero code produces [`ProcessOutcome`](#ProcessOutcome) data instead of this error.

::Anchor{id="ProcessError.operation"}

### Field `operation`

```silk
pub operation: ProcessOperation
```

The execution stage reported by the provider.

::Anchor{id="ProcessError.reason"}

### Field `reason`

```silk
pub reason: ProcessReason
```

The portable category that callers can use for recovery.

::Anchor{id="ProcessRequest"}

## `ProcessRequest`

```silk
pub struct ProcessRequest
```

One owned child-process request with ordered arguments and an explicit environment.

### Details

Arguments and environment entries are exact platform bytes rather than checked text, so a value
received from the platform can be handed to a child unchanged. Entries are retained in the order
they were added, and the environment starts empty: a child sees no variable that this request
did not name.

### Gotchas

Argument, environment-name, and environment-value bytes must not contain NUL. NUL separates
entries in the provider request format.

::Anchor{id="Exited"}

## `Exited`

```silk
pub struct Exited
```

A completed child process that returned an exit code and two owned captures.

::Anchor{id="Exited.code"}

### Field `code`

```silk
pub code: i32
```

The code the child returned. Any value, including a nonzero one, is ordinary data.

::Anchor{id="Exited.output"}

### Field `output`

```silk
pub output: Bytes
```

The complete captured standard output, owned by this outcome.

::Anchor{id="Exited.errors"}

### Field `errors`

```silk
pub errors: Bytes
```

The complete captured standard error, owned by this outcome.

::Anchor{id="Signaled"}

## `Signaled`

```silk
pub struct Signaled
```

A completed child process that a signal terminated, with two owned captures.

::Anchor{id="Signaled.signal"}

### Field `signal`

```silk
pub signal: i32
```

The platform signal number that terminated the child.

::Anchor{id="Signaled.output"}

### Field `output`

```silk
pub output: Bytes
```

The complete captured standard output, owned by this outcome.

::Anchor{id="Signaled.errors"}

### Field `errors`

```silk
pub errors: Bytes
```

The complete captured standard error, owned by this outcome.

::Anchor{id="ProcessOutcome"}

## `ProcessOutcome`

```silk
pub struct ProcessOutcome
```

One completed child execution, represented as an exit or signal termination.

### Details

An exit code and a terminating signal are distinct members rather than one integer, so a caller
can never read a signal number as though it were an exit code.

::Anchor{id="ProcessOutcome.value"}

### Field `value`

```silk
pub value: Exited | Signaled
```

The completed outcome.

::Anchor{id="ChildProcess"}

## `ChildProcess`

```silk
pub service ChildProcess
```

A portable blocking child-process service with complete output capture.

### Details

`execute` closes child standard input and blocks until termination. The returned outcome owns
complete standard-output and standard-error captures. A nonzero exit code is outcome data.

A start, wait, or capture failure produces [`ProcessError`](#ProcessError). Owning either capture can also
produce [`OutOfMemoryError`](/docs/std/allocator#OutOfMemoryError). The operation needs exclusive provider and allocator requirements.

::Anchor{id="ChildProcess.execute"}

### Operation `execute`

```silk
effect fn execute(
    request: &ProcessRequest
  ) -> ProcessOutcome ! ProcessError | OutOfMemoryError ? &mut ChildProcess | &mut Allocator
```

Runs one request to termination and returns owned captures of both output streams.

#### Details

This operation blocks and closes the child's standard input. A nonzero exit code returns on
the success channel. Start, wait, and capture failures produce `ProcessError`.

::Anchor{id="ChildProcess.impl"}

## Implementation `ChildProcess`

```silk
impl ChildProcess
```

::Anchor{id="ChildProcess.impl.spawnOperation"}

### Associated function `spawnOperation`

```silk
pub fn spawnOperation() -> ProcessOperation
```

Returns the stage for preparing and starting the child process.

::Anchor{id="ChildProcess.impl.waitOperation"}

### Associated function `waitOperation`

```silk
pub fn waitOperation() -> ProcessOperation
```

Returns the stage for waiting until the child process terminates.

::Anchor{id="ChildProcess.impl.captureOperation"}

### Associated function `captureOperation`

```silk
pub fn captureOperation() -> ProcessOperation
```

Returns the stage for copying the completed output and error streams.

::Anchor{id="ChildProcess.impl.operationCode"}

### Associated function `operationCode`

```silk
pub fn operationCode(operation: ProcessOperation) -> i32
```

Returns the stable numeric code for an execution stage.

::Anchor{id="ChildProcess.impl.notFound"}

### Associated function `notFound`

```silk
pub fn notFound() -> ProcessReason
```

Returns the reason used when no executable exists at the requested path.

::Anchor{id="ChildProcess.impl.permissionDenied"}

### Associated function `permissionDenied`

```silk
pub fn permissionDenied() -> ProcessReason
```

Returns the reason used when the provider denies access to the requested executable.

::Anchor{id="ChildProcess.impl.invalidRequest"}

### Associated function `invalidRequest`

```silk
pub fn invalidRequest() -> ProcessReason
```

Returns the reason used when the provider cannot present the request to its process boundary.

::Anchor{id="ChildProcess.impl.noSpace"}

### Associated function `noSpace`

```silk
pub fn noSpace() -> ProcessReason
```

Returns the reason used when process setup or captured output exhausts provider storage.

::Anchor{id="ChildProcess.impl.unsupported"}

### Associated function `unsupported`

```silk
pub fn unsupported() -> ProcessReason
```

Returns the reason used when the provider does not support the requested process operation.

::Anchor{id="ChildProcess.impl.other"}

### Associated function `other`

```silk
pub fn other() -> ProcessReason
```

Returns the reason used when no other portable recovery category applies.

::Anchor{id="ChildProcess.impl.reasonCode"}

### Associated function `reasonCode`

```silk
pub fn reasonCode(reason: ProcessReason) -> i32
```

Returns the stable numeric code for a portable recovery category.

::Anchor{id="ChildProcess.impl.failure"}

### Associated function `failure`

```silk
pub fn failure(operation: ProcessOperation, reason: ProcessReason) -> ProcessError
```

Creates a process failure without a provider-defined numeric code.

::Anchor{id="ChildProcess.impl.failureWithCode"}

### Associated function `failureWithCode`

```silk
pub fn failureWithCode(
    operation: ProcessOperation,
    reason: ProcessReason,
    code: i32
  ) -> ProcessError
```

Creates a process failure with a provider-defined numeric code for diagnostics.

::Anchor{id="ChildProcess.impl.providerCode"}

### Associated function `providerCode`

```silk
pub fn providerCode(error: &ProcessError) -> Option<i32>
```

Returns the provider-defined numeric code, or `None` when the failure has no such code.

::Anchor{id="ChildProcess.impl.request"}

### Associated function `request`

```silk
pub effect fn request(program: &Path) -> ProcessRequest ! OutOfMemoryError ? &mut Allocator
```

Creates a request for `program` with no arguments, an empty environment, and the caller's
own working directory.

::Anchor{id="ChildProcess.impl.requestWithin"}

### Associated function `requestWithin`

```silk
pub effect fn requestWithin(
    program: &Path,
    directory: &Path
  ) -> ProcessRequest ! OutOfMemoryError ? &mut Allocator
```

Creates a request that runs `program` in `directory` instead of the caller's
working directory.

::Anchor{id="ChildProcess.impl.addArgument"}

### Method `addArgument`

```silk
pub effect fn addArgument(
    self: &mut ProcessRequest,
    value: &[u8]
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Appends one NUL-free byte argument after all arguments already in the request.

#### Details

The request copies `value` and preserves argument order.

#### Gotchas

`value` must not contain NUL. NUL is the entry separator used by process providers.
If allocation fails, do not reuse `self`; it can contain an incomplete argument entry.

::Anchor{id="ChildProcess.impl.setVariable"}

### Method `setVariable`

```silk
pub effect fn setVariable(
    self: &mut ProcessRequest,
    name: &[u8],
    value: &[u8]
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Appends one NUL-free environment entry as `name`, `=`, and `value` bytes.

#### Details

The request starts with an empty environment and preserves insertion order. This function does
not read or merge the caller's environment.

#### Gotchas

`name` and `value` must not contain NUL. The request builder does not validate environment-name
grammar beyond this provider-format requirement.
If allocation fails, do not reuse `self`; it can contain an incomplete environment entry.

::Anchor{id="ChildProcess.impl.program"}

### Method `program`

```silk
pub fn program(self: &ProcessRequest) -> &[u8]
```

Borrows the executable path bytes for the lifetime of the request borrow.

::Anchor{id="ChildProcess.impl.arguments"}

### Method `arguments`

```silk
pub fn arguments(self: &ProcessRequest) -> &[u8]
```

Borrows all ordered arguments as one block of NUL-terminated entries.

::Anchor{id="ChildProcess.impl.argumentCount"}

### Method `argumentCount`

```silk
pub fn argumentCount(self: &ProcessRequest) -> usize
```

Returns the number of calls to [`addArgument`](#ChildProcess.impl.addArgument) that completed successfully.

::Anchor{id="ChildProcess.impl.environment"}

### Method `environment`

```silk
pub fn environment(self: &ProcessRequest) -> &[u8]
```

Borrows the explicit environment as one block of NUL-terminated `name=value` entries.

::Anchor{id="ChildProcess.impl.environmentCount"}

### Method `environmentCount`

```silk
pub fn environmentCount(self: &ProcessRequest) -> usize
```

Returns the number of calls to [`setVariable`](#ChildProcess.impl.setVariable) that completed successfully.

::Anchor{id="ChildProcess.impl.workingDirectory"}

### Method `workingDirectory`

```silk
pub fn workingDirectory(self: &ProcessRequest) -> &[u8]
```

Borrows the selected working-directory bytes, or an empty view when the child inherits one.

::Anchor{id="ChildProcess.impl.hasWorkingDirectory"}

### Method `hasWorkingDirectory`

```silk
pub fn hasWorkingDirectory(self: &ProcessRequest) -> bool
```

Reports whether the request selects a working directory instead of inheriting one.

::Anchor{id="ChildProcess.impl.exited"}

### Associated function `exited`

```silk
pub fn exited(code: i32, output: Bytes, errors: Bytes) -> ProcessOutcome
```

Creates an exited outcome that owns `output` and `errors`.

::Anchor{id="ChildProcess.impl.signaled"}

### Associated function `signaled`

```silk
pub fn signaled(signal: i32, output: Bytes, errors: Bytes) -> ProcessOutcome
```

Creates a signaled outcome that owns `output` and `errors`.

::Anchor{id="ChildProcess.impl.isSignaled"}

### Associated function `isSignaled`

```silk
pub fn isSignaled(outcome: &ProcessOutcome) -> bool
```

Reports whether a signal terminated the child instead of an exit code.

::Anchor{id="ChildProcess.impl.exitCode"}

### Associated function `exitCode`

```silk
pub fn exitCode(outcome: &ProcessOutcome) -> Option<i32>
```

Returns the exit code, or `None` when a signal terminated the child.

::Anchor{id="ChildProcess.impl.terminatingSignal"}

### Associated function `terminatingSignal`

```silk
pub fn terminatingSignal(outcome: &ProcessOutcome) -> Option<i32>
```

Returns the terminating signal number, or `None` when the child returned an exit code.

::Anchor{id="ChildProcess.impl.outputBytes"}

### Associated function `outputBytes`

```silk
pub fn outputBytes(outcome: &ProcessOutcome) -> &[u8]
```

Borrows the complete captured standard output without consuming the outcome.

::Anchor{id="ChildProcess.impl.errorBytes"}

### Associated function `errorBytes`

```silk
pub fn errorBytes(outcome: &ProcessOutcome) -> &[u8]
```

Borrows the complete captured standard error without consuming the outcome.

::Anchor{id="ChildProcess.impl.submit"}

### Associated function `submit`

```silk
pub effect fn submit(
    request: &ProcessRequest
  ) -> ProcessOutcome ! ProcessError | OutOfMemoryError ? &mut ChildProcess | &mut Allocator
```

Runs the active [`ChildProcess`](#ChildProcess) provider for one request.

#### Details

This wrapper preserves the service contract: it blocks, closes child input, and returns complete
owned captures. It requires exclusive child-process and allocator providers.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
