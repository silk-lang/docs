import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ShowFile } from './editor'
import { Message } from './message'
import { BUILT_IN, MAIN_FILE, RunOutcome, RunState, fromArchive } from './model'
import {
  LoadExamples,
  RunProgram,
  StopProgram,
  enter,
  init,
  update,
} from './update'

const initModel = init().model

const sieve = {
  id: 'algorithms/sieve',
  title: 'Sieve of Eratosthenes',
  target: 'wasm32-wasip1' as const,
  source: 'pub fn main() -> i32 { return 77 }\n',
}

describe('playground', () => {
  test('opening the page loads the examples once', () => {
    const entered = enter(initModel)
    expect(entered.model.examplesState).toBe('Loading')
    expect(enter(entered.model).commands ?? []).toHaveLength(0)
    expect(entered.commands?.map(command => command.name)).toEqual([
      LoadExamples.name,
    ])
    story(
      update,
      given(entered.model),
      message(Message.SucceededLoadExamples({ examples: [sieve] })),
      model(model => {
        expect(model.examples).toEqual([...BUILT_IN, fromArchive(sieve)])
        expect(model.examplesState).toBe('Loaded')
      }),
    )
  })

  test('choosing an example replaces the files and target', () => {
    story(
      update,
      given(initModel),
      message(Message.SucceededLoadExamples({ examples: [sieve] })),
      message(Message.SelectedExample({ id: sieve.id })),
      model(model => {
        expect(model.files).toEqual([{ name: MAIN_FILE, source: sieve.source }])
        expect(model.activeFile).toBe(MAIN_FILE)
        expect(model.exampleId).toBe(sieve.id)
      }),
    )
  })

  test('running shows the output and how the program ended', () => {
    const output = [{ stream: 'stdout' as const, text: 'Hello, world!\n' }]
    story(
      update,
      given(initModel),
      message(Message.ClickedRun()),
      model(model => {
        expect(model.runState).toEqual(RunState.Running())
      }),
      Command.resolve(
        RunProgram,
        Message.CompletedRun({
          output,
          outcome: RunOutcome.Exited({ code: 0 }),
          compileMilliseconds: 900,
          runMilliseconds: 10,
        }),
      ),
      model(model => {
        expect(model.runState).toEqual(
          RunState.Finished({
            output,
            outcome: RunOutcome.Exited({ code: 0 }),
            compileMilliseconds: 900,
            runMilliseconds: 10,
          }),
        )
      }),
    )
  })

  test('editing a file keeps the others, and a tab shows its file', () => {
    const modules = BUILT_IN[1]!
    story(
      update,
      given(initModel),
      message(Message.SelectedExample({ id: modules.id })),
      message(
        Message.ChangedSource({ name: 'shapes.silk', source: '// edited\n' }),
      ),
      model(model => {
        expect(model.files.map(file => file.name)).toEqual([
          MAIN_FILE,
          'shapes.silk',
        ])
        expect(model.files[0]).toEqual(modules.files[0])
        expect(model.files[1]?.source).toBe('// edited\n')
      }),
      message(Message.SelectedFile({ name: 'shapes.silk' })),
      model(model => {
        expect(model.activeFile).toBe('shapes.silk')
      }),
      Command.resolve(ShowFile, Message.CompletedShowFile()),
    )
  })

  test('stop is offered only while a program runs', () => {
    expect(update(initModel, Message.ClickedStop()).commands ?? []).toEqual([])
    const running = update(initModel, Message.ClickedRun()).model
    expect(
      update(running, Message.ClickedStop()).commands?.map(
        command => command.name,
      ),
    ).toEqual([StopProgram.name])
  })
})
