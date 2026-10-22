import { Schema } from 'effect'

// Island directives allowed in content/**/*.md. The Vite plugin validates
// every directive against these at build time.
export const islandAttributes = {
  Anchor: Schema.Struct({ id: Schema.String }),
}
