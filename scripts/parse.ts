// Parses site markdown the way the Vite plugin does. Results are kept by
// source, since scripts/versions.ts meets the same page in many releases.

import { type MarkdownDocument } from '@foldkit/markdown'
import { parseMarkdown } from '@foldkit/markdown/vite'

import { islandAttributes } from '../src/docs/islands.ts'

const parsed = new Map<string, MarkdownDocument>()

export const parseContent = (markdown: string): MarkdownDocument => {
  const cached = parsed.get(markdown)
  if (cached !== undefined) {
    return cached
  }
  const document = parseMarkdown(markdown, { islands: islandAttributes })
  parsed.set(markdown, document)
  return document
}
