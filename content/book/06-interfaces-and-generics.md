# 6. Interfaces and generics

At the end of chapter 5, `tasks` parses a board out of text and prints it. To print a priority it calls `priorityLabel`, and to print an id it reaches inside with `task.id.0`. Counting open tasks needs a hand-written loop, and so would every other kind of count. This chapter teaches your types to print and compare themselves, and lets one counting function work with any rule you give it.

## Printing your own types

Here is the line that prints one task, as chapter 5 left it:

```silk
effect fn show(task: &Task) -> () ! LogError ? &mut Logger {
  run Effect.log("{mark} #{id} {title} ({priority})\n", &.{
    mark: statusMark(task),
    id: task.id.0,
    title: task.title,
    priority: priorityLabel(task.priority),
  })
}
```

Every value in that record is a number or a string. It would be nicer to hand the template a `Priority` and a `TaskId` directly. Try it with a smaller example first, in the scratch project from chapter 5. This program logs a `Status` value:

```silk
import silk.effect { Effect }
import silk.logger { LogError }
import silk.os_logger { StdoutLogger }

union Status {
  Open,
  Done { day: u32 },
}

pub effect fn main() -> () ! LogError {
  let mut logger = StdoutLogger.make()
  let status = Status.Done { day: 3 }
  run Effect.log("status: {status}\n", &.{ status: move status })
    |> Effect.provideMut(&mut logger)
}
```

```sh
silk check
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.19s
[x86_64-unknown-linux-gnu]
src/main.silk:13:7: error[SEM0121] `main.Status: silk.format.Display` cannot be proved: no implementation of `silk.format.Display` exists for `main.Status`
Failed scratch in 0.25s
```

The error points at the `Effect.log` call. `Effect.log` walks the template at compile time, and for each placeholder it calls `Format.display` on the matching field. `Format.display` only accepts types that implement the `Display` interface from `silk/format`. The message reads as a claim the compiler had to prove, `main.Status: silk.format.Display`, "`Status` in module `main` implements `Display`", and the reason it could not: there is no implementation.

So when a template fails, check two things: the placeholder names, and whether every value you pass has `Display`. Numbers, strings, `bool` and `char` have it. So do your own types once you write an impl.

## Interfaces and impls

An interface names a set of operations. Here is `Display` from `silk/format`, without its doc comments:

```silk
pub interface Display {
  effect fn display(
    self: &Self,
    formatter: &mut Formatter
  ) -> () ! WriterError ? &mut Writer
}
```

An interface has signatures only, no bodies. `Self` stands for whatever type implements it. This one says: give me a shared reference to the value and a `Formatter`, and I will write text to the current `Writer`. It is an `effect fn` because writing can fail. Chapter 7 explains effects properly; for now, read `! WriterError` as "may fail with a writer error" and `? &mut Writer` as "needs a writer to write to".

An `impl` makes a type conform by supplying each operation. Add this after `enum Priority`:

```silk
// Templates can print any value whose type implements Display.
impl Display for Priority {
  effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    let label = match self.* {
      Priority.Low => "low"
      Priority.Normal => "normal"
      Priority.High => "high"
    }
    run Format.writeText(&mut formatter, label)
  }
}
```

The body is the old `priorityLabel`, plus one call that writes the label. `match self.*` reads the enum through the reference; enums are `Copy`, so that is fine. You can delete `priorityLabel` now.

A `TaskId` should print as `#1`. Its impl writes the `#` and then hands the number to `Format.display`, which already knows how to print a `u32`:

```silk
impl Display for TaskId {
  effect fn display(self: &Self, formatter: &mut Formatter) -> () ! WriterError ? &mut Writer {
    run Format.writeText(&mut formatter, "#")
    run Format.display(&self.0)
  }
}
```

The new names come from three modules. Add these imports:

```silk
import silk.format { Display, Format, Formatter }
import silk.writer { Writer, WriterError }
```

