import { Array, Option, Record } from 'effect'

import {
  type DocGroup,
  type DocPage,
  type DocsContext,
  groups as currentGroups,
  pageKey,
  pagePath,
} from '../docs/catalog'
import {
  type ArchivedCatalog,
  VERSIONED_DIRECTORY,
  archivedPagePath,
} from './archive'

// Documents of archived pages are stored by content hash, under keys that
// cannot clash with a current page key such as book/ownership.
export const ARCHIVE_KEY_PREFIX = 'archive:'

export const archiveDocumentKey = (hash: string): string =>
  `${ARCHIVE_KEY_PREFIX}${hash}`

const contexts = new WeakMap<ArchivedCatalog, DocsContext>()

// The docs context of a downloaded catalog: the hand-written groups of the
// current docs, then the release's standard library. It is kept per catalog,
// so the views get the same groups and pages on every render.
export const archivedDocs = (catalog: ArchivedCatalog): DocsContext => {
  const known = contexts.get(catalog)
  if (known !== undefined) {
    return known
  }
  const documents: Record<string, string> = {}
  const archivedGroups: ReadonlyArray<DocGroup> = Array.map(
    catalog.groups,
    group => ({
      key: group.key,
      title: group.title,
      showCount: true,
      pages: Array.map(group.pages, page => {
        documents[`${page.directory}/${page.slug}`] = page.document
        return {
          directory: page.directory,
          slug: page.slug,
          title: page.title,
          maybeSourceUrl: Option.some(page.sourceUrl),
        }
      }),
    }),
  )
  const groups: ReadonlyArray<DocGroup> = [
    ...Array.filter(currentGroups, group => group.key !== VERSIONED_DIRECTORY),
    ...archivedGroups,
  ]
  const isVersioned = (page: Pick<DocPage, 'directory'>) =>
    page.directory === VERSIONED_DIRECTORY
  const context: DocsContext = {
    groups,
    pages: Array.flatMap(groups, group => group.pages),
    pagePath: page =>
      isVersioned(page)
        ? archivedPagePath(catalog.version, page)
        : pagePath(page),
    indexPath: '/docs',
    documentKey: (page: DocPage) =>
      !isVersioned(page)
        ? pageKey(page)
        : archiveDocumentKey(
            Option.getOrElse(
              Record.get(documents, `${page.directory}/${page.slug}`),
              () => '',
            ),
          ),
    maybeVersion: Option.some(catalog.version),
  }
  contexts.set(catalog, context)
  return context
}
