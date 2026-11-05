Red, green, blue, and alpha channels with straight or premultiplied alpha, over any number type.

## When to use
Use [`Rgba`](#Rgba) for a color whose channels are not yet weighted by alpha, as authored in CSS, SVG,
or a color picker. Use [`PremultipliedRgba`](#PremultipliedRgba) for a color whose channels are already multiplied
by alpha, which is what blending, filtering, and GPU pipelines consume. [`premultiply`](#Rgba.impl.premultiply) and
[`unpremultiply`](#PremultipliedRgba.impl.unpremultiply) convert between them.

## Details
Both types are `Copy` structs with public `r`, `g`, `b`, and `a` fields, generic over the
channel type `T`, usually `f32` or `f64` in `[0, 1]`. The types do not record which color space
or transfer function the channels use: a value can hold gamma-encoded sRGB or linear light. Keep
that choice consistent, and use `silk.color.srgb` to convert between the two encodings before
premultiplying. `&a == &b` compares every channel when `T: Equal`.

Interpolation and compositing are defined on [`PremultipliedRgba`](#PremultipliedRgba) only, because interpolating
straight-alpha channels lets a transparent endpoint's color bleed into the result.

## Gotchas
[`unpremultiply`](#PremultipliedRgba.impl.unpremultiply) of a fully transparent color returns zero channels: the color of a transparent
pixel is lost by premultiplication.

## Examples
### Composite a translucent color over an opaque one
```silk
import silk.color.rgba { Rgba }

pub fn main() -> i32 {
  let red = Rgba<f64>.new(1.0, 0.0, 0.0, 0.5).premultiply()
  let blue = Rgba<f64>.new(0.0, 0.0, 1.0, 1.0).premultiply()
  let result = red.over(blue).unpremultiply()
  if result.r != 0.5 || result.b != 0.5 || result.a != 1.0 {
    return 1
  }
  return 0
}
```

## See also
Use `silk.color.color.Color` to convert between color spaces, mix colors, and measure contrast.

Import as `Rgba` with `import silk.color.rgba { Rgba }`.

Public declarations: 2.

::Anchor{id="Rgba"}

## `Rgba`

```silk
pub struct Rgba<T>
```

A color with straight (not premultiplied) alpha, as red, green, blue, and alpha channels of type
`T`.

### When to use

Use `Rgba` for authored or stored colors, such as a CSS value or a gradient stop, and for any
color whose channels you edit directly. Call [`premultiply`](#Rgba.impl.premultiply) before compositing or
interpolating.

### Details

The fields are public. With a float `T`, channels are usually in `[0, 1]`; values outside it
represent colors outside the gamut of the space and survive arithmetic unchanged. The type does
not record the color space or transfer function of the channels. `&a == &b` compares every
channel when `T: Equal`.

::Anchor{id="Rgba.r"}

### Field `r`

```silk
pub r: T
```

The red channel.

::Anchor{id="Rgba.g"}

### Field `g`

```silk
pub g: T
```

The green channel.

::Anchor{id="Rgba.b"}

### Field `b`

```silk
pub b: T
```

The blue channel.

::Anchor{id="Rgba.a"}

### Field `a`

```silk
pub a: T
```

The opacity: `0` is fully transparent and `1` is fully opaque, for a float `T`.

::Anchor{id="Rgba.impl.Copy"}

## Implementation `Copy for Rgba<T>`

```silk
impl<T: Copy> Copy for Rgba<T>
```

::Anchor{id="Rgba.impl"}

## Implementation `Rgba<T>`

```silk
impl<T> Rgba<T>
```

::Anchor{id="Rgba.impl.new"}

### Associated function `new`

```silk
pub fn new(r: T, g: T, b: T, a: T) -> Rgba<T>
```

Returns the straight-alpha color with channels `r`, `g`, `b`, and alpha `a`.

::Anchor{id="Rgba.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> Rgba<U>
```

Returns a color whose four channels are `transform` applied to `r`, `g`, `b`, then `a`.

#### When to use

Use `map` to change the channel type, such as from `f64` to `f32` for a GPU buffer.

::Anchor{id="Rgba.impl-2"}

## Implementation `Rgba<T>`

```silk
impl<T: Copy> Rgba<T>
```

::Anchor{id="Rgba.impl.channels"}

### Method `channels`

```silk
pub fn channels(self: Self) -> [T; 4]
```

Returns the channels as the array `[r, g, b, a]`.

::Anchor{id="Rgba.impl.withAlpha"}

### Method `withAlpha`

```silk
pub fn withAlpha(self: Self, a: T) -> Rgba<T>
```

Returns the color with the same red, green, and blue channels and alpha `a`.

::Anchor{id="Rgba.impl-3"}

## Implementation `Rgba<T>`

```silk
impl<T: Copy + One> Rgba<T>
```

::Anchor{id="Rgba.impl.opaque"}

### Associated function `opaque`

```silk
pub fn opaque(r: T, g: T, b: T) -> Rgba<T>
```

Returns the fully opaque color with channels `r`, `g`, and `b`.

::Anchor{id="Rgba.impl-4"}

## Implementation `Rgba<T>`

```silk
impl<T: Zero> Rgba<T>
```

::Anchor{id="Rgba.impl.transparent"}

### Associated function `transparent`

```silk
pub fn transparent() -> Rgba<T>
```

Returns the fully transparent color whose four channels are zero.

::Anchor{id="Rgba.impl-5"}

## Implementation `Rgba<T>`

```silk
impl<T: Copy + Multiply<T, T>> Rgba<T>
```

::Anchor{id="Rgba.impl.premultiply"}

### Method `premultiply`

```silk
pub fn premultiply(self: Self) -> PremultipliedRgba<T>
```

Returns the color with its red, green, and blue channels multiplied by alpha.

#### Details

Alpha is copied unchanged. Premultiplication is exact in floating point for alpha `0` and `1`.
For gamma-encoded channels, decode to linear light first when the result feeds linear-light
blending.

::Anchor{id="Rgba.impl.Equal"}

## Implementation `Equal for Rgba<T>`

```silk
impl<T: Equal> Equal for Rgba<T>
```

::Anchor{id="Rgba.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

::Anchor{id="PremultipliedRgba"}

## `PremultipliedRgba`

```silk
pub struct PremultipliedRgba<T>
```

A color with premultiplied alpha: red, green, and blue channels of type `T` already multiplied
by the alpha channel.

### When to use

Use `PremultipliedRgba` for compositing, interpolation, filtering, and GPU uniforms. In this
form [`over`](#PremultipliedRgba.impl.over) and [`lerp`](#PremultipliedRgba.impl.lerp) are plain weighted sums, and a transparent color cannot tint its
neighbors. Call [`unpremultiply`](#PremultipliedRgba.impl.unpremultiply) to recover straight channels.

### Details

The fields are public. For a valid color with a float `T`, each of `r`, `g`, and `b` is between
zero and `a`. The type does not record the color space or transfer function of the channels.
`&a == &b` compares every channel when `T: Equal`.

::Anchor{id="PremultipliedRgba.r"}

### Field `r`

```silk
pub r: T
```

The red channel multiplied by alpha.

::Anchor{id="PremultipliedRgba.g"}

### Field `g`

```silk
pub g: T
```

The green channel multiplied by alpha.

::Anchor{id="PremultipliedRgba.b"}

### Field `b`

```silk
pub b: T
```

The blue channel multiplied by alpha.

::Anchor{id="PremultipliedRgba.a"}

### Field `a`

```silk
pub a: T
```

The opacity: `0` is fully transparent and `1` is fully opaque, for a float `T`.

::Anchor{id="PremultipliedRgba.impl.Copy"}

## Implementation `Copy for PremultipliedRgba<T>`

```silk
impl<T: Copy> Copy for PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl"}

## Implementation `PremultipliedRgba<T>`

```silk
impl<T> PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.new"}

### Associated function `new`

```silk
pub fn new(r: T, g: T, b: T, a: T) -> PremultipliedRgba<T>
```

Returns the premultiplied color with channels `r`, `g`, `b`, and alpha `a`.

#### Gotchas

The channels are stored as given. Pass values already multiplied by `a`, or build the color
with `Rgba.premultiply` instead.

::Anchor{id="PremultipliedRgba.impl.map"}

### Method `map`

```silk
pub fn map<U>(self: Self, transform: mut fn(T) -> U) -> PremultipliedRgba<U>
```

Returns a color whose four channels are `transform` applied to `r`, `g`, `b`, then `a`.

#### When to use

Use `map` to change the channel type, such as from `f64` to `f32` for a GPU buffer.

::Anchor{id="PremultipliedRgba.impl-2"}

## Implementation `PremultipliedRgba<T>`

```silk
impl<T: Copy> PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.channels"}

### Method `channels`

```silk
pub fn channels(self: Self) -> [T; 4]
```

Returns the channels as the array `[r, g, b, a]`.

::Anchor{id="PremultipliedRgba.impl-3"}

## Implementation `PremultipliedRgba<T>`

```silk
impl<T: Zero> PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.transparent"}

### Associated function `transparent`

```silk
pub fn transparent() -> PremultipliedRgba<T>
```

Returns the fully transparent color whose four channels are zero.

::Anchor{id="PremultipliedRgba.impl-4"}

## Implementation `PremultipliedRgba<T>`

```silk
impl<T: Copy + Zero + Equal + Divide<T, T>> PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.unpremultiply"}

### Method `unpremultiply`

```silk
pub fn unpremultiply(self: Self) -> Rgba<T>
```

Returns the straight-alpha color, dividing red, green, and blue by alpha.

#### Gotchas

When alpha is zero the result is the transparent color with zero channels, because a
transparent premultiplied color carries no hue.

::Anchor{id="PremultipliedRgba.impl-5"}

## Implementation `PremultipliedRgba<T>`

```silk
impl<T: Copy + One + Add<T, T> + Subtract<T, T> + Multiply<T, T>> PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.over"}

### Method `over`

```silk
pub fn over(self: Self, below: PremultipliedRgba<T>) -> PremultipliedRgba<T>
```

Returns `self` composited over `below` with the Porter-Duff source-over operator.

#### Details

Each channel is `self + below * (1 - self.a)`, including alpha. Both colors must use the same
encoding; composite linear-light channels for physically correct results, or gamma-encoded
channels to match CSS and most browsers.

::Anchor{id="PremultipliedRgba.impl.scale"}

### Method `scale`

```silk
pub fn scale(self: Self, factor: T) -> PremultipliedRgba<T>
```

Returns every channel multiplied by `factor`, which fades the color toward transparent.

#### When to use

Use `scale` to apply a layer opacity or a coverage value to a premultiplied color.

::Anchor{id="PremultipliedRgba.impl.lerp"}

### Method `lerp`

```silk
pub fn lerp(self: Self, other: PremultipliedRgba<T>, t: T) -> PremultipliedRgba<T>
```

Returns `self + (other - self) * t` for every channel: `self` at `t = 0` and `other` at `t =
1`.

#### Details

Interpolating premultiplied channels keeps a transparent endpoint from tinting the result, as
CSS gradients and `color-mix()` require. The channels interpolate in whatever encoding they
hold.

::Anchor{id="PremultipliedRgba.impl.Equal"}

## Implementation `Equal for PremultipliedRgba<T>`

```silk
impl<T: Equal> Equal for PremultipliedRgba<T>
```

::Anchor{id="PremultipliedRgba.impl.Equal.equals"}

### Operation `equals`

```silk
fn equals(left: &Self, right: &Self) -> bool
```

Category: Color.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
