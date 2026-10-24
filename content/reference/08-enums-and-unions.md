# Enums and unions

Silk has three sum-like types. A scalar `enum` is a closed set of named integer constants. A nominal `union` is a tagged union whose variants may carry named fields. An anonymous structural union `A | B` is a type built from existing member types.

## Syntax

```
EnumDeclaration   = 'pub'? 'enum' ( '(' Type ')' )? Identifier '{' EnumMembers? '}'
EnumMembers       = EnumMember ( ',' EnumMember )* ','?
EnumMember        = Identifier ( '=' '-'? IntegerLiteral )?

UnionDeclaration  = 'pub'? 'union' Identifier GenericParameters? '{' Variants? '}'
Variants          = Variant ( ',' Variant )* ','?
Variant           = Identifier ( '{' VariantField ( ',' VariantField )* ','? '}' )?
VariantField      = 'pub'? Identifier ':' Type

StructuralUnion   = Type '|' Type ( '|' Type )*

EnumValue         = TypePath '.' Identifier
VariantValue      = TypePath TypeArguments? '.' Identifier ( '{' FieldInit ( ',' FieldInit )* ','? '}' )?
```

- Enum members and union variants are separated by commas. A trailing comma is allowed.
- Variant fields are separated by commas, as struct fields are.
- There are no tuple-like variants. A variant is either bare or has named fields.

## Scalar enums

- `enum(R) Name { … }` stores each member as an integer of representation `R`. Without `(R)` the representation is `u8`.
- `R` must be a fixed-width integer type (`i8` to `i64`, `u8` to `u64`). Other types are rejected (SEM0147).
- A member without `= value` takes the previous member's value plus one. The first member defaults to `0`.
- Explicit values are integer literals with an optional `-`. Decimal, `0x`, `0o` and `0b` forms are accepted: `A = 0x10`. A negative value under an unsigned representation is SEM0152. A value outside the range of `R` is SEM0150. An implicit successor that overflows is SEM0151.
- Member names and values must be unique (SEM0148, SEM0149). An enum needs at least one member (SEM0146).
- A member is written `Name.Member`. A name the enum does not declare is SEM0153.
- `Name.value(e)` returns the member's integer, typed as `R`. The receiver form `e.value()` is not available (SEM0010).
- Enum values are Copy.
- `==` and `!=` compare two values of the same enum. Comparing different enums is SEM0156. Ordering operators (`<`, `>=`, …) are SEM0157.
- An enum never mixes with an integer implicitly: `Color.Red == 0` is SEM0155. Assigning a member of one enum where another is expected is SEM0154.
- `impl Name { … }` may add methods to an enum. See Functions and methods.
- `match` on an enum must cover every member or use `_` (SEM0158). `if let Color.Green = c { }` tests for one member. See Patterns and match for the enum-specific match rules.

## Nominal unions

- `union Name { … }` declares a tagged union. Each value holds exactly one variant.
- A bare variant (`Empty`) carries no data. A record variant (`Circle { radius: i32 }`) carries named fields.
- A record variant needs at least one field. `Empty {}` in a declaration is SEM0166. Use a bare variant instead.
- A union needs at least one variant (SEM0164). Variant names must be unique (SEM0165).
- A union may take generic parameters: `union Maybe<T> { None, Some { value: T } }`. See Generics.
- A union may have an inherent `impl` block and interface impls, like a struct.
- There is no field access on a union value: `shape.radius` is SEM0027. Read fields by matching.
- There is no built-in `==` on unions (SEM0135).

## Constructing variants

- A bare variant is written `Name.Variant`. A record variant is written `Name.Variant { field: value, … }`.
- For a generic union, type arguments go on the union: `Maybe<i32>.Some { value: 1 }`.
- Type arguments may be left off when the fields or the context determine them: `Maybe.Some { value: 1 }`, or `let m: Maybe<i32> = Maybe.None`.
- A bare variant of a generic union with no context cannot be inferred (SEM0099).
- Every field must be initialized exactly once (SEM0024, SEM0023). An unknown field is SEM0022.
- A variant name the union does not declare is SEM0167.
- The variant name is always qualified. There is no unqualified `Some { … }`.

## Field visibility

- A variant field is private to the declaring module unless marked `pub`.
- Outside the module, a variant with a private field cannot be constructed (SEM0021). A pattern cannot bind the private field (SEM0028), but `..` may skip it.
- The union type itself is exported with `pub union`. Variants have no separate visibility.

## Structural unions

- `A | B | …` is an anonymous union of member types. Each value holds a value of exactly one member.
- Members may be scalars, `char`, `bool`, floats, fixed arrays, structs and nominal unions. Each member must be a detached value with finite storage. A reference member such as `&i32 | bool` is SEM0039.
- Parenthesized nested unions flatten: `i32 | (bool | char)` has three members.
- A value of a member type converts implicitly to the union wherever the union is expected: a return, an argument, or an annotated `let`.
- A union converts implicitly to a union with the same or more members: `i32 | char` widens to `i32 | char | f64`, and `i32 | bool` to `bool | i32`.
- A union cannot convert to a union that lacks one of its members (SEM0040).
- `match` arms with different result types and no expected type join into a structural union of those types. An unsuffixed integer literal arm takes the integer type of the other arms instead, when it fits.
- Read the value with a type pattern such as `i32 n` or `Left { value }`. A nominal union member may be matched by its variants directly. See Patterns and match.

