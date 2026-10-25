import { Array, Option, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Icon from '../icon'
import { type Message } from '../message'
import { headingId, headingIds, headingText } from './headings'
import { islandAttributes } from './islands'

export type TocEntry = Readonly<{ id: string; text: string }>

export const tableOfContents = (
  document: Markdown.MarkdownDocument,
): ReadonlyArray<TocEntry> => {
  const ids = headingIds(document)
  return Array.flatMap(document.blocks, block =>
    block._tag === 'Heading' && block.level === 2
      ? [{ id: headingId(ids, block), text: headingText(block) }]
      : [],
  )
}

// The page header already shows the title, so a hand-written page's own H1
// is not rendered a second time.
const withoutTitle = (
  blocks: ReadonlyArray<Markdown.Block>,
): ReadonlyArray<Markdown.Block> =>
  pipe(
    Array.head(blocks),
    Option.exists(block => block._tag === 'Heading' && block.level === 1),
  )
    ? Array.drop(blocks, 1)
    : blocks

// The first paragraph of a page reads as its lede, like the design's article intro.
export const splitLede = (
  document: Markdown.MarkdownDocument,
): Readonly<{
  maybeLede: Option.Option<Markdown.Paragraph>
  body: Markdown.MarkdownDocument
}> =>
  pipe(withoutTitle(document.blocks), blocks =>
    pipe(
      Array.head(blocks),
      Option.filter(block => block._tag === 'Paragraph'),
      Option.match({
        onNone: () => ({ maybeLede: Option.none(), body: { blocks } }),
        onSome: block => ({
          maybeLede:
            block._tag === 'Paragraph' ? Option.some(block) : Option.none(),
          body: { blocks: Array.drop(blocks, 1) },
        }),
      }),
    ),
  )

// VIEW

const codeLanguage = (maybeLanguage: Option.Option<string>): string =>
  pipe(
    maybeLanguage,
    Option.map(language => language.split(',')[0] ?? language),
    Option.map(language =>
      language === 'console' || language === 'sh' || language === 'bash'
        ? 'shell'
        : language,
    ),
    Option.getOrElse(() => 'text'),
  )

const headingClass = (level: Markdown.HeadingLevel): string =>
  level <= 2
    ? 'mt-6 scroll-mt-8 text-2xl leading-tight font-bold tracking-tight'
    : level === 3
      ? 'mt-4 scroll-mt-8 text-lg leading-snug font-bold tracking-tight'
      : 'mt-2 scroll-mt-8 text-base font-bold'

export const view = (
  document: Markdown.MarkdownDocument,
  documentKey: string,
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html => {
  const ids = headingIds(document)
  return Markdown.view(document, {
    islands: Markdown.islandsFor(islandAttributes, {
      // The negative margin cancels the article's block gap, so an anchor
      // placed before a heading adds no space of its own.
      Anchor: ({ id }) =>
        h.span([h.Id(id), h.Class('-mt-5 block scroll-mt-8')]),
    }),
    views: {
      Heading: (heading, content) => {
        const id = headingId(ids, heading)
        const tag =
          heading.level <= 2 ? h.h2 : heading.level === 3 ? h.h3 : h.h4
        return tag(
          [h.Id(id), h.Class(`group ${headingClass(heading.level)}`)],
          [
            ...content,
            h.a(
              [
                h.Href(`#${id}`),
                h.AriaLabel('Link to this section'),
                h.Class(
                  'ml-2 text-muted no-underline opacity-0 group-hover:opacity-100 focus:opacity-100',
                ),
              ],
              ['#'],
            ),
          ],
        )
      },
      Paragraph: (_, content) => h.p([h.Class('leading-prose')], content),
      InlineCode: ({ value }) =>
        h.code(
          [
            h.Class(
              'rounded-md bg-rule/50 px-1.5 py-0.5 text-[0.9em] break-words',
            ),
          ],
          [value],
        ),
      Link: ({ url }, content) =>
        h.a(
          [
            h.Href(url),
            h.Class(
              'font-bold underline decoration-rule underline-offset-4 hover:decoration-ink',
            ),
          ],
          content,
        ),
      Strong: (_, content) => h.strong([h.Class('font-bold')], content),
      Emphasis: (_, content) => h.em([h.Class('italic')], content),
      CodeBlock: ({ maybeLanguage, value }, occurrenceIndex) =>
        Code.codeBlock(
          {
            code: value,
            lang: codeLanguage(maybeLanguage),
            copy: copyButtonFor(
              copiedCodeIds,
              `${documentKey}#${occurrenceIndex}`,
              value,
            ),
          },
          h,
        ),
      List: ({ isOrdered }, items) =>
        (isOrdered ? h.ol : h.ul)(
          [
            h.Class(
              `flex flex-col gap-2 pl-6 leading-prose ${isOrdered ? 'list-decimal' : 'list-disc'} marker:text-muted`,
            ),
          ],
          items,
        ),
      ListItem: (_, blocks) =>
        h.li([h.Class('flex-col pl-1 [&>*+*]:mt-2')], blocks),
      Blockquote: (_, blocks) =>
        h.aside(
          [
            h.Class(
              'flex gap-3.5 rounded-2xl bg-signal-soft py-5 pr-6 pl-5 text-sm',
            ),
          ],
          [
            Icon.info('mt-0.5 size-5 shrink-0 text-signal', h),
            h.div(
              [h.Class('flex min-w-0 flex-col gap-1.5 leading-prose')],
              [h.p([h.Class('label text-signal')], ['Note']), ...blocks],
            ),
          ],
        ),
      ThematicBreak: () => h.hr([h.Class('border-rule')]),
      Table: (_, headerRow, bodyRows) =>
        h.div(
          [h.Class('overflow-x-auto')],
          [
            h.table(
              [h.Class('w-full border-collapse text-left text-sm')],
              [
                h.thead([h.Class('border-b border-ink')], [headerRow]),
                h.tbody([], bodyRows),
              ],
            ),
          ],
        ),
      TableRow: (_, cells) => h.tr([h.Class('border-b border-rule')], cells),
      TableCell: (_, content, alignment, isHeader) =>
        (isHeader ? h.th : h.td)(
          [
            h.Class(
              `${isHeader ? 'label pb-3 text-muted' : 'py-3.5 leading-normal'} pr-6 align-top ${alignment === 'Right' ? 'text-right' : alignment === 'Center' ? 'text-center' : ''}`,
            ),
          ],
          content,
        ),
    },
  })
}

export const ledeView = (
  paragraph: Markdown.Paragraph,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('text-lg leading-prose text-muted')],
    [
      Markdown.view(
        { blocks: [paragraph] },
        {
          views: {
            Paragraph: (_, content) => h.p([], content),
            InlineCode: ({ value }) => h.code([h.Class('text-ink')], [value]),
          },
        },
      ),
    ],
  )
