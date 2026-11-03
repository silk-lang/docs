import { Array, Effect, Option, Schema, pipe } from 'effect'
import { Command, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import toolchain from 'virtual:silk-playground'

import { Message } from './message'
import {
  Example,
  HELLO,
  type Model,
  RunOutcome,
  RunState,
  Target,
} from './model'
import { type Outcome } from './protocol'
import { PlaygroundService } from './service'

type UpdateReturn = Update.Return<Model, Message, PlaygroundService>

// INIT

export const init = (): Update.Return<Model, Message> => ({
  model: {
    examples: [HELLO],
    examplesState: 'Idle',
    exampleId: HELLO.id,
    source: HELLO.source,
    target: HELLO.target,
    runState: RunState.Idle(),
  },
})

// COMMAND

export const LoadExamples = Command.define('LoadExamples', {
  messages: [Message.SucceededLoadExamples, Message.FailedLoadExamples],
  execute: Effect.tryPromise(
    () => import('virtual:silk-playground-examples'),
  ).pipe(
    Effect.flatMap(module =>
      Schema.decodeUnknownEffect(Schema.Array(Example))(module.default),
    ),
    Effect.map(examples => Message.SucceededLoadExamples({ examples })),
    Effect.catch(() => Effect.succeed(Message.FailedLoadExamples())),
  ),
})

const toRunOutcome = (outcome: Outcome): RunOutcome => {
  switch (outcome.tag) {
    case 'Exited':
      return RunOutcome.Exited({ code: outcome.code })
    case 'CompileFailed':
      return RunOutcome.CompileFailed({ code: outcome.code })
    case 'Trapped':
      return RunOutcome.Trapped({ message: outcome.message })
    case 'ToolchainFailed':
      return RunOutcome.ToolchainFailed({ message: outcome.message })
    case 'Stopped':
      return RunOutcome.Stopped()
  }
}

export const RunProgram = Command.define('RunProgram', {
  args: { source: Schema.String, target: Target },
  messages: [Message.CompletedRun],
  execute: ({ source, target }) =>
    Effect.gen(function* () {
      const playground = yield* PlaygroundService
      if (toolchain === null) {
        return Message.CompletedRun({
          output: [],
          outcome: RunOutcome.ToolchainFailed({
            message: 'This build of the site has no playground toolchain.',
          }),
          compileMilliseconds: 0,
          runMilliseconds: 0,
        })
      }
      const response = yield* playground.run(toolchain, source, target)
      return Message.CompletedRun({
        output: response.output,
        outcome: toRunOutcome(response.outcome),
        compileMilliseconds: response.compileMilliseconds,
        runMilliseconds: response.runMilliseconds,
      })
    }),
})

export const StopProgram = Command.define('StopProgram', {
  messages: [Message.CompletedStop],
  execute: Effect.gen(function* () {
    const playground = yield* PlaygroundService
    yield* playground.stop
    return Message.CompletedStop()
  }),
})

// UPDATE

// Called when the reader opens the playground: the examples download once.
export const enter = (model: Model): UpdateReturn =>
  model.examplesState === 'Idle'
    ? {
        model: modifyFields(model, { examplesState: () => 'Loading' }),
        commands: [LoadExamples()],
      }
    : { model }

const startRun = (model: Model): UpdateReturn =>
  model.runState._tag === 'Running' || toolchain === null
    ? { model }
    : {
        model: modifyFields(model, { runState: () => RunState.Running() }),
        commands: [RunProgram({ source: model.source, target: model.target })],
      }

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedSource: ({ source }) => ({
      model: modifyFields(model, { source: () => source }),
    }),
    SelectedExample: ({ id }) =>
      pipe(
        Array.findFirst(model.examples, example => example.id === id),
        Option.match({
          onNone: () => ({ model }),
          onSome: example => ({
            model: modifyFields(model, {
              exampleId: () => example.id,
              source: () => example.source,
              target: () => example.target,
            }),
          }),
        }),
      ),
    ClickedRun: () => startRun(model),
    PressedRunShortcut: () => startRun(model),
    ClickedStop: () =>
      model.runState._tag === 'Running'
        ? { model, commands: [StopProgram()] }
        : { model },
    CompletedRun: result => ({
      model: modifyFields(model, {
        runState: () =>
          RunState.Finished({
            output: result.output,
            outcome: result.outcome,
            compileMilliseconds: result.compileMilliseconds,
            runMilliseconds: result.runMilliseconds,
          }),
      }),
    }),
    CompletedStop: () => ({ model }),
    SucceededLoadExamples: ({ examples }) => ({
      model: modifyFields(model, {
        examples: () => [HELLO, ...examples],
        examplesState: () => 'Loaded',
      }),
    }),
    FailedLoadExamples: () => ({
      model: modifyFields(model, { examplesState: () => 'Failed' }),
    }),
  })
