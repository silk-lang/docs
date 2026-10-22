Ordered, bounded HTTP fields with borrowed iteration and explicit owned copies.

## When to use

Use [`Headers.make`](#Headers.impl.make) over validated borrowed fields, or [`Headers.copy`](#Headers.impl.copy) when the collection must
outlive its source. Lookup is ASCII case-insensitive and never combines repeated values.

## Details

Owned collections store payload bytes plus offsets rather than self-references. Formatting emits
only `name: value\r\n` field lines and is mutation-atomic when caller output is too small.

Import as `Headers` with `import silk.http_headers { Headers }`.

Public declarations: 6.

::Anchor{id="Limits"}

## `Limits`

```silk
pub struct Limits
```

Explicit finite limits for HTTP values, fields, and owned storage.

::Anchor{id="Limits.maxMethodBytes"}

### Field `maxMethodBytes`

```silk
pub maxMethodBytes: usize
```

Maximum method bytes.

::Anchor{id="Limits.maxTargetBytes"}

### Field `maxTargetBytes`

```silk
pub maxTargetBytes: usize
```

Maximum request-target bytes.

::Anchor{id="Limits.maxNameBytes"}

### Field `maxNameBytes`

```silk
pub maxNameBytes: usize
```

Maximum field-name bytes.

::Anchor{id="Limits.maxValueBytes"}

### Field `maxValueBytes`

```silk
pub maxValueBytes: usize
```

Maximum field-value and reason bytes.

::Anchor{id="Limits.maxFields"}

### Field `maxFields`

```silk
pub maxFields: usize
```

Maximum fields in a collection.

::Anchor{id="Limits.maxFieldBytes"}

### Field `maxFieldBytes`

```silk
pub maxFieldBytes: usize
```

Maximum aggregate name-plus-value bytes.

::Anchor{id="Limits.maxOwnedBytes"}

### Field `maxOwnedBytes`

```silk
pub maxOwnedBytes: usize
```

Maximum owned payload capacities plus index storage bytes.

::Anchor{id="Limits.impl.Copy"}

## Implementation `Copy for Limits`

```silk
impl Copy for Limits
```

::Anchor{id="Headers"}

## `Headers`

```silk
pub struct Headers<'value>
```

An ordered borrowed collection of validated HTTP fields.

::Anchor{id="Headers.impl.Copy"}

## Implementation `Copy for Headers<'value>`

```silk
impl<'value> Copy for Headers<'value>
```

::Anchor{id="Headers.impl"}

## Implementation `Headers<'value>`

```silk
impl<'value> Headers<'value>
```

::Anchor{id="Headers.impl.make"}

### Associated function `make`

```silk
pub fn make(
    entries: &'value [Header<'value>],
    limits: Limits,
  ) -> Result<Headers<'value>, ValueError>
```

Validates collection budgets and borrows an existing field slice without allocating.

::Anchor{id="Headers.impl.count"}

### Method `count`

```silk
pub fn count(self: &Self) -> usize
```

Returns the number of fields, including duplicates.

::Anchor{id="Headers.impl.fieldBytes"}

### Method `fieldBytes`

```silk
pub fn fieldBytes(self: &Self) -> usize
```

Returns aggregate field-name plus field-value bytes.

::Anchor{id="Headers.impl.iter"}

### Method `iter`

```silk
pub fn iter(self: &Self) -> HeaderIterator<'value>
```

Iterates every field in insertion order.

::Anchor{id="Headers.impl.getAll"}

### Method `getAll`

```silk
pub fn getAll(self: &Self, name: string<'value>) -> HeaderIterator<'value>
```

Iterates every field whose name matches `name` ASCII case-insensitively.

::Anchor{id="Headers.impl.getFirst"}

### Method `getFirst`

```silk
pub fn getFirst(self: &Self, name: string) -> Option<Header<'value>>
```

Returns the first matching field without combining duplicates.

::Anchor{id="Headers.impl.getUnique"}

### Method `getUnique`

```silk
pub fn getUnique(self: &Self, name: string) -> Result<Option<Header<'value>>, ValueError>
```

Returns an absent or unique matching field and rejects a second match.

::Anchor{id="Headers.impl.copy"}

### Method `copy`

```silk
pub effect fn copy(
    self: &Self,
    limits: Limits,
  ) -> Result<OwnedHeaders, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies fields into independent byte and index storage under `maxOwnedBytes`.

::Anchor{id="Headers.impl.copyMatching"}

### Method `copyMatching`

```silk
pub effect fn copyMatching(
    self: &Self,
    name: string<'value>,
    limits: Limits,
  ) -> Result<OwnedHeaders, ValueError> ! OutOfMemoryError ? &mut Allocator
```

Copies only case-insensitively matching fields in their original order.

#### Details

All selected-field and owned-capacity limits are checked before allocation. Duplicate fields
remain distinct and retain their original relative order.

::Anchor{id="Headers.impl.requiredOwnedBytes"}

### Method `requiredOwnedBytes`

```silk
pub fn requiredOwnedBytes(self: &Self) -> Result<usize, ValueError>
```

Computes the payload-plus-index bytes required by an owned copy without allocating.

::Anchor{id="Headers.impl.formatInto"}

### Method `formatInto`

```silk
pub fn formatInto(self: &Self, output: &mut [u8]) -> Result<usize, ValueError>
```

Formats only ordered field lines into caller storage after a complete sizing pass.

::Anchor{id="Headers.impl.connectionTokens"}

### Method `connectionTokens`

```silk
pub fn connectionTokens(self: &Self) -> MetadataIterator<'value>
```

Iterates Connection field tokens while retaining extension spelling.

::Anchor{id="Headers.impl.contentCodings"}

### Method `contentCodings`

```silk
pub fn contentCodings(self: &Self) -> MetadataIterator<'value>
```

Iterates Content-Encoding codings while retaining extensions.

::Anchor{id="Headers.impl.transferCodings"}

### Method `transferCodings`

```silk
pub fn transferCodings(self: &Self) -> MetadataIterator<'value>
```

Iterates Transfer-Encoding codings and validates transfer parameters.

::Anchor{id="OwnedHeaders"}

## `OwnedHeaders`

```silk
pub struct OwnedHeaders
```

Independently owned HTTP field payloads and offset records.

::Anchor{id="OwnedHeaders.impl"}

## Implementation `OwnedHeaders`

```silk
impl OwnedHeaders
```

::Anchor{id="OwnedHeaders.impl.view"}

### Method `view`

```silk
pub fn view<'value>(self: &'value Self) -> Headers<'value>
```

Borrows an ordered collection view tied to this owner.

::Anchor{id="OwnedHeaders.impl.ownedBytes"}

### Method `ownedBytes`

```silk
pub fn ownedBytes(self: &Self) -> usize
```

Returns accounted payload-capacity plus record-storage bytes.

::Anchor{id="HeaderIterator"}

## `HeaderIterator`

```silk
pub struct HeaderIterator<'value>
```

An insertion-order iterator over all fields or one case-insensitive name.

::Anchor{id="HeaderIterator.impl"}

## Implementation `HeaderIterator<'value>`

