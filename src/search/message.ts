import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

import { Scope, SearchOutcome } from './result'

export const Message = defineMessageUnion({
  UpdatedSearchQuery: { query: Schema.String },
  SelectedScope: { scope: Scope },
  SucceededSearch: {
    query: Schema.String,
    scope: Scope,
    outcome: SearchOutcome,
  },
  FailedSearch: { query: Schema.String, scope: Scope },
  CompletedWarmIndex: {},
  PressedArrowKey: { direction: Schema.Literals(['Up', 'Down']) },
  PointedAtHit: { index: Schema.Number },
  SelectedHit: { href: Schema.String },
  ClickedRecentSearch: { query: Schema.String },
  ClearedSearchQuery: {},
  GotDialogMessage: { message: Dialog.Message },
  CompletedLoadRecentSearches: { queries: Schema.Array(Schema.String) },
  CompletedSaveRecentSearches: {},
  CompletedNavigateToHit: {},
  CompletedScrollToHit: {},
  CompletedFocusSearchInput: {},
})
export type Message = typeof Message.Type
