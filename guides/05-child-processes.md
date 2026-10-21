# Child processes

This guide builds `runcheck`, which runs a handful of other programs and reports how each one ended. Along the way you pass arguments without a shell, give a child its environment, read its output and error streams, tell an exit code from a signal, choose a working directory, and handle a program that cannot start.

```sh
silk init runcheck
cd runcheck
```

## How a child runs

The `ChildProcess` service from `silk/child_process` has one operation: run a `ProcessRequest` to the end and return a `ProcessOutcome`. The native provider is `OsChildProcess` from `silk/os_child_process`. The model is deliberately simple:

- **No shell.** The request names an executable and a list of arguments. Spaces, quotes, `$` and `*` in an argument are data, never syntax.
- **No inherited environment.** A request starts with an empty environment. The child sees only the variables you set.
- **Standard input is closed.** The child reads end of input at once.
- **Output is captured whole.** `ChildProcess.submit` blocks until the child ends, then returns everything it wrote to standard output and standard error as two `Bytes` values.
- **The exit code is data.** A child that exits with 3 is a successful run that returned 3. Only a failure to start, wait or capture is a `ProcessError`.

There is no streaming in either direction. You cannot write to the child's standard input or read its output while it runs. A child that writes a lot of output keeps all of it in memory until it exits.

## Building a request

`ChildProcess.request(&path)` makes a request for one program. The path is a `Path` from `silk/filesystem`, and here it is the real path on the host. There is no search through `PATH`, so name the program in full: `/bin/echo`, not `echo`. `Path.make("echo")` fails with "invalid path", because a `Path` is always absolute.

```silk
// A request for `program` with no arguments.
effect fn bare(program: string) -> ProcessRequest ! FileError | OutOfMemoryError ? &mut Allocator {
  let path = run Path.make(program)
  return run ChildProcess.request(&path)
}

// A request for `program` with the given arguments, in order.
effect fn command(program: string, args: &[&[u8]]) -> ProcessRequest ! FileError | OutOfMemoryError ? &mut Allocator {
  let mut request = run bare(program)
  let mut index: usize = 0
  while index < args.length {
    run ChildProcess.addArgument(&mut request, args[index])
    index = index + 1
  }
  return move request
}
```

`ChildProcess.addArgument(&mut request, bytes)` appends one argument. Arguments are bytes, not text, so a value you got from the host can be passed on unchanged. The one rule: no NUL byte in an argument, a variable name or a value. The request uses NUL to separate entries.

`addArgument` and `setVariable` are declared on `ChildProcess`, not on `ProcessRequest`, so call them as `ChildProcess.addArgument(&mut request, ...)`. `request.addArgument(...)` is SEM0010, "A known actor called with an unknown operation name".

`bare` exists because `command("/bin/cat", &[])` does not compile. An empty array literal needs a type, and in this release even an annotated `let none: [&[u8]; 0] = []` is rejected with SEM0029.

## Reading the outcome

`report` runs a request and prints how it ended:

```silk
// Runs one request and reports how the child ended and what it wrote.
effect fn report(title: string, request: &ProcessRequest) -> ()
! ProcessError | OutOfMemoryError | LogError
? &mut ChildProcess | &mut Allocator | &mut Logger {
  run Effect.log("{title}\n", &.{ title: title })
  let outcome = run ChildProcess.submit(request)
  match &outcome.value {
    Exited ended => {
      run Effect.log("  exit code {code}\n", &.{ code: ended.code })
    }
    Signaled ended => {
      run Effect.log("  killed by signal {signal}\n", &.{ signal: ended.signal })
    }
  }
  run showStream("stdout", ChildProcess.outputBytes(&outcome))
  run showStream("stderr", ChildProcess.errorBytes(&outcome))
}
```

