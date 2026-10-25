import { HashMap, HashSet, Option } from 'effect'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import * as Markdown from '@foldkit/markdown'

import { update } from '../main'
import { Message } from '../message'
import { DocState } from '../model'
import { AppRoute } from '../route'
import { testModel } from '../testModel'

const document: Markdown.MarkdownDocument = { blocks: [] }

const ownership = AppRoute.DocPage({ directory: 'book', slug: 'ownership' })

const changeUrlTo = (path: string): Message =>
  Message.ChangedUrl({
    url: Option.getOrThrow(fromString(`https://silk.test${path}`)),
  })

describe('document prefetching', () => {
  test('a downloaded document shows at once when its page opens', () => {
    const model = {
      ...testModel(ownership),
      documents: HashMap.make(['book/lifetimes-in-practice', document]),
    }
    const { model: nextModel } = update(
      model,
      changeUrlTo('/docs/book/lifetimes-in-practice'),
    )
    expect(nextModel.doc).toEqual(
      DocState.Loaded({ key: 'book/lifetimes-in-practice', document }),
    )
  })

  test('a document that is not downloaded yet loads once', () => {
    const { model: loadingModel, commands = [] } = update(
      testModel(ownership),
      changeUrlTo('/docs/book/lifetimes-in-practice'),
    )
    expect(loadingModel.doc._tag).toBe('Loading')
    expect(commands.map(command => command.name)).toContain('LoadDocument')

    const { model: samePointModel, commands: pointCommands = [] } = update(
      loadingModel,
      Message.PointedAtDocLink({ key: 'book/lifetimes-in-practice' }),
    )
    expect(pointCommands).toEqual([])
    expect(
      HashSet.has(
        samePointModel.requestedDocumentKeys,
        'book/lifetimes-in-practice',
      ),
    ).toBe(true)
  })
})
