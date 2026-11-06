The native provider of the `SystemInfo` effect: facts about the computer and the process from
the C library and the kernel.

## When to use
Provide [`OsSystemInfo`](#OsSystemInfo) for `SystemInfo` in a native program. In a test, provide a fake with
fixed values.

## Details
Each operation makes a few system calls and returns: none of them waits for an event. On Linux,
the provider reads `/proc`, `/sys`, `uname`, `getifaddrs`, `getpwuid_r`, `getrusage`, and
`sched_getaffinity`. On macOS, it uses `sysctl`, the Mach host and task calls, `getifaddrs`,
`getpwuid_r`, and `getrusage`. Every list and copy that the system gives is freed before the
operation returns, also on errors.

## Gotchas
- The memory limit of a control group is read from cgroup v2 `memory.max` or cgroup v1
  `memory.limit_in_bytes`. Other limits, such as `ulimit`, are not reported.
- The provider exists on Darwin on x86_64 or aarch64, and on GNU Linux on x86_64 or aarch64.

## Examples
### Read the processors and the user
```silk
import silk.collections.bytes { Bytes }
import silk.collections.list { List }
import silk.core.effect { Effect }
import silk.core.result { Result }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.system.system_info { ProcessorInfo, SystemInfo, SystemInfoError }
import silk.system.system_info_native { OsSystemInfo }

effect fn program() -> i32 ! SystemInfoError | OutOfMemoryError ? &mut SystemInfo | &mut Allocator {
  let processors = run SystemInfo.processors()
  let parallelism = run SystemInfo.availableParallelism()
  if List<ProcessorInfo>.length(&processors) == 0 || parallelism == 0 {
    return 1
  }
  let user = run SystemInfo.currentUser()
  if Bytes.length(&user.name) == 0 {
    return 1
  }
  return 0
}

pub effect fn main() -> i32 {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut provider = OsSystemInfo.make()
  let result = run Effect.result(program()) |> Effect.provideMut<SystemInfo>(&mut provider)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return match move result {
    Result<i32, SystemInfoError | OutOfMemoryError>.Success { value } => value
    Result<i32, SystemInfoError | OutOfMemoryError>.Failure { .. } => 1
  }
}
```

Import as `OsSystemInfo` with `import silk.system.system_info_native { OsSystemInfo }`.

Public declarations: 1.

::Anchor{id="OsSystemInfo"}

## `OsSystemInfo`

```silk
pub struct OsSystemInfo
```

The native `SystemInfo` provider. It has no state.

### Details
On Linux, it reads `/proc`, `/sys`, `uname`, `getifaddrs`, `getpwuid_r`, `getrusage`, and
`sched_getaffinity`. On macOS, it uses `sysctl`, the Mach host and task calls, `getifaddrs`,
`getpwuid_r`, and `getrusage`. No operation waits for an event.

### Gotchas
- The memory limit of a control group is read from cgroup v2 `memory.max` or cgroup v1
  `memory.limit_in_bytes`. Other limits, such as `ulimit`, are not reported.
- The provider exists on Darwin on x86_64 or aarch64, and on GNU Linux on x86_64 or aarch64.

::Anchor{id="OsSystemInfo.impl"}

## Implementation `OsSystemInfo`

```silk
impl OsSystemInfo
```

::Anchor{id="OsSystemInfo.impl.make"}

### Associated function `make`

```silk
pub fn make() -> OsSystemInfo
```

Returns the provider. It makes no system call.

::Anchor{id="OsSystemInfo.impl.SystemInfo"}

## Implementation `SystemInfo for OsSystemInfo`

```silk
impl SystemInfo for OsSystemInfo
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.hostName"}

### Operation `hostName`

```silk
effect fn hostName(self: &mut Self) -> Bytes ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.kernel"}

### Operation `kernel`

```silk
effect fn kernel(self: &mut Self) -> KernelInfo ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.uptime"}

### Operation `uptime`

```silk
effect fn uptime(self: &mut Self) -> u64 ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.loadAverage"}

### Operation `loadAverage`

```silk
effect fn loadAverage(self: &mut Self) -> [f64; 3] ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.memory"}

### Operation `memory`

```silk
effect fn memory(self: &mut Self) -> MemoryInfo ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.processors"}

### Operation `processors`

```silk
effect fn processors(self: &mut Self) -> List<ProcessorInfo> ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.availableParallelism"}

### Operation `availableParallelism`

```silk
effect fn availableParallelism(self: &mut Self) -> usize ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.networkInterfaces"}

### Operation `networkInterfaces`

```silk
effect fn networkInterfaces(self: &mut Self) -> List<NetworkInterface> ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.currentUser"}

### Operation `currentUser`

```silk
effect fn currentUser(self: &mut Self) -> UserInfo ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.user"}

### Operation `user`

```silk
effect fn user(self: &mut Self, uid: u32) -> UserInfo ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.priority"}

### Operation `priority`

```silk
effect fn priority(self: &mut Self, pid: i32) -> i32 ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.setPriority"}

### Operation `setPriority`

```silk
effect fn setPriority(self: &mut Self, pid: i32, value: i32) -> () ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.resourceUsage"}

### Operation `resourceUsage`

```silk
effect fn resourceUsage(self: &mut Self, scope: UsageScope) -> ResourceUsage ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.residentSetSize"}

### Operation `residentSetSize`

```silk
effect fn residentSetSize(self: &mut Self) -> u64 ! SystemInfoError
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.executablePath"}

### Operation `executablePath`

```silk
effect fn executablePath(self: &mut Self) -> Bytes ! SystemInfoError | OutOfMemoryError ? &mut Allocator
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.processId"}

### Operation `processId`

```silk
effect fn processId(self: &mut Self) -> i32
```

::Anchor{id="OsSystemInfo.impl.SystemInfo.parentProcessId"}

### Operation `parentProcessId`

```silk
effect fn parentProcessId(self: &mut Self) -> i32
```

Category: System.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`.
