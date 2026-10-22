import {
  Array,
  Effect,
  HashSet,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import {
  Command,
  Dom,
  Render,
  Runtime,
  Subscription,
  type Update,
} from 'foldkit'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { type Url, toString as urlToString } from 'foldkit/url'

import * as Catalog from './docs/catalog'
import * as Content from './docs/content'
import * as DocsMarkdown from './docs/markdown'
import * as Layout from './layout'
import { Message } from './message'
import { DocState, Flags, Model } from './model'
import * as DocsPage from './page/docs'
import * as Home from './page/home'
import * as Releases from './page/releases'
import { AppRoute, homeRouter, urlToAppRoute } from './route'

export { Flags, Message, Model }

// ROUTE HELPERS

const routePage = (route: AppRoute): Option.Option<Catalog.DocPage> =>
  route._tag === 'DocPage'
    ? Catalog.findPage(route.directory, route.slug)
    : Option.none()

const routePath = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => '/',
    Docs: () => '/docs',
    DocPage: page => Catalog.pagePath(page),
    Releases: () => '/releases',
    NotFound: ({ path }) => path,
  })

const docStateKey = (doc: DocState): Option.Option<string> =>
  DocState.match(doc, {
    Idle: () => Option.none(),
    Loading: ({ key }) => Option.some(key),
    Loaded: ({ key }) => Option.some(key),
    Failed: ({ key }) => Option.some(key),
  })

const openGroupsFor = (
  openGroups: HashSet.HashSet<string>,
  route: AppRoute,
): HashSet.HashSet<string> =>
  pipe(
    routePage(route),
    Option.flatMap(Catalog.findGroup),
    Option.match({
      onNone: () => openGroups,
      onSome: group => HashSet.add(openGroups, group.key),
    }),
  )

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags,
  url,
) => {
  const route = urlToAppRoute(url)
  const maybePage = routePage(route)
  const maybeFlaggedDocument = pipe(
    flags.maybeDocument,
    Option.filter(({ key }) =>
      Option.exists(maybePage, page => Catalog.pageKey(page) === key),
    ),
  )
  const baseModel: Model = {
    route,
    copiedCodeIds: HashSet.empty(),
    doc: DocState.Idle(),
    sidebarQuery: '',
    openGroups: openGroupsFor(HashSet.empty(), route),
    maybeActiveSection: Option.none(),
    maybePendingAnchor: Option.none(),
  }

  return Option.match(maybePage, {
    onNone: () => ({ model: baseModel }),
    onSome: page =>
      Option.match(maybeFlaggedDocument, {
        onSome: ({ key, document }) => ({
          model: modifyFields(baseModel, {
            doc: () => DocState.Loaded({ key, document }),
          }),
        }),
        onNone: () => ({
          model: modifyFields(baseModel, {
            doc: () => DocState.Loading({ key: Catalog.pageKey(page) }),
            maybePendingAnchor: () => url.hash,
          }),
          commands: [LoadDocument({ key: Catalog.pageKey(page) })],
        }),
      }),
  })
}

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

export const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return Message.CompletedScrollToTop()
  }),
})

export const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: Schema.String },
  messages: [Message.CompletedScrollToAnchor],
  execute: ({ hash }) =>
    Dom.scrollIntoViewAfterPaint(`#${CSS.escape(hash)}`, {
      block: 'start',
    }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor())),
})

export const CopyCode = Command.define('CopyCode', {
  args: { codeId: Schema.String, text: Schema.String },
  messages: [Message.SucceededCopyCode, Message.FailedCopyCode],
  execute: ({ codeId, text }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(text)).pipe(
      Effect.as(Message.SucceededCopyCode({ codeId })),
      Effect.catch(() => Effect.succeed(Message.FailedCopyCode())),
    ),
})

export const WaitBeforeHidingCopied = Command.define('WaitBeforeHidingCopied', {
  args: { codeId: Schema.String },
  messages: [Message.CompletedWaitBeforeHidingCopied],
  execute: ({ codeId }) =>
    Effect.sleep('2 seconds').pipe(
      Effect.as(Message.CompletedWaitBeforeHidingCopied({ codeId })),
    ),
})

