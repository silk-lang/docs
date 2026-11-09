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
| `<name>-<version>-<target>.tar.gz` | With `--bin`, one binary archive per target. |
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

### Reproducible archives

Packing the same files gives the same bytes, and so the same SHA-256, on every machine. Members are sorted by path, every modification time is zero, owner and group are zero with no names, modes are 644 for files and 755 for executables and directories, and the gzip header has no timestamp. A release workflow can pack again and compare the checksum with the one it published.

### What a package must satisfy

`silk pack` refuses, with exit status 1 and the reason:

| Message | Cause |
| --- | --- |
| `silk pack: greet: [package] has no version; write one, as version = "0.1.0", to name the archive` | No `version` in `[package]` |
| ``silk pack: core: path dependency `demo`: an archive cannot carry ../demo; depend on it by git or url instead`` | A path dependency. Nobody who downloads the archive has `../demo`. Git and URL dependencies are fine, with or without their own `path` |
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
- A binary archive holds `<name>-<version>-<target>/bin/<executable>` with mode 755, and the `README`, `LICENSE`, `LICENCE`, `COPYING` and `CHANGELOG` files of the package root. It is a `.tar.gz` on every target, Windows included.
- A library has no binaries: `--bin` packs its source archive only.
- A target that fails to build is reported as `silk build` reports it and gets no archive. The other targets are still packed.

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

To check a release:

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
| `--bin` | Also build and archive each target's executable |
| `--sign <file>` | Sign every file with this minisign secret key file |
| `--new-key <path>` | Write a new key pair, and pack nothing |
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