Now `show` can pass the values themselves. The `#` moved into `TaskId`, so the template loses it:

```silk
effect fn show(task: &Task) -> () ! LogError ? &mut Logger {
  run Effect.log("{mark} {id} {title} ({priority})\n", &.{
    mark: statusMark(task),
    id: task.id,
    title: task.title,
    priority: task.priority,
  })
}
```

The output is the same as before, and that is the point. The knowledge of how a priority looks now lives with `Priority`, and every template in the program can use it.

## Comparing values

Chapter 3 compared priorities with `==`. It is tempting to ask whether one priority is at least another:

```silk
enum Priority {
  Low,
  Normal,
  High,
}

pub fn main() -> i32 {
  let priority = Priority.High
  if priority >= Priority.Normal {
    return 0
  }
  return 1
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.12s
[x86_64-unknown-linux-gnu]
src/main.silk:9:15: error[SEM0157] Enum Priority has no order, so >= does not apply; compare backing values with `Priority.value(...)` instead
Failed scratch in 0.18s
```

SEM0157 says that enum values can't be ordered directly. Silk won't guess that the order you declared the members in is an order you meant. Maybe `High` is first for a reason. You decide by implementing the `Order` interface from `silk/order`.

`Order` has one operation, `compare`, which takes two references and returns an `Ordering`: `Less`, `Equal` or `Greater`. Write it as an ordinary function. `Priority.value(p)` gives a member's integer: 0, 1 and 2 here.

```silk
fn comparePriority(left: &Priority, right: &Priority) -> Ordering {
  let a = Priority.value(left.*)
  let b = Priority.value(right.*)
  if a < b {
    return Ordering.Less
  }
  if a > b {
    return Ordering.Greater
  }
  return Ordering.Equal
}

// With Order, priorities support <, <=, > and >= (on references).
impl Order for Priority { compare: comparePriority }
```

This impl uses the short form. Instead of writing the body inside the impl, `compare: comparePriority` binds the operation to a function that already exists. Both forms are fine; use the short one when the function is useful on its own.

Notice the comment: the operators work on references. `Order.compare` takes `&Self`, so you write `&a >= &b`. Comparing two big values never copies them.

`TaskId` has the same gap for equality. In `Board.complete`, chapter 5 compared ids by reaching inside: `task.id.0 == id.0`. Try comparing the ids themselves:

```silk
      if task.id == id {
```

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.06s
  check    failed: 2 modules, 1 error        0.15s
[x86_64-unknown-linux-gnu]
src/main.silk:122:18: error[SEM0135] Operator == does not accept (main.TaskId, main.TaskId)
Failed tasks in 0.21s
```

SEM0135 says that `==` is backed by an interface, and no impl of it accepts two `TaskId` values. The `main.` in front is the module that declares the type. Enums get `==` for free, by value. Tuples and structs don't, because "equal" can mean different things for different data. The `Equal` interface from `silk/equal` lets you say what it means, and like `Order` it works on references:

```silk
fn sameId(left: &TaskId, right: &TaskId) -> bool {
  return left.0 == right.0
}

impl Equal for TaskId { equals: sameId }
```

Now `complete` reads the way you would say it:

```silk
  fn complete(self: &mut Self, id: TaskId, day: u32) -> bool {
    let mut index: usize = 0
    while index < self.count {
      let task = &mut self.tasks[index]
      if &task.id == &id {
        task.status = Status.Done { day: day }
        return true
      }
      index = index + 1
    }
    return false
  }
