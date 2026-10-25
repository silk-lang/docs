import { Array, Effect, Match, Number, Option, Schema, String } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command, Update } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog } from '@foldkit/ui'

import { Message } from './message'
import { type Model, SearchState, shownHits, shownOutcome } from './model'
import { Scope } from './result'
import { SearchIndexService } from './service'

export const SEARCH_INPUT_ID = 'search-input'
export const KEYBOARD_WARMUP_INPUT_ID = 'search-keyboard-warmup'
export const SEARCH_DIALOG_ID = 'search-dialog'

const MAX_RECENT_SEARCHES = 5
const RECENT_SEARCHES_KEY = 'silk-docs-recent-searches'
const RecentSearchesJson = Schema.fromJsonString(Schema.Array(Schema.String))

// INIT

export const init = (): Update.Return<Model, Message> => ({
  model: {
    dialog: Dialog.init({ id: SEARCH_DIALOG_ID }),
    query: '',
    scope: 'All',
    searchState: SearchState.Idle(),
    activeHitIndex: -1,
    recentSearches: [],
  },
})

// COMMAND

export const RunSearch = Command.define('RunSearch', {
  args: { query: Schema.String, scope: Scope },
  messages: [Message.SucceededSearch, Message.FailedSearch],
  execute: ({ query, scope }) =>
    Effect.gen(function* () {
      const index = yield* SearchIndexService
      const outcome = yield* index.search(query, scope)
      return Message.SucceededSearch({ query, scope, outcome })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Message.FailedSearch({ query, scope })),
      ),
    ),
})

export const WarmIndex = Command.define('WarmIndex', {
  messages: [Message.CompletedWarmIndex],
  execute: Effect.gen(function* () {
    const index = yield* SearchIndexService
    yield* index.warm
    return Message.CompletedWarmIndex()
  }).pipe(Effect.catch(() => Effect.succeed(Message.CompletedWarmIndex()))),
})

