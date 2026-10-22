# Encodings and compression

This guide builds `unpack`, a program that turns bytes into text and back. It Base64-encodes a message, takes a URL apart and puts a relative link together, and decompresses the same text from gzip and from Zstandard. All four modules share one style: they write into buffers you supply, report exactly how much they read and wrote, and never guess.

## Set up

```sh
silk init unpack
cd unpack
```

The code blocks below, in order, make up the whole of `src/main.silk`. Here are the imports:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.base64 { Base64, Base64Error, Base64Reason }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.format { Format }
import silk.inflate { Decoder, DecodeError, Format as Container, Limits, Status }
import silk.inflate
import silk.option { Option }
import silk.os_writer { StdoutWriter }
import silk.result { Result }
import silk.slice { Slice }
import silk.uri { Uri }
import silk.uri_percent { PercentComponent, UriPercent }
import silk.uri_reference { ParseError, UriReference }
import silk.writer { Writer, WriterError }
import silk.zstd { Zstd, ZstdError, ZstdLimits, ZstdStatus }
```

Two modules both export a type called `Format`: `silk/format` (text templates) and `silk/inflate` (the compressed container). One file cannot import both under the same name, so the inflate one is renamed with `Format as Container`. `import silk.inflate` on its own line also brings the module name into scope, for its constant `inflate.MEMORY_BOUND`.

If you import both as `Format`, `silk check` stops at every use of the name:

```
[x86_64-unknown-linux-gnu]
/home/you/unpack/src/main.silk:5:22: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/unpack/src/main.silk:54:7: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/unpack/src/main.silk:75:37: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/unpack/src/main.silk:111:38: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/unpack/src/main.silk:127:7: error[SEM0016] Two bindings in one scope claiming the same spelling
/home/you/unpack/src/main.silk:148:7: error[SEM0016] Two bindings in one scope claiming the same spelling
check x86_64-unknown-linux-gnu: failed (exit 1)
Check summary: 0 succeeded, 1 failed
```

The message does not name `Format`, so look for a name that two imports share. Writing `inflate.Format.Gzip` through the module name does not work either: this release reports it as `unsupported: this construct is not supported by the native compiler yet`. Rename on import instead.

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

The decoder is strict. It accepts only the standard alphabet with `=` padding, rejects whitespace, and rejects input whose length is not a multiple of four. `aGVsbG8` is `hello` with its padding stripped, so `decodedLength` fails with `Base64Reason.InvalidLength`. Every failure is a `Base64Error` with a `reason` and, where it helps, an `offset`. There is no URL-safe alphabet in `silk/base64`.

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

`Uri.parse` validates a URI that has a scheme and borrows its parts from your text without copying. Each accessor returns a slice of the original: `host()` is `example.com`, `port()` is the digits as text, and `path()` keeps its escapes (`guide%20one.html`). Optional parts return `Option<string>`, and an empty part (a bare `?`) is `Some("")`, not `None`. For a reference that may lack a scheme, such as `../images/logo.png`, use `UriReference.parse` from `silk/uri_reference`. Parse failures are a `ParseError` with a `reason`, the `component` that failed and an `offset`.

Percent-encoding lives in `silk/uri_percent`. `UriPercent.decodeOwned(text)` returns the decoded bytes in an owned `Bytes`. They are bytes, not text, because `%FF` is a valid escape that is not UTF-8; check with `String.fromUtf8` if you need a string. A `+` stays a `+`. Decoding fails with a `DecodeError` at the offset of a broken escape such as `%G1`.

`UriPercent.encodeOwned(bytes, component)` escapes what that part of a URI cannot hold. The `PercentComponent` matters: as a `PathSegment`, the slash in `notes/2026` becomes `%2F` so it stays inside one segment, while `Path` would keep it. Use `Unreserved` to escape everything except letters, digits and `-._~`. The `Into` and `ToWriter` variants write into a buffer or a `Writer` instead of allocating.

`Uri.resolveOwned(&base, &reference)` resolves a relative reference against a base the way a browser does, removing `..` segments, and returns an `OwnedUri`. Call `view()` on it to get a borrowed `Uri` back. To build a URI from parts, fill a `UriComponents` from `silk/uri_components` and call `serializeOwned`.

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

`Decoder.make(format, limits)` from `silk/inflate` allocates the decoder's fixed state, about 64 KiB. You must name the container: `Container.Gzip`, `Container.Zlib` or `Container.Raw` for bare DEFLATE. The module never sniffs the format and never compresses.

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

`Zstd` from `silk/zstd` follows the same loop with its own types: `ZstdLimits`, `ZstdProgress`, `ZstdStatus` and `ZstdError`. `ZstdLimits.make()` gives safe defaults: 64 MiB of input, 256 MiB of output, 1024 frames and an 8 MiB window. Build a `ZstdLimits` yourself to tighten them. Dictionaries are not supported, and there is no Zstandard encoder.

The HTTP client uses both decoders to undo `Content-Encoding: gzip` and `zstd`, so you rarely call them for web traffic. The HTTP client guide covers that.

## Run it

```silk
pub effect fn main() -> () ! Base64Error | ParseError | DecodeError | ZstdError | OutOfMemoryError | WriterError {
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
}
```

```sh
silk run
```

```
Compiled src/main.silk -> build/llvm/x86_64-unknown-linux-gnu/debug/unpack (llvm, x86_64-unknown-linux-gnu, 541 symbols)
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
```

## API reference

- `silk/base64`: `Base64`, `Base64Error`, `Base64Reason`
- `silk/uri`: `Uri`, `OwnedUri`
- `silk/uri_reference`: `UriReference`, `OwnedUriReference`, `ParseError`, `HostKind`
- `silk/uri_percent`: `UriPercent`, `PercentComponent`, `DecodeError`
- `silk/uri_components`: `UriComponents`
- `silk/inflate`: `Decoder`, `Format`, `Limits`, `Progress`, `Status`, `DecodeError`, `ErrorKind`, `MEMORY_BOUND`
- `silk/zstd`: `Zstd`, `ZstdLimits`, `ZstdProgress`, `ZstdStatus`, `ZstdError`
- `silk/bytes`: `Bytes`; `silk/slice`: `Slice`; `silk/writer`: `Writer`
