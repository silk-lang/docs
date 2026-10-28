import { Array, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Icon from '../icon'
import * as Layout from '../layout'
import { type Message } from '../message'
import { docPageRouter, releasesRouter } from '../route'

// CONTENT

const HELLO_CODE = `import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello!", &())
    |> Effect.provideMut(&mut logger)
}`

const CLOCK_CODE = `import silk.core.effect { Effect }

service Clock {
  effect fn value() -> i32 ? &Clock
}

struct FixedClock { value: i32 }

impl Clock for FixedClock {
  effect fn value(self: &Self) -> i32 {
    return self.value
  }
}

effect fn readClock() -> i32 ? &Clock {
  return run Clock.value()
}

pub fn main() -> i32 {
  let clock = FixedClock { value: 42 }
  return run Effect.provide(readClock(), &clock)
}`

type Feature = Readonly<{ title: string; text: string; snippet: string }>

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: 'Effects',
    text: 'A computation’s type says what it produces, how it can fail, and what it needs from the world.',
    snippet: 'Effect<A ! E ? R>',
  },
  {
    title: 'Typed failures',
    text: 'Recoverable failures stay inside the Effect model. Fatal traps stay separate and can’t be caught.',
    snippet: 'fail NotFoundError { id: id }',
  },
  {
    title: 'Services',
    text: 'Code asks for a capability, not a concrete implementation. Tests use real in-memory providers, not mocks.',
    snippet: 'effect fn readClock() -> i32 ? &Clock',
  },
  {
    title: 'Ownership and lifetimes',
    text: 'Values are borrowed, borrowed exclusively, or moved, right in the syntax. Allocation is a service the caller configures.',
    snippet: '&message · &mut message · move message',
  },
  {
    title: 'Fibers',
    text: 'Structured, cooperative concurrency. Suspension and cancellation are part of the model, not an afterthought.',
    snippet: 'join(move child)',
  },
  {
    title: 'Compile-time work',
    text: 'Static evaluation, reflection, and package parameters run in the compiler, written in Silk itself.',
    snippet: 'static evaluation · reflection',
  },
]

const STDLIB_TOPICS: ReadonlyArray<string> = [
  'files',
  'directories',
  'processes',
  'logging',
  'stdin',
  'time',
  'randomness',
  'byte streams',
  'networking',
  'HTTP client',
  'HTTP server',
  'WebSockets',
  'TLS',
  'cryptography',
  'JSON',
  'TOML',
  'compression',
  'collections',
]

type Row = Readonly<{ name: string; text: string }>

const TOOLS: ReadonlyArray<Row> = [
  { name: 'Formatter', text: 'One style, no configuration debates.' },
  {
    name: 'Tests',
    text: 'Unit tests and doc tests, with real providers instead of mocks.',
  },
  {
    name: 'silk check',
    text: 'Diagnostics without a full build, with documented error codes.',
  },
  {
    name: 'Documentation',
    text: 'Doc comments, doc tests, and generated reference pages.',
  },
  {
    name: 'Changesets',
    text: 'Versioning and release notes for your own packages.',
  },
]

const ALPHA_NOTES: ReadonlyArray<Row> = [
  {
    name: 'Breaking changes can land',
    text: 'Until 1.0, APIs may change between releases.',
  },
  {
    name: 'Every release is written down',
    text: 'Release notes and changesets say what moved and why.',
  },
  {
    name: 'Pin your version',
    text: 'Lock the toolchain in your manifest and upgrade on your schedule.',
  },
  {
    name: 'Tell us what breaks',
    text: 'Alpha feedback shapes what 1.0 looks like.',
  },
]

// VIEW

const sectionClass = 'mx-auto w-full max-w-[90rem] px-5 md:px-20'

export const label = (text: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Class('label text-muted')], [text])

export const badge = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('label rounded-full bg-ink px-3 py-1.5 text-paper')], [text])

