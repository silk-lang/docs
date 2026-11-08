import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Annotations } from '../annotate/model'
import { Settings, Theme } from './model'

export const Message = defineMessageUnion({
  ChangedCode: { code: Schema.String },
  ChangedFileName: { fileName: Schema.String },
  // Number fields arrive as the input's text.
  ChangedWidth: { value: Schema.String },
  ChangedPadding: { value: Schema.String },
  ChangedBackground: { color: Schema.String },
  SelectedTheme: { theme: Theme },
  SelectedScale: { value: Schema.String },
  ClickedLineNumbers: {},
  ClickedWindow: {},
  ClickedErrors: {},
  ClickedInlayHints: {},
  ReceivedAnnotations: { code: Schema.String, annotations: Annotations },
  ClickedFitWidth: {},
  ClickedFormat: {},
  SucceededFormat: { code: Schema.String },
  FailedFormat: { message: Schema.String },
  ClickedDownload: {},
  CompletedDownload: {},
  LoadedFonts: {},
  ReadAddress: { maybeSettings: Schema.Option(Settings) },
  CompletedWaitToWriteAddress: { path: Schema.String },
  CompletedWriteAddress: {},
})
export type Message = typeof Message.Type
