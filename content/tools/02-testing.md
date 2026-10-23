# Testing

A Silk test is a function marked `test`. It lives in the same file as the code it tests, and `silk test` finds it, builds a test runner and reports each result. This page covers writing tests, choosing which ones run, and testing code that uses services by handing it fake providers.

## Write a test

Mark a function with `test`. A plain `test fn` passes when it returns. A `test effect fn` can fail, and the usual way to make it fail is `Testing.expect` from `silk/testing`:

```silk
import silk.testing { AssertionError, Testing }

/// The sum of `left` and `right`.
pub fn add(left: i32, right: i32) -> i32 {
  return left + right
}

test effect fn addsTwoNumbers() -> ()
  ! AssertionError<'static> {
  run Testing.expect(add(2, 3) == 5, "2 + 3 is 5")
}
```

This is the `src/lib.silk` that `silk init --lib` writes. `Testing.expect(condition, message)` does nothing when the condition is true and fails with an `AssertionError` when it is false. The message is a string literal, so the failure row says `AssertionError<'static>`.

A test effect may fail with any typed failure, not only `AssertionError`. List every failure it can raise in its `!` row, as for any effect. The `-> ()` is optional.

A test function has a fixed shape. It is declared at the top level of a module, has no parameters and no generic parameters, returns `()`, and is not `static`, `unsafe` or `extern`. Anything else is SEM0218:

```silk
test fn withParam(x: i32) {
}
```

```
src/main.silk:1:19: error[SEM0218] A `test` qualifier marks a function outside the finite executable test contract
```

`pub test fn` is allowed. Outside `silk test`, a test is checked like any other function, so `silk check` reports its errors too.

## Run the tests

```sh
silk test
```

```
  Circle::diameterIsTwiceRadius
    PASS  <1 us
  lib::areaMultipliesSides
    PASS  <1 us
  lib::emptyRectHasNoArea
    PASS  1 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   50 us
```

The runner is a separate executable, built under `build/test/llvm/<target>/<profile>/` with the package's name. It always runs on the host, so `--target` must name the host. Each test is printed as `module::name`, where the module is the file's path under the source root: `Circle` is `src/Circle.silk`.

While it builds the runner, `silk test` prints no progress rows, unlike `silk build`. A compile error is printed as its diagnostic line, and the command exits 1 without running any test.

The summary line counts tests at each stage. Discovered tests were found by the compiler, selected ones passed the filters, and executed ones ran. Cached is always 0 in this release. The command exits 0 when every selected test passed. Without `--file` or `--filter`, that includes a package with no tests.

## When a test fails

Change the expectation in `Circle.silk` so it is wrong, and run again:

```silk
test effect fn diameterIsTwiceRadius() -> () ! AssertionError<'static> {
  run Testing.expect(diameter(5) == 11, "radius 5")
}
```

```
  Circle::diameterIsTwiceRadius
    assertion failed: radius 5
    FAIL  15 us
  lib::areaMultipliesSides
    PASS  <1 us
  lib::emptyRectHasNoArea
    PASS  <1 us

Tests  2 passed, 1 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   60 us
```

The other tests still run, and the command exits with status 1. When the failure is an `AssertionError`, the runner prints `assertion failed:` and the message you passed to `expect` under the test's name, so write the message as the expected fact. A test that fails with another typed failure prints `FAIL`, and an `unhandled error` trace on standard error names that failure's type and the line where it was created.

A test that traps, for example on an index out of bounds, stops the runner process. `silk test` shows the trap report under the test's name, marks the test `FAIL  stopped the test process`, and starts the runner again after it, so the remaining tests still run and the command exits with status 1:

```
  lib::readsPastTheEnd
fatal trap: index out of bounds
  at lib.readsPastTheEnd (lib:18:11)
    FAIL  stopped the test process
  lib::sumsTheValues
    PASS  <1 us
```

## Which tests are discovered

`silk test` does not scan the source folder. It starts at the package's root module, the `root` in `silk.toml`, and follows imports, the same way `silk check` does. In a library, every module listed in `exports` is a starting point too. A test in a file that nothing imports is never discovered.

That matters most for programs. A test in `src/extra.silk` is not found while `main.silk` does not import `extra`. Two ways to reach it:

- Start discovery from that file with `--root`. The path is relative to the package directory and must be under the source root:

  ```sh
  silk test --root src/extra.silk
  ```

  ```
    extra::extraRuns
      PASS  <1 us
  
  Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 1 discovered)
  Time   28 us
  ```
- Import the test module from the root module, for example `import tests` in `main.silk`, so a plain `silk test` finds it. Chapter 12 of the book uses this layout, with tests in `src/tests.silk` and helpers in `src/tests/`.

## Choose which tests run

`--filter <text>` keeps the tests whose printed name, `module::name`, contains the text. Case is ignored for ASCII letters, so `--filter circle::` selects every test in `Circle`:

```sh
silk test --filter circle::
```

