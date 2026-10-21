import { HashSet } from 'effect'
import { expect, given, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Model, update, view } from './main'
import { AppRoute } from './route'

describe('site chrome', () => {
  test('the navigation links to docs, releases and GitHub', () => {
    scene(
      { update, view },
      given(
        Model.make({ route: AppRoute.Home(), copiedCodeIds: HashSet.empty() }),
      ),
      expect(role('link', { name: 'Docs' })).toExist(),
      expect(role('link', { name: 'Releases' })).toExist(),
      expect(role('link', { name: 'GitHub' })).toExist(),
    )
  })

  test('the current section is marked in the navigation', () => {
    scene(
      { update, view },
      given(
        Model.make({
          route: AppRoute.Releases(),
          copiedCodeIds: HashSet.empty(),
        }),
      ),
      expect(role('link', { name: 'Releases', current: 'page' })).toExist(),
    )
  })
})
