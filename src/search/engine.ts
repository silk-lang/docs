import { Array, HashSet, Number, Option, Order, String, pipe } from 'effect'

import * as Catalog from '../docs/catalog'
import { type SearchIndex } from './record'
import {
  type ResultGroup,
  type Scope,
  type SearchHit,
  type SearchOutcome,
  type Segment,
} from './result'

// ENGINE

// Full-text search over the index, run in the browser. Every word of the query
// has to appear somewhere in a section: its title, the headings above it, its
// signature or its text. Where a word appears decides how much it counts, so a
// declaration named after the query ranks above a paragraph that mentions it.

export type PreparedSection = Readonly<{
  pageKey: string
  pageTitle: string
  groupTitle: string
  isReference: boolean
  href: string
  title: string
  titleLower: string
  label: string
  crumbs: ReadonlyArray<string>
  crumbsLower: string
  text: string
  textLower: string
  signature: string
  signatureLower: string
}>

export type PreparedIndex = Readonly<{
  sections: ReadonlyArray<PreparedSection>
  vocabulary: ReadonlyArray<string>
}>

const MAX_GROUPS = 8
const MAX_HITS_PER_GROUP = 4
const MAX_QUERY_WORDS = 6
const SNIPPET_LENGTH = 160
const SNIPPET_LEAD = 40

const pageHref = (pageKey: string, anchor: string): string => {
  const [directory = '', slug = ''] = pageKey.split('/')
  const path = Catalog.pagePath({ directory, slug })
  return String.isEmpty(anchor) ? path : `${path}#${anchor}`
}

const words = (text: string): ReadonlyArray<string> =>
  Array.filter(text.toLowerCase().split(/[^\p{L}\p{N}_]+/u), word =>
    String.isNonEmpty(word),
  )

export const prepare = (index: SearchIndex): PreparedIndex => {
  const sections = Array.getSomes(
    Array.map(
      index.sections,
      ([pageIndex, anchor, title, label, crumbs, text, signature]) =>
        Option.map(
          Array.get(index.pages, pageIndex),
          ([pageKey, pageTitle, groupTitle]): PreparedSection => ({
            pageKey,
            pageTitle,
            groupTitle,
            isReference: String.startsWith('std/')(pageKey),
            href: pageHref(pageKey, anchor),
            title,
            titleLower: title.toLowerCase(),
            label,
            crumbs,
            crumbsLower: Array.join([pageTitle, ...crumbs], ' ').toLowerCase(),
            text,
            textLower: text.toLowerCase(),
            signature,
            signatureLower: signature.toLowerCase(),
          }),
        ),
    ),
  )

  const vocabulary = pipe(
    sections,
    Array.flatMap(section => words(`${section.title} ${section.crumbsLower}`)),
    Array.filter(word => word.length > 2),
    HashSet.fromIterable,
    Array.fromIterable,
  )
  return { sections, vocabulary }
}

// MATCHING

const isWordCharacter = (character: string | undefined): boolean =>
  character !== undefined && /[\p{L}\p{N}_]/u.test(character)

type Match = 'None' | 'Inside' | 'WordStart' | 'Word'

// How well `word` occurs in `haystack`: as a whole word, at the start of a
// word, or only inside one. `original` is the haystack before lowercasing, so
// a camelCase boundary (`provideMut`) counts as the start of a word.
const matchWord = (
  haystack: string,
  word: string,
  original: string,
  from = 0,
  best: Match = 'None',
): Match => {
  const index = haystack.indexOf(word, from)
  if (index === -1) {
    return best
  }
  const startsWord =
    !isWordCharacter(haystack[index - 1]) ||
    /\p{Lu}/u.test(original[index] ?? '')
  if (!startsWord) {
    return matchWord(haystack, word, original, index + 1, 'Inside')
  }
  if (!isWordCharacter(haystack[index + word.length])) {
    return 'Word'
  }
  return matchWord(haystack, word, original, index + 1, 'WordStart')
}

const countOccurrences = (
  haystack: string,
  word: string,
  from = 0,
  count = 0,
): number => {
  const index = haystack.indexOf(word, from)
  return index === -1 || count >= 4
    ? count
    : countOccurrences(haystack, word, index + word.length, count + 1)
}

const titleWeight: Record<Match, number> = {
  None: 0,
  Inside: 5,
  WordStart: 9,
  Word: 12,
}
const crumbWeight: Record<Match, number> = {
  None: 0,
  Inside: 1,
  WordStart: 3,
  Word: 3,
}
const signatureWeight: Record<Match, number> = {
  None: 0,
  Inside: 2,
  WordStart: 3,
  Word: 4,
}
const textWeight: Record<Match, number> = {
  None: 0,
  Inside: 1,
  WordStart: 2,
  Word: 2.5,
}

