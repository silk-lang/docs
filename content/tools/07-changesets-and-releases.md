# Changesets and releases

`silk change` versions your package from notes you write as you work. Each change gets a small note in `.changes/` that says how big it is and what users need to do. When you release, the tool picks the next version from those notes, records the release, and regenerates `CHANGELOG.md`. This page walks through that cycle for a library called `geo`. The tool never runs Git and never publishes anything; you commit and tag yourself.

## Record a change

When a change is ready, add a note with its size and a one-line summary:

```sh
silk change minor "Add the perimeter function"
```

```
Created /home/you/geo/.changes/275cb498234186fcab7dd488cee5dbdf.md
```

The size is `patch`, `minor` or `major`, following semantic versioning: a fix, a compatible addition, or a breaking change. Any other word is not a subcommand and fails with `Unknown command. Use silk change --help for usage.`

Write the summary as one line. `--migration` tells users what they must change in their code or builds. Add it only when they must act; a note without it means nothing is needed. An empty `--migration ""` is refused.

```sh
silk change patch "Return 0 from area for a zero-width rectangle" --migration "Code that checked for a negative area should check for 0 instead."
```

Each `add` creates its own file with a random name, so two branches that each add a note never conflict. The file is short Markdown that you can edit by hand before the release:

```markdown
---
bump: patch
---

Return 0 from area for a zero-width rectangle

## Migration

Code that checked for a negative area should check for 0 instead.
```

A note without `--migration` has no `## Migration` section. Commit the note together with the change it describes.

## See what is pending

```sh
silk change status
```

```
geo: 0.1.0 -> 0.2.0
  minor 275cb498234186fcab7dd488cee5dbdf.md
  patch 9272bd12d6fe746a535d8e17ce791401.md
1 pending change needs consumers to migrate.
```

The first line is the current version and the one a release would produce. The largest pending size wins: one `minor` and one `patch` make a minor release. The last line counts the notes that have a `## Migration` section, and is left out when none do. With nothing pending, it prints `No pending changes.`

## Release a version

```sh
silk change version
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

With nothing pending, `silk change version` changes nothing and prints the current version.

### The release record

The TOML file in `.changes/releases/` is the authoritative history. `CHANGELOG.md` is generated from these files on every release:

```toml
format = 1
package = "geo"
from = "0.2.0-beta.1"
version = "0.2.0"
base = "0.1.0"

[[changes]]
id = "9272bd12d6fe746a535d8e17ce791401.md"
bump = "patch"
summary = """
Return 0 from area for a zero-width rectangle"""
migration = """
Code that checked for a negative area should check for 0 instead."""

[[changes]]
id = "275cb498234186fcab7dd488cee5dbdf.md"
bump = "minor"
summary = """
Add the perimeter function"""
```

`from` is the version released just before this one, and `base` is the last stable version the changes are counted from. Here the release promoted the prerelease `0.2.0-beta.1`, so it lists the changes since `0.1.0`.

### The changelog

The generated `CHANGELOG.md` groups each release's notes by size, one bullet per change, with its migration note under it:

```markdown
# Changelog

Auto-generated from `.changes/releases/*.toml`. Manual edits are overwritten on the next release; edit the authoritative TOML files instead.

## 0.2.0

### Minor

- Add the perimeter function

### Patch

- Return 0 from area for a zero-width rectangle
  - **Migration:** Code that checked for a negative area should check for 0 instead.

## 0.2.0-beta.1
...
```

Do not edit `CHANGELOG.md` by hand. To fix a released entry, edit its TOML record; the next release regenerates the changelog from it.

## Prereleases

`--tag <name>` makes a semantic-versioning prerelease instead of a stable release. `status --tag beta` shows what it would be:

```sh
silk change status --tag beta
```

```
geo: 0.1.0 -> 0.2.0-beta.1
  minor 275cb498234186fcab7dd488cee5dbdf.md
  patch 9272bd12d6fe746a535d8e17ce791401.md
1 pending change needs consumers to migrate.
```

```sh
silk change version --tag beta
```

```
Version: 0.2.0-beta.1
```

The prerelease consumes the pending notes and writes its own record and changelog section, like a stable release. From there:

| You run | From `0.2.0-beta.1` you get |
| --- | --- |
| `patch`, `minor` or `major` to add a note, then `version --tag beta` | `0.2.0-beta.2` |
| `version --tag beta` with nothing pending | `0.2.0-beta.1` again; nothing changes |
| `version --tag rc` | `0.2.0-rc.1`, even with nothing pending |
| `version` | `0.2.0`, the stable release |

A new prerelease on the same channel needs new pending notes; without them, the command changes nothing and prints the current version. From a stable version, `version --tag` with nothing pending fails with `A tagged release needs pending changes.` Switching to a new channel, such as from `beta` to `rc`, needs no new notes. Plain `version` promotes the prerelease to stable, and the stable record lists every change since the last stable version, as in the record above.

A tag name is ASCII letters, digits and hyphens, and starts with a letter.

## The \[release\] table

All `[release]` keys in `silk.toml` are optional. The tool works without the table.

| Key | Value | Effect |
| --- | --- | --- |
| `version-file` | A `.silk` path relative to the package directory | `version` writes the package version into this module |
| `repository` | `"owner/repo"` on GitHub | Where packages that depend on yours find your published releases |
| `directory` | A path inside that repository | Where your package lives in the repository, when it is not at the top |

### Use the version in code

With a version file, your code can report its own version without repeating it:

```toml
[release]
version-file = "src/Version.silk"
```

Each `silk change version` writes the module:

```silk
// Auto-generated by silk change version. Do not edit.
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

