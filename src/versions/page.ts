import { Array } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Layout from '../layout'
import { type Message } from '../message'
import { docsRouter, versionedDocPageRouter } from '../route'
import { versions } from './list'

const date = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

// /v: every release whose docs are archived, newest first.
export const view = (h: HtmlBuilder<Message>): Html =>
  Layout.page(
    'Docs',
    [
      h.section(
        [
          h.Class(
            'mx-auto flex max-w-[56rem] flex-col gap-8 px-5 py-16 md:px-10 md:py-24',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-col gap-5')],
            [
              h.p([h.Class('label text-muted')], ['Docs']),
              h.h1(
                [
                  h.Class(
                    'text-[2.75rem] leading-none font-extrabold tracking-tighter md:text-[4rem]',
                  ),
                ],
                ['Every version', h.span([h.Class('text-signal')], ['.'])],
              ),
              h.p(
                [h.Class('text-lg leading-[1.65] text-body')],
                [
                  'The standard library reference of every release, generated from its source. ',
                  h.a(
                    [
                      h.Href(docsRouter()),
                      h.Class(
                        'font-semibold text-ink underline decoration-signal underline-offset-4 hover:text-signal',
                      ),
                    ],
                    ['The current docs'],
                  ),
                  ' follow the newest release, and the guides are always current.',
                ],
              ),
            ],
          ),
          Array.match(versions, {
            onEmpty: () =>
              h.p(
                [h.Role('status'), h.Class('text-muted')],
                ['This build has no archived versions.'],
              ),
            onNonEmpty: entries =>
              h.ul(
                [h.Class('flex flex-col border-t-2 border-ink')],
                Array.map(entries, (entry, index) =>
                  h.keyed('li')(
                    entry.version,
                    [h.Class('border-b border-rule')],
                    [
                      h.a(
                        [
                          h.Href(
                            versionedDocPageRouter({
                              version: entry.version,
                              directory: 'std',
                              slug: 'overview',
                            }),
                          ),
                          h.Class(
                            'flex items-baseline justify-between gap-4 py-3.5 hover:text-signal',
                          ),
                        ],
                        [
                          h.span(
                            [h.Class('font-mono font-semibold')],
                            [
                              entry.version,
                              index === 0
                                ? h.span(
                                    [
                                      h.Class(
                                        'ml-3 label text-[0.625rem] text-signal',
                                      ),
                                    ],
                                    ['Newest'],
                                  )
                                : '',
                            ],
                          ),
                          h.span(
                            [h.Class('text-sm text-muted')],
                            [date(entry.publishedAt)],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          }),
        ],
      ),
    ],
    h,
  )
