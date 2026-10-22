# silk-lang/docs

The Silk website: landing page, documentation and releases. Built with
[Foldkit](https://foldkit.dev) and Tailwind CSS, statically generated, and deployed to
Cloudflare.

## Develop

```sh
pnpm install
pnpm dev
```

## Check

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build      # writes the static site to dist/client
pnpm preview    # serves dist/client
```

## Deploy

The site deploys to Cloudflare as an assets-only Worker with
[Alchemy](https://alchemy.run) (`alchemy.run.ts`). Alchemy needs Node 24.11 or newer.

`.github/workflows/deploy.yml` deploys on every push to `main`, once a day, on demand,
and on a `silk-release` repository dispatch, so new silk releases reach the releases
page. It reads:

- `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable).
- `SILK_DOCS_DOMAIN` (variable, optional): a hostname whose zone is in the same Cloudflare
  account. Without it the site is served from `workers.dev`.

The first deploy also creates Alchemy's state store Worker in the account.

To deploy from a machine instead:

```sh
pnpm alchemy profile edit --add Cloudflare   # once
pnpm run deploy
```

Builds fetch the silk releases from GitHub. Set `SILK_RELEASES=fixture` to build offline
with sample data.

## Layout

- `src/main.ts` is the application: Model, Messages, update and the routed view.
- `src/route.ts` maps URLs to pages. New pages also go in `prerenderPaths` in
  `src/entry.server.ts`, or they are not generated.
- `src/layout.ts` holds the site navigation and footer.
- `src/styles.css` holds the design tokens from the Elyx design.
- `public/` holds the Space Mono fonts (SIL Open Font License, see `public/fonts/OFL.txt`)
  and the brand avatars.

## Documentation content

Every page is a markdown file in `content/<section>/` and is served at
`/docs/<section>/<slug>`.

- Hand-written, edited here:
  - `content/get-started/`: install Silk, write a first program and set up an editor.
  - `content/book/`: learn the language by building one program, chapter by chapter.
  - `content/reference/`: the rules of the language, one topic per page.
  - `content/projects/`: manifests, modules, dependencies, workspaces and builds.
  - `content/tools/`: the `silk` command, testing, formatting, diagnostics and releases.
  - `content/guides/`: task-focused pages on the standard library.
  - `content/appendix/`: keywords, operators, diagnostic codes, grammar and glossary.

  A file name starts with its position in the sidebar, `NN-slug.md`, and the position is
  not part of the URL: `content/book/04-ownership.md` is `/docs/book/ownership`. The
  first `# ` heading is the page title, and `00-overview.md` opens each section. After
  adding, renaming or retitling a page, regenerate the sidebar (CI checks it is current):

  ```sh
  pnpm catalog   # rewrites src/docs/written.ts
  ```

- Synced from silk-lang/silk, not edited here: `content/spec/` (the prescriptive
  language specification, from the silk repository's `reference/`) and `content/std/`
  (the standard library API, from `reference/stdlib/`). Change the source in
  silk-lang/silk and sync again:

  ```sh
  pnpm sync-docs ../silk   # path to a silk-lang/silk checkout
  ```

  The script also rewrites `src/docs/generated.ts`, the sidebar groups for those pages.
  The group order for the specification lives at the top of `scripts/sync-silk-docs.ts`;
  a new file that is not listed there lands in a "Spec: more" group, with a warning.

The site's markdown renderer does not accept raw HTML, frontmatter, task lists or text
directives, so write `00\:00` for a colon followed by letters or digits in prose, or put
it in code. `pnpm catalog` fails on a page that does not parse.

See `AGENTS.md` for project conventions and `FOLDKIT.md` for Foldkit's.
