import { Schema } from 'effect'
import releasesData from 'virtual:silk-releases'

import { Release } from './release'

// Newest first, as GitHub lists them.
export const releases: ReadonlyArray<Release> = Schema.decodeUnknownSync(
  Schema.Array(Release),
)(releasesData)
