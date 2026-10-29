# A tour of Silk

This page reads one small program from top to bottom. It models a shopping basket and tries to pay for it three ways. On the way you meet structs and unions, `match`, bindings, borrows and moves, an effect function that can fail, and the standard library. Each section names the reference page with the full rules.

## The program

Make a package with `silk init tour` and put this in `src/main.silk`:

```silk
import silk.mem.allocator { Allocator, OutOfMemoryError }
import silk.core.effect { Effect }
import silk.collections.list { List }
import silk.io.logger { Logger, LogError }
import silk.io.logger_native { StdoutLogger }
import silk.core.result { Result }

struct Item {
  name: string,
  cents: i32,
}

union Payment {
  Cash,
  Card { limit: i32 },
  Voucher { cents: i32 },
}

struct Declined {
  reason: string,
}

fn total(items: &List<Item>) -> i32 {
  let all = List<Item>.asSlice(items)
  let mut sum = 0
  let mut index: usize = 0
  while index < all.length {
    sum = sum + all[index].cents
    index = index + 1
  }
  return sum
}

fn label(payment: &Payment) -> string {
  return match &payment.* {
    Payment.Cash => "cash"
    Payment.Card { .. } => "card"
    Payment.Voucher { .. } => "voucher"
  }
}

effect fn charge(amount: i32, payment: &Payment) -> i32
  ! Declined {
  match &payment.* {
    Payment.Cash => {}
    Payment.Card { limit, .. } => {
      if amount > limit {
        fail Declined { reason: "over the card limit" }
      }
    }
    Payment.Voucher { cents } => {
      if amount > cents {
        fail Declined { reason: "the voucher is too small" }
      }
      return 0
    }
  }
  return amount
}

effect fn checkout(items: &List<Item>, payment: &Payment) -> ()
  ! LogError
  ? &mut Logger {
  let amount = total(items)
  run Effect.log("total {amount} cents, ", &.{ amount: amount })
  let outcome = run Effect.result(charge(amount, payment))
  match move outcome {
    Result<i32, Declined>.Success { value } => {
      run Effect.log("{how} paid {value} cents\n", &.{ how: label(payment), value: value })
    }
    Result<i32, Declined>.Failure { error } => {
      run Effect.log("{how} declined: {reason}\n", &.{ how: label(payment), reason: error.reason })
    }
  }
}

pub effect fn main() -> ()
  ! LogError | OutOfMemoryError {
  let mut logger = StdoutLogger.make()
  let mut allocator = Allocator.systemAllocatorProvider()

  let mut basket = List<Item>.make()
  let tea = Item { name: "tea", cents: 450 }
  run List<Item>.append(&mut basket, move tea) |> Effect.provideMut<Allocator>(&mut allocator)
  run List<Item>.append(&mut basket, Item { name: "scones", cents: 700 })
    |> Effect.provideMut<Allocator>(&mut allocator)

  let card = Payment.Card { limit: 1000 }
  let voucher = Payment.Voucher { cents: 2000 }
  run checkout(&basket, &card) |> Effect.provideMut(&mut logger)
  run checkout(&basket, &voucher) |> Effect.provideMut(&mut logger)
  run checkout(&basket, &Payment.Cash) |> Effect.provideMut(&mut logger)
}
```

Run it:

```sh
silk run
```

```
total 1150 cents, card declined: over the card limit
total 1150 cents, voucher paid 0 cents
total 1150 cents, cash paid 1150 cents
```

## Imports

```silk
import silk.collections.list { List }
import silk.io.logger { Logger, LogError }
```

Nothing from the standard library is in scope until you import it. `silk.collections.list` is the module `silk/collections/list`, and `{ List }` brings its `List` type into this file. The program uses six modules: memory allocation (`silk/mem/allocator`), effects (`silk/core/effect`), growable lists (`silk/collections/list`), logging (`silk/io/logger` and `silk/io/logger_native`) and results (`silk/core/result`). Each has a page in the Std lib API reference, under the same name.

## Structs and unions

```silk
struct Item {
  name: string,
  cents: i32,
}

union Payment {
  Cash,
  Card { limit: i32 },
  Voucher { cents: i32 },
}
```

A `struct` groups named fields. You build one with a literal, `Item { name: "tea", cents: 450 }`. `string` is a borrowed view of UTF-8 text; a string literal lives for the whole program. See **Structs, tuples and arrays** and **Values and primitive types**.

A `union` is a tagged union: a `Payment` is exactly one of its variants, and each variant can carry its own fields. `Payment.Card { limit: 1000 }` builds one variant. See **Enums and unions**.

`Declined` is an ordinary struct too. It becomes a failure only because `charge` fails with it.

## Bindings and loops

```silk
fn total(items: &List<Item>) -> i32 {
  let all = List<Item>.asSlice(items)
  let mut sum = 0
  let mut index: usize = 0
  while index < all.length {
    sum = sum + all[index].cents
    index = index + 1
  }
  return sum
}
```

