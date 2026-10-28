# TLS, certificates and trust

The HTTP client handles HTTPS for you: it loads a trust bundle, checks the server's certificate and encrypts the exchange. This guide works one level down, with the modules the client is built on. It builds `tlsget`, a small tool with two commands:

```
tlsget <host> <port> <trust>
tlsget check <host> <chain.pem> <trust>
```

The first connects to a server over TLS, prints what was authenticated, sends a `HEAD /` request and prints the status line. The second checks a certificate chain stored in a PEM file, with no network at all: it validates the path to a trusted root and matches the host name. `<trust>` is either `system`, for the operating system's CA bundle, or the absolute path of a PEM file of your own roots.

Along the way it covers trust sources and snapshots, certificate path validation, HTTPS name matching, and TLS client connections.

## What the standard library offers

Before writing code, it helps to know the limits, because they shape what you can build:

- **Client side only.** There is a TLS client and no TLS server. A Silk program can connect to an HTTPS server but cannot accept TLS connections itself. To serve HTTPS today, put a TLS-terminating proxy in front of a plain HTTP server built with `silk/http/server`.
- **TLS 1.3 only.** The client offers TLS 1.3 and nothing older. It supports the three TLS 1.3 cipher suites (`TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`) and two key-exchange groups (X25519 and P-256). A server that only speaks TLS 1.2 fails the handshake.
- **Names come from subjectAltName only.** A certificate must list the host in its subjectAltName extension, as a DNS name or an IP address. The common name (CN) is never consulted, which matches what browsers do.
- **No revocation checks.** Path validation does not consult CRLs or OCSP. A validated path, and the connection's authentication evidence, report `RevocationStatus.NotChecked`.
- **Trust is explicit.** Nothing reads a trust store behind your back. You load a snapshot of trusted roots and hand it to the connection.

## Making a test PKI

To see validation fail in each interesting way, you need certificates you control. These `openssl` commands make a private CA and four certificates signed by it. All keys are EC P-256.

```sh
mkdir -p ~/pki && cd ~/pki

# The root CA.
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -keyout ca.key -out ca.pem -days 3650 -subj "/CN=Guide Test CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"

# good.pem names 127.0.0.1 and localhost; wrong.pem names only wrong.test.
for n in good wrong; do
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout $n.key -out $n.csr -subj "/CN=$n"
  if [ $n = good ]; then SAN="IP:127.0.0.1,DNS:localhost"; else SAN="DNS:wrong.test"; fi
  printf "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\nsubjectAltName=$SAN\n" > $n.ext
  openssl x509 -req -in $n.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out $n.pem -days 825 -extfile $n.ext
done

# An intermediate CA, and a leaf it signs. chained.pem holds the leaf first, then the intermediate.
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout inter.key -out inter.csr -subj "/CN=Guide Test Intermediate"
printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n" > inter.ext
openssl x509 -req -in inter.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out inter.pem -days 1825 -extfile inter.ext
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout chained.key -out chained.csr -subj "/CN=chained"
openssl x509 -req -in chained.csr -CA inter.pem -CAkey inter.key -CAcreateserial -out chained-leaf.pem -days 825 -extfile good.ext
cat chained-leaf.pem inter.pem > chained.pem
```

One more certificate has a validity period that ended in 2021. `openssl x509` cannot backdate, so it goes through `openssl ca`:

```sh
mkdir -p ca/newcerts && touch ca/index.txt && echo 1000 > ca/serial
printf "[ca]\ndefault_ca = d\n[d]\ndir = ./ca\ndatabase = ./ca/index.txt\nnew_certs_dir = ./ca/newcerts\nserial = ./ca/serial\ndefault_md = sha256\npolicy = p\ncopy_extensions = none\n[p]\ncommonName = supplied\n" > ca.cnf
openssl ca -batch -config ca.cnf -cert ca.pem -keyfile ca.key -in good.csr -out expired.pem \
  -startdate 20200101000000Z -enddate 20210101000000Z -extfile good.ext -notext
```

