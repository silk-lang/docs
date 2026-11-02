import { Array, Option, Order, Record, pipe } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Catalog from '../docs/catalog'
import * as Icon from '../icon'
import { DemoTopic, InstallMethod } from '../landing'
import * as Layout from '../layout'
import { Message } from '../message'
import { type Model } from '../model'
import { releases } from '../releases/data'
import { docPageRouter, releasesRouter } from '../route'

// CONTENT

const HERO_CODE = `import silk.core.effect { Effect }
import silk.io.logger { LogError }
import silk.io.logger_native { StdoutLogger }

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()

  run Effect.log("Hello, world!\\n", &.{})
    |> Effect.provideMut(&mut logger)
}`

const UNIX_INSTALL =
  'curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | sh'

const WINDOWS_INSTALL =
  'irm https://raw.githubusercontent.com/silk-lang/silk/main/install.ps1 | iex'

// Each release with Windows builds publishes a Scoop manifest beside its files.
const maybeScoopInstall: Option.Option<string> = pipe(
  releases,
  Array.findFirst(release =>
    Array.some(release.downloads, download => download.os === 'Windows'),
  ),
  Option.map(
    release =>
      `scoop install https://github.com/silk-lang/silk/releases/download/${encodeURIComponent(release.tag)}/silk.json`,
  ),
)

const installCommand = (method: InstallMethod): string =>
  InstallMethod.match(method, {
    Unix: () => UNIX_INSTALL,
    Windows: () => WINDOWS_INSTALL,
    Scoop: () => Option.getOrElse(maybeScoopInstall, () => WINDOWS_INSTALL),
  })

const ANNOTATED_CODE = `import silk.core.effect { Effect }
import silk.io.logger { Logger, LogError }
import silk.io.logger_native { StdoutLogger }

pub service Random {
  effect fn next(self: &mut Self) -> u32
}

effect fn program() -> ()
  ! LogError
  ? &mut Random | &mut Logger {
  run Effect.log("Random number: {number}", &.{number: run Random.next()})
}

pub struct Always42Random {}

impl Random for Always42Random {
  effect fn next(self: &mut Self) -> u32 {
    return 42
  }
}

pub effect fn main() -> ()
  ! LogError {
  let mut loggerProvider = StdoutLogger.make()
  let mut randomProvider = Always42Random {}

  run program()
    |> Effect.provideMut(&mut loggerProvider)
    |> Effect.provideMut(&mut randomProvider)
}`

type Side = 'Left' | 'Right'

type Annotation = Readonly<{
  number: string
  kind: string
  title: string
  text: ReadonlyArray<string | Readonly<{ code: string }>>
  line: number
  firstLine: number
  lastLine: number
  side: Side
}>

const ANNOTATIONS: ReadonlyArray<Annotation> = [
  {
    number: '01',
    kind: 'Service',
    title: 'Declare the need',
    text: ['A service names a capability without saying how it’s provided.'],
    line: 5,
    firstLine: 5,
    lastLine: 7,
    side: 'Left',
  },
  {
    number: '02',
    kind: 'Signature',
    title: 'Failures and needs',
    text: [
      { code: '!' },
      ' says how it can fail, ',
      { code: '?' },
      ' what it needs. Leave a need unprovided and it won’t compile.',
    ],
    line: 10,
    firstLine: 9,
    lastLine: 11,
    side: 'Right',
  },
  {
    number: '03',
    kind: 'Run',
    title: 'Every effect is marked',
    text: [
      'An effect is a value until ',
      { code: 'run' },
      ' executes it, so you can see where things happen.',
    ],
    line: 12,
    firstLine: 12,
    lastLine: 12,
    side: 'Left',
  },
  {
    number: '04',
    kind: 'Implementation',
    title: 'Many providers',
    text: [
      'Always 42 in tests, a real generator in production. ',
      { code: 'program' },
      ' doesn’t change.',
    ],
    line: 17,
    firstLine: 17,
    lastLine: 21,
    side: 'Right',
  },
  {
    number: '05',
    kind: 'Provide',
    title: 'Provide at the edge',
    text: [
      { code: 'main' },
      ' picks the logger and the random source. Nothing deeper decides.',
    ],
    line: 29,
    firstLine: 28,
    lastLine: 30,
    side: 'Right',
  },
]

type DemoCode = Readonly<{ fileName: string; status: string; code: string }>

type Demo = Readonly<{
  topic: DemoTopic
  tab: string
  title: string
  text: string
  pills: ReadonlyArray<string>
  caption: string
  result: ReadonlyArray<string | Readonly<{ strong: string }>>
  codes: ReadonlyArray<DemoCode>
  footnote: string
  link: Readonly<{ text: string; href: string }>
}>

const FIBERS_CODE = `effect fn after(delay: u64, value: i32) -> i32
  ? &mut MonotonicClock {
  run Effect.sleep(delay)
  return value
}

effect fn root() -> i32
  ! OutOfMemoryError | TaskIdExhaustedError | Cancelled
  ? &mut Scheduler | &mut MonotonicClock {
  let slow = run Fiber.forkChild(after(2s, 20))
  let fast = run Fiber.forkChild(after(1s, 22))
  let x = run Fiber.join(move slow)
  let y = run Fiber.join(move fast)
  return x + y
}`

const RETRY_CODE = `effect fn fetch(attempts: &mut Attempts) -> i32
  ! Busy {
  attempts.count = attempts.count + 1
  if attempts.count < 4 {
    fail Busy {}
  }
  return 42
}

pub fn main() -> i32 {
  let mut attempts = Attempts { count: 0 }
  let mut random = InsecureRandom.seeded(1)
  let mut clock = OsMonotonicClock.make()
  let backoff = Schedule.exponential(100ms)
    |> Schedule.jittered
    |> Schedule.capDelay(2s)
    |> Schedule.limit(5)
  let value = run Effect.retry(fetch(&mut attempts), &backoff)
    |> Effect.catchAll(giveUp)
    |> Effect.provideMut<InsecureRandom>(&mut random)
    |> Effect.provideMut<MonotonicClock>(&mut clock)
  return value - 42
}`

const REJECTED_CODE = `pub fn main() -> i32 {
  let mut x = 1
  let r = &mut x
  let s = &x
  r.* = 2
  return s.*
}`

const FIXED_CODE = `pub fn main() -> i32 {
  let mut x = 1
  let r = &mut x
  r.* = 2
  let s = &x
  return s.* - 2
}`

const ARENA_CODE = `effect fn build() -> i32
  ! OutOfMemoryError {
  let mut arena = Arena.make(Allocator.systemAllocatorProvider())
  let mut values = List<i32>.make()
  run List<i32>.append(&mut values, 40)
    |> Effect.provideMut<Allocator>(&mut arena)
  run List<i32>.append(&mut values, 2)
    |> Effect.provideMut<Allocator>(&mut arena)
  return List<i32>.get(&values, 0) + List<i32>.get(&values, 1)
}

pub fn main() -> i32 {
  return run Effect.catchAll(build(), recover)
}`

