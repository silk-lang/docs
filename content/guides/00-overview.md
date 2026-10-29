# Silk: Guides

## Overview

Each guide covers one area of the standard library by building one small working program. It explains the choices the program makes, shows its real output, and ends with an API reference list of every module it used. The programs were compiled and run with this release. After a `silk run`, an output block shows only what the program printed; the build's progress rows, which `silk run` prints on standard error first, are left out. Where a feature is not finished yet, such as building for a target without libc, the guide says so and shows the message you get.

The guides sit between the book and the reference. The book teaches the language from the start, and the guides assume you have read its first chapters: effects, services and providers, typed failures. The language reference states the rules, and the std lib API reference lists every module, type and function. The guides show how those pieces fit together for one task, and point you to the API pages for the details. Simple lookups, such as integer types, hashing primitives and URI helpers, have no guide of their own; read their API pages.

1. **Text and formatting**: `string` and bytes, searching, splitting, trimming and slicing, checking and decoding UTF-8, normalization, reading numbers from text, and building text with `Format.format`.
2. **Collections**: lists, slices, hash maps and sets, `Bytes`, reserving capacity, and making your own types hashable and comparable.
3. **Output, logging and standard input**: writers and loggers as services, `StdoutLogger`, buffering standard output with `BufferedWriter`, and reading standard input.
4. **Files and directories**: the `FileSystem` service and `Path`, whole-file reads and writes, atomic writes, temporary directories and file errors.
5. **Child processes**: spawning a program with arguments and environment, capturing its output and error streams, exit codes and signals, the working directory, and process errors.
6. **Time and randomness**: system and monotonic clocks, durations, sleeping, and secure and seeded random numbers.
7. **Byte streams and buffering**: the `ByteDuplex` model, deadlines, buffered input and output, and copying between streams.
8. **Networking**: resolving addresses, connecting and listening with sockets, deadlines, and sockets on WASI.
9. **HTTP client**: the Http service and its native provider, building requests, reading responses, HttpError, deadlines, redirects, HTTPS, proxies from the environment, testing with a fake provider, and the lower-level modules, including HTTP/2.
10. **HTTP server and WebSockets**: accepting connections, reading requests within limits, routing, writing responses, and upgrading to a WebSocket.
11. **TLS, certificates and trust**: trust sources and snapshots, the system bundle and PEM files, certificate validation and TLS client connections.
12. **Cryptography**: hashing, HMAC and HKDF, authenticated encryption, key agreement and signatures.
13. **JSON and TOML**: value trees, streaming readers, typed codecs, codecs derived with reflection, and writing output.
14. **Encodings and compression**: Base64, URI parsing and percent-encoding, gzip, Zstandard, XZ and LZMA decoding, DEFLATE encoding, and UUIDs.
15. **No-libc Linux and WebAssembly**: the six targets and eight profiles, what changes without a C library, startup modules, bare WebAssembly and WASI modules, and reading the per-target API pages.
16. **Testing with providers**: replacing real providers with fakes and checking failures as well as successes.
17. **Concurrent I/O patterns**: many connections at once, parallel requests, producer and consumer fibers, and timeouts.
18. **Writing effect combinators**: effects that take effects, generic rows, your own retry and budget, and borrowing while an effect is alive.
