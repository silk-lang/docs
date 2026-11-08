// The snippet image as canvas shapes: a pure function of the settings, so the
// preview and the downloaded PNG are the same pixels. The layout follows the
// "Silk — Counter code image" artboard in Paper.

import { Array, Match, pipe } from 'effect'
import * as Canvas from 'foldkit/canvas'

import { parse } from '../annotate/markers'
import {
  type Annotations,
  type Diagnostic,
  type Hover,
  type InlayHint,
} from '../annotate/model'
import { type Token, type TokenClass, tokenize } from '../code'
import { type Settings, TRANSPARENT, type Theme } from './model'

const FONT_FAMILY = '"JetBrains Mono Variable", ui-monospace, monospace'

const CODE_SIZE = 14
const LINE_HEIGHT = 22
// JetBrains Mono's advance is 600 units of its 1000 unit em.
const CHAR_WIDTH = CODE_SIZE * 0.6
const GUTTER_SIZE = 13
const GUTTER_WIDTH = 28
const GUTTER_GAP = 24
const BODY = { top: 28, bottom: 36, left: 20, right: 40 }
const NO_GUTTER_LEFT = 28
const HEADER_HEIGHT = 52
const RADIUS = 14

type Palette = Readonly<{
  card: string
  divider: string
  dots: string
  title: string
  label: string
  gutter: string
  plain: string
  comment: string
  keyword: string
  operator: string
  type: string
  literal: string
  function: string
  hint: string
  error: string
  errorTint: string
  warning: string
  warningTint: string
  hoverCard: string
  cardBorder: string
}>

const PALETTES: Record<Theme, Palette> = {
  Dark: {
    card: '#0B0B0C',
    divider: '#1F1F22',
    dots: '#2A2A2E',
    title: '#C9C9CC',
    label: '#31C3B4',
    gutter: '#4A4A50',
    plain: '#C9C9CC',
    comment: '#6B6B70',
    keyword: '#31C3B4',
    operator: '#8A8A90',
    type: '#FFFFFF',
    literal: '#E8C996',
    function: '#F3F3F1',
    hint: '#5C5C62',
    error: '#F06A62',
    errorTint: 'rgba(240, 106, 98, 0.12)',
    warning: '#E0B44C',
    warningTint: 'rgba(224, 180, 76, 0.12)',
    hoverCard: '#161618',
    cardBorder: '#2A2A2E',
  },
  Light: {
    card: '#FFFFFF',
    divider: '#E4E4E1',
    dots: '#E4E4E1',
    title: '#2A2A2E',
    label: '#007E71',
    gutter: '#B4B4B9',
    plain: '#2A2A2E',
    comment: '#8A8A90',
    keyword: '#007E71',
    operator: '#6B6B70',
    type: '#0B0B0C',
    literal: '#9A6416',
    function: '#0B0B0C',
    hint: '#A0A0A6',
    error: '#D1342B',
    errorTint: 'rgba(209, 52, 43, 0.08)',
    warning: '#B7791F',
    warningTint: 'rgba(183, 121, 31, 0.1)',
    hoverCard: '#FAFAF9',
    cardBorder: '#E4E4E1',
  },
}

type Style = Readonly<{ color: string; weight: number; isItalic: boolean }>

const tokenStyle = (
  palette: Palette,
  className: TokenClass | undefined,
): Style =>
  Match.value(className).pipe(
    Match.when('comment', () => ({
      color: palette.comment,
      weight: 400,
      isItalic: true,
    })),
    Match.when('keyword', () => ({
      color: palette.keyword,
      weight: 400,
      isItalic: false,
    })),
    Match.when('type', () => ({
      color: palette.type,
      weight: 600,
      isItalic: false,
    })),
    Match.whenOr('number', 'literal', 'string', () => ({
      color: palette.literal,
      weight: 400,
      isItalic: false,
    })),
    Match.when('function', () => ({
      color: palette.function,
      weight: 400,
      isItalic: false,
    })),
    Match.when('operator', () => ({
      color: palette.operator,
      weight: 400,
      isItalic: false,
    })),
    Match.orElse(() => ({
      color: palette.plain,
      weight: 400,
      isItalic: false,
    })),
  )

