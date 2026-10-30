// A Vite plugin that renders the Open Graph image for every page: the Silk
// wordmark, the page's section and its title, set in Space Mono on the dark
// brand tile. The build writes them to og/ in the site output, and the dev
// server renders them on request so they can be previewed at /og/....
//
// resvg reads TrueType but not WOFF2, so scripts/og/ carries TrueType copies
// of the site's Space Mono (SIL Open Font License, scripts/og/OFL.txt).

import { resolve } from 'node:path'
import { type Plugin } from 'vite'

import { Resvg } from '@resvg/resvg-js'

import { groups } from '../src/docs/catalog.ts'
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  type OgCard,
  docsCard,
  homeCard,
  pageCard,
  releasesCard,
} from '../src/og.ts'

const FONT_DIR = resolve(import.meta.dirname, 'og')
const FONT_FILES = [
  resolve(FONT_DIR, 'SpaceMono-Regular.ttf'),
  resolve(FONT_DIR, 'SpaceMono-Bold.ttf'),
]

// The brand tile and ink from public/brand/silk-favicon.svg, and the dark
// theme's muted, rule and signal tokens from src/styles.css.
const TILE = '#15130F'
const INK = '#F3EFE6'
const MUTED = '#9c9993'
const RULE = '#42403d'
const SIGNAL = '#e8443f'

// public/brand/silk-wordmark.svg, drawn in a 26.2014 x 14.6 box above y = 0.
const WORDMARK_PATH =
  'M17.6000 -14.6000L20.0000 -14.6000L20.0000 -7.5111C20.0000 -7.0693 20.3582 -6.7111 20.8000 -6.7111C20.9937 -6.7111 21.1713 -6.7799 21.3097 -6.8945L21.3097 -6.8945L21.5557 -7.1009C21.9469 -7.4337 22.2083 -7.9145 22.2534 -8.4568C22.3084 -9.3183 23.0246 -10.0000 23.9000 -10.0000C24.8113 -10.0000 25.5500 -9.2613 25.5500 -8.3500C25.5500 -7.8382 25.3170 -7.3809 24.9513 -7.0783L22.4027 -4.9397C22.2302 -4.7929 22.1208 -4.5743 22.1208 -4.3301C22.1208 -4.1065 22.2126 -3.9042 22.3606 -3.7591L22.3610 -3.7587L26.2014 0.0000L22.5986 0.0000L21.3588 -1.2135C21.2146 -1.3542 21.0174 -1.4410 20.8000 -1.4410C20.3582 -1.4410 20.0000 -1.0828 20.0000 -0.6410L20.0000 0.0000L17.6000 0.0000ZM3.2532 -6.0112C2.5590 -6.2060 2.0500 -6.8436 2.0500 -7.6000C2.0500 -8.5113 2.7887 -9.2500 3.7000 -9.2500C4.3514 -9.2500 4.9147 -8.8725 5.1829 -8.3243C5.4234 -7.8801 5.8271 -7.5372 6.3137 -7.3761L7.3834 -7.0490L7.3834 -7.0490C7.4523 -7.0297 7.5249 -7.0193 7.6000 -7.0193C8.0418 -7.0193 8.4000 -7.3775 8.4000 -7.8193L8.4000 -10.0000L10.8000 -10.0000L10.8000 0.0000L8.4000 0.0000L8.4000 -2.3658C8.4000 -3.6044 7.5958 -4.6552 6.4810 -5.0244ZM13.0000 -14.6000L15.4000 -14.6000L15.4000 0.0000L13.0000 0.0000ZM2.1145 -2.5514L1.8033 -2.6772C1.6496 -2.7352 1.4830 -2.7669 1.3090 -2.7669L1.3043 -2.7669L1.3000 -2.7669C0.5820 -2.7669 0.0000 -3.3489 0.0000 -4.0669C0.0000 -4.7849 0.5820 -5.3669 1.3000 -5.3669C1.6524 -5.3669 1.9720 -5.2267 2.2062 -4.9990L2.2074 -4.9978C2.3286 -4.8802 2.4710 -4.7844 2.6283 -4.7166L5.2825 -3.6442C5.9063 -3.4088 6.3500 -2.8062 6.3500 -2.1000C6.3500 -1.1887 5.6113 -0.4500 4.7000 -0.4500C3.9959 -0.4500 3.3948 -0.8910 3.1579 -1.5119C2.9552 -1.9772 2.5807 -2.3504 2.1145 -2.5514ZM10.9000 -12.7000C10.9000 -11.9820 10.3180 -11.4000 9.6000 -11.4000C8.8820 -11.4000 8.3000 -11.9820 8.3000 -12.7000C8.3000 -13.4180 8.8820 -14.0000 9.6000 -14.0000C10.3180 -14.0000 10.9000 -13.4180 10.9000 -12.7000Z'
const WORDMARK_HEIGHT = 14.6

const MARGIN = 80
const TEXT_WIDTH = OG_IMAGE_WIDTH - 2 * MARGIN

