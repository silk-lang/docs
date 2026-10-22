The `silk` command is the compiler and the tools around it, in one binary.

| Command                     | What it does                                                         |
| --------------------------- | -------------------------------------------------------------------- |
| `silk init`                 | Create a package with `silk.toml` and `src/main.silk`                |
| `silk build` / `silk run`   | Compile for one or more targets, in debug or `--release`             |
| `silk check`                | Check types, ownership and effects without building                  |
| `silk test`                 | Discover and run `test` declarations                                 |
| `silk format`               | Format source canonically, with `--check` for CI                     |
| `silk doc` / `silk doctest` | Extract documentation from `///` comments and compile their examples |
| `silk changes`              | Record changes, version packages and write release notes             |
| `silk clean`                | Remove build output                                                  |

## Changes and releases

`silk changes` records each contribution in its own `.changes/<random>.md`, so pull requests never edit a shared changelog. From a package directory:

```sh
silk changes add minor "Reads now return a future." --migration "Await read()."
silk changes status
silk changes version --tag beta
silk changes version
silk changes release --json
silk changes since 0.1.0 --json
```

Migration guidance is optional, but missing guidance is reported as unknown impact. Releases consume pending changes, update the package version, and write authoritative `.changes/releases/<version>.toml` records. `CHANGELOG.md` is regenerated from those records. These commands do not commit, tag, publish, or access Git.

`silk changes since` selects compiler upgrades from the project's `package.silk-version`, so you can read what changed before you upgrade.

## The standard library

The standard library is written in Silk and documented with `silk doc`. It includes:

- **Core:** `Effect`, `Result`, `Option`, `List`, `HashMap`, `Box`, `Shared`, strings, Unicode, formatting, and checked arithmetic for every scalar type.
- **Systems:** files, child processes, sockets, clocks, randomness, single-threaded fibers and schedulers, and WebAssembly start-up.
- **Data:** JSON and TOML, Base64, URIs, and Zstandard and DEFLATE/gzip decoding.
- **Network:** an HTTP client and server, a WebSocket server, connection pooling, and TLS with X.509 certificate path validation.
- **Crypto:** SHA-1, SHA-2 and SHA-3, HMAC, HKDF, AES-GCM, ChaCha20-Poly1305, X25519, and ECDSA P-256 and RSA signature verification.
