import {
  Command,
  all,
  click,
  expect,
  first,
  given,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { CopyCode, WaitBeforeHidingCopied, update, view } from '../main'
import { Message } from '../message'
import { AppRoute } from '../route'
import { testModel } from '../testModel'

const homeModel = testModel(AppRoute.Home())

describe('landing page', () => {
  test('shows the hero and the calls to action', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('heading', { level: 1 })).toHaveText(
        'Composability,all the way down.',
      ),
      expect(role('link', { name: 'Take the tour' })).toExist(),
      expect(role('link', { name: 'Install' })).toExist(),
      expect(text('Swap the provider,')).toExist(),
    )
  })

  test('copying a code sample marks it as copied', () => {
    scene(
      { update, view },
      given(homeModel),
      click(first(all.role('button', { name: 'Copy code' }))),
      Command.resolve(
        CopyCode,
        Message.SucceededCopyCode({ codeId: 'home-hello' }),
      ),
      expect(role('button', { name: 'Copied' })).toExist(),
      Command.resolve(
        WaitBeforeHidingCopied,
        Message.CompletedWaitBeforeHidingCopied({ codeId: 'home-hello' }),
      ),
      expect(role('button', { name: 'Copied' })).not.toExist(),
    )
  })
})
