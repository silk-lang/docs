import { Schema } from 'effect'

// What the language server says about code, in shown lines and columns.

export const Severity = Schema.Literals(['Error', 'Warning'])
export type Severity = typeof Severity.Type

export const Diagnostic = Schema.Struct({
  line: Schema.Number,
  start: Schema.Number,
  end: Schema.Number,
  severity: Severity,
  code: Schema.String,
  message: Schema.String,
})
export type Diagnostic = typeof Diagnostic.Type

export const Hover = Schema.Struct({
  line: Schema.Number,
  start: Schema.Number,
  end: Schema.Number,
  // The signature in the hover's code fence.
  text: Schema.String,
  // Asked for with `^?`, so it shows without hovering.
  isPinned: Schema.Boolean,
})
export type Hover = typeof Hover.Type

export const InlayHint = Schema.Struct({
  line: Schema.Number,
  column: Schema.Number,
  label: Schema.String,
})
export type InlayHint = typeof InlayHint.Type

export const Annotations = Schema.Struct({
  diagnostics: Schema.Array(Diagnostic),
  hovers: Schema.Array(Hover),
  hints: Schema.Array(InlayHint),
})
export type Annotations = typeof Annotations.Type

export const EMPTY: Annotations = { diagnostics: [], hovers: [], hints: [] }
