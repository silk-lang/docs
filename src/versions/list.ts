import { Array, Option, Schema } from 'effect'
import data from 'virtual:silk-versions'

import { VersionEntry } from './archive'

// Every archived version, newest first, from the archive the deploy builds
// (scripts/versions.ts). Empty in a build without one, which hides the
// version picker.
export const versions: ReadonlyArray<VersionEntry> = Schema.decodeUnknownSync(
  Schema.Array(VersionEntry),
)(data)

// The newest release is what the site at /docs shows.
export const maybeLatest: Option.Option<VersionEntry> = Array.head(versions)

export const findVersion = (version: string): Option.Option<VersionEntry> =>
  Array.findFirst(versions, entry => entry.version === version)
