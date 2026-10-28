# Grammar summary

This is the grammar the compiler's parser accepts, written compactly. It is derived from the parser source (`compiler/src/parser`). A program the grammar accepts can still be rejected later by name resolution, type checking or ownership checks. The reference pages give each construct's meaning.

## Notation

| Form | Meaning |
| --- | --- |
| `'fn'` | A token spelled exactly so. |
| `Name` | Another rule. |
| `A B` | A followed by B. |
| `A \| B` | A or B. |
| `A?` `A*` `A+` | Optional, zero or more, one or more. |
| `( ... )` | Grouping. |
| `{A ','}` | One or more A separated by commas, with an optional trailing comma. |

`Identifier` is an ASCII letter or `_` followed by letters, digits and `_`. Contextual words such as `where`, `in`, `at`, `some`, `place`, `test` and `module` are ordinary identifiers outside the positions shown. See Keywords.

## Lexical

```
Lifetime      = "'" Identifier
IntegerLit    = Digits | '0x' HexDigits | '0o' OctDigits | '0b' BinDigits      (digits may contain '_')
FloatLit      = Digits '.' Digits ( ('e'|'E') ('+'|'-')? Digits )? | Digits ('e'|'E') ('+'|'-')? Digits
DurationLit   = ( Digits Unit )+        Unit = 'w' | 'd' | 'h' | 'm' | 's' | 'ms' | 'us' | 'ns'
TextLit       = '"' ... '"' | '"""' ... '"""' | 'r"' ... '"'
ByteStringLit = 'b"' ... '"'
CharLit       = "'" char-or-escape "'"
Escape        = '\n' | '\r' | '\t' | '\0' | '\\' | '\"' | "\'" | '\x' Hex Hex | '\u{' Hex+ '}'
Comment       = '//' ... | '///' ... (doc) | '//!' ... (module doc)        (no block comments)
```

- Whitespace and line breaks separate tokens. Statements and declarations need no terminator: `let a = 1 let b = 2` is two statements.
- A line break is significant in one place: an index `[i]` must start on the same line as its operand.
- `/* ... */` is not a comment. It parses as `/` and `*` tokens.

## Source file and declarations

```
SourceFile    = Declaration*
Declaration   = Import | Const | Param | Struct | Tuple | Enum | Union | TypeAlias
              | Service | Interface | Role | Impl | Function | ForeignStatic
              | StaticIfDecl | 'module' PropertyClause

Import        = 'pub'? 'import' ImportPath ( 'as' Identifier )? ImportMembers?
ImportPath    = Identifier ( '.' Identifier )*
ImportMembers = '{' { Identifier ( 'as' Identifier )? ',' } '}'
                (with 'pub', ImportMembers is required)

Const         = 'pub'? 'const' Identifier ( ':' Type )? '=' Expression
Param         = 'pub'? 'param' Identifier ':' Type ( '=' Expression )? ( 'where' Expression )?

Struct        = 'pub'? ( 'extern' TextLit )? 'struct' Identifier GenericParams? '{' { Field ',' }? '}'
Field         = 'pub'? Identifier ':' Type
Tuple         = 'pub'? 'tuple' Identifier GenericParams? '(' { Type ',' }? ')'
Enum          = 'pub'? 'enum' ( '(' Type ')' )? Identifier GenericParams? '{' { EnumMember ',' }? '}'
EnumMember    = Identifier ( '=' '-'? IntegerLit )?
Union         = 'pub'? 'union' Identifier GenericParams? '{' { Variant ',' }? '}'
Variant       = Identifier ( '{' { Field ',' }? '}' )?          (variant fields take commas)
TypeAlias     = 'pub'? 'type' Identifier GenericParams? '=' Type

Service       = 'pub'? 'service' Identifier GenericParams? '{' Operation* '}'
Interface     = 'pub'? 'interface' Identifier GenericParams? '{' Operation* '}'
Operation     = 'pub'? 'static'? 'unsafe'? FunctionName Contract PropertyClause* Block?
Role          = 'pub'? 'role' Identifier GenericParams?

Impl          = 'impl' GenericParams? Type ( 'for' Type )? WhereClause? '{' ImplMember* '}'
ImplMember    = Identifier ':' TypePath                     (maps an operation to a declaration)
              | Function                                     ('fn drop' is allowed here)

Function      = 'pub'? 'test'? 'static'? 'unsafe'? ( ('extern' | 'export') TextLit )?
                FunctionName Contract ( 'as' TextLit )? PropertyClause* Block
FunctionName  = ( 'effect' EffectEnv? )? 'fn' Identifier
EffectEnv     = '<' Lifetime ( '&' Lifetime )* '>'
Contract      = GenericParams? ParamList ( '->' ResultType )? FailureRow? RequirementRow? WhereClause?
ParamList     = '(' { ( 'mut' | 'static' )? Identifier ':' Type ',' }? ( '...' )? ')'
ResultType    = Type | 'some' GenericParams Type

ForeignStatic = 'unsafe' 'extern' TextLit 'static' Identifier ':' Type ( 'as' TextLit )? PropertyClause*
              | 'export' TextLit 'static' Identifier ':' Type ( 'as' TextLit )? '=' Expression
StaticIfDecl  = 'static' 'if' Expression '{' Declaration* '}'
                ( 'else' ( StaticIfDecl | '{' Declaration* '}' ) )?
PropertyClause = 'with' Identifier '.' Identifier '(' { Identifier ':' Expression ',' }? ')'
```

