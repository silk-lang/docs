// @vitest-environment node
import { gzipSync } from 'node:zlib'
import { expect, test } from 'vitest'

import { loadToolchain } from './toolchain'

const url = (bytes: Buffer): string =>
  `data:application/octet-stream;base64,${bytes.toString('base64')}`

test('the compiler loads ordered gzip parts, including parts decoded by the server', async () => {
  const { compiler } = await loadToolchain({
    compilerUrls: [
      url(gzipSync(Buffer.from([0, 97, 115, 109]))),
      url(Buffer.from([1, 0, 0, 0])),
    ],
    stdlibUrl: url(gzipSync(Buffer.alloc(0))),
  })
  expect(WebAssembly.Module.exports(compiler)).toEqual([])
})
