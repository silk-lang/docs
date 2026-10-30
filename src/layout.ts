import { type Html, type HtmlBuilder } from 'foldkit/html'

import * as Icon from './icon'
import { Message } from './message'
import { docsRouter, homeRouter, releasesRouter } from './route'
import * as Search from './search'

export const GITHUB_URL = 'https://github.com/silk-lang/silk'

export type NavSection = 'Home' | 'Docs' | 'Releases'

// The Silk wordmark (public/brand/silk-wordmark.svg). It draws with
// currentColor, so it follows the text color in light and dark mode.
const WORDMARK_PATH =
  'M17.6000 -14.6000L20.0000 -14.6000L20.0000 -7.5111C20.0000 -7.0693 20.3582 -6.7111 20.8000 -6.7111C20.9937 -6.7111 21.1713 -6.7799 21.3097 -6.8945L21.3097 -6.8945L21.5557 -7.1009C21.9469 -7.4337 22.2083 -7.9145 22.2534 -8.4568C22.3084 -9.3183 23.0246 -10.0000 23.9000 -10.0000C24.8113 -10.0000 25.5500 -9.2613 25.5500 -8.3500C25.5500 -7.8382 25.3170 -7.3809 24.9513 -7.0783L22.4027 -4.9397C22.2302 -4.7929 22.1208 -4.5743 22.1208 -4.3301C22.1208 -4.1065 22.2126 -3.9042 22.3606 -3.7591L22.3610 -3.7587L26.2014 0.0000L22.5986 0.0000L21.3588 -1.2135C21.2146 -1.3542 21.0174 -1.4410 20.8000 -1.4410C20.3582 -1.4410 20.0000 -1.0828 20.0000 -0.6410L20.0000 0.0000L17.6000 0.0000ZM3.2532 -6.0112C2.5590 -6.2060 2.0500 -6.8436 2.0500 -7.6000C2.0500 -8.5113 2.7887 -9.2500 3.7000 -9.2500C4.3514 -9.2500 4.9147 -8.8725 5.1829 -8.3243C5.4234 -7.8801 5.8271 -7.5372 6.3137 -7.3761L7.3834 -7.0490L7.3834 -7.0490C7.4523 -7.0297 7.5249 -7.0193 7.6000 -7.0193C8.0418 -7.0193 8.4000 -7.3775 8.4000 -7.8193L8.4000 -10.0000L10.8000 -10.0000L10.8000 0.0000L8.4000 0.0000L8.4000 -2.3658C8.4000 -3.6044 7.5958 -4.6552 6.4810 -5.0244ZM13.0000 -14.6000L15.4000 -14.6000L15.4000 0.0000L13.0000 0.0000ZM2.1145 -2.5514L1.8033 -2.6772C1.6496 -2.7352 1.4830 -2.7669 1.3090 -2.7669L1.3043 -2.7669L1.3000 -2.7669C0.5820 -2.7669 0.0000 -3.3489 0.0000 -4.0669C0.0000 -4.7849 0.5820 -5.3669 1.3000 -5.3669C1.6524 -5.3669 1.9720 -5.2267 2.2062 -4.9990L2.2074 -4.9978C2.3286 -4.8802 2.4710 -4.7844 2.6283 -4.7166L5.2825 -3.6442C5.9063 -3.4088 6.3500 -2.8062 6.3500 -2.1000C6.3500 -1.1887 5.6113 -0.4500 4.7000 -0.4500C3.9959 -0.4500 3.3948 -0.8910 3.1579 -1.5119C2.9552 -1.9772 2.5807 -2.3504 2.1145 -2.5514ZM10.9000 -12.7000C10.9000 -11.9820 10.3180 -11.4000 9.6000 -11.4000C8.8820 -11.4000 8.3000 -11.9820 8.3000 -12.7000C8.3000 -13.4180 8.8820 -14.0000 9.6000 -14.0000C10.3180 -14.0000 10.9000 -13.4180 10.9000 -12.7000Z'

const wordmark = <Message>(className: string, h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.ViewBox('0 -14.6 26.2014 14.6'),
      h.Fill('currentColor'),
      h.Role('img'),
      h.AriaLabel('Silk'),
      h.Class(`w-auto ${className}`),
    ],
    [h.path([h.D(WORDMARK_PATH)])],
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

const searchButton = (h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaLabel('Search'),
      h.AriaHasPopup('dialog'),
      h.OnClick(Message.ClickedOpenSearch(), {
        focusSelector: `#${Search.KEYBOARD_WARMUP_INPUT_ID}`,
      }),
      h.Class(
        'flex cursor-pointer items-center gap-1.5 text-ink hover:underline underline-offset-4',
      ),
    ],
    [
      Icon.search('size-3.5', h),
      h.span([h.Class('hidden sm:inline')], ['Search']),
    ],
  )

export const siteNav = (current: NavSection, h: HtmlBuilder<Message>): Html =>
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
            [wordmark('h-7 md:h-8', h)],
          ),
          h.div(
            [h.Class('flex items-center gap-6 text-sm md:gap-9')],
            [
              searchButton(h),
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
              wordmark('h-5', h),
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

export const page = (
  current: NavSection,
  content: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex min-h-screen flex-col bg-paper text-ink')],
    [siteNav(current, h), h.main([h.Class('flex-1')], content), siteFooter(h)],
  )