const font = (size: number, weight: number, isItalic: boolean): string =>
  `${isItalic ? 'italic ' : ''}${weight} ${size}px ${FONT_FAMILY}`

// Every font the image draws with.
export const FONTS: ReadonlyArray<string> = [
  font(12, 400, false),
  font(CODE_SIZE, 400, false),
  font(CODE_SIZE, 400, true),
  font(CODE_SIZE, 600, false),
  font(13, 500, false),
]

// A run of same-styled text within one line, at its column.
type Run = Readonly<{ column: number; text: string; style: Style }>

// The code's lines, each a list of runs. A token can span lines, such as a
// block comment, so tokens are split at line breaks.
const toLines = (
  tokens: ReadonlyArray<Token>,
  palette: Palette,
): ReadonlyArray<ReadonlyArray<Run>> => {
  const lines: Array<Array<Run>> = [[]]
  const columns = { at: 0 }
  tokens.forEach(token => {
    const style = tokenStyle(palette, token.className)
    token.value.split('\n').forEach((piece, index) => {
      if (index > 0) {
        lines.push([])
        columns.at = 0
      }
      if (piece !== '') {
        lines[lines.length - 1]?.push({
          column: columns.at,
          text: piece,
          style,
        })
        columns.at += piece.length
      }
    })
  })
  return lines
}

// JetBrains Mono joins symbols such as `->` and `||` into ligatures, which the
// canvas cannot turn off, so symbols and digits are drawn one at a time while
// words stay whole. Spaces are left out.
const unjoined = (run: Run): ReadonlyArray<Run> =>
  Array.map([...run.text.matchAll(/[A-Za-z_]+|\S/g)], match => ({
    column: run.column + match.index,
    text: match[0],
    style: run.style,
  }))

// What the image draws: the code without its markers, and the annotations
// the settings ask for. Hovers show only where `^?` pins them.
type Drawn = Readonly<{
  lines: ReadonlyArray<string>
  annotations: Annotations
}>

const drawn = (settings: Settings, annotations: Annotations): Drawn => ({
  lines: parse(settings.code).shown.split('\n'),
  annotations: {
    diagnostics: settings.showErrors ? annotations.diagnostics : [],
    hovers: annotations.hovers.filter(hover => hover.isPinned),
    hints: settings.showInlayHints ? annotations.hints : [],
  },
})

// How far the inlay hints before a column push it right, in characters. A
// hint sits before the character at its column.
const hintShift = (
  hints: ReadonlyArray<InlayHint>,
  line: number,
  column: number,
  isInclusive: boolean,
): number =>
  hints
    .filter(
      hint =>
        hint.line === line &&
        (isInclusive ? hint.column <= column : hint.column < column),
    )
    .reduce((sum, hint) => sum + hint.label.length, 0)

const shownColumn = (
  hints: ReadonlyArray<InlayHint>,
  line: number,
  column: number,
): number => column + hintShift(hints, line, column, true)

const codeLeft = (settings: Settings): number =>
  settings.showLineNumbers
    ? BODY.left + GUTTER_WIDTH + GUTTER_GAP
    : NO_GUTTER_LEFT

// How many characters fit on a line at the settings' width.
const columnsThatFit = (settings: Settings): number =>
  Math.max(
    0,
    Math.floor(
      (settings.width -
        2 * settings.padding -
        codeLeft(settings) -
        BODY.right) /
        CHAR_WIDTH,
    ),
  )

const lineWidths = (drawing: Drawn): ReadonlyArray<number> =>
  drawing.lines.map(
    (text, line) =>
      text.length +
      hintShift(
        drawing.annotations.hints,
        line,
        Number.POSITIVE_INFINITY,
        true,
      ),
  )

