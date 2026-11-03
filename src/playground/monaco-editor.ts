// The playground's code editor: Monaco, with Silk's highlighting and the
// Silk language server's diagnostics, hovers and completions. The page loads
// this module the first time it shows the editor, since Monaco is large.

import 'monaco-editor/esm/vs/editor/edcore.main.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import { KEYWORDS } from 'silk-lang/tanstack'

import {
  type Json,
  type LanguageServer,
  fileUri,
  startLanguageServer,
} from './language-server'
import { type ProgramFile, type Toolchain } from './protocol'

const LANGUAGE = 'silk'
const THEME = 'silk-code'

// Monaco's own worker computes word ranges and similar for every model.
const environment: monaco.Environment = {
  getWorker: () => new EditorWorker(),
}
Object.assign(globalThis, { MonacoEnvironment: environment })

const PRIMITIVES = [
  'i8',
  'i16',
  'i32',
  'i64',
  'u8',
  'u16',
  'u32',
  'u64',
  'isize',
  'usize',
  'f32',
  'f64',
  'bool',
  'char',
  'string',
  'never',
]

// The tokens follow `silk-lang`'s highlighter, so the editor colors code the
// way the docs do.
const tokens: monaco.languages.IMonarchLanguage = {
  keywords: [...KEYWORDS],
  primitives: PRIMITIVES,
  tokenizer: {
    root: [
      [/\/\/.*$/, 'comment'],
      [/"""/, 'string', '@triple'],
      [/"/, 'string', '@string'],
      [/'(?:\\.|[^'\\])'/, 'string'],
      [/'[A-Za-z_]\w*/, 'type'],
      [
        /[A-Za-z_]\w*(?=\s*\()/,
        { cases: { '@keywords': 'keyword', '@default': 'function' } },
      ],
      [
        /[A-Za-z_]\w*/,
        {
          cases: {
            '@keywords': 'keyword',
            'true|false': 'type',
            '@primitives': 'type',
            '[A-Z]\\w*': 'type',
            '@default': 'identifier',
          },
        },
      ],
      [
        /(?:0[xXoObB][0-9A-Fa-f_]*|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)\w*/,
        'number',
      ],
      [/\|>|->|=>|==|!=|<=|>=|&&|\|\||\.\.\.?|[-+*/%=<>!?&|^~@]/, 'operator'],
    ],
    string: [
      [/\\./, 'string'],
      [/"/, 'string', '@pop'],
      [/$/, 'string', '@pop'],
      [/[^"\\]+/, 'string'],
    ],
    triple: [
      [/"""/, 'string', '@pop'],
      [/./, 'string'],
    ],
  },
}

// The design's syntax colors, read from the page's tokens. Code always sits
// on the dark code surface, in both color schemes.
const color = (element: Element, name: string): string =>
  getComputedStyle(element).getPropertyValue(name).trim() || '#e3e1dc'

const defineTheme = (element: Element): void => {
  const hex = (name: string) => color(element, name).replace('#', '')
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: hex('--syntax-plain') },
      { token: 'comment', foreground: hex('--syntax-comment') },
      { token: 'keyword', foreground: hex('--syntax-keyword') },
      { token: 'type', foreground: hex('--syntax-type') },
      { token: 'number', foreground: hex('--syntax-type') },
      {
        token: 'function',
        foreground: hex('--syntax-function'),
        fontStyle: 'bold',
      },
      { token: 'operator', foreground: hex('--syntax-operator') },
      { token: 'string', foreground: hex('--syntax-string') },
    ],
    colors: {
      'editor.background': color(element, '--syntax-surface'),
      'editor.foreground': color(element, '--syntax-plain'),
      'editorLineNumber.foreground': color(element, '--syntax-gutter'),
      'editorLineNumber.activeForeground': color(element, '--syntax-label'),
      'editor.lineHighlightBackground': '#00000000',
      'editor.lineHighlightBorder': color(element, '--syntax-divider'),
    },
  })
}

// The server the language features ask: the one of the editor on the page.
// The providers are registered once for the language, so they read it here.
// `flush` sends the edits still waiting, so a request sees the text on screen.
const current: {
  server: LanguageServer | undefined
  flush: () => void
} = { server: undefined, flush: () => undefined }

type Position = Readonly<{ line: number; character: number }>
type Range = Readonly<{ start: Position; end: Position }>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPosition = (value: unknown): value is Position =>
  isRecord(value) &&
  typeof value['line'] === 'number' &&
  typeof value['character'] === 'number'

const isRange = (value: unknown): value is Range =>
  isRecord(value) && isPosition(value['start']) && isPosition(value['end'])

// LSP positions count UTF-16 units from zero, which is what the server
// answers `initialize` with; Monaco counts the same units from one.
const toPosition = (position: monaco.Position): Position => ({
  line: position.lineNumber - 1,
  character: position.column - 1,
})

