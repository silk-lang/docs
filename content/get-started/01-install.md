# Install

Silk installs with one shell script. It downloads a release of the `silk` compiler and its standard library into `~/.silk`. You also need Clang 18 or newer, because Silk builds programs through Clang.

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | sh
```

The script needs `curl`, `tar`, `uname`, `mktemp`, `cmp`, and `sha256sum` or `shasum`. Every Linux distribution and macOS has them.

## Supported hosts

| Host | Release target |
| --- | --- |
| macOS on Apple silicon | `aarch64-apple-darwin` |
| Linux on x86-64 | `x86_64-unknown-linux-gnu` |
| Linux on ARM64 | `aarch64-unknown-linux-gnu` |

Intel Macs are not supported. On one, the script stops with `silk-install: Silk has no build for Intel Macs yet`. Other systems stop with a similar line. A shell running under Rosetta on an Apple silicon Mac is detected, and gets the Apple silicon build.

## What the script does

On Linux x86-64 a run looks like this:

```
Downloading silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz from v0.1.0
######################################################################## 100.0%
minisign is not installed; skipping the signature check of silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz

Installed silk v0.1.0 to /home/you/.silk/bin/silk

Add Silk to your PATH by adding this line to ~/.bashrc:

  export PATH="/home/you/.silk/bin:$PATH"
```

Step by step, the script:

1. Picks a release from GitHub. It prefers the newest stable release. Before the first stable release exists, it takes the newest published dev release.
2. Downloads `silk-<version>-<target>.tar.gz` for your host.
3. Checks the archive's minisign signature, when `minisign` is installed (see below).
4. Checks that `bin/silk` has the SHA-256 the release publishes in `native-seed.json`, that it reports the requested version, and that its bundled change snapshot matches the release's `changes-snapshot.toml`.
5. Replaces `~/.silk/bin/silk` and `~/.silk/lib/silk`, and writes the release tag to `~/.silk/release`.
6. Checks your Clang and your `PATH`, and prints what to fix.

Any failed check stops the script with a `silk-install:` message on standard error, and nothing is installed.

What lands in `~/.silk`:

```
~/.silk/
  bin/silk                        the compiler and every tool
  lib/silk/stdlib/                the standard library, in source
  lib/silk/changes-snapshot.toml  the change history this compiler was built from
  release                         the installed release tag
```

The compiler finds its standard library at `../lib/silk/stdlib`, next to its own `bin` folder, so keep the two together.

## Settings

The script reads these environment variables. Set them on `sh`, not on `curl`:

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | SILK_INSTALL=/opt/silk sh
```

| Variable | Meaning | Default |
| --- | --- | --- |
| `SILK_INSTALL` | Folder to install into | `~/.silk` |
| `SILK_RELEASE` | An exact release tag to install, such as `v0.1.0` | The newest release |
| `SILK_CHANNEL` | `stable`, `dev` or `auto`. `auto` prefers stable and falls back to dev only before any stable release exists | `auto` |
| `GITHUB_TOKEN` | Optional. Raises the GitHub API rate limit, useful on shared CI machines | none |

`SILK_RELEASE` pins a version, which is what you want in CI. A tag that does not exist stops the script with `silk-install: cannot find release v9.9.9`. Dev tags carry a commit, as in `v0.1.0-dev.3+fbd34fb3d0ee`; quote them in the shell.

## Install Clang

`silk` compiles your code to LLVM IR and hands it to Clang to make the executable. Clang 18 or newer builds ordinary programs. Programs for Linux without libc need Clang 22 or newer, because the inline assembly in their runtime uses LLVM 22 syntax. Clang 17 and older are untested. Install LLVM from your package manager or from llvm.org. The Clang that ships with Xcode ("Apple clang") does not qualify, and the installer warns about it; install LLVM's own Clang on macOS too.

`silk` uses the Clang named by `--clang <path>` on `silk build`, `silk run` or `silk test`, else the one named by the `SILK_CLANG` environment variable, else the first `clang` on your `PATH`.

The archiver comes from `SILK_LLVM_AR`, or else the `llvm-ar` in the same folder as that Clang.

