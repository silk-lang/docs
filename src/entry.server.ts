import { Effect, Option, pipe } from 'effect'
import { Server } from 'foldkit/experimental'
import * as Url from 'foldkit/url'

import * as Catalog from './docs/catalog'
import * as Content from './docs/content'
import { pageDescription } from './docs/description'
import { Flags, init, view } from './main'
import * as Og from './og'
import { AppRoute, urlToAppRoute } from './route'

const HEAD = [
  '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e3e1dc">',
  '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e1d1c">',
  '<link rel="icon" type="image/svg+xml" href="/brand/silk-favicon.svg">',
  '<link rel="apple-touch-icon" href="/brand/silk-apple-touch-icon.png">',
  '<link rel="preload" href="/fonts/SpaceMono-Regular.woff2" as="font" type="font/woff2" crossorigin>',
  '<link rel="preload" href="/fonts/SpaceMono-Bold.woff2" as="font" type="font/woff2" crossorigin>',
].join('')

// Link previews need absolute URLs. The deploy workflow sets SILK_SITE_URL to
// the site's origin; without it (local and CI builds) the image URLs stay
// relative and og:url is left out.
const SITE_URL = (process.env['SILK_SITE_URL'] ?? '').replace(/\/$/, '')

type PageMeta = Readonly<{
  path: string
  description: string
  card: Og.OgCard
}>

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const metaTags = (title: string, meta: PageMeta): string => {
  const image = `${SITE_URL}${meta.card.path}`
  const alt =
    meta.card.label === '' ? title : `${meta.card.label}: ${meta.card.title}`
  return [
    ['name', 'description', meta.description],
    ['property', 'og:type', meta.path === '/' ? 'website' : 'article'],
    ['property', 'og:site_name', Og.SITE_NAME],
    ['property', 'og:title', title],
    ['property', 'og:description', meta.description],
    ...(SITE_URL === ''
      ? []
      : [['property', 'og:url', `${SITE_URL}${meta.path}`]]),
    ['property', 'og:image', image],
    ['property', 'og:image:type', 'image/png'],
    ['property', 'og:image:width', String(Og.OG_IMAGE_WIDTH)],
    ['property', 'og:image:height', String(Og.OG_IMAGE_HEIGHT)],
    ['property', 'og:image:alt', alt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', meta.description],
    ['name', 'twitter:image', image],
    ['name', 'twitter:image:alt', alt],
  ]
    .map(
      ([key, name, content]) =>
        `<meta ${key}="${name}" content="${escapeAttribute(content ?? '')}">`,
    )
    .join('')
}

// The host renders the document from the application renderPage returned, so
// renderPage leaves each page's metadata here for renderDocument to pick up.
const pageMeta = new WeakMap<Server.RenderedApplication, PageMeta>()

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: Option.match(Option.fromNullishOr(pageMeta.get(application)), {
      onNone: () =>
        `<meta name="description" content="${escapeAttribute(Og.SITE_DESCRIPTION)}">${HEAD}`,
      onSome: meta => metaTags(application.title, meta) + HEAD,
    }),
  })

export const prerenderPaths: ReadonlyArray<string> = [
  '/',
  '/docs',
  '/releases',
  // Copied to 404.html by `pnpm build:site` for Cloudflare's 404 handling.
  '/404',
  ...Catalog.allPages.map(Catalog.pagePath),
]

const routeForRequest = (request: Request): AppRoute =>
  Option.match(Url.fromString(request.url), {
    onNone: () => AppRoute.Home(),
    onSome: urlToAppRoute,
  })

// The page's document travels in the Flags so hydration renders the same
// article without downloading it again.
const flagsForRoute = (route: AppRoute): Effect.Effect<Flags> => {
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

const homeMeta: PageMeta = {
  path: '/',
  description: Og.SITE_DESCRIPTION,
  card: Og.homeCard,
}

const metaForRoute = (route: AppRoute, flags: Flags): PageMeta =>
  AppRoute.match(route, {
    Home: () => homeMeta,
    Docs: () => ({
      path: '/docs',
      description:
        'Install Silk and take the tour, read the book, and look up the language reference, the guides and the standard library.',
      card: Og.docsCard,
    }),
    DocPage: ({ directory, slug }) =>
      Option.match(Catalog.findPage(directory, slug), {
        onNone: () => homeMeta,
        onSome: page => ({
          path: Catalog.pagePath(page),
          description: pipe(
            flags.maybeDocument,
            Option.flatMap(({ document }) => pageDescription(document)),
            Option.getOrElse(() => Og.SITE_DESCRIPTION),
          ),
          card: Og.pageCard(
            page,
            Option.match(Catalog.findGroup(page), {
              onNone: () => 'Docs',
              onSome: group => group.title,
            }),
          ),
        }),
      }),
    Releases: () => ({
      path: '/releases',
      description:
        'Prebuilt Silk toolchains for macOS and Linux, newest first, with the notes for every release.',
      card: Og.releasesCard,
    }),
    NotFound: () => homeMeta,
  })

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const route = routeForRequest(request)
      const flags = yield* flagsForRoute(route)
      const renderedApplication = yield* Server.renderToString(
        { Flags, routing: {}, init, view },
        { url: request.url, flags },
      )
      pageMeta.set(renderedApplication, metaForRoute(route, flags))

      return Server.Rendered(renderedApplication)
    }),
  )