For the network half you need TLS 1.3 servers that present these certificates. Python's `ssl` module is enough. Save this as `server.py` in `~/pki`:

```python
import ssl, socket, sys, threading
port = int(sys.argv[1]); name = sys.argv[2]
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.minimum_version = ssl.TLSVersion.TLSv1_3
ctx.load_cert_chain(name + ".pem", name + ".key")
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", port)); s.listen(8)
def handle(c):
    t = ctx.wrap_socket(c, server_side=True); d = b""
    while b"\r\n\r\n" not in d:
        x = t.recv(1024)
        if not x: break
        d += x
    t.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 15\r\nConnection: close\r\n\r\nhello over tls\n")
    t.close()
while True:
    c, _ = s.accept(); threading.Thread(target=handle, args=(c,), daemon=True).start()
```

Start three of them, one per certificate:

```sh
python3 server.py 8443 good &
python3 server.py 8444 wrong &
python3 server.py 8445 chained &
```

## Trust: sources and snapshots

A **trust anchor** is a root certificate you have decided to believe. A **trust snapshot** (`TrustSnapshot`, from `silk/tls/trust_snapshot`) is an immutable list of anchors. Path validation and TLS connections take a snapshot, never a file name. Once loaded, it does not change, even if the file on disk does.

Snapshots come from a **trust source** (`TrustSource`, from `silk/tls/trust_source`). It is a service with one operation, `load`, so the place anchors come from can be swapped like any other provider. `NativeFileTrustSource` (from `silk/tls/trust_source_native`) reads a PEM file; `MemoryTrustSource` (from `silk/tls/trust_source_memory`) serves anchors you already hold, which suits tests.

`tlsget` treats `system` as the bundle Debian and Ubuntu generate, and anything else as a PEM file:

```silk
// `system` is the bundle Debian and Ubuntu generate; anything else is a PEM file of your own.
effect fn loadTrust(choice: &[u8]) -> TrustSnapshot ! TrustSourceError | FileError | OutOfMemoryError ? &mut Allocator {
  let mut location = choice
  if same(choice, b"system") {
    location = b"/etc/ssl/certs/ca-certificates.crt"
  }
  let path = run Path.fromBytes(fileOf(location))
  let mut source = run NativeFileTrustSource.make(directoryOf(location), &path)
  return run TrustSource.load(TrustLoadLimits.defaults()) |> Effect.provideMut<TrustSource>(&mut source)
}
```

`NativeFileTrustSource.make` takes an absolute root directory and a `Path` inside it, the same split `OsFileSystem` uses. A `Path` is a portable path that starts with `/` and is resolved under the root, so `directoryOf` and `fileOf` cut the user's path at its last `/` and `fileOf` keeps the slash. A relative `<trust>` such as `ca.pem` has no slash to cut at, and `Path.fromBytes` rejects it. On macOS the system bundle is `/etc/ssl/cert.pem`; the keychain is not read.

`TrustLoadLimits.defaults()` bounds how much the file may hold. A bundle with more certificates or bytes than the limits allow fails to load instead of using unbounded memory.

When you need the system roots and a private CA together, load both and merge them with `TrustSnapshot.combine`. If you already have PEM bytes in memory, `TrustSnapshot.fromPem` builds a snapshot from them directly.

## Checking a chain without a network

The `check` command does by hand what a TLS connection does during its handshake: decode the server's chain, find a path from the leaf to a trusted root, and confirm the leaf names the host.

```silk
effect fn check(name: &[u8], chainFile: &[u8], choice: &[u8]) -> bool
! BadHost | BadChain | TrustSourceError | FileError | DecodeError | WriterError | OutOfMemoryError
? &mut Writer | &mut SystemClock | &mut Allocator {
  let pem = run readPem(chainFile)
  // The chain file holds the server's certificate first, then any intermediates.
  let bundle = match move run CertificateBundle.decodePem(Bytes.asSlice(&pem), DecodeLimits.defaults()) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail move error }
  }
  let certificates = bundle.intoCertificates()
  let chain = certificates.asSlice()
  if chain.length == 0 {
    fail BadChain {}
  }
  let leaf = &chain[0]
  let intermediates = Slice.view(chain, 1, chain.length - 1)
  let trust = run loadTrust(choice)
  let now = run SystemClock.now()
  ...
```

