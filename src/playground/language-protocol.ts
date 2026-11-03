// The messages between the page and the language server worker.

import { type Shared } from './channel'
import { type Toolchain } from './protocol'

// The package the server analyzes: one file, the playground's source.
export const WORK_ROOT = '/work'
export const WORK_FILE = `${WORK_ROOT}/main.silk`
export const WORK_URI = `file://${WORK_FILE}`
export const WORK_MANIFEST = `[package]
name = "playground"
version = "0.0.0"
source = "."
`

// Starts the server. `input` is its standard input; `source` is the file's
// text on disk, before the page opens it as a document.
export type LanguageRequest = Readonly<{
  toolchain: Toolchain
  input: Shared
  source: string
}>

export type LanguageResponse =
  // Bytes the server wrote to standard output: framed JSON-RPC messages.
  | Readonly<{ tag: 'Output'; bytes: Uint8Array }>
  | Readonly<{ tag: 'Log'; text: string }>
  | Readonly<{ tag: 'Exited'; code: number }>
  | Readonly<{ tag: 'Failed'; message: string }>
