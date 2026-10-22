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
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
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