## Option and Result

`Option` and `Result` are ordinary unions in the standard library. They are not imported automatically. Their declarations, without doc comments:

```
// silk/option
pub union Option<T> {
  None,
  Some { pub value: T }
}

// silk/result
pub union Result<A, F> {
  Success { pub value: A },
  Failure { pub error: F }
}
```

- `Option<T>.some(v)`, `Option<T>.none()`, `Result<A, F>.succeed(v)` and `Result<A, F>.failResult(e)` construct values.
- Both define `map`, `flatMap` and `unwrapOr`. `Result` also defines `mapError`. All of these consume the value.

## Copy and move

- A nominal union is moved, not copied, unless it opts in with `impl Copy for Name {}`. Reusing a moved union is an ownership error. See Ownership and moves.
- A structural union whose members are all Copy is Copy.
- Matching a non-Copy union variable by value needs `match move` (or a borrow, `match &u`). A bare `match u` on it is OWN0003. A temporary, such as a call result, needs neither.

## Examples

```silk
enum(i8) Level {
  Low = -1,
  Mid,
  High = 10,
}

fn score(level: Level) -> i32 {
  return match level {
    Level.Low => 1
    Level.Mid => 2
    Level.High => 3
  }
}

pub fn main() -> i32 {
  let level = Level.Mid
  let again = level
  if level != again {
    return 1
  }
  if Level.value(Level.Mid) != 0 {
    return 2
  }
  if score(Level.High) != 3 {
    return 3
  }
  return 0
}
```

```silk
union Maybe<T> {
  None,
  Some { value: T },
}

fn orZero(m: Maybe<i32>) -> i32 {
  return match move m {
    Maybe<i32>.Some { value } => value
    Maybe<i32>.None => 0
  }
}

pub fn main() -> i32 {
  let a = Maybe<i32>.Some { value: 1 }
  let b: Maybe<i32> = Maybe.Some { value: 2 }
  let none: Maybe<i32> = Maybe.None
  let total = orZero(move a) + orZero(move b) + orZero(Maybe.Some { value: 3 }) + orZero(move none)
  if total != 6 {
    return 1
  }
  return 0
}
```

```silk
union Shape {
  A,
  B
}

fn widen(value: i32 | char) -> i32 | char | f64 {
  return value
}

fn describe(value: Shape | i32) -> i32 {
  return match move value {
    Shape.A => 1
    Shape.B => 2
    i32 n => n
  }
}

fn letter(value: i32 | char | f64) -> i32 {
  return match value {
    i32 n => n
    char c => {
      if c == 'z' {
        return 10
      }
      return 20
    }
    f64 _ => 30
  }
}

pub fn main() -> i32 {
  if describe(Shape.B) != 2 || describe(7) != 7 {
    return 1
  }
  if letter(widen('z')) != 10 {
    return 2
  }
  return 0
}
```

## Diagnostics

| Code | Meaning |
| --- | --- |
| SEM0021 | Variant with a private field constructed outside its module |
| SEM0022 | Variant constructor names an unknown field |
| SEM0023 | Variant constructor initializes a field twice |
| SEM0024 | Variant constructor omits a field |
| SEM0027 | Field access on a union value |
| SEM0028 | Pattern names a private field of another module's variant |
| SEM0039 | Structural union member is not a detached value with finite storage |
| SEM0040 | Union conversion to a union that lacks some source members |
| SEM0099 | Type argument of a generic variant cannot be inferred |
| SEM0146 | Enum with no members |
| SEM0147 | Enum representation is not a fixed-width integer type |
| SEM0148 | Duplicate enum member name |
| SEM0149 | Duplicate enum discriminant |
| SEM0150 | Explicit discriminant outside the representation range |
| SEM0151 | Implicit discriminant overflows the representation |
| SEM0152 | Negative discriminant under an unsigned representation |
| SEM0153 | Enum has no such member |
| SEM0154 | Member of one enum used where another enum is required |
| SEM0155 | Enum mixed with an integer |
| SEM0156 | Equality between different enums |
| SEM0157 | Ordering comparison of enum values |
| SEM0164 | Union with no variants |
| SEM0165 | Duplicate union variant |
| SEM0166 | Record variant declared with empty braces |
| SEM0167 | Union has no such variant |

## See also

Patterns and match · Structs, tuples and arrays · Generics · Interfaces and impls · Ownership and moves · `silk/option`, `silk/result`

## Open questions

- `enum Color<T> { Red, Green }` is accepted, but `Color<i32>.Red` is then SEM0051 ("An application with the wrong number of type arguments"). Generic enums appear unsupported without a declaration-site error.
- SEM0168 (variant qualifier that is not a nominal union) has no producer in the compiler. `P.C { … }` on a struct gives SEM0018 ("A type position whose name resolves to something other than a type") instead.
