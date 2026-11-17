# Static evaluation

These members answer questions while the compiler specializes a program: which target and profile it builds for, the bytes of text and files known at compile time, the fields and variants of a type, and the tests of a package. They run only during static evaluation, in a `const` initializer, a `static if` condition, a `static for` sequence or a `static fn` body. Runtime code that calls one is SEM0176: "Intrinsic.targetPointerBits runs only during static evaluation, so runtime code cannot call it".

The exceptions run at runtime with a static argument: `borrowField`, `borrowFieldMut`, `makeVariant`, `isVariant`, `borrowVariantField`, `borrowVariantFieldMut` and `testFunction` take a descriptor that is fixed during specialization, and compile to a plain field access, construction, match or function value.

Members that take a descriptor need their type arguments written out, as in `Intrinsic.reflectFieldLabel<Point, i32>(field)`; the `silk/core/reflect` wrappers infer them.

The wrappers are in [`silk/core/target`](/docs/std/core-target), [`silk/core/compilation`](/docs/std/core-compilation), [`silk/core/static_text`](/docs/std/core-static-text), [`silk/core/static_sequence`](/docs/std/core-static-sequence), [`silk/core/reflect`](/docs/std/core-reflect), `silk/build/source` and [`silk/testing/runner`](/docs/std/testing-runner).

## Target

### `Intrinsic.targetPointerBits`

```silk signature
static fn targetPointerBits() -> u32
```

Returns the width of a pointer and of `usize` on the target, in bits: 64 on x86_64 and AArch64, 32 on wasm32.

- Wrapper: the constant `pointerBits` in `silk/core/target`.

```silk
const pointerBits: u32 = Intrinsic.targetPointerBits()

pub fn main() -> i32 {
  static if Intrinsic.targetArchitecture() == "x86_64" {
    if pointerBits != 64 {
      return 1
    }
  }
  return 0
}
```

### `Intrinsic.targetPointerAlignment`

```silk signature
static fn targetPointerAlignment() -> u32
```

Returns the alignment of a pointer on the target, in bytes.

- Wrapper: the constant `pointerAlignment` in `silk/core/target`.

```silk
const alignment: u32 = Intrinsic.targetPointerAlignment()
const bits: u32 = Intrinsic.targetPointerBits()

pub fn main() -> i32 {
  if alignment * 8 != bits {
    return 1
  }
  return 0
}
```

### `Intrinsic.targetArchitecture`

```silk signature
static fn targetArchitecture() -> string<'static>
```

Returns the target's architecture: `"x86_64"`, `"aarch64"`, `"wasm32"` or `"wasm64"`.

