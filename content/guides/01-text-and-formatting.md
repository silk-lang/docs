# Text and formatting

This guide builds `textinfo`, a small program that looks at text the way Silk sees it: as UTF-8 bytes, as Unicode scalars, and as values you write through a template. Along the way you check bytes for valid UTF-8, decode bytes that arrive in pieces, compare two spellings of the same word, parse numbers back out of text, and teach a type of your own to print itself.

Start a project and replace `src/main.silk` as you go:

```sh
silk init textinfo
cd textinfo
```

## Three kinds of text

Silk keeps three things apart, and every function in this guide picks one of them on purpose.

| Type | Module | What it is | Allocates |
| --- | --- | --- | --- |
| `string` | built in | A borrowed view of valid UTF-8. Literals are `string<'static>`. | Never |
| `String` | `silk/string` | Owned, growable, always valid UTF-8. | When it grows |
| `Bytes` / `&[u8]` | `silk/bytes` | Any octets, no promise about UTF-8. | `Bytes` when it grows |

A `string` is what you pass around. `String` is what you build. Bytes are what you get from files, sockets and child processes, and they only become text after you check them. Chapter 9 of the book, "Text, collections and memory", covers views and owned values in more depth.

## Bytes and scalars

A `string` has a byte length and a scalar count, and they differ as soon as the text leaves ASCII. `String.byteLength` returns the first. For the second you walk the text with a scalar cursor:

```silk
// Counts Unicode scalars by walking the text with a cursor.
fn scalarCount(text: string) -> usize {
  let mut count: usize = 0
  let mut cursor = String.scalarCursor()
  while true {
    match String.nextScalar(text, move cursor) {
      Option.Some { value } => {
        count = count + 1
        cursor = String.nextCursor(move value)
      }
      Option.None => {
        return count
      }
    }
  }
  return count
}
```

`String.scalarCursor()` starts before the first scalar. `String.nextScalar` decodes one scalar and returns a `ScalarStep`, or `None` at the end. `String.nextCursor` consumes the step and gives the cursor after it. The cursor and the step are not `Copy`, so each hand-off is an explicit `move`.

A step also knows where it started. `String.scalarValue(&step)` is the `char`, and `String.scalarByteOffset(&step)` is the byte offset. `char.toU32` from `silk/char` turns a `char` into its number. Going the other way, `char.fromU32` returns `None` for surrogates and values above `0x10FFFF`, so you never get an invalid `char`.

A scalar is a code point, not what a reader sees as one character. `e` followed by a combining accent is two scalars. The std lib has no grapheme segmentation.

## Writing through a template

`Format.format` from `silk/format` writes a template to the ambient `Writer`:

```silk
effect fn describe(text: string) -> () ! WriterError ? &mut Writer {
  run Format.format("{text}: {bytes} bytes, {scalars} scalars\n", &.{
    text: text,
    bytes: String.byteLength(text),
    scalars: scalarCount(text),
  })
}
```

The second argument is a borrowed record. `{text}` picks the field named `text`. You can use a tuple instead and write `{}` for each field in order: `Format.format("{} has {} tasks\n", &("Julia", 3))`. One template uses names or positions, not both, and a positional template must use every field exactly once. A placeholder can also carry options after a colon, such as `{bytes:>4}`; **Options in a placeholder** below lists them.

The template is checked while the program compiles. `{{` and `}}` write literal braces. Each value must implement `Display`, which the std lib provides for every integer type, `f32`, `f64`, `bool`, `char` and `string`. A `bool` prints as `true` or `false`, and a `char` as the character itself. A `{:?}` placeholder uses `Debug` instead, described below.

`describe` needs `? &mut Writer`, and nothing in it says where the bytes go. `main` decides that by providing `StdoutWriter` from `silk/os_writer`. A test could provide a writer that collects bytes instead. The guide "Output, logging and standard input" shows that, and `Effect.log` takes the same templates.

Make a typo in a field name and the build stops:

```silk
  run Format.format("{name} has {count} tasks\n", &.{ name: "Julia", cuont: 3 })
```

