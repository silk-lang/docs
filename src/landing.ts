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
