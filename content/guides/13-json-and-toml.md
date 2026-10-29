# JSON and TOML

This guide builds `stock`, a program that reads a TOML config and a JSON order, then writes a stock list as JSON and a summary as TOML. Along the way it uses the three ways the std lib offers to read structured text: a value tree you query, a token scanner you drive yourself, and typed codecs that turn text into Silk values and back.

## Three ways to read

| Approach | Module | Allocates | Use it when |
| --- | --- | --- | --- |
| Value tree | `silk/json/value` (`Json`), `silk/toml/value` (`Toml`) | yes | You want a few fields from a document that fits in memory |
| Token scanner | `silk/json/scanner` (`JsonScanner`), `silk/json/reader` (`JsonReader`) | no | You want to skim or validate without building anything |
| Typed codec | `silk/json/codec`, `silk/toml/codec` | depends on the type | You want a Silk value of a known type, or you want to write one |

TOML has the value tree and the codecs. JSON has all three, plus `JsonReflect` in `silk/json/reflect`, which writes any struct as a JSON object.

## Set up

```sh
silk init stock
cd stock
```

As in the other guides, the code blocks below, in order, make up the whole of `src/main.silk`. First the imports and the two input documents:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.json.codec { JsonCodec, Serialize }
import silk.json.output { JsonOptions }
import silk.json.reflect { JsonReflect }
import silk.json.scanner { JsonError, JsonReason, JsonScanner, JsonToken }
import silk.json.value { Json }
import silk.collections.list { List }
import silk.core.option { Option }
import silk.io.writer_native { StdoutWriter }
import silk.core.result { Result }
import silk.toml.codec { TomlCodec }
import silk.toml.output { TomlOutput }
import silk.toml.scanner { TomlError }
import silk.toml.value { Toml }
import silk.io.writer { Writer, WriterError }

fn configText() -> &'static [u8] {
  return b"title = \"Spring stock\"\nlimit = 3\n\n[owner]\nname = \"Julia\"\n"
}

fn orderText() -> &'static [u8] {
  return b"{\"id\": 1042, \"customer\": {\"name\": \"Ana\", \"city\": \"Porto\"}, \"lines\": [2, 5, 1]}"
}
```

The documents are byte string literals so the program runs anywhere. In a real program you would read them with `FileSystem.readFile`; the Files and directories guide shows how. Parsers take `&[u8]`, not `string`, because input from a file or socket is bytes until something checks it.

## Read a TOML config as a tree

```silk
effect fn readConfig() -> () ! TomlError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let config = run Toml.parse(configText())
  let title = Toml.field(&config, "title") |> Toml.asString |> Option<string>.unwrapOr("untitled")
  let owner = Toml.field(&config, "owner") |> Toml.fieldAt("name") |> Toml.asString |> Option<string>.unwrapOr("nobody")
  let limit = match Toml.field(&config, "limit") {
    Option.Some { value: field } => match move TomlCodec.decodeOne<i32>(field) {
      Result.Success { value } => value
      Result.Failure { error } => { fail move error }
    }
    Option.None => 10
  }
  run Format.format("config: {title} (owner {owner}, limit {limit})\n", &.{ title: title, owner: owner, limit: limit })
}
```

`Toml.parse` checks the whole document and builds an owned tree. It needs an `Allocator` and fails with `TomlError` (from `silk/toml/scanner`) on bad syntax.

Lookups return `Option` so they chain without checks at each step. `Toml.field(&config, "owner")` gives an `Option<&Value>`, `Toml.fieldAt("name")` looks inside it, and `Toml.asString` borrows the text. If any step misses, the result is `None` and `unwrapOr` supplies the default. The borrowed strings live as long as `config`.

`Toml.asString` is the only typed accessor on the tree. For numbers and booleans, hand the value to the codec: `TomlCodec.decodeOne<i32>(field)` returns `Result<i32, TomlError>`. TOML integers decode into `i32` or `i64`, floats into `f64`, and `true`/`false` into `bool`.

## Read a JSON document as a tree

```silk
effect fn readOrder() -> () ! JsonError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let order = run Json.parse(orderText())
  let id = Json.field(&order, "id") |> Json.asI64 |> Option<i64>.unwrapOr(0)
  let city = Json.field(&order, "customer") |> Json.fieldAt("city") |> Json.asString |> Option<string>.unwrapOr("?")
  run Format.format("order {id} ships to {city}\n", &.{ id: id, city: city })
}
```

The JSON tree works the same way and has more accessors: `asI32`, `asI64`, `asU64`, `asF64`, `asF32` and `asString`. Each returns `None` for a missing field, a value of the wrong kind, or a number that does not fit. Numbers keep their source spelling in the tree and are converted only when you ask, so a 20-digit id survives until you decide what type it is.

## Decode straight into a type

When you know the shape, skip the tree:

```silk
effect fn sumLines() -> () ! JsonError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let lines = run Json.deserialize<List<i32>>(b"[2, 5, 1]")
  let mut total = 0
  let mut index: usize = 0
  while index < lines.length() {
    total = total + lines.get(index)
    index = index + 1
  }
  run Format.format("{n} lines, {total} items\n", &.{ n: lines.length(), total: total })
}
```

`Json.deserialize<T>` decodes one complete document into any type with a `Deserialize` witness. The std lib provides witnesses for the integer and float types, `bool`, `String`, `Option<T>` and `List<T>`. For types that need no allocation there is also `Json.decode<T>`, which uses the `Decode` interface and has no `Allocator` requirement: `Json.decode<i32>(b"42")` returns `Result<i32, JsonError>`.

Your own structs get no decoder automatically. A `Deserialize` witness for a struct is written by hand: it pulls tokens from the `JsonScanner` it is given, matches keys, and decodes each field with `JsonCodec.deserializeOne<T>`. That is a page of code per type. For a few fields, the value tree above is usually simpler.

Reflection can do the matching for you when the fields are alike. `Reflect.fields<Owner>()` lists a struct's fields at compile time, `Reflect.fieldLabel` gives each name, and `Reflect.borrowFieldMut` lends one field of a value for writing. This generic function fills every `i32` field of a struct from the member of a JSON object that has the field's name, and leaves a field alone when the member is missing:

```silk
struct Stock {
  pub apples: i32,
  pub pears: i32,
  pub plums: i32,
}

