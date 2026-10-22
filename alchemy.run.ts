// Deploys the static site to Cloudflare as an assets-only Worker.
//
//   pnpm alchemy deploy --stage prod
//
// Credentials come from CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or
// from a local profile (`pnpm alchemy profile edit --add Cloudflare`).
// SILK_DOCS_DOMAIN attaches a custom domain whose zone is already in the
// Cloudflare account; without it the site is served from workers.dev.

import * as Alchemy from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import { Config, Effect, Option } from 'effect'

export default Alchemy.Stack(
  'SilkDocs',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const maybeDomain = Option.filter(
      yield* Config.option(Config.String('SILK_DOCS_DOMAIN')),
      domain => domain !== '',
    )

    const site = yield* Cloudflare.Website.StaticSite('Website', {
      command: 'pnpm build:site',
      outdir: 'dist/client',
      // The releases page reads GitHub at build time, so the site has to
      // rebuild even when no file in this repository changed.
      memo: false,
      assets: {
        htmlHandling: 'auto-trailing-slash',
        notFoundHandling: '404-page',
      },
      domain: Option.getOrNull(maybeDomain),
      dev: { command: 'pnpm dev' },
    })

    return { url: site.url }
  }),
)