```silk
impl<'value> HeaderIterator<'value>
```

::Anchor{id="HeaderIterator.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut Self) -> Option<Header<'value>>
```

Returns the next matching field, preserving original name and value bytes.

::Anchor{id="HeaderIterator.impl.fieldIndex"}

### Method `fieldIndex`

```silk
pub fn fieldIndex(self: &Self) -> usize
```

Returns the source field index of the last yielded entry.

::Anchor{id="MetadataToken"}

## `MetadataToken`

```silk
pub struct MetadataToken<'value>
```

One parsed metadata token borrowed from its source field.

::Anchor{id="MetadataToken.impl.Copy"}

## Implementation `Copy for MetadataToken<'value>`

```silk
impl<'value> Copy for MetadataToken<'value>
```

::Anchor{id="MetadataToken.impl"}

## Implementation `MetadataToken<'value>`

```silk
impl<'value> MetadataToken<'value>
```

::Anchor{id="MetadataToken.impl.token"}

### Method `token`

```silk
pub fn token(self: &Self) -> &'value [u8]
```

Borrows the coding or connection-option token without parameters.

::Anchor{id="MetadataToken.impl.raw"}

### Method `raw`

```silk
pub fn raw(self: &Self) -> &'value [u8]
```

Borrows the complete list member, including validated transfer parameters.

::Anchor{id="MetadataToken.impl.fieldIndex"}

### Method `fieldIndex`

```silk
pub fn fieldIndex(self: &Self) -> usize
```

Returns the source collection field index.

::Anchor{id="MetadataToken.impl.offset"}

### Method `offset`

```silk
pub fn offset(self: &Self) -> usize
```

Returns the token's byte offset within the source field value.

::Anchor{id="MetadataToken.impl.matches"}

### Method `matches`

```silk
pub fn matches(self: &Self, known: string) -> bool
```

Recognizes a known token ASCII case-insensitively without erasing extensions.

::Anchor{id="MetadataIterator"}

## `MetadataIterator`

```silk
pub struct MetadataIterator<'value>
```

A lazy ordered iterator over selected HTTP metadata fields.

::Anchor{id="MetadataIterator.impl"}

## Implementation `MetadataIterator<'value>`

```silk
impl<'value> MetadataIterator<'value>
```

::Anchor{id="MetadataIterator.impl.next"}

### Method `next`

```silk
pub fn next(self: &mut Self) -> Result<Option<MetadataToken<'value>>, ValueError>
```

Parses and returns the next metadata token or a located grammar failure.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
