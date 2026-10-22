Strict binary plans and receipts for private control of the ordinary Silk test runner.
Test output uses inherited stdout and stderr and has no result authority.

Import as `TestExchange` with `import silk.test_exchange as TestExchange`.

Public declarations: 18.

::Anchor{id="Plan"}

## `Plan`

```silk
pub struct Plan<'a>
```

A cursor over one borrowed host plan.

::Anchor{id="Entry"}

## `Entry`

```silk
pub struct Entry<'a>
```

One borrowed per-test plan entry.

::Anchor{id="Receipt"}

## `Receipt`

```silk
pub struct Receipt
```

An owned receipt under construction.

::Anchor{id="openPlan"}

## `openPlan`

```silk
pub fn openPlan<'a>(bytes: &'a [u8]) -> Plan<'a>
```

Opens a plan and validates its common magic, version, mode, and nonce framing.

::Anchor{id="isPerTest"}

## `isPerTest`

```silk
pub fn isPerTest(plan: &Plan) -> bool
```

Returns true when this is the bounded per-test mode.

::Anchor{id="isUncached"}

## `isUncached`

```silk
pub fn isUncached(plan: &Plan) -> bool
```

Returns true when this is the fixed-size uncached mode.

::Anchor{id="failed"}

## `failed`

```silk
pub fn failed(plan: &Plan) -> bool
```

Returns whether parsing has rejected the plan.

::Anchor{id="beginPerTest"}

## `beginPerTest`

```silk
pub fn beginPerTest(plan: &mut Plan, expectedDiscovered: u64) -> bool
```

Validates the per-test count and complete-file bound before any test body may run.

::Anchor{id="readEntry"}

## `readEntry`

```silk
pub fn readEntry<'a>(
  plan: &mut Plan<'a>,
  expectedOrdinal: u64,
  expectedDeclaration: &[u8],
) -> Entry<'a>
```

Reads and validates the next canonical catalog entry.

::Anchor{id="cached"}

## `cached`

```silk
pub fn cached(entry: &Entry) -> bool
```

Returns true when an entry is a validated cache hit.

::Anchor{id="executionIdentity"}

## `executionIdentity`

```silk
pub fn executionIdentity<'a>(entry: &Entry<'a>) -> &'a [u8]
```

Borrows the opaque execution identity carried by an entry.

::Anchor{id="uncachedEntry"}

## `uncachedEntry`

```silk
pub fn uncachedEntry<'a>(bytes: &'a [u8]) -> Entry<'a>
```

Returns the empty non-cached entry used by aggregate uncached execution.

::Anchor{id="finishPerTest"}

## `finishPerTest`

```silk
pub fn finishPerTest(plan: &mut Plan) -> bool
```

Requires the complete per-test plan to end exactly after the catalog.

::Anchor{id="validateUncached"}

## `validateUncached`

```silk
pub fn validateUncached(
  plan: &mut Plan,
  expectedCatalogDigest: &[u8],
  expectedDiscovered: u64,
) -> bool
```

Validates an exact 256-byte compact plan, including catalog binding and zero padding.

::Anchor{id="updateCatalogDigest"}

## `updateCatalogDigest`

```silk
pub fn updateCatalogDigest(state: &mut Sha256, ordinal: u64, identity: &[u8]) -> ()
```

Frames one catalog identity into the compact-mode catalog digest.

::Anchor{id="beginReceipt"}

## `beginReceipt`

```silk
pub effect fn beginReceipt(
  plan: &[u8],
  perTest: bool,
  selected: u64,
) -> Receipt ! OutOfMemoryError ? &mut Allocator
```

Starts a receipt bound to the complete plan bytes and invocation nonce.

::Anchor{id="appendResult"}

## `appendResult`

```silk
pub effect fn appendResult(
  receipt: &mut Receipt,
  ordinal: u64,
  declaration: &[u8],
  execution: &[u8],
  disposition: u8,
) -> () ! OutOfMemoryError ? &mut Allocator
```

Appends one selected per-test result in canonical ordinal order.

::Anchor{id="finishReceipt"}

## `finishReceipt`

```silk
pub effect fn finishReceipt(
  receipt: Receipt,
  discovered: u64,
  selected: u64,
  cachedCount: u64,
  executed: u64,
  passed: u64,
  failedCount: u64,
  status: u32,
) -> Bytes ! OutOfMemoryError ? &mut Allocator
```

Finishes a complete receipt. Compact mode is padded to exactly 256 bytes.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
