# Encodings and compression

This guide builds `unpack`, a program that turns bytes into text and back. It Base64-encodes a message, takes a URL apart and puts a relative link together, decompresses the same text from gzip, Zstandard, XZ and LZMA, compresses with DEFLATE, and makes UUIDs. The modules share one style: they write into buffers you supply, report exactly how much they read and wrote, and never guess.

## Set up

```sh
silk init unpack
cd unpack
```

The code blocks below, in order, make up the whole of `src/main.silk`. Here are the imports:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.encoding.base64 { Base64, Base64Error, Base64Reason }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.text.format { Format }
import silk.compress.inflate { Decoder, DecodeError, Format as Container, Limits, Status }
import silk.compress.inflate
import silk.core.option { Option }
import silk.io.writer_native { StdoutWriter }
import silk.core.result { Result }
import silk.collections.slice { Slice }
import silk.text.string { String }
import silk.uri.uri { Uri }
import silk.uri.percent { PercentComponent, UriPercent }
import silk.uri.reference { ParseError, UriReference }
import silk.io.writer { Writer, WriterError }
import silk.compress.zstd { Zstd, ZstdError, ZstdLimits, ZstdStatus }
import silk.compress.deflate { Deflate, EncodeError }
import silk.compress.limits { DecodeError as LzmaError, DecodeLimits, Decoded }
import silk.compress.lzma { Lzma }
import silk.compress.lzma2 { Lzma2 }
import silk.compress.xz { Xz }
import silk.encoding.uuid { Uuid }
import silk.system.random { Random }
import silk.system.random_native { OsRandom }
```

Two modules both export a type called `Format`: `silk/text/format` (text templates) and `silk/compress/inflate` (the compressed container). One file cannot import both under the same name, so the inflate one is renamed with `Format as Container`. `import silk.compress.inflate` on its own line also brings the module name into scope, for its constant `inflate.MEMORY_BOUND`.

If you import both as `Format`, `silk check` stops at the second import and points at the first:

```
Checking unpack (x86_64-unknown-linux-gnu)
  load     188 modules, 1 in package         0.08s
  check    failed: 2 modules, 1 error        0.23s
[x86_64-unknown-linux-gnu]
src/main.silk:6:54: error[SEM0016] Multiple bindings claim Format; rename one with `as`, as in `import a.b as other` or `import a.b { Format as other }`
  note: src/main.silk:5:27: related location
Failed unpack in 0.33s
```

Writing `inflate.Format.Gzip` through the module name does not work either. A module import names the module's types in type positions, but not their members as values:

```
src/main.silk:120:38: error[SEM0238] Format is a type of module silk.compress.inflate, which a value cannot reach through the module name; import it by name, as in `import silk.compress.inflate { Format }`
```

Here `Format` is already taken, so rename on import instead.

## Base64

```silk
effect fn base64Demo() -> () ! Base64Error | WriterError ? &mut Writer {
  let message = b"hello, silk"
  let mut encoded: [u8; 64] = [0; 64]
  let length = match move Base64.encodeInto(&mut encoded, message) {
    Result.Success { value } => value
    Result.Failure { error } => { fail move error }
  }
  let text = Slice.view(&encoded, 0, length)
  run Writer.writeString("base64: ")
  run Writer.writeAll(text)
  run Writer.writeString("\n")

  let mut decoded: [u8; 64] = [0; 64]
  let back = run fromBase64(text, &mut decoded)
  run Writer.writeString("decoded: ")
  run Writer.writeAll(Slice.view(&decoded, 0, back))
  run Writer.writeString("\n")

  match move Base64.decodedLength(b"aGVsbG8") {
    Result.Success { value } => run Writer.writeString("unexpected success\n")
    Result.Failure { error } => match error.reason {
      Base64Reason.InvalidLength => run Writer.writeString("aGVsbG8 rejected: not a whole 4-byte group\n")
      _ => run Writer.writeString("aGVsbG8 rejected\n")
    }
  }
}

