# 3. Modeling data

At the end of chapter 2, a task was a position shared by two arrays: an estimate in one and a done flag in the other. Nothing tied them together, and nothing stopped you from mixing up a task number with a count of minutes. This chapter gives `tasks` real types: a priority, a task id, a status that can carry data, a `Task` that holds them all, and a `Command` for what the user asks the program to do. You read those types with `match`, which the compiler checks for every case.

## A fresh start for main.silk

The report from chapter 2 has served its purpose. Replace `src/main.silk` with the version built in this chapter. Keep the imports and `main`. Everything between them is new, including the body of `report`.

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }
```

You no longer need `silk.usize`, so that import goes.

## Enums: a fixed set of names

A task's priority is one of three choices. An `enum` names a fixed set of values:

```silk
enum Priority {
  Low,
  Normal,
  High,
}
```

Members are separated by commas, and the trailing comma is allowed. You write a member with its enum's name: `Priority.High`. There is no bare `High`. That keeps names from colliding when two types both have a `High`.

An enum is a small integer underneath, but it never mixes with integers. `Priority.High == 2` is an error. Two values of the same enum compare with `==` and `!=`. Enum values are also copied freely, like numbers.

To show a priority, turn it into text. That is a job for `match`:

```silk
fn priorityLabel(priority: Priority) -> string<'static> {
  return match priority {
    Priority.Low => "low"
    Priority.Normal => "normal"
    Priority.High => "high"
  }
}
```

`match` looks at a value and picks the first arm whose pattern fits. Each arm is a pattern, `=>`, and a result. Arms follow each other with no commas between them.

Unlike `if`, `match` is an expression: it has a value, so you can `return` it directly. This is where you choose between values in Silk.

The compiler checks that the arms cover every member. Delete the `Priority.High` arm and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:26:10: error[SEM0158] Match over Priority does not cover High
Failed tasks in 0.17s
```

Line 26 is the `match`. The message names the enum and the member that has no arm: `Priority.High`. This check is what makes adding a fourth priority safe later: every `match` that forgot it becomes an error. Put the arm back.

## Tuples: a number with a meaning

Task ids are numbers, but they are not just any numbers. You should not be able to pass a count of minutes where an id belongs. A `tuple` declaration gives a value its own type:

```silk
tuple TaskId(u32)
```

`TaskId` holds one `u32`. You build one like a function call, `TaskId(1)`, and read the number back with `.0`. A tuple with two parts would use `.0` and `.1`.

Ids are never negative, so the inner type is `u32`, an unsigned 32-bit integer.

## Unions: choices that carry data

A task is either open or done. When it is done, you also want to know which day it was finished. An enum cannot hold that day. A `union` can:

```silk
union Status {
  Open,
  Done { day: u32 },
}
```

Each value of a union is exactly one of its variants. `Open` is a bare variant with no data. `Done { day: u32 }` carries a named field. You build them as `Status.Open` and `Status.Done { day: 3 }`.

So when do you pick which?

- Use an `enum` when the choices are only names, like priorities. Enums are compact, copy freely and compare with `==`.
- Use a `union` when some choices carry data, or when different choices carry different data. Unions are read with `match`.

There is no way to read `day` with a dot on a `Status`, because an open task has no day. You get at it only by matching the `Done` variant. The compiler will not let you read data that is not there.

The day is a plain `u32` for now. Chapter 8 replaces it with a real time from the system clock.

## Structs: one task

Now put the pieces together:

```silk
struct Task {
  id: TaskId,
  title: string<'static>,
  priority: Priority,
  status: Status,
}
```

A `struct` has named fields, each with a type. Fields are separated by commas, and a trailing comma after the last one is allowed.

The title is a `string<'static>`, text that lives as long as the program, like a literal. Real titles will come from the user and from a file, and they will not live forever. Chapter 5 teaches you to say how long text lives. Until then, `'static` keeps things simple. Writing a bare `string` here may seem to work at first, but it leads to confusing errors as soon as you add methods to the type. Write the `'static`.

Build a task with a struct literal. Its fields are separated by commas too:

```silk
  let milk = Task {
    id: TaskId(1),
    title: "Buy milk",
    priority: Priority.Normal,
    status: Status.Done { day: 3 },
  }
```

