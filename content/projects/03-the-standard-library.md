# The standard library

The standard library is the package `silk`. Every package can import its modules with no `[dependencies]` entry. It ships with the compiler and is found next to it.

## Importing

- Std lib modules are named `silk.<category>.<module>`: `import silk.collections.list { List }`, `import silk.http.client as HttpClient`.
- Module names use underscores between words: `silk.http.client`, `silk.io.logger_native`, `silk.collections.hash_map`. The file is `silk/http/client.silk` in the std lib directory.
- Each module page in the Std lib API reference ends its overview with the recommended import line, for example: Import as `HttpClient` with `import silk.http.client as HttpClient`. That page's title is the module's path, `silk/http/client`.
- Primitive modules hold the operations of a primitive type. `import silk.num.usize` binds the module `usize`, so `usize.ZERO` and `usize.add(...)` work.
- The import forms and rules are the same as for your own modules. See **Modules and imports**.

| You want | Import |
| --- | --- |
| A growable list | `import silk.collections.list { List }` |
| Effects and `run` helpers | `import silk.core.effect { Effect }` |
| Logging to standard output | `import silk.io.logger { LogError }`, `import silk.io.logger_native { StdoutLogger }` |
| Test assertions | `import silk.testing.testing { AssertionError, Testing }` |
| Build facts (target, profile) | `import silk.core.target { Target }`, `import silk.core.compilation { Compilation }` |

## Categories

Each module sits in one category directory under `silk/`:

| Category | What it holds |
| --- | --- |
| `collections` | `List`, `Bytes`, `HashMap`, `HashSet`, hashing, slice helpers |
| `compress` | DEFLATE encoding and decoding, gzip, Zstandard, XZ, LZMA and LZMA2 decoding, checksums, decode limits |
| `concurrency` | Fibers, schedulers, threads, thread pools, atomics, locks |
| `core` | `Option`, `Result`, `Effect`, operators, equality, ordering, reflection, target and build facts |
| `crypto` | Hashes (SHA-1, SHA-2, SHA-3, BLAKE2b, MD5), HMAC, HKDF, AES-GCM, ChaCha20-Poly1305, X25519, Ed25519, P-256, P-384, RSA |
| `encoding` | Base64, UUIDs |
| `http` | The HTTP client and server, messages, headers, HTTP/2 framing and HPACK, WebSockets |
| `io` | Writers, loggers, standard input, buffered streams |
| `json`, `toml` | Parsing, building and writing JSON and TOML |
| `mem` | Allocators, arenas, boxes, shared ownership, pointers, stacks |
| `net` | Socket addresses, sockets, name resolution |
| `num` | One module per number type, such as `silk.num.i32`, plus shared numeric operations |
| `platform` | The runtimes and system interfaces of each platform: `native`, `linux` (no libc), `wasm`, `wasi` |
| `simd` | Vectors, masks and CPU feature detection |
| `support` | The memory routines the compiler calls, such as `memcpy` |
| `system` | Files, child processes, clocks, randomness, program arguments and environment |
| `testing` | Test assertions and the test runner |
| `text` | `string`, `String`, characters, Unicode, formatting |
| `tls` | The TLS client, certificates and trust stores |
| `uri` | URIs, their parts and percent-encoding |

A module whose name ends in `_native` or `_wasi` is the provider for one kind of platform, as `silk.io.logger_native` provides `silk.io.logger` on hosted targets.

## Where it is found

