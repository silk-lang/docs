import { describe, expect, test } from 'vitest'

import { directory, makeWasi } from './wasi'

describe('WASI host', () => {
  test('poll_oneoff sleeps until a clock subscription is due', () => {
    const wasi = makeWasi({
      args: [],
      root: directory(),
      stdout: () => {},
      stderr: () => {},
    })
    const memory = new WebAssembly.Memory({ initial: 1 })
    wasi.bind(memory)
    const view = new DataView(memory.buffer)
    // One relative subscription on the monotonic clock, 30 ms from now.
    view.setBigUint64(0, 7n, true)
    view.setUint8(8, 0)
    view.setUint32(16, 1, true)
    view.setBigUint64(24, 30_000_000n, true)
    view.setUint16(40, 0, true)

    const pollOneoff = wasi.imports['poll_oneoff']
    if (typeof pollOneoff !== 'function') {
      throw new Error('poll_oneoff is missing')
    }
    const startedAt = performance.now()
    expect(pollOneoff(0, 64, 1, 128)).toBe(0)

    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(29)
    expect(view.getUint32(128, true)).toBe(1)
    expect(view.getBigUint64(64, true)).toBe(7n)
    expect(view.getUint16(72, true)).toBe(0)
  })
})
