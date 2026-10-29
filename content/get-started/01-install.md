# Install

Silk installs with one shell script. It downloads a release of Silk, the `silkc` compiler and its standard library, into `~/.silk`, as one version among any others you install later, and installs `silk`, the command you type. `silk` runs each project with the Silk version it pins. You also need Clang 22 or newer, because Silk builds programs through Clang.

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | sh
```

The script needs `curl`, `tar`, `uname`, `mktemp`, `cmp`, `ln`, and `sha256sum` or `shasum`. Every Linux distribution and macOS has them.

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

Installed silk v0.1.0 to /home/you/.silk/toolchains/0.1.0
It is the default Silk version. Installed the silk tool to /home/you/.silk/bin/silk.
silk runs each project with the Silk version it pins: silk build, silk test, silk run.
Update the tool with: silk update self

Add Silk to your PATH by adding this line to ~/.bashrc:

  export PATH="/home/you/.silk/bin:$PATH"
```

Step by step, the script:

1. Picks a release from GitHub. It prefers the newest stable release. Before the first stable release exists, it takes the newest published dev release. No stable release is published yet, so today the script installs the newest dev release, such as `v0.1.0-dev.31+2fc1811f535e`.
2. Downloads `silk-<version>-<target>.tar.gz` for your host.
3. Checks the archive's minisign signature, when `minisign` is installed (see below).
4. Checks that the compiler `bin/silkc` has the SHA-256 the release publishes in `native-seed.json`, that it reports the requested version, and that its bundled change snapshot matches the release's `changes-snapshot.toml`.
5. Moves the release into `~/.silk/toolchains/<version>`, replacing an earlier install of the same version, and makes it the default in `~/.silk/settings.toml`, keeping an `auto-install` line already there. Other versions stay installed.
6. Moves the release's `bin/silk`, the tool, to `~/.silk/bin/silk`, after checking that it runs the installed compiler. The toolchain keeps only the compiler.
7. Checks your Clang and your `PATH`, and prints what to fix.

Any failed check stops the script with a `silk-install:` message on standard error, and nothing is installed.

What lands in `~/.silk`:

```
~/.silk/
  bin/silk                                  the silk tool, the command you type
  settings.toml                             default = "0.1.0"
  toolchains/0.1.0/
    bin/silkc                               the compiler
    lib/silk/stdlib/                        the standard library, in source
    lib/silk/changes-snapshot.toml          the change history this compiler was built from
```

The compiler finds its standard library at `../lib/silk/stdlib`, next to its own `bin` folder, so keep each version's two folders together. `~/.silk/bin/silk` is not a compiler: it runs the `silkc` of the version the directory selects. The compilers stay off your `PATH` on purpose, so that every command goes through the version a project pins.

## Settings

The script reads these environment variables. Set them on `sh`, not on `curl`:

```sh
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | SILK_HOME=/opt/silk sh
```

| Variable | Meaning | Default |
| --- | --- | --- |
| `SILK_HOME` | Folder that holds the Silk versions, `bin/silk` and `settings.toml` | `~/.silk` |
| `SILK_RELEASE` | An exact release tag to install, such as `v0.1.0` | The newest release |
| `SILK_CHANNEL` | `stable`, `dev` or `auto`. `auto` prefers stable and falls back to dev only before any stable release exists. `dev` takes the newest published dev release even after a stable one exists | `auto` |
| `GITHUB_TOKEN` | Optional. Raises the GitHub API rate limit, useful on shared CI machines | none |

`SILK_RELEASE` pins a version, which is what you want in CI. A tag that does not exist stops the script with `silk-install: silk-lang/silk has no release v9.9.9`. Dev tags carry a commit, as in `v0.1.0-dev.3+fbd34fb3d0ee`; quote them in the shell.

`SILK_CHANNEL=stable` refuses to fall back while no stable release exists:

```
silk-install: silk-lang/silk has no stable compiler release yet; use SILK_CHANNEL=dev or SILK_RELEASE
```

Any other channel name stops with `silk-install: SILK_CHANNEL must be auto, stable, or dev`.

## Install Clang

Silk compiles your code to LLVM 22 bitcode and hands it to Clang to make the executable, so it needs Clang 22 or newer. An older Clang misreads that bitcode, and `silk build` refuses it before handing it anything. Install LLVM from your package manager or from llvm.org. The Clang that ships with Xcode ("Apple clang") does not qualify, and the installer warns about it; install LLVM's own Clang on macOS too.

The compiler uses the Clang named by `--clang <path>` on `silk build`, `silk run` or `silk test`, else the one named by the `SILK_CLANG` environment variable, else the first `clang` on your `PATH`.

The archiver comes from `SILK_LLVM_AR`, or else the `llvm-ar` in the same folder as that Clang.

On Linux, an executable links with the `ld.lld` in Clang's installation directory when there is one, which is faster than the system linker. LLD is optional: without it, Clang uses the system linker. Clang's installation directory is the `InstalledDir` line of `clang --version`, such as `/usr/lib/llvm-22/bin`, so on Debian or Ubuntu install the `lld-22` package next to `clang-22`. The progress row still reads `link     clang` either way.

If your default `clang` is older than 22, point `SILK_CLANG` at a newer one:

```sh
export SILK_CLANG=/usr/lib/llvm-22/bin/clang
```

The installer checks the Clang it would use. An older Clang, or Apple clang, gets a warning:

```
Silk needs Clang 22 or newer, but clang is: Ubuntu clang version 18.1.3 (1ubuntu1)
Put LLVM 22 or newer on PATH, or set SILK_CLANG to its clang.
```

