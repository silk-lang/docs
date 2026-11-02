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
        'Built for the way software is written today.',
      ),
      expect(role('link', { name: 'Take the tour' })).toExist(),
      expect(role('link', { name: 'Install' })).toExist(),
      expect(text('One program, annotated.')).toExist(),
      expect(
        text('silk-lang/silk/main/install.sh', { exact: false }),
      ).toExist(),
    )
  })

  test('the install tabs switch the command', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('tab', { name: 'macOS · Linux', selected: true })).toExist(),
      click(role('tab', { name: 'Windows' })),
      expect(role('tab', { name: 'Windows', selected: true })).toExist(),
      expect(
        text('silk-lang/silk/main/install.ps1', { exact: false }),
      ).toExist(),
      expect(
        text('silk-lang/silk/main/install.sh', { exact: false }),
      ).not.toExist(),
    )
  })

  test('the example tabs switch the example', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('heading', { name: 'Fiber.forkChild' })).toExist(),
      click(role('tab', { name: 'Borrow checker' })),
      expect(role('heading', { name: 'Conflicting loans' })).toExist(),
      expect(text('error[OWN0010]')).toExist(),
      click(role('tab', { name: 'Memory' })),
      expect(role('heading', { name: 'Arena' })).toExist(),
    )
  })

  test('copying a code sample marks it as copied', () => {
    scene(
      { update, view },
      given(homeModel),
      click(first(all.role('button', { name: 'Copy code' }))),
      Command.resolve(
        CopyCode,
        Message.SucceededCopyCode({ codeId: 'home-hero' }),
      ),
      expect(role('button', { name: 'Copied' })).toExist(),
      Command.resolve(
        WaitBeforeHidingCopied,
        Message.CompletedWaitBeforeHidingCopied({ codeId: 'home-hero' }),
      ),
      expect(role('button', { name: 'Copied' })).not.toExist(),
    )
  })
})
