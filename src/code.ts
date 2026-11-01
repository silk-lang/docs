import { Array, Match, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { silk } from 'silk-lang/tanstack'

import { createHighlighter } from '@tanstack/highlight/core'
import { json } from '@tanstack/highlight/languages/json'
import { shell } from '@tanstack/highlight/languages/shell'
import { toml } from '@tanstack/highlight/languages/toml'

import * as Icon from './icon'

const highlighter = createHighlighter({
  languages: [silk, shell, toml, json],
  fallbackLanguage: 'plaintext',
})

type TokenClass = NonNullable<
  ReturnType<typeof highlighter.tokenize>['tokens'][number]['className']
>

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
        'label flex cursor-pointer items-center gap-1.5 rounded-md border border-code-divider px-2 py-1 text-code-label hover:text-code-plain',
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
  { code, lang, title, lineNumbers, copy, className }: CodeBlock<Message>,
  h: HtmlBuilder<Message>,
): Html =>
  h.figure(
    [
      h.Class(
        `flex min-w-0 flex-col overflow-hidden rounded-2xl bg-code text-code-plain ${className ?? ''}`,
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
      h.pre(
        [h.Class('flex gap-5 overflow-x-auto p-5 text-sm leading-prose')],
        [
          lineNumbers === true ? lineNumbersView(code, h) : h.empty,
          h.code([h.Class('min-w-0')], highlighted(code, lang, h)),
        ],
      ),
    ],
  )

export const inlineSnippet = <Message>(
  code: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.code(
    [
      h.Class(
        'block overflow-x-auto rounded-xl bg-code px-3.5 py-2.5 text-xs leading-[1.375] whitespace-pre text-code-plain',
      ),
    ],
    highlighted(code, 'silk', h),
  )