const DEMOS: Array.NonEmptyReadonlyArray<Demo> = [
  {
    topic: DemoTopic.Fibers(),
    tab: 'Fibers',
    title: 'Fiber.forkChild',
    text: 'Two tasks sleep at the same time on one thread. The program waits 2s, not 3s. Durations are literals, such as 1s and 250ms.',
    pills: ['forkChild', 'join', 'await', 'sleep'],
    caption:
      'A sleeping task parks and the others keep running. The clock is a provider, so tests can swap in virtual time and skip the wait.',
    result: ['2.0s · 20 + 22 = ', { strong: '42' }],
    codes: [{ fileName: 'fibers.silk', status: 'Copy', code: FIBERS_CODE }],
    footnote:
      'The scheduler is a requirement, so tests can pass a deterministic one.',
    link: {
      text: 'Fibers and scheduling',
      href: docPageRouter({
        directory: 'reference',
        slug: 'fibers-and-scheduling',
      }),
    },
  },
  {
    topic: DemoTopic.Scheduling(),
    tab: 'Scheduling',
    title: 'Effect.retry',
    text: 'Retry a typed failure on a schedule: exponential backoff, jitter, a cap on the delay and a limit on attempts.',
    pills: ['retry', 'retryWhile', 'repeat', 'Schedule'],
    caption:
      'A schedule is a plain value with no clock and no progress. The same policy can drive retry, retryWhile or repeat, for any number of runs.',
    result: ['4 attempts · fetch() = ', { strong: '42' }],
    codes: [{ fileName: 'retry.silk', status: 'Copy', code: RETRY_CODE }],
    footnote:
      'Imports, Busy, Attempts and giveUp are in the full example in the docs.',
    link: {
      text: 'Effect combinators',
      href: docPageRouter({ directory: 'std', slug: 'core-effect' }),
    },
  },
  {
    topic: DemoTopic.Borrows(),
    tab: 'Borrow checker',
    title: 'Conflicting loans',
    text: 'Every borrow lives until its last use. A shared read can’t start while a mutable borrow of the same value is still in use, and the compiler says which line to move.',
    pills: ['&', '&mut', 'move'],
    caption: 'Every error code is documented, and this one comes with its fix.',
    result: ['error[OWN0010] · ', { strong: '1 fix' }],
    codes: [
      { fileName: 'rejected.silk', status: '1 error', code: REJECTED_CODE },
      { fileName: 'fixed.silk', status: 'Compiles', code: FIXED_CODE },
    ],
    footnote: 'The fix moves the shared read after the last use of r.',
    link: {
      text: 'Borrowing',
      href: docPageRouter({ directory: 'reference', slug: 'borrowing' }),
    },
  },
  {
    topic: DemoTopic.Memory(),
    tab: 'Memory',
    title: 'Arena',
    text: 'There is no hidden global heap. Code that allocates asks for an Allocator, and the caller picks one: the system allocator, an arena, or one that always refuses, for tests.',
    pills: ['Arena', 'Allocator', 'Box', 'Shared'],
    caption:
      'List, Box and Shared work unchanged in any allocator. Running out of memory is a typed failure, ! OutOfMemoryError, not a crash.',
    result: ['40 + 2 = ', { strong: '42' }],
    codes: [{ fileName: 'arena.silk', status: 'Copy', code: ARENA_CODE }],
    footnote: 'Imports and recover are in the full example in the docs.',
    link: {
      text: 'Allocation and shared ownership',
      href: docPageRouter({
        directory: 'reference',
        slug: 'allocation-and-shared-ownership',
      }),
    },
  },
]

type Origin = Readonly<{ tag: string; name: string; text: string }>

const ORIGINS: ReadonlyArray<Origin> = [
  {
    tag: 'Typed effects · Services',
    name: 'Effect',
    text: 'Silk started with Effect. It showed how far typed errors, services and effects can carry a codebase as it grows. Silk exists because that kind of scalability shouldn’t be limited to high-level languages.',
  },
  {
    tag: 'Ownership · Borrowing',
    name: 'Rust',
    text: 'Rust designed the memory model today’s software needs, years before anyone expected agents to write code in our lifetime. Every value has an owner and every borrow has a lifetime.',
  },
  {
    tag: 'Explicit resources · Fast builds',
    name: 'Zig',
    text: 'Zig showed how valuable it is to be explicit about system resources. It also showed that incremental compilation and a fast compiler are essential to any loop, especially one measured in tokens per second.',
  },
]

type Highlight = Readonly<{ area: string; title: string; text: string }>

const HIGHLIGHTS: ReadonlyArray<Highlight> = [
  {
    area: 'tls',
    title: 'TLS 1.3 without OpenSSL',
    text: 'Handshake, record layer, X.509 path validation and trust anchors, on crypto from AES-GCM to Ed25519. All Silk.',
  },
  {
    area: 'http',
    title: 'HTTP/1.1, HTTP/2, WebSocket',
    text: 'Clients and servers with HPACK, connection pools, redirects, proxies and gzip or zstd bodies, on native sockets or WASI.',
  },
  {
    area: 'platform',
    title: 'Linux with no libc',
    text: 'Direct system calls and a static entry point, for executables that link no C library at all. WASI Preview 1 and 2 too.',
  },
  {
    area: 'simd',
    title: 'Typed SIMD vectors',
    text: 'Lanes from u8x16 to f64x4, with masks and CPU feature checks, in portable code.',
  },
  {
    area: 'compress',
    title: 'Compression in fixed memory',
    text: 'Deflate, gzip, zstd, xz and LZMA2, decoded in steps with limits you set.',
  },
  {
    area: 'system',
    title: 'Every effect has a stand-in',
    text: 'Files, processes, clocks, randomness and sockets are services. Tests swap in memory transports and seeded randomness.',
  },
]

const STANDARDS: ReadonlyArray<Readonly<{ spec: string; name: string }>> = [
  { spec: 'RFC 8446', name: 'TLS 1.3' },
  { spec: 'RFC 9113', name: 'HTTP/2' },
  { spec: 'RFC 7541', name: 'HPACK' },
  { spec: 'RFC 6455', name: 'WebSocket' },
  { spec: 'RFC 8878', name: 'Zstandard' },
  { spec: 'RFC 8439', name: 'ChaCha20-Poly1305' },
  { spec: 'SP 800-38D', name: 'AES-GCM' },
  { spec: 'RFC 8032', name: 'Ed25519' },
  { spec: 'RFC 7748', name: 'X25519' },
  { spec: 'FIPS 202', name: 'SHA-3' },
  { spec: 'RFC 7693', name: 'BLAKE2b' },
  { spec: 'RFC 5869', name: 'HKDF' },
  { spec: 'RFC 2104', name: 'HMAC' },
  { spec: 'RFC 6125', name: 'server identity' },
  { spec: 'RFC 3986', name: 'URI' },
  { spec: 'RFC 4648', name: 'Base64' },
  { spec: 'RFC 9562', name: 'UUID v1–v8' },
  { spec: 'Unicode 17.0', name: 'NFC · NFD' },
  { spec: 'WASI', name: 'Preview 1 · 2' },
  { spec: 'IEEE 754', name: 'f32 · f64' },
  { spec: 'TOML', name: 'JSON' },
]

type ModuleArea = Readonly<{
  area: string
  modules: ReadonlyArray<Catalog.DocPage>
}>

// The standard library pages are titled with their module path, such as
// silk.http.client, so the area is the second segment.
const moduleAreas: ReadonlyArray<ModuleArea> = pipe(
  Catalog.groups,
  Array.findFirst(group => group.key === 'std'),
  Option.match({
    onNone: () => [],
    onSome: group =>
      pipe(
        group.pages,
        Array.filter(page => page.title.startsWith('silk.')),
        Array.groupBy(page => page.title.split('.')[1] ?? ''),
        Record.toEntries,
        Array.map(([area, modules]) => ({ area, modules })),
        Array.sort(
          Order.mapInput(
            Order.flip(Order.Number),
            (entry: ModuleArea) => entry.modules.length,
          ),
        ),
      ),
  }),
)

