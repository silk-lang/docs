// A Vite plugin that writes the docs for language models, following
// https://llmstxt.org:
//
//   /llms.txt               an index of every page, linking its markdown
//   /llms-full.txt          every page in one file
//   /docs/<section>/<slug>.md  one page as markdown
//
// /llm.txt and /llm-full.txt are copies under the singular names. Everything
// comes from content/ at build time, so it changes with the pages. Links are
// absolute when SILK_DOCS_DOMAIN is set, as it is for deploys, and
// root-relative otherwise.

import { readFileSync } from 'node:fs'
import { type Plugin } from 'vite'

import {
  type DocGroup,
  type DocPage,
  groups,
  pageKey,
  pagePath,
} from '../src/docs/catalog.ts'
import { CONTENT_DIR, contentFiles, markdownFiles } from './content-files.ts'

const SUMMARY =
  'Silk is a systems language where effects, failures, and dependencies compose, and ownership keeps every resource explicit.'

// Generated reference groups go under "Optional", which the format reserves
// for links a reader can skip when context is short.
const OPTIONAL_GROUPS = new Set(['std'])

const DESCRIPTION_LIMIT = 200

type SourcePage = Readonly<{
  page: DocPage
  group: DocGroup
  markdown: string
}>

const baseUrl = (): string => {
  const domain = process.env['SILK_DOCS_DOMAIN'] ?? ''
  return domain === '' ? '' : `https://${domain}`
}

const markdownPath = (page: DocPage): string => `${pagePath(page)}.md`

// Island directives are site markup, so they are dropped. Links to an anchor
// on the same page become links to the page, which keeps them meaningful once
// the pages share one file.
const pageMarkdown = (page: DocPage, source: string): string => {
  const body = source
    .split('\n')
    .filter(line => !/^::\w+\{.*\}\s*$/.test(line))
    .join('\n')
    .replace(/\]\(#/g, `](${baseUrl()}${pagePath(page)}#`)
    .trim()
  return body.startsWith('# ') ? body : `# ${page.title}\n\n${body}`
}

const plainText = (markdown: string): string =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

// The first sentence of the first paragraph, when it is short enough to read
// as a description.
const description = (markdown: string): string | undefined => {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .find(block => block !== '' && !/^(#|\||```|[-*>]|\d+\.|::)/.test(block))
  if (paragraph === undefined) {
    return undefined
  }
  const text = plainText(paragraph)
  const sentence = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text
  return sentence.length <= DESCRIPTION_LIMIT ? sentence : undefined
}

const sourcePages = (): ReadonlyArray<SourcePage> => {
  const files = contentFiles()
  return groups.flatMap(group =>
    group.pages.flatMap(page => {
      const path = files.get(pageKey(page))
      return path === undefined
        ? []
        : [
            {
              page,
              group,
              markdown: pageMarkdown(page, readFileSync(path, 'utf8')),
            },
          ]
    }),
  )
}

const linkLine = ({ page, markdown }: SourcePage): string => {
  const link = `- [${page.title}](${baseUrl()}${markdownPath(page)})`
  const maybeDescription = description(markdown.replace(/^# .*\n/, ''))
  return maybeDescription === undefined ? link : `${link}: ${maybeDescription}`
}

const index = (pages: ReadonlyArray<SourcePage>): string => {
  const section = (title: string, sectionPages: ReadonlyArray<SourcePage>) =>
    sectionPages.length === 0
      ? []
      : [`## ${title}`, '', ...sectionPages.map(linkLine), '']
  const required = groups
    .filter(group => !OPTIONAL_GROUPS.has(group.key))
    .flatMap(group =>
      section(
        group.title,
        pages.filter(page => page.group === group),
      ),
    )
  const optional = section(
    'Optional',
    pages.filter(page => OPTIONAL_GROUPS.has(page.group.key)),
  )
  return [
    '# Silk',
    '',
    `> ${SUMMARY}`,
    '',
    `Each link is the markdown of one page of the Silk documentation. [llms-full.txt](${baseUrl()}/llms-full.txt) has every page in one file. Optional lists the standard library reference, one page per module.`,
    '',
    ...required,
    ...optional,
  ].join('\n')
}

const full = (pages: ReadonlyArray<SourcePage>): string =>
  [
    `# Silk\n\n> ${SUMMARY}\n\nThe full Silk documentation, one page after another. Each page starts with a line naming its URL.`,
    ...pages.map(
      ({ page, markdown }) =>
        `<!-- ${baseUrl()}${pagePath(page)} -->\n\n${markdown}`,
    ),
  ].join('\n\n---\n\n') + '\n'

export const llmsFiles = (): ReadonlyMap<string, string> => {
  const pages = sourcePages()
  const llms = index(pages)
  const llmsFull = full(pages)
  return new Map([
    ['llms.txt', llms],
    ['llms-full.txt', llmsFull],
    ['llm.txt', llms],
    ['llm-full.txt', llmsFull],
    ...pages.map(({ page, markdown }): [string, string] => [
      markdownPath(page).slice(1),
      `${markdown}\n`,
    ]),
  ])
}

export const llmsTxt = (): Plugin => ({
  name: 'silk-llms-txt',
  applyToEnvironment: environment => environment.name === 'client',
  configureServer: server => {
    server.watcher.add(CONTENT_DIR)
    server.middlewares.use((request, response, next) => {
      const path = decodeURIComponent((request.url ?? '').split('?')[0] ?? '')
      if (!/^\/(llms?(-full)?\.txt|docs\/.+\.md)$/.test(path)) {
        return next()
      }
      const text = llmsFiles().get(path.slice(1))
      if (text === undefined) {
        return next()
      }
      response.setHeader(
        'Content-Type',
        path.endsWith('.md')
          ? 'text/markdown; charset=utf-8'
          : 'text/plain; charset=utf-8',
      )
      response.end(text)
    })
  },
  buildStart: function () {
    markdownFiles(CONTENT_DIR).forEach(path => this.addWatchFile(path))
  },
  generateBundle: function () {
    llmsFiles().forEach((source, fileName) =>
      this.emitFile({ type: 'asset', fileName, source }),
    )
  },
})
