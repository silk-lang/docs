import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ShowFile } from './editor'
import { Message } from './message'
import { EXAMPLES, MAIN_FILE, RunOutcome, RunState } from './model'
import { RunProgram, StopProgram, init, update } from './update'

const initModel = init().model

const exampleWithId = (id: string) => {
  const example = EXAMPLES.find(candidate => candidate.id === id)
  if (example === undefined) {
    throw new Error(`No example ${id}`)
  }
  return example
}

describe('playground', () => {
  test('choosing an example replaces the files and target', () => {
    const sieve = exampleWithId('sieve')
    story(
      update,
      given(initModel),
      message(Message.SelectedExample({ id: sieve.id })),
      model(model => {
        expect(model.files).toEqual(sieve.files)
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
        expect(model.runState).toEqual(RunState.Running({ output: [] }))
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

  test('output shows while the program runs, joined by stream', () => {
    const running = { ...initModel, runState: RunState.Running({ output: [] }) }
    story(
      update,
      given(running),
      message(
        Message.ReceivedRunOutput({
          clear: false,
          output: [{ stream: 'stdout', text: 'download started\n' }],
        }),
      ),
      message(
        Message.ReceivedRunOutput({
          clear: false,
          output: [
            { stream: 'stdout', text: 'resize finished\n' },
            { stream: 'stderr', text: 'warning\n' },
          ],
        }),
      ),
      model(model => {
        expect(model.runState).toEqual(
          RunState.Running({
            output: [
              {
                stream: 'stdout',
                text: 'download started\nresize finished\n',
              },
              { stream: 'stderr', text: 'warning\n' },
            ],
          }),
        )
      }),
    )
  })

  test('a program that clears the screen keeps only the new frame', () => {
    const running = {
      ...initModel,
      runState: RunState.Running({
        output: [
          { stream: 'compiler', text: 'Compiled work/main.silk\n' },
          { stream: 'stdout', text: 'Generation 0\n' },
        ],
      }),
    }
    story(
      update,
      given(running),
      message(
        Message.ReceivedRunOutput({
          clear: true,
          output: [{ stream: 'stdout', text: 'Generation 1\n' }],
        }),
      ),
      model(model => {
        expect(model.runState).toEqual(
          RunState.Running({
            output: [
              { stream: 'compiler', text: 'Compiled work/main.silk\n' },
              { stream: 'stdout', text: 'Generation 1\n' },
            ],
          }),
        )
      }),
    )
  })

  test('stopping a program keeps the output it streamed', () => {
    const frame = [{ stream: 'stdout' as const, text: 'Generation 7\n' }]
    story(
      update,
      given({ ...initModel, runState: RunState.Running({ output: frame }) }),
      message(
        Message.CompletedRun({
          output: [],
          outcome: RunOutcome.Stopped(),
          compileMilliseconds: 0,
          runMilliseconds: 0,
        }),
      ),
      model(model => {
        expect(model.runState).toEqual(
          RunState.Finished({
            output: frame,
            outcome: RunOutcome.Stopped(),
            compileMilliseconds: 0,
            runMilliseconds: 0,
          }),
        )
      }),
    )
  })

  test('editing a file keeps the others, and a tab shows its file', () => {
    const modules = exampleWithId('modules')
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
