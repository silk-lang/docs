import { HashSet, Option } from 'effect'

import { DocState, Model } from './model'
import { type AppRoute } from './route'

export const testModel = (route: AppRoute): Model =>
  Model.make({
    route,
    copiedCodeIds: HashSet.empty(),
    doc: DocState.Idle(),
    sidebarQuery: '',
    openGroups: HashSet.empty(),
    maybeActiveSection: Option.none(),
    maybePendingAnchor: Option.none(),
  })
