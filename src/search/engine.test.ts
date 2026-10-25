import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { highlight, prepare, search, snippetText } from './engine'
import { type SearchIndex } from './record'

const index: SearchIndex = {
  pages: [
    ['std/list', 'silk.list', 'Standard library'],
    ['book/ownership', '4. Ownership', 'The Silk book'],
  ],
  sections: [
    [0, '', 'silk.list', '', [], 'Growable lists that own their elements.', ''],
    [
      0,
      'List.impl.appendBytes',
      'List.appendBytes',
      'Method',
      [],
      'Adds each byte of values at the end of the list.',
      'pub effect fn appendBytes(self: &mut List<u8>, values: &[u8]) -> ()',
    ],
    [
      0,
      'List.impl.append',
      'List.append',
      'Method',
      [],
      'Adds value at the end of the list.',
      'pub effect fn append(self: &mut Self, value: T) -> ()',
    ],
    [
      1,
      'borrowing-looking-without-taking',
      'Borrowing: looking without taking',
      '',
      [],
      'Moving is the wrong tool most of the time. A borrow lets code look at a list.',
      '',
    ],
  ],
}

const prepared = prepare(index)

const hitTitles = (
  query: string,
  scope: 'All' | 'Docs' | 'Reference' = 'All',
) =>
  search(prepared, query, scope).groups.flatMap(group =>
    group.hits.map(hit => hit.title.map(segment => segment.text).join('')),
  )

describe('search', () => {
  test('a declaration named by the query ranks first', () => {
    expect(hitTitles('list append')[0]).toBe('List.append')
    expect(hitTitles('List.append')[0]).toBe('List.append')
  })

  test('every word of the query has to match', () => {
    expect(hitTitles('append borrow')).toEqual([])
  })

  test('hits link to the section anchor and group by page', () => {
    const { groups } = search(prepared, 'borrow', 'All')
    expect(groups.map(group => group.pageTitle)).toEqual(['4. Ownership'])
    expect(groups[0]?.hits[0]?.href).toBe(
      '/docs/book/ownership#borrowing-looking-without-taking',
    )
  })

  test('the scope limits results to the docs or the standard library', () => {
    expect(hitTitles('list', 'Docs')).toEqual([
      'Borrowing: looking without taking',
    ])
    expect(hitTitles('list', 'Reference')).not.toContain(
      'Borrowing: looking without taking',
    )
  })

  test('a misspelled word is corrected from the titles', () => {
    const outcome = search(prepared, 'borowing', 'All')
    expect(outcome.maybeCorrectedQuery).toEqual(Option.some('borrowing'))
    expect(outcome.groups[0]?.pageTitle).toBe('4. Ownership')
  })

  test('a query that matches nothing returns no groups', () => {
    expect(search(prepared, 'zzzz', 'All').groups).toEqual([])
  })
})

describe('highlighting', () => {
  test('marks every occurrence of the query words', () => {
    expect(highlight('List.append', ['list', 'append'])).toEqual([
      { text: 'List', isMatch: true },
      { text: '.', isMatch: false },
      { text: 'append', isMatch: true },
    ])
  })

  test('the snippet starts near the first match', () => {
    const text = `${'word '.repeat(60)}needle and more text after it`
    const snippet = snippetText(text, ['needle'])
    expect(snippet.startsWith('… ')).toBe(true)
    expect(snippet).toContain('needle')
  })
})
