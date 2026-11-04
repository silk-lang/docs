import { Array, Effect, Option, Schema, pipe } from 'effect'
import { Command, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import toolchain from 'virtual:silk-playground'

import { ShowFile } from './editor'
import { Message } from './message'
import {
  EXAMPLES,
  MAIN_FILE,
  type Model,
  RunOutcome,
  RunState,
  SourceFile,
  Target,
} from './model'
import { type Outcome } from './protocol'
import { PlaygroundService } from './service'

type UpdateReturn = Update.Return<Model, Message, PlaygroundService>

// INIT

export const init = (): Update.Return<Model, Message> => {
  const [first] = EXAMPLES
  return {
    model: {
      examples: EXAMPLES,
      exampleId: first.id,
      files: first.files,
      activeFile: MAIN_FILE,
      target: first.target,
      runState: RunState.Idle(),
    },
  }
}

// COMMAND

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
  args: { files: Schema.Array(SourceFile), target: Target },
  messages: [Message.CompletedRun],
  execute: ({ files, target }) =>
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
      const response = yield* playground.run(toolchain, files, target)
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

const startRun = (model: Model): UpdateReturn =>
  model.runState._tag === 'Running' || toolchain === null
    ? { model }
    : {
        model: modifyFields(model, { runState: () => RunState.Running() }),
        commands: [RunProgram({ files: model.files, target: model.target })],
      }

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedSource: ({ name, source }) => ({
      model: modifyFields(model, {
        files: () =>
          Array.map(model.files, file =>
            file.name === name ? { name, source } : file,
          ),
      }),
    }),
    SelectedFile: ({ name }) =>
      Array.some(model.files, file => file.name === name)
        ? {
            model: modifyFields(model, { activeFile: () => name }),
            commands: [ShowFile({ name })],
          }
        : { model },
    CompletedShowFile: () => ({ model }),
    SelectedExample: ({ id }) =>
      pipe(
        Array.findFirst(model.examples, example => example.id === id),
        Option.match({
          onNone: () => ({ model }),
          onSome: example => ({
            model: modifyFields(model, {
              exampleId: () => example.id,
              files: () => example.files,
              activeFile: () => MAIN_FILE,
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
  })
