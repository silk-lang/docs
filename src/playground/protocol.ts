// The messages between the playground page and its worker.

// Where a program runs: as a WASI command, or as a bare module whose logger
// writes through `silk.console`.
export type Target = 'wasm32-wasip1' | 'wasm32-unknown-unknown'

export type Toolchain = Readonly<{ compilerUrl: string; stdlibUrl: string }>

// One file of the program, by its name under the package directory.
export type ProgramFile = Readonly<{ name: string; source: string }>

export type RunRequest = Readonly<{
  id: number
  toolchain: Toolchain
  // The program's files; the compiler builds `main.silk`.
  files: ReadonlyArray<ProgramFile>
  target: Target
}>

export type Stream = 'compiler' | 'stdout' | 'stderr'

export type Chunk = Readonly<{ stream: Stream; text: string }>

// Output the program wrote since the last progress message, sent while it
// runs; `clear` says it cleared the screen first, so the page drops the
// program's earlier output. The response at the end carries what remains.
export type RunProgress = Readonly<{
  id: number
  clear: boolean
  progress: ReadonlyArray<Chunk>
}>

// How a run ended.
export type Outcome =
  | Readonly<{ tag: 'Exited'; code: number }>
  | Readonly<{ tag: 'CompileFailed'; code: number }>
  | Readonly<{ tag: 'Trapped'; message: string }>
  | Readonly<{ tag: 'ToolchainFailed'; message: string }>
  | Readonly<{ tag: 'Stopped' }>

export type RunResponse = Readonly<{
  id: number
  output: ReadonlyArray<Chunk>
  outcome: Outcome
  compileMilliseconds: number
  runMilliseconds: number
}>

// Formats one Silk file with `silkc format`, for the snippet page.
export type FormatRequest = Readonly<{
  id: number
  kind: 'format'
  toolchain: Toolchain
  source: string
}>

export type FormatOutcome =
  | Readonly<{ tag: 'Formatted'; source: string }>
  | Readonly<{ tag: 'Failed'; message: string }>

export type FormatResponse = Readonly<{
  id: number
  kind: 'format'
  outcome: FormatOutcome
}>
