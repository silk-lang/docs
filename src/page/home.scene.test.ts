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
import { readFileSync } from 'node:fs'
import { describe, expect as expectValue, test } from 'vitest'

import {
  CopyCode,
  RunFibers,
  WaitBeforeHidingCopied,
  update,
  view,
} from '../main'
import { Message } from '../message'
import { AppRoute } from '../route'
import { testModel } from '../testModel'
import { FIBERS_CODE } from './home'

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

  test('running the fibers example shows what it returned', () => {
    scene(
      { update, view },
      given(homeModel),
      click(role('button', { name: 'Run' })),
      expect(role('button', { name: 'Running' })).toBeDisabled(),
      Command.resolve(
        RunFibers,
        Message.SucceededRunFibers({ value: 42, milliseconds: 2004 }),
      ),
      expect(text('in 2.00s', { exact: false })).toExist(),
      expect(role('button', { name: 'Run again' })).toExist(),
    )
  })

  // The page shows the example; demos/fibers compiles the same code to wasm.
  test('the fibers example matches the program that runs', () => {
    const source = readFileSync('demos/fibers/src/main.silk', 'utf8')
    expectValue(source).toContain(FIBERS_CODE)
  })
})
