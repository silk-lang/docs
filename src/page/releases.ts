import { Array, Option } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Layout from '../layout'
import { type Message } from '../message'
import { releases } from '../releases/data'
import {
  type Download,
  INDEX_PATH,
  MINISIGN_PUBLIC_KEY,
  RELEASES_URL,
  type Release,
} from '../releases/release'
import { docPageRouter } from '../route'
import { badge, label, tag, textLink } from './home'

const SHOWN_RELEASES = 10

// FORMATTING

const mebibytes = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MiB`

// `0.1.0-dev.6+1aed5da1a342` reads as the version, then its build metadata.
const splitVersion = (
  version: string,
): Readonly<{ name: string; build: string }> => {
  const plus = version.indexOf('+')
  return plus === -1
    ? { name: version, build: '' }
    : { name: version.slice(0, plus), build: version.slice(plus) }
}

// HEADER

const note = (
  title: string,
  body: string,
  extra: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex min-w-0 flex-col gap-2.5 border-t border-ink pt-4')],
    [label(title, h), h.p([h.Class('text-sm leading-snug')], [body]), extra],
  )

const publicKey = (
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html => {
  const copy = copyButtonFor(copiedCodeIds, 'minisign-key', MINISIGN_PUBLIC_KEY)
  return h.div(
    [
      h.Class(
        'flex items-center justify-between gap-3 rounded-xl bg-code py-1.5 pr-1.5 pl-3.5',
      ),
    ],
    [
      h.code(
        [h.Class('min-w-0 text-xs break-all text-code-plain')],
        [MINISIGN_PUBLIC_KEY],
      ),
      Code.copyButton(copy, h),
    ],
  )
}

const header = (copiedCodeIds: CopiedCodeIds, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-10 px-5 pt-12 md:px-20')],
    [
      h.div(
        [h.Class('flex flex-col items-start gap-5')],
        [
          badge('Releases', h),
          h.h1(
            [
              h.Class(
                'text-4xl leading-none font-bold tracking-tighter md:text-6xl',
              ),
            ],
            ['Download Silk'],
          ),
          h.p(
            [h.Class('max-w-[38.75rem] text-lg leading-prose text-muted')],
            [
              'Prebuilt toolchains for macOS, Linux and Windows, newest first. Silk is in alpha, so expect APIs to move between versions.',
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid gap-8 md:grid-cols-2 xl:grid-cols-[18.75rem_18.75rem_minmax(0,38.5rem)]',
          ),
        ],
        [
          note(
            'Install',
            'Prefer an installer or a package manager? The install guide covers the install scripts for macOS, Linux and Windows, Homebrew, Scoop and mise.',
            textLink(
              'Install guide',
              docPageRouter({ directory: 'get-started', slug: 'install' }),
              h,
            ),
            h,
          ),
          note(
            'Automation',
            'Fetching Silk in CI? The JSON index lists every release on this page with its files, sizes, checksums and signatures.',
            textLink('index.json', INDEX_PATH, h),
            h,
          ),
          note(
            'Verify',
            'Every file is signed with minisign. Check downloads against this public key:',
            publicKey(copiedCodeIds, h),
            h,
          ),
        ],
      ),
    ],
  )

// DOWNLOADS

const headerCell = (
  text: string,
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.th([h.Scope('col'), h.Class(`label pb-3 text-muted ${className}`)], [text])

const downloadRow = (
  download: Download,
  isFirstOfOs: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('tr')(
    download.target,
    [h.Class('border-b border-rule')],
    [
      h.td([h.Class('py-3.5 pr-4')], [isFirstOfOs ? download.os : '']),
      h.td([h.Class('py-3.5 pr-4 text-muted')], [download.arch]),
      h.td(
        [h.Class('py-3.5 pr-4')],
        [
          h.a(
            [
              h.Href(download.url),
              h.Class(
                'font-bold break-all hover:underline hover:underline-offset-4',
              ),
            ],
            [download.fileName],
          ),
        ],
      ),
      h.td(
        [h.Class('py-3.5 pr-4 text-muted')],
        [
          download.signatureUrl === null
            ? '-'
            : h.a(
                [
                  h.Href(download.signatureUrl),
                  h.AriaLabel(`minisign signature for ${download.fileName}`),
                  h.Class('underline underline-offset-4 hover:text-ink'),
                ],
                ['minisig'],
              ),
        ],
      ),
      h.td(
        [h.Class('py-3.5 text-right whitespace-nowrap text-muted')],
        [mebibytes(download.size)],
      ),
    ],
  )

const downloadTable = (
  downloads: ReadonlyArray<Download>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('min-w-0 flex-1 overflow-x-auto lg:max-w-[58.5rem] lg:pt-2.5')],
    [
      h.table(
        [h.Class('w-full min-w-[40rem] border-collapse text-left text-sm')],
        [
          h.thead(
            [h.Class('border-b border-ink')],
            [
              h.tr(
                [],
                [
                  headerCell('OS', 'w-[7.5rem]', h),
                  headerCell('Arch', 'w-[7.5rem]', h),
                  headerCell('Filename', '', h),
                  headerCell('Signature', 'w-[7.5rem]', h),
                  headerCell('Size', 'w-[6rem] text-right', h),
                ],
              ),
            ],
          ),
          h.tbody(
            [],
            Array.map(downloads, (download, index) =>
              downloadRow(
                download,
                !Option.exists(
                  Array.get(downloads, index - 1),
                  previous => previous.os === download.os,
                ),
                h,
              ),
            ),
          ),
        ],
      ),
    ],
  )

// RELEASES

const releaseMeta = (
  release: Release,
  isLatest: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const { name, build } = splitVersion(release.version)
  return h.div(
    [h.Class('flex shrink-0 flex-col gap-3.5 lg:w-[17.5rem]')],
    [
      h.h2(
        [
          h.Class(
            'text-3xl leading-tight font-bold tracking-tighter break-all md:text-4xl',
          ),
        ],
        [name],
      ),
      build === ''
        ? h.empty
        : h.p([h.Class('text-xs break-all text-muted')], [build]),
      h.div(
        [h.Class('flex flex-wrap items-center gap-2.5')],
        [
          isLatest ? badge('Latest', h) : h.empty,
          release.isPrerelease ? tag('dev build', h) : h.empty,
          h.time(
            [h.Datetime(release.publishedAt), h.Class('label text-muted')],
            [release.publishedAt.slice(0, 10)],
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-col gap-2.5 pt-1.5')],
        [
          textLink('Release notes', release.notesUrl, h),
          ...(isLatest
            ? [
                textLink(
                  'Language reference',
                  docPageRouter({ directory: 'reference', slug: 'overview' }),
                  h,
                ),
                textLink(
                  'Standard library',
                  docPageRouter({ directory: 'std', slug: 'overview' }),
                  h,
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}

const releaseSection = (
  release: Release,
  isLatest: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('section')(
    release.tag,
    [
      h.AriaLabel(`Silk ${release.version}`),
      h.Class('flex flex-col gap-6 px-5 pt-8 md:px-20 lg:flex-row lg:gap-16'),
    ],
    [releaseMeta(release, isLatest, h), downloadTable(release.downloads, h)],
  )

const releaseList = (h: HtmlBuilder<Message>): Html =>
  Array.match(Array.take(releases, SHOWN_RELEASES), {
    onEmpty: () =>
      h.p(
        [h.Class('px-5 pt-8 text-muted md:px-20')],
        ['No releases are published yet.'],
      ),
    onNonEmpty: shown =>
      h.div(
        [h.Class('flex flex-col gap-14')],
        Array.map(shown, (release, index) =>
          releaseSection(release, index === 0, h),
        ),
      ),
  })

export const view = (
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html =>
  Layout.page(
    'Releases',
    [
      h.div(
        [h.Class('mx-auto flex max-w-[90rem] flex-col gap-14 pb-16')],
        [
          header(copiedCodeIds, h),
          releaseList(h),
          h.p(
            [h.Class('px-5 text-sm text-muted md:px-20')],
            [
              'Older builds, the bare compiler and build receipts are on ',
              h.a(
                [
                  h.Href(RELEASES_URL),
                  h.Class('font-bold text-ink underline underline-offset-4'),
                ],
                ['GitHub'],
              ),
              '.',
            ],
          ),
        ],
      ),
    ],
    h,
  )