```sh
silk check
```

```
Checking textinfo (x86_64-unknown-linux-gnu)
  load     52 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.24s
[x86_64-unknown-linux-gnu]
src/main.silk:8:7: error[SEM0177] template field {count} not found; available visible fields: name, cuont
Failed textinfo in 0.31s
```

The error points at the call, and the message names the missing placeholder and lists the fields you did pass. A positional template is checked the same way. With `Format.format("{} has {} tasks, {} done\n", &("Julia", 3))` the check reports:

```
src/main.silk:8:7: error[SEM0177] template placeholder 3 `{}` has no positional field; the arguments have 2
```

A value whose type has no `Display` stops the build at the call too, with SEM0121. For a struct `Plain` without an `impl Display`:

```
src/main.silk:10:7: error[SEM0121] `main.Plain: silk/format.Display` cannot be proved: no implementation of `silk/format.Display` exists for `main.Plain`
```

Implement `Display` for the type, as the next sections show, or pass one of its fields instead.

## Options in a placeholder

After a colon, a placeholder takes options in the same order as Rust's `format!`. Each part is optional:

| Part | Example | Effect |
| --- | --- | --- |
| Fill and alignment | `{:>8}`, `{:*^8}` | `<` left, `^` center, `>` right. A fill character goes before the alignment |
| Sign | `{:+}` | Always write a sign. `-` is the default |
| Alternate form | `{:#x}` | Add the `0x`, `0o` or `0b` prefix, or pretty-print with `{:#?}` |
| Zero padding | `{:05}` | Pad a number with zeros after its sign or prefix |
| Width | `{:8}` | The minimum width, in Unicode scalars |
| Precision | `{:.2}` | Fractional digits for a float, the minimum digit count for an integer, the maximum length for text |
| Type | `{:x}`, `{:X}`, `{:o}`, `{:b}`, `{:e}`, `{:E}`, `{:?}` | Hexadecimal, octal or binary for an integer, scientific notation for a float, `Debug` for any value that has it |

Numbers align right by default, and text, `bool` and `char` align left. A named placeholder puts the options after its name, as in `{cost:>8.2}`:

```silk
// Placeholder options: alignment, fill, precision, sign, bases and scientific notation.
effect fn options() -> () ! WriterError ? &mut Writer {
  run Format.format("{:<10}{:>8}\n", &("item", "price"))
  run Format.format("{name:.<10}{cost:>8.2}\n", &.{ name: "tea", cost: 2.5 })
  run Format.format("{name:.<10}{cost:>8.2}\n", &.{ name: "biscuits", cost: 12.0 })
  run Format.format("[{:^9}] [{:.3}] [{:+}] [{:05}]\n", &("mid", "naïve", 7, 0 - 42))
  run Format.format("{:x} {:#X} {:#o} {:#010b} {:e}\n", &(255, 255, 8, 5, 1234.5))
}
```

The compiler checks the options with the rest of the template. A base type on a float or `e` on an integer stops the build at the call. The width and precision are fixed in the template. To take them from a value, build a `FormatOptions` (it has `width`, `alignment`, `fill`, `sign`, `zeroPad`, `precision` and `style`) and display one value with `Format.displayWith`. `FormatOptions` also has the two settings a template cannot express: `Sign.Space` and `color`.

Checking a template takes compile time, and the time grows faster than the number of placeholders, whether they are named or positional. A template with 8 placeholders takes about half a second of `silk check`, 16 about one second, 24 about two seconds, and 40 about six. For a long line, split it into several `Format.format` calls.

Precision on a float means exactly that many fractional digits, rounded half to even. Without it, a float prints the shortest decimal that reads back to the same bits.

## Showing a value for debugging

`{:?}` writes a value's `Debug` form, which shows its structure: strings and chars are quoted and escaped, and `Option` and `Result` name their variant. Numbers and `bool` print as with `Display`.

