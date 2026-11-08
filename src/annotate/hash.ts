// A short, stable key for a code block's source: FNV-1a over its UTF-16 code
// units, as hex. Synchronous, so the site can look a block up while it
// renders.
export const hash = (source: string): string => {
  let value = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return `${value.toString(16).padStart(8, '0')}-${source.length.toString(16)}`
}
