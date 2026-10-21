# Silk docs: to-do

Things in the docs that will need an update later, and the page each one touches. Tick an item once the docs follow it.

## Distribution

- [ ] **Homebrew and mise.** Install covers only install.sh and release archives today. silk#2038 added Homebrew and mise install instructions to the Silk repository; check them on a machine with brew and mise, then add them. Pages: Get started / Install, the book's chapter 1.
- [ ] **Other package managers.** AUR (`silk-lang-bin`), a Nix flake, and later .deb/.rpm and Homebrew core. The name `silk` is taken in Homebrew core and AUR, so the docs should say `silk-lang`. Page: Install.
- [ ] **Apple code signing.** Deferred. Install may need a Gatekeeper note until it lands.
- [ ] **Release version in examples.** The book and reference were verified on dev.8624 and then on main builds. Rerun all examples on the next release and update version strings and output.

## Tooling

- [ ] **Language server.** `silk lsp` is planned. Editor setup says highlighting works today and the language server is coming. Update Editor setup and the VS Code section when it ships.
- [ ] **doc-reference for user packages.** Planned. Tools / Doc tests and reference generation describes it as planned.
- [ ] **Generated appendix pages.** Keywords and Diagnostic codes are hand-written for now. Replace them when a silk command can generate them.
- [ ] **Intrinsic reference.** A generated page set for the Intrinsic namespace, linked from the Intrinsics reference page.
- [ ] **Links into the API reference.** Inline std lib mentions should link to generated anchors, with a link checker in the build.

## Language and std lib

