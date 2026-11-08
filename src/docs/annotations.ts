// What `silk lsp` said about the docs code blocks fenced as ```silk twoslash,
// written by `pnpm annotate` (scripts/annotate.ts).

import { Option, Schema } from 'effect'

import { hash } from '../annotate/hash'
import { Annotations } from '../annotate/model'
import file from './annotations.json'

const AnnotationsFile = Schema.Struct({
  silkVersion: Schema.String,
  blocks: Schema.Record(Schema.String, Annotations),
})

const { blocks } = Schema.decodeUnknownSync(AnnotationsFile)(file)

// The annotations of a block, by its source with the markers.
export const annotationsFor = (source: string): Option.Option<Annotations> =>
  Option.fromNullishOr(blocks[hash(source)])