`CertificateBundle.decodePem` (from `silk/tls/certificate_bundle`) parses every certificate in the PEM text. `intoCertificates` hands back the decoded `Certificate` values, in file order. By convention the first is the leaf, the server's own certificate, and the rest are intermediates.

Path validation needs the current time, because every certificate has a validity window. It reads the wall clock (`SystemClock`), not the monotonic clock. The time is a parameter, not a hidden call, so a test can validate as of any date it likes.

```silk
  let mut trusted = false
  match move run CertificatePath.validate(leaf, intermediates, trust.anchors(), &now, ValidationLimits.defaults()) {
    Result.Success { value: path } => {
      run Format.format("path           valid, to trust anchor #{anchor} through {count} intermediates\n", &.{ anchor: path.anchorIndex(), count: path.intermediateCount() })
      trusted = true
    }
    Result.Failure { error } => {
      let mut reason = error.reason
      if let Option.Some { value } = move error.detailReason {
        reason = value
      }
      run Format.format("path           rejected: {why}\n", &.{ why: reasonName(reason) })
    }
  }
```

`CertificatePath.validate` (from `silk/tls/certificate_path`) builds a path from the leaf, through any of the intermediates it needs, to one of the anchors. It checks signatures, validity dates, CA flags, path length and key usage. On success the `ValidatedPath` says which anchor it reached and how many intermediates it used. The intermediates do not need to be in path order, and ones the path does not use are ignored.

On failure, `ValidationError.reason` is the broad class of problem. When the validator tried several candidate paths and all were rejected, `reason` is the general `NoValidPath`, and `detailReason` carries the reason the first rejected candidate failed. `tlsget` prefers the detail when it has one. The program names the common reasons and calls the rest "rejected":

```silk
fn reasonName(reason: ValidationReason) -> string<'static> {
  return match reason {
    ValidationReason.NoIssuer => "no trusted issuer"
    ValidationReason.InvalidTime => "a certificate is expired or not yet valid"
    ValidationReason.InvalidSignature => "a signature does not verify"
    ValidationReason.InvalidUsage => "a certificate may not be used for this"
    ValidationReason.NoValidPath => "no valid path"
    _ => "rejected"
  }
}
```

## Matching the host name

A valid path proves a trusted CA issued the certificate. It does not prove the certificate is for this host. That is a separate check, in `silk/tls/https_identity`.

The **reference identity** is the name you meant to reach, taken from the host as the user typed it, before any DNS lookup. Checking against the resolved address would let anyone who can tamper with DNS pick the name.

```silk
effect fn identityOf<'a>(host: &'a Host) -> ReferenceIdentity<'a> ! BadHost {
  let origin = match &host.* {
    Host.Domain { value } => OriginHost<'a>.Dns { bytes: value.bytes() }
    Host.Ipv4 { value } => OriginHost<'a>.Ipv4 { bytes: value.octets() }
    Host.Ipv6 { value } => OriginHost<'a>.Ipv6 { bytes: value.octets() }
  }
  return match move HttpsIdentity.reference(move origin) {
    Result.Success { value } => value
    Result.Failure { .. } => { fail BadHost {} }
  }
}
```

`Host.parse` (from `silk/net/address`) already tells a domain name from an IP literal, so each case maps straight onto an `OriginHost`. A domain must be ASCII: an internationalized name has to be converted to its `xn--` form first, and a trailing dot is rejected.

The **presented identities** are the names in the certificate's subjectAltName extension. `CertificateSan.decode` (from `silk/tls/certificate_identities`) writes them into storage you provide, here room for 16, and `HttpsIdentity.verify` compares the reference against them:

