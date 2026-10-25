# 5. Lifetimes in practice

Your board owns its tasks, and every title is a `string<'static>`: a literal baked into the program. Real tasks come from somewhere else. In chapter 8 they will come from a file, and you don't want to copy every title out of the text you read. In this chapter tasks borrow their titles straight from a block of text, and you learn to name how long such a borrow may live. Those names are lifetimes.

You will parse the board from a constant for now. The parsing is short. The interesting part is the type signatures, and the errors you get when they are wrong.

## A string is a borrow

Start with what a `string` actually is. It is not a buffer that owns its characters. It is a view: a pointer to some UTF-8 bytes that live somewhere else, plus a length. That is why `string` is `Copy`. Copying a view doesn't copy the text.

A view is only safe while the text it points at still exists. So every string type carries a lifetime, written `string<'name>`. The lifetime names the region of the program during which the borrowed text is guaranteed to be valid.

You have been using one lifetime all along. `'static` means "valid for the whole program". String literals have type `string<'static>` because they are stored in the program itself and never go away. In chapter 3 you wrote `title: string<'static>` because a field needs to say where its text comes from, and literals were the only source you had.

Now you want titles that point into a block of text the program read at run time. That text lives for a while, not forever. The struct has to say so.

## Letting a task borrow its title

The natural first try is to just drop the `'static` and write `string`. In your chapter 4 program, change the `title` field of `Task` to that:

```silk
struct Task {
  id: TaskId,
  title: string,
  priority: Priority,
  status: Status,
}
```

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.14s
[x86_64-unknown-linux-gnu]
src/main.silk:29:17: error[SEM0210] The omitted output lifetime has no unique input; name its lifetime explicitly
src/main.silk:55:16: error[SEM0210] The omitted output lifetime has no unique input; name its lifetime explicitly
Failed tasks in 0.20s
```

Two errors from one change. Here is what happened. A field type with no lifetime doesn't mean "no lifetime". It quietly gives the struct a hidden lifetime parameter. `Task` is now really "a task borrowing from *some* text", and `Board`, which holds tasks, picked up a hidden parameter too.

Line 29 is `fn blank() -> Task` and line 55 is `fn make() -> Board`. Each returns a value that borrows from some text, but neither takes any input. The compiler can't guess where the borrow comes from, so it asks you to name it. Methods like `isOpen`, whose `self: &Self` only reads the task, are fine: the hidden parameter rides along with `Self`.

The fix is to stop hiding the lifetime. Give it a name, declare it on the struct, and declare it on the impl:

```silk
// A task borrows its title from somewhere else: the text it was read from.
struct Task<'text> {
  id: TaskId,
  title: string<'text>,
  priority: Priority,
  status: Status,
}

impl<'text> Task<'text> {
  fn blank() -> Task<'text> {
    return Task { id: TaskId(0), title: "", priority: Priority.Low, status: Status.Open }
  }

  fn isOpen(self: &Self) -> bool {
    return match &self.status {
      Status.Open => true
      Status.Done { .. } => false
    }
  }
}
```

Read `struct Task<'text>` as "a task, for some region `'text`, whose title is valid during `'text`". The name `'text` is yours to choose. Pick names that say what the borrow points at.

`impl<'text> Task<'text>` reads the same way: "for any `'text`, here are the methods of `Task<'text>`". Inside the impl, `Self` means `Task<'text>`, so `isOpen` is fine as it was.

`blank` returns a task whose title is `""`. That literal is `string<'static>`, and a `'static` borrow can be used wherever a shorter one is expected. Text that lasts forever certainly lasts through `'text`.

Every struct that holds a task carries the lifetime along:

```silk
struct Draft<'text> {
  title: string<'text>,
  priority: Priority,
}

struct Board<'text> {
  tasks: [Task<'text>; 4],
  count: usize,
  nextId: u32,
}

impl<'text> Board<'text> {
  fn make() -> Board<'text> {
    return Board {
      tasks: [Task.blank(), Task.blank(), Task.blank(), Task.blank()],
      count: 0,
      nextId: 1,
    }
  }

  fn add(self: &mut Self, draft: Draft<'text>) -> TaskId {
```

Only the headers change. One `'text` covers the whole board: every title in a `Board<'text>` borrows from text that is valid during `'text`. `add` accepts only a `Draft<'text>`, so you can't slip in a title that borrows from something shorter-lived. The bodies of `add`, `complete` and `openCount` stay exactly as they were.

