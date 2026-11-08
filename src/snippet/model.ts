import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Annotations, EMPTY } from '../annotate/model'

// The card's colors: a dark card as in the design, or a light one.
export const Theme = Schema.Literals(['Dark', 'Light'])
export type Theme = typeof Theme.Type

export const FormatState = defineTaggedUnion({
  Idle: {},
  Formatting: {},
  // The formatter refused the code, such as code that does not parse.
  Failed: { message: Schema.String },
})
export type FormatState = typeof FormatState.Type

// What the image shows and how. Sizes are in CSS pixels; `scale` multiplies
// them in the downloaded PNG.
export const Settings = Schema.Struct({
  code: Schema.String,
  fileName: Schema.String,
  width: Schema.Number,
  padding: Schema.Number,
  // A CSS color, or `TRANSPARENT` for no background.
  background: Schema.String,
  theme: Theme,
  showLineNumbers: Schema.Boolean,
  showWindow: Schema.Boolean,
  // Errors and inlay hints from the language server. Hovers show where a
  // `^?` marker pins them.
  showErrors: Schema.Boolean,
  showInlayHints: Schema.Boolean,
  scale: Schema.Number,
})
export type Settings = typeof Settings.Type

export const Model = Schema.Struct({
  settings: Settings,
  formatState: FormatState,
  // The canvas draws text in whatever font is loaded, so it paints again
  // once JetBrains Mono is in.
  areFontsReady: Schema.Boolean,
  // Whether the settings in the page address, if any, have been read. The
  // address is only written after, so it is not replaced by the defaults.
  isAddressRead: Schema.Boolean,
  // What the language server said, and about which code.
  maybeAnnotated: Schema.Option(
    Schema.Struct({ code: Schema.String, annotations: Annotations }),
  ),
})
export type Model = typeof Model.Type

export const TRANSPARENT = 'transparent'

export const BACKGROUNDS: ReadonlyArray<
  Readonly<{ name: string; color: string }>
> = [
  { name: 'Signal', color: '#009689' },
  { name: 'Ink', color: '#0B0B0C' },
  { name: 'Stone', color: '#E4E4E1' },
  { name: 'Paper', color: '#FFFFFF' },
  { name: 'None', color: TRANSPARENT },
]

export const SCALES: ReadonlyArray<number> = [1, 2, 3]

export const LIMITS = {
  width: { min: 360, max: 2400 },
  padding: { min: 0, max: 200 },
}

const SAMPLE = `//! Counts the open tasks and prints how many are left.
import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

fn countOpen(finished: &[bool]) -> i32 {
  let mut open = 0
  let mut index: usize = 0
  while index < finished.length {
    if !finished[index] {
      open = open + 1
    }
    index = index + 1
  }
  return open
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  let open = countOpen(&[true, false, false])
  //  ^?
  run Effect.log("{} tasks open\\n", &.(open)) |> Effect.provideMut(&mut logger)
}
`

export const initialModel: Model = {
  settings: {
    code: SAMPLE,
    fileName: 'tasks.silk',
    width: 960,
    padding: 64,
    background: '#009689',
    theme: 'Dark',
    showLineNumbers: true,
    showWindow: true,
    showErrors: true,
    showInlayHints: false,
    scale: 2,
  },
  formatState: FormatState.Idle(),
  areFontsReady: false,
  isAddressRead: false,
  maybeAnnotated: Option.none(),
}

// The annotations of the code as it is now. Older ones would point at the
// wrong places, so the image waits for the next check instead.
export const currentAnnotations = (model: Model): Annotations =>
  Option.match(model.maybeAnnotated, {
    onNone: () => EMPTY,
    onSome: ({ code, annotations }) =>
      code === model.settings.code ? annotations : EMPTY,
  })