```silk
fn nameMatch<'a>(leaf: &'a Certificate, reference: &ReferenceIdentity) -> Option<usize> {
  let mut storage: [PresentedIdentity<'a>; 16] = [PresentedIdentity<'a>.Dns { bytes: b"" }; 16]
  let summary = match move CertificateSan.decode(leaf, &mut storage, SanDecodeLimits.standard()) {
    Result.Success { value } => move value
    Result.Failure { .. } => { return Option<usize>.none() }
  }
  let presented = CertificateIdentities<'a>.Decoded { entries: Slice.view(&storage, 0, summary.count) }
  return match HttpsIdentity.verify(reference, &presented, IdentityLimits.standard()) {
    Result.Success { value } => Option<usize>.some(value.sanIndex)
    Result.Failure { .. } => Option<usize>.none()
  }
}
```

DNS names compare without regard to ASCII case. A wildcard such as `*.example.com` matches exactly one label, so it covers `www.example.com` and not `example.com` or `a.b.example.com`. An IP address only matches an IP entry, never a DNS entry that happens to spell the same digits.

The storage borrows from the certificate, which is why `nameMatch` names the lifetime `'a` explicitly. The compiler accepts the function and notes that its region check is not complete yet.

## Connecting

A TLS connection needs four things: a connected transport, a `ClientConfig`, a trust snapshot, and connection options. `fetch` gathers them:

```silk
  let trust = run loadTrust(Bytes.asSlice(&choice))
  run Format.format("trust          {count} anchors from {source}\n", &.{ count: trust.anchors().length, source: text(Bytes.asSlice(&choice)) })

  // The name the certificate must carry is the host as typed, not the address it resolves to.
  let host = match move Host.parse(Bytes.asSlice(&name)) {
    Result.Success { value } => move value
    Result.Failure { .. } => { fail BadHost {} }
  }
  let config = ClientConfig {
    reference: run identityOf(&host),
    alpn: AlpnConfig.defaults(),
    limits: ClientLimits.defaults(),
  }
```

`ClientConfig` (from `silk/tls/client`) holds the reference identity, the ALPN protocols to offer (`AlpnConfig.defaults()` offers none) and the client's buffer and size limits. For a DNS name, the same reference identity is sent as SNI, so the server knows which certificate to present. An IP address sends no SNI.

The transport is an ordinary TCP connection, made the way the Networking guide makes one:

```silk
effect fn connect(name: &[u8], port: u16) -> Connection
! BadHost | ResolverError | NativeSocketError | OutOfMemoryError
? &mut Resolver | &mut MonotonicClock | &mut Allocator {
  let host = match move Host.parse(name) {
    Result.Success { value } => move value
    Result.Failure { .. } => { fail BadHost {} }
  }
  let request = match move ResolveRequest.make(move host, Port.fromU16(port), FamilySelection.Any, 8, Option<Instant>.none()) {
    Result.Success { value } => move value
    Result.Failure { error } => { fail move error }
  }
  let endpoints = run Resolver.resolve(&request)
  return run connectResolvedOwned(endpoints.asSlice(), ConnectOptions.defaults(), Option<Instant>.none())
}
```

Then `withClient` (from `silk/tls/connection`) takes ownership of the connection and the snapshot, runs the handshake, and calls `talk` with the authenticated connection:

```silk
  let mut resolver = NativeSystemResolver.make()
  let mut monotonic = OsMonotonicClock.make()
  let mut wall = OsSystemClock.make()
  let mut random = OsRandom.make()
  let connection = run connect(Bytes.asSlice(&name), port)
    |> Effect.provideMut<Resolver>(&mut resolver)
    |> Effect.provideMut<MonotonicClock>(&mut monotonic)
  let request = run headRequest(Bytes.asSlice(&name))
  run withClient<(), ConnectionError | WriterError | DecodeError | OutOfMemoryError>(move connection, &config, move trust, ConnectionOptions.defaults(), talk(move request))
    |> Effect.provideMut<SystemClock>(&mut wall)
    |> Effect.provideMut<MonotonicClock>(&mut monotonic)
    |> Effect.provideMut<Random>(&mut random)
  return true
```

