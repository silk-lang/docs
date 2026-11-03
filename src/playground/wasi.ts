// A WASI preview 1 host for the playground, with an in-memory file system.
//
// The Silk compiler runs on it as a wasm32-wasip1 command, and so do the
// programs it builds. The file system holds a single tree rooted at `/`, which
// is also the one preopened directory, so absolute paths work the same way as
// under `wasmtime --dir /`.

export type FileNode = {
  readonly kind: 'file'
  data: Uint8Array
  size: number
  modified: bigint
}

export type DirectoryNode = {
  readonly kind: 'directory'
  readonly entries: Map<string, FsNode>
  modified: bigint
}

export type FsNode = FileNode | DirectoryNode

const now = (): bigint => BigInt(Date.now()) * 1_000_000n

export const directory = (): DirectoryNode => ({
  kind: 'directory',
  entries: new Map(),
  modified: now(),
})

export const file = (data: Uint8Array): FileNode => ({
  kind: 'file',
  data,
  size: data.length,
  modified: now(),
})

const splitPath = (path: string): ReadonlyArray<string> =>
  path.split('/').filter(part => part !== '' && part !== '.')

// Adds `data` at the absolute or root-relative `path`, creating directories on
// the way. A file shared between file systems is copied on its first write.
export const writeFile = (
  root: DirectoryNode,
  path: string,
  data: Uint8Array,
): void => {
  const parts = splitPath(path)
  const name = parts.at(-1)
  if (name === undefined) {
    return
  }
  const parent = parts.slice(0, -1).reduce<DirectoryNode>((at, part) => {
    const existing = at.entries.get(part)
    if (existing !== undefined && existing.kind === 'directory') {
      return existing
    }
    const created = directory()
    at.entries.set(part, created)
    return created
  }, root)
  parent.entries.set(name, file(data))
}

export const readFile = (
  root: DirectoryNode,
  path: string,
): Uint8Array | undefined => {
  const node = lookup(root, splitPath(path))
  return node !== undefined && node.kind === 'file'
    ? node.data.subarray(0, node.size)
    : undefined
}

// A copy of the tree whose directories are new and whose files are shared until
// one of them is written. Each compile gets one, so the standard library loads
// once.
export const fork = (node: DirectoryNode): DirectoryNode => ({
  kind: 'directory',
  modified: node.modified,
  entries: new Map(
    [...node.entries].map(([name, child]) => [
      name,
      child.kind === 'directory' ? fork(child) : { ...child },
    ]),
  ),
})

const lookup = (
  from: DirectoryNode,
  parts: ReadonlyArray<string>,
): FsNode | undefined =>
  parts.reduce<FsNode | undefined>(
    (at, part) =>
      at === undefined || at.kind !== 'directory'
        ? undefined
        : at.entries.get(part),
    from,
  )

// Error numbers from the WASI preview 1 specification.
const SUCCESS = 0
const BADF = 8
const EXIST = 20
const INVAL = 28
const ISDIR = 31
const NOENT = 44
const NOSYS = 52
const NOTDIR = 54
const NOTEMPTY = 55

const FILETYPE_CHARACTER_DEVICE = 2
const FILETYPE_DIRECTORY = 3
const FILETYPE_REGULAR_FILE = 4

const OPEN_CREATE = 1
const OPEN_DIRECTORY = 2
const OPEN_EXCLUSIVE = 4
const OPEN_TRUNCATE = 8
const FD_APPEND = 1

// Thrown by `proc_exit` to unwind out of the running module.
export class Exit {
  readonly code: number
  constructor(code: number) {
    this.code = code
  }
}

type Descriptor = {
  readonly node: FsNode
  position: number
  readonly append: boolean
}

export type WasiOptions = Readonly<{
  args: ReadonlyArray<string>
  root: DirectoryNode
  stdout: (bytes: Uint8Array) => void
  stderr: (bytes: Uint8Array) => void
  // Fills a prefix of `into` from standard input and answers how many bytes
  // it wrote, 0 at the end of the input. It may block. Without it, standard
  // input is empty.
  stdin?: (into: Uint8Array) => number
}>

export type Wasi = Readonly<{
  imports: WebAssembly.ModuleImports
  bind: (memory: WebAssembly.Memory) => void
}>

const ROOT_FD = 3