export const LoadRecentSearches = Command.define('LoadRecentSearches', {
  messages: [Message.CompletedLoadRecentSearches],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeStored = yield* store.get(RECENT_SEARCHES_KEY)
    const queries = yield* Option.match(Option.fromNullishOr(maybeStored), {
      onNone: () => Effect.succeed([]),
      onSome: stored => Schema.decodeEffect(RecentSearchesJson)(stored),
    })
    return Message.CompletedLoadRecentSearches({ queries })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(Message.CompletedLoadRecentSearches({ queries: [] })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
})

export const SaveRecentSearches = Command.define('SaveRecentSearches', {
  args: { queries: Schema.Array(Schema.String) },
  messages: [Message.CompletedSaveRecentSearches],
  execute: ({ queries }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encoded = yield* Schema.encodeEffect(RecentSearchesJson)(queries)
      yield* store.set(RECENT_SEARCHES_KEY, encoded)
      return Message.CompletedSaveRecentSearches()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveRecentSearches())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const ScrollToHit = Command.define('ScrollToHit', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollToHit],
  execute: ({ index }) =>
    Dom.scrollIntoViewIfNotVisible(`[data-search-hit-index="${index}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollToHit()),
    ),
})

export const NavigateToHit = Command.define('NavigateToHit', {
  args: { href: Schema.String },
  messages: [Message.CompletedNavigateToHit],
  execute: ({ href }) =>
    pushUrl(href).pipe(Effect.as(Message.CompletedNavigateToHit())),
})

export const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

// UPDATE

export type UpdateReturn = Update.Return<Model, Message, SearchIndexService>

const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const readDialog = (model: Model) => Option.some(model.dialog)

const writeDialog = (model: Model, nextDialog: Dialog.Model): Model =>
  modifyFields(model, { dialog: () => nextDialog })

const toDialogMessage = (message: Dialog.Message): Message =>
  Message.GotDialogMessage({ message })

const foldDialog = Update.foldChild({
  update: Dialog.update,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogOpen: Update.Step<Model, Message> = Update.foldChildStep({
  update: Dialog.open,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

const cleared = (model: Model): Model =>
  modifyFields(model, {
    query: () => '',
    searchState: () => SearchState.Idle(),
    activeHitIndex: () => -1,
  })

const startSearch = (
  model: Model,
  query: string,
  scope: Scope,
): UpdateReturn =>
  String.isEmpty(query.trim())
    ? { model: modifyFields(cleared(model), { query: () => query }) }
    : {
        model: modifyFields(model, {
          query: () => query,
          scope: () => scope,
          searchState: () =>
            SearchState.Searching({
              previous: Array.head(shownOutcome(model.searchState)),
            }),
        }),
        commands: [RunSearch({ query, scope })],
      }

const withRecentSearch = (
  recentSearches: ReadonlyArray<string>,
  query: string,
): ReadonlyArray<string> =>
  String.isEmpty(query)
    ? recentSearches
    : Array.take(
        Array.prepend(
          Array.filter(recentSearches, recent => recent !== query),
          query,
        ),
        MAX_RECENT_SEARCHES,
      )

export const open = (model: Model): UpdateReturn =>
  Update.combine(model, [
    foldDialogOpen,
    stepModel => ({
      model: stepModel,
      commands: [FocusSearchInput(), WarmIndex(), LoadRecentSearches()],
    }),
  ])

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSearchQuery: ({ query }) =>
      query === model.query
        ? { model }
        : startSearch(model, query, model.scope),

    SelectedScope: ({ scope }) =>
      scope === model.scope
        ? { model }
        : String.isEmpty(model.query.trim())
          ? { model: modifyFields(model, { scope: () => scope }) }
          : startSearch(model, model.query, scope),

    SucceededSearch: ({ query, scope, outcome }) =>
      query !== model.query || scope !== model.scope
        ? { model }
        : {
            model: modifyFields(model, {
              searchState: () => SearchState.Ready({ outcome }),
              activeHitIndex: () => 0,
            }),
          },

    FailedSearch: ({ query, scope }) =>
      query !== model.query || scope !== model.scope
        ? { model }
        : {
            model: modifyFields(model, {
              searchState: () => SearchState.Unavailable(),
              activeHitIndex: () => -1,
            }),
          },

    CompletedWarmIndex: () => ({ model }),

    PressedArrowKey: ({ direction }) => {
      const lastIndex = shownHits(model.searchState).length - 1
      if (lastIndex < 0) {
        return { model }
      }
      const nextIndex = Match.value(direction).pipe(
        Match.when('Up', () =>
          model.activeHitIndex <= 0
            ? lastIndex
            : Number.decrement(model.activeHitIndex),
        ),
        Match.when('Down', () =>
          model.activeHitIndex >= lastIndex
            ? 0
            : Number.increment(model.activeHitIndex),
        ),
        Match.exhaustive,
      )
      return {
        model: modifyFields(model, { activeHitIndex: () => nextIndex }),
        commands: [ScrollToHit({ index: nextIndex })],
      }
    },

    PointedAtHit: ({ index }) =>
      index === model.activeHitIndex
        ? { model }
        : { model: modifyFields(model, { activeHitIndex: () => index }) },

    SelectedHit: ({ href }) => {
      const recentSearches = withRecentSearch(
        model.recentSearches,
        model.query.trim(),
      )
      return {
        model: modifyFields(cleared(model), {
          recentSearches: () => recentSearches,
        }),
        commands: [
          NavigateToHit({ href }),
          SaveRecentSearches({ queries: recentSearches }),
        ],
      }
    },

    ClickedRecentSearch: ({ query }) => startSearch(model, query, model.scope),

    ClearedSearchQuery: () => ({ model: cleared(model) }),

    GotDialogMessage: ({ message }) =>
      Update.combine(model, [
        foldDialog(message),
        stepModel =>
          message._tag === 'CompletedCloseDialog'
            ? { model: cleared(stepModel) }
            : { model: stepModel },
      ]),

    CompletedLoadRecentSearches: ({ queries }) => ({
      model: modifyFields(model, { recentSearches: () => queries }),
    }),

    CompletedSaveRecentSearches: () => ({ model }),
    CompletedNavigateToHit: () => ({ model }),
    CompletedScrollToHit: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
  })

export const informRouteChanged = (model: Model): UpdateReturn =>
  model.dialog.isOpen
    ? Update.combine(model, [
        stepModel => ({ model: cleared(stepModel) }),
        foldDialogClose,
      ])
    : { model }
