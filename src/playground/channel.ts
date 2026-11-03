// A byte pipe from the page to a worker over shared memory. The worker reads
// it as standard input and blocks while it is empty, which a WASI command such
// as the language server needs: it cannot return to the event loop for
// `postMessage` in the middle of a read. The page never blocks; bytes that do
// not fit wait until the worker has read enough.
//
// Shared memory needs a cross-origin isolated page (`crossOriginIsolated`).

const CAPACITY = 1 << 20

// The header's slots: bytes written so far, bytes read so far, and whether
// the writer has closed the pipe. The counts wrap at 2^32, and CAPACITY
// divides 2^32, so `count % CAPACITY` is a position in the ring.
const WRITTEN = 0
const READ = 1
const CLOSED = 2

export type Shared = Readonly<{
  header: SharedArrayBuffer
  data: SharedArrayBuffer
}>

export const makeShared = (): Shared => ({
  header: new SharedArrayBuffer(3 * Int32Array.BYTES_PER_ELEMENT),
  data: new SharedArrayBuffer(CAPACITY),
})

const used = (header: Int32Array): number =>
  (Atomics.load(header, WRITTEN) - Atomics.load(header, READ)) >>> 0

// The page's end. `write` keeps the order of its bytes across calls.
export const makeWriter = (shared: Shared) => {
  const header = new Int32Array(shared.header)
  const data = new Uint8Array(shared.data)
  const queue: Array<Uint8Array> = []
  const timer: { current: ReturnType<typeof setTimeout> | undefined } = {
    current: undefined,
  }
  const flush = (): void => {
    timer.current = undefined
    while (queue.length > 0) {
      const room = CAPACITY - used(header)
      if (room === 0) {
        // The worker reads on its own schedule, so the rest goes later.
        timer.current = setTimeout(flush, 5)
        return
      }
      const next = queue[0]!
      const part = next.subarray(0, Math.min(room, next.length))
      const written = Atomics.load(header, WRITTEN) >>> 0
      const at = written % CAPACITY
      const first = Math.min(part.length, CAPACITY - at)
      data.set(part.subarray(0, first), at)
      data.set(part.subarray(first), 0)
      Atomics.store(header, WRITTEN, (written + part.length) | 0)
      Atomics.notify(header, WRITTEN)
      if (part.length === next.length) {
        queue.shift()
      } else {
        queue[0] = next.subarray(part.length)
      }
    }
  }
  return {
    write: (bytes: Uint8Array): void => {
      queue.push(bytes.slice())
      if (timer.current === undefined) {
        flush()
      }
    },
    // The reader gets what was written, then the end of the input.
    close: (): void => {
      Atomics.store(header, CLOSED, 1)
      Atomics.notify(header, WRITTEN)
    },
  }
}

// The worker's end: fills a prefix of `into`, waiting while the pipe is
// empty, and answers 0 once it is empty and closed.
export const makeReader =
  (shared: Shared) =>
  (into: Uint8Array): number => {
    const header = new Int32Array(shared.header)
    const data = new Uint8Array(shared.data)
    while (true) {
      const written = Atomics.load(header, WRITTEN)
      const read = Atomics.load(header, READ) >>> 0
      const available = (written - read) >>> 0
      if (available > 0) {
        const count = Math.min(available, into.length)
        const at = read % CAPACITY
        const first = Math.min(count, CAPACITY - at)
        into.set(data.subarray(at, at + first))
        into.set(data.subarray(0, count - first), first)
        Atomics.store(header, READ, (read + count) | 0)
        return count
      }
      if (Atomics.load(header, CLOSED) === 1) {
        return 0
      }
      Atomics.wait(header, WRITTEN, written)
    }
  }
