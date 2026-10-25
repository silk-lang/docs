import { HashMap, HashSet, Option } from 'effect'

import { DocState, Model } from './model'
import { type AppRoute } from './route'
import * as Search from './search'

export const testModel = (route: AppRoute): Model =>
  Model.make({
    route,
    copiedCodeIds: HashSet.empty(),
    doc: DocState.Idle(),
    openGroups: HashSet.empty(),
    maybeActiveSection: Option.none(),
    maybePendingAnchor: Option.none(),
    documents: HashMap.empty(),
    requestedDocumentKeys: HashSet.empty(),
    search: Search.init().model,
  })
