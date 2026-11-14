# Packaging releases

`silk pack` turns a package into files you can attach to a release: a source archive, the package's documentation, binaries for each target, a checksum list and, if you sign, a minisign signature for each file. Where you host them is up to you, such as GitHub Releases, a bucket or a web server. Other packages depend on a hosted source archive by URL and SHA-256 (see **Dependencies**). There is no registry yet.

## Packing a package

From the package directory:

```sh
silk pack
```

```
wrote /home/you/greet/build/package/greet-0.1.0.tar.gz (4 files, 432 bytes)
sha256 b9b86606bfddde5c73ded12c082aca71c9578b9d09c42f7646202a29051367e2
wrote /home/you/greet/build/package/greet-0.1.0.docs.json
```

`silk pack` first checks the package as `silk check` does. A package that does not check is not packed: its diagnostics are printed as `silk check` prints them, and the exit status is 1. Then it writes, in `build/package/` (or the directory `--output` names):

| File | What it is |
| --- | --- |
| `<name>-<version>.tar.gz` | The source archive: what a dependent downloads and builds. |
| `<name>-<version>.docs.json` | The package documentation, as `silk doc` writes it, with source paths relative to the package. It is not inside the archive, so a build of the archive never reads it. |
| `<name>-<version>-<target>.tar.gz` or `.zip` | With `--bin` or a `[pack.binary]` table, one binary archive per target. |
| `SHA256SUMS` | The SHA-256 of every file this run wrote in the directory, one `<hex>  <file>` line each, as `sha256sum` writes them, so `sha256sum -c SHA256SUMS` checks a download. |
| `<file>.minisig` | With `--sign` or `SILK_SIGNING_KEY`, a minisign signature beside each file above, `SHA256SUMS` included. |

The archive is named after `[package].name` and `[package].version`. Write the version yourself: a manifest without `version` is refused, even though builds default it to `0.0.0`.

## What goes in the source archive

The archive holds exactly what a build of the package reads, under one top directory `<name>-<version>/`:

- `silk.toml`.
- Every file below the source root (`[package].source`, by default `src`).
- The files and directories `[package].include` names, as paths relative to the package directory. Use it for files the source embeds or reads at build time, such as `include = ["assets", "data/table.txt"]`.
- `README`, `LICENSE`, `LICENCE`, `COPYING` and `CHANGELOG` at the package root, in any case, with or without an extension (`README.md`, `license-mit.txt`).

It never holds the build directory, or a file or directory whose name starts with `.`. A symbolic link, below the source root or on the way to an `include` entry, refuses the package: an archive holds only files and directories, and following a link could pack files from outside the package.

`--list` prints the files the archive would hold, one per line in archive order, and writes nothing:

```sh
silk pack --list
```

```
LICENSE
README.md
silk.toml
src/lib.silk
```

### Workspace dependencies are written out

The archive's `silk.toml` is the package's own, with one change: a dependency written `name = { workspace = true }` is replaced by the entry the workspace's `[workspace.dependencies]` has for it. Whoever downloads the archive has the package, not the workspace around it, so the pin has to be in the package's manifest. The manifest on disk is not touched.

```toml
# pricing/silk.toml in the workspace
[dependencies]
vector = { workspace = true }
```

```toml
# pricing-0.1.0/silk.toml in the archive
[dependencies]
vector = { git = "https://example.com/geometry.git", rev = "fb09a5d023a80e50a973adb896a198ab4daab4db", path = "vector" }
```

Write the entry on one line, as above, in `[dependencies]` or `[profiles.<name>.dependencies]`. A shared path dependency is refused like any other path dependency.

### Reproducible archives

Packing the same files gives the same bytes, and so the same SHA-256, on every machine. Members are sorted by path, every modification time is zero, owner and group are zero with no names, modes are 644 for files and 755 for executables and directories, and the gzip header has no timestamp. A release workflow can pack again and compare the checksum with the one it published.

### What a package must satisfy

`silk pack` refuses, with exit status 1 and the reason:

