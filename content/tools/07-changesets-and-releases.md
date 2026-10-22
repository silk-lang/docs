# Changesets and releases

`silk changes` versions your package from notes you write as you work. Each change gets a small note in `.changes/` that says how big it is and what users need to do. When you release, the tool picks the next version from those notes, records the release, and regenerates `CHANGELOG.md`. This page walks through that cycle for a library called `geo`. The tool never runs Git and never publishes anything; you commit and tag yourself.

## Record a change

When a change is ready, add a note with its size and a one-line summary:

```sh
silk changes add minor "Add the perimeter function"
```

```
Created /home/you/geo/.changes/c4d6bb3e81c0516606b360e59704bfb8.md
silk changes: no migration notes supplied. Consider --migration for API, behavior, defaults, or data changes; explicitly say when no action is needed.
```

The size is `patch`, `minor` or `major`, following semantic versioning: a fix, a compatible addition, or a breaking change. Anything else fails with `bump must be patch, minor, or major`.

`--migration` tells users what to do about the change. Leaving it out means the impact is unknown, not that there is none, so the tool reminds you. When users need do nothing, say so:

```sh
silk changes add patch "Fix area for zero-width rectangles" --migration "No action needed."
```

Each `add` creates its own file with a random name, so two branches that each add a note never conflict. The file is short Markdown that you can edit by hand before the release:

```markdown
---
bump: patch
---

Fix area for zero-width rectangles

## Migration

No action needed.
```

A note without `--migration` has no `## Migration` section. Commit the note together with the change it describes.

## See what is pending

```sh
silk changes status
```

```
geo: 0.1.0 -> 0.2.0
  patch ab14a4fb77e96204fcb2fb35c0748324.md
  minor c4d6bb3e81c0516606b360e59704bfb8.md
1 pending changes have no migration notes; review API and behavior impact.
```

The first line is the current version and the one a release would produce. The largest pending size wins: one `minor` and one `patch` make a minor release. With nothing pending, it prints `No pending changes.`

## Release a version

```sh
silk changes version
```

```
Version: 0.2.0
```

This one command:

- sets `version` in `silk.toml` to the new version,
- writes the release record `.changes/releases/0.2.0.toml`,
- deletes the pending notes it consumed,
- regenerates `CHANGELOG.md` from all release records,
- rewrites the version file, if you configured one (see below).

Commit all of it together: `silk.toml`, `CHANGELOG.md`, the new file in `.changes/releases/`, the removed notes and the version file. Then tag and publish as you normally do.

With nothing pending, `silk changes version` changes nothing and prints the current version.

### The release record

The TOML file in `.changes/releases/` is the authoritative history. `CHANGELOG.md` is generated from these files on every release:

```toml
format = 1
package = "geo"
from = "0.2.0-beta.1"
version = "0.2.0"
base = "0.1.0"

[[changes]]
id = "c4d6bb3e81c0516606b360e59704bfb8.md"
bump = "minor"
summary = """
Add the perimeter function"""

[[changes]]
id = "ab14a4fb77e96204fcb2fb35c0748324.md"
bump = "patch"
summary = """
Fix area for zero-width rectangles"""
migration = """
No action needed."""
```

`from` is the version released just before this one, and `base` is the last stable version the changes are counted from. Here the release promoted the prerelease `0.2.0-beta.1`, so it lists the changes since `0.1.0`.

### The changelog

The generated `CHANGELOG.md` groups each release's notes by size:

