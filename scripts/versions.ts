// Builds the archived documentation of every Silk release into .versions/,
// which the `versions` Vite plugin (scripts/versions-plugin.ts) copies to
// /v/ in the site and lists for the version picker.
//
//   node scripts/versions.ts [--sync-latest]
//
// Only what is generated is versioned: a release's archive is its standard
// library reference, generated from the release tag in silk-lang/silk. The
// hand-written pages always show the current docs. Pages are stored once by
// content hash, so a page that did not change between releases costs nothing.
//
// --sync-latest also replaces content/std and src/docs/generated.ts with the
// standard library of the newest release, so the deployed site, its landing
// page module list included, always shows the newest release.
//
// .versions/ doubles as a cache: a release whose sources and archive format
// did not change since the last run is kept as it is. The deploy keeps the
// folder between runs with actions/cache.
//
// SILK_GIT_DIR names the silk-lang/silk clone to read (a blobless bare clone
// under .cache/ by default, created or updated here). GITHUB_TOKEN raises
// the API rate limit for the release list.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { encodeDocument } from '@foldkit/markdown'

import {
  type ArchivedCatalog,
  type ArchivedGroup,
  type VersionEntry,
} from '../src/versions/archive.ts'
import { parseContent } from './parse.ts'
import {
  SOURCE_REPOSITORY as SILK_REPOSITORY,
  hasStdlib,
  syncStdlib,
  writeStdlib,
} from './sync-silk-docs.ts'

const docsRoot = resolve(import.meta.dirname, '..')
export const VERSIONS_DIR = join(docsRoot, '.versions')
const DOCUMENTS_DIR = join(VERSIONS_DIR, 'documents')
const STDLIB_PATHS = ['reference/index.md', 'reference/stdlib']
const RELEASES_API = 'https://api.github.com/repos/silk-lang/silk/releases'

// The archive format: a change to how pages are generated or parsed makes
// every cached release stale.
const FORMAT = createHash('sha256')
  .update(
    [
      'scripts/versions.ts',
      'scripts/sync-silk-docs.ts',
      'src/versions/archive.ts',
      'pnpm-lock.yaml',
    ]
      .map(path => readFileSync(join(docsRoot, path), 'utf8'))
      .join('\0'),
  )
  .digest('hex')
  .slice(0, 16)

// RELEASES

type Release = VersionEntry

type GitHubRelease = Readonly<{
  tag_name: string
  draft: boolean
  published_at: string | null
}>

const fetchReleases = async (): Promise<ReadonlyArray<Release>> => {
  const token = process.env['GITHUB_TOKEN']
  const releases: Array<Release> = []
  for (let page = 1; ; page++) {
    const response = await fetch(`${RELEASES_API}?per_page=100&page=${page}`, {
      headers: {
        accept: 'application/vnd.github+json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error(
        `Fetching Silk releases failed with HTTP ${response.status}`,
      )
    }
    const batch = (await response.json()) as ReadonlyArray<GitHubRelease>
    for (const release of batch) {
      // The version drops the build metadata: v0.1.0-dev.54+524349ca083e is
      // 0.1.0-dev.54, which is also how the releases page names it.
      const version = release.tag_name.match(/^v(\d[^+]*)/)?.[1]
      if (!release.draft && release.published_at !== null && version) {
        releases.push({
          version,
          tag: release.tag_name,
          publishedAt: release.published_at,
        })
      }
    }
    if (batch.length < 100) {
      break
    }
  }
  return releases.sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  )
}

// GIT

const git = (gitDir: string, args: ReadonlyArray<string>): string =>
  execFileSync('git', [`--git-dir=${gitDir}`, ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  })

