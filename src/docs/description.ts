import { Array, Option, pipe } from 'effect'

import type * as Markdown from '@foldkit/markdown'

import { inlineText } from './headings'

const MAX_LENGTH = 200

// A page's description for link previews: the first paragraph, cut after the
// last sentence that fits, or after the last word with an ellipsis when even
// the first sentence is too long. Generated pages may open with metadata such
// as "Import as ..." lines, which are skipped.
const METADATA = /^(?:Import as |Public declarations|Category|Profiles)/

const shorten = (text: string): string => {
  if (text.length <= MAX_LENGTH) {
    return text
  }
  const head = text.slice(0, MAX_LENGTH)
  const sentenceEnd = Math.max(
    ...Array.map([...head.matchAll(/[.!?](?=\s)/g)], match => match.index),
    -1,
  )
  if (sentenceEnd > 0) {
    return head.slice(0, sentenceEnd + 1)
  }
  return `${head.slice(0, head.lastIndexOf(' ')).replace(/[,;:]$/, '')}...`
}

export const pageDescription = (
  document: Markdown.MarkdownDocument,
): Option.Option<string> =>
  pipe(
    document.blocks,
    Array.flatMap(block =>
      block._tag === 'Paragraph'
        ? [inlineText(block.content).replace(/\s+/g, ' ').trim()]
        : [],
    ),
    Array.findFirst(text => text !== '' && !METADATA.test(text)),
    Option.map(shorten),
  )