If your default `clang` is older than 18, or you build for Linux without libc, point `SILK_CLANG` at a newer one:

```sh
export SILK_CLANG=/usr/lib/llvm-22/bin/clang
```

The installer checks the Clang it would use. Clang 18 to 21 gets a note:

```
clang is Clang 18: it builds ordinary programs, but no-libc targets need Clang 22 or newer.
```

An older Clang, or Apple clang, gets a warning:

```
Silk needs Clang 18 or newer, but clang is: Ubuntu clang version 17.0.6
Put LLVM 18 or newer (22 for no-libc targets) on PATH, or set SILK_CLANG to its clang.
```

With no Clang at all, `silk build` and `silk run` stop at the link step:

```
silk: cannot find clang on PATH; set SILK_CLANG to the Clang executable
run x86_64-unknown-linux-gnu: failed (exit 2)
Run summary: 0 succeeded, 1 failed
```

If the chosen Clang cannot start, for example because `SILK_CLANG` names a file that does not exist, the message names the path and where it came from: `from SILK_CLANG`, `from --clang` or `found on PATH`.

```
silk: cannot run the C compiler /nope/clang (from SILK_CLANG); set SILK_CLANG or pass --clang the path of the Clang executable
build llvm/x86_64-unknown-linux-gnu: failed (exit 2)
Build summary: 0 succeeded, 1 failed
```

Both failures exit with status 2.

## Add silk to your PATH

The script does not edit your shell profile. When `~/.silk/bin` is not on your `PATH`, it prints the line to add and the file to add it to: `~/.zshrc` for zsh, `~/.bashrc` for bash on Linux, `~/.bash_profile` for bash on macOS.

```sh
export PATH="$HOME/.silk/bin:$PATH"
```

Open a new terminal, or `source` the profile, and check that `silk` answers:

```sh
silk --version
```

```
silk v0.1.0
```

## Verify the signature

Each release archive is signed with minisign. Install `minisign` (from your package manager) before you run the script, and the script checks the signature for you:

```
Downloading silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz from v0.1.0
Verified the minisign signature of silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz
```

When `minisign` is installed, a missing or wrong signature stops the install. The signature's trusted comment must also read `silk <tag> <archive name>`, so a signature from another release or another file is rejected.

The Silk release public key is:

```
RWQefAo9Dbb8LrlLPaqWdRNlX5th2l7r+4WYhxRNbe5K5URDUht1XUDs
```

It is built into `install.sh` and also published as `minisign.pub` at the root of the silk repository.

## Install from a release archive by hand

You can skip the script. Each release on the silk-lang/silk GitHub releases page has one archive per target, with a `.minisig` signature beside it.

Download `silk-<version>-<target>.tar.gz` and its `.minisig` for your host, then verify it:

```sh
minisign -Vm silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz -P RWQefAo9Dbb8LrlLPaqWdRNlX5th2l7r+4WYhxRNbe5K5URDUht1XUDs
```

```
Signature and comment signature verified
Trusted comment: silk v0.1.0 silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz
```

Unpack it. The archive holds one folder, `silk-<version>-<target>/`, with `bin/silk` and `lib/silk/` inside:

```sh
tar -xzf silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz
```

Move `bin` and `lib` together wherever you like, for example into `~/.silk`, and put that `bin` on your `PATH`.

When you save a release asset with `curl -O`, the `+` in a dev version stays encoded as `%2B` in the file name. Use `curl -o <name>` to choose the name yourself.

## Upgrade

Run the script again. It installs the newest release over the old one, and replaces the whole `lib/silk` folder, so files from the old standard library do not linger. Add `SILK_RELEASE` to move to a specific version, older or newer. `cat ~/.silk/release` shows the tag you have.

Your packages record the language version they were written for in `silk.toml` as `silk-version`. Upgrading the compiler does not change that.

## Uninstall

Delete the install folder and remove the `PATH` line from your shell profile:

```sh
rm -rf ~/.silk
```

The installer writes nothing outside that folder. Each package's own `build/` folder holds its compiled output; `silk clean` removes it.
