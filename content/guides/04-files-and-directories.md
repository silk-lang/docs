# Files and directories

This guide builds `notes`, a command-line notebook that keeps one file per note in a `notes` directory. It reads and writes whole files, lists a directory, saves new notes atomically so a crash never leaves half a note, and reports file errors in plain words. Its test runs the real program against a temporary directory that is removed afterwards, even when the test fails.

```sh
silk init notes
cd notes
```

## The service and the provider

All file access goes through the `FileSystem` service from `silk/filesystem`. Code that touches files says `? &mut FileSystem` and works with `Path` values. The native provider, `OsFileSystem` from `silk/os_filesystem`, is made with a root directory:

```silk
  let here = run HostInput.workingDirectory() |> Effect.provideMut<Allocator>(&mut allocator)
  let mut files = run OsFileSystem.make(here.asSlice()) |> Effect.provideMut<Allocator>(&mut allocator)
```

Inside the provider, `/` means that root, not the host's `/`. So `/notes/groceries.txt` is `notes/groceries.txt` under the directory you run the program from. The provider refuses paths that would leave the root, including through symbolic links. That makes the root a boundary you choose once in `main`, and the rest of the program cannot reach past it.

`OsFileSystem.make` needs an absolute, non-empty native path and traps on anything else. It does no I/O; nothing is opened until the first operation. The native provider exists on Linux and macOS with libc. On other targets you supply a provider of your own.

## Paths

A `Path` is always absolute and normalized: no empty components, no `.` or `..`, no trailing `/`, no NUL byte. You build one from text and extend it:

```silk
// Every note lives in this directory, inside the provider's root.
const NOTES: string = "/notes"

// The file that holds one note: /notes/<name>.txt
effect fn notePath(name: string) -> Path ! FileError | OutOfMemoryError ? &mut Allocator {
  let directory = run Path.make(NOTES)
  let mut file = run String.copy(name)
  run file.append(".txt")
  return run Path.join(&directory, String.view(&file))
}
```

`Path.make` and `Path.join` allocate, and they fail with a `FileError` whose reason is "invalid path" when the text breaks the rules. `join` takes a relative fragment and rejects `..`, which is exactly what you want for a name the user typed. `Path.resolve` interprets `.` and `..` instead, and still refuses to climb above `/`.

Other `Path` functions: `root()`, `parent()`, `name()` (the last component), `view()` (the whole path as text) and `rawBytes()`. Paths from the host are bytes and may not be UTF-8. `view` and `name` return an `Option<string>`, and `rawBytes` always works.

## Reading and writing whole files

The `FileSystem` operations work on whole files. There is no open file handle.

| Operation | Does | When the file exists |
| --- | --- | --- |
| `readFile(path)` | Returns the contents as `Bytes` | Reads it |
| `writeFile(path, bytes)` | Creates or truncates, then writes | Replaces it in place |
| `createFile(path, bytes)` | Creates and writes | Fails with "already exists" |
| `writeFileAtomic(path, bytes, policy, durability)` | Writes a staged copy, then publishes it in one step | Depends on the policy |

A plain `writeFile` that fails halfway can leave a partial file. `writeFileAtomic` writes the bytes to a temporary file in the same directory and then renames or links it into place. Readers see the old contents or the new ones, never a mix.

`show` reads a note and checks it is text:

```silk
// Prints one note.
effect fn show(name: string) -> ()
! BadText | FileError | OutOfMemoryError | LogError
? &mut FileSystem | &mut Allocator | &mut Logger {
  let path = run notePath(name)
  let bytes = run FileSystem.readFile(&path)
  let text = match String.fromUtf8(bytes.asSlice()) {
    Result.Success { value } => value
    Result.Failure { .. } => {
      fail BadText {}
    }
  }
  run Effect.log("{text}\n", &.{ text: text })
}
```

`readFile` allocates the `Bytes` it returns, so it needs the allocator as well as the file system.

## Atomic writes and durability

`add` saves a new note. A note should never be overwritten by accident, so it uses the create-new policy:

```silk
// Saves a new note. The file appears complete or not at all.
effect fn add(name: string, text: string) -> ()
! AtomicWriteError | FileError | OutOfMemoryError | LogError
? &mut FileSystem | &mut Allocator | &mut Logger {
  let directory = run Path.make(NOTES)
  run FileSystem.createDirectoriesRecursively(&directory)
  let path = run notePath(name)
  run FileSystem.writeFileAtomic(&path, String.utf8Bytes(text), FileSystem.createNew(), FileSystem.synchronized())
  run Effect.log("saved {name}\n", &.{ name: name })
}
```

The two extra arguments of `writeFileAtomic`:

| Argument | Value | Meaning |
| --- | --- | --- |
| policy | `FileSystem.replaceExisting()` | Replace the file if it exists |
| policy | `FileSystem.createNew()` | Fail with "already exists" if any entry has that name. The check and the create are one step, so two processes can't both win. |
| durability | `FileSystem.buffered()` | Publish and return; the OS writes to disk later |
| durability | `FileSystem.synchronized()` | Sync the new file before publishing it and the directory after |

Use `synchronized` when losing the write after a crash would matter, such as a save file or a database. It is ordinary filesystem sync, not a promise about hardware caches. A provider that can't give the requested guarantee fails with "unsupported"; it never quietly downgrades.

An atomic write fails with `AtomicWriteError`, not `FileError`. It tells you more:

- `cause` is the underlying `FileError`.
- `published` says whether the new contents had already become visible when the failure happened, for example when the final directory sync failed.
- `cleanupError` and `stagingName` report a staged temporary file that could not be removed.

Atomic replacement creates a new file. It does not keep the old file's permissions, owner or hard links.

`FileSystem.createDirectoriesRecursively` makes `/notes` and any missing parent, and leaves existing directories alone. `FileSystem.writeFileWithParents` does the same for a plain write.

## Listing a directory

```silk
// Lists every note with its size.
effect fn list() -> ()
! FileError | OutOfMemoryError | LogError
? &mut FileSystem | &mut Allocator | &mut Logger {
  let directory = run Path.make(NOTES)
  if !run FileSystem.exists(&directory) {
    run Effect.log("no notes yet\n", &())
    return ()
  }
  let entries = run FileSystem.listDirectory(&directory)
  let all = entries.asSlice()
  let mut index: usize = 0
  while index < all.length {
    let path = &all[index].path
    let size = match run FileSystem.stat(path) {
      FileInfo info => info.byteLength
      DirectoryInfo _ => 0
    }
    let name = match path.name() {
      Option.Some { value } => value
      Option.None => "?"
    }
    run Effect.log("{name}  {size} bytes\n", &.{ name: name, size: size })
    index = index + 1
  }
}
```

`listDirectory` returns a `List<DirectoryEntry>` of the immediate children, sorted by path bytes, so the order is the same on every run and every platform. Each entry has an owned `path` and a `kind` (`FileSystem.file()` or `FileSystem.directory()`).

`stat` returns `FileInfo | DirectoryInfo`, a union you match on by type. `FileInfo` has the `byteLength`. `FileSystem.exists` is a helper over `stat` that turns "not found" into `false`.

The remaining operations are one-liners. `remove` deletes one note:

```silk
// Deletes one note.
effect fn remove(name: string) -> ()
! FileError | OutOfMemoryError | LogError
? &mut FileSystem | &mut Allocator | &mut Logger {
  let path = run notePath(name)
  run FileSystem.removeFile(&path)
  run Effect.log("removed {name}\n", &.{ name: name })
}
```

`createDirectory` and `removeDirectory` handle one directory, and `removeDirectory` fails with "not empty" if it has children. `FileSystem.removeDirectoryRecursively` removes a whole tree. It is not transactional: if it fails partway, what it removed stays removed.

## File errors

A `FileError` names two things: the `operation` that failed and the `reason`. Both are small structs with a `code`. You compare a code with the constructor for the case you care about:

