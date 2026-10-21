import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Docs: {},
  Releases: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
export const docsRouter = pipe(literal('docs'), Route.mapTo(AppRoute.Docs))
export const releasesRouter = pipe(
  literal('releases'),
  Route.mapTo(AppRoute.Releases),
)

const routeParser = Route.oneOf(docsRouter, releasesRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
