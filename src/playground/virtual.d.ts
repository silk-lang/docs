declare module 'virtual:silk-playground' {
  // The playground's toolchain, or null when this build has none.
  const toolchain: {
    version: string
    compilerUrl: string
    stdlibUrl: string
  } | null
  export default toolchain
}

declare module 'virtual:silk-playground-examples' {
  const examples: unknown
  export default examples
}
