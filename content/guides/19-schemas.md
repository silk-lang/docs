# Schemas

This guide builds `gateway`, a program that reads the config of a small HTTP gateway from JSON, checks it, writes it back, explains every mistake in a broken copy, accepts commands by name, and describes its own config as a JSON Schema. All of it comes from one library, `silk.schema`, and from types you declare.

The idea behind the library is that you declare a type once and everything else is derived from it. A struct becomes a JSON object with the struct's fields, a union of plain names becomes a string, and a union whose variants carry data becomes an object tagged with the variant's name. Reading, writing, error messages, and JSON Schema all come from the same declaration, so they cannot drift apart. Where the declaration does not say enough, a `Spec` adds wire names, rules and defaults, still in one place next to the type.

## What the library gives you

| You want to | Call | Fails with |
| --- | --- | --- |
| Read a value, stop at the first problem | `SchemaJson.decode<T>(bytes)` | `SchemaError` |
| Read a value, collect every problem | `SchemaJson.decodeAll<T>(bytes)` | `SchemaErrors` |
| Read one variant of a union whose name arrives apart | `SchemaJson.decodeVariant<U>(name, bytes)` | `SchemaErrors` |
| Write a value as compact JSON | `SchemaJson.encode<T>(&value)` | `SchemaError`, `WriterError` |
| Show problems to a person or a tool | `SchemaReport.write`, `SchemaReport.writeOne` | `WriterError` |
| Describe a type as JSON Schema | `Schemas.shape<T>()`, then `JsonSchemas.write` | `JsonSchemaError` |

Every call that builds values or text needs an `Allocator`, and every call that writes needs a `Writer`, both as services.

## Set up

```sh
silk init gateway
cd gateway
```

The code blocks below, in order, make up the whole of `src/main.silk`. First the imports:

```silk
import silk.collections.list { List }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.schema.codec { Between, Chain4, Codec, Codecs, NumberText, Refine, Trim }
import silk.schema.issue { Issue, IssueReason, SchemaError, SchemaErrors, ValueKind }
import silk.schema.json { SchemaJson }
import silk.schema.json_schema {
  JsonSchemaDialect,
  JsonSchemaError,
  JsonSchemaOptions,
  JsonSchemas
}
import silk.schema.report { ReportOptions, SchemaReport }
import silk.schema.schema { Checks, Schema, SchemaReader, SchemaWriter, Schemas, Spec }
import silk.schema.shape { Constraint, Literal, Shape, ShapeOf, Shapes, VariantShape }
import silk.text.format { Format }
import silk.text.string { String }
```

`silk/schema/schema` holds the `Schema` interface and `Spec`, `silk/schema/json` the JSON entry points, `silk/schema/issue` the error types, and `silk/schema/report` the report writer. The others come in later sections.

## Declare the types

```silk
/// How a client signs in.
union Auth {
  /// No credentials.
  Anonymous,
  /// A bearer token.
  Token {
    /// The token text.
    pub value: String,
  },
  /// A user name and an optional password.
  Basic {
    /// The user name.
    pub user: String,
    /// The password, if the user has one.
    pub password: Option<String>,
  },
}

impl Schema for Auth {}

/// How much the gateway logs.
union Level {
  Quiet,
  Info,
  Debug
}

impl Schema for Level {}

/// A server the gateway forwards requests to.
struct Upstream {
  /// The host name or address.
  pub host: String,
  /// The port it listens on.
  pub port: u16,
}

impl Schema for Upstream {
  static fn spec() -> Spec<Upstream> {
    return Spec<Upstream>.of() |> Spec<Upstream>.between("port", 1, 65535)
  }
}
```

`impl Schema for Auth {}` is all a type needs. The empty body takes the default for every operation, and the defaults are derived from the declaration while the program compiles:

- A struct reads from and writes to an object, one member per field, under the field's name.
- A union whose variants are all plain names, such as `Level`, is the variant's name as a string: `"Info"`.
- A union whose variants carry fields, such as `Auth`, is an object that holds the variant's name under `type`, next to the variant's own fields: `{"type": "Token", "value": "s3cret"}`. A variant with no fields, such as `Anonymous`, is just `{"type": "Anonymous"}`.

Every field must be public and its type must implement `Schema`. The std lib implements it for `bool`, every integer type from `u8` to `u64` and `i8` to `i64` plus `usize`, `f64`, `String`, `Option<T>` and `List<T>`. Integers are range-checked as they are read, so a `u16` field rejects `70000` with "expected an integer from 0 to 65535".

`Upstream` also overrides `spec`, the static function that says what the declaration cannot. Here it adds one rule: the port is from 1 to 65535, which rules out the `0` a `u16` would accept.

Doc comments are not decoration. They become the `description` of each property in the JSON Schema near the end of this guide, so write them for whoever fills in the config.

## Rename fields and add rules