```

Add the imports for the two interfaces and `Ordering`:

```silk
import silk.equal { Equal }
import silk.order { Order, Ordering }
```

See **Interfaces and impls** in the reference for the full table of operator interfaces, including `Add`, `Multiply` and the rest.

## An interface of your own

The board has `openCount`, a loop that counts open tasks. Soon you will want "how many are high priority" and "how many are open and urgent". Each would be the same loop with a different test in the middle.

An interface can name that test. Call it `Filter`: anything that can decide whether to keep a task.

```silk
// A filter decides which tasks to keep. Any type can be a filter by implementing it.
interface Filter {
  fn keep(filter: &Self, task: &Task) -> bool
}
```

The receiver is an ordinary parameter. Its name is up to you, and here `filter` reads better than `self`. The first filter keeps open tasks. It needs no data, so it is an empty struct:

```silk
struct OpenTasks {}

impl Filter for OpenTasks {
  fn keep(filter: &Self, task: &Task) -> bool {
    return task.isOpen()
  }
}
```

The second keeps tasks at or above a priority. It carries the threshold as a field, and uses the `Order` impl you just wrote:

```silk
struct AtLeast { priority: Priority }

impl Filter for AtLeast {
  fn keep(filter: &Self, task: &Task) -> bool {
    return &task.priority >= &filter.priority
  }
}
```

An impl must supply every operation in the interface, with a matching signature. Here is what happens when it doesn't:

```silk
interface Filter {
  fn keep(filter: &Self, priority: i32) -> bool
}

struct Urgent {}

impl Filter for Urgent {
}

