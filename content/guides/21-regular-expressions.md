# Regular expressions

This guide builds `tags`, a small program that searches text with `silk.text.regex`. It reads release tags into a struct of their parts, finds a word and where it is, tests text against a pattern written once, and reports a pattern that does not compile. The pattern for the tags is checked against its struct while the program compiles, so a group with no field, or a field with no group, is a compile error rather than a surprise at run time.

Start a project and replace `src/main.silk` as you go:

```sh
silk init tags
cd tags
```

## The pattern language

Patterns use the ECMAScript grammar in its Unicode (`u`) mode, the one JavaScript's `/.../u` uses, without the surrounding slashes or flags. Silk's own engine compiles a pattern to bytecode once and runs it with a backtracking matcher whose stack lives on the heap, so long text never runs out of native stack.

- Captures `( )`, named groups `(?<name> )`, non-capturing groups `(?: )`, backreferences `\1` and `\k<name>`.
- Lookahead and lookbehind, `(?= )`, `(?! )`, `(?<= )` and `(?<! )`.
- Classes such as `[a-z]`, `\d`, `\w` and `\s`, and Unicode properties such as `\p{Letter}`, from Unicode 17.0.0.
- Greedy and lazy repetition, and scoped modifiers `(?i: )`, `(?m: )` and `(?s: )` for case folding, multi-line anchors and a `.` that matches newlines.

`\d` and `\w` are ASCII classes, as in ECMAScript. A search is unanchored unless the pattern starts with `^` or ends with `$`. Text is UTF-8, and every offset a match reports counts UTF-8 bytes. In a Silk string literal each backslash of the pattern is written twice: `"\\d+"` is the pattern `\d+`.

## A pattern checked against a struct

`Regex.typed<T>` takes a pattern with named groups and a struct with one field per group. It runs while the program compiles, during static evaluation, and checks that the two agree:

```silk
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.io.logger { LogError, Logger }
import silk.io.logger_native { StdoutLogger }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.text.regex { Matcher, Regex, RegexError, Typed }

// One release tag, read from the named groups of VERSION.
struct Version<'a> {
  pub major: string<'a>,
  pub minor: string<'a>,
  pub patch: string<'a>,
  pub pre: Option<string<'a>>,
}

const VERSION: Typed<Version<'static>> = Regex.typed<Version<'static>>(
  "v(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)(-(?<pre>[0-9A-Za-z.]+))?",
)
```

A field is `string<'a>` when every match sets its group, and `Option<string<'a>>` when a match can leave it unset, as the optional `(-...)?` part leaves `pre`. The fields borrow the text that was searched, so the struct carries its lifetime. The pattern is written at `'static` in the `const`. A search names the struct again at the lifetime of its text.

`VERSION.compile()` builds a `Matcher` from the checked pattern. `Matcher.find` returns the first match as the struct, and `Matcher.whole` returns a match only when it spans the whole text, as if the pattern were written `^(?:...)$`:

```silk
// Reads a tag that is a whole version; none for any other tag.
effect fn parse<'a>(versions: &Matcher<Version<'static>>, tag: string<'a>) -> Option<Version<'a>>
  ! RegexError | OutOfMemoryError
  ? &mut Allocator {
  return run versions.whole<Version<'a>>(tag)
}

// Reports each tag that is a whole version, and its parts.
effect fn versions(tags: &[string<'static>]) -> ()
  ! RegexError | OutOfMemoryError | LogError
  ? &mut Allocator | &mut Logger {
  let matcher = run VERSION.compile()
  let mut at: usize = 0
  while at < tags.length {
    let tag = tags[at]
    match move run parse(&matcher, tag) {
      Option<Version>.Some { value: v } => {
        let pre = v.pre.unwrapOr("none")
        run Effect.log(
          "{tag}: {major}.{minor}.{patch}, pre-release {pre}\n",
          &.{ tag: tag, major: v.major, minor: v.minor, patch: v.patch, pre: pre },
        )
      }
      Option<Version>.None => run Effect.log("{tag}: not a version\n", &.{ tag: tag })
    }
    at = at + 1
  }
}
```

`parse` is generic over the text's lifetime: `whole<Version<'a>>` reads a `Version` whose fields borrow `tag`. Searches can fail with `RegexError` (a search that takes more than about 1,000,000 backtracking steps reports `MatchLimit`; it never answers no match) and with `OutOfMemoryError`, and they need an `Allocator`.

## Mistakes the compiler catches

Each of these stops `silk check` at the struct field or at the pattern, with a note pointing at the `Regex.typed` call.

Declare `pre` as `string<'a>`, though `(-(?<pre>...))?` may take no part in a match:

```
src/main.silk:13:7: error[SEM0177] pre can be absent, so declare it Option<string>
  note: src/main.silk:16:42: related location
```

Declare `major` as `Option<string<'a>>`, though every match sets it:

```
src/main.silk:10:7: error[SEM0177] major is always present, so declare it string
  note: src/main.silk:16:42: related location
```

