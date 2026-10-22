// Copies the language reference and the standard library API reference from a
// silk-lang/silk checkout into content/, and writes the sidebar groups for
// them to src/docs/generated.ts.
//
//   pnpm sync-docs ../silk
//
// The source markdown is written for GitHub, so a few constructs are rewritten
// into the vocabulary @foldkit/markdown accepts: frontmatter and the H1 move
// into the catalog, HTML comments are dropped, `<a id>` anchors become Anchor
// islands, and links between reference files become site routes.

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

// GROUPS

// The order of the language reference follows reference/index.md, regrouped
// so the sidebar reads from the language core outward. Files that are not
// listed here still sync, into a trailing group, with a warning.

type GroupSpec = Readonly<{
  key: string
  title: string
  slugs: ReadonlyArray<string>
}>

const referenceGroups: ReadonlyArray<GroupSpec> = [
  {
    key: 'language',
    title: 'Language reference',
    slugs: [
      'overview',
      'lexical-form',
      'values-and-types',
      'expressions-and-operators',
      'statements-and-discarding',
      'functions-callables-and-control-flow',
      'patterns-and-destructuring',
      'modules-names-and-visibility',
      'module-static-selection',
      'generics-interfaces-and-specialization',
      'static-evaluation',
      'ownership-and-borrowing',
      'lifetimes',
      'local-shared-ownership',
      'thread-properties',
      'program-entry',
      'program-termination-and-reporting',
      'testing',
    ],
  },
  {
    key: 'effects',
    title: 'Effects and services',
    slugs: [
      'effects-and-execution',
      'effect-contracts',
      'typed-failures',
      'requirements-and-services',
      'effect-suspension',
      'independent-execution',
      'single-threaded-fibers',
    ],
  },
  {
    key: 'platform',
    title: 'Platform and tooling',
    slugs: [
      'compilation-profiles',
      'selected-source-tooling',
      'artifact-roots-and-requirements',
      'platform-supplies',
      'runtime-and-standard-library',
      'unsafe-intrinsics-and-targets',
      'native-pointer-boundary',
      'atomic-memory-operations',
      'foreign-call-contracts',
      'integer-c-variadics',
      'synchronous-native-callbacks',
      'native-assembly',
      'llvm-helper-capabilities',
      'raw-linux',
      'native-standard-streams',
      'native-clocks',
      'native-entropy',
      'native-filesystem',
    ],
  },
  {
    key: 'library-contracts',
    title: 'Library contracts',
    slugs: [
      'base64',
      'buffered-byte-io',
      'network-address-resolution',
      'native-socket-connections',
      'native-socket-listeners',
      'http-head-parsing',
      'http-body-framing',
      'http-content-decoding',
      'http-server',
      'http-exchange',
      'http-fetch',
      'http-proxy-routing',
      'http-redirects',
      'http-connection-pooling',
      'websocket-upgrade',
      'websocket-server',
      'p256-key-agreement',
      'ecdsa-p256-verification',
    ],
  },
  {
    key: 'style',
    title: 'Style guides',
    slugs: ['style-guide', 'documentation-style-guide'],
  },
]

// SOURCE PAGES

type SourcePage = Readonly<{
  directory: 'reference' | 'std'
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
  ...markdownFiles(join(silkRoot, 'reference')).map(fileName => ({
    directory: 'reference' as const,
    slug: fileName === 'index.md' ? 'overview' : basename(fileName, '.md'),
    sourcePath: `reference/${fileName}`,
  })),
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
  const reference = sourcePath.match(/^reference\/([^/]+)\.md$/)
  if (reference) {
    return reference[1] === 'index'
      ? '/docs/reference/overview'
      : `/docs/reference/${reference[1]}`
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
// only needs the module, its namespace and its summary.
const condenseModuleTable = (line: string): string | undefined => {
  if (!line.startsWith('|')) {
    return line
  }
  const cells = line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map(cell => cell.trim())
  if (cells.length !== 5) {
    return line
  }
  if (/\.profile-\d+\.md/.test(cells[0] ?? '')) {
    return undefined
  }
  return `| ${cells[0]} | ${cells[1]} | ${cells[4]} |`
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

    const rewritten = rewriteLinks(line, page.sourcePath)
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
          /^\| Module \| Import namespace \| Summary \|\n\| [^\n]+/m,
          '| Module | Import namespace | Summary |\n| --- | --- | --- |',
        )
      : markdown,
  }
}

const stdTitle = (title: string): string =>
  title.startsWith('silk/') ? title.slice('silk/'.length) : title

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
      title: page.directory === 'std' ? stdTitle(title) : title,
      markdown,
    }
  })

  for (const directory of ['reference', 'std']) {
    rmSync(join(docsRoot, 'content', directory), {
      recursive: true,
      force: true,
    })
    mkdirSync(join(docsRoot, 'content', directory), { recursive: true })
  }
  for (const page of synced) {
    writeFileSync(
      join(docsRoot, 'content', page.directory, `${page.slug}.md`),
      page.markdown,
    )
  }

  const referencePages = new Map(
    synced
      .filter(page => page.directory === 'reference')
      .map(page => [page.slug, page]),
  )
  const listed = new Set(referenceGroups.flatMap(group => group.slugs))
  const unlisted = [...referencePages.values()].filter(
    page => !listed.has(page.slug),
  )
  for (const page of unlisted) {
    console.warn(
      `warning: ${page.sourcePath} is not in a sidebar group, adding it to "More reference"`,
    )
  }
  for (const slug of listed) {
    if (!referencePages.has(slug)) {
      console.warn(`warning: reference/${slug}.md no longer exists`)
    }
  }

  const presentPages = (
    slugs: ReadonlyArray<string>,
  ): ReadonlyArray<SyncedPage> =>
    slugs.flatMap(slug => {
      const page = referencePages.get(slug)
      return page === undefined ? [] : [page]
    })

  const stdPages = synced.filter(page => page.directory === 'std')
  const stdOverview = stdPages.filter(page => page.slug === 'overview')
  const stdModules = stdPages.filter(page => page.slug !== 'overview')

  const groupEntries = [
    ...referenceGroups.map(group =>
      groupEntry(group.key, group.title, true, presentPages(group.slugs)),
    ),
    ...(unlisted.length > 0
      ? [groupEntry('more-reference', 'More reference', true, unlisted)]
      : []),
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

  console.log(
    `synced ${referencePages.size} reference pages and ${stdPages.length} standard library pages from ${revision}`,
  )
}

main()
