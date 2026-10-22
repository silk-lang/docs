# The standard library

The standard library is the package `silk`. Every package can import its modules with no `[dependencies]` entry. It ships with the compiler and is found next to it.

## Importing

- Std lib modules are named `silk.<module>`: `import silk.list { List }`, `import silk.http_client as HttpClient`.
- Module names use underscores between words: `silk.http_client`, `silk.os_logger`, `silk.hash_map`. The file is `silk/http_client.silk` in the std lib directory.
- Each module page in the Std lib API reference ends its overview with the recommended import line, for example: Import as `HttpClient` with `import silk.http_client as HttpClient`. That page's title is the module's path, `silk/http_client`.
- Primitive modules hold the operations of a primitive type. `import silk.usize` binds the module `usize`, so `usize.ZERO` and `usize.add(...)` work.
- The import forms and rules are the same as for your own modules. See **Modules and imports**.

| You want | Import |
| --- | --- |
| A growable list | `import silk.list { List }` |
| Effects and `run` helpers | `import silk.effect { Effect }` |
| Logging to standard output | `import silk.logger { LogError }`, `import silk.os_logger { StdoutLogger }` |
| Test assertions | `import silk.testing { AssertionError, Testing }` |
| Build facts (target, profile) | `import silk.target { Target }`, `import silk.compilation { Compilation }` |

## Where it is found

- An installed compiler at `<prefix>/bin/silk` uses `<prefix>/lib/silk/stdlib`. With the default install, that is `/home/you/.silk/lib/silk/stdlib`.
- The compiler finds itself from the command that started it, following symbolic links. A `silk` linked into another `bin` directory still finds its own std lib.
- `--stdlib <directory>` on `build`, `run`, `check` and `test` uses another std lib directory instead.
- The directory holds `silk/` (the modules), `intrinsic/`, `manifest.json` (each module's path and import namespace) and `compositions.json` (the runtime catalog; see **Build outputs and native linking**).

`silk` checks a `--stdlib` directory before it builds. One that does not exist, or that has no `compositions.json`, stops the command with exit status 1. A relative path is shown resolved against the current directory:

```
silk: --stdlib /home/you/hello/nope is not a standard library directory: it does not exist
silk: --stdlib /tmp is not a standard library directory: it has no compositions.json
```

## Reserved names

- `silk` and `Intrinsic` are reserved. A dependency cannot use either name:

```
silk: invalid dependency `silk` of app@0.1.0: the name is reserved for the toolchain
```

- An import path that starts with `silk.` always means the std lib. `import silk.nope` is MOD0001: `Unknown module silk.nope`.
- A package cannot have a module named `silk` or `Intrinsic` at the top of its source root, as a file (`src/silk.silk`) or a folder (`src/silk/extra.silk`). The package is refused before anything is checked, even if nothing imports the module, and the command exits with status 1:

```
silk: invalid module /home/you/hello/src/silk of hello@0.1.0: `silk` and `Intrinsic` are reserved module names (`silk.` imports name the standard library and `Intrinsic` the compiler's intrinsics); rename it
```

- `Intrinsic` is the compiler's own namespace. It needs no import, and no declaration may take its name. Any import whose path starts with `Intrinsic`, as in `import Intrinsic { replace }` or `import Intrinsic.helpers { hi }`, is MOD0004:

```
/home/you/hello/src/main.silk:1:8: error[MOD0004] Module Intrinsic cannot be imported: `Intrinsic` is reserved for compiler intrinsics, which are written `Intrinsic.<name>` without an import
```

Write `Intrinsic.replace(...)` with no import instead. The one importable module is `Intrinsic.application`. See **Intrinsics** in the reference.

## The surface depends on the target

A module can offer different declarations on different targets. The Std lib API reference documents six profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`, the two Linux targets without libc (`-no-libc`), and `wasm32-unknown-unknown`. A module with more than one surface has one page per surface, such as `os-logger` and `os-logger.profile-2`. Each page lists its profiles.

- Most hosted providers, such as `silk.os_logger`, `silk.os_filesystem`, `silk.native_filesystem` and `silk.native_report`, have no public declarations on the no-libc and wasm profiles. The Profiles column of the API reference index shows each module's surfaces.
- `silk.raw_linux`, `silk.raw_process_inputs` and `silk.raw_start` exist only on the no-libc Linux profiles.

The program from `silk init` checks on every hosted target, and fails on wasm because `StdoutLogger` does not exist there:

```sh
silk check --target wasm32-unknown-unknown
```

```
Checking hello (wasm32-unknown-unknown)
  load     50 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.05s
[wasm32-unknown-unknown]
/home/you/hello/src/main.silk:3:25: error[SEM0014] Module silk/os_logger has no member StdoutLogger
Failed hello in 0.11s
```

Use `silk check --target <name>` to see what a target offers before you build for it. See **Targets and profiles**.

## See also

Modules and imports, Targets and profiles; **Intrinsics** and **Static control flow and reflection** in the reference; the Std lib API reference index.
