# 4. Ownership

Your program can describe tasks, but each task is a loose local in `report`. Nothing holds them together, and nothing changes a task once it exists. In this chapter you build a `Board` that owns the tasks, add drafts to it, and mark tasks done. To do that you need Silk's rules about who owns a value, who may look at it, and who may change it.

These rules are the part of Silk that surprises people most. Take this chapter slowly. Every error in it is one you will meet again, and each one stops a real bug.

## The new program

Here is where the chapter ends up. Replace `src/main.silk` with it, then the sections below take it apart and break it on purpose. The line numbers in the error messages refer to this file.

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }
import silk.ownership { Copy }

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

struct Task {
  id: TaskId
  title: string<'static>
  priority: Priority
  status: Status
}

impl Task {
  fn blank() -> Task {
    return Task { id: TaskId(0), title: "", priority: Priority.Low, status: Status.Open }
  }

  fn isOpen(self: &Self) -> bool {
    return match &self.status {
      Status.Open => true
      Status.Done { .. } => false
    }
  }
}

// What the user asks for: a title and a priority. The board turns it into a Task.
struct Draft {
  title: string<'static>
  priority: Priority
}

// A board owns its tasks. It has room for four; chapter 9 lets it grow.
struct Board {
  tasks: [Task; 4]
  count: usize
  nextId: u32
}

impl Board {
  fn make() -> Board {
    return Board {
      tasks: [Task.blank(), Task.blank(), Task.blank(), Task.blank()],
      count: 0,
      nextId: 1,
    }
  }