- An `extern` function has no body. Every other function has one; a body that can fall off its end gets an implicit `return ()`.
- `...` ends the parameter list of a foreign function that takes C variadic arguments.
- `type Both = A + B` is a parse error: an alias names one type.

## Generic parameters, rows and constraints

```
GenericParams = '<' { GenericParam ',' } '>'
GenericParam  = Identifier ( ':' Bound ( '+' Bound )* )?          (type parameter)
              | Lifetime ( ':' Lifetime ( '+' Lifetime )* )?      (lifetime parameter)
              | '?' Identifier                                    (row parameter)
Bound         = Type | Lifetime

FailureRow     = '!' Type                                         (a union: 'A | B')
RequirementRow = '?' RowMember ( '|' RowMember )*
RowMember      = '&' 'mut'? TypePrimary ( 'at' TypePath )?
               | 'Without' '<' RowOperand ',' RowOperand '>'
               | TypePrimary                                       (a row parameter name)
RowOperand     = ( '&' 'mut'? TypePrimary | TypePrimary ) ( 'at' TypePath )? ( '|' ... )*

WhereClause   = 'where' { Constraint ',' }
Constraint    = Type 'in' Type
              | Type 'provides' Type 'from' Type
```

## Types

```
Type          = TypePrimary ( '|' TypePrimary )*                 (structural union)
TypePrimary   = TypePath TypeArgs?
              | ( 'mut' | 'once' ) TypePath TypeArgs?             (mode-qualified, e.g. 'once Effect<...>')
              | '&' Lifetime? 'mut'? TypePrimary ( '@' Identifier )?
              | '&' Lifetime? 'mut'? '[' Type ']'                 (slice)
              | '[' Type ';' Expression ']'                       (fixed array)
              | '?'? ( '*' | '[' '*' ']' ) ( 'const' | 'mut' ) PtrQualifier* TypePrimary
              | CallableType
              | 'Without' '<' RowOperand ',' RowOperand '>'
              | 'typeof' '(' TypePath TypeArgs? ')'
              | '(' ')' | '(' Type ')'
TypePath      = Identifier ( '.' Identifier )?                    (at most two segments)
TypeArgs      = '<' ( Lifetime ( '&' Lifetime )* ';' )? { ( Type | Lifetime ) ',' }? FailureRow? RequirementRow? '>'
PtrQualifier  = ( 'align' | 'addrspace' ) '(' IntegerLit ')'
CallableType  = ( 'for' GenericParams )? ( 'extern' TextLit )? 'unsafe'? 'mut'? 'once'? 'fn'
                ( '<' Lifetime '>' )? '(' { Type ',' }? ')' '->' Type PropertyClause*
```

