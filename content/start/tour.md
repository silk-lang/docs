A quick look at the parts of Silk that make it different. Each section stands on its own.

## Services and providers

A `service` declares operations. Any value can provide it through an `impl`, and `Effect.provide` hands that value to a computation.

```silk
service Clock {
  effect fn now() -> u64 ? &Clock
}

struct FixedClock { at: u64 }

impl Clock for FixedClock {
  effect fn now(self: &Self) -> u64 { return self.at }
}

struct Expired {}

effect fn expired(error: Expired) -> u64 { return 0 }

pub effect fn main() -> () ! LogError {
  let clock = FixedClock { at: 58 }
  let mut logger = StdoutLogger.make()
  let left = run Effect.catch<Expired>(remaining(100), expired)
    |> Effect.provide(&clock)
    |> Effect.provideMut(&mut logger)
}
```

```console
42 ticks left
```

`remaining` is the function from the [introduction](/docs/start/introduction). `Effect.catch<Expired>` takes `Expired` out of the error type. `main` still declares `LogError`, because nothing handled it.

## Tests swap the providers

`silk test` finds `test` declarations through the import graph. This one runs `remaining` against the fixed clock and the standard library's in-memory logger:

```silk
test effect fn reportsTheTimeLeft() -> () ! AssertionError<'static> | Expired | LogError {
  let clock = FixedClock { at: 58 }
  let mut logger = Logger.inMemoryProvider()
  let left = run remaining(100)
    |> Effect.provide(&clock)
    |> Effect.provideMut(&mut logger)
  run Testing.expect(left == 42 && Logger.length(&logger) == 1, "one log line, 42 ticks left")
}
```

```console
$ silk test --no-cache
  main::reportsTheTimeLeft
    PASS  19 us

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 1 discovered)
```

## Ownership and cleanup

```silk
import silk.ownership { Drop }

struct Connection { id: i32 }

impl Drop for Connection {
  fn drop(self: &mut Connection) -> () { return () }
}

fn peek(connection: &Connection) -> i32 { return connection.id }

fn close(connection: Connection) -> i32 { return connection.id }

pub fn main() -> i32 {
  let connection = Connection { id: 7 }
  let seen = peek(&connection)
  let closed = close(move connection)
  return seen + closed
}
```

`peek` borrows the connection. `close` takes ownership, so `drop` runs when `close` returns. Change the last line to `return seen + closed + connection.id` and the compiler stops you:

```console
src/main.silk:17:26: error[OWN0001] connection was moved and cannot be used again
```

## Unions and matching

Unions are structural, and a `match` has to cover every case.

```silk
struct Circle { radius: f64 }
struct Rect { width: f64 height: f64 }

fn area(shape: Circle | Rect) -> f64 {
  return match move shape {
    Circle c => 3.14159 * c.radius * c.radius
    Rect r => r.width * r.height
  }
}
```

## Compile-time selection

```silk
import silk.target { Target, Arch }

fn wordBits() -> u32 {
  static if Target.arch() == Arch.Wasm32 {
    return 32
  } else {
    return 64
  }
}
```

The condition is evaluated for the target being built. Only the chosen branch reaches the program, so nothing is checked at run time.
