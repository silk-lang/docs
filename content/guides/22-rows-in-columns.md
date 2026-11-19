# Rows in columns

This guide builds `swarm`, a small particle simulation that keeps its particles in a `ColumnList`. A `List<Particle>` stores whole particles one after another. A `ColumnList<Particle>` stores every `x` together, every `speed` together, and so on, one column for each field. A loop that reads two fields then touches only the bytes of those two fields, which is what a tight loop over many rows wants. Other languages call this layout a struct of arrays; Zig's `MultiArrayList` is the same idea.

```sh
silk init swarm
cd swarm
```

## When a ColumnList pays off

| Use | When |
| --- | --- |
| `List<T>` | Code handles one whole element at a time, or the elements own storage |
| `ColumnList<T>` | There are many rows of a small `Copy` struct, and loops use a few fields at a time |

The row type has no padding inside a `ColumnList`. A struct with `x: f32`, `alive: bool`, `id: u64` and `y: f32` takes 24 bytes in a `List`, because the fields are aligned inside each element. In a `ColumnList` the same row takes 17 bytes, because each column holds one type.

`ColumnList` is ordinary Silk in the std lib. The compiler does not know the type: it reads the fields of your struct with reflection while your program compiles.

## The row type

A row is a struct you declare. It must implement `Copy`, and every field must be `pub`, because each field becomes a column:

```silk
// One row. Every field is `pub`, because each one becomes a column.
struct Particle {
  pub x: f32,
  pub speed: f32,
  pub alive: bool,
  pub id: u64,
}

impl Copy for Particle {}
```

A field that is not `pub` is a compile error at the field:

```
src/main.silk:13:3: error[SEM0177] a ColumnList stores every field in its own column, so `id` must be `pub`
```

`make()` does not allocate. `append` adds a row and grows the list when it is full, so it is an `effect fn` that needs `? &mut Allocator`. All the columns live in one allocation.

## One column

`column` borrows one column as a slice. You name the field with a string literal, and the compiler checks the name against the row type and gives the slice the type of that field:

```silk
fn countAlive(alive: &[bool]) -> usize {
  let mut count: usize = 0
  let mut at: usize = 0
  while at < alive.length {
    if alive[at] {
      count = count + 1
    }
    at = at + 1
  }
  return count
}
```

```silk
countAlive(swarm.column("alive"))
```

`swarm.column("alive")` is a `&[bool]`, and `swarm.column("x")` is a `&[f32]`. A name that is not a field is an error at the literal:

```
src/main.silk:60:36: error[SEM0022] main.Particle has no field alife
```

`columnMut` borrows one column as `&mut [V]`, to change it in place.

## Several columns at once

A step of the simulation writes `x` and `alive` while it reads `speed`. Two calls of `columnMut` cannot both be alive, because each borrows the whole list. A view borrows several columns together. It is a struct you declare: each field has the name of a field of the row and is a slice of that field's type, `&'a [V]` to read or `&'a mut [V]` to write. An empty `ColumnView` conformance says which row type it views:

```silk
// The columns one step uses: it writes `x` and `alive`, and only reads `speed`.
struct Step<'a> {
  pub x: &'a mut [f32],
  pub speed: &'a [f32],
  pub alive: &'a mut [bool],
}

impl<'a> ColumnView<'a, Particle> for Step<'a> {}

// Moves every particle, and marks the ones that pass the wall.
fn advance(step: Step<'_>, seconds: f32, wall: f32) -> () {
  let mut at: usize = 0
  while at < step.x.length {
    step.x[at] = step.x[at] + step.speed[at] * seconds
    if step.x[at] > wall {
      step.alive[at] = false
    }
    at = at + 1
  }
}
```

The signature of `advance` says which columns it can read and which it can change. `columnsMut<Step>()` fills the view, and `columns<View>()` does the same for a view that only reads:

```silk
let step = swarm.columnsMut<Step>()
advance(move step, 1.0, 10.0)
```

A view field that is not a field of the row is an error at that field:

```
src/main.silk:23:7: error[SEM0177] `Particle` has no field `heat`, so a view of its columns cannot have one
```

## A column or a view borrows the list

A column or a view borrows the list for as long as you use it, so the list cannot grow or lose rows under it. Using `step` after an `append` is OWN0010:

```
src/main.silk:66:9: error[OWN0010] A mutable borrow of `swarm` conflicts with an earlier mutable borrow of it that is still in use; use that borrow for the last time before this one
```

Use the view for the last time before you change the list, as the program below does: each tick takes a new view.

## Putting it together

`simulate` builds six particles, runs two steps, counts the particles still alive from one column, removes the rest, and prints what is left:

```silk
effect fn simulate() -> () ! WriterError | OutOfMemoryError ? &mut Writer | &mut Allocator {
  let mut swarm = ColumnList<Particle>.make()
  let mut id: u64 = 0
  let mut speed: f32 = 1.0
  while id < 6 {
    run swarm.append(Particle { x: 0.0, speed, alive: true, id })
    id = id + 1
    speed = speed + 1.5
  }

  let mut tick: usize = 0
  while tick < 2 {
    let step = swarm.columnsMut<Step>()
    advance(move step, 1.0, 10.0)
    tick = tick + 1
  }
  run Format.format("{alive} of {total} are alive\n", &.{
    alive: countAlive(swarm.column("alive")),
    total: swarm.length(),
  })

  // Remove the rows that are not alive. `swapRemove` moves the last row into the gap.
  let mut at: usize = 0
  while at < swarm.length() {
    if swarm.column("alive")[at] {
      at = at + 1
    } else {
      drop swarm.swapRemove(at)
    }
  }

  let ids = swarm.column("id")
  let xs = swarm.column("x")
  at = 0
  while at < ids.length {
    run Format.format("particle {id} at {x}\n", &.{ id: ids[at], x: xs[at] })
    at = at + 1
  }
}

pub effect fn main() -> i32 ! WriterError | OutOfMemoryError {
  let mut out = StdoutWriter.make()
  let mut allocator = Allocator.systemAllocatorProvider()
  run simulate()
    |> Effect.provideMut<Writer>(&mut out)
    |> Effect.provideMut<Allocator>(&mut allocator)
  return 0
}
```

`get(index)` gathers one whole row from the columns, and `set` writes one back. `remove` keeps the order of the rows and moves every later row down. `swapRemove` moves only the last row into the gap, so it is the one to use when the order does not matter. `pop`, `insert`, `clear`, `truncate`, `reserve` and `shrinkToFit` work as they do on `List`.

The imports:

```silk
import silk.collections.column_list { ColumnList, ColumnView }
import silk.core.effect { Effect }
import silk.core.ownership { Copy }
import silk.io.writer { Writer, WriterError }
import silk.io.writer_native { StdoutWriter }
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.text.format { Format }
```

## Run it

```sh
silk run
```

```
3 of 6 are alive
particle 0 at 2
particle 1 at 5
particle 2 at 8
```

The particles move at speeds from 1 to 8.5. After two steps the three fastest are past the wall at 10 and are marked. The loop then removes them, and the three that remain are printed.

## What a ColumnList does not do yet

Rows must be `Copy`, so a row cannot own a `String` or a `List`. A field that is itself a struct is one column of that struct. Sorting the rows by one column is not in this release.

## API reference

- `silk/collections/column_list`: `ColumnList`, `ColumnView`
- `silk/collections/list`: `List`
- `silk/core/ownership`: `Copy`
- `silk/mem/allocator`: `Allocator`, `OutOfMemoryError`