// The narrowest width that shows every line whole.
export const widthToFit = (
  settings: Settings,
  annotations: Annotations,
): number =>
  Math.ceil(
    2 * settings.padding +
      codeLeft(settings) +
      Math.max(0, ...lineWidths(drawn(settings, annotations))) * CHAR_WIDTH +
      BODY.right,
  )

// The lines too long for the width, which the image cuts off.
export const cutLineCount = (
  settings: Settings,
  annotations: Annotations,
): number => {
  const fit = columnsThatFit(settings)
  return lineWidths(drawn(settings, annotations)).filter(width => width > fit)
    .length
}

const MESSAGE_SIZE = 12
const MESSAGE_CHAR = MESSAGE_SIZE * 0.6
const MESSAGE_LINE = 18
const CARD_LINE = 20
const BOX = { x: 12, y: 7, gap: 6 }

type Row =
  | Readonly<{ kind: 'Code'; line: number }>
  | Readonly<{ kind: 'Hover'; hover: Hover; lines: ReadonlyArray<string> }>
  | Readonly<{
      kind: 'Error'
      diagnostic: Diagnostic
      lines: ReadonlyArray<string>
    }>

// Words onto lines of at most `columns` characters.
const wrap = (text: string, columns: number): ReadonlyArray<string> =>
  text.split(/\s+/).reduce<ReadonlyArray<string>>((lines, word) => {
    const last = lines[lines.length - 1]
    return last === undefined
      ? [word]
      : last.length + 1 + word.length <= columns
        ? [...lines.slice(0, -1), `${last} ${word}`]
        : [...lines, word]
  }, [])

const messageColumns = (settings: Settings): number =>
  Math.max(
    16,
    Math.floor(
      (settings.width -
        2 * settings.padding -
        codeLeft(settings) -
        BODY.right / 2 -
        2 * BOX.x) /
        MESSAGE_CHAR,
    ),
  )

// Each code line, then the pinned hovers and the errors under it.
const rows = (settings: Settings, drawing: Drawn): ReadonlyArray<Row> =>
  drawing.lines.flatMap((_, line): ReadonlyArray<Row> => [
    { kind: 'Code', line },
    ...drawing.annotations.hovers
      .filter(hover => hover.line === line)
      .map((hover): Row => ({
        kind: 'Hover',
        hover,
        lines: hover.text.split('\n'),
      })),
    ...drawing.annotations.diagnostics
      .filter(diagnostic => diagnostic.line === line)
      .map((diagnostic): Row => ({
        kind: 'Error',
        diagnostic,
        lines: wrap(
          `${diagnostic.message}  ${diagnostic.code}`.trim(),
          messageColumns(settings),
        ),
      })),
  ])

const rowHeight = (row: Row): number =>
  row.kind === 'Code'
    ? LINE_HEIGHT
    : row.kind === 'Hover'
      ? 2 * BOX.gap + 2 * BOX.y + row.lines.length * CARD_LINE
      : 2 * BOX.gap + 2 * BOX.y + row.lines.length * MESSAGE_LINE

const cardHeight = (settings: Settings, drawing: Drawn): number =>
  (settings.showWindow ? HEADER_HEIGHT + 1 : 0) +
  BODY.top +
  rows(settings, drawing).reduce((sum, row) => sum + rowHeight(row), 0) +
  BODY.bottom

export const size = (
  settings: Settings,
  annotations: Annotations,
): Readonly<{ width: number; height: number }> => ({
  width: settings.width,
  height:
    cardHeight(settings, drawn(settings, annotations)) + 2 * settings.padding,
})

const roundedRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): ReadonlyArray<Canvas.PathInstruction> => {
  const r = Math.min(radius, width / 2, height / 2)
  return [
    Canvas.MoveTo({ x: x + r, y }),
    Canvas.LineTo({ x: x + width - r, y }),
    Canvas.QuadTo({ cpx: x + width, cpy: y, x: x + width, y: y + r }),
    Canvas.LineTo({ x: x + width, y: y + height - r }),
    Canvas.QuadTo({
      cpx: x + width,
      cpy: y + height,
      x: x + width - r,
      y: y + height,
    }),
    Canvas.LineTo({ x: x + r, y: y + height }),
    Canvas.QuadTo({ cpx: x, cpy: y + height, x, y: y + height - r }),
    Canvas.LineTo({ x, y: y + r }),
    Canvas.QuadTo({ cpx: x, cpy: y, x: x + r, y }),
    Canvas.Close(),
  ]
}

// A soft shadow under the card: rounded rects that grow and fade.
const shadow = (
  x: number,
  y: number,
  width: number,
  height: number,
): ReadonlyArray<Canvas.Shape> =>
  Array.makeBy(8, index => {
    const spread = 2 + index * 4
    return Canvas.Path({
      instructions: roundedRect(
        x - spread,
        y - spread + 18,
        width + 2 * spread,
        height + 2 * spread,
        RADIUS + spread,
      ),
      fill: 'rgba(0, 0, 0, 0.035)',
    })
  })

// Letters drawn one by one, since canvas text has no letter spacing here.
const spacedText = (
  text: string,
  right: number,
  y: number,
  fontSize: number,
  spacing: number,
  color: string,
): ReadonlyArray<Canvas.Shape> => {
  const advance = fontSize * 0.6 + spacing
  const left = right - text.length * advance + spacing
  return Array.map([...text], (letter, index) =>
    Canvas.Text({
      x: left + index * advance,
      y,
      content: letter,
      font: font(fontSize, 500, false),
      fill: color,
      baseline: 'Middle',
    }),
  )
}

const header = (
  settings: Settings,
  palette: Palette,
  x: number,
  y: number,
  width: number,
): ReadonlyArray<Canvas.Shape> => [
  ...Array.makeBy(3, index =>
    Canvas.Circle({
      x: x + 24 + 6 + index * 20,
      y: y + HEADER_HEIGHT / 2,
      radius: 6,
      fill: palette.dots,
    }),
  ),
  Canvas.Text({
    x: x + width / 2,
    y: y + HEADER_HEIGHT / 2,
    content: settings.fileName,
    font: font(13, 500, false),
    fill: palette.title,
    align: 'Center',
    baseline: 'Middle',
  }),
  ...spacedText(
    'SILK',
    x + width - 24,
    y + HEADER_HEIGHT / 2,
    11,
    11 * 0.12,
    palette.label,
  ),
  Canvas.Rect({
    x,
    y: y + HEADER_HEIGHT,
    width,
    height: 1,
    fill: palette.divider,
  }),
]

// A wavy line under `x0..x1`, as editors draw errors.
const squiggle = (
  x0: number,
  x1: number,
  y: number,
  color: string,
): Canvas.Shape => {
  const steps = Math.max(2, Math.round((x1 - x0) / 2))
  return Canvas.Path({
    instructions: [
      Canvas.MoveTo({ x: x0, y }),
      ...Array.makeBy(steps, index =>
        Canvas.LineTo({
          x: x0 + ((index + 1) * (x1 - x0)) / steps,
          y: y + (index % 2 === 0 ? 1.5 : -1.5),
        }),
      ),
    ],
    stroke: color,
    lineWidth: 1.2,
    lineCap: 'Round',
    lineJoin: 'Round',
  })
}

const codeText = (
  runs: ReadonlyArray<Run>,
  left: number,
  middle: number,
  columnOf: (column: number) => number,
  fit: number,
): ReadonlyArray<Canvas.Shape> =>
  pipe(
    runs,
    Array.flatMap(unjoined),
    Array.filter(run => columnOf(run.column) < fit),
    Array.map(run =>
      Canvas.Text({
        x: left + columnOf(run.column) * CHAR_WIDTH,
        y: middle,
        content: run.text.slice(0, fit - columnOf(run.column)),
        font: font(CODE_SIZE, run.style.weight, run.style.isItalic),
        fill: run.style.color,
        align: 'Left',
        baseline: 'Middle',
      }),
    ),
  )