`let` binds a name that cannot be reassigned. `let mut` allows it. The type is inferred unless you write it, as in `index: usize`. `all` is a slice of the list's items, and `all[index]` is bounds-checked. See **Bindings and statements**, **Control flow** and **Functions and methods**.

## match

```silk
fn label(payment: &Payment) -> string {
  return match &payment.* {
    Payment.Cash => "cash"
    Payment.Card { .. } => "card"
    Payment.Voucher { .. } => "voucher"
  }
}
```

`match` picks the first arm whose pattern fits, and is an expression, so it can be returned. The arms must cover every variant. Delete the `Voucher` arm and `silk check` reports `error[SEM0044] Match over Payment does not cover Voucher`. `{ .. }` ignores the fields. `payment` is a reference, so you match what it points at, `payment.*`, and the leading `&` matches it in place without taking it apart. In `charge`, `Payment.Card { limit, .. }` binds the `limit` field to a name. See **Patterns and match**.

## Borrows

Most functions here take a reference: `items: &List<Item>`, `payment: &Payment`. A `&` borrow lends a value for reading; the caller keeps it. That is why `main` can pass `&basket` to `checkout` three times. `&mut` lends it for changing, as in `List<Item>.append(&mut basket, ...)`. While a `&mut` loan is active, nothing else may use the value. See **Borrowing**.

## Moves

```silk
  let tea = Item { name: "tea", cents: 450 }
  run List<Item>.append(&mut basket, move tea) |> Effect.provideMut<Allocator>(&mut allocator)
```

Every value has one owner. Putting `tea` in the list hands it over, and Silk makes you say so with `move`. Leave the `move` out and the compiler stops you:

```sh
silk check
```

```
Checking tour (x86_64-unknown-linux-gnu)
  load     143 modules, 1 in package         0.03s
  check    failed: 2 modules, 1 error        0.17s
[x86_64-unknown-linux-gnu]
src/main.silk:84:38: error[OWN0003] Moving tea requires an explicit move
Failed tour in 0.23s
```

After the move, `tea` is gone. Add `let price = tea.cents` on the next line and you get:

```
src/main.silk:85:15: error[OWN0001] tea.cents was moved and cannot be used again
  note: src/main.silk:84:38: related location
```

The `note:` line points at the `move tea` that gave it away.

Numbers, `bool` and `string` are copied instead of moved, so `amount` and `cents` never need `move`. See **Ownership and moves**.

## An effect that can fail

```silk
effect fn charge(amount: i32, payment: &Payment) -> i32 ! Declined {
```

`effect fn` marks a function that does more than compute a value: it may fail, or need services from its caller. `! Declined` is its failure row, the list of failures it can raise. `fail Declined { reason: "over the card limit" }` raises one, and the function stops there.

Calling an effect function does not run it. `charge(amount, payment)` builds an effect value; `run` performs it. A caller must either declare the failure in its own row or handle it. `checkout` handles it with `Effect.result`, which turns the outcome into a `Result` you can `match`:

```silk
  let outcome = run Effect.result(charge(amount, payment))
  match move outcome {
    Result<i32, Declined>.Success { value } => { ... }
    Result<i32, Declined>.Failure { error } => { ... }
  }
```

`Effect.catchAll` with a handler function is the other common way. See **Effects and run** and **Typed failures**.

## Services and providers

```silk
effect fn checkout(items: &List<Item>, payment: &Payment) -> () ! LogError ? &mut Logger {
```

`? &mut Logger` is the requirement row: `checkout` needs a `Logger` to call `Effect.log`, but it does not choose one. `main` does, with `Effect.provideMut(&mut logger)`, where `logger` writes to standard output. A test could supply a logger that records into memory, with no change to `checkout`. `List<Item>.append` works the same way: it needs an `Allocator`, and `main` provides the system allocator. See **Services and providers**.

`Effect.log` fills `{amount}` and the other placeholders from the fields of the record after it, `&.{ amount: amount }`. The compiler checks every placeholder against those fields.

## main

```silk
pub effect fn main() -> () ! LogError | OutOfMemoryError {
```

The program starts at `pub fn main` or `pub effect fn main` in the root module. This one returns `()`, so it exits with status 0. If a `LogError` or `OutOfMemoryError` escaped, the program would exit with status 1 and print a report. See **Program entry and termination**.

## Where next

The Silk book teaches all of this in order, by growing one program from a few lines into an HTTP service. Chapter 3, Modeling data, and chapter 4, Ownership, pick up where this page leaves off. The Language reference has the full rules for each page named above.

## API reference

- `silk/mem/allocator`: `Allocator`, `OutOfMemoryError`
- `silk/core/effect`: `Effect` (`Effect.log`, `Effect.result`, `Effect.provideMut`)
- `silk/collections/list`: `List`
- `silk/io/logger`: `Logger`, `LogError`
- `silk/io/logger_native`: `StdoutLogger`
- `silk/core/result`: `Result`
