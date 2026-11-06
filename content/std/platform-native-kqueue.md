The Darwin kqueue system calls and their C types, shared by the native providers that use them.

## When to use
Use these declarations to build a native provider on Darwin, such as `silk.system.subprocess`
or `silk.system.signal_watch`. Application code uses those modules instead.

## Details
A program has one declaration of each C symbol, so every module that calls `kevent` imports it
from here. The functions are the C functions with no wrapping: a negative result means failure,
and the error code is in `errno`.

## Gotchas
- The module is empty on targets other than Darwin on x86_64 or aarch64.

Import as `KernelEvent` with `import silk.platform.native.kqueue { KernelEvent }`.

Public declarations: 19.

::Anchor{id="KernelEvent"}

## `KernelEvent`

```silk
pub extern "C" struct KernelEvent
```

The C `struct kevent` of 64-bit Darwin: one filter change, or one event of a kqueue.

### Details
`ident` names what the filter watches, such as a descriptor, a process ID, or a signal number.
`filter` is one of the `FILTER_` constants, and `flags` a set of the flag constants such as
[`ADD`](#ADD). `fflags` and `data` are specific to the filter. `udata` comes back unchanged with each
event of the filter.

::Anchor{id="KernelEvent.ident"}

### Field `ident`

```silk
pub ident: usize
```

What the filter watches.

::Anchor{id="KernelEvent.filter"}

### Field `filter`

```silk
pub filter: i16
```

The kind of filter, such as [`FILTER_READ`](#FILTER_READ).

::Anchor{id="KernelEvent.flags"}

### Field `flags`

```silk
pub flags: u16
```

The action and the state flags, such as [`ADD`](#ADD).

::Anchor{id="KernelEvent.fflags"}

### Field `fflags`

```silk
pub fflags: u32
```

Flags specific to the filter, such as [`NOTE_EXIT`](#NOTE_EXIT).

::Anchor{id="KernelEvent.data"}

### Field `data`

```silk
pub data: isize
```

Data specific to the filter, such as the error code of a change with [`ERROR`](#ERROR).

::Anchor{id="KernelEvent.udata"}

### Field `udata`

```silk
pub udata: usize
```

The value of the caller, returned with each event.

::Anchor{id="KernelEvent.impl.Copy"}

## Implementation `Copy for KernelEvent`

```silk
impl Copy for KernelEvent
```

::Anchor{id="KernelEvent.impl"}

## Implementation `KernelEvent`

```silk
impl KernelEvent
```

::Anchor{id="KernelEvent.impl.make"}

### Associated function `make`

```silk
pub fn make(ident: usize, filter: i16, flags: u16, fflags: u32, udata: usize) -> KernelEvent
```

Returns a filter change or an event buffer entry, with `data` 0.

::Anchor{id="TimeSpec"}

## `TimeSpec`

```silk
pub extern "C" struct TimeSpec
```

The C `struct timespec` of 64-bit Darwin, for the timeout of [`kevent`](#kevent).

::Anchor{id="TimeSpec.seconds"}

### Field `seconds`

```silk
pub seconds: i64
```

Whole seconds.

::Anchor{id="TimeSpec.nanoseconds"}

### Field `nanoseconds`

```silk
pub nanoseconds: i64
```

Nanoseconds, from 0 to 999999999.

::Anchor{id="TimeSpec.impl.Copy"}

## Implementation `Copy for TimeSpec`

```silk
impl Copy for TimeSpec
```

::Anchor{id="kqueue"}

## `kqueue`

```silk
pub unsafe extern "C" fn kqueue() -> i32
```

The C `kqueue` function: opens a new kernel queue, or returns -1.

### Gotchas
The descriptor is not close-on-exec; set `FD_CLOEXEC` with `fcntl`.

::Anchor{id="kevent"}

## `kevent`

```silk
@foreign(noCapture: .("changes", "events", "timeout"))
pub unsafe extern "C" fn kevent(queue: i32, changes: ?[*]const KernelEvent, changeCount: i32, events: ?[*]mut KernelEvent, eventCount: i32, timeout: ?*const TimeSpec) -> i32
```

The C `kevent` function: applies `changeCount` changes, then waits up to `timeout` (forever
when null) for at most `eventCount` events. Returns the number of events, or -1.

### Gotchas
`changes` must hold `changeCount` entries and `events` must have room for `eventCount` entries
during the call.

::Anchor{id="FILTER_READ"}

## `FILTER_READ`

```silk
pub const FILTER_READ: i16
```

`EVFILT_READ`: the descriptor has data to read.

::Anchor{id="FILTER_WRITE"}

## `FILTER_WRITE`

```silk
pub const FILTER_WRITE: i16
```

`EVFILT_WRITE`: a write to the descriptor would not block.

::Anchor{id="FILTER_PROC"}

## `FILTER_PROC`

```silk
pub const FILTER_PROC: i16
```

`EVFILT_PROC`: the process `ident` had an event of `fflags`, such as [`NOTE_EXIT`](#NOTE_EXIT).

::Anchor{id="FILTER_SIGNAL"}

## `FILTER_SIGNAL`

```silk
pub const FILTER_SIGNAL: i16
```

`EVFILT_SIGNAL`: the signal `ident` was sent to the process; `data` counts the arrivals.

::Anchor{id="FILTER_USER"}

## `FILTER_USER`

```silk
pub const FILTER_USER: i16
```

`EVFILT_USER`: an event that the caller triggers with [`NOTE_TRIGGER`](#NOTE_TRIGGER).

::Anchor{id="ADD"}

## `ADD`

```silk
pub const ADD: u16
```

`EV_ADD`: adds the filter, or changes it.

::Anchor{id="DELETE"}

## `DELETE`

```silk
pub const DELETE: u16
```

`EV_DELETE`: removes the filter.

::Anchor{id="ENABLE"}

## `ENABLE`

```silk
pub const ENABLE: u16
```

`EV_ENABLE`: reports the events of the filter.

::Anchor{id="ONESHOT"}

## `ONESHOT`

```silk
pub const ONESHOT: u16
```

`EV_ONESHOT`: removes the filter after its first event.

::Anchor{id="CLEAR"}

## `CLEAR`

```silk
pub const CLEAR: u16
```

`EV_CLEAR`: resets the state of the filter after each event.

::Anchor{id="RECEIPT"}

## `RECEIPT`

```silk
pub const RECEIPT: u16
```

`EV_RECEIPT`: reports each change as an event with [`ERROR`](#ERROR) and its result in `data`.

::Anchor{id="ERROR"}

## `ERROR`

```silk
pub const ERROR: u16
```

`EV_ERROR`: the event reports the result of a change in `data`.

::Anchor{id="END"}

## `END`

```silk
pub const END: u16
```

`EV_EOF`: the descriptor reached its end, or its peer closed.

::Anchor{id="NOTE_EXIT"}

## `NOTE_EXIT`

```silk
pub const NOTE_EXIT: u32
```

`NOTE_EXIT`: the process exited, for [`FILTER_PROC`](#FILTER_PROC).

::Anchor{id="NOTE_TRIGGER"}

## `NOTE_TRIGGER`

```silk
pub const NOTE_TRIGGER: u32
```

`NOTE_TRIGGER`: triggers a [`FILTER_USER`](#FILTER_USER) event.

Category: Native platform.

Profiles: `aarch64-apple-darwin`.
