# Structs, tuples and arrays

Structs, tuples and arrays are Silk's product types. This page covers struct and tuple declarations, record and tuple literals, anonymous aggregates, fixed arrays, and slices.

## Syntax

```
StructDecl     = 'pub'? 'struct' Name TypeParams? '{' Field* '}'
Field          = 'pub'? Name ':' Type
TupleDecl      = 'pub'? 'tuple' Name TypeParams? '(' ( Type ( ',' Type )* ','? )? ')'

RecordLiteral  = TypePath '{' ( FieldInit ( ',' FieldInit )* ','? )? '}'
ContextRecord  = '.' '{' ( FieldInit ( ',' FieldInit )* ','? )? '}'
FieldInit      = Name ':' Expression
TupleLiteral   = '(' Expression ',' ( Expression ( ',' Expression )* ','? )? ')'
UnitLiteral    = '(' ')'
ArrayLiteral   = '[' ( Expression ( ',' Expression )* ','? )? ']'
ArrayRepeat    = '[' Expression ';' Expression ']'

FieldAccess    = Expression '.' Name
ElementAccess  = Expression '.' DecimalInteger
IndexAccess    = Expression '[' Expression ']'

ArrayType      = '[' Type ';' Expression ']'
SliceType      = '&' 'mut'? '[' Type ']'
UnitType       = '(' ')'
```

## Struct declarations

- Fields are separated by commas, usually one per line. A trailing comma is allowed. A missing comma is PAR0001, "Expected `,`".
- A field name may appear once (SEM0017).
- A struct may be empty: `struct Marker {}`.
- `extern "C" struct Name { }` declares a C-layout record. It takes no type parameters (SEM0205), and its fields must be C object types (SEM0206). See Unsafe code and C interop.
- Generic structs take type parameters: `struct Labeled<T> { label: u8, value: T }`. See Generics.

## Visibility

- `pub struct` makes the type nameable from other modules. Each field is private unless marked `pub`.
- Reading or assigning a private field from another module is SEM0028.
- A record literal from another module needs every field to be visible. Otherwise construction is SEM0021; offer a `pub fn` constructor instead.
- Importing a non-`pub` struct from another module is SEM0015.
- Elements of a `pub tuple` are accessible from other modules.

## Record literals

- `Name { a: 1, b: 2 }` constructs a struct. Every field is required (SEM0024). Fields may appear in any order.
- Initializers are separated by commas. A trailing comma is allowed.
- Each initializer needs `name: value`. There is no field shorthand: `Point { x, y: 2 }` is a parse error.
- There is no struct update syntax (`..base`).
- An unknown field is SEM0022. A repeated field is SEM0023. A value of the wrong type is SEM0025.
- Generic arguments may be written or inferred: `Labeled<Point> { … }` or `Labeled { … }`.
- In an `if` or `while` condition and a `match` subject, a record literal must be in parentheses.

## Contextual and anonymous records

- `.{ a: 1, b: 2 }` takes its struct type from context: an annotation, a parameter, a return type, or a `match` arm with an expected type.
- Without a struct context, `.{ … }` creates an anonymous record. Its fields are read with `.name`.
- Each anonymous literal has its own type. Assigning a second `.{ only: 2 }` to a variable that holds `.{ only: 1 }` is SEM0037.
- An anonymous record passed to a generic parameter binds the parameter to that anonymous type.
- Using `.{ }` where a tuple is expected, or `( , )` where a struct is expected, is SEM0173.

## Field access and assignment

- `value.field` reads a field. It works through references too: `p.x` where `p: &Point`.
- `value.field = expr` writes a field. The root binding must be `let mut` (SEM0035), or the path must go through a `&mut` reference.
- Nested paths work: `line.end.value = 5`.
- A missing field is SEM0027. Projecting a field from a non-struct is SEM0026.
- Structs are not `Copy` by default. `let b = a` needs `move a` (OWN0003). See Ownership and moves.

## Tuples

