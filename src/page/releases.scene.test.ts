import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { CopyCode, WaitBeforeHidingCopied, update, view } from '../main'
import { Message } from '../message'
import { MINISIGN_PUBLIC_KEY } from '../releases/release'
import { AppRoute } from '../route'
import { testModel } from '../testModel'

describe('releases page', () => {
  test('lists releases newest first with their downloads', () => {
    scene(
      { update, view },
      given(testModel(AppRoute.Releases())),
      expect(role('heading', { name: 'Download Silk' })).toExist(),
      expect(role('heading', { name: '0.1.0-dev.2' })).toExist(),
      expect(role('heading', { name: '0.1.0-dev.1' })).toExist(),
      expect(text('Latest')).toExist(),
      expect(
        role('link', {
          name: 'silk-0.1.0-dev.2+8cd8230a9060-aarch64-apple-darwin.tar.gz',
        }),
      ).toExist(),
      expect(
        role('link', {
          name: 'silk-0.1.0-dev.2+8cd8230a9060-x86_64-pc-windows-msvc.zip',
        }),
      ).toExist(),
      expect(text('6.3 MiB')).toExist(),
    )
  })

  test('the minisign public key can be copied', () => {
    scene(
      { update, view },
      given(testModel(AppRoute.Releases())),
      expect(text(MINISIGN_PUBLIC_KEY)).toExist(),
      click(role('button', { name: 'Copy code' })),
      Command.resolve(
        CopyCode,
        Message.SucceededCopyCode({ codeId: 'minisign-key' }),
      ),
      expect(role('button', { name: 'Copied' })).toExist(),
      Command.resolve(
        WaitBeforeHidingCopied,
        Message.CompletedWaitBeforeHidingCopied({ codeId: 'minisign-key' }),
      ),
    )
  })
})
