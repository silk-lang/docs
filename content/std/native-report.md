Bounded, allocation-free native terminal-report formatting through source descriptors.

## When to use
Construct one writer for one terminal report after selecting its output descriptor and limits.
Feed compiler-provided identities, origins and logical frames in their semantic order.

## Gotchas
This writer borrows the descriptor and never closes it. Output failure may follow a committed
prefix. Reporting does not inspect error payloads or change a trap into a typed failure.

Import as `NativeReport` with `import silk.native_report { NativeReport }`.

Public declarations: 1.

::Anchor{id="NativeReport"}

## `NativeReport`

```silk
pub struct NativeReport
```

Per-report output limits and success state, with no process-global storage.

::Anchor{id="NativeReport.impl"}

## Implementation `NativeReport`

```silk
impl NativeReport
```

::Anchor{id="NativeReport.impl.make"}

### Associated function `make`

```silk
pub fn make(fd: i32, byteLimit: usize, frameLimit: usize) -> NativeReport
```

Creates an independent writer borrowing fd, with explicit byte and caller-frame limits.

#### Details
Construction allocates nothing. Limits apply across the primary report and its causes.

::Anchor{id="NativeReport.impl.unhandled"}

### Method `unhandled`

```silk
pub effect fn unhandled(self: &mut Self, identity: string, source: string) -> bool
```

Writes the primary typed-failure classification, canonical identity and known source origin.

#### Gotchas
The selected runtime must complete failure-payload cleanup before calling this operation.

::Anchor{id="NativeReport.impl.fatal"}

### Method `fatal`

```silk
pub effect fn fatal(self: &mut Self, reason: string, source: string) -> bool
```

Writes a distinct best-effort fatal classification, reason and known origin.

#### Gotchas
Returning from this formatter grants neither trap recovery nor structured cleanup.

::Anchor{id="NativeReport.impl.frame"}

### Method `frame`

```silk
pub effect fn frame(self: &mut Self, label: string) -> bool
```

Appends an outward logical caller frame, excluding the already written origin.

#### Details
Exhausting the frame limit writes one truncation marker if the byte budget permits it,
then marks the report incomplete. Later calls commit no additional output.

::Anchor{id="NativeReport.impl.truncate"}

### Method `truncate`

```silk
pub effect fn truncate(self: &mut Self) -> bool
```

Marks missing diagnostic context with one bounded marker and stops later output.

#### Details
Use when source context storage cannot retain a frame or cause. An earlier output failure
suppresses the marker; repeating this operation writes nothing further.

::Anchor{id="NativeReport.impl.cause"}

### Method `cause`

```silk
pub effect fn cause(self: &mut Self, identity: string, source: string) -> bool
```

Appends a retained recovery cause after the primary failure and its logical callers.

::Anchor{id="NativeReport.impl.succeeded"}

### Method `succeeded`

```silk
pub fn succeeded(self: &Self) -> bool
```

Reports whether every requested fragment was written within both configured limits.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