Every field must be given. The new `TaskId` type earns its keep at once. Write `id: 1` by habit, and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:51:9: error[SEM0025] Field id expects main.TaskId but received i32
Failed tasks in 0.17s
```

A clear message: the field wants a `TaskId`, and you gave it a number. `main.TaskId` is the full name of the type, `TaskId` in the module `main`. Write `TaskId(1)`.

See **Structs, tuples and arrays** and **Enums and unions** in the reference for all the declaration rules.

## Looking at a status without taking it

Each task shows a mark: `[ ]` when open and `[x]` when done. Here is the function:

```silk
fn statusMark(status: &Status) -> string<'static> {
  return match &status.* {
    Status.Open => "[ ]"
    Status.Done { .. } => "[x]"
  }
}
```

There is new syntax here, and it all has to do with not taking things that belong to someone else.

The parameter type `&Status` is a reference to a status. `statusMark` only needs to look, so the caller lends it the status instead of handing it over. You will write `&task.status` at the call.

`status.*` follows the reference to the status itself. `&status.*` says how `match` should treat it: borrow it and only look. The pattern `Status.Done { .. }` matches the `Done` variant and skips its fields with `..`.

Why all this, when `priorityLabel` could just write `match priority`? Because a `Priority` is copied freely and a `Status` is not. A union might hold large data, so Silk does not copy it behind your back. A plain `match` would need its own copy. Try it, writing `match status.*` without the `&`:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 2 errors       0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:34:16: error[OWN0003] `match status.*` moves `status.*`; write `match move status.*` to take it apart, or `match &status.*` to look at it
src/main.silk:34:16: error[OWN0012] A non-Copy value cannot be moved out through a borrowed-view place
Failed tasks in 0.17s
```

OWN codes come from the ownership checker. `Copy` is the name for types that copy freely, like numbers and enums, and `Status` is not one of them. So a plain `match` would use up the status itself, and Silk wants you to write `move` when you mean that. But `statusMark` only borrowed the status, and it has no business using it up, which is what OWN0012 adds: nothing can be moved out through a borrow. For a `match`, the answer is almost always `&`: look at the value where it is. Chapter 4 is all about ownership and explains the other options.

Remember the shape `match &x.*` for references, and `match &x` for a local value you only want to read.

## Showing tasks

Now show a task through the logger:

```silk
effect fn show(task: &Task) -> () ! LogError ? &mut Logger {
  run Effect.log("{mark} #{id} {title} ({priority})\n", &.{
    mark: statusMark(&task.status),
    id: task.id.0,
    title: task.title,
    priority: priorityLabel(task.priority),
  })
}
```

`show` also borrows its task. Reading a field through a reference needs no `.*`: `task.title` works directly. `task.id.0` reads the number inside the `TaskId`, because the template does not know how to print a `TaskId` yet. Chapter 6 teaches it.

`report` now makes two tasks and shows them:

```silk
effect fn report() -> () ! LogError ? &mut Logger {
  let milk = Task {
    id: TaskId(1),
    title: "Buy milk",
    priority: Priority.Normal,
    status: Status.Done { day: 3 },
  }
  let book = Task {
    id: TaskId(2),
    title: "Write the Silk book",
    priority: Priority.High,
    status: Status.Open,
  }
  run show(&milk)
  run show(&book)
}
```

`main` stays as it was in chapter 2. Run it:

```sh
silk run
```

```
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
```

## Commands

The program will soon read commands like `tasks add` or `tasks done 2` from the command line. Before parsing anything, decide what a command is. It is one of a few choices, and some carry data. That is a union:

```silk
union Command {
  List,
  Add { title: string<'static>, priority: Priority },
  Done { id: TaskId },
}
```

Put it after `Task`. Variant fields are separated by commas, as struct fields are.

To check that commands read well, describe one in words. Add this after `statusMark`:

```silk
fn describe(command: &Command) -> string<'static> {
  return match &command.* {
    Command.List => "list every task"
    Command.Add { priority, .. } if priority == Priority.High => "add an urgent task"
    Command.Add { .. } => "add a task"
    Command.Done { .. } => "mark a task done"
  }
}
```

Two new things appear in the `Add` arms.

`Command.Add { priority, .. }` binds the `priority` field to a name you can use in the arm. Under `match &`, the binding only reads the field.

`if priority == Priority.High` after the pattern is a guard. The arm runs only when the pattern matches and the guard is `true`. If it is `false`, the `match` carries on to the next arm, so ordinary `Add` commands land in the plain `Command.Add { .. }` arm. Order matters: the more specific arm goes first.

The `'static` on the title says where its text lives. Leave it off, writing `Add { title: string, priority: Priority }`, and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    2 modules                         0.12s
  borrow   174 bodies                        0.01s