The handshake needs four services: `SystemClock` to validate the certificate dates, `MonotonicClock` for the handshake deadline, `Random` for key generation, and `Allocator`. `ConnectionOptions.defaults()` gives the handshake 30 seconds. Set `externalDeadline` to bound it by a deadline of your own as well.

The callback never runs unless the handshake succeeded, the certificate path validated and the name matched. When the callback returns, or fails, `withClient` closes the connection. If you need to keep the connection past one scope, for example to store it in a pool, use `authenticateOwned` instead. It takes the same arguments and returns the `OwnedConnection`, which you must close yourself.

## Talking over the connection

`OwnedConnection` has the same shape as a byte stream: `readSome`, `writeSome`, `flush`, `shutdownWrite` and `close`. Each call takes an optional absolute deadline.

```silk
effect<'call> fn talk<'call>(connection: &'call mut OwnedConnection<Connection>, request: Bytes) -> ()
! ConnectionError | WriterError | DecodeError | OutOfMemoryError
? &mut Writer | &mut MonotonicClock | &mut Allocator | &mut Random {
  run describe(&connection.*)
  let now = run MonotonicClock.now()
  let deadline = MonotonicClock.deadlineAfter(&now, 10000000000)
  let mut offset: usize = 0
  while offset < request.length() {
    offset = offset + run OwnedConnection.writeSome(&mut connection.*, Slice.view(Bytes.asSlice(&request), offset, request.length() - offset), Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
  }
  run OwnedConnection.flush(&mut connection.*, Option<Instant>.some(MonotonicClock.deadlineAfter(&deadline, 0)))
  ...
```

`writeSome` encrypts and may accept only part of the slice, so the loop runs until the whole request is written. `flush` is what puts the records on the wire. The rest of `talk` reads until it finds the end of the status line. (`MonotonicClock.deadlineAfter(&deadline, 0)` is a copy of the deadline; each call consumes the one it is given.)

Two things are different from a plain socket:

- **`OwnedConnection` is not a `ByteDuplex` provider.** You call its methods directly, and you cannot put a `BufferedDuplex` from the Byte streams guide on top of it, or hand it to code that expects a `ByteDuplex`. Line-oriented reading over TLS needs its own small buffer, as `talk` does.
- **A missing close\_notify is an error.** A TLS peer is supposed to send a `close_notify` alert before closing, so the reader can tell a finished stream from a cut-off one. If the connection ends without it, the next read after any buffered data fails with `TlsError.Truncated` instead of returning `ReadTransfer.End`. Python's `ssl` server above closes without close\_notify. `talk` never notices, because it stops reading at the status line.

`describe` reads the authentication evidence the connection carries:

```silk
effect fn describe(connection: &OwnedConnection<Connection>) -> () ! WriterError | DecodeError | OutOfMemoryError ? &mut Writer | &mut Allocator {
  match connection.authentication() {
    Option.None => {}
    Option.Some { value: evidence } => {
      run Format.format("cipher suite   {suite}\nkey exchange   {group}\n", &.{ suite: suiteName(evidence.suite()), group: groupName(evidence.group()) })
      run Format.format("trust anchor   #{anchor} in the snapshot\nintermediates  {count}\nmatched name   SAN #{san}\n", &.{ anchor: evidence.anchorIndex(), count: evidence.intermediateIndices().length, san: evidence.sanIndex() })
      let leaf = match move run Certificate.decodeDer(evidence.leafDer(), DecodeLimits.defaults()) {
        Result.Success { value } => move value
        Result.Failure { error } => { fail move error }
      }
      let expires = leaf.notAfter()
      run Format.format("leaf expires   {year}-{m1}{m2}-{d1}{d2}\n", &.{ year: expires.year, m1: expires.month / 10, m2: expires.month % 10, d1: expires.day / 10, d2: expires.day % 10 })
    }
  }
}
```

