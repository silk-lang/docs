// Copies the standard library API reference from a silk-lang/silk checkout into
// content/std, and writes its sidebar group to src/docs/generated.ts.
//
//   pnpm sync-docs ../silk
//
// The source markdown is written for GitHub, so a few constructs are rewritten
// into the vocabulary @foldkit/markdown accepts: frontmatter and the H1 move
// into the catalog, HTML comments are dropped, `<a id>` anchors become Anchor
// islands, and links between stdlib files become site routes. Links to other
// files in the silk repository point at GitHub.

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, posix, resolve } from 'node:path'

import { parseMarkdown } from '@foldkit/markdown/vite'

import { islandAttributes } from '../src/docs/islands.ts'

const SOURCE_REPOSITORY = 'https://github.com/silk-lang/silk'

const docsRoot = resolve(import.meta.dirname, '..')

// SOURCE PAGES

type SourcePage = Readonly<{
  directory: 'std'
  slug: string
  sourcePath: string
}>

type SyncedPage = SourcePage & Readonly<{ title: string; markdown: string }>

const isProfileVariant = (fileName: string): boolean =>
  /\.profile-\d+\.md$/.test(fileName)

const markdownFiles = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory)
    .filter(fileName => fileName.endsWith('.md'))
    .filter(fileName => !isProfileVariant(fileName))
    .sort()

const sourcePages = (silkRoot: string): ReadonlyArray<SourcePage> => [
  ...markdownFiles(join(silkRoot, 'reference/stdlib')).map(fileName => ({
    directory: 'std' as const,
    slug: fileName === 'index.md' ? 'overview' : basename(fileName, '.md'),
    sourcePath: `reference/stdlib/${fileName}`,
  })),
]

// LINKS

const routeForSourcePath = (sourcePath: string): string | undefined => {
  const stdlib = sourcePath.match(
    /^reference\/stdlib\/([^/]+?)(?:\.profile-\d+)?\.md$/,
  )
  if (stdlib) {
    return stdlib[1] === 'index'
      ? '/docs/std/overview'
      : `/docs/std/${stdlib[1]}`
  }
  return undefined
}

const rewriteUrl = (url: string, fromSourcePath: string): string => {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) {
    return url
  }
  const [path = '', fragment] = url.split('#')
  const target = posix.normalize(
    posix.join(posix.dirname(fromSourcePath), path),
  )
  const hash = fragment === undefined ? '' : `#${fragment}`
  const route = routeForSourcePath(target)
  if (route !== undefined) {
    return `${route}${hash}`
  }
  const kind = path.endsWith('/') || !posix.extname(path) ? 'tree' : 'blob'
  return `${SOURCE_REPOSITORY}/${kind}/main/${target}${hash}`
}

const rewriteLinks = (line: string, fromSourcePath: string): string =>
  line.replace(
    /\]\(([^)\s]+)\)/g,
    (_, url: string) => `](${rewriteUrl(url, fromSourcePath)})`,
  )

// TRANSFORMS

const splitFrontmatter = (
  source: string,
): Readonly<{ maybeTitle: string | undefined; body: string }> => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) {
    return { maybeTitle: undefined, body: source }
  }
  const title = match[1]?.match(/^title:\s*(.+)$/m)?.[1]?.trim()
  return { maybeTitle: title, body: source.slice(match[0].length) }
}

const plainHeadingText = (heading: string): string =>
  heading.replace(/`/g, '').replace(/\\(.)/g, '$1').trim()

// The module table on the stdlib index lists every profile per row. The site
// only needs the module, its category, its namespace and its summary.
const condenseModuleTable = (line: string): string | undefined => {
  if (!line.startsWith('|')) {
    return line
  }
  const cells = line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map(cell => cell.trim())
  if (cells.length !== 6) {
    return line
  }
  if (/\.profile-\d+\.md/.test(cells[0] ?? '')) {
    return undefined
  }
  return `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[5]} |`
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

// GitHub tables write pipes inside code as `<code>&#124;</code>`. A backtick
// span with escaped pipes means the same thing in plain GFM.
const inlineCode = (html: string): string =>
  `\`${decodeEntities(html).replace(/\|/g, '\\|')}\``

