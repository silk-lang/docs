// A Vite plugin that fetches the GitHub releases of silk-lang/silk once per
// build, serves them to the site as `virtual:silk-releases`, and writes the
// same data to /releases/index.json for scripts and CI.
//
// GITHUB_TOKEN raises the API rate limit when set. SILK_RELEASES=fixture uses
// src/releases/fixture.ts instead of the network.

import { resolve } from 'node:path'
import { type Plugin } from 'vite'

import { type Download, type Release } from '../src/releases/release.ts'

const API_URL =
  'https://api.github.com/repos/silk-lang/silk/releases?per_page=30'
const VIRTUAL_ID = 'virtual:silk-releases'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const FIXTURE_PATH = resolve(import.meta.dirname, '../src/releases/fixture.ts')

type GitHubAsset = Readonly<{
  name: string
  size: number
  browser_download_url: string
  digest?: string | null
}>

type GitHubRelease = Readonly<{
  tag_name: string
  draft: boolean
  prerelease: boolean
  published_at: string | null
  html_url: string
  assets: ReadonlyArray<GitHubAsset>
}>

// Toolchain archives only. Releases also carry the bare compiler and build
// receipts, which stay on the GitHub release page. Windows ships a ZIP.
const TARGETS: ReadonlyArray<
  Readonly<{ target: string; os: string; arch: string; extension: string }>
> = [
  {
    target: 'aarch64-apple-darwin',
    os: 'macOS',
    arch: 'aarch64',
    extension: 'tar.gz',
  },
  {
    target: 'x86_64-apple-darwin',
    os: 'macOS',
    arch: 'x86_64',
    extension: 'tar.gz',
  },
  {
    target: 'x86_64-unknown-linux-gnu',
    os: 'Linux',
    arch: 'x86_64',
    extension: 'tar.gz',
  },
  {
    target: 'aarch64-unknown-linux-gnu',
    os: 'Linux',
    arch: 'aarch64',
    extension: 'tar.gz',
  },
  {
    target: 'x86_64-pc-windows-msvc',
    os: 'Windows',
    arch: 'x86_64',
    extension: 'zip',
  },
]

const toDownloads = (
  version: string,
  assets: ReadonlyArray<GitHubAsset>,
): ReadonlyArray<Download> =>
  TARGETS.flatMap(({ target, os, arch, extension }) => {
    const fileName = `silk-${version}-${target}.${extension}`
    const archive = assets.find(asset => asset.name === fileName)
    if (archive === undefined) {
      return []
    }
    const signature = assets.find(asset => asset.name === `${fileName}.minisig`)
    return [
      {
        os,
        arch,
        target,
        fileName,
        url: archive.browser_download_url,
        size: archive.size,
        sha256: archive.digest?.startsWith('sha256:')
          ? archive.digest.slice('sha256:'.length)
          : null,
        signatureUrl: signature?.browser_download_url ?? null,
      },
    ]
  })

export const toReleases = (
  github: ReadonlyArray<GitHubRelease>,
): ReadonlyArray<Release> =>
  github.flatMap(release => {
    if (release.draft || release.published_at === null) {
      return []
    }
    const version = release.tag_name.match(/^v(\d.*)$/)?.[1]
    if (version === undefined) {
      return []
    }
    const downloads = toDownloads(version, release.assets)
    return downloads.length === 0
      ? []
      : [
          {
            version,
            tag: release.tag_name,
            isPrerelease: release.prerelease,
            publishedAt: release.published_at,
            notesUrl: release.html_url,
            downloads,
          },
        ]
  })

const fetchReleases = async (): Promise<ReadonlyArray<Release>> => {
  const token = process.env['GITHUB_TOKEN']
  const response = await fetch(API_URL, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error(
      `Fetching Silk releases failed with HTTP ${response.status}. Set GITHUB_TOKEN, or build with SILK_RELEASES=fixture to use sample data.`,
    )
  }
  return toReleases((await response.json()) as ReadonlyArray<GitHubRelease>)
}

export const releases = (): Plugin => {
  const useFixture = process.env['SILK_RELEASES'] === 'fixture'
  let pending: Promise<ReadonlyArray<Release>> | undefined
  const load = () => (pending ??= fetchReleases())

  return {
    name: 'silk-releases',
    resolveId: id =>
      id === VIRTUAL_ID ? (useFixture ? FIXTURE_PATH : RESOLVED_ID) : null,
    load: async id =>
      id === RESOLVED_ID
        ? `export default ${JSON.stringify(await load())}`
        : null,
    generateBundle: async function () {
      if (this.environment.name !== 'client') {
        return
      }
      const data = useFixture
        ? (await import(FIXTURE_PATH)).default
        : await load()
      this.emitFile({
        type: 'asset',
        fileName: 'releases/index.json',
        source: `${JSON.stringify({ releases: data }, null, 2)}\n`,
      })
    },
  }
}