const codeRow = (
  settings: Settings,
  palette: Palette,
  drawing: Drawn,
  runs: ReadonlyArray<Run>,
  line: number,
  x: number,
  top: number,
): ReadonlyArray<Canvas.Shape> => {
  const fit = columnsThatFit(settings)
  const left = x + codeLeft(settings)
  const middle = top + LINE_HEIGHT / 2
  const { hints, diagnostics } = drawing.annotations
  const columnOf = (column: number): number => shownColumn(hints, line, column)
  const number = settings.showLineNumbers
    ? [
        Canvas.Text({
          x: x + BODY.left + GUTTER_WIDTH,
          y: middle,
          content: `${line + 1}`,
          font: font(GUTTER_SIZE, 400, false),
          fill: palette.gutter,
          align: 'Right',
          baseline: 'Middle',
        }),
      ]
    : []
  const hintTexts = hints
    .filter(hint => hint.line === line)
    .map(hint => ({
      column: hint.column + hintShift(hints, line, hint.column, false),
      label: hint.label,
    }))
    .filter(hint => hint.column < fit)
    .map(hint =>
      Canvas.Text({
        x: left + hint.column * CHAR_WIDTH,
        y: middle,
        content: hint.label.slice(0, fit - hint.column),
        font: font(CODE_SIZE, 400, true),
        fill: palette.hint,
        align: 'Left',
        baseline: 'Middle',
      }),
    )
  const squiggles = diagnostics
    .filter(diagnostic => diagnostic.line === line)
    .map(diagnostic =>
      squiggle(
        left + columnOf(diagnostic.start) * CHAR_WIDTH,
        left + Math.min(fit, columnOf(diagnostic.end)) * CHAR_WIDTH,
        middle + 9,
        diagnostic.severity === 'Error' ? palette.error : palette.warning,
      ),
    )
  return [
    ...number,
    ...codeText(runs, left, middle, columnOf, fit),
    ...hintTexts,
    ...squiggles,
  ]
}

// A pinned hover: a card under its name, with a caret pointing up at it.
const hoverRow = (
  settings: Settings,
  palette: Palette,
  drawing: Drawn,
  row: Readonly<{ hover: Hover; lines: ReadonlyArray<string> }>,
  x: number,
  cardWidth: number,
  top: number,
): ReadonlyArray<Canvas.Shape> => {
  const left = x + codeLeft(settings)
  const anchor =
    left +
    shownColumn(drawing.annotations.hints, row.hover.line, row.hover.start) *
      CHAR_WIDTH
  const width =
    Math.max(...row.lines.map(text => text.length)) * CHAR_WIDTH + 2 * BOX.x
  const right = x + cardWidth - BODY.right / 2
  const boxX = Math.max(left - BOX.x, Math.min(anchor - BOX.x, right - width))
  const boxY = top + BOX.gap
  const height = 2 * BOX.y + row.lines.length * CARD_LINE
  const caret = anchor + CHAR_WIDTH
  const text = toLines(tokenize(row.lines.join('\n'), 'silk'), palette)
  return [
    Canvas.Path({
      instructions: roundedRect(boxX, boxY, width, height, 6),
      fill: palette.hoverCard,
      stroke: palette.cardBorder,
      lineWidth: 1,
    }),
    Canvas.Path({
      instructions: [
        Canvas.MoveTo({ x: caret - 5, y: boxY + 0.5 }),
        Canvas.LineTo({ x: caret, y: boxY - 4.5 }),
        Canvas.LineTo({ x: caret + 5, y: boxY + 0.5 }),
      ],
      fill: palette.hoverCard,
      stroke: palette.cardBorder,
      lineWidth: 1,
    }),
    ...text.flatMap((runs, index) =>
      codeText(
        runs,
        boxX + BOX.x,
        boxY + BOX.y + index * CARD_LINE + CARD_LINE / 2,
        column => column,
        Number.POSITIVE_INFINITY,
      ),
    ),
  ]
}

