import { click, expect, given, role, scene, text, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { update, view } from '../main'
import { AppRoute } from '../route'
import { testModel } from '../testModel'

const installRoute = AppRoute.DocPage({ directory: 'start', slug: 'install' })

describe('docs sidebar', () => {
  test('a collapsed group opens when its header is clicked', () => {
    scene(
      { update, view },
      given(testModel(installRoute)),
      expect(role('link', { name: 'Quick start' })).not.toExist(),
      click(role('button', { name: /Get started/ })),
      expect(role('link', { name: 'Quick start' })).toExist(),
      click(role('button', { name: /Get started/ })),
      expect(role('link', { name: 'Quick start' })).not.toExist(),
    )
  })

  test('searching filters pages across every group', () => {
    scene(
      { update, view },
      given(testModel(installRoute)),
      type(role('searchbox', { name: 'Search docs' }), 'tour'),
      expect(role('link', { name: 'A short tour' })).toExist(),
      expect(role('link', { name: 'Quick start' })).not.toExist(),
    )
  })

  test('a search with no results says so', () => {
    scene(
      { update, view },
      given(testModel(installRoute)),
      type(role('searchbox', { name: 'Search docs' }), 'zzzz'),
      expect(text('No pages match "zzzz".')).toExist(),
    )
  })
})
