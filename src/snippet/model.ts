import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

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
  scale: Schema.Number,
})
export type Settings = typeof Settings.Type

export const Model = Schema.Struct({
  settings: Settings,
  formatState: FormatState,
  // The canvas draws text in whatever font is loaded, so it paints again
  // once JetBrains Mono is in.
  areFontsReady: Schema.Boolean,
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

const SAMPLE = `//! The counter: a number and two buttons.
import look { surface, button }
import ui_app.app { App, Context, NoCommand }
import ui_app.ui { Ui }

pub struct Counter {
  pub count: i64,
}

pub union Message {
  Increment,
  Decrement,
}

impl App<Message, NoCommand> for Counter {
  fn view(self: &Self, ui: &mut Ui<Message>) -> () {
    surface(&mut ui)
    button(&mut ui, "-", false, || Message.Decrement)
    ui.number(self.count)
    button(&mut ui, "+", false, || Message.Increment)
  }

  fn update(self: &mut Self, message: Message, cx: &mut Context<NoCommand>) -> () {
    match move message {
      Message.Increment => {
        self.count = self.count + 1
      }
      Message.Decrement => {
        self.count = self.count - 1
      }
    }
  }
}
`

export const initialModel: Model = {
  settings: {
    code: SAMPLE,
    fileName: 'counter.silk',
    width: 960,
    padding: 64,
    background: '#009689',
    theme: 'Dark',
    showLineNumbers: true,
    showWindow: true,
    scale: 2,
  },
  formatState: FormatState.Idle(),
  areFontsReady: false,
}
