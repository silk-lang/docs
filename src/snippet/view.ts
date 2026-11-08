import { Array } from 'effect'
import { Submodel } from 'foldkit'
import * as Canvas from 'foldkit/canvas'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import {
  BACKGROUNDS,
  LIMITS,
  type Model,
  SCALES,
  TRANSPARENT,
  type Theme,
} from './model'
import { cutLineCount, scene, size } from './scene'
import { CANVAS_ID, imageFileName } from './update'

const fieldLabel = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('label text-muted')], [text])

const field = (
  text: string,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.label([h.Class('flex flex-col gap-2')], [fieldLabel(text, h), ...children])

const inputClass =
  'w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none'

const buttonClass =
  'label cursor-pointer rounded-full border border-rule px-3 py-1.5 text-ink hover:border-ink disabled:cursor-default disabled:opacity-50'

const segmentClass = (isSelected: boolean): string =>
  isSelected
    ? 'label cursor-pointer rounded-full bg-ink px-3 py-1.5 text-paper'
    : 'label cursor-pointer rounded-full px-3 py-1.5 text-muted hover:text-ink'

const segmented = <Value>(
  text: string,
  options: ReadonlyArray<Readonly<{ label: string; value: Value }>>,
  selected: Value,
  toMessage: (value: Value) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-2')],
    [
      fieldLabel(text, h),
      h.div(
        [h.Role('group'), h.AriaLabel(text), h.Class('flex flex-wrap gap-1')],
        Array.map(options, option =>
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(String(option.value === selected)),
              h.OnClick(toMessage(option.value)),
              h.Class(segmentClass(option.value === selected)),
            ],
            [option.label],
          ),
        ),
      ),
    ],
  )

const checkbox = (
  text: string,
  isChecked: boolean,
  message: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.label(
    [h.Class('flex cursor-pointer items-center gap-2 text-sm text-body')],
    [
      h.input([
        h.Type('checkbox'),
        h.Checked(isChecked),
        h.OnClick(message),
        h.Class('size-4 accent-[var(--silk-signal)]'),
      ]),
      text,
    ],
  )

const swatch = (
  name: string,
  color: string,
  isSelected: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.button([
    h.Type('button'),
    h.AriaLabel(name),
    h.AriaPressed(String(isSelected)),
    h.Title(name),
    h.OnClick(Message.ChangedBackground({ color })),
    h.Class(
      `size-8 cursor-pointer rounded-full border ${isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''} ${color === TRANSPARENT ? 'checkerboard border-rule' : 'border-rule'}`,
    ),
    ...(color === TRANSPARENT ? [] : [h.Style({ backgroundColor: color })]),
  ])

const backgroundField = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { background } = model.settings
  const isCustom = !Array.some(BACKGROUNDS, ({ color }) => color === background)
  return h.div(
    [h.Class('flex flex-col gap-2')],
    [
      fieldLabel('Background', h),
      h.div(
        [h.Class('flex flex-wrap items-center gap-2')],
        [
          ...Array.map(BACKGROUNDS, ({ name, color }) =>
            swatch(name, color, color === background, h),
          ),
          h.input([
            h.Type('color'),
            h.AriaLabel('Custom background color'),
            h.Value(background === TRANSPARENT ? '#ffffff' : background),
            h.OnInput(color => Message.ChangedBackground({ color })),
            h.Class(
              `size-8 cursor-pointer rounded-full border border-rule bg-paper p-0.5 ${isCustom ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`,
            ),
          ]),
        ],
      ),
    ],
  )
}

const numberInput = (
  label: string,
  value: number,
  limits: Readonly<{ min: number; max: number }>,
  step: number,
  toMessage: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.input([
    h.Type('number'),
    h.AriaLabel(label),
    h.Min(String(limits.min)),
    h.Max(String(limits.max)),
    h.Step(String(step)),
    h.Value(String(value)),
    h.OnInput(toMessage),
    h.Class(inputClass),
  ])

const formatStatus = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.formatState._tag === 'Failed'
    ? h.p(
        [h.Role('status'), h.Class('text-sm text-signal')],
        [`Could not format: ${model.formatState.message}`],
      )
    : h.empty

const controls = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { settings } = model
  const isFormatting = model.formatState._tag === 'Formatting'
  return h.div(
    [h.Class('flex min-w-0 flex-col gap-6')],
    [
      field(
        'Code',
        [
          h.textarea([
            h.Value(settings.code),
            h.OnInput(code => Message.ChangedCode({ code })),
            h.Spellcheck(false),
            h.Rows(16),
            h.Class(`${inputClass} resize-y leading-relaxed whitespace-pre`),
          ]),
        ],
        h,
      ),
      h.div(
        [h.Class('flex flex-wrap items-center gap-3')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedFormat()),
              h.Disabled(isFormatting),
              h.Class(buttonClass),
            ],
            [isFormatting ? 'Formatting…' : 'Format'],
          ),
          h.span(
            [h.Class('text-xs text-muted')],
            ['Runs silk format in your browser.'],
          ),
        ],
      ),
      formatStatus(model, h),
      field(
        'File name',
        [
          h.input([
            h.Type('text'),
            h.Value(settings.fileName),
            h.OnInput(fileName => Message.ChangedFileName({ fileName })),
            h.Spellcheck(false),
            h.Class(inputClass),
          ]),
        ],
        h,
      ),
      h.div(
        [h.Class('grid grid-cols-2 gap-4')],
        [
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              fieldLabel('Width', h),
              numberInput(
                'Width',
                settings.width,
                LIMITS.width,
                10,
                value => Message.ChangedWidth({ value }),
                h,
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(Message.ClickedFitWidth()),
                  h.Class(`${buttonClass} self-start`),
                ],
                ['Fit to code'],
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              fieldLabel('Padding', h),
              numberInput(
                'Padding',
                settings.padding,
                LIMITS.padding,
                4,
                value => Message.ChangedPadding({ value }),
                h,
              ),
              h.input([
                h.Type('range'),
                h.AriaLabel('Padding'),
                h.Min(String(LIMITS.padding.min)),
                h.Max(String(LIMITS.padding.max)),
                h.Step('4'),
                h.Value(String(settings.padding)),
                h.OnInput(value => Message.ChangedPadding({ value })),
                h.Class('w-full accent-[var(--silk-signal)]'),
              ]),
            ],
          ),
        ],
      ),
      backgroundField(model, h),
      segmented<Theme>(
        'Card',
        [
          { label: 'Dark', value: 'Dark' },
          { label: 'Light', value: 'Light' },
        ],
        settings.theme,
        theme => Message.SelectedTheme({ theme }),
        h,
      ),
      h.div(
        [h.Class('flex flex-col gap-3')],
        [
          checkbox(
            'Line numbers',
            settings.showLineNumbers,
            Message.ClickedLineNumbers(),
            h,
          ),
          checkbox(
            'Window bar with the file name',
            settings.showWindow,
            Message.ClickedWindow(),
            h,
          ),
        ],
      ),
      segmented<number>(
        'Export scale',
        Array.map(SCALES, scale => ({ label: `${scale}x`, value: scale })),
        settings.scale,
        scale => Message.SelectedScale({ value: String(scale) }),
        h,
      ),
    ],
  )
}

