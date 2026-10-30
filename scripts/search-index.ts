// A Vite plugin that builds the docs search index from content/ and serves it
// as `virtual:silk-search-index`. The site imports that module lazily, so the
// index becomes its own hashed chunk that downloads the first time a reader
// opens search and is cached like every other asset after that.

import { readFileSync } from 'node:fs'
import { type Plugin } from 'vite'

import { parseMarkdown } from '@foldkit/markdown/vite'

import { allPages, groups, pageKey } from '../src/docs/catalog.ts'
import { islandAttributes } from '../src/docs/islands.ts'
import { type SourcePage, buildIndex } from '../src/search/build.ts'
import { CONTENT_DIR, contentFiles, markdownFiles } from './content-files.ts'

const VIRTUAL_ID = 'virtual:silk-search-index'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export const sourcePages = (): ReadonlyArray<SourcePage> => {
  const files = contentFiles()
  return allPages.flatMap(page => {
    const key = pageKey(page)
    const path = files.get(key)
    if (path === undefined) {
      return []
    }
    const group = groups.find(candidate => candidate.pages.includes(page))
    return [
      {
        key,
        title: page.title,
        groupTitle: group?.title ?? '',
        isReference: page.directory === 'std',
        document: parseMarkdown(readFileSync(path, 'utf8'), {
          islands: islandAttributes,
        }),
      },
    ]
  })
}

export const searchIndex = (): Plugin => ({
  name: 'silk-search-index',
  resolveId: id => (id === VIRTUAL_ID ? RESOLVED_ID : null),
  load: function (id) {
    if (id !== RESOLVED_ID) {
      return null
    }
    markdownFiles(CONTENT_DIR).forEach(path => this.addWatchFile(path))
    const json = JSON.stringify(buildIndex(sourcePages()))
    // A JSON string parses faster than the same data as a JavaScript literal.
    return `export default JSON.parse(${JSON.stringify(json)})`
  },
})
