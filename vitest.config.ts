import { defineConfig } from 'vitest/config'

import { markdown } from '@foldkit/markdown/vite'

import { islandAttributes } from './src/docs/islands.ts'

export default defineConfig({
  plugins: [markdown({ islands: islandAttributes })],
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
    server: {
      deps: {
        inline: ['foldkit', '@foldkit/ui', '@foldkit/devtools'],
      },
    },
  },
})
