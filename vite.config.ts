import { type Plugin, defineConfig } from 'vite'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { llmsTxt } from './scripts/llms-txt.ts'
import { ogImages } from './scripts/og-images.ts'
import { playground } from './scripts/playground.ts'
import { releases } from './scripts/releases.ts'
import { searchIndex } from './scripts/search-index.ts'
import { versions } from './scripts/versions-plugin.ts'
import { islandAttributes } from './src/docs/islands.ts'

// The playground's language server needs a cross-origin isolated page, as
// public/_headers sets for the deployed site. A middleware sets the headers,
// since `server.headers` misses the server-rendered pages.
const isolation: Plugin = {
  name: 'silk-cross-origin-isolation',
  configureServer: server => {
    server.middlewares.use((_request, response, next) => {
      response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      next()
    })
  },
  configurePreviewServer: server => {
    server.middlewares.use((_request, response, next) => {
      response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      next()
    })
  },
}

export default defineConfig({
  plugins: [
    isolation,
    tailwindcss(),
    foldkit({
      ssr: {
        serverEntry: '/src/entry.server.ts',
        clientEntry: '/src/entry.ts',
        build: { prerender: true },
      },
    }),
    markdown({ islands: islandAttributes }),
    releases(),
    playground(),
    searchIndex(),
    ogImages(),
    llmsTxt(),
    versions(),
  ],
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
