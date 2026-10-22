Selected native filesystem declarations and affine descriptor ownership.

## When to use
Use this boundary to implement OsFileSystem. Portable code requires FileSystem.

## Details
Native records, flags, error capture and descriptor-relative traversal are selected source.
Handles own one close obligation; explicit close reports failure and Drop preserves an earlier
failure during structured unwinding. Native members are absent on unsupported supplies.
Atomic publication owns the containing directory and its exclusively claimed staging file until
cleanup completes. Replace renames the entry itself, including a final symlink, without following
its referent; create-new uses linkat's atomic absent-name claim followed by staging unlink.
Both create fresh regular inodes with mode 0666 filtered by umask and filesystem inheritance;
replacement preserves no old permissions, ownership, ACLs, extended attributes or hard-link identity.
Synchronized publication uses fsync on the actual staged descriptor before publication and on
the owned parent afterward. On Darwin and GNU/Linux this is ordinary filesystem synchronization,
not Darwin F_FULLFSYNC or a guarantee about hardware caches or physical power-loss recovery.

Import as `NativeFileSystem` with `import silk.native_filesystem { NativeFileSystem }`.

Public declarations: 3.

::Anchor{id="FileHandle"}

## `FileHandle`

```silk
pub struct FileHandle
```

An affine descriptor with one close obligation, transferred by consuming operations.

::Anchor{id="DirectoryHandle"}

## `DirectoryHandle`

```silk
pub struct DirectoryHandle
```

An affine directory stream retaining an owned name across an insufficient-buffer retry.

::Anchor{id="DirectoryHandle.impl.Drop"}

## Implementation `Drop for DirectoryHandle`

```silk
impl Drop for DirectoryHandle
```

