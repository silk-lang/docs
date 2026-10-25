import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Message } from './message'
import { SearchState } from './model'
import { type SearchOutcome } from './result'
import {
  NavigateToHit,
  RunSearch,
  SaveRecentSearches,
  ScrollToHit,
  init,
  update,
} from './update'

const hit = (href: string) => ({
  href,
  title: [{ text: href, isMatch: false }],
  label: '',
  crumbs: [],
  snippet: [],
  signature: '',
})

const outcome: SearchOutcome = {
  groups: [
    {
      pageKey: 'std/list',
      pageTitle: 'silk.list',
      groupTitle: 'Standard library',
      hits: [
        hit('/docs/std/list#List.impl.append'),
        hit('/docs/std/list#List'),
      ],
    },
  ],
  maybeCorrectedQuery: Option.none(),
}

const initModel = init().model

describe('search', () => {
  test('typing a query runs a search and shows its outcome', () => {
    story(
      update,
      given(initModel),
      message(Message.UpdatedSearchQuery({ query: 'append' })),
      model(model => {
        expect(model.searchState._tag).toBe('Searching')
      }),
      Command.resolve(
        RunSearch,
        Message.SucceededSearch({ query: 'append', scope: 'All', outcome }),
      ),
      model(model => {
        expect(model.searchState).toEqual(SearchState.Ready({ outcome }))
        expect(model.activeHitIndex).toBe(0)
      }),
    )
  })

  test('an outcome for an older query is ignored', () => {
    story(
      update,
      given(modifyFields(initModel, { query: () => 'appendBytes' })),
      message(
        Message.SucceededSearch({ query: 'append', scope: 'All', outcome }),
      ),
      model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
    )
  })

  test('changing the scope searches again', () => {
    story(
      update,
      given(modifyFields(initModel, { query: () => 'append' })),
      message(Message.SelectedScope({ scope: 'Reference' })),
      Command.resolve(
        RunSearch,
        Message.SucceededSearch({
          query: 'append',
          scope: 'Reference',
          outcome,
        }),
      ),
      model(model => {
        expect(model.scope).toBe('Reference')
        expect(model.searchState._tag).toBe('Ready')
      }),
    )
  })

  test('the arrow keys move through hits across groups and wrap', () => {
    story(
      update,
      given(
        modifyFields(initModel, {
          query: () => 'append',
          searchState: () => SearchState.Ready({ outcome }),
          activeHitIndex: () => 0,
        }),
      ),
      message(Message.PressedArrowKey({ direction: 'Up' })),
      model(model => {
        expect(model.activeHitIndex).toBe(1)
      }),
      Command.resolve(ScrollToHit, Message.CompletedScrollToHit()),
      message(Message.PressedArrowKey({ direction: 'Down' })),
      model(model => {
        expect(model.activeHitIndex).toBe(0)
      }),
      Command.resolve(ScrollToHit, Message.CompletedScrollToHit()),
    )
  })

  test('opening a hit remembers the query and navigates', () => {
    story(
      update,
      given(
        modifyFields(initModel, {
          query: () => 'append',
          recentSearches: () => ['arena', 'append'],
        }),
      ),
      message(Message.SelectedHit({ href: '/docs/std/list#List.impl.append' })),
      model(model => {
        expect(model.recentSearches).toEqual(['append', 'arena'])
        expect(model.query).toBe('')
      }),
      Command.resolve(NavigateToHit, Message.CompletedNavigateToHit()),
      Command.resolve(
        SaveRecentSearches,
        Message.CompletedSaveRecentSearches(),
      ),
    )
  })
})