```silk
// Debug output quotes text and names variants.
effect fn debugging() -> () ! WriterError ? &mut Writer {
  run Format.format("{:?} {:?} {:?} {:?}\n", &("tab\there", 'é', Option<i32>.some(3), Option<i32>.none()))
}
```

To give a struct of your own a `Debug` form, implement `Debug` from `silk/format` and call `Format.debugFields(self, "Name", &mut formatter)`, which writes `Name { field: value, ... }`. `{:#?}` puts each field on its own line. `Format.debugList` writes a sequence as `[1, 2, 3]`.

## A type that prints itself

Code points are usually written as `U+00EF`. `{:04X}` gets the digits, but a type of your own can do better. Implement `Display` for a small `CodePoint` type and it works in templates, with their options, and with `displayWith` alike:

```silk
// A Unicode scalar shown the way the standard writes it: U+00E9.
struct CodePoint { value: u32 }

const HEX: string = "0123456789ABCDEF"

impl Display for CodePoint {
  effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    let digits = String.utf8Bytes(HEX)
    let mut buffer: [u8; 6] = [0; 6]
    let mut count: usize = 0
    let mut rest = self.value
    while count < 4 || rest != 0 {
      buffer[5 - count] = digits[u32.toUsize(rest % 16)]
      rest = rest / 16
      count = count + 1
    }
    run Format.writeLeadingPadding(&mut formatter.*, count + 2)
    run Format.writeText(&mut formatter.*, "U+")
    run Format.write(&mut formatter.*, Slice.view(&buffer, 6 - count, count))
    run Format.writeTrailingPadding(&mut formatter.*, count + 2)
  }
}
```

The `Formatter` carries the options the caller chose. Your impl decides the content width, here `count + 2` scalars, and `writeLeadingPadding` and `writeTrailingPadding` add whatever fill the width and alignment ask for. The `Format.write*` functions take the formatter as `&mut Formatter`, so pass a fresh reborrow, `&mut formatter.*`. `Slice.view` from `silk/slice` borrows the filled end of the buffer; Silk has no `a[i..j]` syntax.

Now print one row per scalar, with the offset right-aligned in 6 columns and the code point left-aligned in 8:

```silk
// One row per scalar: its byte offset and its code point.
effect fn scalars(text: string) -> () ! WriterError ? &mut Writer {
  run Format.format("offset  scalar\n", &())
  let mut cursor = String.scalarCursor()
  while true {
    match String.nextScalar(text, move cursor) {
      Option.Some { value } => {
        let offset = String.scalarByteOffset(&value)
        let point = CodePoint { value: char.toU32(String.scalarValue(&value)) }
        run Format.format("{offset:>6}  {point:<8}|\n", &.{ offset: offset, point: move point })
        cursor = String.nextCursor(move value)
      }
      Option.None => {
        return ()
      }
    }
  }
}
```

The `{point:<8}` options reach `CodePoint`'s `display` through the `Formatter`, so its own padding calls fill the column.

## Checking bytes for UTF-8

Bytes from outside are not text until you check them. `String.fromUtf8` validates a whole slice and, on success, borrows it as a `string` without copying:

```silk
// Validates a complete byte slice before treating it as text.
effect fn validate(bytes: &[u8]) -> () ! WriterError ? &mut Writer {
  match String.fromUtf8(bytes) {
    Result.Success { value } => {
      run Format.format("valid: {text}\n", &.{ text: value })
    }
    Result.Failure { error } => {
      run Format.format("invalid UTF-8 at byte {offset}\n", &.{ offset: error.offset })
    }
  }
}
```

`InvalidUtf8` carries the offset of the first bad byte. Invalid input is a plain `Result`, not a typed failure, so the caller decides whether it matters. To keep the text past the life of the buffer, use `String.copyUtf8`, which validates and copies. `String.fromBytes` takes an owned `Bytes` and turns it into a `String` without copying.

## Decoding bytes that arrive in pieces

`fromUtf8` needs all the bytes at once. Data from a pipe or a socket comes in chunks, and a two-byte `é` can be split between them. `Utf8Decoder` from `silk/utf8_decoder` takes one byte at a time and keeps the partial scalar between calls:

