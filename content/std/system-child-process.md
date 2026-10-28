Run another program, wait for it to end, and get its exit code and all of its output.

## When to use
Make a [`ProcessRequest`](#ProcessRequest) with [`ChildProcess.request`](#ChildProcess.impl.request), add arguments and environment
variables, and run it with [`ChildProcess.submit`](#ChildProcess.impl.submit). This is not a shell. Spaces, quotes, and
other special characters in an argument are passed to the program as they are.

## Details
Arguments and environment entries are bytes, kept in the order you add them. The environment of
the child starts empty: the child gets only the variables that you set. The child uses the
working directory of the caller, unless you use [`ChildProcess.requestWithin`](#ChildProcess.impl.requestWithin). Standard input
of the child is closed.

[`ChildProcess.submit`](#ChildProcess.impl.submit) blocks until the child ends. The [`ProcessOutcome`](#ProcessOutcome) owns all standard
output and standard error. An exit code that is not 0 is a normal outcome, not an error.

## Errors
- [`ProcessError`](#ProcessError) if the child cannot start, the wait fails, or the output cannot be captured.
- `OutOfMemoryError` if the `Allocator` cannot supply the request or the captured output.

## Gotchas
An argument, an environment name, or an environment value must not contain NUL. The request uses
NUL to separate entries.

## Examples
### Run a program with a test provider and read its exit code
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.system.child_process { ChildProcess, ProcessError, ProcessOutcome, ProcessRequest }
import silk.core.effect { Effect }
import silk.system.filesystem { FileError, Path }
import silk.option { Option }
import silk.num.usize

struct Completed {}

effect fn execute(self: &mut Completed, request: &ProcessRequest) -> ProcessOutcome
  ! ProcessError | OutOfMemoryError
  ? &mut Allocator {
  return ChildProcess.exited(
    usize.toI32(ChildProcess.argumentCount(request)),
    Bytes.make(),
    Bytes.make()
  )
}

impl ChildProcess for Completed {
  execute: Completed.execute
}

pub effect fn main() -> i32
  ! FileError | OutOfMemoryError | ProcessError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut provider = Completed {}
  let path = run Path.make("/usr/bin/git") |> Effect.provideMut<Allocator>(&mut allocator)
  let mut request = run ChildProcess.request(&path) |> Effect.provideMut<Allocator>(&mut allocator)
  run ChildProcess.addArgument(&mut request, "status")
    |> Effect.provideMut<Allocator>(&mut allocator)
  let outcome = run ChildProcess.submit(&request) |> Effect.provideMut<ChildProcess>(&mut provider)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move ChildProcess.exitCode(&outcome) {
    Option<i32>.Some { value } => value - 1
    Option<i32>.None => 1
  }
}
```

Import as `ChildProcess` with `import silk.system.child_process { ChildProcess }`.

Public declarations: 8.

::Anchor{id="ProcessOperation"}

## `ProcessOperation`

```silk
pub struct ProcessOperation
```

The step that failed, as recorded in a [`ProcessError`](#ProcessError): spawn, wait, or capture.

::Anchor{id="ProcessOperation.code"}

### Field `code`

```silk
pub code: i32
```

The stable numeric code for the provider-reported execution stage.

::Anchor{id="ProcessOperation.impl.Debug"}

## Implementation `Debug for ProcessOperation`

```silk
impl Debug for ProcessOperation
```

::Anchor{id="ProcessOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the code, such as `Spawn`, or the code when it has no name.

::Anchor{id="ProcessReason"}

## `ProcessReason`

```silk
pub struct ProcessReason
```

The portable reason for a [`ProcessError`](#ProcessError). Compare its code with the constructors such as
[`ChildProcess.notFound`](#ChildProcess.impl.notFound).

::Anchor{id="ProcessReason.code"}

### Field `code`

```silk
pub code: i32
```

The stable numeric code for the portable recovery category.

::Anchor{id="ProcessReason.impl.Debug"}

## Implementation `Debug for ProcessReason`

```silk
impl Debug for ProcessReason
```

::Anchor{id="ProcessReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the code, such as `NotFound`, or the code when it has no name.

::Anchor{id="ProcessError"}

## `ProcessError`

```silk
pub struct ProcessError
```

The error when a child process cannot start, cannot be waited for, or its output cannot be
captured.

### Details

Decide how to recover from `reason`. [`ChildProcess.providerCode`](#ChildProcess.impl.providerCode) gives a code from the
provider, such as an `errno` value, for diagnostics. A child that exits with a code other than 0
is a [`ProcessOutcome`](#ProcessOutcome), not this error.

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

::Anchor{id="ProcessError.impl.Debug"}

## Implementation `Debug for ProcessError`

```silk
impl Debug for ProcessError
```

::Anchor{id="ProcessError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `ProcessError { operation: Spawn, reason: NotFound, providerCode: 2 }`.
It leaves out `providerCode` when there is none.

::Anchor{id="ProcessRequest"}

## `ProcessRequest`

```silk
pub struct ProcessRequest
```

A request to run one program, with its arguments, environment, and working directory.

### Details

Arguments and environment entries are bytes, so a value from the host can go to the child
without changes. They keep the order in which you add them. The environment of the child
starts empty: the child gets only the variables that you set. The child uses the working
directory of the caller, unless the request comes from [`ChildProcess.requestWithin`](#ChildProcess.impl.requestWithin). This is
not a shell: spaces, quotes, and other special characters in an argument go to the program as
they are.

### Gotchas

The bytes must not contain NUL, because NUL separates the entries.

::Anchor{id="Exited"}

## `Exited`

```silk
pub struct Exited
```

A child that ended with an exit code.

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

A child that a signal ended.

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

How a child ended: with an exit code or by a signal, and its captured output.

### Details

Use [`ChildProcess.exitCode`](#ChildProcess.impl.exitCode) and [`ChildProcess.terminatingSignal`](#ChildProcess.impl.terminatingSignal). The exit code and the
signal are separate, so a signal number cannot be read as an exit code.

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

The effect that runs child processes: run another program, wait for it to end, and get its
exit code and all of its output.

### When to use

Make a [`ProcessRequest`](#ProcessRequest) with [`ChildProcess.request`](#ChildProcess.impl.request), add arguments and environment
variables, and run it with [`ChildProcess.submit`](#ChildProcess.impl.submit). This is not a shell. Spaces, quotes, and
other special characters in an argument are passed to the program as they are.

### Details

A provider implements `execute`. Callers use [`ChildProcess.submit`](#ChildProcess.impl.submit). Native programs use the
provider in `silk.system.child_process_native`.

::Anchor{id="ChildProcess.execute"}

### Operation `execute`

```silk
effect fn execute(
    request: &ProcessRequest
  ) -> ProcessOutcome ! ProcessError | OutOfMemoryError ? &mut ChildProcess | &mut Allocator
```

Runs `request`, waits until the child ends, and returns the outcome with all captured output.

#### Details

Standard input of the child is closed. An exit code other than 0 is a normal outcome.

#### Errors

- [`ProcessError`](#ProcessError) if the child cannot start, the wait fails, or the output cannot be
  captured.
- `OutOfMemoryError` if the `Allocator` cannot supply the captured output.

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

Returns a request to run `program`, with no arguments, an empty environment, and the working
directory of the caller.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the request.

::Anchor{id="ChildProcess.impl.requestWithin"}

### Associated function `requestWithin`

```silk
pub effect fn requestWithin(
    program: &Path,
    directory: &Path
  ) -> ProcessRequest ! OutOfMemoryError ? &mut Allocator
```

Returns a request to run `program` in `directory`, with no arguments and an empty environment.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the request.

::Anchor{id="ChildProcess.impl.addArgument"}

### Method `addArgument`

```silk
pub effect fn addArgument(
    self: &mut ProcessRequest,
    value: string
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Adds a copy of the text `value` as the next argument.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage. Do not use the request
  again, because it can contain part of the argument.

#### Gotchas

`value` must not contain NUL.

::Anchor{id="ChildProcess.impl.addArgumentBytes"}

### Method `addArgumentBytes`

```silk
pub effect fn addArgumentBytes(
    self: &mut ProcessRequest,
    value: &[u8]
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Adds a copy of `value` as the next argument. The bytes do not have to be valid UTF-8.

#### When to use

Use it for an argument that you got as bytes, such as a host path from `Path.rawBytes` or a
program argument, so you can pass it on without changes.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage. Do not use the request
  again, because it can contain part of the argument.

#### Gotchas

`value` must not contain NUL.

::Anchor{id="ChildProcess.impl.setVariable"}

### Method `setVariable`

```silk
pub effect fn setVariable(
    self: &mut ProcessRequest,
    name: string,
    value: string
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Adds the environment entry `name=value`, where `name` and `value` are text.

#### Details

The environment of the request starts empty. This function does not read the environment of
the caller. It does not check that `name` is a valid variable name.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage. Do not use the request
  again, because it can contain part of the entry.

#### Gotchas

`name` and `value` must not contain NUL.

::Anchor{id="ChildProcess.impl.setVariableBytes"}

### Method `setVariableBytes`

```silk
pub effect fn setVariableBytes(
    self: &mut ProcessRequest,
    name: &[u8],
    value: &[u8]
  ) -> () ! OutOfMemoryError ? &mut Allocator
```

Adds the environment entry `name=value`. The bytes do not have to be valid UTF-8.

#### When to use

Use it for a value that you got as bytes, such as a copy of a variable from `HostInput`, so
you can pass it on without changes.

#### Details

The environment of the request starts empty. This function does not read the environment of
the caller. It does not check that `name` is a valid variable name.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the storage. Do not use the request
  again, because it can contain part of the entry.

#### Gotchas

`name` and `value` must not contain NUL.

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

Runs `request` with the active provider, waits until the child ends, and returns the outcome.

#### Details

It blocks. Standard input of the child is closed. The outcome owns all standard output and
standard error. An exit code other than 0 is a normal outcome.

#### Errors

- [`ProcessError`](#ProcessError) if the child cannot start, the wait fails, or the output cannot be
  captured.
- `OutOfMemoryError` if the `Allocator` cannot supply the captured output.

Category: System.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
