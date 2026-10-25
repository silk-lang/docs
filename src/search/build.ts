import { Array, Match, Option, String, pipe } from 'effect'

import type * as Markdown from '@foldkit/markdown'

import {
  headingId,
  headingIds,
  headingText,
  inlineText,
} from '../docs/headings'
import { type IndexedSection, type SearchIndex } from './record'

// BUILD

// Turns the site's markdown into the search index. A guide page splits at its
// level 2 and 3 headings. A standard library page splits at its declarations,
// which the docs generator marks with an `::Anchor` before each heading; the
// text under a declaration's "Details" and "Errors" headings stays part of it.

export type SourcePage = Readonly<{
  key: string
  title: string
  groupTitle: string
  isReference: boolean
  document: Markdown.MarkdownDocument
}>

type Draft = Readonly<{
  anchor: string
  title: string
  label: string
  crumbs: ReadonlyArray<string>
  level: number
  isDeclaration: boolean
  texts: ReadonlyArray<string>
  maybeSignature: Option.Option<string>
}>

type Walk = Readonly<{
  drafts: ReadonlyArray<Draft>
  current: Draft
  maybePendingAnchor: Option.Option<string>
  parents: ReadonlyArray<Readonly<{ level: number; title: string }>>
}>

const MEMBER_HEADING =
  /^(Method|Associated function|Field|Operation|Parameter|Implementation) (.+)$/

const DECLARATION_KEYWORDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfn\b/, 'Function'],
  [/\bstruct\b/, 'Struct'],
  [/\benum\b/, 'Enum'],
  [/\bunion\b/, 'Union'],
  [/\binterface\b/, 'Interface'],
  [/\bservice\b/, 'Service'],
  [/\bconst\b/, 'Constant'],
  [/\btype\b/, 'Type'],
]

// The declaration's first line decides its label, so `pub struct List<T>` is a
// Struct and `pub effect fn read()` a Function.
const labelFromSignature = (signature: string): string =>
  pipe(
    signature.split('\n')[0] ?? '',
    firstLine =>
      Array.findFirst(DECLARATION_KEYWORDS, ([pattern]) =>
        pattern.test(firstLine),
      ),
    Option.match({ onNone: () => '', onSome: ([, label]) => label }),
  )

// Generated pages carry metadata lines (how to import a module, how many
// declarations it has, which targets a declaration supports) that would
// otherwise show up as the text of whatever section they follow.
const collapseWhitespace = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .replace(
      / ?Import as \S+ with import silk\.[\w.]+(?: as \w+| \{[^}]*\})\./g,
      '',
    )
    .replace(/ ?(?:Public declarations|Category|Profiles): [^.]*\./g, '')
    .trim()

const blockText = (block: Markdown.Block): ReadonlyArray<string> =>
  Match.value(block).pipe(
    Match.tags({
      Paragraph: ({ content }) => [inlineText(content)],
      Heading: ({ content }) => [inlineText(content)],
      List: ({ items }) =>
        Array.flatMap(items, item => Array.flatMap(item.blocks, blockText)),
      Blockquote: ({ blocks }) => Array.flatMap(blocks, blockText),
      Island: ({ blocks }) => Array.flatMap(blocks, blockText),
      Table: ({ headerRow, bodyRows }) =>
        Array.flatMap([headerRow, ...bodyRows], row =>
          Array.map(row.cells, cell => inlineText(cell.content)),
        ),
    }),
    Match.orElse(() => []),
  )

const pageDraft = (title: string): Draft => ({
  anchor: '',
  title,
  label: '',
  crumbs: [],
  level: 1,
  isDeclaration: false,
  texts: [],
  maybeSignature: Option.none(),
})

const declarationDraft = (
  anchor: string,
  text: string,
  level: number,
): Draft => {
  const owner = anchor.split('.')[0] ?? anchor
  return pipe(
    Option.fromNullishOr(MEMBER_HEADING.exec(text)),
    Option.match({
      onNone: () => ({
        title: anchor.includes('.') ? `${owner}.${text}` : text,
        label: '',
      }),
      onSome: ([, kind = '', name = '']) =>
        kind === 'Implementation'
          ? { title: `impl ${name}`, label: kind }
          : { title: `${owner}.${name}`, label: kind },
    }),
    ({ title, label }) => ({
      anchor,
      title,
      label,
      crumbs: [],
      level,
      isDeclaration: true,
      texts: [],
      maybeSignature: Option.none(),
    }),
  )
}