Commit the generated file. `silk change release` refuses to run when it is missing or does not match the version.

## Publish the notes

After you commit the release, `silk change release` prints the notes for the current version, ready to paste into a release page:

```sh
silk change release
```

```markdown
## 0.2.0

### Minor

- Add the perimeter function

### Patch

- Return 0 from area for a zero-width rectangle
  - **Migration:** Code that checked for a negative area should check for 0 instead.
```

It reads the release record and changes nothing. It fails when notes are still pending, when the history in `.changes/releases/` is incomplete, or when the version file does not match. `--json` gives the same for a publishing script:

```json
{"package":"geo","version":"0.2.0","tag":"v0.2.0","prerelease":false,"notes":"## 0.2.0\n\n### Minor\n\n- Add the perimeter function\n\n..."}
```

`tag` is the Git tag to create, and `prerelease` is `true` for a tagged version. The tool does not create the tag; your script does.

## Snapshots

A snapshot is an immutable record of a release tied to the exact commit it was built from. A publishing pipeline uploads it so that `since` can read the history without a checkout. The commit must be the full 40-character lowercase SHA:

```sh
silk change snapshot --commit 0123456789abcdef0123456789abcdef01234567
```

The output is TOML with `schema = "silk.changes.snapshot"`, `kind = "stable"`, the commit, and the changes. `--dev N` instead projects a development build from that commit, numbered `N`, such as `1.0.2-dev.3+0123456789ab`, with `kind = "dev"`. `--json` adds the release notes and the manifest and version-file contents the snapshot implies.

A snapshot never consumes notes or edits the checkout. Snapshots kept in a checkout live at `.changes/snapshots/<version>.toml`.

## What changed in something you depend on

`silk change since` reads someone else's history: what changed after a version you know. With a dependency's name, it compares the version you have installed with newer releases:

```sh
silk change since geo --source ../geo --from 0.2.0
```

```
# geo: changes after 0.2.0 through 1.0.1
...
```

| Selector or option | Meaning |
| --- | --- |
| (none) | The compiler's own changes since this package's `silk-version`, fetched from GitHub |
| a dependency name | That dependency's changes since the installed version, fetched from its `[release] repository` |
| a version | This package's own history since that version, read locally |
| `--from VERSION` | Start after this version instead of the installed one |
| `--to VERSION` | Stop at this exact release, build metadata included |
| `--source PATH` | Read a checkout or a snapshot TOML file instead of GitHub, relative to the project root |
| `--json` | JSON output for tools |

A dependency without `repository` in its `[release]` table can be read only with `--source`; otherwise `since` fails with `Dependency has no published history source. Declare [release] repository = "owner/repo" in its manifest, or supply --source PATH.` When nothing newer exists, it prints `No new recorded change entries in this range.` Fetching from GitHub uses HTTPS with the certificate bundle in `SSL_CERT_FILE` when set, and fails when access is denied or rate-limited.

## Workspaces and other directories

`--dir PATH` goes before the subcommand and runs it on the package in that directory:

```sh
silk change --dir geo status
```

Each workspace member keeps its own `.changes/`, version and changelog. At a workspace root that has no `[package]` of its own, select the member with `--dir`. Without `--dir`, the tool uses the nearest `silk.toml` upward from the current directory.

## Interrupted writes

`version` writes several files. While it does, `.changes/.lock` keeps a second writer out. If a write is interrupted and the lock remains, stop anything else that might be writing, then roll back:

```sh
silk change recover
```

With no lock it fails with `There is no interrupted operation to recover.` Only a failure that can leave the lock behind, a file system error or running out of memory, ends with a reminder about `recover`. Here `.changes` is a file instead of a folder:

```
silk change: filesystem operation 2 failed (reason 4).
If .changes/.lock remains after a failed write, stop other writers and run silk change [--dir PATH] recover for the affected package.
```

Other errors, such as a bad argument, print only their own message.

## Exit status

`silk change` exits 0 on success and 1 on any error, with the message on standard error.

## Summary

- `silk change patch|minor|major "Summary" [--migration "..."]` records a change as a file in `.changes/`. Add `--migration` only when users must act.
- `silk change status` shows the next version; `silk change version` makes it, writing `silk.toml`, a TOML release record and `CHANGELOG.md`. Commit them together.
- `--tag beta` makes prereleases; plain `version` promotes to stable.
- `[release] version-file` generates a module whose `value()` returns the version.
- `release` prints notes for publishing, `snapshot` ties a release to a commit, and `since` shows what changed in the compiler or a dependency.
- The TOML records are the history; the changelog is generated from them.

## API reference

- `silk change --help` lists every subcommand and rule.
- No standard library module is involved. The only Silk code in this workflow is the generated version module, which has one function, `value()`.