const preview = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { settings } = model
  const { width, height } = size(settings)
  const cut = cutLineCount(settings)
  const image = scene(settings)
  return h.div(
    [h.Class('flex min-w-0 flex-col gap-4')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          h.span(
            [h.Class('font-mono text-sm text-muted')],
            [
              `${imageFileName(settings.fileName)} · ${width * settings.scale} × ${height * settings.scale} px`,
            ],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedDownload()),
              h.Class(
                'label cursor-pointer rounded-full bg-ink px-4 py-2 text-paper hover:opacity-90',
              ),
            ],
            ['Download PNG'],
          ),
        ],
      ),
      cut > 0
        ? h.p(
            [h.Role('status'), h.Class('text-sm text-signal')],
            [
              `${cut} ${cut === 1 ? 'line is' : 'lines are'} wider than the image and cut off. Widen it or use Fit to code.`,
            ],
          )
        : h.empty,
      h.div(
        [h.Class('checkerboard overflow-auto rounded-xl border border-rule')],
        [
          h.div(
            [h.Id(CANVAS_ID), h.Style({ maxWidth: `${width}px` })],
            [
              Canvas.view(
                {
                  width: image.width,
                  height: image.height,
                  shapes: image.shapes,
                  className: 'block h-auto w-full',
                },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.section(
    [
      h.Class(
        'mx-auto flex max-w-[90rem] flex-col gap-10 px-5 py-12 md:px-20 md:py-16',
      ),
    ],
    [
      h.header(
        [h.Class('flex flex-col gap-3')],
        [
          h.span([h.Class('label text-signal')], ['Snippet']),
          h.h1(
            [
              h.Class(
                'text-4xl font-bold leading-none tracking-tighter md:text-5xl',
              ),
            ],
            ['Code image'],
          ),
          h.p(
            [h.Class('max-w-[38.75rem] text-lg leading-prose text-muted')],
            [
              'Paste Silk, format it, set the size and colors, and download a PNG.',
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)]')],
        [controls(model, h), preview(model, h)],
      ),
    ],
  ),
)
