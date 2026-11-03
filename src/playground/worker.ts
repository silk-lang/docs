// The playground worker: compiles a program with the Silk compiler, itself a
// wasm32-wasip1 module, and runs what it builds. Everything happens here, off
// the page's thread, and nothing goes to a server.

import { WORK_FILE, WORK_MANIFEST, WORK_ROOT } from './language-protocol'
import {
  type Chunk,
  type Outcome,
  type RunRequest,
  type RunResponse,
  type Stream,
  type Target,
} from './protocol'
import { type Loaded, loadToolchain } from './toolchain'
import {
  type DirectoryNode,
  Exit,
  directory,
  fork,
  makeWasi,
  readFile,
  writeFile,
} from './wasi'

// A program can print without end, so the page gets at most this much.
const OUTPUT_LIMIT = 256 * 1024

// Terminal control sequences, such as colors.
const ANSI_ESCAPE = /\u001b\[[0-9;?]*[A-Za-z]/g

// Collects output in order, joining neighboring pieces of the same stream and
// stopping at OUTPUT_LIMIT.
const makeOutput = () => {
  const chunks: Array<Chunk> = []
  const decoders = new Map<Stream, TextDecoder>()
  let size = 0
  let isTruncated = false
  const add = (stream: Stream, raw: string): void => {
    // The page shows plain text, so terminal colors are dropped.
    const text = raw.replace(ANSI_ESCAPE, '')
    if (isTruncated || text === '') {
      return
    }
    const room = OUTPUT_LIMIT - size
    const kept = text.length > room ? text.slice(0, room) : text
    size += kept.length
    const last = chunks.at(-1)
    if (last !== undefined && last.stream === stream) {
      chunks[chunks.length - 1] = { stream, text: last.text + kept }
    } else {
      chunks.push({ stream, text: kept })
    }
    if (kept.length < text.length) {
      isTruncated = true
      chunks.push({
        stream: 'stderr',
        text: '\n[The playground stopped showing output here.]\n',
      })
    }
  }
  return {
    chunks,
    write: (stream: Stream) => (bytes: Uint8Array) => {
      const decoder = decoders.get(stream) ?? new TextDecoder()
      decoders.set(stream, decoder)
      add(stream, decoder.decode(bytes, { stream: true }))
    },
    add,
  }
}

type Output = ReturnType<typeof makeOutput>

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

// Runs a WASI command to its end and answers its exit status.
const runCommand = (
  module: WebAssembly.Module,
  args: ReadonlyArray<string>,
  root: DirectoryNode,
  stdout: (bytes: Uint8Array) => void,
  stderr: (bytes: Uint8Array) => void,
): number => {
  const wasi = makeWasi({ args, root, stdout, stderr })
  const instance = new WebAssembly.Instance(module, {
    wasi_snapshot_preview1: wasi.imports,
  })
  const { memory, _start } = instance.exports
  if (!(memory instanceof WebAssembly.Memory) || typeof _start !== 'function') {
    throw new Error('The module is not a WASI command.')
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

const MESSAGE_LIMIT = 2000

const LOG_PREFIXES = ['trace', 'debug', 'info', 'warning', 'error']

// Runs a wasm32-unknown-unknown program: `main` returns its status, its logger
// writes through `silk.console`, and a failure leaves a report in its memory.
const runBare = (module: WebAssembly.Module, output: Output): number => {
  const decoder = new TextDecoder()
  const parts: Array<string> = []
  const memoryRef: { current: WebAssembly.Memory | undefined } = {
    current: undefined,
  }
  const log = (
    level: number,
    address: number,
    length: number,
    more: number,
  ) => {
    const memory = memoryRef.current
    if (memory === undefined) {
      return
    }
    parts.push(
      decoder.decode(
        new Uint8Array(memory.buffer, address >>> 0, length >>> 0).slice(),
      ),
    )
    if (more !== 0) {
      return
    }
    const whole = parts.splice(0).join('')
    // A message can carry data, such as a song as base64, which reads as
    // noise, so long ones are cut.
    const text =
      whole.length > MESSAGE_LIMIT
        ? `${whole.slice(0, MESSAGE_LIMIT)} [${whole.length - MESSAGE_LIMIT} more characters]`
        : whole
    const prefix = LOG_PREFIXES[level] ?? 'info'
    // Each message is one entry of the log, so it ends its line.
    const line = text.endsWith('\n') ? text : `${text}\n`
    output.add(
      level >= 3 ? 'stderr' : 'stdout',
      prefix === 'info' ? line : `[${prefix}] ${line}`,
    )
  }
  const instance = new WebAssembly.Instance(module, {
    env: {},
    wasi: { 'thread-spawn': () => -1 },
    silk: { 'thread-parallelism': () => 1, console: log },
  })
  const { memory, main, silk_report, silk_report_length } = instance.exports
  if (!(memory instanceof WebAssembly.Memory) || typeof main !== 'function') {
    throw new Error('The module exports no memory or main.')
  }
  memoryRef.current = memory
  const report = () => {
    if (
      typeof silk_report !== 'function' ||
      typeof silk_report_length !== 'function'
    ) {
      return
    }
    const length = Number(silk_report_length()) >>> 0
    if (length > 0) {
      const address = Number(silk_report()) >>> 0
      output.add(
        'stderr',
        decoder.decode(new Uint8Array(memory.buffer, address, length).slice()),
      )
    }
  }
  try {
    const status = Number(main())
    report()
    return status
  } catch (error) {
    report()
    throw error
  }
}

const elapsed = (start: number) => Math.round(performance.now() - start)

const run = async (
  loaded: Promise<Loaded>,
  request: RunRequest,
): Promise<RunResponse> => {
  const output = makeOutput()
  const timings = { compile: 0, run: 0 }
  const finish = (outcome: Outcome): RunResponse => ({
    id: request.id,
    output: output.chunks,
    outcome,
    compileMilliseconds: timings.compile,
    runMilliseconds: timings.run,
  })
  const toolchain = await loaded.then(
    value => value,
    (error: unknown) => message(error),
  )
  if (typeof toolchain === 'string') {
    return finish({ tag: 'ToolchainFailed', message: toolchain })
  }
  const root = fork(toolchain.base)
  const encoder = new TextEncoder()
  request.files.forEach(file =>
    writeFile(root, `${WORK_ROOT}/${file.name}`, encoder.encode(file.source)),
  )
  writeFile(root, `${WORK_ROOT}/silk.toml`, encoder.encode(WORK_MANIFEST))
  const compileStart = performance.now()
  const status = (() => {
    try {
      return runCommand(
        toolchain.compiler,
        [
          'silkc',
          'build',
          WORK_FILE,
          '-o',
          '/work/main.wasm',
          '--target',
          request.target,
          '--backend',
          'direct',
          '--stdlib',
          '/stdlib',
        ],
        root,
        output.write('compiler'),
        output.write('compiler'),
      )
    } catch (error) {
      output.add('compiler', `The compiler stopped: ${message(error)}\n`)
      return -1
    }
  })()
  timings.compile = elapsed(compileStart)
  const built = readFile(root, '/work/main.wasm')
  if (status !== 0 || built === undefined) {
    return finish({ tag: 'CompileFailed', code: status })
  }
  const runStart = performance.now()
  try {
    const module = await WebAssembly.compile(built.slice())
    const code =
      request.target === 'wasm32-wasip1'
        ? runCommand(
            module,
            ['main'],
            fork(directory()),
            output.write('stdout'),
            output.write('stderr'),
          )
        : runBare(module, output)
    timings.run = elapsed(runStart)
    return finish({ tag: 'Exited', code })
  } catch (error) {
    timings.run = elapsed(runStart)
    return finish({ tag: 'Trapped', message: message(error) })
  }
}

const isTarget = (value: unknown): value is Target =>
  value === 'wasm32-wasip1' || value === 'wasm32-unknown-unknown'

const isRequest = (value: unknown): value is RunRequest =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'number' &&
  'files' in value &&
  Array.isArray(value.files) &&
  'target' in value &&
  isTarget(value.target) &&
  'toolchain' in value &&
  typeof value.toolchain === 'object' &&
  value.toolchain !== null

// The parts of the worker's global scope used here. The project's types
// describe a window, whose `postMessage` also takes a single message.
type WorkerScope = Readonly<{
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent) => void,
  ) => void
  postMessage: (message: RunResponse) => void
}>

const start = (scope: WorkerScope): void => {
  // The toolchain downloads once per worker, on the first request.
  const cache: { loaded: Promise<Loaded> | undefined } = { loaded: undefined }
  // Requests run one at a time, in order.
  const queue: { tail: Promise<void> } = { tail: Promise.resolve() }
  scope.addEventListener('message', event => {
    const request: unknown = event.data
    if (!isRequest(request)) {
      return
    }
    cache.loaded ??= loadToolchain(request.toolchain).catch(
      (error: unknown) => {
        // A later run tries the download again.
        cache.loaded = undefined
        throw error
      },
    )
    const loaded = cache.loaded
    queue.tail = queue.tail.then(async () => {
      scope.postMessage(await run(loaded, request))
    })
  })
}

start(self)