```silk
fn reasonText(reason: &FileReason) -> string<'static> {
  let code = reason.code
  if code == FileSystem.reasonCode(FileSystem.notFound()) {
    return "not found"
  }
  if code == FileSystem.reasonCode(FileSystem.alreadyExists()) {
    return "already exists"
  }
  if code == FileSystem.reasonCode(FileSystem.permissionDenied()) {
    return "permission denied"
  }
  if code == FileSystem.reasonCode(FileSystem.invalidPath()) {
    return "invalid path"
  }
  if code == FileSystem.reasonCode(FileSystem.wrongType()) {
    return "wrong type"
  }
  return "other error"
}
```

The reasons are `notFound`, `alreadyExists`, `permissionDenied`, `invalidPath`, `wrongType`, `notEmpty`, `noSpace`, `tooLarge`, `unsupported` and `other`. They are the same on every provider, so code can recover from them portably. `FileSystem.providerCode(&error)` returns the native error number when there is one, for logs. `operationText` is the same idea for the operation: `readFileOperation()`, `removeFileOperation()`, `pathOperation()` and so on.

The reason and operation are not `Copy`, so the helpers take them by reference. `FileSystem.reasonCode(problem.reason)` would move the reason out of the error and is OWN0003.

## Wiring it up

`execute` picks the command from the arguments, and `explain` turns each failure into a message and an exit status:

```silk
effect fn execute(args: &[Bytes]) -> i32
! UsageError | BadText | AtomicWriteError | FileError | OutOfMemoryError | LogError
? &mut FileSystem | &mut Allocator | &mut Logger {
  let command = word(args, 1)
  let name = word(args, 2)
  if command == "list" {
    run list()
  } else if command == "add" && name != "" {
    run add(name, word(args, 3))
  } else if command == "show" && name != "" {
    run show(name)
  } else if command == "remove" && name != "" {
    run remove(name)
  } else {
    fail UsageError {}
  }
  return 0
}

// Turns each failure into a message and an exit status.
effect fn explain(failure: UsageError | BadText | AtomicWriteError | FileError | OutOfMemoryError | LogError) -> i32
! LogError | OutOfMemoryError ? &mut Logger {
  match move failure {
    UsageError {} => {
      run Effect.log("usage: notes list | add <name> <text> | show <name> | remove <name>\n", &())
      return 2
    }
    BadText {} => {
      run Effect.log("that note is not valid UTF-8\n", &())
      return 1
    }
    AtomicWriteError problem => {
      run Effect.log("could not save: {reason}\n", &.{ reason: reasonText(&problem.cause.reason) })
      return 1
    }
    FileError problem => {
      run Effect.log("{operation} failed: {reason}\n", &.{
        operation: operationText(&problem.operation),
        reason: reasonText(&problem.reason),
      })
      return 1
    }
    OutOfMemoryError held => {
      fail move held
    }
    LogError held => {
      fail move held
    }
  }
}

pub effect fn main() -> i32 ! LogError | HostInputError | OutOfMemoryError ? &mut HostInput {
  let mut allocator = Allocator.systemAllocatorProvider()
  let args = run HostInput.arguments() |> Effect.provideMut<Allocator>(&mut allocator)
  let here = run HostInput.workingDirectory() |> Effect.provideMut<Allocator>(&mut allocator)
  let mut files = run OsFileSystem.make(here.asSlice()) |> Effect.provideMut<Allocator>(&mut allocator)
  let mut logger = StdoutLogger.make()
  let handled = Effect.catchAll(execute(args.asSlice()), explain)
  return run move handled
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<Allocator>(&mut allocator)
    |> Effect.provideMut<Logger>(&mut logger)
}
```

`word(args, i)` returns argument `i` as a `string`, or `""` if it is missing or not UTF-8. `HostInput.arguments()` copies all arguments into a `List<Bytes>`.

`Effect.catchAll` hands every failure of `execute` to `explain`, including `LogError`, so `explain` must accept all six. Leave `LogError` out of its parameter and the check stops at the handler:

```
Checking notes (x86_64-unknown-linux-gnu)
  load     57 modules, 1 in package          0.07s
  check    failed: 2 modules, 1 error        0.93s
[x86_64-unknown-linux-gnu]
/home/you/notes/src/main.silk:190:58: error[SEM0067] An `Effect.catch` handler that does not fit the failures it handles
Failed notes in 1.00s
```

Column 58 is `explain`. The message does not say which failure is missing when the parameter is a union, so compare the handler's parameter with the effect's `!` row. The two must also agree on the result type: `execute` returns `i32` like `explain`. With `execute` returning `()`, the `run` in `main` fails with SEM0040, "A union conversion whose source has members its target lacks", because the result would be `() | i32`.

The imports:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.bytes { Bytes }
import silk.effect { Effect }
import silk.filesystem { AtomicWriteError, DirectoryInfo, FileError, FileInfo, FileOperation, FileReason, FileSystem, Path, TemporaryDirectory }
import silk.host_input { HostInput, HostInputError }
import silk.list { List }
import silk.logger { Logger, LogError }
import silk.option { Option }
import silk.os_filesystem { OsFileSystem }
import silk.os_logger { StdoutLogger }
import silk.result { Result }
import silk.string { String }
import silk.testing { AssertionError, Testing }
```

## Run it

Build, then run the binary from an empty directory. Below, `notes` stands for `./build/llvm/x86_64-unknown-linux-gnu/debug/notes`.

```sh
silk build
notes list
notes add groceries milk,eggs,bread
notes add ideas write-the-files-guide
notes list
notes show groceries
```

```
no notes yet
saved groceries
saved ideas
groceries.txt  15 bytes
ideas.txt  21 bytes
milk,eggs,bread
```

Now the failures. Each exits with status 1, and the usage message with 2:

```sh
notes add groceries again
notes show nothing
notes remove ideas
notes remove ideas
notes add ../escape x
notes frobnicate
```

```
could not save: already exists
read failed: not found
removed ideas
remove failed: not found
path failed: invalid path
usage: notes list | add <name> <text> | show <name> | remove <name>
```

`../escape` never reaches the disk. `Path.join` rejects it while building the path.

## Temporary directories in a test

The std lib has no in-memory `FileSystem`. For a test you can write a fake provider, as chapter 8 of the book does and the guide "Testing with providers" shows in full. Or you can run the real provider inside a temporary directory, which is what this test does.

`FileSystem.temporaryDirectory(parent, prefix)` creates a fresh directory whose name starts with the prefix. The provider picks the rest of the name and creates it in one step, so no other process can claim it. The result is a `TemporaryDirectory`, an owned value. Nothing removes the directory until you give it to `FileSystem.release` or `FileSystem.releaseIgnored`.

```silk
// The native root of a temporary directory made by a provider rooted at /tmp.
effect fn nativeRoot(scratch: &TemporaryDirectory) -> Bytes ! OutOfMemoryError ? &mut Allocator {
  let mut root = run Bytes.copy(b"/tmp")
  run root.append(scratch.path.rawBytes())
  return move root
}

