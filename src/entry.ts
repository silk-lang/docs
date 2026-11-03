import { Layer } from 'effect'
import { Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  init,
  subscriptions,
  update,
  view,
} from './main'
import * as Playground from './playground'
import * as Search from './search'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  resources: Layer.mergeAll(
    Search.SearchIndexService.Default,
    Playground.PlaygroundService.Default,
  ),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.hydrate(application)