- [ ] **`while let`.** Next loop form. Reference / Control flow, plus the book wherever a `while` loop walks a collection.
- [ ] **Design issues #2009 to #2012.** Generic enums, `Effect` fields, the Shared trap message, `provides` access. Update the reference pages once each is decided.
- [ ] **LIFE-004 precision (#1953).** If the rule changes, revisit Reference / Lifetimes and the book's chapter 5.
- [ ] **Server-side TLS.** The std lib has client TLS only, and the book's chapter 13 says so. Update it and the TLS guide when a server lands.
- [ ] **HTTP client facade (silk#2014, merged Oct 20).** The new `silk.http_client` (`Http`, `NativeHttp`) is the common case; the old low-level module is now `silk.http_exchange`. The HTTP client guide is written against it. Check that no other page uses the old name.
- [ ] **wasm support.** Revisit the No-libc Linux and WebAssembly guide as wasm support grows.
- [ ] **Compiler fixes.** Each fix from the findings list that changes documented behaviour gets a pass on the affected pages.
- [ ] **Native threads, atomics and locks.** New in silk#2029 to silk#2039: `silk/atomic` (`Atomic`, `wait`, `notifyOne`, `notifyAll`), `silk/thread` (`Transferable`, `Concurrent`), `silk/native_thread` (`NativeThread`, `JoinHandle`), `silk/sync` (`Arc`, `Mutex`, `Parker`), and `Execution.makeTransferable` with `TransferableWake` in `silk/execution`. Only Fibers and scheduling points to them, and the Intrinsics page and the appendix list the atomic members and SEM0237. Needs a reference page (threads and thread properties), a guide, and a pass on the book's chapter 10 and the Concurrent I/O patterns guide, which say nothing runs in parallel (true of fibers only).

## Get started

- [ ] **First stable release.** Install says the installer falls back to the newest dev release. Recheck its output when a stable release ships.
- [x] **Clang version.** Install states Clang 22+, as install.sh requires, but builds worked with Clang 18. Settle the real minimum and update Install.
- [x] **`SILK_CLANG` errors.** Install quotes the current message for a bad path, which names neither the path nor the variable. Update it when the message improves.
- [ ] **Editor setup.** Update it when any of these happen: the VS Code extension reaches Open VSX, the Zed extension enters Zed's registry, the tree-sitter grammar is published to npm or crates.io, or the language server ships. Also add tested Neovim and Helix configs.
- [ ] **Zed outline.** The Zed extension's description promises an outline, but it has no `outline.scm`.

## Projects and packages

- [ ] **wasm32 and no-libc executables** (silk#2024, silk#2025). Targets and profiles, Build outputs and the No-libc Linux and WebAssembly guide document them as not buildable yet.
- [ ] **`shared-library` artifact.** Not implemented. Libraries and exports says so.
- [x] **Profile fields.** Fixed in silk#2040: `cpu` features, `codeModel = "large"` (x86-64) and `link = "static"` now reach Clang; sanitizers, native unwind, unchecked safety, multi threading and a non-default entry are refused. Targets and profiles, The manifest, and the Package parameters and Static control flow reference pages follow it.
- [ ] **Refused profile fields.** Update Targets and profiles when the native compiler builds sanitizers, native unwinding, unchecked safety, multi threading, entry selection or the large code model on arm64.
- [x] **Manifest and link errors.** Native link input errors are fixed (silk#2030). Unknown keys are refused with a line, and profile errors carry a location (silk#2040). The manifest page's error tables follow it.
- [ ] **Manifest errors without a line.** An unknown `[workspace]` key and a bad profile name still print no line, an unknown key in `[build.composition]` is accepted silently, and a bad `--profile-input` is reported as `Invalid Silk project manifest <path>:`. The manifest page and Targets and profiles document this. Update them when they change.
- [x] **`--clang` on package builds.** It only works on single-file builds today.

## Tools

- [ ] **`silk test --no-cache`.** Testing and several guides tell readers to pass it. Drop it once test caching works natively.
- [ ] **LEX codes.** `silk check` never reports them. Diagnostics and the Diagnostic codes appendix say so.
- [x] **Doc tests importing their own package.** They can't today; Doc tests and reference generation gives a workaround.
- [ ] **Doc JSON format.** It is marked experimental. Update the page if it changes.
- [ ] **`silk lsp`.** Add it to the Command-line reference when it lands.
- [ ] **Outline.** Drop the LAY code family from the outline; there is no such family.

## Guides

- [ ] **Std lib gaps.** These guides say what is missing today and should grow when it lands:
  - Text and formatting: Unicode categories, `Display` for `bool` and `char`.
  - Files and directories: an in-memory `FileSystem`.
  - Child processes: child stdin and streaming output.
  - Time and randomness: a duration and calendar type.
  - Concurrent I/O patterns: channels, race and timeout.
- [ ] **HTTP client.** Update it when content decoding or pooling lands in `silk.http_client`, and when `NativeHttp` stops blocking the thread. That also affects Concurrent I/O patterns.
- [ ] **TLS.** Extend guide 11 when the std lib gains a TLS server, or when a TLS connection becomes a `ByteDuplex`.
- [ ] **WebSocket limits naming.** `Limits.default()` vs `Limits.defaults()`. Update guide 10 if the names change.
- [ ] **"In this release" notes.** Guides 1, 4, 5, 14, 16 and 18 quote bugs the fixer thread is working on: template errors inside format.silk, catchAll with an incomplete handler, empty arrays of strings, `inflate.Format` through an import, the `SystemClock.make` trap, and effect blocks and templates in generic code. Revisit each as fixes merge.
- [ ] **JSON and TOML.** Add a struct deserialization example.
- [ ] **Output that depends on the build.** Symbol counts, timings and dates in the guides come from one run, so refresh them on release.

## Appendix

- [ ] **Diagnostic codes.** Regenerate the page when the compiler fills in its message templates (125 codes print only their meaning today) and when LEX codes are wired up. The generator is `docs-rewrite/remaining/src/appendix/diag/tools/gen.py` in the project files.
- [ ] **Unreachable codes.** 46 SEM codes have no program that triggers them. Remove the retired ones from the list once the compiler drops them.