export const makeWasi = (options: WasiOptions): Wasi => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const descriptors = new Map<number, Descriptor>([
    [ROOT_FD, { node: options.root, position: 0, append: false }],
  ])
  const memoryRef: { current: WebAssembly.Memory | undefined } = {
    current: undefined,
  }
  const nextFd = { current: ROOT_FD + 1 }

  const memory = (): WebAssembly.Memory => {
    if (memoryRef.current === undefined) {
      throw new Error('the module has no memory bound')
    }
    return memoryRef.current
  }
  const view = () => new DataView(memory().buffer)
  const bytes = (address: number, length: number) =>
    new Uint8Array(memory().buffer, address, length)
  const text = (address: number, length: number) =>
    decoder.decode(bytes(address, length).slice())

  const args = options.args.map(arg => encoder.encode(`${arg}\0`))

  const directoryAt = (fd: number): DirectoryNode | number => {
    const descriptor = descriptors.get(fd)
    if (descriptor === undefined) {
      return BADF
    }
    return descriptor.node.kind === 'directory' ? descriptor.node : NOTDIR
  }

  // Splits `path` under `fd` into its parent directory and final name, walking
  // `..` within the tree.
  const resolveParent = (
    fd: number,
    path: string,
  ): Readonly<{ parent: DirectoryNode; name: string }> | number => {
    const start = path.startsWith('/') ? options.root : directoryAt(fd)
    if (typeof start === 'number') {
      return start
    }
    const parts = splitPath(path)
    const stack: Array<DirectoryNode> = [start]
    const names = parts.slice(0, -1)
    for (const part of names) {
      if (part === '..') {
        if (stack.length > 1) {
          stack.pop()
        }
        continue
      }
      const top = stack.at(-1)
      const next = top?.entries.get(part)
      if (next === undefined) {
        return NOENT
      }
      if (next.kind !== 'directory') {
        return NOTDIR
      }
      stack.push(next)
    }
    const parent = stack.at(-1)
    const name = parts.at(-1) ?? '.'
    if (parent === undefined) {
      return NOENT
    }
    if (name === '..') {
      return { parent: stack.at(-2) ?? parent, name: '.' }
    }
    return { parent, name }
  }

  const resolve = (fd: number, path: string): FsNode | number => {
    const located = resolveParent(fd, path)
    if (typeof located === 'number') {
      return located
    }
    if (located.name === '.') {
      return located.parent
    }
    return located.parent.entries.get(located.name) ?? NOENT
  }

  const writeStat = (address: number, node: FsNode | 'device'): void => {
    const data = view()
    data.setBigUint64(address, 0n, true)
    data.setBigUint64(address + 8, 0n, true)
    data.setUint8(
      address + 16,
      node === 'device'
        ? FILETYPE_CHARACTER_DEVICE
        : node.kind === 'directory'
          ? FILETYPE_DIRECTORY
          : FILETYPE_REGULAR_FILE,
    )
    data.setBigUint64(address + 24, 1n, true)
    data.setBigUint64(
      address + 32,
      node !== 'device' && node.kind === 'file' ? BigInt(node.size) : 0n,
      true,
    )
    const modified = node === 'device' ? 0n : node.modified
    data.setBigUint64(address + 40, modified, true)
    data.setBigUint64(address + 48, modified, true)
    data.setBigUint64(address + 56, modified, true)
  }

  const ensureCapacity = (node: FileNode, size: number): void => {
    if (size <= node.data.length) {
      // A forked file still shares its bytes with the original.
      return
    }
    const grown = new Uint8Array(Math.max(size, node.data.length * 2, 64))
    grown.set(node.data.subarray(0, node.size))
    node.data = grown
  }

  // Files start out shared with the file system they were forked from, so the
  // first write copies them.
  const owned = new WeakSet<Uint8Array>()
  const own = (node: FileNode): void => {
    if (!owned.has(node.data)) {
      node.data = node.data.slice(0, Math.max(node.size, 64))
      owned.add(node.data)
    }
  }

  const writeTo = (descriptor: Descriptor, chunk: Uint8Array): void => {
    const node = descriptor.node
    if (node.kind !== 'file') {
      return
    }
    own(node)
    const at = descriptor.append ? node.size : descriptor.position
    ensureCapacity(node, at + chunk.length)
    owned.add(node.data)
    node.data.set(chunk, at)
    node.size = Math.max(node.size, at + chunk.length)
    node.modified = now()
    descriptor.position = at + chunk.length
  }

  const iovecs = (
    address: number,
    count: number,
  ): ReadonlyArray<Readonly<{ base: number; length: number }>> =>
    Array.from({ length: count }, (_, index) => ({
      base: view().getUint32(address + index * 8, true),
      length: view().getUint32(address + index * 8 + 4, true),
    }))

  const calls: Record<string, (...values: Array<never>) => number | void> = {
    args_sizes_get: (countAddress: number, sizeAddress: number) => {
      view().setUint32(countAddress, args.length, true)
      view().setUint32(
        sizeAddress,
        args.reduce((sum, arg) => sum + arg.length, 0),
        true,
      )
      return SUCCESS
    },
    args_get: (pointers: number, buffer: number) => {
      args.reduce((at, arg, index) => {
        view().setUint32(pointers + index * 4, at, true)
        bytes(at, arg.length).set(arg)
        return at + arg.length
      }, buffer)
      return SUCCESS
    },
    environ_sizes_get: (countAddress: number, sizeAddress: number) => {
      view().setUint32(countAddress, 0, true)
      view().setUint32(sizeAddress, 0, true)
      return SUCCESS
    },
    environ_get: () => SUCCESS,
    fd_prestat_get: (fd: number, address: number) => {
      if (fd !== ROOT_FD) {
        return BADF
      }
      view().setUint8(address, 0)
      view().setUint32(address + 4, 1, true)
      return SUCCESS
    },
    fd_prestat_dir_name: (fd: number, address: number, length: number) => {
      if (fd !== ROOT_FD || length < 1) {
        return BADF
      }
      view().setUint8(address, 47)
      return SUCCESS
    },
    fd_fdstat_get: (fd: number, address: number) => {
      const descriptor = descriptors.get(fd)
      if (fd > 2 && descriptor === undefined) {
        return BADF
      }
      const data = view()
      data.setUint8(
        address,
        descriptor === undefined
          ? FILETYPE_CHARACTER_DEVICE
          : descriptor.node.kind === 'directory'
            ? FILETYPE_DIRECTORY
            : FILETYPE_REGULAR_FILE,
      )
      data.setUint16(address + 2, descriptor?.append ? FD_APPEND : 0, true)
      data.setBigUint64(address + 8, 0xffff_ffff_ffff_ffffn, true)
      data.setBigUint64(address + 16, 0xffff_ffff_ffff_ffffn, true)
      return SUCCESS
    },
    fd_filestat_get: (fd: number, address: number) => {
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        if (fd <= 2) {
          writeStat(address, 'device')
          return SUCCESS
        }
        return BADF
      }
      writeStat(address, descriptor.node)
      return SUCCESS
    },
    fd_filestat_set_size: (fd: number, size: bigint) => {
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        return BADF
      }
      const node = descriptor.node
      if (node.kind !== 'file') {
        return ISDIR
      }
      own(node)
      const length = Number(size)
      ensureCapacity(node, length)
      owned.add(node.data)
      node.data.fill(0, node.size, length)
      node.size = length
      node.modified = now()
      return SUCCESS
    },
    fd_write: (
      fd: number,
      vectors: number,
      count: number,
      writtenAddress: number,
    ) => {
      const chunks = iovecs(vectors, count).map(({ base, length }) =>
        bytes(base, length).slice(),
      )
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      if (fd === 1 || fd === 2) {
        const sink = fd === 1 ? options.stdout : options.stderr
        chunks.forEach(chunk => sink(chunk))
      } else {
        const descriptor = descriptors.get(fd)
        if (descriptor === undefined) {
          return BADF
        }
        if (descriptor.node.kind !== 'file') {
          return ISDIR
        }
        chunks.forEach(chunk => writeTo(descriptor, chunk))
      }
      view().setUint32(writtenAddress, total, true)
      return SUCCESS
    },
    fd_read: (
      fd: number,
      vectors: number,
      count: number,
      readAddress: number,
    ) => {
      if (fd === 0) {
        const read = options.stdin
        // One vector at a time, so a read never waits for more input once it
        // has some.
        const first = iovecs(vectors, count).find(({ length }) => length > 0)
        const total =
          read === undefined || first === undefined
            ? 0
            : read(bytes(first.base, first.length))
        view().setUint32(readAddress, total, true)
        return SUCCESS
      }
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        return BADF
      }
      const node = descriptor.node
      if (node.kind !== 'file') {
        return ISDIR
      }
      const total = iovecs(vectors, count).reduce((sum, { base, length }) => {
        const available = Math.max(
          0,
          Math.min(length, node.size - descriptor.position),
        )
        bytes(base, available).set(
          node.data.subarray(
            descriptor.position,
            descriptor.position + available,
          ),
        )
        descriptor.position += available
        return sum + available
      }, 0)
      view().setUint32(readAddress, total, true)
      return SUCCESS
    },
    fd_seek: (
      fd: number,
      offset: bigint,
      whence: number,
      resultAddress: number,
    ) => {
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        return BADF
      }
      const size = descriptor.node.kind === 'file' ? descriptor.node.size : 0
      const base = whence === 0 ? 0 : whence === 1 ? descriptor.position : size
      const position = base + Number(offset)
      if (position < 0) {
        return INVAL
      }
      descriptor.position = position
      view().setBigUint64(resultAddress, BigInt(position), true)
      return SUCCESS
    },
    fd_tell: (fd: number, resultAddress: number) => {
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        return BADF
      }
      view().setBigUint64(resultAddress, BigInt(descriptor.position), true)
      return SUCCESS
    },
    fd_close: (fd: number) => {
      if (fd === ROOT_FD) {
        return SUCCESS
      }
      return descriptors.delete(fd) || fd <= 2 ? SUCCESS : BADF
    },
    fd_sync: () => SUCCESS,
    fd_datasync: () => SUCCESS,
    fd_readdir: (
      fd: number,
      buffer: number,
      length: number,
      cookie: bigint,
      usedAddress: number,
    ) => {
      const descriptor = descriptors.get(fd)
      if (descriptor === undefined) {
        return BADF
      }
      const node = descriptor.node
      if (node.kind !== 'directory') {
        return NOTDIR
      }
      const entries = [...node.entries].slice(Number(cookie))
      const out = bytes(buffer, length)
      const used = entries.reduce((at, [name, child], index) => {
        if (at >= length) {
          return at
        }
        const encoded = encoder.encode(name)
        const record = new Uint8Array(24 + encoded.length)
        const data = new DataView(record.buffer)
        data.setBigUint64(0, cookie + BigInt(index + 1), true)
        data.setBigUint64(8, 0n, true)
        data.setUint32(16, encoded.length, true)
        data.setUint8(
          20,
          child.kind === 'directory'
            ? FILETYPE_DIRECTORY
            : FILETYPE_REGULAR_FILE,
        )
        record.set(encoded, 24)
        const fits = Math.min(record.length, length - at)
        out.set(record.subarray(0, fits), at)
        return at + fits
      }, 0)
      view().setUint32(usedAddress, used, true)
      return SUCCESS
    },
    path_open: (
      fd: number,
      _lookupFlags: number,
      pathAddress: number,
      pathLength: number,
      openFlags: number,
      _rightsBase: bigint,
      _rightsInheriting: bigint,
      fdFlags: number,
      resultAddress: number,
    ) => {
      const located = resolveParent(fd, text(pathAddress, pathLength))
      if (typeof located === 'number') {
        return located
      }
      const { parent, name } = located
      const existing = name === '.' ? parent : parent.entries.get(name)
      if (existing !== undefined && (openFlags & OPEN_EXCLUSIVE) !== 0) {
        return EXIST
      }
      const node: FsNode | undefined =
        existing ??
        ((openFlags & OPEN_CREATE) !== 0 ? file(new Uint8Array()) : undefined)
      if (node === undefined) {
        return NOENT
      }
      if ((openFlags & OPEN_DIRECTORY) !== 0 && node.kind !== 'directory') {
        return NOTDIR
      }
      if (existing === undefined) {
        parent.entries.set(name, node)
      }
      if ((openFlags & OPEN_TRUNCATE) !== 0 && node.kind === 'file') {
        node.size = 0
        node.modified = now()
      }
      const handle = nextFd.current
      nextFd.current += 1
      descriptors.set(handle, {
        node,
        position: 0,
        append: (fdFlags & FD_APPEND) !== 0,
      })
      view().setUint32(resultAddress, handle, true)
      return SUCCESS
    },
    path_filestat_get: (
      fd: number,
      _flags: number,
      pathAddress: number,
      pathLength: number,
      address: number,
    ) => {
      const node = resolve(fd, text(pathAddress, pathLength))
      if (typeof node === 'number') {
        return node
      }
      writeStat(address, node)
      return SUCCESS
    },
    path_filestat_set_times: () => SUCCESS,
    path_create_directory: (
      fd: number,
      pathAddress: number,
      pathLength: number,
    ) => {
      const located = resolveParent(fd, text(pathAddress, pathLength))
      if (typeof located === 'number') {
        return located
      }
      if (located.name === '.' || located.parent.entries.has(located.name)) {
        return EXIST
      }
      located.parent.entries.set(located.name, directory())
      return SUCCESS
    },
    path_unlink_file: (fd: number, pathAddress: number, pathLength: number) => {
      const located = resolveParent(fd, text(pathAddress, pathLength))
      if (typeof located === 'number') {
        return located
      }
      const node = located.parent.entries.get(located.name)
      if (node === undefined) {
        return NOENT
      }
      if (node.kind === 'directory') {
        return ISDIR
      }
      located.parent.entries.delete(located.name)
      return SUCCESS
    },
    path_remove_directory: (
      fd: number,
      pathAddress: number,
      pathLength: number,
    ) => {
      const located = resolveParent(fd, text(pathAddress, pathLength))
      if (typeof located === 'number') {
        return located
      }
      const node = located.parent.entries.get(located.name)
      if (node === undefined) {
        return NOENT
      }
      if (node.kind !== 'directory') {
        return NOTDIR
      }
      if (node.entries.size > 0) {
        return NOTEMPTY
      }
      located.parent.entries.delete(located.name)
      return SUCCESS
    },
    path_rename: (
      fd: number,
      oldAddress: number,
      oldLength: number,
      newFd: number,
      newAddress: number,
      newLength: number,
    ) => {
      const from = resolveParent(fd, text(oldAddress, oldLength))
      const to = resolveParent(newFd, text(newAddress, newLength))
      if (typeof from === 'number') {
        return from
      }
      if (typeof to === 'number') {
        return to
      }
      const node = from.parent.entries.get(from.name)
      if (node === undefined) {
        return NOENT
      }
      from.parent.entries.delete(from.name)
      to.parent.entries.set(to.name, node)
      return SUCCESS
    },
    path_link: (
      fd: number,
      _flags: number,
      oldAddress: number,
      oldLength: number,
      newFd: number,
      newAddress: number,
      newLength: number,
    ) => {
      const node = resolve(fd, text(oldAddress, oldLength))
      const to = resolveParent(newFd, text(newAddress, newLength))
      if (typeof node === 'number') {
        return node
      }
      if (typeof to === 'number') {
        return to
      }
      if (to.parent.entries.has(to.name)) {
        return EXIST
      }
      to.parent.entries.set(to.name, node)
      return SUCCESS
    },
    clock_time_get: (id: number, _precision: bigint, address: number) => {
      const time =
        id === 0 ? now() : BigInt(Math.round(performance.now() * 1_000_000))
      view().setBigUint64(address, time, true)
      return SUCCESS
    },
    clock_res_get: (_id: number, address: number) => {
      view().setBigUint64(address, 1000n, true)
      return SUCCESS
    },
    random_get: (address: number, length: number) => {
      const target = bytes(address, length)
      // getRandomValues fills at most 65536 bytes per call.
      for (let at = 0; at < length; at += 65536) {
        crypto.getRandomValues(target.subarray(at, at + 65536))
      }
      return SUCCESS
    },
    sched_yield: () => SUCCESS,
    proc_exit: (code: number) => {
      throw new Exit(code)
    },
  }

  // Calls the playground does not provide fail with ENOSYS instead of failing
  // to instantiate, so a program only stops when it actually makes one.
  const imports = new Proxy(calls, {
    get: (target, name) =>
      typeof name === 'string' && name in target ? target[name] : () => NOSYS,
  })

  return {
    imports,
    bind: memoryValue => {
      memoryRef.current = memoryValue
    },
  }
}
