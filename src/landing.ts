import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

// The choices a reader makes on the landing page: which install command the
// hero shows, and which example the "See it run" section shows.

export const InstallMethod = defineTaggedUnion({
  Unix: {},
  Windows: {},
  Scoop: {},
})
export type InstallMethod = typeof InstallMethod.Type

export const DemoTopic = defineTaggedUnion({
  Fibers: {},
  Scheduling: {},
  Borrows: {},
  Memory: {},
})
export type DemoTopic = typeof DemoTopic.Type

// The fibers example runs in the browser: idle until the reader presses Run,
// then the value it returned and how long it took.
export const FibersRun = defineTaggedUnion({
  Idle: {},
  Running: {},
  Finished: { value: Schema.Number, milliseconds: Schema.Number },
  Failed: {},
})
export type FibersRun = typeof FibersRun.Type