```markdown
# Changelog

Auto-generated from `.changes/releases/*.toml`. Manual edits are overwritten on the next release; edit the authoritative TOML files instead.

## 0.2.0

### Minor

Add the perimeter function

#### Migration

Migration notes not provided

### Patch

Fix area for zero-width rectangles

#### Migration

No action needed.
```

Do not edit `CHANGELOG.md` by hand. To fix a released entry, edit its TOML record; the next release regenerates the changelog from it.

## Prereleases

`--tag <name>` makes a semantic-versioning prerelease instead of a stable release. `status --tag beta` shows what it would be:

```sh
silk changes status --tag beta
```

```
geo: 0.1.0 -> 0.2.0-beta.1
  patch ab14a4fb77e96204fcb2fb35c0748324.md
  minor c4d6bb3e81c0516606b360e59704bfb8.md
1 pending changes have no migration notes; review API and behavior impact.
```

```sh
silk changes version --tag beta
```

```
Version: 0.2.0-beta.1
```

The prerelease consumes the pending notes and writes its own record and changelog section, like a stable release. From there:

| You run | From `0.2.0-beta.1` you get |
| --- | --- |
| `add ...` then `version --tag beta` | `0.2.0-beta.2` |
| `version --tag rc` | `0.2.0-rc.1`, even with nothing pending |
| `version` | `0.2.0`, the stable release |

A prerelease on the same channel needs new pending notes; without them it fails with `A tagged release needs pending changes.` Switching to a new channel, such as from `beta` to `rc`, does not. Plain `version` promotes the prerelease to stable, and the stable record lists every change since the last stable version, as in the record above.

A tag name is ASCII letters, digits and hyphens, and starts with a letter.

## The \[changes\] table

All `[changes]` keys in `silk.toml` are optional. The tool works without the table.

| Key | Value | Effect |
| --- | --- | --- |
| `version-file` | A `.silk` path relative to the package directory | `version` writes the package version into this module |
| `repository` | `"owner/repo"` on GitHub | Where packages that depend on yours find your published releases |
| `directory` | A path inside that repository | Where your package lives in the repository, when it is not at the top |

### Use the version in code

With a version file, your code can report its own version without repeating it:

```toml
[changes]
version-file = "src/Version.silk"
```

Each `silk changes version` writes the module:

```silk
// Auto-generated by silk changes version. Do not edit.
pub fn value() -> &'static [u8] {
  return b"0.2.0"
}
```

Import it like any other module of the package:

```silk
import Version

/// The version of this library.
pub fn version() -> &'static [u8] {
  return Version.value()
}
```

Commit the generated file. `silk changes release` refuses to run when it is missing or does not match the version.

## Publish the notes

After you commit the release, `silk changes release` prints the notes for the current version, ready to paste into a release page:

```sh
silk changes release
```

```markdown
## 0.2.0

### Minor

Add the perimeter function
...
```

It reads the release record and changes nothing. It fails when notes are still pending, when the history in `.changes/releases/` is incomplete, or when the version file does not match. `--json` gives the same for a publishing script:

```json
{"package":"geo","version":"0.2.0","tag":"v0.2.0","prerelease":false,"notes":"## 0.2.0\n\n..."}
```

`tag` is the Git tag to create, and `prerelease` is `true` for a tagged version. The tool does not create the tag; your script does.

## Snapshots

A snapshot is an immutable record of a release tied to the exact commit it was built from. A publishing pipeline uploads it so that `since` can read the history without a checkout. The commit must be the full 40-character lowercase SHA:

```sh
silk changes snapshot --commit 0123456789abcdef0123456789abcdef01234567
```

The output is TOML with `schema = "silk.changes.snapshot"`, `kind = "stable"`, the commit, and the changes. `--dev N` instead projects a development build from that commit, numbered `N`, such as `1.0.2-dev.3+0123456789ab`, with `kind = "dev"`. `--json` adds the release notes and the manifest and version-file contents the snapshot implies.

A snapshot never consumes notes or edits the checkout. Snapshots kept in a checkout live at `.changes/snapshots/<version>.toml`.

## What changed in something you depend on

`silk changes since` reads someone else's history: what changed after a version you know. With a dependency's name, it compares the version you have installed with newer releases:

```sh
silk changes since geo --source ../geo --from 0.2.0
```

```
# geo: changes after 0.2.0 through 1.0.1
...
```

| Selector or option | Meaning |
| --- | --- |
| (none) | The compiler's own changes since this package's `silk-version`, fetched from GitHub |
| a dependency name | That dependency's changes since the installed version, fetched from its `[changes] repository` |
| a version | This package's own history since that version, read locally |
| `--from VERSION` | Start after this version instead of the installed one |
| `--to VERSION` | Stop at this exact release, build metadata included |
| `--source PATH` | Read a checkout or a snapshot TOML file instead of GitHub, relative to the project root |
| `--json` | JSON output for tools |

A dependency without `repository` in its `[changes]` table can be read only with `--source`; otherwise `since` fails and says so. When nothing newer exists, it prints `No new recorded change entries in this range.` Fetching from GitHub uses HTTPS with the certificate bundle in `SSL_CERT_FILE` when set, and fails when access is denied or rate-limited.

## Workspaces and other directories

`--dir PATH` goes before the subcommand and runs it on the package in that directory:

```sh
silk changes --dir geo status
```

Each workspace member keeps its own `.changes/`, version and changelog. At a workspace root that has no `[package]` of its own, select the member with `--dir`. Without `--dir`, the tool uses the nearest `silk.toml` upward from the current directory.

## Interrupted writes

`version` writes several files. While it does, `.changes/.lock` keeps a second writer out. If a write is interrupted and the lock remains, stop anything else that might be writing, then roll back:

```sh
silk changes recover
```

With no lock it fails with `There is no interrupted operation to recover.` Only a failure that can leave the lock behind, a file system error or running out of memory, ends with a reminder about `recover`. Here `.changes` is a file instead of a folder:

```
silk changes: filesystem operation 2 failed (reason 4).
If .changes/.lock remains after a failed write, stop other writers and run silk changes [--dir PATH] recover for the affected package.
```

Other errors, such as a bad argument, print only their own message.

## Exit status

`silk changes` exits 0 on success and 1 on any error, with the message on standard error.

## Summary

- `silk changes add patch|minor|major "Summary" [--migration "..."]` records a change as a file in `.changes/`.
- `silk changes status` shows the next version; `silk changes version` makes it, writing `silk.toml`, a TOML release record and `CHANGELOG.md`. Commit them together.
- `--tag beta` makes prereleases; plain `version` promotes to stable.
- `[changes] version-file` generates a module whose `value()` returns the version.
- `release` prints notes for publishing, `snapshot` ties a release to a commit, and `since` shows what changed in the compiler or a dependency.
- The TOML records are the history; the changelog is generated from them.

## API reference

- `silk changes --help` lists every subcommand and rule.
- No standard library module is involved. The only Silk code in this workflow is the generated version module, which has one function, `value()`.