// Zero when the word is nowhere in the section.
const wordScore = (section: PreparedSection, word: string): number => {
  const title = titleWeight[matchWord(section.titleLower, word, section.title)]
  const crumbs =
    crumbWeight[matchWord(section.crumbsLower, word, section.crumbsLower)]
  const signature =
    signatureWeight[matchWord(section.signatureLower, word, section.signature)]
  const textMatch = matchWord(section.textLower, word, section.text)
  const text =
    textMatch === 'None'
      ? 0
      : textWeight[textMatch] + countOccurrences(section.textLower, word) * 0.25
  return title + crumbs + signature + text
}

const sectionScore = (
  section: PreparedSection,
  query: string,
  queryWords: ReadonlyArray<string>,
): Option.Option<number> => {
  const scores = Array.map(queryWords, word => wordScore(section, word))
  if (Array.some(scores, score => score === 0)) {
    return Option.none()
  }
  const dottedQuery = Array.join(queryWords, '.')
  const isWholeTitle =
    section.titleLower === query ||
    section.titleLower === dottedQuery ||
    String.endsWith(`.${dottedQuery}`)(section.titleLower)
  const hasEveryWordInTitle = Array.every(queryWords, word =>
    section.titleLower.includes(word),
  )
  return Option.some(
    Number.sumAll(scores) +
      (isWholeTitle ? 30 : 0) +
      (hasEveryWordInTitle ? 8 : 0) +
      (section.label === 'Implementation' ? -6 : 0) -
      section.title.length * 0.02,
  )
}

// HIGHLIGHTING

type Range = readonly [number, number]

const occurrences = (
  haystack: string,
  word: string,
  from = 0,
  found: ReadonlyArray<Range> = [],
): ReadonlyArray<Range> => {
  const index = haystack.indexOf(word, from)
  return index === -1
    ? found
    : occurrences(
        haystack,
        word,
        index + word.length,
        Array.append(found, [index, index + word.length] as const),
      )
}

const mergeRanges = (ranges: ReadonlyArray<Range>): ReadonlyArray<Range> =>
  pipe(
    ranges,
    Array.sort(Order.mapInput(Number.Order, ([start]: Range) => start)),
    Array.reduce<ReadonlyArray<Range>, Range>([], (merged, range) =>
      Option.match(Array.last(merged), {
        onNone: () => [range],
        onSome: ([lastStart, lastEnd]) =>
          range[0] <= lastEnd
            ? Array.append(Array.dropRight(merged, 1), [
                lastStart,
                Math.max(lastEnd, range[1]),
              ] as const)
            : Array.append(merged, range),
      }),
    ),
  )

export const highlight = (
  text: string,
  queryWords: ReadonlyArray<string>,
): ReadonlyArray<Segment> => {
  const lower = text.toLowerCase()
  const ranges = mergeRanges(
    Array.flatMap(queryWords, word => occurrences(lower, word)),
  )
  const start: readonly [ReadonlyArray<Segment>, number] = [[], 0]
  const [segments, end] = Array.reduce(
    ranges,
    start,
    ([found, position], [start, stop]) => [
      [
        ...found,
        ...(start > position
          ? [{ text: text.slice(position, start), isMatch: false }]
          : []),
        { text: text.slice(start, stop), isMatch: true },
      ],
      stop,
    ],
  )
  return end < text.length
    ? Array.append(segments, { text: text.slice(end), isMatch: false })
    : segments
}

// A window of the section's text around the first word of the query it holds.
export const snippetText = (
  text: string,
  queryWords: ReadonlyArray<string>,
): string => {
  const lower = text.toLowerCase()
  const firstIndex = pipe(
    queryWords,
    Array.map(word => lower.indexOf(word)),
    Array.filter(index => index >= 0),
    Array.match({
      onEmpty: () => 0,
      onNonEmpty: indexes => Math.min(...indexes),
    }),
  )
  const roughStart = Math.max(0, firstIndex - SNIPPET_LEAD)
  const start =
    roughStart === 0
      ? 0
      : Math.max(roughStart, text.indexOf(' ', roughStart) + 1)
  const roughEnd = start + SNIPPET_LENGTH
  const end =
    roughEnd >= text.length
      ? text.length
      : Math.max(text.lastIndexOf(' ', roughEnd), firstIndex + 1)
  return `${start > 0 ? '… ' : ''}${text.slice(start, end)}${end < text.length ? ' …' : ''}`
}

// SPELLING

const rowStartingAt = (value: number): ReadonlyArray<number> => [value]

const editDistanceAtMost = (
  left: string,
  right: string,
  limit: number,
): boolean => {
  if (Math.abs(left.length - right.length) > limit) {
    return false
  }
  const firstRow: ReadonlyArray<number> = Array.makeBy(
    right.length + 1,
    index => index,
  )
  const lastRow = Array.reduce(
    Array.makeBy(left.length, index => index),
    firstRow,
    (previous, leftIndex) =>
      Array.reduce(
        Array.makeBy(right.length, index => index),
        rowStartingAt(leftIndex + 1),
        (row, rightIndex) =>
          Array.append(
            row,
            Math.min(
              (previous[rightIndex + 1] ?? 0) + 1,
              (row[rightIndex] ?? 0) + 1,
              (previous[rightIndex] ?? 0) +
                (left[leftIndex] === right[rightIndex] ? 0 : 1),
            ),
          ),
      ),
  )
  return (lastRow[right.length] ?? limit + 1) <= limit
}

