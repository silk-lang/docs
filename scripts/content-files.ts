// The markdown files under content/, keyed by the page they back. The keys are
// the ones src/docs/content.ts derives: content/book/04-ownership.md is the
// page book/ownership.

import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export const CONTENT_DIR = resolve(import.meta.dirname, '../content')

export const markdownFiles = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? markdownFiles(join(directory, entry.name))
      : entry.name.endsWith('.md')
        ? [join(directory, entry.name)]
        : [],
  )

const keyForFile = (path: string): string =>
  relative(CONTENT_DIR, path)
    .replace(/\/\d+-/, '/')
    .replace(/\.md$/, '')

export const contentFiles = (): ReadonlyMap<string, string> =>
  new Map(markdownFiles(CONTENT_DIR).map(path => [keyForFile(path), path]))
