# 9. Text, collections and memory

`tasks` now remembers its board in `tasks.txt`, but the board is still a fixed array of four. Add a fifth task and it says "the board is full". This chapter replaces the array with a growable `List`, refuses duplicate titles with a `HashMap`, sorts the listing, and writes the file through the same templates the logger uses. Along the way you will see the difference between text you borrow and text you own, and why memory in Silk is a service like any other.

## Text you borrow, text you own

Silk has two kinds of text, and you have used both.

A `string<'text>` is a *view*. It points at UTF-8 bytes that live somewhere else, and its lifetime says how long that somewhere lasts. String literals are views of `'static` data. The titles on the board are views of the loaded file or of the command-line words. Making a view never copies anything and never allocates.

`Bytes`, from `silk/bytes`, is *owned*. It holds its own buffer, can grow, and frees the buffer when it is dropped. `HostInput.argument` and `FileSystem.readFile` return `Bytes`, because they create new data. Growing a `Bytes` needs memory, so `append` needs an allocator.

Because views are cheap, you can cut them freely. Users type stray spaces, so `"  Water the plants  "` should mean the same task as `"Water the plants"`. `String.trim` from `silk/string` drops the whitespace at both ends:

```silk
let title = String.trim("  Water the plants  ")
```

`title` is `"Water the plants"`, a smaller view of the same bytes, just like the views `part` from chapter 5 cuts. Its signature is `fn trim(value: string) -> string`, so by elision the result borrows from `value` and lives as long as it does. It is a plain `fn`: no allocator, no failure. `String.trimStart` and `String.trimEnd` trim one end only.

The flip side is that views cannot be glued together. You might reach for `+`:

```silk
pub fn main() -> i32 {
  let greeting = "tasks " + "0.9"
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.09s
[x86_64-unknown-linux-gnu]
src/main.silk:2:27: error[SEM0135] Operator + does not accept (string<'static>, string<'static>)
Failed scratch in 0.14s
```

The message says it plainly: `+` belongs to an operator interface, and no impl of it accepts two string views. `+` is for numbers. Joining two views means building new text, and new text needs somewhere to live. In Silk you build it with a template that writes into a buffer you own. You will do exactly that for `tasks.txt` later in this chapter.

## A board that grows

`List<T>` from `silk/list` is a growable sequence that owns its elements. The import is already there, from chapter 8's test fake. Swap the list in for the array, and drop `count`, since the list knows its own length:

```silk
// The board grows as needed. It also indexes tasks by title to refuse duplicates.
struct Board<'text> {
  tasks: List<Task<'text>>,
  byTitle: HashMap<Title<'text>, TaskId>,
  nextId: u32,
}
```

Ignore `byTitle` for a moment; the next section builds it. `Task.blank()` is gone too, since nothing needs placeholder tasks anymore.

In `Board.make`, you might write `List.make()` and expect the field type to fill in the rest:

```silk
      tasks: List.make(),
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     61 modules, 1 in package          0.08s
  check    failed: 2 modules, 1 error        3.30s
[x86_64-unknown-linux-gnu]
src/main.silk:175:14: error[SEM0052] Cannot infer all type arguments for List.make from supplied values
Failed tasks in 3.39s
```

The message says it plainly. Type arguments are inferred from the arguments you pass, and `make()` has none. The field's type never flows back into the call. That is by design: a call means the same thing wherever you write it. Write the type out:

```silk
impl<'text> Board<'text> {
  fn make() -> Board<'text> {
    return Board {
      tasks: List<Task<'text>>.make(),
      byTitle: HashMap<Title<'text>, TaskId>.make(Hash.seed(2026)),
      nextId: 1,
    }
  }
```

`List.make()` does not allocate. It creates an empty list with no buffer. Memory is requested only when the list first grows.

### Reading elements

To look at the tasks, borrow them as a slice. `asSlice` gives `&[Task]` and `asMutSlice` gives `&mut [Task]`. After that, indexing works just as it did on the array. Here is `complete`:

```silk
  effect fn complete(self: &mut Self, id: TaskId, at: i64) -> () ! NoSuchTask {
    let tasks = self.tasks.asMutSlice()
    let mut index: usize = 0
    while index < tasks.length {
      let task = &mut tasks[index]
      if &task.id == &id {
        task.status = Status.Done { at: at }
        return ()
      }
      index = index + 1
    }
    fail NoSuchTask { id: id }
  }
```