const withText = (draft: Draft, texts: ReadonlyArray<string>): Draft => ({
  ...draft,
  texts: Array.appendAll(draft.texts, texts),
})

const startDraft = (walk: Walk, draft: Draft): Walk => ({
  ...walk,
  drafts: Array.append(walk.drafts, walk.current),
  current: draft,
  maybePendingAnchor: Option.none(),
})

const walkHeading = (
  walk: Walk,
  heading: Markdown.Heading,
  id: string,
  isReference: boolean,
): Walk => {
  const text = headingText(heading)
  if (heading.level === 1) {
    return walk
  }
  const parents = Array.append(
    Array.filter(walk.parents, parent => parent.level < heading.level),
    { level: heading.level, title: text },
  )
  const walkWithParents = { ...walk, parents }
  if (isReference && Option.isSome(walk.maybePendingAnchor)) {
    return startDraft(
      walkWithParents,
      declarationDraft(walk.maybePendingAnchor.value, text, heading.level),
    )
  }
  const isInsideDeclaration =
    walk.current.isDeclaration && heading.level > walk.current.level
  if (isInsideDeclaration) {
    return walkWithParents
  }
  if (heading.level > 3) {
    return { ...walkWithParents, current: withText(walk.current, [text]) }
  }
  return startDraft(walkWithParents, {
    anchor: id,
    title: text,
    label: '',
    crumbs: Array.map(
      Array.filter(walk.parents, parent => parent.level < heading.level),
      parent => parent.title,
    ),
    level: heading.level,
    isDeclaration: false,
    texts: [],
    maybeSignature: Option.none(),
  })
}

const walkBlock =
  (ids: ReadonlyMap<Markdown.Heading, string>, isReference: boolean) =>
  (walk: Walk, block: Markdown.Block): Walk =>
    Match.value(block).pipe(
      Match.tag('Heading', heading =>
        walkHeading(walk, heading, headingId(ids, heading), isReference),
      ),
      Match.tag('Island', island =>
        island.name === 'Anchor'
          ? {
              ...walk,
              maybePendingAnchor: Option.fromNullishOr(island.attributes['id']),
            }
          : { ...walk, current: withText(walk.current, blockText(island)) },
      ),
      Match.tag('CodeBlock', ({ value }) =>
        walk.current.isDeclaration && Option.isNone(walk.current.maybeSignature)
          ? {
              ...walk,
              current: {
                ...walk.current,
                maybeSignature: Option.some(value.trim()),
              },
            }
          : walk,
      ),
      Match.orElse(other => ({
        ...walk,
        current: withText(walk.current, blockText(other)),
      })),
    )

const toSection =
  (pageIndex: number) =>
  (draft: Draft): IndexedSection => {
    const signature = Option.getOrElse(draft.maybeSignature, () => '')
    return [
      pageIndex,
      draft.anchor,
      draft.title,
      String.isEmpty(draft.label) && draft.isDeclaration
        ? labelFromSignature(signature)
        : draft.label,
      draft.crumbs,
      collapseWhitespace(Array.join(draft.texts, ' ')),
      signature,
    ]
  }

export const pageSections = (
  pageIndex: number,
  page: SourcePage,
): ReadonlyArray<IndexedSection> => {
  const walked = Array.reduce(
    page.document.blocks,
    {
      drafts: [],
      current: pageDraft(page.title),
      maybePendingAnchor: Option.none(),
      parents: [],
    } satisfies Walk,
    walkBlock(headingIds(page.document), page.isReference),
  )
  return Array.map(
    Array.append(walked.drafts, walked.current),
    toSection(pageIndex),
  )
}

export const buildIndex = (pages: ReadonlyArray<SourcePage>): SearchIndex => ({
  pages: Array.map(pages, page => [page.key, page.title, page.groupTitle]),
  sections: Array.flatMap(pages, (page, pageIndex) =>
    pageSections(pageIndex, page),
  ),
})