pub fn main() -> i32 {
  return 0
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.04s
  check    failed: 2 modules, 1 error        0.14s
[x86_64-unknown-linux-gnu]
src/main.silk:7:1: error[SEM0083] Invalid conformance: `Filter` requires `keep`, which this implementation does not define
Failed scratch in 0.19s
```

SEM0083 is the code for an impl that doesn't fit its interface: a member is missing, extra, repeated or has the wrong signature. The message names the interface and the member. A missing member is reported at the `impl` line. A member with the wrong signature is reported at that member, and the message says what differs, such as ``member `keep` does not match the operation of `Filter`: it returns a different type``.

## Generic functions

Now write the counting loop once. It takes any filter:

```silk
// Generic over any Filter: one copy of this function is compiled per filter type.
fn count<F: Filter>(board: &Board, filter: &F) -> i32 {
  let mut total = 0
  let mut index: usize = 0
  while index < board.count {
    if filter.keep(&board.tasks[index]) {
      total = total + 1
    }
    index = index + 1
  }
  return total
}
```

`<F: Filter>` declares a type parameter `F` with a bound. Inside the body, the bound is all the compiler knows about `F`, and it is enough: it allows `filter.keep(...)`. At each call, Silk infers `F` from the argument and checks that the type really implements `Filter`.

Why not write `filter: &Filter`? Because an interface is not a type. Silk has no runtime lookup tables for interfaces. Each call with a new type compiles a separate copy of `count`, where `keep` is a direct call to that type's impl. You pay nothing at run time for the abstraction. See **Generics** in the reference for inference rules and bounds.

`openCount` can go. `showBoard` counts with the new function:

```silk
  run Effect.log("{open} open\n", &.{ open: count(board, &OpenTasks {}) })
```

`OpenTasks {}` builds an empty struct, and `&` lends it for the call.

## Closures

Interfaces are the right tool when a rule has a name and maybe some data, like `AtLeast`. For a one-off test, declaring a struct and an impl is a lot of ceremony. Silk also has function values. A parameter of type `fn(&Task) -> bool` accepts any function with that shape:

```silk
// The lightweight version: pass a function value or a closure.
fn countWhere(board: &Board, keep: fn(&Task) -> bool) -> i32 {
  let mut total = 0
  let mut index: usize = 0
  while index < board.count {
    if keep(&board.tasks[index]) {
      total = total + 1
    }
    index = index + 1
  }
  return total
}
```

You can pass a named function, or write one in place with a function literal. Extend `report`:

```silk
effect fn report() -> () ! LogError ? &mut Logger {
  let board = parseBoard(SEED)
  run showBoard(&board)
  run Effect.log("longest title: {title}\n", &.{ title: board.longestTitle() })

  let important = count(&board, &AtLeast { priority: Priority.Normal })
  let wanted = Priority.High
  let urgentOpen = countWhere(&board, fn(task: &Task) -> bool {
    return task.isOpen() && task.priority == wanted
  })
  run Effect.log("{important} normal or higher, {urgent} urgent and open\n", &.{
    important: important,
    urgent: urgentOpen,
  })
}
```

The literal `fn(task: &Task) -> bool { ... }` uses `wanted`, a local of `report`. A function literal that uses outer locals is a closure, and those locals are its captures. There is no capture list. The compiler picks a mode for each capture from how the body uses it:

| The body | The capture |
| --- | --- |
| only reads a `Copy` value | copies it when the closure is built |
| only reads a non-`Copy` value | borrows it while the closure lives |
| assigns to it | borrows it mutably while the closure lives |
| moves it with `move` | moves it into the closure |

`wanted` is a `Priority`, which is `Copy`, so the closure holds its own copy.

Assigning to a capture changes what the closure is. Here is a counter that bumps an outer local:

```silk
pub fn main() -> i32 {
  let mut added = 0
  let next = fn() -> i32 {
    added = added + 1
    return added
  }
  return next() - 1
}
```

```
Checking scratch (x86_64-unknown-linux-gnu)
  load     51 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.10s
[x86_64-unknown-linux-gnu]
src/main.silk:7:10: error[SEM0077] `next` changes what it captures, so calling it needs a mutable binding; declare it `let mut next`
Failed scratch in 0.16s
```

The error is at the call, `next()` on line 7. Because the body assigns to `added`, `next` is a `mut fn`: each call changes state. Silk makes that visible at the binding, the same way it does for a mutable variable. SEM0077 says the call needs more access to `next` than the binding gives. Here, you called a `mut fn` through a binding that isn't `mut`.

The fix is `let mut next`. There is a second detail. While `next` is alive, it holds the mutable borrow of `added`, so you can't read `added` yourself. `drop next` ends the closure and its borrow:

```silk
pub fn main() -> i32 {
  let mut added = 0
  let mut next = fn() -> i32 {
    added = added + 1
    return added
  }
  let first = next()
  let second = next()
  drop next
  if added != 2 || first + second != 3 {
    return 1
  }
  return 0
}
```

This one checks, runs, and exits with status 0. The rules are the borrowing rules from chapter 4, applied to a captured environment. See **Closures and callable types** in the reference for `once fn`, staged calls and bound methods.

## Run it

Here is the top of `src/main.silk` with all its imports:

```silk
import silk.effect { Effect }
import silk.equal { Equal }
import silk.format { Display, Format, Formatter }
import silk.logger { Logger, LogError }
import silk.order { Order, Ordering }
import silk.os_logger { StdoutLogger }
import silk.ownership { Copy }
import silk.string { String }
import silk.writer { Writer, WriterError }
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
2 normal or higher, 1 urgent and open
```

The first five lines match chapter 5 exactly, though the code that prints them changed. The last line comes from both kinds of counting: `AtLeast` keeps "Buy milk" and "Write the Silk book", and the closure keeps only the open high-priority task.

## Summary

- You can implement a standard interface such as `Display` so templates print your types, and you know that SEM0121 naming `silk.format.Display` means a value lacks `Display`.
- You can give your types `<`, `>=`, `==` and friends with `Order` and `Equal`, and you compare them through references: `&a >= &b`.
- You can declare an interface, implement it with full bodies or with `name: function` bindings, and read SEM0083 when an impl doesn't fit.
- You can write a generic function with a bound, `count<F: Filter>`, which compiles to a direct call for each type.
- You can pass closures, and you know a closure that assigns to a capture is a `mut fn` that needs `let mut`.

Chapter 7 turns `tasks` into a real command-line program, and explains the `effect fn` and `run` you have been using since chapter 1.