The functions outside the impls barely notice. `statusMark(task: &Task)`, `show(task: &Task)` and `showBoard(board: &Board)` still compile with no lifetime written. In a parameter type, a lifetime you leave out becomes a fresh one, so `&Task` means "a reference to a task that borrows from any text at all". These functions only read the task for the length of the call, so they don't care which text it is. `priorityLabel` keeps its `string<'static>` result: it takes no borrowed input, so the only place its text can come from is the program itself.

See **Lifetimes** in the reference for declaring lifetime parameters on structs, impls and functions.

## Parsing the board from text

Now give the tasks some text to borrow from. One task per line: a status byte, `|`, a priority byte, `|`, and the title.

```silk
// One task per line: a status byte, `|`, a priority byte, `|`, the title.
//   x|n|Buy milk
const SEED: string = "x|n|Buy milk\n |h|Write the Silk book\n |l|Water the plants\n"
```

An `x` in the status column means done. The priority is `l`, `n` or `h`. Here are the helpers, plus a new import at the top of the file:

```silk
import silk.string { String }
```

```silk
fn part<'text>(text: string<'text>, start: usize, end: usize) -> string<'text> {
  return String.slice(text, start, end - start)
}

fn priorityFrom(code: u8) -> Priority {
  if code == 'h' {
    return Priority.High
  }
  if code == 'l' {
    return Priority.Low
  }
  return Priority.Normal
}
```

`part` cuts the bytes from `start` to `end` out of the text and returns them as a string. Nothing is copied. `String.slice` takes a byte offset and a length and returns a view of that stretch of the same text. Both ends must fall inside the text and between characters, which they do here: every cut is next to a `|` or a line break.

The signature is the part to read slowly:

```silk
fn part<'text>(text: string<'text>, start: usize, end: usize) -> string<'text>
```

The same `'text` appears on the input and the output. That is a promise to the caller: the result borrows from the same text you passed in, so it stays valid as long as that text does. The caller does not need to keep any other value alive.

Then `parseBoard` walks the text line by line:

```silk
fn parseBoard<'text>(text: string<'text>) -> Board<'text> {
  let mut board: Board<'text> = Board.make()
  let bytes = String.utf8Bytes(text)
  let mut start: usize = 0
  let mut index: usize = 0
  while index < bytes.length {
    if bytes[index] == '\n' {
      // A line is at least "s|p|" plus one title byte.
      if index - start > 4 {
        let id = board.add(Draft {
          title: part(text, start + 4, index),
          priority: priorityFrom(bytes[start + 2]),
        })
        if bytes[start] == 'x' {
          drop board.complete(id, 1)
        }
      }
      start = index + 1
    }
    index = index + 1
  }
  return move board
}
```

The signature says it all: give me text valid for `'text`, and I give you a board whose titles borrow from that same text. The board itself is a new value that `parseBoard` owns, so it moves out to the caller with `return move board`.

## When you may leave lifetimes out

You might wonder why the stdlib functions you just called have no lifetimes in sight. Their signatures in `silk/string` look like this:

```silk
  pub fn utf8Bytes(value: string) -> &[u8] {
```

That is *elision*: leaving out lifetimes the compiler can work out from simple rules. In a function signature:

- Each lifetime you leave out of a parameter becomes a fresh lifetime of its own.
- A result with no lifetime borrows from the receiver (`self`), when the receiver is a borrow.
- Otherwise it borrows from the one parameter that is a borrow, if there is exactly one.
- Otherwise you must write it.

`utf8Bytes` has exactly one borrowed parameter, so its result borrows from `value`. Your `part` has exactly one borrowed parameter too, so you could write it with no lifetimes at all:

```silk
fn part(text: string, start: usize, end: usize) -> string {
```

That compiles and runs just the same. The book keeps the names in `part` and `parseBoard` because they document the promise, and because the next rule is about to bite.

The fourth rule covers a function with two borrowed inputs. Put this in the `src/main.silk` of the scratch project from chapter 2:

