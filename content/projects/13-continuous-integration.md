# Continuous integration

Silk keeps what it has checked, built and tested in the project's `build` directory, and reuses it when nothing it read has changed. A CI runner starts from an empty checkout, so by default every run does all the work again. Keep `build` between runs and a job only pays for what a commit changed.

## What Silk reuses

| Command | What a later run reuses |
| --- | --- |
| `silk check` | The checked modules of each package. Only the modules an edit reaches are checked again. |
| `silk build` | The compiled objects, and the linked program when none of its inputs changed. |
| `silk test` | The test runner, and the passing result: a test root whose inputs did not change is not run again. |

A test root that is not run again prints its last report and says so:

```
Tests  74 passed, 0 failed (0 cached, 74 executed, 74 selected, 74 discovered)
Time   8598 ms
Not run again: nothing changed since these tests passed (--no-cache runs them)
```

All of it is named by content: the digest of each source file, the compiler, the target and the profile. File times do not matter, so a fresh `git clone` reuses a `build` directory from an earlier commit. A `build` directory from another commit is never wrong. Silk reuses the parts that still match and redoes the rest.

Two things must stay the same between runs for builds and tests to be reused:

- **The path of the checkout.** A build records the paths it read. GitHub-hosted runners check a repository out at the same path on every run.
- **The toolchain.** The Silk version, the Clang it runs, and `PATH` are part of what a build is reused for.

`silk check` needs neither: its cache is reused at any path.

## The GitHub Action

`silk-lang/action` installs the Silk version the project pins, installs Clang 22 when the runner has none, and restores `build` and the git dependencies in `~/.silk/git` from the latest run of the same job:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-26.04
    steps:
      - uses: actions/checkout@v5
      - uses: silk-lang/action@v1
      - run: silk check --workspace
      - run: silk test
```

Jobs on the default branch save the cache when they pass. Pull requests restore it and do not save one of their own, so they cannot fill the repository's cache quota. Each job keeps its own cache, named by the job id and its matrix values.

On a 70-package workspace, the first run of a job that checks the workspace, runs one test root and builds one program took 6 min 49 s. The next run, with the cache restored, took 1 min 27 s: the check took 42 seconds, and the test and the build under a second each.

See the action's README for its inputs.

## Without the action

Any CI system that can keep a directory between runs works the same way. Keep these two:

| Directory | What it holds |
| --- | --- |
| `build` | Everything Silk wrote for the project. `[workspace].output-dir` or `[build].output-dir` names another directory. |
| `~/.silk/git` | The checkouts of git dependencies, one per commit. `SILK_HOME` moves it. |

With `actions/cache`, end the key in the commit so every run saves a new cache, and restore by prefix so a run starts from the latest one:

```yaml
- uses: actions/cache@v5
  with:
    path: |
      build
      ~/.silk/git
    key: silk-${{ runner.os }}-${{ github.job }}-${{ github.sha }}
    restore-keys: silk-${{ runner.os }}-${{ github.job }}-
```

## Skipping a job

`silk hash` prints one digest of everything a build reads: the sources in the import tree, the manifest, the dependencies, the compiler and the profile. It reads the same on every machine and at every checkout path. Use it as the key of anything you want to skip when a package did not change, such as a deploy or an upload:

```sh
silk hash --release
silk hash --test --root src/tests.silk
```

`--json` lists each selected package with its hash and the artifacts its build writes.

## Keeping CI fast

- **Run one command over the workspace.** `silk check --workspace` checks members side by side, as many at once as the processors and the memory allow. A loop that runs `silk check` once per package checks one at a time.
- **Build optimized programs only where the job needs them.** An optimized build runs Clang's optimizer over the whole program on one thread, which takes minutes for a large program, and a debug build takes seconds. Tests that only look at behavior can run a debug build.
- **Split optimized CI builds into codegen units.** A profile with `codegen-units = 8` optimizes on several threads at once. The program runs a little slower than one built as a single module, which rarely matters for a CI check. See **Targets and profiles**.

```toml
[profiles.ci]
optimization = "speed"
debug = false
codegen-units = 8
```

```sh
silk build --profile ci
```

- **Give jobs that run the same commands the same cache.** Two jobs with the same `cache-key` restore one cache.
