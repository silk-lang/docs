Each page describes the selected source API for the listed profiles. Distinct surfaces have separate pages.

| Module | Category | Import namespace | Summary |
| --- | --- | --- | --- |
| [`silk.build.plan`](/docs/std/build-plan) | Core | `Plan` | Build plans that a package's \`build.silk\` computes while the package compiles: modules it generates, native sources it compiles and native libraries it links. |
| [`silk.build.source`](/docs/std/build-source) | Core | `Source` | Files of the package read while it compiles: shaders, tables and other data the program keeps as part of its code. |
| [`silk.collections.bytes`](/docs/std/collections-bytes) | Collections | `Bytes` | Owned byte buffers for file contents, process output, and other data with no fixed encoding. |
| [`silk.collections.hash`](/docs/std/collections-hash) | Collections | `HashKey` | Deterministic seeded hashing for hash maps, hash sets, and key types that users define. |
| [`silk.collections.hash_map`](/docs/std/collections-hash-map) | Collections | `HashMap` | Hash maps that own their keys and values, with deterministic seeded hashing. |
| [`silk.collections.hash_set`](/docs/std/collections-hash-set) | Collections | `HashSet` | Hash sets that own their elements, with deterministic seeded hashing. |
| [`silk.collections.list`](/docs/std/collections-list) | Collections | `List` | Growable lists that own their elements, with stable sorting and binary search. |
| [`silk.collections.slice`](/docs/std/collections-slice) | Collections | `Slice` | Borrowed subranges and byte views of slices, with no copy and no allocation. |
| [`silk.color.color`](/docs/std/color-color) | Color | `Color` | Colors in the CSS Color 4 color spaces, with conversion, gamut mapping, mixing, adjustment, and contrast measurement. |
| [`silk.color.rgba`](/docs/std/color-rgba) | Color | `Rgba` | Red, green, blue, and alpha channels with straight or premultiplied alpha, over any number type. |
| [`silk.color.srgb`](/docs/std/color-srgb) | Color | `srgb` | The sRGB transfer function: conversion between gamma-encoded sRGB channels and linear light. |
| [`silk.compress.brotli`](/docs/std/compress-brotli) | Data formats | `Brotli` | Decompress Brotli data (RFC 7932) in steps, with fixed memory and limits that you set. |
| [`silk.compress.brotli_encode`](/docs/std/compress-brotli-encode) | Data formats | `BrotliEncoder` | Compress bytes as Brotli streams (RFC 7932), in steps or all at once, with qualities 0 to 11. |
| [`silk.compress.brotli_tables`](/docs/std/compress-brotli-tables) | Data formats | Not applicable | The static dictionary, word transforms, and literal context lookup table of Brotli (RFC 7932). |
| [`silk.compress.checksum`](/docs/std/compress-checksum) | Data formats | `CompressionChecksum` | CRC-32, Adler-32, and CRC-64 checksums used by gzip, zlib, ZIP, and XZ containers. |
| [`silk.compress.deflate`](/docs/std/compress-deflate) | Data formats | `Encoder` | Compress bytes as raw DEFLATE, zlib, or gzip, in steps or all at once, with zlib's levels, strategies, and flush modes. |
| [`silk.compress.inflate`](/docs/std/compress-inflate) | Data formats | `Decoder` | Decompress raw DEFLATE, zlib, and gzip data in steps, with fixed memory and limits that you set. |
| [`silk.compress.limits`](/docs/std/compress-limits) | Data formats | `compression` | Resource limits and failures for complete-buffer compression codecs. |
| [`silk.compress.lzma`](/docs/std/compress-lzma) | Data formats | `Lzma` | Decode complete LZMA-alone streams into caller-owned byte buffers. |
| [`silk.compress.lzma2`](/docs/std/compress-lzma2) | Data formats | `Lzma2` | Decode complete raw LZMA2 streams into caller-owned byte buffers. |
| [`silk.compress.lzma2_decode`](/docs/std/compress-lzma2-decode) | Data formats | `Lzma2Stream` | LZMA2 chunk framing shared by raw LZMA2 and XZ decoders. |
| [`silk.compress.lzma_decode`](/docs/std/compress-lzma-decode) | Data formats | `LzmaState` | Shared LZMA range decoder and probability models for LZMA, LZMA2, and XZ. |
| [`silk.compress.xz`](/docs/std/compress-xz) | Data formats | `Xz` | Decode XZ containers and verify their blocks, index, and footer. |
| [`silk.compress.zstd`](/docs/std/compress-zstd) | Data formats | `Zstd` | Decompress Zstandard data (RFC 8878) in steps, with fixed memory and limits that you set. |
| [`silk.compress.zstd_block`](/docs/std/compress-zstd-block) | Data formats | `BlockState` | Internal bounded zstd compressed-block decoding with retained entropy tables. |
| [`silk.compress.zstd_checksum`](/docs/std/compress-zstd-checksum) | Data formats | `Xxh64` | Incremental seed-zero XXH64 state for zstd frame checksums. |
| [`silk.compress.zstd_encode`](/docs/std/compress-zstd-encode) | Data formats | `ZstdEncoder` | Compress bytes as Zstandard frames (RFC 8878), in steps or all at once, with levels 1 to 22. |
| [`silk.concurrency.atomic`](/docs/std/concurrency-atomic) | Concurrency | `Atomic` | Atomic memory operations on raw pointers, with explicit memory orderings. |
| [`silk.concurrency.channel`](/docs/std/concurrency-channel) | Concurrency | `Channel` | Bounded channels that pass values between fibers on one thread. |
| [`silk.concurrency.execution`](/docs/std/concurrency-execution) | Concurrency | `Execution` | Lazy computations with their own storage, which an owner drives and resumes. |
| [`silk.concurrency.execution_storage`](/docs/std/concurrency-execution-storage) | Concurrency | `ExecutionStorage` | Storage for the private execution frames that the compiler makes. |
| [`silk.concurrency.execution_storage`](/docs/std/concurrency-execution-storage) | Concurrency | `ExecutionStorage` | Storage for the private execution frames that the compiler makes. |
| [`silk.concurrency.fiber`](/docs/std/concurrency-fiber) | Concurrency | `Fiber` | Fibers: handles to child tasks, with typed outcomes and one observer each. |
| [`silk.concurrency.local_scheduler`](/docs/std/concurrency-local-scheduler) | Concurrency | `LocalScheduler` | A deterministic, single-threaded scheduler for structured Fibers. |
| [`silk.concurrency.scheduler`](/docs/std/concurrency-scheduler) | Concurrency | `Scheduler` | The provider protocol that prepares child Fibers and publishes them atomically. |
| [`silk.concurrency.sync`](/docs/std/concurrency-sync) | Concurrency | `Arc` | Shared ownership, locks, condition variables and thread parking for values that several native threads use. |
| [`silk.concurrency.thread`](/docs/std/concurrency-thread) | Concurrency | `Transferable` | The normal names of the sealed thread properties \`Transferable\` and \`Concurrent\`. |
| [`silk.concurrency.thread_native`](/docs/std/concurrency-thread-native) | Concurrency | `NativeThread` | Operating-system threads that each run one \`Transferable\` closure and return its result. |
| [`silk.concurrency.thread_pool`](/docs/std/concurrency-thread-pool) | Concurrency | `ThreadPool` | A work-stealing pool of native threads that runs fibers in parallel. |
| [`silk.concurrency.work_queue`](/docs/std/concurrency-work-queue) | Concurrency | `WorkDeque` | Queues that move owned values between native threads, for work-stealing schedulers. |
| [`silk.core.bool`](/docs/std/core-bool) | Core | `bool` | Named functions for Boolean equality and negation. |
| [`silk.core.compilation`](/docs/std/core-compilation) | Core | `Compilation` | Build choices of the current compilation, such as safety, threading, and artifact kind, for use in static evaluation. |
| [`silk.core.effect`](/docs/std/core-effect) | Core | `Effect` | Combinators for lazy effect values: transform success, recover typed failures, supply services, and run cleanup. |
| [`silk.core.equal`](/docs/std/core-equal) | Core | `Equal` | The interface that gives user types the \`==\` and \`!=\` operators. |
| [`silk.core.ops`](/docs/std/core-ops) | Core | `Add` | The interfaces that give user types the arithmetic, bitwise, and logical operators. |
| [`silk.core.option`](/docs/std/core-option) | Core | `Option` | Optional owned values that are present or absent, with no explanation for the absence. |
| [`silk.core.order`](/docs/std/core-order) | Core | `Order` | The interface that gives user types the \`\<\`, \`\<=\`, \`\>\`, and \`\>=\` operators. |
| [`silk.core.ownership`](/docs/std/core-ownership) | Core | `Copy` | The ordinary names for the sealed ownership properties \`Copy\` and \`Drop\`. |
| [`silk.core.reflect`](/docs/std/core-reflect) | Core | `Reflect` | Compile-time descriptions of the fields of a struct or tuple type, for generic code that visits each field. |
| [`silk.core.result`](/docs/std/core-result) | Core | `Result` | Completed outcomes that hold a success value or a failure value as ordinary data. |
| [`silk.core.schedule`](/docs/std/core-schedule) | Core | `Schedule` | Schedules: policies that say when to run an effect again, and when to stop. |
| [`silk.core.static_sequence`](/docs/std/core-static-sequence) | Core | `StaticSequence` | Immutable lists of values that exist only during static evaluation. |
| [`silk.core.static_text`](/docs/std/core-static-text) | Core | `StaticText` | Operations on string literals during static evaluation: length, byte access, concatenation, and slices. |
| [`silk.core.target`](/docs/std/core-target) | Core | `Target` | Facts about the target machine of the current compilation: architecture, operating system, ABI, and pointer width. |
| [`silk.crypto.aes`](/docs/std/crypto-aes) | Cryptography | `Aes` | Encrypt data with the AES block cipher (FIPS 197) in ECB, CBC, CTR, CFB, or OFB mode (NIST SP 800-38A). |
| [`silk.crypto.aes_ccm`](/docs/std/crypto-aes-ccm) | Cryptography | `AesCcm` | Encrypt and authenticate data with AES-CCM (NIST SP 800-38C, RFC 3610). |
| [`silk.crypto.aes_gcm`](/docs/std/crypto-aes-gcm) | Cryptography | `AesGcm` | Encrypt and authenticate data with AES-128-GCM, AES-192-GCM, or AES-256-GCM (NIST SP 800-38D). |
| [`silk.crypto.aes_ocb`](/docs/std/crypto-aes-ocb) | Cryptography | `AesOcbEncryptor` | Encrypt and authenticate data with AES-OCB3 (RFC 7253), for a message in parts. |
| [`silk.crypto.aes_round`](/docs/std/crypto-aes-round) | Cryptography | `aes` | The steps of an AES round on one 16-byte state, computed with portable code: SubBytes, ShiftRows and MixColumns, and their inverses. |
| [`silk.crypto.aes_wrap`](/docs/std/crypto-aes-wrap) | Cryptography | `AesKeyWrap` | Wrap keys with the AES key wrap algorithms of RFC 3394 and RFC 5649 (NIST SP 800-38F KW, KWP). |
| [`silk.crypto.aes_xts`](/docs/std/crypto-aes-xts) | Cryptography | `AesXts` | Encrypt storage sectors with AES-XTS (IEEE 1619, NIST SP 800-38E). |
| [`silk.crypto.aria`](/docs/std/crypto-aria) | Cryptography | `Aria` | Encrypt with the ARIA block cipher (RFC 5794, KS X 1213). |
| [`silk.crypto.blake2b`](/docs/std/crypto-blake2b) | Cryptography | `Blake2b512` | Portable BLAKE2b-512 state for the unkeyed 64-byte cryptographic digest of RFC 7693. |
| [`silk.crypto.blake2s`](/docs/std/crypto-blake2s) | Cryptography | `Blake2s256` | Portable BLAKE2s-256 state for the unkeyed 32-byte cryptographic digest of RFC 7693. |
| [`silk.crypto.block_cipher`](/docs/std/crypto-block-cipher) | Cryptography | `BlockCipher` | Run any block cipher in the standard modes: ECB, CBC, CTR, CFB, CFB-8, CFB-1, and OFB. |
| [`silk.crypto.camellia`](/docs/std/crypto-camellia) | Cryptography | `Camellia` | Encrypt with the Camellia block cipher (RFC 3713, ISO/IEC 18033-3). |
| [`silk.crypto.chacha20_poly1305`](/docs/std/crypto-chacha20-poly1305) | Cryptography | `ChaCha20Poly1305` | Encrypt and authenticate data with ChaCha20-Poly1305, and encrypt with raw ChaCha20 (RFC 8439). |
| [`silk.crypto.digest`](/docs/std/crypto-digest) | Cryptography | `Digest` | The interface of every streaming hash in \`silk.crypto\`, so generic code such as HMAC and PBKDF2 can take the hash as a type argument. |
| [`silk.crypto.des`](/docs/std/crypto-des) | Cryptography | `TripleDes` | Encrypt with Triple DES (TDEA, NIST SP 800-67), the \`des-ede3\` and \`des-ede\` ciphers. |
| [`silk.crypto.des_wrap`](/docs/std/crypto-des-wrap) | Cryptography | `TripleDesKeyWrap` | Wrap keys with the Triple DES key wrap of RFC 3217 (CMS \`id-alg-CMS3DESwrap\`). |
| [`silk.crypto.curve448`](/docs/std/crypto-curve448) | Cryptography | `X448` | Agree on a shared secret with X448 (RFC 7748), and sign with Ed448 (RFC 8032), on the Goldilocks curve, Curve448. |
| [`silk.crypto.dh`](/docs/std/crypto-dh) | Cryptography | `DhPrivateKey` | Finite-field Diffie-Hellman key agreement (DH) over a prime modulus. |
| [`silk.crypto.dsa`](/docs/std/crypto-dsa) | Cryptography | `DsaPrivateKey` | DSA keys and signatures (FIPS 186-4): parameter and key generation, signing, verification, and the DER forms that OpenSSL and Node.js use. |
| [`silk.crypto.ec`](/docs/std/crypto-ec) | Cryptography | `EcPrivateKey` | Elliptic-curve keys, ECDSA, and ECDH on every named curve over a prime field that OpenSSL and Node.js list, such as \`brainpoolP256r1\`, \`secp256k1\`, \`secp224r1\`, and \`SM2\`. |
| [`silk.crypto.ec_key`](/docs/std/crypto-ec-key) | Cryptography | `EcKeyDer` | Read and write elliptic-curve keys in DER: SEC1 private keys, PKCS #8 private keys, and SubjectPublicKeyInfo public keys, for the named curves of \[\`EcCurve\`\]. |
| [`silk.crypto.ed25519`](/docs/std/crypto-ed25519) | Cryptography | `Ed25519PublicKey` | Ed25519 signatures with 32-byte keys and 64-byte signatures (RFC 8032). |
| [`silk.crypto.hkdf`](/docs/std/crypto-hkdf) | Cryptography | `HkdfSha256` | Derive keys with HKDF (RFC 5869) over any hash of \`silk.crypto\`. |
| [`silk.crypto.hmac`](/docs/std/crypto-hmac) | Cryptography | `HmacSha256` | Compute HMAC tags (RFC 2104) with any hash of \`silk.crypto\`. |
| [`silk.crypto.legacy_pem`](/docs/std/crypto-legacy-pem) | Cryptography | `LegacyPem` | Encrypt and decrypt PEM keys with the legacy OpenSSL scheme of the \`Proc-Type\` and \`DEK-Info\` headers (RFC 1421 framing). |
| [`silk.crypto.md5`](/docs/std/crypto-md5) | Cryptography | `Md5` | Compute MD5 digests for legacy formats, including UUID version 3. |
| [`silk.crypto.md5_sha1`](/docs/std/crypto-md5-sha1) | Cryptography | `Md5Sha1` | Compute the 36-byte MD5-SHA1 digest that TLS 1.0 and 1.1 use: MD5 followed by SHA-1. |
| [`silk.crypto.ml_dsa`](/docs/std/crypto-ml-dsa) | Cryptography | `MlDsa` | Sign and verify with ML-DSA (FIPS 204), the module-lattice signature scheme, at the levels ML-DSA-44, ML-DSA-65, and ML-DSA-87. |
| [`silk.crypto.ml_kem`](/docs/std/crypto-ml-kem) | Cryptography | `MlKem` | Agree on a shared secret with ML-KEM (FIPS 203), the module-lattice key encapsulation mechanism, at the levels ML-KEM-512, ML-KEM-768, and ML-KEM-1024. |
| [`silk.crypto.ml_key`](/docs/std/crypto-ml-key) | Cryptography | `MlKeyDer` | Read and write ML-KEM and ML-DSA keys in DER: PKCS #8 private keys and SubjectPublicKeyInfo public keys, in the IETF LAMPS profiles for X.509 (draft-ietf-lamps-dilithium-certificates and draft-ietf-lamps-kyber-certificates). |
| [`silk.crypto.modular`](/docs/std/crypto-modular) |  | `Modulus` | Constant-time arithmetic on unsigned integers of up to 8192 bits, and modulo an odd number. |
| [`silk.crypto.okp_key`](/docs/std/crypto-okp-key) | Cryptography | `OkpKeyDer` | Read and write X25519, X448, Ed25519, and Ed448 keys in DER: PKCS #8 private keys and SubjectPublicKeyInfo public keys, as RFC 8410 defines them. |
| [`silk.crypto.p256`](/docs/std/crypto-p256) | Cryptography | `P256` | Key agreement (ECDH) and ECDSA signatures on the NIST P-256 curve (secp256r1). |
| [`silk.crypto.p384`](/docs/std/crypto-p384) | Cryptography | `P384` | Key agreement (ECDH) and ECDSA signatures on the NIST P-384 curve (secp384r1). |
| [`silk.crypto.p521`](/docs/std/crypto-p521) | Cryptography | `P521` | Key agreement (ECDH) and ECDSA signatures on the NIST P-521 curve (secp521r1). |
| [`silk.crypto.pbkdf2`](/docs/std/crypto-pbkdf2) | Cryptography | `Pbkdf2` | Derive keys from passwords with PBKDF2 (RFC 8018 section 5.2) over HMAC with any hash. |
| [`silk.crypto.pkcs8`](/docs/std/crypto-pkcs8) | Cryptography | `EncryptedPkcs8` | Encrypt and decrypt private keys in the PKCS #8 \`EncryptedPrivateKeyInfo\` format with PBES2 (RFC 8018, RFC 5958). |
| [`silk.crypto.prime`](/docs/std/crypto-prime) | Cryptography | `Prime` | Test numbers for primality and generate random primes, including safe primes. |
| [`silk.crypto.ripemd160`](/docs/std/crypto-ripemd160) | Cryptography | `Ripemd160` | Compute RIPEMD-160 digests for formats that name them, such as Bitcoin addresses. |
| [`silk.crypto.rsa`](/docs/std/crypto-rsa) | Cryptography | `RsaPublicKey` | RSA keys, signatures, and encryption: PKCS #1 v1.5 and PSS signatures, OAEP and PKCS #1 v1.5 encryption, and key generation (RFC 8017). |
| [`silk.crypto.scrypt`](/docs/std/crypto-scrypt) | Cryptography | `Scrypt` | Derive keys from passwords with scrypt (RFC 7914), a memory-hard function. |
| [`silk.crypto.secp256k1`](/docs/std/crypto-secp256k1) | Cryptography | `Secp256k1` | Key agreement (ECDH) and ECDSA signatures on the curve secp256k1 of SEC 2. |
| [`silk.crypto.sha1`](/docs/std/crypto-sha1) | Cryptography | `Sha1` | Compute SHA-1 digests (20 bytes) for old protocols and file formats. |
| [`silk.crypto.sha2`](/docs/std/crypto-sha2) | Cryptography | `Sha256` | Compute SHA-2 digests: SHA-224, SHA-256, SHA-384, SHA-512, SHA-512/224, and SHA-512/256. |
| [`silk.crypto.sha3`](/docs/std/crypto-sha3) | Cryptography | `Sha3_256` | Compute SHA-3 digests (SHA3-224, SHA3-256, SHA3-384, SHA3-512) and the SHAKE128 and SHAKE256 extendable-output functions (FIPS 202). |
| [`silk.crypto.sm3`](/docs/std/crypto-sm3) | Cryptography | `Sm3` | Compute SM3 digests (GB/T 32905-2016), the hash of the Chinese commercial cryptography suite. |
| [`silk.crypto.sm4`](/docs/std/crypto-sm4) | Cryptography | `Sm4` | Encrypt with the SM4 block cipher (GB/T 32907-2016, ISO/IEC 18033-3). |
| [`silk.crypto.x25519`](/docs/std/crypto-x25519) | Cryptography | `X25519` | Agree on a shared secret with X25519 (RFC 7748) Diffie-Hellman. |
| [`silk.encoding.base64`](/docs/std/encoding-base64) | Data formats | `Base64` | Encode and decode standard Base64 (RFC 4648, with padding) into byte slices that you supply. |
| [`silk.encoding.endian`](/docs/std/encoding-endian) | Encoding | `endian` | Read and write 16-, 32- and 64-bit integers as little-endian or big-endian bytes in a slice. |
| [`silk.encoding.pem`](/docs/std/encoding-pem) | Encoding | `Pem` | Read and write PEM, the Base64 text armor for keys and certificates (RFC 7468). |
| [`silk.encoding.uuid`](/docs/std/encoding-uuid) | Data formats | `Uuid` | UUID values and constructors for versions 1 through 8, with RFC 9562 byte order. |
| [`silk.geometry.affine`](/docs/std/geometry-affine) | Geometry | `Affine2` | Two-dimensional affine transforms: scale, rotation, skew, and translation in one matrix. |
| [`silk.geometry.corners`](/docs/std/geometry-corners) | Geometry | `Corners` | A value for each of the four corners of a box, over any number type. |
| [`silk.geometry.insets`](/docs/std/geometry-insets) | Geometry | `Insets` | Distances inward from the four edges of a box, over any number type. |
| [`silk.geometry.matrix`](/docs/std/geometry-matrix) | Geometry | `Matrix3` | Square 3x3 and 4x4 matrices for projective and three-dimensional transforms. |
| [`silk.geometry.point`](/docs/std/geometry-point) | Geometry | `Point2` | Two- and three-dimensional positions over any number type. |
| [`silk.geometry.rect`](/docs/std/geometry-rect) | Geometry | `Rect` | Axis-aligned rectangles stored as their minimum and maximum corners, over any number type. |
| [`silk.geometry.rounded_rect`](/docs/std/geometry-rounded-rect) | Geometry | `RoundedRect` | Axis-aligned rectangles with a circular radius at each corner, over any number type. |
| [`silk.geometry.size`](/docs/std/geometry-size) | Geometry | `Size2` | Two-dimensional extents over any number type. |
| [`silk.geometry.vector`](/docs/std/geometry-vector) | Geometry | `Vector2` | Two- and three-dimensional displacements over any number type. |
| [`silk.http.basic`](/docs/std/http-basic) | HTTP | `HttpBasic` | Make the value of an \`Authorization: Basic\` header from a username and a password. |
| [`silk.http.body`](/docs/std/http-body) | HTTP | `Decoder` | Read and write the body of an HTTP/1 message: fixed length, chunked, or until the connection closes. |
| [`silk.http.client`](/docs/std/http-client) | HTTP | `HttpClient` | A simple HTTP client: send a request, and get the whole response in memory. |
| [`silk.http.client_native`](/docs/std/http-client-native) | HTTP | `HttpClientNative` | The native provider for the \`Http\` service of \[\`silk.http.client\`\]. |
| [`silk.http.client_native`](/docs/std/http-client-native) | HTTP | `HttpClientNative` | The native provider for the \`Http\` service of \[\`silk.http.client\`\]. |
| [`silk.http.client_wasi`](/docs/std/http-client-wasi) | HTTP | `WasiHttp` | The WASI Preview 2 provider for the portable \`Http\` service. |
| [`silk.http.client_wasi`](/docs/std/http-client-wasi) | HTTP | `WasiHttp` | The WASI Preview 2 provider for the portable \`Http\` service. |
| [`silk.http.connection_pool`](/docs/std/http-connection-pool) | HTTP | `Pool` | A bounded pool of HTTP/1 connections, for reuse across requests to the same origin. |
| [`silk.http.connection_pool_native`](/docs/std/http-connection-pool-native) | HTTP | `PoolNative` | Connection pools that open native TCP, HTTPS, and Unix socket connections. |
| [`silk.http.content`](/docs/std/http-content) | HTTP | `ContentReader` | Decode the content of an HTTP response: gzip, deflate, and Zstandard, as named in \`Content-Encoding\`. |
| [`silk.http.exchange`](/docs/std/http-exchange) | HTTP | `Exchange` | Run HTTP/1 requests over a connection step by step: send the head, stream the body, and read the response. |
| [`silk.http.exchange_native`](/docs/std/http-exchange-native) | HTTP | `HttpExchangeNative` | Native TCP, Unix socket, and TLS connections for HTTP clients. |
| [`silk.http.fetch`](/docs/std/http-fetch) | HTTP | `Fetch` | Send one HTTP request, follow redirects, decode the content, and deliver the body to a destination that you choose. |
| [`silk.http.fetch_native`](/docs/std/http-fetch-native) | HTTP | `FetchNative` | The native \[\`Context\`\] for \`silk.http.fetch\`: it connects over sockets and TLS, with a proxy policy and an optional connection pool. |
| [`silk.http.fetch_native`](/docs/std/http-fetch-native) | HTTP | `FetchNative` | The native \[\`Context\`\] for \`silk.http.fetch\`: it connects over sockets and TLS, with a proxy policy and an optional connection pool. |
| [`silk.http.head`](/docs/std/http-head) | HTTP | `RequestParser` | Parse and write the head of an HTTP/1.0 or HTTP/1.1 message: the start line and the header fields. |
| [`silk.http.headers`](/docs/std/http-headers) | HTTP | `Headers` | An ordered list of HTTP header fields, with lookup by name, copies, and formatting. |
| [`silk.http.hpack`](/docs/std/http-hpack) | HTTP | `Decoder` | HTTP/2 field compression as defined by RFC 7541. |
| [`silk.http.hpack_tables`](/docs/std/http-hpack-tables) | HTTP | Not applicable | RFC 7541 Appendix A static fields and Appendix B Huffman decoding trie. |
| [`silk.http.http2`](/docs/std/http-http2) | HTTP | `Connection` | A transport-independent HTTP/2 connection for clients and servers (RFC 9113). |
| [`silk.http.http2_connection`](/docs/std/http-http2-connection) | HTTP | `Driver` | HTTP/2 over the existing plain or TLS \`HttpTransport\` service. |
| [`silk.http.http2_frame`](/docs/std/http-http2-frame) | HTTP | `FrameHeader` | HTTP/2 wire frame headers, error codes, and frame serialization from RFC 9113. |
| [`silk.http.http2_headers`](/docs/std/http-http2-headers) | HTTP | `Message` | HTTP/2 field validation for requests, responses, and trailers under RFC 9113 section 8. |
| [`silk.http.message`](/docs/std/http-message) | HTTP | `Version` | HTTP/1.0 and HTTP/1.1 values: versions, methods, statuses, header fields, and message heads. |
| [`silk.http.origin`](/docs/std/http-origin) | HTTP | `Origin` | The origin of an HTTP request: the scheme, host, and port that a connection goes to. |
| [`silk.http.proxy`](/docs/std/http-proxy) | HTTP | `ProxyConfig` | Proxy settings for HTTP clients, and the choice of a route for each origin. |
| [`silk.http.redirect`](/docs/std/http-redirect) | HTTP | `Redirect` | Follow HTTP redirects with a \[\`Policy\`\]: which statuses to follow, how the method and the body change, which origins are allowed, and which headers are kept. |
| [`silk.http.request`](/docs/std/http-request) | HTTP | `HttpRequest` | Check and write the head of an HTTP request before it is sent. |
| [`silk.http.server`](/docs/std/http-server) | HTTP | `Connection` | The server side of one HTTP/1.0 or HTTP/1.1 connection, with streaming bodies and fixed limits. |
| [`silk.http.server_native`](/docs/std/http-server-native) | HTTP | `HttpServerNative` | Accepts native socket connections and serves each one with \`silk.http.server\`. |
| [`silk.http.server_native`](/docs/std/http-server-native) | HTTP | `HttpServerNative` | Accepts native socket connections and serves each one with \`silk.http.server\`. |
| [`silk.http.server_wasi`](/docs/std/http-server-wasi) | HTTP | `WasiHttpServer` | HTTP requests delivered to a WASI Preview 2 component. |
| [`silk.http.server_wasi`](/docs/std/http-server-wasi) | HTTP | `WasiHttpServer` | HTTP requests delivered to a WASI Preview 2 component. |
| [`silk.http.target`](/docs/std/http-target) | HTTP | `RequestTarget` | The target of an HTTP request, the authority in it, and the \`Host\` field. |
| [`silk.http.transport`](/docs/std/http-transport) | HTTP | `HttpTransport` | The byte transport under an HTTP connection: plain bytes or TLS. |
| [`silk.http.websocket`](/docs/std/http-websocket) | HTTP | `WebSocketCodec` | WebSocket frames (RFC 6455) for clients and servers, without I/O. |
| [`silk.http.websocket_client`](/docs/std/http-websocket-client) | HTTP | `WebSocketClient` | The client side of the WebSocket opening handshake (RFC 6455, version 13). |
| [`silk.http.websocket_native`](/docs/std/http-websocket-native) | HTTP | `WebSocketNative` | Native WebSocket clients and split sessions over TCP and TLS. |
| [`silk.http.websocket_stream`](/docs/std/http-websocket-stream) | HTTP | `WebSocket` | WebSocket sessions over a byte duplex, for clients and servers, with a split form for fibers. |
| [`silk.http.websocket_upgrade`](/docs/std/http-websocket-upgrade) | HTTP | `WebSocketUpgrade` | The server side of the WebSocket opening handshake (RFC 6455, version 13). |
| [`silk.io.buffered_duplex`](/docs/std/io-buffered-duplex) | Input and output | `BufferedDuplex` | A buffered session that reads and writes one \`ByteDuplex\` transport inside a callback. |
| [`silk.io.buffered_input`](/docs/std/io-buffered-input) | Input and output | `BufferedInput` | A fixed-size input buffer for parsers that must look at bytes before they use them. |
| [`silk.io.buffered_output`](/docs/std/io-buffered-output) | Input and output | `BufferedOutput` | A fixed-size output buffer that collects small writes and sends them as larger writes. |
| [`silk.io.buffered_transfer`](/docs/std/io-buffered-transfer) | Input and output | `BufferedTransfer` | Copy bytes from one buffered session to another, and consume only what the destination accepts. |
| [`silk.io.byte_duplex`](/docs/std/io-byte-duplex) | Input and output | `ByteDuplex` | The \`ByteDuplex\` effect: a two-way byte stream, such as a TCP connection, with partial reads and writes and deadlines. |
| [`silk.io.logger`](/docs/std/io-logger) | Input and output | `Logger` | The \`Logger\` effect: log messages with a level, a template, and values. |
| [`silk.io.logger_console`](/docs/std/io-logger-console) | Input and output | `ConsoleLogger` | A \`Logger\` provider for browser and JavaScript hosts: \[\`ConsoleLogger\`\] hands each message to the host's console. |
| [`silk.io.logger_console`](/docs/std/io-logger-console) | Input and output | `ConsoleLogger` | A \`Logger\` provider for browser and JavaScript hosts: \[\`ConsoleLogger\`\] hands each message to the host's console. |
| [`silk.io.logger_native`](/docs/std/io-logger-native) | Input and output | `StdoutLogger` | Native providers of the \`Logger\` effect: \[\`StderrLogger\`\] writes log lines to standard error, and \[\`StdoutLogger\`\] writes the bare messages to standard output. |
| [`silk.io.logger_native`](/docs/std/io-logger-native) | Input and output | `StdoutLogger` | Native providers of the \`Logger\` effect: \[\`StderrLogger\`\] writes log lines to standard error, and \[\`StdoutLogger\`\] writes the bare messages to standard output. |
| [`silk.io.logger_wasi`](/docs/std/io-logger-wasi) | Input and output | `WasiLogger` | A \`Logger\` provider for Preview 2 components whose host offers \`wasi\:logging\`: \[\`WasiLogger\`\] passes each message to \`wasi\:logging/logging.log\`. |
| [`silk.io.logger_wasi`](/docs/std/io-logger-wasi) | Input and output | `WasiLogger` | A \`Logger\` provider for Preview 2 components whose host offers \`wasi\:logging\`: \[\`WasiLogger\`\] passes each message to \`wasi\:logging/logging.log\`. |
| [`silk.io.memory_byte_duplex`](/docs/std/io-memory-byte-duplex) | Input and output | `MemoryByteDuplex` | A scripted \`ByteDuplex\` transport in memory, for tests of protocol code. |
| [`silk.io.reactor`](/docs/std/io-reactor) | Input and output | `Reactor` | Wait for many native descriptors at once: one blocking call reports which ones are readable or writable, and another thread can wake the wait. |
| [`silk.io.reactor`](/docs/std/io-reactor) | Input and output | `Reactor` | Wait for many native descriptors at once: one blocking call reports which ones are readable or writable, and another thread can wake the wait. |
| [`silk.io.standard_input`](/docs/std/io-standard-input) | Input and output | `StandardInput` | The \`StandardInput\` effect: read raw bytes from standard input. |
| [`silk.io.standard_input_native`](/docs/std/io-standard-input-native) | Input and output | `OsStandardInput` | The native provider of the \`StandardInput\` effect: it reads the standard input of the process. |
| [`silk.io.standard_input_native`](/docs/std/io-standard-input-native) | Input and output | `OsStandardInput` | The native provider of the \`StandardInput\` effect: it reads the standard input of the process. |
| [`silk.io.writer`](/docs/std/io-writer) | Input and output | `Writer` | The \`Writer\` effect: write bytes without knowing where they go. |
| [`silk.io.writer_native`](/docs/std/io-writer-native) | Input and output | `StdoutWriter` | Native \`Writer\` providers for standard output and standard error, and a lock for whole messages on standard error. |
| [`silk.io.writer_native`](/docs/std/io-writer-native) | Input and output | `StdoutWriter` | Native \`Writer\` providers for standard output and standard error, and a lock for whole messages on standard error. |
| [`silk.json.array`](/docs/std/json-array) | Data formats | `JsonArray` | Write a JSON array to the \`Writer\`. |
| [`silk.json.codec`](/docs/std/json-codec) | Data formats | `JsonCodec` | The interfaces that let a type be written to JSON and read from JSON. |
| [`silk.json.object`](/docs/std/json-object) | Data formats | `JsonObject` | Write a JSON object, one member at a time, to the \`Writer\`. |
| [`silk.json.output`](/docs/std/json-output) | Data formats | `JsonOutput` | Low-level JSON output: strings, numbers, and punctuation, and the \[\`JsonOptions\`\] for layout. |
| [`silk.json.reader`](/docs/std/json-reader) | Data formats | `JsonReader` | Read JSON tokens from a \`BufferedInput\`, for documents that do not fit in one slice. |
| [`silk.json.reflect`](/docs/std/json-reflect) | Data formats | `JsonReflect` | Write a struct as a JSON object from its fields, without writing each field by hand. |
| [`silk.json.scanner`](/docs/std/json-scanner) | Data formats | `JsonScanner` | Read JSON as a sequence of tokens, without building a tree and without allocating. |
| [`silk.json.text`](/docs/std/json-text) | Data formats | `JsonText` | Decode the text of a JSON string token, including its escapes, into owned bytes. |
| [`silk.json.value`](/docs/std/json-value) | Data formats | `Json` | Parse JSON into a tree of values, read fields from it, and write it back. |
| [`silk.mem.allocator`](/docs/std/mem-allocator) | Memory | `Allocator` | The \`Allocator\` service: the source of owned heap storage in the standard library. |
| [`silk.mem.arena`](/docs/std/mem-arena) | Memory | `Arena` | A bump allocator over chunks it acquires from another allocator. |
| [`silk.mem.box`](/docs/std/mem-box) | Memory | `Box` | One owned value on the heap, for recursive data and for values that must have a fixed-size handle. |
| [`silk.mem.layout`](/docs/std/mem-layout) | Memory | `Layout` | Byte size and alignment values that describe the memory to request from an allocator. |
| [`silk.mem.metrics`](/docs/std/mem-metrics) | Memory | `AllocationMetrics` | Allocation counters that an \`Allocator\` provider can keep and publish. |
| [`silk.mem.output`](/docs/std/mem-output) | Memory | `Uninitialized` | Owned storage for one \`Copy\` value that a foreign function writes through a pointer. |
| [`silk.mem.pointer`](/docs/std/mem-pointer) | Memory | `Pointer` | Raw data pointers: make them, check them for null, move along them, and read and write through them. |
| [`silk.mem.raw_buffer`](/docs/std/mem-raw-buffer) | Memory | `RawBuffer` | Typed raw storage made from an allocation, for code that implements containers. |
| [`silk.mem.shared`](/docs/std/mem-shared) | Memory | `Shared` | Shared ownership of one mutable value on one thread, with access through callbacks. |
| [`silk.mem.slot`](/docs/std/mem-slot) | Memory | `Slot` | Initialization-state changes for one element slot of raw storage. |
| [`silk.mem.stack`](/docs/std/mem-stack) | Memory | `Stack` | The native stack of the running thread: the address of the current frame, and scratch storage that lives on the stack instead of in an allocator. |
| [`silk.net.address`](/docs/std/net-address) | Networking | `NetworkAddress` | IP addresses, ports, endpoints, and the host of a URI, as checked values that do not allocate. |
| [`silk.net.datagram_native`](/docs/std/net-datagram-native) | Networking | `NativeUdpSocket` | Nonblocking UDP sockets on the native system: send and receive whole datagrams. |
| [`silk.net.datagram_native`](/docs/std/net-datagram-native) | Networking | `NativeUdpSocket` | Nonblocking UDP sockets on the native system: send and receive whole datagrams. |
| [`silk.net.datagram_wasi`](/docs/std/net-datagram-wasi) | Networking | `UdpSocket` | Owned UDP sockets and complete datagrams through WASI Preview 2. |
| [`silk.net.datagram_wasi`](/docs/std/net-datagram-wasi) | Networking | `UdpSocket` | Owned UDP sockets and complete datagrams through WASI Preview 2. |
| [`silk.net.dns.client_native`](/docs/std/net-dns-client-native) | Networking | `NativeDnsClient` | Ask DNS servers questions from a native program, with system UDP and TCP sockets. |
| [`silk.net.dns.config`](/docs/std/net-dns-config) | Networking | `ResolverConfig` | Read the DNS client settings of a system: name servers, search domains and query options. |
| [`silk.net.dns.message`](/docs/std/net-dns-message) | Networking | `Message` | Read and write DNS messages in the wire format of RFC 1035. |
| [`silk.net.dns.query`](/docs/std/net-dns-query) | Networking | `Exchange` | Send one DNS question to the servers of a configuration, with retries and TCP fallback, without doing any input or output. |
| [`silk.net.resolver`](/docs/std/net-resolver) | Networking | `Resolver` | Turn a host and a port into a list of endpoints to connect to. |
| [`silk.net.resolver_native`](/docs/std/net-resolver-native) | Networking | `NativeSystemResolver` | The native \`Resolver\` provider using the system's \`getaddrinfo\`, or \`GetAddrInfoW\` on Windows. |
| [`silk.net.resolver_wasi`](/docs/std/net-resolver-wasi) | Networking | `WasiResolver` | DNS resolution through a WASI Preview 2 network capability. |
| [`silk.net.resolver_wasi`](/docs/std/net-resolver-wasi) | Networking | `WasiResolver` | DNS resolution through a WASI Preview 2 network capability. |
| [`silk.net.socket_native`](/docs/std/net-socket-native) | Networking | `NativeSocket` | TCP and Unix socket connections and listeners, as \`ByteDuplex\` providers. |
| [`silk.net.socket_native`](/docs/std/net-socket-native) | Networking | `NativeSocket` | TCP and Unix socket connections and listeners, as \`ByteDuplex\` providers. |
| [`silk.net.socket_wasi`](/docs/std/net-socket-wasi) | Networking | `wasi_socket` | TCP connections and listeners through WASI Preview 2 network capabilities. |
| [`silk.net.socket_wasi`](/docs/std/net-socket-wasi) | Networking | `wasi_socket` | TCP connections and listeners through WASI Preview 2 network capabilities. |
| [`silk.num.f32`](/docs/std/num-f32) | Numbers | `f32` | IEEE binary32 values with deterministic representation, classification, and math operations. |
| [`silk.num.f64`](/docs/std/num-f64) | Numbers | `f64` | IEEE binary64 values and Silk's default floating-point arithmetic. |
| [`silk.num.i16`](/docs/std/num-i16) | Numbers | `i16` | Sixteen-bit signed integers with explicit overflow, conversion, and text policies. |
| [`silk.num.i32`](/docs/std/num-i32) | Numbers | `i32` | Thirty-two-bit signed integers and the default type of context-free integer literals. |
| [`silk.num.i64`](/docs/std/num-i64) | Numbers | `i64` | Sixty-four-bit signed integers for large fixed-width values and exact integer protocols. |
| [`silk.num.i8`](/docs/std/num-i8) | Numbers | `i8` | Eight-bit signed integers for compact values, byte-level formats, and narrow arithmetic. |
| [`silk.num.isize`](/docs/std/num-isize) | Numbers | `isize` | Pointer-width signed integers for offsets whose range follows the selected compilation target. |
| [`silk.num.numeric`](/docs/std/num-numeric) | Numbers | `Numeric` | Generic helpers and numeric contracts for algorithms over primitive numbers. |
| [`silk.num.u16`](/docs/std/num-u16) | Numbers | `u16` | Sixteen-bit unsigned integers with explicit arithmetic and conversion failure policies. |
| [`silk.num.u32`](/docs/std/num-u32) | Numbers | `u32` | Thirty-two-bit unsigned integers for fixed-width counts, masks, and binary fields. |
| [`silk.num.u64`](/docs/std/num-u64) | Numbers | `u64` | Sixty-four-bit unsigned integers for wide masks, counters, hashes, and exact interchange values. |
| [`silk.num.u8`](/docs/std/num-u8) | Numbers | `u8` | Eight-bit unsigned integers for bytes, compact counters, and exact binary representations. |
| [`silk.num.usize`](/docs/std/num-usize) | Numbers | `usize` | Pointer-width unsigned integers for lengths, indices, capacities, and allocation sizes. |
| [`silk.platform.linux.mapping`](/docs/std/platform-linux-mapping) | Native platform | `Mapping` | Anonymous memory mappings from the Linux kernel, for programs that run without libc. |
| [`silk.platform.linux.mapping`](/docs/std/platform-linux-mapping) | Native platform | `Mapping` | Anonymous memory mappings from the Linux kernel, for programs that run without libc. |
| [`silk.platform.linux.process_inputs`](/docs/std/platform-linux-process-inputs) | Native platform | `ProcessInputs` | The arguments, environment and page size of a raw Linux process, read from the initial stack. |
| [`silk.platform.linux.process_inputs`](/docs/std/platform-linux-process-inputs) | Native platform | `ProcessInputs` | The arguments, environment and page size of a raw Linux process, read from the initial stack. |
| [`silk.platform.linux.start`](/docs/std/platform-linux-start) | Native platform | `RawStart` | The program entry for a static, non-PIE Linux executable with no libc. |
| [`silk.platform.linux.syscall`](/docs/std/platform-linux-syscall) | Native platform | `RawLinux` | Direct Linux system calls for programs built with no libc. |
| [`silk.platform.linux.syscall`](/docs/std/platform-linux-syscall) | Native platform | `RawLinux` | Direct Linux system calls for programs built with no libc. |
| [`silk.platform.native.clock`](/docs/std/platform-native-clock) | Native platform | `NativeClock` | Direct calls to the clocks of the system, for the native clock providers. |
| [`silk.platform.native.descriptor`](/docs/std/platform-native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.platform.native.descriptor`](/docs/std/platform-native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.platform.native.descriptor`](/docs/std/platform-native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.platform.native.diagnostics`](/docs/std/platform-native-diagnostics) | Native platform | `NativeDiagnostics` | The observer of native and wasm programs that reports unhandled errors and traps, with their call path. |
| [`silk.platform.native.diagnostics`](/docs/std/platform-native-diagnostics) | Native platform | `NativeDiagnostics` | The observer of native and wasm programs that reports unhandled errors and traps, with their call path. |
| [`silk.platform.native.file`](/docs/std/platform-native-file) | Native platform | `NativeFile` | POSIX file and directory operations on host paths and descriptors, for native providers and runtimes that need the full file model of the system. |
| [`silk.platform.native.file`](/docs/std/platform-native-file) | Native platform | `NativeFile` | POSIX file and directory operations on host paths and descriptors, for native providers and runtimes that need the full file model of the system. |
| [`silk.platform.native.file`](/docs/std/platform-native-file) | Native platform | `NativeFile` | POSIX file and directory operations on host paths and descriptors, for native providers and runtimes that need the full file model of the system. |
| [`silk.platform.native.filesystem`](/docs/std/platform-native-filesystem) | Native platform | `NativeFileSystem` | The system calls for files and directories, for the native \`FileSystem\` provider. |
| [`silk.platform.native.filesystem`](/docs/std/platform-native-filesystem) | Native platform | `NativeFileSystem` | The system calls for files and directories, for the native \`FileSystem\` provider. |
| [`silk.platform.native.host_input`](/docs/std/platform-native-host-input) | Native platform | `NativeHostInput` | Owned copies of the command-line arguments and the environment of the process. |
| [`silk.platform.native.host_input`](/docs/std/platform-native-host-input) | Native platform | `NativeHostInput` | Owned copies of the command-line arguments and the environment of the process. |
| [`silk.platform.native.kqueue`](/docs/std/platform-native-kqueue) | Native platform | `KernelEvent` | The Darwin kqueue system calls and their C types, shared by the native providers that use them. |
| [`silk.platform.native.kqueue`](/docs/std/platform-native-kqueue) | Native platform | `KernelEvent` | The Darwin kqueue system calls and their C types, shared by the native providers that use them. |
| [`silk.platform.native.process`](/docs/std/platform-native-process) | Native platform | `NativeProcess` | Runs a child process with the system calls, for the native \`ChildProcess\` provider. |
| [`silk.platform.native.process`](/docs/std/platform-native-process) | Native platform | `NativeProcess` | Runs a child process with the system calls, for the native \`ChildProcess\` provider. |
| [`silk.platform.native.report`](/docs/std/platform-native-report) | Native platform | `NativeReport` | Writes the report of an unhandled error or a trap to a descriptor, with fixed limits. |
| [`silk.platform.native.report`](/docs/std/platform-native-report) | Native platform | `NativeReport` | Writes the report of an unhandled error or a trap to a descriptor, with fixed limits. |
| [`silk.platform.native.start`](/docs/std/platform-native-start) | Native platform | `NativeStart` | The default start code of a native program: it calls your \`main\` and returns its status. |
| [`silk.platform.native.start_sync`](/docs/std/platform-native-start-sync) | Native platform | `NativeStartSync` | A minimal start code for a native program whose \`main\` is an \`i32\` effect that requires \`&mut HostInput\`. |
| [`silk.platform.wasi.canonical`](/docs/std/platform-wasi-canonical) | Native platform | Not applicable | The canonical ABI allocator of every \`wasm32-wasip2\` component. |
| [`silk.platform.wasi.clock`](/docs/std/platform-wasi-clock) | Native platform | `WasiClock` | WASI wall-clock and monotonic-clock operations. |
| [`silk.platform.wasi.clock`](/docs/std/platform-wasi-clock) | Native platform | `WasiClock` | WASI wall-clock and monotonic-clock operations. |
| [`silk.platform.wasi.component`](/docs/std/platform-wasi-component) | Native platform | `wasi_component` | Memory and polling operations shared by WASI Preview 2 providers. |
| [`silk.platform.wasi.component`](/docs/std/platform-wasi-component) | Native platform | `wasi_component` | Memory and polling operations shared by WASI Preview 2 providers. |
| [`silk.platform.wasi.descriptor`](/docs/std/platform-wasi-descriptor) | Native platform | `WasiDescriptor` | Descriptor reads and writes through WASI. |
| [`silk.platform.wasi.descriptor`](/docs/std/platform-wasi-descriptor) | Native platform | `WasiDescriptor` | Descriptor reads and writes through WASI. |
| [`silk.platform.wasi.filesystem`](/docs/std/platform-wasi-filesystem) | Native platform | `WasiFileSystem` | Descriptor-relative file operations within WASI preopened directories. |
| [`silk.platform.wasi.filesystem`](/docs/std/platform-wasi-filesystem) | Native platform | `WasiFileSystem` | Descriptor-relative file operations within WASI preopened directories. |
| [`silk.platform.wasi.host_input`](/docs/std/platform-wasi-host-input) | Native platform | `WasiHostInput` | A snapshot of WASI command arguments and environment variables. |
| [`silk.platform.wasi.host_input`](/docs/std/platform-wasi-host-input) | Native platform | `WasiHostInput` | A snapshot of WASI command arguments and environment variables. |
| [`silk.platform.wasi.http`](/docs/std/platform-wasi-http) | Native platform | `wasi_http` | Ownership and canonical ABI operations for WASI Preview 2 HTTP providers. |
| [`silk.platform.wasi.http`](/docs/std/platform-wasi-http) | Native platform | `wasi_http` | Ownership and canonical ABI operations for WASI Preview 2 HTTP providers. |
| [`silk.platform.wasi.preview1`](/docs/std/platform-wasi-preview1) | Native platform | `wasi` | The WASI Preview 1 canonical ABI, also used inside Preview 2 command components. |
| [`silk.platform.wasi.preview1`](/docs/std/platform-wasi-preview1) | Native platform | `wasi` | The WASI Preview 1 canonical ABI, also used inside Preview 2 command components. |
| [`silk.platform.wasi.preview2`](/docs/std/platform-wasi-preview2) | Native platform | `wasi_preview2` | Raw imports for the WASI Preview 2 canonical ABI. |
| [`silk.platform.wasi.preview2`](/docs/std/platform-wasi-preview2) | Native platform | `wasi_preview2` | Raw imports for the WASI Preview 2 canonical ABI. |
| [`silk.platform.wasi.start`](/docs/std/platform-wasi-start) | Native platform | `wasi_start` | The command entry for WASI Preview 1 and Preview 2. |
| [`silk.platform.wasi.stream`](/docs/std/platform-wasi-stream) | Native platform | `wasi_stream` | Owned Preview 2 input and output streams with partial transfers and deadlines. |
| [`silk.platform.wasi.stream`](/docs/std/platform-wasi-stream) | Native platform | `wasi_stream` | Owned Preview 2 input and output streams with partial transfers and deadlines. |
| [`silk.platform.wasm.heap`](/docs/std/platform-wasm-heap) | Native platform | Not applicable | The linear-memory heap of every wasm module, and the report buffer of a module without WASI. |
| [`silk.platform.wasm.heap`](/docs/std/platform-wasm-heap) | Native platform | Not applicable | The linear-memory heap of every wasm module, and the report buffer of a module without WASI. |
| [`silk.platform.wasm.thread`](/docs/std/platform-wasm-thread) | Native platform | Not applicable | The wasi-threads records of a multi-threaded wasm32 module. |
| [`silk.platform.wasm.thread`](/docs/std/platform-wasm-thread) | Native platform | Not applicable | The wasi-threads records of a multi-threaded wasm32 module. |
| [`silk.platform.wasm.support`](/docs/std/platform-wasm-support) | Native platform | Not applicable | The C library of every wasm32 executable: the heap entry points, the byte routines, the 128-bit multiply and shifts, the floating remainder and the fused multiply-add. |
| [`silk.platform.wasm.support`](/docs/std/platform-wasm-support) | Native platform | Not applicable | The C library of every wasm32 executable: the heap entry points, the byte routines, the 128-bit multiply and shifts, the floating remainder and the fused multiply-add. |
| [`silk.platform.wasm.start`](/docs/std/platform-wasm-start) | Native platform | `WasmStart` | The program entry for the standalone LLVM-to-WebAssembly profile. |
| [`silk.platform.windows.clock`](/docs/std/platform-windows-clock) | Windows platform | `WindowsClock` | Windows wall and monotonic clocks without a C runtime. |
| [`silk.platform.windows.clock`](/docs/std/platform-windows-clock) | Windows platform | `WindowsClock` | Windows wall and monotonic clocks without a C runtime. |
| [`silk.platform.windows.command_line`](/docs/std/platform-windows-command-line) | Windows platform | `CommandLine` | MSVC command-line encoding and decoding over Windows UTF-16 code units. |
| [`silk.platform.windows.console`](/docs/std/platform-windows-console) | Windows platform | `WindowsConsole` | Windows standard-output and standard-error writes without a C runtime. |
| [`silk.platform.windows.console`](/docs/std/platform-windows-console) | Windows platform | `WindowsConsole` | Windows standard-output and standard-error writes without a C runtime. |
| [`silk.platform.windows.environment`](/docs/std/platform-windows-environment) | Windows platform | `EnvironmentEntry` | Delimiter rules for Windows UTF-16 environment entries. |
| [`silk.platform.windows.filesystem`](/docs/std/platform-windows-filesystem) | Windows platform | `WindowsFileSystem` | Handle-relative filesystem operations for the Windows \`OsFileSystem\` provider. |
| [`silk.platform.windows.filesystem`](/docs/std/platform-windows-filesystem) | Windows platform | `WindowsFileSystem` | Handle-relative filesystem operations for the Windows \`OsFileSystem\` provider. |
| [`silk.platform.windows.heap`](/docs/std/platform-windows-heap) | Windows platform | `WindowsHeap` | Process-heap storage for the Windows runtime and the system allocator. |
| [`silk.platform.windows.heap`](/docs/std/platform-windows-heap) | Windows platform | `WindowsHeap` | Process-heap storage for the Windows runtime and the system allocator. |
| [`silk.platform.windows.host_input`](/docs/std/platform-windows-host-input) | Windows platform | `WindowsHostInput` | Windows \`HostInput\` with owned arguments and an environment snapshot in raw canonical WTF-8. |
| [`silk.platform.windows.host_input`](/docs/std/platform-windows-host-input) | Windows platform | `WindowsHostInput` | Windows \`HostInput\` with owned arguments and an environment snapshot in raw canonical WTF-8. |
| [`silk.platform.windows.host_path`](/docs/std/platform-windows-host-path) | Windows platform | `WindowsHostPath` | Windows host path discovery for tools. These operations intentionally resolve links in the machine namespace; they do not establish a confined filesystem root. |
| [`silk.platform.windows.host_path`](/docs/std/platform-windows-host-path) | Windows platform | `WindowsHostPath` | Windows host path discovery for tools. These operations intentionally resolve links in the machine namespace; they do not establish a confined filesystem root. |
| [`silk.platform.windows.input`](/docs/std/platform-windows-input) | Windows platform | `WindowsInput` | Raw-byte reads from the Windows standard-input handle. |
| [`silk.platform.windows.input`](/docs/std/platform-windows-input) | Windows platform | `WindowsInput` | Raw-byte reads from the Windows standard-input handle. |
| [`silk.platform.windows.path`](/docs/std/platform-windows-path) | Windows platform | `WindowsPath` | Windows host paths represented in an explicit machine-wide path namespace. |
| [`silk.platform.windows.process`](/docs/std/platform-windows-process) | Windows platform | `WindowsProcess` | Direct Windows child execution with explicit inherited handles and owned process cleanup. |
| [`silk.platform.windows.process`](/docs/std/platform-windows-process) | Windows platform | `WindowsProcess` | Direct Windows child execution with explicit inherited handles and owned process cleanup. |
| [`silk.platform.windows.process_image`](/docs/std/platform-windows-process-image) | Windows platform | `WindowsProcessImage` | Interactive Windows process execution: inherit the terminal, environment, and working directory, wait for the image, and return its exact exit status to the shell. |
| [`silk.platform.windows.process_image`](/docs/std/platform-windows-process-image) | Windows platform | `WindowsProcessImage` | Interactive Windows process execution: inherit the terminal, environment, and working directory, wait for the image, and return its exact exit status to the shell. |
| [`silk.platform.windows.random`](/docs/std/platform-windows-random) | Windows platform | `WindowsRandom` | Secure Windows random bytes without a C runtime. |
| [`silk.platform.windows.random`](/docs/std/platform-windows-random) | Windows platform | `WindowsRandom` | Secure Windows random bytes without a C runtime. |
| [`silk.platform.windows.start`](/docs/std/platform-windows-start) | Windows platform | `WindowsStart` | Synchronous Windows executable entry without a C runtime. |
| [`silk.platform.windows.time`](/docs/std/platform-windows-time) | Windows platform | `WindowsTime` | Exact conversions between Windows clock units and Silk instants. |
| [`silk.platform.windows.winsock`](/docs/std/platform-windows-winsock) |  | `Winsock` | Scoped ownership of a Windows Winsock initialization reference. |
| [`silk.platform.windows.wtf8`](/docs/std/platform-windows-wtf8) | Windows platform | `Wtf8` | Lossless conversion between Windows UTF-16 code units and canonical WTF-8 bytes. |
| [`silk.simd.aarch64`](/docs/std/simd-aarch64) | SIMD | `aarch64` | AArch64 NEON instructions that the portable \`silk.simd.simd\` operations do not express: table lookups, dot products, pairwise sums, and AES round steps. |
| [`silk.simd.cpu`](/docs/std/simd-cpu) | SIMD | `CpuFeatures` | Runtime detection of the CPU features that the running machine has, to choose a kernel at run time. |
| [`silk.simd.f32x4`](/docs/std/simd-f32x4) | SIMD | `f32x4` | Operations on \`simd\<f32, 4\>\`: four 32-bit float lanes in one 128-bit vector. |
| [`silk.simd.f32x8`](/docs/std/simd-f32x8) | SIMD | `f32x8` | Operations on \`simd\<f32, 8\>\`: eight 32-bit float lanes in one 256-bit vector. |
| [`silk.simd.f64x2`](/docs/std/simd-f64x2) | SIMD | `f64x2` | Operations on \`simd\<f64, 2\>\`: two 64-bit float lanes in one 128-bit vector. |
| [`silk.simd.f64x4`](/docs/std/simd-f64x4) | SIMD | `f64x4` | Operations on \`simd\<f64, 4\>\`: four 64-bit float lanes in one 256-bit vector. |
| [`silk.simd.i16x16`](/docs/std/simd-i16x16) | SIMD | `i16x16` | Operations on \`simd\<i16, 16\>\`: sixteen signed 16-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i16x8`](/docs/std/simd-i16x8) | SIMD | `i16x8` | Operations on \`simd\<i16, 8\>\`: eight signed 16-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i32x4`](/docs/std/simd-i32x4) | SIMD | `i32x4` | Operations on \`simd\<i32, 4\>\`: four signed 32-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i32x8`](/docs/std/simd-i32x8) | SIMD | `i32x8` | Operations on \`simd\<i32, 8\>\`: eight signed 32-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i64x2`](/docs/std/simd-i64x2) | SIMD | `i64x2` | Operations on \`simd\<i64, 2\>\`: two signed 64-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i64x4`](/docs/std/simd-i64x4) | SIMD | `i64x4` | Operations on \`simd\<i64, 4\>\`: four signed 64-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i8x16`](/docs/std/simd-i8x16) | SIMD | `i8x16` | Operations on \`simd\<i8, 16\>\`: sixteen signed 8-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i8x32`](/docs/std/simd-i8x32) | SIMD | `i8x32` | Operations on \`simd\<i8, 32\>\`: thirty-two signed 8-bit integer lanes in one 256-bit vector. |
| [`silk.simd.mask16`](/docs/std/simd-mask16) | SIMD | `mask16` | Operations on \`mask\<16\>\`: sixteen lanes that are each set or clear. |
| [`silk.simd.mask2`](/docs/std/simd-mask2) | SIMD | `mask2` | Operations on \`mask\<2\>\`: two lanes that are each set or clear. |
| [`silk.simd.mask32`](/docs/std/simd-mask32) | SIMD | `mask32` | Operations on \`mask\<32\>\`: thirty-two lanes that are each set or clear. |
| [`silk.simd.mask4`](/docs/std/simd-mask4) | SIMD | `mask4` | Operations on \`mask\<4\>\`: four lanes that are each set or clear. |
| [`silk.simd.mask8`](/docs/std/simd-mask8) | SIMD | `mask8` | Operations on \`mask\<8\>\`: eight lanes that are each set or clear. |
| [`silk.simd.simd`](/docs/std/simd-simd) | SIMD | `simd` | Facts about SIMD vectors on the target CPU of the current compilation. |
| [`silk.simd.u16x16`](/docs/std/simd-u16x16) | SIMD | `u16x16` | Operations on \`simd\<u16, 16\>\`: sixteen unsigned 16-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u16x8`](/docs/std/simd-u16x8) | SIMD | `u16x8` | Operations on \`simd\<u16, 8\>\`: eight unsigned 16-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u32x4`](/docs/std/simd-u32x4) | SIMD | `u32x4` | Operations on \`simd\<u32, 4\>\`: four unsigned 32-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u32x8`](/docs/std/simd-u32x8) | SIMD | `u32x8` | Operations on \`simd\<u32, 8\>\`: eight unsigned 32-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u64x2`](/docs/std/simd-u64x2) | SIMD | `u64x2` | Operations on \`simd\<u64, 2\>\`: two unsigned 64-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u64x4`](/docs/std/simd-u64x4) | SIMD | `u64x4` | Operations on \`simd\<u64, 4\>\`: four unsigned 64-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u8x16`](/docs/std/simd-u8x16) | SIMD | `u8x16` | Operations on \`simd\<u8, 16\>\`: sixteen unsigned 8-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u8x32`](/docs/std/simd-u8x32) | SIMD | `u8x32` | Operations on \`simd\<u8, 32\>\`: thirty-two unsigned 8-bit integer lanes in one 256-bit vector. |
| [`silk.simd.wasm`](/docs/std/simd-wasm) | SIMD | `wasm` | WebAssembly SIMD instructions that the portable \`silk.simd.simd\` operations do not express: byte swizzles, dot products, and saturating narrows. |
| [`silk.simd.x86`](/docs/std/simd-x86) | SIMD | `x86` | x86-64 SIMD instructions that the portable \`silk.simd.simd\` operations do not express: byte table lookups, multiply-add steps, saturating packs, sums of absolute differences, AES rounds and carry-less multiplication. |
| [`silk.support.bcmp`](/docs/std/support-bcmp) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.bzero`](/docs/std/support-bzero) | Compiler support | Not applicable | Source-owned word-wise clearing for the Darwin LLVM zero-fill helper. |
| [`silk.support.memcmp`](/docs/std/support-memcmp) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memcpy`](/docs/std/support-memcpy) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memmove`](/docs/std/support-memmove) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memset`](/docs/std/support-memset) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.system.child_process`](/docs/std/system-child-process) | System | `ChildProcess` | Run another program, wait for it to end, and get its exit code and all of its output. |
| [`silk.system.child_process_native`](/docs/std/system-child-process-native) | System | `OsChildProcess` | The native provider of the \`ChildProcess\` effect: it runs real programs. |
| [`silk.system.child_process_native`](/docs/std/system-child-process-native) | System | `OsChildProcess` | The native provider of the \`ChildProcess\` effect: it runs real programs. |
| [`silk.system.child_process_native`](/docs/std/system-child-process-native) | System | `OsChildProcess` | The native provider of the \`ChildProcess\` effect: it runs real programs. |
| [`silk.system.filesystem`](/docs/std/system-filesystem) | System | `FileSystem` | Files and directories through the \`FileSystem\` effect: paths, whole-file reads and writes, atomic writes, directory listings, and temporary directories. |
| [`silk.system.filesystem_machine`](/docs/std/system-filesystem-machine) | System | `MachineFileSystem` | A filesystem provider for absolute paths in the host machine namespace. |
| [`silk.system.filesystem_machine`](/docs/std/system-filesystem-machine) | System | `MachineFileSystem` | A filesystem provider for absolute paths in the host machine namespace. |
| [`silk.system.filesystem_native`](/docs/std/system-filesystem-native) | System | `OsFileSystem` | The native provider of the \`FileSystem\` effect, confined to one directory of the host. |
| [`silk.system.filesystem_native`](/docs/std/system-filesystem-native) | System | `OsFileSystem` | The native provider of the \`FileSystem\` effect, confined to one directory of the host. |
| [`silk.system.glob_scan`](/docs/std/system-glob-scan) | System | `glob_scan` | Find the files and directories that a glob pattern matches, by walking directories through the \`FileSystem\` effect. |
| [`silk.system.host_input`](/docs/std/system-host-input) | System | `HostInput` | The \`HostInput\` effect: the command-line arguments, environment variables, and working directory of the process, as bytes. |
| [`silk.system.host_input_native`](/docs/std/system-host-input-native) | System | `OsHostInput` | The native provider of the \`HostInput\` effect: command-line arguments, environment, and the working directory. |
| [`silk.system.host_input_native`](/docs/std/system-host-input-native) | System | `OsHostInput` | The native provider of the \`HostInput\` effect: command-line arguments, environment, and the working directory. |
| [`silk.system.insecure_random`](/docs/std/system-insecure-random) | System | `InsecureRandom` | The \`InsecureRandom\` effect: a fast pseudorandom sequence that repeats for the same seed. |
| [`silk.system.insecure_seed`](/docs/std/system-insecure-seed) | System | `InsecureSeed` | The \`InsecureSeed\` effect: one fixed 128-bit value that a program reads when it starts. |
| [`silk.system.monotonic_clock`](/docs/std/system-monotonic-clock) | System | `MonotonicClock` | The \`MonotonicClock\` effect: time that never goes back, for durations, timeouts, and waits. |
| [`silk.system.monotonic_clock_native`](/docs/std/system-monotonic-clock-native) | System | `OsMonotonicClock` | The native provider of the \`MonotonicClock\` effect: a clock that never goes back. |
| [`silk.system.random`](/docs/std/system-random) | System | `Random` | The \`Random\` effect: random bytes that are safe for secrets. |
| [`silk.system.random_native`](/docs/std/system-random-native) | System | `OsRandom` | The native provider of the \`Random\` effect: secure random bytes from the operating system. |
| [`silk.system.signal_watch`](/docs/std/system-signal-watch) | System | `SignalWatch` | Receive process signals, such as an interrupt or a terminal resize, through a descriptor that an event loop can watch. |
| [`silk.system.signal_watch`](/docs/std/system-signal-watch) | System | `SignalWatch` | Receive process signals, such as an interrupt or a terminal resize, through a descriptor that an event loop can watch. |
| [`silk.system.subprocess`](/docs/std/system-subprocess) | System | `Subprocess` | Start a child process whose standard streams stay open while it runs, send it signals, and learn when it ends through a descriptor that an event loop can watch. |
| [`silk.system.subprocess`](/docs/std/system-subprocess) | System | `Subprocess` | Start a child process whose standard streams stay open while it runs, send it signals, and learn when it ends through a descriptor that an event loop can watch. |
| [`silk.system.system_clock`](/docs/std/system-system-clock) | System | `SystemClock` | The \`SystemClock\` effect: the current date and time as Unix time, and the \[\`Instant\`\] type that both clocks use. |
| [`silk.system.system_clock_native`](/docs/std/system-system-clock-native) | System | `OsSystemClock` | The native provider of the \`SystemClock\` effect: the time of day, as seconds since 1970. |
| [`silk.system.system_clock_native`](/docs/std/system-system-clock-native) | System | `OsSystemClock` | The native provider of the \`SystemClock\` effect: the time of day, as seconds since 1970. |
| [`silk.system.system_info`](/docs/std/system-system-info) | System | `SystemInfo` | The \`SystemInfo\` effect: facts about the computer and the running process that the operating system reports, such as the host name, the memory, the processors, the network interfaces, the current user, and the resource usage of the process. |
| [`silk.system.system_info_native`](/docs/std/system-system-info-native) | System | `OsSystemInfo` | The native provider of the \`SystemInfo\` effect: facts about the computer and the process from the C library and the kernel. |
| [`silk.system.system_info_native`](/docs/std/system-system-info-native) | System | `OsSystemInfo` | The native provider of the \`SystemInfo\` effect: facts about the computer and the process from the C library and the kernel. |
| [`silk.system.terminal`](/docs/std/system-terminal) | System | `Terminal` | Read the size of a terminal, and switch it between its normal mode and raw mode. |
| [`silk.system.terminal`](/docs/std/system-terminal) | System | `Terminal` | Read the size of a terminal, and switch it between its normal mode and raw mode. |
| [`silk.testing.exchange`](/docs/std/testing-exchange) | Testing | `TestExchange` | The binary plan and receipt formats that let \`silk test\` control the test runner. |
| [`silk.testing.runner`](/docs/std/testing-runner) | Testing | `TestRunner` | The built-in test runner that \`silk test\` selects. It runs tests one at a time. |
| [`silk.testing.testing`](/docs/std/testing-testing) | Testing | `Testing` | Assertions for tests, and the filter rules that the test runner uses to select tests. |
| [`silk.text.bidi`](/docs/std/text-bidi) | Text | `bidi` | The Unicode Bidirectional Algorithm (UAX #9) for text that mixes left-to-right and right-to-left scripts, with data from Unicode 18.0.0. |
| [`silk.text.byte_search`](/docs/std/text-byte-search) | Text | `byte_search` | Fast searches over byte slices: the first or last position of a byte, the first of two or three bytes, the number of times a byte occurs, and the first position of a byte sequence. |
| [`silk.text.char`](/docs/std/text-char) | Text | `char` | Conversion between \`char\` and integers, and named comparison functions for \`char\`. |
| [`silk.text.format`](/docs/std/text-format) | Text | `Format` | Text output for values through the ambient \`Writer\`, compile-time checked templates, and decimal parsing. |
| [`silk.text.glob`](/docs/std/text-glob) | Text | `glob` | Glob patterns: compile a pattern such as \`src/\*\*/\*.{silk,toml}\` and test paths against it, and inspect text for glob syntax. |
| [`silk.text.line_break`](/docs/std/text-line-break) | Text | `line_break` | Line break opportunities: the Unicode Line Breaking Algorithm (UAX #14) with CSS tailoring, with data from Unicode 18.0.0. |
| [`silk.text.script_itemization`](/docs/std/text-script-itemization) | Text | `script_itemization` | Script itemization: the split of a text into runs of one script each (UAX #24), with data from Unicode 18.0.0. |
| [`silk.text.segmentation`](/docs/std/text-segmentation) | Text | `segmentation` | Grapheme cluster, word and sentence boundaries (UAX #29), with data from Unicode 18.0.0. |
| [`silk.text.string`](/docs/std/text-string) | Text | `String` | UTF-8 text: owned strings, validation of bytes, search, splitting, trimming, and traversal one Unicode scalar at a time. |
| [`silk.text.unicode`](/docs/std/text-unicode) | Text | `Unicode` | Unicode canonical normalization (NFC and NFD), canonical composition, and the Boolean and mapping character properties, with data from Unicode 18.0.0. |
| [`silk.text.unicode_data`](/docs/std/text-unicode-data) |  | `unicode_data` |  |
| [`silk.text.unicode_properties`](/docs/std/text-unicode-properties) |  | `GeneralCategory` |  |
| [`silk.text.unicode_script`](/docs/std/text-unicode-script) | Text | `Script` | Unicode scripts as ISO 15924 values, and the Script and Script\_Extensions properties, with data from Unicode 18.0.0. |
| [`silk.text.utf8_decoder`](/docs/std/text-utf8-decoder) | Text | `Utf8Decoder` | Decoding of UTF-8 one byte at a time, for input that arrives in chunks. No allocation. |
| [`silk.text.utf8_scan`](/docs/std/text-utf8-scan) | Text | `utf8_scan` | Random-access decoding of one Unicode scalar from UTF-8 bytes, for text algorithms that scan by byte offset. |
| [`silk.text.vertical_text`](/docs/std/text-vertical-text) | Text | `vertical_text` | Character orientation in vertical text (UAX #50), with data from Unicode 18.0.0. |
| [`silk.text.word_dictionary`](/docs/std/text-word-dictionary) | Text | `IcuDictionary` | Dictionary word segmentation for Thai, Lao, Khmer and Myanmar text, for line breaking, with the dictionaries of ICU 78.1. |
| [`silk.text.word_dictionary_khmer`](/docs/std/text-word-dictionary-khmer) | Text | `word_dictionary_khmer` | The packed ICU Khmer word dictionary trie for \`silk.text.word\_dictionary\`. |
| [`silk.text.word_dictionary_lao`](/docs/std/text-word-dictionary-lao) | Text | `word_dictionary_lao` | The packed ICU Lao word dictionary trie for \`silk.text.word\_dictionary\`. |
| [`silk.text.word_dictionary_myanmar`](/docs/std/text-word-dictionary-myanmar) | Text | `word_dictionary_myanmar` | The packed ICU Burmese (Myanmar) word dictionary trie for \`silk.text.word\_dictionary\`. |
| [`silk.text.word_dictionary_thai`](/docs/std/text-word-dictionary-thai) | Text | `word_dictionary_thai` | The packed ICU Thai word dictionary trie for \`silk.text.word\_dictionary\`. |
| [`silk.tls.certificate`](/docs/std/tls-certificate) | TLS and certificates | `Certificate` | Decode one X.509 certificate from DER or PEM, and read its fields. |
| [`silk.tls.certificate_bundle`](/docs/std/tls-certificate-bundle) | TLS and certificates | `CertificateBundle` | Decode a PEM file with one or more certificates, such as a certificate chain or a CA bundle. |
| [`silk.tls.certificate_identities`](/docs/std/tls-certificate-identities) | TLS and certificates | `CertificateSan` | Decode the subject alternative names (SAN) of a certificate: the DNS names and IP addresses that it is for. |
| [`silk.tls.certificate_path`](/docs/std/tls-certificate-path) | TLS and certificates | `CertificatePath` | Validate the certificate chain of a TLS server or client, from its leaf certificate to a trust anchor. |
| [`silk.tls.certificate_pem`](/docs/std/tls-certificate-pem) | TLS and certificates | `Pem` | Internal strict PEM framing and canonical base64 for owned certificate decoders. |
| [`silk.tls.certificate_profile`](/docs/std/tls-certificate-profile) | TLS and certificates | `CertificateProfile` | Check one certificate against the TLS server certificate profile, and read its extensions. |
| [`silk.tls.certificate_text`](/docs/std/tls-certificate-text) | TLS and certificates | `CertificateText` | Text forms of certificate fields as OpenSSL prints them: object names, distinguished names, validity times, and serial numbers. |
| [`silk.tls.client`](/docs/std/tls-client) | TLS and certificates | `Client` | A TLS 1.2 and TLS 1.3 client state machine that authenticates an HTTPS server over a byte transport that you drive. |
| [`silk.tls.connection`](/docs/std/tls-connection) | TLS and certificates | `OwnedConnection` | An authenticated TLS 1.2 or TLS 1.3 connection over a \`ByteDuplex\` transport, with timeouts and close handling. |
| [`silk.tls.hkdf`](/docs/std/tls-hkdf) | TLS and certificates | `TlsHkdfSha256` | The TLS 1.3 key schedule functions \`HKDF-Expand-Label\` and \`Derive-Secret\` (RFC 8446, section 7.1). |
| [`silk.tls.https_identity`](/docs/std/tls-https-identity) | TLS and certificates | `HttpsIdentity` | Check that a server certificate is for the host name or IP address in an HTTPS URL (RFC 6125 and RFC 9110). |
| [`silk.tls.prf`](/docs/std/tls-prf) | TLS and certificates | `TlsPrf` | The TLS 1.2 pseudorandom function (RFC 5246 section 5) and the secrets that TLS 1.2 derives with it: the extended master secret (RFC 7627), the key block, and Finished. |
| [`silk.tls.record`](/docs/std/tls-record) | TLS and certificates | `TlsRecordSender` | Frame and protect TLS 1.3 records (RFC 8446, section 5) and TLS 1.2 AEAD records (RFC 5246, section 6.2) over a byte transport that you drive. |
| [`silk.tls.server`](/docs/std/tls-server) | TLS and certificates | `Server` | A TLS 1.2 and TLS 1.3 server state machine that does the handshake and protects application data over a byte transport that you drive. |
| [`silk.tls.signature`](/docs/std/tls-signature) | TLS and certificates | `HandshakeSignature` | Check a TLS 1.3 or TLS 1.2 handshake signature with the public key of a peer's leaf certificate, and sign one with a leaf's private key. |
| [`silk.tls.trust_anchor`](/docs/std/tls-trust-anchor) | TLS and certificates | `TrustAnchor` | A trust anchor: a CA certificate that you trust, with optional limits that you add. |
| [`silk.tls.trust_snapshot`](/docs/std/tls-trust-snapshot) | TLS and certificates | `TrustSnapshot` | A fixed list of trust anchors: the root CAs that certificate path validation starts from. |
| [`silk.tls.trust_source`](/docs/std/tls-trust-source) | TLS and certificates | `TrustSource` | The \`TrustSource\` effect: where a program gets its trust anchors. |
| [`silk.tls.trust_source_memory`](/docs/std/tls-trust-source-memory) | TLS and certificates | `MemoryTrustSource` | A \`TrustSource\` provider that holds a trust snapshot in memory. |
| [`silk.tls.trust_source_native`](/docs/std/tls-trust-source-native) | TLS and certificates | `NativeFileTrustSource` | A native \`TrustSource\` provider that loads trust anchors from one PEM file. |
| [`silk.tls.trust_source_native`](/docs/std/tls-trust-source-native) | TLS and certificates | `NativeFileTrustSource` | A native \`TrustSource\` provider that loads trust anchors from one PEM file. |
| [`silk.tls.trust_source_windows`](/docs/std/tls-trust-source-windows) | TLS and certificates | `WindowsRootTrustSource` | A \`TrustSource\` provider for the current user's Windows \`ROOT\` certificate store. |
| [`silk.tls.trust_source_windows`](/docs/std/tls-trust-source-windows) | TLS and certificates | `WindowsRootTrustSource` | A \`TrustSource\` provider for the current user's Windows \`ROOT\` certificate store. |
| [`silk.toml.codec`](/docs/std/toml-codec) | Data formats | `TomlCodec` | Convert TOML values to Silk values, and write Silk values as TOML. |
| [`silk.toml.output`](/docs/std/toml-output) | Data formats | `TomlOutput` | Write a TOML document or a single TOML string or key through the ambient \`Writer\`. |
| [`silk.toml.scanner`](/docs/std/toml-scanner) | Data formats | `TomlScanner` | Validate TOML source and read it as a sequence of tokens. |
| [`silk.toml.text`](/docs/std/toml-text) | Data formats | `TomlText` | Decode TOML string tokens into owned UTF-8 text. |
| [`silk.toml.value`](/docs/std/toml-value) | Data formats | `Toml` | Parse a TOML document into an owned tree of values, and read fields from it. |
| [`silk.uri.components`](/docs/std/uri-components) | Data formats | `UriComponents` | Build a URI reference from its components, or change the components of a parsed one. |
| [`silk.uri.percent`](/docs/std/uri-percent) | Data formats | `UriPercent` | Percent-encode bytes for a URI component, and decode \`%XX\` escapes. |
| [`silk.uri.reference`](/docs/std/uri-reference) | Data formats | `UriReference` | Parse a URI or a relative reference (RFC 3986) and read its components without allocation. |
| [`silk.uri.uri`](/docs/std/uri-uri) | Data formats | `Uri` | Parse an absolute URI (RFC 3986), and resolve relative references against it. |
| [`silk.xml.document`](/docs/std/xml-document) | Data formats | `XmlDocument` | Parse an XML 1.0 document into an owned, namespace-aware tree of elements, text, comments, and processing instructions. |

Profile identities:

- `aarch64-apple-darwin`: target `aarch64-apple-darwin`.
- `aarch64-unknown-linux-gnu`: target `aarch64-unknown-linux-gnu`.
- `aarch64-unknown-linux-gnu-no-libc`: target `aarch64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu`: target `x86_64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu-no-libc`: target `x86_64-unknown-linux-gnu`.
- `wasm32-unknown-unknown`: target `wasm32-unknown-unknown`.
- `wasm32-wasip1`: target `wasm32-wasip1`.
- `wasm32-wasip2`: target `wasm32-wasip2`.
- `x86_64-pc-windows-msvc`: target `x86_64-pc-windows-msvc`.
- `wasm64-unknown-unknown`: target `wasm64-unknown-unknown`.

## See also

- [Tutorial](https://github.com/silk-lang/silk/blob/main/reference/tutorial.md)
- [Language reference](https://github.com/silk-lang/silk/tree/main/reference/)
- [Diagnostic index](https://github.com/silk-lang/silk/blob/main/reference/diagnostics.md)
