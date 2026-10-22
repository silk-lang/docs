Each page describes the selected source API for the listed profiles. Distinct surfaces have separate pages.

| Module | Category | Import namespace | Summary |
| --- | --- | --- | --- |
| [`silk.aes_gcm`](/docs/std/aes-gcm) | Cryptography | `AesGcm` | Encrypt and authenticate data with AES-128-GCM or AES-256-GCM (NIST SP 800-38D). |
| [`silk.allocator`](/docs/std/allocator) | Memory | `Allocator` | The \`Allocator\` service: the source of owned heap storage in the standard library. |
| [`silk.arch.aarch64`](/docs/std/aarch64) | SIMD | `aarch64` | AArch64 NEON instructions that the portable \`silk.simd\` operations do not express: table lookups, dot products, pairwise sums, and AES round steps. |
| [`silk.arch.aes`](/docs/std/aes) | Cryptography | `aes` | The steps of an AES round on one 16-byte state, computed with portable code: SubBytes, ShiftRows and MixColumns, and their inverses. |
| [`silk.arch.wasm`](/docs/std/wasm) | SIMD | `wasm` | WebAssembly SIMD instructions that the portable \`silk.simd\` operations do not express: byte swizzles, dot products, and saturating narrows. |
| [`silk.arch.x86`](/docs/std/x86) | SIMD | `x86` | x86-64 SIMD instructions that the portable \`silk.simd\` operations do not express: byte table lookups, multiply-add steps, saturating packs, sums of absolute differences, AES rounds and carry-less multiplication. |
| [`silk.arena`](/docs/std/arena) | Memory | `Arena` | A bump allocator over chunks it acquires from another allocator. |
| [`silk.atomic`](/docs/std/atomic) | Concurrency | `Atomic` | Atomic memory operations on raw pointers, with explicit memory orderings. |
| [`silk.base64`](/docs/std/base64) | Data formats | `Base64` | Encode and decode standard Base64 (RFC 4648, with padding) into byte slices that you supply. |
| [`silk.blake2b`](/docs/std/blake2b) | Cryptography | `Blake2b512` | Portable BLAKE2b-512 state for the unkeyed 64-byte cryptographic digest of RFC 7693. |
| [`silk.bool`](/docs/std/bool) | Core | `bool` | Named functions for Boolean equality and negation. |
| [`silk.box`](/docs/std/box) | Memory | `Box` | One owned value on the heap, for recursive data and for values that must have a fixed-size handle. |
| [`silk.buffered_duplex`](/docs/std/buffered-duplex) | Input and output | `BufferedDuplex` | A buffered session that reads and writes one \`ByteDuplex\` transport inside a callback. |
| [`silk.buffered_input`](/docs/std/buffered-input) | Input and output | `BufferedInput` | A fixed-size input buffer for parsers that must look at bytes before they use them. |
| [`silk.buffered_output`](/docs/std/buffered-output) | Input and output | `BufferedOutput` | A fixed-size output buffer that collects small writes and sends them as larger writes. |
| [`silk.buffered_transfer`](/docs/std/buffered-transfer) | Input and output | `BufferedTransfer` | Copy bytes from one buffered session to another, and consume only what the destination accepts. |
| [`silk.byte_duplex`](/docs/std/byte-duplex) | Input and output | `ByteDuplex` | The \`ByteDuplex\` effect: a two-way byte stream, such as a TCP connection, with partial reads and writes and deadlines. |
| [`silk.byte_search`](/docs/std/byte-search) | Text | `byte_search` | Fast searches over byte slices: the first or last position of a byte, the first of two or three bytes, the number of times a byte occurs, and the first position of a byte sequence. |
| [`silk.bytes`](/docs/std/bytes) | Collections | `Bytes` | Owned byte buffers for file contents, process output, and other data with no fixed encoding. |
| [`silk.certificate`](/docs/std/certificate) | TLS and certificates | `Certificate` | Decode one X.509 certificate from DER or PEM, and read its fields. |
| [`silk.certificate_bundle`](/docs/std/certificate-bundle) | TLS and certificates | `CertificateBundle` | Decode a PEM file with one or more certificates, such as a certificate chain or a CA bundle. |
| [`silk.certificate_identities`](/docs/std/certificate-identities) | TLS and certificates | `CertificateSan` | Decode the subject alternative names (SAN) of a certificate: the DNS names and IP addresses that it is for. |
| [`silk.certificate_path`](/docs/std/certificate-path) | TLS and certificates | `CertificatePath` | Validate the certificate chain of a TLS server, from its leaf certificate to a trust anchor. |
| [`silk.certificate_profile`](/docs/std/certificate-profile) | TLS and certificates | `CertificateProfile` | Check one certificate against the TLS server certificate profile, and read its extensions. |
| [`silk.chacha20_poly1305`](/docs/std/chacha20-poly1305) | Cryptography | `ChaCha20Poly1305` | Encrypt and authenticate data with ChaCha20-Poly1305 (RFC 8439). |
| [`silk.char`](/docs/std/char) | Text | `char` | Conversion between \`char\` and integers, and named comparison functions for \`char\`. |
| [`silk.child_process`](/docs/std/child-process) | System | `ChildProcess` | Run another program, wait for it to end, and get its exit code and all of its output. |
| [`silk.compilation`](/docs/std/compilation) | Core | `Compilation` | Build choices of the current compilation, such as safety, threading, and artifact kind, for use in static evaluation. |
| [`silk.cpu`](/docs/std/cpu) | SIMD | `CpuFeatures` | Runtime detection of the CPU features that the running machine has. |
| [`silk.ed25519`](/docs/std/ed25519) | Cryptography | `Ed25519PublicKey` | Ed25519 signature verification for 32-byte public keys and 64-byte signatures (RFC 8032). |
| [`silk.effect`](/docs/std/effect) | Core | `Effect` | Combinators for lazy effect values: transform success, recover typed failures, supply services, and run cleanup. |
| [`silk.equal`](/docs/std/equal) | Core | `Equal` | The interface that gives user types the \`==\` and \`!=\` operators. |
| [`silk.execution`](/docs/std/execution) | Concurrency | `Execution` | Lazy computations with their own storage, which an owner drives and resumes. |
| [`silk.execution_storage`](/docs/std/execution-storage) | Concurrency | `ExecutionStorage` | Storage for the private execution frames that the compiler makes. |
| [`silk.execution_storage`](/docs/std/execution-storage) | Concurrency | `ExecutionStorage` | Storage for the private execution frames that the compiler makes. |
| [`silk.f32`](/docs/std/f32) | Numbers | `f32` | IEEE binary32 values with deterministic representation, classification, and math operations. |
| [`silk.f64`](/docs/std/f64) | Numbers | `f64` | IEEE binary64 values and Silk's default floating-point arithmetic. |
| [`silk.fiber`](/docs/std/fiber) | Concurrency | `Fiber` | Fibers: handles to child tasks, with typed outcomes and one observer each. |
| [`silk.filesystem`](/docs/std/filesystem) | System | `FileSystem` | Files and directories through the \`FileSystem\` effect: paths, whole-file reads and writes, atomic writes, directory listings, and temporary directories. |
| [`silk.format`](/docs/std/format) | Text | `Format` | Text output for values through the ambient \`Writer\`, compile-time checked templates, and decimal parsing. |
| [`silk.hash`](/docs/std/hash) | Collections | `HashKey` | Deterministic seeded hashing for hash maps, hash sets, and key types that users define. |
| [`silk.hash_map`](/docs/std/hash-map) | Collections | `HashMap` | Hash maps that own their keys and values, with deterministic seeded hashing. |
| [`silk.hash_set`](/docs/std/hash-set) | Collections | `HashSet` | Hash sets that own their elements, with deterministic seeded hashing. |
| [`silk.hkdf`](/docs/std/hkdf) | Cryptography | `HkdfSha256` | Derive keys with HKDF (RFC 5869) over SHA-256 or SHA-384. |
| [`silk.hmac`](/docs/std/hmac) | Cryptography | `HmacSha256` | Compute HMAC tags (RFC 2104) with SHA-256 or SHA-384. |
| [`silk.host_input`](/docs/std/host-input) | System | `HostInput` | The \`HostInput\` effect: the command-line arguments, environment variables, and working directory of the process, as bytes. |
| [`silk.http`](/docs/std/http) | HTTP | `Version` | HTTP/1.0 and HTTP/1.1 values: versions, methods, statuses, header fields, and message heads. |
| [`silk.http_basic`](/docs/std/http-basic) | HTTP | `HttpBasic` | Make the value of an \`Authorization: Basic\` header from a username and a password. |
| [`silk.http_body`](/docs/std/http-body) | HTTP | `Decoder` | Read and write the body of an HTTP/1 message: fixed length, chunked, or until the connection closes. |
| [`silk.http_client`](/docs/std/http-client) | HTTP | `HttpClient` | A simple HTTP client: send a request, and get the whole response in memory. |
| [`silk.http_client_native`](/docs/std/http-client-native) | HTTP | `HttpClientNative` | The native provider for the \`Http\` service of \[\`silk.http\_client\`\]. |
| [`silk.http_client_native`](/docs/std/http-client-native) | HTTP | `HttpClientNative` | The native provider for the \`Http\` service of \[\`silk.http\_client\`\]. |
| [`silk.http_connection_pool`](/docs/std/http-connection-pool) | HTTP | `Pool` | A bounded pool of HTTP/1 connections, for reuse across requests to the same origin. |
| [`silk.http_connection_pool_native`](/docs/std/http-connection-pool-native) | HTTP | `PoolNative` | Connection pools that open native TCP, HTTPS, and Unix socket connections. |
| [`silk.http_content`](/docs/std/http-content) | HTTP | `ContentReader` | Decode the content of an HTTP response: gzip, deflate, and Zstandard, as named in \`Content-Encoding\`. |
| [`silk.http_exchange`](/docs/std/http-exchange) | HTTP | `Exchange` | Run HTTP/1 requests over a connection step by step: send the head, stream the body, and read the response. |
| [`silk.http_exchange_native`](/docs/std/http-exchange-native) | HTTP | `HttpExchangeNative` | Native TCP, Unix socket, and TLS connections for HTTP clients. |
| [`silk.http_fetch`](/docs/std/http-fetch) | HTTP | `Fetch` | Send one HTTP request, follow redirects, decode the content, and deliver the body to a destination that you choose. |
| [`silk.http_fetch_native`](/docs/std/http-fetch-native) | HTTP | `FetchNative` | The native \[\`Context\`\] for \`silk.http\_fetch\`: it connects over sockets and TLS, with a proxy policy and an optional connection pool. |
| [`silk.http_fetch_native`](/docs/std/http-fetch-native) | HTTP | `FetchNative` | The native \[\`Context\`\] for \`silk.http\_fetch\`: it connects over sockets and TLS, with a proxy policy and an optional connection pool. |
| [`silk.http_head`](/docs/std/http-head) | HTTP | `RequestParser` | Parse and write the head of an HTTP/1.0 or HTTP/1.1 message: the start line and the header fields. |
| [`silk.http_headers`](/docs/std/http-headers) | HTTP | `Headers` | An ordered list of HTTP header fields, with lookup by name, copies, and formatting. |
| [`silk.http_origin`](/docs/std/http-origin) | HTTP | `Origin` | The origin of an HTTP request: the scheme, host, and port that a connection goes to. |
| [`silk.http_proxy`](/docs/std/http-proxy) | HTTP | `ProxyConfig` | Proxy settings for HTTP clients, and the choice of a route for each origin. |
| [`silk.http_redirect`](/docs/std/http-redirect) | HTTP | `Redirect` | Follow HTTP redirects with a \[\`Policy\`\]: which statuses to follow, how the method and the body change, which origins are allowed, and which headers are kept. |
| [`silk.http_request`](/docs/std/http-request) | HTTP | `HttpRequest` | Check and write the head of an HTTP request before it is sent. |
| [`silk.http_server`](/docs/std/http-server) | HTTP | `Connection` | The server side of one HTTP/1.0 or HTTP/1.1 connection, with streaming bodies and fixed limits. |
| [`silk.http_server_native`](/docs/std/http-server-native) | HTTP | `HttpServerNative` | Accepts native socket connections and serves each one with \`silk.http\_server\`. |
| [`silk.http_server_native`](/docs/std/http-server-native) | HTTP | `HttpServerNative` | Accepts native socket connections and serves each one with \`silk.http\_server\`. |
| [`silk.http_target`](/docs/std/http-target) | HTTP | `RequestTarget` | The target of an HTTP request, the authority in it, and the \`Host\` field. |
| [`silk.http_transport`](/docs/std/http-transport) | HTTP | `HttpTransport` | The byte transport under an HTTP connection: plain bytes or TLS. |
| [`silk.https_identity`](/docs/std/https-identity) | TLS and certificates | `HttpsIdentity` | Check that a server certificate is for the host name or IP address in an HTTPS URL (RFC 6125 and RFC 9110). |
| [`silk.i16`](/docs/std/i16) | Numbers | `i16` | Sixteen-bit signed integers with explicit overflow, conversion, and text policies. |
| [`silk.i32`](/docs/std/i32) | Numbers | `i32` | Thirty-two-bit signed integers and the default type of context-free integer literals. |
| [`silk.i64`](/docs/std/i64) | Numbers | `i64` | Sixty-four-bit signed integers for large fixed-width values and exact integer protocols. |
| [`silk.i8`](/docs/std/i8) | Numbers | `i8` | Eight-bit signed integers for compact values, byte-level formats, and narrow arithmetic. |
| [`silk.inflate`](/docs/std/inflate) | Data formats | `Decoder` | Decompress raw DEFLATE, zlib, and gzip data in steps, with fixed memory and limits that you set. |
| [`silk.insecure_random`](/docs/std/insecure-random) | System | `InsecureRandom` | The \`InsecureRandom\` effect: a fast pseudorandom sequence that repeats for the same seed. |
| [`silk.insecure_seed`](/docs/std/insecure-seed) | System | `InsecureSeed` | The \`InsecureSeed\` effect: one fixed 128-bit value that a program reads when it starts. |
| [`silk.isize`](/docs/std/isize) | Numbers | `isize` | Pointer-width signed integers for offsets whose range follows the selected compilation target. |
| [`silk.json_array`](/docs/std/json-array) | Data formats | `JsonArray` | Write a JSON array to the \`Writer\`. |
| [`silk.json_codec`](/docs/std/json-codec) | Data formats | `JsonCodec` | The interfaces that let a type be written to JSON and read from JSON. |
| [`silk.json_object`](/docs/std/json-object) | Data formats | `JsonObject` | Write a JSON object, one member at a time, to the \`Writer\`. |
| [`silk.json_output`](/docs/std/json-output) | Data formats | `JsonOutput` | Low-level JSON output: strings, numbers, and punctuation, and the \[\`JsonOptions\`\] for layout. |
| [`silk.json_reader`](/docs/std/json-reader) | Data formats | `JsonReader` | Read JSON tokens from a \`BufferedInput\`, for documents that do not fit in one slice. |
| [`silk.json_reflect`](/docs/std/json-reflect) | Data formats | `JsonReflect` | Write a struct as a JSON object from its fields, without writing each field by hand. |
| [`silk.json_scanner`](/docs/std/json-scanner) | Data formats | `JsonScanner` | Read JSON as a sequence of tokens, without building a tree and without allocating. |
| [`silk.json_text`](/docs/std/json-text) | Data formats | `JsonText` | Decode the text of a JSON string token, including its escapes, into owned bytes. |
| [`silk.json_value`](/docs/std/json-value) | Data formats | `Json` | Parse JSON into a tree of values, read fields from it, and write it back. |
| [`silk.layout`](/docs/std/layout) | Memory | `Layout` | Byte size and alignment values that describe the memory to request from an allocator. |
| [`silk.list`](/docs/std/list) | Collections | `List` | Growable lists that own their elements, with stable sorting and binary search. |
| [`silk.local_scheduler`](/docs/std/local-scheduler) | Concurrency | `LocalScheduler` | A deterministic, single-threaded scheduler for structured Fibers. |
| [`silk.logger`](/docs/std/logger) | Input and output | `Logger` | The \`Logger\` effect: log messages with a level, a template, and values. |
| [`silk.memory_byte_duplex`](/docs/std/memory-byte-duplex) | Input and output | `MemoryByteDuplex` | A scripted \`ByteDuplex\` transport in memory, for tests of protocol code. |
| [`silk.memory_trust_source`](/docs/std/memory-trust-source) | TLS and certificates | `MemoryTrustSource` | A \`TrustSource\` provider that holds a trust snapshot in memory. |
| [`silk.metrics`](/docs/std/metrics) | Memory | `AllocationMetrics` | Allocation counters that an \`Allocator\` provider can keep and publish. |
| [`silk.monotonic_clock`](/docs/std/monotonic-clock) | System | `MonotonicClock` | The \`MonotonicClock\` effect: time that never goes back, for durations, timeouts, and waits. |
| [`silk.native_clock`](/docs/std/native-clock) | Native platform | `NativeClock` | Direct calls to the clocks of the system, for the native clock providers. |
| [`silk.native_descriptor`](/docs/std/native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.native_descriptor`](/docs/std/native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.native_descriptor`](/docs/std/native-descriptor) | Native platform | `NativeDescriptor` | Reads and writes on file descriptors that the caller owns, for native providers. |
| [`silk.native_diagnostics`](/docs/std/native-diagnostics) | Native platform | `NativeDiagnostics` | The native observer that reports unhandled errors and traps, with their call path. |
| [`silk.native_diagnostics`](/docs/std/native-diagnostics) | Native platform | `NativeDiagnostics` | The native observer that reports unhandled errors and traps, with their call path. |
| [`silk.native_file_trust_source`](/docs/std/native-file-trust-source) | TLS and certificates | `NativeFileTrustSource` | A native \`TrustSource\` provider that loads trust anchors from one PEM file. |
| [`silk.native_file_trust_source`](/docs/std/native-file-trust-source) | TLS and certificates | `NativeFileTrustSource` | A native \`TrustSource\` provider that loads trust anchors from one PEM file. |
| [`silk.native_filesystem`](/docs/std/native-filesystem) | Native platform | `NativeFileSystem` | The system calls for files and directories, for the native \`FileSystem\` provider. |
| [`silk.native_filesystem`](/docs/std/native-filesystem) | Native platform | `NativeFileSystem` | The system calls for files and directories, for the native \`FileSystem\` provider. |
| [`silk.native_host_input`](/docs/std/native-host-input) | Native platform | `NativeHostInput` | Owned copies of the command-line arguments and the environment of the process. |
| [`silk.native_host_input`](/docs/std/native-host-input) | Native platform | `NativeHostInput` | Owned copies of the command-line arguments and the environment of the process. |
| [`silk.native_process`](/docs/std/native-process) | Native platform | `NativeProcess` | Runs a child process with the system calls, for the native \`ChildProcess\` provider. |
| [`silk.native_process`](/docs/std/native-process) | Native platform | `NativeProcess` | Runs a child process with the system calls, for the native \`ChildProcess\` provider. |
| [`silk.native_report`](/docs/std/native-report) | Native platform | `NativeReport` | Writes the report of an unhandled error or a trap to a descriptor, with fixed limits. |
| [`silk.native_report`](/docs/std/native-report) | Native platform | `NativeReport` | Writes the report of an unhandled error or a trap to a descriptor, with fixed limits. |
| [`silk.native_resolver`](/docs/std/native-resolver) | Networking | `NativeSystemResolver` | The native provider of the \`Resolver\` effect, with the \`getaddrinfo\` function of the system. |
| [`silk.native_socket`](/docs/std/native-socket) | Networking | `NativeSocket` | TCP and Unix socket connections and listeners, as \`ByteDuplex\` providers. |
| [`silk.native_start`](/docs/std/native-start) | Native platform | `NativeStart` | The default start code of a native program: it calls your \`main\` and returns its status. |
| [`silk.native_start_sync`](/docs/std/native-start-sync) | Native platform | `NativeStartSync` | A minimal start code for a native program whose \`main\` is an \`i32\` effect that requires \`&mut HostInput\`. |
| [`silk.native_thread`](/docs/std/native-thread) | Concurrency | `NativeThread` | Operating-system threads that each run one \`Transferable\` closure and return its result. |
| [`silk.network_address`](/docs/std/network-address) | Networking | `NetworkAddress` | IP addresses, ports, endpoints, and the host of a URI, as checked values that do not allocate. |
| [`silk.numeric`](/docs/std/numeric) | Numbers | `Numeric` | Generic helpers for algorithms over primitive integers. |
| [`silk.ops`](/docs/std/ops) | Core | `Add` | The interfaces that give user types the arithmetic, bitwise, and logical operators. |
| [`silk.option`](/docs/std/option) | Core | `Option` | Optional owned values that are present or absent, with no explanation for the absence. |
| [`silk.order`](/docs/std/order) | Core | `Order` | The interface that gives user types the \`\<\`, \`\<=\`, \`\>\`, and \`\>=\` operators. |
| [`silk.os_child_process`](/docs/std/os-child-process) | Native platform | `OsChildProcess` | The native provider of the \`ChildProcess\` effect: it runs real programs. |
| [`silk.os_child_process`](/docs/std/os-child-process) | Native platform | `OsChildProcess` | The native provider of the \`ChildProcess\` effect: it runs real programs. |
| [`silk.os_filesystem`](/docs/std/os-filesystem) | Native platform | `OsFileSystem` | The native provider of the \`FileSystem\` effect, confined to one directory of the host. |
| [`silk.os_filesystem`](/docs/std/os-filesystem) | Native platform | `OsFileSystem` | The native provider of the \`FileSystem\` effect, confined to one directory of the host. |
| [`silk.os_host_input`](/docs/std/os-host-input) | Native platform | `OsHostInput` | The native provider of the \`HostInput\` effect: command-line arguments, environment, and the working directory. |
| [`silk.os_host_input`](/docs/std/os-host-input) | Native platform | `OsHostInput` | The native provider of the \`HostInput\` effect: command-line arguments, environment, and the working directory. |
| [`silk.os_logger`](/docs/std/os-logger) | Native platform | `StdoutLogger` | Native providers of the \`Logger\` effect: \[\`StderrLogger\`\] writes log lines to standard error, and \[\`StdoutLogger\`\] writes the bare messages to standard output. |
| [`silk.os_logger`](/docs/std/os-logger) | Native platform | `StdoutLogger` | Native providers of the \`Logger\` effect: \[\`StderrLogger\`\] writes log lines to standard error, and \[\`StdoutLogger\`\] writes the bare messages to standard output. |
| [`silk.os_monotonic_clock`](/docs/std/os-monotonic-clock) | Native platform | `OsMonotonicClock` | The native provider of the \`MonotonicClock\` effect: a clock that never goes back. |
| [`silk.os_random`](/docs/std/os-random) | Native platform | `OsRandom` | The native provider of the \`Random\` effect: secure random bytes from the operating system. |
| [`silk.os_standard_input`](/docs/std/os-standard-input) | Native platform | `OsStandardInput` | The native provider of the \`StandardInput\` effect: it reads the standard input of the process. |
| [`silk.os_standard_input`](/docs/std/os-standard-input) | Native platform | `OsStandardInput` | The native provider of the \`StandardInput\` effect: it reads the standard input of the process. |
| [`silk.os_system_clock`](/docs/std/os-system-clock) | Native platform | `OsSystemClock` | The native provider of the \`SystemClock\` effect: the time of day, as seconds since 1970. |
| [`silk.os_system_clock`](/docs/std/os-system-clock) | Native platform | `OsSystemClock` | The native provider of the \`SystemClock\` effect: the time of day, as seconds since 1970. |
| [`silk.os_writer`](/docs/std/os-writer) | Native platform | `StdoutWriter` | Native \`Writer\` providers for standard output and standard error, and a lock for whole messages on standard error. |
| [`silk.os_writer`](/docs/std/os-writer) | Native platform | `StdoutWriter` | Native \`Writer\` providers for standard output and standard error, and a lock for whole messages on standard error. |
| [`silk.output`](/docs/std/output) | Memory | `Uninitialized` | Owned storage for one \`Copy\` value that a foreign function writes through a pointer. |
| [`silk.ownership`](/docs/std/ownership) | Core | `Copy` | The ordinary names for the sealed ownership properties \`Copy\` and \`Drop\`. |
| [`silk.p256`](/docs/std/p256) | Cryptography | `P256` | Key agreement (ECDH) and ECDSA signature verification on the NIST P-256 curve (secp256r1). |
| [`silk.p384`](/docs/std/p384) | Cryptography | `EcdsaP384Sha384` | Verify ECDSA signatures on the NIST P-384 curve (secp384r1) with SHA-384. |
| [`silk.pointer`](/docs/std/pointer) | Memory | `Pointer` | Raw data pointers: make them, check them for null, move along them, and read and write through them. |
| [`silk.random`](/docs/std/random) | System | `Random` | The \`Random\` effect: random bytes that are safe for secrets. |
| [`silk.raw_buffer`](/docs/std/raw-buffer) | Memory | `RawBuffer` | Typed raw storage made from an allocation, for code that implements containers. |
| [`silk.raw_linux`](/docs/std/raw-linux) | Native platform | `RawLinux` | Direct Linux system calls for programs built with no libc. |
| [`silk.raw_linux`](/docs/std/raw-linux) | Native platform | `RawLinux` | Direct Linux system calls for programs built with no libc. |
| [`silk.raw_mapping`](/docs/std/raw-mapping) | Native platform | `Mapping` | Anonymous memory mappings from the Linux kernel, for programs that run without libc. |
| [`silk.raw_mapping`](/docs/std/raw-mapping) | Native platform | `Mapping` | Anonymous memory mappings from the Linux kernel, for programs that run without libc. |
| [`silk.raw_process_inputs`](/docs/std/raw-process-inputs) | Native platform | `ProcessInputs` | The arguments, environment and page size of a raw Linux process, read from the initial stack. |
| [`silk.raw_process_inputs`](/docs/std/raw-process-inputs) | Native platform | `ProcessInputs` | The arguments, environment and page size of a raw Linux process, read from the initial stack. |
| [`silk.raw_start`](/docs/std/raw-start) | Native platform | `RawStart` | The program entry for a static, non-PIE Linux executable with no libc. |
| [`silk.reflect`](/docs/std/reflect) | Core | `Reflect` | Compile-time descriptions of the fields of a struct or tuple type, for generic code that visits each field. |
| [`silk.resolver`](/docs/std/resolver) | Networking | `Resolver` | Turn a host and a port into a list of endpoints to connect to. |
| [`silk.result`](/docs/std/result) | Core | `Result` | Completed outcomes that hold a success value or a failure value as ordinary data. |
| [`silk.rsa`](/docs/std/rsa) | Cryptography | `RsaPublicKey` | Verify RSA signatures with SHA-256: RSASSA-PSS and, for certificates, PKCS #1 v1.5. |
| [`silk.scheduler`](/docs/std/scheduler) | Concurrency | `Scheduler` | The provider protocol that prepares child Fibers and publishes them atomically. |
| [`silk.sha1`](/docs/std/sha1) | Cryptography | `Sha1` | Compute SHA-1 digests (20 bytes) for old protocols and file formats. |
| [`silk.sha2`](/docs/std/sha2) | Cryptography | `Sha256` | Compute SHA-2 digests: SHA-224, SHA-256, SHA-384, SHA-512, SHA-512/224, and SHA-512/256. |
| [`silk.sha3`](/docs/std/sha3) | Cryptography | `Sha3_256` | Compute SHA-3 digests: SHA3-224, SHA3-256, SHA3-384, and SHA3-512 (FIPS 202). |
| [`silk.shared`](/docs/std/shared) | Memory | `Shared` | Shared ownership of one mutable value on one thread, with access through callbacks. |
| [`silk.simd`](/docs/std/simd) | SIMD | `simd` | Facts about SIMD vectors on the target CPU of the current compilation. |
| [`silk.simd.f32x4`](/docs/std/f32x4) | SIMD | `f32x4` | Operations on \`simd\<f32, 4\>\`: four 32-bit float lanes in one 128-bit vector. |
| [`silk.simd.f32x8`](/docs/std/f32x8) | SIMD | `f32x8` | Operations on \`simd\<f32, 8\>\`: eight 32-bit float lanes in one 256-bit vector. |
| [`silk.simd.f64x2`](/docs/std/f64x2) | SIMD | `f64x2` | Operations on \`simd\<f64, 2\>\`: two 64-bit float lanes in one 128-bit vector. |
| [`silk.simd.f64x4`](/docs/std/f64x4) | SIMD | `f64x4` | Operations on \`simd\<f64, 4\>\`: four 64-bit float lanes in one 256-bit vector. |
| [`silk.simd.i16x16`](/docs/std/i16x16) | SIMD | `i16x16` | Operations on \`simd\<i16, 16\>\`: sixteen signed 16-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i16x8`](/docs/std/i16x8) | SIMD | `i16x8` | Operations on \`simd\<i16, 8\>\`: eight signed 16-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i32x4`](/docs/std/i32x4) | SIMD | `i32x4` | Operations on \`simd\<i32, 4\>\`: four signed 32-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i32x8`](/docs/std/i32x8) | SIMD | `i32x8` | Operations on \`simd\<i32, 8\>\`: eight signed 32-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i64x2`](/docs/std/i64x2) | SIMD | `i64x2` | Operations on \`simd\<i64, 2\>\`: two signed 64-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i64x4`](/docs/std/i64x4) | SIMD | `i64x4` | Operations on \`simd\<i64, 4\>\`: four signed 64-bit integer lanes in one 256-bit vector. |
| [`silk.simd.i8x16`](/docs/std/i8x16) | SIMD | `i8x16` | Operations on \`simd\<i8, 16\>\`: sixteen signed 8-bit integer lanes in one 128-bit vector. |
| [`silk.simd.i8x32`](/docs/std/i8x32) | SIMD | `i8x32` | Operations on \`simd\<i8, 32\>\`: thirty-two signed 8-bit integer lanes in one 256-bit vector. |
| [`silk.simd.mask16`](/docs/std/mask16) | SIMD | `mask16` | Operations on \`mask\<16\>\`: sixteen lanes that are each set or clear. |
| [`silk.simd.mask2`](/docs/std/mask2) | SIMD | `mask2` | Operations on \`mask\<2\>\`: two lanes that are each set or clear. |
| [`silk.simd.mask32`](/docs/std/mask32) | SIMD | `mask32` | Operations on \`mask\<32\>\`: thirty-two lanes that are each set or clear. |
| [`silk.simd.mask4`](/docs/std/mask4) | SIMD | `mask4` | Operations on \`mask\<4\>\`: four lanes that are each set or clear. |
| [`silk.simd.mask8`](/docs/std/mask8) | SIMD | `mask8` | Operations on \`mask\<8\>\`: eight lanes that are each set or clear. |
| [`silk.simd.u16x16`](/docs/std/u16x16) | SIMD | `u16x16` | Operations on \`simd\<u16, 16\>\`: sixteen unsigned 16-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u16x8`](/docs/std/u16x8) | SIMD | `u16x8` | Operations on \`simd\<u16, 8\>\`: eight unsigned 16-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u32x4`](/docs/std/u32x4) | SIMD | `u32x4` | Operations on \`simd\<u32, 4\>\`: four unsigned 32-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u32x8`](/docs/std/u32x8) | SIMD | `u32x8` | Operations on \`simd\<u32, 8\>\`: eight unsigned 32-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u64x2`](/docs/std/u64x2) | SIMD | `u64x2` | Operations on \`simd\<u64, 2\>\`: two unsigned 64-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u64x4`](/docs/std/u64x4) | SIMD | `u64x4` | Operations on \`simd\<u64, 4\>\`: four unsigned 64-bit integer lanes in one 256-bit vector. |
| [`silk.simd.u8x16`](/docs/std/u8x16) | SIMD | `u8x16` | Operations on \`simd\<u8, 16\>\`: sixteen unsigned 8-bit integer lanes in one 128-bit vector. |
| [`silk.simd.u8x32`](/docs/std/u8x32) | SIMD | `u8x32` | Operations on \`simd\<u8, 32\>\`: thirty-two unsigned 8-bit integer lanes in one 256-bit vector. |
| [`silk.slice`](/docs/std/slice) | Collections | `Slice` | Borrowed subranges of slices, with no copy and no allocation. |
| [`silk.slot`](/docs/std/slot) | Memory | `Slot` | Initialization-state changes for one element slot of raw storage. |
| [`silk.standard_input`](/docs/std/standard-input) | Input and output | `StandardInput` | The \`StandardInput\` effect: read raw bytes from standard input. |
| [`silk.static_sequence`](/docs/std/static-sequence) | Core | `StaticSequence` | Immutable lists of values that exist only during static evaluation. |
| [`silk.static_text`](/docs/std/static-text) | Core | `StaticText` | Operations on string literals during static evaluation: length, byte access, concatenation, and slices. |
| [`silk.string`](/docs/std/string) | Text | `String` | UTF-8 text: owned strings, validation of bytes, and traversal one Unicode scalar at a time. |
| [`silk.support.bcmp`](/docs/std/bcmp) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.bzero`](/docs/std/bzero) | Compiler support | Not applicable | Source-owned word-wise clearing for the Darwin LLVM zero-fill helper. |
| [`silk.support.certificate_pem`](/docs/std/certificate-pem) | Compiler support | `Pem` | Internal strict PEM framing and canonical base64 for owned certificate decoders. |
| [`silk.support.memcmp`](/docs/std/memcmp) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memcpy`](/docs/std/memcpy) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memmove`](/docs/std/memmove) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.memset`](/docs/std/memset) | Compiler support | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk.support.zstd_block`](/docs/std/zstd-block) | Compiler support | `BlockState` | Internal bounded zstd compressed-block decoding with retained entropy tables. |
| [`silk.support.zstd_checksum`](/docs/std/zstd-checksum) | Compiler support | `Xxh64` | Incremental seed-zero XXH64 state for zstd frame checksum validation. |
| [`silk.sync`](/docs/std/sync) | Concurrency | `Arc` | Shared ownership, locks and thread parking for values that several native threads use. |
| [`silk.system_clock`](/docs/std/system-clock) | System | `SystemClock` | The \`SystemClock\` effect: the current date and time as Unix time, and the \[\`Instant\`\] type that both clocks use. |
| [`silk.target`](/docs/std/target) | Core | `Target` | Facts about the target machine of the current compilation: architecture, operating system, ABI, and pointer width. |
| [`silk.test_exchange`](/docs/std/test-exchange) | Testing | `TestExchange` | The binary plan and receipt formats that let \`silk test\` control the test runner. |
| [`silk.test_runner`](/docs/std/test-runner) | Testing | `TestRunner` | The built-in test runner that \`silk test\` selects. It runs tests one at a time. |
| [`silk.testing`](/docs/std/testing) | Testing | `Testing` | Assertions for tests, and the filter rules that the test runner uses to select tests. |
| [`silk.thread`](/docs/std/thread) | Concurrency | `Transferable` | The normal names of the sealed thread properties \`Transferable\` and \`Concurrent\`. |
| [`silk.thread_pool`](/docs/std/thread-pool) | Concurrency | `ThreadPool` | A work-stealing pool of native threads that runs lazy tasks in parallel. |
| [`silk.tls_client`](/docs/std/tls-client) | TLS and certificates | `Client` | A TLS 1.3 client state machine that authenticates an HTTPS server over a byte transport that you drive. |
| [`silk.tls_connection`](/docs/std/tls-connection) | TLS and certificates | `OwnedConnection` | An authenticated TLS 1.3 connection over a \`ByteDuplex\` transport, with timeouts and close handling. |
| [`silk.tls_hkdf`](/docs/std/tls-hkdf) | TLS and certificates | `TlsHkdfSha256` | The TLS 1.3 key schedule functions \`HKDF-Expand-Label\` and \`Derive-Secret\` (RFC 8446, section 7.1). |
| [`silk.tls_record`](/docs/std/tls-record) | TLS and certificates | `TlsRecordSender` | Frame and protect TLS 1.3 records (RFC 8446, section 5) over a byte transport that you drive. |
| [`silk.toml_codec`](/docs/std/toml-codec) | Data formats | `TomlCodec` | Convert TOML values to Silk values, and write Silk values as TOML. |
| [`silk.toml_output`](/docs/std/toml-output) | Data formats | `TomlOutput` | Write a TOML document or a single TOML string or key through the ambient \`Writer\`. |
| [`silk.toml_scanner`](/docs/std/toml-scanner) | Data formats | `TomlScanner` | Validate TOML source and read it as a sequence of tokens. |
| [`silk.toml_text`](/docs/std/toml-text) | Data formats | `TomlText` | Decode TOML string tokens into owned UTF-8 text. |
| [`silk.toml_value`](/docs/std/toml-value) | Data formats | `Toml` | Parse a TOML document into an owned tree of values, and read fields from it. |
| [`silk.trust_anchor`](/docs/std/trust-anchor) | TLS and certificates | `TrustAnchor` | A trust anchor: a CA certificate that you trust, with optional limits that you add. |
| [`silk.trust_snapshot`](/docs/std/trust-snapshot) | TLS and certificates | `TrustSnapshot` | A fixed list of trust anchors: the root CAs that certificate path validation starts from. |
| [`silk.trust_source`](/docs/std/trust-source) | TLS and certificates | `TrustSource` | The \`TrustSource\` effect: where a program gets its trust anchors. |
| [`silk.u16`](/docs/std/u16) | Numbers | `u16` | Sixteen-bit unsigned integers with explicit arithmetic and conversion failure policies. |
| [`silk.u32`](/docs/std/u32) | Numbers | `u32` | Thirty-two-bit unsigned integers for fixed-width counts, masks, and binary fields. |
| [`silk.u64`](/docs/std/u64) | Numbers | `u64` | Sixty-four-bit unsigned integers for wide masks, counters, hashes, and exact interchange values. |
| [`silk.u8`](/docs/std/u8) | Numbers | `u8` | Eight-bit unsigned integers for bytes, compact counters, and exact binary representations. |
| [`silk.unicode`](/docs/std/unicode) | Text | `Unicode` | Unicode canonical normalization (NFC and NFD), with data from Unicode 17.0.0. |
| [`silk.unicode_tables`](/docs/std/unicode-tables) | Text | `UnicodeTables` | Generated Unicode data tables for canonical normalization. \`silk.unicode\` uses these tables. |
| [`silk.uri`](/docs/std/uri) | Data formats | `Uri` | Parse an absolute URI (RFC 3986), and resolve relative references against it. |
| [`silk.uri_components`](/docs/std/uri-components) | Data formats | `UriComponents` | Build a URI reference from its components, or change the components of a parsed one. |
| [`silk.uri_percent`](/docs/std/uri-percent) | Data formats | `UriPercent` | Percent-encode bytes for a URI component, and decode \`%XX\` escapes. |
| [`silk.uri_reference`](/docs/std/uri-reference) | Data formats | `UriReference` | Parse a URI or a relative reference (RFC 3986) and read its components without allocation. |
| [`silk.usize`](/docs/std/usize) | Numbers | `usize` | Pointer-width unsigned integers for lengths, indices, capacities, and allocation sizes. |
| [`silk.utf8_decoder`](/docs/std/utf8-decoder) | Text | `Utf8Decoder` | Decoding of UTF-8 one byte at a time, for input that arrives in chunks. No allocation. |
| [`silk.wasm_start`](/docs/std/wasm-start) | Native platform | `WasmStart` | The program entry for the standalone LLVM-to-WebAssembly profile. |
| [`silk.websocket_server`](/docs/std/websocket-server) | HTTP | `WebSocketServer` | WebSocket messages on the server side, over a channel from an accepted handshake. |
| [`silk.websocket_upgrade`](/docs/std/websocket-upgrade) | HTTP | `WebSocketUpgrade` | The server side of the WebSocket opening handshake (RFC 6455, version 13). |
| [`silk.work_queue`](/docs/std/work-queue) | Concurrency | `WorkDeque` | Queues that move owned values between native threads, for work-stealing schedulers. |
| [`silk.writer`](/docs/std/writer) | Input and output | `Writer` | The \`Writer\` effect: write bytes without knowing where they go. |
| [`silk.x25519`](/docs/std/x25519) | Cryptography | `X25519` | Agree on a shared secret with X25519 (RFC 7748) Diffie-Hellman. |
| [`silk.zstd`](/docs/std/zstd) | Data formats | `Zstd` | Decompress Zstandard data (RFC 8878) in steps, with fixed memory and limits that you set. |

Profile identities:

- `aarch64-apple-darwin`: target `aarch64-apple-darwin`.
- `aarch64-unknown-linux-gnu`: target `aarch64-unknown-linux-gnu`.
- `aarch64-unknown-linux-gnu-no-libc`: target `aarch64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu`: target `x86_64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu-no-libc`: target `x86_64-unknown-linux-gnu`.
- `wasm32-unknown-unknown`: target `wasm32-unknown-unknown`.

## See also

- [Tutorial](https://github.com/silk-lang/silk/blob/main/reference/tutorial.md)
- [Language reference](https://github.com/silk-lang/silk/tree/main/reference/)
- [Diagnostic index](https://github.com/silk-lang/silk/blob/main/reference/diagnostics.md)
