// Checks the Intrinsics section (content/intrinsics/) against a silk-lang/silk
// checkout, so the reference cannot drift from the compiler:
//
//   node scripts/check-intrinsics.ts ../silk          every member has an entry
//   node scripts/check-intrinsics.ts ../silk --run    and every example runs
//
// The member inventory comes from the compiler's own tables: the named
// primitives in compiler/src/semantic/Intrinsic.silk, the storage operations in
// StorageOperation.silk, the effect compositions that Semantic.silk resolves,
// the scalar operation codes in ScalarOperation.silk, and the type members
// (the sealed core types, reflection families, properties and the operator
// interfaces in stdlib/intrinsic/operators.silk). Each member needs one
// `### \`Intrinsic.<name>\`` heading; a scalar operation is one heading such
// as `### \`Intrinsic.<integer>Add\`` for the whole family. A heading for a
// name the compiler does not have fails too, unless the entry is marked
// `> Unreleased: added after v<version>.` (a member on silk main that the
// release the docs follow does not have yet).
//
// With --run, each ```silk block except ```silk signature blocks is copied into
// a fresh package and run with the `silk` on PATH, which must exit with 0. A
// block whose fence says `silk check` is only checked, and `silk check
// target=<triple>` is checked for that target, and `silk test` runs as a test
// package with `silk test`. Blocks are independent programs.
// The examples of an Unreleased entry run only with a newer silk, and then the
// marker itself fails, so the next release sync removes it.

import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const docsRoot = resolve(import.meta.dirname, '..')
const pagesRoot = join(docsRoot, 'content/intrinsics')

const args = process.argv.slice(2)
const silkRoot = args.find(arg => !arg.startsWith('--'))
const runExamples = args.includes('--run')
// --unreleased also runs the examples of Unreleased entries, with a silk built
// from main.
const runUnreleased = args.includes('--unreleased')
// --page=<file> runs the examples of one page only (coverage is still whole).
const onlyPage = args
  .find(arg => arg.startsWith('--page='))
  ?.slice('--page='.length)
if (silkRoot === undefined) {
  console.error(
    'usage: node scripts/check-intrinsics.ts <silk checkout> [--run] [--unreleased] [--page=<file>]',
  )
  process.exit(2)
}

const read = (path: string): string =>
  readFileSync(join(silkRoot, path), 'utf8')

const matches = (text: string, pattern: RegExp): ReadonlyArray<string> =>
  [...text.matchAll(pattern)].map(match => match[1]!)

// The body of `fn name` up to the next line that closes a top-level item.
const functionBody = (text: string, name: string): string => {
  const start = text.indexOf(`fn ${name}(`)
  if (start < 0) {
    throw new Error(`no fn ${name} in the compiler source`)
  }
  const end = text.indexOf('\n}\n', start)
  return text.slice(start, end)
}

// INVENTORY

const intrinsicSource = read('compiler/src/semantic/Intrinsic.silk')
const storageSource = read('compiler/src/semantic/StorageOperation.silk')
const semanticSource = read('compiler/src/semantic/Semantic.silk')
const scalarSource = read('compiler/src/semantic/ScalarOperation.silk')
const sealedSource = read('compiler/src/semantic/SealedCore.silk')
const operatorsSource = read('stdlib/intrinsic/operators.silk')

const primitives = matches(
  functionBody(intrinsicSource, 'spelling'),
  /Primitive\.\w+ => b"(\w+)"/g,
)
const storage = matches(
  storageSource,
  /StorageOperation\.\w+ => b"(\w+)"/g,
).filter((name, index, all) => all.indexOf(name) === index)
const compositions = matches(
  functionBody(semanticSource, 'intrinsicCallTarget'),
  /same\(member, b"(\w+)"\)/g,
)
const scalarCodes = matches(
  functionBody(scalarSource, 'codeSpelling'),
  /Code\.\w+ => b"(\w+)"/g,
)
const typeMembers = [
  ...matches(
    functionBody(sealedSource, 'intrinsicFamily'),
    /same\(spelling, b"(\w+)"\)/g,
  ),
  ...matches(
    semanticSource,
    /same\(Bytes\.asSlice\(&segments\[usize\.ONE\]\), b"([A-Z]\w*)"\)/g,
  ),
  ...matches(
    functionBody(semanticSource, 'propertyNamed'),
    /same\(name, b"(\w+)"\)/g,
  ),
  ...matches(
    functionBody(semanticSource, 'intrinsicBound'),
    /same\(member, b"(\w+)"\)/g,
  ),
  ...matches(operatorsSource, /^pub (?:interface|enum) (\w+)/gm),
  ...matches(
    functionBody(semanticSource, 'applicationImport'),
    /b"(application)"/g,
  ),
].filter((name, index, all) => all.indexOf(name) === index)

