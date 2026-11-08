import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Docs: {},
  DocPage: { directory: Schema.String, slug: Schema.String },
  Releases: {},
  Playground: {},
  Snippet: {},
  Versions: {},
  VersionedDocs: { version: Schema.String },
  VersionedDocPage: {
    version: Schema.String,
    directory: Schema.String,
    slug: Schema.String,
  },
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
export const docsRouter = pipe(literal('docs'), Route.mapTo(AppRoute.Docs))
export const docPageRouter = pipe(
  literal('docs'),
  slash(string('directory')),
  slash(string('slug')),
  Route.mapTo(AppRoute.DocPage),
)
export const releasesRouter = pipe(
  literal('releases'),
  Route.mapTo(AppRoute.Releases),
)

export const playgroundRouter = pipe(
  literal('playground'),
  Route.mapTo(AppRoute.Playground),
)

// A page for making images of code. Nothing links to it.
export const snippetRouter = pipe(
  literal('snippet'),
  Route.mapTo(AppRoute.Snippet),
)

// Archived docs of a release: /v/0.1.0-dev.47/docs/std/core-effect.
export const versionsRouter = pipe(literal('v'), Route.mapTo(AppRoute.Versions))
export const versionedDocsRouter = pipe(
  literal('v'),
  slash(string('version')),
  slash(literal('docs')),
  Route.mapTo(AppRoute.VersionedDocs),
)
export const versionedDocPageRouter = pipe(
  literal('v'),
  slash(string('version')),
  slash(literal('docs')),
  slash(string('directory')),
  slash(string('slug')),
  Route.mapTo(AppRoute.VersionedDocPage),
)

const routeParser = Route.oneOf(
  versionedDocPageRouter,
  versionedDocsRouter,
  versionsRouter,
  docPageRouter,
  docsRouter,
  releasesRouter,
  playgroundRouter,
  snippetRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