// An error's message in a tinted box under its line.
const errorRow = (
  settings: Settings,
  palette: Palette,
  row: Readonly<{ diagnostic: Diagnostic; lines: ReadonlyArray<string> }>,
  x: number,
  cardWidth: number,
  top: number,
): ReadonlyArray<Canvas.Shape> => {
  const left = x + codeLeft(settings) - BOX.x
  const width = x + cardWidth - BODY.right / 2 - left
  const boxY = top + BOX.gap
  const height = 2 * BOX.y + row.lines.length * MESSAGE_LINE
  const isError = row.diagnostic.severity === 'Error'
  return [
    Canvas.Rect({
      x: left,
      y: boxY,
      width,
      height,
      fill: isError ? palette.errorTint : palette.warningTint,
    }),
    Canvas.Rect({
      x: left,
      y: boxY,
      width: 2,
      height,
      fill: isError ? palette.error : palette.warning,
    }),
    ...row.lines.map((text, index) =>
      Canvas.Text({
        x: left + BOX.x,
        y: boxY + BOX.y + index * MESSAGE_LINE + MESSAGE_LINE / 2,
        content: text,
        font: font(MESSAGE_SIZE, 400, false),
        fill: palette.plain,
        align: 'Left',
        baseline: 'Middle',
      }),
    ),
  ]
}

const body = (
  settings: Settings,
  palette: Palette,
  drawing: Drawn,
  x: number,
  cardWidth: number,
  y: number,
): ReadonlyArray<Canvas.Shape> => {
  const code = toLines(tokenize(drawing.lines.join('\n'), 'silk'), palette)
  const laidOut = rows(settings, drawing).reduce<
    Readonly<{ top: number; shapes: ReadonlyArray<Canvas.Shape> }>
  >(
    ({ top, shapes }, row) => ({
      top: top + rowHeight(row),
      shapes: [
        ...shapes,
        ...(row.kind === 'Code'
          ? codeRow(
              settings,
              palette,
              drawing,
              code[row.line] ?? [],
              row.line,
              x,
              top,
            )
          : row.kind === 'Hover'
            ? hoverRow(settings, palette, drawing, row, x, cardWidth, top)
            : errorRow(settings, palette, row, x, cardWidth, top)),
      ],
    }),
    { top: y + BODY.top, shapes: [] },
  )
  return laidOut.shapes
}

// The whole image at 1x, scaled by `settings.scale`.
export const scene = (
  settings: Settings,
  annotations: Annotations,
): Readonly<{
  width: number
  height: number
  shapes: ReadonlyArray<Canvas.Shape>
}> => {
  const palette = PALETTES[settings.theme]
  const drawing = drawn(settings, annotations)
  const { width, height } = size(settings, annotations)
  const cardX = settings.padding
  const cardY = settings.padding
  const cardWidth = width - 2 * settings.padding
  const cardTall = cardHeight(settings, drawing)
  const hasBackground = settings.background !== TRANSPARENT
  const bodyY = cardY + (settings.showWindow ? HEADER_HEIGHT + 1 : 0)
  const shapes: ReadonlyArray<Canvas.Shape> = [
    ...(hasBackground
      ? [Canvas.Rect({ x: 0, y: 0, width, height, fill: settings.background })]
      : []),
    ...(hasBackground && settings.padding > 0
      ? shadow(cardX, cardY, cardWidth, cardTall)
      : []),
    Canvas.Path({
      instructions: roundedRect(cardX, cardY, cardWidth, cardTall, RADIUS),
      fill: palette.card,
    }),
    ...(settings.showWindow
      ? header(settings, palette, cardX, cardY, cardWidth)
      : []),
    ...body(settings, palette, drawing, cardX, cardWidth, bodyY),
  ]
  return {
    width: width * settings.scale,
    height: height * settings.scale,
    shapes: [
      Canvas.Group({
        shapes,
        scale: { x: settings.scale, y: settings.scale },
      }),
    ],
  }
}