const toRange = (range: Range): monaco.IRange => ({
  startLineNumber: range.start.line + 1,
  startColumn: range.start.character + 1,
  endLineNumber: range.end.line + 1,
  endColumn: range.end.character + 1,
})

const markdown = (contents: unknown): ReadonlyArray<monaco.IMarkdownString> => {
  if (typeof contents === 'string') return [{ value: contents }]
  if (Array.isArray(contents)) return contents.flatMap(markdown)
  if (isRecord(contents) && typeof contents['value'] === 'string') {
    return [{ value: contents['value'] }]
  }
  return []
}

// LSP CompletionItemKind numbers, in order from 1, as Monaco names them.
const COMPLETION_KINDS: ReadonlyArray<monaco.languages.CompletionItemKind> = [
  monaco.languages.CompletionItemKind.Text,
  monaco.languages.CompletionItemKind.Method,
  monaco.languages.CompletionItemKind.Function,
  monaco.languages.CompletionItemKind.Constructor,
  monaco.languages.CompletionItemKind.Field,
  monaco.languages.CompletionItemKind.Variable,
  monaco.languages.CompletionItemKind.Class,
  monaco.languages.CompletionItemKind.Interface,
  monaco.languages.CompletionItemKind.Module,
  monaco.languages.CompletionItemKind.Property,
  monaco.languages.CompletionItemKind.Unit,
  monaco.languages.CompletionItemKind.Value,
  monaco.languages.CompletionItemKind.Enum,
  monaco.languages.CompletionItemKind.Keyword,
  monaco.languages.CompletionItemKind.Snippet,
  monaco.languages.CompletionItemKind.Color,
  monaco.languages.CompletionItemKind.File,
  monaco.languages.CompletionItemKind.Reference,
  monaco.languages.CompletionItemKind.Folder,
  monaco.languages.CompletionItemKind.EnumMember,
  monaco.languages.CompletionItemKind.Constant,
  monaco.languages.CompletionItemKind.Struct,
  monaco.languages.CompletionItemKind.Event,
  monaco.languages.CompletionItemKind.Operator,
  monaco.languages.CompletionItemKind.TypeParameter,
]

const completionKind = (kind: unknown): monaco.languages.CompletionItemKind =>
  (typeof kind === 'number' ? COMPLETION_KINDS[kind - 1] : undefined) ??
  monaco.languages.CompletionItemKind.Text

const completionItems = (result: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(result)) return result
  if (isRecord(result) && Array.isArray(result['items'])) return result['items']
  return []
}

const registerLanguage = (() => {
  const registered = { done: false }
  return (): void => {
    if (registered.done) return
    registered.done = true
    monaco.languages.register({ id: LANGUAGE, extensions: ['.silk'] })
    monaco.languages.setMonarchTokensProvider(LANGUAGE, tokens)
    monaco.languages.setLanguageConfiguration(LANGUAGE, {
      comments: { lineComment: '//' },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
      ],
      indentationRules: {
        increaseIndentPattern: /^.*\{[^}"']*$/,
        decreaseIndentPattern: /^\s*\}/,
      },
    })
    monaco.languages.registerHoverProvider(LANGUAGE, {
      provideHover: async (model, position) => {
        const server = current.server
        if (server === undefined) return null
        current.flush()
        const result: unknown = await server
          .request('textDocument/hover', {
            textDocument: { uri: model.uri.toString() },
            position: toPosition(position),
          })
          .catch(() => null)
        if (!isRecord(result)) return null
        const contents = markdown(result['contents'])
        if (contents.length === 0) return null
        const range = result['range']
        return isRange(range)
          ? { contents: [...contents], range: toRange(range) }
          : { contents: [...contents] }
      },
    })
    monaco.languages.registerCompletionItemProvider(LANGUAGE, {
      triggerCharacters: ['.'],
      provideCompletionItems: async (model, position) => {
        const server = current.server
        if (server === undefined) return { suggestions: [] }
        current.flush()
        const result: unknown = await server
          .request('textDocument/completion', {
            textDocument: { uri: model.uri.toString() },
            position: toPosition(position),
          })
          .catch(() => null)
        const word = model.getWordUntilPosition(position)
        const replaced: monaco.IRange = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        }
        const suggestions = completionItems(result).flatMap(
          (item): ReadonlyArray<monaco.languages.CompletionItem> => {
            if (!isRecord(item) || typeof item['label'] !== 'string') return []
            const label = item['label']
            const edit = item['textEdit']
            const insert =
              typeof item['insertText'] === 'string'
                ? item['insertText']
                : label
            const detail = item['detail']
            const documentation = markdown(item['documentation'])[0]
            return [
              {
                label,
                kind: completionKind(item['kind']),
                insertText:
                  isRecord(edit) && typeof edit['newText'] === 'string'
                    ? edit['newText']
                    : insert,
                range:
                  isRecord(edit) && isRange(edit['range'])
                    ? toRange(edit['range'])
                    : replaced,
                ...(typeof detail === 'string' ? { detail } : {}),
                ...(documentation === undefined ? {} : { documentation }),
              },
            ]
          },
        )
        return { suggestions }
      },
    })
  }
})()