```silk
// Decodes bytes that arrive in pieces. A scalar may be split between two chunks.
effect fn decodeChunks(chunks: &[&[u8]]) -> () ! WriterError ? &mut Writer {
  let mut decoder = Utf8Decoder.make()
  let mut offset: usize = 0
  let mut chunk: usize = 0
  while chunk < chunks.length {
    let bytes = chunks[chunk]
    let mut index: usize = 0
    while index < bytes.length {
      match decoder.step(bytes[index], offset) {
        Utf8Step.Scalar { value } => {
          run Format.format("{point} ", &.{ point: CodePoint { value: value } })
        }
        Utf8Step.NeedMore => {
          run Format.format("(chunk {chunk} ends mid-scalar) ", &.{ chunk: chunk })
        }
        Utf8Step.Invalid { offset: bad } => {
          run Format.format("invalid byte at {offset}\n", &.{ offset: bad })
          return ()
        }
      }
      index = index + 1
      offset = offset + 1
    }
    chunk = chunk + 1
  }
  if decoder.pending() {
    run Writer.writeString("incomplete input\n")
  } else {
    run Writer.writeString("done\n")
  }
}
```

`Writer.writeString` writes text with no template at all. `step` returns `Scalar`, `NeedMore` or `Invalid`. You pass each byte's absolute offset, so an `Invalid` result points into your whole input, not into one chunk. At the end of input, check `pending()`: a scalar that was started but never finished is your error to report. After `Invalid`, make a new decoder before you continue.

The pattern names the field `offset: bad` because `offset` is already a local. Reusing it is SEM0048, "A pattern binding whose spelling collides with an existing declaration".

## Comparing two spellings

`é` can be one scalar, `U+00E9`, or two, `e` plus `U+0301`. They look the same and compare different, because `==` on strings compares bytes. Normalize both sides first with `Unicode.normalizeNfc` from `silk/unicode`:

```silk
// Two spellings of the same word: a precomposed é, and e plus a combining accent.
effect fn normalize() -> () ! WriterError | OutOfMemoryError ? &mut Writer | &mut Allocator {
  let composed = "caf\u{E9}"
  let decomposed = "cafe\u{301}"
  run Format.format("raw equal: {equal}\n", &.{ equal: composed == decomposed })
  let left = run Unicode.normalizeNfc(composed)
  let right = run Unicode.normalizeNfc(decomposed)
  run Format.format("NFC equal: {equal} (Unicode {version})\n", &.{
    equal: String.view(&left) == String.view(&right),
    version: Unicode.dataVersion(),
  })
}
```

Normalization returns a new owned `String`, so it needs `? &mut Allocator` and can fail with `OutOfMemoryError`. `String.view` borrows it back as a `string`. `normalizeNfd` gives the decomposed form. The module does canonical forms only: no NFKC or NFKD, no case folding, no locale-aware comparison. Of the Unicode character properties, it exposes only the canonical combining class (`Unicode.canonicalCombiningClass`). There are no queries such as "is this a letter".

## Building owned text and reading numbers

`+` does not join strings. To build text you own, start a `String` and append to it:

```silk
// Owned text: String keeps its own buffer and can grow.
effect fn greeting(name: string) -> String ! OutOfMemoryError ? &mut Allocator {
  let mut text = run String.copy("Hello, ")
  run text.append(name)
  run text.append("!")
  return move text
}
```

If an append cannot get memory, the `String` keeps its old contents. For text with numbers in it, a template written into a `Writer` that collects bytes is usually simpler; chapter 9 of the book builds one.

The opposite direction is parsing. `Format.i32Value` and its siblings (`u8Value` to `i64Value`, `f64Value`, `f32Value`) read a whole string as a decimal number:

