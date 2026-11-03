import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

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

// An example as a release's playground archive lists it: one `main.silk`.
export const ArchiveExample = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  target: Target,
  source: Schema.String,
})
export type ArchiveExample = typeof ArchiveExample.Type

export const fromArchive = (example: ArchiveExample): Example => ({
  id: example.id,
  title: example.title,
  target: example.target,
  files: [{ name: MAIN_FILE, source: example.source }],
})

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
  files: Schema.Array(SourceFile),
  // The file the editor shows.
  activeFile: Schema.String,
  target: Target,
  runState: RunState,
})
export type Model = typeof Model.Type

// The first program on the page, from chapter 1 of the book.
export const HELLO: Example = {
  id: 'hello',
  title: 'Hello, world',
  target: 'wasm32-wasip1',
  files: [
    {
      name: MAIN_FILE,
      source: `import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello, world!\\n", &()) |> Effect.provideMut(&mut logger)
}
`,
    },
  ],
}

// A program in two files: `main.silk` imports the shapes module by its
// file name.
export const MODULES: Example = {
  id: 'modules',
  title: 'Modules in two files',
  target: 'wasm32-wasip1',
  files: [
    {
      name: MAIN_FILE,
      source: `import shapes { Rectangle, Square, rectangleArea, squareArea }
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let room = Rectangle { width: 4, height: 3 }
  let tile = Square { side: 2 }
  let total = rectangleArea(&room) + squareArea(&tile)

  run Effect.log("The areas add up to {}.\\n", &.(total)) |> Effect.provideMut(&mut logger)
}
`,
    },
    {
      name: 'shapes.silk',
      source: `//! Shapes and their areas, in a module of their own.

/// A rectangle, \`width\` by \`height\`.
pub struct Rectangle {
  pub width: i32,
  pub height: i32,
}

/// A square with sides of \`side\`.
pub struct Square {
  pub side: i32,
}

/// The area of \`rectangle\`.
pub fn rectangleArea(rectangle: &Rectangle) -> i32 {
  return rectangle.width * rectangle.height
}

/// The area of \`square\`.
pub fn squareArea(square: &Square) -> i32 {
  return square.side * square.side
}
`,
    },
  ],
}

// The examples the site carries itself, before the release's.
export const BUILT_IN: ReadonlyArray<Example> = [HELLO, MODULES]
