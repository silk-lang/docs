import { Array } from 'effect'
import { Submodel } from 'foldkit'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import toolchain from 'virtual:silk-playground'

import { EDITOR_ELEMENT_ID, MountEditor } from './editor'
import { Message } from './message'
import {
  type Model,
  type RunChunk,
  RunOutcome,
  RunState,
  type SourceFile,
} from './model'

const EXAMPLE_ID = 'playground-example'

const label = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('label text-muted')], [text])

const header = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col items-start gap-5 px-5 pt-12 md:px-20')],
    [
      h.span(
        [h.Class('label rounded-full bg-ink px-3 py-1.5 text-paper')],
        ['Playground'],
      ),
      h.h1(
        [
          h.Class(
            'text-4xl leading-none font-bold tracking-tighter md:text-6xl',
          ),
        ],
        ['Run Silk in your browser'],
      ),
      h.p(
        [h.Class('max-w-[38.75rem] text-lg leading-prose text-muted')],
        [
          'The Silk compiler runs on this page as WebAssembly and builds your program with its own WebAssembly backend, so nothing is sent to a server. The first run downloads the compiler and the standard library.',
        ],
      ),
    ],
  )

const exampleOption = (
  model: Model,
  example: Model['examples'][number],
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('option')(
    example.id,
    [h.Value(example.id), h.Selected(example.id === model.exampleId)],
    [example.title],
  )

const exampleSelect = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex min-w-0 items-center gap-3')],
    [
      h.label([h.For(EXAMPLE_ID), h.Class('label text-muted')], ['Example']),
      h.select(
        [
          h.Id(EXAMPLE_ID),
          h.OnChange(id => Message.SelectedExample({ id })),
          h.Class(
            'min-w-0 rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink',
          ),
        ],
        Array.map(model.examples, example => exampleOption(model, example, h)),
      ),
    ],
  )

const isRunning = (model: Model): boolean => model.runState._tag === 'Running'

const runButton = (model: Model, h: HtmlBuilder<Message>): Html =>
  isRunning(model)
    ? h.button(
        [
          h.Type('button'),
          h.OnClick(Message.ClickedStop()),
          h.Class(
            'inline-flex cursor-pointer items-center rounded-full border border-ink px-5 py-2 text-sm font-bold text-ink hover:bg-ink hover:text-paper',
          ),
        ],
        ['Stop'],
      )
    : h.button(
        [
          h.Type('button'),
          h.OnClick(Message.ClickedRun()),
          h.Disabled(toolchain === null),
          h.Class(
            'inline-flex cursor-pointer items-center rounded-full border border-ink bg-ink px-5 py-2 text-sm font-bold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
          ),
        ],
        ['Run'],
      )

const toolbar = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-wrap items-center justify-between gap-4')],
    [
      exampleSelect(model, h),
      h.div(
        [h.Class('flex items-center gap-4')],
        [
          h.span(
            [h.Class('hidden text-xs text-muted sm:inline')],
            [`${model.target}`],
          ),
          runButton(model, h),
        ],
      ),
    ],
  )

const fileTab = (
  model: Model,
  file: SourceFile,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('button')(
    file.name,
    [
      h.Type('button'),
      h.Role('tab'),
      h.AriaSelected(file.name === model.activeFile),
      h.OnClick(Message.SelectedFile({ name: file.name })),
      h.Class(
        file.name === model.activeFile
          ? 'label cursor-pointer rounded-full bg-ink px-3 py-1 text-paper'
          : 'label cursor-pointer rounded-full px-3 py-1 text-muted hover:text-ink',
      ),
    ],
    [file.name],
  )

const editor = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex min-w-0 flex-col gap-2')],
    [
      h.div(
        [
          h.Role('tablist'),
          h.AriaLabel('Files'),
          h.Class('flex flex-wrap items-center gap-1'),
        ],
        Array.map(model.files, file => fileTab(model, file, h)),
      ),
      // Monaco owns this element's content. A new example remounts it.
      h.keyed('div')(model.exampleId, [
        h.Id(EDITOR_ELEMENT_ID),
        h.AriaLabel('Source code'),
        h.OnMount(
          MountEditor({
            initialFiles: model.files,
            initialFile: model.activeFile,
          }),
        ),
        h.Class(
          'h-[36rem] w-full overflow-hidden rounded-xl bg-code font-mono text-sm',
        ),
      ]),
      h.span(
        [h.Class('text-xs text-muted')],
        [
          'Ctrl+Enter or Cmd+Enter runs the program. Hover a name for its type; type a dot for completions.',
        ],
      ),
    ],
  )

const chunkClass = (chunk: RunChunk): string =>
  chunk.stream === 'stdout'
    ? 'text-code-plain'
    : chunk.stream === 'stderr'
      ? 'text-signal'
      : 'text-muted'

const seconds = (milliseconds: number): string =>
  `${(milliseconds / 1000).toFixed(2)} s`

const outcomeText = (
  outcome: RunOutcome,
  compileMilliseconds: number,
  runMilliseconds: number,
): string =>
  RunOutcome.match(outcome, {
    Exited: ({ code }) =>
      `Exited with status ${code}. Compiled in ${seconds(compileMilliseconds)}, ran in ${seconds(runMilliseconds)}.`,
    CompileFailed: ({ code }) =>
      `The compiler stopped with status ${code} after ${seconds(compileMilliseconds)}.`,
    Trapped: ({ message }) => `The program trapped: ${message}`,
    ToolchainFailed: ({ message }) =>
      `The playground could not load the compiler: ${message}`,
    Stopped: () => 'Stopped.',
  })

const statusLine = (model: Model): string =>
  RunState.match(model.runState, {
    Idle: () =>
      toolchain === null
        ? 'The playground is not available in this build of the site.'
        : 'Press Run to compile and run the program.',
    Running: () => 'Compiling and running.',
    Finished: ({ outcome, compileMilliseconds, runMilliseconds }) =>
      outcomeText(outcome, compileMilliseconds, runMilliseconds),
  })

const shownOutput = (model: Model): ReadonlyArray<RunChunk> =>
  RunState.match(model.runState, {
    Idle: () => [],
    Running: ({ output }) => output,
    Finished: ({ output }) => output,
  })

const outputPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex min-w-0 flex-col gap-2')],
    [
      label('Output', h),
      h.div(
        [
          h.AriaLive('polite'),
          h.AriaBusy(isRunning(model)),
          h.Class(
            'flex h-[36rem] flex-col gap-3 overflow-auto rounded-xl border border-rule p-4',
          ),
        ],
        [
          h.p([h.Class('text-sm text-ink')], [statusLine(model)]),
          h.pre(
            [
              h.Class(
                'rounded-lg bg-code p-3 font-mono text-sm leading-[1.2] whitespace-pre-wrap break-words empty:hidden',
              ),
            ],
            Array.map(shownOutput(model), chunk =>
              h.span([h.Class(chunkClass(chunk))], [chunk.text]),
            ),
          ),
        ],
      ),
      h.span(
        [h.Class('text-xs text-muted')],
        [
          toolchain === null
            ? ''
            : `Silk ${toolchain.version}, direct WebAssembly backend.`,
        ],
      ),
    ],
  )

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class('flex flex-col gap-10 pb-16')],
    [
      header(h),
      h.div(
        [h.Class('flex flex-col gap-6 px-5 md:px-20')],
        [
          toolbar(model, h),
          h.div(
            [h.Class('grid gap-6 lg:grid-cols-2')],
            [editor(model, h), outputPanel(model, h)],
          ),
        ],
      ),
    ],
  ),
)
