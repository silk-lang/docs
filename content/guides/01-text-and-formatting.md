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

The second argument is a borrowed record. `{text}` picks the field named `text`. You can use a tuple instead and write `{}` for each field in order: `Format.format("{} has {} tasks\n", &("Julia", 3))`. One template uses names or positions, not both, and a positional template must use every field exactly once.

The template is checked while the program compiles. `{{` and `}}` write literal braces. Each value must implement `Display`, which the std lib provides for every integer type, `f32`, `f64`, `bool`, `char` and `string`. A `bool` prints as `true` or `false`, and a `char` as the character itself.

`describe` needs `? &mut Writer`, and nothing in it says where the bytes go. `main` decides that by providing `StdoutWriter` from `silk/os_writer`. A test could provide a writer that collects bytes instead. The guide "Output, logging and standard input" shows that, and `Effect.log` takes the same templates.

Make a typo in a field name and the build stops:

```silk
  run Format.format("{name} has {count} tasks\n", &.{ name: "Julia", cuont: 3 })
```

```sh
silk check
```

```
[x86_64-unknown-linux-gnu]
/home/you/textinfo/src/main.silk:8:7: error[SEM0177] template field {count} not found; available visible fields: name, cuont
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

The error points at the call, and the message names the missing placeholder and lists the fields you did pass. A positional template is checked the same way. With `Format.format("{} has {} tasks, {} done\n", &("Julia", 3))` the check reports:

```
/home/you/textinfo/src/main.silk:8:7: error[SEM0177] template placeholder 3 `{}` has no positional field; the arguments have 2
```

A value whose type has no `Display` stops the build at the call too, with SEM0121. For a struct `Plain` without an `impl Display`:

```
/home/you/textinfo/src/main.silk:10:7: error[SEM0121] `main.Plain: silk/format.Display` cannot be proved: no implementation of `silk/format.Display` exists for `main.Plain`
```

Implement `Display` for the type, as the next sections show, or pass one of its fields instead.

## Width and alignment

A template always uses default options. For a column, display one value at a time with `Format.displayWith` and a `FormatOptions`:

```silk
fn column(width: usize, alignment: Alignment) -> FormatOptions {
  let mut options = Format.defaultOptions()
  options.width = Option<usize>.some(width)
  options.alignment = alignment
  return move options
}
```

`FormatOptions` also has `fill`, `sign`, `zeroPad` and `precision`. Width counts Unicode scalars, not bytes and not terminal cells. Precision on a float means exactly that many fractional digits. Without it, a float prints the shortest decimal that reads back to the same bits.

## A type that prints itself

Code points are usually written as `U+00EF`. Implement `Display` for a small `CodePoint` type and it works in templates and with `displayWith` alike:

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
        run Format.displayWith(&offset, column(6, Alignment.Right))
        run Writer.writeString("  ")
        run Format.displayWith(&point, column(8, Alignment.Left))
        run Writer.writeString("|\n")
        cursor = String.nextCursor(move value)
      }
      Option.None => {
        return ()
      }
    }
  }
}
```

`Writer.writeString` writes text with no template at all.

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

`step` returns `Scalar`, `NeedMore` or `Invalid`. You pass each byte's absolute offset, so an `Invalid` result points into your whole input, not into one chunk. At the end of input, check `pending()`: a scalar that was started but never finished is your error to report. After `Invalid`, make a new decoder before you continue.

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
import silk.format { Alignment, Display, Format, FormatOptions, Formatter, NotANumber, OutOfRange }
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
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/textinfo (llvm, x86_64-unknown-linux-gnu, 371 symbols)
Silk: 4 bytes, 4 scalars
naïve: 6 bytes, 5 scalars
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

Read it against the code. `ï` takes two bytes, so the offsets jump from 2 to 4. `b"caf\xC3"` stops in the middle of `é`, and the error names byte 3. The decoder sees the same split bytes across two chunks and puts `é` back together.

## API reference

- `silk/string`: `String`, `InvalidUtf8`, `ScalarCursor`, `ScalarStep`
- `silk/char`: `fromU32`, `toU32`
- `silk/utf8_decoder`: `Utf8Decoder`, `Utf8Step`
- `silk/unicode`: `Unicode`
- `silk/format`: `Format`, `FormatOptions`, `Alignment`, `Display`, `Formatter`, `ParseError`
- `silk/writer`: `Writer`, `WriterError`
- `silk/os_writer`: `StdoutWriter`
- `silk/slice`: `Slice`
- `silk/bytes`: `Bytes`