export const tag = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class('rounded-full border border-ink px-2.5 py-1 text-xs')],
    [text],
  )

export const buttonLink = (
  text: string,
  href: string,
  variant: 'Primary' | 'Secondary',
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(href),
      h.Class(
        variant === 'Primary'
          ? 'inline-flex items-center gap-2.5 rounded-full border border-ink bg-ink px-6 py-3.5 text-sm font-bold text-paper hover:opacity-90'
          : 'inline-flex items-center gap-2.5 rounded-full border border-ink px-6 py-3.5 text-sm font-bold text-ink hover:bg-ink hover:text-paper',
      ),
    ],
    [text, Icon.arrowRight('size-4', h)],
  )

export const textLink = (
  text: string,
  href: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(href),
      h.Class(
        'inline-flex w-fit items-center gap-1.5 text-sm font-bold underline underline-offset-4 hover:text-signal',
      ),
    ],
    [text, Icon.arrowUpRight('size-3', h)],
  )

const anatomyTerm = (
  symbol: string,
  text: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.span([h.Class('text-2xl font-bold leading-none')], [symbol]),
      h.span([h.Class('text-xs text-muted')], [text]),
    ],
  )

const hero = (copiedCodeIds: CopiedCodeIds, h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class(
        `${sectionClass} grid items-center gap-14 pt-16 pb-20 lg:grid-cols-[minmax(0,40rem)_minmax(0,35rem)] lg:justify-between lg:gap-20 lg:pt-26 lg:pb-30`,
      ),
    ],
    [
      h.div(
        [h.Class('flex min-w-0 flex-col gap-8')],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-3')],
            [
              badge('Alpha', h),
              h.span(
                [h.Class('label text-muted')],
                ['LLVM backend · native and WebAssembly'],
              ),
            ],
          ),
          h.h1(
            [
              h.Class(
                'text-4xl leading-none font-bold tracking-tighter sm:text-6xl',
              ),
            ],
            [
              'Composability,',
              h.br([]),
              'all the way down',
              h.span([h.Class('text-signal')], ['.']),
            ],
          ),
          h.p(
            [h.Class('max-w-[36.25rem] text-lg leading-prose text-muted')],
            [
              'Silk is a systems language where effects, failures, and dependencies compose, and ownership keeps every resource explicit. Inspired by Effect.',
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-3')],
            [
              buttonLink(
                'Take the tour',
                docPageRouter({
                  directory: 'get-started',
                  slug: 'a-tour-of-silk',
                }),
                'Primary',
                h,
              ),
              buttonLink(
                'Read the book',
                docPageRouter({ directory: 'book', slug: 'overview' }),
                'Secondary',
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-4 border-t border-rule pt-6')],
            [
              label('Every effect declares', h),
              h.div(
                [h.Class('flex flex-wrap gap-x-12 gap-y-6')],
                [
                  anatomyTerm('A', 'what it produces', h),
                  anatomyTerm('!E', 'how it may fail', h),
                  anatomyTerm('?R', 'what it requires', h),
                ],
              ),
            ],
          ),
        ],
      ),
      Code.codeBlock(
        {
          code: HELLO_CODE,
          lang: 'silk',
          title: 'main.silk',
          lineNumbers: true,
          copy: copyButtonFor(copiedCodeIds, 'home-hello', HELLO_CODE),
        },
        h,
      ),
    ],
  )

