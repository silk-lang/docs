Portable normalized paths, whole-file operations, directory traversal, and explicit temp scopes.

## When to use
Build provider-absolute [`Path`](#Path) values with [`make`](#Path.impl.make) or [`fromBytes`](#Path.impl.fromBytes), then run operations
through a supplied [`FileSystem`](#FileSystem). Use [`rawBytes`](#Path.impl.rawBytes) for platform values that must round-trip even
when they are not UTF-8, and [`resolve`](#Path.impl.resolve) for lexical relative-path resolution.

## Details
Paths are absolute and normalized: they reject NUL, empty components, trailing separators, and
embedded `.` or `..`. Resolution handles relative dot components but rejects escape above root.
Directory listings return independently owned child paths in deterministic path-byte order.
Portable [`FileError`](#FileError) data names both the operation and a closed recovery reason, with an
optional provider code for diagnostics.

Temporary directories have an explicit lifecycle because removal can fail and needs services.
Use [`release`](#FileSystem.impl.release) when cleanup failure matters, or [`releaseIgnored`](#FileSystem.impl.releaseIgnored) as an infallible finalizer
only after deliberately accepting that loss.

## Gotchas
A path created from arbitrary bytes may not have a valid text view. Keep using [`rawBytes`](#Path.impl.rawBytes) unless
the bytes were validated as UTF-8; [`view`](#Path.impl.view) and [`name`](#Path.impl.name) rely on that caller knowledge.

## Examples
### Construct and inspect a portable path
```silk
import silk.allocator { Allocator, OutOfMemoryError }

import silk.effect { Effect }

import silk.filesystem { FileSystem, FileError, Path }

import silk.option { Option }

effect fn example() -> i32
! FileError | OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let path = run Path.make("/workspace")
    |> Effect.provideMut(&mut allocator)
  if let Option<string>.Some {value: name} = move Path.name(&path) {
    if name == "workspace" { return 42 }
  }
  return 0
}

effect fn recover(error: FileError | OutOfMemoryError) -> i32 {
  return 0
}

pub fn main() -> i32 {
  return run Effect.catchAll(example(), recover)
}
```

Import as `FileSystem` with `import silk.filesystem { FileSystem }`.

Public declarations: 13.

::Anchor{id="Path"}

## `Path`

```silk
pub struct Path
```

An owned, normalized absolute path in a [`FileSystem`](#FileSystem) provider's portable namespace.

### Details

Portable `/` means the selected provider's root, not necessarily the host operating system's
root. Construct paths through [`make`](#Path.impl.make), [`fromBytes`](#Path.impl.fromBytes), [`root`](#Path.impl.root), [`join`](#Path.impl.join), or [`resolve`](#Path.impl.resolve); the
representation is private so every `Path` satisfies the normalization rules.

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

Copies UTF-8 text into an owned, normalized provider-absolute [`Path`](#Path).

#### Details

The text must begin with `/`. Root is valid; every other path must have nonempty components and
no trailing slash, NUL, `.` component, or `..` component. Invalid input fails with
`FileError(FileSystem.pathOperation(), FileSystem.invalidPath())`; copying can fail with [`OutOfMemoryError`](/docs/std/allocator#OutOfMemoryError).

::Anchor{id="Path.impl.fromBytes"}

### Associated function `fromBytes`

```silk
pub effect fn fromBytes(values: &[u8]) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Constructs an owned normalized provider-absolute Path from exact platform bytes.

#### Details

Platform paths are byte sequences, and a caller that received one from the platform — a
directory entry, an argument, an environment value — must be able to hand it back unchanged.
The same normalization applies as for textual construction: the value is absolute, rejects NUL,
and rejects `.`, `..`, empty components, and trailing separators. Well-formed text is not
required, so a Path built this way may have no `string` view.

::Anchor{id="Path.impl.root"}

### Associated function `root`

```silk
pub effect fn root() -> Path ! OutOfMemoryError ? &mut Allocator
```

Allocates the portable root path `/` in the selected allocator.

::Anchor{id="Path.impl.rawBytes"}

### Method `rawBytes`

```silk
pub fn rawBytes(self: &Self) -> &[u8]
```

Borrows the complete normalized path as exact platform bytes.

#### Details

This is the lossless view. It round-trips a Path built from platform bytes even when those
bytes are not well-formed text, which the `string` view cannot promise.

::Anchor{id="Path.impl.view"}

### Method `view`

```silk
pub fn view(self: &Self) -> Option<string>
```

Borrows the complete path as text, or answers `None` when its bytes are not valid UTF-8.

#### Details

Paths from [`make`](#Path.impl.make), [`join`](#Path.impl.join), [`joinUtf8`](#Path.impl.joinUtf8), and [`resolve`](#Path.impl.resolve) are always valid UTF-8. A path
created with [`fromBytes`](#Path.impl.fromBytes) or [`joinBytes`](#Path.impl.joinBytes) may not be; [`rawBytes`](#Path.impl.rawBytes) is the lossless view.

::Anchor{id="Path.impl.isRoot"}

### Method `isRoot`

```silk
pub fn isRoot(self: &Self) -> bool
```

Returns `true` exactly when this path is the portable root `/`.

::Anchor{id="Path.impl.name"}

### Method `name`

```silk
pub fn name(self: &Self) -> Option<string>
```

Borrows the final component as text, or answers `None` when its bytes are not valid UTF-8.

#### Details

Root answers empty text. The component never includes a separator, and borrowing it does not
allocate.

::Anchor{id="Path.impl.join"}

### Associated function `join`

```silk
pub effect fn join(
    base: &Path,
    fragment: string
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Appends one normalized relative text fragment to an absolute base path.

#### Details

`fragment` must be nonempty and relative, with no NUL, empty, `.`, or `..` component and no
trailing slash. Use [`resolve`](#Path.impl.resolve) when dot components should be interpreted instead of rejected.

::Anchor{id="Path.impl.joinUtf8"}

### Associated function `joinUtf8`

```silk
pub effect fn joinUtf8(
    base: &Path,
    fragment: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Validates UTF-8 bytes as one normalized relative fragment and appends them to `base`.

#### Details

This is useful for a child name returned as bytes by another portable API. Invalid UTF-8 and the
same malformed components rejected by [`join`](#Path.impl.join) fail with the `InvalidPath` reason.

::Anchor{id="Path.impl.joinBytes"}

### Associated function `joinBytes`

```silk
pub effect fn joinBytes(
    base: &Path,
    fragment: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Appends one normalized relative byte fragment while preserving non-UTF-8 names.

#### Details

The fragment must be nonempty and contain no NUL, empty, dot or dot-dot component.
This is the byte-preserving operation for native directory names; use [`joinUtf8`](#Path.impl.joinUtf8)
when the caller also requires valid UTF-8.

::Anchor{id="Path.impl.resolve"}

### Associated function `resolve`

```silk
pub effect fn resolve(
    base: &Path,
    relativeText: string
  ) -> Path ! FileError | OutOfMemoryError ? &mut Allocator
```

Resolves relative text lexically against an explicit absolute base.

#### Details

Empty text and `.` keep the base; `..` removes components; ordinary components append. An
absolute relative value, an empty interior component, NUL, or any attempt to escape above root
fails with the `InvalidPath` reason. Resolution is lexical and never accesses the filesystem.

::Anchor{id="Path.impl.parent"}

### Method `parent`

```silk
pub effect fn parent(
    self: &Self
  ) -> Option<Path> ! OutOfMemoryError ? &mut Allocator
```

Allocates an independently owned parent path, or [`None`](/docs/std/option#Option.None) when `self` is root.

#### Details

The result does not borrow `self`. A direct child of root has root as its parent.

::Anchor{id="FileInfo"}

## `FileInfo`

```silk
pub struct FileInfo
```

Minimal portable metadata for one regular file.

::Anchor{id="FileInfo.byteLength"}

### Field `byteLength`

```silk
pub byteLength: usize
```

Complete file length in bytes.

::Anchor{id="DirectoryInfo"}

## `DirectoryInfo`

```silk
pub struct DirectoryInfo
```

Portable metadata identifying a directory; no platform-specific fields are exposed.

::Anchor{id="DirectoryEntryKind"}

## `DirectoryEntryKind`

```silk
pub struct DirectoryEntryKind
```

The closed portable kind of one directory entry.

::Anchor{id="DirectoryEntryKind.code"}

### Field `code`

```silk
pub code: i32
```

Stable portable kind code selected by [`file`](#FileSystem.impl.file) or [`directory`](#FileSystem.impl.directory).

::Anchor{id="DirectoryEntry"}

## `DirectoryEntry`

```silk
pub struct DirectoryEntry
```

One immediate directory child with an independently owned complete [`Path`](#Path).

::Anchor{id="DirectoryEntry.path"}

### Field `path`

```silk
pub path: Path
```

Independently owned complete path to the child.

::Anchor{id="DirectoryEntry.kind"}

### Field `kind`

```silk
pub kind: DirectoryEntryKind
```

Portable kind reported for the child.

::Anchor{id="FileOperation"}

## `FileOperation`

```silk
pub struct FileOperation
```

The stable portable operation category stored in a [`FileError`](#FileError).

::Anchor{id="FileOperation.code"}

### Field `code`

```silk
pub code: i32
```

Stable code identifying the attempted portable operation.

::Anchor{id="FileReason"}

## `FileReason`

```silk
pub struct FileReason
```

A stable portable recovery category stored in a [`FileError`](#FileError).

::Anchor{id="FileReason.code"}

### Field `code`

```silk
pub code: i32
```

Stable code identifying the portable recovery reason.

::Anchor{id="FileError"}

## `FileError`

```silk
pub struct FileError
```

An allocation-free portable failure naming the attempted operation and recovery reason.

### Details

Match or compare [`operationCode`](#FileSystem.impl.operationCode) and [`reasonCode`](#FileSystem.impl.reasonCode) for portable recovery. [`providerCode`](#FileSystem.impl.providerCode)
may retain an OS or provider-specific numeric detail for diagnostics, but portable decisions
must not depend on it.

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

The portable reason callers can recover by.

::Anchor{id="PublicationPolicy"}

## `PublicationPolicy`

```silk
pub struct PublicationPolicy
```

Destination policy for atomic whole-file publication.

### Details

Construct with [`FileSystem.replaceExisting`](#FileSystem.impl.replaceExisting) or [`FileSystem.createNew`](#FileSystem.impl.createNew).

::Anchor{id="PublicationPolicy.code"}

### Field `code`

```silk
pub code: i32
```

`0` replaces a destination entry; `1` claims only an absent entry.

::Anchor{id="Durability"}

## `Durability`

```silk
pub struct Durability
```

Explicit synchronization policy for atomic publication.

### Details

Construct with [`FileSystem.buffered`](#FileSystem.impl.buffered) or [`FileSystem.synchronized`](#FileSystem.impl.synchronized).

::Anchor{id="Durability.code"}

### Field `code`

```silk
pub code: i32
```

`0` requests no synchronization; `1` synchronizes the file before and parent after publication.

::Anchor{id="AtomicWriteError"}

## `AtomicWriteError`

```silk
pub struct AtomicWriteError
```

An atomic write failure that retains whether its namespace publication succeeded.

### Details

`published == false` means this operation did not change the destination. `true` means the
complete new file became visible, but a later synchronization, cleanup, or close failed.
Never blindly retry a published operation, particularly with create-new policy.

::Anchor{id="AtomicWriteError.published"}

### Field `published`

```silk
pub published: bool
```

Whether this operation successfully published its complete new contents.

::Anchor{id="AtomicWriteError.cause"}

### Field `cause`

```silk
pub cause: FileError
```

Primary failure, including its operation, portable reason, and available native code.

::Anchor{id="AtomicWriteError.cleanupError"}

### Field `cleanupError`

```silk
pub cleanupError: Option<FileError>
```

Secondary staging cleanup failure, without replacing the primary failure.

::Anchor{id="AtomicWriteError.stagingName"}

### Field `stagingName`

```silk
pub stagingName: Bytes
```

Exact temporary leaf name left in the destination directory if cleanup failed; empty otherwise.

::Anchor{id="FileSystem"}

## `FileSystem`

```silk
pub service FileSystem
```

Portable mutable service for normalized paths and whole-file operations.

### Details

Application code supplies one provider lexically with `Effect.provideMut`; tests can implement
this service in memory, while native applications can use `silk.os_filesystem`. The service owns
platform policy, but every implementation must preserve the portable error categories,
create-or-truncate writes, and deterministic listing order described here.

[`writeFileWithParents`](#FileSystem.impl.writeFileWithParents) composes parent creation and the final write using the same lexical
provider. Supply both `&mut FileSystem` and `&mut Allocator` for this operation. Its directory
creation is not transactional: a failed final write may leave newly created parents behind.

::Anchor{id="FileSystem.readFile"}

### Operation `readFile`

```silk
effect fn readFile(
    path: &Path
  ) -> Bytes ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Reads one complete regular file into independently owned bytes.

#### Details

Reading a directory fails with `WrongType`. Allocation of the returned [`Bytes`](/docs/std/bytes#Bytes) may fail
independently of the provider read.

::Anchor{id="FileSystem.writeFile"}

### Operation `writeFile`

```silk
effect fn writeFile(path: &Path, bytes: &[u8]) -> () ! FileError ? &mut FileSystem
```

Writes one complete byte view with create-or-truncate semantics.

#### Details

A missing file is created; an existing regular file is replaced by exactly `bytes`. The call
does not create missing parent directories—use [`writeFileWithParents`](#FileSystem.impl.writeFileWithParents) for that workflow.

::Anchor{id="FileSystem.createFile"}

### Operation `createFile`

```silk
effect fn createFile(path: &Path, bytes: &[u8]) -> () ! FileError ? &mut FileSystem
```

Exclusively creates a regular file and writes its contents without replacing any existing entry.

#### Details

Existing files, directories, and symlink entries fail with `AlreadyExists`, without following
or modifying them. The claim is atomic, but readers can observe incomplete contents while the
write proceeds. A write or close failure after creation leaves the new, possibly partial file
in place. Use `FileSystem.writeFileAtomic` with [`createNew`](#FileSystem.impl.createNew) for complete-content publication instead.

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

Publishes complete contents with one atomic destination namespace change.

#### Details

The provider exclusively stages a regular file in the destination directory. Replace policy
replaces a regular file or creates an absent name; native providers may replace a symlink
entry itself, never its referent. Directories and other unsupported kinds fail with `WrongType`.
Create-new policy refuses every existing entry with `AlreadyExists` using an atomic no-replace
operation, not an existence check. Concurrent readers opening the destination see complete
old or new contents, with no replacement-induced missing-name interval.

Synchronized publication synchronizes the owned staged file before publication and the
containing directory afterward. This is normal filesystem synchronization, not a guarantee
that hardware caches survive power loss. Providers unable to supply the requested semantics
fail with `Unsupported`; they never downgrade to an ordinary write.

Native publication creates a new inode with mode `0666` filtered by the process umask and
normal filesystem inheritance. It does not preserve the old inode's mode, ownership, ACLs,
extended attributes, or hard-link identity; existing hard links still name the old inode.
A failed pre-publication operation leaves the destination unchanged. Cleanup is attempted
and residual staging names are retained in [`AtomicWriteError`](#AtomicWriteError).
Atomic publication is one-file visibility, not a transaction across paths.

::Anchor{id="FileSystem.syncDirectory"}

### Operation `syncDirectory`

```silk
effect fn syncDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Synchronizes one existing directory so callers can order durable namespace updates.

#### Details

Native providers synchronize an owned no-follow directory descriptor. After creating or
removing an entry, synchronize its parent directory; after creating a directory, synchronize
its parent as well as any contents whose durability is required. Unsupported providers return
`Unsupported`. This operation alone does not synchronize ordinary file contents.

::Anchor{id="FileSystem.stat"}

### Operation `stat`

```silk
effect fn stat(path: &Path) -> FileInfo | DirectoryInfo ! FileError ? &mut FileSystem
```

Returns [`FileInfo`](#FileInfo) or [`DirectoryInfo`](#DirectoryInfo) for the path without opening file contents.

#### Details

Missing paths fail with `NotFound`; providers use `WrongType` only when an operation requires a
particular kind, not for this discriminating query.

::Anchor{id="FileSystem.listDirectory"}

### Operation `listDirectory`

```silk
effect fn listDirectory(
    path: &Path
  ) -> List<DirectoryEntry> ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Returns immediate owned children in deterministic complete-path byte order.

#### Details

The result is not recursive. Each `DirectoryEntry.path` is independently owned and may be
retained after the listing list is released.

::Anchor{id="FileSystem.createDirectory"}

### Operation `createDirectory`

```silk
effect fn createDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Creates exactly one missing directory whose parent already exists.

#### Details

Existing paths fail with `AlreadyExists`; use [`createDirectoriesRecursively`](#FileSystem.impl.createDirectoriesRecursively) to ensure every
missing component.

::Anchor{id="FileSystem.removeFile"}

### Operation `removeFile`

```silk
effect fn removeFile(path: &Path) -> () ! FileError ? &mut FileSystem
```

Removes exactly one regular file and fails with `WrongType` for a directory.

::Anchor{id="FileSystem.removeDirectory"}

### Operation `removeDirectory`

```silk
effect fn removeDirectory(path: &Path) -> () ! FileError ? &mut FileSystem
```

Removes exactly one empty directory.

#### Details

A nonempty directory fails with `NotEmpty`; use [`removeDirectoryRecursively`](#FileSystem.impl.removeDirectoryRecursively) only when all
descendants are intentionally in scope for removal.

::Anchor{id="FileSystem.createTemporaryDirectory"}

### Operation `createTemporaryDirectory`

```silk
effect fn createTemporaryDirectory(
    parent: &Path,
    prefix: &[u8]
  ) -> Path ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates one directory under an existing parent under a name no other caller holds.

#### Details

The provider chooses the name's unique part and returns the complete Path, because only the
provider can create and claim a name in one step. A caller that supplied the name would have
to check-then-create, and the gap between those two is exactly the race this avoids.
`prefix` is a byte prefix for the provider-chosen child name, not a complete path. The returned
directory already exists and is an immediate child of `parent`.

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

Selects atomic replacement or creation of an absent destination.

::Anchor{id="FileSystem.impl.createNew"}

### Associated function `createNew`

```silk
pub fn createNew() -> PublicationPolicy
```

Selects atomic publication only when no destination entry exists.

::Anchor{id="FileSystem.impl.buffered"}

### Associated function `buffered`

```silk
pub fn buffered() -> Durability
```

Requests atomic visibility without explicit filesystem synchronization.

::Anchor{id="FileSystem.impl.synchronized"}

### Associated function `synchronized`

```silk
pub fn synchronized() -> Durability
```

Requests file synchronization before publication and parent synchronization afterward.

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

::Anchor{id="FileSystem.impl.entryKindCode"}

### Associated function `entryKindCode`

```silk
pub fn entryKindCode(kind: DirectoryEntryKind) -> i32
```

Returns the stable code for a consumed [`DirectoryEntryKind`](#DirectoryEntryKind): `0` for file, `1` for directory.

::Anchor{id="FileSystem.impl.fileInfo"}

### Associated function `fileInfo`

```silk
pub fn fileInfo(byteLength: usize) -> FileInfo
```

Constructs regular-file metadata with the complete length in bytes.

::Anchor{id="FileSystem.impl.directoryInfo"}

### Associated function `directoryInfo`

```silk
pub fn directoryInfo() -> DirectoryInfo
```

Constructs the fieldless portable directory metadata value.

::Anchor{id="FileSystem.impl.directoryEntry"}

### Associated function `directoryEntry`

```silk
pub fn directoryEntry(path: Path, kind: DirectoryEntryKind) -> DirectoryEntry
```

Constructs a directory entry by taking ownership of its complete child `path` and `kind`.

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

Returns the stable numeric code of a consumed [`FileOperation`](#FileOperation).

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

Constructs the catch-all `Other` recovery reason.

::Anchor{id="FileSystem.impl.reasonCode"}

### Associated function `reasonCode`

```silk
pub fn reasonCode(reason: FileReason) -> i32
```

Returns the stable numeric code of a consumed [`FileReason`](#FileReason).

::Anchor{id="FileSystem.impl.error"}

### Associated function `error`

```silk
pub fn error(operation: FileOperation, reason: FileReason) -> FileError
```

Constructs a portable [`FileError`](#FileError) without a provider-specific numeric detail.

::Anchor{id="FileSystem.impl.errorWithCode"}

### Associated function `errorWithCode`

```silk
pub fn errorWithCode(operation: FileOperation, reason: FileReason, code: i32) -> FileError
```

Constructs a portable [`FileError`](#FileError) while retaining one provider-specific diagnostic code.

#### Details

The numeric `code` is opaque outside that provider. The portable `operation` and `reason` remain
the fields callers should use for recovery.

::Anchor{id="FileSystem.impl.providerCode"}

### Associated function `providerCode`

```silk
pub fn providerCode(error: &FileError) -> Option<i32>
```

Borrows an error and returns its provider-specific numeric detail, if one was retained.

::Anchor{id="FileSystem.impl.temporaryDirectory"}

### Associated function `temporaryDirectory`

```silk
pub effect fn temporaryDirectory(
    parent: &Path,
    prefix: string
  ) -> TemporaryDirectory ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Creates an explicitly owned temporary directory under `parent` with a name beginning in `prefix`.

#### Details

The result is owned. Nothing removes it until a caller runs [`release`](#FileSystem.impl.release) or [`releaseIgnored`](#FileSystem.impl.releaseIgnored).
The prefix is encoded as UTF-8 and the provider chooses and claims the remaining unique name in
one operation.

::Anchor{id="FileSystem.impl.release"}

### Method `release`

```silk
pub effect fn release(
    self: TemporaryDirectory
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Consumes one TemporaryDirectory and removes it together with everything inside it.

#### Details

Both rows are stated rather than hidden. Removal reaches the provider, so it can fail; walking the
tree to find what to remove allocates, so it can exhaust memory. A caller that must observe a
failed cleanup uses this operation and handles the failure. The owner is consumed even when
removal fails, so copy any diagnostic path information needed before calling.

::Anchor{id="FileSystem.impl.releaseIgnored"}

### Method `releaseIgnored`

```silk
pub effect fn releaseIgnored(
    self: TemporaryDirectory
  ) -> () ? &mut FileSystem | &mut Allocator
```

Consumes one TemporaryDirectory, removes it, and discards a failed removal.

#### Details

This exists because `Effect.ensuring` types its finalizer `! never`, so a fallible release has
to be recovered before it can be a finalizer. The recovery is deliberate and it is named: a
caller reading `releaseIgnored` at the call site can see that a failed removal is being
dropped, which a hook doing the same thing invisibly could not show. What is lost is bounded —
a directory the host will reap — and what is kept is the protected Effect's own outcome, which
is the answer the program was computing.

A caller who needs the failure uses `release` instead and does not compose it with `ensuring`.

The finalizer consumes the directory. The protected Effect cannot borrow it when the finalizer
starts. Derive the required paths before you give the owner to the finalizer.

::Anchor{id="FileSystem.impl.removeDirectoryRecursively"}

### Associated function `removeDirectoryRecursively`

```silk
pub effect fn removeDirectoryRecursively(
    path: &Path
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Removes a directory, every descendant file, and every descendant directory.

#### Details

Two passes, because the portable primitive removes exactly one *empty* directory. The first
pass walks the tree front to back, unlinking every file it meets and recording every directory
it meets; the second removes the recorded directories back to front. That order is
child-before-parent for free: a directory is always recorded before the children found inside
it, so reversing the record reverses the containment. Neither pass recurses, so depth costs
list capacity rather than stack.

This operation is destructive and not transactional. If a provider or allocation failure occurs,
removals already completed remain completed and the remaining tree is left in place.

::Anchor{id="FileSystem.impl.createDirectoriesRecursively"}

### Associated function `createDirectoriesRecursively`

```silk
pub effect fn createDirectoriesRecursively(
    path: &Path
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Ensures that `path` and every missing ancestor exist as directories.

#### Details

Existing directories are kept. An existing regular file at any component fails with
`WrongType`; failures other than `NotFound` propagate. This is ordinary stat-then-create
composition, so concurrent namespace changes may still race according to provider policy.

::Anchor{id="FileSystem.impl.writeFileWithParents"}

### Associated function `writeFileWithParents`

```silk
pub effect fn writeFileWithParents(
    path: &Path,
    bytes: &[u8]
  ) -> () ! FileError | OutOfMemoryError ? &mut FileSystem | &mut Allocator
```

Ensures every parent directory exists, then writes the complete byte view to `path`.

#### Details

The final write uses `FileSystem.writeFile` create-or-truncate semantics. Passing root delegates
directly to the provider and normally fails with `WrongType`. Directory creation and writing are
not transactional, so a later failure may leave newly created parents behind.

::Anchor{id="FileSystem.impl.exists"}

### Associated function `exists`

```silk
pub effect fn exists(path: &Path) -> bool ! FileError ? &mut FileSystem
```

Returns whether a file or directory exists at `path`.

#### Details

Only the portable `NotFound` reason becomes `false`. Permission, I/O, and every other provider
failure propagate so callers cannot mistake an inaccessible path for an absent one.

::Anchor{id="TemporaryDirectory"}

## `TemporaryDirectory`

```silk
pub struct TemporaryDirectory
```

A directory a caller owns outright, together with everything written inside it.

### Details

Ownership is affine: `TemporaryDirectory` holds an owned `Path`, so exactly one binding holds
it and the compiler rejects a second use of a moved one. Ownership is not, however, a `Drop`
hook. Removing a directory is a fallible operation that requires the `FileSystem` capability,
and a `Drop` hook may carry neither a failure row nor a requirement row, so a hook here could
only be written by inventing an infallible intrinsic over a fallible syscall. Release is
therefore explicit and honest about both rows — see `release`.

Scope ownership comes from composition rather than from a hook: `Effect.ensuring(release)`
runs the release whatever the protected Effect's outcome. Because `ensuring` types its
finalizer `! never`, that composition has to say what a failed removal means; `releaseIgnored`
is the stdlib's answer and names the loss at the call site.

::Anchor{id="TemporaryDirectory.path"}

### Field `path`

```silk
pub path: Path
```

The complete owned path callers use while the scope remains live.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