```silk
/// The config of one gateway.
struct Gateway {
  /// The name the gateway logs under.
  pub name: String,
  /// The port to listen on.
  pub listen: u16,
  pub level: Level,
  /// Seconds an idle connection stays open.
  pub idleSeconds: u32,
  pub upstreams: List<Upstream>,
  pub auth: Auth,
  /// Text sent to every new client.
  pub banner: Option<String>,
}

impl Schema for Gateway {
  static fn spec() -> Spec<Gateway> {
    return Spec<Gateway>.of()
      |> Spec<Gateway>.rename("idleSeconds", "idle_seconds")
      |> Spec<Gateway>.strict()
      |> Spec<Gateway>.length("name", 1, 32)
      |> Spec<Gateway>.pattern("name", "^[a-z][a-z0-9-]*$")
      |> Spec<Gateway>.expected("name", "a lowercase name such as \"edge-1\"")
      |> Spec<Gateway>.between("listen", 1, 65535)
      |> Spec<Gateway>.default("level", Literal.Text { value: "Info" })
      |> Spec<Gateway>.between("idleSeconds", 1, 3600)
      |> Spec<Gateway>.default("idleSeconds", Literal.Integer { value: 30 })
      |> Spec<Gateway>.items("upstreams", 1, 8)
  }

  fn check(self: &Self, checks: &mut Checks<Gateway>) -> () {
    let upstreams = List<Upstream>.asSlice(&self.upstreams)
    let mut at: usize = 0
    while at < upstreams.length {
      checks.that(
        upstreams[at].port != self.listen || upstreams[at].host.view() != "localhost",
        "no upstream on localhost at the gateway's own port",
      )
      at = at + 1
    }
  }
}
```

A spec is built with pipes, starting from `Spec<Gateway>.of()`, which renames nothing and adds no rules. Each step returns a new spec:

| Step | Effect |
| --- | --- |
| `rename(field, wire)` | The field is called `wire` in JSON. Here the Silk field `idleSeconds` is `idle_seconds` on the wire. |
| `strict()` | A key that no field names is an error. Without it, unknown keys are skipped, so a config written for a newer version still reads. |
| `between(field, min, max)`, `atLeast(field, min)`, `atMost(field, max)` | A number is in range, both ends included. |
| `length(field, min, max)` | Text has `min` to `max` characters. |
| `pattern(field, regex)` | Text matches a regular expression, anywhere unless it is anchored with `^` and `$`. |
| `items(field, min, max)` | A list has `min` to `max` elements. |
| `expected(field, text)` | When a rule on the field fails, the message says `text` instead of the text generated from the rule. |
| `default(field, literal)` | The field may be absent or null, and then holds this value. |
| `tag(name)` | For a union with fields: the variant's name goes under `name` instead of `type`. |

Field names are checked while the program compiles, so a typo is an error, not a rule that never runs. Writing `"lisen"` instead of `"listen"` stops the build with `error[SEM0022] main.Gateway has no field lisen`, pointing at the string. A pattern is checked too: `"^[a-z"` is `error[SEM0177] invalid regex: unexpected end`, at the pattern.

A rule runs after the field's value is read. A number rule fits integer fields, `length` and `pattern` fit `String`, and `items` fits `List`. On an `Option` field, the rule applies to the value inside when there is one. A rule on a field it cannot fit is a compile error at the field name: `between("name", 1, 32)` stops the build with ``error[SEM0177] this rule needs a field that holds a number, but `name` holds text``.

A default is a `Literal` from `silk/schema/shape`: `Literal.Integer`, `Literal.Number`, `Literal.Boolean` or `Literal.Text`. It is read as if the input held it, so `Literal.Text { value: "Info" }` fills the union `Level` exactly as the JSON text `"Info"` would. A field with a default no longer has to be present. An `Option` field, such as `banner`, never has to be present: a missing key or `null` reads as `None`.

`check` is the hook for a rule that no single field can state. The next sections come back to it.

## Read a config

```silk
const CONFIG: &[u8] = b"{\n  \"name\": \"edge-1\",\n  \"listen\": 8080,\n  \"upstreams\": [\n    {\"host\": \"10.0.0.5\", \"port\": 9000},\n    {\"host\": \"10.0.0.6\", \"port\": 9000}\n  ],\n  \"auth\": {\"type\": \"Token\", \"value\": \"s3cret\"}\n}\n"

effect fn readConfig() -> ()
  ! SchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  let gateway = run SchemaJson.decode<Gateway>(CONFIG)
  let count = List<Upstream>.length(&gateway.upstreams)
  run Format.format(
    "{} listens on {} with {} upstreams, idle {}s\n",
    &(gateway.name.view(), gateway.listen, count, gateway.idleSeconds),
  )
  let first = &List<Upstream>.asSlice(&gateway.upstreams)[0]
  run Format.format("first upstream: {}:{}\n", &(first.host.view(), first.port))
  match &gateway.auth {
    Auth.Token { value } => run Format.format(
      "auth: token of {} bytes\n",
      &.(String.byteLength(value.view())),
    )
    _ => run Format.format("auth: other\n", &())
  }
}
```

`CONFIG` is a byte string so the program runs anywhere; a real gateway would read it with `FileSystem.readFile`, which the Files and directories guide covers. Laid out, it is:

