import { Context, Effect, Layer } from 'effect'

import {
  type ProgramFile,
  type RunResponse,
  type Target,
  type Toolchain,
} from './protocol'

type PlaygroundApi = Readonly<{
  // Compiles and runs the program in `files` in the playground worker.
  run: (
    toolchain: Toolchain,
    files: ReadonlyArray<ProgramFile>,
    target: Target,
  ) => Effect.Effect<RunResponse>
  // Stops the running program, which then ends as `Stopped`. The next run
  // starts a new worker, which downloads the toolchain again from the cache.
  stop: Effect.Effect<void>
}>

const isResponse = (value: unknown): value is RunResponse =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'number' &&
  'outcome' in value

type Pending = Map<number, (response: RunResponse) => void>

const failAll = (
  pending: Pending,
  response: (id: number) => RunResponse,
): void => {
  const waiting = [...pending]
  pending.clear()
  waiting.forEach(([id, resume]) => resume(response(id)))
}

const ended = (id: number, outcome: RunResponse['outcome']): RunResponse => ({
  id,
  output: [],
  outcome,
  compileMilliseconds: 0,
  runMilliseconds: 0,
})

const makePlayground = (): PlaygroundApi => {
  const state: { worker: Worker | undefined; nextId: number } = {
    worker: undefined,
    nextId: 1,
  }
  const pending: Pending = new Map()

  const stopWorker = (): void => {
    state.worker?.terminate()
    state.worker = undefined
  }

  const worker = (): Worker => {
    if (state.worker !== undefined) {
      return state.worker
    }
    const created = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    created.addEventListener('message', event => {
      const response: unknown = event.data
      if (!isResponse(response)) {
        return
      }
      const resume = pending.get(response.id)
      pending.delete(response.id)
      resume?.(response)
    })
    created.addEventListener('error', event => {
      stopWorker()
      failAll(pending, id =>
        ended(id, {
          tag: 'ToolchainFailed',
          message: event.message || 'The playground worker stopped.',
        }),
      )
    })
    state.worker = created
    return created
  }

  return {
    run: (toolchain, files, target) =>
      Effect.callback<RunResponse>(resume => {
        const id = state.nextId
        state.nextId += 1
        pending.set(id, response => resume(Effect.succeed(response)))
        worker().postMessage({ id, toolchain, files, target })
      }),
    stop: Effect.sync(() => {
      stopWorker()
      failAll(pending, id => ended(id, { tag: 'Stopped' }))
    }),
  }
}

export class PlaygroundService extends Context.Service<
  PlaygroundService,
  PlaygroundApi
>()('PlaygroundService') {
  static readonly Default = Layer.sync(this, makePlayground)
}