A build with an older Clang stops at the link step and names the Clang it found:

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     143 modules, 1 in package         0.05s
  check    1 module                          0.14s
  codegen  689 functions                     0.13s
  borrow   229 bodies                        0.01s
silk: Silk builds need Clang 22 or newer, but /usr/bin/clang-18 (from SILK_CLANG) is Clang 18; set SILK_CLANG or pass --clang the path of a newer Clang
  link     failed                            0.02s
Failed hello in 0.37s
```

With no Clang at all, the installer prints `Silk needs Clang 22 or newer to build programs. Put it on PATH, or set SILK_CLANG to it.`, and `silk build` and `silk run` stop at the link step:

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     143 modules, 1 in package         0.06s
  check    1 module                          0.14s
  codegen  689 functions                     0.13s
  borrow   229 bodies                        0.01s
silk: cannot find clang on PATH; set SILK_CLANG or pass --clang the path of the Clang executable
  link     failed                            0.00s
Failed hello in 0.35s
```

If the chosen Clang cannot start, for example because `SILK_CLANG` names a file that does not exist, the message names the path and where it came from: `from SILK_CLANG`, `from --clang` or `found on PATH`.

```
Compiling hello (x86_64-unknown-linux-gnu, debug)
  load     143 modules, 1 in package         0.06s
  check    1 module                          0.14s
  codegen  689 functions                     0.14s
  borrow   229 bodies                        0.01s
silk: cannot run the C compiler /nope/clang (from SILK_CLANG); set SILK_CLANG or pass --clang the path of the Clang executable
  link     failed                            0.00s
Failed hello in 0.36s
```

All three failures exit with status 2.

## Add silk to your PATH

The script does not edit your shell profile. When `~/.silk/bin` is not on your `PATH`, it prints the line to add and the file to add it to: `~/.zshrc` for zsh, `~/.bashrc` for bash on Linux, `~/.bash_profile` for bash on macOS.

```sh
export PATH="$HOME/.silk/bin:$PATH"
```

Open a new terminal, or `source` the profile, and check that `silk` answers with the version it selects:

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

Unpack it. The archive holds one folder, `silk-<version>-<target>/`, with `bin/silk` (the tool), `bin/silkc` (the compiler) and `lib/silk/` inside:

```sh
tar -xzf silk-0.1.0-x86_64-unknown-linux-gnu.tar.gz
```

Move its `bin/silk` to `~/.silk/bin/silk`, then move the unpacked folder to `~/.silk/toolchains/<version>`, named by the version without the leading `v`, and `silk use list` finds it. Or keep `bin` and `lib` together anywhere else you like and put that `bin` on your `PATH`: with no version selected, `silk` runs the `silkc` beside it.

When you save a release asset with `curl -O`, the `+` in a dev version stays encoded as `%2B` in the file name. Use `curl -o <name>` to choose the name yourself.

## Upgrade

`silk use latest` installs the newest stable release beside the versions you have and makes it your default; `silk use dev`, or `silk use latest --dev`, takes the newest release of any kind, dev releases included. Until a stable release is published, `silk use latest` stops with exit status 1:

```
silk: no stable Silk release is published yet; `latest --dev` names the newest dev release
```

`silk update self` updates the tool itself, to the newest stable release, or to the newest dev release while none is stable; `--dev` always takes the newest dev release. When there is nothing newer it says so:

```
silk 0.1.0 is up to date (newest release: 0.1.0)
```

Running the script again does both. Add `SILK_RELEASE` to the script to install a specific version, older or newer. Installing a version you already have again with the script replaces its folder whole, so files from an old standard library do not linger. `silk use list` shows every installed version.

## Switch versions

Each package records the Silk version it runs with in `silk.toml` as `silk-version`. `silk init` writes your default version. Inside the package, `silk` hands every command to that version, so two projects on one machine can use different releases. A pin of `0.0.0` pins nothing.

Pin a version from inside a project with `silk set`, then install it with `silk use`:

```sh
silk set 0.1.0-dev.11
silk use
```

```
Pinned Silk 0.1.0-dev.11+6de14da2a8a6 in /home/you/app/silk.toml ([package].silk-version, was 0.1.0)
Silk 0.1.0-dev.11+6de14da2a8a6 is not installed yet. Install it with: silk use
note: Silk 0.1.0-dev.11+6de14da2a8a6 is older than this tool (0.1.0); if it cannot read this silk.toml, pin a newer version or edit the manifest for it
Installed Silk 0.1.0-dev.11+6de14da2a8a6 in /home/you/.silk/toolchains/0.1.0-dev.11+6de14da2a8a6
```

`silk set` names the version it replaced, and warns when the new pin is older than the tool, since an older compiler may not read every key of a newer manifest. The last line comes from `silk use`.

After cloning someone's project, `silk use` alone installs the version it pins. When a project pins a version you do not have, its commands stop with exit status 3 and name the fix:

```
silk: Silk 0.3.0 (package silk-version in /home/you/app/silk.toml) is not installed.
Install it with: silk use
```

Add `auto-install = true` to `~/.silk/settings.toml`, or set `SILK_AUTO_INSTALL=1`, to have missing pinned versions installed when a command needs them. `silk +<version> <command>` runs one command with another installed version, and `silk use <version>` changes the version used outside projects. `silk use` checks the same signature and SHA-256 as the script, and needs no `minisign`. See "Silk versions" in the Command-line reference.

## Uninstall

Remove one version with `silk use uninstall <version>`. To remove Silk entirely, delete the install folder and remove the `PATH` line from your shell profile:

```sh
rm -rf ~/.silk
```

The installer writes nothing outside that folder. Each package's own `build/` folder holds its compiled output; `silk clean` removes it.
