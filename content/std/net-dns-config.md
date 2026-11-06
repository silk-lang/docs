Read the DNS client settings of a system: name servers, search domains and query options.

## When to use
Use [`ResolverConfig.load`](#ResolverConfig.impl.load) to read `/etc/resolv.conf` through the `FileSystem` service, or
[`ResolverConfig.parse`](#ResolverConfig.impl.parse) for text that you already have. Give the result to
`silk.net.dns.query.Exchange` to send queries.

## Details
The rules are those of `resolv.conf(5)` on Linux and macOS:

- `nameserver ADDRESS` adds an IPv4 or IPv6 server on port 53. A zone suffix such as `%eth0` is
  removed.
- `domain NAME` and `search NAME...` set the search list. The last one in the file wins.
- `options` sets `ndots:N` (at most 15), `timeout:N` in seconds (at most 30), `attempts:N` (at most
  5), `rotate`, `edns0` and `use-vc`. Other options are ignored.
- A line that starts with `#` or `;` is a comment. Lines that cannot be read are ignored.

When the text names no server, the result has `127.0.0.1` port 53, as the C library does.

## Gotchas
[`ResolverConfig.load`](#ResolverConfig.impl.load) does not read the `LOCALDOMAIN` and `RES_OPTIONS` environment variables,
and Windows keeps its settings elsewhere. On Windows, make a configuration with
[`ResolverConfig.make`](#ResolverConfig.impl.make).

Import as `ResolverConfig` with `import silk.net.dns.config { ResolverConfig }`.

Public declarations: 5.

::Anchor{id="ResolverConfig"}

## `ResolverConfig`

```silk
pub struct ResolverConfig
```

The settings of a DNS client.

::Anchor{id="ResolverConfig.servers"}

### Field `servers`

```silk
pub servers: List<Endpoint>
```

The name servers, in the order to try them.

::Anchor{id="ResolverConfig.search"}

### Field `search`

```silk
pub search: List<Name>
```

The domains to add to a relative name, in order.

::Anchor{id="ResolverConfig.ndots"}

### Field `ndots`

```silk
pub ndots: usize
```

A name with at least this many dots is tried as an absolute name first. The default is 1.

::Anchor{id="ResolverConfig.timeout"}

### Field `timeout`

```silk
pub timeout: u64
```

How long to wait for the first answer from one server, in nanoseconds. The default is 5
seconds.

::Anchor{id="ResolverConfig.attempts"}

### Field `attempts`

```silk
pub attempts: usize
```

How many times to try the whole list of servers. The default is 2.

::Anchor{id="ResolverConfig.rotate"}

### Field `rotate`

```silk
pub rotate: bool
```

Start each query at the next server, to spread the load, instead of at the first one.

::Anchor{id="ResolverConfig.edns"}

### Field `edns`

```silk
pub edns: bool
```

Send queries with an EDNS(0) record, so that UDP answers can be longer than 512 bytes.

::Anchor{id="ResolverConfig.useTcp"}

### Field `useTcp`

```silk
pub useTcp: bool
```

Send queries over TCP, not UDP.

::Anchor{id="DEFAULT_TIMEOUT"}

## `DEFAULT_TIMEOUT`

```silk
pub const DEFAULT_TIMEOUT: u64
```

The default timeout, 5 seconds in nanoseconds.

::Anchor{id="DEFAULT_ATTEMPTS"}

## `DEFAULT_ATTEMPTS`

```silk
pub const DEFAULT_ATTEMPTS: usize
```

The default number of attempts.

::Anchor{id="DEFAULT_NDOTS"}

## `DEFAULT_NDOTS`

```silk
pub const DEFAULT_NDOTS: usize
```

The default `ndots` value.

::Anchor{id="DNS_PORT"}

## `DNS_PORT`

```silk
pub const DNS_PORT: u16
```

The port of DNS servers.

::Anchor{id="ResolverConfig.impl"}

## Implementation `ResolverConfig`

```silk
impl ResolverConfig
```

::Anchor{id="ResolverConfig.impl.make"}

### Associated function `make`

```silk
pub fn make(servers: List<Endpoint>) -> ResolverConfig
```

Returns a configuration with `servers` and the default options: no search domains, `ndots` 1, a
5 second timeout, 2 attempts, and UDP queries without EDNS.

::Anchor{id="ResolverConfig.impl.parse"}

### Associated function `parse`

```silk
pub effect fn parse(text: &[u8]) -> ResolverConfig
    ! OutOfMemoryError
    ? &mut Allocator
```

Reads the text of a `resolv.conf` file.

#### Details
`nameserver`, `domain`, `search` and `options` lines are read as `resolv.conf(5)` describes.
Lines that cannot be read, and unknown options, are ignored, as the C library does. When the
text names no server, the result has `127.0.0.1` port 53.

#### Errors
- `OutOfMemoryError` if the `Allocator` cannot supply the lists.

::Anchor{id="ResolverConfig.impl.load"}

### Associated function `load`

```silk
pub effect fn load() -> ResolverConfig
    ! FileError | OutOfMemoryError
    ? &mut FileSystem | &mut Allocator
```

Reads `/etc/resolv.conf` with the `FileSystem` service.

#### Details
The file is read with [`ResolverConfig.parse`](#ResolverConfig.impl.parse). When the file does not exist, the result is the
default configuration with the server `127.0.0.1` port 53, as the C library does.

#### Errors
- `FileError` if the file exists but cannot be read.
- `OutOfMemoryError` if the `Allocator` cannot supply the contents or the lists.

::Anchor{id="ResolverConfig.impl.candidates"}

### Method `candidates`

```silk
pub effect fn candidates(self: &Self, name: string) -> List<Name>
    ! MessageError | OutOfMemoryError
    ? &mut Allocator
```

Returns the names to try for `name`, in order, after the rules of the search list.

#### Details
An absolute name, written with a final dot, is tried alone. Otherwise a name with at least
`ndots` dots is tried as it is first, then with each search domain. A name with fewer dots is
tried with each search domain first, then as it is. A candidate that would be longer than 255
bytes is left out.

#### Errors
- `MessageError` if `name` is not a valid name in text form.
- `OutOfMemoryError` if the `Allocator` cannot supply the list.

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
