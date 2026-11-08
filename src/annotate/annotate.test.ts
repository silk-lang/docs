import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { type Client, type Json, collect } from './collect'
import { hash } from './hash'
import { isTwoslash, parse, strip } from './markers'

const SOURCE = `fn double(value: i64) -> i64 {
  return value * 2
}
// ---cut---
pub fn main() -> () {
  let answer = double(21)
  //  ^?
  let wrong: bool = answer
}
`

describe('markers', () => {
  test('the cut and the queries are hidden from readers', () => {
    expect(strip(SOURCE)).toBe(
      'pub fn main() -> () {\n  let answer = double(21)\n  let wrong: bool = answer\n}',
    )
  })

  test('a query points at the name above its caret, in checked lines', () => {
    expect(parse(SOURCE).queries).toEqual([{ line: 5, character: 6 }])
  })

  test('checked lines map to shown lines', () => {
    const { shownLines } = parse(SOURCE)
    expect(shownLines[3]).toEqual(Option.none())
    expect(shownLines[4]).toEqual(Option.some(0))
    expect(shownLines[6]).toEqual(Option.none())
    expect(shownLines[7]).toEqual(Option.some(2))
  })

  test('only fences marked twoslash are annotated', () => {
    expect(isTwoslash(Option.some('twoslash'))).toBe(true)
    expect(isTwoslash(Option.some('ignore twoslash'))).toBe(true)
    expect(isTwoslash(Option.some('ignore'))).toBe(false)
    expect(isTwoslash(Option.none())).toBe(false)
  })

  test('the hash changes with the source', () => {
    expect(hash(SOURCE)).toBe(hash(SOURCE))
    expect(hash(SOURCE)).not.toBe(hash(`${SOURCE} `))
  })
})

// A language server that answers what native `silk lsp` answered for SOURCE.
const fakeServer = (): Client => {
  const listeners: Array<
    (notification: Readonly<{ method: string; params: Json }>) => void
  > = []
  return {
    notify: (method, params) => {
      if (method !== 'textDocument/didOpen') {
        return
      }
      const uri =
        typeof params === 'object' &&
        params !== null &&
        'textDocument' in params &&
        typeof params.textDocument === 'object' &&
        params.textDocument !== null &&
        'uri' in params.textDocument
          ? params.textDocument.uri
          : null
      listeners.forEach(listener =>
        listener({
          method: 'textDocument/publishDiagnostics',
          params: {
            uri,
            version: 1,
            diagnostics: [
              {
                range: {
                  start: { line: 7, character: 20 },
                  end: { line: 7, character: 26 },
                },
                severity: 1,
                code: 'SEM0037',
                message: 'Assignment expected bool but received i64',
              },
              {
                range: {
                  start: { line: 7, character: 6 },
                  end: { line: 7, character: 11 },
                },
                severity: 2,
                code: 'SEM0255',
                message: '`wrong` is never used',
              },
            ],
          },
        }),
      )
    },
    onNotification: listener => {
      listeners.push(listener)
    },
    request: method =>
      Promise.resolve(
        method === 'textDocument/hover'
          ? {
              contents: {
                kind: 'markdown',
                value: '```silk\nlet answer: i64\n```',
              },
              range: {
                start: { line: 5, character: 6 },
                end: { line: 5, character: 12 },
              },
            }
          : [{ position: { line: 5, character: 12 }, label: ': i64' }],
      ),
  }
}

describe('collect', () => {
  test('answers in shown lines, with the pinned hover', async () => {
    const annotations = await collect(
      fakeServer(),
      { uri: 'file:///work/main.silk', version: 1 },
      parse(SOURCE),
      {
        hoverEveryName: false,
        includeWarnings: false,
        timeoutMilliseconds: 1000,
      },
    )
    expect(annotations).toEqual({
      diagnostics: [
        {
          line: 2,
          start: 20,
          end: 26,
          severity: 'Error',
          code: 'SEM0037',
          message: 'Assignment expected bool but received i64',
        },
      ],
      hovers: [
        { line: 1, start: 6, end: 12, text: 'let answer: i64', isPinned: true },
      ],
      hints: [{ line: 1, column: 12, label: ': i64' }],
    })
  })
})
