import { Array, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Icon from '../icon'
import * as Layout from '../layout'
import { type Message } from '../message'
import { docPageRouter, releasesRouter } from '../route'

// CONTENT

const HERO_CODE = `effect fn countBytes(name: string) -> usize
  ! FileError | OutOfMemoryError
  ? &mut FileSystem | &mut Allocator {
  let path = run Path.make(name)
  let bytes = run FileSystem.readFile(&path)
  return Bytes.length(&bytes)
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

type Feature = Readonly<{
  title: string
  question: string
  text: string
  snippet: string
}>

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: 'Allocation',
    question: 'Where can this run out of memory?',
    text: 'Anything that allocates asks for an Allocator and can fail with OutOfMemoryError. You choose where memory comes from, for the whole program or one part of it.',
    snippet: '? &mut Allocator',
  },
  {
    title: 'I/O',
    question: 'What does this program touch?',
    text: 'Files, clocks, randomness, HTTP and child processes are services. Code that uses them says so in its signature.',
    snippet: '? &mut FileSystem | &mut SystemClock',
  },
  {
    title: 'Failures',
    question: 'How can this fail?',
    text: 'Failures are values in the type, and they combine as calls combine. A trap is a bug: it ends the program and can’t be caught.',
    snippet: '! FileError | OutOfMemoryError',
  },
  {
    title: 'Ownership',
    question: 'Who frees this, and when?',
    text: 'Borrow, borrow exclusively, or move, written at the call site. Lifetimes are checked when you compile.',
    snippet: '&message · &mut message · move message',
  },
  {
    title: 'Concurrency',
    question: 'What happens when a child task fails?',
    text: 'A child fiber ends with a typed outcome. join raises its failure, await hands it back as data, and race cancels the loser.',
    snippet: 'join(move child)',
  },
  {
    title: 'Compile time',
    question: 'Can I generate code without macros?',
    text: 'static if and static for run in the compiler. Reflection visits the fields of a struct and leaves nothing in the binary.',
    snippet: 'static if · static for · Reflect.fields',
  },
]

type Row = Readonly<{ name: string; text: string }>

const TOOLS: ReadonlyArray<Row> = [
  { name: 'Formatter', text: 'One style, built into the compiler.' },
  {
    name: 'Tests',
    text: 'Unit tests and doc tests. Swap services for fakes instead of mocking.',
  },
  {
    name: 'silk check',
    text: 'Diagnostics without a full build. Every error code is documented.',
  },
  {
    name: 'Language server',
    text: 'Diagnostics, hover, completion, go to definition and references in your editor.',
  },
  {
    name: 'Documentation',
    text: 'Doc comments become reference pages, and their examples are checked as tests.',
  },
  {
    name: 'Changesets',
    text: 'Versioning and release notes for your own packages.',
  },
  {
    name: 'Toolchain versions',
    text: 'Install and switch Silk versions per project, with no separate version manager.',
  },
]

type Question = Readonly<{ question: string; answer: string }>

const FAQ: ReadonlyArray<Question> = [
  {
    question: 'Is it hard to learn?',
    answer:
      'If you know Effect or Rust, half of it will look familiar. The rest (services, providers, run) is what the tour walks through.',
  },
  {
    question: 'How does it relate to Effect?',
    answer:
      'Same model of a program: typed failures and services in the type. Different runtime story: native code, ownership, no garbage collector.',
  },
  {
    question: 'How fast is it?',
    answer:
      'Silk compiles through LLVM to native code, with no garbage collector and no hidden runtime. Build speed and small rebuilds come first when we design a feature, so the edit, check, fix loop stays short.',
  },
  {
    question: 'Where does it run?',
    answer:
      'macOS, Linux with or without libc, and WebAssembly (WASI). Windows is coming.',
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
              h.span([h.Class('label text-muted')], ['Guardrails, not trust']),
            ],
          ),
          h.h1(
            [
              h.Class(
                'text-4xl leading-none font-bold tracking-tighter sm:text-6xl',
              ),
            ],
            [
              'Built for the way',
              h.br([]),
              'software is written today',
              h.span([h.Class('text-signal')], ['.']),
            ],
          ),
          h.p(
            [h.Class('max-w-[36.25rem] text-lg leading-prose text-muted')],
            [
              'Every Silk function states what it returns, how it can fail, and what it needs, down to the allocator. Whoever writes the code, a person or an agent, and whoever reviews it work from the same contract, and the compiler holds everyone to it. There is usually one way to write a thing, and builds stay fast enough to keep the edit, check, fix loop short.',
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
        ],
      ),
      Code.codeBlock(
        {
          code: HERO_CODE,
          lang: 'silk',
          title: 'count.silk',
          lineNumbers: true,
          copy: copyButtonFor(copiedCodeIds, 'home-hero', HERO_CODE),
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
            [`${`${index + 1}`.padStart(2, '0')} · ${feature.title}`],
          ),
          h.h3(
            [h.Class('text-2xl font-bold tracking-tight')],
            [feature.question],
          ),
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

const modelTerm = (
  symbol: string,
  text: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('grid gap-1 border-b border-rule py-4 sm:grid-cols-[5rem_1fr]')],
    [
      h.dt([h.Class('text-2xl font-bold leading-none')], [symbol]),
      h.dd([h.Class('text-sm leading-normal text-muted')], [text]),
    ],
  )

const model = (h: HtmlBuilder<Message>): Html =>
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
            [h.Class('flex flex-col gap-8')],
            [
              sectionHeader(
                'The model',
                ['Success, failure and', 'requirements in one type.'],
                h,
              ),
              h.dl(
                [h.Class('flex flex-col border-t border-ink')],
                [
                  modelTerm('A', 'What it returns.', h),
                  modelTerm(
                    '!E',
                    'Every typed failure. The union grows as calls combine.',
                    h,
                  ),
                  modelTerm(
                    '?R',
                    'Every service it needs. The list shrinks as callers provide them.',
                    h,
                  ),
                ],
              ),
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'If you know Effect, you already know the model. Silk adds ownership and compiles it to native code.',
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-5 lg:pt-10')],
            [
              label('The contract', h),
              h.h3(
                [h.Class('text-3xl font-bold tracking-tighter md:text-4xl')],
                [
                  'The reviewer checks the signature.',
                  h.br([]),
                  'The compiler checks the rest.',
                ],
              ),
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'Like Rust, the compiler won’t let code misuse memory, so you don’t have to trust whoever wrote it: a colleague, a dependency, or an agent. Silk goes further. Library code asks for the services it uses, so allocation, files, clocks and failures show in its type and in the type of every caller. A real file system or clock comes from a provider someone creates by name, usually in main.',
                ],
              ),
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'The one escape hatch, ',
                  h.strong([], ['unsafe']),
                  ', is written at the exact spot it is used. Like creating a provider, it is one line that is easy to spot in a diff.',
                ],
              ),
            ],
          ),
        ],
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
          sectionHeader('The language', ['What the type', 'tells you.'], h),
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
              'A service is a capability. A provider is one implementation of it. Code asks for the service, and the caller decides which provider to pass.',
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
              sectionHeader('In the box', ['Batteries included.'], h),
              h.p(
                [h.Class('max-w-[40rem] text-lg leading-prose text-muted')],
                [
                  'We aim to solve the common cases in the box, so nobody has to find, vet and wire up a package for them. A lot is already here for a young language, and more is coming. Build for macOS, Linux (with or without libc) and WebAssembly from the same code. Windows is coming.',
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
                  h.p(
                    [h.Class('leading-prose text-muted')],
                    [
                      'An HTTPS request, a JSON or TOML file, a compressed download, a pool of worker threads: none of them needs a package. The standard library covers them, written in Silk with the same failure and service rules as your own code.',
                    ],
                  ),
                  h.div(
                    [h.Class('flex flex-wrap gap-x-6 gap-y-3')],
                    [
                      textLink(
                        'Standard library reference',
                        docPageRouter({ directory: 'std', slug: 'overview' }),
                        h,
                      ),
                      textLink(
                        'Browse the guides',
                        docPageRouter({
                          directory: 'guides',
                          slug: 'overview',
                        }),
                        h,
                      ),
                    ],
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

const design = (h: HtmlBuilder<Message>): Html =>
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
          sectionHeader('Design', ['Library, not magic.'], h),
          h.div(
            [h.Class('flex flex-col gap-5 lg:pt-10')],
            [
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'The compiler provides the core: the Effect type, typed failures and requirements, and ownership. Option, Result, the Effect combinators such as retry and catch, fibers and their schedulers, and allocators are Silk code in the standard library, built on compiler intrinsics.',
                ],
              ),
              h.p(
                [h.Class('leading-prose text-muted')],
                [
                  'You can read how they work in the same language you write, and build your own the same way.',
                ],
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
                ['Alpha', h.span([h.Class('text-signal')], ['.'])],
              ),
            ],
          ),
          h.p(
            [h.Class('leading-prose text-muted lg:pt-1.5')],
            [
              'Silk works today. The compiler builds itself and the standard library is documented. APIs can still change before 1.0, so pin your toolchain version. Every release lists what changed.',
            ],
          ),
        ],
      ),
    ],
  )

const faq = (h: HtmlBuilder<Message>): Html =>
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
          sectionHeader('Questions', ['Before you start.'], h),
          rowList(
            Array.map(FAQ, ({ question, answer }) => ({
              name: question,
              text: answer,
            })),
            'Stacked',
            h,
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
            ['Start with the tour, or read the book.'],
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
      model(h),
      features(h),
      servicesSpotlight(copiedCodeIds, h),
      design(h),
      inTheBox(h),
      status(h),
      faq(h),
      closingCta(h),
    ],
    h,
  )