effect fn fromBase64(text: &[u8], out: &mut [u8]) -> usize ! Base64Error {
  return match move Base64.decodeInto(&mut out, text) {
    Result.Success { value } => value
    Result.Failure { error } => { fail move error }
  }
}
```

`Base64.encodeInto(output, input)` writes into a slice you own and returns how many bytes it wrote. `decodeInto` is the reverse. Neither allocates. To size a buffer exactly, ask first: `Base64.encodedLength(n)` and `Base64.decodedLength(text)`. A too-small buffer fails with `OutputTooSmall` and reports the `required` length.

The decoder is strict. It accepts only the standard alphabet with `=` padding, rejects whitespace, and rejects input whose length is not a multiple of four. `aGVsbG8` is `hello` with its padding stripped, so `decodedLength` fails with `Base64Reason.InvalidLength`. Every failure is a `Base64Error` with a `reason` and, where it helps, an `offset`. There is no URL-safe alphabet in `silk/encoding/base64`.

## URIs and percent-encoding

```silk
effect fn show(label: string, value: Option<string>) -> () ! WriterError ? &mut Writer {
  let text = move value |> Option<string>.unwrapOr("(none)")
  run Format.format("{label}: {text}\n", &.{ label: label, text: text })
}

effect fn uriDemo() -> () ! ParseError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let base = match move Uri.parse("https://example.com:8443/docs/guide%20one.html?lang=en#top") {
    Result.Success { value } => value
    Result.Failure { error } => { fail move error }
  }
  run show("scheme", Option<string>.some(base.scheme()))
  run show("host", base.host())
  run show("port", base.port())
  run show("path", Option<string>.some(base.path()))
  run show("query", base.query())
  run show("fragment", base.fragment())

  match move run UriPercent.decodeOwned(base.path()) {
    Result.Success { value } => {
      run Writer.writeString("decoded path: ")
      run Writer.writeAll(Bytes.asSlice(&value))
      run Writer.writeString("\n")
    }
    Result.Failure { error } => run Format.format("bad escape at {at}\n", &.{ at: error.offset })
  }

  let segment = run UriPercent.encodeOwned(b"Q&A notes/2026", PercentComponent.PathSegment)
  run show("encoded segment", Option<string>.some(segment.view()))

  let relative = match move UriReference.parse("../images/logo.png") {
    Result.Success { value } => value
    Result.Failure { error } => { fail move error }
  }
  let resolved = match move run Uri.resolveOwned(&base, &relative) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail move error }
  }
  let view = resolved.view()
  run show("resolved", Option<string>.some(view.format()))
}
```

`Uri.parse` validates a URI that has a scheme and borrows its parts from your text without copying. Each accessor returns a slice of the original: `host()` is `example.com`, `port()` is the digits as text, and `path()` keeps its escapes (`guide%20one.html`). Optional parts return `Option<string>`, and an empty part (a bare `?`) is `Some("")`, not `None`. For a reference that may lack a scheme, such as `../images/logo.png`, use `UriReference.parse` from `silk/uri/reference`. Parse failures are a `ParseError` with a `reason`, the `component` that failed and an `offset`.

Percent-encoding lives in `silk/uri/percent`. `UriPercent.decodeOwned(text)` returns the decoded bytes in an owned `Bytes`. They are bytes, not text, because `%FF` is a valid escape that is not UTF-8; check with `String.fromUtf8` if you need a string. A `+` stays a `+`. Decoding fails with a `DecodeError` at the offset of a broken escape such as `%G1`.

`UriPercent.encodeOwned(bytes, component)` escapes what that part of a URI cannot hold. The `PercentComponent` matters: as a `PathSegment`, the slash in `notes/2026` becomes `%2F` so it stays inside one segment, while `Path` would keep it. Use `Unreserved` to escape everything except letters, digits and `-._~`. The `Into` and `ToWriter` variants write into a buffer or a `Writer` instead of allocating.

`Uri.resolveOwned(&base, &reference)` resolves a relative reference against a base the way a browser does, removing `..` segments, and returns an `OwnedUri`. Call `view()` on it to get a borrowed `Uri` back. To build a URI from parts, fill a `UriComponents` from `silk/uri/components` and call `serializeOwned`.

## Decompress gzip

The compressed fixtures are stored as Base64 so they fit in source code:

```silk
fn gzipFixture() -> &'static [u8] {
  return b"H4sIAAAAAAAC/zPUUwjOzMlWSElNzs8tKEotLk5NUSjJyCxWyMnMS9XjMiIgb0xA3oSAPADjdmM7gAAAAA=="
}