```silk
import silk.string { String }

fn longer(left: string, right: string) -> string {
  if String.byteLength(left) >= String.byteLength(right) {
    return left
  }
  return right
}

pub fn main() -> i32 {
  if longer("Buy milk", "Water the plants") != "Water the plants" {
    return 1
  }
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.09s
[x86_64-unknown-linux-gnu]
src/main.silk:3:43: error[SEM0210] The omitted output lifetime has no unique input; name its lifetime explicitly
Failed scratch in 0.14s
```

The error points at the result type. The result could be `left` or `right`, so it could borrow from either one. The compiler won't pick for you, because each choice means something different to the caller. Say what you mean:

```silk
fn longer<'text>(left: string<'text>, right: string<'text>) -> string<'text> {
```

Now both inputs share one lifetime, and so does the result. At each call the compiler picks a `'text` that both arguments satisfy, which is the shorter of the two. The result is valid at least that long. With this line changed, the scratch program checks and runs with exit status 0.

## Annotating the board

Back in `tasks`, look again at the first line of `parseBoard`:

```silk
  let mut board: Board<'text> = Board.make()
```

Inside a function body you usually don't write lifetimes; the compiler works them out. Try removing this one, so the line is `let mut board = Board.make()`:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.14s
[x86_64-unknown-linux-gnu]
src/main.silk:139:18: error[SEM0012] Expected main.Draft<'static> but received main.Draft<'_>
Failed tasks in 0.20s
```

The line numbers here refer to the whole file at the end of the chapter. SEM0012 says an argument's type doesn't match its parameter. Line 139 is `let id = board.add(`, and the argument is the draft. `add` expects a `Draft<'static>`, but the draft borrows from `text`. The `'_` stands for a lifetime that has no name in your code.

What went wrong is that `Board.make()` has a lifetime parameter, and nothing in that call says what it should be. The compiler fixes it right there, at the call, rather than looking ahead to the `add` that comes later. By the time you add a draft borrowing from `text`, the board has already been given another lifetime, `'static`, and the draft doesn't fit. Writing `Board<'text>` tells the compiler up front which text the board borrows from. Put the annotation back.

When an `add` or a method call on a new value fails with SEM0012, and lifetimes are involved, annotate the `let`.

## A result that outlives the borrow

Now the method that is the reason this chapter exists. Add it to `impl<'text> Board<'text>`:

```silk
  // The result borrows from the text, not from the board, so it may outlive `&self`.
  fn longestTitle(self: &Self) -> string<'text> {
    let mut longest: string<'text> = ""
    let mut index: usize = 0
    while index < self.count {
      let title = self.tasks[index].title
      if String.byteLength(title) > String.byteLength(longest) {
        longest = title
      }
      index = index + 1
    }
    return longest
  }
```

And use the new pieces in `report`:

```silk
effect fn report() -> () ! LogError ? &mut Logger {
  let board = parseBoard(SEED)
  run showBoard(&board)
  run Effect.log("longest title: {title}\n", &.{ title: board.longestTitle() })
}
```

```sh
silk run
```

```
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
longest title: Write the Silk book
```

The output looks like chapter 4's, but the titles now come from `SEED`, and the first task was marked done by the parser.

Why does `longestTitle` spell out `string<'text>`? There are two borrows in play. `self` is a borrow of the board, which lasts only as long as the board. Each title is a borrow of the text, which may last much longer. The title doesn't point into the board at all; the board only holds a view. So the honest answer is that the result borrows from the text.

If you leave the lifetime off, elision applies its second rule and ties the result to the receiver, the borrow of the board. To see the difference, change the signature to `fn longestTitle(self: &Self) -> string` and make `report` drop the board before logging:

```silk
  let board = parseBoard(SEED)
  run showBoard(&board)
  let longest = board.longestTitle()
  drop board
  run Effect.log("longest title: {title}\n", &.{ title: longest })
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.14s
[x86_64-unknown-linux-gnu]
src/main.silk:199:3: error[OWN0011] An owner access that conflicts with an active borrowed-view loan
  note: src/main.silk:198:17: the borrow starts here
src/main.silk:200:57: error[OWN0019] `longest` is used after `board`, which it borrows, ended or was replaced
  note: src/main.silk:198:17: the borrow starts here
Failed tasks in 0.20s
```

Both notes point at `board.longestTitle()` on line 198, where the loan began.

OWN0011 at `drop board` means you touched an owner while a loan on it was still active. As far as the signature says, `longest` borrows the board, and it is used on the next line. OWN0019 at `longest` says the borrow was used after `board`, the thing it borrows from, stopped being valid. The board is gone, so a view into the board would point at freed memory.

Here, that fear is wrong: the title really points into `SEED`, which lives forever. But the compiler checks callers against the signature, not against the body. The signature is the contract. Put `string<'text>` back, keep the new `report` lines, and it runs:

```
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
longest title: Write the Silk book
```

The title outlives the board it was found in, because it never belonged to the board. That is exactly what you will want in chapter 8, where the text comes from a file and the board is built from it. Restore `report` to the three-line version above before moving on.

Rule of thumb: when a method returns something it found inside `self`, ask whether it points into `self` or into something `self` merely refers to. Elision assumes the first. Name the lifetime when it is the second.

## A borrow that really dangles

So far the compiler has refused safe code because the signature said too little. Here it catches the real bug. Put this in the scratch project:

```silk
import silk.result { Result }
import silk.string { String, InvalidUtf8 }

struct Board<'text> {
  first: string<'text>,
}

fn textOf(bytes: &[u8]) -> string {
  return match String.fromUtf8(bytes) {
    Result<string, InvalidUtf8>.Success { value } => value
    Result<string, InvalidUtf8>.Failure { .. } => ""
  }
}

pub fn main() -> i32 {
  let mut board = Board { first: "" }
  if true {
    let buffer: [u8; 4] = ['m', 'i', 'l', 'k']
    board = Board { first: textOf(&buffer) }
  }
  if board.first != "milk" {
    return 1
  }
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:21:6: error[OWN0019] `board` is used after `buffer`, which it borrows, ended or was replaced
  note: src/main.silk:19:35: the borrow starts here
Failed scratch in 0.18s
```

The note points at `&buffer` on line 19, the borrow that outlives `buffer`.

By elision, `textOf` returns a string that borrows from `bytes`, its only borrowed parameter. Inside the `if`, that is `&buffer`. So `board.first` is a view into `buffer`. But `buffer` is a local of the `if` block, and it is dropped at the closing brace. On line 21, `board.first` would read four bytes of memory that no longer hold anything. In C this compiles, and sometimes prints `milk`, and sometimes doesn't.

OWN0019 points at the read, not at the store, because storing the view was fine on its own. It is the use after the buffer is gone that would go wrong. The fix is to make the text live as long as the board that borrows from it:

```silk
pub fn main() -> i32 {
  let buffer: [u8; 4] = ['m', 'i', 'l', 'k']
  let mut board = Board { first: "" }
  if true {
    board = Board { first: textOf(&buffer) }
  }
  if board.first != "milk" {
    return 1
  }
  return 0
}
```

This checks and runs with exit status 0. Whenever you see OWN0019, find the value the borrow points into, and ask where it is dropped. Then either move that value to an outer scope or stop using the borrow before that point.

See **Lifetimes** in the reference for the full elision rules, outlives bounds such as `'a: 'b`, and the validity checks.

## The whole program

Here is `src/main.silk` at the end of the chapter. The line numbers in the errors above refer to this file.

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }
import silk.ownership { Copy }
import silk.string { String }

