import { HashMap, HashSet, Option } from 'effect'

import { DemoTopic, FibersRun, InstallMethod } from './landing'
import { DocState, Model } from './model'
import * as Playground from './playground'
import { type AppRoute } from './route'
import * as Search from './search'
import * as Snippet from './snippet'

export const testModel = (route: AppRoute): Model =>
  Model.make({
    route,
    copiedCodeIds: HashSet.empty(),
    doc: DocState.Idle(),
    openGroups: HashSet.empty(),
    isDocsNavOpen: false,
    maybeActiveSection: Option.none(),
    maybePendingAnchor: Option.none(),
    documents: HashMap.empty(),
    requestedDocumentKeys: HashSet.empty(),
    versionCatalogs: HashMap.empty(),
    search: Search.init().model,
    installMethod: InstallMethod.Unix(),
    demoTopic: DemoTopic.Fibers(),
    fibersRun: FibersRun.Idle(),
    playground: Playground.init().model,
    snippet: Snippet.init().model,
  })
