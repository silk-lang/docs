// The language server behind the snippet's annotations: the playground's
// Silk language server, started the first time it is needed and kept for
// the visit. Each check replaces the one file's text.

import toolchain from 'virtual:silk-playground'

import { collect } from '../annotate/collect'
import { parse } from '../annotate/markers'
import { type Annotations } from '../annotate/model'
import {
  type LanguageServer,
  fileUri,
  startLanguageServer,
} from '../playground/language-server'
import { MAIN_FILE } from '../playground/model'

const state: {
  server: LanguageServer | undefined
  version: number
  queue: Promise<unknown>
} = { server: undefined, version: 0, queue: Promise.resolve() }

const server = (): LanguageServer | undefined => {
  if (state.server === undefined && toolchain !== null) {
    state.server = startLanguageServer(toolchain, [
      { name: MAIN_FILE, source: '' },
    ])
  }
  return state.server
}

// Undefined when the page cannot run the language server, such as a build
// without the playground toolchain or a page that is not cross-origin
// isolated.
export const annotate = (code: string): Promise<Annotations | undefined> => {
  const running = server()
  if (running === undefined) {
    return Promise.resolve(undefined)
  }
  // One check at a time, so versions reach the server in order.
  const next = state.queue.then(async () => {
    await running.initialized
    state.version += 1
    return collect(
      running,
      { uri: fileUri(MAIN_FILE), version: state.version },
      parse(code),
      {
        hoverEveryName: false,
        includeWarnings: false,
        timeoutMilliseconds: 30_000,
      },
    )
  })
  state.queue = next.catch(() => undefined)
  return next
}
