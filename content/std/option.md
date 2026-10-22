Optional owned values that distinguish presence from absence without a failure channel.

## When to use
Use [`Option`](#Option) when absence is an expected answer and needs no error payload. Use [`map`](#Option.impl.map) for a
pure transform, [`flatMap`](#Option.impl.flatMap) when the transform may also return absence, and [`unwrapOr`](#Option.impl.unwrapOr) only
when the caller is ready to consume the option.

## Details
`Option<T>` is a nominal union with `Some` and `None` variants. Its combinators preserve affine
ownership: a present value moves forward, while an unused fallback or abandoned branch drops.

## Examples
### Transform and continue only when a value is present
```silk
import silk.option { Option }

fn double(value: i32) -> i32 {
  return value * 2
}

fn positive(value: i32) -> Option<i32> {
  if value > 0 {
    return Option<i32>.some(value)
  }
  return Option<i32>.none()
}

pub fn main() -> i32 {
  let initial = Option<i32>.some(21)
  let doubled = Option<i32>.map<i32>(move initial, double)
  let answer = Option<i32>.flatMap<i32>(move doubled, positive)
  let absent = Option<i32>.none()
  let missing = Option<i32>.map<i32>(move absent, double)
  let presentValue = Option<i32>.unwrapOr(move answer, 0)
  let absentValue = Option<i32>.unwrapOr(move missing, 0)
  return presentValue + absentValue
}
```

Import as `Option` with `import silk.option { Option }`.

Public declarations: 1.

::Anchor{id="Option"}

## `Option`

```silk
pub union Option<T>
```

An owned value that is either [`Some`](#Option.Some) or [`None`](#Option.None).

### Details

Match on an `Option` when both arms need custom behavior. Prefer [`map`](#Option.impl.map), [`flatMap`](#Option.impl.flatMap), or
[`unwrapOr`](#Option.impl.unwrapOr) for the common transform, continue, and default cases.

::Anchor{id="Option.None"}

### `None`

```silk
None
```

The absent variant; it carries no explanation for the absence.

::Anchor{id="Option.Some"}

### `Some`

```silk
Some
```

The present variant, carrying the available owned value.

::Anchor{id="Option.Some.value"}

#### Field `value`

```silk
pub value: T
```

The value moved through present-only combinator branches.

::Anchor{id="Option.impl"}

## Implementation `Option<T>`

```silk
impl<T> Option<T>
```

::Anchor{id="Option.impl.none"}

### Associated function `none`

```silk
pub fn none() -> Option<T>
```

Constructs an absent optional value of the requested element type.

::Anchor{id="Option.impl.some"}

### Associated function `some`

```silk
pub fn some(value: T) -> Option<T>
```

Constructs a present option by moving `value` into it.

::Anchor{id="Option.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: once fn(T) -> U) -> Option<U>
```

Applies `transform` once to a present value and keeps an absent value absent.

#### Details

The callback is not called for [`None`](#Option.None). This operation consumes `self`; use a shared borrow and
`match` instead when the original option must remain available.

::Anchor{id="Option.impl.flatMap"}

### Method `flatMap`

```silk
pub fn flatMap<U>(self: Self, transform: once fn(T) -> Option<U>) -> Option<U>
```

Continues a present value with a transform that itself answers with an Option, so the
outcome stays one Option deep instead of nesting.

#### Details

The callback runs once for [`Some`](#Option.Some) and not at all for [`None`](#Option.None). Use this when the next step may
reject the value without needing to explain why; use a `Result` when rejection needs an error.

::Anchor{id="Option.impl.unwrapOr"}

### Method `unwrapOr`

```silk
pub fn unwrapOr(
    self: Self,
    /// The owned alternative consumed only when `self` is absent.
    fallback: T,
  ) -> T
```

Returns the present value, or the fallback value when the option is absent.

#### Details

Only the absent arm consumes the fallback. The present arm releases it, so exactly one of the
two owned values leaves this call and the other drops.

#### Examples

##### Choose between a present value and a fallback

```silk
import silk.option { Option }

pub fn main() -> i32 {
  let present = Option<i32>.some(7)
  let absent = Option<i32>.none()
  let first = move present
    |> Option<i32>.unwrapOr(0)
  let second = move absent
    |> Option<i32>.unwrapOr(5)
  return first + second
}
```

::Anchor{id="Option.impl.unwrapOr.fallback"}

#### Parameter `fallback`

```silk
fallback: T
```

The owned alternative consumed only when `self` is absent.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`.
