import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'
import { PlaygroundService } from './service'

export const subscriptions = Subscription.make<
  Model,
  Message,
  PlaygroundService
>()(entry => ({
  // While a program runs, its output arrives as it writes it.
  runOutput: entry(
    { isRunning: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isRunning: model.runState._tag === 'Running',
      }),
      dependenciesToStream: ({ isRunning }) =>
        isRunning
          ? Stream.unwrap(
              Effect.gen(function* () {
                const playground = yield* PlaygroundService
                return playground.progress
              }),
            ).pipe(
              Stream.map(({ clear, progress }) =>
                Message.ReceivedRunOutput({ clear, output: progress }),
              ),
            )
          : Stream.empty,
    },
  ),
}))
