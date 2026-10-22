import { Effect, Option } from 'effect'
import { Server } from 'foldkit/experimental'
import * as Url from 'foldkit/url'

import * as Catalog from './docs/catalog'
import * as Content from './docs/content'
import { Flags, init, view } from './main'
import { AppRoute, urlToAppRoute } from './route'

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

export const prerenderPaths: ReadonlyArray<string> = [
  '/',
  '/docs',
  '/releases',
  ...Catalog.allPages.map(Catalog.pagePath),
]

// The page's document travels in the Flags so hydration renders the same
// article without downloading it again.
const flagsForRequest = (request: Request): Effect.Effect<Flags> => {
  const route = Option.match(Url.fromString(request.url), {
    onNone: () => AppRoute.Home(),
    onSome: urlToAppRoute,
  })
  if (route._tag !== 'DocPage') {
    return Effect.succeed({ maybeDocument: Option.none() })
  }
  return Option.match(Catalog.findPage(route.directory, route.slug), {
    onNone: () => Effect.succeed({ maybeDocument: Option.none() }),
    onSome: page =>
      Content.loadDocument(page).pipe(
        Effect.map(document =>
          Option.some({ key: Catalog.pageKey(page), document }),
        ),
        Effect.orDie,
        Effect.map(maybeDocument => ({ maybeDocument })),
      ),
  })
}

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const flags = yield* flagsForRequest(request)
      const renderedApplication = yield* Server.renderToString(
        { Flags, routing: {}, init, view },
        { url: request.url, flags },
      )

      return Server.Rendered(renderedApplication)
    }),
  )
