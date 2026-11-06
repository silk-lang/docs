import { Array, HashSet, Option, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Catalog from '../docs/catalog'
import * as DocsMarkdown from '../docs/markdown'
import * as Icon from '../icon'
import * as Layout from '../layout'
import { Message } from '../message'
import { DocState, type Model } from '../model'
import { versionsRouter } from '../route'
import * as Search from '../search'
import {
  archivedPagePath,
  versionPrefix,
  versionedUrl,
} from '../versions/archive'
import * as Versions from '../versions/list'

// SIDEBAR

// Module paths such as silk.http.connection_pool_native are wider than the
// sidebar, so a title may break after each dot, and anywhere as a last resort.
const sidebarTitle = (title: string, h: HtmlBuilder<Message>) =>
  title
    .split('.')
    .flatMap((segment, index) =>
      index === 0 ? [segment] : ['.', h.wbr([]), segment],
    )

const isSamePage = (left: Catalog.DocPage, right: Catalog.DocPage): boolean =>
  left.directory === right.directory && left.slug === right.slug

const sidebarItem = (
  context: Catalog.DocsContext,
  page: Catalog.DocPage,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html => {
  const isCurrent = Option.exists(maybeCurrent, current =>
    isSamePage(current, page),
  )
  return h.keyed('li')(
    Catalog.pageKey(page),
    [],
    [
      h.a(
        [
          h.Href(context.pagePath(page)),
          ...(isCurrent ? [h.AriaCurrent('page')] : []),
          h.Class(
            isCurrent
              ? 'block border-l-2 border-signal py-1.5 pr-3 pl-[13px] text-[0.9375rem] leading-snug font-semibold wrap-anywhere text-ink'
              : 'block border-l border-rule py-1.5 pr-3 pl-3.5 text-[0.9375rem] leading-snug wrap-anywhere text-body hover:border-ink hover:text-ink',
          ),
        ],
        sidebarTitle(page.title, h),
      ),
    ],
  )
}

const sidebarGroup = (
  context: Catalog.DocsContext,
  group: Catalog.DocGroup,
  pages: ReadonlyArray<Catalog.DocPage>,
  isOpen: boolean,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    group.key,
    [h.Class(`border-t border-rule first:border-t-0 ${isOpen ? 'pb-4' : ''}`)],
    [
      h.button(
        [
          h.Type('button'),
          h.OnClick(Message.ClickedSidebarGroup({ groupKey: group.key })),
          h.AriaExpanded(isOpen),
          h.AriaControls(`docs-group-${group.key}`),
          h.Class(
            'flex w-full cursor-pointer items-center justify-between py-2.5 text-left text-[0.9375rem] leading-tight font-semibold text-ink',
          ),
        ],
        [
          group.title,
          h.span(
            [
              h.Class(
                'flex items-center gap-2 font-mono text-[0.6875rem] font-normal text-muted',
              ),
            ],
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
            Array.map(pages, page =>
              sidebarItem(context, page, maybeCurrent, h),
            ),
          )
        : h.empty,
    ],
  )

// Opens the search dialog. The click focuses the dialog's warm-up input
// first, so iOS shows the keyboard (see `keyboardWarmupInput` in search/view.ts).
export const searchTrigger = (h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaLabel('Search docs'),
      h.AriaHasPopup('dialog'),
      h.OnClick(Message.ClickedOpenSearch(), {
        focusSelector: `#${Search.KEYBOARD_WARMUP_INPUT_ID}`,
      }),
      h.Class(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-rule bg-paper px-3 py-2.5 text-left text-[0.9375rem] leading-tight text-muted hover:border-ink hover:text-ink',
      ),
    ],
    [
      Icon.search('size-3.5 shrink-0', h),
      h.span([h.Class('flex-1')], ['Search docs']),
      h.kbd(
        [
          h.AriaHidden(true),
          h.Class(
            'rounded border border-rule px-1.5 py-px font-mono text-[0.6875rem] text-muted',
          ),
        ],
        ['/'],
      ),
    ],
  )

// VERSION PICKER

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

// Where a version's copy of the page a reader is on lives: the same page when
// the version has it (an archived page that is missing says so), or the
// version's docs index.
const versionHref = (
  maybeVersion: Option.Option<string>,
  maybeCurrent: Option.Option<Catalog.DocPage>,
): string =>
  Option.match(maybeVersion, {
    onNone: () =>
      pipe(
        maybeCurrent,
        Option.flatMap(page => Catalog.findPage(page.directory, page.slug)),
        Option.match({
          onNone: () => '/docs',
          onSome: page => Catalog.pagePath(page),
        }),
      ),
    onSome: version =>
      Option.match(maybeCurrent, {
        onNone: () => `${versionPrefix(version)}/docs`,
        onSome: page => archivedPagePath(version, page),
      }),
  })

const pickerItem = (
  label: string,
  detail: string,
  href: string,
  isCurrent: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    href,
    [],
    [
      h.a(
        [
          h.Href(href),
          ...(isCurrent ? [h.AriaCurrent('page')] : []),
          h.Class(
            `flex items-baseline justify-between gap-3 rounded px-2.5 py-1.5 text-sm hover:bg-panel ${isCurrent ? 'font-semibold text-ink' : 'text-body'}`,
          ),
        ],
        [
          h.span([h.Class('font-mono')], [label]),
          h.span([h.Class('text-xs text-muted')], [detail]),
        ],
      ),
    ],
  )

// Picks the release the docs describe. The current docs are the newest
// release; every release has an archived copy under /v/. The menu is keyed by
// the page, so it closes when a reader picks a version.
export const versionPicker = (
  context: Catalog.DocsContext,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html => {
  if (!Array.isReadonlyArrayNonEmpty(Versions.versions)) {
    return h.empty
  }
  const isLatest = Option.isNone(context.maybeVersion)
  const currentLabel = Option.getOrElse(
    Option.orElse(context.maybeVersion, () =>
      Option.map(Versions.maybeLatest, latest => latest.version),
    ),
    () => 'Latest',
  )
  const pagePathKey = Option.match(maybeCurrent, {
    onNone: () => context.indexPath,
    onSome: page => context.pagePath(page),
  })
  return h.keyed('details')(
    pagePathKey,
    [h.Class('group/versions relative')],
    [
      h.summary(
        [
          h.AriaLabel(
            `Docs version: ${currentLabel}${isLatest ? ', the latest' : ''}`,
          ),
          h.Class(
            'flex cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-rule bg-paper px-3 py-2 text-sm leading-tight hover:border-ink [&::-webkit-details-marker]:hidden',
          ),
        ],
        [
          h.span(
            [h.Class('flex min-w-0 items-baseline gap-2')],
            [
              h.span(
                [h.Class('label text-[0.625rem] text-muted')],
                [isLatest ? 'Latest' : 'Version'],
              ),
              h.span(
                [h.Class('truncate font-mono text-[0.8125rem] text-ink')],
                [currentLabel],
              ),
            ],
          ),
          Icon.chevronDown(
            'size-3.5 shrink-0 transition-transform group-open/versions:rotate-180',
            h,
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'absolute inset-x-0 top-full z-20 mt-1 flex max-h-80 flex-col overflow-y-auto overscroll-contain rounded-md border border-rule bg-paper p-1.5 shadow-lg',
          ),
        ],
        [
          h.ul(
            [h.Class('flex flex-col')],
            [
              pickerItem(
                'Latest',
                Option.match(Versions.maybeLatest, {
                  onNone: () => '',
                  onSome: latest => latest.version,
                }),
                versionHref(Option.none(), maybeCurrent),
                Option.isNone(context.maybeVersion),
                h,
              ),
              ...Array.map(Versions.versions, entry =>
                pickerItem(
                  entry.version,
                  shortDate(entry.publishedAt),
                  versionHref(Option.some(entry.version), maybeCurrent),
                  Option.contains(context.maybeVersion, entry.version),
                  h,
                ),
              ),
            ],
          ),
          h.a(
            [
              h.Href(versionsRouter()),
              h.Class(
                'mt-1 border-t border-rule px-2.5 pt-2 pb-1 text-xs text-muted hover:text-ink',
              ),
            ],
            ['All versions'],
          ),
        ],
      ),
    ],
  )
}

// Says which release an archived page describes, with the way back to the
// current docs.
const archiveBanner = (
  context: Catalog.DocsContext,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(context.maybeVersion, {
    onNone: () => h.empty,
    onSome: version =>
      h.p(
        [
          h.Role('note'),
          h.Class(
            'rounded-md border border-rule bg-panel px-4 py-3 text-sm leading-snug text-body',
          ),
        ],
        [
          'You are reading the docs for Silk ',
          h.span([h.Class('font-mono text-ink')], [version]),
          Option.match(Versions.findVersion(version), {
            onNone: () => '',
            onSome: entry => `, released ${shortDate(entry.publishedAt)}`,
          }),
          '. ',
          h.a(
            [
              h.Href(versionHref(Option.none(), maybeCurrent)),
              h.Class(
                'font-semibold text-ink underline decoration-signal underline-offset-4 hover:text-signal',
              ),
            ],
            ['Read the latest docs'],
          ),
        ],
      ),
  })

const sidebar = (
  model: Model,
  context: Catalog.DocsContext,
  maybeCurrent: Option.Option<Catalog.DocPage>,
  h: HtmlBuilder<Message>,
): Html =>
  h.nav(
    [
      h.AriaLabel('Documentation'),
      h.Class('flex flex-col gap-4 md:max-h-screen md:py-8'),
    ],
    [
      versionPicker(context, maybeCurrent, h),
      // Only the page list scrolls, so the search stays put above it. Search
      // covers the current docs.
      searchTrigger(h),
      h.ul(
        [
          h.Class(
            'flex flex-col md:min-h-0 md:scrollbar-none md:overflow-y-auto md:overscroll-contain',
          ),
        ],
        Array.map(context.groups, group =>
          sidebarGroup(
            context,
            group,
            group.pages,
            HashSet.has(model.openGroups, group.key),
            maybeCurrent,
            h,
          ),
        ),
      ),
    ],
  )

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
        [h.AriaLabel('On this page'), h.Class('flex flex-col gap-4 pt-2')],
        [
          h.p([h.Class('label text-muted')], ['On this page']),
          h.ul(
            [h.Class('flex flex-col border-l border-rule')],
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
                        `-ml-px block border-l-2 py-1.5 pl-3.5 text-sm leading-snug ${isActive ? 'border-signal font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'}`,
                      ),
                    ],
                    [entry.text],
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
  context: Catalog.DocsContext,
  maybeGroup: Option.Option<Catalog.DocGroup>,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html =>
  h.nav(
    [h.AriaLabel('Breadcrumb'), h.Class('label text-muted')],
    [
      h.a([h.Href(context.indexPath), h.Class('hover:text-ink')], ['Docs']),
      ...Option.match(context.maybeVersion, {
        onNone: () => [],
        onSome: version => [' ', h.span([h.Class('font-mono')], [version])],
      }),
      ' / ',
      ...Option.match(maybeGroup, {
        onNone: () => [],
        onSome: group => [group.title, ' / '],
      }),
      h.span([h.Class('text-ink')], [page.title]),
    ],
  )

const pagerCard = (
  context: Catalog.DocsContext,
  label: string,
  page: Catalog.DocPage,
  direction: 'Previous' | 'Next',
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(context.pagePath(page)),
      h.Rel(direction === 'Previous' ? 'prev' : 'next'),
      h.Class(
        `flex flex-1 flex-col gap-1.5 rounded-md border px-5 py-4.5 hover:border-ink ${direction === 'Next' ? 'items-end border-ink text-right' : 'border-rule'}`,
      ),
    ],
    [
      h.span([h.Class('label text-muted')], [label]),
      h.span(
        [h.Class('flex items-center gap-2 text-xl font-bold tracking-tight')],
        direction === 'Next'
          ? [page.title, Icon.arrowRight('size-4 shrink-0', h)]
          : [page.title],
      ),
    ],
  )

const pager = (
  context: Catalog.DocsContext,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html => {
  const { maybePrevious, maybeNext } = Catalog.neighborsIn(context, page)
  return h.nav(
    [h.AriaLabel('Pages'), h.Class('flex flex-col gap-5 sm:flex-row')],
    [
      Option.match(maybePrevious, {
        onNone: () => h.div([h.Class('hidden flex-1 sm:block')]),
        onSome: previous =>
          pagerCard(context, 'Previous', previous, 'Previous', h),
      }),
      Option.match(maybeNext, {
        onNone: () => h.div([h.Class('hidden flex-1 sm:block')]),
        onSome: next => pagerCard(context, 'Next', next, 'Next', h),
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
          h.div([h.Class('h-44 rounded-md bg-rule/60')]),
          skeletonLines(['w-full', 'w-full', 'w-2/3'], 'h-3.5', h),
        ],
      ),
    ],
  )

const articleBody = (
  model: Model,
  context: Catalog.DocsContext,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html => {
  const key = context.documentKey(page)
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
            [
              DocsMarkdown.view(
                body,
                key,
                model.copiedCodeIds,
                h,
                Option.match(context.maybeVersion, {
                  onNone: () => (url: string) => url,
                  onSome: version => (url: string) =>
                    versionedUrl(version, url),
                }),
              ),
            ],
          ),
        ],
      )
    },
  })
}

const loadedTableOfContents = (
  model: Model,
  context: Catalog.DocsContext,
  page: Catalog.DocPage,
): ReadonlyArray<DocsMarkdown.TocEntry> =>
  DocState.match(model.doc, {
    Idle: () => [],
    Loading: () => [],
    Failed: () => [],
    Loaded: ({ key, document }) =>
      key === context.documentKey(page)
        ? DocsMarkdown.tableOfContents(document)
        : [],
  })

const docsLayout = (
  model: Model,
  context: Catalog.DocsContext,
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
            'grid w-full flex-1 md:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]',
          ),
        ],
        [
          // On phones the sidebar folds behind a toggle the model owns, so
          // following a link closes it. From md up it is always shown.
          h.div(
            [
              h.Class(
                'border-b border-rule bg-panel px-5 md:border-r md:border-b-0 md:px-6',
              ),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.AriaExpanded(model.isDocsNavOpen),
                  h.AriaControls('docs-nav'),
                  h.OnClick(Message.ClickedDocsNavToggle()),
                  h.Class(
                    'flex w-full cursor-pointer items-center justify-between py-3.5 text-[0.9375rem] font-semibold md:hidden',
                  ),
                ],
                [
                  h.span(
                    [h.Class('flex items-center gap-2.5')],
                    [Icon.menu('size-4', h), 'Browse the docs'],
                  ),
                  Icon.chevronDown(
                    `size-3.5 transition-transform ${model.isDocsNavOpen ? 'rotate-180' : ''}`,
                    h,
                  ),
                ],
              ),
              h.div(
                [
                  h.Id('docs-nav'),
                  h.Class(
                    `${model.isDocsNavOpen ? 'block' : 'hidden'} pb-5 md:sticky md:top-0 md:block md:self-start md:pb-0`,
                  ),
                ],
                [sidebar(model, context, maybeCurrent, h)],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex min-w-0 justify-center gap-16 px-5 pt-8 pb-20 md:px-10 md:pt-14 lg:pb-28 xl:px-16',
              ),
            ],
            [
              h.main([h.Class('w-full min-w-0 max-w-[45rem]')], [article]),
              h.aside(
                [
                  h.Class(
                    'hidden w-56 shrink-0 xl:sticky xl:top-0 xl:block xl:max-h-screen xl:self-start xl:scrollbar-none xl:overflow-y-auto xl:overscroll-contain xl:py-2',
                  ),
                ],
                [aside],
              ),
            ],
          ),
        ],
      ),
      Layout.siteFooter(h),
    ],
  )