const SEVERITIES: ReadonlyArray<monaco.MarkerSeverity> = [
  monaco.MarkerSeverity.Error,
  monaco.MarkerSeverity.Warning,
  monaco.MarkerSeverity.Info,
  monaco.MarkerSeverity.Hint,
]

const markers = (diagnostics: unknown): Array<monaco.editor.IMarkerData> =>
  (Array.isArray(diagnostics) ? diagnostics : []).flatMap(diagnostic => {
    if (!isRecord(diagnostic) || !isRange(diagnostic['range'])) return []
    const severity = diagnostic['severity']
    const code = diagnostic['code']
    return [
      {
        ...toRange(diagnostic['range']),
        message: String(diagnostic['message'] ?? ''),
        severity:
          (typeof severity === 'number'
            ? SEVERITIES[severity - 1]
            : undefined) ?? monaco.MarkerSeverity.Error,
        source: 'silk',
        ...(typeof code === 'string' ? { code } : {}),
      },
    ]
  })

export type EditorOptions = Readonly<{
  element: HTMLElement
  files: ReadonlyArray<ProgramFile>
  shown: string
  toolchain: Toolchain | null
  onChange: (name: string, source: string) => void
  onRun: () => void
}>

export type Editor = Readonly<{
  show: (name: string) => void
  dispose: () => void
}>

// Debounces each document's change notifications, so typing sends one.
const CHANGE_DELAY = 150

export const makeEditor = (options: EditorOptions): Editor => {
  registerLanguage()
  defineTheme(options.element)
  const models = new Map(
    options.files.map(file => [
      file.name,
      monaco.editor.createModel(
        file.source,
        LANGUAGE,
        monaco.Uri.parse(fileUri(file.name)),
      ),
    ]),
  )
  const editor = monaco.editor.create(options.element, {
    model: models.get(options.shown) ?? null,
    theme: THEME,
    automaticLayout: true,
    fontFamily: getComputedStyle(options.element).fontFamily,
    fontSize: 14,
    lineHeight: 22,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'none',
    bracketPairColorization: { enabled: false },
    fixedOverflowWidgets: true,
  })
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, options.onRun)

  const server =
    options.toolchain === null
      ? undefined
      : startLanguageServer(options.toolchain, options.files)
  const versions = new Map<string, number>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const send = (name: string, model: monaco.editor.ITextModel): void => {
    timers.delete(name)
    const version = (versions.get(name) ?? 1) + 1
    versions.set(name, version)
    server?.notify('textDocument/didChange', {
      textDocument: { uri: model.uri.toString(), version },
      contentChanges: [{ text: model.getValue() }],
    })
  }
  const flush = (): void => {
    timers.forEach((timer, name) => {
      clearTimeout(timer)
      const model = models.get(name)
      if (model !== undefined) send(name, model)
    })
  }
  current.server = server
  current.flush = flush
  const subscriptions = [...models].map(([name, model]) =>
    model.onDidChangeContent(() => {
      options.onChange(name, model.getValue())
      if (server === undefined) return
      clearTimeout(timers.get(name))
      timers.set(
        name,
        setTimeout(() => send(name, model), CHANGE_DELAY),
      )
    }),
  )
  if (server !== undefined) {
    server.onNotification(({ method, params }) => {
      if (method !== 'textDocument/publishDiagnostics' || !isRecord(params)) {
        return
      }
      const uri = params['uri']
      const model = [...models.values()].find(
        candidate => candidate.uri.toString() === uri,
      )
      if (model !== undefined) {
        monaco.editor.setModelMarkers(
          model,
          'silk',
          markers(params['diagnostics']),
        )
      }
    })
    models.forEach(model => {
      const document: Json = {
        textDocument: {
          uri: model.uri.toString(),
          languageId: LANGUAGE,
          version: 1,
          text: model.getValue(),
        },
      }
      server.notify('textDocument/didOpen', document)
    })
  }

  return {
    show: name => {
      const model = models.get(name)
      if (model !== undefined && editor.getModel() !== model) {
        editor.setModel(model)
      }
    },
    dispose: () => {
      timers.forEach(timer => clearTimeout(timer))
      subscriptions.forEach(subscription => subscription.dispose())
      if (current.server === server) {
        current.server = undefined
        current.flush = () => undefined
      }
      void server?.stop()
      editor.dispose()
      models.forEach(model => model.dispose())
    },
  }
}
