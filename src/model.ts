import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import * as Markdown from '@foldkit/markdown'

import { AppRoute } from './route'

export const DocState = defineTaggedUnion({
  Idle: {},
  Loading: { key: Schema.String },
  Loaded: { key: Schema.String, document: Markdown.MarkdownDocument },
  Failed: { key: Schema.String },
})
export type DocState = typeof DocState.Type

export const Model = Schema.Struct({
  route: AppRoute,
  copiedCodeIds: Schema.HashSet(Schema.String),
  doc: DocState,
  sidebarQuery: Schema.String,
  openGroups: Schema.HashSet(Schema.String),
  maybeActiveSection: Schema.Option(Schema.String),
  maybePendingAnchor: Schema.Option(Schema.String),
  // Documents already downloaded, by page key, so returning to a page or
  // opening a prefetched one shows it without a loading state.
  documents: Schema.HashMap(Schema.String, Markdown.MarkdownDocument),
  requestedDocumentKeys: Schema.HashSet(Schema.String),
})
export type Model = typeof Model.Type

export const LoadedDocument = Schema.Struct({
  key: Schema.String,
  document: Markdown.MarkdownDocument,
})

export const Flags = Schema.Struct({
  maybeDocument: Schema.Option(LoadedDocument),
})
export type Flags = typeof Flags.Type
