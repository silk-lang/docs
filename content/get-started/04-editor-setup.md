# Editor setup

Silk has syntax highlighting for VS Code, Zed, any editor that loads tree-sitter grammars, and web pages. That is what works today. There is no language server yet, so editors do not show errors as you type, jump to definitions or complete names. A language server is planned. Until then, run `silk check` in a terminal next to your editor.

| Where | Use | What you get |
| --- | --- | --- |
| VS Code | The Silk extension, `silk-lang.silk` | Highlighting, comment toggling, bracket matching and auto-closing, indentation |
| Zed | The extension in the `zed/` folder of tree-sitter-silk | Highlighting, brackets, indentation |
| Neovim, Helix and others | The tree-sitter grammar, tree-sitter-silk | Highlighting, indentation, folds, locals and tags queries |
| Web pages | The npm package `silk-lang` | Highlighting with Shiki or TanStack Highlight |

All of them highlight the same way: keywords, types, functions, strings, numbers, comments and doc comments.

## VS Code

Install the Silk extension from the Visual Studio Marketplace. Search for "Silk" in the Extensions view, or run:

```sh
code --install-extension silk-lang.silk
```

It applies to every `.silk` file. Besides highlighting, it gives you:

- `//` line comments with the toggle-comment command.
- Matching and auto-closing for `{}`, `[]`, `()` and `""`.
- Indentation after an opening bracket, and outdent on a closing one.
- Doc comments that continue: press Enter on a `///` or `//!` line and the next line starts with the same marker.

The extension is not on Open VSX, so editors that use that registry (VSCodium, for example) can't find it by search. Build the package from the silk-lang/silk-vscode repository and install the file:

```sh
git clone https://github.com/silk-lang/silk-vscode
cd silk-vscode
npx @vscode/vsce package --no-dependencies
```

```
 DONE  Packaged: /home/you/silk-vscode/silk-0.0.1.vsix (9 files, 26.49 KB)
```

Then install `silk-0.0.1.vsix` with your editor's "Install from VSIX" command.

## Zed

The Zed extension lives in the `zed/` folder of the silk-lang/tree-sitter-silk repository. It is not in Zed's extension registry yet, so install it as a dev extension:

1. Clone the grammar: `git clone https://github.com/silk-lang/tree-sitter-silk`.
2. In Zed, open the command palette and run `zed: install dev extension`.
3. Pick the `zed` folder inside the clone.

Zed downloads the grammar at the commit the extension pins and builds it. `.silk` files then get highlighting, bracket pairs (including `<>` for generics) and indentation, with 2-space indents and `//`, `///` and `//!` line comments.

## Neovim, Helix and other tree-sitter editors

The grammar is the silk-lang/tree-sitter-silk repository, on its `main` branch. It is not published to npm or crates.io yet, so point your editor at the git repository. What your editor needs from it:

| Item | Value |
| --- | --- |
| Repository | `https://github.com/silk-lang/tree-sitter-silk` |
| Language name | `silk` |
| File extension | `.silk` |
| Parser sources | `src/parser.c` and `src/scanner.c` |
| Queries | `queries/highlights.scm`, `indents.scm`, `folds.scm`, `locals.scm`, `tags.scm` |
| Comment token | `//` |
| Project root marker | `silk.toml` |

The queries use the capture names Neovim and Helix themes know, such as `@keyword.conditional` and `@function.method.call`. Copy them into your editor's query folder for `silk`, and register the parser the way your editor's tree-sitter guide describes.

The repository also builds bindings for C, Go, Node, Python, Rust and Swift, for tools that parse Silk themselves. Its CI parses every Silk file in the compiler, standard library and examples, so the grammar keeps up with the language.

## Highlighting on the web

The npm package `silk-lang` highlights Silk in documentation sites and blogs. It works with two highlighters, which you install yourself.

With Shiki, register the language and use the id `silk`:

```js
import { createHighlighter } from 'shiki'
import silk from 'silk-lang/shiki'

const highlighter = await createHighlighter({ langs: [silk], themes: ['github-dark'] })
const html = highlighter.codeToHtml('let mut sum = 0', { lang: 'silk', theme: 'github-dark' })
```

```html
<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">let</span><span style="color:#F97583"> mut</span><span style="color:#E1E4E8"> sum </span><span style="color:#F97583">=</span><span style="color:#79B8FF"> 0</span></span></code></pre>
```

With TanStack Highlight:

```js
import { createHighlighter } from '@tanstack/highlight/core'
import { silk } from 'silk-lang/tanstack'

const highlighter = createHighlighter({ languages: [silk] })
const html = highlighter.highlightToHtml('let mut sum = 0', { lang: 'silk' })
```

```html
<pre class="th-code th-code--silk" data-language="silk"><code><span class="th-token th-keyword">let</span> <span class="th-token th-keyword">mut</span> sum <span class="th-token th-operator">=</span> <span class="th-token th-number">0</span></code></pre>
```

| Import | Gives you |
| --- | --- |
| `silk-lang/shiki` | The Silk TextMate grammar as a Shiki language, the same grammar the VS Code extension uses |
| `silk-lang/tanstack` | A tokenizer for TanStack Highlight that follows the compiler's lexer, plus `tokenize` and `KEYWORDS` |
| `silk-lang/silk.tmLanguage.json` | The raw TextMate grammar, for any other highlighter that reads one |
| `silk-lang` | `shiki` and `tanstack`, both of the above |

`shiki` (1.0 or newer) and `@tanstack/highlight` (1.1 or newer) are optional peer dependencies: install the one you use.

## Errors in the editor

Without a language server, the compiler is how you find errors. `silk check` is fast because it builds nothing. `silk check --json` prints each diagnostic as one line of JSON on standard output, before the usual summary lines. An editor task or problem matcher can read it:

```json
{"target":"x86_64-unknown-linux-gnu","code":"OWN0003","severity":"error","path":"/home/you/tour/src/main.silk","line":76,"column":38,"start":2022,"end":2025,"message":"Moving tea requires an explicit move","notes":[],"related":[]}
```

`silk format` formats your files; see Tools.