fn zstdFixture() -> &'static [u8] {
  return b"KLUv/SCAhQEARAIxLiBTaWxrIGRlY29tcHJlc3NlZCB0aGlzIGxpbmUuCjIzNC4DAEBE0LCMRpEB"
}

effect fn gunzip() -> () ! Base64Error | DecodeError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let mut packed: [u8; 128] = [0; 128]
  let packedLength = run fromBase64(gzipFixture(), &mut packed)
  let limits = Limits {
    maxInputBytes: 4096,
    maxOutputBytes: 65536,
    maxMembers: 1,
    maxHeaderBytes: 1024,
    maxMemoryBytes: inflate.MEMORY_BOUND,
  }
  let mut decoder = run Decoder.make(Container.Gzip, move limits)

  let mut chunk: [u8; 64] = [0; 64]
  let mut offset: usize = 0
  let mut steps = 0
  while true {
    let input = Slice.view(&packed, offset, packedLength - offset)
    let progress = match move decoder.step(input, &mut chunk, true) {
      Result.Success { value } => move value
      Result.Failure { error } => { fail move error }
    }
    steps = steps + 1
    offset = offset + progress.consumed
    run Writer.writeAll(Slice.view(&chunk, 0, progress.written))
    if progress.status == Status.Finished { break }
  }
  run Format.format("gzip: {n} compressed bytes, {steps} steps\n", &.{ n: packedLength, steps: steps })
}
```

`Decoder.make(format, limits)` from `silk/compress/inflate` allocates the decoder's fixed state, about 64 KiB. You must name the container: `Container.Gzip`, `Container.Zlib` or `Container.Raw` for bare DEFLATE. The module never sniffs the format. It only decodes; compressing is `silk/compress/deflate`, below.

`Limits` is required, and every field counts. Decoding fails with `InputLimit` or `OutputLimit` when the totals pass `maxInputBytes` or `maxOutputBytes`, which is how you stop a small file from expanding into gigabytes. `maxMembers` caps concatenated gzip members, `maxHeaderBytes` caps gzip header extras such as the file name, and `maxMemoryBytes` must be at least `MEMORY_BOUND` (65536) or `make` fails with `MemoryLimit`.

`step(input, output, finalInput)` decodes as much as fits and returns a `Progress`:

- `consumed` is how much input it used. Pass only the rest next time, which is what `offset` tracks.
- `written` is how much of `output` it filled. Only that prefix is valid.
- `status` says what it needs: `NeedOutput` (call again with output space), `NeedInput` (supply more input) or `Finished` (the stream and its checksum are complete).

Here the output buffer is 64 bytes and the text is 128, so it takes two steps. `finalInput` is `true` because the whole compressed input is already in memory. When reading from a file or socket in pieces, pass `false` until the last piece. A corrupt stream fails with a `DecodeError` whose `kind` says why, for example `ChecksumMismatch`.

## Decompress Zstandard

```silk
effect fn unzstd() -> () ! Base64Error | ZstdError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let mut packed: [u8; 128] = [0; 128]
  let packedLength = run fromBase64(zstdFixture(), &mut packed)
  let mut decoder = run Zstd.make(ZstdLimits.make())

  let mut chunk: [u8; 64] = [0; 64]
  let mut offset: usize = 0
  let mut total: usize = 0
  while true {
    let input = Slice.view(&packed, offset, packedLength - offset)
    let progress = match move decoder.step(input, &mut chunk, true) {
      Result.Success { value } => move value
      Result.Failure { error } => { fail move error }
    }
    offset = offset + progress.consumed
    total = total + progress.written
    if progress.status == ZstdStatus.Finished { break }
  }
  run Format.format("zstd: {n} compressed bytes -> {total} bytes\n", &.{ n: packedLength, total: total })
}
```

`Zstd` from `silk/compress/zstd` follows the same loop with its own types: `ZstdLimits`, `ZstdProgress`, `ZstdStatus` and `ZstdError`. `ZstdLimits.make()` gives safe defaults: 64 MiB of input, 256 MiB of output, 1024 frames and an 8 MiB window. Build a `ZstdLimits` yourself to tighten them. Dictionaries are not supported, and there is no Zstandard encoder.

The HTTP client uses both decoders to undo `Content-Encoding: gzip` and `zstd`, so you rarely call them for web traffic. The HTTP client guide covers that.

## Compress with DEFLATE

```silk
fn sameBytes(left: &[u8], right: &[u8]) -> bool {
  if left.length != right.length { return false }
  let mut index: usize = 0
  while index < left.length {
    if left[index] != right[index] { return false }
    index = index + 1
  }
  return true
}

