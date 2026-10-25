import {
  Command,
  Mount,
  click,
  expect,
  given,
  role,
  scene,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import { update, view } from '../main'
import { AppRoute } from '../route'
import * as Search from '../search'
import { testModel } from '../testModel'

const installRoute = AppRoute.DocPage({
  directory: 'get-started',
  slug: 'install',
})

describe('docs sidebar', () => {
  test('a collapsed group opens when its header is clicked', () => {
    scene(
      { update, view },
      given(testModel(installRoute)),
      expect(role('link', { name: 'Your first program' })).not.toExist(),
      click(role('button', { name: /Get started/ })),
      expect(role('link', { name: 'Your first program' })).toExist(),
      click(role('button', { name: /Get started/ })),
      expect(role('link', { name: 'Your first program' })).not.toExist(),
    )
  })

  test('the search button opens the search dialog', () => {
    scene(
      { update, view },
      given(testModel(installRoute)),
      expect(role('combobox', { name: 'Search the docs' })).not.toExist(),
      click(role('button', { name: 'Search docs' })),
      Command.resolveAll(
        [Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()],
        [Search.FocusSearchInput, Search.Message.CompletedFocusSearchInput()],
        [Search.WarmIndex, Search.Message.CompletedWarmIndex()],
        [
          Search.LoadRecentSearches,
          Search.Message.CompletedLoadRecentSearches({ queries: ['arena'] }),
        ],
      ),
      Mount.resolve(
        Dialog.AcquireResources,
        Dialog.Message.SucceededAcquireResources(),
      ),
      expect(role('combobox', { name: 'Search the docs' })).toExist(),
      expect(role('button', { name: 'arena' })).toExist(),
    )
  })
})
