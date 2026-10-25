# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

This is the Silk website: landing page, docs and releases, built from the Elyx design for Silk.

- Statically generated (`ssr.build.prerender` in `vite.config.ts`). Every route that should exist as a page has to be listed in `prerenderPaths` in `src/entry.server.ts`.
- Styling is Tailwind v4. Design tokens (colors, Space Mono, label style) live in `src/styles.css` and follow the design's light and dark token sets through `prefers-color-scheme`. Use the token classes (`bg-paper`, `text-ink`, `text-muted`, `border-rule`, `text-signal`, `bg-code`, `label`) instead of raw colors.
- Icons from the design are inline SVG in `src/icon.ts` and draw with `currentColor`.
- The devlog pages in the design are intentionally not built yet. Do not add a devlog route or link until its hosting is decided.
- The Foldkit subtree is not vendored here to keep the repository small. For reference, clone `https://github.com/foldkit/foldkit` at the tag matching the installed `foldkit` version into a scratch directory instead.
- Search (`src/search/`) runs in the browser over an index that `scripts/search-index.ts` builds from `content/` at build time and serves as `virtual:silk-search-index`. The site imports it lazily, so it downloads the first time a reader opens search. Guide pages split at their level 2 and 3 headings; standard library pages split at each `::Anchor`ed declaration. `/` and Cmd+K (Ctrl+K) open the dialog on every page.
- Text written for the site avoids em-dashes.