// Space Mono is monospaced: every glyph advances 612/1000 of the font size.
const ADVANCE = 0.612
const TITLE_TRACKING = -0.03
const LABEL_TRACKING = 0.1

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Words break after spaces, and module paths such as
// silk.system.monotonic_clock_native after their dots, or after their
// underscores when a segment is still too long for a line.
const BREAKS: ReadonlyArray<RegExp> = [
  /[^ .]+[ .]*|[ .]+/g,
  /[^ ._]+[ ._]*|[ ._]+/g,
]

const wrapAt = (
  text: string,
  breaks: RegExp,
  maxColumns: number,
): ReadonlyArray<string> | undefined => {
  const lines: Array<string> = []
  let line = ''
  for (const token of text.match(breaks) ?? []) {
    if ((line + token).trimEnd().length <= maxColumns) {
      line += token
    } else if (token.trimEnd().length > maxColumns) {
      return undefined
    } else {
      lines.push(line.trimEnd())
      line = token
    }
  }
  lines.push(line.trimEnd())
  return lines
}

const wrap = (
  text: string,
  maxColumns: number,
): ReadonlyArray<string> | undefined =>
  BREAKS.map(breaks => wrapAt(text, breaks, maxColumns)).find(
    lines => lines !== undefined,
  )

type TitleLayout = Readonly<{ size: number; lines: ReadonlyArray<string> }>

// The largest size that sets the title in at most three lines (two at the
// largest sizes, so short titles stay bold and headline-like).
const layoutTitle = (title: string): TitleLayout => {
  const sizes: ReadonlyArray<readonly [number, number]> = [
    [104, 2],
    [88, 2],
    [76, 3],
    [64, 3],
    [56, 3],
  ]
  for (const [size, maxLines] of sizes) {
    const columns = Math.floor(TEXT_WIDTH / (size * (ADVANCE + TITLE_TRACKING)))
    const lines = wrap(title, columns)
    if (lines !== undefined && lines.length <= maxLines) {
      return { size, lines }
    }
  }
  return { size: 48, lines: wrap(title, 36) ?? [title] }
}

export const ogImageSvg = (card: OgCard): string => {
  const wordmarkScale = 64 / WORDMARK_HEIGHT
  const wordmark = `<path transform="translate(${MARGIN} ${MARGIN + 64}) scale(${wordmarkScale})" d="${WORDMARK_PATH}" fill="${INK}"/>`

  const { size, lines } = layoutTitle(card.title)
  const lineHeight = size * 1.1
  // The title's last baseline sits a fixed distance above the footer rule.
  const lastBaseline = 462
  const title = lines
    .map(
      (line, index) =>
        `<text x="${MARGIN}" y="${(lastBaseline - (lines.length - 1 - index) * lineHeight).toFixed(1)}" font-family="Space Mono" font-weight="700" font-size="${size}" letter-spacing="${(size * TITLE_TRACKING).toFixed(2)}" fill="${INK}">${escapeXml(line)}</text>`,
    )
    .join('')

  const labelY = lastBaseline - (lines.length - 1) * lineHeight - size - 28
  const label =
    card.label === ''
      ? ''
      : `<rect x="${MARGIN}" y="${labelY - 17}" width="16" height="16" fill="${SIGNAL}"/><text x="${MARGIN + 32}" y="${labelY}" font-family="Space Mono" font-weight="700" font-size="24" letter-spacing="${24 * LABEL_TRACKING}" fill="${MUTED}">${escapeXml(card.label.toUpperCase())}</text>`

  const footerY = 558
  const footer = [
    `<rect x="${MARGIN}" y="${footerY - 46}" width="${TEXT_WIDTH}" height="2" fill="${RULE}"/>`,
    `<text x="${MARGIN}" y="${footerY}" font-family="Space Mono" font-size="24" fill="${MUTED}">${escapeXml(card.footer)}</text>`,
  ].join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}">`,
    `<rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="${TILE}"/>`,
    wordmark,
    label,
    title,
    footer,
    '</svg>',
  ].join('')
}

export const renderOgImage = (card: OgCard): Buffer =>
  new Resvg(ogImageSvg(card), {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: 'Space Mono',
    },
  })
    .render()
    .asPng()

export const allCards = (): ReadonlyArray<OgCard> => [
  homeCard,
  docsCard,
  releasesCard,
  ...groups.flatMap(group =>
    group.pages.map(page => pageCard(page, group.title)),
  ),
]

export const ogImages = (): Plugin => ({
  name: 'silk-og-images',
  configureServer: server => {
    server.middlewares.use((request, response, next) => {
      const card = allCards().find(
        candidate => candidate.path === request.url?.split('?')[0],
      )
      if (card === undefined) {
        next()
        return
      }
      response.setHeader('Content-Type', 'image/png')
      response.end(renderOgImage(card))
    })
  },
  generateBundle: function () {
    if (this.environment.name !== 'client') {
      return
    }
    for (const card of allCards()) {
      this.emitFile({
        type: 'asset',
        fileName: card.path.slice(1),
        source: renderOgImage(card),
      })
    }
  },
})