- `tuple Name(A, B)` declares a nominal tuple. Construct it like a call: `Name(a, b)`. The wrong number of elements is SEM0172, which names the tuple: "main.Pair expects 2 tuple elements but received 3".
- A literal `(a, b)` also constructs a nominal tuple when the expected type is one: `let r: Range = (0, 1)`.
- Elements are read and written with `.0`, `.1` and so on. An out-of-range ordinal is SEM0027. For a nominal tuple it lists the elements: "main.Pair has no element `.2`; it has 2 elements, `.0` and `.1`".
- `Name { … }` record syntax does not construct a tuple. `Pair { 0: a, 1: b }` is PAR0010: "A tuple's elements have no field names; build it by position, as in `Pair(first, second)`". Other field names are SEM0018.
- A `(a, b)` literal with no tuple context creates an anonymous tuple. Like anonymous records, each literal is its own type.
- There is no tuple type syntax. `(T)` in a type is just `T` in parentheses, so `(i32, bool)` is not a type. Declare a `tuple` to name one.
- `(x)` is a grouped expression. A one-element tuple literal needs a trailing comma: `(x,)`.

## Unit

- `()` is both the unit type and its only value.
- A function with no result type returns `()`.

## Fixed arrays

- `[T; N]` is an array of exactly `N` elements. `N` may be a literal or a constant: `[i32; N]`.
- `[a, b, c]` is an array literal. All elements must have one type (SEM0030). Against an annotation, the count must match (SEM0031).
- With no expected type, elements whose types differ only in a lifetime join at the shortest one: `[header("a", b"x"), header("b", &local)]` is valid and lives as long as `local`. Using it past that is OWN0019.
- `[value; count]` repeats one value: `[0; 64]`, `[[7; 3]; 2]`. `count` is a static integer, such as a literal, a `const`, a `let static` binding or a `static` parameter. A runtime count is SEM0176.
- With a `count` above 1, the value's type must be `Copy` (SEM0121). Against an annotation, `count` must match the length (SEM0031).
- `[]` needs an expected array type: `let none: [u8; 0] = []`. Otherwise SEM0029.
- Arrays nest: `[[1, 2], [3, 4]]`, read with `grid[1][0]`.
- `.length` is the element count as `usize`. There is no `.len`: `a.len` is SEM0027, "[i32; 3] has no field `len`; its element count is `.length`", and the same for a slice.
- An array of `Copy` elements is copied on assignment. An array with non-`Copy` elements needs `move`.

## Indexing

- `a[i]` reads an element and `a[i] = v` writes one. The index must be `usize` (SEM0033). An unannotated literal variable such as `let i = 1` is `i32`, so annotate it.
- `[` must be on the same line as the indexed expression. On a new line it starts a new statement.
- A constant index outside a fixed array's length is rejected at compile time (SEM0034).
- Any other out-of-range index traps at run time with `fatal trap: index out of bounds`. See Program entry and termination.
- Indexing a value that is not an array or slice is SEM0032.

## Slices

- `&[T]` is a shared view of contiguous elements. `&mut [T]` is an exclusive view that allows writes.
- Borrow an array to get a slice: `&a` or `&mut a`, passed where `&[T]` or `&mut [T]` is expected. Passing `a` itself is a type error (SEM0012).
- `&[T; N]` is a reference to a whole fixed array, keeping its length in the type.
- Slices support `.length`, indexing and element assignment (for `&mut [T]`).
- There is no range or slicing syntax such as `a[1..3]`. Use `Slice.view(values, offset, length)` from `silk/collections/slice` for a shared subrange, and `Slice.viewMut` for an exclusive one. An invalid range traps with `slice range out of bounds`.
- See Borrowing and Lifetimes for how long a slice may live.

## Examples

```silk
pub struct Point {
  pub x: i32,
  pub y: i32,
}

struct Labeled<T> {
  label: u8,
  value: T,
}

fn origin() -> Point {
  return .{ x: 0, y: 0 }
}

fn lengthSquared(p: &Point) -> i32 {
  return p.x * p.x + p.y * p.y
}

pub fn main() -> i32 {
  let mut p = Point { y: 4, x: 3 }
  if lengthSquared(&p) != 25 {
    return 1
  }
  p.x = 0
  let o = origin()
  if lengthSquared(&p) != 16 || o.y != 0 {
    return 2
  }
  let boxed = Labeled<Point> { label: 1, value: move p }
  let inferred = Labeled { label: 2, value: true }
  if boxed.value.y != 4 || !inferred.value {
    return 3
  }
  return 0
}
```