```
  Circle::diameterIsTwiceRadius
    PASS  1 us

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 3 discovered)
Time   58 us
```

`--file <path>` keeps the tests declared in one source file. The path is relative to the package directory, so it is `src/Circle.silk` even when you run the command from inside `src/`. Unlike `--root`, it does not change discovery; it only selects.

Both options only select. When a `--file` or `--filter` matches no test, nothing was verified, so the command fails with exit status 1. A misspelled filter prints:

```
Tests  0 passed, 0 failed (0 cached, 0 executed, 0 selected, 3 discovered)
Time   5 us
silk test: no tests matched the --file or --filter selection
```

## Test code that uses services

Code that logs, reads files or asks for the time names those services in its `?` row. In a test, you provide fakes instead of the real providers. The function never knows the difference.

This program greets names through the `Logger` service and skips empty ones:

```silk
import silk.effect { Effect }
import silk.logger { LogError, Logger }
import silk.os_logger { StdoutLogger }
import silk.testing { AssertionError, Testing }

// Greets each name, skipping empty ones. Returns how many it greeted.
effect fn greetAll(names: &[string]) -> i32
  ! LogError
  ? &mut Logger {
  let mut greeted = 0
  let mut at: usize = 0
  while at < names.length {
    if names[at] != "" {
      run Effect.log("hello, {name}\n", &.{ name: names[at] })
      greeted = greeted + 1
    }
    at = at + 1
  }
  return greeted
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let names = ["Ada", "", "Grace"]
  drop run greetAll(&names) |> Effect.provideMut<Logger>(&mut logger)
}

test effect fn emptyNamesAreSkipped()
  ! AssertionError<'static> | LogError {
  let mut logger = Logger.inMemoryProvider()
  let names = ["Ada", "", "Grace"]
  let greeted = run greetAll(&names) |> Effect.provideMut<Logger>(&mut logger)
  run Testing.expect(greeted == 2, "two names greeted")
  run Testing.expect(Logger.length(&logger) == 2, "two lines logged")
}

test effect fn onlyEmptyNamesLogNothing()
  ! AssertionError<'static> | LogError {
  let mut logger = Logger.inMemoryProvider()
  let names = ["", ""]
  let greeted = run greetAll(&names) |> Effect.provideMut<Logger>(&mut logger)
  run Testing.expect(greeted == 0 && Logger.length(&logger) == 0, "nothing logged")
}
```

`main` provides `StdoutLogger`, so `silk run` prints:

```
hello, Ada
hello, Grace
```

The tests provide `Logger.inMemoryProvider()`, which keeps the lines instead of printing them. `provideMut` lends the provider to one computation and gives it back, so the test can then ask it how many lines arrived:

```sh
silk test
```

```
  main::emptyNamesAreSkipped
    PASS  6 us
  main::onlyEmptyNamesLogNothing
    PASS  <1 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   45 us
```

The same pattern works for any service. A fake for a service with no ready-made test provider is your own struct with an `impl` of the service, like the fixed clock and in-memory file system in chapter 8 of the book. The **Testing with providers** guide goes further, and **Services and providers** in the language reference has the rules.

Provide every service inside the test. The test runner provides none, so a test cannot have a `?` row of its own, and `silk check` refuses one:

```silk
test effect fn copies() -> () ! OutOfMemoryError ? &mut Allocator {
  let text = run String.copy("hi")
}
```

```
src/main.silk:4:50: error[SEM0218] Invalid test declaration: a test cannot have a requirement row; the test runner provides no services, so provide them inside the test
```

For memory, create an allocator in the test with `Allocator.systemAllocatorProvider()` and provide it to the calls that need it.

## Tests in a workspace

Each package tests its own modules. At a workspace root, `silk test` runs every member in dependency order, with a `Package` heading for each and a `Workspace summary` line at the end. `-p <name>` picks members and `--workspace` selects them all from inside a member. `--root` and `--file` name files of one package, so with several members selected they need `-p`. See **Workspaces** in Projects and packages.

## Summary

- Mark a top-level function with `test`. Use `test effect fn` and `Testing.expect` for checks that can fail.
- Run tests with `silk test`. A failure prints `FAIL` and the `expect` message for an assertion; a trapping test fails too and the rest still run. Any failure exits 1.
- Tests are discovered by following imports from the root module (and a library's exports). Use `--root` or an import to reach other files.
- `--filter` matches `module::name` without regard to ASCII case; `--file` selects one file. A selection that matches nothing exits 1.
- Test effectful code by providing fakes such as `Logger.inMemoryProvider()` with `Effect.provideMut`, and provide every service inside the test: a test has no `?` row (SEM0218).

## API reference

- `silk/testing`: `Testing.expect`, `AssertionError`, and `Testing.matchesQualified` for custom runners
- `silk/logger`: `Logger.inMemoryProvider`, `Logger.length`, `InMemoryLogger`
- `silk/effect`: `Effect.provideMut`, `Effect.result`
- `silk/allocator`: `Allocator.systemAllocatorProvider`
