# Types and properties

The `Intrinsic` namespace also holds types, properties a bound can require, the operator interfaces, and one import. None of them is a function: they appear in type positions, bounds and `impl` heads. Most have an ordinary name in the standard library, a `pub type` alias such as `pub type Copy = Intrinsic.Copy` in `silk/core/ownership`, and every spelling names the same thing, so `impl Copy for Point {}` and `impl Intrinsic.Copy for Point {}` are one conformance.

The bare spellings, such as `Slot` or `Allocation`, are ordinary names. A program may declare its own `Slot`, and without a declaration or import a bare `Slot` names nothing.

## Storage types

### `Intrinsic.Allocation`

```silk signature
type Allocation
```

One owner of a block of raw memory, its `Layout`, and the way to release it. Dropping it releases the block: to the system for a block from `systemAllocationAcquire`, or through the reclaim function given to `allocationAdopt`. It holds no values and never drops any.

- Affine: not `Copy`. `Transferable` and `Concurrent`.
- Made by [`systemAllocationAcquire`](/docs/intrinsics/memory-and-storage#intrinsicsystemallocationacquire) and [`allocationAdopt`](/docs/intrinsics/memory-and-storage#intrinsicallocationadopt); the `Allocator` service returns one from [`Allocator.allocate`](/docs/std/mem-allocator#Allocator.allocate).
- Consumed by [`rawBufferFrom`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferfrom), [`sharedFromAllocation`](/docs/intrinsics/memory-and-storage#intrinsicsharedfromallocation) and [`executionFromAllocation`](/docs/intrinsics/effects-and-execution#intrinsicexecutionfromallocation).

### `Intrinsic.RawBuffer`

```silk signature
type RawBuffer<T>
```

Typed raw storage for a number of `T` slots, owned independently of the allocator that provided it. It is four words: the base address, the slot count, and the reclaim function and context of the allocation it adopted. It does not record which slots hold a value; the container that owns it keeps that record. Dropping it releases the storage and drops no value in it.

- Affine. `Transferable` and `Concurrent` when `T` is.
- Operations: [`rawBufferFrom`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferfrom), [`rawBufferEmpty`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferempty), [`rawBufferCount`](/docs/intrinsics/memory-and-storage#intrinsicrawbuffercount), [`rawBufferSlot`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferslot), [`rawBufferRead`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferread), [`rawBufferCopy`](/docs/intrinsics/memory-and-storage#intrinsicrawbuffercopy), [`rawBufferFill`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferfill), [`rawBufferResize`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferresize), [`rawBufferView`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferview) and [`rawBufferViewMut`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferviewmut).
- Wrapper: [`RawBuffer`](/docs/std/mem-raw-buffer#RawBuffer) in `silk/mem/raw_buffer`, which `List`, `Bytes` and `Box` are built on.

### `Intrinsic.Slot`

```silk signature
type Slot<'storage, T>
```

One element of a `RawBuffer<T>`, borrowed exclusively from the buffer for `'storage`. A slot operation consumes it, so one slot value does one thing.

- Affine. `Transferable` and `Concurrent` when `T` is.
- Made by [`rawBufferSlot`](/docs/intrinsics/memory-and-storage#intrinsicrawbufferslot). Operations: [`slotWrite`](/docs/intrinsics/memory-and-storage#intrinsicslotwrite), [`slotTake`](/docs/intrinsics/memory-and-storage#intrinsicslottake), [`slotDrop`](/docs/intrinsics/memory-and-storage#intrinsicslotdrop), [`slotCopy`](/docs/intrinsics/memory-and-storage#intrinsicslotcopy) and [`slotAddress`](/docs/intrinsics/memory-and-storage#intrinsicslotaddress).
- Wrapper: [`Slot`](/docs/std/mem-slot#Slot) in `silk/mem/slot`.

### `Intrinsic.SharedCore`

```silk signature
type SharedCore<T>
```

One handle to a value shared by several handles in one thread: the value, a handle count and a busy flag in one allocation. Cloning adds a handle; dropping the last one drops the value and releases the allocation. The value is reached only through `sharedWithMut`, which refuses a second access while one is running.

- Affine. Neither `Transferable` nor `Concurrent`: the count is not atomic.
- Operations: [`sharedLayout`](/docs/intrinsics/memory-and-storage#intrinsicsharedlayout), [`sharedFromAllocation`](/docs/intrinsics/memory-and-storage#intrinsicsharedfromallocation), [`sharedClone`](/docs/intrinsics/memory-and-storage#intrinsicsharedclone) and [`sharedWithMut`](/docs/intrinsics/memory-and-storage#intrinsicsharedwithmut).
- Wrapper: [`Shared`](/docs/std/mem-shared#Shared) in `silk/mem/shared`.

### `Intrinsic.StorageFailure`

```silk signature
type StorageFailure
```

The failure of `systemAllocationAcquire`: the system refused the request, or the layout was invalid (an alignment that is not a nonzero power of two, or a size that overflows `usize` with its padding). It carries no data.

- `Transferable` and `Concurrent`.
- The system allocator turns it into `OutOfMemoryError` with `catchFailure<Intrinsic.StorageFailure>`; the example under [`systemAllocationAcquire`](/docs/intrinsics/memory-and-storage#intrinsicsystemallocationacquire) does the same.

## Execution types

### `Intrinsic.Execution`

```silk signature
type Execution<A>
```

The owner of one execution package whose body yields `A`: the body or its stored frames, the readiness endpoint and the control words. Dropping it before the body completes cancels the body, dropping the owners in its frames from the innermost out; the readiness endpoint is not called.

- Affine and local to one thread: neither `Transferable` nor `Concurrent`. [`TransferableExecution`](/docs/std/concurrency-execution#TransferableExecution) is the form that moves between threads.
- Made by [`executionFromAllocation`](/docs/intrinsics/effects-and-execution#intrinsicexecutionfromallocation), consumed by [`executionDrive`](/docs/intrinsics/effects-and-execution#intrinsicexecutiondrive), which hands it back through `onSuspend` when the body relinquishes.
- Wrapper: [`Execution`](/docs/std/concurrency-execution#Execution) in `silk/concurrency/execution`.
- The examples under [Execution packages](/docs/intrinsics/effects-and-execution#execution-packages) use it.

### `Intrinsic.ExecutionRef`

```silk signature
type ExecutionRef
```

Counted authority over one package allocation. It keeps the allocation alive, not the body: it can read and write the control words, notify the package and ask whether its `Execution` handle still exists, but it cannot drive it.

- Affine, not `Copy`, and local to one thread. The package allocation is released when the `Execution` and every `ExecutionRef` are gone.
- Made by [`executionCurrent`](/docs/intrinsics/effects-and-execution#intrinsicexecutioncurrent) and [`executionRefOf`](/docs/intrinsics/effects-and-execution#intrinsicexecutionrefof). Used by [`executionLoad`](/docs/intrinsics/effects-and-execution#intrinsicexecutionload), [`executionStore`](/docs/intrinsics/effects-and-execution#intrinsicexecutionstore), [`executionCompareExchange`](/docs/intrinsics/effects-and-execution#intrinsicexecutioncompareexchange), [`executionNotify`](/docs/intrinsics/effects-and-execution#intrinsicexecutionnotify) and [`executionLive`](/docs/intrinsics/effects-and-execution#intrinsicexecutionlive).
- A [`Wake`](/docs/std/concurrency-execution#Wake) holds one, which is why a wake for a dropped Execution does nothing.

## Static descriptors

These types exist only during static evaluation. A value of one is phase-only: it lives in a `const`, a `static` binding, a `static for` loop variable or a `static fn`, and a runtime argument of one is SEM0176. The members that read them are on the [Static evaluation](/docs/intrinsics/static-evaluation) page.

### `Intrinsic.Type`

```silk signature
type Type<Owner>
```

The descriptor of one aggregate type, from [`reflectType`](/docs/intrinsics/static-evaluation#intrinsicreflecttype). [`reflectTypeKind`](/docs/intrinsics/static-evaluation#intrinsicreflecttypekind), [`reflectTypeName`](/docs/intrinsics/static-evaluation#intrinsicreflecttypename), [`reflectTypeDoc`](/docs/intrinsics/static-evaluation#intrinsicreflecttypedoc) and [`reflectPrivateField`](/docs/intrinsics/static-evaluation#intrinsicreflectprivatefield) read it.

### `Intrinsic.StaticSequence`

```silk signature
type StaticSequence<Element>
```

An immutable sequence built during static evaluation and walked with `static for`. Appending returns a new sequence. Made and read by the [`staticSequence`](/docs/intrinsics/static-evaluation#intrinsicstaticsequenceempty) members; the wrapper is [`StaticSequence`](/docs/std/core-static-sequence#StaticSequence) in `silk/core/static_sequence`.

### `Intrinsic.Field`

```silk signature
type Field<Owner, Value>
```

The descriptor of one field of `Owner` whose type is `Value`, from [`reflectField`](/docs/intrinsics/static-evaluation#intrinsicreflectfield) or an element of `Fields<Owner>`. [`borrowField`](/docs/intrinsics/static-evaluation#intrinsicborrowfield) and [`borrowFieldMut`](/docs/intrinsics/static-evaluation#intrinsicborrowfieldmut) turn it into a field access at runtime.

### `Intrinsic.Fields`

```silk signature
type Fields<Owner>
```

The field descriptors of a struct, or of one variant of a union, in declaration order, from [`reflectFields`](/docs/intrinsics/static-evaluation#intrinsicreflectfields) and [`reflectVariantFields`](/docs/intrinsics/static-evaluation#intrinsicreflectvariantfields). Each element is a `Field<Owner, Value>` with its own `Value`, so it is walked with `static for`.

### `Intrinsic.FieldName`

```silk signature
type FieldName<Owner>
```

A checked field name. A parameter of this type accepts a string literal only when it names a field of `Owner`, so a misspelled name is an error at the literal and the editor links the literal to the field. [`fieldNameLabel`](/docs/intrinsics/static-evaluation#intrinsicfieldnamelabel) returns its text.

### `Intrinsic.Variant`

```silk signature
type Variant<Union>
```

The descriptor of one variant of a nominal union, an element of `Variants<Union>`. [`makeVariant`](/docs/intrinsics/static-evaluation#intrinsicmakevariant), [`isVariant`](/docs/intrinsics/static-evaluation#intrinsicisvariant) and [`borrowVariantField`](/docs/intrinsics/static-evaluation#intrinsicborrowvariantfield) use it at runtime.

### `Intrinsic.Variants`

```silk signature
type Variants<Union>
```

The variant descriptors of a nominal union, in declaration order, from [`reflectVariants`](/docs/intrinsics/static-evaluation#intrinsicreflectvariants).

### `Intrinsic.VariantName`

```silk signature
type VariantName<Union>
```

A checked variant name: a parameter of this type accepts a string literal only when it names a variant of `Union`. [`variantNameLabel`](/docs/intrinsics/static-evaluation#intrinsicvariantnamelabel) returns its text.

### `Intrinsic.FunctionRef`

```silk signature
type FunctionRef
```

A static function value with its contract erased, so one sequence can hold functions of different types. [`functionRef`](/docs/intrinsics/static-evaluation#intrinsicfunctionref) makes one and [`functionAs`](/docs/intrinsics/static-evaluation#intrinsicfunctionas) recovers the function, which must have the contract it is asked for.

### `Intrinsic.Tests`

```silk signature
type Tests
```

The catalog of the `test` functions in the discovery root of a `silk test` build, from [`tests`](/docs/intrinsics/static-evaluation#intrinsictests). Each element is a `Test<F>`.

### `Intrinsic.Test`

```silk signature
type Test<F>
```

The descriptor of one test whose function type is `F`. [`testInfo`](/docs/intrinsics/static-evaluation#intrinsictestinfo) reads its metadata and [`testFunction`](/docs/intrinsics/static-evaluation#intrinsictestfunction) returns the function.

### `Intrinsic.TestInfo`

```silk signature
struct TestInfo {
  identity: string<'static>,
  name: string<'static>,
  module: string<'static>,
  path: string<'static>,
}
```

One test's metadata, from [`testInfo`](/docs/intrinsics/static-evaluation#intrinsictestinfo). `identity` is stable across runs, `name` is the function's name, `module` its module and `path` its source file. No field is a source position.

## Properties

A property is a bound or an `impl` head, never a value type. Ownership and thread properties are derived by the compiler; the two execution properties are proved from the code.

### `Intrinsic.Copy`

```silk signature
property Copy
```

Values of the type duplicate without user code, so a use does not move them. Scalars, `bool`, `char`, shared references and raw pointers are `Copy`. A struct or union is `Copy` when it declares `impl Copy for T {}` and every stored part is `Copy`.

- Alias: [`Copy`](/docs/std/core-ownership#Copy) in `silk/core/ownership`.
- A second conformance through any spelling is SEM0083.

```silk
import silk.core.ownership { Copy }

struct Point {
  x: i32,
  y: i32,
}

impl Copy for Point {}

fn sum<T: Intrinsic.Copy>(value: T, read: fn(T) -> i32) -> i32 {
  // A Copy value can be used twice without `move`.
  return read(value) + read(value)
}

fn x(point: Point) -> i32 {
  return point.x
}

pub fn main() -> i32 {
  if sum(Point { x: 21, y: 0 }, x) != 42 { return 1 }
  return 0
}
```

### `Intrinsic.Drop`

```silk signature
property Drop
```

The type runs one cleanup operation when a value is dropped: `impl Drop for T { fn drop(self: &mut T) -> () {...} }`. It runs exactly once per value, at the end of its scope, at `drop`, or when a cancelled fiber releases the frame that owns it. A trap runs no `drop`.

- Alias: [`Drop`](/docs/std/core-ownership#Drop) in `silk/core/ownership`. A `Copy` type cannot implement it.

```silk
import silk.core.ownership { Drop }

struct Guard {
  closed: *mut i32,
}

impl Drop for Guard {
  fn drop(self: &mut Guard) -> () {
    unsafe Intrinsic.pointerWrite<i32>(self.closed, unsafe Intrinsic.pointerRead<i32>(self.closed) + 1)
  }
}

pub fn main() -> i32 {
  let mut closed: i32 = 0
  let guard = Guard { closed: Intrinsic.pointerFromMutRef<i32>(&mut closed) }
  drop guard
  if closed != 1 { return 1 }
  return 0
}
```

### `Intrinsic.Transferable`

```silk signature
property Transferable
```

Ownership of a value may move to another thread. Scalars, `string`, enums, `Allocation` and `StorageFailure` are `Transferable`; raw pointers, `SharedCore`, `Execution` and `ExecutionRef` are not; an aggregate is when every stored part is, and `&mut T` is when `T` is. A type that synchronizes its own storage asserts it with `impl Transferable for Lock {}`.

- Alias: [`Transferable`](/docs/std/concurrency-thread#Transferable) in `silk/concurrency/thread`. Threads, channels and the thread pool bound their inputs on it; a value that is not is SEM0139 where it is handed off.

```silk
import silk.concurrency.thread { Concurrent, Transferable }

struct Job {
  id: i32,
}

fn handOff<T: Transferable>(value: T) -> T {
  return move value
}

fn inspect<T: Concurrent>(value: &T) -> &T {
  return value
}

pub fn main() -> i32 {
  let job = handOff(Job { id: 42 })
  if inspect(&job).id != 42 { return 1 }
  // handOff(Intrinsic.pointerFromRef<i32>(&job.id)) is SEM0139: a raw pointer is not Transferable.
  return 0
}
```

### `Intrinsic.Concurrent`

```silk signature
property Concurrent
```

A shared borrow of a value may be used from several threads at once. The derivation is the one for `Transferable`, except that `&T` and `&mut T` are `Concurrent` when `T` is.

- Alias: [`Concurrent`](/docs/std/concurrency-thread#Concurrent) in `silk/concurrency/thread`. The example under `Transferable` uses both.

### `Intrinsic.NonParking`

```silk signature
property NonParking
```

A bound on an Effect or callable type: everything it can reach, through its calls and the providers it is given, never parks with `relinquish`. Nested `suspendEffect` boundaries are allowed. The compiler proves it from the specialized code; there is no `impl`.

- Required of readiness endpoints, drive callbacks, the non-parking finalizers and the `observeDiagnostics` callback, and of `main` under the default runtimes.
- A failure is SEM0139 with the path that parks.

```silk
fn invoke<F: fn<'static>() -> i32 + Intrinsic.NonParking + Intrinsic.Detached>(body: F) -> i32 {
  return body()
}

fn answer() -> i32 {
  return 42
}

pub fn main() -> i32 {
  if invoke(answer) != 42 { return 1 }
  return 0
}
```

### `Intrinsic.Detached`

```silk signature
property Detached
```

A bound on an Effect or callable type: it owns what it captures and keeps no loan from the caller's scope or providers, so it can outlive the call that made it. It says nothing about threads.

- Required of an execution package's body, readiness state and endpoint.
- A failure is SEM0139 with the capture or provider that holds the loan. The example under `NonParking` requires both.

## Operator interfaces

Each overloadable operator is bound to one of these interfaces. A type gets the operator by implementing it, through either spelling; `silk/core/ops`, `silk/core/equal` and `silk/core/order` publish the aliases. The left (or only) operand's type is the provider, and the conformance is found in the interface's module, the provider's module or the right operand's module. Scalars have built-in conformances, so a generic bound such as `T: Add<T, T>` holds for `i64` and `f64`.

Arithmetic, bitwise and logical operators take their operands by value; comparisons take shared references, so an affine operand is written `&a < &b`. No operator borrows, copies or moves implicitly. No conformance for the operands is SEM0135, and two are SEM0136.

```silk
struct Vector {
  x: i32,
  y: i32,
}

impl Intrinsic.Add<Vector, Vector> for Vector {
  fn add(left: Vector, right: Vector) -> Vector {
    return Vector { x: left.x + right.x, y: left.y + right.y }
  }
}

impl Intrinsic.Multiply<i32, Vector> for Vector {
  fn multiply(left: Vector, right: i32) -> Vector {
    return Vector { x: left.x * right, y: left.y * right }
  }
}

impl Intrinsic.Negate<Vector> for Vector {
  fn negate(value: Vector) -> Vector {
    return Vector { x: -value.x, y: -value.y }
  }
}

impl Intrinsic.Equal for Vector {
  fn equals(left: &Vector, right: &Vector) -> bool {
    return left.x == right.x && left.y == right.y
  }
}

pub fn main() -> i32 {
  let moved = -(Vector { x: 1, y: 2 } + Vector { x: 2, y: 2 }) * 2
  let expected = Vector { x: -6, y: -8 }
  if &moved != &expected { return 1 }
  return 0
}
```

```silk
fn total<T: Intrinsic.Add<T, T> + Intrinsic.Copy>(values: &[T], start: T) -> T {
  let mut sum = start
  let mut index: usize = 0
  while index < values.length {
    sum = sum + values[index]
    index = index + 1
  }
  return sum
}

pub fn main() -> i32 {
  let values: [i64; 3] = [40, 1, 1]
  let floats: [f64; 2] = [0.5, 0.25]
  if total(&values, 0) != 42 || total(&floats, 0.25) != 1.0 { return 1 }
  return 0
}
```

### `Intrinsic.Add`

```silk signature
interface Add<Right, Output> {
  fn add(left: Self, right: Right) -> Output
}
```

`a + b`. Built in for every integer and float as [`Intrinsic.<numeric>Add`](/docs/intrinsics/scalars#intrinsicnumericadd), so integer overflow traps. Alias [`Add`](/docs/std/core-ops#Add).

### `Intrinsic.Subtract`

```silk signature
interface Subtract<Right, Output> {
  fn subtract(left: Self, right: Right) -> Output
}
```

`a - b`. Built in for every integer and float. Alias [`Subtract`](/docs/std/core-ops#Subtract).

### `Intrinsic.Multiply`

```silk signature
interface Multiply<Right, Output> {
  fn multiply(left: Self, right: Right) -> Output
}
```

`a * b`. Built in for every integer and float. A type may implement it for several `Right` types, such as `Vector * f64` and `Vector * Vector`. Alias [`Multiply`](/docs/std/core-ops#Multiply).

### `Intrinsic.Divide`

```silk signature
interface Divide<Right, Output> {
  fn divide(left: Self, right: Right) -> Output
}
```

`a / b`. Built in for every integer and float; integer division by zero traps. Alias [`Divide`](/docs/std/core-ops#Divide).

### `Intrinsic.Remainder`

```silk signature
interface Remainder<Right, Output> {
  fn remainder(left: Self, right: Right) -> Output
}
```

`a % b`. Built in for every integer and float. Alias [`Remainder`](/docs/std/core-ops#Remainder).

### `Intrinsic.Negate`

```silk signature
interface Negate<Output> {
  fn negate(value: Self) -> Output
}
```

`-a`. Built in for the signed integers and floats. Alias [`Negate`](/docs/std/core-ops#Negate).

### `Intrinsic.BitAnd`

```silk signature
interface BitAnd<Right, Output> {
  fn bitAnd(left: Self, right: Right) -> Output
}
```

`a & b`. Built in for every integer. Alias [`BitAnd`](/docs/std/core-ops#BitAnd).

### `Intrinsic.BitOr`

```silk signature
interface BitOr<Right, Output> {
  fn bitOr(left: Self, right: Right) -> Output
}
```

`a | b`. Built in for every integer. Alias [`BitOr`](/docs/std/core-ops#BitOr).

### `Intrinsic.BitXor`

```silk signature
interface BitXor<Right, Output> {
  fn bitXor(left: Self, right: Right) -> Output
}
```

`a ^ b`. Built in for every integer. Alias [`BitXor`](/docs/std/core-ops#BitXor).

### `Intrinsic.BitNot`

```silk signature
interface BitNot<Output> {
  fn bitNot(value: Self) -> Output
}
```

`~a`. Built in for every integer. Alias [`BitNot`](/docs/std/core-ops#BitNot).

### `Intrinsic.Not`

```silk signature
interface Not<Output> {
  fn not(value: Self) -> Output
}
```

`!a`. Built in for `bool`. Alias [`Not`](/docs/std/core-ops#Not).

### `Intrinsic.Equal`

```silk signature
interface Equal {
  fn equals(left: &Self, right: &Self) -> bool
}
```

`a == b`, and `a != b` as its negation. Built in for the scalars, `bool`, `char` and `string` (by UTF-8 bytes), and for `&[T]` element by element when `T` has it. Alias [`Equal`](/docs/std/core-equal#Equal).

- As a bound, write the alias: `T: Equal` after `import silk.core.equal { Equal }`. The spelling `T: Intrinsic.Equal` is refused with SEM0083 in v0.1.0-dev.82.

### `Intrinsic.Order`

```silk signature
interface Order {
  fn compare(left: &Self, right: &Self) -> Ordering
}
```

`<`, `<=`, `>` and `>=`. Each compares `compare(a, b)` with one `Ordering` member: `<` tests `Less`, `<=` tests not `Greater`, `>` tests `Greater` and `>=` tests not `Less`. Built in for the integers, `char` and `string` (by UTF-8 bytes, which is Unicode scalar order), `&[T]` lexicographically, and the floats by the IEEE 754 total order, so `NaN` has a place. The operators on concrete floats keep IEEE comparison, where every comparison with `NaN` is false. Alias [`Order`](/docs/std/core-order#Order).

- As a bound, write the alias: `T: Order` after `import silk.core.order { Order }`. The spelling `T: Intrinsic.Order` is refused with SEM0083 in v0.1.0-dev.82.

```silk
import silk.core.order { Order, Ordering }

struct Version {
  major: u32,
  minor: u32,
}

impl Order for Version {
  fn compare(left: &Version, right: &Version) -> Ordering {
    if left.major != right.major {
      if left.major < right.major { return Ordering.Less }
      return Ordering.Greater
    }
    if left.minor < right.minor { return Ordering.Less }
    if left.minor > right.minor { return Ordering.Greater }
    return Ordering.Equal
  }
}

fn largest<T: Order>(left: &T, right: &T) -> bool {
  return left < right
}

pub fn main() -> i32 {
  let old = Version { major: 1, minor: 9 }
  let new = Version { major: 2, minor: 0 }
  if !(&old < &new) || !largest(&old, &new) { return 1 }
  return 0
}
```

### `Intrinsic.Ordering`

```silk signature
enum Ordering {
  Less,
  Equal,
  Greater,
}
```

The result of `Order.compare`. Alias [`Ordering`](/docs/std/core-order#Ordering); name its members through the alias, as in `Ordering.Less`, because `Intrinsic.Ordering.Less` is not a value path.

### `Intrinsic.Omittable`

```silk signature
interface Omittable {
  fn omitted() -> Self
}
```

The interface behind leaving a field out of a struct or variant literal: a field whose type implements it may be left out, and holds `omitted()`. `Option<T>` implements it with `None`, so every `Option` field is optional. A left-out field of another type is SEM0024.

- Alias: [`Omittable`](/docs/std/core-option#Omittable) in `silk/core/option`.

```silk
import silk.core.option { Option }

enum Level {
  Quiet,
  Normal,
}

impl Intrinsic.Omittable for Level {
  fn omitted() -> Level {
    return Level.Normal
  }
}

struct Config {
  name: string<'static>,
  level: Level,
  port: Option<u16>,
}

pub fn main() -> i32 {
  // level and port are left out: they hold Level.omitted() and Option.None.
  let config = Config { name: "web" }
  if config.level != Level.Normal || config.port.isSome() { return 1 }
  return 0
}
```

## Program entry

### `Intrinsic.application`

```silk signature
import Intrinsic.application
```

The one importable member of `Intrinsic`: a module binding for the application module of the build, the package whose `main` the build runs. A runtime module imports it and calls a visible function of it, usually `application.main()`; the name `main` has no other privilege, and a custom runtime may call another function or pass arguments. Every other member is written `Intrinsic.<name>` without an import, and importing one is MOD0004.

- The default runtimes, `silk/platform/native/start`, `silk/platform/wasm/start` and `silk/platform/wasi/start`, import it, run `main` under an observer and exit with its status.
- A missing or private application member is an ordinary error at the import or the call.