| Message | Cause |
| --- | --- |
| `silk pack: greet: [package] has no version; write one, as version = "0.1.0", to name the archive` | No `version` in `[package]` |
| ``silk pack: core: path dependency `demo`: an archive cannot carry ../demo; depend on it by git or url instead`` | A path dependency. Nobody who downloads the archive has `../demo`. Git and URL dependencies are fine, with or without their own `path` |
| ``silk pack: core: dependency `vector` cannot be written out for the archive; write it on one line in [dependencies], as vector = { workspace = true }`` | A `workspace = true` dependency written as a `[dependencies.vector]` table or a dotted key |
| `silk pack: greet: [package].include entry ../x is not a path below the package directory` | An absolute `include` path, or one with a `..` segment |
| `silk pack: greet: [package].include entry assets names no file or directory` | An `include` entry that does not exist |
| `silk pack: greet: [package].include entry assets passes through a symbolic link; an archive holds only files and directories` | An `include` entry that is, or is inside, a symbolic link |
| `silk pack: greet: src/data is a symbolic link; an archive holds only files and directories` | A symbolic link below the source root |
| `silk pack: greet: the source root /home/you/shared is outside the package directory` | A `[package].source` outside the package |

`silk pack` does not run tests. Run `silk test` in your release script first if you want it to.

## Workspaces

At a workspace root, or with `--workspace`, `silk pack` packs every member and writes everything into the shared `build/package/`, with one `SHA256SUMS` for all of them. `-p <member>` packs only that member; it is repeatable.

A member that is never released, such as an example or a test fixture, says so in its manifest:

```toml
[package]
name = "demo"
version = "0.1.0"
publish = false
```

A workspace pack skips it without a word. Naming it with `-p demo`, or packing it from its own directory, refuses it with exit status 1:

```
silk pack: demo sets publish = false in [package], so it is not packed
```

When one member is refused, the others are still packed, and the exit status is 1.

## Binaries

`--bin` also builds the executable of each executable package and puts it in an archive of its own, one per target:

```sh
silk pack --bin
```

```
Compiling app (x86_64-unknown-linux-gnu, release)
  ...
Finished build/llvm/x86_64-unknown-linux-gnu/release/app in 0.80s
wrote /home/you/app/build/package/app-0.1.0.tar.gz (2 files, 347 bytes)
sha256 6b69492dd61486d7e48de0868de1be5f1f9cac78ddc4b3a2de091b16374bdb1e
wrote /home/you/app/build/package/app-0.1.0.docs.json
wrote /home/you/app/build/package/app-0.1.0-x86_64-unknown-linux-gnu.tar.gz (16987 bytes)
sha256 efbcb10554c5e46ad3835d9b05062ee4f069fe3f4626c9110f205bfd848f8f32
```

The build progress goes to standard error and the `wrote` lines to standard output.

- The targets are those `silk build` would build: each `--target`, else `[build].targets`, else the host. Cross targets need what `silk build --target` needs.
- The build uses the release profile (optimized, no debug information) unless `--profile`, `--optimization` or `--profile-input` chooses another. With `--profile <name>`, the profile name follows the target in the file name, as `app-0.1.0-x86_64-unknown-linux-gnu-small.tar.gz`, so two profiles never overwrite each other.
- A binary archive holds `<name>-<version>-<target>/bin/<executable>` with mode 755, and the `README`, `LICENSE`, `LICENCE`, `COPYING` and `CHANGELOG` files of the package root. It is a `.tar.gz` on every target unless the manifest says otherwise, as below.
- A library has no binaries: `--bin` packs its source archive only.
- A target that fails to build is reported as `silk build` reports it and gets no archive. The other targets are still packed.

### Binaries in the manifest

A package that always ships binaries says so in `silk.toml`, with a `[pack.binary]` table. With the table, `silk pack` builds and archives the binaries without `--bin`, and the table says what the archives look like:

```toml
[pack.binary]
include = ["completions", "man/tool.1"]

[pack.binary.target.x86_64-pc-windows-msvc]
format = "zip"
layout = "flat"
include = ["scripts/install.ps1"]
```

