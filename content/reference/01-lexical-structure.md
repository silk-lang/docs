# Lexical structure

Source files are UTF-8 text. This page covers how the compiler splits a file into tokens: whitespace, comments, identifiers, keywords, punctuation, directives and literals.

## Whitespace

Space, tab, line feed and carriage return separate tokens and have no other meaning. Statements need no separator: `let a = 1 let b = 2` is two statements. A semicolon is not a statement terminator and is an error there. It appears only inside types such as `[T; N]` and `Effect<'env; A>`.

## Comments

```
LineComment       = '//' text-to-end-of-line
DocComment        = '///' text-to-end-of-line
ModuleDocComment  = '//!' text-to-end-of-line
```

- `//` starts a comment that runs to the end of the line.
- `///` documents the declaration that follows. `//!` documents the module it appears in.
- Four or more slashes (`////`) make a plain comment, not a doc comment.
- There are no block comments.
- Doc comments are Markdown. See Writing documentation in Tools for the sections and links they support.

## Identifiers

```
Identifier = ( letter | '_' ) ( letter | digit | '_' )*
letter     = 'A'..'Z' | 'a'..'z'
```

- Identifiers are ASCII only. Any other byte outside a literal or comment is an error (LEX0001).
- A single `_` is the wildcard pattern, not a name. To discard a value, use `drop expr` (see Bindings and statements).
- Lifetimes are an apostrophe plus an identifier: `'a`, `'env`, `'static`.

## Keywords

These words are reserved and can't be used as names:

```
as  break  compileError  const  continue  drop  effect  else  enum  export  extern
fail  false  fn  for  if  impl  import  interface  let  match  move  mut  once
param  pub  return  role  run  service  static  struct  true  tuple  type  union
unsafe  while
```

A reserved word in a name position is PAR0001, "Expected identifier", at the word. That includes functions and methods: `fn run(job: &Job) -> i32` inside an `impl` is refused at `run`.

These words have special meaning only in certain positions, and are ordinary identifiers everywhere else:

| Word | Where it's special |
| --- | --- |
| `test` | Before `fn` or `effect fn`, marking a test |
| `where` | Bounds on generics and package parameters |
| `provides`, `from` | Provider bounds in `where` clauses |
| `in` | Membership bounds in `where` clauses |
| `use` | Lifetime binders in a callable's `for<…>` list |
| `some` | Opaque return types |
| `typeof` | The type of a declaration |
| `Without` | Removing entries from a requirement row |
| `at` | Role selection in requirement rows |
| `place` | `match place` |
| `align`, `addrspace` | Raw pointer qualifiers |

`Self`, `never`, `Intrinsic` and the primitive type names (`i32`, `bool`, `string`…) are names resolved like any other, not keywords.

`loop` is not a keyword either and may name a binding. A statement written `loop { ... }` is PAR0006; see Control flow.

`with` and `module` have no special meaning any more. A `with Intrinsic.inline()` clause after a declaration header, or `module with ...`, is PAR0011; see Directives below.

## Punctuation

```
(  )  {  }  [  ]  :  ;  ,  .  ..  ...  =  ==  !=  <  <=  >  >=
+  -  *  /  %  !  ?  @  #  &  &&  |  ||  |>  ^  ~  =>  ->
```

There are no shift operators and no compound assignment operators such as `+=`. See Expressions and operators.

- `@` starts a directive (below).
- `#` marks the role of a reference type: `&Port #Reader`. Requirement rows name a role with `at` instead: `? &mut Journal at Audit`. See Services and providers.

## Directives

```
Directive    = '@' Identifier ( '(' ( DirectiveArg ( ',' DirectiveArg )* ','? )? ')' )?
DirectiveArg = ( Identifier ':' )? Literal
```

- A directive is written before a function, a method, a service or interface operation, or a foreign function type: `@inline`, `@features("avx2")`, `@foreign(memory: "read", locality: "arguments")`. Several may stand before one declaration. `silk format` puts each on its own line.
- Arguments are literals only: text, decimal integers, `true`, `false`, and parenthesized tuples of them. A name or an expression there is PAR0002.
- `@` before an `import` or a module-level `static if` is PAR0002 at the `@`.
- The set of directives is closed. The full table, and where each one goes, is in Intrinsics.
- Silk has no `with` clauses. `fn work() -> i32 with Intrinsic.inline() { return 1 }` prints ``error[PAR0011] Silk has no `with` clauses; write `@inline` on the line before the declaration``.

## Integer literals

```
IntegerLiteral = decimal | '0x' hexDigits | '0b' binaryDigits | '0o' octalDigits
```

