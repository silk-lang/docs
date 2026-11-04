import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Docs: {},
  DocPage: { directory: Schema.String, slug: Schema.String },
  Releases: {},
  Playground: {},
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

const routeParser = Route.oneOf(
  docPageRouter,
  docsRouter,
  releasesRouter,
  playgroundRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
