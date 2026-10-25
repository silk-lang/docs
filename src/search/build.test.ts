import { describe, expect, test } from 'vitest'

import { parseMarkdown } from '@foldkit/markdown/vite'

import { islandAttributes } from '../docs/islands'
import { pageSections } from './build'

const page = (source: string, isReference: boolean) => ({
  key: isReference ? 'std/arena' : 'book/ownership',
  title: isReference ? 'silk.arena' : '4. Ownership',
  groupTitle: isReference ? 'Standard library' : 'The Silk book',
  isReference,
  document: parseMarkdown(source, { islands: islandAttributes }),
})

describe('index building', () => {
  test('a guide splits at its level 2 and 3 headings', () => {
    const sections = pageSections(
      0,
      page(
        [
          '# Ownership',
          'Intro text.',
          '## Every value has one owner',
          'Owners own.',
          '### Moves',
          'A move transfers.',
          '#### Fine print',
          'Small text.',
        ].join('\n\n'),
        false,
      ),
    )
    expect(
      sections.map(([, anchor, title, , crumbs, text]) => [
        anchor,
        title,
        crumbs,
        text,
      ]),
    ).toEqual([
      ['', '4. Ownership', [], 'Intro text.'],
      [
        'every-value-has-one-owner',
        'Every value has one owner',
        [],
        'Owners own.',
      ],
      [
        'moves',
        'Moves',
        ['Every value has one owner'],
        'A move transfers. Fine print Small text.',
      ],
    ])
  })

  test('a standard library page splits at its declarations', () => {
    const sections = pageSections(
      0,
      page(
        [
          'A bump allocator.',
          '::Anchor{id="Arena"}',
          '## `Arena`',
          '```silk\npub struct Arena<A>\n```',
          'An arena.',
          '### Details',
          'Chunks are counted.',
          '::Anchor{id="Arena.impl.make"}',
          '### Associated function `make`',
          '```silk\npub fn make(child: A) -> Arena<A>\n```',
          'Makes an arena.',
          'Public declarations: 2.',
        ].join('\n\n'),
        true,
      ),
    )
    expect(
      sections.map(([, anchor, title, label, , text, signature]) => [
        anchor,
        title,
        label,
        text,
        signature,
      ]),
    ).toEqual([
      ['', 'silk.arena', '', 'A bump allocator.', ''],
      [
        'Arena',
        'Arena',
        'Struct',
        'An arena. Chunks are counted.',
        'pub struct Arena<A>',
      ],
      [
        'Arena.impl.make',
        'Arena.make',
        'Associated function',
        'Makes an arena.',
        'pub fn make(child: A) -> Arena<A>',
      ],
    ])
  })
})
