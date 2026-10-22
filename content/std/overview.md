Each page describes the selected source API for the listed profiles. Distinct surfaces have separate pages.

| Module | Import namespace | Summary |
| --- | --- | --- |
| [`silk/aes_gcm`](/docs/std/aes-gcm) | `AesGcm` | Detached AES-128-GCM and AES-256-GCM authenticated encryption. |
| [`silk/allocator`](/docs/std/allocator) | `Allocator` | Foundational allocation service used by higher standard-library actors. |
| [`silk/arena`](/docs/std/arena) | `Arena` | A bump allocator over chunks it acquires from another allocator. |
| [`silk/atomic`](/docs/std/atomic) | `Atomic` | Atomic memory operations on raw pointers, with explicit memory orderings. |
| [`silk/base64`](/docs/std/base64) | `Base64` | Strict standard-padded Base64 operations for caller-provided byte storage. |
| [`silk/bool`](/docs/std/bool) | `bool` | Named primitive Boolean equality and negation operations. |
| [`silk/box`](/docs/std/box) | `Box` | One owned heap indirection for recursive data and values whose storage must have a stable size. |
| [`silk/buffered_duplex`](/docs/std/buffered-duplex) | `BufferedDuplex` | One scoped buffered session over an exclusive concrete ByteDuplex provider. |
| [`silk/buffered_input`](/docs/std/buffered-input) | `BufferedInput` | Fixed-capacity retained byte input for incremental protocol parsing. |
| [`silk/buffered_output`](/docs/std/buffered-output) | `BufferedOutput` | Fixed-capacity retained byte output with exact-prefix flushing. |
| [`silk/buffered_transfer`](/docs/std/buffered-transfer) | `BufferedTransfer` | Bounded byte transfer coupled to retained input and exact-prefix buffered output. |
| [`silk/byte_duplex`](/docs/std/byte-duplex) | `ByteDuplex` | Partial reliable-byte input and output with explicit deadlines and directional shutdown. |
| [`silk/bytes`](/docs/std/bytes) | `Bytes` | Owned arbitrary bytes for file contents, process output, and other encoding-neutral data. |
| [`silk/certificate`](/docs/std/certificate) | `Certificate` | Owned X.509 certificates decoded from bounded DER or strict PEM input. |
| [`silk/certificate_bundle`](/docs/std/certificate-bundle) | `CertificateBundle` | Owned certificate sequences decoded atomically from strict PEM input. |
| [`silk/certificate_identities`](/docs/std/certificate-identities) | `CertificateSan` | Bounded decoding of certificate subjectAltName values into borrowed identity descriptors. |
| [`silk/certificate_path`](/docs/std/certificate-path) | `CertificatePath` | Deterministic bounded TLS-server certificate paths to explicit trust authority. |
| [`silk/certificate_profile`](/docs/std/certificate-profile) | `CertificateProfile` | Borrowed semantic views for Silk's deliberately restricted TLS-server certificate profile. |
| [`silk/chacha20_poly1305`](/docs/std/chacha20-poly1305) | `ChaCha20Poly1305` | Detached ChaCha20-Poly1305 authenticated encryption from RFC 8439. |
| [`silk/char`](/docs/std/char) | `char` | Checked construction, integer inspection, equality, and ordering for Unicode scalar \`char\` values. |
| [`silk/child_process`](/docs/std/child-process) | `ChildProcess` | Portable blocking child execution from structured byte arguments to fully captured output. |
| [`silk/compilation`](/docs/std/compilation) | `Compilation` | Typed logical build choices fixed before source specialization. |
| [`silk/effect`](/docs/std/effect) | `Effect` | Builds lazy computations by transforming success, recovering typed failure, supplying services, and controlling sequencing and cleanup. |
| [`silk/equal`](/docs/std/equal) | `Equal` | The interface that gives user types the \`==\` and \`!=\` operators. |
| [`silk/execution`](/docs/std/execution) | `Execution` | Independently owned, caller-funded lazy computations with explicit external parking. |
| [`silk/execution_storage`](/docs/std/execution-storage) | `ExecutionStorage` | Explicit per-instance storage for compiler-private execution frames. |
| [`silk/execution_storage`](/docs/std/execution-storage) | `ExecutionStorage` | Explicit per-instance storage for compiler-private execution frames. |
| [`silk/f32`](/docs/std/f32) | `f32` | IEEE binary32 values with deterministic representation, classification, and math operations. |
| [`silk/f64`](/docs/std/f64) | `f64` | IEEE binary64 values and Silk's default floating-point arithmetic. |
| [`silk/fiber`](/docs/std/fiber) | `Fiber` | Affine Fiber handles, typed outcomes, and one-observer completion. |
| [`silk/filesystem`](/docs/std/filesystem) | `FileSystem` | Portable normalized paths, whole-file operations, directory traversal, and explicit temp scopes. |
| [`silk/format`](/docs/std/format) | `Format` | Writer-backed value presentation, statically validated templates, and complete decimal parsing. |
| [`silk/hash`](/docs/std/hash) | `HashKey` | Deterministic seeded hashing contracts for hash maps, hash sets, and user-defined key types. |
| [`silk/hash_map`](/docs/std/hash-map) | `HashMap` | Owned key-value storage with deterministic seeded hashing and open-addressed lookup. |
| [`silk/hash_set`](/docs/std/hash-set) | `HashSet` | Owned unique elements with deterministic seeded hashing and open-addressed membership lookup. |
| [`silk/hkdf`](/docs/std/hkdf) | `HkdfSha256` | HKDF key extraction and expansion with SHA-256 and SHA-384. |
| [`silk/hmac`](/docs/std/hmac) | `HmacSha256` | Portable HMAC authentication with SHA-256 and SHA-384. |
| [`silk/host_input`](/docs/std/host-input) | `HostInput` | Explicit access to process arguments, environment values, and the working directory as bytes. |
| [`silk/http`](/docs/std/http) | `Version` | Validated, byte-preserving HTTP/1.x scalar values, fields, and message heads. |
| [`silk/http_basic`](/docs/std/http-basic) | `HttpBasic` | Explicit bounded HTTP Basic authorization from caller-encoded credential bytes. |
| [`silk/http_body`](/docs/std/http-body) | `Decoder` | Strict bounded HTTP/1 message-body framing without transport or content-decoding policy. |
| [`silk/http_client`](/docs/std/http-client) | `HttpClient` | A short request/response HTTP client behind a replaceable service. |
| [`silk/http_client_native`](/docs/std/http-client-native) | `HttpClientNative` | The native provider for the \[\`silk.http\_client\`\] service. |
| [`silk/http_client_native`](/docs/std/http-client-native) | `HttpClientNative` | The native provider for the \[\`silk.http\_client\`\] service. |
| [`silk/http_connection_pool`](/docs/std/http-connection-pool) | `Pool` | Bounded local HTTP/1 connection pooling with explicit ownership and deterministic eviction. |
| [`silk/http_connection_pool_native`](/docs/std/http-connection-pool-native) | `PoolNative` | Native direct TCP, Unix, and HTTPS contexts for bounded HTTP connection pools. |
| [`silk/http_content`](/docs/std/http-content) | `ContentReader` | Bounded scoped HTTP response content decoding over strict body framing. |
| [`silk/http_exchange`](/docs/std/http-exchange) | `Exchange` | Scoped incremental HTTP/1 client exchanges over an explicit transport loan. |
| [`silk/http_exchange_native`](/docs/std/http-exchange-native) | `HttpExchangeNative` | Native connection acquisition for one HTTP origin and one serial client scope. |
| [`silk/http_fetch`](/docs/std/http-fetch) | `Fetch` | Bounded one-shot HTTP delivery over redirects, content decoding, routing, and pooling. |
| [`silk/http_fetch_native`](/docs/std/http-fetch-native) | `FetchNative` | Native ownership context for one-shot HTTP fetch operations. |
| [`silk/http_fetch_native`](/docs/std/http-fetch-native) | `FetchNative` | Native ownership context for one-shot HTTP fetch operations. |
| [`silk/http_head`](/docs/std/http-head) | `RequestParser` | Bounded incremental HTTP/1.0 and HTTP/1.1 head parsing and atomic serialization. |
| [`silk/http_headers`](/docs/std/http-headers) | `Headers` | Ordered, bounded HTTP fields with borrowed iteration and explicit owned copies. |
| [`silk/http_origin`](/docs/std/http-origin) | `Origin` | Owned checked HTTP origins, separate from request paths and explicit Host fields. |
| [`silk/http_proxy`](/docs/std/http-proxy) | `ProxyConfig` | Bounded HTTP proxy policy, pure route selection, and owned CONNECT rejection metadata. |
| [`silk/http_redirect`](/docs/std/http-redirect) | `Redirect` | Bounded, replay-aware HTTP redirect policy and scoped attempt orchestration. |
| [`silk/http_request`](/docs/std/http-request) | `HttpRequest` | Origin-bound HTTP request preparation with finite storage and explicit header policy. |
| [`silk/http_server`](/docs/std/http-server) | `Connection` | Scoped bounded streaming HTTP/1.0 and HTTP/1.1 server connections. |
| [`silk/http_server_native`](/docs/std/http-server-native) | `HttpServerNative` | Serial native admission for one scoped HTTP server connection. |
| [`silk/http_server_native`](/docs/std/http-server-native) | `HttpServerNative` | Serial native admission for one scoped HTTP server connection. |
| [`silk/http_target`](/docs/std/http-target) | `RequestTarget` | HTTP request-target forms, authority validation, URI conversion, and Host selection. |
| [`silk/http_transport`](/docs/std/http-transport) | `HttpTransport` | Rich HTTP byte transport adapters that retain the exact plain or authenticated TLS provider. |
| [`silk/https_identity`](/docs/std/https-identity) | `HttpsIdentity` | Bounded HTTPS DNS-ID and IP-ID matching over caller-supplied identities. |
| [`silk/i16`](/docs/std/i16) | `i16` | Sixteen-bit signed integers with explicit overflow, conversion, and text policies. |
| [`silk/i32`](/docs/std/i32) | `i32` | Thirty-two-bit signed integers and the default type of context-free integer literals. |
| [`silk/i64`](/docs/std/i64) | `i64` | Sixty-four-bit signed integers for large fixed-width values and exact integer protocols. |
| [`silk/i8`](/docs/std/i8) | `i8` | Eight-bit signed integers for compact values, byte-level formats, and narrow arithmetic. |
| [`silk/inflate`](/docs/std/inflate) | `Decoder` | Bounded streaming decoding for raw DEFLATE, zlib, and gzip bytes. |
| [`silk/insecure_random`](/docs/std/insecure-random) | `InsecureRandom` | Provider-replaceable deterministic words, booleans, bounded values, and byte filling. |
| [`silk/insecure_seed`](/docs/std/insecure-seed) | `InsecureSeed` | One provider-stable 128-bit value for initialization-time hash-flood hardening. |
| [`silk/isize`](/docs/std/isize) | `isize` | Pointer-width signed integers for offsets whose range follows the selected compilation target. |
| [`silk/json_array`](/docs/std/json-array) | `JsonArray` | Effectful JSON array construction through the ambient Writer. |
| [`silk/json_codec`](/docs/std/json-codec) | `JsonCodec` | Static JSON conversion contracts for typed values. |
| [`silk/json_object`](/docs/std/json-object) | `JsonObject` | Effectful JSON object construction through the ambient Writer. |
| [`silk/json_output`](/docs/std/json-output) | `JsonOutput` | Allocation-free JSON string escaping and formatting through the ambient Writer. |
| [`silk/json_reader`](/docs/std/json-reader) | `JsonReader` | Allocation-free JSON token reading from a fixed-capacity buffered input. |
| [`silk/json_reflect`](/docs/std/json-reflect) | `JsonReflect` | Explicit JSON serialization of visible named aggregate fields. |
| [`silk/json_scanner`](/docs/std/json-scanner) | `JsonScanner` | Strict, allocation-free JSON tokens from complete slices or successive byte chunks. |
| [`silk/json_text`](/docs/std/json-text) | `JsonText` | Decoding validated JSON string tokens into owned UTF-8 bytes. |
| [`silk/json_value`](/docs/std/json-value) | `Json` | Owned dynamic JSON values parsed from a byte slice and written through the ambient Writer. |
| [`silk/layout`](/docs/std/layout) | `Layout` | Checked size-and-alignment descriptions used to request storage from an allocator. |
| [`silk/list`](/docs/std/list) | `List` | Growable owned sequences with allocation-aware mutation, stable sorting, and checked indexing. |
| [`silk/local_scheduler`](/docs/std/local-scheduler) | `LocalScheduler` | Deterministic single-threaded execution for structured Fibers. |
| [`silk/logger`](/docs/std/logger) | `Logger` | Typed semantic logging with replaceable stdout and bounded in-memory providers. |
| [`silk/memory_byte_duplex`](/docs/std/memory-byte-duplex) | `MemoryByteDuplex` | A bounded scripted in-memory \[\`ByteDuplex\`\] provider for deterministic protocol execution. |
| [`silk/memory_trust_source`](/docs/std/memory-trust-source) | `MemoryTrustSource` | Explicit replaceable in-memory trust for deterministic applications and tests. |
| [`silk/metrics`](/docs/std/metrics) | `AllocationMetrics` | Provider-owned allocation counters that can be published as ordinary copyable data. |
| [`silk/monotonic_clock`](/docs/std/monotonic-clock) | `MonotonicClock` | Provider-replaceable monotonic marks, resolution, and deadline waits. |
| [`silk/native_clock`](/docs/std/native-clock) | `NativeClock` | Selected libc clocks and source-owned canonical result and wait policy. |
| [`silk/native_descriptor`](/docs/std/native-descriptor) | `NativeDescriptor` | Borrowed native descriptor transfers through selected libc declarations. |
| [`silk/native_descriptor`](/docs/std/native-descriptor) | `NativeDescriptor` | Borrowed native descriptor transfers through selected libc declarations. |
| [`silk/native_descriptor`](/docs/std/native-descriptor) | `NativeDescriptor` | Borrowed native descriptor transfers through selected libc declarations. |
| [`silk/native_diagnostics`](/docs/std/native-diagnostics) | `NativeDiagnostics` | Source-owned native failure reports with bounded optional context. |
| [`silk/native_diagnostics`](/docs/std/native-diagnostics) | `NativeDiagnostics` | Source-owned native failure reports with bounded optional context. |
| [`silk/native_file_trust_source`](/docs/std/native-file-trust-source) | `NativeFileTrustSource` | Explicit bounded PEM-file trust for selected native libc targets. |
| [`silk/native_file_trust_source`](/docs/std/native-file-trust-source) | `NativeFileTrustSource` | Explicit bounded PEM-file trust for selected native libc targets. |
| [`silk/native_filesystem`](/docs/std/native-filesystem) | `NativeFileSystem` | Selected native filesystem declarations and affine descriptor ownership. |
| [`silk/native_filesystem`](/docs/std/native-filesystem) | `NativeFileSystem` | Selected native filesystem declarations and affine descriptor ownership. |
| [`silk/native_host_input`](/docs/std/native-host-input) | `NativeHostInput` | Owned native process-input snapshots and per-call working-directory lookup. |
| [`silk/native_host_input`](/docs/std/native-host-input) | `NativeHostInput` | Owned native process-input snapshots and per-call working-directory lookup. |
| [`silk/native_process`](/docs/std/native-process) | `NativeProcess` | Source-owned native process resources and per-invocation capture policy. |
| [`silk/native_process`](/docs/std/native-process) | `NativeProcess` | Source-owned native process resources and per-invocation capture policy. |
| [`silk/native_report`](/docs/std/native-report) | `NativeReport` | Bounded, allocation-free native terminal-report formatting through source descriptors. |
| [`silk/native_report`](/docs/std/native-report) | `NativeReport` | Bounded, allocation-free native terminal-report formatting through source descriptors. |
| [`silk/native_resolver`](/docs/std/native-resolver) | `NativeSystemResolver` | Selected synchronous libc host resolution with one affine result-chain owner. |
| [`silk/native_socket`](/docs/std/native-socket) | `NativeSocket` | Scoped nonblocking TCP and pathname-Unix connections and listeners over ByteDuplex. |
| [`silk/native_start`](/docs/std/native-start) | `NativeStart` | Source-owned startup for a hosted native executable. |
| [`silk/native_start_sync`](/docs/std/native-start-sync) | `NativeStartSync` | Synchronous source startup with an owned native HostInput provider. |
| [`silk/native_thread`](/docs/std/native-thread) | `NativeThread` | Operating-system threads that run one Transferable closure and return its result. |
| [`silk/network_address`](/docs/std/network-address) | `NetworkAddress` | Owned network addresses, endpoints, and validated origin hosts. |
| [`silk/numeric`](/docs/std/numeric) | `Numeric` | Generic helpers for algorithms over primitive integers. |
| [`silk/ops`](/docs/std/ops) | `Add` | The interfaces that give user types the arithmetic, bitwise, and logical operators. |
| [`silk/option`](/docs/std/option) | `Option` | Optional owned values that distinguish presence from absence without a failure channel. |
| [`silk/order`](/docs/std/order) | `Order` | The interface that gives user types the \`\<\`, \`\<=\`, \`\>\`, and \`\>=\` operators. |
| [`silk/os_child_process`](/docs/std/os-child-process) | `OsChildProcess` | Native ChildProcess provider with source-owned request staging and per-call captures. |
| [`silk/os_child_process`](/docs/std/os-child-process) | `OsChildProcess` | Native ChildProcess provider with source-owned request staging and per-call captures. |
| [`silk/os_filesystem`](/docs/std/os-filesystem) | `OsFileSystem` | Native \[\`FileSystem\`\] provider confined beneath one explicitly owned platform root. |
| [`silk/os_filesystem`](/docs/std/os-filesystem) | `OsFileSystem` | Native \[\`FileSystem\`\] provider confined beneath one explicitly owned platform root. |
| [`silk/os_host_input`](/docs/std/os-host-input) | `OsHostInput` | Native HostInput provider backed by an owned process-input snapshot. |
| [`silk/os_host_input`](/docs/std/os-host-input) | `OsHostInput` | Native HostInput provider backed by an owned process-input snapshot. |
| [`silk/os_logger`](/docs/std/os-logger) | `StdoutLogger` | Native logging through the process standard-output descriptor. |
| [`silk/os_logger`](/docs/std/os-logger) | `StdoutLogger` | Native logging through the process standard-output descriptor. |
| [`silk/os_monotonic_clock`](/docs/std/os-monotonic-clock) | `OsMonotonicClock` | Native monotonic clock provider with source-derived relative waiting. |
| [`silk/os_random`](/docs/std/os-random) | `OsRandom` | Native Unix-family cryptographically secure random provider. |
| [`silk/os_standard_input`](/docs/std/os-standard-input) | `OsStandardInput` | Native \[\`StandardInput\`\] provider backed by the process standard-input descriptor. |
| [`silk/os_standard_input`](/docs/std/os-standard-input) | `OsStandardInput` | Native \[\`StandardInput\`\] provider backed by the process standard-input descriptor. |
| [`silk/os_system_clock`](/docs/std/os-system-clock) | `OsSystemClock` | Native Unix-epoch clock provider for \`SystemClock\`. |
| [`silk/os_system_clock`](/docs/std/os-system-clock) | `OsSystemClock` | Native Unix-epoch clock provider for \`SystemClock\`. |
| [`silk/os_writer`](/docs/std/os-writer) | `StdoutWriter` | Native Writer providers borrowing process standard output and standard error. |
| [`silk/os_writer`](/docs/std/os-writer) | `StdoutWriter` | Native Writer providers borrowing process standard output and standard error. |
| [`silk/output`](/docs/std/output) | `Uninitialized` | Owned output storage with separate uninitialized and initialized states. |
| [`silk/ownership`](/docs/std/ownership) | `Copy` | The ordinary names for the sealed ownership properties \`Copy\` and \`Drop\`. |
| [`silk/p256`](/docs/std/p256) | `P256` | P-256 key agreement and ECDSA P-256/SHA-256 message verification. |
| [`silk/p384`](/docs/std/p384) | `EcdsaP384Sha384` | Bounded ECDSA P-384/SHA-384 verification for certificate signatures. |
| [`silk/pointer`](/docs/std/pointer) | `Pointer` | Raw data pointers with explicit nullability, element extent, and minimum alignment. |
| [`silk/random`](/docs/std/random) | `Random` | Provider-replaceable cryptographically secure random bytes and derived values. |
| [`silk/raw_buffer`](/docs/std/raw-buffer) | `RawBuffer` | Low-level typed views over owned allocations for implementing collections and storage actors. |
| [`silk/raw_linux`](/docs/std/raw-linux) | `RawLinux` | Linux kernel calls for explicitly selected no-libc programs. |
| [`silk/raw_linux`](/docs/std/raw-linux) | `RawLinux` | Linux kernel calls for explicitly selected no-libc programs. |
| [`silk/raw_mapping`](/docs/std/raw-mapping) | `Mapping` | Owned anonymous Linux mappings with runtime page-size and alignment checks. |
| [`silk/raw_mapping`](/docs/std/raw-mapping) | `Mapping` | Owned anonymous Linux mappings with runtime page-size and alignment checks. |
| [`silk/raw_process_inputs`](/docs/std/raw-process-inputs) | `ProcessInputs` | Borrowed Linux process inputs decoded from the kernel's initial stack. |
| [`silk/raw_process_inputs`](/docs/std/raw-process-inputs) | `ProcessInputs` | Borrowed Linux process inputs decoded from the kernel's initial stack. |
| [`silk/raw_start`](/docs/std/raw-start) | `RawStart` | Explicit source entry for a static non-PIE Linux executable. |
| [`silk/reflect`](/docs/std/reflect) | `Reflect` | Finite aggregate metadata available only during static evaluation. |
| [`silk/resolver`](/docs/std/resolver) | `Resolver` | Finite, provider-replaceable host resolution policy. |
| [`silk/result`](/docs/std/result) | `Result` | Completed success-or-failure values that can be inspected and transformed as ordinary data. |
| [`silk/rsa`](/docs/std/rsa) | `RsaPublicKey` | Bounded RSA public-key admission and SHA-256 signature verification. |
| [`silk/scheduler`](/docs/std/scheduler) | `Scheduler` | Provider protocol for preparing and atomically publishing child Fibers. |
| [`silk/sha1`](/docs/std/sha1) | `Sha1` | Portable streaming SHA-1 with a fixed 20-byte digest. |
| [`silk/sha2`](/docs/std/sha2) | `Sha256` | Portable SHA-2 states for six fixed-output cryptographic digest algorithms. |
| [`silk/sha3`](/docs/std/sha3) | `Sha3_256` | Portable fixed-output SHA-3 digests with allocation-free streaming states. |
| [`silk/shared`](/docs/std/shared) | `Shared` | Explicitly allocated, single-threaded shared ownership Shared.with callback-scoped access. |
| [`silk/slice`](/docs/std/slice) | `Slice` | Allocation-free views of contiguous initialized elements. |
| [`silk/slot`](/docs/std/slot) | `Slot` | Explicit initialization-state transitions for one slot selected from raw storage. |
| [`silk/standard_input`](/docs/std/standard-input) | `StandardInput` | Portable blocking reads of raw standard-input bytes through an explicit provider. |
| [`silk/static_sequence`](/docs/std/static-sequence) | `StaticSequence` | Immutable homogeneous sequences available only during static evaluation. |
| [`silk/static_text`](/docs/std/static-text) | `StaticText` | Deterministic byte inspection for text available during static evaluation. |
| [`silk/string`](/docs/std/string) | `String` | Valid UTF-8 text, including owned storage, byte validation, and scalar-by-scalar traversal. |
| [`silk/support/bcmp`](/docs/std/bcmp) | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk/support/bzero`](/docs/std/bzero) | Not applicable | Source-owned word-wise clearing for the Darwin LLVM zero-fill helper. |
| [`silk/support/certificate_pem`](/docs/std/certificate-pem) | `Pem` | Internal strict PEM framing and canonical base64 for owned certificate decoders. |
| [`silk/support/memcmp`](/docs/std/memcmp) | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk/support/memcpy`](/docs/std/memcpy) | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk/support/memmove`](/docs/std/memmove) | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk/support/memset`](/docs/std/memset) | Not applicable | Word-wise compiler support with explicit C linkage and no runtime services. |
| [`silk/support/zstd_block`](/docs/std/zstd-block) | `BlockState` | Internal bounded zstd compressed-block decoding with retained entropy tables. |
| [`silk/support/zstd_checksum`](/docs/std/zstd-checksum) | `Xxh64` | Incremental seed-zero XXH64 state for zstd frame checksum validation. |
| [`silk/sync`](/docs/std/sync) | `Arc` | Shared ownership and locking for values that several native threads use at once. |
| [`silk/system_clock`](/docs/std/system-clock) | `SystemClock` | Provider-replaceable Unix-epoch time with canonical split-second instants. |
| [`silk/target`](/docs/std/target) | `Target` | Typed compile-time facts for the selected compilation profile. |
| [`silk/test_exchange`](/docs/std/test-exchange) | `TestExchange` | Strict binary plans and receipts for private control of the ordinary Silk test runner. Test output uses inherited stdout and stderr and has no result authority. |
| [`silk/test_runner`](/docs/std/test-runner) | `TestRunner` | Builtin sequential test runner assembled from public static test primitives. |
| [`silk/testing`](/docs/std/testing) | `Testing` | Minimal source-defined test assertions and runtime selection predicates. |
| [`silk/thread`](/docs/std/thread) | `Transferable` | The ordinary names for the sealed thread properties \`Transferable\` and \`Concurrent\`. |
| [`silk/thread_pool`](/docs/std/thread-pool) | `ThreadPool` | A work-stealing pool of native threads that runs lazy tasks in parallel. |
| [`silk/tls_client`](/docs/std/tls-client) | `Client` | An authenticated bounded TLS 1.3 client for caller-driven byte transports. |
| [`silk/tls_connection`](/docs/std/tls-connection) | `OwnedConnection` | Authenticated TLS 1.3 with one owned partial-byte transport. |
| [`silk/tls_hkdf`](/docs/std/tls-hkdf) | `TlsHkdfSha256` | TLS 1.3 key expansion and transcript-bound secret derivation. |
| [`silk/tls_record`](/docs/std/tls-record) | `TlsRecordSender` | Bounded TLS 1.3 record protection and partial-byte transport driving. |
| [`silk/toml_codec`](/docs/std/toml-codec) | `TomlCodec` | Static contracts for converting common Silk values to and from TOML values. |
| [`silk/toml_output`](/docs/std/toml-output) | `TomlOutput` | TOML document and value output through the ambient Writer. |
| [`silk/toml_scanner`](/docs/std/toml-scanner) | `TomlScanner` | TOML 1.1.0 lexical scanning and document syntax validation. |
| [`silk/toml_text`](/docs/std/toml-text) | `TomlText` | Decoding scanner-validated TOML string tokens into owned UTF-8 text. |
| [`silk/toml_value`](/docs/std/toml-value) | `Toml` | Owned TOML documents with ordered tables and distinct scalar kinds. |
| [`silk/trust_anchor`](/docs/std/trust-anchor) | `TrustAnchor` | Owned explicit trust authority with independently configured path and name constraints. |
| [`silk/trust_snapshot`](/docs/std/trust-snapshot) | `TrustSnapshot` | Bounded immutable owners for explicit trust-anchor sequences. |
| [`silk/trust_source`](/docs/std/trust-source) | `TrustSource` | A lexical replaceable source of independently owned trust snapshots. |
| [`silk/u16`](/docs/std/u16) | `u16` | Sixteen-bit unsigned integers with explicit arithmetic and conversion failure policies. |
| [`silk/u32`](/docs/std/u32) | `u32` | Thirty-two-bit unsigned integers for fixed-width counts, masks, and binary fields. |
| [`silk/u64`](/docs/std/u64) | `u64` | Sixty-four-bit unsigned integers for wide masks, counters, hashes, and exact interchange values. |
| [`silk/u8`](/docs/std/u8) | `u8` | Eight-bit unsigned integers for bytes, compact counters, and exact binary representations. |
| [`silk/unicode`](/docs/std/unicode) | `Unicode` | Explicit Unicode canonical normalization backed by the pinned Unicode 17.0.0 data set. |
| [`silk/unicode_tables`](/docs/std/unicode-tables) | `UnicodeTables` | Generated canonical-normalization data for the \`silk.unicode\` public façade. |
| [`silk/uri`](/docs/std/uri) | `Uri` | Borrowed RFC 3986 URIs, explicit ownership, and reusable relative-reference resolution. |
| [`silk/uri_components`](/docs/std/uri-components) | `UriComponents` | Mutable URI components with explicit raw-byte encoding and selective serialization. |
| [`silk/uri_percent`](/docs/std/uri-percent) | `UriPercent` | Byte percent coding with explicit ownership and caller-controlled storage. |
| [`silk/uri_reference`](/docs/std/uri-reference) | `UriReference` | Borrowed RFC 3986 URI references, explicit owned storage, and lossless component views. |
| [`silk/usize`](/docs/std/usize) | `usize` | Pointer-width unsigned integers for lengths, indices, capacities, and allocation sizes. |
| [`silk/utf8_decoder`](/docs/std/utf8-decoder) | `Utf8Decoder` | Incremental UTF-8 decoding across byte-chunk boundaries without allocation. |
| [`silk/wasm_start`](/docs/std/wasm-start) | `WasmStart` | Source-owned entry for the standalone LLVM-to-WebAssembly execution profile. |
| [`silk/websocket_server`](/docs/std/websocket-server) | `WebSocketServer` | Bounded server WebSocket messages over one validated upgraded HTTP channel. |
| [`silk/websocket_upgrade`](/docs/std/websocket-upgrade) | `WebSocketUpgrade` | Bounded WebSocket server handshake inspection and explicit application acceptance. |
| [`silk/work_queue`](/docs/std/work-queue) | `WorkDeque` | Queues that move owned values between native threads, for building work-stealing schedulers. |
| [`silk/writer`](/docs/std/writer) | `Writer` | Complete stdout and stderr byte writes through a replaceable service. |
| [`silk/x25519`](/docs/std/x25519) | `X25519` | Owned ephemeral X25519 keys and portable shared-secret agreement. |
| [`silk/zstd`](/docs/std/zstd) | `Zstd` | Bounded, resumable Zstandard decoding into caller-owned byte slices. |

Profile identities:

- `aarch64-apple-darwin`: target `aarch64-apple-darwin`.
- `aarch64-unknown-linux-gnu`: target `aarch64-unknown-linux-gnu`.
- `aarch64-unknown-linux-gnu-no-libc`: target `aarch64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu`: target `x86_64-unknown-linux-gnu`.
- `x86_64-unknown-linux-gnu-no-libc`: target `x86_64-unknown-linux-gnu`.
- `wasm32-unknown-unknown`: target `wasm32-unknown-unknown`.

## See also

- [Tutorial](/docs/reference/tutorial)
- [Language reference](https://github.com/silk-lang/silk/tree/main/reference/)
- [Diagnostic index](/docs/reference/diagnostics)
