// The page's side of the playground language server: starts the worker,
// frames JSON-RPC messages into its standard input, and reads its answers.
// The worker blocks on shared memory, so it needs a cross-origin isolated
// page; without one, `startLanguageServer` answers undefined.

import { makeShared, makeWriter } from './channel'
import { type LanguageResponse, WORK_ROOT, WORK_URI } from './language-protocol'
import { type Toolchain } from './protocol'

export { WORK_URI }

type Json =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<Json>
  | { readonly [key: string]: Json }

export type Notification = Readonly<{ method: string; params: Json }>

export type LanguageServer = Readonly<{
  // The `initialize` result. The server is initialized before any other
  // message reaches it, so requests can be sent at once.
  initialized: Promise<Json>
  // Sends a request and answers its result, or fails with the server's error.
  request: (method: string, params: Json) => Promise<Json>
  notify: (method: string, params: Json) => void
  // Calls `listener` for each notification the server sends, such as
  // `textDocument/publishDiagnostics`.
  onNotification: (listener: (notification: Notification) => void) => void
  // Asks the server to shut down and exit, then stops the worker.
  stop: () => Promise<void>
}>

type Waiting = Readonly<{
  resolve: (result: Json) => void
  reject: (error: Error) => void
}>

const isResponse = (value: unknown): value is LanguageResponse =>
  typeof value === 'object' &&
  value !== null &&
  'tag' in value &&
  typeof value.tag === 'string'

const HEADER_END = [13, 10, 13, 10]

const headerEnd = (bytes: Uint8Array): number => {
  for (let at = 0; at + 3 < bytes.length; at += 1) {
    if (HEADER_END.every((byte, offset) => bytes[at + offset] === byte)) {
      return at
    }
  }
  return -1
}

const concat = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const joined = new Uint8Array(left.length + right.length)
  joined.set(left)
  joined.set(right, left.length)
  return joined
}

export const startLanguageServer = (
  toolchain: Toolchain,
  source: string,
): LanguageServer | undefined => {
  if (!globalThis.crossOriginIsolated) {
    return undefined
  }
  const shared = makeShared()
  const input = makeWriter(shared)
  const worker = new Worker(new URL('./language-worker.ts', import.meta.url), {
    type: 'module',
  })
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const waiting = new Map<number, Waiting>()
  const listeners: Array<(notification: Notification) => void> = []
  const state: {
    nextId: number
    pending: Uint8Array
    ended: string | undefined
  } = {
    nextId: 1,
    pending: new Uint8Array(0),
    ended: undefined,
  }

  const send = (message: Readonly<Record<string, Json>>): void => {
    const content = encoder.encode(
      JSON.stringify({ jsonrpc: '2.0', ...message }),
    )
    input.write(encoder.encode(`Content-Length: ${content.length}\r\n\r\n`))
    input.write(content)
  }

  const end = (reason: string): void => {
    state.ended = reason
    const stopped = [...waiting.values()]
    waiting.clear()
    stopped.forEach(({ reject }) => reject(new Error(reason)))
  }

  const receive = (message: Readonly<Record<string, Json>>): void => {
    const id = message['id']
    if (typeof id === 'number' && !('method' in message)) {
      const entry = waiting.get(id)
      waiting.delete(id)
      const error = message['error']
      if (error !== undefined && error !== null) {
        entry?.reject(new Error(JSON.stringify(error)))
      } else {
        entry?.resolve(message['result'] ?? null)
      }
      return
    }
    const method = message['method']
    if (typeof method === 'string' && id === undefined) {
      listeners.forEach(listener =>
        listener({ method, params: message['params'] ?? null }),
      )
    }
  }

  const output = (bytes: Uint8Array): void => {
    state.pending = concat(state.pending, bytes)
    while (true) {
      const end = headerEnd(state.pending)
      if (end < 0) {
        return
      }
      const header = decoder.decode(state.pending.subarray(0, end))
      const length = Number(/Content-Length: *(\d+)/i.exec(header)?.[1])
      if (!Number.isFinite(length) || state.pending.length < end + 4 + length) {
        return
      }
      const content = decoder.decode(
        state.pending.subarray(end + 4, end + 4 + length),
      )
      state.pending = state.pending.slice(end + 4 + length)
      receive(JSON.parse(content))
    }
  }

  worker.addEventListener('message', event => {
    const response: unknown = event.data
    if (!isResponse(response)) {
      return
    }
    switch (response.tag) {
      case 'Output':
        output(response.bytes)
        return
      case 'Log':
        return
      case 'Exited':
        end(`The language server exited with status ${response.code}.`)
        return
      case 'Failed':
        end(response.message)
        return
    }
  })
  worker.addEventListener('error', event => {
    end(event.message || 'The language server worker stopped.')
  })
  worker.postMessage({ toolchain, input: shared, source })

  const request = (method: string, params: Json): Promise<Json> =>
    new Promise((resolve, reject) => {
      if (state.ended !== undefined) {
        reject(new Error(state.ended))
        return
      }
      const id = state.nextId
      state.nextId += 1
      waiting.set(id, { resolve, reject })
      send({ id, method, params })
    })

  const initialized = request('initialize', {
    processId: null,
    rootUri: `file://${WORK_ROOT}`,
    capabilities: {},
  })
  send({ method: 'initialized', params: {} })

  return {
    initialized,
    request,
    notify: (method, params) => send({ method, params }),
    onNotification: listener => {
      listeners.push(listener)
    },
    stop: async () => {
      if (state.ended === undefined) {
        await request('shutdown', null).catch(() => null)
        send({ method: 'exit', params: null })
        input.close()
      }
      worker.terminate()
    },
  }
}
