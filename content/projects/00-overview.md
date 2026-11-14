# Silk: Projects and packages

## Overview

These pages cover how Silk code is organized and built, from a single file up to a workspace of packages.

| Page | What it covers |
| --- | --- |
| **The manifest** | Every key `silk.toml` accepts, with defaults and the errors for bad values. |
| **Modules and imports** | How file paths become module names, `import` forms, and the import errors. |
| **The standard library** | Where the std lib lives, how its modules are imported, and `--stdlib`. |
| **Dependencies** | Path, git and URL dependencies, `silk add` and `silk remove`, and how names resolve. |
| **Libraries and exports** | Building a library, the `exports` list, and linking a Silk library from C. |
| **Workspaces** | Member packages, commands run from the root, `-p` and `--workspace`, and the shared output directory. |
| **Targets and profiles** | The six accepted targets (WASI included), cross builds, optimization levels, named profiles and profile-guided optimization. |
| **Build outputs and native linking** | Artifact kinds, stages, the output layout, native link inputs, C sources and prebuilt archives. |
| **Build plans and generated code** | Embedding package files, `silk generate`, `build.silk` plans and sandboxed tool steps. |
| **Project templates** | `silk init --template` and `--list`, naming a template, writing one, and its `[[post-init]]` commands. |
| **Hooks and scripts** | Every command a package can have Silk run, when each runs, and how to write a hook script. |
| **Packaging releases** | `silk pack`: the source archive, documentation, binaries, checksums and minisign signatures to attach to a release, and `publish = false`. |
| **Continuous integration** | Keeping `build` between CI runs so a job only pays for what a commit changed, the `silk-lang/action` GitHub Action, and `silk hash` for skipping jobs. |
