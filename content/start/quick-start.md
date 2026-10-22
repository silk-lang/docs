Create a package and run it:

```sh
silk init hello && cd hello
silk run
```

```console
Hello, world!
```

`silk init` writes a `silk.toml` and a `src/main.silk`. Even "hello world" names what it needs:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello, world!", &()) |> Effect.provideMut(&mut logger)
}
```

`main` is an effect function: it may fail with `LogError`, and it builds the `StdoutLogger` that `Effect.log` needs, then provides it with `Effect.provideMut`. Nothing writes to standard output unless something hands it a logger.

## Next steps

- Take [the short tour](/docs/start/tour) for services, tests, ownership, unions and compile-time selection.
- Read about the [tools](/docs/start/tools) that come with the compiler.