// Fills every i32 field of `owner` from the member of `document` with the field's name.
fn fill<Owner>(owner: &mut Owner, document: &Value) -> () {
  static for field in Reflect.fields<Owner>() {
    let place = Reflect.borrowFieldMut<Owner, i32>(&mut owner.*, field)
    if let Option.Some { value } = Json.asI32(Json.field(document, Reflect.fieldLabel(field))) {
      place.* = value
    }
  }
}
```

With `import silk.core.reflect { Reflect }`, filling `Stock { apples: 0, pears: 0, plums: 0 }` from `{"apples": 4, "plums": 9}` gives `apples 4, pears 0, plums 9`. The `static for` runs at compile time, so each field becomes a plain field access with its name as a constant. A struct whose fields have different types needs a decode step per type, which is where a hand-written `Deserialize` witness comes back in. The reference page **Static control flow and reflection** lists the `Reflect` operations.

## Scan tokens without a tree

```silk
effect fn countNumbers() -> () ! JsonError | WriterError ? &mut Writer {
  let mut scanner = JsonScanner.make(orderText())
  let mut numbers = 0
  while true {
    let token = match move scanner.next() {
      Result.Success { value } => value
      Result.Failure { error } => { fail move error }
    }
    match token {
      JsonToken.Number { span } => { numbers = numbers + 1 }
      JsonToken.EndOfInput => { break }
      _ => {}
    }
  }
  run Format.format("the order holds {numbers} numbers\n", &.{ numbers: numbers })
}
```

`JsonScanner.make(bytes)` borrows a complete input and hands out one `JsonToken` per `next()` call: `ObjectBegin`, `String { span, escaped }`, `Number { span }`, `EndOfInput` and so on. It validates as it goes, allocates nothing, and has no `Allocator` or other requirement, so `countNumbers` needs only the `Writer` it prints to. A `span` is an offset and length into the input; `JsonScanner.slice` borrows its raw bytes.

When the document arrives in pieces, for example from a socket, use `JsonReader` from `silk/json/reader`. It reads tokens from a `BufferedInput` into scratch space you provide. The Byte streams and buffering guide covers `BufferedInput`.

## Handle a parse error

Every JSON failure is a `JsonError` from `silk/json/scanner` with a `reason` (a `JsonReason` such as `UnexpectedByte`, `MissingField` or `DepthExceeded`) and an `offset` into the input:

```silk
effect fn checkInput(text: &[u8]) -> () ! OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let outcome = run Effect.result(Json.parse(text))
  match move outcome {
    Result.Success { value } => run Writer.writeString("input is valid JSON\n")
    Result.Failure { error } => match move error {
      JsonError problem => {
        let at = move problem.offset |> Option<usize>.unwrapOr(0)
        match problem.reason {
          JsonReason.UnexpectedByte => run Format.format("unexpected byte at offset {at}\n", &.{ at: at })
          _ => run Format.format("invalid JSON at offset {at}\n", &.{ at: at })
        }
      }
      OutOfMemoryError problem => { fail move problem }
    }
  }
}
```

`Effect.result` turns the parse into a `Result` whose error is the union `JsonError | OutOfMemoryError`. The inner `match` takes the union apart by type. Here the trailing comma at offset 12 is the unexpected byte. See **Typed failures** in the reference for `Effect.result` and **Patterns and match** for matching a union by type.

Without the handler, a `JsonError` that escapes `main` ends the program with status 1 and a trace on standard error, starting `unhandled error: silk/json/scanner.JsonError`.

## Write JSON from a struct

```silk
struct Item {
  pub name: string<'static>,
  pub count: i32,
  pub tags: List<string<'static>>,
  note: string<'static>,
}