enum Priority {
  Low,
  Normal,
  High,
}

tuple TaskId(u32)

impl Copy for TaskId {}

union Status {
  Open,
  Done { day: u32 },
}

// A task borrows its title from somewhere else: the text it was read from.
struct Task<'text> {
  id: TaskId,
  title: string<'text>,
  priority: Priority,
  status: Status,
}

impl<'text> Task<'text> {
  fn blank() -> Task<'text> {
    return Task { id: TaskId(0), title: "", priority: Priority.Low, status: Status.Open }
  }

  fn isOpen(self: &Self) -> bool {
    return match &self.status {
      Status.Open => true
      Status.Done { .. } => false
    }
  }
}

struct Draft<'text> {
  title: string<'text>,
  priority: Priority,
}

struct Board<'text> {
  tasks: [Task<'text>; 4],
  count: usize,
  nextId: u32,
}

impl<'text> Board<'text> {
  fn make() -> Board<'text> {
    return Board {
      tasks: [Task.blank(), Task.blank(), Task.blank(), Task.blank()],
      count: 0,
      nextId: 1,
    }
  }

  fn add(self: &mut Self, draft: Draft<'text>) -> TaskId {
    let Draft { title, priority } = move draft
    let id = TaskId(self.nextId)
    self.tasks[self.count] = Task { id: id, title: title, priority: priority, status: Status.Open }
    self.count = self.count + 1
    self.nextId = self.nextId + 1
    return id
  }

  fn complete(self: &mut Self, id: TaskId, day: u32) -> bool {
    let mut index: usize = 0
    while index < self.count {
      let task = &mut self.tasks[index]
      if task.id.0 == id.0 {
        task.status = Status.Done { day: day }
        return true
      }
      index = index + 1
    }
    return false
  }

  fn openCount(self: &Self) -> i32 {
    let mut open = 0
    let mut index: usize = 0
    while index < self.count {
      if self.tasks[index].isOpen() {
        open = open + 1
      }
      index = index + 1
    }
    return open
  }

  // The result borrows from the text, not from the board, so it may outlive `&self`.
  fn longestTitle(self: &Self) -> string<'text> {
    let mut longest: string<'text> = ""
    let mut index: usize = 0
    while index < self.count {
      let title = self.tasks[index].title
      if String.byteLength(title) > String.byteLength(longest) {
        longest = title
      }
      index = index + 1
    }
    return longest
  }
}