`ProcessOutcome.value` is `Exited | Signaled`. An exit code and a signal number are separate types, so you can't mistake one for the other. If you only want the code, `ChildProcess.exitCode(&outcome)` returns `Option<i32>`, which is `None` for a signal, and `ChildProcess.terminatingSignal` is the reverse.

`outputBytes` and `errorBytes` borrow the captured streams. They are bytes, because a child can write anything. `showStream` checks for UTF-8 before printing:

```silk
// Shows what a child printed. Output is bytes; only valid UTF-8 is shown as text.
effect fn showStream(label: string, bytes: &[u8]) -> () ! LogError ? &mut Logger {
  if bytes.length == 0 {
    return ()
  }
  match String.fromUtf8(bytes) {
    Result.Success { value } => {
      run Effect.log("  {label}: {text}", &.{ label: label, text: value })
    }
    Result.Failure { .. } => {
      run Effect.log("  {label}: {count} bytes, not UTF-8\n", &.{ label: label, count: bytes.length })
    }
  }
}
```

`submit` needs the allocator, since the captures are owned `Bytes`, and it can fail with `OutOfMemoryError` when they can't be stored.

## Process errors

A program that does not exist never produces an outcome. `submit` fails with a `ProcessError` instead. Like `FileError`, it carries an `operation` (the stage: spawn, wait or capture) and a `reason`, each a small struct with a `code`:

```silk
fn reasonText(reason: &ProcessReason) -> string<'static> {
  let code = reason.code
  if code == ChildProcess.reasonCode(ChildProcess.notFound()) {
    return "no such program"
  }
  if code == ChildProcess.reasonCode(ChildProcess.permissionDenied()) {
    return "permission denied"
  }
  return "could not run it"
}
```

The portable reasons are `notFound`, `permissionDenied`, `invalidRequest`, `noSpace`, `unsupported` and `other`. `ChildProcess.providerCode(&error)` gives the native error number, when there is one.

`tryRun` expects that a start may fail. `Effect.result` turns the outcome of `report` into a `Result`, so the failure can be matched like any value:

```silk
// Runs a request whose failure to start is expected and reported.
effect fn tryRun(title: string, request: &ProcessRequest) -> ()
! OutOfMemoryError | LogError
? &mut ChildProcess | &mut Allocator | &mut Logger {
  let attempt = run Effect.result(report(title, request))
  match move attempt {
    Result.Success { .. } => {}
    Result.Failure { error } => {
      match move error {
        ProcessError problem => {
          run Effect.log("  failed to start: {reason}\n", &.{ reason: reasonText(&problem.reason) })
        }
        OutOfMemoryError held => {
          fail move held
        }
        LogError held => {
          fail move held
        }
      }
    }
  }
}
```

`ProcessError` is gone from `tryRun`'s failure row: it is handled here. The other two failures are passed on.

On Linux, a child that fails to start reports the error back to the parent over a pipe. If that report can't be written at all, the parent sees the same thing as a program that started and exited with 127. This is rare, but it means exit code 127 can also mean "did not start".

## Seven children

`demo` runs one request for each case:

