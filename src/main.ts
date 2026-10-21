import { Effect, Schema, pipe } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as Layout from './layout'
import { AppRoute, homeRouter, urlToAppRoute } from './route'

// MODEL

export const Model = Schema.Struct({
  route: AppRoute,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
})
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = url => ({
  model: { route: urlToAppRoute(url) },
})

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, { route: () => urlToAppRoute(url) }),
    }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
  })

// VIEW

const SITE_NAME = 'Silk'

const routeTitle = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => 'Silk: composability, all the way down',
    Docs: () => `Docs | ${SITE_NAME}`,
    Releases: () => `Download Silk | ${SITE_NAME}`,
    NotFound: () => `Not found | ${SITE_NAME}`,
  })

const placeholder = (
  title: string,
  text: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-16 md:px-20')],
    [
      h.h1(
        [
          h.Class(
            'text-4xl font-bold leading-none tracking-tighter md:text-6xl',
          ),
        ],
        [title],
      ),
      h.p([h.Class('max-w-[620px] text-lg leading-prose text-muted')], [text]),
    ],
  )

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  AppRoute.match(model.route, {
    Home: () =>
      Layout.page(
        'Home',
        [
          placeholder(
            'Composability, all the way down.',
            'Silk is a systems language where effects, failures, and dependencies compose.',
            h,
          ),
        ],
        h,
      ),
    Docs: () =>
      Layout.page(
        'Docs',
        [placeholder('Docs', 'The documentation is on its way.', h)],
        h,
      ),
    Releases: () =>
      Layout.page(
        'Releases',
        [
          placeholder(
            'Download Silk',
            'Prebuilt toolchains for macOS and Linux.',
            h,
          ),
        ],
        h,
      ),
    NotFound: ({ path }) =>
      Layout.page(
        'Home',
        [
          placeholder('Not found', `Nothing lives at ${path}.`, h),
          h.p(
            [h.Class('mx-auto max-w-[1440px] px-5 pb-16 md:px-20')],
            [
              h.a(
                [
                  h.Href(homeRouter()),
                  h.Class('font-bold underline underline-offset-4'),
                ],
                ['Back home'],
              ),
            ],
          ),
        ],
        h,
      ),
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: pipe(model.route, routeTitle),
  body: pageView(model, h),
})
