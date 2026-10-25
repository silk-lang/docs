import { Array, Match, Option, String, pipe } from 'effect'
import { Submodel } from 'foldkit'
import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Dialog } from '@foldkit/ui'

import * as Icon from '../icon'
import { Message } from './message'
import { type Model, SearchState, shownHits } from './model'
import {
  type ResultGroup,
  type Scope,
  type SearchHit,
  type SearchOutcome,
  type Segment,
} from './result'
import { KEYBOARD_WARMUP_INPUT_ID, SEARCH_INPUT_ID } from './update'

const RESULTS_LIST_ID = 'search-results'
const hitId = (index: number): string => `search-hit-${index}`

const SCOPES: ReadonlyArray<readonly [Scope, string]> = [
  ['All', 'All'],
  ['Docs', 'Docs'],
  ['Reference', 'Standard library'],
]

// INPUT

const handleInputKeyDown = (
  key: string,
  model: Model,
): Option.Option<Message> =>
  Match.value(key).pipe(
    Match.when('ArrowDown', () =>
      Option.some(Message.PressedArrowKey({ direction: 'Down' })),
    ),
    Match.when('ArrowUp', () =>
      Option.some(Message.PressedArrowKey({ direction: 'Up' })),
    ),
    Match.when('Escape', () =>
      String.isNonEmpty(model.query)
        ? Option.some(Message.ClearedSearchQuery())
        : Option.none(),
    ),
    Match.when('Enter', () =>
      pipe(
        shownHits(model.searchState),
        Array.get(model.activeHitIndex),
        Option.map(hit => Message.SelectedHit({ href: hit.href })),
      ),
    ),
    Match.orElse(() => Option.none()),
  )

const kbd = (text: string, h: HtmlBuilder<Message>): Html =>
  h.kbd(
    [
      h.Class(
        'rounded-md border border-rule px-1.5 py-px text-xs font-bold text-muted',
      ),
    ],
    [text],
  )

const searchInputView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const hasHits = Array.isReadonlyArrayNonEmpty(shownHits(model.searchState))
  return h.div(
    [h.Class('flex items-center gap-3 border-b border-rule px-5 py-4')],
    [
      Icon.search('size-4 shrink-0 text-muted', h),
      h.input([
        h.Id(SEARCH_INPUT_ID),
        h.Type('text'),
        h.Role('combobox'),
        h.AriaExpanded(hasHits),
        ...(hasHits ? [h.AriaControls(RESULTS_LIST_ID)] : []),
        h.AriaHasPopup('listbox'),
        h.AriaAutocomplete('list'),
        ...(hasHits && model.activeHitIndex >= 0
          ? [h.AriaActiveDescendant(hitId(model.activeHitIndex))]
          : []),
        h.AriaLabel('Search the docs'),
        h.Placeholder('Search the docs'),
        h.Autocomplete('off'),
        h.Spellcheck(false),
        h.Value(model.query),
        h.OnInput(query => Message.UpdatedSearchQuery({ query })),
        h.OnKeyDownPreventDefault(key => handleInputKeyDown(key, model)),
        h.Class(
          'min-w-0 flex-1 bg-transparent text-base leading-tight text-ink outline-none placeholder:text-muted',
        ),
      ]),
      kbd('esc', h),
    ],
  )
}

const scopeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Role('group'),
      h.AriaLabel('Search in'),
      h.Class('flex flex-wrap gap-2 border-b border-rule px-5 py-3'),
    ],
    Array.map(SCOPES, ([scope, label]) => {
      const isSelected = scope === model.scope
      return h.keyed('button')(
        scope,
        [
          h.Type('button'),
          h.AriaPressed(isSelected ? 'true' : 'false'),
          h.OnClick(Message.SelectedScope({ scope })),
          h.Class(
            `cursor-pointer rounded-full border px-3 py-1 text-xs ${isSelected ? 'border-ink bg-ink font-bold text-paper' : 'border-rule text-muted hover:border-ink hover:text-ink'}`,
          ),
        ],
        [label],
      )
    }),
  )

// RESULTS

