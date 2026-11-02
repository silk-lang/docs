import { Array, Option } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Code from '../code'
import { type CopiedCodeIds, copyButtonFor } from '../copy'
import * as Icon from '../icon'
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
    [
      h.Class(
        'flex min-w-0 flex-col gap-3 border-t-2 border-ink bg-panel p-5 md:p-6',
      ),
    ],
    [
      h.p([h.Class('label text-signal')], [title]),
      h.p(
        [h.Class('text-[0.9375rem] leading-[1.55] text-body md:text-base')],
        [body],
      ),
      extra,
    ],
  )

const publicKey = (
  copiedCodeIds: CopiedCodeIds,
  h: HtmlBuilder<Message>,
): Html => {
  const copy = copyButtonFor(copiedCodeIds, 'minisign-key', MINISIGN_PUBLIC_KEY)
  return h.div(
    [
      h.Class(
        'flex items-center justify-between gap-3 rounded border border-rule bg-paper py-1.5 pr-1.5 pl-3',
      ),
    ],
    [
      h.code(
        [h.Class('min-w-0 text-[0.6875rem] break-all text-ink')],
        [MINISIGN_PUBLIC_KEY],
      ),
      Code.copyButton(copy, h),
    ],
  )
}

const header = (copiedCodeIds: CopiedCodeIds, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-12 pt-12 md:gap-14 md:pt-24')],
    [
      h.div(
        [h.Class('flex max-w-[54rem] flex-col gap-5 md:gap-6')],
        [
          label('Releases', h),
          h.h1(
            [
              h.Class(
                'text-[3.25rem] leading-none font-extrabold tracking-display md:text-[7rem] md:leading-[0.93]',
              ),
            ],
            ['Download Silk', h.span([h.Class('text-signal')], ['.'])],
          ),
          h.p(
            [
              h.Class(
                'max-w-[40rem] text-[1.0625rem] leading-[1.6] text-body md:text-xl',
              ),
            ],
            [
              'Prebuilt toolchains for macOS, Linux and Windows, newest first. Silk is in alpha, so expect APIs to move between versions.',
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-3 md:grid-cols-3 md:gap-6')],
        [
          note(
            'Install',
            'Prefer an installer or a package manager? The install guide covers the install scripts for macOS, Linux and Windows, Scoop and mise.',
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
  h.th(
    [h.Scope('col'), h.Class(`label py-3 font-medium text-muted ${className}`)],
    [text],
  )

const downloadRow = (
  download: Download,
  isFirstOfOs: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('tr')(
    download.target,
    [
      h.Class(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-rule py-4 md:table-row md:py-0',
      ),
    ],
    [
      h.td(
        [h.Class('text-[1.0625rem] font-semibold md:py-4 md:pr-4')],
        [
          h.span([h.Class(isFirstOfOs ? '' : 'md:invisible')], [download.os]),
          h.span(
            [
              h.Class(
                'pl-2.5 font-mono text-xs font-normal text-muted md:hidden',
              ),
            ],
            [download.arch],
          ),
        ],
      ),
      h.td(
        [
          h.Class(
            'hidden font-mono text-sm text-body md:table-cell md:py-4 md:pr-4',
          ),
        ],
        [download.arch],
      ),
      h.td(
        [h.Class('col-span-2 row-start-2 min-w-0 md:py-4 md:pr-4')],
        [
          h.a(
            [
              h.Href(download.url),
              h.Class(
                'font-mono text-[0.6875rem] break-all text-body hover:text-ink hover:underline md:text-[0.8125rem]',
              ),
            ],
            [download.fileName],
          ),
        ],
      ),
      h.td(
        [
          h.Class(
            'row-start-3 font-mono text-xs text-muted md:py-4 md:pr-4 md:text-[0.8125rem]',
          ),
        ],
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
        [
          h.Class(
            'col-start-2 row-start-1 text-right font-mono text-xs whitespace-nowrap text-body md:py-4 md:pr-6 md:text-[0.8125rem]',
          ),
        ],
        [mebibytes(download.size)],
      ),
      h.td(
        [h.Class('col-start-2 row-start-3 text-right md:py-3')],
        [
          h.a(
            [
              h.Href(download.url),
              h.AriaLabel(`Download ${download.fileName}`),
              h.Class(
                'inline-flex items-center gap-1.5 rounded bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:opacity-85',
              ),
            ],
            ['Download', Icon.arrowDown('size-3.5', h)],
          ),
        ],
      ),
    ],
  )

const downloadTable = (
  downloads: ReadonlyArray<Download>,
  h: HtmlBuilder<Message>,
): Html =>
  h.table(
    [h.Class('block w-full border-collapse text-left md:table')],
    [
      h.thead(
        [h.Class('hidden border-b border-rule md:table-header-group')],
        [
          h.tr(
            [],
            [
              headerCell('OS', 'w-40', h),
              headerCell('Arch', 'w-32', h),
              headerCell('Filename', '', h),
              headerCell('Signature', 'w-32', h),
              headerCell('Size', 'w-28 pr-6 text-right', h),
              h.th(
                [h.Scope('col'), h.Class('w-36')],
                [h.span([h.Class('sr-only')], ['Download'])],
              ),
            ],
          ),
        ],
      ),
      h.tbody(
        [h.Class('block border-t border-rule md:table-row-group md:border-0')],
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
  )

// RELEASES

const releaseMeta = (
  release: Release,
  isLatest: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const { name, build } = splitVersion(release.version)
  return h.div(
    [
      h.Class(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-3.5')],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-2.5')],
            [
              isLatest ? badge('Latest', h) : h.empty,
              release.isPrerelease ? tag('dev build', h) : h.empty,
              h.time(
                [
                  h.Datetime(release.publishedAt),
                  h.Class('font-mono text-xs text-muted md:text-[0.8125rem]'),
                ],
                [release.publishedAt.slice(0, 10)],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3',
              ),
            ],
            [
              h.h2(
                [
                  h.Class(
                    'text-[2.25rem] leading-tight font-extrabold tracking-tighter break-all md:text-5xl',
                  ),
                ],
                [name],
              ),
              build === ''
                ? h.empty
                : h.p(
                    [
                      h.Class(
                        'font-mono text-[0.8125rem] break-all text-muted md:text-lg',
                      ),
                    ],
                    [build],
                  ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-x-7 gap-y-2 md:pb-1.5')],
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
      h.Class(
        'flex flex-col gap-6 border-t-2 border-ink pt-7 pb-10 md:pt-10 md:pb-12',
      ),
    ],
    [releaseMeta(release, isLatest, h), downloadTable(release.downloads, h)],
  )

const releaseList = (h: HtmlBuilder<Message>): Html =>
  Array.match(Array.take(releases, SHOWN_RELEASES), {
    onEmpty: () =>
      h.p([h.Class('text-muted')], ['No releases are published yet.']),
    onNonEmpty: shown =>
      h.div(
        [h.Class('flex flex-col')],
        [
          h.p(
            [h.Class('label pb-5 text-muted')],
            ['All releases · newest first'],
          ),
          ...Array.map(shown, (release, index) =>
            releaseSection(release, index === 0, h),
          ),
        ],
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
        [
          h.Class(
            'mx-auto flex max-w-[90rem] flex-col gap-14 px-5 pb-20 md:gap-20 md:px-16 md:pb-28',
          ),
        ],
        [
          header(copiedCodeIds, h),
          releaseList(h),
          h.p(
            [h.Class('text-sm text-muted')],
            [
              'Older builds, the bare compiler and build receipts are on ',
              h.a(
                [
                  h.Href(RELEASES_URL),
                  h.Class(
                    'font-semibold text-ink underline underline-offset-4',
                  ),
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
