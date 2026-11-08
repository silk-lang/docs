import { Array, Match, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { silk } from 'silk-lang/tanstack'

import { createHighlighter } from '@tanstack/highlight/core'
import { json } from '@tanstack/highlight/languages/json'
import { shell } from '@tanstack/highlight/languages/shell'
import { toml } from '@tanstack/highlight/languages/toml'

import { type Annotations, type Diagnostic, type Hover } from './annotate/model'
import * as Icon from './icon'

const highlighter = createHighlighter({
  languages: [silk, shell, toml, json],
  fallbackLanguage: 'plaintext',
})

export type Token = ReturnType<typeof highlighter.tokenize>['tokens'][number]

export type TokenClass = NonNullable<Token['className']>

export const tokenize = (code: string, lang: string): ReadonlyArray<Token> =>
  highlighter.tokenize(code, { lang }).tokens

// Token categories mapped onto the design's syntax tokens.
const tokenClassName = (className: TokenClass): string =>
  Match.value(className).pipe(
    Match.when('comment', () => 'text-code-comment'),
    Match.when('keyword', () => 'text-code-keyword'),
    Match.whenOr('type', 'number', 'literal', () => 'text-code-type'),
    Match.when('function', () => 'font-bold text-code-function'),
    Match.when('operator', () => 'text-code-operator'),
    Match.when('string', () => 'text-code-string'),
    Match.orElse(() => ''),
  )

export const highlighted = <Message>(
  code: string,
  lang: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> =>
  pipe(
    highlighter.tokenize(code, { lang }).tokens,
    Array.map(({ className, value }) =>
      className === undefined
        ? value
        : h.span([h.Class(tokenClassName(className))], [value]),
    ),
  )

// Languages shown by name but not highlighted.
const PLAIN_LANGUAGES: ReadonlySet<string> = new Set(['powershell'])

export const languageLabel = (lang: string): string =>
  highlighter.normalizeLanguage(lang) === 'plaintext' &&
  !PLAIN_LANGUAGES.has(lang)
    ? 'TEXT'
    : lang

export type CopyButton<Message> = Readonly<{
  isCopied: boolean
  onCopy: Message
}>

export const copyButton = <Message>(
  { isCopied, onCopy }: CopyButton<Message>,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(onCopy),
      h.AriaLabel(isCopied ? 'Copied' : 'Copy code'),
      h.Class(
        'label flex cursor-pointer items-center gap-1.5 rounded border border-code-divider px-2 py-1 text-[0.6875rem] text-code-label hover:text-code-plain',
      ),
    ],
    [Icon.copy('size-3', h), isCopied ? 'Copied' : 'Copy'],
  )

export type CodeBlock<Message> = Readonly<{
  code: string
  lang: string
  title?: string
  lineNumbers?: boolean
  copy: CopyButton<Message>
  className?: string
  // What the language server said about the code, drawn into it.
  annotations?: Annotations
}>

const lineNumbersView = <Message>(
  code: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [h.AriaHidden(true), h.Class('select-none text-right text-code-gutter')],
    [
      pipe(
        code.split('\n'),
        Array.map((_, index) => `${index + 1}`),
        Array.join('\n'),
      ),
    ],
  )

export const codeBlock = <Message>(
  {
    code,
    lang,
    title,
    lineNumbers,
    copy,
    className,
    annotations,
  }: CodeBlock<Message>,
  h: HtmlBuilder<Message>,
): Html =>
  h.figure(
    [
      h.Class(
        `flex min-w-0 flex-col overflow-hidden rounded-md bg-code text-code-plain ${className ?? ''}`,
      ),
    ],
    [
      h.figcaption(
        [
          h.Class(
            'flex items-center justify-between gap-4 border-b border-code-divider py-2.5 pr-3 pl-5',
          ),
        ],
        [
          h.span(
            [h.Class('flex items-center gap-3')],
            [
              h.span([h.Class('label text-code-label')], [languageLabel(lang)]),
              title === undefined
                ? h.empty
                : h.span([h.Class('text-xs text-code-plain')], [title]),
            ],
          ),
          copyButton(copy, h),
        ],
      ),
      annotations === undefined
        ? plainCode(code, lang, lineNumbers, h)
        : h.pre(
            [h.Class('overflow-x-auto p-5 text-[0.8125rem] leading-[1.8]')],
            [h.code([h.Class('block')], annotatedLines(code, annotations, h))],
          ),
    ],
  )

const plainCode = <Message>(
  code: string,
  lang: string,
  lineNumbers: boolean | undefined,
  h: HtmlBuilder<Message>,
): Html =>
  h.pre(
    [h.Class('flex gap-5 overflow-x-auto p-5 text-[0.8125rem] leading-[1.8]')],
    [
      lineNumbers === true ? lineNumbersView(code, h) : h.empty,
      h.code([h.Class('min-w-0')], highlighted(code, lang, h)),
    ],
  )

// ANNOTATED CODE

// A piece of one line: a token, or the part of one that an annotation range
// splits off.
type Piece = Readonly<{
  start: number
  text: string
  className: TokenClass | undefined
}>

// The code's lines as pieces, split wherever an annotation starts or ends.
const linePieces = (
  code: string,
  cuts: (line: number) => ReadonlyArray<number>,
): ReadonlyArray<ReadonlyArray<Piece>> => {
  const lines: Array<Array<Piece>> = [[]]
  const at = { column: 0 }
  tokenize(code, 'silk').forEach(({ value, className }) =>
    value.split('\n').forEach((part, index) => {
      if (index > 0) {
        lines.push([])
        at.column = 0
      }
      const line = lines.length - 1
      const start = at.column
      const end = start + part.length
      // Ranges can share an edge, such as an error on a name that also has a
      // hover, so the cuts are sorted and each kept once.
      const inside = [...new Set(cuts(line))]
        .filter(cut => cut > start && cut < end)
        .sort((left, right) => left - right)
      const edges = [start, ...inside, end]
      edges.slice(1).forEach((edge, edgeIndex) => {
        const from = edges[edgeIndex] ?? start
        if (edge > from) {
          lines[line]?.push({
            start: from,
            text: part.slice(from - start, edge - start),
            className,
          })
        }
      })
      at.column = end
    }),
  )
  return lines
}

const within = (
  start: number,
  range: Readonly<{ start: number; end: number }>,
): boolean => start >= range.start && start < range.end

const pieceView = <Message>(
  piece: Piece,
  diagnostics: ReadonlyArray<Diagnostic>,
  h: HtmlBuilder<Message>,
): Html | string => {
  const error = diagnostics.find(diagnostic => within(piece.start, diagnostic))
  const classes = [
    piece.className === undefined ? '' : tokenClassName(piece.className),
    error === undefined
      ? ''
      : `underline decoration-wavy underline-offset-4 ${error.severity === 'Error' ? 'decoration-red-500' : 'decoration-amber-500'}`,
  ]
    .join(' ')
    .trim()
  return classes === '' ? piece.text : h.span([h.Class(classes)], [piece.text])
}

const hoverCard = <Message>(
  text: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> => highlighted(text, 'silk', h)

// A name the reader can hover or focus to see what the language server says
// about it.
const hoverable = <Message>(
  hover: Hover,
  children: ReadonlyArray<Html | string>,
  diagnostics: ReadonlyArray<Diagnostic>,
  // Near the end of the block a card opens upward, since the block scrolls
  // sideways and would clip one that hangs below it.
  opensUp: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [
      h.Tabindex(0),
      h.Class(
        // A name with an error keeps only the error's wavy underline.
        `group/hover relative cursor-help focus:outline-none focus-visible:rounded-sm focus-visible:ring-1 focus-visible:ring-signal ${diagnostics.some(diagnostic => within(hover.start, diagnostic)) ? '' : 'underline decoration-code-gutter decoration-dotted underline-offset-4'}`,
      ),
    ],
    [
      ...children,
      hover.isPinned
        ? h.empty
        : h.span(
            [
              h.Role('tooltip'),
              h.Class(
                `pointer-events-none absolute left-0 z-20 ${opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} hidden rounded-md border border-code-divider bg-code px-3 py-1.5 whitespace-pre text-code-plain shadow-lg group-hover/hover:block group-focus/hover:block`,
              ),
            ],
            hoverCard(hover.text, h),
          ),
    ],
  )

const lineView = <Message>(
  pieces: ReadonlyArray<Piece>,
  line: number,
  annotations: Annotations,
  opensUp: boolean,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const onLine = <A extends Readonly<{ line: number }>>(
    items: ReadonlyArray<A>,
  ): ReadonlyArray<A> => items.filter(item => item.line === line)
  const diagnostics = onLine(annotations.diagnostics)
  const hovers = onLine(annotations.hovers)
  const hints = onLine(annotations.hints)
  const hintsAt = (column: number): ReadonlyArray<Html> =>
    hints
      .filter(hint => hint.column === column)
      .map(hint =>
        h.span(
          [
            h.AriaHidden(true),
            h.Class('text-[0.9em] text-code-comment italic select-none'),
          ],
          [hint.label],
        ),
      )
  // Pieces in order, with the ones under a hover gathered into it.
  const content = pieces.reduce<{
    nodes: ReadonlyArray<Html | string>
    open:
      | Readonly<{ hover: Hover; children: ReadonlyArray<Html | string> }>
      | undefined
  }>(
    (state, piece) => {
      const hover = hovers.find(candidate => within(piece.start, candidate))
      const view = pieceView(piece, diagnostics, h)
      const closed =
        state.open !== undefined && state.open.hover !== hover
          ? [
              ...state.nodes,
              hoverable(
                state.open.hover,
                state.open.children,
                diagnostics,
                opensUp,
                h,
              ),
            ]
          : state.nodes
      const before = [...closed, ...hintsAt(piece.start)]
      if (hover === undefined) {
        return { nodes: [...before, view], open: undefined }
      }
      return state.open?.hover === hover
        ? {
            nodes: [...closed, ...hintsAt(piece.start)],
            open: { hover, children: [...state.open.children, view] },
          }
        : { nodes: before, open: { hover, children: [view] } }
    },
    { nodes: [], open: undefined },
  )
  const end = pieces.reduce(
    (last, piece) => Math.max(last, piece.start + piece.text.length),
    0,
  )
  const nodes = [
    ...content.nodes,
    ...(content.open === undefined
      ? []
      : [
          hoverable(
            content.open.hover,
            content.open.children,
            diagnostics,
            opensUp,
            h,
          ),
        ]),
    ...hints
      .filter(hint => hint.column >= end)
      .flatMap(hint => hintsAt(hint.column)),
  ]
  return [
    h.div([h.Class('min-h-[1lh] whitespace-pre')], nodes),
    ...hovers
      .filter(hover => hover.isPinned)
      .map(hover =>
        h.div(
          [
            h.Class('my-1 whitespace-pre'),
            h.Style({ paddingLeft: `${hover.start}ch` }),
          ],
          [
            h.div(
              [
                h.Class(
                  'relative inline-block rounded-md border border-code-divider bg-paper px-3 py-1 text-code-plain shadow-sm before:absolute before:-top-[5px] before:left-3 before:size-2 before:rotate-45 before:border-t before:border-l before:border-code-divider before:bg-paper',
                ),
              ],
              hoverCard(hover.text, h),
            ),
          ],
        ),
      ),
    ...diagnostics.map(diagnostic =>
      h.div(
        [
          h.Role('note'),
          h.Class(
            `my-1.5 border-l-2 px-3 py-1.5 font-sans text-[0.8125rem] leading-snug whitespace-pre-wrap ${diagnostic.severity === 'Error' ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'}`,
          ),
        ],
        [
          diagnostic.message,
          diagnostic.code === ''
            ? h.empty
            : h.span(
                [h.Class('ml-2 font-mono text-xs text-code-label')],
                [diagnostic.code],
              ),
        ],
      ),
    ),
  ]
}

// The code's lines, with error underlines and their messages, hover cards on
// the names and pinned below their line, and inlay hints.
const annotatedLines = <Message>(
  code: string,
  annotations: Annotations,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const cuts = (line: number): ReadonlyArray<number> => [
    ...annotations.diagnostics
      .filter(diagnostic => diagnostic.line === line)
      .flatMap(({ start, end }) => [start, end]),
    ...annotations.hovers
      .filter(hover => hover.line === line)
      .flatMap(({ start, end }) => [start, end]),
    ...annotations.hints
      .filter(hint => hint.line === line)
      .map(hint => hint.column),
  ]
  const lines = linePieces(code, cuts)
  return lines.flatMap((pieces, line) =>
    lineView(
      pieces,
      line,
      annotations,
      line >= 2 && line >= lines.length - 2,
      h,
    ),
  )
}

export const inlineSnippet = <Message>(
  code: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.code(
    [
      h.Class(
        'block overflow-x-auto rounded bg-code px-3.5 py-2.5 text-xs leading-[1.375] whitespace-pre text-code-plain',
      ),
    ],
    highlighted(code, 'silk', h),
  )
