// Asks a Silk language server about a parsed source and answers what it said,
// in shown lines. The page passes its browser language server; the annotate
// script passes `silk lsp` over standard input and output.

import { Array, Option, pipe } from 'effect'

import { type Parsed, type Position } from './markers.ts'
import {
  type Annotations,
  type Diagnostic,
  type Hover,
  type InlayHint,
} from './model.ts'

export type Json =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<Json>
  | { readonly [key: string]: Json }

export type Client = Readonly<{
  request: (method: string, params: Json) => Promise<unknown>
  notify: (method: string, params: Json) => void
  onNotification: (
    listener: (
      notification: Readonly<{ method: string; params: Json }>,
    ) => void,
  ) => void
}>

export type Document = Readonly<{
  uri: string
  // 1 opens the document; later versions replace its text.
  version: number
}>

export type Options = Readonly<{
  // Hovers for every name, for pages that show one under the pointer. A
  // picture only shows the pinned ones.
  hoverEveryName: boolean
  includeWarnings: boolean
  timeoutMilliseconds: number
}>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' &&
  value !== null &&
  !globalThis.Array.isArray(value)

const numberAt = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): number => (typeof record[key] === 'number' ? record[key] : 0)

const positionOf = (value: unknown): Position | undefined =>
  isRecord(value)
    ? { line: numberAt(value, 'line'), character: numberAt(value, 'character') }
    : undefined

type Range = Readonly<{ start: Position; end: Position }>

const rangeOf = (value: unknown): Range | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  const start = positionOf(value['start'])
  const end = positionOf(value['end'])
  return start === undefined || end === undefined ? undefined : { start, end }
}

const shownLine = (parsed: Parsed, line: number): Option.Option<number> =>
  pipe(Array.get(parsed.shownLines, line), Option.flatten)

const lineLength = (parsed: Parsed, line: number): number =>
  parsed.checked.split('\n')[line]?.length ?? 0

// A diagnostic that spans lines underlines the rest of its first line.
const toDiagnostic =
  (parsed: Parsed, includeWarnings: boolean) =>
  (value: unknown): ReadonlyArray<Diagnostic> => {
    if (!isRecord(value)) {
      return []
    }
    const range = rangeOf(value['range'])
    const severity =
      value['severity'] === 1
        ? 'Error'
        : value['severity'] === 2
          ? 'Warning'
          : undefined
    if (range === undefined || severity === undefined) {
      return []
    }
    if (severity === 'Warning' && !includeWarnings) {
      return []
    }
    return pipe(
      shownLine(parsed, range.start.line),
      Option.match({
        onNone: () => [],
        onSome: line => [
          {
            line,
            start: range.start.character,
            end:
              range.end.line === range.start.line
                ? Math.max(range.end.character, range.start.character + 1)
                : Math.max(
                    lineLength(parsed, range.start.line),
                    range.start.character + 1,
                  ),
            severity,
            code: typeof value['code'] === 'string' ? value['code'] : '',
            message:
              typeof value['message'] === 'string' ? value['message'] : '',
          },
        ],
      }),
    )
  }

// The code in a hover's markdown: the first fenced block, or all of it.
const hoverText = (contents: unknown): string => {
  const markdown = isRecord(contents)
    ? typeof contents['value'] === 'string'
      ? contents['value']
      : ''
    : typeof contents === 'string'
      ? contents
      : ''
  const fenced = /```[a-z]*\n([\s\S]*?)\n```/.exec(markdown)
  return (fenced?.[1] ?? markdown).trim()
}

const NO_HOVERS: ReadonlyArray<Hover> = []

const NAME = /[A-Za-z_][A-Za-z0-9_]*/g

// The start of every name on the shown lines, leaving out comments.
const namePositions = (parsed: Parsed): ReadonlyArray<Position> =>
  pipe(
    parsed.checked.split('\n'),
    Array.flatMap((text, line) => {
      if (Option.isNone(shownLine(parsed, line))) {
        return []
      }
      const comment = text.indexOf('//')
      const code = comment === -1 ? text : text.slice(0, comment)
      return Array.map([...code.matchAll(NAME)], match => ({
        line,
        character: match.index,
      }))
    }),
  )