const featureCard = (
  feature: Feature,
  index: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.article(
    [
      h.Class(
        'flex min-h-[16.25rem] flex-col justify-between gap-6 rounded-2xl border border-rule p-7',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-3')],
        [
          h.span(
            [h.Class('label text-muted')],
            [`${index + 1}`.padStart(2, '0')],
          ),
          h.h3([h.Class('text-2xl font-bold tracking-tight')], [feature.title]),
          h.p([h.Class('text-sm leading-prose text-muted')], [feature.text]),
        ],
      ),
      Code.inlineSnippet(feature.snippet, h),
    ],
  )

const sectionHeader = (
  labelText: string,
  title: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-4')],
    [
      label(labelText, h),
      h.h2(
        [
          h.Class(
            'text-3xl leading-none font-bold tracking-tighter md:text-5xl',
          ),
        ],
        pipe(
          title,
          Array.flatMap((line, index) =>
            index === 0 ? [line] : [h.br([]), line],
          ),
        ),
      ),
    ],
  )

const features = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [h.Class(`${sectionClass} flex flex-col gap-12 py-20 lg:py-30`)],
        [
          sectionHeader(
            'What composes',
            ['Composition that survives', 'every boundary.'],
            h,
          ),
          h.div(
            [h.Class('grid gap-7 md:grid-cols-2 xl:grid-cols-3')],
            Array.map(FEATURES, (feature, index) =>
              featureCard(feature, index, h),
            ),
          ),
        ],
      ),
    ],
  )

const servicesSpotlight = (
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [
      h.Class(
        `${sectionClass} grid items-center gap-14 pb-20 lg:grid-cols-[minmax(0,30rem)_minmax(0,45rem)] lg:justify-between lg:gap-20 lg:pb-30`,
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-5')],
        [
          label('Services', h),
          h.h2(
            [h.Class('text-3xl font-bold tracking-tighter md:text-4xl')],
            ['Swap the provider,', h.br([]), 'not the code.'],
          ),
          h.p(
            [h.Class('leading-prose text-muted')],
            [
              'A service is the capability. A provider is one implementation of it. Reusable code asks for the service itself, never the concrete type behind it.',
            ],
          ),
          h.p(
            [h.Class('leading-prose')],
            [
              'Here ',
              h.strong([], ['readClock()']),
              ' only knows it needs a ',
              h.strong([], ['Clock']),
              '. ',
              h.strong([], ['main()']),
              ' hands it a ',
              h.strong([], ['FixedClock']),
              '; a test could hand it anything else.',
            ],
          ),
          textLink(
            'Testing with providers',
            docPageRouter({
              directory: 'guides',
              slug: 'testing-with-providers',
            }),
            h,
          ),
        ],
      ),
      Code.codeBlock(
        {
          code: CLOCK_CODE,
          lang: 'silk',
          title: 'clock.silk',
          copy: copyButtonFor(copiedCodeIds, 'home-clock', CLOCK_CODE),
        },
        h,
      ),
    ],
  )

const rowList = (
  rows: ReadonlyArray<Row>,
  layout: 'Columns' | 'Stacked',
  h: HtmlBuilder<Message>,
): Html =>
  h.dl(
    [h.Class('flex flex-col border-t border-ink')],
    Array.map(rows, ({ name, text }) =>
      h.div(
        [
          h.Class(
            layout === 'Columns'
              ? 'grid gap-1 border-b border-rule py-3.5 text-sm leading-normal sm:grid-cols-[11.25rem_1fr] sm:gap-6'
              : 'flex flex-col gap-1 border-b border-rule py-4',
          ),
        ],
        [
          h.dt(
            [
              h.Class(
                layout === 'Columns' ? 'font-bold' : 'text-base font-bold',
              ),
            ],
            [name],
          ),
          h.dd([h.Class('text-sm leading-normal text-muted')], [text]),
        ],
      ),
    ),
  )