// A bare clone without file contents: the deploy only needs the stdlib
// reference of each tag, whose files are fetched in one batch below.
const silkGitDir = (): string => {
  const configured = process.env['SILK_GIT_DIR']
  if (configured !== undefined && configured !== '') {
    return resolve(configured)
  }
  const gitDir = join(docsRoot, '.cache/silk.git')
  if (existsSync(gitDir)) {
    git(gitDir, [
      'fetch',
      '--quiet',
      '--filter=blob:none',
      '--tags',
      '--force',
      'origin',
    ])
  } else {
    mkdirSync(dirname(gitDir), { recursive: true })
    execFileSync('git', [
      'clone',
      '--quiet',
      '--bare',
      '--filter=blob:none',
      `${SILK_REPOSITORY}.git`,
      gitDir,
    ])
  }
  return gitDir
}

type TreeFile = Readonly<{ path: string; oid: string }>

const treeFiles = (
  gitDir: string,
  revision: string,
  paths: ReadonlyArray<string>,
): ReadonlyArray<TreeFile> =>
  git(gitDir, ['ls-tree', '-r', '-z', revision, '--', ...paths])
    .split('\0')
    .filter(line => line !== '')
    .flatMap(line => {
      const match = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s)
      return match ? [{ oid: match[1]!, path: match[2]! }] : []
    })

const readBlobs = (
  gitDir: string,
  oids: ReadonlyArray<string>,
): ReadonlyMap<string, string> => {
  const unique = [...new Set(oids)]
  if (unique.length === 0) {
    return new Map()
  }
  const output = execFileSync(
    'git',
    [`--git-dir=${gitDir}`, 'cat-file', '--batch'],
    {
      input: `${unique.join('\n')}\n`,
      maxBuffer: 1 << 30,
    },
  )
  const blobs = new Map<string, string>()
  let offset = 0
  while (offset < output.length) {
    const headerEnd = output.indexOf(10, offset)
    const [oid = '', , size = '0'] = output
      .subarray(offset, headerEnd)
      .toString('utf8')
      .split(' ')
    const start = headerEnd + 1
    const end = start + Number(size)
    blobs.set(oid, output.subarray(start, end).toString('utf8'))
    offset = end + 1
  }
  return blobs
}

// Writes a tag's reference/ folder into a temporary directory, the layout
// syncStdlib reads.
const checkoutReference = (gitDir: string, tag: string): string => {
  const files = treeFiles(gitDir, tag, STDLIB_PATHS)
  const root = mkdtempSync(join(tmpdir(), 'silk-stdlib-'))
  const blobs = readBlobs(
    gitDir,
    files.map(file => file.oid),
  )
  for (const file of files) {
    mkdirSync(dirname(join(root, file.path)), { recursive: true })
    writeFileSync(join(root, file.path), blobs.get(file.oid) ?? '')
  }
  return root
}

// DOCUMENTS

const stored = new Map<string, string>()

const storeDocument = (markdown: string): string => {
  const known = stored.get(markdown)
  if (known !== undefined) {
    return known
  }
  const json = JSON.stringify(encodeDocument(parseContent(markdown)))
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 20)
  const path = join(DOCUMENTS_DIR, `${hash}.json`)
  if (!existsSync(path)) {
    writeFileSync(path, json)
  }
  stored.set(markdown, hash)
  return hash
}

// ARCHIVE