```silk
effect fn demo() -> ()
! ProcessError | FileError | OutOfMemoryError | LogError
? &mut ChildProcess | &mut Allocator | &mut Logger {
  // Arguments are passed as they are. Nothing is split or expanded.
  let echo = run command("/bin/echo", &[b"two  spaces", b"$HOME", b"*.silk"])
  run report("echo", &echo)

  // The environment starts empty. The child sees only what you set.
  let mut env = run bare("/usr/bin/env")
  run ChildProcess.setVariable(&mut env, b"GREETING", b"hello")
  run ChildProcess.setVariable(&mut env, b"LANG", b"C")
  run report("env", &env)

  // A nonzero exit is a normal outcome, with both streams captured.
  let failing = run command("/bin/sh", &[b"-c", b"echo working; echo 'disk full' >&2; exit 3"])
  run report("sh exit 3", &failing)

  // A child killed by a signal is reported differently from an exit code.
  let killed = run command("/bin/sh", &[b"-c", b"kill -TERM $$"])
  run report("sh kill", &killed)

  // The child's standard input is closed, so cat sees the end at once.
  let cat = run bare("/bin/cat")
  run report("cat", &cat)

  // The working directory is inherited unless you choose one.
  let program = run Path.make("/bin/pwd")
  let directory = run Path.make("/tmp")
  let pwd = run ChildProcess.requestWithin(&program, &directory)
  run report("pwd in /tmp", &pwd)

  // A program that does not exist is a ProcessError, not an outcome.
  let missing = run bare("/usr/bin/no-such-tool")
  run tryRun("missing", &missing)
}

pub effect fn main() -> () ! ProcessError | FileError | OutOfMemoryError | LogError {
  let mut processes = OsChildProcess.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut logger = StdoutLogger.make()
  run demo()
    |> Effect.provideMut<ChildProcess>(&mut processes)
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Logger>(&mut logger)
}
```

When you need a shell feature such as a pipe or a redirect, run `/bin/sh` with `-c` and the script as one argument, as the third and fourth requests do. Then the shell's quoting rules apply to that script, so never build it from untrusted input.

`ChildProcess.setVariable` appends one `name=value` entry. To pass on a variable of your own process, read it with `HostInput.variable` and set it on the request. `ChildProcess.requestWithin(&program, &directory)` picks the working directory.

The imports:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.child_process { ChildProcess, Exited, ProcessError, ProcessOutcome, ProcessReason, ProcessRequest, Signaled }
import silk.effect { Effect }
import silk.filesystem { FileError, Path }
import silk.logger { Logger, LogError }
import silk.os_child_process { OsChildProcess }
import silk.os_logger { StdoutLogger }
import silk.result { Result }
import silk.string { String }
```

## Run it

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/runcheck (llvm, x86_64-unknown-linux-gnu, 428 symbols)
echo
  exit code 0
  stdout: two  spaces $HOME *.silk
env
  exit code 0
  stdout: GREETING=hello
LANG=C
sh exit 3
  exit code 3
  stdout: working
  stderr: disk full
sh kill
  killed by signal 15
cat
  exit code 0
pwd in /tmp
  exit code 0
  stdout: /tmp
missing
  failed to start: no such program
```

Read it from the top:

- `echo` got three arguments and printed them as given. The double space survived, and `$HOME` and `*.silk` were not expanded, because no shell was involved.
- `env` printed the two variables you set and nothing else. Its output has two lines, and the second one starts at the left edge.
- The shell script wrote to both streams and exited with 3. The run still succeeded; the 3 is data.
- `kill -TERM $$` ended the shell with signal 15, which is reported as `Signaled`, not as an exit code.
- `cat` read from a closed standard input, so it exited at once with no output.
- `pwd` ran in `/tmp`.
- The missing program produced a `ProcessError` with reason "not found".

## Testing without real processes

`ChildProcess` is a service, so a test can replace `OsChildProcess` with a provider that returns canned outcomes. Implement `execute` and build the result with `ChildProcess.exited(code, output, errors)` or `ChildProcess.signaled(signal, output, errors)`. To test the failure path, `fail ChildProcess.failure(ChildProcess.spawnOperation(), ChildProcess.notFound())`. The request's `program()`, `arguments()` and `environment()` let the fake check what it was asked to run. The guide "Testing with providers" shows the pattern in full.

## API reference

- `silk/child_process`: `ChildProcess`, `ProcessRequest`, `ProcessOutcome`, `Exited`, `Signaled`, `ProcessError`, `ProcessReason`, `ProcessOperation`
- `silk/os_child_process`: `OsChildProcess`
- `silk/filesystem`: `Path`, `FileError`
- `silk/host_input`: `HostInput` (`variable`)
- `silk/effect`: `Effect` (`result`)
- `silk/string`: `String`
- `silk/bytes`: `Bytes`