| Key | Default | Meaning |
| --- | --- | --- |
| `format` | `"tar.gz"` | `"tar.gz"` or `"zip"`. |
| `layout` | `"bin"` | `"bin"` puts the executable in `bin/`. `"flat"` puts it at the top of the archive, which is what Windows users expect. |
| `include` | none | Files and directories added to every binary archive at their paths in the package, beside the README, LICENSE and CHANGELOG. The rules are those of `[package].include`. |
| `[pack.binary.target.<target>]` | none | `format`, `layout` or `include` for one target, by its name. Each key written there replaces the one in `[pack.binary]`; `include = []` adds nothing for that target. |

An empty `[pack.binary]` table is enough to ship the default archives. The manifest above writes `tool-1.0.0-x86_64-unknown-linux-gnu.tar.gz` holding `bin/tool`, the completions and the man page, and `tool-1.0.0-x86_64-pc-windows-msvc.zip` holding `tool.exe` and `scripts/install.ps1` at its top.

Binary archives are reproducible in both formats: the executable comes first, then every other file in byte order, with fixed times and modes. A ZIP file records modes 644 and 755 the way Unix archivers do, so `unzip` restores the execute bit.

`silk pack` refuses, with exit status 1:

| Message | Cause |
| --- | --- |
| `silk pack: tool: [pack.binary].include holds bin, which takes the place of the executable at bin/tool in the archive` | An included file or directory at the executable's path, above it or below it. A target's own list is named as `[pack.binary.target.<target>].include` |
| `silk pack: mathlib: [pack.binary] archives an executable, and [package].kind is library; remove the table` | The table on a package that is not an executable |

`--list` still prints the source archive's files only, and builds nothing.

## Signing