export const LoadDocument = Command.define('LoadDocument', {
  args: { key: Schema.String },
  messages: [Message.SucceededLoadDocument, Message.FailedLoadDocument],
  execute: ({ key }) =>
    Content.loadDocumentByKey(key).pipe(
      Effect.map(document => Message.SucceededLoadDocument({ key, document })),
      Effect.catch(() => Effect.succeed(Message.FailedLoadDocument({ key }))),
    ),
})

export const FocusSearch = Command.define('FocusSearch', {
  messages: [Message.CompletedFocusSearch],
  execute: Dom.focus(`#${DocsPage.SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearch()),
  ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const changeUrl = (model: Model, url: Url): UpdateReturn => {
  const nextRoute = urlToAppRoute(url)
  const isSamePath = routePath(nextRoute) === routePath(model.route)
  const maybePage = routePage(nextRoute)
  const maybeNextKey = Option.map(maybePage, Catalog.pageKey)
  const isDocumentCurrent =
    model.doc._tag !== 'Failed' &&
    Option.exists(maybeNextKey, key =>
      Option.contains(docStateKey(model.doc), key),
    )

  const nextModel = modifyFields(model, {
    route: () => nextRoute,
    openGroups: openGroups => openGroupsFor(openGroups, nextRoute),
    maybeActiveSection: maybeActiveSection =>
      isSamePath ? maybeActiveSection : Option.none(),
    maybePendingAnchor: () => Option.none(),
  })

  return Option.match(maybeNextKey, {
    onSome: key =>
      isDocumentCurrent
        ? {
            model: nextModel,
            commands: Option.match(url.hash, {
              onNone: () => (isSamePath ? [] : [ScrollToTop()]),
              onSome: hash => [ScrollToAnchor({ hash })],
            }),
          }
        : {
            model: modifyFields(nextModel, {
              doc: () => DocState.Loading({ key }),
              maybePendingAnchor: () => url.hash,
            }),
            commands: [LoadDocument({ key }), ScrollToTop()],
          },
    onNone: () => ({
      model: nextModel,
      commands: Option.match(url.hash, {
        onNone: () => (isSamePath ? [] : [ScrollToTop()]),
        onSome: hash => [ScrollToAnchor({ hash })],
      }),
    }),
  })
}

// Static files such as /releases/index.json sit beside the pages but are not
// routes, so the browser loads them directly.
const isStaticFile = (url: Url): boolean => /\.[a-z0-9]+$/i.test(url.pathname)

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [
            isStaticFile(url)
              ? LoadExternal({ href: urlToString(url) })
              : NavigateInternal({ url: urlToString(url) }),
          ],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),
    ChangedUrl: ({ url }) => changeUrl(model, url),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedScrollToTop: () => ({ model }),
    CompletedScrollToAnchor: () => ({ model }),
    ClickedCopyCode: ({ codeId, text }) => ({
      model,
      commands: [CopyCode({ codeId, text })],
    }),
    SucceededCopyCode: ({ codeId }) =>
      HashSet.has(model.copiedCodeIds, codeId)
        ? { model }
        : {
            model: modifyFields(model, {
              copiedCodeIds: HashSet.add(codeId),
            }),
            commands: [WaitBeforeHidingCopied({ codeId })],
          },
    FailedCopyCode: () => ({ model }),
    CompletedWaitBeforeHidingCopied: ({ codeId }) => ({
      model: modifyFields(model, { copiedCodeIds: HashSet.remove(codeId) }),
    }),
    SucceededLoadDocument: ({ key, document }) =>
      Option.contains(docStateKey(model.doc), key)
        ? {
            model: modifyFields(model, {
              doc: () => DocState.Loaded({ key, document }),
              maybePendingAnchor: () => Option.none(),
            }),
            commands: Option.match(model.maybePendingAnchor, {
              onNone: () => [],
              onSome: hash => [ScrollToAnchor({ hash })],
            }),
          }
        : { model },
    FailedLoadDocument: ({ key }) =>
      Option.contains(docStateKey(model.doc), key)
        ? {
            model: modifyFields(model, { doc: () => DocState.Failed({ key }) }),
          }
        : { model },
    UpdatedSidebarQuery: ({ value }) => ({
      model: modifyFields(model, { sidebarQuery: () => value }),
    }),
    ClickedSidebarGroup: ({ groupKey }) => ({
      model: modifyFields(model, {
        openGroups: openGroups =>
          HashSet.has(openGroups, groupKey)
            ? HashSet.remove(openGroups, groupKey)
            : HashSet.add(openGroups, groupKey),
      }),
    }),
    PressedSearchShortcut: () => ({ model, commands: [FocusSearch()] }),
    CompletedFocusSearch: () => ({ model }),
    ChangedActiveSection: ({ sectionId }) => ({
      model: modifyFields(model, {
        maybeActiveSection: () => Option.some(sectionId),
      }),
    }),
  })

// SUBSCRIPTION

const loadedTableOfContents = (model: Model): ReadonlyArray<string> =>
  DocState.match(model.doc, {
    Idle: () => [],
    Loading: () => [],
    Failed: () => [],
    Loaded: ({ document }) =>
      Array.map(DocsMarkdown.tableOfContents(document), entry => entry.id),
  })

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  searchShortcut: entry(
    { isDocsRoute: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isDocsRoute:
          model.route._tag === 'Docs' || model.route._tag === 'DocPage',
      }),
      dependenciesToStream: ({ isDocsRoute }) =>
        Stream.when(
          Dom.streamFromEventFilterMapPreventDefault({
            target: document,
            type: 'keydown',
            filterMapEvent: event => {
              const target = event.target
              const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement
              return event.key === '/' && !isTyping
                ? Option.some(Message.PressedSearchShortcut())
                : Option.none()
            },
          }),
          Effect.sync(() => isDocsRoute),
        ),
    },
  ),
  activeSection: entry(
    { sections: Schema.Array(Schema.String) },
    {
      modelToDependencies: model => ({
        sections: loadedTableOfContents(model),
      }),
      dependenciesToStream: ({ sections }) =>
        Stream.callback<Message>(queue =>
          Effect.gen(function* () {
            if (!Array.isReadonlyArrayNonEmpty(sections)) {
              return yield* Effect.never
            }

            yield* Render.afterCommit

            yield* Effect.acquireRelease(
              Effect.sync(() => {
                const observer = new IntersectionObserver(
                  entries =>
                    pipe(
                      entries,
                      Array.filter(({ isIntersecting }) => isIntersecting),
                      Array.head,
                      Option.match({
                        onNone: () => undefined,
                        onSome: ({ target }) => {
                          Queue.offerUnsafe(
                            queue,
                            Message.ChangedActiveSection({
                              sectionId: target.id,
                            }),
                          )
                        },
                      }),
                    ),
                  { rootMargin: '0px 0px -70% 0px' },
                )
                Array.forEach(sections, sectionId => {
                  const element = document.getElementById(sectionId)
                  if (element !== null) {
                    observer.observe(element)
                  }
                })
                return observer
              }),
              observer => Effect.sync(() => observer.disconnect()),
            )

            return yield* Effect.never
          }),
        ),
    },
  ),
}))

// VIEW

const SITE_NAME = 'Silk'

const routeTitle = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => 'Silk: composability, all the way down',
    Docs: () => `Docs | ${SITE_NAME}`,
    DocPage: ({ directory, slug }) =>
      Option.match(Catalog.findPage(directory, slug), {
        onNone: () => `Not found | ${SITE_NAME}`,
        onSome: page => `${page.title} | ${SITE_NAME} docs`,
      }),
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

const notFound = (path: string, h: HtmlBuilder<Message>): Html =>
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
  )

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  AppRoute.match(model.route, {
    Home: () => Home.view(model.copiedCodeIds, h),
    Docs: () => DocsPage.indexView(model, h),
    DocPage: ({ directory, slug }) =>
      Option.match(Catalog.findPage(directory, slug), {
        onNone: () => notFound(`/docs/${directory}/${slug}`, h),
        onSome: page => DocsPage.pageView(model, page, h),
      }),
    Releases: () => Releases.view(model.copiedCodeIds, h),
    NotFound: ({ path }) => notFound(path, h),
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route),
  body: pageView(model, h),
})
