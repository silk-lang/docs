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
/home/you/hello/src/main.silk:1:19: error[SEM0218] A `test` qualifier marks a function outside the finite executable test contract
```

`pub test fn` is allowed. Outside `silk test`, a test is checked like any other function, so `silk check` reports its errors too.

## Run the tests

In this release, always pass `--no-cache`. Without it `silk test` prints a `SILK_GAP test-result-cache` line and exits with status 2 without running anything.

```sh
silk test --no-cache
```

```
Compiled src/lib.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/shapes (llvm, x86_64-unknown-linux-gnu, 506 symbols)
  Circle::diameterIsTwiceRadius
    PASS  <1 us
  lib::areaMultipliesSides
    PASS  <1 us
  lib::emptyRectHasNoArea
    PASS  <1 us

Tests  3 passed, 0 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   38 us
```

The runner is a separate executable, built under `build/test/llvm/<target>/<profile>/` with the package's name. It always runs on the host, so `--target` must name the host. Each test is printed as `module::name`, where the module is the file's path under the source root: `Circle` is `src/Circle.silk`.

The summary line counts tests at each stage. Discovered tests were found by the compiler, selected ones passed the filters, and executed ones ran. Cached is always 0 in this release. The command exits 0 when every selected test passed. Without `--file` or `--filter`, that includes a package with no tests.

## When a test fails

Change the expectation in `Circle.silk` so it is wrong, and run again:

```silk
test effect fn diameterIsTwiceRadius() -> () ! AssertionError<'static> {
  run Testing.expect(diameter(5) == 11, "radius 5")
}
```

```
Compiled src/lib.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/shapes (llvm, x86_64-unknown-linux-gnu, 506 symbols)
  Circle::diameterIsTwiceRadius
    FAIL  13 us
  lib::areaMultipliesSides
    PASS  <1 us
  lib::emptyRectHasNoArea
    PASS  <1 us

Tests  2 passed, 1 failed (0 cached, 3 executed, 3 selected, 3 discovered)
Time   85 us
unhandled error: silk/testing.AssertionError<'static>
  at silk/testing.Testing.expect (silk/testing:32:7)
  at Circle.diameterIsTwiceRadius (Circle:9:3)
  at silk/effect.Effect.flatMap (silk/effect:303:19)
```

The other tests still run, and the command exits with status 1. The trace after the summary shows where the failure came from: `Circle:9:3` is line 9, column 3 of `src/Circle.silk`. This release does not print the message you passed to `expect`, so the line number is what you go by. When one test effect checks several things, give each check its own line.

## Which tests are discovered

`silk test` does not scan the source folder. It starts at the package's root module, the `root` in `silk.toml`, and follows imports, the same way `silk check` does. In a library, every module listed in `exports` is a starting point too. A test in a file that nothing imports is never discovered.

That matters most for programs. A test in `src/extra.silk` is not found while `main.silk` does not import `extra`. Two ways to reach it:

- Start discovery from that file with `--root`. The path is relative to the package directory and must be under the source root:

  ```sh
  silk test --no-cache --root src/extra.silk
  ```

  ```
  Compiled src/extra.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/hello (llvm, x86_64-unknown-linux-gnu, 487 symbols)
    extra::extraRuns
      PASS  <1 us
  
  Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 1 discovered)
  Time   21 us
  ```
- Import the test module from the root module, for example `import tests` in `main.silk`, so a plain `silk test` finds it. Chapter 12 of the book uses this layout, with tests in `src/tests.silk` and helpers in `src/tests/`.

## Choose which tests run

`--filter <text>` keeps the tests whose printed name, `module::name`, contains the text. Case is ignored for ASCII letters, so `--filter circle::` selects every test in `Circle`:

```sh
silk test --no-cache --filter circle::
```

```
Compiled src/lib.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/shapes (llvm, x86_64-unknown-linux-gnu, 506 symbols)
  Circle::diameterIsTwiceRadius
    PASS  <1 us

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 3 discovered)
Time   34 us
```

`--file <path>` keeps the tests declared in one source file. The path is relative to the package directory, so it is `src/Circle.silk` even when you run the command from inside `src/`. Unlike `--root`, it does not change discovery; it only selects.

Both options only select. When a `--file` or `--filter` matches no test, nothing was verified, so the command fails with exit status 1. A misspelled filter prints, after the `Compiled` line:

```
Tests  0 passed, 0 failed (0 cached, 0 executed, 0 selected, 3 discovered)
Time   3 us
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
effect fn greetAll(names: &[string]) -> i32 ! LogError ? &mut Logger {
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

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  let names = ["Ada", "", "Grace"]
  drop run greetAll(&names) |> Effect.provideMut<Logger>(&mut logger)
}

test effect fn emptyNamesAreSkipped() ! AssertionError<'static> | LogError {
  let mut logger = Logger.inMemoryProvider()
  let names = ["Ada", "", "Grace"]
  let greeted = run greetAll(&names) |> Effect.provideMut<Logger>(&mut logger)
  run Testing.expect(greeted == 2, "two names greeted")
  run Testing.expect(Logger.length(&logger) == 2, "two lines logged")
}

test effect fn onlyEmptyNamesLogNothing() ! AssertionError<'static> | LogError {
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
silk test --no-cache
```

```
Compiled src/main.silk -> build/test/llvm/x86_64-unknown-linux-gnu/debug/greeter (llvm, x86_64-unknown-linux-gnu, 524 symbols)
  main::emptyNamesAreSkipped
    PASS  6 us
  main::onlyEmptyNamesLogNothing
    PASS  <1 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   39 us
```

The same pattern works for any service. A fake for a service with no ready-made test provider is your own struct with an `impl` of the service, like the fixed clock and in-memory file system in chapter 8 of the book. The **Testing with providers** guide goes further, and **Services and providers** in the language reference has the rules.

Provide every service inside the test. A test whose own header has a `?` row passes `silk check` but fails when `silk test` builds the runner, with an error that points into the std lib:

```
<silk>/lib/silk/stdlib/silk/test_runner.silk:207:18: error[SEM0121] A concrete specialization whose conditional requirements cannot be proved
```

For memory, create an allocator in the test with `Allocator.systemAllocatorProvider()` and provide it to the calls that need it.

## Tests in a workspace

Each package tests its own modules. At a workspace root, `silk test --no-cache` runs every member in dependency order, with a `Package` heading for each and a `Workspace summary` line at the end. `-p <name>` picks members and `--workspace` selects them all from inside a member. `--root` and `--file` name files of one package, so with several members selected they need `-p`. See **Workspaces** in Projects and packages.

## Summary

- Mark a top-level function with `test`. Use `test effect fn` and `Testing.expect` for checks that can fail.
- Run tests with `silk test --no-cache`. A failure prints `FAIL`, a stack with the failing line, and exits 1.
- Tests are discovered by following imports from the root module (and a library's exports). Use `--root` or an import to reach other files.
- `--filter` matches `module::name` without regard to ASCII case; `--file` selects one file. A selection that matches nothing exits 1.
- Test effectful code by providing fakes such as `Logger.inMemoryProvider()` with `Effect.provideMut`, and provide every service inside the test.

## API reference

- `silk/testing`: `Testing.expect`, `AssertionError`, and `Testing.matchesQualified` for custom runners
- `silk/logger`: `Logger.inMemoryProvider`, `Logger.length`, `InMemoryLogger`
- `silk/effect`: `Effect.provideMut`, `Effect.result`
- `silk/allocator`: `Allocator.systemAllocatorProvider`