- Use it in a `static if` to keep code for one architecture out of the others, where its instructions would not compile.
- Wrapper: [`Target.arch`](/docs/std/core-target#Target.impl.arch), which returns an enum.

```silk
pub fn main() -> i32 {
  static if Intrinsic.targetArchitecture() == "aarch64" {
    return 0
  } else {
    return 0
  }
}
```

### `Intrinsic.targetOperatingSystem`

```silk signature
static fn targetOperatingSystem() -> string<'static>
```

Returns the target's operating system: `"linux"`, `"darwin"`, `"windows"`, `"wasi"` or `"freestanding"`.

- Wrapper: [`Target.operatingSystem`](/docs/std/core-target#Target.impl.operatingSystem).

```silk
const onWindows: bool = Intrinsic.targetOperatingSystem() == "windows"

pub fn main() -> i32 {
  static if onWindows {
    return 0
  }
  return 0
}
```

### `Intrinsic.targetAbi`

```silk signature
static fn targetAbi() -> string<'static>
```

Returns the target's ABI and C library family: `"gnu"`, `"apple"`, `"msvc"` or `"wasm"`.

- Wrapper: [`Target.abi`](/docs/std/core-target#Target.impl.abi).

```silk
pub fn main() -> i32 {
  static if Intrinsic.targetOperatingSystem() == "linux" && Intrinsic.targetAbi() != "gnu" {
    compileError("Linux targets use the gnu ABI")
  }
  return 0
}
```

### `Intrinsic.targetObjectFormat`

```silk signature
static fn targetObjectFormat() -> string<'static>
```

Returns the object file format the target links: `"elf"`, `"macho"`, `"coff"` or `"wasm"`.

- Wrapper: [`Target.objectFormat`](/docs/std/core-target#Target.impl.objectFormat).

```silk
pub fn main() -> i32 {
  static if Intrinsic.targetOperatingSystem() == "linux" && Intrinsic.targetObjectFormat() != "elf" {
    compileError("Linux links ELF")
  }
  return 0
}
```

### `Intrinsic.targetEndianness`

```silk signature
static fn targetEndianness() -> string<'static>
```

Returns the target's byte order. Every supported target is `"little"`.

- Wrapper: [`Target.endianness`](/docs/std/core-target#Target.impl.endianness).

```silk
pub fn main() -> i32 {
  static if Intrinsic.targetEndianness() != "little" {
    compileError("this code reads little-endian bytes")
  }
  return 0
}
```

## Profile

A profile is the set of build settings `silk` selected for a compilation: target, optimization, libc, CPU features and so on. These members read its facts by name.

### `Intrinsic.profileText`

```silk signature
static fn profileText(name: string<'static>) -> string<'static>
```

Returns one text fact of the profile, such as `"target"` (the target triple), `"cpu"`, `"deployment"`, `"libc"`, `"threading"`, `"optimization"`, `"safety"`, `"artifact"`, `"link"`, `"relocation"`, `"code-model"`, `"unwind"`, `"entry-kind"` or `"runtime-kind"`.

- A name the profile does not have stops static evaluation with an error.
- Wrappers: the functions of [`Compilation`](/docs/std/core-compilation#Compilation) in `silk/core/compilation`, such as `Compilation.libc()`, which return enums.

```silk
pub fn main() -> i32 {
  static if Intrinsic.profileText("target") == "x86_64-unknown-linux-gnu" {
    return 0
  }
  return 0
}
```

### `Intrinsic.profileFlag`

```silk signature
static fn profileFlag(name: string<'static>) -> bool
```

Returns one yes-or-no fact of the profile, such as `"debug"`, which is true for a debug build.

- Wrapper: the constant `debug` in `silk/core/compilation`.

```silk
const debug: bool = Intrinsic.profileFlag("debug")

pub fn main() -> i32 {
  static if debug {
    return 0
  }
  return 0
}
```

### `Intrinsic.profileContains`

```silk signature
static fn profileContains(name: string<'static>, value: string<'static>) -> bool
```

Returns whether the list fact `name` of the profile contains `value`, such as `profileContains("cpu-features", "avx2")` or `profileContains("sanitizers", "address")`.

- Wrapper: [`Target.hasCpuFeature`](/docs/std/core-target#Target.impl.hasCpuFeature).

```silk
pub fn main() -> i32 {
  static if Intrinsic.targetArchitecture() == "x86_64" {
    // Every x86_64 profile has SSE2.
    static if !Intrinsic.profileContains("cpu-features", "sse2") {
      compileError("x86_64 always has sse2")
    }
  }
  return 0
}
```

## Static text

Text known during static evaluation: string literals, field and variant labels, and text these members build. Byte positions count UTF-8 bytes.

### `Intrinsic.staticTextByteLength`

```silk signature
static fn staticTextByteLength(value: string) -> usize
```

Returns the number of UTF-8 bytes in `value`.

- Wrapper: [`StaticText.byteLength`](/docs/std/core-static-text#StaticText.impl.byteLength).

```silk
const length: usize = Intrinsic.staticTextByteLength("añ")

pub fn main() -> i32 {
  if length != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticTextByteAt`

```silk signature
static fn staticTextByteAt(value: string, index: usize) -> u8
```

Returns the byte at position `index`. An index at or past the length stops static evaluation with an error.

- Wrapper: [`StaticText.byteAt`](/docs/std/core-static-text#StaticText.impl.byteAt).

```silk
const first: u8 = Intrinsic.staticTextByteAt("Silk", 0)

pub fn main() -> i32 {
  if first != 0x53 {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticTextConcat`

```silk signature
static fn staticTextConcat(left: string, right: string) -> string<'static>
```

Returns `left` followed by `right`. An error reported about the result points at `left`'s source location.

- Wrapper: [`StaticText.concat`](/docs/std/core-static-text#StaticText.impl.concat).

```silk
const greeting: string<'static> = Intrinsic.staticTextConcat("hello, ", "world")

pub fn main() -> i32 {
  if greeting != "hello, world" {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticTextSlice`

```silk signature
static fn staticTextSlice(value: string, start: usize, end: usize) -> string<'static>
```

Returns the bytes of `value` from `start` up to, not including, `end`.

- `start <= end <= byteLength(value)` must hold, and both must be at character boundaries; otherwise static evaluation stops with an error.
- Wrapper: [`StaticText.slice`](/docs/std/core-static-text#StaticText.impl.slice).

```silk
const word: string<'static> = Intrinsic.staticTextSlice("hello, world", 7, 12)

pub fn main() -> i32 {
  if word != "world" {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticTextErrorAt`

```silk signature
static fn staticTextErrorAt(text: string, start: usize, end: usize, message: string) -> never
```

Stops static evaluation with the compile error `message`, reported at bytes `start` to `end` of `text`.

- When `text` is a string literal of the calling package, the error points inside the literal, at those characters. When it is a struct field's label, it points at that part of the field's name in the declaration. Otherwise, as for text that `staticTextConcat` built, it points at the call.
- `start <= end <= byteLength(text)` must hold, or the error is about the range instead.
- It is how a library reports a mistake inside a format string or a field name where the user wrote it.
- Wrapper: [`StaticText.errorAt`](/docs/std/core-static-text#StaticText.impl.errorAt).

```silk
static fn checked(template: string<'static>) -> string<'static> {
  let length = Intrinsic.staticTextByteLength(template)
  let mut at: usize = 0
  while at < length {
    // 37 is the byte of `%`.
    if Intrinsic.staticTextByteAt(template, at) == 37 {
      Intrinsic.staticTextErrorAt(template, at, at + 1, "use {} instead of %")
    }
    at = at + 1
  }
  return template
}

pub fn main() -> i32 {
  // `checked("50% off")` would be an error at the `%` inside the literal.
  let text = checked("{} items")
  if text != "{} items" {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticTextLink`

```silk signature
static fn staticTextLink<Owner>(text: string, start: usize, end: usize, owner: Type<Owner>, field: usize) -> ()
```

Tells the editor that bytes `start` to `end` of the literal `text` name field number `field` (counted from 0) of `Owner`, whose descriptor is `owner`. Go to definition and rename then work on the text, as they do on a field name in code.

- It changes nothing in the program. Text that did not come from a literal is ignored.
- Wrapper: [`StaticText.link`](/docs/std/core-static-text#StaticText.impl.link), which takes the field's label instead of its number.

```silk
struct Flags {
  pub verbose: bool,
}

static fn named(text: string<'static>) -> string<'static> {
  Intrinsic.staticTextLink<Flags>(text, 0, Intrinsic.staticTextByteLength(text), Intrinsic.reflectType<Flags>(), 0)
  return text
}

pub fn main() -> i32 {
  // The editor links the literal to the field `verbose`.
  let option = named("verbose")
  if option != "verbose" {
    return 1
  }
  return 0
}
```

## Embedded files

### `Intrinsic.embed`

```silk signature
static fn embed(path: string<'static>) -> &'static [u8]
```

Returns the bytes of a file of the calling package, read at compile time and stored in the program. `path` is relative to the package root. Call it in a `const` or a `static fn`; the bytes are then usable at runtime.

- A missing file is a compile error. The file is an input of the build, so changing it rebuilds what embeds it. `silk pack` refuses a package that embeds a file its `include` list leaves out.
- Wrapper: `Source.read` in `silk/build/source`.

```silk
const manifest: &'static [u8] = Intrinsic.embed("silk.toml")

pub fn main() -> i32 {
  // The manifest starts with its [package] table.
  if manifest.length == 0 || manifest[0] != 0x5b {
    return 1
  }
  return 0
}
```

### `Intrinsic.embedText`

```silk signature
static fn embedText(path: string<'static>) -> string<'static>
```

Returns a file of the calling package as text, checked at compile time to be UTF-8.

- A file that is not valid UTF-8 is a compile error.
- Wrapper: `Source.text` in `silk/build/source`.

```silk
const manifest: string<'static> = Intrinsic.embedText("silk.toml")

pub fn main() -> i32 {
  if Intrinsic.stringByteLength(manifest) == 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.embedCompressed`

```silk signature
static fn embedCompressed(path: string<'static>) -> &'static [u8]
```

Returns a file of the calling package compressed at compile time as one Zstandard frame, which records the original byte count. The program stores only the compressed bytes.

- Wrappers: `Source.compressed` and `Source.compressedText` in `silk/build/source`, whose results report both lengths and decompress at runtime.

```silk
const frame: &'static [u8] = Intrinsic.embedCompressed("silk.toml")

pub fn main() -> i32 {
  // A Zstandard frame starts with the magic number 0xFD2FB528, little-endian.
  if frame.length < 4 || frame[0] != 0x28 || frame[1] != 0xb5 {
    return 1
  }
  return 0
}
```

## Static sequences

A static sequence is an immutable list of values that exists only during static evaluation, such as the parts of a parsed format string. `static for` walks one.

### `Intrinsic.staticSequenceEmpty`

```silk signature
static fn staticSequenceEmpty<Element>() -> StaticSequence<Element>
```

Returns a sequence with no elements.

- Wrapper: [`StaticSequence.empty`](/docs/std/core-static-sequence#StaticSequence.impl.empty).

```silk
pub fn main() -> i32 {
  static if Intrinsic.staticSequenceLength<u32>(Intrinsic.staticSequenceEmpty<u32>()) != 0 {
    compileError("an empty sequence has no elements")
  }
  return 0
}
```

### `Intrinsic.staticSequenceAppend`

```silk signature
static fn staticSequenceAppend<Element>(sequence: StaticSequence<Element>, value: Element) -> StaticSequence<Element>
```

Returns a new sequence with `value` after the elements of `sequence`. The original is unchanged.

- Wrapper: [`StaticSequence.append`](/docs/std/core-static-sequence#StaticSequence.impl.append).

```silk
static fn squares() -> Intrinsic.StaticSequence<u32> {
  let mut values = Intrinsic.staticSequenceEmpty<u32>()
  let mut at: u32 = 1
  while at <= 3 {
    values = Intrinsic.staticSequenceAppend<u32>(move values, at * at)
    at = at + 1
  }
  return values
}

pub fn main() -> i32 {
  let mut total: u32 = 0
  static for square in squares() {
    total = total + square
  }
  if total != 14 {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticSequenceConcat`

```silk signature
static fn staticSequenceConcat<Element>(left: StaticSequence<Element>, right: StaticSequence<Element>) -> StaticSequence<Element>
```

Returns the elements of `left` followed by those of `right`.

- Wrapper: [`StaticSequence.concat`](/docs/std/core-static-sequence#StaticSequence.impl.concat).

```silk
static fn one(value: u32) -> Intrinsic.StaticSequence<u32> {
  return Intrinsic.staticSequenceAppend<u32>(Intrinsic.staticSequenceEmpty<u32>(), value)
}

pub fn main() -> i32 {
  static if Intrinsic.staticSequenceLength<u32>(Intrinsic.staticSequenceConcat<u32>(one(1), one(2))) != 2 {
    compileError("two elements")
  }
  return 0
}
```

### `Intrinsic.staticSequenceLength`

```silk signature
static fn staticSequenceLength<Element>(sequence: StaticSequence<Element>) -> usize
```

Returns the number of elements.

- Wrapper: [`StaticSequence.length`](/docs/std/core-static-sequence#StaticSequence.impl.length).

```silk
const count: usize = Intrinsic.staticSequenceLength<u8>(Intrinsic.staticSequenceAppend<u8>(Intrinsic.staticSequenceEmpty<u8>(), 7))

pub fn main() -> i32 {
  if count != 1 {
    return 1
  }
  return 0
}
```

### `Intrinsic.staticSequenceAt`

```silk signature
static fn staticSequenceAt<Element>(sequence: StaticSequence<Element>, index: usize) -> Element
```

Returns element `index`, counted from 0. An index at or past the length stops static evaluation with an error.

- Wrapper: [`StaticSequence.at`](/docs/std/core-static-sequence#StaticSequence.impl.at).

```silk
const second: u8 = Intrinsic.staticSequenceAt<u8>(
  Intrinsic.staticSequenceAppend<u8>(Intrinsic.staticSequenceAppend<u8>(Intrinsic.staticSequenceEmpty<u8>(), 4), 2),
  1,
)

pub fn main() -> i32 {
  if second != 2 {
    return 1
  }
  return 0
}
```

## Reflection of types and fields

A descriptor, such as `Intrinsic.Type<Owner>` or `Intrinsic.Field<Owner, Value>`, names one type or field during specialization. It has no runtime value. Descriptors of private fields exist only in the module that declares the type; the `silk/core/reflect` wrappers see only `pub` fields, because visibility is judged from that module.

### `Intrinsic.reflectType`

```silk signature
static fn reflectType<Owner>() -> Type<Owner>
```

Returns the descriptor of the struct, tuple, array or union type `Owner`.

- Wrapper: [`Reflect.typeOf`](/docs/std/core-reflect#Reflect.impl.typeOf).

```silk
struct Point {
  pub x: i32,
  pub y: i32,
}

pub fn main() -> i32 {
  // 0 is the kind of a struct with named fields.
  static if Intrinsic.reflectTypeKind<Point>(Intrinsic.reflectType<Point>()) != 0 {
    compileError("Point has named fields")
  }
  return 0
}
```

### `Intrinsic.reflectTypeKind`

```silk signature
static fn reflectTypeKind<Owner>(descriptor: Type<Owner>) -> u8
```

Returns the kind of a type as a stable code: 0 a struct with named fields, 1 a positional (tuple) struct, 2 an anonymous record, 3 an anonymous tuple, 4 an array, 5 any other type, 6 a union.

- The codes are the constants `namedKind`, `positionalKind`, `anonymousNamedKind`, `anonymousPositionalKind`, `arrayKind`, `otherKind` and `unionKind` in `silk/core/reflect`.
- Wrapper: [`Reflect.typeKind`](/docs/std/core-reflect#Reflect.impl.typeKind).

```silk
union Shape {
  Dot,
  Circle { pub radius: u32 },
}

tuple Pair(u8, u8)

pub fn main() -> i32 {
  static if Intrinsic.reflectTypeKind<Shape>(Intrinsic.reflectType<Shape>()) != 6 {
    compileError("Shape is a union")
  }
  static if Intrinsic.reflectTypeKind<Pair>(Intrinsic.reflectType<Pair>()) != 1 {
    compileError("a positional struct")
  }
  return 0
}
```

### `Intrinsic.reflectTypeName`

```silk signature
static fn reflectTypeName<Owner>(descriptor: Type<Owner>) -> string<'static>
```

Returns the name of `Owner` as a program writes it, with its type arguments and without module paths, such as `Point` or `Page<String>`. Lifetimes other than `'static` are left out.

- Wrapper: [`Reflect.typeName`](/docs/std/core-reflect#Reflect.impl.typeName).

```silk
struct Pair<T> {
  pub first: T,
  pub second: T,
}

const name: string<'static> = Intrinsic.reflectTypeName<Pair<u8>>(Intrinsic.reflectType<Pair<u8>>())

pub fn main() -> i32 {
  if name != "Pair<u8>" {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectDeclarationName`

```silk signature
static fn reflectDeclarationName<Owner>(descriptor: Type<Owner>) -> string<'static>
```

Returns a nominal type's defining package, module, and owner names separated by `/`. The name is independent of import aliases and type arguments. A non-nominal type returns empty text.

- Wrapper: [`Reflect.declarationName`](/docs/std/core-reflect#Reflect.impl.declarationName).

```silk
struct Boxed<T> {
  pub value: T,
}

const first: string = Intrinsic.reflectDeclarationName<Boxed<u8>>(Intrinsic.reflectType<Boxed<u8>>())
const second: string = Intrinsic.reflectDeclarationName<Boxed<u32>>(Intrinsic.reflectType<Boxed<u32>>())

pub fn main() -> i32 {
  if first == "" || first != second {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectTypeDoc`

```silk signature
static fn reflectTypeDoc<Owner>(descriptor: Type<Owner>) -> string<'static>
```

Returns the `///` comment on the declaration of a named type, without the slashes and with its lines joined by newlines, or empty text when it has none.

- Wrapper: [`Reflect.typeDoc`](/docs/std/core-reflect#Reflect.impl.typeDoc).

```silk
/// A point on the screen.
struct Point {
  pub x: i32,
}

const doc: string<'static> = Intrinsic.reflectTypeDoc<Point>(Intrinsic.reflectType<Point>())

pub fn main() -> i32 {
  if doc != "A point on the screen." {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectPrivateField`

```silk signature
static fn reflectPrivateField<Owner>(descriptor: Type<Owner>) -> string<'static>
```

Returns the name of the first field of the struct `Owner` that is not `pub`, or empty text when every field is `pub` or `Owner` is not a struct. An `errorAt` on the returned text points at that field's declaration.

- A library that must construct `Owner` from outside its module uses it to refuse such a type at compile time.
- Wrapper: [`Reflect.privateField`](/docs/std/core-reflect#Reflect.impl.privateField).

```silk
struct Settings {
  pub name: u8,
  secret: u8,
}

const hidden: string<'static> = Intrinsic.reflectPrivateField<Settings>(Intrinsic.reflectType<Settings>())

pub fn main() -> i32 {
  let settings = Settings { name: 1, secret: 2 }
  if hidden != "secret" || settings.name + settings.secret != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectFields`

```silk signature
static fn reflectFields<Owner>() -> Fields<Owner>
```

Returns the descriptors of the fields of `Owner` that the calling module can see, in declaration order. Each element is an `Intrinsic.Field<Owner, Value>` with its own `Value` type, so the sequence is walked with `static for`.

- Called directly, it includes private fields when the caller is the declaring module. The wrapper [`Reflect.fields`](/docs/std/core-reflect#Reflect.impl.fields) lists only `pub` fields.

```silk
struct Pair {
  first: i32,
  second: i32,
}

fn sum(owner: &Pair) -> i32 {
  let mut total = 0
  static for field in Intrinsic.reflectFields<Pair>() {
    total = total + Intrinsic.borrowField(owner, field).*
  }
  return total
}

pub fn main() -> i32 {
  let pair = Pair { first: 20, second: 22 }
  if sum(&pair) != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectField`

```silk signature
static fn reflectField<Owner, Value>(label: string<'static>) -> Field<Owner, Value>
```

Returns the descriptor of the field of `Owner` named `label`, whose type must be `Value`.

- A label that `Owner` does not have, or a field of another type, stops static evaluation with an error at the call.
- Wrapper: [`Reflect.field`](/docs/std/core-reflect#Reflect.impl.field).

```silk
struct Flags {
  pub verbose: bool,
  pub depth: u32,
}

fn depthOf(flags: &Flags) -> u32 {
  return Intrinsic.borrowField<Flags, u32>(flags, Intrinsic.reflectField<Flags, u32>("depth")).*
}

pub fn main() -> i32 {
  let flags = Flags { verbose: false, depth: 3 }
  if depthOf(&flags) != 3 || flags.verbose {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectFieldKind`

```silk signature
static fn reflectFieldKind<Owner, Value>(field: Field<Owner, Value>) -> u8
```

Returns the kind of a field: 0 for a named field, 1 for a positional field, 2 for a field of a union variant. The codes are `labeledFieldKind`, `positionalFieldKind` and `variantFieldKind` in `silk/core/reflect`.

- Wrapper: [`Reflect.fieldKind`](/docs/std/core-reflect#Reflect.impl.fieldKind).

```silk
tuple Pair(u8, u8)

pub fn main() -> i32 {
  static for field in Intrinsic.reflectFields<Pair>() {
    static if Intrinsic.reflectFieldKind<Pair, u8>(field) != 1 {
      compileError("tuple fields are positional")
    }
  }
  return 0
}
```

### `Intrinsic.reflectFieldLabel`

```silk signature
static fn reflectFieldLabel<Owner, Value>(field: Field<Owner, Value>) -> string<'static>
```

Returns the name of a named field or a variant field, as the declaration writes it. A positional field has no name; ask for its ordinal instead.

- Wrapper: [`Reflect.fieldLabel`](/docs/std/core-reflect#Reflect.impl.fieldLabel).

```silk
struct Point {
  pub x: i32,
  pub y: i32,
}

static fn labels() -> string<'static> {
  let mut text = ""
  static for field in Intrinsic.reflectFields<Point>() {
    text = Intrinsic.staticTextConcat(text, Intrinsic.reflectFieldLabel<Point, i32>(field))
  }
  return text
}

pub fn main() -> i32 {
  if labels() != "xy" {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectFieldOrdinal`

```silk signature
static fn reflectFieldOrdinal<Owner, Value>(field: Field<Owner, Value>) -> usize
```

Returns the position of a positional field or a variant field, counted from 0.

- Wrapper: [`Reflect.fieldOrdinal`](/docs/std/core-reflect#Reflect.impl.fieldOrdinal).

```silk
tuple Triple(u8, u8, u8)

static fn lastOrdinal() -> usize {
  let mut last: usize = 0
  static for field in Intrinsic.reflectFields<Triple>() {
    last = Intrinsic.reflectFieldOrdinal<Triple, u8>(field)
  }
  return last
}

pub fn main() -> i32 {
  if lastOrdinal() != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectFieldDoc`

```silk signature
static fn reflectFieldDoc<Owner, Value>(field: Field<Owner, Value>) -> string<'static>
```

Returns the `///` comment on a named struct field or a variant field, without its slashes, or empty text when it has none. A positional field gives empty text.

- A command line library uses it as the help text of the option a field fills, so the comment is written once.
- Wrapper: [`Reflect.fieldDoc`](/docs/std/core-reflect#Reflect.impl.fieldDoc).

```silk
struct Flags {
  /// Say more.
  pub verbose: bool,
}

pub fn main() -> i32 {
  static for field in Intrinsic.reflectFields<Flags>() {
    static if Intrinsic.reflectFieldDoc<Flags, bool>(field) != "Say more." {
      compileError("the comment is the field's documentation")
    }
  }
  return 0
}
```

### `Intrinsic.fieldNameLabel`

```silk signature
static fn fieldNameLabel<Owner>(name: FieldName<Owner>) -> string<'static>
```

Returns the text of a checked field name. A parameter of type `Intrinsic.FieldName<Owner>` accepts a string literal only when it names a field of `Owner`, so a misspelled name is an error at the literal, and the editor links the literal to the field.

- Wrapper: [`Reflect.fieldNameText`](/docs/std/core-reflect#Reflect.impl.fieldNameText).

```silk
struct Flags {
  pub verbose: bool,
}

static fn optionName<T>(name: Intrinsic.FieldName<T>) -> string<'static> {
  return Intrinsic.fieldNameLabel<T>(name)
}

pub fn main() -> i32 {
  // optionName<Flags>("verbos") would be an error at the literal.
  static if optionName<Flags>("verbose") != "verbose" {
    compileError("the name is its text")
  }
  return 0
}
```

### `Intrinsic.borrowField`

```silk signature
fn borrowField<Owner, Value>(owner: &'o Owner, static field: Field<Owner, Value>) -> &'o Value
```

Returns a shared borrow of the field of `owner` that `field` describes. At runtime it is a plain field access; the field is chosen during specialization.

- Safe. `field` must be a descriptor of `Owner` itself, not of a variant; a variant field is read with `borrowVariantField`.
- It cannot move a field out of an owned value.
- Wrapper: [`Reflect.borrowField`](/docs/std/core-reflect#Reflect.impl.borrowField).

```silk
struct Pair {
  pub first: i32,
  pub second: i32,
}

pub fn main() -> i32 {
  let pair = Pair { first: 40, second: 2 }
  let mut total = 0
  static for field in Intrinsic.reflectFields<Pair>() {
    total = total + Intrinsic.borrowField<Pair, i32>(&pair, field).*
  }
  if total != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.borrowFieldMut`

```silk signature
fn borrowFieldMut<Owner, Value>(owner: &'o mut Owner, static field: Field<Owner, Value>) -> &'o mut Value
```

Returns an exclusive borrow of the field of `owner` that `field` describes. It is the mutable twin of `borrowField`.

- Wrapper: [`Reflect.borrowFieldMut`](/docs/std/core-reflect#Reflect.impl.borrowFieldMut).

```silk
struct Counters {
  pub reads: u32,
  pub writes: u32,
}

pub fn main() -> i32 {
  let mut counters = Counters { reads: 1, writes: 2 }
  static for field in Intrinsic.reflectFields<Counters>() {
    let place = Intrinsic.borrowFieldMut<Counters, u32>(&mut counters, field)
    place.* = 0
  }
  if counters.reads + counters.writes != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.functionRef`

```silk signature
static fn functionRef<F>(value: F) -> FunctionRef
```

Returns a static function value of the contract `F` with that contract erased, so that one `Intrinsic.FunctionRef` type can hold functions of different contracts, as a table of parsers for options of different types does.

- Static evaluation only, like the `FunctionRef` it returns: a static table, such as the options of a command line, holds it. `value` is a named function.
- Read it back with `functionAs` and the same contract.

```silk
fn double(value: &i32) -> i32 {
  return value.* * 2
}

static fn erased() -> Intrinsic.FunctionRef {
  return Intrinsic.functionRef<fn<'static>(&i32) -> i32>(double)
}

static fn restored() -> fn<'static>(&i32) -> i32 {
  return Intrinsic.functionAs<fn<'static>(&i32) -> i32>(erased())
}

pub fn main() -> i32 {
  // The static call gives a plain function value that runtime code calls.
  let call = restored()
  if call(&21) != 42 {
    return 1
  }
  return 0
}
```

### `Intrinsic.functionAs`

```silk signature
static fn functionAs<F>(reference: FunctionRef) -> F
```

Returns the function that a `FunctionRef` holds, as a value of the contract `F`. The result is an ordinary function value that runtime code can call.

- `F` must be the contract the reference was made with. The check happens during static evaluation, so a different contract is a compile error, not undefined behavior.

```silk
fn isPositive(value: &i64) -> bool {
  return value.* > 0
}

static fn checks() -> [Intrinsic.FunctionRef; 1] {
  return [Intrinsic.functionRef<fn<'static>(&i64) -> bool>(isPositive)]
}

static fn first() -> fn<'static>(&i64) -> bool {
  return Intrinsic.functionAs<fn<'static>(&i64) -> bool>(checks()[0])
}

pub fn main() -> i32 {
  let check = first()
  let five: i64 = 5
  if !check(&five) {
    return 1
  }
  return 0
}
```

## Reflection of scalar enums

### `Intrinsic.reflectEnumMembers`

```silk signature
static fn reflectEnumMembers<Enum>() -> StaticSequence<Enum>
```

Returns the scalar enum values visible from the calling module in declaration order, preserving their declared discriminants. The result is a static sequence for `static for`; the sequence has no runtime representation. A type that is not a scalar enum is rejected.

- Wrapper: [`Reflect.enumMembers`](/docs/std/core-reflect#Reflect.impl.enumMembers).

```silk
pub enum Mode {
  Fast,
  Small,
}

pub fn main() -> i32 {
  let mut count = 0
  static for mode in Intrinsic.reflectEnumMembers<Mode>() {
    if mode == Mode.Fast || mode == Mode.Small {
      count = count + 1
    }
  }
  if count != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectEnumLabel`

```silk signature
static fn reflectEnumLabel<Enum>(value: Enum) -> string<'static>
```

Returns the declared member name of a scalar enum value during static evaluation. The argument must be a static value of that enum.

- Wrapper: [`Reflect.enumLabel`](/docs/std/core-reflect#Reflect.impl.enumLabel).

```silk
pub enum Mode {
  Fast,
  Small,
}

static fn names() -> string<'static> {
  let mut text = ""
  static for mode in Intrinsic.reflectEnumMembers<Mode>() {
    text = Intrinsic.staticTextConcat(text, Intrinsic.reflectEnumLabel<Mode>(mode))
  }
  return text
}

pub fn main() -> i32 {
  if names() != "FastSmall" {
    return 1
  }
  return 0
}
```

## Reflection of unions

### `Intrinsic.reflectVariants`

```silk signature
static fn reflectVariants<Union>() -> Variants<Union>
```

Returns the descriptors of the variants of a nominal union, in declaration order, as a sequence for `static for`.

- Wrapper: [`Reflect.variants`](/docs/std/core-reflect#Reflect.impl.variants).

```silk
union Command {
  Status,
  Stop,
  Restart,
}

pub fn main() -> i32 {
  let mut count = 0
  static for _variant in Intrinsic.reflectVariants<Command>() {
    count = count + 1
  }
  if count != 3 {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectVariantLabel`

```silk signature
static fn reflectVariantLabel<Union>(variant: Variant<Union>) -> string<'static>
```

Returns the name of a variant as the declaration writes it.

- Wrapper: [`Reflect.variantLabel`](/docs/std/core-reflect#Reflect.impl.variantLabel).

```silk
union Command {
  Status,
  Stop,
}

static fn names() -> string<'static> {
  let mut text = ""
  static for variant in Intrinsic.reflectVariants<Command>() {
    text = Intrinsic.staticTextConcat(text, Intrinsic.reflectVariantLabel<Command>(variant))
  }
  return text
}

pub fn main() -> i32 {
  if names() != "StatusStop" {
    return 1
  }
  return 0
}
```

### `Intrinsic.reflectVariantDoc`

```silk signature
static fn reflectVariantDoc<Union>(variant: Variant<Union>) -> string<'static>
```

Returns the `///` comment on a variant, without its slashes, or empty text when it has none.

- Wrapper: [`Reflect.variantDoc`](/docs/std/core-reflect#Reflect.impl.variantDoc).

```silk
union Command {
  /// Print the state.
  Status,
}

pub fn main() -> i32 {
  static for variant in Intrinsic.reflectVariants<Command>() {
    static if Intrinsic.reflectVariantDoc<Command>(variant) != "Print the state." {
      compileError("the comment is the variant's documentation")
    }
  }
  return 0
}
```

### `Intrinsic.reflectVariantFields`

```silk signature
static fn reflectVariantFields<Union>(variant: Variant<Union>) -> Fields<Union>
```

Returns the descriptors of the fields of one variant, in declaration order. Each has the kind 2 (a variant field). A unit variant has none.

- A variant field cannot go to `borrowField`, because the union holds it only while that variant is active; read it with `borrowVariantField`.
- Wrapper: [`Reflect.variantFields`](/docs/std/core-reflect#Reflect.impl.variantFields).

```silk
union Shape {
  Dot,
  Line { pub length: u32, pub width: u32 },
}

static fn fieldCount<U>(variant: Intrinsic.Variant<U>) -> usize {
  let mut count: usize = 0
  static for _field in Intrinsic.reflectVariantFields<U>(variant) {
    count = count + 1
  }
  return count
}

pub fn main() -> i32 {
  let mut total: usize = 0
  static for variant in Intrinsic.reflectVariants<Shape>() {
    total = total + fieldCount(variant)
  }
  if total != 2 {
    return 1
  }
  return 0
}
```

### `Intrinsic.variantNameLabel`

```silk signature
static fn variantNameLabel<Union>(name: VariantName<Union>) -> string<'static>
```

Returns the text of a checked variant name. A parameter of type `Intrinsic.VariantName<Union>` accepts a string literal only when it names a variant of `Union`.

- Wrapper: [`Reflect.variantNameText`](/docs/std/core-reflect#Reflect.impl.variantNameText).

```silk
union Command {
  Status,
  Stop,
}

static fn commandName<U>(name: Intrinsic.VariantName<U>) -> string<'static> {
  return Intrinsic.variantNameLabel<U>(name)
}

pub fn main() -> i32 {
  static if commandName<Command>("Stop") != "Stop" {
    compileError("the name is its text")
  }
  return 0
}
```

### `Intrinsic.makeVariant`

```silk signature
fn makeVariant<Union, Fields>(static variant: Variant<Union>, fields: Fields) -> Union
```

Returns the variant that `variant` describes, built from `fields`: a tuple of the variant's fields in declaration order, `.(value)` for one field, or `()` for a unit variant. At runtime it is exactly the written construction, such as `Shape.Line { length: a, width: b }`.

- A tuple whose types differ from the fields is SEM0012. Every field of the variant must be visible where the variant was reflected.
- Wrapper: [`Reflect.makeVariant`](/docs/std/core-reflect#Reflect.impl.makeVariant).

```silk
union Shape {
  Dot,
  Line { pub length: u32, pub width: u32 },
}

fn area(shape: Shape) -> u32 {
  return match move shape {
    Shape.Dot => 0
    Shape.Line {length, width} => length * width
  }
}

pub fn main() -> i32 {
  let three: u32 = 3
  let four: u32 = 4
  let mut total: u32 = 0
  static for variant in Intrinsic.reflectVariants<Shape>() {
    static if Intrinsic.reflectVariantLabel<Shape>(variant) == "Line" {
      total = total + area(Intrinsic.makeVariant(variant, (three, four)))
    }
  }
  if total != 12 {
    return 1
  }
  return 0
}
```

### `Intrinsic.isVariant`

```silk signature
fn isVariant<Union>(owner: &Union, static variant: Variant<Union>) -> bool
```

Returns whether `owner` holds the variant `variant`. At runtime it is a `match` with one arm for that variant.

- Wrapper: [`Reflect.isVariant`](/docs/std/core-reflect#Reflect.impl.isVariant).

```silk
union Command {
  Status,
  Stop,
}

fn label(command: &Command) -> string<'static> {
  static for variant in Intrinsic.reflectVariants<Command>() {
    let static name = Intrinsic.reflectVariantLabel<Command>(variant)
    if Intrinsic.isVariant<Command>(command, variant) {
      return name
    }
  }
  return ""
}

pub fn main() -> i32 {
  if label(&Command.Stop) != "Stop" {
    return 1
  }
  return 0
}
```

### `Intrinsic.borrowVariantField`

```silk signature
unsafe fn borrowVariantField<Union, Value>(owner: &'o Union, static variant: Variant<Union>, static field: Field<Union, Value>) -> &'o Value
```

Returns a shared borrow of one field of the variant `variant` of `owner`. At runtime it is the field binding of that variant's `match` arm, without the test.

- Unsafe. The caller proves that `owner` holds `variant`, for example with `isVariant` just before. `field` must be one of `reflectVariantFields(variant)`.
- Wrapper: [`Reflect.borrowVariantField`](/docs/std/core-reflect#Reflect.impl.borrowVariantField), which is safe because it tests the variant and traps when the owner holds another.

```silk
union Shape {
  Dot,
  Circle { pub radius: u32 },
}

fn radiusOf(shape: &Shape) -> u32 {
  let mut radius: u32 = 0
  static for variant in Intrinsic.reflectVariants<Shape>() {
    static for field in Intrinsic.reflectVariantFields<Shape>(variant) {
      if Intrinsic.isVariant<Shape>(shape, variant) {
        radius = (unsafe Intrinsic.borrowVariantField<Shape, u32>(shape, variant, field)).*
      }
    }
  }
  return radius
}

pub fn main() -> i32 {
  if radiusOf(&Shape.Circle { radius: 5 }) != 5 || radiusOf(&Shape.Dot) != 0 {
    return 1
  }
  return 0
}
```

### `Intrinsic.borrowVariantFieldMut`

```silk signature
unsafe fn borrowVariantFieldMut<Union, Value>(owner: &'o mut Union, static variant: Variant<Union>, static field: Field<Union, Value>) -> &'o mut Value
```

Returns an exclusive borrow of one field of the variant `variant` of `owner`. It is the mutable twin of `borrowVariantField`, under the same rules.

- Wrapper: [`Reflect.borrowVariantFieldMut`](/docs/std/core-reflect#Reflect.impl.borrowVariantFieldMut).

```silk
union Shape {
  Dot,
  Circle { pub radius: u32 },
}

pub fn main() -> i32 {
  let mut shape = Shape.Circle { radius: 5 }
  static for variant in Intrinsic.reflectVariants<Shape>() {
    static for field in Intrinsic.reflectVariantFields<Shape>(variant) {
      if Intrinsic.isVariant<Shape>(&shape, variant) {
        let radius = unsafe Intrinsic.borrowVariantFieldMut<Shape, u32>(&mut shape, variant, field)
        radius.* = radius.* * 2
      }
    }
  }
  return match move shape {
    Shape.Circle {radius} => if radius == 10 { 0 } else { 1 }
    Shape.Dot => 2
  }
}
```

## Tests

The catalog exists while `silk test` builds a package's tests, so these examples are test packages: each block is a file with a `test fn`, run with `silk test`.

### `Intrinsic.tests`

```silk signature
static fn tests() -> Tests
```

Returns the static catalog of the `test` functions in the discovery root of a `silk test` build. Each element is an `Intrinsic.Test<F>` descriptor, where `F` is the test's function type, so the catalog is walked with `static for`.

- Outside a test build there is no catalog, and a call is SEM0176.
- The test runner in [`silk/testing/runner`](/docs/std/testing-runner) is built on it; programs rarely call it.

```silk test
static fn count() -> usize {
  let mut total: usize = 0
  static for _descriptor in Intrinsic.tests() {
    total = total + 1
  }
  return total
}

test fn catalog() -> () {
  static if count() != 1 {
    compileError("this file has one test")
  }
}
```

### `Intrinsic.testInfo`

```silk signature
static fn testInfo<F>(descriptor: Test<F>) -> TestInfo
```

Returns one test's static metadata as an `Intrinsic.TestInfo`, with the text fields `identity` (stable across runs), `path` (the source file), `module` and `name`.

```silk test
static fn names() -> string<'static> {
  let mut text = ""
  static for descriptor in Intrinsic.tests() {
    text = Intrinsic.staticTextConcat(text, Intrinsic.testInfo(descriptor).name)
  }
  return text
}

test fn catalog() -> () {
  static if names() != "catalog" {
    compileError("the test is named catalog")
  }
}
```

### `Intrinsic.testFunction`

```silk signature
fn testFunction<F>(static descriptor: Test<F>) -> F
```

Returns the test's function itself, with its exact type `F`, to call at runtime. A plain test is `fn() -> ()`; an effect test is an effect function whose requirements the runner provides.

```silk test
fn countTests() -> u32 {
  let mut total: u32 = 0
  static for descriptor in Intrinsic.tests() {
    let body = Intrinsic.testFunction(descriptor)
    drop body
    total = total + 1
  }
  return total
}

test fn catalog() -> () {
  if countTests() != 1 {
    Intrinsic.trap("this file has one test")
  }
}
```
