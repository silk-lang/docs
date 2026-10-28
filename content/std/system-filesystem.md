Files and directories through the `FileSystem` effect: paths, whole-file reads and writes,
atomic writes, directory listings, and temporary directories.

## When to use
Make a [`Path`](#Path) with [`Path.make`](#Path.impl.make), [`Path.join`](#Path.impl.join), or [`Path.resolve`](#Path.impl.resolve). Then require `&mut
FileSystem` and call [`FileSystem.readFile`](#FileSystem.readFile), [`FileSystem.writeFile`](#FileSystem.writeFile), and the other
operations. Native programs provide `silk.system.filesystem_native`. Tests can provide a file system in
memory.

Use [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) when a reader must never see a partly written file, such as
for a configuration file. Use [`FileSystem.temporaryDirectory`](#FileSystem.impl.temporaryDirectory) for scratch space.

## Details
Each `Path` is absolute and normalized. It starts with `/`, and it has no empty components, no
`.` or `..` components, no NUL byte, and no trailing `/` (except the root `/` itself). `/` is
the root of the provider, which is not always the root of the host.

A path is bytes, not text, because host paths do not have to be valid UTF-8. Use
[`Path.rawBytes`](#Path.impl.rawBytes) to pass a path on without loss. [`Path.view`](#Path.impl.view) and [`Path.name`](#Path.impl.name) return text
only for valid UTF-8.

Directory listings are sorted by the bytes of the path, so they are the same on each host.

## Errors
- [`FileError`](#FileError) for each failed operation. It has the operation, a portable reason, and an
  optional code from the provider. Recover by the reason: `NotFound`, `AlreadyExists`,
  `PermissionDenied`, `InvalidPath`, `WrongType`, `NotEmpty`, `NoSpace`, `TooLarge`,
  `Unsupported`, or `Other`.
- [`AtomicWriteError`](#AtomicWriteError) from [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic).
- `OutOfMemoryError` from operations that return owned paths or bytes.

## Gotchas
A temporary directory is not removed when it is dropped. Call [`FileSystem.release`](#FileSystem.impl.release) or
[`FileSystem.releaseIgnored`](#FileSystem.impl.releaseIgnored). Operations on more than one path, such as
[`FileSystem.writeFileWithParents`](#FileSystem.impl.writeFileWithParents), are not transactions. A failure can leave part of the work
done.

## Examples
### Make, join, and resolve paths
```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.system.filesystem { FileError, Path }
import silk.option { Option }

effect fn paths() -> bool
  ! FileError | OutOfMemoryError
  ? &mut Allocator {
  let project = run Path.make("/workspace/app")
  let source = run Path.join(&project, "src/main.silk")
  let sibling = run Path.resolve(&project, "../docs")
  let name = Path.name(&source)
  let sourceOk = match move name {
    Option<string>.Some { value } => value == "main.silk"
    Option<string>.None => false
  }
  return sourceOk && Path.rawBytes(&sibling).length == 15
}

pub effect fn main() -> i32
  ! FileError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  if !run paths() |> Effect.provideMut<Allocator>(&mut allocator) {
    return 1
  }
  return 0
}
```

## See also
- `silk.system.filesystem_native` for the native provider.
- `silk.system.host_input` for the working directory of the process.

Import as `FileSystem` with `import silk.system.filesystem { FileSystem }`.

Public declarations: 13.

::Anchor{id="Path"}

## `Path`

```silk
pub struct Path
```

An owned, normalized, absolute path.

### Details

Each `Path` starts with `/`, and it has no empty components, no `.` or `..` components, no NUL
byte, and no trailing `/` (except the root `/` itself). The only way to make one is through
[`Path.make`](#Path.impl.make), [`Path.fromBytes`](#Path.impl.fromBytes), [`Path.root`](#Path.impl.root), [`Path.join`](#Path.impl.join), or [`Path.resolve`](#Path.impl.resolve), which
check these rules. `/` is the root of the `FileSystem` provider, which is not always the root
of the host.

A path is bytes, not text, because host paths do not have to be valid UTF-8. Use
[`Path.rawBytes`](#Path.impl.rawBytes) to pass a path on without loss. [`Path.view`](#Path.impl.view) and [`Path.name`](#Path.impl.name) return text
only for valid UTF-8.

::Anchor{id="Path.impl"}

## Implementation `Path`

```silk
impl Path
```

::Anchor{id="Path.impl.make"}

### Associated function `make`

```silk
pub effect fn make(value: string) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns a copy of `value` as a [`Path`](#Path).

#### Details

`value` must start with `/`. Except for `/` itself, it must not end with `/`, and it must not
contain NUL, empty components, `.`, or `..`. To interpret `.` and `..`, use [`Path.resolve`](#Path.impl.resolve).

#### Errors

- `FileError` with reason `InvalidPath` if `value` does not follow these rules.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.fromBytes"}

### Associated function `fromBytes`

```silk
pub effect fn fromBytes(values: &[u8]) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns a copy of `values` as a [`Path`](#Path). The bytes do not have to be valid UTF-8.

#### When to use

Use it for a path that you got from the host as bytes, such as a program argument, so you can
pass it back without changes.

#### Details

`values` must start with `/`. Except for `/` itself, it must not end with `/`, and it must not
contain NUL, empty components, `.`, or `..`. The result can have no text view.

#### Errors

- `FileError` with reason `InvalidPath` if `values` does not follow the path rules.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.root"}

### Associated function `root`

```silk
pub effect fn root() -> Path ! OutOfMemoryError ? &mut Allocator
```

Returns the root path `/`.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.rawBytes"}

### Method `rawBytes`

```silk
pub fn rawBytes(self: &Self) -> &[u8]
```

Returns the bytes of the path. This view works for every path, also when the bytes are not
valid UTF-8.

::Anchor{id="Path.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> Option<string>
```

Returns the path as text. Returns an absent option if the bytes are not valid UTF-8.

#### Details

Paths from [`Path.make`](#Path.impl.make), [`Path.join`](#Path.impl.join), [`Path.joinUtf8`](#Path.impl.joinUtf8), and [`Path.resolve`](#Path.impl.resolve) are always
valid UTF-8. Paths from [`Path.fromBytes`](#Path.impl.fromBytes) and [`Path.joinBytes`](#Path.impl.joinBytes) are not always.

::Anchor{id="Path.impl.isRoot"}

### Method `isRoot`

```silk
pub fn isRoot(self: &Self) -> bool
```

Returns `true` if the path is the root `/`.

::Anchor{id="Path.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> Option<string>
```

Returns the last component as text, such as `"main.silk"` for `/app/main.silk`. Returns an
absent option if the bytes are not valid UTF-8.

#### Details

For the root, the result is empty text. It does not allocate.

::Anchor{id="Path.impl.join"}

### Associated function `join`

```silk
pub effect fn join(
    base: &Path,
    fragment: string
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns `base` followed by `/` and `fragment`.

#### Details

`fragment` is relative and can have more than one component, such as `"src/main.silk"`. It
must not be empty, start or end with `/`, or contain NUL, empty components, `.`, or `..`. To
interpret `.` and `..`, use [`Path.resolve`](#Path.impl.resolve).

#### Errors

- `FileError` with reason `InvalidPath` if `fragment` does not follow these rules.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.joinUtf8"}

### Associated function `joinUtf8`

```silk
pub effect fn joinUtf8(
    base: &Path,
    fragment: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns `base` followed by `/` and `fragment`, where `fragment` is bytes that must be valid
UTF-8.

#### When to use

Use it for a name that you got as bytes, when the result must have a text view.

#### Errors

- `FileError` with reason `InvalidPath` if `fragment` is not valid UTF-8, or if it is empty,
  starts or ends with `/`, or contains NUL, empty components, `.`, or `..`.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.joinBytes"}

### Associated function `joinBytes`

```silk
pub effect fn joinBytes(
    base: &Path,
    fragment: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns `base` followed by `/` and `fragment`. The bytes do not have to be valid UTF-8.

#### When to use

Use it for a name from a directory listing on the host, to keep the exact bytes.

#### Errors

- `FileError` with reason `InvalidPath` if `fragment` is empty, starts or ends with `/`, or
  contains NUL, empty components, `.`, or `..`.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.resolve"}

### Associated function `resolve`

```silk
pub effect fn resolve(
    base: &Path,
    relativeText: string
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Returns the path that `relativeText` names when you start at `base`.

#### Details

Each `..` removes one component, `.` and empty text keep the current path, and other
components are added. For example, `"../docs"` from `/workspace/app` gives `/workspace/docs`.
A single trailing `/` is ignored, so `"docs/"` gives the same path as `"docs"`. It only
computes the path. It does not access the file system, so it does not follow links.

#### Errors

- `FileError` with reason `InvalidPath` if `relativeText` starts with `/`, contains NUL or an
  empty component such as `"a//b"`, or goes above the root.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="Path.impl.parent"}

### Method `parent`

```silk
pub effect fn parent(
    self: &Self
  ) -> Option<Path> ! OutOfMemoryError ? &mut Allocator
```

Returns the parent of the path. Returns an absent option for the root.

#### Details

The parent of a direct child of the root is the root. The result is a new path that does not
borrow `self`.

#### Errors

- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="FileInfo"}

## `FileInfo`

```silk
pub struct FileInfo
```

Information about a regular file.

::Anchor{id="FileInfo.byteLength"}

### Field `byteLength`

```silk
pub byteLength: usize
```

The length of the file in bytes.

::Anchor{id="DirectoryInfo"}

## `DirectoryInfo`

```silk
pub struct DirectoryInfo
```

Information about a directory. It has no fields. The type tells you that the path is a
directory.

::Anchor{id="DirectoryEntryKind"}

## `DirectoryEntryKind`

```silk
pub struct DirectoryEntryKind
```

The kind of a directory entry: a file, a directory, or a symbolic link. Compare with
[`FileSystem.file`](#FileSystem.impl.file), [`FileSystem.directory`](#FileSystem.impl.directory), and [`FileSystem.symbolicLink`](#FileSystem.impl.symbolicLink).

::Anchor{id="DirectoryEntryKind.code"}

### Field `code`

```silk
pub code: i32
```

The kind code: 0 for a file, 1 for a directory, 2 for a symbolic link.

::Anchor{id="DirectoryEntry"}

## `DirectoryEntry`

```silk
pub struct DirectoryEntry
```

One child in a directory listing.

::Anchor{id="DirectoryEntry.path"}

### Field `path`

```silk
pub path: Path
```

The full path of the child. The entry owns it.

::Anchor{id="DirectoryEntry.kind"}

### Field `kind`

```silk
pub kind: DirectoryEntryKind
```

The kind of the child.

::Anchor{id="FileOperation"}

## `FileOperation`

```silk
pub struct FileOperation
```

The operation that failed, as recorded in a [`FileError`](#FileError). Compare its code with the
constructors such as [`FileSystem.readFileOperation`](#FileSystem.impl.readFileOperation).

::Anchor{id="FileOperation.code"}

### Field `code`

```silk
pub code: i32
```

The operation code.

::Anchor{id="FileOperation.impl.Debug"}

## Implementation `Debug for FileOperation`

```silk
impl Debug for FileOperation
```

::Anchor{id="FileOperation.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the code, such as `ReadFile`, or the code when it has no name.

::Anchor{id="FileReason"}

## `FileReason`

```silk
pub struct FileReason
```

The portable reason for a [`FileError`](#FileError). Compare its code with the constructors such as
[`FileSystem.notFound`](#FileSystem.impl.notFound).

::Anchor{id="FileReason.code"}

### Field `code`

```silk
pub code: i32
```

The reason code.

::Anchor{id="FileReason.impl.Debug"}

## Implementation `Debug for FileReason`

```silk
impl Debug for FileReason
```

::Anchor{id="FileReason.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the name of the code, such as `NotFound`, or the code when it has no name.

::Anchor{id="FileError"}

## `FileError`

```silk
pub struct FileError
```

The error from a file system operation.

### Details

Decide how to recover from `reason`, for example with `FileSystem.reasonCode(error.reason) ==
FileSystem.reasonCode(FileSystem.notFound())`. The provider code from
[`FileSystem.providerCode`](#FileSystem.impl.providerCode) is for diagnostics only, because it is different on each host.

::Anchor{id="FileError.operation"}

### Field `operation`

```silk
pub operation: FileOperation
```

The operation that failed.

::Anchor{id="FileError.reason"}

### Field `reason`

```silk
pub reason: FileReason
```

The portable reason. Use it to decide how to recover.

::Anchor{id="FileError.impl.Debug"}

## Implementation `Debug for FileError`

```silk
impl Debug for FileError
```

::Anchor{id="FileError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `FileError { operation: ReadFile, reason: NotFound, providerCode: 2 }`.
It leaves out `providerCode` when there is none.

::Anchor{id="PublicationPolicy"}

## `PublicationPolicy`

```silk
pub struct PublicationPolicy
```

What [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) does when the destination exists.

### Details

Make one with [`FileSystem.replaceExisting`](#FileSystem.impl.replaceExisting) or [`FileSystem.createNew`](#FileSystem.impl.createNew).

::Anchor{id="PublicationPolicy.code"}

### Field `code`

```silk
pub code: i32
```

0 replaces an existing destination. 1 fails if the destination exists.

::Anchor{id="Durability"}

## `Durability`

```silk
pub struct Durability
```

If [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) synchronizes the data to storage.

### Details

Make one with [`FileSystem.buffered`](#FileSystem.impl.buffered) or [`FileSystem.synchronized`](#FileSystem.impl.synchronized).

::Anchor{id="Durability.code"}

### Field `code`

```silk
pub code: i32
```

0 does not synchronize. 1 synchronizes the file before it becomes visible and the directory
after.

::Anchor{id="AtomicWriteError"}

## `AtomicWriteError`

```silk
pub struct AtomicWriteError
```

The error from [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic).

### Details

If `published` is `false`, the destination did not change. If `published` is `true`, the new
contents are visible, but a later step failed, such as a synchronization or the removal of the
temporary file.

### Gotchas

Do not retry a write that has `published` set to `true`. With the create-new policy, the retry
fails with `AlreadyExists`, because the first write created the file.

::Anchor{id="AtomicWriteError.published"}

### Field `published`

```silk
pub published: bool
```

`true` if the new contents became visible at the destination.

::Anchor{id="AtomicWriteError.cause"}

### Field `cause`

```silk
pub cause: FileError
```

The first failure.

::Anchor{id="AtomicWriteError.cleanupError"}

### Field `cleanupError`

```silk
pub cleanupError: Option<FileError>
```

A second failure when the temporary file could not be removed, if one happened.

::Anchor{id="AtomicWriteError.stagingName"}

### Field `stagingName`

```silk
pub stagingName: Bytes
```

The name of the temporary file that is still in the destination directory if the removal
failed. Empty otherwise.

::Anchor{id="AtomicWriteError.impl.Debug"}

## Implementation `Debug for AtomicWriteError`

```silk
impl Debug for AtomicWriteError
```

::Anchor{id="AtomicWriteError.impl.Debug.debug"}

### Operation `debug`

```silk
effect fn debug(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer
```

Writes the fields, as `AtomicWriteError { published: ..., cause: ..., ... }`.

::Anchor{id="FileSystem"}

## `FileSystem`

```silk
pub service FileSystem
```

The effect for file system operations: whole-file reads and writes, atomic writes, directory
listings, and temporary directories.

### When to use

Make a [`Path`](#Path), then require `&mut FileSystem` and call [`FileSystem.readFile`](#FileSystem.readFile),
[`FileSystem.writeFile`](#FileSystem.writeFile), and the other operations. Use [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) when a
reader must never see a partly written file, such as for a configuration file. Use
[`FileSystem.temporaryDirectory`](#FileSystem.impl.temporaryDirectory) for scratch space.

### Details

Provide one with `Effect.provideMut<FileSystem>(&mut provider)`. Native programs use
`silk.system.filesystem_native`. Each provider must use the portable error reasons, replace the whole file
on [`FileSystem.writeFile`](#FileSystem.writeFile), and sort directory listings by path bytes, so they are the same on
each host.

### Errors

- [`FileError`](#FileError) for each failed operation. It has the operation, a portable reason, and an
  optional code from the provider. Recover by the reason: `NotFound`, `AlreadyExists`,
  `PermissionDenied`, `InvalidPath`, `WrongType`, `NotEmpty`, `NoSpace`, `TooLarge`,
  `Unsupported`, or `Other`.
- [`AtomicWriteError`](#AtomicWriteError) from [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic).
- `OutOfMemoryError` from operations that return owned paths or bytes.

### Gotchas

A temporary directory is not removed when it is dropped. Call [`FileSystem.release`](#FileSystem.impl.release) or
[`FileSystem.releaseIgnored`](#FileSystem.impl.releaseIgnored). Operations on more than one path, such as
[`FileSystem.writeFileWithParents`](#FileSystem.impl.writeFileWithParents), are not transactions. A failure can leave part of the work
done.

::Anchor{id="FileSystem.readFile"}

### Operation `readFile`

```silk
effect fn readFile(
    path: &Path
  ) -> Bytes ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Returns a copy of the contents of the regular file at `path`.

#### Errors

- `FileError` with reason `NotFound`, `PermissionDenied`, or `WrongType` (for a directory), or
  another reason from the provider.
- `OutOfMemoryError` if the `Allocator` cannot supply the contents.

::Anchor{id="FileSystem.writeFile"}

### Operation `writeFile`

```silk
effect fn writeFile(path: &Path, bytes: &[u8]) -> () ! FileError ? &mut FileSystem
```

Writes `bytes` to the file at `path`. It creates the file, or replaces all of the contents of
an existing file.

#### Errors

- `FileError` with reason `NotFound` if the parent directory does not exist, `WrongType` if
  `path` is a directory, or another reason from the provider.

#### Gotchas

It does not create parent directories. Use [`FileSystem.writeFileWithParents`](#FileSystem.impl.writeFileWithParents) for that. A
reader can see the file while it is partly written. Use [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) if that
is a problem.

::Anchor{id="FileSystem.createFile"}

### Operation `createFile`

```silk
effect fn createFile(path: &Path, bytes: &[u8]) -> () ! FileError ? &mut FileSystem
```

Creates a new file at `path` with the contents `bytes`. It never replaces an existing entry.

#### Details

The check that the name is free and the creation are one atomic step. It does not follow a
symbolic link at `path`.

#### Errors

- `FileError` with reason `AlreadyExists` if any entry exists at `path`.
- `FileError` with another reason if the write or close fails. The new file stays, and it can
  be incomplete.

#### Gotchas

A reader can see the file while it is partly written. To create a file that appears only when
it is complete, use [`FileSystem.writeFileAtomic`](#FileSystem.writeFileAtomic) with [`FileSystem.createNew`](#FileSystem.impl.createNew).

::Anchor{id="FileSystem.writeFileAtomic"}

### Operation `writeFileAtomic`

```silk
effect fn writeFileAtomic(
    path: &Path,
    bytes: &[u8],
    policy: PublicationPolicy,
    durability: Durability
  ) -> () ! AtomicWriteError ? &mut FileSystem
```

Writes `bytes` to `path` so that a reader sees either the old contents or all of the new
contents, never a partial file.

#### Details

The provider writes a temporary file in the same directory and then renames it to `path` in
one step. With [`FileSystem.replaceExisting`](#FileSystem.impl.replaceExisting), it replaces a regular file or creates a missing
one. A native provider replaces a symbolic link itself, not its target. With
[`FileSystem.createNew`](#FileSystem.impl.createNew), it fails if any entry exists, and the check is part of the atomic
rename.

With [`FileSystem.synchronized`](#FileSystem.impl.synchronized), the provider synchronizes the temporary file before the
rename and the directory after it. This is normal file system synchronization. It does not
protect against hardware caches that lose data at power loss.

A native provider creates a new file with mode `0666` minus the process umask. The new file
does not keep the mode, owner, ACLs, extended attributes, or hard links of the old file.

#### Errors

- `AtomicWriteError` with `published` set to `false` if the write failed before the rename.
  The destination did not change.
- `AtomicWriteError` with `published` set to `true` if a step after the rename failed.
- The cause has reason `WrongType` if `path` is a directory, `AlreadyExists` for create-new
  when the destination exists, or `Unsupported` if the provider cannot give the requested
  guarantees. A provider never falls back to a normal write.

#### Gotchas

It makes one file visible atomically. It is not a transaction across more than one file.

::Anchor{id="FileSystem.syncDirectory"}

### Operation `syncDirectory`

```silk
effect fn syncDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Synchronizes the directory at `path`, so that entries created or removed in it are on storage.

#### When to use

After you create or remove an entry, synchronize its parent directory. After you create a
directory, synchronize its parent too. This does not synchronize the contents of files.

#### Errors

- `FileError` with reason `Unsupported` if the provider cannot synchronize directories, or
  another reason from the provider.

::Anchor{id="FileSystem.stat"}

### Operation `stat`

```silk
effect fn stat(path: &Path) -> FileInfo | DirectoryInfo ! FileError ? &mut FileSystem
```

Returns [`FileInfo`](#FileInfo) for a regular file or [`DirectoryInfo`](#DirectoryInfo) for a directory. It does not open
the file.

#### Errors

- `FileError` with reason `NotFound` if nothing exists at `path`, or another reason from the
  provider. It does not fail with `WrongType`.

::Anchor{id="FileSystem.listDirectory"}

### Operation `listDirectory`

```silk
effect fn listDirectory(
    path: &Path
  ) -> List<DirectoryEntry> ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Returns the direct children of the directory at `path`, sorted by path bytes.

#### Details

The listing does not include children of children. Each entry owns its path, so you can keep
it after you drop the list. An entry that is a symbolic link has the kind
[`FileSystem.symbolicLink`](#FileSystem.impl.symbolicLink), whatever it points to.

#### Errors

- `FileError` with reason `NotFound`, `WrongType` (for a file), or another reason from the
  provider.
- `OutOfMemoryError` if the `Allocator` cannot supply the list.

::Anchor{id="FileSystem.createDirectory"}

### Operation `createDirectory`

```silk
effect fn createDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Creates the directory `path`. Its parent must exist.

#### Errors

- `FileError` with reason `AlreadyExists` if an entry exists at `path`, or `NotFound` if the
  parent does not exist. To create the missing parents too, use
  [`FileSystem.createDirectoriesRecursively`](#FileSystem.impl.createDirectoriesRecursively).

::Anchor{id="FileSystem.removeFile"}

### Operation `removeFile`

```silk
effect fn removeFile(path: &Path) -> () ! FileError ? &mut FileSystem
```

Removes the regular file or symbolic link at `path`. A link is removed itself, not what it
points to.

#### Errors

- `FileError` with reason `NotFound`, `WrongType` (for a directory), or another reason from
  the provider.

::Anchor{id="FileSystem.removeDirectory"}

### Operation `removeDirectory`

```silk
effect fn removeDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Removes the empty directory at `path`.

#### Errors

- `FileError` with reason `NotEmpty` if the directory has entries. To remove it with all of
  its contents, use [`FileSystem.removeDirectoryRecursively`](#FileSystem.impl.removeDirectoryRecursively).

::Anchor{id="FileSystem.createTemporaryDirectory"}

### Operation `createTemporaryDirectory`

```silk
effect fn createTemporaryDirectory(
    parent: &Path,
    prefix: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates a new directory in `parent` with a unique name that starts with `prefix`, and returns
its path.

#### Details

The provider chooses the rest of the name and creates the directory in one step, so no other
process can take the same name. Most code uses [`FileSystem.temporaryDirectory`](#FileSystem.impl.temporaryDirectory) instead.

#### Errors

- `FileError` if the provider cannot create the directory.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="FileSystem.impl"}

## Implementation `FileSystem`

```silk
impl FileSystem
```

::Anchor{id="FileSystem.impl.replaceExisting"}

### Associated function `replaceExisting`

```silk
pub fn replaceExisting() -> PublicationPolicy
```

Returns the policy that replaces an existing destination or creates a missing one.

::Anchor{id="FileSystem.impl.createNew"}

### Associated function `createNew`

```silk
pub fn createNew() -> PublicationPolicy
```

Returns the policy that fails with `AlreadyExists` if the destination exists.

::Anchor{id="FileSystem.impl.buffered"}

### Associated function `buffered`

```silk
pub fn buffered() -> Durability
```

Returns the durability that makes the new file visible atomically but does not synchronize it
to storage.

::Anchor{id="FileSystem.impl.synchronized"}

### Associated function `synchronized`

```silk
pub fn synchronized() -> Durability
```

Returns the durability that synchronizes the file before it becomes visible and the directory
after.

::Anchor{id="FileSystem.impl.file"}

### Associated function `file`

```silk
pub fn file() -> DirectoryEntryKind
```

Constructs the regular-file [`DirectoryEntryKind`](#DirectoryEntryKind).

::Anchor{id="FileSystem.impl.directory"}

### Associated function `directory`

```silk
pub fn directory() -> DirectoryEntryKind
```

Constructs the directory [`DirectoryEntryKind`](#DirectoryEntryKind).

::Anchor{id="FileSystem.impl.symbolicLink"}

### Associated function `symbolicLink`

```silk
pub fn symbolicLink() -> DirectoryEntryKind
```

Constructs the symbolic-link [`DirectoryEntryKind`](#DirectoryEntryKind). A listing reports a link itself, not
what it points to, so a walk of the tree does not follow it.

::Anchor{id="FileSystem.impl.entryKindCode"}

### Associated function `entryKindCode`

```silk
pub fn entryKindCode(kind: DirectoryEntryKind) -> i32
```

Returns the code of `kind`: 0 for a file, 1 for a directory, 2 for a symbolic link.

::Anchor{id="FileSystem.impl.fileInfo"}

### Associated function `fileInfo`

```silk
pub fn fileInfo(byteLength: usize) -> FileInfo
```

Returns [`FileInfo`](#FileInfo) for a file of `byteLength` bytes. Providers use it.

::Anchor{id="FileSystem.impl.directoryInfo"}

### Associated function `directoryInfo`

```silk
pub fn directoryInfo() -> DirectoryInfo
```

Returns [`DirectoryInfo`](#DirectoryInfo). Providers use it.

::Anchor{id="FileSystem.impl.directoryEntry"}

### Associated function `directoryEntry`

```silk
pub fn directoryEntry(path: Path, kind: DirectoryEntryKind) -> DirectoryEntry
```

Returns a [`DirectoryEntry`](#DirectoryEntry) that owns `path`. Providers use it.

::Anchor{id="FileSystem.impl.readFileOperation"}

### Associated function `readFileOperation`

```silk
pub fn readFileOperation() -> FileOperation
```

Selects the read-file operation.

::Anchor{id="FileSystem.impl.writeFileOperation"}

### Associated function `writeFileOperation`

```silk
pub fn writeFileOperation() -> FileOperation
```

Selects the write-file operation.

::Anchor{id="FileSystem.impl.statOperation"}

### Associated function `statOperation`

```silk
pub fn statOperation() -> FileOperation
```

Selects the stat operation.

::Anchor{id="FileSystem.impl.listDirectoryOperation"}

### Associated function `listDirectoryOperation`

```silk
pub fn listDirectoryOperation() -> FileOperation
```

Selects the list-directory operation.

::Anchor{id="FileSystem.impl.createDirectoryOperation"}

### Associated function `createDirectoryOperation`

```silk
pub fn createDirectoryOperation() -> FileOperation
```

Selects the create-directory operation.

::Anchor{id="FileSystem.impl.removeFileOperation"}

### Associated function `removeFileOperation`

```silk
pub fn removeFileOperation() -> FileOperation
```

Selects the remove-file operation.

::Anchor{id="FileSystem.impl.removeDirectoryOperation"}

### Associated function `removeDirectoryOperation`

```silk
pub fn removeDirectoryOperation() -> FileOperation
```

Selects the remove-directory operation.

::Anchor{id="FileSystem.impl.pathOperation"}

### Associated function `pathOperation`

```silk
pub fn pathOperation() -> FileOperation
```

Selects path construction and resolution.

::Anchor{id="FileSystem.impl.createTemporaryDirectoryOperation"}

### Associated function `createTemporaryDirectoryOperation`

```silk
pub fn createTemporaryDirectoryOperation() -> FileOperation
```

Selects the create-temporary-directory operation.

::Anchor{id="FileSystem.impl.createFileOperation"}

### Associated function `createFileOperation`

```silk
pub fn createFileOperation() -> FileOperation
```

Selects exclusive regular-file creation.

::Anchor{id="FileSystem.impl.writeFileAtomicOperation"}

### Associated function `writeFileAtomicOperation`

```silk
pub fn writeFileAtomicOperation() -> FileOperation
```

Selects atomic whole-file publication.

::Anchor{id="FileSystem.impl.syncFileOperation"}

### Associated function `syncFileOperation`

```silk
pub fn syncFileOperation() -> FileOperation
```

Selects synchronization of an owned file descriptor.

::Anchor{id="FileSystem.impl.syncDirectoryOperation"}

### Associated function `syncDirectoryOperation`

```silk
pub fn syncDirectoryOperation() -> FileOperation
```

Selects directory synchronization.

::Anchor{id="FileSystem.impl.operationCode"}

### Associated function `operationCode`

```silk
pub fn operationCode(operation: FileOperation) -> i32
```

Returns the code of `operation`.

::Anchor{id="FileSystem.impl.notFound"}

### Associated function `notFound`

```silk
pub fn notFound() -> FileReason
```

Constructs the `NotFound` recovery reason.

::Anchor{id="FileSystem.impl.alreadyExists"}

### Associated function `alreadyExists`

```silk
pub fn alreadyExists() -> FileReason
```

Constructs the `AlreadyExists` recovery reason.

::Anchor{id="FileSystem.impl.permissionDenied"}

### Associated function `permissionDenied`

```silk
pub fn permissionDenied() -> FileReason
```

Constructs the `PermissionDenied` recovery reason.

::Anchor{id="FileSystem.impl.invalidPath"}

### Associated function `invalidPath`

```silk
pub fn invalidPath() -> FileReason
```

Constructs the `InvalidPath` recovery reason.

::Anchor{id="FileSystem.impl.wrongType"}

### Associated function `wrongType`

```silk
pub fn wrongType() -> FileReason
```

Constructs the `WrongType` recovery reason.

::Anchor{id="FileSystem.impl.notEmpty"}

### Associated function `notEmpty`

```silk
pub fn notEmpty() -> FileReason
```

Constructs the `NotEmpty` recovery reason.

::Anchor{id="FileSystem.impl.noSpace"}

### Associated function `noSpace`

```silk
pub fn noSpace() -> FileReason
```

Constructs the `NoSpace` recovery reason.

::Anchor{id="FileSystem.impl.tooLarge"}

### Associated function `tooLarge`

```silk
pub fn tooLarge() -> FileReason
```

Constructs the `TooLarge` recovery reason.

::Anchor{id="FileSystem.impl.unsupported"}

### Associated function `unsupported`

```silk
pub fn unsupported() -> FileReason
```

Constructs the `Unsupported` recovery reason.

::Anchor{id="FileSystem.impl.other"}

### Associated function `other`

```silk
pub fn other() -> FileReason
```

Returns the `Other` reason, for a failure that has no portable reason.

::Anchor{id="FileSystem.impl.reasonCode"}

### Associated function `reasonCode`

```silk
pub fn reasonCode(reason: FileReason) -> i32
```

Returns the code of `reason`. Compare it with the code of a reason constructor, such as
`FileSystem.reasonCode(FileSystem.notFound())`.

::Anchor{id="FileSystem.impl.error"}

### Associated function `error`

```silk
pub fn error(operation: FileOperation, reason: FileReason) -> FileError
```

Returns a [`FileError`](#FileError) with no provider code. Providers use it.

::Anchor{id="FileSystem.impl.errorWithCode"}

### Associated function `errorWithCode`

```silk
pub fn errorWithCode(operation: FileOperation, reason: FileReason, code: i32) -> FileError
```

Returns a [`FileError`](#FileError) with a provider code, such as an `errno` value. Providers use it.

#### Details

The code is for diagnostics. Callers decide how to recover from `operation` and `reason`.

::Anchor{id="FileSystem.impl.providerCode"}

### Associated function `providerCode`

```silk
pub fn providerCode(error: &FileError) -> Option<i32>
```

Returns the provider code of `error`, if it has one.

::Anchor{id="FileSystem.impl.temporaryDirectory"}

### Associated function `temporaryDirectory`

```silk
pub effect fn temporaryDirectory(
    parent: &Path,
    prefix: string
  ) -> TemporaryDirectory ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates a new directory in `parent` with a unique name that starts with `prefix`, and returns
its owner.

#### Details

Nothing removes the directory until you call [`FileSystem.release`](#FileSystem.impl.release) or
[`FileSystem.releaseIgnored`](#FileSystem.impl.releaseIgnored). Dropping the owner does not remove it.

#### Errors

- `FileError` if the provider cannot create the directory.
- `OutOfMemoryError` if the `Allocator` cannot supply the path.

::Anchor{id="FileSystem.impl.release"}

### Method `release`

```silk
pub effect fn release(
    self: TemporaryDirectory
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Removes the temporary directory and everything in it.

#### When to use

Use `release` when you must know if the removal failed. Use [`FileSystem.releaseIgnored`](#FileSystem.impl.releaseIgnored) as a
finalizer with `Effect.ensuring`.

#### Errors

- `FileError` if a removal fails. Some files can be removed already.
- `OutOfMemoryError` if the `Allocator` cannot supply the storage for the walk.

#### Gotchas

`self` is consumed also when the removal fails. Copy the path first if you need it to report
the failure.

::Anchor{id="FileSystem.impl.releaseIgnored"}

### Method `releaseIgnored`

```silk
pub effect fn releaseIgnored(
    self: TemporaryDirectory
  ) -> () ? &mut FileSystem | &mut Allocator
```

Removes the temporary directory and everything in it, and ignores a failure.

#### When to use

Use it with `Effect.ensuring`, which needs a finalizer that cannot fail. Use
[`FileSystem.release`](#FileSystem.impl.release) when you must know if the removal failed.

#### Gotchas

The finalizer consumes the directory, so the protected code cannot borrow it. Get the paths
that the protected code needs before you pass the owner to the finalizer.

::Anchor{id="FileSystem.impl.removeDirectoryRecursively"}

### Associated function `removeDirectoryRecursively`

```silk
pub effect fn removeDirectoryRecursively(
    path: &Path
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Removes the directory at `path`, all files in it, and all directories in it.

#### Details

It removes the files first and then the directories, deepest first. It does not recurse, so a
deep tree uses list memory, not stack. A symbolic link in the tree is removed itself; what it
points to stays.

#### Errors

- `FileError` if a removal fails.
- `OutOfMemoryError` if the `Allocator` cannot supply the storage for the walk.

#### Gotchas

It is not a transaction. If it fails, the removals that completed stay completed, and the rest
of the tree stays.

::Anchor{id="FileSystem.impl.createDirectoriesRecursively"}

### Associated function `createDirectoriesRecursively`

```silk
pub effect fn createDirectoriesRecursively(
    path: &Path
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates the directory `path` and each missing parent. Existing directories are kept.

#### Errors

- `FileError` with reason `WrongType` if a component is a regular file, or another reason from
  the provider.

#### Gotchas

It checks and then creates each component. If another process changes the same directories at
the same time, the result depends on the provider.

::Anchor{id="FileSystem.impl.writeFileWithParents"}

### Associated function `writeFileWithParents`

```silk
pub effect fn writeFileWithParents(
    path: &Path,
    bytes: &[u8]
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates the missing parent directories of `path` and then writes `bytes` to it with
[`FileSystem.writeFile`](#FileSystem.writeFile).

#### Errors

- `FileError` from the directory creation or the write. For the root path, the write normally
  fails with `WrongType`.
- `OutOfMemoryError` if the `Allocator` cannot supply the parent paths.

#### Gotchas

It is not a transaction. If the write fails, the new parent directories stay.

::Anchor{id="FileSystem.impl.exists"}

### Associated function `exists`

```silk
pub effect fn exists(path: &Path) -> bool ! FileError ? &mut FileSystem
```

Returns `true` if a file or directory exists at `path`.

#### Errors

- `FileError` for each failure other than `NotFound`, such as `PermissionDenied`. So a path
  that you cannot access does not look like a missing path.

::Anchor{id="TemporaryDirectory"}

## `TemporaryDirectory`

```silk
pub struct TemporaryDirectory
```

A directory that you own, with everything in it. Make one with
[`FileSystem.temporaryDirectory`](#FileSystem.impl.temporaryDirectory).

### Details

Dropping it does not remove the directory, because removal can fail and needs the `FileSystem`
effect. Call [`FileSystem.release`](#FileSystem.impl.release) to remove it. To remove it when a computation ends in any
way, use `Effect.ensuring` with [`FileSystem.releaseIgnored`](#FileSystem.impl.releaseIgnored).

::Anchor{id="TemporaryDirectory.path"}

### Field `path`

```silk
pub path: Path
```

The path of the directory.

Category: System.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`.
