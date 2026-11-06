import { Data, Effect, Schema } from 'effect'

import * as Markdown from '@foldkit/markdown'

import { ArchivedCatalog, catalogUrl, documentUrl } from './archive'
import { ARCHIVE_KEY_PREFIX } from './context'

export class ArchiveUnavailable extends Data.TaggedError('ArchiveUnavailable')<{
  readonly url: string
}> {}

const fetchJson = (url: string): Effect.Effect<unknown, ArchiveUnavailable> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const json: unknown = await response.json()
      return json
    },
    catch: () => new ArchiveUnavailable({ url }),
  })

export const loadCatalog = (
  version: string,
): Effect.Effect<ArchivedCatalog, ArchiveUnavailable> =>
  fetchJson(catalogUrl(version)).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(ArchivedCatalog)),
    Effect.mapError(() => new ArchiveUnavailable({ url: catalogUrl(version) })),
  )

export const isArchiveKey = (key: string): boolean =>
  key.startsWith(ARCHIVE_KEY_PREFIX)

export const loadArchivedDocument = (
  key: string,
): Effect.Effect<Markdown.MarkdownDocument, ArchiveUnavailable> => {
  const url = documentUrl(key.slice(ARCHIVE_KEY_PREFIX.length))
  return fetchJson(url).pipe(
    Effect.flatMap(json =>
      Effect.try({
        try: () => Markdown.decodeDocument(json),
        catch: () => new ArchiveUnavailable({ url }),
      }),
    ),
  )
}