```json
{
  "name": "edge-1",
  "listen": 8080,
  "upstreams": [
    {"host": "10.0.0.5", "port": 9000},
    {"host": "10.0.0.6", "port": 9000}
  ],
  "auth": {"type": "Token", "value": "s3cret"}
}
```

`SchemaJson.decode<Gateway>` reads the whole input as one `Gateway`, runs every rule and check, and returns the value. It fails with a `SchemaError` at the first problem. Keys can come in any order, and `level` and `idle_seconds` are missing, so their defaults fill them in. This step prints:

```
edge-1 listens on 8080 with 2 upstreams, idle 30s
first upstream: 10.0.0.5:9000
auth: token of 6 bytes
```

## Write it back

```silk
effect fn writeConfig() -> ()
  ! SchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  let gateway = run SchemaJson.decode<Gateway>(CONFIG)
  run SchemaJson.encode<Gateway>(&gateway)
  run Writer.writeString("\n")
}
```

`SchemaJson.encode<T>` writes compact JSON to the ambient `Writer`. Members come in declaration order with their wire names, defaults that were filled in are written like any other value, and an `Option` field holding `None` is left out:

```
{"name":"edge-1","listen":8080,"level":"Info","idle_seconds":30,"upstreams":[{"host":"10.0.0.5","port":9000},{"host":"10.0.0.6","port":9000}],"auth":{"type":"Token","value":"s3cret"}}
```

Writing does not run rules or checks; they guard what comes in. Encoding fails with a `SchemaError` only when JSON cannot hold a value, such as a NaN in an `f64` field.

## When reading fails

Here is a config with six mistakes:

```json
{
  "name": "Edge 1",
  "listen": 0,
  "idle_seconds": 7200,
  "upstreams": [],
  "auth": {"type": "Bearer"},
  "bannr": "hello"
}
```

```silk
const BROKEN: &[u8] = b"{\n  \"name\": \"Edge 1\",\n  \"listen\": 0,\n  \"idle_seconds\": 7200,\n  \"upstreams\": [],\n  \"auth\": {\"type\": \"Bearer\"},\n  \"bannr\": \"hello\"\n}\n"

effect fn firstProblem() -> ()
  ! OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  match move run Effect.result(SchemaJson.decode<Gateway>(BROKEN)) {
    Result.Success { .. } => run Writer.writeString("read the config\n")
    Result.Failure { error } => match move error {
      SchemaError problem => {
        let path = run problem.path.text()
        let pointer = run problem.path.pointer()
        run Format.format(
          "{} at \"{}\" ({}): expected {}, found {}\n",
          &(
            IssueReason.name(problem.issue.reason),
            path.view(),
            pointer.view(),
            problem.issue.expected,
            ValueKind.noun(problem.issue.found)
          ),
        )
        run SchemaReport.writeOne(&problem, BROKEN, "gateway.json", ReportOptions.snippet())
      }
      OutOfMemoryError {} => {
        fail OutOfMemoryError {}
      }
    }
  }
}
```

`Effect.result` turns the read into a `Result`, and matching the error by type separates a `SchemaError` from running out of memory. A `SchemaError` has two parts. `issue` says what went wrong:

| Field | Holds |
| --- | --- |
| `reason` | An `IssueReason`: `InvalidType`, `InvalidValue`, `MissingKey`, `UnexpectedKey`, `InvalidSyntax`, `CheckFailed`, `UnknownVariant` or `Reported`. `IssueReason.name` gives its name as text. |
| `expected` | One line saying what the schema wanted, such as `an integer from 1 to 65535`. |
| `found` | A `ValueKind`: the kind of value the input held. `ValueKind.noun` gives a word for a person, such as `text` or `a number`. |
| `span` | An `Option<Span>`: the bytes of the input the problem is about, `start` up to but not including `end`. |

A third field, `got`, holds the value found when it is not in the input bytes, such as a command name passed apart from its arguments; otherwise it is `None`.

`path` says where. It is a `SchemaPath` that keeps its steps, so it renders three ways: `text()` with wire names, as a person writes it (`auth.type`, `upstreams[1].port`); `pointer()` as a JSON Pointer into the input (`/auth/type`); and `names()` with the Silk field names (`idleSeconds` rather than `idle_seconds`). The root value has an empty path. To compare without allocating, `matchesText("auth.type")` checks the path against text.

`SchemaReport.writeOne` writes the problem as a snippet of the input with a caret under the bytes, the way the compiler shows its own errors. It needs the input the error came from and a name for it. `decode` stops at the first problem, which is the name:

```
CheckFailed at "name" (/name): expected a lowercase name such as "edge-1", found text
 --> gateway.json:2:11 at name
  |
2 |   "name": "Edge 1",
  |           ^^^^^^^^ expected a lowercase name such as "edge-1", got "Edge 1"
```

## Every problem at once

Stopping at the first problem is right for a program that only needs to know whether the input is good. A person fixing a config file wants the whole list.

