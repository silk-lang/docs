import { Array, Option, pipe } from 'effect'

import { generatedGroups } from './generated'
import { writtenGroups } from './written'

// Every documentation page lives at /docs/<directory>/<slug> and is backed by
// content/<directory>/<slug>.md, or content/<directory>/<NN>-<slug>.md for the
// hand-written sections, whose file names carry their sidebar position. Groups
// only decide where a page appears in the sidebar, so a page can move between
// groups without changing its URL.

export type DocPage = Readonly<{
  directory: string
  slug: string
  title: string
  maybeSourceUrl: Option.Option<string>
}>

export type DocGroup = Readonly<{
  key: string
  title: string
  showCount: boolean
  pages: ReadonlyArray<DocPage>
}>

export const groups: ReadonlyArray<DocGroup> = [
  ...writtenGroups,
  ...generatedGroups,
]

export const allPages: ReadonlyArray<DocPage> = Array.flatMap(
  groups,
  group => group.pages,
)

export const pageKey = (page: Pick<DocPage, 'directory' | 'slug'>): string =>
  `${page.directory}/${page.slug}`

export const pagePath = (page: Pick<DocPage, 'directory' | 'slug'>): string =>
  `/docs/${pageKey(page)}`

export const findPage = (
  directory: string,
  slug: string,
): Option.Option<DocPage> =>
  Array.findFirst(
    allPages,
    page => page.directory === directory && page.slug === slug,
  )

export const findGroup = (page: DocPage): Option.Option<DocGroup> =>
  Array.findFirst(groups, group =>
    Array.some(group.pages, candidate => candidate === page),
  )

export type Neighbors = Readonly<{
  maybePrevious: Option.Option<DocPage>
  maybeNext: Option.Option<DocPage>
}>

export const neighbors = (page: DocPage): Neighbors =>
  pipe(
    Array.findFirstIndex(allPages, candidate => candidate === page),
    Option.match({
      onNone: () => ({
        maybePrevious: Option.none(),
        maybeNext: Option.none(),
      }),
      onSome: index => ({
        maybePrevious: Array.get(allPages, index - 1),
        maybeNext: Array.get(allPages, index + 1),
      }),
    }),
  )

// A set of docs the docs pages show: the current docs, or the archive of one
// release (src/versions/context.ts). The page and sidebar views read pages,
// groups and paths through it.
export type DocsContext = Readonly<{
  groups: ReadonlyArray<DocGroup>
  pages: ReadonlyArray<DocPage>
  pagePath: (page: Pick<DocPage, 'directory' | 'slug'>) => string
  indexPath: string
  // The key the page's document is stored and downloaded under.
  documentKey: (page: DocPage) => string
  // None for the current docs.
  maybeVersion: Option.Option<string>
}>

export const currentDocs: DocsContext = {
  groups,
  pages: allPages,
  pagePath,
  indexPath: '/docs',
  documentKey: pageKey,
  maybeVersion: Option.none(),
}

const isSamePage = (left: DocPage, right: DocPage): boolean =>
  left.directory === right.directory && left.slug === right.slug

export const findPageIn = (
  context: DocsContext,
  directory: string,
  slug: string,
): Option.Option<DocPage> =>
  Array.findFirst(
    context.pages,
    page => page.directory === directory && page.slug === slug,
  )

export const findGroupIn = (
  context: DocsContext,
  page: DocPage,
): Option.Option<DocGroup> =>
  Array.findFirst(context.groups, group =>
    Array.some(group.pages, candidate => isSamePage(candidate, page)),
  )

export const neighborsIn = (context: DocsContext, page: DocPage): Neighbors =>
  pipe(
    Array.findFirstIndex(context.pages, candidate =>
      isSamePage(candidate, page),
    ),
    Option.match({
      onNone: () => ({
        maybePrevious: Option.none(),
        maybeNext: Option.none(),
      }),
      onSome: index => ({
        maybePrevious: Array.get(context.pages, index - 1),
        maybeNext: Array.get(context.pages, index + 1),
      }),
    }),
  )
