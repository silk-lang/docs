// A Vite plugin that gives the playground its toolchain: the Silk compiler
// built for wasm32-wasip1 and the standard library, both from the playground
// archive a Silk release publishes (`silk-<version>-playground.tar.gz`). The
// examples are the site's own, in demos/playground.
//
// The compiler and the standard library become two gzipped assets with hashed
// names, which the playground worker downloads and unpacks the first time a
// reader runs a program. `virtual:silk-playground` names them and the release.
//
// SILK_PLAYGROUND=<directory> uses an unpacked archive instead of the network.
// Without either, or with SILK_RELEASES=fixture, the playground page says it is
// not available in this build.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { type Plugin } from 'vite'

const INFO_ID = 'virtual:silk-playground'
const RESOLVED_INFO_ID = `\0${INFO_ID}`
const DEV_PREFIX = '/@silk-playground/'

const API_URL =
  'https://api.github.com/repos/silk-lang/silk/releases?per_page=30'

type Toolchain = Readonly<{
  version: string
  compiler: Buffer
  stdlib: Buffer
}>

type Manifest = Readonly<{ version: string }>

// FILES

// The files of a ustar archive by path, following GNU long names and pax
// `path` records.
export const untar = (archive: Buffer): Map<string, Buffer> => {
  const files = new Map<string, Buffer>()
  const text = (from: number, length: number) =>
    archive
      .subarray(from, from + length)
      .toString('utf8')
      .replace(/\0.*$/s, '')
  let at = 0
  let longName: string | undefined
  while (at + 512 <= archive.length && archive[at] !== 0) {
    const name = text(at, 100)
    const size = Number.parseInt(text(at + 124, 12).trim() || '0', 8)
    const type = String.fromCharCode(archive[at + 156] ?? 0)
    const prefix = text(at + 345, 155)
    const body = archive.subarray(at + 512, at + 512 + size)
    if (type === 'L') {
      longName = body.toString('utf8').replace(/\0.*$/s, '')
    } else if (type === 'x') {
      const path = body.toString('utf8').match(/\d+ path=([^\n]*)\n/)?.[1]
      longName = path ?? longName
    } else {
      const path = longName ?? (prefix === '' ? name : `${prefix}/${name}`)
      longName = undefined
      if (type === '0' || type === '\0') {
        files.set(path.replace(/^\.\//, ''), Buffer.from(body))
      }
    }
    at += 512 + Math.ceil(size / 512) * 512
  }
  return files
}

const readDirectory = (root: string): Map<string, Buffer> => {
  const files = new Map<string, Buffer>()
  const walk = (directory: string): void =>
    readdirSync(directory).forEach(name => {
      const path = join(directory, name)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else {
        files.set(relative(root, path), readFileSync(path))
      }
    })
  walk(root)
  return files
}

// The standard library as one gzipped file: for each file, the length of its
// path, the path, the length of its contents, and the contents, every length
// a little-endian u32. `src/playground/pack.ts` reads it back.
const packStandardLibrary = (files: Map<string, Buffer>): Buffer => {
  const parts = [...files]
    .filter(([path]) => path.startsWith('stdlib/'))
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([path, contents]) => {
      const name = Buffer.from(path.slice('stdlib/'.length))
      const header = Buffer.alloc(4)
      header.writeUInt32LE(name.length)
      const size = Buffer.alloc(4)
      size.writeUInt32LE(contents.length)
      return [header, name, size, contents]
    })
  return gzipSync(Buffer.concat(parts), { level: 9 })
}

// The archive keeps everything under one top-level directory, which the
// paths here leave out.
const withoutTop = (files: Map<string, Buffer>): Map<string, Buffer> => {
  const top = [...files.keys()][0]?.split('/')[0] ?? ''
  return new Map(
    [...files].map(([path, contents]) => [
      path.startsWith(`${top}/`) ? path.slice(top.length + 1) : path,
      contents,
    ]),
  )
}

const toToolchain = (inside: Map<string, Buffer>): Toolchain => {
  const manifestFile = inside.get('manifest.json')
  const compiler = inside.get('silkc.wasm')
  if (manifestFile === undefined || compiler === undefined) {
    throw new Error(
      'The playground archive has no manifest.json or silkc.wasm.',
    )
  }
  const manifest: Manifest = JSON.parse(manifestFile.toString('utf8'))
  return {
    version: manifest.version,
    compiler: gzipSync(compiler, { level: 9 }),
    stdlib: packStandardLibrary(inside),
  }
}

type GitHubRelease = Readonly<{
  tag_name: string
  draft: boolean
  assets: ReadonlyArray<
    Readonly<{ name: string; browser_download_url: string }>
  >
}>

// The newest published release that carries a playground archive, if any.
const download = async (): Promise<Map<string, Buffer> | undefined> => {
  const token = process.env['GITHUB_TOKEN']
  const headers = token ? { authorization: `Bearer ${token}` } : {}
  const response = await fetch(API_URL, {
    headers: { accept: 'application/vnd.github+json', ...headers },
  })
  if (!response.ok) {
    throw new Error(
      `Fetching Silk releases for the playground failed with HTTP ${response.status}.`,
    )
  }
  const releases: ReadonlyArray<GitHubRelease> = await response.json()
  const asset = releases
    .filter(release => !release.draft)
    .flatMap(release =>
      release.assets.filter(
        candidate =>
          candidate.name ===
          `silk-${release.tag_name.slice(1)}-playground.tar.gz`,
      ),
    )[0]
  if (asset === undefined) {
    return undefined
  }
  const archive = await fetch(asset.browser_download_url, { headers })
  if (!archive.ok) {
    throw new Error(
      `Downloading ${asset.name} failed with HTTP ${archive.status}.`,
    )
  }
  return withoutTop(untar(gunzipSync(Buffer.from(await archive.arrayBuffer()))))
}

const loadToolchain = async (): Promise<Toolchain | undefined> => {
  const directory = process.env['SILK_PLAYGROUND']
  if (directory !== undefined && directory !== '') {
    return toToolchain(readDirectory(directory))
  }
  if (process.env['SILK_RELEASES'] === 'fixture') {
    return undefined
  }
  const files = await download()
  return files === undefined ? undefined : toToolchain(files)
}

// PLUGIN

export const playground = (): Plugin => {
  let pending: Promise<Toolchain | undefined> | undefined
  const load = () => (pending ??= loadToolchain())
  let isServe = false

  return {
    name: 'silk-playground',
    configResolved: config => {
      isServe = config.command === 'serve'
    },
    resolveId: id => (id === INFO_ID ? RESOLVED_INFO_ID : null),
    load: async function (id) {
      if (id !== RESOLVED_INFO_ID) {
        return null
      }
      const toolchain = await load()
      if (toolchain === undefined) {
        return 'export default null'
      }
      // The server build only renders the page and never fetches the files,
      // so it names them without emitting them a second time.
      const isClient = this.environment.name === 'client'
      if (isServe || !isClient) {
        return `export default ${JSON.stringify({
          version: toolchain.version,
          compilerUrl: `${DEV_PREFIX}silkc.wasm.bin`,
          stdlibUrl: `${DEV_PREFIX}stdlib.bin`,
        })}`
      }
      const compiler = this.emitFile({
        type: 'asset',
        name: 'silkc.wasm.bin',
        source: toolchain.compiler,
      })
      const stdlib = this.emitFile({
        type: 'asset',
        name: 'stdlib.bin',
        source: toolchain.stdlib,
      })
      return [
        'export default {',
        `  version: ${JSON.stringify(toolchain.version)},`,
        `  compilerUrl: import.meta.ROLLUP_FILE_URL_${compiler},`,
        `  stdlibUrl: import.meta.ROLLUP_FILE_URL_${stdlib},`,
        '}',
      ].join('\n')
    },
    configureServer: server => {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''
        if (!url.startsWith(DEV_PREFIX)) {
          next()
          return
        }
        load().then(
          toolchain => {
            const name = url.slice(DEV_PREFIX.length)
            const body =
              name === 'silkc.wasm.bin'
                ? toolchain?.compiler
                : name === 'stdlib.bin'
                  ? toolchain?.stdlib
                  : undefined
            if (body === undefined) {
              response.statusCode = 404
              response.end()
              return
            }
            response.setHeader('content-type', 'application/octet-stream')
            response.end(body)
          },
          (error: unknown) => next(error),
        )
      })
    },
  }
}