- `&` and pointer types bind to one primary type. Write `&(A | B)` for a reference to a union.
- The `;` in type arguments separates an Effect's environment lifetimes from its success type: `Effect<'a; i32 ! E ? R>`.
- In a `for<...>` binder list, `use 'a` is allowed.
- `?T` is not a type (PAR0007). Nullable pointers (`?*const T`) are the only `?` prefix in a type.

## Statements

```
Block         = '{' Statement* '}'
Statement     = 'let' ( 'mut' | 'static' )? Identifier ( ':' Type )? '=' Expression
              | 'let' Pattern '=' Expression
              | 'if' Cond Block ( 'else' ( IfStatement | Block ) )?
              | 'if' 'let' Pattern '=' Cond Block ( 'else' ( IfStatement | Block ) )?
              | 'static' 'if' Cond Block ( 'else' Block )?
              | 'static' 'for' Identifier 'in' Cond Block
              | 'while' Cond Block
              | 'break' | 'continue'
              | 'return' Expression?                             (bare only directly before '}')
              | 'fail' 'move'? Expression
              | 'drop' Expression
              | 'unsafe' Block
              | Expression '=' Expression                        (assignment)
              | Expression                                       (expression statement)
Cond          = Expression with no bare record literal at its top level
```

- `if`, `if let` and `while` are statements, not expressions.
- A statement `static if` takes only `else Block`; `else static if` is accepted only between declarations.
- There is no `loop` statement (PAR0006), no `for` loop other than `static for`, and no compound assignment.

## Expressions

Operators from weakest to strongest. Levels 4 and 5 do not chain with themselves.

```
Expression    = Binary(1)
Binary(n)     = Unary ( Op(n..10) Binary(n+1) )*
Op            = 1 '|>'  2 '||'  3 '&&'  4 '==' '!='  5 '<' '<=' '>' '>='
                6 '|'   7 '^'   8 '&'   9 '+' '-'    10 '*' '/' '%'
Unary         = ( '-' | '!' | '~' | 'move' | 'unsafe' | '&' 'mut'? ) Unary
              | 'run' Expression                                  (takes the whole rest)
              | Postfix
Postfix       = Primary ( TypeArgs? '(' { Expression ',' }? ')'   (call; type args only before '(')
                        | '.' Identifier | '.' IntegerLit | '.' '*'
                        | '[' Expression ']' )*                   (no line break before '[')
Primary       = Literal | Identifier | '-' IntegerLit | '-' FloatLit
              | '(' ')' | '(' Expression ')' | '(' Expression ',' { Expression ',' }? ')'
              | '[' { Expression ',' }? ']' | '[' Expression ';' Expression ']'
              | TypePath TypeArgs? '{' { Identifier ':' Expression ',' }? '}'          (record)
              | TypePath TypeArgs? '.' Identifier ( '{' { Identifier ':' Expression ',' }? '}' )?   (member or variant)
              | '.' '{' { Identifier ':' Expression ',' }? '}'                       (contextual record)
              | 'effect' Block
              | 'effect'? 'fn' ParamList '->' ResultType FailureRow? RequirementRow? Block
              | 'match' MatchAccess? Expression '{' MatchArm* '}'
              | 'compileError' '(' Expression ')'
MatchAccess   = 'move' | '&' 'mut'? | 'place'
MatchArm      = Pattern ( 'if' Expression )? '=>' ( Block | Expression )
Literal       = IntegerLit | FloatLit | DurationLit | TextLit | ByteStringLit | CharLit | 'true' | 'false'
```

- Records are not allowed at the top level of an `if`, `if let` or `while` condition, a `static if` or `static for` operand, or a `match` subject. Parenthesize the record or bind it first. Inside parentheses, brackets or a call's arguments they are allowed.
- `a < b == c` parses as `(a < b) == c`, because the two operators are on different levels. `a == b != c` and `1 < 2 < 3` are parse errors.
- `x |> f(y)` calls `f(x, y)`. With no further arguments write `x |> f`; `x |> f()` is SEM0078.
- Match arms take no separator.
- `<` followed by `>`, a lifetime or a type at the start of an expression is reserved template syntax (PAR0003).

## Patterns

