import type { Release } from './release'

// Stands in for the GitHub data in tests, and in builds with
// SILK_RELEASES=fixture when GitHub is out of reach.

const download = (
  version: string,
  os: string,
  arch: string,
  target: string,
  size: number,
) => {
  const fileName = `silk-${version}-${target}.tar.gz`
  const url = `https://github.com/silk-lang/silk/releases/download/v${encodeURIComponent(version)}/${encodeURIComponent(fileName)}`
  return {
    os,
    arch,
    target,
    fileName,
    url,
    size,
    sha256: null,
    signatureUrl: `${url}.minisig`,
  }
}

const release = (version: string, publishedAt: string): Release => ({
  version,
  tag: `v${version}`,
  isPrerelease: true,
  publishedAt,
  notesUrl: `https://github.com/silk-lang/silk/releases/tag/v${encodeURIComponent(version)}`,
  downloads: [
    download(version, 'macOS', 'aarch64', 'aarch64-apple-darwin', 6572578),
    download(version, 'Linux', 'x86_64', 'x86_64-unknown-linux-gnu', 5847373),
    download(version, 'Linux', 'aarch64', 'aarch64-unknown-linux-gnu', 5993603),
  ],
})

const releases: ReadonlyArray<Release> = [
  release('0.1.0-dev.2+8cd8230a9060', '2026-10-19T10:00:00Z'),
  release('0.1.0-dev.1+5081812', '2026-10-18T10:00:00Z'),
]

export default releases
