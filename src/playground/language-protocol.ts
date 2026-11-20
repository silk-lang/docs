// The messages between the page and the language server worker.

import { type Shared } from './channel'
import { type ProgramFile, type Toolchain } from './protocol'

// The package the server analyzes: one file, the playground's source.
export const WORK_ROOT = '/work'
export const WORK_FILE = `${WORK_ROOT}/main.silk`
// Its manifest pins the compiler's own release, without the build metadata,
// since a dev release builds only packages written for that exact release.
export const workManifest = (toolchain: Toolchain): string => `[package]
name = "playground"
version = "0.0.0"
source = "."
silk-version = "${toolchain.version.replace(/\+.*$/, '')}"
`

// Starts the server. `input` is its standard input; `files` are the
// package's files on disk, before the page opens them as documents.
export type LanguageRequest = Readonly<{
  toolchain: Toolchain
  input: Shared
  files: ReadonlyArray<ProgramFile>
}>

// The document URI of the package file `name`.
export const fileUri = (name: string): string => `file://${WORK_ROOT}/${name}`

export type LanguageResponse =
  // Bytes the server wrote to standard output: framed JSON-RPC messages.
  | Readonly<{ tag: 'Output'; bytes: Uint8Array }>
  | Readonly<{ tag: 'Log'; text: string }>
  | Readonly<{ tag: 'Exited'; code: number }>
  | Readonly<{ tag: 'Failed'; message: string }>