effect fn deflateDemo() -> () ! EncodeError | DecodeError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let text = b"Silk compresses this line. Silk compresses this line. Silk compresses this line.\n"
  let mut packed: [u8; 128] = [0; 128]
  let packedLength = run Deflate.encode(text, &mut packed, Container.Gzip)

  let limits = Limits {
    maxInputBytes: 4096,
    maxOutputBytes: 4096,
    maxMembers: 1,
    maxHeaderBytes: 1024,
    maxMemoryBytes: inflate.MEMORY_BOUND,
  }
  let mut decoder = run Decoder.make(Container.Gzip, move limits)
  let mut back: [u8; 128] = [0; 128]
  let progress = match move decoder.step(Slice.view(&packed, 0, packedLength), &mut back, true) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail move error }
  }
  let same = progress.status == Status.Finished && sameBytes(Slice.view(&back, 0, progress.written), text)
  run Format.format("deflate: {n} bytes -> {packed} bytes of gzip, round trip {ok}\n", &.{
    n: text.length,
    packed: packedLength,
    ok: same,
  })
}
```

`Deflate.encode(input, output, format)` from `silk/compress/deflate` compresses a whole buffer at once and returns the encoded length. The container is the same `Format` the decoder takes, so `Container.Gzip`, `Container.Zlib` or `Container.Raw`. The output is deterministic: gzip gets timestamp zero and no file name. The encoder uses fixed Huffman codes and a 32 KiB window, has no compression levels, and allocates a 32768-entry match table through the ambient `Allocator` for the duration of the call. If `output` is too small it fails with `EncodeError`, whose `written` says how far it got; discard that partial stream. `Deflate.encodedBound(length, format)` returns an output size that never fails, or `None` if it does not fit in `usize`. For this 81-byte line with `Container.Gzip` it is 111, so the 128-byte `packed` buffer is enough.

Byte slices have no `==`, so `sameBytes` compares the round trip byte by byte.

## Decompress XZ and LZMA

```silk
fn xzFixture() -> &'static [u8] {
  return b"/Td6WFoAAATm1rRGAgAhARYAAAB0L+Wj4AB/AC5dABiLgCU3p25rPY9wc7eLWyljDhLo46NM5pptnztf6X6vml8UYztoicbbqp1XkOAAAAAXlG3dEBbVhwABSoABAAAAICrMZLHEZ/sCAAAAAARZWg=="
}

