import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import * as Markdown from '@foldkit/markdown'

import * as Search from './search'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedScrollToTop: {},
  CompletedScrollToAnchor: {},
  ClickedCopyCode: { codeId: Schema.String, text: Schema.String },
  SucceededCopyCode: { codeId: Schema.String },
  FailedCopyCode: {},
  CompletedWaitBeforeHidingCopied: { codeId: Schema.String },
  SucceededLoadDocument: {
    key: Schema.String,
    document: Markdown.MarkdownDocument,
  },
  FailedLoadDocument: { key: Schema.String },
  PointedAtDocLink: { key: Schema.String },
  ClickedSidebarGroup: { groupKey: Schema.String },
  PressedSearchShortcut: {},
  ClickedOpenSearch: {},
  GotSearchMessage: { message: Search.Message },
  ChangedActiveSection: { sectionId: Schema.String },
})
export type Message = typeof Message.Type
