// Asks `silk lsp` about every docs code block fenced as ```silk twoslash and
// writes what it said to src/docs/annotations.json, which the site renders as
// error boxes, hover cards and inlay hints. Run it after editing such a block
// or upgrading Silk:
//
//   pnpm annotate          rewrites the file with the installed silk
//   pnpm annotate --check  fails when a block has no entry, or an entry no
//                          block; needs no silk, so CI runs it
//
// Each block is checked as one file of a package; `// ---cut---` hides setup
// lines above it and `//  ^?` pins a hover (src/annotate/markers.ts).

import { Option } from 'effect'
import {
  type ChildProcessWithoutNullStreams,
  execFileSync,
  spawn,
} from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

import { type Block, type MarkdownDocument } from '@foldkit/markdown'

import { type Client, type Json, collect } from '../src/annotate/collect.ts'
import { hash } from '../src/annotate/hash.ts'
import { isTwoslash, parse } from '../src/annotate/markers.ts'
import { type Annotations } from '../src/annotate/model.ts'
import { parseContent } from './parse.ts'

const docsRoot = resolve(import.meta.dirname, '..')
const contentRoot = join(docsRoot, 'content')
const outputPath = join(docsRoot, 'src/docs/annotations.json')

export type AnnotationsFile = Readonly<{
  silkVersion: string
  blocks: Readonly<Record<string, Annotations>>
}>

type TwoslashBlock = Readonly<{ file: string; source: string }>

const markdownFiles = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    return statSync(path).isDirectory()
      ? markdownFiles(path)
      : name.endsWith('.md')
        ? [path]
        : []
  })

const blocksOf = (blocks: ReadonlyArray<Block>): ReadonlyArray<Block> =>
  blocks.flatMap(block => {
    switch (block._tag) {
      case 'List':
        return blocksOf(block.items.flatMap(item => item.blocks))
      case 'Blockquote':
      case 'Island':
        return blocksOf(block.blocks)
      default:
        return [block]
    }
  })

const twoslashBlocks = (
  file: string,
  document: MarkdownDocument,
): ReadonlyArray<TwoslashBlock> =>
  blocksOf(document.blocks).flatMap(block =>
    block._tag === 'CodeBlock' &&
    Option.exists(
      block.maybeLanguage,
      language => language.split(',')[0] === 'silk',
    ) &&
    isTwoslash(block.maybeMeta)
      ? [{ file, source: block.value }]
      : [],
  )

const allTwoslashBlocks = (): ReadonlyArray<TwoslashBlock> =>
  markdownFiles(contentRoot).flatMap(path =>
    twoslashBlocks(
      relative(docsRoot, path),
      parseContent(readFileSync(path, 'utf8')),
    ),
  )

// `silk lsp` over standard input and output, framed as the protocol says.
const startServer = (
  root: string,
): Readonly<{
  client: Client
  initialized: Promise<unknown>
  stop: () => void
}> => {
  const child: ChildProcessWithoutNullStreams = spawn('silk', ['lsp'], {
    cwd: root,
  })
  const listeners: Array<
    (notification: Readonly<{ method: string; params: Json }>) => void
  > = []
  const waiting = new Map<number, (result: unknown) => void>()
  const state = { nextId: 1, buffer: Buffer.alloc(0) }
  const send = (message: object): void => {
    const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }))
    child.stdin.write(
      Buffer.concat([
        Buffer.from(`Content-Length: ${body.length}\r\n\r\n`),
        body,
      ]),
    )
  }
  child.stdout.on('data', (chunk: Buffer) => {
    state.buffer = Buffer.concat([state.buffer, chunk])
    for (;;) {
      const headerEnd = state.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return
      const length = Number(
        /Content-Length: (\d+)/i.exec(
          state.buffer.subarray(0, headerEnd).toString(),
        )?.[1],
      )
      if (state.buffer.length < headerEnd + 4 + length) return
      const message: unknown = JSON.parse(
        state.buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString(),
      )
      state.buffer = state.buffer.subarray(headerEnd + 4 + length)
      if (typeof message !== 'object' || message === null) continue
      if (
        'id' in message &&
        typeof message.id === 'number' &&
        !('method' in message)
      ) {
        waiting.get(message.id)?.('result' in message ? message.result : null)
        waiting.delete(message.id)
      } else if ('method' in message && typeof message.method === 'string') {
        const { method } = message
        const params: Json = 'params' in message ? toJson(message.params) : null
        listeners.forEach(listener => listener({ method, params }))
      }
    }
  })
  const request = (method: string, params: Json): Promise<unknown> =>
    new Promise(resolveResult => {
      const id = state.nextId
      state.nextId += 1
      waiting.set(id, resolveResult)
      send({ id, method, params })
    })
  const initialized = request('initialize', {
    processId: process.pid,
    rootUri: `file://${root}`,
    capabilities: {},
  }).then(result => {
    send({ method: 'initialized', params: {} })
    return result
  })
  return {
    client: {
      request,
      notify: (method, params) => send({ method, params }),
      onNotification: listener => {
        listeners.push(listener)
      },
    },
    initialized,
    stop: () => child.kill(),
  }
}

