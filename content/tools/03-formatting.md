# Formatting

`silk format` rewrites Silk source in one standard layout, so a project reads the same everywhere and diffs show real changes. It changes only layout: indentation, line breaks and spacing. Comments stay where you wrote them, and a file that compiled before still compiles after.

## Format a package

Run it anywhere inside a package. It finds the nearest `silk.toml` and formats every `.silk` file under the package's source root, in path order:

```sh
silk format
```

```
/home/you/tidy/src/main.silk: formatted
/home/you/tidy/src/util/One.silk: unchanged
```

Here is `src/main.silk` before:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

struct Point { x: i32
  y: i32 }

fn sum(p: &Point) -> i32 { return p.x + p.y }

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  let p = Point {
    x: 1,
    y: 2,
  }
  run Effect.log("sum {s}\n", &.{ s: sum(&p) }) |> Effect.provideMut(&mut logger)
}
```

And after:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

struct Point {
  x: i32
  y: i32
}

fn sum(p: &Point) -> i32 {
  return p.x + p.y
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let p = Point { x: 1, y: 2 }
  run Effect.log("sum {s}\n", &.{ s: sum(&p) }) |> Effect.provideMut(&mut logger)
}
```

Each struct field gets its own line, a one-line function body is split over three lines, a struct literal that fits joins onto one line, and the failure row of an effect signature moves to its own line.

## Format some files

Name files or directories to format only those. Paths are relative to the current directory. A directory must be inside the package's source root. A `.silk` file can be anywhere, even in a folder with no `silk.toml`, so an editor can format a scratch file:

```sh
silk format --check src/util/One.silk src/main.silk
```

A directory selects every `.silk` file below it. A directory outside the source root, or a file that is not `.silk`, is refused with exit status 2 before any file is touched:

```
silk format: /home/you/tidy/scripts: selection is outside the package source root
```

Put `--` before a file name that starts with `-`. `--manifest-path <path>` selects the package by its manifest instead of the search upward.

## Check in CI

`--check` reports instead of rewriting. A file that differs from the standard layout is listed as `needs formatting` and left alone:

```sh
silk format --check
```

```
/home/you/tidy/src/main.silk: needs formatting
/home/you/tidy/src/util/One.silk: unchanged
```

The exit status is 1 when any file needs formatting, so `silk format --check` fails a CI job until someone runs `silk format`.

## Outcomes and exit status

Each selected file gets one line, `<path>: <outcome>`. `unchanged` and `formatted` lines go to standard output; the others go to standard error.

| Outcome | Meaning | Status |
| --- | --- | --- |
| `unchanged` | Already in the standard layout | 0 |
| `formatted` | Rewritten in place | 0 |
| `needs formatting` | `--check` only: would be rewritten; left untouched | 1 |
| `cannot format damaged source (CODES)` | The file has lexical or syntax errors, listed by code; left untouched | 1 |
| a failure message | The file could not be read or written, or formatting would have changed its meaning | 2 |

The command exits with the worst status over all files. Problems that stop it before any file, such as no `silk.toml` for a directory, an unknown option or a directory outside the source root, print one `silk format:` line and exit 2.

A damaged file is skipped, not guessed at. Fix the syntax error first; `silk check` shows where it is.

```
/home/you/tidy/src/main.silk: unchanged
/home/you/tidy/src/util/One.silk: cannot format damaged source (PAR0002)
```

## Workspaces

At a workspace root, `silk format` and `silk format --check` cover the source root of every member, and so does `silk format .`; at a package root, `.` selects its source root. Inside a member, they cover only that member. See **Workspaces** in Projects and packages.

## Summary

- `silk format` rewrites every `.silk` file under the source root; name files or directories to narrow it.
- `silk format --check` changes nothing and exits 1 when any file needs formatting.
- Files with syntax errors are reported with their codes and left untouched.
- Exit status 2 means the command or a file operation failed, not the layout.