A checksum shows a file is the one you published; a signature shows you published it. `silk pack` signs with [minisign](https://jedisct1.github.io/minisign/), the scheme Silk's own releases use, and the files it writes are ordinary minisign keys and signatures, so `minisign -V` checks them and keys made by `minisign -G` work.

Make a key pair once:

```sh
silk pack --new-key ~/keys/release.key
```

```
wrote /home/you/keys/release.key (not encrypted; set SILK_SIGNING_PASSWORD to encrypt it)
wrote /home/you/keys/release.pub
key id 402D9E38AC865338
public key RWQ4U4asOJ4tQJnjPvrEqLjAP5XwUymSESFXmWVUGMVli6H0HbjUidEZ
```

- The public key goes to the path with `.key` replaced by `.pub`, or with `.pub` added when the path does not end in `.key`. Publish it, for example in your README, so people can check your releases.
- With `SILK_SIGNING_PASSWORD` set, the secret key is encrypted with that password, as `minisign -G` does (scrypt, using 1 GiB of memory). Without it the key is written unencrypted, as `minisign -G -W` does. Keep the secret key private either way.
- `--new-key` refuses to replace an existing file, and packs nothing.

Then sign while packing:

```sh
silk pack --bin --sign ~/keys/release.key
```

Each file gets a `<file>.minisig` beside it, and so does `SHA256SUMS`. The trusted comment of each signature is `<name> <version> <file>`, such as `app 0.1.0 app-0.1.0.tar.gz` (just `SHA256SUMS` for the checksum list), so a signature cannot be passed off for another file. Signing is deterministic: packing and signing the same files again gives the same signatures.

In CI, put the text of the secret key file in a secret and pass it as `SILK_SIGNING_KEY` instead of `--sign`, with `SILK_SIGNING_PASSWORD` for an encrypted key. `--sign` wins when both are given. A key that cannot be read stops the run before anything is written, with exit status 2:

```
silk pack: cannot sign: the secret key is encrypted and needs its password; set SILK_SIGNING_PASSWORD
silk pack: cannot sign: the password does not decrypt the secret key
silk pack: cannot sign: the secret key is not a minisign Ed25519 secret key
```

### Checking a release

`silk pack --verify` checks a directory of release files, such as the assets of a release downloaded into one directory, against a public key:

```sh
silk pack --verify dist --key release.pub
```

```
verified app-0.1.0.tar.gz
verified app-0.1.0.docs.json
verified app-0.1.0-x86_64-unknown-linux-gnu.tar.gz
```

Without `--key`, the key is `minisign.pub` in the working directory, which is where a repository that signs its releases keeps it. The directory verifies when:

- `SHA256SUMS` is signed by the key.
- Every file `SHA256SUMS` names is there, has that SHA-256 and has its own `.minisig` by the same key.
- Nothing else is in the directory. Every entry is a regular file that is `SHA256SUMS`, a file it names, or the signature of one of those.

The exit status is 0 when it verifies. Otherwise every fault is named on standard error, no file is reported as verified, and the status is 1:

```
silk pack: app-0.1.0.tar.gz: the SHA-256 does not match SHA256SUMS
silk pack: notes.txt: SHA256SUMS does not name it
silk pack: SHA256SUMS: the signature was made with a different key
```

A key file that cannot be read, or is not a minisign public key, exits 2. `--verify` packs nothing and runs no hook, so it takes no other option than `--key`.

A signature shows who signed a file, not which release it belongs to: an older release signed by the same key verifies too. The version is in each file name.

The same check by hand, without Silk:

```sh
sha256sum -c SHA256SUMS
minisign -Vm app-0.1.0.tar.gz -p release.pub
```

Programs can sign and verify the same way with the std lib module `silk.crypto.minisign`.

## JSON output

`--json` prints one JSON object for release scripts instead of the lines above:

```json
{
  "archives": [
    {
      "name": "app",
      "version": "0.1.0",
      "path": "/home/you/app/build/package/app-0.1.0.tar.gz",
      "sha256": "6b69492dd61486d7e48de0868de1be5f1f9cac78ddc4b3a2de091b16374bdb1e",
      "documentation": "/home/you/app/build/package/app-0.1.0.docs.json",
      "files": ["silk.toml", "src/main.silk"],
      "binaries": [
        {
          "platform": "x86_64-unknown-linux-gnu",
          "path": "/home/you/app/build/package/app-0.1.0-x86_64-unknown-linux-gnu.tar.gz",
          "sha256": "efbcb10554c5e46ad3835d9b05062ee4f069fe3f4626c9110f205bfd848f8f32"
        }
      ]
    }
  ]
}
```

There is one entry for each package packed. `documentation` is `null` when no standard library was found to document the package with. `--list` and `--json` cannot be combined.

## Options

| Option | Effect |
| --- | --- |
| `--list` | Print the files each source archive would hold, and write nothing |
| `--output <dir>` | Write everything in `<dir>` instead of `build/package/` |
| `--json` | Print the JSON object above instead of lines |
| `--bin` | Also build and archive each target's executable. A `[pack.binary]` table does the same without the flag |
| `--sign <file>` | Sign every file with this minisign secret key file |
| `--new-key <path>` | Write a new key pair, and pack nothing |
| `--verify <dir>` | Check the release files in `<dir>` against `SHA256SUMS` and their signatures, and pack nothing |
| `--key <file>` | The minisign public key file for `--verify`; without it, `minisign.pub` in the working directory |
| `-p <member>`, `--workspace` | Pick workspace members, as for other commands |
| `--target`, `--profile`, `--release`, `--optimization`, `--profile-input`, `--backend`, `--clang` | As for `silk build`; they matter for `--bin` and for the check |
| `--manifest-path`, `--stdlib`, `--progress`, `--quiet`, `--timings` | As for other commands |

## A release workflow

A GitHub Actions job that packs, signs and uploads on a tag:

```yaml
on:
  push:
    tags: ["v*"]
jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      # Install Silk here.
      - run: silk test
      - run: silk pack --bin
        env:
          SILK_SIGNING_KEY: ${{ secrets.SILK_SIGNING_KEY }}
          SILK_SIGNING_PASSWORD: ${{ secrets.SILK_SIGNING_PASSWORD }}
      - run: gh release create "$GITHUB_REF_NAME" build/package/*
        env:
          GH_TOKEN: ${{ github.token }}
```

Others can then depend on it:

```sh
silk add https://github.com/you/greet/releases/download/v0.1.0/greet-0.1.0.tar.gz
```

See **Dependencies** for URL dependencies.