```
Pattern       = '_'
              | '-'? IntegerLit
              | TypePath '.' Identifier                            (enum member or unit variant)
              | TypePath TypeArgs? '.' Identifier FieldPatterns?   (variant)
              | Type Identifier                                    (typed binder: 'i32 k')
              | Type FieldPatterns                                 (struct)
FieldPatterns = '{' { FieldPattern ',' }? '}'
FieldPattern  = '..' | Identifier ( ':' ( Identifier | Pattern ) )?
```

A binder always names its type. A bare name such as `k =>` is not a pattern; write `i32 k =>` or `_`.

## Rules checked by experiment

Each row is a `src/main.silk` in `/home/you/demo`. The first column is the program, shortened to the relevant line.

| Program | Result |
| --- | --- |
| `struct Point { x: i32 y: i32 }` | `` 1:23: error[PAR0001] Expected `,` `` |
| `if Point { x: 1 }.x == 1 { return 0 }` | ``3:15: error[PAR0002] Unexpected `:`; expected valid syntax`` and more errors |
| `if (Point { x: 1 }).x == 1 && x(Point { x: 1 }) == 1 { return 0 }` | Builds and exits 0. |
| `if let Slot.Full { value } = move Slot.Full { value: 2 } { return value }` | ``3:54: error[PAR0002] Unexpected `:`; expected valid syntax`` and more |
| `let b = a` | With `[0]` on the next line: `4:3: error[SEM0087]`. The `[0]` is a new array statement, not an index. |
| `pub import silk.collections.list` | `` 2:1: error[PAR0001] Expected `{` `` |
| `static if true { return 0 } else static if false { return 1 }` | `` 2:36: error[PAR0001] Expected `{` `` (inside a function body) |
| `return match n { k => k }` | `` 4:7: error[PAR0001] Expected `{` `` and `4:5: error[SEM0001] Unknown type k` |
| `let chained = 1 == 1 != false` | ``3:24: error[PAR0002] Unexpected `!=`; expected valid syntax`` |
| `let mixed = 1 < 2 == true` | Accepted. |
| `1 => 0,` between two match arms | ``4:11: error[PAR0002] Unexpected `,`; expected valid syntax`` |
| `type Both = Equal + Order` | ``3:19: error[PAR0002] Unexpected `+`; expected valid syntax`` |
| `return`, then `let x = 1` on the next line | `3:3: error[PAR0001] Expected identifier` |
| `/* block */` | ``2:3: error[PAR0002] Unexpected `/`; expected valid syntax`` and more |
| `let piped = 3 \|> twice()` | `3:20: error[SEM0078] Calling a unary callable with no arguments instead of naming it` |
| `let t = r"raw"` | Builds. |
| `let f = 1e5` | Accepted. |

This program uses most of the forms above. It builds and exits 0.

```silk
struct Point {
  x: i32,
  y: i32,
}

union Shape {
  Dot,
  Box { w: i32, h: i32, }
}

enum(u8) Level {
  Low = 1,
  High = 2,
}

tuple Pair(i32, i32)

fn origin() -> Point {
  return .{ x: 0, y: 0 }
}

fn area(s: &Shape) -> i32 {
  return match &s.* {
    Shape.Dot => 0
    Shape.Box { w, h: height } => w * height
  }
}

fn add(a: i32, b: i32) -> i32 {
  return a + b
}

effect fn later() -> i32 {
  return 4
}

pub fn main() -> i32 {
  let zeros = [0; 4]
  let p = origin()
  let Point { x, y } = move p
  let pair = Pair(1, 2)
  let s = Shape.Box { w: 2, h: 3 }
  let mut total = add(zeros[3], area(&s))
  total = total + pair.0 - 1
  if let Shape.Box { w, .. } = move s {
    total = total + w - 2
  }
  let n = 5
  let picked = match n {
    -1 => 0
    i32 k if k > 3 => k
    _ => 1
  }
  if (run later()) != 4 {
    return 9
  }
  let level = Level.High
  if level == Level.Low {
    return 8
  }
  return total - 6 + x + y + picked - 5
}
```

The lexical forms also check: `0b1010 + 0o17 + 0xFF + 1_000` is 1280, and `1.5e3`, `"""triple "quoted" text"""`, `1w2d`, `'\u{41}'`, `//!` and `///` comments are accepted. See Lexical structure, Expressions and operators, Patterns and match.