const waitForDiagnostics = (
  client: Client,
  { uri, version }: Document,
  timeoutMilliseconds: number,
): Promise<ReadonlyArray<unknown>> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('The language server sent no diagnostics.')),
      timeoutMilliseconds,
    )
    const state = { isDone: false }
    client.onNotification(({ method, params }) => {
      if (
        state.isDone ||
        method !== 'textDocument/publishDiagnostics' ||
        !isRecord(params) ||
        params['uri'] !== uri ||
        // Diagnostics for an earlier text can still be on their way.
        (typeof params['version'] === 'number' && params['version'] !== version)
      ) {
        return
      }
      state.isDone = true
      clearTimeout(timer)
      const diagnostics = params['diagnostics']
      resolve(globalThis.Array.isArray(diagnostics) ? diagnostics : [])
    })
  })

export const collect = async (
  client: Client,
  document: Document,
  parsed: Parsed,
  options: Options,
): Promise<Annotations> => {
  const diagnosticsArrived = waitForDiagnostics(
    client,
    document,
    options.timeoutMilliseconds,
  )
  if (document.version === 1) {
    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: document.uri,
        languageId: 'silk',
        version: 1,
        text: parsed.checked,
      },
    })
  } else {
    client.notify('textDocument/didChange', {
      textDocument: { uri: document.uri, version: document.version },
      contentChanges: [{ text: parsed.checked }],
    })
  }
  const rawDiagnostics = await diagnosticsArrived
  const textDocument = { uri: document.uri }

  const pinned = new Set(
    parsed.queries.map(({ line, character }) => `${line}:${character}`),
  )
  const positions = options.hoverEveryName
    ? [...parsed.queries, ...namePositions(parsed)]
    : parsed.queries
  const hoverResults = await Promise.all(
    positions.map(position =>
      client
        .request('textDocument/hover', { textDocument, position })
        .then(result => ({ position, result }))
        .catch(() => ({ position, result: null })),
    ),
  )
  const hovers = pipe(
    hoverResults,
    Array.flatMap(({ position, result }): ReadonlyArray<Hover> => {
      if (!isRecord(result)) {
        return []
      }
      const text = hoverText(result['contents'])
      const range = rangeOf(result['range']) ?? {
        start: position,
        end: { line: position.line, character: position.character + 1 },
      }
      return pipe(
        shownLine(parsed, range.start.line),
        Option.filter(() => text !== '' && range.start.line === range.end.line),
        Option.match({
          onNone: () => [],
          onSome: line => [
            {
              line,
              start: range.start.character,
              end: range.end.character,
              text,
              isPinned: pinned.has(`${position.line}:${position.character}`),
            },
          ],
        }),
      )
    }),
    // One hover per name; a pinned one wins.
    Array.reduce(NO_HOVERS, (kept, hover) => {
      const same = kept.findIndex(
        other => other.line === hover.line && other.start === hover.start,
      )
      if (same === -1) {
        return [...kept, hover]
      }
      return hover.isPinned
        ? kept.map((other, index) => (index === same ? hover : other))
        : kept
    }),
  )

  const lineCount = parsed.checked.split('\n').length
  const rawHints = await client
    .request('textDocument/inlayHint', {
      textDocument,
      range: {
        start: { line: 0, character: 0 },
        end: { line: lineCount, character: 0 },
      },
    })
    .catch(() => [])
  const hints = pipe(
    globalThis.Array.isArray(rawHints) ? rawHints : [],
    Array.flatMap((value: unknown): ReadonlyArray<InlayHint> => {
      if (!isRecord(value)) {
        return []
      }
      const position = positionOf(value['position'])
      const label = value['label']
      const text =
        typeof label === 'string'
          ? label
          : globalThis.Array.isArray(label)
            ? label
                .map(part =>
                  isRecord(part) && typeof part['value'] === 'string'
                    ? part['value']
                    : '',
                )
                .join('')
            : ''
      if (position === undefined || text === '') {
        return []
      }
      return pipe(
        shownLine(parsed, position.line),
        Option.match({
          onNone: () => [],
          onSome: line => [{ line, column: position.character, label: text }],
        }),
      )
    }),
  )

  return {
    diagnostics: Array.flatMap(
      rawDiagnostics,
      toDiagnostic(parsed, options.includeWarnings),
    ),
    hovers,
    hints,
  }
}