// One task per line: a status byte, `|`, a priority byte, `|`, the title.
//   x|n|Buy milk
const SEED: string = "x|n|Buy milk\n |h|Write the Silk book\n |l|Water the plants\n"

fn part<'text>(text: string<'text>, start: usize, end: usize) -> string<'text> {
  return String.slice(text, start, end - start)
}

fn priorityFrom(code: u8) -> Priority {
  if code == 'h' {
    return Priority.High
  }
  if code == 'l' {
    return Priority.Low
  }
  return Priority.Normal
}

fn parseBoard<'text>(text: string<'text>) -> Board<'text> {
  let mut board: Board<'text> = Board.make()
  let bytes = String.utf8Bytes(text)
  let mut start: usize = 0
  let mut index: usize = 0
  while index < bytes.length {
    if bytes[index] == '\n' {
      // A line is at least "s|p|" plus one title byte.
      if index - start > 4 {
        let id = board.add(
          Draft { title: part(text, start + 4, index), priority: priorityFrom(bytes[start + 2]) }
        )
        if bytes[start] == 'x' {
          drop board.complete(id, 1)
        }
      }
      start = index + 1
    }
    index = index + 1
  }
  return move board
}

fn priorityLabel(priority: Priority) -> string<'static> {
  return match priority {
    Priority.Low => "low"
    Priority.Normal => "normal"
    Priority.High => "high"
  }
}

fn statusMark(task: &Task) -> string<'static> {
  if task.isOpen() {
    return "[ ]"
  }
  return "[x]"
}

effect fn show(task: &Task) -> ()
  ! LogError
  ? &mut Logger {
  run Effect.log(
    "{mark} #{id} {title} ({priority})\n",
    &.{
      mark: statusMark(task),
      id: task.id.0,
      title: task.title,
      priority: priorityLabel(task.priority),
    }
  )
}

effect fn showBoard(board: &Board) -> ()
  ! LogError
  ? &mut Logger {
  let mut index: usize = 0
  while index < board.count {
    run show(&board.tasks[index])
    index = index + 1
  }
  run Effect.log("{open} open\n", &.{ open: board.openCount() })
}

effect fn report() -> ()
  ! LogError
  ? &mut Logger {
  let board = parseBoard(SEED)
  run showBoard(&board)
  run Effect.log("longest title: {title}\n", &.{ title: board.longestTitle() })
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  run report() |> Effect.provideMut(&mut logger)
}
```

## Summary

- A `string` is a borrowed view, and its lifetime says how long the text it points at stays valid. Literals are `string<'static>`.
- A struct that holds a borrow declares a lifetime parameter, `struct Task<'text>`, and its impl repeats it, `impl<'text> Task<'text>`.
- Lifetimes in signatures can often be left out. With no receiver and several borrowed inputs (SEM0210), name the one the result borrows from.
- An elided result on a method borrows from `self`. Name the lifetime when the result points into something `self` only refers to.
- OWN0019 means a borrow is used after its source was dropped: keep the source alive longer, or finish with the borrow sooner.
- When lifetime inference fails on a new value (SEM0012), annotate the `let`.

Next, chapter 6 adds interfaces, generics and closures, so priorities and ids can print themselves and the board can be filtered.