if (
  primitives.length === 0 ||
  storage.length === 0 ||
  compositions.length === 0 ||
  scalarCodes.length === 0 ||
  typeMembers.length === 0
) {
  throw new Error('the compiler source no longer has one of the member tables')
}

// Scalar codes are written after the operand type, and conversions before the
// target type: `<integer>Add`, `<integer>To<numeric>`. An operation that only
// `bool` has is written with it: `boolNot`.
const scalarHeading = (code: string): RegExp =>
  code === 'To' || code === 'CheckedTo'
    ? new RegExp(`^<\\w+>${code}<\\w+>$`)
    : new RegExp(`^(?:<\\w+>|bool)${code}$`)

const isScalarHeading = (name: string): boolean =>
  name.startsWith('<') || /^bool[A-Z]/.test(name)

// PAGES

type Example = Readonly<{
  page: string
  line: number
  source: string
  mode: 'run' | 'check' | 'test'
  target: string | undefined
  // The release an Unreleased entry waits for, if the example is in one.
  after: Version | undefined
}>

type Version = ReadonlyArray<number>

// v0.1.0-dev.81 is [0, 1, 0, 81]; a stable release sorts after its dev ones.
const parseVersion = (text: string): Version | undefined => {
  const match = /v?(\d+)\.(\d+)\.(\d+)(?:-dev\.(\d+))?/.exec(text)
  return match === null
    ? undefined
    : [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        match[4] === undefined ? Number.MAX_SAFE_INTEGER : Number(match[4]),
      ]
}

const newer = (left: Version, right: Version): boolean => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index]! > right[index]!
    }
  }
  return false
}

type Entry = Readonly<{
  page: string
  name: string
  start: number
  end: number
  after: Version | undefined
}>

const pages = readdirSync(pagesRoot)
  .filter(name => name.endsWith('.md'))
  .sort()
  .map(name => ({ name, text: readFileSync(join(pagesRoot, name), 'utf8') }))