The evidence is everything the handshake proved: the cipher suite and key-exchange group, which anchor the path reached, which of the server's certificates were used as intermediates, which subjectAltName entry matched, and the leaf certificate itself as DER. Logging it is cheap and makes trust problems much easier to debug.

## Reporting failures

When the handshake fails, `withClient` fails with `ConnectionError`. Its `Tls` case carries a `TlsError` that says which step failed:

```silk
fn explain(error: TlsError) -> string<'static> {
  return match move error {
    TlsError.CertificatePath { error: failure } => match failure.reason {
      ValidationReason.NoIssuer => "no trusted issuer for the server's certificate"
      ValidationReason.InvalidTime => "a certificate is expired or not yet valid"
      ValidationReason.InvalidSignature => "a certificate signature does not verify"
      _ => "the certificate path was rejected"
    }
    TlsError.CertificateIdentity { .. } => "the certificate does not name this host"
    TlsError.CertificateVerify { .. } => "the server did not prove it holds the certificate's key"
    TlsError.PeerAlert { .. } => "the server sent a TLS alert"
    TlsError.UnsupportedProfile => "the server chose something this TLS 1.3 client does not support"
    _ => "the TLS handshake failed"
  }
}
```

`CertificatePath` carries the same `ValidationError` that `CertificatePath.validate` returns. `CertificateIdentity` means the path was fine but the name did not match. The other cases of `ConnectionError` are `HandshakeTimeout` and `Io`, for transport failures. The full program, with `main`, the argument parsing and the status-line reader, is in the program files.

## Try it

Build the program, and create the project with `silk init tlsget` if you have not:

```sh
cd ~/tlsget
silk build
```

Connect to the server that presents `good.pem`, trusting only the private CA:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tlsget 127.0.0.1 8443 /home/you/pki/ca.pem
```

```
trust          1 anchors from /home/you/pki/ca.pem
cipher suite   TLS_AES_256_GCM_SHA384
key exchange   X25519
trust anchor   #0 in the snapshot
intermediates  0
matched name   SAN #0
leaf expires   2029-01-22
response       HTTP/1.1 200 OK
```

The leaf's first subjectAltName entry, `IP:127.0.0.1`, matched. `localhost` would not work here, because the Silk resolver does not resolve it; use `127.0.0.1`.

The server on 8445 presents the leaf and the intermediate. The path now runs through one intermediate to the same root:

```
trust          1 anchors from /home/you/pki/ca.pem
cipher suite   TLS_AES_256_GCM_SHA384
key exchange   X25519
trust anchor   #0 in the snapshot
intermediates  1
matched name   SAN #0
leaf expires   2029-01-22
response       HTTP/1.1 200 OK
```

The server on 8444 has a certificate from the same CA that names only `wrong.test`:

```
trust          1 anchors from /home/you/pki/ca.pem
tlsget: the certificate does not name this host
```

And the system bundle does not know the private CA:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tlsget 127.0.0.1 8443 system
```

```
trust          122 anchors from system
tlsget: no trusted issuer for the server's certificate
```

The anchor count depends on your system.