fn lzmaFixture() -> &'static [u8] {
  return b"XQAAgAD//////////wAYi4AlN6duaz2PcHO3i1spYw4S6OOjTOaabZ87X+l+r5pfFGM7aInG26qx9yk///bgQAA="
}

fn lzma2Fixture() -> &'static [u8] {
  return b"4AB/AC5dABiLgCU3p25rPY9wc7eLWyljDhLo46NM5pptnztf6X6vml8UYztoicbbqp1XkOAA"
}

effect fn unxz() -> () ! Base64Error | LzmaError | OutOfMemoryError | WriterError ? &mut Allocator | &mut Writer {
  let mut packed: [u8; 128] = [0; 128]
  let mut text: [u8; 256] = [0; 256]

  let xzLength = run fromBase64(xzFixture(), &mut packed)
  let xz = run Xz.decode(Slice.view(&packed, 0, xzLength), &mut text, DecodeLimits.make())
  run Format.format("xz: {n} -> {written} bytes\n", &.{ n: xz.consumed, written: xz.written })

  let lzmaLength = run fromBase64(lzmaFixture(), &mut packed)
  let alone = run Lzma.decode(Slice.view(&packed, 0, lzmaLength), &mut text, DecodeLimits.make())
  run Format.format("lzma: {n} -> {written} bytes\n", &.{ n: alone.consumed, written: alone.written })

  let rawLength = run fromBase64(lzma2Fixture(), &mut packed)
  let raw = run Lzma2.decode(Slice.view(&packed, 0, rawLength), &mut text, 65536, DecodeLimits.make())
  run Format.format("lzma2: {n} -> {written} bytes\n", &.{ n: raw.consumed, written: raw.written })
  run Writer.writeAll(Slice.view(&text, 0, 32))
}
```

Three modules decode the LZMA family, all from a complete buffer in one call:

- `Xz.decode` from `silk/compress/xz` reads `.xz` files. It checks the block, index and footer and the stream's CRC-32, CRC-64 or SHA-256 check. Only blocks with a single LZMA2 filter are supported; others fail with `UnsupportedFilter`.
- `Lzma.decode` from `silk/compress/lzma` reads `.lzma` (LZMA-alone) files with the 13-byte header. That format has no checksum.
- `Lzma2.decode` from `silk/compress/lzma2` reads raw LZMA2 chunks. The caller passes the dictionary size, here 65536, because raw LZMA2 does not record it.

They share `silk/compress/limits`: `DecodeLimits.make()` allows 64 MiB of input, 256 MiB of output, a 64 MiB dictionary and 16 MiB of probability tables, which are allocated through the ambient `Allocator`. Each call returns a `Decoded` with `consumed` and `written`, or fails with a `DecodeError` whose `reason` is a `DecodeReason` such as `TruncatedInput`, `ChecksumMismatch` or `OutputLimit`. That type is also called `DecodeError`, so it is imported as `LzmaError`. The output buffer must hold the whole result. All three fixtures decode to the same 128 bytes as the gzip one.

## UUIDs

```silk
effect fn uuidDemo() -> () ! WriterError ? &mut Random | &mut Writer {
  let namespace = Uuid.namespaceDns()
  let named = Uuid.v5(&namespace, "www.example.com")
  run Format.format("v5: {id}\n", &.{ id: named })
  match Uuid.parse("2ED6657D-E927-568B-95E1-2665A8AEA6A2") {
    Result.Success { value } => {
      run Format.format("parsed equals v5: {same}\n", &.{ same: &value == &named })
    }
    Result.Failure { error } => { run Writer.writeAll(b"not a UUID\n") }
  }
  let fresh = run Uuid.v4()
  let mut text: [u8; 45] = [0; 45]
  match Uuid.formatUrnInto(&fresh, &mut text) {
    Result.Success { value } => {
      run Format.format("v4 version {v}, {length} bytes as a URN\n", &.{
        v: Option<u8>.unwrapOr(fresh.version(), 0),
        length: String.byteLength(value),
      })
    }
    Result.Failure { error } => { run Writer.writeAll(b"buffer too small\n") }
  }
}
```

`Uuid` from `silk/encoding/uuid` covers versions 1 to 8. `v3` and `v5` hash a name inside a namespace such as `namespaceDns()`, so the same name always gives the same UUID. `v4()` needs a `&mut Random` provider, and `v7(unixMilliseconds)` does too. `parse` accepts the 36-character form in either case, and `parseUrn` accepts the `urn:uuid:` form. `formatInto` and `formatUrnInto` write lowercase text into a buffer of at least 36 or 45 bytes and return it as a `string`, and `Uuid` implements `Display` for `{id}` in templates. Compare UUIDs as shared borrows, `&a == &b`.

`UuidError` does not implement `Debug`, so `main` cannot list it in its error row. This demo handles each `Result` where it happens instead.

## Run it

```silk
pub effect fn main() -> () ! Base64Error | ParseError | DecodeError | ZstdError | EncodeError | LzmaError | OutOfMemoryError | WriterError {
  let mut random = OsRandom.make()
  let mut out = StdoutWriter.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  run base64Demo() |> Effect.provideMut<Writer>(&mut out)
  run uriDemo()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run gunzip()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run unzstd()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run deflateDemo()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run unxz()
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Writer>(&mut out)
  run uuidDemo()
    |> Effect.provideMut<Random>(&mut random)
    |> Effect.provideMut<Writer>(&mut out)
}
```

```sh
silk run
```

```
base64: aGVsbG8sIHNpbGs=
decoded: hello, silk
aGVsbG8 rejected: not a whole 4-byte group
scheme: https
host: example.com
port: 8443
path: /docs/guide%20one.html
query: lang=en
fragment: top
decoded path: /docs/guide one.html
encoded segment: Q&A%20notes%2F2026
resolved: https://example.com:8443/images/logo.png
1. Silk decompressed this line.
2. Silk decompressed this line.
3. Silk decompressed this line.
4. Silk decompressed this line.
gzip: 61 compressed bytes, 2 steps
zstd: 57 compressed bytes -> 128 bytes
deflate: 81 bytes -> 50 bytes of gzip, round trip true
xz: 112 -> 128 bytes
lzma: 65 -> 128 bytes
lzma2: 54 -> 128 bytes
1. Silk decompressed this line.
v5: 2ed6657d-e927-568b-95e1-2665a8aea6a2
parsed equals v5: true
v4 version 4, 45 bytes as a URN
```

The `v4` UUID is random, so only its version and length are shown.

## API reference

- `silk/encoding/base64`: `Base64`, `Base64Error`, `Base64Reason`
- `silk/uri/uri`: `Uri`, `OwnedUri`
- `silk/uri/reference`: `UriReference`, `OwnedUriReference`, `ParseError`, `HostKind`
- `silk/uri/percent`: `UriPercent`, `PercentComponent`, `DecodeError`
- `silk/uri/components`: `UriComponents`
- `silk/compress/inflate`: `Decoder`, `Format`, `Limits`, `Progress`, `Status`, `DecodeError`, `ErrorKind`, `MEMORY_BOUND`
- `silk/compress/zstd`: `Zstd`, `ZstdLimits`, `ZstdProgress`, `ZstdStatus`, `ZstdError`
- `silk/compress/deflate`: `Deflate`, `EncodeError`
- `silk/compress/xz`: `Xz`; `silk/compress/lzma`: `Lzma`; `silk/compress/lzma2`: `Lzma2`
- `silk/compress/limits`: `DecodeLimits`, `Decoded`, `DecodeError`, `DecodeReason`
- `silk/encoding/uuid`: `Uuid`, `UuidError`, `UuidVariant`
- `silk/collections/bytes`: `Bytes`; `silk/collections/slice`: `Slice`; `silk/io/writer`: `Writer`
