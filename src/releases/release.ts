import { Schema } from 'effect'

// The release data the site shows. scripts/releases.ts builds it from the
// GitHub releases of silk-lang/silk at build time and hands it over as JSON,
// so nullable fields stay null here instead of Option.

export const Download = Schema.Struct({
  os: Schema.String,
  arch: Schema.String,
  target: Schema.String,
  fileName: Schema.String,
  url: Schema.String,
  size: Schema.Number,
  sha256: Schema.NullOr(Schema.String),
  signatureUrl: Schema.NullOr(Schema.String),
})
export type Download = typeof Download.Type

export const Release = Schema.Struct({
  version: Schema.String,
  tag: Schema.String,
  isPrerelease: Schema.Boolean,
  publishedAt: Schema.String,
  notesUrl: Schema.String,
  downloads: Schema.Array(Download),
})
export type Release = typeof Release.Type

export const MINISIGN_PUBLIC_KEY =
  'RWQefAo9Dbb8LrlLPaqWdRNlX5th2l7r+4WYhxRNbe5K5URDUht1XUDs'

export const RELEASES_URL = 'https://github.com/silk-lang/silk/releases'

export const INDEX_PATH = '/releases/index.json'
