// The editor on the page: a Mount that puts Monaco on its element and
// reports edits, and a Command that switches the file it shows. The editor
// owns its text once mounted; the Model keeps a copy for running.

import { Effect, Queue, Schema, Stream } from 'effect'
import { Command, Mount } from 'foldkit'
import toolchain from 'virtual:silk-playground'

import { Message } from './message'
import { SourceFile } from './model'

type Editor = import('./monaco-editor').Editor

type EditorMessage =
  | ReturnType<typeof Message.ChangedSource>
  | ReturnType<typeof Message.PressedRunShortcut>

// The editors on the page, by their element. There is one at a time; it is
// remounted when the example changes.
const editors = new Map<string, Editor>()

export const EDITOR_ELEMENT_ID = 'playground-editor'

export const MountEditor = Mount.defineStream('MountEditor', {
  args: {
    initialFiles: Schema.Array(SourceFile),
    initialFile: Schema.String,
  },
  messages: [Message.ChangedSource, Message.PressedRunShortcut],
  execute: ({ element, initialFiles, initialFile }) =>
    Stream.callback<EditorMessage>(queue =>
      Effect.acquireRelease(
        Effect.promise(() => import('./monaco-editor')).pipe(
          Effect.map(({ makeEditor }) => {
            const editor = makeEditor({
              element: element instanceof HTMLElement ? element : document.body,
              files: initialFiles,
              shown: initialFile,
              toolchain,
              onChange: (name, source) => {
                Queue.offerUnsafe(
                  queue,
                  Message.ChangedSource({ name, source }),
                )
              },
              onRun: () => {
                Queue.offerUnsafe(queue, Message.PressedRunShortcut())
              },
            })
            editors.set(EDITOR_ELEMENT_ID, editor)
            return editor
          }),
        ),
        editor =>
          Effect.sync(() => {
            if (editors.get(EDITOR_ELEMENT_ID) === editor) {
              editors.delete(EDITOR_ELEMENT_ID)
            }
            editor.dispose()
          }),
      ),
    ),
})

export const ShowFile = Command.define('ShowFile', {
  args: { name: Schema.String },
  messages: [Message.CompletedShowFile],
  execute: ({ name }) =>
    Effect.sync(() => {
      editors.get(EDITOR_ELEMENT_ID)?.show(name)
      return Message.CompletedShowFile()
    }),
})
