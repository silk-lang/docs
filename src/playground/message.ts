import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ArchiveExample, RunChunk, RunOutcome } from './model'

export const Message = defineMessageUnion({
  // The editor's text of the file `name` changed.
  ChangedSource: { name: Schema.String, source: Schema.String },
  SelectedExample: { id: Schema.String },
  SelectedFile: { name: Schema.String },
  CompletedShowFile: {},
  ClickedRun: {},
  PressedRunShortcut: {},
  ClickedStop: {},
  CompletedRun: {
    output: Schema.Array(RunChunk),
    outcome: RunOutcome,
    compileMilliseconds: Schema.Number,
    runMilliseconds: Schema.Number,
  },
  CompletedStop: {},
  SucceededLoadExamples: { examples: Schema.Array(ArchiveExample) },
  FailedLoadExamples: {},
})
export type Message = typeof Message.Type