::Anchor{id="DirectoryHandle.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut DirectoryHandle) -> ()
```

::Anchor{id="NativeFileSystem"}

## `NativeFileSystem`

```silk
pub struct NativeFileSystem
```

Descriptor-relative filesystem operations with source-owned error and lifetime policy.

::Anchor{id="NativeFileSystem.impl"}

## Implementation `NativeFileSystem`

```silk
impl NativeFileSystem
```

::Anchor{id="NativeFileSystem.impl.openFile"}

### Associated function `openFile`

```silk
pub effect fn openFile(root: &[u8], path: &[u8], writing: bool, operation: i32) -> FileHandle ! FileError
```

Opens and validates a regular file; writes truncate only after successful kind inspection.

::Anchor{id="NativeFileSystem.impl.createFile"}

### Associated function `createFile`

```silk
pub effect fn createFile(root: &[u8], path: &[u8], bytes: &[u8]) -> () ! FileError
```

Exclusively creates a regular file without inspecting, following or truncating existing entries.

#### Details

Existing files, directories and final symlinks report AlreadyExists. A successful claim uses
mode 0666 filtered by umask. Readers may see a prefix while writing; a later write or close
failure leaves the newly created, possibly partial file in place. This does not synchronize.

::Anchor{id="NativeFileSystem.impl.writeFileAtomic"}

### Associated function `writeFileAtomic`

```silk
pub effect fn writeFileAtomic(root: &[u8], path: &[u8], bytes: &[u8], policy: i32, durability: i32, counter: &mut u64) -> () ! AtomicWriteError
```

Stages complete contents in the destination directory, then atomically publishes one entry.

#### Details

Policy 0 uses renameat: an absent name or regular file is allowed, a final symlink is replaced
without following it, and directories and other inspected entry kinds report WrongType.
Policy 1 uses linkat without a preflight existence check: any existing entry reports
AlreadyExists. The staging name is O_EXCL-claimed, skipping collisions and the destination
itself; at most 128 candidate names are tried. Unneeded staging entries are unlinked through
the same owned parent descriptor, never by re-resolving a pathname.

Durability 0 is buffered; 1 fsyncs the actual staged file before closing and publishing, then
fsyncs the parent after publication and staging cleanup. Unsupported policies or sync support
are explicit failures. A parent-sync or parent-close failure reports published=true.
The first failure remains cause; a failed staging unlink is separately retained in
cleanupError with its exact residual leaf bytes. Close is attempted once, including EINTR.

Newly published inodes use 0666 filtered by umask and normal filesystem inheritance. No old
metadata is copied and old hard links retain the old inode. Callers must not concurrently
remove or replace provider-owned staging entries; this is not a hostile-directory sandbox.

::Anchor{id="NativeFileSystem.impl.syncDirectory"}

### Associated function `syncDirectory`

```silk
pub effect fn syncDirectory(root: &[u8], path: &[u8]) -> () ! FileError
```

Synchronizes an owned no-follow directory descriptor and reports sync or one-shot close failure.

#### Details

Darwin and GNU/Linux use ordinary fsync, not a stronger hardware-cache flush. EINVAL,
ENOTSUP/EOPNOTSUPP and ENOSYS from synchronization report Unsupported with the native code.

::Anchor{id="NativeFileSystem.impl.openDirectory"}

### Associated function `openDirectory`

```silk
pub effect fn openDirectory(root: &[u8], path: &[u8], operation: i32) -> DirectoryHandle ! FileError
```

Opens a directory and transfers its descriptor to a stream only after fdopendir succeeds.

::Anchor{id="NativeFileSystem.impl.inspect"}

### Associated function `inspect`

```silk
pub effect fn inspect(root: &[u8], path: &[u8], outputKind: &mut i32, length: &mut usize, operation: i32) -> () ! FileError
```

Inspects a no-follow child and returns regular-file or directory metadata.

::Anchor{id="NativeFileSystem.impl.command"}

### Associated function `command`

```silk
pub effect fn command(root: &[u8], path: &[u8], command: i32, operation: i32) -> () ! FileError
```

Creates or removes one normalized child, rejecting replacement through symlinks.

::Anchor{id="NativeFileSystem.impl.readFile"}

### Associated function `readFile`

```silk
pub effect fn readFile(handle: &mut FileHandle, output: &mut [u8], operation: i32) -> usize ! FileError
```

Reads one checked prefix, retrying EINTR and leaving the remaining initialized tail unchanged.

::Anchor{id="NativeFileSystem.impl.writeFile"}

### Associated function `writeFile`

```silk
pub effect fn writeFile(handle: &mut FileHandle, input: &[u8], operation: i32) -> () ! FileError
```

Completes initialized bytes, advancing after positive counts and preserving failure prefixes.

::Anchor{id="NativeFileSystem.impl.next"}

### Associated function `next`

```silk
pub effect fn next(handle: &mut DirectoryHandle, output: &mut [u8], count: &mut usize, required: &mut usize, outputKind: &mut i32, operation: i32) -> bool ! FileError
```

Copies the next owned byte name, retaining it when output capacity is insufficient.

#### Details
False reports required capacity without advancing; true with zero count is latched EOF.

::Anchor{id="NativeFileSystem.impl.createUnique"}

### Associated function `createUnique`

```silk
pub effect fn createUnique(root: &[u8], path: &[u8], prefix: &[u8], counter: &mut u64, output: &mut [u8], count: &mut usize, required: &mut usize, operation: i32) -> bool ! FileError
```

Exclusively creates one predictable counter name, retrying at most 128 collisions.

::Anchor{id="NativeFileSystem.impl.closeFile"}

### Associated function `closeFile`

```silk
pub effect fn closeFile(value: FileHandle, operation: FileOperation) -> () ! FileError
```

Consumes a file and reports its one close attempt, without retrying EINTR.

::Anchor{id="NativeFileSystem.impl.closeDirectory"}

### Associated function `closeDirectory`

```silk
pub effect fn closeDirectory(value: DirectoryHandle, operation: FileOperation) -> () ! FileError
```

Consumes a directory stream and reports its one closedir attempt.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
