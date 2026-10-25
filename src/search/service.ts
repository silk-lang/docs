import { Context, Data, Effect, Layer, Schema } from 'effect'

import { type PreparedIndex, prepare, search } from './engine'
import { SearchIndex } from './record'
import { type Scope, type SearchOutcome } from './result'

export class IndexUnavailable extends Data.TaggedError('IndexUnavailable')<{
  readonly cause: unknown
}> {}

type SearchIndexApi = Readonly<{
  // Starts downloading the index without searching, so it is likely ready by
  // the time the reader has typed a word.
  warm: Effect.Effect<void, IndexUnavailable>
  search: (
    query: string,
    scope: Scope,
  ) => Effect.Effect<SearchOutcome, IndexUnavailable>
}>

const loadIndex: Effect.Effect<PreparedIndex, IndexUnavailable> =
  Effect.tryPromise({
    try: () => import('virtual:silk-search-index'),
    catch: cause => new IndexUnavailable({ cause }),
  }).pipe(
    Effect.flatMap(module =>
      Schema.decodeUnknownEffect(SearchIndex)(module.default).pipe(
        Effect.mapError(cause => new IndexUnavailable({ cause })),
      ),
    ),
    Effect.map(prepare),
    Effect.retry({ times: 2 }),
  )

export class SearchIndexService extends Context.Service<
  SearchIndexService,
  SearchIndexApi
>()('SearchIndexService') {
  static readonly Default = Layer.effect(
    this,
    Effect.map(Effect.cached(loadIndex), cachedIndex => ({
      warm: Effect.asVoid(cachedIndex),
      search: (query: string, scope: Scope) =>
        Effect.map(cachedIndex, index => search(index, query, scope)),
    })),
  )
}
