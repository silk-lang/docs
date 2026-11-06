A filesystem provider for absolute paths in the host machine namespace.

## When to use
Use `MachineFileSystem` in host tools that must access more than one directory. Unix paths use
`/...`; Windows paths use `/C:/...` or `/UNC/server/share/...`. This provider is not confined to
an application directory. Use `OsFileSystem` for a confined root instead.

Import as `MachineFileSystem` with `import silk.system.filesystem_machine { MachineFileSystem }`.

Public declarations: 1.

::Anchor{id="MachineFileSystem"}

## `MachineFileSystem`

```silk
pub struct MachineFileSystem
```

The native filesystem in the absolute machine namespace.

### Details

Unix paths retain their absolute spelling. Windows paths select a drive or UNC share, such as
`/C:/work/main.silk` or `/UNC/server/share/main.silk`; drive letters are case insensitive and
other bytes retain their case and canonical WTF-8 spelling. Windows requires NTFS. Relative
symbolic links resolve inside their drive or share; absolute links must name that root with
matching spelling except drive-letter case. Unknown reparse tags and other-root targets are
unsupported. Resolution stops after 40 links with `InvalidPath`. Remote atomic publication,
directory synchronization, and synchronized publication are unsupported; deletion requires the
server's POSIX disposition support. Ordinary UNC reads, writes, creation, and listing are
supported. The path `/` has no Windows volume and fails with `InvalidPath`. Each drive or share
retains its own temporary-name counter for the provider's lifetime.

::Anchor{id="MachineFileSystem.impl"}

## Implementation `MachineFileSystem`

```silk
impl MachineFileSystem
```

::Anchor{id="MachineFileSystem.impl.make"}

### Associated function `make`

```silk
pub effect fn make() -> MachineFileSystem ! OutOfMemoryError ? &mut Allocator
```

Creates a provider for the machine's absolute paths without opening any directories.

#### Errors

- `OutOfMemoryError` if the provider's roots cannot be allocated.

::Anchor{id="MachineFileSystem.impl.FileSystem"}

## Implementation `FileSystem for MachineFileSystem`

```silk
impl FileSystem for MachineFileSystem
```

::Anchor{id="MachineFileSystem.impl.FileSystem.readFile"}

### Operation `readFile`

```silk
readFile: MachineFileSystem.readFile
```

::Anchor{id="MachineFileSystem.impl.FileSystem.writeFile"}

### Operation `writeFile`

```silk
writeFile: MachineFileSystem.writeFile
```

::Anchor{id="MachineFileSystem.impl.FileSystem.createFile"}

### Operation `createFile`

```silk
createFile: MachineFileSystem.createFile
```

::Anchor{id="MachineFileSystem.impl.FileSystem.writeFileAtomic"}

### Operation `writeFileAtomic`

```silk
writeFileAtomic: MachineFileSystem.writeFileAtomic
```

::Anchor{id="MachineFileSystem.impl.FileSystem.syncDirectory"}

### Operation `syncDirectory`

```silk
syncDirectory: MachineFileSystem.syncDirectory
```

::Anchor{id="MachineFileSystem.impl.FileSystem.stat"}

### Operation `stat`

```silk
stat: MachineFileSystem.stat
```

::Anchor{id="MachineFileSystem.impl.FileSystem.listDirectory"}

### Operation `listDirectory`

```silk
listDirectory: MachineFileSystem.listDirectory
```

::Anchor{id="MachineFileSystem.impl.FileSystem.createDirectory"}

### Operation `createDirectory`

```silk
createDirectory: MachineFileSystem.createDirectory
```

::Anchor{id="MachineFileSystem.impl.FileSystem.removeFile"}

### Operation `removeFile`

```silk
removeFile: MachineFileSystem.removeFile
```

::Anchor{id="MachineFileSystem.impl.FileSystem.removeDirectory"}

### Operation `removeDirectory`

```silk
removeDirectory: MachineFileSystem.removeDirectory
```

::Anchor{id="MachineFileSystem.impl.FileSystem.createTemporaryDirectory"}

### Operation `createTemporaryDirectory`

```silk
createTemporaryDirectory: MachineFileSystem.createTemporaryDirectory
```

Category: System.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`.