```silk
// Reads decimal text back into a number. The whole text must be a number.
effect fn parse(text: string) -> () ! WriterError ? &mut Writer {
  match Format.i32Value(text) {
    Result.Success { value } => {
      run Format.format("{text} -> {value}\n", &.{ text: text, value: value })
    }
    Result.Failure { error } => {
      match move error.reason {
        NotANumber { offset } => {
          run Format.format("{text}: not a number at byte {offset}\n", &.{ text: text, offset: offset })
        }
        OutOfRange {} => {
          run Format.format("{text}: too big for i32\n", &.{ text: text })
        }
      }
    }
  }
}
```

A `ParseError` holds a `reason` that is either `NotANumber`, with the offset where reading stopped, or `OutOfRange`. They do not allocate.

## Run it

`report` calls everything above, and `main` provides the two services it needs:

```silk
// The whole report. It writes to whatever Writer the caller provides.
effect fn report() -> () ! WriterError | OutOfMemoryError ? &mut Writer | &mut Allocator {
  run describe("Silk")
  run describe("naïve")
  run options()
  run debugging()
  run scalars("naïve")
  run validate(b"caf\xC3\xA9")
  run validate(b"caf\xC3")
  let chunks: [&[u8]; 2] = [b"caf\xC3", b"\xA9!"]
  run decodeChunks(&chunks)
  run normalize()
  let hello = run greeting("naïve reader")
  run describe(String.view(&hello))
  run parse("1234")
  run parse("12x")
  run parse("9999999999")
  run Format.format("{{name}} is literal; {name} is {count} scalars\n", &.{
    name: "naïve",
    count: scalarCount("naïve"),
  })
}

pub effect fn main() -> i32 ! WriterError | OutOfMemoryError {
  let mut out = StdoutWriter.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  run report()
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}
```

The imports at the top of the file:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.char
import silk.effect { Effect }
import silk.format { Display, Format, Formatter, NotANumber, OutOfRange }
import silk.option { Option }
import silk.os_writer { StdoutWriter }
import silk.result { Result }
import silk.slice { Slice }
import silk.string { String }
import silk.u32
import silk.unicode { Unicode }
import silk.utf8_decoder { Utf8Decoder, Utf8Step }
import silk.writer { Writer, WriterError }
```

```sh
silk run
```

```
Silk: 4 bytes, 4 scalars
naïve: 6 bytes, 5 scalars
item         price
tea.......    2.50
biscuits..   12.00
[   mid   ] [naï] [+7] [-0042]
ff 0xFF 0o10 0b00000101 1.2345e3
"tab\there" 'é' Some(3) None
offset  scalar
     0  U+006E  |
     1  U+0061  |
     2  U+00EF  |
     4  U+0076  |
     5  U+0065  |
valid: café
invalid UTF-8 at byte 3
U+0063 U+0061 U+0066 (chunk 0 ends mid-scalar) U+00E9 U+0021 done
raw equal: false
NFC equal: true (Unicode 17.0.0)
Hello, naïve reader!: 21 bytes, 20 scalars
1234 -> 1234
12x: not a number at byte 2
9999999999: too big for i32
{name} is literal; naïve is 5 scalars
```

Read it against the code. The price column pads `2.50` to 8 columns, `{:.3}` cuts `naïve` to three scalars, and `{:05}` puts the zeros after the minus sign. `{:#010b}` counts the `0b` prefix in its width of 10. `ï` takes two bytes, so the offsets jump from 2 to 4. `b"caf\xC3"` stops in the middle of `é`, and the error names byte 3. The decoder sees the same split bytes across two chunks and puts `é` back together.

## API reference

- `silk/string`: `String`, `InvalidUtf8`, `ScalarCursor`, `ScalarStep`
- `silk/char`: `fromU32`, `toU32`
- `silk/utf8_decoder`: `Utf8Decoder`, `Utf8Step`
- `silk/unicode`: `Unicode`
- `silk/format`: `Format`, `FormatOptions`, `Display`, `Debug`, `Formatter`, `ParseError`
- `silk/writer`: `Writer`, `WriterError`
- `silk/os_writer`: `StdoutWriter`
- `silk/slice`: `Slice`
- `silk/bytes`: `Bytes`
