// The worker is plain script outside the Foldkit program: the wasm module calls
// the clock synchronously, so it cannot go through Effect's Clock.
/* oxlint-disable foldkit/no-impure-call-at-decision-time */
import wasmUrl from './fibers.wasm?url'

// Runs the fibers example, built from demos/fibers with `pnpm build:demos`, and
// posts the value `main` returns and how long it took. It runs in a worker
// because the page's clock blocks while the program sleeps.

const now = (): bigint => BigInt(Math.round(performance.now() * 1e6))

// ponytail: spins one core while the program sleeps, since Atomics.wait needs a
// cross-origin isolated page. Switch once the site sends COOP and COEP headers.
const wait = (until: bigint): void => {
  while (now() < until) {
    // Waiting.
  }
}

// A module that fails to load or traps posts null, which the page reads as a
// failed run.
WebAssembly.instantiateStreaming(fetch(wasmUrl), { page: { now, wait } })
  .then(({ instance }) => {
    const main = instance.exports['main']
    if (typeof main !== 'function') {
      throw new Error('fibers.wasm exports no main')
    }
    const startedAt = performance.now()
    const value: unknown = main()
    postMessage({ value, milliseconds: performance.now() - startedAt })
  })
  .catch(() => postMessage(null))
