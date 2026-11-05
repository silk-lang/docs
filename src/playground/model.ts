import { type Array, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import fibers from '../../demos/playground/fibers/src/main.silk?raw'
import hello from '../../demos/playground/hello/src/main.silk?raw'
import life from '../../demos/playground/life/src/main.silk?raw'
import maze from '../../demos/playground/maze/src/main.silk?raw'
import modules from '../../demos/playground/modules/src/main.silk?raw'
import shapes from '../../demos/playground/modules/src/shapes.silk?raw'
import parse from '../../demos/playground/parse/src/main.silk?raw'
import quicksort from '../../demos/playground/quicksort/src/main.silk?raw'
import sieve from '../../demos/playground/sieve/src/main.silk?raw'

export const Target = Schema.Literals([
  'wasm32-wasip1',
  'wasm32-unknown-unknown',
])
export type Target = typeof Target.Type

// One file of a program. Every program has `main.silk`, which the compiler
// builds; the other files are modules it imports by name.
export const SourceFile = Schema.Struct({
  name: Schema.String,
  source: Schema.String,
})
export type SourceFile = typeof SourceFile.Type

export const MAIN_FILE = 'main.silk'

export const Example = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  target: Target,
  files: Schema.Array(SourceFile),
})
export type Example = typeof Example.Type

export const RunChunk = Schema.Struct({
  stream: Schema.Literals(['compiler', 'stdout', 'stderr']),
  text: Schema.String,
})
export type RunChunk = typeof RunChunk.Type

export const RunOutcome = defineTaggedUnion({
  Exited: { code: Schema.Number },
  CompileFailed: { code: Schema.Number },
  Trapped: { message: Schema.String },
  ToolchainFailed: { message: Schema.String },
  Stopped: {},
})
export type RunOutcome = typeof RunOutcome.Type

export const RunState = defineTaggedUnion({
  Idle: {},
  // The output so far, as the program writes it.
  Running: { output: Schema.Array(RunChunk) },
  Finished: {
    output: Schema.Array(RunChunk),
    outcome: RunOutcome,
    compileMilliseconds: Schema.Number,
    runMilliseconds: Schema.Number,
  },
})
export type RunState = typeof RunState.Type

export const Model = Schema.Struct({
  examples: Schema.Array(Example),
  exampleId: Schema.String,
  files: Schema.Array(SourceFile),
  // The file the editor shows.
  activeFile: Schema.String,
  target: Target,
  runState: RunState,
})
export type Model = typeof Model.Type

// The examples are Silk packages in demos/playground; `pnpm check:examples`
// compiles them all, so a new Silk release that warns about one shows up there.
const single = (id: string, title: string, source: string): Example => ({
  id,
  title,
  target: 'wasm32-wasip1',
  files: [{ name: MAIN_FILE, source }],
})

export const EXAMPLES: Array.NonEmptyReadonlyArray<Example> = [
  single('hello', 'Hello, world', hello),
  single('fibers', 'A race between fibers', fibers),
  single('parse', 'Reading numbers with Result', parse),
  single('sieve', 'Sieve of Eratosthenes', sieve),
  single('quicksort', 'Quicksort, step by step', quicksort),
  single('maze', 'Shortest path through a maze', maze),
  single('life', "Conway's Game of Life", life),
  {
    id: 'modules',
    title: 'Modules in two files',
    target: 'wasm32-wasip1',
    files: [
      { name: MAIN_FILE, source: modules },
      { name: 'shapes.silk', source: shapes },
    ],
  },
]