`count` changes the same way, with `board.tasks.asSlice()`.

There is also `get`, which looks more direct. Try it in a scratch file:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.option { Option }
import silk.list { List }

struct Task { title: string<'static> }

effect fn first() -> () ! OutOfMemoryError ? &mut Allocator {
  let mut tasks = List<Task>.make()
  run tasks.append(Task { title: "Buy milk" })
  // `get` hands out a copy, so it needs Task: Copy.
  let found = tasks.get(0)
}

pub effect fn main() -> () ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  run first() |> Effect.provideMut<Allocator>(&mut allocator)
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:12:15: error[SEM0121] `main.Task: Copy` cannot be proved: the callee requires a `Copy` type argument here, and this type does not implement `Copy`
Failed scratch in 0.16s
```

The message names the rule: `get` returns a *copy* of the element, so it only works when the element type is `Copy`. A `Task` owns its status and is not `Copy`, and you would not want silent copies of it anyway. Borrow instead:

```silk
effect fn first() -> () ! OutOfMemoryError | LogError ? &mut Allocator | &mut Logger {
  let mut tasks = List<Task>.make()
  run tasks.append(Task { title: "Buy milk" })
  run tasks.append(Task { title: "Water the plants" })
  // Borrow instead of copying: view the elements as a slice.
  let all = tasks.asSlice()
  let task = &all[1]
  run Effect.log("{count} tasks, second is {title}\n", &.{ count: tasks.length(), title: task.title })
}
```

With a logger provided in `main`, it runs:

```
2 tasks, second is Water the plants
```

Indexes are checked at run time, on slices and arrays alike. Ask for an element that is not there and the program stops:

```silk
fn third(estimates: &[i32]) -> i32 {
  return estimates[2]
}

pub fn main() -> i32 {
  let estimates = [25, 90]
  return third(&estimates)
}
```

```sh
silk run
```

```
fatal trap: index out of bounds
  at main.third (main:2:10)
```

The exit status is 132, the same as the overflow trap in chapter 2. A trap is not a typed failure. It is a bug, and no handler can catch it. That is why `complete` loops while `index < tasks.length` and never guesses.

## Memory is a service

Adding to a list may need a bigger buffer. In Silk that is never hidden. `append` is an `effect fn` that requires `? &mut Allocator` and can fail with `OutOfMemoryError`. So `Board.add` now declares both:

```silk
  effect fn add(self: &mut Self, draft: Draft<'text>) -> TaskId
  ! DuplicateTask | OutOfMemoryError
  ? &mut Allocator {
```

And the requirement climbs, exactly like the clock in chapter 8. `parseLine` and `parseBoard` call `add`, so they now say `? &mut Allocator` and list `OutOfMemoryError`. So does `addTask`. `execute` already had the allocator in its row, because `load` needed it, so `main` does not change at all.

This is the payoff of treating memory as a service. You can see, from a signature alone, which functions may allocate. `String.trim`, `part`, `count` and `complete` cannot. And the allocator a test provides could be one that fails on purpose, to check what happens when memory runs out. A program can also provide a different allocator to one part of itself, such as an `Arena` from `silk/arena`, which hands out memory from large chunks and gives a phase's memory back all at once. See **Allocation and shared ownership** in the reference for `List`, `Box` and `Shared`.

`BoardFull` is gone. The board only fills when memory does, and that is `OutOfMemoryError`, which `explain` already passes on.

## Refusing duplicates with a HashMap

Adding `Buy milk` twice should not make two tasks. You could scan the list each time, but a hash map answers "have I seen this title?" directly. `HashMap<K, V>` from `silk/hash_map` maps keys to values. Here the key is a title and the value is the task's id.

A key type must implement `HashKey` from `silk/hash`. A plain `string` does not, so you wrap it. First, see what happens without the impl:

```silk
import silk.allocator { Allocator, OutOfMemoryError }
import silk.effect { Effect }
import silk.hash { Hash }
import silk.hash_map { HashMap }

struct Title { text: string<'static> }

effect fn index() -> () ! OutOfMemoryError ? &mut Allocator {
  let mut byTitle = HashMap<Title, u32>.make(Hash.seed(1))
  drop run byTitle.insert(Title { text: "Buy milk" }, 1)
}

pub effect fn main() -> () ! OutOfMemoryError {
  let mut allocator = Allocator.systemAllocatorProvider()
  run index() |> Effect.provideMut<Allocator>(&mut allocator)
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.13s
[x86_64-unknown-linux-gnu]
src/main.silk:10:12: error[SEM0121] `main.Title: silk.hash.HashKey` cannot be proved: no implementation of `silk.hash.HashKey` exists for `main.Title`
Failed scratch in 0.19s
```

`insert` needs `Title` to implement `HashKey`, and there is no such impl. The message names both, with their full module paths, and points at the `insert` call.

`HashKey` has two members. `equals` decides whether two keys are the same entry. `hash` turns a key into a number, mixed with a seed. The one rule: keys that are equal must hash the same. Here is the real `Title`:

```silk
// A title used as a hash-map key. Two titles are the same key when their bytes are equal.
struct Title<'text> { text: string<'text> }

impl<'text> Copy for Title<'text> {}

fn sameTitle(left: &Title, right: &Title) -> bool {
  return left.text == right.text
}

fn hashTitle(value: &Title, seed: &HashSeed) -> u64 {
  let bytes = String.utf8Bytes(value.text)
  let mut hashed = Hash.mix(seed, usize.toU64(bytes.length))
  let mut index: usize = 0
  while index < bytes.length {
    hashed = Hash.combine(hashed, u8.toU64(bytes[index]))
    index = index + 1
  }
  return hashed
}

impl<'text> HashKey for Title<'text> { equals: sameTitle hash: hashTitle }
```

`Hash.mix` starts from the seed and the length. `Hash.combine` folds in each byte. Equal bytes give an equal hash, so the rule holds. The map was made with `Hash.seed(2026)`. The seed is part of the map, and every key is hashed with it.

`Title` is `Copy` because it is only a view. Copying it copies a pointer and a length, never the text. That matters twice: `add` uses the same key for `get` and `insert`, and `HashMap.get` only works when keys and values are `Copy`. You will need `import silk.u64` and `import silk.usize` for the conversions, plus these:

```silk
import silk.hash { Hash, HashKey, HashSeed }
import silk.hash_map { HashMap }
```

Now `add` can check before it appends:

```silk
  effect fn add(self: &mut Self, draft: Draft<'text>) -> TaskId
  ! DuplicateTask | OutOfMemoryError
  ? &mut Allocator {
    let Draft { title, priority } = move draft
    let key = Title { text: String.trim(title) }
    if let Option<TaskId>.Some { value: existing } = self.byTitle.get(key) {
      fail DuplicateTask { id: existing }
    }
    let id = TaskId(self.nextId)
    drop run self.byTitle.insert(key, id)
    run self.tasks.append(Task { id: id, title: key.text, priority: priority, status: Status.Open })
    self.nextId = self.nextId + 1
    return id
  }
```

A few things to notice:

- `if let` runs its block only when the pattern matches. Here it means "if the map already has this title".
- `get` returns a copy of the stored id as an `Option<TaskId>`. Like `List.get`, it needs `Copy` types, and `Title` and `TaskId` both are.
- `insert` returns the previous value, if any. We know there was none, so `drop` discards it.
- The task stores `key.text`, the trimmed view. The file and the listing both see the clean title.

Duplicates get their own typed failure, which replaces `BoardFull`:

```silk
struct DuplicateTask { id: TaskId }
```

And `explain` gets a new arm:

```silk
    DuplicateTask { id } => {
      run Effect.log("that task already exists as {id}\n", &.{ id: id })
      return 1
    }
```

## Sorting the listing

A long list reads better with open tasks first, the important ones on top. `List.sort` sorts any element type that implements `Order`, which you met in chapter 6 for `Priority`. Write a comparison for `Task`:

```silk
// Listing order: open tasks first, then higher priority first, then by id.
fn compareTasks(left: &Task, right: &Task) -> Ordering {
  if left.isOpen() != right.isOpen() {
    if left.isOpen() {
      return Ordering.Less
    }
    return Ordering.Greater
  }
  if left.priority != right.priority {
    return comparePriority(&right.priority, &left.priority)
  }
  if left.id.0 < right.id.0 {
    return Ordering.Less
  }
  return Ordering.Greater
}

impl<'text> Order for Task<'text> { compare: compareTasks }
```

The priority line swaps `right` and `left`, so higher priorities come first. Ids are unique, so two tasks are never equal.

Sorting rearranges the list in place, so `showBoard` now takes `&mut Board`. Sorting may also need scratch memory, so it needs the allocator:

```silk
effect fn showBoard(board: &mut Board) -> () ! LogError | OutOfMemoryError ? &mut Logger | &mut SystemClock | &mut Allocator {
  run board.tasks.sort()
  let now = run SystemClock.now()
  let tasks = board.tasks.asSlice()
  let mut index: usize = 0
  while index < tasks.length {
    run show(&tasks[index], SystemClock.seconds(&now))
    index = index + 1
  }
  run Effect.log("{open} open\n", &.{ open: count(board, &OpenTasks {}) })
}
```

Run `silk check`:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     61 modules, 1 in package          0.07s
  check    failed: 2 modules, 1 error        1.73s
[x86_64-unknown-linux-gnu]
src/main.silk:519:45: error[SEM0012] Expected &main.Board<'_> but received &mut main.Board<'_>
Failed tasks in 1.81s
```

Column 45 is the `board` passed to `count`. `count` wants a `&Board`, and `board` is now a `&mut Board`. Many languages quietly treat a mutable reference as a shared one here. Silk does not; you write the reborrow yourself. `board.*` is the board, and `&board.*` is a fresh shared borrow of it:

```silk
  run Effect.log("{open} open\n", &.{ open: count(&board.*, &OpenTasks {}) })
```

In `execute`, the `List` arm now passes `&mut board`. See **Borrowing** in the reference for the full reborrow rules.

## Writing the file with templates

In chapter 8, `render` built each line by hand and even had its own digit-printing loop. But you already have a tool that turns numbers and text into bytes: the template in `Effect.log`. Templates are not tied to the logger. `Format.format` from `silk/format` writes a template to any `Writer`, and `Writer` from `silk/writer` is a service. So you need a provider that collects bytes in memory.

```silk
// A Writer that collects bytes in memory. It owns its allocator because a Writer
// operation has no way to ask the caller for one.
struct TextWriter {
  out: Bytes,
  allocator: SystemAllocator,
}

impl TextWriter {
  fn make() -> TextWriter {
    return TextWriter { out: Bytes.make(), allocator: Allocator.systemAllocatorProvider() }
  }
}

effect fn appendBytes(out: &mut Bytes, bytes: &[u8]) -> () ! OutOfMemoryError ? &mut Allocator {
  run out.append(bytes)
}

effect fn writerFull(error: OutOfMemoryError) -> () ! WriterError {
  fail Writer.failure()
}

impl Writer for TextWriter {
  effect fn writeAll(self: &mut Self, bytes: &[u8]) -> () ! WriterError ? &mut Writer {
    let appending = Effect.catchAll(appendBytes(&mut self.out, bytes), writerFull)
    run move appending |> Effect.provideMut<Allocator>(&mut self.allocator)
  }
  effect fn flush(self: &mut Self) -> () ! WriterError ? &mut Writer {
    return ()
  }
}
```

This is the same move `MemoryFiles` made in chapter 8. `writeAll` is fixed by the service: it may fail only with `WriterError` and has no `Allocator` in its row. So the provider carries its own allocator and turns `OutOfMemoryError` into a `WriterError` with `Writer.failure()`. The service also has `writeVectored`, which writes several slices as one. Its default body calls `writeAll` for each slice, and `TextWriter` has no faster way, so it leaves `writeVectored` out.

Now each line of the file is one template:

```silk
// One line per task, written with the same templates the logger uses.
effect fn renderLines(board: &Board) -> () ! WriterError ? &mut Writer {
  let tasks = board.tasks.asSlice()
  let mut index: usize = 0
  while index < tasks.length {
    let task = &tasks[index]
    let at = match &task.status {
      Status.Open => 0
      Status.Done { at } => at
    }
    let mark = match &task.status {
      Status.Open => " "
      Status.Done { .. } => "x"
    }
    run Format.format("{mark}|{priority}|{at}|{title}\n", &.{
      mark: mark,
      priority: priorityCode(task.priority),
      at: at,
      title: task.title,
    })
    index = index + 1
  }
}

effect fn render(board: &Board) -> Bytes ! WriterError {
  let mut writer = TextWriter.make()
  run renderLines(board) |> Effect.provideMut<Writer>(&mut writer)
  return move writer.out
}
```

`priorityCode` now returns `"l"`, `"n"` or `"h"` as a `string<'static>`, so it can go straight into the template. `appendNumber` is deleted, along with its `import silk.i64`: `{at}` prints the `i64` for you.

`render` provides the `Writer` itself, so it needs no services at all. Its only failure is `WriterError`. That ripples outward in a pleasant way. `save` no longer needs the allocator:

```silk
effect fn save(path: &Path, board: &Board) -> ()
! FileError | WriterError
? &mut FileSystem {
  let bytes = run render(board)
  run FileSystem.writeFile(path, Bytes.asSlice(&bytes))
}
```

`execute` and `explain` add `WriterError` to their failure lists, and `explain` reports it:

```silk
    WriterError problem => {
      drop problem
      run Effect.log("could not prepare tasks.txt\n", &())
      return 1
    }
```

This is how you join text in Silk. Instead of `"a" + "b"`, you write a template into a `Writer` that owns the result.

## Run it

Start with an empty directory again. As before, `tasks` stands for `./build/llvm/x86_64-unknown-linux-gnu/debug/tasks`.

```sh
silk run -- list
```

```
0 open
```

Add some tasks, including one with stray spaces and two duplicates:

```sh
tasks add 'Buy milk'
tasks add 'Write the Silk book' high
tasks add '  Water the plants  ' low
tasks add 'Buy milk'
tasks add ' Buy milk ' high
```

```
added #1
added #2
added #3
that task already exists as #1
that task already exists as #1
```

The last two exit with status 1. The second duplicate had different spaces and a different priority, but its trimmed title matched. Keep going, past the old limit of four:

```sh
tasks add 'Call the plumber' high
tasks add 'Fix the bike'
tasks add 'Renew passport' low
tasks done 1
tasks done 4
tasks list
```

```
added #4
added #5
added #6
finished #1
finished #4
[ ] #2 Write the Silk book (high)
[ ] #5 Fix the bike (normal)
[ ] #3 Water the plants (low)
[ ] #6 Renew passport (low)
[x] #4 Call the plumber (high, done today)
[x] #1 Buy milk (normal, done today)
4 open
```

Open tasks come first, high before normal before low, with ties broken by id. Finished tasks follow in the same order. The file keeps the order the tasks were added, because `list` sorts but does not save:

```sh
cat tasks.txt
```

```
x|n|1792458597|Buy milk
 |h|0|Write the Silk book
 |l|0|Water the plants
x|h|1792458597|Call the plumber
 |n|0|Fix the bike
 |l|0|Renew passport
```

`Water the plants` was saved without its spaces. The template wrote exactly the format chapter 8 wrote by hand, so old files still load.

The tests from chapter 8 still pass without a single change. They run the real `execute` with fake providers, and nothing about the providers changed:

```sh
silk test
```

```
  main::finishingRecordsTheClockTime
    PASS  82 us
  main::unknownTaskIsReported
    PASS  11 us

Tests  2 passed, 0 failed (0 cached, 2 executed, 2 selected, 2 discovered)
Time   144 us
```

## Summary

- A `string<'text>` is a view that never allocates. `Bytes` owns and grows its buffer. `String.trim` returns a smaller view of the same text.
- `List<T>` grows on demand. Borrow its elements with `asSlice` and `asMutSlice`. `get` is only for `Copy` elements, and out-of-range indexes trap.
- Allocation is the `Allocator` service. Its requirement and `OutOfMemoryError` show, in every signature, which code may allocate.
- A `HashMap` key implements `HashKey` with `equals` and a `hash` built from `Hash.mix` and `Hash.combine`.
- `List.sort` uses an `Order` impl, and passing a `&mut` where a `&` is wanted needs an explicit `&value.*`.
- `Format.format` writes a template to any `Writer`, including one you implement over `Bytes`.

Chapter 10 adds `tasks remind`, which runs one fiber per open task and cancels the ones that are too late.