test effect fn addRefusesToOverwrite() ! AssertionError<'static> | FileError | OutOfMemoryError | LogError {
  let mut allocator = Allocator.systemAllocatorProvider()
  let mut tmp = run OsFileSystem.make(b"/tmp") |> Effect.provideMut<Allocator>(&mut allocator)
  let top = run Path.root() |> Effect.provideMut<Allocator>(&mut allocator)
  let scratch = run FileSystem.temporaryDirectory(&top, "notes-test-")
    |> Effect.provideMut<FileSystem>(&mut tmp)
    |> Effect.provideMut<Allocator>(&mut allocator)
  let root = run nativeRoot(&scratch) |> Effect.provideMut<Allocator>(&mut allocator)
  run Effect.ensuring(scenario(root.asSlice()), FileSystem.releaseIgnored(move scratch))
    |> Effect.provideMut<FileSystem>(&mut tmp)
    |> Effect.provideMut<Allocator>(&mut allocator)
}
```

Two providers are in play. `tmp` is rooted at `/tmp` and owns the temporary directory. `scenario` makes a second `OsFileSystem` rooted inside it, so the program's `/notes` lands in the scratch directory.

`Effect.ensuring(body, finalizer)` runs the finalizer after the body, whether the body succeeded or failed. A finalizer may not fail, which is why it is `releaseIgnored`: it removes the tree and drops any error from the removal. Use `release` instead when a failed cleanup must be reported, and handle its failure yourself. The finalizer consumes the `TemporaryDirectory`, so compute everything you need from it, here the native root, before the call.

`scenario` runs `add` twice and checks the result:

```silk
// Runs the program twice inside `root`, a real directory on disk.
effect fn scenario(root: &[u8]) -> ()
! AssertionError<'static> | FileError | OutOfMemoryError | LogError
? &mut Allocator {
  let mut files = run OsFileSystem.make(root)
  let mut logger = Logger.inMemoryProvider()

  let first = run argv(b"add", b"groceries", b"milk")
  let saved = run Effect.result(execute(first.asSlice()))
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<Logger>(&mut logger)
  let added = match move saved {
    Result.Success { .. } => true
    Result.Failure { .. } => false
  }
  run Testing.expect(added, "the first add succeeds")

  let second = run argv(b"add", b"groceries", b"eggs")
  let refused = run Effect.result(execute(second.asSlice()))
    |> Effect.provideMut<FileSystem>(&mut files)
    |> Effect.provideMut<Logger>(&mut logger)
  let alreadyThere = match move refused {
    Result.Success { .. } => false
    Result.Failure { error } => match move error {
      AtomicWriteError problem => !problem.published && problem.cause.reason.code == FileSystem.reasonCode(FileSystem.alreadyExists())
      _ => false
    }
  }
  run Testing.expect(alreadyThere, "the second add is refused")

  let path = run Path.make("/notes/groceries.txt")
  let contents = run FileSystem.readFile(&path) |> Effect.provideMut<FileSystem>(&mut files)
  run Testing.expect(sameBytes(contents.asSlice(), b"milk"), "the first text was kept")
}
```

`Effect.result` turns the outcome of `execute` into a `Result`, so the test can look at the failure instead of passing it on. `argv` builds a `List<Bytes>` of four arguments, and `sameBytes` compares two byte slices. Both are short helpers in the program.

```sh
silk test --no-cache
```

```
  main::addRefusesToOverwrite
    PASS  4 ms

Tests  1 passed, 0 failed (0 cached, 1 executed, 1 selected, 1 discovered)
Time   4 ms
```

Afterwards, `ls /tmp` shows no `notes-test-` directory. Change the expected text to `b"eggs"` and the test fails, and the directory is still removed. The report prints the message of the failing `expect` under the test's name, and the trace names its line:

```
  main::addRefusesToOverwrite
    assertion failed: the first text was kept
    FAIL  4 ms

Tests  0 passed, 1 failed (0 cached, 1 executed, 1 selected, 1 discovered)
Time   4 ms
unhandled error: silk/testing.AssertionError<'static>
  at silk/testing.Testing.expect (silk/testing:32:7)
  at main.scenario (main:257:3)
  at silk/effect.Effect.ensuring (silk/effect:442:12)
  at silk/effect.Effect.provideMut (silk/effect:679:12)
  at silk/effect.Effect.provideMut (silk/effect:679:12)
  at main.addRefusesToOverwrite (main:275:3)
  at silk/effect.Effect.flatMap (silk/effect:303:19)
  at silk/effect.Effect.flatMap (silk/effect:303:19)
```

## API reference

- `silk/filesystem`: `FileSystem`, `Path`, `FileError`, `FileReason`, `FileOperation`, `AtomicWriteError`, `PublicationPolicy`, `Durability`, `FileInfo`, `DirectoryInfo`, `DirectoryEntry`, `TemporaryDirectory`
- `silk/os_filesystem`: `OsFileSystem`
- `silk/host_input`: `HostInput`
- `silk/effect`: `Effect` (`catchAll`, `result`, `ensuring`)
- `silk/bytes`: `Bytes`
- `silk/string`: `String`
- `silk/testing`: `Testing`, `AssertionError`
