import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'
import { FONTS } from './scene'

// How long the code has to stay the same before it is checked.
const SETTLE = Duration.millis(600)

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
  // The language server checks the code once it stops changing. A change
  // restarts the stream, which drops a check still waiting.
  annotations: entry(
    { code: Schema.String },
    {
      modelToDependencies: model => ({ code: model.settings.code }),
      dependenciesToStream: ({ code }) =>
        Stream.fromEffect(
          Effect.sleep(SETTLE).pipe(
            Effect.andThen(
              Effect.tryPromise(() =>
                import('./language').then(({ annotate }) => annotate(code)),
              ),
            ),
            Effect.option,
          ),
        ).pipe(
          Stream.flatMap(maybeAnnotations =>
            maybeAnnotations._tag === 'Some' &&
            maybeAnnotations.value !== undefined
              ? Stream.succeed(
                  Message.ReceivedAnnotations({
                    code,
                    annotations: maybeAnnotations.value,
                  }),
                )
              : Stream.empty,
          ),
        ),
    },
  ),
}))
