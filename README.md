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

## Layout

- `src/main.ts` is the application: Model, Messages, update and the routed view.
- `src/route.ts` maps URLs to pages. New pages also go in `prerenderPaths` in
  `src/entry.server.ts`, or they are not generated.
- `src/layout.ts` holds the site navigation and footer.
- `src/styles.css` holds the design tokens from the Elyx design.
- `public/` holds the Space Mono fonts (SIL Open Font License, see `public/fonts/OFL.txt`)
  and the brand avatars.

## Documentation content

- `content/start/` holds the Get started pages, written here.
- `content/reference/` and `content/std/` are synced from the silk repository's
  `reference/` directory. Do not edit them here; change the source in silk-lang/silk and
  sync again:

  ```sh
  pnpm sync-docs ../silk   # path to a silk-lang/silk checkout
  ```

  The script also rewrites `src/docs/generated.ts`, the sidebar groups for those pages.
  The group order for the language reference lives at the top of
  `scripts/sync-silk-docs.ts`; a new reference file that is not listed there lands in a
  "More reference" group, with a warning.

See `AGENTS.md` for project conventions and `FOLDKIT.md` for Foldkit's.
