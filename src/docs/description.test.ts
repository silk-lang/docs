import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { parseMarkdown } from '@foldkit/markdown/vite'

import { pageDescription } from './description'

const descriptionOf = (markdown: string): Option.Option<string> =>
  pageDescription(parseMarkdown(markdown))

describe('pageDescription', () => {
  test('takes the first paragraph as plain text', () => {
    expect(
      descriptionOf(
        '# Bytes\n\nOwned [`Bytes`](#Bytes) for *raw* data.\n\nMore.',
      ),
    ).toEqual(Option.some('Owned Bytes for raw data.'))
  })

  test('skips generated metadata lines', () => {
    expect(
      descriptionOf(
        'Import as silk.io with import silk.io.\n\nReaders and writers.',
      ),
    ).toEqual(Option.some('Readers and writers.'))
  })

  test('cuts a long paragraph after the last sentence that fits', () => {
    const first = `${'word '.repeat(30).trim()}.`
    const second = `${'more '.repeat(30).trim()}.`
    expect(descriptionOf(`${first} ${second}`)).toEqual(Option.some(first))
  })

  test('cuts a long sentence at a word with an ellipsis', () => {
    const description = Option.getOrThrow(descriptionOf('word '.repeat(80)))
    expect(description.length).toBeLessThanOrEqual(203)
    expect(description.endsWith('word...')).toBe(true)
  })

  test('has none for a page without paragraphs', () => {
    expect(descriptionOf('# Title\n\n## Section')).toEqual(Option.none())
  })
})
