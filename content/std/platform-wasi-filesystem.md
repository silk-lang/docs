Descriptor-relative file operations within WASI preopened directories.

## When to use
`OsFileSystem` selects these operations on WASI. Applications use the portable `FileSystem` service.

## Details
Every path component is opened without symbolic-link traversal. The host enforces preopen rights.
Guest paths resolve against the longest matching preopen. A preopen named `.` represents `/`.
Errors retain WASI errno values. Internal allocation failures become `FileError` with reason `NoSpace`.

Import as `WasiFileSystem` with `import silk.platform.wasi.filesystem { WasiFileSystem }`.

Public declarations: 3.

::Anchor{id="FileHandle"}

## `FileHandle`

```silk
pub struct FileHandle
```

An owned WASI file descriptor. Drop closes it once.

::Anchor{id="DirectoryHandle"}

## `DirectoryHandle`

```silk
pub struct DirectoryHandle
```

An owned WASI directory descriptor and its iteration cookie. Drop closes it once.

::Anchor{id="WasiFileSystem"}

## `WasiFileSystem`

```silk
pub struct WasiFileSystem
```

WASI file operations rooted in a preopened guest directory.
Each path is normalized and remains below the root without symbolic-link traversal.

::Anchor{id="WasiFileSystem.impl"}

## Implementation `WasiFileSystem`

```silk
impl WasiFileSystem
```

::Anchor{id="WasiFileSystem.impl.openFile"}

### Associated function `openFile`

```silk
pub effect fn openFile(root: &[u8], path: &[u8], writing: bool, operation: i32) -> FileHandle
      ! FileError
```

Opens a regular file. A writable file is truncated after its type is checked.

::Anchor{id="WasiFileSystem.impl.createFile"}

### Associated function `createFile`

```silk
pub effect fn createFile(root: &[u8], path: &[u8], bytes: &[u8]) -> ()
      ! FileError
```

::Anchor{id="WasiFileSystem.impl.writeFileAtomic"}

### Associated function `writeFileAtomic`

```silk
pub effect fn writeFileAtomic(
      root: &[u8],
      path: &[u8],
      bytes: &[u8],
      policy: i32,
      durability: i32,
      counter: &mut u64
    ) -> ()
      ! AtomicWriteError
```

Writes `bytes` to a temporary file in the same directory, then makes it visible at `path` in
one step.

#### Details
`policy` 0 replaces with `renameat`. The path can be absent, a regular file, or a symbolic
link, which is replaced itself. A directory or another kind fails with `WrongType`. `policy` 1
creates with `linkat`, and fails with `AlreadyExists` if any entry exists.

The temporary name is created with `O_EXCL`. At most 128 names are tried. The temporary entry
is removed through the open directory, not by its path again.

`durability` 0 does not sync. `durability` 1 calls `fsync` on the file before it is visible,
then on the directory after. An unsupported policy or sync fails.

#### Errors
`AtomicWriteError` has the first error and whether the new contents are visible. A failed sync
or close of the directory reports that they are visible. A temporary entry that cannot be
removed is reported separately with its name.

::Anchor{id="WasiFileSystem.impl.syncDirectory"}

### Associated function `syncDirectory`

```silk
pub effect fn syncDirectory(root: &[u8], path: &[u8]) -> ()
      ! FileError
```

Calls `fsync` on the directory at `path`, then closes it.

If the file system does not support it (`EINVAL`, `ENOTSUP`, or `ENOSYS`), it fails with
`Unsupported` and the native code.

::Anchor{id="WasiFileSystem.impl.openDirectory"}

### Associated function `openDirectory`

```silk
pub effect fn openDirectory(root: &[u8], path: &[u8], operation: i32) -> DirectoryHandle
      ! FileError
```

Opens a directory for iteration. The returned handle owns the descriptor.

::Anchor{id="WasiFileSystem.impl.inspect"}

### Associated function `inspect`

```silk
pub effect fn inspect(
      root: &[u8],
      path: &[u8],
      outputKind: &mut i32,
      length: &mut usize,
      operation: i32
    ) -> ()
      ! FileError
```

Returns the entry kind and byte length without symbolic-link traversal.
Kinds other than a regular file or directory fail with `WrongType`.

::Anchor{id="WasiFileSystem.impl.command"}

### Associated function `command`

```silk
pub effect fn command(root: &[u8], path: &[u8], command: i32, operation: i32) -> ()
      ! FileError
```

Creates a directory (0), removes a file (1), or removes an empty directory (2).
The provider root cannot be removed. Symbolic links fail with `WrongType` on removal.

::Anchor{id="WasiFileSystem.impl.readFile"}

### Associated function `readFile`

```silk
pub effect fn readFile(handle: &mut FileHandle, output: &mut [u8], operation: i32) -> usize
      ! FileError
```

Reads into the start of `output` and returns the byte count. Zero means end of input.

::Anchor{id="WasiFileSystem.impl.writeFile"}

### Associated function `writeFile`

```silk
pub effect fn writeFile(handle: &mut FileHandle, input: &[u8], operation: i32) -> ()
      ! FileError
```

Writes all bytes. Failure can leave a partial write.

::Anchor{id="WasiFileSystem.impl.next"}

### Associated function `next`

```silk
pub effect fn next(
      handle: &mut DirectoryHandle,
      output: &mut [u8],
      count: &mut usize,
      required: &mut usize,
      outputKind: &mut i32,
      operation: i32
    ) -> bool
      ! FileError
```

Copies the next entry name. A zero count means the directory has ended.
If `output` is too small, returns false and retains the entry while reporting `required`.

::Anchor{id="WasiFileSystem.impl.createUnique"}

### Associated function `createUnique`

```silk
pub effect fn createUnique(
      root: &[u8],
      path: &[u8],
      prefix: &[u8],
      counter: &mut u64,
      output: &mut [u8],
      count: &mut usize,
      required: &mut usize,
      operation: i32
    ) -> bool
      ! FileError
```

Creates a directory in `path` named `prefix`, `-`, and 16 hex digits of `counter`, and returns
true. It tries at most 128 names. If the name does not fit in `output`, it returns false and
writes the needed size to `required`.

::Anchor{id="WasiFileSystem.impl.closeFile"}

### Associated function `closeFile`

```silk
pub effect fn closeFile(value: FileHandle, operation: FileOperation) -> ()
      ! FileError
```

Closes the file once and reports a close failure.

::Anchor{id="WasiFileSystem.impl.closeDirectory"}

### Associated function `closeDirectory`

```silk
pub effect fn closeDirectory(value: DirectoryHandle, operation: FileOperation) -> ()
      ! FileError
```

Closes the directory once and reports a close failure.

Category: Native platform.

Profiles: `wasm32-wasip1`, `wasm32-wasip2`.
