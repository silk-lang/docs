import { Duration, Effect, Option, Schema, pipe } from 'effect'
import { Command, Mount, type Update } from 'foldkit'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import toolchain from 'virtual:silk-playground'

import { PlaygroundService } from '../playground/service'
import { Message } from './message'
import {
  FormatState,
  LIMITS,
  type Model,
  SCALES,
  Settings,
  currentAnnotations,
  initialModel,
} from './model'
import { widthToFit } from './scene'
import { fromSearch, snippetPath, toJson } from './share'

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

// The address of the document the page's section is mounted in. Mounting
// comes after hydration, so the first render matches the prerendered page,
// and it also covers arriving from another page without a reload. The Mount
// only reads the address; a hydrated element can be replaced, which would
// cut its work short, so the decoding runs as a Command.
export const ReadAddress = Mount.define('ReadAddress', {
  messages: [Message.MountedPage],
  execute: ({ element }) =>
    Effect.sync(() =>
      Message.MountedPage({ search: element.ownerDocument.location.search }),
    ),
})

export const DecodeAddress = Command.define('DecodeAddress', {
  args: { search: Schema.String },
  messages: [Message.ReadAddress],
  execute: ({ search }) =>
    Effect.promise(() => fromSearch(search)).pipe(
      Effect.map(maybeSettings => Message.ReadAddress({ maybeSettings })),
    ),
})

// How long the settings have to stay the same before the address follows.
// Browsers limit how often a page may replace its address.
const ADDRESS_SETTLE = Duration.millis(400)

export const WaitToWriteAddress = Command.define('WaitToWriteAddress', {
  args: { settings: Settings },
  messages: [Message.CompletedWaitToWriteAddress],
  execute: ({ settings }) =>
    Effect.sleep(ADDRESS_SETTLE).pipe(
      Effect.as(Message.CompletedWaitToWriteAddress({ settings })),
    ),
})

// Replaces the history entry, so editing does not add one per change. A
// reader who left the page keeps the page they went to.
export const WriteAddress = Command.define('WriteAddress', {
  args: { settings: Settings },
  messages: [Message.CompletedWriteAddress],
  execute: ({ settings }) =>
    Effect.promise(() => snippetPath(settings)).pipe(
      Effect.flatMap(path =>
        window.location.pathname === '/snippet' &&
        `${window.location.pathname}${window.location.search}` !== path
          ? replaceUrl(path)
          : Effect.void,
      ),
      Effect.as(Message.CompletedWriteAddress()),
    ),
})

// The address follows the settings once it has been read, so a link is
// not replaced by the defaults before it loads.
export const update = (model: Model, message: Message): UpdateReturn => {
  const result = step(model, message)
  return result.model.isAddressRead &&
    toJson(result.model.settings) !== toJson(model.settings)
    ? {
        ...result,
        commands: [
          ...(result.commands ?? []),
          WaitToWriteAddress({ settings: result.model.settings }),
        ],
      }
    : result
}

const step = (model: Model, message: Message) =>
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
    MountedPage: ({ search }) => ({
      model,
      commands: [DecodeAddress({ search })],
    }),
    ReadAddress: ({ maybeSettings }) => ({
      model: modifyFields(model, {
        isAddressRead: () => true,
        settings: settings => Option.getOrElse(maybeSettings, () => settings),
      }),
    }),
    CompletedWaitToWriteAddress: ({ settings }) =>
      toJson(settings) === toJson(model.settings)
        ? { model, commands: [WriteAddress({ settings })] }
        : { model },
    CompletedWriteAddress: () => ({ model }),
    LoadedFonts: () => ({
      model: modifyFields(model, { areFontsReady: () => true }),
    }),
  })
