// The snippet's settings in the page address, so a link opens the same image:
// /snippet?s=<settings as JSON, deflated, in base64url>. The browser's own
// CompressionStream does the deflating, which is asynchronous.

import { Option, Schema, pipe } from 'effect'
import { Base64Url } from 'effect/encoding'

import { LIMITS, SCALES, Settings, initialModel } from './model'

const PARAM = 's'

const FORMAT = 'deflate-raw'

// The settings as JSON, which is also how two settings are compared.
export const toJson = (settings: Settings): string =>
  JSON.stringify(Schema.encodeSync(Settings)(settings))

const DEFAULTS = toJson(initialModel.settings)

const deflate = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(
    await new Response(
      new Blob([text]).stream().pipeThrough(new CompressionStream(FORMAT)),
    ).arrayBuffer(),
  )

const inflate = (bytes: Uint8Array<ArrayBuffer>): Promise<string> =>
  new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream(FORMAT)),
  ).text()

export const encode = async (settings: Settings): Promise<string> =>
  Base64Url.encode(await deflate(toJson(settings)))

const clamp = (
  { min, max }: Readonly<{ min: number; max: number }>,
  value: number,
): number => Math.round(Math.min(max, Math.max(min, value)))

// Settings from an address, or none when it holds something else. Sizes
// outside the page's limits are brought back within them.
export const decode = async (
  encoded: string,
): Promise<Option.Option<Settings>> => {
  const bytes = Option.getSuccess(Base64Url.decode(encoded))
  if (Option.isNone(bytes)) {
    return Option.none()
  }
  const json = await inflate(new Uint8Array(bytes.value)).catch(() => '')
  return pipe(
    Option.liftThrowable(JSON.parse)(json),
    Option.flatMap(Schema.decodeUnknownOption(Settings)),
    Option.map(settings => ({
      ...settings,
      width: clamp(LIMITS.width, settings.width),
      padding: clamp(LIMITS.padding, settings.padding),
      scale: SCALES.includes(settings.scale)
        ? settings.scale
        : initialModel.settings.scale,
    })),
  )
}

export const fromSearch = (search: string): Promise<Option.Option<Settings>> =>
  Option.match(Option.fromNullishOr(new URLSearchParams(search).get(PARAM)), {
    onNone: () => Promise.resolve(Option.none()),
    onSome: decode,
  })

// The page's address for the settings. The defaults need no parameter.
export const snippetPath = async (settings: Settings): Promise<string> =>
  toJson(settings) === DEFAULTS
    ? '/snippet'
    : `/snippet?${PARAM}=${await encode(settings)}`
