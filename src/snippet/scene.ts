// The snippet image as canvas shapes: a pure function of the settings, so the
// preview and the downloaded PNG are the same pixels. The layout follows the
// "Silk — Counter code image" artboard in Paper.

import { Array, Match, pipe } from 'effect'
import * as Canvas from 'foldkit/canvas'

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
const TAB = '  '

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

const normalize = (code: string): string =>
  code.replaceAll('\r\n', '\n').replaceAll('\t', TAB).replace(/\n+$/, '')

const lineCount = (code: string): number => normalize(code).split('\n').length

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

const longestLine = (code: string): number =>
  Math.max(
    0,
    ...normalize(code)
      .split('\n')
      .map(line => line.length),
  )

// The narrowest width that shows every line whole.
export const widthToFit = (settings: Settings): number =>
  Math.ceil(
    2 * settings.padding +
      codeLeft(settings) +
      longestLine(settings.code) * CHAR_WIDTH +
      BODY.right,
  )

// The lines too long for the width, which the image cuts off.
export const cutLineCount = (settings: Settings): number => {
  const fit = columnsThatFit(settings)
  return normalize(settings.code)
    .split('\n')
    .filter(line => line.length > fit).length
}

const cardHeight = (settings: Settings): number =>
  (settings.showWindow ? HEADER_HEIGHT + 1 : 0) +
  BODY.top +
  lineCount(settings.code) * LINE_HEIGHT +
  BODY.bottom

export const size = (
  settings: Settings,
): Readonly<{ width: number; height: number }> => ({
  width: settings.width,
  height: cardHeight(settings) + 2 * settings.padding,
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

const body = (
  settings: Settings,
  palette: Palette,
  x: number,
  y: number,
): ReadonlyArray<Canvas.Shape> => {
  const fit = columnsThatFit(settings)
  const lines = toLines(tokenize(normalize(settings.code), 'silk'), palette)
  const left = x + codeLeft(settings)
  return Array.flatMap(lines, (runs, index) => {
    const middle = y + BODY.top + index * LINE_HEIGHT + LINE_HEIGHT / 2
    const number = settings.showLineNumbers
      ? [
          Canvas.Text({
            x: x + BODY.left + GUTTER_WIDTH,
            y: middle,
            content: `${index + 1}`,
            font: font(GUTTER_SIZE, 400, false),
            fill: palette.gutter,
            align: 'Right',
            baseline: 'Middle',
          }),
        ]
      : []
    const code = pipe(
      runs,
      Array.filter(run => run.column < fit),
      Array.flatMap(run =>
        unjoined({ ...run, text: run.text.slice(0, fit - run.column) }),
      ),
      Array.map(run =>
        Canvas.Text({
          x: left + run.column * CHAR_WIDTH,
          y: middle,
          content: run.text,
          font: font(CODE_SIZE, run.style.weight, run.style.isItalic),
          fill: run.style.color,
          align: 'Left',
          baseline: 'Middle',
        }),
      ),
    )
    return [...number, ...code]
  })
}

// The whole image at 1x, scaled by `settings.scale`.
export const scene = (
  settings: Settings,
): Readonly<{
  width: number
  height: number
  shapes: ReadonlyArray<Canvas.Shape>
}> => {
  const palette = PALETTES[settings.theme]
  const { width, height } = size(settings)
  const cardX = settings.padding
  const cardY = settings.padding
  const cardWidth = width - 2 * settings.padding
  const cardTall = cardHeight(settings)
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
    ...body(settings, palette, cardX, bodyY),
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
