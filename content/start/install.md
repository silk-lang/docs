Silk ships prebuilt toolchains for Apple Silicon macOS and for x86-64 and ARM64 Linux. Pick whichever install method fits how you manage tools.

## Install script

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | sh
```

The script installs the latest stable release into `~/.silk/bin` (set `SILK_INSTALL` to change it), with its standard library beside it, and verifies the compiler's SHA-256 and reported version. When `minisign` is installed, the archive's signature must also verify against the release key.

Set `SILK_RELEASE` to select an exact published version, or `SILK_CHANNEL=dev` to follow dev snapshots:

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | SILK_CHANNEL=dev sh
```

Building programs needs Clang 22 or newer on `PATH`, or `SILK_CLANG` pointing at it.

## Homebrew

Homebrew also installs its LLVM and points `silk` at its Clang:

```sh
brew install silk-lang/tap/silk
```

## mise

With [mise](https://mise.jdx.dev), from the release archives:

```sh
mise use -g 'github:silk-lang/silk[version_prefix=v]'
```

Homebrew follows the same channel as the script. mise picks stable releases only; until the first one exists, use `github:silk-lang/silk[version_prefix=v,prerelease=true]` to get dev releases.

## Manual download

Every release is on the [releases page](/releases), with one archive per target and a minisign signature for each file.
