import { Schema } from 'effect'

// The archived documentation of each Silk release, which scripts/versions.ts
// writes and the site serves under /v/:
//
//   /v/versions.json                  every archived version, newest first
//   /v/<version>/catalog.json         that version's sidebar groups
//   /v/documents/<hash>.json          one parsed page, shared by every
//                                     version whose page has the same content
//
// Archived pages are read at /v/<version>/docs/<directory>/<slug>.

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
  // The commit of silk-lang/docs the hand-written pages come from, or null
  // for a release older than this repository's content.
  docsCommit: Schema.NullOr(Schema.String),
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

// Archived pages link to each other as the current site does, /docs/...;
// shown inside a version, such a link stays in that version.
export const versionedUrl = (version: string, url: string): string =>
  url === '/docs' || url.startsWith('/docs/') || url.startsWith('/docs#')
    ? `${versionPrefix(version)}${url}`
    : url
