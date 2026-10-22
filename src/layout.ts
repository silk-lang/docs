import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Icon from './icon'
import { docsRouter, homeRouter, releasesRouter } from './route'

export const GITHUB_URL = 'https://github.com/silk-lang/silk'

export type NavSection = 'Home' | 'Docs' | 'Releases'

const wordmark = <Message>(className: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class(`font-bold tracking-tighter ${className}`)],
    [h.span([h.Class('text-signal')], ['$']), ' silk'],
  )

const navLink = <Message>(
  label: string,
  href: string,
  isCurrent: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(href),
      h.Class(
        isCurrent
          ? 'font-bold text-ink'
          : 'text-ink hover:underline underline-offset-4',
      ),
      ...(isCurrent ? [h.AriaCurrent('page')] : []),
    ],
    [label],
  )

export const siteNav = <Message>(
  current: NavSection,
  h: HtmlBuilder<Message>,
): Html =>
  h.header(
    [h.Class('border-b border-rule')],
    [
      h.nav(
        [
          h.AriaLabel('Main'),
          h.Class(
            'mx-auto flex max-w-[90rem] items-center justify-between gap-6 px-5 py-6 md:px-20 md:py-8',
          ),
        ],
        [
          h.a(
            [h.Href(homeRouter()), h.AriaLabel('Silk home')],
            [wordmark('text-2xl leading-none', h)],
          ),
          h.div(
            [h.Class('flex items-center gap-6 text-sm md:gap-9')],
            [
              navLink('Docs', docsRouter(), current === 'Docs', h),
              navLink('Releases', releasesRouter(), current === 'Releases', h),
              h.a(
                [
                  h.Href(GITHUB_URL),
                  h.Class(
                    'flex items-center gap-1.5 hover:underline underline-offset-4',
                  ),
                ],
                ['GitHub', Icon.arrowUpRight('size-3.5', h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const footerLink = <Message>(
  label: string,
  href: string,
  h: HtmlBuilder<Message>,
): Html => h.a([h.Href(href), h.Class('text-muted hover:text-ink')], [label])

export const siteFooter = <Message>(h: HtmlBuilder<Message>): Html =>
  h.footer(
    [h.Class('border-t border-rule')],
    [
      h.div(
        [
          h.Class(
            'mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-20',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-4')],
            [
              wordmark('text-base', h),
              h.span(
                [h.Class('text-xs text-muted')],
                ['Alpha. Built by Julia.'],
              ),
            ],
          ),
          h.nav(
            [
              h.AriaLabel('Footer'),
              h.Class('flex flex-wrap items-center gap-x-7 gap-y-3 text-sm'),
            ],
            [
              footerLink('Docs', docsRouter(), h),
              footerLink('Releases', releasesRouter(), h),
              footerLink('GitHub', GITHUB_URL, h),
            ],
          ),
        ],
      ),
    ],
  )

export const page = <Message>(
  current: NavSection,
  content: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex min-h-screen flex-col bg-paper text-ink')],
    [siteNav(current, h), h.main([h.Class('flex-1')], content), siteFooter(h)],
  )
