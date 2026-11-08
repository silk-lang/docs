import { Effect, Option, Schema, pipe } from 'effect'
import { Command, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import toolchain from 'virtual:silk-playground'

import { PlaygroundService } from '../playground/service'
import { Message } from './message'
import {
  FormatState,
  LIMITS,
  type Model,
  SCALES,
  type Settings,
  currentAnnotations,
  initialModel,
} from './model'
import { widthToFit } from './scene'

type UpdateReturn = Update.Return<Model, Message, PlaygroundService>

// The element that holds the canvas the page draws the image on. The
// download saves that canvas's pixels.
export const CANVAS_ID = 'snippet-canvas'

// INIT

export const init = (): Update.Return<Model, Message> => ({
  model: initialModel,
})

// COMMAND

export const FormatCode = Command.define('FormatCode', {
  args: { code: Schema.String },
  messages: [Message.SucceededFormat, Message.FailedFormat],
  execute: ({ code }) =>
    Effect.gen(function* () {
      if (toolchain === null) {
        return Message.FailedFormat({
          message:
            'This build of the site has no Silk compiler to format with.',
        })
      }
      const playground = yield* PlaygroundService
      const { outcome } = yield* playground.format(toolchain, code)
      return outcome.tag === 'Formatted'
        ? Message.SucceededFormat({ code: outcome.source })
        : Message.FailedFormat({ message: outcome.message })
    }),
})

const canvasBlob = (
  canvas: HTMLCanvasElement,
): Effect.Effect<Option.Option<Blob>> =>
  Effect.callback<Option.Option<Blob>>(resume => {
    canvas.toBlob(
      blob => resume(Effect.succeed(Option.fromNullishOr(blob))),
      'image/png',
    )
  })

// Saves the canvas as a PNG through a temporary link.
export const DownloadImage = Command.define('DownloadImage', {
  args: { fileName: Schema.String },
  messages: [Message.CompletedDownload],
  execute: ({ fileName }) =>
    Effect.gen(function* () {
      const element = document.querySelector(`#${CANVAS_ID} canvas`)
      if (!(element instanceof HTMLCanvasElement)) {
        return Message.CompletedDownload()
      }
      const maybeBlob = yield* canvasBlob(element)
      yield* Option.match(maybeBlob, {
        onNone: () => Effect.void,
        onSome: blob =>
          Effect.sync(() => {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            link.click()
            URL.revokeObjectURL(url)
          }),
      })
      return Message.CompletedDownload()
    }),
})

// UPDATE

const parseNumber = (value: string): Option.Option<number> =>
  Option.liftPredicate(Number.parseFloat(value), Number.isFinite)

const clamp =
  ({ min, max }: Readonly<{ min: number; max: number }>) =>
  (value: number): number =>
    Math.round(Math.min(max, Math.max(min, value)))

const changeSettings = (
  model: Model,
  change: (settings: Settings) => Settings,
): UpdateReturn => ({
  model: modifyFields(model, { settings: change }),
})

// The image's file name: the snippet's name with `.png` in place of `.silk`.
export const imageFileName = (fileName: string): string => {
  const base = fileName.trim().replace(/\.silk$/, '')
  return `${base === '' ? 'snippet' : base}.png`
}

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedCode: ({ code }) =>
      changeSettings(
        modifyFields(model, { formatState: () => FormatState.Idle() }),
        settings => modifyFields(settings, { code: () => code }),
      ),
    ChangedFileName: ({ fileName }) =>
      changeSettings(model, settings =>
        modifyFields(settings, { fileName: () => fileName }),
      ),
    ChangedWidth: ({ value }) =>
      Option.match(parseNumber(value), {
        onNone: () => ({ model }),
        onSome: width =>
          changeSettings(model, settings =>
            modifyFields(settings, { width: () => clamp(LIMITS.width)(width) }),
          ),
      }),
    ChangedPadding: ({ value }) =>
      Option.match(parseNumber(value), {
        onNone: () => ({ model }),
        onSome: padding =>
          changeSettings(model, settings =>
            modifyFields(settings, {
              padding: () => clamp(LIMITS.padding)(padding),
            }),
          ),
      }),
    ChangedBackground: ({ color }) =>
      changeSettings(model, settings =>
        modifyFields(settings, { background: () => color }),
      ),
    SelectedTheme: ({ theme }) =>
      changeSettings(model, settings =>
        modifyFields(settings, { theme: () => theme }),
      ),
    SelectedScale: ({ value }) =>
      pipe(
        parseNumber(value),
        Option.filter(scale => SCALES.includes(scale)),
        Option.match({
          onNone: () => ({ model }),
          onSome: scale =>
            changeSettings(model, settings =>
              modifyFields(settings, { scale: () => scale }),
            ),
        }),
      ),
    ClickedLineNumbers: () =>
      changeSettings(model, settings =>
        modifyFields(settings, {
          showLineNumbers: showLineNumbers => !showLineNumbers,
        }),
      ),
    ClickedWindow: () =>
      changeSettings(model, settings =>
        modifyFields(settings, { showWindow: showWindow => !showWindow }),
      ),
    ClickedErrors: () =>
      changeSettings(model, settings =>
        modifyFields(settings, { showErrors: showErrors => !showErrors }),
      ),
    ClickedInlayHints: () =>
      changeSettings(model, settings =>
        modifyFields(settings, {
          showInlayHints: showInlayHints => !showInlayHints,
        }),
      ),
    ReceivedAnnotations: ({ code, annotations }) => ({
      model: modifyFields(model, {
        maybeAnnotated: () => Option.some({ code, annotations }),
      }),
    }),
    ClickedFitWidth: () =>
      changeSettings(model, settings =>
        modifyFields(settings, {
          width: () =>
            clamp(LIMITS.width)(
              widthToFit(settings, currentAnnotations(model)),
            ),
        }),
      ),
    ClickedFormat: () =>
      model.formatState._tag === 'Formatting'
        ? { model }
        : {
            model: modifyFields(model, {
              formatState: () => FormatState.Formatting(),
            }),
            commands: [FormatCode({ code: model.settings.code })],
          },
    SucceededFormat: ({ code }) =>
      changeSettings(
        modifyFields(model, { formatState: () => FormatState.Idle() }),
        settings => modifyFields(settings, { code: () => code }),
      ),
    FailedFormat: ({ message: failure }) => ({
      model: modifyFields(model, {
        formatState: () => FormatState.Failed({ message: failure }),
      }),
    }),
    ClickedDownload: () => ({
      model,
      commands: [
        DownloadImage({ fileName: imageFileName(model.settings.fileName) }),
      ],
    }),
    CompletedDownload: () => ({ model }),
    LoadedFonts: () => ({
      model: modifyFields(model, { areFontsReady: () => true }),
    }),
  })