const moduleCount = Array.reduce(
  moduleAreas,
  0,
  (total, { modules }) => total + modules.length,
)

const moduleShortName = (page: Catalog.DocPage, area: string): string =>
  page.title.slice(`silk.${area}.`.length)

const areaCount = (area: string): number =>
  pipe(
    Array.findFirst(moduleAreas, entry => entry.area === area),
    Option.match({ onNone: () => 0, onSome: entry => entry.modules.length }),
  )

const TARGETS: ReadonlyArray<string> = [
  'macOS',
  'Linux',
  'Linux, no libc',
  'Windows',
  'WASI',
]

const HOSTS: ReadonlyArray<string> = ['macOS', 'Linux', 'Windows']

type Question = Readonly<{ question: string; answer: string }>

const FAQ: ReadonlyArray<Question> = [
  {
    question: 'Is it hard to learn?',
    answer:
      'If you know Effect or Rust, half of it will look familiar. The tour walks through the rest: services, providers and run.',
  },
  {
    question: 'Is Silk a language for AI?',
    answer:
      'It’s built for how code gets written now, and that includes agents. There’s usually one way to write a thing, silk check reports errors without a full build, every error code is documented and the docs publish /llms.txt. That helps whoever reviews the work just as much.',
  },
]

// SHARED VIEW HELPERS

const container = 'mx-auto w-full max-w-[90rem] px-5 md:px-16'

export const label = (text: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Class('label text-muted')], [text])

export const badge = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        'label rounded-[3px] bg-signal px-2 py-1 text-[0.6875rem] text-on-signal',
      ),
    ],
    [text],
  )

export const tag = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        'label rounded-[3px] border border-rule px-2 py-[3px] text-[0.6875rem] text-muted',
      ),
    ],
    [text],
  )

export const buttonLink = (
  text: string,
  href: string,
  variant: 'Signal' | 'Ink' | 'Outline',
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(href),
      h.Class(
        `inline-flex items-center justify-center gap-2 rounded px-6 py-3.5 text-base font-semibold ${
          variant === 'Signal'
            ? 'bg-signal text-on-signal hover:opacity-90'
            : variant === 'Ink'
              ? 'bg-ink text-paper hover:opacity-85'
              : 'border border-ink text-ink hover:bg-ink hover:text-paper'
        }`,
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
        'inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:text-signal',
      ),
    ],
    [text, Icon.arrowRight('size-3.5', h)],
  )

const period = (h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('text-signal')], ['.'])

const sectionHeading = (
  text: string,
  h: HtmlBuilder<Message>,
  className = '',
): Html =>
  h.h2(
    [
      h.Class(
        `text-[2.5rem] leading-none font-extrabold tracking-tighter md:text-[4rem] ${className}`,
      ),
    ],
    [text, period(h)],
  )

const sectionHeader = (
  sectionLabel: string,
  heading: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'flex flex-col-reverse gap-4 md:flex-row md:items-end md:justify-between md:gap-10',
      ),
    ],
    [
      sectionHeading(heading, h),
      h.p([h.Class('label shrink-0 text-muted md:pb-2')], [sectionLabel]),
    ],
  )

const inlineCode = (text: string, h: HtmlBuilder<Message>): Html =>
  h.code([h.Class('text-[0.92em] text-ink')], [text])

const codeLine = (
  line: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> =>
  line === '' ? [' '] : Code.highlighted(line, 'silk', h)

const codeLines = (code: string): ReadonlyArray<string> => code.split('\n')

// HERO

const installTab = (
  text: string,
  method: InstallMethod,
  selected: InstallMethod,
  h: HtmlBuilder<Message>,
): Html => {
  const isSelected = method._tag === selected._tag
  return h.button(
    [
      h.Type('button'),
      h.Role('tab'),
      h.AriaSelected(isSelected),
      h.OnClick(Message.SelectedInstallMethod({ method })),
      h.Class(
        `label shrink-0 cursor-pointer border-b-2 pt-3.5 pb-3 ${isSelected ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`,
      ),
    ],
    [text],
  )
}

const heroCodePanel = (model: Model, h: HtmlBuilder<Message>): Html => {
  const command = installCommand(model.installMethod)
  return h.figure(
    [
      h.Class(
        'flex min-w-0 flex-col overflow-hidden rounded-md bg-code text-code-plain',
      ),
    ],
    [
      h.figcaption(
        [
          h.Class(
            'flex items-center justify-between border-b border-code-divider py-2 pr-2 pl-5',
          ),
        ],
        [
          h.span([h.Class('label text-code-label')], ['hello.silk']),
          Code.copyButton(
            copyButtonFor(model.copiedCodeIds, 'home-hero', HERO_CODE),
            h,
          ),
        ],
      ),
      h.pre(
        [
          h.Class(
            'overflow-x-auto px-4 pt-4 pb-5 text-[0.71875rem] leading-[1.75] md:px-5 md:pt-5 md:pb-6 md:text-[0.9375rem] md:leading-[1.85]',
          ),
        ],
        [h.code([], Code.highlighted(HERO_CODE, 'silk', h))],
      ),
      h.div(
        [
          h.Role('tablist'),
          h.AriaLabel('Install'),
          h.Class(
            'flex items-center gap-6 overflow-x-auto border-t border-b border-code-divider px-5 scrollbar-none',
          ),
        ],
        [
          installTab(
            'macOS · Linux',
            InstallMethod.Unix(),
            model.installMethod,
            h,
          ),
          installTab(
            'Windows',
            InstallMethod.Windows(),
            model.installMethod,
            h,
          ),
          Option.isSome(maybeScoopInstall)
            ? installTab('Scoop', InstallMethod.Scoop(), model.installMethod, h)
            : h.empty,
          h.a(
            [
              h.Href(Layout.INSTALL_PATH),
              h.Class(
                'label ml-auto hidden shrink-0 items-center gap-1.5 py-3.5 text-muted hover:text-ink sm:flex',
              ),
            ],
            ['All options', Icon.arrowRight('size-3', h)],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3 py-2 pr-2 pl-5')],
        [
          h.pre(
            [
              h.Class(
                'min-w-0 flex-1 overflow-x-auto py-2 text-xs leading-normal scrollbar-none md:text-[0.8125rem]',
              ),
            ],
            [
              h.code(
                [],
                [
                  h.span([h.Class('text-code-label select-none')], ['$ ']),
                  command,
                ],
              ),
            ],
          ),
          Code.copyButton(
            copyButtonFor(model.copiedCodeIds, 'home-install', command),
            h,
          ),
        ],
      ),
    ],
  )
}

const hero = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class(
        `${container} flex flex-col gap-10 pt-12 pb-16 md:gap-12 md:pt-24 md:pb-28`,
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-6 md:gap-8')],
        [
          label('Explicit by design', h),
          h.h1(
            [
              h.Class(
                'max-w-[78rem] text-[3.25rem] leading-[0.96] font-extrabold tracking-display md:text-[6rem] xl:text-[8rem] xl:leading-[0.92]',
              ),
            ],
            ['Built for the way software is written today', period(h)],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid items-start gap-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,46rem)] lg:justify-between lg:gap-16',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-col gap-8')],
            [
              h.p(
                [
                  h.Class(
                    'text-[1.0625rem] leading-[1.6] text-body md:text-xl',
                  ),
                ],
                [
                  'Working with agents is all about clear contracts. Silk exists to give you that. Every effect function states what it returns, how it can fail and what it touches, down to the allocator. Every variable has a lifetime, so nothing is left to luck.',
                ],
              ),
              h.div(
                [h.Class('flex flex-col gap-2.5 sm:flex-row sm:flex-wrap')],
                [
                  buttonLink('Take the tour', Layout.TOUR_PATH, 'Signal', h),
                  buttonLink('Read the book', Layout.BOOK_PATH, 'Outline', h),
                ],
              ),
            ],
          ),
          heroCodePanel(model, h),
        ],
      ),
    ],
  )

