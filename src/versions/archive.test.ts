import { HashMap, Option } from 'effect'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { update } from '../main'
import { Message } from '../message'
import { CatalogState, DocState } from '../model'
import { AppRoute, urlToAppRoute } from '../route'
import { testModel } from '../testModel'
import { type ArchivedCatalog, versionedUrl } from './archive'

const catalog: ArchivedCatalog = {
  version: '0.1.0-dev.1',
  tag: 'v0.1.0-dev.1+aaaaaaaaaaaa',
  publishedAt: '2026-10-01T00:00:00Z',
  docsCommit: null,
  format: 'test',
  groups: [
    {
      key: 'std',
      title: 'Standard library',
      pages: [
        {
          directory: 'std',
          slug: 'overview',
          title: 'Overview',
          sourceUrl: 'https://github.com/silk-lang/silk',
          document: 'abc',
        },
      ],
    },
  ],
}

const url = (path: string) =>
  Option.getOrThrow(fromString(`https://silk.test${path}`))

describe('archived versions', () => {
  test('an archived page parses as its own route', () => {
    expect(urlToAppRoute(url('/v/0.1.0-dev.1/docs/std/overview'))).toEqual(
      AppRoute.VersionedDocPage({
        version: '0.1.0-dev.1',
        directory: 'std',
        slug: 'overview',
      }),
    )
    expect(urlToAppRoute(url('/v/0.1.0-dev.1/docs'))).toEqual(
      AppRoute.VersionedDocs({ version: '0.1.0-dev.1' }),
    )
  })

  test('opening an archived page downloads its catalog, then its document', () => {
    const { model: waiting, commands = [] } = update(
      testModel(AppRoute.Home()),
      Message.ChangedUrl({ url: url('/v/0.1.0-dev.1/docs/std/overview') }),
    )
    expect(commands.map(command => command.name)).toContain('LoadCatalog')
    expect(waiting.doc._tag).toBe('Loading')

    const { model: loading, commands: next = [] } = update(
      waiting,
      Message.SucceededLoadCatalog({ version: '0.1.0-dev.1', catalog }),
    )
    expect(
      HashMap.get(loading.versionCatalogs, '0.1.0-dev.1').pipe(
        Option.map(state => state._tag),
      ),
    ).toEqual(Option.some('Loaded'))
    expect(loading.doc).toEqual(DocState.Loading({ key: 'archive:abc' }))
    expect(next.map(command => command.name)).toEqual(['LoadDocument'])
  })

  test('a catalog that cannot be downloaded fails the page', () => {
    const { model: waiting } = update(
      testModel(AppRoute.Home()),
      Message.ChangedUrl({ url: url('/v/0.1.0-dev.1/docs/std/overview') }),
    )
    const { model } = update(
      waiting,
      Message.FailedLoadCatalog({ version: '0.1.0-dev.1' }),
    )
    expect(HashMap.get(model.versionCatalogs, '0.1.0-dev.1')).toEqual(
      Option.some(CatalogState.Failed()),
    )
    expect(model.doc._tag).toBe('Failed')
  })

  test('docs links stay inside the version', () => {
    expect(versionedUrl('0.1.0-dev.1', '/docs/book/ownership#moves')).toBe(
      '/v/0.1.0-dev.1/docs/book/ownership#moves',
    )
    expect(versionedUrl('0.1.0-dev.1', '/releases')).toBe('/releases')
    expect(versionedUrl('0.1.0-dev.1', 'https://example.com/docs/x')).toBe(
      'https://example.com/docs/x',
    )
  })
})
