// The snippet's settings in the page address, so a link opens the same image:
// /snippet?s=<settings as JSON, in base64url>.

import { Option, Schema, pipe } from 'effect'
import { Base64Url } from 'effect/encoding'

import { LIMITS, SCALES, Settings, initialModel } from './model'

const PARAM = 's'

const clamp = (
  { min, max }: Readonly<{ min: number; max: number }>,
  value: number,
): number => Math.round(Math.min(max, Math.max(min, value)))

// ponytail: plain base64 of the JSON; a long snippet makes a long address.
// Compress it (CompressionStream) if addresses ever get too long to share.
export const encode = (settings: Settings): string =>
  Base64Url.encode(JSON.stringify(Schema.encodeSync(Settings)(settings)))

// Settings from an address. A link from before a setting existed lacks it,
// so missing fields take their defaults; sizes outside the page's limits
// are brought back within them.
export const decode = (encoded: string): Option.Option<Settings> =>
  pipe(
    Option.getSuccess(Base64Url.decodeString(encoded)),
    Option.flatMap(Option.liftThrowable(JSON.parse)),
    Option.filter(
      (value): value is object => typeof value === 'object' && value !== null,
    ),
    Option.flatMap(value =>
      Schema.decodeOption(Settings)({
        ...Schema.encodeSync(Settings)(initialModel.settings),
        ...value,
      }),
    ),
    Option.map(settings => ({
      ...settings,
      width: clamp(LIMITS.width, settings.width),
      padding: clamp(LIMITS.padding, settings.padding),
      scale: SCALES.includes(settings.scale)
        ? settings.scale
        : initialModel.settings.scale,
    })),
  )

export const fromSearch = (search: string): Option.Option<Settings> =>
  pipe(
    Option.fromNullishOr(new URLSearchParams(search).get(PARAM)),
    Option.flatMap(decode),
  )

// The page's address for the settings. The defaults need no parameter.
const DEFAULTS = encode(initialModel.settings)

export const snippetPath = (settings: Settings): string => {
  const encoded = encode(settings)
  return encoded === DEFAULTS ? '/snippet' : `/snippet?${PARAM}=${encoded}`
}