// Messages arrive as parsed JSON, which is already Json.
const toJson = (value: unknown): Json =>
  value === null ||
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(toJson)
      : typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, toJson(entry)]),
          )
        : null

const installedVersion = (): string => {
  const output = execFileSync('silk', ['--version'], { encoding: 'utf8' })
  const version = /v?(\d+\.\d+\.\d+\S*)/.exec(output)?.[1]
  if (version === undefined) {
    throw new Error(`Cannot read the Silk version from: ${output}`)
  }
  return version
}

const annotateAll = async (): Promise<void> => {
  const blocks = allTwoslashBlocks()
  const silkVersion = installedVersion()
  const root = mkdtempSync(join(tmpdir(), 'silk-annotate-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(
    join(root, 'silk.toml'),
    `[package]\nname = "annotate"\nversion = "0.1.0"\nsilk-version = "${silkVersion}"\n`,
  )
  writeFileSync(join(root, 'src/main.silk'), '')
  const server = startServer(root)
  const uri = `file://${join(root, 'src/main.silk')}`
  const entries: Array<[string, Annotations]> = []
  try {
    await server.initialized
    for (const [index, block] of blocks.entries()) {
      const firstLine = block.source.split('\n')[0] ?? ''
      try {
        const annotations = await collect(
          server.client,
          { uri, version: index + 1 },
          parse(block.source),
          {
            hoverEveryName: true,
            includeWarnings: false,
            timeoutMilliseconds: 20_000,
          },
        )
        entries.push([hash(block.source), annotations])
        console.log(
          `${block.file}: ${annotations.diagnostics.length} errors, ${annotations.hovers.length} hovers, ${annotations.hints.length} hints  (${firstLine})`,
        )
      } catch (error) {
        throw new Error(
          `${block.file}, the block starting "${firstLine}": ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  } finally {
    server.stop()
    rmSync(root, { recursive: true, force: true })
  }
  const file: AnnotationsFile = {
    silkVersion,
    blocks: Object.fromEntries(
      entries.sort(([left], [right]) => left.localeCompare(right)),
    ),
  }
  writeFileSync(outputPath, `${JSON.stringify(file, null, 2)}\n`)
  console.log(
    `Wrote ${entries.length} blocks to ${relative(docsRoot, outputPath)}.`,
  )
}

const check = (): void => {
  const expected = new Map(
    allTwoslashBlocks().map(block => [hash(block.source), block]),
  )
  const file: AnnotationsFile = JSON.parse(readFileSync(outputPath, 'utf8'))
  const present = new Set(Object.keys(file.blocks))
  const missing = [...expected].filter(([key]) => !present.has(key))
  const extra = [...present].filter(key => !expected.has(key))
  missing.forEach(([, block]) =>
    console.error(
      `${block.file}: a twoslash block has no annotations ("${block.source.split('\n')[0]}").`,
    ),
  )
  if (extra.length > 0) {
    console.error(`${extra.length} annotations belong to no block.`)
  }
  if (missing.length > 0 || extra.length > 0) {
    console.error(
      'Run `pnpm annotate` with Silk installed and commit src/docs/annotations.json.',
    )
    process.exit(1)
  }
  console.log(`All ${expected.size} twoslash blocks are annotated.`)
}

if (process.argv.includes('--check')) {
  check()
} else {
  await annotateAll()
}