```silk
effect fn everyProblem() -> ()
  ! OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  match move run Effect.result(SchemaJson.decodeAll<Gateway>(BROKEN)) {
    Result.Success { .. } => run Writer.writeString("read the config\n")
    Result.Failure { error } => match move error {
      SchemaErrors problems => {
        run SchemaReport.write(&problems, BROKEN, "gateway.json", ReportOptions.snippet())
        run SchemaReport.write(&problems, BROKEN, "gateway.json", ReportOptions.line().redacted())
        run SchemaReport.write(&problems, BROKEN, "gateway.json", ReportOptions.json())
      }
      OutOfMemoryError {} => {
        fail OutOfMemoryError {}
      }
    }
  }
}
```

`SchemaJson.decodeAll<T>` reads the same way, but a part that fails is recorded and skipped, and reading goes on with the next one. It fails with `SchemaErrors`, whose `errors` is a `List<SchemaError>` in input order and whose `dropped` counts problems past the first 64 (`MAX_PROBLEMS` in `silk/schema/issue`). Wrong types, missing keys, unknown keys, unknown variants and broken rules are all collected in one pass. Text that is not valid JSON is the one exception: there is nothing sensible to skip to, so it is the only problem reported.

`SchemaReport.write` writes them all, in one of three styles from `ReportOptions`:

- `ReportOptions.snippet()` for a terminal. A long line is cut to about 80 characters around the problem.
- `ReportOptions.line()` for logs and for editors' problem matchers: `file:line:column: path: message`. Lines and columns start at 1, and columns count characters.
- `ReportOptions.json()` for tools, and for sending the problems back to a model that wrote the input. Paths are JSON Pointers.

Any of them can be `.redacted()`, which writes only the kind of each value it found, never the value itself, for input that may hold secrets. The step prints the snippets, the redacted lines, and the JSON:

```
 --> gateway.json:2:11 at name
  |
2 |   "name": "Edge 1",
  |           ^^^^^^^^ expected a lowercase name such as "edge-1", got "Edge 1"
 --> gateway.json:3:13 at listen
  |
3 |   "listen": 0,
  |             ^ expected an integer from 1 to 65535, got 0
 --> gateway.json:4:19 at idle_seconds
  |
4 |   "idle_seconds": 7200,
  |                   ^^^^ expected an integer from 1 to 3600, got 7200
 --> gateway.json:5:16 at upstreams
  |
5 |   "upstreams": [],
  |                ^^ expected a list of 1 to 8 elements, got []
 --> gateway.json:6:20 at auth.type
  |
6 |   "auth": {"type": "Bearer"},
  |                    ^^^^^^^^ expected one of "Anonymous", "Token", "Basic", got "Bearer"
 --> gateway.json:7:3
  |
7 |   "bannr": "hello"
  |   ^^^^^^^ expected one of "name", "listen", "level", "idle_seconds", "upstreams", "auth", "banner", got "bannr"
gateway.json:2:11: name: expected a lowercase name such as "edge-1", got text
gateway.json:3:13: listen: expected an integer from 1 to 65535, got a number
gateway.json:4:19: idle_seconds: expected an integer from 1 to 3600, got a number
gateway.json:5:16: upstreams: expected a list of 1 to 8 elements, got a list
gateway.json:6:20: auth.type: expected one of "Anonymous", "Token", "Basic", got text
gateway.json:7:3: expected one of "name", "listen", "level", "idle_seconds", "upstreams", "auth", "banner", got text
```

The JSON report is one line; its first two problems, indented, are:

```json
{
  "problems": [
    {
      "path": "/name",
      "reason": "CheckFailed",
      "expected": "a lowercase name such as \"edge-1\"",
      "found": "text",
      "value": "\"Edge 1\"",
      "line": 2,
      "column": 11,
      "start": 12,
      "end": 20
    },
    {
      "path": "/listen",
      "reason": "CheckFailed",
      "expected": "an integer from 1 to 65535",
      "found": "a number",
      "value": "0",
      "line": 3,
      "column": 13,
      "start": 34,
      "end": 35
    }
  ],
  "dropped": 0
}
```

A quoted value is cut to at most 40 bytes (`MAX_QUOTED` in `silk/schema/report`). An unknown key is reported at the object that holds it, so its path is the object's: empty here, because it is the root.

## Rules about the whole value

`Gateway` also has a `check` function. It runs after every field is read and its rules pass, and it sees the whole value:

```silk
fn check(self: &Self, checks: &mut Checks<Gateway>) -> () {
  let upstreams = List<Upstream>.asSlice(&self.upstreams)
  let mut at: usize = 0
  while at < upstreams.length {
    checks.that(
      upstreams[at].port != self.listen || upstreams[at].host.view() != "localhost",
      "no upstream on localhost at the gateway's own port",
    )
    at = at + 1
  }
}
```

`checks.that(holds, expected)` records a failure when `holds` is false. Each failure becomes a `CheckFailed` problem at the value's own path, with `expected` as its message. Use it for rules that relate fields to each other, such as two fields that exclude each other or a list whose entries must not repeat. A rule about one field belongs in the spec instead, where JSON Schema can show it.