Finished tasks in 0.18s
```

It passes, but the meaning changed. `string` takes one argument, the lifetime in angle brackets. A field that leaves it out gives `Command` a hidden lifetime parameter: a command now borrows its title from *some* text, and the type carries that borrow wherever it goes. Chapter 5 is all about such borrows. For now every title is a literal, so say so: write `string<'static>` again.

Guards are useful, but the compiler cannot see inside them. A guarded arm does not count when the compiler checks that every case is covered. Delete the `Command.Done` arm and check:

```
Checking tasks (x86_64-unknown-linux-gnu)
  load     53 modules, 1 in package          0.05s
  check    failed: 2 modules, 1 error        0.11s
[x86_64-unknown-linux-gnu]
src/main.silk:47:10: error[SEM0044] Match does not cover Done
Failed tasks in 0.17s
```

SEM0044 is the union version of SEM0158: the `match` on line 47 does not cover every variant, and the message names the one that has no arm, `Done`. Put it back. This is the check that will keep the command handling honest as new commands arrive in later chapters.

Finally, at the end of `report`, describe a command:

```silk
  let next = Command.Add { title: "Water the plants", priority: Priority.High }
  run Effect.log("next command: {what}\n", &.{ what: describe(&next) })
```

```sh
silk run
```

```
[x] #1 Buy milk (normal)
[ ] #2 Write the Silk book (high)
next command: add an urgent task
```

The urgent arm won, because the guard saw `Priority.High`.

## The whole file

```silk
import silk.effect { Effect }
import silk.logger { Logger, LogError }
import silk.os_logger { StdoutLogger }

enum Priority {
  Low,
  Normal,
  High,
}

tuple TaskId(u32)

union Status {
  Open,
  Done { day: u32 },
}

struct Task {
  id: TaskId,
  title: string<'static>,
  priority: Priority,
  status: Status,
}

union Command {
  List,
  Add { title: string<'static>, priority: Priority },
  Done { id: TaskId },
}

fn priorityLabel(priority: Priority) -> string<'static> {
  return match priority {
    Priority.Low => "low"
    Priority.Normal => "normal"
    Priority.High => "high"
  }
}

fn statusMark(status: &Status) -> string<'static> {
  return match &status.* {
    Status.Open => "[ ]"
    Status.Done { .. } => "[x]"
  }
}

fn describe(command: &Command) -> string<'static> {
  return match &command.* {
    Command.List => "list every task"
    Command.Add { priority, .. } if priority == Priority.High => "add an urgent task"
    Command.Add { .. } => "add a task"
    Command.Done { .. } => "mark a task done"
  }
}

effect fn show(task: &Task) -> ()
  ! LogError
  ? &mut Logger {
  run Effect.log(
    "{mark} #{id} {title} ({priority})\n",
    &.{
      mark: statusMark(&task.status),
      id: task.id.0,
      title: task.title,
      priority: priorityLabel(task.priority),
    }
  )
}

effect fn report() -> ()
  ! LogError
  ? &mut Logger {
  let milk = Task {
    id: TaskId(1),
    title: "Buy milk",
    priority: Priority.Normal,
    status: Status.Done { day: 3 },
  }
  let book = Task {
    id: TaskId(2),
    title: "Write the Silk book",
    priority: Priority.High,
    status: Status.Open,
  }
  run show(&milk)
  run show(&book)

  let next = Command.Add { title: "Water the plants", priority: Priority.High }
  run Effect.log("next command: {what}\n", &.{ what: describe(&next) })
}

pub effect fn main() -> ()
  ! LogError {
  let mut logger = StdoutLogger.make()
  run report() |> Effect.provideMut(&mut logger)
}
```

See **Patterns and match** in the reference for every kind of pattern and the other ways `match` can treat its subject.

## Summary

- An `enum` names a fixed set of choices. Its values copy freely and compare with `==`.
- A `union` is one of several variants, and variants can carry named fields. You read the fields only by matching.
- A `tuple` like `TaskId(u32)` gives a plain value its own type, so it cannot be mixed up with other numbers.
- A `struct` groups named fields. Literals must give every field. Use `string<'static>` for text fields for now.
- `match` is an expression that must cover every case. Guards refine an arm but do not count toward coverage.
- Use `match &x.*` to look at a value behind a reference without moving it.

Next, chapter 4 collects tasks on a board and explains who owns each value, and what `&`, `&mut` and `move` really mean.