const inTheBox = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [h.Class(`${sectionClass} flex flex-col gap-12 py-20 lg:py-30`)],
        [
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              sectionHeader(
                'In the box',
                ['A standard library and tools', 'that ship together.'],
                h,
              ),
              h.p(
                [h.Class('max-w-[40rem] text-lg leading-prose text-muted')],
                [
                  'Compile for macOS, Linux, no-libc Linux, or WebAssembly, with the same standard library and the same tools. Windows is on the way.',
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('grid gap-14 lg:grid-cols-2 lg:gap-20')],
            [
              h.div(
                [h.Class('flex flex-col gap-5')],
                [
                  label('Standard library', h),
                  h.ul(
                    [h.Class('flex flex-wrap gap-x-2 gap-y-2.5')],
                    Array.map(STDLIB_TOPICS, topic =>
                      h.li([], [tag(topic, h)]),
                    ),
                  ),
                  textLink(
                    'Browse the guides',
                    docPageRouter({ directory: 'guides', slug: 'overview' }),
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class('flex flex-col gap-2')],
                [label('Tools', h), rowList(TOOLS, 'Columns', h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const status = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [
          h.Class(
            `${sectionClass} grid gap-14 py-20 lg:grid-cols-2 lg:gap-20 lg:py-30`,
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-col gap-5')],
            [
              label('Status', h),
              h.h2(
                [h.Class('text-3xl font-bold tracking-tighter md:text-4xl')],
                ['Real, and still in alpha.'],
              ),
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'Silk is usable today: a full language reference, a documented standard library, and the tools to ship with it. It’s also young, and some edges will move.',
                ],
              ),
              h.p(
                [
                  h.Class(
                    'flex items-center gap-3 rounded-2xl bg-signal-soft px-5 py-4 text-sm leading-normal',
                  ),
                ],
                [
                  h.span([
                    h.AriaHidden(true),
                    h.Class('size-2 shrink-0 rounded-full bg-signal'),
                  ]),
                  'Alpha means real, documented, and changing. Build with it, and pin your version.',
                ],
              ),
              h.div(
                [
                  h.Class(
                    'flex items-center justify-between gap-4 rounded-2xl border border-rule px-5 py-4',
                  ),
                ],
                [
                  h.p(
                    [h.Class('max-w-[27.5rem] text-sm leading-normal')],
                    [
                      h.strong([], ['Windows']),
                      ' support is still ahead. Today Silk targets macOS, Linux, no-libc Linux, and WebAssembly.',
                    ],
                  ),
                  tag('ahead', h),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-2 pt-1.5')],
            [label('What alpha means', h), rowList(ALPHA_NOTES, 'Stacked', h)],
          ),
        ],
      ),
    ],
  )

const goalBand = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('bg-ink text-paper')],
    [
      h.div(
        [h.Class(`${sectionClass} flex flex-col gap-7 py-20 lg:py-30`)],
        [
          h.p([h.Class('label text-rule')], ['The goal']),
          h.p(
            [
              h.Class(
                'max-w-[65rem] text-3xl leading-tight font-bold tracking-tighter md:text-5xl',
              ),
            ],
            [
              'Make the composable program and the honest program the same program',
              h.span([h.Class('text-signal')], ['.']),
            ],
          ),
        ],
      ),
    ],
  )

const closingCta = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class(
        `${sectionClass} flex flex-col gap-10 py-20 md:flex-row md:items-end md:justify-between lg:py-30`,
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-4')],
        [
          h.h2(
            [
              h.Class(
                'text-4xl leading-none font-bold tracking-tighter sm:text-6xl',
              ),
            ],
            ['Try Silk', h.span([h.Class('text-signal')], ['.'])],
          ),
          h.p(
            [h.Class('text-lg leading-prose text-muted')],
            ['Start with the tour, or go all the way with the book.'],
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap items-center gap-3')],
        [
          buttonLink('Install', releasesRouter(), 'Primary', h),
          buttonLink(
            'Read the book',
            docPageRouter({ directory: 'book', slug: 'overview' }),
            'Secondary',
            h,
          ),
        ],
      ),
    ],
  )

export const view = (
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html =>
  Layout.page(
    'Home',
    [
      hero(copiedCodeIds, h),
      features(h),
      servicesSpotlight(copiedCodeIds, h),
      inTheBox(h),
      status(h),
      goalBand(h),
      closingCta(h),
    ],
    h,
  )
