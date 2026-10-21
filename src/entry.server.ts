import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { init, view } from './main'

const HEAD = [
  '<meta name="description" content="Silk is a systems language where effects, failures, and dependencies compose, and ownership keeps every resource explicit.">',
  '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e3e1dc">',
  '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e1d1c">',
  '<link rel="icon" type="image/svg+xml" href="/brand/silk-avatar-light.svg" media="(prefers-color-scheme: light)">',
  '<link rel="icon" type="image/svg+xml" href="/brand/silk-avatar-dark.svg" media="(prefers-color-scheme: dark)">',
  '<link rel="apple-touch-icon" href="/brand/silk-avatar-dark.png">',
  '<link rel="preload" href="/fonts/SpaceMono-Regular.ttf" as="font" type="font/ttf" crossorigin>',
  '<link rel="preload" href="/fonts/SpaceMono-Bold.ttf" as="font" type="font/ttf" crossorigin>',
].join('')

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, { head: HEAD })

export const prerenderPaths: ReadonlyArray<string> = ['/', '/docs', '/releases']

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { routing: {}, init, view },
        { url: request.url },
      )

      return Server.Rendered(renderedApplication)
    }),
  )