// ONE PROGRAM, ANNOTATED

// Rem, so the notes stay on their lines at any root font size.
const LINE_HEIGHT = 1.625
const CODE_TOP = 1.75
const NOTE_TITLE_CENTER = 2.4375

const annotationText = (
  annotation: Annotation,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html | string> =>
  Array.map(annotation.text, part =>
    typeof part === 'string'
      ? part
      : h.code([h.Class('font-mono text-[0.95em] text-ink')], [part.code]),
  )

const annotationNote = (
  annotation: Annotation,
  h: HtmlBuilder<Message>,
): Html => {
  const isLeft = annotation.side === 'Left'
  return h.keyed('div')(
    annotation.number,
    [
      h.Style({
        top: `${CODE_TOP + (annotation.line - 1) * LINE_HEIGHT + LINE_HEIGHT / 2 - NOTE_TITLE_CENTER}rem`,
      }),
      h.Class(
        `absolute inset-x-0 flex flex-col gap-2 ${isLeft ? 'items-end text-right' : 'items-start text-left'}`,
      ),
    ],
    [
      h.p(
        [h.Class('label text-signal')],
        [`${annotation.number} · ${annotation.kind}`],
      ),
      h.p(
        [
          h.Class(
            'relative text-2xl leading-[1.875rem] font-bold tracking-tight text-ink',
          ),
        ],
        [
          annotation.title,
          h.span(
            [
              h.AriaHidden(true),
              h.Class(
                `absolute top-1/2 flex w-10 items-center ${isLeft ? '-right-12' : '-left-12 flex-row-reverse'}`,
              ),
            ],
            [
              h.span([
                h.Class(
                  'size-[7px] shrink-0 rounded-full border border-signal',
                ),
              ]),
              h.span([
                h.Class('h-0 flex-1 border-t border-dashed border-signal'),
              ]),
            ],
          ),
        ],
      ),
      h.p(
        [h.Class('pt-0.5 text-base leading-6 text-body')],
        annotationText(annotation, h),
      ),
    ],
  )
}

const isAnnotatedLine = (line: number): boolean =>
  Array.some(
    ANNOTATIONS,
    annotation => line >= annotation.firstLine && line <= annotation.lastLine,
  )

const annotatedCodeRow = (
  line: string,
  number: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('div')(
    `${number}`,
    [
      h.Class(
        `flex h-[1.625rem] items-center gap-6 border-l-2 pr-8 pl-6 ${isAnnotatedLine(number) ? 'border-signal bg-signal-soft/40' : 'border-transparent'}`,
      ),
    ],
    [
      h.span(
        [
          h.AriaHidden(true),
          h.Class('w-5 shrink-0 text-right text-code-gutter select-none'),
        ],
        [`${number}`],
      ),
      h.code([h.Class('whitespace-pre')], codeLine(line, h)),
    ],
  )

const annotatedCodePanel = (h: HtmlBuilder<Message>): Html =>
  h.figure(
    [
      h.Class(
        'flex min-w-0 flex-col overflow-hidden rounded-md bg-code text-code-plain',
      ),
    ],
    [
      h.pre(
        [h.Class('overflow-x-auto pt-7 pb-5 text-[0.8125rem] xl:text-sm')],
        Array.map(codeLines(ANNOTATED_CODE), (line, index) =>
          annotatedCodeRow(line, index + 1, h),
        ),
      ),
      h.figcaption(
        [
          h.Class(
            'flex gap-6 border-t border-dashed border-code-divider px-6 py-4 font-mono text-sm text-code-label',
          ),
        ],
        [
          h.span([h.Class('w-5 shrink-0 text-right')], ['//']),
          h.span(
            [],
            [
              'program : Effect<',
              h.span([h.Class('text-code-plain')], ['()']),
              ' ',
              h.span([h.Class('text-signal')], ['!']),
              ' LogError ',
              h.span([h.Class('text-signal')], ['?']),
              ' &mut Random | &mut Logger>',
            ],
          ),
        ],
      ),
    ],
  )

const typeKey = (h: HtmlBuilder<Message>): Html => {
  const key = (symbol: Html | string, text: string): Html =>
    h.div(
      [h.Class('flex items-baseline gap-3')],
      [
        h.span(
          [h.Class('w-7 font-mono text-lg font-bold text-ink md:w-auto')],
          [symbol],
        ),
        h.span([h.Class('text-[0.9375rem] text-body')], [text]),
      ],
    )
  return h.div(
    [
      h.Class(
        'flex flex-col gap-4 border-y border-rule py-6 lg:flex-row lg:items-center lg:gap-12 lg:border-b-0 lg:py-0 lg:pt-8',
      ),
    ],
    [
      h.p(
        [h.Class('font-mono text-[1.375rem] text-muted md:text-2xl')],
        [
          'Effect<',
          h.span([h.Class('font-bold text-ink')], ['A']),
          ' ',
          h.span([h.Class('font-bold text-signal')], ['!']),
          ' ',
          h.span([h.Class('font-bold text-ink')], ['E']),
          ' ',
          h.span([h.Class('font-bold text-signal')], ['?']),
          ' ',
          h.span([h.Class('font-bold text-ink')], ['R']),
          '>',
        ],
      ),
      h.div(
        [h.Class('flex flex-col gap-2 lg:flex-row lg:gap-12')],
        [
          key('A', 'what it returns'),
          key(
            h.span([], [h.span([h.Class('text-signal')], ['!']), 'E']),
            'how it can fail',
          ),
          key(
            h.span([], [h.span([h.Class('text-signal')], ['?']), 'R']),
            'what it needs',
          ),
        ],
      ),
      h.a(
        [
          h.Href(Layout.TOUR_PATH),
          h.Class(
            'hidden items-center gap-1.5 text-base font-semibold underline underline-offset-4 hover:text-signal lg:ml-auto lg:flex',
          ),
        ],
        ['Take the tour', Icon.arrowRight('size-4', h)],
      ),
    ],
  )
}

const annotatedDesktop = (h: HtmlBuilder<Message>): Html => {
  const notes = (side: Side): Html =>
    h.div(
      [h.Class('relative')],
      pipe(
        ANNOTATIONS,
        Array.filter(annotation => annotation.side === side),
        Array.map(annotation => annotationNote(annotation, h)),
      ),
    )
  return h.div(
    [
      h.Class(
        'hidden grid-cols-[15.5rem_minmax(0,1fr)_15.5rem] gap-12 xl:grid',
      ),
    ],
    [notes('Left'), annotatedCodePanel(h), notes('Right')],
  )
}

const snippet = (
  firstLine: number,
  lastLine: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.pre(
    [
      h.Class(
        'overflow-x-auto rounded-md border-l-2 border-signal bg-code py-3.5 text-xs leading-5 text-code-plain',
      ),
    ],
    pipe(
      codeLines(ANNOTATED_CODE),
      Array.map((line, index) => ({ line, number: index + 1 })),
      Array.filter(({ number }) => number >= firstLine && number <= lastLine),
      Array.map(({ line, number }) =>
        h.keyed('div')(
          `${number}`,
          [h.Class('flex gap-3.5 px-3.5')],
          [
            h.span(
              [
                h.AriaHidden(true),
                h.Class('w-4 shrink-0 text-right text-code-gutter select-none'),
              ],
              [`${number}`],
            ),
            h.code([h.Class('whitespace-pre')], codeLine(line, h)),
          ],
        ),
      ),
    ),
  )

const annotatedSteps = (h: HtmlBuilder<Message>): Html =>
  h.ol(
    [h.Class('flex flex-col gap-10 xl:hidden')],
    pipe(
      ANNOTATIONS,
      Array.sort(
        Order.mapInput(
          Order.Number,
          (annotation: Annotation) => annotation.line,
        ),
      ),
      Array.map(annotation =>
        h.keyed('li')(
          annotation.number,
          [h.Class('flex flex-col gap-3')],
          [
            h.p(
              [h.Class('label text-signal')],
              [`${annotation.number} · ${annotation.kind}`],
            ),
            h.h3(
              [h.Class('text-[1.375rem] leading-7 font-bold tracking-tight')],
              [annotation.title],
            ),
            h.p(
              [h.Class('text-[0.9375rem] leading-[1.55] text-body')],
              annotationText(annotation, h),
            ),
            snippet(annotation.firstLine, annotation.lastLine, h),
          ],
        ),
      ),
    ),
  )

const annotated = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('band')],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-10 py-16 md:gap-16 md:py-28`)],
        [
          sectionHeader('01 — How it reads', 'One program, annotated', h),
          typeKey(h),
          annotatedDesktop(h),
          annotatedSteps(h),
        ],
      ),
    ],
  )

// SEE IT RUN

const lane = (
  name: string,
  cells: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex h-11 items-center gap-3 border-t border-rule')],
    [
      h.span(
        [h.Class('w-12 shrink-0 font-mono text-[0.8125rem] text-ink sm:w-22')],
        [name],
      ),
      h.div(
        [
          h.Class(
            'flex flex-1 items-center gap-1 font-mono text-[0.625rem] sm:text-[0.6875rem]',
          ),
        ],
        cells,
      ),
    ],
  )

const solid = (
  text: string,
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [h.Class(`rounded-[3px] px-1.5 py-1.5 whitespace-nowrap ${className}`)],
    [text],
  )

const dashed = (
  text: string,
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [
      h.Class(
        `rounded-[3px] border border-dashed px-1.5 py-[5px] whitespace-nowrap ${className}`,
      ),
    ],
    [text],
  )

const spacer = (className: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.AriaHidden(true), h.Class(className)])

const axis = (ticks: ReadonlyArray<string>, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.AriaHidden(true),
      h.Class(
        'flex items-center gap-3 pb-2.5 label text-[0.625rem] text-muted',
      ),
    ],
    [
      h.span([h.Class('w-12 shrink-0 sm:w-22')], ['Task']),
      h.div(
        [h.Class('flex flex-1 justify-between')],
        Array.map(ticks, tick => h.span([], [tick])),
      ),
    ],
  )

const fibersVisual = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col border-b border-rule')],
    [
      axis(['0s', '1s', '2s'], h),
      lane(
        'root',
        [
          solid('fork ×2', 'w-16 bg-ink text-paper', h),
          h.span([
            h.Class('h-0 flex-1 border-t border-dashed border-muted/50'),
          ]),
          solid('join → 42', 'w-20 bg-signal text-on-signal font-semibold', h),
        ],
        h,
      ),
      lane(
        'slow',
        [
          spacer('w-16 shrink-0', h),
          dashed('sleep(2s)', 'flex-1 border-signal text-signal', h),
          solid('→ 20', 'w-20 bg-body text-paper', h),
        ],
        h,
      ),
      lane(
        'fast',
        [
          spacer('w-16 shrink-0', h),
          dashed('sleep(1s)', 'flex-1 border-signal text-signal', h),
          solid('→ 22', 'w-20 bg-body text-paper', h),
          spacer('flex-1', h),
        ],
        h,
      ),
    ],
  )

const schedulingVisual = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-5')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-1.5 font-mono text-xs')],
        pipe(
          ['exponential(100ms)', 'jittered', 'capDelay(2s)', 'limit(5)'],
          Array.map((step, index) =>
            h.span(
              [
                h.Class(
                  `rounded border bg-paper px-2 py-1.5 ${index === 0 ? 'border-ink text-ink' : 'border-rule text-body'}`,
                ),
              ],
              [step],
            ),
          ),
          Array.intersperse(h.span([h.Class('text-muted')], ['|>'])),
        ),
      ),
      h.div(
        [h.Class('flex flex-col border-b border-rule')],
        [
          axis(['0ms', '~350ms', '~700ms'], h),
          lane(
            'fetch',
            [
              solid('✕', 'w-7 text-center bg-ink text-paper', h),
              dashed('100', 'flex-1 text-center border-muted/60 text-muted', h),
              solid('✕', 'w-7 text-center bg-ink text-paper', h),
              dashed(
                '200',
                'flex-[2] text-center border-muted/60 text-muted',
                h,
              ),
              solid('✕', 'w-7 text-center bg-ink text-paper', h),
              dashed(
                '400ms',
                'flex-[4] text-center border-signal text-signal',
                h,
              ),
              solid(
                '42',
                'w-10 text-center bg-signal text-on-signal font-semibold',
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.6875rem] text-muted',
          ),
        ],
        [
          h.span(
            [h.Class('flex items-center gap-1.5')],
            [
              h.span([h.Class('size-2.5 rounded-sm bg-ink')]),
              'fails with Busy',
            ],
          ),
          h.span(
            [h.Class('flex items-center gap-1.5')],
            [
              h.span([
                h.Class(
                  'size-2.5 rounded-sm border border-dashed border-muted',
                ),
              ]),
              'waits, ±20% jitter',
            ],
          ),
        ],
      ),
    ],
  )

const borrowsVisual = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-5')],
    [
      h.div(
        [h.Class('flex flex-col border-b border-rule')],
        [
          h.div(
            [
              h.AriaHidden(true),
              h.Class(
                'flex items-center gap-3 pb-2.5 label text-[0.625rem] text-muted',
              ),
            ],
            [
              h.span([h.Class('w-12 shrink-0 sm:w-22')], ['Loan']),
              h.div(
                [h.Class('grid flex-1 grid-cols-4')],
                Array.map(['Line 3', 'Line 4', 'Line 5', 'Line 6'], text =>
                  h.span([], [text]),
                ),
              ),
            ],
          ),
          lane(
            '&mut x',
            [
              solid('mutable · until r.* = 2', 'flex-[3] bg-ink text-paper', h),
              spacer('flex-1', h),
            ],
            h,
          ),
          lane(
            '&x',
            [
              spacer('flex-1', h),
              solid(
                'overlap',
                'flex-[2] bg-signal text-on-signal font-semibold',
                h,
              ),
              dashed('shared', 'flex-1 border-muted/60 text-muted', h),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex flex-col gap-2 rounded-md bg-[#0b0b0c] p-4 font-mono text-xs leading-[1.6] text-[#c9c9cc]',
          ),
        ],
        [
          h.p(
            [],
            [
              h.span([h.Class('text-[#8a8a90]')], ['src/main.silk:4:11: ']),
              h.span([h.Class('font-bold text-signal')], ['error[OWN0010]']),
              ' A shared borrow of `x` conflicts with an earlier mutable borrow of it that is still in use; use that borrow for the last time before this one',
            ],
          ),
          h.p(
            [h.Class('text-[#8a8a90]')],
            ['  note: src/main.silk:3:11: the earlier borrow starts here'],
          ),
        ],
      ),
    ],
  )

const memoryVisual = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [
          h.AriaHidden(true),
          h.Class('flex justify-between label text-[0.625rem] text-muted'),
        ],
        [h.span([], ['Arena chunk']), h.span([], ['Bump cursor →'])],
      ),
      h.div(
        [
          h.Class(
            'flex h-14 overflow-hidden rounded border border-ink font-mono text-xs',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'flex w-24 flex-col justify-center border-r border-paper bg-ink px-3 text-paper sm:w-28',
              ),
            ],
            [
              h.span([h.Class('text-[0.625rem] text-muted')], ['values[0]']),
              h.span([h.Class('font-bold')], ['40']),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex w-24 flex-col justify-center bg-ink px-3 text-paper sm:w-28',
              ),
            ],
            [
              h.span([h.Class('text-[0.625rem] text-muted')], ['values[1]']),
              h.span([h.Class('font-bold')], ['2']),
            ],
          ),
          h.span([h.AriaHidden(true), h.Class('w-0.5 bg-signal')]),
          h.div(
            [
              h.Class(
                'flex flex-1 items-center bg-[repeating-linear-gradient(135deg,var(--color-paper)_0_6px,var(--color-code)_6px_12px)] px-3.5 text-muted',
              ),
            ],
            ['free'],
          ),
        ],
      ),
      h.ol(
        [
          h.Class(
            'flex flex-col gap-1.5 pt-1.5 text-sm leading-[1.5] text-body',
          ),
        ],
        Array.map(
          [
            'Each append bumps the cursor. No per-value free.',
            'When the arena is dropped, its chunks go back at once.',
            'Out of memory is a typed failure, not a crash.',
          ],
          (text, index) =>
            h.li(
              [h.Class('flex gap-2.5')],
              [
                h.span(
                  [h.Class('w-4 shrink-0 font-mono text-signal')],
                  [`${index + 1}`],
                ),
                text,
              ],
            ),
        ),
      ),
    ],
  )

const demoVisual = (topic: DemoTopic, h: HtmlBuilder<Message>): Html =>
  DemoTopic.match(topic, {
    Fibers: () => fibersVisual(h),
    Scheduling: () => schedulingVisual(h),
    Borrows: () => borrowsVisual(h),
    Memory: () => memoryVisual(h),
  })

const demoTab = (
  demo: Demo,
  selected: DemoTopic,
  h: HtmlBuilder<Message>,
): Html => {
  const isSelected = demo.topic._tag === selected._tag
  return h.keyed('button')(
    demo.topic._tag,
    [
      h.Type('button'),
      h.Role('tab'),
      h.Id(`demo-tab-${demo.topic._tag}`),
      h.AriaSelected(isSelected),
      h.AriaControls('demo-panel'),
      h.OnClick(Message.SelectedDemoTopic({ topic: demo.topic })),
      h.Class(
        `label shrink-0 cursor-pointer border-b-2 pb-4 text-[0.75rem] md:text-[0.8125rem] ${isSelected ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`,
      ),
    ],
    [demo.tab],
  )
}

const demoCode = (
  copiedCodeIds: CopiedCodeIds,
  { fileName, status, code }: DemoCode,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('div')(
    fileName,
    [h.Class('flex min-w-0 flex-col')],
    [
      h.div(
        [
          h.Class(
            'flex items-center justify-between border-b border-rule py-2 pr-2 pl-6',
          ),
        ],
        [
          h.span([h.Class('label text-muted')], [fileName]),
          status === 'Copy'
            ? Code.copyButton(
                copyButtonFor(copiedCodeIds, `demo-${fileName}`, code),
                h,
              )
            : h.span(
                [
                  h.Class(
                    `label py-1.5 pr-3 ${status === '1 error' ? 'text-signal' : 'text-muted'}`,
                  ),
                ],
                [status],
              ),
        ],
      ),
      h.pre(
        [
          h.Class(
            'overflow-x-auto px-6 py-5 text-xs leading-[1.85] md:text-[0.8125rem]',
          ),
        ],
        [h.code([], Code.highlighted(code, 'silk', h))],
      ),
    ],
  )

const demoPanel = (model: Model, demo: Demo, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id('demo-panel'),
      h.Role('tabpanel'),
      h.AriaLabelledBy(`demo-tab-${demo.topic._tag}`),
      h.Class(
        'flex flex-col overflow-hidden rounded-lg border border-rule lg:flex-row',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'flex flex-col gap-6 border-b border-rule bg-panel p-5 md:gap-7 md:p-8 lg:w-[37.5rem] lg:shrink-0 lg:border-r lg:border-b-0',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-start gap-4')],
            [
              h.span(
                [
                  h.AriaHidden(true),
                  h.Class(
                    'flex size-10 shrink-0 items-center justify-center rounded-md bg-signal text-on-signal md:size-11',
                  ),
                ],
                [Icon.play('h-3.5 w-3', h)],
              ),
              h.div(
                [h.Class('flex flex-col gap-1.5')],
                [
                  h.h3(
                    [h.Class('font-mono text-base font-bold md:text-lg')],
                    [demo.title],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-[0.9375rem] leading-[1.55] text-body md:text-base',
                      ),
                    ],
                    [demo.text],
                  ),
                ],
              ),
            ],
          ),
          h.ul(
            [h.Class('flex flex-wrap gap-2 font-mono text-xs')],
            Array.map(demo.pills, (pill, index) =>
              h.li(
                [
                  h.Class(
                    `rounded px-2.5 py-1.5 ${index === 0 ? 'bg-ink text-paper' : 'border border-rule bg-paper text-body'}`,
                  ),
                ],
                [pill],
              ),
            ),
          ),
          demoVisual(demo.topic, h),
          h.p([h.Class('text-sm leading-[1.5] text-muted')], [demo.caption]),
          h.div(
            [
              h.Class(
                'flex items-center justify-between gap-4 rounded-md bg-[#0b0b0c] px-4 py-3.5 font-mono text-xs md:text-[0.8125rem]',
              ),
            ],
            [
              h.span([h.Class('label text-[#8a8a90]')], ['Result']),
              h.span(
                [h.Class('text-right text-white')],
                Array.map(demo.result, part =>
                  typeof part === 'string'
                    ? part
                    : h.span([h.Class('font-bold text-signal')], [part.strong]),
                ),
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex min-w-0 flex-1 flex-col bg-paper')],
        [
          h.div(
            [
              h.Class(
                'flex flex-1 flex-col [&>*+*]:border-t [&>*+*]:border-rule',
              ),
            ],
            Array.map(demo.codes, code =>
              demoCode(model.copiedCodeIds, code, h),
            ),
          ),
          h.div(
            [
              h.Class(
                'flex flex-col gap-3 border-t border-rule px-6 py-4 sm:flex-row sm:items-center sm:justify-between',
              ),
            ],
            [
              h.p([h.Class('text-sm text-muted')], [demo.footnote]),
              textLink(demo.link.text, demo.link.href, h),
            ],
          ),
        ],
      ),
    ],
  )

const seeItRun = (model: Model, h: HtmlBuilder<Message>): Html => {
  const demo = pipe(
    Array.findFirst(
      DEMOS,
      candidate => candidate.topic._tag === model.demoTopic._tag,
    ),
    Option.getOrElse(() => Array.headNonEmpty(DEMOS)),
  )
  return h.section(
    [],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-8 py-16 md:gap-10 md:py-28`)],
        [
          h.div(
            [h.Class('flex flex-col gap-5')],
            [
              sectionHeader('02 — In practice', 'See it run', h),
              h.p(
                [
                  h.Class(
                    'max-w-[40rem] text-base leading-[1.55] text-body md:text-[1.1875rem]',
                  ),
                ],
                [
                  'Concurrency, borrows and memory follow the same rule: the type says what happens. Pick a topic.',
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Role('tablist'),
              h.AriaLabel('Examples'),
              h.Class(
                'flex gap-6 overflow-x-auto border-b border-rule scrollbar-none md:gap-10',
              ),
            ],
            Array.map(DEMOS, candidate =>
              demoTab(candidate, model.demoTopic, h),
            ),
          ),
          demoPanel(model, demo, h),
        ],
      ),
    ],
  )
}