Against a public host with system trust, the same code works unchanged:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tlsget example.com 443 system
```

```
trust          122 anchors from system
cipher suite   TLS_CHACHA20_POLY1305_SHA256
key exchange   X25519
trust anchor   #118 in the snapshot
intermediates  1
matched name   SAN #0
leaf expires   2026-11-19
response       HTTP/1.1 200 OK
```

The suite, anchor and dates you see will differ. The machine this was run on sends outbound HTTPS through an intercepting proxy whose CA is in the system bundle, so the chain above is the proxy's. The handshake, path validation and name check are the same either way.

Now the offline checks. A good chain:

```sh
./build/llvm/x86_64-unknown-linux-gnu/debug/tlsget check 127.0.0.1 /home/you/pki/good.pem /home/you/pki/ca.pem
```

```
chain          1 certificates, leaf expires 2029-01-22
path           valid, to trust anchor #0 through 0 intermediates
name           127.0.0.1 matches SAN #0
```

The chain with an intermediate:

```
chain          2 certificates, leaf expires 2029-01-22
path           valid, to trust anchor #0 through 1 intermediates
name           127.0.0.1 matches SAN #0
```

The expired certificate. The name still matches, because the two checks are independent:

```
chain          1 certificates, leaf expires 2021-01-01
path           rejected: a certificate is expired or not yet valid
name           127.0.0.1 matches SAN #0
```

The certificate for the wrong name. Its path is fine:

```
chain          1 certificates, leaf expires 2029-01-22
path           valid, to trust anchor #0 through 0 intermediates
name           127.0.0.1 is not a name in the certificate
```

And `good.pem` against the system roots:

```
chain          1 certificates, leaf expires 2029-01-22
path           rejected: no trusted issuer
name           127.0.0.1 matches SAN #0
```

`check` exits with 1 whenever either check fails, so a script can use it to test a certificate before deploying it.

A few input errors, each from a different stage:

```
$ tlsget 127.0.0.1 8443 ca.pem
tlsget: a file path is not absolute, or the file could not be read
$ tlsget 127.0.0.1 8443 /nope/ca.pem
tlsget: could not load the trust file
$ tlsget localhost 8443 /home/you/pki/ca.pem
trust          1 anchors from /home/you/pki/ca.pem
tlsget: the host could not be resolved
```

## Choices worth noting

- **Load trust once.** Loading and parsing a system bundle of over a hundred certificates is real work. A long-running program should load a snapshot at startup and reuse it; `withClient` consumes the snapshot, so pass each connection a `TrustSnapshot.copy`.
- **Trust as little as you can.** If a program only talks to your own services, give it a snapshot with only your CA. Then a certificate from any public CA, even a valid one for the right name, is rejected.
- **Check the name you meant.** Build the reference identity from the host in the URL or the configuration, never from a resolved address or a redirect you have not checked.
- **Handle truncation.** If you read a response to its end, treat `TlsError.Truncated` as "the response may be incomplete", unless the protocol on top, such as HTTP with a `Content-Length`, already tells you where the message ends.

## API reference

- `silk/tls/trust_source`: `TrustSource`
- `silk/tls/trust_snapshot`: `TrustSnapshot`, `TrustLoadLimits`, `SnapshotLimits`, `TrustSourceError`
- `silk/tls/trust_anchor`: `TrustAnchor`
- `silk/tls/trust_source_native`: `NativeFileTrustSource`
- `silk/tls/trust_source_memory`: `MemoryTrustSource`
- `silk/tls/certificate`: `Certificate`, `CertificateTime`, `DecodeLimits`, `DecodeError`
- `silk/tls/certificate_bundle`: `CertificateBundle`
- `silk/tls/certificate_path`: `CertificatePath`, `ValidatedPath`, `ValidationError`, `ValidationReason`, `ValidationLimits`, `RevocationStatus`
- `silk/tls/certificate_identities`: `CertificateSan`, `SanDecodeLimits`
- `silk/tls/https_identity`: `HttpsIdentity`, `OriginHost`, `ReferenceIdentity`, `PresentedIdentity`, `CertificateIdentities`, `IdentityLimits`
- `silk/tls/client`: `ClientConfig`, `AlpnConfig`, `ClientLimits`, `Authentication`, `NamedGroup`, `TlsError`
- `silk/tls/record`: `CipherSuite`
- `silk/tls/connection`: `withClient`, `authenticateOwned`, `OwnedConnection`, `ConnectionOptions`, `ConnectionError`
- `silk/system/system_clock`: `SystemClock`, `Instant`
- `silk/system/random`: `Random`