- Digits may be grouped with `_`, but only between two digits: `1_000_000`, `0xFF_FF`. A separator right after a base prefix (`0x_FF`), at the end (`1_`) or doubled (`1__0`) is an error (LEX0005). A leading `_`, as in `_1`, starts an identifier instead.
- A prefix needs at least one digit after it (LEX0004). Every digit must belong to the base: `0xG1`, `0o9` and `0b102` are LEX0013, reported at the literal.
- There are no type suffixes. A literal takes its type from where it's used: an annotation, a parameter, a field. With no context it is `i32`. A suffix such as `7u8` or `5usize` is LEX0014, reported at the literal: "Numeric literals take no type suffix such as `u8`; write the type as an annotation instead, as in `let value: u8 = 7`". A float with a suffix, as in `1.5f32`, is LEX0014 too, and the message names its suffix: ``such as `f32`; write the type as an annotation instead, as in `let value: f32 = 1.5` ``. A float with an integer suffix, as in `2.5e3u8`, gets a message that suggests a float type: ``such as `u8`; `2.5e3` is a float literal, which integer type `u8` cannot hold, so write a float type as an annotation instead, as in `let value: f64 = 2.5e3` ``.
- A literal that doesn't fit its type is an error (SEM0002). For `usize` and `isize` the limit is the target's word size, so `let x: usize = 4294967296` compiles for `x86_64-unknown-linux-gnu` and is SEM0002 for `wasm32-unknown-unknown`.
- Negative numbers are the unary `-` operator applied to a literal.

## Float literals

```
FloatLiteral = digits '.' digits exponent? | digits exponent
exponent     = ( 'e' | 'E' ) ( '+' | '-' )? digits
```

- A fraction needs a digit after the dot, so `1.` isn't a float, and `1..5` stays a range.
- An exponent needs digits (LEX0006).
- With no context a float literal is `f64`. Use an annotation for `f32`.

## Duration literals

A duration literal is a number followed by a unit, and has type `u64` in nanoseconds.

| Unit | Meaning |
| --- | --- |
| `w` | Weeks |
| `d` | Days |
| `h` | Hours |
| `m` | Minutes |
| `s` | Seconds |
| `ms` | Milliseconds |
| `us` | Microseconds |
| `ns` | Nanoseconds |

- Units can be combined in one literal, largest first: `1h30m`, `2m15s500ms`.
- Each unit appears at most once (LEX0010) and units must descend (LEX0011).
- After the first unit, amounts must stay below the next unit up: days below 7, hours below 24, minutes and seconds below 60, sub-second units below 1000 (LEX0012).
- Amounts are whole decimal numbers (LEX0008). An unknown unit is LEX0009.

## Text literals

```
TextLiteral = '"' chars '"' | '"""' chars '"""' | 'r"' chars '"' | 'r"""' chars '"""'
```

- A text literal has type `string<'static>` and must decode to valid UTF-8.
- `"…"` is one line. `"""…"""` may span lines, and its content is kept exactly, including the line break after the opening quotes and any indentation. A CRLF pair inside it becomes one line feed.
- `r"…"` and `r"""…"""` are raw: backslashes have no special meaning.
- A missing closing delimiter is LEX0003. Any other letter before a quote is LEX0002.

## Escapes

Escapes work the same way in text, byte-string and character literals.

| Escape | Meaning |
| --- | --- |
| `\n`, `\r`, `\t` | Line feed, carriage return, tab |
| `\0` | NUL |
| `\\`, `\"` | Backslash, double quote |
| `\'` | Single quote, only in character literals |
| `\xHH` | One byte, two hex digits |
| `\u{H…}` | A Unicode scalar, 1 to 6 hex digits, not a surrogate |

In a byte string, `\u{…}` must be at most `FF`.

## Byte-string literals

`b"…"` and `b"""…"""` produce bytes instead of text. They need not be valid UTF-8: `b"\x99\x13"`.

## Character literals

- `'x'` holds exactly one Unicode scalar (LEX0007).
- Its type is `char` unless the context asks for `u8`: `let space: u8 = ' '`.

## Example

```silk
//! Lexical forms in one file.

import silk.text.string { String }
import silk.num.usize

/// Counts bytes in a few literals.
pub fn main() -> i32 {
  let mask = 0xFF_FF
  let flags = 0b1010
  let timeout: u64 = 1h30m
  let path = r"C:\build\out"
  let block = """
first
  second"""
  let snowman = "\u{2603}"
  let space: u8 = ' '
  if timeout != 5400000000000 {
    return 1
  }
  if String.byteLength(snowman) != 3 {
    return 2
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| LEX0001 | Bytes that don't form any token |
| LEX0002 | Unknown literal modifier before a quote |
| LEX0003 | Literal with no closing delimiter |
| LEX0004 | Base prefix with no digits |
| LEX0005 | Digit separator not between two digits |
| LEX0006 | Exponent with no digits |
| LEX0007 | Character literal that isn't exactly one scalar |
| LEX0008 | Duration amount that isn't a whole decimal number |
| LEX0009 | Unknown duration unit |
| LEX0010 | Duration unit repeated |
| LEX0011 | Duration units not largest first |
| LEX0012 | Duration amount too large for its unit |
| LEX0013 | Digit outside the base of a prefixed integer |
| LEX0014 | Type suffix on a numeric literal, such as `7u8` |
| PAR0011 | A `with` clause after a declaration header, or `module with ...`; write a directive before the declaration |
| SEM0002 | Integer literal outside its type's range, including a `usize` or `isize` literal outside the target's word size |

`silk check` and `silk build` report the LEX codes at the invalid token and exit with status 1. Parse errors inside the invalid token are not reported. `let value = 0x` prints:

```
src/main.silk:2:15: error[LEX0004] Base-16 integer literal without digits
```

The Diagnostic codes appendix has a failing program and the printed message for each code.

## See also

Values and primitive types · Expressions and operators · Intrinsics (directives) · Keywords · `silk/text/string`, `silk/text/char`