// WHERE SILK COMES FROM

const origins = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-10 py-16 md:gap-16 md:py-28`)],
        [
          sectionHeader('03 — Acknowledgments', 'Where Silk comes from', h),
          h.div(
            [h.Class('grid gap-10 md:grid-cols-3 md:gap-12')],
            Array.map(ORIGINS, origin =>
              h.keyed('article')(
                origin.name,
                [h.Class('flex flex-col gap-4 border-t-2 border-ink pt-6')],
                [
                  h.p([h.Class('label text-signal')], [origin.tag]),
                  h.h3(
                    [
                      h.Class(
                        'text-[1.875rem] leading-none font-extrabold tracking-tighter md:text-[2.5rem]',
                      ),
                    ],
                    [origin.name],
                  ),
                  h.p(
                    [h.Class('text-base leading-[1.6] text-body md:text-lg')],
                    [origin.text],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

// BATTERIES INCLUDED

const highlightCard = (highlight: Highlight, h: HtmlBuilder<Message>): Html =>
  h.keyed('article')(
    highlight.area,
    [
      h.Class(
        'flex w-[17rem] shrink-0 snap-start flex-col gap-3 rounded-md border border-rule bg-panel p-4 md:w-auto md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-0 md:pt-7 md:pr-10 md:pb-8',
      ),
    ],
    [
      h.p(
        [h.Class('label text-[0.6875rem] text-signal')],
        [`${highlight.area} · ${areaCount(highlight.area)} modules`],
      ),
      h.h3(
        [h.Class('text-xl leading-tight font-bold tracking-tight md:text-2xl')],
        [highlight.title],
      ),
      h.p(
        [h.Class('text-[0.9375rem] leading-[1.55] text-body md:text-base')],
        [highlight.text],
      ),
    ],
  )

const moduleArea = (entry: ModuleArea, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    entry.area,
    [h.Class('mb-6 flex break-inside-avoid flex-col gap-1.5')],
    [
      h.p(
        [
          h.Class(
            'flex justify-between border-b border-ink pb-1.5 font-mono text-[0.6875rem] font-semibold tracking-[0.1em] uppercase',
          ),
        ],
        [
          entry.area,
          h.span([h.Class('text-signal')], [`${entry.modules.length}`]),
        ],
      ),
      h.ul(
        [
          h.Class(
            'flex flex-wrap gap-x-1.5 font-mono text-[0.6875rem] leading-[1.6] text-muted md:block',
          ),
        ],
        Array.map(entry.modules, page =>
          h.keyed('li')(
            Catalog.pageKey(page),
            [
              h.Class(
                'after:content-["·"] after:pl-1.5 last:after:content-none md:after:content-none',
              ),
            ],
            [
              h.a(
                [
                  h.Href(Catalog.pagePath(page)),
                  h.Class('hover:text-ink hover:underline'),
                ],
                [moduleShortName(page, entry.area)],
              ),
            ],
          ),
        ),
      ),
    ],
  )

const batteries = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-10 py-16 md:gap-14 md:py-28`)],
        [
          h.div(
            [
              h.Class(
                'flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16',
              ),
            ],
            [
              h.div(
                [h.Class('flex max-w-[45rem] flex-col gap-6')],
                [
                  label('04 — In the box', h),
                  sectionHeading('Batteries included', h),
                  h.p(
                    [
                      h.Class(
                        'text-base leading-[1.55] text-body md:text-[1.1875rem]',
                      ),
                    ],
                    [
                      'TLS 1.3, HTTP/2, zstd and SIMD vectors are written in Silk, under the same allocator, failure and service rules as your code. So is ',
                      inlineCode('memcpy', h),
                      '. An HTTPS client needs one dependency: the toolchain.',
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class('flex flex-col gap-2 lg:items-end')],
                [
                  h.p(
                    [
                      h.Class(
                        'text-[7rem] leading-[0.9] font-extrabold tracking-display md:text-[11rem]',
                      ),
                    ],
                    [`${moduleCount}`],
                  ),
                  label('Modules in the standard library', h),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                '-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:gap-0 md:overflow-visible md:border-t-2 md:border-ink md:px-0 xl:grid-cols-3',
              ),
            ],
            Array.map(HIGHLIGHTS, highlight => highlightCard(highlight, h)),
          ),
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              label('Standards implemented in Silk', h),
              h.ul(
                [
                  h.Class(
                    'flex flex-wrap gap-2 font-mono text-[0.6875rem] md:text-xs',
                  ),
                ],
                Array.map(STANDARDS, ({ spec, name }) =>
                  h.li(
                    [
                      h.Class(
                        'rounded border border-rule px-2.5 py-1.5 text-body',
                      ),
                    ],
                    [h.span([h.Class('text-muted')], [`${spec} `]), name],
                  ),
                ),
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'group/wall flex flex-col gap-6 border-t-2 border-ink pt-6',
              ),
            ],
            [
              h.div(
                [h.Class('flex items-end justify-between')],
                [
                  label(`Every module · ${moduleAreas.length} areas`, h),
                  h.div(
                    [h.Class('hidden md:block')],
                    [
                      textLink(
                        'Browse the standard library',
                        docPageRouter({ directory: 'std', slug: 'overview' }),
                        h,
                      ),
                    ],
                  ),
                ],
              ),
              h.div(
                [
                  h.Class(
                    'relative max-h-[24rem] overflow-hidden columns-1 gap-5 sm:columns-2 md:max-h-none md:columns-4 xl:columns-6 group-has-[details[open]]/wall:max-h-none',
                  ),
                ],
                [
                  ...Array.map(moduleAreas, entry => moduleArea(entry, h)),
                  h.div([
                    h.AriaHidden(true),
                    h.Class(
                      'pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-paper md:hidden group-has-[details[open]]/wall:hidden',
                    ),
                  ]),
                ],
              ),
              h.details(
                [h.Class('group/more md:hidden')],
                [
                  h.summary(
                    [
                      h.Class(
                        'flex cursor-pointer list-none justify-center rounded border border-ink px-5 py-3.5 font-semibold [&::-webkit-details-marker]:hidden',
                      ),
                    ],
                    [
                      h.span(
                        [h.Class('group-open/more:hidden')],
                        [`Show all ${moduleAreas.length} areas`],
                      ),
                      h.span(
                        [h.Class('hidden group-open/more:inline')],
                        ['Show fewer'],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// CROSS-COMPILATION

const crossCompile = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('band')],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-10 py-16 md:gap-16 md:py-28`)],
        [
          sectionHeader(
            '05 — Cross-compilation',
            'Cross-compile to every target',
            h,
          ),
          h.div(
            [
              h.Class(
                'grid gap-12 lg:grid-cols-[minmax(0,48rem)_minmax(0,1fr)] lg:gap-24',
              ),
            ],
            [
              h.div(
                [h.Class('flex flex-col gap-8')],
                [
                  h.p(
                    [
                      h.Class(
                        'max-w-[40rem] text-base leading-[1.55] text-body md:text-xl',
                      ),
                    ],
                    [
                      'Silk compiles to macOS, Linux with or without libc, Windows and WebAssembly, and any host can build for all of them.',
                    ],
                  ),
                  h.div(
                    [h.Class('overflow-x-auto')],
                    [
                      h.table(
                        [
                          h.Class(
                            'w-full min-w-[20rem] table-fixed border-collapse text-left',
                          ),
                        ],
                        [
                          h.thead(
                            [],
                            [
                              h.tr(
                                [h.Class('border-b border-rule')],
                                [
                                  h.th(
                                    [
                                      h.Scope('col'),
                                      h.Class(
                                        'label w-[4.5rem] pb-3 text-[0.625rem] text-muted md:w-36 md:text-xs',
                                      ),
                                    ],
                                    ['Host → target'],
                                  ),
                                  ...Array.map(TARGETS, target =>
                                    h.th(
                                      [
                                        h.Scope('col'),
                                        h.Class(
                                          'label pb-3 text-center text-[0.625rem] text-ink md:text-xs',
                                        ),
                                      ],
                                      [target],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          h.tbody(
                            [],
                            Array.map(HOSTS, host =>
                              h.keyed('tr')(
                                host,
                                [h.Class('border-b border-rule')],
                                [
                                  h.th(
                                    [
                                      h.Scope('row'),
                                      h.Class(
                                        'h-12 text-[0.9375rem] font-semibold md:h-16 md:text-lg',
                                      ),
                                    ],
                                    [host],
                                  ),
                                  ...Array.map(TARGETS, target =>
                                    h.td(
                                      [h.Class('text-center')],
                                      [
                                        h.span(
                                          [h.Class('sr-only')],
                                          [`${host} builds for ${target}`],
                                        ),
                                        h.span([
                                          h.AriaHidden(true),
                                          h.Class(
                                            'inline-block size-2 rounded-full bg-signal md:size-2.5',
                                          ),
                                        ]),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              h.div(
                [
                  h.Class(
                    'flex flex-col gap-5 lg:border-l lg:border-rule lg:pl-12',
                  ),
                ],
                [
                  h.p(
                    [h.Class('label text-signal')],
                    ['Incremental by design'],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-[6rem] leading-[0.95] font-extrabold tracking-display md:text-[7.5rem]',
                      ),
                    ],
                    [h.span([h.Class('text-signal')], ['<']), '1 s'],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-xl leading-[1.35] font-semibold tracking-tight md:text-[1.375rem]',
                      ),
                    ],
                    [
                      'to rebuild after a typical edit to the 365k‑line Silk compiler',
                      h.span([h.Class('text-signal')], ['*']),
                    ],
                  ),
                  h.p(
                    [
                      h.Class(
                        'pt-2 text-base leading-[1.55] text-body md:text-lg',
                      ),
                    ],
                    [
                      'Compile speed is a core value, not an optimization pass. Every new feature is weighed by what it costs the rebuild, because a slow loop is a slow loop for people and agents alike.',
                    ],
                  ),
                  h.p(
                    [
                      h.Class(
                        'pt-1 font-mono text-xs leading-[1.5] text-muted',
                      ),
                    ],
                    [
                      h.span([h.Class('text-signal')], ['* ']),
                      'Measured on a 16-inch MacBook Pro (2021) with an Apple M1 Max and 32 GB of memory.',
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// QUESTIONS

const faq = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [],
    [
      h.div(
        [
          h.Class(
            `${container} grid gap-10 py-16 md:py-28 lg:grid-cols-[30rem_minmax(0,1fr)] lg:gap-24`,
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-col gap-6 md:gap-8')],
            [label('06 — Before you start', h), sectionHeading('Questions', h)],
          ),
          h.dl(
            [
              h.Class(
                'flex flex-col gap-10 border-t-2 border-ink pt-6 lg:border-0 lg:pt-1.5',
              ),
            ],
            Array.map(FAQ, ({ question, answer }) =>
              h.keyed('div')(
                question,
                [h.Class('flex flex-col gap-3')],
                [
                  h.dt(
                    [h.Class('text-xl font-bold tracking-tight md:text-2xl')],
                    [question],
                  ),
                  h.dd(
                    [h.Class('text-base leading-[1.6] text-body md:text-lg')],
                    [answer],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

// CLOSING

const closing = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('signal-band')],
    [
      h.div(
        [h.Class(`${container} flex flex-col gap-7 py-18 md:gap-10 md:py-32`)],
        [
          h.p(
            [h.Class('label')],
            ['Status: alpha — the compiler already builds itself'],
          ),
          h.h2(
            [
              h.Class(
                'max-w-[72rem] text-[3.25rem] leading-none font-extrabold tracking-display text-white md:text-[9rem] md:leading-[0.95]',
              ),
            ],
            ['This is just the beginning.'],
          ),
          h.p(
            [
              h.Class(
                'max-w-[45rem] text-[1.0625rem] leading-[1.55] md:text-[1.375rem]',
              ),
            ],
            [
              'The language, the standard library and the tools are moving fast. Try it today, pin your toolchain, and help shape what Silk becomes.',
            ],
          ),
          h.div(
            [
              h.Class(
                'flex flex-col gap-6 pt-2 md:flex-row md:items-center md:justify-between',
              ),
            ],
            [
              h.div(
                [h.Class('flex flex-col gap-2.5 sm:flex-row')],
                [
                  buttonLink('Take the tour', Layout.TOUR_PATH, 'Ink', h),
                  h.a(
                    [
                      h.Href(Layout.BOOK_PATH),
                      h.Class(
                        'inline-flex items-center justify-center rounded border border-white px-6 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-ink',
                      ),
                    ],
                    ['Read the book'],
                  ),
                ],
              ),
              h.a(
                [
                  h.Href(releasesRouter()),
                  h.Class(
                    'inline-flex items-center gap-1.5 font-mono text-[0.8125rem] hover:underline',
                  ),
                ],
                [
                  'APIs may change before 1.0. Every release lists what changed',
                  Icon.arrowRight('size-3.5', h),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Layout.page(
    'Home',
    [
      hero(model, h),
      annotated(h),
      seeItRun(model, h),
      origins(h),
      batteries(h),
      crossCompile(h),
      faq(h),
      closing(h),
    ],
    h,
  )
