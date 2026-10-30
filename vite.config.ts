import { defineConfig } from 'vite'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { llmsTxt } from './scripts/llms-txt.ts'
import { releases } from './scripts/releases.ts'
import { searchIndex } from './scripts/search-index.ts'
import { islandAttributes } from './src/docs/islands.ts'

export default defineConfig({
  plugins: [
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
    searchIndex(),
    llmsTxt(),
  ],
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
