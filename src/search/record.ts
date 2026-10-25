import { Schema } from 'effect'

// The search index the site downloads the first time a reader searches. It is
// built from content/ at build time (scripts/search-index.ts) and travels as
// tuples rather than objects, which keeps the download about a third smaller.

// One entry per page: its key (`book/ownership`), title and sidebar group.
export const IndexedPage = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
])
export type IndexedPage = typeof IndexedPage.Type

// One entry per searchable part of a page: the page itself, a section of a
// guide, or a declaration in a standard library module.
//
// [page index, anchor ('' for the page itself), title, label, parent headings,
//  plain text, signature]
//
// The label names what a declaration is (`Method`, `Struct`), and is empty for
// prose. The signature is the declaration's code, empty for prose.
export const IndexedSection = Schema.Tuple([
  Schema.Number,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.Array(Schema.String),
  Schema.String,
  Schema.String,
])
export type IndexedSection = typeof IndexedSection.Type

export const SearchIndex = Schema.Struct({
  pages: Schema.Array(IndexedPage),
  sections: Schema.Array(IndexedSection),
})
export type SearchIndex = typeof SearchIndex.Type
