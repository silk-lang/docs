import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Example, RunChunk, RunOutcome } from './model'

export const Message = defineMessageUnion({
  ChangedSource: { source: Schema.String },
  SelectedExample: { id: Schema.String },
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
  SucceededLoadExamples: { examples: Schema.Array(Example) },
  FailedLoadExamples: {},
})
export type Message = typeof Message.Type
