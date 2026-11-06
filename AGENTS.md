# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

This is the Silk website: landing page, docs and releases, built from the Paper design for Silk.

- Statically generated (`ssr.build.prerender` in `vite.config.ts`). Every route that should exist as a page has to be listed in `prerenderPaths` in `src/entry.server.ts`.
- Styling is Tailwind v4. Design tokens live in `src/styles.css` and follow light and dark token sets through `prefers-color-scheme`. Type is Inter Tight (sans) and JetBrains Mono (mono), self-hosted through `@fontsource-variable`. The single accent is `--silk-signal`; change it there to recolor the site. Use the token classes (`bg-paper`, `bg-panel`, `text-ink`, `text-body`, `text-muted`, `border-rule`, `text-signal`, `bg-signal`, `text-on-signal`, `bg-code`, `label`) instead of raw colors. `band` makes a dark section and `signal-band` an accent one; everything inside reads the swapped tokens.
- Icons from the design are inline SVG in `src/icon.ts` and draw with `currentColor`.
- The devlog pages in the design are intentionally not built yet. Do not add a devlog route or link until its hosting is decided.
- The Foldkit subtree is not vendored here to keep the repository small. For reference, clone `https://github.com/foldkit/foldkit` at the tag matching the installed `foldkit` version into a scratch directory instead.
- Search (`src/search/`) runs in the browser over an index that `scripts/search-index.ts` builds from `content/` at build time and serves as `virtual:silk-search-index`. The site imports it lazily, so it downloads the first time a reader opens search. Guide pages split at their level 2 and 3 headings; standard library pages split at each `::Anchor`ed declaration. `/` and Cmd+K (Ctrl+K) open the dialog on every page.
- Text written for the site avoids em-dashes.
- Every page has Open Graph and Twitter card tags (`src/entry.server.ts`) and its own 1200x630 preview image. `scripts/og-images.ts` renders the images at build time from the page title and section (`src/og.ts`) into `og/`; `pnpm dev` serves them at the same paths for previewing. Image and page URLs are absolute when `SILK_SITE_URL` is set, which the deploy workflow does.
- `scripts/llms-txt.ts` writes `/llms.txt` (an index in the llmstxt.org format), `/llms-full.txt` (every page in one file), a markdown copy of each page at `/docs/<section>/<slug>.md`, and `/llm.txt` and `/llm-full.txt` under the singular names, all from `content/` at build time.
- The playground (`/playground`, `src/playground/`) compiles and runs Silk in the browser. A worker runs the Silk compiler, built for wasm32-wasip1, on an in-memory WASI host (`src/playground/wasi.ts`) and builds programs with `--backend direct`, so no server is involved. `scripts/playground.ts` takes the compiler, the standard library and the examples from the newest release that publishes `silk-<version>-playground.tar.gz`, or from an unpacked archive named by `SILK_PLAYGROUND`; without one the page says the playground is not available in this build.
- `src/playground/language-server.ts` starts the Silk language server (`silkc lsp`) from the same toolchain in its own worker (`language-worker.ts`), over one package at `/work`. The worker blocks on standard input, so the page writes it through shared memory (`channel.ts`); that needs a cross-origin isolated page (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`), and without one `startLanguageServer` answers undefined. It needs a compiler from a release that includes silk-lang/silk#2747; older playground compilers stop at once because they cannot start threads.
- Versioned docs: the deploy runs `node scripts/versions.ts --sync-latest` first. It syncs `content/std` and `src/docs/generated.ts` from the newest silk release (so the landing page module list follows releases without a hand sync), and writes every release's docs to `.versions/`: its standard library from the release tag, and the hand-written pages from the last commit of this repository before the next release (HEAD for the newest). Pages are stored once by content hash under `/v/documents/`. `scripts/versions-plugin.ts` publishes `.versions/` at `/v/`, lists the versions as `virtual:silk-versions` for the picker in the docs sidebar, and writes `_redirects` so every `/v/<version>/docs/...` path serves the prerendered `/v` page, where the client renders the archived page (`src/versions/`). Without `.versions/` the picker is hidden. The hourly scheduled deploy only runs when there is a release the site was not built with.
