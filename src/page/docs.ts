import { Array, HashSet, Option, String, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Catalog from '../docs/catalog'
import * as DocsMarkdown from '../docs/markdown'
import * as Icon from '../icon'
import * as Layout from '../layout'
import { Message } from '../message'
import { DocState, type Model } from '../model'
import { docsRouter } from '../route'

export const SEARCH_INPUT_ID = 'docs-search'

// SIDEBAR

const matchesQuery = (query: string) => (page: Catalog.DocPage) =>
  String.includes(query.trim().toLowerCase())(page.title.toLowerCase())

const sidebarItem = (
  page: Catalog.DocPage,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html => {
  const isCurrent = Option.exists(maybeCurrent, current => current === page)
  return h.keyed('li')(
    Catalog.pageKey(page),
    [],
    [
      h.a(
        [
          h.Href(Catalog.pagePath(page)),
          ...(isCurrent ? [h.AriaCurrent('page')] : []),
          h.Class(
            isCurrent
              ? 'block border-l-2 border-ink py-2 pr-3 pl-[11px] text-sm leading-tight font-bold text-ink'
              : 'block border-l border-rule py-2 pr-3 pl-3 text-sm leading-tight text-muted hover:border-ink hover:text-ink',
          ),
        ],
        [page.title],
      ),
    ],
  )
}

const sidebarGroup = (
  group: Catalog.DocGroup,
  pages: ReadonlyArray<Catalog.DocPage>,
  isOpen: boolean,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    group.key,
    [h.Class(isOpen ? 'pb-3' : '')],
    [
      h.button(
        [
          h.Type('button'),
          h.OnClick(Message.ClickedSidebarGroup({ groupKey: group.key })),
          h.AriaExpanded(isOpen),
          h.AriaControls(`docs-group-${group.key}`),
          h.Class(
            'flex w-full cursor-pointer items-center justify-between py-2.5 text-left text-sm leading-tight font-bold',
          ),
        ],
        [
          group.title,
          h.span(
            [h.Class('flex items-center gap-2 text-xs font-normal text-muted')],
            [
              group.showCount ? `${pages.length}` : '',
              isOpen
                ? Icon.chevronDown('size-3.5 text-ink', h)
                : Icon.chevronRight('size-3.5', h),
            ],
          ),
        ],
      ),
      isOpen
        ? h.ul(
            [h.Id(`docs-group-${group.key}`), h.Class('flex flex-col')],
            Array.map(pages, page => sidebarItem(page, maybeCurrent, h)),
          )
        : h.empty,
    ],
  )

const searchBox = (query: string, h: HtmlBuilder<Message>): Html =>
  h.label(
    [
      h.Class(
        'flex items-center justify-between gap-3 rounded-full border border-rule px-3.5 py-2.5 focus-within:border-ink',
      ),
    ],
    [
      h.input([
        h.Id(SEARCH_INPUT_ID),
        h.Type('search'),
        h.Value(query),
        h.Placeholder('Search docs'),
        h.AriaLabel('Search docs'),
        h.Autocomplete('off'),
        h.Spellcheck(false),
        h.OnInput(value => Message.UpdatedSidebarQuery({ value })),
        h.Class(
          'min-w-0 flex-1 bg-transparent text-sm leading-tight text-ink outline-none placeholder:text-muted',
        ),
      ]),
      h.kbd(
        [
          h.AriaHidden(true),
          h.Class(
            'rounded-md border border-rule px-2 py-px text-xs font-bold text-muted',
          ),
        ],
        ['/'],
      ),
    ],
  )

const sidebar = (
  model: Model,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html => {
  const query = model.sidebarQuery
  const isSearching = String.isNonEmpty(query.trim())
  const visibleGroups = Array.flatMap(Catalog.groups, group => {
    const pages = isSearching
      ? Array.filter(group.pages, matchesQuery(query))
      : group.pages
    return isSearching && Array.isReadonlyArrayEmpty(pages)
      ? []
      : [{ group, pages }]
  })

  return h.nav(
    [
      h.AriaLabel('Documentation'),
      h.Class('flex flex-col gap-5 md:max-h-screen md:py-1'),
    ],
    [
      // Only the page list scrolls, so the search stays put above it.
      searchBox(query, h),
      Array.match(visibleGroups, {
        onEmpty: () =>
          h.p(
            [h.Class('border-t border-rule pt-4 text-sm text-muted')],
            [`No pages match "${query.trim()}".`],
          ),
        onNonEmpty: nonEmptyGroups =>
          h.ul(
            [
              h.Class(
                'flex flex-col border-t border-rule pt-2 md:min-h-0 md:scrollbar-none md:overflow-y-auto md:overscroll-contain',
              ),
            ],
            Array.map(nonEmptyGroups, ({ group, pages }) =>
              sidebarGroup(
                group,
                pages,
                isSearching || HashSet.has(model.openGroups, group.key),
                maybeCurrent,
                h,
              ),
            ),
          ),
      }),
    ],
  )
}

// ON THIS PAGE

const onThisPage = (
  entries: ReadonlyArray<DocsMarkdown.TocEntry>,
  maybeActiveSection: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(entries, {
    onEmpty: () => h.empty,
    onNonEmpty: nonEmptyEntries => {
      const activeId = Option.getOrElse(
        maybeActiveSection,
        () => Array.headNonEmpty(nonEmptyEntries).id,
      )
      return h.nav(
        [h.AriaLabel('On this page'), h.Class('flex flex-col gap-3.5 pt-1')],
        [
          h.p([h.Class('label text-muted')], ['On this page']),
          h.ul(
            [h.Class('flex flex-col gap-3.5')],
            Array.map(nonEmptyEntries, entry => {
              const isActive = entry.id === activeId
              return h.keyed('li')(
                entry.id,
                [],
                [
                  h.a(
                    [
                      h.Href(`#${entry.id}`),
                      h.Class(
                        `flex items-baseline gap-2.5 text-sm leading-tight ${isActive ? 'font-bold text-ink' : 'text-muted hover:text-ink'}`,
                      ),
                    ],
                    [
                      h.span([
                        h.AriaHidden(true),
                        h.Class(
                          `size-2 shrink-0 translate-y-[-1px] rounded-full ${isActive ? 'bg-signal' : 'bg-rule'}`,
                        ),
                      ]),
                      entry.text,
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      )
    },
  })

// ARTICLE

const breadcrumb = (
  maybeGroup: Option.Option<Catalog.DocGroup>,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html =>
  h.nav(
    [h.AriaLabel('Breadcrumb'), h.Class('label text-muted')],
    [
      h.a([h.Href(docsRouter()), h.Class('hover:text-ink')], ['Docs']),
      ' / ',
      ...Option.match(maybeGroup, {
        onNone: () => [],
        onSome: group => [group.title, ' / '],
      }),
      h.span([h.Class('text-ink')], [page.title]),
    ],
  )

const pagerCard = (
  label: string,
  page: Catalog.DocPage,
  direction: 'Previous' | 'Next',
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(Catalog.pagePath(page)),
      h.Rel(direction === 'Previous' ? 'prev' : 'next'),
      h.Class(
        `flex flex-1 flex-col gap-1.5 rounded-2xl border p-5 hover:border-ink ${direction === 'Next' ? 'items-end border-ink text-right' : 'border-rule'}`,
      ),
    ],
    [
      h.span([h.Class('label text-muted')], [label]),
      h.span(
        [h.Class('flex items-center gap-2 font-bold')],
        direction === 'Next'
          ? [page.title, Icon.arrowRight('size-4 shrink-0', h)]
          : [page.title],
      ),
    ],
  )

const pager = (page: Catalog.DocPage, h: HtmlBuilder<Message>): Html => {
  const { maybePrevious, maybeNext } = Catalog.neighbors(page)
  return h.nav(
    [h.AriaLabel('Pages'), h.Class('flex flex-col gap-5 sm:flex-row')],
    [
      Option.match(maybePrevious, {
        onNone: () => h.div([h.Class('hidden flex-1 sm:block')]),
        onSome: previous => pagerCard('Previous', previous, 'Previous', h),
      }),
      Option.match(maybeNext, {
        onNone: () => h.div([h.Class('hidden flex-1 sm:block')]),
        onSome: next => pagerCard('Next', next, 'Next', h),
      }),
    ],
  )
}

const statusMessage = (text: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Role('status'), h.Class('leading-prose text-muted')], [text])

// Stands in for the article while its document downloads. It stays invisible
// for a moment (`docs-skeleton` in styles.css) so a quick load never flashes.
const skeletonLines = (
  widths: ReadonlyArray<string>,
  lineClass: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-3')],
    Array.map(widths, width =>
      h.div([h.Class(`${lineClass} ${width} rounded-full bg-rule`)]),
    ),
  )

const loadingSkeleton = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Role('status'),
      h.AriaBusy(true),
      h.Class('docs-skeleton flex flex-col gap-6'),
    ],
    [
      h.span([h.Class('sr-only')], ['Loading this page.']),
      skeletonLines(['w-full', 'w-11/12', 'w-3/5'], 'h-4.5', h),
      h.div(
        [h.AriaHidden(true), h.Class('flex flex-col gap-5')],
        [
          skeletonLines(['w-full', 'w-full', 'w-4/5'], 'h-3.5', h),
          h.div([h.Class('h-6 w-2/5 rounded-full bg-rule')]),
          skeletonLines(['w-full', 'w-10/12'], 'h-3.5', h),
          h.div([h.Class('h-44 rounded-2xl bg-rule/60')]),
          skeletonLines(['w-full', 'w-full', 'w-2/3'], 'h-3.5', h),
        ],
      ),
    ],
  )

const articleBody = (
  model: Model,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html => {
  const key = Catalog.pageKey(page)
  return DocState.match(model.doc, {
    Idle: () => loadingSkeleton(h),
    Loading: () => loadingSkeleton(h),
    Failed: () =>
      statusMessage(
        'This page could not be loaded. Check your connection and reload.',
        h,
      ),
    Loaded: loaded => {
      if (loaded.key !== key) {
        return loadingSkeleton(h)
      }
      const { maybeLede, body } = DocsMarkdown.splitLede(loaded.document)
      return h.keyed('div')(
        key,
        [h.Class('flex flex-col gap-6')],
        [
          Option.match(maybeLede, {
            onNone: () => h.empty,
            onSome: lede => DocsMarkdown.ledeView(lede, h),
          }),
          h.div(
            [h.Class('min-w-0 *:flex *:flex-col *:gap-5')],
            [DocsMarkdown.view(body, key, model.copiedCodeIds, h)],
          ),
        ],
      )
    },
  })
}

const loadedTableOfContents = (
  model: Model,
  page: Catalog.DocPage,
): ReadonlyArray<DocsMarkdown.TocEntry> =>
  DocState.match(model.doc, {
    Idle: () => [],
    Loading: () => [],
    Failed: () => [],
    Loaded: ({ key, document }) =>
      key === Catalog.pageKey(page)
        ? DocsMarkdown.tableOfContents(document)
        : [],
  })

const docsLayout = (
  model: Model,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  article: Html,
  aside: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex min-h-screen flex-col bg-paper text-ink')],
    [
      Layout.siteNav('Docs', h),
      h.div(
        [
          h.Class(
            'mx-auto grid w-full max-w-[90rem] flex-1 gap-10 px-5 pt-8 pb-20 md:grid-cols-[13.75rem_minmax(0,1fr)] md:px-10 md:pt-12 lg:gap-14 lg:pb-30 xl:grid-cols-[16.25rem_minmax(0,44.25rem)_12.5rem] xl:px-20',
          ),
        ],
        [
          h.details(
            [
              h.Open(true),
              h.Class(
                'group md:sticky md:top-0 md:self-start [&>summary]:md:hidden',
              ),
            ],
            [
              h.summary(
                [
                  h.Class(
                    'label mb-4 flex cursor-pointer list-none items-center justify-between border-b border-rule pb-3 text-muted',
                  ),
                ],
                ['Browse the docs', Icon.chevronDown('size-3.5', h)],
              ),
              sidebar(model, maybeCurrent, h),
            ],
          ),
          h.main([h.Class('min-w-0')], [article]),
          h.aside(
            [
              h.Class(
                'hidden xl:sticky xl:top-0 xl:block xl:max-h-screen xl:self-start xl:scrollbar-none xl:overflow-y-auto xl:overscroll-contain xl:py-1',
              ),
            ],
            [aside],
          ),
        ],
      ),
      Layout.siteFooter(h),
    ],
  )

export const pageView = (
  model: Model,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html =>
  docsLayout(
    model,
    Option.some(page),
    h.article(
      [h.Class('flex flex-col gap-6')],
      [
        breadcrumb(Catalog.findGroup(page), page, h),
        h.h1(
          [
            h.Class(
              'text-3xl leading-tight font-bold tracking-tighter break-words md:text-5xl',
            ),
          ],
          [page.title],
        ),
        articleBody(model, page, h),
        Option.match(page.maybeSourceUrl, {
          onNone: () => h.empty,
          onSome: sourceUrl =>
            h.p(
              [h.Class('pt-4 text-xs text-muted')],
              [
                h.a(
                  [
                    h.Href(sourceUrl),
                    h.Class(
                      'inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-ink',
                    ),
                  ],
                  [
                    'View the source of this page',
                    Icon.arrowUpRight('size-3', h),
                  ],
                ),
              ],
            ),
        }),
        h.div([h.Class('pt-4')], [pager(page, h)]),
      ],
    ),
    onThisPage(loadedTableOfContents(model, page), model.maybeActiveSection, h),
    h,
  )

export const indexView = (model: Model, h: HtmlBuilder<Message>): Html =>
  docsLayout(
    model,
    Option.none(),
    h.article(
      [h.Class('flex flex-col gap-10')],
      [
        h.div(
          [h.Class('flex flex-col gap-6')],
          [
            h.p([h.Class('label text-muted')], ['Docs']),
            h.h1(
              [
                h.Class(
                  'text-3xl leading-tight font-bold tracking-tighter md:text-5xl',
                ),
              ],
              ['Silk documentation'],
            ),
            h.p(
              [h.Class('text-lg leading-prose text-muted')],
              [
                'New to Silk? Install it and take the tour, then read the book. The language reference, the guides and the standard library are here when you need the details.',
              ],
            ),
          ],
        ),
        h.div(
          [h.Class('grid gap-5 sm:grid-cols-2')],
          Array.map(Catalog.groups, group =>
            h.keyed('section')(
              group.key,
              [
                h.Class(
                  'flex flex-col gap-3 rounded-2xl border border-rule p-6',
                ),
              ],
              [
                h.h2(
                  [
                    h.Class(
                      'flex items-baseline justify-between gap-3 font-bold',
                    ),
                  ],
                  [
                    group.title,
                    h.span(
                      [h.Class('text-xs font-normal text-muted')],
                      [`${group.pages.length} pages`],
                    ),
                  ],
                ),
                h.ul(
                  [h.Class('flex flex-col gap-1.5 text-sm')],
                  pipe(
                    group.pages,
                    Array.take(6),
                    Array.map(page =>
                      h.keyed('li')(
                        Catalog.pageKey(page),
                        [],
                        [
                          h.a(
                            [
                              h.Href(Catalog.pagePath(page)),
                              h.Class(
                                'text-muted hover:text-ink hover:underline',
                              ),
                            ],
                            [page.title],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                group.pages.length > 6
                  ? h.p(
                      [h.Class('text-xs text-muted')],
                      [`and ${group.pages.length - 6} more in the sidebar`],
                    )
                  : h.empty,
              ],
            ),
          ),
        ),
      ],
    ),
    h.empty,
    h,
  )
