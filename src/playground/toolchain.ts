// The toolchain the playground's workers run: the Silk compiler, itself a
// wasm32-wasip1 module, and the standard library unpacked into an in-memory
// file tree under `/stdlib`.

import { type Toolchain } from './protocol'
import { type DirectoryNode, directory, writeFile } from './wasi'

export type Loaded = Readonly<{
  compiler: WebAssembly.Module
  base: DirectoryNode
}>

// The toolchain files are gzipped. A server that labels them as gzip lets the
// browser unpack them on the way, so only bytes that still start with the gzip
// magic number are unpacked here.
const download = async (url: string): Promise<Uint8Array<ArrayBuffer>> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Downloading ${url} failed with HTTP ${response.status}.`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// The standard library pack: a path length, the path, a contents length and
// the contents for each file, every length a little-endian u32.
const unpack = (pack: Uint8Array, root: DirectoryNode): void => {
  const view = new DataView(pack.buffer, pack.byteOffset, pack.byteLength)
  const decoder = new TextDecoder()
  let at = 0
  while (at < pack.length) {
    const nameLength = view.getUint32(at, true)
    const name = decoder.decode(pack.subarray(at + 4, at + 4 + nameLength))
    at += 4 + nameLength
    const size = view.getUint32(at, true)
    writeFile(root, `/stdlib/${name}`, pack.subarray(at + 4, at + 4 + size))
    at += 4 + size
  }
}

export const loadToolchain = async (toolchain: Toolchain): Promise<Loaded> => {
  const [compilerBytes, stdlib] = await Promise.all([
    download(toolchain.compilerUrl),
    download(toolchain.stdlibUrl),
  ])
  const base = directory()
  unpack(stdlib, base)
  return { compiler: await WebAssembly.compile(compilerBytes), base }
}
