import { Array, Option, Record } from 'effect'

import { type DocGroup, type DocPage, type DocsContext } from '../docs/catalog'
import {
  type ArchivedCatalog,
  archivedPagePath,
  versionPrefix,
} from './archive'

// Documents of archived pages are stored by content hash, under keys that
// cannot clash with a current page key such as book/ownership.
export const ARCHIVE_KEY_PREFIX = 'archive:'

export const archiveDocumentKey = (hash: string): string =>
  `${ARCHIVE_KEY_PREFIX}${hash}`

const contexts = new WeakMap<ArchivedCatalog, DocsContext>()

// The docs context of a downloaded catalog. It is kept per catalog, so the
// views get the same groups and pages on every render.
export const archivedDocs = (catalog: ArchivedCatalog): DocsContext => {
  const known = contexts.get(catalog)
  if (known !== undefined) {
    return known
  }
  const documents: Record<string, string> = {}
  const groups: ReadonlyArray<DocGroup> = Array.map(catalog.groups, group => ({
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
  }))
  const context: DocsContext = {
    groups,
    pages: Array.flatMap(groups, group => group.pages),
    pagePath: page => archivedPagePath(catalog.version, page),
    indexPath: `${versionPrefix(catalog.version)}/docs`,
    documentKey: (page: DocPage) =>
      archiveDocumentKey(
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