impl Serialize for Item {
  effect fn serialize(self: &Self, options: &JsonOptions) -> () ! JsonError | WriterError ? &mut Writer {
    return run JsonReflect.write<Item>(self, options)
  }
}

effect fn writeStock() -> () ! JsonError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let mut tags = List<string<'static>>.make()
  run tags.append("fragile")
  let mut stock = List<Item>.make()
  run stock.append(Item { name: "lamp", count: 3, tags: move tags, note: "internal" })
  run stock.append(Item { name: "rug", count: 1, tags: List<string<'static>>.make(), note: "" })

  run JsonCodec.writeOne(&stock, &JsonOptions.indented(2))
  run Writer.writeString("\n")
}
```

`JsonReflect.write<Item>` walks the struct's fields at compile time and writes them in declaration order. It only sees fields visible to `silk/json/reflect`, which means `pub` fields: `note` is private, so it never appears in the output. That is a handy way to keep internal state out of what you publish.

Calling `JsonReflect.write` from a one-line `Serialize` witness makes `Item` a full citizen of the codec. Now `List<Item>` is `Serialize` too, because the std lib's list witness writes any list whose element type is. `JsonCodec.writeOne(&stock, options)` picks the witness and writes the array.

`JsonOptions.compact()` writes everything on one line. `JsonOptions.indented(2)` indents nested containers by two spaces. All JSON and TOML output goes through the `Writer` service from `silk/io/writer`, so the same code can write to standard output, a file or a test buffer.

## Write TOML

```silk
effect fn writeSummary() -> () ! TomlError | WriterError ? &mut Writer {
  run TomlOutput.writeKey("title")
  run Writer.writeString(" = ")
  run TomlCodec.writeOne(&"Spring stock")
  run Writer.writeString("\n")
  run TomlOutput.writeKey("items in stock")
  run Writer.writeString(" = ")
  run TomlCodec.writeOne(&4)
  run Writer.writeString("\n")
}
```

There is no TOML reflection. You write each key with `TomlOutput.writeKey`, which quotes it only when it must, then the separator, then the value with `TomlCodec.writeOne`. To write a whole tree you parsed or built, use `TomlOutput.write(&document)`.

## Run it

```silk
pub effect fn main() -> () ! TomlError | JsonError | OutOfMemoryError | WriterError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut out = StdoutWriter.make()
  run readConfig()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run readOrder()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run sumLines()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run countNumbers() |> Effect.provideMut<Writer>(&mut out)
  run checkInput(b"{\"id\": 1042,}")
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run writeStock()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run writeSummary() |> Effect.provideMut<Writer>(&mut out)
}
```

`main` creates one allocator and one standard output `Writer` and lends them to each step. Steps that do not allocate, such as `countNumbers` and `writeSummary`, get only the `Writer`, because their signatures ask for nothing else.

```sh
silk run
```

```
config: Spring stock (owner Julia, limit 3)
order 1042 ships to Porto
3 lines, 8 items
the order holds 4 numbers
unexpected byte at offset 12
[
  {
    "name": "lamp",
    "count": 3,
    "tags": [
      "fragile"
    ]
  },
  {
    "name": "rug",
    "count": 1,
    "tags": []
  }
]
title = "Spring stock"
"items in stock" = 4
```

## Limits to know

- Both parsers are strict. `Json.parse` rejects trailing commas, comments and duplicate keys. `Toml.parse` rejects duplicate keys and redefined tables.
- JSON nesting is limited to 64 open arrays and objects (`MAX_DEPTH` in `silk/json/scanner`); deeper input fails with `DepthExceeded`.
- Writing can fail halfway if the `Writer` fails, leaving a partial document. Nothing is flushed for you.
- Floats that are infinite or NaN cannot be written and fail with `JsonError` before any bytes go out.

## API reference

- `silk/json/value`: `Json`, `Value`
- `silk/json/scanner`: `JsonScanner`, `JsonToken`, `JsonError`, `JsonReason`
- `silk/json/reader`: `JsonReader`
- `silk/json/codec`: `JsonCodec`, `Serialize`, `Decode`, `Deserialize`
- `silk/json/reflect`: `JsonReflect`
- `silk/core/reflect`: `Reflect` (`fields`, `fieldLabel`, `borrowFieldMut`)
- `silk/json/output`: `JsonOptions`, `JsonOutput`
- `silk/json/object`, `silk/json/array`: `JsonObject`, `JsonArray` (hand-written object and array writers)
- `silk/toml/value`: `Toml`, `Value`
- `silk/toml/scanner`: `TomlError`
- `silk/toml/codec`: `TomlCodec`, `Serialize`, `Decode`, `Deserialize`
- `silk/toml/output`: `TomlOutput`
- `silk/io/writer`: `Writer`; `silk/io/writer_native`: `StdoutWriter`; `silk/mem/allocator`: `Allocator`
