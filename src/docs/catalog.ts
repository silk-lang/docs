import { Array, Option, pipe } from 'effect'

import { generatedGroups } from './generated'

// Every documentation page lives at /docs/<directory>/<slug> and is backed by
// content/<directory>/<slug>.md. Groups only decide where a page appears in
// the sidebar, so a page can move between groups without changing its URL.

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

const startPage = (slug: string, title: string): DocPage => ({
  directory: 'start',
  slug,
  title,
  maybeSourceUrl: Option.none(),
})

export const introduction = startPage('introduction', 'Introduction')

const startGroup: DocGroup = {
  key: 'start',
  title: 'Get started',
  showCount: true,
  pages: [
    introduction,
    startPage('install', 'Install'),
    startPage('quick-start', 'Quick start'),
    startPage('tour', 'A short tour'),
    startPage('tools', 'Tools'),
  ],
}

export const groups: ReadonlyArray<DocGroup> = [startGroup, ...generatedGroups]

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
