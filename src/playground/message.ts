import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { RunChunk, RunOutcome } from './model'

export const Message = defineMessageUnion({
  // The editor's text of the file `name` changed.
  ChangedSource: { name: Schema.String, source: Schema.String },
  SelectedExample: { id: Schema.String },
  SelectedFile: { name: Schema.String },
  CompletedShowFile: {},
  ClickedRun: {},
  PressedRunShortcut: {},
  ClickedStop: {},
  // The running program wrote more output, after clearing the screen when
  // `clear` is true.
  ReceivedRunOutput: { clear: Schema.Boolean, output: Schema.Array(RunChunk) },
  CompletedRun: {
    output: Schema.Array(RunChunk),
    outcome: RunOutcome,
    compileMilliseconds: Schema.Number,
    runMilliseconds: Schema.Number,
  },
  CompletedStop: {},
})
export type Message = typeof Message.Type