- A compiler at `<prefix>/bin/silkc` uses `<prefix>/lib/silk/stdlib`. With the default install, each Silk version has its own: `/home/you/.silk/toolchains/0.1.0/lib/silk/stdlib`.
- The compiler finds itself from the command that started it, following symbolic links. A `silkc` linked into another `bin` directory still finds its own std lib.
- `--stdlib <directory>` on `build`, `run`, `check` and `test` uses another std lib directory instead.
- The directory holds `silk/` (the modules), `intrinsic/`, `host/` (helpers that run programs outside the compiler, such as `wasm-runner.mjs`), `wit/` (the WASI interfaces a `wasm32-wasip2` component uses), `manifest.json` (each module's path and import namespace) and `compositions.json` (the runtime catalog; see **Build outputs and native linking**).

`silk` checks a `--stdlib` directory before it builds. One that does not exist, or that has no `compositions.json`, stops the command with exit status 1. A relative path is shown resolved against the current directory:

```
silk: --stdlib /home/you/hello/nope is not a standard library directory: it does not exist
silk: --stdlib /tmp is not a standard library directory: it has no compositions.json
```

## Reserved names

- `silk` and `Intrinsic` are reserved. A dependency cannot use either name:

```
Invalid Silk project manifest /home/you/app/silk.toml:7: dependency `silk` of app@0.1.0: the name is reserved for the toolchain
```

- An import path that starts with `silk.` always means the std lib. `import silk.nope` is MOD0001: `Unknown module silk.nope`.
- A package cannot have a module named `silk` or `Intrinsic` at the top of its source root, as a file (`src/silk.silk`) or a folder (`src/silk/extra.silk`). The package is refused before anything is checked, even if nothing imports the module, and the command exits with status 2:

```
Checking hello (x86_64-unknown-linux-gnu)
  load     failed: 1 error                   0.00s
silk: invalid module /home/you/hello/src/silk of hello@0.1.0: `silk` and `Intrinsic` are reserved module names (`silk.` imports name the standard library and `Intrinsic` the compiler's intrinsics); rename it
Failed hello in 0.01s
```

- `Intrinsic` is the compiler's own namespace. It needs no import, and no declaration may take its name. Any import whose path starts with `Intrinsic`, as in `import Intrinsic { replace }` or `import Intrinsic.helpers { hi }`, is MOD0004:

```
src/main.silk:1:8: error[MOD0004] Module Intrinsic cannot be imported: `Intrinsic` is reserved for compiler intrinsics, which are written `Intrinsic.<name>` without an import
```

Write `Intrinsic.replace(...)` with no import instead. The one importable module is `Intrinsic.application`. See **Intrinsics** in the reference.

## The surface depends on the target

A module can offer different declarations on different targets. The Std lib API reference documents eight profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`, the two Linux targets without libc (`-no-libc`), `wasm32-unknown-unknown`, `wasm32-wasip1` and `wasm32-wasip2`. Each module page ends with the profiles its declarations exist on.

- Most hosted providers, such as `silk.io.logger_native` and `silk.system.filesystem_native`, exist on the hosted targets and on WASI, and have no public declarations on the no-libc Linux profiles or `wasm32-unknown-unknown`. `silk.platform.native.filesystem` and `silk.platform.native.report` are hosted only.
- The `_wasi` modules and `silk.platform.wasi.*` have public declarations only on the WASI profiles. Sockets, name resolution and HTTP (`silk.net.socket_wasi`, `silk.net.resolver_wasi`, `silk.net.datagram_wasi`, `silk.http.client_wasi`, `silk.http.server_wasi`) exist only on `wasm32-wasip2`.
- `silk.platform.linux.syscall`, `silk.platform.linux.process_inputs` and `silk.platform.linux.start` exist only on the no-libc Linux profiles.

The program from `silk init` checks on every hosted target and on WASI, and fails on `wasm32-unknown-unknown` because `StdoutLogger` does not exist there:

```sh
silk check --target wasm32-unknown-unknown
```

```
Checking hello (wasm32-unknown-unknown)
  load     136 modules, 1 in package         0.03s
  check    failed: 2 modules, 1 error        0.02s
[wasm32-unknown-unknown]
src/main.silk:3:32: error[SEM0014] Module silk.io.logger_native has no member StdoutLogger
Failed hello in 0.07s
```

Use `silk check --target <name>` to see what a target offers before you build for it. See **Targets and profiles**.

## See also

Modules and imports, Targets and profiles; **Intrinsics** and **Static control flow and reflection** in the reference; the Std lib API reference index.