export const pageView = (
  model: Model,
  context: Catalog.DocsContext,
  page: Catalog.DocPage,
  h: HtmlBuilder<Message>,
): Html =>
  docsLayout(
    model,
    context,
    Option.some(page),
    h.article(
      [h.Class('flex flex-col gap-6')],
      [
        archiveBanner(context, Option.some(page), h),
        breadcrumb(context, Catalog.findGroupIn(context, page), page, h),
        h.h1(
          [
            h.Class(
              'text-[2.75rem] leading-none font-extrabold tracking-tighter break-words md:text-[4rem]',
            ),
          ],
          [page.title, h.span([h.Class('text-signal')], ['.'])],
        ),
        articleBody(model, context, page, h),
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
        h.div([h.Class('pt-4')], [pager(context, page, h)]),
      ],
    ),
    onThisPage(
      loadedTableOfContents(model, context, page),
      model.maybeActiveSection,
      h,
    ),
    h,
  )

export const indexView = (
  model: Model,
  context: Catalog.DocsContext,
  h: HtmlBuilder<Message>,
): Html =>
  docsLayout(
    model,
    context,
    Option.none(),
    h.article(
      [h.Class('flex flex-col gap-10')],
      [
        archiveBanner(context, Option.none(), h),
        h.div(
          [h.Class('flex flex-col gap-6')],
          [
            h.p([h.Class('label text-muted')], ['Docs']),
            h.h1(
              [
                h.Class(
                  'text-[2.75rem] leading-none font-extrabold tracking-tighter md:text-[4rem]',
                ),
              ],
              ['Silk documentation', h.span([h.Class('text-signal')], ['.'])],
            ),
            h.p(
              [h.Class('text-lg leading-[1.65] text-body md:text-xl')],
              [
                'New to Silk? Install it and take the tour, then read the book. The language reference, the guides and the standard library are here when you need the details.',
              ],
            ),
          ],
        ),
        h.div(
          [h.Class('grid gap-5 sm:grid-cols-2')],
          Array.map(context.groups, group =>
            h.keyed('section')(
              group.key,
              [h.Class('flex flex-col gap-3 border-t-2 border-ink pt-5')],
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
                              h.Href(context.pagePath(page)),
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

// ARCHIVED VERSIONS

const archiveStatusView = (
  model: Model,
  context: Catalog.DocsContext,
  title: string,
  body: Html,
  h: HtmlBuilder<Message>,
): Html =>
  docsLayout(
    model,
    context,
    Option.none(),
    h.article(
      [h.Class('flex flex-col gap-6')],
      [
        archiveBanner(context, Option.none(), h),
        h.h1(
          [
            h.Class(
              'text-[2.75rem] leading-none font-extrabold tracking-tighter md:text-[4rem]',
            ),
          ],
          [title, h.span([h.Class('text-signal')], ['.'])],
        ),
        body,
      ],
    ),
    h.empty,
    h,
  )

// While a version's catalog downloads, the sidebar shows the current docs
// under that version's name, and the article its skeleton.
const pendingContext = (version: string): Catalog.DocsContext => ({
  ...Catalog.currentDocs,
  groups: [],
  pages: [],
  indexPath: `${versionPrefix(version)}/docs`,
  pagePath: page => archivedPagePath(version, page),
  maybeVersion: Option.some(version),
})

export const archiveLoadingView = (
  model: Model,
  version: string,
  h: HtmlBuilder<Message>,
): Html =>
  docsLayout(
    model,
    pendingContext(version),
    Option.none(),
    h.article([h.Class('flex flex-col gap-6')], [loadingSkeleton(h)]),
    h.empty,
    h,
  )

export const archiveMissingView = (
  model: Model,
  version: string,
  h: HtmlBuilder<Message>,
): Html =>
  archiveStatusView(
    model,
    pendingContext(version),
    'Version not found',
    statusMessage(
      `There are no archived docs for ${version}. Pick a version from the list, or check your connection and reload.`,
      h,
    ),
    h,
  )

export const missingPageView = (
  model: Model,
  context: Catalog.DocsContext,
  h: HtmlBuilder<Message>,
): Html =>
  archiveStatusView(
    model,
    context,
    'Not in this version',
    statusMessage(
      'This page is not part of the docs for this release. Browse the sidebar for what it had.',
      h,
    ),
    h,
  )