Add a field `pub build: Option<string<'a>>` with no group of that name:

```
src/main.silk:14:7: error[SEM0177] field build has no capture group in the pattern; name one (?<build>...)
  note: src/main.silk:17:42: related location
```

Add a group `(\\+(?<build>\\w+))?` to the pattern with no field for it:

```
src/main.silk:17:85: error[SEM0177] the pattern captures build but the struct has no field build
  note: src/main.silk:16:42: related location
```

Leave a class open, `(?<patch>[0-9+)`:

```
src/main.silk:17:77: error[SEM0177] invalid regex: extraneous characters at the end
  note: src/main.silk:16:42: related location
```

A typed pattern's group names must be ASCII identifiers. Reading a field the struct does not have, such as `v.majr`, is the ordinary error for a field that does not exist.

## Groups by number and by name

When there is no struct to fill, `Regex.compile` compiles a pattern at run time and `Regex.find` returns the first `Match`:

```silk
// Finds the first word that starts with a capital, and where it is.
effect fn firstName(text: string<'static>) -> ()
  ! RegexError | OutOfMemoryError | LogError
  ? &mut Allocator | &mut Logger {
  let pattern = run Regex.compile("\\b(?<name>[A-Z]\\w*)")
  match move run Regex.find(&pattern, text) {
    Option.Some { value } => {
      let name = value.named(&pattern, "name").unwrapOr("")
      run Effect.log(
        "{name} at bytes {start}..{end}\n",
        &.{ name: name, start: value.start(), end: value.end() },
      )
    }
    Option.None => run Effect.log("no name\n", &())
  }
}
```

A `Match` borrows the text. `start()` and `end()` are byte offsets of the whole match, `text()` is the matched text, and `group(i)` is group `i`, numbered from 1 in the order the `(` appear, with group 0 the whole match. `groupCount()` counts them, group 0 included; `group` traps for an index past the last one. `named(&pattern, "name")` reads a group by name, taking whichever group of that name took part when two alternatives share it, as in `(?<n>a)|(?<n>b)`. A group that took no part is `None` either way. `Regex.groupIndex(&pattern, "name")` gives a name's number.

## Testing text, and patterns that do not compile

`Regex.matches(pattern, text)` compiles and searches once. For a pattern used many times, compile it once with `Regex.compile` and search with `Regex.test`, which answers whether it matches anywhere. `Regex.validate(pattern)` only checks the syntax.

A pattern that arrives at run time can be wrong. `Regex.compile` then fails with `RegexError`, whose `reason` is `Syntax`, or `PatternLimit` for a pattern over 65,536 bytes, groups nested deeper than 255 levels, or 255 or more captures. `message` says what is wrong and `offset` is the byte in the pattern where it was found:

```silk
// Runs every example. A pattern that does not compile fails with RegexError.
effect fn report(userPattern: string<'static>) -> ()
  ! RegexError | OutOfMemoryError | LogError
  ? &mut Allocator | &mut Logger {
  let tags = ["v1.4.2", "v2.0.0-rc.1", "release-7", "v1.4"]
  run versions(&tags)
  run firstName("ask Ada or Grace")
  let lowercase = run Regex.matches("^[a-z]+$", "silk")
  run Effect.log("lowercase: {lowercase}\n", &.{ lowercase: lowercase })
  let user = run Regex.compile(userPattern)
  let hit = run Regex.test(&user, "silk 0.1")
  run Effect.log("{userPattern} matches: {hit}\n", &.{ userPattern: userPattern, hit: hit })
}

// Says what is wrong with a pattern, and where.
effect fn badPattern(error: RegexError) -> ()
  ! LogError
  ? &mut Logger {
  run Effect.log(
    "bad pattern at byte {offset}: {message}\n",
    &.{ offset: error.offset, message: error.message },
  )
}

pub effect fn main() -> ()
  ! OutOfMemoryError | LogError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut logger = StdoutLogger.make()
  run Effect.catch<RegexError>(report("[0-9"), badPattern)
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Logger>(&mut logger)
}
```

`RegexError` does not implement `Debug`, so it cannot leave `main`; `Effect.catch` turns it into a line of output instead.

## Run it

```sh
silk run
```

```
v1.4.2: 1.4.2, pre-release none
v2.0.0-rc.1: 2.0.0, pre-release rc.1
release-7: not a version
v1.4: not a version
Ada at bytes 4..7
lowercase: true
bad pattern at byte 4: unexpected end
```

`release-7` has no `v`, and `v1.4` stops before a patch number, so `whole` finds no version in either. `Ada` starts at byte 4 of `ask Ada or Grace`. The pattern `[0-9` ends inside its class, so `report` stops there and `badPattern` prints the error. Close it, `report("[0-9]")`, and the last line is `[0-9] matches: true`.

## API reference

The `silk.text.regex` page of the Std lib API reference lists every operation, with its errors and limits. JSON Schema `pattern` keywords use the same engine; see **Schemas**.
