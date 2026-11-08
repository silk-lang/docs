import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'
import { FONTS } from './scene'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  // Canvas text uses only fonts already loaded, and nothing on the page asks
  // for some of the weights the image uses, so they load here.
  fonts: entry(
    { areFontsReady: Schema.Boolean },
    {
      modelToDependencies: model => ({ areFontsReady: model.areFontsReady }),
      dependenciesToStream: ({ areFontsReady }) =>
        areFontsReady
          ? Stream.empty
          : Stream.fromEffect(
              Effect.promise(() =>
                Promise.all(FONTS.map(font => document.fonts.load(font))),
              ).pipe(Effect.as(Message.LoadedFonts())),
            ),
    },
  ),
}))