const stdlibGroup = (
  gitDir: string,
  release: Release,
): ArchivedGroup | undefined => {
  const root = checkoutReference(gitDir, release.tag)
  if (!hasStdlib(root)) {
    rmSync(root, { recursive: true, force: true })
    return undefined
  }
  try {
    const pages = syncStdlib(root, release.tag, { skipUnparsable: true })
    return {
      key: 'std',
      title: 'Standard library',
      pages: pages.map(page => ({
        directory: page.directory,
        slug: page.slug,
        title: page.title,
        sourceUrl: page.sourceUrl,
        document: storeDocument(page.markdown),
      })),
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const readCatalog = (version: string): ArchivedCatalog | undefined => {
  const path = join(VERSIONS_DIR, version, 'catalog.json')
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ArchivedCatalog
  } catch {
    return undefined
  }
}

// Documents no catalog points at any more, such as after a format change.
const pruneDocuments = (catalogs: ReadonlyArray<ArchivedCatalog>): void => {
  const used = new Set(
    catalogs.flatMap(catalog =>
      catalog.groups.flatMap(group => group.pages.map(page => page.document)),
    ),
  )
  for (const fileName of readdirSync(DOCUMENTS_DIR)) {
    if (!used.has(fileName.replace(/\.json$/, ''))) {
      rmSync(join(DOCUMENTS_DIR, fileName))
    }
  }
}

// MAIN

const main = async (): Promise<void> => {
  const syncLatest = process.argv.includes('--sync-latest')
  const releases = await fetchReleases()
  const gitDir = silkGitDir()
  mkdirSync(DOCUMENTS_DIR, { recursive: true })

  // Missing file contents of every tag at once, so reading them stays local.
  const allFiles = releases.flatMap(release => {
    try {
      return treeFiles(gitDir, release.tag, STDLIB_PATHS)
    } catch {
      return []
    }
  })
  const known = new Set(
    git(gitDir, [
      'cat-file',
      '--batch-all-objects',
      '--batch-check=%(objectname)',
    ]).split('\n'),
  )
  const missing = [...new Set(allFiles.map(file => file.oid))].filter(
    oid => !known.has(oid),
  )
  for (let index = 0; index < missing.length; index += 2000) {
    git(gitDir, [
      '-c',
      'fetch.negotiationAlgorithm=noop',
      'fetch',
      '--quiet',
      '--no-tags',
      '--no-write-fetch-head',
      '--filter=blob:none',
      'origin',
      ...missing.slice(index, index + 2000),
    ])
  }

  const catalogs: Array<ArchivedCatalog> = []
  const archived: Array<VersionEntry> = []
  for (const release of releases) {
    const cached = readCatalog(release.version)
    if (
      cached !== undefined &&
      cached.format === FORMAT &&
      cached.tag === release.tag
    ) {
      catalogs.push(cached)
      archived.push(release)
      continue
    }

    let std: ReturnType<typeof stdlibGroup>
    try {
      std = stdlibGroup(gitDir, release)
    } catch (error) {
      console.warn(`${release.tag}: no standard library: ${String(error)}`)
      continue
    }
    if (std === undefined) {
      console.warn(`${release.tag} has no standard library reference, skipped`)
      continue
    }

    const catalog: ArchivedCatalog = {
      version: release.version,
      tag: release.tag,
      publishedAt: release.publishedAt,
      format: FORMAT,
      groups: [std],
    }
    mkdirSync(join(VERSIONS_DIR, release.version), { recursive: true })
    writeFileSync(
      join(VERSIONS_DIR, release.version, 'catalog.json'),
      JSON.stringify(catalog),
    )
    catalogs.push(catalog)
    archived.push(release)
    console.log(
      `archived ${release.version}: ${catalog.groups.reduce((sum, group) => sum + group.pages.length, 0)} pages`,
    )
  }

  // Versions that are no longer released, such as a deleted release.
  const versions = new Set(archived.map(release => release.version))
  for (const entry of readdirSync(VERSIONS_DIR, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name !== 'documents' &&
      !versions.has(entry.name)
    ) {
      rmSync(join(VERSIONS_DIR, entry.name), { recursive: true, force: true })
    }
  }
  pruneDocuments(catalogs)
  writeFileSync(
    join(VERSIONS_DIR, 'versions.json'),
    `${JSON.stringify(archived, null, 2)}\n`,
  )
  console.log(
    `${archived.length} versions, ${readdirSync(DOCUMENTS_DIR).length} distinct pages in .versions/`,
  )

  const newest = archived[0]
  if (syncLatest && newest !== undefined) {
    const root = checkoutReference(gitDir, newest.tag)
    const pages = syncStdlib(root, newest.tag, { skipUnparsable: true })
    writeStdlib(pages, newest.tag)
    rmSync(root, { recursive: true, force: true })
    console.log(
      `synced ${pages.length} standard library pages from ${newest.tag}`,
    )
  }
}

await main()