This block adds a small helper that reads any `Schema` type with `decodeAll` and writes the problems one per line, and a config whose only upstream is the gateway itself:

```silk
effect fn report<T: Schema>(input: &[u8], source: string) -> ()
  ! OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  match move run Effect.result(SchemaJson.decodeAll<T>(input)) {
    Result.Success { .. } => run Writer.writeString("read it\n")
    Result.Failure { error } => match move error {
      SchemaErrors problems => run SchemaReport.write(
        &problems,
        input,
        source,
        ReportOptions.line(),
      )
      OutOfMemoryError {} => {
        fail OutOfMemoryError {}
      }
    }
  }
}

const LOOPBACK: &[u8] = b"{\"name\": \"dev\", \"listen\": 9000, \"upstreams\": [{\"host\": \"localhost\", \"port\": 9000}], \"auth\": {\"type\": \"Anonymous\"}}"

effect fn wholeValue() -> ()
  ! OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  run report<Gateway>(LOOPBACK, "dev.json")
}
```

```
dev.json:1:1: expected no upstream on localhost at the gateway's own port, got {"name": "dev", "listen": 9000, "upstrea...
```

The problem is about the whole object, so it points at the object's first byte and quotes the start of it.

## A type with its own wire form

Sometimes the JSON form of a value is not its fields. A retry delay is nicer to write as `"30s"` than as `{"seconds": 30}`. A *codec* converts between a value and its wire form, and a type whose wire form is another type implements `Schema` by hand, through a codec:

```silk
/// A number of seconds, written as text such as `"30s"`.
struct Delay {
  pub seconds: u32,
}

// Removes the `s` at the end of the text, and puts it back when encoding.
struct Suffix {}

impl Codec<String, String> for Suffix {
  effect fn decode(self: &Self, input: String) -> String
    ! Issue | OutOfMemoryError
    ? &mut Allocator {
    let text = input.view()
    if !String.endsWith(text, "s") {
      fail Issue.invalidValue("seconds such as \"30s\"")
    }
    return run String.copy(String.slice(text, 0, String.byteLength(text) - 1))
  }

  effect fn encode(self: &Self, value: &String) -> String
    ! OutOfMemoryError
    ? &mut Allocator {
    let mut text = run String.copy(value.view())
    run text.append("s")
    return move text
  }

  effect fn hints(
    self: &Self,
    constraints: &mut List<Constraint>,
    notes: &mut List<string<'static>>,
    onWire: bool,
  ) -> ()
    ! OutOfMemoryError
    ? &mut Allocator {
    return run List<string<'static>>.append(&mut notes.*, "seconds such as \"30s\"")
  }
}

// Wraps the checked number in a `Delay`.
struct DelayOf {}

impl Codec<Delay, u32> for DelayOf {
  effect fn decode(self: &Self, input: u32) -> Delay
    ! Issue | OutOfMemoryError
    ? &mut Allocator {
    return Delay { seconds: input }
  }

  effect fn encode(self: &Self, value: &Delay) -> u32
    ! OutOfMemoryError
    ? &mut Allocator {
    return value.seconds
  }
}

// " 30s " -> "30s" -> "30" -> 30, checked -> Delay
fn delayText() -> Chain4<
  Trim,
  Suffix,
  Refine<NumberText<u32>, Between<u32>, u32, String>,
  DelayOf,
  Delay,
  String,
  String,
  u32,
  String
> {
  return Codecs.chain4(
    Trim {},
    Suffix {},
    Codecs.check(
      NumberText<u32>.make(),
      Between<u32> { low: 1, high: 3600, message: "from 1 to 3600 seconds" },
    ),
    DelayOf {},
  )
}

impl Schema for Delay {
  effect fn read<R: SchemaReader>(reader: &mut R) -> Delay
    ! Issue | OutOfMemoryError
    ? &mut Allocator {
    return run Schemas.readVia<Delay, String>(&delayText(), &mut reader.*)
  }

  effect fn write<W: SchemaWriter>(self: &Self, writer: &mut W) -> ()
    ! Issue | WriterError | OutOfMemoryError
    ? &mut Writer | &mut Allocator {
    return run Schemas.writeVia<Delay, String>(&delayText(), self, &mut writer.*)
  }

  effect fn shape(shapes: &mut Shapes) -> ShapeOf<Delay>
    ! OutOfMemoryError
    ? &mut Allocator {
    return run Schemas.shapeVia<Delay, String>(&delayText(), &mut shapes.*)
  }
}
```

A codec implements `Codec<A, I>` from `silk/schema/codec`: `decode` turns the wire value `I` into an `A` or fails with an `Issue`, and `encode` turns an `A` back into an `I`. `decode` takes its input by value, so owned text moves through a chain without being copied at each step.

Codecs are small steps, and `Codecs.chain2` up to `Codecs.chain6` run several in a row. `delayText` chains four:

1. `Trim`, from the std lib, removes white space at both ends.
2. `Suffix`, written here, removes the final `s`, or fails with `Issue.invalidValue` when there is none.
3. `NumberText<u32>`, from the std lib, turns decimal text into a `u32`. `Codecs.check` attaches the `Between<u32>` check, which fails with its message when the number is out of range. The std lib also has the checks `Length` for text and `Items<T>` for lists, and a `Check<T>` of your own needs only `test` and `message`.
4. `DelayOf` wraps the number in a `Delay`.