const transform = (
  page: SourcePage,
  source: string,
): Readonly<{ title: string; markdown: string }> => {
  const { maybeTitle, body } = splitFrontmatter(source)
  const withoutComments = body.replace(/<!--[\s\S]*?-->\n?/g, '')
  const isStdIndex = page.sourcePath === 'reference/stdlib/index.md'

  let title = maybeTitle
  let fence: string | undefined
  const lines: Array<string> = []

  for (const line of withoutComments.split('\n')) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence !== undefined) {
      lines.push(line)
      if (fenceMatch && fenceMatch[1]?.startsWith(fence)) {
        fence = undefined
      }
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      lines.push(line)
      continue
    }

    const heading = line.match(/^# (.+)$/)
    if (heading) {
      title ??= plainHeadingText(heading[1] ?? '')
      continue
    }

    const anchor = line.match(/^<a id="([^"]+)"><\/a>\s*$/)
    if (anchor) {
      lines.push(`::Anchor{id="${anchor[1]}"}`)
      continue
    }

    const rewritten = qualifyModuleNames(rewriteLinks(line, page.sourcePath))
      .replace(/<code>([^<]*)<\/code>/g, (_, code: string) => inlineCode(code))
      .replace(/^(\s*[-*+]) \[[ xX]\] /, '$1 ')
    const condensed = isStdIndex ? condenseModuleTable(rewritten) : rewritten
    if (condensed !== undefined) {
      lines.push(condensed)
    }
  }

  const markdown = `${lines
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`

  return {
    title: page.slug === 'overview' ? 'Overview' : (title ?? page.slug),
    markdown: isStdIndex
      ? markdown.replace(
          /^\| Module \| Category \| Import namespace \| Summary \|\n\| [^\n]+/m,
          '| Module | Category | Import namespace | Summary |\n| --- | --- | --- | --- |',
        )
      : markdown,
  }
}

// The generator names modules by path (`silk/http_server`); the site uses the
// name code imports, `silk.http_server`.
const moduleName = (path: string): string => path.replace(/\//g, '.')

const stdTitle = (title: string): string =>
  title.startsWith('silk/') ? moduleName(title) : title

const qualifyModuleNames = (line: string): string =>
  line.replace(
    /`(silk\/[a-z0-9_/]+)`/g,
    (_, path: string) => `\`${moduleName(path)}\``,
  )

// OUTPUT

const literal = (value: string): string =>
  `'${value.replace(/['\\]/g, '\\$&')}'`

const pageEntry = (page: SyncedPage): string =>
  `      page(${literal(page.directory)}, ${literal(page.slug)}, ${literal(page.title)}, ${literal(`${SOURCE_REPOSITORY}/blob/main/${page.sourcePath}`)}),`

const groupEntry = (
  key: string,
  title: string,
  showCount: boolean,
  pages: ReadonlyArray<SyncedPage>,
): string =>
  [
    '  {',
    `    key: ${literal(key)},`,
    `    title: ${literal(title)},`,
    `    showCount: ${showCount},`,
    '    pages: [',
    ...pages.map(pageEntry),
    '    ],',
    '  },',
  ].join('\n')

const generatedModule = (
  revision: string,
  groupEntries: ReadonlyArray<string>,
): string => `// Generated by scripts/sync-silk-docs.ts from silk-lang/silk@${revision}. Do not edit by hand.

import { Option } from 'effect'

import { type DocGroup, type DocPage } from './catalog'

const page = (
  directory: string,
  slug: string,
  title: string,
  sourceUrl: string,
): DocPage => ({
  directory,
  slug,
  title,
  maybeSourceUrl: Option.some(sourceUrl),
})

export const generatedGroups: ReadonlyArray<DocGroup> = [
${groupEntries.join('\n')}
]
`

// MAIN

const main = (): void => {
  const silkArgument = process.argv[2]
  if (silkArgument === undefined) {
    console.error('usage: pnpm sync-docs <path to a silk-lang/silk checkout>')
    process.exit(1)
  }
  const silkRoot = resolve(silkArgument)
  if (!existsSync(join(silkRoot, 'reference/index.md'))) {
    console.error(`${silkRoot} has no reference/index.md`)
    process.exit(1)
  }

  const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: silkRoot,
    encoding: 'utf8',
  }).trim()

  const synced: ReadonlyArray<SyncedPage> = sourcePages(silkRoot).map(page => {
    const { title, markdown } = transform(
      page,
      readFileSync(join(silkRoot, page.sourcePath), 'utf8'),
    )
    try {
      parseMarkdown(markdown, { islands: islandAttributes })
    } catch (error) {
      console.error(`${page.sourcePath} does not parse after the transform:`)
      throw error
    }
    return {
      ...page,
      title: stdTitle(title),
      markdown,
    }
  })

  // content/spec held the language specification, which the site no longer
  // shows; removing it keeps an old checkout from carrying it forward.
  for (const directory of ['spec', 'std']) {
    rmSync(join(docsRoot, 'content', directory), {
      recursive: true,
      force: true,
    })
  }
  mkdirSync(join(docsRoot, 'content/std'), { recursive: true })
  for (const page of synced) {
    writeFileSync(
      join(docsRoot, 'content', page.directory, `${page.slug}.md`),
      page.markdown,
    )
  }

  const stdOverview = synced.filter(page => page.slug === 'overview')
  const stdModules = synced.filter(page => page.slug !== 'overview')

  const groupEntries = [
    groupEntry('std', 'Standard library', true, [
      ...stdOverview,
      ...stdModules,
    ]),
  ]

  const generatedPath = join(docsRoot, 'src/docs/generated.ts')
  writeFileSync(generatedPath, generatedModule(revision, groupEntries))
  execFileSync('pnpm', ['exec', 'oxfmt', generatedPath], {
    cwd: docsRoot,
    stdio: 'inherit',
  })

  console.log(`synced ${synced.length} standard library pages from ${revision}`)
}

main()
