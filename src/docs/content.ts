import { Data, Effect, Option, Record } from 'effect'

import * as Markdown from '@foldkit/markdown'

import { type DocPage, pageKey } from './catalog'

// Each markdown file becomes its own chunk, so a page only downloads the
// document it shows. The prerendered HTML carries the first document as Flags.
const loaders = Record.mapKeys(
  import.meta.glob<{ default: unknown }>('/content/**/*.md'),
  path => path.replace(/^\/content\//, '').replace(/\.md$/, ''),
)

export class MissingDocument extends Data.TaggedError('MissingDocument')<{
  readonly key: string
}> {}

export const loadDocumentByKey = (
  key: string,
): Effect.Effect<Markdown.MarkdownDocument, MissingDocument> =>
  Option.match(Record.get(loaders, key), {
    onNone: () => Effect.fail(new MissingDocument({ key })),
    onSome: load =>
      Effect.tryPromise({
        try: () => load(),
        catch: () => new MissingDocument({ key }),
      }).pipe(Effect.map(module => Markdown.decodeDocument(module.default))),
  })

export const loadDocument = (
  page: DocPage,
): Effect.Effect<Markdown.MarkdownDocument, MissingDocument> =>
  loadDocumentByKey(pageKey(page))

export const hasDocument = (page: DocPage): boolean =>
  Record.has(loaders, pageKey(page))