const segmentsView = (
  segments: ReadonlyArray<Segment>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> =>
  Array.map(segments, segment =>
    segment.isMatch
      ? h.mark([h.Class('rounded-sm bg-signal-soft text-ink')], [segment.text])
      : segment.text,
  )

const hitView = (
  hit: SearchHit,
  index: number,
  isActive: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    hit.href,
    [h.Role('presentation')],
    [
      h.a(
        [
          h.Id(hitId(index)),
          h.Href(hit.href),
          h.Role('option'),
          h.AriaSelected(isActive),
          h.Tabindex(-1),
          h.DataAttribute('search-hit-index', `${index}`),
          h.OnClick(Message.SelectedHit({ href: hit.href })),
          h.OnMouseMove(Message.PointedAtHit({ index })),
          h.Class(
            `flex flex-col gap-1.5 border-l-2 py-3 pr-5 pl-[18px] ${isActive ? 'border-signal bg-rule/40' : 'border-transparent'}`,
          ),
        ],
        [
          h.span(
            [h.Class('flex items-baseline justify-between gap-3')],
            [
              h.span(
                [h.Class('min-w-0 text-sm leading-snug font-bold break-words')],
                [
                  ...Array.map(hit.crumbs, crumb =>
                    h.span(
                      [h.Class('font-normal text-muted')],
                      [`${crumb} / `],
                    ),
                  ),
                  ...segmentsView(hit.title, h),
                ],
              ),
              String.isEmpty(hit.label)
                ? h.empty
                : h.span(
                    [h.Class('label shrink-0 text-[0.625rem] text-muted')],
                    [hit.label],
                  ),
            ],
          ),
          String.isEmpty(hit.signature)
            ? h.empty
            : h.code(
                [
                  h.Class(
                    'truncate rounded-md bg-code px-2 py-1 text-xs text-code-plain',
                  ),
                ],
                [hit.signature],
              ),
          Array.isReadonlyArrayEmpty(hit.snippet)
            ? h.empty
            : h.span(
                [h.Class('line-clamp-2 text-xs leading-relaxed text-muted')],
                segmentsView(hit.snippet, h),
              ),
        ],
      ),
    ],
  )

const groupView = (
  group: ResultGroup,
  firstIndex: number,
  activeHitIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    group.pageKey,
    [h.Class('border-b border-rule last:border-b-0')],
    [
      h.div(
        [
          h.Id(`search-group-${group.pageKey}`),
          h.Class('label sticky top-0 z-10 bg-paper px-5 pt-4 pb-2 text-muted'),
        ],
        [
          `${group.groupTitle} / `,
          h.span([h.Class('text-ink')], [group.pageTitle]),
        ],
      ),
      h.ul(
        [
          h.Role('group'),
          h.AriaLabelledBy(`search-group-${group.pageKey}`),
          h.Class('flex flex-col pb-2'),
        ],
        Array.map(group.hits, (hit, offset) =>
          hitView(
            hit,
            firstIndex + offset,
            firstIndex + offset === activeHitIndex,
            h,
          ),
        ),
      ),
    ],
  )

const firstIndexes = (
  groups: ReadonlyArray<ResultGroup>,
): ReadonlyArray<number> =>
  Array.scan(groups, 0, (index, group) => index + group.hits.length)

const statusMessage = (text: string, h: HtmlBuilder<Message>): Html =>
  h.p(
    [
      h.AriaLive('polite'),
      h.Class('px-5 py-12 text-center text-sm text-muted'),
    ],
    [text],
  )

const correctionNotice = (
  model: Model,
  outcome: SearchOutcome,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(outcome.maybeCorrectedQuery, {
    onNone: () => h.empty,
    onSome: corrected =>
      h.p(
        [h.Class('px-5 pt-4 text-xs text-muted')],
        [
          `No results for "${model.query.trim()}". Showing results for `,
          h.span([h.Class('font-bold text-ink')], [`"${corrected}"`]),
          '.',
        ],
      ),
  })

const outcomeView = (
  model: Model,
  outcome: SearchOutcome,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(outcome.groups, {
    onEmpty: () => statusMessage(`No results for "${model.query.trim()}".`, h),
    onNonEmpty: groups =>
      h.div(
        [],
        [
          correctionNotice(model, outcome, h),
          h.ul(
            [
              h.Id(RESULTS_LIST_ID),
              h.Role('listbox'),
              h.AriaLabel('Search results'),
            ],
            Array.map(groups, (group, groupIndex) =>
              groupView(
                group,
                firstIndexes(groups)[groupIndex] ?? 0,
                model.activeHitIndex,
                h,
              ),
            ),
          ),
        ],
      ),
  })

const recentSearchesView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Array.match(model.recentSearches, {
    onEmpty: () =>
      statusMessage(
        'Search the guides, the book, the language reference and every declaration in the standard library.',
        h,
      ),
    onNonEmpty: queries =>
      h.div(
        [h.Class('flex flex-col gap-1 px-5 py-4')],
        [
          h.p([h.Class('label pb-1 text-muted')], ['Recent searches']),
          h.ul(
            [h.Class('flex flex-col')],
            Array.map(queries, query =>
              h.keyed('li')(
                query,
                [],
                [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(Message.ClickedRecentSearch({ query })),
                      h.Class(
                        'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-rule/40',
                      ),
                    ],
                    [Icon.search('size-3.5 shrink-0 text-muted', h), query],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
  })

const resultsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain')],
    [
      SearchState.match<Html>(model.searchState, {
        Idle: () => recentSearchesView(model, h),
        Searching: ({ previous }) =>
          Option.match(previous, {
            onNone: () => statusMessage('Searching…', h),
            onSome: outcome => outcomeView(model, outcome, h),
          }),
        Ready: ({ outcome }) => outcomeView(model, outcome, h),
        Unavailable: () =>
          statusMessage(
            'Search could not load. Check your connection and try again.',
            h,
          ),
      }),
    ],
  )

const footerView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.AriaHidden(true),
      h.Class(
        'hidden items-center gap-5 border-t border-rule px-5 py-3 text-xs text-muted sm:flex',
      ),
    ],
    [
      h.span(
        [h.Class('flex items-center gap-1.5')],
        [kbd('↑', h), kbd('↓', h), 'to move'],
      ),
      h.span([h.Class('flex items-center gap-1.5')], [kbd('↵', h), 'to open']),
      h.span(
        [h.Class('flex items-center gap-1.5')],
        [kbd('esc', h), 'to close'],
      ),
    ],
  )

const resultCountAnnouncement = (model: Model): Html => {
  const count = shownHits(model.searchState).length
  return ih.span(
    [ih.AriaLive('polite'), ih.Class('sr-only')],
    count > 0 ? [`${count} results available`] : [],
  )
}

// NOTE: iOS Safari only shows the on-screen keyboard if `.focus()` runs
// synchronously inside the user's tap. The real input does not exist until
// the dialog renders, so the trigger focuses this hidden input during the tap
// and FocusSearchInput moves focus to the real one, which keeps the keyboard up.
const keyboardWarmupInput: Html = ih.input([
  ih.Id(KEYBOARD_WARMUP_INPUT_ID),
  ih.Type('text'),
  ih.AriaHidden(true),
  ih.Tabindex(-1),
  ih.Class('pointer-events-none fixed top-0 left-0 -z-10 size-px opacity-0'),
])

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [],
    [
      keyboardWarmupInput,
      h.submodel({
        slotId: model.dialog.id,
        model: model.dialog,
        view: Dialog.view,
        viewInputs: {
          toView: ({ dialog, backdrop, panel, title, isVisible }) =>
            h.dialog(
              [...dialog],
              isVisible
                ? [
                    h.div([
                      ...backdrop,
                      h.Class('fixed inset-0 z-[59] bg-black/40'),
                    ]),
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          'pointer-events-none fixed inset-0 z-[60] overflow-y-auto px-4 sm:px-6 [&>*]:pointer-events-auto',
                        ),
                      ],
                      [
                        h.div(
                          [
                            h.Class(
                              'mx-auto mt-[8vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-rule bg-paper text-ink shadow-2xl sm:mt-[12vh]',
                            ),
                          ],
                          [
                            h.span(
                              [...title, h.Class('sr-only')],
                              ['Search the docs'],
                            ),
                            searchInputView(model, h),
                            scopeView(model, h),
                            resultsView(model, h),
                            footerView(h),
                            resultCountAnnouncement(model),
                          ],
                        ),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => Message.GotDialogMessage({ message }),
      }),
    ],
  ),
)
