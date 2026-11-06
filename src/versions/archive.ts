import { Schema } from 'effect'

// The archived documentation of each Silk release, which scripts/versions.ts
// writes and the site serves under /v/:
//
//   /v/versions.json                  every archived version, newest first
//   /v/<version>/catalog.json         that version's sidebar groups
//   /v/documents/<hash>.json          one parsed page, shared by every
//                                     version whose page has the same content
//
// Archived pages are read at /v/<version>/docs/std/<slug>. Only generated
// pages, the standard library reference, are versioned; the hand-written
// pages always show the current docs.

export const VersionEntry = Schema.Struct({
  version: Schema.String,
  tag: Schema.String,
  publishedAt: Schema.String,
})
export type VersionEntry = typeof VersionEntry.Type

export const ArchivedPage = Schema.Struct({
  directory: Schema.String,
  slug: Schema.String,
  title: Schema.String,
  sourceUrl: Schema.String,
  document: Schema.String,
})
export type ArchivedPage = typeof ArchivedPage.Type

export const ArchivedGroup = Schema.Struct({
  key: Schema.String,
  title: Schema.String,
  pages: Schema.Array(ArchivedPage),
})
export type ArchivedGroup = typeof ArchivedGroup.Type

export const ArchivedCatalog = Schema.Struct({
  version: Schema.String,
  tag: Schema.String,
  publishedAt: Schema.String,
  format: Schema.String,
  groups: Schema.Array(ArchivedGroup),
})
export type ArchivedCatalog = typeof ArchivedCatalog.Type

export const versionPrefix = (version: string): string =>
  `/v/${encodeURIComponent(version)}`

export const catalogUrl = (version: string): string =>
  `${versionPrefix(version)}/catalog.json`

export const documentUrl = (hash: string): string => `/v/documents/${hash}.json`

export const archivedPagePath = (
  version: string,
  page: Readonly<{ directory: string; slug: string }>,
): string => `${versionPrefix(version)}/docs/${page.directory}/${page.slug}`

export const VERSIONED_DIRECTORY = 'std'

// Archived pages link to each other as the current site does,
// /docs/std/...; shown inside a version, such a link stays in that version.
// Links to hand-written pages go to the current docs.
export const versionedUrl = (version: string, url: string): string =>
  url.startsWith(`/docs/${VERSIONED_DIRECTORY}/`)
    ? `${versionPrefix(version)}${url}`
    : url
