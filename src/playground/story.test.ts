import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message } from './message'
import { HELLO, RunOutcome, RunState } from './model'
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
        expect(model.examples).toEqual([HELLO, sieve])
        expect(model.examplesState).toBe('Loaded')
      }),
    )
  })

  test('choosing an example replaces the source and target', () => {
    story(
      update,
      given(initModel),
      message(Message.SucceededLoadExamples({ examples: [sieve] })),
      message(Message.SelectedExample({ id: sieve.id })),
      model(model => {
        expect(model.source).toBe(sieve.source)
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
