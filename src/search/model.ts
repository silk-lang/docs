import { Array, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Dialog } from '@foldkit/ui'

import { Scope, type SearchHit, SearchOutcome } from './result'

export const SearchState = defineTaggedUnion({
  Idle: {},
  // The previous outcome stays on screen while the next one is computed, so
  // the list does not flash empty between keystrokes.
  Searching: { previous: Schema.Option(SearchOutcome) },
  Ready: { outcome: SearchOutcome },
  Unavailable: {},
})
export type SearchState = typeof SearchState.Type

export const Model = Schema.Struct({
  dialog: Dialog.Model,
  query: Schema.String,
  scope: Scope,
  searchState: SearchState,
  // Index into every hit of every group, in the order they are shown.
  activeHitIndex: Schema.Number,
  recentSearches: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type

export const shownOutcome = (
  state: SearchState,
): ReadonlyArray<SearchOutcome> =>
  SearchState.match(state, {
    Idle: () => [],
    Searching: ({ previous }) => Array.fromOption(previous),
    Ready: ({ outcome }) => [outcome],
    Unavailable: () => [],
  })

export const shownHits = (state: SearchState): ReadonlyArray<SearchHit> =>
  Array.flatMap(shownOutcome(state), outcome =>
    Array.flatMap(outcome.groups, group => group.hits),
  )