Decoding runs the steps from first to last, and encoding runs them from last to first, so `encode` of `Delay { seconds: 15 }` gives `"15s"`. The type of a chain lists each step, then the value type, then each type between two steps, then the wire type. It is long to write, but it is only written once, in the return type of the function that builds it.

`impl Schema for Delay` then overrides three operations, each with one call: `Schemas.readVia` reads the wire `String` and decodes it, `Schemas.writeVia` encodes and writes, and `Schemas.shapeVia` describes the wire form for JSON Schema. A codec's issue points at the wire value in the input, like any other problem.

`hints` is optional. It reports what a step accepts, for JSON Schema and help text: a rule about the wire value itself goes in `constraints` when `onWire` is true, and anything else goes in `notes` as text. Only the first step of a chain reads the wire value, so the others are asked with `onWire` false. `Suffix` adds a note.

Once `Delay` implements `Schema`, it is a field type like any other:

```silk
/// How the gateway retries a failed upstream.
struct Retry {
  /// How long to wait before the next attempt.
  pub after: Delay,
  /// How many attempts to make.
  pub attempts: u8,
}

impl Schema for Retry {}

effect fn readRetry() -> ()
  ! SchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  let retry = run SchemaJson.decode<Retry>(b"{\"after\": \" 15s \", \"attempts\": 3}")
  run Format.format("retry {} times, {} seconds apart\n", &(retry.attempts, retry.after.seconds))
  run SchemaJson.encode<Retry>(&retry)
  run Writer.writeString("\n")
  run report<Retry>(b"{\"after\": \"2h\", \"attempts\": 3}", "retry.json")
  run report<Retry>(b"{\"after\": \"7200s\", \"attempts\": 3}", "retry.json")
}
```

```
retry 3 times, 15 seconds apart
{"after":"15s","attempts":3}
retry.json:1:11: after: expected seconds such as "30s", got "2h"
retry.json:1:11: after: expected from 1 to 3600 seconds, got "7200s"
```

## Commands and tool calls

A union whose variants are the things a program can do is a natural way to accept commands. When the command arrives as a whole object, `decode` reads it with its `type` tag. Often the name arrives apart from its arguments, as in a tool call from a language model, where the model names a tool and sends its arguments as a JSON object.

```silk
/// A command an operator, or a model, sends to a running gateway.
union Command {
  /// Reads the config file again.
  Reload,
  /// Stops sending new requests to an upstream.
  Drain {
    /// The upstream's host.
    pub host: String,
    /// How long to let open requests finish.
    pub seconds: u32,
  },
  /// Changes how much the gateway logs.
  SetLevel {
    /// The new level.
    pub level: Level,
  },
}

impl Schema for Command {}

effect fn runCommand(name: string, arguments: &[u8]) -> ()
  ! OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  match move run Effect.result(SchemaJson.decodeVariant<Command>(name, arguments)) {
    Result.Success { value } => match &value {
      Command.Reload => run Writer.writeString("reloading\n")
      Command.Drain { host, seconds } => run Format.format(
        "draining {} for {}s\n",
        &(host.view(), seconds),
      )
      Command.SetLevel { .. } => run Writer.writeString("changing the level\n")
    }
    Result.Failure { error } => match move error {
      SchemaErrors problems => run SchemaReport.write(
        &problems,
        arguments,
        name,
        ReportOptions.line(),
      )
      OutOfMemoryError {} => {
        fail OutOfMemoryError {}
      }
    }
  }
}
```

`SchemaJson.decodeVariant<Command>(name, arguments)` finds the variant whose wire name is `name` and reads its fields from `arguments`, with no tag. It reports every problem, as `decodeAll` does, and a name no variant has is an `UnknownVariant` problem. A missing argument says what it should have held: the field's `expected` text if it has one, else its first rule's text, else its type's, such as `an integer`. The step runs three commands: a good one, one with a missing and a mistyped argument, and one that does not exist:

```
draining 10.0.0.5 for 20s
Drain:1:1: Drain.seconds: expected an integer, got nothing
Drain:1:10: Drain.host: expected text, got 5
Restart: expected one of "Reload", "Drain", "SetLevel", got "Restart"
```

## Describe the config as JSON Schema

The rules a decoder enforces are also what an editor, a validator or a model needs to know about the input. `Schemas.shape<T>()` collects the wire form of `T` and every type it uses, and `JsonSchemas.write` from `silk/schema/json_schema` writes it as a JSON Schema to the ambient `Writer`:

