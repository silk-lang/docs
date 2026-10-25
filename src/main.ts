import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Command, Dom, Render, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import {
  type Url,
  fromString as urlFromString,
  toString as urlToString,
} from 'foldkit/url'

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
import * as Search from './search'

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

const routeKey = (route: AppRoute): Option.Option<string> =>
  Option.map(routePage(route), Catalog.pageKey)

// The pages a reader is likely to open next, fetched ahead of time.
const neighborKeys = (route: AppRoute): ReadonlyArray<string> =>
  Option.match(routePage(route), {
    onNone: () => [],
    onSome: page => {
      const { maybePrevious, maybeNext } = Catalog.neighbors(page)
      return Array.map(
        Array.getSomes([maybeNext, maybePrevious]),
        Catalog.pageKey,
      )
    },
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

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  Flags,
  Search.SearchIndexService
> = (flags, url) => {
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
    openGroups: openGroupsFor(HashSet.empty(), route),
    maybeActiveSection: Option.none(),
    maybePendingAnchor: Option.none(),
    documents: HashMap.empty(),
    requestedDocumentKeys: HashSet.empty(),
    search: Search.init().model,
  }

  return Option.match(maybePage, {
    onNone: () => ({ model: baseModel }),
    onSome: page =>
      Option.match(maybeFlaggedDocument, {
        onSome: ({ key, document }) =>
          requestDocuments(
            modifyFields(baseModel, {
              doc: () => DocState.Loaded({ key, document }),
              documents: HashMap.set(key, document),
            }),
            neighborKeys(route),
          ),
        onNone: () =>
          requestDocuments(
            modifyFields(baseModel, {
              doc: () => DocState.Loading({ key: Catalog.pageKey(page) }),
              maybePendingAnchor: () => url.hash,
            }),
            [Catalog.pageKey(page)],
          ),
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

// UPDATE

type UpdateReturn = Update.Return<Model, Message, Search.SearchIndexService>

const readSearch = (model: Model): Option.Option<Search.Model> =>
  Option.some(model.search)

const writeSearch = (model: Model, nextSearch: Search.Model): Model =>
  modifyFields(model, { search: () => nextSearch })

const toGotSearchMessage = (message: Search.Message): Message =>
  Message.GotSearchMessage({ message })

const foldSearch = Update.foldChild({
  update: Search.update,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

const foldSearchOpen = Update.foldChildStep({
  update: Search.open,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

const foldSearchRouteChanged = Update.foldChildStep({
  update: Search.informRouteChanged,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

// Starts a download for each key that is neither downloaded nor on its way.
// Vite keeps every loaded chunk, so a document is fetched once per visit.
const requestDocuments = (
  model: Model,
  keys: ReadonlyArray<string>,
  commands: ReadonlyArray<Command.Command<Message>> = [],
): UpdateReturn => {
  const missingKeys = Array.dedupe(
    Array.filter(
      keys,
      key =>
        !HashMap.has(model.documents, key) &&
        !HashSet.has(model.requestedDocumentKeys, key),
    ),
  )
  return Array.isReadonlyArrayEmpty(missingKeys) &&
    Array.isReadonlyArrayEmpty(commands)
    ? { model }
    : {
        model: modifyFields(model, {
          requestedDocumentKeys: requestedKeys =>
            Array.reduce(missingKeys, requestedKeys, (keySet, key) =>
              HashSet.add(keySet, key),
            ),
        }),
        commands: [
          ...commands,
          ...Array.map(missingKeys, key => LoadDocument({ key })),
        ],
      }
}

const scrollCommands = (
  url: Url,
  isSamePath: boolean,
): ReadonlyArray<Command.Command<Message>> =>
  Option.match(url.hash, {
    onNone: () => (isSamePath ? [] : [ScrollToTop()]),
    onSome: hash => [ScrollToAnchor({ hash })],
  })

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
    onSome: key => {
      if (isDocumentCurrent) {
        return { model: nextModel, commands: scrollCommands(url, isSamePath) }
      }
      return Option.match(HashMap.get(model.documents, key), {
        onSome: document =>
          requestDocuments(
            modifyFields(nextModel, {
              doc: () => DocState.Loaded({ key, document }),
            }),
            neighborKeys(nextRoute),
            scrollCommands(url, isSamePath),
          ),
        onNone: () =>
          requestDocuments(
            modifyFields(nextModel, {
              doc: () => DocState.Loading({ key }),
              maybePendingAnchor: () => url.hash,
            }),
            [key],
            [ScrollToTop()],
          ),
      })
    },
    onNone: () => ({
      model: nextModel,
      commands: scrollCommands(url, isSamePath),
    }),
  })
}

// The page key a link points at, when it is a docs page.
const docLinkKey = (target: EventTarget | null): Option.Option<string> => {
  if (!(target instanceof Element)) {
    return Option.none()
  }
  const anchor = target.closest('a[href]')
  if (
    !(anchor instanceof HTMLAnchorElement) ||
    anchor.origin !== window.location.origin
  ) {
    return Option.none()
  }
  return pipe(
    urlFromString(anchor.href),
    Option.flatMap(url => routeKey(urlToAppRoute(url))),
  )
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
    ChangedUrl: ({ url }) =>
      Update.combine(model, [
        foldSearchRouteChanged,
        stepModel => changeUrl(stepModel, url),
      ]),
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
    SucceededLoadDocument: ({ key, document }) => {
      const cachedModel = modifyFields(model, {
        documents: HashMap.set(key, document),
        requestedDocumentKeys: HashSet.remove(key),
      })
      return model.doc._tag === 'Loading' && model.doc.key === key
        ? requestDocuments(
            modifyFields(cachedModel, {
              doc: () => DocState.Loaded({ key, document }),
              maybePendingAnchor: () => Option.none(),
            }),
            neighborKeys(model.route),
            Option.match(model.maybePendingAnchor, {
              onNone: () => [],
              onSome: hash => [ScrollToAnchor({ hash })],
            }),
          )
        : { model: cachedModel }
    },
    FailedLoadDocument: ({ key }) => {
      const nextModel = modifyFields(model, {
        requestedDocumentKeys: HashSet.remove(key),
      })
      return model.doc._tag === 'Loading' && model.doc.key === key
        ? {
            model: modifyFields(nextModel, {
              doc: () => DocState.Failed({ key }),
            }),
          }
        : { model: nextModel }
    },
    PointedAtDocLink: ({ key }) => requestDocuments(model, [key]),
    ClickedSidebarGroup: ({ groupKey }) => ({
      model: modifyFields(model, {
        openGroups: openGroups =>
          HashSet.has(openGroups, groupKey)
            ? HashSet.remove(openGroups, groupKey)
            : HashSet.add(openGroups, groupKey),
      }),
    }),
    PressedSearchShortcut: () => foldSearchOpen(model),
    ClickedOpenSearch: () => foldSearchOpen(model),
    GotSearchMessage: ({ message }) => foldSearch(model, message),
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
  // `/` or Cmd+K (Ctrl+K off macOS) opens search from any page.
  searchShortcut: entry(
    { isSearchOpen: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isSearchOpen: model.search.dialog.isOpen,
      }),
      dependenciesToStream: ({ isSearchOpen }) =>
        Stream.when(
          Dom.streamFromEventFilterMapPreventDefault({
            target: document,
            type: 'keydown',
            filterMapEvent: event => {
              const target = event.target
              const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
              const isSlash = event.key === '/' && !isTyping
              const isCommandK =
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
              return isSlash || isCommandK
                ? Option.some(Message.PressedSearchShortcut())
                : Option.none()
            },
          }),
          Effect.sync(() => !isSearchOpen),
        ),
    },
  ),
  // Hovering, focusing or touching a docs link starts downloading its page, so
  // the document is usually there by the time the click lands.
  docLinkIntent: entry(
    { isListening: Schema.Boolean },
    {
      modelToDependencies: () => ({ isListening: true }),
      dependenciesToStream: () =>
        Stream.mergeAll(
          Array.map(['pointerover', 'focusin', 'touchstart'] as const, type =>
            Dom.streamFromEventFilterMap({
              target: document,
              type,
              options: { passive: true },
              filterMapEvent: event =>
                Option.map(docLinkKey(event.target), key =>
                  Message.PointedAtDocLink({ key }),
                ),
            }),
          ),
          { concurrency: 'unbounded' },
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
    [h.Class('mx-auto flex max-w-[90rem] flex-col gap-5 px-5 py-16 md:px-20')],
    [
      h.h1(
        [
          h.Class(
            'text-4xl font-bold leading-none tracking-tighter md:text-6xl',
          ),
        ],
        [title],
      ),
      h.p(
        [h.Class('max-w-[38.75rem] text-lg leading-prose text-muted')],
        [text],
      ),
    ],
  )

// The same markup serves as the static 404.html for every missing path, so it
// does not name the path.
const notFound = (h: HtmlBuilder<Message>): Html =>
  Layout.page(
    'Home',
    [
      placeholder('Not found', 'There is no page at this address.', h),
      h.p(
        [h.Class('mx-auto max-w-[90rem] px-5 pb-16 md:px-20')],
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
        onNone: () => notFound(h),
        onSome: page => DocsPage.pageView(model, page, h),
      }),
    Releases: () => Releases.view(model.copiedCodeIds, h),
    NotFound: () => notFound(h),
  })

const searchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: 'search',
    model: model.search,
    view: Search.view,
    toParentMessage: toGotSearchMessage,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route),
  body: h.div([], [pageView(model, h), searchView(model, h)]),
})
