POSIX file and directory operations on host paths and descriptors, for native providers and
runtimes that need the full file model of the system.

## When to use
Use [`NativeFile`](#NativeFile) to build a runtime or a provider that must expose the file operations of the
host as they are: open flags and modes, positioned reads and writes, complete status records,
links, owners, times, and directory entries. Application code that only reads and writes files
uses the `FileSystem` effect from `silk.system.filesystem` instead. That effect's native provider,
`silk.platform.native.filesystem`, keeps each path inside a root directory; [`NativeFile`](#NativeFile) does not.

## Details
A path is bytes, as the system takes it. A relative path starts at the working directory of the
process, and symbolic links resolve as the system resolves them. A path is copied with a final
zero byte into a buffer of [`PATH_LIMIT`](#PATH_LIMIT) bytes, so a longer path fails with the code for a name
that is too long, and a path that contains a zero byte fails with the code for an argument that
is not valid.

Each operation is one system call, or a short fixed sequence for [`NativeFile.copy`](#NativeFile.impl.copy). A call
that a signal interrupts is made again. The operations block the calling thread; run them on a
worker thread when the caller must stay responsive.

[`FileStatus`](#FileStatus) holds every field of the system record. On Linux it comes from `statx`, so the
birth time is set when the file system records it, and is zero when it does not. On Darwin it
comes from `stat`, which always has the birth time.

The open flags and mode bits that the system uses are constants of this module, such as
[`OPEN_CREATE`](#OPEN_CREATE). Their values differ between targets, so do not write the numbers.

## Errors
Each operation fails with [`NativeFileError`](#NativeFileError): the [`NativeFileOperation`](#NativeFileOperation) and the `errno` value.

## Gotchas
- A descriptor from [`NativeFile.open`](#NativeFile.impl.open) belongs to the caller. Close it with
  [`NativeFile.close`](#NativeFile.impl.close). Nothing closes it on a drop.
- [`NativeFile.changeMode`](#NativeFile.impl.changeMode) of a symbolic link itself, with `followLinks` false, fails on Linux,
  which cannot change the mode of a link.
- The module is empty on targets other than Darwin on x86_64 or aarch64, and Linux with GNU libc
  on x86_64 or aarch64.

## Examples
### Write, read back, and inspect a file
```silk
import silk.collections.slice { Slice }
import silk.core.effect { Effect }
import silk.core.option { Option }
import silk.core.result { Result }
import silk.platform.native.file {
  NativeFile,
  NativeFileError,
  OPEN_CREATE,
  OPEN_EXCLUSIVE,
  OPEN_READ_WRITE,
  TYPE_FILE,
  TYPE_MASK,
}

effect fn program() -> i32 ! NativeFileError {
  let mut directory: [u8; 64] = [0; 64]
  let length = run NativeFile.makeTemporaryDirectory(b"/tmp/silk-file-XXXXXX", &mut directory)
  let mut path: [u8; 72] = [0; 72]
  let mut index: usize = 0
  while index < length {
    path[index] = directory[index]
    index = index + 1
  }
  let name = b"/data"
  let mut offset: usize = 0
  while offset < name.length {
    path[length + offset] = name[offset]
    offset = offset + 1
  }
  let file = Slice.view<u8>(&path, 0, length + name.length)

  let fd = run NativeFile.open(file, OPEN_READ_WRITE | OPEN_CREATE | OPEN_EXCLUSIVE, 420)
  let written = run NativeFile.write(fd, b"hello", Option<u64>.none())

  // A positioned read does not move the file offset.
  let mut buffer: [u8; 3] = [0, 0, 0]
  let read = run NativeFile.read(fd, &mut buffer, Option<u64>.some(2))
  let status = run NativeFile.statusOf(fd)
  run NativeFile.close(fd)
  run NativeFile.remove(file)
  run NativeFile.removeDirectory(Slice.view<u8>(&directory, 0, length))
  if written != 5 || read != 3 || buffer[0] != 108 || status.size != 5 {
    return 1
  }
  if (status.mode & TYPE_MASK) != TYPE_FILE {
    return 1
  }
  return 0
}

pub effect fn main() -> i32 {
  return match run Effect.result(program()) {
    Result<i32, NativeFileError>.Success { value } => value
    Result<i32, NativeFileError>.Failure { .. } => 1
  }
}
```

Import as `NativeFile` with `import silk.platform.native.file { NativeFile }`.

Public declarations: 36.

::Anchor{id="PATH_LIMIT"}

## `PATH_LIMIT`

```silk
pub const PATH_LIMIT: usize
```

The number of bytes that a path and its final zero byte may use.

::Anchor{id="NativeFileOperation"}

## `NativeFileOperation`

```silk
pub enum NativeFileOperation
```

The operation of [`NativeFile`](#NativeFile) that failed.

::Anchor{id="NativeFileOperation.Open"}

### `Open`

```silk
Open
```

[`NativeFile.open`](#NativeFile.impl.open).

::Anchor{id="NativeFileOperation.Close"}

### `Close`

```silk
Close
```

[`NativeFile.close`](#NativeFile.impl.close).

::Anchor{id="NativeFileOperation.Read"}

### `Read`

```silk
Read
```

[`NativeFile.read`](#NativeFile.impl.read) and [`NativeFile.readScatter`](#NativeFile.impl.readScatter).

::Anchor{id="NativeFileOperation.Write"}

### `Write`

```silk
Write
```

[`NativeFile.write`](#NativeFile.impl.write) and [`NativeFile.writeGather`](#NativeFile.impl.writeGather).

::Anchor{id="NativeFileOperation.Status"}

### `Status`

```silk
Status
```

[`NativeFile.status`](#NativeFile.impl.status) and [`NativeFile.statusOf`](#NativeFile.impl.statusOf).

::Anchor{id="NativeFileOperation.Truncate"}

### `Truncate`

```silk
Truncate
```

[`NativeFile.truncate`](#NativeFile.impl.truncate) and [`NativeFile.truncateOf`](#NativeFile.impl.truncateOf).

::Anchor{id="NativeFileOperation.Synchronize"}

### `Synchronize`

```silk
Synchronize
```

[`NativeFile.synchronize`](#NativeFile.impl.synchronize).

::Anchor{id="NativeFileOperation.SetTimes"}

### `SetTimes`

```silk
SetTimes
```

[`NativeFile.setTimes`](#NativeFile.impl.setTimes) and [`NativeFile.setTimesOf`](#NativeFile.impl.setTimesOf).

::Anchor{id="NativeFileOperation.ChangeMode"}

### `ChangeMode`

```silk
ChangeMode
```

[`NativeFile.changeMode`](#NativeFile.impl.changeMode) and [`NativeFile.changeModeOf`](#NativeFile.impl.changeModeOf).

::Anchor{id="NativeFileOperation.ChangeOwner"}

### `ChangeOwner`

```silk
ChangeOwner
```

[`NativeFile.changeOwner`](#NativeFile.impl.changeOwner) and [`NativeFile.changeOwnerOf`](#NativeFile.impl.changeOwnerOf).

::Anchor{id="NativeFileOperation.Link"}

### `Link`

```silk
Link
```

[`NativeFile.link`](#NativeFile.impl.link).

::Anchor{id="NativeFileOperation.SymbolicLink"}

### `SymbolicLink`

```silk
SymbolicLink
```

[`NativeFile.symbolicLink`](#NativeFile.impl.symbolicLink).

::Anchor{id="NativeFileOperation.ReadLink"}

### `ReadLink`

```silk
ReadLink
```

[`NativeFile.readLink`](#NativeFile.impl.readLink).

::Anchor{id="NativeFileOperation.RealPath"}

### `RealPath`

```silk
RealPath
```

[`NativeFile.realPath`](#NativeFile.impl.realPath).

::Anchor{id="NativeFileOperation.Rename"}

### `Rename`

```silk
Rename
```

[`NativeFile.rename`](#NativeFile.impl.rename).

::Anchor{id="NativeFileOperation.Remove"}

### `Remove`

```silk
Remove
```

[`NativeFile.remove`](#NativeFile.impl.remove).

::Anchor{id="NativeFileOperation.RemoveDirectory"}

### `RemoveDirectory`

```silk
RemoveDirectory
```

[`NativeFile.removeDirectory`](#NativeFile.impl.removeDirectory).

::Anchor{id="NativeFileOperation.MakeDirectory"}

### `MakeDirectory`

```silk
MakeDirectory
```

[`NativeFile.makeDirectory`](#NativeFile.impl.makeDirectory).

::Anchor{id="NativeFileOperation.MakeTemporaryDirectory"}

### `MakeTemporaryDirectory`

```silk
MakeTemporaryDirectory
```

[`NativeFile.makeTemporaryDirectory`](#NativeFile.impl.makeTemporaryDirectory).

::Anchor{id="NativeFileOperation.Copy"}

### `Copy`

```silk
Copy
```

[`NativeFile.copy`](#NativeFile.impl.copy).

::Anchor{id="NativeFileOperation.Access"}

### `Access`

```silk
Access
```

[`NativeFile.access`](#NativeFile.impl.access).

::Anchor{id="NativeFileOperation.VolumeStatus"}

### `VolumeStatus`

```silk
VolumeStatus
```

[`NativeFile.volumeStatus`](#NativeFile.impl.volumeStatus).

::Anchor{id="NativeFileOperation.OpenDirectory"}

### `OpenDirectory`

```silk
OpenDirectory
```

[`NativeFile.openDirectory`](#NativeFile.impl.openDirectory).

::Anchor{id="NativeFileOperation.ReadDirectory"}

### `ReadDirectory`

```silk
ReadDirectory
```

[`Directory.next`](#Directory.impl.next).

::Anchor{id="NativeFileOperation.CloseDirectory"}

### `CloseDirectory`

```silk
CloseDirectory
```

[`Directory.close`](#Directory.impl.close).

::Anchor{id="NativeFileError"}

## `NativeFileError`

```silk
pub struct NativeFileError
```

A failed [`NativeFile`](#NativeFile) operation: which one, and the native error code.

### Details
`code` is the `errno` value of the failed system call, such as 2 (`ENOENT`) for a path that does
not exist.

::Anchor{id="NativeFileError.operation"}

### Field `operation`

```silk
pub operation: NativeFileOperation
```

The operation that failed.

::Anchor{id="NativeFileError.code"}

### Field `code`

```silk
pub code: i32
```

The native error code.

::Anchor{id="Timestamp"}

## `Timestamp`

```silk
pub struct Timestamp
```

A point in time: seconds and nanoseconds since 1970-01-01 00\:00\:00 UTC.

::Anchor{id="Timestamp.seconds"}

### Field `seconds`

```silk
pub seconds: i64
```

Whole seconds. Negative for a time before 1970.

::Anchor{id="Timestamp.nanoseconds"}

### Field `nanoseconds`

```silk
pub nanoseconds: u32
```

Nanoseconds after `seconds`, from 0 through 999999999.

::Anchor{id="Timestamp.impl.Copy"}

## Implementation `Copy for Timestamp`

```silk
impl Copy for Timestamp
```

::Anchor{id="FileStatus"}

## `FileStatus`

```silk
pub struct FileStatus
```

The status record of a file, as the system keeps it.

### Details
`mode` holds the type bits ([`TYPE_MASK`](#TYPE_MASK)) and the permission bits. `born` is zero when the file
system does not record a birth time. `flags` and `generation` are zero on Linux.

::Anchor{id="FileStatus.device"}

### Field `device`

```silk
pub device: u64
```

The device that holds the file.

::Anchor{id="FileStatus.inode"}

### Field `inode`

```silk
pub inode: u64
```

The inode number.

::Anchor{id="FileStatus.mode"}

### Field `mode`

```silk
pub mode: u32
```

The type and permission bits.

::Anchor{id="FileStatus.links"}

### Field `links`

```silk
pub links: u64
```

The number of hard links.

::Anchor{id="FileStatus.user"}

### Field `user`

```silk
pub user: u32
```

The user id of the owner.

::Anchor{id="FileStatus.group"}

### Field `group`

```silk
pub group: u32
```

The group id of the owner.

::Anchor{id="FileStatus.specialDevice"}

### Field `specialDevice`

```silk
pub specialDevice: u64
```

The device that the file is, for a device file.

::Anchor{id="FileStatus.size"}

### Field `size`

```silk
pub size: u64
```

The size in bytes.

::Anchor{id="FileStatus.blockSize"}

### Field `blockSize`

```silk
pub blockSize: u64
```

The preferred block size for transfers.

::Anchor{id="FileStatus.blocks"}

### Field `blocks`

```silk
pub blocks: u64
```

The number of 512-byte blocks that the file uses.

::Anchor{id="FileStatus.flags"}

### Field `flags`

```silk
pub flags: u32
```

The user flags of the file, on Darwin.

::Anchor{id="FileStatus.generation"}

### Field `generation`

```silk
pub generation: u32
```

The generation number of the file, on Darwin.

::Anchor{id="FileStatus.accessed"}

### Field `accessed`

```silk
pub accessed: Timestamp
```

The time of the last read.

::Anchor{id="FileStatus.modified"}

### Field `modified`

```silk
pub modified: Timestamp
```

The time of the last change of the data.

::Anchor{id="FileStatus.changed"}

### Field `changed`

```silk
pub changed: Timestamp
```

The time of the last change of the status.

::Anchor{id="FileStatus.born"}

### Field `born`

```silk
pub born: Timestamp
```

The time of creation, or zero when the file system does not record it.

::Anchor{id="FileStatus.impl.Copy"}

## Implementation `Copy for FileStatus`

```silk
impl Copy for FileStatus
```

::Anchor{id="VolumeStatus"}

## `VolumeStatus`

```silk
pub struct VolumeStatus
```

The status of the file system that holds a path.

::Anchor{id="VolumeStatus.kind"}

### Field `kind`

```silk
pub kind: u64
```

The file system type number.

::Anchor{id="VolumeStatus.blockSize"}

### Field `blockSize`

```silk
pub blockSize: u64
```

The block size in bytes.

::Anchor{id="VolumeStatus.blocks"}

### Field `blocks`

```silk
pub blocks: u64
```

The total number of blocks.

::Anchor{id="VolumeStatus.freeBlocks"}

### Field `freeBlocks`

```silk
pub freeBlocks: u64
```

The number of free blocks.

::Anchor{id="VolumeStatus.availableBlocks"}

### Field `availableBlocks`

```silk
pub availableBlocks: u64
```

The number of free blocks that a user without privileges can use.

::Anchor{id="VolumeStatus.files"}

### Field `files`

```silk
pub files: u64
```

The total number of file nodes.

::Anchor{id="VolumeStatus.freeFiles"}

### Field `freeFiles`

```silk
pub freeFiles: u64
```

The number of free file nodes.

::Anchor{id="VolumeStatus.impl.Copy"}

## Implementation `Copy for VolumeStatus`

```silk
impl Copy for VolumeStatus
```

::Anchor{id="EntryKind"}

## `EntryKind`

```silk
pub enum EntryKind
```

The type of a directory entry, as the directory reports it.

::Anchor{id="EntryKind.Unknown"}

### `Unknown`

```silk
Unknown
```

The file system did not report the type. Get it with [`NativeFile.status`](#NativeFile.impl.status).

::Anchor{id="EntryKind.File"}

### `File`

```silk
File
```

A regular file.

::Anchor{id="EntryKind.Directory"}

### `Directory`

```silk
Directory
```

A directory.

::Anchor{id="EntryKind.SymbolicLink"}

### `SymbolicLink`

```silk
SymbolicLink
```

A symbolic link.

::Anchor{id="EntryKind.Fifo"}

### `Fifo`

```silk
Fifo
```

A named pipe.

::Anchor{id="EntryKind.Socket"}

### `Socket`

```silk
Socket
```

A socket.

::Anchor{id="EntryKind.CharacterDevice"}

### `CharacterDevice`

```silk
CharacterDevice
```

A character device.

::Anchor{id="EntryKind.BlockDevice"}

### `BlockDevice`

```silk
BlockDevice
```

A block device.

::Anchor{id="DirectoryEntry"}

## `DirectoryEntry`

```silk
pub struct DirectoryEntry
```

The name and the type of one directory entry, from [`Directory.next`](#Directory.impl.next).

::Anchor{id="DirectoryEntry.length"}

### Field `length`

```silk
pub length: usize
```

The number of name bytes written to the start of the output buffer.

::Anchor{id="DirectoryEntry.kind"}

### Field `kind`

```silk
pub kind: EntryKind
```

The type of the entry.

::Anchor{id="CopyMethod"}

## `CopyMethod`

```silk
pub enum CopyMethod
```

How [`NativeFile.copy`](#NativeFile.impl.copy) makes the copy.

::Anchor{id="CopyMethod.Bytes"}

### `Bytes`

```silk
Bytes
```

Copy the bytes.

::Anchor{id="CopyMethod.CloneOrBytes"}

### `CloneOrBytes`

```silk
CloneOrBytes
```

Share the data blocks when the file system can, and else copy the bytes.

::Anchor{id="CopyMethod.Clone"}

### `Clone`

```silk
Clone
```

Share the data blocks, or fail when the file system cannot.

::Anchor{id="OPEN_READ_ONLY"}

## `OPEN_READ_ONLY`

```silk
pub const OPEN_READ_ONLY: i32
```

Open for reading only.

::Anchor{id="OPEN_WRITE_ONLY"}

## `OPEN_WRITE_ONLY`

```silk
pub const OPEN_WRITE_ONLY: i32
```

Open for writing only.

::Anchor{id="OPEN_READ_WRITE"}

## `OPEN_READ_WRITE`

```silk
pub const OPEN_READ_WRITE: i32
```

Open for reading and writing.

::Anchor{id="OPEN_APPEND"}

## `OPEN_APPEND`

```silk
pub const OPEN_APPEND: i32
```

Write each time at the end of the file.

::Anchor{id="OPEN_CREATE"}

## `OPEN_CREATE`

```silk
pub const OPEN_CREATE: i32
```

Make the file when it does not exist.

::Anchor{id="OPEN_TRUNCATE"}

## `OPEN_TRUNCATE`

```silk
pub const OPEN_TRUNCATE: i32
```

Make the file length zero.

::Anchor{id="OPEN_EXCLUSIVE"}

## `OPEN_EXCLUSIVE`

```silk
pub const OPEN_EXCLUSIVE: i32
```

With [`OPEN_CREATE`](#OPEN_CREATE), fail when the file exists.

::Anchor{id="OPEN_NO_FOLLOW"}

## `OPEN_NO_FOLLOW`

```silk
pub const OPEN_NO_FOLLOW: i32
```

Fail when the last part of the path is a symbolic link.

::Anchor{id="OPEN_SYNCHRONOUS"}

## `OPEN_SYNCHRONOUS`

```silk
pub const OPEN_SYNCHRONOUS: i32
```

Wait for data and status to reach the device on each write.

::Anchor{id="OPEN_DATA_SYNCHRONOUS"}

## `OPEN_DATA_SYNCHRONOUS`

```silk
pub const OPEN_DATA_SYNCHRONOUS: i32
```

Wait for data to reach the device on each write.

::Anchor{id="OPEN_DIRECTORY"}

## `OPEN_DIRECTORY`

```silk
pub const OPEN_DIRECTORY: i32
```

Fail when the path is not a directory.

::Anchor{id="OPEN_NONBLOCK"}

## `OPEN_NONBLOCK`

```silk
pub const OPEN_NONBLOCK: i32
```

Do not block on reads and writes.

::Anchor{id="OPEN_NO_TERMINAL"}

## `OPEN_NO_TERMINAL`

```silk
pub const OPEN_NO_TERMINAL: i32
```

Do not make a terminal the controlling terminal.

::Anchor{id="OPEN_CLOSE_ON_EXEC"}

## `OPEN_CLOSE_ON_EXEC`

```silk
pub const OPEN_CLOSE_ON_EXEC: i32
```

Close the descriptor in a child program.

::Anchor{id="OPEN_SYMBOLIC_LINK"}

## `OPEN_SYMBOLIC_LINK`

```silk
pub const OPEN_SYMBOLIC_LINK: i32
```

Open a symbolic link itself, on Darwin.

::Anchor{id="OPEN_NO_ACCESS_TIME"}

## `OPEN_NO_ACCESS_TIME`

```silk
pub const OPEN_NO_ACCESS_TIME: i32
```

Do not change the access time, on Linux. Zero on Darwin.

::Anchor{id="OPEN_DIRECT"}

## `OPEN_DIRECT`

```silk
pub const OPEN_DIRECT: i32
```

Bypass the cache, on Linux. Zero on Darwin.

::Anchor{id="NativeFile"}

## `NativeFile`

```silk
pub struct NativeFile
```

File and directory operations on host paths and descriptors.

### Details
A path is bytes. A relative path starts at the working directory. Each path, with its final zero
byte, must fit in [`PATH_LIMIT`](#PATH_LIMIT) bytes. A call that a signal interrupts is made again. The
operations block the calling thread. Each one fails with [`NativeFileError`](#NativeFileError) and the `errno`
value.

### Gotchas
A descriptor from [`NativeFile.open`](#NativeFile.impl.open) belongs to the caller. Nothing closes it on a drop.

::Anchor{id="NativeFile.impl"}

## Implementation `NativeFile`

```silk
impl NativeFile
```

::Anchor{id="NativeFile.impl.open"}

### Associated function `open`

```silk
pub effect fn open(path: &[u8], flags: i32, mode: u32) -> i32 ! NativeFileError
```

Opens `path` with the open `flags` of this module, such as [`OPEN_READ_WRITE`](#OPEN_READ_WRITE), and returns the
new descriptor.

#### Details
`mode` gives the permission bits of a new file, filtered by the umask of the process. It is
used only with [`OPEN_CREATE`](#OPEN_CREATE).

::Anchor{id="NativeFile.impl.close"}

### Associated function `close`

```silk
pub effect fn close(fd: i32) -> () ! NativeFileError
```

Closes `fd`.

#### Gotchas
The descriptor is closed also when the close fails. Do not close it again.

::Anchor{id="NativeFile.impl.read"}

### Associated function `read`

```silk
pub effect fn read(fd: i32, buffer: &mut [u8], position: Option<u64>) -> usize ! NativeFileError
```

Reads at most `buffer.length` bytes from `fd` into the start of `buffer`, and returns their
number. Zero means the end of the file.

#### Details
With `position` set, the read starts at that byte and does not move the file offset. With
`none`, it starts at the file offset and moves it.

::Anchor{id="NativeFile.impl.write"}

### Associated function `write`

```silk
pub effect fn write(fd: i32, bytes: &[u8], position: Option<u64>) -> usize ! NativeFileError
```

Writes at most all of `bytes` to `fd`, and returns the number written.

#### Details
With `position` set, the write starts at that byte and does not move the file offset. With
`none`, it starts at the file offset, or at the end for [`OPEN_APPEND`](#OPEN_APPEND), and moves it. The
count can be less than `bytes.length`.

::Anchor{id="NativeFile.impl.readScatter"}

### Associated function `readScatter`

```silk
pub effect fn readScatter(fd: i32, buffers: &mut [&mut [u8]], position: Option<u64>) -> usize ! NativeFileError
```

Reads from `fd` into `buffers` in order, as one read, and returns the number of bytes read.

#### Details
At most 1024 buffers are used. `position` acts as for [`NativeFile.read`](#NativeFile.impl.read).

::Anchor{id="NativeFile.impl.writeGather"}

### Associated function `writeGather`

```silk
pub effect fn writeGather(fd: i32, parts: &[&[u8]], position: Option<u64>) -> usize ! NativeFileError
```

Writes `parts` to `fd` in order, as one write, and returns the number of bytes written.

#### Details
At most 1024 parts are used. `position` acts as for [`NativeFile.write`](#NativeFile.impl.write). The count can be
less than the sum of the lengths, and can end inside any part.

::Anchor{id="NativeFile.impl.status"}

### Associated function `status`

```silk
pub effect fn status(path: &[u8], followLinks: bool) -> FileStatus ! NativeFileError
```

Returns the status of `path`. With `followLinks` false, a final symbolic link is inspected
itself.

::Anchor{id="NativeFile.impl.statusOf"}

### Associated function `statusOf`

```silk
pub effect fn statusOf(fd: i32) -> FileStatus ! NativeFileError
```

Returns the status of the open descriptor `fd`.

::Anchor{id="NativeFile.impl.truncate"}

### Associated function `truncate`

```silk
pub effect fn truncate(path: &[u8], length: u64) -> () ! NativeFileError
```

Sets the length of the file at `path` to `length` bytes. A longer file reads as zeros past
its old end.

::Anchor{id="NativeFile.impl.truncateOf"}

### Associated function `truncateOf`

```silk
pub effect fn truncateOf(fd: i32, length: u64) -> () ! NativeFileError
```

Sets the length of the open file `fd` to `length` bytes.

::Anchor{id="NativeFile.impl.synchronize"}

### Associated function `synchronize`

```silk
pub effect fn synchronize(fd: i32, dataOnly: bool) -> () ! NativeFileError
```

Waits until the data of `fd` reaches the device, and its status too unless `dataOnly`.

#### Details
Darwin has no public data-only call, so `dataOnly` waits for the status there too.

::Anchor{id="NativeFile.impl.setTimes"}

### Associated function `setTimes`

```silk
pub effect fn setTimes(path: &[u8], accessed: Timestamp, modified: Timestamp, followLinks: bool) -> () ! NativeFileError
```

Sets the access and modification times of `path`. With `followLinks` false, a final symbolic
link is changed itself.

::Anchor{id="NativeFile.impl.setTimesOf"}

### Associated function `setTimesOf`

```silk
pub effect fn setTimesOf(fd: i32, accessed: Timestamp, modified: Timestamp) -> () ! NativeFileError
```

Sets the access and modification times of the open file `fd`.

::Anchor{id="NativeFile.impl.changeMode"}

### Associated function `changeMode`

```silk
pub effect fn changeMode(path: &[u8], mode: u32, followLinks: bool) -> () ! NativeFileError
```

Sets the permission bits of `path` to `mode`. With `followLinks` false, a final symbolic link
is changed itself.

#### Gotchas
Linux cannot change the mode of a link: with `followLinks` false and a final link, the call
fails with code 95 (`EOPNOTSUPP`).

::Anchor{id="NativeFile.impl.changeModeOf"}

### Associated function `changeModeOf`

```silk
pub effect fn changeModeOf(fd: i32, mode: u32) -> () ! NativeFileError
```

Sets the permission bits of the open file `fd` to `mode`.

::Anchor{id="NativeFile.impl.changeOwner"}

### Associated function `changeOwner`

```silk
pub effect fn changeOwner(path: &[u8], user: u32, group: u32, followLinks: bool) -> () ! NativeFileError
```

Sets the owner user and group of `path`. A value of 4294967295 keeps that id. With
`followLinks` false, a final symbolic link is changed itself.

::Anchor{id="NativeFile.impl.changeOwnerOf"}

### Associated function `changeOwnerOf`

```silk
pub effect fn changeOwnerOf(fd: i32, user: u32, group: u32) -> () ! NativeFileError
```

Sets the owner user and group of the open file `fd`. A value of 4294967295 keeps that id.

::Anchor{id="NativeFile.impl.link"}

### Associated function `link`

```silk
pub effect fn link(existing: &[u8], created: &[u8]) -> () ! NativeFileError
```

Makes `created` a new hard link to the file `existing`.

::Anchor{id="NativeFile.impl.symbolicLink"}

### Associated function `symbolicLink`

```silk
pub effect fn symbolicLink(target: &[u8], path: &[u8]) -> () ! NativeFileError
```

Makes `path` a symbolic link that holds `target`. The target is stored as it is, and need not
exist.

::Anchor{id="NativeFile.impl.readLink"}

### Associated function `readLink`

```silk
pub effect fn readLink(path: &[u8], output: &mut [u8]) -> usize ! NativeFileError
```

Writes the target of the symbolic link `path` to the start of `output`, and returns its
length.

#### Details
A target longer than `output` is cut to `output.length` bytes; compare the result with
`output.length` and read again with a larger buffer when they are equal.

::Anchor{id="NativeFile.impl.realPath"}

### Associated function `realPath`

```silk
pub effect fn realPath(path: &[u8], output: &mut [u8]) -> usize ! NativeFileError
```

Writes the absolute path of `path` with no symbolic links and no `.` or `..` parts to the
start of `output`, and returns its length.

#### Details
A result longer than `output` fails with code 36 on Linux or 63 on Darwin (`ENAMETOOLONG`).

::Anchor{id="NativeFile.impl.rename"}

### Associated function `rename`

```silk
pub effect fn rename(from: &[u8], to: &[u8]) -> () ! NativeFileError
```

Moves `from` to `to`, and replaces a file at `to`.

::Anchor{id="NativeFile.impl.remove"}

### Associated function `remove`

```silk
pub effect fn remove(path: &[u8]) -> () ! NativeFileError
```

Removes the file or link `path`. A final symbolic link is removed itself.

::Anchor{id="NativeFile.impl.removeDirectory"}

### Associated function `removeDirectory`

```silk
pub effect fn removeDirectory(path: &[u8]) -> () ! NativeFileError
```

Removes the empty directory `path`.

::Anchor{id="NativeFile.impl.makeDirectory"}

### Associated function `makeDirectory`

```silk
pub effect fn makeDirectory(path: &[u8], mode: u32) -> () ! NativeFileError
```

Makes the directory `path` with the permission bits `mode`, filtered by the umask.

::Anchor{id="NativeFile.impl.makeTemporaryDirectory"}

### Associated function `makeTemporaryDirectory`

```silk
pub effect fn makeTemporaryDirectory(template: &[u8], output: &mut [u8]) -> usize ! NativeFileError
```

Makes a new directory with a unique name, and writes its path to the start of `output`.
Returns the length of the path.

#### Details
`template` must end with `XXXXXX`; those six bytes are replaced to make the name unique. The
directory has mode 0700. `output` must have at least `template.length` bytes, or the call
fails with code 22 (`EINVAL`).

::Anchor{id="NativeFile.impl.copy"}

### Associated function `copy`

```silk
pub effect fn copy(from: &[u8], to: &[u8], exclusive: bool, method: CopyMethod) -> () ! NativeFileError
```

Copies the file `from` to `to` with `method`. The copy gets the permission bits of `from`.

#### Details
With `exclusive`, the call fails with code 17 (`EEXIST`) when `to` exists. Else a file at `to`
is replaced. A byte copy uses `copy_file_range` on Linux and `fcopyfile` on Darwin. A clone
uses `FICLONE` on Linux and `clonefile` on Darwin.

::Anchor{id="NativeFile.impl.access"}

### Associated function `access`

```silk
pub effect fn access(path: &[u8], mode: i32) -> () ! NativeFileError
```

Checks that the process may use `path` with `mode`: 0 for existence, or the sum of 4 for
reading, 2 for writing and 1 for running.

::Anchor{id="NativeFile.impl.volumeStatus"}

### Associated function `volumeStatus`

```silk
pub effect fn volumeStatus(path: &[u8]) -> VolumeStatus ! NativeFileError
```

Returns the status of the file system that holds `path`.

::Anchor{id="NativeFile.impl.openDirectory"}

### Associated function `openDirectory`

```silk
pub effect fn openDirectory(path: &[u8]) -> Directory ! NativeFileError
```

Opens the directory `path` to list its entries with [`Directory.next`](#Directory.impl.next).

::Anchor{id="Directory"}

## `Directory`

```silk
pub struct Directory
```

An open directory listing from [`NativeFile.openDirectory`](#NativeFile.impl.openDirectory). Dropping it closes the listing.

### Details
[`Directory.next`](#Directory.impl.next) returns the entries in the order of the file system, including `.` and `..`.

::Anchor{id="Directory.impl"}

## Implementation `Directory`

```silk
impl Directory
```

::Anchor{id="Directory.impl.next"}

### Method `next`

```silk
pub effect fn next(self: &mut Self, output: &mut [u8]) -> Option<DirectoryEntry> ! NativeFileError
```

Writes the name of the next entry to the start of `output`, and returns its length and type,
or `none` after the last entry.

#### Details
A name longer than `output` fails with code 36 on Linux or 63 on Darwin (`ENAMETOOLONG`); an
output of 1024 bytes holds every name.

::Anchor{id="Directory.impl.close"}

### Method `close`

```silk
pub effect fn close(self: Self) -> () ! NativeFileError
```

Closes the listing, and reports a close error.

::Anchor{id="Directory.impl.Drop"}

## Implementation `Drop for Directory`

```silk
impl Drop for Directory
```

::Anchor{id="Directory.impl.Drop.drop"}

### Operation `drop`

```silk
fn drop(self: &mut Directory) -> ()
```

::Anchor{id="TYPE_MASK"}

## `TYPE_MASK`

```silk
pub const TYPE_MASK: u32
```

The bits of a status `mode` that give the file type.

::Anchor{id="TYPE_FILE"}

## `TYPE_FILE`

```silk
pub const TYPE_FILE: u32
```

The type bits of a regular file.

::Anchor{id="TYPE_DIRECTORY"}

## `TYPE_DIRECTORY`

```silk
pub const TYPE_DIRECTORY: u32
```

The type bits of a directory.

::Anchor{id="TYPE_SYMBOLIC_LINK"}

## `TYPE_SYMBOLIC_LINK`

```silk
pub const TYPE_SYMBOLIC_LINK: u32
```

The type bits of a symbolic link.

::Anchor{id="TYPE_FIFO"}

## `TYPE_FIFO`

```silk
pub const TYPE_FIFO: u32
```

The type bits of a named pipe.

::Anchor{id="TYPE_SOCKET"}

## `TYPE_SOCKET`

```silk
pub const TYPE_SOCKET: u32
```

The type bits of a socket.

::Anchor{id="TYPE_CHARACTER_DEVICE"}

## `TYPE_CHARACTER_DEVICE`

```silk
pub const TYPE_CHARACTER_DEVICE: u32
```

The type bits of a character device.

::Anchor{id="TYPE_BLOCK_DEVICE"}

## `TYPE_BLOCK_DEVICE`

```silk
pub const TYPE_BLOCK_DEVICE: u32
```

The type bits of a block device.

Category: Native platform.

Profiles: `aarch64-apple-darwin`.
