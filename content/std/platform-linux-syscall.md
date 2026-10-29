Direct Linux system calls for programs built with no libc.

## When to use
Use [`RawLinux`](#RawLinux) only in a raw Linux runtime, such as `silk.platform.linux.start`. A hosted program uses
the libc providers (the `*_native` modules and `silk.platform.native`) instead.

## Details
The module exists only on Linux on x86_64 or aarch64, with the `libc` profile set to `none`. The
syscall numbers ([`READ`](#READ), [`WRITE`](#WRITE), [`MMAP`](#MMAP), [`MUNMAP`](#MUNMAP) and [`EXIT_GROUP`](#EXIT_GROUP)) are different on
each architecture. Use the constants, not literal numbers.

[`RawLinux.read`](#RawLinux.impl.read) and [`RawLinux.write`](#RawLinux.impl.write) are safe wrappers for one `read` or `write` call on a
borrowed descriptor.

## Errors
A call returns the kernel word without change. A value from -4095 through -1 (as `usize`) is an
error. [`RawLinux.error`](#RawLinux.impl.error) gives `0` for success, or the positive error number, such as `4` for
`EINTR`.

## Gotchas
- The calls do not read or set `errno`. They do not retry an interrupted call.
- Each unsafe caller must prove the pointer, lifetime and resource contract of the syscall.

Import as `RawLinux` with `import silk.platform.linux.syscall { RawLinux }`.

Public declarations: 6.

::Anchor{id="RawLinux"}

## `RawLinux`

```silk
pub struct RawLinux
```

The scope for raw Linux kernel operations on the selected target, for programs built with no
libc.

### When to use
Use it only in a raw Linux runtime, such as `silk.platform.linux.start`. A hosted program uses the libc
providers (the `*_native` modules and `silk.platform.native`) instead.

### Details
It exists only on Linux on x86_64 or aarch64, with the `libc` profile set to `none`. A call
returns the kernel word without change. A value from -4095 through -1 (as `usize`) is an
error. [`RawLinux.error`](#RawLinux.impl.error) gives `0` for success, or the positive error number.

### Gotchas
- The calls do not read or set `errno`. They do not retry an interrupted call.
- Each unsafe caller must prove the pointer, lifetime and resource contract of the syscall.

::Anchor{id="RawLinux.impl"}

## Implementation `RawLinux`

```silk
impl RawLinux
```

::Anchor{id="RawLinux.impl.syscall0"}

### Associated function `syscall0`

```silk
pub unsafe fn syscall0(number: usize) -> usize
```

Makes Linux system call `number` with 0 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall1"}

### Associated function `syscall1`

```silk
pub unsafe fn syscall1(number: usize, a1: usize) -> usize
```

Makes Linux system call `number` with 1 argument and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall2"}

### Associated function `syscall2`

```silk
pub unsafe fn syscall2(number: usize, a1: usize, a2: usize) -> usize
```

Makes Linux system call `number` with 2 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall3"}

### Associated function `syscall3`

```silk
pub unsafe fn syscall3(number: usize, a1: usize, a2: usize, a3: usize) -> usize
```

Makes Linux system call `number` with 3 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall4"}

### Associated function `syscall4`

```silk
pub unsafe fn syscall4(number: usize, a1: usize, a2: usize, a3: usize, a4: usize) -> usize
```

Makes Linux system call `number` with 4 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall5"}

### Associated function `syscall5`

```silk
pub unsafe fn syscall5(number: usize, a1: usize, a2: usize, a3: usize, a4: usize, a5: usize) -> usize
```

Makes Linux system call `number` with 5 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscall6"}

### Associated function `syscall6`

```silk
pub unsafe fn syscall6(
        number: usize,
        a1: usize,
        a2: usize,
        a3: usize,
        a4: usize,
        a5: usize,
        a6: usize,
      ) -> usize
```

Makes Linux system call `number` with 6 arguments and returns the raw kernel word.

#### Gotchas
The caller must prove the memory, lifetime and resource obligations of the syscall. An
error stays encoded in the result. The call does not read or set `errno`.

::Anchor{id="RawLinux.impl.syscallNoReturn"}

### Associated function `syscallNoReturn`

```silk
pub unsafe fn syscallNoReturn(number: usize, argument: usize) -> ()
```

Makes Linux system call `number` with one argument, for a call that does not return.

#### Gotchas
Use it only for a call such as `exit_group`. No cleanup runs after it.

::Anchor{id="RawLinux.impl.pointer"}

### Associated function `pointer`

```silk
pub unsafe fn pointer(address: usize) -> ?[*]mut u8
```

Makes a nullable byte pointer from a kernel address. It does not read memory.

#### Gotchas
The address gives no ownership and no readable range. Prove that it is valid before each
access.

::Anchor{id="READ"}

## `READ`

```silk
pub const READ: usize
```

The `read` syscall number: 0 on x86_64, 63 on aarch64.

::Anchor{id="WRITE"}

## `WRITE`

```silk
pub const WRITE: usize
```

The `write` syscall number: 1 on x86_64, 64 on aarch64.

::Anchor{id="MMAP"}

## `MMAP`

```silk
pub const MMAP: usize
```

The `mmap` syscall number: 9 on x86_64, 222 on aarch64.

::Anchor{id="MUNMAP"}

## `MUNMAP`

```silk
pub const MUNMAP: usize
```

The `munmap` syscall number: 11 on x86_64, 215 on aarch64.

::Anchor{id="EXIT_GROUP"}

## `EXIT_GROUP`

```silk
pub const EXIT_GROUP: usize
```

The `exit_group` syscall number: 231 on x86_64, 94 on aarch64.

::Anchor{id="RawLinux.impl-2"}

## Implementation `RawLinux`

```silk
impl RawLinux
```

::Anchor{id="RawLinux.impl.error"}

### Associated function `error`

```silk
pub fn error(result: usize) -> usize
```

Returns `0` for a successful result, or the positive kernel error number.

#### Details
A result of `usize.MAX - 4094` or more is an error. For example, `usize.MAX` (-1) gives `1`
(`EPERM`), and `usize.MAX - 3` (-4) gives `4` (`EINTR`).

::Anchor{id="RawLinux.impl.read"}

### Associated function `read`

```silk
pub fn read(descriptor: usize, buffer: &mut [u8]) -> usize
```

Reads into `buffer` from a borrowed descriptor with one `read` call.

#### Details
Returns the raw kernel word: the byte count, `0` at end of input, or an encoded error. Use
[`RawLinux.error`](#RawLinux.impl.error) on it. An interrupted read returns `EINTR`. Bytes after the count keep
their old values. The call does not close the descriptor.

::Anchor{id="RawLinux.impl.write"}

### Associated function `write`

```silk
pub fn write(descriptor: usize, buffer: &[u8]) -> usize
```

Writes `buffer` to a borrowed descriptor with one `write` call.

#### Details
Returns the raw kernel word: the byte count, or an encoded error. Use [`RawLinux.error`](#RawLinux.impl.error) on
it. The count can be less than `buffer.length`, so loop until all bytes are written. The
call does not close the descriptor or keep the input.

Category: Native platform.

Profiles: `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu-no-libc`.