```silk
tuple Meters(f64)

tuple Range(i32, i32)

fn width(r: &Range) -> i32 {
  return r.1 - r.0
}

fn unit() -> Range {
  return (0, 1)
}

pub fn main() -> i32 {
  let mut r = Range(2, 9)
  r.0 = 3
  let m = Meters(1.5)
  let pair = (10, true)
  let nothing: () = ()
  if width(&r) != 6 || width(&unit()) != 1 {
    return 1
  }
  if m.0 != 1.5 || !pair.1 || pair.0 != 10 {
    return 2
  }
  return 0
}
```

```silk
import silk.collections.slice { Slice }

fn total(values: &[i32]) -> i32 {
  let mut sum = 0
  let mut index: usize = 0
  while index < values.length {
    sum = sum + values[index]
    index = index + 1
  }
  return sum
}

fn clear(values: &mut [i32]) -> () {
  let mut index: usize = 0
  while index < values.length {
    values[index] = 0
    index = index + 1
  }
}

pub fn main() -> i32 {
  let mut numbers: [i32; 5] = [1, 2, 3, 4, 5]
  numbers[0] = 10
  let grid = [[1, 2], [3, 4]]
  let none: [u8; 0] = []
  if total(&numbers) != 24 || grid[1][0] != 3 || none.length != 0 {
    return 1
  }
  let middle = Slice.view(&numbers, 1, 3)
  if middle.length != 3 || total(middle) != 9 {
    return 2
  }
  clear(&mut numbers)
  return total(&numbers)
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| PAR0001 | Missing token, for example no comma between struct fields ("Expected `,`") |
| PAR0010 | Tuple literal with field names, `Pair { 0: a, 1: b }` |
| SEM0012 | Argument type mismatch, for example an array passed where a slice is expected |
| SEM0015 | Import of a private member of another module |
| SEM0017 | Struct declares a field twice |
| SEM0021 | Struct cannot be constructed here because a field is not visible |
| SEM0022 | Record literal names an unknown field |
| SEM0023 | Record literal initializes a field twice |
| SEM0024 | Record literal omits a field |
| SEM0025 | Record literal field value has the wrong type |
| SEM0026 | Field projection on a value that is not a struct |
| SEM0027 | Unknown field or tuple element, including `.len` for `.length` |
| SEM0028 | Private field of another module's struct |
| SEM0029 | Empty array literal without an expected array type |
| SEM0030 | Array element has the wrong type |
| SEM0031 | Array literal or repeat length differs from the expected length |
| SEM0032 | Indexing a value that is not an array or slice |
| SEM0033 | Index is not `usize` |
| SEM0034 | Constant index outside the array's length |
| SEM0035 | Assignment through an immutable binding |
| SEM0037 | Assigned value has the wrong type, including a different anonymous aggregate |
| SEM0121 | Repeated array value is not `Copy` |
| SEM0176 | Repeat count is not a static value |
| SEM0172 | Tuple constructed with the wrong number of elements |
| SEM0173 | Tuple literal used for a struct, or record literal used for a tuple |
| OWN0003 | Non-Copy value consumed without `move` |

## See also

Values and primitive types · Bindings and statements · Enums and unions · Patterns and match · Generics · Ownership and moves · Borrowing · Lifetimes · Unsafe code and C interop · Program entry and termination · `silk/collections/slice`, `silk/collections/list`

## Open questions

- The catalog defines SEM0059 (array passed as a slice without a borrow) and SEM0175 (named-field construction of a positional aggregate), but the compiler has no producer for either. It reports SEM0012 ("Expected &[i32] but received [i32; 3]") and SEM0018 ("A type position whose name resolves to something other than a type") instead.
