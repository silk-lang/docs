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
| **Targets and compilation settings** | Supported targets, cross builds, source facts and per-package code generation. |
| **Build outputs and native linking** | Artifact kinds, where builds write, intermediate stages, C sources, native libraries and frameworks, and prebuilt archives. |
| **Build plans and generated code** | Embedding package files, a package's typed `build.silk` plan, its tool steps and the tool sandbox. |
| **Project templates** | `silk init --template` and `--list`, naming a template, writing one, and its next steps and `[[post-init]]` commands. |
| **Tasks and build graphs** | `src/tasks.silk`: replacing `silk build`, `run`, `test` and `plan`, commands of your own, compilations, package overrides and requests. |
| **Build steps and deferred values** | `Deferred` values, running programs with `Run`, `WriteFiles`, embedding, steps of your own, and the step cache. |
| **Packaging releases** | `silk pack`: the source archive, documentation, binaries, checksums and minisign signatures to attach to a release, and `publish = false`. |
| **Migrating from manifest builds** | Before and after for every removed `silk.toml` table and option: profiles, `[build]`, `[config]`, `[native]` lists, `[tasks]` hooks, `[[generate]]` and text plans. |