```silk
effect fn describe() -> ()
  ! JsonSchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  let shapes = run Schemas.shape<Gateway>()
  let exact = run JsonSchemas.write(&shapes, JsonSchemaOptions.of(JsonSchemaDialect.Standard))
  run Format.format("exact: {}\n", &.(exact))
  let strict = run JsonSchemas.write(
    &shapes,
    JsonSchemaOptions.of(JsonSchemaDialect.AnthropicStrict),
  )
  run Format.format("exact: {}\n", &.(strict))
  let retry = run Schemas.shape<Retry>()
  let delays = run JsonSchemas.write(&retry, JsonSchemaOptions.of(JsonSchemaDialect.Standard))
  run Format.format("exact: {}\n", &.(delays))
}
```

The schema is JSON Schema draft 2020-12. Doc comments become `description`, `Spec` rules become keywords such as `minimum`, `maxLength`, `pattern` and `minItems`, `strict` becomes `additionalProperties: false`, and defaults become `default` and leave the `required` list. Named types that the root uses are entries in `$defs`, referred to with `$ref`, so recursive types work. The program writes each schema on one line; part of the first one, indented, is:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 32,
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "The name the gateway logs under.\nExpected a lowercase name such as \"edge-1\"."
    },
    "listen": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "description": "The port to listen on."
    },
    "level": {
      "$ref": "#/$defs/Level",
      "default": "Info"
    },
    "idle_seconds": {
      "type": "integer",
      "minimum": 1,
      "maximum": 3600,
      "description": "Seconds an idle connection stays open.",
      "default": 30
    },
    "banner": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Text sent to every new client."
    }
  },
  "required": [
    "name",
    "listen",
    "upstreams",
    "auth"
  ],
  "additionalProperties": false,
  "description": "The config of one gateway.",
  "$defs": {
    "Level": {
      "type": "string",
      "enum": [
        "Quiet",
        "Info",
        "Debug"
      ],
      "description": "How much the gateway logs."
    }
  }
}
```

`write` returns whether the schema is *exact*: whether every rule became a keyword. The first one is, and the program prints `exact: true`.

A `JsonSchemaDialect` picks the subset of JSON Schema to write for where the schema goes:

| Dialect | For | Differences |
| --- | --- | --- |
| `Standard` | Validators, editors, MCP tools | Everything above, with `$schema`. |
| `OpenAiStrict` | OpenAI structured outputs and strict function calling | The root must be an object, every property is required and one that may be absent is nullable instead, every object has `additionalProperties: false`, and there is no `const`, `oneOf`, `minLength`, `maxLength` or `default`. |
| `AnthropicStrict` | Anthropic strict tool use and structured outputs | Every object has `additionalProperties: false`, and there are no numeric, length or count keywords and no `default`. A recursive type is an error. |
| `Gemini` | Gemini response and function parameter schemas | No `const`, `oneOf`, `pattern`, length keywords or `default`. |

A rule the dialect has no keyword for moves into `description` as text, and the schema is then approximate: it accepts at least everything the decoder accepts, never less, and the program prints `exact: false`. In the `AnthropicStrict` schema of the same config, the ranges and counts are text:

```json
{
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "The name the gateway logs under.\nExpected a lowercase name such as \"edge-1\"."
    },
    "listen": {
      "type": "integer",
      "description": "The port to listen on.\nExpected an integer from 1 to 65535."
    },
    "idle_seconds": {
      "type": "integer",
      "description": "Seconds an idle connection stays open.\nExpected an integer from 1 to 3600.\nDefault: 30."
    },
    "upstreams": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Upstream"
      },
      "description": "Expected a list of 1 to 8 elements."
    }
  }
}
```

A codec's rules are text too, because JSON Schema cannot follow a value through a conversion. `Retry`'s schema says what `after` must look like in words, from the codec's notes and its check's message, and it is approximate:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "after": {
      "type": "string",
      "description": "How long to wait before the next attempt.\nExpected seconds such as \"30s\".\nExpected a decimal integer.\nExpected from 1 to 3600 seconds."
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 255,
      "description": "How many attempts to make."
    }
  },
  "required": [
    "after",
    "attempts"
  ],
  "description": "How the gateway retries a failed upstream."
}
```

`write` fails with `JsonSchemaError` when a dialect cannot describe the type at all: `JsonSchemaProblem.RootNotObject` when a strict dialect is given a root that is not a struct, and `JsonSchemaProblem.Recursive` when `AnthropicStrict` is given a type that contains itself.

## One schema per command

To offer the commands as tools, each needs the schema of its arguments. The shape of a union with fields is a `Shape.Tagged` node whose `variants` list each variant's wire name, doc comment and fields, and `JsonSchemas.writeVariant` writes the schema of one variant's fields, without the tag:

```silk
effect fn tools() -> ()
  ! JsonSchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  let shapes = run Schemas.shape<Command>()
  if let Shape.Tagged { variants, .. } = &shapes.get(shapes.root()).* {
    let all = List<VariantShape>.asSlice(&variants)
    let mut at: usize = 0
    while at < all.length {
      run Format.format("{}: {}\n  ", &(all[at].wire, all[at].doc))
      drop run JsonSchemas.writeVariant(
        &shapes,
        &all[at],
        JsonSchemaOptions.of(JsonSchemaDialect.Standard),
      )
      at = at + 1
    }
  }
}
```

