// The language server worker: runs `silkc lsp` from the playground's
// toolchain over a package at `/work`. Standard input is the page's shared
// pipe (`channel.ts`), which this worker blocks on between messages, and
// standard output goes back to the page as it is written.

import { makeReader } from './channel'
import {
  type LanguageRequest,
  type LanguageResponse,
  WORK_MANIFEST,
  WORK_ROOT,
} from './language-protocol'
import { loadToolchain } from './toolchain'
import { Exit, fork, makeWasi, writeFile } from './wasi'

type WorkerScope = Readonly<{
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent) => void,
  ) => void
  postMessage: (message: LanguageResponse) => void
}>

const isRequest = (value: unknown): value is LanguageRequest =>
  typeof value === 'object' &&
  value !== null &&
  'toolchain' in value &&
  'input' in value &&
  'files' in value &&
  Array.isArray(value.files)

const serve = async (
  scope: WorkerScope,
  request: LanguageRequest,
): Promise<number> => {
  const toolchain = await loadToolchain(request.toolchain)
  const root = fork(toolchain.base)
  const encoder = new TextEncoder()
  writeFile(root, `${WORK_ROOT}/silk.toml`, encoder.encode(WORK_MANIFEST))
  request.files.forEach(file =>
    writeFile(root, `${WORK_ROOT}/${file.name}`, encoder.encode(file.source)),
  )
  const decoder = new TextDecoder()
  const wasi = makeWasi({
    args: ['silkc', 'lsp', '--stdlib', '/stdlib'],
    root,
    stdin: makeReader(request.input),
    // The bytes are copied: the view is into the module's memory.
    stdout: bytes => scope.postMessage({ tag: 'Output', bytes: bytes.slice() }),
    stderr: bytes =>
      scope.postMessage({
        tag: 'Log',
        text: decoder.decode(bytes, { stream: true }),
      }),
  })
  const instance = new WebAssembly.Instance(toolchain.compiler, {
    wasi_snapshot_preview1: wasi.imports,
  })
  const { memory, _start } = instance.exports
  if (!(memory instanceof WebAssembly.Memory) || typeof _start !== 'function') {
    throw new Error('The compiler is not a WASI command.')
  }
  wasi.bind(memory)
  try {
    _start()
    return 0
  } catch (error) {
    if (error instanceof Exit) {
      return error.code
    }
    throw error
  }
}

const start = (scope: WorkerScope): void => {
  // One server per worker: the first request starts it, and it runs until
  // the page closes the pipe or sends `exit`.
  const started = { current: false }
  scope.addEventListener('message', event => {
    const request: unknown = event.data
    if (started.current || !isRequest(request)) {
      return
    }
    started.current = true
    serve(scope, request).then(
      code => scope.postMessage({ tag: 'Exited', code }),
      (error: unknown) =>
        scope.postMessage({
          tag: 'Failed',
          message: error instanceof Error ? error.message : String(error),
        }),
    )
  })
}

start(self)
