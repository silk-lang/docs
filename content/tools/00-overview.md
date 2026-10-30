# Silk: Tools

## Overview

The `silk` command does more than compile. This section covers the tools around the compiler: how to run them, test and format code, read errors, document a package, version it, and debug a program.

- **Command-line reference**: every `silk` command and option, the environment variables it reads, and its exit statuses.
- **Testing**: write test functions and run them with `silk test`, with filters, targets and workspaces.
- **Formatting**: rewrite source in the standard layout with `silk format`, and enforce it in CI with `--check`.
- **Diagnostics and silk check**: read a compiler error and the progress rows, what the code families mean, find slow modules, and get diagnostics as JSON.
- **Writing documentation**: doc comments, the standard headings, links to declarations, and examples.
- **Doc tests and reference generation**: extract documentation with `silk doc`, check its examples with `silk doctest`, and generate the std lib reference.
- **Changesets and releases**: record changes, choose versions, write the changelog and publish notes with `silk change`.
- **Debugging**: read trap reports and unhandled errors on native targets, WASI and JavaScript hosts, run a program under LLDB with `silk debug`, and write WASI core dumps.