```
Reload: Reads the config file again.
  {"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{},"description":"Reads the config file again."}
Drain: Stops sending new requests to an upstream.
  {"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"host":{"type":"string","description":"The upstream's host."},"seconds":{"type":"integer","minimum":0,"maximum":4294967295,"description":"How long to let open requests finish."}},"required":["host","seconds"],"description":"Stops sending new requests to an upstream."}
SetLevel: Changes how much the gateway logs.
  {"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"level":{"$ref":"#/$defs/Level","description":"The new level."}},"required":["level"],"description":"Changes how much the gateway logs.","$defs":{"Level":{"type":"string","enum":["Quiet","Info","Debug"],"description":"How much the gateway logs."}}}
```

That is the whole loop for a tool: `writeVariant` tells the model what arguments a tool takes, `decodeVariant` reads the call it makes, and a JSON report of the problems tells it what to fix. The `Drain` schema, indented:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "host": {
      "type": "string",
      "description": "The upstream's host."
    },
    "seconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4294967295,
      "description": "How long to let open requests finish."
    }
  },
  "required": [
    "host",
    "seconds"
  ],
  "description": "Stops sending new requests to an upstream."
}
```

## Run it

```silk
effect fn steps() -> ()
  ! SchemaError | JsonSchemaError | OutOfMemoryError | WriterError
  ? &mut Allocator | &mut Writer {
  run readConfig()
  run writeConfig()
  run firstProblem()
  run everyProblem()
  run wholeValue()
  run readRetry()
  run runCommand("Drain", b"{\"host\": \"10.0.0.5\", \"seconds\": 20}")
  run runCommand("Drain", b"{\"host\": 5}")
  run runCommand("Restart", b"{}")
  run describe()
  run tools()
}

pub effect fn main() -> ()
  ! SchemaError | JsonSchemaError | OutOfMemoryError | WriterError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut out = StdoutWriter.make()
  run steps()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
}
```

`steps` runs each part in order and `main` lends it one allocator and the standard output `Writer`. `SchemaError` and `JsonSchemaError` stay in the error row because `readConfig`, `writeConfig`, `readRetry` and `describe` let them escape; with the inputs above, none does.

```sh
silk run
```

The output is the blocks shown in each section, in order.

## Limits to know

- JSON is the only format so far. `SchemaReader` and `SchemaWriter` in `silk/schema/schema` are the interfaces a format implements; every `Schema` type then reads and writes it with no change.
- Types without a `Schema` implementation, such as `f32`, `HashMap`, tuples and fixed-size arrays, cannot be fields. Using one is a compile error such as ``error[SEM0121] `f32: silk.schema.schema.Schema` cannot be proved``. Wrap it in a type of your own with a codec, as `Delay` does.
- A derived `Schema` reads and writes every field, so every field must be `pub`. A private field is a compile error at its declaration, such as ``error[SEM0177] a derived `Schema` reads and writes every field, so `port` must be `pub`, or the type must implement `read` and `write` ``. A type that keeps fields private implements `read` and `write` itself, usually through a codec.
- `decodeAll` lists at most 64 problems, and one value records at most 16 failed `check`s.
- Reading never runs past the input: the whole input must be one JSON value, with only white space around it. Anything after it is an `InvalidSyntax` problem.
- Writing does not check rules, and bytes the `Writer` accepted before a failure stay written.
- A union whose variants carry fields is always a tagged object. Untagged unions, matched by shape, are not supported.

## API reference

- `silk/schema/schema`: `Schema`, `Spec`, `Checks`, `Schemas` (`shape`, `shapeOf`, `readVia`, `writeVia`, `shapeVia`), `SchemaReader`, `SchemaWriter`
- `silk/schema/json`: `SchemaJson` (`decode`, `decodeAll`, `decodeVariant`, `encode`), `JsonSchemaReader`, `JsonSchemaWriter`
- `silk/schema/issue`: `SchemaError`, `SchemaErrors`, `Issue`, `IssueReason`, `ValueKind`, `Span`, `MAX_PROBLEMS`
- `silk/schema/path`: `SchemaPath` (`text`, `pointer`, `names`, `matchesText`), `PathSegment`
- `silk/schema/report`: `SchemaReport` (`write`, `writeOne`), `ReportOptions`, `ReportStyle`, `MAX_QUOTED`
- `silk/schema/codec`: `Codec`, `Check`, `Codecs` (`chain2` to `chain6`, `check`), `Trim`, `NumberText`, `Identity`, `Between`, `Length`, `Items`, `Chain2` to `Chain6`, `Refine`
- `silk/schema/shape`: `Shapes`, `Shape`, `ShapeRef`, `ShapeOf`, `FieldShape`, `VariantShape`, `Constraint`, `Literal`, `Bound`
- `silk/schema/json_schema`: `JsonSchemas` (`write`, `writeVariant`), `JsonSchemaOptions`, `JsonSchemaDialect`, `JsonSchemaError`, `JsonSchemaProblem`
- `silk/io/writer`: `Writer`; `silk/io/writer_native`: `StdoutWriter`; `silk/mem/allocator`: `Allocator`
