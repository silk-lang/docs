import { type DocPage, pageKey } from './docs/catalog'

// Open Graph images. scripts/og-images.ts renders one 1200x630 PNG per page at
// build time, and src/entry.server.ts points each page's og:image at it.

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export const SITE_NAME = 'Silk'
export const SITE_DESCRIPTION =
  'Silk is a systems language where effects, failures, and dependencies compose, and ownership keeps every resource explicit.'

export type OgCard = Readonly<{
  path: string
  label: string
  title: string
  footer: string
}>

const TAGLINE = 'Composability, all the way down'

export const homeCard: OgCard = {
  path: '/og/home.png',
  label: '',
  title: TAGLINE,
  footer: 'Effects, failures and dependencies that compose',
}

export const docsCard: OgCard = {
  path: '/og/docs.png',
  label: 'Docs',
  title: 'Learn Silk',
  footer: TAGLINE,
}

export const releasesCard: OgCard = {
  path: '/og/releases.png',
  label: 'Releases',
  title: 'Download Silk',
  footer: TAGLINE,
}

export const pageCard = (page: DocPage, groupTitle: string): OgCard => ({
  path: `/og/docs/${pageKey(page)}.png`,
  label: groupTitle,
  title: page.title,
  footer: TAGLINE,
})
