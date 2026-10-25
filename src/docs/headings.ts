import { Array, Match, Option, Record, String, pipe } from 'effect'

import type * as Markdown from '@foldkit/markdown'

export const inlineText = (content: ReadonlyArray<Markdown.Inline>): string =>
  pipe(
    content,
    Array.map(inline =>
      Match.value(inline).pipe(
        Match.tags({
          Text: ({ value }) => value,
          InlineCode: ({ value }) => value,
          HardBreak: () => ' ',
          Image: ({ alt }) => alt,
        }),
        Match.orElse(({ content }) => inlineText(content)),
      ),
    ),
    Array.join(''),
  )

// The same anchors GitHub generates, so links written against the source
// repository (`page.md#eff-001--calling-an-effect-function`) keep working.
export const headingSlug = (text: string): string =>
  pipe(
    text.toLowerCase(),
    String.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, ''),
    String.replace(/ /g, '-'),
  )

export const headingText = (heading: Markdown.Heading): string =>
  inlineText(heading.content)

// Like GitHub, a repeated slug gets a numeric suffix (`details`, `details-1`),
// so generated reference pages with many "Details" sections keep unique ids.
export const headingIds = (
  document: Markdown.MarkdownDocument,
): ReadonlyMap<Markdown.Heading, string> => {
  const headings = Array.flatMap(document.blocks, block =>
    block._tag === 'Heading' ? [block] : [],
  )
  const [, ids] = Array.mapAccum(
    headings,
    Record.empty<string, number>(),
    (seen, heading) => {
      const slug = headingSlug(headingText(heading))
      const count = Option.getOrElse(Record.get(seen, slug), () => 0)
      return [
        Record.set(seen, slug, count + 1),
        [heading, count === 0 ? slug : `${slug}-${count}`] as const,
      ]
    },
  )
  return new Map(ids)
}

export const headingId = (
  ids: ReadonlyMap<Markdown.Heading, string>,
  heading: Markdown.Heading,
): string => ids.get(heading) ?? headingSlug(headingText(heading))
