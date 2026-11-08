// Twoslash-style markers in Silk code. The language server checks the whole
// source; readers see it without the marker lines and without what comes
// before a cut.
//
//   let answer = double(21)
//   //  ^?          pins the hover of the name above the caret
//   // ---cut---    hides every line up to and including this one
//   // ---cut-after---  hides this line and every line after it

import { Array, Option, pipe } from 'effect'

const CUT = /^\s*\/\/\s*---cut---\s*$/
const CUT_AFTER = /^\s*\/\/\s*---cut-after---\s*$/
const QUERY = /^\s*\/\/\s*\^\?\s*$/

// A position in the checked source, in lines and UTF-16 columns from 0, as
// the language server counts them.
export type Position = Readonly<{ line: number; character: number }>

export type Parsed = Readonly<{
  // What the language server checks: the source with tabs as two spaces.
  checked: string
  // What readers see.
  shown: string
  // Hovers to pin, at the name above each `^?`.
  queries: ReadonlyArray<Position>
  // The shown line of each checked line, none for hidden ones.
  shownLines: ReadonlyArray<Option.Option<number>>
}>

const normalize = (source: string): string =>
  source.replaceAll('\r\n', '\n').replaceAll('\t', '  ').replace(/\n+$/, '')

export const parse = (source: string): Parsed => {
  const lines = normalize(source).split('\n')
  const cut = lines.findIndex(line => CUT.test(line))
  const foundCutAfter = lines.findIndex(line => CUT_AFTER.test(line))
  const cutAfter = foundCutAfter === -1 ? lines.length : foundCutAfter
  const isHidden = (line: string, index: number): boolean =>
    index <= cut || index >= cutAfter || QUERY.test(line)
  const shownIndexes = pipe(
    lines,
    Array.map((line, index) => ({ line, index })),
    Array.filter(({ line, index }) => !isHidden(line, index)),
    Array.map(({ index }) => index),
  )
  const shownLines = Array.map(lines, (_, index) =>
    Array.findFirstIndex(shownIndexes, shown => shown === index),
  )
  const queries = pipe(
    lines,
    Array.flatMap((line, index) => {
      if (!QUERY.test(line) || index <= cut || index >= cutAfter) {
        return []
      }
      // The name is on the closest shown line above the marker.
      return pipe(
        Array.findLast(shownIndexes, shown => shown < index),
        Option.match({
          onNone: () => [],
          onSome: target => [{ line: target, character: line.indexOf('^') }],
        }),
      )
    }),
  )
  return {
    checked: lines.join('\n'),
    shown: Array.map(shownIndexes, index => lines[index] ?? '').join('\n'),
    queries,
    shownLines,
  }
}

// The code readers see, for copying and for text exports.
export const strip = (source: string): string => parse(source).shown

// Whether a fence's info string after the language asks for annotations.
export const isTwoslash = (maybeMeta: Option.Option<string>): boolean =>
  Option.exists(maybeMeta, meta => meta.split(/\s+/).includes('twoslash'))

// Markdown with every ```silk twoslash fence turned back into plain ```silk
// and its markers removed, for exports such as llms.txt.
export const stripTwoslashFences = (markdown: string): string =>
  markdown.replace(
    /^(\s*)```silk([^\n]*\btwoslash\b[^\n]*)\n([\s\S]*?)\n\1```/gm,
    (_, indent: string, meta: string, body: string) => {
      const rest = meta.replace(/\s*\btwoslash\b/, '')
      const shown = strip(body)
      return `${indent}\`\`\`silk${rest}\n${shown}\n${indent}\`\`\``
    },
  )
