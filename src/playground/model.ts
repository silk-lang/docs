import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Target = Schema.Literals([
  'wasm32-wasip1',
  'wasm32-unknown-unknown',
])
export type Target = typeof Target.Type

export const Example = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  target: Target,
  source: Schema.String,
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
  Running: {},
  Finished: {
    output: Schema.Array(RunChunk),
    outcome: RunOutcome,
    compileMilliseconds: Schema.Number,
    runMilliseconds: Schema.Number,
  },
})
export type RunState = typeof RunState.Type

export const ExamplesState = Schema.Literals([
  'Idle',
  'Loading',
  'Loaded',
  'Failed',
])

export const Model = Schema.Struct({
  examples: Schema.Array(Example),
  examplesState: ExamplesState,
  exampleId: Schema.String,
  source: Schema.String,
  target: Target,
  runState: RunState,
})
export type Model = typeof Model.Type

// The first program on the page, from chapter 1 of the book.
export const HELLO: Example = {
  id: 'hello',
  title: 'Hello, world',
  target: 'wasm32-wasip1',
  source: `import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello, world!\\n", &()) |> Effect.provideMut(&mut logger)
}
`,
}
