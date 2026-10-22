Silk is a systems language where every failure, requirement and resource is part of the type. It compiles to native code and WebAssembly through LLVM, with no garbage collector, no hidden allocation and no ambient I/O.

A function's signature tells you everything it can do: what it returns, how it can fail, and which services it needs. The compiler checks all of it, and cleanup runs at a point you can see in the source.

```silk
effect fn remaining(deadline: u64) -> u64 ! Expired | LogError ? &Clock | &mut Logger {
  let now = run Clock.now()
  if now > deadline { fail Expired {} }
  run Effect.log("{left} ticks left\n", &.{ left: deadline - now })
  return deadline - now
}
```

Read it as "returns a `u64`, may fail with `Expired` or `LogError`, and needs a `Clock` to read and a `Logger` to write to". The function doesn't know which clock or logger it gets. The caller decides, and a test can hand it fakes.

The compiler is written in Silk and builds itself.

## Why Silk

- **Typed failures.** `! E` lists every error a computation can raise. `fail` raises one, `Effect.catch` handles it, and the handled error leaves the type.
- **Requirements instead of globals.** Clocks, loggers, allocators, file systems, sockets and random sources are `service`s that a computation asks for with `? &Service`. Providers are ordinary values, so a test or a browser host swaps one in without mocking anything global.
- **Ownership without a runtime.** Values are affine: `move` transfers them, `&` and `&mut` borrow them, and `Drop` runs exactly once at a deterministic point. Using a value after it moved is a compile error.
- **Explicit allocation.** Allocation is never hidden. Anything that allocates asks for `? &mut Allocator`, and you choose which allocator it gets.
- **Compile-time evaluation.** `static` parameters, `let static` and `static if` run at compile time against the selected target, and only the chosen branch reaches the program.
- **Little compiler magic.** Compiler operations that source can call live in the sealed `Intrinsic` namespace. `Effect`, `Result`, `List`, logging and the file system are ordinary Silk in the standard library, and you can read them like your own code.

## Platforms

Native hosts are Apple Silicon macOS (`aarch64-apple-darwin`), x86-64 Linux (`x86_64-unknown-linux-gnu`) and ARM64 Linux (`aarch64-unknown-linux-gnu`). WebAssembly (`wasm32-unknown-unknown`) is an output target. Windows support is still ahead.

## Status

Silk is in alpha. The language is still being designed, and any API may change between releases. The language reference is prescriptive, and each rule says whether it is confirmed, a candidate or still open.

Every change has to build the compiler with itself twice in a row and get identical LLVM IR both times. It also has to run a shared corpus of programs with exactly the expected results.