const entries: ReadonlyArray<Entry> = pages.flatMap(({ name, text }) => {
  const found = [...text.matchAll(/^### `Intrinsic\.([^`]+)`/gm)]
  return found.map(match => {
    // An entry runs to the next heading of level 1 to 3.
    const body = match.index + match[0].length
    const next = text.slice(body).search(/^#{1,3} /m)
    const end = next < 0 ? text.length : body + next
    const marker = /^> Unreleased: added after (v[\w.+-]+?)\.?$/m.exec(
      text.slice(body, end),
    )
    return {
      page: name,
      name: match[1]!,
      start: match.index,
      end,
      after: marker === null ? undefined : parseVersion(marker[1]!),
    }
  })
})

const examples: ReadonlyArray<Example> = pages.flatMap(({ name, text }) =>
  [...text.matchAll(/^```silk([^\n]*)\n([\s\S]*?)\n```$/gm)]
    .filter(match => !match[1]!.trim().split(/\s+/).includes('signature'))
    .map(match => {
      const meta = match[1]!.trim().split(/\s+/)
      const target = meta
        .find(word => word.startsWith('target='))
        ?.slice('target='.length)
      const entry = entries.find(
        entry =>
          entry.page === name &&
          entry.start <= match.index &&
          match.index < entry.end,
      )
      return {
        page: name,
        line: text.slice(0, match.index).split('\n').length,
        source: `${match[2]!}\n`,
        mode: meta.includes('test')
          ? 'test'
          : meta.includes('check') || target !== undefined
            ? 'check'
            : 'run',
        target,
        after: entry?.after,
      }
    }),
)

// COVERAGE

const problems: Array<string> = []

const named = new Set([
  ...primitives,
  ...storage,
  ...compositions,
  ...typeMembers,
])
const documented = new Map<string, Entry>()
for (const entry of entries) {
  const earlier = documented.get(entry.name)
  if (earlier !== undefined) {
    problems.push(
      `Intrinsic.${entry.name} has entries in ${earlier.page} and ${entry.page}`,
    )
  }
  documented.set(entry.name, entry)
}

for (const name of named) {
  if (!documented.has(name)) {
    problems.push(`Intrinsic.${name} has no entry in content/intrinsics`)
  }
}
for (const code of scalarCodes) {
  const pattern = scalarHeading(code)
  if (![...documented.keys()].some(name => pattern.test(name))) {
    problems.push(
      `the scalar operation ${code} has no entry such as Intrinsic.<integer>${code}`,
    )
  }
}
for (const [name, entry] of documented) {
  const known = isScalarHeading(name)
    ? scalarCodes.some(code => scalarHeading(code).test(name))
    : named.has(name)
  if (!known && entry.after === undefined) {
    problems.push(
      `${entry.page} documents Intrinsic.${name}, which the compiler does not have`,
    )
  }
}

// Links into the standard library reference must name a page and an anchor
// that the checkout's reference/stdlib has, except inside Unreleased entries.
for (const { name, text } of pages) {
  for (const link of text.matchAll(
    /\]\(\/docs\/std\/([\w-]+)(?:#([^)]+))?\)/g,
  )) {
    const inUnreleased = entries.some(
      entry =>
        entry.page === name &&
        entry.after !== undefined &&
        entry.start <= link.index &&
        link.index < entry.end,
    )
    if (inUnreleased) {
      continue
    }
    const [, slug, anchor] = link
    const line = text.slice(0, link.index).split('\n').length
    let source: string
    try {
      source = read(`reference/stdlib/${slug}.md`)
    } catch {
      problems.push(
        `${name}:${line}: /docs/std/${slug} is not a standard library page`,
      )
      continue
    }
    if (anchor !== undefined && !source.includes(`<a id="${anchor}"></a>`)) {
      problems.push(
        `${name}:${line}: /docs/std/${slug} has no anchor ${anchor}`,
      )
    }
  }
}

// Links between the intrinsics pages must name a page of the section and,
// with an anchor, one of its headings. The anchors are the site's: GitHub's
// slug of the heading text (src/docs/headings.ts).
const headingSlug = (heading: string) =>
  heading
    .replace(/`/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-')
const pageAnchors = new Map(
  pages.map(({ name, text }) => [
    name.replace(/^\d+-/, '').replace(/\.md$/, ''),
    new Set(
      Array.from(text.matchAll(/^#{1,6} (.+)$/gm), ([, heading]) =>
        headingSlug(heading!),
      ),
    ),
  ]),
)
for (const { name, text } of pages) {
  for (const link of text.matchAll(
    /\]\(\/docs\/intrinsics\/([\w-]+)(?:#([^)]+))?\)/g,
  )) {
    const [, slug, anchor] = link
    const line = text.slice(0, link.index).split('\n').length
    const anchors = pageAnchors.get(slug!)
    if (anchors === undefined) {
      problems.push(
        `${name}:${line}: /docs/intrinsics/${slug} is not an intrinsics page`,
      )
    } else if (anchor !== undefined && !anchors.has(anchor)) {
      problems.push(
        `${name}:${line}: /docs/intrinsics/${slug} has no heading #${anchor}`,
      )
    }
  }
}

// EXAMPLES

const runExample = (
  example: Example,
  silkVersion: string,
): string | undefined => {
  const directory = mkdtempSync(join(tmpdir(), 'silk-intrinsic-'))
  try {
    mkdirSync(join(directory, 'src'))
    writeFileSync(
      join(directory, 'silk.toml'),
      `[package]\nname = "example"\nsilk-version = "${silkVersion}"\n`,
    )
    writeFileSync(join(directory, 'src/main.silk'), example.source)
    const command =
      example.mode === 'run'
        ? ['run', '--progress', 'never']
        : example.mode === 'test'
          ? ['test', '--progress', 'never']
          : [
              'check',
              '--no-server',
              '--progress',
              'never',
              ...(example.target === undefined
                ? []
                : ['--target', example.target]),
            ]
    const result = spawnSync('silk', command, {
      cwd: directory,
      encoding: 'utf8',
      timeout: 120_000,
    })
    if (result.status === 0) {
      return undefined
    }
    return `${example.page}:${example.line}: silk ${command[0]} exited with ${result.status ?? result.signal}\n${result.stdout}${result.stderr}`
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

let ran = 0
let waiting = 0
if (runExamples) {
  const version = execFileSync('silk', ['--version'], {
    encoding: 'utf8',
  }).trim()
  const silkVersion = /\bv?(\d+\.\d+\.\d+(?:-[\w.-]+)?)/.exec(version)?.[1]
  const running = parseVersion(version)
  if (silkVersion === undefined || running === undefined) {
    throw new Error(`cannot read a version from ${version}`)
  }
  for (const entry of entries) {
    if (entry.after !== undefined && newer(running, entry.after)) {
      problems.push(
        `${entry.page}: Intrinsic.${entry.name} is in ${version}, so its entry is no longer Unreleased`,
      )
    }
  }
  console.log(`${examples.length} examples, with ${version}`)
  for (const example of examples) {
    if (onlyPage !== undefined && example.page !== onlyPage) {
      continue
    }
    if (
      example.after !== undefined &&
      !runUnreleased &&
      !newer(running, example.after)
    ) {
      waiting += 1
      continue
    }
    ran += 1
    const failure = runExample(example, silkVersion)
    if (failure !== undefined) {
      problems.push(failure)
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem)
  }
  process.exit(1)
}
const memberCount = named.size + scalarCodes.length
console.log(
  `${memberCount} members (${scalarCodes.length} scalar operation families) documented${runExamples ? `, ${ran} examples pass, ${waiting} wait for a release` : ''}`,
)