  // Takes ownership of the draft and gives back the new task's id.
  fn add(self: &mut Self, draft: Draft) -> TaskId {
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
  let mut board = Board.make()
  let draft = Draft { title: "Buy milk", priority: Priority.Normal }
  let milk = board.add(move draft)
  drop board.add(Draft { title: "Write the Silk book", priority: Priority.High })
  drop board.add(Draft { title: "Water the plants", priority: Priority.Low })

  if board.complete(milk, 3) {
    run Effect.log("finished #{id}\n", &.{ id: milk.0 })
  }
  run showBoard(&board)
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  run report() |> Effect.provideMut(&mut logger)
}
```

Run it:

```sh
silk run
```

```
finished #1
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
```

Three drafts went in, one task came out finished, and two are still open. A few smaller things changed too. `Task` has two methods, `blank` and `isOpen`. `statusMark` now takes the whole task and asks it whether it is open. And `drop board.add(...)` throws away a result you don't need: Silk makes you say so instead of letting a value vanish silently.

## Every value has one owner

Start with the idea everything else rests on. In Silk, every value has exactly one owner. A `let` binding owns its value. A parameter owns its argument. A struct owns its fields, and an array owns its elements.

So in this program the `Board` owns an array, the array owns four `Task` values, and each task owns its status. When `board` goes out of scope at the end of `report`, it is dropped, and everything it owns goes with it. You never free anything by hand, and nothing is freed twice.

That last part is the point. If two places both believed they owned the same task, both would try to clean it up. Or one would change it while the other still trusted the old contents. Silk rules both out by making ownership single and visible.

The whole story is in **Ownership and moves** in the reference. The rest of this chapter is about the two ways a value can be used without breaking that rule: it can be **moved** to a new owner, or **borrowed** for a while.

## Moving a draft into the board

A `Draft` is what a user hands you: a title and a priority. The board turns it into a full `Task` with an id and a status. Look at the signature of `add`:

```silk
  fn add(self: &mut Self, draft: Draft) -> TaskId {
    let Draft { title, priority } = move draft
```

The `draft` parameter has type `Draft`, not a reference. That means `add` takes ownership: after the call, the draft belongs to the board, not to you. Inside, `let Draft { title, priority } = move draft` takes the draft apart into its two fields, and the title ends up stored in the new task.

At the call site you write the move out:

```silk
  let draft = Draft { title: "Buy milk", priority: Priority.Normal }
  let milk = board.add(move draft)
```

Silk wants that `move` keyword. Try deleting it, so line 135 reads `let milk = board.add(draft)`, and check:

```sh
silk check
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:135:24: error[OWN0003] Moving draft requires an explicit move
Failed tasks in 0.17s
```

This is a rule, not a guess about what you meant. In many languages, `f(x)` might copy `x` or might give it away, and you only find out by reading `f`. In Silk, when a named value leaves its owner, the code says `move` right there. Someone reading `report` can see that `draft` is gone after line 135 without opening `add`.

Notice the next two calls have no `move`:

```silk
  drop board.add(Draft { title: "Write the Silk book", priority: Priority.High })
```

That draft is a temporary. It has no name and no other owner, so there is nothing to lose track of. A temporary goes straight into its new home.

Put the `move` back. Now try using the draft after it has moved. Add a log line right after the first `add`:

```silk
  let milk = board.add(move draft)
  run Effect.log("added {title}\n", &.{ title: draft.title })
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:136:48: error[OWN0001] draft.title was moved and cannot be used again
  note: src/main.silk:135:24: related location
Failed tasks in 0.17s
```

The indented `note:` line is a related location: here, the `move draft` on line 135 that gave the draft away.

The compiler tracks which bindings have been moved. The message names `draft.title`, the exact thing you tried to read: the whole draft moved on line 135, and its title went with it. After that line, `draft` is empty as far as `report` is concerned. Its title now lives in the board, and the board can change it or drop it whenever it likes. Reading the old binding would mean reading something you no longer own. Remove the log line.

If you want the title after adding, ask the board for it, or keep what you need before the move.

## Copy: values that are cheap to duplicate

Look at `add` again. It builds a task with `id: id` and then does `return id`. That uses `id` twice, with no `move`. Further down, `report` passes `milk` to `complete` and then logs `milk.0`. Why are those allowed?

Because of this line near the top:

```silk
impl Copy for TaskId {}
```

Some types are so small and simple that duplicating them is harmless. Reading such a value makes a copy, and the original stays usable. Integers, `bool`, `char`, and scalar enums like `Priority` are `Copy` automatically. So is `string`, because a string is only a view of text that lives elsewhere. So is a shared reference `&T`.

Structs, unions and tuples are not `Copy` unless you say so. Delete the `impl Copy for TaskId {}` line and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:65:41: error[OWN0003] Moving id requires an explicit move
src/main.silk:137:21: error[OWN0003] Moving milk requires an explicit move
Failed tasks in 0.17s
```

The line numbers are two lower than before because you removed two lines. Without `Copy`, `TaskId` moves like any struct. The first use of `id` in the task literal would move it, and `return id` would then be a use after move. The same goes for `milk`, which is needed by both `complete` and the log line.

You could write `move` and juggle copies by hand, but that is silly for a wrapper around a `u32`. Put the line back. `impl Copy for T {}` is allowed when every field is itself `Copy`, which is why it is fine for `TaskId` and would be rejected for a type that owned something. If a type that owns a resource could copy itself, you would be back to two owners.

`Copy` comes from `silk/ownership`, which is why the file now imports it.

## Borrowing: looking without taking

Moving is the wrong tool most of the time. When `showBoard` prints the board, it should not take the board away from `report`. It only needs to look. That is what a borrow is for:

```silk
effect fn showBoard(board: &Board) -> () ! LogError ? &mut Logger {
```

`&Board` is a shared reference. The caller writes `showBoard(&board)` and keeps ownership. While the call runs, `showBoard` can read anything in the board but cannot change it or move anything out of it. Any number of shared borrows can exist at once, since readers don't get in each other's way.

Methods borrow their receiver in the same way. `openCount` and `isOpen` take `self: &Self`, so `board.openCount()` lends the board to the method for the length of the call. You don't write `&` at a method call: the receiver type says how it is borrowed.

When a method has to change the value, it takes an exclusive reference, `&mut`:

```silk
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
```

`&mut self.tasks[index]` borrows one element of the array exclusively, so the method can write `task.status`. The task stays inside the board: nothing moves, and the change is made in place.

An exclusive borrow needs something that is allowed to change. Change the first line of `report` to `let board = Board.make()`, without `mut`, and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 4 errors       0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:135:20: error[SEM0057] An exclusive borrow of a binding that is not declared mutable
src/main.silk:136:14: error[SEM0057] An exclusive borrow of a binding that is not declared mutable
src/main.silk:137:14: error[SEM0057] An exclusive borrow of a binding that is not declared mutable
src/main.silk:139:12: error[SEM0057] An exclusive borrow of a binding that is not declared mutable
Failed tasks in 0.17s
```

Each line points at a call to `add` or `complete`, the methods that take `&mut self`. The message says what went wrong: an exclusive borrow needs a binding declared `mut`. You declared `board` immutable, and then asked to lend it out for writing four times. Put the `mut` back.

The same rule applies inside methods. Change `complete` to take `self: &Self`, and `&mut self.tasks[index]` fails:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:76:18: error[SEM0058] A shared view cannot be reborrowed exclusively
Failed tasks in 0.17s
```

A shared reference is a promise to every other reader that the value won't change under them. You can't turn it into a writable one halfway through. Change it back to `&mut Self`.

See **Borrowing** in the reference for the full rules on references, projections like `&mut self.tasks[index]`, and method receivers.

## One writer at a time

Here is the rule that makes borrowing safe: while a value is borrowed, you can have many readers or one writer, never both. The compiler calls each active borrow a *loan*, and checks that loans don't conflict.

To see it, keep a reference to the first task while adding more. Change the top of `report` to this:

```silk
  let milk = board.add(move draft)
  let first = &board.tasks[0]
  drop board.add(Draft { title: "Write the Silk book", priority: Priority.High })
  drop board.add(Draft { title: "Water the plants", priority: Priority.Low })
  run show(first)
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:137:8: error[OWN0010] A mutable borrowed-view loan conflicts with an active shared loan
  note: src/main.silk:136:15: related location
src/main.silk:138:8: error[OWN0010] A mutable borrowed-view loan conflicts with an active shared loan
  note: src/main.silk:136:15: related location
Failed tasks in 0.17s
```

Both notes point at `&board.tasks[0]` on line 136, where the shared loan began.

OWN0010 says a new loan conflicts with an active loan on the same storage, the same memory, and it names both kinds: the new loan is mutable, the active one is shared. The errors point at `board` in the two `add` calls. Each call needs `&mut board`, but `first` is still a live shared loan on part of the board, because `run show(first)` reads it later.

Think about what could go wrong if Silk allowed it. `add` writes into `self.tasks`. Today the array has a fixed size, but in chapter 9 the board grows, and growing can move every task to new memory. Then `first` would point at memory the board no longer uses. Even with a fixed array, a method holding `&mut` is free to overwrite the slot `first` is looking at. The reader would see a task change under it, or see garbage. The one-writer rule makes both impossible without any check at run time.

A loan lasts until the last use of the reference, not until the end of the block. So the fix is to finish with `first` before the next write:

```silk
  let milk = board.add(move draft)
  let first = &board.tasks[0]
  run show(first)
  drop board.add(Draft { title: "Write the Silk book", priority: Priority.High })
  drop board.add(Draft { title: "Water the plants", priority: Priority.Low })
```

```
[ ] #1 Buy milk (normal)
finished #1
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
[ ] #3 Water the plants (low)
2 open
```

The other fix is to copy out what you need. `let firstTitle = board.tasks[0].title` copies the string view, which is `Copy`, and leaves no loan on the board behind. Either way, take the experiment out again so `report` matches the listing at the top.

When you hit OWN0010, ask two questions. Which reference is still alive? Where is it used last? Usually the answer is to move that last use earlier, or to copy a small value out instead of holding a reference.

## How the pieces fit

Step back and look at `report` once more with ownership in mind:

```silk
effect fn report() -> () ! LogError ? &mut Logger {
  let mut board = Board.make()
  let draft = Draft { title: "Buy milk", priority: Priority.Normal }
  let milk = board.add(move draft)
  drop board.add(Draft { title: "Write the Silk book", priority: Priority.High })
  drop board.add(Draft { title: "Water the plants", priority: Priority.Low })

  if board.complete(milk, 3) {
    run Effect.log("finished #{id}\n", &.{ id: milk.0 })
  }
  run showBoard(&board)
}
```

- `board` owns everything. It is `let mut` because `add` and `complete` borrow it exclusively.
- `draft` moves into the board, and its name is dead after that line.
- `milk` is a `TaskId`, which is `Copy`, so it can be passed to `complete` and still be logged.
- `showBoard(&board)` lends the board for reading. After the call, `report` still owns it.
- At the closing brace, `board` is dropped, with every task inside it.

The rules for when values are dropped, and how to write your own cleanup with `Drop`, are in **Ownership and moves** in the reference.

## Summary

- Every value has one owner, and the owner drops it at the end of its scope.
- Moving a named value to a new owner takes an explicit `move`; temporaries move on their own. Using a moved binding is OWN0001.
- Small value types opt into implicit copying with `impl Copy for T {}`, when all their fields are `Copy`.
- `&T` lends a value for reading and `&mut T` lends it for writing; `&mut` needs a `let mut` owner.
- A value can have many readers or one writer at a time. A loan ends at the last use of the reference, so reorder or copy out to fix OWN0010.

Next, chapter 5 lets task titles borrow from text the program reads, and gives those borrows names: lifetimes.