// For a word that matches nothing, the closest title word within one edit (two
// for long words), so `alocator` still finds the allocator.
const correctWord = (
  vocabulary: ReadonlyArray<string>,
  word: string,
): Option.Option<string> =>
  word.length < 4
    ? Option.none()
    : pipe(
        Array.findFirst(vocabulary, candidate =>
          editDistanceAtMost(word, candidate, 1),
        ),
        Option.orElse(() =>
          word.length >= 7
            ? Array.findFirst(vocabulary, candidate =>
                editDistanceAtMost(word, candidate, 2),
              )
            : Option.none(),
        ),
      )

// SEARCH

const queryWordsOf = (query: string): ReadonlyArray<string> =>
  pipe(
    query.toLowerCase().split(/\s+/),
    Array.map(word => word.replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '')),
    Array.filter(String.isNonEmpty),
    Array.dedupe,
    Array.take(MAX_QUERY_WORDS),
  )

const inScope =
  (scope: Scope) =>
  (section: PreparedSection): boolean =>
    scope === 'All' ||
    (scope === 'Reference' ? section.isReference : !section.isReference)

type Scored = readonly [PreparedSection, number]

const scoreSections = (
  sections: ReadonlyArray<PreparedSection>,
  query: string,
  queryWords: ReadonlyArray<string>,
): ReadonlyArray<Scored> =>
  pipe(
    sections,
    Array.map(section =>
      Option.map(
        sectionScore(section, query, queryWords),
        score => [section, score] as const,
      ),
    ),
    Array.getSomes,
    Array.sort(
      Order.flip(Order.mapInput(Number.Order, ([, score]: Scored) => score)),
    ),
  )

const toHit = (
  section: PreparedSection,
  queryWords: ReadonlyArray<string>,
): SearchHit => ({
  href: section.href,
  title: highlight(section.title, queryWords),
  label: section.label,
  crumbs: section.crumbs,
  snippet: String.isEmpty(section.text)
    ? []
    : highlight(snippetText(section.text, queryWords), queryWords),
  signature: section.signature.split('\n')[0] ?? '',
})

// Hits stay in score order inside a page, and pages in the order of their best
// hit, the way a reader scans them.
const groupByPage = (
  scored: ReadonlyArray<Scored>,
  queryWords: ReadonlyArray<string>,
): ReadonlyArray<ResultGroup> =>
  pipe(
    scored,
    Array.reduce<ReadonlyArray<ResultGroup>, Scored>(
      [],
      (groups, [section]) => {
        const groupIndex = Array.findFirstIndex(
          groups,
          group => group.pageKey === section.pageKey,
        )
        return Option.match(groupIndex, {
          onNone: () =>
            groups.length >= MAX_GROUPS
              ? groups
              : Array.append(groups, {
                  pageKey: section.pageKey,
                  pageTitle: section.pageTitle,
                  groupTitle: section.groupTitle,
                  hits: [toHit(section, queryWords)],
                }),
          onSome: index =>
            Array.map(groups, (group, groupIndex) =>
              groupIndex !== index || group.hits.length >= MAX_HITS_PER_GROUP
                ? group
                : {
                    ...group,
                    hits: Array.append(group.hits, toHit(section, queryWords)),
                  },
            ),
        })
      },
    ),
  )

export const search = (
  index: PreparedIndex,
  query: string,
  scope: Scope,
): SearchOutcome => {
  const queryWords = queryWordsOf(query)
  const normalizedQuery = Array.join(queryWords, ' ')
  const sections = Array.filter(index.sections, inScope(scope))
  const scored = scoreSections(sections, normalizedQuery, queryWords)
  if (
    Array.isReadonlyArrayNonEmpty(scored) ||
    Array.isReadonlyArrayEmpty(queryWords)
  ) {
    return {
      groups: groupByPage(scored, queryWords),
      maybeCorrectedQuery: Option.none(),
    }
  }
  const correctedWords = Array.map(queryWords, word =>
    Array.some(sections, section => wordScore(section, word) > 0)
      ? word
      : Option.getOrElse(correctWord(index.vocabulary, word), () => word),
  )
  const correctedQuery = Array.join(correctedWords, ' ')
  if (correctedQuery === normalizedQuery) {
    return { groups: [], maybeCorrectedQuery: Option.none() }
  }
  return {
    groups: groupByPage(
      scoreSections(sections, correctedQuery, correctedWords),
      correctedWords,
    ),
    maybeCorrectedQuery: Option.some(correctedQuery),
  }
}
