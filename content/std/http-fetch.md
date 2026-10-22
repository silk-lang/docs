Send one HTTP request, follow redirects, decode the content, and deliver the body to a
destination that you choose.

## When to use
Use this module when you need more control than `silk.http_client`: a sink for a large body, a
body that you stream, content decoding, a proxy, or a connection pool. Make a [`Fetch`](#Fetch) around a
[`FetchClient`](#FetchClient), such as the `Context` of `silk.http_fetch_native`. Then call one function for
each request.

## Details
There are three destinations:
- `toSink*` gives the body to a [`Sink`](#Sink) in chunks, in order.
- `collect*` reads the whole body into memory, up to `maxBodyBytes`, and returns it only if it
  is complete.
- `discard*` reads and checks the body, and keeps nothing.

The suffix tells what the request body is:
- `Empty`: no body.
- `Bytes`: a byte slice. It is sent again after a redirect that keeps the body.
- `OneShot`: a `BodyProducer` that can run only one time. A redirect that must send the body
  again fails with `ReplayUnavailable`.
- `Replay`: a factory that makes a new producer for each attempt.

[`FetchOptions`](#FetchOptions) sets redirects, content decoding, the pool, the proxy, one deadline for the
whole operation, and all limits. `silk.http_redirect` applies the redirect rules, and
`silk.http_content` decodes the content.

## Errors
- [`FetchError`](#FetchError) tells the phase and the reason, with the status and the URI when they are
  known, and how many body bytes the destination got.
- `RedirectError`, `ExchangeError`, `ValueError`, and `BodyError` from the lower modules.
- [`DestinationFailure`](#DestinationFailure) when your [`Sink`](#Sink) fails.
- `OutOfMemoryError` if the `Allocator` fails.

## Gotchas
The deadline is not renewed between redirects or phases. The default [`FetchOptions`](#FetchOptions) do not
follow redirects and do not decode content. Set `redirect` and `content` to change that.

Import as `Fetch` with `import silk.http_fetch { Fetch }`.

Public declarations: 30.

::Anchor{id="PoolMode"}

## `PoolMode`

```silk
pub enum PoolMode
```

Whether a connection can come from a pool.

::Anchor{id="PoolMode.UseContextPool"}

### `UseContextPool`

```silk
UseContextPool
```

Use the pool of the client when it has one. Otherwise open a new connection.

::Anchor{id="PoolMode.Fresh"}

### `Fresh`

```silk
Fresh
```

Always open a new connection, and never put it in a pool.

::Anchor{id="ProxyMode"}

## `ProxyMode`

```silk
pub enum ProxyMode
```

Whether the request uses the proxy policy of the client.

::Anchor{id="ProxyMode.InheritContext"}

### `InheritContext`

```silk
InheritContext
```

Use the proxy policy of the client. The route is selected again for each redirect.

::Anchor{id="ProxyMode.Direct"}

### `Direct`

```silk
Direct
```

Connect directly to the origin, without a proxy. Environment variables are not read.

::Anchor{id="FetchPhase"}

## `FetchPhase`

```silk
pub enum FetchPhase
```

The phase of a fetch in which an error occurred.

::Anchor{id="FetchPhase.Uri"}

### `Uri`

```silk
Uri
```

Checking or copying the URI.

::Anchor{id="FetchPhase.Route"}

### `Route`

```silk
Route
```

Selecting the route for an origin.

::Anchor{id="FetchPhase.Connect"}

### `Connect`

```silk
Connect
```

Getting a connection: the pool, name lookup, the connect, or TLS.

::Anchor{id="FetchPhase.Request"}

### `Request`

```silk
Request
```

Preparing or sending the request.

::Anchor{id="FetchPhase.Redirect"}

### `Redirect`

```silk
Redirect
```

Applying the redirect rules.

::Anchor{id="FetchPhase.Head"}

### `Head`

```silk
Head
```

Reading or copying the final response head.

::Anchor{id="FetchPhase.Decode"}

### `Decode`

```silk
Decode
```

Decoding the content, the framing, or the trailers.

::Anchor{id="FetchPhase.Destination"}

### `Destination`

```silk
Destination
```

Giving the body to the sink, the collection, or the discard.

::Anchor{id="FetchPhase.Finish"}

### `Finish`

```silk
Finish
```

Completing the response and deciding if the connection can be used again.

::Anchor{id="FetchLimit"}

## `FetchLimit`

```silk
pub enum FetchLimit
```

The fetch limit that was exceeded. See [`FetchReason.LimitExceeded`](#FetchReason.LimitExceeded).

::Anchor{id="FetchLimit.EncodedBodyBytes"}

### `EncodedBodyBytes`

```silk
EncodedBodyBytes
```

`maxEncodedBodyBytes`: the body bytes before decoding.

::Anchor{id="FetchLimit.DeliveredBodyBytes"}

### `DeliveredBodyBytes`

```silk
DeliveredBodyBytes
```

`maxDeliveredBodyBytes`: the body bytes given to the destination.

::Anchor{id="FetchLimit.OwnedMetadataBytes"}

### `OwnedMetadataBytes`

```silk
OwnedMetadataBytes
```

`maxOwnedMetadataBytes`: the copies of the URI, the head, and the trailers.

::Anchor{id="FetchLimit.BufferedBytes"}

### `BufferedBytes`

```silk
BufferedBytes
```

`maxBufferedBytes`: the read buffer.

::Anchor{id="FetchLimit.CollectionBytes"}

### `CollectionBytes`

```silk
CollectionBytes
```

The `maxBodyBytes` of a `collect*` function.

::Anchor{id="FetchLimit.DiscardBytes"}

### `DiscardBytes`

```silk
DiscardBytes
```

The `maxDiscardBytes` of a `discard*` function.

::Anchor{id="FetchContentReason"}

## `FetchContentReason`

```silk
pub union FetchContentReason
```

The reason that content decoding failed. It is a copy of the `silk.http_content` error that does
not borrow the response.

::Anchor{id="FetchContentReason.InvalidLimit"}

### `InvalidLimit`

```silk
InvalidLimit
```

A content limit is not valid, or a byte count exceeded it.

::Anchor{id="FetchContentReason.InvalidLimit.limit"}

#### Field `limit`

```silk
pub limit: ContentLimitKind
```

The limit.

::Anchor{id="FetchContentReason.InvalidLimit.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The value of the limit.

::Anchor{id="FetchContentReason.InvalidLimit.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The value that was found.

::Anchor{id="FetchContentReason.CodingSyntax"}

### `CodingSyntax`

```silk
CodingSyntax
```

An item in `Content-Encoding` is empty or not valid.

::Anchor{id="FetchContentReason.CodingSyntax.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

Where the item is.

::Anchor{id="FetchContentReason.UnsupportedCoding"}

### `UnsupportedCoding`

```silk
UnsupportedCoding
```

A content coding has no decoder, for example `br`.

::Anchor{id="FetchContentReason.UnsupportedCoding.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

Where the coding is.

::Anchor{id="FetchContentReason.UnsupportedCoding.token"}

#### Field `token`

```silk
pub token: Bytes
```

A copy of the coding name.

::Anchor{id="FetchContentReason.PartialResponse"}

### `PartialResponse`

```silk
PartialResponse
```

A 206 partial response has a coding other than `identity`, which cannot be decoded.

::Anchor{id="FetchContentReason.PartialResponse.position"}

#### Field `position`

```silk
pub position: CodingPosition
```

The first coding that is not `identity`.

::Anchor{id="FetchContentReason.Tunnel"}

### `Tunnel`

```silk
Tunnel
```

The response body is a tunnel, not content.

::Anchor{id="FetchContentReason.Body"}

### `Body`

```silk
Body
```

The body framing failed.

::Anchor{id="FetchContentReason.Body.error"}

#### Field `error`

```silk
pub error: BodyError
```

The error from `silk.http_body`.

::Anchor{id="FetchContentReason.Buffer"}

### `Buffer`

```silk
Buffer
```

Reading from the transport failed.

::Anchor{id="FetchContentReason.Buffer.error"}

#### Field `error`

```silk
pub error: BufferError
```

The error, with its transport cause.

::Anchor{id="FetchContentReason.Inflate"}

### `Inflate`

```silk
Inflate
```

Gzip or zlib decoding failed.

::Anchor{id="FetchContentReason.Inflate.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0, counted from the last coding.

::Anchor{id="FetchContentReason.Inflate.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="FetchContentReason.Inflate.error"}

#### Field `error`

```silk
pub error: DecodeError
```

The error from `silk.inflate`.

::Anchor{id="FetchContentReason.Zstandard"}

### `Zstandard`

```silk
Zstandard
```

Zstandard decoding failed.

::Anchor{id="FetchContentReason.Zstandard.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0, counted from the last coding.

::Anchor{id="FetchContentReason.Zstandard.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="FetchContentReason.Zstandard.error"}

#### Field `error`

```silk
pub error: ZstdError
```

The error from `silk.zstd`.

::Anchor{id="FetchContentReason.TrailingEncodedData"}

### `TrailingEncodedData`

```silk
TrailingEncodedData
```

There were more bytes after the end of a compressed stream.

::Anchor{id="FetchContentReason.TrailingEncodedData.stage"}

#### Field `stage`

```silk
pub stage: usize
```

The decoding stage, from 0, counted from the last coding.

::Anchor{id="FetchContentReason.TrailingEncodedData.wireIndex"}

#### Field `wireIndex`

```silk
pub wireIndex: usize
```

The position of the coding in `Content-Encoding`, from 0.

::Anchor{id="FetchContentReason.ArithmeticOverflow"}

### `ArithmeticOverflow`

```silk
ArithmeticOverflow
```

A byte count overflowed.

::Anchor{id="FetchContentReason.InvalidState"}

### `InvalidState`

```silk
InvalidState
```

The content reader had already failed or stopped.

::Anchor{id="FetchContentError"}

## `FetchContentError`

```silk
pub struct FetchContentError
```

A content decoding error, with byte counts. It owns its data.

::Anchor{id="FetchContentError.reason"}

### Field `reason`

```silk
pub reason: FetchContentReason
```

The reason.

::Anchor{id="FetchContentError.written"}

### Field `written`

```silk
pub written: usize
```

The bytes written to the current output chunk.

::Anchor{id="FetchContentError.totalEncoded"}

### Field `totalEncoded`

```silk
pub totalEncoded: u64
```

The total encoded bytes read.

::Anchor{id="FetchContentError.totalIntermediate"}

### Field `totalIntermediate`

```silk
pub totalIntermediate: u64
```

The total bytes from decoding stages before the last one.

::Anchor{id="FetchContentError.totalDecoded"}

### Field `totalDecoded`

```silk
pub totalDecoded: u64
```

The total decoded bytes.

::Anchor{id="FetchReason"}

## `FetchReason`

```silk
pub union FetchReason
```

The reason of a [`FetchError`](#FetchError).

::Anchor{id="FetchReason.InvalidOptions"}

### `InvalidOptions`

```silk
InvalidOptions
```

The [`FetchOptions`](#FetchOptions) are not valid. See [`FetchOptions.validate`](#FetchOptions.impl.validate).

::Anchor{id="FetchReason.InvalidHttpOptions"}

### `InvalidHttpOptions`

```silk
InvalidHttpOptions
```

The client rejected the HTTP limits in the options.

::Anchor{id="FetchReason.InvalidHttpOptions.error"}

#### Field `error`

```silk
pub error: ExchangeError
```

The error from the client.

::Anchor{id="FetchReason.HttpValue"}

### `HttpValue`

```silk
HttpValue
```

Copying an HTTP value failed.

::Anchor{id="FetchReason.HttpValue.error"}

#### Field `error`

```silk
pub error: ValueError
```

The error from `silk.http`.

::Anchor{id="FetchReason.HttpBody"}

### `HttpBody`

```silk
HttpBody
```

The body or the trailers of the final response are not valid.

::Anchor{id="FetchReason.HttpBody.error"}

#### Field `error`

```silk
pub error: BodyError
```

The error from `silk.http_body`.

::Anchor{id="FetchReason.HttpClient"}

### `HttpClient`

```silk
HttpClient
```

The exchange failed while the body of the final response was read.

::Anchor{id="FetchReason.HttpClient.error"}

#### Field `error`

```silk
pub error: ExchangeError
```

The error from `silk.http_exchange`.

::Anchor{id="FetchReason.SizeOverflow"}

### `SizeOverflow`

```silk
SizeOverflow
```

A byte count overflowed.

::Anchor{id="FetchReason.DestinationRejected"}

### `DestinationRejected`

```silk
DestinationRejected
```

Your sink rejected a chunk.

::Anchor{id="FetchReason.Content"}

### `Content`

```silk
Content
```

Content decoding failed.

::Anchor{id="FetchReason.Content.error"}

#### Field `error`

```silk
pub error: FetchContentError
```

The content error.

::Anchor{id="FetchReason.LimitExceeded"}

### `LimitExceeded`

```silk
LimitExceeded
```

A limit in [`FetchOptions`](#FetchOptions) or in the call was exceeded.

::Anchor{id="FetchReason.LimitExceeded.limit"}

#### Field `limit`

```silk
pub limit: FetchLimit
```

The limit.

::Anchor{id="FetchReason.LimitExceeded.allowed"}

#### Field `allowed`

```silk
pub allowed: u64
```

The value of the limit.

::Anchor{id="FetchReason.LimitExceeded.attempted"}

#### Field `attempted`

```silk
pub attempted: u64
```

The value that was found.

::Anchor{id="FetchReason.UnsupportedSwitchingResponse"}

### `UnsupportedSwitchingResponse`

```silk
UnsupportedSwitchingResponse
```

The final response is 101 Switching Protocols, or a 2xx for `CONNECT`. Fetch cannot use the
connection after such a response.

::Anchor{id="FetchReason.UnsupportedSwitchingResponse.status"}

#### Field `status`

```silk
pub status: Status
```

The status of the response.

::Anchor{id="FetchError"}

## `FetchError`

```silk
pub struct FetchError
```

The error from a fetch, with context. It owns its data.

### Details

It tells the phase and the reason, with the status and the URI when they are known, and how
many body bytes the destination got.

::Anchor{id="FetchError.phase"}

### Field `phase`

```silk
pub phase: FetchPhase
```

The phase in which the error occurred.

::Anchor{id="FetchError.reason"}

### Field `reason`

```silk
pub reason: FetchReason
```

The reason.

::Anchor{id="FetchError.status"}

### Field `status`

```silk
pub status: Option<Status>
```

The status of the final response, when it is known.

::Anchor{id="FetchError.uri"}

### Field `uri`

```silk
pub uri: Option<OwnedUri>
```

A copy of the current URI, when it is known.

::Anchor{id="FetchError.deliveredBodyBytes"}

### Field `deliveredBodyBytes`

```silk
pub deliveredBodyBytes: u64
```

The body bytes that the destination accepted before the error.

::Anchor{id="FetchError.offeredBodyBytes"}

### Field `offeredBodyBytes`

```silk
pub offeredBodyBytes: usize
```

The length of the chunk that the destination rejected, or 0.

::Anchor{id="DestinationFailure"}

## `DestinationFailure`

```silk
pub struct DestinationFailure<E>
```

The error from your [`Sink`](#Sink), with the context of the fetch.

::Anchor{id="DestinationFailure.error"}

### Field `error`

```silk
pub error: E
```

The error from your sink.

::Anchor{id="DestinationFailure.context"}

### Field `context`

```silk
pub context: FetchError
```

The context: the phase, the status, the URI, and the bytes delivered before the error.

::Anchor{id="RepresentationMetadata"}

## `RepresentationMetadata`

```silk
pub struct RepresentationMetadata
```

How the content of the response was decoded.

::Anchor{id="RepresentationMetadata.applied"}

### Field `applied`

```silk
pub applied: AppliedPlan
```

The decoding plan that was used: raw, or which codings were decoded.

::Anchor{id="RepresentationMetadata.completed"}

### Field `completed`

```silk
pub completed: bool
```

`true` when the framing and all decoding completed.

::Anchor{id="RepresentationMetadata.deliveredBytes"}

### Field `deliveredBytes`

```silk
pub deliveredBytes: Option<u64>
```

The number of body bytes delivered, after completion.

::Anchor{id="ResponseMetadata"}

## `ResponseMetadata`

```silk
pub struct ResponseMetadata
```

The head of the final response, and how its content is decoded. Your sink gets it with each
chunk.

::Anchor{id="ResponseMetadata.finalUri"}

### Field `finalUri`

```silk
pub finalUri: OwnedUri
```

The URI of the final response, after redirects.

::Anchor{id="ResponseMetadata.head"}

### Field `head`

```silk
pub head: OwnedResponseHead
```

The status, the reason, and the headers of the final response, as received.

::Anchor{id="ResponseMetadata.representation"}

### Field `representation`

```silk
pub representation: RepresentationMetadata
```

How the content is decoded. The headers are not changed by decoding.

::Anchor{id="ResponseMetadata.ownedBytes"}

### Field `ownedBytes`

```silk
pub ownedBytes: usize
```

The memory of the URI and head copies, in bytes.

::Anchor{id="FetchResult"}

## `FetchResult`

```silk
pub struct FetchResult
```

The result of a complete response, without the body.

::Anchor{id="FetchResult.metadata"}

### Field `metadata`

```silk
pub metadata: ResponseMetadata
```

The final URI and head.

::Anchor{id="FetchResult.trailers"}

### Field `trailers`

```silk
pub trailers: Option<OwnedTrailers>
```

The trailers of a chunked response, if any.

::Anchor{id="FetchResult.redirectCount"}

### Field `redirectCount`

```silk
pub redirectCount: usize
```

The number of redirects that were followed.

::Anchor{id="FetchResult.encodedBodyBytes"}

### Field `encodedBodyBytes`

```silk
pub encodedBodyBytes: u64
```

The body bytes before decoding.

::Anchor{id="FetchResult.deliveredBodyBytes"}

### Field `deliveredBodyBytes`

```silk
pub deliveredBodyBytes: u64
```

The body bytes that the destination accepted.

::Anchor{id="FetchResult.ownedMetadataBytes"}

### Field `ownedMetadataBytes`

```silk
pub ownedMetadataBytes: usize
```

The memory of the URI, head, and trailer copies, in bytes.

::Anchor{id="CollectedResponse"}

## `CollectedResponse`

```silk
pub struct CollectedResponse
```

The result of a `collect*` function: the response and its whole body.

::Anchor{id="CollectedResponse.result"}

### Field `result`

```silk
pub result: FetchResult
```

The response without the body.

::Anchor{id="CollectedResponse.body"}

### Field `body`

```silk
pub body: Bytes
```

The whole body, decoded as selected in the options.

::Anchor{id="FetchRequest"}

## `FetchRequest`

```silk
pub struct FetchRequest<'uri, 'method, 'headers, 'policy>
```

The method, URI, headers, and header policy of a request. The body comes from the function that
you call.

::Anchor{id="FetchRequest.impl"}

## Implementation `FetchRequest<'uri, 'method, 'headers, 'policy>`

```silk
impl<'uri, 'method, 'headers, 'policy> FetchRequest<'uri, 'method, 'headers, 'policy>
```

::Anchor{id="FetchRequest.impl.make"}

### Associated function `make`

```silk
pub fn make(
    uri: Uri<'uri>,
    method: Method<'method>,
    headers: Headers<'headers>,
    headerPolicy: HeaderPolicy<'policy>,
    version: Version,
    continuePolicy: ContinuePolicy,
    limits: HeaderLimits,
    maxHeadBytes: usize,
    maxCredentialBytes: usize,
  ) -> Self
```

Returns a request. `continuePolicy` selects `Expect: 100-continue`. The limits apply to the
head that is sent. See `prepare` in `silk.http_request`.

::Anchor{id="FetchRequest.impl.get"}

### Associated function `get`

```silk
pub fn get(uri: Uri<'uri>) -> Self
```

Returns a GET request for `uri`, with no headers, the default header policy, and the default
limits.

::Anchor{id="FetchOptions"}

## `FetchOptions`

```silk
pub struct FetchOptions
```

The settings of a fetch: redirects, content decoding, the pool, the proxy, one deadline for the
whole operation, and all limits. Start from [`FetchOptions.defaults`](#FetchOptions.impl.defaults).

### Gotchas

The deadline is not renewed between redirects or phases. The defaults do not follow redirects
and do not decode content. Set `redirect` and `content` to change that.

::Anchor{id="FetchOptions.redirect"}

### Field `redirect`

```silk
pub redirect: RedirectPolicy
```

Whether and how to follow redirects. See `silk.http_redirect`.

::Anchor{id="FetchOptions.content"}

### Field `content`

```silk
pub content: ContentMode
```

Whether to give the body raw or decoded. See `silk.http_content`.

::Anchor{id="FetchOptions.pool"}

### Field `pool`

```silk
pub pool: PoolMode
```

Whether a connection can come from a pool.

::Anchor{id="FetchOptions.proxy"}

### Field `proxy`

```silk
pub proxy: ProxyMode
```

Whether to use the proxy policy of the client.

::Anchor{id="FetchOptions.deadline"}

### Field `deadline`

```silk
pub deadline: Option<Instant>
```

One deadline on the `MonotonicClock` for the whole operation, including all redirects.

::Anchor{id="FetchOptions.http"}

### Field `http`

```silk
pub http: ClientLimits
```

The limits for the HTTP exchange: heads, framing, trailers, and buffers.

::Anchor{id="FetchOptions.contentLimits"}

### Field `contentLimits`

```silk
pub contentLimits: ContentLimits
```

The limits for content decoding.

::Anchor{id="FetchOptions.maxEncodedBodyBytes"}

### Field `maxEncodedBodyBytes`

```silk
pub maxEncodedBodyBytes: u64
```

The maximum body bytes before decoding.

::Anchor{id="FetchOptions.maxDeliveredBodyBytes"}

### Field `maxDeliveredBodyBytes`

```silk
pub maxDeliveredBodyBytes: u64
```

The maximum body bytes that any destination gets.

::Anchor{id="FetchOptions.maxOwnedMetadataBytes"}

### Field `maxOwnedMetadataBytes`

```silk
pub maxOwnedMetadataBytes: usize
```

The maximum memory for the copies of the URI, the head, and the trailers.

::Anchor{id="FetchOptions.maxBufferedBytes"}

### Field `maxBufferedBytes`

```silk
pub maxBufferedBytes: usize
```

The size of the read buffer for the body. It must not be 0.

::Anchor{id="FetchOptions.impl"}

## Implementation `FetchOptions`

```silk
impl FetchOptions
```

::Anchor{id="FetchOptions.impl.defaults"}

### Associated function `defaults`

```silk
pub fn defaults() -> FetchOptions
```

Returns options that do not follow redirects, do not decode content, use the pool and proxy
policy of the client, have no deadline, and allow bodies of 16 MiB.

::Anchor{id="FetchOptions.impl.validate"}

### Method `validate`

```silk
pub fn validate(self: &Self) -> Result<(), FetchError>
```

Checks that the options are consistent. It does not allocate or connect. Each fetch function
calls it first.

::Anchor{id="Fetch"}

## `Fetch`

```silk
pub struct Fetch<C>
```

A fetch client around a [`FetchClient`](#FetchClient). Make it with [`Fetch.make`](#Fetch.impl.make), and pass it to the fetch
functions.

### When to use

Use it when you need more control than `silk.http_client`: a sink for a large body, a body that
you stream, content decoding, a proxy, or a connection pool. Use the `Context` of
`silk.http_fetch_native` as the client.

### Details

Each fetch function sends one request, follows redirects, decodes the content, and delivers the
body. The prefix of the function name tells the destination: `toSink*` gives the body to a
[`Sink`](#Sink) in chunks, in order; `collect*` reads the whole body into memory, up to
`maxBodyBytes`, and returns it only if it is complete; `discard*` reads and checks the body and
keeps nothing. The suffix tells the request body: `Empty`; `Bytes`, sent again after a redirect
that keeps the body; `OneShot`, a producer that runs one time, so a redirect that must send the
body again fails with `ReplayUnavailable`; or `Replay`, a factory that makes a new producer for
each attempt.

### Gotchas

The deadline is not renewed between redirects or phases. The default [`FetchOptions`](#FetchOptions) do not
follow redirects and do not decode content.

::Anchor{id="Fetch.impl"}

## Implementation `Fetch<C>`

```silk
impl<C> Fetch<C>
```

::Anchor{id="Fetch.impl.make"}

### Associated function `make`

```silk
pub fn make(client: C) -> Fetch<C>
```

Returns a fetch client that uses `client` to get connections.

::Anchor{id="Sink"}

## `Sink`

```silk
pub interface Sink<E, ?R>
```

A destination for the body chunks of a `toSink*` function. The chunks arrive in order. A
failure of the sink becomes a [`DestinationFailure`](#DestinationFailure).

::Anchor{id="Sink.write"}

### Operation `write`

```silk
effect<'call> fn write<'call>(
    sink: &mut Self,
    metadata: &'call ResponseMetadata,
    chunk: &'call [u8],
    deadline: &'call Option<Instant>,
  ) -> () ! E ? R
```

Accepts one chunk of the body.

#### Details
`metadata` is the final response head. `deadline` is the deadline of the whole fetch, or
`None`. The fetch reads no more body until this call returns. The chunk and the metadata are
only borrowed for this call.

::Anchor{id="FetchClient"}

## `FetchClient`

```silk
pub interface FetchClient<
  'policy,
  RoutedP,
  DirectP,
  A,
  HandlerError,
  AcquisitionError,
  ?HandlerRequirements,
  ?AcquisitionRequirements,
>
```

Gets a connection and runs one attempt of a request. A fetch calls it again for each redirect.

### Details
An implementation checks the options before it connects, and selects the route for the current
URI. With `Fresh`, it does not use a pool. With `Direct`, it does not use a proxy policy.
`deadline` is the deadline of the whole fetch.

::Anchor{id="FetchClient.withAttempt"}

### Operation `withAttempt`

```silk
effect fn withAttempt(
    client: &mut Self,
    request: AttemptRequest<'policy>,
    httpLimits: ClientLimits,
    poolMode: PoolMode,
    proxyMode: ProxyMode,
    deadline: Option<Instant>,
  ) -> A ! HandlerError | AcquisitionError ? HandlerRequirements | AcquisitionRequirements | &mut HybridAttempt<'policy, RoutedP, DirectP, A, HandlerError ? HandlerRequirements> where
    HandlerRequirements in Without<HandlerRequirements, ByteDuplex>,
    HandlerRequirements in Without<HandlerRequirements, HttpTransport>
```

Connects and runs one attempt of `request` with these limits and modes.

::Anchor{id="toSinkEmpty"}

## `toSinkEmpty`

```silk
pub effect<'env> fn toSinkEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    SinkRequirements | &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError | AcquisitionError
? SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with no body, and gives the body of the final response to `sink` in chunks.

::Anchor{id="collectEmpty"}

## `collectEmpty`

```silk
pub effect fn collectEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with no body, and returns the body of the final response in memory. More than
`maxBodyBytes` fails, and no partial body is returned.

::Anchor{id="discardEmpty"}

## `discardEmpty`

```silk
pub effect fn discardEmpty<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with no body, and reads and checks the body of the final response without
keeping it. More than `maxDiscardBytes` fails.

::Anchor{id="toSinkBytes"}

## `toSinkBytes`

```silk
pub effect<'env> fn toSinkBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    SinkRequirements | &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | DestinationFailure<SinkError> | ExchangeError | OutOfMemoryError | AcquisitionError
? SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with the body `bytes`, and gives the body of the final response to `sink` in
chunks.

::Anchor{id="collectBytes"}

## `collectBytes`

```silk
pub effect fn collectBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with the body `bytes`, and returns the body of the final response in memory.
More than `maxBodyBytes` fails, and no partial body is returned.

::Anchor{id="discardBytes"}

## `discardBytes`

```silk
pub effect fn discardBytes<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  'bytes,
  RoutedP,
  DirectP,
  AcquisitionError,
  ?AcquisitionRequirements,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    &mut Redirect.SelectedBody<never, never> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  bytes: &'bytes [u8],
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ExchangeError | OutOfMemoryError | AcquisitionError
? AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request with the body `bytes`, and reads and checks the body of the final response
without keeping it. More than `maxDiscardBytes` fails.

::Anchor{id="toSinkOneShot"}

## `toSinkOneShot`

```silk
pub effect<'env> fn toSinkOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?ProducerRequirements,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
      SinkError,
    > | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | SinkRequirements | &mut Redirect.SelectedBody<
      ProducerError,
      ProducerRequirements,
    > | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
  SinkError,
> | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from `producer` one time, and gives the body of the final
response to `sink` in chunks.

::Anchor{id="collectOneShot"}

## `collectOneShot`

```silk
pub effect<'env> fn collectOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  AcquisitionError,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from `producer` one time, and returns the body of the final
response in memory. More than `maxBodyBytes` fails, and no partial body is returned.

::Anchor{id="discardOneShot"}

## `discardOneShot`

```silk
pub effect<'env> fn discardOneShot<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  ProducerError,
  AcquisitionError,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Producer: BodyProducer<ProducerError ? ProducerRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  producer: Producer,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from `producer` one time, and reads and checks the body of the
final response without keeping it. More than `maxDiscardBytes` fails.

::Anchor{id="toSinkReplay"}

## `toSinkReplay`

```silk
pub effect<'env> fn toSinkReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  SinkError: Intrinsic.Detached,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?SinkRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  S: Sink<SinkError ? SinkRequirements> + 'env,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | DestinationFailure<
      SinkError,
    > | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | SinkRequirements | &mut Redirect.SelectedBody<
      ProducerError,
      ProducerRequirements,
    > | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  sink: S,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | DestinationFailure<
  SinkError,
> | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | SinkRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  FactoryRequirements in Without<FactoryRequirements, ByteDuplex>,
  FactoryRequirements in Without<FactoryRequirements, HttpTransport>,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  SinkRequirements in Without<SinkRequirements, ByteDuplex>,
  SinkRequirements in Without<SinkRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from a new producer from `factory` for each attempt, and gives
the body of the final response to `sink` in chunks.

::Anchor{id="collectReplay"}

## `collectReplay`

```silk
pub effect<'env> fn collectReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, CollectedResponse>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  maxBodyBytes: usize,
) -> CollectedResponse
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  FactoryRequirements in Without<FactoryRequirements, ByteDuplex>,
  FactoryRequirements in Without<FactoryRequirements, HttpTransport>,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from a new producer from `factory` for each attempt, and
returns the body of the final response in memory. More than `maxBodyBytes` fails, and no partial
body is returned.

::Anchor{id="discardReplay"}

## `discardReplay`

```silk
pub effect<'env> fn discardReplay<
  'fetch,
  'uri,
  'method,
  'headers,
  'policy,
  RoutedP,
  DirectP,
  FactoryError,
  ProducerError,
  AcquisitionError,
  ?FactoryRequirements,
  ?ProducerRequirements,
  ?AcquisitionRequirements,
  Factory: ReplayFactory<Producer, FactoryError, FactoryRequirements> + 'env,
  Producer: BodyProducer<ProducerError ? ProducerRequirements>,
  C: FetchClient<
    'policy,
    RoutedP,
    DirectP,
    Redirect.AttemptStep<'policy, FetchResult>,
    RedirectError | FetchError | ValueError | BodyError | ProducerError | ExchangeError | OutOfMemoryError,
    AcquisitionError,
    ProducerRequirements | &mut Redirect.SelectedBody<ProducerError, ProducerRequirements> | &mut MonotonicClock | &mut Allocator | &mut Random,
    AcquisitionRequirements,
  >,
  'env,
>(
  fetch: &'fetch mut Fetch<C>,
  request: FetchRequest<'uri, 'method, 'headers, 'policy>,
  factory: Factory,
  options: FetchOptions,
  maxDiscardBytes: u64,
) -> FetchResult
! RedirectError | FetchError | ValueError | BodyError | FactoryError | ProducerError | ExchangeError | OutOfMemoryError | AcquisitionError
? FactoryRequirements | ProducerRequirements | AcquisitionRequirements | &mut MonotonicClock | &mut Allocator | &mut Random
where
  &mut RoutedP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &HttpTransport from &mut HttpTransport,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut RoutedP provides &ByteDuplex from &mut ByteDuplex,
  &mut DirectP provides &HttpTransport from &mut HttpTransport | &mut MonotonicClock | &mut Allocator | &mut Random,
  &mut DirectP provides &HttpTransport from &mut HttpTransport,
  FactoryRequirements in Without<FactoryRequirements, ByteDuplex>,
  FactoryRequirements in Without<FactoryRequirements, HttpTransport>,
  ProducerRequirements in Without<ProducerRequirements, ByteDuplex>,
  ProducerRequirements in Without<ProducerRequirements, HttpTransport>,
  AcquisitionRequirements in Without<AcquisitionRequirements, ByteDuplex>,
  AcquisitionRequirements in Without<AcquisitionRequirements, HttpTransport>
```

Sends a request whose body comes from a new producer from `factory` for each attempt, and reads
and checks the body of the final response without keeping it. More than `maxDiscardBytes` fails.

Category: HTTP.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
