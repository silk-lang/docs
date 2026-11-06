// A Vite plugin that publishes the archive scripts/versions.ts writes to
// .versions/: the list of versions as `virtual:silk-versions`, for the
// version picker, and the archive files under /v/ in the site. Without an
// archive the list is empty and the site shows no picker.
//
// Archived pages are not prerendered, one page per version would be tens of
// thousands of files, so `_redirects` serves the /v/ page for every
// /v/<version>/docs path and the client renders the archived page.

import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { type Plugin } from 'vite'

const VERSIONS_DIR = resolve(import.meta.dirname, '../.versions')
const VIRTUAL_ID = 'virtual:silk-versions'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

const REDIRECTS = `# Archived docs (scripts/versions-plugin.ts): the client renders them.
/v/:version/docs /v/ 200
/v/:version/docs/* /v/ 200
`

const readVersions = (): string => {
  const path = join(VERSIONS_DIR, 'versions.json')
  return existsSync(path) ? readFileSync(path, 'utf8') : '[]'
}

export const versions = (): Plugin => ({
  name: 'silk-versions',
  resolveId: id => (id === VIRTUAL_ID ? RESOLVED_ID : null),
  load: id =>
    id === RESOLVED_ID ? `export default ${readVersions().trim()}` : null,
  // `pnpm dev` serves the archive from .versions/ at the same paths.
  configureServer: server => {
    server.middlewares.use((request, response, next) => {
      const path = decodeURIComponent((request.url ?? '').split('?')[0] ?? '')
      if (!path.startsWith('/v/') || extname(path) !== '.json') {
        return next()
      }
      const file = resolve(VERSIONS_DIR, `.${path.slice('/v'.length)}`)
      if (!file.startsWith(VERSIONS_DIR) || !existsSync(file)) {
        return next()
      }
      response.setHeader('Content-Type', 'application/json')
      response.end(readFileSync(file))
    })
  },
  writeBundle: function (options) {
    if (this.environment.name !== 'client' || options.dir === undefined) {
      return
    }
    if (existsSync(VERSIONS_DIR)) {
      cpSync(VERSIONS_DIR, join(options.dir, 'v'), { recursive: true })
    }
    const redirects = join(options.dir, '_redirects')
    writeFileSync(
      redirects,
      `${existsSync(redirects) ? readFileSync(redirects, 'utf8') : ''}${REDIRECTS}`,
    )
  },
})
