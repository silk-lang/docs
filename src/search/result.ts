import { Schema } from 'effect'

// What a search returns: hits grouped by the page they are on, with the parts
// of the title and snippet that matched the query marked for highlighting.

export const Segment = Schema.Struct({
  text: Schema.String,
  isMatch: Schema.Boolean,
})
export type Segment = typeof Segment.Type

export const SearchHit = Schema.Struct({
  href: Schema.String,
  title: Schema.Array(Segment),
  label: Schema.String,
  crumbs: Schema.Array(Schema.String),
  snippet: Schema.Array(Segment),
  signature: Schema.String,
})
export type SearchHit = typeof SearchHit.Type

export const ResultGroup = Schema.Struct({
  pageKey: Schema.String,
  pageTitle: Schema.String,
  groupTitle: Schema.String,
  hits: Schema.Array(SearchHit),
})
export type ResultGroup = typeof ResultGroup.Type

export const Scope = Schema.Literals(['All', 'Docs', 'Reference'])
export type Scope = typeof Scope.Type

export const SearchOutcome = Schema.Struct({
  groups: Schema.Array(ResultGroup),
  // The query that produced the groups when it differs from what the reader
  // typed, because a misspelled word was corrected.
  maybeCorrectedQuery: Schema.Option(Schema.String),
})
export type SearchOutcome = typeof SearchOutcome.Type
