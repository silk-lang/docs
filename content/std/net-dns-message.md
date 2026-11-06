Read and write DNS messages in the wire format of RFC 1035.

## When to use
Use this module to make a query, to read the response of a DNS server, or to write a response,
for example in a test server. [`Message.query`](#Message.impl.query) makes a query, [`Message.encode`](#Message.impl.encode) writes any
message, and [`Message.parse`](#Message.impl.parse) reads one.

## Details
A [`Name`](#Name) holds a domain name in wire form, without compression, in a fixed buffer. It does not
allocate. [`RecordData`](#RecordData) has a variant for each record type that `node:dns` reads: A, AAAA, NS,
CNAME, PTR, MX, TXT, SRV, SOA, NAPTR, CAA and TLSA. Other types keep their raw data in
`RecordData.Unknown`. An EDNS(0) OPT record (RFC 6891) is read into [`Message`](#Message) field `edns`, not
into the additional records.

[`Message.parse`](#Message.impl.parse) follows compression pointers, but only to earlier bytes, so it cannot loop.
[`Message.encode`](#Message.impl.encode) compresses the names of the questions and of the owner names, and the names in
NS, CNAME, PTR, MX and SOA data. It does not compress the names of other types, as RFC 3597
requires.

## Errors
- [`MessageError`](#MessageError) with a [`MessageReason`](#MessageReason) and the byte offset where the problem is.
- `OutOfMemoryError` if the `Allocator` cannot supply the lists or the bytes.

## Gotchas
Names compare without case for ASCII letters only, as RFC 4343 requires. A name in text form
uses the escapes of RFC 1035 section 5.1: `\.` for a dot in a label, `\\` for a backslash, and
`\DDD` for any byte in decimal.

## Examples
### Write a query and read it back

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.collections.bytes { Bytes }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.net.dns.message { CLASS_IN, Message, MessageError, Name, Question, TYPE_AAAA }
import silk.collections.list { List }

effect fn program() -> i32
  ! MessageError | OutOfMemoryError
  ? &mut Allocator {
  let name = match Name.parse("example.com") {
    Result<Name, MessageError>.Success { value } => value
    Result<Name, MessageError>.Failure {..} => {
      return 1
    }
  }
  let question = Question { name: name, kind: TYPE_AAAA, class: CLASS_IN }
  let query = run Message.query(4660, question, Option<u16>.some(1232))
  let mut wire = Bytes.make()
  run Message.encode(&query, &mut wire)
  let parsed = run Message.parse(Bytes.asSlice(&wire))
  if parsed.header.id != 4660 || !parsed.header.recursionDesired {
    return 1
  }
  let questions = List<Question>.asSlice(&parsed.questions)
  if questions.length != 1 || questions[0].kind != TYPE_AAAA {
    return 1
  }
  if !Name.equals(&questions[0].name, &name) {
    return 1
  }
  return 0
}

effect fn failed<E>(error: E) -> i32 {
  drop error
  return 1
}

pub fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  return run Effect.catchAll(program(), failed) |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Import as `Message` with `import silk.net.dns.message { Message }`.

Public declarations: 39.

::Anchor{id="TYPE_A"}

## `TYPE_A`

```silk
pub const TYPE_A: u16
```

An IPv4 address, code 1.

::Anchor{id="TYPE_NS"}

## `TYPE_NS`

```silk
pub const TYPE_NS: u16
```

An authoritative name server, code 2.

::Anchor{id="TYPE_CNAME"}

## `TYPE_CNAME`

```silk
pub const TYPE_CNAME: u16
```

The canonical name of an alias, code 5.

::Anchor{id="TYPE_SOA"}

## `TYPE_SOA`

```silk
pub const TYPE_SOA: u16
```

The start of a zone of authority, code 6.

::Anchor{id="TYPE_PTR"}

## `TYPE_PTR`

```silk
pub const TYPE_PTR: u16
```

A domain name pointer, such as a reverse lookup result, code 12.

::Anchor{id="TYPE_MX"}

## `TYPE_MX`

```silk
pub const TYPE_MX: u16
```

A mail exchange, code 15.

::Anchor{id="TYPE_TXT"}

## `TYPE_TXT`

```silk
pub const TYPE_TXT: u16
```

Text strings, code 16.

::Anchor{id="TYPE_AAAA"}

## `TYPE_AAAA`

```silk
pub const TYPE_AAAA: u16
```

An IPv6 address, code 28.

::Anchor{id="TYPE_SRV"}

## `TYPE_SRV`

```silk
pub const TYPE_SRV: u16
```

A service location (RFC 2782), code 33.

::Anchor{id="TYPE_NAPTR"}

## `TYPE_NAPTR`

```silk
pub const TYPE_NAPTR: u16
```

A naming authority pointer (RFC 3403), code 35.

::Anchor{id="TYPE_OPT"}

## `TYPE_OPT`

```silk
pub const TYPE_OPT: u16
```

The EDNS(0) pseudo-record (RFC 6891), code 41.

::Anchor{id="TYPE_TLSA"}

## `TYPE_TLSA`

```silk
pub const TYPE_TLSA: u16
```

A TLS certificate association (RFC 6698), code 52.

::Anchor{id="TYPE_ANY"}

## `TYPE_ANY`

```silk
pub const TYPE_ANY: u16
```

A question for all records of a name, code 255.

::Anchor{id="TYPE_CAA"}

## `TYPE_CAA`

```silk
pub const TYPE_CAA: u16
```

A certification authority authorization (RFC 8659), code 257.

::Anchor{id="CLASS_IN"}

## `CLASS_IN`

```silk
pub const CLASS_IN: u16
```

The Internet, code 1.

::Anchor{id="CLASS_CH"}

## `CLASS_CH`

```silk
pub const CLASS_CH: u16
```

Chaos, code 3.

::Anchor{id="CLASS_HS"}

## `CLASS_HS`

```silk
pub const CLASS_HS: u16
```

Hesiod, code 4.

::Anchor{id="CLASS_ANY"}

## `CLASS_ANY`

```silk
pub const CLASS_ANY: u16
```

A question for any class, code 255.

::Anchor{id="RCODE_NO_ERROR"}

## `RCODE_NO_ERROR`

```silk
pub const RCODE_NO_ERROR: u16
```

No error, code 0.

::Anchor{id="RCODE_FORMAT_ERROR"}

## `RCODE_FORMAT_ERROR`

```silk
pub const RCODE_FORMAT_ERROR: u16
```

The server could not read the query, code 1.

::Anchor{id="RCODE_SERVER_FAILURE"}

## `RCODE_SERVER_FAILURE`

```silk
pub const RCODE_SERVER_FAILURE: u16
```

The server failed to process the query, code 2.

::Anchor{id="RCODE_NAME_ERROR"}

## `RCODE_NAME_ERROR`

```silk
pub const RCODE_NAME_ERROR: u16
```

The name does not exist, code 3. Also known as NXDOMAIN.

::Anchor{id="RCODE_NOT_IMPLEMENTED"}

## `RCODE_NOT_IMPLEMENTED`

```silk
pub const RCODE_NOT_IMPLEMENTED: u16
```

The server does not support this kind of query, code 4.

::Anchor{id="RCODE_REFUSED"}

## `RCODE_REFUSED`

```silk
pub const RCODE_REFUSED: u16
```

The server refuses to answer, code 5.

::Anchor{id="RCODE_BAD_VERSION"}

## `RCODE_BAD_VERSION`

```silk
pub const RCODE_BAD_VERSION: u16
```

The server does not support the EDNS version of the query, code 16.

::Anchor{id="OPCODE_QUERY"}

## `OPCODE_QUERY`

```silk
pub const OPCODE_QUERY: u8
```

A standard query, code 0.

::Anchor{id="OPCODE_STATUS"}

## `OPCODE_STATUS`

```silk
pub const OPCODE_STATUS: u8
```

A server status request, code 2.

::Anchor{id="OPCODE_NOTIFY"}

## `OPCODE_NOTIFY`

```silk
pub const OPCODE_NOTIFY: u8
```

A zone change notification (RFC 1996), code 4.

::Anchor{id="OPCODE_UPDATE"}

## `OPCODE_UPDATE`

```silk
pub const OPCODE_UPDATE: u8
```

A dynamic update (RFC 2136), code 5.

::Anchor{id="MessageReason"}

## `MessageReason`

```silk
pub enum MessageReason
```

The problem that [`MessageError`](#MessageError) reports.

::Anchor{id="MessageReason.Truncated"}

### `Truncated`

```silk
Truncated
```

The message ends inside a field.

::Anchor{id="MessageReason.ReservedLabel"}

### `ReservedLabel`

```silk
ReservedLabel
```

A label length byte uses the reserved forms `01` or `10` in its top two bits.

::Anchor{id="MessageReason.ForwardPointer"}

### `ForwardPointer`

```silk
ForwardPointer
```

A compression pointer does not point to an earlier byte.

::Anchor{id="MessageReason.LabelTooLong"}

### `LabelTooLong`

```silk
LabelTooLong
```

A label in text form is longer than 63 bytes.

::Anchor{id="MessageReason.NameTooLong"}

### `NameTooLong`

```silk
NameTooLong
```

A name is longer than 255 bytes in wire form.

::Anchor{id="MessageReason.EmptyLabel"}

### `EmptyLabel`

```silk
EmptyLabel
```

A name in text form has an empty label, as in `a..b`.

::Anchor{id="MessageReason.InvalidEscape"}

### `InvalidEscape`

```silk
InvalidEscape
```

A name in text form has a `\` that is not followed by a byte, or by a decimal escape from
`\000` to `\255`.

::Anchor{id="MessageReason.BadRecordLength"}

### `BadRecordLength`

```silk
BadRecordLength
```

The data of a record has the wrong length for its type.

::Anchor{id="MessageReason.BadOpt"}

### `BadOpt`

```silk
BadOpt
```

The message has more than one OPT record, or an OPT record that is not in the additional
section or not owned by the root name.

::Anchor{id="MessageReason.TooLarge"}

### `TooLarge`

```silk
TooLarge
```

A count does not fit its 16-bit field, or a message is longer than 65535 bytes.

::Anchor{id="MessageReason.StringTooLong"}

### `StringTooLong`

```silk
StringTooLong
```

A character string is longer than 255 bytes.

::Anchor{id="MessageReason.BadResponseCode"}

### `BadResponseCode`

```silk
BadResponseCode
```

A response code does not fit 12 bits, or one above 15 is written without EDNS.

::Anchor{id="MessageReason.impl.Debug"}

## Implementation `Debug for MessageReason`

```silk
impl Debug for MessageReason
```

::Anchor{id="MessageReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the name of the variant, such as `Truncated`.

::Anchor{id="MessageError"}

## `MessageError`

```silk
pub struct MessageError
```

A DNS message or a name that cannot be read or written.

::Anchor{id="MessageError.reason"}

### Field `reason`

```silk
pub reason: MessageReason
```

The problem.

::Anchor{id="MessageError.offset"}

### Field `offset`

```silk
pub offset: usize
```

The byte offset of the problem: in the message for wire data, or in the text for a name in text
form. When writing, the offset is the length of the output that was written before the problem.

::Anchor{id="MessageError.impl.Copy"}

## Implementation `Copy for MessageError`

```silk
impl Copy for MessageError
```

::Anchor{id="MessageError.impl.Debug"}

## Implementation `Debug for MessageError`

```silk
impl Debug for MessageError
```

::Anchor{id="MessageError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> ()
    ! WriterError
    ? &mut Writer
```

Writes the fields, as `MessageError { reason: ..., offset: ... }`.

::Anchor{id="Name"}

## `Name`

```silk
pub struct Name
```

A domain name in wire form: a list of labels, each with its length byte, and a zero byte at the
end.

### Details
A name holds at most 255 bytes in wire form, in a fixed buffer, so it does not allocate. A label
can hold any byte, not only letters, digits and hyphens. Names compare without case for the ASCII
letters only.

::Anchor{id="Name.impl.Copy"}

## Implementation `Copy for Name`

```silk
impl Copy for Name
```

::Anchor{id="Name.impl"}

## Implementation `Name`

```silk
impl Name
```

::Anchor{id="Name.impl.root"}

### Associated function `root`

```silk
pub fn root() -> Name
```

Returns the root name, which has no labels. Its text form is `.`.

::Anchor{id="Name.impl.parse"}

### Associated function `parse`

```silk
pub fn parse(text: string) -> Result<Name, MessageError>
```

Parses a name in text form, such as `example.com` or `example.com.`.

#### Details
A final dot is optional, and the name is always absolute. `.` and the empty text give the root
name. Use `\.` for a dot in a label, `\\` for a backslash, and `\DDD` for any byte, with three
decimal digits.

#### Errors
- `EmptyLabel` for two dots in a row, or a dot at the start of a name that is not the root.
- `LabelTooLong` for a label of more than 63 bytes.
- `NameTooLong` if the name has more than 255 bytes in wire form.
- `InvalidEscape` for a `\` at the end, or a decimal escape above 255.

::Anchor{id="Name.impl.parseBytes"}

### Associated function `parseBytes`

```silk
pub fn parseBytes(text: &[u8]) -> Result<Name, MessageError>
```

Parses a name in text form from bytes.

#### When to use
Use it for a name that you have as bytes, for example a line of a configuration file. For a
`string`, use [`Name.parse`](#Name.impl.parse).

#### Details
A final dot is optional, and the name is always absolute. `.` and empty input give the root
name. Use `\.` for a dot in a label, `\\` for a backslash, and `\DDD` for any byte, with three
decimal digits.

#### Errors
- `EmptyLabel` for two dots in a row, or a dot at the start of a name that is not the root.
- `LabelTooLong` for a label of more than 63 bytes.
- `NameTooLong` if the name has more than 255 bytes in wire form.
- `InvalidEscape` for a `\` at the end, or a decimal escape above 255.

::Anchor{id="Name.impl.fromDomain"}

### Associated function `fromDomain`

```silk
pub fn fromDomain(host: &DomainHost) -> Name
```

Returns the name of a checked domain host, such as one from `silk.net.address.Host.parse`.

::Anchor{id="Name.impl.reverseIpv4"}

### Associated function `reverseIpv4`

```silk
pub fn reverseIpv4(address: &Ipv4Address) -> Name
```

Returns the name for the reverse lookup of an IPv4 address, such as
`4.3.2.1.in-addr.arpa` for `1.2.3.4`.

::Anchor{id="Name.impl.reverseIpv6"}

### Associated function `reverseIpv6`

```silk
pub fn reverseIpv6(address: &Ipv6Address) -> Name
```

Returns the name for the reverse lookup of an IPv6 address: its 32 hex digits from the last one
to the first, then `ip6.arpa`, as RFC 3596 defines.

::Anchor{id="Name.impl.wire"}

### Method `wire`

```silk
pub fn wire<'a>(self: &'a Self) -> &'a [u8]
```

Returns the name in wire form, with the zero byte at the end and without compression.

::Anchor{id="Name.impl.labelCount"}

### Method `labelCount`

```silk
pub fn labelCount(self: &Self) -> usize
```

Returns the number of labels. The root name has 0.

::Anchor{id="Name.impl.isRoot"}

### Method `isRoot`

```silk
pub fn isRoot(self: &Self) -> bool
```

Returns `true` if this is the root name.

::Anchor{id="Name.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the names are equal. ASCII letters compare without case, so `Example.COM`
equals `example.com`.

::Anchor{id="Name.impl.join"}

### Method `join`

```silk
pub fn join(self: &Self, suffix: &Name) -> Result<Name, MessageError>
```

Returns this name followed by the labels of `suffix`, such as `www.example.com` for `www` and
`example.com`.

#### When to use
Use it to add a search domain to a relative name.

#### Errors
- `NameTooLong` if the result has more than 255 bytes in wire form. The offset is 0.

::Anchor{id="Name.impl.appendText"}

### Method `appendText`

```silk
pub effect fn appendText(self: &Self, output: &mut Bytes) -> ()
    ! OutOfMemoryError
    ? &mut Allocator
```

Appends the name in text form to `output`, without a final dot. The root name is `.`.

#### Details
A dot or a backslash in a label is written as `\.` or `\\`. A byte that is not a printable ASCII
character, or a space, is written as `\DDD` in decimal. [`Name.parse`](#Name.impl.parse) reads the text back to the
same name.

::Anchor{id="Question"}

## `Question`

```silk
pub struct Question
```

One question of a message: a name, a record type and a class.

::Anchor{id="Question.name"}

### Field `name`

```silk
pub name: Name
```

The name to look up.

::Anchor{id="Question.kind"}

### Field `kind`

```silk
pub kind: u16
```

The record type, such as [`TYPE_A`](#TYPE_A).

::Anchor{id="Question.class"}

### Field `class`

```silk
pub class: u16
```

The class, usually [`CLASS_IN`](#CLASS_IN).

::Anchor{id="Question.impl.Copy"}

## Implementation `Copy for Question`

```silk
impl Copy for Question
```

::Anchor{id="Question.impl"}

## Implementation `Question`

```silk
impl Question
```

::Anchor{id="Question.impl.equals"}

### Method `equals`

```silk
pub fn equals(self: &Self, other: &Self) -> bool
```

Returns `true` if the questions have equal names, types and classes. Names compare without case.

::Anchor{id="RecordData"}

## `RecordData`

```silk
pub union RecordData
```

The data of a resource record, by type.

::Anchor{id="RecordData.A"}

### `A`

```silk
A
```

An IPv4 address.

::Anchor{id="RecordData.A.address"}

#### Field `address`

```silk
pub address: Ipv4Address
```

The address.

::Anchor{id="RecordData.Aaaa"}

### `Aaaa`

```silk
Aaaa
```

An IPv6 address.

::Anchor{id="RecordData.Aaaa.address"}

#### Field `address`

```silk
pub address: Ipv6Address
```

The address.

::Anchor{id="RecordData.Ns"}

### `Ns`

```silk
Ns
```

An authoritative name server.

::Anchor{id="RecordData.Ns.server"}

#### Field `server`

```silk
pub server: Name
```

The name of the server.

::Anchor{id="RecordData.Cname"}

### `Cname`

```silk
Cname
```

The canonical name of the owner, which is an alias.

::Anchor{id="RecordData.Cname.target"}

#### Field `target`

```silk
pub target: Name
```

The canonical name.

::Anchor{id="RecordData.Ptr"}

### `Ptr`

```silk
Ptr
```

A domain name pointer, such as the result of a reverse lookup.

::Anchor{id="RecordData.Ptr.target"}

#### Field `target`

```silk
pub target: Name
```

The name that the record points to.

::Anchor{id="RecordData.Mx"}

### `Mx`

```silk
Mx
```

A mail exchange.

::Anchor{id="RecordData.Mx.preference"}

#### Field `preference`

```silk
pub preference: u16
```

The preference. A lower value is preferred.

::Anchor{id="RecordData.Mx.exchange"}

#### Field `exchange`

```silk
pub exchange: Name
```

The name of the mail server.

::Anchor{id="RecordData.Txt"}

### `Txt`

```silk
Txt
```

Text, as one or more character strings of at most 255 bytes each.

::Anchor{id="RecordData.Txt.strings"}

#### Field `strings`

```silk
pub strings: List<Bytes>
```

The strings, in order. The bytes are not always UTF-8.

::Anchor{id="RecordData.Srv"}

### `Srv`

```silk
Srv
```

A service location (RFC 2782).

::Anchor{id="RecordData.Srv.priority"}

#### Field `priority`

```silk
pub priority: u16
```

The priority. A lower value is tried first.

::Anchor{id="RecordData.Srv.weight"}

#### Field `weight`

```silk
pub weight: u16
```

The relative weight among targets of the same priority.

::Anchor{id="RecordData.Srv.port"}

#### Field `port`

```silk
pub port: u16
```

The port of the service.

::Anchor{id="RecordData.Srv.target"}

#### Field `target`

```silk
pub target: Name
```

The name of the host of the service.

::Anchor{id="RecordData.Soa"}

### `Soa`

```silk
Soa
```

The start of a zone of authority.

::Anchor{id="RecordData.Soa.primary"}

#### Field `primary`

```silk
pub primary: Name
```

The name of the primary name server of the zone.

::Anchor{id="RecordData.Soa.mailbox"}

#### Field `mailbox`

```silk
pub mailbox: Name
```

The mailbox of the person responsible for the zone, in name form.

::Anchor{id="RecordData.Soa.serial"}

#### Field `serial`

```silk
pub serial: u32
```

The version of the zone.

::Anchor{id="RecordData.Soa.refresh"}

#### Field `refresh`

```silk
pub refresh: u32
```

The seconds between refreshes of a secondary server.

::Anchor{id="RecordData.Soa.retry"}

#### Field `retry`

```silk
pub retry: u32
```

The seconds before a failed refresh is tried again.

::Anchor{id="RecordData.Soa.expire"}

#### Field `expire`

```silk
pub expire: u32
```

The seconds after which a secondary server stops answering for the zone.

::Anchor{id="RecordData.Soa.minimum"}

#### Field `minimum`

```silk
pub minimum: u32
```

The seconds to cache a negative answer (RFC 2308).

::Anchor{id="RecordData.Naptr"}

### `Naptr`

```silk
Naptr
```

A naming authority pointer (RFC 3403).

::Anchor{id="RecordData.Naptr.order"}

#### Field `order`

```silk
pub order: u16
```

The order. A lower value is processed first.

::Anchor{id="RecordData.Naptr.preference"}

#### Field `preference`

```silk
pub preference: u16
```

The preference among records of the same order.

::Anchor{id="RecordData.Naptr.flags"}

#### Field `flags`

```silk
pub flags: Bytes
```

The flags string.

::Anchor{id="RecordData.Naptr.services"}

#### Field `services`

```silk
pub services: Bytes
```

The service string.

::Anchor{id="RecordData.Naptr.regexp"}

#### Field `regexp`

```silk
pub regexp: Bytes
```

The substitution expression.

::Anchor{id="RecordData.Naptr.replacement"}

#### Field `replacement`

```silk
pub replacement: Name
```

The next name to look up.

::Anchor{id="RecordData.Tlsa"}

### `Tlsa`

```silk
Tlsa
```

A TLS certificate association (RFC 6698).

::Anchor{id="RecordData.Tlsa.usage"}

#### Field `usage`

```silk
pub usage: u8
```

The certificate usage.

::Anchor{id="RecordData.Tlsa.selector"}

#### Field `selector`

```silk
pub selector: u8
```

The part of the certificate to match.

::Anchor{id="RecordData.Tlsa.matchingType"}

#### Field `matchingType`

```silk
pub matchingType: u8
```

How the data is matched.

::Anchor{id="RecordData.Tlsa.data"}

#### Field `data`

```silk
pub data: Bytes
```

The certificate association data.

::Anchor{id="RecordData.Caa"}

### `Caa`

```silk
Caa
```

A certification authority authorization (RFC 8659).

::Anchor{id="RecordData.Caa.flags"}

#### Field `flags`

```silk
pub flags: u8
```

The flags. Bit 128 is the critical flag.

::Anchor{id="RecordData.Caa.tag"}

#### Field `tag`

```silk
pub tag: Bytes
```

The property tag, such as `issue`.

::Anchor{id="RecordData.Caa.value"}

#### Field `value`

```silk
pub value: Bytes
```

The property value.

::Anchor{id="RecordData.Unknown"}

### `Unknown`

```silk
Unknown
```

A record of another type, with its data as it is on the wire.

::Anchor{id="RecordData.Unknown.kind"}

#### Field `kind`

```silk
pub kind: u16
```

The record type.

::Anchor{id="RecordData.Unknown.data"}

#### Field `data`

```silk
pub data: Bytes
```

The data. Names in it can be compressed and then point into the message.

::Anchor{id="RecordData.impl"}

## Implementation `RecordData`

```silk
impl RecordData
```

::Anchor{id="RecordData.impl.kind"}

### Method `kind`

```silk
pub fn kind(self: &Self) -> u16
```

Returns the record type of the data, such as [`TYPE_A`](#TYPE_A) for `RecordData.A`.

::Anchor{id="Record"}

## `Record`

```silk
pub struct Record
```

A resource record: an owner name, a class, a time to live, and typed data.

::Anchor{id="Record.name"}

### Field `name`

```silk
pub name: Name
```

The name that owns the record.

::Anchor{id="Record.class"}

### Field `class`

```silk
pub class: u16
```

The class, usually [`CLASS_IN`](#CLASS_IN).

::Anchor{id="Record.ttl"}

### Field `ttl`

```silk
pub ttl: u32
```

The seconds that the record can be cached.

::Anchor{id="Record.data"}

### Field `data`

```silk
pub data: RecordData
```

The data. Its variant gives the record type.

::Anchor{id="EdnsOption"}

## `EdnsOption`

```silk
pub struct EdnsOption
```

One option of an EDNS(0) OPT record.

::Anchor{id="EdnsOption.code"}

### Field `code`

```silk
pub code: u16
```

The option code, such as 10 for a cookie (RFC 7873).

::Anchor{id="EdnsOption.data"}

### Field `data`

```silk
pub data: Bytes
```

The option data.

::Anchor{id="Edns"}

## `Edns`

```silk
pub struct Edns
```

The EDNS(0) information of a message (RFC 6891), from its OPT record.

::Anchor{id="Edns.udpPayloadSize"}

### Field `udpPayloadSize`

```silk
pub udpPayloadSize: u16
```

The largest UDP payload, in bytes, that the sender can receive.

::Anchor{id="Edns.version"}

### Field `version`

```silk
pub version: u8
```

The EDNS version. Only version 0 is defined.

::Anchor{id="Edns.dnssecOk"}

### Field `dnssecOk`

```silk
pub dnssecOk: bool
```

The DO bit: the sender can read DNSSEC records.

::Anchor{id="Edns.options"}

### Field `options`

```silk
pub options: List<EdnsOption>
```

The options, in order.

::Anchor{id="Edns.impl"}

## Implementation `Edns`

```silk
impl Edns
```

::Anchor{id="Edns.impl.make"}

### Associated function `make`

```silk
pub fn make(udpPayloadSize: u16) -> Edns
```

Returns version 0 with `udpPayloadSize`, the DO bit off, and no options.

::Anchor{id="Header"}

## `Header`

```silk
pub struct Header
```

The fixed header of a message, without the section counts.

::Anchor{id="Header.id"}

### Field `id`

```silk
pub id: u16
```

The identifier that a response copies from its query.

::Anchor{id="Header.response"}

### Field `response`

```silk
pub response: bool
```

The QR bit: `true` for a response, `false` for a query.

::Anchor{id="Header.opcode"}

### Field `opcode`

```silk
pub opcode: u8
```

The operation, such as [`OPCODE_QUERY`](#OPCODE_QUERY). It uses 4 bits.

::Anchor{id="Header.authoritative"}

### Field `authoritative`

```silk
pub authoritative: bool
```

The AA bit: the server is an authority for the name.

::Anchor{id="Header.truncated"}

### Field `truncated`

```silk
pub truncated: bool
```

The TC bit: the message was cut short to fit a UDP datagram.

::Anchor{id="Header.recursionDesired"}

### Field `recursionDesired`

```silk
pub recursionDesired: bool
```

The RD bit: the client asks for recursion.

::Anchor{id="Header.recursionAvailable"}

### Field `recursionAvailable`

```silk
pub recursionAvailable: bool
```

The RA bit: the server can recurse.

::Anchor{id="Header.authenticData"}

### Field `authenticData`

```silk
pub authenticData: bool
```

The AD bit: the server checked the DNSSEC data (RFC 4035).

::Anchor{id="Header.checkingDisabled"}

### Field `checkingDisabled`

```silk
pub checkingDisabled: bool
```

The CD bit: the client does not want DNSSEC checks (RFC 4035).

::Anchor{id="Header.responseCode"}

### Field `responseCode`

```silk
pub responseCode: u16
```

The response code, such as [`RCODE_NAME_ERROR`](#RCODE_NAME_ERROR). With EDNS it has 12 bits: the upper 8
bits are in the OPT record.

::Anchor{id="Header.impl.Copy"}

## Implementation `Copy for Header`

```silk
impl Copy for Header
```

::Anchor{id="Header.impl"}

## Implementation `Header`

```silk
impl Header
```

::Anchor{id="Header.impl.query"}

### Associated function `query`

```silk
pub fn query(id: u16) -> Header
```

Returns the header of a query with `id`, with the RD bit on and all other bits off.

::Anchor{id="Header.impl.read"}

### Associated function `read`

```silk
pub fn read(input: &[u8]) -> Result<Header, MessageError>
```

Reads the 12-byte header at the start of `input`.

#### When to use
Use it to check the identifier or the TC bit of a datagram before you read the whole message.

#### Details
The response code is the 4-bit code of the header only. [`Message.parse`](#Message.impl.parse) adds the extended bits
of the OPT record.

#### Errors
- `Truncated` if `input` has fewer than 12 bytes.

::Anchor{id="Message"}

## `Message`

```silk
pub struct Message
```

A DNS message: a header, four sections of questions and records, and optional EDNS information.

::Anchor{id="Message.header"}

### Field `header`

```silk
pub header: Header
```

The header.

::Anchor{id="Message.questions"}

### Field `questions`

```silk
pub questions: List<Question>
```

The question section.

::Anchor{id="Message.answers"}

### Field `answers`

```silk
pub answers: List<Record>
```

The answer section.

::Anchor{id="Message.authorities"}

### Field `authorities`

```silk
pub authorities: List<Record>
```

The authority section.

::Anchor{id="Message.additionals"}

### Field `additionals`

```silk
pub additionals: List<Record>
```

The additional section, without the OPT record.

::Anchor{id="Message.edns"}

### Field `edns`

```silk
pub edns: Option<Edns>
```

The EDNS information. [`Message.encode`](#Message.impl.encode) writes it as an OPT record at the end of the additional
section.

::Anchor{id="Message.impl"}

## Implementation `Message`

```silk
impl Message
```

::Anchor{id="Message.impl.make"}

### Associated function `make`

```silk
pub fn make(header: Header) -> Message
```

Returns a message with `header` and empty sections, without EDNS.

::Anchor{id="Message.impl.query"}

### Associated function `query`

```silk
pub effect fn query(id: u16, question: Question, udpPayloadSize: Option<u16>) -> Message
    ! OutOfMemoryError
    ? &mut Allocator
```

Returns a standard query for `question`, with the RD bit on.

#### Details
With `udpPayloadSize`, the query has an EDNS(0) OPT record that tells the server the largest UDP
response the client accepts. 1232 bytes is a size that avoids IP fragmentation on most networks.
Without it, a UDP response has at most 512 bytes.

::Anchor{id="Message.impl.parse"}

### Associated function `parse`

```silk
pub effect fn parse(input: &[u8]) -> Message
    ! MessageError | OutOfMemoryError
    ? &mut Allocator
```

Reads a whole message.

#### Details
The input must be one message, as in one UDP datagram, or one TCP message without its two-byte
length prefix. Bytes after the last record are ignored. An OPT record in the additional section
is read into `edns`, and its extended response code bits are added to the header.

#### Errors
- [`MessageError`](#MessageError) if the message is cut short, has a bad name or record, or has a bad OPT
  record. The offset is the position of the problem in `input`.
- `OutOfMemoryError` if the `Allocator` cannot supply the sections.

::Anchor{id="Message.impl.encode"}

### Method `encode`

```silk
pub effect fn encode(self: &Self, output: &mut Bytes) -> ()
    ! MessageError | OutOfMemoryError
    ? &mut Allocator
```

Writes the message in wire form at the end of `output`.

#### Details
Names are compressed where RFC 3597 allows it. When `edns` is set, an OPT record is written at
the end of the additional section, with the upper bits of the response code. The output is one
UDP payload; for TCP, write the two-byte length first.

#### Errors
- `TooLarge` if a section has more than 65535 entries, or the message is longer than 65535
  bytes.
- `StringTooLong` if a TXT, NAPTR or CAA string is longer than 255 bytes.
- `BadRecordLength` if the data of an `Unknown` record is longer than 65535 bytes.
- `BadResponseCode` if the response code is above 4095, or above 15 without `edns`.
- `OutOfMemoryError` if the `Allocator` cannot grow `output`.

#### Gotchas
On an error, `output` can hold part of the message. Truncate it to its old length to undo.

Category: Networking.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
